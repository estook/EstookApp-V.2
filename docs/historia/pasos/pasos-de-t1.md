# Pasos de T1 · La puerta de Estook TPV

> ## Cómo está
>
> Leído el 24 de octubre de 2026, en producción y en solo lectura.
>
> | Qué              | Cómo está                                           |
> | ---------------- | --------------------------------------------------- |
> | Pull requests    | **#133 fusionada** (T1 · La puerta de Estook TPV)   |
> | La base de datos | **83 de 83** migraciones (la 0083, migrada)         |
> | La API           | Desplegada con T1: **109 consultas y 261 comandos** |
>
> **T1 está en producción**, y Richi vinculó y entró en IKATZ el 24-oct. Lo que vio al probarla
> (el PIN de quien crea el restaurante, y lo olvidado) está en
> [`pasos-del-pin-y-la-contrasena.md`](../../pasos-del-pin-y-la-contrasena.md).

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de
antes, en [`pasos-de-m20a.md`](pasos-de-m20a.md).

---

## Lo que te toca ahora · fusionar, migrar y desplegar

Lo hecho y por qué, en la [0108](../../decisiones/0108-t1-la-puerta.md) (mira sobre todo la sección 4,
«Lo que decidí al construirlo»). **Con migración (0083) y con la API.** Hazlo **en este orden y
seguido**: entre fusionar y desplegar, `estook.com/tpv/` ya es el nuevo y la API todavía no sabe
vincular aparatos, así que dirá que no llega a Estook hasta que despliegues.

1. **En GitHub**: abre el pull request **#133 «T1 · La puerta de Estook TPV»** y, con las **tres
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

   Tiene que decir que aplica **la 0083** y que hay **83 en total**. Si dice otra cosa, para y
   dímelo con lo que sale.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**, para comprobarlo:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **109 consultas y 261 comandos**.

**Si algo falla:** dime en qué paso y qué sale (una captura vale). No hace falta deshacer nada.

## Probarlo en IKATZ

Hace falta: **un ordenador o una tablet** para la caja, **tu móvil** o el de un camarero, y
**otra tablet** (o un segundo navegador). **Tu PIN de IKATZ** está en Estook › Ajustes › **Mi
acceso** › Mi PIN: si no lo recuerdas, **«Uno nuevo»** te da otro de **6 cifras** (sale una vez).

1. **La caja, con tu correo.** En el ordenador o la tablet abre **`estook.com/tpv/`**. Sale
   **«Vincula este aparato a tu local»**. Toca **«Entrar con mi correo»**, escribe tu correo y tu
   contraseña (y el código de tu aplicación si te lo pide). Si llevas más de un local, elige
   **IKATZ**. En **«¿Qué es este aparato?»** deja **Caja** y **«Cajón 1 · nuevo»** marcados, y el
   nombre **«Caja 1»** → **Listo**.
   - **Qué debe salir:** **«Teclea tu PIN»**, con el nombre «Caja 1 · IKATZ» arriba. **La sesión
     con la que entraste para vincularla ya se ha cerrado**: lo que se queda es la llave de la caja.
2. **Entrar con el PIN.** Teclea tu PIN. Si no has fichado, sale **«No has fichado la entrada»**:
   **«Fichar la entrada y entrar»** o **«Entrar sin fichar»**.
   - **Qué debe salir:** el inicio, oscuro, con **Mesas**, **Fichar**, **Agotados** y **Ajustes
     del TPV**, y tu nombre y **Bloquear** arriba. **No sale** Venta rápida, Caja ni Ventas de hoy:
     llegan con T7.
3. **El móvil de un camarero, como su comandero personal.** En la caja: **Ajustes del TPV** →
   **Aparatos** → **Añadir aparato** → **Comandero** → **«El móvil de una persona»** → elige al
   camarero → **Sacar el código**. Sale un código de 6 cifras y su QR, con **«Caduca en 10:00 ·
   sirve una vez»**. En el móvil, abre **`estook.com/tpv/`** en Safari y escribe las seis cifras (o
   lee el QR con la cámara).
   - **Qué debe salir en el móvil:** **«Hola, (su nombre)» · «Este móvil es tuyo: solo entra tu
     PIN»**. **Prueba tu PIN en él**: tiene que decir **«Este móvil es de otra persona: solo entra
     su PIN»**. Con el PIN del camarero, entra.
4. **Una tablet como comandero para todos.** Igual que el 3, pero **Comandero** → **«Para
   todos»**, y de nombre, por ejemplo, **«Tablet terraza»**. En la tablet, el código.
   - **Qué debe salir:** «Teclea tu PIN» con «Tablet terraza · IKATZ», y entra cualquiera de IKATZ
     con su PIN.
5. **El bloqueo.** Deja la caja **2 minutos sin tocar**: vuelve sola a **«Teclea tu PIN»**. Y
   **«Bloquear»**, arriba a la derecha, lo hace al momento. El móvil personal se bloquea a los **10
   minutos**. Los minutos se cambian en **Ajustes del TPV › PIN y bloqueo**.
6. **Cambiar lo que es un aparato.** En la caja: **Ajustes del TPV › Aparatos** → **Tablet
   terraza** → toca **Caja** → **«Compartir Cajón 1»** → **Guardar**.
   - **Qué debe salir:** «Guardado», y la tablet pasa a llamarse **«Caja 2»** con el Cajón 1. En la
     tablet hay que volver a teclear el PIN.
7. **Desvincular.** En la caja: **Ajustes del TPV › Aparatos** → **Caja 2** → **Desvincular** →
   **«Sí, desvincular»**.
   - **Qué debe salir:** en la tablet, al tocarla o recargarla, **«Este aparato ya no está
     vinculado»** y el botón para vincularla otra vez.
8. **Que Estook ya no abre el TPV.** En Estook, **Servicio › En marcha** ya no tiene «Abrir la
   sala», y **Ajustes** ya no tiene «El aparato para fichar». **La tablet de fichar que ya tenías
   sigue funcionando** como siempre.

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura). No hace falta deshacer nada.

## Lo que no está todavía, para que no lo busques

- **La pantalla de cocina y la de barra** no se ofrecen al vincular: llegan con T4.
- **El plano se dibuja todavía en Estook › Ajustes › Tu sala**: pasa al TPV en T2.
- **Abrir y cerrar caja, cobrar, venta rápida y ventas de hoy**: T7. En T1 el cajón es solo un
  nombre.
- **Imprimir**: T5, con Estook Link.

## Lo siguiente · T2 · La sala

El editor del plano en el TPV, a ojo y sin un número; el plano con las iniciales de cada camarero,
Todas · Mías; pedir con los pases en pestañas; y el comandero en el móvil.
