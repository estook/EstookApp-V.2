import { useState } from 'react';
import { importeDelDocumento, type PapelCompuesto, type TipoDeDocumento } from '@estook/dominio';
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
}

interface LoQueFalla {
  readonly id: string;
  readonly numero: string;
  readonly que: string;
  readonly hacer: string;
}

interface LoQuePuede {
  readonly todo: boolean;
  readonly deUnTicket: boolean;
  readonly aMano: boolean;
}

interface LaLista {
  readonly desde: string;
  readonly hasta: string;
  readonly documentos: readonly UnoDeLaLista[];
  readonly loQueFalla: readonly LoQueFalla[];
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
  readonly factura: { readonly id: string; readonly numero: string } | null;
  readonly sustituye: readonly { readonly id: string; readonly numero: string }[];
  readonly puede: LoQuePuede;
}

type Que = 'todos' | 'tickets' | 'facturas' | 'por_cobrar' | 'pendiente';
type Cuando = 'hoy' | 'ayer' | 'fechas';

const LOS_DIAS: readonly { readonly valor: Cuando; readonly texto: string }[] = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'ayer', texto: 'Ayer' },
];
const LO_QUE_SE_FILTRA: readonly { readonly valor: Que; readonly texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'tickets', texto: 'Tickets' },
  { valor: 'facturas', texto: 'Facturas' },
  { valor: 'por_cobrar', texto: 'Por cobrar' },
  { valor: 'pendiente', texto: 'Con algo pendiente' },
];

type Abierta =
  | { readonly que: 'documento'; readonly id: string }
  | { readonly que: 'factura'; readonly tickets: readonly TicketParaFacturar[] | null }
  | null;

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
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-e4">
      {l.puede.aMano && (
        <div className="flex justify-end">
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
            <Boton
              tono="secundario"
              onClick={() => {
                setAbierta({ que: 'documento', id: f.id });
              }}
            >
              Ver el documento
            </Boton>
          }
        >
          {f.que} <strong>Qué hacer:</strong> {f.hacer}
        </Aviso>
      ))}

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
            l.puede.todo || f.valor === 'todos' || f.valor === 'tickets' || f.valor === 'facturas',
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
          abierta?.que === 'factura'
            ? abierta.tickets === null
              ? 'Hacer una factura'
              : 'Hacer factura'
            : 'El documento'
        }
        amplia
      >
        {abierta?.que === 'documento' && (
          <ElDocumento
            key={abierta.id}
            id={abierta.id}
            cliente={cliente}
            conLaImpresora={conLaImpresora === true}
            alAbrir={(id) => {
              setAbierta({ que: 'documento', id });
            }}
            alFacturar={(t) => {
              setAbierta({ que: 'factura', tickets: [t] });
            }}
          />
        )}
        {abierta?.que === 'factura' && (
          <HacerFactura
            cliente={cliente}
            tickets={abierta.tickets}
            puedeAMano={l.puede.aMano}
            puedeTodo={l.puede.todo}
            alHecha={(id) => {
              setAbierta({ que: 'documento', id });
              void lista.otraVez();
            }}
          />
        )}
      </Hoja>
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
function bajarElPdf(pdf: {
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

/** Como se imprimió, su historia y lo que se puede hacer (maqueta de T6, 4; de T6 · 2 · 2, 6). */
function ElDocumento({
  id,
  cliente,
  conLaImpresora,
  alAbrir,
  alFacturar,
}: {
  readonly id: string;
  readonly cliente: ClienteDeFacturas;
  readonly conLaImpresora: boolean;
  readonly alAbrir: (id: string) => void;
  readonly alFacturar: (t: TicketParaFacturar) => void;
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
  const puedeImprimir = d.puede.deUnTicket && d.papel !== null;

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
  const descargar = d.papel !== null && (
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
        </span>
      </div>

      {d.loQueFalla !== null && (
        <Aviso tono="mal" titulo="Qué pasa">
          {d.loQueFalla.que} <strong>Qué hacer:</strong> {d.loQueFalla.hacer}
        </Aviso>
      )}

      <div className="flex flex-wrap gap-e2">
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
        {d.puede.deUnTicket && d.papel !== null && (
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
          {d.sustituye.length > 0 && (
            <div className="flex flex-col gap-e1">
              <p className="text-etiqueta font-semibold text-texto-suave">Sustituye a</p>
              {d.sustituye.map((t) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
