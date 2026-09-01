import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '_publicacion/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Los ficheros sueltos de herramientas no tienen tsconfig propio.
          allowDefaultProject: ['*.js', '*.cjs', '*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Regla 9 · el dinero va en centimos enteros, nunca en coma flotante.
      // Regla 10 · la fecha operativa la decide el servidor, no el navegador.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='round']",
          message:
            'Regla 9: el dinero va en centimos enteros. Usa los motores de @estook/dominio (dinero, coste) en vez de redondear por tu cuenta.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            'Regla 10: la fecha operativa la decide el servidor. Usa jornadaDe() de @estook/dominio, que recibe el instante desde fuera.',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Los motores de dinero y de coste son los DUENOS del redondeo (regla 6: un
  // calculo, un unico dueno). Son el unico sitio del proyecto donde `Math.round`
  // esta permitido, y por eso la regla 9 apunta a ellos: para que nadie mas
  // redondee dinero por su cuenta. Si esta lista crece, algo se esta haciendo mal.
  {
    files: ['packages/dominio/src/dinero.ts', 'packages/dominio/src/coste.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // Las cuatro aplicaciones: React en el navegador.
  {
    files: ['apps/**/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    languageOptions: { globals: globals.browser },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Servidor y herramientas: Node, y ahi si se puede escribir por consola.
  {
    files: ['servidor/**/*.ts', 'base-de-datos/**/*.mjs', 'herramientas/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  // Los ficheros de configuracion no entran en el proyecto de tipos.
  {
    files: [
      '*.config.{js,ts,mjs,cjs}',
      '.dependency-cruiser.cjs',
      'herramientas/**/*.mjs',
      'base-de-datos/herramientas/**/*.mjs',
      'eslint.config.js',
    ],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  // El fichero de reglas de dependencia es CommonJS a proposito.
  {
    files: ['.dependency-cruiser.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
);
