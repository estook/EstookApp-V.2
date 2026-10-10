import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  NOMBRE_DEL_GRUPO_DE_INCIDENCIAS,
  cuantasPorGrupo,
  esGrupoDeIncidencias,
  grupoDeLaIncidencia,
} from '@estook/dominio';
import { Aviso, Boton, Cargando, EstadoVacio, Selector, Tarjeta } from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarPersonaAbierta } from '../ganchos/usarPersonaAbierta.ts';
import { FichaDePersona } from './FichaDePersona.tsx';
import type { LasIncidencias, UnaIncidencia } from './contrato.ts';
import { Justificar, ListaPorDias } from './ListaDeIncidencias.tsx';
import { DONDE_ESTA_EL_HORARIO } from '../horario/contrato.ts';

/**
 * Equipo → Incidencias (repaso del 9-oct, decisión 0081).
 *
 * «Si un día un trabajador no ficha y no está justificado no hay sitio donde lo
 * muestre.» Aquí está **cada falta, cada retraso y cada fichaje raro**, del más nuevo
 * al más viejo y agrupado por días, con lo que se puede hacer con cada uno:
 *
 *   · **Justificar** una falta o un retraso (estaba de baja, cambió el turno, avisó):
 *     deja de contar en todas partes y se queda a la vista con quién lo dijo.
 *   · **Abrir** el fichaje raro en la ficha de la persona, donde se corrige.
 *   · **Está bien**, para lo fichado sin conexión.
 *
 * Las vistas de arriba —Todas, Faltas, Retrasos, Fichajes— son la misma lista
 * filtrada; `?de=` la deja en una persona (llega así desde su ficha, «Ver más»).
 * Todo sale del **horario publicado**: sin él, no hay faltas que contar, y se dice.
 */
export function Incidencias({ vista }: { readonly vista: string }) {
  const navegar = useNavigate();
  const persona = usarPersonaAbierta();
  const [parametros, ponerParametros] = useSearchParams();
  const de = parametros.get('de');
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | '30'>('30');
  const [justificando, setJustificando] = useState<UnaIncidencia | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);

  const datos = usarLectura<LasIncidencias>('las_incidencias', {
    periodo,
    ...(de === null ? {} : { persona_id: de }),
  });

  if (datos.isPending) return <Cargando que="las incidencias" />;
  const lo = datos.data;
  if (lo === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer las incidencias">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const grupo = esGrupoDeIncidencias(vista) ? vista : null;
  const cuentas = cuantasPorGrupo(
    lo.incidencias.map((i) => ({ tipo: i.tipo, justificada: i.justificacion !== null })),
  );
  const lista = lo.incidencias.filter(
    (i) => grupo === null || grupoDeLaIncidencia(i.tipo) === grupo,
  );
  const deQuien = de === null ? null : lo.incidencias.find((i) => i.personaId === de);
  const sinJustificarAqui = grupo === null ? cuentas.todas : cuentas[grupo];

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-end gap-e3">
        <div className="min-w-[12rem]">
          <Selector
            etiqueta="Periodo"
            opciones={[
              { valor: 'semana', texto: 'Esta semana' },
              { valor: 'mes', texto: 'Este mes' },
              { valor: '30', texto: 'Últimos 30 días' },
            ]}
            value={periodo}
            onChange={(e) => {
              setPeriodo(e.currentTarget.value as 'semana' | 'mes' | '30');
            }}
          />
        </div>
        {de !== null && (
          <button
            type="button"
            onClick={() => {
              const nuevos = new URLSearchParams(parametros);
              nuevos.delete('de');
              ponerParametros(nuevos);
            }}
            className="inline-flex min-h-toque items-center gap-e2 rounded-redondo border border-borde-fuerte bg-superficie px-e3 text-secundario font-medium hover:bg-fondo"
          >
            Solo {deQuien?.nombre ?? 'una persona'}
            <span aria-hidden>✕</span>
            <span className="sr-only">: ver las de todos</span>
          </button>
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

      {/* Con la lista vacía lo dice el vacío, con su botón: dos veces sería ruido. */}
      {!lo.hayHorarioPublicado && lista.length > 0 && (
        <Aviso
          tono="info"
          titulo="Sin horario publicado en estos días"
          accion={
            <Boton
              tono="secundario"
              onClick={() => {
                navegar(DONDE_ESTA_EL_HORARIO);
              }}
            >
              Ir al horario
            </Boton>
          }
        >
          Las faltas y los retrasos se cuentan con el horario publicado.
        </Aviso>
      )}

      <Tarjeta
        titulo={
          sinJustificarAqui === 0 ? 'Nada pendiente' : `${String(sinJustificarAqui)} sin resolver`
        }
        origen={`Del ${fechaCorta(lo.desde)} al ${fechaCorta(lo.hasta)} · margen de ${String(lo.margenDeRetraso)} min`}
        pegado
      >
        {lista.length === 0 ? (
          <EstadoVacio
            compacto
            dibujo="todo-en-orden"
            acento="var(--color-app-equipo)"
            titulo={
              grupo === null
                ? 'Nada que mirar'
                : `Ninguna en ${NOMBRE_DEL_GRUPO_DE_INCIDENCIAS[grupo].toLowerCase()}`
            }
            frase={
              lo.hayHorarioPublicado
                ? 'Todos vinieron a su turno y ficharon bien.'
                : 'Cuando publiques el horario, aquí sale quién no vino o llegó tarde.'
            }
            {...(lo.hayHorarioPublicado
              ? {}
              : {
                  accion: (
                    <Boton
                      tono="secundario"
                      onClick={() => {
                        navegar(DONDE_ESTA_EL_HORARIO);
                      }}
                    >
                      Ir al horario
                    </Boton>
                  ),
                })}
          />
        ) : (
          <ListaPorDias
            incidencias={lista}
            hoy={lo.hasta}
            puedeJustificar={lo.puedeJustificar}
            alJustificar={setJustificando}
            alAbrir={(i) => {
              persona.abrir(i.personaId);
            }}
            alHecho={setNoticia}
          />
        )}
      </Tarjeta>

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

      <FichaDePersona personaId={persona.abierta} alCerrar={persona.cerrar} />
    </div>
  );
}

/** «6 oct». */
function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}
