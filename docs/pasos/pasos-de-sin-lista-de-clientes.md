# Pasos de «Sin lista de clientes»

> ## Cómo está
>
> | Qué              | Cómo está                                                               |
> | ---------------- | ----------------------------------------------------------------------- |
> | El pull request  | «Sin lista de clientes»                                                 |
> | La base de datos | **Hay que migrar**: pasa de 108 a **109** (la 0109)                     |
> | La API           | Hay que desplegarla **después de migrar**: 124 consultas y 344 comandos |
> | La caja          | **No hay caja nueva**                                                   |
>
> Lo decidido, en la [0139](../decisiones/0139-sin-lista-de-clientes.md). **Todo en pruebas**: nada llega
> a Hacienda de verdad.

---

## Lo que cambia para ti

- **Al hacer una factura, el cliente se escribe directo.** Ya no hay «Busca un cliente», ni lista, ni
  «Quitar». No se guarda nada aparte.
- **Si ese NIF ya tiene una factura tuya**, al escribirlo entero se rellena lo demás.

## Lo que te toca · fusionar, migrar y desplegar

Si algo falla, no sigas y pásame una foto de lo que dice la pantalla.

1. **En GitHub**: abre el pull request y espera a que las comprobaciones estén **en verde**. Después:
   **Merge pull request** → **Confirm merge**.
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

   **Tiene que decir** que aplica la `0109_sin_lista_de_clientes` y acabar sin error.

3. **En GitHub**: pestaña **Actions** → **Desplegar la API** → **Run workflow** → **Run workflow**, y
   espera a que salga en verde.
4. **Recarga** la pestaña de Estook y la del TPV.

## Lo que hay que mirar en IKATZ

**1 · Un cliente nuevo.** Imprime un ticket de prueba en Ajustes › Facturación, ábrelo en Tickets y
facturas y pulsa **Hacer factura**. **No debe salir** «Busca un cliente». Elige **Particular**, escribe un
DNI que no hayas usado, su nombre y su domicilio → **Hacer la factura**. **Debe salir** la factura, y a los
pocos segundos «Correcto».

**2 · Un cliente que vuelve.** Otro ticket de prueba → **Hacer factura**. Escribe tu DNI de las otras veces y
pulsa en otro campo. **Deben rellenarse** tu nombre y tu domicilio, con «De su última factura» debajo.

**3 · Si te equivocas de número.** Sin cerrar, cambia una cifra del DNI. **Deben vaciarse** el nombre y el
domicilio que se habían rellenado solos.

**4 · Un autónomo.** En **Empresa o autónomo**, escribe un DNI antes que el nombre y sal del campo: **no debe
salir ningún error**. Escribe el nombre y sal: **debe encenderse** «Hacer la factura» en cuanto pongas el
domicilio. Si el nombre no cuadra con ese DNI, Hacienda lo dirá; corrígelo y debe encenderse igual.
