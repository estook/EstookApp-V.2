import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  NOMBRE_DE_LA_ZONA,
  NOMBRE_DE_LO_QUE_FALTA,
  QUE_ES_LO_QUE_FALTA,
  QUE_HAGO_CON_LO_QUE_FALTA,
  ZONAS,
  leerUnCsvDeRecuento,
  loContadoEnUnidades,
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
  FotoDeProducto,
  Hoja,
  NadaConEso,
  Selector,
  Tarjeta,
  clases,
} from '@estook/ui';
import { IconoBuscar, IconoDocumento, IconoEscanear } from '@estook/iconos';
import { Escaner } from '../lector/Escaner.tsx';
import { pitar } from '../lector/pitar.ts';
import { usarLectorDeMano } from '../ganchos/usarLectorDeMano.ts';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarAccion } from '../ganchos/usarAccion.ts';
import { BotonDeAccion } from '../acciones/BotonDeAccion.tsx';
import { CuantosHay } from './CuantosHay.tsx';
import { conUnidadDeUso, type MisProductos, type ProductoEnLista } from './contrato.ts';
import {
  imprimirLaHoja,
  nombreDelEnvase,
  numeroEscrito,
  seCuentaEnCajas,
  type Cerrado,
  type LoEscrito,
} from './contratoDelInventario.ts';

/**
 * Contar · «hemos contado la cámara, esto es lo que hay» (M7, y M8 · 0078).
 *
 * ── Contar y cerrar, dos pasos (2A) ─────────────────────────────────────────
 *
 * Cuenta quien lleve el almacén —el cocinero también— y **manda lo contado**; lo
 * cierra quien tiene «Cerrar un inventario». Quien puede cerrar cuenta y cierra de
 * una vez, como siempre. Y como lo hacen los programas de inventario serios:
 *
 *   1. **Se cuenta a ciegas.** Quien no cierra no ve lo que dice el libro: un número
 *      a la vista se confirma sin mirar, y entonces el inventario no cuenta nada.
 *      Quien cierra sí lo ve, en pequeño y debajo, con la diferencia al momento.
 *   2. **Como está en la estantería**: «2 cajas y 3 sueltas», y Estook hace la cuenta.
 *   3. **Lo contado se guarda en el móvil** mientras se cuenta: en la cámara sin
 *      señal, o si se cierra la app, no se pierde. Para mandar sí hace falta señal.
 *   4. **Una zona cada vez**, y lo que no se cuenta no se toca, salvo que quien
 *      cierra lo diga a propósito.
 */
export function Recuento({
  soloEstos = null,
  alVolver,
}: {
  /** Los de «Toca contar»: solo se enseñan estos. */
  readonly soloEstos?: readonly string[] | null;
  readonly alVolver?: () => void;
}) {
  const { cliente, permisos, yo } = usarSesion();
  const cache = useQueryClient();
  const [zona, setZona] = useState<Zona | ''>(soloEstos === null ? 'cocina' : '');
  const [texto, setTexto] = useState('');
  const borrador = `estook:inventario:${yo?.local?.id ?? 'sin-local'}:${soloEstos === null ? zona || 'todo' : 'toca'}`;
  const [contado, setContado] = useState<Record<string, LoEscrito>>(() => leerElBorrador(borrador));
  const [loQueFalta, setLoQueFalta] = useState<QueHagoConLoQueFalta>('dejarlo');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noEntendidas, setNoEntendidas] = useState<readonly number[]>([]);
  const [hecho, setHecho] = useState<Cerrado | null>(null);
  const [mandado, setMandado] = useState<{ contados: number; avisados: number } | null>(null);

  const puedeContar = puedeEditar(permisos, 'app.almacen');
  const puedeCerrar = puedeEditar(permisos, 'accion.cerrar_recuento');
  const alta = usarAccion('nuevo-producto');

  // Lo contado, al móvil, cada vez que cambia: si se va la señal no se pierde nada.
  useEffect(() => {
    guardarElBorrador(borrador, contado);
  }, [borrador, contado]);

  /** Otra zona, con lo que se hubiera quedado contado de ella en el móvil. */
  function aOtraZona(nueva: Zona | '') {
    setZona(nueva);
    setContado(
      leerElBorrador(`estook:inventario:${yo?.local?.id ?? 'sin-local'}:${nueva || 'todo'}`),
    );
  }

  const lista = usarLectura<MisProductos>('mis_productos', {
    ...(zona === '' ? {} : { zona }),
    limite: '200',
    incluir_ejemplos: 'false',
  });

  /**
   * El lector (entrega L, y el repaso del 9-oct): **escanear dice qué es, y pregunta
   * cuántos hay** —en cajas y sueltas, en kilos o en unidades, lo que diga su ficha—.
   * Antes cada lectura sumaba uno, y mil latas eran mil lecturas. Con la cámara, la
   * pregunta sale encima y la cámara espera; con un lector de mano, en una hoja.
   */
  const [escaneando, setEscaneando] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [preguntando, setPreguntando] = useState<ProductoEnLista | null>(null);

  function alEscanear(codigo: string) {
    const suyo = lista.data?.productos.find((p) => p.codigoDeBarras === codigo);
    if (suyo === undefined) {
      pitar(false);
      setUltimo(`El ${codigo} no es de ningún producto de esta zona.`);
      return;
    }
    pitar(true);
    setPreguntando(suyo);
  }

  function guardarLoEscaneado(producto: ProductoEnLista, escrito: LoEscrito) {
    setContado((todo) => ({ ...todo, [producto.id]: escrito }));
    const hay = cuantoHay(producto, escrito);
    setUltimo(
      hay === null
        ? producto.nombre
        : `${producto.nombre} · ${conUnidadDeUso(hay, producto.unidadDeUso)}`,
    );
    setPreguntando(null);
  }

  usarLectorDeMano(alEscanear, puedeContar && !escaneando && preguntando === null);

  if (!puedeContar) {
    return (
      <Tarjeta titulo="Inventario">
        <EstadoVacio
          compacto
          dibujo="candado"
          titulo="Esto no lo llevas tú"
          frase="Contar la cámara lo hace quien lleva el almacén."
          sinAccionPorque="Tu acceso no incluye el almacén."
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

  const deLaLista =
    soloEstos === null ? datos.productos : datos.productos.filter((p) => soloEstos.includes(p.id));
  const buscado = texto.trim().toLowerCase();
  const productos = deLaLista.filter(
    (p) => buscado === '' || p.nombre.toLowerCase().includes(buscado),
  );

  const lineas = deLaLista.flatMap((p) => {
    const hay = cuantoHay(p, contado[p.id]);
    if (hay === null) return [];
    const escrito = contado[p.id];
    return [
      {
        producto: p,
        hay,
        formatos: seCuentaEnCajas(p) ? numeroEscrito(escrito?.formatos) : null,
        sueltas: seCuentaEnCajas(p) ? numeroEscrito(escrito?.sueltas) : null,
      },
    ];
  });

  /** Los contados que no cuadran: solo lo sabe quien puede ver el libro. */
  const queNoCuadran = lineas.filter((l) => l.producto.cantidad !== l.hay).length;

  const seVaciarian =
    puedeCerrar && loQueFalta === 'a_cero'
      ? deLaLista.filter((p) => p.cantidad !== 0 && !lineas.some((l) => l.producto.id === p.id))
          .length
      : 0;

  function leerElFichero(fichero: File, deEstos: readonly ProductoEnLista[]) {
    setError(null);
    void fichero.text().then((leido) => {
      const lo = leerUnCsvDeRecuento(leido);
      const puesto: Record<string, LoEscrito> = { ...contado };
      for (const linea of lo.lineas) {
        // Se empareja por nombre o por código de barras; lo que no encaja se dice.
        const suyo = deEstos.find(
          (p) =>
            p.nombre.toLowerCase() === linea.cual.toLowerCase() || p.codigoDeBarras === linea.cual,
        );
        if (suyo === undefined) continue;
        puesto[suyo.id] = { hay: String(linea.hay) };
      }
      setContado(puesto);
      setNoEntendidas(lo.noEntendidas.map((n) => n.fila));
    });
  }

  async function terminar() {
    setGuardando(true);
    setError(null);
    const lineasQueSeMandan = lineas.map((l) => ({
      producto_id: l.producto.id,
      hay: l.hay,
      ...(l.formatos === null && l.sueltas === null
        ? {}
        : { formatos: l.formatos ?? 0, sueltas: l.sueltas ?? 0 }),
    }));

    if (puedeCerrar) {
      const respuesta = await cliente.ejecutar<Cerrado>('cerrar_recuento', {
        lineas: lineasQueSeMandan,
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
    } else {
      const respuesta = await cliente.ejecutar<{ contados: number; avisados: number }>(
        'enviar_lo_contado',
        { lineas: lineasQueSeMandan, ...(zona === '' ? {} : { zona }) },
      );
      setGuardando(false);
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      setMandado(respuesta.datos);
    }

    setContado({});
    await cache.invalidateQueries({ queryKey: ['el_inventario'] });
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
    await cache.invalidateQueries({ queryKey: ['almacen_hoy'] });
  }

  if (mandado !== null) {
    return (
      <div className="flex flex-col gap-e4">
        <Aviso tono="bien" titulo="Mandado" esNoticia>
          {mandado.contados === 1
            ? '1 producto contado'
            : `${String(mandado.contados)} productos contados`}
          . Lo cierra quien lleva el inventario
          {mandado.avisados > 0 ? ': ya le ha llegado el aviso.' : '.'}
        </Aviso>
        <Botones>
          <Boton
            tono="secundario"
            onClick={() => {
              setMandado(null);
            }}
          >
            Contar otra zona
          </Boton>
          {alVolver !== undefined && (
            <Boton tono="texto" onClick={alVolver}>
              Volver
            </Boton>
          )}
        </Botones>
      </div>
    );
  }

  if (hecho !== null) {
    return (
      <div className="flex flex-col gap-e4">
        <Aviso tono="bien" titulo="Inventario cerrado" esNoticia>
          {hecho.corregidos === 0
            ? 'Cuadraba todo: no ha hecho falta corregir nada.'
            : `${String(hecho.corregidos)} ${hecho.corregidos === 1 ? 'producto corregido' : 'productos corregidos'}, ${String(hecho.yaCuadraban)} que ya cuadraban.`}
          {hecho.vaciados > 0 &&
            ` Y ${String(hecho.vaciados)} puestos a cero por no estar en lo contado.`}
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

        <Botones>
          <Boton
            tono="secundario"
            onClick={() => {
              setHecho(null);
            }}
          >
            Contar otra zona
          </Boton>
          {alVolver !== undefined && (
            <Boton tono="texto" onClick={alVolver}>
              Volver
            </Boton>
          )}
        </Botones>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}

      {/* ── Qué se cuenta ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-e3">
        {soloEstos === null && (
          <div className="min-w-[12rem]">
            <Selector
              etiqueta="Qué estás contando"
              opciones={ZONAS.map((z) => ({ valor: z, texto: NOMBRE_DE_LA_ZONA[z] }))}
              sinElegir="Todo"
              value={zona}
              onChange={(e) => {
                aOtraZona(e.currentTarget.value as Zona | '');
              }}
            />
          </div>
        )}
        <div className="min-w-[14rem] max-w-[22rem] flex-1">
          <Campo
            etiqueta="Buscar"
            value={texto}
            delante={<IconoBuscar size={16} />}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        </div>
        <Boton
          tono="secundario"
          icono={<IconoEscanear size={18} />}
          onClick={() => {
            setUltimo(null);
            setEscaneando(true);
          }}
        >
          Escanear
        </Boton>
        <Boton
          tono="texto"
          icono={<IconoDocumento size={18} />}
          onClick={() => {
            imprimirLaHoja(
              soloEstos === null
                ? `Inventario · ${zona === '' ? 'todo' : NOMBRE_DE_LA_ZONA[zona].toLowerCase()}`
                : 'Inventario · lo que toca contar',
              deLaLista,
            );
          }}
        >
          Imprimir la hoja
        </Boton>
        {alVolver !== undefined && (
          <Boton tono="texto" onClick={alVolver}>
            Volver
          </Boton>
        )}
      </div>

      {escaneando && (
        <Escaner
          titulo="Contar escaneando"
          seguido
          ultimo={ultimo}
          alLeer={alEscanear}
          alCerrar={() => {
            setEscaneando(false);
            setPreguntando(null);
          }}
          pregunta={
            preguntando === null ? null : (
              <CuantosHay
                key={preguntando.id}
                producto={preguntando}
                llevabas={contado[preguntando.id]}
                alGuardar={(escrito) => {
                  guardarLoEscaneado(preguntando, escrito);
                }}
                alCancelar={() => {
                  setPreguntando(null);
                }}
                alLeerOtro={alEscanear}
              />
            )
          }
        />
      )}
      {!escaneando && preguntando !== null && (
        <Hoja
          abierta
          titulo="Contar"
          alCerrar={() => {
            setPreguntando(null);
          }}
        >
          <CuantosHay
            key={preguntando.id}
            producto={preguntando}
            llevabas={contado[preguntando.id]}
            alGuardar={(escrito) => {
              guardarLoEscaneado(preguntando, escrito);
            }}
            alCancelar={() => {
              setPreguntando(null);
            }}
            alLeerOtro={alEscanear}
          />
        </Hoja>
      )}
      {!escaneando && ultimo !== null && (
        <p aria-live="polite" className="text-secundario text-texto-suave">
          {ultimo}
        </p>
      )}

      {noEntendidas.length > 0 && (
        <Aviso tono="atencion" titulo="Hay filas que no he entendido">
          Las filas {noEntendidas.join(', ')} del fichero no traían un producto y una cantidad. El
          resto está abajo: repásalo antes de terminar.
        </Aviso>
      )}

      {/* ── La lista ───────────────────────────────────────────────────── */}
      <Tarjeta
        titulo={`${String(productos.length)} ${productos.length === 1 ? 'producto' : 'productos'}`}
        origen={
          lineas.length === 0
            ? 'Escribe lo que hay. Lo que dejes en blanco no se toca'
            : puedeCerrar
              ? `Llevas ${String(lineas.length)} contados, ${String(queNoCuadran)} que no cuadran`
              : `Llevas ${String(lineas.length)} contados. Se guardan en el móvil hasta que los mandes`
        }
      >
        {productos.length === 0 ? (
          texto.trim() !== '' ? (
            <NadaConEso
              buscado={texto}
              frase="Prueba con menos letras, o cuenta otra zona."
              quitar="Borrar la búsqueda"
              alQuitar={() => {
                setTexto('');
              }}
            />
          ) : zona !== '' ? (
            <EstadoVacio
              compacto
              dibujo="buscar"
              titulo={`Nada que contar en ${NOMBRE_DE_LA_ZONA[zona].toLowerCase()}`}
              frase="Esta zona no tiene género dado de alta. Puedes contar las demás."
              accion={
                <Boton
                  tono="secundario"
                  onClick={() => {
                    aOtraZona('');
                  }}
                >
                  Contar todas las zonas
                </Boton>
              }
            />
          ) : (
            <EstadoVacio
              compacto
              dibujo="camara"
              acento="var(--color-app-almacen)"
              titulo="Todavía no hay nada que contar"
              frase="Se cuenta lo que está dado de alta. Empieza por lo que más compras."
              {...(alta === null
                ? { sinAccionPorque: 'El género lo da de alta quien lleva el almacén.' }
                : { accion: <BotonDeAccion accion={alta} texto="Añade tu primer producto" /> })}
            />
          )
        ) : (
          <ul className="flex flex-col divide-y divide-borde">
            {productos.map((p) => (
              <LineaDeRecuento
                key={p.id}
                producto={p}
                escrito={contado[p.id] ?? {}}
                aCiegas={!puedeCerrar}
                alEscribir={(campo, valor) => {
                  setContado((antes) => ({ ...antes, [p.id]: { ...antes[p.id], [campo]: valor } }));
                }}
              />
            ))}
          </ul>
        )}

        {datos.hayMas && soloEstos === null && (
          <p className="mt-e3 text-secundario text-texto-suave">
            Hay más de doscientos en esta zona. Cuenta estos y termina; al volver saldrán los que
            falten.
          </p>
        )}
      </Tarjeta>

      {/*
        Sin nada que contar en esta zona, lo de abajo —el fichero, qué hacer con lo no
        contado y el botón apagado— solo es ruido (auditoría del 9-oct).
      */}
      {deLaLista.length > 0 && (
        <>
          {/* ── O se sube el fichero ───────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-e3 rounded-medio border border-borde bg-fondo p-e3">
            <p className="min-w-0 flex-1 text-secundario text-texto-suave">
              <strong className="text-texto">¿Lo tienes en un fichero?</strong> Dos columnas: el
              producto y cuánto hay.
            </p>
            <label className="inline-flex min-h-toque cursor-pointer items-center rounded-medio border border-borde-fuerte bg-superficie px-e3 text-secundario font-medium hover:bg-fondo">
              Subir el fichero
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const fichero = e.currentTarget.files?.[0];
                  if (fichero !== undefined) leerElFichero(fichero, deLaLista);
                }}
              />
            </label>
          </div>

          {/* ── Y lo que no se ha contado: solo quien cierra decide vaciarlo ── */}
          {puedeCerrar && soloEstos === null && (
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
                      <span className="text-cuerpo font-medium">
                        {NOMBRE_DE_LO_QUE_FALTA[cual]}
                      </span>
                      <span className="text-etiqueta text-texto-suave">
                        {QUE_ES_LO_QUE_FALTA[cual]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {seVaciarian > 0 && (
                <Aviso tono="atencion" titulo={`Se van a poner a cero ${String(seVaciarian)}`}>
                  Son los productos{' '}
                  {zona === '' ? '' : `de ${NOMBRE_DE_LA_ZONA[zona].toLowerCase()} `}
                  que tienen algo apuntado y que no has contado. Si solo has contado una parte, deja
                  «{NOMBRE_DE_LO_QUE_FALTA.dejarlo}».
                </Aviso>
              )}
            </Tarjeta>
          )}

          <Botones>
            <Boton
              tono="principal"
              disabled={lineas.length === 0 || guardando}
              cargando={guardando}
              textoCargando={puedeCerrar ? 'Cerrando' : 'Mandando'}
              onClick={() => {
                // Vaciar productos es de lo poco que no se deshace con un botón: se
                // confirma enseñando cuántos.
                if (seVaciarian > 0 && !confirmando) {
                  setConfirmando(true);
                  return;
                }
                void terminar();
              }}
            >
              {!puedeCerrar
                ? 'Mandar lo contado'
                : confirmando
                  ? 'Sí, cerrar el inventario'
                  : 'Cerrar el inventario'}
            </Boton>
          </Botones>
        </>
      )}
    </div>
  );
}

/** Lo que hay de un producto según lo escrito, en su unidad de uso. Nulo: sin contar. */
function cuantoHay(producto: ProductoEnLista, escrito: LoEscrito | undefined): number | null {
  if (escrito === undefined) return null;
  if (seCuentaEnCajas(producto)) {
    return loContadoEnUnidades(
      numeroEscrito(escrito.formatos),
      numeroEscrito(escrito.sueltas),
      producto.factor,
    );
  }
  return numeroEscrito(escrito.hay);
}

/** Lo contado que se quedó en el móvil, si lo hay. Nunca rompe: sin almacén, vacío. */
function leerElBorrador(clave: string): Record<string, LoEscrito> {
  try {
    const guardado = window.localStorage.getItem(clave);
    if (guardado === null) return {};
    const leido: unknown = JSON.parse(guardado);
    return typeof leido === 'object' && leido !== null ? (leido as Record<string, LoEscrito>) : {};
  } catch {
    return {};
  }
}

function guardarElBorrador(clave: string, contado: Record<string, LoEscrito>): void {
  try {
    if (Object.keys(contado).length === 0) window.localStorage.removeItem(clave);
    else window.localStorage.setItem(clave, JSON.stringify(contado));
  } catch {
    // Sin almacén en el navegador se cuenta igual: solo no se guarda.
  }
}

/**
 * Una línea: el producto y lo contado, en una casilla o en cajas y sueltas.
 *
 * Quien cierra ve debajo, en pequeño, lo que decía el libro y la diferencia al
 * momento; quien no cierra cuenta **a ciegas** (0078). Nunca va dentro de la casilla:
 * una cifra puesta de antemano se confirma sin mirar.
 */
function LineaDeRecuento({
  producto,
  escrito,
  aCiegas,
  alEscribir,
}: {
  readonly producto: ProductoEnLista;
  readonly escrito: LoEscrito;
  readonly aCiegas: boolean;
  readonly alEscribir: (campo: keyof LoEscrito, valor: string) => void;
}) {
  const hay = cuantoHay(producto, escrito);
  const diferencia = hay === null || aCiegas ? null : hay - producto.cantidad;
  const enCajas = seCuentaEnCajas(producto);

  return (
    <li className="flex flex-wrap items-center gap-e3 py-e2">
      <FotoDeProducto
        nombre={producto.nombre}
        categoria={producto.categoria}
        enlace={producto.miniatura}
      />
      <span className="min-w-[9rem] flex-1">
        <span className="block font-medium">{producto.nombre}</span>
        <span className="block text-etiqueta text-texto-tenue">
          {aCiegas
            ? (producto.formato ?? producto.unidadDeUso)
            : `El libro dice ${conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}${producto.formato === null ? '' : ` · ${producto.formato}`}`}
          {enCajas && hay !== null && ` · ${conUnidadDeUso(hay, producto.unidadDeUso)}`}
        </span>
      </span>

      {diferencia !== null && Math.abs(diferencia) > 0.00001 && (
        <Etiqueta tono={diferencia < 0 ? 'mal' : 'bien'}>
          {diferencia > 0 ? '+' : '−'}
          {conUnidadDeUso(Math.abs(diferencia), producto.unidadDeUso)}
        </Etiqueta>
      )}

      {enCajas ? (
        <span className="flex gap-e2">
          <span className="w-[6.5rem]">
            <Campo
              id={`contado-${producto.id}-formatos`}
              etiqueta={nombreDelEnvase(producto.formato)}
              tipo="numero"
              value={escrito.formatos ?? ''}
              onChange={(e) => {
                alEscribir('formatos', e.currentTarget.value);
              }}
            />
          </span>
          <span className="w-[6.5rem]">
            <Campo
              id={`contado-${producto.id}-sueltas`}
              etiqueta="Sueltas"
              tipo="numero"
              detras={producto.unidadDeUso}
              value={escrito.sueltas ?? ''}
              onChange={(e) => {
                alEscribir('sueltas', e.currentTarget.value);
              }}
            />
          </span>
        </span>
      ) : (
        <span className="w-[9rem]">
          <Campo
            id={`contado-${producto.id}-hay`}
            etiqueta="Contado"
            tipo="numero"
            detras={producto.unidadDeUso}
            value={escrito.hay ?? ''}
            onChange={(e) => {
              alEscribir('hay', e.currentTarget.value);
            }}
          />
        </span>
      )}
    </li>
  );
}
