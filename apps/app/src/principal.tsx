import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { crearRegistro, resolverEntorno } from '@estook/utiles';
import { arrancarObservabilidad, avisarDelFallo } from '@estook/utiles/observabilidad';
import { SiAlgoFalla } from '@estook/ui';
import { Aplicacion } from './Aplicacion.tsx';
import { cacheDeLaApp } from './datos/cacheDeLaApp.ts';
import { DIRECCION_DE_LA_API, leerToken } from './datos/cliente.ts';
import { recuperarLoGuardado } from './sinConexion/cacheGuardada.ts';
import { cargarLoPendiente } from './sinConexion/cola.ts';
import { escucharSiSePuedeInstalar } from './sinConexion/instalar.ts';
import { vigilarLaVuelta } from './sinConexion/red.ts';
import { ponerElTrabajador } from './sinConexion/trabajador.ts';
import './estilos.css';

const entorno = resolverEntorno(import.meta.env);

const sesion_id = arrancarObservabilidad({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  entorno,
  aplicacion: 'app',
  version: (import.meta.env['VITE_VERSION'] as string | undefined) ?? 'desarrollo',
});

const registro = crearRegistro({ base: { aplicacion: 'app', entorno, sesion_id } });
registro.informacion('aplicación arrancada');

// I · La app instalable (0070): el trabajador de servicio, el «se puede instalar» del
// navegador (llega una vez y al cargar), y **lo último que se vio**, recuperado del
// móvil antes de pintar: sin señal, la app abre con eso en vez de quedarse en blanco.
ponerElTrabajador();
escucharSiSePuedeInstalar();
vigilarLaVuelta(DIRECCION_DE_LA_API);
await Promise.all([
  recuperarLoGuardado(cacheDeLaApp, leerToken(), 'al_abrir'),
  cargarLoPendiente(),
]);

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    {/* La red de la raíz: si algo se rompe fuera de las pantallas —el alta, la
        puerta—, se dice a pantalla completa en vez de quedarse en blanco. */}
    <SiAlgoFalla
      aPantallaCompleta
      alFallar={(fallo) => {
        avisarDelFallo(fallo, 'raiz');
      }}
    >
      <Aplicacion />
    </SiAlgoFalla>
  </StrictMode>,
);
