import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UNIDADES_DE_USO, comoSaleElCoste, esUnidadDeUso } from '@estook/dominio';
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
import { IconoBuscar, IconoFlechaAbajo } from '@estook/iconos';
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
 * Dar de alta un producto (M6) · los treinta segundos.
 *
 * ── Lo que preguntaba, y por qué estaba mal ──────────────────────────────────
 *
 * «Preguntas cosas como "cómo lo compras", "cuánto trae", "unidad con la que
 * cocinas"… no tienen sentido.» Y tenía razón, por dos motivos distintos:
 *
 *   · **Le hacía hacer cuentas a quien da de alta un producto.** Un saco de
 *     harina de 25 kg obligaba a escribir «Saco de 25 kg», luego «25000», luego
 *     elegir «g», y entender por qué. Tres preguntas y una multiplicación para
 *     decir «compro harina, a tanto el kilo».
 *   · **Y preguntaba en el sitio equivocado.** Cuántos gramos lleva una ración no
 *     es del producto: es de **la ficha técnica**, que es donde se dice qué lleva
 *     un plato y cuánto cuesta la ración. Eso es M9, y el producto solo tiene que
 *     saber en qué se mide y a cuánto sale.
 *
 * ── Lo que pregunta ahora ────────────────────────────────────────────────────
 *
 * Tres cosas: **cómo se llama, en qué se mide y lo que cuesta esa medida**. Si
 * eliges kilos, la casilla de precio dice «lo que te cuesta el kg». No hay nada
 * que multiplicar.
 *
 * Debajo, plegado, está **«lo compro por envases»**, que es lo que había antes y
 * sigue haciendo falta para quien compra garrafas de 8 l o cajas de 5 kg: ahí se
 * escribe el envase, cuánto trae y el precio del envase entero, y la cuenta se
 * enseña hecha. Se despliega solo cuando se elige del catálogo, porque el catálogo
 * **propone un envase** y esconderlo obligaría a hacer la cuenta de cabeza — que
 * es justo el fallo 11 de M6.
 *
 * Lo importante es que **es lo mismo por debajo**: `formato`, `factor` y
 * `unidad_de_uso` siguen siendo lo que el servidor recibe. En el modo sencillo el
 * factor es 1 y el formato va vacío, así que «el precio del kg» **es** el precio
 * de una unidad de uso. Un solo camino de datos, dos formas de preguntarlo.
 *
 * ── Por qué se busca antes de escribir nada ──────────────────────────────────
 *
 * «Escribes "aceite de oliva" y salen las variantes con su unidad de compra, su
 *  factor, su rendimiento aproximado, su categoría y sus alérgenos ya puestos»
 *  (Manifiesto 8). Y **«Crearlo a mano» va arriba**, al lado de la casilla: es el
 *  botón que usa cualquiera que compre algo que el catálogo no tenga, y estaba
 *  debajo de doce resultados.
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

  // Lo que se pone encima de la referencia, o del formulario a mano.
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState<Centimos | null>(null);
  const [proveedorId, setProveedorId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [formato, setFormato] = useState('');
  const [factor, setFactor] = useState('1');
  const [unidad, setUnidad] = useState('kg');
  const [rendimiento, setRendimiento] = useState('100');
  /**
   * Si se está comprando por envases.
   *
   * Cerrado, el producto se mide en su unidad y el precio es el de esa unidad.
   * Abierto, vuelve lo de antes: envase, cuánto trae y precio del envase entero.
   * Se abre solo al elegir del catálogo, porque el catálogo propone un envase.
   */
  const [porEnvases, setPorEnvases] = useState(false);
  /**
   * Si alguien ha tocado el rendimiento de verdad.
   *
   * El servidor marca «sin verificar» cuando el rendimiento **no viene**, porque
   * «un rendimiento mal puesto es el error más caro del sistema» (Auditoría
   * 1.2). Esta pantalla lo mandaba siempre, con su 100 por defecto, así que
   * ningún producto creado a mano salía marcado nunca: la etiqueta existía, la
   * probaba el servidor, y en pantalla no aparecía jamás.
   */
  const [rendimientoTocado, setRendimientoTocado] = useState(false);

  /**
   * Cuántas letras hacen falta antes de preguntar al catálogo.
   *
   * La consulta se hacía **también con la casilla vacía**, así que abrir la hoja
   * enseñaba de entrada doce referencias elegidas por nada. Con dos letras ya hay
   * algo que buscar y la lista significa algo.
   */
  const DESDE_CUANTAS_LETRAS = 2;
  const buscando = texto.trim().length >= DESDE_CUANTAS_LETRAS;

  const catalogo = useQuery({
    queryKey: ['catalogo_de_referencia', texto],
    enabled: abierta && !aMano && buscando,
    queryFn: async (): Promise<CatalogoDeReferencia> => {
      const respuesta = await cliente.consultar<CatalogoDeReferencia>('catalogo_de_referencia', {
        ...(texto.trim() === '' ? {} : { texto: texto.trim() }),
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
    setPrecio(null);
    setProveedorId('');
    setCategoriaId('');
    setFormato('');
    setFactor('1');
    setUnidad('kg');
    setRendimiento('100');
    setRendimientoTocado(false);
    setPorEnvases(false);
    setError(null);
  }

  function cerrar() {
    limpiar();
    alCerrar();
  }

  function elegir(referencia: ReferenciaDelCatalogo) {
    setElegida(referencia);
    setNombre(referencia.nombre);
    // El envase de la referencia es una **propuesta**: se rellena y se puede
    // cambiar. Quien compra garrafas de 8 l escribe 8000 y sigue.
    setFormato(referencia.formato);
    setFactor(String(referencia.factor));
    setUnidad(referencia.unidadDeUso);
    // Y se abre el pliegue, porque si no la propuesta quedaría escondida y habría
    // que hacer la cuenta de cabeza: es el fallo 11 de M6, y no vuelve.
    setPorEnvases(true);
    // `toFixed` y no `Math.round`: la regla 9 prohibe redondear a mano fuera de
    // los motores de dominio, y aqui lo que se quiere es texto para una casilla.
    setRendimiento((referencia.rendimiento * 100).toFixed(0));
    setRendimientoTocado(false);
    // La categoría del local que se llama igual que la del catálogo. Si no está,
    // se deja sin elegir: el producto puede vivir sin categoría, y proponerle una
    // que no es sería peor que no proponer ninguna.
    const suya = categorias.find(
      (c) => sinAcentosSimple(c.nombre) === sinAcentosSimple(referencia.categoria),
    );
    setCategoriaId(suya?.id ?? '');
  }

  const elFactor = porEnvases ? Number(factor.replace(',', '.')) || 1 : 1;
  const elRendimiento = Math.min(
    1,
    Math.max(0.0001, (Number(rendimiento.replace(',', '.')) || 100) / 100),
  );

  async function guardar() {
    setError(null);
    setGuardando(true);

    const cuerpo = {
      nombre: nombre.trim(),
      ...(elegida === null ? {} : { de_referencia: elegida.id }),
      categoria_id: categoriaId === '' ? null : categoriaId,
      proveedor_id: proveedorId === '' ? null : proveedorId,
      precio_centimos: precio,
      // Sin envases, el formato va vacío y el factor es 1: el precio que se ha
      // escrito **es** el de una unidad de uso, y la aritmética del servidor sale
      // igual sin enterarse de que hay dos formas de preguntarlo.
      formato: porEnvases && formato.trim() !== '' ? formato.trim() : null,
      factor: elFactor,
      unidad_de_uso: unidad,
      // Solo si alguien lo ha tocado: si no va, el servidor marca el producto
      // «sin verificar», que es justo lo que tiene que pasar.
      ...(rendimientoTocado ? { rendimiento: elRendimiento } : {}),
    };

    const respuesta = await cliente.ejecutar<{
      productoId: string;
      ejemplosQueQuedan: number;
    }>('crear_producto', cuerpo);

    setGuardando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    const { productoId, ejemplosQueQuedan } = respuesta.datos;
    limpiar();
    alCrear(productoId, ejemplosQueQuedan);
  }

  /**
   * La cuenta, hecha mientras se escribe.
   *
   * Es el mismo `comoSaleElCoste` que compone la frase del catálogo en el
   * servidor. No hay dos versiones de esta cuenta (regla 6): hay una, y esta
   * pantalla la llama con lo que hay en las casillas ahora mismo.
   *
   * **Solo se enseña comprando por envases**, que es donde hay una cuenta que
   * hacer. Sin envases decía «Una unidad = 1 kg para usar», que no explica nada:
   * es la definición de lo que acabas de escribir, devuelta como si fuera un
   * resultado.
   */
  const comoSale = comoSaleElCoste({
    formato: formato.trim() === '' ? 'El envase' : formato.trim(),
    factor: elFactor,
    unidadDeUso: esUnidadDeUso(unidad) ? unidad : 'ud',
    rendimiento: elRendimiento,
  });

  const listoParaGuardar = nombre.trim() !== '' && !guardando;

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
            disabled={!listoParaGuardar}
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

        {elegida === null && !aMano && (
          <>
            <Campo
              etiqueta="¿Qué producto es?"
              ayuda="Escribe cómo lo llamas tú. Si está en el catálogo, viene con su formato, su factor y sus alérgenos ya puestos."
              value={texto}
              delante={<IconoBuscar size={16} />}
              autoFocus
              onChange={(e) => {
                setTexto(e.currentTarget.value);
              }}
            />

            {/*
              Las dos salidas, **a la misma altura y siempre**. «Crearlo a mano»
              iba al final del todo, debajo de doce resultados del catálogo, y es
              el botón que más se pulsa: el catálogo es una ayuda, no un censo del
              género de España.
            */}
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
                Si no está en el catálogo, o si lo prefieres a tu manera.
              </p>
            </div>

            {!buscando ? (
              <p className="text-secundario text-texto-suave">
                Con dos letras empiezo a buscar en el catálogo de referencia. Vale con erratas y sin
                acentos.
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
                            {referencia.alergenos.length > 0 && (
                              <span className="text-secundario text-texto-suave">
                                Alérgenos: {referencia.alergenos.join(', ')}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {catalogo.data !== undefined && catalogo.data.productos.length === 0 && (
                  <Aviso tono="info" titulo="Eso no está en el catálogo">
                    No pasa nada: con «Crearlo a mano» se hace en un momento, y funciona exactamente
                    igual.
                  </Aviso>
                )}
              </>
            )}
          </>
        )}

        {(elegida !== null || aMano) && (
          <>
            {elegida !== null && (
              <Aviso tono="bien" titulo={`Del catálogo: ${elegida.nombre}`} esNoticia>
                Llega con su categoría, su tipo de impuesto y sus alérgenos ya puestos. El envase de
                aquí abajo es una propuesta: si tú lo compras de otra medida, cámbialo.
              </Aviso>
            )}

            <Campo
              etiqueta="Cómo se llama"
              obligatorio
              value={nombre}
              autoFocus
              onChange={(e) => {
                setNombre(e.currentTarget.value);
              }}
            />

            {/*
              En qué se mide · lo que antes era «unidad con la que cocinas» dentro
              de un desplegable de cinco opciones.

              Va como cinco pastillas y no como un `<select>` a propósito: son
              cinco, caben, y verlas todas a la vez es lo que hace que se entienda
              la pregunta sin leer la ayuda. Un desplegable de cinco esconde cuatro.
            */}
            <EnQueSeMide valor={unidad} alElegir={setUnidad} />

            {/*
              El precio, **en la unidad que se acaba de elegir**. Es la casilla que
              cierra el modo sencillo: eliges kg y te pregunta lo que te cuesta el
              kg. No hay nada que multiplicar.
            */}
            {puedeVerPrecios && !porEnvases && (
              <CampoMoneda
                etiqueta={`Lo que te cuesta el ${unidad}`}
                ayuda="Se puede dejar en blanco y ponerlo con el primer albarán."
                valor={precio}
                alCambiar={setPrecio}
              />
            )}

            {/* ── Lo compro por envases · plegado ─────────────────────────── */}

            <div className="rounded-medio border border-borde">
              <button
                type="button"
                aria-expanded={porEnvases}
                onClick={() => {
                  setPorEnvases(!porEnvases);
                }}
                className="flex w-full min-h-toque items-center justify-between gap-e2 px-e3 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-cuerpo font-medium">Lo compro por envases</span>
                  <span className="block text-secundario text-texto-suave">
                    Cajas, garrafas, sacos o bandejas, con su precio entero
                  </span>
                </span>
                <span
                  aria-hidden
                  className={clases(
                    'shrink-0 text-texto-suave transition-transform duration-[--rapido]',
                    porEnvases && 'rotate-180',
                  )}
                >
                  <IconoFlechaAbajo size={18} />
                </span>
              </button>

              {porEnvases && (
                <div className="flex flex-col gap-e3 border-t border-borde p-e3">
                  <Campo
                    etiqueta="Cómo lo compras"
                    ayuda="Tal cual lo pone el albarán: «Caja de 5 kg», «Garrafa de 8 l»."
                    value={formato}
                    onChange={(e) => {
                      setFormato(e.currentTarget.value);
                    }}
                  />

                  <Campo
                    etiqueta="Cuánto trae"
                    tipo="numero"
                    ayuda={`En ${unidad}. Una garrafa de 8 l son 8000 si mides en ml.`}
                    value={factor}
                    detras={unidad}
                    onChange={(e) => {
                      setFactor(e.currentTarget.value);
                    }}
                  />

                  {/* La cuenta hecha, recalculada mientras se escribe. Es lo que
                      hace que alguien note que se ha equivocado **antes** de
                      guardar, y por eso va en su caja y no como un párrafo más. */}
                  <p
                    aria-live="polite"
                    className="rounded-medio bg-naranja-suave px-e3 py-e2 text-cuerpo font-medium"
                  >
                    {comoSale}
                  </p>

                  {puedeVerPrecios && (
                    <CampoMoneda
                      etiqueta="Lo que te cuesta"
                      ayuda={
                        formato.trim() === ''
                          ? 'El precio del envase entero, no el de la unidad. Se puede dejar en blanco.'
                          : `El precio de «${formato.trim()}», entero. Se puede dejar en blanco.`
                      }
                      valor={precio}
                      alCambiar={setPrecio}
                    />
                  )}

                  {/*
                    El aprovechamiento vive aquí dentro, y no fuera, porque es la
                    pregunta que solo tiene sentido para lo que se limpia o se
                    pela. Preguntársela a un saco de harina es ruido, y el ruido
                    en un formulario es lo que hace que nadie dé de alta su
                    segundo producto.
                  */}
                  <Campo
                    etiqueta="Qué porcentaje se aprovecha"
                    tipo="numero"
                    ayuda={
                      elegida === null
                        ? 'Lo que queda después de limpiar o pelar. 100 si no se pierde nada.'
                        : `El catálogo propone ${rendimiento} %. Si tú lo compras ya limpio, cámbialo.`
                    }
                    value={rendimiento}
                    detras="%"
                    onChange={(e) => {
                      setRendimiento(e.currentTarget.value);
                      setRendimientoTocado(true);
                    }}
                  />
                </div>
              )}
            </div>

            <SelectorDeCategoria
              categorias={categorias}
              valor={categoriaId}
              alElegir={setCategoriaId}
              sinElegir="Sin categoría"
            />

            {/*
              El proveedor solo se pide a quien puede ver precios. Un cocinero da
              de alta productos y no ve lo que cuestan: enseñarle la casilla sería
              pedirle un dato que el servidor le va a rechazar.
            */}
            {puedeVerPrecios && (
              <Selector
                etiqueta="A quién se lo compras"
                opciones={proveedores.map((p) => ({ valor: p.id, texto: p.nombre }))}
                sinElegir="Todavía no lo sé"
                cuandoNoHay="Todavía no tienes proveedores. Se crean en «Compras»"
                value={proveedorId}
                onChange={(e) => {
                  setProveedorId(e.currentTarget.value);
                }}
              />
            )}

            <div>
              <Boton
                tono="texto"
                onClick={() => {
                  setElegida(null);
                  setAMano(false);
                  setPorEnvases(false);
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
 * Antes era un desplegable con la etiqueta «unidad con la que cocinas», y las dos
 * cosas estaban mal: el desplegable esconde cuatro de las cinco opciones, y el
 * nombre preguntaba por la cocina cuando lo que decide esto es **cómo lo compras
 * y cómo lo cuentas en cámara**. Los gramos de una ración son de la ficha
 * técnica, que es M9.
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
        Cómo lo cuentas en cámara y cómo te lo cobran. Lo que lleva una ración se pone en la ficha
        técnica de cada plato.
      </p>
    </div>
  );
}

/**
 * Comparar dos nombres de categoría sin acentos ni mayúsculas.
 *
 * Es el mismo criterio que usa `estook.sin_acentos` en la base de datos, y la
 * comparación que hace el servidor al copiar del catálogo. Aquí solo sirve para
 * preseleccionar el desplegable: si acertara distinto que el servidor, lo peor
 * que pasa es que el desplegable salga sin elegir.
 */
function sinAcentosSimple(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
