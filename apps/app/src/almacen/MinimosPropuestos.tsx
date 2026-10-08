import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { valeLaPenaProponer } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { Aviso, Boton, Botones, ErrorEnCristiano, Hoja } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { conUnidadDeUso, type ProductoEnLista } from './contrato.ts';
import type { MinimosPropuestos } from './contratoDelInventario.ts';

/**
 * El mínimo que propone Estook (M8 · decisión 0078, 3A).
 *
 * Lo que se gasta al día × el mayor hueco entre dos repartos del proveedor, + 20 %.
 * **Nada cambia sin que lo veas**: se propone producto a producto, con su porqué, y se
 * acepta uno a uno o todos de golpe. El que se acepta lo rehace Estook cada lunes; el
 * que no, se queda como estaba. Cambiarlo a mano en la ficha deja de rehacerlo.
 */
export function AvisoDeMinimos() {
  const { permisos } = usarSesion();
  const puede = puedeEditar(permisos, 'app.almacen');
  const lectura = usarLectura<MinimosPropuestos>('minimos_propuestos', {}, puede);
  const [abierta, setAbierta] = useState(false);
  const cuantos = lectura.data?.propuestas.length ?? 0;
  if (!puede || cuantos === 0) return null;

  return (
    <>
      <Aviso
        tono="info"
        titulo={`Estook propone el mínimo de ${cuantos === 1 ? '1 producto' : `${String(cuantos)} productos`}`}
        accion={
          <Boton
            tono="secundario"
            onClick={() => {
              setAbierta(true);
            }}
          >
            Revisar
          </Boton>
        }
      >
        Con lo que gastas y los días de reparto de cada proveedor.
      </Aviso>
      <MinimosQuePropone
        abierta={abierta}
        alCerrar={() => {
          setAbierta(false);
        }}
      />
    </>
  );
}

/**
 * En la ficha: «Estook propone 14,4 kg · Usar», si se separa más de un 10 % del que
 * hay y nadie se lo ha dejado ya a Estook. Con su porqué plegado.
 */
export function PropuestaDeMinimo({ producto }: { readonly producto: ProductoEnLista }) {
  const { cliente, permisos } = usarSesion();
  const cache = useQueryClient();
  const [poniendo, setPoniendo] = useState(false);
  const calculado = producto.minimoQueCalcula ?? null;
  if (
    calculado === null ||
    producto.minimoCalculado === true ||
    !valeLaPenaProponer(producto.minimo, calculado.minimo)
  ) {
    return null;
  }
  const puede = puedeEditar(permisos, 'app.almacen');

  return (
    <>
      <dt className="text-texto-suave">Estook propone</dt>
      <dd className="flex flex-wrap items-center gap-e2 font-medium">
        {conUnidadDeUso(calculado.minimo, producto.unidadDeUso)}
        {puede && (
          <Boton
            tono="texto"
            cargando={poniendo}
            textoCargando="Poniendo"
            onClick={() => {
              setPoniendo(true);
              void cliente
                .ejecutar('usar_el_minimo_calculado', { producto_ids: [producto.id] })
                .then(async () => {
                  setPoniendo(false);
                  await cache.invalidateQueries({ queryKey: ['un_producto'] });
                  await cache.invalidateQueries({ queryKey: ['mis_productos'] });
                  await cache.invalidateQueries({ queryKey: ['minimos_propuestos'] });
                });
            }}
          >
            Usar
          </Boton>
        )}
        <details className="w-full font-normal text-texto-suave">
          <summary className="cursor-pointer">Por qué</summary>
          {calculado.porque}
        </details>
      </dd>
    </>
  );
}

export function MinimosQuePropone({
  abierta,
  alCerrar,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const lectura = usarLectura<MinimosPropuestos>('minimos_propuestos', {}, abierta);
  const [poniendo, setPoniendo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function usar(ids: readonly string[], cual: string) {
    setPoniendo(cual);
    setError(null);
    const respuesta = await cliente.ejecutar('usar_el_minimo_calculado', { producto_ids: ids });
    setPoniendo(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['minimos_propuestos'] });
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
    await cache.invalidateQueries({ queryKey: ['almacen_hoy'] });
    await cache.invalidateQueries({ queryKey: ['un_producto'] });
  }

  const propuestas = lectura.data?.propuestas ?? [];

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Mínimos que propone Estook"
      {...(propuestas.length > 1
        ? {
            pie: (
              <Botones>
                <Boton
                  tono="principal"
                  cargando={poniendo === 'todos'}
                  textoCargando="Poniendo"
                  disabled={poniendo !== null}
                  onClick={() => {
                    void usar(
                      propuestas.map((p) => p.id),
                      'todos',
                    );
                  }}
                >
                  Usar los {propuestas.length}
                </Boton>
              </Botones>
            ),
          }
        : {})}
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {lectura.isPending ? (
          <p className="text-secundario text-texto-suave">Calculando…</p>
        ) : propuestas.length === 0 ? (
          <Aviso tono="bien" titulo="Nada que proponer">
            Los mínimos están al día
            {lectura.data !== undefined && lectura.data.automaticos > 0
              ? `, y ${String(lectura.data.automaticos)} los rehace Estook cada lunes`
              : ''}
            .
          </Aviso>
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {propuestas.map((p) => (
              <li key={p.id} className="flex flex-col gap-e2 py-e3">
                <div className="flex flex-wrap items-baseline justify-between gap-e2">
                  <span className="font-medium">{p.nombre}</span>
                  <span className="tabular-nums">
                    <span className="text-texto-suave">
                      {p.minimo === null ? 'sin mínimo' : conUnidadDeUso(p.minimo, p.unidadDeUso)}{' '}
                      →{' '}
                    </span>
                    <strong>{conUnidadDeUso(p.propuesto.minimo, p.unidadDeUso)}</strong>
                  </span>
                </div>
                <details className="text-secundario text-texto-suave">
                  <summary className="cursor-pointer">Por qué</summary>
                  {p.propuesto.porque}
                </details>
                <div>
                  <Boton
                    tono="secundario"
                    cargando={poniendo === p.id}
                    textoCargando="Poniendo"
                    disabled={poniendo !== null}
                    onClick={() => {
                      void usar([p.id], p.id);
                    }}
                  >
                    Usar {conUnidadDeUso(p.propuesto.minimo, p.unidadDeUso)}
                  </Boton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Hoja>
  );
}
