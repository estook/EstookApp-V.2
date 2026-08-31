import { defineConfig } from 'vitest/config';

/**
 * Las pruebas se llaman `*.prueba.ts` y viven al lado de lo que prueban.
 * Las de extremo a extremo van aparte, en `pruebas/`, y las corre Playwright.
 */
export default defineConfig({
  test: {
    include: ['packages/**/*.prueba.ts', 'servidor/**/*.prueba.ts', 'apps/**/*.prueba.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'pruebas/**'],
    environment: 'node',
    reporters: process.env['CI'] ? ['default', 'github-actions'] : ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**/*.ts', 'servidor/**/*.ts'],
    },
  },
});
