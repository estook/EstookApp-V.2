import { aCentimos, costeDeLaReceta, porRacion } from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { elLibroDelLocal } from './escandallos.ts';

/**
 * Lo que se vende y cómo va el servicio, leído de las mesas de Estook TPV (la pausa del 8-nov,
 * 0142). Lo comparten Servicio › Jornadas › Información, Negocio › Informes y Servicio › Empleados.
 *
 * Se lee con las dos funciones de la 0112, que solo dan las mesas a quien ve las ventas de ese
 * local. **Hasta T7 es lo pedido** en las mesas que no se anularon; con el cobro, será lo cobrado.
 */

export interface LineaVendida {
  readonly lineaId: string;
  readonly cuentaId: string;
  readonly platoId: string | null;
  readonly menuId: string | null;
  readonly parteDe: string | null;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly destino: 'cocina' | 'barra' | 'ninguno';
  readonly cantidad: number;
  readonly precioCentimos: number;
  readonly pedidaEn: string;
  readonly mandadaEn: string | null;
  readonly marchadoEn: string | null;
  readonly salioEn: string | null;
  readonly quitadaEn: string | null;
  readonly motivoDeQuitar: string | null;
  readonly cambiada: boolean;
  readonly estabaHecho: boolean | null;
  readonly vuelveEn: string | null;
  readonly motivoDeVuelve: string | null;
  readonly camareroId: string | null;
  readonly jornada: string;
  readonly hora: number;
  /** 1 es lunes y 7 domingo. */
  readonly diaDeSemana: number;
}

export interface MesaDelServicio {
  readonly cuentaId: string;
  readonly tipo: string;
  readonly personas: number | null;
  readonly camareroId: string | null;
  readonly liberadaEn: string | null;
  readonly anuladaEn: string | null;
  readonly motivoDeAnular: string | null;
  readonly jornada: string;
}

const enTexto = (fecha: Date | string | null): string | null =>
  fecha === null ? null : fecha instanceof Date ? fecha.toISOString() : fecha;

/** Las líneas de las mesas de un local entre dos jornadas, quitadas incluidas. */
export async function lasLineasVendidas(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
): Promise<readonly LineaVendida[]> {
  try {
    const filas = await contexto.sql<
      {
        linea_id: string;
        cuenta_id: string;
        plato_id: string | null;
        menu_id: string | null;
        parte_de: string | null;
        nombre: string;
        seccion: string | null;
        destino: 'cocina' | 'barra' | 'ninguno';
        cantidad: number;
        precio_centimos: number;
        pedida_en: Date | string;
        mandada_en: Date | string | null;
        marchado_en: Date | string | null;
        salio_en: Date | string | null;
        quitada_en: Date | string | null;
        motivo_de_quitar: string | null;
        cambiada: boolean;
        estaba_hecho: boolean | null;
        vuelve_en: Date | string | null;
        motivo_de_vuelve: string | null;
        camarero_id: string | null;
        jornada: Date | string;
        hora: number;
        dia_de_semana: number;
      }[]
    >`
      select * from estook.las_lineas_vendidas(${localId}::uuid, ${desde}::date, ${hasta}::date)
    `;
    return filas.map((f) => ({
      lineaId: f.linea_id,
      cuentaId: f.cuenta_id,
      platoId: f.plato_id,
      menuId: f.menu_id,
      parteDe: f.parte_de,
      nombre: f.nombre,
      seccion: f.seccion,
      destino: f.destino,
      cantidad: Number(f.cantidad),
      precioCentimos: Number(f.precio_centimos),
      pedidaEn: enTexto(f.pedida_en) ?? '',
      mandadaEn: enTexto(f.mandada_en),
      marchadoEn: enTexto(f.marchado_en),
      salioEn: enTexto(f.salio_en),
      quitadaEn: enTexto(f.quitada_en),
      motivoDeQuitar: f.motivo_de_quitar,
      cambiada: f.cambiada,
      estabaHecho: f.estaba_hecho,
      vuelveEn: enTexto(f.vuelve_en),
      motivoDeVuelve: f.motivo_de_vuelve,
      camareroId: f.camarero_id,
      jornada: (enTexto(f.jornada) ?? '').slice(0, 10),
      hora: Number(f.hora),
      diaDeSemana: Number(f.dia_de_semana),
    }));
  } catch (fallo) {
    throw sinPermisoSiLoEs(fallo);
  }
}

/** Las mesas de un local entre dos jornadas, anuladas incluidas. */
export async function lasMesasDelServicio(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
): Promise<readonly MesaDelServicio[]> {
  try {
    const filas = await contexto.sql<
      {
        cuenta_id: string;
        tipo: string;
        personas: number | null;
        camarero_id: string | null;
        liberada_en: Date | string | null;
        anulada_en: Date | string | null;
        motivo_de_anular: string | null;
        jornada: Date | string;
      }[]
    >`
      select * from estook.las_mesas_del_servicio(${localId}::uuid, ${desde}::date, ${hasta}::date)
    `;
    return filas.map((f) => ({
      cuentaId: f.cuenta_id,
      tipo: f.tipo,
      personas: f.personas === null ? null : Number(f.personas),
      camareroId: f.camarero_id,
      liberadaEn: enTexto(f.liberada_en),
      anuladaEn: enTexto(f.anulada_en),
      motivoDeAnular: f.motivo_de_anular,
      jornada: (enTexto(f.jornada) ?? '').slice(0, 10),
    }));
  } catch (fallo) {
    throw sinPermisoSiLoEs(fallo);
  }
}

function sinPermisoSiLoEs(fallo: unknown): unknown {
  const codigo = (fallo as { code?: string } | null)?.code;
  if (codigo === '42501') return new FalloDeAplicacion('sin_permiso');
  return fallo;
}

/** Lo que cuenta como vendido: lo que no se quitó. */
export function seVendio(l: LineaVendida): boolean {
  return l.quitadaEn === null;
}

/** El importe de una línea, con IVA, en céntimos. */
export function importeDe(l: LineaVendida): number {
  return l.precioCentimos * l.cantidad;
}

/** Sin IVA, con el tipo del local (el de restauración, 0,10 de fábrica si no se sabe). */
export function sinIva(conIva: number, tipo: number | null): number {
  return Math.round(conIva / (1 + (tipo ?? 0.1)));
}

/**
 * Lo que cuesta una ración de cada plato, del escandallo y con el Almacén de hoy (el coste no se
 * guarda, 0086). Nulo para el que no tiene escandallo o le falta algún precio: no se inventa.
 */
export async function losCostesDeLosPlatos(
  contexto: Contexto,
  localId: string,
  platos: readonly string[],
): Promise<ReadonlyMap<string, number | null>> {
  const libro = await elLibroDelLocal(contexto, localId, true);
  const costes = new Map<string, number | null>();
  for (const id of new Set(platos)) {
    const receta = libro.recetaDelPlato.get(id);
    if (receta === undefined || receta.lineas.length === 0) {
      costes.set(id, null);
      continue;
    }
    const coste = costeDeLaReceta(receta.lineas, libro.libro);
    const racion = porRacion(coste.milesimas, receta.raciones);
    costes.set(id, racion === null ? null : Number(aCentimos(racion)));
  }
  return costes;
}
