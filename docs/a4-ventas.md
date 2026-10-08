# A4 · Ventas · el plan

**Escrito el 8 de octubre de 2026**, con A3 en producción, y **contestado por Richi ese mismo día** ([0077](decisiones/0077-a4-las-ventas.md)). Construido en la misma entrega, con la migración `0059`.

De dónde sale: el capítulo 4 de [`panel-de-administracion.md`](panel-de-administracion.md), la [decisión 0041](decisiones/0041-el-panel-de-administracion.md) y lo que dejaron A2 (los clientes) y A3 (los vendedores).

## Qué es A4, en llano

**Una pestaña nueva del admin, Ventas: cómo va Estook como negocio, en una pantalla.** Cuántos pagan, cuánto entra al mes, cuántos llegan y por dónde, cuántos se van, y qué vendedor trae clientes que se quedan.

Arriba, el periodo —7 días, este mes, este trimestre o este año—, y cada cifra con su flecha frente al mismo trozo del periodo anterior. Tocar una cifra («Se están yendo · 3») abre Clientes con ese filtro.

| Pieza               | Qué enseña                                                                            |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Clientes**        | Pagando, en prueba, se están yendo y sin pagar; altas y bajas del periodo; conversión |
| **Dinero**          | Lo que entra al mes (la cuota), lo cobrado, y lo que se pierde: clientes y cuota      |
| **De dónde llegan** | Las altas por vendedor, anuncios, buscadores, otra web o directo                      |
| **Siete gráficas**  | Cada una contesta una pregunta                                                        |

| Gráfica                                             | Pregunta                            |
| --------------------------------------------------- | ----------------------------------- |
| Altas y bajas por semana, enfrentadas               | ¿Crecemos o solo reponemos?         |
| La cuota al mes: lo nuevo, lo perdido y lo ampliado | ¿De dónde sale lo que entra al mes? |
| Clientes pagando                                    | ¿Cuántos pagan?                     |
| Cuántos siguen, por mes de alta                     | ¿Los de qué mes aguantan peor?      |
| Traídos y cuota por vendedor                        | ¿Quién trae clientes que se quedan? |
| Altas por origen                                    | ¿Qué canal funciona?                |
| El embudo: abren el enlace → cuenta → plan → pagan  | ¿Dónde se pierden?                  |

## Lo que contestó Richi, y cómo queda

| Pregunta                                 | Queda así                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| **1 · ¿El dinero con IVA o sin IVA?**    | **Sin IVA**: lo que gana Estook. Con IVA, al pasar por la cifra                           |
| **2 · ¿Lo cobrado, además de la cuota?** | **Las dos**: cada cobro y cada devolución que avisa Stripe; los de antes, una vez         |
| **3 · ¿Contar las visitas de la web?**   | **Solo las que llegan con un código de vendedor**: un número por código y día, y nada más |
| **4 · ¿Un correo con las cifras?**       | **Cada lunes**, a cada admin, con la semana de lunes a domingo y quién se está yendo      |

## Lo que ya había, y lo que A4 guarda de más

**Ya había**, comprobado en producción el 8-oct: la foto diaria del uso de cada cliente (A2, desde el 27-sep), el historial de cada suscripción (E2, desde el 25-sep) y por dónde llega cada cliente nuevo (A3, desde el 8-oct).

**A4 guarda de más**: en la foto de cada noche, **cómo está la cuenta y cuánto deja al mes**; **lo que Stripe cobra a cada uno**, con el precio con el que se apuntó; **cada cobro y cada devolución**; y **las visitas de cada código**. Así que **las altas cuentan desde siempre, y las bajas, la cuota de cada mes y lo de «al empezar el periodo», desde el día que se despliegue A4**: el tablero dice desde cuándo, en vez de dibujar ceros.

## Lo que ya estaba decidido, y no se volvió a preguntar

| Qué                                                                                                          | Dónde                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **La pérdida de clientes**: los que se dan de baja en el mes entre los que pagaban al empezarlo              | Admin, 4                                              |
| **La cuota perdida, aparte**: perder un Esencial no es perder un Pro                                         | Admin, 4                                              |
| **Conversión y retención son dos cifras**, cada una con su definición                                        | Admin, 0                                              |
| **Los clientes de ejemplo no cuentan nunca**                                                                 | Admin, 4                                              |
| **Lo calcula el servidor**, con las fotos de cada noche: abrir el tablero no cuenta nada de los restaurantes | [0041](decisiones/0041-el-panel-de-administracion.md) |
| **«Pagando» dice lo mismo** en Ventas, en Clientes y en Vendedores: la misma cuenta                          | A3 ([0076](decisiones/0076-a3-los-vendedores.md))     |

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **IKATZ, que es de la casa, no cuenta**: ni en clientes ni en dinero.
2. **Solo cuenta el modo de Stripe que está puesto.** Hoy es el de prueba, y arriba sale una franja: «Stripe está en modo prueba: nada de esto es dinero de verdad». El día que cobres de verdad, lo de prueba deja de contar solo.
3. **Quien paga el año cuenta su doceava parte cada mes**, como en Clientes.
4. **La cuota es la que paga de verdad**, con el precio con el que se apuntó, no con el de hoy: Pizzeriacazzo entró en Pro cuando costaba 79 €, y cuenta 79 €.
5. **El descuento del primer mes no baja la cuota**: es una vez. Lo cobrado sí lo lleva.
6. **El plan Pausa paga**: está en Pagando, y su cuota cuenta.
7. **Con menos de diez clientes pagando, la pérdida no se da en tanto por ciento** sino «1 de 4»: un 25 % con cuatro clientes asusta y no dice nada.
8. **Las fechas, en hora de Madrid**; los meses, naturales; las semanas, de lunes a domingo.
9. **Ver lo cobrado queda en la auditoría** (Admin, 5), una vez al día por admin y no cada vez que se abre.
10. **En el móvil**, las cifras de dos en dos y las gráficas una debajo de otra.
11. **Una gráfica sin datos no se dibuja vacía**: dice desde cuándo empieza a contar.

Y lo que decidí al construirlo, en la [0077](decisiones/0077-a4-las-ventas.md).

## Lo que cuesta · cero

**Nada más al mes.** Vive en la base y en la API que ya hay. Leer a Stripe no cuesta nada; el correo del lunes cabe de sobra en lo gratuito de Resend; y contar visitas es una llamada a la API por visita, muy lejos del medio millón al mes que da gratis Supabase. **De Richi no hace falta nada**: ninguna clave nueva.

## Lo que no entra

- **Lo que nos cuesta cada cliente y el margen**: con M26 (Roles 4.5 a 4.7), con lo medido en [`coste-por-local.md`](coste-por-local.md).
- **Metas** («30 pagando el 31 de diciembre»): si las quieres, se añaden después; son pequeñas.
- **Previsiones**: con tan pocos clientes, adivinar no sirve.
- **Exportar el tablero**: la lista de Clientes ya se exporta.
- **Las visitas de toda la web**: solo las de los enlaces de vendedor (la 3).
- **Las comisiones**: se pactan fuera (0076).

## Cómo se comprueba que A4 está terminado

- **Las cifras cuadran con una consulta a mano** sobre la base: lo cobrado, quién paga y lo que entra al mes (`las-ventas.prueba.ts`).
- **Un cliente de ejemplo o de la casa no cambia ninguna**, en el dominio y en la base.
- **«Pagando» dice lo mismo** en Ventas, en Clientes y en Vendedores.
- Con Stripe de prueba, **un cobro y una devolución por partes** se apuntan una vez cada uno.
- **El correo del lunes llega a cada admin, y una sola vez por semana.**
- **Una sesión de la app no lee nada de Ventas**, ni preguntando a la API a pelo.
- Todo en la batería de pantalla, **mirado en el móvil**, en claro y en oscuro.
