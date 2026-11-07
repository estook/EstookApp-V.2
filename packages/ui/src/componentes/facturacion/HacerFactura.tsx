import { useMemo, useState } from 'react';
import {
  LIMITE_DEL_TICKET,
  centimos,
  elDesglose,
  elPlazoDeLaFactura,
  enEuros,
  importeDelDocumento,
  type Centimos,
  type ClaseDeCliente,
  type FechaOperativa,
  type LineaVendida,
} from '@estook/dominio';
import { Aviso, ErrorEnCristiano, type ErrorDeLaApi } from '../Aviso.tsx';
import { Boton } from '../Boton.tsx';
import { Campo, CampoMoneda } from '../Campo.tsx';
import { Selector } from '../Selector.tsx';
import { clases } from '../../clases.ts';
import { usarConPausa, usarLectura, type ClienteDeFacturas } from '../../ganchos/usarLectura.ts';

/**
 * **Hacer una factura** (T6 · 2 · 2 · 1, decisión 0137; maqueta de T6 · 2 · 2, 2 y 3). Dos caminos
 * con el mismo cliente: la de uno o varios tickets (F3), con el importe fijo, que puede hacer toda
 * la sala; y la factura a mano (F1), con conceptos libres, para quien manda en ella.
 */

/** Los países que más vienen. Con el código ISO que pide Verifacti (`codigo_pais`). */
const PAISES: readonly { readonly valor: string; readonly texto: string }[] = [
  { valor: 'DE', texto: 'Alemania' },
  { valor: 'AT', texto: 'Austria' },
  { valor: 'BE', texto: 'Bélgica' },
  { valor: 'BG', texto: 'Bulgaria' },
  { valor: 'CY', texto: 'Chipre' },
  { valor: 'HR', texto: 'Croacia' },
  { valor: 'DK', texto: 'Dinamarca' },
  { valor: 'SK', texto: 'Eslovaquia' },
  { valor: 'SI', texto: 'Eslovenia' },
  { valor: 'EE', texto: 'Estonia' },
  { valor: 'FI', texto: 'Finlandia' },
  { valor: 'FR', texto: 'Francia' },
  { valor: 'GR', texto: 'Grecia' },
  { valor: 'HU', texto: 'Hungría' },
  { valor: 'IE', texto: 'Irlanda' },
  { valor: 'IT', texto: 'Italia' },
  { valor: 'LV', texto: 'Letonia' },
  { valor: 'LT', texto: 'Lituania' },
  { valor: 'LU', texto: 'Luxemburgo' },
  { valor: 'MT', texto: 'Malta' },
  { valor: 'NL', texto: 'Países Bajos' },
  { valor: 'PL', texto: 'Polonia' },
  { valor: 'PT', texto: 'Portugal' },
  { valor: 'CZ', texto: 'República Checa' },
  { valor: 'RO', texto: 'Rumanía' },
  { valor: 'SE', texto: 'Suecia' },
  { valor: 'AD', texto: 'Andorra' },
  { valor: 'AR', texto: 'Argentina' },
  { valor: 'BR', texto: 'Brasil' },
  { valor: 'CA', texto: 'Canadá' },
  { valor: 'CN', texto: 'China' },
  { valor: 'US', texto: 'Estados Unidos' },
  { valor: 'JP', texto: 'Japón' },
  { valor: 'MA', texto: 'Marruecos' },
  { valor: 'MX', texto: 'México' },
  { valor: 'NO', texto: 'Noruega' },
  { valor: 'GB', texto: 'Reino Unido' },
  { valor: 'CH', texto: 'Suiza' },
];

/** Los de la Unión: los únicos con número de IVA en el censo europeo. */
const DE_LA_UNION = new Set(PAISES.slice(0, 26).map((p) => p.valor));

interface Comprobado {
  readonly vale: boolean;
  readonly dice: string | null;
  readonly nombre: string | null;
  readonly domicilio: string | null;
  readonly correo: string | null;
}

interface Guardado {
  readonly id: string;
  readonly clase: ClaseDeCliente;
  readonly nombre: string;
  readonly identificador: string;
  readonly idTipo: '02' | '03' | null;
  readonly codigoPais: string | null;
  readonly domicilio: string;
  readonly correo: string | null;
}

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

const EN_CADA_CLASE: readonly { readonly valor: ClaseDeCliente; readonly texto: string }[] = [
  { valor: 'empresa', texto: 'Empresa o autónomo' },
  { valor: 'particular', texto: 'Particular' },
  { valor: 'de_fuera', texto: 'De fuera de España' },
];

const porciento = (tipo: number) =>
  `${String(Number((tipo * 100).toFixed(2))).replace('.', ',')} %`;

function Elegir<T extends string>({
  opciones,
  valor,
  alElegir,
  nombre,
}: {
  readonly opciones: readonly { readonly valor: T; readonly texto: string }[];
  readonly valor: T;
  readonly alElegir: (v: T) => void;
  readonly nombre: string;
}) {
  return (
    <div role="radiogroup" aria-label={nombre} className="flex flex-wrap gap-e1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => {
            alElegir(o.valor);
          }}
          className={clases(
            'min-h-toque rounded-medio border px-e3 text-secundario font-medium',
            valor === o.valor
              ? 'border-naranja bg-naranja-suave text-texto'
              : 'border-borde bg-superficie text-texto-suave',
          )}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function HacerFactura({
  cliente,
  tickets: ticketsDeSalida,
  puedeAMano,
  puedeTodo,
  alHecha,
}: {
  readonly cliente: ClienteDeFacturas;
  /** Con tickets, la de esos tickets. Sin ellos, a mano. */
  readonly tickets: readonly TicketParaFacturar[] | null;
  readonly puedeAMano: boolean;
  readonly puedeTodo: boolean;
  readonly alHecha: (documentoId: string, correoNoSalio: boolean) => void;
}) {
  const aMano = ticketsDeSalida === null;
  const [tickets, setTickets] = useState<readonly TicketParaFacturar[]>(ticketsDeSalida ?? []);
  const [anadiendo, setAnadiendo] = useState(false);
  // El cliente.
  const [clase, setClase] = useState<ClaseDeCliente>('empresa');
  const [identificador, setIdentificador] = useState('');
  const [nombre, setNombre] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigoPais, setCodigoPais] = useState('DE');
  const [idTipo, setIdTipo] = useState<'02' | '03'>('02');
  const [comprobado, setComprobado] = useState<Comprobado | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const [buscar, setBuscar] = useState('');
  const buscado = usarConPausa(buscar.trim());
  // La factura a mano.
  const [conceptos, setConceptos] = useState<readonly UnConcepto[]>([]);
  const [fecha, setFecha] = useState('');
  const [cobrada, setCobrada] = useState(true);
  const [vence, setVence] = useState('');
  const [libre, setLibre] = useState<{
    nombre: string;
    importe: Centimos | null;
    tipo: number;
  } | null>(null);
  const [delaCarta, setDelaCarta] = useState(false);
  const [buscarPlato, setBuscarPlato] = useState('');
  // Hacerla.
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const guardados = usarLectura<readonly Guardado[]>(
    () =>
      puedeAMano
        ? cliente.consultar('los_clientes_de_factura', buscado === '' ? {} : { buscar: buscado })
        : Promise.resolve({ ok: true, datos: [] }),
    `clientes|${buscado}|${String(puedeAMano)}`,
  );
  const lo = usarLectura<LoDeLaFactura | null>(
    () =>
      aMano
        ? cliente.consultar('lo_que_se_puede_facturar')
        : Promise.resolve({ ok: true, datos: null }),
    `lo|${String(aMano)}`,
  );
  const datos = lo.datos ?? null;

  const totalDeTickets = tickets.reduce((s, t) => s + t.total, 0);
  const lineasParaVer: LineaVendida[] = useMemo(
    () => conceptos.map((c) => ({ ...c, regimen: 'iva' as const })),
    [conceptos],
  );
  const desglose = lineasParaVer.length === 0 ? null : elDesglose(lineasParaVer);
  const hoy = (datos?.hoy ?? '') as FechaOperativa;
  const plazo =
    aMano && fecha !== '' && hoy !== ''
      ? elPlazoDeLaFactura(fecha as FechaOperativa, hoy, clase)
      : null;

  function elegirGuardado(g: Guardado) {
    setClase(g.clase);
    setIdentificador(g.identificador);
    setNombre(g.nombre);
    setDomicilio(g.domicilio);
    setCorreo(g.correo ?? '');
    if (g.codigoPais !== null) setCodigoPais(g.codigoPais);
    if (g.idTipo !== null) setIdTipo(g.idTipo);
    setComprobado({ vale: true, dice: null, nombre: g.nombre, domicilio: null, correo: null });
    setBuscar('');
  }

  async function comprobar() {
    if (identificador.trim() === '') return;
    if (clase === 'de_fuera' && idTipo === '03') {
      setComprobado(null);
      return;
    }
    setComprobando(true);
    const r = await cliente.ejecutar<Comprobado>('comprobar_al_cliente', {
      clase,
      identificador,
      ...(nombre.trim() === '' ? {} : { nombre }),
      ...(clase === 'de_fuera' ? { id_tipo: idTipo, codigo_pais: codigoPais } : {}),
    });
    setComprobando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setComprobado(r.datos);
    if (r.datos.nombre !== null) setNombre(r.datos.nombre);
    if (r.datos.domicilio !== null && domicilio === '') setDomicilio(r.datos.domicilio);
    if (r.datos.correo !== null && correo === '') setCorreo(r.datos.correo);
  }

  const elCliente = {
    clase,
    nombre,
    identificador,
    domicilio,
    ...(clase === 'de_fuera' ? { id_tipo: idTipo, codigo_pais: codigoPais } : {}),
  };

  async function hacer() {
    setHaciendo(true);
    setError(null);
    const conCorreo = correo.trim() === '' ? {} : { correo: correo.trim() };
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
          ...conCorreo,
        })
      : await cliente.ejecutar<{ documentoId: string }>('hacer_factura_de_tickets', {
          ticket_ids: tickets.map((t) => t.id),
          cliente: elCliente,
          ...conCorreo,
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

  const faltaCliente =
    identificador.trim() === '' || nombre.trim() === '' || domicilio.trim().length < 5;
  const noVale = comprobado !== null && !comprobado.vale;
  const faltaAlgo =
    faltaCliente ||
    noVale ||
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

      <section aria-label="Para quién" className="flex flex-col gap-e3">
        <p className="text-cuerpo font-semibold">Para quién</p>
        {puedeAMano && (
          <>
            <Campo
              etiqueta="Busca un cliente"
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
              }}
            />
            {(guardados.datos ?? []).length > 0 && (
              <ul className="flex flex-col gap-e1">
                {(guardados.datos ?? []).slice(0, 5).map((g) => (
                  <li key={g.id} className="flex items-center gap-e2">
                    <button
                      type="button"
                      onClick={() => {
                        elegirGuardado(g);
                      }}
                      className={clases(
                        'min-h-toque min-w-0 flex-1 rounded-medio border px-e3 py-e1 text-left',
                        identificador === g.identificador
                          ? 'border-naranja bg-naranja-suave'
                          : 'border-borde bg-superficie',
                      )}
                    >
                      <span className="block truncate text-secundario font-medium">{g.nombre}</span>
                      <span className="block truncate text-etiqueta text-texto-suave">
                        {g.identificador} · {g.domicilio}
                      </span>
                    </button>
                    <Boton
                      tono="secundario"
                      onClick={() => {
                        void cliente
                          .ejecutar('quitar_el_cliente', { cliente_id: g.id })
                          .then(() => guardados.otraVez());
                      }}
                    >
                      Quitar
                    </Boton>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <Elegir
          nombre="Qué es el cliente"
          opciones={EN_CADA_CLASE}
          valor={clase}
          alElegir={(c) => {
            setClase(c);
            setComprobado(null);
          }}
        />

        {clase === 'particular' && (
          <Campo
            etiqueta="Nombre y apellidos"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
            }}
          />
        )}
        {clase === 'de_fuera' && (
          <div className="grid gap-e3 sm:grid-cols-2">
            <Selector
              etiqueta="País"
              opciones={PAISES.map((p) => ({ valor: p.valor, texto: p.texto }))}
              value={codigoPais}
              onChange={(e) => {
                setCodigoPais(e.target.value);
                if (!DE_LA_UNION.has(e.target.value)) setIdTipo('03');
                setComprobado(null);
              }}
            />
            <div className="flex flex-col gap-e1">
              <p className="text-secundario font-medium text-texto-suave">Con qué</p>
              <Elegir
                nombre="Con qué se identifica"
                opciones={
                  DE_LA_UNION.has(codigoPais)
                    ? [
                        { valor: '02' as const, texto: 'N.º de IVA' },
                        { valor: '03' as const, texto: 'Pasaporte' },
                      ]
                    : [{ valor: '03' as const, texto: 'Pasaporte' }]
                }
                valor={idTipo}
                alElegir={(v) => {
                  setIdTipo(v);
                  setComprobado(null);
                }}
              />
            </div>
          </div>
        )}
        <Campo
          etiqueta={
            clase === 'empresa'
              ? 'NIF'
              : clase === 'particular'
                ? 'DNI o NIE'
                : idTipo === '02'
                  ? 'Número de IVA'
                  : 'Pasaporte'
          }
          value={identificador}
          onChange={(e) => {
            setIdentificador(e.target.value);
            setComprobado(null);
          }}
          onBlur={() => {
            void comprobar();
          }}
          {...(comprobado !== null && !comprobado.vale && comprobado.dice !== null
            ? { error: comprobado.dice }
            : comprobado?.dice != null
              ? { ayuda: `✓ ${comprobado.dice}` }
              : comprobando
                ? { ayuda: 'Mirando en Hacienda…' }
                : {})}
        />
        {clase !== 'particular' && (
          <Campo
            etiqueta={clase === 'empresa' ? 'Nombre o razón social' : 'Nombre'}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
            }}
            {...(clase === 'empresa' ? { ayuda: 'Sale de Hacienda al escribir el NIF.' } : {})}
          />
        )}
        <Campo
          etiqueta="Domicilio"
          value={domicilio}
          onChange={(e) => {
            setDomicilio(e.target.value);
          }}
        />
      </section>

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
                  setLibre({ nombre: '', importe: null, tipo: datos.tipos[0] ?? 0 });
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
                      valor={String(libre.tipo)}
                      alElegir={(v) => {
                        setLibre({ ...libre, tipo: Number(v) });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Boton
                    tono="secundario"
                    disabled={libre.nombre.trim() === '' || libre.importe === null}
                    onClick={() => {
                      if (libre.importe === null) return;
                      setConceptos((ya) => [
                        ...ya,
                        {
                          clave: crypto.randomUUID(),
                          nombre: libre.nombre.trim(),
                          cantidad: 1,
                          unidad: libre.importe ?? 0,
                          importe: libre.importe ?? 0,
                          tipo: libre.tipo,
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
