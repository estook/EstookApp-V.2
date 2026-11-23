# Pasos · R3 · 2 · 1 · La caja, segunda parte

> Lo que hay que probar después de fusionar, **migrar la 0124** y **desplegar la API** (139 consultas y 373
> comandos). La decisión, en la [0152](../decisiones/0152-r3-2-1-la-caja-segunda-parte.md); lo que se ve, en
> [la maqueta](../maquetas/r3-la-caja.html), pestaña «R3 · 2 · corregida». Cuando acabes, di en el chat «la
> 32, bien» o en qué paso falla.

## Antes de empezar

Necesitas IKATZ en **la caja** (el aparato con cajón) y, para el paso 4, **dos personas con PIN**: tú y otra
que pueda llevar la caja (un jefe de sala o un gerente). **Cierra antes la caja que tengas abierta** desde
otro día. Los billetes son de mentira: lo que importa es lo que dice la pantalla.

## 1 · Los Ajustes nuevos

1. En la caja: **engranaje › El dinero › La caja**.
2. Deben salir tres apartados nuevos: **Al contar el cajón** (con «Contar escribiendo el total»), **Propinas en
   efectivo** («Quédate el cambio» al cobrar, encendido, y «Repartirlas al cerrar», apagado) y **Avisos**
   («Retirar, si el cajón pasa de» **800,00 €** y «Al gerente, si falta o sobra más de» **10,00 €**).
3. Para probar: enciende **«Contar escribiendo el total»** y **«Repartirlas al cerrar»**, y pon **Retirar** en
   **50** (escribe 50 y toca fuera). Debe salir «Guardado.».

**Si falla:** dime qué apartado no sale o qué no se guarda.

## 2 · Abrir escribiendo el total, y la propina

1. Arriba, **Abrir caja › Contar**. Deben salir dos botones: **Billete a billete** y **Escribir el total**.
   Toca **Escribir el total**, escribe **20** y abre la caja.
2. Abre una mesa, pide algo de unos **40 €** y **Cobrar**. Elige **Efectivo** y que te dan **50 €**.
3. Junto al cambio debe salir **«Quédate el cambio»**. Tócalo: el recuadro debe pasar a decir **Propina** y el
   botón, **«Dar el cambio»**.
4. **Cobrar**. Debe decir **«10,00 € quedan apuntados como propina.»** (o la cifra que sea). El ticket sale
   **sin** la propina.
5. **Caja › Cómo va**: debe salir la línea **«Propinas en efectivo»** y sumar en «Debería haber en el cajón».

**Si falla:** dime el importe de la mesa, lo que te dieron y lo que dice «Cómo va».

## 3 · El aviso de retirar

1. Con 20 € de fondo, una mesa cobrada en efectivo y la propina, el cajón **pasa de 50 €**: arriba a la derecha
   debe salir el aviso ámbar **«El cajón pasa de 50 €»** con **Retirar**. (Si no sale enseguida, espera medio
   minuto.)
2. La **×** lo quita de la vista; la **campana** lo sigue teniendo.
3. **Retirar** (desde la campana o el aviso): debe abrir el cajón con **Sacar dinero**, **«A la caja fuerte»**
   marcado y una cifra ya puesta, **en billetes de 50 €** por encima del fondo. Sácalo.
4. El aviso desaparece.

**Si falla:** dime qué hay en «Cómo va» y qué cifra proponía.

## 4 · Entregar la caja

1. **Caja › Entregar la caja**. Cuenta (o escribe el total) **2 € de menos** de lo que dice «Cómo va» y **Seguir**.
2. Debe preguntar **«¿Quién se queda con la caja?»**. Teclea **tu propio PIN**: debe decir que la caja ya la
   llevas tú. Ahora, que teclee el suyo **la otra persona**.
3. Debe salir **«Caja entregada a …»**, la diferencia **«faltan 2,00 €»** en ámbar y que sigue abierta a su
   nombre con lo contado. **Listo**.
4. Arriba, **Caja**: debe decir «abierta por» la otra persona. **Cómo va** debe empezar con **«Recibida de»** tu
   nombre.

**Si falla:** dime en qué paso y qué decía.

## 5 · Cerrar escribiendo el total, el reparto y el aviso al gerente

1. Antes, que **fiche** alguien de cocina (en la caja, **Fichar**), para ver que entra en el reparto.
2. **Caja › Cerrar caja › Escribir el total**: escribe **15 € de menos** de lo que debería haber. **Seguir** y
   **Cerrar caja y ver el resultado**.
3. Debe salir la diferencia **en rojo** y debajo **«Propinas en efectivo de hoy»** con **todos los que han
   fichado hoy**, sala y cocina, cada uno con su parte. Toca a alguien: se quita y las partes se rehacen.
   **Repartirlas**: debe decir «Repartidas entre N. Salen en el Z.».
4. **Imprimir el Z** (si tienes impresora): debe llevar «Propinas en efectivo» y «Propinas repartidas».
5. **En tu móvil**, con Estook: debe llegarte el aviso **«Caja 1 · faltan 15,00 €»** (si el que cerró no eres
   tú; a uno mismo no le llega). Tócalo: abre ese día en **Servicio › Jornada › Cierres de caja**.
6. En ese día deben salir **dos tarjetas de la caja**, una por persona («Contado al entregarla a …» y «La recibió
   de …»), las propinas, lo sacado **A la caja fuerte** y el reparto.

**Si falla:** dime qué no sale. Y, al acabar, **vuelve a dejar los Ajustes** como quieras para IKATZ (Retirar
en 800 €, por ejemplo).
