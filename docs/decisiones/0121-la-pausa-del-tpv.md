# 0121 · La pausa del TPV: el pase lo elige el camarero, lo de llevar a su hora, fichar con PIN y volver a vincular

**Fecha:** 28 de octubre de 2026
**Estado:** construido en la rama `la-pausa-del-tpv` (migración 0095); **la caja (el punto 6) queda
escrita para T7 y con tres preguntas a Richi** (punto 5).
**Sigue:** la [0107](0107-estook-tpv-el-tpv-entero.md), la [0111](0111-t3-1-la-botonera.md), la
[0115](0115-cada-aparato-a-lo-suyo.md) y la [0119](0119-t5-la-caja-para-windows.md).
**Cambia:** el Anexo (11.3, 11.4, 11.6, 11.10 y 11.11), el plan de M20A (T7) y ESTADO.

## 1 · Lo que pidió Richi

Con la caja para Windows publicada y probada (sin impresora todavía), una pausa antes de seguir:
«he notado varios fallos y mejoras; no podemos seguir sin estos cambios».

1. **La barra de arriba ha subido**: en Estook TPV, en el iPhone, se metía debajo del reloj.
2. **Quitar el «¿En qué pase sale?»** de los productos: «a veces los clientes lo quieren en un
   orden diferente; mejor dejar esa opción al camarero» (el chuletón, de segundo).
3. **Lo de llevar no pregunta «dos pases o todo junto»**: sale todo junto. Y **3.1, programarlo**:
   el cliente llama y lo quiere para una hora.
4. **«¿Cuántos sois?» no**: «Nº de comensales». «La forma en que dices las cosas ahorra tiempo y
   baja lo que cuesta aprender el TPV.»
5. **En la caja, «Fichar» pide el PIN** a quien ficha, que en ese ordenador ficha cualquiera:
   «Hola, Ana · ¿Fichar la entrada? Sí / No». Una salida por error no rompe nada (jornada partida).
   Si el PIN es el de quien tiene la caja abierta, su salida cierra su sesión.
6. **La caja de todo el día**: la abre el gerente, se abre caja con el PIN de un encargado, solo
   cuenta lo cobrado, se cierra contando el efectivo, y el cajón se abre con PIN para dar cambio o
   sacar dinero. **6.1, que cada venta cuente una sola vez.**
7. **Volver a vincular**: el móvil que borró la app pedía otro código, y entrar con el correo en
   el mismo ordenador creaba «Caja 2».
8. **Los documentos al día**, para no programar a ojo.

## 2 · Lo que queda

- **La zona segura del teléfono en todo Estook TPV** (1): la aplicación deja el hueco del reloj y
  de la isla, arriba, abajo y a los lados, y las pantallas miden lo que queda (`min-h-pantalla`).
  En Windows y Android el hueco es cero.
- **Ningún plato está atado a un pase** (2): lo que se toca va a la pestaña marcada, y cambiar de
  página de la carta no la cambia. La comida tocada con «Bebidas» marcada va al pase que toca (el
  1.º o el último con algo) y se marca, para que el camarero vea dónde ha ido. La mesa recién
  abierta empieza en Bebidas y en la página de lo que prepara la barra. **La pregunta sale de
  Ajustes › Productos**; la columna se queda en la base, sin uso (no hace falta migración).
- **Lo de llevar sale todo junto** (3): ni se pregunta, ni se pasa a pases desde sus opciones; la
  API lo impone aunque se le pida otra cosa.
- **Lo de llevar se programa** (3.1, migración 0095): «¿Para cuándo? · Ahora · Programar» y la hora
  (los cuartos de las tres horas siguientes, u «Otra hora»). La sala ve «Para las 21:30» en lugar de
  cuánto lleva; **la cocina lo ve aparte, en gris, con «se empieza a las 21:10», veinte minutos antes
  de su hora**, y sin tecla hasta entonces; la comanda en papel sale con «PARA LAS 21:30» en negro.
  Solo lo de llevar, de ahora a 24 horas (lo dice la API y lo guarda la base).
- **«Nº de comensales» y «comensales»** (4) en abrir la mesa, sus opciones, la mesa, el plano (un
  muñeco con el número en la casilla), la cocina y el papel.
- **«Fichar», arriba en la caja abierta, pide el PIN a todos** (5): el teclado, «Hola, Ana ·
  ¿Fichar la entrada?» y «Sí, fichar la entrada» o «No, volver»; al acabar, «✓ Ana · entrada a las
  12:02» y el teclado listo para el siguiente. Si el PIN es el de quien tiene la caja abierta, lo
  suyo: sus mesas y «Fichar la salida y cerrar sesión». La jornada partida ya existía (cada entrada
  y salida es un tramo del día).
- **Volver a vincular no crea otro aparato** (7): es el mismo —su nombre, función, cajón, dueño e
  impresoras— con otra llave, y la de antes deja de valer. Dos caminos: en la caja, **Ajustes ›
  Aparatos › el aparato › «Volver a vincular» › Sacar el código** (el de siempre: 6 cifras, 10
  minutos, un uso); y **con el correo**, si el local ya tiene aparatos, primero **«¿Es uno que ya
  tenías?»** con la lista, y «No, es uno nuevo». Lo hace solo quien puede vincular.

## 3 · Lo que decidió la IA al construirlo

1. **Un aparato no se reconoce solo.** Borrar la app borra su llave, y nada del hardware se usa
   para reconocerlo (Arquitectura, capítulo 6): lo reconoce **quien puede vincular, eligiéndolo**.
   Es lo que hacen Square («sign in with a device code» de un aparato que ya existe) y Toast
   (reemplazar el aparato registrado). Reconocerlo solo abriría la puerta a suplantar una caja.
2. **Veinte minutos antes** empieza la cocina lo programado, fijo por ahora. Si un local lo pide,
   pasa a Ajustes del TPV › Cocina y barra.
3. **Lo programado no se retiene en el servidor**: llega a la cocina al mandarlo, como todo, y es la
   pantalla la que lo separa por su hora. Así no hace falta un reloj que lo marche, y si la pantalla
   está apagada, el papel ya lo tiene.
4. **La vara de 10.3 cuenta un toque más por pase elegido**: cuatro platos en diez toques, y uno
   por cada pase que el camarero elige (la prueba de la sala ahora mide once).
5. **`quien_ficha_en_la_caja` devuelve quién es** (`personaId`), para saber si el PIN es el de quien
   tiene la caja abierta. Solo lo ve quien ha tecleado ese PIN.
6. **La API sube a 115 consultas y 313 comandos**: `sacar_codigo_para_volver_a_vincular`. Y
   `vincular_el_primer_aparato` acepta `vuelve_terminal_id`.

## 4 · La caja (6 y 6.1): auditada, escrita para T7

**Hoy Estook TPV no cobra** (T7 sin construir): no hay caja que abrir ni ventas que contar, y **nada
de la sala toca el almacén** (comprobado: ni mandar, ni tachar, ni anular, ni liberar la mesa
escriben un movimiento). Así que hoy no se puede contar nada dos veces, pero tampoco se cuenta.
Lo que Richi describió ya estaba casi todo en el Anexo (5.1, 5.5, 10.6 y 11.6): abrir caja con el
fondo, «Se queda para mañana», el cierre ciego, entradas y salidas con motivo, el cajón sin venta con
permiso y rastro, y la venta que nace con el cobro. **Se añade a T7** (su «Terminado cuando», en el
[plan de M20A](../m20a-la-sala-y-la-cocina.md)):

- **El cajón, con tres botones**: «Cambiar» (dar cambio, sin importe), «Sacar» (con importe y
  motivo) y «Meter» (con importe y motivo), con el PIN de un encargado.
- **Una venta, una vez**: la venta nace del cobro con la clave del cobro (nacida en el aparato), y
  cada línea cobrada baja del almacén **una sola vez**, guardado por la base (un índice único por
  venta y línea), no solo por el código. Lo de antes de cobrar —pedir, mandar, tachar, cambiar,
  anular o devolver un plato a cocina— **no cuenta**. Anular después de cobrar es una devolución,
  con su movimiento contrario. Las pruebas: el mismo cobro dos veces, dos aparatos cobrando la
  misma mesa a la vez, la red que se cae después de cobrar, dividir en tres y anular antes y
  después.

## 5 · Lo que queda por contestar (de Richi)

1. **¿Quién entra en la caja?** (A) Solo gerente y jefes, y la sesión se queda abierta todo el día
   (lo que dijo Richi); o (B) entra cualquiera con su PIN y cada cobro queda a nombre de quien lo
   hace (lo de hoy). Recomendado: **A, pero cada cobro con el PIN de quien cobra**, como Toast: la
   caja abierta todo el día y, si falta dinero, se sabe quién cobró.
2. **Sin abrir caja, ¿se cobra?** Recomendado: **no**, pero sin frenar: al primer cobro con la caja
   cerrada sale «Abre la caja» y la abre ahí mismo un encargado con su PIN.
3. **«Abrir caja» y «abrir el día»** son lo mismo para quien está en la caja: un solo botón. Por
   dentro el día (la jornada de M16a) ya se abre solo; no se le añade otro botón.
