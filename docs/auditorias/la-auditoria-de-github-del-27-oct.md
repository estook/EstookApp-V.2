# La auditoría de GitHub del 27-oct

> Richi, 27-oct: «audita todo, es necesario porque está fallando mucho». Leídas las **60 últimas
> vueltas de la integración** (del 22 al 26-oct), cada rojo por dentro, y producción entera.

## Lo primero: la app no está rota

Leído el 26-oct a las 23:47 UTC (las 00:47 de Madrid): **92 de 92 migraciones**, la API responde
con **113 consultas y 303 comandos**, el reloj latió a las 23:07, y `estook.com`, `/app/` y `/tpv/`
contestan, con la entrada nueva publicada. **`main` solo ha estado en rojo una vez** (tras la #145),
y por una prueba, no por la app. Las tres comprobaciones obligatorias hicieron su trabajo: nada roto
llegó a producción.

## Los diez rojos, uno a uno

De 60 vueltas: 38 en verde, 12 canceladas (las para GitHub solo cuando llega un commit nuevo a la
misma rama) y **10 en rojo**.

| Cuándo       | Rama                         | Por qué                                                                             | De quién                                   |
| ------------ | ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| 22-oct       | `m20a-1-la-sala-y-la-cocina` | Órdenes sin pantalla, una línea de ESTADO larga, y los navegadores atascados 15 min | De la IA, y de GitHub                      |
| 24-oct (dos) | `t1-la-puerta`               | Pruebas de pantalla: un desborde en el móvil y textos que cambiaron                 | De la IA: subido sin pasar las de pantalla |
| 24-oct       | `el-pin-y-la-contrasena`     | Capturas de pantalla que cambiaban a propósito, sin rehacer                         | De la IA                                   |
| 25-oct       | `cada-aparato-a-lo-suyo`     | El formato (`prettier`) de dos ficheros                                             | De la IA: subido sin pasarlo               |
| 26-oct       | `el-reloj-del-lunes`         | Los navegadores, atascados 15 min                                                   | De GitHub                                  |
| 26-oct       | `t4-2-la-barra-y-la-alergia` | El lint de un trabajo a medias, subido para el relevo                               | De la IA, a propósito (rama sin PR)        |
| 26-oct       | `main`, tras la #145         | La prueba de Ventas que contaba días en horas, con el cambio de hora                | Una prueba vieja (lección 230)             |
| 26-oct       | `el-cambio-de-hora` (1.ª)    | Los navegadores, lentos, y el segundo intento roto                                  | De GitHub, y de la IA (lección 231)        |
| 26-oct       | `el-cambio-de-hora` (2.ª)    | Los navegadores, cortados a los 5 min mientras bajaban                              | De la IA (lección 232)                     |

**En resumen:** seis rojos de la IA por subir sin pasar todo en local (uno, a propósito, un trabajo
a medias); tres de bajar los navegadores, dos de ellos provocados o empeorados por los arreglos de la
IA; y uno de una prueba vieja con el cambio de hora.

## Lo que se arregla

1. **Los navegadores** (la causa que más se repite): se guardan los paquetes ya bajados en la caché
   de GitHub, lo lento se espera en vez de cortarse, y el segundo intento ya no choca con el primero
   ([`integracion.yml`](../../.github/workflows/integracion.yml), lecciones 226, 231 y 232). **Y desde
   `main`** ([`navegadores.yml`](../../.github/workflows/navegadores.yml), lección 233): la caché de
   GitHub es de cada rama, y solo la de `main` la ven todas. En la tercera vuelta de la #146 la
   caché se guardó (119 MB) y tres trozos pasaron; el cuarto cayó porque a su máquina le tocó una
   conexión lentísima antes de que hubiera nada guardado. **Esto solo se ve funcionar en GitHub.**
2. **La prueba de Ventas**: resta días del calendario (lección 230).
3. **Antes de abrir un pull request, todo en local**: tipos, lint, formato, textos, todas las
   pruebas y las de pantalla de lo que se toca. Lo que se sube a medias para el relevo va a su rama
   sin pull request, y se dice en ESTADO que está a medias.

## Lo que no se ha encontrado

Ninguna prueba que falle sola de vez en cuando por la app. La única repetida en verde de estos días
(`las-opciones.spec.ts`, en la #143) no ha vuelto a salir.
