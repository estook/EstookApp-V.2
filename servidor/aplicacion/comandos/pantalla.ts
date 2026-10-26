import { z } from 'zod';
import { tocarElServicio } from '../al-segundo.ts';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { laCocinaDelLocal, type SalidaLaCocina } from '../consultas/sala.ts';
import { apuntarEnLaMesa, elLocalDelServicio, lasCuentas } from '../sala.ts';
import { elAparatoDeLaLlave, soloEnLaCaja, type AparatoDelTpv } from './aparatos.ts';
import { destacharEnElLocal, tacharEnElLocal } from './cocina.ts';

/**
 * **La pantalla de cocina** (T4 · 1, decisión 0116; Anexo 3.2 y 3.4). **No tiene operador**:
 * se vincula una vez y se queda encendida, sin PIN. No tiene sesión: **vale por su llave**,
 * como el aparato para fichar (0068), y la base la reconoce como la pantalla del local, con el
 * permiso de cocinar y ningún otro (0090).
 *
 *   la_pantalla_de_cocina   lo que hay que sacar y lo acabado, sin un importe
 *   tachar_en_la_pantalla   el plato sale (y otro toque, `destachar_en_la_pantalla`, vuelve)
 *   llamar_al_camarero      «Llamar a Lucía»: le sale en su comandero
 *
 * Son comandos, también el de leer: la llave va en el cuerpo, nunca en la dirección. No se
 * recuerdan: el estado de cada plato es la protección, como al fichar.
 */

const llave = z.string().trim().min(20).max(200);
const id = z.string().uuid();

/** Hace `hacer` como la pantalla de esa llave, que tiene que ser una pantalla de cocina viva. */
async function comoLaPantalla<T>(
  contexto: Contexto,
  laLlave: string,
  hacer: (aparato: AparatoDelTpv) => Promise<T>,
): Promise<T> {
  const aparato = await elAparatoDeLaLlave(contexto, laLlave);
  if (aparato.funcion !== 'cocina') {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Esto es de la pantalla de cocina.',
    });
  }
  // La base la reconoce solo dentro de esta transacción (`true`), y solo después de mirar
  // la llave. Al acabar bien se quita; si falla, la transacción entera se deshace con ella.
  await contexto.sql`select set_config('estook.pantalla_id', ${aparato.terminalId}, true)`;
  const hecho = await hacer(aparato);
  await contexto.sql`select set_config('estook.pantalla_id', '', true)`;
  return hecho;
}

export interface LaPantallaDeCocina extends SalidaLaCocina {
  readonly aparato: { readonly nombre: string; readonly local: string };
  /** Los minutos del semáforo y si suena, del local (Ajustes del TPV › Cocina y barra). */
  readonly ajustes: {
    readonly avisoMin: number;
    readonly tardeMin: number;
    readonly suena: boolean;
  };
}

export const laPantallaDeCocina = comando<{ llave: string }, LaPantallaDeCocina>({
  nombre: 'la_pantalla_de_cocina',
  entrada: z.object({ llave }).strict(),
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    return comoLaPantalla(contexto, entrada.llave, async (aparato) => {
      const [cocina, ajustes, nombres] = await Promise.all([
        laCocinaDelLocal(contexto, aparato.localId),
        contexto.sql<{ aviso_min: number; tarde_min: number; suena: boolean }[]>`
          select aviso_min, tarde_min, suena from estook.la_cocina_del_local(${aparato.localId}::uuid)
        `,
        contexto.sql<{ persona_id: string; nombre: string }[]>`
          select persona_id::text as persona_id, nombre
            from estook.los_nombres_de_la_sala(${aparato.localId}::uuid)
        `,
      ]);
      // La pantalla no lee personas: el nombre de quien lleva cada mesa, de pila.
      const nombreDe = new Map(nombres.map((n) => [n.persona_id, n.nombre]));
      const conNombre = (t: SalidaLaCocina['enMarcha'][number]) => ({
        ...t,
        camarero: t.camareroId === null ? null : (nombreDe.get(t.camareroId) ?? t.camarero),
      });
      const local = ajustes[0];
      return {
        aparato: { nombre: aparato.nombre, local: aparato.nombreDelLocal },
        ajustes: {
          avisoMin: local?.aviso_min ?? 10,
          tardeMin: local?.tarde_min ?? 20,
          suena: local?.suena ?? true,
        },
        enMarcha: cocina.enMarcha.map(conNombre),
        esperando: cocina.esperando.map(conNombre),
        fuera: cocina.fuera.map(conNombre),
      };
    });
  },
});

const entradaDelPlato = z.object({ llave, linea_id: id }).strict();

export const tacharEnLaPantalla = comando<
  z.infer<typeof entradaDelPlato>,
  { lineaId: string; paseFuera: boolean }
>({
  nombre: 'tachar_en_la_pantalla',
  entrada: entradaDelPlato,
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    return comoLaPantalla(contexto, entrada.llave, (aparato) =>
      tacharEnElLocal(contexto, aparato.localId, entrada.linea_id, aparato.organizacionId),
    );
  },
});

export const destacharEnLaPantalla = comando<z.infer<typeof entradaDelPlato>, { lineaId: string }>({
  nombre: 'destachar_en_la_pantalla',
  entrada: entradaDelPlato,
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    return comoLaPantalla(contexto, entrada.llave, (aparato) =>
      destacharEnElLocal(contexto, aparato.localId, entrada.linea_id, aparato.organizacionId),
    );
  },
});

const entradaLlamar = z.object({ llave, cuenta_id: id }).strict();

export const llamarAlCamarero = comando<
  z.infer<typeof entradaLlamar>,
  { cuentaId: string; llamaEn: string }
>({
  nombre: 'llamar_al_camarero',
  entrada: entradaLlamar,
  sinSesion: true,
  // Llamar dos veces es llamar: se queda la última hora.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    return comoLaPantalla(contexto, entrada.llave, async (aparato) => {
      const [cuenta] = await lasCuentas(contexto, aparato.localId, [entrada.cuenta_id]);
      if (cuenta === undefined || cuenta.liberada_en !== null || cuenta.anulada_en !== null) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Esa mesa ya no está abierta en este local.',
        });
      }
      const ahora = contexto.ahora.toISOString();
      await contexto.sql`
        update estook.cuenta set cocina_llama_en = ${ahora}::timestamptz
         where id = ${cuenta.id}::uuid and local_id = ${aparato.localId}::uuid
      `;
      await apuntarEnLaMesa(
        contexto,
        'llamar_al_camarero',
        cuenta.id,
        aparato.localId,
        { aparato: aparato.nombre },
        aparato.organizacionId,
      );
      await tocarElServicio(contexto, aparato.localId);
      return { cuentaId: cuenta.id, llamaEn: ahora };
    });
  },
});

// ═══ Ajustes del TPV › Cocina y barra ═══════════════════════════════════════════

export interface LaCocinaYLaBarra {
  readonly avisoMin: number;
  readonly tardeMin: number;
  readonly suena: boolean;
}

async function losDeLaCocina(contexto: Contexto, localId: string): Promise<LaCocinaYLaBarra> {
  const filas = await contexto.sql<{ aviso_min: number; tarde_min: number; suena: boolean }[]>`
    select aviso_min, tarde_min, suena from estook.la_cocina_del_local(${localId}::uuid)
  `;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('local_ajeno');
  return { avisoMin: fila.aviso_min, tardeMin: fila.tarde_min, suena: fila.suena };
}

/** **Los minutos del semáforo y el sonido** (Anexo 3.2, 11.13): en la caja, para todo el local. */
export const laCocinaYLaBarra = consulta<Record<string, never>, LaCocinaYLaBarra>({
  nombre: 'la_cocina_y_la_barra',
  entrada: z.object({}).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto) {
    return losDeLaCocina(contexto, elLocalDelServicio(contexto));
  },
});

const entradaCocinaYBarra = z
  .object({
    aviso_min: z.number().int().min(1).max(120),
    tarde_min: z.number().int().min(2).max(180),
    suena: z.boolean(),
  })
  .strict()
  .refine((e) => e.tarde_min > e.aviso_min, {
    message: 'El rojo va después del ámbar.',
    path: ['tarde_min'],
  });

export const guardarLaCocinaYLaBarra = comando<
  z.infer<typeof entradaCocinaYBarra>,
  LaCocinaYLaBarra
>({
  nombre: 'guardar_la_cocina_y_la_barra',
  entrada: entradaCocinaYBarra,
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    // Por la función que mira el permiso (0114): el local solo lo escribe quien lleva Estook.
    await contexto.sql`
      select estook.cambiar_lo_del_tpv_del_local(
        ${localId}::uuid, null, null, null, null, null,
        ${entrada.aviso_min}::smallint, ${entrada.tarde_min}::smallint, ${entrada.suena}
      )
    `;
    return losDeLaCocina(contexto, localId);
  },
});
