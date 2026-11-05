# Pasos de «Quién lleva la facturación» y del NIF de pruebas

> ## Cómo está
>
> | Qué              | Cómo está                                                               |
> | ---------------- | ----------------------------------------------------------------------- |
> | El pull request  | La #161, **en producción**; y «T6 · 1: el NIF de la empresa de pruebas» |
> | La base de datos | **Migración 0101**: falta migrarla. Tiene que quedar **101 de 101**     |
> | La API           | Falta desplegarla. Sigue con **119 consultas y 332 comandos**           |
> | La caja          | **No hay caja nueva**: nada que publicar                                |
>
> **Todo sigue en pruebas**: nada llega a Hacienda de verdad.

---

## Lo que cambia para ti

- **La facturación es tuya, de la dirección.** De fábrica, solo tú ves Ajustes › Facturación, en
  Estook y en Estook TPV. El gerente y el administrador de cuenta dejan de verla.
- **Se la das a quien quieras** en una tarjeta nueva de Ajustes › Facturación: **«Quién la lleva»**.
  Sale quien manda en tu local (gerente, area manager, administrador de cuenta o gestoría), cada uno
  con un interruptor. Quien la tenga la verá y la podrá cambiar. **Firmar ante Hacienda sigue siendo
  solo del titular.**
- **La empresa de pruebas ya no pide firma.** Es de Verifacti (BILBABIT SL), no tuya: el paso 5 sale
  hecho («La empresa de pruebas: no se firma») y **el alta de IKATZ queda lista**. Lo que firmaste
  el 5-nov se borra de la empresa (queda en el registro de cambios).
- **En el paso 5 de una sociedad**, un aviso dice **qué certificado vale**.

Lo decidido, en la [0128](decisiones/0128-quien-lleva-la-facturacion.md).

## Por qué seguía saliendo después de la #161

**BILBABIT SL estaba dada de alta en el paso 1 con su NIF escrito a mano**, como si fuera tu
empresa, y no desde el admin. Para Estook era una empresa normal, y por eso te seguía pidiendo
firmar. Ahora el paso 1 ya no acepta ese NIF, y la migración 0101 convierte la de IKATZ en la
empresa de pruebas: **no tienes que firmar nada**. No vuelvas a firmar ese modelo: es la
autorización de una sociedad que no es tuya.

## Por qué salió «Certificado incorrecto»

En AutoFirma elegiste el único certificado que te ofrecía Windows. Su titular y su emisor eran el
mismo código (`58ed0be5-…`): es uno que crea Windows o algún programa para sí mismo, **no un
certificado reconocido**, y Hacienda no lo acepta. **No hiciste nada mal**: era nuestro el fallo de
pedirte que firmaras por la empresa de pruebas, que no es tuya. Cuando des de alta tu empresa de
verdad:

- **Como autónomo**: «Firmar en línea», con tu DNI y un vídeo corto. Sin certificado.
- **Como sociedad**: el modelo firmado con **el certificado de representante de la sociedad** (lo da
  la FNMT) o con el DNI electrónico de quien la administra.

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

   **Tiene que** decir que aplicó la **0101** y que hay **101 de 101**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde.

## Lo que te toca · probarlo

### 1 · La empresa de pruebas, lista

1. En **Estook**, entra en IKATZ → **Ajustes** → **Facturación**.
   - **Tiene que** salir el aviso azul «La empresa de pruebas de Verifacti».
   - **Tiene que** salir el paso 2 con «La empresa de pruebas: no se pregunta» y el paso 5 con
     **✓** y «La empresa de pruebas: no se firma».
   - **Tiene que** salir arriba, en verde, **«Lista»**.
2. Si abres el paso 1 y escribes **B75777847**:
   - **Tiene que** decir que ese NIF es el de la empresa de pruebas de Verifacti, que no es tuya.

### 2 · Quién la lleva

1. Debajo de Facturación, la tarjeta **«Quién la lleva»**.
   - **Tiene que** salir tu nombre, «Dirección», con **«Siempre»**.
   - Si en IKATZ hay alguien con puesto de gerente, sale con su interruptor **apagado**.
2. Si tienes a alguien de gerente, **enciéndeselo**, y pídele que entre (o entra tú con su cuenta en
   otra ventana).
   - **Tiene que** ver Ajustes › Facturación, **sin** la tarjeta «Quién la lleva».
3. **Apágaselo** otra vez.
   - **Tiene que** desaparecerle Facturación de Ajustes, en Estook y en Estook TPV.

### 3 · En Estook TPV

1. En la caja, **Ajustes del TPV** → **Facturación**.
   - **Tiene que** decir que el alta está terminada.
