# Lo que el TPV toca de lo ya construido

**Escrito el 20 de septiembre de 2026**, repasando el esquema y el código de verdad
contra la Evolución 1.1 y el [Anexo · TPV y facturación](maestros/Estook-Anexo-TPV-y-Facturacion.md).

> **Para qué existe este papel.** El TPV es la **Fase 4**, trece módulos por delante.
> Para cuando llegue, nadie se va a acordar de que un aparato no puede existir sin
> dueño. Descubrirlo entonces cuesta un rediseño en mitad del módulo. Esto es la lista
> de lo que hay que ampliar, comprobada contra el esquema real y no contra la memoria.
>
> **No es un plan de trabajo y no autoriza a construir nada.** Lo de ahora es
> «Antes de M8».

---

## La conclusión, en una línea

**No hay que rehacer nada de M0 a M17.** Hay **cuatro sitios** donde lo construido se
queda corto y **uno** donde el modelo actual no puede representar lo que el Anexo
pide. Los cuatro primeros son ampliar; el quinto es una decisión de arquitectura.

> **Lo único que ya está hecho: la navegación.** La tabla de vistas de B5 cambió con el
> Plan 1.2, y la prueba que la lee del documento lo cazó en el acto. `Servicio · Jornada`
> ya tiene su vista **Caja** y `Servicio · Ventas` su **Tickets y facturas**, las dos
> apagadas y marcadas **M20C**, y se entra a un destino por la primera vista **construida**
> y no por la primera de la tabla. **No hace falta volver a tocarlo en M20C**: solo darles
> contenido.

---

## 1 · El cierre de caja de M6½ · ampliar

La migración [`0029`](../base-de-datos/migraciones/0029_el_cierre_de_caja.sql) se
escribió previendo que un día el TPV escribiera aquí, y **acertó**. Lo que no previó
es que el TPV pudiera ser el nuestro.

| Qué                           | Cómo está hoy                                       | Qué falta                                                                                                                                                                           |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estook.local.como_se_cierra` | Enum `sin_decidir · a_mano · tpv`                   | **Falta el valor `estook`.** Los documentos hablan ahora de **tres** caminos, y el TPV propio no es ninguno de esos dos                                                             |
| `cierre_de_caja.origen`       | `check` que solo admite `a_mano · csv · foto · tpv` | **Falta `estook_tpv`.** El Anexo 5.5 exige ese origen, con fiabilidad máxima                                                                                                        |
| `linea_de_cierre`             | Concepto como **texto**, con su normalizado         | Cuando la venta nace en el TPV propio, el plato **ya está emparejado** y lleva su tipo de IVA. Falta la referencia al plato y al tipo, **opcionales**, sin tocar el camino de texto |

**Lo que aguanta tal cual y no se toca:** `cierre_uno_por_jornada` (volver a cerrar
corrige, no duplica), el normalizado del concepto en un trigger de la base, la RLS por
`dato.ventas` + `app.servicio`, y la decisión de **no exigir que el desglose sume el
total**. Todo eso sigue siendo correcto con el TPV propio.

**Lo que todavía no existe:** no hay tabla `venta`. La crea **M20**, y es ahí donde se
juntan las cuatro vías. El adelanto de M6½ apuntaba exactamente a esto.

---

## 2 · El motor fiscal de M2 · ampliar

`desglosar()` en
[`packages/dominio/src/fiscal/desglose.ts`](../packages/dominio/src/fiscal/desglose.ts)
**sirve, y es lo mejor que nos encontramos en el repaso.** Hace ya lo que pide el
Anexo 4.9: agrupa por tratamiento fiscal, suma sin redondear por el camino, calcula
sobre el total del grupo y **redondea una sola vez**. Y con precio con impuesto
incluido saca la cuota **restando**, así que `base + cuota` es **exactamente** lo que
paga el cliente. Eso es justo lo que hace que un ticket no baile un céntimo.

Le faltan tres cosas, y **ninguna toca esa lógica**:

1. **La clave de régimen.** Hoy la clave de agrupación es `regimen` (iva/igic/ipsi) +
   `tipo`. VeriFactu agrupa por **tipo impositivo y clave de régimen** (01 general,
   02 exportación…), que es **otra cosa distinta**. Hay que añadirla a
   `LineaAFacturar` y a la clave del `Map`.
2. **El tope de doce líneas de desglose.** El Anexo 4.9 lo dice y la función no lo
   comprueba. Con un solo régimen no se llega, pero se deja escrito.
3. **El recargo de equivalencia** no está modelado. Raro en hostelería, pero existe.

**Y lo que ya está resuelto y no hay que volver a pensar:** `regla_fiscal` trae
vigencia, versión, referencia legal y la barrera de que **una regla usada no se
reescribe**. Eso es exactamente lo que el Manifiesto pide para que una venta de
septiembre no cambie porque en octubre cambie la ley.

---

## 3 · Los permisos de M1 · ampliar, y tres cosas que no son un permiso

El catálogo de permisos es **cerrado a propósito**: un `check` sobre la forma del
código y una clave ajena desde `permiso_de_rol`. Añadir un permiso **es** una
migración, y eso es la regla 2, no un defecto.

**El mecanismo aguanta entero.** Tres niveles, matriz rol → permiso, recorte por
local, ámbito persona/local/organización. **No hay que cambiar ni una tabla.**

**De lo que pide el apartado 1.12 de Roles, ya existe:** `accion.marcar_agotado`
—encaja al milímetro—, `dato.ventas` y `app.servicio`.

**Faltan unos doce permisos**, todos filas nuevas: cobrar · invitar o descontar ·
rectificar o devolver · anular · llevar la caja · alta de facturación y series ·
quitar un plato ya mandado · traspasar mesa · marcar listo · deshacer pasado el
margen · configurar partidas y pantallas · el canje a factura.

**Y tres cosas de 1.12 que no son un permiso y hay que construir aparte:**

| Lo que pide Roles 1.12                                                                  | Por qué no cabe en un permiso                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Ver **los suyos** del turno» (el camarero y sus tickets)                               | El modelo tiene tres niveles, y no tiene «solo lo mío». Se resuelve **en la política RLS**, no con un permiso nuevo                                                                       |
| «Lo pide; **lo aprueba un jefe con su PIN**» (quitar un plato ya en cocina)             | No existe ningún flujo de «yo pido, otro aprueba en el momento». Es maquinaria nueva, y se diseña una vez para todo Estook                                                                |
| «Solo lo firma **el titular o su representante legal**» (la autorización ante Hacienda) | No hay concepto de titular. El rol más alto es `direccion` («Dirección o propietario»), y el Anexo dice expresamente que **no basta con ser gerente**. Hay que marcar quién es el titular |

---

## 4 · El aparato compartido · aquí sí hay decisión de arquitectura

**Es el único sitio donde el modelo actual no puede representar lo que el Anexo
pide**, y conviene verlo ahora y no en M20A.

El Anexo 3.4 dice: **«la sesión es del aparato»**. Una tablet de sala la usan cinco
camareros; la pantalla de cocina lleva encendida desde las ocho.

Pero hoy:

- `estook.dispositivo.persona_id` es **`not null`**: un aparato es siempre **de una
  persona**.
- `estook.sesion.persona_id` es **`not null`**: no existe una sesión sin persona.

Así que hoy **una tablet de sala y una pantalla de cocina no pueden existir** sin
quedar a nombre de quien abrió sesión por la mañana, que es exactamente lo que el
Anexo dice que no puede pasar.

**Las dos salidas, para decidir en su momento:**

1. **Aflojar lo que hay:** `persona_id` pasa a admitir vacío cuando el aparato es del
   local, y encima de esa sesión cada acción que compromete algo va firmada con el PIN
   de quien la hace.
2. **Una pieza aparte:** `aparato_del_local`, con su propia sesión, y la de persona se
   queda como está.

La segunda es más limpia y no toca nada de M4, que es un módulo terminado y probado.

**Decidido el 23-sep-2026: la segunda.** Richi lo describió así: «añadir terminal», con
función (Sala, Barra o Cocina) y nombre, emparejado con el local por código o QR, que
carga su pantalla al encenderse, al que los trabajadores entran con su PIN o su
usuario, y que **es del restaurante y no del trabajador**. Está escrito en el Anexo,
3.4, «Dar de alta un terminal».

---

## 5 · Dónde cuelga el obligado tributario · pregunta abierta

El Anexo 7 dice «todo lleva `local_id`, con RLS contra `locales_visibles`». Pero
`facturacion.obligados` es **por NIF**, y sus series son de **varios locales**: está
por encima del local, no dentro.

Y no cuelga de la organización sin más: una cadena puede tener **un NIF distinto por
local**, o varios locales bajo el mismo NIF.

**Falta decidir** de qué cuelga y cómo se escribe su RLS. No lo dice ningún documento,
y es de las cosas que si se improvisa, se improvisa mal.

---

## 6 · Lo que ya está y encaja sin tocarlo

Esto es la otra mitad de la noticia, y es buena:

| Pieza                                                 | Para qué sirve en el TPV                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bandeja_de_salida` · eventos en la misma transacción | `venta.cerrada` y `documento.emitido`. Si la transacción se cae, el evento se cae con ella |
| `trabajo` · cola de trabajos                          | La cola de impresión, y el repaso diario de registros pendientes                           |
| `clave_de_idempotencia`                               | Los webhooks del proveedor, con su `X-Webhook-Id`                                          |
| Catálogo cerrado de eventos                           | Los nuevos entran ahí, no como cadenas sueltas                                             |
| `auditoria`                                           | Ya admite hechos de plataforma sin organización                                            |
| `pg_advisory_xact_lock`                               | Serializar la emisión por NIF (Anexo 4.4)                                                  |
| Céntimos enteros y cuatro decimales                   | Es exactamente lo que pide el Anexo 7                                                      |
| `regla_fiscal` con vigencia                           | El tipo de una venta pasada no se mueve nunca                                              |

---

## 7 · La cuenta de migraciones, cuando llegue la Fase 4

Orientativo, y **la siguiente libre hoy es la `0040`**. El orden es
**M20 → M19a → M20A → M20B → M20C → M18 → M19b**.

| Módulo         | Aprox. | Tablas nuevas                                                                                                                                        | Qué modifica de lo existente                                                                                  |
| -------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **M20**        | 2      | `venta`, `linea_de_venta`, `emparejamiento_de_articulo`                                                                                              | `local.como_se_cierra` (+`estook`), `cierre_de_caja.origen` (+`estook_tpv`), `linea_de_cierre` (plato y tipo) |
| **M19a**       | 2      | `impresora`, `impresion_trabajo`, `agente_enlace`                                                                                                    | Nada                                                                                                          |
| **M20A**       | 4      | `zona_sala`, `mesa`, `cuenta`, `cuenta_alergeno`, `cuenta_linea`, `cuenta_traspaso`, `partida`, `cocina_pantalla`, `cocina_tanda`, `tiempo_objetivo` | **El aparato compartido** (punto 4)                                                                           |
| **M20B**       | 3      | **Esquema `facturacion`**: `obligados`, `series`, `documentos`, `registros`, `webhooks_recibidos`, `justificantes_provisionales`                     | Marcar al **titular**; reglas del **IGIC** ([0043](decisiones/0043-hasta-donde-llega-la-facturacion.md))      |
| **M20C**       | 2      | `cobro`, `caja_sesion`, `caja_movimiento`                                                                                                            | Nada                                                                                                          |
| **M18 / M19b** | 2      | `conector_tpv`, `bandeja_de_webhooks`                                                                                                                | Identificador externo en `venta`                                                                              |

**Y dos migraciones transversales** que conviene diseñar a la vez aunque entren con su
módulo: **los permisos nuevos** (catálogo + matriz de los doce roles) y **los eventos
nuevos** del catálogo cerrado.
