/**
 * Las reglas de acceso que la pantalla también necesita saber (M4, movidas en M5).
 *
 * ── Por qué esto vive aquí y no en el servidor ───────────────────────────────
 *
 * `LARGO_MINIMO_DE_CLAVE` nació en `servidor/dominio/secretos.ts`, que es donde
 * se comprueba, y ahí está bien: **quien decide si una contraseña vale es el
 * servidor**, porque esconder algo en la pantalla no es protegerlo (regla 4).
 *
 * El problema es que la pantalla también tiene que decirlo, y las aplicaciones no
 * pueden importar de `servidor/` —lo impide la regla de dependencias, y con
 * razón—. Así que el número acababa escrito **dos veces**: una en la regla y otra
 * en el texto de ayuda, sin nada que las obligue a coincidir.
 *
 * Eso es exactamente lo que la regla 6 prohíbe: un cálculo, un dueño. El día que
 * el mínimo suba a doce, la ayuda seguiría diciendo diez y la pantalla rechazaría
 * lo que ella misma acaba de pedir.
 *
 * Aquí lo ven los dos. El servidor lo importa para comprobar; la pantalla, para
 * contarlo y para no hacer un viaje que ya sabe que va a fallar.
 */

/** Lo mínimo que se le pide a una contraseña. */
export const LARGO_MINIMO_DE_CLAVE = 10;
