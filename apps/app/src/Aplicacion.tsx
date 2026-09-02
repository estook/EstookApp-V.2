import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Cargando, EstadoVacio, ProveedorDeDeshacer } from '@estook/ui';
import { Esqueleto } from './Esqueleto.tsx';
import { Ajustes } from './pantallas/Ajustes.tsx';
import { Panel } from './pantallas/Panel.tsx';
import { PantallaDeApp } from './pantallas/PantallaDeApp.tsx';
import { VistaDeCadena } from './pantallas/VistaDeCadena.tsx';
import { Entrar } from './sesion/Entrar.tsx';
import {
  CuentaParada,
  ElegirLocal,
  ElegirOrganizacion,
  PedirDobleFactor,
  PonerMiContrasena,
} from './sesion/Puerta.tsx';
import { ProveedorDeSesion, usarSesion } from './sesion/Sesion.tsx';

/**
 * La aplicacion entera (M3, con la puerta de M4).
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
 *     Sesion         quien ha entrado, donde esta y que puede
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
          <Puerta />
        </ProveedorDeDeshacer>
      </ProveedorDeSesion>
    </QueryClientProvider>
  );
}

/**
 * Quien entra, y a donde (M4).
 *
 * **Aqui esta el cambio mas grande que M4 le hace a M3**: hasta ahora la
 * aplicacion se pintaba entera desde el primer instante. Ahora, antes de pintar
 * el esqueleto, hay que saber quien es y a donde va.
 *
 * ── Y por que el orden de estos `if` no es negociable ────────────────────────
 *
 * Cada uno tapa al siguiente, y esa es su gracia. Quien tiene el segundo factor
 * pendiente **no ve el Panel por debajo**, ni un parpadeo. Si se pintaran a la
 * vez y se tapara con una capa encima, los datos ya estarian en la pantalla y
 * bastaria con quitar la capa desde el navegador.
 *
 * No es que esto proteja nada por si solo —lo que protege es que el servidor no
 * envia nada con la sesion a medias— pero una aplicacion que ensena por debajo lo
 * que dice que esta tapando acaba ensenandolo de verdad el dia que alguien
 * cambie el orden.
 */
function Puerta() {
  const { yo, cargando, hayApi } = usarSesion();

  // Sin API no hay a quien preguntar. Se dice, en la propia pantalla de entrar.
  if (!hayApi) return <Entrar />;

  if (cargando) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fondo">
        <Cargando que="tu sesión" />
      </main>
    );
  }

  if (yo === null) return <Entrar />;

  // 1 · El segundo factor, antes que nada: la sesion esta a medias y el servidor
  //     no va a contestar a nada mas.
  if (yo.faltaDobleFactor) return <PedirDobleFactor />;

  // 2 · La contrasena que puso otra persona.
  if (yo.debeCambiarClave) return <PonerMiContrasena />;

  // 3 · Y las tres paradas de la resolucion de destino.
  if (yo.destino === 'cuenta_parada') return <CuentaParada porque={yo.porque} />;
  if (yo.destino === 'elegir_organizacion') return <ElegirOrganizacion />;
  if (yo.destino === 'elegir_local') return <ElegirLocal />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Esqueleto />}>
          <Route
            index
            // «Un area manager no entra en un local: entra en su conjunto»
            // (Roles, 2.1). Con alcance de cadena, la pantalla de inicio no es el
            // Panel de un local: es el consolidado.
            element={yo.destino === 'vista_de_cadena' ? <VistaDeCadena /> : <Panel />}
          />
          <Route path="cadena" element={<VistaDeCadena />} />
          <Route path="ajustes" element={<Ajustes />} />
          {/* App -> vista. Tres niveles como mucho (B5). */}
          <Route path=":app" element={<PantallaDeApp />} />
          <Route path=":app/:pestana" element={<PantallaDeApp />} />
          <Route path="*" element={<NoEstaAqui />} />
        </Route>
      </Routes>
    </HashRouter>
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
