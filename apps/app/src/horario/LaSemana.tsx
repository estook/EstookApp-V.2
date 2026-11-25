import { useState, type CSSProperties, type ReactNode } from 'react';
import { comoSeLeenLasHoras, type AvisoDelHorario } from '@estook/dominio';
import { IconoAnadir, IconoAtencion, IconoPalmera } from '@estook/iconos';
import { clases, usarEsEscritorio } from '@estook/ui';
import {
  COMO_SE_LLAMA_LA_ZONA,
  nombreCorto,
  type DiaDeLaSemana,
  type PersonaEnElHorario,
  type TurnoVisto,
  type Zona,
} from './contrato.ts';
import { AUSENCIA, loDelDia } from './cuentas.ts';
import { ZONA, estiloDeLaZona } from './zonas.ts';

/**
 * La semana, pintada (H2 · 0069; **rehecha en la Ampliación 4 · 1**, 0153, con la maqueta
 * aprobada el 24-nov: «Turnos, rehecho»). La misma para ver lo publicado y para montarlo.
 *
 * Richi: «se ve raro», y lo quería de app actual. Ahora **se lee de un vistazo**:
 *
 *   · **Cada zona con su color**: la sala en verde, la cocina en ámbar, el resto en violeta. Un
 *     turno partido son dos bloques. «Libre» en gris; **las vacaciones, una banda azul de playa
 *     con su palmera**, de punta a punta de los días que dura.
 *   · **A la derecha, las horas de cada uno frente a su contrato** (al montarlo), con su barrita:
 *     verde si cuadra, naranja si falta o sobra.
 *   · **Abajo, quiénes hay cada día**, por zona: el hueco se ve antes de publicar.
 *   · **En el móvil**, siete columnas no caben: el equipo ve **su semana, día a día**, y quien
 *     lleva el horario, **el día por horas** —una barra de color por persona y una línea con la
 *     hora de ahora—, como la vista de día de un buen calendario.
 *
 * Tocar un turno lo abre: para ver con quién coincide, o para cambiarlo.
 */

/** Los colores de las caras: uno por persona, siempre el mismo (sale de su id). */
const CARAS = [
  'linear-gradient(135deg, #2fb57f, #0f7d51)',
  'linear-gradient(135deg, #4aa3f0, #1f5fd6)',
  'linear-gradient(135deg, #f0619b, #b4235f)',
  'linear-gradient(135deg, #f0a23a, #c25b0a)',
  'linear-gradient(135deg, #f07a52, #c23d1a)',
  'linear-gradient(135deg, #8e72f2, #5433c4)',
  'linear-gradient(135deg, #2bb0b0, #0a6b6b)',
  'linear-gradient(135deg, #6b7c85, #2c3b41)',
] as const;

function colorDeLaCara(personaId: string): string {
  let suma = 0;
  for (const letra of personaId) suma = (suma * 31 + letra.charCodeAt(0)) % 9973;
  return CARAS[suma % CARAS.length] ?? CARAS[0];
}

function Cara({ persona }: { readonly persona: PersonaEnElHorario }) {
  const iniciales =
    `${persona.nombre.charAt(0)}${persona.apellidos?.charAt(0) ?? ''}`.toUpperCase();
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full text-[0.68rem] font-extrabold text-white"
      style={{ background: colorDeLaCara(persona.personaId) }}
    >
      {iniciales}
    </span>
  );
}

// ── Lo de un día ─────────────────────────────────────────────────────────────

function minutosDe(hora: string | null): number {
  if (hora === null) return 0;
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

/** «13:00» → «13», «13:30» → «13:30»: en un bloque pequeño, lo justo. */
function horaCorta(hora: string | null): string {
  if (hora === null) return '';
  return hora.endsWith(':00') ? hora.slice(0, -3) : hora;
}

function Bloque({
  turno,
  zona,
  mini,
}: {
  readonly turno: TurnoVisto;
  readonly zona: Zona;
  readonly mini: boolean;
}) {
  return (
    <span
      className={clases(
        'block rounded-[9px] text-left font-extrabold tabular-nums leading-tight [box-shadow:inset_0_1px_0_rgba(255,255,255,0.35)]',
        mini ? 'px-[6px] py-[2px] text-[0.66rem]' : 'px-[6px] py-[4px] text-[0.72rem]',
      )}
      style={estiloDeLaZona(zona)}
    >
      {horaCorta(turno.entra)}–{horaCorta(turno.sale)}
      {!mini && turno.minutos > 0 && (
        <small className="block text-[0.6rem] font-semibold opacity-90">
          {comoSeLeenLasHoras(turno.minutos)}
        </small>
      )}
    </span>
  );
}

function Celda({
  turnos,
  zona,
  editable,
  esHoy,
  etiqueta,
  alTocar,
}: {
  readonly turnos: readonly TurnoVisto[];
  readonly zona: Zona;
  readonly editable: boolean;
  readonly esHoy: boolean;
  readonly etiqueta: string;
  readonly alTocar: (() => void) | undefined;
}) {
  const ausencia = turnos.find((t) => t.tipo !== 'trabajo');
  const tramos = turnos.filter((t) => t.tipo === 'trabajo');
  const contenido =
    ausencia !== undefined ? (
      <span
        className={clases(
          'text-center text-[0.68rem] font-semibold',
          ausencia.tipo === 'baja' ? 'text-info' : 'text-texto-tenue',
        )}
      >
        {AUSENCIA[ausencia.tipo]}
      </span>
    ) : tramos.length > 0 ? (
      tramos.map((t) => <Bloque key={t.id} turno={t} zona={zona} mini={tramos.length > 1} />)
    ) : editable ? (
      <IconoAnadir
        size={16}
        className="mx-auto text-texto-tenue opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    ) : (
      <span className="text-center text-texto-tenue">·</span>
    );

  const estilo = clases(
    'group grid min-h-[46px] w-full content-center gap-[3px] rounded-[12px] bg-fondo p-[3px] text-left',
    esHoy && 'ring-1 ring-naranja/40',
    alTocar !== undefined && 'hover:brightness-[0.98] focus-visible:outline-2',
  );
  if (alTocar === undefined) {
    return (
      <div className={estilo} aria-label={etiqueta}>
        {contenido}
      </div>
    );
  }
  return (
    <button type="button" className={estilo} aria-label={etiqueta} onClick={alTocar}>
      {contenido}
    </button>
  );
}

/** Los días seguidos de vacaciones (o de baja) desde uno: para pintarlos en una sola banda. */
function diasSeguidos(
  dias: readonly DiaDeLaSemana[],
  desde: number,
  tipo: string,
  delDia: (fecha: string) => readonly TurnoVisto[],
): number {
  let n = 0;
  for (let i = desde; i < dias.length; i++) {
    const dia = dias[i];
    if (dia === undefined || !delDia(dia.fecha).some((t) => t.tipo === tipo)) break;
    n += 1;
  }
  return n;
}

function Banda({
  tipo,
  desde,
  hasta,
  editable,
  alTocar,
}: {
  readonly tipo: 'vacaciones' | 'baja';
  readonly desde: DiaDeLaSemana;
  readonly hasta: DiaDeLaSemana;
  readonly editable: boolean;
  readonly alTocar: (() => void) | undefined;
}) {
  const texto =
    desde.fecha === hasta.fecha
      ? AUSENCIA[tipo]
      : `${AUSENCIA[tipo] ?? ''} · del ${desde.largo.split(' ')[1] ?? ''} al ${hasta.largo.split(' ')[1] ?? ''}`;
  const estilo = clases(
    'relative flex min-h-[46px] w-full items-center justify-center gap-e2 overflow-hidden rounded-[12px] px-e2 text-[0.76rem] font-extrabold text-white',
    alTocar !== undefined && editable && 'hover:brightness-105',
  );
  const fondo: CSSProperties = {
    background:
      tipo === 'vacaciones' ? 'var(--degradado-vacaciones)' : 'var(--degradado-historial)',
  };
  const dentro = (
    <>
      {tipo === 'vacaciones' && <IconoPalmera size={16} aria-hidden />}
      <span className="truncate">{texto}</span>
      {tipo === 'vacaciones' && (
        <IconoPalmera size={44} aria-hidden className="absolute -bottom-2 right-2 opacity-20" />
      )}
    </>
  );
  if (alTocar === undefined) {
    return (
      <div className={estilo} style={fondo}>
        {dentro}
      </div>
    );
  }
  return (
    <button type="button" className={estilo} style={fondo} aria-label={texto} onClick={alTocar}>
      {dentro}
    </button>
  );
}

// ── Las horas frente al contrato ─────────────────────────────────────────────

function LasHoras({
  persona,
  conContrato,
}: {
  readonly persona: PersonaEnElHorario;
  readonly conContrato: boolean;
}) {
  const contrato = persona.horasDeContrato ?? null;
  const horas = persona.minutos / 60;
  if (!conContrato || contrato === null) {
    return (
      <span className="block text-[0.74rem] font-extrabold tabular-nums">
        {persona.minutos === 0 ? '—' : comoSeLeenLasHoras(persona.minutos)}
        {conContrato && (
          <small className="block text-[0.64rem] font-semibold text-texto-tenue">
            sin contrato
          </small>
        )}
      </span>
    );
  }
  const diferencia = horas - contrato;
  // Cuadra si no se va más de media hora: un turno que acaba a y media no es «falta».
  const cuadra = Math.abs(diferencia) <= 0.5;
  const parte = Math.min(horas / Math.max(contrato, 1), 1);
  return (
    <span className="grid gap-[4px]">
      <span className="text-[0.74rem] font-extrabold tabular-nums">
        {comoSeLeenLasHoras(persona.minutos)}{' '}
        <small className="text-[0.64rem] font-semibold text-texto-tenue">
          de {String(contrato)}
          {cuadra
            ? ''
            : diferencia < 0
              ? ` · faltan ${comoSeLeenLasHoras(Math.trunc(-diferencia * 60))}`
              : ` · sobran ${comoSeLeenLasHoras(Math.trunc(diferencia * 60))}`}
        </small>
      </span>
      <span aria-hidden className="block h-[6px] overflow-hidden rounded-[3px] bg-borde/70">
        <i
          className="block h-full rounded-[3px]"
          style={{
            width: `${String(parte * 100)}%`,
            background: cuadra ? 'var(--degradado-contrato)' : 'var(--degradado-horas)',
          }}
        />
      </span>
    </span>
  );
}

function LaMarcaDelAviso({ avisos }: { readonly avisos: readonly AvisoDelHorario[] }) {
  if (avisos.length === 0) return null;
  const rojo = avisos.some((a) => a.nivel === 'rojo');
  return (
    <span
      className={clases('inline-flex items-center', rojo ? 'text-mal' : 'text-atencion')}
      title={avisos.map((a) => a.texto).join(' ')}
    >
      <IconoAtencion size={14} titulo={rojo ? 'Hay algo en rojo' : 'Hay algo que mirar'} />
    </span>
  );
}

// ── La semana ────────────────────────────────────────────────────────────────

export interface LaSemanaProps {
  readonly dias: readonly DiaDeLaSemana[];
  readonly hoy: string;
  readonly personas: readonly PersonaEnElHorario[];
  readonly turnos: readonly TurnoVisto[];
  readonly editable: boolean;
  readonly alTocar?: (personaId: string, fecha: string) => void;
  readonly avisos?: readonly AvisoDelHorario[];
  /** Enseñar «32 h de 40» con su barrita en vez de solo las horas. */
  readonly conContrato?: boolean;
}

const ORDEN_DE_ZONAS = ['sala', 'cocina', 'otros'] as const;

/** Quién trabaja un día en una zona: para «Quiénes hay». */
function cuantosTrabajan(
  personas: readonly PersonaEnElHorario[],
  turnos: readonly TurnoVisto[],
  zona: Zona,
  fecha: string,
): number {
  const deLaZona = new Set(personas.filter((p) => p.zona === zona).map((p) => p.personaId));
  return new Set(
    turnos
      .filter((t) => t.dia === fecha && t.tipo === 'trabajo' && deLaZona.has(t.personaId))
      .map((t) => t.personaId),
  ).size;
}

export function LaSemana(props: LaSemanaProps) {
  const escritorio = usarEsEscritorio();
  if (props.personas.length === 0) return null;
  return escritorio ? <ElCuadrante {...props} /> : <ElDiaPorHoras {...props} />;
}

function ElCuadrante({
  dias,
  hoy,
  personas,
  turnos,
  editable,
  alTocar,
  avisos = [],
  conContrato = false,
}: LaSemanaProps) {
  const zonas = ORDEN_DE_ZONAS.filter((z) => personas.some((p) => p.zona === z));
  const delDia = (personaId: string) => (fecha: string) =>
    turnos.filter((t) => t.personaId === personaId && t.dia === fecha);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[58rem] table-fixed border-separate border-spacing-[4px] text-cuerpo">
        <colgroup>
          <col className="w-[11rem]" />
          {dias.map((d) => (
            <col key={d.fecha} />
          ))}
          <col className="w-[8rem]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Persona
            </th>
            {dias.map((d) => {
              const [nombre = '', numero = ''] = d.corto.split(' ');
              const esHoy = d.fecha === hoy;
              return (
                <th key={d.fecha} scope="col" className="p-0">
                  <span
                    className={clases(
                      'grid justify-items-center rounded-[12px] py-[6px] text-[0.66rem] font-bold',
                      esHoy ? 'text-[#111c1f]' : 'text-texto-tenue',
                    )}
                    style={esHoy ? { background: 'var(--degradado-cocina)' } : undefined}
                  >
                    {nombre}
                    <b className={clases('text-[0.95rem]', esHoy ? '' : 'text-texto')}>{numero}</b>
                    {esHoy && <span className="sr-only"> (hoy)</span>}
                  </span>
                </th>
              );
            })}
            <th scope="col" className="px-e2 text-left text-[0.66rem] font-bold text-texto-tenue">
              Horas
            </th>
          </tr>
        </thead>
        {zonas.map((zona) => {
          const deLaZona = personas.filter((p) => p.zona === zona);
          const minutos = deLaZona.reduce((suma, p) => suma + p.minutos, 0);
          return (
            <tbody key={zona}>
              <tr>
                <th
                  colSpan={dias.length + 2}
                  scope="colgroup"
                  className="px-e1 pb-[2px] pt-e3 text-left"
                >
                  <span className="flex items-center gap-e2 text-[0.82rem] font-extrabold">
                    <span
                      aria-hidden
                      className="grid size-6 place-items-center rounded-[8px] text-[0.66rem] font-extrabold"
                      style={estiloDeLaZona(zona)}
                    >
                      {ZONA[zona].letra}
                    </span>
                    {COMO_SE_LLAMA_LA_ZONA[zona]}
                    <small className="font-semibold text-texto-tenue">
                      {deLaZona.length === 1 ? '1 persona' : `${String(deLaZona.length)} personas`}
                      {minutos > 0 ? ` · ${comoSeLeenLasHoras(minutos)}` : ''}
                    </small>
                  </span>
                </th>
              </tr>
              {deLaZona.map((p) => {
                const suyos = delDia(p.personaId);
                const celdas: ReactNode[] = [];
                for (let i = 0; i < dias.length; i++) {
                  const d = dias[i];
                  if (d === undefined) continue;
                  const delDiaDeHoy = suyos(d.fecha);
                  const ausencia = delDiaDeHoy.find(
                    (t) => t.tipo === 'vacaciones' || t.tipo === 'baja',
                  );
                  const tocar =
                    alTocar === undefined
                      ? undefined
                      : () => {
                          alTocar(p.personaId, d.fecha);
                        };
                  if (ausencia !== undefined) {
                    const tipo = ausencia.tipo as 'vacaciones' | 'baja';
                    const n = diasSeguidos(dias, i, tipo, suyos);
                    const hasta = dias[i + n - 1] ?? d;
                    celdas.push(
                      <td key={d.fecha} colSpan={n} className="p-0">
                        <Banda
                          tipo={tipo}
                          desde={d}
                          hasta={hasta}
                          editable={editable}
                          alTocar={tocar}
                        />
                      </td>,
                    );
                    i += n - 1;
                    continue;
                  }
                  const texto = loDelDia(delDiaDeHoy);
                  celdas.push(
                    <td key={d.fecha} className="p-0">
                      <Celda
                        turnos={delDiaDeHoy}
                        zona={zona}
                        editable={editable}
                        esHoy={d.fecha === hoy}
                        etiqueta={`${nombreCorto(p)}, ${d.largo}: ${texto === '' ? 'nada' : texto}`}
                        alTocar={tocar}
                      />
                    </td>,
                  );
                }
                return (
                  <tr key={p.personaId} className="align-middle">
                    <th scope="row" className="p-0 text-left font-normal">
                      <span className="flex min-w-0 items-center gap-e2 px-[2px]">
                        <Cara persona={p} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-e1 truncate text-[0.8rem] font-bold">
                            {nombreCorto(p)}
                            <LaMarcaDelAviso
                              avisos={avisos.filter((a) => a.personaId === p.personaId)}
                            />
                          </span>
                          <small
                            className="block truncate text-[0.66rem] font-semibold text-texto-tenue"
                            title={p.rolNombre}
                          >
                            {p.rolNombre}
                            {conContrato && p.horasDeContrato != null
                              ? ` · ${String(p.horasDeContrato)} h`
                              : ''}
                          </small>
                        </span>
                      </span>
                    </th>
                    {celdas}
                    <td className="px-e2">
                      <LasHoras persona={p} conContrato={conContrato} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
        <tfoot>
          <tr>
            <th
              scope="row"
              className="border-t border-borde/70 px-e1 pt-e2 text-left text-[0.74rem] font-extrabold"
            >
              Quiénes hay
            </th>
            {dias.map((d) => (
              <td key={d.fecha} className="border-t border-borde/70 pt-e2">
                <span className="flex flex-wrap items-center justify-center gap-[3px]">
                  {zonas.map((z) => {
                    const n = cuantosTrabajan(personas, turnos, z, d.fecha);
                    return (
                      <span
                        key={z}
                        title={`${COMO_SE_LLAMA_LA_ZONA[z]}: ${String(n)}`}
                        aria-label={`${COMO_SE_LLAMA_LA_ZONA[z]}: ${String(n)}`}
                        className={clases(
                          'inline-flex items-center gap-[3px] rounded-[7px] px-[5px] py-[2px] text-[0.66rem] font-extrabold tabular-nums',
                          n === 0 ? 'bg-mal-suave text-mal' : 'bg-fondo text-texto',
                        )}
                      >
                        <i
                          aria-hidden
                          className="block size-[7px] rounded-full"
                          style={{ background: ZONA[z].fondo }}
                        />
                        {n}
                      </span>
                    );
                  })}
                </span>
              </td>
            ))}
            <td className="border-t border-borde/70" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── En el móvil: el día por horas ────────────────────────────────────────────

function ElDiaPorHoras({
  dias,
  hoy,
  personas,
  turnos,
  editable,
  alTocar,
  avisos = [],
}: LaSemanaProps) {
  const hoyEnLaSemana = dias.some((d) => d.fecha === hoy);
  const [elegido, setElegido] = useState(hoyEnLaSemana ? hoy : (dias[0]?.fecha ?? hoy));
  const dia = dias.find((d) => d.fecha === elegido) ?? dias[0];
  if (dia === undefined) return null;
  const delDia = turnos.filter((t) => t.dia === dia.fecha);
  const trabajos = delDia.filter(
    (t) => t.tipo === 'trabajo' && t.entra !== null && t.sale !== null,
  );

  // La regla de horas: de la primera entrada a la última salida del día, en horas enteras.
  const desde = Math.min(12 * 60, ...trabajos.map((t) => minutosDe(t.entra)));
  const hasta = Math.max(
    desde + 6 * 60,
    ...trabajos.map((t) => {
      const e = minutosDe(t.entra);
      const s = minutosDe(t.sale);
      return s > e ? s : s + 24 * 60;
    }),
  );
  const inicio = Math.floor(desde / 60) * 60;
  const fin = Math.ceil(hasta / 60) * 60;
  const largo = fin - inicio;
  const paso = largo > 12 * 60 ? 180 : 120;
  const marcas: number[] = [];
  for (let m = inicio; m <= fin; m += paso) marcas.push(m);
  const ahora = new Date(Date.now());
  const minutoDeAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const lineaDeAhora =
    dia.fecha === hoy && minutoDeAhora >= inicio && minutoDeAhora <= fin
      ? ((minutoDeAhora - inicio) / largo) * 100
      : null;
  const zonas = ORDEN_DE_ZONAS.filter((z) => personas.some((p) => p.zona === z));
  const noTrabajan = personas.filter((p) => !trabajos.some((t) => t.personaId === p.personaId));

  return (
    <div className="flex flex-col gap-e3">
      <div role="tablist" aria-label="Día de la semana" className="grid grid-cols-7 gap-e1">
        {dias.map((d) => {
          const [nombre = '', numero = ''] = d.corto.split(' ');
          const elegidoAhora = d.fecha === elegido;
          return (
            <button
              key={d.fecha}
              type="button"
              role="tab"
              aria-selected={elegidoAhora}
              aria-label={d.largo}
              onClick={() => {
                setElegido(d.fecha);
              }}
              className={clases(
                'flex min-h-[52px] flex-col items-center justify-center gap-[2px] rounded-[12px] text-[0.66rem] font-bold',
                elegidoAhora
                  ? 'bg-charcoal text-white'
                  : d.fecha === hoy
                    ? 'text-[#111c1f]'
                    : 'bg-fondo text-texto-suave',
              )}
              style={
                !elegidoAhora && d.fecha === hoy
                  ? { background: 'var(--degradado-cocina)' }
                  : undefined
              }
            >
              <span>{nombre.charAt(0)}</span>
              <b className="text-[0.9rem] tabular-nums">{numero}</b>
              <span aria-hidden className="flex gap-[2px]">
                {zonas.map((z) =>
                  cuantosTrabajan(personas, turnos, z, d.fecha) > 0 ? (
                    <i
                      key={z}
                      className="block size-[5px] rounded-full"
                      style={{ background: ZONA[z].fondo }}
                    />
                  ) : null,
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[4.2rem_minmax(0,1fr)] gap-x-e2 text-[0.6rem] font-bold text-texto-tenue">
        <span />
        <span className="relative h-3">
          {marcas.map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 tabular-nums"
              style={{ left: `${String(((m - inicio) / largo) * 100)}%` }}
            >
              {String((m / 60) % 24)}
            </span>
          ))}
        </span>
      </div>

      {zonas.map((zona) => {
        const deLaZona = personas.filter((p) => p.zona === zona);
        const trabajan = deLaZona.filter((p) => trabajos.some((t) => t.personaId === p.personaId));
        if (trabajan.length === 0) return null;
        return (
          <section
            key={zona}
            aria-label={COMO_SE_LLAMA_LA_ZONA[zona]}
            className="flex flex-col gap-e1"
          >
            <h3 className="flex items-center gap-e2 text-[0.78rem] font-extrabold">
              <span
                aria-hidden
                className="block size-[10px] rounded-[3px]"
                style={{ background: ZONA[zona].fondo }}
              />
              {COMO_SE_LLAMA_LA_ZONA[zona]} · {trabajan.length}
            </h3>
            {trabajan.map((p) => {
              const suyos = trabajos.filter((t) => t.personaId === p.personaId);
              return (
                <div
                  key={p.personaId}
                  className="grid grid-cols-[4.2rem_minmax(0,1fr)] items-center gap-x-e2"
                >
                  <span className="flex min-w-0 items-center gap-[3px] truncate text-[0.74rem] font-bold">
                    {p.nombre}
                    <LaMarcaDelAviso
                      avisos={avisos.filter(
                        (a) =>
                          a.personaId === p.personaId && (a.dia === null || a.dia === dia.fecha),
                      )}
                    />
                  </span>
                  <span className="relative h-[30px] rounded-[9px] bg-fondo">
                    {lineaDeAhora !== null && (
                      <i
                        aria-hidden
                        className="absolute inset-y-[-3px] z-10 w-[2px] rounded bg-mal"
                        style={{ left: `${String(lineaDeAhora)}%` }}
                      />
                    )}
                    {suyos.map((t) => {
                      const e = minutosDe(t.entra);
                      const s0 = minutosDe(t.sale);
                      const s = s0 > e ? s0 : s0 + 24 * 60;
                      const izquierda = ((e - inicio) / largo) * 100;
                      const ancho = ((s - e) / largo) * 100;
                      const etiqueta = `${nombreCorto(p)}, ${dia.largo}: ${t.entra ?? ''}–${t.sale ?? ''}`;
                      const estilo: CSSProperties = {
                        ...estiloDeLaZona(zona),
                        left: `${String(izquierda)}%`,
                        width: `${String(ancho)}%`,
                      };
                      const clase =
                        'absolute inset-y-[3px] flex items-center justify-center overflow-hidden rounded-[7px] px-[4px] text-[0.64rem] font-extrabold tabular-nums';
                      return alTocar === undefined ? (
                        <span key={t.id} className={clase} style={estilo} aria-label={etiqueta}>
                          {horaCorta(t.entra)}–{horaCorta(t.sale)}
                        </span>
                      ) : (
                        <button
                          key={t.id}
                          type="button"
                          className={clase}
                          style={estilo}
                          aria-label={etiqueta}
                          onClick={() => {
                            alTocar(p.personaId, dia.fecha);
                          }}
                        >
                          {horaCorta(t.entra)}–{horaCorta(t.sale)}
                        </button>
                      );
                    })}
                  </span>
                </div>
              );
            })}
          </section>
        );
      })}

      {/* Los que no trabajan ese día, abajo y con su color: de vacaciones, de baja o libres. */}
      {noTrabajan.length > 0 && (
        <div className="flex flex-wrap gap-e1 border-t border-borde/70 pt-e3">
          {noTrabajan.map((p) => {
            const ausencia = delDia.find(
              (t) => t.personaId === p.personaId && t.tipo !== 'trabajo',
            );
            const que =
              ausencia === undefined
                ? editable
                  ? 'sin poner'
                  : 'no trabaja'
                : AUSENCIA[ausencia.tipo];
            const color =
              ausencia?.tipo === 'vacaciones'
                ? 'var(--degradado-vacaciones)'
                : ausencia?.tipo === 'baja'
                  ? 'var(--degradado-historial)'
                  : undefined;
            const contenido = (
              <>
                {color !== undefined && (
                  <i
                    aria-hidden
                    className="block size-[10px] rounded-[3px]"
                    style={{ background: color }}
                  />
                )}
                {p.nombre} · {que}
              </>
            );
            const clase =
              'inline-flex min-h-[2.25rem] items-center gap-e1 rounded-full bg-fondo px-e3 text-[0.72rem] font-semibold text-texto-suave';
            return alTocar === undefined ? (
              <span key={p.personaId} className={clase}>
                {contenido}
              </span>
            ) : (
              <button
                key={p.personaId}
                type="button"
                className={clase}
                aria-label={`${nombreCorto(p)}, ${dia.largo}: ${ausencia === undefined ? 'nada' : que}`}
                onClick={() => {
                  alTocar(p.personaId, dia.fecha);
                }}
              >
                {contenido}
                {editable && ausencia === undefined && <IconoAnadir size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── «Solo el mío»: la semana de uno, día a día ───────────────────────────────

export function MiSemana({
  dias,
  hoy,
  turnos,
  zona,
  alTocar,
}: {
  readonly dias: readonly DiaDeLaSemana[];
  readonly hoy: string;
  readonly turnos: readonly TurnoVisto[];
  /** Su zona, para el color de sus turnos. */
  readonly zona: Zona;
  readonly alTocar?: (fecha: string) => void;
}) {
  const total = turnos.reduce((suma, t) => suma + t.minutos, 0);
  return (
    <div className="flex flex-col gap-e2">
      {dias.map((d) => {
        const delDia = turnos.filter((t) => t.dia === d.fecha);
        const tramos = delDia.filter((t) => t.tipo === 'trabajo');
        const ausencia = delDia.find((t) => t.tipo !== 'trabajo');
        const minutos = delDia.reduce((suma, t) => suma + t.minutos, 0);
        const [nombre = '', numero = ''] = d.corto.split(' ');
        const esHoy = d.fecha === hoy;
        const contenido = (
          <>
            <span
              className={clases(
                'grid w-12 shrink-0 justify-items-center rounded-[12px] py-[6px] text-[0.66rem] font-bold',
                esHoy ? 'text-[#111c1f]' : 'bg-fondo text-texto-suave',
              )}
              style={esHoy ? { background: 'var(--degradado-cocina)' } : undefined}
            >
              {nombre}
              <b className="text-[0.95rem] tabular-nums">{numero}</b>
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-e1">
              {ausencia !== undefined ? (
                ausencia.tipo === 'vacaciones' ? (
                  <span
                    className="inline-flex items-center gap-e1 rounded-[9px] px-e2 py-[4px] text-[0.74rem] font-extrabold text-white"
                    style={{ background: 'var(--degradado-vacaciones)' }}
                  >
                    <IconoPalmera size={14} aria-hidden /> Vacaciones
                  </span>
                ) : (
                  <span className="text-[0.78rem] font-semibold text-texto-tenue">
                    {AUSENCIA[ausencia.tipo]}
                  </span>
                )
              ) : tramos.length === 0 ? (
                <span className="text-[0.78rem] text-texto-tenue">No trabajas</span>
              ) : (
                tramos.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-[9px] px-e2 py-[4px] text-[0.8rem] font-extrabold tabular-nums"
                    style={estiloDeLaZona(zona)}
                  >
                    {t.entra}–{t.sale}
                  </span>
                ))
              )}
            </span>
            <span className="shrink-0 text-[0.74rem] font-bold tabular-nums text-texto-suave">
              {minutos === 0 ? '' : comoSeLeenLasHoras(minutos)}
            </span>
          </>
        );
        const clase = clases(
          'flex w-full items-center gap-e3 rounded-mayor border border-borde bg-superficie p-e2 text-left [box-shadow:var(--sombra-tarjeta)]',
          esHoy && 'ring-1 ring-naranja/40',
        );
        return alTocar === undefined || tramos.length === 0 ? (
          <div key={d.fecha} className={clase}>
            {contenido}
          </div>
        ) : (
          <button
            key={d.fecha}
            type="button"
            className={clase}
            aria-label={`${d.largo}: ${loDelDia(delDia)}`}
            onClick={() => {
              alTocar(d.fecha);
            }}
          >
            {contenido}
          </button>
        );
      })}
      <p className="flex items-center justify-between rounded-mayor bg-fondo px-e3 py-e2 text-[0.8rem]">
        <span className="font-semibold">Tu semana</span>
        <b className="tabular-nums">{total === 0 ? 'Sin turnos' : comoSeLeenLasHoras(total)}</b>
      </p>
    </div>
  );
}
