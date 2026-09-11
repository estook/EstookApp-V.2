# 0036 · La dirección es estook.com, y la sabe el código

**Fecha:** 11 de septiembre de 2026
**Estado:** decidido y construido · sustituye a la parte de dirección de la
[0001](0001-publicacion-en-github-pages.md)

## Lo que pasó

Richi compró `estook.com`, lo apuntó a GitHub Pages desde Hostinger —cuatro
registros A y `www` por CNAME, bien puestos— y lo declaró como dominio propio en
Pages. **Y la aplicación se quedó en blanco**, en el dominio nuevo y en el viejo,
porque el viejo redirige al nuevo.

No falló nada de forma visible. La página cargaba; lo que pedía eran sus ficheros
en `/EstookApp-V.2/assets/…`, que es donde vivían mientras el sitio era un sitio
de proyecto. Ahí ya no hay nada, así que no llegaba a pintar.

El flujo de publicación deducía la raíz del nombre del repositorio **salvo que
alguien declarase una variable** en los ajustes de GitHub. Es decir: estrenar el
dominio dejaba el producto caído hasta acordarse de tocar una pantalla que no es
la del código. Lo mismo con la API, que solo aceptaba llamadas de
`estook.github.io` porque la lista vivía en un secreto de Supabase.

## Lo que se decide

### Uno · La dirección va en el código

`VITE_BASE` es `/` y `VITE_APP_URL` es `https://estook.com/`, **escritos en el
flujo de publicación**, no deducidos ni leídos de una variable. La dirección de
Estook no es un ajuste de cada instalación: es del producto, y se lee donde se lee
todo lo demás.

### Dos · La API sabe cuáles son los nuestros

`https://estook.com` y `https://www.estook.com` los lleva `servidor/api/index.ts`
en `NUESTROS_ORIGENES`, y se añaden siempre. `ORIGENES_PERMITIDOS` se queda **para
lo que sí cambia**: una previsualización, el dominio de un cliente, una prueba
desde otro sitio. Y nunca `*`.

### Tres · Las cuatro aplicaciones, donde estaban

```
estook.com          apps/web
estook.com/app/     apps/app
estook.com/carta/   apps/carta
estook.com/admin/   apps/admin
```

La dirección vieja, `estook.github.io/EstookApp-V.2/`, la redirige GitHub sola.

## Lo que esto no cambia

- **Se sigue publicando en GitHub Pages** (0001), con su `404.html` por aplicación.
- **El enrutado sigue con almohadilla** (0008). Con dominio propio ya se puede
  volver a direcciones limpias, pero es un cambio aparte: aquí solo se arregla lo
  que dejó la aplicación caída.

## Lo que enseña

Un fallo que deja el producto caído no puede depender de acordarse de declarar una
variable en otra pantalla. Si un dato lo decide el producto, va en el código; si lo
decide la instalación, va en el entorno. La dirección la decide el producto.
