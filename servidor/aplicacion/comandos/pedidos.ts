import { z } from 'zod';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import {
  CANALES_DE_PEDIDO,
  elPedidoBloqueado,
  elProveedor,
  elRelojDelLocal,
  estaAbierto,
  loQuePuedeConLosPrecios,
  precioEsperado,
  siguienteNumeroDePedido,
  suProximoReparto,
  yaEstaCerrado,
} from '../compras.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { productosDelProveedor } from '../consultas/inventario.ts';

/**
 * Los pedidos (M7) · `borrador → enviado → recibido | cancelado`.
 *
 * Cuatro comandos, y otra vez **ninguno se llama «crear registro»**: hacer un
 * pedido, cambiarlo, mandarlo y cancelarlo, que son las cuatro cosas que se hacen
 * con un pedido. Recibirlo es otro fichero, porque recibir no es cambiar un
 * pedido: es apuntar un albarán, que es lo único que mueve género.
 *
 * ── Quién hace qué ───────────────────────────────────────────────────────────
 *
 * Hacer y cambiar un borrador es de Inventario: el cocinero sabe lo que falta.
 * **Mandarlo, o cancelar uno mandado, pide `accion.enviar_pedidos`**, porque
 * compromete dinero del local (0031_compras, parte B).
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.');

const lineaDePedido = z
  .object({
    producto_id: z.string().uuid(),
    /** En formatos: cajas, garrafas, sacos. Se pide como se compra. */
    cantidad: z.number().positive().max(100_000),
    /** Por formato, sin impuestos. Solo quien ve precios lo manda. */
    precio_centimos: z.number().int().min(0).max(100_000_000).nullable().optional(),
    nota: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

type LineaDePedido = z.infer<typeof lineaDePedido>;

interface LineaLista {
  readonly productoId: string;
  readonly cantidad: number;
  readonly formato: string | null;
  readonly factor: number;
  readonly precioCentimos: number | null;
  readonly nota: string | null;
}

/**
 * Deja las líneas listas para guardar: del local, activas, sin repetir y con su
 * precio esperado.
 *
 * «¿Qué pasa si el mismo producto entra dos veces?» · «**Se suman las cantidades**
 * y se avisa, no se duplica la línea» (Auditoría, parte 7).
 *
 * El precio lo pone quien ve precios; a quien no, se le pone el esperado
 * —lo pactado, o lo último que cobró ese proveedor— y se le guarda el que ya
 * tenía la línea si ya estaba. **Nunca se le deja escribir uno**: se le dice.
 */
async function prepararLineas(
  contexto: Contexto,
  localId: string,
  proveedorId: string,
  lineas: readonly LineaDePedido[],
  puedeConPrecios: boolean,
  preciosDeAntes: ReadonlyMap<string, number | null> = new Map(),
): Promise<LineaLista[]> {
  const juntas = new Map<string, LineaDePedido>();
  for (const linea of lineas) {
    if (!puedeConPrecios && linea.precio_centimos !== undefined && linea.precio_centimos !== null) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque:
          'Tu acceso no ve precios de compra, así que el precio de un pedido lo pone quien los ve.',
      });
    }
    const antes = juntas.get(linea.producto_id);
    juntas.set(
      linea.producto_id,
      antes === undefined
        ? linea
        : {
            ...antes,
            cantidad: antes.cantidad + linea.cantidad,
            ...(linea.precio_centimos === undefined
              ? {}
              : { precio_centimos: linea.precio_centimos }),
          },
    );
  }

  const listas: LineaLista[] = [];
  for (const linea of juntas.values()) {
    const productos = await contexto.sql<
      {
        local_id: string;
        nombre: string;
        activo: boolean;
        formato: string | null;
        factor: string;
      }[]
    >`
      select local_id, nombre, activo, formato, factor::text as factor
        from estook.producto where id = ${linea.producto_id}
    `;
    const producto = productos[0];
    if (!producto || producto.local_id !== localId) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Uno de los productos no está, o no es de este local.',
      });
    }
    if (!producto.activo) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: `«${producto.nombre}» está desactivado: vuelve a activarlo para poder pedirlo.`,
      });
    }

    const precio =
      puedeConPrecios && linea.precio_centimos !== undefined
        ? linea.precio_centimos
        : preciosDeAntes.has(linea.producto_id)
          ? (preciosDeAntes.get(linea.producto_id) ?? null)
          : await precioEsperado(contexto, linea.producto_id, proveedorId);

    listas.push({
      productoId: linea.producto_id,
      cantidad: linea.cantidad,
      formato: producto.formato,
      factor: Number(producto.factor),
      precioCentimos: precio,
      nota: linea.nota ?? null,
    });
  }

  return listas;
}

async function guardarLineas(contexto: Contexto, pedidoId: string, lineas: readonly LineaLista[]) {
  let orden = 0;
  for (const linea of lineas) {
    await contexto.sql`
      insert into estook.linea_de_pedido (
        pedido_id, producto_id, cantidad, formato, factor, precio_centimos, nota, orden
      )
      values (
        ${pedidoId}, ${linea.productoId}, ${linea.cantidad}, ${linea.formato}, ${linea.factor},
        ${linea.precioCentimos}, ${linea.nota}, ${orden}
      )
    `;
    orden += 1;
  }
}

// ── Hacer un pedido ──────────────────────────────────────────────────────────

export const entradaCrearPedido = z
  .object({
    proveedor_id: z.string().uuid(),
    lineas: z.array(lineaDePedido).max(200).optional(),
    /**
     * Empezar por lo que sugiere Estook: lo de este proveedor que no llega al
     * reparto de después, en cajas enteras. Es la capa inteligente de M7 puesta
     * en el botón que más se pulsa.
     */
    con_la_sugerencia: z.boolean().optional(),
    llega_el: fecha.nullable().optional(),
    notas: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export type EntradaCrearPedido = z.infer<typeof entradaCrearPedido>;

export const crearPedido = comando<
  EntradaCrearPedido,
  { pedidoId: string; numero: number; lineas: number; llegaEl: string | null }
>({
  nombre: 'crear_pedido',
  entrada: entradaCrearPedido,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const proveedor = await elProveedor(contexto, entrada.proveedor_id);

    if (proveedor.localId !== localId) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese proveedor no es de este local.' });
    }
    if (!proveedor.activo) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: `${proveedor.nombre} está desactivado: vuelve a activarlo para pedirle.`,
      });
    }

    const precios = await loQuePuedeConLosPrecios(contexto, localId);
    const reloj = await elRelojDelLocal(contexto, localId);

    // Lo sugerido primero, y lo que se haya escrito a mano encima: si alguien
    // pone tres cajas de algo que la sugerencia decía dos, mandan las tres.
    const sugeridas: LineaDePedido[] =
      entrada.con_la_sugerencia === true
        ? (await productosDelProveedor(contexto, localId, proveedor.id))
            .filter((p) => p.sugerencia !== null && !p.esEjemplo)
            .map((p) => ({ producto_id: p.id, cantidad: p.sugerencia?.formatos ?? 1 }))
        : [];
    const aMano = new Set((entrada.lineas ?? []).map((l) => l.producto_id));
    const todas = [
      ...sugeridas.filter((l) => !aMano.has(l.producto_id)),
      ...(entrada.lineas ?? []),
    ];

    const lineas = await prepararLineas(contexto, localId, proveedor.id, todas, precios.editar);
    const numero = await siguienteNumeroDePedido(contexto, localId);
    const llegaEl =
      entrada.llega_el === undefined
        ? (suProximoReparto(proveedor, reloj)?.llega ?? null)
        : entrada.llega_el;

    const creados = await contexto.sql<{ id: string }[]>`
      insert into estook.pedido_de_compra (
        local_id, proveedor_id, numero, llega_el, notas, origen, creado_por, es_ejemplo
      )
      values (
        ${localId}, ${proveedor.id}, ${numero}, ${llegaEl}::date, ${entrada.notas ?? null},
        ${entrada.con_la_sugerencia === true ? 'sugerencia' : 'a_mano'}, ${contexto.personaId},
        ${proveedor.esEjemplo}
      )
      returning id
    `;
    const pedidoId = creados[0]?.id;
    if (pedidoId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await guardarLineas(contexto, pedidoId, lineas);

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'pedido_de_compra', ${pedidoId}, ${localId}::uuid, null,
        ${JSON.stringify({ numero, proveedor: proveedor.nombre, lineas: lineas.length })}::text::jsonb,
        null
      )
    `;

    return { pedidoId, numero, lineas: lineas.length, llegaEl };
  },
});

// ── Cambiarlo ────────────────────────────────────────────────────────────────

export const entradaCambiarPedido = z
  .object({
    pedido_id: z.string().uuid(),
    /** Las líneas enteras: lo que no venga, se quita. */
    lineas: z.array(lineaDePedido).max(200),
    llega_el: fecha.nullable().optional(),
    notas: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export type EntradaCambiarPedido = z.infer<typeof entradaCambiarPedido>;

/**
 * Cambiar un pedido abierto: sus líneas, cuándo llega y lo que se le dice.
 *
 * Se puede cambiar uno ya mandado —el proveedor llama y dice que no tiene tomate,
 * o se añade algo por teléfono—, y la pantalla avisa de que hay que decírselo. Su
 * entrega en el Calendario se mueve sola si cambia el día.
 */
export const cambiarPedido = comando<EntradaCambiarPedido, { pedidoId: string; lineas: number }>({
  nombre: 'cambiar_pedido',
  entrada: entradaCambiarPedido,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const pedido = await elPedidoBloqueado(contexto, entrada.pedido_id);
    if (!estaAbierto(pedido.estado)) throw yaEstaCerrado(pedido);

    const precios = await loQuePuedeConLosPrecios(contexto, pedido.localId);

    const deAntes = await contexto.sql<{ producto_id: string; precio: string | null }[]>`
      select producto_id, precio_centimos::text as precio
        from estook.linea_de_pedido where pedido_id = ${pedido.id}
    `;
    const preciosDeAntes = new Map(
      deAntes.map((l) => [l.producto_id, l.precio === null ? null : Number(l.precio)] as const),
    );

    const lineas = await prepararLineas(
      contexto,
      pedido.localId,
      pedido.proveedorId,
      entrada.lineas,
      precios.editar,
      preciosDeAntes,
    );

    await contexto.sql`delete from estook.linea_de_pedido where pedido_id = ${pedido.id}`;
    await guardarLineas(contexto, pedido.id, lineas);

    const llegaEl = entrada.llega_el === undefined ? pedido.llegaEl : entrada.llega_el;
    const notas = entrada.notas === undefined ? pedido.notas : entrada.notas;

    await contexto.sql`
      update estook.pedido_de_compra
         set llega_el = ${llegaEl}::date, notas = ${notas}, actualizado_en = now()
       where id = ${pedido.id}
    `;

    const organizacionId = laOrganizacionDeLaSesion(contexto);
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'pedido_de_compra', ${pedido.id}, ${pedido.localId}::uuid,
        ${JSON.stringify({ lineas: deAntes.length, llega_el: pedido.llegaEl })}::text::jsonb,
        ${JSON.stringify({ lineas: lineas.length, llega_el: llegaEl })}::text::jsonb,
        null
      )
    `;

    if (pedido.estado === 'enviado') {
      await publicar(contexto.sql, {
        tipo: 'pedido.cambiado',
        organizacionId,
        localId: pedido.localId,
        datos: { pedidoId: pedido.id, numero: pedido.numero, llegaEl },
        correlacionId: contexto.correlacionId,
      });
    }

    return { pedidoId: pedido.id, lineas: lineas.length };
  },
});

// ── Mandarlo ─────────────────────────────────────────────────────────────────

export const entradaEnviarPedido = z
  .object({
    pedido_id: z.string().uuid(),
    /** Por dónde ha salido. Estook no lo manda solo: abre WhatsApp o el correo. */
    canal: z.enum(CANALES_DE_PEDIDO),
    llega_el: fecha.nullable().optional(),
  })
  .strict();

export type EntradaEnviarPedido = z.infer<typeof entradaEnviarPedido>;

/**
 * Apuntar que el pedido ha salido, por dónde y cuándo tiene que llegar.
 *
 * **Estook no manda el pedido por su cuenta**: abre WhatsApp o el correo de quien
 * pide con el pedido escrito, y cuando esa persona dice que lo ha mandado, se
 * apunta aquí. Mandarlo otra vez —se reenvía porque no contestan— se puede, y solo
 * cambia por dónde y cuándo.
 */
export const enviarPedido = comando<
  EntradaEnviarPedido,
  { pedidoId: string; numero: number; llegaEl: string | null }
>({
  nombre: 'enviar_pedido',
  entrada: entradaEnviarPedido,
  exige: 'accion.enviar_pedidos',

  async ejecutar(contexto, entrada) {
    const pedido = await elPedidoBloqueado(contexto, entrada.pedido_id);
    if (!estaAbierto(pedido.estado)) throw yaEstaCerrado(pedido);

    const lineas = await contexto.sql<{ cuantas: number }[]>`
      select count(*)::int as cuantas from estook.linea_de_pedido where pedido_id = ${pedido.id}
    `;
    if ((lineas[0]?.cuantas ?? 0) === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['lineas'],
        porque: 'Un pedido sin nada dentro no se manda. Añade lo que quieres pedir.',
      });
    }

    // Un borrador que hizo quien no ve precios se guardó sin ellos. Al mandarlo,
    // quien sí los ve le deja puesto lo que se espera pagar —lo pactado o lo
    // último—, que es con lo que se comparará lo que llegue.
    const precios = await loQuePuedeConLosPrecios(contexto, pedido.localId);
    if (precios.ver) {
      const sinPrecio = await contexto.sql<{ id: string; producto_id: string }[]>`
        select id::text as id, producto_id from estook.linea_de_pedido
         where pedido_id = ${pedido.id} and precio_centimos is null
      `;
      for (const linea of sinPrecio) {
        const esperado = await precioEsperado(contexto, linea.producto_id, pedido.proveedorId);
        if (esperado === null) continue;
        await contexto.sql`
          update estook.linea_de_pedido set precio_centimos = ${esperado}
           where id = ${linea.id}::bigint
        `;
      }
    }

    let llegaEl = entrada.llega_el === undefined ? pedido.llegaEl : entrada.llega_el;
    if (llegaEl === null && entrada.llega_el === undefined) {
      const proveedor = await elProveedor(contexto, pedido.proveedorId);
      const reloj = await elRelojDelLocal(contexto, pedido.localId);
      llegaEl = suProximoReparto(proveedor, reloj)?.llega ?? null;
    }

    await contexto.sql`
      update estook.pedido_de_compra
         set estado = 'enviado',
             enviado_en = now(),
             enviado_por = ${contexto.personaId},
             enviado_por_canal = ${entrada.canal}::estook.canal_de_pedido,
             llega_el = ${llegaEl}::date,
             actualizado_en = now()
       where id = ${pedido.id}
    `;

    const organizacionId = laOrganizacionDeLaSesion(contexto);
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'pedido_de_compra', ${pedido.id}, ${pedido.localId}::uuid,
        ${JSON.stringify({ estado: pedido.estado })}::text::jsonb,
        ${JSON.stringify({ estado: 'enviado', canal: entrada.canal, llega_el: llegaEl })}::text::jsonb,
        null
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'pedido.enviado',
      organizacionId,
      localId: pedido.localId,
      datos: { pedidoId: pedido.id, numero: pedido.numero, canal: entrada.canal, llegaEl },
      correlacionId: contexto.correlacionId,
    });

    return { pedidoId: pedido.id, numero: pedido.numero, llegaEl };
  },
});

// ── Cancelarlo ───────────────────────────────────────────────────────────────

export const entradaCancelarPedido = z
  .object({
    pedido_id: z.string().uuid(),
    motivo: z.string().trim().min(1).max(400),
  })
  .strict();

export type EntradaCancelarPedido = z.infer<typeof entradaCancelarPedido>;

/**
 * Cancelar un pedido. Nada se borra: queda cancelado, con quién, cuándo y por qué.
 *
 * Un borrador lo cancela quien lleva Inventario. **Uno ya mandado, solo quien
 * puede mandar**: el proveedor ya lo está preparando, y cancelarlo es tan serio
 * como mandarlo.
 */
export const cancelarPedido = comando<EntradaCancelarPedido, { pedidoId: string }>({
  nombre: 'cancelar_pedido',
  entrada: entradaCancelarPedido,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const pedido = await elPedidoBloqueado(contexto, entrada.pedido_id);
    if (!estaAbierto(pedido.estado)) throw yaEstaCerrado(pedido);

    if (pedido.estado === 'enviado') {
      const puede = await contexto.sql<{ puede: boolean }[]>`
        select estook.puede_editar('accion.enviar_pedidos', ${pedido.localId}::uuid) as puede
      `;
      if (puede[0]?.puede !== true) {
        throw new FalloDeAplicacion('sin_permiso', {
          porque: 'Ese pedido ya está mandado. Cancelarlo lo hace quien puede mandar pedidos.',
        });
      }
    }

    await contexto.sql`
      update estook.pedido_de_compra
         set estado = 'cancelado',
             cancelado_en = now(),
             cancelado_por = ${contexto.personaId},
             motivo_de_cancelacion = ${entrada.motivo},
             actualizado_en = now()
       where id = ${pedido.id}
    `;

    const organizacionId = laOrganizacionDeLaSesion(contexto);
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'pedido_de_compra', ${pedido.id}, ${pedido.localId}::uuid,
        ${JSON.stringify({ estado: pedido.estado })}::text::jsonb,
        ${JSON.stringify({ estado: 'cancelado' })}::text::jsonb,
        ${entrada.motivo}
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'pedido.cancelado',
      organizacionId,
      localId: pedido.localId,
      datos: {
        pedidoId: pedido.id,
        numero: pedido.numero,
        estabaMandado: pedido.estado === 'enviado',
      },
      correlacionId: contexto.correlacionId,
    });

    return { pedidoId: pedido.id };
  },
});
