import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  IconoAtencion,
  IconoAvisos,
  IconoBien,
  IconoCaja,
  IconoCalendario,
  IconoCerrar,
  IconoDinero,
  IconoImprimir,
  IconoOlla,
  type Icono,
} from '@estook/iconos';
import { Hoja } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import {
  cerrarLaCampana,
  abrirLaCampana,
  quitarDeLaVista,
  usarLaCampana,
  usarLosAvisos,
} from '../ganchos/usarLosAvisos.ts';
import { tocar } from '../cocina/sonidos.ts';
import { escucharLaDireccion, irA, laDireccion } from '../navegar.ts';
import { losQueSalen, type AvisoDelTpv, type ClaseDeAviso } from './losAvisos.ts';

/**
 * **Los avisos, arriba a la derecha y en la campana** (el rediseño, entrega 2 · 2, 0148). Una sola
 * pieza para todo el TPV: salen los que hay, **como mucho tres**, sin tapar el plano; la «×» los
 * quita de la vista y **se quedan en la campana** hasta que alguien los atiende. La cocina que llama
 * a una mesa tuya **vibra**; la impresora, en la caja, **suena** una vez por aviso nuevo.
 */

const COMO_SE_VE: Readonly<
  Record<ClaseDeAviso, { readonly icono: Icono; readonly color: string }>
> = {
  cocina: { icono: IconoOlla, color: 'bg-mesa-esperando text-sobre-mesa-esperando' },
  efectivo: { icono: IconoDinero, color: 'bg-mesa-te-toca text-sobre-mesa-te-toca' },
  impresora: { icono: IconoImprimir, color: 'bg-mal-suave text-mal' },
  seis_horas: { icono: IconoAtencion, color: 'bg-mal-suave text-mal' },
  retirar: { icono: IconoCaja, color: 'bg-mesa-te-toca text-sobre-mesa-te-toca' },
  reserva: { icono: IconoCalendario, color: 'bg-[var(--base-fechas)] text-white' },
};

/** Los avisos apilados y la hoja de la campana. Va una vez, para todo lo de la sala. */
export function LosAvisos() {
  const { aparato } = usarSesion();
  const avisos = usarLosAvisos();
  const { abierta, quitados: fuera } = usarLaCampana();
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  const vistos = useRef<Set<string> | null>(null);

  // Vibra con la cocina que llama a una mesa mía; suena con la impresora, en la caja. Una vez por
  // aviso nuevo, y no con los que ya había al entrar.
  useEffect(() => {
    const antes = vistos.current;
    vistos.current = new Set(avisos.map((a) => a.id));
    if (antes === null) return;
    const nuevos = avisos.filter((a) => !antes.has(a.id));
    if (nuevos.some((a) => a.clase === 'cocina' && a.mio) && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    if (nuevos.some((a) => a.clase === 'impresora') && aparato.funcion === 'caja') tocar('aviso');
  }, [avisos, aparato.funcion]);

  const salen = losQueSalen(avisos, fuera);
  // En el PC, la sala lleva a la derecha la columna «Ahora»: los avisos, a su izquierda.
  const enLaSala = direccion === '' || direccion === 'llevar' || direccion === 'inicio';

  return (
    <>
      {salen.length > 0 && !abierta && (
        <section
          aria-label="Avisos"
          className={[
            'pointer-events-none fixed inset-x-e3 top-[calc(env(safe-area-inset-top)+4.75rem)] z-20 flex flex-col gap-e2 md:inset-x-auto md:right-e4 md:w-[24rem]',
            // **Debajo de las pantallas enteras** (cobrar, abrir la caja: `z-30`): el aviso del
            // efectivo tapaba en un iPhone pequeño el «Cobrar» de ese mismo efectivo (la #194).
            // En el móvil de la sala, encima de la barra de abajo: arriba taparía los iconos.
            enLaSala
              ? 'max-md:bottom-[calc(env(safe-area-inset-bottom)+5rem)] max-md:top-auto xl:right-[25rem]'
              : '',
          ].join(' ')}
        >
          {salen.map((a) => (
            <ElAviso
              key={a.id}
              aviso={a}
              alQuitar={() => {
                quitarDeLaVista(a.id);
              }}
            />
          ))}
        </section>
      )}
      <Hoja abierta={abierta} ajustada titulo="Avisos" alCerrar={cerrarLaCampana}>
        {avisos.length === 0 ? (
          <div className="flex flex-col items-center gap-e2 py-e6 text-center text-texto-suave">
            <IconoBien size={28} aria-hidden className="text-bien" />
            <span className="font-bold text-texto">Todo en orden</span>
            <span className="text-secundario">
              Aquí se quedan los avisos hasta que se atienden.
            </span>
          </div>
        ) : (
          <ul aria-label="Todos los avisos" className="flex flex-col gap-e2 pb-e2">
            {avisos.map((a) => (
              <li key={a.id}>
                <ElAviso aviso={a} enLaCampana />
              </li>
            ))}
          </ul>
        )}
      </Hoja>
    </>
  );
}

function ElAviso({
  aviso: a,
  enLaCampana = false,
  alQuitar,
}: {
  readonly aviso: AvisoDelTpv;
  readonly enLaCampana?: boolean;
  readonly alQuitar?: () => void;
}) {
  const ejecutar = usarAcciones();
  const { icono: Dibujo, color } = COMO_SE_VE[a.clase];
  const resolver = () => {
    if (a.boton === null) return;
    const hace = a.boton.hace;
    if (enLaCampana) cerrarLaCampana();
    if (hace.tipo === 'ya_voy') void ejecutar('ya_voy', { cuenta_id: hace.cuentaId });
    else irA(hace.donde);
  };
  return (
    <div
      role={enLaCampana ? undefined : a.clase === 'impresora' ? 'alert' : 'status'}
      className={[
        'pointer-events-auto flex items-center gap-e3 rounded-grande border border-borde bg-superficie p-e2',
        enLaCampana ? '' : 'shadow-s3',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={['flex size-10 shrink-0 items-center justify-center rounded-medio', color].join(
          ' ',
        )}
      >
        <Dibujo size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="font-bold">{a.titulo}</span>
        <span className="truncate text-secundario text-texto-tenue">{a.detalle}</span>
      </span>
      {a.boton !== null && (
        <button
          type="button"
          onClick={resolver}
          aria-label={`${a.boton.texto}: ${a.titulo}`}
          className={[
            'min-h-toque shrink-0 rounded-medio px-e3 text-secundario font-bold',
            a.clase === 'efectivo'
              ? 'bg-mesa-cuenta text-sobre-mesa-cuenta'
              : a.clase === 'retirar'
                ? 'bg-atencion text-fondo'
                : 'border border-borde bg-fondo',
          ].join(' ')}
        >
          {a.boton.texto}
        </button>
      )}
      {alQuitar !== undefined && (
        <button
          type="button"
          onClick={alQuitar}
          aria-label={`Quitar de aquí: ${a.titulo}. Sigue en la campana`}
          className="flex size-10 shrink-0 items-center justify-center rounded-medio text-texto-tenue"
        >
          <IconoCerrar size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** **La campana**, arriba (y abajo en el móvil): cuántos avisos hay, y dentro, todos. */
export function BotonDeLaCampana({ conTexto = false }: { readonly conTexto?: boolean }) {
  const avisos = usarLosAvisos();
  const { abierta } = usarLaCampana();
  const cuantos = avisos.length;
  return (
    <button
      type="button"
      aria-label={cuantos === 0 ? 'Avisos' : `Avisos: ${String(cuantos)}`}
      aria-expanded={abierta}
      onClick={abrirLaCampana}
      className={
        conTexto
          ? 'relative flex min-h-toque flex-1 flex-col items-center justify-center gap-[2px] rounded-grande text-etiqueta font-semibold text-texto-suave'
          : 'relative flex size-11 shrink-0 items-center justify-center rounded-grande border border-borde bg-charcoal'
      }
    >
      <IconoAvisos size={22} aria-hidden />
      {conTexto && <span>Avisos</span>}
      {cuantos > 0 && (
        <span
          aria-hidden
          className={[
            'absolute flex min-w-5 items-center justify-center rounded-redondo bg-naranja px-[5px] text-etiqueta font-bold text-sobre-naranja',
            conTexto ? 'right-[calc(50%-1.4rem)] top-e1' : '-right-e1 -top-e1',
          ].join(' ')}
        >
          {cuantos}
        </span>
      )}
    </button>
  );
}
