import { describe, expect, it } from 'vitest';
import { esUnTrozoQueNoLlega } from './SiAlgoFalla.tsx';

/**
 * La red de debajo de cada pantalla distingue «este trozo no ha llegado» de
 * cualquier otro fallo, porque solo el primero se arregla recargando sola.
 *
 * Cada navegador lo dice con sus palabras, y los tres tienen que reconocerse: si
 * Safari no se reconociera, un iPhone con la app abierta el día de publicar se
 * quedaría con el aviso en vez de traer la versión nueva sola.
 */
describe('esUnTrozoQueNoLlega', () => {
  it('reconoce cómo lo dicen Safari, Chrome y Firefox', () => {
    expect(esUnTrozoQueNoLlega(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(
      esUnTrozoQueNoLlega(
        new TypeError(
          'Failed to fetch dynamically imported module: https://estook.com/app/assets/Movimientos-X.js',
        ),
      ),
    ).toBe(true);
    expect(esUnTrozoQueNoLlega(new TypeError('error loading dynamically imported module'))).toBe(
      true,
    );
    expect(esUnTrozoQueNoLlega(new Error('Unable to preload CSS for /assets/x.css'))).toBe(true);
  });

  it('y no confunde con eso un fallo cualquiera', () => {
    expect(
      esUnTrozoQueNoLlega(new TypeError("Cannot read properties of undefined (reading 'id')")),
    ).toBe(false);
    expect(esUnTrozoQueNoLlega('sin_conexion')).toBe(false);
  });
});
