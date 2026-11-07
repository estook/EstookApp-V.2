import { useState } from 'react';
import {
  direccionParaPedirLaFactura,
  importeDelDocumento,
  type ElDestinatario,
  type LoQueQuedaDeUnaLinea,
  type PapelCompuesto,
  type TipoDeDocumento,
} from '@estook/dominio';
import { Aviso, ErrorEnCristiano, type ErrorDeLaApi } from '../Aviso.tsx';
import { Boton } from '../Boton.tsx';
import { Campo } from '../Campo.tsx';
import { Cargando } from '../Cargando.tsx';
import { EstadoVacio } from '../EstadoVacio.tsx';
import { Etiqueta } from '../Tarjeta.tsx';
import { Hoja } from '../Hoja.tsx';
import { Tabla, type Columna } from '../Tabla.tsx';
import { PapelEnPantalla } from '../PapelEnPantalla.tsx';
import { clases } from '../../clases.ts';
import {
  Anular,
  CorregirLoRechazado,
  CorregirLosDatos,
  Devolver,
  HacerSenal,
} from './CorregirDocumento.tsx';
import { HacerFactura, type TicketParaFacturar } from './HacerFactura.tsx';
import { usarConPausa, usarLectura, type ClienteDeFacturas } from '../../ganchos/usarLectura.ts';

/**
 * **Tickets y facturas** (T6 · 2 · 1 y 2 · 2 · 1, decisiones 0136 y 0137). La misma pantalla en
 * Servicio › Ventas de Estook y en Estook TPV. Lo que alguien tiene que mirar sale **arriba y en
 * llano, sea del día que sea**. Debajo, la lista. Al tocar uno, como se imprimió, su historia y lo
 * que se puede hacer. **Nada se edita**; quien no puede una cosa no ve su botón, y la API lo mira
 * igual.
 */

type Tono = 'bien' | 'info' | 'mal' | 'atencion' | 'neutro';

interface UnoDeLaLista extends TicketParaFacturar {
  readonly hora: string;
  readonly tipo: TipoDeDocumento;
  readonly que: string;
  readonly cliente: string | null;
  readonly estado: string;
  readonly chapa: { readonly texto: string; readonly tono: Tono };
  readonly pruebas: boolean;
  readonly justificante: string | null;
  readonly porCobrar: string | null;
  readonly pedidaPorElCliente: boolean;
}

interface LoQueFalla {
  readonly id: string;
  readonly numero: string;
  readonly que: string;
  readonly hacer: string;
  /** Si lo rechazó Hacienda: se corrige con otro documento, y sale el botón. */
  readonly seCorrige: boolean;
}

interface LoQuePuede {
  readonly todo: boolean;
  readonly deUnTicket: boolean;
  readonly aMano: boolean;
  readonly corregir: boolean;
}

interface OtroDocumento {
  readonly id: string;
  readonly numero: string;
}

interface LaLista {
  readonly desde: string;
  readonly hasta: string;
  readonly documentos: readonly UnoDeLaLista[];
  readonly loQueFalla: readonly LoQueFalla[];
  readonly tardan: number;
  readonly cuantos: number;
  readonly total: number;
  readonly correctos: number;
  readonly enPruebas: boolean;
  readonly puede: LoQuePuede;
}

interface UnDocumento extends UnoDeLaLista {
  readonly historia: readonly {
    readonly hora: string;
    readonly que: string;
    readonly detalle: string | null;
  }[];
  readonly papel: PapelCompuesto | null;
  readonly url: string | null;
  readonly loQueFalla: LoQueFalla | null;
  readonly factura: OtroDocumento | null;
  readonly sustituye: readonly OtroDocumento[];
  readonly seEntrega: boolean;
  readonly puede: LoQuePuede;
  readonly destinatario: ElDestinatario | null;
  readonly sePuede: {
    readonly devolver: boolean;
    readonly corregirDatos: boolean;
    readonly anular: boolean;
    readonly corregirLoRechazado: boolean;
  };
  readonly lineas: readonly LoQueQuedaDeUnaLinea[];
  readonly queda: number;
  readonly rectifica: OtroDocumento | null;
  readonly corregidaPor: OtroDocumento | null;
  readonly devoluciones: readonly (OtroDocumento & { readonly total: number })[];
  readonly anulado: { readonly quien: string | null; readonly motivo: string } | null;
  readonly anulacionQueNoSalio: { readonly dice: string | null } | null;
  readonly descuenta: readonly (OtroDocumento & { readonly importe: number })[];
  readonly descontadaEn: OtroDocumento | null;
  readonly codigoParaPedirla: string | null;
  readonly correoDelClienteNoSalio: boolean;
}

type Que = 'todos' | 'tickets' | 'facturas' | 'devoluciones' | 'por_cobrar' | 'pendiente';
type Cuando = 'hoy' | 'ayer' | 'fechas';

const LOS_DIAS: readonly { readonly valor: Cuando; readonly texto: string }[] = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'ayer', texto: 'Ayer' },
];
const LO_QUE_SE_FILTRA: readonly { readonly valor: Que; readonly texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'tickets', texto: 'Tickets' },
  { valor: 'facturas', texto: 'Facturas' },
  { valor: 'devoluciones', texto: 'Devoluciones' },
  { valor: 'por_cobrar', texto: 'Por cobrar' },
  { valor: 'pendiente', texto: 'Con algo pendiente' },
];

type Abierta =
  | { readonly que: 'documento'; readonly id: string; readonly correoNoSalio?: boolean }
  | { readonly que: 'factura'; readonly tickets: readonly TicketParaFacturar[] | null }
  | { readonly que: 'senal' }
  | { readonly que: 'devolver' | 'corregir' | 'anular' | 'rechazado'; readonly id: string }
  | null;

const LOS_TITULOS = {
  documento: 'El documento',
  senal: 'Factura de la señal',
  devolver: 'Devolver',
  corregir: 'Corregir los datos del cliente',
  anular: 'Anular',
  rechazado: 'Corregir',
} as const;

function UnFiltro({
  elegido,
  alPulsar,
  children,
}: {
  readonly elegido: boolean;
  readonly alPulsar: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={elegido}
      onClick={alPulsar}
      className={clases(
        'min-h-toque rounded-redondo border px-e3 text-secundario',
        elegido
          ? 'border-naranja bg-naranja-suave font-medium text-texto'
          : 'border-borde bg-superficie text-texto-suave',
      )}
    >
      {children}
    </button>
  );
}

export function TicketsYFacturas({
  cliente,
  conLaImpresora,
}: {
  readonly cliente: ClienteDeFacturas;
  /** En Estook TPV hay impresora al lado: imprimir va primero. */
  readonly conLaImpresora?: boolean;
}) {
  const [cuando, setCuando] = useState<Cuando>('hoy');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [que, setQue] = useState<Que>('todos');
  const [buscar, setBuscar] = useState('');
  const buscado = usarConPausa(buscar.trim());
  const [abierta, setAbierta] = useState<Abierta>(null);
  const conFechas = cuando === 'fechas' && desde !== '' && hasta !== '';
  const parametros: Record<string, string> = {
    ...(cuando === 'ayer' ? { dia: 'ayer' } : {}),
    ...(conFechas ? { desde, hasta } : {}),
    ...(que === 'todos' ? {} : { que }),
    ...(buscado === '' ? {} : { buscar: buscado }),
  };
  const lista = usarLectura<LaLista>(
    () => cliente.consultar('tickets_y_facturas', parametros),
    JSON.stringify(parametros),
    // Lo que está «Enviando» cambia solo: se vuelve a mirar cada medio minuto.
    30_000,
  );

  if (lista.cargando && lista.datos === undefined) {
    return <Cargando que="los tickets y las facturas" lineas={4} />;
  }
  if (lista.datos === undefined) {
    return lista.error === null ? null : <ErrorEnCristiano error={lista.error} />;
  }

  const l = lista.datos;
  const columnas: readonly Columna<UnoDeLaLista>[] = [
    {
      clave: 'hora',
      titulo: 'Hora',
      celda: (d) => (
        <span className="tabular-nums">
          {conFechas ? `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)} ` : ''}
          {d.hora}
        </span>
      ),
    },
    {
      clave: 'numero',
      titulo: 'Número',
      principal: true,
      celda: (d) => (
        <span className="font-medium tabular-nums">
          {d.justificante !== null && d.chapa.texto === 'Se emite al volver'
            ? `Justificante ${d.justificante}`
            : d.numero}
        </span>
      ),
    },
    { clave: 'que', titulo: 'Qué es', celda: (d) => d.que },
    { clave: 'donde', titulo: 'Cliente o dónde', celda: (d) => d.cliente ?? d.donde ?? '—' },
    {
      clave: 'total',
      titulo: 'Total',
      numerica: true,
      celda: (d) => <span className="tabular-nums">{importeDelDocumento(d.total)}</span>,
    },
    {
      clave: 'hacienda',
      titulo: 'Hacienda',
      celda: (d) => (
        <span className="flex flex-wrap gap-e1">
          <Etiqueta tono={d.chapa.tono}>{d.chapa.texto}</Etiqueta>
          {d.porCobrar !== null && <Etiqueta tono="atencion">Por cobrar</Etiqueta>}
          {d.pedidaPorElCliente && <Etiqueta tono="info">Pedida por el cliente</Etiqueta>}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-e4">
      {l.puede.aMano && (
        <div className="flex flex-wrap justify-end gap-e2">
          <Boton
            tono="secundario"
            onClick={() => {
              setAbierta({ que: 'senal' });
            }}
          >
            Factura de una señal
          </Boton>
          <Boton
            tono="principal"
            onClick={() => {
              setAbierta({ que: 'factura', tickets: null });
            }}
          >
            Hacer una factura
          </Boton>
        </div>
      )}

      {l.loQueFalla.map((f) => (
        <Aviso
          key={f.id}
          tono="mal"
          titulo={f.numero}
          accion={
            <span className="flex flex-wrap gap-e2">
              {f.seCorrige && l.puede.corregir && (
                <Boton
                  tono="principal"
                  onClick={() => {
                    setAbierta({ que: 'rechazado', id: f.id });
                  }}
                >
                  Corregir
                </Boton>
              )}
              <Boton
                tono="secundario"
                onClick={() => {
                  setAbierta({ que: 'documento', id: f.id });
                }}
              >
                Ver el documento
              </Boton>
            </span>
          }
        >
          {f.que} <strong>Qué hacer:</strong> {f.hacer}
        </Aviso>
      ))}

      {l.tardan > 0 && (
        <Aviso
          tono="info"
          titulo={
            l.tardan === 1
              ? 'Un documento lleva más de un día sin que conteste Hacienda'
              : `${String(l.tardan)} documentos llevan más de un día sin que conteste Hacienda`
          }
        >
          Estook sigue preguntando solo. Si mañana sigue igual, escríbenos y lo miramos.
        </Aviso>
      )}

      <div className="grid grid-cols-3 gap-e3">
        <LaCifra valor={String(l.cuantos)} que={l.cuantos === 1 ? 'documento' : 'documentos'} />
        <LaCifra valor={importeDelDocumento(l.total)} que="en total" />
        <LaCifra
          valor={`${String(l.correctos)} de ${String(l.cuantos)}`}
          que="correctos en Hacienda"
        />
      </div>

      <Campo
        etiqueta={l.puede.todo ? 'Buscar por número, cliente o NIF' : 'Buscar por su número'}
        value={buscar}
        onChange={(e) => {
          setBuscar(e.target.value);
        }}
      />
      <div className="flex flex-wrap items-center gap-e2">
        {LOS_DIAS.map((d) => (
          <UnFiltro
            key={d.valor}
            elegido={cuando === d.valor}
            alPulsar={() => {
              setCuando(d.valor);
            }}
          >
            {d.texto}
          </UnFiltro>
        ))}
        {l.puede.todo && (
          <UnFiltro
            elegido={cuando === 'fechas'}
            alPulsar={() => {
              setCuando('fechas');
            }}
          >
            Elegir fechas
          </UnFiltro>
        )}
        <span aria-hidden className="mx-e1 text-texto-tenue">
          ·
        </span>
        {LO_QUE_SE_FILTRA.filter(
          (f) =>
            l.puede.todo ||
            f.valor === 'todos' ||
            f.valor === 'tickets' ||
            f.valor === 'facturas' ||
            f.valor === 'devoluciones',
        ).map((f) => (
          <UnFiltro
            key={f.valor}
            elegido={que === f.valor}
            alPulsar={() => {
              setQue(f.valor);
            }}
          >
            {f.texto}
          </UnFiltro>
        ))}
      </div>
      {cuando === 'fechas' && (
        <div className="grid max-w-md grid-cols-2 gap-e3">
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

      <Tabla
        titulo="Tickets y facturas"
        columnas={columnas}
        filas={l.documentos}
        claveDe={(d) => d.id}
        alPulsar={(d) => {
          setAbierta({ que: 'documento', id: d.id });
        }}
        nombreDeLaFila={(d) => d.numero}
        filaCompacta={(d) => (
          <div className="flex items-center justify-between gap-e3">
            <span className="min-w-0">
              <span className="block font-medium tabular-nums">{d.numero}</span>
              <span className="block text-secundario text-texto-suave">
                {d.hora} · {d.cliente ?? d.que} · {importeDelDocumento(d.total)}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-e1">
              <Etiqueta tono={d.chapa.tono}>{d.chapa.texto}</Etiqueta>
              {d.porCobrar !== null && <Etiqueta tono="atencion">Por cobrar</Etiqueta>}
            </span>
          </div>
        )}
        cuandoNoHay={
          <EstadoVacio
            compacto
            dibujo="facturas"
            titulo={buscar.trim() === '' ? 'Aquí no hay nada todavía' : 'No sale nada con eso'}
            frase={
              !l.puede.todo && buscar.trim() !== ''
                ? 'Escribe el número entero, como sale en el ticket.'
                : l.enPruebas
                  ? 'Hasta que cobres con Estook TPV, aquí salen los tickets de prueba y lo que hagas desde aquí.'
                  : 'Aquí sale cada ticket y cada factura, con lo que dice Hacienda.'
            }
          />
        }
      />

      {l.cuantos > l.documentos.length && (
        <p className="text-secundario text-texto-suave">
          Salen los {l.documentos.length} últimos de {l.cuantos}. Las cifras de arriba son de todos;
          para ver los demás, acorta las fechas.
        </p>
      )}

      {l.enPruebas && (
        <p className="text-etiqueta text-texto-suave">
          En pruebas: nada de esto llega a Hacienda de verdad, y cada papel lleva «PRUEBA · SIN
          VALIDEZ».
        </p>
      )}

      <Hoja
        abierta={abierta !== null}
        alCerrar={() => {
          setAbierta(null);
          void lista.otraVez();
        }}
        titulo={
          abierta === null
            ? LOS_TITULOS.documento
            : abierta.que === 'factura'
              ? abierta.tickets === null
                ? 'Hacer una factura'
                : 'Hacer factura'
              : LOS_TITULOS[abierta.que]
        }
        amplia
      >
        {abierta?.que === 'documento' && (
          <ElDocumento
            key={abierta.id}
            id={abierta.id}
            correoNoSalio={abierta.correoNoSalio === true}
            cliente={cliente}
            conLaImpresora={conLaImpresora === true}
            alAbrir={(id) => {
              setAbierta({ que: 'documento', id });
            }}
            alFacturar={(t) => {
              setAbierta({ que: 'factura', tickets: [t] });
            }}
            alCorregir={(que) => {
              setAbierta({ que, id: abierta.id });
            }}
          />
        )}
        {abierta?.que === 'senal' && (
          <HacerSenal
            cliente={cliente}
            alHecho={(id, correoNoSalio) => {
              setAbierta({ que: 'documento', id, correoNoSalio });
              void lista.otraVez();
            }}
          />
        )}
        {(abierta?.que === 'devolver' ||
          abierta?.que === 'corregir' ||
          abierta?.que === 'anular' ||
          abierta?.que === 'rechazado') && (
          <LoQueSeHaceSobreEl
            key={`${abierta.que}|${abierta.id}`}
            que={abierta.que}
            id={abierta.id}
            cliente={cliente}
            alHecho={(id) => {
              setAbierta({ que: 'documento', id });
              void lista.otraVez();
            }}
          />
        )}
        {abierta?.que === 'factura' && (
          <HacerFactura
            cliente={cliente}
            tickets={abierta.tickets}
            puedeTodo={l.puede.todo}
            alHecha={(id, correoNoSalio) => {
              setAbierta({ que: 'documento', id, correoNoSalio });
              void lista.otraVez();
            }}
          />
        )}
      </Hoja>
    </div>
  );
}

/** Devolver, corregir, anular o rehacer: lee el documento al abrirse y va a lo que sale. */
function LoQueSeHaceSobreEl({
  que,
  id,
  cliente,
  alHecho,
}: {
  readonly que: 'devolver' | 'corregir' | 'anular' | 'rechazado';
  readonly id: string;
  readonly cliente: ClienteDeFacturas;
  readonly alHecho: (id: string) => void;
}) {
  const doc = usarLectura<UnDocumento>(
    () => cliente.consultar('un_documento', { documento_id: id }),
    id,
  );
  if (doc.datos === undefined) {
    return doc.error === null ? (
      <Cargando que="el documento" lineas={3} />
    ) : (
      <ErrorEnCristiano error={doc.error} />
    );
  }
  const documento = doc.datos;
  if (que === 'devolver') {
    return <Devolver cliente={cliente} documento={documento} alHecho={alHecho} />;
  }
  if (que === 'corregir') {
    return <CorregirLosDatos cliente={cliente} documento={documento} alHecho={alHecho} />;
  }
  if (que === 'anular') {
    return (
      <Anular
        cliente={cliente}
        documento={documento}
        alHecho={() => {
          alHecho(id);
        }}
      />
    );
  }
  return <CorregirLoRechazado cliente={cliente} documento={documento} alHecho={alHecho} />;
}

/** Los documentos que van con este, para ir a ellos con un toque. Si no hay, no sale nada. */
function LosQueVan({
  titulo,
  documentos,
  alAbrir,
}: {
  readonly titulo: string;
  readonly documentos: readonly OtroDocumento[];
  readonly alAbrir: (id: string) => void;
}) {
  if (documentos.length === 0) return null;
  return (
    <div className="flex flex-col gap-e1">
      <p className="text-etiqueta font-semibold text-texto-suave">{titulo}</p>
      {documentos.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            alAbrir(t.id);
          }}
          className="min-h-toque text-left text-secundario tabular-nums text-info underline"
        >
          {t.numero}
        </button>
      ))}
    </div>
  );
}

function LaCifra({ valor, que }: { readonly valor: string; readonly que: string }) {
  return (
    <div className="rounded-grande border border-borde bg-superficie px-e3 py-e2">
      <p className="text-seccion font-semibold tabular-nums">{valor}</p>
      <p className="text-etiqueta text-texto-suave">{que}</p>
    </div>
  );
}

/** Baja un PDF que llega en base 64: se guarda donde el aparato guarda lo descargado. */
export function bajarElPdf(pdf: {
  readonly nombre: string;
  readonly tipo: string;
  readonly base64: string;
}) {
  const bytes = Uint8Array.from(atob(pdf.base64), (c) => c.charCodeAt(0));
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([bytes], { type: pdf.tipo }));
  enlace.download = pdf.nombre;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

/**
 * **El enlace de «Pide tu factura»** (maqueta del 7-nov, 5), para quien llama al día siguiente y, hasta
 * que el QR salga en el papel con T7, para probarla. Si el aparato no deja copiar, se enseña.
 */
function QueLaPidaElCliente({ codigo }: { readonly codigo: string }) {
  const [hecho, setHecho] = useState<'copiado' | 'a_mano' | null>(null);
  const enlace = direccionParaPedirLaFactura(codigo);
  return (
    <div className="flex flex-col gap-e2 rounded-medio border border-borde bg-superficie p-e3">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <p className="text-secundario font-semibold">Que la pida el cliente</p>
        <Boton
          tono="secundario"
          onClick={() => {
            // Donde no hay portapapeles (una página sin https) ni llega a devolver una promesa.
            void (async () => {
              try {
                await navigator.clipboard.writeText(enlace);
                setHecho('copiado');
              } catch {
                setHecho('a_mano');
              }
            })();
          }}
        >
          {hecho === 'copiado' ? 'Copiado' : 'Copiar el enlace'}
        </Boton>
      </div>
      <p className="text-etiqueta text-texto-suave">Por si te llaman para pedirla.</p>
      {hecho === 'a_mano' && <p className="break-all text-secundario">{enlace}</p>}
    </div>
  );
}

/** Como se imprimió, su historia y lo que se puede hacer (maqueta de T6, 4; de T6 · 2 · 2, 6). */
function ElDocumento({
  id,
  correoNoSalio,
  cliente,
  conLaImpresora,
  alAbrir,
  alFacturar,
  alCorregir,
}: {
  readonly id: string;
  readonly correoNoSalio: boolean;
  readonly cliente: ClienteDeFacturas;
  readonly conLaImpresora: boolean;
  readonly alAbrir: (id: string) => void;
  readonly alFacturar: (t: TicketParaFacturar) => void;
  readonly alCorregir: (que: 'devolver' | 'corregir' | 'anular' | 'rechazado') => void;
}) {
  const doc = usarLectura<UnDocumento>(
    () => cliente.consultar('un_documento', { documento_id: id }),
    id,
    15_000,
  );
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [mandando, setMandando] = useState(false);
  const [para, setPara] = useState('');

  async function hacer(
    que: string,
    ir: () => Promise<{ ok: boolean; error?: ErrorDeLaApi }>,
    si: string,
  ) {
    setHaciendo(que);
    setError(null);
    setHecho(null);
    const r = await ir();
    setHaciendo(null);
    if (!r.ok) {
      setError(r.error ?? null);
      return;
    }
    setHecho(si);
    void doc.otraVez();
  }

  if (doc.cargando && doc.datos === undefined) return <Cargando que="el documento" lineas={4} />;
  if (doc.datos === undefined) {
    return doc.error === null ? null : <ErrorEnCristiano error={doc.error} />;
  }
  const d = doc.datos;
  const esFactura = d.cliente !== null;
  const puedeFacturar = d.puede.deUnTicket && d.tipo === 'F2' && d.porQueNoSeCanjea === null;
  const puedeImprimir = d.puede.deUnTicket && d.papel !== null && d.seEntrega;

  const imprimir = puedeImprimir && (
    <Boton
      tono="secundario"
      cargando={haciendo === 'imprimir'}
      textoCargando="Mandando"
      onClick={() => {
        void hacer(
          'imprimir',
          () => cliente.ejecutar('reimprimir_el_documento', { documento_id: id }),
          esFactura
            ? 'Sale por la impresora de la caja.'
            : 'Sale por la impresora de la caja, como copia. No crea nada en Hacienda.',
        );
      }}
    >
      {esFactura ? 'Imprimir' : 'Reimprimir'}
    </Boton>
  );
  // Anulado: solo mirar, con quién y por qué (maqueta de T6 · 2 · 2, 6).
  const descargar = d.papel !== null && d.estado !== 'anulado' && (
    <Boton
      tono="secundario"
      cargando={haciendo === 'descargar'}
      textoCargando="Preparando"
      onClick={() => {
        void hacer(
          'descargar',
          async () => {
            const r = await cliente.consultar<{ nombre: string; tipo: string; base64: string }>(
              'el_documento_en_pdf',
              { documento_id: id },
            );
            if (r.ok) bajarElPdf(r.datos);
            return r;
          },
          'Descargado.',
        );
      }}
    >
      Descargar
    </Boton>
  );

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <div>
          <p className="font-semibold tabular-nums">{d.numero}</p>
          <p className="text-secundario text-texto-suave">
            {d.que} · {d.hora}
            {d.cliente === null ? (d.donde === null ? '' : ` · ${d.donde}`) : ` · ${d.cliente}`}
          </p>
        </div>
        <span className="flex flex-wrap gap-e1">
          <Etiqueta tono={d.chapa.tono}>{d.chapa.texto}</Etiqueta>
          {d.porCobrar !== null && <Etiqueta tono="atencion">Por cobrar</Etiqueta>}
          {d.pedidaPorElCliente && <Etiqueta tono="info">Pedida por el cliente</Etiqueta>}
        </span>
      </div>

      {d.loQueFalla !== null && (
        <Aviso tono="mal" titulo="Qué pasa">
          {d.loQueFalla.que} <strong>Qué hacer:</strong> {d.loQueFalla.hacer}
        </Aviso>
      )}

      {d.anulado !== null && (
        <Aviso tono="info" titulo="Anulado">
          {d.anulado.quien === null ? '' : `${d.anulado.quien}: `}
          {d.anulado.motivo}
        </Aviso>
      )}

      {d.anulacionQueNoSalio !== null && (
        <Aviso tono="atencion" titulo="La anulación no ha salido">
          Sigue valiendo.
          {d.anulacionQueNoSalio.dice === null
            ? ''
            : ` Hacienda dice: «${d.anulacionQueNoSalio.dice}».`}{' '}
          <strong>Qué hacer:</strong> si el cliente lo tiene, devuélvelo.
        </Aviso>
      )}

      {(correoNoSalio || d.correoDelClienteNoSalio) && d.loQueFalla === null && (
        <Aviso tono="atencion" titulo="El correo no ha salido">
          La factura está hecha, pero al cliente no le ha llegado. Prueba otra vez con «Mandar por
          correo», o descárgala y dásela.
        </Aviso>
      )}

      <div className="flex flex-wrap gap-e2">
        {d.sePuede.corregirLoRechazado && (
          <Boton
            tono="principal"
            onClick={() => {
              alCorregir('rechazado');
            }}
          >
            Corregir
          </Boton>
        )}
        {puedeFacturar && (
          <Boton
            tono="principal"
            onClick={() => {
              alFacturar(d);
            }}
          >
            Hacer factura
          </Boton>
        )}
        {d.factura !== null && (
          <Boton
            tono="secundario"
            onClick={() => {
              if (d.factura !== null) alAbrir(d.factura.id);
            }}
          >
            Ir a su factura
          </Boton>
        )}
        {conLaImpresora ? (
          <>
            {imprimir}
            {descargar}
          </>
        ) : (
          <>
            {descargar}
            {imprimir}
          </>
        )}
        {d.puede.deUnTicket && d.papel !== null && d.seEntrega && (
          <Boton
            tono="secundario"
            onClick={() => {
              setMandando((m) => !m);
            }}
          >
            Mandar por correo
          </Boton>
        )}
        {d.porCobrar !== null && d.puede.aMano && (
          <Boton
            tono="secundario"
            cargando={haciendo === 'cobrar'}
            textoCargando="Marcando"
            onClick={() => {
              void hacer(
                'cobrar',
                () => cliente.ejecutar('marcar_cobrada', { documento_id: id }),
                'Marcada como cobrada. La caja no se mueve.',
              );
            }}
          >
            Marcar cobrada
          </Boton>
        )}
        {d.sePuede.devolver && (
          <Boton
            tono="secundario"
            onClick={() => {
              alCorregir('devolver');
            }}
          >
            {d.devoluciones.length > 0 ? 'Devolver lo que queda' : 'Devolver'}
          </Boton>
        )}
        {d.sePuede.corregirDatos && (
          <Boton
            tono="secundario"
            onClick={() => {
              alCorregir('corregir');
            }}
          >
            Corregir los datos
          </Boton>
        )}
        {d.sePuede.anular && (
          <Boton
            tono="secundario"
            onClick={() => {
              alCorregir('anular');
            }}
          >
            Anular
          </Boton>
        )}
        {d.corregidaPor !== null && (
          <Boton
            tono="secundario"
            onClick={() => {
              if (d.corregidaPor !== null) alAbrir(d.corregidaPor.id);
            }}
          >
            Ir a su corrección
          </Boton>
        )}
        {d.descontadaEn !== null && (
          <Boton
            tono="secundario"
            onClick={() => {
              if (d.descontadaEn !== null) alAbrir(d.descontadaEn.id);
            }}
          >
            Ir a la factura que la descuenta
          </Boton>
        )}
      </div>
      {mandando && (
        <div className="flex flex-wrap items-end gap-e2">
          <div className="min-w-0 flex-1">
            <Campo
              etiqueta="A qué correo"
              tipo="correo"
              value={para}
              onChange={(e) => {
                setPara(e.target.value);
              }}
            />
          </div>
          <Boton
            tono="principal"
            disabled={para.trim() === ''}
            cargando={haciendo === 'mandar'}
            textoCargando="Mandando"
            onClick={() => {
              void hacer(
                'mandar',
                () =>
                  cliente.ejecutar('mandar_el_documento', { documento_id: id, para: para.trim() }),
                `Mandado a ${para.trim()}.`,
              ).then(() => {
                setMandando(false);
              });
            }}
          >
            Mandar
          </Boton>
        </div>
      )}
      {hecho !== null && <p className="text-secundario text-bien">{hecho}</p>}
      {error !== null && <ErrorEnCristiano error={error} />}

      {d.codigoParaPedirla !== null && <QueLaPidaElCliente codigo={d.codigoParaPedirla} />}

      <div className="grid gap-e4 md:grid-cols-2">
        <div className="flex flex-col gap-e2">
          <p className="text-etiqueta font-semibold text-texto-suave">Como se imprimió</p>
          {d.papel === null ? (
            <p className="text-secundario text-texto-suave">
              Todavía no hay papel: está esperando a Verifacti.
            </p>
          ) : (
            <PapelEnPantalla papel={d.papel} />
          )}
        </div>
        <div className="flex flex-col gap-e3">
          <p className="text-etiqueta font-semibold text-texto-suave">Su historia</p>
          <ol className="flex flex-col gap-e2">
            {d.historia.map((h, i) => (
              <li key={i} className="flex gap-e3">
                <span className="w-20 shrink-0 text-etiqueta tabular-nums text-texto-suave">
                  {h.hora}
                </span>
                <span className="min-w-0">
                  <span className="block text-secundario font-medium">{h.que}</span>
                  {h.detalle !== null && (
                    <span className="block text-etiqueta text-texto-suave">{h.detalle}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <LosQueVan titulo="Sustituye a" documentos={d.sustituye} alAbrir={alAbrir} />
          <LosQueVan
            titulo="Rectifica"
            documentos={d.rectifica === null ? [] : [d.rectifica]}
            alAbrir={alAbrir}
          />
          <LosQueVan titulo="Sus devoluciones" documentos={d.devoluciones} alAbrir={alAbrir} />
          <LosQueVan titulo="Descuenta las señales" documentos={d.descuenta} alAbrir={alAbrir} />
        </div>
      </div>
    </div>
  );
}
