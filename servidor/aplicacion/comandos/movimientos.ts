import { z } from 'zod';
import {
  MOTIVOS_DE_SALIDA,
  QUE_ES_CADA_SALIDA,
  QUE_HAGO_CON_LO_QUE_FALTA,
  ZONAS,
  ajusteHasta,
  cantidad,
  esMerma,
  horaDeCorte,
  jornadaDe,
  type MotivoDeSalida,
} from '@estook/dominio';
import { comoLista } from '../listas.ts';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import {
  apuntar,
  costeDeUso,
  elProductoBloqueado,
  loQueHay,
  type FichaBasica,
} from '../almacen.ts';

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
 * `../almacen.ts`. Aquí solo se traduce la pregunta de la pantalla a una
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
  exige: 'app.almacen',

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

      // La entrada no publica evento, pero **un lote con fecha sí**: su caducidad
      // sale en el Calendario (M7), y eso lo hace la reacción que escucha esto.
      if (loteId !== null && entrada.caduca_el !== null && entrada.caduca_el !== undefined) {
        await publicar(contexto.sql, {
          tipo: 'lote.creado',
          organizacionId: laOrganizacionDeLaSesion(contexto),
          localId: producto.localId,
          datos: { loteId, productoId: producto.id, caducaEl: entrada.caduca_el },
          correlacionId: contexto.correlacionId,
        });
      }
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
        ${JSON.stringify({ tipo: 'entrada', cantidad: cuanto, producto: producto.nombre })}::text::jsonb,
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

/**
 * Los porqués que pasan por aquí.
 *
 * Los que son merma **no**: tienen su propio comando, su lista cerrada de
 * motivos, su partida y su permiso —el de la camarera, que no tiene Almacén—.
 * Se filtran del catálogo en vez de escribirlos otra vez, para que añadir un
 * motivo de merma no obligue a acordarse de este fichero.
 */
const PORQUES_QUE_NO_SON_MERMA = MOTIVOS_DE_SALIDA.filter((motivo) => !esMerma(motivo)) as [
  MotivoDeSalida,
  ...MotivoDeSalida[],
];

export const entradaApuntarSalida = z
  .object({
    producto_id: z.string().uuid(),
    cuanto: z.number().positive().max(10_000_000),
    como: comoSeCuenta.optional(),
    /**
     * Por qué sale, del catálogo cerrado (0034). Sin decir nada es «gastado»,
     * que es lo que hacían todas las salidas antes de que la pregunta existiera.
     */
    por_que: z.enum(PORQUES_QUE_NO_SON_MERMA).optional(),
    motivo: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type EntradaApuntarSalida = z.infer<typeof entradaApuntarSalida>;

/**
 * Género que sale de la cámara y no es merma.
 *
 * ── Vender y gastar dejan de ser el mismo botón ─────────────────────────────
 *
 * Hasta M7 esto era una sola cosa: «ha salido género», con una nota. Y una nota
 * no se puede sumar, así que Estook no sabía si dos kilos de solomillo se habían
 * cocinado o se habían vendido. Son los dos extremos de la misma cuenta: uno es
 * lo que cuesta lo que vendes y el otro es lo que ingresas.
 *
 * Ahora el porqué viene del catálogo de la 0034 y decide **qué línea del libro
 * se apunta**: `venta` cuando se ha cobrado, `salida` cuando no.
 *
 * ── Y aquí no se pregunta cuánto se ha cobrado ──────────────────────────────
 *
 * La 0034 lo preguntaba, y era pedir dos veces el mismo dato. **Lo que se cobra
 * por algo lo dice la carta** (M10), y lo que entró en el día lo dice la caja al
 * cerrarla (0027). Sacar género de la cámara no es el sitio donde se sabe un
 * precio de venta: es el sitio donde se sabe qué ha salido y por qué.
 *
 * Lo que sí queda es **que se vendió**, que es la mitad que faltaba: al cerrar la
 * caja, lo vendido sale propuesto por su nombre y sus unidades, con el importe
 * que ya se sabe de la última vez ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)).
 */
export const apuntarSalida = comando<EntradaApuntarSalida, SalidaDeMovimiento>({
  nombre: 'apuntar_salida',
  entrada: entradaApuntarSalida,
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const producto = await elProductoBloqueado(contexto, entrada.producto_id);
    const cuanto = aUnidadesDeUso(producto, entrada.cuanto, entrada.como ?? 'unidades_de_uso');

    const porQue = entrada.por_que ?? 'gastado';
    const queEs = QUE_ES_CADA_SALIDA[porQue];

    // El motivo que se lee en el libro sale del catálogo, y la nota se le suma
    // detrás. Escribirlo en la pantalla dejaría dos sitios diciendo cómo se
    // llama cada cosa, y un día dirían cosas distintas (regla 6).
    const nota = entrada.motivo ?? null;
    const motivo = nota === null || nota === '' ? queEs.nombre : `${queEs.nombre} · ${nota}`;

    const apuntado = await apuntar(contexto, producto, {
      tipo: queEs.tipo,
      cantidad: -cuanto,
      motivo,
      origen: 'a_mano',
      esEjemplo: producto.esEjemplo,
    });

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'crear', 'movimiento_de_stock',
        ${apuntado.movimientoId}, ${producto.localId}::uuid, null,
        ${JSON.stringify({ tipo: queEs.tipo, cantidad: -cuanto, producto: producto.nombre, porQue })}::text::jsonb,
        ${motivo}
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
  exige: 'app.almacen',

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
        ${JSON.stringify({ cantidad: antes.cantidad })}::text::jsonb,
        ${JSON.stringify({ cantidad: entrada.hay, producto: producto.nombre })}::text::jsonb,
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

// ── El recuento · «hemos hecho inventario, esto es lo que hay» ───────────────

/**
 * La jornada de hoy en el local, que no es la fecha del calendario (regla 10).
 *
 * Lo mismo que hace el cierre de caja en su fichero. Se escribe otra vez aquí y no
 * se importa de allí a propósito: un comando de inventario no depende de uno de
 * servicio, y son cinco líneas que lo único que hacen es preguntarle al motor de
 * tiempo, que sí es el único dueño de la cuenta.
 */
async function laJornadaDeEsteLocal(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');
  return jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte));
}

export const entradaCerrarRecuento = z
  .object({
    /**
     * Lo contado, producto a producto. Doscientos como mucho por vuelta: un
     * recuento de trescientos productos se manda en dos, y así ninguna petición
     * se queda a medias por tardar demasiado.
     */
    lineas: z
      .array(
        z
          .object({
            producto_id: z.string().uuid(),
            /** Lo que hay **de verdad**, no la diferencia. Cero vale. */
            hay: z.number().min(0).max(10_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    /** Qué hacer con lo que no se ha contado. Por defecto, dejarlo. */
    lo_que_falta: z.enum(QUE_HAGO_CON_LO_QUE_FALTA).optional(),
    /** De qué zona era el recuento, cuando se ha contado solo una. */
    zona: z.enum(ZONAS).nullable().optional(),
    notas: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type EntradaCerrarRecuento = z.infer<typeof entradaCerrarRecuento>;

export interface SalidaCerrarRecuento {
  readonly fechaOperativa: string;
  /** Cuántos productos se han tocado de verdad: los que no cuadraban. */
  readonly corregidos: number;
  /** Cuántos ya cuadraban. No se apunta nada de ellos: un cero no es un movimiento. */
  readonly yaCuadraban: number;
  /** Cuántos se han puesto a cero por no estar en la lista. */
  readonly vaciados: number;
  /** Lo que más bailaba, para poder mirarlo. Los diez primeros. */
  readonly loQueMasBaila: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly decia: number;
    readonly hay: number;
    readonly unidadDeUso: string;
  }[];
}

/**
 * Cerrar un recuento.
 *
 * ── Por qué esto no es «apuntar cien ajustes» ───────────────────────────────
 *
 * Porque un recuento es **un acto**, no cien. Todas sus líneas comparten la misma
 * correlación —la que ya lleva cada petición desde M2—, así que el libro puede
 * contestar «esto se apuntó en el recuento del martes» sin una tabla nueva y sin
 * un identificador inventado. Y por eso el tipo de movimiento es `recuento` y no
 * `ajuste`: un ajuste es una cámara que no cuadraba y alguien corrigió; un
 * recuento es la cámara entera contada a mano.
 *
 * ── Y por qué no pone a cero lo que no se ha contado ────────────────────────
 *
 * Porque contar la cámara el martes y el almacén el jueves es lo normal, y si el
 * primero borrase el segundo no se podría hacer inventario por partes. Se puede
 * pedir —hay locales que cuentan todo de una vez— y entonces se dice **antes**
 * cuántos productos se van a vaciar.
 *
 * ── El permiso ─────────────────────────────────────────────────────────────
 *
 * `accion.cerrar_recuento`, que está en la matriz desde M1 y **no tenía dónde
 * usarse**: un permiso sin pantalla es una promesa rota, y esta llevaba siete
 * módulos rota.
 */
export const cerrarRecuento = comando<EntradaCerrarRecuento, SalidaCerrarRecuento>({
  nombre: 'cerrar_recuento',
  entrada: entradaCerrarRecuento,
  exige: 'accion.cerrar_recuento',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const loQueFalta = entrada.lo_que_falta ?? 'dejarlo';

    const baila: {
      productoId: string;
      producto: string;
      decia: number;
      hay: number;
      unidadDeUso: string;
    }[] = [];
    let corregidos = 0;
    let yaCuadraban = 0;

    // De una en una y en orden, que es como se apunta en un libro. El candado de
    // `apuntar` es por producto (`pg_advisory_xact_lock`), así que dos personas
    // contando a la vez no se pisan.
    for (const linea of entrada.lineas) {
      const producto = await elProductoBloqueado(contexto, linea.producto_id);
      if (producto.localId !== localId) {
        throw new FalloDeAplicacion('local_ajeno', {
          porque: `«${producto.nombre}» no es de este local.`,
        });
      }

      const hayAhora = await loQueHay(contexto, producto.id);
      const diferencia = ajusteHasta(cantidad(hayAhora.cantidad), cantidad(linea.hay));

      if (diferencia === null) {
        yaCuadraban += 1;
        continue;
      }

      await apuntar(contexto, producto, {
        tipo: 'recuento',
        cantidad: diferencia,
        motivo: entrada.notas ?? 'Inventario',
        origen: 'a_mano',
        esEjemplo: producto.esEjemplo,
      });

      corregidos += 1;
      baila.push({
        productoId: producto.id,
        producto: producto.nombre,
        decia: hayAhora.cantidad,
        hay: linea.hay,
        unidadDeUso: producto.unidadDeUso,
      });
    }

    // ── Y lo que no se ha contado, si se ha pedido vaciarlo ─────────────────
    let vaciados = 0;
    if (loQueFalta === 'a_cero') {
      const contados = entrada.lineas.map((l) => l.producto_id);
      const sobrantes = await contexto.sql<{ id: string }[]>`
        select p.id::text as id
          from estook.producto p
          join estook.existencias e on e.producto_id = p.id
         where p.local_id = ${localId}
           and p.activo
           and not p.es_ejemplo
           and e.cantidad <> 0
           and (${entrada.zona ?? null}::text is null
                or p.zona::text = ${entrada.zona ?? null}::text)
           and not (p.id = any (${comoLista(contados)}::text::uuid[]))
         limit 500
      `;

      for (const fila of sobrantes) {
        const producto = await elProductoBloqueado(contexto, fila.id);
        const hayAhora = await loQueHay(contexto, producto.id);
        const diferencia = ajusteHasta(cantidad(hayAhora.cantidad), cantidad(0));
        if (diferencia === null) continue;

        await apuntar(contexto, producto, {
          tipo: 'recuento',
          cantidad: diferencia,
          motivo: 'Inventario · no estaba en lo contado',
          origen: 'a_mano',
          esEjemplo: producto.esEjemplo,
        });
        vaciados += 1;
      }
    }

    const fechaOperativa = await laJornadaDeEsteLocal(contexto, localId);

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'recuento', ${contexto.correlacionId},
        ${localId}::uuid, null,
        ${JSON.stringify({ contados: entrada.lineas.length, corregidos, vaciados, zona: entrada.zona ?? null })}::text::jsonb,
        ${entrada.notas ?? null}
      )
    `;

    // Lo que escucha esto: la previsión de cada producto corregido, el valor de la
    // cámara y —cuando llegue M8— la desviación del periodo, que es para lo que
    // se cuenta de verdad.
    await publicar(contexto.sql, {
      tipo: 'inventario.recontado',
      organizacionId,
      localId,
      datos: {
        fechaOperativa,
        contados: entrada.lineas.length,
        corregidos,
        vaciados,
        zona: entrada.zona ?? null,
      },
      correlacionId: contexto.correlacionId,
    });

    return {
      fechaOperativa,
      corregidos,
      yaCuadraban,
      vaciados,
      // Los diez que más bailan, de mayor a menor. Es lo que se mira después de
      // contar: no los cien que cuadraban, los cinco que no.
      loQueMasBaila: baila
        .slice()
        .sort((a, b) => Math.abs(b.hay - b.decia) - Math.abs(a.hay - a.decia))
        .slice(0, 10),
    };
  },
});
