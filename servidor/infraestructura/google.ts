import { variable } from '@estook/utiles';

/**
 * Google Places, detrás de un puerto (M7, entrega 5 · decisión 0040).
 *
 * «Todo pasa por nuestra API, nunca desde el navegador: la clave de Google no sale
 * del servidor» (0030). La capa de aplicación no sabe que detrás hay Google: sabe
 * buscar un sitio y pedir su ficha. Así se prueba con uno de mentira, y así el día
 * que haga falta cambiar de proveedor es cambiar este fichero.
 *
 * ── Lo que se pide, y nada más ───────────────────────────────────────────────
 *
 * Places (New) cobra por **los campos** que se piden, no por la llamada: la
 * máscara de campos es el precio. Se piden exactamente los que se guardan en
 * `estook.local` y ninguno más. La valoración, el teléfono, la web y el horario son
 * del escalón caro (Enterprise), y se piden porque la 0030 los quiere: los
 * documentos, la carta digital y proponer la hora de corte.
 */

export interface SugerenciaDeGoogle {
  readonly id: string;
  readonly nombre: string;
  readonly direccion: string;
}

export interface FichaDeGoogle {
  readonly id: string;
  readonly nombre: string | null;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly web: string | null;
  readonly mapa: string | null;
  readonly latitud: number | null;
  readonly longitud: number | null;
  readonly valoracion: number | null;
  readonly resenas: number | null;
  /** Una línea por día, en castellano: «lunes: 8:00–16:00». */
  readonly horario: readonly string[] | null;
}

export interface LugaresDeGoogle {
  /** Sugerencias para lo escrito. `sesion` agrupa la búsqueda con la ficha. */
  buscar(texto: string, sesion: string): Promise<readonly SugerenciaDeGoogle[]>;
  ficha(id: string, sesion: string | null): Promise<FichaDeGoogle>;
}

/** Google no ha contestado bien. Lo traduce a una frase la capa de aplicación. */
export class GoogleNoContesta extends Error {
  // Sin propiedad en el constructor: la API de pruebas corre con Node quitando
  // tipos, y esa sintaxis no se deja quitar.
  readonly estado: number;

  constructor(estado: number) {
    super(`Google ha contestado ${estado}`);
    this.name = 'GoogleNoContesta';
    this.estado = estado;
  }
}

const RAIZ = 'https://places.googleapis.com/v1';

/** Los campos de la ficha. Cada uno es dinero: ver arriba. */
const CAMPOS_DE_LA_FICHA = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'nationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'rating',
  'userRatingCount',
  'regularOpeningHours.weekdayDescriptions',
].join(',');

/** Lo que devuelve Google, solo lo que se lee. */
interface RespuestaDeBuscar {
  readonly suggestions?: readonly {
    readonly placePrediction?: {
      readonly placeId?: string;
      readonly structuredFormat?: {
        readonly mainText?: { readonly text?: string };
        readonly secondaryText?: { readonly text?: string };
      };
      readonly text?: { readonly text?: string };
    };
  }[];
}

interface RespuestaDeFicha {
  readonly id?: string;
  readonly displayName?: { readonly text?: string };
  readonly formattedAddress?: string;
  readonly location?: { readonly latitude?: number; readonly longitude?: number };
  readonly nationalPhoneNumber?: string;
  readonly websiteUri?: string;
  readonly googleMapsUri?: string;
  readonly rating?: number;
  readonly userRatingCount?: number;
  readonly regularOpeningHours?: { readonly weekdayDescriptions?: readonly string[] };
}

/**
 * El de verdad. **Nulo si no hay clave**, y entonces Ajustes dice que Google no
 * está conectado, con su motivo, en vez de romperse (0022).
 */
export function lugaresDeGoogle(
  clave: string | undefined = variable('GOOGLE_MAPS_KEY'),
): LugaresDeGoogle | null {
  if (clave === undefined || clave.trim() === '') return null;

  const cabeceras = (mascara?: string): Record<string, string> => ({
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': clave,
    ...(mascara === undefined ? {} : { 'X-Goog-FieldMask': mascara }),
  });

  return {
    async buscar(texto, sesion) {
      const respuesta = await fetch(`${RAIZ}/places:autocomplete`, {
        method: 'POST',
        headers: cabeceras(
          'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text',
        ),
        body: JSON.stringify({
          input: texto,
          sessionToken: sesion,
          languageCode: 'es',
          regionCode: 'es',
          // Solo sitios, no direcciones sueltas ni búsquedas: se busca un local.
          includeQueryPredictions: false,
        }),
      });
      if (!respuesta.ok) throw new GoogleNoContesta(respuesta.status);
      const datos = (await respuesta.json()) as RespuestaDeBuscar;
      return (datos.suggestions ?? []).flatMap((s) => {
        const p = s.placePrediction;
        if (p?.placeId === undefined) return [];
        return [
          {
            id: p.placeId,
            nombre: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
            direccion: p.structuredFormat?.secondaryText?.text ?? '',
          },
        ];
      });
    },

    async ficha(id, sesion) {
      const parametros = new URLSearchParams({ languageCode: 'es', regionCode: 'es' });
      if (sesion !== null) parametros.set('sessionToken', sesion);
      const respuesta = await fetch(
        `${RAIZ}/places/${encodeURIComponent(id)}?${parametros.toString()}`,
        { headers: cabeceras(CAMPOS_DE_LA_FICHA) },
      );
      if (!respuesta.ok) throw new GoogleNoContesta(respuesta.status);
      const d = (await respuesta.json()) as RespuestaDeFicha;
      return {
        id: d.id ?? id,
        nombre: d.displayName?.text ?? null,
        direccion: d.formattedAddress ?? null,
        telefono: d.nationalPhoneNumber ?? null,
        web: d.websiteUri ?? null,
        mapa: d.googleMapsUri ?? null,
        latitud: d.location?.latitude ?? null,
        longitud: d.location?.longitude ?? null,
        valoracion: d.rating ?? null,
        resenas: d.userRatingCount ?? null,
        horario: d.regularOpeningHours?.weekdayDescriptions ?? null,
      };
    },
  };
}

/**
 * Uno de mentira, para las pruebas. Siempre contesta lo mismo y cuenta cuántas
 * veces le han preguntado, que es lo que se comprueba: que el tope corta antes de
 * llegar a Google.
 */
export function lugaresDeMentira(): LugaresDeGoogle & { readonly llamadas: { n: number } } {
  const llamadas = { n: 0 };
  const ficha: FichaDeGoogle = {
    id: 'lugar-de-prueba',
    nombre: 'Bar Centro',
    direccion: 'Calle Mayor 1, 20001 Donostia',
    telefono: '943 00 00 00',
    web: 'https://ejemplo.estook.com',
    mapa: 'https://maps.google.com/?cid=1',
    latitud: 43.3183,
    longitud: -1.9812,
    valoracion: 4.4,
    resenas: 212,
    horario: ['lunes: 8:00–16:00', 'martes: 8:00–16:00'],
  };
  return {
    llamadas,
    buscar() {
      llamadas.n += 1;
      return Promise.resolve([
        { id: ficha.id, nombre: 'Bar Centro', direccion: 'Calle Mayor 1, Donostia' },
      ]);
    },
    ficha(id) {
      llamadas.n += 1;
      return Promise.resolve({ ...ficha, id });
    },
  };
}
