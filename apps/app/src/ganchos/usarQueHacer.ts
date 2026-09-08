import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * «Nada más llegar, abre esto».
 *
 * ── Por qué una acción es una dirección y no una llamada ─────────────────────
 *
 * Las acciones del catálogo tienen que poder pulsarse desde tres sitios —el widget
 * de accesos rápidos, la paleta del buscador y, cuando llegue, Fogón— y ninguno de
 * los tres está dentro de la pantalla que abre el formulario. La forma fácil sería
 * un estado global de «hay que abrir el alta de producto», y es la mala: se queda
 * pegado al navegar, se dispara dos veces si se vuelve atrás, y no se puede
 * compartir.
 *
 * Así que una acción es **una dirección**: `/inventario/productos/todo?hacer=nuevo`.
 * Eso trae tres cosas gratis:
 *
 *   · El enlace se puede copiar y pegar en el chat del equipo, y funciona.
 *   · Volver atrás con el botón del navegador cierra lo que se abrió, porque la
 *     dirección de antes no llevaba `hacer`.
 *   · Y la pantalla no tiene que saber quién la llamó.
 *
 * ── Y se quita de la dirección al abrirse ────────────────────────────────────
 *
 * En cuanto se abre, el `hacer` se borra de la dirección con `replace`, para que
 * recargar la página no vuelva a abrir el formulario encima de lo que se estuviera
 * haciendo. Con `replace` y no navegando: si dejara rastro en el historial, el botón
 * de atrás lo reabriría.
 */
export function usarQueHacer(cual: string, hacerlo: () => void): void {
  const [parametros, ponerParametros] = useSearchParams();
  const pedido = parametros.get('hacer');

  useEffect(() => {
    if (pedido !== cual) return;

    hacerlo();

    const limpios = new URLSearchParams(parametros);
    limpios.delete('hacer');
    ponerParametros(limpios, { replace: true });
    // `hacerlo` cambia en cada pintado si viene como función suelta, y esto tiene
    // que dispararse una vez por dirección y no una por pintado. Lo que decide es
    // qué se pide, no la identidad de la función.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido, cual]);
}
