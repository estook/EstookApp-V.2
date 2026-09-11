import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  Selector,
  Tabla,
  Tarjeta,
} from '@estook/ui';
import { IconoAnadir, IconoReparto, IconoReloj } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoDinero } from '../inventario/contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';
import { Filtros } from './Comun.tsx';
import { Recibir } from './Recibir.tsx';
import {
  NOMBRE_DEL_CANAL,
  NOMBRE_DEL_ESTADO_DEL_PEDIDO,
  TONO_DEL_ESTADO_DEL_PEDIDO,
  cuantosProductos,
  type ComprasDeHoy,
  type MisPedidos,
  type MisProveedores,
  type PedidoEnLista,
  type SugerenciaDePedido,
} from './contrato.ts';

type Filtro = 'abiertos' | 'recibidos' | 'cancelados' | 'todos';

/**
 * Compras · Pedidos (M7).
 *
 * «¿A quién le toca pedir hoy, y qué llega?» Es la pantalla que se abre cada
 * mañana, y por eso lo primero no es la lista: es **lo de hoy**. A quién hay que
 * pedirle antes de su hora límite para que llegue a su reparto, lo que tiene que
 * llegar hoy o mañana —con su botón de recibir—, y los borradores que esperan a
 * que alguien los mande.
 *
 * Debajo, la lista entera con sus filtros, y los dos botones de siempre: hacer un
 * pedido y apuntar lo que ha llegado.
 */
export function Pedidos() {
  const { permisos } = usarSesion();
  const puedeTocar = puedeEditar(permisos, 'app.inventario');
  const [parametros, ponerParametros] = useSearchParams();
  const pedido = usarAbiertoEnLaDireccion('pedido');

  const [filtro, setFiltro] = useState<Filtro>('abiertos');
  const [limite, setLimite] = useState(50);
  /** A quién se le está haciendo un pedido nuevo. Vacío: todavía no se ha elegido. */
  const [nuevoPara, setNuevoPara] = useState<string | null>(null);
  const [preguntandoQueHaLlegado, setPreguntandoQueHaLlegado] = useState(false);
  const [sinPedidoDe, setSinPedidoDe] = useState<{ id: string; nombre: string } | null>(null);

  usarQueHacer('nuevo', () => {
    if (puedeTocar) setNuevoPara('');
  });
  usarQueHacer('recibir', () => {
    if (puedeTocar) setPreguntandoQueHaLlegado(true);
  });

  // `?pedir=<proveedor>`: «Hacer el pedido» desde Hoy, desde el Panel o desde la
  // ficha del proveedor. Se abre una vez y se quita de la dirección, igual que
  // `?hacer=`, para que recargar no lo vuelva a abrir.
  const pedirA = parametros.get('pedir');
  useEffect(() => {
    if (pedirA === null) return;
    if (puedeTocar) setNuevoPara(pedirA);
    const limpios = new URLSearchParams(parametros);
    limpios.delete('pedir');
    ponerParametros(limpios, { replace: true });
    // Se dispara por lo que se pide, no por la identidad de las funciones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedirA]);

  const hoy = usarLectura<ComprasDeHoy>('compras_de_hoy');
  const lista = usarLectura<MisPedidos>('mis_pedidos', { vista: filtro, limite: String(limite) });

  /** Abre el pedido y, a la vez, lo que ha llegado: un toque menos en la puerta. */
  function recibirElPedido(pedidoId: string) {
    const nuevos = new URLSearchParams(parametros);
    nuevos.set('pedido', pedidoId);
    nuevos.set('recibir', '1');
    ponerParametros(nuevos);
  }

  const datos = lista.data;
  const cuantos = datos?.cuantos;

  return (
    <div className="flex flex-col gap-e4">
      <LoDeHoy
        datos={hoy.data}
        puedeTocar={puedeTocar}
        alRecibir={recibirElPedido}
        alAbrirPedido={pedido.abrir}
        alPedirA={(proveedorId) => {
          setNuevoPara(proveedorId);
        }}
      />

      {puedeTocar && (
        <div className="flex flex-wrap gap-e2">
          <Boton
            tono="principal"
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              setNuevoPara('');
            }}
          >
            Hacer un pedido
          </Boton>
          <Boton
            tono="secundario"
            icono={<IconoReparto size={18} />}
            onClick={() => {
              setPreguntandoQueHaLlegado(true);
            }}
          >
            Ha llegado algo
          </Boton>
        </div>
      )}

      <Tarjeta
        titulo="Tus pedidos"
        origen={
          datos === undefined
            ? 'Leyendo…'
            : `${cuantos?.enviados ?? 0} mandados · ${cuantos?.borradores ?? 0} en borrador`
        }
      >
        <div className="flex flex-col gap-e3">
          <Filtros
            titulo="Qué pedidos ver"
            puesto={filtro}
            alElegir={(valor) => {
              setFiltro(valor);
              setLimite(50);
            }}
            opciones={[
              {
                valor: 'abiertos',
                texto: 'Abiertos',
                cuantos: (cuantos?.enviados ?? 0) + (cuantos?.borradores ?? 0),
              },
              { valor: 'recibidos', texto: 'Recibidos' },
              { valor: 'cancelados', texto: 'Cancelados' },
              { valor: 'todos', texto: 'Todos' },
            ]}
          />

          {lista.isPending ? (
            <Cargando que="tus pedidos" lineas={3} />
          ) : lista.isError ? (
            <Aviso tono="mal" titulo="No he podido leer tus pedidos">
              Vuelve a intentarlo dentro de un momento. Si sigue igual, avísanos.
            </Aviso>
          ) : (
            <Tabla<PedidoEnLista>
              titulo="Tus pedidos"
              filas={datos?.pedidos ?? []}
              claveDe={(p) => p.id}
              alPulsar={(p) => {
                pedido.abrir(p.id);
              }}
              columnas={[
                {
                  clave: 'pedido',
                  titulo: 'Pedido',
                  principal: true,
                  celda: (p) => (
                    <span>
                      <span className="text-texto-suave">Nº {p.numero} · </span>
                      {p.proveedor}
                    </span>
                  ),
                },
                {
                  clave: 'estado',
                  titulo: 'Cómo está',
                  celda: (p) =>
                    p.atrasado ? (
                      <Etiqueta tono="mal">No ha llegado</Etiqueta>
                    ) : (
                      <Etiqueta tono={TONO_DEL_ESTADO_DEL_PEDIDO[p.estado]}>
                        {NOMBRE_DEL_ESTADO_DEL_PEDIDO[p.estado]}
                        {p.estado === 'enviado' && p.enviadoPorCanal !== null
                          ? ` · ${NOMBRE_DEL_CANAL[p.enviadoPorCanal].toLowerCase()}`
                          : ''}
                      </Etiqueta>
                    ),
                },
                {
                  clave: 'llega',
                  titulo: 'Llega',
                  celda: (p) =>
                    p.estado === 'enviado' || p.estado === 'borrador'
                      ? (p.llegaCuando ?? 'Sin fecha')
                      : '—',
                },
                {
                  clave: 'lineas',
                  titulo: 'Qué lleva',
                  celda: (p) => cuantosProductos(p.lineas),
                },
                ...(datos?.puedeVerPrecios === true
                  ? [
                      {
                        clave: 'importe',
                        titulo: 'Importe',
                        numerica: true,
                        celda: (p: PedidoEnLista) => (
                          <span className="tabular-nums">
                            {comoDinero(p.totalCentimos)}
                            {(p.sinPrecio ?? 0) > 0 && (
                              <span className="text-texto-suave" title="Hay productos sin precio">
                                {' '}
                                *
                              </span>
                            )}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
              cuandoNoHay={
                <EstadoVacio
                  compacto
                  titulo={
                    filtro === 'abiertos'
                      ? 'No hay pedidos abiertos'
                      : filtro === 'recibidos'
                        ? 'Todavía no ha llegado ningún pedido'
                        : filtro === 'cancelados'
                          ? 'Ningún pedido cancelado'
                          : 'Todavía no has hecho ningún pedido'
                  }
                  frase="Un pedido empieza con lo que Estook sugiere: lo de ese proveedor que no llega a su siguiente reparto, en cajas enteras."
                  {...(puedeTocar
                    ? {
                        accion: (
                          <Boton
                            tono="principal"
                            icono={<IconoAnadir size={18} />}
                            onClick={() => {
                              setNuevoPara('');
                            }}
                          >
                            Hacer un pedido
                          </Boton>
                        ),
                      }
                    : { sinAccionPorque: 'Tu acceso permite mirar los pedidos, no hacerlos.' })}
                />
              }
            />
          )}

          {datos?.hayMas === true && (
            <div>
              <Boton
                tono="texto"
                onClick={() => {
                  setLimite((antes) => antes + 50);
                }}
              >
                Ver más pedidos
              </Boton>
            </div>
          )}

          {datos?.puedeVerPrecios === true && (
            <p className="text-etiqueta text-texto-tenue">
              Importes sin impuestos, a lo pactado o a lo último que te cobró. Con * hay productos
              sin precio que no suman.
            </p>
          )}
        </div>
      </Tarjeta>

      {nuevoPara !== null && (
        <NuevoPedido
          para={nuevoPara}
          alCerrar={() => {
            setNuevoPara(null);
          }}
          alAbrir={(pedidoId) => {
            setNuevoPara(null);
            pedido.abrir(pedidoId);
          }}
        />
      )}

      {preguntandoQueHaLlegado && (
        <QueHaLlegado
          alCerrar={() => {
            setPreguntandoQueHaLlegado(false);
          }}
          alElegirPedido={(pedidoId) => {
            setPreguntandoQueHaLlegado(false);
            recibirElPedido(pedidoId);
          }}
          alElegirSinPedido={(proveedor) => {
            setPreguntandoQueHaLlegado(false);
            setSinPedidoDe(proveedor);
          }}
        />
      )}

      {sinPedidoDe !== null && (
        <Recibir
          pedido={null}
          proveedor={sinPedidoDe}
          alCerrar={() => {
            setSinPedidoDe(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Lo de hoy: lo que llega, a quién toca pedir y lo que espera a mandarse.
 *
 * «El bajo mínimo sabe qué día reparte tu proveedor. Avisar el jueves de un
 * pescado que llega los martes no sirve de nada» (Manifiesto 28). Esto es ese
 * aviso **el día que sirve**, con la hora límite, y cada línea con su botón.
 */
function LoDeHoy({
  datos,
  puedeTocar,
  alRecibir,
  alAbrirPedido,
  alPedirA,
}: {
  readonly datos: ComprasDeHoy | undefined;
  readonly puedeTocar: boolean;
  readonly alRecibir: (pedidoId: string) => void;
  readonly alAbrirPedido: (pedidoId: string) => void;
  readonly alPedirA: (proveedorId: string) => void;
}) {
  if (datos === undefined) return null;

  const tocaPedir = datos.tocaPedir.filter((t) => !t.yaPedido);
  const nada = datos.llegan.length === 0 && tocaPedir.length === 0 && datos.borradores.length === 0;
  if (nada) return null;

  return (
    <div className="grid gap-e3 md:grid-cols-2">
      {tocaPedir.length > 0 && (
        <Tarjeta titulo="Toca pedir hoy" origen="Para llegar a su próximo reparto">
          <ul className="flex flex-col gap-e3">
            {tocaPedir.map((t) => (
              <li
                key={t.proveedorId}
                className="flex flex-col gap-e2 rounded-medio border border-borde p-e3"
              >
                <div className="flex flex-wrap items-center gap-e2">
                  <span className="text-atencion" aria-hidden>
                    <IconoReloj size={18} />
                  </span>
                  <span className="text-cuerpo font-medium">{t.proveedor}</span>
                  {t.pedirAntesDe !== null && (
                    <Etiqueta tono="atencion">antes de las {t.pedirAntesDe}</Etiqueta>
                  )}
                </div>
                <p className="text-secundario text-texto-suave">
                  Si se lo pides hoy, llega {t.llegaCuando}.{' '}
                  {t.productos === 0
                    ? 'Ahora mismo no te falta nada suyo.'
                    : `Estook le pediría ${cuantosProductos(t.productos)}.`}
                </p>
                {puedeTocar && (
                  <div>
                    <Boton
                      tono={t.productos > 0 ? 'principal' : 'secundario'}
                      onClick={() => {
                        if (t.borradorId !== null) alAbrirPedido(t.borradorId);
                        else alPedirA(t.proveedorId);
                      }}
                    >
                      {t.borradorId !== null ? 'Seguir con el borrador' : 'Hacer el pedido'}
                    </Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {datos.llegan.length > 0 && (
        <Tarjeta titulo="Lo que llega" origen="Pedidos mandados, de hoy y de mañana">
          <ul className="flex flex-col gap-e2">
            {datos.llegan.map((l) => (
              <li
                key={l.pedidoId}
                className="flex flex-wrap items-center gap-e3 rounded-medio border border-borde p-e3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-cuerpo font-medium">
                    {l.proveedor}{' '}
                    <span className="font-normal text-texto-suave">· Nº {l.numero}</span>
                  </span>
                  <span className="block text-secundario text-texto-suave">
                    {l.atrasado ? `Tenía que llegar ${l.llegaCuando}` : `Llega ${l.llegaCuando}`} ·{' '}
                    {cuantosProductos(l.lineas)}
                  </span>
                </span>
                {l.atrasado && <Etiqueta tono="mal">No ha llegado</Etiqueta>}
                {puedeTocar && (
                  <Boton
                    tono="principal"
                    onClick={() => {
                      alRecibir(l.pedidoId);
                    }}
                  >
                    Recibir
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {datos.borradores.length > 0 && (
        <Tarjeta
          titulo={
            datos.borradores.length === 1
              ? '1 borrador sin mandar'
              : `${datos.borradores.length} borradores sin mandar`
          }
          origen={
            datos.puedeEnviar ? 'Revísalos y mándalos' : 'Los manda quien puede mandar pedidos'
          }
        >
          <ul className="flex flex-col">
            {datos.borradores.map((b) => (
              <li key={b.pedidoId}>
                <button
                  type="button"
                  onClick={() => {
                    alAbrirPedido(b.pedidoId);
                  }}
                  className="flex w-full min-h-toque items-center gap-e3 rounded-medio px-e2 text-left hover:bg-fondo"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-cuerpo">
                      {b.proveedor} <span className="text-texto-suave">· Nº {b.numero}</span>
                    </span>
                    <span className="block text-secundario text-texto-suave">
                      {cuantosProductos(b.lineas)}
                      {b.quienLoHizo === null ? '' : ` · lo hizo ${b.quienLoHizo}`}
                    </span>
                  </span>
                  <span className="text-secundario font-medium text-texto-suave">
                    {datos.puedeEnviar ? 'Mandar' : 'Ver'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

/**
 * Hacer un pedido: a quién, y empezar por lo que sugiere Estook.
 *
 * «Pedido sugerido **según los días de reparto**: si el pescado llega martes y
 *  viernes, el del martes cubre hasta el viernes» (Manifiesto 12). Se enseña lo
 * que se pediría, en cajas enteras y con el porqué de cada línea, **antes** de
 * crear nada: así se decide con la cuenta delante, y se puede empezar en blanco.
 */
function NuevoPedido({
  para,
  alCerrar,
  alAbrir,
}: {
  readonly para: string;
  readonly alCerrar: () => void;
  readonly alAbrir: (pedidoId: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const [elegido, setElegido] = useState(para);
  const [creando, setCreando] = useState<'sugerencia' | 'blanco' | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const proveedores = usarLectura<MisProveedores>('mis_proveedores');
  const sugerencia = usarLectura<SugerenciaDePedido>(
    'sugerencia_de_pedido',
    { proveedor_id: elegido },
    elegido !== '',
  );

  const activos = (proveedores.data?.proveedores ?? []).filter((p) => p.activo);
  const datos = elegido === '' ? undefined : sugerencia.data;

  async function crear(conLaSugerencia: boolean) {
    setCreando(conLaSugerencia ? 'sugerencia' : 'blanco');
    setError(null);
    const respuesta = await cliente.ejecutar<{ pedidoId: string }>('crear_pedido', {
      proveedor_id: elegido,
      con_la_sugerencia: conLaSugerencia,
    });
    setCreando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alAbrir(respuesta.datos.pedidoId);
  }

  const reparto = datos?.proximoReparto ?? null;

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Un pedido nuevo"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="secundario"
            disabled={elegido === '' || creando !== null}
            cargando={creando === 'blanco'}
            textoCargando="Creando"
            onClick={() => {
              void crear(false);
            }}
          >
            Empezar en blanco
          </Boton>
          <Boton
            tono="principal"
            disabled={elegido === '' || creando !== null || (datos?.lineas.length ?? 0) === 0}
            cargando={creando === 'sugerencia'}
            textoCargando="Creando"
            onClick={() => {
              void crear(true);
            }}
          >
            {(datos?.lineas.length ?? 0) > 0
              ? `Empezar con esto (${datos?.lineas.length ?? 0})`
              : 'Empezar con lo sugerido'}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}

        <Selector
          etiqueta="¿A quién se lo pides?"
          obligatorio
          sinElegir="Elige un proveedor"
          cuandoNoHay="Todavía no tienes proveedores. Se dan de alta en Compras · Proveedores."
          opciones={activos.map((p) => ({
            valor: p.id,
            texto: p.tocaPedirHoy ? `${p.nombre} · toca pedir hoy` : p.nombre,
          }))}
          value={elegido}
          onChange={(e) => {
            setElegido(e.currentTarget.value);
          }}
        />

        {elegido !== '' && sugerencia.isPending && <Cargando que="lo que le pediría" lineas={3} />}

        {datos !== undefined && (
          <>
            {reparto === null ? (
              <Aviso tono="info" titulo="No sé qué días reparte">
                Sin días de reparto, la sugerencia cuenta cinco días de consumo. Pónselos en su
                ficha y te dirá qué día tienes que pedir y hasta qué hora.
              </Aviso>
            ) : (
              <p className="text-cuerpo">
                Si lo pides {reparto.pedirCuando}
                {reparto.pedirAntesDe === null ? '' : ` antes de las ${reparto.pedirAntesDe}`},
                llega <strong>{reparto.llegaCuando}</strong>.
              </p>
            )}

            {datos.borradorId !== null && (
              <Aviso
                tono="atencion"
                titulo={`Ya hay un borrador para ${datos.proveedor.nombre}`}
                accion={
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      if (datos.borradorId !== null) alAbrir(datos.borradorId);
                    }}
                  >
                    Abrir el borrador
                  </Boton>
                }
              >
                Mejor seguir con ese que empezar otro: así no se le manda lo mismo dos veces.
              </Aviso>
            )}

            {datos.lineas.length === 0 ? (
              <EstadoVacio
                compacto
                titulo="Ahora mismo no te falta nada suyo"
                frase={
                  datos.sinNecesidad > 0
                    ? `Lo que le compras llega bien a su siguiente reparto. Si quieres pedirle algo igualmente, empieza en blanco.`
                    : 'Todavía no tiene productos puestos como su proveedor. Empieza en blanco y añade lo que le pides.'
                }
                sinAccionPorque="La sugerencia sale del consumo de cada producto y de sus días de reparto."
              />
            ) : (
              <section className="flex flex-col gap-e2">
                <h3 className="text-seccion font-semibold">Lo que le pediría</h3>
                <ul className="flex flex-col rounded-medio border border-borde">
                  {datos.lineas.map((l) => (
                    <li
                      key={l.productoId}
                      className="flex flex-col gap-e1 border-b border-borde p-e3 last:border-0"
                    >
                      <span className="flex items-baseline justify-between gap-e3">
                        <span className="text-cuerpo font-medium">{l.producto}</span>
                        <span className="shrink-0 text-cuerpo font-semibold">{l.comoSePide}</span>
                      </span>
                      <span className="text-secundario text-texto-suave">
                        {l.sugerencia.motivo}
                      </span>
                      {l.importeCentimos !== undefined && l.importeCentimos !== null && (
                        <span className="text-secundario text-texto-suave tabular-nums">
                          {comoDinero(l.importeCentimos)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {datos.sinNecesidad > 0 && (
                  <p className="text-secundario text-texto-suave">
                    Lo demás que le compras ({datos.sinNecesidad}) llega bien a su siguiente
                    reparto.
                  </p>
                )}
                {datos.totalCentimos !== undefined && (
                  <p className="text-cuerpo">
                    Serían unos{' '}
                    <strong className="tabular-nums">{comoDinero(datos.totalCentimos)}</strong> sin
                    impuestos.
                  </p>
                )}
                {datos.minimo !== undefined && datos.minimo !== null && (
                  <Aviso tono={datos.minimo.llega ? 'bien' : 'atencion'} titulo="El pedido mínimo">
                    {datos.minimo.frase}
                  </Aviso>
                )}
                <p className="text-etiqueta text-texto-tenue">
                  Es un borrador: después se cambia lo que haga falta antes de mandarlo.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </Hoja>
  );
}

/**
 * «¿Qué ha llegado?» · la puerta de la recepción cuando no se viene de un pedido.
 *
 * Lo normal es que llegue algo pedido, y se elige de la lista de mandados. Lo
 * otro también pasa a diario —el de la fruta, que viene todas las mañanas sin que
 * nadie pida—, y por eso está aquí y no escondido.
 */
function QueHaLlegado({
  alCerrar,
  alElegirPedido,
  alElegirSinPedido,
}: {
  readonly alCerrar: () => void;
  readonly alElegirPedido: (pedidoId: string) => void;
  readonly alElegirSinPedido: (proveedor: { id: string; nombre: string }) => void;
}) {
  const [proveedorId, setProveedorId] = useState('');
  const abiertos = usarLectura<MisPedidos>('mis_pedidos', { vista: 'abiertos', limite: '50' });
  const proveedores = usarLectura<MisProveedores>('mis_proveedores');

  const mandados = (abiertos.data?.pedidos ?? []).filter((p) => p.estado === 'enviado');
  const activos = (proveedores.data?.proveedores ?? []).filter((p) => p.activo);
  const elegido = activos.find((p) => p.id === proveedorId);

  return (
    <Hoja abierta alCerrar={alCerrar} titulo="¿Qué ha llegado?">
      <div className="flex flex-col gap-e5">
        <section className="flex flex-col gap-e2">
          <h3 className="text-seccion font-semibold">Un pedido que mandaste</h3>
          {abiertos.isPending ? (
            <Cargando que="los pedidos mandados" lineas={2} />
          ) : mandados.length === 0 ? (
            <p className="text-secundario text-texto-suave">
              No hay ningún pedido mandado esperando.
            </p>
          ) : (
            <ul className="flex flex-col rounded-medio border border-borde">
              {mandados.map((p) => (
                <li key={p.id} className="border-b border-borde last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      alElegirPedido(p.id);
                    }}
                    className="flex w-full min-h-toque items-center gap-e3 px-e3 py-e2 text-left hover:bg-fondo"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-cuerpo font-medium">
                        {p.proveedor}{' '}
                        <span className="font-normal text-texto-suave">· Nº {p.numero}</span>
                      </span>
                      <span className="block text-secundario text-texto-suave">
                        {p.llegaCuando === null ? 'Sin fecha' : `Llega ${p.llegaCuando}`} ·{' '}
                        {cuantosProductos(p.lineas)}
                      </span>
                    </span>
                    {p.atrasado && <Etiqueta tono="mal">No ha llegado</Etiqueta>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-e3">
          <h3 className="text-seccion font-semibold">Algo que llega sin pedido</h3>
          <p className="text-secundario text-texto-suave">
            El de la fruta, el del pan: lo que viene sin que nadie lo pida. Se apunta igual, con su
            albarán.
          </p>
          <Selector
            etiqueta="¿De quién?"
            sinElegir="Elige un proveedor"
            cuandoNoHay="Todavía no tienes proveedores."
            opciones={activos.map((p) => ({ valor: p.id, texto: p.nombre }))}
            value={proveedorId}
            onChange={(e) => {
              setProveedorId(e.currentTarget.value);
            }}
          />
          <div>
            <Boton
              tono="secundario"
              disabled={elegido === undefined}
              onClick={() => {
                if (elegido !== undefined)
                  alElegirSinPedido({ id: elegido.id, nombre: elegido.nombre });
              }}
            >
              Apuntar lo que ha llegado
            </Boton>
          </div>
        </section>
      </div>
    </Hoja>
  );
}
