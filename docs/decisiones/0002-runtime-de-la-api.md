# 0002 · La API se escribe en Hono y corre sobre Supabase Edge Functions

**Fecha:** 31 de agosto de 2026
**Modulo:** M0 (la decision) · M2 (la implementacion)
**Estado:** aceptada

## El problema

El Plan, en A3, dice «API y dominio: servicio propio en TypeScript con Hono», y en
A4 dibuja la carpeta `servidor/` con sus capas. Lo que no dice en ninguna parte es
**donde corre** ese servicio. Mientras tanto, el proyecto de Supabase ya tenia tres
Edge Functions desplegadas (`correo`, `fogon`, `lugares`) de la version anterior de
Estook.

Preguntado, Richi respondio que aquello es de una version antigua, que se puede
empezar de cero y que se elija lo mejor.

## La decision

`servidor/` se escribe en **Hono** y se despliega como **Supabase Edge Functions**
(Deno), en una sola funcion que enruta todo bajo `/v1/...`.

## Por que

1. Las cuatro aplicaciones se publican en GitHub Pages, que son ficheros estaticos.
   Haga falta o no un servidor propio, la parte dinamica tiene que vivir en otro
   sitio de todas formas.
2. Supabase ya es la base de datos elegida en A3. Poner la API al lado evita un
   salto de red extra, un despliegue mas y un tercer panel donde equivocarse.
3. Hono corre nativamente sobre Deno. La decision de A3 se respeta tal cual: el
   dominio sigue aislado del transporte, y cambiar de runtime seria cambiar el
   adaptador de `servidor/api`, que es la unica capa que toca HTTP.
4. Los secretos ya viven en el panel de Edge Functions, que es donde este
   proyecto los tiene desde el principio.

## Que implica

- **No hay proceso largo.** Los workers de M2 no pueden ser un bucle en memoria:
  van por cola en tabla mas `pg_cron`, que es exactamente lo que A3 describe
  («cola en tabla + worker programado»).
- **Chromium sin interfaz no cabe en Deno.** La generacion de documentos de M11
  necesitara un servicio aparte. Se decide en M11.
- Nada de esto se construye en M0. Aqui solo queda escrita la decision y la
  estructura de carpetas con sus reglas de dependencia.
