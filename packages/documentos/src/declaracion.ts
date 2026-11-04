import { escapar, paginaDelDocumento, unaNota, unTitulo } from './base.ts';

/**
 * La declaración responsable de Estook, en papel (T6 · 1, decisión 0126; Anexo 4.14).
 *
 * Lo que pide el artículo 15 de la Orden HAC/1177/2024, en su orden. **La app la enseña, no la
 * redacta**: la frase de cumplimiento la escribe el asesor, y hasta que esté escrita y firmada
 * sale con «BORRADOR» encima, sin una fecha ni un lugar que no sean verdad.
 *
 * Con Verifacti, **los registros llevan la identificación de Verifacti como sistema**, no la de
 * Estook (lo dice su documentación, mirada el 4-nov-2026): por eso aquí va como componente
 * externo, con su versión de ese momento, que se lee de su API.
 */

export interface DeclaracionResponsable {
  /** Sin el texto del asesor, sin firmar o sin los datos del productor: un borrador. */
  readonly borrador: boolean;
  readonly sistema: {
    readonly nombre: string;
    readonly id: string;
    readonly version: string;
  };
  readonly componentes: readonly { readonly nombre: string; readonly queHace: string }[];
  readonly verifacti: {
    readonly nombre: string;
    readonly id: string;
    readonly version: string;
    readonly url: string;
  } | null;
  readonly soloVerifactu: true;
  readonly variosObligados: true;
  readonly firma: string;
  readonly productor: {
    readonly nombre: string | null;
    readonly nif: string | null;
    readonly direccion: string | null;
  };
  readonly cumplimiento: string;
  readonly firmadaEl: string | null;
  readonly lugar: string | null;
}

const ESTILO = `
  .borrador { border: 2px solid #C62828; color: #C62828; font-weight: 700; letter-spacing: 0.12em;
              text-align: center; padding: 6px; border-radius: 8px; margin: 10px 0 4px; }
  dl.dr { display: grid; grid-template-columns: 34% 1fr; gap: 6px 14px; margin: 10px 0; font-size: 10.5pt; }
  dl.dr dt { color: #6B6560; }
  dl.dr dd { margin: 0; font-weight: 600; }
  ul.componentes { margin: 4px 0 0; padding-left: 16px; font-size: 10.5pt; }
  ul.componentes li { margin-bottom: 4px; }
  .cumplimiento { font-size: 11pt; line-height: 1.5; margin-top: 8px; }
`;

const oFalta = (texto: string | null) =>
  texto === null || texto.trim() === '' ? 'Sin rellenar' : texto;

/** La página de la declaración, lista para el motor de los PDF. */
export function documentoDeLaDeclaracion(datos: DeclaracionResponsable, hechoEl: string): string {
  const fila = (que: string, valor: string) => `<dt>${escapar(que)}</dt><dd>${escapar(valor)}</dd>`;
  const cuerpo = [
    datos.borrador
      ? '<div class="borrador">BORRADOR · SIN VALIDEZ HASTA QUE LO FIRME EL PRODUCTOR</div>'
      : '',
    unTitulo('El sistema informático de facturación'),
    `<dl class="dr">${[
      fila('Nombre', datos.sistema.nombre),
      fila('Código identificador', datos.sistema.id),
      fila('Versión', datos.sistema.version),
      fila('Funciona solo como VERI*FACTU', 'Sí'),
      fila('Sirve a varios obligados tributarios', 'Sí'),
      fila('Firma', datos.firma),
    ].join('')}</dl>`,
    unTitulo('Sus componentes'),
    `<ul class="componentes">${datos.componentes
      .map((c) => `<li><strong>${escapar(c.nombre)}</strong>: ${escapar(c.queHace)}</li>`)
      .join('')}</ul>`,
    unTitulo('El componente externo'),
    datos.verifacti === null
      ? unaNota(
          'Verifacti (Bilbabit SL). Su versión vigente no se ha podido leer ahora: está en su declaración responsable.',
        )
      : `<dl class="dr">${[
          fila('Quién', 'Verifacti (Bilbabit SL), colaborador social de la AEAT'),
          fila('Su sistema', `${datos.verifacti.nombre} · ${datos.verifacti.id}`),
          fila('Su versión', datos.verifacti.version),
          fila('Su declaración', datos.verifacti.url),
        ].join('')}</dl>`,
    unTitulo('Quién lo produce'),
    `<dl class="dr">${[
      fila('Nombre o razón social', oFalta(datos.productor.nombre)),
      fila('NIF', oFalta(datos.productor.nif)),
      fila('Dirección de contacto', oFalta(datos.productor.direccion)),
    ].join('')}</dl>`,
    unTitulo('Declaración'),
    `<p class="cumplimiento">${escapar(datos.cumplimiento)}</p>`,
    `<dl class="dr">${[
      fila('Fecha', oFalta(datos.firmadaEl)),
      fila('Lugar', oFalta(datos.lugar)),
    ].join('')}</dl>`,
  ].join('');

  return paginaDelDocumento({
    titulo: 'Declaración responsable',
    subtitulo: `${datos.sistema.nombre} · versión ${datos.sistema.version}`,
    marca: { nombreDelLocal: 'Estook', color: null, logo: null },
    hechoEl,
    cuerpo,
    estilo: ESTILO,
  });
}
