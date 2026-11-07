import { z } from 'zod';
import {
  MOTIVO_DE_DEVOLUCION,
  elNumeroEntero,
  fechaEnElLocal,
  laDevolucion,
  lasLineasQueQuedan,
  loQueQuedaDeCadaLinea,
  type ElDestinatario,
  type FechaOperativa,
  type LineaVendida,
  type LoQueSePideDevolver,
  type MotivoDeDevolucion,
} from '@estook/dominio';
import { comando, consulta, FalloDeAplicacion } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { elRelojYElFisco } from '../desviacion.ts';
import {
  apuntarElPasoDeAnular,
  comoEsta,
  dejarParaMandar,
  lasHistorias,
  lasSenalesConSusLineas,
  losDocumentos,
  loDevuelto,
  prepararUnDocumento,
  SIN_HISTORIA,
  type UnaSenal,
} from '../emitir.ts';
import { enLaBase } from '../facturacion.ts';
import { enNombreDelSistema } from '../pago.ts';
import {
  elCliente,
  elDestinatarioComprobado,
  losTiposDelLocal,
  type ElClienteQueLlega,
  type FacturaHecha,
} from './hacer-facturas.ts';

/**
 * **Las correcciones** (T6 · 2 · 2 · 2, decisión 0140; Anexo 4.5, 4.10, 5.3 y 5.4). Lo emitido no se
 * toca: **se corrige con otro documento**, y cada cosa tiene su permiso y su motivo.
 *
 *   devolver_el_documento     R5 de un ticket, R1 de una factura: lo devuelto, en negativo. Todo, una
 *                             parte (una de dos raciones) o lo cobrado de más. No mueve la caja: T7
 *   corregir_los_datos        R4 por sustitución: el NIF, el nombre o el domicilio del cliente
 *   anular_el_documento       para lo que nunca debió existir. El número no se vuelve a usar
 *   corregir_lo_rechazado     otro documento igual, con otro número, para lo que rechazó Hacienda
 *   hacer_factura_de_senal    se factura al cobrarla (Ley del IVA, art. 75.Dos)
 *   las_senales_del_cliente   las que la factura final descuenta sola
 *
 * **Todo sirve también en Estook TPV**, y lo que hace falta lo mira la API y lo vuelve a mirar la base
 * con el candado del documento: lo que dos aparatos intentan a la vez sale de uno en uno.
 */

const EL_MOTIVO = z.enum(['mal_hecho', 'de_mas', 'no_lo_quiso', 'otro']);

/** El documento de esta sesión, con su historia. El de otro local, no existe. */
async function elDocumentoDelLocal(
  contexto: Parameters<typeof losDocumentos>[0],
  documentoId: string,
) {
  const localId = elLocalDeLaSesion(contexto);
  const [doc] = await losDocumentos(contexto, [documentoId]);
  if (doc === undefined || doc.localId !== localId) throw new FalloDeAplicacion('no_existe');
  const h = (await lasHistorias(contexto, [doc.id])).get(doc.id) ?? SIN_HISTORIA;
  return { localId, doc, h };
}

function porqueNo(porque: string): FalloDeAplicacion {
  return new FalloDeAplicacion('faltan_datos', { porque });
}

// ── Devolver ──────────────────────────────────────────────────────────────────────

export const devolverElDocumento = comando<
  {
    documento_id: string;
    que: 'todo' | 'partes' | 'de_mas';
    partes?: { linea: number; cantidad: number }[] | undefined;
    linea?: number | undefined;
    importe?: number | undefined;
    motivo: MotivoDeDevolucion;
    detalle?: string | undefined;
  },
  FacturaHecha
>({
  nombre: 'devolver_el_documento',
  entrada: z
    .object({
      documento_id: z.string().uuid(),
      que: z.enum(['todo', 'partes', 'de_mas']),
      partes: z
        .array(
          z
            .object({
              linea: z.number().int().min(0).max(10_000),
              cantidad: z.number().int().min(1).max(100_000),
            })
            .strict(),
        )
        .min(1)
        .max(200)
        .optional(),
      linea: z.number().int().min(0).max(10_000).optional(),
      importe: z.number().int().min(1).max(100_000_000).optional(),
      motivo: EL_MOTIVO,
      detalle: z.string().trim().max(150).optional(),
    })
    .strict(),
  exige: 'accion.devolver',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const { localId, doc, h } = await elDocumentoDelLocal(contexto, entrada.documento_id);
    if (doc.tipo !== 'F2' && doc.tipo !== 'F1' && doc.tipo !== 'F3' && doc.tipo !== 'R4') {
      throw porqueNo('Esto no se devuelve.');
    }
    const elMotivo =
      entrada.motivo === 'otro'
        ? (entrada.detalle?.trim() ?? '')
        : MOTIVO_DE_DEVOLUCION[entrada.motivo];
    if (elMotivo === '') throw porqueNo('Di por qué se devuelve.');

    let pedida: LoQueSePideDevolver;
    if (entrada.que === 'todo') {
      pedida = { que: 'todo' };
    } else if (entrada.que === 'de_mas') {
      if (entrada.linea === undefined || entrada.importe === undefined) {
        throw porqueNo('Di de qué línea y cuánto se cobró de más.');
      }
      pedida = { que: 'de_mas', linea: entrada.linea, importe: entrada.importe };
    } else {
      if (entrada.partes === undefined) throw porqueNo('Elige qué se devuelve.');
      pedida = { que: 'partes', partes: entrada.partes };
    }
    const d = laDevolucion(loQueQuedaDeCadaLinea(doc.lineas, loDevuelto(h)), pedida);
    if ('porque' in d) throw porqueNo(d.porque);

    const fisco = await elRelojYElFisco(contexto, localId);
    const hecho = await prepararUnDocumento(contexto, {
      localId,
      // **Sobre un ticket, R5; sobre una factura, R1** (Anexo 4.5).
      tipo: doc.tipo === 'F2' ? 'R5' : 'R1',
      descripcion: `Devolución de ${elNumeroEntero(doc.serie, doc.numero)}: ${elMotivo}`.slice(
        0,
        500,
      ),
      lineas: d.lineas,
      regimenDelLocal: fisco.regimen as LineaVendida['regimen'],
      zonaHoraria: fisco.zonaHoraria,
      donde: doc.donde,
      origen: 'devolucion',
      ...(doc.destinatario === null ? {} : { destinatario: doc.destinatario }),
    });
    await enLaBase(
      () => contexto.sql`
        select facturacion.apuntar_la_devolucion(
          ${localId}::uuid, ${hecho.id}::uuid, ${doc.id}::uuid, ${elMotivo},
          ${JSON.stringify(d.apuntes)}::text::jsonb, ${contexto.ahora.toISOString()}::timestamptz
        )
      `,
    );
    return { documentoId: hecho.id, numero: hecho.numero };
  },
});

// ── Corregir los datos del cliente ────────────────────────────────────────────────

/** Lo que cambia, dicho para el papel: «Corrige el NIF y el domicilio». Vacío si no cambia nada. */
function loQueCambia(antes: ElDestinatario, ahora: ElDestinatario): string {
  const cambia = [
    antes.identificador !== ahora.identificador ||
    antes.id_tipo !== ahora.id_tipo ||
    antes.codigo_pais !== ahora.codigo_pais
      ? 'el NIF'
      : null,
    antes.nombre !== ahora.nombre ? 'el nombre' : null,
    antes.domicilio !== ahora.domicilio ? 'el domicilio' : null,
  ].filter((c) => c !== null);
  if (cambia.length === 0) return '';
  const ultimo = cambia.at(-1) ?? '';
  return `Corrige ${cambia.length === 1 ? ultimo : `${cambia.slice(0, -1).join(', ')} y ${ultimo}`}`;
}

/**
 * **R4 por sustitución** (lo investigado, A20): el dato que no es un importe. La anterior se queda
 * donde estaba, marcada «Corregida», y **la nueva recoge lo que queda**: si ya tenía una devolución,
 * dice que rectifica también esa, y lo de antes es la suma de todo lo que Hacienda tiene.
 */
export const corregirLosDatos = comando<
  { documento_id: string; cliente: ElClienteQueLlega },
  FacturaHecha
>({
  nombre: 'corregir_los_datos',
  entrada: z.object({ documento_id: z.string().uuid(), cliente: elCliente }).strict(),
  exige: 'accion.corregir_datos',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const { localId, doc, h } = await elDocumentoDelLocal(contexto, entrada.documento_id);
    if (
      doc.destinatario === null ||
      (doc.tipo !== 'F1' && doc.tipo !== 'F3' && doc.tipo !== 'R4')
    ) {
      throw porqueNo('Este documento no lleva datos de cliente que corregir.');
    }
    const destinatario = await elDestinatarioComprobado(contexto, entrada.cliente);
    const elMotivo = loQueCambia(doc.destinatario, destinatario);
    if (elMotivo === '') throw porqueNo('No has cambiado nada.');
    const lineas = lasLineasQueQuedan(loQueQuedaDeCadaLinea(doc.lineas, loDevuelto(h)));
    if (lineas.length === 0) throw porqueNo('Ya está devuelta entera: no queda nada que corregir.');

    const fisco = await elRelojYElFisco(contexto, localId);
    const hecho = await prepararUnDocumento(contexto, {
      localId,
      tipo: 'R4',
      descripcion: `Corrección de ${elNumeroEntero(doc.serie, doc.numero)}: ${elMotivo}`.slice(
        0,
        500,
      ),
      lineas,
      regimenDelLocal: fisco.regimen as LineaVendida['regimen'],
      zonaHoraria: fisco.zonaHoraria,
      donde: doc.donde,
      origen: 'correccion',
      // La operación es la misma: lo que cambia es a nombre de quién.
      fechaOperacion: doc.fechaOperacion,
      destinatario,
      vencimiento: h.cobradaEn === null ? doc.vencimiento : null,
    });
    await enLaBase(
      () => contexto.sql`
        select facturacion.apuntar_la_correccion(
          ${localId}::uuid, ${hecho.id}::uuid, ${doc.id}::uuid, ${elMotivo},
          ${contexto.ahora.toISOString()}::timestamptz
        )
      `,
    );
    return { documentoId: hecho.id, numero: hecho.numero };
  },
});

// ── Anular ────────────────────────────────────────────────────────────────────────

/**
 * **Anular es excepcional** (Anexo 4.5): lo que nunca debió existir y el cliente no se llevó. Lo que
 * se manda a Hacienda va con el comando ya guardado, como lo demás. **Por el SII no pasa por Verifacti**
 * (0127): está anulado al apuntarlo, y su declaración la lleva la empresa.
 */
export const anularElDocumento = comando<
  { documento_id: string; motivo: string },
  { readonly anulacionId: string }
>({
  nombre: 'anular_el_documento',
  entrada: z
    .object({ documento_id: z.string().uuid(), motivo: z.string().trim().min(3).max(200) })
    .strict(),
  exige: 'accion.anular',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const { localId, doc } = await elDocumentoDelLocal(contexto, entrada.documento_id);
    const [fila] = await enLaBase(
      () => contexto.sql<{ id: string }[]>`
        select facturacion.pedir_la_anulacion(
          ${localId}::uuid, ${doc.id}::uuid, ${entrada.motivo},
          ${contexto.ahora.toISOString()}::timestamptz
        )::text as id
      `,
    );
    if (fila === undefined) throw new Error('La anulación no se pidió.');
    if (doc.modalidad === 'fuera_sii') {
      await enNombreDelSistema(contexto, () =>
        apuntarElPasoDeAnular(contexto, doc, fila.id, {
          uuid: null,
          estado: 'Anulado',
          codigo: null,
          mensaje: null,
          queda: 'anulada',
          por: 'alta',
        }),
      );
    } else {
      dejarParaMandar(contexto.correlacionId, doc.id);
    }
    return { anulacionId: fila.id };
  },
});

// ── Lo que rechazó Hacienda ───────────────────────────────────────────────────────

/**
 * **Lo rechazado se corrige con otro documento** (Anexo 4.10): igual, con otro número, y con los datos
 * del cliente corregidos si es lo que estaba mal. El rechazado se queda, su número sigue usado, y lo
 * que iba con él (los tickets, las señales, lo que rectificaba) pasa al nuevo después de volver a
 * mirarlo. Deja de salir arriba: ya está corregido.
 */
export const corregirLoRechazado = comando<
  { documento_id: string; cliente?: ElClienteQueLlega | undefined },
  FacturaHecha
>({
  nombre: 'corregir_lo_rechazado',
  entrada: z.object({ documento_id: z.string().uuid(), cliente: elCliente.optional() }).strict(),
  exige: 'accion.corregir_datos',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const { localId, doc, h } = await elDocumentoDelLocal(contexto, entrada.documento_id);
    const estado = comoEsta(doc, h);
    if (estado !== 'rechazado' && estado !== 'rechazado_por_datos') {
      throw porqueNo('Este documento no está rechazado: no hay que volver a hacerlo.');
    }
    if (entrada.cliente !== undefined && doc.destinatario === null) {
      throw porqueNo('Este documento no lleva cliente.');
    }
    const destinatario =
      entrada.cliente === undefined
        ? doc.destinatario
        : await elDestinatarioComprobado(contexto, entrada.cliente);
    const fisco = await elRelojYElFisco(contexto, localId);
    const hecho = await prepararUnDocumento(contexto, {
      localId,
      tipo: doc.tipo,
      descripcion: doc.descripcion,
      lineas: doc.lineas,
      regimenDelLocal: fisco.regimen as LineaVendida['regimen'],
      zonaHoraria: fisco.zonaHoraria,
      donde: doc.donde,
      origen: doc.origen,
      fechaOperacion: doc.fechaOperacion,
      ...(destinatario === null ? {} : { destinatario }),
      vencimiento: doc.vencimiento,
      rehace: doc.id,
    });
    await enLaBase(
      () => contexto.sql`
        select facturacion.apuntar_lo_rehecho(
          ${doc.id}::uuid, ${hecho.id}::uuid, ${contexto.ahora.toISOString()}::timestamptz
        )
      `,
    );
    return { documentoId: hecho.id, numero: hecho.numero };
  },
});

// ── La señal ──────────────────────────────────────────────────────────────────────

/**
 * **La señal de un evento se factura el día que se cobra** (Ley del IVA, art. 75.Dos; lo investigado,
 * A22). Una F1, cobrada ese día, que la factura final descuenta en su mismo tipo de impuesto.
 */
export const hacerFacturaDeSenal = comando<
  { cliente: ElClienteQueLlega; para_que: string; importe: number; tipo: number },
  FacturaHecha
>({
  nombre: 'hacer_factura_de_senal',
  entrada: z
    .object({
      cliente: elCliente,
      para_que: z.string().trim().min(3).max(120),
      importe: z.number().int().min(1).max(100_000_000),
      tipo: z.number().min(0).max(1),
    })
    .strict(),
  exige: 'accion.factura_a_mano',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const fisco = await elRelojYElFisco(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, fisco.zonaHoraria);
    const tipos = await losTiposDelLocal(contexto, fisco, hoy);
    if (!tipos.includes(entrada.tipo)) {
      throw porqueNo('La señal lleva un impuesto que tu local no tiene.');
    }
    const destinatario = await elDestinatarioComprobado(contexto, entrada.cliente);
    const regimen = fisco.regimen as LineaVendida['regimen'];
    const hecho = await prepararUnDocumento(contexto, {
      localId,
      tipo: 'F1',
      descripcion: entrada.para_que,
      lineas: [
        {
          nombre: entrada.para_que,
          cantidad: 1,
          importe: entrada.importe,
          regimen,
          tipo: entrada.tipo,
        },
      ],
      regimenDelLocal: regimen,
      zonaHoraria: fisco.zonaHoraria,
      donde: null,
      origen: 'senal',
      fechaOperacion: hoy,
      destinatario,
    });
    await enLaBase(
      () => contexto.sql`
        select facturacion.marcar_cobrada(
          ${hecho.id}::uuid, ${contexto.ahora.toISOString()}::timestamptz
        )
      `,
    );
    return { documentoId: hecho.id, numero: hecho.numero };
  },
});

/**
 * **Las señales de ese cliente que se pueden descontar**, para que salgan marcadas solas. Por su número
 * entero, como al rellenar sus datos (0139): así no se puede hojear a nadie.
 */
export const lasSenalesDelCliente = consulta<{ identificador: string }, readonly UnaSenal[]>({
  nombre: 'las_senales_del_cliente',
  entrada: z.object({ identificador: z.string().trim().min(1).max(20) }).strict(),
  exige: 'accion.factura_a_mano',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const filas = await enLaBase(
      () => contexto.sql<{ id: string; fecha: string; queda: number }[]>`
        select id::text as id, to_char(fecha, 'YYYY-MM-DD') as fecha, queda
          from facturacion.las_senales_del_cliente(${localId}::uuid, ${entrada.identificador})
      `,
    );
    return lasSenalesConSusLineas(
      contexto,
      filas.map((f) => ({ id: f.id, fecha: f.fecha as FechaOperativa, queda: f.queda })),
    );
  },
});
