import {
  costeDeLaReceta,
  costePorRacion,
  elDiaQueVale,
  fechaEnElLocal,
  fechaOperativa,
  lunesDe,
  losDiasQueSeSirve,
  masDias,
  porRacion,
  type FechaOperativa,
} from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';
import { elRelojYElFisco } from './desviacion.ts';
import { type ElLibro } from './escandallos.ts';

/**
 * Los menús de un local (M10 · 2, decisiones 0103 y 0104), lo que leen la consulta y los
 * comandos.
 *
 * **Un día que nadie ha tocado vale lo del último montado antes** (`dia_de_menu`): el
 * menú del lunes sigue el martes si el martes no se cambia, sin copiar nada cada noche.
 * Al tocar un día que no estaba montado, se monta con lo que valía y se cambia encima
 * (`montarElDia`): así lo de los otros días no se mueve.
 */

export interface MenuLeido {
  readonly id: string;
  readonly nombre: string;
  readonly clase: 'del_dia' | 'otro';
  readonly precioCentimos: number | null;
  readonly entraPan: boolean;
  readonly entraCafe: boolean;
  readonly diasQueSeSirve: readonly number[];
  readonly panProductoId: string | null;
  readonly panRaciones: number | null;
  readonly cafeProductoId: string | null;
  readonly cafeRaciones: number | null;
  readonly orden: number;
  readonly version: number;
}

export interface SeccionLeida {
  readonly id: string;
  readonly menuId: string;
  readonly nombre: string;
  readonly orden: number;
  readonly esPostre: boolean;
  readonly incluida: boolean;
}

export interface PlatoDelDiaLeido {
  readonly seccionId: string;
  readonly platoId: string;
  readonly nombre: string;
  readonly suplementoCentimos: number;
  readonly orden: number;
  readonly enLaCarta: boolean;
}

interface FilaDeMenu {
  id: string;
  nombre: string;
  clase: 'del_dia' | 'otro';
  precio_centimos: number | null;
  entra_pan: boolean;
  entra_cafe: boolean;
  dias: number[];
  pan_producto_id: string | null;
  pan_raciones: number | null;
  cafe_producto_id: string | null;
  cafe_raciones: number | null;
  orden: number;
  version: number;
}

function comoMenu(f: FilaDeMenu): MenuLeido {
  return {
    id: f.id,
    nombre: f.nombre,
    clase: f.clase,
    precioCentimos: f.precio_centimos,
    entraPan: f.entra_pan,
    entraCafe: f.entra_cafe,
    diasQueSeSirve: [...f.dias].map(Number).sort((a, b) => a - b),
    panProductoId: f.pan_producto_id,
    panRaciones: f.pan_raciones,
    cafeProductoId: f.cafe_producto_id,
    cafeRaciones: f.cafe_raciones,
    orden: f.orden,
    version: f.version,
  };
}

/** Los menús que se sirven en el local: primero el del día, después los demás en su orden. */
export async function losMenusDelLocal(contexto: Contexto, localId: string): Promise<MenuLeido[]> {
  const filas = await contexto.sql<FilaDeMenu[]>`
    select id, nombre, clase::text as clase, precio_centimos, entra_pan, entra_cafe,
           dias::int[] as dias, pan_producto_id, pan_raciones, cafe_producto_id, cafe_raciones,
           orden, version
      from estook.menu
     where local_id = ${localId}::uuid and activo
     order by (clase = 'del_dia') desc, orden, nombre
  `;
  return filas.map(comoMenu);
}

/** Un menú del local, para cambiarlo. Si no es de este local o está archivado, no existe. */
export async function elMenuDelLocal(
  contexto: Contexto,
  localId: string,
  menuId: string,
): Promise<MenuLeido> {
  const filas = await contexto.sql<FilaDeMenu[]>`
    select id, nombre, clase::text as clase, precio_centimos, entra_pan, entra_cafe,
           dias::int[] as dias, pan_producto_id, pan_raciones, cafe_producto_id, cafe_raciones,
           orden, version
      from estook.menu
     where id = ${menuId}::uuid and local_id = ${localId}::uuid and activo
  `;
  const fila = filas[0];
  if (fila === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese menú no está en este local.' });
  }
  return comoMenu(fila);
}

export async function lasSeccionesDeLosMenus(
  contexto: Contexto,
  menuIds: readonly string[],
): Promise<SeccionLeida[]> {
  if (menuIds.length === 0) return [];
  const filas = await contexto.sql<
    {
      id: string;
      menu_id: string;
      nombre: string;
      orden: number;
      es_postre: boolean;
      incluida: boolean;
    }[]
  >`
    select id, menu_id, nombre, orden, es_postre, incluida
      from estook.seccion_de_menu
     where menu_id = any (${comoLista(menuIds)}::text::uuid[])
     order by orden, nombre
  `;
  return filas.map((f) => ({
    id: f.id,
    menuId: f.menu_id,
    nombre: f.nombre,
    orden: f.orden,
    esPostre: f.es_postre,
    incluida: f.incluida,
  }));
}

/** Hoy en el local, en su calendario (no la jornada: a la una de la mañana ya es mañana). */
export async function hoyEnElLocal(contexto: Contexto, localId: string): Promise<FechaOperativa> {
  const reloj = await elRelojYElFisco(contexto, localId);
  return fechaEnElLocal(contexto.ahora, reloj.zonaHoraria);
}

/** Los días montados de un menú hasta una fecha, para saber qué vale cada día. */
async function losDiasMontados(
  contexto: Contexto,
  menuId: string,
  hasta: FechaOperativa,
): Promise<FechaOperativa[]> {
  const filas = await contexto.sql<{ fecha: string }[]>`
    select to_char(fecha, 'YYYY-MM-DD') as fecha from estook.dia_de_menu
     where menu_id = ${menuId}::uuid and fecha <= ${hasta}::date
     order by fecha
  `;
  return filas.map((f) => fechaOperativa(f.fecha));
}

/** El día montado del que sale lo que vale una fecha, o nulo si no hay ninguno antes. */
export async function elDiaMontadoQueVale(
  contexto: Contexto,
  menuId: string,
  fecha: FechaOperativa,
): Promise<FechaOperativa | null> {
  return elDiaQueVale(await losDiasMontados(contexto, menuId, fecha), fecha);
}

/** Los platos que hay puestos en unos días montados de un menú. */
async function losPlatosDeLosDias(
  contexto: Contexto,
  menuId: string,
  fechas: readonly FechaOperativa[],
): Promise<Map<string, PlatoDelDiaLeido[]>> {
  const porDia = new Map<string, PlatoDelDiaLeido[]>();
  if (fechas.length === 0) return porDia;
  const filas = await contexto.sql<
    {
      fecha: string;
      seccion_id: string;
      plato_id: string;
      nombre: string;
      suplemento_centimos: number;
      orden: number;
      en_la_carta: boolean;
    }[]
  >`
    select to_char(pm.fecha, 'YYYY-MM-DD') as fecha, pm.seccion_id, pm.plato_id, p.nombre,
           pm.suplemento_centimos, pm.orden, p.en_la_carta
      from estook.plato_de_menu pm
      join estook.plato p on p.id = pm.plato_id
     where pm.menu_id = ${menuId}::uuid
       and pm.fecha = any (${comoLista(fechas)}::text::date[])
       and p.activo
     order by pm.orden, p.nombre
  `;
  for (const f of filas) {
    const lista = porDia.get(f.fecha) ?? [];
    lista.push({
      seccionId: f.seccion_id,
      platoId: f.plato_id,
      nombre: f.nombre,
      suplementoCentimos: f.suplemento_centimos,
      orden: f.orden,
      enLaCarta: f.en_la_carta,
    });
    porDia.set(f.fecha, lista);
  }
  return porDia;
}

export interface UnDiaLeido {
  readonly fecha: FechaOperativa;
  /** El día montado del que sale lo que vale; nulo si todavía no se ha montado ninguno. */
  readonly vale: FechaOperativa | null;
  readonly platos: readonly PlatoDelDiaLeido[];
}

/**
 * Los días de una semana en que se sirve el menú, cada uno con lo que vale. Un menú que
 * no es el del día (el ejecutivo, el de grupo) no cambia por días: se lee el de hoy.
 */
export async function laSemana(
  contexto: Contexto,
  menu: MenuLeido,
  lunes: FechaOperativa,
  hoy: FechaOperativa,
): Promise<UnDiaLeido[]> {
  const dias = menu.clase === 'del_dia' ? losDiasQueSeSirve(lunes, menu.diasQueSeSirve) : [hoy];
  const ultimo = dias.reduce((a, b) => (b > a ? b : a), lunes);
  const montados = await losDiasMontados(contexto, menu.id, ultimo);
  const valen = dias.map((fecha) => ({ fecha, vale: elDiaQueVale(montados, fecha) }));
  const platos = await losPlatosDeLosDias(contexto, menu.id, [
    ...new Set(valen.flatMap((v) => (v.vale === null ? [] : [v.vale]))),
  ]);
  return valen.map(({ fecha, vale }) => ({
    fecha,
    vale,
    platos: vale === null ? [] : (platos.get(vale) ?? []),
  }));
}

/** Los platos que valen un día, montado o repetido del anterior. */
export async function losPlatosDelDia(
  contexto: Contexto,
  menuId: string,
  fecha: FechaOperativa,
): Promise<readonly PlatoDelDiaLeido[]> {
  const vale = await elDiaMontadoQueVale(contexto, menuId, fecha);
  if (vale === null) return [];
  return (await losPlatosDeLosDias(contexto, menuId, [vale])).get(vale) ?? [];
}

/** Lo más lejos que se monta un menú: dos meses. Más allá, nadie sabe qué habrá. */
const DIAS_HACIA_DELANTE = 62;

/**
 * Que el día se pueda tocar: desde hoy y hasta dos meses. **Lo que ya pasó no se
 * cambia**: es lo que se sirvió, y es la historia que leerá Fogón (0104).
 */
export function sePuedeTocar(fecha: FechaOperativa, hoy: FechaOperativa): void {
  if (fecha < hoy) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Ese día ya pasó: lo que se sirvió se queda como estaba.',
    });
  }
  if (fecha > masDias(hoy, DIAS_HACIA_DELANTE)) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Se puede montar el menú de los dos próximos meses, no más allá.',
    });
  }
}

/** El día en que se escribe: el de la fecha en el menú del día, y hoy en los demás. */
export function elDiaQueSeToca(
  menu: MenuLeido,
  fecha: FechaOperativa,
  hoy: FechaOperativa,
): FechaOperativa {
  return menu.clase === 'del_dia' ? fecha : hoy;
}

/**
 * Monta un día con lo que valía (si no lo estaba) para cambiarlo encima. Vuelve sin hacer
 * nada si ya estaba montado.
 */
export async function montarElDia(
  contexto: Contexto,
  localId: string,
  menuId: string,
  fecha: FechaOperativa,
): Promise<void> {
  // De uno en uno por menú: dos personas montando el mismo día a la vez no lo duplican.
  await contexto.sql`select pg_advisory_xact_lock(hashtext(${`menu:${menuId}`}))`;
  const ya = await contexto.sql<{ fecha: string }[]>`
    select fecha::text as fecha from estook.dia_de_menu
     where menu_id = ${menuId}::uuid and fecha = ${fecha}::date
  `;
  if (ya.length > 0) return;
  const montados = await losDiasMontados(contexto, menuId, fecha);
  const vale = elDiaQueVale(montados, fecha);
  await contexto.sql`
    insert into estook.dia_de_menu (menu_id, fecha, local_id, puesto_por, puesto_en)
    values (${menuId}::uuid, ${fecha}::date, ${localId}::uuid, ${contexto.personaId}::uuid,
            ${contexto.ahora.toISOString()}::timestamptz)
  `;
  if (vale === null) return;
  await contexto.sql`
    insert into estook.plato_de_menu
      (menu_id, fecha, seccion_id, plato_id, local_id, suplemento_centimos, orden)
    select menu_id, ${fecha}::date, seccion_id, plato_id, local_id, suplemento_centimos, orden
      from estook.plato_de_menu
     where menu_id = ${menuId}::uuid and fecha = ${vale}::date
  `;
}

/** El lunes de la semana que se pide, o el de esta semana. */
export function elLunes(pedido: string | undefined, hoy: FechaOperativa): FechaOperativa {
  return lunesDe(pedido === undefined ? hoy : fechaOperativa(pedido));
}

// ── Lo que cuesta ─────────────────────────────────────────────────────────────

/**
 * Lo que cuesta una ración de un plato, en milésimas de céntimo, con su escandallo. Nulo
 * si no lo tiene o le falta algún precio: **no se da un coste falso** (Plan, M9).
 */
export function elCosteDelPlato(libro: ElLibro, platoId: string): number | null {
  const receta = libro.recetaDelPlato.get(platoId);
  if (receta === undefined || receta.lineas.length === 0) return null;
  const coste = costeDeLaReceta(receta.lineas, libro.libro);
  return porRacion(coste.milesimas, receta.raciones);
}

/** Lo que cuesta una ración de pan o de café: su producto entre las raciones que da. */
export function elCosteDeLoQueEntra(
  libro: ElLibro,
  productoId: string | null,
  raciones: number | null,
): number | null {
  if (productoId === null) return null;
  return costePorRacion(libro.productos.get(productoId)?.costeMilesimas ?? null, raciones);
}
