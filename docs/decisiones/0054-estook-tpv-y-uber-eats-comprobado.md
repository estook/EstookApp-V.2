# 0054 · Estook TPV, y Uber Eats comprobado otra vez

**Fecha:** 27 de septiembre de 2026
**Estado:** decidido. **Solo documentos**: sin migración y sin código. Lo que se decide
aquí se construye en la Fase 4 (M20A y M20C) y en M29.
**Cambia:** la Evolución (1.2), el Anexo TPV y facturación (1.1, con su capítulo 10
nuevo), el Plan (1.3), el Manifiesto (1.3), Roles (1.3) y la Auditoría de flujos (1.3).
**Y borra** las copias viejas de los maestros (`docs/antiguos/`) y los pasos ya hechos
de M4, M5, M6 y M6½, que siguen en el historial de git.

## Lo que pasó

Terminada R2, Richi mandó su visión del producto, punto por punto, para ordenar lo que
viene: el Panel como centro de control, Pulse, Fogón en todas las apps, el almacén que
predice, los horarios con Fogón, las integraciones y **Uber Eats**. Pidió comprobar si
se podía mejorar y adaptar a Estook, y no romper lo que ya está escrito.

**Casi todo ya estaba escrito**, en la Evolución y en los otros cinco maestros: era el
mismo planteamiento que dio origen a la Evolución 1.0. Lo que había que hacer era
comprobar, corregir lo que estaba mal y escribir lo que faltaba.

**Y había una frase que chocaba con lo decidido el 20-sep**: «No queremos convertir
Estook en otro TPV. El TPV sigue siendo el sistema encargado de cobrar». Se le preguntó
antes de tocar nada, y contestó (con las erratas corregidas):

> «Me he expresado mal. Vamos a dejar lo que hablamos: sí cobramos y sacamos facturas
> con Verifacti, todo legal […]. Me refería a que no es un TPV más porque va a ser el
> mejor […]; solo que nosotros no actuamos como banco: en efectivo, abre caja y
> registramos la venta; en tarjeta, con datáfono y registramos la venta. Quiero tener
> Estook app, donde se hacen gestiones y llegan los datos, y Estook TPV para el servicio
> […]. Investiga y dime cómo hacerlo de la mejor forma posible, como lo hacen los mejores
> pero mejorado […]; quería detallar la interfaz y el funcionamiento básico.»

## Lo que se decide

### 1 · El cobro se queda como estaba

**Estook cobra**, con tickets y facturas por Verifacti, como decidió la Evolución 1.1
(capítulo 19). **No se retira nada** del Anexo ni de la Fase 4.

### 2 · Estook TPV es un nombre, no una aplicación

Richi lo ve como dos cosas —**Estook** para gestionar y **Estook TPV** para el servicio—
y así se enseñan. **Por dentro siguen siendo la misma aplicación**, los modos Sala y
Cocina de `apps/app`, porque separarla duplicaría sesión, permisos, datos y diseño, y
eso ya está descartado en A5 del Plan. Lo que Richi quiere —«que tengan toda la suite
de Estook y estén a gusto, que es más cómodo que un CSV o una API»— **es exactamente lo
que da tenerla junta**: lo cobrado está en Negocio al momento.

### 3 · Cómo se ve y cómo se usa: el capítulo 10 del Anexo

Faltaba, y es lo que Richi pidió. Mirado cómo lo hacen Last.app, Revo, Ágora, Glop,
Square y Toast, y adoptando patrones, no diseño. Lo que se decide, en corto:

- **Tomar nota en diez toques o menos** para una comanda de cuatro platos, con lo más
  vendido a esa hora primero y **opciones obligatorias** («¿al punto?») que no dejan
  mandar sin contestarlas. El mismo diseño en el móvil del camarero, en una columna.
- **El cajón se abre solo con efectivo**, como una línea más del formato de impresión
  (el cajón va enchufado a la impresora). **Abrirlo sin venta, con permiso, motivo y
  rastro.**
- **Informe X** y **Z**, con los nombres de siempre, que son consultas y no documentos
  fiscales.
- **Arqueo ciego de fábrica**, y **el total del datáfono cuadrado con lo cobrado con
  tarjeta** el mismo día.
- **El datáfono en dos niveles**: el del banco sin conectar, para todos y desde el
  primer día; y **conectado**, después de M20C, detrás de `ProveedorDatafono`. Existen
  Stripe Terminal, Viva.com y SumUp con API pública para esto (comprobado hoy, sin
  probar ninguno). **En los dos, el dinero va a la cuenta del local**: Estook no es
  banco ni pasarela.
- **Los pedidos de reparto, en la misma cocina** cuando el local cobra con Estook, sin
  pasar por el cobro; lo agotado en Estook se agota en la plataforma, y la tienda se
  pausa desde Estook. **Hasta que el asesor diga quién factura un pedido de plataforma,
  no emite ticket de Estook.**
- **No hay «modo formación» en producción**: se practica en el local de ejemplo. Una
  venta de mentira en un local real es lo que persigue la ley antifraude.

### 4 · Uber Eats, comprobado otra vez

Leída su documentación oficial el 27-sep. **Se corrigen tres cosas** que la Evolución
1.1, el Plan y la Auditoría daban por buenas:

1. **`orders.release` no es «ha cambiado el estado de un pedido»**: avisa de que el
   repartidor está cerca, y solo si la tienda tiene la salida rápida encendida. Los
   avisos que faltaban —cancelado, programado, tienda dada de alta o de baja, tienda
   abierta o pausada— entran en la lista.
2. **Faltaba cómo autoriza el restaurante**: con OAuth de código de autorización y el
   alcance `eats.pos_provisioning`, y después se empareja cada tienda con su local.
   Las credenciales de cliente son solo la mitad.
3. **Solo una aplicación por tienda puede aceptar pedidos** (el _order manager_). Si el
   local ya usa otro integrador, Estook no puede a la vez, y hay que decirlo antes de
   conectar.

Y dos cosas que se añaden: **a los 90 segundos sin respuesta Uber llama al local**, así
que se acepta en segundos; y Uber pide **un piloto con el 98 % de pedidos bien durante
tres días** antes de abrir a más locales. **Los endpoints de pedidos que teníamos son de
la versión anterior** de su referencia, que tiene uno nuevo desde 2023 sin fecha de
retirada para el viejo: cuál se usa se decide en M29, leyendo la referencia de ese día.

Glovo (Partners API) y Just Eat (JET Connect) **tienen API oficial para TPV**; qué dejan
hacer en España se investiga antes de sus adaptadores.

### 5 · Dos contradicciones que había dentro de los maestros

- **Canarias**: el Plan (M20B) y la lista de comprobación de la Auditoría decían que no
  podía activar la facturación; la [0043](0043-hasta-donde-llega-la-facturacion.md) y
  el Anexo (1.4) dicen que sí, con IGIC. **Manda la 0043**, y se corrigen los dos.
- **La impresión de Enlace**: A5 del Plan decía «en M20A» y la cabecera de la Fase 4,
  «M19a, antes de M20A». **Manda la cabecera.**

### 6 · Los pagos de Integraciones son datáfonos

El dibujo de Integraciones ponía «Pagos · Stripe». Stripe es **la suscripción de
Estook**, que no es algo que el local conecte. **Pasa a ser «Datáfonos»**: Stripe
Terminal, Viva.com y SumUp, como próximamente.

### 7 · Lo que se borra, y por qué

- **`docs/antiguos/maestros/`**: las copias de los maestros de antes del 20-sep. **Una
  de ellas dice que Estook no cobra**, y quien la lea —casi siempre una IA— puede
  construir sobre lo que ya no vale. Las versiones anteriores siguen en el historial de
  git (`git log -- docs/maestros`), que es donde tienen que estar.
- **Los pasos para cerrar M4, M5, M6 y M6½**: pasos de Richi ya hechos, que `ESTADO.md`
  da por hechos. Se quedan los de M7 (los enlaza `config/claves.md`) y
  `pasos-antes-de-m8.md`, que es el vivo.

## El punto por punto

Qué hay construido de cada punto de Richi, qué falta y en qué módulo cae, en
[`docs/la-evolucion-punto-por-punto.md`](../la-evolucion-punto-por-punto.md).

## Lo que queda por decidir, y es de Richi

Ninguna bloquea lo siguiente (H · Horarios). Todas son de la Fase 4 o de M29:

1. **Qué datáfono conectado va primero** (Stripe Terminal, Viva.com o SumUp), al llegar
   a M20C y con precios delante. Se suma a las tres del capítulo 19 de la Evolución.
2. **Del asesor fiscal**, además de lo que ya espera: **quién factura un pedido de
   plataforma**, y **si el correo y el QR en pantalla valen como entrega del ticket**.
