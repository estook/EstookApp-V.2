import { useEffect, useState, type ReactNode } from 'react';
import { CREDITOS_DE_FOGON, LETRAS_PARA_FOGON } from '@estook/dominio';
import { Aviso, Boton, Botones, CAJA, Cargando, ErrorEnCristiano, Hoja, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { Dictar } from '../fogon/Dictar.tsx';
import { AvisoDelBorrador } from '../fogon/PedirleAFogon.tsx';
import { creditos, type CuadranteDeFogon, type LoQueSabeDelCuadrante } from '../fogon/contrato.ts';

/**
 * El horario de la semana, con Fogón (Fogón 1 · 3, decisión 0098).
 *
 * Lo que pidió Richi el 19-oct: **que pregunte los días de más venta y a quién quieres
 * en ellos**, y que no pregunte las horas de cada uno, que ya están en su ficha. Con eso,
 * las horas de contrato, quién es de cocina y de sala, qué libró cada uno la semana
 * pasada y los turnos de siempre, propone la semana entera siguiendo sus reglas: los de
 * pocas horas, de apoyo en los días fuertes; los de jornada completa, toda la semana;
 * cocina libra lunes, martes o miércoles sin quedarse sola; y rotación.
 *
 * Lo propuesto se enseña **día a día y con las horas de cada uno frente a su contrato**,
 * contadas por Estook. Se pone en el borrador solo si se pulsa, y solo en una semana
 * vacía; publicarlo sigue siendo cosa de quien lo monta.
 */

const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
const DIAS_LARGOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;
const ZONA: Readonly<Record<string, string>> = { cocina: 'cocina', sala: 'sala', otros: 'otros' };

/** Las siete fechas de la semana que empieza ese lunes. */
function laSemana(lunes: string): string[] {
  const [a, m, d] = lunes.split('-').map(Number) as [number, number, number];
  return [0, 1, 2, 3, 4, 5, 6].map((i) =>
    new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10),
  );
}

function enHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m)}`;
}

function Pastilla({
  puesta,
  alTocar,
  children,
}: {
  readonly puesta: boolean;
  readonly alTocar: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={puesta}
      onClick={alTocar}
      className={clases(
        'min-h-toque rounded-redondo border px-e3 text-secundario font-medium',
        puesta
          ? 'border-naranja bg-naranja-suave text-texto'
          : 'border-borde bg-superficie text-texto-suave',
      )}
    >
      {children}
    </button>
  );
}

export function CuadranteConFogon({
  lunes,
  abierta,
  alCerrar,
  alPonerlo,
}: {
  readonly lunes: string;
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  /** Ya está en el borrador: se vuelve a leer y se dice cuántos. */
  readonly alPonerlo: (frase: string) => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const sabe = usarLectura<LoQueSabeDelCuadrante>(
    'lo_que_sabe_fogon_del_cuadrante',
    { lunes },
    abierta,
  );
  const [fuertes, setFuertes] = useState<ReadonlySet<string>>(new Set());
  const [quienes, setQuienes] = useState<ReadonlySet<string>>(new Set());
  const [turnos, setTurnos] = useState('');
  const [notas, setNotas] = useState('');
  const [propuesta, setPropuesta] = useState<CuadranteDeFogon | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [poniendo, setPoniendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  // Lo que ya sabe, puesto de entrada: los días fuertes y los turnos de siempre.
  const datos = sabe.data;
  useEffect(() => {
    if (datos === undefined) return;
    setFuertes(new Set(datos.diasFuertes));
    setTurnos(datos.turnos);
  }, [datos]);

  const dias = laSemana(lunes);

  async function pedir() {
    setPidiendo(true);
    setError(null);
    const respuesta = await cliente.ejecutar<CuadranteDeFogon>('hacer_el_cuadrante_con_fogon', {
      lunes,
      dias_fuertes: [...fuertes].sort(),
      en_los_fuertes: [...quienes],
      turnos: turnos.trim(),
      ...(notas.trim() === '' ? {} : { notas: notas.trim() }),
    });
    setPidiendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setPropuesta(respuesta.datos);
  }

  async function ponerlo() {
    if (propuesta === null) return;
    setPoniendo(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ puestos: number; noCaben: number }>(
      'poner_el_cuadrante_de_fogon',
      {
        lunes,
        tramos: propuesta.tramos.map((t) => ({
          persona_id: t.personaId,
          dia: t.dia,
          entra: t.entra,
          sale: t.sale,
          descanso_minutos: t.descansoMinutos,
        })),
      },
    );
    if (!respuesta.ok) {
      setPoniendo(false);
      setError(respuesta.error);
      return;
    }
    const { puestos, noCaben } = respuesta.datos;
    await alPonerlo(
      `${String(puestos)} ${puestos === 1 ? 'tramo puesto' : 'tramos puestos'} por Fogón${noCaben > 0 ? ` (${String(noCaben)} no cabían)` : ''}. Revísalos antes de publicar.`,
    );
    setPoniendo(false);
    setPropuesta(null);
    alCerrar();
  }

  const pie =
    propuesta === null ? (
      <Botones>
        <Boton tono="texto" onClick={alCerrar}>
          Dejarlo
        </Boton>
        <Boton
          tono="principal"
          disabled={datos === undefined || !datos.semanaVacia || datos.personas.length === 0}
          cargando={pidiendo}
          textoCargando="Fogón está pensando"
          onClick={() => {
            void pedir();
          }}
        >
          Hacer el horario · {creditos(CREDITOS_DE_FOGON.hacer_cuadrante)}
        </Boton>
      </Botones>
    ) : (
      <Botones>
        <Boton
          tono="texto"
          onClick={() => {
            setPropuesta(null);
          }}
        >
          Cambiar lo que le he dicho
        </Boton>
        <Boton
          tono="principal"
          cargando={poniendo}
          textoCargando="Poniéndolo"
          onClick={() => {
            void ponerlo();
          }}
        >
          Ponerlo en el borrador
        </Boton>
      </Botones>
    );

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="El horario, con Fogón" pie={pie}>
      <div className="flex flex-col gap-e4 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {datos === undefined ? (
          <Cargando que="lo que sabe Fogón de tu equipo" lineas={4} />
        ) : !datos.semanaVacia ? (
          <Aviso tono="atencion" titulo="Esta semana ya tiene tramos">
            Fogón solo rellena una semana vacía, para no pisar lo que has puesto.
          </Aviso>
        ) : datos.personas.length === 0 ? (
          <Aviso tono="atencion" titulo="No hay nadie que fiche en este local">
            Añade a tu equipo en Equipo y vuelve.
          </Aviso>
        ) : propuesta === null ? (
          <>
            <section className="flex flex-col gap-e2">
              <h3 className="text-cuerpo font-semibold">¿Qué días se vende más?</h3>
              <p className="text-secundario text-texto-suave">
                {datos.segunTusVentas
                  ? 'Los he marcado según tus ventas de las últimas semanas.'
                  : 'Sin ventas todavía, he marcado lo normal: viernes y sábado.'}
              </p>
              <div className="flex flex-wrap gap-e2">
                {dias.map((fecha, i) => (
                  <Pastilla
                    key={fecha}
                    puesta={fuertes.has(fecha)}
                    alTocar={() => {
                      setFuertes((antes) => {
                        const nuevo = new Set(antes);
                        if (nuevo.has(fecha)) nuevo.delete(fecha);
                        else nuevo.add(fecha);
                        return nuevo;
                      });
                    }}
                  >
                    {DIAS_CORTOS[i]} {String(Number(fecha.slice(8)))}
                  </Pastilla>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-e2">
              <h3 className="text-cuerpo font-semibold">¿A quién quieres esos días?</h3>
              <p className="text-secundario text-texto-suave">
                Las horas de cada uno ya las sé por su ficha.
              </p>
              <div className="flex flex-wrap gap-e2">
                {datos.personas.map((p) => (
                  <Pastilla
                    key={p.personaId}
                    puesta={quienes.has(p.personaId)}
                    alTocar={() => {
                      setQuienes((antes) => {
                        const nuevo = new Set(antes);
                        if (nuevo.has(p.personaId)) nuevo.delete(p.personaId);
                        else nuevo.add(p.personaId);
                        return nuevo;
                      });
                    }}
                  >
                    {p.nombre} · {ZONA[p.zona] ?? p.zona}
                    {p.horasDeContrato === null ? '' : ` · ${String(p.horasDeContrato)} h`}
                  </Pastilla>
                ))}
              </div>
            </section>

            <label className="flex flex-col gap-e1">
              <span className="text-cuerpo font-semibold">Los turnos del local</span>
              <span className="text-secundario text-texto-suave">
                {datos.turnos === ''
                  ? 'A qué horas se entra y se sale. Si lo dejas vacío, usa los de mediodía y noche.'
                  : 'Los de las últimas semanas. Cámbialos si esta semana es distinta.'}
              </span>
              <textarea
                value={turnos}
                maxLength={LETRAS_PARA_FOGON}
                rows={2}
                placeholder="Cocina 10:00–16:00 y 19:00–23:30. Sala 12:30–16:30 y 20:00–00:00"
                onChange={(e) => {
                  setTurnos(e.target.value);
                }}
                className={`${CAJA} min-h-[3.25rem] bg-superficie py-e2`}
              />
            </label>

            <label className="flex flex-col gap-e1">
              <span className="text-cuerpo font-semibold">¿Algo más? (si quieres)</span>
              <textarea
                value={notas}
                maxLength={LETRAS_PARA_FOGON}
                rows={2}
                placeholder="Ana tiene médico el jueves por la mañana. El lunes cerramos."
                onChange={(e) => {
                  setNotas(e.target.value);
                }}
                className={`${CAJA} min-h-[3.25rem] bg-superficie py-e2`}
              />
              <Dictar
                alDecir={(dicho) => {
                  setNotas((antes) =>
                    `${antes.trim() === '' ? '' : `${antes.trim()} `}${dicho}`.slice(
                      0,
                      LETRAS_PARA_FOGON,
                    ),
                  );
                }}
              />
            </label>
          </>
        ) : (
          <>
            {propuesta.explicacion !== '' && <p className="text-cuerpo">{propuesta.explicacion}</p>}
            <AvisoDelBorrador />
            <ul className="flex flex-col gap-e3">
              {dias.map((fecha, i) => {
                const delDia = propuesta.tramos.filter((t) => t.dia === fecha);
                return (
                  <li key={fecha} className="flex flex-col gap-e1">
                    <span className="text-cuerpo font-semibold">
                      {DIAS_LARGOS[i]} {String(Number(fecha.slice(8)))}
                      {fuertes.has(fecha) ? ' · de más venta' : ''}
                    </span>
                    {delDia.length === 0 ? (
                      <span className="text-secundario text-texto-suave">Nadie</span>
                    ) : (
                      <span className="text-secundario">
                        {delDia.map((t) => `${t.nombre} ${t.entra}–${t.sale}`).join(' · ')}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <section className="flex flex-col gap-e1">
              <h3 className="text-cuerpo font-semibold">Las horas de cada uno</h3>
              <ul className="flex flex-col gap-e1">
                {propuesta.horas.map((h) => {
                  const pasa = h.horasDeContrato !== null && h.minutos > h.horasDeContrato * 60;
                  return (
                    <li key={h.personaId} className="flex justify-between gap-e2 text-secundario">
                      <span>{h.nombre}</span>
                      <span className={clases('tabular-nums', pasa && 'font-semibold text-mal')}>
                        {enHoras(h.minutos)}
                        {h.horasDeContrato === null ? '' : ` de ${String(h.horasDeContrato)} h`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </Hoja>
  );
}
