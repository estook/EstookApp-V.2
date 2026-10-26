# Pasos de T4 · 2 · La barra y la alergia de la mesa

> ## Cómo está
>
> Escrito el 26 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                                     |
> | ---------------- | ----------------------------------------------------------------------------- |
> | Pull requests    | **«El reloj en producción» (#143)**, solo documentos, y **«T4 · 2» (#144)**   |
> | La base de datos | **91 de 91** en producción; esta trae **la 0092**                             |
> | La API           | Hoy, 113 consultas y 302 comandos; con esta, **113 consultas y 303 comandos** |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **La barra ya tiene su pantalla**: la misma que la de cocina, con las bebidas, los cafés y las copas,
  sin PIN y siempre encendida. Lo que tacha la barra (y la cocina) sale en la cuenta de la sala con su
  hora: «✓ 21:33».
- **La alergia de la mesa**: en las opciones de la mesa, **«⚠ Alergias»**. Al pedir algo que la lleva,
  la sala avisa antes; y en cocina y en la barra sale en rojo, «LLEVA GLUTEN». Nadie confirma nada.

Lo que se decidió, en la [0117](decisiones/0117-t4-2-la-barra-y-la-alergia.md).

## Lo que te toca · fusionar, migrar y desplegar

**En este orden: fusionar las dos, después migrar, y al final desplegar.** La API nueva necesita la 0092.

1. **En GitHub**: abre **«El reloj en producción» (#143)** y, con las comprobaciones en verde, **Merge
   pull request** → **Confirm merge**. Es solo ESTADO y los pasos del reloj.
2. **En GitHub**: abre **«T4 · 2 · La barra y la alergia de la mesa» (#144)**. Con las comprobaciones
   **en verde**, **Merge pull request** → **Confirm merge**.
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

   Tiene que decir que aplica **la 0092** y que hay **92 en total**.

4. **En GitHub**, **después de fusionar y de migrar**: **Actions** → **Desplegar la API** → **Run
   workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
5. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **113 consultas y 303 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

1. **Vincular la pantalla de barra.** En la caja, Ajustes del TPV › Aparatos › **Añadir aparato** →
   **Pantalla de barra** → **Sacar el código**. En la tablet de la barra, abre **estook.com/tpv/** y
   escribe el código.
   - **Qué debe salir:** «Nada que servir», sin pedir PIN.
2. **Marcar la alergia.** En un comandero, abre una mesa, toca **Opciones** › **⚠ Alergias**, toca
   **Gluten** y **Guardar**.
   - **Qué debe salir:** en las opciones, «⚠ Alergias · Gluten» en rojo; en la botonera, los platos que
     llevan gluten con el borde rojo.
3. **Pedir lo que la lleva.** Toca un plato con gluten.
   - **Qué debe salir:** «⚠ … lleva gluten», con «No pedirlo» y «Pedirlo, la cocina lo verá». Elige
     **Pedirlo**. Pide también una caña y **Mandar**.
4. **Mirar la cocina y la barra.**
   - **Qué debe salir:** en la barra, la caña con la franja roja «⚠ ALERGIA · GLUTEN»; en cocina, el
     plato con «LLEVA GLUTEN». Ninguna pide confirmar nada.
5. **Tachar en la barra.** Toca la caña.
   - **Qué debe salir:** la mesa pasa a **Acabados**, y en la cuenta de la mesa, junto a la caña,
     **«✓» y la hora**. Si pides un café después, sale en la barra en una tarjeta nueva.

**Para que lo sepas:** si un plato no tiene puestos sus alérgenos en Estook (Carta o Escandallos), la
sala no puede avisar de él. Lo pedido antes de hoy no lleva sus alérgenos.

## Lo que no está todavía, para que no lo busques

- **El papel** (la comanda impresa en la barra o en la cocina): con la caja para Windows y Estook Link
  (T5).
- **La entrada nueva del TPV** (la sala primero y el engranaje): sus maquetas esperan a que me digas si
  valen.
