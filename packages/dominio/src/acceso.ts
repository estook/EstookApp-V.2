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

/**
 * Las palabras con las que se arma una contraseña de un solo uso.
 *
 * Vivían dentro de `bd:cuenta-de-verdad`, y ahí se quedaban: cuando la pantalla
 * de «Quién tiene acceso» tuvo que dar una contraseña nueva a alguien, la lista
 * habría acabado copiada. Una lista copiada es una lista que se desincroniza.
 *
 * Son de cocina a propósito. Quien lleva un bar tiene que poder **dictarla por
 * teléfono** a alguien que está en la barra con las manos mojadas, y «harina
 * caldo brasa queso sal» se dicta; «Xk9$mQ2!» no.
 */
const PALABRAS = [
  'aceite',
  'brasa',
  'caldo',
  'cuchara',
  'fogon',
  'harina',
  'hielo',
  'lomo',
  'nata',
  'olla',
  'pan',
  'queso',
  'sal',
  'tomillo',
  'vinagre',
];

/**
 * Cuántas palabras.
 *
 * Cinco de quince son 759.375 combinaciones: unos **20 bits**. Para una
 * contraseña normal sería poco y habría que decirlo; para esta no, y conviene
 * dejar escrito por qué en vez de repetir un número tranquilizador:
 *
 *   · Nace con «hay que cambiarla», así que **muere en el primer login**.
 *   · Entrar está limitado: a los cinco fallos la cuenta se bloquea un rato
 *     (`intentos_fallidos` y `bloqueada_hasta`, migración 0018), así que no se
 *     pueden probar 759.375 combinaciones ni de lejos.
 *   · Y se dicta en mano o por teléfono, no viaja por ningún sitio.
 *
 * Donde esto **no** valdría es como contraseña permanente. Por eso no lo es.
 */
const CUANTAS_PALABRAS = 5;

/**
 * Una contraseña que se puede leer en voz alta y no se puede adivinar.
 *
 * Nace con «hay que cambiarla», así que dura lo que tarda quien la recibe en
 * entrar y ponerse la suya. Para eso, cinco palabras sobran.
 *
 * `crypto.getRandomValues` existe igual en Node, en Deno y en el navegador, que
 * es la misma razón por la que las contraseñas se derivan con `crypto.subtle`
 * (decisión 0010). `Math.random` no vale para esto y no vale nunca.
 */
export function claveDeUnSoloUso(): string {
  const elegidas: string[] = [];
  const azar = new Uint32Array(CUANTAS_PALABRAS);
  crypto.getRandomValues(azar);
  for (const numero of azar) elegidas.push(PALABRAS[numero % PALABRAS.length] ?? 'sal');
  return elegidas.join(' ');
}
