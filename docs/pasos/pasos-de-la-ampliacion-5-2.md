# Pasos · La Ampliación 5 · 2 · La web de reservas

> Lo que hay que probar después de fusionar, **migrar** (de la 0132 a la 0134) y **desplegar la API**.
> La decisión, en la [0153](../decisiones/0153-la-ampliacion.md), secciones 6 y 20. Cuando acabes, di en el chat «la
> 42, bien» o en qué paso falla.

## Antes de empezar

- Las reservas encendidas en la caja de IKATZ (la prueba 41) y la sala dibujada.
- Tu móvil, como si fueras un cliente, y un correo tuyo a mano.

## 1 · Los ajustes (en la caja, con tu PIN)

1. **Engranaje › Reservas**. De arriba abajo: la tarjeta violeta con el interruptor encendido, **«Tu web de
   reservas»** con `estook.com/reservar/…` y **«Copiar el enlace»** (al tocarlo dice **«Copiado ✓»**), **«Cuándo se
   reserva»**, **«Las mesas»** y **«Avisos al cliente»**.
2. En **«Cuándo se reserva»**, cada servicio lleva **L M X J V S D**: si algún día no abrís, tócalo (queda tachado).
   Debajo, **«Por internet, hasta cuánto antes»**: elige el que uséis (de fábrica, **2 h**).
3. En **«Avisos al cliente»**, marca **«Avisar por correo»** y **«Pedir que confirmen»** (30 minutos).
4. Al cambiar algo sale abajo **«Tienes cambios sin guardar»** con **Guardar**. Tócalo: sale **«Guardado»**.
5. En **«Las mesas»**, toca **«Qué mesas se juntan y cuáles salen en la web»**: en el editor, toca la barra y elige
   **«No sale»**.

## 2 · Reservar como un cliente (en tu móvil)

1. Abre el enlace que copiaste (pégatelo por WhatsApp). Arriba, **«¿Ya tienes reserva aquí?»** con dos botones
   grandes, **Confirmarla** (verde) y **Cancelarla** (rojo).
2. Toca **2**, un día y una hora. Solo salen horas con mesa libre y a partir de lo que elegiste en el paso 1.2. El día
   que no abrís sale **«Cerrado»**.
3. Pon tu nombre, tu teléfono y tu correo, y **Reservar**. Sale **«Reserva hecha»** con el día y la hora, y
   **«Confírmala antes de las …»**. **No sale ningún código.**
4. En tu correo llega **«Tu reserva en IKATZ»** con el botón **«Confirmar o cancelar»**.
5. **En la caja**, sin tocar nada, sale **«Reserva nueva · web»** y tu reserva en Reservas con **«web»**. Nunca en la
   barra.

## 3 · Confirmar y cancelar (en tu móvil)

1. En el correo, toca **«Confirmar o cancelar»**: se abre tu reserva sin teclear nada. Toca **«Sí, confirmo que
   vamos»**: dice **«¡Confirmada! Te esperamos»**, y en la caja, **«web · confirmó»**.
2. Abre otra vez el enlace de reservar, toca **Cancelarla** y escribe tu teléfono (con o sin +34): sale tu reserva con
   tu nombre de pila. Toca **«Sí, cancelar esta reserva»** (rojo): dice **«Reserva cancelada»**.
3. En la caja, el aviso **«Cancelada · …»** y en la lista **«La canceló»**; la mesa queda libre. A tu correo llega
   **«Has cancelado tu reserva en IKATZ»**.

## 4 · En Estook (el móvil o el ordenador, con tu cuenta)

1. **Servicio › Reservas**: arriba, la tarjeta violeta **«Tu web de reservas»** con el enlace; debajo, las reservas del
   día con cuántas son, los comensales y cuántas por internet. Las flechas cambian de día.
2. Toca **«¿Tienes web propia? Pon tus reservas en ella»**: elige **«Un botón «Reservar mesa»»** o **«Dentro de tu
   página»**, y un color (de entrada, el de vuestra marca). La muestra cambia con el color.
3. **«Copiar el código»** y pégalo en vuestra web (en Wix o WordPress, en un bloque de «HTML»). Sale el botón o las
   reservas con vuestro color, y abajo solo **«Reservas con estook.com»**. Reserva desde ahí: llega a la caja igual.

## 5 · La que no se confirma (opcional, tarda)

1. Haz otra reserva y **no la confirmes**.
2. Pasada la hora de «Confírmala antes de las …», en la caja sale **«Cancelada · …»** con **«No confirmó a tiempo»**, en
   la lista **«Se canceló sola»**, y a tu correo llega que se ha cancelado.

**Si falla:** dime en qué paso y qué decía la pantalla o el correo.
