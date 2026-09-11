import { useState } from 'react';
import {
  MOTIVOS_DE_MERMA,
  NOMBRE_DEL_MOTIVO_DE_MERMA,
  NOMBRE_DE_LA_PARTIDA,
  partidaDe,
  type MotivoDeMerma,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { Aviso, Boton, Botones, Campo, Hoja, Interruptor, Selector, clases } from '@estook/ui';
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
 *   · **La salida pregunta por qué.** Con pastillas y no con un campo de texto:
 *     «se ha gastado», las cuatro mermas, la comida del personal, una invitación,
 *     un traspaso u otra cosa. Las que son merma **se apuntan como merma**, con su
 *     motivo y su partida; las que no, como una salida. Antes todo era «ha salido»
 *     con una nota, y una nota no se puede sumar.
 *
 *   · **«Ajustar lo que hay» deja de ser un botón de los tres.** Tres botones del
 *     mismo tamaño decían que las tres cosas eran igual de normales, y no lo son:
 *     entrar y salir es el día a día, y cuadrar es la excepción. Sigue existiendo,
 *     porque una cámara que no cuadra hay que poder corregirla, pero se abre desde
 *     la propia cifra de lo que hay —«¿no cuadra?»—, que es donde se nota.
 */

export type QueSeMueve = 'entrada' | 'salida' | 'ajuste';

/** Por qué sale el género. Las mermas son las de la lista cerrada de la 0028. */
type PorQueSale = 'gastado' | 'traspaso' | MotivoDeMerma;

const POR_QUE_SALE: readonly { readonly cual: PorQueSale; readonly nombre: string }[] = [
  // Lo más normal, primero: que se haya gastado en cocina o vendido.
  { cual: 'gastado', nombre: 'Gastado o vendido' },
  ...MOTIVOS_DE_MERMA.filter((m) => m !== 'otro').map((m) => ({
    cual: m,
    nombre: NOMBRE_DEL_MOTIVO_DE_MERMA[m],
  })),
  { cual: 'traspaso', nombre: 'A otro local' },
  { cual: 'otro', nombre: 'Otra cosa' },
];

/**
 * Si lo que sale se apunta como merma.
 *
 * «Otra cosa» **no**: es una salida con su nota. Una merma de motivo «otro» cuenta
 * como pérdida y sube el food cost, y quien pulsa «otra cosa» al sacar género no
 * está diciendo que se haya perdido nada.
 */
function esMerma(cual: PorQueSale): cual is Exclude<MotivoDeMerma, 'otro'> {
  return cual !== 'gastado' && cual !== 'traspaso' && cual !== 'otro';
}

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
  const [porQue, setPorQue] = useState<PorQueSale>('gastado');
  const [guardando, setGuardando] = useState(false);

  const numero = Number(cuanto.replace(',', '.'));
  const hayNumero = cuanto.trim() !== '' && Number.isFinite(numero);
  const enUnidadesDeUso = como === 'formatos' ? numero * producto.factor : numero;
  const puedeTocarPrecios = puedeEditar(permisos, 'dato.precio_de_compra');
  const precioDistinto = precio !== null && deLaLista !== null && precio !== deLaLista;

  const listo =
    hayNumero &&
    (que === 'ajuste' ? numero >= 0 && nota.trim() !== '' : numero > 0) &&
    (que !== 'salida' || porQue !== 'otro' || nota.trim() !== '') &&
    !guardando;

  async function guardar() {
    setGuardando(true);

    // ── La salida que es merma va como merma ─────────────────────────────────
    if (que === 'salida' && esMerma(porQue)) {
      const respuesta = await cliente.ejecutar<{ cantidad: number; unidadDeUso: string }>(
        'apuntar_merma',
        {
          producto_id: producto.id,
          cuanto: Math.abs(enUnidadesDeUso),
          motivo: porQue,
          ...(nota.trim() === '' ? {} : { detalle: nota.trim() }),
        },
      );
      setGuardando(false);
      if (!respuesta.ok) {
        alFallar(respuesta.error);
        return;
      }
      alHecho(
        `Merma apuntada (${NOMBRE_DE_LA_PARTIDA[partidaDe(porQue)].toLowerCase()}). Quedan ${conUnidadDeUso(respuesta.datos.cantidad, respuesta.datos.unidadDeUso)}.`,
      );
      return;
    }

    const comando =
      que === 'ajuste' ? 'ajustar_stock' : que === 'entrada' ? 'apuntar_entrada' : 'apuntar_salida';

    const motivoDeLaSalida =
      porQue === 'gastado'
        ? 'Gastado o vendido'
        : porQue === 'traspaso'
          ? 'A otro local'
          : nota.trim();

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
              motivo:
                porQue !== 'otro' && nota.trim() !== ''
                  ? `${motivoDeLaSalida} · ${nota.trim()}`
                  : motivoDeLaSalida,
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

    alHecho(
      `Apuntado. Quedan ${conUnidadDeUso(respuesta.datos.cantidad, respuesta.datos.unidadDeUso)}.${frasePrecio}`,
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
            {que === 'salida' && (
              <div>
                <p
                  id="por-que-sale"
                  className="text-etiqueta uppercase tracking-wide text-texto-suave"
                >
                  Por qué sale
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="por-que-sale"
                  className="mt-e2 flex flex-wrap gap-e2"
                >
                  {POR_QUE_SALE.map(({ cual, nombre }) => {
                    const puesto = cual === porQue;
                    return (
                      <button
                        key={cual}
                        type="button"
                        role="radio"
                        aria-checked={puesto}
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
                        {nombre}
                      </button>
                    );
                  })}
                </div>
                {esMerma(porQue) && (
                  <p aria-live="polite" className="mt-e2 text-secundario text-texto-suave">
                    Se apunta como merma, en la partida de{' '}
                    <strong>{NOMBRE_DE_LA_PARTIDA[partidaDe(porQue)].toLowerCase()}</strong>.
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
              etiqueta={que === 'salida' && porQue === 'otro' ? 'Qué ha pasado' : 'Nota'}
              obligatorio={que === 'salida' && porQue === 'otro'}
              {...(que === 'salida' && porQue === 'otro' ? {} : { ayuda: 'Opcional.' })}
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
