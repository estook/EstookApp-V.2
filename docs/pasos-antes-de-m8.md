# Pasos antes de M8 · las mejoras y el admin

> ## Cómo está
>
> Comprobado en producción el 24 de septiembre de 2026 por la noche, leyendo la base, la
> API y GitHub.
>
> | Qué                        | Cómo está                                                                   |
> | -------------------------- | --------------------------------------------------------------------------- |
> | Pull requests              | **Todas fusionadas hasta la #67**. Esperan la #68 y la #69, en ese orden    |
> | La base de datos           | **45 de 45** migraciones, igual que `main`                                  |
> | La API                     | **Desplegada el 24 de septiembre a las 19:31**, con la #67: 45 y 87         |
> | A1 · la puerta del admin   | **Hecho**: `estookapp@gmail.com` y Santi dentro, los dos con segundo factor |
> | E1 · crear cuenta y Google | **Hecho**, y crear cuenta con correo probado por Richi el 23-sep            |
> | **V · lo que se ve**       | **Hecho y en producción** (#64, #65, #67), mirado por Richi en el móvil     |
> | Los arreglos del móvil     | **Hechos**, en la #68 (sin migración)                                       |
> | O · lo que se ordena       | **Hecha**, en la #69, con la migración `0046`                               |
> | E2 · el pago con Stripe    | Tu cuenta ya está. Hará falta **una clave de prueba** el día que empiece    |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Los arreglos del móvil (#68) y O · Lo que se ordena · lo que te toca ahora

**Son dos pull requests, y van en este orden**: primero los arreglos (#68), que no
llevan migración, y después O, que lleva **una** (`0046`). Cada uno se fusiona, se
migra si toca y se despliega la API antes del siguiente.

### Primero · los arreglos del móvil (#68)

**Qué trae:** el nombre de los productos entero en el móvil, la recarga que ya no te
saca de la app, y la barra de abajo que ya no se sale a 320 px. Contado en `ESTADO.md`,
apartado 1.

1. En **github.com**, pestaña **Pull requests** → **«Los arreglos del móvil: el nombre
   entero, la API sin tope y un fallo que no echa»**.
2. Abajo, las **tres comprobaciones en verde**: `Calidad`, `Construccion y
presupuestos` y `Migraciones reversibles`. Si alguna está en amarillo, espera. **Si
   alguna sale en rojo, para y avísame.**
3. **Merge pull request** → **Confirm merge**. Tiene que salir en morado «merged».
4. **Sin migración.** Ve directo a desplegar la API: pestaña **Actions** → a la
   izquierda, **Desplegar la API** → **Run workflow**, deja la rama en `main`, escribe
   **`desplegar`** y pulsa **Run workflow**. Espera al **círculo verde**.
5. En PowerShell, en la carpeta del proyecto, trae lo fusionado:

```bash
git checkout main
```

```bash
git pull
```

y comprueba la API:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas · las 45» y «y conoce todos los
comandos · los 87». Después **avísame**: repito contra producción la ráfaga de 30
consultas a la vez, y tiene que salir **sin un solo error** (antes fallaban 15).

**En el móvil:** Inventario → Productos: los nombres largos en dos líneas enteras. Y
recarga dos veces seguidas: sigues dentro.

### Después · O, lo que se ordena

**Qué trae:** el botón **«+»** (con Fogón arriba en su banner), **Lo de hoy** arriba
del Panel, el **Panel de cada puesto**, los **objetivos con semáforo** y **el QR de tu
carta**. Contado en `ESTADO.md`, apartado 1, y en la decisión 0047.

1. En **github.com** → **Pull requests** → **«O · Lo que se ordena»** (la #69). Las tres
   comprobaciones en verde, **Merge pull request** → **Confirm merge**.
2. En PowerShell, trae lo fusionado:

```bash
git checkout main
```

```bash
git pull
```

3. **La migración**. Qué es: la `0046` añade los objetivos de merma y de ventas, y le da
   a cada local su dirección de carta para siempre (IKATZ, `estook.com/carta/ikatz`). No
   cambia nada de lo que hay.

```bash
.\estook.cmd bd:migrar
```

**Qué tiene que salir**, tal cual:

```
  aplicando 0046_los_objetivos_y_la_carta_de_cada_local.sql ... hecho
  1 migracion(es) aplicadas · 46 en total
```

Si dice «la base de datos ya estaba al dia», el `git pull` no ha bajado lo fusionado:
repítelo. **Si sale un error en rojo, no lo repitas: cópiamelo tal cual.**

4. **Desplegar la API**, igual que antes (**Actions** → **Desplegar la API** → **Run
   workflow** → `desplegar`), y comprobar:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «las 48» consultas y «los 87» comandos.

5. **Mirarlo en el móvil** (recarga la app antes):
   - **El «+»** abajo a la derecha: arriba, **Pregúntale a Fogón**; debajo, fichar y
     tus atajos. «Cambiarlos» te deja poner los tuyos.
   - **Lo de hoy**, arriba del Panel: lo que caduca, los pedidos, la caja… con su botón.
   - **Tu Panel**: si nunca lo habías tocado, verás el de quien lleva el local. Si lo
     tenías montado, sigue el tuyo; **Editar → «Volver al de mi puesto»** pone el nuevo.
     Y al arrastrar un widget, **va donde sueltes el dedo**.
   - **Ajustes → Tu local → Tus objetivos**: revisa tu food cost (32 %), personal (32 %)
     y merma (4 %), y pon las ventas de la semana si quieres.
   - **Ajustes → Tu local → Tu carta y su QR**: abre `estook.com/carta/ikatz` desde el
     móvil con la cámara, y si te gusta, **imprime el cartel**. Ese QR ya no cambia.

---

## V, segunda parte · los vacíos, el oscuro y las fotos · **hecho** (#67)

**Qué trae:** los vacíos con su dibujo y un botón que hace lo que dice, el tema oscuro
medido pantalla a pantalla (y un arreglo que salió en el claro), las capturas que se
comparan en GitHub y **la foto de cada producto**. Todo contado en `ESTADO.md`,
apartado 1, y en la decisión 0046.

**Son tres pasos, seguidos y en este orden:** fusionar, aplicar **una** migración y
desplegar la API. El almacén de las fotos **ya está preparado**: lo hice yo el 24-sep, no
tienes que hacer nada ahí. Entre fusionar y desplegar, poner una foto a un producto dirá
que no se ha podido: es normal, se arregla en el paso 3.

### 1 · Fusionar

1. En **github.com**, pestaña **Pull requests** → **«V, segunda parte: los vacíos, el
   oscuro y las fotos»**.
2. Abajo, las **tres comprobaciones en verde**: `Calidad`, `Construccion y
presupuestos` y `Migraciones reversibles`. Si alguna está en amarillo, espera. **Si
   alguna sale en rojo, para y avísame.**
3. **Merge pull request** → **Confirm merge**. Tiene que salir en morado «merged».

### 2 · Aplicar la migración

**Qué es:** la `0045` le da a cada producto el sitio de su foto (dónde está guardada
la foto y su miniatura). No cambia nada de lo que ya hay.

**Dónde:** en **PowerShell**, en la carpeta del proyecto
(`C:\Users\rixy-\Documents\GitHub\EstookApp-V.2`). Primero trae lo fusionado:

```bash
git checkout main
```

```bash
git pull
```

**Qué tiene que salir:** «Fast-forward» y una lista de ficheros. Ahora la migración:

```bash
.\estook.cmd bd:migrar
```

**Qué tiene que salir**, tal cual:

```
  aplicando 0045_la_foto_del_producto.sql ... hecho
  1 migracion(es) aplicadas · 45 en total
```

Si dice **«la base de datos ya estaba al dia»**, el `git pull` no ha bajado lo fusionado:
vuelve a hacerlo. **Si sale un error en rojo, no repitas el comando: cópiamelo tal cual.**

Y se comprueba:

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** «Migraciones aplicadas: **45** (hasta la **45**)».

### 3 · Volver a desplegar la API

1. En **github.com**, pestaña **Actions** → a la izquierda, **Desplegar la API**.
2. **Run workflow**: deja la rama en `main`, escribe **`desplegar`** y pulsa el botón
   verde **Run workflow**.
3. Espera al **círculo verde** (un par de minutos). Si sale una **cruz roja**, avísame.
   Si dice que la base va por detrás, es que falta el paso 2.

Cuando esté en verde, en PowerShell:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los comandos».

### 4 · Mirarlo en el móvil (esto no lo puede hacer ninguna prueba)

Abre `estook.com/app/` y recarga (**Ctrl + F5** en el ordenador; en el móvil, cierra la
app y ábrela otra vez).

- **Una foto:** Inventario → Productos → abre un producto. Arriba a la izquierda, un
  recuadro con una cámara que dice **«Poner foto»**. Tócalo en el móvil: te deja
  **hacer la foto con la cámara** o elegirla de la galería. Tiene que salir «Foto
  puesta», la foto pequeña en la ficha y **en la lista de productos**. Tocando la foto
  se ve grande, y ahí están «Cambiar la foto» y «Quitar la foto».
- **Sin foto**, cada producto lleva sus iniciales en un recuadro del color de su
  categoría.
- **Los vacíos:** Inventario → Compras → Pedidos → **Cancelados**: un dibujo, «Ningún
  pedido cancelado» y el botón «Ver los abiertos». Busca en Productos algo que no
  exista: «Nada con …» y **«Quitar el filtro»**.
- **El oscuro:** Ajustes → Este aparato → **Oscuro**, y recorre las pantallas que más
  uses. Si algo no se lee bien, hazle una captura y me la pasas.
- **El claro:** arriba de Productos, la pestaña elegida («Todo») se lee mejor: el color
  de Inventario ahora es más oscuro en el texto.

---

## El repaso del 23 de septiembre · **hecho** (#66)

**Qué trae:** lo que viste en el móvil —la muesca, el zoom al tocar un campo, la letra
«Pequeña», Fogón repetido arriba, «11 por debajo del mínimo» con tres en la lista, la
merma que dejaba tirar más de lo que hay, los fichajes de la ficha y el «en línea» de
gente que no estaba—, **el jefe de cocina viendo las ventas**, y lo que encontró la
auditoría. Todo contado en `ESTADO.md`, apartado 1.

**Esta vez son tres pasos, seguidos y en este orden:** fusionar, aplicar **cuatro**
migraciones y desplegar la API. Entre fusionar y desplegar, la ficha de un trabajador
dirá «No he podido leer los fichajes» al pulsar «Ver todos»: es normal, se arregla en el
paso 3.

### 1 · Fusionar

1. En **github.com**, pestaña **Pull requests** → **«El repaso del 23 de septiembre»**.
2. Abajo, las **tres comprobaciones en verde**: `Calidad`, `Construccion y
presupuestos` y `Migraciones reversibles`. Si alguna está en amarillo, espera. **Si
   alguna sale en rojo, para y avísame.**
3. **Merge pull request** → **Confirm merge**. Tiene que salir en morado «merged».

### 2 · Aplicar las cuatro migraciones

**Qué es:** la `0041` deja al jefe de cocina ver las ventas; la `0042` hace que «en
línea» sea tener la app abierta; la `0043` cierra siete funciones de la base que
podía ejecutar cualquiera; y la `0044` hace el Resumen de Inventario varias veces más
rápido.

**Dónde:** en **PowerShell**, en la carpeta del proyecto
(`C:\Users\rixy-\Documents\GitHub\EstookApp-V.2`). Primero trae lo fusionado:

```bash
git checkout main
```

```bash
git pull
```

**Qué tiene que salir:** «Fast-forward» y una lista de ficheros. Ahora las migraciones:

```bash
.\estook.cmd bd:migrar
```

**Qué tiene que salir**, tal cual:

```
  aplicando 0041_el_jefe_de_cocina_ve_las_ventas.sql ... hecho
  aplicando 0042_en_linea_de_verdad.sql ... hecho
  aplicando 0043_las_funciones_con_privilegio_cerradas.sql ... hecho
  aplicando 0044_el_precio_vigente_de_muchos_a_la_vez.sql ... hecho
  4 migracion(es) aplicadas · 44 en total
```

Si dice **«la base de datos ya estaba al dia»**, el `git pull` no ha bajado lo fusionado:
vuelve a hacerlo. **Si sale un error en rojo, no repitas el comando: cópiamelo tal cual.**

Y se comprueba:

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** «Migraciones aplicadas: **44** (hasta la **44**)».

### 3 · Volver a desplegar la API

1. En **github.com**, pestaña **Actions** → a la izquierda, **Desplegar la API**.
2. **Run workflow**: deja la rama en `main`, escribe **`desplegar`** y pulsa el botón
   verde **Run workflow**.
3. Espera al **círculo verde** (un par de minutos). Si sale una **cruz roja**, avísame.
   Si dice que la base va por detrás, es que falta el paso 2.

Cuando esté en verde, en PowerShell:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los comandos».

### 4 · Mirarlo en el móvil y en el TPV

Abre `estook.com/app/` y recarga (**Ctrl + F5** en el ordenador; en el móvil, cierra la
app y ábrela otra vez).

- **La muesca:** en el iPhone, la barra de arriba y las hojas ya no quedan debajo del
  reloj.
- **El zoom:** toca un campo cualquiera (el buscador, una cantidad): la pantalla no se
  acerca.
- **La letra:** Ajustes → Este aparato → **«Pequeña»**. En el móvil, todo más pequeño; en
  el ordenador, igual que antes.
- **Fogón:** arriba ya no está su icono. La burbuja, abajo a la derecha, en el móvil **y
  en el ordenador**.
- **Inventario → Productos → Bajo mínimo** y **Congelados**: el número de arriba es el
  de los que salen en la lista. Y **Inventario abre bastante más rápido**.
- **La merma:** apunta una de más de lo que hay. Tiene que decirte «Quedan X y se están
  tirando Y» y no dejarte guardar.
- **Equipo → Resumen:** «Cómo va» justo debajo de fichar. Abre la ficha de alguien: sus
  **tres últimos fichajes** y **«Ver todos»**, que abre el historial entero.
- **«En línea»:** solo sale quien tiene la app abierta en ese momento. Si cierras la app
  en el móvil, en un par de minutos deja de salir en el ordenador.
- **El jefe de cocina** (si tienes uno): ve **Ventas de hoy** en el Panel y los cierres en
  Servicio, pero no puede cerrar la caja.

Si algo no se ve como te digo, hazle una captura y me la pasas.

---

## Los arreglos de después de la #64 · **hecho** (#65)

**Qué trae:** el widget de fichar y los demás del Panel dicen «No he podido leerlo»
cuando no pueden leer, en vez de «tu acceso no incluye fichar» o «nada caduca»; en
Inventario, **«Cómo va» arriba del todo**; y el despliegue de la API **ya no despliega
si la base va por detrás**.

**Fusionada el 23 de septiembre.** No llevaba migración y la API no cambiaba.

1. En **github.com**, pestaña **Pull requests** → **«Arreglos tras la #64»**.
2. Abajo, las **tres comprobaciones en verde**. Si alguna sale en rojo, para y avísame.
3. **Merge pull request** → **Confirm merge**. Tiene que salir en morado «merged».
4. Espera dos minutos, abre `estook.com/app/` y pulsa **Ctrl + F5**. Mira:
   - **Inventario → Resumen**: «Cómo va» arriba del todo y lo urgente debajo.
   - **El Panel → Fichar**: el botón «Fichar la entrada».
   - **Equipo → Resumen y Fichajes**: quién está y las horas.

---

## V · Lo que se ve, primera parte · **hecho** (#64)

> **En producción desde el 23 de septiembre de 2026.** Se fusionó y **se desplegó la API
> sin aplicar la `0040`**: Equipo y el fichar del Panel dejaron de funcionar hasta que
> se aplicó, unas horas después. Por eso el despliegue ahora lo comprueba solo. Los pasos
> de abajo se quedan como estaban, de referencia.

**Lo que trae:** el modo cocina; «Cómo va», las cifras con flecha; el **Resumen** de
cada app (antes «Hoy»); las tarjetas **en mosaico**, sin huecos; **Ajustes por
secciones** con buscador; **el aspecto nuevo**; y **el arreglo de entrar**: la cuenta que
solo es del admin ya no pide el código en la app, y la pantalla del código dice de qué
cuenta es ([0044](decisiones/0044-las-cifras-de-cada-app.md),
[0045](decisiones/0045-el-aspecto-y-el-orden.md)).

**El orden importa, y no se cambia:** primero fusionar, luego la migración, luego la
API, **seguidos y en ese orden**. Si se aplica la migración antes de fusionar, la base
va por delante del código, y eso es justo lo que la regla 1 prohíbe. La web se publica
sola al fusionar; hasta que la API esté desplegada, las cifras nuevas dirán «No he
podido leerlo». **Y si se despliega la API antes de migrar, sí se rompe**: pasó el 23-sep
con esta misma entrega. Desde entonces el despliegue lo comprueba y no deja hacerlo.

### 1 · Fusionar

**Qué es:** meter la rama de V dentro de `main`, que es lo que se publica.

**Dónde:** en **github.com**, en el repositorio de Estook:

1. Arriba, la pestaña **Pull requests**.
2. Entra en el que se llama **«V · Lo que se ve (primera parte)»**.
3. Baja hasta el final. Tienen que salir **tres comprobaciones en verde**: `Calidad`,
   `Construccion y presupuestos` y `Migraciones reversibles`. Si alguna está en
   amarillo, espera a que acabe. **Si alguna sale en rojo, para y avísame**.
4. Pulsa el botón verde **Merge pull request** y después **Confirm merge**.

**Qué tiene que salir:** «Pull request successfully merged and closed», en morado.

### 2 · Aplicar la migración

**Qué es:** añadir a la base de datos de verdad lo que V necesita: el margen de retraso
de cada local, con 5 minutos puestos a todos.

**Dónde:** en **PowerShell**, dentro de la carpeta del proyecto
(`C:\Users\rixy-\Documents\GitHub\EstookApp-V.2`). Antes, trae lo que acabas de
fusionar a tu ordenador:

```bash
git checkout main
```

```bash
git pull
```

**Qué tiene que salir:** que ha bajado cambios («Fast-forward» y una lista de ficheros).

Ahora la migración:

```bash
.\estook.cmd bd:migrar
```

**Qué tiene que salir**, tal cual:

```
  aplicando 0040_cuando_es_llegar_tarde.sql ... hecho
  1 migracion(es) aplicadas · 40 en total
```

Si dice **«la base de datos ya estaba al dia»**, es que el `git pull` no ha bajado lo
fusionado: vuelve a hacerlo. **Si sale un error en rojo, no repitas el comando: cópiamelo tal cual.**

Y se comprueba, leyéndolo de la base:

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** «Migraciones aplicadas: **40** (hasta la **40**)».

### 3 · Volver a desplegar la API

**Qué es:** poner en marcha el servidor con el código nuevo.

**Dónde:** en **github.com**, en el repositorio:

1. Arriba, la pestaña **Actions**.
2. A la izquierda, **Desplegar la API**.
3. A la derecha, el botón **Run workflow**. Se abre un recuadro: deja la rama en
   `main`, escribe **`desplegar`** en el campo y pulsa el botón verde **Run workflow**.
4. Espera a que salga el **círculo verde** (un par de minutos). Si sale una **cruz roja**,
   avísame.

Cuando esté en verde, en PowerShell:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los comandos».

### 4 · Mirarlo en tu TPV

Abre `estook.com/app/` y **recarga con Ctrl + F5** para que no te enseñe la versión vieja.

- **Inventario:** abre en **Resumen**, no en «Hoy». Arriba, lo que necesita tu atención,
  en tarjetas que encajan sin huecos; cada aviso en tres líneas, con **«¿Por qué?»** para
  ver la cuenta. Debajo, **«Cómo va»**, y al tocar **7 días / 30 días** las cifras cambian.
- **Equipo:** abre en **Resumen** (quién está hoy). Las horas de cada uno, con la columna
  **Retrasos**, están ahora en **Fichajes**.
- **Servicio → Cierre:** las mismas cifras de siempre, con la tarjeta nueva.
- **El Panel:** los widgets encajan como en un iPad, sin huecos entre ellos.
- **Ajustes:** a la izquierda, las secciones. Escribe «oscuro» o «IVA» en el buscador y
  te lleva al sitio. En **Tu local → «Cuándo es llegar tarde»** salen 5 minutos; si en tu
  local lo normal es otro margen, cámbialo ahí.
- **Modo cocina:** Ajustes → Este aparato. Ponlo en la tablet de la cocina.
- **Entrar:** sal de tu cuenta y entra en la **app** con `estookapp@gmail.com`. Tiene que
  decir «Esta cuenta no tiene ningún negocio en Estook» **sin pedirte el código**. Luego
  entra con la tuya (`belicar1905@gmail.com`) como siempre.

Si algo no se ve como te digo, hazle una captura y me la pasas.

---

## E1 · Crear cuenta, entrar con Google y la portada · **hecho**

> **Hecho y comprobado el 23 de septiembre de 2026.** Fusionada (#56), migrada,
> desplegada; **Resend** con el remitente `hola@estook.com` y **Google** con sus dos
> secretos, los dos probados por Richi. **No hay nada que hacer.** Lo de abajo se queda
> como referencia, por si un día hay que volver a montarlo.

Lo que trae ([0042](decisiones/0042-registro-abierto-google-y-la-oferta.md)): la portada
básica de `estook.com` con **Crear cuenta** e **Iniciar sesión**; la privacidad y las
condiciones; crear cuenta **con Google o con correo y código**; entrar **con Google,
contraseña o PIN**; **Elegir plan** al crear la cuenta; y **admin → Oferta** para
encender la prueba de 12 días. Y un arreglo de seguridad importante: **los intentos
fallidos de entrar no se estaban contando** (el bloqueo a los cinco no bloqueaba) y el
segundo factor no tenía límite. Ya sí.

**Sin los secretos no se rompe nada:** sin Resend, «crear cuenta con correo» dice que se
abre pronto; sin Google, el botón de Google no sale. Así que fusionar y migrar **no
esperan** a lo demás.

### 1 · Fusionar

**Dónde:** GitHub → **Pull requests** → «Antes de M8 · E1: crear cuenta, entrar con
Google y la portada» → las tres comprobaciones en verde → **Merge pull request** →
**Confirm merge**.

### 2 · Aplicar las dos migraciones

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** `0038_crear_cuenta_y_entrar_con_google` y
`0039_los_intentos_se_cuentan_de_verdad`.

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **39 de 39** migraciones, y en `plataforma` una tabla más,
`oferta_de_prueba`, con `RLS`.

### 3 · Volver a desplegar la API

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. Cuando termine:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los comandos».

**Mirarlo ya:** abre **https://estook.com** → sale «Tu cocina, bajo control.» con
**Crear cuenta** e **Iniciar sesión**. **Iniciar sesión** lleva a entrar, con las
pestañas **Con contraseña** y **Con PIN**. Entra con tu cuenta de siempre: tiene que
funcionar igual que antes.

### 4 · Resend · el correo que manda el código

**4.1 · Verificar el dominio.** resend.com → **Domains** → **Add Domain** → escribe
`estook.com` → región **Ireland (eu-west-1)** → **Add**. Te enseña **tres o cuatro
registros**: un `TXT` que empieza por `resend._domainkey`, un `MX` y un `TXT` de `send`,
y quizá uno de `_dmarc`.

**4.2 · Ponerlos en Hostinger.** hpanel.hostinger.com → **Dominios** → `estook.com` →
**DNS / Nameservers** → **Gestionar registros DNS**. Para cada registro de Resend:
**Tipo** el mismo; **Nombre** lo que Resend pone en «Name» (`resend._domainkey`,
`send`…, **sin** `.estook.com` detrás); **Valor** el de «Value»; en el `MX`, prioridad
**10** → **Añadir registro**.

**Cuidado:** **no borres** los registros que ya hay (los de GitHub Pages hacen que
`estook.com` funcione). Solo se añade.

**4.3 · Comprobar.** En Resend → **Verify DNS Records**. Puede tardar de minutos a unas
horas. **Qué tiene que salir:** el dominio **Verified**.

**4.4 · Los secretos, cuando esté «Verified».** supabase.com/dashboard → tu proyecto →
**Edge Functions** → **Secrets** → **Add new secret**, uno a uno → **Save**:

| Nombre             | Valor                                                      |
| ------------------ | ---------------------------------------------------------- |
| `RESEND_API_KEY`   | La clave de Resend que tienes apuntada (empieza por `re_`) |
| `CORREO_REMITENTE` | `Estook <hola@estook.com>`                                 |

**Por qué después de verificar:** con la clave puesta y el dominio sin verificar, Resend
rechaza los correos y crear cuenta diría «se nos ha roto algo». Sin la clave, dice que se
abre pronto, que es mejor.

**Si la clave que tienes es de «Full access»:** mejor una de **Sending access** solo
para `estook.com` (Resend → **API Keys** → **Create API Key**). Si esa se escapa, solo
sirve para mandar correos, no para tocar la cuenta.

**4.5 · Lo que queda de esto (23 de septiembre).** El dominio **ya está «Verified»**
desde el 17, y la clave está puesta. Lo que falló fue el remitente: `CORREO_REMITENTE`
se puso a `estookapp@gmail.com`, y **desde Gmail no se puede enviar** (Resend contesta
«The gmail.com domain is not verified»). Desde la #63 el servidor se da cuenta y envía
desde `hola@estook.com` por su cuenta, pero hay que dejarlo bien:

1. supabase.com/dashboard → tu proyecto → **Edge Functions** → **Secrets** → busca
   `CORREO_REMITENTE` → cámbialo a exactamente `Estook <hola@estook.com>` → **Save**.
2. Abre **https://estook.com/app/#/crear-cuenta** en una ventana privada, con un correo
   **que no tenga cuenta en Estook**, y elige «con correo».
3. **Qué tiene que salir:** te llega un correo de **Estook** con un código de seis cifras
   en un par de minutos (mira también en spam), y al escribirlo entras en **Elegir plan**.
4. **Si no llega:** Supabase → **Edge Functions** → `api` → **Logs**, busca
   `el correo del código de registro no ha salido` y pásame la línea entera.

### 5 · Google · entrar y crear cuenta con Google

Se usa **el mismo cliente de OAuth «Estook»** que creaste para Business Profile.

**5.1 · Las direcciones de vuelta.** console.cloud.google.com → tu proyecto → **APIs y
servicios** → **Credenciales** → **ID de clientes de OAuth 2.0** → **Estook** →
**URIs de redireccionamiento autorizados**:

- **Borra** la de Supabase (la que acaba en `/auth/v1/callback`).
- **Añade** exactamente estas dos, **con la barra final**:
  - `https://estook.com/app/`
  - `https://www.estook.com/app/`

**Orígenes de JavaScript autorizados:** vacío, no hace falta. → **Guardar**.

**5.2 · Un secreto nuevo** (el de antes pasó por el chat). En esa misma pantalla →
**Secretos del cliente** → **Añadir secreto** → copia el nuevo (empieza por `GOCSPX-`) →
en el viejo, **Inhabilitar** y después **Eliminar**.

**5.3 · La pantalla de consentimiento.** **Google Auth Platform** (o «Pantalla de
consentimiento de OAuth»):

- **Marca / Branding:** nombre **Estook**; correo de asistencia `estookapp@gmail.com`;
  página principal `https://estook.com`; política de privacidad
  `https://estook.com/privacidad/`; condiciones `https://estook.com/condiciones/`;
  **dominios autorizados** `estook.com` → **Guardar**.
- **Acceso a datos / Data access:** solo `openid`, `.../auth/userinfo.email` y
  `.../auth/userinfo.profile`. Son los básicos y **no piden revisión de Google**.
- **Público / Audience:** **Publicar app** → **Confirmar**, para que quede «En
  producción».

**Por qué publicar:** mientras está «En pruebas», **solo entran los usuarios de prueba**
que apuntes; los demás ven «acceso bloqueado». Con los tres permisos básicos, publicar no
necesita verificación. **Business Profile** añadirá un permiso «sensible» que sí pide
revisión: eso es E3, no ahora.

**5.4 · Los secretos.** Supabase → **Edge Functions** → **Secrets** → **Add new secret**:

| Nombre                       | Valor                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| `GOOGLE_OAUTH_CLIENT_ID`     | El «ID de cliente» (acaba en `.apps.googleusercontent.com`) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | El secreto nuevo del 5.2 (empieza por `GOCSPX-`)            |

**5.5 · El login de Supabase, apagado.** Supabase → **Authentication** → **Sign In /
Providers** → **Google** → **«Enable Sign in with Google» apagado**. No es este Google
(0010).

**Si a los dos minutos el botón de Google no sale** en `estook.com/app/`: GitHub →
Actions → **Desplegar la API** → `desplegar`, y vuelve a mirar.

### 6 · Probarlo de punta a punta

En una **ventana de incógnito** y con correos **que no tengan cuenta** en Estook.

1. **https://estook.com** → **Crear cuenta** → nombre del negocio (p. ej. «Prueba
   Richi») → marca **Acepto las condiciones** → **Continuar con Google** → elige la cuenta.
   **Qué tiene que salir:** vuelves a Estook y ves **Elige tu plan** (sin oferta).
2. Otra ventana de incógnito → **Crear cuenta** → nombre del negocio, condiciones, **tu
   nombre, otro correo y una contraseña** → **Crear cuenta**.
   **Qué tiene que salir:** «Mira tu correo», y en ese correo **un código de seis cifras**
   con el asunto «NNNNNN es tu código de Estook» (si no está, mira en **correo no
   deseado**). Escríbelo → **Crear mi cuenta** → **Elige tu plan**.
3. **Iniciar sesión** → **Continuar con Google** con el Gmail de tu cuenta de siempre (la
   de `ikatz`), si lo es: **entras en tu negocio**, y desde entonces Google y la contraseña
   son la misma cuenta.
4. **Admin → Oferta** → enciende **Oferta de prueba encendida**, deja **12** →
   **Guardar**. Abre **estook.com**: sale «Prueba 12 días gratis, sin tarjeta» y el botón
   dice **Empezar la prueba**. Una cuenta creada ahora **entra al alta**, no a elegir plan.
   **Apágala al terminar**, si no estás de campaña. En **Admin → Auditoría** queda la línea
   del cambio.

> **Las cuentas del paso 6** quedan como clientes «pendientes de pago». No molestan; en
> A2 (la lista de clientes) se podrán dar de baja desde el admin.

### 7 · Lo que necesito de ti

- **Para lo legal:** la **razón social**, el **NIF/CIF** y el **domicilio** del titular de
  Estook (si todavía no hay sociedad, dímelo y lo pongo como autónomo). Hoy la privacidad y
  las condiciones enseñan solo «Estook» y `estookapp@gmail.com`, sin inventar nada.
- **Para E2 (Stripe):** crear la cuenta en **stripe.com** con el correo de Estook y
  **activarla** con los datos del negocio y la cuenta bancaria. **No me pases ninguna clave
  por el chat**: cuando lleguemos te digo cuál, con qué nombre y dónde va.

> **Lo que salga raro, apúntalo tal cual**, con una foto si puedes.

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
