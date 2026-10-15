import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * La puesta en marcha de un local (0085).
 *
 * Richi, el 15-oct: «una lista de puesta en marcha para las cuentas nuevas —logo,
 * primer producto, proveedores, publicar el horario, invitar al equipo—, junto al
 * recorrido. Que desaparezca sola al completarla y que no les salga a quien ya lo
 * tiene todo».
 *
 * ── Lo hecho de verdad, no lo contestado ────────────────────────────────────
 *
 * «Termina de configurar» (M5) mira las preguntas del alta: si se contestaron o se
 * saltaron. Esto mira **lo que hay en el local**: si tiene logo, si tiene un producto
 * suyo, un proveedor, una semana publicada y alguien más en el equipo. Lo de ejemplo
 * no cuenta, porque no es suyo.
 *
 * ── Cada paso, a quien lo puede hacer ───────────────────────────────────────
 *
 * Un paso que no se puede dar es ruido: el logo, a quien edita Ajustes; el género y
 * los proveedores, a quien edita el Almacén; el horario, a quien lo publica; y el
 * equipo, a quien invita. Si no queda ninguno, no hay lista.
 *
 * Y no sale **en un local de ejemplo** (el de la demostración y los de las pruebas),
 * ni si se pidió «No me lo recuerdes más» en la tarjeta del alta: es la misma
 * puesta en marcha, y se apaga una vez.
 */
export type PasoDeLaPuestaEnMarcha = 'logo' | 'producto' | 'proveedor' | 'horario' | 'equipo';

export interface LaPuestaEnMarcha {
  /** Los pasos que esta persona puede dar, en su orden, con si ya están hechos. */
  readonly pasos: readonly { readonly paso: PasoDeLaPuestaEnMarcha; readonly hecho: boolean }[];
  /** Si no se enseña: local de ejemplo, apagada a propósito o sin ningún paso que dar. */
  readonly oculta: boolean;
}

export const laPuestaEnMarcha = consulta<Record<string, never>, LaPuestaEnMarcha>({
  nombre: 'la_puesta_en_marcha',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = contexto.sesion?.localId ?? null;
    if (localId === null) throw new FalloDeAplicacion('faltan_datos');

    const filas = await contexto.sql<
      {
        es_ejemplo: boolean;
        apagada: boolean;
        logo: boolean;
        producto: boolean;
        proveedor: boolean;
        horario: boolean;
        equipo: boolean;
        puede_logo: boolean;
        puede_almacen: boolean;
        puede_horario: boolean;
        puede_invitar: boolean;
      }[]
    >`
      select l.es_ejemplo,
             l.panel_recordatorio_oculto as apagada,
             l.logo_clave is not null as logo,
             exists (
               select 1 from estook.producto p
                where p.local_id = l.id and p.activo and not p.es_ejemplo
             ) as producto,
             exists (
               select 1 from estook.proveedor v
                where v.local_id = l.id and v.activo and not v.es_ejemplo
             ) as proveedor,
             exists (
               select 1 from estook.semana_de_horario s
                where s.local_id = l.id and s.publicada_en is not null
             ) as horario,
             -- Alguien más que quien pregunta, con acceso vivo a este local.
             exists (
               select 1 from estook.membresia m
                join estook.persona pe on pe.id = m.persona_id
                where m.organizacion_id = l.organizacion_id
                  and m.persona_id <> ${contexto.personaId}::uuid
                  and pe.activa
                  and m.desde <= current_date
                  and (m.hasta is null or m.hasta >= current_date)
                  and (m.revocada_en is null or m.revocada_en > now())
                  and (
                    m.alcance = 'organizacion'
                    or (m.alcance = 'area' and l.area_id = m.area_id)
                    or (m.alcance = 'local' and l.id = m.local_id)
                  )
             ) as equipo,
             estook.puede_editar('app.ajustes', l.id) as puede_logo,
             estook.puede_editar('app.almacen', l.id) as puede_almacen,
             estook.puede_editar('accion.publicar_cuadrante', l.id) as puede_horario,
             estook.puede_editar('accion.invitar_personas', l.id) as puede_invitar
        from estook.local l
       where l.id = ${localId}::uuid
    `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('no_existe');

    const pasos = [
      ...(fila.puede_logo ? [{ paso: 'logo' as const, hecho: fila.logo }] : []),
      ...(fila.puede_almacen
        ? [
            { paso: 'producto' as const, hecho: fila.producto },
            { paso: 'proveedor' as const, hecho: fila.proveedor },
          ]
        : []),
      ...(fila.puede_horario ? [{ paso: 'horario' as const, hecho: fila.horario }] : []),
      ...(fila.puede_invitar ? [{ paso: 'equipo' as const, hecho: fila.equipo }] : []),
    ];

    return {
      pasos,
      oculta: fila.es_ejemplo || fila.apagada || pasos.length === 0,
    };
  },
});
