import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { EstadoVacio, ProveedorDeDeshacer } from '@estook/ui';
import { Esqueleto } from './Esqueleto.tsx';
import { Ajustes } from './pantallas/Ajustes.tsx';
import { Panel } from './pantallas/Panel.tsx';
import { PantallaDeApp } from './pantallas/PantallaDeApp.tsx';
import { ProveedorDeSesion } from './sesion/Sesion.tsx';

/**
 * La aplicacion entera (M3).
 *
 * ── Por que `HashRouter` y no el normal ──────────────────────────────────────
 *
 * Estook se publica hoy en GitHub Pages (decision 0001), que sirve **ficheros**:
 * no sabe reescribir `/app/inventario/hoy` a `index.html`, asi que abrir un
 * enlace profundo, o recargar dentro de una app, daria un 404. Con la almohadilla
 * la direccion es `/app/#/inventario/hoy`, el servidor solo ve `/app/` y siempre
 * encuentra la pagina.
 *
 * No es para siempre: el dia que haya `estook.com` con un servidor que reescriba,
 * se cambia por `BrowserRouter` y las direcciones se quedan mas limpias. Esta
 * escrito en `docs/decisiones/0008`.
 *
 * ── Los tres proveedores, en este orden ──────────────────────────────────────
 *
 *   TanStack Query   la cache de lo que dice el servidor
 *     Sesion         quien pregunta y que puede (M4 lo sustituye)
 *       Deshacer     la barra de diez segundos, una sola para toda la app
 *
 * Deshacer va dentro del todo y **fuera del enrutador** a proposito: si estuviera
 * dentro de una pantalla, navegar despues de hacer algo se llevaria por delante
 * la barra. Y navegar justo despues de hacer algo es cuando uno se da cuenta de
 * que no queria hacerlo.
 */
const cache = new QueryClient({
  defaultOptions: {
    queries: {
      // Un minuto: lo que dice el servidor sobre permisos y busquedas no cambia
      // cada segundo, y reintentar cada vez que se abre una pantalla en un movil
      // con mala cobertura es gastar bateria para nada.
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Aplicacion() {
  return (
    <QueryClientProvider client={cache}>
      <ProveedorDeSesion>
        <ProveedorDeDeshacer>
          <HashRouter>
            <Routes>
              <Route element={<Esqueleto />}>
                <Route index element={<Panel />} />
                <Route path="ajustes" element={<Ajustes />} />
                {/* App -> vista. Tres niveles como mucho (B5). */}
                <Route path=":app" element={<PantallaDeApp />} />
                <Route path=":app/:pestana" element={<PantallaDeApp />} />
                <Route path="*" element={<NoEstaAqui />} />
              </Route>
            </Routes>
          </HashRouter>
        </ProveedorDeDeshacer>
      </ProveedorDeSesion>
    </QueryClientProvider>
  );
}

/**
 * Cuando la direccion no lleva a ningun sitio.
 *
 * «Nunca una pantalla en blanco» (B4). Tambien vale para un 404: dice que ha
 * pasado y da la salida.
 */
function NoEstaAqui() {
  return (
    <EstadoVacio
      titulo="Esta direccion no lleva a ningun sitio"
      frase="Puede que el enlace este mal copiado, o que sea de una pantalla que todavia no existe."
      accion={
        <Link
          to="/"
          className="inline-flex min-h-toque items-center rounded-medio border border-borde-fuerte bg-superficie px-e4 text-cuerpo font-medium hover:bg-fondo"
        >
          Volver al Panel
        </Link>
      }
    />
  );
}
