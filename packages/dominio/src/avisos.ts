import { conSimbolo, type Centimos } from './dinero.ts';
import { comoPrecioPorUnidad, type Milesimas } from './coste.ts';
import { comoPorcentaje, enumerar, fechaEnLetra, plural } from './textos.ts';
import { diaDeLaSemana, diasEntre, type FechaOperativa } from './tiempo.ts';
import { cuandoCae } from './compras.ts';
import { comoSeLlamaElDia } from './equipo.ts';

/**
 * Los avisos · la campana (entrega R · decisión 0052).
 *
 * «Hoy» dice **lo que hay que hacer hoy**, y se recalcula cada vez que se mira. La
 * campana dice **lo que ha pasado** y alguien tiene que saber: un borrador que ha
 * empezado el cocinero, un proveedor que sube el tomate, una nota nueva del Tablón.
 * Son dos cosas distintas, y juntarlas alargaría «Hoy» con lo que ya está hecho.
 *
 * Las reglas son las de la 0017, que manda sobre los tres canales:
 *
 *   1 · Un aviso nace en la campana, y solo sale al correo si se lo gana.
 *   2 · Cada uno decide qué le llega y por dónde (Ajustes → Avisos).
 *   3 · Un aviso siempre lleva a donde se resuelve.
 *
 * Y la de la entrega 2 de M7: **uno por cosa y persona**. Si el cocinero sigue
 * tocando el borrador, al jefe no le llega otro aviso; si lo toca otro, su nombre se
 * suma al mismo («Ana y Marcos están preparando…») sin volver a sonar.
 *
 * Aquí vive **qué avisos hay, qué dicen y cómo vienen de fábrica**. Quién los
 * recibe según sus permisos está en `@estook/permisos` (`LO_QUE_PIDE_EL_AVISO`), y
 * quién está por encima de quién, en la base.
 */

export const TIPOS_DE_AVISO = [
  'pedido.empezado',
  'pedido.mandado',
  'pedido.invitacion',
  'pedido.listo',
  'albaran.incidencias',
  'merma.grande',
  'precio.subida',
  'carta.publicada',
  'tablon.nota',
  // ── R2 (decisión 0053) ──────────────────────────────────────────────────
  'pedido.toca',
  'almacen.bajo_minimo',
  'informe.dia',
  'informe.semana',
  'informe.mes',
  'google.nota',
  // ── H1 (decisión 0068) ──────────────────────────────────────────────────
  'fichaje.corregido',
  // ── H2 (decisión 0069) ──────────────────────────────────────────────────
  'horario.publicado',
  'horario.cambiado',
  // ── I (decisión 0070) ───────────────────────────────────────────────────
  'turno.entras',
  'lote.caduca',
  'pedido.no_llega',
  'fichaje.sin_apuntar',
  // ── C2 (decisión 0075) ──────────────────────────────────────────────────
  'chat.confirmar',
  // ── M8 (decisión 0078) ──────────────────────────────────────────────────
  'inventario.toca',
  'inventario.contado',
  'inventario.recontar',
  // ── M8, la segunda entrega (decisión 0079) ──────────────────────────────
  'inventario.falta',
] as const;

export type TipoDeAviso = (typeof TIPOS_DE_AVISO)[number];

export function esTipoDeAviso(valor: unknown): valor is TipoDeAviso {
  return typeof valor === 'string' && (TIPOS_DE_AVISO as readonly string[]).includes(valor);
}

/** Cómo se agrupan en Ajustes → Avisos. */
export type GrupoDeAvisos = 'Compras' | 'Almacén' | 'Carta' | 'Equipo' | 'Negocio';

export interface ComoEsElAviso {
  /** Lo que se lee en Ajustes → Avisos: «Alguien empieza un pedido». */
  readonly nombre: string;
  /** Una línea, plegada debajo: a quién le llega y por qué. */
  readonly explica: string;
  readonly grupo: GrupoDeAvisos;
  /**
   * **Es lo que hace tu equipo**, y a quien lleva todo el negocio no le llega de
   * fábrica (dirección, administración de la cuenta y area manager): con varios
   * locales serían decenas al día, y la campana dejaría de mirarse. Lo enciende
   * quien lo quiera.
   */
  readonly deTuEquipo: boolean;
  /** Si sale también por correo sin que nadie lo toque. Casi nunca (0017, regla 1). */
  readonly correoDeFabrica: boolean;
  /**
   * Si suena en el móvil sin que nadie lo toque (I · 0070). **Solo lo que pide hacer
   * algo ya**: entrar a tu turno, gastar lo que caduca, un pedido que no llega, que te
   * pidan ayuda, tu horario y tus fichajes. Lo demás se queda en la campana, y cada uno
   * lo enciende si quiere. Y lo que suena en el móvil **no sale también por correo**
   * (0017): el correo es para quien no tiene el móvil puesto.
   */
  readonly movilDeFabrica: boolean;
  /**
   * Si llega a la campana sin que nadie lo toque. Casi todos sí; **lo que ya dice
   * «Hoy» no** (R2): los productos bajo mínimo están en «Hoy» cada mañana, y en la
   * campana serían lo mismo dos veces. Se enciende en Ajustes para tenerlo por correo.
   */
  readonly campanaDeFabrica?: boolean;
}

export const COMO_ES_EL_AVISO: Readonly<Record<TipoDeAviso, ComoEsElAviso>> = {
  'pedido.empezado': {
    nombre: 'Alguien empieza un pedido',
    explica: 'Uno por pedido: si lo sigue tocando, no llega otro.',
    grupo: 'Compras',
    deTuEquipo: true,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'pedido.mandado': {
    nombre: 'Se manda un pedido',
    explica: 'A quien está por encima de quien lo manda, y a quien ayudó a rellenarlo.',
    grupo: 'Compras',
    deTuEquipo: true,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'pedido.invitacion': {
    nombre: 'Te piden que rellenes un pedido',
    explica: 'Suele ser con prisa: te llega al momento, al móvil y al correo.',
    grupo: 'Compras',
    deTuEquipo: false,
    correoDeFabrica: true,
    movilDeFabrica: true,
  },
  'pedido.listo': {
    nombre: 'Terminan un pedido que pediste rellenar',
    explica: 'Ya lo puedes mandar.',
    grupo: 'Compras',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'albaran.incidencias': {
    nombre: 'Un albarán llega con incidencias',
    explica: 'Falta, sobra, algo rechazado o un precio distinto: hay que reclamarlo.',
    grupo: 'Compras',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'precio.subida': {
    nombre: 'Un proveedor sube un precio',
    explica: 'Sin IVA, y comparado con tus otros proveedores del mismo producto.',
    grupo: 'Compras',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'merma.grande': {
    nombre: 'Se tira algo caro',
    explica: 'Una merma de 20 € o más.',
    grupo: 'Almacén',
    deTuEquipo: true,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'carta.publicada': {
    nombre: 'Hay carta nueva',
    explica: 'Para que la sala sepa qué enseña el QR.',
    grupo: 'Carta',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'tablon.nota': {
    nombre: 'Una nota nueva en el Tablón',
    explica: 'Las de todos y las de tu zona. Leerla en el Tablón la marca aquí.',
    grupo: 'Equipo',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },

  // ── R2 (decisión 0053) ──────────────────────────────────────────────────
  'pedido.toca': {
    nombre: 'Mañana toca pedir',
    explica: 'La víspera, a primera hora. Al tocarlo se prepara el pedido con lo que haya.',
    grupo: 'Compras',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'almacen.bajo_minimo': {
    nombre: 'Productos bajo mínimo',
    explica: 'Cada mañana, si hay alguno. Ya sale en «Hoy»: enciéndelo para tenerlo por correo.',
    grupo: 'Almacén',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
    campanaDeFabrica: false,
  },
  'informe.dia': {
    nombre: 'Tu día',
    explica: 'Cada mañana, cómo fue ayer frente al mismo día de la semana anterior.',
    grupo: 'Negocio',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'informe.semana': {
    nombre: 'Tu semana',
    explica: 'Los lunes, la semana de lunes a domingo frente a la anterior.',
    grupo: 'Negocio',
    deTuEquipo: false,
    correoDeFabrica: true,
    movilDeFabrica: false,
  },
  'informe.mes': {
    nombre: 'Tu mes',
    explica: 'El día 1, el mes que acaba frente al anterior.',
    grupo: 'Negocio',
    deTuEquipo: false,
    correoDeFabrica: true,
    movilDeFabrica: false,
  },
  'google.nota': {
    nombre: 'Baja tu nota en Google',
    explica: 'Se mira cada tres días, y al abrir Reseñas si lleva más de uno sin mirarse.',
    grupo: 'Negocio',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },

  // ── H1 (decisión 0068) ──────────────────────────────────────────────────
  //
  // «El trabajador ve cualquier cambio en lo suyo y recibe un aviso» (0062). Por
  // correo también, de fábrica: es su registro horario y puede no abrir la app en días.
  'fichaje.corregido': {
    nombre: 'Te corrigen un fichaje',
    explica: 'Con quién lo cambió y por qué. El de antes no se borra: lo ves en tus fichajes.',
    grupo: 'Equipo',
    deTuEquipo: false,
    correoDeFabrica: true,
    movilDeFabrica: true,
  },

  // ── H2 (decisión 0069) ──────────────────────────────────────────────────
  //
  // «Al publicar, a cada uno su aviso, en la campana y por correo. Al cambiar,
  // solo al afectado, y dice qué» (0066). Por correo de fábrica los dos: el horario
  // se mira para organizarse la semana, y no todo el mundo abre la app a diario.
  'horario.publicado': {
    nombre: 'Sale tu horario de la semana',
    explica: 'Lo tuyo, día a día. El de todos está en el horario de la app.',
    grupo: 'Equipo',
    deTuEquipo: false,
    correoDeFabrica: true,
    movilDeFabrica: true,
  },
  'horario.cambiado': {
    nombre: 'Te cambian el horario',
    explica: 'Solo si te toca a ti, y dice qué día y cómo queda.',
    grupo: 'Equipo',
    deTuEquipo: false,
    correoDeFabrica: true,
    movilDeFabrica: true,
  },

  // ── I (decisión 0070) ───────────────────────────────────────────────────
  //
  // Los cuatro que trae la app instalable. **Por correo, ninguno**: o llegan en el
  // momento o no sirven («entras en cinco minutos» a las once de la noche, no).
  'turno.entras': {
    nombre: 'Entras en cinco minutos',
    explica: 'Antes de cada turno, si no has fichado. Mira el horario publicado o el de siempre.',
    grupo: 'Equipo',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: true,
  },
  'lote.caduca': {
    nombre: 'Algo caduca',
    explica: 'La víspera a las 18:00 y el mismo día por la mañana, para gastarlo antes.',
    grupo: 'Almacén',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: true,
  },
  'pedido.no_llega': {
    nombre: 'Un pedido no ha llegado',
    explica:
      'Media hora después de cuando suele llegar, si el proveedor lo tiene puesto en su ficha.',
    grupo: 'Compras',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: true,
  },
  'fichaje.sin_apuntar': {
    nombre: 'Un fichaje sin conexión no se ha podido apuntar',
    explica:
      'Del aparato del local, al volver la conexión: por ejemplo, un PIN que no era de nadie.',
    grupo: 'Equipo',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: true,
  },

  // ── C2 (decisión 0075) ──────────────────────────────────────────────────
  //
  // Lo oficial del chat: quien lo pidió quiere saber que te has enterado. Una vez, al
  // empezar tu siguiente turno. Por correo de fábrica, que solo sale si no te suena
  // el móvil (0017): así se entera también quien no tiene el móvil puesto.
  'chat.confirmar': {
    nombre: 'Te falta confirmar algo del chat',
    explica: 'Una vez, al empezar tu siguiente turno, si todavía no lo has confirmado.',
    grupo: 'Equipo',
    deTuEquipo: false,
    correoDeFabrica: true,
    movilDeFabrica: true,
  },

  // ── M8 (decisión 0078) ──────────────────────────────────────────────────
  //
  // Contar y cerrar son dos pasos (2A): quien cierra se entera de que hay algo
  // contado, y quien contó, de que le piden que lo vuelva a contar. Y los lunes,
  // lo que toca contar, a quien responde del inventario.
  'inventario.toca': {
    nombre: 'Toca contar',
    explica: 'Los lunes: lo que más vale cada semana, y lo demás una vez al mes.',
    grupo: 'Almacén',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'inventario.contado': {
    nombre: 'Alguien manda lo que ha contado',
    explica: 'Para que lo mires y lo cierres. Dice cuántos no cuadran.',
    grupo: 'Almacén',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
  'inventario.recontar': {
    nombre: 'Te piden que vuelvas a contar algo',
    explica: 'Quien cierra el inventario quiere que lo mires otra vez.',
    grupo: 'Almacén',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: true,
  },

  // ── M8, la segunda entrega (decisión 0079) ──────────────────────────────
  //
  // Al cerrar un inventario, solo si lo que falta sin explicar pasa del 3 % de lo
  // gastado (0078, «lo que decido yo» 9). Lo de menos se ve en la desviación.
  'inventario.falta': {
    nombre: 'Al cerrar un inventario falta género',
    explica: 'Solo si lo que falta sin explicar pasa del 3 % de lo gastado.',
    grupo: 'Almacén',
    deTuEquipo: false,
    correoDeFabrica: false,
    movilDeFabrica: false,
  },
};

/** El orden de los grupos en Ajustes: lo que más se usa, arriba. */
export const GRUPOS_DE_AVISOS: readonly GrupoDeAvisos[] = [
  'Compras',
  'Almacén',
  'Carta',
  'Equipo',
  'Negocio',
];

/**
 * Desde qué puesto se lleva el negocio entero: dirección (100), administración de
 * la cuenta (90) y area manager (80). Es `rol.amplitud`, el mismo número que ordena
 * quién manda sobre quién (`jerarquia.ts`).
 */
export const AMPLITUD_DE_QUIEN_LLEVA_EL_NEGOCIO = 80;

export interface PreferenciaDeAviso {
  readonly enLaApp: boolean;
  readonly porCorreo: boolean;
  /** Que suene en el móvil (I · 0070). Como el correo, nunca sin la campana. */
  readonly alMovil: boolean;
}

/** Cómo viene cada aviso para alguien con este puesto, si no ha tocado nada. */
export function deFabrica(tipo: TipoDeAviso, amplitud: number): PreferenciaDeAviso {
  const como = COMO_ES_EL_AVISO[tipo];
  const enLaApp =
    (como.campanaDeFabrica ?? true) &&
    !(como.deTuEquipo && amplitud >= AMPLITUD_DE_QUIEN_LLEVA_EL_NEGOCIO);
  return {
    enLaApp,
    porCorreo: enLaApp && como.correoDeFabrica,
    alMovil: enLaApp && como.movilDeFabrica,
  };
}

/**
 * Lo que vale para alguien: lo que guardó, o lo de fábrica.
 *
 * **El correo nunca sin la campana**: un aviso que llega al correo y no está en la
 * app no se puede marcar como hecho en ningún sitio. Apagar la app apaga el correo.
 * Y el móvil, igual (I · 0070): tocar el aviso del móvil abre la campana.
 */
export function laPreferencia(
  tipo: TipoDeAviso,
  amplitud: number,
  guardada: Partial<PreferenciaDeAviso> | null | undefined,
): PreferenciaDeAviso {
  const fabrica = deFabrica(tipo, amplitud);
  const enLaApp = guardada?.enLaApp ?? fabrica.enLaApp;
  const porCorreo = guardada?.porCorreo ?? fabrica.porCorreo;
  const alMovil = guardada?.alMovil ?? fabrica.alMovil;
  return { enLaApp, porCorreo: enLaApp && porCorreo, alMovil: enLaApp && alMovil };
}

// ── Cuándo avisa ─────────────────────────────────────────────────────────────

/** Una merma avisa a partir de aquí: 20 €, en céntimos. Menos es el día a día. */
export const MERMA_QUE_AVISA_CENTIMOS = 2000;

export function laMermaAvisa(valorCentimos: number | null): boolean {
  return valorCentimos !== null && valorCentimos >= MERMA_QUE_AVISA_CENTIMOS;
}

/** Una subida avisa a partir de este porcentaje, si el gerente no dice otro. */
export const SUBIDA_QUE_AVISA_DE_FABRICA = 5;
export const SUBIDA_QUE_AVISA_MINIMA = 1;
export const SUBIDA_QUE_AVISA_MAXIMA = 50;

/**
 * Cuánto ha subido, en fracción (0,12 es un 12 %), **comparando lo que cuesta la
 * unidad de uso** (0021): si antes venía en caja de 6 y ahora en caja de 12, el
 * precio de la caja no dice nada; el del kilo, sí. Nulo si no había precio de antes.
 */
export function cuantoSube(
  antes: Milesimas | number | null,
  ahora: Milesimas | number,
): number | null {
  if (antes === null || antes <= 0) return null;
  return (Number(ahora) - Number(antes)) / Number(antes);
}

export function laSubidaAvisa(
  antes: Milesimas | number | null,
  ahora: Milesimas | number,
  umbral: number,
): boolean {
  // Sin redondear: un 4,9 % no es un 5 %, aunque se lea «5 %».
  if (antes === null || antes <= 0) return false;
  return (Number(ahora) - Number(antes)) * 100 >= umbral * Number(antes);
}

// ── Lo que dice cada uno ─────────────────────────────────────────────────────

export interface LoQueDiceUnAviso {
  readonly titulo: string;
  readonly detalle: string | null;
}

/**
 * Quiénes, en una frase: «Ana», «Ana y Marcos», «Ana, Marcos y Luis», y a partir
 * de cuatro, «Ana y 3 más», que ya no cabe en una línea del móvil.
 */
export function quienesEnUnaFrase(quienes: readonly string[]): string {
  const unicos = [...new Set(quienes.filter((q) => q.trim() !== ''))];
  if (unicos.length === 0) return 'Alguien';
  if (unicos.length <= 3) return enumerar(unicos);
  return `${unicos[0] ?? ''} y ${String(unicos.length - 1)} más`;
}

export function avisoDePedidoEmpezado(
  quienes: readonly string[],
  proveedor: string,
): LoQueDiceUnAviso {
  const varios = new Set(quienes).size > 1;
  return {
    titulo: varios
      ? `${quienesEnUnaFrase(quienes)} están preparando un pedido a ${proveedor}`
      : `${quienesEnUnaFrase(quienes)} ha empezado un pedido a ${proveedor}`,
    detalle: 'Está en borrador: cuando esté, lo mandas tú.',
  };
}

/**
 * Sin importe, a propósito: le llega también al cocinero que ayudó a rellenarlo,
 * que no ve precios de compra, y el aviso es el mismo texto para todos.
 */
export function avisoDePedidoMandado(
  quien: string,
  proveedor: string,
  numero: number,
  llegaEl: FechaOperativa | null,
): LoQueDiceUnAviso {
  return {
    titulo: `${quien} ha mandado el pedido ${String(numero)} a ${proveedor}`,
    detalle: llegaEl === null ? null : `Llega el ${fechaEnLetra(llegaEl)}.`,
  };
}

export function avisoDeInvitacion(quien: string, proveedor: string): LoQueDiceUnAviso {
  return {
    titulo: `${quien} te pide que rellenes el pedido a ${proveedor}`,
    detalle: 'Añade lo que falta y pulsa «Listo»: lo manda quien te lo ha pedido.',
  };
}

export function avisoDePedidoListo(
  quienes: readonly string[],
  proveedor: string,
): LoQueDiceUnAviso {
  const varios = new Set(quienes).size > 1;
  return {
    titulo: `${quienesEnUnaFrase(quienes)} ${varios ? 'han' : 'ha'} terminado el pedido a ${proveedor}`,
    detalle: 'Ya lo puedes revisar y mandar.',
  };
}

export function avisoDeIncidencias(
  proveedor: string,
  incidencias: number,
  quien: string,
): LoQueDiceUnAviso {
  return {
    titulo: `El albarán de ${proveedor} llegó con ${plural(incidencias, 'incidencia', 'incidencias')}`,
    detalle: `Lo recibió ${quien}. Míralo para reclamarlo.`,
  };
}

export function avisoDeMerma(
  quien: string,
  cuanto: string,
  producto: string,
  valor: Centimos,
  motivo: string,
): LoQueDiceUnAviso {
  return {
    titulo: `${quien} ha tirado ${cuanto} de ${producto}`,
    detalle: `${conSimbolo(valor)} · ${motivo}`,
  };
}

export interface OtroProveedorMasBarato {
  readonly proveedor: string;
  readonly costeMilesimas: Milesimas | number;
  readonly desde: FechaOperativa;
}

/**
 * «Frutas Pepe sube el tomate un 12 %» · «Ahora 2,10 €/kg; antes 1,88 €/kg.
 * Distribuciones Sur te lo deja a 1,85 €/kg desde el 3 de septiembre.»
 *
 * **Solo se compara con tus proveedores** del mismo producto: precios de mercado no
 * los tenemos y no se prometen. Y solo se nombra al otro si de verdad es más barato.
 */
export function avisoDeSubida(
  proveedor: string,
  producto: string,
  unidad: string,
  antes: Milesimas | number,
  ahora: Milesimas | number,
  otro: OtroProveedorMasBarato | null,
): LoQueDiceUnAviso {
  const sube = cuantoSube(antes, ahora) ?? 0;
  const precio = (m: Milesimas | number) => comoPrecioPorUnidad(Number(m) as Milesimas, unidad);
  const comparado =
    otro !== null && Number(otro.costeMilesimas) < Number(ahora)
      ? ` ${otro.proveedor} te lo deja a ${precio(otro.costeMilesimas)} desde el ${fechaEnLetra(otro.desde)}.`
      : '';
  return {
    titulo: `${proveedor} sube ${producto} un ${comoPorcentaje(sube)}`,
    detalle: `Ahora ${precio(ahora)}; antes ${precio(antes)}.${comparado}`,
  };
}

export function avisoDeCarta(quien: string, paginas: number): LoQueDiceUnAviso {
  return {
    titulo: 'Hay carta nueva',
    detalle: `La ha publicado ${quien}: ${plural(paginas, 'página', 'páginas')}. Es la que enseña el QR.`,
  };
}

export function avisoDeNota(
  quien: string,
  texto: string,
  dia: FechaOperativa,
  hoy: FechaOperativa,
  hora: string | null,
): LoQueDiceUnAviso {
  const faltan = diasEntre(hoy, dia);
  const cuando = faltan <= 0 ? 'hoy' : faltan === 1 ? 'mañana' : `el ${fechaEnLetra(dia)}`;
  const aLas = hora === null ? '' : ` a las ${hora}`;
  return {
    titulo: `${quien} en el Tablón, para ${cuando}${aLas}`,
    detalle: texto,
  };
}

// ── R2 · lo que avisa el reloj (decisión 0053) ───────────────────────────────

/**
 * «Mañana toca pedir a Frutas Pepe» · «Para que llegue el martes, pídelo antes de
 * las 20:00. Tócalo y se prepara el pedido con lo que haya entonces.»
 *
 * El pedido **no se prepara ahora**: se prepara al tocarlo, con lo que haya en la
 * cámara en ese momento (Richi, 27-sep). Un borrador hecho de madrugada estaría
 * viejo a la hora de mandarlo, y nadie lo usaría.
 */
export function avisoDeTocaPedir(
  proveedor: string,
  llega: FechaOperativa,
  pedirAntesDe: string | null,
  hoy: FechaOperativa,
): LoQueDiceUnAviso {
  const antes = pedirAntesDe === null ? '' : `, pídelo antes de las ${pedirAntesDe}`;
  return {
    titulo: `Mañana toca pedir a ${proveedor}`,
    detalle: `Para que llegue ${cuandoCae(llega, hoy)}${antes}. Tócalo y se prepara el pedido con lo que haya entonces.`,
  };
}

/** Cuántos productos se nombran como mucho: más no cabe en una línea del móvil. */
const PRODUCTOS_QUE_SE_NOMBRAN = 5;

/** «3 productos bajo mínimo» · «Leche, tomate y harina.» */
export function avisoDeBajoMinimo(productos: readonly string[]): LoQueDiceUnAviso {
  const nombrados = productos.slice(0, PRODUCTOS_QUE_SE_NOMBRAN);
  const quedan = productos.length - nombrados.length;
  const lista =
    quedan > 0 ? `${nombrados.join(', ')} y ${String(quedan)} más` : enumerar(nombrados);
  return {
    titulo: `${plural(productos.length, 'producto', 'productos')} bajo mínimo`,
    detalle: `${lista.charAt(0).toUpperCase()}${lista.slice(1)}.`,
  };
}

/** Una lista corta de nombres: «Pulpo, merluza y 3 más». */
function listaCorta(productos: readonly string[]): string {
  const nombrados = productos.slice(0, PRODUCTOS_QUE_SE_NOMBRAN);
  const quedan = productos.length - nombrados.length;
  return quedan > 0 ? `${nombrados.join(', ')} y ${String(quedan)} más` : enumerar(nombrados);
}

/** «Toca contar 12 productos» · «Pulpo, solomillo, aceite… Los que más valen.» (M8 · 0078). */
export function avisoDeTocaContar(productos: readonly string[], frase: string): LoQueDiceUnAviso {
  const lista = listaCorta(productos);
  return {
    titulo: `Toca contar ${plural(productos.length, 'producto', 'productos')}`,
    detalle: `${lista.charAt(0).toUpperCase()}${lista.slice(1)}. ${frase}`,
  };
}

/** «Marcos ha contado cocina: 3 no cuadran» (M8 · 0078). */
export function avisoDeInventarioContado(
  quienes: readonly string[],
  zona: string | null,
  contados: number,
  noCuadran: number,
): LoQueDiceUnAviso {
  const quien = quienes.length === 0 ? 'Alguien' : enumerar(quienes);
  const que = zona === null ? 'el almacén' : zona.toLowerCase();
  return {
    titulo: `${quien} ha contado ${que}`,
    detalle: `${plural(contados, 'producto', 'productos')}${noCuadran === 0 ? ', y cuadra todo' : `, ${String(noCuadran)} no ${noCuadran === 1 ? 'cuadra' : 'cuadran'}`}. Míralo y ciérralo.`,
  };
}

/**
 * «Al cerrar el inventario faltan 64,00 €» · «Un 5 % de lo gastado: pulpo y gambas.
 * Mira la desviación.» (M8 · 0079). Solo le llega a quien ve precios de compra.
 */
export function avisoDeLoQueFalta(
  falta: Centimos,
  parte: number,
  productos: readonly string[],
): LoQueDiceUnAviso {
  const lista = listaCorta(productos);
  return {
    titulo: `Al cerrar el inventario faltan ${conSimbolo(falta)}`,
    detalle: `Un ${comoPorcentaje(parte)} de lo gastado${lista === '' ? '' : `: ${lista}`}. Mira la desviación.`,
  };
}

/** «Vuelve a contar 2 productos» · «Pulpo y merluza.» (M8 · 0078). */
export function avisoDeRecontar(
  productos: readonly string[],
  quien: string | null,
): LoQueDiceUnAviso {
  const lista = listaCorta(productos);
  return {
    titulo: `Vuelve a contar ${plural(productos.length, 'producto', 'productos')}`,
    detalle: `${lista.charAt(0).toUpperCase()}${lista.slice(1)}.${quien === null ? '' : ` Te lo pide ${quien}.`}`,
  };
}

/**
 * La nota en Google baja: «Tu nota en Google baja de 4,6 a 4,5».
 *
 * Solo cuando **baja** lo que enseña Google, con su decimal. Adivinar la nota de
 * las reseñas nuevas a partir de dos medias redondeadas daría cifras inventadas: con
 * trescientas reseñas, un redondeo son cinco estrellas arriba o abajo.
 */
export function avisoDeNotaDeGoogle(
  antes: number,
  ahora: number,
  resenasAntes: number | null,
  resenasAhora: number | null,
): LoQueDiceUnAviso {
  const nota = (n: number) => n.toFixed(1).replace('.', ',');
  const nuevas =
    resenasAntes !== null && resenasAhora !== null ? Math.max(0, resenasAhora - resenasAntes) : 0;
  return {
    titulo: `Tu nota en Google baja de ${nota(antes)} a ${nota(ahora)}`,
    detalle:
      nuevas > 0
        ? `${plural(nuevas, 'reseña nueva', 'reseñas nuevas')} desde la última vez. Míralas en Google.`
        : 'Míralas en Google para saber qué ha pasado.',
  };
}

// ── H1 · lo que avisa un fichaje (decisión 0068) ─────────────────────────────

/**
 * «Carla ha corregido tu fichaje del viernes 25 de septiembre» · «Motivo: se fue
 * sin fichar la salida. El de antes sigue a la vista en tus fichajes.»
 */
export function avisoDeFichajeCorregido(
  quien: string,
  dia: FechaOperativa | string,
  motivo: string,
): LoQueDiceUnAviso {
  const fecha = dia as FechaOperativa;
  // «viernes 25 de septiembre»: el año sobra, es de hace unos días.
  const sinAnio = fechaEnLetra(fecha).replace(/ de \d{4}$/, '');
  return {
    titulo: `${quien} ha corregido tu fichaje del ${comoSeLlamaElDia(diaDeLaSemana(fecha))} ${sinAnio}`,
    detalle: `Motivo: ${motivo.charAt(0).toLowerCase()}${motivo.slice(1)}${/[.!?]$/.test(motivo) ? '' : '.'} El de antes sigue a la vista en tus fichajes.`,
  };
}

// ── I · lo que avisa el móvil (decisión 0070) ────────────────────────────────

/**
 * «Entras en 5 minutos» · «A las 10:00 en Bar Centro. Tócalo para fichar.»
 *
 * Los minutos se cuentan al escribirlo, no se ponen fijos: si el aviso sale un
 * minuto tarde, dice cuatro, que es la verdad.
 */
export function avisoDeEntrasEnUnRato(
  minutos: number,
  hora: string,
  local: string,
): LoQueDiceUnAviso {
  return {
    titulo: minutos <= 0 ? 'Entras ahora' : `Entras en ${plural(minutos, 'minuto', 'minutos')}`,
    detalle: `A las ${hora} en ${local}. Tócalo para fichar.`,
  };
}

/**
 * «Mañana caducan 3 lotes» · «Leche, nata y tomate. Gástalo primero.» El de hoy deja
 * viejo al de la víspera (`sustituyeA`).
 */
export function avisoDeCaducidad(
  cuando: 'hoy' | 'manana',
  productos: readonly string[],
): LoQueDiceUnAviso {
  const n = productos.length;
  const cuantos = n === 1 ? 'caduca un lote' : `caducan ${String(n)} lotes`;
  const unicos = [...new Set(productos)];
  const nombrados = unicos.slice(0, PRODUCTOS_QUE_SE_NOMBRAN);
  const quedan = unicos.length - nombrados.length;
  const lista =
    quedan > 0 ? `${nombrados.join(', ')} y ${String(quedan)} más` : enumerar(nombrados);
  const queHacer = cuando === 'hoy' ? 'Gástalo hoy o apúntalo como merma.' : 'Gástalo primero.';
  return {
    titulo: cuando === 'hoy' ? `Hoy ${cuantos}` : `Mañana ${cuantos}`,
    detalle: `${lista.charAt(0).toUpperCase()}${lista.slice(1)}. ${queHacer}`,
  };
}

/**
 * «El pedido 12 a Frutas Pepe no ha llegado» · «Suele llegar hacia las 10:00. Llama
 * al proveedor, o recíbelo cuando llegue.»
 */
export function avisoDePedidoQueNoLlega(
  proveedor: string,
  numero: number,
  sueleLlegar: string,
): LoQueDiceUnAviso {
  return {
    titulo: `El pedido ${String(numero)} a ${proveedor} no ha llegado`,
    detalle: `Suele llegar hacia las ${sueleLlegar}. Llama al proveedor, o recíbelo cuando llegue.`,
  };
}

/** Por qué un fichaje del aparato, hecho sin conexión, no se ha apuntado al volver. */
export type PorQueNoSeApunto = 'pin' | 'ya_estaba' | 'no_estaba' | 'otro';

const POR_QUE_NO_SE_APUNTO: Readonly<Record<PorQueNoSeApunto, string>> = {
  pin: 'el PIN no era de nadie del local',
  ya_estaba: 'esa persona ya estaba fichada',
  no_estaba: 'esa persona no estaba fichada',
  otro: 'Estook no lo ha podido apuntar',
};

export type LoQueSeFicha = 'entrada' | 'pausa' | 'vuelta' | 'salida';

const LO_QUE_SE_FICHA: Readonly<Record<LoQueSeFicha, string>> = {
  entrada: 'Una entrada',
  pausa: 'Una pausa',
  vuelta: 'Una vuelta de la pausa',
  salida: 'Una salida',
};

/**
 * «Un fichaje sin conexión no se ha podido apuntar» · «Una entrada en Tablet barra, el
 * martes 6 a las 09:02: el PIN no era de nadie del local. Pregunta quién fue y
 * apúntaselo en su ficha.»
 */
export function avisoDeFichajeSinApuntar(
  que: LoQueSeFicha,
  aparato: string,
  cuando: string,
  porque: PorQueNoSeApunto,
  quien: string | null,
): LoQueDiceUnAviso {
  const queHacer =
    porque === 'pin'
      ? 'Pregunta quién fue y apúntaselo en su ficha.'
      : `Mira la ficha de ${quien ?? 'esa persona'} por si hay que corregir algo.`;
  const dequien = quien === null ? '' : ` de ${quien}`;
  return {
    titulo: 'Un fichaje sin conexión no se ha podido apuntar',
    detalle: `${LO_QUE_SE_FICHA[que]}${dequien} en ${aparato}, ${cuando}: ${POR_QUE_NO_SE_APUNTO[porque]}. ${queHacer}`,
  };
}

/**
 * «Carla ha apuntado un fichaje tuyo del martes 6 de octubre» · «Motivo: fichó en la
 * tablet sin conexión con otro PIN. Lo ves en tus fichajes.» (0070). Es un cambio en
 * lo suyo, como una corrección, y le llega igual (0062).
 */
export function avisoDeFichajeApuntado(
  quien: string,
  dia: FechaOperativa | string,
  motivo: string,
): LoQueDiceUnAviso {
  const fecha = dia as FechaOperativa;
  const sinAnio = fechaEnLetra(fecha).replace(/ de \d{4}$/, '');
  return {
    titulo: `${quien} ha apuntado un fichaje tuyo del ${comoSeLlamaElDia(diaDeLaSemana(fecha))} ${sinAnio}`,
    detalle: `Motivo: ${motivo.charAt(0).toLowerCase()}${motivo.slice(1)}${/[.!?]$/.test(motivo) ? '' : '.'} Lo ves en tus fichajes.`,
  };
}

/**
 * «Te falta confirmar un mensaje de Rosa en Todo el equipo» · «Esta semana no hay
 * pescado los lunes. Tócalo para leerlo y confirmarlo.» (C2 · 0075)
 */
export function avisoDeConfirmar(quien: string, canal: string, vista: string): LoQueDiceUnAviso {
  const limpio = vista.replace(/\s+/g, ' ').trim();
  const corto = limpio.length > 140 ? `${limpio.slice(0, 140).trimEnd()}…` : limpio;
  const punto = /[.!?…]$/.test(corto) ? '' : '.';
  return {
    titulo: `Te falta confirmar un mensaje de ${quien} en ${canal}`,
    detalle: `${corto}${punto} Tócalo para leerlo y confirmarlo.`,
  };
}

/** La nota solo avisa si baja lo que se ve: con un decimal, como la enseña Google. */
export function laNotaBaja(antes: number | null, ahora: number | null): boolean {
  if (antes === null || ahora === null) return false;
  return Number(ahora.toFixed(1)) < Number(antes.toFixed(1));
}

// ── Cómo se enseñan ──────────────────────────────────────────────────────────

/** El número de la campana: hasta 9, y después «9+», que ya dice «muchos». */
export function numeroDeLaCampana(sinLeer: number): string | null {
  if (sinLeer <= 0) return null;
  return sinLeer > 9 ? '9+' : String(sinLeer);
}

/** Lo que dice la campana a quien no la ve: «Avisos: 3 sin leer». */
export function etiquetaDeLaCampana(sinLeer: number): string {
  return sinLeer <= 0 ? 'Avisos' : `Avisos: ${String(sinLeer)} sin leer`;
}

/** Lo que dice el botón del chat a quien no lo ve: «Chat del equipo: 3 sin leer» (0073). */
export function etiquetaDelChat(sinLeer: number): string {
  return sinLeer <= 0 ? 'Chat del equipo' : `Chat del equipo: ${String(sinLeer)} sin leer`;
}

export type TramoDeAvisos = 'Hoy' | 'Ayer' | 'Esta semana' | 'Antes';

/** En qué tramo va un aviso, por el día en que llegó contado en el local. */
export function tramoDelAviso(dia: FechaOperativa, hoy: FechaOperativa): TramoDeAvisos {
  const hace = diasEntre(dia, hoy);
  if (hace <= 0) return 'Hoy';
  if (hace === 1) return 'Ayer';
  if (hace < 7) return 'Esta semana';
  return 'Antes';
}

/** Cuántos días se guardan: pasado un mes, un aviso ya no avisa de nada. */
export const DIAS_QUE_SE_GUARDA_UN_AVISO = 30;

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/**
 * Cuándo fue, como se dice en una campana: «Ahora», «hace 5 min», «hace 3 h», y
 * pasado un día, la fecha corta: «12 sep». Los dos instantes vienen de fuera: aquí
 * no se lee ningún reloj (regla 10). El día, en el de Madrid.
 */
export function cuandoFue(desde: Date, ahora: Date): string {
  const minutos = Math.floor((ahora.getTime() - desde.getTime()) / 60_000);
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `hace ${String(minutos)} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${String(horas)} h`;
  const [, mes = '1', dia = '1'] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' })
    .format(desde)
    .split('-');
  return `${String(Number(dia))} ${MESES_CORTOS[Number(mes) - 1] ?? ''}`;
}
