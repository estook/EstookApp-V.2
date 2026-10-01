import { MONTSERRAT_WOFF2_BASE64 } from './letra.ts';

/**
 * La base de todos los documentos de Estook (0068).
 *
 * «Que los PDF queden muy profesionales, los de toda la app» (Richi, 30-sep). Por eso
 * no hay un documento con su estilo y otro con el suyo: **todos salen de aquí**, con
 * la misma cabecera —el logo y el color del local—, la misma letra que la app, las
 * mismas tablas y el mismo pie. Un documento nuevo solo escribe lo suyo, el cuerpo.
 *
 * ── Lo que no se hace aquí ──────────────────────────────────────────────────
 *
 * **Convertirlo en PDF.** Esto devuelve una página HTML y nada más: el PDF lo hace el
 * servidor con su motor (regla 7, nunca en el navegador de quien lo pide). Así la
 * misma página sirve para la vista previa, para las pruebas y para el PDF.
 *
 * **Leer nada.** Cada documento recibe sus datos ya contados y ya escritos, como los
 * enseña la app: aquí no se calcula ni una cifra (regla 6).
 */

/** Lo que el documento sabe del local para su cabecera. */
export interface MarcaDelDocumento {
  readonly nombreDelLocal: string;
  /** `#FF7A00`. Si no es un color de verdad, se usa el de Estook. */
  readonly color: string | null;
  /** Un enlace a la imagen del logo, o nulo: entonces va la inicial en su color. */
  readonly logo: string | null;
}

export interface Documento {
  /** El nombre del documento, arriba: «Tu semana», «Registro de jornada». */
  readonly titulo: string;
  /** Debajo del título: el periodo, lo que abarca. */
  readonly subtitulo: string;
  readonly marca: MarcaDelDocumento;
  /** Arriba a la derecha, en pequeño: «Hecho el 30 de septiembre, 19:40». */
  readonly hechoEl: string;
  /** El cuerpo, ya escrito con las piezas de abajo. */
  readonly cuerpo: string;
  /** Apaisado para tablas anchas (el horario de la semana). */
  readonly apaisado?: boolean;
}

/** El naranja de Estook, para quien no ha elegido color. */
export const COLOR_DE_ESTOOK = '#FF7A00';

/**
 * Lo que se escribe dentro de la página, a salvo.
 *
 * Todo lo que viene de fuera —el nombre de una persona, el de un proveedor, un
 * motivo— pasa por aquí. Sin esto, un nombre con `<` rompería el documento, y uno
 * escrito con mala idea metería lo que quisiera en él.
 */
export function escapar(texto: string | number | null | undefined): string {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Solo un color de seis cifras pasa a la hoja de estilo: nada más cabe ahí. */
export function colorSeguro(color: string | null | undefined): string {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : COLOR_DE_ESTOOK;
}

/** Solo un enlace https (o una imagen incrustada) puede ser el logo. */
function logoSeguro(logo: string | null): string | null {
  if (logo === null) return null;
  return /^https:\/\/[^\s"'<>]+$/.test(logo) ||
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)
    ? logo
    : null;
}

function inicial(nombre: string): string {
  return (nombre.trim().charAt(0) || 'E').toUpperCase();
}

const TINTA = '#111C1F';
const SUAVE = '#5B686C';
const TENUE = '#8A9599';
const RAYA = '#E3E8EA';
const FONDO = '#F4F6F7';
const BIEN = '#1F7A4D';
const MAL = '#B3261E';

/** La página entera, con su cabecera, su letra y su estilo. */
export function paginaDelDocumento(doc: Documento): string {
  const color = colorSeguro(doc.marca.color);
  const logo = logoSeguro(doc.marca.logo);
  const tamano = doc.apaisado === true ? 'A4 landscape' : 'A4';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(doc.titulo)} · ${escapar(doc.marca.nombreDelLocal)}</title>
<style>
  @font-face {
    font-family: 'Montserrat';
    src: url(data:font/woff2;base64,${MONTSERRAT_WOFF2_BASE64}) format('woff2');
    font-weight: 100 900;
    font-style: normal;
  }
  @page { size: ${tamano}; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; color: ${TINTA};
    font: 400 9.5pt/1.45 'Montserrat', 'Segoe UI', system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
  }
  .cabecera { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 3px solid ${color}; }
  .logo { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; }
  .inicial { width: 44px; height: 44px; border-radius: 12px; background: ${color}; color: #fff;
             font-weight: 700; font-size: 18pt; display: flex; align-items: center; justify-content: center; }
  .titulo { font-size: 17pt; font-weight: 700; letter-spacing: -0.01em; margin: 0; line-height: 1.15; }
  .subtitulo { color: ${SUAVE}; margin: 2px 0 0; }
  .derecha { margin-left: auto; text-align: right; color: ${SUAVE}; font-size: 8pt; }
  h2 { font-size: 9pt; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.07em;
       margin: 18px 0 6px; }
  p { margin: 0 0 6px; }
  .suave { color: ${SUAVE}; }
  .tenue { color: ${TENUE}; }
  .bien { color: ${BIEN}; font-weight: 600; }
  .mal { color: ${MAL}; font-weight: 600; }
  .entero { white-space: nowrap; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { font-weight: 600; font-size: 7.5pt; color: ${SUAVE}; text-align: left; padding: 5px 6px;
       border-bottom: 1px solid ${RAYA}; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 6px; border-bottom: 1px solid ${RAYA}; vertical-align: top; }
  td.numero, th.numero { text-align: right; white-space: nowrap; }
  td small, th small { display: block; color: ${TENUE}; font-size: 7.5pt; font-weight: 400;
                       text-transform: none; letter-spacing: 0; }
  .cifras { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .cifra { background: ${FONDO}; border-radius: 10px; padding: 9px 11px; break-inside: avoid; }
  .cifra .nombre { color: ${SUAVE}; font-size: 8pt; }
  .cifra .valor { font-size: 14pt; font-weight: 700; margin-top: 2px; }
  .cifra .cambio { font-size: 8pt; margin-top: 1px; }
  .frases { border-left: 3px solid ${color}; padding: 2px 0 2px 10px; margin: 12px 0 4px; }
  .marca { display: inline-block; border-radius: 4px; padding: 0 5px; font-size: 7.5pt; font-weight: 600;
           background: ${FONDO}; color: ${SUAVE}; }
  .aviso { background: ${FONDO}; border-radius: 10px; padding: 9px 11px; margin-top: 14px; font-size: 8pt;
           color: ${SUAVE}; break-inside: avoid; }
  .huella { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; font-size: 7pt; word-break: break-all; }
</style>
</head>
<body>
<header class="cabecera">
  ${logo === null ? `<div class="inicial">${escapar(inicial(doc.marca.nombreDelLocal))}</div>` : `<img class="logo" src="${escapar(logo)}" alt="">`}
  <div>
    <p class="titulo">${escapar(doc.titulo)}</p>
    <p class="subtitulo">${escapar(doc.marca.nombreDelLocal)} · ${escapar(doc.subtitulo)}</p>
  </div>
  <div class="derecha">${escapar(doc.hechoEl)}<br>Hecho con Estook</div>
</header>
${doc.cuerpo}
</body>
</html>`;
}

/**
 * El pie de cada página, que pone el motor: «Página 2 de 3». Va aparte porque lo
 * pinta el navegador fuera de la página, con sus propias reglas: estilo en línea y
 * letra pequeña, o no sale.
 */
export function pieDelDocumento(texto: string): string {
  return `<div style="width:100%;font-size:7px;color:${TENUE};padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>${escapar(texto)}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;
}

// ── Las piezas del cuerpo ────────────────────────────────────────────────────

export interface CifraDelDocumento {
  readonly nombre: string;
  readonly valor: string;
  /** «+12 %», «igual», o nulo sin periodo anterior. */
  readonly cambio: string | null;
  readonly bueno: boolean | null;
  /** Debajo del cambio: «frente a la semana anterior». */
  readonly frente?: string;
}

/** Las cifras en tarjetas, como el «Cómo va» de la app. */
export function lasCifras(cifras: readonly CifraDelDocumento[]): string {
  if (cifras.length === 0) return '<p class="suave">No hay cifras que enseñar en este periodo.</p>';
  return `<div class="cifras">${cifras
    .map((c) => {
      const clase = c.bueno === true ? 'bien' : c.bueno === false ? 'mal' : 'suave';
      const cambio =
        c.cambio === null
          ? '<div class="cambio tenue">Sin periodo con que comparar</div>'
          : `<div class="cambio"><span class="${clase}">${escapar(c.cambio)}</span>${c.frente === undefined ? '' : ` <span class="tenue">${escapar(c.frente)}</span>`}</div>`;
      return `<div class="cifra"><div class="nombre">${escapar(c.nombre)}</div><div class="valor">${escapar(c.valor)}</div>${cambio}</div>`;
    })
    .join('')}</div>`;
}

export interface Columna {
  readonly titulo: string;
  readonly numero?: boolean;
}

/**
 * Una tabla. Cada celda es texto (se escapa) o `{ html }` ya escrito con estas
 * mismas piezas, para lo que lleva dos líneas o una marca.
 */
export function unaTabla(
  columnas: readonly Columna[],
  filas: readonly (readonly (string | { readonly html: string })[])[],
): string {
  const cabecera = columnas
    .map((c) => `<th${c.numero === true ? ' class="numero"' : ''}>${escapar(c.titulo)}</th>`)
    .join('');
  const cuerpo = filas
    .map(
      (fila) =>
        `<tr>${fila
          .map((celda, i) => {
            const clase = columnas[i]?.numero === true ? ' class="numero"' : '';
            const dentro = typeof celda === 'string' ? escapar(celda) : celda.html;
            return `<td${clase}>${dentro}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');
  return `<table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table>`;
}

/** Una celda con su línea pequeña debajo: «Ana Ruiz» · «Cocinera». */
export function conDebajo(arriba: string, debajo: string | null): { html: string } {
  return {
    html: `${escapar(arriba)}${debajo === null || debajo === '' ? '' : `<small>${escapar(debajo)}</small>`}`,
  };
}

export function unTitulo(texto: string): string {
  return `<h2>${escapar(texto)}</h2>`;
}

export function unParrafo(texto: string, clase?: 'suave' | 'tenue'): string {
  return `<p${clase === undefined ? '' : ` class="${clase}"`}>${escapar(texto)}</p>`;
}

/** Las frases de un informe, con la raya del color del local. */
export function lasFrases(frases: readonly string[]): string {
  if (frases.length === 0) return '';
  return `<div class="frases">${frases.map((f) => `<p>${escapar(f)}</p>`).join('')}</div>`;
}

/** Una nota al final, en su recuadro: de dónde salen los datos, qué no se cuenta. */
export function unaNota(texto: string): string {
  return `<div class="aviso">${escapar(texto)}</div>`;
}

export function unaMarca(texto: string): string {
  return `<span class="marca">${escapar(texto)}</span>`;
}
