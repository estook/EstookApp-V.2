/**
 * Regla A4 del Plan de desarrollo, en un solo sentido:
 *   apps    ->  packages
 *   api     ->  aplicacion  ->  dominio
 *   dominio no importa nada de infraestructura ni de red.
 *
 * Esto no es un consejo: la integracion continua bloquea la fusion si se incumple.
 */
module.exports = {
  forbidden: [
    {
      name: 'sin-ciclos',
      severity: 'error',
      comment: 'Un ciclo de dependencias hace imposible razonar sobre el codigo.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'sin-huerfanos',
      severity: 'warn',
      comment: 'Fichero que nadie importa. O se usa, o se borra.',
      from: {
        orphan: true,
        pathNot: ['\\.d\\.ts$', '(^|/)vite\\.config\\.ts$', '(^|/)index\\.ts$'],
      },
      to: {},
    },

    {
      name: 'packages-no-importan-apps',
      severity: 'error',
      comment: 'Las dependencias van en un solo sentido: apps -> packages.',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'packages-no-importan-servidor',
      severity: 'error',
      comment: 'Un paquete compartido no puede depender del servidor.',
      from: { path: '^packages/' },
      to: { path: '^servidor/' },
    },
    {
      name: 'apps-no-importan-servidor',
      severity: 'error',
      comment: 'El cliente habla con el servidor por packages/cliente-api, nunca importandolo.',
      from: { path: '^apps/' },
      to: { path: '^servidor/' },
    },

    {
      name: 'dominio-compartido-sin-red',
      severity: 'error',
      comment:
        'Regla A4: packages/dominio son tipos, reglas puras y calculos. Sin red y sin base de datos.',
      from: { path: '^packages/dominio/' },
      to: { path: '^(node_modules/)?(axios|node-fetch|pg|postgres|@supabase/.+|undici)' },
    },
    {
      name: 'dominio-compartido-aislado',
      severity: 'error',
      comment: 'packages/dominio solo puede apoyarse en packages/utiles.',
      from: { path: '^packages/dominio/' },
      to: { path: '^packages/(?!dominio|utiles)' },
    },

    {
      name: 'servidor-dominio-sin-infraestructura',
      severity: 'error',
      comment: 'servidor/dominio son entidades e invariantes. No conoce como se guardan.',
      from: { path: '^servidor/dominio/' },
      to: { path: '^servidor/(infraestructura|api|trabajos|conectores|ia)/' },
    },
    {
      name: 'servidor-dominio-sin-red',
      severity: 'error',
      comment: 'servidor/dominio no importa clientes de red ni de base de datos.',
      from: { path: '^servidor/dominio/' },
      to: { path: '^(node_modules/)?(pg|postgres|@supabase/.+|hono|axios|undici|node-fetch)' },
    },
    {
      name: 'aplicacion-sin-api',
      severity: 'error',
      comment: 'El sentido es api -> aplicacion, nunca al reves.',
      from: { path: '^servidor/aplicacion/' },
      to: { path: '^servidor/api/' },
    },
    {
      name: 'aplicacion-sin-infraestructura-concreta',
      severity: 'error',
      comment:
        'La capa de aplicacion habla con puertos, no con Postgres. La implementacion se inyecta.',
      from: { path: '^servidor/aplicacion/' },
      to: { path: '^(node_modules/)?(pg|postgres|@supabase/.+)' },
    },
    {
      name: 'api-solo-transporte',
      severity: 'error',
      comment: 'servidor/api es transporte y validacion. No salta a dominio ni a infraestructura.',
      from: { path: '^servidor/api/' },
      to: { path: '^servidor/(dominio|infraestructura)/' },
    },

    {
      name: 'sin-dependencias-de-desarrollo-en-produccion',
      severity: 'error',
      comment: 'Una devDependency no puede acabar en el paquete que se despliega.',
      from: {
        path: '^(apps|packages|servidor)/',
        // vite.config es andamiaje de construccion y los .d.ts solo declaran tipos:
        // ninguno de los dos acaba en el paquete que descarga el navegador.
        pathNot: '(vite\\.config\\.ts|\\.d\\.ts)$',
      },
      to: {
        dependencyTypes: ['npm-dev'],
        pathNot: '^node_modules/(@types/|typescript/)',
      },
    },
    {
      name: 'sin-dependencias-no-declaradas',
      severity: 'error',
      comment: 'Si se importa, se declara en el package.json de ese paquete.',
      from: {},
      to: {
        dependencyTypes: ['unknown', 'undetermined', 'npm-no-pkg', 'npm-unknown'],
        // Un import de otro paquete del monorepo se resuelve por el enlace simbolico
        // de pnpm y aterriza en `packages/...`, asi que dependency-cruiser no lo sabe
        // clasificar. Que la dependencia este declarada lo garantiza pnpm: sin
        // `workspace:*` en el package.json, el enlace no existe y no resolveria.
        pathNot: '^(apps|packages|servidor)/',
      },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    // Fuera del analisis de capas: lo construido, y las pruebas (que usan vitest,
    // dependencia de la raiz).
    exclude: { path: '(\\.prueba\\.tsx?$|(^|/)dist/)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
