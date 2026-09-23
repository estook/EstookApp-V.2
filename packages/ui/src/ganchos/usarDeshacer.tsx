import { createContext, useContext } from 'react';

/**
 * El deshacer universal · Manifiesto y Partes B4 y B6 del Plan.
 *
 * «**Deshacer siempre**, diez segundos, en todo lo que no tenga consecuencia
 * legal» · «`Deshacer` (barra inferior de 10 segundos)» · «Deshacer: aparece
 * abajo y se va sola a los 10 s».
 *
 * ── Como esta pensado ────────────────────────────────────────────────────────
 *
 * Deshacer **no es un historial**. Es una sola accion, la ultima, durante diez
 * segundos. Un historial largo suena mejor y es peor: nadie se acuerda de que
 * hizo hace ocho pasos, y en cuanto hay red de por medio deshacer lo de hace
 * ocho pasos deja de ser posible sin inventarse un modelo entero de compensacion.
 *
 * Diez segundos es el arrepentimiento de verdad: acabo de darle y no queria.
 *
 * ── Lo que NO hace ───────────────────────────────────────────────────────────
 *
 * No revierte por su cuenta. Cada accion **trae su contraria escrita**, porque
 * solo quien la hizo sabe deshacerla: cambiar el idioma se deshace volviendo a
 * llamar al comando con el idioma de antes, y eso pasa por la API, con su clave
 * de idempotencia y su version. Aqui solo se guarda esa funcion y se llama.
 *
 * Y no se usa para nada con consecuencia legal: cerrar una jornada, publicar un
 * cuadrante o firmar un APPCC no se deshacen con una barra que se va sola. Eso
 * se corrige con un asiento nuevo que deja rastro.
 */
export interface AccionQueSePuedeDeshacer {
  /** Que se acaba de hacer, en pasado y en una frase: «Idioma cambiado a ingles». */
  readonly que: string;
  /** Como se deshace. Puede tardar: se espera y se avisa si falla. */
  readonly deshacer: () => void | Promise<void>;
}

export interface Pendiente extends AccionQueSePuedeDeshacer {
  readonly id: number;
}

/**
 * Un fallo que hay que decir, con su titulo.
 *
 * Nacio para «no se ha podido deshacer» y sirve para cualquier cosa que falle
 * **despues** de que la persona haya dejado de mirar el boton que la provoco:
 * la barra ya esta puesta en la raiz, ya se anuncia sola y ya se cierra sola.
 * Sin esto, cada sitio que quisiera decir algo se inventaria su propio cartel.
 */
export interface FalloQueHayQueDecir {
  readonly titulo: string;
  readonly texto: string;
}

export interface Contexto {
  /** Apunta una accion como deshacible. Sustituye a la anterior, si la habia. */
  readonly sePuedeDeshacer: (accion: AccionQueSePuedeDeshacer) => void;
  readonly pendiente: Pendiente | null;
  readonly deshacer: () => void;
  readonly olvidar: () => void;
  /** Si algo fallo, para poder decirlo. */
  readonly fallo: FalloQueHayQueDecir | null;
  /**
   * Dice un fallo en la barra de abajo.
   *
   * Es para lo que falla **sin que haya una pantalla mirando**: cambiar de
   * local, deshacer, cualquier cosa que se dispara desde la barra o desde un
   * menu y termina cuando la persona ya esta en otro sitio. Callarselo la
   * dejaria creyendo que se hizo, que es el fallo mas caro que hay.
   */
  readonly avisarDeUnFallo: (fallo: FalloQueHayQueDecir) => void;
}

/** Los diez segundos del Plan. Se exporta para que la prueba no los adivine. */
export const SEGUNDOS_PARA_DESHACER = 10;

/**
 * Dónde vive el deshacer. Lo llena `ProveedorDeDeshacer`, que está en
 * `componentes/`: así este fichero no mezcla un componente con el gancho y la
 * recarga en caliente de Vite no tiene que recargar la página entera.
 */
export const DeshacerContexto = createContext<Contexto | null>(null);

export function usarDeshacer(): Contexto {
  const contexto = useContext(DeshacerContexto);
  if (!contexto) {
    throw new Error(
      'usarDeshacer() necesita estar dentro de <ProveedorDeDeshacer>. Se pone una sola vez, en la raíz de la aplicación.',
    );
  }
  return contexto;
}
