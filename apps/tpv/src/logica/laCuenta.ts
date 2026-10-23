import type { LaMesa, PlatoDeLaCuenta } from '../datos/tipos.ts';
import type { Borrador, LineaNueva } from './comanda.ts';

/**
 * Cómo se lee la cuenta de una mesa en la pantalla (0106), en el orden en que se come:
 *
 *   1. **Bebidas**, lo de la barra.
 *   2. **Los menús**: cuántos y a cuánto (lo que se cobra).
 *   3. **El 1.º, el 2.º…**, cada uno con cómo va: en espera, en marcha o ha salido todo.
 *   4. **Lo nuevo**, sin mandar, abajo, que es lo que el camarero tiene entre manos.
 *
 * Lo quitado sale tachado en su sitio, con su motivo: nadie tiene que preguntar dónde
 * fue a parar el pollo.
 */

export interface LineaALaVista {
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  /** Lo de la línea entera: cantidad por precio. Nulo en los platos de un menú sin suplemento. */
  readonly importeCentimos: number | null;
  readonly nota: string | null;
  readonly delMenu: boolean;
  readonly salio: boolean;
  readonly quitada: string | null;
  readonly vuelve: string | null;
  readonly pase: number | null;
  /** Sin mandar: se puede cambiar o quitar sin pedir permiso a nadie. */
  readonly nueva: boolean;
  /** Pedida y guardada en la API pero sin mandar (desde otro aparato). */
  readonly guardada: boolean;
}

export type ComoVaElPase = 'en_espera' | 'en_marcha' | 'ha_salido';

export interface GrupoDeLaCuenta {
  readonly clave: string;
  readonly titulo: string;
  readonly como: ComoVaElPase | null;
  readonly lineas: readonly LineaALaVista[];
}

function deLaApi(p: PlatoDeLaCuenta): LineaALaVista {
  return {
    id: p.id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    importeCentimos:
      p.parteDe !== null && p.precioCentimos === 0 ? null : p.precioCentimos * p.cantidad,
    nota: p.nota,
    delMenu: p.parteDe !== null,
    salio: p.estado === 'salio',
    quitada: p.estado === 'quitado' ? (p.motivoDeQuitar ?? '') : null,
    vuelve: p.vuelve,
    pase: p.pase,
    nueva: false,
    guardada: p.estado === 'sin_mandar',
  };
}

function delBorrador(l: LineaNueva): LineaALaVista {
  return {
    id: l.id,
    nombre: l.nombre,
    cantidad: l.cantidad,
    importeCentimos:
      l.parteDe !== null && l.precioCentimos === 0 ? null : l.precioCentimos * l.cantidad,
    nota: l.nota,
    delMenu: l.parteDe !== null,
    salio: false,
    quitada: null,
    vuelve: null,
    pase: l.pase,
    nueva: true,
    guardada: false,
  };
}

/** «1.º», «2.º»… como se dice en sala. */
export function elPase(numero: number): string {
  return `${numero}.º`;
}

const COMO_VA: Record<ComoVaElPase, string> = {
  en_espera: 'en espera',
  en_marcha: 'en marcha',
  ha_salido: 'ha salido todo',
};

export function losGruposDeLaCuenta(
  mesa: LaMesa | undefined,
  borrador: Borrador,
): GrupoDeLaCuenta[] {
  const platos = mesa?.platos ?? [];
  const yaMandados = platos.filter((p) => p.estado !== 'sin_mandar');
  const grupos: GrupoDeLaCuenta[] = [];

  const bebidas = yaMandados.filter((p) => p.destino === 'barra' && p.parteDe === null);
  if (bebidas.length > 0) {
    grupos.push({ clave: 'bebidas', titulo: 'Bebidas', como: null, lineas: bebidas.map(deLaApi) });
  }

  const menus = yaMandados.filter((p) => p.menuId !== null && p.parteDe === null);
  if (menus.length > 0) {
    grupos.push({ clave: 'menus', titulo: 'Menús', como: null, lineas: menus.map(deLaApi) });
  }

  const numeros = [
    ...new Set(
      yaMandados.flatMap((p) => (p.destino === 'cocina' && p.pase !== null ? [p.pase] : [])),
    ),
  ].sort((a, b) => a - b);
  for (const numero of numeros) {
    const pase = mesa?.pases.find((p) => p.numero === numero);
    const como: ComoVaElPase =
      pase === undefined || pase.marchadoEn === null
        ? 'en_espera'
        : pase.haSalido
          ? 'ha_salido'
          : 'en_marcha';
    grupos.push({
      clave: `pase-${numero}`,
      titulo: `${elPase(numero)} · ${COMO_VA[como]}`,
      como,
      lineas: yaMandados.filter((p) => p.destino === 'cocina' && p.pase === numero).map(deLaApi),
    });
  }

  // Las bebidas de un menú van con su menú en la barra: se ven con las bebidas.
  const bebidasDelMenu = yaMandados.filter((p) => p.destino === 'barra' && p.parteDe !== null);
  if (bebidasDelMenu.length > 0) {
    const primero = grupos.find((g) => g.clave === 'bebidas');
    const lineas = [...(primero?.lineas ?? []), ...bebidasDelMenu.map(deLaApi)];
    if (primero === undefined) {
      grupos.unshift({ clave: 'bebidas', titulo: 'Bebidas', como: null, lineas });
    } else {
      grupos[grupos.indexOf(primero)] = { ...primero, lineas };
    }
  }

  const nuevas = [
    ...platos.filter((p) => p.estado === 'sin_mandar').map(deLaApi),
    ...borrador.map(delBorrador),
  ];
  if (nuevas.length > 0) {
    grupos.push({ clave: 'nuevo', titulo: 'Nuevo · sin mandar', como: null, lineas: nuevas });
  }
  return grupos;
}

/**
 * Qué pase se pide por defecto al tocar un plato de comida: el 1.º si la mesa no tiene
 * nada en cocina; si ya tiene, **el último pase con algo**, que es lo que suele querer
 * el camarero cuando añade («otro pan con tomate con lo que están comiendo»). Lo cambia
 * con un toque.
 */
export function elPaseDeFabrica(mesa: LaMesa | undefined, borrador: Borrador): number {
  const enLaMesa = (mesa?.platos ?? []).flatMap((p) =>
    p.destino === 'cocina' && p.pase !== null && p.estado !== 'quitado' ? [p.pase] : [],
  );
  const nuevos = borrador.flatMap((l) => (l.pase === null ? [] : [l.pase]));
  const todos = [...enLaMesa, ...nuevos];
  return todos.length === 0 ? 1 : Math.max(...todos);
}

/** Cuántos pases se pueden elegir: los que hay, y uno más (el siguiente). */
export function losPasesQueSeEligen(mesa: LaMesa | undefined, borrador: Borrador): number[] {
  const hasta = Math.min(Math.max(elPaseDeFabrica(mesa, borrador), 1) + 1, 9);
  return Array.from({ length: Math.max(hasta, 3) }, (_, i) => i + 1).slice(0, 9);
}
