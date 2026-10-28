# Pasos de «La pausa del TPV»

> ## Cómo está
>
> **Fusionada** (28-oct, en verde). Te queda migrar la 0095 y desplegar la API (pasos 2 y 3). La
> barra de arriba de la app va aparte, en **«Las respuestas de la caja»**.
>
> | Qué              | Cómo está                                               |
> | ---------------- | ------------------------------------------------------- |
> | Pull request     | **«La pausa del TPV» (#153)**, rama `la-pausa-del-tpv`  |
> | La base de datos | Trae **la 0095**: hay que migrar (quedarán **95**)      |
> | La API           | Cambia: **115 consultas y 313 comandos** al desplegarla |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti

- **En el iPhone, la barra de arriba de Estook TPV ya no se mete debajo del reloj.**
- **El pase lo eliges tú en cada mesa**: ningún plato va atado al 1.º o al 2.º, y «¿En qué pase
  sale?» ya no está en Ajustes › Productos.
- **Para llevar**: sale todo junto (no pregunta), y **se programa** a una hora.
- **«Nº de comensales»** en vez de «¿Cuántos sois?».
- **En la caja, «Fichar» pide el PIN** a quien ficha y le saluda por su nombre.
- **Volver a vincular** un móvil o una caja sin que salga «Caja 2».

Lo decidido, en la [0121](decisiones/0121-la-pausa-del-tpv.md).

## Lo que te toca · fusionar, migrar y desplegar

**En este orden.** La API nueva necesita la 0095.

1. **En GitHub**: fusiona **«La pausa del TPV» (#153)** con las comprobaciones **en verde**: **Merge pull
   request** → **Confirm merge**.
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

   Tiene que decir que aplica **la 0095** y que hay **95 en total**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Cuando acabe
   en verde, ya está.

**Si algo falla**: no sigas con el paso siguiente y pásame lo que dice la pantalla.

## Lo que te toca · probarlo en IKATZ

Con el iPhone, en el comandero (Estook TPV instalado), y en el ordenador de la caja.

1. **La barra de arriba**: abre Estook TPV en el iPhone. **Tiene que salir** la «E», IKATZ y
   «Bloquear» debajo del reloj, sin taparse ni verse borroso.
2. **Los pases**: abre una mesa, toca **Entrantes** y una croqueta. **Tiene que** marcarse el **1.º**
   sola. Ahora toca la pestaña **2.º** y unas croquetas: van al 2.º. Cambiar de página **no** cambia
   la pestaña.
3. **Ajustes › Productos**: en cada página solo queda **«¿Quién lo prepara?»**.
4. **Para llevar**: en la sala, **Barra y llevar** → **Para llevar**. **No** pregunta cómo sale la
   cocina. Toca **Programar** y una hora (o «Otra hora»). En la sala **tiene que** salir «Para las
   21:30»; en la pantalla de cocina, **en gris al final** con «se empieza a las 21:10», hasta veinte
   minutos antes. Con impresora, el papel sale con **PARA LAS 21:30**.
5. **Comensales**: al abrir una mesa sale **«Nº de comensales»**, y en la casilla de la mesa, un
   muñeco con el número.
6. **Fichar en la caja**: con tu sesión abierta en la caja, toca **Fichar** arriba. **Tiene que**
   pedir un PIN. Pon el de otra persona: «Hola, …» y sus botones; ficha y sale «✓ … · entrada a las
   …». Pon **el tuyo**: salen tus cosas con «Fichar la salida y cerrar sesión».
7. **Volver a vincular**:
   - En la caja, **Ajustes › Aparatos › el comandero de tu móvil** → **Volver a vincular** → **Sacar
     el código**. En el móvil, borra Estook TPV, vuelve a abrir `estook.com/tpv`, «Tengo un código» y
     escríbelo. **Tiene que** volver como el mismo comandero, sin otro nuevo en la lista.
   - En el ordenador, entra en Estook TPV con tu correo (Vincular › «Es el primero: entro con mi
     correo»). **Tiene que** preguntar **«¿Es uno que ya tenías?»**: elige **Caja 1** y «Sí, es Caja
     1». En Aparatos **no** tiene que salir una «Caja 2».

**Si algo no sale así**, haz una captura y pásamela con el número del paso.

## Lo que no está y por qué

- **La caja (abrir, el cajón con «Cambiar · Sacar · Meter», cerrar contando) y que cada venta
  cuente una sola vez** son de **T7**, el cobro: está escrito para que se haga así ([la 0121](decisiones/0121-la-pausa-del-tpv.md),
  punto 4) y faltan **tus respuestas** del punto 5.
- **La barra de arriba de Estook (la app)**, con su velo en el iPhone: va en «Las respuestas de
  la caja», con lo que contestaste de la caja.
