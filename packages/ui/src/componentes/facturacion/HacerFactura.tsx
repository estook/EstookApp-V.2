import { useMemo, useState } from 'react';
import {
  LIMITE_DEL_TICKET,
  centimos,
  elDesglose,
  elPlazoDeLaFactura,
  enEuros,
  importeDelDocumento,
  porQueNoCabeLaSenal,
  type Centimos,
  type FechaOperativa,
  type LineaVendida,
} from '@estook/dominio';
import { Aviso, ErrorEnCristiano, type ErrorDeLaApi } from '../Aviso.tsx';
import { Boton } from '../Boton.tsx';
import { Campo, CampoMoneda } from '../Campo.tsx';
import { clases } from '../../clases.ts';
import { usarConPausa, usarLectura, type ClienteDeFacturas } from '../../ganchos/usarLectura.ts';
import { usarElCliente } from '../../ganchos/usarElCliente.ts';
import { Elegir, ParaQuien } from './ElClienteDeLaFactura.tsx';

/**
 * **Hacer una factura** (T6 · 2 · 2 · 1, decisión 0137; maqueta de T6 · 2 · 2, 2 y 3). Dos caminos
 * con el mismo cliente: la de uno o varios tickets (F3), con el importe fijo, que puede hacer toda
 * la sala; y la factura a mano (F1), con conceptos libres, para quien manda en ella.
 *
 * **El cliente se escribe directo: no hay lista** (0139, Richi: «esto se peta de personas»). Si su
 * número ya tiene una factura, lo demás sale de ella.
 */

export interface TicketParaFacturar {
  readonly id: string;
  readonly numero: string;
  readonly dia: string;
  readonly donde: string | null;
  readonly total: number;
  readonly porQueNoSeCanjea: string | null;
}

interface LaListaDeTickets {
  readonly documentos: readonly TicketParaFacturar[];
}

interface LoDeLaFactura {
  readonly hoy: FechaOperativa;
  readonly tipos: readonly number[];
  readonly tipoDeLaCarta: number | null;
  readonly impuesto: string;
  readonly platos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly precio: number;
  }[];
}

interface UnConcepto {
  readonly clave: string;
  readonly nombre: string;
  readonly cantidad: number;
  /** Lo de uno, con el impuesto dentro: multiplicar es exacto, dividir no. */
  readonly unidad: number;
  /** Por todos, con el impuesto dentro. */
  readonly importe: number;
  readonly tipo: number;
}

/** Una señal de ese cliente: lo que la factura final le descuenta (maqueta de T6 · 2 · 2, 4). */
interface UnaSenal {
  readonly id: string;
  readonly numero: string;
  readonly fecha: string;
  readonly importe: number;
  readonly lineas: readonly LineaVendida[];
}

const porciento = (tipo: number) =>
  `${String(Number((tipo * 100).toFixed(2))).replace('.', ',')} %`;

export function HacerFactura({
  cliente,
  tickets: ticketsDeSalida,
  puedeTodo,
  alHecha,
}: {
  readonly cliente: ClienteDeFacturas;
  /** Con tickets, la de esos tickets. Sin ellos, a mano. */
  readonly tickets: readonly TicketParaFacturar[] | null;
  readonly puedeTodo: boolean;
  readonly alHecha: (documentoId: string, correoNoSalio: boolean) => void;
}) {
  const aMano = ticketsDeSalida === null;
  const [tickets, setTickets] = useState<readonly TicketParaFacturar[]>(ticketsDeSalida ?? []);
  const [anadiendo, setAnadiendo] = useState(false);
  // El cliente.
  const c = usarElCliente(cliente);
  const { clase, correo, setCorreo, elCliente, faltaCliente, noVale } = c;
  // La factura a mano.
  const [conceptos, setConceptos] = useState<readonly UnConcepto[]>([]);
  const [fecha, setFecha] = useState('');
  const [cobrada, setCobrada] = useState(true);
  const [vence, setVence] = useState('');
  const [libre, setLibre] = useState<{
    nombre: string;
    importe: Centimos | null;
    /** Sin elegir hasta que se elige: un alquiler no va al mismo IVA que una comida (0139). */
    tipo: number | null;
  } | null>(null);
  const [delaCarta, setDelaCarta] = useState(false);
  const [buscarPlato, setBuscarPlato] = useState('');
  // Hacerla.
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const lo = usarLectura<LoDeLaFactura | null>(
    () =>
      aMano
        ? cliente.consultar('lo_que_se_puede_facturar')
        : Promise.resolve({ ok: true, datos: null }),
    `lo|${String(aMano)}`,
  );
  const datos = lo.datos ?? null;
  // Las señales de ese cliente, en cuanto Hacienda lo da por bueno. **Salen marcadas solas.**
  const senales = usarLectura<readonly UnaSenal[]>(
    () =>
      aMano && c.numeroComprobado !== ''
        ? cliente.consultar('las_senales_del_cliente', { identificador: c.numeroComprobado })
        : Promise.resolve({ ok: true, datos: [] }),
    `senales|${String(aMano)}|${c.numeroComprobado}`,
  );
  const [sinDescontar, setSinDescontar] = useState<readonly string[]>([]);
  const lasSenales = senales.datos ?? [];
  const lasMarcadas = lasSenales.filter((s) => !sinDescontar.includes(s.id));

  const totalDeTickets = tickets.reduce((s, t) => s + t.total, 0);
  const lineasParaVer: LineaVendida[] = useMemo(
    () => conceptos.map((l) => ({ ...l, regimen: 'iva' as const })),
    [conceptos],
  );
  const conLaSenal = useMemo(
    () => [...lineasParaVer, ...lasMarcadas.flatMap((s) => [...s.lineas])],
    [lineasParaVer, lasMarcadas],
  );
  const desglose = lineasParaVer.length === 0 ? null : elDesglose(conLaSenal);
  const noCabeLaSenal = lasMarcadas.length === 0 ? null : porQueNoCabeLaSenal(conLaSenal);
  const hoy = (datos?.hoy ?? '') as FechaOperativa;
  const plazo =
    aMano && fecha !== '' && hoy !== ''
      ? elPlazoDeLaFactura(fecha as FechaOperativa, hoy, clase)
      : null;

  async function hacer() {
    setHaciendo(true);
    setError(null);
    const r = aMano
      ? await cliente.ejecutar<{ documentoId: string }>('hacer_factura_a_mano', {
          cliente: elCliente,
          lineas: conceptos.map(({ nombre: n, cantidad, importe, tipo }) => ({
            nombre: n,
            cantidad,
            importe,
            tipo,
          })),
          ...(fecha === '' ? {} : { fecha_operacion: fecha }),
          cobrada,
          ...(cobrada || vence === '' ? {} : { vencimiento: vence }),
          ...(lasMarcadas.length === 0 ? {} : { senales: lasMarcadas.map((s) => s.id) }),
        })
      : await cliente.ejecutar<{ documentoId: string }>('hacer_factura_de_tickets', {
          ticket_ids: tickets.map((t) => t.id),
          cliente: elCliente,
        });
    if (!r.ok) {
      setHaciendo(false);
      setError(r.error);
      return;
    }
    // Si dio su correo, se le manda al momento. Si falla, la factura está hecha, y se dice: quien
    // la hace no puede quedarse creyendo que le ha llegado al cliente.
    let correoNoSalio = false;
    if (correo.trim() !== '') {
      const mandado = await cliente.ejecutar('mandar_el_documento', {
        documento_id: r.datos.documentoId,
        para: correo.trim(),
      });
      correoNoSalio = !mandado.ok;
    }
    setHaciendo(false);
    alHecha(r.datos.documentoId, correoNoSalio);
  }

  const faltaAlgo =
    faltaCliente ||
    noVale ||
    noCabeLaSenal !== null ||
    (aMano ? conceptos.length === 0 || (!cobrada && vence === '') : tickets.length === 0);

  if (anadiendo) {
    return (
      <AnadirTickets
        cliente={cliente}
        puedeTodo={puedeTodo}
        ya={tickets}
        alTerminar={(nuevos) => {
          setTickets(nuevos);
          setAnadiendo(false);
        }}
      />
    );
  }

  const platos = (datos?.platos ?? []).filter((p) =>
    p.nombre.toLowerCase().includes(buscarPlato.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-e4">
      {!aMano && (
        <div className="flex flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e3">
          <p className="text-secundario text-texto-suave">
            {tickets.length === 1
              ? 'El importe es el del ticket'
              : `${String(tickets.length)} tickets`}
          </p>
          <p className="text-titulo font-bold tabular-nums">
            {importeDelDocumento(totalDeTickets)}
          </p>
          <ul className="flex flex-col gap-e1 text-secundario text-texto-suave">
            {tickets.map((t) => (
              <li key={t.id} className="tabular-nums">
                {t.numero} · {importeDelDocumento(t.total)}
              </li>
            ))}
          </ul>
          <div>
            <Boton
              tono="secundario"
              onClick={() => {
                setAnadiendo(true);
              }}
            >
              Añadir otro ticket
            </Boton>
          </div>
        </div>
      )}

      <ParaQuien c={c} />

      {aMano && datos !== null && (
        <>
          <section aria-label="Qué se factura" className="flex flex-col gap-e3">
            <p className="text-cuerpo font-semibold">Qué se factura</p>
            {conceptos.length > 0 && (
              <ul className="flex flex-col gap-e1">
                {conceptos.map((c) => (
                  <li
                    key={c.clave}
                    className="flex items-center gap-e2 rounded-medio border border-borde bg-superficie px-e3 py-e1"
                  >
                    <input
                      aria-label={`Cuántos de ${c.nombre}`}
                      type="number"
                      min={1}
                      value={c.cantidad}
                      onChange={(e) => {
                        const n = Math.max(1, Number(e.target.value) || 1);
                        setConceptos((ya) =>
                          ya.map((o) =>
                            o.clave === c.clave
                              ? {
                                  ...o,
                                  cantidad: n,
                                  importe: o.unidad * n,
                                }
                              : o,
                          ),
                        );
                      }}
                      className="w-14 rounded-medio border border-borde bg-superficie px-e1 text-center tabular-nums"
                    />
                    <span className="min-w-0 flex-1 truncate text-secundario">
                      {c.nombre} <span className="text-texto-suave">· {porciento(c.tipo)}</span>
                    </span>
                    <span className="tabular-nums text-secundario">
                      {enEuros(centimos(c.importe))}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${c.nombre}`}
                      onClick={() => {
                        setConceptos((ya) => ya.filter((o) => o.clave !== c.clave));
                      }}
                      className="min-h-toque min-w-toque text-texto-suave"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-e2">
              {datos.platos.length > 0 && datos.tipoDeLaCarta !== null && (
                <Boton
                  tono="secundario"
                  onClick={() => {
                    setDelaCarta((d) => !d);
                    setLibre(null);
                  }}
                >
                  De la carta
                </Boton>
              )}
              <Boton
                tono="secundario"
                onClick={() => {
                  setDelaCarta(false);
                  setLibre({
                    nombre: '',
                    importe: null,
                    tipo: datos.tipos.length === 1 ? (datos.tipos[0] ?? null) : null,
                  });
                }}
              >
                Concepto libre
              </Boton>
            </div>
            {delaCarta && datos.tipoDeLaCarta !== null && (
              <div className="flex flex-col gap-e2 rounded-grande border border-borde p-e3">
                <Campo
                  etiqueta="Busca un plato"
                  value={buscarPlato}
                  onChange={(e) => {
                    setBuscarPlato(e.target.value);
                  }}
                />
                <ul className="flex max-h-56 flex-col gap-e1 overflow-y-auto">
                  {platos.slice(0, 30).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          const tipo = datos.tipoDeLaCarta ?? 0;
                          setConceptos((ya) => [
                            ...ya,
                            {
                              clave: crypto.randomUUID(),
                              nombre: p.nombre,
                              cantidad: 1,
                              unidad: p.precio,
                              importe: p.precio,
                              tipo,
                            },
                          ]);
                          setDelaCarta(false);
                          setBuscarPlato('');
                        }}
                        className="flex min-h-toque w-full items-center justify-between gap-e2 rounded-medio px-e2 text-left text-secundario hover:bg-fondo"
                      >
                        <span className="min-w-0 truncate">{p.nombre}</span>
                        <span className="tabular-nums">{enEuros(centimos(p.precio))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {libre !== null && (
              <div className="flex flex-col gap-e3 rounded-grande border border-borde p-e3">
                <Campo
                  etiqueta="Qué es"
                  value={libre.nombre}
                  onChange={(e) => {
                    setLibre({ ...libre, nombre: e.target.value });
                  }}
                />
                <div className="grid gap-e3 sm:grid-cols-2">
                  <CampoMoneda
                    etiqueta={`Importe, con ${datos.impuesto}`}
                    valor={libre.importe}
                    alCambiar={(importe) => {
                      setLibre({ ...libre, importe });
                    }}
                  />
                  <div className="flex flex-col gap-e1">
                    <p className="text-secundario font-medium text-texto-suave">{datos.impuesto}</p>
                    <Elegir
                      nombre={`Qué ${datos.impuesto} lleva`}
                      opciones={datos.tipos.map((t) => ({ valor: String(t), texto: porciento(t) }))}
                      valor={libre.tipo === null ? '' : String(libre.tipo)}
                      alElegir={(v) => {
                        setLibre({ ...libre, tipo: Number(v) });
                      }}
                    />
                    <p className="text-etiqueta text-texto-suave">
                      Si dudas de cuál lleva, pregúntaselo a tu gestoría.
                    </p>
                  </div>
                </div>
                <div>
                  <Boton
                    tono="secundario"
                    disabled={
                      libre.nombre.trim() === '' || libre.importe === null || libre.tipo === null
                    }
                    onClick={() => {
                      const { importe, tipo } = libre;
                      if (importe === null || tipo === null) return;
                      setConceptos((ya) => [
                        ...ya,
                        {
                          clave: crypto.randomUUID(),
                          nombre: libre.nombre.trim(),
                          cantidad: 1,
                          unidad: importe,
                          importe,
                          tipo,
                        },
                      ]);
                      setLibre(null);
                    }}
                  >
                    Añadirlo
                  </Boton>
                </div>
              </div>
            )}
            {lasSenales.length > 0 && (
              <ul className="flex flex-col gap-e1">
                {lasSenales.map((s) => {
                  const marcada = !sinDescontar.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={marcada}
                        onClick={() => {
                          setSinDescontar((ya) =>
                            marcada ? [...ya, s.id] : ya.filter((x) => x !== s.id),
                          );
                        }}
                        className={clases(
                          'flex min-h-toque w-full items-center gap-e2 rounded-medio border px-e3 py-e1 text-left',
                          marcada
                            ? 'border-naranja bg-naranja-suave'
                            : 'border-borde bg-superficie',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-secundario font-medium">
                            Descontar su señal
                          </span>
                          <span className="block truncate text-etiqueta text-texto-suave tabular-nums">
                            {s.numero} · {s.fecha.slice(8, 10)}/{s.fecha.slice(5, 7)}
                          </span>
                        </span>
                        <span className="tabular-nums text-secundario">
                          {importeDelDocumento(-s.importe)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {noCabeLaSenal !== null && (
              <Aviso tono="atencion" titulo="La señal no cabe">
                {noCabeLaSenal}
              </Aviso>
            )}
            {desglose !== null && (
              <div className="flex flex-col gap-e1 rounded-grande border border-borde bg-superficie p-e3 tabular-nums">
                <p className="flex justify-between text-secundario text-texto-suave">
                  <span>Base</span>
                  <span>{importeDelDocumento(desglose.base)}</span>
                </p>
                {desglose.lineas.map((l) => (
                  <p key={l.tipo} className="flex justify-between text-secundario text-texto-suave">
                    <span>
                      {datos.impuesto} {porciento(l.tipo)}
                    </span>
                    <span>{importeDelDocumento(l.cuota)}</span>
                  </p>
                ))}
                <p className="flex justify-between text-titulo font-bold">
                  <span>Total</span>
                  <span>{importeDelDocumento(desglose.total)}</span>
                </p>
              </div>
            )}
          </section>

          <section aria-label="Cuándo y cómo se cobra" className="flex flex-col gap-e3">
            <Campo
              etiqueta="Fecha de la comida, si fue otro día"
              tipo="fecha"
              value={fecha}
              max={hoy}
              onChange={(e) => {
                setFecha(e.target.value);
              }}
              {...(plazo === null
                ? {}
                : plazo.pasado
                  ? { ayuda: `Es una empresa: se tenía que hacer antes del 16 del mes siguiente.` }
                  : { ayuda: `Es una empresa: hazla antes del día 16 de este mes.` })}
            />
            <Elegir
              nombre="Si está cobrada"
              opciones={[
                { valor: 'si', texto: 'Cobrada' },
                { valor: 'no', texto: 'Por cobrar' },
              ]}
              valor={cobrada ? 'si' : 'no'}
              alElegir={(v) => {
                setCobrada(v === 'si');
              }}
            />
            {!cobrada && (
              <Campo
                etiqueta="Vence"
                tipo="fecha"
                value={vence}
                onChange={(e) => {
                  setVence(e.target.value);
                }}
              />
            )}
          </section>
        </>
      )}

      {!aMano && totalDeTickets > LIMITE_DEL_TICKET && (
        <Aviso tono="info" titulo="Pasa de 3.000 €">
          Una factura completa, como esta, no tiene ese límite.
        </Aviso>
      )}

      <Campo
        etiqueta="Correo, para mandársela (si quiere)"
        tipo="correo"
        value={correo}
        onChange={(e) => {
          setCorreo(e.target.value);
        }}
      />
      {error !== null && <ErrorEnCristiano error={error} />}
      {c.errorAlComprobar !== null && <ErrorEnCristiano error={c.errorAlComprobar} />}
      <Boton
        tono="principal"
        disabled={faltaAlgo}
        cargando={haciendo}
        textoCargando="Haciéndola"
        onClick={() => {
          void hacer();
        }}
      >
        Hacer la factura
      </Boton>
      {!aMano && (
        <p className="text-etiqueta text-texto-suave">
          Cada ticket, una sola vez. No mueve la caja ni el almacén.
        </p>
      )}
    </div>
  );
}

/** Elegir más tickets: por fechas si se puede, y por su número siempre (maqueta, 3). */
function AnadirTickets({
  cliente,
  puedeTodo,
  ya,
  alTerminar,
}: {
  readonly cliente: ClienteDeFacturas;
  readonly puedeTodo: boolean;
  readonly ya: readonly TicketParaFacturar[];
  readonly alTerminar: (tickets: readonly TicketParaFacturar[]) => void;
}) {
  const [elegidos, setElegidos] = useState<readonly TicketParaFacturar[]>(ya);
  const [numero, setNumero] = useState('');
  const buscado = usarConPausa(numero.trim());
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const hayFechas = puedeTodo && desde !== '' && hasta !== '';
  const lista = usarLectura<LaListaDeTickets>(
    () =>
      cliente.consultar('tickets_y_facturas', {
        que: 'tickets',
        ...(buscado === '' ? {} : { buscar: buscado }),
        ...(hayFechas ? { desde, hasta } : {}),
      }),
    `anadir|${buscado}|${desde}|${hasta}`,
  );
  const total = elegidos.reduce((s, t) => s + t.total, 0);
  const marcado = (id: string) => elegidos.some((t) => t.id === id);

  return (
    <div className="flex flex-col gap-e3">
      <Campo
        etiqueta="Número del ticket"
        value={numero}
        onChange={(e) => {
          setNumero(e.target.value);
        }}
      />
      {puedeTodo && (
        <div className="grid grid-cols-2 gap-e3">
          <Campo
            etiqueta="Desde"
            tipo="fecha"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
            }}
          />
          <Campo
            etiqueta="Hasta"
            tipo="fecha"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
            }}
          />
        </div>
      )}
      <ul className="flex flex-col gap-e1">
        {(lista.datos?.documentos ?? []).map((t) => {
          const elegido = marcado(t.id);
          const noSePuede = t.porQueNoSeCanjea !== null && !elegido;
          return (
            <li key={t.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={elegido}
                disabled={noSePuede}
                onClick={() => {
                  setElegidos((e) => (elegido ? e.filter((o) => o.id !== t.id) : [...e, t]));
                }}
                className={clases(
                  'flex min-h-toque w-full items-center gap-e2 rounded-medio border px-e3 py-e1 text-left',
                  elegido
                    ? 'border-naranja bg-naranja-suave'
                    : noSePuede
                      ? 'border-borde bg-fondo text-texto-suave'
                      : 'border-borde bg-superficie',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-secundario font-medium tabular-nums">
                    {t.numero}
                  </span>
                  <span className="block truncate text-etiqueta text-texto-suave">
                    {t.dia.slice(8, 10)}/{t.dia.slice(5, 7)}
                    {t.donde === null ? '' : ` · ${t.donde}`}
                    {t.porQueNoSeCanjea === null ? '' : ` · ${t.porQueNoSeCanjea}`}
                  </span>
                </span>
                <span className="tabular-nums text-secundario">{importeDelDocumento(t.total)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center justify-between font-semibold tabular-nums">
        <span>{String(elegidos.length)} tickets</span>
        <span>{importeDelDocumento(total)}</span>
      </p>
      <Boton
        tono="principal"
        disabled={elegidos.length === 0}
        onClick={() => {
          alTerminar(elegidos);
        }}
      >
        Listo
      </Boton>
    </div>
  );
}
