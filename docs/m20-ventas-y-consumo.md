# M20 · Ventas y consumo

> **Estado: plan, sin construir.** Escrito el 22-oct-2026, con M16a ya en producción (80
> migraciones, API 102/230), y **corregido el mismo día con lo que dijo Richi**: el cierre a mano es
> una prueba y no trae platos; los platos llegarán **de Estook TPV o de Revo conectado**. Antes de
> construir, **una sola pregunta: cuándo se hace M20** (apartado 4).

## 1 · Por qué toca M20, si acabamos de terminar M10

**Los números no son el orden.** El 29-sep Richi decidió **«el TPV, justo después de M10»**
([0061](decisiones/0061-el-orden-y-la-infraestructura.md)): los autónomos tienen que facturar con un
programa adaptado a VeriFactu desde el 1-jul-2027 (las sociedades, desde el 1-ene), y en el primer
semestre de 2027 mucha gente va a cambiar de TPV. Para no romper las referencias, **los módulos no se
renumeraron**: Estook TPV son seis piezas con números salteados.

```
HECHO         M0 … M10 · M16a · La jornada
ESTOOK TPV    M20 · Ventas y consumo → M19a · Estook Link → M20A · Sala y cocina
              → M20B · Facturación → M20C · Cobro y caja
DESPUÉS       M11 · Documentos → M12 · Carta con QR → M13 · Equipo → M14 · Calendario
              → M15 · Fichajes → M16b · APPCC → M17 · Cuaderno → M18 · Conector (Revo)
              → M19b → Fases 5, 6 y 7 (M21 a M30)
```

**No se ha saltado nada**: M11 a M19 están detrás del TPV a propósito. **El 5-oct Hacienda anunció
pasar VeriFactu a octubre de 2028**, sin BOE todavía; la 0061 dice que, si se publica, el orden se
revisa con Richi.

## 2 · Lo que tenía mal el primer plan

Daba por hecho que **el cierre a mano** traería los platos (escribiéndolos, con el fichero del TPV o
con la foto del Z). **No es así**: el cierre a mano es para cerrar el día con su total, y quien cierra
a mano no sabe qué platos han salido. Los platos, uno a uno, solo llegan de dos sitios:

| De dónde           | Cuándo                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Estook TPV**     | Cuando cobre (**M20C**): cada mesa cobrada es una venta con sus platos ya puestos            |
| **Revo conectado** | Con **M18**, cuando Revo apruebe el acceso a su API (el acceso está pedido desde septiembre) |

**Así que hoy M20 no tendría ni una venta de verdad que mover.** Se construiría y se probaría con
ventas de ejemplo, y en IKATZ no se vería nada hasta que Estook TPV cobre.

## 3 · Lo que no se pregunta, porque es pura lógica (como lo hacen las empresas)

Así trabajan los programas de control de costes de hostelería (MarketMan, Apicbase, Nory) y los TPV
de restaurante: **el almacén baja con lo que se vende, por la receta; la plantilla solo apunta lo que
se tira; y el recuento cuadra la diferencia**. Con eso:

1. **Nada se resta dos veces.** El día que un local tiene sus ventas plato a plato (Estook TPV o Revo
   conectado), **«Gastado en cocina» y «Vendido a un cliente» desaparecen de «Sacar»**: eso ya lo sabe
   el TPV. Se quedan las mermas, la comida del personal, las invitaciones y llevarlo a otro local.
   **La cocina deja de apuntar lo que gasta**: menos trabajo, no más. Sin ventas plato a plato, todo
   sigue como hoy.
2. **El menú del día lo dice la comanda.** Al picar «Menú del día», Estook TPV **pide el primero, el
   segundo y el postre** antes de mandarlo, porque la cocina tiene que saber qué cocinar. Ya está
   escrito en M20A («opciones obligatorias», «menú del día paso a paso»). Así Estook sabe que salieron
   12 lentejas y 11 ensaladas **sin preguntarle nada a nadie**.
3. **Lo vendido baja al cobrar** cada mesa (no al final del día), con el coste de ese día congelado.
   Una mesa abierta no baja, pero cuenta para «quedan N» del agotado.
4. **Un plato sin escandallo** cuenta en dinero y no baja género, y lo dice: «3 platos vendidos sin
   escandallo», con «Desgranar» al lado ([0095](decisiones/0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md)).
5. **Revo, cuando se conecte, entra por el mismo motor**: emparejar una vez «Croq. caseras» de Revo con
   «Croquetas de jamón» de tu carta (Estook lo propone, tú dices sí) y desde ahí, igual que Estook TPV.

## 4 · La pregunta: ¿cuándo se hace M20?

**De dónde sale.** Del orden de la 0061 y de lo del apartado 2: M20 va primero en el papel, pero sin
Estook TPV cobrando no tiene ventas que mover.

- **A · Ahora, como está escrito.** Se construye el motor y se prueba con ventas de ejemplo. En IKATZ
  **no cambia nada que se vea** hasta que Estook TPV cobre, dentro de varias entregas.
- **B · Justo antes de cobrar (con M20C).** Ahora se sigue con lo que sí se ve: **M19a · Estook Link**
  (el programa del local que imprime las comandas y mantiene sala y cocina sin internet) y **M20A ·
  Sala y cocina** (tomar nota en la tablet o el móvil y que llegue a cocina). M20 se hace cuando nace
  la primera venta de verdad, y se prueba con ella.
- **C · Volver al orden de los números**: M11 a M17 primero (los PDF y diseños, la carta con QR,
  equipo, calendario, fichajes, APPCC y cuaderno) y el TPV después. Solo tiene sentido si Hacienda
  aplaza VeriFactu a 2028 en el BOE, y todavía no lo ha hecho.

**Recomiendo B**: se construye lo que se puede probar en IKATZ, y M20 llega con ventas reales en vez de
a ciegas, que es la misma regla con la que se partió Fogón en dos (0095). **Lo que decides: A, B o C.**

## 5 · Lo que será M20 cuando toque, en dos entregas

**M20 · 1 · Lo vendido mueve el almacén**: el motor (cada venta baja lo de su escandallo con el coste
congelado; anular o devolver hace el movimiento contrario, sin borrar nada), emparejar por parecido, lo
de los apartados 3.1 a 3.5, y **Servicio › Ventas** con «Del día» y «Por producto». **M20 · 2 · Lo que
se escapa y lo que deja cada plato**: la desviación con los cuatro filtros de
[`como-detecta-estook-lo-que-se-escapa.md`](como-detecta-estook-lo-que-se-escapa.md) (nada de avisos
con datos a medias ni mientras aprende, un mes en silencio antes de encenderlo), la calibración en una
pregunta de tres botones, el food cost teórico junto al real, y **estrella, caballo, puzzle y perro
por canal** en Carta › Análisis, con el método de Kasavana y Smith (1982) y sin cambiar nunca un
precio solo. **Fogón 2**, cuando un local lleve cuatro semanas de ventas.

| La prueba de la plantilla     | M20                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| ¿Trabajo nuevo para alguien?  | **Menos**: la cocina deja de apuntar lo que gasta; el camarero ya elige el menú en la comanda |
| ¿Duplica algo?                | No: un solo motor para Estook TPV y Revo, y «Sacar» deja de restar lo que ya resta la venta   |
| ¿Bloquea el servicio?         | No: un plato sin escandallo o sin emparejar se vende igual, y se dice                         |
| ¿Se entiende sin formación?   | Emparejar es «¿Es este? Sí»; lo demás pasa solo                                               |
| ¿Avisa solo cuando hay algo?  | Solo lo que se escapa de verdad, y con lo que hay que mirar                                   |
| ¿Funciona con datos a medias? | Baja lo que sabe y dice lo que falta                                                          |
| ¿Señala a alguien?            | Nunca                                                                                         |
