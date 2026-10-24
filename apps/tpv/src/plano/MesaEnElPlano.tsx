import type { ReactNode } from 'react';
import type { CuentaEnElPlano, MesaDelPlano } from '../datos/tipos.ts';
import { elPase } from '../logica/laCuenta.ts';
import { cuantoLlevan, euros } from '../logica/texto.ts';
import { enderezar, estiloEnElPlano, redondeoDeLaForma } from './dibujo.tsx';

/**
 * **Una mesa en el plano, sin abrirla** (T2, Anexo 11.8): su nombre, **su estado con
 * color, icono y texto** (nunca solo el color, B1), cuánto lleva, sus comensales, su total
 * y **las iniciales de su camarero** en una pastilla (las mías, en el color de Servicio).
 * Si su camarero ha fichado la salida, lo dice, para que alguien se la quede.
 *
 * En la tablet y en la caja va donde se dibujó, con su forma y su giro; en el móvil, en
 * su casilla de la cuadrícula, de tres en fila.
 */

type Estado = MesaDelPlano['estado'];

const COMO_SE_VE: Readonly<Record<Estado, { readonly caja: string; readonly texto: string }>> = {
  libre: { caja: 'border-2 border-borde-fuerte bg-superficie', texto: 'text-texto-suave' },
  sin_pedir: { caja: 'border-0 bg-atencion-suave', texto: 'text-atencion font-semibold' },
  comiendo: { caja: 'border-0 bg-bien-suave', texto: 'text-bien font-semibold' },
  toca_marchar: { caja: 'border-[3px] border-info bg-info-suave', texto: 'text-info font-bold' },
  por_mandar: {
    caja: 'border-[3px] border-atencion bg-atencion-suave',
    texto: 'text-atencion font-bold',
  },
};

/** Lo que dice la mesa debajo de su nombre. */
export function comoVaLaMesa(mesa: MesaDelPlano): string {
  const cuenta = mesa.cuenta;
  if (cuenta === null) return `Libre · ${String(mesa.plazas)}`;
  if (mesa.estado === 'toca_marchar' && cuenta.loSiguiente.que === 'marchar') {
    return `Marchar ${elPase(cuenta.loSiguiente.pase)}`;
  }
  if (mesa.estado === 'por_mandar') return 'Sin mandar';
  if (mesa.estado === 'sin_pedir') return `Sin pedir · ${cuantoLlevan(cuenta.minutos)}`;
  return `Comiendo · ${cuantoLlevan(cuenta.minutos)}`;
}

/** El icono de cada estado: va siempre con su texto. */
function IconoDelEstado({ estado }: { readonly estado: Estado }) {
  const trazo: Readonly<Record<Estado, ReactNode>> = {
    libre: <circle cx="12" cy="12" r="7" />,
    sin_pedir: (
      <>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 9h6M9 13h6" />
      </>
    ),
    comiendo: (
      <>
        <circle cx="12" cy="13" r="6" />
        <path d="M5 5v5M8 5v5M6.5 10v9" />
      </>
    ),
    toca_marchar: <path d="M5 12h12M13 7l5 5-5 5" />,
    por_mandar: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v6M12 16v1" />
      </>
    ),
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {trazo[estado]}
    </svg>
  );
}

export function Pastilla({ cuenta }: { readonly cuenta: CuentaEnElPlano }) {
  if (cuenta.iniciales === null) return null;
  return (
    <span
      title={cuenta.camarero ?? undefined}
      className={[
        'shrink-0 rounded-redondo px-e2 py-[2px] text-etiqueta font-bold',
        cuenta.esMia ? 'bg-app-servicio text-fondo' : 'bg-charcoal text-texto',
      ].join(' ')}
    >
      {cuenta.iniciales}
    </span>
  );
}

export function MesaEnElPlano({
  mesa,
  enElPlano,
  alTocar,
}: {
  readonly mesa: MesaDelPlano;
  /** En la tablet va donde se dibujó; en el móvil, en su casilla de la cuadrícula. */
  readonly enElPlano: boolean;
  readonly alTocar: () => void;
}) {
  const como = COMO_SE_VE[mesa.estado];
  const cuenta = mesa.cuenta;
  const pequena = mesa.forma === 'taburete';
  const seHaIdo = cuenta?.suCamareroSeHaIdo === true;
  const linea = comoVaLaMesa(mesa);
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-label={`Mesa ${mesa.nombre}: ${linea}${seHaIdo ? `, ${cuenta.camarero ?? 'su camarero'} ha fichado la salida` : ''}`}
      style={enElPlano ? estiloEnElPlano(mesa) : undefined}
      className={[
        'flex overflow-hidden text-texto transition-transform active:scale-[0.98]',
        enElPlano
          ? `absolute items-center justify-center ${redondeoDeLaForma(mesa.forma)}`
          : 'min-h-[5.5rem] flex-col rounded-mayor p-e2 text-left',
        como.caja,
        seHaIdo ? 'outline outline-2 outline-mal' : '',
      ].join(' ')}
    >
      <span
        style={enElPlano ? enderezar(mesa.giro) : undefined}
        className={[
          'flex min-w-0 flex-col gap-[2px]',
          enElPlano ? 'items-center p-e1 text-center' : 'w-full',
        ].join(' ')}
      >
        <span className="flex w-full items-center justify-between gap-e1">
          <span className="text-seccion font-bold leading-none">{mesa.nombre}</span>
          {cuenta !== null && !pequena && <Pastilla cuenta={cuenta} />}
        </span>
        {!pequena && (
          <span
            className={['flex items-center gap-e1 text-secundario leading-tight', como.texto].join(
              ' ',
            )}
          >
            <IconoDelEstado estado={mesa.estado} />
            <span className="truncate">{linea}</span>
          </span>
        )}
        {cuenta !== null && !pequena && (
          <span className="truncate text-etiqueta leading-tight text-texto-suave">
            {cuenta.personas === null ? '' : `${String(cuenta.personas)} pers · `}
            {euros(cuenta.totalCentimos)}
          </span>
        )}
        {seHaIdo && !pequena && (
          <span className="truncate text-etiqueta font-semibold text-mal">
            {cuenta.camarero ?? 'Su camarero'} ha fichado la salida
          </span>
        )}
      </span>
    </button>
  );
}

/** Una cuenta sin mesa: la barra o para llevar, con su nombre. */
export function TarjetaSinMesa({
  cuenta,
  alTocar,
}: {
  readonly cuenta: CuentaEnElPlano;
  readonly alTocar: () => void;
}) {
  const toca = cuenta.loSiguiente.que === 'marchar';
  const sinMandar = cuenta.loSiguiente.que === 'mandar';
  return (
    <button
      type="button"
      onClick={alTocar}
      className={[
        'flex min-h-[7.5rem] flex-col gap-[2px] rounded-mayor p-e3 text-left',
        toca
          ? 'border-[3px] border-info bg-info-suave'
          : sinMandar
            ? 'border-[3px] border-atencion bg-atencion-suave'
            : 'bg-bien-suave',
      ].join(' ')}
    >
      <span className="flex w-full items-start justify-between gap-e1">
        <span className="text-cuerpo font-bold">{cuenta.titulo}</span>
        <Pastilla cuenta={cuenta} />
      </span>
      <span className="text-secundario text-texto-suave">{cuantoLlevan(cuenta.minutos)}</span>
      <span className="text-secundario text-texto-suave">{euros(cuenta.totalCentimos)} €</span>
    </button>
  );
}
