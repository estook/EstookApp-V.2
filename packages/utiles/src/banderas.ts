import type { Entorno } from './entorno.ts';

/**
 * Banderas de funcion (M0).
 *
 * Sirven para que una funcion a medias pueda estar fusionada sin estar encendida.
 * El catalogo es cerrado y tipado: una bandera que no este aqui no existe, para que
 * no acaben apareciendo cadenas sueltas por el codigo.
 *
 * En M25 estas banderas se podran encender por local desde Ajustes. Hasta entonces
 * el valor sale del catalogo y se puede pisar por variable de entorno.
 */
export const BANDERAS = {
  /** El modo demostracion con el restaurante ficticio. */
  modo_demostracion: {
    descripcion: 'Ensena el restaurante ficticio y permite salir de el sin dejar rastro',
    por_entorno: {
      desarrollo: true,
      pruebas: true,
      demostracion: true,
      produccion: false,
    },
  },
  /** Las trazas detalladas del registro. Caras: solo cuando hacen falta. */
  registro_detallado: {
    descripcion: 'Escribe en el registro el detalle de cada comando y cada consulta',
    por_entorno: {
      desarrollo: true,
      pruebas: false,
      demostracion: false,
      produccion: false,
    },
  },
} as const satisfies Record<string, DefinicionDeBandera>;

export type NombreDeBandera = keyof typeof BANDERAS;

interface DefinicionDeBandera {
  readonly descripcion: string;
  readonly por_entorno: Readonly<Record<Entorno, boolean>>;
}

/**
 * Una variable llamada `VITE_BANDERA_MODO_DEMOSTRACION=1` enciende `modo_demostracion`.
 * Vale `1`, `true` o `si` para encender; `0`, `false` o `no` para apagar.
 */
function pisadaDeEntorno(
  bandera: NombreDeBandera,
  variables: Record<string, string | undefined>,
): boolean | undefined {
  const sufijo = bandera.toUpperCase();
  const bruto = variables[`VITE_BANDERA_${sufijo}`] ?? variables[`BANDERA_${sufijo}`];
  if (bruto === undefined) return undefined;
  const normalizado = bruto.trim().toLowerCase();
  if (['1', 'true', 'si', 'sí'].includes(normalizado)) return true;
  if (['0', 'false', 'no'].includes(normalizado)) return false;
  return undefined;
}

export function banderaEncendida(
  bandera: NombreDeBandera,
  entorno: Entorno,
  variables: Record<string, string | undefined> = {},
): boolean {
  return pisadaDeEntorno(bandera, variables) ?? BANDERAS[bandera].por_entorno[entorno];
}

/** El estado completo, para pintarlo en la pantalla de diagnostico. */
export function estadoDeLasBanderas(
  entorno: Entorno,
  variables: Record<string, string | undefined> = {},
): Record<NombreDeBandera, boolean> {
  const salida = {} as Record<NombreDeBandera, boolean>;
  for (const nombre of Object.keys(BANDERAS) as NombreDeBandera[]) {
    salida[nombre] = banderaEncendida(nombre, entorno, variables);
  }
  return salida;
}
