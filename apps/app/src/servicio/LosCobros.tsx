import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { enDinero } from '@estook/dominio';
import { Aviso, Cargando, EstadoVacio, Selector, Tarjeta } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Negocio › Ventas › Cobros** (0145; Richi, 10-nov): cada cobro de Estook TPV, con su hora, su mesa,
 * cómo se pagó, lo que dio el cliente y el cambio, quién lo cobró y su ticket. Arriba, lo cobrado y
 * cuánto de cada forma de pago; y se mira solo el efectivo, solo la tarjeta… Desde Cierres de caja,
 * «Sus tickets» abre los de una caja (`?caja=`).
 */
type Forma = 'efectivo' | 'tarjeta' | 'bizum' | 'cheque';

interface UnCobro {
  readonly cobroId: string;
  readonly en: string;
  readonly titulo: string;
  readonly importe: number;
  readonly parte: number | null;
  readonly de: number | null;
  readonly pagos: readonly {
    readonly forma: Forma;
    readonly importe: number;
    readonly entregado: number | null;
    readonly cambio: number | null;
  }[];
  readonly cobradoPor: string;
  readonly camarero: string | null;
  readonly cajon: string;
  readonly turnoId: string;
  readonly ticket: { readonly documentoId: string; readonly numero: string };
  readonly devuelto: number;
}

interface LosCobrosDeLaApi {
  readonly desde: string;
  readonly hasta: string;
  readonly totales: {
    readonly cobros: number;
    readonly total: number;
    readonly efectivo: number;
    readonly tarjeta: number;
    readonly bizum: number;
    readonly cheque: number;
    readonly devuelto: number;
  };
  readonly cobros: readonly UnCobro[];
}

const NOMBRE: Readonly<Record<Forma, string>> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  bizum: 'Bizum',
  cheque: 'Cheques',
};

function laHora(instante: string): string {
  return new Date(instante).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function elDia(instante: string): string {
  return new Date(instante).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function LosCobros() {
  const { cliente } = usarSesion();
  const [parametros, ponerParametros] = useSearchParams();
  const caja = parametros.get('caja');
  const [dias, setDias] = useState('1');
  const [forma, setForma] = useState<Forma | null>(null);

  const lectura = useQuery({
    queryKey: ['los_cobros', caja ?? `dias-${dias}`],
    queryFn: async () => {
      const r = await cliente.consultar<LosCobrosDeLaApi>(
        'los_cobros',
        caja === null ? { dias } : { turno_id: caja },
      );
      if (!r.ok) throw new Error(r.error.codigo);
      return r.datos;
    },
    refetchInterval: 60_000,
  });

  if (lectura.isPending) return <Cargando que="los cobros" />;
  if (lectura.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer los cobros">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }
  const { totales, cobros } = lectura.data;
  const formasQueHay = (['efectivo', 'tarjeta', 'bizum', 'cheque'] as const).filter(
    (f) => totales[f] > 0,
  );
  const vistos =
    forma === null ? cobros : cobros.filter((c) => c.pagos.some((p) => p.forma === forma));
  const variosDias = caja === null && dias !== '1';

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-end justify-between gap-e3">
        {caja === null ? (
          <div className="min-w-[12rem]">
            <Selector
              etiqueta="Periodo"
              opciones={[
                { valor: '1', texto: 'Hoy' },
                { valor: '7', texto: 'Última semana' },
                { valor: '30', texto: 'Último mes' },
              ]}
              value={dias}
              onChange={(e) => {
                setDias(e.currentTarget.value);
              }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-e3">
            <span className="text-cuerpo font-bold">Los de {cobros[0]?.cajon ?? 'esa caja'}</span>
            <button
              type="button"
              onClick={() => {
                ponerParametros({});
              }}
              className="min-h-toque rounded-redondo border border-borde px-e4 font-semibold"
            >
              Ver todos
            </button>
          </div>
        )}
      </div>

      <Tarjeta titulo="Cobrado">
        <div className="flex flex-col gap-e3">
          <div className="flex items-baseline justify-between gap-e3">
            <span className="text-texto-suave">
              {totales.cobros} {totales.cobros === 1 ? 'cobro' : 'cobros'}
            </span>
            <b className="text-cifra-media tabular-nums">{enDinero(totales.total)}</b>
          </div>
          <div className="flex flex-wrap gap-x-e4 gap-y-e1 text-secundario text-texto-suave">
            {formasQueHay.map((f) => (
              <span key={f}>
                {NOMBRE[f]} <b className="tabular-nums text-texto">{enDinero(totales[f])}</b>
              </span>
            ))}
            {totales.devuelto > 0 && (
              <span>
                Devuelto <b className="tabular-nums text-texto">{enDinero(totales.devuelto)}</b>
              </span>
            )}
          </div>
        </div>
      </Tarjeta>

      {formasQueHay.length > 1 && (
        <div className="flex flex-wrap gap-e2" role="group" aria-label="Qué cobros">
          {([null, ...formasQueHay] as const).map((f) => (
            <button
              key={f ?? 'todos'}
              type="button"
              aria-pressed={forma === f}
              onClick={() => {
                setForma(f);
              }}
              className={`min-h-toque rounded-redondo border px-e4 font-semibold ${
                forma === f ? 'border-texto bg-texto text-fondo' : 'border-borde'
              }`}
            >
              {f === null ? 'Todos' : NOMBRE[f]}
            </button>
          ))}
        </div>
      )}

      {vistos.length === 0 ? (
        <EstadoVacio
          compacto
          dibujo="caja"
          titulo={
            caja === null && dias === '1' ? 'Hoy no se ha cobrado nada todavía' : 'Ningún cobro'
          }
          frase="Se cobra en Estook TPV: cada cobro llega aquí solo, con su ticket."
          sinAccionPorque="Se cobra en la caja o en el comandero."
        />
      ) : (
        <Tarjeta>
          <ul className="flex flex-col" aria-label="Los cobros">
            {vistos.map((c) => (
              <li
                key={c.cobroId}
                className="flex flex-col gap-e1 border-b border-borde py-e3 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-e3">
                  <span className="flex min-w-0 items-baseline gap-e2">
                    <span className="shrink-0 tabular-nums text-texto-tenue">
                      {variosDias ? `${elDia(c.en)} · ` : ''}
                      {laHora(c.en)}
                    </span>
                    <b className="truncate">
                      {c.titulo}
                      {c.parte === null
                        ? ''
                        : ` · parte ${String(c.parte)} de ${String(c.de ?? 0)}`}
                    </b>
                  </span>
                  <b className="shrink-0 tabular-nums">{enDinero(c.importe)}</b>
                </div>
                <div className="flex flex-wrap gap-x-e3 gap-y-e1 text-secundario text-texto-suave">
                  {c.pagos.map((p) => (
                    <span key={p.forma}>
                      <span className="font-semibold text-texto">{NOMBRE[p.forma]}</span>{' '}
                      {enDinero(p.importe)}
                      {p.entregado !== null && p.entregado > p.importe
                        ? ` · entregó ${enDinero(p.entregado)} · cambio ${enDinero(p.cambio ?? 0)}`
                        : ''}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-e3 text-etiqueta text-texto-tenue">
                  <span>Cobró {c.cobradoPor}</span>
                  {c.camarero !== null && c.camarero !== c.cobradoPor && (
                    <span>Mesa de {c.camarero}</span>
                  )}
                  <span className="tabular-nums">{c.ticket.numero}</span>
                  {c.devuelto > 0 && (
                    <span className="font-semibold text-atencion">
                      Devuelto {enDinero(c.devuelto)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
