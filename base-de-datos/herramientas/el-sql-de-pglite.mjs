/**
 * **El `sql` de las pruebas, que se porta como el de `postgres.js`** (el reloj del lunes,
 * 26-oct; lección 225). Lo usan las dos bases de prueba: la de la batería
 * (`pruebas/despachador.ts`) y la de las pruebas de pantalla (`api-de-pruebas.mjs`).
 *
 * `postgres.ts` habla con `postgres.js`, que usa plantillas etiquetadas; PGlite, con
 * texto y parámetros numerados. Esto traduce lo uno en lo otro y, desde el 26-oct,
 * **copia lo que `postgres.js` hace cuando algo falla**, que es lo que no se veía:
 *
 *   · Una consulta que falla **se apunta aunque el código la recoja**, y al acabar la
 *     transacción se tira entera con ese fallo. Un `savepoint` escrito a mano no lo
 *     evita. En producción eso fue un 500 en cada latido de la madrugada del lunes; en
 *     las pruebas, con el adaptador de antes, todo salía bien.
 *   · `sql.savepoint(hacer)` sí aparta: lo de dentro va con su propio `sql`, y lo que
 *     falla ahí vuelve al punto de guardado y sigue hacia arriba, sin manchar lo de fuera.
 *
 * `postgres.js` tiene más cosas —fragmentos anidados, `sql(objeto)` para insertar— y
 * aquí **no se soportan a propósito**: soportarlas sería reimplementar la librería en vez
 * de probar la API. Si algún día hicieran falta, esto fallaría a las claras.
 */

/** La transacción abortada: `postgres.js` contesta con el fallo que la abortó. */
const ABORTADA = '25P02';

/**
 * Una transacción de PGlite vista como la de `postgres.js`. `sinRecoger()` dice el primer
 * fallo de una consulta de fuera de un punto de guardado, aunque el código lo recogiera:
 * quien abre la transacción tiene que tirarla con él.
 */
export function elSqlDePglite(bd) {
  let puntos = 0;
  let primero = null;

  function conEscucha(alFallar) {
    const sql = async (trozos, ...valores) => {
      if (!Array.isArray(trozos)) {
        throw new Error('Las pruebas solo entienden `sql` como plantilla etiquetada.');
      }
      const texto = trozos.reduce((junto, trozo, i) => `${junto}$${i}${trozo}`);
      try {
        const { rows } = await bd.query(texto, valores);
        return rows;
      } catch (fallo) {
        alFallar(fallo);
        throw fallo;
      }
    };
    sql.savepoint = async (hacer) => {
      const nombre = `punto_${String(puntos++)}`;
      await bd.exec(`savepoint ${nombre}`);
      let deDentro = null;
      try {
        const hecho = await hacer(
          conEscucha((fallo) => {
            deDentro ??= { fallo };
          }),
        );
        if (deDentro !== null) throw deDentro.fallo;
        return hecho;
      } catch (fallo) {
        await bd.exec(`rollback to savepoint ${nombre}`);
        throw comoPostgres(fallo, deDentro);
      }
    };
    return sql;
  }

  return {
    sql: conEscucha((fallo) => {
      primero ??= { fallo };
    }),
    sinRecoger: () => primero,
  };
}

/** Lo que tira `postgres.js` al acabar una transacción o un punto de guardado. */
export function comoPostgres(fallo, sinRecoger) {
  return fallo?.code === ABORTADA && sinRecoger !== null ? sinRecoger.fallo : fallo;
}
