import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo.
 *
 * Levantan las cuatro aplicaciones ya construidas **y la API** (M4), y comprueban
 * que arrancan, que no escupen errores en consola y que lo hacen dentro del
 * presupuesto de velocidad de B7.
 *
 * ── Por que ahora hace falta la API ──────────────────────────────────────────
 *
 * Hasta M3 no hacia falta: la aplicacion se pintaba con un perfil de muestra
 * elegido a mano en Ajustes. M4 tira ese andamio, asi que sin API no hay forma de
 * entrar, y sin entrar no se puede comprobar nada.
 *
 * La API que se levanta es **la de verdad**, contra un Postgres efimero: mismos
 * comandos, mismas politicas de seguridad, mismas puertas. Esta razonado en
 * `base-de-datos/herramientas/api-de-pruebas.mjs`.
 *
 * Ojo con una cosa: la aplicacion tiene que estar **construida apuntando a esa
 * API**, porque `VITE_API_URL` se hornea al construir. Se hace con
 * `pnpm prueba:e2e:completa`, que construye y prueba en el orden correcto.
 *
 * Se prueba tambien a lo ancho de un movil pequeno, porque la regla 11 dice que
 * nada se da por terminado sin verlo en movil. Eso no sustituye a mirarlo en un
 * telefono de verdad: lo automatico solo caza los desbordes.
 *
 * Sobre Safari: WebKit en Windows necesita librerias del sistema que no siempre
 * estan (`libsharpyuv.dll`, `libxml2.dll`), asi que su proyecto solo corre en
 * integracion continua, que es Linux y las instala con `--with-deps`. En local se
 * puede forzar con `CON_WEBKIT=1 pnpm prueba:e2e`.
 */
const APLICACIONES = [
  { nombre: 'web', puerto: 5173 },
  { nombre: 'app', puerto: 5174 },
  { nombre: 'carta', puerto: 5175 },
  { nombre: 'admin', puerto: 5176 },
];

const enCI = Boolean(process.env['CI']);
const conWebkit = enCI || Boolean(process.env['CON_WEBKIT']);

export default defineConfig({
  testDir: './pruebas/e2e',
  fullyParallel: true,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  reporter: enCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: { trace: 'on-first-retry' },

  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    {
      // Las medidas de un iPhone SE, que es el movil pequeno que hay que aguantar.
      name: 'movil-pequeno',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 667 } },
    },
    ...(conWebkit ? [{ name: 'movil-safari', use: { ...devices['iPhone SE'] } }] : []),
  ],

  webServer: [
    // La API primero: tarda en levantar el Postgres efimero y aplicar las
    // dieciocho migraciones, y las aplicaciones no sirven de nada sin ella.
    {
      command: 'pnpm api:pruebas',
      url: 'http://localhost:5177/salud',
      reuseExistingServer: !enCI,
      // Migraciones y semillas contra un Postgres compilado a WebAssembly. En una
      // maquina lenta pasa del minuto.
      timeout: 180_000,
    },
    ...APLICACIONES.map(({ nombre, puerto }) => ({
      command: `pnpm --filter @estook/${nombre} previsualiza`,
      url: `http://localhost:${puerto}`,
      reuseExistingServer: !enCI,
      timeout: 120_000,
    })),
  ],
});
