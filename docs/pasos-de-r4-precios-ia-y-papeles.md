# Pasos de R4 · Precios, IA y papeles

> ## Cómo está
>
> | Qué              | Cómo está                                                              |
> | ---------------- | ---------------------------------------------------------------------- |
> | El pull request  | «R4 · Precios, IA y papeles»                                           |
> | La base de datos | **Hay que migrar**: pasa de 104 a **105** (la 0105)                    |
> | La API           | Hay que desplegarla **después de migrar**: sin órdenes nuevas, 119/336 |
> | Stripe           | **Nada que tocar a mano**: Estook crea solo los precios nuevos         |
>
> Lo decidido, en la [0135](decisiones/0135-r4-precios-ia-y-papeles.md).

---

## Lo que cambia para ti

- **Los precios, sin IVA**: Esencial 39 €, Pro 99 €, Cadena 89 € por local y Pausa 9 €, **más IVA**.
  En Elegir plan y en Ajustes › Suscripción sale «+ IVA», y en la página de pago de Stripe, el IVA en
  su línea.
- **La Pausa**: en Ajustes › Suscripción › Cambiar de plan › **Pausar**. Empieza al momento, la
  cuenta queda en solo lectura, y se vuelve con **«Volver a Pro»** (o al plan que tenía) cuando se
  quiera. A los seis meses vuelve sola, con un correo siete días antes. Una vez al año.
- **Fogón a un tercio**: 100 créditos en Esencial y 500 en Pro, nunca más de 1,65 € por local y mes,
  y «Analiza mi zona» una vez cada diez días (8 créditos).
- **El coste por local**, rehecho con todo eso y Verifacti a 14,99 € + 1,99 €: un local normal deja
  entre el 91 y el 95 %.

## Lo que te toca · fusionar, migrar y desplegar

Si algo falla, no sigas y pásame una foto de lo que dice la pantalla.

1. **En GitHub**: abre el pull request y espera a que las comprobaciones estén **en verde**.
   Después: **Merge pull request** → **Confirm merge**.
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

   **Tiene que decir** que aplica la `0105_los_precios_sin_iva_y_la_pausa` y acabar sin error.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde. **Primero migrar, luego desplegar**: al revés, la API pediría las columnas de la
   Pausa antes de que existan.

## Lo que te toca · probarlo

IKATZ es de la casa y no paga, así que **la Pausa se prueba con una cuenta nueva de prueba** (Stripe
sigue en modo prueba: no se cobra nada de verdad).

1. **En estook.com, crea una cuenta nueva** con otro correo tuyo. **Tiene que salir** «Precios por
   local, más IVA» y «39,00 € + IVA por local al mes» en Esencial.
2. **Elige Pro** y paga con la tarjeta de prueba de Stripe `4242 4242 4242 4242` (cualquier fecha
   futura y cualquier CVC). **En la página de Stripe tiene que salir el IVA en su propia línea**: 99 €
   más 20,79 € de IVA.
3. **Ajustes › Suscripción**: «99,00 € + IVA al mes». Si la cuenta está **en prueba**, la Pausa dice
   que en la prueba no hace falta: es lo esperado.
4. Con la cuenta ya cobrada, **Cambiar de plan › Pausa › Pausar › Sí, pausar**. **Tiene que salir**
   «En Pausa desde el…», cuándo vuelve sola y **«Volver a Pro»**.
5. Toca **«Volver a Pro»**. Vuelve a «Pro · mensual». Y si intentas pausar otra vez, la fila de la
   Pausa dice **«La Pausa se puede una vez al año»** con la fecha.
6. **En IKATZ**, Carta › Análisis › Tu zona: debajo del botón tiene que decir **«8 créditos de Fogón ·
   una vez cada diez días»**.

**Si algo no cuadra:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.
