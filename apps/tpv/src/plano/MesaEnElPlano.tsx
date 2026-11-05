import type { ColorDelTiempo } from '@estook/dominio';
import {
  IconoAdelante,
  IconoComiendo,
  IconoCuaderno,
  IconoCuenta,
  IconoEnviar,
  IconoLibre,
  IconoPersona,
  IconoReloj,
  type Icono,
} from '@estook/iconos';
import type { CuentaEnElPlano, EstadoDeLaMesa, MesaDelPlano } from '../datos/tipos.ts';
import { laPalabra, losMinutos, loQueDice, minutosCortos } from '../logica/comoVaLaMesa.ts';
import { euros, laHora } from '../logica/texto.ts';
import { enderezar, estiloEnElPlano, redondeoDeLaForma } from './dibujo.tsx';

/**
 * **Una mesa en el plano, sin abrirla** (T2, Anexo 11.8): su nombre, **su estado con
 * color, icono y texto** (nunca solo el color, B1), cuánto lleva, sus comensales, su total
 * y **las iniciales de su camarero** en una pastilla (las mías, en el color de Servicio).
 * Si su camarero ha fichado la salida, lo dice, para que alguien se la quede.
 *
 * **Cómo va, de verdad** (la pausa del 5-nov, 0131): al mandar, **«Esperando»** con el tiempo
 * desde que la cocina lo recibió, en azul, ámbar y rojo como la pantalla de cocina; cuando
 * sale todo, **«Comiendo»**; y a los 15 minutos de lo último, **«¿Cuenta?»** en morado.
 *
 * En la tablet y en la caja va donde se dibujó, con su forma y su giro; en el móvil, en
 * su casilla de la cuadrícula, de tres en fila.
 */

interface ComoSeVe {
  readonly caja: string;
  readonly texto: string;
  readonly icono: Icono;
}

const DE_SIEMPRE: Readonly<Record<Exclude<EstadoDeLaMesa, 'esperando'>, ComoSeVe>> = {
  libre: {
    caja: 'border-2 border-borde-fuerte bg-superficie',
    texto: 'text-texto-suave',
    icono: IconoLibre,
  },
  sin_pedir: {
    caja: 'border-0 bg-atencion-suave',
    texto: 'text-atencion font-semibold',
    icono: IconoCuaderno,
  },
  por_mandar: {
    caja: 'border-[3px] border-atencion bg-atencion-suave',
    texto: 'text-atencion font-bold',
    icono: IconoEnviar,
  },
  toca_marchar: {
    caja: 'border-[3px] border-info bg-info-suave',
    texto: 'text-info font-bold',
    icono: IconoAdelante,
  },
  comiendo: {
    caja: 'border-0 bg-bien-suave',
    texto: 'text-bien font-semibold',
    icono: IconoComiendo,
  },
  para_cobrar: {
    caja: 'border-2 border-app-equipo bg-app-equipo/15',
    texto: 'text-app-equipo font-bold',
    icono: IconoCuenta,
  },
};

/** Esperando, del color del tiempo en cocina; sin color (nadie tacha), en azul. */
const ESPERANDO: Readonly<Record<ColorDelTiempo | 'sin_color', ComoSeVe>> = {
  sin_color: {
    caja: 'border-0 bg-info-suave',
    texto: 'text-info font-semibold',
    icono: IconoReloj,
  },
  en_hora: { caja: 'border-0 bg-info-suave', texto: 'text-info font-semibold', icono: IconoReloj },
  justo: {
    caja: 'border-2 border-atencion bg-atencion-suave',
    texto: 'text-atencion font-bold',
    icono: IconoReloj,
  },
  tarde: {
    caja: 'border-[3px] border-mal bg-mal-suave',
    texto: 'text-mal font-bold',
    icono: IconoReloj,
  },
};

function comoSeVe(estado: EstadoDeLaMesa, color: ColorDelTiempo | null | undefined): ComoSeVe {
  return estado === 'esperando' ? ESPERANDO[color ?? 'sin_color'] : DE_SIEMPRE[estado];
}

/** Lo que dice la mesa debajo de su nombre. */
export function comoVaLaMesa(mesa: MesaDelPlano): string {
  return mesa.cuenta === null
    ? `Libre · ${String(mesa.plazas)}`
    : loQueDice(mesa.estado, mesa.cuenta);
}

/** El icono de cada estado: va siempre con su texto (B1). */
function IconoDelEstado({ como }: { readonly como: ComoSeVe }) {
  const Dibujo = como.icono;
  return <Dibujo size={16} aria-hidden className="shrink-0" />;
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
  const cuenta = mesa.cuenta;
  const como = comoSeVe(mesa.estado, cuenta?.colorDelTiempo);
  const pequena = mesa.forma === 'taburete';
  const seHaIdo = cuenta?.suCamareroSeHaIdo === true;
  const linea = comoVaLaMesa(mesa);
  const minutos = cuenta === null ? null : losMinutos(mesa.estado, cuenta);
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
            className={[
              'flex w-full min-w-0 items-center gap-e1 leading-tight',
              // La palabra sola y pequeña, que en una casilla no cabe con los minutos: van
              // debajo, en su color (0131). En el plano dibujado, centrada.
              'text-etiqueta',
              cuenta === null ? '' : 'font-bold',
              enElPlano ? 'justify-center' : '',
              como.texto,
            ].join(' ')}
          >
            <IconoDelEstado como={como} />
            <span className="truncate">
              {cuenta === null ? linea : laPalabra(mesa.estado, cuenta)}
            </span>
          </span>
        )}
        {cuenta !== null && !pequena && (
          <span
            className={[
              'flex w-full min-w-0 items-center gap-e2 text-etiqueta leading-tight text-texto-suave',
              enElPlano ? 'justify-center' : '',
            ].join(' ')}
          >
            {/* Los minutos, en el color de cómo va. */}
            {minutos !== null && (
              <span className={['shrink-0 font-bold', como.texto].join(' ')}>
                {minutosCortos(minutos)}
              </span>
            )}
            {/* Los comensales con su muñeco, que en una casilla de tres en fila no cabe la palabra. */}
            {cuenta.personas !== null && (
              <span
                className="flex shrink-0 items-center gap-[2px]"
                aria-label={
                  cuenta.personas === 1 ? '1 comensal' : `${String(cuenta.personas)} comensales`
                }
              >
                <IconoPersona size={12} aria-hidden />
                {cuenta.personas}
              </span>
            )}
            <span className="truncate">{euros(cuenta.totalCentimos)}</span>
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
  const estado = cuenta.comoVa ?? comoVaDeAntes(cuenta);
  const como = comoSeVe(estado, cuenta.colorDelTiempo);
  const linea = loQueDice(estado, cuenta);
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-label={`${cuenta.titulo}: ${linea}`}
      className={[
        'flex min-h-[7.5rem] flex-col gap-[2px] rounded-mayor p-e3 text-left',
        como.caja,
      ].join(' ')}
    >
      <span className="flex w-full items-start justify-between gap-e1">
        <span className="text-cuerpo font-bold">{cuenta.titulo}</span>
        <Pastilla cuenta={cuenta} />
      </span>
      <span className={['flex items-center gap-e1 text-secundario', como.texto].join(' ')}>
        <IconoDelEstado como={como} />
        <span className="truncate">{linea}</span>
      </span>
      {cuenta.paraLas !== undefined && cuenta.paraLas !== null && (
        // Lo de llevar programado (0121): su hora, que es lo que importa.
        <span className="text-secundario font-bold text-info">
          Para las {laHora(cuenta.paraLas)}
        </span>
      )}
      <span className="text-secundario text-texto-suave">{euros(cuenta.totalCentimos)} €</span>
    </button>
  );
}

/** Con una API de antes, que no dice cómo va: lo de entonces, por lo que toca hacer. */
function comoVaDeAntes(cuenta: CuentaEnElPlano): EstadoDeLaMesa {
  switch (cuenta.loSiguiente.que) {
    case 'pedir':
      return 'sin_pedir';
    case 'mandar':
      return 'por_mandar';
    case 'marchar':
      return 'toca_marchar';
    case 'cobrar':
      return 'comiendo';
  }
}
