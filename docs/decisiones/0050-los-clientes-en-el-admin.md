# 0050 · Los clientes en el admin: ver todo de Stripe, tres gestos con motivo, el correo con doble confirmación y la actividad de cada noche

**Fecha:** 26 de septiembre de 2026
**Estado:** decidido. Es **A2**, con la migración `0049`
**Cambia:** la pestaña «Cuentas» de E2 ([0048](0048-el-pago-con-stripe.md)) pasa a ser
**Clientes**, y es lo primero que se ve al entrar en el admin
**Precisa:** la [0041](0041-el-panel-de-administracion.md) y el apartado 2 de
[`panel-de-administracion.md`](../panel-de-administracion.md)

## Lo que contestó Richi (25-sep)

1. **La suscripción:** el admin **ve todo lo que dice Stripe** y hace **tres gestos, con
   motivo**: alargar la prueba, marcar de la casa y cancelar al acabar el periodo. Lo
   demás —devolver un cobro, cambiar la tarjeta— se hace en Stripe, con el enlace
   «Abrir en Stripe» de la ficha.
2. **Cambiar el correo de acceso entra en A2**, con doble confirmación.
3. **La actividad se calcula cada noche** con el reloj.

## Lo que se decide

- **El cliente es la organización.** La ficha comercial (responsable, teléfono, correo de
  contacto, tipo) es nuestra; el nombre es del cliente y se cambia con motivo, que el
  cliente ve en su auditoría.
- **Contrato y actividad, separados.** La actividad es una **foto por cliente y día**
  (`plataforma.uso_diario`) que hace el reloj; «Calcular ahora» la hace en el momento.
  **Cuenta el trabajo, no montar la cuenta**: crear la organización, el local, las
  categorías, entrar o terminar el alta no hacen «activo» a nadie. Hay una quinta
  actividad, **«Entra sin apuntar»**: entra, pero no trabaja con Estook.
- **Se busca por nombre, código, correo y teléfono.** El CIF no existe todavía en la
  organización: se buscará por él cuando exista.
- **De la casa** solo a quien Stripe no está cobrando: primero se cancela al acabar.
  Quitárselo lo deja pendiente de pago.
- **El correo de acceso**: el admin total lo pide con motivo y su código otra vez; llega
  un enlace al correo **nuevo** para confirmarlo y otro al **de ahora** para pararlo, de
  un solo uso y 24 horas; la base guarda solo sus huellas. Abrir el enlace no hace nada:
  hay que pulsar, porque los antivirus del correo abren los enlaces solos. Confirmarlo
  cierra las sesiones de esa persona.
- **Exportar** pide el código otra vez, queda en la auditoría y sale en CSV con punto y
  coma y la marca UTF-8, que es lo que abre bien un Excel en español; las celdas que
  empiezan por `= + - @` se neutralizan.
- **Todo deja rastro dos veces**: en la auditoría del admin y, si toca al cliente, en la
  suya («por: Estook», con el motivo).

## Lo que no entra, y dónde está

- Vendedores, códigos y origen del cliente: **A3**. El tablero de ventas: **A4**.
- Plan y cuota escritos a mano: no hacen falta, **Stripe es el dueño**.
- Entrar a los datos de un cliente con su permiso (Roles 4.3): **M26**.
