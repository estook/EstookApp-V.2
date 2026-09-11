import { z } from 'zod';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { CANALES_DE_PEDIDO, FORMAS_DE_PAGO, loQuePuedeConLosPrecios } from '../compras.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';

/**
 * Proveedores · la ficha entera (M6 la dejó corta; M7 la completa).
 *
 * «Ficha con CIF, teléfono, correo, web, días de reparto, pedido mínimo, forma de
 *  pago y notas. Botones grandes: WhatsApp con el pedido escrito, llamar, correo,
 *  web» (Manifiesto 12).
 *
 * M6 dejó aquí lo mínimo para que cada precio supiera de quién venía. Lo que
 * añade M7 es **lo que decide cuándo y cómo se pide**: los días de reparto con
 * su plazo y su hora límite —de los que salen la sugerencia y las entregas del
 * Calendario—, a quién se le manda el pedido, y el mínimo con sus portes.
 *
 * ── El pedido mínimo y los portes son dinero ─────────────────────────────────
 *
 * Un cocinero puede dar de alta un proveedor y apuntarle los días de reparto,
 * que es lo que sabe. **El mínimo y los portes, no**: son importes, y a quien no
 * ve precios ni se los enseñamos ni se los dejamos poner.
 */

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora se escribe así: 20:00.');

const textoCorto = (largo: number) => z.string().trim().max(largo).nullable().optional();

/** Lo que se puede decir de un proveedor además de su nombre. Todo opcional. */
const ficha = {
  cif: textoCorto(20),
  contacto: textoCorto(120),
  telefono: textoCorto(30),
  whatsapp: textoCorto(30),
  correo: z
    .string()
    .trim()
    .email('Ese correo no tiene forma de correo.')
    .max(200)
    .nullable()
    .optional(),
  web: textoCorto(300),
  como_se_pide: z.enum(CANALES_DE_PEDIDO).nullable().optional(),
  dias_de_reparto: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  plazo_de_entrega: z.number().int().min(0).max(30).optional(),
  hora_limite: hora.nullable().optional(),
  pedido_minimo_centimos: z.number().int().min(0).max(100_000_000).nullable().optional(),
  portes_centimos: z.number().int().min(0).max(10_000_000).nullable().optional(),
  forma_de_pago: z.enum(FORMAS_DE_PAGO).nullable().optional(),
  dias_de_pago: z.number().int().min(0).max(365).nullable().optional(),
};

type Ficha = {
  [clave in keyof typeof ficha]?: z.infer<(typeof ficha)[clave]>;
};

/** La ficha tal cual está guardada, para mezclar con lo que llega. */
interface FichaGuardada {
  cif: string | null;
  contacto: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  web: string | null;
  como_se_pide: string | null;
  dias_de_reparto: number[];
  plazo_de_entrega: number;
  hora_limite: string | null;
  pedido_minimo_centimos: number | null;
  portes_centimos: number | null;
  forma_de_pago: string | null;
  dias_de_pago: number | null;
}

const VACIA: FichaGuardada = {
  cif: null,
  contacto: null,
  telefono: null,
  whatsapp: null,
  correo: null,
  web: null,
  como_se_pide: null,
  dias_de_reparto: [],
  plazo_de_entrega: 1,
  hora_limite: null,
  pedido_minimo_centimos: null,
  portes_centimos: null,
  forma_de_pago: null,
  dias_de_pago: null,
};

/** Un texto vacío es que no se ha dicho: se guarda nulo, no una cadena vacía. */
function limpio(valor: string | null | undefined, antes: string | null): string | null {
  if (valor === undefined) return antes;
  if (valor === null) return null;
  const recortado = valor.trim();
  return recortado === '' ? null : recortado;
}

/**
 * Lo que llega, encima de lo que había.
 *
 * **Lo que no llega se queda como estaba; lo que llega a nulo se borra.** Es lo
 * que permite que la pantalla corta de M6 —nombre, notas y el interruptor— siga
 * guardando sin borrarle a nadie los días de reparto que puso otra pantalla.
 */
function mezclar(entrada: Ficha, antes: FichaGuardada): FichaGuardada {
  const dias =
    entrada.dias_de_reparto === undefined
      ? antes.dias_de_reparto
      : [...new Set(entrada.dias_de_reparto)].sort((a, b) => a - b);

  return {
    // El CIF en mayúsculas y sin espacios ni guiones: «b-12 345 678» y
    // «B12345678» son el mismo, y así se escriben en una factura.
    cif:
      entrada.cif === undefined
        ? antes.cif
        : (limpio(entrada.cif, null)
            ?.toUpperCase()
            .replace(/[\s.-]/g, '') ?? null),
    contacto: limpio(entrada.contacto, antes.contacto),
    telefono: limpio(entrada.telefono, antes.telefono),
    whatsapp: limpio(entrada.whatsapp, antes.whatsapp),
    correo: limpio(entrada.correo, antes.correo),
    web: limpio(entrada.web, antes.web),
    como_se_pide: entrada.como_se_pide === undefined ? antes.como_se_pide : entrada.como_se_pide,
    dias_de_reparto: dias,
    plazo_de_entrega: entrada.plazo_de_entrega ?? antes.plazo_de_entrega,
    hora_limite: entrada.hora_limite === undefined ? antes.hora_limite : entrada.hora_limite,
    pedido_minimo_centimos:
      entrada.pedido_minimo_centimos === undefined
        ? antes.pedido_minimo_centimos
        : entrada.pedido_minimo_centimos,
    portes_centimos:
      entrada.portes_centimos === undefined ? antes.portes_centimos : entrada.portes_centimos,
    forma_de_pago:
      entrada.forma_de_pago === undefined ? antes.forma_de_pago : entrada.forma_de_pago,
    dias_de_pago: entrada.dias_de_pago === undefined ? antes.dias_de_pago : entrada.dias_de_pago,
  };
}

/**
 * Quien no ve precios no pone importes. Se dice, no se ignora en silencio:
 * guardar la ficha sin el mínimo y responder «guardado» sería mentir.
 */
async function comprobarElDinero(contexto: Contexto, localId: string, entrada: Ficha) {
  const traeDinero =
    entrada.pedido_minimo_centimos !== undefined || entrada.portes_centimos !== undefined;
  if (!traeDinero) return;
  const precios = await loQuePuedeConLosPrecios(contexto, localId);
  if (!precios.editar) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'El pedido mínimo y los portes son importes, y tu acceso no ve precios de compra.',
    });
  }
}

export const entradaCrearProveedor = z
  .object({
    nombre: z.string().trim().min(1).max(160),
    notas: z.string().trim().max(2000).nullable().optional(),
    ...ficha,
  })
  .strict();

export type EntradaCrearProveedor = z.infer<typeof entradaCrearProveedor>;

export const crearProveedor = comando<
  EntradaCrearProveedor,
  { proveedorId: string; nombre: string; yaExistia: boolean }
>({
  nombre: 'crear_proveedor',
  entrada: entradaCrearProveedor,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // «Crear desde un desplegable devuelve al sitio con lo creado seleccionado»
    // (Auditoría, parte 3), y para eso hace falta que crear el que ya existe
    // devuelva el que ya existe en vez de un error. Quien está dando de alta un
    // producto no quiere que le cuenten su historia de proveedores duplicados.
    const yaEsta = await contexto.sql<{ id: string; nombre: string; activo: boolean }[]>`
      select id, nombre, activo from estook.proveedor
       where local_id = ${localId}
         and estook.sin_acentos(nombre) = estook.sin_acentos(${entrada.nombre})
       limit 1
    `;

    const existente = yaEsta[0];
    if (existente) {
      if (!existente.activo) {
        await contexto.sql`
          update estook.proveedor set activo = true, actualizado_en = now()
           where id = ${existente.id}
        `;
        await publicar(contexto.sql, {
          tipo: 'proveedor.cambiado',
          organizacionId,
          localId,
          datos: { proveedorId: existente.id, que: 'reactivado' },
          correlacionId: contexto.correlacionId,
        });
      }
      return { proveedorId: existente.id, nombre: existente.nombre, yaExistia: true };
    }

    await comprobarElDinero(contexto, localId, entrada);
    const f = mezclar(entrada, VACIA);

    const creados = await contexto.sql<{ id: string }[]>`
      insert into estook.proveedor (
        local_id, nombre, notas, cif, contacto, telefono, whatsapp, correo, web,
        como_se_pide, dias_de_reparto, plazo_de_entrega, hora_limite,
        pedido_minimo_centimos, portes_centimos, forma_de_pago, dias_de_pago
      )
      values (
        ${localId}, ${entrada.nombre}, ${entrada.notas ?? null}, ${f.cif}, ${f.contacto},
        ${f.telefono}, ${f.whatsapp}, ${f.correo}, ${f.web},
        ${f.como_se_pide}::estook.canal_de_pedido, ${comoLista(f.dias_de_reparto)}::text::smallint[],
        ${f.plazo_de_entrega}, ${f.hora_limite}::time,
        ${f.pedido_minimo_centimos}, ${f.portes_centimos},
        ${f.forma_de_pago}::estook.forma_de_pago, ${f.dias_de_pago}
      )
      returning id
    `;

    const proveedorId = creados[0]?.id;
    if (proveedorId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'proveedor', ${proveedorId},
        ${localId}::uuid, null,
        ${JSON.stringify({ nombre: entrada.nombre, dias_de_reparto: f.dias_de_reparto })}::text::jsonb,
        null
      )
    `;

    // Sus días de reparto salen en el Calendario. Lo hace la reacción, no esto.
    await publicar(contexto.sql, {
      tipo: 'proveedor.creado',
      organizacionId,
      localId,
      datos: { proveedorId, nombre: entrada.nombre, diasDeReparto: f.dias_de_reparto },
      correlacionId: contexto.correlacionId,
    });

    return { proveedorId, nombre: entrada.nombre, yaExistia: false };
  },
});

export const entradaCambiarProveedor = z
  .object({
    proveedor_id: z.string().uuid(),
    nombre: z.string().trim().min(1).max(160),
    notas: z.string().trim().max(2000).nullable(),
    activo: z.boolean(),
    ...ficha,
  })
  .strict();

export type EntradaCambiarProveedor = z.infer<typeof entradaCambiarProveedor>;

/**
 * Cambiar la ficha, y desactivarla, en un solo comando.
 *
 * Aquí sí van juntos —y en productos no— porque la pantalla de un proveedor es un
 * formulario con un interruptor. Desactivar un producto es otra cosa: lleva su
 * aviso de en cuántas fichas está, y por eso tiene comando propio.
 */
export const cambiarProveedor = comando<EntradaCambiarProveedor, { proveedorId: string }>({
  nombre: 'cambiar_proveedor',
  entrada: entradaCambiarProveedor,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const filas = await contexto.sql<
      (FichaGuardada & { local_id: string; nombre: string; activo: boolean })[]
    >`
      select local_id, nombre, activo, cif, contacto, telefono, whatsapp, correo, web,
             como_se_pide::text as como_se_pide, dias_de_reparto::int[] as dias_de_reparto,
             plazo_de_entrega::int as plazo_de_entrega,
             to_char(hora_limite, 'HH24:MI') as hora_limite,
             pedido_minimo_centimos::int as pedido_minimo_centimos,
             portes_centimos::int as portes_centimos,
             forma_de_pago::text as forma_de_pago, dias_de_pago::int as dias_de_pago
        from estook.proveedor where id = ${entrada.proveedor_id}
    `;

    const antes = filas[0];
    if (!antes) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese proveedor no está, o no es de un local que puedas ver.',
      });
    }

    await comprobarElDinero(contexto, antes.local_id, entrada);
    const f = mezclar(entrada, antes);

    await contexto.sql`
      update estook.proveedor
         set nombre = ${entrada.nombre},
             notas = ${entrada.notas},
             activo = ${entrada.activo},
             cif = ${f.cif},
             contacto = ${f.contacto},
             telefono = ${f.telefono},
             whatsapp = ${f.whatsapp},
             correo = ${f.correo},
             web = ${f.web},
             como_se_pide = ${f.como_se_pide}::estook.canal_de_pedido,
             dias_de_reparto = ${comoLista(f.dias_de_reparto)}::text::smallint[],
             plazo_de_entrega = ${f.plazo_de_entrega},
             hora_limite = ${f.hora_limite}::time,
             pedido_minimo_centimos = ${f.pedido_minimo_centimos},
             portes_centimos = ${f.portes_centimos},
             forma_de_pago = ${f.forma_de_pago}::estook.forma_de_pago,
             dias_de_pago = ${f.dias_de_pago},
             actualizado_en = now()
       where id = ${entrada.proveedor_id}
    `;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'proveedor', ${entrada.proveedor_id},
        ${antes.local_id}::uuid,
        ${JSON.stringify({ nombre: antes.nombre, activo: antes.activo, dias_de_reparto: antes.dias_de_reparto })}::text::jsonb,
        ${JSON.stringify({ nombre: entrada.nombre, activo: entrada.activo, dias_de_reparto: f.dias_de_reparto })}::text::jsonb,
        null
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'proveedor.cambiado',
      organizacionId,
      localId: antes.local_id,
      datos: {
        proveedorId: entrada.proveedor_id,
        nombre: entrada.nombre,
        activo: entrada.activo,
        diasDeReparto: f.dias_de_reparto,
      },
      correlacionId: contexto.correlacionId,
    });

    return { proveedorId: entrada.proveedor_id };
  },
});
