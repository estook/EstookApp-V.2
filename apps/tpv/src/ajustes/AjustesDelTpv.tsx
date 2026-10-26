import { puedeEditar } from '@estook/permisos';
import { EstadoVacio } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { irA } from '../navegar.ts';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { LosAparatos } from './LosAparatos.tsx';
import { PinYBloqueo } from './PinYBloqueo.tsx';
import { CocinaYBarra } from './CocinaYBarra.tsx';
import { Productos } from '../productos/Productos.tsx';

/**
 * **Ajustes del TPV** (maquetas 11, 16 y 17; Anexo 11.13): solo lo de vender. La carta,
 * los precios y el equipo se cambian en Estook. **Solo en la caja** (0115), con el PIN de
 * quien puede: un comandero solo pide y cobra.
 *
 * **La sala** (T2) abre el editor del plano; **Productos** (T3), la botonera; **Aparatos** y
 * **PIN y bloqueo** (T1). Las impresoras, la caja, las formas de pago, los tickets y la
 * cocina llegan con su entrega: no se enseñan apagados.
 */
export function AjustesDelTpv({ direccion }: { readonly direccion: string }) {
  const { yo, aparato } = usarSesion();
  const vincula = puedeEditar(yo.permisos, 'accion.vincular_aparatos');
  const ajusta = puedeEditar(yo.permisos, 'accion.ajustes_del_tpv');
  const apartados = [
    ...(ajusta ? [{ id: 'sala', nombre: 'La sala' }] : []),
    ...(ajusta ? [{ id: 'productos', nombre: 'Productos' }] : []),
    ...(vincula ? [{ id: 'aparatos', nombre: 'Aparatos' }] : []),
    ...(ajusta ? [{ id: 'pin', nombre: 'PIN y bloqueo' }] : []),
    ...(ajusta ? [{ id: 'cocina', nombre: 'Cocina y barra' }] : []),
  ];
  // La sala es una pantalla entera, el editor: el apartado lleva allí.
  const sinLaSala = apartados.filter((a) => a.id !== 'sala');
  const elegido = direccion.split('/')[1] ?? sinLaSala[0]?.id ?? '';
  const resto = direccion.split('/').slice(2).join('/');

  return (
    <div className="flex min-h-dvh flex-col bg-fondo text-texto">
      <LaBarraDeArriba titulo="Ajustes del TPV" />
      {aparato.funcion !== 'caja' || apartados.length === 0 ? (
        <main className="p-e5">
          <EstadoVacio
            titulo="Aquí no se tocan los ajustes"
            frase={
              aparato.funcion !== 'caja'
                ? 'Los ajustes del TPV se tocan en la caja.'
                : 'Los ajustes del TPV los toca quien lleva el local.'
            }
            dibujo="candado"
            sinAccionPorque="No hay nada que hacer aquí."
          />
        </main>
      ) : (
        <div className="flex flex-1 flex-col md:flex-row">
          <nav
            aria-label="Ajustes del TPV"
            className="flex gap-e2 overflow-x-auto border-b border-borde bg-superficie p-e3 md:w-[15rem] md:flex-col md:border-b-0 md:border-r"
          >
            {apartados.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-current={elegido === a.id ? 'page' : undefined}
                onClick={() => {
                  irA(a.id === 'sala' ? 'sala/editar' : `ajustes/${a.id}`);
                }}
                className={[
                  'min-h-toque shrink-0 rounded-grande px-e4 text-left font-semibold',
                  elegido === a.id ? 'bg-charcoal font-bold' : '',
                ].join(' ')}
              >
                {a.nombre}
              </button>
            ))}
            <p className="hidden px-e4 pt-e4 text-secundario text-texto-tenue md:block">
              Lo de vender. La carta y el equipo, en Estook.
            </p>
          </nav>
          <main className="flex-1 p-e4 md:p-e6">
            {elegido === 'productos' && ajusta ? (
              <Productos resto={resto} />
            ) : elegido === 'pin' && ajusta ? (
              <PinYBloqueo />
            ) : elegido === 'cocina' && ajusta ? (
              <CocinaYBarra />
            ) : vincula ? (
              <LosAparatos resto={resto} />
            ) : (
              <PinYBloqueo />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
