import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NOMBRE_DEL_ESTADO,
  NOMBRE_DE_LA_ZONA,
  ZONAS,
  llevaCategorias,
  type Zona,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Selector,
  Tabla,
  Tarjeta,
  clases,
  type Columna,
} from '@estook/ui';
import { IconoAnadir, IconoBuscar, IconoDocumento, IconoQuitar } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { NuevoProducto } from './NuevoProducto.tsx';
import { MoverGenero, type QueSeMueve } from './MoverGenero.tsx';
import {
  TONO_DEL_ESTADO,
  comoDinero,
  conUnidadDeUso,
  type MisProductos,
  type ProductoEnLista,
} from './contrato.ts';

/**
 * Inventario · Productos (M6).
 *
 * La lista de todo el género, con lo que hay en cámara y lo que cuesta. Es la
 * pantalla desde la que se da de alta y desde la que se abre cada ficha.
 *
 * ── Las cuatro vistas, y lo que sustituyen ───────────────────────────────────
 *
 * Antes esta pantalla tenía, apilados de arriba abajo: una casilla de buscar, un
 * desplegable de categoría, el botón de añadir, **y debajo un interruptor suelto
 * de «ver también los desactivados»** en mitad del contenido, con su párrafo de
 * ayuda. Cuatro controles de filtrado en tres alturas distintas, ninguno
 * agrupado, y el que decía la verdad más importante —qué estoy mirando— era el
 * que peor se veía.
 *
 * Son la misma lista mirada de otra forma, así que son **vistas**: un control
 * segmentado arriba con `Todo · Bajo mínimo · Sin precio · Desactivados`, que se
 * ve de un vistazo, se lleva en la dirección —el enlace a «lo que está bajo
 * mínimo» se puede copiar y mandar— y deja el contenido para el contenido.
 *
 * Y los filtros de verdad —buscar y categoría— se quedan, en una sola fila.
 *
 * ── Lo que se enseña de cada uno, y por qué tan poco ─────────────────────────
 *
 * «El stock: **la cifra manda, el historial explica**» (Manifiesto 12). La
 * columna «Dura» ponía tres frases en una celda: cuándo se agota, cuánto se gasta
 * al día y cuántos días se han mirado. Eso en un móvil son tres líneas por
 * producto y cincuenta productos: la pantalla deja de poder recorrerse con la
 * vista, que es justo lo que una lista tiene que dejar hacer.
 *
 * Ahora la lista lleva **la cifra**: cuánto queda, cómo está y cuántos días dura.
 * El porqué —el ritmo, los días mirados, la previsión con su hora y la sugerencia
 * de pedido— está entero en la ficha, que se abre al lado sin tapar la lista.
 *
 * ── Y los ejemplos, en gris ──────────────────────────────────────────────────
 *
 * «Todo lleva una etiqueta gris **ejemplo** bien visible» (Manifiesto 8). Salen
 * en la lista para poder mirarlos y aprender de ellos; lo que no hacen es contar
 * en «Hoy», ni en el valor de la cámara, ni en ningún aviso. Eso lo decide el
 * servidor, no esta pantalla.
 */
export function Productos({
  vista,
  alAbrirProducto,
}: {
  readonly vista: string;
  readonly alAbrirProducto: (id: string) => void;
}) {
  const { cliente, permisos } = usarSesion();
  const cache = useQueryClient();

  const [texto, setTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  /**
   * De qué zona se está mirando. Vacío es «todas las que veo».
   *
   * Es un filtro y **no es lo que protege el dato**: un cocinero no ve los
   * productos de sala aunque elija «Sala», porque la política de la tabla no se
   * los da. Aquí solo se elige qué mirar de lo que ya se puede ver.
   */
  const [zona, setZona] = useState<Zona | ''>('');
  const hayCategorias = zona === '' || llevaCategorias(zona);
  const [creando, setCreando] = useState(false);
  const [ofrecerQuitarEjemplos, setOfrecerQuitarEjemplos] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [poniendo, setPoniendo] = useState(false);
  /**
   * El producto al que se le está apuntando algo desde la lista, y qué.
   *
   * ── Los botones **+** y **−** de cada fila ─────────────────────────────────
   *
   * «A la derecha un más verde y a la derecha un menos rojo.» Apuntar dos kilos
   * de algo obligaba a abrir su ficha entera, que es un panel con seis secciones,
   * para pulsar un botón. Es el gesto que más se repite en Inventario —cuarenta
   * veces en un día normal—, y ahora está en la misma fila que el producto.
   *
   * El **+** es «ha llegado» con el precio de la lista ya puesto, que se cambia
   * si esta vez ha costado otro. El **−** es «ha salido» y pregunta por qué: si
   * es merma, se apunta como merma. Los dos son el mismo formulario que la ficha,
   * no otro: un solo sitio donde se apunta género.
   */
  const [moviendo, setMoviendo] = useState<{
    readonly producto: ProductoEnLista;
    readonly que: QueSeMueve;
  } | null>(null);
  const [apuntado, setApuntado] = useState<string | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  const puedeTocar = puedeEditar(permisos, 'app.inventario');
  const puedeContar = puedeEditar(permisos, 'accion.cerrar_recuento');

  /** A la vista de recuento, que vive en Movimientos. */
  function alRecuento() {
    window.location.hash = '#/inventario/movimientos/recuento';
  }

  // «Añadir un producto» es una acción del catálogo, y se puede pulsar desde el
  // Panel y desde el buscador: llega como `?hacer=nuevo`.
  usarQueHacer('nuevo', () => {
    if (puedeTocar) setCreando(true);
  });

  // Cada vista es un filtro del servidor, no un recorte de la lista al llegar:
  // la lista viene acotada a cincuenta, y filtrar cincuenta ya traídas daría
  // «no hay ninguno» en un local con trescientos productos.
  const deLaVista =
    vista === 'bajo-minimo'
      ? { con_problema: 'true' }
      : vista === 'sin-precio'
        ? { sin_precio: 'true' }
        : vista === 'congelados'
          ? { congelados: 'true' }
          : vista === 'desactivados'
            ? { incluir_desactivados: 'true', solo_desactivados: 'true' }
            : {};

  const consulta = useQuery({
    queryKey: ['mis_productos', texto, categoriaId, vista, zona],
    queryFn: async (): Promise<MisProductos> => {
      const respuesta = await cliente.consultar<MisProductos>('mis_productos', {
        ...(texto.trim() === '' ? {} : { texto: texto.trim() }),
        ...(zona === '' ? {} : { zona }),
        // En limpieza no hay categorías, así que tampoco se manda la que hubiera
        // quedado puesta al cambiar de zona: sería filtrar por algo invisible.
        ...(categoriaId === '' || !hayCategorias ? {} : { categoria_id: categoriaId }),
        ...deLaVista,
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  async function refrescar() {
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
    await cache.invalidateQueries({ queryKey: ['mis_movimientos'] });
    await cache.invalidateQueries({ queryKey: ['inventario_hoy'] });
    await cache.invalidateQueries({ queryKey: ['merma_de_hoy'] });
    await cache.invalidateQueries({ queryKey: ['mis_mermas'] });
    await cache.invalidateQueries({ queryKey: ['el_alta'] });
    await cache.invalidateQueries({ queryKey: ['un_indicador'] });
  }

  async function quitarLosEjemplos() {
    setQuitando(true);
    await cliente.ejecutar('quitar_los_ejemplos', {});
    setQuitando(false);
    setOfrecerQuitarEjemplos(false);
    await refrescar();
  }

  async function ponerLosEjemplos() {
    setPoniendo(true);
    await cliente.ejecutar('poner_los_ejemplos', {});
    setPoniendo(false);
    await refrescar();
  }

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus productos" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tus productos">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;

  const columnas: Columna<ProductoEnLista>[] = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      principal: true,
      celda: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-e2">
            <span className={p.esEjemplo ? 'text-texto-suave' : ''}>{p.nombre}</span>
            {p.esEjemplo && <Etiqueta>ejemplo</Etiqueta>}
            {!p.activo && <Etiqueta>desactivado</Etiqueta>}
            {/* Lo que hay en el congelador, para tenerlo en mente sin abrirlo. */}
            {p.congelado && (
              <Etiqueta tono="info">
                {p.congeladoCuanto === null
                  ? 'congelado'
                  : `${conUnidadDeUso(p.congeladoCuanto, p.unidadDeUso)} congelados`}
              </Etiqueta>
            )}
            {/*
              ── Aquí había una etiqueta naranja de «sin verificar», y se va ───

              Salía en **todos** los productos, por dos motivos a la vez: un
              producto nace sin verificar —nadie sabe cuánto se aprovecha el día
              que lo da de alta— y, además, guardar su ficha para corregir una
              errata volvía a marcarlo (el servidor lo hacía solo; arreglado con
              el repaso). Así que era naranja en toda la lista, no se podía quitar
              desde ninguna parte y no distinguía nada de nada.

              «Una marca que sale en todos no marca nada.» El dato sigue, y sigue
              importando —un aprovechamiento mal puesto es el error más caro del
              sistema—, pero vive **donde se puede hacer algo con él**: en la
              ficha, con su cifra y con el botón de medirlo.
            */}
          </span>
          {/* El envase, en pequeño y debajo. Es lo que distingue dos filas que se
              llaman igual —«Aceite de oliva», garrafa de 5 l y de 8 l— y hasta
              ahora había que abrir la ficha para saber cuál era cuál. */}
          {p.formato !== null && p.formato !== '' && (
            <span className="text-secundario text-texto-tenue">{p.formato}</span>
          )}
        </span>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'En cámara',
      numerica: true,
      celda: (p) => (
        <span className="flex items-center justify-end gap-e2">
          <span>{conUnidadDeUso(p.cantidad, p.unidadDeUso)}</span>
          <Etiqueta tono={TONO_DEL_ESTADO[p.estado]}>{NOMBRE_DEL_ESTADO[p.estado]}</Etiqueta>
        </span>
      ),
    },
    {
      clave: 'cobertura',
      titulo: 'Dura',
      numerica: true,
      // La cifra y nada más. El ritmo, los días mirados, la previsión con su hora
      // y la sugerencia de pedido están en la ficha, que es donde se leen.
      celda: (p) => <span>{cuantoDura(p)}</span>,
    },
    // La columna de dinero **solo existe si el servidor ha enviado dinero**. No
    // se esconde: no está. Un cocinero no recibe ni un campo de coste.
    ...(datos.puedeVerPrecios
      ? [
          {
            clave: 'coste',
            titulo: 'Coste',
            numerica: true,
            celda: (p: ProductoEnLista) => (
              <span className="flex flex-col items-end">
                <span>{p.costePorUnidad ?? '—'}</span>
                {p.precioCentimos !== null && p.precioCentimos !== undefined && (
                  <span className="text-secundario text-texto-tenue">
                    {comoDinero(p.precioCentimos)} {p.formato === null ? 'la unidad' : 'el envase'}
                  </span>
                )}
              </span>
            ),
          } satisfies Columna<ProductoEnLista>,
        ]
      : []),
    // Y los dos botones, al final de la fila, para quien puede apuntar. El
    // `stopPropagation` es lo que evita que pulsar el más abra también la ficha:
    // la fila entera es un botón, y estos van dentro.
    ...(puedeTocar && vista !== 'desactivados'
      ? [
          {
            clave: 'mover',
            titulo: 'Apuntar',
            numerica: true,
            celda: (p: ProductoEnLista) => (
              <span className="flex justify-end gap-e1">
                <BotonDeApuntar
                  que="entrada"
                  producto={p}
                  onClick={() => {
                    setApuntado(null);
                    setMoviendo({ producto: p, que: 'entrada' });
                  }}
                />
                <BotonDeApuntar
                  que="salida"
                  producto={p}
                  onClick={() => {
                    setApuntado(null);
                    setMoviendo({ producto: p, que: 'salida' });
                  }}
                />
              </span>
            ),
          } satisfies Columna<ProductoEnLista>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-e4">
      {/*
        «Al crear el primer producto de verdad, Estook lo pregunta» (Manifiesto 8).
        No se borra nada solo: se ofrece, y decide una persona.
      */}
      {ofrecerQuitarEjemplos && (
        <Aviso
          tono="info"
          titulo="Ya tienes género de verdad"
          accion={
            <Boton
              tono="secundario"
              cargando={quitando}
              textoCargando="Borrando"
              onClick={() => {
                void quitarLosEjemplos();
              }}
            >
              Quitar los ejemplos
            </Boton>
          }
          alCerrar={() => {
            setOfrecerQuitarEjemplos(false);
          }}
        >
          Todavía quedan {datos.ejemplos} productos de ejemplo, marcados en gris. No cuentan para
          nada, pero puedes quitarlos ahora si ya no los necesitas.
        </Aviso>
      )}

      {apuntado !== null && (
        <Aviso
          tono="bien"
          titulo={apuntado}
          esNoticia
          alCerrar={() => {
            setApuntado(null);
          }}
        >
          Queda en el libro con tu nombre y la hora.
        </Aviso>
      )}
      {fallo !== null && <ErrorEnCristiano error={fallo} />}

      {/* Una sola fila de filtros, y el botón principal al final de ella. Antes
          eran cuatro controles en tres alturas. */}
      <div className="flex flex-wrap items-end gap-e3">
        <div className="min-w-[14rem] flex-1">
          <Campo
            etiqueta="Buscar en tu género"
            ayuda="Vale con erratas, sin acentos y con el código de barras."
            value={texto}
            delante={<IconoBuscar size={16} />}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        </div>

        {/*
          ── De dónde es, al lado de la categoría ────────────────────────────

          «Ahora la categoría es del total de productos que hay, pero vamos a
          cambiar esto.» Y se cambia entero: primero se elige el almacén —cocina,
          sala o limpieza— y la categoría pasa a ser el índice **de ese almacén**,
          con sus cuentas ya hechas sobre él.

          Y en limpieza el desplegable de categoría **no se esconde: no está**.
          Son quince cosas y no llevan árbol; un control apagado obliga a mirarlo
          para descubrir que no sirve.
        */}
        <div className="min-w-[12rem]">
          <Selector
            etiqueta="De dónde"
            opciones={ZONAS.filter((z) => cuantosDeLaZona(datos, z) > 0 || z === zona).map((z) => ({
              valor: z,
              texto: `${NOMBRE_DE_LA_ZONA[z]} (${cuantosDeLaZona(datos, z)})`,
            }))}
            sinElegir="Todo"
            cuandoNoHay="Todavía no tienes género"
            value={zona}
            onChange={(e) => {
              const elegida = e.currentTarget.value as Zona | '';
              setZona(elegida);
              // Al cambiar de almacén, la categoría de antes deja de significar
              // nada: «Carnes» no existe en sala. Se suelta en vez de dejarla
              // puesta filtrando a cero.
              setCategoriaId('');
            }}
          />
        </div>

        {hayCategorias && (
          <div className="min-w-[12rem]">
            <Selector
              etiqueta="Categoría"
              opciones={datos.categorias
                .filter((c) => c.cuantos > 0 || c.id === categoriaId)
                .map((c) => ({
                  valor: c.id,
                  texto: `${c.nombre} (${c.cuantos})`,
                }))}
              sinElegir="Todas"
              cuandoNoHay="Aquí todavía no hay categorías"
              value={categoriaId}
              onChange={(e) => {
                setCategoriaId(e.currentTarget.value);
              }}
            />
          </div>
        )}

        {/*
          «Hacer recuento» al lado de «Añadir producto»: es la otra cosa que se
          hace desde esta pantalla con la lista delante, y es donde se busca. La
          vista vive en Movimientos —un recuento es un movimiento— y se llega con
          un enlace, no duplicando la pantalla.
        */}
        {puedeContar && (
          <Boton tono="secundario" icono={<IconoDocumento size={18} />} onClick={alRecuento}>
            Hacer recuento
          </Boton>
        )}

        {puedeTocar && (
          <Boton
            tono="principal"
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              setCreando(true);
            }}
          >
            Añadir producto
          </Boton>
        )}
      </div>

      <Tarjeta
        titulo={comoSeCuenta(datos.cuantosCumplen, vista)}
        origen={
          datos.puedeVerPrecios && vista !== 'desactivados'
            ? `La cámara vale ${comoDinero(datos.valorTotalCentimos)}, sin contar los ejemplos`
            : 'Lo que hay en cámara, según el libro de movimientos'
        }
      >
        <Tabla
          titulo="Tu género"
          columnas={columnas}
          filas={datos.productos}
          claveDe={(p) => p.id}
          alPulsar={(p) => {
            alAbrirProducto(p.id);
          }}
          /*
            ── En móvil, dos líneas por producto ──────────────────────────────

            La tarjeta de pares de siempre ponía cinco: el nombre y luego «EN
            CÁMARA», «DURA», «COSTE» y «APUNTAR», cada una en su fila. Eso es un
            producto y medio por pantalla, y con trescientos productos la lista
            deja de poder recorrerse.

            Aquí va lo que se mira de verdad al buscar algo en la cámara: qué es,
            cuánto queda y cómo está. El coste va debajo en pequeño y el resto
            —el ritmo, la previsión, la sugerencia— está en la ficha, que se abre
            de un toque.
          */
          nombreDeLaFila={(p) => p.nombre}
          filaCompacta={(p) => (
            <div className="flex items-center gap-e3">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-e2">
                  <span className={clases('font-medium', p.esEjemplo && 'text-texto-suave')}>
                    {p.nombre}
                  </span>
                  {p.esEjemplo && <Etiqueta>ejemplo</Etiqueta>}
                  {!p.activo && <Etiqueta>desactivado</Etiqueta>}
                </span>
                <span className="block truncate text-etiqueta text-texto-tenue">
                  {[
                    p.formato,
                    datos.puedeVerPrecios && p.costePorUnidad !== null ? p.costePorUnidad : null,
                    p.congelado
                      ? p.congeladoCuanto === null
                        ? 'congelado'
                        : `${conUnidadDeUso(p.congeladoCuanto, p.unidadDeUso)} congelados`
                      : null,
                  ]
                    .filter((trozo) => trozo !== null && trozo !== '')
                    .join(' · ')}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-semibold tabular-nums">
                  {conUnidadDeUso(p.cantidad, p.unidadDeUso)}
                </span>
                <Etiqueta tono={TONO_DEL_ESTADO[p.estado]}>{NOMBRE_DEL_ESTADO[p.estado]}</Etiqueta>
              </span>

              {puedeTocar && vista !== 'desactivados' && (
                <span className="flex shrink-0 gap-e1">
                  <BotonDeApuntar
                    que="entrada"
                    producto={p}
                    onClick={() => {
                      setApuntado(null);
                      setMoviendo({ producto: p, que: 'entrada' });
                    }}
                  />
                  <BotonDeApuntar
                    que="salida"
                    producto={p}
                    onClick={() => {
                      setApuntado(null);
                      setMoviendo({ producto: p, que: 'salida' });
                    }}
                  />
                </span>
              )}
            </div>
          )}
          cuandoNoHay={
            <SinNada
              vista={vista}
              buscando={texto.trim() !== '' || categoriaId !== ''}
              puedeTocar={puedeTocar}
              poniendo={poniendo}
              alCrear={() => {
                setCreando(true);
              }}
              alPonerEjemplos={() => {
                void ponerLosEjemplos();
              }}
            />
          }
        />

        {datos.hayMas && (
          <p className="mt-e3 text-secundario text-texto-suave">
            Se enseñan los cincuenta primeros. Busca por nombre para encontrar el que quieras.
          </p>
        )}
      </Tarjeta>

      {moviendo !== null && (
        <MoverGenero
          que={moviendo.que}
          producto={moviendo.producto}
          puedeVerPrecios={datos.puedeVerPrecios}
          preciosConIva={datos.preciosConIva}
          alCerrar={() => {
            setMoviendo(null);
          }}
          alHecho={(frase) => {
            setApuntado(`${moviendo.producto.nombre}: ${frase}`);
            setFallo(null);
            setMoviendo(null);
            void refrescar();
          }}
          alFallar={(error) => {
            setFallo(error);
            setMoviendo(null);
          }}
        />
      )}

      <NuevoProducto
        abierta={creando}
        alCerrar={() => {
          setCreando(false);
        }}
        alCrear={(productoId, ejemplosQueQuedan) => {
          setCreando(false);
          if (ejemplosQueQuedan > 0) setOfrecerQuitarEjemplos(true);
          void refrescar();
          alAbrirProducto(productoId);
        }}
        categorias={datos.categorias}
        proveedores={datos.proveedores}
        puedeVerPrecios={datos.puedeVerPrecios}
        preciosConIva={datos.preciosConIva}
        territorio={datos.territorio}
      />
    </div>
  );
}

/**
 * Cuánto dura, en una cifra.
 *
 * Cuando no se puede decir, no se inventa: «—», y el porqué está en la ficha.
 * «Con menos de siete días de historia no predice nada, y dice por qué» (M6): una
 * previsión hecha con dos días es una corazonada con la autoridad de estar
 * escrita en la pantalla.
 */
function cuantoDura(producto: ProductoEnLista): string {
  const dias = producto.diasDeCobertura;
  if (dias === null) return '—';
  if (dias < 1) return 'hoy';
  if (dias < 2) return '1 día';
  return `${Math.floor(dias)} días`;
}

/** Cómo se cuenta el total según lo que se esté mirando. */
function comoSeCuenta(cuantos: number, vista: string): string {
  const cosa = cuantos === 1 ? 'producto' : 'productos';
  if (vista === 'bajo-minimo') return `${cuantos} ${cosa} por debajo del mínimo`;
  if (vista === 'sin-precio') return `${cuantos} ${cosa} sin precio`;
  if (vista === 'congelados') return `${cuantos} ${cosa} con algo congelado`;
  if (vista === 'desactivados') return `${cuantos} ${cosa} desactivados`;
  return `${cuantos} ${cosa}`;
}

/**
 * Cuando no hay nada que enseñar.
 *
 * Y **no dice lo mismo en las cuatro vistas**, que es lo que pasaba antes: una
 * lista vacía porque no hay género y una lista vacía porque nada está bajo mínimo
 * son noticias opuestas. La segunda es buena.
 */
function SinNada({
  vista,
  buscando,
  puedeTocar,
  poniendo,
  alCrear,
  alPonerEjemplos,
}: {
  readonly vista: string;
  readonly buscando: boolean;
  readonly puedeTocar: boolean;
  readonly poniendo: boolean;
  readonly alCrear: () => void;
  readonly alPonerEjemplos: () => void;
}) {
  if (buscando) {
    return (
      <EstadoVacio
        compacto
        titulo="Nada con eso"
        frase="Prueba con menos letras, o quita el filtro de categoría."
        sinAccionPorque="El buscador aguanta erratas, pero no adivina."
      />
    );
  }

  if (vista === 'bajo-minimo') {
    return (
      <EstadoVacio
        compacto
        titulo="Nada por debajo del mínimo"
        frase="Ningún producto está por debajo de lo que le pusiste como mínimo."
        sinAccionPorque="Cuando algo baje, aparecerá aquí solo y también en «Hoy»."
      />
    );
  }

  if (vista === 'sin-precio') {
    return (
      <EstadoVacio
        compacto
        titulo="Todos tienen precio"
        frase="No hay ningún producto contando cero en el valor de la cámara."
        sinAccionPorque="Un producto nuevo sin precio aparecerá aquí hasta que se le ponga uno."
      />
    );
  }

  if (vista === 'congelados') {
    return (
      <EstadoVacio
        compacto
        titulo="No hay nada congelado"
        frase="Cuando congeles algo, sale aquí con la fecha en que se congeló y su caducidad."
        sinAccionPorque="Se congela desde la ficha de cada producto, en «Lotes y caducidades»."
      />
    );
  }

  if (vista === 'desactivados') {
    return (
      <EstadoVacio
        compacto
        titulo="No has quitado nada de en medio"
        frase="Aquí aparecen los productos desactivados, con todo su histórico, para poder traerlos de vuelta."
        sinAccionPorque="Se desactiva desde la ficha de cada producto."
      />
    );
  }

  return (
    <EstadoVacio
      titulo="Todavía no tienes género"
      frase="Se empieza por lo que más compras. Con el catálogo de referencia, cada producto son quince segundos: escribes «aceite» y viene con su formato, su factor y sus alérgenos puestos."
      accion={
        puedeTocar ? (
          <div className="flex flex-wrap gap-e2">
            <Boton tono="principal" icono={<IconoAnadir size={18} />} onClick={alCrear}>
              Añadir mi primer producto
            </Boton>
            <Boton
              tono="secundario"
              cargando={poniendo}
              textoCargando="Poniendo"
              onClick={alPonerEjemplos}
            >
              Ponme unos ejemplos para verlo
            </Boton>
          </div>
        ) : undefined
      }
      {...(puedeTocar
        ? {}
        : { sinAccionPorque: 'Tu acceso permite mirar el género, no darlo de alta.' })}
    />
  );
}

/**
 * Cuántos productos activos hay en una zona.
 *
 * Lo cuenta el servidor sobre el local entero y no la pantalla sobre lo que ha
 * llegado: la lista viene acotada a cincuenta, y contar lo traído diría «Sala
 * (0)» en un local con trescientas botellas. Es el mismo motivo por el que las
 * vistas de arriba son filtros del servidor y no recortes al llegar.
 */
function cuantosDeLaZona(datos: MisProductos, zona: Zona): number {
  return datos.porZona.find((z) => z.zona === zona)?.cuantos ?? 0;
}

/**
 * El **+** verde y el **−** rojo de cada fila.
 *
 * Están en la tabla de escritorio y en la fila compacta del móvil, así que viven
 * aquí: dos copias del mismo botón acaban siendo dos botones distintos, y este en
 * concreto es el gesto que más se repite en Inventario —cuarenta veces en un día
 * normal—.
 */
function BotonDeApuntar({
  que,
  producto,
  onClick,
}: {
  readonly que: 'entrada' | 'salida';
  readonly producto: ProductoEnLista;
  readonly onClick: () => void;
}) {
  const entra = que === 'entrada';
  return (
    <button
      type="button"
      aria-label={`${entra ? 'Ha llegado' : 'Ha salido'} ${producto.nombre}`}
      onClick={(evento) => {
        // La fila entera abre la ficha: sin esto, apuntar dos kilos abriría
        // además el panel de al lado.
        evento.stopPropagation();
        onClick();
      }}
      className={clases(
        'grid size-[40px] place-items-center rounded-medio border transition-colors duration-rapido',
        entra
          ? 'border-bien/40 bg-bien/10 text-bien hover:bg-bien/20'
          : 'border-mal/40 bg-mal/10 text-mal hover:bg-mal/20',
      )}
    >
      {entra ? <IconoAnadir size={20} /> : <IconoQuitar size={20} />}
    </button>
  );
}
