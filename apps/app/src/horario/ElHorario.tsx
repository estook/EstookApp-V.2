import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  comoPorcentaje,
  comoSeLeenLasHoras,
  conSimbolo,
  fechaOperativa,
  lunesDe,
  masDias,
  type Centimos,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import {
  Aviso,
  Boton,
  Botones,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  Tarjeta,
  clases,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import { HojaDelDia } from './HojaDelDia.tsx';
import { LaSemana, MiSemana } from './LaSemana.tsx';
import { conQuienCoincide, loDelDia } from './cuentas.ts';
import {
  nombreCorto,
  type ElBorrador,
  type ElHorario as DatosDelHorario,
  type Zona,
} from './contrato.ts';

/**
 * El horario de la semana (H2 · decisiones 0066, 0068 y 0069).
 *
 * Una sola pantalla, con dos caras:
 *
 *   · **Lo que ve el equipo**: lo publicado, de todos o solo lo mío, y por zona.
 *     Cualquiera del local lo ve —en un bar el horario está en la pared—, con horas y
 *     nunca con euros. Se toca un turno y dice con quién coincide.
 *   · **Montarlo**, para quien lleva el horario: el borrador, que no ve nadie más,
 *     con lo que cuesta si lo puede ver, lo que hay que mirar antes de publicar, y
 *     publicar. La primera vez a cada uno le llega lo suyo; después, solo a quien le
 *     cambia algo.
 *
 * Se llega desde Equipo › Horarios, desde Calendario › Turnos, desde «Mi turno» del
 * Panel y desde el aviso de la campana (`/horario?semana=…`).
 */
export function ElHorario({
  conTitulo = true,
}: {
  /** Dentro de Equipo o Calendario el título lo pone la app: aquí no se repite. */
  readonly conTitulo?: boolean;
} = {}) {
  const { permisos } = usarSesion();
  const [parametros, setParametros] = useSearchParams();
  const semana = parametros.get('semana') ?? undefined;
  const puedeMontarlo = puedeEditar(permisos, 'accion.publicar_cuadrante');
  const [cara, setCara] = useState<'montar' | 'ver'>(puedeMontarlo ? 'montar' : 'ver');

  function irALaSemana(lunes: string) {
    const siguientes = new URLSearchParams(parametros);
    siguientes.set('semana', lunes);
    setParametros(siguientes, { replace: true });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-e4">
      {conTitulo && <h1 className="text-pantalla font-semibold">Horario</h1>}
      {puedeMontarlo && (
        <div
          role="tablist"
          aria-label="Qué horario ver"
          className="grid w-full max-w-md grid-cols-2 gap-e1 rounded-medio bg-borde/40 p-e1"
        >
          {(
            [
              ['montar', 'Montarlo'],
              ['ver', 'Lo que ve el equipo'],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={cara === valor}
              onClick={() => {
                setCara(valor);
              }}
              className={clases(
                'min-h-toque rounded-medio text-cuerpo',
                cara === valor
                  ? 'bg-superficie font-medium text-texto shadow-s1'
                  : 'text-texto-suave hover:text-texto',
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      )}
      {cara === 'montar' && puedeMontarlo ? (
        <MontarElHorario semana={semana} irALaSemana={irALaSemana} />
      ) : (
        <VerElHorario
          semana={semana}
          irALaSemana={irALaSemana}
          alMontar={
            puedeMontarlo
              ? () => {
                  setCara('montar');
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ── Cabecera: la semana y cómo moverse ───────────────────────────────────────

function LaCabecera({
  lunes,
  semana,
  hoy,
  irALaSemana,
  estado,
}: {
  readonly lunes: string;
  readonly semana: string;
  readonly hoy: string;
  readonly irALaSemana: (lunes: string) => void;
  readonly estado?: ReactNode;
}) {
  const esta = lunesDe(fechaOperativa(hoy));
  return (
    <header className="flex flex-wrap items-center justify-between gap-e3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-e2 text-secundario text-texto-suave">
          <span>La semana {semana}</span>
          {estado}
        </p>
      </div>
      <div className="flex items-center gap-e1">
        <Boton
          tono="secundario"
          icono={<IconoFlechaIzquierda size={18} />}
          aria-label="La semana anterior"
          onClick={() => {
            irALaSemana(masDias(fechaOperativa(lunes), -7));
          }}
        >
          <span className="sr-only">La semana anterior</span>
        </Boton>
        {lunes !== esta && (
          <Boton
            tono="texto"
            onClick={() => {
              irALaSemana(esta);
            }}
          >
            Esta semana
          </Boton>
        )}
        <Boton
          tono="secundario"
          icono={<IconoFlechaDerecha size={18} />}
          aria-label="La semana siguiente"
          onClick={() => {
            irALaSemana(masDias(fechaOperativa(lunes), 7));
          }}
        >
          <span className="sr-only">La semana siguiente</span>
        </Boton>
      </div>
    </header>
  );
}

// ── Lo que ve el equipo ──────────────────────────────────────────────────────

function VerElHorario({
  semana,
  irALaSemana,
  alMontar,
}: {
  readonly semana: string | undefined;
  readonly irALaSemana: (lunes: string) => void;
  readonly alMontar: (() => void) | undefined;
}) {
  const { cliente } = usarSesion();
  const [soloElMio, setSoloElMio] = useState(false);
  const [zona, setZona] = useState<Zona | 'todas'>('todas');
  const [mirando, setMirando] = useState<{ personaId: string; fecha: string } | null>(null);

  const consulta = useQuery({
    queryKey: ['el_horario', semana ?? 'esta'],
    queryFn: async (): Promise<DatosDelHorario> => {
      const respuesta = await cliente.consultar<DatosDelHorario>(
        'el_horario',
        semana === undefined ? {} : { lunes: semana },
      );
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (consulta.isPending) return <Cargando que="el horario" />;
  if (consulta.isError) {
    return (
      <Aviso tono="atencion" titulo="No he podido leer el horario">
        Puede ser la conexión. Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }
  const datos = consulta.data;
  const zonas = [...new Set(datos.personas.map((p) => p.zona))];
  const personas = datos.personas.filter((p) => zona === 'todas' || p.zona === zona);
  const mios = datos.turnos.filter((t) => t.personaId === datos.yo);

  return (
    <>
      <LaCabecera
        lunes={datos.lunes}
        semana={datos.semana}
        hoy={datos.hoy}
        irALaSemana={irALaSemana}
        estado={datos.publicado ? null : <Etiqueta tono="neutro">Sin publicar</Etiqueta>}
      />

      {!datos.publicado ? (
        <EstadoVacio
          dibujo="reloj"
          acento="var(--color-app-equipo)"
          titulo="Esta semana todavía no está publicada"
          frase="Cuando quien lleva el horario la publique, sale aquí y te llega un aviso con lo tuyo."
          {...(alMontar === undefined
            ? { sinAccionPorque: 'El horario lo publica quien lo lleva en tu local.' }
            : {
                accion: (
                  <Boton tono="principal" onClick={alMontar}>
                    Montarla
                  </Boton>
                ),
              })}
        />
      ) : (
        <Tarjeta
          titulo={soloElMio ? 'Lo mío' : 'El de todos'}
          accion={
            <div className="flex items-center gap-e1" role="group" aria-label="De quién">
              {(
                [
                  [false, 'De todos'],
                  [true, 'Solo el mío'],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={texto}
                  type="button"
                  aria-pressed={soloElMio === valor}
                  onClick={() => {
                    setSoloElMio(valor);
                  }}
                  className={clases(
                    'min-h-toque rounded-medio px-e3 text-secundario',
                    soloElMio === valor
                      ? 'bg-texto font-medium text-superficie'
                      : 'bg-fondo text-texto-suave',
                  )}
                >
                  {texto}
                </button>
              ))}
            </div>
          }
          origen={datos.publicadaPor === null ? 'Publicado' : `Publicado por ${datos.publicadaPor}`}
        >
          <div className="flex flex-col gap-e3">
            {!soloElMio && zonas.length > 1 && (
              <div className="flex flex-wrap gap-e1" role="group" aria-label="Zona">
                {(['todas', ...zonas] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    aria-pressed={zona === z}
                    onClick={() => {
                      setZona(z);
                    }}
                    className={clases(
                      'min-h-[2.25rem] rounded-redondo px-e3 text-secundario',
                      zona === z
                        ? 'bg-naranja-suave font-medium text-texto'
                        : 'bg-fondo text-texto-suave',
                    )}
                  >
                    {z === 'todas'
                      ? 'Todas'
                      : z === 'sala'
                        ? 'Sala'
                        : z === 'cocina'
                          ? 'Cocina'
                          : 'El resto'}
                  </button>
                ))}
              </div>
            )}
            {soloElMio ? (
              <MiSemana
                dias={datos.dias}
                hoy={datos.hoy}
                turnos={mios}
                alTocar={(fecha) => {
                  setMirando({ personaId: datos.yo, fecha });
                }}
              />
            ) : (
              <LaSemana
                dias={datos.dias}
                hoy={datos.hoy}
                personas={personas}
                turnos={datos.turnos}
                editable={false}
                alTocar={(personaId, fecha) => {
                  setMirando({ personaId, fecha });
                }}
              />
            )}
            <div className="flex flex-wrap gap-e3 border-t border-borde pt-e3">
              <BotonDelDocumento
                consulta={'el_horario_en_pdf'}
                parametros={{ lunes: datos.lunes, de: 'todos' }}
                texto="El de la pared, en PDF"
              />
              {mios.length > 0 && (
                <BotonDelDocumento
                  consulta={'el_horario_en_pdf'}
                  parametros={{ lunes: datos.lunes, de: 'mio' }}
                  texto="El mío, en PDF"
                  tono="texto"
                />
              )}
            </div>
          </div>
        </Tarjeta>
      )}

      {mirando !== null && (
        <ConQuienCoincide
          datos={datos}
          personaId={mirando.personaId}
          fecha={mirando.fecha}
          alCerrar={() => {
            setMirando(null);
          }}
        />
      )}
    </>
  );
}

function ConQuienCoincide({
  datos,
  personaId,
  fecha,
  alCerrar,
}: {
  readonly datos: DatosDelHorario;
  readonly personaId: string;
  readonly fecha: string;
  readonly alCerrar: () => void;
}) {
  const persona = datos.personas.find((p) => p.personaId === personaId);
  const dia = datos.dias.find((d) => d.fecha === fecha);
  const suyos = datos.turnos.filter((t) => t.personaId === personaId && t.dia === fecha);
  const trabaja = suyos.filter((t) => t.tipo === 'trabajo');
  const conQuien = conQuienCoincide(datos.personas, datos.turnos, personaId, fecha);
  const texto = loDelDia(suyos);
  if (persona === undefined || dia === undefined) return null;

  return (
    <Hoja
      abierta
      titulo={`${persona.personaId === datos.yo ? 'Tú' : nombreCorto(persona)}, ${dia.largo}`}
      alCerrar={alCerrar}
    >
      <div className="flex flex-col gap-e4">
        <p className="text-seccion font-semibold">{texto === '' ? 'Nada puesto' : texto}</p>
        {trabaja.some((t) => t.descansoMinutos > 0) && (
          <p className="text-secundario text-texto-suave">
            Con {trabaja.map((t) => `${String(t.descansoMinutos)} min`).join(' y ')} de descanso.
          </p>
        )}
        {trabaja.length > 0 && (
          <section aria-label="Con quién coincide">
            <h3 className="pb-e2 text-etiqueta font-semibold uppercase tracking-wide text-texto-suave">
              Con quién coincide
            </h3>
            {conQuien.length === 0 ? (
              <p className="text-texto-suave">Con nadie más en ese rato.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-borde rounded-medio border border-borde">
                {conQuien.map((p) => (
                  <li
                    key={p.personaId}
                    className="flex items-center justify-between gap-e2 px-e3 py-e2"
                  >
                    <span>
                      {p.personaId === datos.yo ? 'Tú' : nombreCorto(p)}
                      <span className="block text-etiqueta text-texto-suave">{p.rolNombre}</span>
                    </span>
                    <span className="tabular-nums text-texto-suave">
                      {loDelDia(
                        datos.turnos.filter((t) => t.personaId === p.personaId && t.dia === fecha),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <Boton tono="principal" ancho onClick={alCerrar}>
          Hecho
        </Boton>
      </div>
    </Hoja>
  );
}

// ── Montarlo ─────────────────────────────────────────────────────────────────

const COMO_ESTA: Readonly<
  Record<ElBorrador['estado'], { texto: string; tono: 'neutro' | 'bien' | 'atencion' | 'info' }>
> = {
  nueva: { texto: 'Sin empezar', tono: 'neutro' },
  borrador: { texto: 'Borrador, sin publicar', tono: 'info' },
  publicada: { texto: 'Publicada', tono: 'bien' },
  con_cambios: { texto: 'Cambios sin publicar', tono: 'atencion' },
};

function MontarElHorario({
  semana,
  irALaSemana,
}: {
  readonly semana: string | undefined;
  readonly irALaSemana: (lunes: string) => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [abierto, setAbierto] = useState<{ personaId: string; fecha: string } | null>(null);
  const [preguntando, setPreguntando] = useState<'copiar' | 'publicar' | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [preguntarElChat, setAvisarEnElChat] = useState(false);

  const clave = ['el_horario_en_borrador', semana ?? 'esta'];
  const consulta = useQuery({
    queryKey: clave,
    queryFn: async (): Promise<ElBorrador> => {
      const respuesta = await cliente.consultar<ElBorrador>(
        'el_horario_en_borrador',
        semana === undefined ? {} : { lunes: semana },
      );
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  async function alCambiar() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['el_horario_en_borrador'] }),
      cache.invalidateQueries({ queryKey: ['el_horario'] }),
    ]);
  }

  if (consulta.isPending) return <Cargando que="el horario" />;
  if (consulta.isError) {
    return (
      <Aviso tono="atencion" titulo="No he podido leer el horario">
        Puede ser la conexión. Vuelve a intentarlo en un momento.
      </Aviso>
    );
  }
  const datos = consulta.data;
  const estado = COMO_ESTA[datos.estado];
  const hayAlgo = datos.turnos.length > 0;
  const minutosTotales = datos.personas.reduce((suma, p) => suma + p.minutos, 0);
  const rojos = datos.avisos.filter((a) => a.nivel === 'rojo').length;
  const salen = new Set(datos.turnos.map((t) => t.personaId)).size;

  async function hacer(que: 'copiar' | 'publicar', reemplazar: boolean): Promise<void> {
    setHaciendo(que);
    setError(null);
    setHecho(null);
    const respuesta =
      que === 'copiar'
        ? await cliente.ejecutar<{ puestos: number }>('copiar_la_semana_anterior', {
            lunes: datos.lunes,
            reemplazar,
          })
        : await cliente.ejecutar<{ primeraVez: boolean; avisados: number }>('publicar_el_horario', {
            lunes: datos.lunes,
          });
    if (!respuesta.ok) {
      setHaciendo(null);
      setPreguntando(null);
      setError(respuesta.error);
      return;
    }
    // **Primero se vuelve a leer, después se dice que está hecho** (lección 130):
    // si el aviso salía antes, quien tocaba enseguida otro botón lo hacía con la
    // semana de antes delante, y no se preguntaba antes de pisar lo copiado.
    await alCambiar();
    setHaciendo(null);
    setPreguntando(null);
    const salida = respuesta.datos as { puestos?: number; avisados?: number };
    setHecho(
      que === 'publicar'
        ? `Publicado. ${salida.avisados === 1 ? 'Le ha llegado el aviso a 1 persona' : `Les ha llegado el aviso a ${String(salida.avisados ?? 0)} personas`}.`
        : `${String(salida.puestos ?? 0)} ${salida.puestos === 1 ? 'tramo puesto' : 'tramos puestos'}. Revísalos antes de publicar.`,
    );
    // «Al acabar el horario, que aparezca: ¿quieres enviarlo al chat para avisar?» (0075).
    if (que === 'publicar') setAvisarEnElChat(true);
  }

  async function avisarEnElChat() {
    setHaciendo('avisar');
    setError(null);
    const respuesta = await cliente.ejecutar('avisar_del_horario', { lunes: datos.lunes });
    setHaciendo(null);
    setAvisarEnElChat(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setHecho('Publicado, y avisado en «Todo el equipo».');
  }

  const persona =
    abierto === null ? undefined : datos.personas.find((p) => p.personaId === abierto.personaId);
  const dia = abierto === null ? undefined : datos.dias.find((d) => d.fecha === abierto.fecha);

  return (
    <>
      <LaCabecera
        lunes={datos.lunes}
        semana={datos.semana}
        hoy={datos.hoy}
        irALaSemana={irALaSemana}
        estado={<Etiqueta tono={estado.tono}>{estado.texto}</Etiqueta>}
      />

      <section aria-label="Cómo va la semana" className="grid grid-cols-2 gap-e2 md:grid-cols-4">
        <LaCifra
          nombre="Horas de la semana"
          valor={comoSeLeenLasHoras(minutosTotales)}
          debajo={`${String(salen)} ${salen === 1 ? 'persona' : 'personas'}`}
        />
        {datos.coste !== undefined && (
          <>
            <LaCifra
              nombre="Lo que cuesta"
              valor={conSimbolo(datos.coste.totalCentimos as Centimos)}
              debajo={
                datos.coste.sinSueldo === 0
                  ? 'Con los sueldos puestos'
                  : `${String(datos.coste.sinSueldo)} sin sueldo puesto: no suman`
              }
            />
            <LaCifra
              nombre="Sobre lo previsto"
              valor={
                datos.coste.parteDePersonal === null
                  ? '—'
                  : comoPorcentaje(datos.coste.parteDePersonal)
              }
              debajo={
                datos.coste.ventasPrevistasCentimos === null
                  ? 'Todavía no se sabe: faltan cajas'
                  : `De ${conSimbolo(datos.coste.ventasPrevistasCentimos as Centimos)} previstos`
              }
            />
          </>
        )}
        <LaCifra
          nombre="Para mirar"
          valor={datos.avisos.length === 0 ? 'Nada' : String(datos.avisos.length)}
          debajo={
            rojos === 0
              ? datos.avisos.length === 0
                ? 'Todo en orden'
                : 'En ámbar'
              : `${String(rojos)} en rojo`
          }
          tono={rojos > 0 ? 'mal' : datos.avisos.length > 0 ? 'atencion' : undefined}
        />
      </section>

      <Botones>
        <Boton
          tono="principal"
          disabled={datos.estado === 'nueva' || datos.estado === 'publicada'}
          cargando={haciendo === 'publicar'}
          textoCargando="Publicando"
          onClick={() => {
            setPreguntando('publicar');
          }}
        >
          {datos.estado === 'con_cambios' ? 'Publicar los cambios' : 'Publicar'}
        </Boton>
        <Boton
          tono="secundario"
          cargando={haciendo === 'copiar'}
          textoCargando="Copiando"
          onClick={() => {
            if (hayAlgo) setPreguntando('copiar');
            else void hacer('copiar', false);
          }}
        >
          Copiar la semana anterior
        </Boton>
      </Botones>

      {error !== null && <ErrorEnCristiano error={error} />}
      {hecho !== null && (
        <Aviso
          tono="bien"
          titulo={hecho}
          esNoticia
          alCerrar={() => {
            setHecho(null);
          }}
        />
      )}

      {datos.avisos.length > 0 && (
        <details className="rounded-mayor border border-borde bg-superficie px-e4 py-e3">
          <summary className="cursor-pointer font-medium">
            Lo que hay que mirar antes de publicar ({datos.avisos.length})
          </summary>
          <ul className="mt-e3 flex flex-col gap-e2">
            {datos.avisos.map((a) => {
              const quien = datos.personas.find((p) => p.personaId === a.personaId);
              return (
                <li key={`${a.personaId}-${a.que}-${a.dia ?? ''}`} className="flex gap-e2">
                  <span
                    className={clases(
                      'font-semibold',
                      a.nivel === 'rojo' ? 'text-mal' : 'text-atencion',
                    )}
                  >
                    {quien === undefined ? '' : nombreCorto(quien)}
                  </span>
                  <span>{a.texto}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-e3 text-secundario text-texto-suave">
            Avisan, no impiden: puedes publicar igual. Los límites son los del Estatuto de los
            Trabajadores; tu convenio puede decir otra cosa.
          </p>
        </details>
      )}

      <Tarjeta pegado>
        <div className="p-e3 @min-[22rem]:p-e4">
          {datos.personas.length === 0 ? (
            <p className="text-texto-suave">
              Nadie ficha todavía en este local. Da de alta a tu equipo en Equipo › Personas.
            </p>
          ) : (
            <LaSemana
              dias={datos.dias}
              hoy={datos.hoy}
              personas={datos.personas}
              turnos={datos.turnos}
              editable
              avisos={datos.avisos}
              conContrato
              alTocar={(personaId, fecha) => {
                setAbierto({ personaId, fecha });
              }}
            />
          )}
        </div>
      </Tarjeta>

      {abierto !== null && persona !== undefined && dia !== undefined && (
        <HojaDelDia
          lunes={datos.lunes}
          persona={persona}
          dia={abierto.fecha}
          diaEnLetra={dia.largo}
          turnos={datos.turnos.filter(
            (t) => t.personaId === abierto.personaId && t.dia === abierto.fecha,
          )}
          avisos={datos.avisos.filter(
            (a) => a.personaId === abierto.personaId && (a.dia === null || a.dia === abierto.fecha),
          )}
          alCerrar={() => {
            setAbierto(null);
          }}
          alCambiar={alCambiar}
        />
      )}

      {preguntando === 'copiar' && (
        <Hoja
          abierta
          titulo="Copiar la semana anterior"
          alCerrar={() => {
            setPreguntando(null);
          }}
        >
          <div className="flex flex-col gap-e4">
            <p>
              Esta semana ya tiene cosas puestas. Se quitan y se ponen las de la semana anterior.
            </p>
            <Botones>
              <Boton
                tono="principal"
                cargando={haciendo === preguntando}
                textoCargando="Poniéndolas"
                onClick={() => {
                  void hacer(preguntando, true);
                }}
              >
                Cambiarlas
              </Boton>
              <Boton
                tono="texto"
                onClick={() => {
                  setPreguntando(null);
                }}
              >
                Dejarlo como está
              </Boton>
            </Botones>
          </div>
        </Hoja>
      )}

      {preguntando === 'publicar' && (
        <Hoja
          abierta
          titulo={datos.estado === 'con_cambios' ? 'Publicar los cambios' : 'Publicar la semana'}
          alCerrar={() => {
            setPreguntando(null);
          }}
        >
          <div className="flex flex-col gap-e4">
            {datos.estado === 'con_cambios' ? (
              datos.cambiosSinPublicar.length === 0 ? (
                <p>
                  Nadie nota nada: lo que cambia se queda igual para cada uno. No le llega aviso a
                  nadie.
                </p>
              ) : (
                <>
                  <p>Le llega un aviso solo a quien le cambia algo:</p>
                  <ul className="flex flex-col gap-e2">
                    {datos.cambiosSinPublicar.map((c) => (
                      <li key={c.personaId}>
                        <span className="font-medium">{c.nombre}</span>
                        <span className="block text-secundario text-texto-suave">
                          {c.dias
                            .map((d) => `${d.charAt(0).toUpperCase()}${d.slice(1)}`)
                            .join('. ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : (
              <p>
                Lo verá todo el equipo, y a cada una de las {String(salen)}{' '}
                {salen === 1 ? 'persona que sale' : 'personas que salen'} le llega lo suyo, en la
                campana y por correo.
              </p>
            )}
            {rojos > 0 && (
              <Aviso
                tono="atencion"
                titulo={`Hay ${String(rojos)} ${rojos === 1 ? 'cosa' : 'cosas'} en rojo`}
              >
                Puedes publicar igual. Míralo antes si no lo has hecho.
              </Aviso>
            )}
            <Botones>
              <Boton
                tono="principal"
                cargando={haciendo === 'publicar'}
                textoCargando="Publicando"
                onClick={() => {
                  void hacer('publicar', false);
                }}
              >
                Publicar
              </Boton>
              <Boton
                tono="texto"
                onClick={() => {
                  setPreguntando(null);
                }}
              >
                Todavía no
              </Boton>
            </Botones>
          </div>
        </Hoja>
      )}

      {/* «¿Quieres enviarlo al chat para avisar? Sí o no. Es más fácil» (Richi, 0075). */}
      {preguntarElChat && (
        <Hoja
          abierta
          titulo="¿Avisar en «Todo el equipo»?"
          alCerrar={() => {
            setAvisarEnElChat(false);
          }}
        >
          <div className="flex flex-col gap-e4">
            <p className="text-secundario text-texto-suave">
              Sale un aviso con «Ver el horario». No suena en el móvil: a cada uno ya le ha llegado
              lo suyo.
            </p>
            <Botones>
              <Boton
                tono="principal"
                cargando={haciendo === 'avisar'}
                textoCargando="Avisando"
                onClick={() => {
                  void avisarEnElChat();
                }}
              >
                Sí, avisar
              </Boton>
              <Boton
                tono="texto"
                onClick={() => {
                  setAvisarEnElChat(false);
                }}
              >
                No
              </Boton>
            </Botones>
          </div>
        </Hoja>
      )}
    </>
  );
}

function LaCifra({
  nombre,
  valor,
  debajo,
  tono,
}: {
  readonly nombre: string;
  readonly valor: string;
  readonly debajo: string;
  readonly tono?: 'mal' | 'atencion' | undefined;
}) {
  return (
    <div className="rounded-mayor border border-borde bg-superficie px-e4 py-e3 [box-shadow:var(--sombra-tarjeta)]">
      <p className="text-etiqueta text-texto-suave">{nombre}</p>
      <p
        className={clases(
          'text-cifra-media tabular-nums',
          tono === 'mal' ? 'text-mal' : tono === 'atencion' ? 'text-atencion' : 'text-texto',
        )}
      >
        {valor}
      </p>
      <p className="text-etiqueta text-texto-suave">{debajo}</p>
    </div>
  );
}
