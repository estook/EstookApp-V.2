import { createContext, useContext, type ReactNode } from 'react';

/**
 * Lo que el esqueleto sabe abrir, para las pantallas de dentro.
 *
 * ── Por qué hace falta un contexto y no basta con navegar ────────────────────
 *
 * Porque el buscador universal, Fogón y los avisos **no son direcciones**: son
 * capas que se abren encima de donde estás, y su estado vive en el esqueleto a
 * propósito —tres ventanas distintas para lo mismo acabarían diciendo cosas
 * distintas—.
 *
 * Hasta M6½ eso solo lo necesitaba el propio esqueleto, así que no había forma de
 * abrirlas desde dentro. El widget de accesos rápidos del Panel es el primero que
 * la necesita: «buscar en todo» es una acción del catálogo como las demás, y tiene
 * que poder pulsarse desde una tarjeta.
 *
 * ── Y por qué está en su propio fichero ──────────────────────────────────────
 *
 * Porque el gancho y el componente no pueden convivir: los ganchos propios van en
 * `ganchos/`, que es donde `rules-of-hooks` está apagada —se llaman `usarX` y esa
 * regla solo entiende `use`— y porque un fichero que exporta un componente y
 * además una función rompe la recarga en caliente de Vite.
 */
export interface LoQueAbreElEsqueleto {
  readonly abrirElBuscador: () => void;
  readonly abrirFogon: () => void;
  readonly abrirLosAvisos: () => void;
  readonly abrirMiCuenta: () => void;
}

const ElEsqueleto = createContext<LoQueAbreElEsqueleto | null>(null);

export function ProveedorDelEsqueleto({
  loQueAbre,
  children,
}: {
  readonly loQueAbre: LoQueAbreElEsqueleto;
  readonly children: ReactNode;
}) {
  return <ElEsqueleto.Provider value={loQueAbre}>{children}</ElEsqueleto.Provider>;
}

/**
 * Fuera del esqueleto no revienta: devuelve funciones que no hacen nada.
 *
 * Es lo correcto para lo que es —abrir una capa de navegación— y evita que una
 * pantalla que se pruebe suelta tenga que montar el esqueleto entero.
 */
export function usarElEsqueleto(): LoQueAbreElEsqueleto {
  return (
    useContext(ElEsqueleto) ?? {
      abrirElBuscador: () => undefined,
      abrirFogon: () => undefined,
      abrirLosAvisos: () => undefined,
      abrirMiCuenta: () => undefined,
    }
  );
}
