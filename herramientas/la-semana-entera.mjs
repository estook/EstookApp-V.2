/**
 * Las pruebas, pasadas la semana entera (lección 128).
 *
 *   pnpm prueba:semana                                  todas las pruebas
 *   pnpm prueba:semana base-de-datos/pruebas/x.prueba.ts   solo esas
 *
 * Una prueba que cuenta desde hoy puede pasar el domingo y fallar el martes, o fallar
 * los lunes entre las 00:00 y la hora de corte del local, cuando la jornada todavía es
 * la del domingo. Pasó el 29-sep-2026 con `el-pedido-los-informes-y-google.prueba.ts`: en
 * GitHub, verde; en el ordenador, un martes, rojo. Una sola vuelta no lo ve nunca.
 *
 * Esto pasa las pruebas en **veintiséis momentos**: los siete días de una semana a la
 * 01:00, a las 12:00 y a las 23:30 de Madrid; el lunes también a las 04:30 (antes de la
 * hora de corte); la noche del cambio de hora de octubre; y el cambio de año. Mueve el
 * reloj del proceso y el de la base de las pruebas (`desplazar-el-reloj.mjs`).
 *
 * **Se usa al escribir o tocar una prueba con fechas**, antes de darla por buena. No va en
 * la integración continua: son veintiséis vueltas, y con una prueba concreta tarda poco.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// `--import` pide una dirección de fichero (file://), también en Windows.
const RELOJ = new URL('./desplazar-el-reloj.mjs', import.meta.url).href;
// Vitest se lanza con este mismo Node, sin `npx` ni una terminal por medio.
const VITEST = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));

// La semana que empieza el lunes 5 de octubre de 2026, en horario de verano.
const LA_SEMANA = [5, 6, 7, 8, 9, 10, 11].flatMap((dia) => {
  const d = String(dia).padStart(2, '0');
  const horas = dia === 5 ? ['01:00', '04:30', '12:00', '23:30'] : ['01:00', '12:00', '23:30'];
  return horas.map((hora) => `2026-10-${d}T${hora}:00+02:00`);
});

const LOS_MOMENTOS = [
  ...LA_SEMANA,
  // La madrugada del cambio de hora de octubre, antes y después.
  '2026-10-25T01:30:00+02:00',
  '2026-10-26T01:00:00+01:00',
  // El cambio de año.
  '2026-12-31T23:30:00+01:00',
  '2027-01-01T01:00:00+01:00',
];

const ficheros = process.argv.slice(2);
const fallos = [];

for (const momento of LOS_MOMENTOS) {
  const vuelta = spawnSync(process.execPath, [VITEST, 'run', '--pool=forks', ...ficheros], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ESTOOK_AHORA: momento,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import ${RELOJ}`.trim(),
    },
  });
  // eslint-disable-next-line no-control-regex -- quitar los colores de la terminal
  const salida = `${vuelta.stdout}${vuelta.stderr}`.replace(/\u001b\[[0-9;]*m/g, '');
  const resumen = salida.match(/^\s*Tests\s+(.+)$/m)?.[1]?.trim() ?? 'sin resumen';
  const bien = vuelta.status === 0;
  console.log(`${bien ? 'OK  ' : 'MAL '} ${momento}  ${resumen}`);
  if (!bien) {
    fallos.push(momento);
    for (const linea of new Set(salida.split('\n').filter((l) => /^\s*(FAIL|×)\s/.test(l)))) {
      console.log(`       ${linea.trim()}`);
    }
  }
}

if (fallos.length > 0) {
  console.log(`\n${fallos.length} de ${LOS_MOMENTOS.length} momentos en rojo.`);
  process.exit(1);
}
console.log(`\nLos ${LOS_MOMENTOS.length} momentos en verde.`);
