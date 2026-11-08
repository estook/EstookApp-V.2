import { useState } from 'react';
import { MINUTOS_PARA_IR_TARDE, comoPorcentaje, enDinero } from '@estook/dominio';
import { EstadoVacio, Etiqueta, Grafica, Mosaico, Segmentado, Tarjeta } from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { ElServicioPorDentro as Datos } from '../servicio/contratoDeLoQueSeVende.ts';

/**
 * Negocio › Informes, lo nuevo de la pausa del 8-nov (0142): cuándo se vende, la cocina, lo que
 * se tuerce y las semanas. Richi: «ventas por franjas de horas (gráfica bonita de en qué horas se
 * vende más), devoluciones de platos, mesas canceladas que se han ido, retrasos de cocina, tiempo
 * medio de salida, comparativas de días, semanas y meses».
 *
 * Sale de las mesas de Estook TPV (`el_servicio_por_dentro`). Sin ellas, solo las semanas, que
 * también salen de los cierres; las otras tres dicen que llegan con Estook TPV.
 */
const ACENTO = 'var(--color-app-negocio)';
const ANTES = 'var(--color-texto-tenue)';
const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const dinero = enDinero;
const frenteA = (tipo: string) =>
  tipo === 'dia'
    ? 'el mismo día de la semana pasada'
    : tipo === 'semana'
      ? 'la semana anterior'
      : 'el mes anterior';

export function ElServicioPorDentro({
  tipo,
  del,
}: {
  readonly tipo: 'dia' | 'semana' | 'mes';
  readonly del: string;
}) {
  const lectura = usarLectura<Datos>('el_servicio_por_dentro', { periodo: tipo, del }, true, true);
  const d = lectura.data;
  if (d === undefined) return null;
  return (
    <Mosaico columnas="grid-cols-1 lg:grid-cols-2">
      <CuandoSeVende d={d} />
      <LaCocina d={d} />
      <LoQueSeTuerce d={d} />
      <LasSemanas d={d} />
    </Mosaico>
  );
}

function SinTpv({ que }: { readonly que: string }) {
  return (
    <EstadoVacio
      compacto
      dibujo="libro"
      acento={ACENTO}
      titulo="Llega con Estook TPV"
      frase={`${que} salen de las mesas: de quién pide qué, cuándo y cuándo sale de cocina.`}
      sinAccionPorque="Sale solo de las mesas de Estook TPV."
    />
  );
}

// ── Cuándo se vende ──────────────────────────────────────────────────────────

function CuandoSeVende({ d }: { readonly d: Datos }) {
  const [como, setComo] = useState<'hora' | 'calor'>('hora');
  if (!d.conTpv) {
    return (
      <Tarjeta titulo="Cuándo se vende" acento={ACENTO}>
        <SinTpv que="Las horas fuertes" />
      </Tarjeta>
    );
  }
  // Solo las horas con algo, de la primera a la última: el local no abre a las cuatro.
  const conAlgo = d.porHora.filter((h) => h.ahora > 0 || h.antes > 0).map((h) => h.hora);
  const desde = Math.min(...conAlgo);
  const hasta = Math.max(...conAlgo);
  const horas = d.porHora.filter((h) => h.hora >= desde && h.hora <= hasta);
  const total = horas.reduce((s, h) => s + h.ahora, 0);
  // La franja de dos horas que más vende.
  let mejor = { desde: desde, ventas: 0 };
  for (const h of horas) {
    const dos = h.ahora + (horas.find((x) => x.hora === h.hora + 1)?.ahora ?? 0);
    if (dos > mejor.ventas) mejor = { desde: h.hora, ventas: dos };
  }
  return (
    <Tarjeta
      titulo="Cuándo se vende"
      acento={ACENTO}
      accion={
        d.periodo === 'dia' ? undefined : (
          <Segmentado
            etiqueta="Cómo se ve"
            opciones={[
              { valor: 'hora' as const, texto: 'Por hora' },
              { valor: 'calor' as const, texto: 'Día y hora' },
            ]}
            valor={como}
            alElegir={setComo}
          />
        )
      }
    >
      <div className="flex flex-col gap-e3">
        {como === 'hora' || d.periodo === 'dia' ? (
          <Grafica
            titulo="Lo vendido por hora, sin IVA, frente al periodo anterior"
            datos={horas.map((h) => ({
              hora: `${String(h.hora % 24)} h`,
              ahora: h.ahora / 100,
              antes: h.antes / 100,
            }))}
            eje="hora"
            forma="barras"
            series={[
              { clave: 'ahora', nombre: 'Ahora', color: ACENTO },
              { clave: 'antes', nombre: `Antes (${frenteA(d.periodo)})`, color: ANTES },
            ]}
            alto={200}
            formato={(v) => dinero(v * 100)}
            cuandoNoHay={null}
          />
        ) : (
          <ElCalor d={d} desde={desde} hasta={hasta} />
        )}
        {total > 0 && (
          <p className="text-cuerpo">
            <b>
              Lo fuerte, de {mejor.desde % 24} a {(mejor.desde + 2) % 24} h
            </b>
            : el {comoPorcentaje(mejor.ventas / total)} de lo vendido.
          </p>
        )}
      </div>
    </Tarjeta>
  );
}

/** El día de la semana por la hora, del color de la app: más oscuro, más se vende. */
function ElCalor({
  d,
  desde,
  hasta,
}: {
  readonly d: Datos;
  readonly desde: number;
  readonly hasta: number;
}) {
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  const max = Math.max(1, ...d.porDiaYHora.map((c) => c.ventas));
  const celda = (dia: number, hora: number) =>
    d.porDiaYHora.find((c) => c.dia === dia && c.hora === hora)?.ventas ?? 0;
  return (
    <div className="flex flex-col gap-e2">
      <div
        role="img"
        aria-label="Lo vendido por día de la semana y hora"
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `2.5rem repeat(${String(horas.length)}, minmax(0, 1fr))` }}
      >
        {DIAS.map((nombre, i) => (
          <div key={nombre} className="contents">
            <span className="self-center text-etiqueta text-texto-suave">{nombre}</span>
            {horas.map((hora) => {
              const v = celda(i + 1, hora);
              return (
                <span
                  key={hora}
                  title={`${nombre}, de ${String(hora % 24)} a ${String((hora + 1) % 24)} h: ${dinero(v)}`}
                  className="h-6 rounded-[5px]"
                  style={{
                    background: `color-mix(in oklab, ${ACENTO} ${(6 + (v / max) * 94).toFixed(0)}%, var(--color-fondo))`,
                  }}
                />
              );
            })}
          </div>
        ))}
        <span />
        {horas.map((hora) => (
          <span key={hora} className="text-center text-etiqueta text-texto-suave">
            {hora % 2 === 0 ? `${String(hora % 24)}h` : ''}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-e2 text-etiqueta text-texto-suave">
        Menos
        <span
          aria-hidden
          className="inline-block h-2 w-24 rounded-redondo"
          style={{
            background: `linear-gradient(90deg, color-mix(in oklab, ${ACENTO} 6%, var(--color-fondo)), ${ACENTO})`,
          }}
        />
        Más
      </p>
    </div>
  );
}

// ── La cocina ────────────────────────────────────────────────────────────────

function LaCocina({ d }: { readonly d: Datos }) {
  const c = d.cocina;
  if (!d.conTpv || c.conTiempo === 0) {
    return (
      <Tarjeta titulo="La cocina" acento={ACENTO}>
        {d.conTpv ? (
          <EstadoVacio
            compacto
            dibujo="libro"
            acento={ACENTO}
            titulo="Sin tiempos de cocina"
            frase="Salen cuando la cocina tacha los platos en la pantalla de cocina. Con la comanda en papel no hay hora de salida."
            sinAccionPorque="Sale de la pantalla de cocina de Estook TPV."
          />
        ) : (
          <SinTpv que="Los tiempos de cocina" />
        )}
      </Tarjeta>
    );
  }
  const mejora = c.media !== null && c.mediaAntes !== null ? c.mediaAntes - c.media : null;
  return (
    <Tarjeta
      titulo="La cocina"
      acento={ACENTO}
      accion={
        mejora === null || Math.abs(mejora) < 0.1 ? undefined : (
          <Etiqueta tono={mejora > 0 ? 'bien' : 'mal'}>
            {mejora > 0 ? '▼' : '▲'}{' '}
            {Math.abs(mejora).toLocaleString('es-ES', { maximumFractionDigits: 1 })} min
          </Etiqueta>
        )
      }
      origen={`De que se marcha a que la cocina lo tacha · ${String(c.conTiempo)} platos con tiempo`}
    >
      <div className="flex flex-col gap-e3">
        <div className="grid grid-cols-2 gap-e3">
          <div className="rounded-grande bg-fondo p-e3">
            <p className="text-etiqueta text-texto-suave">Tiempo medio de salida</p>
            <p className="text-cifra-media font-bold tabular-nums">
              {(c.media ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })} min
            </p>
          </div>
          <div className="rounded-grande bg-fondo p-e3">
            <p className="text-etiqueta text-texto-suave">
              Tarde (más de {MINUTOS_PARA_IR_TARDE} min)
            </p>
            <p className="text-cifra-media font-bold tabular-nums">
              {c.tarde} {c.tarde === 1 ? 'plato' : 'platos'}
            </p>
            <p className="text-etiqueta text-texto-suave">
              {comoPorcentaje(c.tarde / c.conTiempo)} · {c.mesasConTarde}{' '}
              {c.mesasConTarde === 1 ? 'mesa' : 'mesas'}
            </p>
          </div>
        </div>
        {d.periodo !== 'dia' && (
          <Grafica
            titulo="El tiempo medio de cocina por día de la semana, frente al periodo anterior"
            datos={c.porDia.map((p) => ({
              dia: DIAS[p.dia - 1] ?? '',
              ahora: p.ahora ?? 0,
              antes: p.antes ?? 0,
            }))}
            eje="dia"
            forma="lineas"
            series={[
              { clave: 'ahora', nombre: 'Ahora', color: ACENTO },
              { clave: 'antes', nombre: 'Antes', color: ANTES },
            ]}
            alto={160}
            formato={(v) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })} min`}
            cuandoNoHay={null}
          />
        )}
        {c.masLentos.length > 0 && (
          <details className="text-secundario">
            <summary className="min-h-toque cursor-pointer py-e1 font-semibold">
              Los que más tardan
            </summary>
            <ol className="mt-e1 flex flex-col">
              {c.masLentos.map((p) => (
                <li
                  key={p.nombre}
                  className="flex items-center justify-between gap-e3 border-t border-borde py-e2 first:border-t-0"
                >
                  <span>
                    <b>{p.nombre}</b>
                    <span className="block text-etiqueta text-texto-suave">
                      {p.uds} vendidos · {p.tarde} tarde
                    </span>
                  </span>
                  <b className="tabular-nums">
                    {p.media.toLocaleString('es-ES', { maximumFractionDigits: 1 })} min
                  </b>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </Tarjeta>
  );
}

// ── Lo que se tuerce ─────────────────────────────────────────────────────────

function LoQueSeTuerce({ d }: { readonly d: Datos }) {
  if (!d.conTpv) {
    return (
      <Tarjeta titulo="Lo que se tuerce" acento={ACENTO}>
        <SinTpv que="Lo devuelto y las mesas que se van" />
      </Tarjeta>
    );
  }
  const t = d.seTuerce;
  return (
    <Tarjeta titulo="Lo que se tuerce" acento={ACENTO} origen={`Frente a ${frenteA(d.periodo)}`}>
      <div className="flex flex-col divide-y divide-borde">
        <Fila
          cuantos={t.devueltos.ahora}
          antes={t.devueltos.antes}
          que="Platos devueltos a cocina"
          tono="atencion"
        >
          <Motivos motivos={t.devueltos.motivos} />
        </Fila>
        <Fila
          cuantos={t.cambiados.ahora}
          antes={t.cambiados.antes}
          que="Cambiados por el cliente"
          tono="atencion"
        >
          <p className="text-secundario text-texto-suave">
            {t.cambiados.platos.join(', ')}.{' '}
            {t.cambiados.yaHechos > 0 &&
              `${String(t.cambiados.yaHechos)} ya estaban hechos: van a merma como «cambio del cliente».`}
          </p>
        </Fila>
        <Fila
          cuantos={t.quitados.ahora}
          antes={t.quitados.antes}
          que="Quitados después de mandar"
          tono="neutro"
        >
          <p className="text-secundario text-texto-suave">
            Cada uno con su motivo y quién lo quitó, en la mesa de Estook TPV.
          </p>
        </Fila>
        <Fila
          cuantos={t.anuladas.ahora}
          antes={t.anuladas.antes}
          que="Mesas que se anularon"
          tono="mal"
        >
          <Motivos motivos={t.anuladas.motivos} />
          {t.anuladas.personas > 0 && (
            <p className="text-secundario text-texto-suave">
              {t.anuladas.personas} personas en total.
            </p>
          )}
        </Fila>
      </div>
    </Tarjeta>
  );
}

function Fila({
  cuantos,
  antes,
  que,
  tono,
  children,
}: {
  readonly cuantos: number;
  readonly antes: number;
  readonly que: string;
  readonly tono: 'atencion' | 'mal' | 'neutro';
  readonly children: React.ReactNode;
}) {
  const diferencia = cuantos - antes;
  const cabecera = (
    <span className="flex flex-wrap items-center gap-e2">
      <Etiqueta tono={cuantos === 0 ? 'neutro' : tono}>{cuantos}</Etiqueta>
      <span className="text-cuerpo font-semibold">{que}</span>
      {diferencia !== 0 && (
        <span
          className={`text-etiqueta font-semibold ${diferencia > 0 ? 'text-mal' : 'text-bien'}`}
        >
          {diferencia > 0 ? '▲' : '▼'} {Math.abs(diferencia)}
        </span>
      )}
    </span>
  );
  if (cuantos === 0) return <div className="py-e3">{cabecera}</div>;
  return (
    <details className="py-e2">
      <summary className="flex min-h-toque cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">
        {cabecera}
      </summary>
      <div className="flex flex-col gap-e1 pb-e2">{children}</div>
    </details>
  );
}

function Motivos({
  motivos,
}: {
  readonly motivos: readonly { readonly motivo: string; readonly veces: number }[];
}) {
  const max = Math.max(1, ...motivos.map((m) => m.veces));
  return (
    <ul className="flex flex-col gap-e1">
      {motivos.map((m) => (
        <li
          key={m.motivo}
          className="grid grid-cols-[minmax(0,9rem)_1fr_1.5rem] items-center gap-e2 text-secundario"
        >
          <span className="truncate">{m.motivo}</span>
          <span aria-hidden className="h-[6px] overflow-hidden rounded-redondo bg-fondo">
            <span
              className="block h-full rounded-redondo"
              style={{ width: `${String((m.veces / max) * 100)}%`, background: ACENTO }}
            />
          </span>
          <b className="text-right tabular-nums">{m.veces}</b>
        </li>
      ))}
    </ul>
  );
}

// ── Las semanas ──────────────────────────────────────────────────────────────

function LasSemanas({ d }: { readonly d: Datos }) {
  const conDato = d.semanas.filter((s) => s.ventas !== null);
  const diaDicho = (f: string) =>
    new Date(`${f}T12:00:00Z`).toLocaleDateString('es-ES', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
    });
  return (
    <Tarjeta titulo="Las semanas" acento={ACENTO} origen="Las ocho semanas hasta esta, sin IVA">
      <div className="flex flex-col gap-e3">
        {conDato.length === 0 ? (
          <p className="text-secundario text-texto-suave">Sin ventas en estas semanas todavía.</p>
        ) : (
          <Grafica
            titulo="Lo vendido cada semana, sin IVA"
            datos={d.semanas.map((s) => ({
              semana: new Date(`${s.lunes}T12:00:00Z`).toLocaleDateString('es-ES', {
                timeZone: 'UTC',
                day: 'numeric',
                month: 'short',
              }),
              ventas: (s.ventas ?? 0) / 100,
            }))}
            eje="semana"
            forma="barras"
            series={[{ clave: 'ventas', nombre: 'Ventas', color: ACENTO }]}
            alto={170}
            formato={(v) => dinero(v * 100)}
            cuandoNoHay={null}
          />
        )}
        {(d.mejorDia !== null || d.peorDia !== null) && d.periodo !== 'dia' && (
          <div className="grid grid-cols-2 gap-e3">
            {d.mejorDia !== null && (
              <div className="rounded-grande bg-fondo p-e3">
                <p className="text-etiqueta text-texto-suave">El mejor día</p>
                <p className="text-cuerpo font-semibold first-letter:uppercase">
                  {diaDicho(d.mejorDia.dia)}
                </p>
                <p className="text-etiqueta tabular-nums text-texto-suave">
                  {dinero(d.mejorDia.ventas)}
                </p>
              </div>
            )}
            {d.peorDia !== null && (
              <div className="rounded-grande bg-fondo p-e3">
                <p className="text-etiqueta text-texto-suave">El más flojo</p>
                <p className="text-cuerpo font-semibold first-letter:uppercase">
                  {diaDicho(d.peorDia.dia)}
                </p>
                <p className="text-etiqueta tabular-nums text-texto-suave">
                  {dinero(d.peorDia.ventas)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Tarjeta>
  );
}
