import { unidadesQueSirven, type UnidadDeUso } from '@estook/dominio';
import { Campo } from '@estook/ui';
import { NOMBRE_DE_LA_UNIDAD, leerCantidad, type RacionQueSeEscribe } from './contrato.ts';

/**
 * «Cada ración lleva 300 g»: lo que se pregunta al vincular algo que en el Almacén va en
 * gramos o mililitros (el entrecot, la dorada entera, el helado). Lo que va por unidades
 * no lo pregunta: es una (lección 190).
 */
export function LaRacion({
  nombre,
  unidadDelProducto,
  racion,
  alCambiar,
}: {
  readonly nombre: string;
  readonly unidadDelProducto: UnidadDeUso;
  readonly racion: RacionQueSeEscribe;
  readonly alCambiar: (racion: RacionQueSeEscribe) => void;
}) {
  const mal = racion.cantidad !== '' && leerCantidad(racion.cantidad) === null;
  return (
    <Campo
      etiqueta={`Cada ración de ${nombre} lleva`}
      inputMode="decimal"
      value={racion.cantidad}
      placeholder={racion.unidad === 'g' || racion.unidad === 'ml' ? '300' : '0,3'}
      onChange={(e) => {
        alCambiar({ ...racion, cantidad: e.target.value });
      }}
      unidad={{
        valor: racion.unidad,
        opciones: unidadesQueSirven(unidadDelProducto).map((u) => ({
          valor: u,
          larga: NOMBRE_DE_LA_UNIDAD[u],
        })),
        alElegir: (u) => {
          alCambiar({ ...racion, unidad: u as UnidadDeUso });
        },
      }}
      {...(mal ? { error: 'Un número, como 300 o 0,5' } : {})}
    />
  );
}
