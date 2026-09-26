import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LETRAS_PARA_BUSCAR } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Aviso, Boton, Campo, Cargando, Etiqueta, Tarjeta, clases } from '@estook/ui';
import { IconoBuscar, IconoUbicacion } from '@estook/iconos';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarQueEspere } from '../ganchos/usarQueEspere.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoSeLeeLaFecha } from '../almacen/contrato.ts';

/**
 * Tu local en Google (M7, entrega 5 · decisiones 0030 y 0040).
 *
 * «Ahora preguntas dónde está el local, pero eso se verá cuando se conecte con
 * Google. Y servirá para fichar y ubicar el restaurante.»
 *
 * Se escribe el nombre, salen los sitios de Google, se toca el tuyo y se guarda su
 * ficha: dirección, teléfono, web, horario, valoración y **su posición, que es el
 * centro del radio de fichaje**. Desde un ordenador o un TPV, marcar el local «desde
 * aquí» sitúa la manzana, no el local; la de Google no depende del aparato.
 *
 * ── Lo que cuesta, a la vista ────────────────────────────────────────────────
 *
 * Debajo va cuánto se ha gastado del tope este mes. No es un adorno: es lo que
 * Richi pidió cuidar, y quien busca tiene que saber que cada búsqueda cuenta.
 *
 * ── Y sin clave, apagado y dicho ─────────────────────────────────────────────
 *
 * Si el servidor no tiene la clave de Google, la tarjeta lo dice y no enseña un
 * buscador que no puede buscar (0022). Marcar el local desde el propio local, en la
 * tarjeta de abajo, sigue funcionando igual.
 */
interface MiLocalEnGoogle {
  readonly conectado: boolean;
  readonly ficha: {
    readonly id: string;
    readonly nombre: string | null;
    readonly direccion: string | null;
    readonly telefono: string | null;
    readonly web: string | null;
    readonly mapa: string | null;
    readonly valoracion: number | null;
    readonly resenas: number | null;
    readonly horario: readonly string[] | null;
    readonly leidoEn: string;
  } | null;
  readonly tienePosicion: boolean;
  readonly posicionDe: 'a_mano' | 'google' | null;
  readonly uso: { readonly busquedas: number; readonly fichas: number };
  readonly topes: { readonly busquedas: number; readonly fichas: number };
}

interface Sugerencia {
  readonly id: string;
  readonly nombre: string;
  readonly direccion: string;
}

/** Una sesión de búsqueda: agrupa las letras con la ficha elegida, y se cobra una vez. */
function sesionNueva(): string {
  return crypto.randomUUID();
}

export function TuLocalEnGoogle() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const consulta = usarLectura<MiLocalEnGoogle>('mi_local_en_google');
  const datos = consulta.data;

  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState('');
  const esperado = usarQueEspere(texto.trim(), 450);
  const [sugerencias, setSugerencias] = useState<readonly Sugerencia[]>([]);
  const [pidiendo, setPidiendo] = useState(false);
  const [elegida, setElegida] = useState<Sugerencia | null>(null);
  const [usarSuPosicion, setUsarSuPosicion] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [dicho, setDicho] = useState<string | null>(null);
  const sesion = useRef(sesionNueva());

  // Buscar cuando se deja de escribir, y solo con lo mínimo escrito. Si llega una
  // respuesta vieja después de una nueva, se tira.
  useEffect(() => {
    if (!buscando || esperado.length < LETRAS_PARA_BUSCAR) {
      setSugerencias([]);
      return;
    }
    let sigueValiendo = true;
    setPidiendo(true);
    void cliente
      .ejecutar<{ sugerencias: readonly Sugerencia[] }>('buscar_mi_local_en_google', {
        texto: esperado,
        sesion: sesion.current,
      })
      .then(async (respuesta) => {
        if (!sigueValiendo) return;
        setPidiendo(false);
        if (!respuesta.ok) {
          setError(respuesta.error);
          return;
        }
        setError(null);
        setSugerencias(respuesta.datos.sugerencias);
        await cache.invalidateQueries({ queryKey: ['mi_local_en_google'] });
      });
    return () => {
      sigueValiendo = false;
    };
  }, [buscando, esperado, cliente, cache]);

  const empezarABuscar = () => {
    sesion.current = sesionNueva();
    setTexto(datos?.ficha?.nombre ?? '');
    setSugerencias([]);
    setElegida(null);
    setError(null);
    setDicho(null);
    // La de a mano manda: si ya se marcó desde el local, se propone no tocarla.
    setUsarSuPosicion(datos?.posicionDe !== 'a_mano');
    setBuscando(true);
  };

  async function elegir(sugerencia: Sugerencia) {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ nombre: string | null; posicionPuesta: boolean }>(
      'elegir_mi_local_de_google',
      { id: sugerencia.id, sesion: sesion.current, usar_su_posicion: usarSuPosicion },
    );
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setBuscando(false);
    setElegida(null);
    setDicho(
      respuesta.datos.posicionPuesta
        ? 'Enlazado con Google, y los fichajes se miden desde su ubicación.'
        : 'Enlazado con Google. La ubicación para fichar sigue siendo la que tenías.',
    );
    await cache.invalidateQueries({ queryKey: ['mi_local_en_google'] });
    await cache.invalidateQueries({ queryKey: ['mi_fichaje'] });
  }

  async function actualizar() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ actualizada: boolean }>(
      'actualizar_mi_ficha_de_google',
      {},
    );
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setDicho(
      respuesta.datos.actualizada
        ? 'Ficha traída otra vez de Google.'
        : 'Ya se trajo en las últimas 24 horas: no se ha vuelto a pedir.',
    );
    await cache.invalidateQueries({ queryKey: ['mi_local_en_google'] });
  }

  if (consulta.isError) return null;

  return (
    <Tarjeta titulo="Tu local en Google">
      <span id="tu-local-en-google" />
      {datos === undefined ? (
        <Cargando que="tu local en Google" lineas={2} />
      ) : !datos.conectado ? (
        <div className="flex flex-col gap-e2">
          <p className="flex items-center gap-e2">
            <Etiqueta tono="neutro">Apagado</Etiqueta>
            <span className="text-cuerpo">Google todavía no está conectado.</span>
          </p>
          <p className="text-secundario text-texto-suave">
            Cuando lo esté, buscarás aquí tu local por su nombre y se guardarán su dirección, su
            horario, su valoración y su ubicación para fichar. Mientras, marca el local desde el
            propio local, en la tarjeta de abajo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-e3">
          {error !== null && (
            <Aviso tono="mal" titulo={error.quePasa}>
              {error.queSePuedeHacer}
            </Aviso>
          )}
          {dicho !== null && <Aviso tono="bien" titulo={dicho} />}

          {datos.ficha !== null && !buscando && (
            <div className="flex flex-col gap-e2">
              <div>
                <p className="text-seccion font-semibold">{datos.ficha.nombre ?? 'Sin nombre'}</p>
                {datos.ficha.direccion !== null && (
                  <p className="text-secundario text-texto-suave">{datos.ficha.direccion}</p>
                )}
              </div>
              <p className="flex flex-wrap items-center gap-e2 text-secundario">
                {datos.ficha.valoracion !== null && (
                  <Etiqueta tono="marca">
                    ★ {datos.ficha.valoracion.toLocaleString('es-ES')}
                    {datos.ficha.resenas === null ? '' : ` · ${datos.ficha.resenas} reseñas`}
                  </Etiqueta>
                )}
                {datos.ficha.telefono !== null && <span>{datos.ficha.telefono}</span>}
                {datos.ficha.web !== null && (
                  <a
                    href={datos.ficha.web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-texto underline"
                  >
                    Su web
                  </a>
                )}
                {datos.ficha.mapa !== null && (
                  <a
                    href={datos.ficha.mapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-texto underline"
                  >
                    Verlo en Google Maps
                  </a>
                )}
              </p>
              {datos.ficha.horario !== null && datos.ficha.horario.length > 0 && (
                <details className="text-secundario">
                  <summary className="min-h-toque cursor-pointer py-e1 font-medium">
                    Su horario en Google
                  </summary>
                  <ul className="mt-e1 flex flex-col gap-[2px] text-texto-suave">
                    {datos.ficha.horario.map((linea) => (
                      <li key={linea}>{linea}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="flex items-center gap-e1 text-secundario font-medium text-texto-suave">
                <IconoUbicacion size={14} />
                {datos.posicionDe === 'google'
                  ? 'Los fichajes se miden desde esta ubicación'
                  : datos.posicionDe === 'a_mano'
                    ? 'Los fichajes se miden desde la ubicación marcada a mano'
                    : 'Sin ubicación para fichar'}
                {` · leído el ${comoSeLeeLaFecha(datos.ficha.leidoEn.slice(0, 10))}`}
              </p>
              <div className="flex flex-wrap gap-e2">
                <Boton
                  tono="secundario"
                  cargando={guardando}
                  textoCargando="Pidiéndoselo a Google"
                  onClick={() => {
                    void actualizar();
                  }}
                >
                  Traerlo otra vez de Google
                </Boton>
                <Boton tono="texto" onClick={empezarABuscar}>
                  No es este: buscarlo
                </Boton>
              </div>
            </div>
          )}

          {datos.ficha === null && !buscando && (
            <div className="flex flex-col gap-e2">
              <p className="text-cuerpo">
                Búscalo por su nombre y se guardan su dirección, su horario, su valoración y su
                ubicación para fichar.
              </p>
              <div>
                <Boton tono="principal" icono={<IconoBuscar size={18} />} onClick={empezarABuscar}>
                  Buscar mi local en Google
                </Boton>
              </div>
            </div>
          )}

          {buscando && (
            <div className="flex flex-col gap-e3">
              <Campo
                etiqueta="Nombre del local y ciudad"
                placeholder="Bar Centro, Donostia"
                value={texto}
                autoFocus
                {...(texto.trim().length < LETRAS_PARA_BUSCAR
                  ? { ayuda: `Escribe al menos ${LETRAS_PARA_BUSCAR} letras.` }
                  : pidiendo
                    ? { ayuda: 'Buscando en Google…' }
                    : {})}
                onChange={(e) => {
                  setTexto(e.currentTarget.value);
                  setElegida(null);
                }}
              />

              {sugerencias.length > 0 && (
                <ul
                  role="listbox"
                  aria-label="Lo que ha encontrado Google"
                  className="flex flex-col gap-e1"
                >
                  {sugerencias.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={elegida?.id === s.id}
                        onClick={() => {
                          setElegida(s);
                        }}
                        className={clases(
                          'flex w-full min-h-toque flex-col items-start rounded-medio border px-e3 py-e2 text-left',
                          elegida?.id === s.id
                            ? 'border-naranja bg-naranja-suave'
                            : 'border-borde-fuerte bg-superficie hover:bg-fondo',
                        )}
                      >
                        <span className="text-cuerpo font-medium">{s.nombre}</span>
                        <span className="text-etiqueta text-texto-suave">{s.direccion}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {elegida !== null && (
                <label className="flex min-h-toque items-start gap-e2 text-cuerpo">
                  <input
                    type="checkbox"
                    className="mt-[3px] size-[18px] accent-naranja"
                    checked={usarSuPosicion}
                    onChange={(e) => {
                      setUsarSuPosicion(e.currentTarget.checked);
                    }}
                  />
                  <span>
                    Medir los fichajes desde su ubicación de Google
                    <span className="block text-secundario text-texto-suave">
                      {datos.posicionDe === 'a_mano'
                        ? 'Ya la marcaste desde el local, y esa suele ser más exacta: déjalo apagado salvo que te mudaras.'
                        : 'Si el local está dentro de un centro comercial, mejor márcalo desde dentro, abajo.'}
                    </span>
                  </span>
                </label>
              )}

              <div className="flex flex-wrap gap-e2">
                <Boton
                  tono="principal"
                  disabled={elegida === null}
                  cargando={guardando}
                  textoCargando="Guardando su ficha"
                  onClick={() => {
                    if (elegida !== null) void elegir(elegida);
                  }}
                >
                  Es este
                </Boton>
                <Boton
                  tono="texto"
                  onClick={() => {
                    setBuscando(false);
                  }}
                >
                  Cancelar
                </Boton>
              </div>
            </div>
          )}

          <p className="text-etiqueta text-texto-suave">
            Este mes: {datos.uso.fichas} de {datos.topes.fichas} fichas y {datos.uso.busquedas} de{' '}
            {datos.topes.busquedas} búsquedas en Google. Es el tope para que no se dispare lo que
            cuesta.
          </p>
        </div>
      )}
    </Tarjeta>
  );
}
