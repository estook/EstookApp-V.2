import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { comoPorcentaje, enDinero } from '@estook/dominio';
import { puedeVer } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  Etiqueta,
  Segmentado,
  Tarjeta,
  clases,
} from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { LoQueSeVende, PlatoVendido } from './contratoDeLoQueSeVende.ts';
import { usarElPeriodo } from '../ganchos/usarElPeriodo.ts';
import { ElCambio, ElegirElPeriodo, comoSeLlamaElPeriodo, frenteA } from './elPeriodo.tsx';
import { CuantosDeCadaUno, TuCartaEnCuatro } from './TuCartaEnCuatro.tsx';

/**
 * Servicio › Jornadas › Información (la pausa del 8-nov, decisión 0142, con su maqueta aprobada).
 *
 * Richi: «en la sección "En marcha" cambiarlo todo, ya que es redundante esa información… Ahí
 * mostramos info de lo que se vende: cuántos platos salen de qué cosa, qué plato le sacas más
 * dinero, cuáles dan más beneficio. Todo bien integrado, con desplegables, que no sea mucho scroll».
 *
 * Arriba el periodo; si es hoy, **una línea en vivo** (lo único de «En marcha» que no estaba en el
 * Panel); cuatro cifras con su comparación; **una sola tarjeta con tres pestañas** —lo que más
 * sale, factura y deja—; por sección; lo que pide atención; y plegada, **tu carta en cuatro**.
 */
const ACENTO = 'var(--color-app-servicio)';

const dinero = enDinero;
const entero = (n: number) => n.toLocaleString('es-ES');

type Que = 'uds' | 'ventas' | 'margen';
type Cual = 'comida' | 'bebida' | 'todo';

export function Informacion() {
  const { permisos } = usarSesion();
  const navegar = useNavigate();
  const elPeriodo = usarElPeriodo('dia');
  const ve = puedeVer(permisos, 'dato.ventas');
  const lectura = usarLectura<LoQueSeVende>('lo_que_se_vende', elPeriodo.parametros, ve, true);

  if (!ve) {
    return (
      <Tarjeta titulo="Información">
        <EstadoVacio
          compacto
          dibujo="candado"
          titulo="Esto no lo llevas tú"
          frase="Lo que se vende lo ve quien ve las ventas del local."
          sinAccionPorque="Tu acceso no incluye las ventas."
        />
      </Tarjeta>
    );
  }
  if (lectura.isPending) return <Cargando que="lo que se vende" forma="cifra" alto lineas={4} />;
  const d = lectura.data;
  if (d === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer lo que se vende">
        Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }

  const frente = frenteA(d.periodo);
  return (
    <div className="flex flex-col gap-e4">
      <ElegirElPeriodo
        periodo={d.periodo}
        titulo={comoSeLlamaElPeriodo(d.periodo, d.desde, d.hasta, d.hoy)}
        anteriorDel={d.anteriorDel}
        siguienteDel={d.siguienteDel}
        alElegir={elPeriodo.elegir}
        alIr={elPeriodo.irA}
      />

      {d.ahoraMismo !== null && (
        <div className="flex flex-wrap items-center gap-x-e4 gap-y-e1 rounded-mayor border border-borde bg-superficie px-e4 py-e3 text-cuerpo [box-shadow:var(--sombra-tarjeta)]">
          <Etiqueta tono="bien">Ahora</Etiqueta>
          <span>
            <b>{d.ahoraMismo.mesas}</b>{' '}
            {d.ahoraMismo.mesas === 1 ? 'mesa abierta' : 'mesas abiertas'} ·{' '}
            <b>{d.ahoraMismo.personas}</b> personas
          </span>
          <span>
            <b>{d.ahoraMismo.enCocina}</b> en cocina
          </span>
          {d.ahoraMismo.minutosDeCocina !== null && (
            <span>
              La cocina, a <b>{d.ahoraMismo.minutosDeCocina} min</b> de media hoy
            </span>
          )}
        </div>
      )}

      {d.origen === 'nada' ? (
        <Tarjeta>
          <EstadoVacio
            compacto
            dibujo="libro"
            acento={ACENTO}
            titulo="Todavía no hay ventas en este periodo"
            frase="Salen solas de las mesas de Estook TPV, o de tus cierres de caja."
            sinAccionPorque="Las ventas llegan del TPV o del cierre."
          />
        </Tarjeta>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-e3 md:grid-cols-4">
            <Cifra que="Ventas sin IVA" cifra={d.cifras.ventas} como={dinero} frente={frente} />
            <Cifra que="Platos de comida" cifra={d.cifras.platos} como={entero} frente={frente} />
            <Cifra que="Ticket medio" cifra={d.cifras.ticketMedio} como={dinero} frente={frente} />
            <Cifra que="Personas" cifra={d.cifras.personas} como={entero} frente={frente} />
          </div>

          <div className="grid gap-e4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <LoQueMas platos={d.platos} conMargen={d.conMargen} />
            <div className="flex flex-col gap-e4">
              {d.secciones.length > 0 && <PorSeccion secciones={d.secciones} />}
              {(d.sinEscandallo.platos > 0 || d.origen === 'cierre') && (
                <Tarjeta titulo="Lo que pide atención">
                  <div className="flex flex-col gap-e2">
                    {d.conMargen && d.sinEscandallo.platos > 0 && d.origen === 'tpv' && (
                      <Aviso
                        tono="atencion"
                        titulo={`${String(d.sinEscandallo.platos)} ${d.sinEscandallo.platos === 1 ? 'plato' : 'platos'} sin escandallo`}
                        accion={
                          <Boton
                            tono="secundario"
                            onClick={() => {
                              navegar('/escandallos/escandallos');
                            }}
                          >
                            Hacerlos
                          </Boton>
                        }
                      >
                        Venden {dinero(d.sinEscandallo.ventas)} y no sé cuánto te dejan.
                      </Aviso>
                    )}
                    {d.origen === 'cierre' && (
                      <Aviso tono="info" titulo="De tus cierres de caja">
                        Con las mesas de Estook TPV salen también las secciones y lo que deja cada
                        plato.
                      </Aviso>
                    )}
                  </div>
                </Tarjeta>
              )}
            </div>
          </div>

          {d.conMargen && d.origen === 'tpv' && (
            <details className="group rounded-mayor border border-borde bg-superficie [box-shadow:var(--sombra-tarjeta)]">
              <summary className="flex min-h-[64px] cursor-pointer list-none flex-wrap items-center justify-between gap-e3 px-e4 py-e3 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-col">
                  <span className="text-seccion font-semibold">Tu carta en cuatro</span>
                  <span className="text-secundario text-texto-suave">
                    Cada plato según lo que se vende y lo que te deja. Solo la comida.
                  </span>
                </span>
                <CuantosDeCadaUno platos={d.platos} />
              </summary>
              <div className="@container border-t border-borde p-e4">
                <TuCartaEnCuatro platos={d.platos} />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Cifra({
  que,
  cifra,
  como,
  frente,
}: {
  readonly que: string;
  readonly cifra: { readonly ahora: number | null; readonly antes: number | null };
  readonly como: (n: number) => string;
  readonly frente: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[2px] rounded-mayor border border-borde bg-superficie p-e3 [box-shadow:var(--sombra-tarjeta)]">
      <span className="text-etiqueta font-medium text-texto-suave">{que}</span>
      <span className="text-cifra-media font-bold tabular-nums">
        {cifra.ahora === null ? '—' : como(cifra.ahora)}
      </span>
      <ElCambio ahora={cifra.ahora} antes={cifra.antes} frente={frente} />
    </div>
  );
}

const EXPLICA: Readonly<Record<Que, string>> = {
  uds: 'Las raciones vendidas.',
  ventas: 'Lo que ha facturado cada plato, sin IVA.',
  margen: 'Lo que te deja: lo facturado menos lo que cuesta hacerlo.',
};

function LoQueMas({
  platos,
  conMargen,
}: {
  readonly platos: readonly PlatoVendido[];
  readonly conMargen: boolean;
}) {
  const [que, setQue] = useState<Que>('uds');
  const [cual, setCual] = useState<Cual>('comida');
  const [todos, setTodos] = useState(false);
  const hayBebida = platos.some((p) => p.bebida);
  const elegidos = platos
    .filter((p) => cual === 'todo' || (cual === 'bebida') === p.bebida)
    .filter((p) => que !== 'margen' || p.margen !== null)
    .slice()
    .sort((a, b) => valor(b, que) - valor(a, que));
  const vistos = todos ? elegidos : elegidos.slice(0, 6);
  const maximo = Math.max(1, ...vistos.map((p) => valor(p, que)));

  return (
    <Tarjeta>
      <div className="flex flex-col gap-e3">
        <div className="flex flex-wrap items-center justify-between gap-e2">
          <Segmentado
            etiqueta="Qué se mira"
            opciones={[
              { valor: 'uds' as const, texto: 'Sale más' },
              { valor: 'ventas' as const, texto: 'Factura más' },
              ...(conMargen ? [{ valor: 'margen' as const, texto: 'Deja más' }] : []),
            ]}
            valor={que}
            alElegir={(q) => {
              setQue(q);
              setTodos(false);
            }}
          />
          {hayBebida && (
            <Segmentado
              etiqueta="Comida o bebida"
              opciones={[
                { valor: 'comida' as const, texto: 'Comida' },
                { valor: 'bebida' as const, texto: 'Bebida' },
                { valor: 'todo' as const, texto: 'Todo' },
              ]}
              valor={cual}
              alElegir={(c) => {
                setCual(c);
                setTodos(false);
              }}
            />
          )}
        </div>
        <p className="text-secundario text-texto-suave">{EXPLICA[que]}</p>
        {vistos.length === 0 ? (
          <p className="text-secundario text-texto-suave">
            {que === 'margen'
              ? 'Ningún plato de aquí tiene escandallo todavía.'
              : 'Nada vendido de esto en el periodo.'}
          </p>
        ) : (
          <ol className="flex flex-col">
            {vistos.map((p, i) => (
              <li
                key={p.id}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-e3 border-t border-borde py-e2 first:border-t-0"
              >
                <span className="text-center text-etiqueta font-bold text-texto-tenue">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-cuerpo font-semibold">{p.nombre}</span>
                  <span
                    aria-hidden
                    className="mt-e1 block h-[6px] overflow-hidden rounded-redondo bg-fondo"
                  >
                    <span
                      className="block h-full rounded-redondo"
                      style={{
                        width: `${String(Math.max(2, (valor(p, que) / maximo) * 100))}%`,
                        background: ACENTO,
                      }}
                    />
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block text-cuerpo font-bold">
                    {que === 'uds' ? entero(p.uds) : dinero(valor(p, que))}
                  </span>
                  <span className="block text-etiqueta text-texto-suave">
                    {que === 'uds'
                      ? dinero(p.ventas)
                      : que === 'ventas'
                        ? `${entero(p.uds)} uds`
                        : p.margenPorUnidad === null
                          ? ''
                          : `${dinero(p.margenPorUnidad)} cada uno`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {elegidos.length > 6 && (
          <div>
            <Boton
              tono="texto"
              onClick={() => {
                setTodos((t) => !t);
              }}
            >
              {todos ? 'Ver menos' : `Ver los ${String(elegidos.length)}`}
            </Boton>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

function valor(p: PlatoVendido, que: Que): number {
  return que === 'uds' ? p.uds : que === 'ventas' ? p.ventas : (p.margen ?? 0);
}

const COLORES = [
  'var(--color-app-servicio)',
  'var(--color-info)',
  'var(--color-atencion)',
  'var(--color-texto-tenue)',
  'var(--color-bien)',
];

function PorSeccion({
  secciones,
}: {
  readonly secciones: readonly { readonly nombre: string; readonly ventas: number }[];
}) {
  // Las cuatro más grandes con su color; el resto, junto en «Lo demás» (nunca un color nuevo).
  const grandes = secciones.slice(0, 4);
  const resto = secciones.slice(4).reduce((s, x) => s + x.ventas, 0);
  const todas = resto > 0 ? [...grandes, { nombre: 'Lo demás', ventas: resto }] : grandes;
  const total = Math.max(
    1,
    todas.reduce((s, x) => s + x.ventas, 0),
  );
  return (
    <Tarjeta titulo="Por sección" origen="De lo vendido, sin IVA">
      <div className="flex flex-col gap-e3">
        <div className="flex h-[14px] gap-[2px] overflow-hidden rounded-redondo" aria-hidden>
          {todas.map((s, i) => (
            <span
              key={s.nombre}
              title={`${s.nombre}: ${dinero(s.ventas)}`}
              style={{ flex: Math.max(s.ventas, 1), background: COLORES[i] }}
            />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-e4 gap-y-e1 text-secundario">
          {todas.map((s, i) => (
            <li key={s.nombre} className="flex items-center justify-between gap-e2">
              <span className="flex min-w-0 items-center gap-e2">
                <span
                  aria-hidden
                  className={clases('size-[10px] shrink-0 rounded-[3px]')}
                  style={{ background: COLORES[i] }}
                />
                <span className="truncate">{s.nombre}</span>
              </span>
              <b className="tabular-nums">{comoPorcentaje(s.ventas / total)}</b>
            </li>
          ))}
        </ul>
      </div>
    </Tarjeta>
  );
}
