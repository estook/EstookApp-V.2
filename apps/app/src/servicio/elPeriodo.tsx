/**
 * El periodo de Información, Informes y Empleados (la pausa del 8-nov, 0142): cómo se llama, con
 * qué se compara, el control con sus flechas y la flecha del cambio. El gancho que lo lee de la
 * dirección vive en `ganchos/usarElPeriodo.ts`.
 */
import { IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import { cuantoCambia, type PeriodoDelServicio } from '@estook/dominio';
import { Boton, Segmentado, clases } from '@estook/ui';

const NOMBRE: Readonly<Record<PeriodoDelServicio, string>> = {
  dia: 'Día',
  semana: 'Semana',
  mes: 'Mes',
};

/** «Hoy», «El sábado 7 de noviembre», «Del 2 al 8 de noviembre», «Noviembre de 2026». */
export function comoSeLlamaElPeriodo(
  periodo: PeriodoDelServicio,
  desde: string,
  hasta: string,
  hoy: string,
): string {
  const fecha = (f: string, opciones: Intl.DateTimeFormatOptions) =>
    new Date(`${f}T12:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'UTC', ...opciones });
  if (periodo === 'dia') {
    if (desde === hoy) return 'Hoy';
    const dicho = fecha(desde, { weekday: 'long', day: 'numeric', month: 'long' });
    return dicho.charAt(0).toUpperCase() + dicho.slice(1);
  }
  if (periodo === 'mes') {
    const dicho = fecha(desde, { month: 'long', year: 'numeric' });
    return dicho.charAt(0).toUpperCase() + dicho.slice(1);
  }
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return mismoMes
    ? `Del ${fecha(desde, { day: 'numeric' })} al ${fecha(hasta, { day: 'numeric', month: 'long' })}`
    : `Del ${fecha(desde, { day: 'numeric', month: 'short' })} al ${fecha(hasta, { day: 'numeric', month: 'short' })}`;
}

/** Con qué se compara, dicho en la cifra: «frente al sábado pasado». */
export function frenteA(periodo: PeriodoDelServicio): string {
  return periodo === 'dia'
    ? 'frente al mismo día de la semana pasada'
    : periodo === 'semana'
      ? 'frente a la semana anterior'
      : 'frente al mes anterior';
}

export function ElegirElPeriodo({
  periodo,
  titulo,
  anteriorDel,
  siguienteDel,
  alElegir,
  alIr,
  conDia = true,
}: {
  readonly periodo: PeriodoDelServicio;
  readonly titulo: string;
  readonly anteriorDel: string | null;
  readonly siguienteDel: string | null;
  readonly alElegir: (periodo: PeriodoDelServicio) => void;
  readonly alIr: (del: string | null) => void;
  /** Empleados va por semanas y meses: un día suelto no dice nada de nadie. */
  readonly conDia?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-e2">
      <Segmentado
        etiqueta="Qué periodo"
        opciones={(['dia', 'semana', 'mes'] as const)
          .filter((p) => conDia || p !== 'dia')
          .map((p) => ({ valor: p, texto: NOMBRE[p] }))}
        valor={periodo}
        alElegir={alElegir}
      />
      <div className="flex items-center gap-e1">
        <Boton
          tono="texto"
          icono={<IconoFlechaIzquierda size={18} />}
          aria-label="El periodo anterior"
          disabled={anteriorDel === null}
          onClick={() => {
            alIr(anteriorDel);
          }}
        />
        <span
          className={clases('min-w-[9rem] text-center text-cuerpo font-semibold')}
          aria-live="polite"
        >
          {titulo}
        </span>
        <Boton
          tono="texto"
          icono={<IconoFlechaDerecha size={18} />}
          aria-label="El periodo siguiente"
          disabled={siguienteDel === null}
          onClick={() => {
            alIr(siguienteDel);
          }}
        />
      </div>
    </div>
  );
}

/** «▲ 4,8 %», en verde si es buena noticia; nada si no hay con qué comparar. */
export function ElCambio({
  ahora,
  antes,
  mejorSiSube = true,
  frente,
}: {
  readonly ahora: number | null;
  readonly antes: number | null;
  readonly mejorSiSube?: boolean;
  readonly frente: string;
}) {
  if (ahora === null || antes === null || antes === 0) {
    return <span className="text-etiqueta text-texto-tenue">Sin nada con qué comparar</span>;
  }
  const cambio = cuantoCambia(ahora, antes) ?? 0;
  const redondo = Math.abs(cambio);
  if (redondo === 0) {
    return <span className="text-etiqueta text-texto-suave">= igual {frente}</span>;
  }
  const sube = cambio > 0;
  const bueno = sube === mejorSiSube;
  return (
    <span
      className={clases('text-etiqueta font-semibold', bueno ? 'text-bien' : 'text-mal')}
      title={`${sube ? 'Sube' : 'Baja'} un ${redondo.toLocaleString('es-ES')} % ${frente}`}
    >
      {sube ? '▲' : '▼'} {redondo.toLocaleString('es-ES')} %
      <span className="sr-only"> {frente}</span>
    </span>
  );
}
