import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { usarLaEtiqueta, type LaEtiqueta } from '../../ganchos/usarLaEtiqueta.ts';
import { useNavigate } from 'react-router-dom';
import { IconoFlechaAbajo, IconoFlechaArriba, IconoFlechaDerecha } from '@estook/iconos';
import { Boton, clases } from '@estook/ui';

/**
 * Las piezas del Panel (el rediseño, entrega 3 · la maqueta aprobada, pestaña «El Panel»).
 *
 * Una tarjeta para todo (`Tarjeta`) con su cabecera de la maqueta —el icono en su pastilla, el
 * título y la flecha que lleva a su app—, y lo que va dentro: la cifra grande, la tendencia, las
 * barras de objetivo, las listas, las siluetas del primer día y las gráficas.
 *
 * ── Lo que dice cada cosa al pasar el ratón o al tocarla ────────────────────
 *
 * Richi, 18-nov: «las gráficas dicen lo suyo al pasar el ratón o al tocarlas». Todo lo que lleva
 * `data-tip` (una columna, un trozo de la barra de canales, un objetivo, lo que se escapa) enseña
 * su etiqueta: con el ratón al pasar; con el dedo al tocar, y **arrastrando** va de una a otra,
 * como en las apps de la bolsa; con el teclado, al llegar con el tabulador. La etiqueta sale
 * **encima del dedo**, para que no la tape, y **nunca se sale de la tarjeta** (lo que pasaba con
 * Recharts, 0084).
 */

// ── La etiqueta ─────────────────────────────────────────────────────────────────

/** Lo que lleva un elemento para enseñar su etiqueta: `{...conTip('Lunes 16', 'Ventas 2.210 €')}`. */
export function conTip(titulo: string, texto: string) {
  return { 'data-tip': titulo, 'data-tip-texto': texto } as const;
}

function Bocadillo({ etiqueta }: { readonly etiqueta: LaEtiqueta }) {
  const el = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(etiqueta.x);
  // Que no se salga de la tarjeta: se mide y se corre hacia dentro.
  useLayoutEffect(() => {
    const bocadillo = el.current;
    const tarjeta = bocadillo?.parentElement;
    if (bocadillo === null || tarjeta === null || tarjeta === undefined) return;
    const ancho = bocadillo.offsetWidth;
    const max = tarjeta.clientWidth - ancho - 8;
    setX(Math.max(8, Math.min(etiqueta.x - ancho / 2, max)));
  }, [etiqueta.x, etiqueta.titulo, etiqueta.texto]);

  return (
    <div
      ref={el}
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute z-10 max-w-[16rem] rounded-medio bg-texto px-e3 py-e2 text-etiqueta leading-snug text-superficie shadow-s3"
      style={{
        left: x,
        top: etiqueta.debajo ? etiqueta.y + 36 : etiqueta.y,
        transform: etiqueta.debajo ? undefined : 'translateY(-100%)',
      }}
    >
      <b className="block text-secundario font-bold">{etiqueta.titulo}</b>
      {etiqueta.texto}
    </div>
  );
}

// ── La tarjeta ──────────────────────────────────────────────────────────────────

export interface TarjetaProps {
  readonly titulo: string;
  readonly icono: ReactNode;
  /** A dónde lleva la flecha de la esquina. */
  readonly ir?: string | undefined;
  /**
   * A dónde lleva la tarjeta entera, sin flecha (las cifras, como la maqueta): se toca la tarjeta.
   */
  readonly lleva?: string | undefined;
  /** Lo de la derecha del título: «esta semana», una leyenda. */
  readonly derecha?: ReactNode | undefined;
  /** En naranja: lo primero que se mira de su puesto. */
  readonly destacado?: boolean;
  /** Lo que se está leyendo, para decir que no se ha podido. */
  readonly leyendo?: { readonly isError: boolean; readonly refetch: () => unknown } | undefined;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Tarjeta({
  titulo,
  icono,
  ir,
  lleva,
  derecha,
  destacado = false,
  leyendo,
  className,
  children,
}: TarjetaProps) {
  const navegar = useNavigate();
  const { caja, etiqueta, oyentes } = usarLaEtiqueta();

  return (
    <section
      ref={caja}
      aria-label={titulo}
      {...oyentes}
      className={clases(
        '@container relative flex h-full min-w-0 flex-col rounded-mayor border p-e4',
        destacado
          ? 'border-naranja bg-naranja text-sobre-naranja'
          : 'border-borde bg-superficie [box-shadow:var(--sombra-tarjeta)]',
        className,
      )}
    >
      <header className="mb-e2 flex min-h-8 items-center gap-e2">
        <span
          aria-hidden
          className={clases(
            'grid size-[30px] shrink-0 place-items-center rounded-medio [&_svg]:size-[17px]',
            destacado ? 'bg-texto/15 text-sobre-naranja' : 'bg-fondo text-texto-suave',
          )}
        >
          {icono}
        </span>
        {/* En una tarjeta estrecha (dos cifras por fila en el móvil) el título baja a dos líneas
            en vez de cortarse: «Merma de la semana» se lee entero. */}
        <h2 className="min-w-0 truncate text-cuerpo font-bold leading-tight tracking-[-0.01em] @max-[13rem]:line-clamp-2 @max-[13rem]:whitespace-normal">
          {lleva === undefined ? (
            titulo
          ) : (
            <button
              type="button"
              onClick={() => {
                navegar(lleva);
              }}
              title={`Ver ${titulo.toLowerCase()}`}
              className="max-w-full truncate rounded-chico text-left decoration-2 underline-offset-4 hover:underline focus-visible:underline"
            >
              {titulo}
            </button>
          )}
        </h2>
        <span className="flex-1" />
        {derecha !== undefined && (
          <span
            className={clases(
              'shrink-0 text-etiqueta font-semibold @max-[15rem]:hidden',
              destacado ? 'text-sobre-naranja/80' : 'text-texto-tenue',
            )}
          >
            {derecha}
          </span>
        )}
        {ir !== undefined && (
          <button
            type="button"
            onClick={() => {
              navegar(ir);
            }}
            aria-label={`Ver ${titulo.toLowerCase()}`}
            title={`Ver ${titulo.toLowerCase()}`}
            className={clases(
              'relative grid size-[30px] shrink-0 place-items-center rounded-redondo border transition-colors duration-[--rapido]',
              'before:absolute before:-inset-[7px] before:content-[""]',
              destacado
                ? 'border-texto/20 text-sobre-naranja hover:bg-texto/10'
                : 'border-borde text-texto-suave hover:bg-fondo hover:text-texto',
            )}
          >
            <IconoFlechaDerecha size={15} />
          </button>
        )}
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {leyendo?.isError === true ? <NoSeHaPodidoLeer reintentar={leyendo.refetch} /> : children}
      </div>
      {etiqueta !== null && <Bocadillo etiqueta={etiqueta} />}
    </section>
  );
}

function NoSeHaPodidoLeer({ reintentar }: { readonly reintentar: () => unknown }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-e2">
      <p className="text-secundario text-texto-suave">No he podido leerlo.</p>
      <Boton
        tono="secundario"
        onClick={() => {
          void reintentar();
        }}
      >
        Volver a intentarlo
      </Boton>
    </div>
  );
}

// ── La cifra, la tendencia y las barras ─────────────────────────────────────────

// Con el punto de los miles siempre («1.854 €», no «1854 €»), como la maqueta y la caja.
const EUROS = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });
const CON_CENTIMOS = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

/** «12.392 €», sin céntimos: lo de una semana o una gráfica. */
export function euros(centimos: number): string {
  // Intl redondea al pintar: el importe sigue en céntimos enteros (regla 9).
  return `${EUROS.format(centimos / 100)} €`;
}

/** «1.842,30 €», con céntimos. */
export function eurosConCentimos(centimos: number): string {
  return `${CON_CENTIMOS.format(centimos / 100)} €`;
}

/**
 * Un número para pintar, sin decimales: minutos, por cientos, lo que dice una barra. **Nunca dinero**:
 * el dinero se pinta con `euros`, y se cuenta en céntimos enteros con los motores del dominio.
 */
export function entero(n: number): number {
  return Number(n.toFixed(0));
}

/** Con un decimal, para pintar: «2,5». */
export function conUnDecimal(n: number): number {
  return Number(n.toFixed(1));
}

const COMPACTO = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });

/** El eje de una gráfica de euros: «1,5 mil». */
export function eurosEnCorto(centimos: number): string {
  return COMPACTO.format(centimos / 100);
}

/** «29,4 %». */
export function porCiento(valor: number, decimales = 1): string {
  return `${valor.toFixed(decimales).replace('.', ',').replace(/,0$/, '')} %`;
}

/** La cifra grande, con lo pequeño detrás: «1.842<small>,30 €</small>». */
export function Cifra({
  children,
  pequeno,
  apagada = false,
  className,
}: {
  readonly children: ReactNode;
  readonly pequeno?: ReactNode;
  readonly apagada?: boolean;
  readonly className?: string;
}) {
  return (
    <p
      className={clases(
        'text-[calc(30px*var(--escala))] font-extrabold leading-[1.1] tracking-[-0.02em] tabular-nums @max-[14rem]:text-[calc(26px*var(--escala))]',
        apagada && 'opacity-50',
        className,
      )}
    >
      {children}
      {pequeno !== undefined && (
        <small className="text-[calc(15px*var(--escala))] font-bold tracking-normal">
          {pequeno}
        </small>
      )}
    </p>
  );
}

/** «1.842» y «,30 €», para pintar los céntimos en pequeño. */
export function partesDeLaCifra(centimos: number): readonly [string, string] {
  const entera = Math.trunc(centimos / 100);
  const resto = Math.abs(centimos % 100);
  return [EUROS.format(entera), `,${String(resto).padStart(2, '0')} €`];
}

export type SentidoDeLaTendencia = 'bien' | 'mal' | 'igual';

/** «▲ +12 % vs. el miércoles pasado»: en verde si es buena noticia, en rojo si no. */
export function Tendencia({
  sentido,
  sube,
  children,
  detalle,
  destacado = false,
}: {
  readonly sentido: SentidoDeLaTendencia;
  /** La flecha: si la cifra sube o baja (que no es lo mismo que si es buena noticia). */
  readonly sube: boolean | null;
  readonly children: ReactNode;
  readonly detalle?: ReactNode;
  readonly destacado?: boolean;
}) {
  const color = destacado
    ? 'text-sobre-naranja'
    : sentido === 'bien'
      ? 'text-bien'
      : sentido === 'mal'
        ? 'text-mal'
        : 'text-texto-suave';
  return (
    <p className={clases('flex flex-wrap items-center gap-x-1 text-etiqueta font-bold', color)}>
      {sube === true && <IconoFlechaArriba size={14} aria-hidden />}
      {sube === false && <IconoFlechaAbajo size={14} aria-hidden />}
      <span>{children}</span>
      {detalle !== undefined && (
        <span
          className={clases(
            'font-medium',
            destacado ? 'text-sobre-naranja/75' : 'text-texto-tenue',
          )}
        >
          {detalle}
        </span>
      )}
    </p>
  );
}

/**
 * Una barra de objetivo: lo llevado frente a la meta, y si se da, **la rayita de dónde se debería ir**
 * a estas alturas (Richi, 21-nov): por delante o por detrás, de un vistazo.
 */
export function BarraDeObjetivo({
  parte,
  marca,
  color = 'var(--color-bien)',
  fondo,
  alto = 6,
  colorDeLaMarca,
  etiqueta,
}: {
  /** De 0 a 1 (o más, si se pasa). */
  readonly parte: number;
  /** Dónde se debería ir, de 0 a 1. */
  readonly marca?: number | null | undefined;
  readonly color?: string | undefined;
  readonly fondo?: string | undefined;
  readonly alto?: number;
  /** El color de la rayita: blanca sobre la tarjeta naranja, donde la barra ya es oscura. */
  readonly colorDeLaMarca?: string | undefined;
  readonly etiqueta: string;
}) {
  const ancho = Math.max(0, Math.min(1, parte)) * 100;
  return (
    <div
      role="meter"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={entero(Math.max(0, parte) * 100)}
      className="relative w-full overflow-visible rounded-redondo"
      style={{ height: alto, background: fondo ?? 'var(--color-fondo)' }}
    >
      <i
        className="block h-full rounded-redondo transition-[width] duration-[--lento] ease-curva"
        style={{ width: `${String(ancho)}%`, background: color }}
      />
      {marca !== undefined && marca !== null && (
        <span
          aria-hidden
          className="absolute -top-[3px] w-[4px] rounded-redondo shadow-[0_0_0_1.5px_var(--color-texto)]"
          style={{
            left: `calc(${String(Math.max(0, Math.min(1, marca)) * 100)}% - 2px)`,
            height: alto + 6,
            background: colorDeLaMarca ?? 'var(--color-texto)',
          }}
        />
      )}
    </div>
  );
}

// ── Las listas ─────────────────────────────────────────────────────────────────

export type TonoDeLaFila = 'mal' | 'atencion' | 'info' | 'bien' | 'neutro' | 'naranja';

const FONDO_DEL_TONO: Readonly<Record<TonoDeLaFila, string>> = {
  mal: 'bg-mal-suave text-mal',
  atencion: 'bg-atencion-suave text-atencion',
  info: 'bg-info-suave text-info',
  bien: 'bg-bien-suave text-bien',
  neutro: 'bg-fondo text-texto-suave',
  naranja: 'bg-naranja-suave text-naranja',
};

/** Una fila de lista de la maqueta: su icono en su color, lo que es, debajo el detalle, y a la derecha su cifra. */
export function Fila({
  icono,
  tono,
  titulo,
  detalle,
  cifra,
  colorDeLaCifra,
  tip,
}: {
  readonly icono: ReactNode;
  readonly tono: TonoDeLaFila;
  readonly titulo: ReactNode;
  readonly detalle?: ReactNode;
  readonly cifra?: ReactNode;
  readonly colorDeLaCifra?: string;
  readonly tip?: readonly [string, string];
}) {
  return (
    <li
      className="flex min-w-0 items-center gap-e3 rounded-medio outline-none focus-visible:ring-2 focus-visible:ring-naranja"
      {...(tip === undefined ? {} : { ...conTip(tip[0], tip[1]), tabIndex: 0 })}
    >
      <i
        aria-hidden
        className={clases(
          'grid size-7 shrink-0 place-items-center rounded-medio not-italic [&_svg]:size-[15px]',
          FONDO_DEL_TONO[tono],
        )}
      >
        {icono}
      </i>
      <span className="min-w-0 flex-1 text-secundario leading-tight">
        <span className="block truncate font-semibold">{titulo}</span>
        {detalle !== undefined && (
          <small className="block truncate text-etiqueta text-texto-tenue">{detalle}</small>
        )}
      </span>
      {cifra !== undefined && (
        <em
          className="shrink-0 text-secundario font-bold not-italic tabular-nums"
          style={colorDeLaCifra === undefined ? undefined : { color: colorDeLaCifra }}
        >
          {cifra}
        </em>
      )}
    </li>
  );
}

export function Lista({ children }: { readonly children: ReactNode }) {
  return <ul className="flex flex-col gap-[7px]">{children}</ul>;
}

/** Lo que queda cuando no hay nada: una frase tranquila, nunca un hueco. */
export function NadaQueVer({ children }: { readonly children: ReactNode }) {
  return <p className="flex flex-1 items-center text-secundario text-texto-suave">{children}</p>;
}

// ── La silueta del primer día ──────────────────────────────────────────────────

/**
 * **La silueta del primer día** (aceptada el 18-nov): lo que habrá aquí, en una frase, y **el paso
 * que lo llena**, con su botón. Nunca un «0,00 €» que parece una cifra (M5) ni un hueco.
 */
export function Silueta({
  icono,
  children,
  paso,
}: {
  readonly icono: ReactNode;
  readonly children: ReactNode;
  readonly paso?:
    { readonly texto: string; readonly ir?: string; readonly alPulsar?: () => void } | undefined;
}) {
  const navegar = useNavigate();
  return (
    <div className="flex min-h-[7rem] flex-1 flex-col items-center justify-center gap-e2 rounded-grande border-[1.5px] border-dashed border-borde p-e3 text-center text-secundario leading-snug text-texto-suave">
      <span aria-hidden className="text-texto-tenue [&_svg]:size-[26px]">
        {icono}
      </span>
      <span className="max-w-[22rem]">{children}</span>
      {paso !== undefined && (
        <button
          type="button"
          onClick={() => {
            if (paso.alPulsar !== undefined) paso.alPulsar();
            else if (paso.ir !== undefined) navegar(paso.ir);
          }}
          className="min-h-[2rem] rounded-redondo bg-naranja px-e3 text-etiqueta font-bold text-sobre-naranja transition-[filter] duration-[--rapido] hover:brightness-95"
        >
          {paso.texto}
        </button>
      )}
    </div>
  );
}

// ── El medidor de la maqueta ────────────────────────────────────────────────────

/** Medio anillo en trozos: el equipo (trabajando, en pausa, falta) o cómo se cobra. */
export function MedioAnillo({
  partes,
  centro,
  debajo,
  etiqueta,
}: {
  readonly partes: readonly {
    readonly valor: number;
    readonly color: string;
    readonly nombre: string;
  }[];
  readonly centro: string;
  readonly debajo: string;
  readonly etiqueta: string;
}) {
  const R = 70;
  const cx = 90;
  const cy = 86;
  const total = partes.reduce((s, p) => s + p.valor, 0);
  let a0 = 180;
  const arcos =
    total === 0
      ? []
      : partes
          .filter((p) => p.valor > 0)
          .map((p) => {
            const a1 = a0 + (p.valor / total) * 180;
            const r0 = (a0 * Math.PI) / 180;
            const r1 = ((a1 - (a1 < 360 ? 1.5 : 0)) * Math.PI) / 180;
            const d = `M${String(cx + R * Math.cos(r0))} ${String(cy + R * Math.sin(r0))} A${String(R)} ${String(R)} 0 0 1 ${String(cx + R * Math.cos(r1))} ${String(cy + R * Math.sin(r1))}`;
            a0 = a1;
            return { d, p };
          });
  return (
    <svg
      viewBox="0 0 180 100"
      role="img"
      aria-label={etiqueta}
      className="mx-auto block w-full max-w-[12rem]"
    >
      <path
        d={`M${String(cx - R)} ${String(cy)} A${String(R)} ${String(R)} 0 0 1 ${String(cx + R)} ${String(cy)}`}
        fill="none"
        stroke="var(--color-fondo)"
        strokeWidth="16"
      />
      {arcos.map(({ d, p }) => (
        <path key={p.nombre} d={d} fill="none" stroke={p.color} strokeWidth="16" />
      ))}
      <text
        x="90"
        y="78"
        textAnchor="middle"
        fontSize="24"
        fontWeight="800"
        fill="var(--color-texto)"
      >
        {centro}
      </text>
      <text
        x="90"
        y="95"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="600"
        fill="var(--color-texto-tenue)"
      >
        {debajo}
      </text>
    </svg>
  );
}

/** La leyenda de un medio anillo, con la cifra de cada trozo a la derecha. */
export function Leyenda({
  filas,
}: {
  readonly filas: readonly {
    readonly color: string;
    readonly nombre: string;
    readonly cifra: string;
  }[];
}) {
  return (
    <ul className="mt-e2 flex flex-col gap-[6px] text-etiqueta font-semibold">
      {filas.map((f) => (
        <li key={f.nombre} className="flex items-center gap-e2">
          <i
            aria-hidden
            className="size-[10px] shrink-0 rounded-redondo"
            style={{ background: f.color }}
          />
          <span className="min-w-0 truncate">{f.nombre}</span>
          <em className="ml-auto not-italic tabular-nums text-texto-suave">{f.cifra}</em>
        </li>
      ))}
    </ul>
  );
}

// ── Las gráficas ────────────────────────────────────────────────────────────────

export interface PuntoDelPanel {
  /** La letra del eje: «L», «13». */
  readonly eje: string;
  /** Lo que dice la etiqueta: «Lunes 16», «De 13:00 a 14:00». */
  readonly titulo: string;
  readonly texto: string;
  readonly linea?: number | null;
  readonly barra?: number | null;
}

const ANCHO = 560;
const ALTO = 170;
const X0 = 44;

/** Las rayas del eje: cuatro números redondos hasta un poco más del máximo. */
export function lasRayas(maximo: number, minimo = 0): readonly number[] {
  const rango = Math.max(1, maximo - minimo);
  const bruto = rango / 3;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const desde = Math.floor(minimo / paso) * paso;
  return [0, 1, 2, 3].map((i) => desde + i * paso);
}

/**
 * La gráfica grande del Panel: una línea con su área en naranja y, si se dan, unas barras detrás
 * (las compras) y la raya del objetivo. Dibujada a mano —nada de Recharts en el Panel, que es lo
 * que más se abre (0084)—, escala al ancho de su tarjeta y **cada columna dice lo suyo** al pasar
 * el ratón, al tocarla o al arrastrar el dedo. El punto de hoy, resaltado.
 */
export function GraficaDelPanel({
  puntos,
  formato,
  resaltar,
  objetivo,
  minimo,
  titulo,
  soloBarras = false,
}: {
  readonly puntos: readonly PuntoDelPanel[];
  readonly formato: (n: number) => string;
  /** El índice que se resalta: hoy, o la hora fuerte. */
  readonly resaltar: number | null;
  readonly objetivo?: number | null;
  readonly minimo?: number;
  /** Lo que dice el lector de pantalla. */
  readonly titulo: string;
  /** Solo barras (cuándo se vende): la resaltada en naranja y las demás en azul. */
  readonly soloBarras?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const [activo, setActivo] = useState<number | null>(null);
  const n = puntos.length;
  const valores = puntos
    .flatMap((p) => [p.linea ?? null, p.barra ?? null])
    .filter((v): v is number => v !== null);
  const max = Math.max(...valores, objetivo ?? 0, 1);
  const rayas = lasRayas(max * 1.08, minimo ?? 0);
  const arriba = rayas[rayas.length - 1] ?? max;
  const abajo = rayas[0] ?? 0;
  const paso = soloBarras ? (ANCHO - X0 - 10) / n : (ANCHO - X0 - 10) / Math.max(1, n - 1);
  const xi = (i: number) => (soloBarras ? X0 + paso * (i + 0.5) : X0 + i * paso);
  const y = (v: number) => 10 + (ALTO - 30) * (1 - (v - abajo) / Math.max(1, arriba - abajo));

  const conLinea = puntos.map((p, i) => ({ i, v: p.linea ?? null })).filter((p) => p.v !== null);
  const linea = conLinea
    .map((p, k) => `${k === 0 ? 'M' : 'L'}${String(xi(p.i))} ${String(y(p.v as number))}`)
    .join(' ');
  const primero = conLinea[0];
  const ultimo = conLinea[conLinea.length - 1];
  const area =
    primero === undefined || ultimo === undefined
      ? ''
      : `${linea} L${String(xi(ultimo.i))} ${String(y(abajo))} L${String(xi(primero.i))} ${String(y(abajo))} Z`;
  const anchoBarra = soloBarras ? paso * 0.64 : Math.min(18, paso * 0.5);
  const elResaltado = activo ?? resaltar;

  return (
    <div className="relative min-h-[9rem] w-full flex-1 touch-pan-y select-none">
      <svg
        viewBox={`0 0 ${String(ANCHO)} ${String(ALTO)}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={titulo}
        className="absolute inset-0 size-full overflow-visible"
        onPointerLeave={() => {
          setActivo(null);
        }}
      >
        <defs>
          <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-naranja)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--color-naranja)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {rayas.map((r) => (
          <g key={r}>
            <line
              x1={X0}
              x2={ANCHO - 6}
              y1={y(r)}
              y2={y(r)}
              stroke="var(--color-borde)"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={X0 - 8}
              y={y(r) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--color-texto-tenue)"
            >
              {formato(r)}
            </text>
          </g>
        ))}
        {puntos.map((p, i) =>
          p.barra === null || p.barra === undefined ? null : (
            <rect
              key={`b${String(i)}`}
              x={xi(i) - anchoBarra / 2}
              y={y(p.barra)}
              width={anchoBarra}
              height={Math.max(0, y(abajo) - y(p.barra))}
              rx={soloBarras ? 6 : 5}
              fill={soloBarras && i === elResaltado ? 'var(--color-naranja)' : 'var(--color-info)'}
              opacity={soloBarras ? (i === elResaltado ? 1 : 0.55) : activo === i ? 0.8 : 0.5}
            />
          ),
        )}
        {objetivo !== undefined && objetivo !== null && (
          <g>
            <line
              x1={X0}
              x2={ANCHO - 6}
              y1={y(objetivo)}
              y2={y(objetivo)}
              stroke="var(--color-bien)"
              strokeWidth="2"
              strokeDasharray="6 5"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={ANCHO - 8}
              y={y(objetivo) - 6}
              textAnchor="end"
              fontSize="11"
              fontWeight="700"
              fill="var(--color-bien)"
            >
              objetivo
            </text>
          </g>
        )}
        {!soloBarras && area !== '' && <path d={area} fill={`url(#area-${id})`} />}
        {!soloBarras && linea !== '' && (
          <path
            d={linea}
            fill="none"
            stroke="var(--color-naranja)"
            strokeWidth="3"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {activo !== null && (
          <line
            x1={xi(activo)}
            x2={xi(activo)}
            y1={8}
            y2={ALTO - 20}
            stroke="var(--color-texto-tenue)"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {!soloBarras && elResaltado !== null && (puntos[elResaltado]?.linea ?? null) !== null && (
          <circle
            cx={xi(elResaltado)}
            cy={y(puntos[elResaltado]?.linea ?? 0)}
            r="6"
            fill="var(--color-naranja)"
            stroke="var(--color-superficie)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {puntos.map((p, i) => (
          <text
            key={`e${String(i)}`}
            x={xi(i)}
            y={ALTO - 2}
            textAnchor="middle"
            fontSize="11"
            fontWeight={i === resaltar ? 800 : 500}
            fill={i === resaltar ? 'var(--color-texto)' : 'var(--color-texto-tenue)'}
          >
            {p.eje}
          </text>
        ))}
        {/* Lo que se toca: una columna entera por punto, con su etiqueta. */}
        {puntos.map((p, i) => (
          <rect
            key={`t${String(i)}`}
            x={soloBarras ? xi(i) - paso / 2 : xi(i) - paso / 2}
            y={0}
            width={paso}
            height={ALTO - 16}
            fill="transparent"
            tabIndex={0}
            aria-label={`${p.titulo}: ${p.texto}`}
            className="outline-none focus-visible:fill-[color-mix(in_srgb,var(--color-naranja)_12%,transparent)]"
            onPointerEnter={() => {
              setActivo(i);
            }}
            onPointerDown={() => {
              setActivo(i);
            }}
            onFocus={() => {
              setActivo(i);
            }}
            {...conTip(p.titulo, p.texto)}
          />
        ))}
      </svg>
    </div>
  );
}

/** La leyenda de una gráfica: «● Ventas ■ Compras». */
export function LeyendaDeLaGrafica({
  series,
}: {
  readonly series: readonly {
    readonly nombre: string;
    readonly color: string;
    readonly forma: 'punto' | 'barra' | 'raya';
  }[];
}) {
  return (
    <span className="flex items-center gap-e3 text-etiqueta font-semibold text-texto-suave">
      {series.map((s) => (
        <span key={s.nombre} className="flex items-center gap-[5px]">
          <i
            aria-hidden
            className={clases(
              'block',
              s.forma === 'punto' && 'size-[10px] rounded-redondo',
              s.forma === 'barra' && 'size-[10px] rounded-[3px] opacity-55',
              s.forma === 'raya' && 'h-[3px] w-[12px] rounded-redondo',
            )}
            style={{ background: s.color }}
          />
          {s.nombre}
        </span>
      ))}
    </span>
  );
}
