import { useState } from 'react';
import { Boton, Campo, ErrorEnCristiano, Hoja, fondoDegradado } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import { usarLasHoras } from '../ganchos/usarLasReservas.ts';
import type { UnaReserva } from '../datos/tipos.ts';

/**
 * **Una reserva en cuatro toques y el nombre** (la Ampliación 5 · 1, 0153; maqueta, «Reserva por
 * teléfono»): cuántos, el día, la hora —solo las que tienen mesa de verdad— y el nombre con el
 * teléfono. **La mesa la pone Estook** (la que mejor encaja) y se dice. Sirve también para cambiar una.
 *
 * El id nace aquí: tocar dos veces o perder la red no duplica la reserva.
 */

function masDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

function elDiaEnLetra(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  if (fecha === masDias(hoy, 1)) return 'Mañana';
  const texto = new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

export function NuevaReserva({
  hoy,
  diaDeEntrada,
  reserva,
  alCerrar,
  alAcabar,
}: {
  readonly hoy: string;
  readonly diaDeEntrada: string;
  /** Para cambiar una que ya está. */
  readonly reserva?: UnaReserva;
  readonly alCerrar: () => void;
  readonly alAcabar: (frase: string) => void;
}) {
  const ejecutar = usarAcciones();
  const [id] = useState(() => reserva?.id ?? crypto.randomUUID());
  const [comensales, setComensales] = useState(reserva?.comensales ?? 2);
  const [dia, setDia] = useState(reserva?.dia ?? diaDeEntrada);
  const [hora, setHora] = useState<string | null>(reserva?.hora ?? null);
  const [nombre, setNombre] = useState(reserva?.nombre ?? '');
  const [telefono, setTelefono] = useState(reserva?.telefono ?? '');
  const [nota, setNota] = useState(reserva?.nota ?? '');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const horas = usarLasHoras(dia, comensales, reserva?.id ?? null);

  const todas = horas.data?.servicios.flatMap((s) => s.horas) ?? [];
  const laElegida = todas.find((h) => h.hora === hora);
  const mesas = laElegida?.mesas ?? null;
  const listo =
    hora !== null &&
    mesas !== null &&
    nombre.trim() !== '' &&
    telefono.replace(/\D/g, '').length >= 6 &&
    !guardando;

  async function reservar() {
    if (hora === null) return;
    setGuardando(true);
    setFallo(null);
    const hecho = await ejecutar('poner_reserva', {
      id,
      dia,
      hora,
      comensales,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
    });
    setGuardando(false);
    if (!hecho.ok) {
      setFallo(hecho.error);
      return;
    }
    alAcabar(
      `${reserva === undefined ? 'Reservado' : 'Cambiado'}: ${nombre.trim()}, ${String(comensales)} · ${elDiaEnLetra(dia, hoy).toLowerCase()} a las ${hora}`,
    );
  }

  return (
    <Hoja
      abierta
      enMedio
      alCerrar={alCerrar}
      titulo={reserva === undefined ? 'Nueva reserva' : `Cambiar la de ${reserva.nombre}`}
      pie={
        <Boton
          tono="principal"
          ancho
          disabled={!listo}
          cargando={guardando}
          textoCargando="Reservando"
          onClick={() => {
            void reservar();
          }}
        >
          {reserva === undefined ? 'Reservar' : 'Guardar'}
        </Boton>
      }
    >
      <div className="flex flex-col gap-e4">
        {fallo !== null && <ErrorEnCristiano error={fallo} />}

        <section className="flex flex-col gap-e2">
          <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
            Personas
          </h3>
          <div className="grid grid-cols-6 gap-e2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={comensales === n}
                onClick={() => {
                  setComensales(n);
                  setHora(null);
                }}
                className={[
                  'min-h-toque rounded-grande border text-cuerpo font-bold tabular-nums',
                  comensales === n
                    ? 'border-transparent bg-texto text-superficie'
                    : 'border-borde bg-fondo',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-e2 text-secundario text-texto-suave">
            Más:
            <input
              inputMode="numeric"
              aria-label="Más de seis comensales"
              value={comensales > 6 ? String(comensales) : ''}
              placeholder="7, 12…"
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, '').slice(0, 2));
                if (n > 0) {
                  setComensales(n);
                  setHora(null);
                }
              }}
              className="w-20 rounded-medio border border-borde bg-fondo px-e2 py-e1 text-cuerpo tabular-nums"
            />
          </label>
        </section>

        <section className="flex flex-col gap-e2">
          <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">Día</h3>
          <div className="flex flex-wrap items-center gap-e2">
            {[hoy, masDias(hoy, 1)].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dia === d}
                onClick={() => {
                  setDia(d);
                  setHora(null);
                }}
                className={[
                  'min-h-toque rounded-grande border px-e4 font-bold',
                  dia === d
                    ? 'border-transparent bg-texto text-superficie'
                    : 'border-borde bg-fondo',
                ].join(' ')}
              >
                {elDiaEnLetra(d, hoy)}
              </button>
            ))}
            <input
              type="date"
              aria-label="Otro día"
              min={hoy}
              value={dia}
              onChange={(e) => {
                if (e.currentTarget.value !== '') {
                  setDia(e.currentTarget.value);
                  setHora(null);
                }
              }}
              className="min-h-toque rounded-grande border border-borde bg-fondo px-e3"
            />
          </div>
        </section>

        {(horas.data?.servicios ?? []).map((s) => (
          <section key={s.nombre} className="flex flex-col gap-e2">
            <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
              {s.nombre} · {elDiaEnLetra(dia, hoy).toLowerCase()}
            </h3>
            {s.horas.length === 0 ? (
              <p className="text-secundario text-texto-suave">
                Ya no quedan horas en este servicio.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-e2 sm:grid-cols-6">
                {s.horas.map((h) => {
                  const puesta = hora === h.hora;
                  const sinMesa = h.mesas === null;
                  return (
                    <button
                      key={h.hora}
                      type="button"
                      disabled={sinMesa}
                      aria-pressed={puesta}
                      title={
                        sinMesa
                          ? 'Sin mesa para tantos'
                          : h.pasaDelTope
                            ? 'Pasa del tope de comensales de ese cuarto de hora'
                            : undefined
                      }
                      onClick={() => {
                        setHora(h.hora);
                      }}
                      className={[
                        'relative min-h-toque rounded-grande border font-bold tabular-nums disabled:opacity-35',
                        puesta ? 'border-transparent text-white' : 'border-borde bg-fondo',
                        sinMesa ? 'line-through' : '',
                      ].join(' ')}
                      style={puesta ? fondoDegradado('fechas') : undefined}
                    >
                      {h.hora}
                      {h.pasaDelTope && !sinMesa && (
                        <span
                          aria-hidden
                          className="absolute right-[5px] top-[5px] size-[7px] rounded-full bg-atencion"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}
        {horas.isLoading && <p className="text-secundario text-texto-suave">Mirando las mesas…</p>}

        {hora !== null && mesas !== null && (
          <div
            className="flex flex-col gap-[2px] rounded-grande p-e3 text-white"
            style={fondoDegradado('fechas')}
          >
            <strong>
              {mesas.length === 1
                ? `Mesa ${mesas[0]?.nombre ?? ''} · la que mejor encaja para ${String(comensales)}`
                : `Mesas ${mesas.map((m) => m.nombre).join(' + ')}, juntas · para ${String(comensales)}`}
            </strong>
            <span className="text-secundario">
              La elige Estook: la que deja menos sillas vacías.
              {laElegida?.pasaDelTope === true
                ? ' Ojo: a esa hora se pasa del tope de comensales del local.'
                : ''}
            </span>
          </div>
        )}

        <div className="grid gap-e3 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            value={nombre}
            maxLength={60}
            onChange={(e) => {
              setNombre(e.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Teléfono"
            tipo="telefono"
            ayuda="Por si hay que llamarle."
            value={telefono}
            onChange={(e) => {
              setTelefono(e.currentTarget.value);
            }}
          />
        </div>
        <Campo
          etiqueta="Una nota (opcional)"
          ayuda="«Cumpleaños», «con carrito», «alergia a los frutos secos»…"
          value={nota}
          maxLength={200}
          onChange={(e) => {
            setNota(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
