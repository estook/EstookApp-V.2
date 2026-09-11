import { Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cargando } from '@estook/ui';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { Hoy } from './Hoy.tsx';
import { Productos } from './Productos.tsx';
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
 * | Destino         | Su pregunta                                       |
 * | --------------- | ------------------------------------------------- |
 * | **Hoy**         | ¿Qué tengo que atender ahora mismo?               |
 * | **Productos**   | ¿Qué hay en cámara, cuánto cuesta y cuánto dura?  |
 * | **Movimientos** | ¿Qué ha entrado, qué ha salido y quién lo apuntó? |
 * | **Mermas**      | ¿Cuánto se me va sin venderse, y en qué?          |
 * | **Compras**     | ¿A quién se lo compro y a qué precio?             |
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
 *
 * Y desde M7 vive **en la dirección**, `?producto=…`, no en un estado: la
 * caducidad de un lote en el Calendario lleva a su producto, la ficha de un
 * proveedor abre lo que te sirve, y la comparativa de precios abre el aceite.
 * Cuatro sitios que no están unos dentro de otros; con la dirección, ninguno
 * tiene que saber de los demás, y el botón de atrás del móvil cierra la ficha.
 *
 * ── Y dos cosas se cargan aparte ─────────────────────────────────────────────
 *
 * `FichaDeProducto` son **1.300 líneas** con sus tres hojas —apuntar entrada,
 * apuntar salida, ajustar la cámara—, y no hace falta hasta que alguien abre un
 * producto. `Movimientos` es un destino de cuatro, así que tres de cada cuatro
 * veces no se pinta. Las dos van detrás de un `lazy`, igual que la gráfica desde
 * M3 y por la misma razón: lo que el usuario nota es el tiempo, y bajar código que
 * no se va a pintar es tiempo.
 *
 * No es un apaño para cuadrar el presupuesto de tamaño —que «se mide y se
 * informa», no bloquea— sino lo que dice B7: **un módulo que no cumple su
 * presupuesto de velocidad no está terminado**, y abrir una app tiene 200 ms.
 */
const FichaDeProducto = lazy(async () => {
  const modulo = await import('./FichaDeProducto.tsx');
  return { default: modulo.FichaDeProducto };
});

const Movimientos = lazy(async () => {
  const modulo = await import('./Movimientos.tsx');
  return { default: modulo.Movimientos };
});

/**
 * Las mermas, aparte del resto de Movimientos.
 *
 * Es una **vista** de Movimientos —la merma es una salida de género con motivo, no
 * otra app— pero la pantalla no se parece: lleva sus totales por partida, sus
 * filtros y su exportación. Cargarla con el libro sería bajar todo eso para
 * quien solo quiere ver lo que entró ayer.
 */
const Mermas = lazy(async () => {
  const modulo = await import('./Mermas.tsx');
  return { default: modulo.Mermas };
});

/**
 * Compras (M7), aparte de todo lo demás.
 *
 * Son cinco vistas con sus fichas —pedidos, recibir, albaranes, facturas,
 * proveedores y precios— y quien abre Inventario para ver lo que hay no tiene por
 * qué bajarse la conciliación de facturas. Se carga al entrar en Compras.
 */
const Compras = lazy(async () => {
  const modulo = await import('../compras/Compras.tsx');
  return { default: modulo.Compras };
});

export function Inventario({
  destino,
  vista,
}: {
  readonly destino: string;
  readonly vista: string;
}) {
  const { cliente } = usarSesion();
  const producto = usarAbiertoEnLaDireccion('producto');
  const productoAbierto = producto.abierto;
  const setProductoAbierto = producto.abrir;

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
      {destino === 'movimientos' && vista !== 'mermas' && (
        <Suspense fallback={<Cargando que="el libro de movimientos" />}>
          <Movimientos vista={vista} alAbrirProducto={setProductoAbierto} />
        </Suspense>
      )}
      {destino === 'movimientos' && vista === 'mermas' && (
        <Suspense fallback={<Cargando que="las mermas" />}>
          <Mermas alAbrirProducto={setProductoAbierto} />
        </Suspense>
      )}
      {destino === 'compras' && (
        <Suspense fallback={<Cargando que="las compras" />}>
          <Compras vista={vista} />
        </Suspense>
      )}

      {/*
        La ficha solo se monta cuando hay un producto abierto: asi el `lazy` no se
        descarga al entrar en Inventario, sino al abrir el primero. Y no se pierde
        nada por esperar, porque abrir una ficha ya trae su propia consulta.
      */}
      {productoAbierto !== null && (
        <Suspense fallback={<Cargando que="la ficha" />}>
          <FichaDeProducto
            key={productoAbierto}
            productoId={productoAbierto}
            alCerrar={producto.cerrar}
            categorias={contexto.data?.categorias ?? []}
            proveedores={contexto.data?.proveedores ?? []}
          />
        </Suspense>
      )}
    </>
  );
}
