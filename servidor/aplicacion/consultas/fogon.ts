import { z } from 'zod';
import { AVISO_AL_GASTAR, fechaOperativa } from '@estook/dominio';
import { consulta } from '../contrato.ts';
import {
  POR_QUE_ESTA_APAGADO,
  comoEstaFogon,
  loGastadoEnElLocal,
  loQueQueda,
  type LoQueQueda,
} from '../fogon.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { laUltimaRevision, type RevisionDeFogon } from '../fogon-revisa.ts';
import {
  lasPersonasDelCuadrante,
  losDiasFuertes,
  losTurnosHabituales,
} from '../fogon-cuadrante.ts';
import { elBorrador, elLocalDelHorario, laSemana, unLunes } from '../horario.ts';

/**
 * Fogón y yo: si habla aquí, lo que puedo pedirle y lo que le queda (0097).
 *
 * La pide la ventana de Fogón al abrirse y los botones «con Fogón» para saber si se
 * enseñan. **No llama al modelo ni gasta nada**: lee los interruptores y lo apuntado.
 */
export type FogonYYo =
  | {
      readonly habla: true;
      readonly queda: LoQueQueda;
      /** Al 80 % de los del mes, se avisa (Manifiesto, «Cuando se acaban»). */
      readonly casiSinCreditos: boolean;
      /** Si puede rellenar escandallos y escribir pasos (quien edita Escandallos). */
      readonly puedeRellenar: boolean;
      /** Si puede revisar los datos del local (quien lleva el almacén, 0098). */
      readonly puedeRevisar: boolean;
    }
  | { readonly habla: false; readonly porque: string };

export const fogonYYo = consulta<Record<string, never>, FogonYYo>({
  nombre: 'fogon_y_yo',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const como = await comoEstaFogon(contexto);
    if (!como.habla) return { habla: false, porque: POR_QUE_ESTA_APAGADO[como.porque] };
    const localId = contexto.sesion?.localId ?? '';
    const puede = await loQuePuede(contexto, localId, [
      'app.fogon',
      'app.escandallos',
      'app.almacen',
    ]);
    if (!puede.ver('app.fogon')) {
      return { habla: false, porque: 'Fogón no está en tu puesto.' };
    }
    const gastado = await loGastadoEnElLocal(contexto, localId);
    const queda = loQueQueda(gastado, como.creditosDelMes);
    return {
      habla: true,
      queda,
      casiSinCreditos: gastado.creditosMes >= como.creditosDelMes * AVISO_AL_GASTAR,
      puedeRellenar: puede.editar('app.escandallos'),
      puedeRevisar: puede.editar('app.almacen'),
    };
  },
});

// ── La revisión de los datos (0098) ──────────────────────────────────────────

/** La última revisión de Fogón del local: lo que encontró, tal cual. No gasta. */
export const laRevisionDeFogon = consulta<
  Record<string, never>,
  { readonly revision: RevisionDeFogon | null }
>({
  nombre: 'la_revision_de_fogon',
  entrada: z.object({}).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto) {
    const localId = contexto.sesion?.localId;
    if (localId == null) return { revision: null };
    return { revision: await laUltimaRevision(contexto, localId) };
  },
});

// ── Lo que sabe Fogón para el cuadrante (0098) ───────────────────────────────

export interface LoQueSabeDelCuadrante {
  readonly lunes: string;
  /** Si la semana está vacía: Fogón solo rellena una semana vacía. */
  readonly semanaVacia: boolean;
  readonly personas: readonly {
    readonly personaId: string;
    readonly nombre: string;
    readonly zona: 'sala' | 'cocina' | 'otros';
    readonly horasDeContrato: number | null;
  }[];
  readonly diasFuertes: readonly string[];
  /** Si los días fuertes salen de tus ventas, o son los de siempre (viernes y sábado). */
  readonly segunTusVentas: boolean;
  /** Los turnos de las semanas de antes, en llano. Vacío si no hay horario todavía. */
  readonly turnos: string;
}

/** Lo que Fogón ya sabe antes de hacer el cuadrante: gratis, sin IA. */
export const loQueSabeFogonDelCuadrante = consulta<{ lunes: string }, LoQueSabeDelCuadrante>({
  nombre: 'lo_que_sabe_fogon_del_cuadrante',
  entrada: z.object({ lunes: unLunes }).strict(),
  exige: 'accion.publicar_cuadrante',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelHorario(contexto);
    const lunes = fechaOperativa(entrada.lunes);
    const semana = await laSemana(contexto, localId, lunes);
    const vacia = semana === null || (await elBorrador(contexto, semana.id)).length === 0;
    const personas = await lasPersonasDelCuadrante(contexto, localId, lunes);
    const fuertes = await losDiasFuertes(contexto, localId, lunes);
    return {
      lunes: entrada.lunes,
      semanaVacia: vacia,
      personas: personas.map((p) => ({
        personaId: p.personaId,
        nombre: p.nombre,
        zona: p.zona,
        horasDeContrato: p.horasDeContrato,
      })),
      diasFuertes: fuertes.dias,
      segunTusVentas: fuertes.segunTusVentas,
      turnos: await losTurnosHabituales(contexto, localId, lunes),
    };
  },
});
