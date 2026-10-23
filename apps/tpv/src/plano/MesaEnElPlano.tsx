import { elSitioDeLaMesa } from '@estook/ui';
import type { CuentaEnElPlano, MesaDelPlano } from '../datos/tipos.ts';
import { elPase } from '../logica/laCuenta.ts';
import { cuantoLlevan, euros } from '../logica/texto.ts';

/**
 * Una mesa en el plano, con cómo va de un vistazo (0106, «Main»):
 *
 *   · libre: con el borde a rayas y sus plazas
 *   · sentados sin pedir, en naranja suave: alguien tiene que ir
 *   · comiendo, en verde, con lo que llevan
 *   · **toca marchar**, en azul y con borde: ha salido todo el pase de antes
 *   · algo sin mandar, en ámbar: la comanda se quedó en la tablet
 *
 * Las iniciales del camarero en su pastilla; las mías, en el color de Servicio.
 */

const COMO_SE_VE: Record<MesaDelPlano['estado'], { caja: string; texto: string }> = {
  libre: {
    caja: 'border-2 border-dashed border-borde-fuerte bg-superficie',
    texto: 'text-texto-suave',
  },
  sin_pedir: { caja: 'border-0 bg-naranja-suave', texto: 'text-atencion font-semibold' },
  comiendo: { caja: 'border-0 bg-bien-suave', texto: 'text-bien font-semibold' },
  toca_marchar: { caja: 'border-[3px] border-info bg-info-suave', texto: 'text-info font-bold' },
  por_mandar: {
    caja: 'border-[3px] border-atencion bg-atencion-suave',
    texto: 'text-atencion font-bold',
  },
};

function laLinea(mesa: MesaDelPlano): string {
  const cuenta = mesa.cuenta;
  if (cuenta === null) return `Libre · ${mesa.plazas}`;
  if (mesa.estado === 'toca_marchar' && cuenta.loSiguiente.que === 'marchar') {
    return `Toca marchar el ${elPase(cuenta.loSiguiente.pase)}`;
  }
  if (mesa.estado === 'por_mandar') return 'Sin mandar';
  if (mesa.estado === 'sin_pedir') return `Sin pedir · ${cuantoLlevan(cuenta.minutos)}`;
  return `Comiendo · ${cuantoLlevan(cuenta.minutos)}`;
}

/** Lo mismo, en corto: «Toca marchar», «42 min». */
function laLineaCorta(mesa: MesaDelPlano): string {
  const cuenta = mesa.cuenta;
  if (cuenta === null) return `Libre · ${mesa.plazas}`;
  if (mesa.estado === 'toca_marchar') return 'Toca marchar';
  if (mesa.estado === 'por_mandar') return 'Sin mandar';
  if (mesa.estado === 'sin_pedir') return 'Sin pedir';
  return cuantoLlevan(cuenta.minutos);
}

function Pastilla({ cuenta }: { readonly cuenta: CuentaEnElPlano }) {
  if (cuenta.iniciales === null) return null;
  return (
    <span
      title={cuenta.camarero ?? undefined}
      className={[
        'rounded-redondo px-e2 py-[2px] text-etiqueta font-bold text-white',
        cuenta.esMia ? 'bg-app-servicio' : 'bg-charcoal',
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
  /** En la tablet va donde se dibujó; en el móvil, en su casilla de la lista. */
  readonly enElPlano: boolean;
  readonly alTocar: () => void;
}) {
  const como = COMO_SE_VE[mesa.estado];
  const sitio = elSitioDeLaMesa(mesa.forma, mesa.x, mesa.y);
  const redonda = mesa.forma === 'redonda';
  const cuenta = mesa.cuenta;
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-label={`Mesa ${mesa.nombre}: ${laLinea(mesa)}`}
      style={
        enElPlano
          ? {
              left: `${sitio.izquierda}%`,
              top: `${sitio.arriba}%`,
              width: `${sitio.ancho}%`,
              height: `${sitio.alto}%`,
            }
          : undefined
      }
      className={[
        'flex flex-col gap-[2px] overflow-hidden p-e3 text-left text-texto transition-transform active:scale-[0.98]',
        enElPlano ? 'absolute' : 'min-h-[7.5rem]',
        redonda && enElPlano
          ? 'items-center justify-center rounded-redondo text-center'
          : 'rounded-mayor',
        mesa.forma === 'alargada' && !enElPlano ? 'col-span-2' : '',
        como.caja,
      ].join(' ')}
    >
      <span className="flex w-full items-start justify-between gap-e1">
        <span className="text-seccion font-bold leading-none">{mesa.nombre}</span>
        {cuenta !== null && !redonda && <Pastilla cuenta={cuenta} />}
      </span>
      <span className={['text-secundario leading-tight', como.texto].join(' ')}>
        {/* En una tablet pequeña la mesa es pequeña: lo corto; en la grande, entero. */}
        <span className={enElPlano ? 'lg:hidden' : 'hidden'}>{laLineaCorta(mesa)}</span>
        <span className={enElPlano ? 'hidden lg:inline' : ''}>{laLinea(mesa)}</span>
      </span>
      {cuenta !== null && (
        <span
          className={[
            'whitespace-nowrap text-secundario leading-tight text-texto-suave',
            enElPlano ? 'hidden lg:block' : '',
          ].join(' ')}
        >
          {cuenta.personas === null ? '' : `${cuenta.personas} pers · `}
          {euros(cuenta.totalCentimos)} €
        </span>
      )}
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
