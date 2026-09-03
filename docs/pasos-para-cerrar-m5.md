# Los pasos para cerrar M5

Lo que M5 deja pendiente de un botón, y que tiene que pulsar Richi porque toca
Supabase y GitHub. **Los pasos 1 y 2 ya están hechos** —se quedan escritos porque
explican por qué la base está como está—; lo que falta empieza en el 3.

---

## 1 · Cerrar las ocho cuentas con clave publicada · ~~pendiente~~ **hecho**

### Qué pasó

La base de datos de Supabase tenía **ocho cuentas cuya contraseña está escrita en
este repositorio**: `estook en desarrollo`, en
[`base-de-datos/semillas/acceso.ts`](../base-de-datos/semillas/acceso.ts). Una de
ellas, la de Elena, tiene rol `direccion` y lo ve todo.

Comprobado el 2 de septiembre contra la base de verdad:

```
personas de ejemplo   8      con contrasena   8
personas de verdad    0      con PIN         21
```

Y aquí está lo que se dio por bueno sin comprobarlo: este documento decía que no
se podía entrar con ellas «porque la API no está desplegada». **Ya lo estaba.**
Richi la había desplegado y publicado el paso anterior. No eran ocho puertas que
se abrirían algún día: eran ocho puertas abiertas.

Se cerraron el 3 de septiembre de 2026:

```
personas de ejemplo   8      sesiones abiertas   8
con contrasena        8      con PIN            21
personas de verdad    0      (no se toco ninguna)
```

### Por qué pasó

La semilla se negaba a correr «en producción» mirando la variable `ENTORNO`. Y esa
negativa **no podía saltar nunca**: `ENTORNO` vive en `.env.local`, donde pone
`desarrollo`, y `DATABASE_URL`, dos líneas más abajo del mismo fichero, apunta al
Supabase de verdad.

Es, palabra por palabra, lo que el Plan había escrito en E4: **«una comprobación
que no puede fallar es peor que no tenerla, porque da confianza»** y **«el nombre
de una cosa decide dónde acaba»**.

### Qué se hizo

La causa está arreglada: ahora se mira **a dónde se conecta**, no una etiqueta.
Contra una base remota la semilla se salta sola y lo dice. Y para limpiar lo que
ya estaba puesto:

```bash
pnpm bd:sin-cuentas-de-ejemplo
```

Borra las contraseñas, los PIN, los segundos factores y las sesiones de las
personas de ejemplo. **No borra a las personas ni sus locales**, y es a propósito:
el restaurante de ejemplo es lo que hace posible el modo demostración, que no usa
credenciales.

### Y después, una cuenta con la que puedas entrar tú · **esto falta**

Sin credenciales de ejemplo no hay forma de entrar en la aplicación publicada, y
la regla 11 pide probarla en un móvil de verdad.

```bash
pnpm bd:cuenta-de-verdad tu@correo.com "Ricardo"
```

Genera una contraseña de un solo uso, la enseña **una vez** y la marca como «hay
que cambiarla»: al entrar, M4 te obliga a poner una tuya y la de pantalla deja de
valer. No se escribe en ningún sitio.

> Esa cuenta nace sin negocio, así que al entrar dirá «tu cuenta no está asociada
> a ningún negocio». Para trabajar hace falta una organización, un local y una
> membresía, y el registro que los crea es M26. Mientras tanto, lo más cómodo para
> probar M5 es **el modo demostración**, que entra en el restaurante de ejemplo
> sin cuenta.

---

## 2 · Aplicar las dos migraciones nuevas · ~~pendiente~~ **hecho**

```bash
pnpm bd:migrar
```

Aplica la `0020` (el alta del local) y la `0021` (el catálogo de referencia). Son
reversibles y están probadas contra un Postgres 17 de verdad en la integración
continua.

Después, para que Casa Lola exista y el alta se pueda recorrer:

```bash
pnpm bd:sembrar
```

Contra Supabase esto siembra los `.sql` y **salta la cuarta semilla**, que es la
de las credenciales. Lo dice al hacerlo, y es lo correcto.

Y para comprobar que la API sigue pudiendo hablar con esa base:

```bash
pnpm bd:comprobar-api
```

> **Al primer intento la `0020` se cayó**, y merece quedar escrito: ponía la
> restricción de coherencia del alta antes de rellenar la columna. Contra el
> Postgres de las pruebas pasaba —allí `estook.local` está vacía cuando llega la
> migración— y contra los siete locales de Supabase saltó. No dejó nada a medias,
> porque cada migración va en su transacción. Está arreglado, y ahora hay una
> prueba que aplica las migraciones sobre una base ya sembrada.
>
> `bd:comprobar-api` dirá **once comprobaciones «sin poder comprobar»**. No son
> fallos: son las que necesitan entrar, y en esta base ya no hay cuentas de
> ejemplo. La propia salida lo explica.

---

## 3 · Montar el almacén de ficheros

El logo del local es el primer fichero que Estook guarda. Vive en Supabase
Storage, en un cubo privado llamado `marca`.

Primero, la clave de servicio en `.env.local`:

```
SUPABASE_SERVICE_KEY=   # Supabase → Project Settings → API → service_role
```

> **Esa clave no va nunca al navegador.** Es la única de todo el proyecto que se
> salta la seguridad por filas. Solo vive en tu máquina y en los secretos de Edge
> Functions.

Y después:

```bash
pnpm almacen:preparar
```

Crea el cubo y **comprueba el camino entero**: sube un fichero, lo firma, lo lee
por el enlace firmado, verifica que sin firmar no se sirve, y lo borra. Es la
lección de E4: crear el cubo y decir «listo» no demuestra nada.

Mientras esto no esté, el paso 5 del alta dice que todavía no hay dónde guardar
el logo. **El color de la marca sí funciona.**

---

## 4 · El secreto del almacén en Supabase

Supabase → Project Settings → Edge Functions → Secrets:

| Nombre                 | Qué es                                        |
| ---------------------- | --------------------------------------------- |
| `SUPABASE_SERVICE_KEY` | La misma de arriba. La necesita la API, no tú |

Sin ella, la API desplegada no puede firmar el enlace del logo, y la cabecera
enseña el logotipo de Estook en vez del del local. No se rompe nada: se dice.

---

## 4.5 · Aplicar la `0022`

Después de fusionar el PR #26, porque la base nunca va por delante del código:

```bash
pnpm bd:migrar
```

Añade una columna a `estook.local` que guarda **a qué paso se volvió** cuando se
reabre el alta desde el Panel. Sin ella, volver a por una cosa metía en el
asistente completo y salía otra vez la guía de instalación.

## 5 · Volver a desplegar la API, y mirarlo en el móvil

La API **ya está desplegada**, pero con el código de antes de M5. Hay que volver a
desplegarla para que conozca los comandos del alta, y eso va después de fusionar
la rama: «primero fusionar, después aplicar a Supabase». Los pasos de
[`pasos-para-cerrar-m4.md`](pasos-para-cerrar-m4.md) siguen valiendo tal cual.

Y después, lo único que no puedo firmar yo (regla 11): **verlo en un móvil de
verdad**. Hace falta haber creado la cuenta del paso 1. Lo que hay que mirar de
M5:

- Que los ocho pasos del alta caben en la pantalla sin desbordes.
- Que la previsualización de la marca se lee con el color elegido.
- Que la guía de instalación abre la pestaña que toca según el móvil.
- Y que el alta entera se hace **en menos de cuatro minutos con el pulgar**, que
  es el criterio de verdad. Lo que mide la prueba automática es que ningún paso
  se atasque, no lo que tarda una persona.
