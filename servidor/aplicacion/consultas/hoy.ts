import { z } from 'zod';
import {
  TURNO_SOSPECHOSO_DESDE,
  diaDeLaSemana,
  fechaOperativa,
  loDeHoy,
  masDias,
  minutosHasta,
  type CosaDeHoy,
  type FechaOperativa,
  type LoQueHayHoy,
  type MiTurnoDeHoy,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { miFichaje } from './equipo.ts';
import { laJornada } from './indicador.ts';
import { inventarioHoy } from './inventario.ts';
import { comprasDeHoy } from './pedidos.ts';

/**
 * Lo de hoy · la zona de atención del Panel, ordenada por el servidor (entrega O,
 * mejora 8 · decisión 0047).
 *
 * **No cuenta nada por su cuenta.** Pregunta a las consultas de siempre —lo que
 * enseña Inventario · Resumen (`inventario_hoy`), las compras de hoy
 * (`compras_de_hoy`) y el fichaje de quien mira (`mi_fichaje`)— y el dominio
 * (`loDeHoy`) lo ordena. Así lo de hoy no puede decir «3 bajo mínimo» mientras
 * Inventario dice 4, que es la clase de fallo que Richi encontró el 23-sep.
 *
 * Cada trozo, **solo si quien pregunta puede verlo**, comprobado aquí con la misma
 * función que usa la puerta de cada consulta: a una camarera no le sale la caja,
 * y a un cocinero no le sale el dinero de un pedido.
 */

export interface SalidaLoDeHoy {
  /**
   * La jornada, la que corta a la hora de corte del local (regla 10): entre las
   * doce y las cinco de la mañana sigue siendo «ayer». Es la de la caja y la de las
   * cifras; las compras cuentan con el día del calendario, que es el del proveedor.
   */
  readonly hoy: string;
  readonly cosas: readonly CosaDeHoy[];
}

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver lo de hoy. Elige uno primero.',
    });
  }
  return localId;
}

export const loDeHoyConsulta = consulta<Record<string, never>, SalidaLoDeHoy>({
  nombre: 'lo_de_hoy',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const localId = elLocal(contexto);
    const puede = await loQuePuede(contexto, localId, [
      'app.inventario',
      'dato.precio_de_compra',
      'dato.ventas',
    ]);

    let hay: LoQueHayHoy = {};
    const hoy = fechaOperativa(await laJornada(contexto, localId));

    // ── Lo del género y las compras ──
    if (puede.ver('app.inventario')) {
      const inventario = await inventarioHoy.ejecutar(contexto, {});
      // Lo congelado no caduca mientras siga en el congelador.
      const lotes = inventario.caducan.filter((lote) => !lote.congelado);
      const nombres = (quedan: (dias: number) => boolean) => [
        ...new Set(lotes.filter((lote) => quedan(lote.dias)).map((lote) => lote.producto)),
      ];

      const compras = await comprasDeHoy.ejecutar(contexto, {});
      const atrasados = compras.llegan.filter((p) => p.atrasado);
      const importes = puede.ver('dato.precio_de_compra')
        ? await losImportes(
            contexto,
            atrasados.map((p) => p.pedidoId),
          )
        : new Map<string, number>();

      hay = {
        ...hay,
        pedidosQueNoHanLlegado: atrasados.map((p) => ({
          pedidoId: p.pedidoId,
          proveedor: p.proveedor,
          llegaCuando: p.llegaCuando,
          centimos: importes.get(p.pedidoId) ?? null,
        })),
        lotes: {
          pasados: nombres((dias) => dias < 0),
          hoy: nombres((dias) => dias === 0),
          manana: nombres((dias) => dias === 1),
        },
        agotados: inventario.atencion
          .filter((p) => p.estado === 'agotado' || p.estado === 'negativo')
          .map((p) => p.nombre),
        bajoMinimo: inventario.atencion.filter((p) => p.estado === 'bajo_minimo').length,
        llegaHoy: compras.llegan
          .filter((p) => !p.atrasado && p.llegaEl === compras.hoy)
          .map((p) => ({ pedidoId: p.pedidoId, proveedor: p.proveedor })),
        // Lo que ya tiene borrador sale como borrador, no dos veces.
        tocaPedir: compras.tocaPedir
          .filter((t) => !t.yaPedido && t.borradorId === null)
          .map((t) => ({
            proveedorId: t.proveedorId,
            proveedor: t.proveedor,
            llegaCuando: t.llegaCuando,
            productos: t.productos,
          })),
        // Un borrador lo tiene que ver quien lo puede mandar: a los demás no les toca.
        borradores: compras.puedeEnviar
          ? compras.borradores.map((b) => ({
              pedidoId: b.pedidoId,
              proveedor: b.proveedor,
              lineas: b.lineas,
            }))
          : [],
      };
    }

    // ── La caja ──
    if (puede.ver('dato.ventas')) {
      hay = { ...hay, cajaSinCerrar: await laCajaSinCerrar(contexto, localId, hoy) };
    }

    // ── Mi turno ──
    const mio = await miFichaje.ejecutar(contexto, {});
    hay = { ...hay, miTurno: miTurno(mio) };

    return { hoy, cosas: loDeHoy(hay) };
  },
});

/** Lo que vale cada pedido, con los precios de sus líneas. Sin precio no suma. */
async function losImportes(
  contexto: Contexto,
  pedidos: readonly string[],
): Promise<ReadonlyMap<string, number>> {
  if (pedidos.length === 0) return new Map();
  const filas = await contexto.sql<{ pedido_id: string; centimos: string | null }[]>`
    select l.pedido_id, sum(round(l.cantidad * l.precio_centimos))::text as centimos
      from estook.linea_de_pedido l
     where l.pedido_id = any(${comoLista(pedidos)}::text::uuid[])
       and l.precio_centimos is not null
     group by l.pedido_id
  `;
  return new Map(
    filas.filter((f) => f.centimos !== null).map((f) => [f.pedido_id, Number(f.centimos)] as const),
  );
}

/**
 * La caja de ayer, si el local la cierra a mano y **suele cerrarla ese día**.
 *
 * Un local que no abre los lunes no tiene la caja del lunes «sin cerrar». Así que
 * se mira qué días de la semana se ha cerrado en las cuatro semanas de antes, y
 * solo se avisa si ayer era uno de ellos. Sin cierres en ese tiempo no se avisa:
 * quien no ha empezado a cerrar caja no tiene nada pendiente, tiene algo por
 * empezar, y eso lo dice «Lo que te falta».
 */
async function laCajaSinCerrar(
  contexto: Contexto,
  localId: string,
  hoy: FechaOperativa,
): Promise<{ readonly cuando: string } | null> {
  const ayer = masDias(hoy, -1);
  const filas = await contexto.sql<
    { como: string; ayer_cerrada: boolean; dias: number[] | null }[]
  >`
    select l.como_se_cierra::text as como,
           exists (select 1 from estook.cierre_de_caja c
                    where c.local_id = l.id and c.fecha_operativa = ${ayer}::date) as ayer_cerrada,
           (select array_agg(distinct extract(isodow from c.fecha_operativa)::int)
              from estook.cierre_de_caja c
             where c.local_id = l.id
               and c.fecha_operativa between ${ayer}::date - 28 and ${ayer}::date - 1) as dias
      from estook.local l where l.id = ${localId}
  `;
  const fila = filas[0];
  if (fila === undefined || fila.como !== 'a_mano' || fila.ayer_cerrada) return null;
  const suele = (fila.dias ?? []).includes(diaDeLaSemana(ayer));
  // «Ayer» y nada más: la fecha entera partía el título en tres líneas en el móvil
  // (25-sep), y ayer no necesita decir qué día fue.
  return suele ? { cuando: 'ayer' } : null;
}

/** Del fichaje de quien mira: si le toca entrar, o si lleva demasiadas horas dentro. */
function miTurno(mio: Awaited<ReturnType<typeof miFichaje.ejecutar>>): MiTurnoDeHoy | null {
  if (!mio.puedoFichar) return null;
  if (mio.abierto !== null) {
    return mio.abierto.minutos >= TURNO_SOSPECHOSO_DESDE
      ? { que: 'olvidada', horas: Math.floor(mio.abierto.minutos / 60) }
      : null;
  }
  // Ya ha trabajado hoy y se ha ido: su turno de hoy está hecho.
  if (mio.minutosDeHoy > 0) return null;
  const tramo = mio.horario.find((t) => t.dia === mio.diaDeLaSemana);
  if (tramo === undefined) return null;
  const enMinutos = minutosHasta(mio.horaDelLocal, tramo.entra);
  // De cuatro horas tarde a lo que quede del día: más tarde ya no es «entrabas».
  return enMinutos > -240 ? { que: 'entra', aLas: tramo.entra, enMinutos } : null;
}
