# 0067 · Pro a 99 € desde ya, el chat se adelanta, y H empieza por su plan

**Fecha:** 30 de septiembre de 2026
**Estado:** decididos por Richi los puntos 1 y 2. El punto 3 deja **seis preguntas que esperan su sí o su no**, en [`docs/h-horarios.md`](../h-horarios.md).
**Cierra:** las dos recomendaciones que la [0066](0066-sin-asesor-por-ahora-verifacti-y-el-chat.md) dejó esperando.
**Cambia:** el Manifiesto (23, 32 y 33), el Plan (D y M23), el [mapa](../MAPA-de-modulos.md), [`coste-por-local.md`](../coste-por-local.md) y los planes del código (`packages/dominio`).

## Lo que pasó

Con la #81 fusionada, Richi contestó a las dos preguntas:

1. **¿Adelantar el chat?** «Si me lo recomiendas, sí. Se adelanta. Ponlo donde me has recomendado.»
2. **¿Pro a 99 € cuando lleve el TPV, y 79 € hasta entonces?** «Sí, **desde ya**. Si no, no tenemos margen.»

Y pidió empezar H · Horarios por lo que falta por decidir, antes de programar.

## 1 · El chat se adelanta

```
ANTES    H → I → A3 → A4 → M8 …             (el chat, en M23, casi al final)
AHORA    H → I → C · El chat → A3 → A4 → M8 …
```

- **C · El chat** es una entrega propia, con todo lo que cuenta el capítulo 23 del Manifiesto.
- **Va después de la app instalable (I)**, que es la que trae los avisos al móvil: un chat que no suena no sirve.
- **Horarios no lo espera.** Al publicar un horario se avisa por la campana y por correo, con el PDF.
- **M23 conserva su número** y se queda con las reseñas, la competencia y el «chat conectado» de Fogón.

## 2 · Pro a 99 € y Cadena a 89 €, desde hoy

| Plan     | Antes | Ahora    | Al año (dos meses gratis) |
| -------- | ----- | -------- | ------------------------- |
| Esencial | 49 €  | **49 €** | 490 €                     |
| Pro      | 79 €  | **99 €** | 990 €                     |
| Cadena   | 69 €  | **89 €** | 890 € por local           |
| Pausa    | 12 €  | **12 €** | —                         |

Todos con el IVA dentro, como siempre.

- **Richi decidió más de lo recomendado, y manda lo suyo.** La recomendación era esperar al TPV; él lo sube ya. Lo que gana: cada Pro deja unos 16 € más al mes, y el caso malo (bar muy ocupado, con TPV y todos los créditos gastados) pasa de dejar un 30 % a un 44 %.
- **Lo que hay que saber, dicho una vez:** hasta que Estook TPV exista, Pro a 99 € queda **por encima** de su comparable directo (Gstock ONE, unos 82 €). Se defiende por lo que hace de más, no por el precio. El Manifiesto (33) lo dice así.
- **Cadena sube a 89 €** porque era parte de la misma recomendación y porque, si no, el segundo local saldría 30 € más barato que el primero. Sigue valiendo la regla: **nadie paga más por local al crecer**.
- **No hay precio de lanzamiento.** La 0066 lo proponía para quien entrase antes del TPV; con el precio nuevo desde hoy, y sin nadie pagando de verdad todavía, no tiene a quién aplicarse.
- **El tope de tickets** (3.000 al mes por NIF dentro del precio, y de ahí en adelante a precio de coste) sigue siendo una recomendación para cuando llegue Estook TPV. No se decide aquí.

### Cómo se cambia un precio, que queda como regla

**Un precio de Stripe no se cambia: se crea otro.** Cada plan tiene ahora su número de versión (`VERSION_DEL_PRECIO`, en `packages/dominio/src/suscripcion.ts`): Pro y Cadena pasan a la 2, y Esencial y Pausa siguen en la 1. **Richi no tiene que tocar nada en Stripe**: la primera vez que alguien elija Pro o Cadena, el código crea el precio nuevo, igual que creó los primeros.

**Quien ya estuviera en Pro o en Cadena sigue pagando lo de antes** hasta que cambie de plan, porque su suscripción apunta al precio viejo. Hoy eso no afecta a nadie de verdad: el único pago hecho es de prueba. **Un límite conocido:** a esa cuenta, Ajustes → Suscripción le enseñaría el precio nuevo aunque Stripe le cobre el viejo. Antes del primer cliente de pago, la pantalla tiene que leer el importe de Stripe; queda apuntado para la entrega de los cobros de verdad.

## 3 · H · Horarios empieza por su plan

Antes de escribir código, [`docs/h-horarios.md`](../h-horarios.md) deja escrito:

- **lo que ya está decidido** de Horarios, recogido de las decisiones 0010, 0025, 0027, 0057, 0061 y 0062 y de lo que Richi pidió en M7;
- **lo que decide la IA sin preguntar**, para que Richi lo sepa;
- **seis preguntas de sí o no**, cada una con su recomendación;
- y **el motor de los PDF**, con la prueba hecha de las dos salidas.

### El motor de los PDF · recomendado, espera el sí

**Plantillas en HTML y un Chromium de alquiler que las convierte: Cloudflare Browser Run.** Gratis mientras se construye; unos 4,50 € al mes cuando se venda.

Se probaron las dos salidas que pedía la [0061](0061-el-orden-y-la-infraestructura.md) con el mismo horario de ejemplo. Los números y el porqué, en [`h-horarios.md`](../h-horarios.md). En corto: la librería sin navegador es más rápida y no necesita a nadie, pero cada documento se dibuja a mano, medida a medida; con HTML la plantilla es la misma que la vista previa de la pantalla, y las cartas y los carteles de M11 salen con la misma pieza.

**Sigue en pie la regla 7: el PDF nunca se hace en el navegador del usuario.**

## Lo que no se decide aquí

- Las seis preguntas de H, hasta que Richi conteste.
- Cuántos créditos de Fogón lleva Pro: en M22, con lo medido (0065).
