import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NOMBRE_DEL_ESTADO } from '@estook/dominio';
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
  type Columna,
} from '@estook/ui';
import { IconoAnadir, IconoBuscar, IconoQuitar } from '@estook/iconos';
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
        : vista === 'desactivados'
          ? { incluir_desactivados: 'true', solo_desactivados: 'true' }
          : {};

  const consulta = useQuery({
    queryKey: ['mis_productos', texto, categoriaId, vista],
    queryFn: async (): Promise<MisProductos> => {
      const respuesta = await cliente.consultar<MisProductos>('mis_productos', {
        ...(texto.trim() === '' ? {} : { texto: texto.trim() }),
        ...(categoriaId === '' ? {} : { categoria_id: categoriaId }),
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
            {p.sinVerificar && <Etiqueta tono="atencion">sin verificar</Etiqueta>}
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
                <button
                  type="button"
                  aria-label={`Ha llegado ${p.nombre}`}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    setApuntado(null);
                    setMoviendo({ producto: p, que: 'entrada' });
                  }}
                  className="grid size-[40px] place-items-center rounded-medio border border-bien/40 bg-bien/10 text-bien hover:bg-bien/20"
                >
                  <IconoAnadir size={20} />
                </button>
                <button
                  type="button"
                  aria-label={`Ha salido ${p.nombre}`}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    setApuntado(null);
                    setMoviendo({ producto: p, que: 'salida' });
                  }}
                  className="grid size-[40px] place-items-center rounded-medio border border-mal/40 bg-mal/10 text-mal hover:bg-mal/20"
                >
                  <IconoQuitar size={20} />
                </button>
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

        <div className="min-w-[12rem]">
          <Selector
            etiqueta="Categoría"
            opciones={datos.categorias.map((c) => ({
              valor: c.id,
              texto: `${c.nombre} (${c.cuantos})`,
            }))}
            sinElegir="Todas"
            cuandoNoHay="Este local todavía no tiene categorías"
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.currentTarget.value);
            }}
          />
        </div>

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
        titulo={comoSeCuenta(datos.cuantosHay, vista)}
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
