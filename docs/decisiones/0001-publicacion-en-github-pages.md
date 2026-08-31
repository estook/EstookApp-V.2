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
- `VITE_BASE` se declara una sola vez en las variables del repositorio. Vale `/`
  para un sitio de organizacion (`estook.github.io`) y `/EstookApp-V.2/` para uno
  de proyecto.
- **Queda abierto:** la Parte C del Plan pide que la web publica se renderice en
  servidor para posicionar, y GitHub Pages solo sirve ficheros. O se prerenderiza
  en el momento de construir, o `apps/web` acaba en otro sitio. Se decide en M26,
  que es donde entra la web publica; hacerlo ahora seria inventar.
