# 0005 · Cómo se conecta la API a la base de datos

**Fecha:** 1 de septiembre de 2026
**Módulo:** M1 (la decisión) · M2 (la implementación)
**Estado:** aceptada

## El problema

Al repasar M1 aparecieron dos cabos sueltos que, improvisados en M2, causarían un
fallo grave y silencioso.

**Uno.** `ESTADO.md` decía «la API se conecta como `estook_api`». Eso **no es
posible**: `estook_api` se creó con `NOLOGIN` a propósito, porque no queremos una
contraseña más rodando por ahí. Nadie puede conectarse con ese rol.

**Dos.** Las políticas de seguridad de M1 se apoyan en
`current_setting('estook.persona_id')`. Alguien tiene que ponerlo en cada
petición, y nunca se escribió cómo ni con qué alcance.

El segundo cabo es el peligroso. Las Edge Functions van contra el **agrupador en
modo transacción**, donde una misma conexión de Postgres se reparte entre
peticiones de personas distintas. Si la identidad se declara con un `SET` normal,
**se queda pegada a la conexión y la hereda quien venga después**. Es decir: el
camarero del Bar Centro leyendo los datos de la cadena. Exactamente lo que M1
existe para impedir.

## La decisión

La API se conecta con un rol que **sí** tiene login (el usuario de Postgres del
proyecto), y en **cada transacción**, antes de tocar un solo dato:

```sql
begin;
  set local role estook_api;
  set local estook.persona_id    = '<la persona autenticada>';
  set local estook.correlacion_id = '<la correlacion de la peticion>';

  -- aqui, y solo aqui, se lee y se escribe
commit;
```

Tres reglas que salen de ahí, y que M2 tiene que respetar:

1. **`set local`, nunca `set`.** `LOCAL` muere con la transacción. Un `SET` normal
   sobrevive en la conexión y contamina la siguiente petición.
2. **Toda petición que toque datos abre una transacción.** También las de solo
   lectura. No es opcional: fuera de una transacción, `set local` no tiene dónde
   agarrarse y la identidad se pierde o se filtra.
3. **La aplicación nunca corre como dueño ni con `bypassrls`.** El `set local
role estook_api` es lo que hace que las políticas apliquen. Sin él, las
   políticas de M1 son decoración.

## Por qué así y no de otra manera

- **Por qué no un rol con contraseña propia.** Sería una credencial más que
  guardar, rotar y filtrar. `SET ROLE` da el mismo aislamiento sin ninguna clave
  nueva.
- **Por qué no `auth.uid()` de Supabase.** Ya está en la decisión 0002: la API es
  nuestra. Con una variable de sesión el modelo se prueba en cualquier Postgres,
  y de hecho las 93 pruebas de M1 corren así. Cuando M4 traiga Supabase Auth, lo
  único que hará es traducir el usuario autenticado a su `persona_id` y ponerlo
  aquí.
- **Por qué no dejarlo para M2.** Porque es una decisión de seguridad, no de
  comodidad, y el fallo que evita no da error: da datos de más.

## Qué implica

- El cliente de base de datos de `servidor/infraestructura` expone **una sola**
  forma de hablar con Postgres: «ejecuta esto en una transacción como esta
  persona». No hay forma de saltársela, igual que no hay forma de que el cliente
  escriba en una tabla de dominio (regla 3).
- Hay una prueba que comprueba que la identidad **no sobrevive** a la
  transacción. Si alguien cambia un `set local` por un `set`, la prueba se cae.
