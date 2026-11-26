import type { ColorDelTiempo } from '@estook/dominio';
import {
  IconoAdelante,
  IconoAtencion,
  IconoComiendo,
  IconoCuaderno,
  IconoBien,
  IconoCuenta,
  IconoEnviar,
  IconoLibre,
  IconoRefresco,
  IconoPersona,
  IconoReloj,
  type Icono,
} from '@estook/iconos';
import { fondoDegradado } from '@estook/ui';
import type { CuentaEnElPlano, EstadoDeLaMesa, MesaDelPlano, UnaReserva } from '../datos/tipos.ts';
import {
  HORAS_PARA_AVISAR,
  laPalabra,
  llevaDemasiado,
  losMinutos,
  loQueDice,
  minutosCortos,
} from '../logica/comoVaLaMesa.ts';
import { euros, laHora } from '../logica/texto.ts';
import { enderezar, estiloEnElPlano, redondeoDeLaForma } from './dibujo.tsx';
import { lasSillas } from './sillas.ts';

/**
 * **Una mesa en el plano, sin abrirla** (T2, Anexo 11.8; rehecha en el rediseño, 0148): su nombre,
 * **su estado con color, icono y texto** (nunca solo el color, B1), cuánto lleva, sus comensales,
 * su total y **las iniciales de su camarero**.
 *
 * **Colores sólidos** (Richi, 17 y 18-nov: «que se vean a la perfección, no tan opacos, que se
 * confunden con el fondo»): seis, con el texto que contrasta encima, los mismos en oscuro y en
 * claro. «Sin pedir» y «Sin mandar» comparten el ámbar: los dos son «te toca a ti», y la palabra
 * dice cuál. **Esperando** es azul; si la cocina va justa o tarde (el color de su pantalla), lo
 * dicen los minutos, en su chapa, y tarde lleva además el borde rojo.
 *
 * **Sus sillas**, tantas como plazas, alrededor (`sillas.ts`). Y **la mesa abierta más de seis
 * horas**, con el borde rojo de puntos y un «!»: se quedó sin cobrar o sin cerrar.
 *
 * En la tablet y en la caja va donde se dibujó, con su forma y su giro; en el móvil, en su
 * casilla de la cuadrícula.
 */

interface ComoSeVe {
  /** El color de la mesa, su texto y su borde. */
  readonly caja: string;
  /** El color de sus sillas, el mismo de la mesa con menos fuerza. */
  readonly sillas: string;
  /** La chapa de los minutos, si no es la de siempre (la cocina va justa o tarde). */
  readonly minutos: string;
  readonly icono: Icono;
}

const CHAPA = 'bg-sobre-mesa-libre/20';

const DE_SIEMPRE: Readonly<Record<Exclude<EstadoDeLaMesa, 'esperando'>, ComoSeVe>> = {
  libre: {
    caja: 'border-2 border-mesa-libre-borde bg-mesa-libre text-sobre-mesa-libre',
    sillas: 'bg-mesa-libre-borde/70',
    minutos: CHAPA,
    icono: IconoLibre,
  },
  sin_pedir: {
    caja: 'bg-mesa-te-toca text-sobre-mesa-te-toca',
    sillas: 'bg-mesa-te-toca/60',
    minutos: CHAPA,
    icono: IconoCuaderno,
  },
  por_mandar: {
    caja: 'bg-mesa-te-toca text-sobre-mesa-te-toca',
    sillas: 'bg-mesa-te-toca/60',
    minutos: CHAPA,
    icono: IconoEnviar,
  },
  toca_marchar: {
    caja: 'bg-mesa-marchar text-sobre-mesa-marchar',
    sillas: 'bg-mesa-marchar/60',
    minutos: CHAPA,
    icono: IconoAdelante,
  },
  // **La bebida, hasta que se sirve** (0153): en violeta mientras nadie la ha llevado; en turquesa
  // si la barra ya la ha hecho y está para ir a por ella.
  bebida_en_camino: {
    caja: 'bg-mesa-bebida text-sobre-mesa-bebida',
    sillas: 'bg-mesa-bebida/60',
    minutos: CHAPA,
    icono: IconoRefresco,
  },
  bebida_lista: {
    caja: 'bg-mesa-bebida-lista text-sobre-mesa-bebida-lista',
    sillas: 'bg-mesa-bebida-lista/60',
    minutos: CHAPA,
    icono: IconoBien,
  },
  comiendo: {
    caja: 'bg-mesa-comiendo text-sobre-mesa-comiendo',
    sillas: 'bg-mesa-comiendo/60',
    minutos: CHAPA,
    icono: IconoComiendo,
  },
  para_cobrar: {
    caja: 'bg-mesa-cuenta text-sobre-mesa-cuenta',
    sillas: 'bg-mesa-cuenta/60',
    minutos: CHAPA,
    icono: IconoCuenta,
  },
};

const ESPERANDO_BASE = 'bg-mesa-esperando text-sobre-mesa-esperando';

/** Esperando, en azul; los minutos, del color del tiempo en cocina. */
const ESPERANDO: Readonly<Record<ColorDelTiempo | 'sin_color', ComoSeVe>> = {
  sin_color: {
    caja: ESPERANDO_BASE,
    sillas: 'bg-mesa-esperando/60',
    minutos: CHAPA,
    icono: IconoReloj,
  },
  en_hora: {
    caja: ESPERANDO_BASE,
    sillas: 'bg-mesa-esperando/60',
    minutos: CHAPA,
    icono: IconoReloj,
  },
  justo: {
    caja: ESPERANDO_BASE,
    sillas: 'bg-mesa-esperando/60',
    minutos: 'bg-mesa-te-toca text-sobre-mesa-te-toca',
    icono: IconoReloj,
  },
  tarde: {
    caja: `${ESPERANDO_BASE} outline outline-[3px] outline-offset-2 outline-mal`,
    sillas: 'bg-mesa-esperando/60',
    minutos: 'bg-mal text-fondo',
    icono: IconoReloj,
  },
};

/**
 * **Lo que no conoce no tumba la sala** (Sentry, 5-nov, «s.caja»): una pestaña abierta con la versión
 * de antes y una API que ya manda un estado nuevo dejaban la pantalla en blanco en pleno servicio.
 * Se ve como una mesa abierta, y al recargar ya lo conoce.
 */
export function comoSeVe(
  estado: EstadoDeLaMesa,
  color: ColorDelTiempo | null | undefined,
): ComoSeVe {
  // Lo que llega de la API puede ser más nuevo que esta pestaña: aquí no se da por conocido.
  const conocidos: Readonly<Partial<Record<string, ComoSeVe>>> =
    estado === 'esperando' ? ESPERANDO : DE_SIEMPRE;
  const clave: string = estado === 'esperando' ? (color ?? 'sin_color') : estado;
  return conocidos[clave] ?? DE_SIEMPRE.sin_pedir;
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

/** Las iniciales del camarero: las mías, en blanco; las de otro, en la chapa oscura. */
export function Pastilla({ cuenta }: { readonly cuenta: CuentaEnElPlano }) {
  if (cuenta.iniciales === null) return null;
  return (
    <span
      title={cuenta.camarero ?? undefined}
      className={[
        'shrink-0 rounded-redondo px-e2 py-[2px] text-etiqueta font-bold',
        cuenta.esMia ? 'bg-mesa-libre text-sobre-mesa-libre' : 'bg-sobre-mesa-libre/25',
      ].join(' ')}
    >
      {cuenta.iniciales}
    </span>
  );
}

/** El «!» de una mesa que lleva demasiado, arriba a la izquierda. */
function Exclamacion() {
  return (
    <span
      aria-hidden
      className="absolute -left-e2 -top-e2 z-10 flex size-6 items-center justify-center rounded-redondo bg-mal text-fondo"
    >
      <IconoAtencion size={14} />
    </span>
  );
}

export function MesaEnElPlano({
  mesa,
  reserva = null,
  enElPlano,
  elegida = false,
  alTocar,
}: {
  readonly mesa: MesaDelPlano;
  /**
   * **La reserva que la espera** (la Ampliación 5 · 1, 0153): si está libre, su hora en violeta y quién
   * viene. Abrirla avisa, sin bloquear.
   */
  readonly reserva?: UnaReserva | null;
  /** En la tablet va donde se dibujó; en el móvil, en su casilla de la cuadrícula. */
  readonly enElPlano: boolean;
  /** La que está abierta en la columna de la derecha (0148): se marca para no perderla. */
  readonly elegida?: boolean;
  readonly alTocar: () => void;
}) {
  const cuenta = mesa.cuenta;
  const como = comoSeVe(mesa.estado, cuenta?.colorDelTiempo);
  const pequena = mesa.forma === 'taburete';
  const seHaIdo = cuenta?.suCamareroSeHaIdo === true;
  const demasiado = llevaDemasiado(cuenta);
  const reservada = cuenta === null && reserva !== null;
  const linea = reservada
    ? `${String(reserva.comensales)} · ${reserva.nombre}`
    : comoVaLaMesa(mesa);
  const minutos = cuenta === null ? null : losMinutos(mesa.estado, cuenta);
  // El efectivo que espera en la caja (0145): se ve desde lejos, en la misma mesa.
  const enCaja = (cuenta?.pendientes ?? []).length > 0;
  const avisos = [
    enCaja ? 'cobro pendiente en la caja' : null,
    seHaIdo ? `${cuenta.camarero ?? 'su camarero'} ha fichado la salida` : null,
    demasiado ? `lleva más de ${String(HORAS_PARA_AVISAR)} horas abierta` : null,
    reservada ? `reservada a las ${reserva.hora}` : null,
  ].filter((a) => a !== null);

  const boton = (
    <button
      type="button"
      onClick={alTocar}
      aria-pressed={elegida || undefined}
      aria-label={`Mesa ${mesa.nombre}: ${linea}${avisos.length > 0 ? `, ${avisos.join(', ')}` : ''}`}
      className={[
        'flex overflow-hidden transition-transform active:scale-[0.98]',
        enElPlano
          ? `absolute inset-0 items-center justify-center ${redondeoDeLaForma(mesa.forma)}`
          : 'relative min-h-[6.5rem] w-full flex-col rounded-mayor p-e3 text-left',
        como.caja,
        seHaIdo || demasiado ? 'outline outline-[3px] outline-offset-2 outline-mal' : '',
        demasiado ? 'outline-dashed' : '',
        elegida ? 'ring-4 ring-texto ring-offset-2 ring-offset-superficie' : '',
      ].join(' ')}
    >
      <span
        style={enElPlano ? enderezar(mesa.giro) : undefined}
        className={[
          'flex min-w-0 flex-col gap-[3px]',
          enElPlano ? 'items-center p-e1 text-center' : 'w-full',
        ].join(' ')}
      >
        <span
          className={[
            'flex w-full items-center gap-e1',
            enElPlano ? 'justify-center' : 'justify-between',
          ].join(' ')}
        >
          <span className="text-pantalla font-bold leading-none">{mesa.nombre}</span>
          {cuenta !== null && !pequena && <Pastilla cuenta={cuenta} />}
          {reservada && (
            <span
              className="shrink-0 rounded-redondo px-e1 text-etiqueta font-bold leading-snug tabular-nums text-white"
              style={fondoDegradado('fechas')}
            >
              {reserva.hora}
            </span>
          )}
        </span>
        {!pequena && (
          <span
            className={[
              'flex w-full min-w-0 items-center gap-e1 text-secundario font-bold leading-tight',
              enElPlano ? 'justify-center' : '',
              cuenta === null ? 'opacity-80' : '',
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
              'flex w-full min-w-0 items-center gap-e2 text-etiqueta font-semibold leading-tight opacity-90',
              enElPlano ? 'justify-center' : '',
            ].join(' ')}
          >
            {/* Los minutos, en su chapa: la de la cocina si va justa o tarde. Debajo de la palabra,
                que en una mesa pequeña no caben los dos. */}
            {minutos !== null && (
              <span
                className={[
                  'shrink-0 rounded-redondo px-e1 font-bold tabular-nums',
                  como.minutos,
                ].join(' ')}
              >
                {minutosCortos(minutos)}
              </span>
            )}
            {/* Los comensales con su muñeco, que en una casilla pequeña no cabe la palabra. */}
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
            <span className="truncate tabular-nums">{euros(cuenta.totalCentimos)} €</span>
          </span>
        )}
        {enCaja && (
          <span className="truncate rounded-redondo bg-mesa-libre px-e2 text-etiqueta font-bold text-sobre-mesa-libre">
            Cobro en caja
          </span>
        )}
        {seHaIdo && !pequena && !enElPlano && (
          <span className="truncate text-etiqueta font-bold">
            {cuenta.camarero ?? 'Su camarero'} ha fichado la salida
          </span>
        )}
      </span>
    </button>
  );

  if (!enElPlano) {
    return (
      <div className="relative">
        {boton}
        {demasiado && <Exclamacion />}
      </div>
    );
  }

  // En el plano: la caja dibujada lleva las sillas alrededor y la mesa dentro.
  const sitio = estiloEnElPlano(mesa);
  const apaisada = mesa.ancho * 16 >= mesa.fondo * 10;
  return (
    <div style={sitio} className="absolute">
      {lasSillas(mesa.forma, mesa.plazas, apaisada).map((s) => (
        <span
          // Dos sillas no caen en el mismo sitio: su sitio es su clave.
          key={`${String(s.x)}-${String(s.y)}`}
          aria-hidden
          className={['absolute h-[7px] w-[22px] rounded-redondo', como.sillas].join(' ')}
          style={{
            left: `${String(s.x)}%`,
            top: `${String(s.y)}%`,
            transform: `translate(-50%, -50%) rotate(${String(s.giro)}deg) translateY(-9px)`,
          }}
        />
      ))}
      {boton}
      {demasiado && <Exclamacion />}
    </div>
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
      aria-label={`${cuenta.titulo}: ${linea}${(cuenta.pendientes ?? []).length > 0 ? ', cobro pendiente en la caja' : ''}`}
      className={[
        'flex min-h-[7.5rem] flex-col gap-[3px] rounded-mayor p-e3 text-left',
        como.caja,
      ].join(' ')}
    >
      <span className="flex w-full items-start justify-between gap-e1">
        <span className="text-cuerpo font-bold">{cuenta.titulo}</span>
        <Pastilla cuenta={cuenta} />
      </span>
      <span className="flex items-center gap-e1 text-secundario font-bold">
        <IconoDelEstado como={como} />
        <span className="truncate">{linea}</span>
      </span>
      {cuenta.paraLas !== undefined && cuenta.paraLas !== null && (
        // Lo de llevar programado (0121): su hora, que es lo que importa.
        <span className="self-start rounded-redondo bg-sobre-mesa-libre/20 px-e2 text-secundario font-bold">
          Para las {laHora(cuenta.paraLas)}
        </span>
      )}
      <span className="text-secundario font-semibold opacity-90">
        {euros(cuenta.totalCentimos)} €
      </span>
      {(cuenta.pendientes ?? []).length > 0 && (
        <span className="self-start rounded-redondo bg-mesa-libre px-e2 text-etiqueta font-bold text-sobre-mesa-libre">
          Cobro en caja
        </span>
      )}
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
