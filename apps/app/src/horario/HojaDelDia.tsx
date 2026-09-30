import { useState } from 'react';
import { comoSeLeenLasHoras, type AvisoDelHorario, type TipoDeTurno } from '@estook/dominio';
import { Aviso, Boton, Botones, Campo, ErrorEnCristiano, Hoja, Selector, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { nombreCorto, type PersonaEnElHorario, type TurnoVisto } from './contrato.ts';

/**
 * El día de una persona, para montarlo (H2 · 0069).
 *
 * Arriba, lo que ya tiene: cada tramo se toca para cambiarlo o se quita. Debajo, un
 * tramo nuevo —entra, sale y su descanso— y los tres días que no se trabaja: libre,
 * vacaciones y baja. Una ausencia ocupa el día entero; poner un tramo en un día
 * libre lo deja de ser. Lo decide el servidor, y aquí solo se dice.
 */

const DESCANSOS = [0, 15, 20, 30, 45, 60] as const;

export function HojaDelDia({
  lunes,
  persona,
  dia,
  diaEnLetra,
  turnos,
  avisos,
  alCerrar,
  alCambiar,
}: {
  readonly lunes: string;
  readonly persona: PersonaEnElHorario;
  readonly dia: string;
  /** «martes 6». */
  readonly diaEnLetra: string;
  readonly turnos: readonly TurnoVisto[];
  readonly avisos: readonly AvisoDelHorario[];
  readonly alCerrar: () => void;
  readonly alCambiar: () => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const tramos = turnos.filter((t) => t.tipo === 'trabajo');
  const ausencia = turnos.find((t) => t.tipo !== 'trabajo');

  const [cambiando, setCambiando] = useState<TurnoVisto | null>(null);
  const [entra, setEntra] = useState('');
  const [sale, setSale] = useState('');
  const [descanso, setDescanso] = useState('0');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);

  function empezarACambiar(t: TurnoVisto | null) {
    setCambiando(t);
    setEntra(t?.entra ?? '');
    setSale(t?.sale ?? '');
    setDescanso(String(t?.descansoMinutos ?? 0));
    setError(null);
  }

  async function hacer(que: string, pedir: () => ReturnType<typeof cliente.ejecutar>) {
    setHaciendo(que);
    setError(null);
    const respuesta = await pedir();
    if (!respuesta.ok) {
      setHaciendo(null);
      setError(respuesta.error);
      return false;
    }
    await alCambiar();
    setHaciendo(null);
    return true;
  }

  async function ponerTramo() {
    const hecho = await hacer('tramo', () =>
      cliente.ejecutar('poner_tramo', {
        lunes,
        persona_id: persona.personaId,
        dia,
        tipo: 'trabajo',
        entra,
        sale,
        descanso_minutos: Number(descanso),
        ...(cambiando === null ? {} : { turno_id: cambiando.id }),
      }),
    );
    if (hecho) empezarACambiar(null);
  }

  async function ponerAusencia(tipo: Exclude<TipoDeTurno, 'trabajo'>) {
    const hecho = await hacer(tipo, () =>
      cliente.ejecutar('poner_tramo', { lunes, persona_id: persona.personaId, dia, tipo }),
    );
    if (hecho) alCerrar();
  }

  async function quitar(t: TurnoVisto) {
    await hacer(`quitar-${t.id}`, () => cliente.ejecutar('quitar_tramo', { turno_id: t.id }));
    if (cambiando?.id === t.id) empezarACambiar(null);
  }

  const listo = /^\d{2}:\d{2}$/.test(entra) && /^\d{2}:\d{2}$/.test(sale) && entra !== sale;

  return (
    <Hoja abierta titulo={`${nombreCorto(persona)}, ${diaEnLetra}`} alCerrar={alCerrar}>
      <div className="flex flex-col gap-e4">
        {avisos.map((a) => (
          <Aviso
            key={`${a.que}-${a.dia ?? ''}`}
            tono={a.nivel === 'rojo' ? 'mal' : 'atencion'}
            titulo={a.texto}
          />
        ))}

        {(tramos.length > 0 || ausencia !== undefined) && (
          <section aria-label="Lo que tiene puesto">
            <h3 className="pb-e2 text-etiqueta font-semibold uppercase tracking-wide text-texto-suave">
              Lo que tiene puesto
            </h3>
            <ul className="flex flex-col divide-y divide-borde rounded-medio border border-borde">
              {[...tramos, ...(ausencia === undefined ? [] : [ausencia])].map((t) => (
                <li
                  key={t.id}
                  className={clases(
                    'flex items-center gap-e2 px-e3 py-e1',
                    cambiando?.id === t.id && 'bg-naranja-suave/40',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    {t.tipo === 'trabajo' ? (
                      <>
                        <span className="font-medium tabular-nums">
                          {t.entra}–{t.sale}
                        </span>
                        <span className="block text-etiqueta text-texto-suave">
                          {comoSeLeenLasHoras(t.minutos)}
                          {t.descansoMinutos > 0
                            ? ` · ${String(t.descansoMinutos)} min de descanso`
                            : ''}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium">
                        {t.tipo === 'libre'
                          ? 'Libre'
                          : t.tipo === 'vacaciones'
                            ? 'Vacaciones'
                            : 'Baja'}
                      </span>
                    )}
                  </span>
                  {t.tipo === 'trabajo' && (
                    <Boton
                      tono="texto"
                      onClick={() => {
                        empezarACambiar(t);
                      }}
                    >
                      Cambiar
                    </Boton>
                  )}
                  <Boton
                    tono="texto"
                    cargando={haciendo === `quitar-${t.id}`}
                    textoCargando="Quitando"
                    onClick={() => {
                      void quitar(t);
                    }}
                  >
                    Quitar
                  </Boton>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          aria-label={cambiando === null ? 'Un tramo nuevo' : 'Cambiar el tramo'}
          className="flex flex-col gap-e3"
        >
          <h3 className="text-etiqueta font-semibold uppercase tracking-wide text-texto-suave">
            {cambiando === null
              ? tramos.length > 0
                ? 'Otro tramo'
                : 'Un tramo'
              : 'Cambiar el tramo'}
          </h3>
          <div className="grid grid-cols-2 gap-e3">
            <Campo
              etiqueta="Entra"
              tipo="hora"
              value={entra}
              onChange={(e) => {
                setEntra(e.currentTarget.value);
              }}
            />
            <Campo
              etiqueta="Sale"
              tipo="hora"
              value={sale}
              onChange={(e) => {
                setSale(e.currentTarget.value);
              }}
            />
          </div>
          <Selector
            etiqueta="Descanso dentro del tramo"
            value={descanso}
            opciones={DESCANSOS.map((m) => ({
              valor: String(m),
              texto: m === 0 ? 'Sin descanso' : `${String(m)} min`,
            }))}
            onChange={(e) => {
              setDescanso(e.currentTarget.value);
            }}
          />
          <p className="text-secundario text-texto-suave">
            Si sale antes de la hora de entrar, el tramo acaba al día siguiente: 20:00 a 02:00 son
            seis horas. El horario partido son dos tramos.
          </p>
          <Botones>
            <Boton
              tono="principal"
              disabled={!listo}
              cargando={haciendo === 'tramo'}
              textoCargando="Poniéndolo"
              onClick={() => {
                void ponerTramo();
              }}
            >
              {cambiando === null ? 'Poner el tramo' : 'Guardar el cambio'}
            </Boton>
            {cambiando !== null && (
              <Boton
                tono="texto"
                onClick={() => {
                  empezarACambiar(null);
                }}
              >
                Dejarlo como estaba
              </Boton>
            )}
          </Botones>
        </section>

        {error !== null && <ErrorEnCristiano error={error} />}

        <section aria-label="Si no trabaja" className="flex flex-col gap-e2">
          <h3 className="text-etiqueta font-semibold uppercase tracking-wide text-texto-suave">
            Si no trabaja
          </h3>
          <div className="flex flex-wrap gap-e2">
            {(['libre', 'vacaciones', 'baja'] as const).map((tipo) => (
              <Boton
                key={tipo}
                tono="secundario"
                cargando={haciendo === tipo}
                textoCargando="Poniéndolo"
                disabled={ausencia?.tipo === tipo}
                onClick={() => {
                  void ponerAusencia(tipo);
                }}
              >
                {tipo === 'libre' ? 'Libre' : tipo === 'vacaciones' ? 'Vacaciones' : 'Baja'}
              </Boton>
            ))}
          </div>
          <p className="text-secundario text-texto-suave">
            Ocupa el día entero: lo que tuviera puesto ese día se quita.
          </p>
        </section>
      </div>
    </Hoja>
  );
}
