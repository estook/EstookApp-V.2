# 0004 · El presupuesto de velocidad, reconstruido

**Fecha:** 1 de septiembre de 2026
**Modulo:** M0 (la decision) · M3 en adelante (la medicion)
**Estado:** aceptada

## El problema

El apartado B7 del Plan de desarrollo fija un presupuesto de velocidad, y el Plan
dice que «un modulo que no cumple su presupuesto no esta terminado». Pero la tabla
se descoloco al maquetar el PDF: ocho conceptos, siete cifras, y corridas una fila.

Tal como se lee:

```
Concepto                          Objetivo
                                  200 ms
Accion                            1 s
Abrir una app desde la rueda      300 ms
Panel con un ano de datos         150 ms
Ficha tecnica                     2 s
Buscador universal                1 s
PDF de una pagina                 menos de 250 KB comprimido
Carta digital en 4G
Paquete inicial de la app
```

Hay combinaciones imposibles: «PDF de una pagina: 1 segundo» no lo cumple ningun
Chromium, y «Carta digital en 4G: menos de 250 KB» no es una unidad de tiempo.

## La decision

Richi confirmo el 1 de septiembre de 2026 que la tabla original salio de una
investigacion hecha con una IA, que no hay que ser estricto con ella, pero que se
respete como guia. Asi que se reconstruye conservando las cifras originales y
asignandolas al concepto que les corresponde:

| Que                          | Objetivo                   | Por que ese numero                               |
| ---------------------------- | -------------------------- | ------------------------------------------------ |
| Respuesta a una accion       | 200 ms                     | Por debajo de esto se percibe como instantaneo   |
| Buscador universal           | 150 ms                     | Se escribe y se ve; mas lento se siente a saltos |
| Abrir una app desde la rueda | 300 ms                     | Encaja con los 260 ms de animacion de B6         |
| Ficha tecnica                | 1 s                        | Se abre con foto y pasos                         |
| Carta digital en 4G          | 1 s                        | Es publica y se abre desde la calle              |
| Panel con un ano de datos    | 2 s                        | Son agregados de doce meses                      |
| PDF de una pagina            | 2 s                        | Lo compone un Chromium sin interfaz              |
| Paquete inicial de la app    | menos de 250 KB comprimido | **Esta era inequivoca en el original**           |

## Que implica

- **El peso del paquete se mide y bloquea desde M0**, porque era la unica cifra
  que no admitia duda. Lo hace `herramientas/presupuesto-tamano.mjs`.
- **Los tiempos se empiezan a medir en M3**, que es cuando hay pantallas de verdad
  que medir. Antes no hay nada que cronometrar.
- Se tratan como **guia, no como muro**: pasarse avisa y obliga a mirarlo, no
  tumba la fusion. La unica excepcion es el peso del paquete, que si bloquea.
- Si algun dia aparece la tabla original bien maquetada, manda ella y esta
  decision se sustituye por otra.
