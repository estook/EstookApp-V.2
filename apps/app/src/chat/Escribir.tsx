import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  LO_QUE_SE_ADJUNTA,
  TOPE_DEL_ADJUNTO,
  TOPE_DEL_MENSAJE,
  duracionEnLetra,
  pesoEnLetra,
} from '@estook/dominio';
import { Avatar, ErrorEnCristiano, clases } from '@estook/ui';
import {
  IconoAdjuntar,
  IconoBorrar,
  IconoCerrar,
  IconoDocumento,
  IconoEnviar,
  IconoMicrofono,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { reducirParaElChat } from '../almacen/reducirFoto.ts';
import { aBase64, empezarAGrabar, sabeGrabar, type Grabacion } from './grabarVoz.ts';
import { mandarCuandoSePueda, type AdjuntoPorMandar } from './porMandar.ts';
import {
  CLAVE_DE_MIS_CANALES,
  claveDeUnCanal,
  type MensajeDelCanal,
  type PersonaDelCanal,
} from './contrato.ts';

/**
 * Escribir en el chat (C1 · 0073).
 *
 * Texto, una foto o un documento con su texto debajo, o una nota de voz —que en una
 * cocina es lo que de verdad se usa—. Con «@» se nombra a alguien de los que ven el
 * canal, y a esa persona le suena aunque lo tenga silenciado. En el ordenador, Intro
 * manda y Mayúsculas+Intro salta de línea; en el móvil, Intro salta de línea y se
 * manda con el botón, como en cualquier chat.
 */

type AdjuntoListo = AdjuntoPorMandar;

/** Lo que se acepta al adjuntar: fotos, PDF, Word y Excel. */
const SE_ADJUNTA =
  'image/*,application/pdf,.docx,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function esEscritorio(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
}

export function Escribir({
  canalId,
  personas,
  respondiendo,
  corrigiendo,
  alTerminar,
  alQuitarRespuesta,
  alDejarDeCorregir,
}: {
  readonly canalId: string;
  readonly personas: readonly PersonaDelCanal[];
  readonly respondiendo: MensajeDelCanal | null;
  readonly corrigiendo: MensajeDelCanal | null;
  readonly alTerminar: () => void;
  readonly alQuitarRespuesta: () => void;
  readonly alDejarDeCorregir: () => void;
}) {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const [texto, setTexto] = useState('');
  const [adjunto, setAdjunto] = useState<AdjuntoListo | null>(null);
  const [mandando, setMandando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [grabando, setGrabando] = useState<{ grabacion: Grabacion; desde: number } | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [nombrando, setNombrando] = useState<string | null>(null);
  const caja = useRef<HTMLTextAreaElement>(null);
  const fichero = useRef<HTMLInputElement>(null);
  const cursorDespuesDeNombrar = useRef<number | null>(null);

  // Al corregir, el texto de antes en la caja.
  useEffect(() => {
    if (corrigiendo !== null) {
      setTexto(corrigiendo.texto ?? '');
      setAdjunto(null);
      caja.current?.focus();
    }
  }, [corrigiendo]);

  useEffect(() => {
    if (respondiendo !== null) caja.current?.focus();
  }, [respondiendo]);

  // Tras nombrar a alguien, el cursor detrás del nombre. Al pintar y no un fotograma
  // después: si no, lo que se teclea deprisa justo entonces cae en otro sitio.
  useLayoutEffect(() => {
    const posicion = cursorDespuesDeNombrar.current;
    const el = caja.current;
    if (posicion === null || el === null) return;
    cursorDespuesDeNombrar.current = null;
    el.focus();
    el.setSelectionRange(posicion, posicion);
  }, [texto]);

  // La caja crece con lo escrito, hasta cinco líneas.
  useEffect(() => {
    const el = caja.current;
    if (el === null) return;
    el.style.height = 'auto';
    el.style.height = `${String(Math.min(el.scrollHeight, 140))}px`;
  }, [texto]);

  // El reloj de la grabación.
  useEffect(() => {
    if (grabando === null) return undefined;
    const reloj = window.setInterval(() => {
      setSegundos(Math.floor((performance.now() - grabando.desde) / 1000));
    }, 250);
    return () => {
      window.clearInterval(reloj);
    };
  }, [grabando]);

  const otros = personas.filter((p) => p.id !== yo?.personaId);
  const sugerencias =
    nombrando === null
      ? []
      : otros
          .filter((p) =>
            p.nombre
              .toLocaleLowerCase('es-ES')
              .normalize('NFD')
              .replace(/\p{M}/gu, '')
              .startsWith(
                nombrando.toLocaleLowerCase('es-ES').normalize('NFD').replace(/\p{M}/gu, ''),
              ),
          )
          .slice(0, 5);

  function alEscribir(valor: string, cursor: number) {
    setTexto(valor);
    const antes = valor.slice(0, cursor);
    const nombre = /(?:^|\s)@([^\s@]{0,24})$/u.exec(antes);
    setNombrando(nombre === null ? null : (nombre[1] ?? ''));
  }

  function nombrar(persona: PersonaDelCanal) {
    const el = caja.current;
    const cursor = el?.selectionStart ?? texto.length;
    const antes = texto.slice(0, cursor).replace(/@([^\s@]{0,24})$/u, `@${persona.nombre} `);
    const nuevo = `${antes}${texto.slice(cursor)}`;
    cursorDespuesDeNombrar.current = antes.length;
    setTexto(nuevo);
    setNombrando(null);
  }

  async function elegirFichero(elegido: File) {
    setAviso(null);
    try {
      if (elegido.type.startsWith('image/') && elegido.type !== 'image/gif') {
        const foto = await reducirParaElChat(elegido);
        setAdjunto({
          tipo: 'foto',
          mime: foto.tipo,
          nombre: elegido.name,
          contenido: foto.contenido,
          bytes: Math.ceil((foto.contenido.length * 3) / 4),
        });
        return;
      }
      const mime =
        elegido.type !== ''
          ? elegido.type
          : elegido.name.toLowerCase().endsWith('.docx')
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : elegido.name.toLowerCase().endsWith('.xlsx')
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : '';
      if (LO_QUE_SE_ADJUNTA.documento[mime] === undefined) {
        setAviso('Se pueden mandar fotos, PDF, Word y Excel.');
        return;
      }
      if (elegido.size > TOPE_DEL_ADJUNTO.documento) {
        setAviso('Como mucho, 10 MB por documento.');
        return;
      }
      setAdjunto({
        tipo: 'documento',
        mime,
        nombre: elegido.name.slice(0, 120),
        contenido: await aBase64(elegido),
        bytes: elegido.size,
      });
    } catch {
      setAviso('No he podido preparar ese fichero. Prueba con otro.');
    }
  }

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: claveDeUnCanal(canalId) });
    await cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_CANALES });
  }

  async function mandar(conAdjunto: AdjuntoListo | null = adjunto) {
    const limpio = texto.trim();
    if ((limpio === '' && conAdjunto === null) || mandando) return;
    if (limpio.length > TOPE_DEL_MENSAJE) {
      setAviso(`Como mucho, ${String(TOPE_DEL_MENSAJE)} letras.`);
      return;
    }
    setError(null);
    setAviso(null);

    // Corregir se espera: cambia algo que ya está, y si no se puede hay que saberlo.
    if (corrigiendo !== null) {
      setMandando(true);
      const respuesta = await cliente.ejecutar('corregir_mensaje', {
        mensaje_id: corrigiendo.id,
        texto: limpio,
      });
      setMandando(false);
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      setTexto('');
      alTerminar();
      await refrescar();
      return;
    }

    // Lo nuevo sale ya en la conversación y se manda por detrás (`porMandar.ts`).
    const entrada = {
      canal_id: canalId,
      ...(limpio === '' ? {} : { texto: limpio }),
      ...(respondiendo === null ? {} : { responde_a: respondiendo.id }),
      ...(conAdjunto === null
        ? {}
        : {
            adjunto: {
              tipo: conAdjunto.tipo,
              mime: conAdjunto.mime,
              contenido: conAdjunto.contenido,
              ...(conAdjunto.tipo === 'documento' ? { nombre: conAdjunto.nombre } : {}),
              ...(conAdjunto.segundos === undefined ? {} : { segundos: conAdjunto.segundos }),
            },
          }),
    };
    mandarCuandoSePueda(
      {
        clave: crypto.randomUUID(),
        canalId,
        texto: limpio === '' ? null : limpio,
        adjunto: conAdjunto,
        respondeA:
          respondiendo === null
            ? null
            : {
                id: respondiendo.id,
                autor: respondiendo.autor,
                vista:
                  respondiendo.texto ??
                  (respondiendo.adjunto?.tipo === 'voz' ? 'Nota de voz' : 'Fichero'),
              },
        en: new Date(Date.now()).toISOString(),
        estado: 'mandando',
        error: null,
        mensajeId: null,
      },
      (clave) =>
        cliente.ejecutar<{ mensajeId: string }>('escribir_en_el_chat', entrada, {
          claveDeIdempotencia: clave,
        }),
      refrescar,
    );
    setTexto('');
    setAdjunto(null);
    setNombrando(null);
    alTerminar();
  }

  async function empezarVoz() {
    setAviso(null);
    try {
      const grabacion = await empezarAGrabar(() => {
        void terminarVoz();
      });
      setSegundos(0);
      setGrabando({ grabacion, desde: performance.now() });
    } catch {
      setAviso(
        'No se puede usar el micrófono. Si dijiste que no, se cambia en los ajustes del navegador.',
      );
    }
  }

  async function terminarVoz() {
    const actual = grabando;
    setGrabando(null);
    if (actual === null) return;
    const nota = await actual.grabacion.terminar();
    if (nota === null) {
      setAviso('Mantén un poco más: la nota ha quedado vacía.');
      return;
    }
    URL.revokeObjectURL(nota.direccion);
    await mandar({
      tipo: 'voz',
      mime: nota.mime,
      nombre: 'Nota de voz',
      contenido: nota.contenido,
      bytes: Math.ceil((nota.contenido.length * 3) / 4),
      segundos: nota.segundos,
    });
  }

  const hayAlgo = texto.trim() !== '' || adjunto !== null;
  const conMicrofono = !hayAlgo && corrigiendo === null && sabeGrabar();

  return (
    <div className="border-t border-borde bg-superficie px-e2 pb-[max(var(--spacing-e2),env(safe-area-inset-bottom))] pt-e2 max-lg:[[data-teclado]_&]:pb-e2 lg:pb-e3">
      {error !== null && (
        <div className="pb-e2">
          <ErrorEnCristiano error={error} />
        </div>
      )}
      {aviso !== null && <p className="px-e2 pb-e2 text-secundario text-mal">{aviso}</p>}

      {(respondiendo !== null || corrigiendo !== null) && (
        <div className="mb-e2 flex items-center gap-e2 rounded-medio border-l-4 border-naranja bg-fondo px-e3 py-e1">
          <span className="min-w-0 flex-1">
            <span className="block text-etiqueta font-semibold">
              {corrigiendo !== null
                ? 'Corrigiendo tu mensaje'
                : `Respondiendo a ${respondiendo?.autor ?? ''}`}
            </span>
            {respondiendo !== null && (
              <span className="block truncate text-etiqueta text-texto-suave">
                {respondiendo.texto ??
                  (respondiendo.adjunto?.tipo === 'voz' ? 'Nota de voz' : 'Fichero')}
              </span>
            )}
          </span>
          <button
            type="button"
            aria-label={corrigiendo !== null ? 'Dejar de corregir' : 'Quitar la respuesta'}
            onClick={() => {
              if (corrigiendo !== null) {
                setTexto('');
                alDejarDeCorregir();
              } else {
                alQuitarRespuesta();
              }
            }}
            className="grid size-toque place-items-center rounded-medio hover:bg-superficie"
          >
            <IconoCerrar size={18} />
          </button>
        </div>
      )}

      {adjunto !== null && (
        <div className="mb-e2 flex items-center gap-e2 rounded-medio border border-borde bg-fondo px-e3 py-e1">
          {adjunto.tipo === 'foto' ? (
            <img
              src={`data:${adjunto.mime};base64,${adjunto.contenido}`}
              alt=""
              className="size-12 rounded-chico object-cover"
            />
          ) : (
            <span className="text-texto-suave">
              <IconoDocumento size={20} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-secundario font-medium">{adjunto.nombre}</span>
            <span className="block text-etiqueta text-texto-suave">
              {pesoEnLetra(adjunto.bytes)}
            </span>
          </span>
          <button
            type="button"
            aria-label="Quitar el fichero"
            onClick={() => {
              setAdjunto(null);
            }}
            className="grid size-toque place-items-center rounded-medio hover:bg-superficie"
          >
            <IconoCerrar size={18} />
          </button>
        </div>
      )}

      {sugerencias.length > 0 && (
        <ul
          aria-label="A quién nombrar"
          className="mb-e2 flex flex-col rounded-medio border border-borde bg-superficie shadow-s2"
        >
          {sugerencias.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => {
                  nombrar(p);
                }}
                className="flex min-h-toque w-full items-center gap-e2 px-e3 text-left hover:bg-fondo"
              >
                <Avatar nombre={p.nombre} tamano={24} />
                <span className="text-cuerpo">{p.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {grabando !== null ? (
        <div className="flex items-center gap-e2">
          <button
            type="button"
            aria-label="Tirar la nota de voz"
            onClick={() => {
              grabando.grabacion.descartar();
              setGrabando(null);
            }}
            className="grid size-toque place-items-center rounded-redondo text-mal hover:bg-fondo"
          >
            <IconoBorrar size={20} />
          </button>
          <span className="flex flex-1 items-center gap-e2 text-cuerpo" aria-live="polite">
            <span aria-hidden className="size-3 animate-pulse rounded-redondo bg-mal" />
            Grabando · {duracionEnLetra(segundos)}
          </span>
          <button
            type="button"
            aria-label="Mandar la nota de voz"
            onClick={() => {
              void terminarVoz();
            }}
            className="grid size-toque place-items-center rounded-redondo bg-naranja text-sobre-naranja"
          >
            <IconoEnviar size={20} />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-e1">
          {corrigiendo === null && (
            <>
              <button
                type="button"
                aria-label="Adjuntar una foto o un documento"
                onClick={() => fichero.current?.click()}
                className="grid size-toque shrink-0 place-items-center rounded-redondo text-texto-suave hover:bg-fondo"
              >
                <IconoAdjuntar size={20} />
              </button>
              <input
                ref={fichero}
                type="file"
                accept={SE_ADJUNTA}
                className="hidden"
                onChange={(e) => {
                  const elegido = e.currentTarget.files?.[0];
                  e.currentTarget.value = '';
                  if (elegido !== undefined) void elegirFichero(elegido);
                }}
              />
            </>
          )}
          <label className="min-w-0 flex-1">
            <span className="sr-only">Escribe un mensaje</span>
            <textarea
              ref={caja}
              rows={1}
              value={texto}
              placeholder={adjunto !== null ? 'Añade un texto, si quieres' : 'Escribe un mensaje'}
              maxLength={TOPE_DEL_MENSAJE}
              onChange={(e) => {
                alEscribir(e.currentTarget.value, e.currentTarget.selectionStart);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  esEscritorio() &&
                  sugerencias.length === 0
                ) {
                  e.preventDefault();
                  void mandar();
                }
                if (e.key === 'Escape' && nombrando !== null) setNombrando(null);
              }}
              className={clases(
                'block max-h-[140px] min-h-toque w-full resize-none rounded-grande border border-borde-fuerte bg-superficie px-e3 py-[10px] text-cuerpo text-texto placeholder:text-texto-tenue',
              )}
            />
          </label>
          {conMicrofono ? (
            <button
              type="button"
              aria-label="Grabar una nota de voz"
              onClick={() => {
                void empezarVoz();
              }}
              className="grid size-toque shrink-0 place-items-center rounded-redondo bg-naranja text-sobre-naranja"
            >
              <IconoMicrofono size={20} />
            </button>
          ) : (
            <button
              type="button"
              aria-label={corrigiendo !== null ? 'Guardar la corrección' : 'Mandar'}
              disabled={!hayAlgo || mandando}
              // Que la caja no pierda el foco: si no, en el móvil el teclado se cierra
              // y se vuelve a abrir con cada mensaje, y la pantalla da un salto.
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                void mandar();
              }}
              className="grid size-toque shrink-0 place-items-center rounded-redondo bg-naranja text-sobre-naranja disabled:opacity-50"
            >
              <IconoEnviar size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
