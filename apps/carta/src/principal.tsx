import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { crearRegistro, resolverEntorno } from '@estook/utiles';
import { arrancarObservabilidad } from '@estook/utiles/observabilidad';
import { Cimientos } from './Cimientos.tsx';
import './estilos.css';

const entorno = resolverEntorno(import.meta.env);

const correlacion_id = arrancarObservabilidad({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  entorno,
  aplicacion: 'carta',
  version: '0.0.0',
});

const registro = crearRegistro({ correlacion_id, base: { aplicacion: 'carta', entorno } });
registro.informacion('aplicacion arrancada');

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <Cimientos aplicacion="carta" entorno={entorno} correlacionId={correlacion_id} />
  </StrictMode>,
);
