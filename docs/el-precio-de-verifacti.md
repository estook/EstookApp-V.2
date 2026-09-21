# El precio de Verifacti, y qué decide

**Escrito el 21 de septiembre de 2026**, con la propuesta de Verifacti delante.

> **Para qué existe este papel.** La Evolución 1.1, capítulo 19, deja tres decisiones
> pendientes de Richi, y la primera dice: _«En qué planes entra el TPV. Se decide **con
> el precio real del proveedor de VeriFactu delante**»_. Ya está delante. Esto son las
> cuentas, y la pregunta que queda.
>
> **La propuesta caduca en cuatro semanas**, así que alrededor del **19 de octubre de
> 2026**.

---

## 1 · Lo que ofrecen

Precios **sin IVA**, por **NIF activo en producción** y por mes:

| NIF activos | € / NIF / mes | Total al mes |
| ----------- | ------------- | ------------ |
| 10          | 5,59          | 55,90        |
| 20          | 4,49          | 89,80        |
| 30          | 4,12          | 123,70       |
| 40          | 3,89          | 155,60       |
| 50          | 3,71          | 185,50       |

Y la letra pequeña, que es donde está lo que importa:

- **Se cobra por NIF, no por local ni por aparato.** Ya estaba escrito así en el
  Manifiesto; queda confirmado.
- **Solo cuentan los NIF activos en producción.** Las pruebas no se pagan.
- **Sin coste de instalación.**
- **Plan mensual sin permanencia**, o **anual con un 10 % de descuento** y compromiso
  de un año.
- **Hasta 3.000 facturas al mes por NIF.** A partir de ahí, **0,002 € por factura**.

---

## 2 · La cuenta, con los planes que ya están escritos

Los planes del Manifiesto llevan **el IVA incluido**, y el coste de Verifacti es **sin
IVA**. Para comparar peras con peras, todo lo de abajo va **sin IVA**:

| Plan         | Con IVA | Sin IVA   | Coste base de servir un local |
| ------------ | ------- | --------- | ----------------------------- |
| **Esencial** | 49 €    | **40,50** | ≈ 4,02 €                      |
| **Pro**      | 79 €    | **65,29** | ≈ 7,10 € (más créditos de IA) |
| **Cadena**   | 69 €    | **57,02** | ≈ 7,10 €                      |

### Y lo que de verdad mueve el coste: cuántos tickets se hacen

Las 3.000 facturas incluidas **son 100 tickets al día**. Eso no lo decide lo que
factura el local, sino **cuántas veces cobra**: un bar de tapas con tickets de 4 € hace
muchos más tickets que un restaurante de carta que factura el doble.

| Local                       | Tickets/día | Al mes | Extra a 0,002 € | Coste Verifacti |
| --------------------------- | ----------- | ------ | --------------- | --------------- |
| Restaurante de carta        | 60          | 1.800  | —               | **5,59 €**      |
| Bar de tapas con movimiento | 250         | 7.500  | 9,00 €          | **14,59 €**     |
| Bar muy ocupado             | 500         | 15.000 | 24,00 €         | **29,59 €**     |

_(Al precio de 10 NIF, que es el más caro de la tabla. Con más clientes, baja.)_

### El margen de Pro, en los tres casos

| Local                | Ingreso sin IVA | Coste base | Verifacti | **Margen**       |
| -------------------- | --------------- | ---------- | --------- | ---------------- |
| Restaurante de carta | 65,29           | 7,10       | 5,59      | **52,60 · 81 %** |
| Bar de tapas         | 65,29           | 7,10       | 14,59     | **43,60 · 67 %** |
| Bar muy ocupado      | 65,29           | 7,10       | 29,59     | **28,60 · 44 %** |

**Conclusión: el TPV cabe en Pro sin tocar el precio**, incluso en el peor caso
razonable. Y el peor caso mejora solo: cuantos más clientes, más barato el NIF.

### Y una cosa que juega a favor, y no es obvia

**Una cadena de cinco locales bajo un mismo NIF paga un NIF.** Estook le cobra cinco
veces 57,02 € —285 €— y Verifacti cobra 3,71 €, más las facturas que se pasen de 3.000.
Aunque los cinco locales se coman 15.000 facturas entre todos, son 24 € contra 285 €.

**Las cadenas son el cliente más rentable del TPV**, y eso encaja con que el plan Cadena
exista.

---

## 3 · Lo que la propuesta NO dice, y hay que preguntar

**La tabla empieza en 10 NIF.** Los primeros clientes de Estook no van a ser diez: van
a ser uno, dos, tres. Y eso cambia la respuesta entera:

- **Si hay un mínimo de 10 NIF** (55,90 €/mes), eso es un coste fijo desde el primer
  día. Con un solo cliente Pro —65,29 € sin IVA— el margen se queda en 2,29 €. Con
  tres, vuelve a ser sano.
- **Si se paga por NIF real desde el primero**, no hay problema ninguno: el primer
  cliente cuesta lo que cuesta y punto.

**Es la pregunta que decide si el TPV se puede ofrecer desde el primer cliente o hay que
esperar a tener unos cuantos.** Y son dos líneas de correo.

### Las otras tres que conviene preguntar de paso

1. **Al dar de baja a un cliente, ¿deja de contar ese NIF el mes siguiente?** El Anexo
   4.2 ya dice que dar de baja es **desactivar**, nunca borrar —borrar elimina sus
   registros—, así que hay que confirmar que desactivar sí quita el cobro.
2. **¿Las facturas extra se cuentan por NIF o en total?** Cambia mucho en una cadena
   con un NIF y cinco locales.
3. **El plan anual con 10 % de descuento pide compromiso de un año.** Con cero clientes
   todavía, eso es atarse. **Mensual al principio**, y se pasa a anual cuando haya
   volumen: el 10 % no compensa el riesgo.

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

**Decidido por las cuentas, salvo que Richi diga otra cosa:**

- **El TPV entra en Pro y en Cadena, sin subir el precio.** Es lo que proponía la
  Evolución 1.1, y ahora hay números que lo sostienen.
- **En Esencial no**, porque Esencial es gestión a mano por 40,50 € sin IVA: meterle un
  coste variable de 5 a 30 € se come el margen.
- **Contrato mensual**, no anual, hasta tener volumen.

**Pendiente, y es de Richi:**

- Preguntar a Verifacti **qué se paga con menos de 10 NIF**. Hasta saberlo, no se puede
  decir desde cuándo se ofrece el TPV.
- Las otras tres preguntas del apartado 3.

**Y lo que no cambia:** nada de esto se construye todavía. El TPV es la **Fase 4**, y lo
de ahora sigue siendo «Antes de M8». Esto es solo tener la decisión lista para cuando
toque, y no perder una propuesta que caduca en cuatro semanas.
