import { useState } from 'react';
import { DIRECCION_DE_ESTOOK, elTextoSobreElColor } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Cargando,
  EstadoVacio,
  Hoja,
  Tarjeta,
  clases,
  fondoDegradado,
} from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { LasEtiquetasDelCliente, LosClientes, type MarcasDelCliente } from './LosClientes.tsx';

/**
 * **Servicio › Reservas** (la Ampliación 5 · 2, decisión 0153; Richi, 26-nov: «así el gerente puede vigilar las
 * reservas»). Lo de cada día, como lo ve la sala, sin tocar nada: se ponen y se cambian en Estook TPV.
 *
 * Arriba, **su web de reservas**: el enlace para copiar y **«¿Tienes web propia?»**, que da el código para
 * ponerlas dentro de ella —un botón «Reservar mesa» o las reservas en un hueco de su página— **con el color que
 * elija**, para que encaje con su marca. Sin logos: abajo, solo «Reservas con estook.com».
 *
 * Abajo, **los clientes** del local (la Ampliación 5 · 3): su ficha, con lo que sabe el TPV.
 */
const ACENTO = 'var(--color-app-servicio)';

interface UnaReserva {
  readonly id: string;
  readonly hora: string;
  readonly comensales: number;
  readonly nombre: string;
  readonly telefono: string;
  readonly nota: string | null;
  readonly origen: 'tpv' | 'web';
  readonly estado: 'reservada' | 'sentada' | 'cancelada' | 'no_vino';
  readonly mesas: readonly { readonly id: string; readonly nombre: string }[];
  readonly confirmada?: boolean;
  readonly canceladaPor?: 'local' | 'cliente' | 'sin_confirmar' | null;
  /** Su cliente (5 · 3). Una API de antes no lo dice. */
  readonly cliente?: MarcasDelCliente | null;
}

interface LasReservas {
  readonly hoy: string;
  readonly dia: string;
  readonly encendidas: boolean;
  readonly reservas: readonly UnaReserva[];
}

interface LosAjustes {
  readonly encendidas: boolean;
  readonly direccion: string | null;
}

function masDias(dia: string, dias: number): string {
  return new Date(Date.parse(`${dia}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

function elDia(dia: string, hoy: string): string {
  const fecha = new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  if (dia === hoy) return `Hoy, ${fecha}`;
  if (dia === masDias(hoy, 1)) return `Mañana, ${fecha}`;
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

export function Reservas() {
  const { yo } = usarSesion();
  const conTpv = yo?.cuenta?.conEstookTpv !== false;
  const [dia, setDia] = useState<string | null>(null);
  const lectura = usarLectura<LasReservas>(
    'las_reservas',
    dia === null ? {} : { dia },
    conTpv,
    true,
  );
  // Los ajustes los lee quien lleva los Ajustes del TPV: a los demás, sin la tarjeta de la web.
  const ajustes = usarLectura<LosAjustes>('los_ajustes_de_reservas', {}, conTpv);

  if (!conTpv) {
    return (
      <Tarjeta titulo="Reservas">
        <EstadoVacio
          compacto
          dibujo="candado"
          acento={ACENTO}
          titulo="Llega con Estook TPV"
          frase="Las reservas van sobre las mesas de Estook TPV, y por eso son del plan Pro."
          sinAccionPorque="Se ponen y se sientan en Estook TPV."
        />
      </Tarjeta>
    );
  }
  if (lectura.isPending) return <Cargando que="las reservas" lineas={4} />;
  const d = lectura.data;
  if (d === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer las reservas">
        Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }
  if (!d.encendidas) {
    return (
      <Tarjeta titulo="Reservas">
        <EstadoVacio
          compacto
          dibujo="reloj"
          acento={ACENTO}
          titulo="Las reservas están apagadas"
          frase="Se encienden en Estook TPV › Ajustes › Reservas. Desde ese momento salen aquí, con tu web de reservas."
          sinAccionPorque="Se encienden en Estook TPV."
        />
      </Tarjeta>
    );
  }

  const vivas = d.reservas.filter((r) => r.estado === 'reservada' || r.estado === 'sentada');
  const fuera = d.reservas.filter((r) => r.estado === 'cancelada' || r.estado === 'no_vino');
  const comensales = vivas.reduce((suma, r) => suma + r.comensales, 0);
  const porInternet = vivas.filter((r) => r.origen === 'web').length;
  const direccion = ajustes.data?.direccion ?? null;

  return (
    <div className="flex flex-col gap-e5">
      {direccion !== null && <TuWebDeReservas direccion={direccion} />}

      <section className="flex flex-col gap-e4">
        <div className="flex flex-wrap items-center justify-between gap-e3">
          <div className="flex items-center gap-e2">
            <Boton
              tono="secundario"
              tamano="s"
              aria-label="El día anterior"
              onClick={() => {
                setDia(masDias(d.dia, -1));
              }}
            >
              ‹
            </Boton>
            <h2 className="min-w-[13rem] text-center text-seccion font-bold">
              {elDia(d.dia, d.hoy)}
            </h2>
            <Boton
              tono="secundario"
              tamano="s"
              aria-label="El día siguiente"
              onClick={() => {
                setDia(masDias(d.dia, 1));
              }}
            >
              ›
            </Boton>
          </div>
          {d.dia !== d.hoy && (
            <Boton
              tono="texto"
              tamano="s"
              onClick={() => {
                setDia(null);
              }}
            >
              Volver a hoy
            </Boton>
          )}
        </div>

        <div className="grid grid-cols-3 gap-e3">
          <Cifra
            valor={vivas.length}
            texto={vivas.length === 1 ? 'reserva' : 'reservas'}
            degradado="fechas"
          />
          <Cifra valor={comensales} texto="comensales" degradado="vacaciones" />
          <Cifra valor={porInternet} texto="por internet" degradado="formacion" />
        </div>

        {vivas.length === 0 ? (
          <p className="rounded-grande bg-fondo p-e4 text-secundario text-texto-suave">
            Ese día no hay reservas.
          </p>
        ) : (
          <ul className="flex flex-col gap-e2">
            {vivas.map((r) => (
              <LaReserva key={r.id} r={r} />
            ))}
          </ul>
        )}
        {fuera.length > 0 && (
          <details className="rounded-grande bg-fondo p-e3">
            <summary className="cursor-pointer text-secundario font-semibold text-texto-suave">
              Canceladas y las que no vinieron ({String(fuera.length)})
            </summary>
            <ul className="mt-e3 flex flex-col gap-e2">
              {fuera.map((r) => (
                <LaReserva key={r.id} r={r} />
              ))}
            </ul>
          </details>
        )}
        <p className="text-etiqueta text-texto-tenue">
          Para poner, cambiar o sentar una reserva: Estook TPV › Reservas.
        </p>
      </section>

      <LosClientes />
    </div>
  );
}

function Cifra({
  valor,
  texto,
  degradado,
}: {
  readonly valor: number;
  readonly texto: string;
  readonly degradado: 'fechas' | 'vacaciones' | 'formacion';
}) {
  return (
    <div
      className="flex flex-col rounded-[18px] p-e3 text-white [box-shadow:var(--sombra-baldosa)]"
      style={fondoDegradado(degradado)}
    >
      <span className="text-cifra-media font-bold tabular-nums">{String(valor)}</span>
      <span className="text-etiqueta font-semibold text-white/85">{texto}</span>
    </div>
  );
}

function LaReserva({ r }: { readonly r: UnaReserva }) {
  const fuera = r.estado === 'cancelada' || r.estado === 'no_vino';
  const estado =
    r.estado === 'sentada'
      ? 'Sentada'
      : r.estado === 'no_vino'
        ? 'No vino'
        : r.estado === 'cancelada'
          ? r.canceladaPor === 'sin_confirmar'
            ? 'Se canceló sola'
            : r.canceladaPor === 'cliente'
              ? 'La canceló'
              : 'Cancelada'
          : r.confirmada === true
            ? 'Confirmada'
            : null;
  return (
    <li
      className={clases(
        'flex items-center gap-e3 rounded-grande border border-borde bg-superficie p-e3',
        fuera && 'opacity-60',
      )}
    >
      <span
        className="grid min-w-[64px] place-items-center rounded-medio px-e2 py-e2 text-cuerpo font-bold tabular-nums text-white"
        style={fondoDegradado('fechas')}
      >
        {r.hora}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-bold">
          {r.nombre} · {String(r.comensales)}
        </span>
        <span className="truncate text-secundario text-texto-suave">
          {r.mesas.length === 0 ? 'Sin mesa' : `Mesa ${r.mesas.map((m) => m.nombre).join(' + ')}`}
          {r.nota !== null ? ` · ${r.nota}` : ''}
        </span>
        {!fuera && <LasEtiquetasDelCliente cliente={r.cliente} />}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-e1">
        {r.origen === 'web' && (
          <span className="rounded-redondo bg-info-suave px-e2 py-[2px] text-etiqueta font-bold text-info">
            web
          </span>
        )}
        {estado !== null && (
          <span className="text-etiqueta font-semibold text-texto-suave">{estado}</span>
        )}
      </span>
    </li>
  );
}

// ═══ Tu web de reservas ═══════════════════════════════════════════════════════

function TuWebDeReservas({ direccion }: { readonly direccion: string }) {
  const [copiado, setCopiado] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const enlace = `${DIRECCION_DE_ESTOOK}/reservar/${direccion}`;
  return (
    <section
      className="flex flex-col gap-e4 rounded-[22px] p-e5 text-white [box-shadow:var(--sombra-baldosa)]"
      style={fondoDegradado('fechas')}
    >
      <div className="flex flex-col gap-e1">
        <span className="text-etiqueta font-bold uppercase tracking-[0.08em] text-white/80">
          Tu web de reservas
        </span>
        <span className="break-all text-seccion font-bold">{enlace.replace('https://', '')}</span>
        <span className="text-secundario text-white/85">
          Para tu Instagram, tu ficha de Google y WhatsApp.
        </span>
      </div>
      <div className="flex flex-wrap gap-e3">
        <button
          type="button"
          onClick={() => {
            if (!('clipboard' in navigator)) return;
            void navigator.clipboard.writeText(enlace).then(
              () => {
                setCopiado(true);
              },
              () => undefined,
            );
          }}
          className="min-h-toque rounded-grande bg-white px-e4 font-bold text-[#5433c4] transition-transform active:scale-[0.98]"
        >
          {copiado ? 'Copiado ✓' : 'Copiar el enlace'}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierta(true);
          }}
          className="min-h-toque rounded-grande border border-white/60 px-e4 font-bold text-white transition-transform active:scale-[0.98]"
        >
          ¿Tienes web propia? Pon tus reservas en ella
        </button>
      </div>
      <Hoja
        abierta={abierta}
        amplia
        titulo="Tus reservas, en tu web"
        alCerrar={() => {
          setAbierta(false);
        }}
      >
        <ElCodigoParaTuWeb direccion={direccion} />
      </Hoja>
    </section>
  );
}

const COLORES: readonly { readonly color: string; readonly nombre: string }[] = [
  { color: '#5433c4', nombre: 'Violeta' },
  { color: '#1d2a2e', nombre: 'Negro' },
  { color: '#c2410c', nombre: 'Teja' },
  { color: '#9f1239', nombre: 'Granate' },
  { color: '#11804f', nombre: 'Verde' },
  { color: '#2563eb', nombre: 'Azul' },
  { color: '#b45309', nombre: 'Mostaza' },
];

/**
 * **El código para su web**: primero cómo (un botón o dentro de la página) y **el color**, con cómo queda
 * delante; después el código, que ya lleva su dirección, para copiar y pegar.
 */
function ElCodigoParaTuWeb({ direccion }: { readonly direccion: string }) {
  const { yo } = usarSesion();
  const suyo = yo?.local?.colorDeMarca ?? null;
  const [forma, setForma] = useState<'boton' | 'dentro'>('boton');
  const [color, setColor] = useState(
    suyo !== null && /^#[0-9a-f]{6}$/i.test(suyo) ? suyo.toLowerCase() : '#5433c4',
  );
  const [copiado, setCopiado] = useState(false);
  const texto = elTextoSobreElColor(color);
  const nombre = yo?.local?.nombre ?? 'tu local';
  const codigo = [
    `<!-- Reservas de ${nombre} · Estook -->`,
    `<div data-estook-reservas="${direccion}" data-color="${color}" data-forma="${forma}"></div>`,
    `<script src="${DIRECCION_DE_ESTOOK}/carta/reservas.js" async></script>`,
  ].join('\n');
  const colores =
    suyo !== null && !COLORES.some((c) => c.color === suyo.toLowerCase())
      ? [{ color: suyo.toLowerCase(), nombre: 'El de tu marca' }, ...COLORES]
      : COLORES;

  return (
    <div className="flex flex-col gap-e5 px-e4 pb-e5 pt-e3">
      <Paso numero={1} titulo="Cómo la quieres">
        <div className="grid gap-e3 sm:grid-cols-2">
          <Opcion
            puesta={forma === 'boton'}
            titulo="Un botón «Reservar mesa»"
            frase="Al tocarlo, las reservas se abren encima de tu web, sin salir de ella."
            alElegir={() => {
              setForma('boton');
              setCopiado(false);
            }}
          />
          <Opcion
            puesta={forma === 'dentro'}
            titulo="Dentro de tu página"
            frase="Las reservas en un hueco de tu página, que crece solo con lo que ocupan."
            alElegir={() => {
              setForma('dentro');
              setCopiado(false);
            }}
          />
        </div>
      </Paso>

      <Paso numero={2} titulo="Tu color">
        <div role="radiogroup" aria-label="El color" className="flex flex-wrap items-center gap-e2">
          {colores.map((c) => (
            <button
              key={c.color}
              type="button"
              role="radio"
              aria-checked={color === c.color}
              aria-label={c.nombre}
              title={c.nombre}
              onClick={() => {
                setColor(c.color);
                setCopiado(false);
              }}
              className={clases(
                'size-[40px] rounded-redondo border-2 transition-transform active:scale-95',
                color === c.color ? 'border-texto ring-2 ring-texto/30' : 'border-transparent',
              )}
              style={{ backgroundColor: c.color }}
            />
          ))}
          <label className="flex items-center gap-e2 text-secundario font-semibold text-texto-suave">
            <input
              type="color"
              value={color}
              aria-label="Otro color"
              onChange={(e) => {
                setColor(e.target.value.toLowerCase());
                setCopiado(false);
              }}
              className="size-[40px] cursor-pointer rounded-redondo border border-borde bg-transparent"
            />
            Otro
          </label>
        </div>
        <Muestra forma={forma} color={color} texto={texto} />
      </Paso>

      <Paso numero={3} titulo="El código">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-grande bg-charcoal p-e4 font-mono text-etiqueta leading-relaxed text-white">
          {codigo}
        </pre>
        <Boton
          tono="principal"
          tamano="l"
          ancho
          onClick={() => {
            if (!('clipboard' in navigator)) return;
            void navigator.clipboard.writeText(codigo).then(
              () => {
                setCopiado(true);
              },
              () => undefined,
            );
          }}
        >
          {copiado ? 'Código copiado ✓' : 'Copiar el código'}
        </Boton>
        <p className="text-secundario text-texto-suave">
          Pégalo en tu web donde quieras que salga. En Wix, WordPress o Squarespace, en un bloque de
          «HTML» o «Código insertado». Ya va unido a tus reservas: lo que entra, sale en Estook TPV.
        </p>
      </Paso>
    </div>
  );
}

function Paso({
  numero,
  titulo,
  children,
}: {
  readonly numero: number;
  readonly titulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e3">
      <h3 className="flex items-center gap-e2 text-seccion font-bold">
        <span
          aria-hidden
          className="grid size-[26px] place-items-center rounded-redondo text-etiqueta font-bold text-white"
          style={fondoDegradado('fechas')}
        >
          {String(numero)}
        </span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Opcion({
  puesta,
  titulo,
  frase,
  alElegir,
}: {
  readonly puesta: boolean;
  readonly titulo: string;
  readonly frase: string;
  readonly alElegir: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={puesta}
      onClick={alElegir}
      className={clases(
        'flex flex-col gap-e1 rounded-grande border-2 p-e4 text-left transition-colors',
        puesta ? 'border-[#5433c4] bg-[#5433c4]/5' : 'border-borde bg-superficie',
      )}
    >
      <span className="font-bold">{titulo}</span>
      <span className="text-secundario text-texto-suave">{frase}</span>
    </button>
  );
}

/** Cómo queda en su web, con su color: el botón, o un trozo de las reservas. */
function Muestra({
  forma,
  color,
  texto,
}: {
  readonly forma: 'boton' | 'dentro';
  readonly color: string;
  readonly texto: string;
}) {
  return (
    <div className="flex flex-col gap-e2 rounded-grande border border-dashed border-borde-fuerte bg-fondo p-e4">
      <span className="text-etiqueta font-bold uppercase tracking-[0.06em] text-texto-tenue">
        Así se verá en tu web
      </span>
      {forma === 'boton' ? (
        <span
          className="self-start rounded-[12px] px-[22px] py-[14px] font-semibold shadow-[0_6px_16px_-8px_rgba(0,0,0,0.45)]"
          style={{ backgroundColor: color, color: texto }}
        >
          Reservar mesa
        </span>
      ) : (
        <div className="flex flex-col gap-e3 rounded-grande bg-[#f1efeb] p-e4 text-[#1d2a2e]">
          <span className="font-bold">¿Cuántos sois?</span>
          <div className="flex gap-e2">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className="grid size-[40px] place-items-center rounded-medio border font-semibold"
                style={
                  n === 2
                    ? { backgroundColor: color, color: texto, borderColor: color }
                    : { backgroundColor: '#ffffff', borderColor: '#ddd8cf' }
                }
              >
                {String(n)}
              </span>
            ))}
          </div>
          <span
            className="rounded-[12px] py-e3 text-center font-bold"
            style={{ backgroundColor: color, color: texto }}
          >
            Reservar
          </span>
          <span className="text-center text-etiqueta text-[#6b7478]">Reservas con estook.com</span>
        </div>
      )}
    </div>
  );
}
