import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA,
  comoCuadra,
  enDinero,
  laDiferenciaEnTexto,
  type MotivoDeLaDiferencia,
} from '@estook/dominio';
import { puedeVer } from '@estook/permisos';
import { Cargando, EstadoVacio, Tarjeta } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Servicio › Jornada › Cierres de caja** (0142 y 0144; maqueta del 9-nov, tramo 5): con Estook TPV,
 * **solo para ver**. La caja se abre y se cierra en el TPV, y aquí llegan sus cierres:
 *
 *   · **hoy, en vivo**: lo que hay ahora en cada cajón
 *   · **un día por fila**, con su total y si cuadra («Con diferencia» y «Buscar un día»)
 *   · al tocarlo, **el día entero arriba** y **cada caja con su Z** (como Toast; Richi, 9-nov)
 */

interface UnaCajaDeHoy {
  readonly turnoId: string;
  readonly cajon: string;
  readonly abiertaPor: string;
  readonly desde: string;
  readonly enElCajon: number;
  readonly tarjeta: number;
  readonly tickets: number;
}
interface UnDia {
  readonly fecha: string;
  readonly total: number;
  readonly diferencia: number;
  readonly cajas: number;
  readonly ultimaCerro: string;
  readonly ultimaHora: string;
  readonly abierto: boolean;
}
interface LosCierres {
  readonly hoy: readonly UnaCajaDeHoy[];
  readonly dias: readonly UnDia[];
}
interface UnMovimiento {
  readonly tipo: 'cambio' | 'sacar' | 'meter' | 'devolucion';
  readonly importe: number;
  readonly motivo: string | null;
  readonly nota: string | null;
  readonly quien: string;
}
interface UnaCaja {
  readonly turnoId: string;
  readonly cajon: string;
  readonly abrio: string;
  readonly abiertaEn: string;
  readonly abiertaContando: boolean;
  readonly alAbrirHabia: number | null;
  readonly cerro: string | null;
  readonly cerradaEn: string | null;
  readonly fondo: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly datafono: number | null;
  readonly bizum: number;
  readonly cheque: number;
  readonly movimientos: readonly UnMovimiento[];
  readonly deberiaHaber: number;
  readonly contado: number | null;
  readonly diferencia: number | null;
  readonly motivo: MotivoDeLaDiferencia | null;
  readonly paraManana: number | null;
  readonly tickets: number;
  readonly cajonSinVenta: number;
}
interface ElDia {
  readonly fecha: string;
  readonly total: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly bizum: number;
  readonly cheque: number;
  readonly tickets: number;
  readonly diferencia: number;
  readonly cajonSinVenta: number;
  readonly devuelto: number;
  readonly cajas: readonly UnaCaja[];
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «2026-11-08» → «Dom 8 nov». */
function elDia(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = DIAS[d.getUTCDay()] ?? '';
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${String(d.getUTCDate())} ${MESES[d.getUTCMonth()] ?? ''}`;
}

function laHora(instante: string): string {
  return new Date(instante).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function Pastilla({ diferencia }: { readonly diferencia: number }) {
  const como = comoCuadra(diferencia);
  const tono =
    como === 'cuadra'
      ? 'bg-bien-suave text-bien'
      : como === 'poco'
        ? 'bg-atencion-suave text-atencion'
        : 'bg-mal-suave text-mal';
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-redondo px-e3 py-e1 text-secundario font-bold ${tono}`}
    >
      {diferencia === 0
        ? 'Cuadra'
        : `${diferencia < 0 ? 'Falta' : 'Sobra'} ${enDinero(Math.abs(diferencia))}`}
    </span>
  );
}

export function CierresDeCaja() {
  const { permisos } = usarSesion();
  const [parametros, ponerParametros] = useSearchParams();
  const fecha = parametros.get('dia');

  if (!puedeVer(permisos, 'dato.ventas')) {
    return (
      <Tarjeta titulo="Cierres de caja">
        <EstadoVacio
          compacto
          dibujo="candado"
          titulo="Los ve quien ve las ventas"
          frase="La caja se abre y se cierra en Estook TPV. Sus cierres los ve quien lleva el local."
          sinAccionPorque="No hay nada que hacer aquí."
        />
      </Tarjeta>
    );
  }
  if (fecha !== null) {
    return (
      <UnDiaDeCaja
        fecha={fecha}
        alVolver={() => {
          ponerParametros({});
        }}
      />
    );
  }
  return (
    <LaLista
      alAbrir={(dia) => {
        ponerParametros({ dia });
      }}
    />
  );
}

function LaLista({ alAbrir }: { readonly alAbrir: (fecha: string) => void }) {
  const { cliente } = usarSesion();
  const [soloConDiferencia, setSoloConDiferencia] = useState(false);
  const [buscar, setBuscar] = useState('');
  const lista = useQuery({
    queryKey: ['cierres_de_caja'],
    queryFn: async () => {
      const r = await cliente.consultar<LosCierres>('cierres_de_caja', {});
      if (!r.ok) throw new Error(r.error.codigo);
      return r.datos;
    },
    refetchInterval: 60_000,
  });
  if (lista.isLoading || lista.data === undefined) return <Cargando que="los cierres de caja" />;
  const { hoy, dias } = lista.data;
  const conDiferencia = dias.filter((d) => d.diferencia !== 0);
  const vistos = soloConDiferencia ? conDiferencia : dias;

  return (
    <div className="flex flex-col gap-e4">
      {hoy.length > 0 && (
        <Tarjeta titulo="Hoy, en vivo">
          <div className="flex flex-col gap-e3">
            {hoy.map((c) => (
              <div key={c.turnoId} className="flex flex-col gap-e1">
                <div className="flex items-center gap-e2">
                  <span className="rounded-redondo bg-bien-suave px-e3 py-e1 text-secundario font-bold text-bien">
                    ● Abierta
                  </span>
                  <b className="flex-1">{c.cajon}</b>
                  <span className="text-secundario text-texto-tenue">
                    {c.abiertaPor} · desde {laHora(c.desde)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-e3">
                  <span className="text-texto-suave">Efectivo en el cajón ahora</span>
                  <b className="text-cifra-larga tabular-nums">{enDinero(c.enElCajon)}</b>
                </div>
                <div className="flex flex-wrap gap-e3 text-secundario text-texto-suave">
                  <span>Tarjeta {enDinero(c.tarjeta)}</span>
                  <span>{c.tickets} tickets</span>
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      <div className="flex flex-wrap items-center gap-e2">
        <button
          type="button"
          aria-pressed={!soloConDiferencia}
          onClick={() => {
            setSoloConDiferencia(false);
          }}
          className={`min-h-toque rounded-redondo border px-e4 font-semibold ${!soloConDiferencia ? 'border-texto bg-texto text-fondo' : 'border-borde'}`}
        >
          Todos
        </button>
        <button
          type="button"
          aria-pressed={soloConDiferencia}
          onClick={() => {
            setSoloConDiferencia(true);
          }}
          className={`min-h-toque rounded-redondo border px-e4 font-semibold ${soloConDiferencia ? 'border-texto bg-texto text-fondo' : 'border-borde'}`}
        >
          Con diferencia · {conDiferencia.length}
        </button>
        <label className="flex min-h-toque items-center gap-e2 rounded-redondo border border-borde px-e3">
          <span className="text-secundario font-semibold">Buscar un día</span>
          <input
            type="date"
            value={buscar}
            onChange={(e) => {
              setBuscar(e.currentTarget.value);
              if (e.currentTarget.value !== '') alAbrir(e.currentTarget.value);
            }}
            className="bg-transparent text-secundario"
          />
        </label>
      </div>

      {vistos.length === 0 ? (
        <EstadoVacio
          compacto
          dibujo="caja"
          titulo={
            soloConDiferencia
              ? 'Ningún día con diferencia'
              : 'Todavía no se ha cerrado ninguna caja'
          }
          frase="La caja se abre y se cierra en Estook TPV. Cada cierre llega aquí solo."
          sinAccionPorque="Se hace en la caja."
        />
      ) : (
        <Tarjeta>
          <ul className="flex flex-col">
            {vistos.map((d) => (
              <li key={d.fecha} className="border-b border-borde last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    alAbrir(d.fecha);
                  }}
                  className="flex min-h-[3.75rem] w-full items-center gap-e3 py-e2 text-left"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b>{elDia(d.fecha)}</b>
                    <span className="truncate text-secundario text-texto-tenue">
                      {enDinero(d.total)} ·{' '}
                      {d.cajas > 1 ? `${String(d.cajas)} cajas · la última, ` : 'Cerró '}
                      {d.ultimaCerro} {d.ultimaHora === '' ? '' : laHora(d.ultimaHora)}
                      {d.abierto ? ' · alguna sigue abierta' : ''}
                    </span>
                  </span>
                  <Pastilla diferencia={d.diferencia} />
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

function UnDiaDeCaja({
  fecha,
  alVolver,
}: {
  readonly fecha: string;
  readonly alVolver: () => void;
}) {
  const { cliente } = usarSesion();
  const dia = useQuery({
    queryKey: ['un_dia_de_caja', fecha],
    queryFn: async () => {
      const r = await cliente.consultar<ElDia>('un_dia_de_caja', { fecha });
      if (!r.ok) throw new Error(r.error.codigo);
      return r.datos;
    },
    retry: false,
  });

  const cabecera = (
    <div className="flex items-center gap-e3">
      <button
        type="button"
        onClick={alVolver}
        aria-label="Volver a los cierres"
        className="min-h-toque min-w-toque rounded-grande border border-borde px-e3 font-bold"
      >
        ←
      </button>
      <h2 className="text-pantalla font-bold">{elDia(fecha)}</h2>
    </div>
  );
  if (dia.isLoading) return <Cargando que="el día" />;
  const d = dia.data;
  if (d === undefined) {
    return (
      <div className="flex flex-col gap-e4">
        {cabecera}
        <EstadoVacio
          compacto
          dibujo="caja"
          titulo="Ese día no se abrió la caja"
          frase="Elige otro día en «Buscar un día»."
          sinAccionPorque="No hay nada que ver."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      {cabecera}
      <Tarjeta titulo={d.cajas.length > 1 ? 'Todo el día · las dos cajas' : 'Todo el día'}>
        <div className="flex flex-col gap-e2">
          <div className="flex items-baseline justify-between gap-e3">
            <span className="text-texto-suave">Cobrado</span>
            <b className="text-cifra-media tabular-nums">{enDinero(d.total)}</b>
          </div>
          <div className="flex flex-wrap gap-e3 text-secundario text-texto-suave">
            <span>Efectivo {enDinero(d.efectivo)}</span>
            <span>Tarjeta {enDinero(d.tarjeta)}</span>
            {d.bizum > 0 && <span>Bizum {enDinero(d.bizum)}</span>}
            {d.cheque > 0 && <span>Cheques {enDinero(d.cheque)}</span>}
            <span>{d.tickets} tickets</span>
          </div>
          <div className="flex items-center justify-between gap-e3 border-t border-borde pt-e2">
            <span className="text-texto-suave">Diferencia en efectivo</span>
            <Pastilla diferencia={d.diferencia} />
          </div>
          <div className="flex flex-wrap gap-e3 text-secundario text-texto-suave">
            <span>Cajón sin venta {d.cajonSinVenta}</span>
            {d.devuelto > 0 && <span>Devuelto {enDinero(d.devuelto)}</span>}
          </div>
        </div>
      </Tarjeta>
      {d.cajas.map((c) => (
        <Tarjeta key={c.turnoId} titulo={c.cajon}>
          <div className="flex flex-col">
            {c.diferencia !== null && (
              <div className="flex items-center justify-between gap-e3 pb-e2">
                <span className="font-bold">{laDiferenciaEnTexto(c.diferencia)}</span>
                {c.motivo !== null && (
                  <span className="rounded-redondo bg-fondo px-e3 py-e1 text-secundario">
                    {NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA[c.motivo]}
                  </span>
                )}
              </div>
            )}
            <Linea
              que="Abrió"
              detalle={`${c.abrio} · ${laHora(c.abiertaEn)}${c.abiertaContando ? ' · contando' : ''}`}
              cuanto={enDinero(c.fondo)}
            />
            {c.alAbrirHabia !== null && c.alAbrirHabia !== 0 && (
              <Linea
                que="Al abrir había"
                detalle="frente a lo que se dejó"
                cuanto={`${c.alAbrirHabia > 0 ? '+' : '−'}${enDinero(Math.abs(c.alAbrirHabia))}`}
              />
            )}
            <Linea que="Cobrado en efectivo" cuanto={enDinero(c.efectivo)} />
            {c.movimientos
              .filter((m) => m.tipo !== 'cambio')
              .map((m, i) => (
                <Linea
                  key={`${m.tipo}-${String(i)}`}
                  que={m.tipo === 'sacar' ? 'Sacado' : m.tipo === 'meter' ? 'Metido' : 'Devuelto'}
                  detalle={[m.motivo, m.nota, m.quien].filter(Boolean).join(' · ')}
                  cuanto={`${m.tipo === 'meter' ? '+' : '−'}${enDinero(m.importe)}`}
                />
              ))}
            <Linea que="Debería haber" cuanto={enDinero(c.deberiaHaber)} />
            {c.contado !== null && (
              <Linea
                que="Contado"
                detalle={`${c.cerro ?? ''} · ${c.cerradaEn === null ? '' : laHora(c.cerradaEn)}`}
                cuanto={enDinero(c.contado)}
              />
            )}
            <Linea que="Con tarjeta" cuanto={enDinero(c.tarjeta)} />
            {c.bizum > 0 && <Linea que="Bizum" cuanto={enDinero(c.bizum)} />}
            {c.cheque > 0 && <Linea que="Cheques" cuanto={enDinero(c.cheque)} />}
            {c.paraManana !== null && (
              <Linea que="Se quedó para mañana" cuanto={enDinero(c.paraManana)} />
            )}
            <Linea que="Tickets" cuanto={String(c.tickets)} />
            <Linea que="Cajón sin venta" cuanto={String(c.cajonSinVenta)} />
            {c.cerradaEn === null && (
              <p className="pt-e2 text-secundario font-bold text-bien">Sigue abierta</p>
            )}
          </div>
        </Tarjeta>
      ))}
    </div>
  );
}

function Linea({
  que,
  detalle,
  cuanto,
}: {
  readonly que: string;
  readonly detalle?: string;
  readonly cuanto: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-e3 border-b border-borde py-e2 last:border-b-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-texto-suave">{que}</span>
        {detalle !== undefined && detalle !== '' && (
          <span className="text-secundario text-texto-tenue">{detalle}</span>
        )}
      </span>
      <b className="shrink-0 tabular-nums">{cuanto}</b>
    </div>
  );
}
