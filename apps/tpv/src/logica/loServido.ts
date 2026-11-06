import type { LaMesa, PlatoDeLaCuenta } from '../datos/tipos.ts';
import { elDetalle, elPase } from './laCuenta.ts';

/**
 * **Lo que el camarero marca servido** (R2 · 2, decisión 0132; la pausa del 5-nov, punto 1.2),
 * sin pintar nada: qué platos de la mesa salen en la hoja «Servido» y cómo.
 *
 *   · `por_servir`: en marcha en cocina, o en la barra: se marca con un toque
 *   · `servido`: ya salió. Si lo marcó la sala, se puede desmarcar; si lo tachó la cocina, no
 *   · `espera`: su pase aún no está marchado: no se sirve lo que nadie está haciendo
 *
 * Solo lo que la sala puede marcar en este local (`marcanServido`): lo de la cocina, lo de la
 * barra o las dos. Lo de nadie (el pan, el agua) y la línea de un menú no se sirven aquí.
 */
export type ComoEstaParaServir = 'por_servir' | 'servido' | 'espera';

export interface PlatoParaServir {
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly detalle: string | null;
  readonly como: ComoEstaParaServir;
  /** Lo marcó la sala: se puede desmarcar. */
  readonly deLaSala: boolean;
}

export interface GrupoParaServir {
  readonly clave: string;
  readonly titulo: string;
  readonly platos: readonly PlatoParaServir[];
}

function comoEsta(p: PlatoDeLaCuenta): ComoEstaParaServir | null {
  if (p.estado === 'salio') return 'servido';
  if (p.estado === 'en_marcha' || p.estado === 'en_la_barra') return 'por_servir';
  if (p.estado === 'en_espera') return 'espera';
  return null;
}

function paraServir(p: PlatoDeLaCuenta): PlatoParaServir | null {
  const como = comoEsta(p);
  if (como === null) return null;
  return {
    id: p.id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    detalle: elDetalle(p.opciones ?? [], p.pesoGramos ?? null),
    como,
    deLaSala: p.servidoEnSala === true,
  };
}

/** Los grupos de la hoja «Servido»: las bebidas, y cada pase de cocina en su orden. */
export function losGruposParaServir(mesa: LaMesa): GrupoParaServir[] {
  const puede = mesa.marcanServido ?? { cocina: false, barra: false };
  const grupos: GrupoParaServir[] = [];
  if (puede.barra) {
    const bebidas = mesa.platos
      .filter((p) => p.destino === 'barra')
      .flatMap((p) => {
        const x = paraServir(p);
        return x === null ? [] : [x];
      });
    if (bebidas.length > 0) grupos.push({ clave: 'barra', titulo: 'Bebidas', platos: bebidas });
  }
  if (puede.cocina) {
    const numeros = [
      ...new Set(
        mesa.platos.flatMap((p) => (p.destino === 'cocina' && p.pase !== null ? [p.pase] : [])),
      ),
    ].sort((a, b) => a - b);
    for (const numero of numeros) {
      const platos = mesa.platos
        .filter((p) => p.destino === 'cocina' && p.pase === numero)
        .flatMap((p) => {
          const x = paraServir(p);
          return x === null ? [] : [x];
        });
      if (platos.length === 0) continue;
      const como = platos.every((p) => p.como === 'servido')
        ? 'ya servido'
        : platos.every((p) => p.como === 'espera')
          ? 'espera a marchar'
          : 'en cocina';
      grupos.push({
        clave: `pase-${String(numero)}`,
        titulo: mesa.porPases ? `${elPase(numero)} · ${como}` : `Todo junto · ${como}`,
        platos,
      });
    }
  }
  return grupos;
}

/** Lo que dice el botón de abajo, según lo tocado. Nulo: aún no hay nada que guardar. */
export function loQueDiceElBoton(marcar: number, desmarcar: number): string | null {
  if (marcar > 0 && desmarcar === 0) {
    return marcar === 1 ? 'Marcar 1 servido' : `Marcar ${String(marcar)} servidos`;
  }
  if (marcar === 0 && desmarcar > 0) {
    return desmarcar === 1 ? 'Quitar 1 de servido' : `Quitar ${String(desmarcar)} de servido`;
  }
  if (marcar > 0 && desmarcar > 0) return 'Guardar';
  return null;
}
