import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { comoPorcentaje, enDinero } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  Interruptor,
  Segmentado,
  Tarjeta,
  clases,
} from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarElPeriodo } from '../ganchos/usarElPeriodo.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ElegirElPeriodo, comoSeLlamaElPeriodo } from './elPeriodo.tsx';

/**
 * Servicio › Empleados (la pausa del 8-nov, P3, decisión 0142, con su maqueta aprobada).
 *
 * El equipo de mayor a menor, **por ventas o por € la hora**: «no es lo mismo que alguien de 20 h
 * venda 500 a la semana que alguien de 40». Los objetivos, **aparte, en su botón**, con General y
 * Por empleado (Richi, 8-nov: «hacerlo más por partes, no todo de golpe»).
 *
 * **La lista, solo para quien ve las ventas.** Cada camarero ve el suyo y nada más, si el gerente
 * lo deja (`cada_uno_lo_ve`). Solo con Estook TPV: sin él no hay camarero en cada venta.
 */
const ACENTO = 'var(--color-app-servicio)';
const dinero = enDinero;

interface VentaDeUno {
  readonly personaId: string;
  readonly nombre: string;
  readonly minutos: number;
  readonly ventas: number;
  readonly mesas: number;
  readonly ticketMedio: number | null;
  readonly porHora: number | null;
  readonly objetivoPorHora: number | null;
  readonly objetivoSuyo: boolean;
  readonly meta: number | null;
  readonly platos: readonly { readonly nombre: string; readonly uds: number }[];
}

interface LaVentaDeCadaUno {
  readonly periodo: 'dia' | 'semana' | 'mes';
  readonly desde: string;
  readonly hasta: string;
  readonly hoy: string;
  readonly anteriorDel: string;
  readonly siguienteDel: string | null;
  readonly modo: 'todos' | 'yo';
  readonly puedeCambiar: boolean;
  readonly general: { readonly centimosPorHora: number; readonly cadaUnoLoVe: boolean } | null;
  readonly personas: readonly VentaDeUno[];
  readonly distintos: readonly { readonly personaId: string; readonly centimosPorHora: number }[];
}

const horas = (minutos: number) =>
  `${(minutos / 60).toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`;

export function Empleados() {
  const { yo } = usarSesion();
  const elPeriodo = usarElPeriodo('semana');
  const [orden, setOrden] = useState<'ventas' | 'hora'>('ventas');
  const [viendo, setViendo] = useState<VentaDeUno | null>(null);
  const [objetivos, setObjetivos] = useState(false);
  const conTpv = yo?.cuenta?.conEstookTpv !== false;
  const lectura = usarLectura<LaVentaDeCadaUno>(
    'la_venta_de_cada_uno',
    elPeriodo.parametros,
    conTpv,
    true,
  );

  if (!conTpv) {
    return (
      <Tarjeta titulo="Empleados">
        <EstadoVacio
          compacto
          dibujo="candado"
          acento={ACENTO}
          titulo="Llega con Estook TPV"
          frase="Lo que vende cada uno sale de las mesas: de quién lleva cada mesa. Es del plan Pro."
          sinAccionPorque="Sale de las mesas de Estook TPV."
        />
      </Tarjeta>
    );
  }
  if (lectura.isPending)
    return <Cargando que="lo que vende el equipo" forma="cifra" alto lineas={4} />;
  const d = lectura.data;
  if (d === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer lo que vende el equipo">
        Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }

  const titulo = comoSeLlamaElPeriodo(d.periodo, d.desde, d.hasta, d.hoy);
  const cabecera = (
    <div className="flex flex-wrap items-center justify-between gap-e3">
      <ElegirElPeriodo
        periodo={d.periodo}
        titulo={titulo}
        anteriorDel={d.anteriorDel}
        siguienteDel={d.siguienteDel}
        alElegir={elPeriodo.elegir}
        alIr={elPeriodo.irA}
        conDia={false}
      />
      {d.modo === 'todos' && d.personas.length > 1 && (
        <Segmentado
          etiqueta="Cómo se ordena"
          opciones={[
            { valor: 'ventas' as const, texto: 'Por ventas' },
            { valor: 'hora' as const, texto: 'Por € la hora' },
          ]}
          valor={orden}
          alElegir={setOrden}
        />
      )}
    </div>
  );

  // ── Un camarero: solo lo suyo ──
  if (d.modo === 'yo') {
    const mio = d.personas[0];
    return (
      <div className="flex max-w-[40rem] flex-col gap-e4">
        {cabecera}
        {mio === undefined ? (
          <Tarjeta>
            <EstadoVacio
              compacto
              dibujo="candado"
              acento={ACENTO}
              titulo="Tu objetivo no está a la vista"
              frase="Quien lleva el local ha decidido no enseñar los objetivos."
              sinAccionPorque="Lo decide quien lleva el local."
            />
          </Tarjeta>
        ) : (
          <LaFicha uno={mio} sinPlatos />
        )}
      </div>
    );
  }

  const personas = [...d.personas].sort((a, b) =>
    orden === 'ventas' ? b.ventas - a.ventas : (b.porHora ?? -1) - (a.porHora ?? -1),
  );
  const masPorHora = [...d.personas]
    .filter((p) => p.porHora !== null)
    .sort((a, b) => (b.porHora ?? 0) - (a.porHora ?? 0))[0];
  const masVentas = d.personas[0];

  return (
    <div className="flex flex-col gap-e4">
      {cabecera}
      {personas.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            compacto
            dibujo="libro"
            acento={ACENTO}
            titulo="Sin ventas en este periodo"
            frase="Cada uno suma lo que se vende en las mesas que lleva en Estook TPV."
            sinAccionPorque="Llegan solas."
          />
        </Tarjeta>
      ) : (
        <Tarjeta>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-secundario">
              <thead>
                <tr className="text-left text-etiqueta text-texto-suave">
                  <th className="px-e2 pb-e2 font-medium">Quién</th>
                  <th className="hidden px-e2 pb-e2 text-right font-medium sm:table-cell">Horas</th>
                  <th className="px-e2 pb-e2 text-right font-medium">Ventas</th>
                  <th className="px-e2 pb-e2 text-right font-medium">€ / hora</th>
                  <th className="px-e2 pb-e2 font-medium">Su objetivo</th>
                </tr>
              </thead>
              <tbody>
                {personas.map((p) => (
                  <tr
                    key={p.personaId}
                    onClick={() => {
                      setViendo(p);
                    }}
                    className="cursor-pointer border-t border-borde hover:bg-fondo"
                  >
                    <td className="px-e2 py-e3">
                      <span className="flex items-center gap-e2">
                        <span
                          aria-hidden
                          className="grid size-8 shrink-0 place-items-center rounded-redondo bg-fondo text-etiqueta font-bold"
                        >
                          {p.nombre.slice(0, 2).toUpperCase()}
                        </span>
                        <button type="button" className="text-left text-cuerpo font-semibold">
                          {p.nombre}
                        </button>
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-e2 text-right tabular-nums sm:table-cell">
                      {horas(p.minutos)}
                    </td>
                    <td className="whitespace-nowrap px-e2 text-right font-semibold tabular-nums">
                      {dinero(p.ventas)}
                    </td>
                    <td className="whitespace-nowrap px-e2 text-right tabular-nums">
                      {p.porHora === null ? '—' : dinero(p.porHora)}
                    </td>
                    <td className="min-w-[8rem] px-e2">
                      <Progreso uno={p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-e3 flex flex-wrap items-center justify-between gap-e3">
            <p className="text-etiqueta text-texto-suave">
              {orden === 'hora' &&
              masPorHora !== undefined &&
              masVentas !== undefined &&
              masPorHora.personaId !== masVentas.personaId
                ? `${masPorHora.nombre} vende menos en total, pero por hora es quien más trae.`
                : 'Toca a alguien para ver lo que más vende.'}
            </p>
            {d.puedeCambiar && (
              <Boton
                tono="secundario"
                onClick={() => {
                  setObjetivos(true);
                }}
              >
                Objetivos
              </Boton>
            )}
          </div>
        </Tarjeta>
      )}

      {d.puedeCambiar && personas.length === 0 && (
        <div>
          <Boton
            tono="secundario"
            onClick={() => {
              setObjetivos(true);
            }}
          >
            Objetivos
          </Boton>
        </div>
      )}

      <Hoja
        abierta={viendo !== null}
        titulo={viendo?.nombre ?? ''}
        alCerrar={() => {
          setViendo(null);
        }}
      >
        {viendo !== null && (
          <div className="px-e4 pb-e4">
            <LaFicha uno={viendo} />
          </div>
        )}
      </Hoja>

      {objetivos && (
        <LosObjetivos
          d={d}
          alCerrar={() => {
            setObjetivos(false);
          }}
        />
      )}
    </div>
  );
}

function Progreso({ uno }: { readonly uno: VentaDeUno }) {
  if (uno.meta === null || uno.meta === 0) {
    return <span className="text-etiqueta text-texto-tenue">Sin objetivo</span>;
  }
  const parte = uno.ventas / uno.meta;
  const tono = parte >= 1 ? 'bien' : parte >= 0.85 ? 'atencion' : 'mal';
  const color =
    tono === 'bien'
      ? 'var(--color-bien)'
      : tono === 'atencion'
        ? 'var(--color-atencion)'
        : 'var(--color-mal)';
  return (
    <span className="flex flex-col gap-[2px]">
      <span className="flex items-center gap-e2">
        <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-redondo bg-fondo">
          <span
            className="block h-full rounded-redondo"
            style={{ width: `${(Math.min(parte, 1) * 100).toFixed(0)}%`, background: color }}
          />
        </span>
        <Etiqueta tono={tono}>{comoPorcentaje(parte)}</Etiqueta>
      </span>
      <span className="text-etiqueta text-texto-suave">de {dinero(uno.meta)}</span>
    </span>
  );
}

function LaFicha({
  uno,
  sinPlatos = false,
}: {
  readonly uno: VentaDeUno;
  readonly sinPlatos?: boolean;
}) {
  return (
    <div className="flex flex-col gap-e3">
      <Tarjeta titulo="Su objetivo">
        {uno.meta === null ? (
          <p className="text-secundario text-texto-suave">Todavía no hay objetivo.</p>
        ) : (
          <div className="flex flex-col gap-e2">
            <Progreso uno={uno} />
            <p className="text-secundario">
              <b className="tabular-nums">{dinero(uno.ventas)}</b> vendidos en {horas(uno.minutos)},{' '}
              con {dinero(uno.objetivoPorHora ?? 0)} la hora
              {uno.objetivoSuyo ? ' (el suyo)' : ' (el general)'}.
            </p>
          </div>
        )}
      </Tarjeta>
      <div className="grid grid-cols-3 gap-e2">
        {[
          ['€ / hora', uno.porHora === null ? '—' : dinero(uno.porHora)],
          ['Mesas', String(uno.mesas)],
          ['Ticket', uno.ticketMedio === null ? '—' : dinero(uno.ticketMedio)],
        ].map(([que, cuanto]) => (
          <div key={que} className="rounded-grande border border-borde bg-superficie p-e3">
            <p className="text-etiqueta text-texto-suave">{que}</p>
            <p className="text-cuerpo font-bold tabular-nums">{cuanto}</p>
          </div>
        ))}
      </div>
      {!sinPlatos && uno.platos.length > 0 && (
        <Tarjeta titulo="Lo que más vende">
          <ol className="flex flex-col">
            {uno.platos.map((p, i) => (
              <li
                key={p.nombre}
                className="flex items-center justify-between gap-e3 border-t border-borde py-e2 first:border-t-0"
              >
                <span className="flex items-center gap-e3">
                  <span className="w-4 text-center text-etiqueta font-bold text-texto-tenue">
                    {i + 1}
                  </span>
                  <span className="text-cuerpo">{p.nombre}</span>
                </span>
                <b className="tabular-nums">{p.uds}</b>
              </li>
            ))}
          </ol>
        </Tarjeta>
      )}
    </div>
  );
}

// ── La hoja de los objetivos ─────────────────────────────────────────────────

function Paso({
  valor,
  alCambiar,
  etiqueta,
}: {
  readonly valor: number;
  readonly alCambiar: (v: number) => void;
  readonly etiqueta: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="flex items-center gap-e3">
      <div className="flex items-center overflow-hidden rounded-medio border border-borde-fuerte">
        <button
          type="button"
          aria-label="Un euro menos"
          className="min-h-toque min-w-toque text-pantalla font-semibold"
          onClick={() => {
            alCambiar(Math.max(100, valor - 100));
          }}
        >
          −
        </button>
        <output className="min-w-[3rem] text-center text-pantalla font-semibold tabular-nums">
          {valor / 100}
        </output>
        <button
          type="button"
          aria-label="Un euro más"
          className="min-h-toque min-w-toque text-pantalla font-semibold"
          onClick={() => {
            alCambiar(Math.min(100_000, valor + 100));
          }}
        >
          +
        </button>
      </div>
      <span className="text-cuerpo font-semibold">€ por hora</span>
    </div>
  );
}

function LosObjetivos({
  d,
  alCerrar,
}: {
  readonly d: LaVentaDeCadaUno;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [pestana, setPestana] = useState<'general' | 'persona'>('general');
  const [general, setGeneral] = useState(d.general?.centimosPorHora ?? 4500);
  const [loVen, setLoVen] = useState(d.general?.cadaUnoLoVe ?? true);
  const [distintos, setDistintos] = useState<ReadonlyMap<string, number>>(
    new Map(d.distintos.map((x) => [x.personaId, x.centimosPorHora])),
  );
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const ejemplo = d.personas[0];

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('guardar_los_objetivos_de_venta', {
      general,
      cada_uno_lo_ve: loVen,
      distintos: [...distintos.entries()].map(([persona_id, centimos_por_hora]) => ({
        persona_id,
        centimos_por_hora,
      })),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['la_venta_de_cada_uno'] });
    alCerrar();
  }

  return (
    <Hoja abierta titulo="Objetivos" alCerrar={alCerrar}>
      <div className="flex flex-col gap-e4 px-e4 pb-e4">
        <Segmentado
          etiqueta="Qué objetivo"
          ancho
          opciones={[
            { valor: 'general' as const, texto: 'General' },
            { valor: 'persona' as const, texto: 'Por empleado' },
          ]}
          valor={pestana}
          alElegir={setPestana}
        />
        {pestana === 'general' ? (
          <>
            <div className="flex flex-col gap-e3 rounded-mayor border border-borde p-e4">
              <p className="text-cuerpo font-semibold">¿Cuánto debería vender cada hora de sala?</p>
              <Paso valor={general} alCambiar={setGeneral} etiqueta="El objetivo general" />
              <p className="text-secundario text-texto-suave">
                {ejemplo === undefined
                  ? 'Lo de cada uno sale de sus horas fichadas: con 38 horas, 38 veces esto.'
                  : `Con ${dinero(general)} la hora, ${ejemplo.nombre} (${horas(ejemplo.minutos)}) tiene ${dinero((general * ejemplo.minutos) / 60)} en este periodo. Sale de sus horas fichadas.`}
              </p>
            </div>
            <div className="rounded-mayor border border-borde p-e4">
              <Interruptor
                etiqueta="Que cada uno vea el suyo"
                puesto={loVen}
                alCambiar={setLoVen}
              />
              <p className="mt-e1 text-secundario text-texto-suave">
                En Servicio › Empleados, solo el suyo: nunca la lista de los demás.
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col">
            {d.personas.length === 0 && (
              <p className="text-secundario text-texto-suave">
                Salen aquí quienes han vendido en el periodo.
              </p>
            )}
            {d.personas.map((p) => {
              const suyo = distintos.get(p.personaId);
              return (
                <div key={p.personaId} className="border-t border-borde py-e3 first:border-t-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(editando === p.personaId ? null : p.personaId);
                    }}
                    className="flex w-full items-center justify-between gap-e3 text-left"
                  >
                    <span>
                      <span className="block text-cuerpo font-semibold">{p.nombre}</span>
                      <span className="block text-etiqueta text-texto-suave">
                        {suyo === undefined ? 'El general' : 'Uno suyo'}
                      </span>
                    </span>
                    <b className={clases('tabular-nums', suyo !== undefined && 'text-naranja')}>
                      {dinero(suyo ?? general)} / h
                    </b>
                  </button>
                  {editando === p.personaId && (
                    <div className="mt-e3 flex flex-wrap items-center gap-e3">
                      <Paso
                        valor={suyo ?? general}
                        etiqueta={`El objetivo de ${p.nombre}`}
                        alCambiar={(v) => {
                          const nuevos = new Map(distintos);
                          nuevos.set(p.personaId, v);
                          setDistintos(nuevos);
                        }}
                      />
                      {suyo !== undefined && (
                        <Boton
                          tono="texto"
                          onClick={() => {
                            const nuevos = new Map(distintos);
                            nuevos.delete(p.personaId);
                            setDistintos(nuevos);
                          }}
                        >
                          Volver al general
                        </Boton>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
        <Boton
          tono="principal"
          ancho
          cargando={guardando}
          textoCargando="Guardando"
          onClick={() => {
            void guardar();
          }}
        >
          Guardar
        </Boton>
      </div>
    </Hoja>
  );
}
