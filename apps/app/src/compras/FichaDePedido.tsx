import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { centimos, enlaceDeCorreo, enlaceDeWhatsApp } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  PanelLateral,
  Selector,
} from '@estook/ui';
import { IconoBorrar, IconoChat, IconoDocumento, IconoReparto } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoDinero, comoSeLeeLaFecha, conUnidadDeUso } from '../inventario/contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';
import { Cuantos, Dato, EnlaceComoBoton } from './Comun.tsx';
import { copiarTexto, imprimirTexto } from './utilidades.ts';
import { ElegirProducto } from './ElegirProducto.tsx';
import { Recibir } from './Recibir.tsx';
import {
  CANALES,
  NOMBRE_DEL_CANAL,
  NOMBRE_DEL_ESTADO_DEL_PEDIDO,
  TONO_DEL_ESTADO_DEL_PEDIDO,
  comoSeLeeElInstante,
  type Canal,
  type LineaDelPedido,
  type UnPedido,
} from './contrato.ts';

/** Una línea mientras se cambia: lo justo para volver a guardarla entera. */
interface LineaEditable {
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly hayAhora: number;
  readonly cantidad: number;
  readonly precioCentimos: number | null;
  readonly nota: string | null;
}

interface Cambios {
  readonly lineas: readonly LineaEditable[];
  readonly notas: string;
  readonly llegaEl: string;
}

function editable(l: LineaDelPedido): LineaEditable {
  return {
    productoId: l.productoId,
    producto: l.producto,
    formato: l.formato,
    factor: l.factor,
    unidadDeUso: l.unidadDeUso,
    hayAhora: l.hayAhora,
    cantidad: l.cantidad,
    precioCentimos: l.precioCentimos ?? null,
    nota: l.nota,
  };
}

function desdeLosDatos(datos: UnPedido): Cambios {
  return {
    lineas: datos.lineas.map(editable),
    notas: datos.pedido.notas ?? '',
    llegaEl: datos.pedido.llegaEl ?? '',
  };
}

/**
 * La ficha de un pedido (M7) · `borrador → mandado → recibido`.
 *
 * Todo lo que se hace con un pedido está aquí, en el orden en que se hace:
 * cambiar lo que lleva, mandarlo, recibirlo. Y lo que no se puede hacer se dice
 * con su porqué, en vez de esconder el botón: un cocinero hace el borrador, y
 * **mandarlo lo hace quien puede comprometer el dinero del local** (0032).
 *
 * ── Estook no manda el pedido por su cuenta ──────────────────────────────────
 *
 * Abre WhatsApp o el correo con el pedido escrito —sin un precio—, o lo imprime,
 * y cuando la persona dice que lo ha mandado, **se apunta**. Es la única forma
 * honrada de hacerlo sin conectar con el WhatsApp de nadie: lo que dice
 * «mandado» es lo que alguien confirmó que mandó.
 */
export function FichaDePedido({
  pedidoId,
  alCerrar,
}: {
  readonly pedidoId: string;
  readonly alCerrar: () => void;
}) {
  const { cliente, permisos } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const albaran = usarAbiertoEnLaDireccion('albaran');
  const proveedor = usarAbiertoEnLaDireccion('proveedor');
  const [parametros, ponerParametros] = useSearchParams();
  const consulta = usarLectura<UnPedido>('un_pedido', { pedido_id: pedidoId });
  const editaPrecios = puedeEditar(permisos, 'dato.precio_de_compra');

  const [cambios, setCambios] = useState<Cambios | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);
  const [mandandoPor, setMandandoPor] = useState<Canal | null>(null);
  const [recibiendo, setRecibiendo] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  // `?recibir=1`: se viene de «Recibir» en Hoy, en el Panel o en la lista. Se abre
  // la recepción directamente, y se quita de la dirección para no reabrirla.
  const quiereRecibir = parametros.get('recibir') === '1';
  useEffect(() => {
    if (!quiereRecibir) return;
    setRecibiendo(true);
    const limpios = new URLSearchParams(parametros);
    limpios.delete('recibir');
    ponerParametros(limpios, { replace: true });
    // Una vez por dirección, no por pintado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiereRecibir]);

  const datos = consulta.data;
  const titulo =
    datos === undefined ? 'Pedido' : `Pedido ${datos.pedido.numero} · ${datos.proveedor.nombre}`;

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo={titulo}>
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir este pedido">
            Puede que ya no esté, o que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="el pedido" lineas={4} />
        )}
      </PanelLateral>
    );
  }

  const { pedido } = datos;
  // Con nombre propio para las funciones de abajo: dentro de ellas TypeScript ya
  // no recuerda que `datos` estaba leído.
  const pedidoLeido: UnPedido = datos;
  const abierto = pedido.estado === 'borrador' || pedido.estado === 'enviado';
  const sePuedeCambiar = abierto && datos.puedeTocar;
  const actual = cambios ?? desdeLosDatos(datos);
  const hayCambios = cambios !== null;
  const puedeCancelar =
    abierto &&
    ((pedido.estado === 'borrador' && datos.puedeTocar) ||
      (pedido.estado === 'enviado' && datos.puedeEnviar));

  function cambiar(que: (antes: Cambios) => Cambios) {
    setNoticia(null);
    setCambios((antes) => que(antes ?? desdeLosDatos(pedidoLeido)));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('cambiar_pedido', {
      pedido_id: pedido.id,
      lineas: actual.lineas
        .filter((l) => l.cantidad > 0)
        .map((l) => ({
          producto_id: l.productoId,
          cantidad: l.cantidad,
          nota: l.nota,
          ...(editaPrecios ? { precio_centimos: l.precioCentimos } : {}),
        })),
      llega_el: actual.llegaEl === '' ? null : actual.llegaEl,
      notas: actual.notas.trim() === '' ? null : actual.notas.trim(),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    setCambios(null);
    setNoticia(
      pedido.estado === 'enviado'
        ? 'Guardado. El pedido ya estaba mandado: díselo al proveedor.'
        : 'Guardado.',
    );
  }

  const lineasQueCuentan = actual.lineas.filter((l) => l.cantidad > 0);

  return (
    <PanelLateral abierta alCerrar={alCerrar} titulo={titulo}>
      <div className="flex flex-col gap-e4 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {noticia !== null && (
          <Aviso
            tono="bien"
            titulo={noticia}
            alCerrar={() => {
              setNoticia(null);
            }}
          />
        )}

        {/* ── Cómo está ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-e2">
          <div className="flex flex-wrap items-center gap-e2">
            <Etiqueta tono={TONO_DEL_ESTADO_DEL_PEDIDO[pedido.estado]}>
              {NOMBRE_DEL_ESTADO_DEL_PEDIDO[pedido.estado]}
            </Etiqueta>
            {pedido.origen === 'sugerencia' && <Etiqueta tono="info">Sugerido por Estook</Etiqueta>}
          </div>

          <dl className="flex flex-col">
            <Dato que="Proveedor">
              <button
                type="button"
                className="underline decoration-borde-fuerte underline-offset-2 hover:decoration-texto"
                onClick={() => {
                  proveedor.abrir(datos.proveedor.id);
                }}
              >
                {datos.proveedor.nombre}
              </button>
            </Dato>
            {abierto && (
              <Dato que="Llega">
                {pedido.llegaCuando ?? 'Sin fecha'}
                {pedido.llegaEl !== null && (
                  <span className="font-normal text-texto-suave">
                    {' '}
                    · {comoSeLeeLaFecha(pedido.llegaEl)}
                  </span>
                )}
              </Dato>
            )}
            {datos.proveedor.comoSeLePide !== null && abierto && (
              <Dato que="Cómo se le pide">{datos.proveedor.comoSeLePide}</Dato>
            )}
            <Dato que="Lo hizo">
              {pedido.quienLoHizo ?? 'Alguien que ya no está'}
              <span className="font-normal text-texto-suave">
                {' '}
                · {comoSeLeeElInstante(pedido.creadoEn)}
              </span>
            </Dato>
            {pedido.enviadoEn !== null && (
              <Dato que="Mandado">
                {pedido.enviadoPorCanal === null
                  ? ''
                  : `${NOMBRE_DEL_CANAL[pedido.enviadoPorCanal]} · `}
                {comoSeLeeElInstante(pedido.enviadoEn)}
                {pedido.quienLoEnvio === null ? '' : ` · ${pedido.quienLoEnvio}`}
              </Dato>
            )}
            {pedido.recibidoEn !== null && (
              <Dato que="Recibido">
                {comoSeLeeElInstante(pedido.recibidoEn)}
                {pedido.quienLoRecibio === null ? '' : ` · ${pedido.quienLoRecibio}`}
              </Dato>
            )}
          </dl>

          {pedido.estado === 'cancelado' && (
            <Aviso tono="info" titulo="Cancelado">
              {pedido.motivoDeCancelacion ?? 'Sin motivo escrito.'}
              {pedido.canceladoEn === null ? '' : ` · ${comoSeLeeElInstante(pedido.canceladoEn)}`}
            </Aviso>
          )}
        </section>

        {/* ── Recibir: lo primero cuando está mandado ───────────────────── */}
        {pedido.estado === 'enviado' && datos.puedeTocar && (
          <Boton
            tono="principal"
            tamano="l"
            ancho
            icono={<IconoReparto size={20} />}
            onClick={() => {
              setRecibiendo(true);
            }}
          >
            Recibir lo que ha llegado
          </Boton>
        )}

        {/* ── Lo que lleva ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-e2">
          <h3 className="text-seccion font-semibold">
            Lo que lleva{lineasQueCuentan.length > 0 ? ` · ${lineasQueCuentan.length}` : ''}
          </h3>

          {actual.lineas.length === 0 ? (
            <p className="text-secundario text-texto-suave">
              Todavía no lleva nada. {sePuedeCambiar ? 'Busca abajo lo que quieres pedir.' : ''}
            </p>
          ) : (
            <ul className="flex flex-col rounded-medio border border-borde">
              {actual.lineas.map((l) => (
                <li
                  key={l.productoId}
                  className="flex flex-col gap-e2 border-b border-borde p-e3 last:border-0"
                >
                  <div className="flex items-start justify-between gap-e3">
                    <span className="min-w-0">
                      <span className="block text-cuerpo font-medium">{l.producto}</span>
                      <span className="block text-secundario text-texto-suave">
                        Hay {conUnidadDeUso(l.hayAhora, l.unidadDeUso)}
                        {l.nota === null ? '' : ` · ${l.nota}`}
                      </span>
                    </span>
                    {!sePuedeCambiar && (
                      <span className="shrink-0 text-cuerpo font-semibold">
                        {l.cantidad} × {l.formato ?? l.unidadDeUso}
                      </span>
                    )}
                    {sePuedeCambiar && (
                      <button
                        type="button"
                        aria-label={`Quitar ${l.producto} del pedido`}
                        onClick={() => {
                          cambiar((antes) => ({
                            ...antes,
                            lineas: antes.lineas.filter((x) => x.productoId !== l.productoId),
                          }));
                        }}
                        className="grid size-toque shrink-0 place-items-center rounded-medio text-texto-suave hover:bg-fondo hover:text-mal"
                      >
                        <IconoBorrar size={18} />
                      </button>
                    )}
                  </div>

                  {sePuedeCambiar && (
                    <div className="flex flex-wrap items-end gap-e3">
                      <Cuantos
                        etiqueta={`Cuántos de ${l.producto}`}
                        valor={l.cantidad}
                        detras={l.formato ?? l.unidadDeUso}
                        alCambiar={(valor) => {
                          cambiar((antes) => ({
                            ...antes,
                            lineas: antes.lineas.map((x) =>
                              x.productoId === l.productoId ? { ...x, cantidad: valor } : x,
                            ),
                          }));
                        }}
                      />
                      {editaPrecios && (
                        <div className="w-[9.5rem]">
                          <CampoMoneda
                            etiqueta={`Precio de cada ${(l.formato ?? l.unidadDeUso).toLowerCase()}`}
                            valor={l.precioCentimos === null ? null : centimos(l.precioCentimos)}
                            alCambiar={(valor) => {
                              cambiar((antes) => ({
                                ...antes,
                                lineas: antes.lineas.map((x) =>
                                  x.productoId === l.productoId
                                    ? { ...x, precioCentimos: valor }
                                    : x,
                                ),
                              }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!editaPrecios && datos.puedeVerPrecios && l.precioCentimos !== null && (
                    <span className="text-secundario text-texto-suave tabular-nums">
                      {comoDinero(l.precioCentimos)} cada uno
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {sePuedeCambiar && (
            <ElegirProducto
              etiqueta="Añadir algo al pedido"
              yaEstan={new Set(actual.lineas.map((l) => l.productoId))}
              primeroDe={datos.proveedor.id}
              alElegir={(producto) => {
                cambiar((antes) => ({
                  ...antes,
                  lineas: [
                    ...antes.lineas,
                    {
                      productoId: producto.id,
                      producto: producto.nombre,
                      formato: producto.formato,
                      factor: producto.factor,
                      unidadDeUso: producto.unidadDeUso,
                      hayAhora: producto.cantidad,
                      cantidad: 1,
                      precioCentimos: null,
                      nota: null,
                    },
                  ],
                }));
              }}
            />
          )}

          {datos.puedeVerPrecios && !hayCambios && datos.totalCentimos !== undefined && (
            <p className="text-cuerpo">
              Serían unos{' '}
              <strong className="tabular-nums">{comoDinero(datos.totalCentimos)}</strong> sin
              impuestos
              {(datos.sinPrecio ?? 0) > 0
                ? `, sin contar ${datos.sinPrecio === 1 ? 'un producto sin precio' : `${datos.sinPrecio ?? 0} productos sin precio`}`
                : ''}
              .
            </p>
          )}
          {datos.minimo !== undefined && datos.minimo !== null && !hayCambios && abierto && (
            <Aviso tono={datos.minimo.llega ? 'bien' : 'atencion'} titulo="El pedido mínimo">
              {datos.minimo.frase}
            </Aviso>
          )}
        </section>

        {/* ── Cuándo, y lo que se le dice ─────────────────────────────────── */}
        {sePuedeCambiar ? (
          <section className="flex flex-col gap-e3">
            <Campo
              etiqueta="Tiene que llegar el"
              tipo="fecha"
              ayuda={
                datos.proximoReparto === null
                  ? 'Sin días de reparto en su ficha: pon el día que te diga.'
                  : `Su próximo reparto es ${datos.proximoReparto.llegaCuando}.`
              }
              value={actual.llegaEl}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                cambiar((antes) => ({ ...antes, llegaEl: valor }));
              }}
            />
            <Campo
              etiqueta="Lo que quieras decirle"
              ayuda="Sale al final del pedido: «que el pescado venga limpio», «dejadlo en la puerta de atrás»."
              value={actual.notas}
              onChange={(e) => {
                const valor = e.currentTarget.value;
                cambiar((antes) => ({ ...antes, notas: valor }));
              }}
            />
          </section>
        ) : (
          pedido.notas !== null && (
            <p className="text-secundario">
              <span className="text-texto-suave">Se le dijo: </span>
              {pedido.notas}
            </p>
          )
        )}

        {hayCambios && (
          <div className="sticky bottom-0 -mx-e4 border-t border-borde bg-superficie px-e4 py-e3">
            <Botones>
              <Boton
                tono="texto"
                onClick={() => {
                  setCambios(null);
                }}
              >
                Deshacer los cambios
              </Boton>
              <Boton
                tono="principal"
                cargando={guardando}
                onClick={() => {
                  void guardar();
                }}
              >
                Guardar los cambios
              </Boton>
            </Botones>
          </div>
        )}

        {/* ── Mandarlo ───────────────────────────────────────────────────── */}
        {abierto && !hayCambios && (
          <Mandar
            datos={datos}
            mandandoPor={mandandoPor}
            alEmpezarAMandar={(canal) => {
              setMandandoPor(canal);
            }}
            alDejarDeMandar={() => {
              setMandandoPor(null);
            }}
            alMandado={(frase) => {
              setMandandoPor(null);
              setNoticia(frase);
            }}
            alFallar={setError}
          />
        )}

        {pedido.estado === 'borrador' && datos.puedeTocar && (
          <div>
            <Boton
              tono="texto"
              onClick={() => {
                setRecibiendo(true);
              }}
            >
              Ya ha llegado: se pidió por teléfono
            </Boton>
          </div>
        )}

        {/* ── Lo que llegó ─────────────────────────────────────────────── */}
        {datos.albaranes.length > 0 && (
          <section className="flex flex-col gap-e2">
            <h3 className="text-seccion font-semibold">Lo que llegó</h3>
            <ul className="flex flex-col rounded-medio border border-borde">
              {datos.albaranes.map((a) => (
                <li key={a.id} className="border-b border-borde last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      albaran.abrir(a.id);
                    }}
                    className="flex w-full min-h-toque items-center gap-e3 px-e3 text-left hover:bg-fondo"
                  >
                    <span className="min-w-0 flex-1 text-cuerpo">
                      Albarán {a.numero ?? 'sin número'}
                      <span className="text-texto-suave"> · {comoSeLeeLaFecha(a.fecha)}</span>
                    </span>
                    {a.conIncidencias && <Etiqueta tono="atencion">con incidencias</Etiqueta>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {puedeCancelar && !hayCambios && (
          <div className="border-t border-borde pt-e3">
            <Boton
              tono="peligro"
              onClick={() => {
                setCancelando(true);
              }}
            >
              Cancelar el pedido
            </Boton>
          </div>
        )}
      </div>

      {recibiendo && (
        <Recibir
          pedido={datos}
          proveedor={null}
          alCerrar={() => {
            setRecibiendo(false);
          }}
        />
      )}

      {cancelando && (
        <Cancelar
          datos={datos}
          alCerrar={() => {
            setCancelando(false);
          }}
          alFallar={setError}
        />
      )}
    </PanelLateral>
  );
}

/**
 * Mandar el pedido: por donde se le pide a ese proveedor, y apuntar que se hizo.
 *
 * El primer botón es **el canal de su ficha**: si a Makro se le pide por correo,
 * el correo va delante. Cualquiera de los botones abre la confirmación —«¿ya se
 * lo has mandado?»—, porque abrir WhatsApp no es mandar: la persona puede
 * cerrarlo sin enviar, y apuntar «mandado» en ese momento sería mentir.
 */
function Mandar({
  datos,
  mandandoPor,
  alEmpezarAMandar,
  alDejarDeMandar,
  alMandado,
  alFallar,
}: {
  readonly datos: UnPedido;
  readonly mandandoPor: Canal | null;
  readonly alEmpezarAMandar: (canal: Canal) => void;
  readonly alDejarDeMandar: () => void;
  readonly alMandado: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const [canal, setCanal] = useState<Canal>(mandandoPor ?? 'whatsapp');
  const [llega, setLlega] = useState(datos.pedido.llegaEl ?? datos.proximoReparto?.llega ?? '');
  const [apuntando, setApuntando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [volverAMandar, setVolverAMandar] = useState(false);

  const { pedido, proveedor } = datos;
  const yaMandado = pedido.estado === 'enviado';
  const vacio = datos.lineas.length === 0;

  function empezar(por: Canal) {
    setCanal(por);
    alEmpezarAMandar(por);
  }

  async function apuntar() {
    setApuntando(true);
    const respuesta = await cliente.ejecutar('enviar_pedido', {
      pedido_id: pedido.id,
      canal,
      ...(llega === '' ? {} : { llega_el: llega }),
    });
    setApuntando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }
    await refrescar();
    alMandado(
      `Apuntado: mandado ${NOMBRE_DEL_CANAL[canal].toLowerCase()}. Sale en el Calendario el día que llega.`,
    );
  }

  if (!datos.puedeEnviar) {
    return pedido.estado === 'borrador' ? (
      <Aviso tono="info" titulo="Queda en borrador">
        Lo manda quien puede mandar pedidos —el jefe de cocina, quien lleva el local—: le sale en
        Compras como borrador por mandar. Si corre prisa, díselo.
      </Aviso>
    ) : null;
  }

  if (vacio) {
    return (
      <p className="text-secundario text-texto-suave">
        Añade lo que quieres pedir y guárdalo: un pedido sin nada dentro no se manda.
      </p>
    );
  }

  // Ya mandado: volver a mandarlo es una opción, no lo primero.
  if (yaMandado && !volverAMandar && mandandoPor === null) {
    return (
      <div>
        <Boton
          tono="texto"
          onClick={() => {
            setVolverAMandar(true);
          }}
        >
          Volver a mandárselo
        </Boton>
      </div>
    );
  }

  const whatsapp = proveedor.whatsapp;
  const correo = proveedor.correo;
  const primero: Canal =
    proveedor.comoSePide ??
    (whatsapp !== null ? 'whatsapp' : correo !== null ? 'correo' : 'telefono');

  const botonWhatsApp =
    whatsapp === null ? null : (
      <EnlaceComoBoton
        key="whatsapp"
        tono={primero === 'whatsapp' ? 'principal' : 'secundario'}
        icono={<IconoChat size={18} />}
        href={enlaceDeWhatsApp(whatsapp, datos.texto)}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          empezar('whatsapp');
        }}
      >
        Por WhatsApp
      </EnlaceComoBoton>
    );

  const botonCorreo =
    correo === null ? null : (
      <EnlaceComoBoton
        key="correo"
        tono={primero === 'correo' ? 'principal' : 'secundario'}
        icono={<IconoDocumento size={18} />}
        href={enlaceDeCorreo(correo, datos.asunto, datos.texto)}
        onClick={() => {
          empezar('correo');
        }}
      >
        Por correo
      </EnlaceComoBoton>
    );

  return (
    <section className="flex flex-col gap-e3 rounded-medio border border-borde p-e3">
      <h3 className="text-seccion font-semibold">
        {yaMandado ? 'Volver a mandárselo' : 'Mandárselo'}
      </h3>

      <pre className="whitespace-pre-wrap rounded-medio bg-fondo p-e3 font-sans text-secundario">
        {datos.texto}
      </pre>
      <p className="text-etiqueta text-texto-tenue">
        Sin un precio: es lo que va a leer el proveedor.
      </p>

      <div className="flex flex-wrap gap-e2">
        {primero === 'correo' ? [botonCorreo, botonWhatsApp] : [botonWhatsApp, botonCorreo]}
        <Boton
          tono="secundario"
          onClick={() => {
            void copiarTexto(datos.texto).then((bien) => {
              setAviso(
                bien
                  ? 'Copiado. Pégalo donde se lo mandes.'
                  : 'Este navegador no deja copiar: selecciona el texto de arriba.',
              );
              empezar(primero === 'correo' || primero === 'whatsapp' ? primero : 'web');
            });
          }}
        >
          Copiar el texto
        </Boton>
        <Boton
          tono="secundario"
          onClick={() => {
            const bien = imprimirTexto(datos.asunto, datos.texto);
            if (!bien)
              setAviso(
                'El navegador no ha dejado abrir la hoja para imprimir. Prueba a copiar el texto.',
              );
            empezar('impreso');
          }}
        >
          Imprimir
        </Boton>
        <Boton
          tono="texto"
          onClick={() => {
            empezar(primero === 'comercial' ? 'comercial' : 'telefono');
          }}
        >
          Se lo he dicho de otra forma
        </Boton>
      </div>

      {whatsapp === null && correo === null && (
        <p className="text-secundario text-texto-suave">
          Su ficha no tiene WhatsApp ni correo. Con ellos puestos, el pedido sale escrito en un
          toque.
        </p>
      )}

      {aviso !== null && <p className="text-secundario text-texto-suave">{aviso}</p>}

      {mandandoPor !== null && (
        <div
          className="flex flex-col gap-e3 rounded-medio bg-naranja-suave p-e3"
          aria-live="polite"
        >
          <p className="text-cuerpo font-medium">
            ¿Ya se lo has mandado? Dilo aquí y queda apuntado.
          </p>
          <div className="grid gap-e3 sm:grid-cols-2">
            <Selector
              etiqueta="Por dónde"
              opciones={CANALES.map((c) => ({ valor: c, texto: NOMBRE_DEL_CANAL[c] }))}
              value={canal}
              onChange={(e) => {
                setCanal(e.currentTarget.value as Canal);
              }}
            />
            <Campo
              etiqueta="Tiene que llegar el"
              tipo="fecha"
              value={llega}
              onChange={(e) => {
                setLlega(e.currentTarget.value);
              }}
            />
          </div>
          <Botones>
            <Boton tono="texto" onClick={alDejarDeMandar}>
              Todavía no
            </Boton>
            <Boton
              tono="principal"
              cargando={apuntando}
              textoCargando="Apuntando"
              onClick={() => {
                void apuntar();
              }}
            >
              Sí, ya está mandado
            </Boton>
          </Botones>
        </div>
      )}
    </section>
  );
}

/** Cancelar, con su motivo. Nada se borra: queda cancelado, con quién y por qué. */
function Cancelar({
  datos,
  alCerrar,
  alFallar,
}: {
  readonly datos: UnPedido;
  readonly alCerrar: () => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const [motivo, setMotivo] = useState('');
  const [cancelando, setCancelando] = useState(false);

  async function cancelar() {
    setCancelando(true);
    const respuesta = await cliente.ejecutar('cancelar_pedido', {
      pedido_id: datos.pedido.id,
      motivo: motivo.trim(),
    });
    setCancelando(false);
    if (!respuesta.ok) {
      alFallar(respuesta.error);
      alCerrar();
      return;
    }
    await refrescar();
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Cancelar el pedido ${datos.pedido.numero}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            No cancelar
          </Boton>
          <Boton
            tono="peligro"
            disabled={motivo.trim() === ''}
            cargando={cancelando}
            textoCargando="Cancelando"
            onClick={() => {
              void cancelar();
            }}
          >
            Cancelar el pedido
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {datos.pedido.estado === 'enviado' && (
          <Aviso tono="atencion" titulo="Ya está mandado">
            {datos.proveedor.nombre} puede estar preparándolo. Cancélalo aquí{' '}
            <strong>y díselo</strong>: Estook no se lo comunica.
          </Aviso>
        )}
        <Campo
          etiqueta="¿Por qué?"
          obligatorio
          autoFocus
          ayuda="«Lo trae otro», «nos hemos equivocado de proveedor». Queda apuntado con tu nombre."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
