import { useEffect } from 'react';
import { derivarAcento, esColorHex, type AcentoPintable, type DondeSePinta } from '../color.ts';
import { usarSeVeOscuro } from './usarTema.ts';

/**
 * El color del local, pintando la aplicacion entera.
 *
 * ── Que hace exactamente ─────────────────────────────────────────────────────
 *
 * Escribe cuatro fichas en el <html>, y con eso cambia el acento de todo:
 * botones, pastillas, el anillo de foco, el sector activo de la rueda, la barra
 * de abajo. Ninguna pantalla se entera, igual que con el tema.
 *
 * ── Y por que no escribe el color tal cual ───────────────────────────────────
 *
 * Porque el color que alguien elige y el color que se puede pintar no son el
 * mismo. Un granate de bodega sobre una tarjeta blanca se ve perfectamente, pero
 * el texto del boton principal era charcoal —porque el naranja de Estook es
 * claro— y encima del granate no se lee. Y un amarillo corporativo no se ve
 * contra el blanco por mucho que sea el color de la empresa.
 *
 * Asi que **se guarda lo que la persona eligio y se pinta lo que cumple**: el
 * ajuste lo hace `derivarAcento`, con los minimos de B8, y esta probado color a
 * color en `color.prueba.ts`. B8 no tiene una excepcion para «lo eligio el
 * usuario».
 *
 * ── Por que se recalcula al cambiar de tema ──────────────────────────────────
 *
 * Porque el ajuste depende de sobre que se pinta. El mismo azul necesita
 * oscurecerse sobre una tarjeta blanca y aclararse sobre una oscura, y con el
 * tema «el del sistema» eso puede cambiar sin que nadie toque nada: basta con que
 * se haga de noche en el movil. Los colores de partida se leen del propio
 * documento, no de una copia, para que no haya dos paletas que puedan separarse.
 */
const FICHAS = {
  acento: '--color-naranja',
  acentoSuave: '--color-naranja-suave',
  sobreAcento: '--color-sobre-naranja',
  acentoEnOscuro: '--color-naranja-en-oscuro',
} as const;

/** Lo que hay debajo ahora mismo, leido del documento. */
function dondeSePintaAhora(): DondeSePinta {
  const estilo = window.getComputedStyle(document.documentElement);
  const ficha = (nombre: string, siNo: string) => {
    const valor = estilo.getPropertyValue(nombre).trim();
    return esColorHex(valor) ? valor : siNo;
  };
  return {
    superficie: ficha('--color-superficie', '#ffffff'),
    texto: ficha('--color-texto', '#111c1f'),
    oscuro: ficha('--color-charcoal', '#111c1f'),
  };
}

/**
 * Pinta la aplicacion con el color del local, o la deja como es de fabrica.
 *
 * `color` nulo —o el interruptor apagado— quita las cuatro fichas en vez de
 * escribir el naranja a mano: asi el de fabrica sigue viviendo **solo** en
 * `fichas.css`, y el dia que cambie no hay una segunda copia aqui que se quede
 * con el viejo.
 */
export function usarElColorDeLaApp(color: string | null): void {
  const oscuro = usarSeVeOscuro();

  useEffect(() => {
    const raiz = document.documentElement;

    if (color === null || !esColorHex(color)) {
      for (const ficha of Object.values(FICHAS)) raiz.style.removeProperty(ficha);
      return;
    }

    const pintable = derivarAcento(color, dondeSePintaAhora());
    for (const [cual, ficha] of Object.entries(FICHAS)) {
      raiz.style.setProperty(ficha, pintable[cual as keyof AcentoPintable] as string);
    }

    // Al desmontar se quita: si no, cerrar sesion en una tablet compartida
    // dejaria el color del local anterior puesto hasta recargar.
    return () => {
      for (const ficha of Object.values(FICHAS)) raiz.style.removeProperty(ficha);
    };
    // `oscuro` esta en las dependencias a proposito: cuando cambia, la superficie
    // de debajo es otra y el acento hay que volver a ajustarlo.
  }, [color, oscuro]);
}
