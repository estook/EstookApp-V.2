# 0008 · El enrutado va con almohadilla, mientras se publique en GitHub Pages

**Fecha:** 1 de septiembre de 2026 · **Módulo:** M3 · **Estado:** aceptada,
temporal

## Qué se decide

La aplicación usa `HashRouter` en vez de `BrowserRouter`. Las direcciones son
`/app/#/inventario/hoy` y no `/app/inventario/hoy`.

## Por qué

La decisión **0001** publica en GitHub Pages, que **sirve ficheros y no sabe
reescribir**. Con direcciones normales:

- Abrir un enlace profundo que alguien ha compartido → **404**.
- Recargar la página estando dentro de una app → **404**.
- Volver desde un correo o desde un marcador → **404**.

Y no es un 404 nuestro, con su estado vacío y su botón: es el 404 de GitHub, que
no se puede tocar.

El truco habitual —copiar `index.html` como `404.html` y volver a entrar por
JavaScript— funciona, pero **pierde la dirección de origen en algunos casos** y
mete un salto visible al cargar. Para una aplicación que se abre en la cocina con
mala cobertura, un rebote de más es peor que una almohadilla.

## Qué se pierde

Direcciones un poco más feas. Nada más: la almohadilla no afecta al
posicionamiento, porque la aplicación **no se posiciona** —está detrás de un
login, y quien la indexa es `apps/web`, que es otra aplicación y sí lleva
direcciones normales (Parte C).

## Cuándo se cambia

El día que exista `estook.com` con un servidor que sepa reescribir todo a
`index.html`. Entonces:

1. `HashRouter` pasa a `BrowserRouter` con `basename={import.meta.env.BASE_URL}`.
2. Se comprueba que recargar dentro de una app sigue funcionando.
3. Se dejan redirecciones de las direcciones con almohadilla, que ya estarán
   compartidas por ahí.

Es un cambio de tres líneas, y está aquí escrito para que el día que toque no
haya que volver a razonarlo.
