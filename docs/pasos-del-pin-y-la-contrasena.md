# Pasos de «El PIN y la contraseña»

> ## Cómo está
>
> Escrito el 24 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                                                 |
> | ---------------- | ----------------------------------------------------------------------------------------- |
> | Pull requests    | **#134 «El PIN y la contraseña»**, abierta (rama `el-pin-y-la-contrasena`)                |
> | La base de datos | **83 de 83** en producción (leído el 24-oct); esta entrega trae **la 0084**               |
> | La API           | En producción con T1: 109 consultas y 261 comandos; esta entrega la deja en **109 y 265** |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de
antes, en [`pasos-de-t1.md`](pasos-de-t1.md).

---

## Lo que cambia para ti, en dos frases

- **El PIN es para los aparatos del local** (Estook TPV y fichar). **Estook se abre con tu
  contraseña o con Google**: ya no hay pestaña «Con PIN».
- **Lo olvidado se recupera sin esperar a nadie**, con un enlace al correo: «¿La has olvidado o no
  tienes una?» en la puerta de Estook, y «¿Has olvidado tu PIN?» en el aparato del local.

Lo hecho y por qué, en la [0109](decisiones/0109-el-pin-y-la-contrasena.md). Mira sobre todo la
sección 5, «Lo que decidí al construirlo».

## Lo que te toca ahora · fusionar, migrar y desplegar

**Con migración (0084) y con la API.** Hazlo **en este orden y seguido**: entre fusionar y
desplegar, la puerta nueva de Estook ya no tiene «Con PIN», pero la API todavía no sabe mandar el
enlace, así que «¿La has olvidado?» no funciona hasta que despliegues.

1. **En GitHub**: abre el pull request **#134 «El PIN y la contraseña»** y, con las **tres
   comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

   ```powershell
   .\estook.cmd bd:migrar
   ```

   Tiene que decir que aplica **la 0084** y que hay **84 en total**. Si dice otra cosa, para y
   dímelo con lo que sale.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**, para comprobarlo:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **109 consultas y 265 comandos**. Si dice que no conoce
   `pedir_enlace_de_contrasena`, la API de antes sigue puesta: repite el paso 3.

**Si algo falla:** dime en qué paso y qué sale (una captura vale). No hace falta deshacer nada.

## Probarlo en IKATZ

1. **Tu PIN en Mi acceso.** En Estook › Ajustes › **Mi acceso** › **Mi PIN** salen **todos tus
   locales**. Donde no tengas PIN pone «Todavía no tienes PIN en este local» y el botón **«Ponerme
   un PIN»**; donde sí, **«Uno nuevo»**. Pulsa uno: sale el PIN de 6 cifras **una sola vez**.
2. **He olvidado mi contraseña.** Sal de Estook. En la puerta ya **no hay pestaña «Con PIN»**.
   Pulsa **«¿La has olvidado o no tienes una?»**, escribe tu correo → **Mandarme el enlace**.
   - **Qué debe salir:** «Mira tu correo», y en un minuto un correo **«Tu contraseña nueva de
     Estook»** (mira también en el correo no deseado). Ábrelo en el móvil → **Poner mi contraseña**
     → escríbela dos veces → «Contraseña puesta». Entra con ella. **Si tienes el segundo factor, te
     lo sigue pidiendo.**
   - **Ojo:** al ponerla se cierran las sesiones que tuvieras abiertas (el móvil, el ordenador).
     Hay que volver a entrar en cada uno.
3. **He olvidado mi PIN, en el TPV.** En la caja de IKATZ, en «Teclea tu PIN», pulsa **«¿Has
   olvidado tu PIN?»**, escribe el correo del jefe de cocina (o el tuyo) → **Mandarme el enlace**.
   - **Qué debe salir:** «Si ese correo es de alguien de IKATZ, le llega un enlace». En el correo,
     **«Tu PIN nuevo de IKATZ»** → **Ver mi PIN nuevo** → sale el PIN, una vez. **El de antes ya no
     entra**, y el nuevo sí.
4. **Lo mismo en la tablet de fichar**: abajo, «¿Has olvidado tu PIN?».
5. **Quien no tiene correo** no puede pedir el enlace: su PIN nuevo se lo das tú, en Estook ›
   Equipo › la persona › **Acceso** › PIN nuevo, como hasta ahora.

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que pasa con quien entraba con el PIN

Quien tenía la sesión abierta con el PIN **sigue dentro** hasta que se le caduque (30 días como
mucho). La próxima vez que tenga que entrar, lo hará con su contraseña: si no tiene, se la pone en
«¿La has olvidado o no tienes una?» con su correo. Puedes avisar al equipo.
