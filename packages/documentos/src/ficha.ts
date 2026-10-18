import {
  conDebajo,
  escapar,
  paginaDelDocumento,
  unaMarca,
  unaTabla,
  unParrafo,
  unTitulo,
  type MarcaDelDocumento,
} from './base.ts';

/**
 * La ficha técnica en papel (M9 · 2, decisión 0087).
 *
 * «La ficha es para camareros y cocineros sobre todo: los gramos del escandallo y los
 * pasos para hacer el plato, **sin euros**, para imprimir o llevarla en PDF» (Richi,
 * 16-oct). Así que aquí no entra ni un importe: **ni se pide**. Lo que llega son
 * nombres, cantidades ya escritas («180 g») y los pasos.
 */

export interface IngredienteEnPapel {
  readonly nombre: string;
  /** «180 g», «1 ud». */
  readonly cantidad: string;
  /** «picada fina», o nulo. */
  readonly nota: string | null;
  /** Si es una elaboración de la casa (la salsa): se marca, que tiene su propia ficha. */
  readonly esElaboracion: boolean;
}

export interface DatosDeLaFicha {
  readonly marca: MarcaDelDocumento;
  readonly hechoEl: string;
  readonly nombre: string;
  /** «Plato · Entrantes», «Elaboración · rinde 2 l». */
  readonly queEs: string;
  /** Un enlace a la foto del plato, o nulo. */
  readonly foto: string | null;
  readonly minutos: number | null;
  /** «8 ud por ración», o nulo. */
  readonly racion: string | null;
  /** Los nombres de los alérgenos, en el orden oficial. */
  readonly alergenos: readonly string[];
  /** De 0 a 3. */
  readonly picante: number;
  readonly ingredientes: readonly IngredienteEnPapel[];
  readonly pasos: readonly string[];
  /**
   * Un enlace a la foto de cada paso, en su orden, o nulo (0090). Sin ellas, los pasos
   * van solos, como antes.
   */
  readonly fotosDeLosPasos?: readonly (string | null)[];
  readonly notas: string | null;
}

const ESTILO = `
  .ficha { display: flex; gap: 16px; align-items: flex-start; margin-top: 14px; }
  .ficha .datos { flex: 1; }
  .ficha .foto { width: 180px; height: 135px; border-radius: 12px; object-fit: cover; }
  .datos-rapidos { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 4px; }
  .datos-rapidos .marca { font-size: 8.5pt; padding: 2px 8px; }
  .alergenos .marca { margin: 0 4px 4px 0; }
  .pica { color: #C62828; }
  ol.pasos { margin: 0; padding: 0; list-style: none; counter-reset: paso; }
  ol.pasos li { counter-increment: paso; position: relative; padding: 0 0 9px 30px; break-inside: avoid;
                font-size: 10.5pt; }
  ol.pasos li::before { content: counter(paso); position: absolute; left: 0; top: -1px; width: 20px; height: 20px;
                        border-radius: 10px; background: #F1EFEB; font-weight: 700; font-size: 8.5pt;
                        display: flex; align-items: center; justify-content: center; }
  ol.pasos li img { display: block; width: 220px; height: 150px; object-fit: cover; border-radius: 10px;
                    margin-top: 6px; }
  td.numero { font-size: 10.5pt; font-weight: 600; }
`;

/** Lo de dentro de una ficha: los datos rápidos, los alérgenos, lo que lleva y los pasos. */
function cuerpoDeLaFicha(datos: Omit<DatosDeLaFicha, 'marca' | 'hechoEl'>): string {
  const rapidos = [
    ...(datos.minutos === null ? [] : [`${String(datos.minutos)} min`]),
    ...(datos.racion === null ? [] : [datos.racion]),
  ];
  const pica =
    datos.picante > 0
      ? `<span class="marca pica">Pica${datos.picante > 1 ? ` · ${String(datos.picante)} de 3` : ''}</span>`
      : '';

  const cabecera = `
<div class="ficha">
  <div class="datos">
    ${rapidos.length === 0 && pica === '' ? '' : `<div class="datos-rapidos">${rapidos.map(unaMarca).join('')}${pica}</div>`}
    ${unTitulo('Alérgenos')}
    <div class="alergenos">${
      datos.alergenos.length === 0
        ? unParrafo('Ninguno de los catorce, según sus ingredientes.', 'suave')
        : datos.alergenos.map(unaMarca).join('')
    }</div>
  </div>
  ${datos.foto === null ? '' : `<img class="foto" src="${escapar(datos.foto)}" alt="">`}
</div>`;

  const ingredientes =
    datos.ingredientes.length === 0
      ? unParrafo('Todavía no tiene ingredientes.', 'suave')
      : unaTabla(
          [{ titulo: 'Ingrediente' }, { titulo: 'Cantidad', numero: true }],
          datos.ingredientes.map((i) => [
            conDebajo(
              i.nombre,
              [i.esElaboracion ? 'Elaboración' : null, i.nota]
                .filter((t): t is string => t !== null && t !== '')
                .join(' · '),
            ),
            i.cantidad,
          ]),
        );

  const pasos =
    datos.pasos.length === 0
      ? ''
      : `${unTitulo('Cómo se hace')}<ol class="pasos">${datos.pasos
          .map((p, i) => {
            const foto = datos.fotosDeLosPasos?.[i] ?? null;
            return `<li>${escapar(p)}${foto === null ? '' : `<img src="${escapar(foto)}" alt="">`}</li>`;
          })
          .join('')}</ol>`;

  const notas = datos.notas === null ? '' : `${unTitulo('Notas')}${unParrafo(datos.notas)}`;

  return `${cabecera}${unTitulo('Lo que lleva')}${ingredientes}${pasos}${notas}`;
}

export function documentoDeLaFicha(datos: DatosDeLaFicha): string {
  return paginaDelDocumento({
    titulo: datos.nombre,
    subtitulo: datos.queEs,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    estilo: ESTILO,
    cuerpo: cuerpoDeLaFicha(datos),
  });
}

// ── Todas las fichas, para encuadernarlas (M9 · 3, 0093) ─────────────────────

export interface DatosDeLasFichas {
  readonly marca: MarcaDelDocumento;
  readonly hechoEl: string;
  /** Por secciones de la carta, en su orden; «Sin sección» al final. */
  readonly secciones: readonly {
    readonly nombre: string;
    readonly fichas: readonly Omit<DatosDeLaFicha, 'marca' | 'hechoEl'>[];
  }[];
}

const ESTILO_DE_TODAS = `
  .indice { columns: 2; column-gap: 24px; margin-top: 12px; }
  .indice h2 { break-after: avoid; }
  .indice ol { margin: 0 0 8px; padding-left: 18px; }
  .indice li { padding: 1px 0; }
  .una { break-before: page; }
  .una .nombre { font-size: 15pt; font-weight: 700; margin: 0; }
  .una .que { color: #5B686C; margin: 2px 0 0; }
`;

/**
 * **El libro de fichas**: todas las fichas técnicas en un PDF, por secciones de la carta
 * y con un índice, para imprimirlas y encuadernarlas (Richi, 0093). Cada ficha empieza
 * en su hoja. Sin un euro, como cada ficha suelta.
 */
export function documentoDeLasFichas(datos: DatosDeLasFichas): string {
  const conFichas = datos.secciones.filter((s) => s.fichas.length > 0);
  const total = conFichas.reduce((suma, s) => suma + s.fichas.length, 0);
  const indice = `<div class="indice">${conFichas
    .map(
      (s) =>
        `${unTitulo(s.nombre)}<ol>${s.fichas.map((f) => `<li>${escapar(f.nombre)}</li>`).join('')}</ol>`,
    )
    .join('')}</div>`;
  const fichas = conFichas
    .flatMap((s) =>
      s.fichas.map(
        (f) =>
          `<section class="una"><p class="nombre">${escapar(f.nombre)}</p><p class="que">${escapar(f.queEs)}</p>${cuerpoDeLaFicha(f)}</section>`,
      ),
    )
    .join('');
  return paginaDelDocumento({
    titulo: 'Fichas técnicas',
    subtitulo: `${String(total)} ${total === 1 ? 'ficha' : 'fichas'}`,
    marca: datos.marca,
    hechoEl: datos.hechoEl,
    estilo: `${ESTILO}${ESTILO_DE_TODAS}`,
    cuerpo:
      total === 0
        ? unParrafo('Todavía no hay ninguna ficha técnica.', 'suave')
        : `${indice}${fichas}`,
  });
}
