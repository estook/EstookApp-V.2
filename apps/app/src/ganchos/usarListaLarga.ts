import { useInfiniteQuery } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Una lista que crece todos los días, leída de tanto en tanto (M7, repaso).
 *
 * ── El fallo que esto arregla ────────────────────────────────────────────────
 *
 * El libro de movimientos y el histórico de mermas se pedían con un tope fijo
 * —«los cien últimos», «los doscientos últimos»— y debajo ponía «busca por
 * producto para encontrar los de antes». Y el buscador **filtraba esas cien líneas
 * ya traídas**, así que la frase era falsa: buscar algo de hace tres meses
 * contestaba «nada con eso».
 *
 * Es el mismo fallo que ya se arregló en la lista de Productos con las vistas: «un
 * filtro que solo funciona cuando la lista cabe entera es un filtro que miente».
 *
 * ── Cómo funciona ───────────────────────────────────────────────────────────
 *
 * Tres cosas, y las tres en el servidor:
 *
 *   · **Un tramo de tiempo**, que se elige arriba: un mes, tres, seis o un año.
 *     Es lo que acota de verdad, y es como se piensa —«lo de este trimestre»—.
 *   · **Buscar dentro del tramo entero**, no dentro de lo traído.
 *   · **«Ver más», que trae la página siguiente** y la añade a lo que ya hay, sin
 *     perder dónde estabas ni volver a pedir lo de arriba.
 *
 * Así una lista de diez mil líneas se recorre sin traerse diez mil líneas nunca,
 * que es el presupuesto de velocidad de B7 y es, sobre todo, lo que hace que la
 * pantalla siga sirviendo dentro de dos años.
 */
export function usarListaLarga<T extends { readonly hayMas: boolean }>(
  nombre: string,
  parametros: Readonly<Record<string, string>>,
  /** Cuántas por página. Lo que el servidor acepta como mucho son 200. */
  porPagina = 50,
) {
  const { cliente } = usarSesion();

  return useInfiniteQuery({
    queryKey: [nombre, parametros, porPagina],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<T> => {
      const respuesta = await cliente.consultar<T>(nombre, {
        ...parametros,
        limite: String(porPagina),
        salto: String(pageParam),
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    // El servidor dice si queda algo detrás; aquí solo se cuenta por dónde se va.
    // Nunca se adivina el total: contar diez mil filas para pintar «página 3 de
    // 200» es un viaje caro para un dato que nadie usa.
    getNextPageParam: (ultima, todas) => (ultima.hayMas ? todas.length * porPagina : undefined),
  });
}
