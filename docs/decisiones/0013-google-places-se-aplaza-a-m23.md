# 0013 · Google Places se aplaza a M23

**Fecha:** 3 de septiembre de 2026 · **Módulo:** M5 · **Estado:** aceptada

## Qué se decide

**M5 no llama a Google.** El paso 4 del alta —«¿dónde está tu restaurante?»— se
responde a mano: nombre, dirección, código postal, población, provincia, teléfono
y hora de cierre.

Google Places entero —el volcado de la ficha, las reseñas y los competidores— se
construye en **M23**, que es el módulo de reseñas y competencia.

## Por qué

### Porque M23 va a tener que enlazar la ficha de Google de todas formas

La ficha de M23 en el Plan ya lo dice: «**enlace de la ficha del local
autorizando con la cuenta de Google que la gestiona** · reseñas por Google
Business Profile, refrescadas cada 9 horas · [...] competencia con recálculo cada
6 h sobre lo guardado y caché compartida por zona».

Es decir: la conexión con Google, su autorización, su caché y su control de gasto
son M23. Montar media conexión en M5 —solo para rellenar cuatro casillas— sería
construir dos veces lo mismo, y la segunda tendría que deshacer la primera.

### Porque un dato que se escribe una vez no justifica una dependencia externa

El paso 4 se responde **una vez en la vida del local**. Lo que Google ahorra ahí
son treinta segundos de teclear una dirección. Lo que cuesta: una cuenta de
Google Cloud con facturación, una clave más que custodiar, un límite de peticiones
que vigilar, y un camino que se cae cuando Google no contesta.

Las reseñas y los competidores son otra cosa: eso **no se puede teclear**, se
consulta cada pocas horas y es donde Google aporta de verdad. Por eso van juntos,
en el módulo que los usa.

### Y porque no se puede comprobar

Hoy no hay `GOOGLE_MAPS_KEY` puesta en ningún sitio. Escribir la integración
entera sin poder ejecutarla ni una vez sería entregar código que nadie ha visto
funcionar, y llamarlo terminado. E4 lo dice de otra forma pero es lo mismo: «una
comprobación que no puede fallar es peor que no tenerla, porque da confianza».

## Qué cambia del criterio de terminado de M5

El Plan dice: «un local termina el alta en menos de cuatro minutos **con su
nombre real, su valoración, sus competidores** y su marca aplicada; [...] y el
**gasto de Google** queda por debajo de 0,50 €».

Con esta decisión:

- **Los cuatro minutos** siguen siendo el criterio, y están comprobados en
  `pruebas/e2e/alta.spec.ts` con el alta entera cronometrada.
- **La valoración y los competidores** pasan a M23.
- **El gasto de Google es cero**, que cumple «por debajo de 0,50 €» por la vía de
  no gastar nada. Hay una prueba que deja escrito que ninguna operación llama a
  Google, para que el día que se añada haya que tocarla a propósito.

## Qué se pierde, y es real

El alta pierde su momento de «vaya, ya sabe cuál es mi bar». Es el efecto que más
impresiona de los ocho pasos, y desaparece hasta M23.

A cambio, el paso 4 funciona **siempre**: sin clave, sin cuota, sin depender de
que Google conteste, y sin que un fallo suyo deje el alta a medias. La Auditoría
ya preveía ese caso —«Google Places no responde → se usa lo guardado → la sección
enseña la fecha del último dato, **sin error rojo**»— y esta decisión lo lleva al
extremo: no hay nada que pueda no responder.

## Qué NO se hace, a propósito

**No se añade una columna `google_place_id` a `estook.local`.** Sería una columna
que no escribe ni lee nadie hasta M23, y ese es exactamente el estado en el que
`estook.dispositivo` estuvo cuatro módulos: existía, nadie la escribía, y la
pantalla que colgaba de ella enseñaba otra cosa. M23 la añade cuando la use.
