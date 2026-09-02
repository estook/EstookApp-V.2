# 0010 · El login es nuestro, no de Supabase Auth

**Fecha:** 2 de septiembre de 2026 · **Módulo:** M4 · **Estado:** aceptada

## Lo que había que decidir

M4 trae el login. La columna `persona.auth_id` nació en M1 con el comentario
«enlace con Supabase Auth», y las claves públicas de Supabase llevan declaradas
desde M0. Así que la opción por defecto era usar Supabase Auth: contraseñas,
correos y doble factor, hechos y mantenidos por otro.

## Lo que se decidió

**La identidad la resuelve nuestra API.** Contraseñas derivadas por nosotros,
sesiones en `estook.sesion`, PIN por local, y segundo factor propio. Supabase
sigue siendo la base de datos y el sitio donde corre la API; su servicio de
autenticación no se usa.

`persona.auth_id` se queda, sin usar, por si algún día hay identidad federada. Su
comentario se corrigió en la `0018`: una columna cuyo comentario miente es peor
que una columna vacía.

## Por qué

**1. La decisión 0005 ya lo había decidido a medias, y por escrito.** Dice, de
`estook.persona_actual()`:

> «Se hace así, y no con `auth.uid()`, porque la API es nuestra (decisión 0002) y
> porque de este modo el modelo se puede probar en cualquier Postgres, sin
> depender de que exista el esquema de autenticación de Supabase.»

Todo el modelo de permisos de M1 cuelga de ahí. Meter Supabase Auth ahora
significaría dos sitios donde vive «quién eres», y el segundo tendría que
mantenerse a mano en sincronía con el primero.

**2. Las pruebas se quedarían sin poder entrar.** Dos de las tres capas de
pruebas corren contra PGlite, donde **no existe el esquema `auth`**. Con Supabase
Auth, ni las pruebas de base de datos ni las de extremo a extremo podrían
autenticar a nadie: habría que simularlo, y una prueba que simula el login no
prueba el login. Es exactamente el razonamiento de la decisión 0009 con
`unaccent`, aplicado a algo más gordo.

**3. La mitad de M4 no cabe en Supabase Auth de todas formas.** El PIN es **por
local y único dentro de él** (Manifiesto 28), y eso no es un concepto que exista
en ningún servicio de autenticación. «Retirar el acceso mata el PIN al instante y
cierra las sesiones» necesita nuestra tabla de sesiones. Con Supabase Auth
habríamos escrito igualmente la mitad, y además la otra mitad.

**4. Pesa.** `@supabase/supabase-js` añade unos 40 KB a lo que descarga el móvil,
para hacer algo que se resuelve con una cabecera. Con lo nuestro, M4 entero le
costó a la aplicación **7,6 KB**.

## Lo que se paga por ello

**Escribimos nosotros el guardado de las contraseñas.** Con PBKDF2-HMAC-SHA256 a
210.000 vueltas, que es lo que recomienda OWASP, sobre `crypto.subtle`, que existe
igual en Node, en Deno y en el navegador. Los parámetros viajan dentro de lo
guardado, así que subir el coste dentro de tres años no invalida ni una
contraseña. Está en `servidor/dominio/secretos.ts`, con su prueba.

Argon2id sería mejor —cuesta memoria además de tiempo— pero exige una dependencia
o un módulo nativo, y este código tiene que correr en tres sitios distintos.

**Y el segundo factor.** TOTP, el de las aplicaciones de autenticación. Está en
`servidor/dominio/doble-factor.ts` y se prueba **contra los vectores del RFC
6238**, que son los códigos que publica el propio estándar: si pasan, la
aplicación que tenga instalada la gerente enseñará los mismos números que
calculamos nosotros.

**No hay recuperación por correo**, porque no hay proveedor de correo dado de
alta. Y no hace falta: el Plan ya lo había resuelto de otra manera, «segundo
administrador **o** correo de recuperación obligatorio». Quien lleva el local pone
una contraseña nueva y la da en mano; quien entra con ella tiene que cambiarla
antes de tocar nada, y eso lo impone el despachador, no la pantalla.

## Cuándo se revisaría

Si algún día hay que entrar con Google o con Microsoft —que en cadenas grandes se
pide— entonces sí entra un proveedor de identidad, y `auth_id` deja de estar
vacía. Eso no cambiaría nada de lo de aquí: seguiría habiendo sesiones nuestras y
PIN por local, y el proveedor sería una forma más de demostrar quién eres.

## Lo que hay que saber si se toca

- Las **once funciones `security definer`** de la `0018` son la única puerta de
  atrás del sistema, y existen porque al entrar todavía no hay identidad que
  consultar. Están tasadas, solo las ejecuta `estook_api`, y hay una prueba que
  las cuenta. Si un día son doce, que sea a propósito.
- El token viaja en `Authorization: Bearer` y **no en una cookie**. Está razonado
  en `apps/app/src/datos/cliente.ts`: la aplicación y la API viven en dominios
  distintos.
- `x-persona-id` ya no existe. Había una prueba que la usaba en todas partes; que
  no vuelva.
