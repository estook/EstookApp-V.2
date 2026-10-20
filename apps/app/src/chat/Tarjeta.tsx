import { useNavigate } from 'react-router-dom';
import { fechaCorta, fechaOperativa } from '@estook/dominio';
import { Etiqueta } from '@estook/ui';
import { IconoAlmacen, IconoCalendario, IconoCarta, IconoNoVer } from '@estook/iconos';
import {
  NOMBRE_DEL_ESTADO_DEL_PEDIDO,
  TONO_DEL_ESTADO_DEL_PEDIDO,
  type EstadoDePedido,
} from '../compras/contrato.ts';
import type { TarjetaDelMensaje } from './contrato.ts';

/**
 * Una tarjeta en la conversación (C2 · 0075): un pedido, un producto, el aviso del
 * horario o un plato agotado (0102). **Se abre en su sitio**, con los permisos de quien la mira: lo que no puede
 * ver, el servidor no lo manda, y aquí solo se dice eso, sin el nombre del proveedor ni
 * el precio.
 */

function esEstado(estado: string): estado is EstadoDePedido {
  return estado in NOMBRE_DEL_ESTADO_DEL_PEDIDO;
}

export function TarjetaDelChat({ tarjeta }: { readonly tarjeta: TarjetaDelMensaje }) {
  const navegar = useNavigate();
  const caja =
    'flex w-64 max-w-full items-center gap-e3 rounded-medio border border-borde bg-superficie px-e3 py-e2 text-left';

  if (tarjeta.tipo === 'horario') {
    return (
      <button
        type="button"
        onClick={() => {
          navegar(`/horario?semana=${tarjeta.lunes}`);
        }}
        className={`${caja} min-h-toque hover:bg-fondo`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-medio bg-naranja-suave text-naranja">
          <IconoCalendario size={20} />
        </span>
        <span className="min-w-0">
          <span className="block text-secundario font-semibold">Horario publicado</span>
          <span className="block text-etiqueta text-texto-suave">
            Semana del {fechaCorta(fechaOperativa(tarjeta.lunes))} · Ver el horario
          </span>
        </span>
      </button>
    );
  }

  // Un agotado (M10 · 1, 0102): dice si sigue agotado, sin llevar a ningún sitio (la
  // cocina no tiene la app Carta). Se quita en Agotados o en la ficha del plato.
  if (tarjeta.tipo === 'plato') {
    if (tarjeta.plato === null) return null;
    const { nombre, agotado } = tarjeta.plato;
    return (
      <span className={caja}>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-medio ${agotado ? 'bg-mal-suave text-mal' : 'bg-bien-suave text-bien'}`}
        >
          <IconoCarta size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-secundario font-semibold">{nombre}</span>
          <Etiqueta tono={agotado ? 'mal' : 'bien'}>{agotado ? 'Agotado' : 'Ya hay'}</Etiqueta>
        </span>
      </span>
    );
  }

  const nadaQueVer =
    (tarjeta.tipo === 'pedido' && tarjeta.pedido === null) ||
    (tarjeta.tipo === 'producto' && tarjeta.producto === null);
  if (nadaQueVer) {
    return (
      <span className={caja}>
        <span className="text-texto-tenue">
          <IconoNoVer size={20} />
        </span>
        <span className="text-secundario text-texto-suave">Esto no es de lo que puedes ver.</span>
      </span>
    );
  }

  if (tarjeta.tipo === 'pedido' && tarjeta.pedido !== null) {
    const { numero, proveedor, estado, llegaEl } = tarjeta.pedido;
    return (
      <button
        type="button"
        onClick={() => {
          navegar(`/almacen/compras/pedidos?pedido=${tarjeta.id}`);
        }}
        className={`${caja} min-h-toque hover:bg-fondo`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-medio bg-fondo text-texto-suave">
          <IconoAlmacen size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-secundario font-semibold">
            Pedido {numero} · {proveedor}
          </span>
          <span className="flex flex-wrap items-center gap-e1 text-etiqueta text-texto-suave">
            {esEstado(estado) && (
              <Etiqueta tono={TONO_DEL_ESTADO_DEL_PEDIDO[estado]}>
                {NOMBRE_DEL_ESTADO_DEL_PEDIDO[estado]}
              </Etiqueta>
            )}
            {llegaEl !== null && <span>Llega el {fechaCorta(fechaOperativa(llegaEl))}</span>}
          </span>
        </span>
      </button>
    );
  }

  if (tarjeta.tipo === 'producto' && tarjeta.producto !== null) {
    const { nombre, formato } = tarjeta.producto;
    return (
      <button
        type="button"
        onClick={() => {
          navegar(`/almacen/productos/todo?producto=${tarjeta.id}`);
        }}
        className={`${caja} min-h-toque hover:bg-fondo`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-medio bg-fondo text-texto-suave">
          <IconoCarta size={20} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-secundario font-semibold">{nombre}</span>
          <span className="block text-etiqueta text-texto-suave">
            {formato ?? 'Producto'} · Ver la ficha
          </span>
        </span>
      </button>
    );
  }
  return null;
}
