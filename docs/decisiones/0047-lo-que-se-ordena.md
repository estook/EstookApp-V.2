# 0047 · Lo que se ordena: el «+» con Fogón, lo de hoy, el Panel de cada puesto, los objetivos con semáforo y el QR para siempre

**Fecha:** 25 de septiembre de 2026
**Estado:** en su rama, `o-lo-que-se-ordena`, con su pull request
**Cambia:** [0015](0015-fogon-es-una-burbuja-no-una-pestana.md) (dónde se abre Fogón) · [0019](0019-el-panel-de-cada-uno-vive-en-el-servidor.md) (con qué Panel se empieza) · Roles 1.2 (la zona de atención y el Panel por rol) · el punto 20 de las mejoras (la dirección del QR)
**Migración:** `0046` (los objetivos de merma y ventas, y la dirección de la carta)

## De dónde sale

Son las mejoras 6, 8, 9 y 17, y el QR definitivo de la 20, del plan de las mejoras
(`docs/mejoras-antes-de-m8.md`). Antes de programar se le preguntó a Richi con una
recomendación delante, y contestó el 25 de septiembre:

1. El botón de acciones: **un solo botón redondo «+»**, «pero que Fogón IA destaque
   con su propio banner».
2. Qué acciones y qué Panel ve cada uno: «lo que sea lógico de cada uno; fíjate cómo
   lo hacen los top y mejóralo».
3. El semáforo: la franja que se propuso, «optimízalo bien, hazlo profesional».
4. La dirección del QR: `estook.com/carta/<local>`, la más profesional.

Y la regla de fondo, la de siempre: copiar lo que ya funciona en las aplicaciones
que mejor lo resuelven —7shifts y Homebase para el equipo, Toast para el día a día,
MarketMan y Apicbase para el género y el food cost— y adaptarlo a lo que Estook sabe.

## Lo que se decide

### Uno · El botón «+», con Fogón en su banner (mejora 6)

- **Un botón redondo abajo a la derecha**, donde llega el pulgar, en el sitio de la
  burbuja de Fogón. Una segunda barra encima de la de navegar habría sido un cuarto
  de pantalla en un móvil pequeño, y dos botones flotantes, uno de más.
- **Fogón va dentro, arriba del todo y en su banner**: oscuro, con su icono y con
  dónde estás («Sabe que estás en Inventario»). Es lo más visible de la hoja, que es
  lo que pidió Richi. En escritorio, además, `Ctrl+J` lo abre directo. **Esto
  enmienda la 0015** en dónde está la puerta de Fogón, y solo en eso: sigue sin ser
  una pestaña, sigue sabiendo dónde estás y sigue sin casilla de escribir hasta M22.
- **Fichar va aparte y arriba, solo si se puede fichar**: la salida si estás dentro,
  con desde cuándo; la entrada, **resaltada** si tu turno empieza en nada o ya ha
  empezado, como hacen Homebase y 7shifts. `?hacer=fichar` abre esta hoja desde
  cualquier sitio: el buscador, Fogón y «Lo de hoy».
- **Los atajos de cada puesto** (`ACCIONES_DEL_PUESTO`), filtrados por permisos:
  quien lleva el local, cerrar la caja, la merma, recibir, pedir, contar e invitar;
  un jefe, lo mismo sin invitar y con «qué hay que atender»; cocina, merma, recibir,
  lo que falta, pedir, contar y buscar; sala, merma, cerrar la caja si le toca y
  buscar. **Son los mismos que las acciones rápidas del Panel** (`usarMisAtajos`):
  se cambian en un sitio y valen en los dos, y «Los de mi puesto» los devuelve.

### Dos · Lo de hoy (mejora 8)

- **Es la zona de atención del Panel**, arriba y fija, no un sitio nuevo. La ordena
  **el servidor** (`lo_de_hoy`) en cinco escalones —lo que ya ha pasado y no se hizo,
  lo que cuesta dinero hoy, lo que tiene hora hoy, lo que hay que hacer hoy, y mañana
  si hay que prepararlo hoy— y dentro de cada escalón **manda el dinero en juego**
  (`loDeHoy`, en el dominio).
- **No cuenta nada por su cuenta**: pregunta a `inventario_hoy`, `compras_de_hoy` y
  `mi_fichaje`, así que no puede decir un número distinto que Inventario o que el
  widget de compras. Cada trozo, solo si quien mira puede verlo.
- **La caja sin cerrar** solo avisa si el local la cierra a mano **y suele cerrarla
  ese día de la semana**: un local que no abre los lunes no tiene la caja del lunes
  «sin cerrar».
- **Dos relojes, cada uno donde toca**: la caja y las cifras, con la jornada del
  local (que corta a su hora de corte); las caducidades y las compras, con el día del
  calendario, que es el de la fecha impresa y el del proveedor.
- Cada cosa lleva **su botón**, y **«Luego»** la aparta tres horas en ese aparato: lo
  pospuesto vuelve. Lo resuelto se va solo, porque la lista se rehace cada vez.
- **Los lotes van sin euros**: un lote no guarda cuánto queda de él, y poner un
  importe sería inventarlo.

### Tres · El Panel de cada puesto (mejora 9)

- **Cuatro puestos, sacados de los permisos y no del nombre del rol**: quien ve las
  ventas y lo que cuesta el personal lleva el local; quien ve las ventas sin eso es
  un jefe; quien ve el género sin las ventas, cocina; lo demás, sala. La matriz de
  permisos sigue viviendo solo en la base (M1).
- **Todos empiezan con su reloj arriba a la izquierda**, también quien lleva el local.
  Después, lo suyo: quien lleva el local, lo que ha entrado hoy y el semáforo; un
  jefe, la línea de su food cost, el semáforo y su gente; cocina, lo que caduca, lo
  que falta, la merma y lo que llega; sala, sus horas, la merma y lo que viene.
- **Quien ya ha tocado su Panel se queda con el suyo** (0019). «Volver al de mi
  puesto» pone el de su puesto, con deshacer.

### Cuatro · Los objetivos con semáforo (mejora 17)

- **Se juzgan cinco cifras de los últimos siete días**: el food cost, el personal, el
  **coste primo** (los dos juntos, lo primero que mira quien lleva bien un
  restaurante; su objetivo es la suma de los otros dos, no se pide aparte), la merma y
  las ventas de la semana.
- **La merma, en porcentaje de lo comprado** y no en euros sueltos: es como la mide el
  sector (entre el 4 y el 10 %, con el 4 % como meta), no depende del tamaño del
  local y se sabe aunque no se cierre la caja. Sin objetivo propio, se juzga con el
  4 %. El importe va en la frase.
- **La franja es de puntos**: ámbar hasta 3 puntos por encima en el food cost, el
  personal y el coste primo, hasta 1 punto en la merma; las ventas, al revés, ámbar
  desde el 90 % del objetivo. **Sin dato no hay color**, y nunca es verde.
- **Nunca el color solo**: cada cifra lleva cómo va en palabras («Cerca del
  límite»), la cifra, el objetivo y, **plegado**, de dónde sale y qué la mueve —«330
  € de género para 1.000 € vendidos», «Lo que más pesa: la merluza», «2 personas
  fichan sin lo que cobran puesto»—, y el botón que la arregla cuando no hay dato.
- **Cuentan lo mismo que las cifras de siempre**: el food cost del semáforo es el de
  la tarjeta del Panel (lo comprueba una prueba), y las horas, las del Resumen de
  Equipo. Cada cifra, solo a quien puede verla: un jefe de cocina no ve el personal
  **ni el coste primo**, porque restándole el food cost lo tendría.
- **Se cambian en Ajustes · Tu local**, con lo normal del sector al lado de cada
  casilla y la propuesta de ventas sacada de sus cuatro últimas semanas. Hasta hoy
  solo se podían poner en el alta.

### Cinco · El QR para siempre y la carta sin sesión (punto 20)

- **`estook.com/carta/<local>`, sin almohadilla y para siempre**: la de la empresa si
  es su único local (`/carta/ikatz`), y la de la empresa y la del local si tiene más
  (`/carta/burger-king-food-truck`). La pone la base al nacer el local, es única en
  todo Estook y **no cambia ni al renombrarlo**.
- **Lo que enseña, sin sesión**, sale de una función con privilegio que devuelve
  solo lo que el local ya enseña al mundo: nombre, dirección, teléfono, web, mapa,
  valoración y horario de Google. Hasta M12 eso es la carta, con una línea honesta:
  «La carta, muy pronto aquí». El día que haya platos, el mismo QR ya impreso los
  enseña.
- **Cómo funciona en GitHub Pages**: la página de la carta es la `404.html` de todo el
  sitio. Pages sirve una sola página para lo que no existe, y esa es la de la carta:
  si la dirección es de una carta, la enseña; si no, dice que no existe y lleva a
  estook.com. Antes salía la portada para cualquier errata.
- **En tres formas**, desde Ajustes: el cartel para imprimir (nombre, QR y «Escanea
  con la cámara del móvil»), el SVG para la imprenta y un PNG. Con corrección de
  errores Q: un QR en una mesa se mancha y se raya.
- **Una dependencia nueva, justificada**: `uqr` (MIT, sin dependencias), que solo da la
  matriz del QR; el dibujo es nuestro y se pinta con React. Se carga aparte, solo al
  abrir el QR.

## Lo que se ha comprobado

- En el dominio: los límites exactos del semáforo, las frases con y sin datos, el
  orden de lo de hoy y la dirección de la carta (`objetivos.prueba.ts`,
  `hoy.prueba.ts`, `carta.prueba.ts`).
- Contra la base, por la API (`lo-que-se-ordena.prueba.ts`): la dirección única y
  fija, la carta sin sesión que solo devuelve lo público, la merma en fracción y las
  ventas en euros, el food cost del semáforo igual que el de la tarjeta, cada cifra
  solo a quien puede verla, la caja que se suele cerrar y no está, y lo de hoy de
  cada uno.
- En pantalla (`lo-que-se-ordena.spec.ts` y las de Fogón de `pantalla.spec.ts`): el
  Panel del puesto, el «+» con Fogón y los atajos, que se cambian y valen en los dos
  sitios, fichar desde cualquier sitio, lo de hoy con su «Luego», los objetivos en
  Ajustes, el QR que se baja y la carta que abre sin sesión.

## Lo que queda para después

- **El «Hoy» de Inventario** sigue siendo el suyo (`inventario_hoy`), que es de donde
  sale lo de hoy del Panel: son la misma lista mirada desde dos sitios.
- **Los avisos que suenan** (push) son la entrega I; aquí todo se ve al abrir la app.
- **El objetivo de ventas por día de la semana** (un sábado no es un martes) necesita
  el histórico de M21; hoy se juzga la semana entera.
