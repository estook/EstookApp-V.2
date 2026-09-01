import { estadoDeLasBanderas } from '@estook/utiles';
import type { Entorno } from '@estook/utiles';

/**
 * Pantalla de cimientos (M0).
 *
 * No es producto: es la prueba de que la aplicacion arranca, sabe en que entorno
 * esta, tiene su identificador de correlacion y lee las banderas de funcion.
 * En M3 la sustituye el esqueleto de verdad (barra, rueda de apps y Panel).
 */
export interface CimientosProps {
  readonly aplicacion: string;
  readonly entorno: Entorno;
  readonly correlacionId: string;
}

export function Cimientos({ aplicacion, entorno, correlacionId }: CimientosProps) {
  const banderas = estadoDeLasBanderas(entorno, import.meta.env);

  // Solo si esta declarada, nunca su valor: sirve para comprobar de un vistazo
  // que las variables del repositorio han llegado a lo publicado.
  const baseDeDatos = import.meta.env['VITE_SUPABASE_URL'] ? 'configurada' : 'sin configurar';

  return (
    <main className="cimientos">
      <p className="marca">ESTOOK</p>
      <h1>{aplicacion}</h1>
      <p className="claim">Tu cocina, bajo control.</p>

      <dl>
        <dt>Entorno</dt>
        <dd>{entorno}</dd>
        <dt>Correlacion</dt>
        <dd>{correlacionId}</dd>
        <dt>Base de datos</dt>
        <dd>{baseDeDatos}</dd>
        <dt>Banderas</dt>
        <dd>
          {Object.entries(banderas)
            .map(([nombre, encendida]) => `${nombre}: ${encendida ? 'si' : 'no'}`)
            .join(' · ')}
        </dd>
      </dl>

      <p className="nota">
        M0 · cimientos y disciplina. Aqui todavia no hay producto, y es a proposito.
      </p>
    </main>
  );
}
