import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CATEGORIAS_FISCALES,
  NOMBRE_DEL_ALERGENO,
  cantidad,
  costeDeLinea,
  NOMBRE_DEL_ESTADO,
  TIPOS_DE_IVA_DE_COMPRA,
  centimos,
  comoEstaElMargen,
  comoPorcentaje,
  comoSeCompraDe,
  comoSeDiceElTipo,
  comoSePide,
  conIva,
  margenDe,
  milesimas,
  presentacionDe,
  sinIva,
  type ComoSeCompra,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  Cifra,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Interruptor,
  PanelLateral,
  Proporcion,
  Selector,
  clases,
  usarDeshacer,
} from '@estook/ui';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarVolverALeerElProducto } from '../ganchos/usarVolverALeerElProducto.ts';
import { SelectorDeCategoria } from './SelectorDeCategoria.tsx';
import { MoverGenero, type QueSeMueve } from './MoverGenero.tsx';
import { CampoPrecioDeCompra } from './CampoPrecioDeCompra.tsx';
import { ComoLoCompras } from './ComoLoCompras.tsx';
import { Congelar, QuitarLote, type LoteQueSeQuita } from './Lotes.tsx';
import { HistoricoDePrecios } from './HistoricoDePrecios.tsx';
import { IconoAnadir, IconoQuitar } from '@estook/iconos';
import {
  COMO_SE_LLAMA_EL_MOVIMIENTO,
  NOMBRE_DE_LA_CATEGORIA_FISCAL,
  TONO_DEL_ESTADO,
  comoDinero,
  comoSeLeeLaFecha,
  conUnidadDeUso,
  cuandoSeAgota,
  type CategoriaDelLocal,
  type ProductoEnLista,
  type ProveedorDelLocal,
  type UnProducto,
} from './contrato.ts';

/**
 * La ficha de un producto (M6).
 *
 * «La ficha se abre en panel lateral derecho **sin tapar la lista**» (B5). En
 * móvil el mismo componente se comporta como una hoja de abajo arriba, que es lo
 * que hace `PanelLateral`.
 *
 * ── Lo que hay dentro, en el orden en que hace falta ─────────────────────────
 *
 *   1. Lo que hay en cámara, y hasta cuándo dura
 *   2. Los dos botones: ha llegado y ha salido. Cuadrar la cámara se abre desde
 *      la propia cifra —«¿no cuadra?»—, que es donde se nota
 *   3. Lo que cuesta, con su histórico por proveedor
 *   4. El libro de movimientos
 *   5. Lotes y caducidades
 *   6. La ficha, para corregirla
 *
 * El orden no es decorativo: quien abre esto en mitad de un servicio viene a
 * apuntar algo, no a editar un rendimiento.
 */
export function FichaDeProducto({
  productoId,
  alCerrar,
  categorias,
  proveedores,
}: {
  readonly productoId: string | null;
  readonly alCerrar: () => void;
  readonly categorias: readonly CategoriaDelLocal[];
  readonly proveedores: readonly ProveedorDelLocal[];
}) {
  const { cliente, permisos } = usarSesion();
  const cache = useQueryClient();

  const [haciendo, setHaciendo] = useState<QueSeMueve | 'precio' | 'venta' | 'rendimiento' | null>(
    null,
  );
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);
  const [todosLosMovimientos, setTodosLosMovimientos] = useState(false);
  const [quitandoLote, setQuitandoLote] = useState<LoteQueSeQuita | null>(null);
  /** Congelando: un lote, o una parte nueva (`lote: null`). */
  const [congelando, setCongelando] = useState<{
    readonly lote: { readonly id: string; readonly caducaEl: string | null } | null;
  } | null>(null);

  const puedeTocar = puedeEditar(permisos, 'app.inventario');
  const puedeTocarPrecios = puedeEditar(permisos, 'dato.precio_de_compra');

  const consulta = useQuery({
    queryKey: ['un_producto', productoId],
    enabled: productoId !== null,
    queryFn: async (): Promise<UnProducto> => {
      const respuesta = await cliente.consultar<UnProducto>('un_producto', {
        producto_id: productoId ?? '',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: ['un_producto', productoId] });
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
    await cache.invalidateQueries({ queryKey: ['inventario_hoy'] });
  }

  const datos = consulta.data;
  const seAgota =
    datos === undefined
      ? null
      : cuandoSeAgota(datos.producto.seAgotaEn, datos.producto.diasDeCobertura);
  const vigente = datos?.precios.find((precio) => precio.vigente);
  const anteriores = datos?.precios.filter((precio) => !precio.vigente) ?? [];

  return (
    <PanelLateral
      abierta={productoId !== null}
      alCerrar={alCerrar}
      titulo={datos === undefined ? 'Producto' : datos.producto.nombre}
    >
      {consulta.isPending && <Cargando que="la ficha" />}

      {datos !== undefined && (
        <div className="flex flex-col gap-e4">
          {error !== null && <ErrorEnCristiano error={error} />}
          {/*
            ── Por qué esto NO lleva «Deshacer» ─────────────────────────────

            Lo llevaba, y era mentira. Apuntar género abría la barra de deshacer
            con un botón cuyo `deshacer` era `() => undefined`: se pulsaba, la
            barra desaparecía y **el movimiento seguía apuntado**. Un botón mudo
            ya es malo; uno que da a entender que ha revertido una entrada de
            género es peor, porque quien lo pulsa se va creyendo que la cámara
            dice otra cosa.

            Y no se arregla poniéndole un deshacer de verdad, porque «el stock es
            un libro de movimientos» (regla 8): el libro **solo se añade**, nunca
            se borra ni se edita, y eso es lo que hace que se pueda auditar. Un
            movimiento se corrige con otro movimiento, y el ajuste ya está ahí,
            con su motivo. El contrario automático es M8.

            Así que se dice, en la misma frase que confirma lo hecho.
          */}
          {noticia !== null && (
            <Aviso
              tono="bien"
              titulo={noticia}
              esNoticia
              alCerrar={() => {
                setNoticia(null);
              }}
            >
              Con tu nombre y la hora.
            </Aviso>
          )}

          {datos.producto.esEjemplo && (
            <Aviso tono="info" titulo="Esto es un ejemplo">
              No cuenta para nada, y se quita desde el Panel.
            </Aviso>
          )}

          {/*
            ── Aquí había un aviso sobre el aprovechamiento, y se va ──────────
            Decía «el aprovechamiento está sin comprobar, corrígelo en la ficha de
            abajo», en amarillo y en todos los productos creados a mano, que son
            casi todos. «Nadie sabe cuánto se aprovecha al llegar, sino cuando está
            trabajando»: no es algo que se conteste en una casilla, es algo que se
            **mide** —con las mermas que se apuntan y, en M9, con la ficha técnica
            de cada plato—. Así que ni se pregunta ni se reclama: la etiqueta «sin
            verificar» sigue en la lista, que es lo que es.
          */}

          {/* ── 0 · De qué producto estamos hablando ───────────────────── */}

          {/*
            ── Por qué esto es lo primero, y por qué son pastillas ───────────

            El panel se abre desde tres sitios y en todos hace falta lo mismo
            para reconocerlo: de qué categoría es, de quién viene y en qué
            envase. Estaba, y estaba abajo del todo, en la rejilla de «La ficha»,
            que es lo último que se lee. Así que la ficha empezaba con una cifra
            sin contexto.
          */}
          <div className="flex flex-wrap items-center gap-e2">
            {datos.producto.categoria !== null && <Chip>{datos.producto.categoria}</Chip>}
            {datos.producto.proveedor !== null && <Chip>{datos.producto.proveedor}</Chip>}
            {datos.producto.formato !== null && <Chip>{datos.producto.formato}</Chip>}
            {datos.producto.congelado && <Etiqueta tono="info">congelado</Etiqueta>}
            {!datos.producto.activo && <Etiqueta>desactivado</Etiqueta>}
          </div>

          {/* ── 1 · Lo que hay ─────────────────────────────────────────── */}

          {/*
            ── Una etiqueta y su dato, y solo lo que hay ─────────────────────
            Eran cinco frases sueltas —«llevo 1 día de historia y necesito 7
            para no inventarme una cifra», «mínimo puesto a mano», «última línea
            del libro de movimientos»— y había que leerlas todas para saber cómo
            estaba el producto. Ahora es una rejilla: qué, y cuánto.
          */}
          <section className="flex flex-col gap-e3 rounded-grande border border-borde bg-superficie p-e4 shadow-s1">
            <div className="flex flex-wrap items-start justify-between gap-e2">
              <Cifra
                etiqueta="Lo que hay en cámara"
                valor={datos.producto.cantidad}
                formato={(v) => conUnidadDeUso(v, datos.producto.unidadDeUso)}
                origen="Según el libro de movimientos"
              />
              <Etiqueta tono={TONO_DEL_ESTADO[datos.producto.estado]}>
                {NOMBRE_DEL_ESTADO[datos.producto.estado]}
              </Etiqueta>
            </div>

            {/*
              ── La barra del mínimo ───────────────────────────────────────
              «La cifra manda, el historial explica» (Manifiesto 12), y una
              cifra sola no dice si es mucho o poco. Con el mínimo puesto, esto
              contesta de un vistazo y de lejos —que es como se mira una pantalla
              en una cocina— lo que la cifra sola obliga a calcular.
            */}
            {datos.producto.minimo !== null && datos.producto.minimo > 0 && (
              <BarraDelMinimo
                hay={datos.producto.cantidad}
                minimo={datos.producto.minimo}
                unidadDeUso={datos.producto.unidadDeUso}
              />
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-e4 gap-y-e1 text-secundario">
              {datos.puedeVerPrecios &&
                datos.producto.valorCentimos !== null &&
                datos.producto.valorCentimos !== undefined && (
                  <Par que="Vale">
                    {comoDinero(datos.producto.valorCentimos)}
                    {datos.producto.valorEsEstimado === true && (
                      <span className="font-normal text-texto-suave"> · a su precio de hoy</span>
                    )}
                  </Par>
                )}
              {datos.producto.minimo !== null && (
                <Par que="Mínimo">
                  {conUnidadDeUso(datos.producto.minimo, datos.producto.unidadDeUso)}
                </Par>
              )}
              {datos.producto.consumo.porDia !== null && (
                <Par que="Se gasta">
                  {conUnidadDeUso(datos.producto.consumo.porDia, datos.producto.unidadDeUso)} al día
                </Par>
              )}
              {seAgota !== null && <Par que="Se acaba">{seAgota}</Par>}
              {datos.producto.sugerencia !== null && (
                <Par que="Pide">
                  {/* En cajas enteras, como se pide (M7): «2 × Caja 10 kg». */}
                  {comoSePide(
                    datos.producto.sugerencia.formatos,
                    datos.producto.formato,
                    datos.producto.factor,
                    datos.producto.unidadDeUso,
                  )}
                  <span className="font-normal text-texto-suave">
                    {' '}
                    · {datos.producto.sugerencia.motivo}
                  </span>
                </Par>
              )}
            </dl>

            {datos.producto.consumo.porDia === null && (
              <p className="text-etiqueta text-texto-tenue">
                Con unos días de movimientos, aquí sale cuánto se gasta y cuándo se acaba.
              </p>
            )}

            {puedeTocar && (
              <div>
                <Boton
                  tono="texto"
                  onClick={() => {
                    setHaciendo('ajuste');
                  }}
                >
                  ¿No cuadra lo que hay? Corrígelo
                </Boton>
              </div>
            )}
          </section>

          {/*
            ── 2 · Las dos cosas que se hacen delante de una cámara ────────

            Eran tres botones del mismo tamaño —ha llegado, ha salido, ajustar— y
            decían que las tres cosas eran igual de normales. No lo son: entrar y
            salir es el día a día; cuadrar es la excepción. «Ajustar lo que hay»
            no debería estar ahí, y no está: se abre desde la cifra de arriba,
            «¿no cuadra?», que es exactamente donde alguien nota que no cuadra.
          */}
          {puedeTocar && (
            <Botones>
              <Boton
                tono="principal"
                icono={<IconoAnadir size={18} />}
                onClick={() => {
                  setHaciendo('entrada');
                }}
              >
                Ha llegado género
              </Boton>
              <Boton
                tono="secundario"
                icono={<IconoQuitar size={18} />}
                onClick={() => {
                  setHaciendo('salida');
                }}
              >
                Ha salido género
              </Boton>
            </Botones>
          )}

          {/* ── 3 · Lo que cuesta ─────────────────────────────────────── */}

          {datos.puedeVerPrecios && (
            <Seccion
              titulo="Lo que cuesta"
              accion={
                puedeTocarPrecios ? (
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      setHaciendo('precio');
                    }}
                  >
                    Cambiar el precio
                  </Boton>
                ) : null
              }
            >
              {datos.producto.precioCentimos === null ||
              datos.producto.precioCentimos === undefined ? (
                <p className="text-secundario text-texto-suave">
                  Sin precio. Se usa igual, y cuenta cero hasta que lo tenga.
                </p>
              ) : (
                <>
                  <p className="text-cuerpo">
                    <strong>{comoDinero(datos.producto.precioCentimos)}</strong>{' '}
                    <span className="text-texto-suave">{loQueEsElPrecio(datos.producto)}</span>
                  </p>
                  {/*
                    Se guarda sin IVA, que es lo que cuesta de verdad al negocio:
                    el IVA de compra se recupera. Y al lado, con IVA, que es lo que
                    dice el ticket, para reconocerlo de un vistazo.
                  */}
                  {datos.producto.ivaDeCompra !== null && datos.producto.ivaDeCompra > 0 && (
                    <p className="text-etiqueta text-texto-suave">
                      Sin IVA. Con IVA ({comoSeDiceElTipo(datos.producto.ivaDeCompra)}),{' '}
                      {comoDinero(
                        conIva(centimos(datos.producto.precioCentimos), datos.producto.ivaDeCompra),
                      )}
                      .
                    </p>
                  )}
                  {/*
                    Quién lo puso y desde cuándo. «Lo que hace cada uno queda con
                    su nombre» (Manifiesto 8), y un precio mal metido se arrastra a
                    todos los escandallos.
                  */}
                  {vigente !== undefined && (
                    <p className="text-etiqueta text-texto-tenue">
                      Desde el {comoSeLeeLaFecha(vigente.desde)}
                      {vigente.proveedor === null ? '' : ` · ${vigente.proveedor}`}
                      {vigente.quien === null ? '' : ` · lo puso ${vigente.quien}`}
                    </p>
                  )}
                </>
              )}

              {/*
                «Si llega un precio nuevo se actualiza, y se comparan los de antes
                de forma optimizada, tipo gráfica.» Con dos precios o más, lo que
                ha costado a cada proveedor, en €/kg, €/l o €/ud: la misma medida
                aunque el envase haya cambiado.
              */}
              <HistoricoDePrecios
                precios={datos.precios}
                unidadDeUso={datos.producto.unidadDeUso}
              />

              {/* El histórico, plegado: se abre cuando se busca, no se lee siempre. */}
              {anteriores.length > 0 && (
                <details className="text-secundario">
                  <summary className="cursor-pointer text-texto-suave">
                    {anteriores.length === 1
                      ? 'Un precio anterior'
                      : `${anteriores.length} precios anteriores`}
                  </summary>
                  <ul className="mt-e2 flex flex-col">
                    {anteriores.map((precio) => (
                      <li
                        key={precio.id}
                        className="flex flex-wrap items-baseline justify-between gap-e2 border-b border-borde py-e1 last:border-0"
                      >
                        <span>
                          {comoDinero(precio.precioCentimos)}
                          {precio.proveedor === null ? '' : ` · ${precio.proveedor}`}
                        </span>
                        <span className="text-etiqueta text-texto-suave">
                          {comoSeLeeLaFecha(precio.desde)}
                          {precio.hasta === null ? '' : ` – ${comoSeLeeLaFecha(precio.hasta)}`}
                          {precio.quien === null ? '' : ` · ${precio.quien}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Seccion>
          )}

          {/* ── 3½ · Lo que deja ──────────────────────────────────────── */}

          {/*
            ── El otro extremo de la cuenta ─────────────────────────────────

            Estook sabía lo que cuesta el género y no sabía **lo que deja**. Para
            un producto que se vende tal cual —una caña, un botellín, una botella
            de vino— eso es una resta, y una resta que casi todo el mundo hace
            mal: el precio de la pizarra lleva IVA y el coste no, así que restar a
            pelo es regalarse el impuesto como si fuera margen.
            La cuenta la hace el dominio (`margenDe`), aquí solo se pinta.
          */}
          {datos.puedeVerPrecios && puedeTocar && (
            <LoQueDeja
              producto={datos.producto}
              alPonerPrecio={() => {
                setHaciendo('venta');
              }}
            />
          )}

          {/* ── 4 · El libro ──────────────────────────────────────────── */}

          <Seccion titulo="Últimos movimientos">
            {datos.movimientos.length === 0 ? (
              <p className="text-secundario text-texto-suave">Todavía no se ha movido nada.</p>
            ) : (
              <>
                <ul className="flex flex-col">
                  {(todosLosMovimientos ? datos.movimientos : datos.movimientos.slice(0, 5)).map(
                    (movimiento) => (
                      <li
                        key={movimiento.id}
                        className="flex items-baseline justify-between gap-e3 border-b border-borde py-e2 last:border-0"
                      >
                        <span className="min-w-0">
                          <span className="block">
                            {COMO_SE_LLAMA_EL_MOVIMIENTO[movimiento.tipo] ?? movimiento.tipo}{' '}
                            <strong>
                              {movimiento.cantidad > 0 ? '+' : ''}
                              {conUnidadDeUso(movimiento.cantidad, datos.producto.unidadDeUso)}
                            </strong>
                          </span>
                          {movimiento.motivo !== null && (
                            <span className="block truncate text-etiqueta text-texto-suave">
                              {movimiento.motivo}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          {/* Lo que se cobró, en las ventas: es la mitad de la
                              línea, y sin ella «Vendido −2 ud» no cuenta nada. */}
                          {movimiento.ingresoCentimos !== null &&
                            movimiento.ingresoCentimos !== undefined && (
                              <span className="block font-semibold text-bien">
                                {comoDinero(movimiento.ingresoCentimos)}
                              </span>
                            )}
                          <span className="block text-etiqueta text-texto-suave">
                            {comoSeLeeLaFecha(movimiento.fechaOperativa)}
                            {movimiento.quien === null ? '' : ` · ${movimiento.quien}`}
                          </span>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
                {datos.movimientos.length > 5 && !todosLosMovimientos && (
                  <div>
                    <Boton
                      tono="texto"
                      onClick={() => {
                        setTodosLosMovimientos(true);
                      }}
                    >
                      Ver los {datos.movimientos.length}
                    </Boton>
                  </div>
                )}
              </>
            )}
          </Seccion>

          {/* ── 5 · Lotes ─────────────────────────────────────────────── */}

          {/*
            «Si hay un producto caducado, poder quitarlo con un botón en ese lote;
             si no, se queda siempre y no tiene sentido.» Cada lote lleva su
            «Quitar» —se ha gastado o se ha tirado— y su «Congelar». Y arriba,
            «Congelar una parte», para cuando la mitad va al congelador.
          */}
          {(datos.lotes.length > 0 || puedeTocar) && (
            <Seccion
              titulo="Lotes y caducidades"
              accion={
                puedeTocar ? (
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      setCongelando({ lote: null });
                    }}
                  >
                    Congelar una parte
                  </Boton>
                ) : null
              }
            >
              {datos.lotes.length === 0 ? (
                <p className="text-secundario text-texto-suave">
                  Nada con fecha. Cuando entre género con su caducidad, sale aquí.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {datos.lotes.map((lote) => {
                    const caducado = lote.diasParaCaducar !== null && lote.diasParaCaducar < 0;
                    return (
                      <li
                        key={lote.id}
                        className="flex flex-wrap items-center justify-between gap-e2 border-b border-borde py-e2 last:border-0"
                      >
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-e2">
                            <span className={caducado ? 'text-mal' : undefined}>
                              {lote.caducaEl === null
                                ? 'Sin fecha de caducidad'
                                : `${caducado ? 'Caducó' : 'Caduca'} el ${comoSeLeeLaFecha(lote.caducaEl)}`}
                            </span>
                            {lote.congeladoEl !== null && (
                              <Etiqueta tono="info">
                                congelado el {comoSeLeeLaFecha(lote.congeladoEl)}
                              </Etiqueta>
                            )}
                          </span>
                          <span className="block text-etiqueta text-texto-suave">
                            {lote.codigo === null
                              ? `Llegó el ${comoSeLeeLaFecha(lote.recibidoEl)}`
                              : `Lote ${lote.codigo}`}
                          </span>
                        </span>
                        {puedeTocar && (
                          <span className="flex flex-wrap gap-e1">
                            {lote.congeladoEl === null && (
                              <Boton
                                tono="texto"
                                onClick={() => {
                                  setCongelando({
                                    lote: { id: lote.id, caducaEl: lote.caducaEl },
                                  });
                                }}
                              >
                                Congelar
                              </Boton>
                            )}
                            <Boton
                              tono={caducado ? 'principal' : 'secundario'}
                              onClick={() => {
                                setQuitandoLote({
                                  id: lote.id,
                                  producto: datos.producto.nombre,
                                  codigo: lote.codigo,
                                  caducaEl: lote.caducaEl,
                                  unidadDeUso: datos.producto.unidadDeUso,
                                });
                              }}
                            >
                              Quitar
                            </Boton>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Seccion>
          )}

          {/* ── 6 · La ficha ──────────────────────────────────────────── */}

          <Seccion
            titulo="La ficha"
            accion={
              puedeTocar ? (
                <Boton
                  tono="secundario"
                  onClick={() => {
                    setEditando(true);
                  }}
                >
                  Corregir la ficha
                </Boton>
              ) : null
            }
          >
            {/* Solo lo que dice algo: «código de barras: no tiene» no dice nada. */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-e4 gap-y-e1 text-secundario">
              <Par que="Categoría">{datos.producto.categoria ?? 'Sin categoría'}</Par>
              <Par que="Proveedor">{datos.producto.proveedor ?? 'Sin proveedor'}</Par>
              <Par que="Envase">{datos.producto.formato ?? 'Suelto'}</Par>
              {datos.producto.factor !== 1 && (
                <Par que="Cuánto trae">
                  {datos.producto.factor.toLocaleString('es-ES')} {datos.producto.unidadDeUso}
                </Par>
              )}
              <Par que="Alérgenos">
                {datos.alergenos.length === 0
                  ? 'Ninguno declarado'
                  : datos.alergenos.map((a) => NOMBRE_DEL_ALERGENO[a]).join(', ')}
              </Par>
              {datos.producto.codigoDeBarras !== null && (
                <Par que="Código de barras">{datos.producto.codigoDeBarras}</Par>
              )}
              {datos.producto.pesoVariable && <Par que="Peso variable">Sí, entra por peso</Par>}
            </dl>

            {/*
              ── El aprovechamiento, que era una etiqueta que no se podía quitar ──

              «Sin verificar» salía en naranja en toda la lista de productos, no
              se podía cambiar desde ninguna parte y volvía sola cada vez que se
              guardaba la ficha. Así que decía lo mismo de todos: nada.

              Aquí está lo que de verdad quiere decir —cuánto se aprovecha de lo
              que se compra, que multiplica el coste de todo lo que lo lleve— con
              su cifra, con si está medido o supuesto, y **con el botón de
              medirlo**. Un dato que no se puede corregir desde donde se lee es un
              dato que nadie corrige.
            */}
            <ElAprovechamiento
              producto={datos.producto}
              puedeTocar={puedeTocar}
              alMedirlo={() => {
                setHaciendo('rendimiento');
              }}
            />
          </Seccion>

          {/* ── 7 · Quitarlo de en medio, y traerlo de vuelta ─────────── */}

          {puedeTocar &&
            (datos.producto.activo ? (
              <Desactivar
                producto={datos}
                alHecho={(frase) => {
                  setNoticia(frase);
                  void refrescar();
                  alCerrar();
                }}
                alFallar={setError}
              />
            ) : (
              <Reactivar
                producto={datos}
                alHecho={(frase) => {
                  setNoticia(frase);
                  void refrescar();
                }}
                alFallar={setError}
              />
            ))}
        </div>
      )}

      {datos !== undefined && (
        <>
          {quitandoLote !== null && (
            <QuitarLote
              lote={quitandoLote}
              alCerrar={() => {
                setQuitandoLote(null);
              }}
              alHecho={(frase) => {
                setQuitandoLote(null);
                setNoticia(frase);
              }}
            />
          )}

          {congelando !== null && (
            <Congelar
              productoId={datos.producto.id}
              producto={datos.producto.nombre}
              lote={congelando.lote}
              alCerrar={() => {
                setCongelando(null);
              }}
              alHecho={(frase) => {
                setCongelando(null);
                setNoticia(frase);
              }}
            />
          )}

          <MoverGenero
            que={
              haciendo === 'precio' || haciendo === 'venta' || haciendo === 'rendimiento'
                ? null
                : haciendo
            }
            producto={datos.producto}
            puedeVerPrecios={datos.puedeVerPrecios}
            preciosConIva={datos.preciosConIva}
            alCerrar={() => {
              setHaciendo(null);
            }}
            alHecho={(frase) => {
              setHaciendo(null);
              setNoticia(frase);
              void refrescar();
            }}
            alFallar={setError}
          />

          <CambiarPrecio
            abierta={haciendo === 'precio'}
            producto={datos}
            proveedores={proveedores}
            alCerrar={() => {
              setHaciendo(null);
            }}
            alHecho={(frase) => {
              setHaciendo(null);
              setNoticia(frase);
              void refrescar();
            }}
            alFallar={setError}
          />

          <PrecioDeVenta
            abierta={haciendo === 'venta'}
            producto={datos}
            alCerrar={() => {
              setHaciendo(null);
            }}
            alHecho={(frase) => {
              setHaciendo(null);
              setNoticia(frase);
              void refrescar();
            }}
            alFallar={setError}
          />

          <MedirElAprovechamiento
            abierta={haciendo === 'rendimiento'}
            producto={datos}
            alCerrar={() => {
              setHaciendo(null);
            }}
            alHecho={(frase) => {
              setHaciendo(null);
              setNoticia(frase);
              void refrescar();
            }}
            alFallar={setError}
          />

          <CorregirLaFicha
            abierta={editando}
            producto={datos}
            categorias={categorias}
            proveedores={proveedores}
            alCerrar={() => {
              setEditando(false);
            }}
            alHecho={(frase) => {
              setEditando(false);
              setNoticia(frase);
              void refrescar();
            }}
            alFallar={setError}
          />
        </>
      )}
    </PanelLateral>
  );
}

/**
 * Traer de vuelta un producto desactivado.
 *
 * ── El agujero que esto tapa ─────────────────────────────────────────────────
 *
 * «Si algo se puede poner, tiene que poderse quitar» es la comprobación que más
 * fallos ha destapado en este proyecto. Aquí estaba **al revés**: se podía
 * quitar y **no se podía traer de vuelta**.
 *
 * El comando `reactivar_producto` existía desde el primer día de M6, estaba
 * registrado en el catálogo y probado en el servidor. Lo que no había era una
 * pantalla que lo llamara: tanto que estaba apuntado como excepción en
 * `se-usan.prueba.ts` con la razón «no lo llama nadie todavía». Un producto
 * desactivado desaparecía de la lista y **no había forma de volver a verlo**,
 * salvo llamando a la API a mano.
 *
 * Lo destapó medir la cobertura del catálogo: de 62 operaciones, 19 no las
 * ejecutaba ninguna prueba, y esta era una.
 */
function Reactivar({
  producto,
  alHecho,
  alFallar,
}: {
  readonly producto: UnProducto;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const [volviendo, setVolviendo] = useState(false);

  async function reactivar() {
    setVolviendo(true);
    const respuesta = await cliente.ejecutar('reactivar_producto', {
      producto_id: producto.producto.id,
    });
    setVolviendo(false);

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }

    alHecho(`«${producto.producto.nombre}» vuelve a estar en tus listas.`);
  }

  return (
    <div className="border-t border-borde pt-e3">
      <Aviso tono="atencion" titulo="Este producto está desactivado">
        No sale en las listas ni cuenta para nada, pero <strong>no se ha perdido</strong>: su
        histórico de movimientos y de precios sigue entero.
      </Aviso>
      <div className="mt-e3">
        <Boton
          tono="secundario"
          cargando={volviendo}
          textoCargando="Activando"
          onClick={() => {
            void reactivar();
          }}
        >
          Volver a activarlo
        </Boton>
      </div>
    </div>
  );
}

/**
 * Desactivar un producto que ya no se usa.
 *
 * «**Un producto en uso no se borra:** se desactiva y sigue en el histórico»
 * (Manifiesto 28). Y «**se avisa de en cuántas fichas está antes de
 * desactivar**» (Auditoría 2.6), que es lo que evita que alguien se cargue el
 * escandallo de siete platos por limpiar la lista.
 *
 * El aviso se enseña siempre, con el número que dé el servidor. Hoy es cero
 * porque las fichas técnicas son M9; el día que existan, esta pantalla no cambia.
 */
function Desactivar({
  producto,
  alHecho,
  alFallar,
}: {
  readonly producto: UnProducto;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const [confirmando, setConfirmando] = useState(false);
  const [quitando, setQuitando] = useState(false);

  async function desactivar() {
    setQuitando(true);
    const respuesta = await cliente.ejecutar('desactivar_producto', {
      producto_id: producto.producto.id,
    });
    setQuitando(false);

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }

    alHecho(`«${producto.producto.nombre}» ya no sale en las listas. Sigue en el histórico.`);
  }

  if (!confirmando) {
    return (
      <div className="border-t border-borde pt-e3">
        <Boton
          tono="texto"
          onClick={() => {
            setConfirmando(true);
          }}
        >
          Ya no uso este producto
        </Boton>
      </div>
    );
  }

  return (
    <Aviso
      tono="atencion"
      titulo="Se desactiva, no se borra"
      accion={
        <Botones>
          <Boton
            tono="texto"
            onClick={() => {
              setConfirmando(false);
            }}
          >
            Mejor no
          </Boton>
          <Boton
            tono="peligro"
            cargando={quitando}
            textoCargando="Desactivando"
            onClick={() => {
              void desactivar();
            }}
          >
            Desactivarlo
          </Boton>
        </Botones>
      }
    >
      Deja de salir en los buscadores y en los desplegables, y sigue entero en el histórico: sus
      movimientos, sus precios y lo que costó no se tocan.{' '}
      {producto.enCuantasFichas === 0
        ? 'No está en ninguna ficha técnica.'
        : `Está en ${producto.enCuantasFichas} ${producto.enCuantasFichas === 1 ? 'ficha técnica, que quedará marcada' : 'fichas técnicas, que quedarán marcadas'}.`}
    </Aviso>
  );
}

/** Una etiqueta y su dato, en la rejilla de dos columnas de la ficha. */
function Par({ que, children }: { readonly que: string; readonly children: ReactNode }) {
  return (
    <>
      <dt className="text-texto-suave">{que}</dt>
      <dd className="font-medium text-texto">{children}</dd>
    </>
  );
}

/**
 * Una sección de la ficha · una tarjeta de verdad, con su título y su acción.
 *
 * ── Lo que había, y por qué no valía ────────────────────────────────────────
 *
 * Secciones sueltas con un `h3` encima y, a la derecha, un botón de tono
 * «texto». Sobre el tema oscuro eso es **letra blanca sobre fondo negro y nada
 * más**: no se veía dónde empezaba una sección y acababa otra, y «Congelar una
 * parte», «Cambiar el precio» o «Corregir la ficha» —que son las tres cosas que
 * se vienen a hacer aquí— parecían párrafos.
 *
 * Una tarjeta, un título y un botón que parece un botón. Es la misma pieza en
 * las cinco secciones, así que la ficha se lee de arriba abajo sin sorpresas.
 */
function Seccion({
  titulo,
  accion = null,
  children,
}: {
  readonly titulo: string;
  readonly accion?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e3 rounded-grande border border-borde bg-superficie p-e4 shadow-s1">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <h3 className="text-seccion font-semibold">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

/** Un dato de cabecera: la categoría, el proveedor, el envase. */
function Chip({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-redondo border border-borde bg-fondo px-e3 py-e1 text-etiqueta text-texto-suave">
      {children}
    </span>
  );
}

/**
 * Cuánto hay respecto del mínimo, en una barra.
 *
 * Se mide contra el doble del mínimo y no contra lo que hay: la pregunta es
 * «¿llego?», no «¿cuánto tengo?». Con el doble del mínimo la barra está llena, y
 * eso es exactamente lo que significa —de sobra— sin dibujar una escala que nadie
 * mira.
 */
function BarraDelMinimo({
  hay,
  minimo,
  unidadDeUso,
}: {
  readonly hay: number;
  readonly minimo: number;
  readonly unidadDeUso: string;
}) {
  const tope = minimo * 2;
  const lleno = Math.max(0, Math.min(hay, tope));
  const falta = Math.max(0, minimo - hay);
  const tono = hay <= 0 ? 'mal' : hay < minimo ? 'atencion' : 'bien';

  return (
    <Proporcion
      titulo="Lo que hay, y el mínimo que te has puesto"
      trozos={[
        {
          que: 'Lo que hay',
          cuantos: lleno,
          tono,
          comoSeLee: conUnidadDeUso(hay, unidadDeUso),
        },
        {
          que: falta > 0 ? 'Falta para el mínimo' : 'Por encima del mínimo',
          cuantos: Math.max(0, tope - lleno),
          tono: 'neutro',
          comoSeLee:
            falta > 0
              ? conUnidadDeUso(falta, unidadDeUso)
              : `mínimo ${conUnidadDeUso(minimo, unidadDeUso)}`,
        },
      ]}
    />
  );
}

/**
 * Lo que deja este producto si se vende tal cual (M7, repaso).
 *
 * ── Por qué solo si se vende tal cual ───────────────────────────────────────
 *
 * Porque un ingrediente no tiene margen propio: la harina no se vende, se vende
 * la pizza, y el margen de la pizza sale de su escandallo, que es M9. Lo que sí
 * tiene margen propio es lo que sale de la cámara y se cobra sin pasar por
 * ninguna receta, que es media barra de un bar: los botellines, el vino, los
 * refrescos, las bolsas de patatas.
 *
 * Así que esto no se rellena solo ni se reclama: se ofrece una vez, y quien lo
 * tenga lo pone. Un producto sin precio de venta sigue estando perfecto.
 */
function LoQueDeja({
  producto,
  alPonerPrecio,
}: {
  readonly producto: ProductoEnLista;
  readonly alPonerPrecio: () => void;
}) {
  const coste = producto.costeMilesimas ?? null;
  const venta = producto.precioDeVentaCentimos;
  const iva = producto.ivaDeVenta;

  if (venta === null || venta === 0) {
    return (
      <Seccion
        titulo="Lo que deja"
        accion={
          <Boton tono="secundario" onClick={alPonerPrecio}>
            Poner precio de venta
          </Boton>
        }
      >
        <p className="text-secundario text-texto-suave">
          Si esto se vende tal cual —un botellín, una copa, una bolsa de patatas—, dime a cuánto lo
          cobras y aquí sale lo que te deja cada uno y qué parte del precio se va en género. Lo que
          se cocina no lo necesita: su margen sale de la ficha del plato.
        </p>
      </Seccion>
    );
  }

  // Sin coste no hay resta. Se dice, en vez de enseñar un margen del cien por
  // cien, que es lo que saldría restándole cero.
  const margen =
    coste === null || iva === null ? null : margenDe(centimos(venta), iva, costeDeUnaUnidad(coste));
  const como = margen === null ? null : comoEstaElMargen(margen);

  return (
    <Seccion
      titulo="Lo que deja"
      accion={
        <Boton tono="secundario" onClick={alPonerPrecio}>
          Cambiar el precio de venta
        </Boton>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-e3 gap-y-e1">
        <span className="text-cifra">{comoDinero(venta)}</span>
        <span className="text-secundario text-texto-suave">
          lo que cobras por {LA_UNIDAD[producto.unidadDeUso] ?? `el ${producto.unidadDeUso}`}
          {iva === null ? '' : `, con el ${comoSeDiceElTipo(iva)} dentro`}
        </span>
      </div>

      {margen === null || como === null ? (
        <p className="text-secundario text-texto-suave">
          {coste === null
            ? 'Cuando tenga precio de compra, aquí sale lo que te deja cada uno.'
            : 'Aquí no es IVA (Canarias, Ceuta y Melilla): pon el tipo que repercutes y sale la cuenta.'}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-e4 gap-y-e1 text-secundario">
            <Par que="Te entra">{comoDinero(margen.baseCentimos)} · sin el impuesto</Par>
            <Par que="Te cuesta">{comoDinero(margen.costeCentimos)}</Par>
            <Par que="Te queda">
              <span
                className={clases(
                  'font-semibold',
                  como === 'mal' ? 'text-mal' : como === 'atencion' ? 'text-atencion' : 'text-bien',
                )}
              >
                {comoDinero(margen.margenCentimos)}
              </span>{' '}
              <span className="font-normal text-texto-suave">
                ({comoPorcentaje(margen.margenPorcentaje)} de lo que entra)
              </span>
            </Par>
          </dl>

          <Proporcion
            titulo="De lo que cobras, qué parte se va en género y qué parte te queda"
            trozos={[
              {
                que: 'Se va en género',
                cuantos: Math.max(0, margen.costeCentimos),
                tono: como === 'bien' ? 'info' : 'atencion',
                comoSeLee: comoPorcentaje(margen.foodCostPorcentaje),
              },
              {
                que: 'Te queda',
                cuantos: Math.max(0, margen.margenCentimos),
                tono: como === 'mal' ? 'mal' : 'bien',
                comoSeLee: comoPorcentaje(Math.max(0, margen.margenPorcentaje)),
              },
            ]}
          />

          {como === 'mal' && (
            <Aviso tono="mal" titulo="Lo estás vendiendo por debajo de lo que te cuesta">
              Con este precio de compra y este de venta, cada uno que sale te cuesta dinero.
              Compruébalo: puede ser el precio de compra, el envase o lo que trae cada uno.
            </Aviso>
          )}
          {como === 'atencion' && (
            <p className="text-secundario text-texto-suave">
              Más de un tercio de lo que cobras se va en género. No es un error, pero es la cifra
              con la que se lleva un bar: merece una mirada.
            </p>
          )}
        </>
      )}
    </Seccion>
  );
}

/**
 * Lo que cuesta **una** unidad de uso, en céntimos.
 *
 * El coste vive en milésimas de céntimo porque un gramo de algo no llega a medio
 * céntimo (regla 9 y `coste.ts`). Para restarlo de un precio hay que bajarlo a
 * céntimos, y ese redondeo se hace aquí, una sola vez y al final.
 */
function costeDeUnaUnidad(costeMilesimas: number) {
  // `costeDeLinea` es quien sabe bajar de milésimas a céntimos, con un solo
  // redondeo y al final. Hacerlo aquí a mano sería un segundo dueño del mismo
  // cálculo, y la regla 9 lo prohíbe con razón.
  return costeDeLinea(milesimas(costeMilesimas), cantidad(1));
}

/**
 * El aprovechamiento, con su cifra y su botón.
 *
 * «Un rendimiento mal puesto es el error más caro del sistema» (Auditoría 1.2),
 * porque multiplica: el pulpo de 0,80 a 0,65 sube su coste un 23 % de golpe, en
 * todos los platos que lo lleven. De ahí venía la etiqueta «sin verificar», y de
 * ahí viene esto: el dato, dicho donde se lee, y con qué se arregla al lado.
 */
function ElAprovechamiento({
  producto,
  puedeTocar,
  alMedirlo,
}: {
  readonly producto: ProductoEnLista;
  readonly puedeTocar: boolean;
  readonly alMedirlo: () => void;
}) {
  const medido = !producto.sinVerificar;

  return (
    <div className="flex flex-wrap items-start justify-between gap-e3 rounded-medio border border-borde bg-fondo p-e3">
      <div className="min-w-0">
        <p className="text-secundario text-texto-suave">Se aprovecha</p>
        <p className="text-seccion font-semibold">
          {comoPorcentaje(producto.rendimiento)}{' '}
          <span className="text-secundario font-normal text-texto-suave">
            {medido ? 'medido en esta cocina' : 'supuesto, sin medir'}
          </span>
        </p>
        <p className="mt-e1 text-etiqueta text-texto-tenue">
          {medido
            ? 'De cada kilo que entra, lo que llega al plato después de limpiarlo. Con esto se calcula lo que cuesta de verdad.'
            : 'Se da por hecho que se aprovecha todo, que casi nunca es verdad. Cuando lo midas, el coste de este producto y el de los platos que lo lleven cambian con él.'}
        </p>
      </div>
      {puedeTocar && (
        <Boton tono="secundario" onClick={alMedirlo}>
          {medido ? 'Cambiarlo' : 'Lo he medido'}
        </Boton>
      )}
    </div>
  );
}

/** Cómo se dice «el kilo», «la unidad»… después de un precio. */
const LA_UNIDAD: Readonly<Record<string, string>> = {
  ud: 'la unidad',
  kg: 'el kilo',
  g: 'el gramo',
  l: 'el litro',
  ml: 'el mililitro',
};

/**
 * Qué es el precio que se enseña, en una frase.
 *
 * Si se compra de uno en uno —el kilo, la unidad— el precio **es** lo que cuesta,
 * y decir «2,0000 €/ud · sale de 2,00 € entre 1 ud» es obligar a leer una cuenta
 * que no hay. Solo con envase se dice a cuánto sale lo que se usa.
 */
function loQueEsElPrecio(producto: ProductoEnLista): string {
  if (producto.factor === 1 && producto.rendimiento >= 1) {
    return LA_UNIDAD[producto.unidadDeUso] ?? `el ${producto.unidadDeUso}`;
  }
  const envase = producto.formato === null ? 'el envase' : producto.formato.toLowerCase();
  const aprovecha =
    producto.rendimiento < 1 ? `, aprovechando un ${comoPorcentaje(producto.rendimiento)}` : '';
  return `${envase} · sale a ${producto.costePorUnidad ?? '—'}${aprovecha}`;
}

// ── Cambiar el precio ────────────────────────────────────────────────────────

function CambiarPrecio({
  abierta,
  producto,
  proveedores,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly abierta: boolean;
  readonly producto: UnProducto;
  readonly proveedores: readonly ProveedorDelLocal[];
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();
  const volverALeer = usarVolverALeerElProducto(producto.producto.id);
  const [precio, setPrecio] = useState<Centimos | null>(null);
  const [proveedorId, setProveedorId] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!abierta) return null;

  async function guardar() {
    if (precio === null) return;
    setGuardando(true);

    const respuesta = await cliente.ejecutar<{ frase: string }>('poner_precio', {
      producto_id: producto.producto.id,
      precio_centimos: precio,
      proveedor_id: proveedorId === '' ? null : proveedorId,
    });

    setGuardando(false);

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }

    // ── Deshacer un precio mal tecleado ────────────────────────────────────
    //
    // Teclear 2,50 donde iba 25,00 pasa, y un precio de compra se arrastra a
    // todos los escandallos. Los diez segundos de la barra son exactamente para
    // eso: «acabo de darle y no quería».
    //
    // **Deshacer no borra el histórico, y no debe**: vuelve a abrir el precio de
    // antes desde hoy, con su firma y su hora, igual que cualquier otro cambio de
    // precio. La vigencia equivocada queda ahí, cerrada, que es como se corrige
    // un dato con fecha. El libro y el histórico no se reescriben nunca; lo que
    // hace deshacer es ahorrar el viaje de volver a escribir el número bueno.
    const deAntes = producto.producto.precioCentimos ?? null;
    const conQuien = proveedorId === '' ? null : proveedorId;
    if (deAntes !== null) {
      sePuedeDeshacer({
        que: `«${producto.producto.nombre}» a ${comoDinero(precio)}`,
        deshacer: async () => {
          const vuelta = await cliente.ejecutar('poner_precio', {
            producto_id: producto.producto.id,
            precio_centimos: deAntes,
            proveedor_id: conQuien,
          });
          if (!vuelta.ok) throw new Error(vuelta.error.codigo);
          await volverALeer();
        },
      });
    }

    setPrecio(null);
    // La frase la compone el dominio: «Ha subido un 12 %.» Un cálculo, un dueño.
    alHecho(respuesta.datos.frase);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Cambiar el precio"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={precio === null || guardando}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar el precio
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-cuerpo text-texto-suave">
          El precio nuevo vale desde hoy. Lo que entró antes sigue valorado con el precio que tenía
          entonces: cambiar el precio de hoy no reescribe lo que costó en enero.
        </p>

        <CampoPrecioDeCompra
          etiqueta="Lo que cuesta ahora"
          ayuda={
            producto.producto.formato === null
              ? 'El precio de la unidad de compra, como en el albarán.'
              : `El de ${producto.producto.formato.toLowerCase()} entero, como en el albarán.`
          }
          valor={precio}
          alCambiar={setPrecio}
          iva={producto.producto.ivaDeCompra}
          conIvaDeEntrada={producto.preciosConIva}
        />

        <Selector
          etiqueta="De qué proveedor"
          ayuda="Cada proveedor tiene su propio precio vivo, y así se pueden comparar."
          opciones={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
          sinElegir="Sin proveedor"
          cuandoNoHay="Todavía no tienes proveedores"
          value={proveedorId}
          onChange={(e) => {
            setProveedorId(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}

// ── Corregir la ficha ────────────────────────────────────────────────────────

function CorregirLaFicha({
  abierta,
  producto,
  categorias,
  proveedores,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly abierta: boolean;
  readonly producto: UnProducto;
  readonly categorias: readonly CategoriaDelLocal[];
  readonly proveedores: readonly ProveedorDelLocal[];
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();
  const volverALeer = usarVolverALeerElProducto(producto.producto.id);
  const ficha = producto.producto;

  const [nombre, setNombre] = useState(ficha.nombre);
  // Cómo se compra, con las mismas tres preguntas del alta y lo que ya tenía.
  const [comoEra] = useState<ComoSeCompra>(() => comoSeCompraDe(ficha));
  const [como, setComo] = useState<ComoSeCompra>(comoEra);
  const ivaDeAntes =
    ficha.ivaDeCompraElegido && ficha.ivaDeCompra !== null ? String(ficha.ivaDeCompra) : '';
  const [iva, setIva] = useState(ivaDeAntes);
  const [minimo, setMinimo] = useState(ficha.minimo === null ? '' : String(ficha.minimo));
  // ── Estos cuatro salían en blanco, y se llevaban el dato por delante ────────
  //
  // El formulario manda **la ficha entera**, así que lo que no se rellena se
  // guarda vacío. La categoría y el proveedor empezaban en `''` —que el comando
  // traduce a nulo—, la categoría fiscal iba fija a `alimento` y las notas a
  // nulo. Resultado: **corregir una errata en el nombre le borraba a un producto
  // su categoría, su proveedor y sus notas, y le cambiaba el impuesto.**
  //
  // Sin decir nada, y sin que ninguna prueba lo viera: el comando hacía
  // exactamente lo que se le pedía.
  //
  // El fallo de fondo era que el servidor mandaba los **nombres** y no los
  // identificadores, así que el desplegable no tenía con qué preseleccionar. Se
  // arregla en los dos sitios: la consulta los envía y aquí se usan.
  const [categoriaId, setCategoriaId] = useState(ficha.categoriaId ?? '');
  const [proveedorId, setProveedorId] = useState(ficha.proveedorId ?? '');
  const [categoriaFiscal, setCategoriaFiscal] = useState(ficha.categoriaFiscal);
  const [notas, setNotas] = useState(ficha.notas ?? '');
  const [codigo, setCodigo] = useState(ficha.codigoDeBarras ?? '');
  const [pesoVariable, setPesoVariable] = useState(ficha.pesoVariable);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  if (!abierta) return null;

  // El aprovechamiento **no se pregunta aquí**, y viaja tal cual estaba: el
  // comando guarda la ficha entera, y mandar otro valor sería cambiarlo sin que
  // nadie lo haya pedido. Se mide, no se teclea (ver la cabecera del alta).
  const nuevoRendimiento = ficha.rendimiento;
  // Si no se ha tocado cómo se compra, viaja lo que había tal cual: un producto
  // con el envase «Saco de harina de 25 kg» no se renombra a «Saco de 25 kg» por
  // corregir una errata en el nombre.
  const presentacion = presentacionDe(como);
  const cambiaLaForma = JSON.stringify(como) !== JSON.stringify(comoEra);
  const nuevoFactor = cambiaLaForma ? presentacion.factor : ficha.factor;
  const unidad = cambiaLaForma ? presentacion.unidadDeUso : ficha.unidadDeUso;
  const cambiaElCoste = nuevoFactor !== ficha.factor;
  // Con género apuntado, la unidad no se cambia: el libro está en esa unidad y
  // el servidor lo rechaza. Se dice antes, en vez de dejar tocarlo.
  const formaFija = producto.movimientos.length > 0;

  async function guardar() {
    setGuardando(true);

    const respuesta = await cliente.ejecutar<{ cambiaElCoste: boolean }>('cambiar_producto', {
      producto_id: ficha.id,
      nombre: nombre.trim(),
      categoria_id: categoriaId === '' ? null : categoriaId,
      formato: cambiaLaForma ? presentacion.formato : ficha.formato,
      factor: nuevoFactor,
      unidad_de_uso: unidad,
      ...(cambiaLaForma
        ? {
            contenido_por_unidad: presentacion.contenidoPorUnidad,
            unidad_del_contenido: presentacion.unidadDelContenido,
          }
        : {}),
      ...(iva === ivaDeAntes ? {} : { iva_de_compra: iva === '' ? null : Number(iva) }),
      rendimiento: nuevoRendimiento,
      categoria_fiscal: categoriaFiscal,
      alergenos: producto.alergenos,
      peso_variable: pesoVariable,
      codigo_de_barras: codigo.trim() === '' ? null : codigo.trim(),
      minimo: minimo.trim() === '' ? null : Number(minimo.replace(',', '.')),
      proveedor_id: proveedorId === '' ? null : proveedorId,
      notas: notas.trim() === '' ? null : notas.trim(),
      // `verificado` **no va**, y antes iba. Cambiar cuánto trae una caja no es
      // medir cuánto se aprovecha de ella: son dos datos distintos que se
      // multiplican en la misma fórmula, y darlos por medidos juntos es lo que
      // hacía que la marca de «sin medir» no significara nada. Se mide donde se
      // mide, en «Cuánto se aprovecha».
    });

    setGuardando(false);
    setConfirmando(false);

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }

    // ── Deshacer, que es lo que le faltaba a esto ──────────────────────────
    //
    // «Deshacer siempre, diez segundos, en todo lo que no tenga consecuencia
    // legal» (Manifiesto 7). Una ficha de producto es justo eso: se cambia y se
    // vuelve a cambiar, y equivocarse de campo aquí mueve el coste de todos los
    // platos que lo lleven.
    //
    // Y no es un deshacer de mentira: **cada acción trae su contraria escrita**
    // (`usarDeshacer`). Aquí la contraria es volver a guardar la ficha con lo que
    // había, que es el mismo comando con los valores de antes. Lo que no lleva
    // deshacer es el libro de movimientos, que no se edita: se enmienda.
    sePuedeDeshacer({
      que: `Ficha de «${nombre.trim()}» cambiada`,
      deshacer: async () => {
        const vuelta = await cliente.ejecutar('cambiar_producto', {
          ...laFichaEntera(producto),
          iva_de_compra: ficha.ivaDeCompraElegido ? ficha.ivaDeCompra : null,
          contenido_por_unidad: ficha.contenidoPorUnidad,
          unidad_del_contenido: ficha.unidadDelContenido,
        });
        if (!vuelta.ok) throw new Error(vuelta.error.codigo);
        await volverALeer();
      },
    });

    alHecho(
      respuesta.datos.cambiaElCoste
        ? 'Guardado. Como ha cambiado la cuenta, el coste por unidad de uso se mueve.'
        : 'Ficha guardada.',
    );
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Corregir la ficha"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              // «Cambiar un rendimiento **pide confirmación enseñando el impacto
              //  antes de guardar**» (Auditoría 2.2), porque el rendimiento
              //  multiplica: pasar el pulpo de 0,80 a 0,65 sube su coste un 23 %
              //  de golpe, en todos los platos que lo lleven.
              if (cambiaElCoste && !confirmando) {
                setConfirmando(true);
                return;
              }
              void guardar();
            }}
          >
            {/*
              «Sí, guardar» **solo cuando se está confirmando algo**. Estaba al
              revés: el botón normal —el de corregir una errata— decía «Sí,
              guardar» sin que nadie hubiera preguntado nada, y el de confirmar el
              cambio de coste decía «Guardar». Lo cazó la prueba de pantalla
              buscando un botón de guardar y no encontrándolo.
            */}
            {confirmando ? 'Sí, guardar' : 'Guardar'}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        {confirmando && cambiaElCoste && (
          <Aviso tono="atencion" titulo="Esto cambia lo que cuesta el producto">
            {impactoDelCambio(ficha.factor, ficha.rendimiento, nuevoFactor, nuevoRendimiento)} Los
            platos que lo lleven cambiarán de coste en cuanto existan sus fichas. ¿Seguimos?
          </Aviso>
        )}

        <Campo
          etiqueta="Producto"
          obligatorio
          value={nombre}
          onChange={(e) => {
            setNombre(e.currentTarget.value);
          }}
        />

        {/*
          «Sin categoría» y no «Dejar «Aceites»»: ahora el desplegable **viene
          con la suya puesta**, así que la opción vacía significa de verdad
          quitarla. Antes decía «dejar» y hacía lo contrario.
        */}
        <SelectorDeCategoria
          categorias={categorias}
          valor={categoriaId}
          alElegir={setCategoriaId}
          sinElegir="Sin categoría"
        />

        {/*
          Cómo se compra: las mismas tres preguntas del alta, con lo que ya
          tenía contestado. Es la misma cuenta en los dos sitios (M7, repaso).
        */}
        <ComoLoCompras valor={como} alCambiar={setComo} formaFija={formaFija} />

        <Campo
          etiqueta="Mínimo"
          tipo="numero"
          detras={unidad}
          ayuda="Por debajo de esto sale en «Hoy». Opcional."
          value={minimo}
          onChange={(e) => {
            setMinimo(e.currentTarget.value);
          }}
        />

        <Selector
          etiqueta="Proveedor"
          opciones={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
          sinElegir="Sin proveedor"
          cuandoNoHay="Todavía no tienes proveedores"
          value={proveedorId}
          onChange={(e) => {
            setProveedorId(e.currentTarget.value);
          }}
        />

        {/*
          El tipo impositivo, que **antes no se preguntaba y se ponía a
          «alimento» sin avisar**. Un vino guardado así pasaba a tributar como
          comida. Es el dato del que cuelga el impuesto de todo lo que se venda,
          así que se elige y se ve.
        */}
        <Selector
          etiqueta="Qué impuesto le corresponde"
          ayuda="De aquí sale el IVA de lo que se venda con este producto. Un vino no tributa como una lechuga."
          opciones={CATEGORIAS_FISCALES.map((c) => ({
            valor: c,
            texto: NOMBRE_DE_LA_CATEGORIA_FISCAL[c] ?? c,
          }))}
          value={categoriaFiscal}
          onChange={(e) => {
            setCategoriaFiscal(e.currentTarget.value);
          }}
        />

        {/*
          El IVA que se paga al comprarlo. Casi siempre es el de su categoría —el
          10 % de un alimento— y así se deja; se cambia para lo raro: el pan y la
          leche, al 4 %.
        */}
        {producto.puedeVerPrecios && (
          <Selector
            etiqueta="IVA al comprarlo"
            ayuda="El que trae el ticket del proveedor. Sirve para quitárselo a los precios que escribas con IVA."
            opciones={[
              {
                valor: '',
                texto:
                  ficha.ivaDeCompraElegido || ficha.ivaDeCompra === null
                    ? 'El de su categoría'
                    : `El de su categoría (${comoSeDiceElTipo(ficha.ivaDeCompra)})`,
              },
              ...TIPOS_DE_IVA_DE_COMPRA.map((t) => ({
                valor: String(t),
                texto: comoSeDiceElTipo(t),
              })),
              { valor: '0', texto: 'Sin IVA' },
            ]}
            value={iva}
            onChange={(e) => {
              setIva(e.currentTarget.value);
            }}
          />
        )}

        <Campo
          etiqueta="Notas"
          ayuda="Opcional."
          value={notas}
          onChange={(e) => {
            setNotas(e.currentTarget.value);
          }}
        />

        <Campo
          etiqueta="Código de barras"
          ayuda="Si lo pones, buscarlo o escanearlo lleva directo a este producto."
          value={codigo}
          onChange={(e) => {
            setCodigo(e.currentTarget.value);
          }}
        />

        <Interruptor
          etiqueta="Va a peso variable"
          ayuda="Como el pescado entero: se pide en piezas y entra en kilos reales."
          puesto={pesoVariable}
          alCambiar={setPesoVariable}
        />
      </div>
    </Hoja>
  );
}

/** La frase del impacto: cuánto sube o baja el coste por unidad de uso. */
function impactoDelCambio(
  factorAntes: number,
  rendimientoAntes: number,
  factorAhora: number,
  rendimientoAhora: number,
): string {
  const antes = factorAntes * rendimientoAntes;
  const ahora = factorAhora * rendimientoAhora;
  if (antes <= 0 || ahora <= 0) return 'El coste por unidad de uso va a cambiar.';

  // El coste es inversamente proporcional a las unidades útiles.
  const variacion = antes / ahora - 1;
  const cuanto = Math.abs(variacion * 100).toFixed(0);

  if (Math.abs(variacion) < 0.005) return 'El coste por unidad de uso apenas se mueve.';
  return variacion > 0
    ? `El coste por unidad de uso sube en torno a un ${cuanto} %.`
    : `El coste por unidad de uso baja en torno a un ${cuanto} %.`;
}
// ── La ficha entera, en un solo sitio ────────────────────────────────────────

/**
 * El cuerpo de `cambiar_producto` con lo que el producto ya tiene.
 *
 * ── Por qué esto existe ──────────────────────────────────────────────────────
 *
 * Porque el comando guarda **la ficha entera** —y por buenas razones, escritas en
 * su propio fichero— pero ahora hay tres pantallas que cambian **un solo campo**:
 * el precio de venta, el aprovechamiento y la corrección de la ficha. Si cada una
 * compusiera su cuerpo, el día que se añada un campo nuevo dos de las tres se lo
 * dejarían por el camino, en silencio y sin que ninguna prueba lo viera.
 *
 * Es exactamente el fallo que ya pasó una vez en esta pantalla: corregir una
 * errata en el nombre le borraba al producto su categoría, su proveedor y sus
 * notas. Un cuerpo, un sitio.
 *
 * `verificado` **no va aquí a propósito**: sin mandarlo, el servidor no toca el
 * aprovechamiento, que es lo que hace que la marca de «sin medir» signifique
 * algo. Lo manda quien lo cambia, y nadie más.
 */
function laFichaEntera(producto: UnProducto): Record<string, unknown> {
  const ficha = producto.producto;
  return {
    producto_id: ficha.id,
    nombre: ficha.nombre,
    categoria_id: ficha.categoriaId,
    formato: ficha.formato,
    factor: ficha.factor,
    unidad_de_uso: ficha.unidadDeUso,
    rendimiento: ficha.rendimiento,
    categoria_fiscal: ficha.categoriaFiscal,
    alergenos: producto.alergenos,
    peso_variable: ficha.pesoVariable,
    codigo_de_barras: ficha.codigoDeBarras,
    minimo: ficha.minimo,
    proveedor_id: ficha.proveedorId,
    notas: ficha.notas,
  };
}

// ── El precio de venta ───────────────────────────────────────────────────────

/**
 * A cuánto se vende tal cual.
 *
 * ── Por qué el precio se escribe con IVA y el de compra sin él ──────────────
 *
 * Porque son dos impuestos distintos con dos destinos distintos. El IVA de compra
 * **se recupera**, así que no es coste y el precio se guarda sin él (0033). El de
 * venta **se ingresa**: lo cobras y lo devuelves, no es tuyo. Y lo que está
 * escrito en la pizarra lo lleva dentro, así que pedirlo de otra forma sería
 * obligar a hacer una cuenta antes de escribir un número que ya se sabe.
 *
 * Lo que sí se enseña, debajo, es lo que queda después del impuesto: es la cifra
 * con la que se calcula el margen, y verla evita el error más repetido que hay en
 * la hoja de cálculo de un bar.
 */
function PrecioDeVenta({
  abierta,
  producto,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly abierta: boolean;
  readonly producto: UnProducto;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();
  const volverALeer = usarVolverALeerElProducto(producto.producto.id);
  const ficha = producto.producto;

  const [precio, setPrecio] = useState<Centimos | null>(
    ficha.precioDeVentaCentimos === null ? null : (ficha.precioDeVentaCentimos as Centimos),
  );
  const [tipo, setTipo] = useState(ficha.ivaDeVentaElegido ? String(ficha.ivaDeVenta) : '');
  const [guardando, setGuardando] = useState(false);

  if (!abierta) return null;

  const elTipo = tipo === '' ? ficha.ivaDeVenta : Number(tipo);

  async function poner(
    cuanto: number | null,
    conQueTipo: number | null,
    { esDeshacer = false } = {},
  ) {
    setGuardando(true);
    const respuesta = await cliente.ejecutar('cambiar_producto', {
      ...laFichaEntera(producto),
      precio_de_venta_centimos: cuanto,
      iva_de_venta: conQueTipo,
    });
    setGuardando(false);

    if (!respuesta.ok) {
      if (esDeshacer) throw new Error(respuesta.error.codigo);
      alFallar(respuesta.error);
      return;
    }

    if (esDeshacer) {
      await volverALeer();
      return;
    }

    // ── Y aquí sí se puede deshacer ────────────────────────────────────────
    //
    // Un precio de venta es un dato de la ficha, no una línea del libro: se
    // cambia, no se enmienda. Así que deshacer es volver a poner el de antes, y
    // eso es exactamente lo que hace falta cuando alguien teclea 2,50 donde
    // quería 25,00 y lo ve medio segundo después.
    const antesPrecio = ficha.precioDeVentaCentimos;
    const antesTipo = ficha.ivaDeVentaElegido ? ficha.ivaDeVenta : null;
    sePuedeDeshacer({
      que:
        cuanto === null
          ? `«${ficha.nombre}» deja de venderse tal cual`
          : `«${ficha.nombre}» se vende a ${comoDinero(cuanto)}`,
      deshacer: () => poner(antesPrecio, antesTipo, { esDeshacer: true }),
    });

    alHecho(
      cuanto === null
        ? 'Quitado el precio de venta.'
        : `Guardado: lo vendes a ${comoDinero(cuanto)}.`,
    );
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="A cuánto lo vendes"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void poner(precio, tipo === '' ? null : Number(tipo));
            }}
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-cuerpo text-texto-suave">
          Esto es para lo que se vende <strong>tal cual</strong>: un botellín, una copa, una bolsa
          de patatas. Lo que se cocina no lo necesita, porque su precio está en la carta y su margen
          sale de la ficha del plato.
        </p>

        <CampoMoneda
          etiqueta={`Lo que cobras por ${LA_UNIDAD[ficha.unidadDeUso] ?? `el ${ficha.unidadDeUso}`}`}
          ayuda="Con IVA, tal cual está en la pizarra."
          valor={precio}
          alCambiar={setPrecio}
        />

        {precio !== null && precio > 0 && elTipo !== null && (
          <p className="text-secundario text-texto-suave">
            Con el {comoSeDiceElTipo(elTipo)} dentro, te entran{' '}
            <strong>{comoDinero(sinIva(centimos(precio), elTipo))}</strong>. Lo demás es el
            impuesto, que lo cobras y lo devuelves.
          </p>
        )}

        {/*
          El tipo, plegado. En península y Baleares un servicio de restauración va
          al 10 % sea lo que sea lo que se sirva —lo que se vende es el servicio,
          no la botella— así que preguntarlo siempre sería preguntar por algo que
          ya se sabe. Donde no es IVA, no se supone: hay que ponerlo.
        */}
        <details open={ficha.ivaDeVenta === null}>
          <summary className="cursor-pointer text-secundario text-texto-suave">
            {ficha.ivaDeVenta === null
              ? 'Aquí no es IVA: pon el tipo que repercutes'
              : `El impuesto que repercutes (${comoSeDiceElTipo(ficha.ivaDeVenta)})`}
          </summary>
          <div className="mt-e2">
            <Selector
              etiqueta="Tipo al venderlo"
              ayuda="Déjalo en «el de tu actividad» si no es un caso raro."
              opciones={TIPOS_DE_IVA_DE_COMPRA.map((t) => ({
                valor: String(t),
                texto: comoSeDiceElTipo(t),
              }))}
              sinElegir="El de tu actividad"
              value={tipo}
              onChange={(e) => {
                setTipo(e.currentTarget.value);
              }}
            />
          </div>
        </details>

        {ficha.precioDeVentaCentimos !== null && (
          <div>
            <Boton
              tono="texto"
              onClick={() => {
                void poner(null, null);
              }}
            >
              Ya no lo vendo tal cual
            </Boton>
          </div>
        )}
      </div>
    </Hoja>
  );
}

// ── Medir el aprovechamiento ─────────────────────────────────────────────────

/**
 * Cuánto se aprovecha de lo que entra.
 *
 * ── Por qué se pregunta así y no con un porcentaje ─────────────────────────
 *
 * Porque nadie sabe que su pulpo rinde un 62 %. Lo que sí sabe cualquiera es que
 * **de una caja de cinco kilos, limpios salen tres**. Así que se pregunta eso y la
 * cuenta la hace Estook, que es lo que este producto hace en todas partes.
 *
 * Y se enseña el impacto **antes de guardar**, porque el aprovechamiento
 * multiplica: «un rendimiento mal puesto es el error más caro del sistema»
 * (Auditoría 1.2). Bajarlo de 100 % a 60 % sube el coste de este producto un 67 %,
 * y con él el de todos los platos que lo lleven.
 */
function MedirElAprovechamiento({
  abierta,
  producto,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly abierta: boolean;
  readonly producto: UnProducto;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const { sePuedeDeshacer } = usarDeshacer();
  const volverALeer = usarVolverALeerElProducto(producto.producto.id);
  const ficha = producto.producto;

  const [entra, setEntra] = useState('');
  const [sale, setSale] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!abierta) return null;

  const cuantoEntra = Number(entra.replace(',', '.'));
  const cuantoSale = Number(sale.replace(',', '.'));
  const valen =
    Number.isFinite(cuantoEntra) &&
    Number.isFinite(cuantoSale) &&
    cuantoEntra > 0 &&
    cuantoSale > 0 &&
    cuantoSale <= cuantoEntra;
  const nuevo = valen ? Number((cuantoSale / cuantoEntra).toFixed(4)) : null;
  // Cuánto sube o baja el coste. Es la cuenta del propio motor: el coste es
  // `precio ÷ (factor × rendimiento)`, así que dividir el rendimiento entre dos
  // dobla el coste.
  const cuantoCambiaElCoste = nuevo === null ? null : ficha.rendimiento / nuevo - 1;

  async function guardar(rendimiento: number, medido: boolean, { esDeshacer = false } = {}) {
    setGuardando(true);
    const respuesta = await cliente.ejecutar('cambiar_producto', {
      ...laFichaEntera(producto),
      rendimiento,
      verificado: medido,
    });
    setGuardando(false);

    if (!respuesta.ok) {
      if (esDeshacer) throw new Error(respuesta.error.codigo);
      alFallar(respuesta.error);
      return;
    }

    if (esDeshacer) {
      await volverALeer();
      return;
    }

    const antes = ficha.rendimiento;
    const estabaMedido = !ficha.sinVerificar;
    sePuedeDeshacer({
      que: `«${ficha.nombre}» aprovecha un ${comoPorcentaje(rendimiento)}`,
      deshacer: () => guardar(antes, estabaMedido, { esDeshacer: true }),
    });

    alHecho(
      `Guardado: se aprovecha un ${comoPorcentaje(rendimiento)}. El coste de este producto se mueve con él.`,
    );
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Cuánto se aprovecha"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={nuevo === null || guardando}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              if (nuevo !== null) void guardar(nuevo, true);
            }}
          >
            Guardarlo
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-cuerpo text-texto-suave">
          No hace falta saber el porcentaje: pesa lo que entra y pesa lo que queda limpio, y de ahí
          sale. Es lo que hace que lo que cuesta un plato sea verdad y no una suposición.
        </p>

        <div className="grid gap-e3 sm:grid-cols-2">
          <Campo
            etiqueta="Lo que entra"
            tipo="numero"
            autoFocus
            detras={ficha.unidadDeUso}
            ayuda="Lo que has puesto en la balanza."
            value={entra}
            onChange={(e) => {
              setEntra(e.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Lo que queda limpio"
            tipo="numero"
            detras={ficha.unidadDeUso}
            ayuda="Ya sin piel, sin espinas, sin lo que se tire."
            value={sale}
            onChange={(e) => {
              setSale(e.currentTarget.value);
            }}
          />
        </div>

        {nuevo !== null && (
          <Aviso
            tono={
              cuantoCambiaElCoste !== null && Math.abs(cuantoCambiaElCoste) > 0.05
                ? 'atencion'
                : 'info'
            }
            titulo={`Se aprovecha un ${comoPorcentaje(nuevo)}`}
          >
            {cuantoCambiaElCoste === null || Math.abs(cuantoCambiaElCoste) < 0.005 ? (
              <>Es lo que tenía puesto, así que no cambia nada.</>
            ) : (
              <>
                Con esto, lo que cuesta usar «{ficha.nombre}»{' '}
                <strong>
                  {cuantoCambiaElCoste > 0 ? 'sube' : 'baja'} un{' '}
                  {comoPorcentaje(Math.abs(cuantoCambiaElCoste))}
                </strong>
                , y con él el de todos los platos que lo lleven en cuanto existan sus fichas.
              </>
            )}
          </Aviso>
        )}

        {!ficha.sinVerificar && (
          <div>
            <Boton
              tono="texto"
              onClick={() => {
                void guardar(ficha.rendimiento, false);
              }}
            >
              Esto no lo he medido: marcarlo como supuesto
            </Boton>
          </div>
        )}
      </div>
    </Hoja>
  );
}
