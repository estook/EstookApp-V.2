import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PERSONAS_EN_UN_PRIVADO,
  REACCIONES,
  esCanalDeFabrica,
  pesoEnLetra,
  type EstadoDeMiMensaje,
} from '@estook/dominio';
import {
  Avatar,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Hoja,
  Interruptor,
  clases,
} from '@estook/ui';
import {
  IconoAtras,
  IconoDocumento,
  IconoHecho,
  IconoLeido,
  IconoMas,
  IconoReloj,
  IconoSilenciado,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { Escribir } from './Escribir.tsx';
import { NotaDeVoz } from './NotaDeVoz.tsx';
import { olvidar, reintentar, type PorMandar } from './porMandar.ts';
import { usarPorMandar } from '../ganchos/usarPorMandar.ts';
import { usarUnCanal } from '../ganchos/usarElChat.ts';
import {
  CLAVE_DE_MIS_CANALES,
  claveDeUnCanal,
  diaEnLaConversacion,
  horaDelMensaje,
  type LecturaDeOtro,
  type MensajeDelCanal,
  type PersonaDelCanal,
  type UnCanal,
} from './contrato.ts';

/**
 * Una conversación (C1 · 0073).
 *
 * Lo de siempre en un chat, y lo que lo hace de Estook: **leído es leído de verdad**
 * —con el canal abierto y la app a la vista— y se ve siempre, sin poder ocultarlo
 * (0071, pregunta 6); los privados no los lee nadie más; y lo que pide quien lleva el
 * local —retirar un mensaje— nunca entra en un privado.
 */
export function Conversacion({ canalId }: { readonly canalId: string }) {
  const navegar = useNavigate();
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const consulta = usarUnCanal(canalId);
  const [respondiendo, setRespondiendo] = useState<MensajeDelCanal | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<MensajeDelCanal | null>(null);
  const [opciones, setOpciones] = useState<MensajeDelCanal | null>(null);
  const [delCanal, setDelCanal] = useState(false);
  const [leidoPor, setLeidoPor] = useState<MensajeDelCanal | null>(null);
  const [retirando, setRetirando] = useState<MensajeDelCanal | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const paginas = consulta.data?.pages ?? [];
  const ultima: UnCanal | undefined = paginas[0];
  const mensajes = [...paginas].reverse().flatMap((p) => p.mensajes);
  const ultimoId = mensajes.at(-1)?.id ?? null;

  // Lo escrito que todavía no está en la lista: sale ya, con su reloj. En cuanto la
  // lista lo trae, se olvida el de la cola, en el mismo pintado: nunca sale dos veces.
  const porMandar = usarPorMandar(canalId);
  const enLaLista = new Set(mensajes.map((m) => m.id));
  const esperando = porMandar.filter((p) => p.mensajeId === null || !enLaLista.has(p.mensajeId));
  const llegadas = porMandar
    .filter((p) => p.mensajeId !== null && enLaLista.has(p.mensajeId))
    .map((p) => p.clave)
    .join(',');
  useEffect(() => {
    if (llegadas !== '') olvidar(llegadas.split(','));
  }, [llegadas]);

  // La raya de «sin leer», con lo que había leído **al abrir**: si se moviera con cada
  // lectura, desaparecería en cuanto se ve, que es justo cuando hace falta.
  const leidoAlAbrir = useRef<number | null>(null);
  if (leidoAlAbrir.current === null && ultima !== undefined) {
    leidoAlAbrir.current = Number(ultima.leidoHasta);
  }
  const primeroSinLeer = mensajes.find(
    (m) => !m.esMio && Number(m.id) > (leidoAlAbrir.current ?? Number.POSITIVE_INFINITY),
  );

  // Leído: con el canal abierto y la app a la vista. Una vez por mensaje.
  const leidoMandado = useRef<string | null>(null);
  useEffect(() => {
    if (ultimoId === null || ultima === undefined) return undefined;
    function leer() {
      if (document.visibilityState !== 'visible' || ultimoId === null) return;
      if (
        leidoMandado.current === ultimoId ||
        Number(ultimoId) <= Number(ultima?.leidoHasta ?? 0)
      ) {
        return;
      }
      leidoMandado.current = ultimoId;
      void cliente
        .ejecutar('leer_el_canal', { canal_id: canalId, hasta: ultimoId })
        .then(() => cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_CANALES }));
    }
    leer();
    document.addEventListener('visibilitychange', leer);
    return () => {
      document.removeEventListener('visibilitychange', leer);
    };
  }, [ultimoId, ultima, canalId, cliente, cache]);

  // Abajo del todo al abrir y cuando llega algo, si ya se estaba abajo.
  const lista = useRef<HTMLDivElement>(null);
  const abajo = useRef(true);
  useLayoutEffect(() => {
    const caja = lista.current;
    if (caja !== null && abajo.current) caja.scrollTop = caja.scrollHeight;
  }, [ultimoId, mensajes.length, esperando.length]);

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: claveDeUnCanal(canalId) });
    await cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_CANALES });
  }

  async function hacer(nombre: string, entrada: Record<string, unknown>) {
    setError(null);
    const respuesta = await cliente.ejecutar(nombre, entrada);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return false;
    }
    await refrescar();
    return true;
  }

  if (consulta.isPending) {
    return (
      <div className="p-e4">
        <Cargando que="la conversación" lineas={6} />
      </div>
    );
  }
  if (consulta.isError || ultima === undefined) {
    return (
      <div className="flex flex-col gap-e3 p-e4">
        <p className="text-cuerpo">Esta conversación no está, o no es de las que puedes ver.</p>
        <div>
          <Boton
            tono="secundario"
            onClick={() => {
              navegar('/chat');
            }}
          >
            Volver al chat
          </Boton>
        </div>
      </div>
    );
  }

  const { canal, personas, lecturas } = ultima;
  const privadoDeDos = canal.tipo === 'privado' && personas.length === 2;
  const ahora = new Date(Date.now());

  return (
    <>
      <header className="flex items-center gap-e2 border-b border-borde bg-superficie px-e2 py-e1">
        <button
          type="button"
          aria-label="Volver a las conversaciones"
          onClick={() => {
            navegar('/chat');
          }}
          className="grid size-toque place-items-center rounded-medio lg:hidden"
        >
          <IconoAtras size={20} />
        </button>
        <button
          type="button"
          onClick={() => {
            setDelCanal(true);
          }}
          className="flex min-h-toque min-w-0 flex-1 flex-col justify-center rounded-medio px-e2 text-left hover:bg-fondo"
        >
          <span className="flex items-center gap-e2">
            <h2 className="min-w-0 truncate text-cuerpo font-semibold">{canal.nombre}</h2>
            {canal.silenciado && (
              <span aria-label="Silenciado" className="text-texto-tenue">
                <IconoSilenciado size={16} />
              </span>
            )}
          </span>
          {!privadoDeDos && (
            <span className="truncate text-etiqueta text-texto-suave">
              {personas.length === 1 ? 'Solo tú' : `${String(personas.length)} personas`}
            </span>
          )}
        </button>
        <button
          type="button"
          aria-label="Opciones de la conversación"
          onClick={() => {
            setDelCanal(true);
          }}
          className="grid size-toque place-items-center rounded-medio hover:bg-fondo"
        >
          <IconoMas size={20} />
        </button>
      </header>

      <div
        ref={lista}
        onScroll={(e) => {
          const caja = e.currentTarget;
          abajo.current = caja.scrollHeight - caja.scrollTop - caja.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-e3 py-e3"
      >
        {consulta.hasNextPage && (
          <div className="mb-e3 flex justify-center">
            <Boton
              tono="secundario"
              cargando={consulta.isFetchingNextPage}
              textoCargando="Trayendo"
              onClick={() => {
                abajo.current = false;
                void consulta.fetchNextPage();
              }}
            >
              Ver lo anterior
            </Boton>
          </div>
        )}
        {mensajes.length === 0 && esperando.length === 0 && (
          <p className="py-e6 text-center text-secundario text-texto-suave">
            {esCanalDeFabrica(canal.tipo)
              ? `Aquí habla ${canal.tipo === 'equipo' ? 'todo el equipo' : `la ${canal.nombre.toLowerCase()}`}. Di algo.`
              : 'Todavía no se ha dicho nada.'}
          </p>
        )}
        <ol className="flex flex-col gap-e1">
          {mensajes.map((mensaje, i) => {
            const anterior: MensajeDelCanal | undefined = mensajes[i - 1];
            const otroDia =
              anterior === undefined ||
              new Date(anterior.en).toDateString() !== new Date(mensaje.en).toDateString();
            const mismoAutor = !otroDia && anterior.autorId === mensaje.autorId;
            return (
              <Fragment key={mensaje.id}>
                {otroDia && (
                  <li className="my-e2 flex justify-center">
                    <span className="rounded-redondo bg-superficie px-e3 py-[2px] text-etiqueta text-texto-suave shadow-s1">
                      {diaEnLaConversacion(mensaje.en, ahora)}
                    </span>
                  </li>
                )}
                {primeroSinLeer?.id === mensaje.id && (
                  <li className="my-e2 flex items-center gap-e2 text-etiqueta font-semibold text-texto">
                    <span className="h-px flex-1 bg-naranja" />
                    Sin leer
                    <span className="h-px flex-1 bg-naranja" />
                  </li>
                )}
                <li>
                  <Burbuja
                    mensaje={mensaje}
                    personas={personas}
                    conAutor={!mensaje.esMio && !privadoDeDos && !mismoAutor}
                    alOpciones={() => {
                      setOpciones(mensaje);
                    }}
                    alReaccionar={(emoji) => {
                      void hacer('reaccionar', { mensaje_id: mensaje.id, emoji });
                    }}
                    alVerLeido={() => {
                      setLeidoPor(mensaje);
                    }}
                  />
                </li>
              </Fragment>
            );
          })}
          {esperando.map((p, i) => {
            // La raya del día, como la tendrá al llegar: si no, el mensaje salta.
            const antes = i === 0 ? mensajes.at(-1)?.en : esperando[i - 1]?.en;
            const otroDia =
              antes === undefined ||
              new Date(antes).toDateString() !== new Date(p.en).toDateString();
            return (
              <Fragment key={p.clave}>
                {otroDia && (
                  <li className="my-e2 flex justify-center">
                    <span className="rounded-redondo bg-superficie px-e3 py-[2px] text-etiqueta text-texto-suave shadow-s1">
                      {diaEnLaConversacion(p.en, ahora)}
                    </span>
                  </li>
                )}
                <li>
                  <BurbujaPorMandar porMandar={p} personas={personas} />
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>

      {error !== null && (
        <div className="px-e3 pb-e2">
          <ErrorEnCristiano error={error} />
        </div>
      )}

      <Escribir
        canalId={canalId}
        personas={personas}
        respondiendo={respondiendo}
        corrigiendo={corrigiendo}
        alTerminar={() => {
          setRespondiendo(null);
          setCorrigiendo(null);
          abajo.current = true;
        }}
        alQuitarRespuesta={() => {
          setRespondiendo(null);
        }}
        alDejarDeCorregir={() => {
          setCorrigiendo(null);
        }}
      />

      {opciones !== null && (
        <OpcionesDelMensaje
          mensaje={opciones}
          puedeRetirar={canal.puedeRetirar}
          enGrupo={!privadoDeDos}
          alCerrar={() => {
            setOpciones(null);
          }}
          alResponder={() => {
            setRespondiendo(opciones);
            setCorrigiendo(null);
            setOpciones(null);
          }}
          alCorregir={() => {
            setCorrigiendo(opciones);
            setRespondiendo(null);
            setOpciones(null);
          }}
          alReaccionar={(emoji) => {
            void hacer('reaccionar', { mensaje_id: opciones.id, emoji });
            setOpciones(null);
          }}
          alBorrar={() => {
            void hacer('borrar_mensaje', { mensaje_id: opciones.id });
            setOpciones(null);
          }}
          alRetirar={() => {
            setRetirando(opciones);
            setOpciones(null);
          }}
          alVerLeido={() => {
            setLeidoPor(opciones);
            setOpciones(null);
          }}
        />
      )}

      {retirando !== null && (
        <RetirarMensaje
          alCerrar={() => {
            setRetirando(null);
          }}
          alRetirar={async (motivo) => {
            const hecho = await hacer('retirar_mensaje', { mensaje_id: retirando.id, motivo });
            if (hecho) setRetirando(null);
          }}
        />
      )}

      {leidoPor !== null && (
        <QuienLoHaLeido
          mensaje={leidoPor}
          lecturas={lecturas}
          alCerrar={() => {
            setLeidoPor(null);
          }}
        />
      )}

      {delCanal && (
        <OpcionesDelCanal
          datos={ultima}
          alCerrar={() => {
            setDelCanal(false);
          }}
          alSilenciar={async (silenciado) => {
            await hacer('silenciar_canal', { canal_id: canalId, silenciado });
          }}
          alSalir={async () => {
            const hecho = await hacer('salir_del_canal', { canal_id: canalId });
            if (hecho) navegar('/chat');
          }}
          alAnadir={(elegidas) =>
            hacer('anadir_al_canal', { canal_id: canalId, personas: elegidas })
          }
        />
      )}
    </>
  );
}

// ── Una burbuja ──────────────────────────────────────────────────────────────

/** El texto, con los nombrados en negrita. */
function ConNombres({
  texto,
  personas,
}: {
  readonly texto: string;
  readonly personas: readonly PersonaDelCanal[];
}) {
  const nombres = [...personas]
    .map((p) => p.nombre)
    .filter((n) => n.trim() !== '')
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (nombres.length === 0) return <>{texto}</>;
  const trozos = texto.split(new RegExp(`(@(?:${nombres.join('|')}))`, 'giu'));
  return (
    <>
      {trozos.map((trozo, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-texto">
            {trozo}
          </strong>
        ) : (
          <Fragment key={i}>{trozo}</Fragment>
        ),
      )}
    </>
  );
}

function MarcaDeEstado({
  estado,
  alVer,
}: {
  readonly estado: EstadoDeMiMensaje;
  readonly alVer: () => void;
}) {
  if (estado.como === 'enviado') {
    return (
      <span aria-label="Enviado" className="text-texto-tenue">
        <IconoHecho size={14} />
      </span>
    );
  }
  if (estado.como === 'entregado') {
    return (
      <span aria-label="Entregado, sin leer" className="text-texto-tenue">
        <IconoLeido size={14} />
      </span>
    );
  }
  if (estado.como === 'leido') {
    return (
      <button type="button" onClick={alVer} aria-label="Leído por todos" className="text-bien">
        <IconoLeido size={14} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={alVer}
      aria-label={`Leído por ${String(estado.cuantos)} de ${String(estado.de)}`}
      className="flex items-center gap-[2px] text-texto-suave"
    >
      <IconoLeido size={14} />
      <span className="text-etiqueta">
        {estado.cuantos}/{estado.de}
      </span>
    </button>
  );
}

function Adjunto({ mensaje }: { readonly mensaje: MensajeDelCanal }) {
  const adjunto = mensaje.adjunto;
  if (adjunto === null) return null;
  if (adjunto.enlace === null) {
    return <p className="text-secundario text-texto-suave">El fichero no se puede abrir ahora.</p>;
  }
  if (adjunto.tipo === 'foto') {
    return (
      <a href={adjunto.enlace} target="_blank" rel="noreferrer" className="block">
        <img
          src={adjunto.enlace}
          alt={mensaje.texto ?? 'Foto'}
          loading="lazy"
          className="max-h-72 w-full max-w-72 rounded-medio bg-fondo object-cover"
        />
      </a>
    );
  }
  if (adjunto.tipo === 'voz') {
    return <NotaDeVoz enlace={adjunto.enlace} segundos={adjunto.segundos} mia={mensaje.esMio} />;
  }
  return (
    <a
      href={adjunto.enlace}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-toque items-center gap-e2 rounded-medio border border-borde bg-superficie px-e3 py-e2 hover:bg-fondo"
    >
      <span className="text-texto-suave">
        <IconoDocumento size={20} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-secundario font-medium">
          {adjunto.nombre ?? 'Documento'}
        </span>
        <span className="block text-etiqueta text-texto-suave">{pesoEnLetra(adjunto.bytes)}</span>
      </span>
    </a>
  );
}

function Burbuja({
  mensaje,
  personas,
  conAutor,
  alOpciones,
  alReaccionar,
  alVerLeido,
}: {
  readonly mensaje: MensajeDelCanal;
  readonly personas: readonly PersonaDelCanal[];
  readonly conAutor: boolean;
  readonly alOpciones: () => void;
  readonly alReaccionar: (emoji: string) => void;
  readonly alVerLeido: () => void;
}) {
  const mio = mensaje.esMio;
  return (
    <div className={clases('group flex items-end gap-e2', mio ? 'flex-row-reverse' : 'flex-row')}>
      {!mio && (
        <span className={clases('shrink-0', !conAutor && 'invisible')}>
          <Avatar nombre={mensaje.autor} tamano={28} />
        </span>
      )}
      <div
        className={clases('flex max-w-[85%] flex-col gap-e1 sm:max-w-[70%]', mio && 'items-end')}
      >
        <div
          className={clases(
            'relative flex flex-col gap-e1 rounded-grande px-e3 py-e2 shadow-s1',
            mio ? 'rounded-br-chico bg-naranja-suave' : 'rounded-bl-chico bg-superficie',
            mensaje.meNombran && !mio && 'ring-2 ring-naranja',
          )}
        >
          {conAutor && (
            <span className="text-etiqueta font-semibold text-texto">{mensaje.autor}</span>
          )}
          {mensaje.respondeA !== null && (
            <span className="block rounded-chico border-l-4 border-naranja bg-fondo px-e2 py-e1">
              <span className="block text-etiqueta font-semibold">{mensaje.respondeA.autor}</span>
              <span className="line-clamp-2 text-etiqueta text-texto-suave">
                {mensaje.respondeA.vista}
              </span>
            </span>
          )}
          {mensaje.borrado ? (
            <p className="text-secundario italic text-texto-suave">
              {mensaje.retirado ? 'Retirado por quien lleva el local' : 'Se eliminó este mensaje'}
            </p>
          ) : (
            <>
              <Adjunto mensaje={mensaje} />
              {mensaje.texto !== null && (
                <p className="whitespace-pre-wrap break-words text-cuerpo">
                  <ConNombres texto={mensaje.texto} personas={personas} />
                </p>
              )}
            </>
          )}
          <span className="flex items-center justify-end gap-e1 text-etiqueta text-texto-tenue">
            {mensaje.editado && !mensaje.borrado && <span>editado</span>}
            <span>{horaDelMensaje(mensaje.en)}</span>
            {mensaje.estado !== null && (
              <MarcaDeEstado estado={mensaje.estado} alVer={alVerLeido} />
            )}
          </span>
        </div>
        {mensaje.reacciones.length > 0 && (
          <span className="flex flex-wrap gap-e1">
            {mensaje.reacciones.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => {
                  alReaccionar(r.emoji);
                }}
                title={r.quien.join(', ')}
                aria-label={`${r.emoji} ${String(r.cuantos)}: ${r.quien.join(', ')}${r.mia ? '. Toca para quitar la tuya' : ''}`}
                className={clases(
                  'flex h-7 items-center gap-[2px] rounded-redondo border px-e2 text-etiqueta',
                  r.mia ? 'border-naranja bg-naranja-suave' : 'border-borde bg-superficie',
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.cuantos}</span>
              </button>
            ))}
          </span>
        )}
      </div>
      {!mensaje.borrado && (
        <button
          type="button"
          aria-label="Opciones del mensaje"
          onClick={alOpciones}
          className="grid size-toque shrink-0 place-items-center rounded-medio text-texto-tenue hover:bg-superficie lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100"
        >
          <IconoMas size={18} />
        </button>
      )}
    </div>
  );
}

/**
 * Lo propio que todavía va de camino: igual que una burbuja mía, con un reloj en vez
 * del ✓. Sin red lo dice y espera; si el servidor no lo acepta, sale en rojo con
 * «Reintentar» y «Quitar», sin perder lo escrito.
 */
function BurbujaPorMandar({
  porMandar,
  personas,
}: {
  readonly porMandar: PorMandar;
  readonly personas: readonly PersonaDelCanal[];
}) {
  const { adjunto, texto, respondeA, estado, error } = porMandar;
  const dato = adjunto === null ? null : `data:${adjunto.mime};base64,${adjunto.contenido}`;
  // La nota, en `blob:`: la política de seguridad no deja oír audio en `data:`.
  const [voz, setVoz] = useState<string | null>(null);
  useEffect(() => {
    if (adjunto?.tipo !== 'voz') return undefined;
    const bytes = Uint8Array.from(atob(adjunto.contenido), (c) => c.charCodeAt(0));
    const enlace = URL.createObjectURL(new Blob([bytes], { type: adjunto.mime }));
    setVoz(enlace);
    return () => {
      URL.revokeObjectURL(enlace);
    };
  }, [adjunto]);
  return (
    <div className="flex flex-row-reverse items-end gap-e2">
      <div className="flex max-w-[85%] flex-col items-end gap-e1 sm:max-w-[70%]">
        <div
          className={clases(
            'flex flex-col gap-e1 rounded-grande rounded-br-chico bg-naranja-suave px-e3 py-e2 shadow-s1',
            estado === 'fallo' && 'ring-2 ring-mal',
          )}
        >
          {respondeA !== null && (
            <span className="block rounded-chico border-l-4 border-naranja bg-fondo px-e2 py-e1">
              <span className="block text-etiqueta font-semibold">{respondeA.autor}</span>
              <span className="line-clamp-2 text-etiqueta text-texto-suave">{respondeA.vista}</span>
            </span>
          )}
          {adjunto !== null && dato !== null && adjunto.tipo === 'foto' && (
            <img
              src={dato}
              alt={texto ?? 'Foto'}
              className="max-h-72 w-full max-w-72 rounded-medio bg-fondo object-cover"
            />
          )}
          {adjunto !== null && voz !== null && adjunto.tipo === 'voz' && (
            <NotaDeVoz enlace={voz} segundos={adjunto.segundos ?? null} mia />
          )}
          {adjunto !== null && adjunto.tipo === 'documento' && (
            <span className="flex min-h-toque items-center gap-e2 rounded-medio border border-borde bg-superficie px-e3 py-e2">
              <span className="text-texto-suave">
                <IconoDocumento size={20} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-secundario font-medium">{adjunto.nombre}</span>
                <span className="block text-etiqueta text-texto-suave">
                  {pesoEnLetra(adjunto.bytes)}
                </span>
              </span>
            </span>
          )}
          {texto !== null && (
            <p className="whitespace-pre-wrap break-words text-cuerpo">
              <ConNombres texto={texto} personas={personas} />
            </p>
          )}
          <span className="flex items-center justify-end gap-e1 text-etiqueta text-texto-tenue">
            <span>{horaDelMensaje(porMandar.en)}</span>
            {estado === 'fallo' ? (
              <span className="font-medium text-mal">No se ha mandado</span>
            ) : (
              <span
                role="status"
                aria-label={estado === 'sin_red' ? 'Sin conexión: se manda al volver' : 'Mandando'}
                className="flex items-center gap-[2px]"
              >
                <IconoReloj size={14} />
                {estado === 'sin_red' && <span>Sin conexión</span>}
              </span>
            )}
          </span>
        </div>
        {estado === 'fallo' && (
          <div className="flex flex-col items-end gap-e1">
            {error !== null && (
              <p className="max-w-72 text-right text-etiqueta text-texto-suave">
                {error.quePasa} {error.queSePuedeHacer}
              </p>
            )}
            <span className="flex gap-e2">
              <Boton
                tono="texto"
                onClick={() => {
                  olvidar([porMandar.clave]);
                }}
              >
                Quitar
              </Boton>
              <Boton
                tono="secundario"
                onClick={() => {
                  reintentar(porMandar.clave);
                }}
              >
                Reintentar
              </Boton>
            </span>
          </div>
        )}
      </div>
      {/* El hueco de las opciones, para que no baile al llegar. */}
      <span aria-hidden className="size-toque shrink-0" />
    </div>
  );
}

// ── Las opciones de un mensaje ───────────────────────────────────────────────

function OpcionesDelMensaje({
  mensaje,
  puedeRetirar,
  enGrupo,
  alCerrar,
  alResponder,
  alCorregir,
  alReaccionar,
  alBorrar,
  alRetirar,
  alVerLeido,
}: {
  readonly mensaje: MensajeDelCanal;
  readonly puedeRetirar: boolean;
  readonly enGrupo: boolean;
  readonly alCerrar: () => void;
  readonly alResponder: () => void;
  readonly alCorregir: () => void;
  readonly alReaccionar: (emoji: string) => void;
  readonly alBorrar: () => void;
  readonly alRetirar: () => void;
  readonly alVerLeido: () => void;
}) {
  const [seguro, setSeguro] = useState(false);
  const fila =
    'flex min-h-toque w-full items-center rounded-medio px-e3 text-left text-cuerpo hover:bg-fondo';
  return (
    <Hoja abierta alCerrar={alCerrar} titulo="El mensaje">
      <div className="flex flex-col gap-e3">
        <div role="group" aria-label="Reaccionar" className="flex flex-wrap justify-between gap-e1">
          {REACCIONES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Reaccionar con ${emoji}`}
              onClick={() => {
                alReaccionar(emoji);
              }}
              className={clases(
                'grid size-toque place-items-center rounded-redondo text-[22px] hover:bg-fondo',
                mensaje.reacciones.some((r) => r.emoji === emoji && r.mia) && 'bg-naranja-suave',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          <button type="button" className={fila} onClick={alResponder}>
            Responder
          </button>
          {mensaje.texto !== null && (
            <button
              type="button"
              className={fila}
              onClick={() => {
                void navigator.clipboard.writeText(mensaje.texto ?? '');
                alCerrar();
              }}
            >
              Copiar el texto
            </button>
          )}
          {mensaje.esMio && enGrupo && (
            <button type="button" className={fila} onClick={alVerLeido}>
              Quién lo ha leído
            </button>
          )}
          {mensaje.sePuedeCorregir && (
            <button type="button" className={fila} onClick={alCorregir}>
              Corregir
            </button>
          )}
          {mensaje.esMio &&
            (seguro ? (
              <div className="flex flex-wrap items-center gap-e2 px-e3 py-e2">
                <span className="text-secundario text-texto-suave">
                  Se borra de verdad, para todos.
                </span>
                <Boton tono="peligro" onClick={alBorrar}>
                  Borrar
                </Boton>
              </div>
            ) : (
              <button
                type="button"
                className={clases(fila, 'text-mal')}
                onClick={() => {
                  setSeguro(true);
                }}
              >
                Borrar para todos
              </button>
            ))}
          {!mensaje.esMio && puedeRetirar && (
            <button type="button" className={clases(fila, 'text-mal')} onClick={alRetirar}>
              Retirar del canal
            </button>
          )}
        </div>
      </div>
    </Hoja>
  );
}

function RetirarMensaje({
  alCerrar,
  alRetirar,
}: {
  readonly alCerrar: () => void;
  readonly alRetirar: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState('');
  const [retirando, setRetirando] = useState(false);
  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Retirar el mensaje"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="peligro"
            disabled={motivo.trim() === '' || retirando}
            cargando={retirando}
            textoCargando="Retirando"
            onClick={() => {
              setRetirando(true);
              void alRetirar(motivo.trim()).finally(() => {
                setRetirando(false);
              });
            }}
          >
            Retirar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Sale «Retirado por quien lleva el local» en su sitio, y queda en la auditoría con tu
          nombre y el porqué.
        </p>
        <Campo
          etiqueta="Por qué"
          obligatorio
          autoFocus
          value={motivo}
          onChange={(e) => {
            setMotivo(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}

function QuienLoHaLeido({
  mensaje,
  lecturas,
  alCerrar,
}: {
  readonly mensaje: MensajeDelCanal;
  readonly lecturas: readonly LecturaDeOtro[];
  readonly alCerrar: () => void;
}) {
  const id = Number(mensaje.id);
  const leido = lecturas.filter((l) => Number(l.leidoHasta) >= id);
  const entregado = lecturas.filter(
    (l) => Number(l.leidoHasta) < id && Number(l.entregadoHasta) >= id,
  );
  const falta = lecturas.filter((l) => Number(l.entregadoHasta) < id);
  const grupo = (titulo: string, gente: readonly LecturaDeOtro[]) =>
    gente.length === 0 ? null : (
      <div className="flex flex-col gap-e1">
        <p className="text-secundario font-medium text-texto-suave">
          {titulo} · {gente.length}
        </p>
        <ul className="flex flex-col">
          {gente.map((l) => (
            <li key={l.personaId} className="flex min-h-toque items-center gap-e3">
              <Avatar nombre={l.nombre} tamano={28} />
              <span className="text-cuerpo">{l.nombre}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <Hoja abierta alCerrar={alCerrar} titulo="Quién lo ha leído">
      <div className="flex flex-col gap-e4">
        {grupo('Leído', leido)}
        {grupo('Le ha llegado, sin leer', entregado)}
        {grupo('Todavía no le ha llegado', falta)}
      </div>
    </Hoja>
  );
}

function OpcionesDelCanal({
  datos,
  alCerrar,
  alSilenciar,
  alSalir,
  alAnadir,
}: {
  readonly datos: UnCanal;
  readonly alCerrar: () => void;
  readonly alSilenciar: (silenciado: boolean) => Promise<void>;
  readonly alSalir: () => Promise<void>;
  readonly alAnadir: (personas: readonly string[]) => Promise<boolean>;
}) {
  const { canal, personas } = datos;
  const [seguro, setSeguro] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);
  // Meter gente: en un privado, quien ya está dentro; en un canal, quien lleva el local.
  const puedeAnadir = canal.tipo === 'privado' || (canal.tipo === 'canal' && canal.puedeRetirar);

  if (anadiendo) {
    return (
      <AnadirGente
        titulo={`Añadir a ${canal.nombre}`}
        yaEstan={personas.map((p) => p.id)}
        tope={canal.tipo === 'privado' ? PERSONAS_EN_UN_PRIVADO - personas.length : null}
        alCerrar={() => {
          setAnadiendo(false);
        }}
        alAnadir={async (elegidas) => {
          const hecho = await alAnadir(elegidas);
          if (hecho) setAnadiendo(false);
        }}
      />
    );
  }

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={canal.nombre}>
      <div className="flex flex-col gap-e4">
        {canal.tipo !== 'privado' && (
          <Interruptor
            etiqueta="Silenciar"
            ayuda="No te suena el móvil por este canal, salvo si te nombran."
            puesto={canal.silenciado}
            alCambiar={(puesto) => {
              void alSilenciar(puesto);
            }}
          />
        )}
        <div className="flex flex-col gap-e1">
          <p className="text-secundario font-medium text-texto-suave">
            Quién está · {personas.length}
          </p>
          <ul className="flex max-h-72 flex-col overflow-y-auto">
            {personas.map((p) => (
              <li key={p.id} className="flex min-h-toque items-center gap-e3">
                <Avatar nombre={p.nombre} tamano={28} />
                <span className="text-cuerpo">{p.nombre}</span>
              </li>
            ))}
          </ul>
          {canal.tipo === 'privado' && (
            <p className="text-etiqueta text-texto-tenue">
              Privado: lo que se dice aquí solo lo ven quienes están dentro.
            </p>
          )}
        </div>
        {puedeAnadir && (
          <div>
            <Boton
              tono="secundario"
              onClick={() => {
                setAnadiendo(true);
              }}
            >
              Añadir gente
            </Boton>
          </div>
        )}
        {canal.sePuedeSalir &&
          (seguro ? (
            <div className="flex flex-wrap items-center gap-e2">
              <span className="text-secundario text-texto-suave">Dejarás de verlo.</span>
              <Boton
                tono="peligro"
                onClick={() => {
                  void alSalir();
                }}
              >
                Salir
              </Boton>
            </div>
          ) : (
            <div>
              <Boton
                tono="secundario"
                onClick={() => {
                  setSeguro(true);
                }}
              >
                Salir de esta conversación
              </Boton>
            </div>
          ))}
      </div>
    </Hoja>
  );
}

/** Meter a más gente en un grupo privado o en un canal creado. */
function AnadirGente({
  titulo,
  yaEstan,
  tope,
  alCerrar,
  alAnadir,
}: {
  readonly titulo: string;
  readonly yaEstan: readonly string[];
  /** Cuántos caben todavía (en un privado). Nulo: sin tope. */
  readonly tope: number | null;
  readonly alCerrar: () => void;
  readonly alAnadir: (personas: readonly string[]) => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [elegidas, setElegidas] = useState<readonly string[]>([]);
  const [anadiendo, setAnadiendo] = useState(false);
  const gente = useQuery({
    queryKey: ['gente_del_chat'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<{ personas: PersonaDelCanal[] }>(
        'gente_del_chat',
        {},
      );
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos.personas;
    },
  });
  const fuera = (gente.data ?? []).filter((p) => !yaEstan.includes(p.id));
  const lleno = tope !== null && elegidas.length >= tope;

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={titulo}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={elegidas.length === 0 || anadiendo}
            cargando={anadiendo}
            textoCargando="Añadiendo"
            onClick={() => {
              setAnadiendo(true);
              void alAnadir(elegidas).finally(() => {
                setAnadiendo(false);
              });
            }}
          >
            Añadir
          </Boton>
        </Botones>
      }
    >
      {gente.isPending ? (
        <Cargando que="la gente del local" lineas={4} />
      ) : fuera.length === 0 ? (
        <p className="text-secundario text-texto-suave">Ya está dentro todo el local.</p>
      ) : (
        <ul className="flex flex-col">
          {fuera.map((p) => {
            const puesta = elegidas.includes(p.id);
            return (
              <li key={p.id}>
                <label className="flex min-h-toque cursor-pointer items-center gap-e3 rounded-medio px-e2 hover:bg-fondo">
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--color-naranja)]"
                    checked={puesta}
                    disabled={!puesta && lleno}
                    onChange={() => {
                      setElegidas((antes) =>
                        antes.includes(p.id) ? antes.filter((x) => x !== p.id) : [...antes, p.id],
                      );
                    }}
                  />
                  <Avatar nombre={p.nombre} tamano={32} />
                  <span className="text-cuerpo">{p.nombre}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Hoja>
  );
}
