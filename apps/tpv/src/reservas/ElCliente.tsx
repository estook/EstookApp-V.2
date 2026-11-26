import { useState } from 'react';
import {
  ALERGENOS,
  NOMBRE_CORTO_DEL_ALERGENO,
  laAlergiaEnLetra,
  lasEtiquetasDelCliente,
  type TonoDeEtiqueta,
} from '@estook/dominio';
import { Boton, ErrorEnCristiano, fondoDegradado } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import { usarLaFichaDelCliente } from '../ganchos/usarLasReservas.ts';
import type { MarcasDelCliente } from '../datos/tipos.ts';

/**
 * **El cliente de una reserva, en Estook TPV** (la Ampliación 5 · 3, 0153; maqueta, «Los clientes, y los que
 * no vienen»). Junto al nombre, sus etiquetas: la alergia en rojo, «2 sin venir» en naranja, VIP en violeta y
 * «Habitual» en verde. Al tocar la reserva, su ficha: lo que sabe el TPV sin que nadie lo apunte y lo poco que
 * se apunta a mano.
 */

const ESTILO_DE: Readonly<Record<TonoDeEtiqueta, string>> = {
  alergia: 'bg-mal-suave text-mal',
  sin_venir: 'bg-atencion-suave text-atencion',
  vip: 'text-white',
  habitual: 'bg-bien-suave text-bien',
};

export function LasEtiquetas({
  cliente,
  conAlergias = true,
}: {
  readonly cliente: MarcasDelCliente | null | undefined;
  /** En la lista, las alergias en una sola etiqueta «Alergia», para que quepa. */
  readonly conAlergias?: boolean;
}) {
  if (cliente === null || cliente === undefined) return null;
  const todas = lasEtiquetasDelCliente(cliente);
  const etiquetas = conAlergias
    ? todas
    : [
        ...(cliente.alergenos.length > 0 ? [{ tono: 'alergia' as const, texto: 'Alergia' }] : []),
        ...todas.filter((e) => e.tono !== 'alergia'),
      ];
  if (etiquetas.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-e1">
      {etiquetas.map((e) => (
        <span
          key={`${e.tono}-${e.texto}`}
          className={[
            'rounded-redondo px-e2 py-[2px] text-etiqueta font-bold',
            ESTILO_DE[e.tono],
          ].join(' ')}
          style={e.tono === 'vip' ? fondoDegradado('fechas') : undefined}
        >
          {e.texto}
        </span>
      ))}
    </span>
  );
}

function euros(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function elDiaCorto(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** **Su ficha**, dentro de la hoja de la reserva. */
export function LaFichaDelCliente({
  clienteId,
  alGuardar,
}: {
  readonly clienteId: string;
  readonly alGuardar: (frase: string) => void;
}) {
  const ficha = usarLaFichaDelCliente(clienteId);
  const f = ficha.data;
  if (ficha.isLoading) {
    return <p className="text-secundario text-texto-suave">Mirando su ficha…</p>;
  }
  if (f === undefined) return null;
  return (
    <LaFicha key={`${f.id}-${String(f.vip)}-${f.alergenos.join()}`} f={f} alGuardar={alGuardar} />
  );
}

function LaFicha({
  f,
  alGuardar,
}: {
  readonly f: NonNullable<ReturnType<typeof usarLaFichaDelCliente>['data']>;
  readonly alGuardar: (frase: string) => void;
}) {
  const ejecutar = usarAcciones();
  const [cambiando, setCambiando] = useState(false);
  const [vip, setVip] = useState(f.vip);
  const [alergenos, setAlergenos] = useState<readonly string[]>(f.alergenos);
  const [nota, setNota] = useState(f.nota ?? '');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  async function guardar() {
    setGuardando(true);
    setFallo(null);
    const hecho = await ejecutar('guardar_al_cliente', {
      cliente_id: f.id,
      vip,
      alergenos: ALERGENOS.filter((a) => alergenos.includes(a)),
      nota: nota.trim() === '' ? null : nota.trim(),
    });
    setGuardando(false);
    if (!hecho.ok) {
      setFallo(hecho.error);
      return;
    }
    setCambiando(false);
    alGuardar(`Ficha de ${f.nombre}, guardada`);
  }

  const cifras: { valor: string; texto: string }[] = [
    { valor: String(f.visitas), texto: f.visitas === 1 ? 'visita' : 'visitas' },
    ...(f.veElGasto
      ? [
          {
            valor: f.gastoMedioPorPersona === null ? '—' : euros(f.gastoMedioPorPersona),
            texto: 'por persona',
          },
        ]
      : []),
    ...(f.vecesSinVenir > 0 ? [{ valor: String(f.vecesSinVenir), texto: 'sin venir' }] : []),
  ];

  return (
    <section className="flex flex-col gap-e3" aria-label="Su ficha">
      <div className="flex flex-wrap items-center gap-e2">
        <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
          Su ficha
        </h3>
        <LasEtiquetas cliente={f} />
      </div>
      <div
        className="grid gap-e2"
        style={{
          gridTemplateColumns: `repeat(${String(Math.max(cifras.length, 2))}, minmax(0, 1fr))`,
        }}
      >
        {cifras.map((c) => (
          <div key={c.texto} className="rounded-grande bg-fondo p-e3">
            <strong className="block text-seccion tabular-nums">{c.valor}</strong>
            <span className="text-etiqueta text-texto-suave">{c.texto}</span>
          </div>
        ))}
      </div>
      {(f.ultimaVisita !== null || f.loQueSuelePedir.length > 0 || f.nota !== null) && (
        <dl className="flex flex-col gap-e1 text-secundario">
          {f.ultimaVisita !== null && (
            <div className="flex gap-e2">
              <dt className="text-texto-suave">Última vez</dt>
              <dd className="font-semibold">{elDiaCorto(f.ultimaVisita)}</dd>
            </div>
          )}
          {f.loQueSuelePedir.length > 0 && (
            <div className="flex gap-e2">
              <dt className="shrink-0 text-texto-suave">Suele pedir</dt>
              <dd className="font-semibold">{f.loQueSuelePedir.join(', ')}</dd>
            </div>
          )}
          {f.nota !== null && (
            <div className="flex gap-e2">
              <dt className="text-texto-suave">Nota</dt>
              <dd className="font-semibold">{f.nota}</dd>
            </div>
          )}
        </dl>
      )}

      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {!cambiando ? (
        <Boton
          tono="secundario"
          tamano="s"
          onClick={() => {
            setCambiando(true);
          }}
        >
          VIP, alergias o nota
        </Boton>
      ) : (
        <div className="flex flex-col gap-e3 rounded-grande border border-borde p-e3">
          <label className="flex cursor-pointer items-center justify-between gap-e3">
            <span className="font-bold">VIP</span>
            <input
              type="checkbox"
              checked={vip}
              onChange={(e) => {
                setVip(e.target.checked);
              }}
              className="size-7 accent-naranja"
            />
          </label>
          <div className="flex flex-col gap-e2">
            <span className="font-bold">Sus alergias</span>
            <span className="text-secundario text-texto-suave">
              Solo si te ha dicho que sí: al sentarle, la mesa saldrá con ellas.
            </span>
            <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
              {ALERGENOS.map((a) => {
                const puesta = alergenos.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={puesta}
                    onClick={() => {
                      setAlergenos(puesta ? alergenos.filter((x) => x !== a) : [...alergenos, a]);
                    }}
                    className={[
                      'min-h-toque rounded-grande border-2 px-e3 text-left font-bold',
                      puesta ? 'border-mal bg-mal-suave text-mal' : 'border-borde bg-superficie',
                    ].join(' ')}
                  >
                    {a === 'gluten' ? laAlergiaEnLetra(a) : NOMBRE_CORTO_DEL_ALERGENO[a]}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex flex-col gap-e1">
            <span className="font-bold">Nota</span>
            <input
              value={nota}
              maxLength={80}
              placeholder="«Trona», «mesa tranquila»…"
              onChange={(e) => {
                setNota(e.currentTarget.value);
              }}
              className="min-h-toque rounded-grande border border-borde bg-fondo px-e3"
            />
          </label>
          <div className="flex gap-e2">
            <Boton
              tono="secundario"
              onClick={() => {
                setCambiando(false);
              }}
            >
              Volver
            </Boton>
            <Boton
              tono="principal"
              ancho
              cargando={guardando}
              onClick={() => {
                void guardar();
              }}
            >
              Guardar
            </Boton>
          </div>
        </div>
      )}
    </section>
  );
}
