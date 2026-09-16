# 0041 · El panel de administración: el cliente es la organización, y el admin solo es dueño de lo comercial

**Fecha:** 16 de septiembre de 2026
**Estado:** decidido. **A1 en producción** (migración `0037`, #53; su repaso, aparte);
A2 a A4 antes de M8, y se termina en M26
**Detalle entero:** [`docs/panel-de-administracion.md`](../panel-de-administracion.md)
**Precisa:** la sección 4 de [Roles y administración](../maestros/Estook-Roles-y-Administracion.md)

## Lo que dijo Richi

> «Admin de Estook donde solo entrarán los que tengan rol admin. […] Ese ya dentro
> podrá añadir a admin a otros.» Y propuso clientes activos e inactivos en una única
> entidad `customers`, una ficha tipo CRM, vendedores con código de referido e
> historial de asignaciones, un tablero de ventas y una auditoría de cada cambio.
> «Si se puede mejorar, optimizar o hacer mucho mejor, hazlo.»

## Lo que se decide

### Uno · Ser admin es de la plataforma, no de una organización

Una tabla `plataforma.administrador` con la persona y su **nivel** (total, comercial,
soporte, vendedor). No es un rol de la matriz de M1: esos roles viven **dentro** de
una organización, y un admin no pertenece a ninguna por serlo. Así, **ningún rol de
cliente llega nunca al admin**, por alto que sea.

Se entra con la misma cuenta (0010), **solo con contraseña**, **con segundo factor
obligatorio** y **sesión de 8 horas**, en `estook.com/admin/`. Y **las dos sesiones no se cruzan**: la del admin no vale para la app, ni la de la app para el admin, aunque sean de la misma persona; lo comprueba el despachador en cada petición, junto con que el acceso siga vivo.

### Dos · El cliente es la organización que ya existe

No se crea una tabla `customers` que copie el nombre, el CIF y el correo. **Lo
comercial vive en `plataforma`** —contrato, plan acordado, notas, origen, vendedor— y
**lo del restaurante sigue siendo del restaurante**. Un dato con dos dueños acaba con
dos valores.

### Tres · Contrato y actividad son dos cosas

**El contrato** (pendiente, prueba, activo, impago, pausado, suspendido, baja) se
guarda como **historial de cambios**, no en columnas de fecha. **La actividad**
(sin estrenar, activo, bajando, dormido) **se calcula** de lo que el cliente hace. «Paga
y no lo usa» es la combinación de las dos, y es la señal que más importa.

### Cuatro · Quién captó y quién lleva salen del historial

La **llegada** (cliente + código) es inmutable y dice quién lo captó. La **asignación**
tiene fechas, y **solo puede haber una abierta** por cliente, con un índice. No hay
columnas `vendedor_original` ni `vendedor_actual`: serían tres sitios para lo mismo.

Un vendedor tiene **varios códigos**, y un código **no se reutiliza jamás**.

### Cinco · El admin escribe en lo comercial, nunca en el restaurante

Roles 4.8 decía «no permite escribir en los datos de un cliente». Se precisa: **no
escribe en los datos del restaurante** (inventario, compras, personas, ventas). El
contrato, el plan y las notas **son nuestros** y se editan. El nombre y el CIF, que
son del cliente, se editan **con motivo** y el cambio **aparece en la auditoría del
cliente**. El correo de acceso tiene **su propio proceso de doble confirmación**,
porque cambiarlo es quedarse con la cuenta.

### Seis · Todo cambio se audita, y exportar también

`plataforma.auditoria`, **solo se añade**, una fila por acción con el antes, el
después, el motivo, la IP y la correlación. Exportar un CSV se audita y pide el código
otra vez.

### Siete · Las cifras las calcula el servidor, y el dinero real es de Stripe

Conversión y retención son **dos cifras distintas** con su definición escrita.
Las comisiones son **sobre lo cobrado**. Hasta M26, plan y cuota se escriben a mano **y
lo dicen**; cuando llegue Stripe, **Stripe es el único dueño**.

## Lo que se descartó

- **Una tabla `customers` propia.** Duplicaba la organización.
- **Un único estado del cliente.** Mezclaba si paga con si lo usa.
- **Un rol «admin» en la matriz de M1.** Metía a la plataforma dentro de una
  organización, y una política mal escrita habría dejado a un gerente llegar al admin.
- **`admin.estook.com` ya.** GitHub Pages sirve un solo dominio propio por repositorio.
  Se reconsidera en M27; la seguridad la pone el servidor, no la dirección.
- **Usar la contraseña que se escribió en el chat** para la primera cuenta. Se genera
  una de un solo uso con `bd:dar-admin`, como `bd:cuenta-de-verdad`.
