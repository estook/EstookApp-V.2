import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { crearRegistro, resolverEntorno } from '@estook/utiles';
import { arrancarObservabilidad } from '@estook/utiles/observabilidad';
import { Aplicacion } from './Aplicacion.tsx';
import './estilos.css';

const entorno = resolverEntorno(import.meta.env);

const sesion_id = arrancarObservabilidad({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  entorno,
  aplicacion: 'app',
  version: (import.meta.env['VITE_VERSION'] as string | undefined) ?? 'desarrollo',
});

const registro = crearRegistro({ base: { aplicacion: 'app', entorno, sesion_id } });
registro.informacion('aplicacion arrancada');

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <Aplicacion />
  </StrictMode>,
);
