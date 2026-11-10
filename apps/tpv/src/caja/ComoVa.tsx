import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from '../ganchos/usarLaSala.ts';
import { laHora } from '../logica/texto.ts';
import { RenglonDeLaCaja } from './CerrarCaja.tsx';
import type { ComoVaLaCaja, UnMovimiento } from './tipos.ts';

function elMovimiento(m: UnMovimiento): string {
  const que =
    m.tipo === 'sacar'
      ? 'Sacado'
      : m.tipo === 'meter'
        ? 'Metido'
        : m.tipo === 'devolucion'
          ? 'Devuelto'
          : 'Cajón';
  return [que, m.motivo, m.nota].filter((t) => t !== null && t !== '').join(' · ');
}

/**
 * **«Cómo va»**, el X (Anexo 11.6; maqueta del 9-nov, tramo 3): lo cobrado por forma de pago, lo
 * movido y lo que debería haber en el cajón, **sin cerrar nada**. Lo ve quien lleva la caja; y se
 * imprime para el cambio de turno (E4).
 */
export function ComoVa() {
  const { cliente } = usarSesion();
  const [impreso, setImpreso] = useState<string | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const x = useQuery({
    queryKey: ['caja', 'como_va_la_caja'],
    queryFn: async () => {
      const r = await cliente.consultar<ComoVaLaCaja>('como_va_la_caja', {});
      if (!r.ok) throw new FalloDeLaSala(r.error);
      return r.datos;
    },
  });

  async function imprimir() {
    setFallo(null);
    const r = await cliente.ejecutar<{ impreso: boolean }>('imprimir_como_va', {});
    if (!r.ok) setFallo(r.error);
    else setImpreso(r.datos.impreso ? 'Sale por la impresora.' : 'No hay impresora de caja.');
  }

  if (x.isLoading) return <Cargando que="la caja" />;
  if (x.error instanceof FalloDeLaSala) return <ErrorEnCristiano error={x.error.error} />;
  const c = x.data;
  if (c === undefined) return null;
  const sacadoYMetido = c.movimientos.filter((m) => m.tipo !== 'cambio');
  const sinVenta = c.movimientos.filter((m) => m.tipo === 'cambio');

  return (
    <div className="flex max-w-[34rem] flex-col gap-e4">
      <div className="flex flex-wrap items-baseline justify-between gap-e3">
        <h2 className="text-pantalla font-bold">{c.cajon} · cómo va</h2>
        <button
          type="button"
          onClick={() => void imprimir()}
          className="min-h-toque rounded-redondo border-2 border-borde px-e4 font-bold"
        >
          Imprimir
        </button>
      </div>
      {impreso !== null && <p className="font-bold text-bien">{impreso}</p>}
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      <section className="flex flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e4">
        <RenglonDeLaCaja que={`Fondo · ${c.abiertaPor}, ${laHora(c.desde)}`} cuanto={c.fondo} />
        <RenglonDeLaCaja que="Cobrado en efectivo" cuanto={c.efectivo} />
        {sacadoYMetido.map((m, i) => (
          <RenglonDeLaCaja
            // Dos del mismo tipo en el mismo segundo no pueden compartir clave.
            key={`${m.en}-${m.tipo}-${String(i)}`}
            que={elMovimiento(m)}
            cuanto={m.tipo === 'meter' ? m.importe : -m.importe}
          />
        ))}
        <div className="border-t border-borde pt-e2">
          <RenglonDeLaCaja que="Debería haber en el cajón" cuanto={c.deberiaHaber} fuerte />
        </div>
      </section>
      <section className="flex flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e4">
        <RenglonDeLaCaja que="Con tarjeta" cuanto={c.tarjeta} />
        {c.bizum > 0 && <RenglonDeLaCaja que="Bizum" cuanto={c.bizum} />}
        {c.cheque > 0 && <RenglonDeLaCaja que="Cheques" cuanto={c.cheque} />}
        <div className="flex justify-between">
          <span className="text-texto-suave">Tickets</span>
          <span className="font-bold tabular-nums">{c.tickets}</span>
        </div>
        <div className="flex justify-between gap-e3">
          <span className="text-texto-suave">Cajón sin venta</span>
          <span className="text-right font-bold">
            {sinVenta.length === 0
              ? '0'
              : `${String(sinVenta.length)} · ${[...new Set(sinVenta.map((m) => m.quien))].join(', ')}`}
          </span>
        </div>
      </section>
      <p className="text-secundario text-texto-tenue">Nada se cierra al mirarlo.</p>
    </div>
  );
}
