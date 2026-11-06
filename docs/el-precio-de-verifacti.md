# El precio de Verifacti, y qué decide

> **Al día el 6 de noviembre de 2026** ([0135](decisiones/0135-r4-precios-ia-y-papeles.md)):
> el precio que vale es **14,99 € al mes el primer NIF y 1,99 € cada NIF más**, sin IVA. La
> cuenta de lo que cuesta y deja cada local, con todo, está en
> [`coste-por-local.md`](coste-por-local.md); aquí, lo que Verifacti ofrece y lo que decide.

---

## 1 · Lo que cuesta

Precios **sin IVA**, por **NIF activo en producción** y por mes (Richi, 6-nov-2026):

| NIF activos | Al mes, todos | Por NIF |
| ----------- | ------------- | ------- |
| 1           | 14,99 €       | 14,99 € |
| 10          | 32,90 €       | 3,29 €  |
| 50          | 112,50 €      | 2,25 €  |
| 200         | 411,00 €      | 2,06 €  |

Y la letra pequeña de la propuesta del 21-sep-2026, que es donde está lo que importa:

- **Se cobra por NIF, no por local ni por aparato.** Ya estaba escrito así en el
  Manifiesto; queda confirmado.
- **Solo cuentan los NIF activos en producción.** Las pruebas no se pagan.
- **Sin coste de instalación.**
- **Hasta 3.000 facturas al mes por NIF.** A partir de ahí, **0,002 € por factura**.
  **[VERIFICAR]** que con el precio de 14,99 € siga siendo así.

---

## 2 · Lo que mueve el coste: cuántos tickets se hacen

Las 3.000 facturas incluidas **son 100 tickets al día**. Eso no lo decide lo que
factura el local, sino **cuántas veces cobra**: un bar de tapas con tickets de 4 € hace
muchos más tickets que un restaurante de carta que factura el doble. Con diez clientes
que cobran con Estook (3,29 € el NIF):

| Local                       | Tickets/día | Al mes | Extra a 0,002 € | Coste Verifacti |
| --------------------------- | ----------- | ------ | --------------- | --------------- |
| Restaurante de carta        | 60          | 1.800  | —               | **3,29 €**      |
| Bar de tapas con movimiento | 250         | 7.500  | 9,00 €          | **12,29 €**     |
| Bar muy ocupado             | 500         | 15.000 | 24,00 €         | **27,29 €**     |

**El TPV cabe en Pro sin tocar el precio**: con Pro a 99 € sin IVA, el peor caso
razonable deja un 64 % ([`coste-por-local.md`](coste-por-local.md)). Y el primer cliente,
el más caro (14,99 €), sigue dejando margen de sobra.

### Y una cosa que juega a favor, y no es obvia

**Una cadena de cinco locales bajo un mismo NIF paga un NIF.** Estook le cobra cinco
veces 89 € —445 € sin IVA— y Verifacti cobra un NIF, más las facturas que se pasen de
3.000. **Las cadenas son el cliente más rentable del TPV**, y eso encaja con que el plan
Cadena exista.

---

## 3 · Lo que conviene preguntar a Verifacti

**Con el precio de 14,99 € + 1,99 € ya no hay duda de qué se paga con un solo cliente**:
14,99 € al mes. Lo que sigue abierto:

### Las preguntas

1. **Al dar de baja a un cliente, ¿deja de contar ese NIF el mes siguiente?** El Anexo
   4.2 ya dice que dar de baja es **desactivar**, nunca borrar —borrar elimina sus
   registros—, así que hay que confirmar que desactivar sí quita el cobro.
2. **¿Las facturas extra se cuentan por NIF o en total?** Cambia mucho en una cadena
   con un NIF y cinco locales.
3. **Si las 3.000 facturas incluidas por NIF y los 0,002 € de más siguen igual** con
   este precio.
4. **Mensual al principio**, sin permanencia, y se pasa a anual cuando haya volumen.

---

## 4 · Lo que el correo técnico confirma, y vale la pena saber

El segundo correo de Verifacti describe cómo adecuar el software, y **confirma punto por
punto lo que ya decía el Anexo**. No cambia nada; lo que hace es quitarle el «[VERIFICAR]»
a cosas que estaban supuestas:

| Lo que dicen                                                                                                               | Dónde ya estaba       |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| El QR lo devuelve su API **al momento**, al comunicar la emisión                                                           | Anexo 4.1 y 4.7       |
| Ellos generan el XML y lo remiten a la AEAT **con su propio certificado**                                                  | Anexo 1.5 · es el CEF |
| La respuesta de la AEAT tarda unos minutos, y dan **webhooks y endpoints** para ella                                       | Anexo 4.10            |
| **Declaración responsable**: la necesitas accesible y visible; dan plantilla                                               | Anexo 4.14            |
| **Modelo de representación**: hay que firmarlo **antes de la primera factura** de cada obligado; dan el formulario relleno | Anexo 4.3, paso 5     |

**El Anexo acertó en los cinco.** Eso es una buena señal sobre la especificación.

Y un dato nuevo que conviene tener escrito: **el formulario de representación lo publicó
la AEAT en el BOE en diciembre**, y hay que gestionarlo **por cada obligado tributario**,
no una sola vez para Estook. O sea: **cada cliente que cobre con Estook tiene que firmar
el suyo antes de emitir su primera factura**. Ya está en el Anexo como paso 5 del alta de
facturación, y esto confirma que es por cliente y no por nosotros.

---

## 5 · Lo que queda decidido, y lo que no

**Decidido:**

- **El TPV es de Pro y de Cadena, sin subir el precio** ([0120](decisiones/0120-estook-tpv-es-de-pro.md)).
- **En Esencial no**: Esencial es gestión a mano por 39 € sin IVA, y meterle un coste
  variable de 3 a 27 € se come el margen.
- **Contrato mensual**, no anual, hasta tener volumen.

**Pendiente, y es de Richi:** las preguntas del apartado 3, cuando toque firmar con
Verifacti (antes de T6 · 2).
