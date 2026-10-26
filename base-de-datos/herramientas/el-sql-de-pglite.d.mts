/** Los tipos de `el-sql-de-pglite.mjs`, para las pruebas en TypeScript. */
import type { PGlite } from '@electric-sql/pglite';

export interface ElSqlDePglite {
  /** Hace de `postgres.TransactionSql`: plantillas etiquetadas y `savepoint`. */
  readonly sql: unknown;
  /** El primer fallo de una consulta de fuera de un punto de guardado, aunque se recogiera. */
  sinRecoger(): { readonly fallo: unknown } | null;
}

export declare function elSqlDePglite(bd: PGlite): ElSqlDePglite;
export declare function comoPostgres(
  fallo: unknown,
  sinRecoger: { readonly fallo: unknown } | null,
): unknown;
