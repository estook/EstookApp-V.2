import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NOMBRE_DEL_ESTADO, centimos, comoSeLePide } from '@estook/dominio';
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
  Interruptor,
  Lista,
  PanelLateral,
  Selector,
  Tarjeta,
  clases,
} from '@estook/ui';
import {
  IconoAbrirFuera,
  IconoAnadir,
  IconoChat,
  IconoDocumento,
  IconoEditar,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  TONO_DEL_ESTADO,
  comoDinero,
  comoSeLeeLaFecha,
  conUnidadDeUso,
} from '../inventario/contrato.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';
import { Cuantos, Dato, EnlaceComoBoton } from './Comun.tsx';
import {
  CANALES,
  FORMAS_DE_PAGO,
  INICIALES_DE_LOS_DIAS,
  NOMBRE_DEL_CANAL,
  NOMBRE_DEL_ESTADO_DEL_PEDIDO,
  NOMBRE_DE_LA_FORMA_DE_PAGO,
  comoSeLeenLosDias,
  cuantosProductos,
  type Canal,
  type FichaDelProveedor,
  type FormaDePago,
  type MisProveedores,
  type ProductoQueTeSirve,
  type UnProveedor,
} from './contrato.ts';

const NOMBRES_DE_LOS_DIAS = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];

/** «4 × Caja 10 kg» o «12 kg»: lo que sugiere pedir, como se pide. */
function comoSeSugiere(p: ProductoQueTeSirve): string | null {
  if (p.sugerencia === null) return null;
  return p.formato === null
    ? conUnidadDeUso(p.sugerencia.cuanto, p.unidadDeUso)
    : `${p.sugerencia.formatos} × ${p.formato}`;
}

/** Una web escrita a mano, con su `https://` si no lo trae. */
function webConProtocolo(web: string): string {
  return /^https?:\/\//i.test(web) ? web : `https://${web}`;
}

/**
 * Compras · Proveedores (M7, la ficha entera).
 *
 * M6 dejó aquí lo justo para que cada precio supiera de quién venía. M7 la
 * completa con **lo que decide cuándo y cómo se pide**: los días de reparto con
 * su plazo y su hora límite —de ahí salen la sugerencia, el «toca pedir hoy» y
 * las entregas del Calendario—, a quién se le escribe, y el mínimo con sus
 * portes.
 *
 * La lista dice lo que importa por la mañana: a quién toca pedir hoy y cuándo
 * llega el siguiente reparto de cada uno.
 */
export function Proveedores() {
  const { permisos } = usarSesion();
  const proveedor = usarAbiertoEnLaDireccion('proveedor');
  const puedeTocar = puedeEditar(permisos, 'app.inventario');
  const [verDesactivados, setVerDesactivados] = useState(false);
  const [creando, setCreando] = useState(false);

  usarQueHacer('nuevo', () => {
    if (puedeTocar) setCreando(true);
  });

  const consulta = usarLectura<MisProveedores>(
    'mis_proveedores',
    verDesactivados ? { incluir_desactivados: 'true' } : {},
  );

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tus proveedores" />
      </div>
    );
  }

  const proveedores = consulta.data?.proveedores ?? [];
  const tocaHoy = proveedores.filter((p) => p.tocaPedirHoy && p.activo).length;

  return (
    <div className="flex flex-col gap-e4">
      <Tarjeta
        titulo={proveedores.length === 1 ? '1 proveedor' : `${proveedores.length} proveedores`}
        origen={tocaHoy === 0 ? 'A quién le compras el género' : `A ${tocaHoy} les toca pedir hoy`}
        {...(puedeTocar
          ? {
              accion: (
                <Boton
                  tono="secundario"
                  icono={<IconoAnadir size={16} />}
                  onClick={() => {
                    setCreando(true);
                  }}
                >
                  Añadir
                </Boton>
              ),
            }
          : {})}
      >
        <Lista
          titulo="Tus proveedores"
          elementos={proveedores.map((p) => ({
            clave: p.id,
            titulo: (
              <span className="flex flex-wrap items-center gap-e2">
                <span>{p.nombre}</span>
                {!p.activo && <Etiqueta>desactivado</Etiqueta>}
                {p.activo && p.tocaPedirHoy && (
                  <Etiqueta tono="atencion">
                    toca pedir hoy
                    {p.pedirAntesDe === null ? '' : ` · antes de las ${p.pedirAntesDe}`}
                  </Etiqueta>
                )}
              </span>
            ),
            detalle: [
              p.diasDeReparto.length === 0
                ? 'Sin días de reparto'
                : p.llegaCuando === null
                  ? comoSeLeenLosDias(p.diasDeReparto)
                  : `${comoSeLeenLosDias(p.diasDeReparto)} · el próximo, ${p.llegaCuando}`,
              p.cuantosProductos === 0
                ? 'todavía no le compras nada'
                : cuantosProductos(p.cuantosProductos),
            ].join(' · '),
            ...(p.pedidosAbiertos > 0
              ? {
                  derecha: (
                    <Etiqueta tono="info">
                      {p.pedidosAbiertos === 1
                        ? '1 pedido abierto'
                        : `${p.pedidosAbiertos} abiertos`}
                    </Etiqueta>
                  ),
                }
              : {}),
            alPulsar: () => {
              proveedor.abrir(p.id);
            },
          }))}
          cuandoNoHay={
            <EstadoVacio
              titulo="Todavía no tienes proveedores"
              frase="Con sus días de reparto puestos, Estook sabe qué día tienes que pedirle, qué pedirle y cuándo llega."
              {...(puedeTocar
                ? {
                    accion: (
                      <Boton
                        tono="principal"
                        icono={<IconoAnadir size={18} />}
                        onClick={() => {
                          setCreando(true);
                        }}
                      >
                        Crear mi primer proveedor
                      </Boton>
                    ),
                  }
                : { sinAccionPorque: 'Tu acceso permite mirar, no dar de alta proveedores.' })}
            />
          }
        />
      </Tarjeta>

      {/* «Lo que se quita no se pierde» (Manifiesto 28). */}
      <Interruptor
        etiqueta="Ver también los desactivados"
        ayuda="Los que ya no te sirven. Sus precios y sus albaranes siguen enteros."
        puesto={verDesactivados}
        alCambiar={setVerDesactivados}
      />

      {creando && (
        <EditarProveedor
          ficha={null}
          alCerrar={() => {
            setCreando(false);
          }}
          alGuardado={(id) => {
            setCreando(false);
            proveedor.abrir(id);
          }}
        />
      )}
    </div>
  );
}

/**
 * La ficha de un proveedor.
 *
 * «Botones grandes: WhatsApp con el pedido escrito, llamar, correo, web» y «se
 * llena solo: qué te sirve, gasto del mes, subidas detectadas, incidencias y
 * puntualidad» (Manifiesto 12). Nadie escribe nada de lo de abajo: sale de los
 * albaranes, los precios y los pedidos.
 */
export function FichaDeProveedor({
  proveedorId,
  alCerrar,
}: {
  readonly proveedorId: string;
  readonly alCerrar: () => void;
}) {
  const { cliente, permisos } = usarSesion();
  const navegar = useNavigate();
  const refrescar = usarRefrescarCompras();
  const pedido = usarAbiertoEnLaDireccion('pedido');
  const albaran = usarAbiertoEnLaDireccion('albaran');
  const producto = usarAbiertoEnLaDireccion('producto');
  const consulta = usarLectura<UnProveedor>('un_proveedor', { proveedor_id: proveedorId });
  const editaPrecios = puedeEditar(permisos, 'dato.precio_de_compra');
  const [editando, setEditando] = useState(false);
  const [pactando, setPactando] = useState<ProductoQueTeSirve | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const datos = consulta.data;

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo="Proveedor">
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir este proveedor">
            Puede que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="el proveedor" lineas={4} />
        )}
      </PanelLateral>
    );
  }

  const p = datos.proveedor;
  const reparto = datos.proximoReparto;

  async function dejarDePactar(pactadoId: string) {
    setError(null);
    const respuesta = await cliente.ejecutar('dejar_de_pactar', { pactado_id: pactadoId });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
  }

  return (
    <PanelLateral abierta alCerrar={alCerrar} titulo={p.nombre}>
      <div className="flex flex-col gap-e4 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {!p.activo && (
          <Aviso tono="info" titulo="Desactivado">
            No sale en los desplegables ni en el Calendario. Sus precios y albaranes siguen enteros.
          </Aviso>
        )}

        {/* ── Hablarle ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-e2">
          {p.whatsappNumero !== null && (
            <EnlaceComoBoton
              icono={<IconoChat size={18} />}
              href={`https://wa.me/${p.whatsappNumero}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </EnlaceComoBoton>
          )}
          {p.telefono !== null && (
            <EnlaceComoBoton href={`tel:${p.telefono.replace(/\s+/g, '')}`}>Llamar</EnlaceComoBoton>
          )}
          {p.correo !== null && (
            <EnlaceComoBoton icono={<IconoDocumento size={18} />} href={`mailto:${p.correo}`}>
              Correo
            </EnlaceComoBoton>
          )}
          {p.web !== null && (
            <EnlaceComoBoton
              icono={<IconoAbrirFuera size={18} />}
              href={webConProtocolo(p.web)}
              target="_blank"
              rel="noreferrer"
            >
              Web
            </EnlaceComoBoton>
          )}
        </div>

        {p.activo && datos.puedeTocar && (
          <Boton
            tono="principal"
            tamano="l"
            ancho
            icono={<IconoAnadir size={20} />}
            onClick={() => {
              navegar(`/inventario/compras/pedidos?pedir=${p.id}`);
            }}
          >
            Hacerle un pedido
          </Boton>
        )}

        {/* ── Cuándo reparte ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-e1">
          <h3 className="text-seccion font-semibold">Cuándo reparte</h3>
          {p.diasDeReparto.length === 0 ? (
            <Aviso
              tono="atencion"
              titulo="Sin días de reparto"
              {...(datos.puedeTocar
                ? {
                    accion: (
                      <Boton
                        tono="secundario"
                        onClick={() => {
                          setEditando(true);
                        }}
                      >
                        Ponérselos
                      </Boton>
                    ),
                  }
                : {})}
            >
              Con ellos, Estook te dice qué día tienes que pedirle y hasta qué hora, y sus entregas
              salen en el Calendario.
            </Aviso>
          ) : (
            <dl className="flex flex-col">
              <Dato que="Reparte">{comoSeLeenLosDias(p.diasDeReparto)}</Dato>
              {p.comoSeLePide !== null && <Dato que="Cómo">{p.comoSeLePide}</Dato>}
              {reparto !== null && (
                <Dato que="El próximo">
                  {reparto.llegaCuando}
                  <span className="font-normal text-texto-suave">
                    {' '}
                    · pidiendo {reparto.pedirCuando}
                    {reparto.pedirAntesDe === null ? '' : ` antes de las ${reparto.pedirAntesDe}`}
                  </span>
                </Dato>
              )}
              {p.comoSePide !== null && (
                <Dato que="Se le pide">{NOMBRE_DEL_CANAL[p.comoSePide]}</Dato>
              )}
            </dl>
          )}
        </section>

        {/* ── Cómo va ───────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-e1">
          <h3 className="text-seccion font-semibold">Cómo va</h3>
          <dl className="flex flex-col">
            <Dato que="Albaranes este mes">{datos.resumen.albaranesDelMes}</Dato>
            {datos.resumen.gastoDelMesCentimos !== undefined && (
              <Dato que="Gasto del mes">{comoDinero(datos.resumen.gastoDelMesCentimos)}</Dato>
            )}
            <Dato que="Incidencias (90 días)">
              {datos.resumen.incidencias === 0 ? 'Ninguna' : datos.resumen.incidencias}
            </Dato>
            <Dato que="Puntualidad">
              {datos.resumen.puntualidad.frase ?? 'Todavía sin entregas con fecha'}
            </Dato>
          </dl>
          {(datos.resumen.subidas ?? []).length > 0 && (
            <Aviso tono="atencion" titulo="Lo que te ha subido">
              <ul className="flex flex-col gap-e1">
                {(datos.resumen.subidas ?? []).map((s) => (
                  <li key={`${s.producto}-${s.desde}`}>
                    <strong>{s.producto}</strong>: {s.frase}{' '}
                    <span className="text-texto-suave">(desde el {comoSeLeeLaFecha(s.desde)})</span>
                  </li>
                ))}
              </ul>
            </Aviso>
          )}
        </section>

        {/* ── Lo que te sirve ───────────────────────────────────────────── */}
        <section className="flex flex-col gap-e2">
          <h3 className="text-seccion font-semibold">
            Lo que te sirve{datos.productos.length > 0 ? ` · ${datos.productos.length}` : ''}
          </h3>
          {datos.productos.length === 0 ? (
            <p className="text-secundario text-texto-suave">
              Ningún producto lo tiene como proveedor. Se pone en la ficha de cada producto.
            </p>
          ) : (
            <ul className="flex flex-col rounded-medio border border-borde">
              {datos.productos.map((pr) => {
                const sugerido = comoSeSugiere(pr);
                return (
                  <li
                    key={pr.id}
                    className="flex flex-col gap-e1 border-b border-borde p-e3 last:border-0"
                  >
                    <span className="flex flex-wrap items-center gap-e2">
                      <button
                        type="button"
                        className="text-left text-cuerpo font-medium underline decoration-borde-fuerte underline-offset-2 hover:decoration-texto"
                        onClick={() => {
                          producto.abrir(pr.id);
                        }}
                      >
                        {pr.nombre}
                      </button>
                      <Etiqueta tono={TONO_DEL_ESTADO[pr.estado]}>
                        {NOMBRE_DEL_ESTADO[pr.estado]}
                      </Etiqueta>
                    </span>
                    <span className="text-secundario text-texto-suave">
                      Hay {conUnidadDeUso(pr.hayAhora, pr.unidadDeUso)}
                      {sugerido === null ? '' : ` · pedir ${sugerido}`}
                    </span>
                    {datos.puedeVerPrecios && (
                      <span className="text-secundario tabular-nums">
                        {pr.precioCentimos === null || pr.precioCentimos === undefined
                          ? 'Sin precio'
                          : `${comoDinero(pr.precioCentimos)}${pr.formato === null ? '' : ` la ${pr.formato.toLowerCase()}`}`}
                        {pr.costePorUnidad !== null && pr.costePorUnidad !== undefined && (
                          <span className="text-texto-suave"> · {pr.costePorUnidad}</span>
                        )}
                      </span>
                    )}
                    {pr.pactado !== null && pr.pactado !== undefined && (
                      <span className="flex flex-wrap items-center gap-e2">
                        <Etiqueta tono="marca">
                          pactado a {comoDinero(pr.pactado.precioCentimos)}
                          {pr.pactado.hasta === null
                            ? ''
                            : ` hasta el ${comoSeLeeLaFecha(pr.pactado.hasta)}`}
                        </Etiqueta>
                        {editaPrecios && (
                          <Boton
                            tono="texto"
                            onClick={() => {
                              if (pr.pactado !== null && pr.pactado !== undefined) {
                                void dejarDePactar(pr.pactado.id);
                              }
                            }}
                          >
                            Quitar lo pactado
                          </Boton>
                        )}
                      </span>
                    )}
                    {editaPrecios && (pr.pactado === null || pr.pactado === undefined) && (
                      <div>
                        <Boton
                          tono="texto"
                          onClick={() => {
                            setPactando(pr);
                          }}
                        >
                          Pactar un precio
                        </Boton>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Lo abierto y lo último ────────────────────────────────────── */}
        {datos.pedidosAbiertos.length > 0 && (
          <section className="flex flex-col gap-e2">
            <h3 className="text-seccion font-semibold">Pedidos abiertos</h3>
            <ul className="flex flex-col rounded-medio border border-borde">
              {datos.pedidosAbiertos.map((pe) => (
                <li key={pe.id} className="border-b border-borde last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      pedido.abrir(pe.id);
                    }}
                    className="flex w-full min-h-toque items-center gap-e3 px-e3 text-left hover:bg-fondo"
                  >
                    <span className="min-w-0 flex-1 text-cuerpo">
                      Nº {pe.numero}
                      <span className="text-texto-suave">
                        {' '}
                        · {NOMBRE_DEL_ESTADO_DEL_PEDIDO[pe.estado]}
                        {pe.llegaCuando === null ? '' : ` · llega ${pe.llegaCuando}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {datos.albaranes.length > 0 && (
          <section className="flex flex-col gap-e2">
            <h3 className="text-seccion font-semibold">Lo último que llegó</h3>
            <ul className="flex flex-col rounded-medio border border-borde">
              {datos.albaranes.map((a) => (
                <li key={a.id} className="border-b border-borde last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      albaran.abrir(a.id);
                    }}
                    className="flex w-full min-h-toque items-center gap-e3 px-e3 text-left hover:bg-fondo"
                  >
                    <span className="min-w-0 flex-1 text-cuerpo">
                      {a.tipo === 'devolucion' ? 'Devolución' : 'Albarán'}{' '}
                      {a.numero ?? 'sin número'}
                      <span className="text-texto-suave"> · {comoSeLeeLaFecha(a.fecha)}</span>
                    </span>
                    {a.conIncidencias && <Etiqueta tono="atencion">incidencias</Etiqueta>}
                    {a.totalCentimos !== undefined && (
                      <span className="shrink-0 tabular-nums">{comoDinero(a.totalCentimos)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Su ficha ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-e1">
          <h3 className="text-seccion font-semibold">Su ficha</h3>
          <dl className="flex flex-col">
            {p.contacto !== null && <Dato que="Contacto">{p.contacto}</Dato>}
            {p.telefono !== null && <Dato que="Teléfono">{p.telefono}</Dato>}
            {p.correo !== null && <Dato que="Correo">{p.correo}</Dato>}
            {p.cif !== null && <Dato que="CIF">{p.cif}</Dato>}
            {p.formaDePago !== null && (
              <Dato que="Se le paga">
                {NOMBRE_DE_LA_FORMA_DE_PAGO[p.formaDePago]}
                {p.diasDePago === null ? '' : ` a ${p.diasDePago} días`}
              </Dato>
            )}
            {p.pedidoMinimoCentimos !== undefined && p.pedidoMinimoCentimos !== null && (
              <Dato que="Pedido mínimo">{comoDinero(p.pedidoMinimoCentimos)}</Dato>
            )}
            {p.portesCentimos !== undefined && p.portesCentimos !== null && (
              <Dato que="Portes si no llega">{comoDinero(p.portesCentimos)}</Dato>
            )}
          </dl>
          {p.notas !== null && <p className="text-secundario text-texto-suave">{p.notas}</p>}
          {datos.puedeTocar && (
            <div className="pt-e2">
              <Boton
                tono="secundario"
                icono={<IconoEditar size={16} />}
                onClick={() => {
                  setEditando(true);
                }}
              >
                Cambiar su ficha
              </Boton>
            </div>
          )}
        </section>
      </div>

      {editando && (
        <EditarProveedor
          ficha={p}
          alCerrar={() => {
            setEditando(false);
          }}
          alGuardado={() => {
            setEditando(false);
          }}
        />
      )}

      {pactando !== null && (
        <Pactar
          producto={pactando}
          proveedor={{ id: p.id, nombre: p.nombre }}
          alCerrar={() => {
            setPactando(null);
          }}
        />
      )}
    </PanelLateral>
  );
}

/**
 * Los siete días, para marcar los de reparto.
 *
 * Como se marcan en la puerta de un almacén: L M X J V S D. Y debajo, dicho con
 * palabras —«martes y viernes»—, para que se lea lo que se ha marcado.
 */
function DiasDeReparto({
  dias,
  alCambiar,
}: {
  readonly dias: readonly number[];
  readonly alCambiar: (dias: number[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-e2">
      <legend className="text-etiqueta uppercase tracking-wide text-texto-suave">
        Días que reparte
      </legend>
      <div className="flex flex-wrap gap-e1">
        {INICIALES_DE_LOS_DIAS.map((inicial, i) => {
          const dia = i + 1;
          const puesto = dias.includes(dia);
          return (
            <button
              key={inicial}
              type="button"
              aria-pressed={puesto}
              aria-label={NOMBRES_DE_LOS_DIAS[i]}
              onClick={() => {
                alCambiar(
                  puesto ? dias.filter((d) => d !== dia) : [...dias, dia].sort((a, b) => a - b),
                );
              }}
              className={clases(
                'grid size-toque place-items-center rounded-medio border text-cuerpo font-semibold',
                puesto
                  ? 'border-naranja bg-naranja text-sobre-naranja'
                  : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
              )}
            >
              {inicial}
            </button>
          );
        })}
      </div>
      <p className="text-secundario text-texto-suave">{comoSeLeenLosDias(dias)}</p>
    </fieldset>
  );
}

/**
 * Dar de alta o cambiar la ficha de un proveedor.
 *
 * Por bloques, en el orden en que se sabe: quién es, cómo se le habla, cuándo
 * reparte y cómo se le paga. Solo el nombre es obligatorio: un proveedor se da de
 * alta desde un desplegable en mitad de otra cosa, y el resto se pone después.
 *
 * El pedido mínimo y los portes son importes: solo los ve y los pone quien ve
 * precios de compra.
 */
function EditarProveedor({
  ficha,
  alCerrar,
  alGuardado,
}: {
  readonly ficha: FichaDelProveedor | null;
  readonly alCerrar: () => void;
  readonly alGuardado: (proveedorId: string) => void;
}) {
  const { cliente, permisos } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const editaPrecios = puedeEditar(permisos, 'dato.precio_de_compra');

  const [nombre, setNombre] = useState(ficha?.nombre ?? '');
  const [contacto, setContacto] = useState(ficha?.contacto ?? '');
  const [cif, setCif] = useState(ficha?.cif ?? '');
  const [telefono, setTelefono] = useState(ficha?.telefono ?? '');
  const [whatsapp, setWhatsapp] = useState(ficha?.whatsapp ?? '');
  const [correo, setCorreo] = useState(ficha?.correo ?? '');
  const [web, setWeb] = useState(ficha?.web ?? '');
  const [comoSePide, setComoSePide] = useState<Canal | ''>(ficha?.comoSePide ?? '');
  const [dias, setDias] = useState<number[]>([...(ficha?.diasDeReparto ?? [])]);
  const [plazo, setPlazo] = useState(ficha?.plazoDeEntrega ?? 1);
  const [horaLimite, setHoraLimite] = useState(ficha?.horaLimite ?? '');
  const [minimo, setMinimo] = useState<number | null>(ficha?.pedidoMinimoCentimos ?? null);
  const [portes, setPortes] = useState<number | null>(ficha?.portesCentimos ?? null);
  const [formaDePago, setFormaDePago] = useState<FormaDePago | ''>(ficha?.formaDePago ?? '');
  const [diasDePago, setDiasDePago] = useState(
    ficha?.diasDePago === null || ficha === null ? '' : String(ficha.diasDePago),
  );
  const [notas, setNotas] = useState(ficha?.notas ?? '');
  const [activo, setActivo] = useState(ficha?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const texto = (valor: string) => (valor.trim() === '' ? null : valor.trim());

  async function guardar() {
    setGuardando(true);
    setError(null);
    const diasDePagoEscritos = diasDePago.trim() === '' ? null : Number(diasDePago);
    const comun = {
      nombre: nombre.trim(),
      notas: texto(notas),
      contacto: texto(contacto),
      cif: texto(cif),
      telefono: texto(telefono),
      whatsapp: texto(whatsapp),
      correo: texto(correo),
      web: texto(web),
      como_se_pide: comoSePide === '' ? null : comoSePide,
      dias_de_reparto: dias,
      plazo_de_entrega: plazo,
      hora_limite: horaLimite === '' ? null : horaLimite,
      forma_de_pago: formaDePago === '' ? null : formaDePago,
      dias_de_pago:
        diasDePagoEscritos !== null && Number.isInteger(diasDePagoEscritos)
          ? diasDePagoEscritos
          : null,
      // El dinero, solo quien lo ve: si no, el servidor diría que no, con razón.
      ...(editaPrecios ? { pedido_minimo_centimos: minimo, portes_centimos: portes } : {}),
    };

    const respuesta =
      ficha === null
        ? await cliente.ejecutar<{ proveedorId: string }>('crear_proveedor', comun)
        : await cliente.ejecutar<{ proveedorId: string }>('cambiar_proveedor', {
            ...comun,
            proveedor_id: ficha.id,
            activo,
          });

    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alGuardado(respuesta.datos.proveedorId);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={ficha === null ? 'Un proveedor nuevo' : `La ficha de ${ficha.nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={nombre.trim() === ''}
            cargando={guardando}
            onClick={() => {
              void guardar();
            }}
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e5 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}

        <section className="flex flex-col gap-e3">
          <h3 className="text-seccion font-semibold">Quién es</h3>
          <Campo
            etiqueta="Cómo se llama"
            obligatorio
            autoFocus={ficha === null}
            value={nombre}
            onChange={(e) => {
              setNombre(e.currentTarget.value);
            }}
          />
          <div className="grid gap-e3 sm:grid-cols-2">
            <Campo
              etiqueta="Con quién hablas"
              ayuda="Sale en el saludo del pedido: «Hola, Juan»."
              value={contacto}
              onChange={(e) => {
                setContacto(e.currentTarget.value);
              }}
            />
            <Campo
              etiqueta="CIF"
              value={cif}
              onChange={(e) => {
                setCif(e.currentTarget.value);
              }}
            />
          </div>
        </section>

        <section className="flex flex-col gap-e3">
          <h3 className="text-seccion font-semibold">Cómo se le habla</h3>
          <div className="grid gap-e3 sm:grid-cols-2">
            <Campo
              etiqueta="Teléfono"
              tipo="telefono"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.currentTarget.value);
              }}
            />
            <Campo
              etiqueta="WhatsApp"
              tipo="telefono"
              ayuda="Si es el mismo que el teléfono, déjalo en blanco."
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(e.currentTarget.value);
              }}
            />
            <Campo
              etiqueta="Correo"
              tipo="correo"
              value={correo}
              onChange={(e) => {
                setCorreo(e.currentTarget.value);
              }}
            />
            <Campo
              etiqueta="Web"
              value={web}
              onChange={(e) => {
                setWeb(e.currentTarget.value);
              }}
            />
          </div>
          <Selector
            etiqueta="Cómo se le pide"
            ayuda="El botón que sale primero al mandarle un pedido."
            sinElegir="Sin decir"
            opciones={CANALES.map((c) => ({ valor: c, texto: NOMBRE_DEL_CANAL[c] }))}
            value={comoSePide}
            onChange={(e) => {
              setComoSePide(e.currentTarget.value as Canal | '');
            }}
          />
        </section>

        <section className="flex flex-col gap-e3">
          <h3 className="text-seccion font-semibold">Cuándo reparte</h3>
          <DiasDeReparto dias={dias} alCambiar={setDias} />
          <div className="flex flex-col gap-e1">
            <span className="text-etiqueta uppercase tracking-wide text-texto-suave">
              Cuántos días antes hay que pedir
            </span>
            <Cuantos
              etiqueta="Días antes de que llegue"
              valor={plazo}
              detras={plazo === 1 ? 'día' : 'días'}
              alCambiar={(valor) => {
                setPlazo(Math.min(30, Math.trunc(valor)));
              }}
            />
          </div>
          <Campo
            etiqueta="Hasta qué hora"
            tipo="hora"
            ayuda="La hora límite para que llegue a ese reparto. Si no hay, déjalo en blanco."
            value={horaLimite}
            onChange={(e) => {
              setHoraLimite(e.currentTarget.value);
            }}
          />
          {dias.length > 0 && (
            <p className="text-secundario">
              {comoSeLePide(plazo, horaLimite === '' ? null : horaLimite)}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-e3">
          <h3 className="text-seccion font-semibold">Cómo se le paga</h3>
          <div className="grid gap-e3 sm:grid-cols-2">
            <Selector
              etiqueta="Forma de pago"
              sinElegir="Sin decir"
              opciones={FORMAS_DE_PAGO.map((f) => ({
                valor: f,
                texto: NOMBRE_DE_LA_FORMA_DE_PAGO[f],
              }))}
              value={formaDePago}
              onChange={(e) => {
                setFormaDePago(e.currentTarget.value as FormaDePago | '');
              }}
            />
            <Campo
              etiqueta="A cuántos días"
              tipo="numero"
              ayuda="De ahí sale el vencimiento de cada factura."
              value={diasDePago}
              onChange={(e) => {
                setDiasDePago(e.currentTarget.value);
              }}
            />
            {editaPrecios && (
              <>
                <CampoMoneda
                  etiqueta="Pedido mínimo"
                  ayuda="Sin impuestos. Se avisa si un pedido no llega."
                  valor={minimo === null ? null : centimos(minimo)}
                  alCambiar={setMinimo}
                />
                <CampoMoneda
                  etiqueta="Portes si no llega"
                  valor={portes === null ? null : centimos(portes)}
                  alCambiar={setPortes}
                />
              </>
            )}
          </div>
        </section>

        <Campo
          etiqueta="Notas"
          ayuda="Lo que quieras recordar: «el lunes no trae pescado», «preguntar por Ana»."
          value={notas}
          onChange={(e) => {
            setNotas(e.currentTarget.value);
          }}
        />

        {ficha !== null && (
          <Interruptor
            etiqueta="Sigue activo"
            ayuda="Desactivarlo lo quita de los desplegables y del Calendario. No se borra: sus precios y albaranes siguen."
            puesto={activo}
            alCambiar={setActivo}
          />
        )}
      </div>
    </Hoja>
  );
}

/**
 * Pactar un precio: «Makro me deja el aceite a 42 € hasta diciembre».
 *
 * Lo pactado no es el precio: es una promesa. El precio lo pone el albarán y lo
 * confirma la factura; lo pactado está para que, cuando no coincidan, se diga en
 * la puerta.
 */
function Pactar({
  producto,
  proveedor,
  alCerrar,
}: {
  readonly producto: ProductoQueTeSirve;
  readonly proveedor: { readonly id: string; readonly nombre: string };
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const [precio, setPrecio] = useState<number | null>(producto.precioCentimos ?? null);
  const [hasta, setHasta] = useState('');
  const [nota, setNota] = useState('');
  const [pactando, setPactando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function pactar() {
    if (precio === null) return;
    setPactando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('pactar_precio', {
      producto_id: producto.id,
      proveedor_id: proveedor.id,
      precio_centimos: precio,
      ...(hasta === '' ? {} : { hasta }),
      ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
    });
    setPactando(false);
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
      titulo={`Pactar ${producto.nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={precio === null}
            cargando={pactando}
            onClick={() => {
              void pactar();
            }}
          >
            Pactarlo
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <p className="text-cuerpo">
          Lo que te ha prometido {proveedor.nombre}. Si un albarán llega más caro, se avisa en la
          puerta.
        </p>
        <CampoMoneda
          etiqueta={`Precio pactado${producto.formato === null ? '' : ` por ${producto.formato.toLowerCase()}`}`}
          obligatorio
          ayuda="Sin impuestos, como en los albaranes."
          valor={precio === null ? null : centimos(precio)}
          alCambiar={setPrecio}
        />
        <Campo
          etiqueta="Hasta cuándo"
          tipo="fecha"
          ayuda="Si no tiene fecha, déjalo en blanco."
          value={hasta}
          onChange={(e) => {
            setHasta(e.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="Nota"
          ayuda="«Por volumen», «si pedimos más de 10 cajas»…"
          value={nota}
          onChange={(e) => {
            setNota(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
