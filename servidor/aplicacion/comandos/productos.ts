import { z } from 'zod';
import { ALERGENOS, UNIDADES_DE_USO, horaDeCorte, jornadaDe } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { apuntar, costeDeUso, elProductoBloqueado } from '../inventario.ts';

/**
 * El producto (M6) · crear, cambiar, desactivar y volver a activar.
 *
 * ── Los treinta segundos ─────────────────────────────────────────────────────
 *
 * «Se da de alta un producto en 30 segundos» es el primer criterio de terminado
 * del módulo. Lo que lo hace posible no es este fichero: es que **la mitad cara
 * ya la hizo M5** con el catálogo de referencia. Escribes «aceite», eliges, y
 * llegan hechos el formato, el factor, la unidad de uso, el rendimiento, la
 * categoría fiscal y los alérgenos. Aquí solo se copia la fila y se le pone el
 * precio.
 *
 * Por eso `crear_producto` acepta un `de_referencia` **y también** todos los
 * campos sueltos: los dos caminos son el mismo comando, porque crear un producto
 * es crear un producto, lo hayas copiado o escrito. Dos comandos serían dos
 * sitios donde arreglar el mismo fallo.
 *
 * ── Y los dos únicos campos obligatorios ─────────────────────────────────────
 *
 * «**Solo dos campos obligatorios: nombre y cantidad**» (Manifiesto 12). Aquí
 * solo hace falta el nombre; la cantidad es un movimiento y ni siquiera hace
 * falta para que el producto exista. Todo lo demás tiene un valor por defecto
 * que se corrige después, porque un formulario de catorce casillas en la puerta
 * es la forma más segura de que nadie dé de alta su segundo producto.
 */

const alergeno = z.enum(ALERGENOS);

export const entradaCrearProducto = z
  .object({
    nombre: z.string().trim().min(1).max(160),
    /** La fila del catálogo de referencia de la que se copia. Nulo = a mano. */
    de_referencia: z.string().uuid().nullable().optional(),
    categoria_id: z.string().uuid().nullable().optional(),
    formato: z.string().trim().max(120).nullable().optional(),
    factor: z.number().positive().max(1_000_000).optional(),
    unidad_de_uso: z.enum(UNIDADES_DE_USO).optional(),
    rendimiento: z.number().positive().max(1).optional(),
    categoria_fiscal: z
      .enum([
        'alimento',
        'bebida_alcoholica',
        'bebida_refrescante',
        'bebida_refrescante_azucarada',
        'otros',
      ])
      .optional(),
    alergenos: z.array(alergeno).max(14).optional(),
    peso_variable: z.boolean().optional(),
    codigo_de_barras: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z-]{4,32}$/, 'Un código de barras son de 4 a 32 cifras o letras.')
      .nullable()
      .optional(),
    minimo: z.number().min(0).nullable().optional(),
    proveedor_id: z.string().uuid().nullable().optional(),
    /** Lo que cuesta el formato, en céntimos enteros. Nulo = todavía sin precio. */
    precio_centimos: z.number().int().min(0).nullable().optional(),
    notas: z.string().trim().max(2000).nullable().optional(),
    /**
     * Cuánto hay ya en cámara, en unidades de uso.
     *
     * ── El agujero que esto tapa, y era gordo ────────────────────────────────
     *
     * «Añades un producto nuevo y debería actualizarse lo que hay.» Y no se
     * actualizaba: `crear_producto` creaba la ficha y **el stock quedaba en
     * cero**, porque el stock es el libro de movimientos y nadie apuntaba nada.
     * Así que había que dar de alta el producto y **acordarse de entrar en su
     * ficha a apuntar una entrada**, dos pantallas para una sola cosa. El
     * resultado real es un inventario con treinta productos a cero, que es un
     * inventario que no sirve para nada.
     *
     * Ahora se pregunta al dar de alta —«¿cuánto hay?»— y el comando **apunta la
     * entrada en el libro**, con su precio si lo trae. No hay un segundo camino
     * para el stock: es el mismo `apuntar` de siempre, así que la cámara sigue
     * siendo exactamente la última línea del libro (regla 8).
     */
    cantidad_inicial: z.number().min(0).max(10_000_000).nullable().optional(),
    /**
     * La caducidad de lo que hay, si la tiene.
     *
     * **La más próxima**, y eso hay que decirlo en la pantalla: si de una cosa hay
     * cinco unidades con cinco fechas, apuntar la que caduca antes es lo que hace
     * que el aviso llegue a tiempo. Las cinco fechas por separado son lotes, y eso
     * se apunta en las entradas de después; pedirlas el primer día es pedirle a
     * alguien que teclee veinte fechas para dar de alta un producto.
     */
    caduca_el: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.')
      .nullable()
      .optional(),
    // ── M7, repaso ───────────────────────────────────────────────────────────
    /** Lo que hay está congelado: se apunta en un lote congelado hoy. */
    congelado: z.boolean().optional(),
    /** El IVA que se paga al comprarlo, si no es el de su categoría. 0,10 es un 10 %. */
    iva_de_compra: z.number().min(0).max(0.3).nullable().optional(),
    /** Lo que trae cada unidad, cuando se cuenta por unidades: 250 (g). */
    contenido_por_unidad: z.number().positive().max(1_000_000).nullable().optional(),
    unidad_del_contenido: z.enum(['g', 'kg', 'ml', 'l']).nullable().optional(),
  })
  .strict()
  .refine(
    (e) =>
      (e.contenido_por_unidad === null || e.contenido_por_unidad === undefined) ===
      (e.unidad_del_contenido === null || e.unidad_del_contenido === undefined),
    {
      message: 'Lo que trae cada unidad va con su medida: 250 g, 1 l.',
      path: ['contenido_por_unidad'],
    },
  );

export type EntradaCrearProducto = z.infer<typeof entradaCrearProducto>;

export interface SalidaCrearProducto {
  readonly productoId: string;
  readonly nombre: string;
  readonly sinVerificar: boolean;
  readonly conPrecio: boolean;
  /** Lo que ha quedado en camara, si se dijo cuanto habia. */
  readonly cantidadInicial: number;
  /** Cuántos ejemplos le quedan al local, para poder ofrecer quitarlos. */
  readonly ejemplosQueQuedan: number;
}

interface Plantilla {
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly rendimiento: number;
  readonly categoriaFiscal: string;
  readonly alergenos: readonly string[];
  readonly categoria: string | null;
  readonly referenciaId: string | null;
  /** El catálogo trae el factor y el rendimiento medidos por alguien, no supuestos. */
  readonly verificable: boolean;
}

const A_MANO: Plantilla = {
  formato: null,
  factor: 1,
  unidadDeUso: 'ud',
  rendimiento: 1,
  categoriaFiscal: 'alimento',
  alergenos: [],
  categoria: null,
  referenciaId: null,
  verificable: false,
};

async function laPlantilla(contexto: Contexto, referenciaId: string | null): Promise<Plantilla> {
  if (referenciaId === null) return A_MANO;

  const filas = await contexto.sql<
    {
      id: string;
      categoria: string;
      formato: string;
      factor: string;
      unidad_de_uso: string;
      rendimiento: string;
      categoria_fiscal: string;
      alergenos: string[];
    }[]
  >`
    select id, categoria, formato, factor::text as factor,
           unidad_de_uso::text as unidad_de_uso, rendimiento::text as rendimiento,
           categoria_fiscal::text as categoria_fiscal, alergenos
      from estook.producto_de_referencia
     where id = ${referenciaId}
  `;

  const fila = filas[0];
  if (!fila) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Esa referencia del catálogo ya no está.',
    });
  }

  return {
    formato: fila.formato,
    factor: Number(fila.factor),
    unidadDeUso: fila.unidad_de_uso,
    rendimiento: Number(fila.rendimiento),
    categoriaFiscal: fila.categoria_fiscal,
    alergenos: fila.alergenos,
    categoria: fila.categoria,
    referenciaId: fila.id,
    verificable: true,
  };
}

/** La categoría del local que se llama igual que la del catálogo, si existe. */
async function categoriaPorNombre(
  contexto: Contexto,
  localId: string,
  nombre: string | null,
): Promise<string | null> {
  if (nombre === null) return null;

  const filas = await contexto.sql<{ id: string }[]>`
    select id from estook.categoria_de_producto
     where local_id = ${localId}
       and activa
       and estook.sin_acentos(nombre) = estook.sin_acentos(${nombre})
     limit 1
  `;
  return filas[0]?.id ?? null;
}

export const crearProducto = comando<EntradaCrearProducto, SalidaCrearProducto>({
  nombre: 'crear_producto',
  entrada: entradaCrearProducto,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const plantilla = await laPlantilla(contexto, entrada.de_referencia ?? null);

    const factor = entrada.factor ?? plantilla.factor;
    const rendimiento = entrada.rendimiento ?? plantilla.rendimiento;
    const unidadDeUso = entrada.unidad_de_uso ?? plantilla.unidadDeUso;
    const formato = entrada.formato ?? plantilla.formato;

    // «Si faltan, se asume factor 1 y rendimiento 1, y el producto queda marcado
    //  como sin verificar, porque un rendimiento mal puesto es el error más caro
    //  del sistema» (Auditoría 1.2). Lo que viene del catálogo tampoco está
    //  verificado por esta cocina: es una propuesta buena, y se dice.
    const sinVerificar = !plantilla.verificable && entrada.rendimiento === undefined;

    const categoriaId =
      entrada.categoria_id ?? (await categoriaPorNombre(contexto, localId, plantilla.categoria));

    const yaEsta = await contexto.sql<{ id: string }[]>`
      select id from estook.producto
       where local_id = ${localId}
         and activo
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
       limit 1
    `;

    if (yaEsta.length > 0) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: `Ya tienes un producto que se llama «${entrada.nombre}». Si es otro distinto, ponle algo que los distinga.`,
      });
    }

    const creados = await contexto.sql<{ id: string }[]>`
      insert into estook.producto (
        local_id, categoria_id, nombre, formato, factor, unidad_de_uso, rendimiento,
        categoria_fiscal, alergenos, peso_variable, codigo_de_barras, minimo,
        proveedor_id, producto_de_referencia_id, sin_verificar, notas,
        iva_de_compra, contenido_por_unidad, unidad_del_contenido
      )
      values (
        ${localId},
        ${categoriaId},
        ${entrada.nombre},
        ${formato},
        ${factor},
        ${unidadDeUso}::estook.unidad_de_uso,
        ${rendimiento},
        ${entrada.categoria_fiscal ?? plantilla.categoriaFiscal}::estook.categoria_fiscal,
        ${entrada.alergenos ?? plantilla.alergenos},
        ${entrada.peso_variable ?? false},
        ${entrada.codigo_de_barras ?? null},
        ${entrada.minimo ?? null},
        ${entrada.proveedor_id ?? null},
        ${plantilla.referenciaId},
        ${sinVerificar},
        ${entrada.notas ?? null},
        ${entrada.iva_de_compra ?? null},
        ${entrada.contenido_por_unidad ?? null},
        ${entrada.unidad_del_contenido ?? null}::estook.unidad_de_uso
      )
      returning id
    `;

    const productoId = creados[0]?.id;
    if (productoId === undefined) throw new FalloDeAplicacion('sin_permiso');

    // El precio, si lo trae. Un producto sin precio se usa igual: «cuenta cero,
    // sale en amarillo en las fichas que lo llevan, y nunca bloquea».
    const conPrecio = entrada.precio_centimos !== null && entrada.precio_centimos !== undefined;

    if (conPrecio) {
      await contexto.sql`
        insert into estook.precio_de_producto (
          producto_id, proveedor_id, precio_centimos, formato, factor, unidad_de_uso,
          rendimiento, coste_milesimas, desde, origen, creado_por
        )
        values (
          ${productoId},
          ${entrada.proveedor_id ?? null},
          ${entrada.precio_centimos ?? 0},
          ${formato},
          ${factor},
          ${unidadDeUso}::estook.unidad_de_uso,
          ${rendimiento},
          ${costeDeUso(entrada.precio_centimos ?? 0, factor, rendimiento)},
          current_date,
          ${plantilla.referenciaId === null ? 'a_mano' : 'catalogo'}::estook.origen_de_precio,
          ${contexto.personaId}
        )
      `;
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'producto', ${productoId},
        ${localId}::uuid, null,
        ${JSON.stringify({ nombre: entrada.nombre, de_referencia: plantilla.referenciaId, sin_verificar: sinVerificar })}::text::jsonb,
        null
      )
    `;

    // ── Y lo que ya hay en cámara ────────────────────────────────────────────
    //
    // **Se apunta en el libro, como cualquier otra entrada.** No hay un segundo
    // camino para el stock: la cámara sigue siendo la última línea del libro
    // (regla 8), y por eso esto se hace con el mismo `apuntar` que usa «ha
    // llegado género». Lo que cambia es solo el origen, que queda como `alta`
    // para poder distinguir después «esto es lo que había el primer día» de «esto
    // llegó en un pedido».
    let cantidadInicial = 0;
    if ((entrada.cantidad_inicial ?? 0) > 0) {
      const producto = await elProductoBloqueado(contexto, productoId);

      // El lote, solo si trae fecha o está congelado. Un lote vacío por cada
      // producto llenaría la pantalla de caducidades de nada; uno congelado es lo
      // que hace que salga en «Congelados» (M7, repaso).
      let loteId: string | null = null;
      const conFecha = entrada.caduca_el !== null && entrada.caduca_el !== undefined;
      // El día lo pone el servidor con la zona y la hora de corte del local, no
      // `current_date`, que es UTC (regla 10): de madrugada fechaba el día de antes.
      const hoy = jornadaDe(
        contexto.ahora,
        producto.zonaHoraria,
        horaDeCorte(producto.horaDeCorte),
      );
      if (conFecha || entrada.congelado === true) {
        const lotes = await contexto.sql<{ id: string }[]>`
          insert into estook.lote (
            local_id, producto_id, caduca_el, recibido_el, congelado_el, es_ejemplo
          )
          values (
            ${localId}, ${productoId}, ${entrada.caduca_el ?? null}::date, ${hoy}::date,
            case when ${entrada.congelado === true} then ${hoy}::date end,
            false
          )
          returning id
        `;
        loteId = lotes[0]?.id ?? null;

        // Su caducidad sale en el Calendario (M7). Lo hace la reacción que escucha
        // esto, no este comando: quien crea un lote no tiene por qué saber quién
        // pinta las caducidades.
        if (loteId !== null) {
          await publicar(contexto.sql, {
            tipo: 'lote.creado',
            organizacionId,
            localId,
            datos: { loteId, productoId, caducaEl: entrada.caduca_el },
            correlacionId: contexto.correlacionId,
          });
        }
      }

      const apuntado = await apuntar(contexto, producto, {
        tipo: 'entrada',
        cantidad: entrada.cantidad_inicial ?? 0,
        // El coste sale del precio que se acaba de poner, con el motor de M2 que
        // es su único dueño. Sin precio entra sin valorar, y eso es correcto: «un
        // producto sin precio se usa igual, cuenta cero y queda marcado».
        costeMilesimas: conPrecio
          ? costeDeUso(entrada.precio_centimos ?? 0, factor, rendimiento)
          : null,
        loteId,
        motivo: 'Lo que había al dar de alta el producto',
        origen: 'alta',
        esEjemplo: false,
      });
      cantidadInicial = apuntado.despues.cantidad;
    }

    await publicar(contexto.sql, {
      tipo: 'producto.creado',
      organizacionId,
      localId,
      datos: { productoId, nombre: entrada.nombre, conPrecio, cantidadInicial },
      correlacionId: contexto.correlacionId,
    });

    // «**Al crear el primer producto de verdad, Estook lo pregunta**»
    // (Manifiesto 8). El comando no decide nada: devuelve cuántos ejemplos
    // quedan, y la pantalla ofrece quitarlos. Borrar por su cuenta lo que
    // alguien está mirando sería un efecto secundario oculto.
    const ejemplos = await contexto.sql<{ contar_ejemplos: number }[]>`
      select estook.contar_ejemplos(${localId}::uuid) as contar_ejemplos
    `;

    return {
      productoId,
      nombre: entrada.nombre,
      sinVerificar,
      conPrecio,
      cantidadInicial,
      ejemplosQueQuedan: ejemplos[0]?.contar_ejemplos ?? 0,
    };
  },
});

// ── Cambiar la ficha ─────────────────────────────────────────────────────────

export const entradaCambiarProducto = z
  .object({
    producto_id: z.string().uuid(),
    nombre: z.string().trim().min(1).max(160),
    categoria_id: z.string().uuid().nullable(),
    formato: z.string().trim().max(120).nullable(),
    factor: z.number().positive().max(1_000_000),
    unidad_de_uso: z.enum(UNIDADES_DE_USO),
    rendimiento: z.number().positive().max(1),
    categoria_fiscal: z.enum([
      'alimento',
      'bebida_alcoholica',
      'bebida_refrescante',
      'bebida_refrescante_azucarada',
      'otros',
    ]),
    alergenos: z.array(alergeno).max(14),
    peso_variable: z.boolean(),
    codigo_de_barras: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z-]{4,32}$/, 'Un código de barras son de 4 a 32 cifras o letras.')
      .nullable(),
    minimo: z.number().min(0).nullable(),
    proveedor_id: z.string().uuid().nullable(),
    notas: z.string().trim().max(2000).nullable(),
    /**
     * Cuando alguien cambia el factor o el rendimiento a mano, deja de ser una
     * suposición: es la medida de esta cocina. Y entonces el producto deja de
     * estar «sin verificar», que es lo que hace que la marca signifique algo.
     */
    verificado: z.boolean().optional(),
    // ── M7, repaso ───────────────────────────────────────────────────────────
    //
    // Estos tres sí son «si no llega, se queda como estaba»: las pantallas de
    // antes no los mandan, y guardar una ficha desde ellas no puede borrárselos a
    // nadie. A nulo, se quitan.
    iva_de_compra: z.number().min(0).max(0.3).nullable().optional(),
    contenido_por_unidad: z.number().positive().max(1_000_000).nullable().optional(),
    unidad_del_contenido: z.enum(['g', 'kg', 'ml', 'l']).nullable().optional(),
  })
  .strict()
  .refine(
    (e) =>
      (e.contenido_por_unidad === undefined) === (e.unidad_del_contenido === undefined) &&
      (e.contenido_por_unidad === null) === (e.unidad_del_contenido === null),
    {
      message: 'Lo que trae cada unidad va con su medida: 250 g, 1 l.',
      path: ['contenido_por_unidad'],
    },
  );

export type EntradaCambiarProducto = z.infer<typeof entradaCambiarProducto>;

export interface SalidaCambiarProducto {
  readonly productoId: string;
  /** Si ha cambiado el factor o el rendimiento, que es lo que multiplica. */
  readonly cambiaElCoste: boolean;
}

/**
 * ── Por qué llega la ficha entera y no los campos sueltos ────────────────────
 *
 * Por lo mismo que `guardar_donde_esta` de M5: un comando que acepta «solo lo
 * que mandes» necesita distinguir «no lo toques» de «bórralo», y eso obliga a
 * componer el `update` con fragmentos condicionales, que **la API de pruebas no
 * admite a propósito**. Un camino escrito así solo funcionaría en producción,
 * que es exactamente el agujero por el que se coló el fallo del despliegue de
 * M4.
 *
 * Además es como funciona la pantalla: la ficha del producto es un formulario y
 * se guarda entero.
 */
export const cambiarProducto = comando<EntradaCambiarProducto, SalidaCambiarProducto>({
  nombre: 'cambiar_producto',
  entrada: entradaCambiarProducto,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const antes = await contexto.sql<
      {
        local_id: string;
        nombre: string;
        factor: string;
        rendimiento: string;
        unidad_de_uso: string;
        con_movimientos: boolean;
      }[]
    >`
      select p.local_id, p.nombre, p.factor::text as factor, p.rendimiento::text as rendimiento,
             p.unidad_de_uso::text as unidad_de_uso,
             exists (
               select 1 from estook.movimiento_de_stock m where m.producto_id = p.id
             ) as con_movimientos
        from estook.producto p where p.id = ${entrada.producto_id}
    `;

    const previo = antes[0];
    if (!previo) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está, o no es de un local que puedas ver.',
      });
    }

    // ── Renombrar a uno que ya existe se dice en cristiano ────────────────────
    //
    // Hay un índice único sobre el nombre de los productos activos de un local,
    // y sin esta comprobación la violación salía como un error de Postgres sin
    // traducir: un **`500` con «se nos ha roto algo por dentro»**, que además de
    // feo es mentira. No se ha roto nada: es que ya hay otro que se llama así.
    //
    // `crear_producto` ya lo decía bien; cambiar no. Lo encontró la prueba de
    // que corregir una errata no borra el resto de la ficha, chocando consigo
    // misma.
    const homonimos = await contexto.sql<{ id: string }[]>`
      select id from estook.producto
       where local_id = ${previo.local_id}
         and activo
         and id <> ${entrada.producto_id}
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
       limit 1
    `;

    if (homonimos.length > 0) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: `Ya tienes otro producto que se llama «${entrada.nombre}». Ponle algo que los distinga.`,
      });
    }

    // ── La unidad no se cambia con género dentro (M7, repaso) ────────────────
    //
    // El libro guarda cantidades, no «kilos» ni «gramos»: si lo que hay son 750
    // y la unidad pasa de g a kg, la cámara diría 750 kg sin que nadie haya
    // apuntado nada. Eso ya se podía hacer, y no avisaba. Lo que se cambia es
    // **cuánto trae** lo que se compra; la unidad en que se cuenta, no.
    if (previo.unidad_de_uso !== entrada.unidad_de_uso && previo.con_movimientos) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['unidad_de_uso'],
        porque: `Lo que hay de «${previo.nombre}» está apuntado en ${previo.unidad_de_uso}, y cambiar la unidad lo contaría mal. Si ahora lo compras de otra forma, cambia cuánto trae, no en qué se cuenta.`,
      });
    }

    const cambiaElCoste =
      Number(previo.factor) !== entrada.factor ||
      Number(previo.rendimiento) !== entrada.rendimiento;
    const cambiaElIva = entrada.iva_de_compra !== undefined;
    const cambiaElContenido = entrada.contenido_por_unidad !== undefined;

    await contexto.sql`
      update estook.producto
         set nombre           = ${entrada.nombre},
             categoria_id     = ${entrada.categoria_id},
             formato          = ${entrada.formato},
             factor           = ${entrada.factor},
             unidad_de_uso    = ${entrada.unidad_de_uso}::estook.unidad_de_uso,
             rendimiento      = ${entrada.rendimiento},
             categoria_fiscal = ${entrada.categoria_fiscal}::estook.categoria_fiscal,
             alergenos        = ${entrada.alergenos},
             peso_variable    = ${entrada.peso_variable},
             codigo_de_barras = ${entrada.codigo_de_barras},
             minimo           = ${entrada.minimo},
             proveedor_id     = ${entrada.proveedor_id},
             notas            = ${entrada.notas},
             iva_de_compra    = case when ${cambiaElIva}
                                     then ${entrada.iva_de_compra ?? null}::numeric
                                     else iva_de_compra end,
             contenido_por_unidad = case when ${cambiaElContenido}
                                         then ${entrada.contenido_por_unidad ?? null}::numeric
                                         else contenido_por_unidad end,
             unidad_del_contenido = case when ${cambiaElContenido}
                                         then ${entrada.unidad_del_contenido ?? null}::estook.unidad_de_uso
                                         else unidad_del_contenido end,
             sin_verificar    = ${entrada.verificado === true ? false : !cambiaElCoste},
             actualizado_en   = now()
       where id = ${entrada.producto_id}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'producto', ${entrada.producto_id},
        ${previo.local_id}::uuid,
        ${JSON.stringify({ nombre: previo.nombre, factor: Number(previo.factor), rendimiento: Number(previo.rendimiento) })}::text::jsonb,
        ${JSON.stringify({ nombre: entrada.nombre, factor: entrada.factor, rendimiento: entrada.rendimiento })}::text::jsonb,
        null
      )
    `;

    // **El rendimiento multiplica** (Auditoría 2.2): pasar el pulpo de 0,80 a
    // 0,65 sube su coste un 23 % de golpe, en todos los platos que lo lleven. Por
    // eso el evento dice si el coste se mueve, y no solo que la ficha cambió.
    await publicar(contexto.sql, {
      tipo: 'producto.cambiado',
      organizacionId,
      localId: previo.local_id,
      datos: {
        productoId: entrada.producto_id,
        cambiaElCoste,
        factor: entrada.factor,
        rendimiento: entrada.rendimiento,
      },
      correlacionId: contexto.correlacionId,
    });

    return { productoId: entrada.producto_id, cambiaElCoste };
  },
});

// ── Desactivar y volver a activar ────────────────────────────────────────────

/**
 * «**Un producto en uso no se borra:** se desactiva y sigue en el histórico»
 * (Manifiesto 28), y «se avisa de en cuántas fichas está antes de desactivar»
 * (Auditoría 2.6).
 *
 * Ese aviso lo da la consulta `un_producto`, que cuenta en cuántas fichas
 * aparece. Hoy son cero siempre, porque las fichas son M9; la cuenta está
 * escrita donde tiene que estar y el día que existan las fichas se llena sola.
 */
export const desactivarProducto = comando<
  { producto_id: string },
  { productoId: string; activo: boolean }
>({
  nombre: 'desactivar_producto',
  entrada: z.object({ producto_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const filas = await contexto.sql<{ local_id: string; nombre: string }[]>`
      update estook.producto
         set activo = false, actualizado_en = now()
       where id = ${entrada.producto_id} and activo
       returning local_id, nombre
    `;

    const fila = filas[0];
    if (!fila) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está, ya estaba desactivado, o no es de un local que puedas ver.',
      });
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'producto', ${entrada.producto_id},
        ${fila.local_id}::uuid,
        ${JSON.stringify({ activo: true })}::text::jsonb,
        ${JSON.stringify({ activo: false })}::text::jsonb,
        null
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'producto.desactivado',
      organizacionId,
      localId: fila.local_id,
      datos: { productoId: entrada.producto_id, nombre: fila.nombre },
      correlacionId: contexto.correlacionId,
    });

    return { productoId: entrada.producto_id, activo: false };
  },
});

export const reactivarProducto = comando<
  { producto_id: string },
  { productoId: string; activo: boolean }
>({
  nombre: 'reactivar_producto',
  entrada: z.object({ producto_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const filas = await contexto.sql<{ local_id: string }[]>`
      update estook.producto
         set activo = true, actualizado_en = now()
       where id = ${entrada.producto_id} and not activo
       returning local_id
    `;

    const fila = filas[0];
    if (!fila) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está, ya estaba activo, o no es de un local que puedas ver.',
      });
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'producto', ${entrada.producto_id},
        ${fila.local_id}::uuid,
        ${JSON.stringify({ activo: false })}::text::jsonb,
        ${JSON.stringify({ activo: true })}::text::jsonb,
        null
      )
    `;

    return { productoId: entrada.producto_id, activo: true };
  },
});
