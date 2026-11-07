import { direccionParaPedirLaFactura } from '@estook/dominio';
import { apuntarUnFallo } from '../infraestructura/fallos.ts';
import { elPdfDeEsteDocumento } from './comandos/hacer-facturas.ts';
import type { Contexto } from './contrato.ts';
import { correoConElDocumento, correoDeLaFacturaNoAceptada } from './correos.ts';
import {
  comoEsta,
  lasHistorias,
  losDocumentos,
  SIN_HISTORIA,
  type EnUnaTransaccion,
} from './emitir.ts';
import { enNombreDelSistema } from './pago.ts';

/**
 * **El correo de la factura que pidió el cliente** (T6 · 2 · 3, decisión 0141). Sale cuando Hacienda la
 * tiene, que es lo que la hace válida: lo mira el reloj de los documentos cada minuto, porque el aviso
 * de Verifacti tiene que contestarse en menos de diez segundos y un PDF puede tardar más. Si Hacienda
 * la rechaza, se le dice para que lo intente otra vez.
 */

/** Cuánto se espera para volver a intentar un correo que no sale. Después se deja, y lo dice la lista. */
const MINUTOS_PARA_VOLVER_A_INTENTAR = [1, 5, 15, 60, 240] as const;

/** **Lo que no contesta Hacienda en este tiempo** se deja de esperar, como el reloj de los documentos. */
const SE_DEJA_DE_ESPERAR_MS = 30 * 24 * 60 * 60_000;

/** Se llama al final del repaso: el reloj le da 50 segundos a la llamada entera. */
const PLAZO_DEL_CORREO_MS = 8_000;

async function mandarUno(contexto: Contexto, facturaId: string): Promise<void> {
  // Dos latidos a la vez no le mandan dos correos: el segundo se salta este.
  const [libre] = await contexto.sql<{ libre: boolean }[]>`
    select pg_try_advisory_xact_lock(hashtextextended(${`correo|${facturaId}`}, 0)) as libre
  `;
  if (libre?.libre !== true) return;
  const [fila] = await contexto.sql<{ para: string; desde: string }[]>`
    select para, desde::text as desde from facturacion.correo_por_mandar
     where factura_id = ${facturaId}::uuid and siguiente_en <= ${contexto.ahora.toISOString()}::timestamptz
  `;
  if (fila === undefined) return;

  const [doc] = await losDocumentos(contexto, [facturaId]);
  if (doc === undefined) return;
  const h = (await lasHistorias(contexto, [facturaId])).get(facturaId) ?? SIN_HISTORIA;
  const quitar = () =>
    contexto.sql`select facturacion.quitar_el_correo(${facturaId}::uuid)`.then(() => undefined);
  const estado = comoEsta(doc, h);

  if (estado === 'anulado') {
    await quitar();
    return;
  }
  if (estado === 'rechazado' || estado === 'rechazado_por_datos') {
    // Si ya la ha corregido alguien, lo suyo es la corregida: tiene su propio correo en la cola.
    if (h.rehechoPor === null) {
      if (contexto.correo === null) throw new Error('El correo no está encendido.');
      const [ticket] = await contexto.sql<{ codigo: string }[]>`
        select c.codigo from facturacion.pedida p
          join facturacion.codigo_de_ticket c on c.documento_id = p.ticket_id
         where p.factura_id = ${facturaId}::uuid
      `;
      if (ticket !== undefined) {
        await contexto.correo.mandar(
          correoDeLaFacturaNoAceptada(
            fila.para,
            doc.empresa.local,
            direccionParaPedirLaFactura(ticket.codigo),
          ),
        );
      }
    }
    await quitar();
    return;
  }
  if (estado === 'preparado' || estado === 'enviando' || estado === 'pendiente') {
    // Hacienda todavía no ha dicho nada: se sigue mirando, sin gastar intentos.
    const espera = contexto.ahora.getTime() - new Date(fila.desde).getTime();
    if (espera > SE_DEJA_DE_ESPERAR_MS) await quitar();
    return;
  }

  if (contexto.correo === null) throw new Error('El correo no está encendido.');
  const pdf = await elPdfDeEsteDocumento(contexto, doc, h);
  await contexto.correo.mandar(
    correoConElDocumento(fila.para, doc.empresa.local, pdf.nombre.replace(/\.pdf$/, ''), {
      nombre: pdf.nombre,
      base64: pdf.base64,
    }),
  );
  await contexto.sql`
    select facturacion.correo_mandado(
      ${facturaId}::uuid, ${fila.para}, ${contexto.ahora.toISOString()}::timestamptz
    )
  `;
}

/** Lo que falla se apunta y se vuelve a intentar más tarde. **Nunca lanza.** Cuántos ha mirado. */
export async function mandarLoPedido(
  enTransaccion: EnUnaTransaccion,
  plazoMs = PLAZO_DEL_CORREO_MS,
): Promise<number> {
  const empezo = Date.now();
  try {
    const filas = await enTransaccion((contexto) =>
      enNombreDelSistema(
        contexto,
        () => contexto.sql<{ id: string }[]>`
          select factura_id::text as id from facturacion.correo_por_mandar
           where siguiente_en <= ${contexto.ahora.toISOString()}::timestamptz
           order by siguiente_en
           limit 20
        `,
      ),
    );
    let mirados = 0;
    for (const { id } of filas) {
      if (Date.now() - empezo > plazoMs) break;
      mirados += 1;
      try {
        await enTransaccion((contexto) =>
          enNombreDelSistema(contexto, () => mandarUno(contexto, id)),
        );
      } catch (fallo) {
        await apuntarQueNoSalio(enTransaccion, id, fallo);
      }
    }
    return mirados;
  } catch (fallo) {
    await apuntarUnFallo(fallo, {
      mensaje: 'los correos de las facturas pedidas no se han podido mirar',
      correlacionId: null,
    });
    return 0;
  }
}

async function apuntarQueNoSalio(
  enTransaccion: EnUnaTransaccion,
  facturaId: string,
  fallo: unknown,
): Promise<void> {
  try {
    const seDejo = await enTransaccion((contexto) =>
      enNombreDelSistema(contexto, async () => {
        const [fila] = await contexto.sql<{ intentos: number }[]>`
          select intentos::int as intentos from facturacion.correo_por_mandar
           where factura_id = ${facturaId}::uuid
        `;
        const minutos = MINUTOS_PARA_VOLVER_A_INTENTAR[fila?.intentos ?? 0];
        const siguiente =
          minutos === undefined
            ? null
            : new Date(contexto.ahora.getTime() + minutos * 60_000).toISOString();
        await contexto.sql`
          select facturacion.correo_que_no_salio(
            ${facturaId}::uuid, ${siguiente}::timestamptz,
            ${contexto.ahora.toISOString()}::timestamptz
          )
        `;
        return siguiente === null;
      }),
    );
    // Solo cuando se deja de intentar: un corte de un rato lo arregla el siguiente latido.
    if (seDejo) {
      await apuntarUnFallo(fallo, {
        mensaje: 'el correo de una factura pedida por el cliente no ha salido',
        correlacionId: null,
      });
    }
  } catch (otro) {
    await apuntarUnFallo(otro, {
      mensaje: 'no se ha podido apuntar que un correo no salió',
      correlacionId: null,
    });
  }
}
