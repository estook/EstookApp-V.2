# Pasos de «T6 · 1 · El alta de facturación»

> ## Cómo está
>
> | Qué              | Cómo está                                                                         |
> | ---------------- | --------------------------------------------------------------------------------- |
> | El pull request  | **#160** «T6 · 1 · El alta de facturación, y cómo factura cada empresa», en verde |
> | La base de datos | **Migración 0099**: falta migrarla. Tiene que quedar **99 de 99**                 |
> | La API           | Falta desplegarla. Tiene que quedar con **119 consultas y 331 comandos**          |
> | La caja          | **No hay caja nueva**: nada que publicar                                          |
> | Verifacti        | Tu clave de la cuenta, puesta en Supabase el 4-nov (`VERIFACTI_CLAVE_DE_CUENTA`)  |
>
> **Todo es en pruebas**: nada llega a Hacienda de verdad hasta las once condiciones del Anexo.

---

## Lo que cambia para ti

- **En Estook, Ajustes › Facturación**, nueva: cómo está la facturación del local y **el alta en
  cinco pasos** (la empresa, dónde tributa, las series, el alta en Verifacti y la autorización ante
  Hacienda). Se puede dejar a medias y seguir otro día.
- **El NIF se mira en Hacienda al escribirlo**, y se guarda con el nombre que tiene Hacienda.
- **Cómo factura cada empresa** ([0127](decisiones/0127-con-verifactu-sin-envio-o-fuera.md)): **con
  VERI\*FACTU** (la recomendada), **sin envío** (se ve explicada, y llega con T6 · 3) o **fuera, por el
  SII** (sale sola si la empresa lleva el SII, y ya no se para el alta). En el paso 2 y en **Ajustes
  del TPV › Facturación**, cada una con su «i».
- **La declaración responsable de Estook**, en Ajustes › Facturación y en los Ajustes de Estook TPV.
  Sale como **borrador** hasta que la escriba un asesor y se firme.
- **En el admin, Facturación**: probar la conexión con Verifacti, las once condiciones, quién produce
  Estook, la empresa de pruebas y «Pasar a real», que no se deja tocar hasta tener las once.

Lo decidido, en la [0126](decisiones/0126-t6-1-el-alta-de-facturacion.md).

## Lo que te toca · fusionar, migrar y desplegar

Si algo falla, no sigas y pásame una foto de lo que dice la pantalla.

1. **En GitHub**: abre el pull request **#160** y espera a que las
   comprobaciones estén **en verde**. Después: **Merge pull request** → **Confirm merge**.
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

   **Tiene que** decir que aplicó la **0099** y que hay **99 de 99**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde.

## Lo que te toca · probarlo

### 1 · En el admin, que Verifacti contesta

1. Entra en **estook.com/admin** → **Facturación** → **Probar la conexión**.
   - **Tiene que salir**, en verde: «Funciona», cuántos NIF tiene tu cuenta y la versión de
     Verifacti.
   - **Si dice que la clave es la de un NIF** (empieza por `vf_test_`): en Verifacti, **Ajustes de la
     cuenta → API key** (la que empieza por `vfn_`). Ponla en Supabase como
     `VERIFACTI_CLAVE_DE_CUENTA`, sin espacios, y vuelve a desplegar la API (el paso 3 de arriba).
   - **Si dice otra cosa**, hazle una foto y pásamela.

### 2 · En el admin, la empresa de pruebas en IKATZ

1. En la misma pantalla, **La empresa de pruebas de Verifacti** → **En qué local**: elige el de
   **IKATZ** → **Ponerla en ese local**.
   - **Tiene que** desaparecer el botón sin ningún error.
   - **Si sale «Verifacti no tiene la empresa de pruebas en esta cuenta»**, pásamelo: la buscamos de
     otra forma.

### 3 · En Estook, el alta de IKATZ

1. Entra en Estook con tu cuenta, en **IKATZ** → **Ajustes** → **Facturación**.
   - **Tiene que salir** arriba «En pruebas» y el aviso «La empresa de pruebas de Verifacti».
   - Los pasos 1, 2, 4 y 5, ya con su ✓. Falta el **3 · Las series**.
2. **Las series** → **Seguir**. **Tienen que salir** propuestas como `T-IKA`, `F-IKA` y `R-IKA`, con
   el primer número debajo (`T-IKA-2026-000001`). Contesta **No** a «¿Este local ya hace facturas
   con otro programa?» → **Guardar las series**.
   - **Tiene que salir** «Lista».
3. **Declaración responsable** → **Leerla**. **Tiene que** decir «Borrador» arriba, la versión de
   Verifacti y «Sin rellenar» en quién produce Estook (todavía no tienes sociedad). Abajo,
   **Descargarla en PDF**.

### 4 · En Estook TPV, cómo factura

1. En la caja, entra con tu PIN → **⚙ Ajustes** → **Facturación**.
   - **Tiene que** decir el nombre de la empresa de pruebas, «En pruebas» y, debajo, **Cómo factura**:
     «Con VERI\*FACTU» marcada y «Recomendada», y «Sin envío» sin poder elegirse, con «Todavía no…».
   - Toca **Qué es** en cada una: **tiene que** abrir su explicación.

### 5 · En Estook TPV, la declaración

1. En la caja (Windows o el navegador), entra con tu PIN → **⚙ Ajustes** → **Declaración
   responsable**.
   - **Tiene que** ser la misma que en Estook.

## Lo que no se prueba en IKATZ, y por qué

- **El alta con un NIF de verdad y la firma** no se pueden probar en IKATZ: usa la empresa de
  pruebas, que ya viene firmada. Lo prueban las pruebas automáticas (el NIF en Hacienda, las
  paradas del País Vasco, Navarra, el SII y Ceuta, la firma en línea de una persona y el modelo de
  una sociedad). **Se probará con tu NIF cuando tengas la sociedad**, antes del primer cliente.
- **No me pases tu DNI ni ningún dato tuyo por el chat**: cuando tengas la sociedad, tú mismo harás
  el alta en Ajustes › Facturación, y los datos del productor se escriben en el admin.

## Lo que aún no está

- **Emitir tickets y facturas, el papel con su QR y la lista de tickets y facturas**: T6 · 2.
- **«Imprimir un ticket de prueba»**, que salía en la maqueta: va con T6 · 2, porque necesita emitir.
