import { useState } from 'react';
import {
  NOMBRE_DE_LA_ZONA,
  NOMBRE_DE_LO_QUE_FALTA,
  QUE_ES_LO_QUE_FALTA,
  QUE_HAGO_CON_LO_QUE_FALTA,
  ZONAS,
  leerUnCsvDeRecuento,
  type QueHagoConLoQueFalta,
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
  EstadoVacio,
  Etiqueta,
  Selector,
  Tarjeta,
  clases,
} from '@estook/ui';
import { IconoBuscar, IconoDocumento } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { conUnidadDeUso, type MisProductos, type ProductoEnLista } from './contrato.ts';

/**
 * El recuento · «hemos contado la cámara, esto es lo que hay» (M7).
 *
 * ── Lo que pidió Richi, y lo que significa ──────────────────────────────────
 *
 * «Que se pueda subir foto o archivo del inventario que hayan hecho para
 * actualizar todo. Es una opción que **cambia** todo el inventario, no suma: ya
 * han hecho el inventario y es el total que tienen.»
 *
 * Eso es un recuento, y es la operación que le faltaba a Inventario desde M6. El
 * permiso —`accion.cerrar_recuento`— estaba en la matriz desde M1 **sin ninguna
 * pantalla detrás**: siete módulos con la promesa rota.
 *
 * ── Las tres decisiones de esta pantalla ────────────────────────────────────
 *
 *   1. **No se rellena con lo que dice el libro.** Salen en blanco, y debajo, en
 *      pequeño, lo que decía. Poner la cifra de antes dentro de la casilla es
 *      pedirle a alguien que confirme un número mirándolo, y entonces el recuento
 *      no cuenta nada: solo confirma lo que ya había.
 *   2. **Una zona cada vez.** Se cuenta la cámara un día y la barra otro, que es
 *      como se hace de verdad, y además así ninguna vuelta pasa de doscientos
 *      productos.
 *   3. **Lo que no se cuenta no se toca**, salvo que se diga a propósito. Y
 *      entonces se avisa de cuántos se van a vaciar antes de tocar nada.
 */
export function Recuento() {
  const { cliente, permisos } = usarSesion();
  const [zona, setZona] = useState<Zona | ''>('cocina');
  const [texto, setTexto] = useState('');
  const [contado, setContado] = useState<Record<string, string>>({});
  const [loQueFalta, setLoQueFalta] = useState<QueHagoConLoQueFalta>('dejarlo');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noEntendidas, setNoEntendidas] = useState<readonly number[]>([]);
  const [hecho, setHecho] = useState<{
    corregidos: number;
    yaCuadraban: number;
    vaciados: number;
    loQueMasBaila: readonly {
      productoId: string;
      producto: string;
      decia: number;
      hay: number;
      unidadDeUso: string;
    }[];
  } | null>(null);

  const puedeContar = puedeEditar(permisos, 'accion.cerrar_recuento');

  const lista = usarLectura<MisProductos>('mis_productos', {
    ...(zona === '' ? {} : { zona }),
    limite: '200',
    incluir_ejemplos: 'false',
  });

  if (!puedeContar) {
    return (
      <Tarjeta titulo="Recuento">
        <EstadoVacio
          compacto
          titulo="Esto no lo llevas tú"
          frase="Contar la cámara y corregir lo que dice el libro lo hace quien responde de lo que falta."
          sinAccionPorque="Tu acceso permite mirar y apuntar, no cerrar un recuento."
        />
      </Tarjeta>
    );
  }

  if (lista.isPending) return <Cargando que="tu género" />;

  const datos = lista.data;
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tu género">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const buscado = texto.trim().toLowerCase();
  const productos = datos.productos.filter(
    (p) => buscado === '' || p.nombre.toLowerCase().includes(buscado),
  );

  const lineas = Object.entries(contado)
    .map(([productoId, escrito]) => ({ productoId, hay: Number(escrito.replace(',', '.')) }))
    .filter((l) => l.hay >= 0 && Number.isFinite(l.hay) && contado[l.productoId]?.trim() !== '');

  /** Los que se han contado y no cuadran con lo que decía el libro. */
  const queNoCuadran = lineas.filter((l) => {
    const suyo = datos.productos.find((p) => p.id === l.productoId);
    return suyo !== undefined && suyo.cantidad !== l.hay;
  }).length;

  /** Cuántos se vaciarían, si se ha pedido vaciar lo no contado. */
  const seVaciarian =
    loQueFalta === 'a_cero'
      ? datos.productos.filter(
          (p) => p.cantidad !== 0 && !lineas.some((l) => l.productoId === p.id),
        ).length
      : 0;

  function leerElFichero(fichero: File, deEstos: readonly ProductoEnLista[]) {
    setError(null);
    void fichero.text().then((texto) => {
      const leido = leerUnCsvDeRecuento(texto);
      const puesto: Record<string, string> = { ...contado };

      for (const linea of leido.lineas) {
        // Se empareja por nombre sin acentos o por código de barras, que es lo
        // que trae cualquier hoja de cálculo. Lo que no encaja con ningún
        // producto **se dice**, no se traga.
        const suyo = deEstos.find(
          (p) =>
            p.nombre.toLowerCase() === linea.cual.toLowerCase() || p.codigoDeBarras === linea.cual,
        );
        if (suyo === undefined) continue;
        puesto[suyo.id] = String(linea.hay);
      }

      setContado(puesto);
      setNoEntendidas(leido.noEntendidas.map((n) => n.fila));
    });
  }

  async function cerrar() {
    setGuardando(true);
    setError(null);

    const respuesta = await cliente.ejecutar<{
      corregidos: number;
      yaCuadraban: number;
      vaciados: number;
      loQueMasBaila: readonly {
        productoId: string;
        producto: string;
        decia: number;
        hay: number;
        unidadDeUso: string;
      }[];
    }>('cerrar_recuento', {
      lineas: lineas.map((l) => ({ producto_id: l.productoId, hay: l.hay })),
      lo_que_falta: loQueFalta,
      ...(zona === '' ? {} : { zona }),
    });

    setGuardando(false);
    setConfirmando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }

    setHecho(respuesta.datos);
    setContado({});
    await lista.refetch();
  }

  if (hecho !== null) {
    return (
      <div className="flex flex-col gap-e4">
        <Aviso tono="bien" titulo="Recuento cerrado" esNoticia>
          {hecho.corregidos === 0
            ? 'Cuadraba todo: no ha hecho falta corregir nada.'
            : `${hecho.corregidos} ${hecho.corregidos === 1 ? 'producto corregido' : 'productos corregidos'}, ${hecho.yaCuadraban} que ya cuadraban.`}
          {hecho.vaciados > 0 && ` Y ${hecho.vaciados} puestos a cero por no estar en lo contado.`}
        </Aviso>

        {hecho.loQueMasBaila.length > 0 && (
          <Tarjeta
            titulo="Lo que más bailaba"
            origen="La diferencia entre lo que decía el libro y lo que has contado"
          >
            <ul className="flex flex-col">
              {hecho.loQueMasBaila.map((l) => {
                const diferencia = l.hay - l.decia;
                return (
                  <li
                    key={l.productoId}
                    className="flex flex-wrap items-baseline justify-between gap-e2 border-b border-borde py-e2 last:border-0"
                  >
                    <span className="font-medium">{l.producto}</span>
                    <span className="text-secundario">
                      <span className="text-texto-suave">
                        decía {conUnidadDeUso(l.decia, l.unidadDeUso)} · hay{' '}
                        {conUnidadDeUso(l.hay, l.unidadDeUso)}
                      </span>{' '}
                      <strong className={diferencia < 0 ? 'text-mal' : 'text-bien'}>
                        {diferencia > 0 ? '+' : '−'}
                        {conUnidadDeUso(Math.abs(diferencia), l.unidadDeUso)}
                      </strong>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        )}

        <div>
          <Boton
            tono="secundario"
            onClick={() => {
              setHecho(null);
            }}
          >
            Contar otra zona
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}

      <Aviso tono="info" titulo="Esto cambia lo que hay, no lo suma">
        Escribe lo que has contado de verdad y cada producto pasará a valer eso. La diferencia con
        lo que decía el libro queda apuntada con tu nombre, que es la cifra que dice cuánto se va
        sin apuntarse.
      </Aviso>

      {/* ── Qué se cuenta ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-e3">
        <div className="min-w-[12rem]">
          <Selector
            etiqueta="Qué estás contando"
            ayuda="Una zona cada vez: se cuenta la cámara un día y la barra otro."
            opciones={ZONAS.map((z) => ({ valor: z, texto: NOMBRE_DE_LA_ZONA[z] }))}
            sinElegir="Todo"
            value={zona}
            onChange={(e) => {
              setZona(e.currentTarget.value as Zona | '');
              setContado({});
            }}
          />
        </div>
        <div className="min-w-[14rem] flex-1 max-w-[22rem]">
          <Campo
            etiqueta="Buscar"
            ayuda="Para ir al que estás contando sin bajar la lista."
            value={texto}
            delante={<IconoBuscar size={16} />}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        </div>
      </div>

      {/* ── O se sube el fichero ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-e3 rounded-medio border border-borde bg-fondo p-e3">
        <span aria-hidden className="text-texto-tenue">
          <IconoDocumento size={20} />
        </span>
        <p className="min-w-0 flex-1 text-secundario text-texto-suave">
          <strong className="text-texto">¿Lo tienes en un fichero?</strong> Dos columnas: el
          producto y cuánto hay. Se emparejan por nombre o por código de barras.
        </p>
        <label className="inline-flex min-h-toque cursor-pointer items-center rounded-medio border border-borde-fuerte bg-superficie px-e3 text-secundario font-medium hover:bg-fondo">
          Subir el fichero
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            className="sr-only"
            onChange={(e) => {
              const fichero = e.currentTarget.files?.[0];
              if (fichero !== undefined) leerElFichero(fichero, datos.productos);
            }}
          />
        </label>
        {/* Leer el recuento de una foto llega con Fogón (M22); el botón apagado que
            había aquí se quitó en la entrega V (0045). */}
      </div>

      {noEntendidas.length > 0 && (
        <Aviso tono="atencion" titulo="Hay filas que no he entendido">
          Las filas {noEntendidas.join(', ')} del fichero no traían un producto y una cantidad. El
          resto está abajo: repásalo antes de cerrar.
        </Aviso>
      )}

      {/* ── La lista ───────────────────────────────────────────────────── */}
      <Tarjeta
        titulo={`${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}`}
        origen={
          lineas.length === 0
            ? 'Escribe lo que has contado. Lo que dejes en blanco no se toca'
            : `Llevas ${lineas.length} contados, ${queNoCuadran} que no cuadran`
        }
      >
        {productos.length === 0 ? (
          <EstadoVacio
            compacto
            titulo="Nada que contar aquí"
            frase="Prueba con otra zona, o quita lo que has escrito en el buscador."
            sinAccionPorque="El género se da de alta en «Productos»."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {productos.map((p) => (
              <LineaDeRecuento
                key={p.id}
                producto={p}
                escrito={contado[p.id] ?? ''}
                alEscribir={(valor) => {
                  setContado((antes) => ({ ...antes, [p.id]: valor }));
                }}
              />
            ))}
          </ul>
        )}

        {datos.hayMas && (
          <p className="mt-e3 text-secundario text-texto-suave">
            Hay más de doscientos en esta zona. Cuenta estos y cierra; al volver saldrán los que
            falten.
          </p>
        )}
      </Tarjeta>

      {/* ── Y lo que no se ha contado ──────────────────────────────────── */}
      <Tarjeta titulo="Lo que no hayas contado">
        <div
          role="radiogroup"
          aria-label="Lo que no hayas contado"
          className="grid gap-e2 sm:grid-cols-2"
        >
          {QUE_HAGO_CON_LO_QUE_FALTA.map((cual) => {
            const puesto = cual === loQueFalta;
            return (
              <button
                key={cual}
                type="button"
                role="radio"
                aria-checked={puesto}
                onClick={() => {
                  setLoQueFalta(cual);
                }}
                className={clases(
                  'flex min-h-toque flex-col items-start gap-e1 rounded-medio border px-e3 py-e2 text-left transition-colors duration-rapido',
                  puesto
                    ? 'border-naranja bg-naranja-suave'
                    : 'border-borde-fuerte bg-superficie hover:bg-fondo',
                )}
              >
                <span className="text-cuerpo font-medium">{NOMBRE_DE_LO_QUE_FALTA[cual]}</span>
                <span className="text-etiqueta text-texto-suave">{QUE_ES_LO_QUE_FALTA[cual]}</span>
              </button>
            );
          })}
        </div>

        {seVaciarian > 0 && (
          <Aviso tono="atencion" titulo={`Se van a poner a cero ${seVaciarian}`}>
            Son los productos {zona === '' ? '' : `de ${NOMBRE_DE_LA_ZONA[zona].toLowerCase()} `}
            que tienen algo apuntado y que no has contado. Si solo has contado una parte, deja «
            {NOMBRE_DE_LO_QUE_FALTA.dejarlo}».
          </Aviso>
        )}
      </Tarjeta>

      <Botones>
        <Boton
          tono="principal"
          disabled={lineas.length === 0 || guardando}
          cargando={guardando}
          textoCargando="Cerrando"
          onClick={() => {
            // Vaciar productos es de lo poco que no se deshace con un botón: son
            // N movimientos en el libro. Se confirma enseñando cuántos.
            if (seVaciarian > 0 && !confirmando) {
              setConfirmando(true);
              return;
            }
            void cerrar();
          }}
        >
          {/*
            «Sí, cerrar» **solo cuando se ha preguntado algo**, que es cuando se
            van a vaciar productos. Al revés —que es como salió primero— el botón
            normal contesta que sí a una pregunta que nadie ha hecho.
          */}
          {confirmando ? 'Sí, cerrar el recuento' : 'Cerrar el recuento'}
        </Boton>
      </Botones>
    </div>
  );
}

/**
 * Una línea: el producto, lo que decía el libro y la casilla de lo contado.
 *
 * Lo que decía va **debajo y en pequeño**, nunca dentro de la casilla: una cifra
 * puesta de antemano se confirma sin mirar, y entonces el recuento no cuenta nada.
 * Cuando lo escrito no cuadra, se dice la diferencia al momento —es el dato que
 * se viene a buscar— y en su color, con su signo delante para que se lea también
 * en blanco y negro.
 */
function LineaDeRecuento({
  producto,
  escrito,
  alEscribir,
}: {
  readonly producto: ProductoEnLista;
  readonly escrito: string;
  readonly alEscribir: (valor: string) => void;
}) {
  const numero = Number(escrito.replace(',', '.'));
  const hayNumero = escrito.trim() !== '' && Number.isFinite(numero) && numero >= 0;
  const diferencia = hayNumero ? numero - producto.cantidad : null;

  return (
    <li className="flex flex-wrap items-center gap-e3 py-e2">
      <span className="min-w-[10rem] flex-1">
        <span className="block font-medium">{producto.nombre}</span>
        <span className="block text-etiqueta text-texto-tenue">
          El libro dice {conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}
          {producto.formato === null ? '' : ` · ${producto.formato}`}
        </span>
      </span>

      {diferencia !== null && diferencia !== 0 && (
        <Etiqueta tono={diferencia < 0 ? 'mal' : 'bien'}>
          {diferencia > 0 ? '+' : '−'}
          {conUnidadDeUso(Math.abs(diferencia), producto.unidadDeUso)}
        </Etiqueta>
      )}

      <span className="w-[9rem]">
        <Campo
          etiqueta="Contado"
          tipo="numero"
          detras={producto.unidadDeUso}
          value={escrito}
          onChange={(e) => {
            alEscribir(e.currentTarget.value);
          }}
        />
      </span>
    </li>
  );
}
