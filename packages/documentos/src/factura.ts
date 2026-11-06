import {
  enEuros,
  centimos,
  lineasDeLaFactura,
  type ElDesglose,
  type ElDestinatario,
  type LineaVendida,
  type TipoDeDocumento,
} from '@estook/dominio';
import { escapar, paginaDelDocumento, unaMarca, type MarcaDelDocumento } from './base.ts';

/**
 * **La factura en A4** (T6 · 2 · 2 · 1, decisión 0137; maqueta de T6, 6). Lo que pide el artículo
 * 6.1 del RD 1619/2012, en su orden: número y fecha, quién la hace y para quién con su NIF y su
 * domicilio, **el precio unitario sin impuesto** de cada línea, el tipo, la base, la cuota aparte,
 * y la fecha de la operación si es otra. El QR tributario, **primero** (Orden HAC/1177/2024, art.
 * 21), entre 30 y 40 mm, con «QR tributario:» encima y «VERI*FACTU» debajo. En pruebas, la marca.
 */

export interface LaFacturaEnA4 {
  readonly tipo: TipoDeDocumento;
  readonly numero: string;
  readonly empresa: { readonly nombre: string; readonly nif: string; readonly domicilio: string };
  readonly destinatario: ElDestinatario | null;
  readonly fecha: string;
  readonly fechaOperacion: string | null;
  readonly vence: string | null;
  readonly sustituye: readonly string[];
  readonly lineas: readonly LineaVendida[];
  readonly desglose: ElDesglose;
  /** La imagen que da Verifacti, sin tocar (Anexo 4.7). Nula por el SII. */
  readonly qrEnBase64: string | null;
  readonly pruebas: boolean;
}

const euros = (c: number) => `${c < 0 ? '−' : ''}${enEuros(centimos(Math.abs(c)))} €`;

const NOMBRE_DEL_IMPUESTO = { iva: 'IVA', igic: 'IGIC', ipsi: 'IPSI' } as const;

const ESTILO = `
  .qr-tributario { display: flex; flex-direction: column; align-items: center; gap: 1mm; width: 40mm; font-size: 9pt; }
  .qr-tributario img { width: 35mm; height: 35mm; display: block; }
  .cabeza { display: flex; gap: 8mm; align-items: flex-start; margin-bottom: 6mm; }
  .partes { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 6mm; }
  .parte { border: 1px solid #d8d4cc; border-radius: 2mm; padding: 3mm; font-size: 10pt; }
  .parte b { display: block; font-size: 8pt; letter-spacing: .06em; text-transform: uppercase; color: #5a6568; margin-bottom: 1mm; }
  table.lineas { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 5mm; }
  table.lineas th { text-align: left; font-size: 8.5pt; color: #5a6568; border-bottom: 1px solid #d8d4cc; padding: 1.5mm 1mm; }
  table.lineas td { border-bottom: 1px solid #ece9e2; padding: 1.5mm 1mm; font-variant-numeric: tabular-nums; }
  table.lineas .n { text-align: right; white-space: nowrap; }
  .totales { margin-left: auto; width: 75mm; font-size: 10pt; font-variant-numeric: tabular-nums; }
  .totales div { display: flex; justify-content: space-between; padding: 1mm 0; }
  .totales .total { font-weight: 700; font-size: 13pt; border-top: 1px solid #1d2a2e; margin-top: 1mm; padding-top: 2mm; }
`;

export function documentoDeLaFactura(
  f: LaFacturaEnA4,
  marca: MarcaDelDocumento,
  hechoEl: string,
): string {
  const qr =
    f.qrEnBase64 === null
      ? ''
      : `<div class="qr-tributario"><span>QR tributario:</span><img alt="QR tributario" src="data:image/png;base64,${escapar(f.qrEnBase64)}"/><b>VERI*FACTU</b></div>`;
  const datos = [
    `Fecha: ${f.fecha}`,
    ...(f.fechaOperacion === null ? [] : [`Fecha de la operación: ${f.fechaOperacion}`]),
    ...(f.vence === null ? [] : [`Vence: ${f.vence}`]),
    ...f.sustituye.map((s) => `Sustituye a la factura simplificada ${s}`),
  ]
    .map((d) => `<div>${escapar(d)}</div>`)
    .join('');
  const para =
    f.destinatario === null
      ? ''
      : `<div class="parte"><b>Para</b>${escapar(f.destinatario.nombre)}<br/>${escapar(f.destinatario.identificador)}<br/>${escapar(f.destinatario.domicilio)}</div>`;
  const filas = lineasDeLaFactura(f.lineas)
    .map(
      (l) =>
        `<tr><td>${escapar(l.nombre)}</td><td class="n">${String(l.cantidad)}</td><td class="n">${escapar(l.precioSinImpuesto)} €</td><td class="n">${escapar(l.tipo)}</td><td class="n">${euros(l.base)}</td></tr>`,
    )
    .join('');
  const impuestos = f.desglose.lineas
    .map((l) => {
      const nombre = `${NOMBRE_DEL_IMPUESTO[l.regimen]} ${String(Number((l.tipo * 100).toFixed(2))).replace('.', ',')} %`;
      return `<div><span>Base ${nombre}</span><span>${euros(l.base)}</span></div><div><span>Cuota ${nombre}</span><span>${euros(l.cuota)}</span></div>`;
    })
    .join('');
  const cuerpo = [
    f.pruebas ? unaMarca('PRUEBA · SIN VALIDEZ') : '',
    `<div class="cabeza">${qr}<div>${datos}</div></div>`,
    `<div class="partes"><div class="parte"><b>De</b>${escapar(f.empresa.nombre)}<br/>${escapar(f.empresa.nif)}<br/>${escapar(f.empresa.domicilio)}</div>${para}</div>`,
    `<table class="lineas"><thead><tr><th>Concepto</th><th class="n">Cant.</th><th class="n">Precio sin impuesto</th><th class="n">Tipo</th><th class="n">Base</th></tr></thead><tbody>${filas}</tbody></table>`,
    `<div class="totales">${impuestos}<div class="total"><span>Total</span><span>${euros(f.desglose.total)}</span></div></div>`,
  ].join('');
  return paginaDelDocumento({
    titulo: f.destinatario === null ? `Factura simplificada ${f.numero}` : `Factura ${f.numero}`,
    subtitulo: f.empresa.nombre,
    marca,
    hechoEl,
    cuerpo,
    estilo: ESTILO,
  });
}
