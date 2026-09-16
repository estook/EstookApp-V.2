# Pasos antes de M8 · las mejoras y el admin

> ## Cómo está
>
> Comprobado en producción el 16 de septiembre de 2026, leyendo la base y la API.
>
> | Qué                                  | Cómo está                                                                   |
> | ------------------------------------ | --------------------------------------------------------------------------- |
> | #51 (Google), #52 (planes), #53 (A1) | **Fusionadas**, con las tres comprobaciones en verde                        |
> | La base de datos                     | **37 de 37** migraciones, 52 tablas en `estook` y 2 en `plataforma`         |
> | La API                               | **Desplegada** después de la #54 (el repaso), a las 20:05                   |
> | `estookapp@gmail.com`                | **Dentro del admin**: contraseña propia puesta y segundo factor montado ✓   |
> | `santidearmijo58@gmail.com`          | Con acceso total, **todavía sin entrar**: le falta montar su segundo factor |
> | **El repaso de A1** (#54)            | **Fusionado y desplegado** ✓                                                |
> | **Google y la IA**                   | Places: clave creada, **falta ponerla en Supabase**. Resto: abajo, al final |
> | Lo siguiente                         | **V · Lo que se ve** (`mejoras-antes-de-m8.md`)                             |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

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

> **Los pasos 1 y 2 ya están hechos** (#54 fusionada y API desplegada a las 20:05).
> Te quedan el 3 y el 4.

### 1 · Fusionar el repaso · **hecho**

**Dónde:** GitHub → **Pull requests** → «Antes de M8 · repaso de A1» → las tres
comprobaciones en verde → **Merge pull request** → **Confirm merge**.

**No trae migración**, así que no hay que tocar la base.

### 2 · Volver a desplegar la API · **hecho**

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. Cuando termine:

```bash
.\estook.cmd bd:comprobar-api
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
.\estook.cmd bd:dar-admin santidearmijo58@gmail.com --nueva-clave
```

**Qué sale:** una contraseña de cinco palabras. Dásela en mano o por teléfono, **nunca
por un chat**.

### Si un día alguien pierde el móvil y los códigos

```bash
.\estook.cmd bd:dar-admin su@correo.com --sin-segundo-factor
```

**Qué sale:** «segundo factor borrado» y cuántas sesiones se han cerrado. Al entrar,
montará uno nuevo. Queda apuntado en la auditoría.

---

## Google y la IA · qué conectar y qué no todavía

Revisado el 16 de septiembre de 2026 con tus capturas. **Resumen:** Places se conecta
ya; Business Profile está bien empezado pero **hay que deshacer una cosa en Supabase** y
esperar a que Google apruebe; la IA **no se conecta todavía** porque ninguna parte de
Estook la usa aún.

### A · Places · se conecta ya

La clave ya la tienes. **Google te enseña `key=API_KEY` porque es su ejemplo para
pegarla en una dirección**; Estook no la usa así: la manda por dentro, en una cabecera.
Tú pegas **solo la clave**, sin `key=`.

**1 · Que la clave solo sirva para Places.** console.cloud.google.com → **APIs y
servicios** → **Credenciales** → tu clave → **Restricciones de API** → **Restringir
clave** → marca solo **Places API (New)** → **Guardar**. En «Restricciones de
aplicación» deja **Ninguna**: la usa el servidor de Supabase, que no tiene una IP fija.

**Por qué:** en tus capturas la clave aparece también en las métricas de Business
Profile, así que ahora mismo vale para más de lo que necesita.

**2 · Las cuotas y el aviso**, si no están: los puntos 5 y 6 del «Paso 6 · A» de
[`pasos-para-cerrar-m7.md`](pasos-para-cerrar-m7.md) (300 autocompletados y 50 fichas
al día, y un presupuesto de 8 € con avisos).

**3 · Ponerla en Supabase.** supabase.com/dashboard → tu proyecto → **Edge Functions**
→ **Secrets** → **Add new secret** → nombre **`GOOGLE_MAPS_KEY`** → valor, **solo la
clave** → **Save**.

**4 · Comprobarlo.** En Estook (la app, no el admin): **Ajustes → Tu local en Google**.

**Qué tiene que salir:** «Buscar mi local en Google» en vez de «Apagado». Busca «ikatz»
y tu ciudad, toca el tuyo y **Es este**. Debajo: «Este mes: 1 de 40 fichas».

**Si a los dos minutos sigue diciendo «Apagado»:** GitHub → Actions → **Desplegar la
API** → `desplegar`, y vuelve a mirar.

### B · Business Profile · deshacer una cosa, y esperar a Google

**Lo que está bien:** has habilitado la API y has creado un cliente de OAuth «Aplicación
web» llamado Estook. Eso hace falta.

**1 · Lo de Supabase, no.** La pantalla de tus capturas —**Authentication → Sign In /
Providers → Google**— es **el login de Supabase**, y Estook no lo usa: el login es
nuestro ([0010](decisiones/0010-el-login-es-nuestro.md)). Encenderlo no conecta Business
Profile; abriría otra puerta de entrada que no queremos. **Pulsa «Cancel»** y comprueba
que **«Enable Sign in with Google» queda apagado**.

**2 · La cuota está a 0, y es normal.** La página de la API lo dice: hasta que Google
**apruebe el acceso** del proyecto, no deja hacer ni una llamada. Si no has mandado el
formulario, es el «Paso 6 · B» de [`pasos-para-cerrar-m7.md`](pasos-para-cerrar-m7.md).
**Cuando te llegue el correo de aprobación, avísame.**

**3 · El secreto del cliente ha pasado por el chat** (el fichero JSON que adjuntaste).
Se da por visto. **No lo pongas en ningún sitio todavía**, borra el JSON de Descargas, y
cuando construyamos la conexión crearemos un secreto nuevo en Google («Add secret») y
borraremos este.

**4 · La «URI de redireccionamiento»** que pusiste es la del login de Supabase. La buena
será una dirección de nuestra API que todavía no existe: te la daré al construir la
conexión. **No hace falta tocarla ahora.**

**5 · Para más adelante:** el permiso para gestionar una ficha es de los que Google
llama «sensibles». Mientras la app esté «En pruebas», la conexión caduca cada siete
días; para dejarla fija, Google revisa la app (pide la política de privacidad en
estook.com y el dominio verificado). Se hace cuando la conexión esté construida.

**Lo que falta de código:** la pantalla «Conectar mi ficha de Google» y la vuelta de la
autorización. No está hecho, y solo se puede probar de verdad **cuando Google apruebe**.

### C · La IA · todavía nada

Ninguna parte de Estook llama hoy a una IA: Fogón tiene su sitio, pero **no habla**.
Lo primero que la usará es leer fotos de albaranes y del Z (M22); antes de eso, el
informe semanal y los avisos salen de reglas, sin IA. Poner hoy una clave no
encendería nada.

**Lo que ya está decidido:** Gemini, el Flash que esté vigente al conectarlo, con tope de
1.800 llamadas al mes por local.

**Lo que harás cuando toque**, y te lo diré con cada paso: sacar la clave en Google AI
Studio **dentro de este mismo proyecto y con la facturación puesta** —en el plan
gratuito Google puede usar lo que se le manda para entrenar, y aquí van datos de un
restaurante—, y ponerla en Supabase como `AI_API_KEY`.
