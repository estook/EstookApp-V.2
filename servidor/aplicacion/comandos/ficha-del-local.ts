import { z } from 'zod';
import { REGIMEN_DEL_TERRITORIO, ACTIVIDADES, TERRITORIOS, TIPOS_DE_LOCAL } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion, respondido } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * La ficha del local (M5) · pasos 2, 4 y 6 del alta.
 *
 * Tres comandos en un fichero porque los tres escriben en la misma fila y con el
 * mismo permiso, y separarlos seria repetir tres veces la misma cabecera para
 * cambiar una columna.
 *
 *   guardar_tipo_de_local   «¿Que tipo de local tienes?»
 *   guardar_donde_esta      direccion, telefono y a que hora cierra
 *   guardar_regimen_fiscal  peninsula, Canarias o Ceuta y Melilla
 *
 * ── Los tres se pueden llamar despues del alta, y es a proposito ─────────────
 *
 * Un local se muda, cambia de nombre y a veces cambia de regimen. Estos comandos
 * son los de Ajustes tanto como los del alta: lo unico que hace el alta es
 * llamarlos en orden y anotar por donde va.
 */

// ── Paso 2 · que tipo de local es ────────────────────────────────────────────

export const guardarTipoDeLocal = comando<{ tipo: string }, { tipo: string }>({
  nombre: 'guardar_tipo_de_local',
  entrada: z.object({ tipo: z.enum(TIPOS_DE_LOCAL) }).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const antes = await contexto.sql<{ tipo: string | null }[]>`
      select tipo::text as tipo from estook.local where id = ${localId}
    `;

    await contexto.sql`
      update estook.local set tipo = ${entrada.tipo}::estook.tipo_de_local
       where id = ${localId}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
        ${localId}::uuid,
        ${JSON.stringify({ tipo: antes[0]?.tipo ?? null })}::jsonb,
        ${JSON.stringify({ tipo: entrada.tipo })}::jsonb,
        null
      )
    `;

    await respondido(contexto, localId, 'tipo_de_local');

    await publicar(contexto.sql, {
      tipo: 'local.ficha_cambiada',
      organizacionId,
      localId,
      datos: { que: 'tipo', tipo: entrada.tipo },
      correlacionId: contexto.correlacionId,
    });

    return { tipo: entrada.tipo };
  },
});

// ── Paso 4 · donde esta, y a que hora cierra ─────────────────────────────────

/**
 * Llega el bloque entero, no los campos sueltos.
 *
 * Es a propósito: un comando que acepta «solo lo que mandes» necesita distinguir
 * «no lo toques» de «bórralo», y eso obliga a escribir el `update` con
 * fragmentos condicionales. La API de pruebas no los admite —lo dice en su
 * cabecera, y hace bien— así que un camino escrito así **solo funcionaría en
 * producción**, que es exactamente el agujero por el que se coló el fallo del
 * despliegue de M4.
 *
 * Además es como funciona la pantalla: «¿dónde está tu restaurante?» es un
 * formulario con seis casillas, y se guarda entero.
 */
export const entradaDondeEsta = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    direccion: z.string().trim().max(200).nullable(),
    codigo_postal: z
      .string()
      .trim()
      .regex(/^[0-9]{5}$/, 'Un código postal son cinco cifras.')
      .nullable(),
    poblacion: z.string().trim().max(120).nullable(),
    provincia: z.string().trim().max(120).nullable(),
    telefono: z
      .string()
      .trim()
      .regex(/^[0-9+ ()-]{7,24}$/, 'Ese teléfono no tiene forma de teléfono.')
      .nullable(),
    zona_horaria: z.string().trim().max(64).optional(),
    /**
     * `HH:MM`. Es la pregunta «¿a qué hora cierras?», y decide a qué jornada
     * pertenece una venta de madrugada (motor de tiempo, M2).
     */
    hora_de_corte: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'La hora se escribe así: 05:00.')
      .optional(),
  })
  .strict();

export type EntradaDondeEsta = z.infer<typeof entradaDondeEsta>;

export const guardarDondeEsta = comando<EntradaDondeEsta, { localId: string }>({
  nombre: 'guardar_donde_esta',
  entrada: entradaDondeEsta,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    await contexto.sql`
      update estook.local
         set nombre        = ${entrada.nombre},
             direccion     = ${entrada.direccion},
             codigo_postal = ${entrada.codigo_postal},
             poblacion     = ${entrada.poblacion},
             provincia     = ${entrada.provincia},
             telefono      = ${entrada.telefono},
             zona_horaria  = ${entrada.zona_horaria ?? 'Europe/Madrid'},
             hora_de_corte = ${entrada.hora_de_corte ?? '05:00'}::time
       where id = ${localId}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
        ${localId}::uuid, null, ${JSON.stringify(entrada)}::jsonb, null
      )
    `;

    await respondido(contexto, localId, 'donde_esta');

    await publicar(contexto.sql, {
      tipo: 'local.ficha_cambiada',
      organizacionId,
      localId,
      // La hora de corte va en el evento porque **cambia a que dia pertenece una
      // venta**, y eso lo tiene que saber todo lo que agregue por jornada.
      datos: { que: 'donde_esta', hora_de_corte: entrada.hora_de_corte ?? '05:00' },
      correlacionId: contexto.correlacionId,
    });

    return { localId };
  },
});

// ── Paso 6, primera mitad · el regimen fiscal ────────────────────────────────

export const entradaRegimenFiscal = z
  .object({
    territorio: z.enum(TERRITORIOS),
    /** Solo determina el tipo en Ceuta y Melilla, pero se guarda siempre. */
    actividad: z.enum(ACTIVIDADES).nullable().optional(),
    epigrafe_iae: z.string().trim().max(32).nullable().optional(),
  })
  .strict();

export type EntradaRegimenFiscal = z.infer<typeof entradaRegimenFiscal>;

export const guardarRegimenFiscal = comando<EntradaRegimenFiscal, { regimen: string }>({
  nombre: 'guardar_regimen_fiscal',
  entrada: entradaRegimenFiscal,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // **El régimen no se elige: lo decide el territorio.** Canarias es IGIC,
    // Ceuta y Melilla son IPSI, el resto IVA. Se resuelve aquí con el mismo mapa
    // que usa el motor fiscal, y la base de datos lo comprueba otra vez con su
    // restricción: un dato que la ley determina no puede depender de que la
    // pantalla mande el par correcto.
    const regimen = REGIMEN_DEL_TERRITORIO[entrada.territorio];

    // En Ceuta y en Melilla la actividad **decide el tipo**: un restaurante de un
    // tenedor y uno de tres no tributan igual. Sin ella, el motor fiscal se
    // quedaría sin regla y pararía, que es lo correcto pero no lo útil.
    if (
      (entrada.territorio === 'ceuta' || entrada.territorio === 'melilla') &&
      !entrada.actividad
    ) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['actividad'],
        porque:
          'En Ceuta y en Melilla el impuesto depende de la categoría del establecimiento, así que hace falta decirla.',
      });
    }

    await contexto.sql`
      update estook.local
         set territorio = ${entrada.territorio}::estook.territorio_fiscal,
             regimen = ${regimen}::estook.regimen_fiscal,
             actividad = ${entrada.actividad ?? null}::estook.actividad_de_hosteleria,
             epigrafe_iae = ${entrada.epigrafe_iae ?? null}
       where id = ${localId}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
        ${localId}::uuid, null,
        ${JSON.stringify({ territorio: entrada.territorio, regimen })}::jsonb,
        null
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'local.ficha_cambiada',
      organizacionId,
      localId,
      // Cambiar de régimen cambia el impuesto de todo lo que se venda a partir de
      // ahora. Nada del pasado se toca: cada venta guarda su desglose.
      datos: { que: 'regimen_fiscal', territorio: entrada.territorio, regimen },
      correlacionId: contexto.correlacionId,
    });

    return { regimen };
  },
});
