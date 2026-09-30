import { useState } from 'react';
import { comoSeLeenLasHoras, type AvisoDelHorario } from '@estook/dominio';
import { IconoAnadir, IconoAtencion } from '@estook/iconos';
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

/**
 * La semana, pintada (H2 · 0069). La misma para ver lo publicado y para montarlo.
 *
 *   · **En el ordenador**, la rejilla de siempre de un horario: una fila por persona,
 *     una columna por día, separada en sala, cocina y el resto. Es la que se cuelga
 *     en la pared, y la que cualquiera en hostelería lee sin explicarle nada.
 *   · **En el móvil**, siete columnas no caben. Se elige el día arriba y debajo sale
 *     quién trabaja y a qué hora; y «Solo el mío» es la semana de uno, día a día.
 *
 * Tocar una casilla la abre: para verla con quién coincide, o para cambiarla.
 */

function Casilla({
  turnos,
  editable,
  esHoy,
  etiqueta,
  alTocar,
}: {
  readonly turnos: readonly TurnoVisto[];
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
          'inline-flex rounded-chico px-e2 py-[2px] text-etiqueta',
          ausencia.tipo === 'libre' ? 'bg-fondo text-texto-suave' : 'bg-info-suave text-info',
        )}
      >
        {AUSENCIA[ausencia.tipo]}
      </span>
    ) : tramos.length > 0 ? (
      <span className="flex flex-col gap-[2px]">
        {tramos.map((t) => (
          <span
            key={t.id}
            className="whitespace-nowrap rounded-chico bg-naranja-suave px-e2 py-[2px] text-etiqueta font-medium tabular-nums text-texto"
          >
            {t.entra}–{t.sale}
          </span>
        ))}
      </span>
    ) : editable ? (
      <IconoAnadir size={16} className="text-texto-tenue" aria-hidden />
    ) : (
      <span className="text-texto-tenue">—</span>
    );

  const estilo = clases(
    'flex min-h-toque w-full items-center justify-center rounded-medio p-e1 text-center',
    esHoy && 'bg-naranja-suave/40',
    alTocar !== undefined && 'hover:bg-fondo focus-visible:outline-2',
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

export interface LaSemanaProps {
  readonly dias: readonly DiaDeLaSemana[];
  readonly hoy: string;
  readonly personas: readonly PersonaEnElHorario[];
  readonly turnos: readonly TurnoVisto[];
  readonly editable: boolean;
  readonly alTocar?: (personaId: string, fecha: string) => void;
  readonly avisos?: readonly AvisoDelHorario[];
  /** Enseñar «32 h de 40» en vez de solo las horas. */
  readonly conContrato?: boolean;
}

/** Las horas de la semana, y debajo, si se monta, frente a qué se comparan. */
function LasHoras({
  persona,
  conContrato,
}: {
  readonly persona: PersonaEnElHorario;
  readonly conContrato: boolean;
}) {
  const contrato = persona.horasDeContrato ?? null;
  return (
    <>
      <span className="block font-medium text-texto">
        {persona.minutos === 0 ? '—' : comoSeLeenLasHoras(persona.minutos)}
      </span>
      {conContrato && (
        <span className="block text-etiqueta">
          {contrato === null ? 'sin contrato' : `de ${String(contrato)} h`}
        </span>
      )}
    </>
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

export function LaSemana({
  dias,
  hoy,
  personas,
  turnos,
  editable,
  alTocar,
  avisos = [],
  conContrato = false,
}: LaSemanaProps) {
  const escritorio = usarEsEscritorio();
  const hoyEnLaSemana = dias.some((d) => d.fecha === hoy);
  const [elegido, setElegido] = useState(hoyEnLaSemana ? hoy : (dias[0]?.fecha ?? hoy));
  const delDia = (personaId: string, fecha: string) =>
    turnos.filter((t) => t.personaId === personaId && t.dia === fecha);
  const zonas = (['sala', 'cocina', 'otros'] as const).filter((z: Zona) =>
    personas.some((p) => p.zona === z),
  );
  const variasZonas = zonas.length > 1;

  if (personas.length === 0) return null;

  if (escritorio) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] table-fixed border-separate border-spacing-0 text-cuerpo">
          <colgroup>
            <col className="w-[10.5rem]" />
            {dias.map((d) => (
              <col key={d.fecha} />
            ))}
            <col className="w-[6.5rem]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="px-e2 pb-e2 text-left text-etiqueta text-texto-suave">
                Persona
              </th>
              {dias.map((d) => (
                <th
                  key={d.fecha}
                  scope="col"
                  className={clases(
                    'px-e1 pb-e2 text-center text-etiqueta',
                    d.fecha === hoy ? 'font-semibold text-texto' : 'text-texto-suave',
                  )}
                >
                  {d.corto}
                  {d.fecha === hoy && <span className="sr-only"> (hoy)</span>}
                </th>
              ))}
              <th scope="col" className="px-e2 pb-e2 text-right text-etiqueta text-texto-suave">
                Horas
              </th>
            </tr>
          </thead>
          {zonas.map((zona) => (
            <tbody key={zona}>
              {variasZonas && (
                <tr>
                  <th
                    colSpan={9}
                    scope="colgroup"
                    className="border-t border-borde px-e2 pt-e3 pb-e1 text-left text-etiqueta font-semibold uppercase tracking-wide text-texto-suave"
                  >
                    {COMO_SE_LLAMA_LA_ZONA[zona]}
                  </th>
                </tr>
              )}
              {personas
                .filter((p) => p.zona === zona)
                .map((p) => {
                  const suyos = avisos.filter((a) => a.personaId === p.personaId);
                  return (
                    <tr key={p.personaId} className="align-middle">
                      <th scope="row" className="px-e2 py-e1 text-left font-normal">
                        <span className="flex items-center gap-e1 font-medium">
                          {nombreCorto(p)} <LaMarcaDelAviso avisos={suyos} />
                        </span>
                        <span
                          className="block truncate text-etiqueta text-texto-suave"
                          title={p.rolNombre}
                        >
                          {p.rolNombre}
                        </span>
                      </th>
                      {dias.map((d) => {
                        const suyosDelDia = delDia(p.personaId, d.fecha);
                        const texto = loDelDia(suyosDelDia);
                        return (
                          <td key={d.fecha} className="px-[2px] py-[2px]">
                            <Casilla
                              turnos={suyosDelDia}
                              editable={editable}
                              esHoy={d.fecha === hoy}
                              etiqueta={`${nombreCorto(p)}, ${d.largo}: ${texto === '' ? 'nada' : texto}`}
                              alTocar={
                                alTocar === undefined
                                  ? undefined
                                  : () => {
                                      alTocar(p.personaId, d.fecha);
                                    }
                              }
                            />
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-e2 text-right text-secundario tabular-nums text-texto-suave">
                        <LasHoras persona={p} conContrato={conContrato} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          ))}
        </table>
      </div>
    );
  }

  // ── En el móvil: un día, y quién trabaja ──────────────────────────────────
  const dia = dias.find((d) => d.fecha === elegido) ?? dias[0];
  return (
    <div className="flex flex-col gap-e3">
      <div role="tablist" aria-label="Día de la semana" className="grid grid-cols-7 gap-e1">
        {dias.map((d) => (
          <button
            key={d.fecha}
            type="button"
            role="tab"
            aria-selected={d.fecha === elegido}
            aria-label={d.largo}
            onClick={() => {
              setElegido(d.fecha);
            }}
            className={clases(
              'flex min-h-toque flex-col items-center justify-center rounded-medio text-etiqueta',
              d.fecha === elegido
                ? 'bg-texto font-semibold text-superficie'
                : d.fecha === hoy
                  ? 'bg-naranja-suave text-texto'
                  : 'bg-fondo text-texto-suave',
            )}
          >
            <span>{d.corto.split(' ')[0]}</span>
            <span className="tabular-nums">{d.corto.split(' ')[1]}</span>
          </button>
        ))}
      </div>
      {dia !== undefined &&
        zonas.map((zona) => {
          const deLaZona = personas.filter((p) => p.zona === zona);
          return (
            <section key={zona} aria-label={COMO_SE_LLAMA_LA_ZONA[zona]}>
              {variasZonas && (
                <h3 className="px-e1 pb-e1 text-etiqueta font-semibold uppercase tracking-wide text-texto-suave">
                  {COMO_SE_LLAMA_LA_ZONA[zona]}
                </h3>
              )}
              <ul className="flex flex-col divide-y divide-borde rounded-medio border border-borde">
                {deLaZona.map((p) => {
                  const suyos = delDia(p.personaId, dia.fecha);
                  const texto = loDelDia(suyos);
                  return (
                    <li key={p.personaId} className="flex items-center gap-e2 px-e3 py-e1">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-e1 font-medium">
                          {nombreCorto(p)}{' '}
                          <LaMarcaDelAviso
                            avisos={avisos.filter(
                              (a) =>
                                a.personaId === p.personaId &&
                                (a.dia === null || a.dia === dia.fecha),
                            )}
                          />
                        </span>
                        <span className="block text-etiqueta text-texto-suave">{p.rolNombre}</span>
                      </span>
                      <span className="w-[9.5rem] shrink-0">
                        <Casilla
                          turnos={suyos}
                          editable={editable}
                          esHoy={false}
                          etiqueta={`${nombreCorto(p)}, ${dia.largo}: ${texto === '' ? 'nada' : texto}`}
                          alTocar={
                            alTocar === undefined
                              ? undefined
                              : () => {
                                  alTocar(p.personaId, dia.fecha);
                                }
                          }
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

/** La semana de una persona, día a día: «Solo el mío». */
export function MiSemana({
  dias,
  hoy,
  turnos,
  alTocar,
}: {
  readonly dias: readonly DiaDeLaSemana[];
  readonly hoy: string;
  readonly turnos: readonly TurnoVisto[];
  readonly alTocar?: (fecha: string) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-borde rounded-medio border border-borde">
      {dias.map((d) => {
        const delDia = turnos.filter((t) => t.dia === d.fecha);
        const texto = loDelDia(delDia);
        const minutos = delDia.reduce((suma, t) => suma + t.minutos, 0);
        return (
          <li
            key={d.fecha}
            className={clases(
              'flex items-center gap-e3 px-e3 py-e2',
              d.fecha === hoy && 'bg-naranja-suave/40',
            )}
          >
            <span className="w-[6rem] shrink-0 font-medium first-letter:uppercase">
              {d.largo}
              {d.fecha === hoy && (
                <span className="block text-etiqueta font-normal text-texto-suave">Hoy</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              {alTocar === undefined || texto === '' ? (
                <span className={texto === '' ? 'text-texto-tenue' : ''}>
                  {texto === '' ? 'Nada' : texto}
                </span>
              ) : (
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:underline"
                  onClick={() => {
                    alTocar(d.fecha);
                  }}
                >
                  {texto}
                </button>
              )}
            </span>
            <span className="shrink-0 text-secundario tabular-nums text-texto-suave">
              {minutos === 0 ? '' : comoSeLeenLasHoras(minutos)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
