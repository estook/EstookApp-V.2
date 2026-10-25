# Pasos de «Cada aparato a lo suyo»

> ## Cómo está
>
> Escrito el 25 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                                    |
> | ---------------- | ---------------------------------------------------------------------------- |
> | Pull requests    | **«Cada aparato a lo suyo» (#140)**, abierta (rama `cada-aparato-a-lo-suyo`) |
> | La base de datos | **89 de 89** en producción; esta **no trae migración**                       |
> | La API           | 112 consultas y 293 comandos; con esta, **112 y 295**                        |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **Se ficha en la caja**, con el botón naranja «Fichar» de arriba, sin entrar en ella; o en Estook con
  el móvil, como siempre. **En un comandero no se entra sin haber fichado**, y el comandero va **directo a
  la sala**: nada de inicio, ni fichar, ni agotados, ni ajustes. Los ajustes, solo en la caja.
- **Estook TPV se instala** como Estook, con su icono y a pantalla completa, y la primera vez que lo abres
  te lo dice. Estook también te lo ofrece ahora en el ordenador.

Lo que se decidió, en la [0115](decisiones/0115-cada-aparato-a-lo-suyo.md). Las maquetas de T4 (la
cocina), en su 2.ª versión, esperan tu visto bueno.

## Lo que te toca · fusionar y desplegar

**No hay migración.** La API nueva trae las dos órdenes de fichar en la caja.

1. **En GitHub**: abre el pull request **«Cada aparato a lo suyo» (#140)** y, con las comprobaciones **en
   verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

3. **En GitHub**, **después de fusionar**: **Actions** → **Desplegar la API** → **Run workflow**, rama
   `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **112 consultas y 295 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

1. **Fichar en la caja.** En la caja, con la pantalla del PIN, toca **Fichar** (el botón naranja de
   arriba a la derecha) → teclea el PIN de alguien → **Fichar la entrada**.
   - **Qué debe salir:** «✓ Nombre · entrada a las 21:30», y la caja sigue en el PIN: no ha entrado nadie.
   - Otra vez **Fichar** con el mismo PIN: ahora ofrece **Empezar la pausa** y **Fichar la salida**.
2. **Un comandero sin fichar.** En el móvil de un camarero que no ha fichado, teclea su PIN.
   - **Qué debe salir:** en rojo, **«Sin fichar»**: «ficha la entrada en la caja o en Estook con el móvil,
     y entra». No hay botón de fichar ahí.
3. **Ya fichado, directo a la sala.** Ficha a ese camarero en la caja (paso 1) y vuelve a teclear su PIN
   en el móvil.
   - **Qué debe salir:** el plano con las mesas, sin inicio. La «E» de arriba lleva a la sala, y no hay
     «Fichar» ni «Ajustes del TPV».
   - **Lo que te pasó**: si en el comandero solo te dejaba fichar y ver los agotados, es porque caía en
     el inicio, y además la persona con la que entraste no tenía «tomar nota». Ahora, si entra alguien
     así, le sale «Tu puesto no toma nota». **Dime con quién entraste** y lo miro.
4. **Instalar Estook TPV.** En el móvil o en el ordenador, abre **estook.com/tpv/**.
   - **Qué debe salir:** arriba, **«Instala Estook TPV»**. En Android y en Chrome o Edge del ordenador,
     **Instalar**; en el iPhone o el iPad, dice los dos toques (Compartir › «Añadir a la pantalla de
     inicio»).
   - **En el iPhone, vincúlalo después de instalarlo**, desde el icono: lo instalado no ve lo que guardó
     Safari.
5. **Instalar Estook en el ordenador.** En Chrome o Edge, entra en Estook: en el Panel sale **«Instala
   Estook en este ordenador»**.
6. **Si tenías una tablet para fichar**, sigue funcionando. Para usarla como comandero: en la caja,
   Ajustes del TPV › Aparatos, quítala, y vincúlala otra vez como comandero.

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que no está todavía, para que no lo busques

- **La pantalla de cocina y la de barra**: T4, con sus maquetas de la 2.ª versión esperando a que me digas.
- **Imprimir los tickets y el cajón**: con T5, que te propongo hacer como **la caja para Windows** (en las
  maquetas de T4).
- **Cobrar**: T7, después de la facturación (T6), que necesita al asesor.
