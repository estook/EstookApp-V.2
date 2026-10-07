# A3 · Vendedores · el plan

**Escrito el 7 de octubre de 2026**, con C2 · Lo oficial en producción y comprobada (57 migraciones, la API con 70 y 156). Dice qué es A3, qué cambió desde que se escribió el admin, qué estaba decidido, lo que decido yo, lo que cuesta, lo que no entra y **seis preguntas de sí o no** para Richi.

De dónde sale: la propuesta de Richi del 16-sep, el capítulo 3 de [`panel-de-administracion.md`](panel-de-administracion.md) y la [decisión 0041](decisiones/0041-el-panel-de-administracion.md).

## Qué es A3, en llano

**Saber quién trae cada cliente, quién lo lleva y cuánto le toca.** Un vendedor reparte su enlace o su código; quien se registra con él queda apuntado para siempre como suyo, y el vendedor ve sus clientes y sus comisiones en su propio panel.

| Pieza              | Qué es                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **El vendedor**    | Nombre, correo, teléfono y notas. Puede entrar a su panel, o no                                           |
| **Sus códigos**    | `JUAN26`, `JUAN-FERIA`: uno por campaña, cada uno con su **enlace** y su **QR** para un folleto           |
| **La llegada**     | El cliente que se registró con un código, cuándo y de dónde venía. **No cambia nunca**                    |
| **Quién lo lleva** | El vendedor que se ocupa hoy del cliente, con su historial: de quién a quién, cuándo y por qué            |
| **Su panel**       | El vendedor entra en `estook.com/admin/` y ve **solo lo suyo**: sus clientes, sus códigos, sus comisiones |
| **Las comisiones** | Un tanto por ciento de lo que paga cada cliente, durante unos meses, y su liquidación de cada mes         |

En el admin, una pestaña nueva, **Vendedores**, al lado de Clientes. Y en la ficha de cada cliente, **quién lo trajo y quién lo lleva**.

## Lo que ha cambiado desde el 16-sep, y por eso se precisa el documento

El capítulo 3 del admin se escribió **antes de E1 y de E2**, cuando no había registro abierto ni cobros. Dos frases suyas ya no son verdad, y se corrigen en él:

- «Hasta M26 no hay registro abierto»: **lo hay desde E1**. El código llega solo, con el alta, sin que el admin lo ponga a mano.
- «Hasta M26 no hay cobros»: **Stripe está montado desde E2**, en modo prueba. Cada cobro ya avisa a Estook, así que **la comisión se puede calcular sobre lo cobrado de verdad**, y no sobre una cuota «acordada».

## Lo que ya está decidido, y no se vuelve a preguntar

| Qué                                                                                                              | Dónde se decidió                                      |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Un vendedor tiene varios códigos**, y un código **no se reutiliza jamás**, ni después de cerrarlo              | [0041](decisiones/0041-el-panel-de-administracion.md) |
| **La llegada no cambia**: es quién lo captó. Quién lo lleva es otra cosa, con fechas                             | 0041                                                  |
| **Solo una asignación abierta por cliente**, y lo impide la base, no el cuidado                                  | 0041                                                  |
| **Manda el primer código**; corregirlo, solo un admin y con motivo                                               | Admin, 3                                              |
| El formulario de registro **deja escribir el código**, para quien lo recibe por WhatsApp                         | Admin, 3                                              |
| **Captados y llevados no se mezclan**; **conversión** y **retención** son dos cifras, cada una con su definición | Admin, 0 y 3                                          |
| **La comisión es sobre lo cobrado**, en céntimos; **una devolución resta** en la liquidación siguiente           | Admin, 3, y regla 9 del Plan                          |
| **Liquidación mensual**: pendiente → aprobada (por un admin total) → pagada                                      | Admin, 3                                              |
| El vendedor entra por **la misma puerta del admin**, con segundo factor, y **solo ve lo suyo**                   | Admin, 1 (los niveles)                                |
| **Las cifras las calcula el servidor**; una IA podrá leerlas, nunca ponerlas                                     | Admin, 3                                              |
| **Los clientes de ejemplo no cuentan nunca**                                                                     | Admin, 4                                              |
| Todo cambio deja **una fila en la auditoría** del admin                                                          | Admin, 5                                              |

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **El código**: de 3 a 20 letras, números o guiones, sin distinguir mayúsculas (`juan26` es `JUAN26`). Cada uno con su campaña, su fecha de fin si la tiene, y **cerrarlo** sin cerrar al vendedor.
2. **Cada código tiene su enlace** (`estook.com/?ref=JUAN26`) **y su QR**, para descargar e imprimir, con el mismo motor que el QR de la carta.
3. **De dónde viene cada cliente**, al registrarse: **referido** (con código), **anuncios** (el enlace trae marcas de campaña de pago), **buscadores y otras webs** (llegó desde Google o desde un enlace en otra página) o **directo**. De la web de la que venía se guarda **solo el nombre** (`google.com`), nunca la dirección entera.
4. **Quien llega con un código queda llevado por su vendedor**, solo. Quien llega sin código, **sin asignar**, hasta que un admin se lo dé a alguien.
5. **El cliente no puede poner un código después de registrarse.** Si se le olvidó, lo pone un admin con motivo. Así ningún vendedor «se apunta» clientes que ya estaban.
6. **Un vendedor que se da de baja**: sus códigos se cierran, sus clientes quedan **sin asignar** en una lista para repartirlos, y **deja de generar comisiones desde ese día**. Lo ya generado se le paga.
7. **La comisión, sobre lo cobrado sin IVA**: el IVA no es de Estook, se le paga a Hacienda.
8. **Mientras Stripe esté en modo prueba**, las comisiones salen **marcadas «de prueba»** y no se pueden liquidar. El día que cobres de verdad funcionan sin tocar nada.
9. **Estook no paga a nadie**: la transferencia la haces tú desde el banco. En Estook se marca «pagada», con la fecha y la referencia de la transferencia.
10. **Se estrena el nivel Comercial**: ve clientes y vendedores, asigna y reasigna, crea códigos; **no exporta ni ve comisiones** de nadie. El nivel Vendedor, también: solo su panel.
11. **El panel del vendedor** tiene tres cosas: **mis clientes** (con su estado), **mis códigos** (con su enlace, su QR y cuántos ha traído cada uno) y **mis comisiones** (por mes). Nada de otros vendedores, nada de exportar.
12. **Dar acceso a un vendedor** es como dar acceso a un admin: su correo, y si no tiene cuenta se le crea con una contraseña de un solo uso; el segundo factor lo monta él al entrar.
13. **El enlace y el código se comprueban en el servidor**: un código cerrado o que no existe no se apunta, y al registrarse se le dice «Ese código no existe», sin parar el registro.

## Lo que cuesta · cero

**Nada más al mes.** Todo vive en la base y en la API que ya hay, y los avisos de Stripe ya llegan. Stripe no cobra nada por leer lo que ya cobra.

**Y de Richi no hace falta nada**: ninguna clave nueva. Una migración y un despliegue, como siempre.

## Lo que no entra

- **El contrato con cada vendedor y sus facturas.** Un vendedor de fuera que cobra comisiones suele ser **agente comercial** (Ley 12/1992) y te factura a ti: eso, con el asesor, el día que haya el primero. Estook solo calcula y apunta.
- **Pagar las comisiones desde Estook.** Lo haces tú, por el banco.
- **El tablero de ventas** y sus gráficas: es **A4**, justo después.
- **Descuentos en euros con el código.** Ver la pregunta 3: lo que entra son días de prueba.

## Las seis preguntas

Cada una con mi recomendación y por qué. **Basta con contestar «sí» o «no»** a cada número.

### 1 · ¿El código viaja en el enlace, sin guardarlo en el navegador?

Quien entra por `estook.com/?ref=JUAN26` y se registra en esa visita queda de Juan. Si se va y vuelve otro día sin el enlace, tiene que escribir el código en el registro.

**Recomiendo que sí.** El admin decía «guardarlo en el navegador 60 días», pero **guardar algo en el navegador de alguien para saber quién lo trajo necesita su permiso**: es lo de los avisos de cookies (LSSI, artículo 22.2), y solo se libran los que hacen falta para lo que la persona ha pedido. Hoy `estook.com` **no tiene aviso de cookies**, y el Plan quiere que siga así. A cambio se pierde a quien vuelve días después sin el enlace y sin acordarse del código; por eso el código es corto y se puede escribir.

### 2 · ¿La comisión es para quien trajo al cliente, aunque después lo lleve otro?

Juan trae a un restaurante; en agosto lo lleva Pedro porque Juan está de vacaciones. La comisión de agosto sigue siendo de Juan.

**Recomiendo que sí.** Traer un cliente es lo difícil, y una reasignación por vacaciones no debería mover dinero. **El tanto por ciento y los meses los pones tú** en el admin: uno general y, si quieres, uno distinto para un vendedor. Sin ninguno puesto, no se genera nada.

### 3 · ¿Cada código puede llevar sus propios días de prueba gratis?

Por ejemplo, `FERIA26` con 30 días, para la feria de hostelería, aunque la oferta general esté apagada.

**Recomiendo que sí.** Es lo que le da al vendedor algo que ofrecer, y ya existe la pieza: la prueba gratis con la tarjeta puesta de E2. Si el código no lleva días, manda la oferta general, como hoy. **Descuentos en euros no**: cambian las facturas y la cuota, y eso conviene mirarlo con el asesor.

### 4 · ¿El vendedor ve el contacto de sus clientes y si lo usan?

Con quién hablar y su teléfono (la ficha comercial), su plan, si paga, y si **lo usa** o **está dormido**. **Nunca** lo de dentro del restaurante: productos, ventas, personas.

**Recomiendo que sí.** Un vendedor que no sabe que su cliente lleva dos semanas sin entrar no puede llamarle antes de que se dé de baja. Y no ve nada que el admin no vea ya.

### 5 · ¿Las comisiones y su liquidación entran ya, aunque nadie pague de verdad todavía?

**Recomiendo que sí.** Se prueban con los pagos de prueba de Stripe (marcados «de prueba», sin poder liquidarse), y el día que cobres de verdad funcionan sin tocar nada. Dejarlas para después sería volver a abrir el admin justo cuando más prisa haya.

### 6 · ¿Lo hacemos en una sola entrega?

**Recomiendo que sí.** Es del tamaño de A2 (los clientes), que salió en una: una migración (la **0058**), un despliegue, y dos pantallas que tocan fuera del admin (el enlace de la portada y el campo del código en «Crear cuenta»).

## Cómo se comprobará que A3 está terminado

- Un cliente se registra entrando por `estook.com/?ref=JUAN26`; se reasigna a Pedro y vuelve a Juan: su ficha dice **captado por Juan, llevado por Juan**, con las tres fechas.
- Otro escribe `juan26` a mano en el registro y queda igual de Juan; uno que escribe un código cerrado se registra sin él y lo sabe.
- Un pago de prueba de un cliente de Juan genera **su comisión, sin IVA y en céntimos**, marcada «de prueba»; una devolución la resta.
- **Juan, entrando con su cuenta, ve sus clientes y sus comisiones y nada más**: ni los de Pedro, ni exportar, **ni preguntando a la API a pelo**. Un nivel Comercial no ve ninguna comisión.
- Dar de baja a Juan cierra sus códigos y deja a sus clientes sin asignar, en la lista para repartir.
- Un cliente de ejemplo no cambia ninguna cifra.
- Todo en la batería de pantalla y **mirado en el móvil**, que un vendedor lo abre en la calle.
