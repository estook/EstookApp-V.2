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

// ── Las ocho apps: icono, acento, forma, destinos y vistas ───────────────────
export {
  APPS,
  MODULOS,
  PANEL,
  appPorId,
  appPorPermiso,
  comoSeLlamaElModulo,
  destinoPorId,
  destinosConstruidos,
  destinosQueLlegan,
  dondeEntra,
  dondeEntraEnElDestino,
  rutaDe,
  vistasConstruidas,
} from './apps.ts';
export type { App, Destino, Vista, FormaDeApp } from './apps.ts';

export { clases } from './clases.ts';

// ── Componentes base (B4) ────────────────────────────────────────────────────
export { Boton, Botones } from './componentes/Boton.tsx';
export type { BotonProps, TonoDeBoton, TamanoDeBoton } from './componentes/Boton.tsx';

export { Campo, CampoMoneda, Envoltorio, CAJA } from './componentes/Campo.tsx';
export { aCentimos } from './componentes/aCentimos.ts';
export type {
  CampoProps,
  CampoMonedaProps,
  TipoDeCampo,
  UnidadQueSeElige,
} from './componentes/Campo.tsx';

export { Selector, Interruptor } from './componentes/Selector.tsx';
export type { SelectorProps, InterruptorProps, Opcion } from './componentes/Selector.tsx';

export { Tarjeta, EnlaceDeTarjeta, Etiqueta, Avatar } from './componentes/Tarjeta.tsx';
export { inicialesDe, colorDe } from './componentes/iniciales.ts';
export { FotoDeProducto } from './componentes/FotoDeProducto.tsx';
export type { FotoDeProductoProps } from './componentes/FotoDeProducto.tsx';
export { Mosaico, Pieza, CLASES_DEL_MOSAICO } from './componentes/Mosaico.tsx';
export {
  usarFilasDelMosaico,
  FILA_DEL_MOSAICO,
  HUECO_DEL_MOSAICO,
} from './ganchos/usarFilasDelMosaico.ts';
export type { MosaicoProps, PiezaProps } from './componentes/Mosaico.tsx';
export { Proporcion } from './componentes/Proporcion.tsx';
export { Tira } from './componentes/Tira.tsx';
export { Tendencia } from './componentes/Tendencia.tsx';
export type { TendenciaProps } from './componentes/Tendencia.tsx';
export { Variacion } from './componentes/Variacion.tsx';
export type { VariacionProps } from './componentes/Variacion.tsx';
export { ElegirPeriodo } from './componentes/ElegirPeriodo.tsx';
export type { ElegirPeriodoProps } from './componentes/ElegirPeriodo.tsx';
export type { TiraProps, PuntoDeLaTira } from './componentes/Tira.tsx';
export type { ProporcionProps, Trozo } from './componentes/Proporcion.tsx';
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
export type {
  TablaProps,
  Columna,
  OrdenDeTabla,
  ListaProps,
  ElementoDeLista,
} from './componentes/Tabla.tsx';

export { Cifra } from './componentes/Cifra.tsx';
export { comoDeGrande } from './componentes/comoDeGrande.ts';
export type { CifraProps, SentidoDeLaComparacion } from './componentes/Cifra.tsx';

export { Grafica } from './componentes/Grafica.tsx';
export type { GraficaProps, SerieDeGrafica, FormaDeGrafica } from './componentes/Grafica.tsx';

export { Aviso, ErrorEnCristiano } from './componentes/Aviso.tsx';
export type { AvisoProps, TonoDeAviso, ErrorDeLaApi } from './componentes/Aviso.tsx';

export { EstadoVacio, NadaConEso, TodaviaNo } from './componentes/EstadoVacio.tsx';
export type {
  EstadoVacioProps,
  NadaConEsoProps,
  TodaviaNoProps,
} from './componentes/EstadoVacio.tsx';

// ── Los dibujos de los vacíos (entrega V, punto 4): cada uno en su trozo ─────
export { Dibujo } from './componentes/Dibujo.tsx';
export type { DibujoProps } from './componentes/Dibujo.tsx';
export { NOMBRES_DE_LOS_DIBUJOS, PARA_QUE_ES } from './dibujos/catalogo.ts';
export type { NombreDelDibujo } from './dibujos/catalogo.ts';

export { Cargando, Esqueleto, TarjetaCargando } from './componentes/Cargando.tsx';

export { Migas, Paginador } from './componentes/Migas.tsx';
export type { MigasProps, Camino, Paso, PaginadorProps } from './componentes/Migas.tsx';

export { Deshacer } from './componentes/Deshacer.tsx';
export { SiAlgoFalla, esUnTrozoQueNoLlega } from './componentes/SiAlgoFalla.tsx';
export type { SiAlgoFallaProps } from './componentes/SiAlgoFalla.tsx';

// ── Navegacion (B5) ──────────────────────────────────────────────────────────
export { BarraMovil, BarraDeApp } from './navegacion/BarraMovil.tsx';
export type { BarraMovilProps, BarraDeAppProps } from './navegacion/BarraMovil.tsx';

export { BarraArribaMovil } from './navegacion/BarraArribaMovil.tsx';
export type { BarraArribaMovilProps } from './navegacion/BarraArribaMovil.tsx';

export { BarraEscritorio } from './navegacion/BarraEscritorio.tsx';
export type { BarraEscritorioProps } from './navegacion/BarraEscritorio.tsx';

export { RuedaDeApps } from './navegacion/RuedaDeApps.tsx';
export type { RuedaDeAppsProps } from './navegacion/RuedaDeApps.tsx';

// ── El Panel de cada uno (Manifiesto 6) ──────────────────────────────────────
export {
  CUANTO_OCUPA,
  PANEL_DEL_PUESTO,
  NOMBRE_DEL_PUESTO,
  elPuestoDe,
  elPanelDeFabrica,
  WIDGETS,
  cuandoLlega,
  loQueSePuedeAnadir,
  elCatalogoParaAnadir,
  GRUPO_DEL_WIDGET,
  NOMBRE_DEL_GRUPO,
  loQueSePuedePintar,
  losQueLlegan,
  acentoDelWidget,
  appDelWidget,
  widgetPorId,
  losIndicadoresQueSePuedenTener,
} from './panel/catalogo.ts';
export type { TamanoDeWidget, Widget, WidgetPuesto, Puesto } from './panel/catalogo.ts';

export { TarjetaDeIndicador } from './panel/TarjetaDeIndicador.tsx';
export { comoSeEscribe } from './panel/comoSeEscribe.ts';
export type { TarjetaDeIndicadorProps, DatosDelIndicador } from './panel/TarjetaDeIndicador.tsx';
export { Rejilla } from './panel/Rejilla.tsx';
export type { RejillaProps } from './panel/rejilla.ts';
export { usarQueEstaVacio } from './ganchos/usarQueEstaVacio.ts';
export { usarSinNadaDentro } from './ganchos/usarSinNadaDentro.ts';
export { usarAnclaAbajo } from './ganchos/usarAnclaAbajo.ts';
export { comoQuedaAbajo } from './navegacion/anclaAbajo.ts';

export { MenuLateral } from './navegacion/MenuLateral.tsx';
export type { MenuLateralProps } from './navegacion/MenuLateral.tsx';

export { Vistas } from './navegacion/Vistas.tsx';
export type { VistasProps } from './navegacion/Vistas.tsx';

export { sectores, sectorEn, anguloDe, puntoEn, caminoDeSector } from './navegacion/geometria.ts';
export type { Sector } from './navegacion/geometria.ts';

// ── El buscador universal (B5) ───────────────────────────────────────────────
export { Buscador } from './buscar/Buscador.tsx';
export type { BuscadorProps, Accion, ResultadoDeBusqueda } from './buscar/Buscador.tsx';
export { parecido, trigramas, sinAcentos, filtrarPorParecido, UMBRAL } from './buscar/trigramas.ts';

// ── Ganchos ──────────────────────────────────────────────────────────────────
export { usarDeshacer, SEGUNDOS_PARA_DESHACER } from './ganchos/usarDeshacer.tsx';
export { ProveedorDeDeshacer } from './componentes/ProveedorDeDeshacer.tsx';
export type { AccionQueSePuedeDeshacer, FalloQueHayQueDecir } from './ganchos/usarDeshacer.tsx';

/* ── El aspecto: el tema y el color del local (M6½) ────────────────────────── */
export {
  COMO_SE_LLAMA_EL_TEMA,
  QUE_HACE_CADA_TEMA,
  TEMAS,
  esTema,
  usarSeVeOscuro,
  usarTema,
} from './ganchos/usarTema.ts';
export type { Tema } from './ganchos/usarTema.ts';
export { usarElColorDeLaApp } from './ganchos/usarElColorDeLaApp.ts';
export {
  CONTRASTE_DE_COCINA,
  CONTRASTE_DE_ICONO,
  CONTRASTE_DE_TEXTO,
  acentoParaTexto,
  contraste,
  derivarAcento,
  esColorHex,
  loQueSeLeeEncima,
  luminancia,
  mezclar,
} from './color.ts';
export type { AcentoPintable, ColorHex, DondeSePinta } from './color.ts';

export {
  usarTamanoDeLetra,
  esTamanoDeLetra,
  TAMANOS,
  COMO_SE_LLAMA,
  CUANTO_MULTIPLICA,
} from './ganchos/usarTamanoDeLetra.ts';
export type { TamanoDeLetra } from './ganchos/usarTamanoDeLetra.ts';

export { usarModoCocina, usarSeVeEnModoCocina } from './ganchos/usarModoCocina.ts';

export {
  usarMedia,
  usarMovimientoReducido,
  usarEsEscritorio,
  CORTE_DE_ESCRITORIO,
} from './ganchos/usarMedia.ts';

export { usarAtajos } from './ganchos/usarAtajos.ts';
export type { Atajos } from './ganchos/usarAtajos.ts';
