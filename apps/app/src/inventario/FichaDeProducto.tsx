import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CATEGORIAS_FISCALES,
  NOMBRE_DEL_ALERGENO,
  NOMBRE_DEL_ESTADO,
  UNIDADES_DE_USO,
  comoPorcentaje,
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
  Selector,
} from '@estook/ui';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { SelectorDeCategoria } from './SelectorDeCategoria.tsx';
import { MoverGenero, type QueSeMueve } from './MoverGenero.tsx';
import { IconoAnadir, IconoQuitar } from '@estook/iconos';
import {
  COMO_SE_LLAMA_EL_MOVIMIENTO,
  NOMBRE_DE_LA_CATEGORIA_FISCAL,
  TONO_DEL_ESTADO,
  comoDinero,
  conUnidadDeUso,
  cuandoSeAgota,
  type CategoriaDelLocal,
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
              Queda apuntado con tu nombre y la hora. Si no era esto, se corrige con «¿No cuadra lo
              que hay?», arriba.
            </Aviso>
          )}

          {datos.producto.esEjemplo && (
            <Aviso tono="info" titulo="Esto es un ejemplo">
              Es de mentira y no cuenta para nada: ni avisos, ni valor de la cámara, ni informes.
              Está para ver cómo funciona, y se quita con un botón desde el Panel.
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

          <section className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
            <div className="flex flex-wrap items-center justify-between gap-e2">
              <Cifra
                etiqueta="Lo que hay en cámara"
                valor={datos.producto.cantidad}
                formato={(v) => conUnidadDeUso(v, datos.producto.unidadDeUso)}
                origen="Última línea del libro de movimientos"
              />
              <Etiqueta tono={TONO_DEL_ESTADO[datos.producto.estado]}>
                {NOMBRE_DEL_ESTADO[datos.producto.estado]}
              </Etiqueta>
            </div>

            <p className="text-secundario text-texto-suave">
              {datos.producto.consumo.porDia === null
                ? (datos.producto.consumo.porque ?? 'Todavía no sé a qué ritmo se gasta.')
                : `Se gastan ${conUnidadDeUso(datos.producto.consumo.porDia, datos.producto.unidadDeUso)} al día, mirando los últimos ${datos.producto.consumo.diasMirados} días.`}
            </p>

            {cuandoSeAgota(datos.producto.seAgotaEn, datos.producto.diasDeCobertura) !== null && (
              <p className="text-cuerpo">
                <strong>
                  Se agota {cuandoSeAgota(datos.producto.seAgotaEn, datos.producto.diasDeCobertura)}
                  .
                </strong>{' '}
                <span className="text-texto-suave">
                  {datos.producto.diasDeCobertura === null
                    ? ''
                    : `Quedan ${datos.producto.diasDeCobertura.toLocaleString('es-ES')} días de cobertura.`}
                </span>
              </p>
            )}

            {datos.producto.sugerencia !== null && (
              <p className="text-cuerpo">
                <strong>
                  Pide{' '}
                  {conUnidadDeUso(datos.producto.sugerencia.cuanto, datos.producto.unidadDeUso)}.
                </strong>{' '}
                <span className="text-texto-suave">{datos.producto.sugerencia.motivo}</span>
              </p>
            )}

            {datos.producto.minimo !== null && (
              <p className="text-secundario text-texto-suave">
                Mínimo puesto a mano:{' '}
                {conUnidadDeUso(datos.producto.minimo, datos.producto.unidadDeUso)}
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
            <section className="flex flex-col gap-e2">
              <div className="flex flex-wrap items-center justify-between gap-e2">
                <h3 className="text-seccion font-semibold">Lo que cuesta</h3>
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

              {datos.producto.costePorUnidad !== null &&
              datos.producto.costePorUnidad !== undefined ? (
                <p className="text-cuerpo">
                  <strong>{datos.producto.costePorUnidad}</strong>{' '}
                  <span className="text-texto-suave">
                    · sale de {comoDinero(datos.producto.precioCentimos)}
                    {datos.producto.formato === null
                      ? ''
                      : ` la ${datos.producto.formato.toLowerCase()}`}
                    , entre {datos.producto.factor.toLocaleString('es-ES')}{' '}
                    {datos.producto.unidadDeUso}
                    {datos.producto.rendimiento < 1
                      ? ` y un ${comoPorcentaje(datos.producto.rendimiento)} que se aprovecha`
                      : ''}
                  </span>
                </p>
              ) : (
                <Aviso tono="atencion" titulo="Todavía no tiene precio">
                  Se usa igual: cuenta cero y sale marcado en las fichas que lo lleven. Nunca
                  bloquea nada.
                </Aviso>
              )}

              {datos.producto.valorCentimos !== null &&
                datos.producto.valorCentimos !== undefined && (
                  <p className="text-secundario text-texto-suave">
                    Lo que hay vale {comoDinero(datos.producto.valorCentimos)}, a precio medio
                    ponderado.
                  </p>
                )}

              {datos.precios.length > 0 && (
                <>
                  <h4 className="mt-e2 text-etiqueta uppercase tracking-wide text-texto-suave">
                    Histórico, y por proveedor
                  </h4>
                  <ul className="flex flex-col gap-e1">
                    {datos.precios.map((precio) => (
                      <li
                        key={precio.id}
                        className="flex flex-wrap items-baseline justify-between gap-e2 border-b border-borde py-e2 last:border-0"
                      >
                        <span className="flex items-center gap-e2">
                          <span>{precio.proveedor ?? 'Sin proveedor'}</span>
                          {precio.vigente && <Etiqueta tono="bien">vigente</Etiqueta>}
                        </span>
                        <span className="text-secundario text-texto-suave">
                          {comoDinero(precio.precioCentimos)} · {precio.costePorUnidad} · desde{' '}
                          {precio.desde}
                          {precio.hasta === null ? '' : ` hasta ${precio.hasta}`}
                          {/*
                            Quién lo puso. Se guardaba desde el primer día de M6 y
                            no salía de la base de datos: era la única columna de
                            todo el esquema que se escribía sin que nadie la
                            leyera. «Lo que hace cada uno queda con su nombre»
                            (Manifiesto 8), y un precio mal metido se arrastra a
                            todos los escandallos.
                          */}
                          {precio.quien !== null && ` · lo puso ${precio.quien}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {/* ── 4 · El libro ──────────────────────────────────────────── */}

          <section className="flex flex-col gap-e2">
            <h3 className="text-seccion font-semibold">Qué ha pasado con este producto</h3>
            {datos.movimientos.length === 0 ? (
              <p className="text-secundario text-texto-suave">
                Todavía no se ha movido nada. En cuanto entre o salga género, aquí queda apuntado
                con quién y cuándo.
              </p>
            ) : (
              <ul className="flex flex-col gap-e1">
                {datos.movimientos.map((movimiento) => (
                  <li
                    key={movimiento.id}
                    className="flex flex-wrap items-baseline justify-between gap-e2 border-b border-borde py-e2 last:border-0"
                  >
                    <span>
                      {COMO_SE_LLAMA_EL_MOVIMIENTO[movimiento.tipo] ?? movimiento.tipo}{' '}
                      <strong>
                        {movimiento.cantidad > 0 ? '+' : ''}
                        {conUnidadDeUso(movimiento.cantidad, datos.producto.unidadDeUso)}
                      </strong>
                      {movimiento.motivo === null ? '' : ` · ${movimiento.motivo}`}
                    </span>
                    <span className="text-secundario text-texto-suave">
                      {movimiento.fechaOperativa}
                      {movimiento.quien === null ? '' : ` · ${movimiento.quien}`} · quedaron{' '}
                      {conUnidadDeUso(movimiento.cantidadDespues, datos.producto.unidadDeUso)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── 5 · Lotes ─────────────────────────────────────────────── */}

          {datos.lotes.length > 0 && (
            <section className="flex flex-col gap-e2">
              <h3 className="text-seccion font-semibold">Lotes y caducidades</h3>
              <ul className="flex flex-col gap-e1">
                {datos.lotes.map((lote) => (
                  <li
                    key={lote.id}
                    className="flex flex-wrap items-baseline justify-between gap-e2 border-b border-borde py-e2 last:border-0"
                  >
                    <span>{lote.codigo ?? 'Sin código de lote'}</span>
                    <span className="text-secundario text-texto-suave">
                      {lote.caducaEl === null
                        ? `Recibido el ${lote.recibidoEl}`
                        : `Caduca el ${lote.caducaEl}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-secundario text-texto-suave">
                Al consumir se gastará primero lo que antes caduque. Eso llega con los recuentos.
              </p>
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
            <dl className="grid grid-cols-2 gap-e2 text-secundario">
              <Dato que="Categoría" es={datos.producto.categoria ?? 'Sin categoría'} />
              <Dato que="Envase" es={datos.producto.formato ?? 'Suelto'} />
              <Dato
                que="Cuánto trae"
                es={`${datos.producto.factor.toLocaleString('es-ES')} ${datos.producto.unidadDeUso}`}
              />
              <Dato
                que="Se aprovecha"
                es={`${comoPorcentaje(datos.producto.rendimiento)}${datos.producto.sinVerificar ? ' · sin medir' : ''}`}
              />
              <Dato que="Proveedor" es={datos.producto.proveedor ?? 'Sin proveedor'} />
              <Dato que="Código de barras" es={datos.producto.codigoDeBarras ?? 'No tiene'} />
              <Dato
                que="Peso variable"
                es={datos.producto.pesoVariable ? 'Sí, entra por peso real' : 'No'}
              />
              <Dato
                que="Alérgenos"
                es={
                  datos.alergenos.length === 0
                    ? 'Ninguno declarado'
                    : datos.alergenos.map((a) => NOMBRE_DEL_ALERGENO[a]).join(', ')
                }
              />
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
          <MoverGenero
            que={haciendo === 'precio' ? null : haciendo}
            producto={datos.producto}
            puedeVerPrecios={datos.puedeVerPrecios}
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

function Dato({ que, es }: { readonly que: string; readonly es: string }) {
  return (
    <div>
      <dt className="text-etiqueta uppercase tracking-wide text-texto-suave">{que}</dt>
      <dd className="text-cuerpo">{es}</dd>
    </div>
  );
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

        <CampoMoneda
          etiqueta="Lo que cuesta ahora"
          ayuda={
            producto.producto.formato === null
              ? 'El precio de la unidad de compra.'
              : `El precio de una ${producto.producto.formato.toLowerCase()}, entera.`
          }
          valor={precio}
          alCambiar={setPrecio}
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
  const [formato, setFormato] = useState(ficha.formato ?? '');
  const [factor, setFactor] = useState(String(ficha.factor));
  const [unidad, setUnidad] = useState(ficha.unidadDeUso);
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
  const nuevoFactor = Number(factor.replace(',', '.')) || 1;
  const cambiaElCoste = nuevoFactor !== ficha.factor;

  async function guardar() {
    setGuardando(true);

    const respuesta = await cliente.ejecutar<{ cambiaElCoste: boolean }>('cambiar_producto', {
      producto_id: ficha.id,
      nombre: nombre.trim(),
      categoria_id: categoriaId === '' ? null : categoriaId,
      formato: formato.trim() === '' ? null : formato.trim(),
      factor: nuevoFactor,
      unidad_de_uso: unidad,
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
          En qué se mide, y el envase si lo hay.

          El alta pregunta esto **plegado**, porque quien da de alta harina no
          compra por envases y no tiene por qué contestar tres preguntas para
          decir «a tanto el kilo». Aquí, editando, va abierto: si alguien abre la
          ficha de un producto es justo para corregir cosas como estas, y
          esconderlas obligaría a buscarlas.

          Lo que sí cambia es el nombre. «Unidad con la que cocinas» preguntaba por
          la cocina, y lo que decide esto es **cómo lo compras y cómo lo cuentas en
          cámara**; los gramos de una ración son de la ficha técnica, que es M9.
        */}
        <div className="grid gap-e3 sm:grid-cols-2">
          <Selector
            etiqueta="En qué se mide"
            ayuda="Cómo lo cuentas en cámara y cómo te lo cobran"
            opciones={UNIDADES_DE_USO.map((u) => ({ valor: u, texto: u }))}
            value={unidad}
            onChange={(e) => {
              setUnidad(e.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Cuánto trae"
            tipo="numero"
            ayuda={`En ${unidad}. Déjalo en 1 si no lo compras por envases`}
            detras={unidad}
            value={factor}
            onChange={(e) => {
              setFactor(e.currentTarget.value);
            }}
          />
        </div>

        <Campo
          etiqueta="Nombre del envase"
          ayuda="Opcional. Si lo dejas en blanco se llama por lo que trae."
          value={formato}
          onChange={(e) => {
            setFormato(e.currentTarget.value);
          }}
        />

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
