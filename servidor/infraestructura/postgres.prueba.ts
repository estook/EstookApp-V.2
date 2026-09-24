import { describe, expect, it } from 'vitest';
import { laPuertaDeLaApi } from './postgres.ts';

/**
 * La puerta por la que la API entra en Postgres.
 *
 * ── El fallo que estas pruebas existen para que no vuelva ────────────────────
 *
 * El 24 de septiembre de 2026 Richi recargó dos veces Inventario en el móvil y la
 * app le pidió entrar; entrar tampoco funcionaba, y al rato sí. La API iba por el
 * agrupador de Supabase en modo sesión, que admite quince clientes a la vez: con
 * treinta transacciones seguidas, quince volvían con error. Por el modo
 * transacción pasan las treinta.
 */
describe('la puerta de la API', () => {
  const ref = 'postgresql://postgres.abc:clave@aws-0-eu-west-1.pooler.supabase.com';

  it('el agrupador en modo sesión pasa al modo transacción', () => {
    expect(laPuertaDeLaApi(`${ref}:5432/postgres`)).toBe(`${ref}:6543/postgres`);
    expect(laPuertaDeLaApi(`${ref}:5432/postgres?sslmode=require`)).toBe(
      `${ref}:6543/postgres?sslmode=require`,
    );
  });

  it('el que ya está en modo transacción se queda como está', () => {
    expect(laPuertaDeLaApi(`${ref}:6543/postgres`)).toBe(`${ref}:6543/postgres`);
  });

  it('una base que no es el agrupador no se toca', () => {
    // La de las pruebas, en la máquina y en GitHub, y una conexión directa.
    const local = 'postgresql://postgres:pruebas@localhost:5432/estook';
    const directa = 'postgresql://postgres:clave@db.abc.supabase.co:5432/postgres';
    expect(laPuertaDeLaApi(local)).toBe(local);
    expect(laPuertaDeLaApi(directa)).toBe(directa);
  });

  it('una contraseña que contenga «:5432» no se confunde con el puerto', () => {
    const rara =
      'postgresql://postgres.abc:x:5432y@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
    expect(laPuertaDeLaApi(rara)).toBe(
      'postgresql://postgres.abc:x:5432y@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
    );
  });
});
