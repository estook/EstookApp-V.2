/**
 * La ráfaga: treinta consultas a la vez, contra la base y contra la API de verdad.
 *
 *   pnpm bd:rafaga                       (o .\estook.cmd bd:rafaga)
 *
 * Existe por la lección 101: **un tope que no se ve con una persona se ve con dos
 * recargas**. El 24-sep, recargar dos veces la app en el móvil lanzó más de quince
 * consultas a la vez, la API iba por el agrupador de Supabase en modo sesión (la
 * `5432`, quince clientes como mucho) y la mitad volvieron con error. Se arregló en
 * la #68 pasando la API al modo transacción (`6543`, `laPuertaDeLaApi`). Esto lo
 * vuelve a medir cuando haga falta, en tres tandas:
 *
 *   1 · La API desplegada: treinta `la_carta` a la vez, la consulta sin sesión que
 *       abre transacción en la base como cualquier otra. **Tienen que pasar todas.**
 *   2 · La base por la puerta de la API (`6543`): treinta transacciones a la vez,
 *       cada una con su propio cliente. **Tienen que pasar todas.**
 *   3 · La base por la puerta de las herramientas (`5432`), para comparar: ahí el
 *       tope sigue, y ver que falla es lo que demuestra que la ráfaga lo detecta.
 *       No cuenta como fallo; si un día pasan todas, es que Supabase subió el tope.
 *
 * No escribe nada: la carta es pública y las transacciones solo esperan medio
 * segundo con `pg_sleep`. La dirección de la carta se lee de la base (la primera
 * que haya), y la de la API sale de `VITE_API_URL` o de la de producción.
 */
import postgres from 'postgres';
import { laPuertaDeLaApi } from '../../servidor/infraestructura/postgres.ts';

const A_LA_VEZ = 30;
const API =
  process.env['VITE_API_URL'] ?? 'https://efgtzujwjztihyiwgpwg.supabase.co/functions/v1/api';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('Falta DATABASE_URL en .env.local.');
  process.exit(1);
}
if (!url.includes('pooler.supabase.com')) {
  console.error(
    'DATABASE_URL no va por el agrupador de Supabase: esta ráfaga solo tiene sentido contra él.',
  );
  process.exit(1);
}

let fallos = 0;

function contar(titulo, bien, total, detalle = '') {
  const marca = bien === total ? 'OK  ' : 'MAL ';
  console.log(`  ${marca} ${titulo} · ${bien} de ${total}${detalle ? ` · ${detalle}` : ''}`);
  return bien === total;
}

function titulo(texto) {
  console.log(`\n${texto}\n${'─'.repeat(texto.length)}`);
}

/** Treinta transacciones a la vez, cada una con su cliente, como treinta instancias. */
async function rafagaALaBase(direccion) {
  const resultados = await Promise.allSettled(
    Array.from({ length: A_LA_VEZ }, async () => {
      const sql = postgres(direccion, {
        max: 1,
        prepare: false,
        ssl: 'require',
        connect_timeout: 15,
        onnotice: () => {},
      });
      try {
        await sql.begin(async (tx) => {
          await tx`select pg_sleep(0.5)`;
        });
      } finally {
        await sql.end({ timeout: 5 });
      }
    }),
  );
  const errores = resultados
    .filter((r) => r.status === 'rejected')
    .map((r) => String(r.reason?.message ?? r.reason).slice(0, 80));
  return { bien: A_LA_VEZ - errores.length, errores };
}

// ── La dirección de una carta de verdad ───────────────────────────────────────
const lectura = postgres(url, { max: 1, prepare: false, ssl: 'require', onnotice: () => {} });
const [local] = await lectura`
  select direccion_de_la_carta as direccion
    from estook.local
   where direccion_de_la_carta is not null
   order by creado_en
   limit 1
`;
await lectura.end({ timeout: 5 });
if (!local) {
  console.error('No hay ningún local con dirección de carta: falta la 0046.');
  process.exit(1);
}

console.log(`Ráfaga de ${A_LA_VEZ} a la vez · carta «${local.direccion}» · ${API}`);

// ── 1 · La API desplegada ─────────────────────────────────────────────────────
titulo('1 · La API desplegada');
for (let tanda = 1; tanda <= 3; tanda += 1) {
  const inicio = Date.now();
  const respuestas = await Promise.all(
    Array.from({ length: A_LA_VEZ }, () =>
      fetch(`${API}/v1/consultas/la_carta?direccion=${encodeURIComponent(local.direccion)}`)
        .then(async (r) => ({ estado: r.status, cuerpo: await r.json().catch(() => null) }))
        .catch((e) => ({ estado: 0, cuerpo: { error: { codigo: String(e) } } })),
    ),
  );
  const malas = respuestas.filter((r) => r.estado !== 200 || !r.cuerpo?.datos);
  const codigos = [...new Set(malas.map((r) => `${r.estado} ${r.cuerpo?.error?.codigo ?? ''}`))];
  if (
    !contar(
      `tanda ${tanda}: la_carta`,
      A_LA_VEZ - malas.length,
      A_LA_VEZ,
      `${Date.now() - inicio} ms${codigos.length ? ` · ${codigos.join(', ')}` : ''}`,
    )
  )
    fallos += 1;
}

// ── 2 · La base, por la puerta de la API ──────────────────────────────────────
titulo('2 · La base, por la puerta de la API (6543, modo transacción)');
{
  const { bien, errores } = await rafagaALaBase(laPuertaDeLaApi(url));
  if (!contar('transacciones a la vez', bien, A_LA_VEZ, errores[0] ?? '')) fallos += 1;
}

// ── 3 · Para comparar: la puerta de las herramientas ──────────────────────────
titulo('3 · Para comparar: la puerta de las herramientas (5432, modo sesión)');
{
  const { bien, errores } = await rafagaALaBase(url);
  console.log(`  --   ${bien} de ${A_LA_VEZ} pasan${errores.length ? ` · «${errores[0]}»` : ''}`);
  console.log(
    bien < A_LA_VEZ
      ? '       El tope de la 5432 sigue ahí: la ráfaga lo ve, y la API ya no pasa por ella.'
      : '       Hoy pasan todas también por aquí: Supabase habrá subido el tope. No es un fallo.',
  );
}

console.log(fallos === 0 ? '\nTodo pasa.' : `\n${fallos} tanda(s) con fallos.`);
process.exit(fallos === 0 ? 0 : 1);
