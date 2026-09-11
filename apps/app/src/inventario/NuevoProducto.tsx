import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  centimos,
  comoSeCompraDe,
  enPlural,
  ivaDeCompraPorDefecto,
  loQueSale,
  precioDelFormato,
  presentacionDe,
  type ComoSeCompra,
} from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Interruptor,
  Selector,
  clases,
} from '@estook/ui';
import { IconoBuscar } from '@estook/iconos';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { SelectorDeCategoria } from './SelectorDeCategoria.tsx';
import { ComoLoCompras } from './ComoLoCompras.tsx';
import { CampoPrecioDeCompra } from './CampoPrecioDeCompra.tsx';
import {
  comoDinero,
  type CatalogoDeReferencia,
  type CategoriaDelLocal,
  type ProveedorDelLocal,
  type ReferenciaDelCatalogo,
} from './contrato.ts';

/**
 * Dar de alta un producto (M6, rehecho en M6½ y otra vez en M7).
 *
 * ── Lo que pedía Richi, y por qué se ha rehecho una tercera vez ─────────────
 *
 * «Pongo queso azul, que viene en un envase de 250 g: una opción de envase, y
 *  que sean cuántas unidades, cuánto pesa cada una y cuánto cuestan todas o el
 *  precio unitario, y que haga el cálculo. La fruta, por kilo; la leche, por
 *  litro. No explicándolo con texto sino con un buen diseño y cálculos internos.»
 *
 * La versión de M6½ preguntaba «en qué se mide» con cinco pastillas —kg, l, ud,
 * g, ml— y «cuánto trae». Era corta, pero **obligaba a pensar en la unidad de
 * cuenta**, que es un concepto de Estook y no del hostelero: quien compra seis
 * tarros de 250 g no piensa «ud con factor 6», piensa «una caja de seis tarros».
 *
 * ── Lo que pregunta ahora, en este orden ────────────────────────────────────
 *
 *   1. **Producto** · cómo lo llamas tú
 *   2. **¿Cómo lo compras?** · por peso, por litros o por unidades, y las dos o
 *      tres preguntas de esa forma (ver `ComoLoCompras`)
 *   3. **El precio** · el de la caja o el de cada cosa, el que tengas a mano, con
 *      IVA o sin él; y la cuenta hecha debajo mientras se escribe
 *   4. **Cuánto hay ahora**, **caduca** y **está congelado**
 *   5. **Categoría** y **proveedor**
 *
 * Todo lo demás —en qué se cuenta, cuánto trae lo que se compra, cómo se llama y
 * el precio de la caja cuando se escribe el de un tarro— lo calcula el dominio
 * (`presentacionDe`, `precioDelFormato`, `sinIva`), que es donde vive la cuenta.
 *
 * ── «Cuánto hay» sigue siendo lo que arregla el inventario ──────────────────
 *
 * «Añades un producto nuevo y debería actualizarse lo que hay.» El comando apunta
 * la entrada en el libro, con su precio, así que la cámara vale desde el primer
 * día (M6½).
 */
export function NuevoProducto({
  abierta,
  alCerrar,
  alCrear,
  categorias,
  proveedores,
  puedeVerPrecios,
  preciosConIva,
  territorio,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly alCrear: (productoId: string, ejemplosQueQuedan: number) => void;
  readonly categorias: readonly CategoriaDelLocal[];
  readonly proveedores: readonly ProveedorDelLocal[];
  readonly puedeVerPrecios: boolean;
  /** Cómo apunta este local los precios: con IVA o sin él (Ajustes). */
  readonly preciosConIva: boolean;
  /** De dónde sale el IVA que se propone: Canarias no paga IVA. */
  readonly territorio: string;
}) {
  const { cliente } = usarSesion();

  const [texto, setTexto] = useState('');
  const [elegida, setElegida] = useState<ReferenciaDelCatalogo | null>(null);
  const [aMano, setAMano] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const [nombre, setNombre] = useState('');
  const [como, setComo] = useState<ComoSeCompra>(COMO_DE_ENTRADA);
  /** Lo escrito, **sin IVA**: de lo que diga `precioDe`. */
  const [precio, setPrecio] = useState<Centimos | null>(null);
  /** Qué precio se tiene a mano: el de la caja o el de cada cosa. */
  const [precioDe, setPrecioDe] = useState<'formato' | 'unidad'>('formato');
  /** El IVA, si se ha tocado. Nulo: el de su categoría. */
  const [ivaElegido, setIvaElegido] = useState<number | null>(null);
  /** Cuánto hay ya en cámara, en unidades de uso. */
  const [cuantoHay, setCuantoHay] = useState('');
  const [caducaEl, setCaducaEl] = useState('');
  const [congelado, setCongelado] = useState(false);
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
    setComo(COMO_DE_ENTRADA);
    setPrecio(null);
    setPrecioDe('formato');
    setIvaElegido(null);
    setCuantoHay('');
    setCaducaEl('');
    setCongelado(false);
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
    // Lo que trae el catálogo, contestado ya: «Garrafa de 5 l» es «por litros,
    // en garrafas de 5». Es una propuesta y se cambia a la vista.
    setComo(
      comoSeCompraDe({
        unidadDeUso: referencia.unidadDeUso,
        factor: referencia.factor,
        formato: referencia.formato,
        contenidoPorUnidad: null,
        unidadDelContenido: null,
      }),
    );
    const suya = categorias.find(
      (c) => sinAcentosSimple(c.nombre) === sinAcentosSimple(referencia.categoria),
    );
    setCategoriaId(suya?.id ?? '');
  }

  // ── Las cuentas, todas del dominio ────────────────────────────────────────
  const presentacion = presentacionDe(como);
  const hayDosPrecios = presentacion.precioDeLaUnidad !== null;
  const porUnidad = hayDosPrecios && precioDe === 'unidad';
  /** Lo que se guarda: el precio de lo que se compra, sin IVA. */
  const elDelFormato =
    precio === null
      ? null
      : porUnidad
        ? precioDelFormato(centimos(precio), presentacion)
        : centimos(precio);
  const sale =
    elDelFormato === null || elDelFormato === 0 ? null : loQueSale(elDelFormato, presentacion);

  const ivaPropuesto = ivaDeCompraPorDefecto(elegida?.categoriaFiscal ?? 'alimento', territorio);
  const iva = ivaElegido ?? ivaPropuesto;

  const hayNumero = cuantoHay.trim() === '' ? null : Number(cuantoHay.replace(',', '.'));
  const hayVale = hayNumero === null || (Number.isFinite(hayNumero) && hayNumero >= 0);
  const hayAlgo = hayNumero !== null && hayNumero > 0;
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
      precio_centimos: elDelFormato,
      // Se compone, no se escribe: «Caja de 6 tarros de 250 g».
      formato: presentacion.formato,
      factor: presentacion.factor,
      unidad_de_uso: presentacion.unidadDeUso,
      ...(presentacion.contenidoPorUnidad !== null && presentacion.unidadDelContenido !== null
        ? {
            contenido_por_unidad: presentacion.contenidoPorUnidad,
            unidad_del_contenido: presentacion.unidadDelContenido,
          }
        : {}),
      // El IVA solo viaja si no es el de su categoría: si mañana cambia la ley,
      // los que siguen «el de su categoría» cambian solos.
      ...(ivaElegido !== null && ivaElegido !== ivaPropuesto ? { iva_de_compra: ivaElegido } : {}),
      // El rendimiento **no se manda**: el producto nace «sin verificar» (M6½).
      ...(hayAlgo ? { cantidad_inicial: hayNumero } : {}),
      ...(caducaEl === '' ? {} : { caduca_el: caducaEl }),
      ...(hayAlgo && congelado ? { congelado: true } : {}),
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
  const enQueSeCuenta = como.modo === 'unidades' ? enPlural(como.envase) : presentacion.unidadDeUso;

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
                una propuesta: cámbialo si tú lo compras de otra forma.
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

            {/* 2 · Cómo lo compras */}
            <ComoLoCompras
              key={elegida?.id ?? 'a-mano'}
              valor={como}
              alCambiar={(nuevo) => {
                setComo(nuevo);
                // Si ya no hay dos precios que elegir, se vuelve al de siempre.
                if (presentacionDe(nuevo).precioDeLaUnidad === null) setPrecioDe('formato');
              }}
            />

            {/* 3 · El precio, el que se tenga a mano */}
            {puedeVerPrecios && (
              <div className="flex flex-col gap-e3 rounded-medio border border-borde p-e3">
                {hayDosPrecios && (
                  <div
                    role="radiogroup"
                    aria-label="Qué precio tienes a mano"
                    className="flex flex-wrap gap-e2"
                  >
                    {(
                      [
                        ['formato', presentacion.precioDelFormato],
                        ['unidad', presentacion.precioDeLaUnidad],
                      ] as const
                    ).map(([cual, frase]) => (
                      <button
                        key={cual}
                        type="button"
                        role="radio"
                        aria-checked={precioDe === cual}
                        onClick={() => {
                          setPrecioDe(cual);
                        }}
                        className={clases(
                          'inline-flex min-h-toque items-center rounded-medio border px-e3 text-secundario font-medium',
                          precioDe === cual
                            ? 'border-naranja bg-naranja-suave text-texto'
                            : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
                        )}
                      >
                        {conMayuscula(deLo(frase))}
                      </button>
                    ))}
                  </div>
                )}

                <CampoPrecioDeCompra
                  key={`${elegida?.id ?? 'a-mano'}-${String(ivaPropuesto)}`}
                  etiqueta={`Precio ${deLo(
                    porUnidad ? presentacion.precioDeLaUnidad : presentacion.precioDelFormato,
                  )}`}
                  valor={precio}
                  alCambiar={setPrecio}
                  iva={iva}
                  conIvaDeEntrada={preciosConIva}
                  alElegirTipo={setIvaElegido}
                />

                {/*
                  La cuenta hecha, recalculada mientras se escribe. Es lo que hace
                  que alguien note que se ha equivocado **antes** de guardar.
                */}
                {sale !== null && elDelFormato !== null && (
                  <p
                    aria-live="polite"
                    className="rounded-medio bg-naranja-suave px-e3 py-e2 text-cuerpo font-medium"
                  >
                    {laCuentaHecha(
                      porUnidad,
                      elDelFormato,
                      sale,
                      presentacion.precioDelFormato,
                      presentacion.precioDeLaUnidad,
                    )}
                    {iva !== null && (
                      <span className="font-normal text-texto-suave">, sin IVA</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* 4 · Cuánto hay, caduca y congelado */}
            <Campo
              etiqueta="Cuánto hay ahora"
              tipo="numero"
              value={cuantoHay}
              detras={enQueSeCuenta}
              ayuda="Lo que tienes ahora mismo. Entra con su precio, para que la cámara valga desde hoy."
              onChange={(e) => {
                setCuantoHay(e.currentTarget.value);
              }}
            />

            <Campo
              etiqueta="Caduca el"
              tipo="fecha"
              value={caducaEl}
              ayuda="Opcional. Si hay varias fechas, la más próxima."
              onChange={(e) => {
                setCaducaEl(e.currentTarget.value);
              }}
            />

            {hayAlgo && (
              <Interruptor
                etiqueta="Está congelado"
                ayuda="Sale en «Congelados», con la fecha de hoy."
                puesto={congelado}
                alCambiar={setCongelado}
              />
            )}

            {/* 5 · Categoría y proveedor */}
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
              El aprovechamiento —cuánto queda después de limpiar o pelar— se corrige en la ficha
              cuando lo sepas. Hasta entonces sale como «sin verificar».
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

/** Por peso, suelto, a tanto el kilo: lo más normal, y con lo que se empieza. */
const COMO_DE_ENTRADA: ComoSeCompra = {
  modo: 'peso',
  unidad: 'kg',
  porBulto: null,
  envase: 'Caja',
  contenido: null,
};

/** «la caja» → «de la caja»; «el kg» → «del kg»; «cada tarro» → «de cada tarro». */
function deLo(frase: string): string {
  return frase.startsWith('el ') ? `del ${frase.slice(3)}` : `de ${frase}`;
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * La cuenta, en una línea.
 *
 * Con el precio de la caja escrito, a cuánto sale cada cosa: «Sale a 3,50 € cada
 * tarro · 14,00 € el kg». Con el de cada cosa, lo que cuesta la caja: «La caja
 * sale a 21,00 €». Lo que ya se ha escrito no se repite.
 */
function laCuentaHecha(
  porUnidad: boolean,
  delFormato: Centimos,
  sale: ReturnType<typeof loQueSale>,
  fraseDelFormato: string,
  fraseDeLaUnidad: string | null,
): string {
  const delKilo =
    sale.porKiloOLitro === null
      ? null
      : `${comoDinero(sale.porKiloOLitro.centimos)} el ${sale.porKiloOLitro.unidad === 'kg' ? 'kg' : 'litro'}`;

  if (porUnidad) {
    const caja = `${conMayuscula(fraseDelFormato)} sale a ${comoDinero(delFormato)}`;
    return delKilo === null ? caja : `${caja} · ${delKilo}`;
  }

  const partes = [
    sale.porUnidad === null || fraseDeLaUnidad === null
      ? null
      : `${comoDinero(sale.porUnidad)} ${fraseDeLaUnidad}`,
    delKilo,
  ].filter((parte): parte is string => parte !== null);
  return partes.length === 0
    ? `${conMayuscula(fraseDelFormato)}: ${comoDinero(delFormato)}`
    : `Sale a ${partes.join(' · ')}`;
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
