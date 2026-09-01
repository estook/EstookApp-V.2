import * as Sentry from '@sentry/browser';
import type { Entorno } from './entorno.ts';
import { nuevaSesionId } from './correlacion.ts';

/**
 * Sentry (M0), detras de nuestra propia puerta.
 *
 * Se importa por `@estook/utiles/observabilidad`, nunca desde el indice: asi el
 * servidor y las pruebas no arrastran una libreria de navegador que no necesitan.
 *
 * Sin DSN no se enciende. Es lo normal en desarrollo y en pruebas: no queremos
 * ruido de nuestra propia maquina en el panel de errores.
 */
export interface OpcionesDeObservabilidad {
  readonly dsn: string | undefined;
  readonly entorno: Entorno;
  readonly aplicacion: 'web' | 'app' | 'carta' | 'admin';
  readonly version: string;
  /** El hilo de esta visita. Si no se pasa, se crea uno. */
  readonly sesion_id?: string;
}

export function arrancarObservabilidad(opciones: OpcionesDeObservabilidad): string {
  const sesion_id = opciones.sesion_id ?? nuevaSesionId();

  if (!opciones.dsn) return sesion_id;

  Sentry.init({
    dsn: opciones.dsn,
    environment: opciones.entorno,
    // La version es el commit exacto que se publico, para que Sentry pueda
    // senalar que cambio provoco el fallo.
    release: `${opciones.aplicacion}@${opciones.version}`,
    // Nada de grabar sesiones ni capturar el contenido de la pantalla: hay datos
    // de personas y de facturacion en cada vista. En el proyecto de Sentry estan
    // apagados «Session replay» y «Tracing» a proposito, y aqui no se enciende
    // nada que ellos no tengan encendido: si algun dia hace falta medir tiempos,
    // se enciende alli y se anade aqui `tracesSampleRate`.
    sendDefaultPii: false,
  });

  Sentry.setTags({
    aplicacion: opciones.aplicacion,
    sesion_id,
  });

  return sesion_id;
}

/** Marca quien esta dentro, sin datos personales: solo los identificadores. */
export function identificarSesion(datos: {
  usuario_id: string;
  organizacion_id?: string;
  local_id?: string;
}): void {
  Sentry.setUser({ id: datos.usuario_id });
  Sentry.setTags({
    organizacion_id: datos.organizacion_id ?? 'sin-organizacion',
    local_id: datos.local_id ?? 'sin-local',
  });
}
