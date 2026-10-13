import { puedeVer } from '@estook/permisos';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconoDinero, IconoFlechaDerecha } from '@estook/iconos';
import { Tarjeta, EstadoVacio, clases } from '@estook/ui';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDeAlbaran } from './Albaranes.tsx';
import { Facturas, FichaDeFactura } from './Facturas.tsx';
import { FichaDePedido } from './FichaDePedido.tsx';
import { Pedidos } from './Pedidos.tsx';
import { Precios } from './Precios.tsx';
import { FichaDeProveedor, Proveedores } from './Proveedores.tsx';

/**
 * Almacén · Compras (M7).
 *
 * «¿Qué pido, qué ha llegado y a qué precio?» **Tres vistas** desde la experiencia
 * (0083), en el orden del día de un bar —se pide, llega y se paga; y a quién—:
 *
 * | Vista           | Qué contesta                                                       |
 * | --------------- | ------------------------------------------------------------------ |
 * | **Pedidos**     | ¿A quién le toca pedir hoy, qué llega y qué ha llegado ya?         |
 * | **Facturas**    | ¿Me cobran lo que ha llegado?                                      |
 * | **Proveedores** | ¿Quién me sirve, cuándo reparte, cómo se le pide y a qué precio?   |
 *
 * Eran cinco (Albaranes y Precios aparte) y Richi lo dijo claro: «demasiadas, y no
 * tiene sentido el orden». Lo que ha llegado es «Llegado» dentro de Pedidos, porque
 * ahí acaba un pedido; los precios, plegados encima de los proveedores.
 *
 * ── Las fichas se abren desde la dirección ───────────────────────────────────
 *
 * Un pedido se abre desde su lista, desde «Hoy», desde el widget del Panel y desde
 * su entrega en el Calendario. Por eso las cuatro fichas viven aquí y no dentro de
 * cada vista, y se abren con `?pedido=`, `?albaran=`, `?factura=` o
 * `?proveedor=`: da igual en qué vista se esté, y el botón de atrás las cierra.
 */
export function Compras({ vista }: { readonly vista: string }) {
  const { permisos } = usarSesion();
  const pedido = usarAbiertoEnLaDireccion('pedido');
  const albaran = usarAbiertoEnLaDireccion('albaran');
  const factura = usarAbiertoEnLaDireccion('factura');
  const proveedor = usarAbiertoEnLaDireccion('proveedor');

  const conPrecios = puedeVer(permisos, 'dato.precio_de_compra');

  return (
    <>
      {/* Lo que ha llegado (los albaranes) es «Llegado» dentro de Pedidos (0083). */}
      {vista === 'pedidos' && <Pedidos />}
      {vista === 'proveedores' && (
        <div className="flex flex-col gap-e4">
          {/* Los precios, con quien los pone (0083): eran una pestaña aparte. */}
          {conPrecios && <LosPrecios />}
          <Proveedores />
        </div>
      )}
      {vista === 'facturas' &&
        (conPrecios ? (
          <Facturas />
        ) : (
          // La factura es dinero entero. A quien no ve precios no se le enseña la
          // pantalla vacía como si no hubiera: se le dice por qué no la ve, y quién sí.
          <Tarjeta titulo="Facturas">
            <EstadoVacio
              dibujo="candado"
              titulo="Esto es cosa de quien ve los precios"
              frase="Las facturas se comparan con lo que ha llegado, euro a euro, y tu acceso no incluye los precios de compra."
              sinAccionPorque="Lo lleva quien gestiona el local o las compras."
            />
          </Tarjeta>
        ))}

      {/*
        Con `key`: al saltar de un pedido a otro —«pedirle lo que faltó» abre el
        nuevo encima del viejo— la ficha empieza de cero, sin arrastrar cambios a
        medio guardar del anterior.
      */}
      {pedido.abierto !== null && (
        <FichaDePedido key={pedido.abierto} pedidoId={pedido.abierto} alCerrar={pedido.cerrar} />
      )}
      {albaran.abierto !== null && (
        <FichaDeAlbaran
          key={albaran.abierto}
          albaranId={albaran.abierto}
          alCerrar={albaran.cerrar}
        />
      )}
      {factura.abierto !== null && conPrecios && (
        <FichaDeFactura
          key={factura.abierto}
          facturaId={factura.abierto}
          alCerrar={factura.cerrar}
        />
      )}
      {proveedor.abierto !== null && (
        <FichaDeProveedor
          key={proveedor.abierto}
          proveedorId={proveedor.abierto}
          alCerrar={proveedor.cerrar}
        />
      )}
    </>
  );
}

/**
 * Los precios, plegados encima de los proveedores (la experiencia, 0083).
 *
 * «Quién te lo deja mejor, qué ha subido y lo pactado» se mira una vez a la semana:
 * no merece una pestaña, pero sí estar a mano donde están quienes ponen los precios.
 * Se abre solo si se llega con `?ver=precios` (lo que era `/compras/precios`).
 */
function LosPrecios() {
  const [parametros] = useSearchParams();
  const [abiertos, setAbiertos] = useState(parametros.get('ver') === 'precios');
  return (
    <section className="overflow-hidden rounded-mayor border border-borde bg-superficie [background-image:var(--relleno-tarjeta)] [box-shadow:var(--sombra-tarjeta)]">
      <button
        type="button"
        aria-expanded={abiertos}
        onClick={() => {
          setAbiertos((antes) => !antes);
        }}
        className="flex w-full items-center gap-e3 px-e4 py-e3 text-left hover:bg-fondo/50"
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-grande text-white"
          style={{
            background:
              'linear-gradient(140deg, color-mix(in srgb, var(--color-app-almacen) 92%, white), color-mix(in srgb, var(--color-app-almacen) 70%, black))',
          }}
        >
          <IconoDinero size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-cuerpo font-semibold">Precios</span>
          <span className="block truncate text-secundario text-texto-suave">
            Quién te lo deja mejor, qué ha subido y lo pactado
          </span>
        </span>
        <span
          aria-hidden
          className={clases(
            'shrink-0 text-texto-tenue transition-transform duration-[--normal]',
            abiertos && 'rotate-90',
          )}
        >
          <IconoFlechaDerecha size={18} />
        </span>
      </button>
      {abiertos && (
        <div className="border-t border-borde p-e4 anima-desplegar">
          <Precios />
        </div>
      )}
    </section>
  );
}
