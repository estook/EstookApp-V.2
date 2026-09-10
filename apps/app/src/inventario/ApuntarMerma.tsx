import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MOTIVOS_DE_MERMA,
  NOMBRE_DEL_MOTIVO_DE_MERMA,
  NOMBRE_DE_LA_PARTIDA,
  QUE_ES_CADA_MOTIVO,
  partidaDe,
  type MotivoDeMerma,
} from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  clases,
} from '@estook/ui';
import { IconoBuscar, IconoCamara } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { conUnidadDeUso, type ProductoParaMerma, type ProductosParaMerma } from './contrato.ts';

/**
 * Apuntar una merma · la hoja que se abre en mitad de un servicio (M6½).
 *
 * ── Los tres toques ─────────────────────────────────────────────────────────
 *
 * Qué producto, cuánto, y por qué. Nada más, y en ese orden: es lo que alguien
 * puede contestar con una mano ocupada y el pase lleno.
 *
 * El «por qué» son **botones grandes de una lista cerrada** y no un desplegable ni
 * un campo de texto, y esa es la decisión de esta pantalla. Un texto libre no se
 * puede sumar —«¿cuánto se me ha ido en caducado este mes?» no se contesta con un
 * `like`— y un desplegable de ocho esconde siete. Con pastillas se ve de un
 * vistazo cuál es la de hoy.
 *
 * ── Y la cámara ─────────────────────────────────────────────────────────────
 *
 * El botón está, y está **apagado con su motivo**. Leer una foto y sacar de ahí el
 * producto y el peso es Fogón, que es M22 y todavía no habla; poner el botón
 * funcionando ahora significaría o inventarse la cifra o abrir un módulo entero
 * fuera de orden.
 *
 * Se deja el sitio hecho a propósito, y no vacío: saber que va a poder hacerse con
 * una foto cambia cómo se usa esto hoy, y un botón apagado que dice cuándo llega
 * es información. Lo que no se hace es que se pueda pulsar y no pase nada, que es
 * el fallo que este proyecto lleva persiguiendo desde M4.
 */
export function ApuntarMerma({
  abierta,
  alCerrar,
  productoDeEntrada = null,
  alApuntar,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  /** El producto ya elegido, cuando se abre desde su ficha. */
  readonly productoDeEntrada?: ProductoParaMerma | null;
  readonly alApuntar?: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();

  const [texto, setTexto] = useState('');
  const [elegido, setElegido] = useState<ProductoParaMerma | null>(productoDeEntrada);
  const [cuanto, setCuanto] = useState('');
  const [motivo, setMotivo] = useState<MotivoDeMerma | null>(null);
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const DESDE_CUANTAS_LETRAS = 2;
  const buscando = texto.trim().length >= DESDE_CUANTAS_LETRAS;

  // `productos_para_merma` y no `mis_productos`: esa pide Inventario, y quien
  // más mermas apunta —el camarero— no lo tiene.
  const lista = useQuery({
    queryKey: ['productos_para_merma', texto],
    enabled: abierta && elegido === null && buscando,
    queryFn: async (): Promise<ProductosParaMerma> => {
      const respuesta = await cliente.consultar<ProductosParaMerma>('productos_para_merma', {
        texto: texto.trim(),
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  function limpiar() {
    setTexto('');
    setElegido(productoDeEntrada);
    setCuanto('');
    setMotivo(null);
    setDetalle('');
    setError(null);
    setHecho(null);
  }

  function cerrar() {
    limpiar();
    alCerrar();
  }

  const cuantoNumero = Number(cuanto.replace(',', '.'));
  const cuantoVale = Number.isFinite(cuantoNumero) && cuantoNumero > 0;
  const hayDetalle = motivo !== 'otro' || detalle.trim() !== '';
  const listo = elegido !== null && cuantoVale && motivo !== null && hayDetalle && !guardando;

  async function guardar() {
    if (elegido === null || motivo === null) return;
    setError(null);
    setGuardando(true);

    const respuesta = await cliente.ejecutar<{ cantidad: number }>('apuntar_merma', {
      producto_id: elegido.id,
      cuanto: cuantoNumero,
      motivo,
      ...(detalle.trim() === '' ? {} : { detalle: detalle.trim() }),
    });

    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    setHecho(
      `${conUnidadDeUso(cuantoNumero, elegido.unidadDeUso)} de ${elegido.nombre}, apuntado.`,
    );

    // Lo que cambia con una merma: lo que hay en cámara, la merma del día, el
    // libro y lo que hay que atender. Se invalida aquí y no en cada pantalla.
    await cache.invalidateQueries({ queryKey: ['merma_de_hoy'] });
    await cache.invalidateQueries({ queryKey: ['mis_mermas'] });
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
    await cache.invalidateQueries({ queryKey: ['mis_movimientos'] });
    await cache.invalidateQueries({ queryKey: ['inventario_hoy'] });
    await cache.invalidateQueries({ queryKey: ['un_producto', elegido.id] });
    alApuntar?.();

    // Se deja la hoja abierta con la confirmación y el producto puesto: en un
    // servicio, después de una merma viene otra, y cerrar y volver a abrir es un
    // paso de más.
    setCuanto('');
    setMotivo(null);
    setDetalle('');
  }

  return (
    <Hoja
      abierta={abierta}
      alCerrar={cerrar}
      titulo="Apuntar una merma"
      pie={
        <Botones>
          <Boton tono="texto" onClick={cerrar}>
            Cerrar
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
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        {hecho !== null && (
          <Aviso tono="bien" titulo="Apuntado" esNoticia>
            {hecho} Si se ha ido más cosa, sigue aquí mismo.
          </Aviso>
        )}

        {/* ── 1 · Qué ────────────────────────────────────────────────────── */}
        {elegido === null ? (
          <>
            <Campo
              etiqueta="Qué se ha ido"
              ayuda="Escribe el nombre. Vale con erratas y sin acentos."
              value={texto}
              delante={<IconoBuscar size={16} />}
              autoFocus
              onChange={(e) => {
                setTexto(e.currentTarget.value);
              }}
            />

            {/*
              La cámara, apagada y con su motivo. No es un olvido y no es un botón
              mudo: no se puede pulsar, y dice cuándo llega.
            */}
            <div className="flex items-start gap-e3 rounded-medio border border-borde bg-fondo p-e3">
              <span aria-hidden className="mt-[2px] shrink-0 text-texto-tenue">
                <IconoCamara size={20} />
              </span>
              <p className="text-secundario text-texto-suave">
                <strong className="text-texto">Con una foto, más adelante.</strong> Hacer la foto y
                que se rellene solo el producto y el peso lo hace Fogón, y llega con el módulo 22.
                Hasta entonces se apunta aquí, que son tres toques.
              </p>
            </div>

            {!buscando ? (
              <p className="text-secundario text-texto-suave">
                Con dos letras empiezo a buscar en tu género.
              </p>
            ) : lista.isPending ? (
              <Cargando que="tu género" />
            ) : (
              <ul className="flex flex-col gap-e1">
                {(lista.data?.productos ?? []).map((producto) => (
                  <li key={producto.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setElegido(producto);
                      }}
                      className="flex w-full min-h-toque items-center justify-between gap-e2 rounded-medio border border-borde px-e3 py-e2 text-left hover:bg-fondo"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-cuerpo font-medium">
                          {producto.nombre}
                        </span>
                        <span className="block text-secundario text-texto-suave">
                          Quedan {conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}
                        </span>
                      </span>
                      {producto.esEjemplo && <Etiqueta>ejemplo</Etiqueta>}
                    </button>
                  </li>
                ))}
                {(lista.data?.productos ?? []).length === 0 && (
                  <li className="text-secundario text-texto-suave">
                    Nada con eso. Prueba con menos letras.
                  </li>
                )}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-e2 rounded-medio bg-naranja-suave px-e3 py-e2">
              <span className="min-w-0">
                <span className="block text-cuerpo font-medium">{elegido.nombre}</span>
                <span className="block text-secundario text-texto-suave">
                  Quedan {conUnidadDeUso(elegido.cantidad, elegido.unidadDeUso)}
                </span>
              </span>
              {productoDeEntrada === null && (
                <Boton
                  tono="texto"
                  onClick={() => {
                    setElegido(null);
                    setTexto('');
                  }}
                >
                  Otro
                </Boton>
              )}
            </div>

            {/* ── 2 · Cuánto ──────────────────────────────────────────────── */}
            <Campo
              etiqueta="Cuánto"
              tipo="numero"
              autoFocus
              value={cuanto}
              detras={elegido.unidadDeUso}
              ayuda={`En ${elegido.unidadDeUso}, que es como lo mides tú.`}
              onChange={(e) => {
                setCuanto(e.currentTarget.value);
              }}
            />

            {/* ── 3 · Por qué ─────────────────────────────────────────────── */}
            <div>
              <p
                id="por-que-la-merma"
                className="text-etiqueta uppercase tracking-wide text-texto-suave"
              >
                Por qué
              </p>
              <div
                role="radiogroup"
                aria-labelledby="por-que-la-merma"
                className="mt-e2 grid gap-e2 sm:grid-cols-2"
              >
                {MOTIVOS_DE_MERMA.map((cual) => {
                  const puesto = cual === motivo;
                  return (
                    <button
                      key={cual}
                      type="button"
                      role="radio"
                      aria-checked={puesto}
                      onClick={() => {
                        setMotivo(cual);
                      }}
                      className={clases(
                        'flex min-h-toque flex-col items-start gap-e1 rounded-medio border px-e3 py-e2 text-left',
                        puesto
                          ? 'border-naranja bg-naranja-suave'
                          : 'border-borde-fuerte bg-superficie hover:bg-fondo',
                      )}
                    >
                      <span className="text-cuerpo font-medium">
                        {NOMBRE_DEL_MOTIVO_DE_MERMA[cual]}
                      </span>
                      <span className="text-etiqueta text-texto-suave">
                        {QUE_ES_CADA_MOTIVO[cual]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/*
                Y en qué partida cae, dicho **en el momento de elegir**. Es la mitad
                del Manifiesto 28: si la comida del personal no se separa, el food
                cost miente, y quien apunta tiene que ver que lo que acaba de elegir
                no cuenta como pérdida.
              */}
              {motivo !== null && (
                <p aria-live="polite" className="mt-e2 text-secundario text-texto-suave">
                  Cuenta como <strong>{NOMBRE_DE_LA_PARTIDA[partidaDe(motivo)]}</strong>.{' '}
                  {partidaDe(motivo) === 'perdida'
                    ? 'Sube el coste de la comida que vendes.'
                    : 'No sube el coste de la comida que vendes: va en su propia partida.'}
                </p>
              )}
            </div>

            {(motivo === 'otro' || detalle !== '') && (
              <Campo
                etiqueta="Qué ha pasado"
                obligatorio={motivo === 'otro'}
                value={detalle}
                ayuda="Una frase. Es lo que se lee dentro de seis meses."
                onChange={(e) => {
                  setDetalle(e.currentTarget.value);
                }}
              />
            )}

            {motivo !== 'otro' && detalle === '' && (
              <Boton
                tono="texto"
                onClick={() => {
                  setDetalle(' ');
                }}
              >
                Añadir una nota
              </Boton>
            )}
          </>
        )}
      </div>
    </Hoja>
  );
}
