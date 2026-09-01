# Marca

Los colores, para que no se inventen: charcoal `#111C1F`, naranja `#FF7A00`,
blanco y negro.

## Lo que hay

| Fichero              | Qué es                                | Peso   |
| -------------------- | ------------------------------------- | ------ |
| `Logohorizontal.png` | El logo horizontal, con el claim      | 468 KB |
| `Fogonicono.png`     | El símbolo de Fogón, la mascota de IA | 1,2 MB |
| `Faviconestook.png`  | El símbolo solo, la E de tres barras  | 231 KB |

## Lo que falta, y hay que resolver en M3

Estos tres ficheros sirven como referencia, pero **no se pueden usar tal cual** en
la aplicación, por dos razones:

1. **Pesan demasiado.** El presupuesto de B7 es de 250 KB comprimidos para todo el
   paquete inicial de una app. Solo el icono de Fogón se lo come cinco veces.
2. **Son PNG.** El Plan (C5) pide SVG para todo lo que no obligue el sistema
   operativo a ser PNG, porque un SVG escala sin pixelarse y pesa una fracción.

Lo que hace falta tener antes de M3:

| Fichero                  | Qué es                              |
| ------------------------ | ----------------------------------- |
| `estook-logo.svg`        | El logo horizontal                  |
| `estook-simbolo.svg`     | La marca sola (la E de tres barras) |
| `estook-logo-blanco.svg` | El mismo logo para fondos oscuros   |
| `fogon.svg`              | El símbolo de Fogón                 |
| `favicon.svg`            | El favicon                          |
| `favicon.ico`            | Para navegadores antiguos           |
| `apple-touch-icon.png`   | 180 px                              |
| `pwa-192.png`            | Icono de aplicación instalable      |
| `pwa-512.png`            | Icono de aplicación instalable      |

Si los SVG originales existen (de donde salieran estos PNG), lo mejor es traerlos
tal cual. Si no, en M3 se vectorizan a partir de estos: las formas son geométricas
y simples, así que sale limpio.

Los componentes que consumen esto se construyen en **M3**, no antes.
