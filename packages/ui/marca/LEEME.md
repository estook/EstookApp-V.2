# Marca

Los dos colores, para que no se inventen: **charcoal `#111C1F`** y **naranja
`#FF7A00`**. Los valores vive en las fichas de B1
([`estilos/fichas.css`](../estilos/fichas.css)); aquí solo están las formas.

## Lo que hay, y para qué sirve cada cosa

| Fichero                       | Qué es                             | Dónde se usa                       |
| ----------------------------- | ---------------------------------- | ---------------------------------- |
| `estook-simbolo.svg`          | La E de tres barras                | La marca en cualquier sitio        |
| `estook-simbolo-blanco.svg`   | La misma, para fondos oscuros      | Sobre charcoal                     |
| `favicon.svg`                 | El símbolo con margen, en cuadrado | La pestaña del navegador           |
| `apple-touch-icon.png`        | 180 px, sin transparencia          | La pantalla de inicio de un iPhone |
| `pwa-192.png` · `pwa-512.png` | Iconos de aplicación instalable    | Android y escritorio               |
| `Logohorizontal.png`          | El logo con el claim · **468 KB**  | **Nada todavía.** Ver abajo        |
| `Fogonicono.png`              | La mascota de IA · **1,2 MB**      | **Nada todavía.** Ver abajo        |
| `Faviconestook.png`           | El símbolo original · 231 KB       | Referencia. De aquí salió el SVG   |

## Cómo se hicieron

El **símbolo se vectorizó en M3** a partir de `Faviconestook.png`. Son cinco
rectángulos redondeados y un triángulo, así que salió exacto: se comprobó
comparando el PNG generado con el original.

Los tres PNG los genera
[`herramientas/iconos-de-marca.mjs`](../../../herramientas/iconos-de-marca.mjs)
**a partir del mismo SVG**, y los reparte a las cuatro aplicaciones. No se editan
a mano: si cambia el símbolo, se vuelve a ejecutar y cambian los cinco sitios a la
vez.

Solo existen en PNG porque iOS y las aplicaciones instalables lo exigen. Todo lo
demás va en SVG: 800 bytes contra 231 KB, y escala sin pixelarse.

## Lo que sigue faltando, y no lo puede resolver el código

Dos cosas, y las dos son **marca, no programación**. Redibujarlas sería
inventarse la identidad de Estook, y eso no se decide desde aquí (regla 13):

### El logo horizontal

`Logohorizontal.png` lleva la palabra ESTOOK en una tipografía propia —las **O**
cuadradas, la **K** con su ángulo— que no es Montserrat ni ninguna otra que
tengamos. Redibujar esas letras a ojo daría un logo **parecido**, que es lo peor
que puede pasarle a una marca.

Hace falta **el archivo original** (`.ai`, `.svg`, `.eps` o el Figma de quien lo
diseñó). Con él, `estook-logo.svg` y `estook-logo-blanco.svg` salen en cinco
minutos.

**Qué bloquea:** la cabecera de la web pública (Parte C). **La aplicación no lo
necesita**: en la barra usa la palabra «ESTOOK» compuesta con Montserrat, y el
símbolo para todo lo demás.

### El icono de Fogón

`Fogonicono.png` es una **ilustración** —un cocinero robot con gorro, auriculares
y dos utensilios cruzados—, no una figura geométrica. Vectorizarla a ojo daría
otra mascota.

**Qué bloquea:** nada de M3. El Plan (B3) ya dice que **dentro de la aplicación
Fogón es el icono `flame` de Lucide**, con el naranja de marca, y eso es lo que
usa la barra. La ilustración es para la web y para la tienda de aplicaciones.

## Si aparecen los originales

1. Se dejan los SVG en esta carpeta con los nombres de la tabla.
2. Se ejecuta `node herramientas/iconos-de-marca.mjs` si cambia el símbolo.
3. Se borran los PNG de referencia, que ya no harán falta.
