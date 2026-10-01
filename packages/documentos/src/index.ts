/**
 * @estook/documentos · las plantillas de los documentos de Estook (0068).
 *
 * Cada documento es una página HTML hecha con la misma base: la cabecera con el logo
 * y el color del local, la letra de la app incrustada, las tablas y el pie. **Aquí no
 * se hace ningún PDF**: lo hace el servidor con su motor (regla 7), y nunca el
 * navegador de quien lo pide.
 */
export {
  COLOR_DE_ESTOOK,
  colorSeguro,
  conDebajo,
  escapar,
  lasCifras,
  lasFrases,
  paginaDelDocumento,
  pieDelDocumento,
  unaMarca,
  unaNota,
  unaTabla,
  unParrafo,
  unTitulo,
  type CifraDelDocumento,
  type Columna,
  type Documento,
  type MarcaDelDocumento,
} from './base.ts';
export { documentoDelInforme, type DatosDelInforme, type LineaDelSemaforo } from './informe.ts';
export {
  documentoDelRegistro,
  type CorreccionEnElRegistro,
  type DatosDelRegistro,
  type FilaDelRegistro,
  type TotalDelRegistro,
} from './registro-de-jornada.ts';
export {
  documentoDeMiHorario,
  documentoDelHorario,
  type DatosDeMiHorario,
  type DatosDelHorario,
  type DiaDeMiHorario,
  type DiaDelHorario,
  type FilaDelHorario,
  type GrupoDelHorario,
} from './horario.ts';
export { MONTSERRAT_WOFF2_BASE64 } from './letra.ts';

export const PAQUETE = '@estook/documentos' as const;
