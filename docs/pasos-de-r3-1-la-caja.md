# Pasos de R3 · 1 · La caja

> ## Cómo está
>
> | Qué              | Cómo está                                                                                  |
> | ---------------- | ------------------------------------------------------------------------------------------ |
> | El pull request  | «R3 · 1 · La caja», **abierto**, para fusionar cuando esté en verde                        |
> | La base de datos | **Hay que migrar**: pasa de 115 a **116** (las cajas, los cobros, los pagos y el cajón)    |
> | La API           | **Hay que desplegarla, después de migrar**: pasa a **132 consultas y 366 comandos**        |
> | La caja          | **No hay caja para Windows nueva**: la caja abre Estook TPV de la web, que se publica sola |
>
> Lo decidido, en la [0144](decisiones/0144-r3-la-caja.md), con [su maqueta](maquetas/r3-la-caja.html). Con esto,
> R3 · 1 queda hecha; falta R3 · 2 (los avisos, las propinas, escribir el total, entregar la caja y los descuentos).

---

## Lo que cambia para ti

- **En la pantalla del PIN de la caja, al lado de «Fichar»**: **«Abrir caja»** en verde, o **«Cerrar caja»** en
  ámbar si está abierta. Lo tocas, tecleas tu PIN y entras directo a hacerlo.
- **Arriba en la sala, el botón «Caja»** (verde con la caja abierta): dentro, **Abrir el cajón**, **Cómo va** y
  **Cerrar caja**. Con la caja sin abrir, dice «Abrir caja».
- **En la mesa, «Cobrar» ya funciona**, en la caja: efectivo (con los billetes de un toque y el cambio), tarjeta, y
  **Dividir** (a partes iguales, por platos, o efectivo y tarjeta). El ticket sale solo por la impresora en cuanto lo
  tiene Hacienda, con el QR de «Pide tu factura». En el comandero, «Cobrar» dice que se cobra en la caja.
- **Ajustes del TPV › La caja**: quién la abre (**Encargados** o **También camareros**), el **recuento obligatorio
  al abrir**, **contar a ciegas**, el **fondo de siempre**, y encender **Bizum** y el **cheque restaurante**.
- **En Estook, Servicio › Jornada › Cierres de caja** (antes «Cierre»): hoy en vivo, un día por fila con su total y
  si cuadra, y al tocarlo, el día entero y cada caja con lo suyo. **Solo para ver**: el día lo cierra la caja.

**Importante, por ley**: mientras IKATZ facture en pruebas, cada ticket sale con «PRUEBA · SIN VALIDEZ». Eso **no es
el ticket que hay que dar a un cliente de verdad**. Prueba la caja con cobros de prueba (tú mismo, o el equipo), y
a los clientes, de momento, el ticket de vuestro TPV de siempre.

## Lo que te toca · fusionar, migrar y desplegar

**Si lo único en rojo son fotos de pantallas**, GitHub las sube solo y vuelve a probar: en unos minutos sale en
verde sin que nadie haga nada. Si sale en rojo otra cosa, pásame una foto.

1. **En GitHub**: cuando el pull request esté **en verde**, **Merge pull request** → **Confirm merge**.
2. **En tu ordenador**, en PowerShell, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

   ```powershell
   .\estook.cmd bd:migrar
   ```

   Tiene que acabar diciendo que la base está en la **116**.

3. **En GitHub**, después de migrar: pestaña **Actions** → **Desplegar la API** → **Run workflow** → escribe
   `desplegar` → **Run workflow**, y espera a que salga en verde.

## Qué mirar, en IKATZ, en la caja

1. **Abrir caja, el primer día.** Bloquea la caja. En la pantalla del PIN, toca **Abrir caja** y teclea tu PIN.
   Como es la primera vez, te pide **contar**: pon por ejemplo cuatro billetes de 20 y tres de 10 → **Abrir caja
   con 110,00 €**. Tiene que salir «Caja abierta con 110,00 €» y abrirse el cajón (si la Epson tiene el cajón
   enchufado y marcado en Ajustes del TPV › Impresoras y cajón).
2. **Cobrar en efectivo.** Abre una mesa, pide algo, **Cobrar** → **Efectivo** → toca un billete (por ejemplo 50 €).
   Sale **el cambio en grande** → **Cobrar**. Tiene que salir ✓, el número del ticket, y el ticket por la impresora
   con «PRUEBA», el QR de Hacienda y, debajo, el de «Pide tu factura». La mesa queda libre al tocar **Listo**.
3. **Dividir.** Otra mesa con tres cosas → **Cobrar** → **Dividir** → **A partes iguales** → **3** → cobra cada parte
   con **Efectivo** o **Tarjeta**. La tercera se lleva lo que quede y la mesa queda libre.
4. **Abrir el cajón.** Arriba, **Caja** → **Abrir el cajón** → **Sacar dinero** → 5 → **Un proveedor** → **Sacar
   5,00 €**. Con el PIN de un camarero, te pedirá el de un encargado.
5. **Cómo va.** Arriba, **Caja** → **Cómo va**: el fondo, lo cobrado en efectivo, lo sacado y **lo que debería haber**.
6. **Cerrar caja.** Arriba, **Caja** → **Cerrar caja**: cuenta los billetes (no ves lo que debería haber) →
   **Seguir** → el total del datáfono, o **Hoy no se ha usado** → lo que se queda para mañana → **Cerrar caja y ver
   el resultado**. Sale la diferencia; si no cuadra, elige el motivo. **Imprimir el Z** y **Listo**.
7. **En Estook**, en el móvil: **Servicio › Jornada › Cierres de caja**. Tiene que salir el día de hoy con su total, y
   al tocarlo, la caja con lo que abriste, cobraste, sacaste, contaste y la diferencia.
8. **Ajustes del TPV › La caja**: enciende **Bizum**, vuelve a una mesa y mira que en **Cobrar** sale Bizum.

**Si algo falla**, dime en qué paso y qué sale en pantalla (una foto vale).
