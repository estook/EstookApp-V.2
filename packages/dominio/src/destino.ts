/**
 * A donde se entra · las seis comprobaciones (M4).
 *
 * El Manifiesto (28) lo escribe en una frase, y **el orden es lo importante**:
 *
 *   «Despues de entrar, en este orden: se comprueba el estado de la suscripcion
 *    → si pertenece a varias organizaciones, se elige → si su alcance es
 *    organizacion o area, entra en la vista de cadena → si llega a varios
 *    locales, "¿donde estas hoy?" → si no ha terminado el onboarding, sigue por
 *    donde iba.»
 *
 * Son cinco puertas y un destino, seis pasos. El Plan las llama «las seis
 * comprobaciones» y esta funcion las hace, en ese orden y sin saltarse ninguna.
 *
 * ── Por que esto es una funcion pura y vive aqui ─────────────────────────────
 *
 * Porque es una **decision**, no una consulta. Separada de la lectura, se puede
 * probar entera: los casos raros de este orden (la que lleva dos empresas y
 * ademas es area manager en una de ellas, la que tiene un solo local pero sin
 * terminar el alta) son justo los que nadie prueba a mano y los que se rompen.
 *
 * Y vive en `packages/dominio` y no en el servidor porque la pantalla necesita
 * los mismos nombres para saber a donde llevar. Un calculo, un unico dueno
 * (regla 6).
 *
 * ── Lo que NO decide ─────────────────────────────────────────────────────────
 *
 * Nada de permisos. Que se puede ver dentro lo dice `mis_permisos`, que lo
 * resuelve la base de datos. Esto solo dice **por que pantalla se empieza**.
 */

/** Los seis sitios donde puede acabar quien entra. */
export const DESTINOS = [
  /** La suscripcion esta archivada o impagada: no se pasa de aqui. */
  'cuenta_parada',
  /** Trabaja en varias empresas. Primero, en cual. */
  'elegir_organizacion',
  /** Alcance de organizacion o de area: el consolidado, no un local. */
  'vista_de_cadena',
  /** «¿Donde estas hoy?» */
  'elegir_local',
  /** El alta del local se quedo a medias. Sigue por donde iba (M5). */
  'onboarding',
  /** El Panel de su local. El sitio donde acaba casi todo el mundo. */
  'panel',
] as const;

export type Destino = (typeof DESTINOS)[number];

/** Lo que hace falta saber de quien acaba de entrar para decidir a donde va. */
export interface QuienAcabaDeEntrar {
  /** El estado de la suscripcion de cada organizacion a la que llega. */
  readonly organizaciones: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly estado: 'prueba' | 'activa' | 'impago' | 'solo_lectura' | 'archivada';
    /** El alcance mas amplio que tiene en esta organizacion. */
    readonly alcance: 'organizacion' | 'area' | 'local';
  }[];
  /** Los locales que alcanza, ya filtrados por `locales_visibles`. */
  readonly locales: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly organizacionId: string;
    readonly onboardingTerminado: boolean;
  }[];
  /**
   * La organizacion que traia la sesion, si ya habia elegido una. Cambiar de
   * local no abre sesion nueva, asi que al volver se sigue donde se estaba.
   */
  readonly organizacionElegida?: string | null;
  readonly localElegido?: string | null;
}

export interface ResolucionDeDestino {
  readonly destino: Destino;
  /** Resuelta si ya no hay nada que elegir. */
  readonly organizacionId: string | null;
  readonly localId: string | null;
  /** Por que se ha ido ahi, en una frase. Se ensena y se registra. */
  readonly porque: string;
}

/**
 * Un estado que no deja trabajar. `prueba` y `activa` si dejan; `solo_lectura`
 * tambien, porque «al dia 15 sin contratar: solo lectura, con todo exportable»
 * y quien no puede exportar sus datos no puede irse, que es peor que no cobrar.
 */
function laCuentaEstaParada(estado: string): boolean {
  return estado === 'archivada' || estado === 'impago';
}

export function aDondeEntra(quien: QuienAcabaDeEntrar): ResolucionDeDestino {
  // Si ya habia elegido organizacion en esta sesion, se respeta; si no, y solo
  // llega a una, esa. Es lo que hace que cambiar de local no vuelva a preguntar.
  const candidatas = quien.organizaciones;

  // ── 1 · El estado de la suscripcion ───────────────────────────────────────
  //
  // Va primero, antes que nada: no tiene sentido preguntar donde estas hoy si la
  // cuenta esta archivada. Basta con que **alguna** deje trabajar; quien lleva
  // dos empresas y una esta impagada entra igual en la otra.
  const vivas = candidatas.filter((o) => !laCuentaEstaParada(o.estado));

  if (candidatas.length > 0 && vivas.length === 0) {
    const primera = candidatas[0];
    return {
      destino: 'cuenta_parada',
      organizacionId: primera?.id ?? null,
      localId: null,
      porque:
        primera?.estado === 'archivada'
          ? 'La cuenta está archivada. Nada se ha borrado: al pagar vuelve todo tal cual.'
          : 'Hay un pago pendiente. En cuanto se resuelva, todo vuelve a la normalidad.',
    };
  }

  // Quien no llega a ninguna organizacion no deberia poder entrar. Se dice, en
  // vez de dejarle en una pantalla vacia preguntandose que ha hecho mal.
  if (vivas.length === 0) {
    return {
      destino: 'cuenta_parada',
      organizacionId: null,
      localId: null,
      porque:
        'Tu cuenta no está asociada a ningún negocio todavía. Pídele a quien te invitó que lo revise.',
    };
  }

  // ── 2 · Si pertenece a varias organizaciones, se elige ────────────────────
  const yaElegida = vivas.find((o) => o.id === quien.organizacionElegida);
  const laOrganizacion = yaElegida ?? (vivas.length === 1 ? vivas[0] : undefined);

  if (laOrganizacion === undefined) {
    return {
      destino: 'elegir_organizacion',
      organizacionId: null,
      localId: null,
      porque: 'Trabajas en más de un negocio. Elige en cuál estás.',
    };
  }

  const susLocales = quien.locales.filter((l) => l.organizacionId === laOrganizacion.id);
  const yaElegido = susLocales.find((l) => l.id === quien.localElegido);

  // ── 3 · Alcance de organizacion o de area → la vista de cadena ────────────
  //
  // «Un area manager no entra en un local: entra en su conjunto» (Roles, 2.1).
  // Va **antes** de «¿donde estas hoy?» a proposito: a quien lleva seis locales
  // no se le pregunta en cual esta, porque la respuesta es «en ninguno y en
  // todos». Entra en el consolidado y desde alli decide.
  //
  // Con un solo local no hay conjunto que ensenar, y se sigue al Panel: un
  // consolidado de un local es una pantalla que no dice nada.
  //
  // Y **solo si no ha entrado ya en uno**. Esto no es un detalle: la resolucion
  // se rehace en cada peticion, asi que sin esta condicion el area manager que
  // pulsa «Entrar» en Bar Puerto volveria al consolidado en el siguiente clic, y
  // «se puede saltar de Puerto a Playa sin volver a pasar por el consolidado»
  // (Roles, 2.2) seria mentira. Lo cazo una prueba, no la pantalla.
  if (yaElegido === undefined && laOrganizacion.alcance !== 'local' && susLocales.length > 1) {
    return {
      destino: 'vista_de_cadena',
      organizacionId: laOrganizacion.id,
      localId: null,
      porque: `Llevas ${susLocales.length} locales: se entra en el conjunto, no en uno.`,
    };
  }

  // ── 4 · Si llega a varios locales, «¿donde estas hoy?» ────────────────────
  const elLocal = yaElegido ?? (susLocales.length === 1 ? susLocales[0] : undefined);

  if (elLocal === undefined) {
    if (susLocales.length === 0) {
      return {
        destino: 'cuenta_parada',
        organizacionId: laOrganizacion.id,
        localId: null,
        porque: 'Todavía no tienes ningún local asignado. Pídeselo a quien lleva el negocio.',
      };
    }
    return {
      destino: 'elegir_local',
      organizacionId: laOrganizacion.id,
      localId: null,
      porque: '¿Dónde estás hoy?',
    };
  }

  // ── 5 · Si no ha terminado el onboarding, sigue por donde iba ─────────────
  if (!elLocal.onboardingTerminado) {
    return {
      destino: 'onboarding',
      organizacionId: laOrganizacion.id,
      localId: elLocal.id,
      porque: 'El alta de este local se quedó a medias. Sigue por donde ibas.',
    };
  }

  // ── 6 · Su Panel ──────────────────────────────────────────────────────────
  return {
    destino: 'panel',
    organizacionId: laOrganizacion.id,
    localId: elLocal.id,
    porque: `Estás en ${elLocal.nombre}.`,
  };
}
