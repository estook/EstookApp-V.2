/**
 * Los indicadores del Panel · «añadir los nuestros» (M7, decisión 0039).
 *
 * ── Qué es un indicador, y qué no ────────────────────────────────────────────
 *
 * Una cifra del negocio **con su periodo, su comparación y su tendencia**: «Ventas
 * de los últimos 7 días, 4.210 €, un 12 % más que los 7 anteriores», con la línea
 * de los días debajo. Es la tarjeta que ponen Square, Shopify o Stripe en su
 * resumen, y la que Richi pedía con «gráficas y flechas de subida y bajada».
 *
 * No es un generador libre de gráficas. **Cada indicador sale de un dato que Estook
 * ya guarda y con un dueño**: las ventas del cierre de caja, la merma del libro, lo
 * que entra por los albaranes, las horas del fichaje. Un indicador que hubiera que
 * teclear, o que sumara cosas de dos sitios que no cuadran, sería una cifra
 * inventada con buena pinta.
 *
 * ── Por qué vive aquí ────────────────────────────────────────────────────────
 *
 * Lo usan tres sitios que tienen que decir lo mismo: el servidor, que valida cuál
 * se pide y hace las cuentas; el catálogo de widgets, que lo ofrece con su nombre;
 * y la tarjeta, que decide si subir es bueno. Tres copias serían tres respuestas
 * (regla 6).
 *
 * ── Y desde V, también en cada app ──────────────────────────────────────────
 *
 * «Flechas y gráficas pequeñas también en Inventario, Servicio y Equipo» (mejora 2).
 * No se copió la tarjeta: **es la misma**, con las cifras de cada app, y por eso
 * se añadieron aquí las seis que faltaban —valor de la cámara, bajo mínimo,
 * cierres, horas del equipo, coste de personal y retrasos— con la misma forma que
 * las seis de antes. Cualquiera de las doce se puede poner también en el Panel.
 */

import { porcentajeDe } from './cierre.ts';
import { cantidad, costeDeLinea, milesimas } from './coste.ts';
import { comoEsta, urgenciaDe } from './inventario.ts';

export const INDICADORES = [
  'ventas',
  'ticket-medio',
  'food-cost',
  'merma',
  'compras',
  'mis-horas',
  // ── V · las que traen las apps (mejora 2) ─────────────────────────────────
  'valor-camara',
  'bajo-minimo',
  'cierres',
  'horas-equipo',
  'coste-personal',
  'retrasos',
] as const;

export type Indicador = (typeof INDICADORES)[number];

/** Los periodos que se ofrecen: la semana y el mes, que son los que se hablan. */
export const PERIODOS_DEL_INDICADOR = [7, 30] as const;

export type PeriodoDelIndicador = (typeof PERIODOS_DEL_INDICADOR)[number];

/**
 * En qué se cuenta.
 *
 * `cuenta` es un número de cosas —productos, retrasos— y `dias` es cuántos días
 * del periodo, que se escribe «5 de 7». Las dos cambian **en unidades** y no en
 * por ciento: pasar de 2 retrasos a 3 no es «un 50 % más», es uno más, y con
 * números pequeños el por ciento exagera todo.
 */
export type UnidadDelIndicador = 'dinero' | 'porcentaje' | 'minutos' | 'cuenta' | 'dias';

/** Si que suba es buena noticia. Es lo que pinta la flecha en verde o en rojo. */
export type SentidoDelIndicador = 'sube_es_bueno' | 'baja_es_bueno' | 'neutro';

export interface ComoEsElIndicador {
  readonly nombre: string;
  /** En una frase, para el catálogo. */
  readonly queEnsena: string;
  readonly unidad: UnidadDelIndicador;
  readonly sentido: SentidoDelIndicador;
  /** De dónde sale, para el pie de la tarjeta (E1: toda cifra lleva su origen). */
  readonly deDonde: string;
  /**
   * Cómo se junta el periodo.
   *
   * `suma` para lo que se acumula —lo vendido, lo tirado—. `cociente` para lo que
   * es una proporción: el food cost de la semana **no es la media de siete
   * porcentajes**, es lo gastado entre lo vendido de los siete días. Un martes de
   * 40 € no pesa lo mismo que un sábado de 3.000.
   *
   * `foto` para lo que **no se acumula, se tiene**: el valor de la cámara de la
   * semana no es la suma de siete valores —eso contaría siete veces el mismo
   * género—, es lo que había al final. Y se compara con lo que había al final del
   * periodo anterior.
   */
  readonly periodo: 'suma' | 'cociente' | 'foto';
  /**
   * Cómo se dibujan los días. La línea contesta «¿hacia dónde va?»; las barras,
   * «¿qué días sí y qué días no?», que es la pregunta de los cierres: una línea
   * que sube y baja entre cero y uno no dice nada.
   */
  readonly grafica: 'linea' | 'barras';
  /**
   * Si un día sin apuntes vale cero o «no se sabe».
   *
   * Un día sin caja cerrada **no vendió cero**: no se sabe, y la línea se corta.
   * Un día sin merma apuntada sí es cero, porque el libro está siempre. Lo usan el
   * servidor, para rellenar los días, y la tarjeta, para no decir «0 de 7 días
   * con dato» de una semana sin merma, que es una buena semana.
   */
  readonly sinDatoEsCero: boolean;
}

export const COMO_ES_EL_INDICADOR: Readonly<Record<Indicador, ComoEsElIndicador>> = {
  ventas: {
    nombre: 'Ventas',
    queEnsena: 'Lo facturado, día a día, y cómo va frente al periodo anterior',
    unidad: 'dinero',
    sentido: 'sube_es_bueno',
    deDonde: 'De tus cierres de caja, con IVA',
    periodo: 'suma',
    grafica: 'linea',
    sinDatoEsCero: false,
  },
  'ticket-medio': {
    nombre: 'Ticket medio',
    queEnsena: 'Lo que deja cada ticket, en los días que se apuntaron',
    unidad: 'dinero',
    sentido: 'sube_es_bueno',
    deDonde: 'Cierres de caja con tickets apuntados',
    periodo: 'cociente',
    grafica: 'linea',
    sinDatoEsCero: false,
  },
  'food-cost': {
    nombre: 'Food cost',
    queEnsena: 'Lo que se va en género de cada cien euros que entran',
    unidad: 'porcentaje',
    sentido: 'baja_es_bueno',
    deDonde: 'Género gastado entre lo vendido, en días con caja cerrada',
    periodo: 'cociente',
    grafica: 'linea',
    sinDatoEsCero: false,
  },
  merma: {
    nombre: 'Merma',
    queEnsena: 'Lo que se ha tirado, a coste, y si va a más o a menos',
    unidad: 'dinero',
    sentido: 'baja_es_bueno',
    deDonde: 'Del libro de movimientos, a precio medio',
    periodo: 'suma',
    grafica: 'linea',
    sinDatoEsCero: true,
  },
  compras: {
    nombre: 'Compras',
    queEnsena: 'Lo que ha entrado de género, a lo que costó y sin IVA',
    unidad: 'dinero',
    sentido: 'neutro',
    deDonde: 'Entradas del libro, a precio de compra sin IVA',
    periodo: 'suma',
    grafica: 'linea',
    sinDatoEsCero: true,
  },
  'mis-horas': {
    nombre: 'Mis horas',
    queEnsena: 'Lo que has trabajado cada día, contado por tus fichajes',
    unidad: 'minutos',
    sentido: 'neutro',
    deDonde: 'De tus fichajes',
    periodo: 'suma',
    grafica: 'linea',
    sinDatoEsCero: true,
  },

  // ── Inventario ────────────────────────────────────────────────────────────
  'valor-camara': {
    nombre: 'Valor de la cámara',
    queEnsena: 'Lo que vale el género que tienes, y cómo ha ido cambiando',
    unidad: 'dinero',
    // Más género no es mejor ni peor: puede ser una buena compra o dinero parado.
    sentido: 'neutro',
    // La misma cuenta que «Lo que hay en cámara» de Inventario · Hoy, que es su
    // dueña: una prueba compara las dos.
    deDonde: 'A precio medio, sin IVA; lo que entró sin coste, a su precio de hoy',
    periodo: 'foto',
    grafica: 'linea',
    // Lo que hay se sabe siempre: un día sin movimientos vale lo mismo que el anterior.
    sinDatoEsCero: true,
  },
  'bajo-minimo': {
    nombre: 'Bajo mínimo',
    queEnsena: 'Los productos por debajo de su mínimo o que se han acabado',
    unidad: 'cuenta',
    sentido: 'baja_es_bueno',
    // Los mínimos no tienen historia: se guardan como están hoy. Los días de antes
    // se cuentan con ellos, y se dice.
    deDonde: 'Tu género de cada día, con los mínimos de hoy',
    periodo: 'foto',
    grafica: 'linea',
    sinDatoEsCero: true,
  },

  // ── Servicio ──────────────────────────────────────────────────────────────
  cierres: {
    nombre: 'Cajas cerradas',
    queEnsena: 'Cuántos días del periodo se cerró la caja',
    unidad: 'dias',
    sentido: 'sube_es_bueno',
    deDonde: 'De tus cierres de caja',
    periodo: 'suma',
    grafica: 'barras',
    sinDatoEsCero: true,
  },

  // ── Equipo ────────────────────────────────────────────────────────────────
  'horas-equipo': {
    nombre: 'Horas del equipo',
    queEnsena: 'Lo que ha trabajado en este local la gente que llevas',
    unidad: 'minutos',
    sentido: 'neutro',
    // Las mismas horas que Equipo · Resumen, con la misma gente: una prueba lo vigila.
    deDonde: 'De los fichajes de quien llevas, en este local',
    periodo: 'suma',
    grafica: 'linea',
    sinDatoEsCero: true,
  },
  'coste-personal': {
    nombre: 'Coste de personal',
    queEnsena: 'Lo que cuestan las horas fichadas, con lo que cobra cada uno',
    unidad: 'dinero',
    // Sube con las ventas en un buen mes: sin ponerlo al lado de lo vendido no es
    // ni bueno ni malo, y eso lo hará Negocio (M21).
    sentido: 'neutro',
    deDonde: 'Horas fichadas por lo que cuesta la hora de cada uno; sin salario puesto no cuenta',
    periodo: 'suma',
    grafica: 'linea',
    sinDatoEsCero: true,
  },
  retrasos: {
    nombre: 'Retrasos',
    queEnsena: 'Las entradas que llegan tarde frente al horario de siempre',
    unidad: 'cuenta',
    sentido: 'baja_es_bueno',
    deDonde: 'Fichajes frente al horario de siempre de cada uno',
    periodo: 'suma',
    grafica: 'barras',
    // Un día en el que nadie tenía que entrar no tiene retrasos «cero»: no se
    // sabe. Si no, un equipo sin horarios puestos saldría perfecto.
    sinDatoEsCero: false,
  },
};

// ── Las cifras de cada app ──────────────────────────────────────────────────

/** Las apps que enseñan sus cifras en su primera pantalla (mejora 2). */
export type AppConCifras = 'inventario' | 'servicio' | 'equipo';

/**
 * Qué cifras enseña cada app, en su orden.
 *
 * **Son siempre las mismas**, y cada persona ve las que su rol le deja: lo decidió
 * Richi el 23 de septiembre de 2026. El sitio para elegir y colocar las tuyas ya
 * existe y es el Panel; dos sitios que hacen lo mismo acaban haciéndolo distinto.
 */
export const LAS_CIFRAS_DE: Readonly<Record<AppConCifras, readonly Indicador[]>> = {
  inventario: ['valor-camara', 'merma', 'compras', 'bajo-minimo'],
  servicio: ['ventas', 'ticket-medio', 'food-cost', 'cierres'],
  equipo: ['horas-equipo', 'coste-personal', 'retrasos'],
};

export function esIndicador(valor: unknown): valor is Indicador {
  return typeof valor === 'string' && (INDICADORES as readonly string[]).includes(valor);
}

export function esPeriodoDelIndicador(valor: unknown): valor is PeriodoDelIndicador {
  return valor === 7 || valor === 30;
}

// ── El identificador del widget ─────────────────────────────────────────────

/**
 * El identificador de un indicador puesto en el Panel: `indicador-ventas-7`.
 *
 * ── Por qué lo que se ha elegido va en el identificador ─────────────────────
 *
 * Porque así **no hace falta tocar cómo se guarda el Panel**. La lista guardada
 * es de identificadores y tamaños desde la 0025, el servidor no los valida —el
 * catálogo es navegación— y el formato ya admite minúsculas, cifras y guiones.
 * Un indicador con sus opciones es un identificador más.
 *
 * Y de paso se consigue lo correcto sin escribirlo: **no se puede poner dos veces
 * el mismo indicador con el mismo periodo**, porque el Panel no repite
 * identificadores. «Ventas 7 días» y «Ventas 30 días», sí: son dos preguntas.
 */
export function idDelIndicador(indicador: Indicador, dias: PeriodoDelIndicador): string {
  return `indicador-${indicador}-${dias}`;
}

export function leerIdDelIndicador(
  id: string,
): { readonly indicador: Indicador; readonly dias: PeriodoDelIndicador } | null {
  const partes = /^indicador-([a-z-]+)-(\d+)$/.exec(id);
  if (partes === null) return null;
  const indicador = partes[1];
  const dias = Number(partes[2]);
  if (!esIndicador(indicador) || !esPeriodoDelIndicador(dias)) return null;
  return { indicador, dias };
}

/** «Ventas · 7 días». Es el título de la tarjeta y su nombre en el catálogo. */
export function nombreDelIndicador(indicador: Indicador, dias: PeriodoDelIndicador): string {
  return `${COMO_ES_EL_INDICADOR[indicador].nombre} · ${dias} días`;
}

// ── Cómo ha cambiado ────────────────────────────────────────────────────────

export interface CambioDelIndicador {
  /** Verdadero si sube, falso si baja, nulo si está igual. */
  readonly sube: boolean | null;
  /**
   * Cuánto, en positivo y con un decimal.
   *
   * En **por ciento** para dinero y horas, y en **puntos** para lo que ya es un
   * porcentaje: que el food cost pase del 30 % al 33 % es «3 puntos», no «un 10 %
   * más». Decirlo en por ciento de un por ciento es la forma más rápida de que
   * nadie entienda la flecha.
   *
   * Y en **unidades** para lo que se cuenta: de 2 retrasos a 3 es «uno más».
   */
  readonly cuanto: number;
  readonly en: 'por_ciento' | 'puntos' | 'unidades';
  /** Si es buena noticia. Nulo cuando el indicador es neutro o no se mueve. */
  readonly bueno: boolean | null;
}

/** En qué se dice cuánto ha cambiado cada unidad. */
function enQueCambia(unidad: UnidadDelIndicador): CambioDelIndicador['en'] {
  if (unidad === 'porcentaje') return 'puntos';
  if (unidad === 'cuenta' || unidad === 'dias') return 'unidades';
  return 'por_ciento';
}

/**
 * Cómo ha cambiado frente al periodo anterior, o nulo si no se puede decir.
 *
 * Nulo cuando falta alguno de los dos, y **nulo también cuando el anterior es
 * cero** en lo que se mide en por ciento: de 0 € a 40 € no es «un infinito por
 * ciento más», es que antes no había. Una flecha que no se puede calcular no se
 * pinta. En unidades sí se puede: de ningún retraso a dos son dos más.
 */
export function comoCambia(
  indicador: Indicador,
  actual: number | null,
  anterior: number | null,
): CambioDelIndicador | null {
  if (actual === null || anterior === null) return null;
  const como = COMO_ES_EL_INDICADOR[indicador];
  const en = enQueCambia(como.unidad);

  // El redondeo a un decimal es el de `porcentajeDe`, que es su dueño (regla 9).
  // En puntos, la diferencia «sobre cien» es la propia diferencia con un decimal.
  const diferencia = Math.abs(actual - anterior);
  const cuanto =
    en === 'unidades'
      ? diferencia
      : en === 'puntos'
        ? porcentajeDe(diferencia, 100)
        : porcentajeDe(diferencia, anterior);
  if (cuanto === null) return null;

  const sube = cuanto === 0 ? null : actual > anterior;
  const bueno =
    sube === null || como.sentido === 'neutro'
      ? null
      : como.sentido === 'sube_es_bueno'
        ? sube
        : !sube;

  return { sube, cuanto, en, bueno };
}

// ── La foto de la cámara, día a día ─────────────────────────────────────────

/**
 * Una línea del libro de un producto, con lo que dejó: cuánto quedó y a qué coste
 * medio, en milésimas. Son `cantidad_despues` y `coste_medio_despues`.
 */
export interface LineaDelLibro {
  /** El orden en el libro. Es el que manda, no la fecha (0023). */
  readonly orden: number;
  readonly cantidad: number;
  readonly costeMedio: number;
}

/** Un producto de la cámara, con lo que hace falta para reconstruir sus días. */
export interface ProductoDeLaFoto {
  /**
   * El primer día en el que existe. Antes no cuenta, **ni como agotado**: un
   * producto dado de alta el jueves no estaba «sin nada» el lunes, no existía.
   */
  readonly desde: string;
  readonly minimo: number | null;
  /**
   * Su precio de hoy, en milésimas por unidad de uso. Es con lo que se cuenta lo
   * que entró sin coste, igual que en «Lo que hay en cámara» de Inventario · Hoy.
   */
  readonly precioDeHoy: number | null;
  /** Si entra en «bajo mínimo»: los de las zonas que ve quien pregunta (0038). */
  readonly cuentaEnElMinimo: boolean;
  /**
   * La última línea del libro fechada antes del primer día que se pide, o nulo si
   * no hay ninguna.
   */
  readonly antes: LineaDelLibro | null;
  /**
   * La última línea del libro fechada cada día pedido. Los días sin movimientos
   * no están.
   */
  readonly delDia: ReadonlyMap<string, LineaDelLibro>;
}

export interface FotoDeLaCamara {
  readonly fecha: string;
  /** Lo que vale lo que hay, en céntimos. */
  readonly valor: number;
  /** Cuántos productos están por debajo de su mínimo, agotados o en negativo. */
  readonly bajoMinimo: number;
}

/**
 * Lo que había en la cámara al acabar cada uno de los días pedidos.
 *
 * ── Por qué se reconstruye y no se guarda ───────────────────────────────────
 *
 * Porque ya está guardado: **el libro de movimientos es la cámara** (regla 8).
 * Guardar además una foto diaria sería un segundo dueño de lo mismo, y el día que
 * alguien corrigiera un movimiento de hace una semana, las dos dirían cosas
 * distintas sin que nadie supiera cuál creer.
 *
 * ── Las dos cuentas son las de «Hoy», a propósito ───────────────────────────
 *
 * El valor es el de «Lo que hay en cámara» —a coste medio, lo que tiene el medio a
 * cero a su precio de hoy, y solo lo que es positivo— y el bajo mínimo es el de la
 * lista de atención —`comoEsta`, hasta «bajo mínimo»—. El último día de la foto es
 * hoy, y **tiene que dar lo mismo que la pantalla**: lo comprueba una prueba contra
 * la base.
 *
 * ── Lo que hay un día es la última línea del libro hasta ese día ────────────
 *
 * Como la vista `existencias`, que es la última línea de cada producto. **La
 * última por orden de apunte, no por fecha**: si el martes alguien apunta una
 * merma con fecha del lunes, lo que había el martes es lo que dejó esa línea, que
 * se apuntó después. Por eso se guarda la de mayor orden de entre todas las
 * fechadas hasta ese día, y no la del día a secas.
 */
export function lasFotosDeLaCamara(
  productos: readonly ProductoDeLaFoto[],
  fechas: readonly string[],
): readonly FotoDeLaCamara[] {
  const NADA: LineaDelLibro = { orden: 0, cantidad: 0, costeMedio: 0 };
  const estados = productos.map((producto) => ({ producto, hay: producto.antes ?? NADA }));

  return fechas.map((fecha) => {
    let valor = 0;
    let bajoMinimo = 0;

    for (const estado of estados) {
      const { producto } = estado;
      const linea = producto.delDia.get(fecha);
      if (linea !== undefined && linea.orden > estado.hay.orden) estado.hay = linea;
      if (fecha < producto.desde) continue;

      const { cantidad: cuanto, costeMedio } = estado.hay;
      if (cuanto > 0) {
        const coste = costeMedio !== 0 ? costeMedio : (producto.precioDeHoy ?? 0);
        valor += costeDeLinea(milesimas(coste), cantidad(cuanto));
      }
      if (
        producto.cuentaEnElMinimo &&
        urgenciaDe(comoEsta(cuanto, producto.minimo)) <= urgenciaDe('bajo_minimo')
      ) {
        bajoMinimo += 1;
      }
    }

    return { fecha, valor, bajoMinimo };
  });
}
