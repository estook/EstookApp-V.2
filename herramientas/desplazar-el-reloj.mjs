/**
 * Mueve el reloj de todo el proceso a `ESTOOK_AHORA` (un instante ISO), para pasar las
 * pruebas como si fuera otro día y otra hora (lección 128).
 *
 * Se carga antes que nada con `--import` (lo hace `herramientas/la-semana-entera.mjs`).
 * Mueve también el reloj de la base de las pruebas, porque PGlite lee `Date.now`: así
 * `now()` y la prueba ven el mismo día. **Solo para comprobar pruebas**: nunca se carga
 * en la aplicación ni en el servidor.
 *
 * Llega a todos los procesos que lanza Vitest porque va en `NODE_OPTIONS`, y por eso las
 * pruebas se lanzan con `--pool=forks` (procesos, no hilos).
 */

const objetivo = process.env.ESTOOK_AHORA;

if (objetivo) {
  const DateReal = Date;
  const desfase = DateReal.parse(objetivo) - DateReal.now();
  if (Number.isNaN(desfase)) {
    throw new Error(`ESTOOK_AHORA no es un instante que se pueda leer: ${objetivo}`);
  }

  class DateMovida extends DateReal {
    constructor(...argumentos) {
      if (argumentos.length === 0) super(DateReal.now() + desfase);
      else super(...argumentos);
    }

    static now() {
      return DateReal.now() + desfase;
    }
  }

  globalThis.Date = DateMovida;
}
