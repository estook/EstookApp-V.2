/**
 * ¿Qué operación del catálogo la ha ejecutado alguien de verdad?
 *
 *   pnpm cobertura
 *
 * Se ejecuta **después** de las pruebas de extremo a extremo, y lee el cuaderno
 * que la API de pruebas va escribiendo mientras corren.
 *
 * ── El fallo que esto caza, y que ya se coló una vez ─────────────────────────
 *
 * La pantalla «Hoy» de M6 estaba escrita, registrada en el catálogo, llamada
 * desde la pantalla y **devolviendo un 500 a todo el mundo desde el primer día**.
 * Pasó `se-usan.prueba.ts`, que comprueba que la pantalla la llama; pasó los
 * tipos; pasó el lint. Lo que nadie comprobaba es que **contestara**.
 *
 * Salió de casualidad, leyendo los errores que la API escupía mientras corrían
 * otras pruebas. De ahí la lección 10 de «cómo trabajamos»: «una consulta que
 * ninguna prueba llama es una consulta rota que todavía no sabes que lo está».
 * Esto es esa lección convertida en prueba.
 *
 * ── Por qué se mide corriendo, y no leyendo el código ────────────────────────
 *
 * Porque las pruebas de extremo a extremo **pulsan botones**: el nombre del
 * comando no aparece en ningún sitio del fichero de la prueba. Buscar nombres
 * con `grep` da un número que no significa nada. Lo único que significa algo es
 * lo que se ha ejecutado.
 *
 * ── Y por qué «bien» no es lo mismo que «llamada» ────────────────────────────
 *
 * Una operación que solo se ha llamado para comprobar que **rechaza** —sin
 * sesión, sin permiso, con el segundo factor sin superar— está probada como
 * puerta, no como operación. Por eso el cuaderno separa las que han contestado
 * bien alguna vez de las que solo han contestado mal: son dos agujeros
 * distintos, y el segundo es peor.
 */
import { readFileSync } from 'node:fs';
import { catalogo } from '../servidor/aplicacion/catalogo.ts';

const CUADERNO = new URL('../pruebas/.cobertura-del-catalogo.json', import.meta.url);

/**
 * Las que a día de hoy no ejecuta ninguna prueba, **cada una con su razón**.
 *
 * Esta lista es una deuda, no una excepción: lo que hay aquí es lo que puede
 * romperse sin que nadie se entere. Se escribe la razón para que dentro de tres
 * meses se pueda decidir si sigue valiendo, y **el sitio donde se paga**.
 *
 * Quitar una línea de aquí es el trabajo; añadirla, la excusa.
 */
const LA_DEUDA = {
  'consulta:recetas_de_referencia':
    'No la consume ninguna pantalla todavía: quien copia una receta a una ficha técnica es M9. Se paga en M9.',
  'comando:cambiar_mi_idioma':
    'Los idiomas distintos del español llegan con la carta digital, M12.',
  'comando:exigir_doble_factor':
    'Ajustes de organización no tiene prueba de extremo a extremo propia. Se paga en M25.',
  'comando:poner_correo_de_recuperacion':
    'Igual que el anterior, y es el otro lado del guardián del último administrador. Se paga en M25.',
  'comando:poner_logo':
    'Necesita un fichero de verdad y el almacén de Supabase. Se comprueba con `almacen:preparar`.',
  'comando:descartar_importacion':
    'La importación de equipo tiene prueba de proponer y de confirmar; descartar, no. Se paga en M13.',
  'comando:salir_de_la_demostracion':
    'La barra de la demostración lo llama, pero entrar en demostración no tiene camino de extremo a extremo. Se paga en M26.',
};

const nombres = [
  ...Object.keys(catalogo.consultas).map((n) => `consulta:${n}`),
  ...Object.keys(catalogo.comandos).map((n) => `comando:${n}`),
];

let cuaderno;
try {
  cuaderno = JSON.parse(readFileSync(CUADERNO, 'utf8'));
} catch {
  console.error(
    [
      '',
      '  No hay cuaderno que leer.',
      '',
      '  Que ha pasado: esto lee lo que la API de pruebas apunta mientras corren',
      '  las pruebas de extremo a extremo, y ese fichero no esta.',
      '',
      '  Que se puede hacer: ejecuta primero',
      '',
      '    .\\estook.cmd prueba:e2e:completa',
      '',
      '  que ya llama a esto al final.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

const nunca = [];
const soloMal = [];
const enDeuda = [];

for (const clave of nombres) {
  const apunte = cuaderno[clave];
  const razon = LA_DEUDA[clave];

  if (!apunte || apunte.veces === 0) {
    if (razon) enDeuda.push(clave);
    else nunca.push(clave);
    continue;
  }
  if (apunte.bien === 0) soloMal.push(clave);
}

const cubiertas = nombres.length - nunca.length - enDeuda.length;
// Un porcentaje, que no es dinero: la regla 9 prohíbe redondear céntimos por tu
// cuenta, y aquí no hay céntimos. Se hace sin `Math.round` igualmente, para no
// tener que explicarle a la regla la diferencia cada vez que alguien lo lea.
const porCiento = ((cubiertas / nombres.length) * 100).toFixed(0);

console.log('\n  Cobertura del catalogo · lo que alguna prueba ejecuta de verdad\n');
console.log(`  ${cubiertas} de ${nombres.length} operaciones · ${porCiento} %\n`);

if (enDeuda.length > 0) {
  console.log(`  Deuda apuntada, con su razon · ${enDeuda.length}`);
  for (const clave of enDeuda) console.log(`    --   ${clave.padEnd(42)} ${LA_DEUDA[clave]}`);
  console.log();
}

if (soloMal.length > 0) {
  console.log(`  Solo se han llamado para comprobar que rechazan · ${soloMal.length}`);
  for (const clave of soloMal) {
    console.log(`    MAL  ${clave.padEnd(42)} ninguna prueba la ha visto contestar bien`);
  }
  console.log();
}

/**
 * Las que se llaman a propósito **sin existir**.
 *
 * `catalogo.spec.ts` pide una consulta inventada para comprobar que la API
 * contesta «no existe» en vez de reventar. Sin esta lista, esa prueba haría que
 * la cobertura saliera en rojo por hacer bien su trabajo.
 */
const A_PROPOSITO = ['consulta:no_existe_esta_consulta'];

// Y lo que sobra en el cuaderno: una operación que se llama y no está en el
// catálogo es una ruta fantasma, o un nombre mal escrito en una prueba.
const fantasmas = Object.keys(cuaderno).filter(
  (c) => !nombres.includes(c) && !A_PROPOSITO.includes(c),
);
if (fantasmas.length > 0) {
  console.log(`  Llamadas a operaciones que no estan en el catalogo · ${fantasmas.length}`);
  for (const clave of fantasmas) console.log(`    MAL  ${clave}`);
  console.log();
}

if (nunca.length > 0) {
  console.log(`  Ninguna prueba las ejecuta, y no estan apuntadas como deuda · ${nunca.length}`);
  for (const clave of nunca) console.log(`    MAL  ${clave}`);
  console.log(
    [
      '',
      '  Que ha pasado: estas operaciones estan en el catalogo y ninguna prueba las',
      '  ejecuta. Pueden estar rotas ahora mismo y nadie se enteraria: le paso a la',
      '  pantalla «Hoy» de M6, que devolvia un 500 a todo el mundo desde el primer dia.',
      '',
      '  Que se puede hacer: escribe una prueba que la llame de verdad. Si no toca',
      '  todavia, apuntala en LA_DEUDA de este fichero con la razon y donde se paga.',
      '',
    ].join('\n'),
  );
}

const mal = nunca.length + soloMal.length + fantasmas.length;
if (mal > 0) process.exit(1);

console.log('  Todo lo que no esta apuntado como deuda se ejecuta al menos una vez.\n');
