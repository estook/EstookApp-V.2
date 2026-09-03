import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tarjeta, TodaviaNo } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDeProducto } from './FichaDeProducto.tsx';
import { Hoy } from './Hoy.tsx';
import { Productos } from './Productos.tsx';
import { Proveedores } from './Proveedores.tsx';
import type { MisProductos } from './contrato.ts';

/**
 * La app de Inventario (M6).
 *
 * «El corazón. Lo que la app sabe que hay y lo que no. **Todas las demás leen de
 *  aquí**» (Manifiesto 12).
 *
 * ── Las cuatro pestañas, y por qué son estas ─────────────────────────────────
 *
 * La tabla de B5 le da a Inventario `Hoy · Productos · Pedidos · Más`, con un
 * máximo de cuatro posiciones. M6 llena las dos primeras enteras; **Pedidos es
 * M7** y lo dice, en vez de dejar una pestaña que no hace nada.
 *
 * Y «Más» no es un cajón de sastre: es donde viven Proveedores, que M6 sí trae,
 * y donde entrarán Inventario y Mermas con M8. Que la ficha corta de proveedor
 * nazca aquí y no en Ajustes es a propósito: cuando M7 la complete, nadie tendrá
 * que aprenderse un sitio nuevo.
 *
 * ── La ficha se abre sin salir de la lista ───────────────────────────────────
 *
 * «La ficha se abre en panel lateral derecho **sin tapar la lista**» (B5), y en
 * móvil como una hoja. Por eso el producto abierto vive aquí y no dentro de cada
 * pestaña: se puede abrir desde «Hoy» y desde «Productos», y se cierra volviendo
 * al mismo sitio.
 */
export function Inventario({ pestana }: { readonly pestana: string }) {
  const { cliente } = usarSesion();
  const [productoAbierto, setProductoAbierto] = useState<string | null>(null);

  // Las categorías y los proveedores los necesitan la ficha y el alta, y salen
  // de la misma consulta que la lista para no pedirlos dos veces.
  const contexto = useQuery({
    queryKey: ['mis_productos', '', ''],
    queryFn: async (): Promise<MisProductos> => {
      const respuesta = await cliente.consultar<MisProductos>('mis_productos', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  return (
    <>
      {pestana === 'hoy' && <Hoy alAbrirProducto={setProductoAbierto} />}
      {pestana === 'productos' && <Productos alAbrirProducto={setProductoAbierto} />}
      {pestana === 'pedidos' && <Pedidos />}
      {pestana === 'mas' && <Proveedores />}

      <FichaDeProducto
        productoId={productoAbierto}
        alCerrar={() => {
          setProductoAbierto(null);
        }}
        categorias={contexto.data?.categorias ?? []}
        proveedores={contexto.data?.proveedores ?? []}
      />
    </>
  );
}

/**
 * Pedidos, que es M7.
 *
 * Se dice con su nombre y con lo que hará, en vez de dejar la pestaña muda.
 * «Todo estado vacío tiene una frase y un botón» (Auditoría, parte 3); aquí no
 * hay botón porque no hay nada que pulsar todavía, y eso también se dice.
 */
function Pedidos() {
  return (
    <Tarjeta titulo="Pedidos">
      <TodaviaNo
        que="Inventario · Pedidos"
        queHabra="El ciclo de un pedido: borrador, enviado y recibido, con la sugerencia de qué pedir según lo que se está gastando, los días de reparto de cada proveedor y su pedido mínimo"
        modulo="M7 · Proveedores y compras"
      />
    </Tarjeta>
  );
}
