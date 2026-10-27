# 0118 · La entrada de Estook TPV: se entra a la sala, el engranaje y mantener pulsado

**Fecha:** 26 de octubre de 2026
**Estado:** fusionada el 26-oct (#145), sin migración; la API, por desplegar.
**Sigue:** la [0115](0115-cada-aparato-a-lo-suyo.md) y las maquetas de la entrada
([`docs/maquetas/la-entrada-del-tpv.html`](../maquetas/la-entrada-del-tpv.html)), que Richi dio por
buenas el 26-oct: «Las maquetas de la entrada del TPV valen: constrúyela».
**Cambia:** el Anexo 10.3, 11.5 (de «El inicio» a «La entrada: la sala»), 11.11, 11.13 y 11.15,
el plan y ESTADO.

## 1 · Lo que pidió Richi

Tras T4 · 1 (26-oct): **entrar a la sala**, no al inicio de baldosas; arriba la caja (abrir y
cerrar, con T7), **Fichar en naranja** y **un engranaje**; **«Editar sala» dentro de Ajustes**;
Ajustes **con iconos y color** (Agotados, Aparatos, Impresoras y cajón…); y **el plano que quepa en
la pantalla**, que hasta ahora se salía por abajo. Las maquetas, mirado contra Revo, Toast,
Lightspeed y Square, las dio por buenas.

## 2 · Qué deja

- **Se entra a la sala**, en la caja y en el comandero. El inicio de baldosas desaparece; `#/inicio`
  lleva a la sala.
- **Arriba**: la «E» y el local, que devuelven a la sala desde cualquier sitio, con el aparato y su
  color; las zonas y «Mías»; **Fichar** en naranja y **el engranaje**, solo en la caja; y quién está
  con Bloquear. La caja arriba llega con el cobro (T7).
- **El plano cabe entero** en la caja y en la tablet, sin bajar.
- **El engranaje**: los Ajustes del TPV en cuatro grupos —**Hoy** (Agotados), **Lo que se vende**
  (La sala y las mesas, Productos y precios, Cocina y barra), **Lo que se conecta** (Aparatos del
  local) y **Seguridad** (PIN y bloqueo)—, cada uno con su dibujo, su color y una línea que dice
  cómo está. Dentro de cada apartado, los demás a un lado.
- **Cada aparato con su dibujo y su color**: la caja, naranja; el comandero, azul; la pantalla de
  cocina, verde; la de barra, ámbar. En la lista, al añadir y arriba.
- **Mantener pulsado un producto** en la botonera (o el botón derecho del ratón): «Se ha agotado»,
  «Ya hay otra vez» y «Con una nota para cocina».

**Sin migración y sin órdenes nuevas**: 113 consultas y 303 comandos. En la API solo cambia dónde
cae quien entra (`dondeCae`, siempre en la sala).

## 3 · Lo que decidí al construirlo

1. **Todos caen en la sala**, también el primero del día y sin mesas dibujadas: la sala sin mesas
   ya dice cómo dibujarlas y deja pedir en «Barra y llevar». La API sigue diciendo `caeEn`, ahora
   siempre «mesas», para que una pantalla vieja también vaya a la sala.
2. **El engranaje solo sale en la caja** (0115) **y a quien puede tocar algo de dentro**: los
   Ajustes del TPV, los aparatos o los agotados.
3. **Lo que tenía el inicio**: Agotados, al engranaje (Hoy) y a mantener pulsado; Ajustes, al
   engranaje; «Ahora» (lo que toca marchar) ya estaba en la sala como franja.
4. **El plano, a 16 por 10**, del ancho que quepa sin pasarse del alto que queda. **El móvil sigue
   en la cuadrícula de tres en fila**, que baja: un plano dibujado no cabe en una mano (0110).
5. **La línea de cada baldosa sale de lo que ya se pide** (el plano, los aparatos, los agotados, los
   minutos de la cocina): ninguna consulta nueva.
6. **Lo que llega con su entrega no sale** (la caja, las impresoras y el cajón, el datáfono), como
   en el resto del TPV: en la maqueta iban con trazo discontinuo para enseñarlos.
7. **Dentro de un apartado, la lista de los demás a un lado**, con «‹ Todos los ajustes» arriba: se
   pasa de Aparatos a PIN y bloqueo sin volver.
8. **El color de cada aparato, también arriba**, junto a su nombre: se ve en qué aparato se está.
9. **Mantener pulsado es medio segundo**, y en el ordenador de la caja, el botón derecho. Lo agotado
   no se pide con un toque pero no va desactivado, para que se pueda mantener y vuelva; su nombre
   dice «agotado». **La nota, en su propia línea**, y solo en lo que no pregunta opciones ni peso:
   lo demás lleva su nota en la cuenta, como siempre.
10. **En el móvil de la caja, Fichar solo con su reloj**: la barra cabe en menos filas.
11. **Quien no toma nota**, en la caja, ve su aviso con la barra de arriba (fichar y el engranaje), en
    vez de un inicio que ya no existe.
12. **La tabla de impresoras, cajones y cajas de cobro de la maqueta** es para T5 y T7: se pasa al
    Anexo (capítulos 6 y 10) cuando se construya. Hoy no cambia nada.

## 4 · Lo que no entra

- **La caja arriba** (abrir y cerrar), **las ventas de hoy**, **el datáfono y los cajones que dan el
  cambio**: con el cobro (T7).
- **Impresoras y cajón**: con Estook Link y la caja para Windows (T5).
