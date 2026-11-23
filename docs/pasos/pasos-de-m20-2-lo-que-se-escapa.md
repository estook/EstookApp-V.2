# Pasos · M20 · 2 · Lo que se escapa

> Lo que hay que probar después de fusionar y **desplegar la API** (esta vez **no hay migración**). La
> decisión, en la [0151](../decisiones/0151-m20-2-lo-que-se-escapa.md); lo que se ve, en
> [la maqueta](../maquetas/m20-2-lo-que-se-escapa.html). Cuando acabes, di en el chat «la 31, bien» o
> en qué paso falla.

## Antes de empezar

Necesitas IKATZ en el ordenador (Estook) y la caja de Estook TPV. Elige **un plato que tenga escandallo**
(«el plato») y apunta **un ingrediente suyo** («el ingrediente»), con lo que pide el escandallo de él (por
ejemplo, «Carne: 180 g»). Todo pasa en **Almacén › Movimientos › Consumo** (en Almacén › Resumen, el botón
largo de revisar movimientos, y luego la pestaña **Consumo**).

## 1 · El food cost, con dos cifras

1. Abre **Consumo**. Arriba, la tarjeta **Food cost** debe tener **dos cifras**: **Real** y **Según tus
   escandallos**, del mismo periodo.
2. Debajo de «Según tus escandallos» debe decir **«Con todo lo vendido»** o **«Con el N % de lo vendido»**: es
   la parte de lo cobrado en el TPV que tiene escandallo.
3. Si hay ventas en la caja cerrada, debe salir **una barra** y **una frase**: «Cuadra con tus escandallos» (3
   puntos o menos de diferencia) o «N puntos por encima: N € de más».
4. Abre **Cómo sale**: deben salir el coste, lo vendido con escandallo y, si hay diferencia, la resta en euros.
   **Comprueba una cifra a mano**: coste ÷ vendido con escandallo × 100 debe dar el porcentaje de «Según tus
   escandallos».

**Si falla:** dime qué periodo miras y qué dicen las dos cifras y «Cómo sale».

## 2 · Lo que se escapa, con un inventario solo

1. Si en IKATZ todavía no has hecho **dos inventarios desde que vendes con Estook TPV**, la tarjeta **Lo que se
   escapa** debe decir **«Falta un inventario»** (o, si se vendió algo sin escandallo, qué platos fueron, con
   **«Ir a Escandallos»**).
2. Haz un inventario del ingrediente: **Movimientos › Inventario**, cuenta **lo que hay de verdad** y ciérralo.

## 3 · Lo que se escapa, de verdad

1. En el TPV, vende **cinco** del plato y cóbralos. **No vendas nada sin escandallo** hasta acabar: si se
   vende, el periodo se queda a medias y no se vigila (es lo que se decidió).
2. Haz otro inventario del ingrediente y **cuenta de menos lo que valga unos 6 €**. Con carne a 12 €/kg y 180 g
   por plato: debían salir 900 g; cuenta **500 g menos** de lo que dice el libro (lo que hay en Productos).
3. En **Consumo**, la tarjeta **Lo que se escapa** debe enseñar el ingrediente con **«Faltan 500 g · debían salir
   900 g · 56 %»** (con tus cifras) y **6,00 €** a la derecha.
4. **El margen:** si en otro ingrediente faltara menos del 5 % de lo que debía salir, o menos de 5 €, **no sale**.
5. Abre **Por qué puede ser**: deben salir los cuatro motivos y cuántos productos están dentro del margen.
   **Ningún nombre de persona.**
6. **Lo gastado de verdad** debe salir **plegada** debajo, con **Ver** para abrirla.

**Si falla:** dime el ingrediente, lo que pedía el escandallo, lo que contaste las dos veces y lo que dice la
tarjeta.

## 4 · Lo de siempre no cambia

1. Un producto que **no vende el TPV** (la lejía, por ejemplo) **no debe salir** en «Lo que se escapa», aunque
   falte.
2. Si entras con una cuenta que **no ve precios de compra** y cierra inventarios, la tarjeta debe salir **sin
   euros**: solo cantidades y porcentajes.
