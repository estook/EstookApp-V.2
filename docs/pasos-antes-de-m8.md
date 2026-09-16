# Pasos antes de M8 · las mejoras y el admin

> ## Cómo está
>
> | Qué                          | Cómo está                                                                                  |
> | ---------------------------- | ------------------------------------------------------------------------------------------ |
> | El local en Google           | **#51**, para llevarlo a `main`. Sus pasos, en `pasos-para-cerrar-m7.md`                   |
> | Los planes (mejoras y admin) | **#52**, solo documentos. Se fusiona **después** de la #51                                 |
> | **A1 · La puerta del admin** | **Pull request abierto**, rama `m7-admin-la-puerta`. Trae la `0037`. **Después** de la #52 |
> | Lo siguiente                 | **V · Lo que se ve** (`mejoras-antes-de-m8.md`)                                            |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## A1 · La puerta del admin

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
