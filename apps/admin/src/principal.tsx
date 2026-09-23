import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { crearRegistro, resolverEntorno } from '@estook/utiles';
import { arrancarObservabilidad, avisarDelFallo } from '@estook/utiles/observabilidad';
import { SiAlgoFalla } from '@estook/ui';
import { Aplicacion } from './Aplicacion.tsx';
import './estilos.css';

const entorno = resolverEntorno(import.meta.env);

const sesion_id = arrancarObservabilidad({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  entorno,
  aplicacion: 'admin',
  version: (import.meta.env['VITE_VERSION'] as string | undefined) ?? 'desarrollo',
});

const registro = crearRegistro({ base: { aplicacion: 'admin', entorno, sesion_id } });
registro.informacion('aplicación arrancada');

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    {/* La misma red que la app (entrega V): nunca una pantalla en blanco. */}
    <SiAlgoFalla
      aPantallaCompleta
      alFallar={(fallo) => {
        avisarDelFallo(fallo, 'admin');
      }}
    >
      <Aplicacion entorno={entorno} sesionId={sesion_id} />
    </SiAlgoFalla>
  </StrictMode>,
);
