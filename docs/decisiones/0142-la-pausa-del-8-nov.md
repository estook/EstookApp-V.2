# 0142 · La pausa del 8-nov: que los datos del TPV sirvan para llevar el negocio

**Fecha:** 8 de noviembre de 2026
**Estado:** aprobada por Richi el 8-nov con la maqueta; **en tres entregas (P1 a P3)**, y la caja con T7.
**Sigue:** la [0105](0105-m16a-la-jornada.md) (la jornada), la [0120](0120-estook-tpv-es-de-pro.md) (Estook TPV es
de Pro), la [0121](0121-la-pausa-del-tpv.md) (la caja de Richi) y la [0103](0103-las-respuestas-de-m10-2.md) (estrella,
caballo, puzzle y perro, «no te olvides»).
**Maqueta:** [la pausa del 8-nov](../maquetas/la-pausa-del-8-nov.html), aprobada el 8-nov.
**Cambia:** el orden (T7 antes que T6 · 3), el Anexo (11.5 y 11.6), el Plan (M16, M20 y M21), el mapa y ESTADO.

Entre T6 y T7, Richi pidió nueve arreglos «tochos» para no arrastrarlos hasta el final: que lo que vende el TPV se
vea, que Pro no pregunte lo que no tiene sentido, y cinco fallos del alta y de Ajustes.

## 1 · Lo que contestó Richi a la maqueta

1. **La caja y los cierres** (punto 4) quedan aprobados y **se construyen con el cobro, como lo primero de T7**: hoy
   Estook TPV no cobra, y sin cobros no hay «lo que debería haber en el cajón».
2. **T7 va antes que T6 · 3** (lo recomendó la IA: T6 · 3 espera la respuesta del certificado, y T7 trae la caja y
   las ventas exactas).
3. **Los objetivos, por partes**: un botón «Objetivos» con dos pestañas, **General** y **Por empleado**; no todo en la
   misma página. El general se pone en **€ por hora**, y el de la semana de cada uno sale de sus horas del horario.
4. **La lista de empleados, solo para quien lleva el local.** Cada camarero ve **solo su objetivo**, y **el gerente
   puede ocultárselo** a todos.

## 2 · Las tres entregas

| Entrega                         | Qué lleva                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1 · Lo del alta y Ajustes**  | **1 y 2**: la semana en Movimientos y en Consumo (y el trimestre). **9**: la letra «Automática», pequeña en el móvil. **7 y 8**: los datos del local editables en Ajustes › Tu local, el nombre del negocio en Organización, Google en el alta y la hora de corte sin preguntar. **5**: los locales al pagar. **4.1**: Pro sin «¿cómo entran tus ventas?». **6**: Google en Estook TPV |
| **P2 · Información e Informes** | **3**: Servicio › Jornadas › **Información** (sustituye a «En marcha»), con «Tu carta en cuatro». **3.1**: Negocio › **Informes** rehecho (cuándo se vende, la cocina, lo que se tuerce, las semanas). Anular la mesa con motivos de un toque                                                                                                                                          |
| **P3 · Empleados**              | **3.2**: Servicio › **Empleados**, con sus objetivos (punto 1, 3 y 4 de arriba)                                                                                                                                                                                                                                                                                                        |
| **Con T7**                      | **4**: «Empezar el día» y «Cerrar el día» al lado de Fichar en la pantalla del PIN, contar a ciegas, y **Servicio › Jornadas › Cierres de caja**; ese día, con Pro, **se quita el cierre a mano** y Ajustes deja de ofrecer el CSV                                                                                                                                                     |

## 3 · Lo que no se olvida para T7

- **El botón de la caja** va en la pantalla del PIN **al lado de «Fichar»**, en verde («Empezar el día») o en ámbar
  («Cerrar el día»), y pide el PIN de un encargado; **también dentro**, arriba en la sala (Anexo 11.5).
- **«Cierre» pasa a «Cierres de caja»** con Pro: la lista por día con su diferencia, un buscador por fecha, «Con
  diferencia», y cada cierre con su Z (fondo, efectivo, tarjeta, entradas y salidas, contado y diferencia).
- **Con Pro se quita el cierre a mano** cuando el cobro esté en producción, no antes: hasta entonces IKATZ cierra a mano.
- **Información, Informes y Empleados pasan a leer lo cobrado** en vez de lo pedido en las mesas.

## 4 · De dónde salen los datos (P2 y P3)

- **Con Pro, de las mesas de Estook TPV**: cada plato pedido y no quitado de las cuentas liberadas, con su precio
  congelado, su camarero y sus horas (`linea_de_cuenta`). Con el cobro (T7), de lo cobrado.
- **Con Esencial, de los cierres**: las cuatro cifras siempre, y los platos si el cierre los trae (el CSV de su TPV).
  Empleados, la cocina y lo que se tuerce **solo con Pro**: sin Estook TPV no hay camarero ni tiempos en cada venta.
- **El margen** es el precio sin IVA menos el coste de su escandallo; un plato sin escandallo no se inventa.
- **El tiempo de la cocina**, de que el pase se marcha a que se tacha; **solo si la cocina tacha en pantalla**.

## 5 · P1 · Lo del alta y Ajustes, construido (rama `la-pausa-del-8-nov`, sin migración)

| Punto | Lo que hay                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Almacén › Movimientos › Historial: **Semana · Mes · 3 meses · 6 meses · Año**, en botones (`Segmentado`, nuevo en `@estook/ui`)                                                                                    |
| 2     | Consumo › Food cost real: **Semana · Mes · Trimestre · Inventarios**, con flechas para ir atrás (`el_food_cost_real` acepta `semana` con `dia` y `trimestre`)                                                      |
| 9     | La letra **«Automática»**, la de fábrica: pequeña en el teléfono y normal en la tablet y el ordenador; las cifras grandes, un escalón menos en el teléfono                                                         |
| 7     | **Ajustes › Tu local › Datos del local** (el formulario del alta, con «Rellenar desde Google») y **Organización › Nombre del negocio** (`cambiar_nombre_del_negocio`)                                              |
| 8     | En el alta, **«Busca tu local en Google»** rellena las casillas (`elegir_mi_local_de_google` devuelve `casillas`, con `addressComponents` y `regularOpeningHours.periods`); **la hora de corte ya no se pregunta** |
| 5     | **«¿Cuántos locales tienes?»** con − y + en «Elige tu plan»; `empezar_a_pagar` cobra esos; en el alta se les pone nombre, y **«Solo tengo estos»** baja la cuota (`ajustar_mi_cuota_a_mis_locales`)                |
| 4.1   | Con Pro, el final del alta y Ajustes › Conexiones dicen **«Tus ventas entran solas con Estook TPV»**, con la descarga para Windows; el Panel y el cierre no preguntan                                              |
| 6     | Estook TPV: **«Continuar con Google»** debajo de «Entrar»; en la caja para Windows, el código sacado en Estook (**Ajustes › Conexiones › «Vincular un aparato»**, `sacar_codigo_desde_estook`)                     |

### Lo que decidió la IA al construirlo

1. **Google en la caja para Windows, con el código y no con un QR.** La maqueta enseñaba un QR en la caja para entrar con el móvil. Se ha hecho al revés y con lo que ya había: el código de siempre (6 cifras, 10 minutos, un uso) **se saca en Estook, en el móvil**, y se escribe en la caja. Es lo mismo para quien lo usa, no abre ninguna puerta nueva que atacar, y sirve para cualquier aparato.
2. **«Solo tengo estos» descuenta, no devuelve dinero**: Stripe prorratea la bajada como saldo a favor en la siguiente cuota. La maqueta decía «se devuelve»; la pantalla dice «se descuenta de tu siguiente cuota». Y **la cuota ya no baja sola al crear un local**: solo sube.
3. **Hasta diez locales al pagar** (lo que llega Cadena); con más, «escríbenos a hola@estook.com».
4. **La hora de corte, sin preguntar**: las cinco, o una hora después del último cierre de madrugada que diga Google si es a las cinco o más tarde (como mucho las once). Se cambia plegada en el alta y en Datos del local.
5. **Lo de Google pisa lo escrito en las casillas, pero no se guarda hasta pulsar el botón**: se ve antes. Elegir el local en el alta lo enlaza con su ficha y pone su ubicación para fichar, como en Ajustes.
6. **La letra «Automática» es CSS** (`data-letra="auto"`), no JavaScript: girar la tablet no avisa a nadie. **Estook TPV sigue en «Normal»**, que es con la que se probó el servicio en el móvil (R2).
7. **Sin el dato del plan** (la API sin desplegar), se sigue preguntando cómo entran las ventas, como antes.
8. **La gráfica de las ocho semanas del food cost** que enseñaba la maqueta **no se ha hecho**: cada semana es el cálculo entero del almacén. La de las semanas de ventas va en Informes (P2).

**Para Richi**: apuntar en el cliente de OAuth de Google las vueltas de Estook TPV (`https://estook.com/tpv/` y `https://www.estook.com/tpv/`); sin eso, «Continuar con Google» en el TPV dice que Google no deja. Los pasos, en [`pasos-de-la-pausa-del-8-nov.md`](../pasos-de-la-pausa-del-8-nov.md).

## 6 · P2 · Información e Informes, construido (rama `la-pausa-del-8-nov-p2`, migración 0112)

| Punto | Lo que hay                                                                                                                                                                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | **Servicio › Jornadas › Información** (antes «En marcha»): Día · Semana · Mes con flechas; cuatro cifras frente a lo de antes; **Sale más · Factura más · Deja más**, de comida, bebida o todo; por sección; lo que pide atención; y plegada, **tu carta en cuatro** |
| 3.1   | **Negocio › Informes**: cuatro cifras arriba (sin sus líneas); los objetivos, plegados; **cuándo se vende** (por hora o por día y hora), **la cocina**, **lo que se tuerce** y **las semanas**                                                                       |
| —     | En el TPV, **anular una mesa ofrece tres motivos de un toque**: «Se fueron sin pedir», «Se fueron esperando», «Se abrió por error»                                                                                                                                   |

**Por dentro**: dos funciones de solo lectura de la migración 0112 (`las_lineas_vendidas` y `las_mesas_del_servicio`), que dan las mesas a quien ve las ventas de ese local, y dos consultas, `lo_que_se_vende` y `el_servicio_por_dentro`. API 127/357.

### Lo que decidió la IA al construirlo

1. **Hasta T7, lo vendido es lo pedido y no quitado de las mesas que no se anularon**, en la jornada en que se liberó la mesa. Con el cobro, lo cobrado.
2. **De dónde sale**: de las mesas si las hay en el periodo; si no, de los cierres de caja (sus totales y, si el CSV los trae, sus platos). La pantalla lo dice.
3. **Sin IVA con el tipo de restauración del local** (el 10 % si no se sabe); **el ticket medio, con IVA**, por mesa servida, que es como lo paga el cliente.
4. **Un menú cuenta como un plato**, con el coste de los platos que lleva dentro; esos platos suman sus raciones y su suplemento.
5. **Tu carta en cuatro, como Kasavana y Smith**: popular desde el 70 % de lo que toca a cada plato, y «deja mucho» desde el margen medio ponderado; **sin escandallo, el plato no se clasifica**, y con menos de cuatro no se compara.
6. **«Tarde» son más de 20 minutos, fijo.** La maqueta decía que se cambiaba con un toque en la tarjeta: no se ha hecho, para no añadir un ajuste más (un compañero, no un policía). Si Richi quiere otro número, es una línea.
7. **De «En marcha» se queda lo que no estaba en el Panel**, en una línea arriba de Información cuando se mira hoy: si el día está abierto o cerrado, cuánto queda, el día de antes sin cerrar y «Cerrar el día».
8. **En Informes, las tres frases solo van en el correo de los lunes**, y sin mesas de Estook TPV, una sola tarjeta lo dice y quedan las semanas, que salen de los cierres.
9. **«Los que más tardan»**, solo con platos que han salido al menos tres veces: con uno solo, una noche mala no es un plato lento.

## 7 · P3 · Empleados, construido (rama `la-pausa-del-8-nov-p3`, migración 0113)

**Servicio › Empleados**, entre Jornadas y Ventas: el equipo de mayor a menor **por ventas o por € la hora**, con horas fichadas, lo vendido y su objetivo en una barra; al tocar a alguien, su ficha con lo que más vende. **Los objetivos, en su botón**, con **General** (los € por hora de la sala) y **Por empleado** (uno distinto para quien haga falta), y **«Que cada uno vea el suyo»**. La lista solo la ve quien ve las ventas; **cada camarero, solo lo suyo**, y nada si el gerente lo apaga.

**Por dentro**: la tabla `objetivo_de_venta` y la función `lo_que_he_vendido` (0113); la consulta `la_venta_de_cada_uno` y el comando `guardar_los_objetivos_de_venta`. API 128/358.

### Lo que decidió la IA al construirlo

1. **El objetivo de cada uno sale de sus horas fichadas**, no de las del horario como decía la maqueta: así una baja o un cambio de turno no le cuentan en contra, y la barra avanza con lo que de verdad ha trabajado.
2. **Las ventas de cada uno son las de las mesas que lleva** (de quien la lleva al final; si se la pasan, del nuevo), sin IVA. Con el cobro (T7), lo que cobra.
3. **El general, 45 €/h al abrirlo la primera vez**, el de la maqueta: es solo lo que sale escrito hasta que se guarda.
4. **Solo se pone objetivo a gente de ese local**: lo cazó la prueba que ataca la API desde otro negocio, que podía poner uno, en su local, a nombre de alguien de Bar Centro. Lo cierran el comando y la base.
5. **Sin Estook TPV, Empleados dice que es de Pro** en vez de enseñar una lista vacía.
