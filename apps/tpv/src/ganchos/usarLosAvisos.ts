import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarAlSegundo, usarElPlano, usarLasImpresoras } from './usarLaSala.ts';
import { usarLaCaja } from './usarLaCaja.ts';
import { losAvisosDeAhora, type AvisoDelTpv } from '../avisos/losAvisos.ts';
import { losAvisosDeLasReservas } from '../reservas/logica.ts';
import { usarLasReservas } from './usarLasReservas.ts';

/**
 * **Los avisos y la campana** (el rediseño, entrega 2 · 2, 0148): qué avisos hay ahora para quien
 * está en este aparato, si la campana está abierta y qué se ha quitado de la vista. Lo comparten la
 * barra de arriba, la de abajo del móvil y los avisos apilados.
 */

// ── La campana, abierta o cerrada, y lo quitado de la vista: lo comparten la barra y los avisos ──

let campanaAbierta = false;
const quitados = new Set<string>();
let version = 0;
const quienEscucha = new Set<() => void>();

function avisar() {
  version += 1;
  for (const f of quienEscucha) f();
}
function escuchar(f: () => void) {
  quienEscucha.add(f);
  return () => {
    quienEscucha.delete(f);
  };
}

export function abrirLaCampana(): void {
  campanaAbierta = true;
  avisar();
}
export function cerrarLaCampana(): void {
  campanaAbierta = false;
  avisar();
}
export function quitarDeLaVista(id: string): void {
  quitados.add(id);
  avisar();
}

export function usarLaCampana() {
  useSyncExternalStore(escuchar, () => version);
  return { abierta: campanaAbierta, quitados };
}

/** Los avisos de ahora, para quien está en este aparato. */
export function usarLosAvisos(): readonly AvisoDelTpv[] {
  const { yo, aparato } = usarSesion();
  const conectado = usarAlSegundo();
  const tomaNota = puedeEditar(yo.permisos, 'accion.tomar_nota');
  const plano = usarElPlano(conectado);
  const impresoras = usarLasImpresoras(conectado, tomaNota);
  // «Retirar» (E2, 0152) sale de la caja: solo en el aparato con cajón, y la API solo lo dice a quien
  // la lleva.
  const caja = usarLaCaja();
  const retirar = aparato.funcion === 'caja' ? (caja.data?.retirar ?? null) : null;
  const turnoId = caja.data?.abierta?.turnoId ?? null;
  // Las reservas de hoy (la Ampliación 5 · 1, 0153); y la hora, cada medio minuto, para que «llegan
  // en 10 minutos» y «llevan retraso» salgan solos aunque no cambie nada más.
  const reservas = usarLasReservas(undefined, tomaNota);
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const reloj = window.setInterval(() => {
      setAhora(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(reloj);
    };
  }, []);
  return useMemo(() => {
    const datos = plano.data;
    const cuentas =
      datos === undefined
        ? []
        : [
            ...datos.zonas.flatMap((z) =>
              z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta])),
            ),
            ...datos.sinMesa,
          ];
    return losAvisosDeAhora({
      cuentas,
      impresoras: impresoras.data?.avisos ?? [],
      enLaCaja: aparato.funcion === 'caja',
      esEncargado: puedeEditar(yo.permisos, 'accion.quitar_de_cocina'),
      retirar: retirar === null || turnoId === null ? null : { ...retirar, turnoId },
      reservas:
        reservas.data?.encendidas === true
          ? losAvisosDeLasReservas(reservas.data.reservas, ahora, reservas.data.liberarTras).map(
              (a) => ({ ...a, ahora }),
            )
          : [],
    });
  }, [
    plano.data,
    impresoras.data,
    aparato.funcion,
    yo.permisos,
    retirar,
    turnoId,
    reservas.data,
    ahora,
  ]);
}
