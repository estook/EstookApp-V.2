/**
 * @estook/ui · el sistema de diseno y los componentes base (M3, Parte B).
 *
 * «Esta parte existe para que la interfaz no se invente pantalla a pantalla.
 * Todo lo visual sale de aqui.»
 *
 * Los estilos van aparte, porque son CSS y no TypeScript:
 *
 *   import '@estook/ui/estilos';
 *
 * Y con eso entran las fichas de B1, Montserrat autoalojada, la base y el
 * movimiento de B6. Una aplicacion no escribe CSS propio.
 *
 * «Nadie escribe un componente nuevo sin justificarlo» (B4). Si algo hace falta y
 * no esta, se anade aqui, no en la pantalla: es lo unico que evita que en dos
 * anos haya cuatro botones distintos.
 */

// ── Las ocho apps: icono, acento, pestanas ───────────────────────────────────
export { APPS, PANEL, appPorId, appPorPermiso } from './apps.ts';
export type { App } from './apps.ts';

export { clases } from './clases.ts';

// ── Componentes base (B4) ────────────────────────────────────────────────────
export { Boton, Botones } from './componentes/Boton.tsx';
export type { BotonProps, TonoDeBoton, TamanoDeBoton } from './componentes/Boton.tsx';

export { Campo, CampoMoneda, Envoltorio, aCentimos, CAJA } from './componentes/Campo.tsx';
export type { CampoProps, CampoMonedaProps, TipoDeCampo } from './componentes/Campo.tsx';

export { Selector, Interruptor } from './componentes/Selector.tsx';
export type { SelectorProps, InterruptorProps, Opcion } from './componentes/Selector.tsx';

export { Tarjeta, Etiqueta, Avatar, inicialesDe, colorDe } from './componentes/Tarjeta.tsx';
export type {
  TarjetaProps,
  EtiquetaProps,
  AvatarProps,
  TonoDeEtiqueta,
} from './componentes/Tarjeta.tsx';

export { Hoja, PanelLateral } from './componentes/Hoja.tsx';

export { Logo, IconoDeFogon, IMAGENES_DE_MARCA } from './componentes/Marca.tsx';
export type { LogoProps, IconoDeFogonProps } from './componentes/Marca.tsx';

export { Tabla, Lista } from './componentes/Tabla.tsx';
export type { TablaProps, Columna, ListaProps, ElementoDeLista } from './componentes/Tabla.tsx';

export { Cifra } from './componentes/Cifra.tsx';
export type { CifraProps, SentidoDeLaComparacion } from './componentes/Cifra.tsx';

export { Grafica } from './componentes/Grafica.tsx';
export type { GraficaProps, SerieDeGrafica, FormaDeGrafica } from './componentes/Grafica.tsx';

export { Aviso, ErrorEnCristiano } from './componentes/Aviso.tsx';
export type { AvisoProps, TonoDeAviso, ErrorDeLaApi } from './componentes/Aviso.tsx';

export { EstadoVacio, TodaviaNo } from './componentes/EstadoVacio.tsx';
export type { EstadoVacioProps, TodaviaNoProps } from './componentes/EstadoVacio.tsx';

export { Cargando, Esqueleto, TarjetaCargando } from './componentes/Cargando.tsx';

export { Migas, Paginador } from './componentes/Migas.tsx';
export type { MigasProps, Camino, Paso, PaginadorProps } from './componentes/Migas.tsx';

export { Deshacer } from './componentes/Deshacer.tsx';

// ── Navegacion (B5) ──────────────────────────────────────────────────────────
export { BarraMovil, BarraDeApp } from './navegacion/BarraMovil.tsx';
export type { BarraMovilProps, BarraDeAppProps } from './navegacion/BarraMovil.tsx';

export { BarraEscritorio } from './navegacion/BarraEscritorio.tsx';
export type { BarraEscritorioProps } from './navegacion/BarraEscritorio.tsx';

export { RuedaDeApps } from './navegacion/RuedaDeApps.tsx';
export type { RuedaDeAppsProps } from './navegacion/RuedaDeApps.tsx';

export { sectores, sectorEn, anguloDe, puntoEn, caminoDeSector } from './navegacion/geometria.ts';
export type { Sector } from './navegacion/geometria.ts';

// ── El buscador universal (B5) ───────────────────────────────────────────────
export { Buscador } from './buscar/Buscador.tsx';
export type { BuscadorProps, Accion, ResultadoDeBusqueda } from './buscar/Buscador.tsx';
export { parecido, trigramas, sinAcentos, filtrarPorParecido, UMBRAL } from './buscar/trigramas.ts';

// ── Ganchos ──────────────────────────────────────────────────────────────────
export {
  ProveedorDeDeshacer,
  usarDeshacer,
  SEGUNDOS_PARA_DESHACER,
} from './ganchos/usarDeshacer.tsx';
export type { AccionQueSePuedeDeshacer } from './ganchos/usarDeshacer.tsx';

export {
  usarTamanoDeLetra,
  esTamanoDeLetra,
  TAMANOS,
  COMO_SE_LLAMA,
  CUANTO_MULTIPLICA,
} from './ganchos/usarTamanoDeLetra.ts';
export type { TamanoDeLetra } from './ganchos/usarTamanoDeLetra.ts';

export {
  usarMedia,
  usarMovimientoReducido,
  usarEsEscritorio,
  CORTE_DE_ESCRITORIO,
} from './ganchos/usarMedia.ts';

export { usarAtajos } from './ganchos/usarAtajos.ts';
export type { Atajos } from './ganchos/usarAtajos.ts';
