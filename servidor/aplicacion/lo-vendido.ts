import {
  enMilesimasEnteras,
  esUnidadDeUso,
  horaDeCorte,
  jornadaDe,
  loQueBajaUnPlato,
  loQueVuelve,
  type LibroQueBaja,
  type OpcionQueBaja,
  type ProductoQueBaja,
} from '@estook/dominio';
import { apuntarUnFallo } from '../infraestructura/fallos.ts';
import { apuntar, elProductoBloqueado } from './almacen.ts';
import type { Contexto } from './contrato.ts';
import { elLibroDelLocal } from './escandallos.ts';
import { enNombreDelSistema } from './pago.ts';
import { enUnPuntoDeGuardado } from './punto-de-guardado.ts';
import { elTituloDeLaCuenta } from './sala.ts';

/**
 * **Lo vendido baja del almacén** (M20 · 1, decisión 0149; Richi, 10-nov: «un reloj suizo»).
 *
 * Al cobrar en Estook TPV, cada plato resta lo que lleva su escandallo (la cuenta, en
 * `@estook/dominio`, `loQueBajaUnPlato`). Lo hace **el mismo cobro**, así:
 *
 *   1. El cobro deja lo suyo en la cola (`ponerEnLaCola`), dentro de su transacción: si el cobro se
 *      guarda, la cola también.
 *   2. Y restar va **en un punto de guardado aparte** (`bajarLoPendiente`): si algo falla —una receta
 *      rara, un fallo de la base—, se vuelve a ese punto, el cobro sigue entero, la fila se queda en la
 *      cola con su fallo (y en Sentry), y **el siguiente cobro del local la vuelve a intentar** antes
 *      que lo suyo. `bd:comprobar-api` avisa si algo lleva más de una hora.
 *
 * **Nada se resta dos veces**: cada plato cobrado se apunta una vez en `linea_bajada` (es su clave),
 * y un plato que ya está ahí no vuelve a restar aunque su cobro se repita.
 *
 * Quien cobra (un camarero) no lleva Almacén: lo que se escribe en el libro, en los lotes y en
 * `linea_bajada` va **como el sistema** (0121), con la persona que cobró puesta en cada línea. Lo que
 * se lee va con esa persona y sus políticas: de un local que no ve, no resta nada.
 *
 * Y la anulación y la devolución por «Se cobró de más», al revés: vuelve lo que salió, con una línea
 * nueva en el libro que lo dice. Nunca se borra nada.
 */

export type QueSeBaja = 'cobro' | 'anulacion' | 'devolucion';

/** Lo que se le pasa a la cola en una devolución: qué líneas del ticket y cuántas. */
export interface PartesDevueltas {
  readonly documentoId: string;
  readonly partes: readonly { readonly linea: number; readonly cantidad: number }[];
}

/** Los días hacia atrás que se miran para saber si las ventas de un local ya restan solas. */
export const DIAS_QUE_SE_MIRAN = 30;

/**
 * **Si lo vendido ya resta solo en este local** (0149; m20, 3.1): algún cobro de Estook TPV ha restado
 * su escandallo en los últimos treinta días. Entonces «Vendido a un cliente» y «Gastado en cocina»
 * salen de «Sacar género», para no restar dos veces lo mismo. Sin eso (sin Estook TPV, o con todo sin
 * escandallo), todo sigue como siempre.
 */
export async function loVendidoBaja(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ baja: boolean }[]>`
    select exists (
      select 1 from estook.linea_bajada b
       where b.local_id = ${localId}::uuid and b.estado = 'bajada'
         and b.bajada_en > ${contexto.ahora.toISOString()}::timestamptz - make_interval(days => ${DIAS_QUE_SE_MIRAN})
    ) as baja
  `;
  return filas[0]?.baja === true;
}

/** Cuántas filas de la cola se hacen en un cobro, como mucho: el cobro no se alarga por un atasco. */
const DE_UNA_VEZ = 10;

/**
 * Deja en la cola lo que hay que restar o devolver. Dos veces lo mismo (la respuesta del cobro se
 * perdió y se repite) no entra dos veces.
 */
export async function ponerEnLaCola(
  contexto: Contexto,
  localId: string,
  que: QueSeBaja,
  cobroId: string,
  devolucion?: PartesDevueltas,
): Promise<void> {
  await contexto.sql`
    insert into estook.lo_vendido_por_bajar (local_id, que, cobro_id, documento_id, partes)
    values (${localId}::uuid, ${que}, ${cobroId}::uuid, ${devolucion?.documentoId ?? null}::uuid,
            ${devolucion === undefined ? null : JSON.stringify(devolucion.partes)}::text::jsonb)
    on conflict do nothing
  `;
}

interface FilaDeLaCola {
  readonly id: string;
  readonly que: QueSeBaja;
  readonly cobro_id: string;
  readonly partes: unknown;
  readonly intentos: number;
}

export interface LoQueSeBajo {
  readonly hechos: number;
  readonly fallidos: number;
}

/**
 * **Resta (o devuelve) lo que esté en la cola del local**, lo más viejo primero. Nunca lanza: lo que
 * falla se queda en la cola, se apunta en Sentry y lo intenta el siguiente.
 */
export async function bajarLoPendiente(contexto: Contexto, localId: string): Promise<LoQueSeBajo> {
  // **Lo que no ha fallado, primero**: si algo falla siempre, no ocupa el sitio de lo nuevo y se
  // reintenta detrás. Dentro de cada grupo, lo más viejo primero.
  const cola = await contexto.sql<FilaDeLaCola[]>`
    select id::text as id, que, cobro_id::text as cobro_id, partes, intentos
      from estook.lo_vendido_por_bajar
     where local_id = ${localId}::uuid
     order by intentos > 0, id
     limit ${DE_UNA_VEZ}
     for update skip locked
  `;
  let hechos = 0;
  let fallidos = 0;
  for (const fila of cola) {
    // Una anulación o una devolución esperan a que su cobro haya restado: si no, devolverían nada
    // y después el cobro restaría lo que ya no se vendió. Se mira en la base, no solo en esta vuelta.
    if (fila.que !== 'cobro') {
      const [espera] = await contexto.sql<{ si: boolean }[]>`
        select exists (
          select 1 from estook.lo_vendido_por_bajar
           where que = 'cobro' and cobro_id = ${fila.cobro_id}::uuid
        ) as si
      `;
      if (espera?.si === true) continue;
    }
    try {
      await enUnPuntoDeGuardado(contexto, (aparte) =>
        enNombreDelSistema(aparte, async () => {
          if (fila.que === 'cobro') await restarUnCobro(aparte, localId, fila.cobro_id);
          else if (fila.que === 'anulacion') await devolverUnCobro(aparte, fila.cobro_id);
          else await devolverLoCobradoDeMas(aparte, fila.cobro_id, lasPartes(fila.partes));
          await aparte.sql`delete from estook.lo_vendido_por_bajar where id = ${fila.id}::bigint`;
        }),
      );
      hechos += 1;
    } catch (fallo) {
      fallidos += 1;
      const porque = fallo instanceof Error ? fallo.message : String(fallo);
      await contexto.sql`
        update estook.lo_vendido_por_bajar
           set intentos = least(intentos + 1, 32000), ultimo_fallo = ${porque.slice(0, 500)}
         where id = ${fila.id}::bigint
      `;
      await apuntarUnFallo(fallo, {
        mensaje: 'lo vendido no ha bajado del almacén: se reintenta con el siguiente cobro',
        correlacionId: contexto.correlacionId,
        extra: { cola: fila.id, que: fila.que, cobro: fila.cobro_id, intentos: fila.intentos + 1 },
      });
    }
  }
  return { hechos, fallidos };
}

/** Las partes devueltas, como las guardó la cola. Lo que no tiene forma de parte, no cuenta. */
function lasPartes(guardadas: unknown): PartesDevueltas['partes'] {
  if (!Array.isArray(guardadas)) return [];
  return guardadas.filter(
    (p): p is { linea: number; cantidad: number } =>
      typeof p === 'object' &&
      p !== null &&
      Number.isInteger((p as { linea?: unknown }).linea) &&
      Number.isInteger((p as { cantidad?: unknown }).cantidad),
  );
}

// ═══ Restar un cobro ═══════════════════════════════════════════════════════════════

interface ElCobro {
  readonly cuenta_id: string;
  readonly cobrado_en: Date | string;
  readonly tipo: string;
  readonly mesa: string | null;
  readonly nombre: string | null;
  readonly zona_horaria: string;
  readonly hora_de_corte: string;
  readonly queda: number;
}

interface LineaQueSeVendio {
  readonly id: string;
  readonly plato_id: string | null;
  readonly menu_id: string | null;
  readonly parte_de: string | null;
  readonly nombre: string;
  readonly precio_centimos: number;
  readonly cantidad: number;
  readonly peso_gramos: number | null;
  /** Lo elegido al pedir, congelado en la línea (jsonb): se lee sin fiarse de su forma. */
  readonly opciones: unknown;
}

async function restarUnCobro(contexto: Contexto, localId: string, cobroId: string): Promise<void> {
  const [cobro] = await contexto.sql<ElCobro[]>`
    select c.cuenta_id::text as cuenta_id, c.cobrado_en, cu.tipo, m.nombre as mesa, cu.nombre,
           l.zona_horaria, to_char(l.hora_de_corte, 'HH24:MI') as hora_de_corte,
           (coalesce((select sum(x.precio_centimos * x.cantidad) from estook.linea_de_cuenta x
                       where x.cuenta_id = c.cuenta_id and x.quitada_en is null), 0)
            - coalesce((select sum(y.importe) from estook.cobro y
                         where y.cuenta_id = c.cuenta_id), 0))::integer as queda
      from estook.cobro c
      join estook.cuenta cu on cu.id = c.cuenta_id
      join estook.local l on l.id = c.local_id
      left join estook.mesa m on m.id = cu.mesa_id
     where c.id = ${cobroId}::uuid
  `;
  if (cobro === undefined) return;

  // **Lo que cubre este cobro**: sus platos y los de dentro de sus menús. Y si con él la cuenta queda
  // pagada, también lo que quede sin restar de la cuenta: la cobrada a partes iguales no dice platos,
  // y es la última parte la que se los lleva todos.
  const lineas = await contexto.sql<LineaQueSeVendio[]>`
    with suyas as (
      select cl.linea_id from estook.cobro_de_linea cl where cl.cobro_id = ${cobroId}::uuid
    )
    select x.id::text as id, x.plato_id::text as plato_id, x.menu_id::text as menu_id,
           x.parte_de::text as parte_de, x.nombre, x.precio_centimos, x.cantidad, x.peso_gramos,
           x.opciones
      from estook.linea_de_cuenta x
     where x.cuenta_id = ${cobro.cuenta_id}::uuid
       and x.quitada_en is null
       and not exists (select 1 from estook.linea_bajada b where b.linea_id = x.id)
       and (
         ${cobro.queda <= 0}
         or x.id in (select linea_id from suyas)
         or x.parte_de in (select linea_id from suyas)
       )
     order by x.pedida_en, x.id
  `;
  if (lineas.length === 0) return;

  const libro = await elLibroQueBaja(contexto, localId);
  const aPeso = new Set(
    (
      await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.plato where local_id = ${localId}::uuid and a_peso
      `
    ).map((f) => f.id),
  );

  const titulo = elTituloDeLaCuenta({ tipo: cobro.tipo, mesa: cobro.mesa, nombre: cobro.nombre });
  const cuando = new Date(cobro.cobrado_en);
  const jornada = jornadaDe(cuando, cobro.zona_horaria, horaDeCorte(cobro.hora_de_corte));

  // ── Lo de cada plato, y lo de cada producto sumando los platos ─────────────────────
  const deCadaLinea = new Map<
    string,
    { estado: 'bajada' | 'sin_escandallo' | 'sin_plato'; faltan: number; platoId: string | null }
  >();
  const porProducto = new Map<string, { total: number; deCadaLinea: Map<string, number> }>();
  for (const linea of lineas) {
    if (linea.plato_id === null) {
      deCadaLinea.set(linea.id, { estado: 'sin_plato', faltan: 0, platoId: null });
      continue;
    }
    const receta = libro.recetaDelPlato.get(linea.plato_id);
    const baja = loQueBajaUnPlato(
      {
        cantidad: linea.cantidad,
        receta: receta === undefined ? null : { lineas: receta.lineas, raciones: receta.raciones },
        aPeso: aPeso.has(linea.plato_id),
        pesoGramos: linea.peso_gramos,
        opciones: lasOpciones(linea.opciones),
      },
      libro.libro,
    );
    deCadaLinea.set(linea.id, {
      estado: baja.sinEscandallo ? 'sin_escandallo' : 'bajada',
      faltan: Math.min(baja.faltan, 999),
      platoId: linea.plato_id,
    });
    for (const [productoId, cuanto] of baja.porProducto) {
      const suyo = porProducto.get(productoId) ?? {
        total: 0,
        deCadaLinea: new Map<string, number>(),
      };
      suyo.total += cuanto;
      suyo.deCadaLinea.set(linea.id, (suyo.deCadaLinea.get(linea.id) ?? 0) + cuanto);
      porProducto.set(productoId, suyo);
    }
  }

  // ── Al libro, un movimiento por producto. En orden de id: dos cobros a la vez no se cruzan ─────
  const costeDeCadaLinea = new Map<string, number | null>();
  for (const productoId of [...porProducto.keys()].sort()) {
    const suyo = porProducto.get(productoId);
    if (suyo === undefined) continue;
    const total = Number(suyo.total.toFixed(4));
    if (total <= 0) continue;
    const producto = await elProductoBloqueado(contexto, productoId);
    const lineasDelMovimiento = Object.fromEntries(
      [...suyo.deCadaLinea].map(([id, cuanto]) => [id, Number(cuanto.toFixed(4))]),
    );
    const apuntado = await apuntar(contexto, producto, {
      tipo: 'consumo',
      cantidad: -total,
      motivo: `Vendido · ${titulo}`,
      origen: 'venta',
      referencia: { cobro: cobroId, cuenta: cobro.cuenta_id, lineas: lineasDelMovimiento },
      esEjemplo: producto.esEjemplo,
      cuando,
    });
    // Lo que costó: lo que salió, al coste medio de ese momento. Sin coste, no se inventa.
    const coste = apuntado.antes.coste;
    for (const [lineaId, cuanto] of suyo.deCadaLinea) {
      const antes = costeDeCadaLinea.get(lineaId);
      if (antes === null) continue;
      costeDeCadaLinea.set(lineaId, coste > 0 ? (antes ?? 0) + cuanto * coste : null);
    }
  }

  for (const linea of lineas) {
    const suya = deCadaLinea.get(linea.id);
    if (suya === undefined) continue;
    const coste = suya.estado === 'bajada' ? (costeDeCadaLinea.get(linea.id) ?? null) : null;
    await contexto.sql`
      insert into estook.linea_bajada
        (linea_id, local_id, cobro_id, plato_id, menu_id, menu_de, nombre, cantidad,
         importe_centimos, estado, coste_milesimas, faltan, jornada, bajada_en)
      values (${linea.id}::uuid, ${localId}::uuid, ${cobroId}::uuid, ${suya.platoId}::uuid,
              ${linea.menu_id}::uuid, ${linea.parte_de}::uuid, ${linea.nombre}, ${linea.cantidad},
              ${linea.precio_centimos * linea.cantidad}, ${suya.estado},
              ${coste === null ? null : enMilesimasEnteras(coste)}, ${suya.faltan},
              ${jornada}::date, ${contexto.ahora.toISOString()}::timestamptz)
      on conflict (linea_id) do nothing
    `;
  }
}

/** Un objeto leído de la base, para mirar sus campos sin fiarse de su forma. */
function comoObjeto(valor: unknown): Readonly<Record<string, unknown>> | null {
  return typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : null;
}

/** Lo que se eligió al pedir, como lo congeló la línea. Lo que no se entiende, no resta nada. */
function lasOpciones(opciones: unknown): OpcionQueBaja[] {
  if (!Array.isArray(opciones)) return [];
  return opciones.map((cruda: unknown) => {
    const o = comoObjeto(cruda);
    const anade = comoObjeto(o?.['anade']);
    const productoId = anade?.['productoId'];
    const unidad = anade?.['unidad'];
    const cantidad = Number(anade?.['cantidad']);
    const quita = o?.['quita'];
    return {
      anade:
        typeof productoId === 'string' && esUnidadDeUso(unidad) && cantidad > 0
          ? { productoId, cantidad, unidad }
          : null,
      quita: typeof quita === 'string' ? quita : null,
    };
  });
}

/** Las recetas, las elaboraciones y los productos con su unidad. */
async function elLibroQueBaja(
  contexto: Contexto,
  localId: string,
): Promise<{
  readonly libro: LibroQueBaja;
  readonly recetaDelPlato: Awaited<ReturnType<typeof elLibroDelLocal>>['recetaDelPlato'];
}> {
  const elLibro = await elLibroDelLocal(contexto, localId, false);
  const productos = new Map<string, ProductoQueBaja>(
    [...elLibro.productos.values()].map((p) => [
      p.id,
      {
        id: p.id,
        unidad: p.unidad,
        contenido: p.contenido ?? null,
      },
    ]),
  );
  return {
    libro: { productos, elaboraciones: elLibro.libro.elaboraciones },
    recetaDelPlato: elLibro.recetaDelPlato,
  };
}

// ═══ Devolver lo que salió ═════════════════════════════════════════════════════════

interface MovimientoDelCobro {
  readonly id: string;
  readonly producto_id: string;
  readonly cantidad: string;
  readonly lineas: Record<string, number> | null;
}

/** Lo que restó un cobro, y que no se ha devuelto ya entero. */
async function loQueRestoElCobro(
  contexto: Contexto,
  cobroId: string,
): Promise<MovimientoDelCobro[]> {
  return contexto.sql<MovimientoDelCobro[]>`
    select m.id::text as id, m.producto_id::text as producto_id, m.cantidad::text as cantidad,
           m.referencia -> 'lineas' as lineas
      from estook.movimiento_de_stock m
     where m.tipo = 'consumo' and m.origen = 'venta' and m.cantidad < 0
       and m.referencia ->> 'cobro' = ${cobroId}
       and not exists (
         select 1 from estook.movimiento_de_stock a
          where a.referencia ? 'anula' and a.referencia ->> 'anula' = m.id::text
       )
     order by m.producto_id, m.id
  `;
}

/**
 * **El ticket anulado** (Anexo 4.5): nunca debió existir —se cobró la mesa que no era—, así que todo
 * lo que restó vuelve, a sus lotes, con una línea que lo anula. Si después se cobra la mesa buena,
 * restará lo suyo una sola vez.
 */
async function devolverUnCobro(contexto: Contexto, cobroId: string): Promise<void> {
  for (const m of await loQueRestoElCobro(contexto, cobroId)) {
    // Lo que ya volvió de este movimiento por «Se cobró de más» no vuelve otra vez.
    const yaVolvio = await contexto.sql<{ volvio: string | null }[]>`
      select coalesce(sum(v.cantidad), 0)::text as volvio from estook.movimiento_de_stock v
       where v.referencia ->> 'vuelve_de' = ${m.id}
    `;
    const volvio = Number(yaVolvio[0]?.volvio ?? 0);
    const vuelve = Number((-Number(m.cantidad) - volvio).toFixed(4));
    if (vuelve <= 0) continue;
    const producto = await elProductoBloqueado(contexto, m.producto_id);
    await apuntar(contexto, producto, {
      tipo: 'consumo',
      cantidad: vuelve,
      motivo: 'Vuelve · ticket anulado',
      origen: 'venta',
      // Entero, lo anula y vuelve a sus lotes. Si ya volvió una parte, lo que queda vuelve como
      // parte: sus lotes no se tocan, para no devolverles dos veces lo mismo.
      referencia:
        volvio > 0 ? { vuelve_de: m.id, cobro: cobroId } : { anula: m.id, cobro: cobroId },
      esEjemplo: producto.esEjemplo,
    });
  }
}

/**
 * **Lo devuelto con «Se cobró de más»** (0149, la A de Richi): se cobraron tres cañas y se sirvieron
 * dos. Lo que no salió de la barra vuelve; con los demás motivos («Mal hecho», «No lo quiso»), no: ese
 * plato salió y se gastó.
 */
async function devolverLoCobradoDeMas(
  contexto: Contexto,
  cobroId: string,
  partes: PartesDevueltas['partes'],
): Promise<void> {
  const conCantidad = partes.filter((p) => p.cantidad > 0);
  if (conCantidad.length === 0) return;

  // Qué plato es cada línea del ticket, y los de dentro de su menú que no salen en él.
  const sitios = await contexto.sql<
    { linea_id: string; posicion: number | null; parte_de: string | null; cantidad: number }[]
  >`
    select cl.linea_id::text as linea_id, cl.posicion, x.parte_de::text as parte_de, x.cantidad
      from estook.cobro_de_linea cl join estook.linea_de_cuenta x on x.id = cl.linea_id
     where cl.cobro_id = ${cobroId}::uuid
  `;
  const devueltas = new Map<string, { devueltas: number; de: number }>();
  for (const p of conCantidad) {
    const elPlato = sitios.find((s) => s.posicion === p.linea);
    if (elPlato === undefined) continue;
    devueltas.set(elPlato.linea_id, { devueltas: p.cantidad, de: elPlato.cantidad });
    // Los platos de su menú van con él, en la misma proporción.
    for (const dentro of sitios.filter(
      (s) => s.parte_de === elPlato.linea_id && s.posicion === null,
    )) {
      devueltas.set(dentro.linea_id, {
        devueltas: (p.cantidad / elPlato.cantidad) * dentro.cantidad,
        de: dentro.cantidad,
      });
    }
  }
  if (devueltas.size === 0) return;

  for (const m of await loQueRestoElCobro(contexto, cobroId)) {
    let vuelve = 0;
    for (const [lineaId, cuanto] of Object.entries(m.lineas ?? {})) {
      const suya = devueltas.get(lineaId);
      if (suya !== undefined) vuelve += loQueVuelve(cuanto, suya.devueltas, suya.de);
    }
    vuelve = Number(vuelve.toFixed(4));
    if (vuelve <= 0) continue;
    const producto = await elProductoBloqueado(contexto, m.producto_id);
    await apuntar(contexto, producto, {
      tipo: 'consumo',
      cantidad: vuelve,
      motivo: 'Vuelve · se cobró de más',
      origen: 'venta',
      // Una parte: no se marca como anulado entero, y sus lotes no se tocan (un recuento lo cuadra).
      referencia: { vuelve_de: m.id, cobro: cobroId },
      esEjemplo: producto.esEjemplo,
    });
  }
}
