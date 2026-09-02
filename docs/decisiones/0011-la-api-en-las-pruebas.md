# 0011 · Las pruebas de extremo a extremo levantan la API de verdad

**Fecha:** 2 de septiembre de 2026 · **Módulo:** M4 · **Estado:** aceptada

## Lo que había que decidir

Hasta M3, las pruebas de extremo a extremo no necesitaban servidor: la aplicación
se pintaba con un perfil de muestra elegido a mano en Ajustes. M4 se lleva ese
andamio por delante, así que **sin API no hay forma de entrar**, y sin entrar no
se puede comprobar ni una de las cosas que M3 dejó probadas: ni la rueda, ni las
ocho apps, ni deshacer, ni los estados vacíos.

## Lo que se decidió

Playwright levanta **la API entera, tal cual, contra un Postgres efímero**. Está
en `base-de-datos/herramientas/api-de-pruebas.mjs`, y se arranca sola antes de las
cuatro aplicaciones.

No es una imitación: es `crearApi(crearDespachador(...))` con los mismos comandos,
las mismas políticas de seguridad y las mismas puertas. Lo único distinto es dónde
vive el Postgres.

## Por qué, y qué se descartó

**Docker no.** No todas las máquinas lo tienen, y una prueba que solo corre en la
máquina de uno acaba sin correr en ninguna. Es la misma razón por la que las
pruebas de base de datos usan PGlite desde M0.

**Apuntar a Supabase, tampoco.** Dejaría las pruebas dependiendo de la red, y
—peor— escribiendo en la base de datos de verdad: entrar crea una sesión, invitar
crea una persona. Una prueba que ensucia producción no se puede correr en cada
`push`.

**Simular el login, menos todavía.** Sería probar una aplicación que no es la que
se publica, y justo en la parte donde un fallo se paga caro.

## Lo que costó, y lo que encontró

El adaptador entre las plantillas etiquetadas de `postgres.js` y los parámetros
numerados de PGlite son quince líneas, y está escrito para no crecer: si creciera,
dejaría de estar probando lo mismo.

**Encontró tres fallos que ninguna otra capa vio**, y los tres eran invisibles
mirando la pantalla:

1. **CORS.** La API ponía las cabeceras de permiso _antes_ de que respondiera la
   ruta, y las rutas devuelven una `Response` construida a mano, que sustituye lo
   que hubiera puesto el middleware. Contra la API a pelo funcionaba todo; desde
   un navegador no se podía entrar.
2. **En móvil no había forma de cambiar de local.** El selector vive en la barra
   de escritorio, que es `hidden lg:flex`. Corriendo a 375 px se vio que quien
   trabaja en dos locales se quedaba encerrado en uno.
3. **PGlite es una sola conexión.** Con las pruebas en paralelo, dos peticiones se
   solapaban y compartían el `set local estook.persona_id`. Este es de las pruebas
   y no del producto —contra Supabase hay un agrupador— pero había que arreglarlo
   o las pruebas mentirían.

## Cómo se usa

```bash
pnpm prueba:e2e:completa   # construye contra la API de pruebas y prueba
pnpm api:pruebas           # solo la API, para desarrollar contra ella
```

Hay que construir antes de probar porque Vite hornea `VITE_API_URL` **al
construir**, no al servir, y las pruebas levantan lo ya construido. En integración
continua la variable se declara en el trabajo entero, que es más claro leyendo el
flujo.

## Lo que hay que saber si se toca

- El fichero vive en `base-de-datos/herramientas/` y no en la raíz **por el
  `.npmrc`**: `node-linker=isolated`, «una app solo puede importar lo que
  declara». PGlite lo declara `base-de-datos`.
- El orden de la transacción —disfraz, sesión, identidad— es el de la decisión 0005. Cambiarlo aquí haría que las pruebas comprobaran otra cosa distinta de la
  que hace la API de verdad.
- Esto **no sustituye** a `pnpm bd:comprobar-api`. Aquella arranca la API contra
  Supabase de verdad, que es donde aparecen los fallos que un Postgres compilado a
  WebAssembly no puede enseñar. La lección de la migración `0016` sigue valiendo.
