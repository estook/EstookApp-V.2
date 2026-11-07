import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { crearRegistro, resolverEntorno } from '@estook/utiles';
import { arrancarObservabilidad } from '@estook/utiles/observabilidad';
import { laFacturaDeLaDireccion } from '@estook/dominio';
import { LaCarta } from './LaCarta.tsx';
import { PideTuFactura } from './PideTuFactura.tsx';
import './estilos.css';

const entorno = resolverEntorno(import.meta.env);

const sesion_id = arrancarObservabilidad({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  entorno,
  aplicacion: 'carta',
  version: (import.meta.env['VITE_VERSION'] as string | undefined) ?? 'desarrollo',
});

const registro = crearRegistro({ base: { aplicacion: 'carta', entorno, sesion_id } });
registro.informacion('aplicación arrancada');

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

// **Esta aplicación es la que sirve lo que no es un fichero** (`publicar.yml`): la carta de un local
// y la página con la que el cliente pide su factura (T6 · 2 · 3, 0141).
const laFactura = laFacturaDeLaDireccion(window.location.pathname);
if (laFactura !== null) {
  // El código abre una puerta: la dirección no la tiene que guardar ningún buscador.
  const noLaGuardes = document.createElement('meta');
  noLaGuardes.name = 'robots';
  noLaGuardes.content = 'noindex';
  document.head.append(noLaGuardes);
}

createRoot(raiz).render(
  <StrictMode>
    {laFactura === null ? <LaCarta /> : <PideTuFactura codigoInicial={laFactura.codigo} />}
  </StrictMode>,
);
