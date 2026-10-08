# El panel de administración de Estook

**Fecha:** 16 de septiembre de 2026
**De dónde sale:** la propuesta de Richi del 16 de septiembre —clientes, ficha tipo CRM,
vendedores con código, historial de asignaciones, tablero de ventas y auditoría—,
mejorada donde se podía, y la sección 4 de
[Roles y administración](maestros/Estook-Roles-y-Administracion.md), que ya decía
cómo se entra en los datos de un cliente.
**La decisión:** [0041](decisiones/0041-el-panel-de-administracion.md).

> Es **nuestra** herramienta, no la de los clientes. Sirve para saber quién usa
> Estook, quién lo trajo, quién se está yendo y cuánto nos deja. **Nunca** para
> tocar el almacén, las personas o las ventas de un restaurante.

---

## Cómo va · qué hay y qué falta

**En `estook.com/admin/` están la puerta (A1), los clientes (A2, [decisión
0050](decisiones/0050-los-clientes-en-el-admin.md)), la oferta de prueba (E1) y los
vendedores (A3, [0076](decisiones/0076-a3-los-vendedores.md)), en producción.** Las
ventas, **todavía no**: son A4, con su plan y cuatro preguntas en
[`a4-ventas.md`](a4-ventas.md). Actualizado el 8 de octubre de 2026.

| Qué                                                                                         | Cómo está                                                                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Entrar con contraseña y segundo factor obligatorio, sesión de 8 h                           | **Hecho y en producción** (A1, #53)                                                              |
| Sesión del admin y de la app separadas; el acceso se mira en cada petición                  | **Hecho y en producción**                                                                        |
| Administradores: dar acceso total y quitarlo, con el código otra vez                        | **Hecho y en producción**                                                                        |
| Auditoría del admin: quién, qué, cuándo, motivo y dirección IP                              | **Hecho y en producción** (el aparato se guarda, no se enseña)                                   |
| `bd:dar-admin`: dar el primer acceso, y rescatar (clave nueva, segundo factor)              | **Hecho y en producción** (rescatar llegó con el repaso, #54)                                    |
| El catálogo del sistema de diseño detrás de la puerta                                       | **Hecho y en producción**                                                                        |
| **Niveles** comercial, soporte y vendedor                                                   | Existen en la base; **no se pueden dar**. Vendedor, descartado (0076)                            |
| **Clientes**: lista, filtros, búsqueda, CSV, ficha, contrato, actividad, notas, editar      | **Hecho en A2** (#74). Sin CIF: la organización no lo tiene                                      |
| Copiar a la auditoría del cliente lo que el admin haga sobre él                             | **Hecho en A2**                                                                                  |
| **Vendedores y códigos**: enlace, QR, `?ref=`, llegadas, descuento del primer mes, cifras   | **Hecho en A3** y en producción (0058). Sin panel ni comisiones (0076)                           |
| **Ventas**: tablero y gráficas                                                              | **Falta · A4**: su plan, en [`a4-ventas.md`](a4-ventas.md). La foto diaria del uso ya la hace A2 |
| Borrar solas las IP de más de dos años                                                      | **Falta** · necesita el reloj (R); se cierra en M27                                              |
| Cambiar el correo de acceso de un cliente con doble confirmación                            | **Hecho en A2**                                                                                  |
| Suscripciones: ver todo de Stripe y tres gestos (alargar, de la casa, cancelar al acabar)   | **Hecho en A2**. Las comisiones se pactan fuera (0076)                                           |
| Entrar a los datos de un cliente con su permiso (Roles 4.3), costes, integraciones, soporte | **M26**                                                                                          |
| `admin.estook.com` en vez de `estook.com/admin/`                                            | **M27**, si cambia el alojamiento                                                                |

---

## 0 · Lo que cambia respecto a la propuesta, y por qué

La propuesta era buena y casi todo entra. Estos son los cambios, uno por uno:

| Se propuso                                                          | Se hace                                                                                 | Por qué                                                                                                                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una tabla `customers` con nombre, email, CIF, teléfono…             | **El cliente es la organización que ya existe.** El admin guarda solo lo comercial      | El nombre y el CIF ya viven en la organización y los edita el cliente. Copiarlos daría dos valores distintos a los tres meses (regla 16: un dato con dos dueños acaba con dos valores) |
| Un estado: activo, inactivo, suspendido, pendiente, cancelado       | **Dos cosas separadas: el contrato** (lo que ha pagado) **y la actividad** (lo que usa) | «Inactivo» mezclaba dos preguntas. Un cliente puede pagar y no entrar —el que se va a ir— o entrar y no pagar —el de prueba—. Con un solo estado, los dos son «activo»                 |
| `deactivated_at`, `subscription_cancelled_at`… en columnas          | **Un historial de cambios de estado**, con fecha, quién y por qué                       | Cinco columnas guardan la última vez; el historial guarda todas. «Se dio de baja, volvió y se volvió a ir» no cabe en una columna                                                      |
| `original_seller_id` y `current_seller_id` en el cliente            | **Quién lo trajo es el código con que llegó.** Nadie «lleva» al cliente (0076)          | El vendedor solo trae el cliente. Una sola fila, la llegada, que cambia un admin con motivo                                                                                            |
| Un código por vendedor                                              | **Varios códigos por vendedor**, cada uno con su campaña                                | «JUAN26» y «JUAN-FERIA» dicen de dónde vino cada cliente, y un código se puede cerrar sin cerrar al vendedor                                                                           |
| Conversión = activos / captados (72 %)                              | **Dos cifras distintas: conversión y retención**                                        | 31 de 43 siguen activos es **retención**. **Conversión** es cuántos de los que llegaron con el código acabaron pagando. Llamar igual a las dos hace que ninguna sirva                  |
| Comisiones sobre la facturación                                     | **Se pactan fuera de Estook** (Richi, 7-oct · 0076)                                     | Estook enseña las cifras de cada vendedor; lo que se le paga, y cómo, lo decidís vosotros                                                                                              |
| Una fila de auditoría por campo                                     | **Una fila por acción**, con el antes y el después de todos los campos y el motivo      | Cambiar la dirección toca cuatro campos: son un cambio, no cuatro. La pantalla lo enseña campo a campo igual                                                                           |
| El administrador edita el email del cliente                         | **El correo con el que se entra se cambia con doble confirmación**, nunca de un plumazo | Cambiar el correo de acceso es **quedarse con la cuenta**. Es la forma más habitual de robarla, y tiene que costar más que un campo                                                    |
| «Uso de Estook»: productos, escandallos, cartas, documentos, Fogón… | **Solo lo que existe.** Escandallos, cartas, documentos y Fogón aparecen con su módulo  | Un «0 escandallos» cuando no se pueden crear dice que el cliente no los usa, y es mentira (regla 28)                                                                                   |
| Métricas calculadas al abrir                                        | **Una foto diaria del uso**, que el reloj deja hecha de madrugada                       | Contar productos, pedidos y mermas de mil clientes cada vez que se abre la lista tumba la base. La ficha de **un** cliente sí puede contar en directo                                  |

Y lo que se añade porque la propuesta no lo cubría:

- **Segundo factor obligatorio y sesión de 8 horas** para entrar en el admin.
- **Volver a pedir el código** antes de lo delicado: cambiar un correo, dar o quitar
  un admin, exportar.
- **Exportar también se audita**: sacar un CSV con los teléfonos de todos los
  clientes es la acción más delicada de todo el panel.
- **Lo que un admin hace sobre un cliente lo ve ese cliente** en su auditoría, como ya
  decía Roles 4.3.
- **El origen del cliente** (orgánico, anuncios, referido, directo) se guarda al
  llegar, con las marcas de la campaña, para que el tablero de ventas no se invente
  el canal.

---

## 1 · Quién entra y cómo

> **Construido en A1** (rama `m7-admin-la-puerta`, migración `0037`). Lo que sigue
> es cómo funciona hoy.

### La puerta

- **Dónde:** `estook.com/admin/`. Un subdominio `admin.estook.com` no se puede servir
  desde GitHub Pages con el mismo repositorio; se mueve en M27 si cambia el
  alojamiento. **La seguridad no depende de la dirección**: la decide el servidor.
- **Con la misma cuenta de siempre** (0010): correo y contraseña. **No con PIN.**
- **Segundo factor obligatorio.** Quien no lo tiene, lo monta en la primera entrada
  antes de ver nada.
- **La sesión dura 8 horas**, no 30 días como en la app.
- **Ser admin es un permiso de la plataforma, no un rol de una organización.** Un
  admin no pertenece a ningún restaurante por serlo, y un gerente no llega nunca al
  admin por muy alto que sea su rol.
- **La app y el admin no se abren el uno al otro.** Entrar en el admin abre otra clase
  de sesión, marcada en la base: no vale para nada de la app, y una sesión de la app no
  vale para el admin, aunque sea de la misma persona. Solo lo que es de la persona
  —salir, su contraseña, su segundo factor— vale en los dos sitios.
- **El acceso se mira en cada petición.** Quitárselo a alguien le cierra la puerta en su
  siguiente paso, aunque tenga el admin abierto.
- **La sesión se va al cerrar la pestaña** (se guarda en `sessionStorage`): nadie
  necesita el admin abierto en un portátil que se queda en una mesa.
- **A quien no es admin se le contesta lo mismo que a una contraseña mal**, para que
  nadie pueda averiguar qué correos administran Estook.
- **Quien tiene acceso al admin no se puede quitar el segundo factor** desde la app.
- **Con la contraseña de un solo uso sin cambiar, no se lee nada del admin**, ni
  llamando a la API a pelo: esa contraseña la ha visto quien la dio.
- El catálogo del sistema de diseño, que vivía suelto en `/admin/`, **está dentro**,
  detrás de la puerta.

### La primera cuenta

`estookapp@gmail.com`, creada con un comando nuevo, `.\estook.cmd bd:dar-admin`,
**igual que `bd:cuenta-de-verdad`**:

1. Si el correo no tiene cuenta, la crea con **una contraseña de un solo uso** que
   enseña una vez por pantalla, y la cuenta nace con **«debes cambiarla»**.
2. **Si ya tiene cuenta, no le toca la contraseña**: entra con la suya.
3. Le da acceso total y lo apunta en la auditoría, a nombre de «la consola».
4. **No monta el segundo factor**: lo monta la persona en su móvil la primera vez que
   entra, antes de ver nada, para que el secreto no pase por ninguna otra mano.

**Y rescata a quien se ha quedado fuera** —el admin no tiene «he olvidado mi
contraseña» mientras no haya correo—:

- `.\estook.cmd bd:dar-admin correo --nueva-clave`: una contraseña de un solo uso.
- `.\estook.cmd bd:dar-admin correo --sin-segundo-factor`: borra el segundo factor,
  para volver a montarlo al entrar (móvil y códigos de respaldo perdidos).

Las dos cierran todas sus sesiones, quedan en la auditoría y **solo valen con quien ya
es admin**.

**La contraseña que se escribió en el chat no se usa.** Es la regla que ya tiene el
proyecto: lo que pasa por un chat se da por visto (lo mismo se hizo con las claves de
Google). Por eso el comando genera una y obliga a cambiarla.

### Más admins

Desde dentro, **Administradores → Dar acceso**: correo, nombre y **el código del
segundo factor otra vez**. Si esa persona ya tiene cuenta en Estook, se le da el acceso
y entra con la suya; si no, se crea con una contraseña de un solo uso que se enseña una
vez. A una persona de ejemplo no se le da nunca.

**Quitar el acceso** pide un motivo y el código otra vez. **Nadie se quita el suyo a sí
mismo**, y **nunca se queda Estook sin un admin total**: lo impide el comando y, por
debajo, la base. Los quitados se quedan en la lista como historia, con quién y por qué.

Todo sale en **Auditoría**, dicho en una frase: quién entró, quién dio o quitó acceso a
quién, cuándo, con qué motivo y desde qué dirección.

**Los niveles**, pensados desde ya aunque **hoy solo se puede dar el total**: ofrecer
los otros sería dar un acceso que no abre nada.

| Nivel         | Qué hace                                                           | Cuándo se estrena |
| ------------- | ------------------------------------------------------------------ | ----------------- |
| **Total**     | Todo, incluido dar y quitar admins                                 | **Ya**            |
| **Comercial** | Clientes y vendedores, sin exportar ni ver cobros                  | Cuando haga falta |
| **Soporte**   | Ver clientes y su uso; notas; pedir acceso a los datos (Roles 4.3) | M26               |
| **Vendedor**  | ~~Solo su panel~~                                                  | **Descartado**    |

**Los vendedores no entran en Estook** (Richi, 7-oct · [0076](decisiones/0076-a3-los-vendedores.md)):
el nivel Vendedor sigue en la base y no se da nunca.

---

## 2 · Clientes

### La lista

Una sola lista, **con pestañas que son filtros guardados**: Todos · En prueba ·
Pagando · Se están yendo · De baja. Debajo, los filtros:

- **Buscar** por nombre del local o de la organización, correo, teléfono, CIF o
  código interno. Busca **en el servidor**, nunca dentro de lo ya cargado (regla 51).
- **Contrato:** pendiente, prueba, activo, impago, pausado, baja.
- **Actividad:** activo, bajando, dormido, sin estrenar (ver abajo).
- **Alta** y **último acceso**, por tramos.
- **Vendedor que lo lleva** y **código con que llegó**.
- **Plan**, **origen** y **tipo** (independiente, grupo, cadena).
- **Ordenar** por cualquier columna, **y el orden lo hace el servidor**.
- **Exportar** a CSV (y Excel), con lo filtrado. **Queda en la auditoría**, y pide el
  código de nuevo.

**Las columnas**, las justas:

| Cliente       | Contrato | Actividad  | Alta     | Último acceso | Plan  | Lleva | Cuota/mes |
| ------------- | -------- | ---------- | -------- | ------------- | ----- | ----- | --------- |
| Restaurante X | Activo   | 🟢 Activo  | 12/05/26 | Hoy           | Pro   | Juan  | 129 €     |
| Restaurante Y | Activo   | 🟠 Bajando | 03/02/26 | hace 9 días   | Basic | —     | 39 €      |
| Restaurante Z | Baja     | ⚫ Dormido | 03/01/26 | hace 94 días  | Basic | Pedro | —         |

Van **de 50 en 50** con «Ver más»: con mil clientes, la lista no puede cargarlos todos.

### Contrato y actividad

**El contrato** se guarda, y cambia solo por un motivo:

```
pendiente ─▶ prueba ─▶ activo ─▶ impago ─▶ suspendido ─▶ baja
                          │  ▲                              │
                          ▼  │                              ▼
                        pausado                    (vuelve) activo
```

Cada cambio es **una fila del historial**: de qué a qué, cuándo, quién (una persona
o Stripe) y por qué. De ahí salen todas las fechas que la propuesta ponía en columnas:
alta, inicio del plan, baja, vuelta.

**La actividad** no se guarda: **se calcula** cada noche con lo que hace el cliente.

| Actividad        | Cuándo                                                                               |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Sin estrenar** | Más de 7 días de alta y menos de 10 productos                                        |
| **Activo**       | Alguien ha entrado en los últimos 7 días **y ha apuntado algo**                      |
| **Bajando**      | Las entradas de las dos últimas semanas son menos de la mitad que las dos anteriores |
| **Dormido**      | Nadie ha entrado en 14 días                                                          |

**Entrar no basta para contar como activo**: alguien que abre el Panel y se va no usa
Estook. Y así sale sola la señal que pedía Richi —«lleva pagando tres meses y apenas lo
usa»— como **contrato activo + actividad dormido**, arriba del inicio.

Junto a eso, siempre a la vista: **días como cliente** y **días desde el último acceso**.

### La ficha

Al abrir un cliente, una ficha con **pestañas**, en este orden:

**Resumen.** Lo que hay que saber en diez segundos: contrato y actividad con sus días,
plan y cuota, quién lo lleva y quién lo captó, últimas notas, y **las alertas del
cliente** («dormido desde hace 12 días», «no ha terminado el alta», «pago fallido»).

**Datos.**

- De la organización (**los edita el cliente**; el admin, con motivo y auditoría):
  nombre, CIF/NIF, dirección fiscal, locales con su ciudad y país.
- Del contrato (**los edita el admin**): responsable del contrato, teléfono y correo de
  contacto comercial, tipo de cliente, plan, notas.
- Fijos: identificador interno, fecha de alta, código con que llegó, origen.

**Cuenta y personas.**

- El dueño de la cuenta: correo de acceso, **si lo ha verificado**, si tiene segundo
  factor, fecha de creación, último acceso, número de sesiones abiertas.
- Las personas del cliente **con su rol**, cuántas han entrado esta semana. **Sin sus
  datos personales** (Roles 4.8): nombre y rol, no teléfono ni horas.

**Suscripción.** Plan actual, cuota, inicio, próxima renovación, estado del pago,
periodo de prueba, historial de planes y de pagos, cancelaciones. **Hasta M26 no hay
Stripe**, así que el plan y la cuota **se escriben a mano y lo dice**: «acordado a
mano». Cuando llegue Stripe, **Stripe es el único dueño** y el campo deja de editarse.

**Uso.** Lo que el cliente hace con Estook, **solo de lo que existe hoy**:

| Hoy                                                   | Cuando exista su módulo             |
| ----------------------------------------------------- | ----------------------------------- |
| Productos, proveedores, pedidos, albaranes, facturas  | Escandallos (M9)                    |
| Mermas, inventarios, cierres de caja                  | Cartas (M10) · Documentos (M11)     |
| Personas con acceso, fichajes                         | Fogón: preguntas y propuestas (M22) |
| Entradas por semana, **qué apps no ha abierto nunca** | Conector del TPV (M18)              |

Cada cifra con **sus últimos 30 días frente a los 30 anteriores** y una línea de
semanas. **Y la última actividad**: qué y cuándo, sin el contenido.

**Actividad del admin.** Todo lo que los admins han hecho sobre este cliente: la
auditoría, filtrada.

**Notas.** Notas internas con autor y fecha. **Se añaden, no se editan**: se corrigen
con otra nota. Se pueden fijar arriba.

### Editar

**Lo que el admin edita directamente**, con auditoría:

- Del contrato: responsable, teléfono y correo comercial, tipo de cliente, plan y cuota
  (hasta Stripe), vendedor asignado, notas, estado del contrato.

**Lo que se edita con motivo escrito** y además llega a la auditoría del cliente:

- Nombre de la organización, CIF, dirección fiscal. Son del cliente, así que se le
  dice: «Estook cambió tu CIF de B123 a B124 · motivo: lo pidió por teléfono».

**Lo que tiene su propio proceso, y no es un campo:**

| Qué                                         | Cómo                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **El correo de acceso**                     | Se pide el cambio con motivo y el código del admin. Se manda un enlace al correo **nuevo** para confirmarlo y un aviso al **viejo** para pararlo. Sin Resend, no se puede |
| **Suspender o dar de baja**                 | Motivo obligatorio y confirmación. **Nunca corta a mitad de servicio** (M26): la suspensión entra a la hora de corte del local                                            |
| **Historial de pagos**                      | No se edita. Un error se corrige con un apunte nuevo que lo anula                                                                                                         |
| **Fecha de alta, identificador, auditoría** | No se editan nunca                                                                                                                                                        |

---

## 3 · Vendedores y códigos

> **Construido en A3** ([decisión 0076](decisiones/0076-a3-los-vendedores.md), migración
> `0058`). Richi lo simplificó el 7-oct: **el vendedor solo trae el cliente**, no entra en
> Estook, y **las comisiones se pactan fuera**. Lo que se escribió aquí el 16-sep —panel
> del vendedor, asignaciones, comisiones y liquidaciones— se descartó.

### El modelo

```
vendedor ──1:N──▶ código ──1:N──▶ llegada (el cliente que vino con él, y por dónde)
```

- **El vendedor**: nombre, teléfono, correo y notas. Se da de baja, no se borra.
- **El código**: `JUAN26`. **Único para siempre**, sin distinguir mayúsculas; un código
  cerrado **no se reutiliza**. Tiene su campaña y **su descuento del primer mes**, que no
  cambia. Se cierra, y cerrado no se abre.
- **La llegada**: con qué código vino el cliente y **por dónde** (vendedor, anuncios,
  buscadores, otra web o directo), con las marcas de campaña del enlace y solo el nombre
  de la web de la que venía. La apunta la base **en la misma transacción que crea la
  cuenta**; después, solo la cambia un admin, con motivo.

### Cómo llega un código

1. El vendedor reparte su enlace, `estook.com/?ref=JUAN26`, o su **QR**.
2. La portada enseña el descuento y **pasa el código a cada enlace** de la web. **No se
   guarda en el navegador**: pediría un aviso de cookies (0076, tres).
3. En «Crear cuenta» el código sale **ya escrito**; sin enlace, la casilla «¿Tienes un
   código de vendedor?» deja escribirlo. Uno que no vale se avisa y no frena nada.
4. **Manda el del registro**. Si el cliente se olvidó, lo pone un admin con motivo.

### El descuento

Un tanto por ciento del **primer cobro mensual** (el anual ya lleva dos meses gratis).
Sin prueba, va en la página de pago de Stripe; con prueba, **se pone cuando Stripe avisa de
que la prueba acaba**, para que caiga en el primer cobro de verdad. Los días de prueba
siguen siendo los de la oferta del admin.

### La ficha del vendedor

Sus códigos con su enlace y su QR, y **sus cifras**, con la misma cuenta que la lista de
Clientes: traídos (y este mes), pagan, en prueba, se están yendo, sin pagar, lo usan,
dormidos, lo que dejan al mes y cuánto llevan de media. Y la lista de sus clientes. **Todo
lo calcula el servidor**; los de ejemplo no cuentan.

## 4 · Ventas

El tablero, **con el periodo arriba** (hoy, 7 días, mes, trimestre, año) y cada cifra
con su flecha frente al periodo anterior:

```
CLIENTES                         ADQUISICIÓN (altas del periodo)
Total           1.284            Orgánico       421
Pagando           923  ▲ 31      Anuncios       283
En prueba          47            Referidos      391
Se están yendo     38  ▲ 6       Directo        189
De baja           276
                                 VENDEDORES
DINERO                           Activos         12
Cuota mensual  18.420 €  ▲ 4 %   Captados       391
Cobrado mes    17.960 €          Dejan al mes 9.840 €
Pérdida de clientes  2,1 %/mes
```

**Las gráficas**, cada una contestando una pregunta:

| Gráfica                                               | Pregunta                            |
| ----------------------------------------------------- | ----------------------------------- |
| Altas y bajas por semana, enfrentadas                 | ¿Crecemos o solo reponemos?         |
| Cuota mensual, con lo nuevo, lo perdido y lo ampliado | ¿De dónde sale el crecimiento?      |
| Clientes pagando                                      | ¿Cuántos tenemos?                   |
| Pérdida de clientes por mes de alta                   | ¿Los de qué mes aguantan peor?      |
| Captados y cuota por vendedor                         | ¿Quién trae clientes que se quedan? |
| Altas por origen                                      | ¿Qué canal funciona?                |
| Embudo: llegada → prueba → pago                       | ¿Dónde se pierden?                  |

**La pérdida de clientes** (churn) se define una vez: clientes que pasaron a baja en
el mes **entre** los que pagaban al empezar el mes. Y **la cuota perdida**, aparte:
perder un Basic no es perder un Pro.

**Los clientes de ejemplo no cuentan nunca** (`es_ejemplo`).

---

## 5 · La auditoría

**Todo lo que cambia algo en el admin deja una fila**, y **no se puede modificar ni
borrar**: lo impide la base de datos, como la auditoría de M1.

| Campo           | Qué guarda                                                    |
| --------------- | ------------------------------------------------------------- |
| Quién           | El admin, y su nivel en ese momento                           |
| Qué             | La acción: `editar`, `cambiar_estado`, `asignar`, `exportar`… |
| Sobre qué       | Cliente, vendedor, código, admin; y su identificador          |
| Antes y después | Los campos que cambiaron, con su valor anterior y el nuevo    |
| Por qué         | El motivo, **obligatorio** en lo delicado                     |
| Cuándo          | Con la hora del servidor                                      |
| Desde dónde     | IP y aparato                                                  |
| El hilo         | La correlación, para unirlo con el registro del servidor      |

**Se lee así**, con una línea por campo:

> **Ricardo** cambió el **correo de contacto** de Restaurante X de `a@x.es` a `b@x.es`
> · 16/09/2026 13:41 · motivo: «lo pidió por teléfono» · desde Madrid, Chrome

**Lo que se hace sobre un cliente se copia a la auditoría de ese cliente**, que la ve
(Roles 4.3). **Las consultas no se auditan**, salvo tres: **exportar**, **abrir los
datos de un cliente** (cuando exista el acceso de Roles 4.3) y **ver lo cobrado**.

Las IP se guardarán **dos años** y después se borrarán solas (RGPD). **Todavía no**: el
borrado lo hace el reloj, que llega con la entrega R, y se comprueba en M27.

---

## 6 · Lo que el admin no hace

Lo de Roles 4.8 se mantiene, y se precisa:

- **No escribe en los datos del restaurante**: almacén, compras, personas, horarios,
  ventas. **Lo comercial del cliente —su contrato, su plan, sus notas— sí es nuestro**,
  y eso es lo que el admin edita.
- **No entra «como» el cliente.** El acceso a sus datos es el de Roles 4.3: pedido,
  autorizado, en solo lectura, con banda roja y caducidad. **Se construye en M26.**
- No ve el chat del equipo de nadie ni descarga datos personales de empleados.
- No hace nada sin dejar rastro.

---

## 7 · Lo que se construye, en entregas

| Entrega                       | Qué entra                                                                                                                                            | Terminado cuando                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1 · La puerta**            | Los admins en la base, `bd:dar-admin`, entrar en `/admin/` con segundo factor y 8 h, añadir y quitar admins, la auditoría, el catálogo dentro        | `estookapp@gmail.com` entra, monta el segundo factor y añade a otro; una persona sin permiso llama a la API del admin a pelo y recibe `403`; quitar al último admin total falla |
| **A2 · Clientes**             | Lista con filtros y búsqueda en servidor, CSV, ficha con Resumen, Datos, Cuenta, Uso y Notas; contrato con historial; editar con motivo              | Se encuentra a `ikatz` por su CIF, se le cambia el plan con motivo y ese cambio sale en la auditoría del admin **y en la del cliente**                                          |
| **A3 · Vendedores y códigos** | Vendedores, códigos con enlace, QR y descuento del primer mes, `?ref=` en la web, la casilla del registro, llegadas y cifras de cada vendedor (0076) | Un cliente llega por `?ref=JUAN26`, ve su descuento y se registra con el código ya escrito; el admin ve que vino con Juan, y el descuento cae en su primer cobro mensual        |
| **A4 · Ventas**               | La foto diaria del uso (con el reloj), la actividad calculada, el tablero y sus gráficas                                                             | Las cifras del tablero cuadran con una consulta a mano sobre la base, y un cliente de ejemplo no cambia ninguna                                                                 |
| **Con M26**                   | Stripe como dueño del plan y los cobros, cambio de correo con Resend, acceso autorizado (Roles 4.3), costes e integraciones (Roles 4.5–4.7)          | Lo de M26 en el Plan                                                                                                                                                            |

**A1 no espera a nada.** A2 tampoco. A3 usa el registro abierto de E1 y el pago de E2. A4
necesita el reloj de la entrega R de las mejoras.

---

## 8 · Para quien lo construya

- **Todo en el esquema `plataforma`**, aparte de `estook`. Ninguna política de
  `estook` deja leerlo, y la de `plataforma` solo deja a un admin.
- **Los comandos del admin empiezan por `admin_`** y el despachador **los rechaza** a
  quien no es admin, antes de ejecutar nada. **Se prueba llamando a la API a pelo**
  (regla 4) con una persona normal y con un gerente.
- **Leer datos de varios clientes** necesita saltarse la seguridad por filas de
  `estook`, que está pensada para que nadie lo haga. Se hace **con funciones
  `security definer` que devuelven agregados**, nunca filas de un restaurante, y la
  prueba que cuenta esas funciones las nombra una a una.
- **El dinero, en céntimos** (regla 9). **Las fechas, del servidor** (regla 10).
- **Nada de esto va en el paquete de `app`**: vive en `apps/admin`, que tiene su propio
  presupuesto.
