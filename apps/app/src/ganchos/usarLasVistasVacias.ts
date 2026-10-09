import { createContext, useContext, useEffect } from 'react';

/**
 * Las vistas que se esconden por estar vacías (repaso del 9-oct, punto 3).
 *
 * «En Almacén, esconder "Sin precio", "Congelados" o "Desactivados" si están
 * vacíos: así no ocupan tanto.» Las vistas las pinta la pantalla de la app, arriba,
 * y lo que hay en cada una lo sabe la pantalla de dentro: esta es la línea entre las
 * dos. La de dentro dice cuáles están vacías; la de fuera no las pinta, **salvo la
 * que se está mirando**, que no desaparece debajo de quien la mira.
 */
export const LasVistasVacias = createContext<(ids: readonly string[]) => void>(() => undefined);

/** Nulo mientras no se sabe: no se esconde nada a ciegas. */
export function usarEsconderLasVistasVacias(vacias: readonly string[] | null): void {
  const esconder = useContext(LasVistasVacias);
  const clave = vacias === null ? null : vacias.join(',');
  useEffect(() => {
    if (clave !== null) esconder(clave === '' ? [] : clave.split(','));
  }, [clave, esconder]);
  // Al salir de la pantalla, las vistas vuelven a ser todas.
  useEffect(
    () => () => {
      esconder([]);
    },
    [esconder],
  );
}
