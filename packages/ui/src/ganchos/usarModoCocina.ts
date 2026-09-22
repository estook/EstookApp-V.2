import { useCallback, useEffect, useState } from 'react';

/**
 * El modo cocina · mejora 1 de la entrega V.
 *
 * Lo pidió Richi así: «letra y botones más grandes, alto contraste y que se use
 * con guantes». El **qué** cambia está entero en `estilos/cocina.css`, que es
 * donde tiene que estar (regla 32: lo visual se cambia en las fichas, nunca
 * pantalla a pantalla). Aquí solo se decide **si está puesto**, y se pone un
 * atributo en el `<html>`.
 *
 * ── Por qué es del aparato y no de la persona ────────────────────────────────
 *
 * Igual que el tema y el tamaño de letra, y por lo mismo (decisión 0024): **la
 * tableta del pase lo lleva puesto y el móvil del mismo cocinero, no.** Es una
 * preferencia del cristal que se está mirando, así que no viaja con la persona,
 * no necesita conexión y no pide permiso.
 *
 * Y de fábrica está **apagado**: quien no entre en Ajustes ve exactamente lo de
 * siempre.
 *
 * ── Lo que esto sí decide, además de los colores ─────────────────────────────
 *
 * Hay una cosa que CSS no puede apagar: **arrastrar y soltar**. El Panel vivo se
 * ordena arrastrando (decisión 0039), y con un guante mojado mantener pulsado
 * dispara el arrastre sin querer. Así que el componente que arrastra pregunta
 * aquí, y en modo cocina enseña **los botones de subir y bajar** en su lugar
 * —que es lo que el teclado ya sabía hacer, así que no es una pantalla nueva—.
 *
 * Es la razón de que esto sea un gancho y no solo una clase en el `<html>`.
 */
export const DONDE_SE_GUARDA = 'estook.modo-cocina';

/**
 * El atributo del `<html>` que lee `cocina.css`.
 *
 * Se pone y se quita con `setAttribute`/`removeAttribute` y no tocando
 * `dataset`, que es lo que hacen el tema y la letra: esos dos **siempre** tienen
 * un valor —claro u oscuro, pequeña o grande—, así que les basta con asignar.
 * Este se apaga del todo, y quitar un atributo es más claro que borrar una clave
 * de un objeto.
 */
export const ATRIBUTO = 'data-cocina';
export const PUESTO = 'si';

/**
 * Lo que hace falta de un almacén, y nada más.
 *
 * Se pide así de pequeño para poder probarlo con uno de mentira sin montar un
 * navegador entero: lo que hay que comprobar es **qué se guarda y qué pasa
 * cuando no se puede**, no que `localStorage` funcione.
 */
export interface DondeSeRecuerda {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

/**
 * Si el aparato lo tiene puesto.
 *
 * **Nunca lanza.** En navegación privada, o con el almacenamiento capado, leer
 * `localStorage` tira una excepción; eso no es un error de la aplicación, es que
 * hoy no se puede recordar. Se responde «no» y se sigue en modo normal.
 */
export function leerDe(almacen: DondeSeRecuerda | undefined): boolean {
  if (almacen === undefined) return false;
  try {
    return almacen.getItem(DONDE_SE_GUARDA) === PUESTO;
  } catch {
    return false;
  }
}

/**
 * Lo recuerda, o lo olvida.
 *
 * Al apagarlo **se borra la clave** en vez de guardar un «no»: una clave que no
 * está es un aparato que nunca lo tocó, y eso es exactamente lo mismo que un
 * aparato que lo apagó. Dos formas de escribir lo mismo son dos formas de que un
 * día no coincidan.
 *
 * **Tampoco lanza**, por lo mismo que `leerDe`: el modo se aplica igual en esta
 * sesión, solo que no se recordará en la siguiente.
 */
export function guardarEn(almacen: DondeSeRecuerda | undefined, puesto: boolean): void {
  if (almacen === undefined) return;
  try {
    if (puesto) almacen.setItem(DONDE_SE_GUARDA, PUESTO);
    else almacen.removeItem(DONDE_SE_GUARDA);
  } catch {
    // Se aplica igual, solo que no se recordará la próxima vez.
  }
}

/** El almacén del navegador, o nada si no hay navegador. */
function elDelNavegador(): DondeSeRecuerda | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function leerGuardado(): boolean {
  return leerDe(elDelNavegador());
}

export function usarModoCocina(): {
  readonly puesto: boolean;
  readonly poner: (puesto: boolean) => void;
} {
  const [puesto, setPuesto] = useState<boolean>(leerGuardado);

  // El atributo se pone también en el primer pintado, para que no se vean los
  // botones pequeños un instante antes de crecer.
  useEffect(() => {
    if (puesto) document.documentElement.setAttribute(ATRIBUTO, PUESTO);
    else document.documentElement.removeAttribute(ATRIBUTO);
  }, [puesto]);

  const poner = useCallback((nuevo: boolean) => {
    setPuesto(nuevo);
    guardarEn(elDelNavegador(), nuevo);
  }, []);

  return { puesto, poner };
}

/**
 * Lo mismo, para quien solo necesita saberlo y no cambiarlo.
 *
 * Existe porque el componente que arrastra no tiene por qué poder apagar el modo
 * cocina: solo necesita saber si tiene que enseñar los botones de subir y bajar.
 * Dar el interruptor a quien solo va a leer es como se acaba apagándolo desde
 * donde no toca.
 */
export function usarSeVeEnModoCocina(): boolean {
  const [puesto, setPuesto] = useState<boolean>(leerGuardado);

  useEffect(() => {
    // El modo se cambia en Ajustes, que puede estar en otra pestaña del mismo
    // aparato —el pase abierto y Ajustes en el móvil no, pero dos pestañas del
    // mismo navegador sí—. `storage` solo llega a las **otras** pestañas.
    const alCambiar = (evento: StorageEvent) => {
      if (evento.key === DONDE_SE_GUARDA) setPuesto(leerGuardado());
    };
    window.addEventListener('storage', alCambiar);

    // Y en **esta** pestaña se sabe por el atributo del <html>, que es lo que pinta
    // el modo: quien lo lee aquí —el color del local, que en cocina se ajusta a
    // 7:1— se entera en el mismo momento en que cambia la pantalla, sin recargar.
    const vigilante = new MutationObserver(() => {
      setPuesto(document.documentElement.getAttribute(ATRIBUTO) === PUESTO);
    });
    vigilante.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [ATRIBUTO],
    });

    return () => {
      window.removeEventListener('storage', alCambiar);
      vigilante.disconnect();
    };
  }, []);

  return puesto;
}
