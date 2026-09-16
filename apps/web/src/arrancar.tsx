import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { crearRegistro, resolverEntorno } from '@estook/utiles';
import { arrancarObservabilidad } from '@estook/utiles/observabilidad';
import './estilos.css';

/**
 * Arrancar una página de la web pública (0042).
 *
 * La web tiene tres páginas —la portada, la privacidad y las condiciones— y las
 * tres arrancan igual: los errores a Sentry, el registro y el pintado. Escrito una
 * vez, aquí.
 */
export function arrancar(pagina: string, contenido: ReactNode): void {
  const entorno = resolverEntorno(import.meta.env);

  const sesionId = arrancarObservabilidad({
    dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
    entorno,
    aplicacion: 'web',
    version: (import.meta.env['VITE_VERSION'] as string | undefined) ?? 'desarrollo',
  });

  crearRegistro({ base: { aplicacion: 'web', entorno, sesion_id: sesionId } }).informacion(
    `${pagina} arrancada`,
  );

  const raiz = document.getElementById('raiz');
  if (!raiz) throw new Error('Falta el elemento #raiz en el HTML');

  createRoot(raiz).render(<StrictMode>{contenido}</StrictMode>);
}
