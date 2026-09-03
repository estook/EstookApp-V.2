import { z } from 'zod';
import { ajusteHasta, cantidad } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  apuntar,
  costeDeUso,
  elProductoBloqueado,
  loQueHay,
  type FichaBasica,
} from '../inventario.ts';

/**
 * Mover género (M6) · apuntar lo que entra, lo que sale y lo que hay.
 *
 * Los tres comandos de este fichero son las tres preguntas que se hacen delante
 * de una cámara, y **ninguno de los tres se llama «crear movimiento»**:
 *
 *   apuntar_entrada   «Ha llegado género»
 *   apuntar_salida    «Se ha sacado género»
 *   ajustar_stock     «Ajustar lo que hay en cámara»
 *
 * «La aplicación no pregunta *¿qué tabla quieres modificar?*. Pregunta *¿qué
 *  quieres hacer?*» (Evolución 1.0, capítulo 14). En esa misma tabla, «editar
 *  movimiento de inventario» está en la columna de «nunca» y «ajustar lo que hay
 *  en cámara» en la de «siempre».
 *
 * Por debajo los tres hacen lo mismo, y lo hacen en un solo sitio: `apuntar`, de
 * `../inventario.ts`. Aquí solo se traduce la pregunta de la pantalla a una
 * línea del libro.
 */

// ── Cuánto ha entrado, y cómo se dice ────────────────────────────────────────

/**
 * Las dos formas de decir una cantidad, y por qué hacen falta las dos.
 *
 * Quien recibe un pedido cuenta **cajas**: «han venido tres sacos». Quien saca
 * género de la cámara cuenta **lo que usa**: «he sacado 800 gramos». Obligar a
 * las dos personas a hacer la conversión mental es pedirles que se equivoquen,
 * y confundir la unidad de compra con la de uso es, según la Auditoría, «la
 * primera causa de escandallos falsos».
 *
 * Así que se dice cuál de las dos se está usando y **convierte el servidor**,
 * con el factor del producto. «La conversión se hace al entrar y al salir, nunca
 * por dentro» (Auditoría, parte 7).
 */
const comoSeCuenta = z.enum(['formatos', 'unidades_de_uso']);

function aUnidadesDeUso(
  producto: FichaBasica,
  cuanto: number,
  como: z.infer<typeof comoSeCuenta>,
): number {
  if (como === 'unidades_de_uso') return cuanto;

  // «Pescado a peso variable: **se pide en piezas y entra en kilos reales**»
  // (Manifiesto 29). Multiplicar dos cajas de merluza por el factor daría un
  // peso inventado, y ese número acabaría costeando platos. Se rechaza aquí
  // además de esconderlo en la pantalla, porque esconder no es proteger.
  if (producto.pesoVariable) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['cuanto'],
      porque: `«${producto.nombre}» va a peso variable, así que dime cuánto ha venido de verdad, no cuántas cajas.`,
    });
  }

  return cuanto * producto.factor;
}

// ── Ha llegado género ────────────────────────────────────────────────────────

export const entradaApuntarEntrada = z
  .object({
    producto_id: z.string().uuid(),
    cuanto: z.number().positive().max(10_000_000),
    como: comoSeCuenta.optional(),
    /**
     * Lo que ha costado el formato en **esta** entrada, en céntimos. Nulo = el
     * precio que ya tuviera puesto. Es lo que hace que el precio medio ponderado
     * se mueva de verdad, y no cuando alguien edita una lista de precios.
     */
    precio_centimos: z.number().int().min(0).max(100_000_000).nullable().optional(),
    lote: z.string().trim().max(64).nullable().optional(),
    caduca_el: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.')
      .nullable()
      .optional(),
    motivo: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type EntradaApuntarEntrada = z.infer<typeof entradaApuntarEntrada>;

export interface SalidaDeMovimiento {
  readonly movimientoId: string;
  readonly cantidad: number;
  readonly costeMilesimas: number;
  readonly unidadDeUso: string;
  readonly fechaOperativa: string;
}

/** El precio vigente del producto, para valorar una entrada que no trae el suyo. */
async function costeVigente(contexto: Contexto, productoId: string): Promise<number | null> {
  const filas = await contexto.sql<{ coste_milesimas: string }[]>`
    select coste_milesimas::text as coste_milesimas
      from estook.precio_vigente(${productoId}::uuid)
     where id is not null
  `;
  const fila = filas[0];
  return fila === undefined ? null : Number(fila.coste_milesimas);
}

export const apuntarEntrada = comando<EntradaApuntarEntrada, SalidaDeMovimiento>({
  nombre: 'apuntar_entrada',
  entrada: entradaApuntarEntrada,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    // Se deja apuntar sobre un producto de ejemplo a propósito: sirve para ver
    // cómo funciona antes de meter género de verdad. Lo que no puede pasar es
    // que ese movimiento cuente como real, y por eso hereda la marca de ejemplo.
    const producto = await elProductoBloqueado(contexto, entrada.producto_id);

    if ((entrada.como ?? 'formatos') === 'formatos' && producto.factor <= 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['factor'],
        porque: 'Este producto no tiene formato de compra, así que dime cuánto ha entrado.',
      });
    }

    const cuanto = aUnidadesDeUso(producto, entrada.cuanto, entrada.como ?? 'formatos');

    // El coste de **esta** entrada. Si trae precio, se usa ese; si no, el
    // vigente. Y si no hay ninguno, entra sin valorar: «un producto sin precio
    // se usa igual, cuenta cero y queda marcado».
    // La cuenta la hace `costeDeUso`, que es el único dueño de
    // `precio ÷ (factor × rendimiento)`. Aquí estuvo escrita a mano un rato, y
    // **la cazó la regla de lint de M0**: eran dos sitios haciendo la misma
    // cuenta, que es justo lo que la regla 6 prohíbe.
    const coste =
      entrada.precio_centimos === null || entrada.precio_centimos === undefined
        ? await costeVigente(contexto, producto.id)
        : costeDeUso(entrada.precio_centimos, producto.factor, producto.rendimiento);

    // El lote, solo si trae algo que apuntar. Un lote vacío en cada entrada
    // llenaría la pantalla de caducidades de nada.
    let loteId: string | null = null;
    const traeLote =
      (entrada.lote !== null && entrada.lote !== undefined && entrada.lote !== '') ||
      (entrada.caduca_el !== null && entrada.caduca_el !== undefined);

    if (traeLote) {
      const lotes = await contexto.sql<{ id: string }[]>`
        insert into estook.lote (local_id, producto_id, codigo, caduca_el, recibido_el, es_ejemplo)
        values (
          ${producto.localId}, ${producto.id}, ${entrada.lote ?? null},
          ${entrada.caduca_el ?? null}::date, current_date, ${producto.esEjemplo}
        )
        returning id
      `;
      loteId = lotes[0]?.id ?? null;
    }

    const apuntado = await apuntar(contexto, producto, {
      tipo: 'entrada',
      cantidad: cuanto,
      costeMilesimas: coste,
      loteId,
      motivo: entrada.motivo ?? null,
      origen: 'a_mano',
      esEjemplo: producto.esEjemplo,
    });

    // Sin evento, y está razonado en el catálogo: en un servicio normal esto
    // pasa decenas de veces al día y no dispara ninguna cascada. Lo que la
    // dispara es el precio.
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'crear', 'movimiento_de_stock',
        ${apuntado.movimientoId}, ${producto.localId}::uuid, null,
        ${JSON.stringify({ tipo: 'entrada', cantidad: cuanto, producto: producto.nombre })}::jsonb,
        null
      )
    `;

    return {
      movimientoId: apuntado.movimientoId,
      cantidad: apuntado.despues.cantidad,
      costeMilesimas: apuntado.despues.coste,
      unidadDeUso: producto.unidadDeUso,
      fechaOperativa: apuntado.fechaOperativa,
    };
  },
});

// ── Se ha sacado género ──────────────────────────────────────────────────────

export const entradaApuntarSalida = z
  .object({
    producto_id: z.string().uuid(),
    cuanto: z.number().positive().max(10_000_000),
    como: comoSeCuenta.optional(),
    motivo: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type EntradaApuntarSalida = z.infer<typeof entradaApuntarSalida>;

/**
 * Género que sale y no es ni una venta ni una merma.
 *
 * Un traspaso a otro local, un pedido de un catering, lo que se lleva el jefe.
 * **La merma tiene su propio comando y su lista cerrada de motivos, y es M8**,
 * porque «la comida del personal no es merma, ni las invitaciones: van con
 * motivo propio y como partida aparte, o el food cost miente» (Manifiesto 28), y
 * esa partida aparte no existe hasta que exista el food cost.
 */
export const apuntarSalida = comando<EntradaApuntarSalida, SalidaDeMovimiento>({
  nombre: 'apuntar_salida',
  entrada: entradaApuntarSalida,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const producto = await elProductoBloqueado(contexto, entrada.producto_id);
    const cuanto = aUnidadesDeUso(producto, entrada.cuanto, entrada.como ?? 'unidades_de_uso');

    const apuntado = await apuntar(contexto, producto, {
      tipo: 'salida',
      cantidad: -cuanto,
      motivo: entrada.motivo ?? null,
      origen: 'a_mano',
      esEjemplo: producto.esEjemplo,
    });

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'crear', 'movimiento_de_stock',
        ${apuntado.movimientoId}, ${producto.localId}::uuid, null,
        ${JSON.stringify({ tipo: 'salida', cantidad: -cuanto, producto: producto.nombre })}::jsonb,
        ${entrada.motivo ?? null}
      )
    `;

    return {
      movimientoId: apuntado.movimientoId,
      cantidad: apuntado.despues.cantidad,
      costeMilesimas: apuntado.despues.coste,
      unidadDeUso: producto.unidadDeUso,
      fechaOperativa: apuntado.fechaOperativa,
    };
  },
});

// ── Ajustar lo que hay en cámara ─────────────────────────────────────────────

export const entradaAjustarStock = z
  .object({
    producto_id: z.string().uuid(),
    /** Lo que hay **de verdad**, no la diferencia. En unidades de uso. */
    hay: z.number().min(-10_000_000).max(10_000_000),
    motivo: z.string().trim().min(1).max(400),
  })
  .strict();

export type EntradaAjustarStock = z.infer<typeof entradaAjustarStock>;

export interface SalidaAjustarStock extends SalidaDeMovimiento {
  /** Lo que se ha movido. Cero cuando ya cuadraba y no se apunta nada. */
  readonly diferencia: number;
  readonly yaCuadraba: boolean;
}

/**
 * «Si el jefe de cocina dice que hay 4 kg, hay 4 kg: se apunta el ajuste con
 *  quién y cuándo. **Nunca se bloquea a nadie por cuadrar**» (Manifiesto 12).
 *
 * Tres cosas que hace este comando y que parecen detalles y no lo son:
 *
 *   · Pregunta **cuánto hay**, no cuánto sobra o falta. Es lo que una persona
 *     sabe mirando la cámara. La resta la hace el servidor.
 *   · Exige motivo. Un descuadre sin explicar no se puede investigar después, y
 *     la desviación de M8 se apoya justo en eso.
 *   · Si ya cuadraba, **no apunta nada** y lo dice. Una línea de ajuste de cero
 *     ensucia el libro y no cuenta nada.
 */
export const ajustarStock = comando<EntradaAjustarStock, SalidaAjustarStock>({
  nombre: 'ajustar_stock',
  entrada: entradaAjustarStock,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const producto = await elProductoBloqueado(contexto, entrada.producto_id);
    const antes = await loQueHay(contexto, producto.id);

    const diferencia = ajusteHasta(antes.cantidad, cantidad(entrada.hay));

    if (diferencia === null) {
      return {
        movimientoId: '',
        cantidad: antes.cantidad,
        costeMilesimas: antes.coste,
        unidadDeUso: producto.unidadDeUso,
        fechaOperativa: '',
        diferencia: 0,
        yaCuadraba: true,
      };
    }

    const apuntado = await apuntar(contexto, producto, {
      tipo: 'ajuste',
      cantidad: diferencia,
      motivo: entrada.motivo,
      origen: 'a_mano',
      esEjemplo: producto.esEjemplo,
      referencia: { habia: antes.cantidad, hay: entrada.hay },
    });

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'movimiento_de_stock',
        ${apuntado.movimientoId}, ${producto.localId}::uuid,
        ${JSON.stringify({ cantidad: antes.cantidad })}::jsonb,
        ${JSON.stringify({ cantidad: entrada.hay, producto: producto.nombre })}::jsonb,
        ${entrada.motivo}
      )
    `;

    // Este sí publica evento, y los de entrada y salida no. La diferencia es que
    // «la diferencia entra en la desviación del periodo con su causa»
    // (Auditoría 2.5): un ajuste es género que ha aparecido o desaparecido sin
    // que nadie sepa por dónde, y eso es exactamente lo que M8 tiene que
    // explicar.
    await publicar(contexto.sql, {
      tipo: 'stock.ajustado',
      organizacionId: laOrganizacionDeLaSesion(contexto),
      localId: producto.localId,
      datos: {
        productoId: producto.id,
        nombre: producto.nombre,
        diferencia,
        motivo: entrada.motivo,
      },
      correlacionId: contexto.correlacionId,
    });

    return {
      movimientoId: apuntado.movimientoId,
      cantidad: apuntado.despues.cantidad,
      costeMilesimas: apuntado.despues.coste,
      unidadDeUso: producto.unidadDeUso,
      fechaOperativa: apuntado.fechaOperativa,
      diferencia,
      yaCuadraba: false,
    };
  },
});
