import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { CIFRAS_DEL_PIN, NOMBRE_DE_LA_FORMA_DE_PAGO } from '@estook/dominio';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { euros, eurosConSimbolo } from '../logica/texto.ts';
import { Puntos, Teclado } from '../puerta/Teclado.tsx';
import { cifraDeLaTecla } from '../puerta/teclas.ts';
import type { CobroPendienteEnLaMesa } from '../datos/tipos.ts';
import { idNuevo, usarRecargarLaCaja } from '../ganchos/usarLaCaja.ts';
import { usarElPlano } from '../ganchos/usarLaSala.ts';
import { irAlPlano } from '../navegar.ts';
import { deEurosACentimos } from './dinero.ts';
import { losBilletesQueLoCubren } from './Cobrar.tsx';
import type { Cobrado } from './tipos.ts';

/**
 * **Cobrar en la caja el efectivo que dejó un camarero** (0145; Richi, 10 y 11-nov): «Cobrar efectivo ·
 * Ricardo · 30,00 €», desde la mesa o desde la pantalla del PIN.
 *
 *   1 · **El PIN de quien cobra**, siempre: el cobro queda a su nombre aunque la caja la tenga abierta
 *       otro («si un camarero la caga al cobrar, la culpa es del gerente»). Desde la pantalla del PIN ya
 *       se ha tecleado al entrar, y no se pide otra vez.
 *   2 · **¿Cuánto te da?**, con los billetes de un toque, y el cambio en grande.
 *   3 · **Cobrar**: sale el ticket por la impresora, que abre el cajón con su impulso. Se coge el cambio
 *       y el ticket, y se lleva a la mesa.
 */
export function CobrarElPendiente({
  pendiente,
  cuentaId,
  titulo,
  conPin,
  alVolver,
  alAcabar,
}: {
  readonly pendiente: CobroPendienteEnLaMesa;
  readonly cuentaId: string;
  readonly titulo: string;
  /** Desde la mesa, con la caja abierta: el PIN de quien cobra. Desde el PIN de la caja ya está. */
  readonly conPin: boolean;
  readonly alVolver: () => void;
  readonly alAcabar: () => void;
}) {
  const { cliente, yo } = usarSesion();
  const recargar = usarRecargarLaCaja();
  const [pin, setPin] = useState<string | null>(conPin ? null : '');
  const [quien, setQuien] = useState<string>(yo.nombre);
  const [entregado, setEntregado] = useState<number | 'justo' | 'otro'>('justo');
  const [otro, setOtro] = useState('');
  const [cobroId] = useState(idNuevo);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<Cobrado | null>(null);

  const aCobrar = pendiente.enEfectivo;
  const daAhora =
    entregado === 'justo'
      ? aCobrar
      : entregado === 'otro'
        ? (deEurosACentimos(otro) ?? 0)
        : entregado;
  const cambio = daAhora - aCobrar;

  async function cobrar() {
    setOcupado(true);
    setFallo(null);
    const respuesta = await cliente.ejecutar<Cobrado>('cobrar', {
      cobro_id: cobroId,
      cuenta_id: cuentaId,
      que: pendiente.que,
      ...(pendiente.que === 'platos' ? { lineas: pendiente.lineas } : {}),
      ...(pendiente.parte === null ? {} : { parte: pendiente.parte, de: pendiente.de }),
      importe: pendiente.importe,
      pendiente_id: pendiente.id,
      entregado: daAhora,
      ...(pin === null || pin === '' ? {} : { pin }),
    });
    setOcupado(false);
    if (respuesta.ok) {
      setHecho(respuesta.datos);
      await recargar();
    } else {
      setFallo(respuesta.error);
    }
  }

  if (pin === null) {
    return (
      <Marco titulo={titulo} alVolver={alVolver}>
        <TuPin
          pendiente={pendiente}
          alTeclear={async (tecleado) => {
            const r = await cliente.ejecutar<{ nombre: string }>('quien_cobra_con_este_pin', {
              pin: tecleado,
            });
            if (!r.ok) return r.error;
            setQuien(r.datos.nombre);
            setPin(tecleado);
            return null;
          }}
        />
      </Marco>
    );
  }

  if (hecho !== null) {
    return (
      <Marco titulo={titulo} alVolver={alAcabar}>
        <div className="flex flex-col items-start gap-e4">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-redondo bg-bien text-cifra-media text-fondo"
          >
            ✓
          </span>
          {hecho.cambio > 0 && (
            <div className="flex w-full items-center justify-between rounded-grande bg-bien-suave p-e4 text-bien">
              <span className="text-seccion font-bold">Cambio</span>
              <span className="text-cifra font-bold tabular-nums">
                {eurosConSimbolo(hecho.cambio)}
              </span>
            </div>
          )}
          <p className="text-texto-suave">
            {hecho.cajonAbierto ? 'El cajón se ha abierto. ' : ''}El ticket{' '}
            <b className="tabular-nums text-texto">{hecho.numero}</b> sale por la impresora: llévalo
            a la mesa con el cambio. Cobrado por {quien}.
          </p>
          <button
            type="button"
            onClick={alAcabar}
            className="min-h-toque-cocina w-full rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja"
          >
            {hecho.liberada ? 'Listo · la mesa queda libre' : 'Listo'}
          </button>
        </div>
      </Marco>
    );
  }

  return (
    <Marco titulo={titulo} alVolver={alVolver}>
      <div className="flex max-w-[36rem] flex-col gap-e4">
        <div className="flex flex-wrap items-baseline justify-between gap-e3">
          <div className="flex flex-col">
            <span className="font-bold text-texto-suave">Efectivo a cobrar</span>
            <span className="text-secundario text-texto-tenue">
              Lo dejó {pendiente.por} · cobra {quien}
            </span>
          </div>
          <span className="text-[2.5rem] font-bold leading-none tabular-nums">
            {eurosConSimbolo(aCobrar)}
          </span>
        </div>
        {pendiente.yaPagado.length > 0 && (
          <p className="rounded-grande bg-superficie p-e3 text-texto-suave">
            Ya cobrado en la mesa:{' '}
            {pendiente.yaPagado
              .map((p) => `${NOMBRE_DE_LA_FORMA_DE_PAGO[p.forma]} ${eurosConSimbolo(p.importe)}`)
              .join(' · ')}
            . Va en el mismo ticket.
          </p>
        )}
        {fallo !== null && <ErrorEnCristiano error={fallo} />}
        <span className="text-secundario font-bold text-texto-suave">¿Cuánto te da?</span>
        <div
          className="grid grid-cols-3 gap-e2 sm:grid-cols-5"
          role="group"
          aria-label="Lo que te da"
        >
          {(['justo', ...losBilletesQueLoCubren(aCobrar), 'otro'] as const).map((b) => (
            <button
              key={String(b)}
              type="button"
              aria-pressed={entregado === b}
              onClick={() => {
                setEntregado(b);
              }}
              className={`min-h-toque-cocina rounded-grande border-2 font-bold tabular-nums ${
                entregado === b ? 'border-naranja bg-naranja-suave' : 'border-borde'
              }`}
            >
              {b === 'justo' ? 'Justo' : b === 'otro' ? 'Otro' : `${euros(b).replace(',00', '')} €`}
            </button>
          ))}
        </div>
        {entregado === 'otro' && (
          <label className="flex items-center justify-between gap-e3 rounded-grande border-2 border-borde bg-fondo px-e4 py-e2 focus-within:border-naranja">
            <span className="text-texto-suave">Te da</span>
            <input
              inputMode="decimal"
              value={otro}
              placeholder="0,00"
              onChange={(e) => {
                setOtro(e.currentTarget.value);
              }}
              className="w-[9ch] bg-transparent text-right text-cifra-larga font-bold tabular-nums outline-none"
            />
          </label>
        )}
        {cambio > 0 ? (
          <div className="flex items-center justify-between rounded-grande bg-bien-suave p-e4 text-bien">
            <span className="text-seccion font-bold">Cambio</span>
            <span className="text-cifra font-bold tabular-nums">{eurosConSimbolo(cambio)}</span>
          </div>
        ) : cambio === 0 ? (
          <p className="rounded-grande bg-superficie p-e4 text-texto-suave">Justo, sin cambio</p>
        ) : (
          <p className="rounded-grande bg-atencion-suave p-e4 font-bold text-atencion">
            Faltan {eurosConSimbolo(-cambio)}
          </p>
        )}
        <button
          type="button"
          disabled={ocupado || cambio < 0}
          onClick={() => void cobrar()}
          className="min-h-[3.75rem] rounded-grande bg-naranja text-pantalla font-bold text-sobre-naranja disabled:opacity-50"
        >
          {ocupado ? 'Cobrando…' : `Cobrar ${eurosConSimbolo(aCobrar)}`}
        </button>
        <p className="text-secundario text-texto-tenue">
          Sale el ticket y la impresora abre el cajón.
        </p>
      </div>
    </Marco>
  );
}

/** El PIN de quien cobra: el cobro queda a su nombre. */
function TuPin({
  pendiente,
  alTeclear,
}: {
  readonly pendiente: CobroPendienteEnLaMesa;
  readonly alTeclear: (pin: string) => Promise<ErrorDeLaApi | null>;
}) {
  const [pin, setPin] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  useEffect(() => {
    if (pin.length !== CIFRAS_DEL_PIN || ocupado) return;
    setOcupado(true);
    void alTeclear(pin).then((fallo) => {
      setOcupado(false);
      setPin('');
      setError(fallo);
    });
  }, [pin, ocupado, alTeclear]);

  const teclear = useCallback(
    (cifra: string) => {
      if (ocupado) return;
      setError(null);
      setPin((p) => (p.length >= CIFRAS_DEL_PIN ? p : `${p}${cifra}`));
    },
    [ocupado],
  );
  const borrar = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      const tecla = cifraDeLaTecla(evento);
      if (tecla === 'borrar') borrar();
      else if (tecla !== null) teclear(tecla);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [teclear, borrar]);

  return (
    <div className="flex flex-col items-center gap-e4">
      <div className="flex flex-col items-center gap-e1 text-center">
        <span className="text-pantalla font-bold">Cobrar efectivo · tu PIN</span>
        <span className="text-texto-suave">
          {eurosConSimbolo(pendiente.enEfectivo)} que dejó {pendiente.por}. El cobro queda a tu
          nombre.
        </span>
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}
      <Puntos tecleadas={pin.length} de={CIFRAS_DEL_PIN} />
      <div className="w-full max-w-[20rem]">
        <Teclado alTeclear={teclear} alBorrar={borrar} ocupado={ocupado} />
      </div>
    </div>
  );
}

function Marco({
  titulo,
  alVolver,
  children,
}: {
  readonly titulo: string;
  readonly alVolver: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-fondo text-texto">
      <header className="flex items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e3">
        <span className="min-w-0 flex-1 truncate text-seccion font-bold">
          {titulo === '' ? 'Cobrar efectivo' : `Cobrar efectivo · ${titulo}`}
        </span>
        <button
          type="button"
          onClick={alVolver}
          className="min-h-toque rounded-redondo border-2 border-borde px-e4 font-bold"
        >
          Volver
        </button>
      </header>
      <main className="mx-auto flex w-full max-w-[64rem] flex-col gap-e4 p-e4 md:p-e5">
        {children}
      </main>
    </div>
  );
}

/**
 * **Desde la pantalla del PIN** (0145): se tocó «Cobro pendiente · Mesa 4», se tecleó el PIN para entrar
 * y se llega aquí, a cobrarlo, sin pedir el PIN otra vez. Si mientras tanto lo cobró otro, se dice.
 */
export function CobroPendienteDesdeLaPuerta({
  id,
  conectado,
}: {
  readonly id: string;
  readonly conectado: boolean;
}) {
  const plano = usarElPlano(conectado);
  // **Lo encontrado se queda** mientras se cobra: al cobrarlo, la sala se refresca y el pendiente deja
  // de estar, y la pantalla del cambio no puede irse con él (como el cambio de la mesa, lección 268).
  const [encontrado, setEncontrado] = useState<{
    readonly pendiente: CobroPendienteEnLaMesa;
    readonly cuentaId: string;
    readonly titulo: string;
  } | null>(null);
  const cuentas =
    plano.data === undefined
      ? []
      : [
          ...plano.data.zonas.flatMap((z) =>
            z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta])),
          ),
          ...plano.data.sinMesa,
        ];
  const ahora = cuentas.flatMap((cuenta) =>
    (cuenta.pendientes ?? [])
      .filter((p) => p.id === id)
      .map((pendiente) => ({ pendiente, cuentaId: cuenta.cuentaId, titulo: cuenta.titulo })),
  )[0];
  if (encontrado === null && ahora !== undefined) setEncontrado(ahora);
  const elCobro = encontrado ?? ahora;
  if (elCobro !== undefined) {
    return (
      <CobrarElPendiente
        pendiente={elCobro.pendiente}
        cuentaId={elCobro.cuentaId}
        titulo={elCobro.titulo}
        conPin={false}
        alVolver={irAlPlano}
        alAcabar={irAlPlano}
      />
    );
  }
  if (plano.data === undefined) return <Cargando que="el cobro" />;
  return (
    <Marco titulo="" alVolver={irAlPlano}>
      <div className="flex flex-col items-start gap-e4">
        <h2 className="text-pantalla font-bold">Ese cobro ya no está pendiente</h2>
        <p className="text-texto-suave">Lo ha cobrado otra persona, o lo han quitado.</p>
        <button
          type="button"
          onClick={irAlPlano}
          className="min-h-toque-cocina rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja"
        >
          Volver a la sala
        </button>
      </div>
    </Marco>
  );
}
