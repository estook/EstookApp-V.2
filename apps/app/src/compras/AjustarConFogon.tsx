import { useState } from 'react';
import { CREDITOS_DE_FOGON, comoSePide } from '@estook/dominio';
import { Boton } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { AvisoDelBorrador, PedirleAFogon } from '../fogon/PedirleAFogon.tsx';
import type { CambioDelPedido, FogonYYo, PedidoAjustado } from '../fogon/contrato.ts';

/**
 * «Ajustar con Fogón» (Fogón 1 · 3, decisión 0098), en un pedido en borrador.
 *
 * El pedido sugerido ya lo calcula Estook con lo que se gasta y el reparto. Lo que no
 * sabe es lo de fuera: «el sábado tenemos una boda de 60», «el puente cerramos el
 * lunes». Se le cuenta a Fogón y propone qué subir o bajar **con su cuenta en una
 * frase**; la persona lo pone en el pedido con un toque, lo mira y guarda.
 */
export function AjustarConFogon({
  pedidoId,
  lineas,
  alPoner,
}: {
  readonly pedidoId: string;
  /** Lo que hay ahora en la pantalla, aunque no esté guardado. */
  readonly lineas: readonly { readonly productoId: string; readonly cantidad: number }[];
  readonly alPoner: (cambios: readonly CambioDelPedido[]) => void;
}) {
  const { cliente } = usarSesion();
  const fogon = usarLectura<FogonYYo>('fogon_y_yo', {});
  const [propuesto, setPropuesto] = useState<PedidoAjustado | null>(null);
  const [puesto, setPuesto] = useState(false);

  if (fogon.data?.habla !== true) return null;

  if (propuesto !== null) {
    return (
      <section className="flex flex-col gap-e3 rounded-grande bg-fondo p-e4">
        <p className="text-cuerpo font-semibold">Lo que propone Fogón</p>
        {propuesto.resumen !== '' && (
          <p className="text-secundario text-texto-suave">{propuesto.resumen}</p>
        )}
        {propuesto.cambios.length === 0 ? (
          <p className="text-secundario">Con lo que le has contado, el pedido está bien así.</p>
        ) : (
          <ul className="flex flex-col gap-e2">
            {propuesto.cambios.map((c) => (
              <li key={c.productoId} className="flex flex-col">
                <span className="text-cuerpo font-medium">
                  {c.producto}:{' '}
                  {c.antes === 0 ? 'nada' : comoSePide(c.antes, c.formato, c.factor, c.unidadDeUso)}{' '}
                  →{' '}
                  {c.ahora === 0
                    ? 'quitarlo'
                    : comoSePide(c.ahora, c.formato, c.factor, c.unidadDeUso)}
                </span>
                <span className="text-secundario text-texto-suave">{c.porque}</span>
              </li>
            ))}
          </ul>
        )}
        <AvisoDelBorrador />
        <div className="flex flex-wrap gap-e2">
          {propuesto.cambios.length > 0 && !puesto && (
            <Boton
              tono="principal"
              onClick={() => {
                alPoner(propuesto.cambios);
                setPuesto(true);
              }}
            >
              Ponerlo en el pedido
            </Boton>
          )}
          <Boton
            tono="texto"
            onClick={() => {
              setPropuesto(null);
              setPuesto(false);
            }}
          >
            {puesto ? 'Hecho: revísalo y guarda' : 'Dejarlo'}
          </Boton>
        </div>
      </section>
    );
  }

  return (
    <PedirleAFogon
      titulo="Ajustar con Fogón"
      ayuda="Cuéntale lo que Estook no sabe: un evento, un puente, una semana floja. Propone qué subir o bajar."
      ejemplo="El sábado tenemos una boda de 60 personas"
      boton="Ajustar"
      gasta={CREDITOS_DE_FOGON.ajustar_pedido}
      alPedir={async (quePasa) => {
        if (quePasa.length < 3) return null;
        const respuesta = await cliente.ejecutar<PedidoAjustado>('ajustar_el_pedido_con_fogon', {
          pedido_id: pedidoId,
          que_pasa: quePasa,
          lineas: lineas.map((l) => ({ producto_id: l.productoId, cantidad: l.cantidad })),
        });
        if (!respuesta.ok) return respuesta.error;
        setPropuesto(respuesta.datos);
        return null;
      }}
    />
  );
}
