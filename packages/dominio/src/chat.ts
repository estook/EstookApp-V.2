/**
 * El chat del equipo · las reglas (C1 · decisiones 0071 y 0073).
 *
 * Lo que comparten el servidor y la pantalla: qué canales hay, cómo se llaman, qué se
 * puede mandar y hasta cuándo se puede corregir. Lo demás —quién ve cada canal— vive
 * en la base, en una sola función (`estook.puede_ver_el_canal`), porque es seguridad y
 * no se decide en dos sitios.
 */

/**
 * Los tipos de canal. «cocina» y «sala» siguen en la base, pero ya no se usan: desde
 * C2 solo «Todo el equipo» viene hecho, y los demás los crean el gerente y los jefes
 * (0075). Los que tenían mensajes pasaron a canal normal con su nombre (0057).
 */
export const TIPOS_DE_CANAL = ['equipo', 'cocina', 'sala', 'canal', 'privado'] as const;
export type TipoDeCanal = (typeof TIPOS_DE_CANAL)[number];

/** El de fábrica: solo «Todo el equipo», que no se borra ni se renombra (0075). */
export const CANALES_DE_FABRICA = ['equipo'] as const;
export type CanalDeFabrica = (typeof CANALES_DE_FABRICA)[number];

export const NOMBRE_DEL_CANAL_DE_FABRICA: Readonly<Record<CanalDeFabrica, string>> = {
  equipo: 'Todo el equipo',
};

export function esCanalDeFabrica(tipo: string): tipo is CanalDeFabrica {
  return (CANALES_DE_FABRICA as readonly string[]).includes(tipo);
}

/**
 * El nombre de un canal, como se lee en la lista.
 *
 * Los de fábrica, por su tipo. Un canal creado, por el nombre que se le puso. Un
 * privado de dos, **por la otra persona**: es lo que hace cualquier chat. Uno de grupo,
 * por su nombre si lo tiene, y si no, por quién está («Ana, Luis y Marta»).
 */
export function nombreDelCanal(canal: {
  readonly tipo: TipoDeCanal;
  readonly nombre: string | null;
  /** Los que están, sin quien mira. Solo cuenta en los privados. */
  readonly otros: readonly string[];
}): string {
  if (esCanalDeFabrica(canal.tipo)) return NOMBRE_DEL_CANAL_DE_FABRICA[canal.tipo];
  if (canal.nombre !== null && canal.nombre.trim() !== '') return canal.nombre;
  if (canal.otros.length === 0) return 'Solo tú';
  if (canal.otros.length === 1) return canal.otros[0] ?? '';
  return `${canal.otros.slice(0, -1).join(', ')} y ${canal.otros.at(-1) ?? ''}`;
}

/** Lo más largo que se escribe en un mensaje. Más es un correo, no un chat. */
export const TOPE_DEL_MENSAJE = 4000;

/** Lo más largo del nombre de un canal o un grupo. */
export const TOPE_DEL_NOMBRE_DEL_CANAL = 40;

/** Cuánta gente cabe en un privado, contándote (0071, lo que decido yo, 3). */
export const PERSONAS_EN_UN_PRIVADO = 12;

/** Cuántos mensajes se fijan en un canal: más, y la franja se come la conversación (0075). */
export const FIJADOS_POR_CANAL = 3;

/**
 * Lo que se manda como tarjeta (0075): un pedido o un producto, que se abren en su
 * sitio con los permisos de quien los mira, y el aviso del horario publicado.
 */
export const TIPOS_DE_TARJETA = ['pedido', 'producto', 'horario'] as const;
export type TipoDeTarjeta = (typeof TIPOS_DE_TARJETA)[number];

/** Hasta cuándo se corrige lo escrito: después, se borra y se escribe otro (0071, 10). */
export const MINUTOS_PARA_CORREGIR = 15;

/** Si un mensaje todavía se puede corregir, con la hora del servidor (regla 10). */
export function sePuedeCorregir(escritoEn: Date, ahora: Date): boolean {
  return ahora.getTime() - escritoEn.getTime() <= MINUTOS_PARA_CORREGIR * 60_000;
}

/** Las reacciones, de una lista corta: se eligen de un vistazo y se leen igual en todos. */
export const REACCIONES = ['👍', '❤️', '😂', '😮', '🙏', '✅'] as const;
export type Reaccion = (typeof REACCIONES)[number];

export function esReaccion(valor: unknown): valor is Reaccion {
  return typeof valor === 'string' && (REACCIONES as readonly string[]).includes(valor);
}

// ── Lo que se adjunta ────────────────────────────────────────────────────────

export const TIPOS_DE_ADJUNTO = ['foto', 'documento', 'voz'] as const;
export type TipoDeAdjunto = (typeof TIPOS_DE_ADJUNTO)[number];

/**
 * Lo que se acepta de cada cosa, y con qué extensión se guarda (0073).
 *
 * Las fotos llegan ya reducidas del móvil, como las de producto. Los documentos, los
 * que se usan en un local: PDF, Word y Excel. La voz, en lo que graba cada móvil:
 * WebM en Android y en el ordenador, MP4 en el iPhone.
 */
export const LO_QUE_SE_ADJUNTA: Readonly<Record<TipoDeAdjunto, Readonly<Record<string, string>>>> =
  {
    foto: { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' },
    documento: {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    },
    voz: { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' },
  };

/** Lo más grande de cada cosa. Los documentos, 10 MB: viajan dentro de la petición. */
export const TOPE_DEL_ADJUNTO: Readonly<Record<TipoDeAdjunto, number>> = {
  foto: 1536 * 1024,
  documento: 10 * 1024 * 1024,
  voz: 3 * 1024 * 1024,
};

/** Una nota de voz, como mucho tres minutos (0071, lo que decido yo, 12). */
export const SEGUNDOS_DE_VOZ = 180;

/** «2,3 MB», «840 KB». */
export function pesoEnLetra(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
  }
  return `${String(Math.max(1, Math.ceil(bytes / 1024)))} KB`;
}

/** «1:05». */
export function duracionEnLetra(segundos: number): string {
  const s = Math.max(0, Math.trunc(segundos));
  return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, '0')}`;
}

// ── Lo que se dice de un mensaje ─────────────────────────────────────────────

/**
 * Lo que enseña la lista de canales y el móvil de un mensaje: el texto, o qué era.
 * Nunca el fichero: «Foto», «Nota de voz · 0:12».
 */
export function vistaPrevia(mensaje: {
  readonly texto: string | null;
  readonly adjuntoTipo: TipoDeAdjunto | null;
  readonly adjuntoNombre: string | null;
  readonly adjuntoSegundos: number | null;
  readonly borrado: boolean;
  /** La tarjeta, si lo es (C2): «Un pedido», «Un producto», «El horario». */
  readonly tarjeta?: TipoDeTarjeta | null;
}): string {
  if (mensaje.borrado) return 'Se eliminó este mensaje';
  const texto = mensaje.texto?.replace(/\s+/g, ' ').trim() ?? '';
  if (mensaje.tarjeta === 'horario') return 'El horario de la semana está publicado';
  if (mensaje.tarjeta === 'pedido') return texto === '' ? 'Un pedido' : `Un pedido · ${texto}`;
  if (mensaje.tarjeta === 'producto') return texto === '' ? 'Un producto' : `Un producto · ${texto}`;
  if (mensaje.adjuntoTipo === 'foto') return texto === '' ? 'Foto' : `Foto · ${texto}`;
  if (mensaje.adjuntoTipo === 'voz') {
    return `Nota de voz${mensaje.adjuntoSegundos === null ? '' : ` · ${duracionEnLetra(mensaje.adjuntoSegundos)}`}`;
  }
  if (mensaje.adjuntoTipo === 'documento') return mensaje.adjuntoNombre ?? 'Documento';
  return texto;
}

/** Corta un texto para una línea sin partir una palabra por la mitad. */
export function enUnaLinea(texto: string, tope = 90): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= tope) return limpio;
  const corte = limpio.slice(0, tope);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > tope * 0.6 ? corte.slice(0, espacio) : corte).trimEnd()}…`;
}

/**
 * Cómo va un mensaje propio: enviado, entregado o leído (0071, 6 y 9).
 *
 * En un privado de dos, lo de la otra persona. En un grupo, **leído es leído por
 * todos**; si falta alguien, se dice cuántos lo han leído.
 */
export type EstadoDeMiMensaje =
  | { readonly como: 'enviado' }
  | { readonly como: 'entregado' }
  | { readonly como: 'leido'; readonly todos: true }
  | { readonly como: 'leido_por'; readonly cuantos: number; readonly de: number };

export function estadoDeMiMensaje(
  mensajeId: number,
  otros: readonly { readonly entregadoHasta: number; readonly leidoHasta: number }[],
): EstadoDeMiMensaje {
  if (otros.length === 0) return { como: 'enviado' };
  const leido = otros.filter((o) => o.leidoHasta >= mensajeId).length;
  if (leido === otros.length) return { como: 'leido', todos: true };
  if (leido > 0) return { como: 'leido_por', cuantos: leido, de: otros.length };
  const entregado = otros.filter((o) => o.entregadoHasta >= mensajeId).length;
  return entregado === otros.length ? { como: 'entregado' } : { como: 'enviado' };
}

/**
 * Lo que dice el móvil cuando suena por el chat (0071, 7).
 *
 * Uno solo: el último mensaje, con quién lo escribe. Varios del mismo canal, cuántos.
 * En un privado de dos el título es la persona; en un canal, el canal.
 */
export function avisoDelChatEnElMovil(datos: {
  readonly canal: string;
  readonly esPrivadoDeDos: boolean;
  readonly cuantos: number;
  readonly autor: string;
  readonly ultimo: string;
  readonly teMencionan: boolean;
}): { readonly titulo: string; readonly detalle: string } {
  const titulo = datos.canal;
  if (datos.cuantos <= 1) {
    const linea = enUnaLinea(datos.ultimo, 120);
    return {
      titulo,
      detalle: datos.esPrivadoDeDos ? linea : `${datos.autor}: ${linea}`,
    };
  }
  const cuantos = `${String(datos.cuantos)} mensajes nuevos`;
  return { titulo, detalle: datos.teMencionan ? `${cuantos}, y te nombran` : cuantos };
}

/**
 * El correo del chat (C2 · 0075), para quien no tiene el móvil puesto: sus privados y
 * lo que le nombra, sin leer, **uno al día como mucho**. Sin el texto de los mensajes:
 * un correo se queda en el buzón, y lo que se dice en un privado no sale de Estook.
 *
 * «Tienes 3 mensajes sin leer en el chat» · «Marcos: 2. Todo el equipo: 1, y te nombra.»
 */
export function correoDelChat(
  lineas: readonly { readonly canal: string; readonly cuantos: number; readonly teNombran: boolean }[],
): { readonly titulo: string; readonly detalle: string } {
  const total = lineas.reduce((n, l) => n + l.cuantos, 0);
  const cada = lineas
    .map((l) => `${l.canal}: ${String(l.cuantos)}${l.teNombran ? ', y te nombran' : ''}`)
    .join('. ');
  return {
    titulo:
      total === 1
        ? 'Tienes un mensaje sin leer en el chat'
        : `Tienes ${String(total)} mensajes sin leer en el chat`,
    detalle: `${cada}. Ábrelo en Estook para leerlos.`,
  };
}

/**
 * A quién se nombra en un texto: «@Ana». Se buscan los nombres de quien ve el canal,
 * el más largo primero, para que «@Ana María» no se lea como «@Ana».
 */
export function aQuienSeNombra(
  texto: string,
  personas: readonly { readonly id: string; readonly nombre: string }[],
): readonly string[] {
  // Lo reconocido se tapa, para que el nombre corto no se encuentre dentro del largo.
  let trabajo = texto.toLocaleLowerCase('es-ES');
  const nombradas = new Set<string>();
  const ordenadas = [...personas].sort((a, b) => b.nombre.length - a.nombre.length);
  for (const persona of ordenadas) {
    const nombre = persona.nombre.trim().toLocaleLowerCase('es-ES');
    if (nombre === '') continue;
    let desde = 0;
    for (;;) {
      const donde = trabajo.indexOf(`@${nombre}`, desde);
      if (donde === -1) break;
      const fin = donde + nombre.length + 1;
      const despues = trabajo[fin];
      if (despues === undefined || !/[\p{L}\p{N}]/u.test(despues)) {
        nombradas.add(persona.id);
        trabajo = `${trabajo.slice(0, donde)}${' '.repeat(fin - donde)}${trabajo.slice(fin)}`;
      }
      desde = donde + 1;
    }
  }
  return [...nombradas];
}
