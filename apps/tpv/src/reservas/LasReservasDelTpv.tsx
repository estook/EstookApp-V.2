import { useState } from 'react';
import { Aviso, Boton, ErrorEnCristiano, Hoja, fondoDegradado } from '@estook/ui';
import { IconoAnadir, IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { usarAcciones, usarAlSegundo, usarElPlano } from '../ganchos/usarLaSala.ts';
import { usarLasReservas } from '../ganchos/usarLasReservas.ts';
import { irALaMesa } from '../navegar.ts';
import type { MesaDelPlano, UnaReserva } from '../datos/tipos.ts';
import { NuevaReserva } from './NuevaReserva.tsx';
import { cuantoFalta, laReservaDeLaMesa, minutosHasta, susMesas } from './logica.ts';

/**
 * **«Reservas» en Estook TPV** (la Ampliación 5 · 1, 0153; maqueta, «Reservas en el TPV, a la derecha de
 * Tickets»): la noche de un vistazo —quién viene, a qué hora, cuántos y en qué mesa— y, en la tablet y la
 * caja, las mesas con lo reservado. **«Sentar»** abre la mesa con los comensales de la reserva y la une a
 * ella; **«+ Reserva»**, una nueva en cuatro toques. Al segundo en todos los aparatos, como la sala.
 */

function masDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

function elDiaEnLetra(fecha: string, hoy: string): string {
  const texto = new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const dicho = `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
  if (fecha === hoy) return `Hoy, ${texto}`;
  if (fecha === masDias(hoy, 1)) return `Mañana, ${texto}`;
  return dicho;
}

export function LasReservasDelTpv() {
  const [dia, setDia] = useState<string | undefined>(undefined);
  const lo = usarLasReservas(dia);
  const plano = usarElPlano(usarAlSegundo());
  const ejecutar = usarAcciones();
  const [nueva, setNueva] = useState<UnaReserva | 'nueva' | null>(null);
  const [abierta, setAbierta] = useState<UnaReserva | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);

  const datos = lo.data;
  const ahora = Date.now();
  const hoy = datos?.hoy ?? '';
  const elDia = datos?.dia ?? hoy;
  const mesasDelPlano: readonly MesaDelPlano[] = (plano.data?.zonas ?? []).flatMap((z) => z.mesas);
  const ocupada = (r: UnaReserva) =>
    r.mesas.some((m) => mesasDelPlano.find((p) => p.id === m.id)?.cuenta != null);

  async function sentar(r: UnaReserva) {
    const mesa = r.mesas[0];
    if (mesa === undefined) return;
    setHaciendo(r.id);
    setFallo(null);
    const cuentaId = crypto.randomUUID();
    // Como abrir una mesa en el plano: **también sin internet**, que sube al volver (T5 · 2 · 1).
    const hecho = await ejecutar<{ cuentaId: string }>(
      'abrir_mesa',
      { cuenta_id: cuentaId, mesa_id: mesa.id, reserva_id: r.id },
      cuentaId,
      { que: `Mesa ${mesa.nombre} · ${r.nombre}`, cuentaId, respuesta: { cuentaId } },
    );
    setHaciendo(null);
    if (hecho.ok) {
      irALaMesa(hecho.datos.cuentaId);
      return;
    }
    setFallo(hecho.error);
  }

  async function cancelar(r: UnaReserva, noVino: boolean) {
    setHaciendo(r.id);
    setFallo(null);
    const hecho = await ejecutar('cancelar_reserva', {
      reserva_id: r.id,
      ...(noVino ? { no_vino: true } : {}),
    });
    setHaciendo(null);
    setAbierta(null);
    if (!hecho.ok) {
      setFallo(hecho.error);
      return;
    }
    setNoticia(
      noVino
        ? `${r.nombre}: no han venido, la mesa queda libre`
        : `Reserva de ${r.nombre}, cancelada`,
    );
  }

  const reservas = datos?.reservas ?? [];
  const vivas = reservas.filter((r) => r.estado === 'reservada' || r.estado === 'sentada');
  const comensales = vivas.reduce((suma, r) => suma + r.comensales, 0);

  const laLista = (
    <section className="flex min-h-0 flex-1 flex-col gap-e3" aria-label="Las reservas del día">
      <header className="flex flex-wrap items-center gap-e2">
        <button
          type="button"
          aria-label="El día de antes"
          disabled={elDia <= hoy}
          onClick={() => {
            setDia(masDias(elDia, -1));
          }}
          className="grid size-toque place-items-center rounded-full border border-borde bg-fondo disabled:opacity-35"
        >
          <IconoFlechaIzquierda size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-seccion font-bold">{elDiaEnLetra(elDia, hoy)}</h2>
          <p className="text-secundario text-texto-suave">
            {comensales} {comensales === 1 ? 'comensal' : 'comensales'} · {vivas.length}{' '}
            {vivas.length === 1 ? 'reserva' : 'reservas'}
          </p>
        </div>
        <button
          type="button"
          aria-label="El día siguiente"
          onClick={() => {
            setDia(masDias(elDia, 1));
          }}
          className="grid size-toque place-items-center rounded-full border border-borde bg-fondo"
        >
          <IconoFlechaDerecha size={18} />
        </button>
        {elDia !== hoy && (
          <Boton
            tono="secundario"
            tamano="s"
            onClick={() => {
              setDia(undefined);
            }}
          >
            Hoy
          </Boton>
        )}
      </header>

      {noticia !== null && (
        <Aviso
          tono="bien"
          titulo={noticia}
          esNoticia
          alCerrar={() => {
            setNoticia(null);
          }}
        />
      )}
      {fallo !== null && <ErrorEnCristiano error={fallo} />}

      <ul className="flex min-h-0 flex-1 flex-col gap-e2 overflow-y-auto">
        {reservas.length === 0 ? (
          <li className="rounded-mayor border border-dashed border-borde p-e5 text-center text-secundario text-texto-suave">
            Nada reservado este día. Con «+ Reserva» apuntas una en cuatro toques.
          </li>
        ) : (
          reservas.map((r) => {
            const esHoy = r.dia === hoy;
            const espera = r.estado === 'reservada';
            const tarde = esHoy && espera && minutosHasta(r, ahora) < 0;
            const apagada = r.estado === 'cancelada' || r.estado === 'no_vino';
            return (
              <li
                key={r.id}
                className={[
                  'flex items-center gap-e3 rounded-mayor border bg-superficie p-e3',
                  apagada ? 'border-borde opacity-55' : 'border-borde',
                  tarde ? 'outline outline-2 outline-atencion' : '',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAbierta(r);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-e3 text-left"
                >
                  <span
                    className="grid min-w-[4.2rem] place-items-center rounded-grande px-e2 py-e2 text-cuerpo font-bold tabular-nums text-white"
                    style={fondoDegradado(apagada ? 'historial' : 'fechas')}
                  >
                    {r.hora}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate">
                      {r.nombre} · {r.comensales}
                    </strong>
                    <span className="block truncate text-secundario text-texto-suave">
                      {[
                        r.mesas.length === 0 ? 'Sin mesa' : `Mesa ${susMesas(r)}`,
                        r.origen === 'web' ? 'web' : null,
                        // Lo que falta, solo cuando importa: la hora ya está a la izquierda.
                        esHoy && espera && minutosHasta(r, ahora) <= 90
                          ? cuantoFalta(r, ahora).toLowerCase()
                          : null,
                        r.nota,
                      ]
                        .filter((p) => p !== null && p !== '')
                        .join(' · ')}
                    </span>
                  </span>
                </button>
                {r.estado === 'sentada' && r.cuentaId !== null ? (
                  <Boton
                    tono="secundario"
                    tamano="s"
                    onClick={() => {
                      if (r.cuentaId !== null) irALaMesa(r.cuentaId);
                    }}
                  >
                    Sentada
                  </Boton>
                ) : apagada ? (
                  <span className="text-etiqueta font-bold text-texto-suave">
                    {r.estado === 'no_vino' ? 'No vino' : 'Cancelada'}
                  </span>
                ) : esHoy && r.mesas.length === 0 ? (
                  // Llegaron tarde y su mesa se liberó (los minutos del local): se les sienta en una
                  // libre desde la sala, o «No han venido».
                  <span className="text-right text-etiqueta font-bold text-texto-suave">
                    Mesa liberada
                  </span>
                ) : esHoy ? (
                  <Boton
                    tono="principal"
                    tamano="s"
                    disabled={ocupada(r) || haciendo !== null}
                    cargando={haciendo === r.id}
                    title={ocupada(r) ? 'Su mesa sigue ocupada' : undefined}
                    onClick={() => {
                      void sentar(r);
                    }}
                  >
                    {ocupada(r) ? 'Ocupada' : 'Sentar'}
                  </Boton>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      <div className="flex justify-end">
        <Boton
          tono="principal"
          icono={<IconoAnadir size={18} />}
          disabled={datos === undefined}
          onClick={() => {
            setNueva('nueva');
          }}
        >
          Reserva
        </Boton>
      </div>
    </section>
  );

  return (
    <div className="flex h-pantalla flex-col bg-fondo text-texto">
      <LaBarraDeArriba />
      {datos !== undefined && !datos.encendidas ? (
        <main className="flex flex-1 items-center justify-center p-e5">
          <p className="max-w-[28rem] text-center text-texto-suave">
            Las reservas están apagadas. Las enciende quien lleva el local en Ajustes del TPV ›
            Reservas.
          </p>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 gap-e4 p-e4 md:p-e5">
          {/* En la tablet y la caja, las mesas con lo reservado; en el móvil, solo la lista. */}
          <section
            className="hidden min-w-0 flex-[3] flex-col gap-e3 overflow-y-auto lg:flex"
            aria-label="Las mesas"
          >
            {(plano.data?.zonas ?? []).map((z) => (
              <div key={z.id} className="flex flex-col gap-e2">
                <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
                  {z.nombre}
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-e2">
                  {z.mesas.map((m) => {
                    const r =
                      elDia === hoy
                        ? laReservaDeLaMesa(reservas, m.id, ahora, datos?.liberarTras ?? 15)
                        : (reservas.find(
                            (x) => x.estado === 'reservada' && x.mesas.some((y) => y.id === m.id),
                          ) ?? null);
                    const abiertaYa = m.cuenta !== null && elDia === hoy;
                    // Ocupada manda: se ve ocupada, con la hora de su siguiente reserva aparte.
                    const enVioleta = r !== null && !abiertaYa;
                    return (
                      <div
                        key={m.id}
                        className={[
                          'flex min-h-[5.2rem] flex-col justify-between rounded-mayor border p-e3',
                          enVioleta
                            ? 'border-transparent text-white'
                            : abiertaYa
                              ? 'border-borde bg-superficie'
                              : 'border-dashed border-borde bg-fondo text-texto-suave',
                        ].join(' ')}
                        style={enVioleta ? fondoDegradado('fechas') : undefined}
                      >
                        <span className="flex items-center justify-between gap-e1">
                          <strong className="text-seccion">{m.nombre}</strong>
                          {r !== null && (
                            <span
                              className={[
                                'rounded-redondo px-e2 text-etiqueta font-bold tabular-nums',
                                enVioleta ? 'bg-white/25' : 'text-white',
                              ].join(' ')}
                              style={enVioleta ? undefined : fondoDegradado('fechas')}
                            >
                              {r.hora}
                            </span>
                          )}
                        </span>
                        <span className="truncate text-secundario font-semibold">
                          {abiertaYa
                            ? 'Ocupada'
                            : r !== null
                              ? `${String(r.comensales)} · ${r.nombre}`
                              : 'Libre'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
          <div className="flex min-w-0 flex-[2] flex-col rounded-mayor border border-borde bg-superficie p-e4">
            {laLista}
          </div>
        </main>
      )}

      {nueva !== null && datos !== undefined && (
        <NuevaReserva
          hoy={hoy}
          diaDeEntrada={elDia}
          {...(nueva === 'nueva' ? {} : { reserva: nueva })}
          alCerrar={() => {
            setNueva(null);
          }}
          alAcabar={(frase) => {
            setNueva(null);
            setNoticia(frase);
          }}
        />
      )}

      {abierta !== null && (
        <Hoja
          abierta
          enMedio
          alCerrar={() => {
            setAbierta(null);
          }}
          titulo={`${abierta.nombre} · ${String(abierta.comensales)}`}
        >
          <div className="flex flex-col gap-e3">
            <p className="text-secundario">
              {abierta.hora} ·{' '}
              {abierta.mesas.length === 0 ? 'sin mesa' : `mesa ${susMesas(abierta)}`} ·{' '}
              {abierta.telefono}
              {abierta.origen === 'web' ? ' · reservó en la web' : ''}
            </p>
            {abierta.nota !== null && (
              <p className="rounded-grande bg-fondo p-e3 text-secundario">{abierta.nota}</p>
            )}
            {abierta.estado === 'reservada' && (
              <div className="flex flex-col gap-e2">
                <Boton
                  tono="secundario"
                  ancho
                  onClick={() => {
                    setNueva(abierta);
                    setAbierta(null);
                  }}
                >
                  Cambiar el día, la hora o cuántos son
                </Boton>
                {abierta.dia === hoy && minutosHasta(abierta, ahora) < 0 && (
                  <Boton
                    tono="secundario"
                    ancho
                    cargando={haciendo === abierta.id}
                    onClick={() => {
                      void cancelar(abierta, true);
                    }}
                  >
                    No han venido: liberar la mesa
                  </Boton>
                )}
                <Boton
                  tono="peligro"
                  ancho
                  cargando={haciendo === abierta.id}
                  onClick={() => {
                    void cancelar(abierta, false);
                  }}
                >
                  Cancelar la reserva
                </Boton>
              </div>
            )}
          </div>
        </Hoja>
      )}
    </div>
  );
}
