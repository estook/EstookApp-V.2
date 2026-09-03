import { z } from 'zod';
import { comoCodigo } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { laOrganizacionDeLaSesion, respondido } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Crear y duplicar locales (M5) · paso 3 del alta.
 *
 * «**¿Cuántos locales?** Con dos o más se crea la organización primero y **se
 *  ofrece duplicar el local**» (Manifiesto 8).
 *
 * ── Por qué duplicar existe y no es un lujo ──────────────────────────────────
 *
 * Porque el segundo local de una cadena se parece al primero en todo lo que
 * cuesta configurar: el tipo, el régimen fiscal, los objetivos, la hora de
 * cierre y la marca. Hacer el alta ocho veces seguidas es lo que hace que una
 * cadena abandone en el tercero.
 *
 * ── Y lo que NO se duplica, que es lo importante ─────────────────────────────
 *
 * «Lo que nunca se hereda: el stock, los albaranes, los precios de compra
 *  reales, los fichajes y los canales de chat. **Son del local siempre**»
 * (Manifiesto 11).
 *
 * Hoy nada de eso existe todavía, así que duplicar copia la ficha y los
 * objetivos y se acaba. Cuando M6 traiga el stock, la lista de lo que se hereda
 * está escrita: se copia la configuración, jamás la operación.
 *
 * El PIN tampoco se hereda, y ese es de verdad delicado: la sal del PIN es del
 * local (migración 0018), así que un local nuevo nace con una sal nueva y sin
 * ningún PIN. Copiar la sal haría que dos locales compartieran huellas.
 */

/**
 * De un nombre a un código.
 *
 * La conversión la hace `comoCodigo` de `@estook/dominio`, que usa el mismo
 * `sinAcentos` que el buscador: así el código de un local y la forma en que se
 * le busca no discrepan nunca.
 *
 * Lo que se añade aquí es el suelo: la restricción de la 0001 exige de 2 a 48
 * caracteres de `[a-z0-9-]`, y un nombre que sea solo símbolos —«···»— dejaría
 * el código vacío y fallaría con un error de base de datos en la cara.
 */
export function codigoDesde(nombre: string, ahora: Date): string {
  const limpio = comoCodigo(nombre);
  return limpio.length >= 2 ? limpio : `local-${ahora.getTime().toString(36)}`;
}

/** Un código libre dentro de la organización. Se prueba con sufijos, en orden. */
async function codigoLibre(
  contexto: Contexto,
  organizacionId: string,
  base: string,
): Promise<string> {
  const usados = await contexto.sql<{ codigo: string }[]>`
    select codigo from estook.local where organizacion_id = ${organizacionId}
  `;
  const cogidos = new Set(usados.map((f) => f.codigo));

  if (!cogidos.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const candidato = `${base.slice(0, 44)}-${n}`;
    if (!cogidos.has(candidato)) return candidato;
  }
  throw new FalloDeAplicacion('faltan_datos', {
    campos: ['nombre'],
    porque: 'Ya tienes muchos locales con ese nombre. Ponle uno que los distinga.',
  });
}

// ── Crear un local ───────────────────────────────────────────────────────────

export const entradaCrearLocal = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    /** El local del que se copia la configuración. Nulo = uno nuevo y vacío. */
    duplicar_de: z.string().uuid().nullable().optional(),
    area_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export type EntradaCrearLocal = z.infer<typeof entradaCrearLocal>;

export interface SalidaCrearLocal {
  readonly localId: string;
  readonly codigo: string;
  readonly duplicado: boolean;
}

export const crearLocal = comando<EntradaCrearLocal, SalidaCrearLocal>({
  nombre: 'crear_local',
  entrada: entradaCrearLocal,
  exige: 'accion.gestionar_locales',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const codigo = await codigoLibre(
      contexto,
      organizacionId,
      codigoDesde(entrada.nombre, contexto.ahora),
    );

    // El local del que se copia **se lee con las políticas puestas**: si no es
    // suyo, no vuelve nada y no se copia. No hace falta comprobar de quién es.
    const modelos =
      entrada.duplicar_de === null || entrada.duplicar_de === undefined
        ? []
        : await contexto.sql<
            {
              tipo: string | null;
              zona_horaria: string;
              hora_de_corte: string;
              territorio: string;
              regimen: string;
              actividad: string | null;
              epigrafe_iae: string | null;
              modo_de_precio: string;
              color_de_marca: string | null;
              provincia: string | null;
            }[]
          >`
            select tipo::text as tipo, zona_horaria, hora_de_corte::text as hora_de_corte,
                   territorio::text as territorio, regimen::text as regimen,
                   actividad::text as actividad, epigrafe_iae,
                   modo_de_precio::text as modo_de_precio, color_de_marca, provincia
              from estook.local
             where id = ${entrada.duplicar_de} and organizacion_id = ${organizacionId}
          `;

    const modelo = modelos[0] ?? null;

    if (entrada.duplicar_de != null && modelo === null) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese local no es tuyo, o ya no está.',
      });
    }

    // ── Y aquí va sin `returning`, que es lo que costó encontrar ─────────────
    //
    // **`insert ... returning` sobre `estook.local` falla siempre**, con
    // cualquier permiso, y M6 lo encontró intentando crear un local para una
    // prueba: «new row violates row-level security policy for table "local"».
    //
    // Es el mismo fallo que M4 dejó escrito para `estook.persona` en la 0019, con
    // otra tabla: **con `returning`, Postgres aplica además la política de
    // lectura a la fila devuelta**. Y la de `local` se escribe contra
    // `locales_visibles()`, que es `stable`: una función `stable` mira el
    // instantáneo del principio de la sentencia, y la fila que esa misma
    // sentencia está insertando **todavía no está ahí**. Sea quien sea quien
    // llame, y tenga los permisos que tenga.
    //
    // La consecuencia era que **el camino de grupo de M5 no funcionaba**: crear
    // el segundo local de una cadena devolvía «esto no está en tu acceso» a la
    // propietaria. No lo vio nadie porque las semillas crean los locales con
    // `insert` directo, sin pasar por este comando.
    //
    // Se arregla partiéndolo en dos sentencias. La segunda es un `select` normal
    // en la misma transacción, y **ese sí ve la fila**: cada sentencia toma su
    // propio instantáneo. Sin funciones con privilegio y sin tocar la política.
    // El código es único por organización (0001), así que el `select` no puede
    // devolver otra cosa.
    await contexto.sql`
      insert into estook.local (
        organizacion_id, area_id, codigo, nombre, zona_horaria, hora_de_corte,
        tipo, territorio, regimen, actividad, epigrafe_iae, modo_de_precio,
        color_de_marca, provincia
      )
      values (
        ${organizacionId},
        ${entrada.area_id ?? null},
        ${codigo},
        ${entrada.nombre},
        ${modelo?.zona_horaria ?? 'Europe/Madrid'},
        ${modelo?.hora_de_corte ?? '05:00'}::time,
        ${modelo?.tipo ?? null}::estook.tipo_de_local,
        ${modelo?.territorio ?? 'peninsula_y_baleares'}::estook.territorio_fiscal,
        ${modelo?.regimen ?? 'iva'}::estook.regimen_fiscal,
        ${modelo?.actividad ?? null}::estook.actividad_de_hosteleria,
        ${modelo?.epigrafe_iae ?? null},
        ${modelo?.modo_de_precio ?? 'impuesto_incluido'}::estook.modo_de_precio,
        ${modelo?.color_de_marca ?? null},
        ${modelo?.provincia ?? null}
      )
    `;

    const creados = await contexto.sql<{ id: string }[]>`
      select id from estook.local
       where organizacion_id = ${organizacionId} and codigo = ${codigo}
    `;

    const localId = creados[0]?.id;
    if (localId === undefined) throw new FalloDeAplicacion('sin_permiso');

    // Los objetivos se copian vigentes desde hoy, no con su fecha original: el
    // local nuevo no existía en enero, así que no puede tener un objetivo de
    // enero. Y se marcan como de partida, porque nadie los ha revisado para él.
    if (modelo !== null) {
      await contexto.sql`
        insert into estook.objetivo (local_id, clave, valor, desde, de_partida)
        select ${localId}, o.clave, o.valor, current_date, true
          from estook.objetivo o
         where o.local_id = ${entrada.duplicar_de ?? null} and o.hasta is null
      `;
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'local', ${localId},
        ${localId}::uuid, null,
        ${JSON.stringify({ nombre: entrada.nombre, duplicado_de: entrada.duplicar_de ?? null })}::jsonb,
        null
      )
    `;

    // **Quién tiene que enterarse**: M6 le siembra sus categorías de producto,
    // M16 su plantilla de APPCC y M25 qué apps trae encendidas, todo según el
    // tipo. Hoy no lo lee nadie, y por eso mismo se publica ya.
    await publicar(contexto.sql, {
      tipo: 'local.creado',
      organizacionId,
      localId,
      datos: { nombre: entrada.nombre, tipo: modelo?.tipo ?? null, duplicado: modelo !== null },
      correlacionId: contexto.correlacionId,
    });

    return { localId, codigo, duplicado: modelo !== null };
  },
});

// ── Paso 3 · cuántos locales ─────────────────────────────────────────────────

/**
 * Responder «¿cuántos locales llevas?» no crea nada por sí solo.
 *
 * Solo anota el paso. Crear el segundo local es una decisión aparte —con su
 * nombre y su «¿lo duplico del primero?»— y meterla dentro de este comando
 * significaría crear locales como efecto secundario de responder una pregunta,
 * que es justo lo que el Manifiesto prohíbe: «nada de efectos secundarios
 * ocultos».
 */
export const responderCuantosLocales = comando<
  { cuantos: number },
  { cuantos: number; sugerirDuplicar: boolean }
>({
  nombre: 'responder_cuantos_locales',
  entrada: z.object({ cuantos: z.number().int().min(1).max(40) }).strict(),
  // Solo apunta un paso del alta del local en el que estas, asi que basta con
  // llevarlo. Crear los otros locales es `crear_local`, que si exige el permiso
  // de organizacion.
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = contexto.sesion?.localId;
    if (!localId) throw new FalloDeAplicacion('faltan_datos');

    await respondido(contexto, localId, 'cuantos_locales');

    // Con dos o más se ofrece duplicar. Se decide aquí y no en la pantalla para
    // que la regla viva en un sitio, aunque hoy sea una comparación de una línea.
    return { cuantos: entrada.cuantos, sugerirDuplicar: entrada.cuantos > 1 };
  },
});
