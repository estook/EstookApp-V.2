import { puedeVer } from '@estook/permisos';
import { Tarjeta, EstadoVacio } from '@estook/ui';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { Albaranes, FichaDeAlbaran } from './Albaranes.tsx';
import { Facturas, FichaDeFactura } from './Facturas.tsx';
import { FichaDePedido } from './FichaDePedido.tsx';
import { Pedidos } from './Pedidos.tsx';
import { Precios } from './Precios.tsx';
import { FichaDeProveedor, Proveedores } from './Proveedores.tsx';

/**
 * Inventario · Compras (M7).
 *
 * «¿Qué pido, qué ha llegado y a qué precio?» Cinco vistas de un mismo sitio, en
 * el orden en que se usan en un bar:
 *
 * | Vista           | Qué contesta                                           |
 * | --------------- | ------------------------------------------------------ |
 * | **Pedidos**     | ¿A quién le toca pedir hoy, y qué llega?               |
 * | **Albaranes**   | ¿Qué ha llegado, y qué no ha cuadrado?                 |
 * | **Facturas**    | ¿Me cobran lo que ha llegado?                          |
 * | **Proveedores** | ¿Quién me sirve, cuándo reparte y cómo se le pide?     |
 * | **Precios**     | ¿Quién me lo deja mejor, y qué me ha subido?           |
 *
 * Pedidos va primero porque es lo que se hace **cada día**; Proveedores, que en M6
 * era todo lo que había aquí, se toca una vez al darlos de alta.
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
      {vista === 'pedidos' && <Pedidos />}
      {vista === 'albaranes' && <Albaranes />}
      {vista === 'proveedores' && <Proveedores />}
      {(vista === 'facturas' || vista === 'precios') &&
        (conPrecios ? (
          vista === 'facturas' ? (
            <Facturas />
          ) : (
            <Precios />
          )
        ) : (
          // La factura y la comparativa son dinero entero. A quien no ve precios
          // no se le enseña la pantalla vacía como si no hubiera: se le dice por
          // qué no la ve, y quién sí.
          <Tarjeta titulo={vista === 'facturas' ? 'Facturas' : 'Precios'}>
            <EstadoVacio
              titulo="Esto es cosa de quien ve los precios"
              frase={
                vista === 'facturas'
                  ? 'Las facturas se comparan con lo que ha llegado, euro a euro, y tu acceso no incluye los precios de compra.'
                  : 'Quién te lo deja mejor y qué ha subido son precios de compra, y tu acceso no los incluye.'
              }
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
