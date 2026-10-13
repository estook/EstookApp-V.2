import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PERSONAS_EN_UN_PRIVADO } from '@estook/dominio';
import {
  Avatar,
  Boton,
  Botones,
  CAJA,
  Campo,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Hoja,
  clases,
} from '@estook/ui';
import {
  IconoAnadir,
  IconoBuscar,
  IconoChat,
  IconoEquipo,
  IconoEscandallos,
  IconoServicio,
  IconoSilenciado,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarQueEspere } from '../ganchos/usarQueEspere.ts';
import { Conversacion } from './Conversacion.tsx';
import { usarElChatConElTeclado } from '../ganchos/usarElChatConElTeclado.ts';
import { SiTeSuena } from './SiTeSuena.tsx';
import { usarMisCanales } from '../ganchos/usarElChat.ts';
import {
  CLAVE_DE_MIS_CANALES,
  cuandoEnLaLista,
  type CanalEnLista,
  type EncontradoEnElChat,
  type PersonaDelCanal,
} from './contrato.ts';

/**
 * El chat del equipo (C1 · decisiones 0071 y 0073).
 *
 * Ocupa todo el hueco entre la barra de arriba y la de abajo, como cualquier chat: en
 * el ordenador, la lista a la izquierda y la conversación a la derecha; en el móvil,
 * una cosa o la otra. «Todo el equipo», «Cocina» y «Sala» van arriba; lo demás, por lo
 * último que se ha dicho.
 */
export function ElChat() {
  const { canal } = useParams<{ canal?: string }>();
  const canalId = canal ?? null;
  // Con el teclado abierto, justo lo que se ve; sin él, entre las dos barras. Y la
  // página de debajo, quieta (repaso de C1, `conElTeclado.ts`).
  const caja = useRef<HTMLDivElement>(null);
  const conTeclado = usarElChatConElTeclado(caja);

  return (
    <div
      ref={caja}
      data-chat-con-teclado={conTeclado === null ? undefined : ''}
      className={clases(
        'fixed inset-x-0 flex bg-fondo',
        conTeclado === null &&
          'z-20 top-[calc(var(--alto-barra-movil)+env(safe-area-inset-top))] bottom-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)-var(--desfase-abajo,0px))]',
        conTeclado === null && 'lg:top-[var(--alto-barra-escritorio)] lg:bottom-0',
        // Por encima de la barra de arriba, que el iPhone ha subido fuera de la vista, y
        // con el hueco de la hora y la batería.
        // Y por encima de la barra de abajo (z-40), que escribiendo sin teclado en
        // pantalla —uno físico— seguiría tapando la caja; debajo del «deshacer» (z-50).
        conTeclado !== null && 'z-[45] pt-[env(safe-area-inset-top)]',
      )}
      style={
        conTeclado === null
          ? undefined
          : { top: `${String(conTeclado.arriba)}px`, height: `${String(conTeclado.alto)}px` }
      }
    >
      <section
        aria-label="Conversaciones"
        className={clases(
          'flex min-h-0 w-full flex-col border-r border-borde bg-superficie lg:w-[22rem] lg:shrink-0',
          canalId !== null && 'max-lg:hidden',
        )}
      >
        <ListaDeCanales canalAbierto={canalId} />
      </section>
      <section
        aria-label="Conversación"
        className={clases(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          canalId === null && 'max-lg:hidden',
        )}
      >
        {canalId === null ? (
          <div className="grid flex-1 place-items-center p-e5">
            <EstadoVacio
              dibujo="equipo"
              titulo="Elige una conversación"
              frase="Lo que se habla del trabajo, ordenado por local, con quién lo ha leído."
            />
          </div>
        ) : (
          <Conversacion key={canalId} canalId={canalId} />
        )}
      </section>
    </div>
  );
}

// ── La lista ─────────────────────────────────────────────────────────────────

function ListaDeCanales({ canalAbierto }: { readonly canalAbierto: string | null }) {
  const navegar = useNavigate();
  const consulta = usarMisCanales();
  const [texto, setTexto] = useState('');
  const buscado = usarQueEspere(texto.trim(), 300);
  const [nueva, setNueva] = useState(false);
  const ahora = new Date(Date.now());

  return (
    <>
      <header className="flex items-center gap-e2 border-b border-borde px-e3 py-e2">
        <h1 className="min-w-0 flex-1 truncate text-pantalla">Chat</h1>
        <Boton
          tono="secundario"
          icono={<IconoAnadir size={18} />}
          onClick={() => {
            setNueva(true);
          }}
        >
          Nueva
        </Boton>
      </header>
      <div className="border-b border-borde px-e3 py-e2">
        <label className="relative block">
          <span className="sr-only">Buscar en el chat</span>
          <span aria-hidden className="absolute left-e3 top-1/2 -translate-y-1/2 text-texto-tenue">
            <IconoBuscar size={18} />
          </span>
          <input
            type="search"
            className={clases(CAJA, 'pl-[calc(var(--spacing-e3)+26px)]')}
            placeholder="Buscar en el chat"
            value={texto}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        </label>
      </div>
      <SiTeSuena />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {buscado.length >= 2 ? (
          <LoEncontrado
            texto={buscado}
            alAbrir={(id) => {
              setTexto('');
              navegar(`/chat/${id}`);
            }}
          />
        ) : consulta.isPending ? (
          <div className="p-e4">
            <Cargando que="las conversaciones" lineas={5} />
          </div>
        ) : consulta.isError ? (
          <p className="p-e4 text-secundario text-texto-suave">
            No he podido leer el chat. Vuelve a intentarlo en un momento.
          </p>
        ) : consulta.data.canales.length === 0 ? (
          <div className="p-e4">
            <EstadoVacio
              dibujo="equipo"
              titulo="Todavía no hay chat aquí"
              frase="En cuanto alguien del local lo abra, sale «Todo el equipo». Los demás canales los crean el gerente y los jefes."
            />
          </div>
        ) : (
          <ul className="flex flex-col">
            {consulta.data.canales.map((canal) => (
              <li key={canal.id}>
                <FilaDeCanal
                  canal={canal}
                  abierto={canal.id === canalAbierto}
                  ahora={ahora}
                  alAbrir={() => {
                    navegar(`/chat/${canal.id}`);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {nueva && (
        <NuevaConversacion
          puedeCrearCanales={consulta.data?.puedeCrearCanales ?? false}
          alCerrar={() => {
            setNueva(false);
          }}
          alAbrir={(id) => {
            setNueva(false);
            navegar(`/chat/${id}`);
          }}
        />
      )}
    </>
  );
}

/** El dibujo de cada canal: los de fábrica, su icono; los privados, la persona. */
function DibujoDelCanal({ canal }: { readonly canal: CanalEnLista }) {
  const redondo = 'grid size-10 shrink-0 place-items-center rounded-redondo';
  if (canal.tipo === 'equipo') {
    return (
      <span className={clases(redondo, 'bg-naranja-suave text-naranja')}>
        <IconoEquipo size={20} />
      </span>
    );
  }
  if (canal.tipo === 'cocina') {
    return (
      <span className={clases(redondo, 'bg-fondo text-texto-suave')}>
        <IconoEscandallos size={20} />
      </span>
    );
  }
  if (canal.tipo === 'sala') {
    return (
      <span className={clases(redondo, 'bg-fondo text-texto-suave')}>
        <IconoServicio size={20} />
      </span>
    );
  }
  if (canal.tipo === 'privado' && canal.otros.length === 1) {
    return <Avatar nombre={canal.otros[0] ?? canal.nombre} tamano={40} />;
  }
  return (
    <span className={clases(redondo, 'bg-fondo text-texto-suave')}>
      <IconoChat size={20} />
    </span>
  );
}

function FilaDeCanal({
  canal,
  abierto,
  ahora,
  alAbrir,
}: {
  readonly canal: CanalEnLista;
  readonly abierto: boolean;
  readonly ahora: Date;
  readonly alAbrir: () => void;
}) {
  const quien =
    canal.ultimo === null
      ? ''
      : canal.ultimo.esMio
        ? 'Tú: '
        : canal.tipo === 'privado' && canal.otros.length === 1
          ? ''
          : `${canal.ultimo.autor ?? 'Alguien'}: `;
  const sinLeer = canal.sinLeer > 0;

  return (
    <button
      type="button"
      onClick={alAbrir}
      aria-current={abierto ? 'page' : undefined}
      aria-label={`${canal.nombre}${sinLeer ? `, ${String(canal.sinLeer)} sin leer` : ''}`}
      className={clases(
        'flex w-full min-h-toque items-center gap-e3 px-e3 py-e2 text-left hover:bg-fondo',
        abierto && 'bg-naranja-suave hover:bg-naranja-suave',
      )}
    >
      <DibujoDelCanal canal={canal} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-e2">
          <span
            className={clases('min-w-0 flex-1 truncate text-cuerpo', sinLeer && 'font-semibold')}
          >
            {canal.nombre}
          </span>
          {canal.ultimo !== null && (
            <span
              className={clases(
                'shrink-0 text-etiqueta',
                sinLeer ? 'font-semibold text-texto' : 'text-texto-tenue',
              )}
            >
              {cuandoEnLaLista(canal.ultimo.en, ahora)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-e2">
          <span className="min-w-0 flex-1 truncate text-secundario text-texto-suave">
            {canal.ultimo === null ? 'Sin mensajes todavía' : `${quien}${canal.ultimo.vista}`}
          </span>
          {canal.silenciado && (
            <span aria-label="Silenciado" className="shrink-0 text-texto-tenue">
              <IconoSilenciado size={16} />
            </span>
          )}
          {canal.teNombran && (
            <span
              aria-label="Te nombran"
              className="grid size-5 shrink-0 place-items-center rounded-redondo bg-naranja text-[12px] font-bold text-sobre-naranja"
            >
              @
            </span>
          )}
          {sinLeer && (
            <span
              aria-hidden
              className="h-5 min-w-5 shrink-0 rounded-redondo bg-naranja px-[6px] text-center text-[12px] font-bold leading-5 text-sobre-naranja"
            >
              {canal.sinLeer > 99 ? '99+' : canal.sinLeer}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

// ── El buscador ──────────────────────────────────────────────────────────────

function LoEncontrado({
  texto,
  alAbrir,
}: {
  readonly texto: string;
  readonly alAbrir: (canalId: string) => void;
}) {
  const { cliente } = usarSesion();
  const consulta = useQuery({
    queryKey: ['buscar_en_el_chat', texto],
    queryFn: async () => {
      const respuesta = await cliente.consultar<{ encontrados: EncontradoEnElChat[] }>(
        'buscar_en_el_chat',
        { texto },
      );
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos.encontrados;
    },
  });
  const ahora = new Date(Date.now());

  if (consulta.isPending) {
    return (
      <div className="p-e4">
        <Cargando que="lo que buscas" lineas={3} />
      </div>
    );
  }
  if (consulta.isError || consulta.data.length === 0) {
    return (
      <p className="p-e4 text-secundario text-texto-suave">
        Nada con «{texto}» en lo que puedes ver.
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {consulta.data.map((e) => (
        <li key={e.mensajeId}>
          <button
            type="button"
            onClick={() => {
              alAbrir(e.canalId);
            }}
            className="flex w-full min-h-toque flex-col gap-e1 px-e3 py-e2 text-left hover:bg-fondo"
          >
            <span className="flex items-baseline gap-e2">
              <span className="min-w-0 flex-1 truncate text-secundario font-medium">
                {e.canal} · {e.autor}
              </span>
              <span className="shrink-0 text-etiqueta text-texto-tenue">
                {cuandoEnLaLista(e.en, ahora)}
              </span>
            </span>
            <span className="line-clamp-2 text-secundario text-texto-suave">{e.vista}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Una conversación nueva ───────────────────────────────────────────────────

/**
 * Un privado, de dos o de un grupo pequeño, lo abre cualquiera; un canal («Barra»,
 * «Encargados»), quien lleva el local (0071, pregunta 3).
 */
function NuevaConversacion({
  puedeCrearCanales,
  alCerrar,
  alAbrir,
}: {
  readonly puedeCrearCanales: boolean;
  readonly alCerrar: () => void;
  readonly alAbrir: (canalId: string) => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [como, setComo] = useState<'privado' | 'canal'>('privado');
  const [elegidas, setElegidas] = useState<readonly string[]>([]);
  const [nombre, setNombre] = useState('');
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [creando, setCreando] = useState(false);

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

  const filtradas = (gente.data ?? []).filter((p) =>
    p.nombre.toLocaleLowerCase('es-ES').includes(filtro.trim().toLocaleLowerCase('es-ES')),
  );
  const tope = como === 'privado' ? PERSONAS_EN_UN_PRIVADO - 1 : Number.POSITIVE_INFINITY;
  const pideNombre = como === 'canal' || elegidas.length > 1;
  const listo =
    !creando &&
    (como === 'canal' ? nombre.trim() !== '' : elegidas.length >= 1) &&
    elegidas.length <= tope;

  async function crear() {
    setCreando(true);
    setError(null);
    const respuesta =
      como === 'canal'
        ? await cliente.ejecutar<{ canalId: string }>('crear_canal', {
            nombre: nombre.trim(),
            personas: elegidas,
          })
        : await cliente.ejecutar<{ canalId: string }>('abrir_privado', {
            personas: elegidas,
            ...(nombre.trim() === '' ? {} : { nombre: nombre.trim() }),
          });
    setCreando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_CANALES });
    alAbrir(respuesta.datos.canalId);
  }

  function cambiar(persona: string) {
    setElegidas((antes) =>
      antes.includes(persona) ? antes.filter((p) => p !== persona) : [...antes, persona],
    );
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={como === 'canal' ? 'Canal nuevo' : 'Conversación nueva'}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={creando}
            textoCargando="Abriendo"
            onClick={() => {
              void crear();
            }}
          >
            {como === 'canal' ? 'Crear el canal' : 'Empezar'}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {puedeCrearCanales && (
          <div role="radiogroup" aria-label="Qué abrir" className="grid grid-cols-2 gap-e2">
            {(
              [
                ['privado', 'Privado', 'Con una persona o un grupo pequeño'],
                ['canal', 'Canal', 'Para una zona o un grupo fijo'],
              ] as const
            ).map(([valor, titulo, frase]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={como === valor}
                onClick={() => {
                  setComo(valor);
                }}
                className={clases(
                  'flex min-h-toque flex-col items-start gap-e1 rounded-medio border p-e3 text-left',
                  como === valor
                    ? 'border-naranja bg-naranja-suave'
                    : 'border-borde-fuerte bg-superficie hover:bg-fondo',
                )}
              >
                <span className="text-cuerpo font-semibold">{titulo}</span>
                <span className="text-secundario text-texto-suave">{frase}</span>
              </button>
            ))}
          </div>
        )}

        {pideNombre && (
          <Campo
            etiqueta={como === 'canal' ? 'Nombre del canal' : 'Nombre del grupo'}
            obligatorio={como === 'canal'}
            ayuda={como === 'canal' ? '«Barra», «Encargados».' : 'Opcional.'}
            maxLength={40}
            value={nombre}
            onChange={(e) => {
              setNombre(e.currentTarget.value);
            }}
          />
        )}

        <Campo
          etiqueta={como === 'canal' ? 'Quién entra' : 'Con quién'}
          placeholder="Busca por nombre"
          delante={<IconoBuscar size={18} />}
          value={filtro}
          onChange={(e) => {
            setFiltro(e.currentTarget.value);
          }}
        />

        {gente.isPending ? (
          <Cargando que="la gente del local" lineas={4} />
        ) : filtradas.length === 0 ? (
          <p className="text-secundario text-texto-suave">Nadie con ese nombre en este local.</p>
        ) : (
          <ul className="flex flex-col">
            {filtradas.map((p) => {
              const puesta = elegidas.includes(p.id);
              return (
                <li key={p.id}>
                  <label className="flex min-h-toque cursor-pointer items-center gap-e3 rounded-medio px-e2 hover:bg-fondo">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--color-naranja)]"
                      checked={puesta}
                      disabled={!puesta && elegidas.length >= tope}
                      onChange={() => {
                        cambiar(p.id);
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
        {como === 'privado' && (
          <p className="text-etiqueta text-texto-tenue">
            Lo que se dice en un privado solo lo ven quienes están dentro: ni quien lleva el local.
          </p>
        )}
      </div>
    </Hoja>
  );
}
