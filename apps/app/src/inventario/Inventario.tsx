import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDeProducto } from './FichaDeProducto.tsx';
import { Hoy } from './Hoy.tsx';
import { Movimientos } from './Movimientos.tsx';
import { Productos } from './Productos.tsx';
import { Proveedores } from './Proveedores.tsx';
import type { MisProductos } from './contrato.ts';

/**
 * La app de Inventario (M6).
 *
 * «El corazón. Lo que la app sabe que hay y lo que no. **Todas las demás leen de
 *  aquí**» (Manifiesto 12).
 *
 * ── Los cuatro destinos, y por qué son estos ─────────────────────────────────
 *
 * Hasta M6½ las pestañas eran `Hoy · Productos · Pedidos · Más`, y **dos de las
 * cuatro no llevaban a ningún sitio**: «Pedidos» es M7 y enseñaba un cartel, y
 * «Más» era el cajón donde vivía Proveedores. La barra de navegación principal de
 * la app, en el aparato donde de verdad se usa Estook, con la mitad de los
 * botones vacíos.
 *
 * Ahora los cuatro contestan una pregunta y los cuatro funcionan:
 *
 * | Destino          | Su pregunta                                            |
 * | ---------------- | ------------------------------------------------------ |
 * | **Hoy**          | ¿Qué tengo que atender ahora mismo?                    |
 * | **Productos**    | ¿Qué hay en cámara, cuánto cuesta y cuánto dura?       |
 * | **Movimientos**  | ¿Qué ha entrado, qué ha salido y quién lo apuntó?      |
 * | **Compras**      | ¿A quién se lo compro y a qué precio?                  |
 *
 * Y sobreviven a M7 y M8 sin volver a inventar un «Más»: los pedidos y las
 * facturas son **vistas de Compras**, y los recuentos y las mermas serán vistas
 * de Movimientos. Un destino nuevo por módulo es lo que llena una barra de cuatro
 * posiciones en dos módulos.
 *
 * ── La ficha se abre sin salir de la lista ───────────────────────────────────
 *
 * «La ficha se abre en panel lateral derecho **sin tapar la lista**» (B5), y en
 * móvil como una hoja. Por eso el producto abierto vive aquí y no dentro de cada
 * destino: se puede abrir desde los cuatro, y se cierra volviendo al mismo sitio.
 */
export function Inventario({
  destino,
  vista,
}: {
  readonly destino: string;
  readonly vista: string;
}) {
  const { cliente } = usarSesion();
  const [productoAbierto, setProductoAbierto] = useState<string | null>(null);

  // Las categorías y los proveedores los necesitan la ficha y el alta, y salen
  // de la misma consulta que la lista para no pedirlos dos veces.
  const contexto = useQuery({
    queryKey: ['mis_productos', '', '', false],
    queryFn: async (): Promise<MisProductos> => {
      const respuesta = await cliente.consultar<MisProductos>('mis_productos', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  return (
    <>
      {destino === 'hoy' && <Hoy alAbrirProducto={setProductoAbierto} />}
      {destino === 'productos' && <Productos vista={vista} alAbrirProducto={setProductoAbierto} />}
      {destino === 'movimientos' && (
        <Movimientos vista={vista} alAbrirProducto={setProductoAbierto} />
      )}
      {destino === 'compras' && <Proveedores />}

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
