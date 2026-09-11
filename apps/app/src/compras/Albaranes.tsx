import { useState } from 'react';
import { NOMBRE_DE_LA_INCIDENCIA, centimos } from '@estook/dominio';
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
  Tabla,
  Tarjeta,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarCompras } from '../ganchos/usarRefrescarCompras.ts';
import { comoDinero, comoSeLeeLaFecha } from '../inventario/contrato.ts';
import { Cuantos, Dato, Filtros } from './Comun.tsx';
import {
  comoSeLeeElInstante,
  cuantosProductos,
  loQueLlego,
  type AlbaranEnLista,
  type LineaDelAlbaran,
  type MisAlbaranes,
  type UnAlbaran,
} from './contrato.ts';

type Filtro = 'todos' | 'sin_factura' | 'con_incidencias' | 'devoluciones';

/**
 * Compras · Albaranes (M7).
 *
 * «¿Qué ha llegado, y qué no ha cuadrado?» Cada albarán es lo que entró por la
 * puerta: **lo único que mueve género**. Aquí se leen, se ve qué faltó o vino mal,
 * y desde aquí se devuelve lo que se descubre malo al día siguiente.
 *
 * Un cocinero los ve enteros, sin un importe: los recibió él.
 */
export function Albaranes() {
  const albaran = usarAbiertoEnLaDireccion('albaran');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [limite, setLimite] = useState(50);
  const lista = usarLectura<MisAlbaranes>('mis_albaranes', {
    vista: filtro,
    limite: String(limite),
  });

  const datos = lista.data;
  const conPrecios = datos?.puedeVerPrecios === true;

  return (
    <Tarjeta titulo="Lo que ha llegado" origen="Cada albarán, con lo que no cuadró">
      <div className="flex flex-col gap-e3">
        <Filtros
          titulo="Qué albaranes ver"
          puesto={filtro}
          alElegir={(valor) => {
            setFiltro(valor);
            setLimite(50);
          }}
          opciones={[
            { valor: 'todos', texto: 'Todos' },
            ...(conPrecios
              ? [
                  {
                    valor: 'sin_factura' as const,
                    texto: 'Sin factura',
                    cuantos: datos.cuantos.sinFactura,
                  },
                ]
              : []),
            {
              valor: 'con_incidencias',
              texto: 'Con incidencias',
              cuantos: datos?.cuantos.conIncidencias ?? 0,
            },
            { valor: 'devoluciones', texto: 'Devoluciones' },
          ]}
        />

        {lista.isPending ? (
          <Cargando que="los albaranes" lineas={3} />
        ) : lista.isError ? (
          <Aviso tono="mal" titulo="No he podido leer los albaranes">
            Vuelve a intentarlo dentro de un momento. Si sigue igual, avísanos.
          </Aviso>
        ) : (
          <Tabla<AlbaranEnLista>
            titulo="Albaranes"
            filas={datos?.albaranes ?? []}
            claveDe={(a) => a.id}
            alPulsar={(a) => {
              albaran.abrir(a.id);
            }}
            columnas={[
              {
                clave: 'albaran',
                titulo: 'Albarán',
                principal: true,
                celda: (a) => (
                  <span>
                    {a.proveedor}
                    <span className="text-texto-suave"> · {a.numero ?? 'sin número'}</span>
                  </span>
                ),
              },
              { clave: 'fecha', titulo: 'Fecha', celda: (a) => comoSeLeeLaFecha(a.fecha) },
              {
                clave: 'pedido',
                titulo: 'Pedido',
                celda: (a) =>
                  a.tipo === 'devolucion'
                    ? 'Devolución'
                    : a.numeroDePedido === null
                      ? 'Sin pedido'
                      : `Nº ${a.numeroDePedido}`,
              },
              {
                clave: 'como',
                titulo: 'Cómo',
                celda: (a) => (
                  <span className="inline-flex flex-wrap justify-end gap-e1 md:justify-start">
                    {a.tipo === 'devolucion' && <Etiqueta tono="info">devolución</Etiqueta>}
                    {a.conIncidencias && <Etiqueta tono="atencion">con incidencias</Etiqueta>}
                    {conPrecios &&
                      (a.facturaId === null ? (
                        <Etiqueta tono="neutro">sin factura</Etiqueta>
                      ) : (
                        <Etiqueta tono="bien">en factura</Etiqueta>
                      ))}
                    {!a.conIncidencias && a.tipo === 'entrega' && !conPrecios && (
                      <Etiqueta tono="bien">cuadró</Etiqueta>
                    )}
                  </span>
                ),
              },
              ...(conPrecios
                ? [
                    {
                      clave: 'importe',
                      titulo: 'Importe',
                      numerica: true,
                      celda: (a: AlbaranEnLista) => (
                        <span className="tabular-nums">
                          {a.tipo === 'devolucion' ? '−' : ''}
                          {comoDinero(a.totalCentimos)}
                          {(a.sinValorar ?? 0) > 0 && (
                            <span className="block text-etiqueta text-atencion">
                              {a.sinValorar === 1
                                ? '1 línea sin precio'
                                : `${a.sinValorar ?? 0} sin precio`}
                            </span>
                          )}
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
            cuandoNoHay={
              <EstadoVacio
                compacto
                titulo={
                  filtro === 'todos'
                    ? 'Todavía no ha llegado nada'
                    : filtro === 'sin_factura'
                      ? 'Todos los albaranes tienen su factura'
                      : filtro === 'con_incidencias'
                        ? 'Ningún albarán con incidencias'
                        : 'Ninguna devolución'
                }
                frase="Cada vez que se recibe un pedido, o llega algo sin pedido, queda aquí su albarán."
                sinAccionPorque="Se reciben desde Pedidos, con «Ha llegado algo»."
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
              Ver más albaranes
            </Boton>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

/**
 * Un albarán: qué llegó de cada cosa, contra lo que se pidió.
 *
 * Y el botón de devolver, que es donde se busca cuando al día siguiente se abre
 * una caja y el tomate está podrido: el albarán de ayer.
 */
export function FichaDeAlbaran({
  albaranId,
  alCerrar,
}: {
  readonly albaranId: string;
  readonly alCerrar: () => void;
}) {
  const pedido = usarAbiertoEnLaDireccion('pedido');
  const factura = usarAbiertoEnLaDireccion('factura');
  const albaran = usarAbiertoEnLaDireccion('albaran');
  const consulta = usarLectura<UnAlbaran>('un_albaran', { albaran_id: albaranId });
  const [devolviendo, setDevolviendo] = useState(false);

  const datos = consulta.data;

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo="Albarán">
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir este albarán">
            Puede que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="el albarán" lineas={4} />
        )}
      </PanelLateral>
    );
  }

  const a = datos.albaran;
  const esDevolucion = a.tipo === 'devolucion';
  const titulo = esDevolucion ? `Devolución a ${a.proveedor}` : `Albarán de ${a.proveedor}`;

  return (
    <PanelLateral abierta alCerrar={alCerrar} titulo={titulo}>
      <div className="flex flex-col gap-e4 pt-e3">
        <div className="flex flex-wrap gap-e2">
          {esDevolucion && <Etiqueta tono="info">devolución</Etiqueta>}
          {a.conIncidencias && <Etiqueta tono="atencion">con incidencias</Etiqueta>}
        </div>

        <dl className="flex flex-col">
          <Dato que="Número">{a.numero ?? 'Sin número'}</Dato>
          <Dato que="Fecha">{comoSeLeeLaFecha(a.fecha)}</Dato>
          <Dato que={esDevolucion ? 'Lo apuntó' : 'Lo recibió'}>
            {a.quienLoRecibio ?? 'Alguien que ya no está'}
            <span className="font-normal text-texto-suave">
              {' '}
              · {comoSeLeeElInstante(a.recibidoEn)}
            </span>
          </Dato>
          {a.pedidoId !== null && (
            <Dato que="Pedido">
              <button
                type="button"
                className="underline decoration-borde-fuerte underline-offset-2 hover:decoration-texto"
                onClick={() => {
                  if (a.pedidoId !== null) pedido.abrir(a.pedidoId);
                }}
              >
                Nº {a.numeroDePedido ?? ''}
              </button>
            </Dato>
          )}
          {datos.puedeVerPrecios && (
            <Dato que="Factura">
              {a.facturaId === null ? (
                'Todavía sin factura'
              ) : (
                <button
                  type="button"
                  className="underline decoration-borde-fuerte underline-offset-2 hover:decoration-texto"
                  onClick={() => {
                    if (a.facturaId !== null) factura.abrir(a.facturaId);
                  }}
                >
                  {a.facturaNumero ?? 'Ver la factura'}
                </button>
              )}
            </Dato>
          )}
        </dl>

        {a.notas !== null && (
          <p className="text-secundario">
            <span className="text-texto-suave">{esDevolucion ? 'Por qué: ' : 'Nota: '}</span>
            {a.notas}
          </p>
        )}

        <section className="flex flex-col gap-e2">
          <h3 className="text-seccion font-semibold">{cuantosProductos(datos.lineas.length)}</h3>
          <ul className="flex flex-col rounded-medio border border-borde">
            {datos.lineas.map((l) => {
              const facturado = l.importeFacturadoCentimos ?? null;
              const importe = l.importeCentimos ?? null;
              return (
                <li
                  key={l.id}
                  className="flex flex-col gap-e1 border-b border-borde p-e3 last:border-0"
                >
                  <span className="flex items-baseline justify-between gap-e3">
                    <span className="text-cuerpo font-medium">{l.producto}</span>
                    <span className="shrink-0 text-cuerpo">{loQueLlego(l)}</span>
                  </span>
                  {l.pedida !== null && !esDevolucion && (
                    <span className="text-secundario text-texto-suave">
                      Se pidieron {String(l.pedida).replace('.', ',')} ×{' '}
                      {l.formato ?? l.unidadDeUso}
                    </span>
                  )}
                  {l.incidencias.length > 0 && (
                    <span className="flex flex-wrap gap-e1">
                      {l.incidencias.map((cual) => (
                        <Etiqueta
                          key={cual}
                          tono={cual === 'sobra' || cual === 'no_pedido' ? 'info' : 'atencion'}
                        >
                          {NOMBRE_DE_LA_INCIDENCIA[cual]}
                        </Etiqueta>
                      ))}
                    </span>
                  )}
                  {(l.lote !== null || l.caducaEl !== null) && (
                    <span className="text-secundario text-texto-suave">
                      {l.lote === null ? '' : `Lote ${l.lote}`}
                      {l.lote !== null && l.caducaEl !== null ? ' · ' : ''}
                      {l.caducaEl === null ? '' : `caduca el ${comoSeLeeLaFecha(l.caducaEl)}`}
                    </span>
                  )}
                  {l.nota !== null && (
                    <span className="text-secundario text-texto-suave">{l.nota}</span>
                  )}
                  {datos.puedeVerPrecios && (
                    <span className="text-secundario tabular-nums">
                      {importe === null && facturado === null ? (
                        <span className="text-atencion">Sin precio: lo pondrá la factura</span>
                      ) : facturado !== null && facturado !== importe ? (
                        <>
                          <span className="text-texto-suave">Albarán {comoDinero(importe)} · </span>
                          factura {comoDinero(facturado)}
                        </>
                      ) : (
                        comoDinero(facturado ?? importe)
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {datos.puedeVerPrecios && a.totalCentimos !== undefined && (
            <p className="text-cuerpo">
              {esDevolucion ? 'Se espera que abonen ' : 'Suma '}
              <strong className="tabular-nums">{comoDinero(a.totalCentimos)}</strong> sin impuestos.
            </p>
          )}
        </section>

        {datos.puedeDevolver && (
          <div className="border-t border-borde pt-e3">
            <Boton
              tono="secundario"
              onClick={() => {
                setDevolviendo(true);
              }}
            >
              Devolver algo de este albarán
            </Boton>
          </div>
        )}
      </div>

      {devolviendo && (
        <Devolver
          datos={datos}
          alCerrar={() => {
            setDevolviendo(false);
          }}
          alHecho={(nuevoId) => {
            setDevolviendo(false);
            albaran.abrir(nuevoId);
          }}
        />
      )}
    </PanelLateral>
  );
}

const MOTIVOS_DE_DEVOLUCION = [
  'Ha llegado en mal estado',
  'Está caducado o a punto',
  'No es lo que se pidió',
] as const;

/**
 * Devolver al proveedor lo que se ve malo después de recibirlo.
 *
 * Es **un albarán al revés**: sale de cámara con su motivo, y el abono del
 * proveedor lo concilia igual que una factura concilia entregas. Lo que se
 * rechaza en la puerta no se devuelve aquí: no llegó a entrar.
 */
function Devolver({
  datos,
  alCerrar,
  alHecho,
}: {
  readonly datos: UnAlbaran;
  readonly alCerrar: () => void;
  readonly alHecho: (albaranId: string) => void;
}) {
  const { cliente, permisos } = usarSesion();
  const refrescar = usarRefrescarCompras();
  const editaPrecios = puedeEditar(permisos, 'dato.precio_de_compra');
  const entraron = datos.lineas.filter((l) => l.cantidad > 0);

  const [marcadas, setMarcadas] = useState<
    ReadonlyMap<string, { cuanto: number; importe: number | null }>
  >(new Map());
  const [motivo, setMotivo] = useState('');
  const [numero, setNumero] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  /** Se devuelve en cajas si llegó en cajas; si no, en su unidad. */
  const enFormatos = (l: LineaDelAlbaran) => !l.pesoVariable && l.formatos !== null;
  const tope = (l: LineaDelAlbaran) => (enFormatos(l) ? (l.formatos ?? 0) : l.cantidad);

  function marcar(l: LineaDelAlbaran, puesta: boolean) {
    setMarcadas((antes) => {
      const nuevas = new Map(antes);
      if (puesta) nuevas.set(l.id, { cuanto: tope(l), importe: null });
      else nuevas.delete(l.id);
      return nuevas;
    });
  }

  async function devolver() {
    setDevolviendo(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ albaranId: string }>('devolver_al_proveedor', {
      proveedor_id: datos.albaran.proveedorId,
      motivo: motivo.trim(),
      ...(numero.trim() === '' ? {} : { numero: numero.trim() }),
      lineas: entraron
        .filter((l) => (marcadas.get(l.id)?.cuanto ?? 0) > 0)
        .map((l) => {
          const marcada = marcadas.get(l.id);
          const cuanto = marcada?.cuanto ?? 0;
          return {
            producto_id: l.productoId,
            ...(enFormatos(l) ? { formatos: cuanto } : { cantidad: cuanto }),
            ...(editaPrecios && marcada?.importe !== null && marcada?.importe !== undefined
              ? { importe_centimos: marcada.importe }
              : {}),
          };
        }),
    });
    setDevolviendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alHecho(respuesta.datos.albaranId);
  }

  const algoMarcado = [...marcadas.values()].some((m) => m.cuanto > 0);

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Devolver a ${datos.albaran.proveedor}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!algoMarcado || motivo.trim() === ''}
            cargando={devolviendo}
            textoCargando="Apuntando"
            onClick={() => {
              void devolver();
            }}
          >
            Apuntar la devolución
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}

        <section className="flex flex-col gap-e2">
          <h3 className="text-seccion font-semibold">¿Qué se devuelve?</h3>
          <ul className="flex flex-col gap-e2">
            {entraron.map((l) => {
              const marcada = marcadas.get(l.id);
              return (
                <li
                  key={l.id}
                  className="flex flex-col gap-e3 rounded-medio border border-borde p-e3"
                >
                  <label className="flex min-h-toque cursor-pointer items-center gap-e3">
                    <input
                      type="checkbox"
                      className="size-5 accent-naranja"
                      checked={marcada !== undefined}
                      onChange={(e) => {
                        marcar(l, e.currentTarget.checked);
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-cuerpo font-medium">{l.producto}</span>
                      <span className="block text-secundario text-texto-suave">
                        Llegó {loQueLlego(l)}
                      </span>
                    </span>
                  </label>
                  {marcada !== undefined && (
                    <div className="flex flex-wrap items-end gap-e3">
                      <Cuantos
                        etiqueta={`Cuánto de ${l.producto} se devuelve`}
                        valor={marcada.cuanto}
                        detras={enFormatos(l) ? (l.formato ?? l.unidadDeUso) : l.unidadDeUso}
                        alCambiar={(valor) => {
                          setMarcadas((antes) =>
                            new Map(antes).set(l.id, {
                              ...marcada,
                              cuanto: Math.min(valor, tope(l)),
                            }),
                          );
                        }}
                      />
                      {editaPrecios && (
                        <div className="w-[10rem]">
                          <CampoMoneda
                            etiqueta="Lo que tienen que abonar"
                            valor={marcada.importe === null ? null : centimos(marcada.importe)}
                            alCambiar={(valor) => {
                              setMarcadas((antes) =>
                                new Map(antes).set(l.id, { ...marcada, importe: valor }),
                              );
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-e2">
          <Campo
            etiqueta="¿Por qué se devuelve?"
            obligatorio
            ayuda="Queda escrito en el albarán de devolución y en el libro de movimientos."
            value={motivo}
            onChange={(e) => {
              setMotivo(e.currentTarget.value);
            }}
          />
          <div className="flex flex-wrap gap-e1">
            {MOTIVOS_DE_DEVOLUCION.map((m) => (
              <Boton
                key={m}
                tono="texto"
                onClick={() => {
                  setMotivo(m);
                }}
              >
                {m}
              </Boton>
            ))}
          </div>
        </section>

        <Campo
          etiqueta="Número del papel de devolución"
          ayuda="Si el repartidor te deja uno. Si no, déjalo en blanco."
          value={numero}
          onChange={(e) => {
            setNumero(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
