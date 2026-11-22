import { z } from 'zod';
import {
  jornadaDe,
  loVendidoPorProducto,
  masDias,
  type FechaOperativa,
  type LineaCobrada,
  type ProductoVendido,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elRelojYElFisco, elTipoDeRestauracion } from '../desviacion.ts';
import { loQuePuede } from '../lo-que-puede.ts';

/**
 * Lo vendido, plato a plato (M20 · 1, decisión 0149):
 *
 *   lo_vendido_por_producto   Negocio › Ventas › Por producto: lo cobrado en Estook TPV, junto por
 *                             plato, sin IVA, con lo que costó el día que se vendió. Para quien ve las
 *                             ventas; el coste, solo para quien ve lo que cuesta un plato.
 *   vendidos_sin_escandallo   Escandallos › Resumen: los platos cobrados esta semana que no tienen
 *                             escandallo y siguen sin tenerlo. Sin un euro: lo lee también la cocina.
 *
 * Las dos leen `linea_bajada`, que es lo cobrado congelado: lo que dijo la cuenta al cobrarla.
 */

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver lo que vende. Elige uno primero.',
    });
  }
  return localId;
}

export interface LoVendidoPorProductoEnEstook {
  readonly desde: string;
  readonly hasta: string;
  /** Si quien mira ve lo que cuesta un plato: sin eso, no viajan ni el coste ni el food cost. */
  readonly conCoste: boolean;
  readonly productos: readonly ProductoVendido[];
  readonly ventas: number;
  readonly coste: number | null;
  readonly ventasConCoste: number | null;
  readonly foodCost: number | null;
  readonly sinEscandallo: number;
}

export const losVendidosPorProducto = consulta<
  { dias?: string | undefined },
  LoVendidoPorProductoEnEstook
>({
  nombre: 'lo_vendido_por_producto',
  entrada: z
    .object({
      dias: z.enum(['1', '7', '30']).optional(),
    })
    .strict(),
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const local = await elRelojYElFisco(contexto, localId);
    const hoy = jornadaDe(contexto.ahora, local.zonaHoraria, local.corte);
    const dias = Number(entrada.dias ?? '7');
    const desde = masDias(hoy, -(dias - 1));
    const [iva, puede, filas] = await Promise.all([
      elTipoDeRestauracion(contexto, local, hoy),
      loQuePuede(contexto, localId, ['dato.coste_de_plato']),
      contexto.sql<
        {
          linea_id: string;
          plato_id: string | null;
          menu_id: string | null;
          menu_de: string | null;
          nombre: string;
          plato: string | null;
          seccion: string | null;
          cantidad: number;
          importe_centimos: number;
          estado: LineaCobrada['estado'];
          coste_milesimas: string | null;
        }[]
      >`
        select b.linea_id::text as linea_id, b.plato_id::text as plato_id,
               b.menu_id::text as menu_id, b.menu_de::text as menu_de, b.nombre,
               p.nombre as plato, sc.nombre as seccion, b.cantidad, b.importe_centimos, b.estado,
               b.coste_milesimas::text as coste_milesimas
          from estook.linea_bajada b
          left join estook.plato p on p.id = b.plato_id
          left join estook.seccion_de_carta sc on sc.id = p.seccion_id
         where b.local_id = ${localId}::uuid
           and b.jornada between ${desde}::date and ${hoy}::date
      `,
    ]);
    const conCoste = puede.ver('dato.coste_de_plato');
    const cuenta = loVendidoPorProducto(
      filas.map((f) => ({
        lineaId: f.linea_id,
        platoId: f.plato_id,
        menuId: f.menu_id,
        menuDe: f.menu_de,
        // El nombre de hoy en la carta; si el plato ya no está, el que tenía al cobrarlo.
        nombre: f.plato ?? f.nombre,
        seccion: f.seccion,
        cantidad: f.cantidad,
        importeCentimos: f.importe_centimos,
        estado: f.estado,
        costeMilesimas: f.coste_milesimas === null ? null : Number(f.coste_milesimas),
      })),
      iva,
    );
    // **El coste no se esconde: no se manda** a quien no lo ve (la regla de Almacén y Escandallos).
    return {
      desde,
      hasta: hoy,
      conCoste,
      productos: conCoste
        ? cuenta.productos
        : cuenta.productos.map((p) => ({ ...p, coste: null, foodCost: null })),
      ventas: cuenta.ventas,
      coste: conCoste ? cuenta.coste : null,
      ventasConCoste: conCoste ? cuenta.ventasConCoste : null,
      foodCost: conCoste ? cuenta.foodCost : null,
      sinEscandallo: cuenta.sinEscandallo,
    };
  },
});

export interface VendidosSinEscandallo {
  readonly desde: FechaOperativa;
  readonly platos: readonly {
    readonly platoId: string;
    readonly nombre: string;
    readonly uds: number;
  }[];
  /** Las unidades de todos, juntas: «14 ventas». */
  readonly uds: number;
}

/** Los días que mira «Vendidos sin escandallo»: la semana. */
const DIAS_SIN_ESCANDALLO = 7;

export const vendidosSinEscandallo = consulta<Record<string, never>, VendidosSinEscandallo>({
  nombre: 'vendidos_sin_escandallo',
  entrada: z.object({}).strict(),
  exige: 'app.escandallos',

  async ejecutar(contexto) {
    const localId = elLocal(contexto);
    const local = await elRelojYElFisco(contexto, localId);
    const hoy = jornadaDe(contexto.ahora, local.zonaHoraria, local.corte);
    const desde = masDias(hoy, -(DIAS_SIN_ESCANDALLO - 1));
    // Los que **siguen** sin escandallo: el que ya se creó deja de salir, aunque lo de antes no restara.
    const filas = await contexto.sql<{ plato_id: string; nombre: string; uds: number }[]>`
      select b.plato_id::text as plato_id, p.nombre, sum(b.cantidad)::integer as uds
        from estook.linea_bajada b
        join estook.plato p on p.id = b.plato_id
       where b.local_id = ${localId}::uuid
         and b.estado = 'sin_escandallo'
         and b.jornada between ${desde}::date and ${hoy}::date
         and not exists (
           select 1 from estook.receta r
            join estook.linea_de_receta l on l.receta_id = r.id
           where r.plato_id = b.plato_id
         )
       group by b.plato_id, p.nombre
       order by sum(b.cantidad) desc, p.nombre
    `;
    return {
      desde,
      platos: filas.map((f) => ({ platoId: f.plato_id, nombre: f.nombre, uds: f.uds })),
      uds: filas.reduce((s, f) => s + f.uds, 0),
    };
  },
});
