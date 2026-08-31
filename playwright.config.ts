import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo.
 *
 * Levantan las cuatro aplicaciones ya construidas y comprueban lo unico que M0
 * promete: que arrancan, que no escupen errores en consola y que lo hacen dentro
 * del presupuesto de velocidad de B7.
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

  webServer: APLICACIONES.map(({ nombre, puerto }) => ({
    command: `pnpm --filter @estook/${nombre} previsualiza`,
    url: `http://localhost:${puerto}`,
    reuseExistingServer: !enCI,
    timeout: 120_000,
  })),
});
