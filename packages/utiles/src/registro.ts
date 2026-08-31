import { correlacionIdDeEntrada } from './correlacion.ts';

/**
 * El registro de Estook (M0).
 *
 * Una linea por suceso, en JSON, con su `correlacion_id` siempre puesto.
 * No hay `console.log` sueltos en el proyecto: la regla de lint los prohibe y
 * todo pasa por aqui, para que en produccion se pueda apagar o redirigir.
 */
export type Nivel = 'depuracion' | 'informacion' | 'aviso' | 'error';

const ORDEN: Record<Nivel, number> = {
  depuracion: 10,
  informacion: 20,
  aviso: 30,
  error: 40,
};

export interface Linea {
  readonly momento: string;
  readonly nivel: Nivel;
  readonly mensaje: string;
  readonly correlacion_id: string;
  readonly [dato: string]: unknown;
}

export interface Registro {
  depuracion(mensaje: string, datos?: Record<string, unknown>): void;
  informacion(mensaje: string, datos?: Record<string, unknown>): void;
  aviso(mensaje: string, datos?: Record<string, unknown>): void;
  error(mensaje: string, datos?: Record<string, unknown>): void;
  /** Deriva un registro hijo que arrastra los mismos datos y la misma correlacion. */
  con(datos: Record<string, unknown>): Registro;
  readonly correlacion_id: string;
}

export interface OpcionesDeRegistro {
  readonly correlacion_id?: string | undefined;
  readonly minimo?: Nivel;
  readonly base?: Record<string, unknown>;
  /** Por defecto escribe en la consola. Se sustituye en pruebas y en el servidor. */
  readonly escribir?: (linea: Linea) => void;
}

function escribirEnConsola(linea: Linea): void {
  const texto = JSON.stringify(linea);
  if (linea.nivel === 'error') console.error(texto);
  else if (linea.nivel === 'aviso') console.warn(texto);
  // eslint-disable-next-line no-console -- el registro es el unico sitio del proyecto que escribe por consola
  else console.log(texto);
}

export function crearRegistro(opciones: OpcionesDeRegistro = {}): Registro {
  const correlacion_id = correlacionIdDeEntrada(opciones.correlacion_id);
  const minimo = opciones.minimo ?? 'informacion';
  const base = opciones.base ?? {};
  const escribir = opciones.escribir ?? escribirEnConsola;

  function emitir(nivel: Nivel, mensaje: string, datos?: Record<string, unknown>): void {
    if (ORDEN[nivel] < ORDEN[minimo]) return;
    escribir({
      // El sello de hora del registro no es la fecha operativa: esa la decide el servidor (regla 10).
      // eslint-disable-next-line no-restricted-syntax -- sello tecnico, no fecha de negocio
      momento: new Date().toISOString(),
      nivel,
      mensaje,
      correlacion_id,
      ...base,
      ...datos,
    });
  }

  return {
    correlacion_id,
    depuracion: (mensaje, datos) => {
      emitir('depuracion', mensaje, datos);
    },
    informacion: (mensaje, datos) => {
      emitir('informacion', mensaje, datos);
    },
    aviso: (mensaje, datos) => {
      emitir('aviso', mensaje, datos);
    },
    error: (mensaje, datos) => {
      emitir('error', mensaje, datos);
    },
    con: (datos) =>
      crearRegistro({
        correlacion_id,
        minimo,
        base: { ...base, ...datos },
        ...(opciones.escribir ? { escribir: opciones.escribir } : {}),
      }),
  };
}
