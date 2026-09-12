import { useState } from 'react';
import {
  FAMILIAS_DE_SALIDA,
  NOMBRE_DE_LA_FAMILIA,
  NOMBRE_DE_LA_PARTIDA,
  QUE_ES_CADA_FAMILIA,
  QUE_ES_CADA_SALIDA,
  centimos,
  conSimbolo,
  esMerma,
  esVenta,
  losDeLaFamilia,
  partidaDe,
  porCantidad,
  type MotivoDeMerma,
  type MotivoDeSalida,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Hoja,
  Interruptor,
  Selector,
  clases,
} from '@estook/ui';
import type { Centimos } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CampoPrecioDeCompra } from './CampoPrecioDeCompra.tsx';
import { comoDinero, conUnidadDeUso, type ProductoEnLista } from './contrato.ts';

/**
 * Mover género · «ha llegado», «ha salido» y, a un lado, «no cuadra» (M6½).
 *
 * ── Por qué vive en su propio fichero ───────────────────────────────────────
 *
 * Porque ahora se abre **desde dos sitios**: la ficha del producto y los botones
 * **+** y **−** de cada fila de la lista. Con el formulario dentro de la ficha, la
 * lista tenía que abrir la ficha entera para apuntar dos kilos de algo, que es
 * justo el gesto que se hace cuarenta veces al día.
 *
 * ── Lo que cambia respecto de M6 ────────────────────────────────────────────
 *
 *   · **El precio de la entrada viene puesto.** Es el de la lista. Si esta vez
 *     costó otro, se borra y se pone el de verdad: queda apuntado en esa línea del
 *     libro —y el precio medio se mueve con él— y, si se quiere, pasa a ser el
 *     precio del producto desde hoy. **No se olvida**: cada entrada guarda lo que
 *     costó, que es de donde saldrá «este mes has pagado el aceite un 8 % más».
 *
 *   · **La salida pregunta por qué, y en tres familias** (M7, repaso). Antes la
 *     primera opción era «Gastado o vendido», las dos cosas en el mismo botón, y
 *     con ellas juntas Estook no podía saber cuánto se había vendido de nada.
 *     Ahora se elige dentro de una de tres, y cada una dice lo que significa:
 *
 *       **Se ha vendido** · entra dinero. Se apunta lo que se ha cobrado.
 *       **Se ha usado** · no entra dinero: se cocinó, se fue a otro local.
 *       **No se ha aprovechado** · merma, con su motivo y su partida.
 *
 *     El catálogo vive en el dominio (`salida.ts`) y lo leen esta pantalla y el
 *     servidor, para que no haya dos sitios diciendo cómo se llama cada cosa.
 *
 *   · **Y lo vendido no suma dinero desde aquí.** Se guarda lo que se cobró, y
 *     el dinero del día lo cuenta el cierre de caja, que es su único dueño: al
 *     cerrarla, esto sale propuesto. Sumarlo en los dos sitios contaría el día
 *     dos veces sin que se viera, que es el fallo más caro que hay en una caja.
 *
 *   · **«Ajustar lo que hay» deja de ser un botón de los tres.** Tres botones del
 *     mismo tamaño decían que las tres cosas eran igual de normales, y no lo son:
 *     entrar y salir es el día a día, y cuadrar es la excepción. Sigue existiendo,
 *     porque una cámara que no cuadra hay que poder corregirla, pero se abre desde
 *     la propia cifra de lo que hay —«¿no cuadra?»—, que es donde se nota.
 */

export type QueSeMueve = 'entrada' | 'salida' | 'ajuste';

export function MoverGenero({
  que,
  producto,
  puedeVerPrecios,
  preciosConIva,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly que: QueSeMueve | null;
  readonly producto: ProductoEnLista;
  readonly puedeVerPrecios: boolean;
  /** Cómo apunta este local los precios: con IVA o sin él (Ajustes). */
  readonly preciosConIva: boolean;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  if (que === null) return null;
  // La `key` es lo que hace que abrir la hoja otra vez empiece limpia, con el
  // precio de la lista puesto de nuevo, en vez de con lo que se tecleó la vez
  // anterior.
  return (
    <ElFormulario
      key={`${producto.id}-${que}`}
      que={que}
      producto={producto}
      puedeVerPrecios={puedeVerPrecios}
      preciosConIva={preciosConIva}
      alCerrar={alCerrar}
      alHecho={alHecho}
      alFallar={alFallar}
    />
  );
}

function ElFormulario({
  que,
  producto,
  puedeVerPrecios,
  preciosConIva,
  alCerrar,
  alHecho,
  alFallar,
}: {
  readonly que: QueSeMueve;
  readonly producto: ProductoEnLista;
  readonly puedeVerPrecios: boolean;
  readonly preciosConIva: boolean;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente, permisos } = usarSesion();
  const deLaLista = producto.precioCentimos ?? null;

  const [cuanto, setCuanto] = useState('');
  const [como, setComo] = useState<'formatos' | 'unidades_de_uso'>(
    producto.formato !== null && !producto.pesoVariable ? 'formatos' : 'unidades_de_uso',
  );
  const [nota, setNota] = useState('');
  const [precio, setPrecio] = useState<Centimos | null>(deLaLista as Centimos | null);
  const [quedarseConElPrecio, setQuedarseConElPrecio] = useState(false);
  const [lote, setLote] = useState('');
  const [caduca, setCaduca] = useState('');
  const [porQue, setPorQue] = useState<MotivoDeSalida>('gastado');
  /** Lo que se ha cobrado, con impuesto. Solo cuando se ha vendido. */
  const [ingreso, setIngreso] = useState<Centimos | null>(null);
  const [ingresoTocado, setIngresoTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const numero = Number(cuanto.replace(',', '.'));
  const hayNumero = cuanto.trim() !== '' && Number.isFinite(numero);
  const enUnidadesDeUso = como === 'formatos' ? numero * producto.factor : numero;
  const puedeTocarPrecios = puedeEditar(permisos, 'dato.precio_de_compra');
  const precioDistinto = precio !== null && deLaLista !== null && precio !== deLaLista;
  const queEsEstaSalida = QUE_ES_CADA_SALIDA[porQue];

  /**
   * Lo que se habrá cobrado, si el producto tiene precio de venta.
   *
   * Se propone y **no se impone**: en cuanto alguien escribe un importe, manda el
   * suyo. Un precio propuesto que se pisa solo al cambiar la cantidad es un
   * importe inventado con la firma de quien lo apuntó.
   */
  const propuesto =
    producto.precioDeVentaCentimos === null || !hayNumero || enUnidadesDeUso <= 0
      ? null
      : porCantidad(centimos(producto.precioDeVentaCentimos), enUnidadesDeUso);
  const loCobrado = ingresoTocado ? ingreso : propuesto;

  const listo =
    hayNumero &&
    (que === 'ajuste' ? numero >= 0 && nota.trim() !== '' : numero > 0) &&
    (que !== 'salida' || !queEsEstaSalida.pideNota || nota.trim() !== '') &&
    !guardando;

  async function guardar() {
    setGuardando(true);

    // ── La salida que es merma va como merma ─────────────────────────────────
    //
    // Y va por su comando, no por este: la merma tiene su partida, su lista
    // cerrada de motivos y **su permiso**, que es el de la camarera, que no tiene
    // Inventario. El catálogo dice cuáles son; aquí solo se obedece.
    if (que === 'salida' && esMerma(porQue)) {
      const respuesta = await cliente.ejecutar<{ cantidad: number; unidadDeUso: string }>(
        'apuntar_merma',
        {
          producto_id: producto.id,
          cuanto: Math.abs(enUnidadesDeUso),
          motivo: queEsEstaSalida.motivoDeMerma,
          ...(nota.trim() === '' ? {} : { detalle: nota.trim() }),
        },
      );
      setGuardando(false);
      if (!respuesta.ok) {
        alFallar(respuesta.error);
        return;
      }
      alHecho(
        `Merma apuntada (${NOMBRE_DE_LA_PARTIDA[partidaDe(queEsEstaSalida.motivoDeMerma as MotivoDeMerma)].toLowerCase()}). Quedan ${conUnidadDeUso(respuesta.datos.cantidad, respuesta.datos.unidadDeUso)}.`,
      );
      return;
    }

    const comando =
      que === 'ajuste' ? 'ajustar_stock' : que === 'entrada' ? 'apuntar_entrada' : 'apuntar_salida';

    const cuerpo =
      que === 'ajuste'
        ? { producto_id: producto.id, hay: numero, motivo: nota.trim() }
        : que === 'entrada'
          ? {
              producto_id: producto.id,
              cuanto: Math.abs(numero),
              como,
              precio_centimos: precio,
              ...(lote.trim() === '' ? {} : { lote: lote.trim() }),
              ...(caduca === '' ? {} : { caduca_el: caduca }),
              ...(nota.trim() === '' ? {} : { motivo: nota.trim() }),
            }
          : {
              producto_id: producto.id,
              cuanto: Math.abs(numero),
              como,
              por_que: porQue,
              // Cómo se llama cada porqué lo escribe el servidor desde el mismo
              // catálogo: aquí solo viaja la nota, que es lo que ha escrito una
              // persona.
              ...(nota.trim() === '' ? {} : { motivo: nota.trim() }),
              ...(esVenta(porQue) && loCobrado !== null ? { ingreso_centimos: loCobrado } : {}),
            };

    const respuesta = await cliente.ejecutar<{
      cantidad: number;
      unidadDeUso: string;
      yaCuadraba?: boolean;
    }>(comando, cuerpo);

    if (!respuesta.ok) {
      setGuardando(false);
      alFallar(respuesta.error);
      return;
    }

    // ── Y el precio nuevo, si se ha dicho que se quede ──────────────────────
    //
    // Va **después** de apuntar la entrada, y es a propósito: la entrada ya lleva
    // lo que costó esta vez, que es lo que mueve el precio medio. Esto solo
    // cambia el precio de la lista, que es el que se propone la próxima vez.
    let frasePrecio = '';
    // `precioDistinto` ya dice que hay precio: no se pregunta otra vez.
    if (que === 'entrada' && precioDistinto && quedarseConElPrecio) {
      const puesto = await cliente.ejecutar<{ frase: string }>('poner_precio', {
        producto_id: producto.id,
        precio_centimos: precio,
        proveedor_id: producto.proveedorId,
      });
      if (puesto.ok) frasePrecio = ` ${puesto.datos.frase}`;
    }

    setGuardando(false);

    if (respuesta.datos.yaCuadraba === true) {
      alHecho('Ya cuadraba, así que no he apuntado nada.');
      return;
    }

    // Y cuando se ha vendido, se dice en la misma frase **dónde cuenta ese
    // dinero**. Callarlo dejaría a quien lo apunta creyendo que ya está sumado a
    // las ganancias, que es justo lo que no pasa.
    const fraseVenta =
      que === 'salida' && esVenta(porQue) && loCobrado !== null
        ? ` ${conSimbolo(loCobrado)} apuntados: salen propuestos al cerrar la caja de hoy.`
        : '';

    alHecho(
      `Apuntado. Quedan ${conUnidadDeUso(respuesta.datos.cantidad, respuesta.datos.unidadDeUso)}.${frasePrecio}${fraseVenta}`,
    );
  }

  const TITULOS: Record<QueSeMueve, { titulo: string; boton: string }> = {
    entrada: { titulo: 'Ha llegado género', boton: 'Apuntar la entrada' },
    salida: { titulo: 'Ha salido género', boton: 'Apuntar la salida' },
    ajuste: { titulo: 'No cuadra lo que hay', boton: 'Corregir' },
  };

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`${TITULOS[que].titulo} · ${producto.nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Apuntando"
            onClick={() => {
              void guardar();
            }}
          >
            {TITULOS[que].boton}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Ahora hay {conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}.
        </p>

        {que === 'ajuste' ? (
          <>
            <Campo
              etiqueta="Cuánto hay de verdad"
              tipo="numero"
              obligatorio
              autoFocus
              detras={producto.unidadDeUso}
              value={cuanto}
              onChange={(e) => {
                setCuanto(e.currentTarget.value);
              }}
            />
            <Campo
              etiqueta="Por qué no cuadraba"
              obligatorio
              ayuda="«Se rompió una caja», «faltaba en el albarán»."
              value={nota}
              onChange={(e) => {
                setNota(e.currentTarget.value);
              }}
            />
          </>
        ) : (
          <>
            {/* ── Por qué sale · solo en la salida ─────────────────────────── */}
            {/*
              Tres grupos con su título, y no once pastillas seguidas. Las once
              estaban, y la primera decía «Gastado o vendido»: con las dos cosas
              en el mismo botón nadie elegía mal, porque no había nada que elegir,
              y Estook se quedaba sin saber lo único que importa —si por eso que
              salió entró dinero o no—.
            */}
            {que === 'salida' && (
              <div
                role="radiogroup"
                aria-labelledby="por-que-sale"
                className="flex flex-col gap-e3"
              >
                <p
                  id="por-que-sale"
                  className="text-etiqueta uppercase tracking-wide text-texto-suave"
                >
                  Por qué sale
                </p>

                {FAMILIAS_DE_SALIDA.map((familia) => (
                  <div key={familia} className="flex flex-col gap-e2">
                    <p className="text-secundario font-semibold">
                      {NOMBRE_DE_LA_FAMILIA[familia]}
                      <span className="ml-e2 font-normal text-texto-suave">
                        {QUE_ES_CADA_FAMILIA[familia]}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-e2">
                      {losDeLaFamilia(familia).map((cual) => {
                        const puesto = cual === porQue;
                        return (
                          <button
                            key={cual}
                            type="button"
                            role="radio"
                            aria-checked={puesto}
                            title={QUE_ES_CADA_SALIDA[cual].que}
                            onClick={() => {
                              setPorQue(cual);
                            }}
                            className={clases(
                              'inline-flex min-h-toque items-center rounded-medio border px-e3 text-secundario font-medium',
                              puesto
                                ? 'border-naranja bg-naranja-suave text-texto'
                                : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
                            )}
                          >
                            {QUE_ES_CADA_SALIDA[cual].nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {esMerma(porQue) && (
                  <p aria-live="polite" className="text-secundario text-texto-suave">
                    Se apunta como merma, en la partida de{' '}
                    <strong>
                      {NOMBRE_DE_LA_PARTIDA[
                        partidaDe(queEsEstaSalida.motivoDeMerma as MotivoDeMerma)
                      ].toLowerCase()}
                    </strong>
                    .
                  </p>
                )}
              </div>
            )}

            {/* ── Cuánto ────────────────────────────────────────────────────── */}
            {!producto.pesoVariable && producto.formato !== null && (
              <Selector
                etiqueta="Cómo lo cuentas"
                opciones={[
                  { valor: 'formatos', texto: `Por envases (${producto.formato.toLowerCase()})` },
                  { valor: 'unidades_de_uso', texto: `En ${producto.unidadDeUso}` },
                ]}
                value={como}
                onChange={(e) => {
                  setComo(e.currentTarget.value as 'formatos' | 'unidades_de_uso');
                }}
              />
            )}

            {producto.pesoVariable && que === 'entrada' && (
              <Aviso tono="info" titulo="Este va a peso variable">
                Pon el peso que ha llegado de verdad, no cuántas cajas.
              </Aviso>
            )}

            <Campo
              etiqueta="Cuánto"
              tipo="numero"
              obligatorio
              autoFocus
              value={cuanto}
              detras={como === 'formatos' ? 'envases' : producto.unidadDeUso}
              {...(como === 'formatos' && hayNumero && numero > 0
                ? { ayuda: `Son ${conUnidadDeUso(enUnidadesDeUso, producto.unidadDeUso)}.` }
                : {})}
              onChange={(e) => {
                setCuanto(e.currentTarget.value);
              }}
            />

            {/* ── Lo que se ha cobrado · solo cuando se ha vendido ────────── */}
            {/*
              ── La pregunta de «¿esto se suma a mis ganancias?» ──────────────

              Se contesta aquí, y se contesta con la verdad: **el dinero de una
              jornada se cuenta en un solo sitio**, que es el cierre de caja. Si
              esto sumara por su cuenta y además se metiera el papel de la caja,
              el día valdría el doble y no habría forma de verlo.

              Así que lo que se cobra se apunta, y al cerrar la caja sale
              propuesto con su nombre y su importe. Decide una persona, una vez.
            */}
            {que === 'salida' && esVenta(porQue) && (
              <div className="flex flex-col gap-e2 rounded-medio border border-borde bg-fondo p-e3">
                <CampoMoneda
                  etiqueta="Cuánto has cobrado"
                  ayuda={
                    producto.precioDeVentaCentimos === null
                      ? 'Con IVA, lo que ha pagado el cliente. Si no lo sabes, déjalo en blanco.'
                      : `A su precio de venta salen ${conSimbolo(propuesto ?? centimos(0))}. Cámbialo si has cobrado otra cosa.`
                  }
                  valor={loCobrado}
                  alCambiar={(nuevo) => {
                    setIngresoTocado(true);
                    setIngreso(nuevo);
                  }}
                />

                {producto.precioDeVentaCentimos === null && (
                  <p className="text-etiqueta text-texto-tenue">
                    Si le pones precio de venta en su ficha, la próxima vez sale puesto solo.
                  </p>
                )}

                <p className="text-secundario text-texto-suave">
                  <strong className="text-texto">Esto se cuenta en la caja del día.</strong> Queda
                  apuntado con lo que has cobrado y te sale propuesto al cerrar la caja de hoy. No
                  se suma aquí y allí: el día se contaría dos veces.
                </p>
                <p className="text-etiqueta text-texto-tenue">
                  Y puedes ahorrártelo: conectando el TPV, o subiendo el fichero o la foto del
                  cierre, las ventas entran solas. Está en Servicio, en «Cómo entran tus ventas».
                </p>
              </div>
            )}

            {/* ── Lo que ha costado · solo en la entrada ──────────────────── */}
            {que === 'entrada' && puedeVerPrecios && (
              <>
                <CampoPrecioDeCompra
                  etiqueta={producto.formato === null ? 'Precio' : 'Precio del envase'}
                  ayuda={
                    deLaLista === null
                      ? 'Si lo dejas en blanco, entra sin valorar.'
                      : 'Es el de tu lista. Si esta vez te ha costado otro, cámbialo: queda apuntado.'
                  }
                  valor={precio}
                  alCambiar={setPrecio}
                  iva={producto.ivaDeCompra}
                  conIvaDeEntrada={preciosConIva}
                />
                {precioDistinto && puedeTocarPrecios && (
                  <Interruptor
                    etiqueta="Usarlo como su precio a partir de hoy"
                    ayuda={`Ahora es ${comoDinero(deLaLista)}. El de antes queda en el histórico.`}
                    puesto={quedarseConElPrecio}
                    alCambiar={setQuedarseConElPrecio}
                  />
                )}
                <div className="grid gap-e3 sm:grid-cols-2">
                  <Campo
                    etiqueta="Caduca el"
                    tipo="fecha"
                    ayuda="Opcional. La más próxima si hay varias."
                    value={caduca}
                    onChange={(e) => {
                      setCaduca(e.currentTarget.value);
                    }}
                  />
                  <Campo
                    etiqueta="Lote"
                    ayuda="Opcional."
                    value={lote}
                    onChange={(e) => {
                      setLote(e.currentTarget.value);
                    }}
                  />
                </div>
              </>
            )}

            <Campo
              etiqueta={que === 'salida' && queEsEstaSalida.pideNota ? 'Qué ha pasado' : 'Nota'}
              obligatorio={que === 'salida' && queEsEstaSalida.pideNota}
              {...(que === 'salida' && queEsEstaSalida.pideNota ? {} : { ayuda: 'Opcional.' })}
              value={nota}
              onChange={(e) => {
                setNota(e.currentTarget.value);
              }}
            />
          </>
        )}
      </div>
    </Hoja>
  );
}
