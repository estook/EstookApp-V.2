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
}

export interface RespuestaDeFogon {
  readonly texto: string;
  readonly modelo: string;
  readonly tokens: TokensDeUnaLlamada;
  /** El modelo no ha querido contestar (sus filtros de seguridad). */
  readonly rechazada: boolean;
  /** Se ha quedado a medias: llegó al tope de lo que podía escribir. */
  readonly cortada: boolean;
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

/** Lo más que se espera a una respuesta: una persona con la mano en el móvil. */
const ESPERA_MAXIMA_MS = 25_000;

/**
 * El de verdad. **Nulo si no hay clave**, y entonces Fogón dice que no está
 * conectado, con su motivo, en vez de romperse.
 */
export function modeloDeAnthropic(
  clave: string | undefined = variable('AI_API_KEY'),
  modelo: string = variable('AI_MODELO_RAPIDO')?.trim() || MODELO_DE_FOGON,
): ModeloDeFogon | null {
  if (clave === undefined || clave.trim() === '') return null;
  const cliente = new Anthropic({
    apiKey: clave.trim(),
    // Uno solo: dentro de la transacción no se espera a tres intentos.
    maxRetries: 1,
    timeout: ESPERA_MAXIMA_MS,
  });

  return {
    modelo,
    async pedir(peticion) {
      let respuesta: Anthropic.Message;
      try {
        respuesta = await cliente.messages.create({
          model: modelo,
          max_tokens: peticion.hastaTokens,
          thinking: { type: 'disabled' },
          system: [
            { type: 'text', text: peticion.reglas, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: peticion.resumen, cache_control: { type: 'ephemeral' } },
          ],
          messages: peticion.mensajes.map((m) => ({ role: m.rol, content: m.texto })),
          output_config: {
            effort: 'low',
            ...(peticion.forma === undefined
              ? {}
              : { format: { type: 'json_schema', schema: peticion.forma } }),
          },
        });
      } catch (fallo) {
        if (fallo instanceof Anthropic.APIError) {
          const { tipo, detalle } = loQueDiceAnthropic(
            fallo as InstanceType<typeof Anthropic.APIError>,
          );
          throw new FogonNoContesta(
            typeof fallo.status === 'number' ? fallo.status : null,
            tipo,
            detalle,
          );
        }
        throw new FogonNoContesta(
          null,
          null,
          (fallo instanceof Error ? `${fallo.name}: ${fallo.message}` : String(fallo)).slice(
            0,
            300,
          ),
        );
      }

      const texto = respuesta.content
        .flatMap((bloque) => (bloque.type === 'text' ? [bloque.text] : []))
        .join('')
        .trim();
      return {
        texto,
        modelo: respuesta.model,
        tokens: {
          entrada: respuesta.usage.input_tokens,
          cacheLeidos: respuesta.usage.cache_read_input_tokens ?? 0,
          cacheEscritos: respuesta.usage.cache_creation_input_tokens ?? 0,
          salida: respuesta.usage.output_tokens,
        },
        rechazada: respuesta.stop_reason === 'refusal',
        cortada: respuesta.stop_reason === 'max_tokens',
      };
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
      return Promise.resolve({
        texto: contestar(peticion),
        modelo: 'de-mentira',
        tokens: { entrada: 1200, cacheLeidos: 0, cacheEscritos: 0, salida: 80 },
        rechazada: false,
        cortada: false,
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
  const campos = Object.keys((peticion.forma?.['properties'] as object | undefined) ?? {});
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
