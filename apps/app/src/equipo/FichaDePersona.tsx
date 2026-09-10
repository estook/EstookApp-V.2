import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DIAS_DE_LA_SEMANA, comoSeLlamaElDia, type Centimos } from '@estook/dominio';
import {
  Aviso,
  Avatar,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  Cifra,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  PanelLateral,
  Selector,
  clases,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  comoDinero,
  comoSeLeeDonde,
  comoSeLeeLaHora,
  comoSeLeenMinutos,
  ultimaVez,
  type FichajeDeLaFicha,
  type TramoDelHorario,
  type UnaPersona,
} from './contrato.ts';

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
  const [cambiando, setCambiando] = useState<'retribucion' | 'horario' | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<FichajeDeLaFicha | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

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
    await cache.invalidateQueries({ queryKey: ['resumen_del_equipo'] });
    await cache.invalidateQueries({ queryKey: ['fichajes_de_hoy'] });
  }

  const datos = consulta.data;
  const nombreEntero =
    datos === undefined ? 'Persona' : `${datos.nombre} ${datos.apellidos ?? ''}`.trim();

  return (
    <PanelLateral abierta={personaId !== null} alCerrar={alCerrar} titulo={nombreEntero}>
      {consulta.isPending && <Cargando que="la ficha" />}

      {consulta.isError && (
        <Aviso tono="mal" titulo="No he podido abrir esta ficha">
          Puede que esa persona ya no esté en este local, o que no la lleves tú.
        </Aviso>
      )}

      {datos !== undefined && (
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
            <Avatar nombre={nombreEntero} tamano={48} />
            <div className="min-w-0">
              <p className="truncate text-cuerpo font-semibold">{nombreEntero}</p>
              <p className="text-secundario text-texto-suave">
                {datos.retribucion?.puesto ?? datos.rolNombre}
                {datos.correo === undefined ? '' : ` · ${datos.correo}`}
              </p>
              <p className="mt-e1 flex flex-wrap items-center gap-e2 text-secundario">
                {datos.enLinea ? (
                  <Etiqueta tono="bien">en línea</Etiqueta>
                ) : (
                  <span className="text-texto-suave">
                    Última vez: {ultimaVez(datos.ultimoAccesoEn)}
                  </span>
                )}
                {datos.estado === 'fuera' && <Etiqueta>acceso retirado</Etiqueta>}
              </p>
            </div>
          </section>

          {/* ── Sus horas ───────────────────────────────────────────────── */}
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
            {datos.trabajandoDesde !== null && (
              <p className="col-span-2 text-cuerpo">
                <strong>Trabajando</strong> desde las {comoSeLeeLaHora(datos.trabajandoDesde)} ·{' '}
                {comoSeLeenMinutos(datos.minutosDelTurno ?? 0)}
              </p>
            )}
          </section>

          {/* ── Lo que cobra · privado ──────────────────────────────────── */}
          {datos.puedeVerCostes && (
            <section className="flex flex-col gap-e2">
              <div className="flex flex-wrap items-center justify-between gap-e2">
                <h3 className="text-seccion font-semibold">Lo que cobra</h3>
                {datos.puedePonerRetribucion && (
                  <Boton
                    tono="texto"
                    onClick={() => {
                      setCambiando('retribucion');
                    }}
                  >
                    {datos.retribucion === null || datos.retribucion === undefined
                      ? 'Ponerlo'
                      : 'Cambiarlo'}
                  </Boton>
                )}
              </div>
              {datos.retribucion === null || datos.retribucion === undefined ? (
                <p className="text-secundario text-texto-suave">
                  Sin poner. Sin esto, sus horas no se pueden convertir en coste.
                </p>
              ) : (
                <p className="text-cuerpo">
                  <strong>
                    {comoDinero(datos.retribucion.importeCentimos)}{' '}
                    {datos.retribucion.forma === 'por_hora' ? 'la hora' : 'al mes'}
                  </strong>
                  <span className="text-texto-suave">
                    {datos.retribucion.horasSemanales === null
                      ? ''
                      : ` · ${datos.retribucion.horasSemanales.toLocaleString('es-ES')} h a la semana`}
                    {` · desde el ${datos.retribucion.desde}`}
                  </span>
                </p>
              )}
              <p className="text-etiqueta text-texto-tenue">
                Privado. Solo lo ven quien lleva los costes de personal y la propia persona.
              </p>
            </section>
          )}

          {/* ── Su horario de siempre ──────────────────────────────────── */}
          <section className="flex flex-col gap-e2">
            <div className="flex flex-wrap items-center justify-between gap-e2">
              <h3 className="text-seccion font-semibold">Su horario</h3>
              {datos.puedeEditar && (
                <Boton
                  tono="texto"
                  onClick={() => {
                    setCambiando('horario');
                  }}
                >
                  {datos.horario.length === 0 ? 'Ponerlo' : 'Cambiarlo'}
                </Boton>
              )}
            </div>
            {datos.horario.length === 0 ? (
              <p className="text-secundario text-texto-suave">
                Sin horario fijo. Con uno puesto, Estook le recuerda que fiche al abrir la
                aplicación.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-e1 text-secundario sm:grid-cols-3">
                {datos.horario.map((tramo) => (
                  <li
                    key={`${tramo.dia}-${tramo.entra}`}
                    className="rounded-medio bg-fondo px-e2 py-e1"
                  >
                    <span className="font-medium capitalize">{comoSeLlamaElDia(tramo.dia)}</span>{' '}
                    <span className="text-texto-suave">
                      {tramo.entra}–{tramo.sale}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Sus fichajes ─────────────────────────────────────────────── */}
          <section className="flex flex-col gap-e2">
            <h3 className="text-seccion font-semibold">Sus fichajes</h3>
            {datos.ultimosFichajes.length === 0 ? (
              <p className="text-secundario text-texto-suave">Todavía no ha fichado nunca.</p>
            ) : (
              <ul className="flex flex-col">
                {datos.ultimosFichajes.map((fichaje) => (
                  <li
                    key={fichaje.fichajeId}
                    className="flex flex-wrap items-center justify-between gap-e2 border-b border-borde py-e2 last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="block text-cuerpo">
                        {fichaje.fecha} · {comoSeLeeLaHora(fichaje.entroEn)}–
                        {fichaje.salioEn === null ? 'sin salir' : comoSeLeeLaHora(fichaje.salioEn)}
                        {fichaje.minutos === null ? '' : ` · ${comoSeLeenMinutos(fichaje.minutos)}`}
                      </span>
                      <span
                        className={clases(
                          'block text-secundario',
                          fichaje.enElLocal === false || fichaje.sinUbicacion !== null
                            ? 'text-atencion'
                            : 'text-texto-suave',
                        )}
                      >
                        {comoSeLeeDonde(fichaje.metros, fichaje.enElLocal, fichaje.sinUbicacion)}
                        {fichaje.corregidoPor === null
                          ? ''
                          : ` · corregido por ${fichaje.corregidoPor}: «${fichaje.motivoDeLaCorreccion ?? ''}»`}
                      </span>
                    </span>
                    {datos.puedeEditar && (
                      <Boton
                        tono="texto"
                        onClick={() => {
                          setCorrigiendo(fichaje);
                        }}
                      >
                        Corregir
                      </Boton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-secundario text-texto-suave">
            En Estook desde el {datos.desde}. {datos.rolNombre}.
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

      {datos !== undefined && cambiando === 'horario' && (
        <CambiarHorario
          persona={datos}
          alCerrar={() => {
            setCambiando(null);
          }}
          alHecho={() => {
            void refrescar('Horario guardado');
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
          ayuda="Lo que le cuesta al local, en bruto."
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

// ── El horario de siempre ────────────────────────────────────────────────────

interface FilaDelHorario {
  readonly trabaja: boolean;
  readonly entra: string;
  readonly sale: string;
}

function CambiarHorario({
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
  const [semana, setSemana] = useState<readonly FilaDelHorario[]>(() =>
    DIAS_DE_LA_SEMANA.map((_, indice) => {
      const suyo: TramoDelHorario | undefined = persona.horario.find(
        (tramo) => tramo.dia === indice + 1,
      );
      return suyo === undefined
        ? { trabaja: false, entra: '09:00', sale: '17:00' }
        : { trabaja: true, entra: suyo.entra, sale: suyo.sale };
    }),
  );
  const [guardando, setGuardando] = useState(false);

  function cambiar(indice: number, cambio: Partial<FilaDelHorario>) {
    setSemana((antes) => antes.map((fila, i) => (i === indice ? { ...fila, ...cambio } : fila)));
  }

  async function guardar() {
    setGuardando(true);
    const respuesta = await cliente.ejecutar('poner_horario_habitual', {
      persona_id: persona.personaId,
      tramos: semana.flatMap((fila, indice) =>
        fila.trabaja ? [{ dia: indice + 1, entra: fila.entra, sale: fila.sale }] : [],
      ),
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
      titulo={`El horario de ${persona.nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
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
      <div className="flex flex-col gap-e2">
        <p className="text-secundario text-texto-suave">
          El de siempre. Si sale más tarde de lo que entra, es un turno de noche.
        </p>
        {semana.map((fila, indice) => (
          <div
            key={DIAS_DE_LA_SEMANA[indice]}
            className="grid grid-cols-[7rem_1fr_1fr] items-end gap-e2 border-b border-borde pb-e2 last:border-0"
          >
            <label className="flex min-h-toque items-center gap-e2 text-cuerpo capitalize">
              <input
                type="checkbox"
                checked={fila.trabaja}
                onChange={(e) => {
                  cambiar(indice, { trabaja: e.currentTarget.checked });
                }}
                className="size-[20px] accent-[var(--color-naranja)]"
              />
              {DIAS_DE_LA_SEMANA[indice]}
            </label>
            <Campo
              etiqueta="Entra"
              tipo="hora"
              disabled={!fila.trabaja}
              value={fila.entra}
              onChange={(e) => {
                cambiar(indice, { entra: e.currentTarget.value });
              }}
            />
            <Campo
              etiqueta="Sale"
              tipo="hora"
              disabled={!fila.trabaja}
              value={fila.sale}
              onChange={(e) => {
                cambiar(indice, { sale: e.currentTarget.value });
              }}
            />
          </div>
        ))}
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
