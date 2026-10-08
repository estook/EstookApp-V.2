# A4 · Ventas · el plan

**Escrito el 8 de octubre de 2026**, con A3 en producción (leído en la base ese día: 58 migraciones, la API con 73 y 162). Dice qué es A4, lo que ya hay para hacerlo y lo que falta guardar, lo que decido yo, lo que cuesta, lo que no entra y **cuatro preguntas** para Richi, cada una explicada.

De dónde sale: el capítulo 4 de [`panel-de-administracion.md`](panel-de-administracion.md), la [decisión 0041](decisiones/0041-el-panel-de-administracion.md) y lo que dejaron A2 (los clientes) y A3 (los vendedores).

## Qué es A4, en llano

**Una pestaña nueva del admin, Ventas: cómo va Estook como negocio, en una pantalla.** Cuántos pagan, cuánto entra al mes, cuántos llegan y por dónde, cuántos se van, y qué vendedor trae clientes que se quedan.

Arriba, el periodo —7 días, mes, trimestre o año—, y cada cifra con su flecha frente al periodo anterior. Tocar una cifra («Se están yendo · 3») abre Clientes con ese filtro.

| Pieza               | Qué enseña                                                                            |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Clientes**        | Pagando, en prueba, se están yendo y sin pagar; altas y bajas del periodo; conversión |
| **Dinero**          | Lo que entra al mes (la cuota), lo cobrado, y lo que se pierde: clientes y cuota      |
| **De dónde llegan** | Las altas por vendedor, anuncios, buscadores, otra web o directo                      |
| **Siete gráficas**  | Cada una contesta una pregunta                                                        |

| Gráfica                                             | Pregunta                            |
| --------------------------------------------------- | ----------------------------------- |
| Altas y bajas por semana, enfrentadas               | ¿Crecemos o solo reponemos?         |
| La cuota al mes: lo nuevo, lo perdido y lo ampliado | ¿De dónde sale el crecimiento?      |
| Clientes pagando                                    | ¿Cuántos tenemos?                   |
| Cuántos siguen, por mes de alta                     | ¿Los de qué mes aguantan peor?      |
| Traídos y cuota por vendedor                        | ¿Quién trae clientes que se quedan? |
| Altas por origen                                    | ¿Qué canal funciona?                |
| El embudo: llegan → prueban → pagan                 | ¿Dónde se pierden?                  |

## Lo que ya hay, y lo que falta guardar

**Ya hay**, comprobado en producción el 8-oct:

- **La foto diaria del uso** de cada cliente (A2), cada noche desde el 27-sep.
- **El historial de cada suscripción** (E2): de qué estado a cuál, cuándo y quién, desde el 25-sep.
- **Por dónde llega cada cliente nuevo** (A3), desde el 8-oct.

**Falta**, y lo añade A4:

1. **Lo que deja al mes cada cliente, cada día**, en esa misma foto. El historial dice el estado pero no la cuota, así que **las gráficas de dinero empiezan el día que se despliegue A4**; las de clientes, el 25-sep.
2. **Cada cobro y cada devolución**, si contestas que sí a la pregunta 2.
3. **Las visitas de la web**, si contestas que sí a la 3.

**Hoy el tablero saldrá casi vacío**: hay cuatro clientes que no son de la casa y paga uno, Pizzeriacazzo, en modo prueba. Está bien: se llena solo.

## Lo que ya está decidido, y no se vuelve a preguntar

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

1. **IKATZ, que es de la casa, no cuenta**: ni en clientes ni en dinero. Sale aparte, «1 de la casa».
2. **Solo cuenta el modo de Stripe que está puesto.** Hoy es el de prueba, y arriba sale una franja: «Modo prueba: nada de esto es dinero de verdad». El día que cobres de verdad, lo de prueba deja de contar solo.
3. **Quien paga el año cuenta su doceava parte cada mes**, como en Clientes.
4. **La cuota es la que paga de verdad**, con el precio con el que se apuntó, no con el de hoy: Pizzeriacazzo entró en Pro cuando costaba 79 €, y cuenta 79 €.
5. **El descuento del primer mes no baja la cuota**: es una vez. Lo cobrado sí lo lleva.
6. **El plan Pausa cuenta como pagando**, y se dice aparte cuántos hay: es la antesala de irse o de volver.
7. **Con menos de diez clientes pagando, la pérdida no se da en tanto por ciento** sino «1 de 4»: un 25 % con cuatro clientes asusta y no dice nada.
8. **Las fechas, en hora de Madrid**; los meses, naturales; las semanas, de lunes a domingo.
9. **Ver lo cobrado queda en la auditoría** (Admin, 5), una vez al día por admin y no cada vez que se abre.
10. **En el móvil**, las cifras en mosaico de dos y las gráficas una debajo de otra; tocar una barra dice su cifra.
11. **Una gráfica sin datos no se dibuja vacía**: dice desde cuándo empieza a contar.

## Lo que cuesta · cero

**Nada más al mes.** Vive en la base y en la API que ya hay. Leer a Stripe no cuesta nada; el correo de la pregunta 4 cabe de sobra en lo gratuito de Resend; y contar visitas (pregunta 3) es una llamada a la API por visita, muy lejos del medio millón al mes que da gratis Supabase. **De Richi no hace falta nada**: ninguna clave nueva. Una migración y un despliegue, como siempre.

## Lo que no entra

- **Lo que nos cuesta cada cliente y el margen**: con M26 (Roles 4.5 a 4.7), con lo medido en [`coste-por-local.md`](coste-por-local.md).
- **Metas** («30 pagando el 31 de diciembre»): si las quieres, se añaden después; son pequeñas.
- **Previsiones**: con tan pocos clientes, adivinar no sirve.
- **Exportar el tablero**: la lista de Clientes ya se exporta.
- **Las comisiones**: se pactan fuera (0076).

## Las cuatro preguntas

Cada una dice de qué va, un ejemplo, las opciones y lo que pasa con cada una. **Basta con contestar la letra.**

### 1 · El dinero, ¿con IVA o sin IVA?

**De qué va.** Los precios de Estook llevan el IVA dentro. De cada cuota, una parte no es de Estook: se paga a Hacienda.

**Un ejemplo.** Un cliente en Pro paga 99 € al mes. De eso, 17,18 € son IVA; para Estook quedan 81,82 €.

- **A · Sin IVA**: el tablero dice 81,82 €. Es lo que gana Estook de verdad, y lo que mira un banco o quien quiera invertir.
- **B · Con IVA**: dice 99 €. Es lo que ves en la web y en Stripe, pero suma dinero que no es tuyo.

**Recomiendo A**, con «99 € con IVA» al tocar la cifra. **Lo que decides: A o B.**

### 2 · ¿Guardamos lo cobrado de verdad, además de la cuota?

**De qué va.** La cuota es lo que debería entrar cada mes; lo cobrado, lo que entró. Se separan cuando falla una tarjeta, con el descuento del primer mes y con quien paga el año de golpe.

**Un ejemplo** (con IVA, para que se vea fácil). En noviembre hay diez clientes en Pro: la cuota es 990 €. Uno tiene la tarjeta caducada y otro llegó con un 50 % el primer mes: lo cobrado son 841,50 €.

- **A · Las dos**: Estook apunta cada cobro y cada devolución que le avisa Stripe —ya se los avisa, y hoy solo los mira para saber el estado—, y la primera vez trae los de antes.
- **B · Solo la cuota**: menos trabajo; lo cobrado lo miras en Stripe.

**Recomiendo A.** **Lo que decides: A o B.**

### 3 · ¿Contamos cuánta gente abre la web, y por dónde llega?

**De qué va.** Hoy el embudo empieza cuando alguien crea la cuenta: no sabes cuántos miraron y se fueron.

**Un ejemplo.** Un vendedor reparte 200 folletos con su QR. 40 lo abren, 6 crean cuenta y 2 pagan. Sin contar visitas, solo ves los 6.

- **A · Todas las visitas a `estook.com`, por dónde llegan** (un código, anuncios, buscadores, otra web o directo). La portada le dice a la API «una visita, con este código», y se guarda **solo un número por día**: ni quién, ni su dirección IP, ni nada en su navegador. **Sin aviso de cookies.** Quien recarga la página cuenta dos veces; para saber si funciona un canal, da igual.
- **B · Solo las que llegan con un código de vendedor**, igual de anónimas.
- **C · No contar**: el embudo empieza al crear la cuenta.

**Recomiendo A**: cuesta lo mismo que B y dice además si funcionan Google o un anuncio. **Lo que decides: A, B o C.**

### 4 · ¿Un correo con las cifras, para no tener que abrir el admin?

**De qué va.** Saber cómo va Estook sin entrar a mirarlo.

**Un ejemplo.** El lunes a las 8:00, a cada admin (hoy, tú y Santi): «Pagando 23 (+2) · Entra al mes 2.150 € · 3 altas y 1 baja · Se están yendo: Bar Pepe, 16 días sin entrar».

- **A · Cada lunes**, con la semana.
- **B · El día 1 de cada mes**, con el mes entero.
- **C · Los dos.**
- **D · Ninguno**: se mira en el admin.

**Recomiendo A**: el mes entero ya lo enseña el tablero. **Lo que decides: A, B, C o D.**

## Cómo se comprobará que A4 está terminado

- **Las cifras cuadran con una consulta a mano** sobre la base: una prueba hace las dos cuentas y las compara.
- **Un cliente de ejemplo o de la casa no cambia ninguna.**
- **«Pagando» dice lo mismo** en Ventas, en Clientes y en Vendedores.
- Con Stripe de prueba, **un cobro, una devolución y un cobro fallido** se ven en lo cobrado (si la 2 es A).
- **Una sesión de la app no lee nada de Ventas**, ni preguntando a la API a pelo.
- Todo en la batería de pantalla, **mirado en el móvil**, en claro y en oscuro.

**Una sola entrega**, como A3: una migración (la **0059**), un despliegue y, si la 3 no es C, la portada.
