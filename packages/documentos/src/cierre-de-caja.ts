import {
  escapar,
  lasCifras,
  paginaDelDocumento,
  unaNota,
  unaTabla,
  unTitulo,
  type MarcaDelDocumento,
} from './base.ts';

/**
 * **El Z de una caja, en PDF** (0145; la maqueta de R3, «Descargar su Z»): lo mismo que sale en papel al
 * cerrarla, en A4, para guardarlo o mandárselo a la gestoría. No es un documento fiscal: los tickets son
 * los que valen ante Hacienda, y este papel dice cómo cuadró el cajón.
 */
export interface DatosDelZ {
  readonly marca: MarcaDelDocumento;
  readonly hechoEl: string;
  /** «Cajón 1». */
  readonly caja: string;
  /** «martes, 10 de noviembre de 2026». */
  readonly dia: string;
  /** «Lucía, 12:02 · contando» y «Lucía, 23:40». */
  readonly abrio: string;
  readonly cerro: string | null;
  /** Lo que mueve el cajón, en orden: el fondo, lo cobrado, lo metido y lo sacado. */
  readonly delCajon: readonly { readonly que: string; readonly importe: string }[];
  readonly deberiaHaber: string;
  readonly contado: string | null;
  /** «Cuadra», «Faltan 5,00 €», «Sobran 2,00 €». */
  readonly comoCuadra: string;
  readonly cuadra: boolean;
  readonly motivo: string | null;
  readonly cobrado: string;
  readonly formas: readonly { readonly que: string; readonly importe: string }[];
  readonly paraManana: string | null;
  readonly tickets: number;
  readonly cajonSinVenta: number;
}

export function documentoDelZ(datos: DatosDelZ): string {
  const cuerpo = [
    lasCifras([
      { nombre: 'Cobrado', valor: datos.cobrado, cambio: null, bueno: null },
      { nombre: 'El efectivo', valor: datos.comoCuadra, cambio: null, bueno: datos.cuadra },
      { nombre: 'Tickets', valor: String(datos.tickets), cambio: null, bueno: null },
    ]),
    unTitulo('El cajón'),
    unaTabla(
      [{ titulo: 'Qué' }, { titulo: 'Importe', numero: true }],
      [
        ...datos.delCajon.map((l) => [l.que, l.importe]),
        [
          { html: '<strong>Debería haber</strong>' },
          { html: `<strong>${escapar(datos.deberiaHaber)}</strong>` },
        ],
        ...(datos.contado === null
          ? []
          : [
              [
                { html: '<strong>Contado</strong>' },
                { html: `<strong>${escapar(datos.contado)}</strong>` },
              ],
            ]),
        ...(datos.paraManana === null ? [] : [['Se quedó para mañana', datos.paraManana]]),
      ],
    ),
    unTitulo('Cómo se cobró'),
    unaTabla(
      [{ titulo: 'Forma de pago' }, { titulo: 'Importe', numero: true }],
      datos.formas.map((f) => [f.que, f.importe]),
    ),
    unaTabla(
      [{ titulo: 'Quién' }, { titulo: '' }],
      [
        ['Abrió', datos.abrio],
        ['Cerró', datos.cerro ?? 'Sigue abierta'],
        ['Cajón abierto sin venta', `${String(datos.cajonSinVenta)} veces`],
        ...(datos.motivo === null ? [] : [['Motivo de la diferencia', datos.motivo]]),
      ],
    ),
    unaNota('No es un documento fiscal: ante Hacienda valen los tickets y las facturas.'),
  ].join('');

  return paginaDelDocumento({
    titulo: 'Cierre de caja (Z)',
    numero: datos.caja,
    subtitulo: datos.dia,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    cuerpo,
  });
}
