# 0007 · El movimiento, en CSS y sin librería de animación

**Fecha:** 1 de septiembre de 2026 · **Módulo:** M3 · **Estado:** aceptada

## Qué se decide

La tabla entera de movimiento de **B6** se implementa con CSS, y **no se instala
`Motion` (framer-motion)**, aunque esté en el stack cerrado de A3.

## Por qué

A3 lista `Motion (framer-motion) + CSS` para animación. Al llegar a M3 y mirar
qué pide B6 de verdad, resulta que **ninguna de las nueve animaciones la
necesita**:

| Lo que pide B6                               | Cómo se hace                       |
| -------------------------------------------- | ---------------------------------- |
| Hoja que sube en móvil                       | `@keyframes` + `transform`         |
| Panel lateral desde la derecha               | lo mismo                           |
| Rueda: desenfoque y sectores escalonados     | `animation-delay`                  |
| Widget que se levanta al arrastrar           | `transition` de `box-shadow`       |
| Aviso que aparece                            | `@keyframes` de opacidad           |
| Deshacer que sube                            | `@keyframes`                       |
| Esqueleto con brillo                         | `@keyframes` infinito              |
| **Cifra que cuenta desde el valor anterior** | `requestAnimationFrame`, 30 líneas |
| Entrar en una app                            | `@keyframes`                       |

Motion vale la pena cuando hace falta **animación de disposición** —que un
elemento se mueva solo cuando cambia de sitio en la lista— o gestos con física.
B6 no pide ninguna de las dos: dice literalmente «nada rebota más de una vez,
nada gira, nada parpadea».

Traerlo costaría unos 30 KB comprimidos del presupuesto de 250 de B7, para hacer
lo que el navegador ya hace. Y **E1 dice «ninguna dependencia nueva sin
justificar»**: una que ya está en el stack pero no hace falta hoy sigue sin
estar justificada hoy.

## Qué no cambia

- **El stack no se reabre.** Motion sigue siendo la respuesta cuando haga falta
  animación de disposición: la más probable es el cuadrante de M10, donde los
  turnos se arrastran entre días. Ese módulo la traerá, con su justificación.
- `prefers-reduced-motion` se respeta desde `base.css`, para todo y de una vez.

## Cómo se sabría que fue un error

Si dos módulos seguidos acaban escribiendo animación a mano que se parece a lo
que hace Motion. Entonces se trae, y esta decisión se sustituye por otra.
