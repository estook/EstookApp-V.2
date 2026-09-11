# 0032 · Las compras: Estook no manda el pedido por su cuenta, el albarán mueve el género y la factura confirma el precio

**Fecha:** 11 de septiembre de 2026
**Estado:** decidido y construido en la primera entrega de M7 · el reloj y Google, en la segunda

## Lo que había que decidir

La ficha de M7 en el Plan dice qué entra —el ciclo `borrador → enviado → recibido`,
la recepción con «¿entero o con cambios?», la factura conciliada con sus albaranes,
abonos y devoluciones, los contratos marco— pero deja abiertas nueve preguntas que
deciden cómo se usa en un bar de verdad. Estas son las respuestas, y por qué.

## Uno · Mandar un pedido es un permiso aparte: `accion.enviar_pedidos`

**Hacer un borrador y recibir el camión es de Inventario**: lo hace el cocinero,
que es quien sabe lo que falta y quien está en la puerta a las ocho. **Mandarlo al
proveedor, o cancelar uno ya mandado, compromete dinero del local**, y pide su
permiso.

| Rol                                                           | Hace el borrador | Lo manda | Lo recibe |
| ------------------------------------------------------------- | :--------------: | :------: | :-------: |
| Cocinero                                                      |        ✓         |    —     |     ✓     |
| Jefe de cocina · Gerente · Área · Dirección · Compras central |        ✓         |    ✓     |     ✓     |

Al cocinero **no se le esconde el botón**: se le dice «queda en borrador, lo manda
quien puede mandar pedidos», y a quien sí puede le sale en Compras como borrador
por mandar. La base lo impide igual aunque alguien llame a la API a mano.

## Dos · Estook no manda el pedido: abre WhatsApp o el correo, o lo imprime

Conectarse al WhatsApp de cada local no se puede hacer bien —la API de WhatsApp
Business exige un número de empresa verificado por local— y el correo saliente con
el remitente del local tampoco está (M25). Así que el pedido se **escribe** —como se
compra, «3 × Caja 10 kg de Tomate», y **sin un precio**—, y se ofrece:

- **por WhatsApp**, con `wa.me` y el texto puesto;
- **por correo**, con `mailto:` y el asunto puesto;
- **copiarlo**, **imprimirlo** —de ahí sale el PDF, con «Guardar como PDF»—, o
  **«se lo he dicho de otra forma»**: por teléfono, al comercial, en su web.

Y **se apunta «mandado» cuando la persona dice que lo ha mandado**, con por dónde y
cuándo llega. Abrir WhatsApp no es mandar: se puede cerrar sin enviar, y apuntarlo
en ese momento sería mentir. El primer botón es el canal de la ficha del proveedor.

**El PDF con el logo y el membrete** es M11, que es quien genera documentos.

## Tres · Todo en base imponible; el IVA solo en el total de la factura

Pedidos, albaranes, precios y conciliación van **sin impuestos**. Es lo que se
compara entre proveedores, lo que entra en el coste de un plato —«margen sobre base
sin impuestos», regla de M9— y lo que trae cada línea de un albarán. La factura
guarda **su base** —con la que se concilia— y, si se quiere, **su total con
impuestos**, que es lo que se paga.

**Las pantallas de M6 no lo decían**: el precio de un producto se pedía sin decir
si llevaba IVA. Desde M7 **cada campo donde se escribe un precio de compra dice
«sin IVA»**, y a Richi se le pregunta si los que ya puso lo llevaban: si es así,
hay que corregirlos, o las facturas no cuadrarán.

## Cuatro · El albarán mueve el género; la factura no

**Recibir es apuntar entradas en el libro**, por `apuntar`, con el mismo candado por
producto que una entrada a mano: una recepción con veinte líneas no deja el
inventario a medias. La recepción es idempotente —el pedido se bloquea mientras se
recibe— y dos personas recibiendo el mismo pedido a la vez no dejan dos albaranes.

- **Entero** son dos toques. Lo único que se pregunta aunque haya llegado entero
  es **lo que dice la báscula** de lo que va a peso variable: se pide en piezas y
  entra en kilos reales.
- **Con cambios**, cada línea: cuánto ha llegado, a cuánto, si se rechaza en la
  puerta, lote, caducidad y nota. Lo que no ha cuadrado queda como **incidencia**
  de la línea —falta, sobra, rechazado, precio, no pedido— y el pedido queda
  «recibido con incidencias». Y se ofrece **pedirle lo que faltó** de un toque.
- **Quien no ve precios también recibe**: lo que entra se apunta al precio que se
  esperaba —lo pactado o lo último que cobró ese proveedor—, y no se abre ningún
  precio nuevo. Eso lo hará la factura.
- **Lo rechazado en la puerta no entra**; lo que se ve malo después se
  **devuelve**, con un albarán de devolución que saca el género del libro con su
  motivo.

## Cinco · La factura confirma el precio **desde hoy**, y guarda la corrección con su fecha

La Auditoría (hallazgo 8) decía que la factura «abre vigencia nueva con efecto
desde la fecha del albarán». **Se cambia**, y es a propósito:

- **El libro no se reescribe nunca.** Lo que entró, entró al precio que se dijo en
  la puerta; reabrir el coste de hace dos semanas movería el precio medio de todo
  lo que se ha vendido desde entonces.
- Así que el precio nuevo **vale desde hoy**, y **lo que dice la factura se queda
  apuntado en la línea del albarán**, con su fecha. Cuando M9 tenga fichas de
  platos, recalcula lo que costaron los platos de esos días con eso.

La factura **no se bloquea si no cuadra**: queda conciliada con la diferencia
guardada y dicha —«la factura dice 99,50 € y los tres albaranes suman 93,00 €: te
cobran 6,50 € de más»—, que es lo que alguien tiene que reclamar. Un abono concilia
las devoluciones igual.

## Seis · Lo pactado es de cada local

«Makro me deja el aceite a 42 € hasta diciembre» es **una promesa, no un precio**: el
precio lo pone el albarán y lo confirma la factura. Lo pactado está para que,
cuando no coincidan, **se diga en la puerta** y en «Precios».

Es de cada local. El contrato de toda una cadena —el mismo precio para el mismo
producto en todos sus locales— necesita el catálogo maestro, y es **M24**.

## Siete · La sugerencia cubre hasta el reparto de después, en cajas enteras

Si el pescado llega martes y viernes, lo que se pide el lunes tiene que llegar
hasta el viernes: **consumo × días hasta el reparto siguiente, más un 20 % de
margen, menos lo que hay**, redondeado **hacia arriba a formatos enteros** —nadie
compra media caja—, y **con su motivo escrito**. Es la misma cuenta en la ficha del
producto, en «Hoy», en la sugerencia del pedido y en «toca pedir hoy», porque sale
de la misma lectura. Sin días de reparto puestos, cuenta cinco días y lo dice.

## Ocho · Las compras son una app de Inventario, en cinco vistas

`Pedidos · Albaranes · Facturas · Proveedores · Precios`, en ese orden: lo de cada
día primero. Las fichas —pedido, albarán, factura, proveedor y producto— se abren
**desde la dirección** (`?pedido=…`), porque se llega a ellas desde la lista, desde
«Hoy», desde el Panel y desde el Calendario, y el botón de atrás del móvil las
cierra. Facturas y Precios son dinero entero: a quien no ve precios de compra se
le dice por qué no las ve.

## Nueve · Lo que salió al construirlo, y queda como regla

- **Las listas viajan a Postgres como texto** (`'{"a","b"}'::text::tipo[]`), igual
  que el JSON ([0029](0029-lo-que-va-a-jsonb-viaja-como-texto.md)): el conductor de
  las pruebas convertía una lista vacía de un tipo enumerado en `''` y la base la
  rechazaba. Lo hace `comoLista`, en un sitio.
- **Una consulta pide «ver» y un comando pide «editar».** El despachador pedía
  «editar» también para leer, así que un rol con Inventario en solo lectura no
  podía ni mirar. Y un permiso de la organización ya no pasa por encima de un
  recorte hecho a un local: **el recorte manda**.

## Lo que no entra en esta entrega

**El reloj** ([0016](0016-el-reloj-es-pg-cron-llamando-a-la-api.md)) y **el local en
Google** ([0030](0030-el-local-se-situa-con-google.md)) son la segunda entrega de
M7. No se puede probar de verdad sin el acceso a Business Profile y una clave de
Google Cloud con facturación, que tiene que pedir Richi.
