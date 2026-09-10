import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UNIDADES_DE_USO,
  comoPrecioPorUnidad,
  costePorUnidadDeUso,
  centimos,
} from '@estook/dominio';
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
  Selector,
  clases,
} from '@estook/ui';
import { IconoBuscar } from '@estook/iconos';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { SelectorDeCategoria } from './SelectorDeCategoria.tsx';
import type {
  CatalogoDeReferencia,
  CategoriaDelLocal,
  ProveedorDelLocal,
  ReferenciaDelCatalogo,
} from './contrato.ts';

/**
 * Dar de alta un producto (M6, rehecho en M6½).
 *
 * ── Lo que preguntaba, y por qué seguía estando mal ─────────────────────────
 *
 * En M6 preguntaba «cómo lo compras», «cuánto trae», «unidad con la que
 * cocinas»… y se arregló a medias: se escondió el envase detrás de un pliegue y
 * se dejó fuera «el precio del kg». El resultado era peor de lo que parecía,
 * porque **las preguntas seguían siendo las mismas y ahora estaban a dos alturas
 * distintas**. Y quedaban tres que no deberían estar:
 *
 *   · **«Cómo lo compras»**, con el ejemplo «Garrafa de 8 l». Es un campo de
 *     texto libre para escribir a mano un dato que Estook **ya sabe**: si dices
 *     que trae 8 y que se mide en litros, el envase es «8 l». Preguntarlo era
 *     pedir que alguien teclee la respuesta de otra pregunta.
 *   · **«Qué porcentaje se aprovecha.»** «Nadie lo sabe al llegar, sino cuando
 *     está trabajando», y tenía razón: es un dato de cocina que se aprende
 *     pelando, no algo que se conteste con el albarán en la mano. Ahora no se
 *     pregunta aquí: se corrige en la ficha del producto, que es donde se está
 *     cuando se descubre. El servidor lo deja en 1 y marca el producto **sin
 *     verificar**, que es exactamente lo que significa.
 *   · **«A quién se lo compras.»** Es el proveedor, y se llama proveedor.
 *
 * ── Lo que pregunta ahora, en este orden ────────────────────────────────────
 *
 *   1. **Producto** · cómo lo llamas tú
 *   2. **En qué se mide** · kg, l, ud, g, ml
 *   3. **Cuánto trae y lo que cuesta todo eso** · y la cuenta sale hecha
 *   4. **Cuánto hay ahora** · y esto es lo que faltaba entero
 *   5. **Caduca** · opcional
 *   6. **Categoría** y **proveedor** · el segundo, opcional
 *
 * Ni un pliegue y ni un campo de texto para un dato calculable. El envase se
 * **compone**: «Envase de 8 l», y si trae 1 no hay envase que nombrar.
 *
 * ── Y la cuarta pregunta es la que arregla el inventario ────────────────────
 *
 * «Añades un producto nuevo y debería actualizarse lo que hay.» No se
 * actualizaba: el stock es el libro de movimientos, y crear la ficha no apuntaba
 * ninguna línea. Había que dar de alta el producto y **acordarse de entrar en su
 * ficha a apuntar una entrada**. El resultado real de eso es un inventario con
 * treinta productos a cero, que no sirve para nada.
 *
 * Ahora se pregunta aquí y el comando apunta la entrada, con su precio. Y por eso
 * la cámara empieza a valer dinero desde el primer día: el coste medio nace
 * puesto en vez de en cero.
 */
export function NuevoProducto({
  abierta,
  alCerrar,
  alCrear,
  categorias,
  proveedores,
  puedeVerPrecios,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly alCrear: (productoId: string, ejemplosQueQuedan: number) => void;
  readonly categorias: readonly CategoriaDelLocal[];
  readonly proveedores: readonly ProveedorDelLocal[];
  readonly puedeVerPrecios: boolean;
}) {
  const { cliente } = usarSesion();

  const [texto, setTexto] = useState('');
  const [elegida, setElegida] = useState<ReferenciaDelCatalogo | null>(null);
  const [aMano, setAMano] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('kg');
  /** Cuánto trae un envase, en la unidad de arriba. 1 = se compra a granel. */
  const [cuantoTrae, setCuantoTrae] = useState('1');
  /** Lo que cuesta **todo eso**, no la unidad. Es lo que dice el albarán. */
  const [precio, setPrecio] = useState<Centimos | null>(null);
  /** Cuánto hay ya en cámara, en unidades de uso. */
  const [cuantoHay, setCuantoHay] = useState('');
  const [caducaEl, setCaducaEl] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [proveedorId, setProveedorId] = useState('');

  const DESDE_CUANTAS_LETRAS = 2;
  const buscando = texto.trim().length >= DESDE_CUANTAS_LETRAS;

  const catalogo = useQuery({
    queryKey: ['catalogo_de_referencia', texto],
    enabled: abierta && !aMano && elegida === null && buscando,
    queryFn: async (): Promise<CatalogoDeReferencia> => {
      const respuesta = await cliente.consultar<CatalogoDeReferencia>('catalogo_de_referencia', {
        texto: texto.trim(),
        limite: '12',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  function limpiar() {
    setTexto('');
    setElegida(null);
    setAMano(false);
    setNombre('');
    setUnidad('kg');
    setCuantoTrae('1');
    setPrecio(null);
    setCuantoHay('');
    setCaducaEl('');
    setCategoriaId('');
    setProveedorId('');
    setError(null);
  }

  function cerrar() {
    limpiar();
    alCerrar();
  }

  function elegir(referencia: ReferenciaDelCatalogo) {
    setElegida(referencia);
    setNombre(referencia.nombre);
    setUnidad(referencia.unidadDeUso);
    // El envase del catálogo es una **propuesta**, y se rellena a la vista: quien
    // compra garrafas de 8 l escribe 8000 y sigue. Esconderla obligaría a hacer la
    // cuenta de cabeza, que es el fallo 11 de M6 y no vuelve.
    setCuantoTrae(String(referencia.factor));
    const suya = categorias.find(
      (c) => sinAcentosSimple(c.nombre) === sinAcentosSimple(referencia.categoria),
    );
    setCategoriaId(suya?.id ?? '');
  }

  const elFactor = Math.max(0.0001, Number(cuantoTrae.replace(',', '.')) || 1);
  const porEnvases = elFactor !== 1;

  /**
   * Lo que sale la unidad, calculado mientras se escribe.
   *
   * Lo hace `costePorUnidadDeUso`, del motor de coste de M2, que es su único dueño
   * (regla 6): es la misma cuenta que hará el servidor al guardar. Con el
   * rendimiento en 1, porque aquí ya no se pregunta.
   */
  const laUnidad =
    precio === null || precio === 0
      ? null
      : comoPrecioPorUnidad(
          costePorUnidadDeUso(centimos(precio), { factor: elFactor, rendimiento: 1 }),
          unidad,
        );

  const hayNumero = cuantoHay.trim() === '' ? null : Number(cuantoHay.replace(',', '.'));
  const hayVale = hayNumero === null || (Number.isFinite(hayNumero) && hayNumero >= 0);
  const listo = nombre.trim() !== '' && hayVale && !guardando;

  async function guardar() {
    setError(null);
    setGuardando(true);

    const respuesta = await cliente.ejecutar<{
      productoId: string;
      ejemplosQueQuedan: number;
    }>('crear_producto', {
      nombre: nombre.trim(),
      ...(elegida === null ? {} : { de_referencia: elegida.id }),
      categoria_id: categoriaId === '' ? null : categoriaId,
      proveedor_id: proveedorId === '' ? null : proveedorId,
      precio_centimos: precio,
      // El envase **se compone**, no se escribe. Con factor 1 no hay envase que
      // nombrar: el precio que se ha puesto es el de una unidad de uso. Y si viene
      // del catálogo y no se ha tocado lo que trae, se queda el nombre del
      // catálogo —«Garrafa de 5 l»—, que es mejor que el compuesto.
      formato: !porEnvases
        ? null
        : elegida !== null && elFactor === elegida.factor
          ? elegida.formato
          : `Envase de ${cuantoTrae.replace('.', ',')} ${unidad}`,
      factor: elFactor,
      unidad_de_uso: unidad,
      // El rendimiento **no se manda**, y por eso el servidor deja el producto
      // «sin verificar»: es la verdad —nadie ha medido cuánto se aprovecha— y es
      // lo que hace que la etiqueta signifique algo. Se corrige en la ficha.
      ...(hayNumero !== null && hayNumero > 0 ? { cantidad_inicial: hayNumero } : {}),
      ...(caducaEl === '' ? {} : { caduca_el: caducaEl }),
    });

    setGuardando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    const { productoId, ejemplosQueQuedan } = respuesta.datos;
    limpiar();
    alCrear(productoId, ejemplosQueQuedan);
  }

  const enElFormulario = elegida !== null || aMano;

  return (
    <Hoja
      abierta={abierta}
      alCerrar={cerrar}
      titulo="Un producto nuevo"
      pie={
        <Botones>
          <Boton tono="texto" onClick={cerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar el producto
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}

        {!enElFormulario && (
          <>
            <Campo
              etiqueta="¿Qué producto es?"
              ayuda="Escribe cómo lo llamas tú. Si está en el catálogo, viene con su formato y sus alérgenos puestos."
              value={texto}
              delante={<IconoBuscar size={16} />}
              autoFocus
              onChange={(e) => {
                setTexto(e.currentTarget.value);
              }}
            />

            <div className="flex flex-wrap items-center gap-e2">
              <Boton
                tono="secundario"
                onClick={() => {
                  setAMano(true);
                  setNombre(texto.trim());
                }}
              >
                Crearlo a mano
              </Boton>
              <p className="text-secundario text-texto-suave">
                Si no está en el catálogo, o lo prefieres a tu manera.
              </p>
            </div>

            {!buscando ? (
              <p className="text-secundario text-texto-suave">
                Con dos letras empiezo a buscar. Vale con erratas y sin acentos.
              </p>
            ) : (
              <>
                {catalogo.isPending && <Cargando que="el catálogo" />}

                {catalogo.data !== undefined && catalogo.data.productos.length > 0 && (
                  <div className="flex flex-col gap-e2">
                    <p className="text-etiqueta uppercase tracking-wide text-texto-suave">
                      Del catálogo · vienen rellenos
                    </p>
                    <ul className="flex flex-col gap-e2">
                      {catalogo.data.productos.map((referencia) => (
                        <li key={referencia.id}>
                          <button
                            type="button"
                            onClick={() => {
                              elegir(referencia);
                            }}
                            className="flex w-full flex-col gap-e1 rounded-medio border border-borde p-e3 text-left hover:bg-fondo"
                          >
                            <span className="flex flex-wrap items-center gap-e2">
                              <span className="text-cuerpo font-medium">{referencia.nombre}</span>
                              <Etiqueta>{referencia.categoria}</Etiqueta>
                            </span>
                            <span className="text-secundario text-texto-suave">
                              {referencia.comoSale}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {catalogo.data !== undefined && catalogo.data.productos.length === 0 && (
                  <Aviso tono="info" titulo="Eso no está en el catálogo">
                    Con «Crearlo a mano» se hace en un momento y funciona igual.
                  </Aviso>
                )}
              </>
            )}
          </>
        )}

        {enElFormulario && (
          <>
            {elegida !== null && (
              <Aviso tono="bien" titulo={`Del catálogo: ${elegida.nombre}`} esNoticia>
                Llega con su categoría, su tipo de impuesto y sus alérgenos puestos. Lo de abajo es
                una propuesta: cámbialo si tú lo compras de otra medida.
              </Aviso>
            )}

            {/* 1 · Producto */}
            <Campo
              etiqueta="Producto"
              obligatorio
              value={nombre}
              autoFocus
              onChange={(e) => {
                setNombre(e.currentTarget.value);
              }}
            />

            {/* 2 · En qué se mide */}
            <EnQueSeMide valor={unidad} alElegir={setUnidad} />

            {/* 3 · Cuánto trae, y lo que cuesta todo eso */}
            <div className="grid gap-e3 sm:grid-cols-2">
              <Campo
                etiqueta="Cuánto trae"
                tipo="numero"
                value={cuantoTrae}
                detras={unidad}
                ayuda={
                  unidad === 'ud'
                    ? 'Cuántas unidades vienen. Una caja de 12 huevos son 12.'
                    : `Lo que trae el envase, en ${unidad}. Si lo compras a granel, deja 1.`
                }
                onChange={(e) => {
                  setCuantoTrae(e.currentTarget.value);
                }}
              />

              {puedeVerPrecios && (
                <CampoMoneda
                  etiqueta="Precio"
                  ayuda={
                    porEnvases
                      ? `Lo que cuesta todo eso, no la unidad.`
                      : `Lo que cuesta un ${unidad}.`
                  }
                  valor={precio}
                  alCambiar={setPrecio}
                />
              )}
            </div>

            {/*
              La cuenta hecha, recalculada mientras se escribe. Es lo que hace que
              alguien note que se ha equivocado **antes** de guardar, y por eso va
              en su caja y no como un párrafo más.

              Solo cuando hay algo que calcular: con factor 1, «un kg sale a lo que
              cuesta un kg» es la definición de lo que se acaba de escribir devuelta
              como si fuera un resultado.
            */}
            {puedeVerPrecios && porEnvases && laUnidad !== null && (
              <p
                aria-live="polite"
                className="rounded-medio bg-naranja-suave px-e3 py-e2 text-cuerpo font-medium"
              >
                Sale a {laUnidad}
              </p>
            )}

            {/* 4 · Cuánto hay · lo que faltaba entero */}
            <Campo
              etiqueta="Cuánto hay ahora"
              tipo="numero"
              value={cuantoHay}
              detras={unidad}
              ayuda={`Lo que tienes en cámara ahora mismo, en ${unidad}. Se apunta como una entrada, con su precio, para que la cámara valga desde hoy.`}
              onChange={(e) => {
                setCuantoHay(e.currentTarget.value);
              }}
            />

            {/* 5 · Caduca */}
            <Campo
              etiqueta="Caduca el"
              tipo="fecha"
              value={caducaEl}
              ayuda="Opcional. Si hay varias unidades con fechas distintas, pon la más próxima: es la que hay que gastar antes."
              onChange={(e) => {
                setCaducaEl(e.currentTarget.value);
              }}
            />

            {/* 6 · Categoría y proveedor */}
            <SelectorDeCategoria
              categorias={categorias}
              valor={categoriaId}
              alElegir={setCategoriaId}
              sinElegir="Sin categoría"
            />

            {/*
              El proveedor solo se pide a quien puede ver precios. Un cocinero da de
              alta productos y no ve lo que cuestan: enseñarle la casilla sería
              pedirle un dato que el servidor le va a rechazar.
            */}
            {puedeVerPrecios && (
              <Selector
                etiqueta="Proveedor"
                opciones={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
                sinElegir="Sin proveedor"
                cuandoNoHay="Todavía no tienes proveedores. Se crean en «Compras»"
                value={proveedorId}
                onChange={(e) => {
                  setProveedorId(e.currentTarget.value);
                }}
              />
            )}

            {/*
              Y lo que **no** se pregunta aquí, dicho. «Nadie sabe cuánto se
              aprovecha al llegar, sino cuando está trabajando»: el producto nace
              marcado sin verificar y se corrige en su ficha el día que se sabe.
            */}
            <p className="text-secundario text-texto-tenue">
              El aprovechamiento —cuánto queda después de limpiar o pelar— no se pregunta aquí: se
              corrige en la ficha del producto cuando lo sepas. Hasta entonces sale marcado como
              «sin verificar».
            </p>

            <div>
              <Boton
                tono="texto"
                onClick={() => {
                  setElegida(null);
                  setAMano(false);
                }}
              >
                Buscar otro
              </Boton>
            </div>
          </>
        )}
      </div>
    </Hoja>
  );
}

/**
 * En qué se mide el producto · cinco pastillas.
 *
 * Como cinco pastillas y no como un `<select>` a propósito: son cinco, caben, y
 * verlas todas a la vez es lo que hace que se entienda la pregunta sin leer la
 * ayuda. Un desplegable de cinco esconde cuatro.
 */
function EnQueSeMide({
  valor,
  alElegir,
}: {
  readonly valor: string;
  readonly alElegir: (unidad: string) => void;
}) {
  return (
    <div>
      <p id="en-que-se-mide" className="text-etiqueta uppercase tracking-wide text-texto-suave">
        En qué se mide
      </p>
      <div
        role="radiogroup"
        aria-labelledby="en-que-se-mide"
        className="mt-e2 flex flex-wrap gap-e2"
      >
        {UNIDADES_DE_USO.map((unidad) => {
          const puesta = unidad === valor;
          return (
            <button
              key={unidad}
              type="button"
              role="radio"
              aria-checked={puesta}
              onClick={() => {
                alElegir(unidad);
              }}
              className={clases(
                'inline-flex min-h-toque min-w-[56px] items-center justify-center rounded-medio px-e3',
                'text-cuerpo font-medium',
                puesta
                  ? 'bg-charcoal text-superficie'
                  : 'border border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
              )}
            >
              {unidad}
            </button>
          );
        })}
      </div>
      <p className="mt-e2 text-secundario text-texto-suave">
        Cómo lo cuentas en cámara. Lo que lleva una ración se pone en la ficha de cada plato.
      </p>
    </div>
  );
}

/**
 * Comparar dos nombres de categoría sin acentos ni mayúsculas.
 *
 * Es el mismo criterio que usa `estook.sin_acentos` en la base de datos. Aquí solo
 * sirve para preseleccionar el desplegable: si acertara distinto que el servidor,
 * lo peor que pasa es que salga sin elegir.
 */
function sinAcentosSimple(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
