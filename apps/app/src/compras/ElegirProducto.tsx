import { useState } from 'react';
import { Campo, Cargando } from '@estook/ui';
import { IconoAnadir, IconoBuscar } from '@estook/iconos';
import type { MisProductos, ProductoEnLista } from '../inventario/contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';

/**
 * Buscar un producto para añadirlo a un pedido o a lo que ha llegado (M7).
 *
 * Es el mismo `mis_productos` que la lista de Inventario, con el texto que se
 * escribe: sin acentos y con erratas, como el buscador de siempre. Se pide a
 * partir de dos letras, que es cuando la lista deja de ser «todo».
 *
 * Los que ya están en la lista se ofrecen igual, apagados y diciendo que ya
 * están: si alguien busca «tomate» y no le sale, piensa que no existe.
 *
 * Y **los de ese proveedor, primero**: «productos del proveedor elegido, luego el
 * resto» (Auditoría, parte 3). En un pedido a Makro, el tomate de Makro va
 * delante del de la frutería, y los demás siguen ahí por si se le pide otra cosa.
 */
export function ElegirProducto({
  etiqueta = 'Añadir un producto',
  yaEstan,
  primeroDe,
  alElegir,
}: {
  readonly etiqueta?: string;
  readonly yaEstan: ReadonlySet<string>;
  /** El proveedor cuyos productos van delante. */
  readonly primeroDe?: string;
  readonly alElegir: (producto: ProductoEnLista) => void;
}) {
  const [texto, setTexto] = useState('');
  const buscando = texto.trim().length >= 2;

  const consulta = usarLectura<MisProductos>(
    'mis_productos',
    { texto: texto.trim(), limite: '12' },
    buscando,
  );

  // `sort` es estable: dentro de cada grupo se queda el orden de parecido que
  // trae el buscador.
  const esSuyo = (producto: ProductoEnLista) =>
    primeroDe !== undefined && producto.proveedorId === primeroDe ? 1 : 0;
  const encontrados = [...(consulta.data?.productos ?? [])].sort((a, b) => esSuyo(b) - esSuyo(a));

  return (
    <div className="flex flex-col gap-e2">
      <Campo
        etiqueta={etiqueta}
        ayuda="Escribe dos letras: «tom», «acei»…"
        delante={<IconoBuscar size={16} />}
        value={texto}
        onChange={(e) => {
          setTexto(e.currentTarget.value);
        }}
      />

      {buscando && consulta.isPending && <Cargando que="los productos" lineas={2} />}

      {buscando && !consulta.isPending && encontrados.length === 0 && (
        <p className="text-secundario text-texto-suave">
          No hay ningún producto que se parezca a «{texto.trim()}». Se da de alta en Productos.
        </p>
      )}

      {encontrados.length > 0 && buscando && (
        <ul
          aria-label="Productos encontrados"
          className="flex flex-col rounded-medio border border-borde"
        >
          {encontrados.map((producto) => {
            const esta = yaEstan.has(producto.id);
            return (
              <li key={producto.id} className="border-b border-borde last:border-0">
                <button
                  type="button"
                  disabled={esta}
                  onClick={() => {
                    alElegir(producto);
                    setTexto('');
                  }}
                  className="flex w-full min-h-toque items-center gap-e3 px-e3 text-left hover:bg-fondo disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-cuerpo">{producto.nombre}</span>
                    <span className="block truncate text-secundario text-texto-suave">
                      {esta
                        ? 'Ya está en la lista'
                        : [producto.formato, producto.proveedor].filter(Boolean).join(' · ') ||
                          'Sin formato ni proveedor'}
                    </span>
                  </span>
                  {!esta && (
                    <span className="shrink-0 text-texto-suave" aria-hidden>
                      <IconoAnadir size={18} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
