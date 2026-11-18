import { useMemo, useSyncExternalStore } from 'react';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarAlSegundo, usarElPlano, usarLasImpresoras } from './usarLaSala.ts';
import { losAvisosDeAhora, type AvisoDelTpv } from '../avisos/losAvisos.ts';

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
    });
  }, [plano.data, impresoras.data, aparato.funcion, yo.permisos]);
}
