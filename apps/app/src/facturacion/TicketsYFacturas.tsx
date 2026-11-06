import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  importeDelDocumento,
  type EstadoDelDocumento,
  type PapelCompuesto,
  type TipoDeDocumento,
} from '@estook/dominio';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  Hoja,
  Tabla,
  Tarjeta,
  clases,
  type Columna,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { PapelEnPantalla } from './PapelEnPantalla.tsx';

/**
 * **Servicio › Ventas › Tickets y facturas** (T6 · 2 · 1, decisión 0136; maqueta de T6 aprobada
 * el 2-nov, «Todos los documentos, con lo que falla arriba»).
 *
 * Lo que alguien tiene que mirar sale **arriba y en llano**, con qué hacer. Debajo, lo del día
 * con su estado ante Hacienda. Al tocar uno, **como se imprimió y su historia**. **Nada se
 * edita**: lo que está mal se corrige con otro documento (T6 · 2 · 2). Hasta T7 aquí solo salen
 * los tickets de prueba.
 */

type Tono = 'bien' | 'info' | 'mal' | 'atencion';

interface UnoDeLaLista {
  readonly id: string;
  readonly hora: string;
  readonly numero: string;
  readonly tipo: TipoDeDocumento;
  readonly que: string;
  readonly donde: string | null;
  readonly total: number;
  readonly estado: EstadoDelDocumento | 'fuera_sii';
  readonly chapa: { readonly texto: string; readonly tono: Tono };
  readonly pruebas: boolean;
  readonly justificante: string | null;
}

interface LoQueFalla {
  readonly id: string;
  readonly numero: string;
  readonly que: string;
  readonly hacer: string;
}

interface LaLista {
  readonly dia: string;
  readonly documentos: readonly UnoDeLaLista[];
  readonly loQueFalla: readonly LoQueFalla[];
  readonly cuantos: number;
  readonly total: number;
  readonly correctos: number;
  readonly enPruebas: boolean;
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
}

const DIAS = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'ayer', texto: 'Ayer' },
] as const;

export function TicketsYFacturas() {
  const { cliente, yo } = usarSesion();
  const [dia, setDia] = useState<'hoy' | 'ayer'>('hoy');
  const [abierto, setAbierto] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ['tickets_y_facturas', yo?.local?.id ?? null, dia],
    queryFn: async () => {
      const r = await cliente.consultar<LaLista>('tickets_y_facturas', { dia });
      if (!r.ok) throw new FalloDeLaApi(r.error);
      return r.datos;
    },
    // Lo que está «Enviando» cambia solo: se vuelve a mirar cada medio minuto.
    refetchInterval: 30_000,
  });

  if (lista.isLoading) {
    return (
      <Tarjeta titulo="Tickets y facturas">
        <Cargando que="los tickets y las facturas" lineas={4} />
      </Tarjeta>
    );
  }
  if (lista.error instanceof FalloDeLaApi || lista.data === undefined) {
    return (
      <Tarjeta titulo="Tickets y facturas">
        {lista.error instanceof FalloDeLaApi ? (
          <ErrorEnCristiano error={lista.error.error} />
        ) : (
          <p className="text-secundario text-texto-suave">No he podido leerlos.</p>
        )}
      </Tarjeta>
    );
  }

  const l = lista.data;
  const columnas: readonly Columna<UnoDeLaLista>[] = [
    { clave: 'hora', titulo: 'Hora', celda: (d) => <span className="tabular-nums">{d.hora}</span> },
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
    { clave: 'donde', titulo: 'Dónde', celda: (d) => d.donde ?? '—' },
    {
      clave: 'total',
      titulo: 'Total',
      numerica: true,
      celda: (d) => <span className="tabular-nums">{importeDelDocumento(d.total)}</span>,
    },
    {
      clave: 'hacienda',
      titulo: 'Hacienda',
      celda: (d) => <Etiqueta tono={d.chapa.tono}>{d.chapa.texto}</Etiqueta>,
    },
  ];

  return (
    <div className="flex flex-col gap-e4">
      {l.loQueFalla.map((f) => (
        <Aviso
          key={f.id}
          tono="mal"
          titulo={f.numero}
          accion={
            <Boton
              tono="secundario"
              onClick={() => {
                setAbierto(f.id);
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

      <div
        role="tablist"
        aria-label="Qué día"
        className="grid w-full max-w-xs grid-cols-2 gap-e1 rounded-medio bg-borde/40 p-e1"
      >
        {DIAS.map((d) => (
          <button
            key={d.valor}
            type="button"
            role="tab"
            aria-selected={dia === d.valor}
            onClick={() => {
              setDia(d.valor);
            }}
            className={clases(
              'min-h-toque rounded-medio px-e2 text-secundario',
              dia === d.valor
                ? 'bg-superficie font-medium text-texto shadow-s1'
                : 'text-texto-suave',
            )}
          >
            {d.texto}
          </button>
        ))}
      </div>

      <Tabla
        titulo="Tickets y facturas"
        columnas={columnas}
        filas={l.documentos}
        claveDe={(d) => d.id}
        alPulsar={(d) => {
          setAbierto(d.id);
        }}
        nombreDeLaFila={(d) => d.numero}
        filaCompacta={(d) => (
          <div className="flex items-center justify-between gap-e3">
            <span className="min-w-0">
              <span className="block font-medium tabular-nums">{d.numero}</span>
              <span className="block text-secundario text-texto-suave">
                {d.hora} · {d.que} · {importeDelDocumento(d.total)}
              </span>
            </span>
            <Etiqueta tono={d.chapa.tono}>{d.chapa.texto}</Etiqueta>
          </div>
        )}
        cuandoNoHay={
          <EstadoVacio
            compacto
            dibujo="facturas"
            titulo={dia === 'hoy' ? 'Hoy no se ha emitido nada' : 'Ayer no se emitió nada'}
            frase={
              l.enPruebas
                ? 'Hasta que cobres con Estook TPV, aquí salen los tickets de prueba de Ajustes › Facturación.'
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
        abierta={abierto !== null}
        alCerrar={() => {
          setAbierto(null);
          void lista.refetch();
        }}
        titulo="El documento"
      >
        {abierto !== null && <ElDocumento id={abierto} />}
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

/** Como se imprimió, su historia y lo que se puede hacer (maqueta de T6, 4). */
function ElDocumento({ id }: { readonly id: string }) {
  const { cliente } = usarSesion();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const doc = useQuery({
    queryKey: ['un_documento', id],
    queryFn: async () => {
      const r = await cliente.consultar<UnDocumento>('un_documento', { documento_id: id });
      if (!r.ok) throw new FalloDeLaApi(r.error);
      return r.datos;
    },
  });
  const reimprimir = useMutation({
    mutationFn: async () => {
      const r = await cliente.ejecutar<{ impreso: boolean }>('reimprimir_el_documento', {
        documento_id: id,
      });
      if (!r.ok) throw new FalloDeLaApi(r.error);
      return r.datos;
    },
    onSuccess: () => {
      setError(null);
      setHecho('Sale por la impresora de la caja, como copia. No crea nada en Hacienda.');
    },
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  if (doc.isLoading) return <Cargando que="el documento" lineas={4} />;
  if (doc.error instanceof FalloDeLaApi || doc.data === undefined) {
    return doc.error instanceof FalloDeLaApi ? <ErrorEnCristiano error={doc.error.error} /> : null;
  }
  const d = doc.data;
  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <div>
          <p className="font-semibold tabular-nums">{d.numero}</p>
          <p className="text-secundario text-texto-suave">
            {d.que} · {d.hora}
            {d.donde === null ? '' : ` · ${d.donde}`}
          </p>
        </div>
        <Etiqueta tono={d.chapa.tono}>{d.chapa.texto}</Etiqueta>
      </div>

      {d.loQueFalla !== null && (
        <Aviso tono="mal" titulo="Qué pasa">
          {d.loQueFalla.que} <strong>Qué hacer:</strong> {d.loQueFalla.hacer}
        </Aviso>
      )}

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
                <span className="w-16 shrink-0 text-etiqueta tabular-nums text-texto-suave">
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
          {d.papel !== null && (
            <div className="flex flex-col gap-e2">
              <div>
                <Boton
                  tono="secundario"
                  cargando={reimprimir.isPending}
                  textoCargando="Mandando"
                  onClick={() => {
                    setHecho(null);
                    reimprimir.mutate();
                  }}
                >
                  Reimprimir
                </Boton>
              </div>
              <p className="text-etiqueta text-texto-suave">
                Hacer factura, devolver y anular, muy pronto. El original no se toca nunca.
              </p>
            </div>
          )}
          {hecho !== null && <p className="text-secundario text-bien">{hecho}</p>}
          {error !== null && <ErrorEnCristiano error={error} />}
        </div>
      </div>
    </div>
  );
}
