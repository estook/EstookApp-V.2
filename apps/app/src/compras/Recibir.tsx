import { useState } from 'react';
import { NOMBRE_DE_LA_INCIDENCIA, centimos, comoSePide } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Interruptor,
} from '@estook/ui';
import { IconoBien, IconoBorrar } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoDinero } from '../inventario/contrato.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';
import { Cuantos } from './Comun.tsx';
import { numeroEscrito } from './utilidades.ts';
import { ElegirProducto } from './ElegirProducto.tsx';
import { cuantosProductos, type LoRecibido, type UnPedido } from './contrato.ts';

/** Una línea en la puerta: lo que se pidió y lo que se está apuntando que llega. */
interface Linea {
  readonly clave: string;
  readonly lineaDePedidoId: string | null;
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly pesoVariable: boolean;
  /** En formatos. Nulo si no estaba en el pedido. */
  readonly pedida: number | null;
  readonly formatos: number;
  /** Para el peso variable: lo que dice la báscula, escrito. */
  readonly kilos: string;
  /** Por formato, sin impuestos. */
  readonly precio: number | null;
  /** Para el peso variable: lo que cobra la línea entera. */
  readonly importe: number | null;
  readonly rechazada: boolean;
  readonly lote: string;
  readonly caducaEl: string;
  readonly nota: string;
  readonly conDetalle: boolean;
}

type Paso = 'pregunta' | 'kilos' | 'cambios' | 'hecho';

function lineasDelPedido(pedido: UnPedido): Linea[] {
  return pedido.lineas.map((l) => ({
    clave: l.id,
    lineaDePedidoId: l.id,
    productoId: l.productoId,
    producto: l.producto,
    formato: l.formato,
    factor: l.factor,
    unidadDeUso: l.unidadDeUso,
    pesoVariable: l.pesoVariable,
    pedida: l.cantidad,
    formatos: l.cantidad,
    kilos: '',
    precio: l.precioCentimos ?? null,
    importe: null,
    rechazada: false,
    lote: '',
    caducaEl: '',
    nota: '',
    conDetalle: false,
  }));
}

/**
 * Recibir lo que llega (M7).
 *
 * «Al recibir, lo primero que pregunta es **"¿entero o con cambios?"**: entero
 *  son dos toques» (Manifiesto 12). Y es verdad: desde «Lo que llega», un toque
 * en «Recibir» y otro en «Sí, entero».
 *
 * ── Lo que no se puede suponer ───────────────────────────────────────────────
 *
 * El peso variable. «Se pide en piezas y entra en kilos reales» (Manifiesto 29):
 * dos lubinas no pesan lo mismo dos días seguidos, así que aunque haya llegado
 * entero, **se pregunta lo que dice la báscula**, y solo eso.
 *
 * ── Quien no ve precios también recibe ───────────────────────────────────────
 *
 * Un cocinero recibe el camión y no ve un precio: entra al que se esperaba, y el
 * de verdad lo pondrá la factura. No se le enseña ni se le pide ningún importe.
 */
export function Recibir({
  pedido,
  proveedor,
  alCerrar,
}: {
  readonly pedido: UnPedido | null;
  /** Para lo que llega sin pedido. */
  readonly proveedor: { readonly id: string; readonly nombre: string } | null;
  readonly alCerrar: () => void;
}) {
  const { cliente, permisos } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const abrirPedido = usarAbiertoEnLaDireccion('pedido');
  const abrirAlbaran = usarAbiertoEnLaDireccion('albaran');
  const editaPrecios = puedeEditar(permisos, 'dato.precio_de_compra');

  const [paso, setPaso] = useState<Paso>(pedido === null ? 'cambios' : 'pregunta');
  const [lineas, setLineas] = useState<Linea[]>(pedido === null ? [] : lineasDelPedido(pedido));
  const [numero, setNumero] = useState('');
  const [apuntando, setApuntando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [falta, setFalta] = useState<string | null>(null);
  const [recibido, setRecibido] = useState<LoRecibido | null>(null);
  const [loQueFalto, setLoQueFalto] = useState<{ productoId: string; cantidad: number }[]>([]);
  const [pidiendo, setPidiendo] = useState(false);

  const proveedorId = pedido?.proveedor.id ?? proveedor?.id ?? '';
  const nombreDelProveedor = pedido?.proveedor.nombre ?? proveedor?.nombre ?? '';
  const aPeso = lineas.filter((l) => l.pesoVariable && l.lineaDePedidoId !== null);

  function cambiar(clave: string, que: Partial<Linea>) {
    setFalta(null);
    setLineas((antes) => antes.map((l) => (l.clave === clave ? { ...l, ...que } : l)));
  }

  function paraMandar(l: Linea) {
    const base = {
      ...(l.lineaDePedidoId === null ? {} : { linea_de_pedido_id: l.lineaDePedidoId }),
      producto_id: l.productoId,
      ...(l.rechazada ? { rechazada: true } : {}),
      ...(l.nota.trim() === '' ? {} : { nota: l.nota.trim() }),
      ...(l.lote.trim() === '' ? {} : { lote: l.lote.trim() }),
      ...(l.caducaEl === '' ? {} : { caduca_el: l.caducaEl }),
    };
    if (l.pesoVariable) {
      return {
        ...base,
        cantidad: numeroEscrito(l.kilos),
        ...(editaPrecios && l.importe !== null ? { importe_centimos: l.importe } : {}),
      };
    }
    return {
      ...base,
      formatos: l.formatos,
      ...(editaPrecios && l.precio !== null ? { precio_centimos: l.precio } : {}),
    };
  }

  /** Lo que el pedido tenía y no ha entrado: para pedirlo otra vez de un toque. */
  function calcularLoQueFalto(entero: boolean) {
    if (pedido === null || entero) return [];
    return lineas
      .filter((l) => l.pedida !== null && l.lineaDePedidoId !== null)
      .map((l) => {
        const pedida = l.pedida ?? 0;
        const noLlego = l.rechazada
          ? pedida
          : l.pesoVariable
            ? numeroEscrito(l.kilos) === 0
              ? pedida
              : 0
            : Math.max(0, pedida - l.formatos);
        return { productoId: l.productoId, cantidad: noLlego };
      })
      .filter((f) => f.cantidad > 0);
  }

  async function apuntar(entero: boolean) {
    const conKilos = entero ? aPeso : lineas.filter((l) => l.pesoVariable);
    const sinKilos = conKilos.filter((l) => !l.rechazada && numeroEscrito(l.kilos) === null);
    if (sinKilos.length > 0) {
      setFalta(
        `Dime cuánto ha llegado de verdad de ${sinKilos.map((l) => l.producto).join(', ')}: va a peso. Si no ha llegado nada, pon 0.`,
      );
      return;
    }
    if (!entero && lineas.length === 0) {
      setFalta('Añade lo que ha llegado.');
      return;
    }

    setApuntando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<LoRecibido>('recibir_albaran', {
      ...(pedido === null ? { proveedor_id: proveedorId } : { pedido_id: pedido.pedido.id }),
      entero,
      ...(numero.trim() === '' ? {} : { numero: numero.trim() }),
      ...(entero
        ? aPeso.length === 0
          ? {}
          : { lineas: aPeso.map(paraMandar) }
        : { lineas: lineas.map(paraMandar) }),
    });
    setApuntando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setLoQueFalto(calcularLoQueFalto(entero));
    setRecibido(respuesta.datos);
    setPaso('hecho');
    await refrescar();
  }

  async function pedirLoQueFalto() {
    setPidiendo(true);
    const respuesta = await cliente.ejecutar<{ pedidoId: string }>('crear_pedido', {
      proveedor_id: proveedorId,
      lineas: loQueFalto.map((f) => ({ producto_id: f.productoId, cantidad: f.cantidad })),
    });
    setPidiendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
    abrirPedido.abrir(respuesta.datos.pedidoId);
  }

  const titulo =
    pedido === null
      ? `Lo que llega de ${nombreDelProveedor}`
      : `Recibir el pedido ${pedido.pedido.numero}`;

  const pie =
    paso === 'hecho' ? (
      <Botones>
        {recibido !== null && (
          <Boton
            tono="secundario"
            onClick={() => {
              alCerrar();
              abrirAlbaran.abrir(recibido.albaranId);
            }}
          >
            Ver el albarán
          </Boton>
        )}
        <Boton tono="principal" onClick={alCerrar}>
          Hecho
        </Boton>
      </Botones>
    ) : paso === 'pregunta' ? (
      <Botones>
        <Boton tono="texto" onClick={alCerrar}>
          Dejarlo
        </Boton>
      </Botones>
    ) : (
      <Botones>
        <Boton
          tono="texto"
          onClick={() => {
            if (pedido === null) alCerrar();
            else setPaso('pregunta');
          }}
        >
          {pedido === null ? 'Dejarlo' : 'Atrás'}
        </Boton>
        <Boton
          tono="principal"
          cargando={apuntando}
          textoCargando="Apuntando"
          onClick={() => {
            void apuntar(paso === 'kilos');
          }}
        >
          Apuntar lo que ha llegado
        </Boton>
      </Botones>
    );

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={titulo} pie={pie}>
      <div className="flex flex-col gap-e4 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {falta !== null && (
          <Aviso tono="atencion" titulo="Falta un dato">
            {falta}
          </Aviso>
        )}

        {paso !== 'hecho' && (
          <Campo
            etiqueta="Número del albarán"
            ayuda="El que viene en el papel del proveedor. Si no trae, déjalo en blanco."
            value={numero}
            onChange={(e) => {
              setNumero(e.currentTarget.value);
            }}
          />
        )}

        {/* ── ¿Entero o con cambios? ────────────────────────────────────── */}
        {paso === 'pregunta' && pedido !== null && (
          <section className="flex flex-col gap-e3">
            <p className="text-cuerpo">
              {pedido.proveedor.nombre} · {cuantosProductos(pedido.lineas.length)}
            </p>
            <h3 className="text-titulo font-semibold">¿Ha llegado entero?</h3>
            <Boton
              tono="principal"
              tamano="l"
              ancho
              icono={<IconoBien size={20} />}
              cargando={apuntando}
              textoCargando="Apuntando"
              onClick={() => {
                if (aPeso.length > 0) setPaso('kilos');
                else void apuntar(true);
              }}
            >
              Sí, ha llegado entero
            </Boton>
            <Boton
              tono="secundario"
              tamano="l"
              ancho
              onClick={() => {
                setPaso('cambios');
              }}
            >
              Con cambios: falta, sobra o viene mal
            </Boton>
            <p className="text-secundario text-texto-suave">
              ¿Quieres apuntar lotes o caducidades? Entra por «Con cambios».
              {!editaPrecios &&
                ' Lo que entra se apunta al precio que se esperaba; el de verdad lo pondrá la factura.'}
            </p>
          </section>
        )}

        {/* ── Entero, pero con lo que va a peso ─────────────────────────── */}
        {paso === 'kilos' && (
          <section className="flex flex-col gap-e3">
            <p className="text-cuerpo">
              Todo lo demás entra tal cual. Solo falta lo que dice la báscula de lo que va a peso:
            </p>
            {aPeso.map((l) => (
              <div
                key={l.clave}
                className="grid gap-e3 rounded-medio border border-borde p-e3 sm:grid-cols-2"
              >
                <Campo
                  etiqueta={`${l.producto} · cuánto en ${l.unidadDeUso}`}
                  inputMode="decimal"
                  ayuda={`Se pidieron ${comoSePide(l.pedida ?? 0, l.formato, l.factor, l.unidadDeUso)}.`}
                  value={l.kilos}
                  onChange={(e) => {
                    cambiar(l.clave, { kilos: e.currentTarget.value });
                  }}
                />
                {editaPrecios && (
                  <CampoMoneda
                    etiqueta="Lo que cobra esa línea"
                    ayuda="Sin impuestos, como viene en el albarán."
                    valor={l.importe === null ? null : centimos(l.importe)}
                    alCambiar={(valor) => {
                      cambiar(l.clave, { importe: valor });
                    }}
                  />
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── Con cambios, línea a línea ────────────────────────────────── */}
        {paso === 'cambios' && (
          <section className="flex flex-col gap-e3">
            {lineas.length > 0 && (
              <ul className="flex flex-col gap-e3">
                {lineas.map((l) => (
                  <li
                    key={l.clave}
                    className="flex flex-col gap-e3 rounded-medio border border-borde p-e3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-e2">
                      <span className="text-cuerpo font-medium">{l.producto}</span>
                      {l.pedida !== null ? (
                        <span className="text-secundario text-texto-suave">
                          Pedido: {comoSePide(l.pedida, l.formato, l.factor, l.unidadDeUso)}
                        </span>
                      ) : (
                        <Etiqueta tono="info">no estaba en el pedido</Etiqueta>
                      )}
                    </div>

                    {!l.rechazada &&
                      (l.pesoVariable ? (
                        <div className="grid gap-e3 sm:grid-cols-2">
                          <Campo
                            etiqueta={`Cuánto ha llegado, en ${l.unidadDeUso}`}
                            inputMode="decimal"
                            ayuda="Lo que dice la báscula. Si no ha llegado nada, 0."
                            value={l.kilos}
                            onChange={(e) => {
                              cambiar(l.clave, { kilos: e.currentTarget.value });
                            }}
                          />
                          {editaPrecios && (
                            <CampoMoneda
                              etiqueta="Lo que cobra esa línea"
                              valor={l.importe === null ? null : centimos(l.importe)}
                              alCambiar={(valor) => {
                                cambiar(l.clave, { importe: valor });
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-end gap-e3">
                          <Cuantos
                            etiqueta={`Cuántos de ${l.producto} han llegado`}
                            valor={l.formatos}
                            detras={l.formato ?? l.unidadDeUso}
                            alCambiar={(valor) => {
                              cambiar(l.clave, { formatos: valor });
                            }}
                          />
                          {editaPrecios && (
                            <div className="w-[10rem]">
                              <CampoMoneda
                                etiqueta={`Precio de cada ${(l.formato ?? l.unidadDeUso).toLowerCase()}`}
                                valor={l.precio === null ? null : centimos(l.precio)}
                                alCambiar={(valor) => {
                                  cambiar(l.clave, { precio: valor });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                    <Interruptor
                      etiqueta="No se acepta"
                      ayuda="Viene en mal estado, roto o caducado: se devuelve en la puerta y no entra en cámara."
                      puesto={l.rechazada}
                      alCambiar={(puesto) => {
                        cambiar(l.clave, { rechazada: puesto });
                      }}
                    />

                    <div className="flex flex-wrap items-center gap-e2">
                      <Boton
                        tono="texto"
                        aria-expanded={l.conDetalle}
                        onClick={() => {
                          cambiar(l.clave, { conDetalle: !l.conDetalle });
                        }}
                      >
                        {l.conDetalle ? 'Sin lote ni caducidad' : 'Lote, caducidad y nota'}
                      </Boton>
                      {l.lineaDePedidoId === null && (
                        <Boton
                          tono="texto"
                          icono={<IconoBorrar size={16} />}
                          onClick={() => {
                            setLineas((antes) => antes.filter((x) => x.clave !== l.clave));
                          }}
                        >
                          Quitar
                        </Boton>
                      )}
                    </div>

                    {l.conDetalle && (
                      <div className="grid gap-e3 sm:grid-cols-2">
                        <Campo
                          etiqueta="Lote"
                          value={l.lote}
                          onChange={(e) => {
                            cambiar(l.clave, { lote: e.currentTarget.value });
                          }}
                        />
                        <Campo
                          etiqueta="Caduca el"
                          tipo="fecha"
                          ayuda="Sale en el Calendario y en «Caduca esta semana»."
                          value={l.caducaEl}
                          onChange={(e) => {
                            cambiar(l.clave, { caducaEl: e.currentTarget.value });
                          }}
                        />
                        <div className="sm:col-span-2">
                          <Campo
                            etiqueta="Nota"
                            ayuda="Lo que quieras que conste: «dos cajas golpeadas»."
                            value={l.nota}
                            onChange={(e) => {
                              cambiar(l.clave, { nota: e.currentTarget.value });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <ElegirProducto
              etiqueta={
                pedido === null ? 'Qué ha llegado' : 'Ha llegado algo que no estaba en el pedido'
              }
              yaEstan={new Set(lineas.map((l) => l.productoId))}
              primeroDe={proveedorId}
              alElegir={(producto) => {
                setFalta(null);
                setLineas((antes) => [
                  ...antes,
                  {
                    clave: `extra-${producto.id}`,
                    lineaDePedidoId: null,
                    productoId: producto.id,
                    producto: producto.nombre,
                    formato: producto.formato,
                    factor: producto.factor,
                    unidadDeUso: producto.unidadDeUso,
                    pesoVariable: producto.pesoVariable,
                    pedida: null,
                    formatos: 1,
                    kilos: '',
                    precio: producto.precioCentimos ?? null,
                    importe: null,
                    rechazada: false,
                    lote: '',
                    caducaEl: '',
                    nota: '',
                    conDetalle: false,
                  },
                ]);
              }}
            />
          </section>
        )}

        {/* ── Apuntado ──────────────────────────────────────────────────── */}
        {paso === 'hecho' && recibido !== null && (
          <section className="flex flex-col gap-e3">
            <Aviso
              tono={recibido.incidencias.length === 0 ? 'bien' : 'atencion'}
              titulo={
                recibido.incidencias.length === 0
                  ? 'Apuntado: ha entrado todo en cámara'
                  : 'Apuntado, con lo que no ha cuadrado'
              }
            >
              {cuantosProductos(recibido.lineas)} en el albarán.
              {recibido.totalCentimos !== undefined
                ? ` Suma ${comoDinero(recibido.totalCentimos)} sin impuestos.`
                : ''}
            </Aviso>

            {recibido.incidencias.length > 0 && (
              <ul className="flex flex-col rounded-medio border border-borde">
                {recibido.incidencias.map((i) => (
                  <li
                    key={i.producto}
                    className="flex flex-wrap items-center gap-e2 border-b border-borde p-e3 last:border-0"
                  >
                    <span className="min-w-0 flex-1 text-cuerpo">{i.producto}</span>
                    {i.incidencias.map((cual) => (
                      <Etiqueta
                        key={cual}
                        tono={cual === 'sobra' || cual === 'no_pedido' ? 'info' : 'atencion'}
                      >
                        {NOMBRE_DE_LA_INCIDENCIA[cual]}
                      </Etiqueta>
                    ))}
                  </li>
                ))}
              </ul>
            )}

            {(recibido.avisos ?? []).map((aviso) => (
              <Aviso key={aviso} tono="atencion" titulo="Por encima de lo pactado">
                {aviso}
              </Aviso>
            ))}

            {(recibido.precios ?? []).length > 0 && (
              <Aviso tono="info" titulo="Precios que han cambiado">
                <ul className="flex flex-col gap-e1">
                  {(recibido.precios ?? []).map((p) => (
                    <li key={p.producto}>
                      <strong>{p.producto}</strong>: {p.frase}
                    </li>
                  ))}
                </ul>
              </Aviso>
            )}

            {loQueFalto.length > 0 && (
              <div className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
                <p className="text-cuerpo">
                  Faltan {cuantosProductos(loQueFalto.length)} de lo que pediste. ¿Se lo vuelves a
                  pedir?
                </p>
                <div>
                  <Boton
                    tono="secundario"
                    cargando={pidiendo}
                    textoCargando="Creando el pedido"
                    onClick={() => {
                      void pedirLoQueFalto();
                    }}
                  >
                    Pedirle lo que faltó
                  </Boton>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </Hoja>
  );
}
