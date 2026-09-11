import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CATEGORIAS_FISCALES,
  NOMBRE_DEL_ALERGENO,
  NOMBRE_DEL_ESTADO,
  TIPOS_DE_IVA_DE_COMPRA,
  centimos,
  comoPorcentaje,
  comoSeCompraDe,
  comoSeDiceElTipo,
  comoSePide,
  conIva,
  presentacionDe,
  type ComoSeCompra,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  Cifra,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Interruptor,
  PanelLateral,
  Selector,
} from '@estook/ui';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
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

  const [haciendo, setHaciendo] = useState<QueSeMueve | 'precio' | null>(null);
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

          {/* ── 1 · Lo que hay ─────────────────────────────────────────── */}

          {/*
            ── Una etiqueta y su dato, y solo lo que hay ─────────────────────
            Eran cinco frases sueltas —«llevo 1 día de historia y necesito 7
            para no inventarme una cifra», «mínimo puesto a mano», «última línea
            del libro de movimientos»— y había que leerlas todas para saber cómo
            estaba el producto. Ahora es una rejilla: qué, y cuánto.
          */}
          <section className="flex flex-col gap-e3 rounded-medio border border-borde p-e3">
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
            <section className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
              <div className="flex items-center justify-between gap-e2">
                <h3 className="text-seccion font-semibold">Precio</h3>
                {puedeTocarPrecios && (
                  <Boton
                    tono="texto"
                    onClick={() => {
                      setHaciendo('precio');
                    }}
                  >
                    Cambiar el precio
                  </Boton>
                )}
              </div>

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
            </section>
          )}

          {/* ── 4 · El libro ──────────────────────────────────────────── */}

          <section className="flex flex-col gap-e2">
            <h3 className="text-seccion font-semibold">Últimos movimientos</h3>
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
                        <span className="shrink-0 text-right text-etiqueta text-texto-suave">
                          {comoSeLeeLaFecha(movimiento.fechaOperativa)}
                          {movimiento.quien === null ? '' : ` · ${movimiento.quien}`}
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
          </section>

          {/* ── 5 · Lotes ─────────────────────────────────────────────── */}

          {/*
            «Si hay un producto caducado, poder quitarlo con un botón en ese lote;
             si no, se queda siempre y no tiene sentido.» Cada lote lleva su
            «Quitar» —se ha gastado o se ha tirado— y su «Congelar». Y arriba,
            «Congelar una parte», para cuando la mitad va al congelador.
          */}
          {(datos.lotes.length > 0 || puedeTocar) && (
            <section className="flex flex-col gap-e2">
              <div className="flex flex-wrap items-center justify-between gap-e2">
                <h3 className="text-seccion font-semibold">Lotes y caducidades</h3>
                {puedeTocar && (
                  <Boton
                    tono="texto"
                    onClick={() => {
                      setCongelando({ lote: null });
                    }}
                  >
                    Congelar una parte
                  </Boton>
                )}
              </div>
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
            </section>
          )}

          {/* ── 6 · La ficha ──────────────────────────────────────────── */}

          <section className="flex flex-col gap-e2">
            <div className="flex flex-wrap items-center justify-between gap-e2">
              <h3 className="text-seccion font-semibold">La ficha</h3>
              {puedeTocar && (
                <Boton
                  tono="texto"
                  onClick={() => {
                    setEditando(true);
                  }}
                >
                  Corregir la ficha
                </Boton>
              )}
            </div>
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
              <Par que="Se aprovecha">
                {comoPorcentaje(datos.producto.rendimiento)}
                {datos.producto.sinVerificar && (
                  <span className="font-normal text-texto-suave"> · sin medir</span>
                )}
              </Par>
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
          </section>

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
            que={haciendo === 'precio' ? null : haciendo}
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
      verificado: cambiaElCoste,
    });

    setGuardando(false);
    setConfirmando(false);

    if (!respuesta.ok) {
      alFallar(respuesta.error);
      return;
    }

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
            {cambiaElCoste && !confirmando ? 'Guardar' : 'Sí, guardar'}
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
