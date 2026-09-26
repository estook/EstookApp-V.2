import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { direccionDeLaCarta } from '@estook/dominio';
import { IconoAbrirFuera, IconoSubir } from '@estook/iconos';
import { puedeEditar } from '@estook/permisos';
import { Aviso, Boton, Botones, Cargando, ErrorEnCristiano, Tarjeta } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { NoSeHaPodidoLeer, paginasDe, type PaginaLista } from '../carta/paginasDeLaCarta.ts';

/**
 * Ajustes · Tu local · **Tu carta** (repaso del 25-sep · decisión 0049).
 *
 * «Poder subir una carta suya si tienen, o un diseño: así el PDF o el diseño pasa a
 * ser el que se muestra en la carta online.» (Richi) Hasta que haya platos en
 * Estook (M10), el QR de la mesa enseñaba el nombre y el horario; con esto enseña la
 * carta que el local ya tiene.
 *
 * Tres pasos y ninguno a ciegas: **elegir** el PDF o las fotos, **ver** cómo quedan
 * las páginas, y **publicar**. Hasta publicar, quien escanea el QR sigue viendo la
 * de antes entera.
 *
 * Que Estook lea los platos de la carta subida y proponga los cambios —«3 platos
 * nuevos, 2 precios distintos: ¿seguro?»— llega con los platos, en M10.
 */
interface LaCartaPublica {
  readonly paginas: readonly string[];
}

type Paso =
  | { readonly que: 'mirando' }
  | { readonly que: 'preparando' }
  | { readonly que: 'viendo'; readonly paginas: readonly PaginaLista[] }
  | { readonly que: 'subiendo'; readonly van: number; readonly de: number };

export function TuCartaSubida() {
  const { cliente, yo, permisos } = usarSesion();
  const cache = useQueryClient();
  const elegir = useRef<HTMLInputElement>(null);
  const [paso, setPaso] = useState<Paso>({ que: 'mirando' });
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noSeLee, setNoSeLee] = useState<string | null>(null);

  const local = yo?.local ?? null;
  const puedeCambiarla = puedeEditar(permisos, 'app.carta');
  const clave = ['la_carta', local?.direccionDeLaCarta ?? ''] as const;

  const publica = useQuery({
    queryKey: clave,
    enabled: local !== null,
    queryFn: async (): Promise<LaCartaPublica> => {
      const respuesta = await cliente.consultar<LaCartaPublica>('la_carta', {
        direccion: local?.direccionDeLaCarta ?? '',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (local === null) return null;
  const paginas = publica.data?.paginas ?? [];

  async function alElegir(ficheros: FileList | null) {
    if (ficheros === null || ficheros.length === 0) return;
    setError(null);
    setNoSeLee(null);
    setPaso({ que: 'preparando' });
    try {
      setPaso({ que: 'viendo', paginas: await paginasDe([...ficheros]) });
    } catch (fallo) {
      setNoSeLee(
        fallo instanceof NoSeHaPodidoLeer ? fallo.message : 'No se ha podido leer esa carta.',
      );
      setPaso({ que: 'mirando' });
    }
  }

  async function publicar(nuevas: readonly PaginaLista[]) {
    setError(null);
    const subida = Date.now();
    const claves: string[] = [];
    for (const [i, pagina] of nuevas.entries()) {
      setPaso({ que: 'subiendo', van: i + 1, de: nuevas.length });
      const respuesta = await cliente.ejecutar<{ clave: string }>('subir_pagina_de_la_carta', {
        subida,
        pagina: i + 1,
        tipo: pagina.tipo,
        contenido: pagina.contenido,
      });
      if (!respuesta.ok) {
        setError(respuesta.error);
        setPaso({ que: 'viendo', paginas: nuevas });
        return;
      }
      claves.push(respuesta.datos.clave);
    }
    const hecho = await cliente.ejecutar('publicar_la_carta', { paginas: claves });
    if (!hecho.ok) {
      setError(hecho.error);
      setPaso({ que: 'viendo', paginas: nuevas });
      return;
    }
    await cache.invalidateQueries({ queryKey: clave });
    setPaso({ que: 'mirando' });
  }

  async function quitar() {
    setError(null);
    const hecho = await cliente.ejecutar('quitar_la_carta', {});
    if (!hecho.ok) {
      setError(hecho.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: clave });
  }

  return (
    <Tarjeta
      titulo="Tu carta"
      origen={
        paginas.length > 0 ? 'La que ve quien escanea el QR' : 'PDF o fotos de la que ya tienes'
      }
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {noSeLee !== null && (
          <Aviso tono="mal" titulo="No he podido leer esa carta">
            {noSeLee}
          </Aviso>
        )}

        {paso.que === 'preparando' && <Cargando que="las páginas de tu carta" lineas={2} />}

        {paso.que === 'viendo' && (
          <>
            <p className="text-secundario text-texto-suave">
              Así la verá quien escanee el QR. Hasta que la publiques, sigue viendo la de antes.
            </p>
            <Paginas enlaces={paso.paginas.map((p) => p.vista)} />
            <Botones>
              <Boton
                tono="texto"
                onClick={() => {
                  setPaso({ que: 'mirando' });
                }}
              >
                Dejarlo
              </Boton>
              <Boton
                tono="principal"
                onClick={() => {
                  void publicar(paso.paginas);
                }}
              >
                {paso.paginas.length === 1
                  ? 'Publicar la carta'
                  : `Publicar las ${String(paso.paginas.length)} páginas`}
              </Boton>
            </Botones>
          </>
        )}

        {paso.que === 'subiendo' && (
          <p aria-live="polite" className="text-secundario font-medium">
            Subiendo la página {paso.van} de {paso.de}…
          </p>
        )}

        {paso.que === 'mirando' && (
          <>
            {publica.isPending ? (
              <Cargando que="tu carta" lineas={1} />
            ) : paginas.length > 0 ? (
              <Paginas enlaces={paginas} />
            ) : (
              <p className="text-secundario text-texto-suave">
                Sube el PDF o unas fotos de tu carta y el QR de las mesas la enseñará. Cuando tengas
                los platos en Estook, se leerán de aquí.
              </p>
            )}

            <div className="flex flex-wrap gap-e2">
              {puedeCambiarla && (
                <Boton
                  tono={paginas.length > 0 ? 'secundario' : 'principal'}
                  icono={<IconoSubir size={18} />}
                  onClick={() => {
                    elegir.current?.click();
                  }}
                >
                  {paginas.length > 0 ? 'Cambiar la carta' : 'Subir la carta'}
                </Boton>
              )}
              {paginas.length > 0 && (
                <a
                  href={direccionDeLaCarta(local.direccionDeLaCarta)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-toque items-center gap-e1 px-e3 text-secundario font-semibold text-texto-suave hover:text-texto"
                >
                  Verla como el cliente <IconoAbrirFuera size={14} />
                </a>
              )}
              {puedeCambiarla && paginas.length > 0 && (
                <Boton
                  tono="texto"
                  onClick={() => {
                    void quitar();
                  }}
                >
                  Quitarla
                </Boton>
              )}
            </div>
          </>
        )}

        <input
          ref={elegir}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          aria-label="Elegir el PDF o las fotos de tu carta"
          onChange={(e) => {
            void alElegir(e.currentTarget.files);
            e.currentTarget.value = '';
          }}
        />
      </div>
    </Tarjeta>
  );
}

/** Las páginas en fila: en el móvil se desliza de lado, sin llenar la pantalla. */
function Paginas({ enlaces }: { readonly enlaces: readonly string[] }) {
  return (
    <ol className="-mx-e1 flex gap-e2 overflow-x-auto px-e1 pb-e1">
      {enlaces.map((enlace, i) => (
        <li key={enlace} className="shrink-0">
          <img
            src={enlace}
            alt={`Página ${String(i + 1)} de la carta`}
            className="h-[180px] w-auto rounded-medio border border-borde bg-white object-contain"
          />
        </li>
      ))}
    </ol>
  );
}
