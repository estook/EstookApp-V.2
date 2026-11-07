import { useState } from 'react';
import {
  MOTIVO_DE_DEVOLUCION,
  importeDelDocumento,
  laDevolucion,
  type Centimos,
  type ElDestinatario,
  type LoQueQuedaDeUnaLinea,
  type LoQueSePideDevolver,
  type MotivoDeDevolucion,
} from '@estook/dominio';
import { Aviso, ErrorEnCristiano, type ErrorDeLaApi } from '../Aviso.tsx';
import { Boton } from '../Boton.tsx';
import { Campo, CampoMoneda } from '../Campo.tsx';
import { clases } from '../../clases.ts';
import { usarLectura, type ClienteDeFacturas } from '../../ganchos/usarLectura.ts';
import { usarElCliente } from '../../ganchos/usarElCliente.ts';
import { Elegir, ParaQuien } from './ElClienteDeLaFactura.tsx';

/**
 * **Lo que se hace sobre un documento** (T6 · 2 · 2 · 2, decisión 0140; maquetas de T6, 5, y de
 * T6 · 2 · 2, 4 y 5). Siempre con otro documento, nunca tocando el que había: no hay botón de editar.
 * Lo que sale en cada una es lo mismo que emite la API (`laDevolucion`, de `@estook/dominio`).
 */

/** Lo que estas pantallas necesitan del documento: la API lo da en `un_documento`. */
export interface DocumentoParaCorregir {
  readonly id: string;
  readonly numero: string;
  readonly tipo: string;
  readonly total: number;
  readonly queda: number;
  readonly lineas: readonly LoQueQuedaDeUnaLinea[];
  readonly destinatario: ElDestinatario | null;
  readonly loQueFalla: { readonly que: string; readonly hacer: string } | null;
}

type AlHecho = (documentoId: string) => void;

const LOS_MOTIVOS = (Object.keys(MOTIVO_DE_DEVOLUCION) as MotivoDeDevolucion[]).map((valor) => ({
  valor,
  texto: MOTIVO_DE_DEVOLUCION[valor],
}));

const LO_QUE_SE_ELIGE = [
  { valor: 'todo' as const, texto: 'Todo' },
  { valor: 'partes' as const, texto: 'Solo algunos' },
];

// ── Devolver ──────────────────────────────────────────────────────────────────────

/** Una línea con su casilla y, si hay más de una, cuántas: «1 de 2». */
function UnaLinea({
  linea,
  cuantas,
  soloDinero,
  alCambiar,
}: {
  readonly linea: LoQueQuedaDeUnaLinea;
  /** Cuántas se devuelven. 0, si no está marcada. */
  readonly cuantas: number;
  readonly soloDinero: boolean;
  readonly alCambiar: (cuantas: number) => void;
}) {
  const marcada = cuantas > 0;
  return (
    <li
      className={clases(
        'flex min-h-toque items-center gap-e2 rounded-medio border px-e3 py-e1',
        marcada ? 'border-naranja bg-naranja-suave' : 'border-borde bg-superficie',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={marcada}
        aria-label={`Devolver ${linea.nombre}`}
        onClick={() => {
          alCambiar(marcada ? 0 : linea.cantidad);
        }}
        className="flex min-h-toque min-w-0 flex-1 items-center gap-e2 text-left"
      >
        <span
          aria-hidden
          className={clases(
            'grid size-5 shrink-0 place-items-center rounded-medio border text-etiqueta',
            marcada ? 'border-naranja bg-naranja text-superficie' : 'border-borde',
          )}
        >
          {marcada ? '✓' : ''}
        </span>
        <span className="min-w-0 truncate text-secundario">
          {linea.cantidad > 1 && !marcada ? `${String(linea.cantidad)} ` : ''}
          {linea.nombre}
        </span>
      </button>
      {marcada && !soloDinero && linea.cantidad > 1 && (
        <span className="flex shrink-0 items-center gap-e1 text-secundario">
          <input
            aria-label={`Cuántos de ${linea.nombre}`}
            type="number"
            min={1}
            max={linea.cantidad}
            value={cuantas}
            onChange={(e) => {
              const n = Math.floor(Number(e.target.value)) || 1;
              alCambiar(Math.min(Math.max(n, 1), linea.cantidad));
            }}
            className="w-14 rounded-medio border border-borde bg-superficie px-e1 text-center tabular-nums"
          />
          <span className="text-texto-suave">de {linea.cantidad}</span>
        </span>
      )}
      <span className="shrink-0 tabular-nums text-secundario">
        {importeDelDocumento(linea.importe)}
      </span>
    </li>
  );
}

export function Devolver({
  cliente,
  documento,
  alHecho,
}: {
  readonly cliente: ClienteDeFacturas;
  readonly documento: DocumentoParaCorregir;
  readonly alHecho: AlHecho;
}) {
  const [que, setQue] = useState<'todo' | 'partes'>('todo');
  const [motivo, setMotivo] = useState<MotivoDeDevolucion>('mal_hecho');
  const [detalle, setDetalle] = useState('');
  const [cuantas, setCuantas] = useState<Readonly<Record<number, number>>>({});
  const [deMas, setDeMas] = useState<Centimos | null>(null);
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const conAlgo = documento.lineas.filter((l) => l.importe > 0 && l.cantidad > 0);
  const esDeMas = motivo === 'de_mas';
  const marcadas = Object.entries(cuantas)
    .filter(([, n]) => n > 0)
    .map(([linea, cantidad]) => ({ linea: Number(linea), cantidad }));

  const pedida: LoQueSePideDevolver | null = esDeMas
    ? marcadas[0] === undefined || deMas === null
      ? null
      : { que: 'de_mas', linea: marcadas[0].linea, importe: deMas }
    : que === 'todo'
      ? { que: 'todo' }
      : marcadas.length === 0
        ? null
        : { que: 'partes', partes: marcadas };
  const sale = pedida === null ? null : laDevolucion(documento.lineas, pedida);
  const total = sale !== null && 'total' in sale ? sale.total : 0;
  const faltaElMotivo = motivo === 'otro' && detalle.trim() === '';

  async function devolver() {
    if (pedida === null) return;
    setHaciendo(true);
    setError(null);
    const r = await cliente.ejecutar<{ documentoId: string }>('devolver_el_documento', {
      documento_id: documento.id,
      que: pedida.que,
      ...(pedida.que === 'partes' ? { partes: pedida.partes } : {}),
      ...(pedida.que === 'de_mas' ? { linea: pedida.linea, importe: pedida.importe } : {}),
      motivo,
      ...(motivo === 'otro' ? { detalle: detalle.trim() } : {}),
    });
    setHaciendo(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    alHecho(r.datos.documentoId);
  }

  return (
    <div className="flex flex-col gap-e4">
      <p className="text-secundario text-texto-suave">
        De {documento.numero}. Queda {importeDelDocumento(documento.queda)}.
      </p>
      {!esDeMas && (
        <div className="flex flex-col gap-e2">
          <p className="text-cuerpo font-semibold">¿Qué se devuelve?</p>
          <Elegir
            nombre="Qué se devuelve"
            opciones={LO_QUE_SE_ELIGE}
            valor={que}
            alElegir={setQue}
          />
        </div>
      )}
      {(esDeMas || que === 'partes') && (
        <ul className="flex flex-col gap-e1">
          {conAlgo.map((l) => (
            <UnaLinea
              key={l.indice}
              linea={l}
              cuantas={cuantas[l.indice] ?? 0}
              soloDinero={esDeMas}
              alCambiar={(n) => {
                // Lo cobrado de más es de una línea: tocar otra cambia a esa.
                setCuantas((ya) => (esDeMas ? { [l.indice]: n } : { ...ya, [l.indice]: n }));
              }}
            />
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-e2">
        <p className="text-cuerpo font-semibold">Por qué</p>
        <Elegir
          nombre="Por qué se devuelve"
          opciones={LOS_MOTIVOS}
          valor={motivo}
          alElegir={(m) => {
            setMotivo(m);
            if (m === 'de_mas') {
              // Solo una línea: la primera marcada, si había.
              const primera = marcadas[0];
              setCuantas(primera === undefined ? {} : { [primera.linea]: primera.cantidad });
            }
          }}
        />
        {motivo === 'otro' && (
          <Campo
            etiqueta="Cuál"
            value={detalle}
            onChange={(e) => {
              setDetalle(e.target.value);
            }}
          />
        )}
      </div>
      {esDeMas && <CampoMoneda etiqueta="¿Cuánto de más?" valor={deMas} alCambiar={setDeMas} />}
      {sale !== null && 'porque' in sale && (
        <Aviso tono="atencion" titulo="Así no se puede">
          {sale.porque}
        </Aviso>
      )}
      <div className="flex flex-col gap-e1 rounded-grande border border-borde bg-superficie p-e3">
        <span className="text-secundario text-texto-suave">Se le devuelve</span>
        <span className="text-titulo font-bold tabular-nums">{importeDelDocumento(total)}</span>
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}
      <Boton
        tono="principal"
        disabled={total <= 0 || faltaElMotivo}
        cargando={haciendo}
        textoCargando="Devolviendo"
        onClick={() => {
          void devolver();
        }}
      >
        Devolver {importeDelDocumento(total)}
      </Boton>
      <p className="text-etiqueta text-texto-suave">
        Sale una devolución con su número, y queda quién la hizo y por qué. La caja no se mueve.
      </p>
    </div>
  );
}

// ── Corregir los datos del cliente ────────────────────────────────────────────────

export function CorregirLosDatos({
  cliente,
  documento,
  alHecho,
}: {
  readonly cliente: ClienteDeFacturas;
  readonly documento: DocumentoParaCorregir;
  readonly alHecho: AlHecho;
}) {
  const c = usarElCliente(cliente, documento.destinatario);
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const d = documento.destinatario;
  const igual =
    d !== null &&
    d.identificador === c.identificador.replace(/\s+/g, '').toUpperCase() &&
    d.nombre === c.nombre.trim() &&
    d.domicilio === c.domicilio.trim();

  async function corregir() {
    setHaciendo(true);
    setError(null);
    const r = await cliente.ejecutar<{ documentoId: string }>('corregir_los_datos', {
      documento_id: documento.id,
      cliente: c.elCliente,
    });
    setHaciendo(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    alHecho(r.datos.documentoId);
  }

  return (
    <div className="flex flex-col gap-e4">
      <p className="text-secundario text-texto-suave">
        De {documento.numero}. Para cuando el cliente dice que su domicilio o su NIF estaban mal. El
        importe no cambia.
      </p>
      <ParaQuien c={c} />
      {error !== null && <ErrorEnCristiano error={error} />}
      {c.errorAlComprobar !== null && <ErrorEnCristiano error={c.errorAlComprobar} />}
      <Boton
        tono="principal"
        disabled={c.faltaCliente || c.noVale || igual}
        cargando={haciendo}
        textoCargando="Haciéndola"
        onClick={() => {
          void corregir();
        }}
      >
        Hacer la factura corregida
      </Boton>
      <p className="text-etiqueta text-texto-suave">
        Sale otra con su número, que sustituye a esta. Esta se queda donde estaba, marcada
        «Corregida».
      </p>
    </div>
  );
}

// ── Anular ────────────────────────────────────────────────────────────────────────

export function Anular({
  cliente,
  documento,
  alHecho,
}: {
  readonly cliente: ClienteDeFacturas;
  readonly documento: DocumentoParaCorregir;
  readonly alHecho: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function anular() {
    setHaciendo(true);
    setError(null);
    const r = await cliente.ejecutar('anular_el_documento', {
      documento_id: documento.id,
      motivo: motivo.trim(),
    });
    setHaciendo(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    alHecho();
  }

  return (
    <div className="flex flex-col gap-e4">
      <Aviso tono="mal" titulo="Anular es solo para lo que nunca debió existir">
        Por ejemplo, un ticket que salió dos veces y el cliente no se llevó.{' '}
        <strong>Si el cliente lo tiene, se devuelve</strong>, no se anula.
      </Aviso>
      <Campo
        etiqueta="Por qué lo anulas"
        value={motivo}
        onChange={(e) => {
          setMotivo(e.target.value);
        }}
      />
      {error !== null && <ErrorEnCristiano error={error} />}
      <Boton
        tono="peligro"
        disabled={motivo.trim().length < 3}
        cargando={haciendo}
        textoCargando="Anulando"
        onClick={() => {
          void anular();
        }}
      >
        Anular {documento.numero}
      </Boton>
      <p className="text-etiqueta text-texto-suave">
        El número no se vuelve a usar. Queda en la lista como «Anulado», con quién y por qué.
      </p>
    </div>
  );
}

// ── Lo que rechazó Hacienda ───────────────────────────────────────────────────────

export function CorregirLoRechazado({
  cliente,
  documento,
  alHecho,
}: {
  readonly cliente: ClienteDeFacturas;
  readonly documento: DocumentoParaCorregir;
  readonly alHecho: AlHecho;
}) {
  const c = usarElCliente(cliente, documento.destinatario);
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const conCliente = documento.destinatario !== null;

  async function corregir() {
    setHaciendo(true);
    setError(null);
    const r = await cliente.ejecutar<{ documentoId: string }>('corregir_lo_rechazado', {
      documento_id: documento.id,
      ...(conCliente ? { cliente: c.elCliente } : {}),
    });
    setHaciendo(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    alHecho(r.datos.documentoId);
  }

  return (
    <div className="flex flex-col gap-e4">
      {documento.loQueFalla !== null && (
        <Aviso tono="mal" titulo={documento.numero}>
          {documento.loQueFalla.que}
        </Aviso>
      )}
      {conCliente && <ParaQuien c={c} />}
      {error !== null && <ErrorEnCristiano error={error} />}
      {c.errorAlComprobar !== null && <ErrorEnCristiano error={c.errorAlComprobar} />}
      <Boton
        tono="principal"
        disabled={conCliente && (c.faltaCliente || c.noVale)}
        cargando={haciendo}
        textoCargando="Haciéndolo"
        onClick={() => {
          void corregir();
        }}
      >
        {conCliente ? 'Hacer la factura corregida' : 'Volver a emitirlo'}
      </Boton>
      <p className="text-etiqueta text-texto-suave">
        Sale otro igual con otro número. Este no se borra, y su número queda usado.
      </p>
    </div>
  );
}

// ── La señal ──────────────────────────────────────────────────────────────────────

interface LosTipos {
  readonly tipos: readonly number[];
  readonly tipoDeLaCarta: number | null;
  readonly impuesto: string;
}

const porciento = (tipo: number) =>
  `${String(Number((tipo * 100).toFixed(2))).replace('.', ',')} %`;

/** **La factura de la señal** (maqueta de T6 · 2 · 2, 4): se factura el día que se cobra. */
export function HacerSenal({
  cliente,
  alHecho,
}: {
  readonly cliente: ClienteDeFacturas;
  readonly alHecho: (documentoId: string, correoNoSalio: boolean) => void;
}) {
  const c = usarElCliente(cliente);
  const lo = usarLectura<LosTipos>(() => cliente.consultar('lo_que_se_puede_facturar'), 'senal');
  const [paraQue, setParaQue] = useState('');
  const [importe, setImporte] = useState<Centimos | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const tipos = lo.datos?.tipos ?? [];
  const elTipo = tipo ?? (lo.datos?.tipoDeLaCarta == null ? null : String(lo.datos.tipoDeLaCarta));

  async function hacer() {
    if (importe === null || elTipo === null) return;
    setHaciendo(true);
    setError(null);
    const r = await cliente.ejecutar<{ documentoId: string }>('hacer_factura_de_senal', {
      cliente: c.elCliente,
      para_que: paraQue.trim(),
      importe,
      tipo: Number(elTipo),
    });
    if (!r.ok) {
      setHaciendo(false);
      setError(r.error);
      return;
    }
    let correoNoSalio = false;
    if (c.correo.trim() !== '') {
      const mandado = await cliente.ejecutar('mandar_el_documento', {
        documento_id: r.datos.documentoId,
        para: c.correo.trim(),
      });
      correoNoSalio = !mandado.ok;
    }
    setHaciendo(false);
    alHecho(r.datos.documentoId, correoNoSalio);
  }

  return (
    <div className="flex flex-col gap-e4">
      <ParaQuien c={c} />
      <Campo
        etiqueta="Para qué es"
        value={paraQue}
        onChange={(e) => {
          setParaQue(e.target.value);
        }}
      />
      <div className="grid gap-e3 sm:grid-cols-2">
        <CampoMoneda
          etiqueta={`Cobrado, con ${lo.datos?.impuesto ?? 'IVA'}`}
          valor={importe}
          alCambiar={setImporte}
        />
        <div className="flex flex-col gap-e1">
          <p className="text-secundario font-medium text-texto-suave">
            {lo.datos?.impuesto ?? 'IVA'}
          </p>
          <Elegir
            nombre="Qué impuesto lleva"
            opciones={tipos.map((t) => ({ valor: String(t), texto: porciento(t) }))}
            valor={elTipo ?? ''}
            alElegir={setTipo}
          />
        </div>
      </div>
      <Campo
        etiqueta="Correo, para mandársela (si quiere)"
        tipo="correo"
        value={c.correo}
        onChange={(e) => {
          c.setCorreo(e.target.value);
        }}
      />
      {error !== null && <ErrorEnCristiano error={error} />}
      {c.errorAlComprobar !== null && <ErrorEnCristiano error={c.errorAlComprobar} />}
      <Boton
        tono="principal"
        disabled={
          c.faltaCliente ||
          c.noVale ||
          paraQue.trim().length < 3 ||
          importe === null ||
          importe <= 0 ||
          elTipo === null
        }
        cargando={haciendo}
        textoCargando="Haciéndola"
        onClick={() => {
          void hacer();
        }}
      >
        Hacer la factura de la señal
      </Boton>
      <p className="text-etiqueta text-texto-suave">
        Queda como «Señal», cobrada hoy. La factura final de ese cliente la descuenta sola.
      </p>
    </div>
  );
}
