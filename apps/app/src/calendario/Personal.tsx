import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  clases,
  fondoDegradado,
} from '@estook/ui';
import { IconoPalmera, IconoReloj } from '@estook/iconos';
import { delAl, diasEnLetra } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { Baldosa } from '../equipo/ficha/Baldosas.tsx';
import { comoSeLeenMinutos, type UnaPersona } from '../equipo/contrato.ts';
import { PedirVacaciones } from './PedirVacaciones.tsx';
import type { EstadoDeLaSolicitud, MisVacaciones, UnaSolicitud } from './contrato.ts';

/**
 * Calendario › Personal (la Ampliación 4 · 2, 0153; maqueta, «Lo tuyo, en una pantalla que da gusto
 * abrir»). Lo de cada uno: **sus vacaciones** (lo que le queda, con la barra del año), **sus horas**,
 * **«Pedir vacaciones»** y sus peticiones con cómo van. **Si le proponen otras fechas, una tarjeta
 * azul arriba del todo** con Aceptar, Otras fechas y Rechazar (Richi, pregunta 8).
 */

const COMO_VA: Readonly<
  Record<
    EstadoDeLaSolicitud,
    { readonly texto: string; readonly tono: 'bien' | 'atencion' | 'mal' | 'info' | 'neutro' }
  >
> = {
  pedida: { texto: 'Esperando respuesta', tono: 'atencion' },
  aprobada: { texto: 'Aprobadas', tono: 'bien' },
  rechazada: { texto: 'Rechazadas', tono: 'mal' },
  contrapropuesta: { texto: 'Te proponen otras', tono: 'info' },
  retirada: { texto: 'Retiradas', tono: 'neutro' },
};

function saludo(): string {
  const hora = new Date(Date.now()).getHours();
  return hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
}

export function Personal() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const lo = usarLectura<MisVacaciones>('mis_vacaciones');
  const yoEnLaFicha = usarLectura<UnaPersona>(
    'una_persona',
    { persona_id: yo?.personaId ?? '' },
    yo !== null,
  );
  const [pidiendo, setPidiendo] = useState<{ desde?: string; hasta?: string } | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);

  async function refrescar(frase: string) {
    setNoticia(frase);
    await cache.invalidateQueries({ queryKey: ['mis_vacaciones'] });
    await cache.invalidateQueries({ queryKey: ['una_persona'] });
  }

  async function hacer(nombre: string, entrada: Record<string, unknown>, frase: string) {
    setHaciendo(
      `${nombre}${typeof entrada['solicitud_id'] === 'string' ? entrada['solicitud_id'] : ''}`,
    );
    setError(null);
    const respuesta = await cliente.ejecutar(nombre, entrada);
    setHaciendo(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar(frase);
  }

  if (lo.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus vacaciones">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }
  const datos = lo.data;
  if (datos === undefined) return <Cargando que="tus vacaciones" forma="lista" lineas={4} />;
  const propuestas = datos.solicitudes.filter((s) => s.estado === 'contrapropuesta');
  const saldo = datos.saldo;
  const total = saldo === null ? 0 : saldo.delAno + saldo.pendientes;
  const persona = yoEnLaFicha.data;
  const hoyEnLetra = new Date(`${datos.hoy}T12:00:00Z`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-e4">
      <header>
        <p className="text-[1.25rem] font-extrabold tracking-[-0.02em]">
          {saludo()}, {yo?.nombre}
        </p>
        <p className="text-secundario text-texto-suave first-letter:uppercase">{hoyEnLetra}</p>
      </header>

      {error !== null && <ErrorEnCristiano error={error} />}
      {noticia !== null && (
        <Aviso
          tono="bien"
          titulo={noticia}
          esNoticia
          alCerrar={() => {
            setNoticia(null);
          }}
        />
      )}

      {/* La contrapropuesta, arriba del todo y en azul (pregunta 8): no se pasa por alto. */}
      {propuestas.map((s) => (
        <section
          key={s.id}
          aria-label="Te proponen otras fechas"
          className="flex flex-col gap-e3 rounded-[20px] p-e4 text-white [box-shadow:var(--sombra-baldosa)]"
          style={fondoDegradado('vacaciones')}
        >
          <p className="flex items-center gap-e2">
            <span aria-hidden className="grid size-9 place-items-center rounded-[11px] bg-white/25">
              <IconoPalmera size={18} />
            </span>
            <span>
              <strong className="block text-cuerpo">
                {s.decididaPor ?? 'Quien lleva el local'} te propone otras fechas
              </strong>
              <span className="text-secundario">Pediste {delAl(s.desde, s.hasta)}</span>
            </span>
          </p>
          <div className="rounded-[14px] bg-white/15 p-e3">
            <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.05em]">
              Te propone
            </span>
            <strong className="block text-[1.15rem] font-extrabold">
              {delAl(s.propuestaDesde ?? '', s.propuestaHasta ?? '')}
            </strong>
            {s.motivo !== null && <span className="text-secundario">«{s.motivo}»</span>}
          </div>
          <div className="flex flex-wrap gap-e2">
            <button
              type="button"
              className="min-h-toque rounded-[12px] bg-white px-e4 font-extrabold text-[#1a4fa0]"
              disabled={haciendo !== null}
              onClick={() => {
                void hacer(
                  'contestar_la_propuesta',
                  { solicitud_id: s.id, respuesta: 'aceptar' },
                  'Vacaciones aprobadas con las nuevas fechas',
                );
              }}
            >
              Aceptar
            </button>
            <button
              type="button"
              className="min-h-toque rounded-[12px] bg-white/20 px-e4 font-bold text-white"
              disabled={haciendo !== null}
              onClick={() => {
                void (async () => {
                  await hacer(
                    'contestar_la_propuesta',
                    { solicitud_id: s.id, respuesta: 'rechazar' },
                    'Elige otras fechas',
                  );
                  setPidiendo({});
                })();
              }}
            >
              Otras fechas
            </button>
            <button
              type="button"
              className="min-h-toque rounded-[12px] px-e3 font-bold text-white underline-offset-2 hover:underline"
              disabled={haciendo !== null}
              onClick={() => {
                void hacer(
                  'contestar_la_propuesta',
                  { solicitud_id: s.id, respuesta: 'rechazar' },
                  'Propuesta rechazada: esas vacaciones quedan retiradas',
                );
              }}
            >
              Rechazar
            </button>
          </div>
        </section>
      ))}

      <section aria-label="Tus vacaciones y tus horas" className="grid grid-cols-2 gap-e2">
        <Baldosa
          degradado="vacaciones"
          icono={(t) => <IconoPalmera size={t} />}
          etiqueta="Vacaciones"
          valor={saldo === null ? 'Sin poner' : `${diasEnLetra(saldo.disponibles)} días`}
          detalle={
            saldo === null
              ? 'Falta tu ficha'
              : `te quedan de ${diasEnLetra(total)}${datos.pedidas > 0 ? ` · ${diasEnLetra(datos.pedidas)} pedidos` : ''}`
          }
        />
        <Baldosa
          degradado="horas"
          icono={(t) => <IconoReloj size={t} />}
          etiqueta="Últimos 30 días"
          valor={persona === undefined ? '—' : comoSeLeenMinutos(persona.minutosDelMes)}
          detalle={
            persona === undefined
              ? 'trabajadas'
              : `trabajadas · ${comoSeLeenMinutos(persona.minutosDeLaSemana)} esta semana`
          }
        />
      </section>

      {saldo !== null && total > 0 && (
        <div aria-hidden className="flex h-[10px] gap-[2px] overflow-hidden rounded-[6px] bg-borde">
          {[
            { dias: saldo.disfrutadas, color: 'var(--color-texto-suave)' },
            { dias: saldo.aprobadas, color: 'var(--color-bien)' },
            { dias: datos.pedidas, color: 'var(--color-atencion)' },
            { dias: Math.max(datos.sePuedenPedir ?? 0, 0), color: 'var(--base-vacaciones)' },
          ]
            .filter((p) => p.dias > 0)
            .map((p, i) => (
              <span key={i} style={{ flex: p.dias / total, background: p.color }} />
            ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-e3">
        <button
          type="button"
          disabled={datos.sePuedenPedir === null || datos.sePuedenPedir <= 0}
          onClick={() => {
            setPidiendo({});
          }}
          className="inline-flex min-h-toque items-center gap-e2 rounded-[12px] px-e4 font-extrabold text-white disabled:opacity-50"
          style={{
            ...fondoDegradado('vacaciones'),
            boxShadow: '0 10px 20px -12px rgba(37, 99, 235, 0.7)',
          }}
        >
          <IconoPalmera size={18} aria-hidden />
          Pedir vacaciones
        </button>
        <span className="text-secundario text-texto-suave">
          {datos.sePuedenPedir === null
            ? 'Tu ficha no dice tus días al año: la rellena quien lleva el local.'
            : `Puedes pedir ${diasEnLetra(Math.max(datos.sePuedenPedir, 0))} ${datos.vacacionesEn === 'naturales' ? 'días naturales' : 'días laborables'}.`}
        </span>
      </div>

      <section className="flex flex-col gap-e2">
        <h2 className="text-seccion font-semibold">Tus vacaciones</h2>
        {datos.solicitudes.length === 0 ? (
          <p className="text-secundario text-texto-suave">Todavía no has pedido ninguna.</p>
        ) : (
          datos.solicitudes.map((s) => (
            <FilaDeSolicitud
              key={s.id}
              solicitud={s}
              haciendo={haciendo === `retirar_vacaciones${s.id}`}
              alRetirar={() => {
                void hacer('retirar_vacaciones', { solicitud_id: s.id }, 'Petición retirada');
              }}
            />
          ))
        )}
      </section>

      {pidiendo !== null && (
        <PedirVacaciones
          hoy={datos.hoy}
          cuenta={{ vacacionesEn: datos.vacacionesEn, libra: datos.libra }}
          sePuedenPedir={datos.sePuedenPedir}
          titulo="Pedir vacaciones"
          boton="Pedirlas"
          {...(pidiendo.desde === undefined ? {} : { desdeDeEntrada: pidiendo.desde })}
          {...(pidiendo.hasta === undefined ? {} : { hastaDeEntrada: pidiendo.hasta })}
          alCerrar={() => {
            setPidiendo(null);
          }}
          alEnviar={async ({ desde, hasta, texto, libra }) => {
            const respuesta = await cliente.ejecutar('pedir_vacaciones', {
              desde,
              hasta,
              ...(texto === null ? {} : { nota: texto }),
              ...(libra === null ? {} : { libra: [...libra] }),
            });
            if (!respuesta.ok) return respuesta.error;
            setPidiendo(null);
            await refrescar(
              `Vacaciones pedidas ${delAl(desde, hasta)}: te avisamos cuando te contesten`,
            );
            return null;
          }}
        />
      )}
    </div>
  );
}

function FilaDeSolicitud({
  solicitud,
  haciendo,
  alRetirar,
}: {
  readonly solicitud: UnaSolicitud;
  readonly haciendo: boolean;
  readonly alRetirar: () => void;
}) {
  const como = COMO_VA[solicitud.estado];
  return (
    <div
      className={clases(
        'flex flex-wrap items-center gap-e3 rounded-mayor border border-borde bg-superficie p-e3 [box-shadow:var(--sombra-tarjeta)]',
        solicitud.estado === 'rechazada' && 'opacity-90',
      )}
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-[12px] text-white"
        style={fondoDegradado(
          solicitud.estado === 'aprobada'
            ? 'vacaciones'
            : solicitud.estado === 'rechazada'
              ? 'incidencias'
              : 'horas',
        )}
      >
        <IconoPalmera size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold first-letter:uppercase">
          {delAl(solicitud.desde, solicitud.hasta)}
        </span>
        <span className="block text-secundario text-texto-suave">
          {diasEnLetra(solicitud.dias)} {solicitud.dias === 1 ? 'día' : 'días'}
          {solicitud.decididaPor !== null && solicitud.estado !== 'pedida'
            ? ` · ${solicitud.decididaPor}`
            : ''}
          {solicitud.motivo !== null && solicitud.estado === 'rechazada'
            ? ` · «${solicitud.motivo}»`
            : ''}
        </span>
      </span>
      <Etiqueta tono={como.tono}>{como.texto}</Etiqueta>
      {solicitud.estado === 'pedida' && (
        <Boton tono="texto" cargando={haciendo} textoCargando="Retirando" onClick={alRetirar}>
          Retirar
        </Boton>
      )}
    </div>
  );
}
