import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DEL_ESTADO, comoSePide } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { ComprasDeHoy } from '../compras/contrato.ts';
import { Aviso, Boton, Cargando, Cifra, EstadoVacio, Etiqueta, Tarjeta, Tira } from '@estook/ui';
import { IconoAnadir, IconoAtencion, IconoCamara, IconoReloj, IconoVacio } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ApuntarMerma } from './ApuntarMerma.tsx';
import { QuitarLote, type LoteQueSeQuita } from './Lotes.tsx';
import {
  TONO_DEL_ESTADO,
  comoDinero,
  comoSeLeeLaFecha,
  conUnidadDeUso,
  cuandoSeAgota,
  type InventarioHoy,
  type MermaDeHoy,
  type ProductoEnLista,
} from './contrato.ts';

/**
 * Inventario · Hoy (M6).
 *
 * «La pantalla de inicio de la app: **lo que hay que atender ahora**. Bajo mínimo
 *  **con su previsión de agotamiento**, caducidades de esta semana, pedidos por
 *  recibir, precios que han subido, productos sin precio y recuento pendiente.
 *  **Cada línea con su botón**» (Manifiesto 12).
 *
 * De esa lista, M6 dio cuatro: bajo mínimo con previsión, caducidades, productos
 * sin precio y el valor de la cámara. M7 añade **los pedidos por recibir y a
 * quién toca pedir hoy**, con su botón. El recuento es M8, y se dice que falta y
 * dónde llega en vez de dejar el hueco en blanco.
 *
 * ── La regla que ordena esta pantalla ────────────────────────────────────────
 *
 * «Una alerta que no se puede accionar no es una alerta, es ruido» (Evolución
 * 1.0, capítulo 9). Cada línea de aquí lleva las cuatro cosas: qué ocurre, por
 * qué, qué impacto tiene y un botón. Y **los datos de ejemplo no salen**: «no
 * cuenta para nada: ni avisos, ni análisis» (Manifiesto 8). Eso lo filtra el
 * servidor, no esta pantalla.
 */
export function Hoy({ alAbrirProducto }: { readonly alAbrirProducto: (id: string) => void }) {
  const { cliente, permisos } = usarSesion();
  const puedeTocar = puedeEditar(permisos, 'app.inventario');
  const [quitando, setQuitando] = useState<LoteQueSeQuita | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ['inventario_hoy'],
    queryFn: async (): Promise<InventarioHoy> => {
      const respuesta = await cliente.consultar<InventarioHoy>('inventario_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="lo que hay que atender" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tu inventario">
        Vuelve a intentarlo dentro de un momento. Si sigue igual, avísanos.
      </Aviso>
    );
  }

  const hoy = consulta.data;
  const nadaQueAtender =
    hoy.atencion.length === 0 && hoy.caducan.length === 0 && hoy.sinPrecio.length === 0;

  return (
    <div className="grid gap-e3 md:grid-cols-2 xl:grid-cols-3">
      {hecho !== null && (
        <div className="md:col-span-2 xl:col-span-3">
          <Aviso
            tono="bien"
            titulo={hecho}
            esNoticia
            alCerrar={() => {
              setHecho(null);
            }}
          >
            Con tu nombre y la hora.
          </Aviso>
        </div>
      )}

      {quitando !== null && (
        <QuitarLote
          lote={quitando}
          alCerrar={() => {
            setQuitando(null);
          }}
          alHecho={(frase) => {
            setQuitando(null);
            setHecho(frase);
          }}
        />
      )}

      {hoy.cuantosProductos === 0 ? (
        <Tarjeta titulo="Todavía no tienes género">
          <EstadoVacio
            compacto
            icono={<IconoVacio size={24} />}
            titulo="La cámara está vacía"
            frase="En cuanto des de alta tu primer producto, aquí verás lo que se está acabando, lo que caduca y lo que te está costando."
            sinAccionPorque="Se empieza por «Productos», que es el sitio de al lado en la barra."
          />
        </Tarjeta>
      ) : (
        <>
          {/*
            La zona de atención va primero y no se puede quitar (Evolución 1.0,
            capítulo 5): terminar de mirar lo que falta va antes que cualquier
            cifra bonita.
          */}
          <Tarjeta
            titulo={
              nadaQueAtender
                ? 'Nada que atender'
                : `${cuantasCosas(hoy)} ${cuantasCosas(hoy) === 1 ? 'cosa necesita' : 'cosas necesitan'} tu atención`
            }
            origen={`Sobre ${hoy.cuantosProductos} ${hoy.cuantosProductos === 1 ? 'producto' : 'productos'} · ahora mismo`}
          >
            {nadaQueAtender ? (
              <EstadoVacio
                compacto
                titulo="Todo en su sitio"
                frase="Ningún producto está por debajo de su mínimo, no caduca nada esta semana y todos tienen precio."
                sinAccionPorque="Cuando algo se salga, aparecerá aquí solo."
              />
            ) : (
              <ul className="flex flex-col gap-e3">
                {hoy.atencion.slice(0, 8).map((producto) => (
                  <li key={producto.id}>
                    <LineaDeAtencion
                      producto={producto}
                      alAbrir={() => {
                        alAbrirProducto(producto.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          {hoy.caducan.length > 0 && (
            <Tarjeta titulo="Caduca esta semana" origen="Lotes con fecha · próximos 7 días">
              <ul className="flex flex-col gap-e2">
                {hoy.caducan.map((lote) => (
                  <li key={lote.loteId} className="flex items-center gap-e2">
                    <button
                      type="button"
                      onClick={() => {
                        alAbrirProducto(lote.productoId);
                      }}
                      className="flex min-h-toque min-w-0 flex-1 items-center gap-e3 rounded-medio px-e2 text-left hover:bg-fondo"
                    >
                      <span className={lote.dias < 0 ? 'text-mal' : 'text-atencion'}>
                        <IconoReloj size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-e2">
                          <span className="text-cuerpo">{lote.producto}</span>
                          {lote.congelado && <Etiqueta tono="info">congelado</Etiqueta>}
                        </span>
                        <span className="block text-secundario text-texto-suave">
                          {cuandoCaduca(lote.dias)}
                          {lote.lote === null ? '' : ` · lote ${lote.lote}`}
                        </span>
                      </span>
                    </button>
                    {/*
                      «Si se gasta o se tira el que estaba a punto de caducar, se
                       tiene que poder quitar»: aquí mismo, sin abrir la ficha.
                    */}
                    {puedeTocar && (
                      <Boton
                        tono={lote.dias < 0 ? 'principal' : 'secundario'}
                        onClick={() => {
                          setQuitando({
                            id: lote.loteId,
                            producto: lote.producto,
                            codigo: lote.lote,
                            caducaEl: lote.caducaEl,
                            unidadDeUso: lote.unidadDeUso,
                          });
                        }}
                      >
                        Quitar
                      </Boton>
                    )}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {hoy.puedeVerPrecios && (
            <Tarjeta
              titulo="Lo que hay en cámara"
              origen="A precio medio; lo que entró sin coste, a su precio de hoy · sin los ejemplos"
            >
              <Cifra
                etiqueta="Valor del género"
                valor={hoy.valorTotalCentimos ?? 0}
                formato={(v) => comoDinero(v)}
                origen="Suma de lo que costó lo que hay"
              />

              {/*
                ── Por qué esta cifra parecía no moverse ────────────────────────
                Se valora `cantidad × coste medio`, y el coste medio de un producto
                **solo se mueve cuando entra género con un precio**. Un producto
                dado de alta con su precio en la lista y sin ninguna entrada tenía
                coste medio cero, así que valía cero y la cámara «no se
                actualizaba» por muchos productos que se metieran.
                Lo que lo arregla de raíz está en el alta: dar de alta un producto
                **apunta la entrada de lo que hay**, con su precio, así que el
                coste medio nace puesto. Y aquí se dice cuánto queda sin valorar,
                que es lo que faltaba: sin esa línea, la cifra parecía mal en vez
                de parecer incompleta.
              */}
              {hoy.sinPrecio.length > 0 && (
                <p className="mt-e2 text-secundario text-atencion">
                  {hoy.sinPrecio.length === 1
                    ? 'Hay 1 producto sin precio: cuenta cero en esta cifra.'
                    : `Hay ${hoy.sinPrecio.length} productos sin precio: cuentan cero en esta cifra.`}
                </p>
              )}
            </Tarjeta>
          )}

          {hoy.sinPrecio.length > 0 && (
            <Tarjeta titulo="Sin precio todavía" origen="Cuentan cero en el valor de la cámara">
              <ul className="flex flex-col gap-e1">
                {hoy.sinPrecio.slice(0, 10).map((producto) => (
                  <li key={producto.id}>
                    <button
                      type="button"
                      onClick={() => {
                        alAbrirProducto(producto.id);
                      }}
                      className="flex w-full min-h-toque items-center rounded-medio px-e2 text-left text-cuerpo hover:bg-fondo"
                    >
                      {producto.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </>
      )}

      {/*
        La merma del día · lo que pedía la lista, y en su sitio.

        «Añade un cuadrado merma y ahí saldrá la merma de ese día, y abajo una
        gráfica pequeñita de los días anteriores, y a la derecha de la tarjeta ver
        a detalle.» Eso es esto.

        La tira de catorce días está porque **una cifra sola no dice nada**: doce
        euros de merma es mucho o poco según lo de siempre, y eso es exactamente
        lo que una tira de barras contesta sin leer un número.
      */}
      {puedeVer(permisos, 'accion.registrar_merma') && <MermaDeLaJornada />}

      {/*
        Los pedidos por recibir, que el Manifiesto pone en esta pantalla y que
        hasta M7 eran una línea de «llega con Proveedores y compras».
      */}
      {puedeVer(permisos, 'app.inventario') && <ComprasDeHoyEnHoy />}

      {/*
        Y lo que esta pantalla todavía no puede dar, dicho por su nombre. La merma
        y los pedidos ya no están en esta lista: están arriba, funcionando.
      */}
      <Tarjeta titulo="Y lo que falta por venir" origen="Recuento">
        <p className="text-secundario text-texto-suave">
          <strong className="text-texto">Recuento y desviación</strong> · lo que dice el papel
          contra lo que dice Estook, con su causa probable. Llega con Recuentos.
        </p>
      </Tarjeta>
    </div>
  );
}

/**
 * Las compras de hoy · lo que llega, con su botón de recibir, y a quién toca
 * pedirle antes de su hora límite.
 *
 * Es la misma consulta que la cabecera de Compras · Pedidos y que el widget del
 * Panel, con la misma clave de caché: tres sitios y un solo viaje.
 */
function ComprasDeHoyEnHoy() {
  const { permisos } = usarSesion();
  const navegar = useNavigate();
  const puedeTocar = puedeEditar(permisos, 'app.inventario');
  const consulta = usarLectura<ComprasDeHoy>('compras_de_hoy');

  const datos = consulta.data;
  const tocaPedir = (datos?.tocaPedir ?? []).filter((t) => !t.yaPedido);
  const nada = datos !== undefined && datos.llegan.length === 0 && tocaPedir.length === 0;

  return (
    <Tarjeta
      titulo="Compras de hoy"
      origen="Lo que llega y a quién toca pedir"
      accion={
        <Boton
          tono="texto"
          onClick={() => {
            navegar('/inventario/compras/pedidos');
          }}
        >
          Ver pedidos
        </Boton>
      }
    >
      {datos === undefined ? (
        <Cargando que="las compras" lineas={2} />
      ) : nada ? (
        <p className="text-secundario text-texto-suave">
          Hoy no llega nada y no toca pedirle a nadie.
          {datos.borradores.length > 0
            ? ` Hay ${datos.borradores.length === 1 ? 'un borrador' : `${datos.borradores.length} borradores`} sin mandar.`
            : ''}
        </p>
      ) : (
        <ul className="flex flex-col gap-e2">
          {datos.llegan.map((l) => (
            <li key={l.pedidoId} className="flex flex-wrap items-center gap-e3">
              <span className="min-w-0 flex-1">
                <span className="block text-cuerpo">{l.proveedor}</span>
                <span
                  className={
                    l.atrasado
                      ? 'block text-secundario text-mal'
                      : 'block text-secundario text-texto-suave'
                  }
                >
                  {l.atrasado ? `Tenía que llegar ${l.llegaCuando}` : `Llega ${l.llegaCuando}`}
                </span>
              </span>
              <Boton
                tono={puedeTocar ? 'principal' : 'secundario'}
                onClick={() => {
                  navegar(
                    `/inventario/compras/pedidos?pedido=${l.pedidoId}${puedeTocar ? '&recibir=1' : ''}`,
                  );
                }}
              >
                {puedeTocar ? 'Recibir' : 'Ver'}
              </Boton>
            </li>
          ))}
          {tocaPedir.map((t) => (
            <li key={t.proveedorId} className="flex flex-wrap items-center gap-e3">
              <span className="min-w-0 flex-1">
                <span className="block text-cuerpo">Toca pedirle a {t.proveedor}</span>
                <span className="block text-secundario text-atencion">
                  {t.pedirAntesDe === null ? 'Hoy' : `Antes de las ${t.pedirAntesDe}`}, para que
                  llegue {t.llegaCuando}
                </span>
              </span>
              {puedeTocar && (
                <Boton
                  tono="secundario"
                  onClick={() => {
                    navegar(
                      t.borradorId === null
                        ? `/inventario/compras/pedidos?pedir=${t.proveedorId}`
                        : `/inventario/compras/pedidos?pedido=${t.borradorId}`,
                    );
                  }}
                >
                  {t.borradorId === null ? 'Hacer el pedido' : 'Seguir el borrador'}
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

function cuantasCosas(hoy: InventarioHoy): number {
  return hoy.atencion.length + hoy.caducan.length;
}

function cuandoCaduca(dias: number): string {
  if (dias < 0) return `Caducó hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Caduca hoy';
  if (dias === 1) return 'Caduca mañana';
  return `Caduca en ${dias} días`;
}

/**
 * Una línea de atención, con las cuatro cosas que exige el centro de alertas.
 *
 * Qué ocurre («Pollo · por debajo del mínimo»), por qué («quedan 4,2 kg y el
 * mínimo son 8»), qué impacto tiene («se agota mañana a las 18:24») y un botón
 * («Ver la ficha»). Sin las cuatro es ruido.
 */
function LineaDeAtencion({
  producto,
  alAbrir,
}: {
  readonly producto: ProductoEnLista;
  readonly alAbrir: () => void;
}) {
  const agota = cuandoSeAgota(producto.seAgotaEn, producto.diasDeCobertura);
  const { permisos } = usarSesion();
  const navegar = useNavigate();
  const puedePedir = puedeEditar(permisos, 'app.inventario');

  return (
    <div className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
      <div className="flex flex-wrap items-center gap-e2">
        <span className={producto.estado === 'negativo' ? 'text-mal' : 'text-atencion'}>
          <IconoAtencion size={18} />
        </span>
        <span className="text-cuerpo font-medium">{producto.nombre}</span>
        <Etiqueta tono={TONO_DEL_ESTADO[producto.estado]}>
          {NOMBRE_DEL_ESTADO[producto.estado]}
        </Etiqueta>
      </div>

      <p className="text-secundario text-texto-suave">
        Quedan {conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}
        {producto.minimo === null
          ? ''
          : `, y el mínimo son ${conUnidadDeUso(producto.minimo, producto.unidadDeUso)}`}
        .
        {agota === null
          ? ` ${producto.consumo.porque ?? 'Todavía no sé a qué ritmo se gasta.'}`
          : ` Al ritmo de estos ${producto.consumo.diasMirados} días, se agota ${agota}.`}
      </p>

      {producto.sugerencia !== null && (
        <p className="text-secundario">
          {/* Como se pide, en cajas enteras: «Pide 2 × Caja 10 kg», no «pide 13,6 kg». */}
          <strong>
            Pide{' '}
            {comoSePide(
              producto.sugerencia.formatos,
              producto.formato,
              producto.factor,
              producto.unidadDeUso,
            )}
            .
          </strong>{' '}
          <span className="text-texto-suave">{producto.sugerencia.motivo}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-e2">
        <Boton tono="secundario" onClick={alAbrir}>
          Ver la ficha
        </Boton>
        {/* Y el botón que hace algo con el aviso: pedírselo a su proveedor. */}
        {producto.sugerencia !== null && producto.proveedorId !== null && puedePedir && (
          <Boton
            tono="principal"
            onClick={() => {
              navegar(`/inventario/compras/pedidos?pedir=${producto.proveedorId ?? ''}`);
            }}
          >
            Pedírselo a {producto.proveedor ?? 'su proveedor'}
          </Boton>
        )}
      </div>
    </div>
  );
}

/**
 * La merma de la jornada · el cuadrado que pedía la lista.
 *
 * ── Por qué esto es una tarjeta y no una fila más ───────────────────────────
 *
 * Porque la merma es lo único de esta pantalla que **se escribe**, no que se lee.
 * Lo demás son avisos que Estook calcula y que llevan a una ficha; esto es un
 * botón que hay que poder pulsar en mitad de un servicio, y una fila de lista no
 * es un botón.
 *
 * La tira de catorce días va debajo de la cifra porque una cifra sola no dice
 * nada: doce euros de merma es mucho o poco según lo de siempre.
 */
function MermaDeLaJornada() {
  const { cliente } = usarSesion();
  const navegar = useNavigate();
  const [apuntando, setApuntando] = useState(false);

  const consulta = useQuery({
    queryKey: ['merma_de_hoy'],
    queryFn: async (): Promise<MermaDeHoy> => {
      const respuesta = await cliente.consultar<MermaDeHoy>('merma_de_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const datos = consulta.data;
  const conPrecios = datos?.puedeVerPrecios === true;

  return (
    <Tarjeta
      titulo="Merma de hoy"
      origen={
        conPrecios && datos.mediaCentimos !== null && datos.mediaCentimos !== undefined
          ? `La media de estos catorce días es ${comoDinero(datos.mediaCentimos)}`
          : 'Lo que ha salido de cámara sin venderse'
      }
      accion={
        <Boton
          tono="texto"
          onClick={() => {
            navegar('/inventario/movimientos/mermas');
          }}
        >
          Ver a detalle
        </Boton>
      }
    >
      {datos === undefined ? (
        <Cargando que="la merma" lineas={2} />
      ) : (
        <>
          {conPrecios ? (
            <Cifra
              etiqueta="Hoy"
              valor={datos.deHoy.valorCentimos ?? 0}
              formato={(v) => comoDinero(v)}
              origen={
                datos.deHoy.cuantas === 0
                  ? 'Nada apuntado hoy'
                  : `${datos.deHoy.cuantas} ${datos.deHoy.cuantas === 1 ? 'apunte' : 'apuntes'}`
              }
            />
          ) : (
            <Cifra
              etiqueta="Apuntes de hoy"
              valor={datos.deHoy.cuantas}
              formato={(v) => String(v)}
              origen="Lo que vale no está en tu acceso"
            />
          )}

          {datos.deHoy.loPeor !== null && (
            <p className="mt-e1 text-secundario text-texto-suave">
              Lo más caro: {datos.deHoy.loPeor.producto}
              {conPrecios ? ` · ${comoDinero(datos.deHoy.loPeor.valorCentimos)}` : ''}
            </p>
          )}

          <div className="mt-e3">
            <Tira
              titulo="Merma de los últimos catorce días"
              puntos={datos.dias.map((dia) => ({
                valor: conPrecios ? (dia.valorCentimos ?? 0) : dia.cuantas,
                cuando: comoSeLeeLaFecha(dia.fecha),
              }))}
              formato={(v) => (conPrecios ? comoDinero(v) : String(v))}
              color="var(--color-app-inventario)"
              alto={44}
            />
          </div>

          {datos.puedeApuntar && (
            <div className="mt-e3 flex flex-wrap gap-e2">
              <Boton
                tono="principal"
                icono={<IconoAnadir size={18} />}
                onClick={() => {
                  setApuntando(true);
                }}
              >
                Apuntar merma
              </Boton>
              {/*
                Y la cámara, apagada y con su motivo. Leer una foto y sacar de ahí
                el producto y el peso lo hace Fogón, que es M22. Se deja el sitio
                hecho —saber que va a poder hacerse cambia cómo se usa esto hoy— y
                **no se puede pulsar**: un botón que promete algo y no lo hace es
                el fallo que este proyecto persigue desde M4.
              */}
              <Boton
                tono="secundario"
                disabled
                icono={<IconoCamara size={18} />}
                onClick={() => undefined}
              >
                Con una foto · M22
              </Boton>
            </div>
          )}

          <ApuntarMerma
            abierta={apuntando}
            alCerrar={() => {
              setApuntando(false);
            }}
          />
        </>
      )}
    </Tarjeta>
  );
}
