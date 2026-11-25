import { comoPorcentaje } from '@estook/dominio';
import { Cargando, EstadoVacio, Tarjeta } from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { MisFichas } from '../escandallos/contrato.ts';
import { comoDinero } from '../almacen/contrato.ts';
import type { MiCarta } from './contrato.ts';

/**
 * **Carta › Bebidas** (la Ampliación, 0153, arreglo 2; la maqueta aprobada el 24-nov): lo que se monta
 * solo —lo que se vende tal cual y las bebidas de un ingrediente o los cafés— ya no está en
 * Escandallos, porque no hay nada que escandallar. Aquí se ve lo que cuesta, a cuánto se vende y lo
 * que deja, de una vez. Solo a quien ve costes (la pestaña no sale a los demás).
 *
 * «Deja» es lo que queda del precio sin IVA después del coste: 1 − el food cost del plato.
 */
export function BebidasDeLaCarta() {
  const fichas = usarLectura<MisFichas>('mis_fichas');
  const carta = usarLectura<MiCarta>('mi_carta');
  if (fichas.data === undefined || carta.data === undefined) {
    return <Cargando que="las bebidas" forma="lista-foto" lineas={5} />;
  }
  const delPlato = new Map(carta.data.platos.map((p) => [p.id, p]));
  const bebidas = fichas.data.platos.filter((p) => p.seMontaSolo === true && p.enLaCarta !== false);
  if (bebidas.length === 0 || !fichas.data.conImportes) {
    return (
      <EstadoVacio
        titulo="Nada que se monte solo"
        frase="Aquí salen lo que se vende tal cual y las bebidas de un ingrediente, con lo que cuestan y lo que dejan."
        dibujo="platos"
        sinAccionPorque="Se llena sola al vender bebidas desde el almacén."
      />
    );
  }
  return (
    <Tarjeta titulo="Bebidas y lo que se vende tal cual" cuantos={bebidas.length} pegado>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-secundario">
          <thead>
            <tr className="text-left text-etiqueta font-semibold text-texto-tenue">
              <th className="px-e4 py-e2">Bebida</th>
              <th className="px-e2 py-e2">Viene de</th>
              <th className="px-e2 py-e2 text-right">Coste</th>
              <th className="px-e2 py-e2 text-right">Precio</th>
              <th className="px-e4 py-e2 text-right">Deja</th>
            </tr>
          </thead>
          <tbody>
            {bebidas.map((b) => {
              const plato = delPlato.get(b.id);
              const coste = b.coste?.costeCentimos ?? null;
              const foodCost = b.coste?.foodCost ?? null;
              return (
                <tr key={b.id} className="border-t border-borde">
                  <td className="px-e4 py-e2">
                    <span className="flex items-center gap-e2 font-semibold">
                      {b.miniatura === null ? (
                        <span aria-hidden className="size-8 shrink-0 rounded-medio bg-fondo" />
                      ) : (
                        <img
                          src={b.miniatura}
                          alt=""
                          className="size-8 shrink-0 rounded-medio object-cover"
                        />
                      )}
                      {b.nombre}
                    </span>
                  </td>
                  <td className="px-e2 py-e2 text-texto-suave">
                    {b.vinculadoA === null ? 'Monta tus bebidas' : 'Almacén · tal cual'}
                  </td>
                  <td className="px-e2 py-e2 text-right tabular-nums">
                    {coste === null ? '—' : comoDinero(coste)}
                  </td>
                  <td className="px-e2 py-e2 text-right tabular-nums">
                    {plato?.precioCentimos === null || plato === undefined
                      ? 'Sin precio'
                      : comoDinero(plato.precioCentimos)}
                  </td>
                  <td className="px-e4 py-e2 text-right font-bold tabular-nums">
                    {foodCost === null ? '—' : comoPorcentaje(1 - foodCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
