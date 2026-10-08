# 0077 · A4 · Las ventas: el tablero sin IVA, lo cobrado de verdad, las visitas de los enlaces de vendedor y un correo cada lunes

**Fecha:** 8 de octubre de 2026
**Estado:** decidido por Richi y **construido el 8-oct**, con la migración `0059` (lo que decidí al construirlo, al final).
**Cambia:** el capítulo 4 de [`panel-de-administracion.md`](../panel-de-administracion.md), que se precisa con esto. El plan, en [`a4-ventas.md`](../a4-ventas.md).

## Lo que contestó Richi

Las cuatro preguntas del plan, el mismo 8-oct:

1. **El dinero, ¿con IVA o sin IVA?** **A · Sin IVA**: lo que gana Estook de verdad.
2. **¿Guardamos lo cobrado de verdad, además de la cuota?** **A · Las dos.**
3. **¿Contamos cuánta gente abre la web?** **B · Solo las visitas que llegan con un código de vendedor.** (La recomendación era contarlas todas; manda lo suyo.)
4. **¿Un correo con las cifras?** **A · Cada lunes.**

## Lo que se decide

### Uno · Una pestaña nueva del admin, Ventas

Al lado de Clientes. Arriba, el periodo —7 días, este mes, este trimestre o este año—, comparado con **el mismo trozo del periodo anterior** (el día 8 se compara con los ocho primeros días del mes pasado). Doce cifras en mosaico —pagando, lo que entra al mes, lo cobrado, quién se está yendo, altas, bajas, en prueba, sin pagar, la pérdida de clientes, la conversión, la retención y cuántas veces se abre un enlace de vendedor— y siete gráficas, cada una con la pregunta que contesta. **Tocar una cifra abre Clientes en esa pestaña.** Y quien se está yendo, a la vista, con el porqué.

### Dos · El dinero, sin IVA

Todas las cifras de dinero del tablero y del correo van **sin IVA**: 99 € con IVA son 81,82 €. Con IVA, al pasar por la cifra. La cuenta, con el motor de dinero del dominio (`sinIva`, regla 9).

### Tres · Lo cobrado, factura a factura

Cada cobro que avisa Stripe (`invoice.paid`) se apunta **una vez**, con lo que la factura dice que es sin IVA; y **cada devolución** (`charge.refunded`, un aviso que se pide desde ahora), **por partes**: Stripe dice lo devuelto en total y se apunta lo nuevo. Lo cobrado **solo se añade**: lo impide la base. Los cobros de antes de A4 **los trae el reloj una vez**.

### Cuatro · Las visitas, solo de los enlaces de vendedor (3B)

Cuando alguien abre la portada con `?ref=`, la portada se lo dice a la API y la base **suma uno a ese código ese día**. **Solo un número**: ni quién, ni su dirección, ni nada en su navegador, así que **sigue sin hacer falta aviso de cookies**. Un código que no existe o está cerrado no cuenta. Salen en el embudo, en «¿Quién trae clientes que se quedan?» y en la ficha de cada vendedor.

### Cinco · El correo del lunes (4A)

Cada lunes, con el reloj de las ocho, **a cada admin vivo**: pagando, lo que entra al mes, altas, bajas y lo cobrado de la semana de lunes a domingo, con su cambio frente a la anterior, y **quién se está yendo**. Una vez por semana: si el lunes no sale, lo intenta el martes; si tampoco, esa semana se queda sin él.

## Lo que decidí al construirlo

1. **La foto de cada noche dice desde ahora cómo está la cuenta y cuánto deja al mes** (`plataforma.uso_diario`). De ahí salen las bajas, la cuota de cada mes y cuántos pagaban al empezar un periodo. **Las fotos de antes no lo tienen**: esas cifras empiezan el día que se despliegue A4, y el tablero lo dice («cuenta desde…») en vez de dibujar ceros.
2. **Lo que cobra Stripe a cada uno se guarda aparte** (`plataforma.cuota_de_stripe`), al leer su suscripción: el precio con el que se apuntó, sin descuentos. La lista de Clientes lo usa también, así que **Pizzeriacazzo pasa a decir 79 €**, que es lo que paga (entró antes de la subida de Pro, 0067).
3. **El plan Pausa paga**: en Clientes sale «En Pausa» y en la pestaña **Pagando**, no en «Sin pagar»; y su cuota cuenta. Hasta hoy caía en «Sin pagar» y no se contaba (lo vi al construir A4).
4. **Una baja** es quien pagaba en una foto y en la siguiente ya no paga ni prueba. **Un cobro fallido no es una baja** hasta que pasan sus siete días: su cuota sigue contando en lo que entra al mes, aunque esté en «Se están yendo».
5. **Ver lo cobrado deja una línea en la auditoría del admin, una al día por persona** (panel de administración, 5), no una por cada vez que se abre o se cambia de periodo. Es la única consulta que escribe, y solo eso.
6. **Una visita no se puede proteger contra repeticiones**: quien llega no tiene organización, y es por organización como se recuerda. Un reintento de la red cuenta dos veces, igual que una recarga de la página. Es un recuento para saber si un enlace funciona, no dinero. Y **diez mil al día por código como mucho**: lo de más no cuenta.
7. **Una gráfica sin datos no se dibuja**: dice desde cuándo cuenta, o la cifra que tiene («4 pagando esta semana; la línea sale con la segunda»). Y las tarjetas van en mosaico, cada una de su alto.
8. **El día de alta de cada cliente, en hora de Madrid**: un alta a las 00:30 es de ese día. Hasta hoy se contaba en hora universal.
9. **La privacidad lo dice**: que, si llegas por el enlace de un vendedor, sumamos una visita a su código, sin saber quién eres. Borrador, sin asesor, como el resto.

## Lo que se descartó

- **Contar todas las visitas de la web** (la 3A). Richi eligió solo las de los vendedores.
- **El correo del día 1 de cada mes.** El mes entero ya lo enseña el tablero.
- **Lo que nos cuesta cada cliente, metas, previsiones y exportar el tablero**: ver «Lo que no entra» en el plan.
