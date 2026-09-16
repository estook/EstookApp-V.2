# Pasos antes de M8 · las mejoras y el admin

> ## Cómo está
>
> Comprobado en producción el 16 de septiembre de 2026, leyendo la base y la API.
>
> | Qué                                  | Cómo está                                                                     |
> | ------------------------------------ | ----------------------------------------------------------------------------- |
> | #51 (Google), #52 (planes), #53 (A1) | **Fusionadas**, con las tres comprobaciones en verde                          |
> | La base de datos                     | **37 de 37** migraciones, 52 tablas en `estook` y 2 en `plataforma`           |
> | La API                               | **Desplegada** después de la #53, y conoce las 42 consultas y los 79 comandos |
> | `estookapp@gmail.com`                | **Dentro del admin**: contraseña propia puesta y segundo factor montado ✓     |
> | `santidearmijo58@gmail.com`          | Con acceso total, **todavía sin entrar**: le falta montar su segundo factor   |
> | **El repaso de A1**                  | **Pull request abierto** (rama `antes-de-m8-repaso-de-a1`): ver abajo         |
> | Lo siguiente                         | **V · Lo que se ve** (`mejoras-antes-de-m8.md`)                               |

Los comandos van con `.estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## A1 · La puerta del admin · **hecho**

> Los pasos 1 a 5 ya los has hecho: se quedan escritos por si hay que repetirlos con
> otra persona o en otra base. **Lo que te queda está en «El repaso de A1», al final.**

### 1 · Fusionar, en este orden: #51, #52 y la de la puerta

**Dónde:** GitHub → **Pull requests**. Para cada uno, espera las tres comprobaciones en
verde —`Calidad`, `Construccion y presupuestos` y `Migraciones reversibles`— →
**Merge pull request** → **Confirm merge**.

**Por qué en orden:** cada uno sale del anterior. Fusionados al revés, uno arrastraría
al otro sin que lo hubieras mirado.

**Si alguna comprobación sale en rojo:** no fusiones; mándame una foto de la que falla.

### 2 · Aplicar las dos migraciones

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** las líneas `0036_el_local_en_google` y `0037_la_puerta_del_admin`.

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **37 de 37** migraciones, **52 tablas** en `estook`, y una
sección nueva, **«Tablas del esquema plataforma»**, con `administrador` y `auditoria`,
las dos con `RLS`, y **«Con acceso al admin: 0»**.

### 3 · Volver a desplegar la API

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. Cuando termine:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los comandos».

### 4 · Darte acceso al admin

```bash
.\estook.cmd bd:dar-admin estookapp@gmail.com "Estook"
```

**Qué sale:** «Acceso total al admin», tu correo y **una contraseña de cinco
palabras**. **Se enseña una sola vez**: cópiala ahora.

**La contraseña que escribiste en el chat no se usa**, a propósito: lo que pasa por un
chat se da por visto, igual que se hizo con las claves de Google.

### 5 · Entrar por primera vez

**Dónde:** **https://estook.com/admin/** en el ordenador.

1. **Tu correo** y **la contraseña del paso 4** → **Entrar**.
2. **«Pon una contraseña tuya»**: la del paso 4 arriba, y dos veces la nueva (al menos
   diez caracteres; una frase que recuerdes vale). → **Guardar y seguir**.
3. **«Monta el segundo factor»** → **Empezar**. Te enseña una clave en grupos de cuatro.
   En el móvil, abre tu aplicación de autenticación (Google Authenticator, Microsoft
   Authenticator o 1Password) → **añadir** → **introducir clave** → pega o teclea la
   clave. Escribe en Estook el código de seis números que sale → **Confirmar**.
4. **«Tus códigos de respaldo»**: ocho códigos. **Apúntalos fuera del móvil** (papel o
   gestor de contraseñas): son para cuando lo pierdas. → **Ya los tengo apuntados**.

**Qué tiene que salir:** la pantalla **Administradores**, contigo en la lista como
«Estook (tú)», «Desde la consola». Arriba, «Estook · hasta las HH:MM»: ocho horas
desde que entraste.

### 6 · Mirarlo

- **Auditoría**: tienen que salir dos líneas —«Estook entró en el admin» y «La consola
  dio acceso total a Estook, con cuenta nueva»—, con la hora y la dirección desde la que
  entraste.
- **Sistema de diseño**: el catálogo de siempre, ahora detrás de la puerta.
- **Salir** y volver a entrar: esta vez te pide solo la contraseña y **el código**.
- **Abre https://estook.com/admin/ en una ventana de incógnito**: no se ve nada más que
  «Entra en el admin». Antes, el catálogo se veía sin entrar.
- **Cierra la pestaña y vuelve a abrirla**: te pide entrar otra vez. Es a propósito.

### 7 · Si quieres, darle acceso a alguien

**Administradores → Dar acceso** → su correo, su nombre y **tu código otra vez** → **Dar
acceso total**. Si no tenía cuenta en Estook, sale **una contraseña de un solo uso**:
dásela en mano, nunca por un chat. Esa persona hará los pasos 5 y 6 la primera vez.

Para quitárselo: **Quitar el acceso** en su fila → **Por qué** y **tu código** → deja
de poder entrar en su siguiente paso, aunque lo tenga abierto.

> **Lo que salga raro, apúntalo tal cual**, con una foto si puedes.

---

## El repaso de A1 · lo que te queda

Revisando A1 después de fusionarla salieron tres cosas, arregladas en un pull request
aparte:

1. **Con la contraseña de un solo uso sin cambiar, la API dejaba leer la lista de
   admins y la auditoría** si se llamaba a pelo (la pantalla no). Ya no.
2. **Nadie podía rescatar a un admin** que olvidara la contraseña o perdiera el móvil
   y sus códigos. Ahora `bd:dar-admin` tiene `--nueva-clave` y `--sin-segundo-factor`.
3. **En el móvil, la cabecera del admin ocupaba un tercio de la pantalla**, y en tu
   fila salía «Acceso» vacío. Ahora son dos líneas, con las secciones deslizables.

### 1 · Fusionar el repaso

**Dónde:** GitHub → **Pull requests** → «Antes de M8 · repaso de A1» → las tres
comprobaciones en verde → **Merge pull request** → **Confirm merge**.

**No trae migración**, así que no hay que tocar la base.

### 2 · Volver a desplegar la API

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. Cuando termine:

```bash
.estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los comandos».
Hace falta porque el arreglo 1 está en la API; la pantalla se publica sola al fusionar.

### 3 · Mirarlo en el móvil

**Dónde:** `estook.com/admin/` en el móvil, entrando con tu código.

**Qué tiene que salir:** arriba, **el logo y «Salir» en una línea**, y debajo
**Administradores · Auditoría · Sistema de diseño** en una tira que se desliza con el
dedo. En tu fila, «El tuyo: te lo quita otro admin».

### 4 · Santi, cuando entre por primera vez

`santidearmijo58@gmail.com` ya tiene acceso total y **ya tenía cuenta en Estook**, así
que entra con **su contraseña de siempre**. Al entrar le pedirá montar el segundo
factor con su móvil y apuntar sus códigos de respaldo (el paso 5 de arriba, desde el 3).
Si no se acuerda de la contraseña:

```bash
.estook.cmd bd:dar-admin santidearmijo58@gmail.com --nueva-clave
```

**Qué sale:** una contraseña de cinco palabras. Dásela en mano o por teléfono, **nunca
por un chat**.

### Si un día alguien pierde el móvil y los códigos

```bash
.estook.cmd bd:dar-admin su@correo.com --sin-segundo-factor
```

**Qué sale:** «segundo factor borrado» y cuántas sesiones se han cerrado. Al entrar,
montará uno nuevo. Queda apuntado en la auditoría.
