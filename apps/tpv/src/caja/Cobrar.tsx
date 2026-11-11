import { useState, type ReactNode } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  NOMBRE_DE_LA_FORMA_DE_PAGO,
  laParte,
  lasPartesIguales,
  type FormaDePago,
  type UnPago,
} from '@estook/dominio';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { euros, eurosConSimbolo } from '../logica/texto.ts';
import { irA } from '../navegar.ts';
import type { CobroPendienteEnLaMesa, LaMesa, PlatoDeLaCuenta } from '../datos/tipos.ts';
import { AbrirCaja, ErrorDeLaCaja } from './AbrirCaja.tsx';
import { deEurosACentimos, enLaCasilla } from './dinero.ts';
import { idNuevo, usarLaCaja, usarRecargarLaCaja } from '../ganchos/usarLaCaja.ts';
import type { Cobrado, CobroDejadoEnLaCaja } from './tipos.ts';

/** Una caja abierta del local, para elegir en cuál va un cobro de la mesa (0145). */
interface UnaCajaAbierta {
  readonly turnoId: string;
  readonly nombre: string;
}

type Forma = FormaDePago | 'dividir';
type ComoSeDivide = 'iguales' | 'platos' | 'mixto';

/** Lo que cubre un cobro: lo que queda, una parte igual o unos platos. */
type LoQueSeCobra =
  | { readonly que: 'toda' }
  | { readonly que: 'parte'; readonly parte: number; readonly de: number }
  | { readonly que: 'platos'; readonly lineas: readonly string[] };

/**
 * **Los billetes que cubren un importe** (Anexo 10.5): el justo y los siguientes redondos, para
 * cobrar en efectivo sin teclear. 48,50 € → 50, 60 y 100.
 */
export function losBilletesQueLoCubren(importe: number): number[] {
  const redondos = [500, 1000, 2000, 5000, 10000, 20000, 50000];
  const candidatos = new Set<number>();
  for (const paso of [500, 1000, 2000]) {
    const arriba = Math.ceil(importe / paso) * paso;
    if (arriba > importe) candidatos.add(arriba);
  }
  for (const r of redondos) if (r > importe) candidatos.add(r);
  return [...candidatos].sort((a, b) => a - b).slice(0, 3);
}

/**
 * **Cobrar** (Anexo 10.5; maqueta del 9-nov, tramo 2): el total en grande; **efectivo** con billetes
 * de un toque y el cambio a la vista; **tarjeta** en el datáfono de siempre; **Bizum y cheque** si el
 * local los enciende; y **dividir**: a partes iguales, por platos, o efectivo y tarjeta. Cada cobro, su
 * ticket, que sale solo; con efectivo o cheque, el cajón se abre. **Sin caja abierta no se cobra**: se
 * abre ahí mismo.
 *
 * **En la mesa, con el comandero** (0145; Richi, 10-nov): tarjeta (el datáfono de siempre), Bizum y
 * cheque se cobran aquí mismo. **El efectivo se deja para la caja**, a nombre de quien lo deja: allí
 * sale «Cobro pendiente · Mesa 4» y se cobra con un PIN, que es donde está el cajón. Dividido igual:
 * lo que es de tarjeta se cobra ya, y el efectivo va a la caja en el mismo ticket.
 */
export function Cobrar({
  mesa,
  sinMandarAqui,
  pendientes = [],
  alCobrarElPendiente,
  alVolver,
  alAcabar,
}: {
  readonly mesa: LaMesa | undefined;
  /** Lo pedido en esta tablet que no ha salido de ella: hay que mandarlo antes. */
  readonly sinMandarAqui: number;
  /** El efectivo de esta mesa que espera en la caja (0145). */
  readonly pendientes?: readonly CobroPendienteEnLaMesa[];
  /** En la caja: cobrar ese efectivo, con el PIN de quien cobra. */
  readonly alCobrarElPendiente?: (pendiente: CobroPendienteEnLaMesa) => void;
  readonly alVolver: () => void;
  /** La mesa ha quedado libre. */
  readonly alAcabar: () => void;
}) {
  const { cliente } = usarSesion();
  const caja = usarLaCaja();
  const recargar = usarRecargarLaCaja();
  const [forma, setForma] = useState<Forma>('efectivo');
  const [divide, setDivide] = useState<ComoSeDivide>('iguales');
  const [partes, setPartes] = useState(2);
  const [entregado, setEntregado] = useState<number | 'justo' | 'otro'>('justo');
  const [otro, setOtro] = useState('');
  const [enEfectivo, setEnEfectivo] = useState('20,00');
  const [enCheques, setEnCheques] = useState('');
  const [restoCon, setRestoCon] = useState<'efectivo' | 'tarjeta' | null>(null);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const [cobroId, setCobroId] = useState(idNuevo);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<Cobrado | null>(null);
  const [dejado, setDejado] = useState<CobroDejadoEnLaCaja | null>(null);
  const [abriendoLaCaja, setAbriendoLaCaja] = useState(false);
  /** Con más de una caja abierta, en cuál va lo que se cobra en la mesa. */
  const [turnoElegido, setTurnoElegido] = useState<string | undefined>(undefined);
  const [elegirCaja, setElegirCaja] = useState<{
    readonly cajas: readonly UnaCajaAbierta[];
    readonly reintentar: (turnoId: string) => void;
  } | null>(null);

  if (mesa === undefined || caja.isLoading || caja.data === undefined) {
    return caja.error === null ? <Cargando que="la cuenta" /> : <ErrorDeLaCaja />;
  }
  const c = caja.data;
  /** **Sin cajón** (el comandero): se cobra lo que no es efectivo; el efectivo va a la caja. */
  const enLaMesa = c.cajon === null;

  // ── Antes de cobrar ──────────────────────────────────────────────────────────────
  if (!enLaMesa && (c.abierta === null || abriendoLaCaja)) {
    return (
      <Marco titulo={mesa.titulo} alVolver={alVolver}>
        {!abriendoLaCaja ? (
          <div className="flex flex-col items-start gap-e4">
            <p className="text-pantalla font-bold">Abre la caja para cobrar</p>
            <p className="text-texto-suave">
              Pedir y mandar a cocina siguen igual. Se abre aquí mismo, con lo que se quedó anoche.
            </p>
            <button
              type="button"
              onClick={() => {
                setAbriendoLaCaja(true);
              }}
              className="min-h-toque-cocina rounded-grande bg-bien px-e6 text-seccion font-bold text-fondo"
            >
              Abrir caja
            </button>
          </div>
        ) : (
          <AbrirCaja
            alAbrir={() => {
              setAbriendoLaCaja(false);
            }}
            alVolver={() => {
              setAbriendoLaCaja(false);
            }}
          />
        )}
      </Marco>
    );
  }
  if (sinMandarAqui > 0) {
    return (
      <Marco titulo={mesa.titulo} alVolver={alVolver}>
        <p className="text-pantalla font-bold">Hay algo sin mandar en este aparato</p>
        <p className="text-texto-suave">
          Mándalo o quítalo antes de cobrar: lo que no está en la cuenta no se cobra.
        </p>
      </Marco>
    );
  }

  // ── Lo que hay que cobrar ────────────────────────────────────────────────────────
  const total = mesa.totalCentimos;
  const cobrado = mesa.cobrado ?? { importe: 0, lineas: [], partes: null };
  const queda = total - cobrado.importe;
  const pagadas = new Set(cobrado.lineas);
  const vivas = mesa.platos.filter((p) => p.estado !== 'quitado');
  const deArriba = vivas.filter((p) => p.parteDe === null);
  const deUnMenu = (p: PlatoDeLaCuenta) => vivas.filter((h) => h.parteDe === p.id);
  const importeDe = (p: PlatoDeLaCuenta) =>
    [p, ...deUnMenu(p)].reduce((s, l) => s + l.precioCentimos * l.cantidad, 0);
  const aPartes = cobrado.partes;
  const yaPorPlatos = cobrado.lineas.length > 0;
  const de = aPartes?.de ?? partes;

  // Lo que se divide manda: ya empezado a partes, sigue a partes; por platos, por platos.
  const forzado: ComoSeDivide | null = aPartes !== null ? 'iguales' : yaPorPlatos ? 'platos' : null;
  const formaVista: Forma = forzado !== null ? 'dividir' : forma;
  const divideVisto: ComoSeDivide = forzado ?? divide;

  const marcado = deArriba.filter((p) => marcadas.has(p.id)).reduce((s, p) => s + importeDe(p), 0);

  async function cobrar(
    lo: LoQueSeCobra,
    importe: number,
    pagos: readonly UnPago[],
    turnoId: string | undefined = turnoElegido,
  ) {
    setOcupado(true);
    setFallo(null);
    const queCubre = {
      cuenta_id: mesa?.cuentaId,
      que: lo.que,
      ...(lo.que === 'parte' ? { parte: lo.parte, de: lo.de } : {}),
      ...(lo.que === 'platos' ? { lineas: lo.lineas } : {}),
      importe,
    };
    // **En la mesa, el efectivo va a la caja** (0145): lo demás que se paga a la vez (la tarjeta de un
    // pago mixto, los cheques) ya se ha cobrado aquí, y va en el mismo ticket.
    if (enLaMesa && pagos.some((p) => p.forma === 'efectivo')) {
      const dejar = await cliente.ejecutar<CobroDejadoEnLaCaja>('dejar_el_cobro_en_la_caja', {
        pendiente_id: cobroId,
        ...queCubre,
        ya_pagado: pagos
          .filter((p) => p.forma !== 'efectivo')
          .map((p) => ({ forma: p.forma, importe: p.importe })),
      });
      setOcupado(false);
      if (dejar.ok) {
        setDejado(dejar.datos);
        setCobroId(idNuevo());
        setMarcadas(new Set());
        await recargar();
      } else {
        if (dejar.error.codigo !== 'sin_conexion') setCobroId(idNuevo());
        setFallo(dejar.error);
      }
      return;
    }
    const respuesta = await cliente.ejecutar<Cobrado>('cobrar', {
      cobro_id: cobroId,
      ...queCubre,
      pagos,
      ...(enLaMesa && turnoId !== undefined ? { turno_id: turnoId } : {}),
    });
    setOcupado(false);
    if (respuesta.ok) {
      setHecho(respuesta.datos);
      setCobroId(idNuevo());
      setMarcadas(new Set());
      await recargar();
      return;
    }
    // Con más de una caja abierta, se elige en cuál va, y se cobra con el mismo id.
    const cajas = respuesta.error.detalle?.['cajas'];
    if (enLaMesa && Array.isArray(cajas)) {
      setElegirCaja({
        cajas: cajas as UnaCajaAbierta[],
        reintentar: (elegido) => {
          setTurnoElegido(elegido);
          setElegirCaja(null);
          void cobrar(lo, importe, pagos, elegido);
        },
      });
      return;
    }
    // Sin conexión, el mismo cobro se repite con el mismo id: no cobra dos veces. Lo demás, otro.
    if (respuesta.error.codigo !== 'sin_conexion') setCobroId(idNuevo());
    setFallo(respuesta.error);
  }

  async function quitarElPendiente(pendiente: CobroPendienteEnLaMesa) {
    setFallo(null);
    const r = await cliente.ejecutar('quitar_el_cobro_pendiente', { pendiente_id: pendiente.id });
    if (r.ok) await recargar();
    else setFallo(r.error);
  }

  // ── Dejado para la caja ──────────────────────────────────────────────────────────
  if (dejado !== null) {
    return (
      <Marco titulo={mesa.titulo} alVolver={alVolver}>
        <div className="flex max-w-[36rem] flex-col items-start gap-e4">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-redondo bg-bien text-cifra-media text-fondo"
          >
            ✓
          </span>
          <h2 className="text-pantalla font-bold">
            {eurosConSimbolo(dejado.enEfectivo)} en efectivo, para la caja
          </h2>
          <p className="text-texto-suave">
            Lleva el dinero a la caja: allí sale «Cobro pendiente · {mesa.titulo}». Se cobra con el
            PIN de quien cobra, sale el ticket y el cajón se abre para el cambio.
          </p>
          <button
            type="button"
            onClick={() => {
              setDejado(null);
              alVolver();
            }}
            className="min-h-toque-cocina w-full rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja"
          >
            Listo
          </button>
        </div>
      </Marco>
    );
  }

  // ── En qué caja va, si hay más de una abierta ────────────────────────────────────
  if (elegirCaja !== null) {
    return (
      <Marco
        titulo={mesa.titulo}
        alVolver={() => {
          setElegirCaja(null);
        }}
      >
        <div className="flex max-w-[30rem] flex-col gap-e3">
          <h2 className="text-pantalla font-bold">¿En qué caja va?</h2>
          <p className="text-texto-suave">
            Hay más de una caja abierta. Se queda elegida para los demás cobros.
          </p>
          {elegirCaja.cajas.map((cj) => (
            <button
              key={cj.turnoId}
              type="button"
              onClick={() => {
                elegirCaja.reintentar(cj.turnoId);
              }}
              className="min-h-toque-cocina rounded-grande border-2 border-borde text-seccion font-bold"
            >
              {cj.nombre}
            </button>
          ))}
        </div>
      </Marco>
    );
  }

  // ── Cobrado ──────────────────────────────────────────────────────────────────────
  if (hecho !== null) {
    return (
      <Marco titulo={mesa.titulo} alVolver={hecho.liberada ? alAcabar : alVolver}>
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
            <b className="tabular-nums text-texto">{hecho.numero}</b> sale por la impresora en
            cuanto lo tiene Hacienda.
          </p>
          {!hecho.liberada && (
            <p className="rounded-grande bg-info-suave p-e3 font-bold text-info">
              Queda por cobrar {eurosConSimbolo(hecho.queda)}.
            </p>
          )}
          <div className="grid w-full grid-cols-1 gap-e3 sm:grid-cols-[1fr_2fr]">
            <button
              type="button"
              onClick={() => {
                irA('facturas');
              }}
              className="min-h-toque-cocina rounded-grande border-2 border-borde font-bold"
            >
              Factura
            </button>
            <button
              type="button"
              onClick={() => {
                setHecho(null);
                setEntregado('justo');
                if (hecho.liberada) alAcabar();
              }}
              className="min-h-toque-cocina rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja"
            >
              {hecho.liberada ? 'Listo · la mesa queda libre' : 'Seguir cobrando'}
            </button>
          </div>
        </div>
      </Marco>
    );
  }

  // ── Cobrar ───────────────────────────────────────────────────────────────────────
  const formas: readonly Forma[] = [...c.formas, 'dividir'];
  const entregadoAhora =
    entregado === 'justo'
      ? queda
      : entregado === 'otro'
        ? (deEurosACentimos(otro) ?? 0)
        : entregado;
  const cambio = entregadoAhora - queda;
  const cheques = Math.min(queda, deEurosACentimos(enCheques) ?? 0);
  const efectivoMixto = Math.max(0, Math.min(queda, deEurosACentimos(enEfectivo) ?? 0));

  return (
    <Marco titulo={mesa.titulo} alVolver={alVolver}>
      {pendientes.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-e3 rounded-grande bg-atencion-suave p-e4"
        >
          <span className="font-bold text-atencion">
            {enLaMesa ? 'Pendiente en la caja' : 'Efectivo pendiente'} ·{' '}
            <span className="tabular-nums">{eurosConSimbolo(p.enEfectivo)}</span> · de {p.por}
          </span>
          {enLaMesa ? (
            <button
              type="button"
              onClick={() => void quitarElPendiente(p)}
              className="min-h-toque rounded-redondo border-2 border-borde px-e4 font-bold"
            >
              Quitar
            </button>
          ) : (
            alCobrarElPendiente !== undefined && (
              <button
                type="button"
                onClick={() => {
                  alCobrarElPendiente(p);
                }}
                className="min-h-toque rounded-redondo bg-bien px-e5 font-bold text-fondo"
              >
                Cobrar efectivo · {p.por}
              </button>
            )
          )}
        </div>
      ))}
      <div className="grid gap-e5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* La cuenta: por platos, se tocan los que paga. */}
        <section
          className="flex flex-col gap-e1 rounded-grande bg-superficie p-e4"
          aria-label="La cuenta"
        >
          <span className="text-secundario font-bold text-texto-tenue">
            {formaVista === 'dividir' && divideVisto === 'platos'
              ? 'Toca lo que paga'
              : 'La cuenta'}
          </span>
          {deArriba.map((p) => {
            const pagada = pagadas.has(p.id);
            const porPlatos = formaVista === 'dividir' && divideVisto === 'platos' && !pagada;
            const marcada = marcadas.has(p.id);
            const linea = (
              <>
                <span className="w-8 shrink-0 font-bold text-texto-tenue">{p.cantidad}×</span>
                <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                <span className="font-bold tabular-nums">{euros(importeDe(p))}</span>
              </>
            );
            return porPlatos ? (
              <button
                key={p.id}
                type="button"
                aria-pressed={marcada}
                onClick={() => {
                  setMarcadas((antes) => {
                    const nuevo = new Set(antes);
                    if (nuevo.has(p.id)) nuevo.delete(p.id);
                    else nuevo.add(p.id);
                    return nuevo;
                  });
                }}
                className={`flex min-h-toque items-center gap-e2 rounded-grande border-2 px-e2 text-left ${
                  marcada ? 'border-naranja bg-naranja-suave' : 'border-transparent'
                }`}
              >
                {linea}
              </button>
            ) : (
              <div
                key={p.id}
                className={`flex min-h-toque items-center gap-e2 px-e2 ${pagada ? 'text-texto-tenue line-through' : ''}`}
              >
                {linea}
              </div>
            );
          })}
          <div className="mt-e2 flex items-baseline justify-between border-t border-borde px-e2 pt-e2">
            <span className="font-bold">Total</span>
            <span className="text-cifra-larga font-bold tabular-nums">
              {eurosConSimbolo(total)}
            </span>
          </div>
          {cobrado.importe > 0 && (
            <div className="flex items-baseline justify-between px-e2 text-texto-suave">
              <span>Ya cobrado</span>
              <span className="tabular-nums">{eurosConSimbolo(cobrado.importe)}</span>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-e4" aria-label="Cobrar">
          <div className="flex flex-wrap items-baseline justify-between gap-e3">
            <span className="font-bold text-texto-suave">A cobrar</span>
            <span className="text-[2.5rem] font-bold leading-none tabular-nums">
              {eurosConSimbolo(queda)}
            </span>
          </div>

          <div
            className="grid gap-e2"
            style={{
              gridTemplateColumns: `repeat(${String(Math.min(formas.length, 5))}, minmax(0, 1fr))`,
            }}
            role="group"
            aria-label="Cómo paga"
          >
            {formas.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={formaVista === f}
                disabled={forzado !== null && f !== 'dividir'}
                onClick={() => {
                  setForma(f);
                  setFallo(null);
                }}
                className={`min-h-[4rem] rounded-grande border-2 font-bold disabled:opacity-40 ${
                  formaVista === f
                    ? 'border-naranja bg-naranja-suave'
                    : 'border-borde bg-superficie'
                }`}
              >
                {f === 'dividir' ? 'Dividir' : NOMBRE_DE_LA_FORMA_DE_PAGO[f]}
              </button>
            ))}
          </div>

          {fallo !== null && <ErrorEnCristiano error={fallo} />}

          {formaVista === 'efectivo' && enLaMesa && (
            <>
              <div className="flex flex-col items-center gap-e1 rounded-grande border border-borde bg-superficie p-e5 text-center">
                <span className="text-texto-suave">El efectivo se cobra en la caja</span>
                <span className="text-cifra font-bold tabular-nums">{eurosConSimbolo(queda)}</span>
                <span className="text-secundario text-texto-tenue">
                  Allí sale a tu nombre, se cobra con un PIN y el cajón se abre para el cambio.
                </span>
              </div>
              <BotonDeCobrar
                ocupado={ocupado}
                apagado={queda <= 0}
                texto={`Dejar ${eurosConSimbolo(queda)} para la caja`}
                alTocar={() =>
                  void cobrar({ que: 'toda' }, queda, [
                    { forma: 'efectivo', importe: queda, entregado: queda },
                  ])
                }
              />
            </>
          )}

          {formaVista === 'efectivo' && !enLaMesa && (
            <>
              <span className="text-secundario font-bold text-texto-suave">Te da</span>
              <div
                className="grid grid-cols-3 gap-e2 sm:grid-cols-5"
                role="group"
                aria-label="Lo que te da"
              >
                {(['justo', ...losBilletesQueLoCubren(queda), 'otro'] as const).map((b) => (
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
                    {b === 'justo'
                      ? 'Justo'
                      : b === 'otro'
                        ? 'Otro'
                        : `${euros(b).replace(',00', '')} €`}
                  </button>
                ))}
              </div>
              {entregado === 'otro' && (
                <CasillaDeEuros etiqueta="Te da" valor={otro} alCambiar={setOtro} />
              )}
              {cambio > 0 ? (
                <div className="flex items-center justify-between rounded-grande bg-bien-suave p-e4 text-bien">
                  <span className="text-seccion font-bold">Cambio</span>
                  <span className="text-cifra font-bold tabular-nums">
                    {eurosConSimbolo(cambio)}
                  </span>
                </div>
              ) : cambio === 0 ? (
                <p className="rounded-grande bg-superficie p-e4 text-texto-suave">
                  Justo, sin cambio
                </p>
              ) : (
                <p className="rounded-grande bg-atencion-suave p-e4 font-bold text-atencion">
                  Faltan {eurosConSimbolo(-cambio)}
                </p>
              )}
              <BotonDeCobrar
                ocupado={ocupado}
                apagado={cambio < 0 || queda <= 0}
                texto={`Cobrar ${eurosConSimbolo(queda)}`}
                alTocar={() =>
                  void cobrar({ que: 'toda' }, queda, [
                    { forma: 'efectivo', importe: queda, entregado: entregadoAhora },
                  ])
                }
              />
            </>
          )}

          {formaVista === 'tarjeta' && (
            <>
              <div className="flex flex-col items-center gap-e1 rounded-grande border border-borde bg-superficie p-e5 text-center">
                <span className="text-texto-suave">Cóbralo en el datáfono</span>
                <span className="text-cifra font-bold tabular-nums">{eurosConSimbolo(queda)}</span>
                <span className="text-secundario text-texto-tenue">Cuando salga «aprobada»:</span>
              </div>
              <BotonDeCobrar
                ocupado={ocupado}
                apagado={queda <= 0}
                texto="Cobrado con tarjeta"
                alTocar={() =>
                  void cobrar({ que: 'toda' }, queda, [{ forma: 'tarjeta', importe: queda }])
                }
              />
              <button
                type="button"
                onClick={() => {
                  setForma('efectivo');
                }}
                className="min-h-toque rounded-grande border-2 border-borde font-bold"
              >
                No ha pasado
              </button>
              <p className="text-secundario text-texto-tenue">
                Si se marca cobrado lo que no pasó, sale al cerrar la caja, en el cuadre del
                datáfono.
              </p>
            </>
          )}

          {formaVista === 'bizum' && (
            <>
              <div className="flex flex-col items-center gap-e1 rounded-grande border border-borde bg-superficie p-e5 text-center">
                <span className="text-texto-suave">
                  Que te enseñe el Bizum enviado al móvil del local
                </span>
                <span className="text-cifra font-bold tabular-nums">{eurosConSimbolo(queda)}</span>
              </div>
              <BotonDeCobrar
                ocupado={ocupado}
                apagado={queda <= 0}
                texto="Recibido por Bizum"
                alTocar={() =>
                  void cobrar({ que: 'toda' }, queda, [{ forma: 'bizum', importe: queda }])
                }
              />
            </>
          )}

          {formaVista === 'cheque' && (
            <>
              <CasillaDeEuros etiqueta="En cheques" valor={enCheques} alCambiar={setEnCheques} />
              {cheques > 0 && cheques < queda && (
                <div className="flex flex-wrap items-center justify-between gap-e2 rounded-grande bg-superficie p-e3">
                  <span className="font-bold">
                    El resto, {eurosConSimbolo(queda - cheques)}, con
                  </span>
                  <span className="flex gap-e2">
                    {(['efectivo', 'tarjeta'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={restoCon === f}
                        onClick={() => {
                          setRestoCon(f);
                        }}
                        className={`min-h-toque rounded-redondo border-2 px-e4 font-bold ${
                          restoCon === f ? 'border-naranja bg-naranja-suave' : 'border-borde'
                        }`}
                      >
                        {NOMBRE_DE_LA_FORMA_DE_PAGO[f]}
                      </button>
                    ))}
                  </span>
                </div>
              )}
              <BotonDeCobrar
                ocupado={ocupado}
                apagado={cheques <= 0 || (cheques < queda && restoCon === null)}
                texto={`Cobrar ${eurosConSimbolo(queda)}`}
                alTocar={() =>
                  void cobrar({ que: 'toda' }, queda, [
                    { forma: 'cheque', importe: cheques },
                    ...(cheques < queda && restoCon !== null
                      ? [
                          restoCon === 'efectivo'
                            ? {
                                forma: 'efectivo' as const,
                                importe: queda - cheques,
                                entregado: queda - cheques,
                              }
                            : { forma: 'tarjeta' as const, importe: queda - cheques },
                        ]
                      : []),
                  ])
                }
              />
              <p className="text-secundario text-texto-tenue">
                Los cheques no dan cambio. Van al cajón y al cerrar se cuentan aparte.
              </p>
            </>
          )}

          {formaVista === 'dividir' && (
            <>
              <div className="flex flex-wrap gap-e2" role="group" aria-label="Cómo se divide">
                {(
                  [
                    ['iguales', 'A partes iguales'],
                    ['platos', 'Por platos'],
                    ['mixto', 'Efectivo y tarjeta'],
                  ] as const
                ).map(([d, nombre]) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={divideVisto === d}
                    disabled={forzado !== null && forzado !== d}
                    onClick={() => {
                      setDivide(d);
                    }}
                    className={`min-h-toque rounded-redondo border-2 px-e4 font-bold disabled:opacity-40 ${
                      divideVisto === d ? 'border-naranja bg-naranja-suave' : 'border-borde'
                    }`}
                  >
                    {nombre}
                  </button>
                ))}
              </div>

              {divideVisto === 'iguales' && (
                <>
                  <div className="flex items-center justify-between gap-e3">
                    <span className="font-bold text-texto-suave">Entre</span>
                    <span className="flex items-center gap-e2">
                      <button
                        type="button"
                        aria-label="Una parte menos"
                        disabled={aPartes !== null || de <= 2}
                        onClick={() => {
                          setPartes((p) => Math.max(2, p - 1));
                        }}
                        className="size-11 rounded-grande bg-charcoal text-seccion font-bold disabled:opacity-40"
                      >
                        −
                      </button>
                      <b className="min-w-[2ch] text-center text-cifra-larga tabular-nums">{de}</b>
                      <button
                        type="button"
                        aria-label="Una parte más"
                        disabled={aPartes !== null || de >= 20}
                        onClick={() => {
                          setPartes((p) => Math.min(20, p + 1));
                        }}
                        className="size-11 rounded-grande bg-charcoal text-seccion font-bold disabled:opacity-40"
                      >
                        +
                      </button>
                    </span>
                  </div>
                  <ul className="flex flex-col gap-e2">
                    {lasPartesIguales(total, de).map((_, i) => {
                      const parte = i + 1;
                      const pagada = aPartes?.pagadas.includes(parte) === true;
                      const ultima = (aPartes?.pagadas.length ?? 0) === de - 1 && !pagada;
                      const importe = ultima ? queda : laParte(total, parte, de);
                      return (
                        <li
                          key={parte}
                          className={`flex flex-wrap items-center justify-between gap-e2 rounded-grande border border-borde bg-superficie p-e3 ${pagada ? 'opacity-60' : ''}`}
                        >
                          <span className="font-bold">
                            Parte {parte} ·{' '}
                            <span className="tabular-nums">{eurosConSimbolo(importe)}</span>
                          </span>
                          {pagada ? (
                            <span className="rounded-redondo bg-bien-suave px-e3 py-e1 font-bold text-bien">
                              ✓ Cobrada
                            </span>
                          ) : (
                            <span className="flex gap-e2">
                              {c.formas.map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  disabled={ocupado}
                                  onClick={() =>
                                    void cobrar({ que: 'parte', parte, de }, importe, [
                                      f === 'efectivo'
                                        ? { forma: f, importe, entregado: importe }
                                        : { forma: f, importe },
                                    ])
                                  }
                                  className="min-h-toque min-w-[6rem] rounded-redondo bg-charcoal px-e3 font-bold"
                                >
                                  {enLaMesa && f === 'efectivo'
                                    ? 'Efectivo · caja'
                                    : NOMBRE_DE_LA_FORMA_DE_PAGO[f]}
                                </button>
                              ))}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-secundario text-texto-tenue">
                    Cada parte, su ticket. La mesa queda libre con la última. Los céntimos que
                    sobran, a las primeras.
                  </p>
                </>
              )}

              {divideVisto === 'platos' && (
                <>
                  <div className="flex items-center justify-between rounded-grande bg-superficie p-e3">
                    <span className="text-texto-suave">Marcado</span>
                    <b className="tabular-nums">{eurosConSimbolo(marcado)}</b>
                  </div>
                  <div className="grid grid-cols-2 gap-e2">
                    {c.formas.map((f) => (
                      <button
                        key={f}
                        type="button"
                        disabled={ocupado || marcado === 0}
                        onClick={() =>
                          void cobrar(
                            {
                              que: 'platos',
                              lineas: deArriba.filter((p) => marcadas.has(p.id)).map((p) => p.id),
                            },
                            marcado,
                            [
                              f === 'efectivo'
                                ? { forma: f, importe: marcado, entregado: marcado }
                                : { forma: f, importe: marcado },
                            ],
                          )
                        }
                        className="min-h-toque-cocina rounded-grande bg-charcoal font-bold disabled:opacity-40"
                      >
                        {enLaMesa && f === 'efectivo'
                          ? 'Efectivo · caja'
                          : NOMBRE_DE_LA_FORMA_DE_PAGO[f]}{' '}
                        {eurosConSimbolo(marcado)}
                      </button>
                    ))}
                  </div>
                  <p className="text-secundario text-texto-tenue">
                    Toca los platos de la cuenta. Cada cobro, su ticket con lo que paga esa persona.
                  </p>
                </>
              )}

              {divideVisto === 'mixto' && (
                <>
                  <CasillaDeEuros
                    etiqueta="En efectivo"
                    valor={enEfectivo}
                    alCambiar={setEnEfectivo}
                  />
                  <div className="grid grid-cols-4 gap-e2">
                    {[1000, 2000, 3000, 4000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={efectivoMixto === v}
                        disabled={v >= queda}
                        onClick={() => {
                          setEnEfectivo(enLaCasilla(v));
                        }}
                        className={`min-h-toque-cocina rounded-grande border-2 font-bold disabled:opacity-40 ${
                          efectivoMixto === v ? 'border-naranja bg-naranja-suave' : 'border-borde'
                        }`}
                      >
                        {v / 100} €
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-e1 rounded-grande border border-borde bg-superficie p-e3">
                    <div className="flex justify-between">
                      <span className="text-texto-suave">Efectivo</span>
                      <b className="tabular-nums">{eurosConSimbolo(efectivoMixto)}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-texto-suave">Con tarjeta, el resto</span>
                      <b className="tabular-nums">{eurosConSimbolo(queda - efectivoMixto)}</b>
                    </div>
                  </div>
                  <BotonDeCobrar
                    ocupado={ocupado}
                    apagado={efectivoMixto <= 0 || efectivoMixto >= queda}
                    texto={
                      enLaMesa
                        ? `Tarjeta cobrada · ${eurosConSimbolo(efectivoMixto)} para la caja`
                        : `Cobrar ${eurosConSimbolo(queda)} · un ticket`
                    }
                    alTocar={() =>
                      void cobrar({ que: 'toda' }, queda, [
                        { forma: 'efectivo', importe: efectivoMixto, entregado: efectivoMixto },
                        { forma: 'tarjeta', importe: queda - efectivoMixto },
                      ])
                    }
                  />
                </>
              )}
            </>
          )}
        </section>
      </div>
    </Marco>
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
        <span className="min-w-0 flex-1 truncate text-seccion font-bold">Cobrar · {titulo}</span>
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

function BotonDeCobrar({
  texto,
  ocupado,
  apagado,
  alTocar,
}: {
  readonly texto: string;
  readonly ocupado: boolean;
  readonly apagado: boolean;
  readonly alTocar: () => void;
}) {
  return (
    <button
      type="button"
      disabled={ocupado || apagado}
      onClick={alTocar}
      className="min-h-[3.75rem] rounded-grande bg-naranja text-pantalla font-bold text-sobre-naranja disabled:opacity-50"
    >
      {ocupado ? 'Cobrando…' : texto}
    </button>
  );
}

function CasillaDeEuros({
  etiqueta,
  valor,
  alCambiar,
}: {
  readonly etiqueta: string;
  readonly valor: string;
  readonly alCambiar: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-e3 rounded-grande border-2 border-borde bg-fondo px-e4 py-e2 focus-within:border-naranja">
      <span className="text-texto-suave">{etiqueta}</span>
      <input
        inputMode="decimal"
        value={valor}
        placeholder="0,00"
        onFocus={(e) => {
          e.currentTarget.select();
        }}
        onChange={(e) => {
          alCambiar(e.currentTarget.value);
        }}
        className="w-[9ch] bg-transparent text-right text-cifra-larga font-bold tabular-nums outline-none"
      />
    </label>
  );
}
