# Pasos · M20 · 1 · Lo vendido baja del almacén

> Lo que hay que probar después de fusionar, **migrar la 0121 y la 0122** y **desplegar la API**. La
> decisión, en la [0149](../decisiones/0149-m20-1-lo-vendido-baja.md); lo que se ve, en
> [la maqueta](../maquetas/m20-1-lo-vendido-baja.html). Cuando acabes, di en el chat «la 30, bien» o
> en qué paso falla.

## Antes de empezar

Necesitas IKATZ en el ordenador (Estook) y la caja de Estook TPV. Elige **un plato que tenga
escandallo** (Escandallos › Escandallos: el que no dice «Sin escandallo») y, si hay, **uno sin
escandallo**. En los pasos los llamamos «el plato» y «el otro».

## 1 · Cobros ya cuenta lo de hoy (el fallo que viste)

1. En Estook: **Negocio › Ventas › Cobros**, y arriba elige **Última semana**.
2. **Deben salir** los cuatro cobros de prueba del 22-nov con tarjeta (**1.347,30 €** entre los cuatro),
   cada uno con su hora, su mesa y su ticket.
3. En el TPV, **cierra la caja** que lleva abierta desde el 18-nov (Caja › Cerrar caja) y ábrela otra vez
   para seguir. Su Z junta lo cobrado del 18 al 22, porque es lo que entró en ese cajón.

**Si falla:** dime cuántos cobros salen y de qué días.

## 2 · Cobrar resta del almacén

1. En Estook, abre en **Almacén › Productos** dos ingredientes del plato y **apunta cuánto hay** de cada
   uno (por ejemplo, «Carne: 7,80 kg»).
2. En el TPV, abre una mesa, pide **dos** del plato (y **uno** del otro, si lo tienes) y **cóbrala**.
3. En Estook: **Almacén › Movimientos › Historial**. Arriba **debe salir** «Vendido · Mesa N», con la hora,
   cuántos productos, quién cobró y lo que valía en rojo.
4. Tócala: **debe desplegarse** lo que restó cada producto.
5. Abre otra vez los dos ingredientes: **lo que hay debe haber bajado justo** dos veces lo que pide el
   escandallo. Si el ingrediente tiene aprovechamiento (por ejemplo, un 80 %), baja algo más: lo que se tira
   al limpiarlo.
6. En los filtros del Historial, toca **Ventas**: **debe salir** esa misma línea.

**Si falla:** dime qué ingrediente, cuánto había, cuánto pide el escandallo y cuánto hay ahora.

## 3 · Por producto y Vendidos sin escandallo

1. **Negocio › Ventas › Por producto**, con **Hoy**: **deben salir** el plato con **2** unidades, lo
   vendido sin IVA, su coste y su food cost; y el otro con **1**, «Sin escandallo» y sin coste.
2. Arriba, **Vendido sin IVA** tiene que ser **la suma exacta** de la columna. Si hay un plato sin
   escandallo, el food cost dice «Food cost con escandallo» y debajo sale la línea que lo explica.
3. **Escandallos › Resumen**: si cobraste el otro, **debe salir** «Vendidos sin escandallo» con él y «1
   vendido esta semana». Tócalo: **se abre** para crearle el escandallo. No hace falta que lo crees.

**Si falla:** dime qué cifra no cuadra y con qué la comparas.

## 4 · Sacar, sin contar dos veces

1. **Almacén › Productos**, un ingrediente del plato, **Ha salido género**.
2. **No deben salir** «Vendido a un cliente» ni «Gastado en cocina», y debajo de los motivos **debe decir**
   «Lo vendido y lo cocinado ya lo resta cada cobro de Estook TPV». Las mermas siguen ahí.
3. Cierra sin apuntar nada.

## 5 · Lo que vuelve

1. Cobra otra mesa con **tres** del plato.
2. En el TPV: **Tickets y facturas**, ese ticket, **Devolver**, una de las tres, con el motivo **«Se cobró
   de más»**.
3. En el Historial **debe salir** «Vuelve · se cobró de más», en verde, y lo que hay del ingrediente **sube
   lo de una ración**.
4. Devuelve **otra** con **«Mal hecho»**: en el Historial **no sale nada nuevo** y lo que hay **no cambia**
   (ese plato se cocinó y se tiró).

**Si falla:** dime con qué motivo y qué pasó en el Historial.

## Lo que no hace falta probar

Que el cobro siga si restar falla, que el mismo cobro no reste dos veces y que el ticket anulado lo devuelva
todo lo prueban solas las pruebas de GitHub (`lo-vendido-baja.prueba.ts`). Anular un ticket de verdad no
hace falta: deja su número usado ante Hacienda.
