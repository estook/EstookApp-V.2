import type { PapelCompuesto } from '@estook/dominio';
import {
  IMPRESORA_DE_58_MM,
  IMPRESORA_DE_80_MM,
  aEscPos,
  type ComoEstaElPapel,
  type ComoSalio,
} from '@estook/impresion';
import type { LoQueSabeElCentro } from './el-centro.ts';

/**
 * **La cola de la caja** (T5 · 1, decisión 0119; Anexo 6.5): lo que hace el programa con su
 * llave, también con la caja bloqueada y sin nadie dentro.
 *
 *   1 · pide a la API lo que tiene que imprimir (`la_cola_de_la_caja`), ya compuesto
 *   2 · mira cómo está cada impresora; sin papel o sin responder, va por **la de reserva**
 *   3 · traduce cada papel a ESC/POS y lo manda, **en orden**, uno detrás de otro
 *   4 · dice a la API cómo salió cada uno y cómo está cada impresora (`apuntar_lo_impreso`)
 *
 * Una vuelta cada vez que llega el toque al segundo, y una por minuto por si se pierde. **Nunca
 * dos vueltas a la vez**: lo que llega mientras tanto, se hace en la siguiente. Lo que no sale
 * vuelve a la cola y lo intenta la vuelta siguiente (la API lo para a los cinco intentos).
 */

export interface TrabajoParaLaCaja {
  readonly id: string;
  readonly tipo: string;
  readonly papel: PapelCompuesto;
  readonly impresora: {
    readonly id: string;
    readonly nombre: string;
    readonly direccion: string;
    readonly anchoMm: 58 | 80;
  };
  readonly reserva: {
    readonly id: string;
    readonly direccion: string;
    readonly anchoMm: 58 | 80;
  } | null;
}

export interface LaColaQueDaLaApi {
  readonly trabajos: readonly TrabajoParaLaCaja[];
  readonly temaAlSegundo: string | null;
  readonly impresoras: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly direccion: string;
  }[];
  /** Lo que necesita el centro para cuando falte internet (T5 · 2 · 2, 0123). */
  readonly elCentro?: LoQueSabeElCentro;
}

export type EstadoDeLaImpresora = 'lista' | 'poco_papel' | 'sin_papel' | 'no_responde';

export interface LoQueSeApunta {
  readonly trabajos: readonly {
    readonly id: string;
    readonly salio: boolean;
    readonly por_la_reserva: boolean;
    readonly error: string | null;
  }[];
  readonly impresoras: readonly { readonly id: string; readonly estado: EstadoDeLaImpresora }[];
}

/** Lo de fuera, para poder probarlo sin red ni impresoras. */
export interface LoDeFuera {
  leerLaCola(): Promise<LaColaQueDaLaApi>;
  apuntar(lo: LoQueSeApunta): Promise<void>;
  mandar(direccion: string, bytes: Uint8Array): Promise<ComoSalio>;
  comoEsta(direccion: string): Promise<ComoEstaElPapel | 'no_responde'>;
}

function elEstado(como: ComoEstaElPapel | 'no_responde'): EstadoDeLaImpresora {
  return como === 'bien' ? 'lista' : como;
}

const SE_PUEDE_IMPRIMIR: ReadonlySet<EstadoDeLaImpresora> = new Set(['lista', 'poco_papel']);

export interface ComoFueLaVuelta {
  readonly impresos: number;
  readonly fallidos: number;
  readonly temaAlSegundo: string | null;
  readonly impresoras: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly direccion: string;
  }[];
  readonly elCentro?: LoQueSabeElCentro;
}

/** **Una vuelta**: lee la cola, imprime en orden y lo apunta. */
export async function unaVuelta(fuera: LoDeFuera): Promise<ComoFueLaVuelta> {
  const cola = await fuera.leerLaCola();
  const estados = new Map<string, EstadoDeLaImpresora>();
  const comoEstaYa = async (id: string, direccion: string): Promise<EstadoDeLaImpresora> => {
    const sabido = estados.get(id);
    if (sabido !== undefined) return sabido;
    const estado = elEstado(await fuera.comoEsta(direccion));
    estados.set(id, estado);
    return estado;
  };

  const apuntados: LoQueSeApunta['trabajos'][number][] = [];
  for (const t of cola.trabajos) {
    const estado = await comoEstaYa(t.impresora.id, t.impresora.direccion);
    let salio: ComoSalio = {
      salio: false,
      porque: estado === 'sin_papel' ? 'Sin papel' : 'No responde',
    };
    if (SE_PUEDE_IMPRIMIR.has(estado)) {
      salio = await fuera.mandar(
        t.impresora.direccion,
        aEscPos(t.papel, ancho(t.impresora.anchoMm)),
      );
      if (!salio.salio) estados.set(t.impresora.id, 'no_responde');
    }
    let porLaReserva = false;
    if (!salio.salio && t.reserva !== null) {
      const deLaReserva = await comoEstaYa(t.reserva.id, t.reserva.direccion);
      if (SE_PUEDE_IMPRIMIR.has(deLaReserva)) {
        const otra = await fuera.mandar(
          t.reserva.direccion,
          aEscPos(t.papel, ancho(t.reserva.anchoMm)),
        );
        if (otra.salio) {
          salio = otra;
          porLaReserva = true;
        } else {
          estados.set(t.reserva.id, 'no_responde');
        }
      }
    }
    apuntados.push({
      id: t.id,
      salio: salio.salio,
      por_la_reserva: porLaReserva,
      error: salio.salio ? null : (salio.porque ?? 'No ha salido'),
    });
  }

  // Y cómo están las que no han tenido nada que imprimir: para la franja de la sala.
  for (const i of cola.impresoras) await comoEstaYa(i.id, i.direccion);

  if (apuntados.length > 0 || estados.size > 0) {
    await fuera.apuntar({
      trabajos: apuntados,
      impresoras: [...estados.entries()].map(([id, estado]) => ({ id, estado })),
    });
  }
  return {
    impresos: apuntados.filter((a) => a.salio).length,
    fallidos: apuntados.filter((a) => !a.salio).length,
    temaAlSegundo: cola.temaAlSegundo,
    impresoras: cola.impresoras,
    ...(cola.elCentro === undefined ? {} : { elCentro: cola.elCentro }),
  };
}

function ancho(mm: 58 | 80) {
  return mm === 58 ? IMPRESORA_DE_58_MM : IMPRESORA_DE_80_MM;
}

/**
 * **La cola en marcha**: una vuelta al despertar (el toque, o al conectar) y otra cada minuto,
 * sin pisarse. Lo que falla no la para: la siguiente vuelta lo intenta otra vez.
 */
export class LaColaEnMarcha {
  private reloj: ReturnType<typeof setInterval> | null = null;
  private enMarcha: Promise<void> | null = null;
  private otraVez = false;
  private ultima: ComoFueLaVuelta | null = null;
  private conectada = false;

  constructor(
    private readonly fuera: LoDeFuera,
    private readonly cadaMs = 60_000,
    private readonly alAcabar: (vuelta: ComoFueLaVuelta) => void = () => undefined,
  ) {}

  empezar(): void {
    if (this.reloj !== null) return;
    this.reloj = setInterval(() => {
      this.despertar();
    }, this.cadaMs);
    this.despertar();
  }

  parar(): void {
    if (this.reloj !== null) clearInterval(this.reloj);
    this.reloj = null;
  }

  /** Que dé una vuelta ya; si está dando una, otra al acabar. */
  despertar(): void {
    if (this.enMarcha !== null) {
      this.otraVez = true;
      return;
    }
    this.enMarcha = (async () => {
      do {
        this.otraVez = false;
        try {
          this.ultima = await unaVuelta(this.fuera);
          this.conectada = true;
          this.alAcabar(this.ultima);
        } catch {
          // Sin internet o sin API: la siguiente vuelta. Nada se pierde: sigue en la cola.
          this.conectada = false;
        }
      } while (this.quiereOtraVuelta());
      this.enMarcha = null;
    })();
  }

  /** Si mientras daba la vuelta llegó otro toque, y la cola sigue en marcha. */
  private quiereOtraVuelta(): boolean {
    return this.otraVez && this.reloj !== null;
  }

  /** Para las pruebas: espera a que acabe la vuelta que haya. */
  async esperar(): Promise<void> {
    while (this.enMarcha !== null) await this.enMarcha;
  }

  comoVa(): { readonly conectada: boolean; readonly porSalir: number } {
    return { conectada: this.conectada, porSalir: this.ultima?.fallidos ?? 0 };
  }
}
