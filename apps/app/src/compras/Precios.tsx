import { useState } from 'react';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Tarjeta,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoDinero, comoSeLeeLaFecha } from '../inventario/contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';
import type { CompararPrecios } from './contrato.ts';

/**
 * Compras · Precios (M7).
 *
 * «La comparación entre proveedores para lo mismo, **que es donde aparece el
 *  dinero fácil**» (Manifiesto 12). Tres listas cortas que se miran una vez a la
 * semana:
 *
 *   · **Quién te lo deja mejor**, comparado por unidad de uso —nunca por caja— y
 *     con el ahorro dicho en euros al mes, al ritmo al que lo gastas.
 *   · **Lo que ha subido** en los dos últimos meses, proveedor por proveedor.
 *   · **Lo pactado**, y si te lo están cobrando.
 */
export function Precios() {
  const { cliente, permisos } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const producto = usarAbiertoEnLaDireccion('producto');
  const proveedor = usarAbiertoEnLaDireccion('proveedor');
  const consulta = usarLectura<CompararPrecios>('comparar_precios');
  const editaPrecios = puedeEditar(permisos, 'dato.precio_de_compra');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="los precios" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido comparar los precios">
        Vuelve a intentarlo dentro de un momento. Si sigue igual, avísanos.
      </Aviso>
    );
  }

  const datos = consulta.data;

  async function dejarDePactar(pactadoId: string) {
    setError(null);
    const respuesta = await cliente.ejecutar('dejar_de_pactar', { pactado_id: pactadoId });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
  }

  const botonDeProducto = (id: string, nombre: string) => (
    <button
      type="button"
      className="text-left text-cuerpo font-medium underline decoration-borde-fuerte underline-offset-2 hover:decoration-texto"
      onClick={() => {
        producto.abrir(id);
      }}
    >
      {nombre}
    </button>
  );

  return (
    <div className="grid gap-e4 xl:grid-cols-2">
      {error !== null && (
        <div className="xl:col-span-2">
          <ErrorEnCristiano error={error} />
        </div>
      )}

      <div className="xl:col-span-2">
        <Tarjeta
          titulo="Quién te lo deja mejor"
          origen="Por unidad de uso, con lo último que te cobró cada uno"
        >
          {datos.comparaciones.length === 0 ? (
            <EstadoVacio
              compacto
              titulo="Todavía no hay nada que comparar"
              frase="Para comparar hace falta que dos proveedores te hayan puesto precio al mismo producto. Pon el de otro proveedor en la ficha del producto, en «Cambiar el precio»."
              sinAccionPorque="Se compara solo en cuanto hay dos precios del mismo producto."
            />
          ) : (
            <ul className="flex flex-col gap-e3">
              {datos.comparaciones.map((c) => (
                <li
                  key={c.productoId}
                  className="flex flex-col gap-e2 rounded-medio border border-borde p-e3"
                >
                  <span className="flex flex-wrap items-center gap-e2">
                    {botonDeProducto(c.productoId, c.producto)}
                    {c.comparacion.ahorroAlMesCentimos !== null &&
                      c.comparacion.ahorroAlMesCentimos > 0 && (
                        <Etiqueta tono="bien">
                          unos {comoDinero(c.comparacion.ahorroAlMesCentimos)} al mes
                        </Etiqueta>
                      )}
                  </span>
                  <p className="text-secundario">{c.comparacion.frase}</p>
                  <ul className="flex flex-col">
                    {c.precios.map((p, i) => (
                      <li
                        key={p.proveedorId}
                        className="flex items-baseline justify-between gap-e3 py-e1"
                      >
                        <button
                          type="button"
                          className="text-left text-secundario hover:underline"
                          onClick={() => {
                            proveedor.abrir(p.proveedorId);
                          }}
                        >
                          {p.proveedor}
                          {c.comparacion.actual?.proveedorId === p.proveedorId && (
                            <span className="text-texto-suave"> · a quien se lo compras</span>
                          )}
                        </button>
                        <span
                          className={
                            i === 0 ? 'text-secundario font-semibold text-bien' : 'text-secundario'
                          }
                        >
                          {p.costePorUnidad}
                          <span className="font-normal text-texto-suave">
                            {' '}
                            · {comoDinero(p.precioCentimos)}
                            {p.formato === null ? '' : ` la ${p.formato.toLowerCase()}`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Lo que ha subido" origen="Los dos últimos meses, por unidad de uso">
        {datos.subidas.length === 0 ? (
          <p className="text-secundario text-texto-suave">
            Nada ha subido en los dos últimos meses.
          </p>
        ) : (
          <ul className="flex flex-col gap-e2">
            {datos.subidas.map((s) => (
              <li key={`${s.productoId}-${s.proveedor}-${s.desde}`} className="flex flex-col">
                <span className="flex flex-wrap items-baseline gap-e2">
                  {botonDeProducto(s.productoId, s.producto)}
                  <span className="text-secundario text-texto-suave">
                    · {s.proveedor} · desde el {comoSeLeeLaFecha(s.desde)}
                  </span>
                </span>
                <span className="text-secundario text-atencion">{s.frase}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Lo pactado" origen="Lo que te prometieron, contra lo último que te cobraron">
        {datos.pactados.length === 0 ? (
          <p className="text-secundario text-texto-suave">
            No hay nada pactado. Se pacta desde la ficha de cada proveedor, en «Lo que te sirve».
          </p>
        ) : (
          <ul className="flex flex-col gap-e3">
            {datos.pactados.map((p) => (
              <li key={p.id} className="flex flex-col gap-e1">
                <span className="flex flex-wrap items-center gap-e2">
                  {botonDeProducto(p.productoId, p.producto)}
                  {p.porEncima && <Etiqueta tono="mal">te lo cobran más caro</Etiqueta>}
                </span>
                <span className="text-secundario text-texto-suave">
                  {p.proveedor} · pactado a {comoDinero(p.precioCentimos)}
                  {p.hasta === null ? '' : ` hasta el ${comoSeLeeLaFecha(p.hasta)}`}
                  {p.cobradoCentimos === null
                    ? ''
                    : ` · lo último, ${comoDinero(p.cobradoCentimos)}`}
                </span>
                {editaPrecios && (
                  <div>
                    <Boton
                      tono="texto"
                      onClick={() => {
                        void dejarDePactar(p.id);
                      }}
                    >
                      Quitar lo pactado
                    </Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
