import Anthropic from '@anthropic-ai/sdk';
import { MODELO_DE_FOGON, type TokensDeUnaLlamada } from '@estook/dominio';
import { variable } from '@estook/utiles';

/**
 * El modelo de Fogón, detrás de un puerto (Fogón 1 · 1, decisión 0097).
 *
 * «Detrás de una interfaz propia: cambiar de modelo es cambiar un adaptador» (este
 * mismo directorio, desde M0). La capa de aplicación no sabe que detrás está Claude:
 * sabe pedir un texto o un JSON con unas reglas y un resumen. Así se prueba con uno de
 * mentira, que no gasta, y así el día que cambie el proveedor se cambia este fichero.
 *
 * ── Lo que se pide, para que sea rápido y barato ─────────────────────────────
 *
 *   · **El modelo más barato** (Claude Haiku 5.5, respuesta 1 de la 0097), con el
 *     esfuerzo bajo y **sin pensar en voz alta**: lo que piensa también se paga.
 *   · **Las reglas y el resumen, cacheados**: si se vuelve a preguntar en los cinco
 *     minutos siguientes, lo repetido cuesta una décima parte.
 *   · **Un tope de lo que escribe**, y un tiempo máximo: una persona no espera más.
 *
 * La clave vive en los secretos de Supabase (`AI_API_KEY`) y no sale del servidor.
 * Sin ella, Fogón dice que no está conectado: no se rompe nada (0022).
 */

export interface MensajeAFogon {
  readonly rol: 'user' | 'assistant';
  readonly texto: string;
}

export interface PeticionAFogon {
  /** Las reglas de Fogón: lo que no cambia, primero, para que se cachee. */
  readonly reglas: string;
  /** El resumen de lo que hay (0023), armado en el servidor. */
  readonly resumen: string;
  readonly mensajes: readonly MensajeAFogon[];
  /** Lo más que puede escribir, en tokens. */
  readonly hastaTokens: number;
  /** Si tiene que contestar un JSON con esta forma (salida estructurada). */
  readonly forma?: Record<string, unknown>;
  /**
   * Una foto que acompaña al último mensaje (Fogón 1 · 2, 0098): el albarán, el Z, lo
   * que se tira. Ya reducida en el móvil; aquí no se guarda, solo se le enseña.
   */
  readonly foto?: FotoParaFogon;
  /**
   * Que busque en internet («Analiza mi zona», M10 · 2, 0104): cuántas búsquedas como
   * mucho y dónde está el local, para que busque cerca. Con esto no se pide salida
   * estructurada: el JSON va en el texto, y se lee con cuidado.
   */
  readonly buscarEnInternet?: BuscarEnInternet;
}

export interface BuscarEnInternet {
  readonly maxBusquedas: number;
  readonly ciudad: string | null;
  readonly region: string | null;
  /** Dos letras: «ES». */
  readonly pais: string;
  readonly zonaHoraria: string | null;
}

/** Una foto para Fogón: JPEG o WebP, en base64 y sin el prefijo `data:`. */
export interface FotoParaFogon {
  readonly tipo: 'image/jpeg' | 'image/webp';
  readonly base64: string;
}

export interface RespuestaDeFogon {
  readonly texto: string;
  readonly modelo: string;
  readonly tokens: TokensDeUnaLlamada;
  /** El modelo no ha querido contestar (sus filtros de seguridad). */
  readonly rechazada: boolean;
  /** Se ha quedado a medias: llegó al tope de lo que podía escribir. */
  readonly cortada: boolean;
  /**
   * Las direcciones que de verdad ha visto al buscar en internet. Un enlace que diga y
   * no esté aquí, se lo ha inventado: no se guarda (0104).
   */
  readonly enlacesVistos?: readonly string[];
}

export interface ModeloDeFogon {
  readonly modelo: string;
  pedir(peticion: PeticionAFogon): Promise<RespuestaDeFogon>;
}

/**
 * El modelo no ha contestado bien. Lleva **el motivo que da Anthropic** (su tipo de
 * error y su frase, que nunca llevan la clave): sin él, «no ha contestado» no dice si
 * es la clave, el saldo o el modelo (lo que vio Richi el 18-oct). Lo traduce a una
 * frase la capa de aplicación.
 */
export class FogonNoContesta extends Error {
  // Sin propiedades en el constructor: la API de pruebas corre con Node quitando tipos.
  readonly estado: number | null;
  /** El tipo de error de Anthropic: `authentication_error`, `not_found_error`… */
  readonly tipo: string | null;
  /** La frase de Anthropic, o la del fallo de red. */
  readonly detalle: string;

  constructor(estado: number | null, tipo: string | null = null, detalle = '') {
    super(
      `Fogón no ha contestado${estado === null ? '' : ` (${String(estado)})`}${
        tipo === null ? '' : ` · ${tipo}`
      }${detalle === '' ? '' : ` · ${detalle}`}`,
    );
    this.name = 'FogonNoContesta';
    this.estado = estado;
    this.tipo = tipo;
    this.detalle = detalle;
  }
}

/** El tipo y la frase de un error de la API de Anthropic, si los trae. */
function loQueDiceAnthropic(fallo: InstanceType<typeof Anthropic.APIError>): {
  tipo: string | null;
  detalle: string;
} {
  const cuerpo = fallo.error as { error?: { type?: unknown; message?: unknown } } | undefined;
  const tipo = typeof cuerpo?.error?.type === 'string' ? cuerpo.error.type : null;
  const detalle = typeof cuerpo?.error?.message === 'string' ? cuerpo.error.message : fallo.message;
  return { tipo, detalle: detalle.slice(0, 300) };
}

/**
 * La clave tal como la pega una persona en Supabase: con espacios, un salto de línea,
 * entre comillas o con el `AI_API_KEY=` delante. Una clave de Anthropic no lleva nada de
 * eso, así que se quita (19-oct: ninguna llamada había funcionado en producción).
 */
export function limpiarLaClave(clave: string): string {
  return clave
    .trim()
    .replace(/^AI_API_KEY\s*=\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, '');
}

/**
 * Los mensajes tal como los pide Anthropic. La foto va **en el último mensaje de la
 * persona, antes del texto**: es lo que mejor lee el modelo (la imagen primero).
 */
export function conLaFoto(
  mensajes: readonly MensajeAFogon[],
  foto: FotoParaFogon | undefined,
): Anthropic.MessageParam[] {
  const ultimo = mensajes.length - 1;
  return mensajes.map((m, i) =>
    foto !== undefined && i === ultimo && m.rol === 'user'
      ? {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: foto.tipo, data: foto.base64 } },
            { type: 'text', text: m.texto },
          ],
        }
      : { role: m.rol, content: m.texto },
  );
}

/** Lo más que se espera a una respuesta: una persona con la mano en el móvil. */
const ESPERA_MAXIMA_MS = 25_000;
/**
 * Y lo que se espera a lo que es largo de leer o de escribir: una foto (el modelo lee la
 * imagen entera) o una respuesta larga, como el horario de la semana (0098).
 */
const ESPERA_DE_LO_LARGO_MS = 50_000;
const TOKENS_DE_LO_LARGO = 2000;
/**
 * Y lo que se espera a quien busca en internet: varias búsquedas y leer lo encontrado. La
 * función del servidor tiene 150 s; se deja margen para guardar.
 */
const ESPERA_DE_LA_BUSQUEDA_MS = 110_000;
/** Las veces que se le deja seguir si Anthropic pausa una búsqueda larga (`pause_turn`). */
const SEGUIR_TRAS_PAUSA = 2;
/**
 * Si el modelo de siempre no puede buscar en internet, se pide una vez a este (0104): es el
 * siguiente más barato. Lo cambia el secreto `AI_MODELO_ZONA`.
 */
export const MODELO_PARA_BUSCAR = 'claude-sonnet-5-5';

/** Las direcciones de lo que ha encontrado al buscar, y de lo que cita. */
export function losEnlacesDeLaRespuesta(contenido: readonly Anthropic.ContentBlock[]): string[] {
  const vistos = new Set<string>();
  for (const bloque of contenido) {
    if (bloque.type === 'web_search_tool_result' && Array.isArray(bloque.content)) {
      for (const resultado of bloque.content) vistos.add(resultado.url);
    }
    if (bloque.type === 'text') {
      for (const cita of bloque.citations ?? []) {
        if ('url' in cita && typeof cita.url === 'string') vistos.add(cita.url);
      }
    }
  }
  return [...vistos];
}

/** Si Anthropic dice que este modelo no puede usar la búsqueda en internet. */
function noPuedeBuscar(fallo: FogonNoContesta): boolean {
  const dice = fallo.detalle.toLowerCase();
  return fallo.estado === 400 && (dice.includes('web_search') || dice.includes('tool'));
}

/**
 * El de verdad. **Nulo si no hay clave**, y entonces Fogón dice que no está
 * conectado, con su motivo, en vez de romperse.
 */
export function modeloDeAnthropic(
  clave: string | undefined = variable('AI_API_KEY'),
  modelo: string = variable('AI_MODELO_RAPIDO')?.trim() || MODELO_DE_FOGON,
): ModeloDeFogon | null {
  const limpia = limpiarLaClave(clave ?? '');
  if (limpia === '') return null;
  const cliente = new Anthropic({
    apiKey: limpia,
    // Uno solo: dentro de la transacción no se espera a tres intentos.
    maxRetries: 1,
    timeout: ESPERA_MAXIMA_MS,
  });

  const modeloParaBuscar = variable('AI_MODELO_ZONA')?.trim() || MODELO_PARA_BUSCAR;

  /** Una llamada, con su búsqueda si la lleva; si Anthropic la pausa, sigue (`pause_turn`). */
  async function llamar(conModelo: string, peticion: PeticionAFogon): Promise<RespuestaDeFogon> {
    const busca = peticion.buscarEnInternet;
    const espera =
      busca !== undefined
        ? ESPERA_DE_LA_BUSQUEDA_MS
        : peticion.foto !== undefined || peticion.hastaTokens > TOKENS_DE_LO_LARGO
          ? ESPERA_DE_LO_LARGO_MS
          : ESPERA_MAXIMA_MS;
    const herramientas: Anthropic.ToolUnion[] =
      busca === undefined
        ? []
        : [
            {
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: busca.maxBusquedas,
              user_location: {
                type: 'approximate',
                country: busca.pais,
                ...(busca.ciudad === null ? {} : { city: busca.ciudad }),
                ...(busca.region === null ? {} : { region: busca.region }),
                ...(busca.zonaHoraria === null ? {} : { timezone: busca.zonaHoraria }),
              },
            },
          ];
    const mensajes = conLaFoto(peticion.mensajes, peticion.foto);
    const contenido: Anthropic.ContentBlock[] = [];
    const tokens = { entrada: 0, cacheLeidos: 0, cacheEscritos: 0, salida: 0, busquedas: 0 };
    let respuesta: Anthropic.Message | null = null;
    for (let vuelta = 0; vuelta <= SEGUIR_TRAS_PAUSA; vuelta += 1) {
      respuesta = await cliente.messages.create(
        {
          model: conModelo,
          max_tokens: peticion.hastaTokens,
          // Sin pensar en voz alta, que también se paga. Al buscar no se dice: el plan B,
          // Sonnet 5.5, no admite `disabled` (da error), y con esfuerzo bajo piensa poco.
          ...(busca === undefined ? { thinking: { type: 'disabled' as const } } : {}),
          system: [
            { type: 'text', text: peticion.reglas, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: peticion.resumen, cache_control: { type: 'ephemeral' } },
          ],
          messages: mensajes,
          ...(herramientas.length === 0 ? {} : { tools: herramientas }),
          output_config: {
            effort: 'low',
            ...(peticion.forma === undefined || busca !== undefined
              ? {}
              : { format: { type: 'json_schema', schema: peticion.forma } }),
          },
        },
        { timeout: espera },
      );
      contenido.push(...respuesta.content);
      tokens.entrada += respuesta.usage.input_tokens;
      tokens.cacheLeidos += respuesta.usage.cache_read_input_tokens ?? 0;
      tokens.cacheEscritos += respuesta.usage.cache_creation_input_tokens ?? 0;
      tokens.salida += respuesta.usage.output_tokens;
      tokens.busquedas += respuesta.usage.server_tool_use?.web_search_requests ?? 0;
      if (respuesta.stop_reason !== 'pause_turn') break;
      // Pausada a media búsqueda: se le devuelve lo suyo tal cual y sigue.
      mensajes.push({ role: 'assistant', content: respuesta.content });
    }
    if (respuesta === null) throw new FogonNoContesta(null, null, 'Sin respuesta');

    // Lo que escribe para la persona: el texto de la última vuelta, tras buscar.
    const texto = respuesta.content
      .flatMap((bloque) => (bloque.type === 'text' ? [bloque.text] : []))
      .join('')
      .trim();
    return {
      texto,
      modelo: respuesta.model,
      tokens,
      rechazada: respuesta.stop_reason === 'refusal',
      cortada: respuesta.stop_reason === 'max_tokens',
      ...(busca === undefined ? {} : { enlacesVistos: losEnlacesDeLaRespuesta(contenido) }),
    };
  }

  /** El error de Anthropic, con su motivo. */
  function comoNoContesta(fallo: unknown): FogonNoContesta {
    if (fallo instanceof FogonNoContesta) return fallo;
    if (fallo instanceof Anthropic.APIError) {
      const { tipo, detalle } = loQueDiceAnthropic(fallo as InstanceType<typeof Anthropic.APIError>);
      return new FogonNoContesta(typeof fallo.status === 'number' ? fallo.status : null, tipo, detalle);
    }
    return new FogonNoContesta(
      null,
      null,
      (fallo instanceof Error ? `${fallo.name}: ${fallo.message}` : String(fallo)).slice(0, 300),
    );
  }

  return {
    modelo,
    async pedir(peticion) {
      try {
        return await llamar(modelo, peticion);
      } catch (primero) {
        const fallo = comoNoContesta(primero);
        // Si el de siempre no puede buscar en internet, una vez con el que sí (0104).
        if (
          peticion.buscarEnInternet === undefined ||
          !noPuedeBuscar(fallo) ||
          modeloParaBuscar === modelo
        ) {
          throw fallo;
        }
      }
      try {
        return await llamar(modeloParaBuscar, peticion);
      } catch (segundo) {
        throw comoNoContesta(segundo);
      }
    },
  };
}

/**
 * Uno de mentira, para las pruebas y la API de pruebas: **no gasta nada**. Contesta lo
 * que se le diga (por defecto, un texto fijo) y guarda lo que le han pedido, que es lo
 * que se comprueba: que el resumen no lleva lo que no debe, y que el tope corta antes
 * de llegar al modelo.
 */
export function modeloDeMentira(
  contestar: (peticion: PeticionAFogon) => string = contestaDePrueba,
): ModeloDeFogon & { readonly pedidas: PeticionAFogon[] } {
  const pedidas: PeticionAFogon[] = [];
  return {
    modelo: 'de-mentira',
    pedidas,
    pedir(peticion) {
      pedidas.push(peticion);
      const texto = contestar(peticion);
      const busca = peticion.buscarEnInternet !== undefined;
      return Promise.resolve({
        texto,
        modelo: 'de-mentira',
        tokens: {
          entrada: 1200,
          cacheLeidos: 0,
          cacheEscritos: 0,
          salida: 80,
          ...(busca ? { busquedas: 3 } : {}),
        },
        rechazada: false,
        cortada: false,
        // Lo que «ha visto» al buscar: lo de `ejemplo.es`. Lo de otro sitio, inventado.
        ...(busca
          ? {
              enlacesVistos: [...texto.matchAll(/https:\/\/[a-z0-9.]*ejemplo\.es\/[^"\s]*/g)].map(
                (m) => m[0],
              ),
            }
          : {}),
      });
    },
  };
}

/**
 * Lo que contesta el de mentira si no se le dice otra cosa: un texto, o el JSON que se
 * le pide (un escandallo de croquetas, o sus pasos), para que las pantallas se puedan
 * probar enteras sin gastar.
 */
export function contestaDePrueba(peticion: PeticionAFogon): string {
  if (peticion.buscarEnInternet !== undefined) return laZonaDePrueba(peticion.resumen);
  const campos = Object.keys((peticion.forma?.['properties'] as object | undefined) ?? {});
  const primero = primerProductoDelResumen(peticion.resumen);
  // ── Fogón 1 · 2 y 1 · 3 (0098): lo que lee y lo que prepara ─────────────────
  if (campos.includes('total')) {
    return JSON.stringify({
      fecha: '',
      total: 1234.5,
      efectivo: 400,
      tarjeta: 834.5,
      otros: 0,
      tickets: 42,
      comensales: 0,
      lineas: [{ concepto: 'Croquetas', unidades: 12, importe: 96 }],
    });
  }
  if (campos.includes('numero')) {
    return JSON.stringify({
      numero: 'A-2024',
      fecha: '',
      proveedor: '',
      lineas: [
        {
          texto: primero,
          producto: primero,
          formatos: 3,
          cantidad: 0,
          precio: 12.5,
          importe: 37.5,
          lote: 'L-77',
          caduca: '',
        },
        {
          texto: 'Algo que no tienes',
          producto: '',
          formatos: 1,
          cantidad: 0,
          precio: 0,
          importe: 0,
          lote: '',
          caduca: '',
        },
      ],
    });
  }
  if (campos.includes('mermas')) {
    return JSON.stringify({
      mermas: [{ producto: primero, cantidad: 2, motivo: 'roto', detalle: 'Se ha caído' }],
    });
  }
  if (campos.includes('cambios')) {
    const delPedido = /^- ([^·]+?) ·/m.exec(peticion.resumen)?.[1] ?? primero;
    return JSON.stringify({
      cambios: [{ producto: delPedido, formatos: 5, porque: 'Más gente el sábado.' }],
      resumen: 'He subido lo que más se gasta para el sábado.',
    });
  }
  if (campos.includes('tramos')) {
    const texto = peticion.mensajes.at(-1)?.texto ?? '';
    const personas = [...texto.matchAll(/^(P\d+) ·/gm)].map((m) => m[1] ?? '');
    const dias = ['martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return JSON.stringify({
      tramos: personas.flatMap((persona) =>
        dias.map((dia) => ({ persona, dia, entra: '12:00', sale: '16:00', descanso_minutos: 0 })),
      ),
      explicacion: 'Todos de martes a sábado a mediodía. Esto es Fogón de pruebas.',
    });
  }
  // ── M10 · 1 (0102): una página de la carta, pasada a líneas ────────────────
  if (campos.includes('lineas_de_la_carta')) {
    return JSON.stringify({
      lineas_de_la_carta: [
        'Entrantes:',
        'Croquetas caseras 9,00 €',
        'Gildas de la casa 3,50 €',
        'Postres:',
        'Tarta de queso 6,00 €',
      ],
    });
  }
  if (campos.includes('repetidos')) {
    return JSON.stringify({ repetidos: [], pasos: [] });
  }
  if (campos.includes('lineas')) {
    return JSON.stringify({
      raciones: 1,
      lineas: [
        { ingrediente: 'Leche entera', cantidad: 120, unidad: 'ml' },
        { ingrediente: 'Harina de trigo', cantidad: 30, unidad: 'g' },
        { ingrediente: 'Huevo', cantidad: 1, unidad: 'ud' },
      ],
    });
  }
  if (campos.includes('pasos')) {
    return JSON.stringify({
      pasos: [
        'Calentar la leche sin que llegue a hervir.',
        'Hacer la bechamel con la harina y la leche, removiendo diez minutos.',
        'Enfriar, bolear, pasar por huevo y freír a 180 °C.',
      ],
      minutos: 40,
    });
  }
  return 'Esto es Fogón de pruebas: no he llamado a ningún modelo.';
}

/**
 * «Analiza mi zona» de mentira (0104): para el primer plato de la carta, tres locales que lo
 * cobran 1 € menos; para el menú del día, tres precios; y uno con un enlace que no ha visto
 * (`inventado.com`), que no se tiene que guardar.
 */
function laZonaDePrueba(resumen: string): string {
  const plato = /^- (.+?): /m.exec(resumen)?.[1] ?? 'Plato';
  const precio = Number(/^- .+?: (\d+),(\d+) €/m.exec(resumen)?.slice(1, 3).join('.') ?? '10');
  const enlace = (n: number) => `https://bar${String(n)}.ejemplo.es/carta`;
  return JSON.stringify({
    resumen: 'He mirado tres bares de tu calle que publican su carta. Esto es Fogón de pruebas.',
    locales: [1, 2, 3].map((n) => ({ nombre: `Bar ${String(n)}`, enlace: enlace(n) })),
    precios: [
      ...[1, 2, 3].map((n) => ({
        tu_plato: plato,
        donde: `Bar ${String(n)}`,
        plato,
        precio: precio - 1,
        enlace: enlace(n),
        fecha: '2026-10',
      })),
      ...[1200, 1300, 1400].map((centimos, i) => ({
        tu_plato: 'menú del día',
        donde: `Bar ${String(i + 1)}`,
        plato: 'Menú del día',
        precio: centimos / 100,
        enlace: enlace(i + 1),
        fecha: '',
      })),
      {
        tu_plato: plato,
        donde: 'Bar Inventado',
        plato,
        precio: 1,
        enlace: 'https://inventado.com/carta',
        fecha: '',
      },
    ],
  });
}

/**
 * El primer producto de la lista que lleva el resumen («Tomate pera (g)»), sin lo de
 * entre paréntesis: para que el de mentira conteste con un producto que existe.
 */
function primerProductoDelResumen(resumen: string): string {
  const lista = resumen.split('\n').slice(1).join('\n');
  const primero = lista
    .split(/\n|; /)
    .map((t) =>
      t
        .replace(/^- /, '')
        .replace(/\s*\(.*$/, '')
        .trim(),
    )
    .find((t) => t !== '' && !t.startsWith('('));
  return primero ?? 'Producto';
}
