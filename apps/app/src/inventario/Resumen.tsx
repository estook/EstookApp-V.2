import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DEL_ESTADO, comoSePide } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { ComprasDeHoy } from '../compras/contrato.ts';
import {
  Aviso,
  Boton,
  Cargando,
  Cifra,
  EnlaceDeTarjeta,
  EstadoVacio,
  Etiqueta,
  Mosaico,
  Tarjeta,
  Tira,
} from '@estook/ui';
import {
  IconoAnadir,
  IconoAtencion,
  IconoDinero,
  IconoOrganizacion,
  IconoQuitar,
  IconoReloj,
  IconoVacio,
} from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CifrasDeLaApp } from '../panel/CifrasDeLaApp.tsx';
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

/** El acento de Inventario, que pinta el icono de cada tarjeta de aquí. */
const ACENTO = 'var(--color-app-inventario)';

/**
 * Cuántos avisos se enseñan antes de «Ver todos».
 *
 * Cuatro caben en la tarjeta sin que empuje todo lo demás fuera de la pantalla, y
 * son los cuatro más urgentes: el servidor ya los manda ordenados.
 */
const AVISOS_A_LA_VISTA = 4;

/**
 * Inventario · Resumen (M6; «Hoy» hasta la entrega V).
 *
 * «La pantalla de inicio de la app: **lo que hay que atender ahora**. Bajo mínimo
 *  **con su previsión de agotamiento**, caducidades de esta semana, pedidos por
 *  recibir, precios que han subido, productos sin precio y recuento pendiente.
 *  **Cada línea con su botón**» (Manifiesto 12).
 *
 * ── Lo que cambió en la entrega V, y por qué ─────────────────────────────────
 *
 * Richi, mirando esta pantalla en su TPV: «es súper larga hacia abajo, hay campos
 * vacíos enormes que no tienen sentido, y pones un montonazo de texto: en la leche
 * semidesnatada, casi nueve líneas». Tenía razón en las tres, y se arreglan así
 * ([0045](../../../../docs/decisiones/0045-el-aspecto-y-el-orden.md)):
 *
 *   · **Se llama «Resumen»**, porque lleva lo urgente y «Cómo va»: «Hoy» decía la
 *     mitad.
 *   · **Las tarjetas van en mosaico**: cada una mide lo que tiene dentro, y las
 *     cortas no se estiran hasta la altura de la larga.
 *   · **Cada aviso en tres líneas**: qué es, cuánto queda y cuándo se acaba, y qué
 *     pedir. **El porqué de esa cantidad no se quita: se pliega** en «¿Por qué?».
 *     Sigue estando para quien quiera fiarse de la cuenta, y no lo lee cada vez
 *     quien ya se fía.
 *   · **Los cuatro más urgentes a la vista**, y «Ver todos» para el resto, en la
 *     misma tarjeta. Antes se cortaba en ocho sin decirlo.
 *   · **Lo que todavía no existe se va.** La tarjeta «Y lo que falta por venir» y
 *     el botón apagado «Con una foto · M22» eran texto sobre el futuro en la
 *     pantalla del presente. Lo que llega está escrito en el plan, no aquí.
 *
 * ── La regla que ordena esta pantalla ────────────────────────────────────────
 *
 * «Una alerta que no se puede accionar no es una alerta, es ruido» (Evolución
 * 1.0, capítulo 9). Cada línea de aquí lleva qué ocurre, por qué, qué impacto
 * tiene y un botón. Y **los datos de ejemplo no salen**: eso lo filtra el
 * servidor, no esta pantalla. **«Cómo va» va arriba del todo** y lo urgente justo
 * debajo: lo decidió Richi el 23-sep, y cambia lo que decían la 0044 y el capítulo 5
 * de la Evolución para esta pantalla (0045, apartado «Seis»).
 */
export function Resumen({ alAbrirProducto }: { readonly alAbrirProducto: (id: string) => void }) {
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

  return (
    <div className="flex flex-col gap-e5">
      {hecho !== null && (
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
        <Tarjeta titulo="Todavía no tienes género" icono={<IconoVacio size={18} />} acento={ACENTO}>
          <EstadoVacio
            compacto
            icono={<IconoVacio size={24} />}
            titulo="La cámara está vacía"
            frase="En cuanto des de alta tu primer producto, aquí verás lo que se acaba, lo que caduca y lo que te cuesta."
            sinAccionPorque="Se empieza por «Productos», al lado en el menú."
          />
        </Tarjeta>
      ) : (
        <>
          {/*
            «Cómo va» · las cifras de Inventario con su flecha, **arriba del todo**.

            Hasta el 23-sep iban debajo de lo urgente (0044), que es lo que dice la
            Evolución 1.0 en su capítulo 5. Richi, usándolo: «poner el "Cómo va"
            arriba del todo en Inventario, ya que es lo que más se ve». Es una fila de
            cuatro cifras, así que no empuja lo urgente fuera de la pantalla: queda
            justo debajo, y en el móvil a un dedo. La primera es el valor de la cámara,
            la misma cuenta que `inventario_hoy` (una prueba contra la base lo vigila).
          */}
          <CifrasDeLaApp app="inventario" />

          <Mosaico>
            {/*
              La zona de atención, justo debajo de las cifras, y no se puede quitar:
              cada aviso con su botón.
            */}
            <LoQueNecesitaTuAtencion hoy={hoy} alAbrirProducto={alAbrirProducto} />

            {hoy.caducan.length > 0 && (
              <Tarjeta
                titulo="Caduca esta semana"
                icono={<IconoReloj size={18} />}
                acento={ACENTO}
                cuantos={hoy.caducan.length}
              >
                <ul className="flex flex-col gap-e1">
                  {hoy.caducan.map((lote) => (
                    <li key={lote.loteId} className="flex items-center gap-e2">
                      <button
                        type="button"
                        onClick={() => {
                          alAbrirProducto(lote.productoId);
                        }}
                        className="flex min-h-toque min-w-0 flex-1 flex-col justify-center rounded-grande px-e2 text-left hover:bg-fondo"
                      >
                        <span className="flex flex-wrap items-center gap-e2">
                          <span className="text-cuerpo font-medium">{lote.producto}</span>
                          {lote.congelado && <Etiqueta tono="info">congelado</Etiqueta>}
                        </span>
                        <span
                          className={
                            lote.dias < 0
                              ? 'text-secundario text-mal'
                              : 'text-secundario text-texto-suave'
                          }
                        >
                          {cuandoCaduca(lote.dias)}
                          {lote.lote === null ? '' : ` · lote ${lote.lote}`}
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

            {/* Los pedidos por recibir y a quién toca pedir (M7). */}
            {puedeVer(permisos, 'app.inventario') && <ComprasDeHoyEnHoy />}

            {/*
              La merma del día: «un cuadrado merma, con la merma de ese día, una
              gráfica pequeñita de los días anteriores y a la derecha ver a
              detalle». Una cifra sola no dice nada: la tira de catorce días dice si
              doce euros es mucho o poco.
            */}
            {puedeVer(permisos, 'accion.registrar_merma') && <MermaDeLaJornada />}

            {hoy.sinPrecio.length > 0 && (
              <SinPrecio productos={hoy.sinPrecio} alAbrirProducto={alAbrirProducto} />
            )}
          </Mosaico>
        </>
      )}
    </div>
  );
}

/**
 * Lo que necesita tu atención: bajo mínimo y agotado, con qué pedir.
 *
 * Los cuatro primeros a la vista y el resto detrás de «Ver todos», en la misma
 * tarjeta: abrir otra pantalla para ver el quinto sería perder lo que se estaba
 * mirando.
 */
function LoQueNecesitaTuAtencion({
  hoy,
  alAbrirProducto,
}: {
  readonly hoy: InventarioHoy;
  readonly alAbrirProducto: (id: string) => void;
}) {
  const [todos, setTodos] = useState(false);
  const cuantos = hoy.atencion.length;
  const nada = cuantos === 0 && hoy.caducan.length === 0 && hoy.sinPrecio.length === 0;
  const aLaVista = todos ? hoy.atencion : hoy.atencion.slice(0, AVISOS_A_LA_VISTA);
  const escondidos = cuantos - aLaVista.length;

  // Sin nada bajo mínimo pero con algo que caduca o sin precio, esta tarjeta no
  // tiene nada que decir: lo dicen las de al lado.
  if (!nada && cuantos === 0) return null;
  if (nada) {
    return (
      <Tarjeta
        titulo="Nada que atender"
        icono={<IconoAtencion size={18} />}
        acento="var(--color-bien)"
      >
        <p className="text-secundario text-texto-suave">
          Todo por encima de su mínimo, nada caduca esta semana y todo tiene precio.
        </p>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta
      titulo="Necesita tu atención"
      icono={<IconoAtencion size={18} />}
      acento="var(--color-atencion)"
      cuantos={cuantos}
      origen={`Sobre ${hoy.cuantosProductos} ${hoy.cuantosProductos === 1 ? 'producto' : 'productos'}, ahora mismo`}
    >
      <ul className="flex flex-col divide-y divide-borde">
        {aLaVista.map((producto) => (
          <li key={producto.id} className="py-e3 first:pt-0 last:pb-0">
            <LineaDeAtencion
              producto={producto}
              alAbrir={() => {
                alAbrirProducto(producto.id);
              }}
            />
          </li>
        ))}
      </ul>
      {(escondidos > 0 || todos) && cuantos > AVISOS_A_LA_VISTA && (
        <div className="mt-e3 border-t border-borde pt-e2">
          <Boton
            tono="texto"
            ancho
            aria-expanded={todos}
            onClick={() => {
              setTodos(!todos);
            }}
          >
            {todos ? 'Ver solo los más urgentes' : `Ver todos · ${escondidos} más`}
          </Boton>
        </div>
      )}
    </Tarjeta>
  );
}

/**
 * Una línea de atención, con las cuatro cosas que exige el centro de alertas, en
 * tres líneas y no en nueve (entrega V).
 *
 *   1. **Qué**: el producto y su estado, y tocándolo se abre su ficha.
 *   2. **Por qué y qué impacto**: «0 de 3 ud · se agota hoy a las 12:55».
 *   3. **Qué hacer**: «Pide 1 × Caja de 6 botellas» y el botón de pedírselo.
 *
 * La cuenta de por qué esa cantidad («para unos 5 días, con un 20 % de margen…»)
 * va plegada en «¿Por qué?»: está para quien la quiere leer.
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
  const [porQue, setPorQue] = useState(false);

  const cuanto =
    producto.minimo === null
      ? `Quedan ${conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}`
      : `${conUnidadDeUso(producto.cantidad, producto.unidadDeUso)} de ${conUnidadDeUso(producto.minimo, producto.unidadDeUso)} de mínimo`;
  const cuando = agota === null ? null : `se agota ${agota}`;

  return (
    <div className="flex flex-col gap-e2">
      <button
        type="button"
        onClick={alAbrir}
        aria-label={`${producto.nombre}: ver la ficha`}
        className="-mx-e2 flex min-h-toque flex-col justify-center rounded-grande px-e2 text-left hover:bg-fondo"
      >
        <span className="flex flex-wrap items-center gap-e2">
          <span className="text-cuerpo font-medium">{producto.nombre}</span>
          <Etiqueta tono={TONO_DEL_ESTADO[producto.estado]}>
            {NOMBRE_DEL_ESTADO[producto.estado]}
          </Etiqueta>
        </span>
        <span className="text-secundario text-texto-suave">
          {cuanto}
          {cuando === null ? '' : ` · ${cuando}`}
        </span>
      </button>

      {producto.sugerencia !== null && (
        <div className="flex flex-wrap items-center justify-between gap-e2">
          <p className="min-w-0 text-secundario">
            {/* Como se pide, en cajas enteras: «Pide 2 × Caja 10 kg», no «13,6 kg». */}
            <strong className="font-semibold">
              Pide{' '}
              {comoSePide(
                producto.sugerencia.formatos,
                producto.formato,
                producto.factor,
                producto.unidadDeUso,
              )}
            </strong>{' '}
            <button
              type="button"
              aria-expanded={porQue}
              onClick={() => {
                setPorQue(!porQue);
              }}
              className="inline-flex min-h-[28px] items-center rounded-chico px-e1 text-texto-suave underline decoration-dotted underline-offset-2 hover:text-texto"
            >
              {porQue ? 'Ocultar' : '¿Por qué?'}
            </button>
          </p>
          {/* Y el botón que hace algo con el aviso: pedírselo a su proveedor. */}
          {producto.proveedorId !== null && puedePedir && (
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
      )}

      {producto.sugerencia === null && agota === null && producto.consumo.porque !== null && (
        <p className="text-secundario text-texto-tenue">{producto.consumo.porque}</p>
      )}

      {porQue && producto.sugerencia !== null && (
        <p className="rounded-grande bg-fondo px-e3 py-e2 text-secundario text-texto-suave">
          {producto.sugerencia.motivo}
          {agota === null
            ? ''
            : ` Se gasta al ritmo de estos ${producto.consumo.diasMirados} días.`}
        </p>
      )}
    </div>
  );
}

/** Los productos sin precio: cuentan cero en el valor de la cámara. */
function SinPrecio({
  productos,
  alAbrirProducto,
}: {
  readonly productos: InventarioHoy['sinPrecio'];
  readonly alAbrirProducto: (id: string) => void;
}) {
  const [todos, setTodos] = useState(false);
  const aLaVista = todos ? productos : productos.slice(0, 5);
  return (
    <Tarjeta
      titulo="Sin precio todavía"
      icono={<IconoDinero size={18} />}
      acento={ACENTO}
      cuantos={productos.length}
      origen="Cuentan cero en el valor de la cámara"
    >
      <ul className="flex flex-col">
        {aLaVista.map((producto) => (
          <li key={producto.id}>
            <button
              type="button"
              onClick={() => {
                alAbrirProducto(producto.id);
              }}
              className="flex min-h-toque w-full items-center rounded-grande px-e2 text-left text-cuerpo hover:bg-fondo"
            >
              {producto.nombre}
            </button>
          </li>
        ))}
      </ul>
      {productos.length > 5 && (
        <Boton
          tono="texto"
          ancho
          aria-expanded={todos}
          onClick={() => {
            setTodos(!todos);
          }}
        >
          {todos ? 'Ver menos' : `Ver todos · ${productos.length - 5} más`}
        </Boton>
      )}
    </Tarjeta>
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
      icono={<IconoOrganizacion size={18} />}
      acento={ACENTO}
      accion={
        <EnlaceDeTarjeta
          etiqueta="Ver pedidos"
          onClick={() => {
            navegar('/inventario/compras/pedidos');
          }}
        />
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
        <ul className="flex flex-col gap-e3">
          {datos.llegan.map((l) => (
            <li key={l.pedidoId} className="flex flex-wrap items-center gap-e3">
              <span className="min-w-0 flex-1">
                <span className="block text-cuerpo font-medium">{l.proveedor}</span>
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
                <span className="block text-cuerpo font-medium">Toca pedirle a {t.proveedor}</span>
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

function cuandoCaduca(dias: number): string {
  if (dias < 0) return `Caducó hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Caduca hoy';
  if (dias === 1) return 'Caduca mañana';
  return `Caduca en ${dias} días`;
}

/**
 * La merma de la jornada · el cuadrado que pedía la lista.
 *
 * Es lo único de esta pantalla que **se escribe**, no que se lee: lo demás son
 * avisos que llevan a una ficha, y esto es un botón que hay que poder pulsar en
 * mitad de un servicio.
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
      icono={<IconoQuitar size={18} />}
      acento={ACENTO}
      origen={
        conPrecios && datos.mediaCentimos !== null && datos.mediaCentimos !== undefined
          ? `La media de estos catorce días es ${comoDinero(datos.mediaCentimos)}`
          : 'Lo que ha salido de cámara sin venderse'
      }
      accion={
        <EnlaceDeTarjeta
          etiqueta="Ver la merma a detalle"
          onClick={() => {
            navegar('/inventario/movimientos/mermas');
          }}
        />
      }
    >
      {datos === undefined ? (
        <Cargando que="la merma" lineas={2} />
      ) : (
        <>
          <div className="flex items-end justify-between gap-e4">
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
            <div className="w-[45%] min-w-[7rem]">
              <Tira
                titulo="Merma de los últimos catorce días"
                puntos={datos.dias.map((dia) => ({
                  valor: conPrecios ? (dia.valorCentimos ?? 0) : dia.cuantas,
                  cuando: comoSeLeeLaFecha(dia.fecha),
                }))}
                formato={(v) => (conPrecios ? comoDinero(v) : String(v))}
                color={ACENTO}
                alto={44}
              />
            </div>
          </div>

          {datos.deHoy.loPeor !== null && (
            <p className="mt-e2 text-secundario text-texto-suave">
              Lo más caro: {datos.deHoy.loPeor.producto}
              {conPrecios ? ` · ${comoDinero(datos.deHoy.loPeor.valorCentimos)}` : ''}
            </p>
          )}

          {datos.puedeApuntar && (
            <div className="mt-e3">
              <Boton
                tono="principal"
                icono={<IconoAnadir size={18} />}
                onClick={() => {
                  setApuntando(true);
                }}
              >
                Apuntar merma
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
