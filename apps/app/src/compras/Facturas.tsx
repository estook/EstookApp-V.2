import { useState } from 'react';
import { centimos, conciliar } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  PanelLateral,
  Selector,
  Tabla,
  Tarjeta,
} from '@estook/ui';
import { IconoAnadir } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoDinero, comoSeLeeLaFecha } from '../inventario/contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';
import { Dato, Filtros } from './Comun.tsx';
import {
  NOMBRE_DEL_ESTADO_DE_LA_FACTURA,
  TONO_DEL_ESTADO_DE_LA_FACTURA,
  cuantosProductos,
  loQueLlego,
  type AlbaranParaLaFactura,
  type FacturaEnLista,
  type LoConciliado,
  type MisFacturas,
  type MisProveedores,
  type ParaConciliar,
  type UnaFactura,
} from './contrato.ts';

type Filtro = 'todas' | 'sin_conciliar' | 'con_diferencia';

/** Lo que se ha corregido de cada línea: lo que dice la factura, en céntimos. */
type Correcciones = ReadonlyMap<string, number>;

/**
 * Compras · Facturas (M7).
 *
 * «Y algo que casi ningún programa hace: **la factura del proveedor se concilia
 *  con sus albaranes**, con las diferencias señaladas» (Manifiesto 12).
 *
 * Se apunta la factura —número, fecha y lo que suma sin impuestos—, se marcan los
 * albaranes que cubre, y Estook dice si cuadra **mientras se escribe**: «la
 * factura dice 99,50 € y los tres albaranes suman 93,00 €: te cobran 6,50 € de
 * más». Si no cuadra, no se bloquea: queda apuntada con su diferencia, que es lo
 * que alguien tiene que reclamar.
 *
 * Solo la ve quien ve precios de compra: una factura es dinero entero.
 */
export function Facturas() {
  const { permisos } = usarSesion();
  const puedeApuntar = puedeEditar(permisos, 'dato.precio_de_compra');
  const factura = usarAbiertoEnLaDireccion('factura');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [limite, setLimite] = useState(50);
  const [apuntando, setApuntando] = useState(false);

  usarQueHacer('nueva', () => {
    if (puedeApuntar) setApuntando(true);
  });

  const lista = usarLectura<MisFacturas>('mis_facturas', { vista: filtro, limite: String(limite) });
  const datos = lista.data;

  return (
    <div className="flex flex-col gap-e4">
      {puedeApuntar && (
        <div>
          <Boton
            tono="principal"
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              setApuntando(true);
            }}
          >
            Apuntar una factura
          </Boton>
        </div>
      )}

      <Tarjeta
        titulo="Tus facturas de compra"
        origen="Cada una contra sus albaranes · importes sin impuestos"
      >
        <div className="flex flex-col gap-e3">
          <Filtros
            titulo="Qué facturas ver"
            puesto={filtro}
            alElegir={(valor) => {
              setFiltro(valor);
              setLimite(50);
            }}
            opciones={[
              { valor: 'todas', texto: 'Todas' },
              {
                valor: 'sin_conciliar',
                texto: 'Sin comprobar',
                cuantos: datos?.cuantos.sinConciliar ?? 0,
              },
              {
                valor: 'con_diferencia',
                texto: 'Con diferencia',
                cuantos: datos?.cuantos.conDiferencia ?? 0,
              },
            ]}
          />

          {lista.isPending ? (
            <Cargando que="las facturas" lineas={3} />
          ) : lista.isError ? (
            <Aviso tono="mal" titulo="No he podido leer las facturas">
              Vuelve a intentarlo dentro de un momento. Si sigue igual, avísanos.
            </Aviso>
          ) : (
            <Tabla<FacturaEnLista>
              titulo="Facturas"
              filas={datos?.facturas ?? []}
              claveDe={(f) => f.id}
              alPulsar={(f) => {
                factura.abrir(f.id);
              }}
              columnas={[
                {
                  clave: 'factura',
                  titulo: 'Factura',
                  principal: true,
                  celda: (f) => (
                    <span>
                      {f.proveedor}
                      <span className="text-texto-suave">
                        {' '}
                        · {f.tipo === 'abono' ? 'abono ' : ''}
                        {f.numero}
                      </span>
                    </span>
                  ),
                },
                { clave: 'fecha', titulo: 'Fecha', celda: (f) => comoSeLeeLaFecha(f.fecha) },
                {
                  clave: 'vence',
                  titulo: 'Vence',
                  celda: (f) => (f.venceEl === null ? '—' : comoSeLeeLaFecha(f.venceEl)),
                },
                {
                  clave: 'estado',
                  titulo: 'Cuadra',
                  celda: (f) => (
                    <Etiqueta tono={TONO_DEL_ESTADO_DE_LA_FACTURA[f.estado]}>
                      {NOMBRE_DEL_ESTADO_DE_LA_FACTURA[f.estado]}
                      {f.estado === 'con_diferencia' && f.diferenciaCentimos !== null
                        ? ` · ${f.diferenciaCentimos > 0 ? '+' : '−'}${comoDinero(Math.abs(f.diferenciaCentimos))}`
                        : ''}
                    </Etiqueta>
                  ),
                },
                {
                  clave: 'base',
                  titulo: 'Base',
                  numerica: true,
                  celda: (f) => <span className="tabular-nums">{comoDinero(f.baseCentimos)}</span>,
                },
              ]}
              cuandoNoHay={
                <EstadoVacio
                  compacto
                  titulo={
                    filtro === 'todas'
                      ? 'Todavía no has apuntado ninguna factura'
                      : filtro === 'sin_conciliar'
                        ? 'Todas están comprobadas'
                        : 'Ninguna factura con diferencia'
                  }
                  frase="Al apuntar una factura con sus albaranes, Estook te dice si te cobran lo que llegó, y si un precio ha cambiado lo apunta desde la factura."
                  {...(puedeApuntar
                    ? {
                        accion: (
                          <Boton
                            tono="principal"
                            icono={<IconoAnadir size={18} />}
                            onClick={() => {
                              setApuntando(true);
                            }}
                          >
                            Apuntar una factura
                          </Boton>
                        ),
                      }
                    : { sinAccionPorque: 'Tu acceso ve las facturas, no las apunta.' })}
                />
              }
            />
          )}

          {datos?.hayMas === true && (
            <div>
              <Boton
                tono="texto"
                onClick={() => {
                  setLimite((antes) => antes + 50);
                }}
              >
                Ver más facturas
              </Boton>
            </div>
          )}
        </div>
      </Tarjeta>

      {apuntando && (
        <ApuntarFactura
          alCerrar={() => {
            setApuntando(false);
          }}
          alAbrir={(facturaId) => {
            setApuntando(false);
            factura.abrir(facturaId);
          }}
        />
      )}
    </div>
  );
}

/**
 * Los albaranes que cubre una factura, con lo que dice cada línea.
 *
 * Se marcan los que entran, y en cada línea se puede poner **lo que dice la
 * factura** cuando no coincide con el albarán —o cuando el albarán vino sin
 * precio—. Eso es lo que confirma el precio, y la cuenta de abajo lo usa en vez
 * de lo del albarán.
 */
function ElegirAlbaranes({
  albaranes,
  elegidos,
  alElegir,
  correcciones,
  alCorregir,
}: {
  readonly albaranes: readonly AlbaranParaLaFactura[];
  readonly elegidos: ReadonlySet<string>;
  readonly alElegir: (albaranId: string, puesto: boolean) => void;
  readonly correcciones: Correcciones;
  readonly alCorregir: (lineaId: string, importe: number | null) => void;
}) {
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set());

  if (albaranes.length === 0) {
    return (
      <p className="text-secundario text-texto-suave">
        No hay albaranes de este proveedor sin factura. La factura se apunta igual y se comprueba
        cuando lleguen.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-e2">
      {albaranes.map((a) => {
        const suma = a.lineas.reduce(
          (s, l) =>
            s + (correcciones.get(l.id) ?? l.importeFacturadoCentimos ?? l.importeCentimos ?? 0),
          0,
        );
        const sinPrecio = a.lineas.filter(
          (l) =>
            !correcciones.has(l.id) &&
            (l.importeFacturadoCentimos ?? l.importeCentimos ?? null) === null &&
            l.cantidad > 0,
        ).length;
        const abierto = abiertos.has(a.id);

        return (
          <li key={a.id} className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
            <label className="flex min-h-toque cursor-pointer items-center gap-e3">
              <input
                type="checkbox"
                className="size-5 accent-naranja"
                checked={elegidos.has(a.id)}
                onChange={(e) => {
                  alElegir(a.id, e.currentTarget.checked);
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-cuerpo font-medium">
                  {a.tipo === 'devolucion' ? 'Devolución' : 'Albarán'} {a.numero ?? 'sin número'}
                  <span className="font-normal text-texto-suave">
                    {' '}
                    · {comoSeLeeLaFecha(a.fecha)}
                  </span>
                </span>
                <span className="block text-secundario text-texto-suave">
                  {cuantosProductos(a.lineas.length)}
                  {sinPrecio > 0 ? ` · ${sinPrecio} sin precio` : ''}
                </span>
              </span>
              <span className="shrink-0 text-cuerpo tabular-nums">
                {a.tipo === 'devolucion' ? '−' : ''}
                {comoDinero(suma)}
              </span>
            </label>
            {a.conIncidencias && (
              <span>
                <Etiqueta tono="atencion">con incidencias en la puerta</Etiqueta>
              </span>
            )}
            <div>
              <Boton
                tono="texto"
                aria-expanded={abierto}
                onClick={() => {
                  setAbiertos((antes) => {
                    const nuevos = new Set(antes);
                    if (nuevos.has(a.id)) nuevos.delete(a.id);
                    else nuevos.add(a.id);
                    return nuevos;
                  });
                }}
              >
                {abierto
                  ? 'Esconder las líneas'
                  : sinPrecio > 0
                    ? 'Poner lo que falta'
                    : 'Ver las líneas y corregir'}
              </Boton>
            </div>
            {abierto && (
              <ul className="flex flex-col gap-e2">
                {a.lineas.map((l) => {
                  const delAlbaran = l.importeFacturadoCentimos ?? l.importeCentimos ?? null;
                  const corregido = correcciones.get(l.id);
                  return (
                    <li
                      key={l.id}
                      className="grid items-end gap-e2 border-t border-borde pt-e2 sm:grid-cols-[1fr_10rem]"
                    >
                      <span>
                        <span className="block text-cuerpo">{l.producto}</span>
                        <span className="block text-secundario text-texto-suave">
                          {loQueLlego(l)} ·{' '}
                          {delAlbaran === null ? (
                            <span className="text-atencion">el albarán vino sin precio</span>
                          ) : (
                            `el albarán dice ${comoDinero(delAlbaran)}`
                          )}
                        </span>
                      </span>
                      <CampoMoneda
                        etiqueta="La factura dice"
                        valor={corregido === undefined ? null : centimos(corregido)}
                        alCambiar={(valor) => {
                          alCorregir(l.id, valor);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** La cuenta de la conciliación, con las correcciones puestas. La hace el dominio. */
function laCuenta(
  tipo: 'factura' | 'abono',
  base: number,
  albaranes: readonly AlbaranParaLaFactura[],
  elegidos: ReadonlySet<string>,
  correcciones: Correcciones,
) {
  return conciliar(
    tipo,
    base,
    albaranes
      .filter((a) => elegidos.has(a.id))
      .map((a) => ({
        tipo: a.tipo,
        lineas: a.lineas.map((l) => ({
          importeCentimos: l.importeCentimos ?? null,
          importeFacturadoCentimos: correcciones.get(l.id) ?? l.importeFacturadoCentimos ?? null,
        })),
      })),
  );
}

/** Lo que se manda de las correcciones: solo las de los albaranes marcados. */
function correccionesParaMandar(
  albaranes: readonly AlbaranParaLaFactura[],
  elegidos: ReadonlySet<string>,
  correcciones: Correcciones,
) {
  const lineas = new Set(
    albaranes.filter((a) => elegidos.has(a.id)).flatMap((a) => a.lineas.map((l) => l.id)),
  );
  return [...correcciones.entries()]
    .filter(([lineaId]) => lineas.has(lineaId))
    .map(([lineaId, importe]) => ({ linea_de_albaran_id: lineaId, importe_centimos: importe }));
}

/** Qué albaranes se marcan solos: los que suman en ese papel, que suele ser todo el mes. */
function losDeSiempre(albaranes: readonly AlbaranParaLaFactura[], tipo: 'factura' | 'abono') {
  return new Set(
    albaranes
      .filter((a) => (tipo === 'factura' ? a.tipo === 'entrega' : a.tipo === 'devolucion'))
      .map((a) => a.id),
  );
}

function ApuntarFactura({
  alCerrar,
  alAbrir,
}: {
  readonly alCerrar: () => void;
  readonly alAbrir: (facturaId: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const [proveedorId, setProveedorId] = useState('');
  const [tipo, setTipo] = useState<'factura' | 'abono'>('factura');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState('');
  const [venceEl, setVenceEl] = useState('');
  const [base, setBase] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [elegidos, setElegidos] = useState<ReadonlySet<string> | null>(null);
  const [correcciones, setCorrecciones] = useState<Correcciones>(new Map());
  const [apuntando, setApuntando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<LoConciliado | null>(null);

  const proveedores = usarLectura<MisProveedores>('mis_proveedores', {
    incluir_desactivados: 'true',
  });
  const pendientes = usarLectura<ParaConciliar>(
    'para_conciliar',
    { proveedor_id: proveedorId },
    proveedorId !== '',
  );

  const albaranes = proveedorId === '' ? [] : (pendientes.data?.albaranes ?? []);
  // Se marcan solos los de siempre la primera vez que se leen: una factura de mes
  // suele cubrirlos todos, y es más rápido desmarcar uno que marcar veinte.
  const marcados = elegidos ?? losDeSiempre(albaranes, tipo);

  const cuenta =
    base !== null && marcados.size > 0
      ? laCuenta(tipo, base, albaranes, marcados, correcciones)
      : null;

  async function apuntar() {
    if (base === null) return;
    setApuntando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<LoConciliado>('registrar_factura', {
      proveedor_id: proveedorId,
      tipo,
      numero: numero.trim(),
      fecha,
      base_centimos: base,
      ...(total === null ? {} : { total_centimos: total }),
      ...(venceEl === '' ? {} : { vence_el: venceEl }),
      albaranes: [...marcados],
      correcciones: correccionesParaMandar(albaranes, marcados, correcciones),
    });
    setApuntando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    setHecho(respuesta.datos);
  }

  const diasDePago = pendientes.data?.proveedor.diasDePago ?? null;
  const listo = proveedorId !== '' && numero.trim() !== '' && fecha !== '' && base !== null;

  if (hecho !== null) {
    return (
      <Hoja
        abierta
        alCerrar={alCerrar}
        titulo="Factura apuntada"
        pie={
          <Botones>
            <Boton
              tono="secundario"
              onClick={() => {
                alAbrir(hecho.facturaId);
              }}
            >
              Ver la factura
            </Boton>
            <Boton tono="principal" onClick={alCerrar}>
              Hecho
            </Boton>
          </Botones>
        }
      >
        <div className="flex flex-col gap-e3 pt-e3">
          <Aviso
            tono={
              hecho.estado === 'conciliada'
                ? 'bien'
                : hecho.estado === 'con_diferencia'
                  ? 'atencion'
                  : 'info'
            }
            titulo={NOMBRE_DEL_ESTADO_DE_LA_FACTURA[hecho.estado]}
          >
            {hecho.frase ??
              'Apuntada sin albaranes. Se comprueba cuando los marques desde su ficha.'}
          </Aviso>
          {hecho.precios.length > 0 && (
            <Aviso tono="info" titulo="Precios que confirma la factura">
              <ul className="flex flex-col gap-e1">
                {hecho.precios.map((p) => (
                  <li key={p.producto}>
                    <strong>{p.producto}</strong>: {p.frase}
                  </li>
                ))}
              </ul>
            </Aviso>
          )}
        </div>
      </Hoja>
    );
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Apuntar una factura"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={apuntando}
            textoCargando="Apuntando"
            onClick={() => {
              void apuntar();
            }}
          >
            {marcados.size > 0 ? 'Apuntar y comprobar' : 'Apuntar'}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}

        <Selector
          etiqueta="¿De quién es?"
          obligatorio
          sinElegir="Elige un proveedor"
          cuandoNoHay="Todavía no tienes proveedores."
          opciones={(proveedores.data?.proveedores ?? []).map((p) => ({
            valor: p.id,
            texto: p.nombre,
          }))}
          value={proveedorId}
          onChange={(e) => {
            setProveedorId(e.currentTarget.value);
            setElegidos(null);
            setCorrecciones(new Map());
          }}
        />

        <Filtros
          titulo="Qué papel es"
          puesto={tipo}
          alElegir={(valor) => {
            setTipo(valor);
            setElegidos(null);
          }}
          opciones={[
            { valor: 'factura', texto: 'Factura' },
            { valor: 'abono', texto: 'Abono (te devuelven)' },
          ]}
        />

        <div className="grid gap-e3 sm:grid-cols-2">
          <Campo
            etiqueta="Número"
            obligatorio
            value={numero}
            onChange={(e) => {
              setNumero(e.currentTarget.value);
            }}
          />
          <Campo
            etiqueta="Fecha"
            tipo="fecha"
            obligatorio
            ayuda="La que pone el papel."
            value={fecha}
            onChange={(e) => {
              setFecha(e.currentTarget.value);
            }}
          />
          <CampoMoneda
            etiqueta="Base, sin impuestos"
            obligatorio
            ayuda="Lo que suma antes del IVA. Es con lo que se compara."
            valor={base === null ? null : centimos(base)}
            alCambiar={setBase}
          />
          <CampoMoneda
            etiqueta="Total, con impuestos"
            ayuda="Lo que se paga. Si no lo pones, no pasa nada."
            valor={total === null ? null : centimos(total)}
            alCambiar={setTotal}
          />
          <Campo
            etiqueta="Vence el"
            tipo="fecha"
            ayuda={
              diasDePago === null
                ? 'Cuándo hay que pagarla. Con la forma de pago en su ficha, sale sola.'
                : `Si lo dejas en blanco, a ${diasDePago} días de la fecha.`
            }
            value={venceEl}
            onChange={(e) => {
              setVenceEl(e.currentTarget.value);
            }}
          />
        </div>

        {proveedorId !== '' && (
          <section className="flex flex-col gap-e3">
            <h3 className="text-seccion font-semibold">¿Qué albaranes cubre?</h3>
            {pendientes.isPending ? (
              <Cargando que="los albaranes sin factura" lineas={2} />
            ) : (
              <ElegirAlbaranes
                albaranes={albaranes}
                elegidos={marcados}
                alElegir={(id, puesto) => {
                  const nuevos = new Set(marcados);
                  if (puesto) nuevos.add(id);
                  else nuevos.delete(id);
                  setElegidos(nuevos);
                }}
                correcciones={correcciones}
                alCorregir={(lineaId, importe) => {
                  setCorrecciones((antes) => {
                    const nuevas = new Map(antes);
                    if (importe === null) nuevas.delete(lineaId);
                    else nuevas.set(lineaId, importe);
                    return nuevas;
                  });
                }}
              />
            )}
          </section>
        )}

        {cuenta !== null && (
          <Aviso
            tono={cuenta.estado === 'conciliada' ? 'bien' : 'atencion'}
            titulo={cuenta.estado === 'conciliada' ? 'Cuadra' : 'No cuadra'}
          >
            {cuenta.frase}
          </Aviso>
        )}
      </div>
    </Hoja>
  );
}

/** Una factura: lo que dice, contra lo que llegó. */
export function FichaDeFactura({
  facturaId,
  alCerrar,
}: {
  readonly facturaId: string;
  readonly alCerrar: () => void;
}) {
  const { permisos } = usarSesion();
  const albaran = usarAbiertoEnLaDireccion('albaran');
  const consulta = usarLectura<UnaFactura>('una_factura', { factura_id: facturaId });
  const [comprobando, setComprobando] = useState(false);
  const puedeComprobar = puedeEditar(permisos, 'dato.precio_de_compra');

  const datos = consulta.data;

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo="Factura">
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir esta factura">
            Puede que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="la factura" lineas={4} />
        )}
      </PanelLateral>
    );
  }

  const f = datos.factura;
  const titulo = `${f.tipo === 'abono' ? 'Abono' : 'Factura'} ${f.numero} · ${f.proveedor}`;

  return (
    <PanelLateral abierta alCerrar={alCerrar} titulo={titulo}>
      <div className="flex flex-col gap-e4 pt-e3">
        <div>
          <Etiqueta tono={TONO_DEL_ESTADO_DE_LA_FACTURA[f.estado]}>
            {NOMBRE_DEL_ESTADO_DE_LA_FACTURA[f.estado]}
          </Etiqueta>
        </div>

        {datos.frase !== null && (
          <Aviso
            tono={f.estado === 'conciliada' ? 'bien' : 'atencion'}
            titulo={f.estado === 'conciliada' ? 'Cuadra' : 'No cuadra'}
          >
            {datos.frase}
          </Aviso>
        )}

        <dl className="flex flex-col">
          <Dato que="Fecha">{comoSeLeeLaFecha(f.fecha)}</Dato>
          <Dato que="Vence">{f.venceEl === null ? 'Sin fecha' : comoSeLeeLaFecha(f.venceEl)}</Dato>
          <Dato que="Base">{comoDinero(f.baseCentimos)}</Dato>
          <Dato que="Total con impuestos">
            {f.totalCentimos === null ? 'Sin apuntar' : comoDinero(f.totalCentimos)}
          </Dato>
          <Dato que="La apuntó">{f.quienLaApunto ?? 'Alguien que ya no está'}</Dato>
        </dl>

        {f.notas !== null && (
          <p className="text-secundario">
            <span className="text-texto-suave">Nota: </span>
            {f.notas}
          </p>
        )}

        {f.estado === 'sin_conciliar' ? (
          <section className="flex flex-col gap-e2">
            <p className="text-secundario text-texto-suave">
              Todavía no se ha comparado con sus albaranes.
            </p>
            {puedeComprobar && (
              <div>
                <Boton
                  tono="principal"
                  onClick={() => {
                    setComprobando(true);
                  }}
                >
                  Comprobarla con sus albaranes
                </Boton>
              </div>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-e2">
            <h3 className="text-seccion font-semibold">
              {datos.albaranes.length === 1
                ? 'Su albarán'
                : `Sus ${datos.albaranes.length} albaranes`}
            </h3>
            <ul className="flex flex-col rounded-medio border border-borde">
              {datos.albaranes.map((a) => {
                const suma = a.lineas.reduce(
                  (s, l) => s + (l.importeFacturadoCentimos ?? l.importeCentimos ?? 0),
                  0,
                );
                const corregidas = a.lineas.filter(
                  (l) =>
                    l.importeFacturadoCentimos !== null &&
                    l.importeFacturadoCentimos !== undefined &&
                    l.importeFacturadoCentimos !== l.importeCentimos,
                ).length;
                return (
                  <li key={a.id} className="border-b border-borde last:border-0">
                    <button
                      type="button"
                      onClick={() => {
                        albaran.abrir(a.id);
                      }}
                      className="flex w-full min-h-toque items-center gap-e3 px-e3 py-e2 text-left hover:bg-fondo"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-cuerpo">
                          {a.tipo === 'devolucion' ? 'Devolución' : 'Albarán'}{' '}
                          {a.numero ?? 'sin número'}
                          <span className="text-texto-suave"> · {comoSeLeeLaFecha(a.fecha)}</span>
                        </span>
                        {corregidas > 0 && (
                          <span className="block text-secundario text-atencion">
                            {corregidas === 1
                              ? '1 línea cobrada distinta'
                              : `${corregidas} líneas cobradas distintas`}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {a.tipo === 'devolucion' ? '−' : ''}
                        {comoDinero(suma)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {comprobando && (
        <Comprobar
          factura={f}
          alCerrar={() => {
            setComprobando(false);
          }}
        />
      )}
    </PanelLateral>
  );
}

/** Comprobar después una factura que se apuntó sin sus albaranes. */
function Comprobar({
  factura,
  alCerrar,
}: {
  readonly factura: FacturaEnLista;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const pendientes = usarLectura<ParaConciliar>('para_conciliar', {
    proveedor_id: factura.proveedorId,
  });
  const [elegidos, setElegidos] = useState<ReadonlySet<string> | null>(null);
  const [correcciones, setCorrecciones] = useState<Correcciones>(new Map());
  const [notas, setNotas] = useState('');
  const [comprobando, setComprobando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const albaranes = pendientes.data?.albaranes ?? [];
  const marcados = elegidos ?? losDeSiempre(albaranes, factura.tipo);
  const cuenta =
    marcados.size > 0
      ? laCuenta(factura.tipo, factura.baseCentimos, albaranes, marcados, correcciones)
      : null;

  async function comprobar() {
    setComprobando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<LoConciliado>('conciliar_factura', {
      factura_id: factura.id,
      albaranes: [...marcados],
      correcciones: correccionesParaMandar(albaranes, marcados, correcciones),
      ...(notas.trim() === '' ? {} : { notas: notas.trim() }),
    });
    setComprobando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Comprobar la ${factura.tipo} ${factura.numero}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={marcados.size === 0}
            cargando={comprobando}
            textoCargando="Comprobando"
            onClick={() => {
              void comprobar();
            }}
          >
            Dejarla comprobada
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <p className="text-cuerpo">
          Dice <strong className="tabular-nums">{comoDinero(factura.baseCentimos)}</strong> sin
          impuestos. Marca los albaranes que cubre.
        </p>
        {pendientes.isPending ? (
          <Cargando que="los albaranes sin factura" lineas={2} />
        ) : (
          <ElegirAlbaranes
            albaranes={albaranes}
            elegidos={marcados}
            alElegir={(id, puesto) => {
              const nuevos = new Set(marcados);
              if (puesto) nuevos.add(id);
              else nuevos.delete(id);
              setElegidos(nuevos);
            }}
            correcciones={correcciones}
            alCorregir={(lineaId, importe) => {
              setCorrecciones((antes) => {
                const nuevas = new Map(antes);
                if (importe === null) nuevas.delete(lineaId);
                else nuevas.set(lineaId, importe);
                return nuevas;
              });
            }}
          />
        )}
        {cuenta !== null && (
          <Aviso
            tono={cuenta.estado === 'conciliada' ? 'bien' : 'atencion'}
            titulo={cuenta.estado === 'conciliada' ? 'Cuadra' : 'No cuadra'}
          >
            {cuenta.frase}
          </Aviso>
        )}
        <Campo
          etiqueta="Nota"
          ayuda="Lo que se ha visto: «reclamado a Juan el lunes»."
          value={notas}
          onChange={(e) => {
            setNotas(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
