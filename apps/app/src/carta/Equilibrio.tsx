import { Aviso, Cargando, ConMasInfo, EstadoVacio, Mosaico, Proporcion, Tarjeta } from '@estook/ui';
import { MAXIMO_DE_PLATOS_POR_SECCION, type EquilibrioDeUnaSeccion } from '@estook/dominio';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { comoDinero } from '../almacen/contrato.ts';
import type { EquilibrioDeLaCarta } from './contrato.ts';

/**
 * El equilibrio de la carta (M10 · 1, decisión 0102), en Carta › Análisis.
 *
 * Sección a sección, con los principios de Omnes: el salto de precios, la franja media y
 * el tamaño. **Lo esencial a la vista y el porqué plegado** (poco texto): cada sección
 * dice su rango y su barra de franjas, y lo que hay que mirar, si lo hay. Estook dice;
 * no cambia nada.
 */

const DE_DONDE_SALE = (
  <>
    De los <strong>principios de Omnes</strong>, los que se enseñan en las escuelas de hostelería.
    Por sección: el más caro no pasa de 2,5 veces el más barato (3 con más de 9 platos); partido el
    rango en tres, la franja del medio tiene al menos tantos platos como las otras dos juntas; y de
    6 a {String(MAXIMO_DE_PLATOS_POR_SECCION)} platos por sección.
  </>
);

function UnaSeccion({ seccion }: { readonly seccion: EquilibrioDeUnaSeccion }) {
  const bien = seccion.avisos.length === 0;
  const rango =
    seccion.masBarato === null || seccion.masCaro === null
      ? null
      : `De ${comoDinero(seccion.masBarato)} a ${comoDinero(seccion.masCaro)}`;
  return (
    <Tarjeta titulo={seccion.nombre} cuantos={seccion.platos}>
      <div className="flex flex-col gap-e3">
        {seccion.juzgada ? (
          <>
            <p className="text-cuerpo">
              {rango}
              {seccion.salto !== null && (
                <span className="text-texto-suave">
                  {' '}
                  · {String(seccion.salto).replace('.', ',')} veces
                </span>
              )}
            </p>
            {seccion.franjas !== null && (
              <Proporcion
                titulo={`Los platos de ${seccion.nombre} por franja de precio`}
                trozos={[
                  { que: 'baratos', cuantos: seccion.franjas.baja, tono: 'info' },
                  { que: 'en medio', cuantos: seccion.franjas.media, tono: 'bien' },
                  { que: 'caros', cuantos: seccion.franjas.alta, tono: 'marca' },
                ]}
              />
            )}
          </>
        ) : (
          <p className="text-secundario text-texto-suave">
            Con menos de tres precios no se puede juzgar.
          </p>
        )}
        {bien ? (
          seccion.juzgada && <p className="text-secundario text-bien">Equilibrada</p>
        ) : (
          <ul className="flex flex-col gap-e2">
            {seccion.avisos.map((aviso) => (
              <li key={aviso} className="text-secundario text-atencion">
                {aviso}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Tarjeta>
  );
}

export function Equilibrio() {
  const consulta = usarLectura<EquilibrioDeLaCarta>('el_equilibrio_de_la_carta');

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="el equilibrio de tu carta" forma="tarjetas" lineas={3} />
      </div>
    );
  }
  const datos = consulta.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido mirar tu carta">
        Prueba en un momento.
      </Aviso>
    );
  }
  if (datos.secciones.length === 0) {
    return (
      <Tarjeta>
        <EstadoVacio
          dibujo="platos"
          acento="var(--color-app-carta)"
          titulo="Sin platos todavía"
          frase="Con tu carta puesta, aquí ves si está equilibrada: los precios de cada sección y cuántos platos tiene."
          sinAccionPorque="Los platos se añaden en Carta."
        />
      </Tarjeta>
    );
  }

  const titulo =
    datos.conAlgoQueMirar === 0
      ? 'Tu carta está equilibrada'
      : datos.conAlgoQueMirar === 1
        ? 'Una sección que mirar'
        : `${String(datos.conAlgoQueMirar)} secciones que mirar`;

  return (
    <div className="flex flex-col gap-e4">
      <ConMasInfo info={DE_DONDE_SALE} queExplica="De dónde salen estas reglas">
        <h2 className="text-titulo font-semibold">{titulo}</h2>
      </ConMasInfo>
      <Mosaico>
        {datos.secciones.map((seccion) => (
          <UnaSeccion key={seccion.nombre} seccion={seccion} />
        ))}
      </Mosaico>
    </div>
  );
}
