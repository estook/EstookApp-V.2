# 0135 · R4 · Los precios finales sin IVA, la Pausa, la IA a un tercio y el coste con Verifacti

**Fecha:** 6 de noviembre de 2026
**Estado:** construido en la rama `r4-precios-ia-y-papeles`, **con la migración 0105**.
**Sigue:** la [0133](0133-r3-ajustes-y-secciones.md), punto 6 (lo que Richi añadió para R4), y la
[0130](0130-la-pausa-del-5-nov-r1-lo-rapido.md) (las reglas de la Pausa). Estook TPV para Android,
que también estaba en R4, se decidió aparte en la [0134](0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md).
**Cambia:** el Manifiesto (32 y 33), el Plan (M10), la Auditoría de flujos, el coste por local, el
precio de Verifacti, el mapa, el plan de M20A, las condiciones de la web, ESTADO y la maqueta de
Estook TPV en Ajustes.

La última de las cuatro entregas de la pausa del 5-nov. Después va **T6 · 2 · 1**.

## 1 · Los precios, finales y sin IVA

Richi, 6-nov: «es el final», y en todos los documentos tiene que quedar este.

| Plan     | Al mes, por local | Al año, por local |
| -------- | ----------------- | ----------------- |
| Esencial | 39 € + IVA        | 390 € + IVA       |
| Pro      | 99 € + IVA        | 990 € + IVA       |
| Cadena   | 89 € + IVA        | 890 € + IVA       |
| Pausa    | 9 € + IVA         | —                 |

- **En Stripe, el IVA va aparte**: los precios se crean con `tax_behavior: 'exclusive'` y un tipo de
  IVA del 21 % **aparte** (`iva-21-aparte`), que Stripe suma en cada factura. Cada plan estrena
  versión de precio (Esencial y Pausa la 2, Pro y Cadena la 3): un precio de Stripe no se cambia, se
  sustituye.
- **La cuota que guarda Estook es sin IVA** (la de Ajustes › Suscripción, la del admin y la de las
  ventas). Lo apuntado antes, que llevaba el IVA dentro, se divide entre 1,21 en la migración. Lo
  cobrado (`cobro`, `devolucion`) no cambia: ya guardaba las dos cifras.
- **En pantalla, «+ IVA»** en Elegir plan, Ajustes › Suscripción y el botón de Estook TPV; y las
  condiciones de la web dicen que el IVA se suma aparte.

## 2 · La Pausa

Con las reglas de la 0130 y lo que Richi contestó el 6-nov:

1. **Empieza al instante**, y Stripe prorratea lo que quedaba del plan de antes.
2. **Se vuelve cuando se quiera, sin penalización**, pagando solo la parte del mes que queda. Richi:
   «se les cobra el proporcional a lo que quede de mes, como hacen otras apps; no se les cobra todo
   el mes entero». **Lo de «mínimo un mes» de la 0130 se queda así**: no hay mínimo que cobrar.
3. **Hasta seis meses**, sin elegir fecha al pausar («que vuelva cuando pueda volver, más libre y
   justo»). **Siete días antes** llega un correo; **el día que se cumplen**, vuelve sola al plan de
   antes (el reloj).
4. **Una vez cada doce meses**, contados desde que empezó la anterior.
5. **En Ajustes › Suscripción**: «Cambiar de plan › Pausa › Pausar» pregunta «¿Pausar tu cuenta?» con
   lo que cuesta; en Pausa sale «En Pausa desde el…», cuándo vuelve sola y **«Volver a Pro»** (o al
   plan que tenía). Si no se puede pausar, la fila de Pausa dice por qué y cuándo.

La base guarda **cuándo empezó la última Pausa** y **a qué plan e intervalo vuelve**
(`estook.suscripcion`, migración 0105). La regla vive en `@estook/dominio` (`porQueNoSePuedePausar`,
`cuandoAcabaLaPausa`); la cumple la API y la pinta la pantalla.

## 3 · La IA a un tercio

| Qué                         | Antes             | Desde hoy                |
| --------------------------- | ----------------- | ------------------------ |
| Créditos de Esencial al mes | 300               | **100**                  |
| Créditos de Pro y Cadena    | 1.500             | **500**                  |
| Tope en euros por local     | 5 € al mes        | **1,65 € al mes**        |
| «Analiza mi zona»           | Una vez cada 24 h | **Una vez cada 10 días** |
| Lo que gasta la zona        | 25 créditos       | **8 créditos**           |

Al día, una décima parte de los créditos y del tope (10 créditos y 16,5 céntimos en Esencial).

## 4 · El coste por local, con Verifacti a 14,99 € + 1,99 €

Verifacti, sin IVA: **14,99 € al mes el primer NIF y 1,99 € cada NIF más** (Richi, 6-nov). Con diez
clientes que cobran con Estook, 3,29 € cada uno; con doscientos, unos 2 €. Las cuentas, en
[`coste-por-local.md`](../coste-por-local.md), salen de `herramientas/coste-por-local.mjs`:

- Un local normal deja **entre el 91 y el 95 %**; el peor caso (Pro con TPV en un bar muy ocupado,
  todos sus créditos), **un 64 %**.
- **La IA tiene techo**: nunca más de 1,65 € por local, use el modelo que use.

## 5 · Lo que decidió la IA al construirlo

1. **La Pausa no se ofrece en la prueba** (no se paga nada: quien cierra, cancela) **ni con un cobro
   pendiente** (primero se paga lo que se debe).
2. **Volver de la Pausa es volver al plan de antes con su intervalo**, ajustado a los locales de hoy
   (Pro con dos locales es Cadena). Desde la Pausa también se puede elegir otro plan.
3. **El correo de los seis meses**, siete días antes, como el del fin de la prueba; el día, sin
   correo: vuelve sola y se ve en Ajustes.
4. **«Analiza mi zona» gasta 8 créditos**: un tercio de los 25, cabe en el día de Esencial (10) y es
   lo que cuesta (unos 8 céntimos, casi todo búsquedas).
5. **El tope de IA de un día es una décima parte del mes** (antes, una vigésima): con 1,65 € al mes,
   una vigésima eran 8 céntimos, y un análisis de la zona dejaba al local sin Fogón el resto del día.
6. **Quien ya pagaba con un precio de antes** (con el IVA dentro) sigue con él hasta que cambie de
   plan; al cambiar, pasa al precio nuevo y al IVA aparte. Hoy solo hay pagos de prueba.
7. **En el coste, Verifacti se reparte entre diez clientes con TPV**, y las 3.000 facturas incluidas
   por NIF se mantienen con un **[VERIFICAR]**: son de la propuesta del 21-sep.
8. **Las decisiones viejas no se reescriben** (las decisiones no se borran ni se reescriben, su
   LEEME): la 0042, 0048, 0065, 0067 y 0077 siguen diciendo los precios de su día. Lo que se lee como
   vigente —los maestros, el coste, el precio de Verifacti, la web y la app— ya solo dice estos.

## 6 · Lo que queda por decidir, y es de Richi

- **Comprar más créditos** (Manifiesto 32: 500 por 9 €…) **choca con el tope de 1,65 €**: lo comprado
  tendría que subir el tope. No está construido; se decide en M22.
- **«Fogón Pro con el modelo grande»**: con 1,65 € de tope, el modelo grande se comería el tope antes
  de gastar la mitad de los 500 créditos. Se decide en M22, con lo medido.
- **Cadena a partir de 11 locales**, «desde 59 € por local»: queda **más IVA**, como todo lo demás.
- **Verifacti**: confirmar que con 14,99 € siguen las 3.000 facturas por NIF incluidas.
