# Pasos de T4 · 1 · La cocina

> ## Cómo está
>
> Escrito el 26 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                                            |
> | ---------------- | ------------------------------------------------------------------------------------ |
> | Pull requests    | **«Cada aparato a lo suyo» (#140)** y **«T4 · 1 · La cocina» (#141)**, que va encima |
> | La base de datos | **89 de 89** en producción; la #141 trae **la 0090**                                 |
> | La API           | 112 consultas y 293 comandos; con las dos, **113 y 302**                             |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **La cocina ya tiene su pantalla**: una tablet o una tele que se vincula una vez, **sin PIN** y siempre
  encendida. Llega cada mesa entera, suena, se tacha de un toque y lo acabado pasa a su pestaña. Y desde
  cada tarjeta se puede **llamar al camarero**.
- **En la sala**, «La cocina te llama · Mesa 6» con **«Ya voy»**, y en cada mesa **«Tienen prisa»**. Los
  minutos del color y el sonido, en la caja.

Lo que se decidió, en la [0116](decisiones/0116-t4-1-la-cocina.md). Lo siguiente, T4 · 2: la barra y la
alergia de la mesa.

## Lo que te toca · fusionar, migrar y desplegar

**En este orden: fusionar las dos, después migrar, y al final desplegar.** La API nueva necesita la 0090.

1. **En GitHub**: abre **«Cada aparato a lo suyo» (#140)** y, con las comprobaciones en verde, **Merge
   pull request** → **Confirm merge**.
2. **En GitHub**: abre **«T4 · 1 · La cocina» (#141)**. Al fusionar la #140 se queda solo con lo suyo.
   Con las comprobaciones **en verde**, **Merge pull request** → **Confirm merge**.
3. **En PowerShell**, en la carpeta del proyecto, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

   ```powershell
   .\estook.cmd bd:migrar
   ```

   Tiene que decir que aplica **la 0090** y que hay **90 en total**.

4. **En GitHub**, **después de fusionar y de migrar**: **Actions** → **Desplegar la API** → **Run
   workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
5. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **113 consultas y 302 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

1. **Vincular la pantalla de cocina.** En la caja, Ajustes del TPV › Aparatos › **Añadir aparato** →
   **Pantalla de cocina** → **Sacar el código**. En la tablet de la cocina, abre **estook.com/tpv/**,
   instálala (la franja de arriba) y escribe el código.
   - **Qué debe salir:** «Nada que sacar», sin pedir PIN. Si arriba sale «Toca la pantalla para que
     suene», tócala una vez.
2. **Pedir.** En un comandero, pide una mesa con algo de primero y algo de segundo, y **Mandar**.
   - **Qué debe salir:** en cocina, la mesa entera y **suena**; el 1.º en marcha y el 2.º en espera,
     apagado. **Ni un precio.**
3. **Tachar.** En la cocina, toca el plato del 1.º: queda tachado con su hora. Tócalo otra vez: vuelve.
   Tacha lo que queda del 1.º.
   - **Qué debe salir:** la tarjeta dice «esperando a que marchen», y en el comandero sale «ha salido todo
     el 1.º» con **Marchar el 2.º**.
4. **Marchar.** En el comandero, **Marchar el 2.º**.
   - **Qué debe salir:** en cocina, **«¡MARCHA EL 2.º!»** en verde y otro sonido.
5. **Llamar.** En la tarjeta, **Llamar a …**.
   - **Qué debe salir:** en el comandero, arriba, **«La cocina te llama · Mesa …»** con **Ya voy** (y le
     vibra el móvil al camarero de esa mesa). Al tocar Ya voy, se quita.
6. **Tienen prisa.** En el comandero, toca la mesa → **Tienen prisa**.
   - **Qué debe salir:** en cocina, la tarjeta sube arriba con **«TIENEN PRISA»** y suena fuerte.
7. **Acabados.** Tacha lo último.
   - **Qué debe salir:** la mesa se va de «En marcha» y aparece en **Acabados**, en verde. Toca un plato
     ahí: vuelve a «En marcha».
8. **Los minutos y el sonido.** En la caja, Ajustes del TPV › **Cocina y barra**: cambia los minutos del
   ámbar y del rojo, o apaga el sonido, y **Probar el sonido**.

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que no está todavía, para que no lo busques

- **La pantalla de barra, la alergia de la mesa y la hora en el ✓ de la cuenta**: T4 · 2, lo siguiente.
- **La comanda en papel**: con la caja para Windows (T5), si me dices que sí.
- **Cobrar**: T7, después de la facturación (T6), que necesita al asesor.
