import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CATEGORIAS_FISCALES,
  NOMBRE_DEL_ALERGENO,
  NOMBRE_DEL_ESTADO,
  NOMBRE_DE_LA_ZONA,
  TIPOS_DE_IVA_DE_COMPRA,
  llevaCategorias,
  milesimas,
  comoHaCambiado,
  comoPorcentaje,
  comoPrecioPorUnidad,
  comoSeCompraDe,
  costeLimpio,
  comoSeDiceElTipo,
  comoSePide,
  conUnidadAproximada,
  plural,
  convertir,
  presentacionDe,
  unidadesQueSirven,
  type ComoSeCompra,
  type UnidadDeUso,
  type Zona,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  GrupoDePlegables,
  Hoja,
  Interruptor,
  PanelLateral,
  Plegable,
  Selector,
  clases,
  usarDeshacer,
} from '@estook/ui';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { AlChat } from '../chat/AlChat.tsx';
import { usarVolverALeerElProducto } from '../ganchos/usarVolverALeerElProducto.ts';
import { SelectorDeCategoria } from './SelectorDeCategoria.tsx';
import { MoverGenero, type QueSeMueve } from './MoverGenero.tsx';
import { CampoPrecioDeCompra } from './CampoPrecioDeCompra.tsx';
import { ComoLoCompras } from './ComoLoCompras.tsx';
import { ElegirZona } from './ElegirZona.tsx';
import { Congelar, QuitarLote, type LoteQueSeQuita } from './Lotes.tsx';
import { HistoricoDePrecios } from './HistoricoDePrecios.tsx';
import { FotoDeLaFicha } from './FotoDeLaFicha.tsx';
import { AnularMovimiento } from './AnularMovimiento.tsx';
import { PropuestaDeMinimo } from './MinimosPropuestos.tsx';
import {
  IconoAnadir,
  IconoCalendario,
  IconoCongelado,
  IconoDinero,
  IconoEditar,
  IconoEscandallos,
  IconoHistorial,
  IconoInfo,
  IconoQuitar,
} from '@estook/iconos';
import { LosAlergenos } from '../escandallos/Alergenos.tsx';
import {
  COMO_SE_LLAMA_EL_MOVIMIENTO,
  NOMBRE_DE_LA_CATEGORIA_FISCAL,
  TONO_DEL_ESTADO,
  comoDinero,
  comoEstaCongelado,
  comoSeLeeLaFecha,
  conUnidadDeUso,
  cuandoSeAgota,
  delEnvase,
  elEnvase,
  elPrecioComoLoApuntas,
  type CategoriaDelLocal,
  type ProductoEnLista,
  type MovimientoEnFicha,
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
 * ── Lo que hay dentro, en el orden en que hace falta (repaso del 16-oct) ─────
 *
 *   1. Qué es: la foto, la categoría, el proveedor, el envase y los alérgenos, con
 *      «Editar» al lado
 *   2. Cuánto hay: una cifra, la barra con el mínimo y tres datos (vale, se gasta,
 *      se acaba). Cuadrar la cámara se abre desde ahí —«¿no cuadra?»—
 *   3. Los dos botones: ha salido y ha llegado
 *   4. Plegado, cada cosa con su resumen a la vista: el precio, las caducidades,
 *      los movimientos, el aprovechamiento y los demás datos
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

  const [haciendo, setHaciendo] = useState<QueSeMueve | 'precio' | 'rendimiento' | null>(null);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);
  const [todosLosMovimientos, setTodosLosMovimientos] = useState(false);
  const [anulando, setAnulando] = useState<MovimientoEnFicha | null>(null);
  const [quitandoLote, setQuitandoLote] = useState<LoteQueSeQuita | null>(null);
  /** Congelando: un lote, o una parte nueva (`lote: null`). */
  const [congelando, setCongelando] = useState<{
    readonly lote: { readonly id: string; readonly caducaEl: string | null } | null;
  } | null>(null);

  const puedeTocar = puedeEditar(permisos, 'app.almacen');
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
    await cache.invalidateQueries({ queryKey: ['almacen_hoy'] });
    await cache.invalidateQueries({ queryKey: ['un_indicador'] });
    await cache.invalidateQueries({ queryKey: ['mis_movimientos'] });
  }

  const datos = consulta.data;
  const seAgota =
    datos === undefined
      ? null
      : cuandoSeAgota(datos.producto.seAgotaEn, datos.producto.diasDeCobertura);
  const vigente = datos?.precios.find((precio) => precio.vigente);
  const precioALaVista =
    datos === undefined ||
    datos.producto.precioCentimos === null ||
    datos.producto.precioCentimos === undefined
      ? null
      : elPrecioComoLoApuntas({
          precioCentimos: datos.producto.precioCentimos,
          formato: datos.producto.formato,
          factor: datos.producto.factor,
          unidadDeUso: datos.producto.unidadDeUso,
          ivaDeCompra: datos.producto.ivaDeCompra,
          preciosConIva: datos.preciosConIva,
        });
  const anteriores = datos?.precios.filter((precio) => !precio.vigente) ?? [];
  const valeAlgo =
    datos !== undefined &&
    datos.puedeVerPrecios &&
    datos.producto.valorCentimos !== null &&
    datos.producto.valorCentimos !== undefined;
  const ultimo = datos?.movimientos[0];
  const resumenDeLosLotes =
    datos === undefined ? { texto: '', tono: 'neutro' as const } : loDeLosLotes(datos.lotes);

  return (
    <PanelLateral
      abierta={productoId !== null}
      alCerrar={alCerrar}
      titulo={datos === undefined ? 'Producto' : datos.producto.nombre}
    >
      {/* `isLoading` y no `isPending`: con la ficha cerrada la consulta está apagada, y
          apagada cuenta como pendiente para siempre: un «Cargando» escondido y vivo. */}
      {consulta.isLoading && <Cargando que="la ficha" />}

      {datos !== undefined && (
        <div className="flex flex-col gap-e4 pt-e3">
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

          {/*
            ── La ficha, rehecha (repaso del 16-oct) ───────────────────────────

            Richi, con la del barril: «es muy fea y desordenada; debería ser la ficha
            arriba, y las caducidades, los movimientos y eso, más abajo, expansibles y
            más organizados». Estaba al revés: la cifra de lo que hay arriba, sin
            contexto, repetida dos veces («4602 g» y «● 4602 g Lo que hay»), una rejilla
            de cinco frases con «95,2381 g al día», y debajo, abiertas y de golpe, cinco
            tarjetas: precio, libro, lotes, ficha y aprovechamiento.

            Ahora, de arriba abajo, lo que hace un inventario de verdad (MarketMan,
            Apicbase): **qué es** (foto, categoría, proveedor, envase, alérgenos),
            **cuánto hay** (una cifra, una barra con el mínimo marcado y tres datos en
            fila), **las dos cosas que se hacen** (ha llegado, ha salido) y, plegado, lo
            que se consulta de vez en cuando, cada cosa con su resumen a la vista.
          */}

          {/* ── 1 · Qué es ─────────────────────────────────────────────── */}
          <section
            aria-label="La ficha"
            className="flex gap-e4 rounded-mayor border border-borde bg-superficie p-e4 [box-shadow:var(--sombra-tarjeta)]"
          >
            <FotoDeLaFicha
              datos={datos}
              puedeTocar={puedeTocar}
              alHecho={async (frase) => {
                setError(null);
                setNoticia(frase);
                await refrescar();
              }}
              alFallar={(fallo) => {
                setNoticia(null);
                setError(fallo);
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-e1">
              <p className="text-secundario text-texto-suave">
                {[NOMBRE_DE_LA_ZONA[datos.producto.zona], datos.producto.categoria]
                  .filter((t): t is string => t !== null)
                  .join(' · ')}
              </p>
              {datos.producto.proveedor === null ? (
                <p className="text-cuerpo text-texto-suave">Sin proveedor</p>
              ) : (
                <p className="text-cuerpo font-semibold">{datos.producto.proveedor}</p>
              )}
              <p className="text-secundario text-texto-suave">{queEnvase(datos.producto)}</p>
              {(datos.alergenos.length > 0 ||
                datos.producto.congelado ||
                !datos.producto.activo) && (
                <div className="flex flex-wrap items-center gap-e2 pt-e1">
                  {datos.alergenos.length > 0 && (
                    <LosAlergenos alergenos={datos.alergenos} lado={20} enUnaLinea />
                  )}
                  {datos.producto.congelado && (
                    <Etiqueta tono="info">
                      {datos.producto.congeladoCuanto === null
                        ? 'congelado'
                        : `${conUnidadDeUso(datos.producto.congeladoCuanto, datos.producto.unidadDeUso)} congelados`}
                    </Etiqueta>
                  )}
                  {!datos.producto.activo && <Etiqueta>desactivado</Etiqueta>}
                </div>
              )}
            </div>
            {puedeTocar && (
              <div className="-mr-e2 -mt-e2 shrink-0 self-start">
                <Boton
                  tono="texto"
                  tamano="s"
                  icono={<IconoEditar size={16} />}
                  onClick={() => {
                    setEditando(true);
                  }}
                >
                  Editar
                </Boton>
              </div>
            )}
          </section>

          {/* ── 2 · Cuánto hay ─────────────────────────────────────────── */}
          <section
            aria-label="Lo que hay"
            className="flex flex-col gap-e4 rounded-mayor border border-borde bg-superficie p-e4 [box-shadow:var(--sombra-tarjeta)]"
          >
            <div className="flex items-start justify-between gap-e3">
              <div className="flex min-w-0 flex-col gap-e1">
                <p className="text-secundario text-texto-suave">Lo que hay en cámara</p>
                <p className="text-[2.25rem] font-bold leading-none tracking-[-0.02em] tabular-nums">
                  {conUnidadDeUso(datos.producto.cantidad, datos.producto.unidadDeUso)}
                </p>
              </div>
              <Etiqueta tono={TONO_DEL_ESTADO[datos.producto.estado]}>
                {NOMBRE_DEL_ESTADO[datos.producto.estado]}
              </Etiqueta>
            </div>

            {/*
              La barra: lo que hay frente al mínimo, con una raya donde está el mínimo.
              Contesta de lejos «¿llego?», que es como se mira una pantalla en una
              cocina (Manifiesto 12). Sin mínimo no hay con qué comparar, y no sale.
            */}
            {datos.producto.minimo !== null && datos.producto.minimo > 0 && (
              <BarraDelMinimo
                hay={datos.producto.cantidad}
                minimo={datos.producto.minimo}
                unidadDeUso={datos.producto.unidadDeUso}
                calculado={datos.producto.minimoCalculado === true}
              />
            )}

            {/* Tres datos en fila, cada uno con su nombre encima: lo que antes eran
                cinco frases que había que leer enteras. */}
            {(valeAlgo || datos.producto.consumo.porDia !== null || seAgota !== null) && (
              <dl className="grid grid-cols-3 gap-e2">
                {valeAlgo && (
                  <Dato
                    que="Vale"
                    pista={datos.producto.valorEsEstimado === true ? 'a precio de hoy' : null}
                  >
                    {comoDinero(datos.producto.valorCentimos)}
                  </Dato>
                )}
                {datos.producto.consumo.porDia !== null && (
                  <Dato que="Se gasta" pista="al día">
                    {conUnidadAproximada(datos.producto.consumo.porDia, datos.producto.unidadDeUso)}
                  </Dato>
                )}
                {seAgota !== null && <Dato que="Se acaba">{seAgota.replace(/^el /, '')}</Dato>}
              </dl>
            )}
            {datos.producto.consumo.porDia === null && (
              <p className="text-etiqueta text-texto-tenue">
                Con unos días de movimientos, aquí sale cuánto se gasta y cuándo se acaba.
              </p>
            )}

            {/* El que propone Estook (M8 · 0078, 3A), si se separa del que hay. */}
            <PropuestaDeMinimo producto={datos.producto} />

            {datos.producto.sugerencia !== null && (
              <div className="flex flex-col gap-e1 rounded-grande bg-naranja-suave px-e3 py-e2">
                <p className="text-secundario">
                  {/* En cajas enteras, como se pide (M7): «2 × Caja 10 kg». */}
                  Pide{' '}
                  <strong className="font-semibold">
                    {comoSePide(
                      datos.producto.sugerencia.formatos,
                      datos.producto.formato,
                      datos.producto.factor,
                      datos.producto.unidadDeUso,
                    )}
                  </strong>
                </p>
                <p className="text-etiqueta text-texto-suave">{datos.producto.sugerencia.motivo}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-e2">
              {puedeTocar ? (
                <button
                  type="button"
                  onClick={() => {
                    setHaciendo('ajuste');
                  }}
                  className="min-h-toque text-left text-secundario font-medium text-texto-suave underline decoration-borde-fuerte underline-offset-4 hover:text-texto"
                >
                  ¿No cuadra lo que hay? Corrígelo
                </button>
              ) : (
                <span />
              )}
              {/* Mandarlo al chat como tarjeta (C2 · 0075): «se ha acabado esto». */}
              <AlChat tarjeta={{ tipo: 'producto', id: datos.producto.id }} discreto />
            </div>
          </section>

          {/*
            ── 3 · Las dos cosas que se hacen delante de una cámara ────────
            Entrar y salir es el día a día; cuadrar es la excepción y se abre desde la
            cifra, «¿no cuadra?». Una encima de otra: al lado, en un móvil, cada frase
            se partía en dos líneas.
          */}
          {puedeTocar && (
            <div className="flex flex-col gap-e2">
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
            </div>
          )}

          {/* ── 4 · Lo que se consulta de vez en cuando, plegado ────────── */}
          <GrupoDePlegables titulo="Más de este producto">
            {datos.puedeVerPrecios && (
              <Plegable
                titulo="Precio"
                icono={<IconoDinero size={18} />}
                resumen={precioALaVista === null ? 'Sin precio' : precioALaVista.principal}
                tono={
                  datos.producto.precioCentimos === null ||
                  datos.producto.precioCentimos === undefined
                    ? 'atencion'
                    : 'neutro'
                }
              >
                {datos.producto.precioCentimos === null ||
                datos.producto.precioCentimos === undefined ? (
                  <p className="text-secundario text-texto-suave">
                    Se usa igual, y cuenta cero hasta que lo tenga.
                  </p>
                ) : (
                  <div className="flex flex-col gap-e1">
                    {/*
                      **Una cifra, y la otra en pequeño** (Richi, 19-oct). Arriba, en el
                      resumen, el precio como lo apunta el local; aquí, la otra: sin IVA
                      si apunta con IVA, y al revés. Antes salían tres precios a la vez
                      —con IVA, sin IVA y el del kilo limpio— y no se sabía cuál era.
                    */}
                    {precioALaVista?.otro !== null && precioALaVista?.otro !== undefined && (
                      <p className="text-secundario text-texto-suave">{precioALaVista.otro}</p>
                    )}
                    {/*
                      Quién lo puso y desde cuándo. «Lo que hace cada uno queda con su
                      nombre» (Manifiesto 8), y un precio mal metido se arrastra a todos
                      los escandallos.
                    */}
                    {vigente !== undefined && (
                      <p className="text-etiqueta text-texto-tenue">
                        Desde el {comoSeLeeLaFecha(vigente.desde)}
                        {vigente.proveedor === null ? '' : ` · ${vigente.proveedor}`}
                        {vigente.quien === null ? '' : ` · lo puso ${vigente.quien}`}
                      </p>
                    )}
                  </div>
                )}

                {/* Con dos precios o más, lo que ha costado a cada proveedor, en la misma
                    medida aunque el envase haya cambiado. */}
                <HistoricoDePrecios
                  precios={datos.precios}
                  unidadDeUso={datos.producto.unidadDeUso}
                />

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

                {puedeTocarPrecios && (
                  <div>
                    <Boton
                      tono="secundario"
                      tamano="s"
                      onClick={() => {
                        setHaciendo('precio');
                      }}
                    >
                      Cambiar el precio
                    </Boton>
                  </div>
                )}
              </Plegable>
            )}

            {/*
              «Si hay un producto caducado, poder quitarlo con un botón en ese lote.»
              Cada lote lleva su «Quitar» y su «Congelar». Con algo caducado, abierto de
              entrada y en rojo: eso no puede esperar a que alguien lo despliegue.
            */}
            {(datos.lotes.length > 0 || puedeTocar) && (
              <Plegable
                titulo="Caducidades y lotes"
                icono={<IconoCalendario size={18} />}
                resumen={resumenDeLosLotes.texto}
                tono={resumenDeLosLotes.tono}
                abierto={resumenDeLosLotes.tono === 'mal'}
              >
                {datos.lotes.length === 0 ? (
                  <p className="text-secundario text-texto-suave">
                    Cuando entre género con su caducidad, sale aquí.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {datos.lotes.map((lote) => {
                      // Lo congelado no caduca: se queda viejo (0049). Mientras está en
                      // el congelador **no se enseña su caducidad**, sino «Congelado el X ·
                      // aguanta hasta Y» (repaso del 10-oct), en rojo si ya se ha pasado.
                      const congeladoEl = lote.congeladoEl;
                      const caducado = estaPasado(lote);
                      return (
                        <li
                          key={lote.id}
                          className="flex flex-wrap items-center justify-between gap-e2 border-b border-borde py-e2 last:border-0"
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-e2">
                              {congeladoEl !== null && (
                                <span aria-hidden className="text-info">
                                  <IconoCongelado size={16} />
                                </span>
                              )}
                              <span className={caducado ? 'text-mal' : undefined}>
                                {congeladoEl !== null
                                  ? comoEstaCongelado(congeladoEl, lote.cumpleCongeladoEl)
                                  : lote.caducaEl === null
                                    ? 'Sin fecha de caducidad'
                                    : `${caducado ? 'Caducó' : 'Caduca'} el ${comoSeLeeLaFecha(lote.caducaEl)}`}
                              </span>
                              {lote.cantidad !== null && (
                                <span className="font-semibold">
                                  {conUnidadDeUso(lote.cantidad, datos.producto.unidadDeUso)}
                                </span>
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
                                  tamano="s"
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
                                tamano="s"
                                onClick={() => {
                                  setQuitandoLote({
                                    id: lote.id,
                                    producto: datos.producto.nombre,
                                    codigo: lote.codigo,
                                    caducaEl: lote.caducaEl,
                                    unidadDeUso: datos.producto.unidadDeUso,
                                    congelado:
                                      congeladoEl === null
                                        ? null
                                        : { el: congeladoEl, aguantaHasta: lote.cumpleCongeladoEl },
                                    cantidad: lote.cantidad,
                                  });
                                }}
                              >
                                {congeladoEl === null ? 'Quitar' : 'Sacar'}
                              </Boton>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {puedeTocar && (
                  <div>
                    <Boton
                      tono="secundario"
                      tamano="s"
                      icono={<IconoCongelado size={16} />}
                      onClick={() => {
                        setCongelando({ lote: null });
                      }}
                    >
                      Congelar una parte
                    </Boton>
                  </div>
                )}
              </Plegable>
            )}

            {/* ── El libro ────────────────────────────────────────────── */}
            <Plegable
              titulo="Movimientos"
              icono={<IconoHistorial size={18} />}
              resumen={
                ultimo === undefined
                  ? 'Todavía no se ha movido nada'
                  : `${comoSeLeeLaFecha(ultimo.fechaOperativa)} · ${COMO_SE_LLAMA_EL_MOVIMIENTO[ultimo.tipo] ?? ultimo.tipo}${cuantoSeMovio(ultimo.cantidad, datos.producto.unidadDeUso)}`
              }
            >
              {datos.movimientos.length > 0 && (
                <>
                  <ul className="flex flex-col">
                    {(todosLosMovimientos ? datos.movimientos : datos.movimientos.slice(0, 5)).map(
                      (movimiento) => (
                        <li
                          key={movimiento.id}
                          className="flex items-baseline justify-between gap-e3 border-b border-borde py-e2 last:border-0"
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-baseline gap-x-e2">
                              {/* Lo anulado sigue en el libro, tachado, y deja de contar (3-oct). */}
                              <span className={movimiento.anulado === true ? 'line-through' : ''}>
                                {COMO_SE_LLAMA_EL_MOVIMIENTO[movimiento.tipo] ?? movimiento.tipo}{' '}
                                {movimiento.cantidad !== 0 && (
                                  <strong>
                                    {movimiento.cantidad > 0 ? '+' : ''}
                                    {conUnidadDeUso(
                                      movimiento.cantidad,
                                      datos.producto.unidadDeUso,
                                    )}
                                  </strong>
                                )}
                              </span>
                              {movimiento.anulado === true && <Etiqueta>Anulado</Etiqueta>}
                              {movimiento.esAnulacion === true && <Etiqueta>Anula</Etiqueta>}
                            </span>
                            {movimiento.motivo !== null && (
                              <span className="block truncate text-etiqueta text-texto-suave">
                                {movimiento.motivo}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 flex-col items-end text-right text-etiqueta text-texto-suave">
                            <span>
                              {comoSeLeeLaFecha(movimiento.fechaOperativa)}
                              {movimiento.quien === null ? '' : ` · ${movimiento.quien}`}
                            </span>
                            {puedeTocar && movimiento.sePuedeAnular === true && (
                              <Boton
                                tono="texto"
                                tamano="s"
                                onClick={() => {
                                  setAnulando(movimiento);
                                }}
                              >
                                Anular
                              </Boton>
                            )}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                  {datos.movimientos.length > 5 && !todosLosMovimientos && (
                    <div>
                      <Boton
                        tono="texto"
                        tamano="s"
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
            </Plegable>

            {/*
              ── El aprovechamiento ─────────────────────────────────────────
              Cuánto se aprovecha de lo que se compra, que multiplica el coste de todo
              lo que lo lleve: con su cifra, con si está medido o supuesto, y **con el
              botón de medirlo**. Un dato que no se puede corregir desde donde se lee
              es un dato que nadie corrige.
            */}
            <Plegable
              titulo="Aprovechamiento"
              icono={<IconoEscandallos size={18} />}
              resumen={`${comoPorcentaje(datos.producto.rendimiento)} · ${datos.producto.sinVerificar ? 'supuesto, sin medir' : 'medido en esta cocina'}`}
            >
              <ElAprovechamiento
                producto={datos.producto}
                puedeTocar={puedeTocar}
                alMedirlo={() => {
                  setHaciendo('rendimiento');
                }}
              />
            </Plegable>

            {/* ── Lo demás de la ficha: solo lo que dice algo ───────────── */}
            <Plegable titulo="Más datos" icono={<IconoInfo size={18} />}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-e4 gap-y-e1 text-secundario">
                {datos.producto.factor !== 1 && (
                  <Par que="Cuánto trae">
                    {conUnidadDeUso(datos.producto.factor, datos.producto.unidadDeUso)}
                  </Par>
                )}
                <Par que="Se cuenta en">{datos.producto.unidadDeUso}</Par>
                {datos.producto.minimo !== null && (
                  <Par que="Mínimo">
                    {conUnidadDeUso(datos.producto.minimo, datos.producto.unidadDeUso)}
                    {datos.producto.minimoCalculado === true && (
                      <span className="font-normal text-texto-suave">
                        {' '}
                        · lo rehace Estook cada lunes
                      </span>
                    )}
                  </Par>
                )}
                <Par que="Congelado aguanta">
                  {plural(datos.producto.congeladoAguantaMeses, 'mes', 'meses')}
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
                {datos.producto.notas !== null && datos.producto.notas !== '' && (
                  <Par que="Notas">{datos.producto.notas}</Par>
                )}
              </dl>
            </Plegable>
          </GrupoDePlegables>

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
          {anulando !== null && (
            <AnularMovimiento
              movimiento={anulando}
              unidadDeUso={datos.producto.unidadDeUso}
              alCerrar={() => {
                setAnulando(null);
              }}
              alHecho={async (frase) => {
                await refrescar();
                setAnulando(null);
                setNoticia(frase);
              }}
            />
          )}

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
              unidadDeUso={datos.producto.unidadDeUso}
              hay={datos.producto.cantidad}
              aguantaMeses={datos.producto.congeladoAguantaMeses}
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
            que={haciendo === 'precio' || haciendo === 'rendimiento' ? null : haciendo}
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

/** Un dato de la fila de tres: su nombre encima y la cifra, en grande. */
function Dato({
  que,
  pista = null,
  children,
}: {
  readonly que: string;
  readonly pista?: string | null;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[2px] rounded-grande bg-fondo px-e3 py-e2">
      <dt className="text-etiqueta text-texto-suave">{que}</dt>
      <dd className="truncate text-cuerpo font-semibold tabular-nums">{children}</dd>
      {pista !== null && <dd className="truncate text-etiqueta text-texto-tenue">{pista}</dd>}
    </div>
  );
}

/** «Caja 5 kg», «Bidón de 50 l», «Suelto · en ud». */
function queEnvase(producto: ProductoEnLista): string {
  if (producto.formato === null) return `Suelto · en ${producto.unidadDeUso}`;
  if (producto.factor === 1) return producto.formato;
  const trae = conUnidadDeUso(producto.factor, producto.unidadDeUso);
  // «Bidón de 50 l» ya lo dice: no se repite «· 50 l».
  const sinHuecos = (texto: string) => texto.replace(/\s/g, '').replace(',', '.');
  return sinHuecos(producto.formato).includes(sinHuecos(trae))
    ? producto.formato
    : `${producto.formato} · ${trae}`;
}

/** Si un lote ya se ha pasado: caducado, o congelado más tiempo del que aguanta. */
function estaPasado(lote: UnProducto['lotes'][number]): boolean {
  return lote.congeladoEl !== null
    ? lote.diasParaCumplir !== null && lote.diasParaCumplir <= 0
    : lote.diasParaCaducar !== null && lote.diasParaCaducar < 0;
}

/** Lo que dice el plegable de los lotes sin abrirlo: lo más urgente. */
function loDeLosLotes(lotes: UnProducto['lotes']): {
  readonly texto: string;
  readonly tono: 'neutro' | 'atencion' | 'mal';
} {
  if (lotes.length === 0) return { texto: 'Nada con fecha', tono: 'neutro' };
  const pasados = lotes.filter(estaPasado).length;
  if (pasados > 0) {
    return {
      texto: pasados === 1 ? '1 lote caducado' : `${String(pasados)} lotes caducados`,
      tono: 'mal',
    };
  }
  const conFecha = lotes
    .filter((l) => l.congeladoEl === null && l.caducaEl !== null)
    .sort((a, b) => (a.caducaEl ?? '').localeCompare(b.caducaEl ?? ''));
  const primero = conFecha[0];
  const cuantos = plural(lotes.length, 'lote', 'lotes');
  if (primero?.caducaEl == null) return { texto: cuantos, tono: 'neutro' };
  const pronto = primero.diasParaCaducar !== null && primero.diasParaCaducar <= 2;
  return {
    texto: `${cuantos} · el primero caduca el ${comoSeLeeLaFecha(primero.caducaEl)}`,
    tono: pronto ? 'atencion' : 'neutro',
  };
}

/**
 * Cuánto hay respecto del mínimo, en una barra con una raya donde está el mínimo.
 *
 * Se mide contra el doble del mínimo y no contra lo que hay: la pregunta es
 * «¿llego?», no «¿cuánto tengo?». Con el doble del mínimo la barra está llena, y
 * eso es exactamente lo que significa —de sobra—. La raya del mínimo queda en medio,
 * y debajo se dice cuál es: era «● 4602 g Lo que hay», la misma cifra de arriba otra
 * vez, y el mínimo no se veía en la barra (repaso del 16-oct).
 */
function BarraDelMinimo({
  hay,
  minimo,
  unidadDeUso,
  calculado,
}: {
  readonly hay: number;
  readonly minimo: number;
  readonly unidadDeUso: string;
  readonly calculado: boolean;
}) {
  const tope = minimo * 2;
  const lleno = Math.max(0, Math.min(hay, tope)) / tope;
  const falta = Math.max(0, minimo - hay);
  const tono = hay <= 0 ? 'bg-mal' : hay < minimo ? 'bg-atencion' : 'bg-bien';

  return (
    <div className="flex flex-col gap-e1">
      <div
        role="img"
        aria-label={`Hay ${conUnidadDeUso(hay, unidadDeUso)}; el mínimo es ${conUnidadDeUso(minimo, unidadDeUso)}`}
        className="relative h-[10px] rounded-redondo bg-fondo"
      >
        <span
          className={clases('absolute inset-y-0 left-0 rounded-redondo', tono)}
          style={{ width: `${(lleno * 100).toFixed(1)}%` }}
        />
        <span
          aria-hidden
          className="absolute -inset-y-[3px] left-1/2 w-[2px] -translate-x-1/2 rounded-redondo bg-texto"
        />
      </div>
      <p className="flex justify-between gap-e2 text-etiqueta text-texto-suave">
        <span>{falta > 0 ? `Faltan ${conUnidadDeUso(falta, unidadDeUso)}` : ''}</span>
        <span>
          Mínimo {conUnidadDeUso(minimo, unidadDeUso)}
          {calculado ? ' · lo pone Estook' : ''}
        </span>
      </p>
    </div>
  );
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
        {/*
          Lo que sale lo limpio (0099): es el coste que usa el escandallo, y aquí se dice
          aparte del precio. El precio es lo pagado; esto, lo que cuesta lo que llega al plato.
        */}
        {producto.rendimiento < 1 &&
          producto.costeMilesimas !== null &&
          producto.costeMilesimas !== undefined && (
            <p className="mt-e1 text-secundario">
              Lo limpio sale a{' '}
              <strong className="font-semibold">
                {comoPrecioPorUnidad(
                  costeLimpio(milesimas(producto.costeMilesimas), producto.rendimiento),
                  producto.unidadDeUso,
                )}
              </strong>{' '}
              <span className="text-texto-suave">sin IVA · es lo que cuenta en los platos</span>
            </p>
          )}
        <p className="mt-e1 text-etiqueta text-texto-tenue">
          {medido
            ? 'De cada kilo que entra, lo que llega al plato después de limpiarlo. Con esto se calcula lo que cuesta cada plato.'
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
  // El de su proveedor, de entrada: con «Sin proveedor» se abría un segundo precio
  // vivo al lado del de siempre, y la ficha ya no sabía cuál enseñar.
  const [proveedorId, setProveedorId] = useState(producto.producto.proveedorId ?? '');
  const [guardando, setGuardando] = useState(false);
  /** El paso de confirmar: «sube un 12 %», antes de guardar (Richi, 19-oct). */
  const [confirmando, setConfirmando] = useState(false);

  if (!abierta) return null;

  const deAntesSinIva = producto.producto.precioCentimos ?? null;
  const cambio = precio === null ? null : comoHaCambiado(deAntesSinIva, precio);
  // Tres veces más, o un tercio: casi siempre es el precio de otra cosa —el del gramo
  // en vez del kilo, el de una botella en vez de la caja—. Se dice antes de guardar.
  const raro =
    cambio?.variacion !== null &&
    cambio?.variacion !== undefined &&
    (cambio.variacion >= 2 || cambio.variacion <= -2 / 3);
  const comoSeVe = (sinElImpuesto: number) =>
    elPrecioComoLoApuntas({
      precioCentimos: sinElImpuesto,
      formato: producto.producto.formato,
      factor: producto.producto.factor,
      unidadDeUso: producto.producto.unidadDeUso,
      ivaDeCompra: producto.producto.ivaDeCompra,
      preciosConIva: producto.preciosConIva,
    }).principal;

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
    setConfirmando(false);
    // La frase la compone el dominio: «Ha subido un 12 %.» Un cálculo, un dueño.
    alHecho(respuesta.datos.frase);
  }

  if (confirmando && precio !== null && cambio !== null) {
    return (
      <Hoja
        abierta
        alCerrar={alCerrar}
        titulo={
          cambio.subeBaja === 'sube'
            ? `¿Sube un ${porcentajeDe(cambio.variacion)}?`
            : cambio.subeBaja === 'baja'
              ? `¿Baja un ${porcentajeDe(cambio.variacion)}?`
              : '¿Guardar este precio?'
        }
        pie={
          <Botones>
            <Boton
              tono="texto"
              onClick={() => {
                setConfirmando(false);
              }}
            >
              Corregirlo
            </Boton>
            <Boton
              tono="principal"
              cargando={guardando}
              textoCargando="Guardando"
              onClick={() => {
                void guardar();
              }}
            >
              Sí, guardar
            </Boton>
          </Botones>
        }
      >
        <div className="flex flex-col gap-e3 pt-e3">
          {deAntesSinIva !== null && (
            <p className="text-cuerpo">
              <span className="text-texto-suave">{comoSeVe(deAntesSinIva)}</span>
              <span aria-hidden className="mx-e2 text-texto-tenue">
                →
              </span>
              <strong className="font-semibold">{comoSeVe(precio)}</strong>
            </p>
          )}
          {raro && (
            <Aviso tono="atencion" titulo="Es mucho cambio">
              Mira que sea el precio{' '}
              {delEnvase(producto.producto.formato, producto.producto.unidadDeUso)}, y no el de otra
              cosa.
            </Aviso>
          )}
          <p className="text-secundario text-texto-suave">
            Vale desde hoy. Lo que entró antes sigue con lo que costó entonces.
          </p>
        </div>
      </Hoja>
    );
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
            disabled={precio === null || guardando || cambio?.subeBaja === 'igual'}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              // Con precio de antes, primero se confirma cuánto sube o baja.
              if (deAntesSinIva === null) void guardar();
              else setConfirmando(true);
            }}
          >
            {deAntesSinIva === null ? 'Guardar el precio' : 'Seguir'}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        <CampoPrecioDeCompra
          etiqueta={`Nuevo, ${elEnvase(producto.producto.formato, producto.producto.unidadDeUso)}`}
          valor={precio}
          alCambiar={setPrecio}
          iva={producto.producto.ivaDeCompra}
          conIvaDeEntrada={producto.preciosConIva}
          antes={deAntesSinIva}
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
  // El mínimo, en g o en kg, en ml o en l (repaso del 16-oct): «si es peso, que siempre
  // te dé la opción de poner kg o g». Se escribe en la que se quiera y se guarda en la
  // del producto. Lo que pasa de mil gramos sale de entrada en kilos.
  const [minimoEn, setMinimoEn] = useState<UnidadDeUso>(() =>
    unidadMasComoda(ficha.minimo, ficha.unidadDeUso as UnidadDeUso),
  );
  const [minimo, setMinimo] = useState(() =>
    ficha.minimo === null
      ? ''
      : sinCerosDeMas(
          convertir(ficha.minimo, ficha.unidadDeUso as UnidadDeUso, minimoEn) ?? ficha.minimo,
        ),
  );
  const [mesesCongelado, setMesesCongelado] = useState(String(ficha.congeladoAguantaMeses));
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
  const [zona, setZona] = useState<Zona>(ficha.zona);
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
  const unidad = (cambiaLaForma ? presentacion.unidadDeUso : ficha.unidadDeUso) as UnidadDeUso;
  const cambiaElCoste = nuevoFactor !== ficha.factor;
  // Con género apuntado, la unidad no se cambia: el libro está en esa unidad y
  // el servidor lo rechaza. Se dice antes, en vez de dejar tocarlo.
  const formaFija = producto.movimientos.length > 0;

  // Si se cambia cómo se compra a otra familia (de kilos a unidades), lo escrito ya
  // va en la unidad nueva: no hay conversión que valga.
  const minimoEscrito = minimo.trim() === '' ? null : Number(minimo.replace(',', '.'));
  const enQueVaElMinimo: UnidadDeUso = unidadesQueSirven(unidad).includes(minimoEn)
    ? minimoEn
    : unidad;
  const minimoEnSuUnidad =
    minimoEscrito === null
      ? null
      : Number((convertir(minimoEscrito, enQueVaElMinimo, unidad) ?? minimoEscrito).toFixed(4));

  async function guardar() {
    setGuardando(true);

    const respuesta = await cliente.ejecutar<{ cambiaElCoste: boolean }>('cambiar_producto', {
      producto_id: ficha.id,
      nombre: nombre.trim(),
      zona,
      // Limpieza no lleva categorías: si se mueve ahí, la que tuviera se suelta.
      // Guardarla escondida dejaría un producto clasificado en un sitio que ya no
      // enseña clasificaciones, y reaparecería al volver a moverlo.
      categoria_id: !llevaCategorias(zona) || categoriaId === '' ? null : categoriaId,
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
      minimo: minimoEnSuUnidad,
      proveedor_id: proveedorId === '' ? null : proveedorId,
      notas: notas.trim() === '' ? null : notas.trim(),
      congelado_aguanta_meses: Number(mesesCongelado),
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
      <div className="flex flex-col gap-e3 pt-e3">
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
        {/*
          De dónde es. Va **antes** de la categoría a propósito: la zona decide si
          hay categorías —limpieza no las lleva— y quién ve el producto, así que
          es la pregunta de la que cuelga la siguiente.
        */}
        <ElegirZona valor={zona} alElegir={setZona} />

        {llevaCategorias(zona) && (
          <SelectorDeCategoria
            categorias={categorias}
            valor={categoriaId}
            alElegir={setCategoriaId}
            sinElegir="Sin categoría"
          />
        )}

        {/*
          Cómo se compra: las mismas tres preguntas del alta, con lo que ya
          tenía contestado. Es la misma cuenta en los dos sitios (M7, repaso).
        */}
        <ComoLoCompras valor={como} alCambiar={setComo} formaFija={formaFija} />

        <Campo
          etiqueta="Mínimo"
          tipo="numero"
          {...(unidadesQueSirven(unidad).length > 1
            ? {
                unidad: {
                  valor: enQueVaElMinimo,
                  opciones: unidadesQueSirven(unidad).map((u) => ({
                    valor: u,
                    larga: NOMBRE_LARGO[u],
                  })),
                  alElegir: (u: string) => {
                    setMinimoEn(u as UnidadDeUso);
                  },
                },
              }
            : { detras: unidad })}
          ayuda="Por debajo de esto sale en «Hoy». Opcional."
          value={minimo}
          onChange={(e) => {
            setMinimo(e.currentTarget.value);
          }}
        />

        {/*
          Lo congelado no caduca: se queda viejo. Esto es lo que aguanta en el
          congelador antes de que Estook avise (repaso del 25-sep, 0049).
        */}
        <Selector
          etiqueta="Congelado aguanta"
          opciones={losMesesDeCongelado(ficha.congeladoAguantaMeses)}
          value={mesesCongelado}
          onChange={(e) => {
            setMesesCongelado(e.currentTarget.value);
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

const NOMBRE_LARGO: Readonly<Record<UnidadDeUso, string>> = {
  g: 'gramos',
  kg: 'kilos',
  ml: 'mililitros',
  l: 'litros',
  ud: 'unidades',
};

/** En gramos lo pequeño y en kilos lo que pasa de mil, que es como se piensa. */
function unidadMasComoda(cuanto: number | null, unidad: UnidadDeUso): UnidadDeUso {
  if (cuanto === null || cuanto < 1000) return unidad;
  return unidad === 'g' ? 'kg' : unidad === 'ml' ? 'l' : unidad;
}

/** «4.6» y no «4.6000000001». Con punto: es un campo de número. */
function sinCerosDeMas(numero: number): string {
  return String(Number(numero.toFixed(3)));
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
    zona: ficha.zona,
    congelado_aguanta_meses: ficha.congeladoAguantaMeses,
  };
}

/** Los meses que se ofrecen, con el que ya tenga aunque no sea de los de siempre. */
function losMesesDeCongelado(elQueTiene: number): readonly { valor: string; texto: string }[] {
  const meses = [...new Set([1, 2, 3, 4, 6, 9, 12, 18, 24, elQueTiene])].sort((a, b) => a - b);
  return meses.map((n) => ({ valor: String(n), texto: plural(n, 'mes', 'meses') }));
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
      <div className="flex flex-col gap-e3 pt-e3">
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

/** «12 %», de una variación de 0,12 (la del dominio, `comoHaCambiado`). */
function porcentajeDe(variacion: number | null): string {
  if (variacion === null) return '';
  return `${Math.abs(variacion * 100)
    .toFixed(1)
    .replace('.', ',')
    .replace(',0', '')} %`;
}

/** « +2 kg» detrás del nombre de un movimiento; nada si no movió cantidad (0076). */
function cuantoSeMovio(cantidad: number, unidadDeUso: string): string {
  if (cantidad === 0) return '';
  return ` ${cantidad > 0 ? '+' : ''}${conUnidadDeUso(cantidad, unidadDeUso)}`;
}
