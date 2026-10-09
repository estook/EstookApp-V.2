import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  MOTIVOS_DE_JUSTIFICACION,
  NOMBRE_DEL_MOTIVO,
  NOMBRE_DEL_TIPO_DE_INCIDENCIA,
  laJustificacionPideNota,
  loQuePaso,
  seJustifica,
  type MotivoDeJustificacion,
  type TipoDeIncidencia,
} from '@estook/dominio';
import {
  Aviso,
  Avatar,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  clases,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { LasIncidencias, UnaIncidencia } from './contrato.ts';

/**
 * Las piezas de las incidencias (repaso del 9-oct, 0081) que comparten la pantalla de
 * Equipo → Incidencias y la ficha de cada persona: la lista por días, la hoja de
 * justificar y las cuatro últimas de alguien. Aparte de las dos para que ninguna
 * importe a la otra.
 */

/** «Hoy», «Ayer», «Lunes 6 de octubre»: el encabezado de cada día. */
function elDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  const dia = new Date(`${fecha}T12:00:00Z`);
  const diferencia = Math.trunc(
    (new Date(`${hoy}T12:00:00Z`).getTime() - dia.getTime()) / 86_400_000,
  );
  if (diferencia === 1) return 'Ayer';
  const texto = dia.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** El motivo por su nombre; uno que no se conozca, tal cual llega. */
function nombreDelMotivo(motivo: string): string {
  return (MOTIVOS_DE_JUSTIFICACION as readonly string[]).includes(motivo)
    ? NOMBRE_DEL_MOTIVO[motivo as MotivoDeJustificacion]
    : motivo;
}

const TONO_DEL_TIPO: Readonly<Record<TipoDeIncidencia, 'mal' | 'atencion' | 'neutro'>> = {
  falta: 'mal',
  retraso: 'atencion',
  sin_cerrar: 'atencion',
  lejos: 'neutro',
  sin_ubicacion: 'neutro',
  sin_conexion: 'atencion',
};

/**
 * La lista, por días. Una fila por incidencia: quién, qué pasó y qué se hace. Lo
 * justificado se queda, apagado y con su motivo: borrarlo de la vista sería esconder
 * el registro.
 */
export function ListaPorDias({
  incidencias,
  hoy,
  puedeJustificar,
  alJustificar,
  alAbrir,
  alHecho,
  sinNombre = false,
}: {
  readonly incidencias: readonly UnaIncidencia[];
  readonly hoy: string;
  readonly puedeJustificar: boolean;
  readonly alJustificar: (i: UnaIncidencia) => void;
  readonly alAbrir?: (i: UnaIncidencia) => void;
  readonly alHecho: (frase: string) => void;
  /** En la ficha de la persona su nombre sobra en cada fila. */
  readonly sinNombre?: boolean;
}) {
  const dias = new Map<string, UnaIncidencia[]>();
  for (const i of incidencias) dias.set(i.fecha, [...(dias.get(i.fecha) ?? []), i]);

  return (
    <div className="flex flex-col">
      {[...dias].map(([fecha, delDia]) => (
        <section key={fecha} aria-label={elDia(fecha, hoy)}>
          <h3 className="sticky top-0 z-[1] bg-superficie px-e4 pb-e1 pt-e3 text-etiqueta font-semibold text-texto-suave">
            {elDia(fecha, hoy)}
          </h3>
          <ul className="flex flex-col divide-y divide-borde">
            {delDia.map((i) => (
              <FilaDeIncidencia
                key={i.id}
                incidencia={i}
                puedeJustificar={puedeJustificar}
                alJustificar={alJustificar}
                {...(alAbrir === undefined ? {} : { alAbrir })}
                alHecho={alHecho}
                sinNombre={sinNombre}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FilaDeIncidencia({
  incidencia: i,
  puedeJustificar,
  alJustificar,
  alAbrir,
  alHecho,
  sinNombre,
}: {
  readonly incidencia: UnaIncidencia;
  readonly puedeJustificar: boolean;
  readonly alJustificar: (i: UnaIncidencia) => void;
  readonly alAbrir?: (i: UnaIncidencia) => void;
  readonly alHecho: (frase: string) => void;
  readonly sinNombre: boolean;
}) {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const nombre = `${i.nombre} ${i.apellidos ?? ''}`.trim();
  const justificada = i.justificacion !== null;
  const esMia = yo?.personaId === i.personaId;

  async function hacer(comando: string, parametros: Record<string, unknown>, frase: string) {
    setHaciendo(true);
    setError(null);
    const r = await cliente.ejecutar(comando, parametros);
    setHaciendo(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await refrescarLasIncidencias(cache);
    alHecho(frase);
  }

  return (
    <li className={clases('flex flex-col gap-e2 px-e4 py-e3', justificada && 'opacity-70')}>
      <div className="flex items-start gap-e3">
        {!sinNombre && <Avatar nombre={nombre} tamano={36} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-e2 gap-y-e1">
            {!sinNombre && <span className="truncate font-medium">{nombre}</span>}
            <Etiqueta tono={justificada ? 'neutro' : TONO_DEL_TIPO[i.tipo]}>
              {NOMBRE_DEL_TIPO_DE_INCIDENCIA[i.tipo]}
            </Etiqueta>
            {justificada && <Etiqueta tono="bien">Justificada</Etiqueta>}
          </div>
          <p className="text-secundario text-texto-suave">
            {loQuePaso(i)}
            {i.justificacion !== null
              ? ` · ${nombreDelMotivo(i.justificacion.motivo)}${i.justificacion.nota === null ? '' : `: ${i.justificacion.nota}`}${i.justificacion.puestaPor === null ? '' : ` (${i.justificacion.puestaPor})`}`
              : ''}
          </p>
        </div>
      </div>

      {error !== null && <ErrorEnCristiano error={error} />}

      {puedeJustificar && !esMia && (
        <div className="flex flex-wrap gap-e2 pl-0 sm:pl-[calc(36px+var(--spacing-e3))]">
          {seJustifica(i.tipo) && !justificada && (
            <Boton
              tono="secundario"
              onClick={() => {
                alJustificar(i);
              }}
            >
              Justificar
            </Boton>
          )}
          {seJustifica(i.tipo) && justificada && (
            <Boton
              tono="texto"
              cargando={haciendo}
              textoCargando="Quitando"
              onClick={() => {
                void hacer(
                  'quitar_justificacion',
                  { persona_id: i.personaId, tipo: i.tipo, empieza: i.cuando },
                  'Justificación quitada',
                );
              }}
            >
              Quitar la justificación
            </Boton>
          )}
          {i.tipo === 'sin_conexion' && i.fichajeId !== null && (
            <Boton
              tono="secundario"
              cargando={haciendo}
              textoCargando="Guardando"
              onClick={() => {
                void hacer(
                  'dar_por_bueno_el_fichaje',
                  { fichaje_id: i.fichajeId },
                  'Fichaje dado por bueno',
                );
              }}
            >
              Está bien
            </Boton>
          )}
          {!seJustifica(i.tipo) && alAbrir !== undefined && (
            <Boton
              tono="texto"
              onClick={() => {
                alAbrir(i);
              }}
            >
              Abrir sus fichajes
            </Boton>
          )}
        </div>
      )}
    </li>
  );
}

/** Lo que cambia al justificar: la lista, el Resumen, las cifras y la ficha. */
async function refrescarLasIncidencias(cache: ReturnType<typeof useQueryClient>): Promise<void> {
  await Promise.all([
    cache.invalidateQueries({ queryKey: ['las_incidencias'] }),
    cache.invalidateQueries({ queryKey: ['resumen_del_equipo'] }),
    cache.invalidateQueries({ queryKey: ['un_indicador'] }),
    cache.invalidateQueries({ queryKey: ['fichajes_de_hoy'] }),
  ]);
}

/** La hoja de justificar: el motivo en un toque y, si hace falta, una nota. */
export function Justificar({
  incidencia: i,
  alCerrar,
  alHecho,
}: {
  readonly incidencia: UnaIncidencia;
  readonly alCerrar: () => void;
  readonly alHecho: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [motivo, setMotivo] = useState<MotivoDeJustificacion | null>(null);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const faltaLaNota = motivo !== null && laJustificacionPideNota(motivo) && nota.trim().length < 3;

  async function guardar() {
    if (motivo === null) return;
    setGuardando(true);
    setError(null);
    const r = await cliente.ejecutar('justificar_incidencia', {
      persona_id: i.personaId,
      tipo: i.tipo,
      empieza: i.cuando,
      motivo,
      ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
    });
    setGuardando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await refrescarLasIncidencias(cache);
    alHecho();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Justificar · ${i.nombre}`}
      pie={
        <Botones>
          <Boton
            tono="principal"
            disabled={motivo === null || faltaLaNota || guardando}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Justificar
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Cancelar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        <p className="text-cuerpo">
          <strong>{NOMBRE_DEL_TIPO_DE_INCIDENCIA[i.tipo]}</strong>{' '}
          <span className="text-texto-suave">· {loQuePaso(i)}</span>
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}
        <div role="radiogroup" aria-label="Por qué" className="grid gap-e2 sm:grid-cols-2">
          {MOTIVOS_DE_JUSTIFICACION.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={motivo === m}
              onClick={() => {
                setMotivo(m);
              }}
              className={clases(
                'min-h-toque rounded-medio border px-e3 py-e2 text-left text-cuerpo font-medium transition-colors duration-rapido',
                motivo === m
                  ? 'border-naranja bg-naranja-suave'
                  : 'border-borde-fuerte bg-superficie hover:bg-fondo',
              )}
            >
              {NOMBRE_DEL_MOTIVO[m]}
            </button>
          ))}
        </div>
        <Campo
          etiqueta={motivo === 'otro' ? 'Cuál' : 'Una nota, si quieres'}
          value={nota}
          maxLength={200}
          {...(faltaLaNota ? { error: 'Con «Otro motivo», di cuál.' } : {})}
          onChange={(e) => {
            setNota(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}

/**
 * Las incidencias de una persona, en su ficha: las cuatro últimas de treinta días y
 * «Ver más», que lleva a Incidencias con solo las suyas. Es lo que había donde ponía
 * «Su horario» (Richi, 9-oct: «donde ponía horario, que aparezcan esas incidencias,
 * tres o cuatro, y luego un botón de ver más para no llenar esa pestaña»).
 */
export function IncidenciasDeUnaPersona({ personaId }: { readonly personaId: string }) {
  const navegar = useNavigate();
  const [justificando, setJustificando] = useState<UnaIncidencia | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);
  const datos = usarLectura<LasIncidencias>('las_incidencias', {
    periodo: '30',
    persona_id: personaId,
  });

  // Sin Equipo no llegan: la ficha se abre también desde el Panel.
  if (datos.isError) return null;
  const lo = datos.data;
  const pocas = lo?.incidencias.slice(0, 4) ?? [];
  const masDe = (lo?.incidencias.length ?? 0) - pocas.length;

  return (
    <section className="flex flex-col gap-e2" aria-labelledby="incidencias-de-la-persona">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <h3 id="incidencias-de-la-persona" className="text-seccion font-semibold">
          Incidencias
        </h3>
        {lo !== undefined && lo.incidencias.length > 0 && (
          <Boton
            tono="texto"
            onClick={() => {
              navegar(`/equipo/incidencias/todas?de=${personaId}`);
            }}
          >
            {masDe > 0 ? `Ver más (${String(lo.incidencias.length)})` : 'Ver en Incidencias'}
          </Boton>
        )}
      </div>
      {noticia !== null && (
        <Aviso
          tono="bien"
          titulo={noticia}
          esNoticia
          alCerrar={() => {
            setNoticia(null);
          }}
        >
          Queda guardado con tu nombre.
        </Aviso>
      )}
      {lo === undefined ? (
        <Cargando que="sus incidencias" lineas={2} />
      ) : pocas.length === 0 ? (
        <p className="text-secundario text-texto-suave">
          {lo.hayHorarioPublicado
            ? 'Ninguna en los últimos 30 días.'
            : 'Sin horario publicado: no hay faltas ni retrasos que contar.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-medio border border-borde">
          <ListaPorDias
            incidencias={pocas}
            hoy={lo.hasta}
            puedeJustificar={lo.puedeJustificar}
            alJustificar={setJustificando}
            alHecho={setNoticia}
            sinNombre
          />
        </div>
      )}
      {justificando !== null && (
        <Justificar
          incidencia={justificando}
          alCerrar={() => {
            setJustificando(null);
          }}
          alHecho={() => {
            setJustificando(null);
            setNoticia('Justificada');
          }}
        />
      )}
    </section>
  );
}
