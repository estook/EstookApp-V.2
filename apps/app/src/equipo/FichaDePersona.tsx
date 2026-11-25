import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SuCara } from './SuCara.tsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type Centimos } from '@estook/dominio';

import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  Cifra,
  ErrorEnCristiano,
  Etiqueta,
  GrupoDePlegables,
  Hoja,
  PanelLateral,
  Plegable,
  Selector,
} from '@estook/ui';
import {
  IconoAtencion,
  IconoDescargar,
  IconoEditar,
  IconoFicha,
  IconoHistorial,
  IconoMaletin,
  IconoPalmera,
  IconoSubir,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  comoDinero,
  comoSeLeeLaHora,
  comoSeLeenMinutos,
  ultimaVez,
  type FichajeDeLaFicha,
  type LasIncidencias,
  type UnaPersona,
} from './contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { HistorialDeFichajes, ListaDeFichajes } from './ListaDeFichajes.tsx';
import { IncidenciasDeUnaPersona } from './ListaDeIncidencias.tsx';
import { CuatroBaldosas } from './ficha/Baldosas.tsx';
import { ExportarLaJornada } from './ficha/ExportarLaJornada.tsx';
import { RellenarLaFicha } from './ficha/RellenarLaFicha.tsx';
import { InformacionLaboral, InformacionPersonal, SusVacaciones } from './ficha/Secciones.tsx';
import { resumenDeLasVacaciones } from './ficha/comoSeLee.ts';

/** «9 de octubre de 2026»: una fecha que se lee, no «2026-10-09» (auditoría del 9-oct). */
function fechaEnLetra(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * La ficha de una persona (M6½).
 *
 * «Añadir perfil básico por trabajador: horas trabajadas, fichajes, puesto,
 * última vez en línea o si está en línea, y demás detalles importantes. Además el
 * manager (a todos) o gerente (a todos menos al manager) pueden poner dinero por
 * hora o sueldo fijo mensual. Es privado esto.»
 *
 * ── Lo privado, dicho en la pantalla ────────────────────────────────────────
 *
 * Lo que cobra alguien **no se esconde: no llega**. El servidor no lo manda a quien
 * no tiene `dato.coste_de_personal`, así que un jefe de cocina abre esta misma
 * ficha y ve las horas de su gente sin un solo euro. Y «no hacia arriba» se cumple
 * igual: el botón de cambiarlo solo sale si quien mira manda más que la persona
 * mirada, y el comando lo vuelve a comprobar.
 *
 * ── Se abre desde cualquier sitio ───────────────────────────────────────────
 *
 * Desde el widget del Panel, desde la lista de Personas, desde Hoy y desde el
 * resumen de horas. Todos escriben `?persona=…` en la dirección y esta ficha lo
 * lee: por eso vive en `usarPersonaAbierta` y no en un estado.
 */
export function FichaDePersona({
  personaId,
  alCerrar,
}: {
  readonly personaId: string | null;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [cambiando, setCambiando] = useState<'retribucion' | 'correo' | 'fichaje_que_falta' | null>(
    null,
  );
  const [corrigiendo, setCorrigiendo] = useState<FichajeDeLaFicha | null>(null);
  // De quién está abierto el historial entero. Se guarda la persona y no un sí o
  // un no para que, al abrir la ficha de otra, se vuelva a empezar por su ficha.
  const [historialDe, setHistorialDe] = useState<string | null>(null);
  const viendoElHistorial = historialDe !== null && historialDe === personaId;
  const [noticia, setNoticia] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  // Rellenar la ficha (0153): «Subir contrato» empieza eligiendo cómo; «Cambiar», a mano.
  const [rellenando, setRellenando] = useState<'elegir' | 'a_mano' | null>(null);
  const [exportando, setExportando] = useState(false);

  const consulta = useQuery({
    queryKey: ['una_persona', personaId],
    enabled: personaId !== null,
    queryFn: async (): Promise<UnaPersona> => {
      const respuesta = await cliente.consultar<UnaPersona>('una_persona', {
        persona_id: personaId ?? '',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  async function refrescar(frase: string) {
    setNoticia(frase);
    setError(null);
    setCambiando(null);
    setCorrigiendo(null);
    await cache.invalidateQueries({ queryKey: ['una_persona', personaId] });
    await cache.invalidateQueries({ queryKey: ['fichajes_de_una_persona', personaId] });
    await cache.invalidateQueries({ queryKey: ['resumen_del_equipo'] });
    await cache.invalidateQueries({ queryKey: ['fichajes_de_hoy'] });
    await cache.invalidateQueries({ queryKey: ['un_indicador'] });
  }

  const datos = consulta.data;
  const ficha = datos?.ficha;

  // Recién invitada (0153): `?ficha=rellenar` abre «¿Cómo rellenamos su ficha?» en cuanto
  // llega la ficha, y se quita de la dirección para que atrás no la vuelva a abrir.
  const [parametros, ponerParametros] = useSearchParams();
  const pideRellenar = parametros.get('ficha') === 'rellenar';
  useEffect(() => {
    if (!pideRellenar || ficha === undefined) return;
    if (ficha.puedeRellenarla) setRellenando(ficha.laboral === null ? 'elegir' : 'a_mano');
    const nuevos = new URLSearchParams(parametros);
    nuevos.delete('ficha');
    ponerParametros(nuevos, { replace: true });
  }, [pideRellenar, ficha, parametros, ponerParametros]);
  // Cuántas sin justificar, para el resumen del plegable: la misma lectura que la lista
  // de dentro, así que llega una vez. Sin Equipo no llega, y no se dice nada.
  const lasIncidencias = usarLectura<LasIncidencias>(
    'las_incidencias',
    { periodo: '30', persona_id: personaId ?? '' },
    personaId !== null,
  );
  const incidencias = lasIncidencias.data?.incidencias.filter(
    (i) => i.justificacion === null,
  ).length;
  const nombreEntero =
    datos === undefined ? 'Persona' : `${datos.nombre} ${datos.apellidos ?? ''}`.trim();

  return (
    <PanelLateral
      abierta={personaId !== null}
      alCerrar={alCerrar}
      titulo={viendoElHistorial ? `Fichajes de ${nombreEntero}` : nombreEntero}
    >
      {/* `isLoading` y no `isPending`: con la ficha cerrada la consulta está apagada, y
          apagada cuenta como pendiente para siempre: un «Cargando» escondido y vivo. */}
      {consulta.isLoading && <Cargando que="la ficha" />}

      {viendoElHistorial && datos !== undefined && (
        <HistorialDeFichajes
          personaId={personaId}
          puedeCorregir={datos.puedeEditar}
          alCorregir={setCorrigiendo}
          alVolver={() => {
            setHistorialDe(null);
          }}
          error={error}
          noticia={noticia}
          alCerrarLaNoticia={() => {
            setNoticia(null);
          }}
        />
      )}

      {consulta.isError && (
        <Aviso tono="mal" titulo="No he podido abrir esta ficha">
          Puede que esa persona ya no esté en este local, o que no la lleves tú.
        </Aviso>
      )}

      {datos !== undefined && !viendoElHistorial && (
        <div className="flex flex-col gap-e4">
          {error !== null && <ErrorEnCristiano error={error} />}
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

          {/* ── Quién es ────────────────────────────────────────────────── */}
          <section className="flex items-center gap-e3">
            {/* La cara, que se cambia tocándola si es la tuya o la de tu equipo (0083). */}
            <SuCara
              personaId={datos.personaId}
              nombre={nombreEntero}
              foto={datos.foto ?? null}
              tamano={64}
              puedeCambiarla={datos.puedeCambiarLaFoto === true}
            />
            <div className="min-w-0">
              <p className="truncate text-cuerpo font-semibold">{nombreEntero}</p>
              <p className="text-secundario text-texto-suave">
                {datos.ficha?.laboral?.categoria ?? datos.retribucion?.puesto ?? datos.rolNombre}
                {datos.correo === undefined || datos.correo === null ? '' : ` · ${datos.correo}`}
              </p>
              <p className="mt-e1 flex flex-wrap items-center gap-e2 text-secundario">
                {datos.enLinea ? (
                  <Etiqueta tono="bien">en línea</Etiqueta>
                ) : (
                  <span className="text-texto-suave">
                    {/* «Última vez: Nunca ha entrado» se leía mal (auditoría del 9-oct). */}
                    {datos.ultimoAccesoEn === null
                      ? 'Nunca ha entrado'
                      : `Última vez: ${ultimaVez(datos.ultimoAccesoEn).toLowerCase()}`}
                  </span>
                )}
                {datos.estado === 'fuera' && <Etiqueta>acceso retirado</Etiqueta>}
                {datos.trabajandoDesde !== null && (
                  <Etiqueta tono="bien">
                    Trabajando desde las {comoSeLeeLaHora(datos.trabajandoDesde)}
                  </Etiqueta>
                )}
              </p>
            </div>
          </section>

          {/*
            **Sin correo** (0057): entra solo en el aparato del local, con su PIN. Se
            dice aquí porque decide dónde ficha y cómo se le avisa, y quien puede dar
            acceso le puede poner el correo el día que lo dé.
          */}
          {datos.sinCorreo === true && (
            <Aviso
              tono="info"
              titulo="Sin correo"
              {...(datos.puedePonerCorreo === true
                ? {
                    accion: (
                      <Boton
                        tono="secundario"
                        onClick={() => {
                          setCambiando('correo');
                        }}
                      >
                        Poner su correo
                      </Boton>
                    ),
                  }
                : {})}
            >
              Ficha con su PIN en el aparato del local. No puede entrar desde un móvil suyo, y los
              avisos no le llegan: su horario se le da en papel.
            </Aviso>
          )}

          {/*
            ── La ficha del trabajador (la Ampliación 3, 0153) ──────────────────
            Cuatro cuadrados con lo que se mira de un vistazo, y debajo la lista que se
            despliega. Lo privado no se esconde: no llega (las políticas de la 0127).
          */}
          {ficha !== undefined && (
            <CuatroBaldosas
              ficha={ficha}
              horasDeLaRetribucion={datos.retribucion?.horasSemanales ?? null}
              hoy={hoyEnFecha()}
            />
          )}

          {ficha?.puedeRellenarla === true &&
            (ficha.laboral === null ? (
              <Aviso
                tono="info"
                titulo="Su ficha está sin rellenar"
                accion={
                  <Boton
                    tono="principal"
                    onClick={() => {
                      setRellenando('elegir');
                    }}
                  >
                    Rellenar su ficha
                  </Boton>
                }
              >
                Sube su contrato y Fogón la rellena en un momento, o escríbela a mano. De ella salen
                sus vacaciones.
              </Aviso>
            ) : (
              <div className="flex flex-wrap gap-e2">
                <Boton
                  icono={<IconoSubir size={18} />}
                  onClick={() => {
                    setRellenando('elegir');
                  }}
                >
                  Subir contrato
                </Boton>
                <Boton
                  tono="texto"
                  icono={<IconoEditar size={18} />}
                  onClick={() => {
                    setRellenando('a_mano');
                  }}
                >
                  Cambiar la ficha
                </Boton>
              </div>
            ))}

          <GrupoDePlegables titulo={`La ficha de ${nombreEntero}`}>
            {/* Incidencias, donde estaba «Su horario» (repaso del 9-oct, 0081). */}
            <Plegable
              titulo="Incidencias"
              degradado="incidencias"
              icono={<IconoAtencion size={18} />}
              resumen={
                incidencias === undefined
                  ? undefined
                  : incidencias === 0
                    ? 'Ninguna sin justificar en 30 días'
                    : `${String(incidencias)} sin justificar en 30 días`
              }
              tono={incidencias !== undefined && incidencias > 0 ? 'atencion' : 'neutro'}
            >
              <IncidenciasDeUnaPersona personaId={datos.personaId} enLaFicha />
            </Plegable>

            {ficha?.veLoPrivado === true && (
              <Plegable
                titulo="Información personal"
                degradado="fechas"
                icono={<IconoFicha size={18} />}
                resumen="DNI, teléfono y domicilio"
                abierto
              >
                <InformacionPersonal
                  nombreEntero={nombreEntero}
                  correo={datos.correo}
                  privada={ficha.privada ?? null}
                />
              </Plegable>
            )}

            <Plegable
              titulo="Información laboral"
              degradado="contrato"
              icono={<IconoMaletin size={18} />}
              resumen={
                [ficha?.laboral?.categoria, ficha?.laboral?.convenio].filter(Boolean).join(' · ') ||
                'Categoría, convenio, contrato y jornada'
              }
            >
              <InformacionLaboral
                laboral={ficha?.laboral ?? null}
                {...(ficha?.veLoPrivado === true
                  ? { privada: ficha.privada ?? null, documentos: ficha.documentos ?? [] }
                  : {})}
                {...(datos.puedeVerCostes
                  ? {
                      loQueCuesta: (
                        <LoQueCuesta
                          persona={datos}
                          alCambiar={() => {
                            setCambiando('retribucion');
                          }}
                        />
                      ),
                    }
                  : {})}
              />
            </Plegable>

            {ficha !== undefined && (
              <Plegable
                titulo="Vacaciones y solicitudes"
                degradado="vacaciones"
                icono={<IconoPalmera size={18} />}
                resumen={resumenDeLasVacaciones(ficha.vacaciones)}
                abierto
              >
                <SusVacaciones saldo={ficha.vacaciones} />
              </Plegable>
            )}

            <Plegable
              titulo="Historial de jornadas"
              degradado="historial"
              icono={<IconoHistorial size={18} />}
              resumen={`${comoSeLeenMinutos(datos.minutosDelMes)} en los últimos 30 días`}
            >
              <section className="grid grid-cols-2 gap-e3 rounded-medio border border-borde p-e3">
                <Cifra
                  etiqueta="Esta semana"
                  valor={datos.minutosDeLaSemana}
                  formato={(v) => comoSeLeenMinutos(v)}
                  origen="De lunes a hoy"
                />
                <Cifra
                  etiqueta="Últimos 30 días"
                  valor={datos.minutosDelMes}
                  formato={(v) => comoSeLeenMinutos(v)}
                  origen={
                    datos.costeDelMesCentimos !== null && datos.costeDelMesCentimos !== undefined
                      ? `Cuestan ${comoDinero(datos.costeDelMesCentimos)}`
                      : 'Por sus fichajes'
                  }
                />
              </section>

              {/* Sus fichajes · los tres últimos, y el resto en «Ver todos». */}
              <div className="flex flex-col gap-e2">
                <div className="flex flex-wrap items-center justify-between gap-e2">
                  <h3 className="text-seccion font-semibold">Sus fichajes</h3>
                  {datos.cuantosFichajes > datos.ultimosFichajes.length && (
                    <Boton
                      tono="texto"
                      onClick={() => {
                        setHistorialDe(personaId);
                      }}
                    >
                      Ver todos ({datos.cuantosFichajes.toLocaleString('es-ES')})
                    </Boton>
                  )}
                </div>
                {datos.ultimosFichajes.length === 0 ? (
                  <p className="text-secundario text-texto-suave">Todavía no ha fichado nunca.</p>
                ) : (
                  <ListaDeFichajes
                    fichajes={datos.ultimosFichajes}
                    puedeCorregir={datos.puedeEditar}
                    alCorregir={setCorrigiendo}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-e2">
                <Boton
                  icono={<IconoDescargar size={18} />}
                  onClick={() => {
                    setExportando(true);
                  }}
                >
                  Exportar
                </Boton>
                {/* El fichaje que falta (0070): se olvidó de fichar, o el aparato no pudo. */}
                {datos.puedeEditar && (
                  <Boton
                    tono="texto"
                    onClick={() => {
                      setCambiando('fichaje_que_falta');
                    }}
                  >
                    Apuntar un fichaje que falta
                  </Boton>
                )}
              </div>
            </Plegable>
          </GrupoDePlegables>

          <p className="text-secundario text-texto-suave">
            En Estook desde el {fechaEnLetra(datos.desde)}. {datos.rolNombre}.
          </p>
        </div>
      )}

      {datos !== undefined && cambiando === 'retribucion' && (
        <CambiarRetribucion
          persona={datos}
          alCerrar={() => {
            setCambiando(null);
          }}
          alHecho={() => {
            void refrescar('Retribución guardada');
          }}
          alFallar={setError}
        />
      )}

      {datos !== undefined && rellenando !== null && (
        <RellenarLaFicha
          personaId={datos.personaId}
          nombre={datos.nombre}
          ficha={datos.ficha}
          empezarPor={rellenando}
          alCerrar={() => {
            setRellenando(null);
          }}
          alHecho={(frase) => {
            setRellenando(null);
            void refrescar(frase);
          }}
        />
      )}

      {datos !== undefined && exportando && (
        <ExportarLaJornada
          personaId={datos.personaId}
          nombre={datos.nombre}
          alCerrar={() => {
            setExportando(false);
          }}
        />
      )}

      {datos !== undefined && cambiando === 'correo' && (
        <PonerSuCorreo
          persona={datos}
          alCerrar={() => {
            setCambiando(null);
          }}
          alHecho={() => {
            void refrescar('Correo puesto');
          }}
          alFallar={setError}
        />
      )}

      {datos !== undefined && cambiando === 'fichaje_que_falta' && (
        <ApuntarFichajeQueFalta
          personaId={datos.personaId}
          nombre={datos.nombre}
          alCerrar={() => {
            setCambiando(null);
          }}
          alHecho={() => {
            void refrescar('Fichaje apuntado');
          }}
          alFallar={setError}
        />
      )}

      {corrigiendo !== null && (
        <CorregirFichaje
          fichaje={corrigiendo}
          alCerrar={() => {
            setCorrigiendo(null);
          }}
          alHecho={() => {
            void refrescar('Fichaje corregido');
          }}
          alFallar={setError}
        />
      )}
    </PanelLateral>
  );
}

// ── Lo que cuesta al local · privado (0027) ──────────────────────────────────

/**
 * Lo que le cuesta al local (la retribución de la 0027), dentro de Información laboral.
 * No es el sueldo del contrato: es el coste con la Seguridad Social de la empresa y las
 * pagas repartidas, que es lo que convierte sus horas en coste de personal.
 */
function LoQueCuesta({
  persona,
  alCambiar,
}: {
  readonly persona: UnaPersona;
  readonly alCambiar: () => void;
}) {
  const r = persona.retribucion ?? null;
  return (
    <section className="flex flex-col gap-e2 rounded-medio bg-fondo p-e3">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <h3 className="text-cuerpo font-semibold">Lo que cuesta al local</h3>
        {persona.puedePonerRetribucion && (
          <Boton tono="texto" onClick={alCambiar}>
            {r === null ? 'Ponerlo' : 'Cambiarlo'}
          </Boton>
        )}
      </div>
      {r === null ? (
        <p className="text-secundario text-texto-suave">
          Sin poner. Sin esto, sus horas no se pueden convertir en coste.
        </p>
      ) : (
        <p className="text-cuerpo">
          <strong>
            {comoDinero(r.importeCentimos)} {r.forma === 'por_hora' ? 'la hora' : 'al mes'}
          </strong>
          <span className="text-texto-suave">
            {r.horasSemanales === null
              ? ''
              : ` · ${r.horasSemanales.toLocaleString('es-ES')} h a la semana`}
            {` · desde el ${fechaEnLetra(r.desde)}`}
          </span>
        </p>
      )}
      <p className="text-etiqueta text-texto-tenue">
        Con la Seguridad Social de la empresa. Solo lo ven quien lleva los costes de personal y la
        propia persona.
      </p>
    </section>
  );
}

// ── Lo que cobra ─────────────────────────────────────────────────────────────

function CambiarRetribucion({
  persona,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly persona: UnaPersona;
  readonly alCerrar: () => void;
  readonly alHecho: () => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const antes = persona.retribucion ?? null;
  const [forma, setForma] = useState<'por_hora' | 'mensual'>(antes?.forma ?? 'por_hora');
  const [importe, setImporte] = useState<Centimos | null>(
    (antes?.importeCentimos ?? null) as Centimos | null,
  );
  const [horas, setHoras] = useState(
    antes?.horasSemanales === null || antes === null ? '' : String(antes.horasSemanales),
  );
  const [puesto, setPuesto] = useState(antes?.puesto ?? '');
  const [guardando, setGuardando] = useState(false);

  const horasNumero = horas.trim() === '' ? null : Number(horas.replace(',', '.'));
  const listo =
    importe !== null &&
    (forma === 'por_hora' || (horasNumero !== null && horasNumero > 0)) &&
    !guardando;

  async function guardar() {
    if (importe === null) return;
    setGuardando(true);
    const respuesta = await cliente.ejecutar('poner_retribucion', {
      persona_id: persona.personaId,
      forma,
      importe_centimos: importe,
      horas_semanales: horasNumero,
      puesto: puesto.trim() === '' ? null : puesto.trim(),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      alCerrar();
      return;
    }
    alHecho();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Lo que cobra ${persona.nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <Selector
          etiqueta="Cómo cobra"
          opciones={[
            { valor: 'por_hora', texto: 'Por hora' },
            { valor: 'mensual', texto: 'Sueldo fijo al mes' },
          ]}
          value={forma}
          onChange={(e) => {
            setForma(e.currentTarget.value as 'por_hora' | 'mensual');
          }}
        />
        <CampoMoneda
          etiqueta={forma === 'por_hora' ? 'Cuánto la hora' : 'Cuánto al mes'}
          // Lo que le cuesta al local, dicho entero (auditoría del 20-oct): con «en bruto»
          // se ponía el bruto de la nómina, sin la Seguridad Social de la empresa ni las
          // pagas extra, y el coste de personal salía hasta un tercio por debajo.
          ayuda={
            forma === 'por_hora'
              ? 'Lo que le cuesta al local cada hora, con la Seguridad Social de la empresa.'
              : 'Lo que le cuesta al local cada mes: el bruto, la Seguridad Social de la empresa y las pagas extra repartidas.'
          }
          valor={importe}
          alCambiar={setImporte}
        />
        <Campo
          etiqueta="Horas a la semana de contrato"
          tipo="numero"
          detras="h"
          obligatorio={forma === 'mensual'}
          ayuda={
            forma === 'mensual'
              ? 'Hace falta para saber lo que cuesta una hora.'
              : 'Opcional. Sirve para saber si se pasa.'
          }
          value={horas}
          onChange={(e) => {
            setHoras(e.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="Puesto"
          ayuda="Opcional. El del contrato: «Ayudante de cocina»."
          value={puesto}
          onChange={(e) => {
            setPuesto(e.currentTarget.value);
          }}
        />
        <p className="text-secundario text-texto-suave">
          Vale desde hoy. Lo de antes se queda como estaba: una subida no cambia lo que costó el mes
          pasado.
        </p>
      </div>
    </Hoja>
  );
}

// ── Ponerle el correo a quien no lo tenía (0057) ─────────────────────────────

/**
 * «Si un día da su correo, se le añade y sigue siendo la misma persona, con su
 * historia.» Si ese correo ya es de otra persona de Estook, **no se unen**: el
 * servidor lo dice y no toca nada.
 */
function PonerSuCorreo({
  persona,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly persona: UnaPersona;
  readonly alCerrar: () => void;
  readonly alHecho: () => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const [correo, setCorreo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const listo = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(correo.trim()) && !guardando;

  async function guardar() {
    setGuardando(true);
    const respuesta = await cliente.ejecutar('poner_correo', {
      persona_id: persona.personaId,
      correo: correo.trim(),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      alCerrar();
      return;
    }
    alHecho();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`El correo de ${persona.nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <Campo
          etiqueta="Su correo"
          tipo="correo"
          value={correo}
          onChange={(e) => {
            setCorreo(e.currentTarget.value);
          }}
        />
        <p className="text-secundario text-texto-suave">
          Sigue siendo la misma persona, con sus fichajes. Desde ese momento puede entrar también en
          Estook desde su móvil: se pone su contraseña con un enlace a ese correo.
        </p>
      </div>
    </Hoja>
  );
}

// ── Corregir un fichaje ──────────────────────────────────────────────────────

/**
 * Arreglar un fichaje · con motivo, siempre.
 *
 * Es el registro horario de otra persona, así que se corrige **con nombre y con
 * motivo** —lo exige la base, no solo esta pantalla— y no se borra nunca. El caso
 * de siempre: alguien se fue y no fichó la salida.
 */
function CorregirFichaje({
  fichaje,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly fichaje: FichajeDeLaFicha;
  readonly alCerrar: () => void;
  readonly alHecho: () => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const [entra, setEntra] = useState(horaDe(fichaje.entroEn));
  const [sale, setSale] = useState(fichaje.salioEn === null ? '' : horaDe(fichaje.salioEn));
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const listo = motivo.trim().length >= 3 && entra !== '' && !guardando;

  async function guardar() {
    setGuardando(true);
    const entroEn = conHora(fichaje.entroEn, entra);
    // Si la salida es antes que la entrada, es del día siguiente: el turno de
    // noche que empieza a las 20:00 y acaba a las 02:00.
    let salioEn: string | null = null;
    if (sale !== '') {
      const candidata = new Date(conHora(fichaje.entroEn, sale));
      if (candidata.getTime() < new Date(entroEn).getTime()) {
        candidata.setDate(candidata.getDate() + 1);
      }
      salioEn = candidata.toISOString();
    }

    const respuesta = await cliente.ejecutar('corregir_fichaje', {
      fichaje_id: fichaje.fichajeId,
      entro_en: entroEn,
      salio_en: salioEn,
      motivo: motivo.trim(),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      alCerrar();
      return;
    }
    alHecho();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Corregir el fichaje del ${fichaje.fecha}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Corregir
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <div className="grid grid-cols-2 gap-e3">
          <Campo
            etiqueta="Entró"
            tipo="hora"
            value={entra}
            onChange={(e) => {
              setEntra(e.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Salió"
            tipo="hora"
            value={sale}
            ayuda="En blanco si sigue dentro."
            onChange={(e) => {
              setSale(e.currentTarget.value);
            }}
          />
        </div>
        <Campo
          etiqueta="Por qué"
          obligatorio
          ayuda="Queda escrito con tu nombre. «Se fue a las 17:00 y no fichó»."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}

// ── Apuntar un fichaje que falta ─────────────────────────────────────────────

/**
 * «2026-10-06» de hoy, en la hora de quien mira. **Solo para proponer el día** en el
 * formulario: que no sea del futuro y a qué jornada va lo decide el servidor (regla 10).
 */
function hoyEnFecha(): string {
  const hoy = new Date(Date.now());
  return `${String(hoy.getFullYear())}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

/**
 * **Apuntar un fichaje que falta** (0070): quien lleva el equipo, con su nombre y su
 * motivo. Para quien se olvidó de fichar, o para lo que el aparato del local no pudo
 * apuntar al volver la conexión. Como una corrección: queda escrito, a la persona le
 * llega su aviso y no se puede apuntar encima de otro suyo.
 */
function ApuntarFichajeQueFalta({
  personaId,
  nombre,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly personaId: string;
  readonly nombre: string;
  readonly alCerrar: () => void;
  readonly alHecho: () => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const [dia, setDia] = useState(hoyEnFecha);
  const [entra, setEntra] = useState('');
  const [sale, setSale] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const listo = dia !== '' && entra !== '' && motivo.trim().length >= 3 && !guardando;

  async function guardar() {
    setGuardando(true);
    const entroEn = conHora(`${dia}T12:00:00`, entra);
    // Una salida antes que la entrada es del día siguiente: el turno de noche.
    let salioEn: string | null = null;
    if (sale !== '') {
      const candidata = new Date(conHora(`${dia}T12:00:00`, sale));
      if (candidata.getTime() < new Date(entroEn).getTime()) {
        candidata.setDate(candidata.getDate() + 1);
      }
      salioEn = candidata.toISOString();
    }
    const respuesta = await cliente.ejecutar('apuntar_fichaje_que_falta', {
      persona_id: personaId,
      entro_en: entroEn,
      salio_en: salioEn,
      motivo: motivo.trim(),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      alCerrar();
      return;
    }
    alHecho();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Apuntar un fichaje de ${nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Apuntando"
            onClick={() => {
              void guardar();
            }}
          >
            Apuntar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <Campo
          etiqueta="Qué día"
          tipo="fecha"
          value={dia}
          onChange={(e) => {
            setDia(e.currentTarget.value);
          }}
        />
        <div className="grid grid-cols-2 gap-e3">
          <Campo
            etiqueta="Entró"
            tipo="hora"
            value={entra}
            onChange={(e) => {
              setEntra(e.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Salió"
            tipo="hora"
            value={sale}
            ayuda="En blanco si sigue dentro."
            onChange={(e) => {
              setSale(e.currentTarget.value);
            }}
          />
        </div>
        <Campo
          etiqueta="Por qué"
          obligatorio
          ayuda="Queda escrito con tu nombre, y a la persona le llega. «Fichó en la tablet sin conexión con otro PIN»."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}

/** «09:12» de un instante, en la hora de quien mira. */
function horaDe(iso: string): string {
  const cuando = new Date(iso);
  return `${String(cuando.getHours()).padStart(2, '0')}:${String(cuando.getMinutes()).padStart(2, '0')}`;
}

/** El mismo día que `iso`, a la hora `hora`, en la hora de quien mira. */
function conHora(iso: string, hora: string): string {
  const cuando = new Date(iso);
  const [h = '0', m = '0'] = hora.split(':');
  cuando.setHours(Number(h), Number(m), 0, 0);
  return cuando.toISOString();
}
