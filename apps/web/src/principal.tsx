import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { crearRegistro, resolverEntorno } from '@estook/utiles';
import { arrancarObservabilidad } from '@estook/utiles/observabilidad';
import { Cimientos } from './Cimientos.tsx';
import './estilos.css';

const entorno = resolverEntorno(import.meta.env);

const sesion_id = arrancarObservabilidad({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  entorno,
  aplicacion: 'web',
  version: '0.0.0',
});

const registro = crearRegistro({ base: { aplicacion: 'web', entorno, sesion_id } });
registro.informacion('aplicacion arrancada');

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <Cimientos aplicacion="web" entorno={entorno} sesionId={sesion_id} />
  </StrictMode>,
);
