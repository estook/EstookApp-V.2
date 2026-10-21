import { colorSeguro, escapar, paginaDelDocumento, type MarcaDelDocumento } from './base.ts';

/**
 * El menú del día en papel (M10 · 2, decisiones 0103 y 0104).
 *
 * Richi, 21-oct: «descargar en PDF vectorizado de impresión en grande (explicar para
 * imprimir y colocar en el local), PDF normal…». Dos formas con la misma base:
 *
 *   · **El cartel**, en A3: letra grande y centrada, para la puerta, el escaparate o la
 *     pizarra de la barra. Vectorial, así que en una copistería sale nítido en A3 o en
 *     A2, y en casa, en A4.
 *   · **La hoja**, en A4: lo mismo en tamaño de leer, para mandarla o tenerla en la mesa.
 *
 * **Sin un euro de lo que cuesta**: solo lo que paga el cliente (el precio y los
 * suplementos). Aquí no se calcula nada: todo llega ya escrito (regla 6).
 */

export interface PlatoDelMenuEnPapel {
  readonly nombre: string;
  /** «+4,00 €», o nulo sin suplemento. */
  readonly suplemento: string | null;
}

export interface SeccionDelMenuEnPapel {
  /** «Primeros», «Postre o café». */
  readonly nombre: string;
  readonly platos: readonly PlatoDelMenuEnPapel[];
}

export interface DatosDelMenu {
  readonly marca: MarcaDelDocumento;
  readonly hechoEl: string;
  /** «Menú del día». */
  readonly nombre: string;
  /** «Martes, 20 de octubre», o nulo en un menú que no es de un día. */
  readonly dia: string | null;
  /** «13,50 €», o nulo si no tiene precio. */
  readonly precio: string | null;
  readonly secciones: readonly SeccionDelMenuEnPapel[];
  /** «Pan y café incluidos», o nulo. */
  readonly incluye: string | null;
  /** «IVA incluido»: lo que pide la ley de precios al consumidor. */
  readonly nota: string;
}

function lasSecciones(secciones: readonly SeccionDelMenuEnPapel[]): string {
  return secciones
    .map(
      (s) => `<section class="seccion">
  <h2>${escapar(s.nombre)}</h2>
  <ul>${s.platos
    .map(
      (p) =>
        `<li>${escapar(p.nombre)}${p.suplemento === null ? '' : ` <span class="suplemento">${escapar(p.suplemento)}</span>`}</li>`,
    )
    .join('')}</ul>
</section>`,
    )
    .join('\n');
}

/** El menú en papel: `cartel`, en A3 y grande, o `hoja`, en A4. */
export function documentoDelMenu(datos: DatosDelMenu, forma: 'cartel' | 'hoja'): string {
  const color = colorSeguro(datos.marca.color);
  const cartel = forma === 'cartel';
  const cuerpo = `
<main class="menu">
  <p class="nombre">${escapar(datos.nombre)}</p>
  ${datos.dia === null ? '' : `<p class="dia">${escapar(datos.dia)}</p>`}
  ${lasSecciones(datos.secciones)}
  ${datos.incluye === null ? '' : `<p class="incluye">${escapar(datos.incluye)}</p>`}
  ${datos.precio === null ? '' : `<p class="precio">${escapar(datos.precio)}</p>`}
  <p class="nota">${escapar(datos.nota)}</p>
</main>`;

  const estilo = `
  .menu { text-align: center; padding: ${cartel ? '22mm 10mm 0' : '10mm 6mm 0'}; }
  .menu .nombre { font-size: ${cartel ? '54pt' : '28pt'}; font-weight: 800; letter-spacing: -0.02em;
                  margin: 0; color: ${color}; line-height: 1.05; }
  .menu .dia { font-size: ${cartel ? '22pt' : '13pt'}; margin: ${cartel ? '6mm 0 12mm' : '3mm 0 7mm'};
               font-weight: 600; }
  .menu .seccion { margin: 0 auto ${cartel ? '11mm' : '6mm'}; break-inside: avoid; }
  .menu h2 { font-size: ${cartel ? '17pt' : '10pt'}; margin: 0 0 ${cartel ? '3mm' : '2mm'}; }
  .menu ul { list-style: none; padding: 0; margin: 0; }
  .menu li { font-size: ${cartel ? '27pt' : '14pt'}; line-height: 1.3; font-weight: 500; }
  .menu .suplemento { font-size: 0.6em; font-weight: 700; color: ${color}; white-space: nowrap; }
  .menu .incluye { font-size: ${cartel ? '17pt' : '10pt'}; margin: ${cartel ? '4mm 0 0' : '2mm 0 0'}; }
  .menu .precio { display: inline-block; margin: ${cartel ? '10mm 0 0' : '6mm 0 0'};
                  font-size: ${cartel ? '64pt' : '30pt'}; font-weight: 800; color: #fff;
                  background: ${color}; border-radius: ${cartel ? '14mm' : '7mm'};
                  padding: ${cartel ? '3mm 16mm' : '1mm 8mm'}; letter-spacing: -0.02em; }
  .menu .nota { font-size: ${cartel ? '11pt' : '8pt'}; margin-top: ${cartel ? '6mm' : '3mm'}; }
  ${cartel ? '.cabecera { padding-bottom: 6mm; }' : ''}`;

  return paginaDelDocumento({
    titulo: datos.nombre,
    subtitulo: datos.dia ?? 'Menú',
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    cuerpo,
    estilo,
    ...(cartel ? { papel: 'A3' as const } : {}),
  });
}
