# 0001 · Se publica en GitHub Pages, no en Netlify

**Fecha:** 31 de agosto de 2026
**Modulo:** M0
**Estado:** aceptada

## El problema

Dos documentos decian cosas distintas. El Plan de desarrollo, en A3, cierra el
stack con «CI/CD: GitHub Actions → Netlify». El inventario de claves del proyecto,
en cambio, define `VITE_APP_URL=https://estook.github.io` y `VITE_BASE`, que son
de GitHub Pages. No es un detalle: cambia el flujo de publicacion, el `base` de
Vite y como se resuelve el enrutado de una aplicacion de una sola pagina.

## La decision

Se publica en **GitHub Pages**, que es lo que hay montado hoy. Lo pidio Richi
expresamente el 31 de agosto de 2026.

Las cuatro aplicaciones comparten dominio y se reparten por subcarpeta:

```
VITE_BASE            ->  apps/web
VITE_BASE + app/     ->  apps/app
VITE_BASE + carta/   ->  apps/carta
VITE_BASE + admin/   ->  apps/admin
```

## Que implica

- El enrutado de cliente necesita un `404.html` que copie al `index.html` de cada
  aplicacion. Lo hace el flujo de publicacion, no se mantiene a mano.
- **La direccion es `https://estook.github.io/EstookApp-V.2/`**, confirmada por
  Richi el 31 de agosto de 2026, hasta que compre `estook.com`. Es un sitio de
  proyecto, asi que `VITE_BASE` vale `/EstookApp-V.2/`.
- Para no depender de que nadie se acuerde de declararla, el flujo de publicacion
  la deduce del nombre del repositorio. Se puede pisar declarando la variable
  `VITE_BASE` en el repositorio; el dia del dominio propio, se pone a `/`.
- **Sintoma de tener esto mal:** la pagina carga en blanco. El HTML pide los
  ficheros en `/assets/...` en vez de en `/EstookApp-V.2/assets/...`, no los
  encuentra, y no llega a pintar nada. Paso exactamente eso en la primera
  publicacion, antes de saber cual era la direccion.
- **Queda abierto:** la Parte C del Plan pide que la web publica se renderice en
  servidor para posicionar, y GitHub Pages solo sirve ficheros. O se prerenderiza
  en el momento de construir, o `apps/web` acaba en otro sitio. Se decide en M26,
  que es donde entra la web publica; hacerlo ahora seria inventar.
