# Las mejoras antes de M8

**Fecha:** 16 de septiembre de 2026
**De dónde sale:** la lista de veinte mejoras que mandó Richi al parar M7, con esta
instrucción: «no hace falta que lo hagas al pie de la letra; si se puede mejorar,
optimizar o hacer mucho mejor, hazlo». **M8 no empieza hasta que esto esté al 100 %.**

> Cada punto dice cuatro cosas: **qué se pidió**, **cómo se va a hacer** (con lo que
> cambia respecto a lo pedido y por qué), **qué hay ya** en el código y **qué
> necesita** que no depende de nosotros. Al final, el orden de las entregas.

El panel de administración va en su propio documento:
[`panel-de-administracion.md`](panel-de-administracion.md).

---

## Resumen en una tabla

**Diez de las veinte están en producción**, y el QR de la 20: la 1, 2, 3 y 7 desde el 23 de
septiembre de 2026 (#64), la 4 y la 5 desde el 24 (#67,
[0046](decisiones/0046-los-vacios-el-oscuro-y-las-fotos.md)), y la 6, 8, 9, 17 y el QR de
la 20 desde el 25 (#69, [0047](decisiones/0047-lo-que-se-ordena.md)). **V y O están
enteras.** Cada una cambia a «En producción» cuando se fusiona y se despliega su entrega.
**La 10 (el lector) se adelanta** a después del repaso del 25-sep: Richi pidió «Escanear
producto» junto a «Añadir producto» ([0049](decisiones/0049-almacen-inventario-congelado-tablon-y-carta.md)).
Y **de la 20, la carta que ya tiene el local se puede subir** desde el repaso del 25-sep,
y la enseña su QR (0049).

| #   | Mejora                                   | Entrega                  | Necesita de fuera                          | Cómo está                          |
| --- | ---------------------------------------- | ------------------------ | ------------------------------------------ | ---------------------------------- |
| 1   | Modo cocina: grande, contraste, guantes  | **V · Lo que se ve**     | Nada                                       | **En producción** (#64)            |
| 2   | Flechas y gráficas en todas las apps     | **V**                    | Nada                                       | **En producción** (#64)            |
| 3   | Cada app abre con su Resumen             | **V**                    | Nada                                       | **En producción** (#64)            |
| 4   | Estados vacíos con dibujo y primer paso  | **V**                    | Nada (los dibujos, los hacemos)            | **En producción** (#67)            |
| 5   | Tema oscuro repasado y fotos de producto | **V**                    | Nada: las fotos van al almacén del logo    | **En producción** (#67)            |
| 6   | Barra de acciones abajo en el móvil      | **O · Lo que se ordena** | Nada                                       | **En producción** (#69)            |
| 7   | Ajustes en secciones y con buscador      | **V** (era de O)         | Nada                                       | **En producción** (#64)            |
| 8   | Un «Hoy» único, por urgencia             | **O**                    | Nada                                       | **En producción** (#69)            |
| 9   | Paneles de fábrica por rol               | **O**                    | Nada                                       | **En producción** (#69)            |
| 17  | Objetivos con semáforo en el Panel       | **O**                    | Nada                                       | **En producción** (#69)            |
| 12  | Pedido sugerido                          | **R · El reloj**         | Nada (el reloj es de Supabase, gratis)     | Falta                              |
| 13  | Alertas de subida de precio              | **R**                    | Nada                                       | Falta                              |
| 16  | Informe semanal para el gerente          | **R**                    | **Resend** para el correo; la pantalla, no | Falta                              |
| 19  | Reseñas: aviso de bajada y respuesta     | **R** y después          | Places ya; **Business Profile** y **IA**   | Falta                              |
| 18  | Coste de personal en vivo y horas extra  | **H · Horarios**         | Nada                                       | Falta                              |
| 14  | Notificaciones push                      | **I · Instalable**       | Nada (las claves de push las generamos)    | Falta                              |
| 15  | Sin conexión: fichar y mermas            | **I**                    | Nada                                       | Falta                              |
| 10  | Escanear el código de barras             | **L**, adelantada        | Nada                                       | **Hecha, en su rama** (#73)        |
| 11  | Leer albarán y Z con una foto            | **M22**                  | **La clave de IA**                         | Espera a M22                       |
| 20  | Carta digital con QR                     | **M12**, con el QR ya    | **M9 y M10**: los platos no existen aún    | **QR (#69) y carta subida (0049)** |

Tres de las veinte **no pueden quedar al 100 % antes de M8**, y conviene decirlo ya:

- **11 · Leer una foto** necesita un modelo de visión, es decir, la clave de IA y el
  presupuesto por local de M22. Lo que sí se deja hecho: la foto se sube, se guarda y
  se revisa en la misma pantalla donde se escribirá lo leído.
- **19 · Responder reseñas** necesita que Google apruebe Business Profile. El aviso
  de que baja la valoración **sí** se puede hacer ya, con Places.
- **20 · La carta con QR** necesita platos con precio y alérgenos, que son M9 y M10.
  Lo que sí se deja hecho: **el QR definitivo de cada local**, para imprimirlo una vez
  y que no cambie nunca (punto 20).

**Richi lo decidió:** esperan a su módulo. Ver [«Lo que decidió Richi»](#lo-que-decidió-richi).

---

## V · Lo que se ve

### 1 · Modo cocina

**Se pidió:** letra y botones más grandes, alto contraste y que se use con guantes.

**Cómo se hace.** Un **tercer ajuste del aparato**, al lado del tamaño de letra y del
tema, que ya son del aparato y no de la persona (0024): la tableta del pase lo lleva
puesto y el móvil del mismo cocinero, no. Encenderlo cambia todo esto a la vez, y
se hace **en las fichas de diseño, nunca pantalla a pantalla** (regla 32):

| Qué                    | Normal     | Modo cocina                                               |
| ---------------------- | ---------- | --------------------------------------------------------- |
| Zona que se toca       | 44 px      | **64 px**, y 12 px de separación mínima entre dos botones |
| Texto                  | El elegido | Un escalón más, y cifras en negrita                       |
| Contraste              | AA         | **AAA** (7:1), sin grises claros ni bordes finos          |
| Gestos                 | Todos      | **Sin deslizar ni mantener pulsado**: todo, con un toque  |
| Confirmar lo que borra | Hoja       | Botón grande que se llena al pulsarlo dos veces, sin hoja |

**Lo que cambia respecto a lo pedido:** con guantes el problema no es solo el tamaño,
es **el gesto**. Un guante de nitrilo toca bien pero no desliza fino, y mantener
pulsado con la mano mojada dispara el arrastre. Por eso en modo cocina **no hay
ningún gesto que no sea un toque**: para ordenar el Panel sin arrastrar, **vuelven los
botones de subir y bajar**, que el Panel vivo quitó (0039) y el teclado ya sabe hacer.

**Y se une con M9:** el «modo cocina» de las fichas de escandallo será este mismo
ajuste, no otro. Un nombre, una cosa.

**Qué hay ya:** `usarTema` y el tamaño de letra por aparato; las fichas con contraste
probado (`contraste.prueba.ts`). **Terminado cuando:** con el modo puesto, una prueba
recorre las pantallas de cocina y ningún botón mide menos de 64 px ni baja de 7:1.

### 2 · Todas las apps con el aspecto del Panel

**Se pidió:** flechas y gráficas pequeñas también en Almacén, Servicio y Equipo.

**Cómo se hace.** No se copia la tarjeta: **se usa la misma**. El `Indicador` del
Panel vivo (0039) pasa a `@estook/ui` y las tres apps lo usan con sus cifras:

| App      | Cifras con flecha y línea de días                                  |
| -------- | ------------------------------------------------------------------ |
| Almacén  | Valor de la cámara, merma en euros, compras, productos bajo mínimo |
| Servicio | Ventas, ticket medio, food cost, cierres hechos frente a días      |
| Equipo   | Horas fichadas, coste de personal (solo con su permiso), retrasos  |

Todas salen de `un_indicador`, que ya compara con el periodo anterior del mismo
largo y dice «no se sabe» en vez de cero (regla 61). **Hoy sabe seis** —ventas, ticket
medio, food cost, merma, compras y horas—; **se le añaden las que faltan** (valor de la
cámara, bajo mínimo, cierres, coste de personal y retrasos) en el dominio, con la
misma forma. **Una cifra, un dueño**: el food cost de Servicio y el del Panel ya son el
mismo, y una prueba lo vigila.

**Hecho (23 de septiembre de 2026, en la rama).** Lo decidió Richi y está razonado en
la [0044](decisiones/0044-las-cifras-de-cada-app.md):

- **En la primera pantalla de cada app**, bajo el título «Cómo va»: Almacén ·
  Resumen (**arriba del todo**, desde el 23-sep), Servicio · Cierre (debajo de lo
  urgente) y Equipo · Resumen (**justo debajo de fichar**, desde el 23-sep). Dos tarjetas por fila
  en el móvil y cuatro en una pantalla ancha, con «7 días · 30 días» recordado en el
  aparato. **Cada tarjeta entera lleva a su detalle.**
- **Siempre las mismas por app**, y cada uno ve las que su rol le deja: un cocinero
  ve «Bajo mínimo» y ni un euro. Las doce se pueden poner también en el Panel.
- **Seis nuevas**: valor de la cámara y bajo mínimo (una foto del libro de cada día,
  con las cuentas de «Hoy»), cajas cerradas, horas del equipo y coste de personal
  (contados como el Resumen de Equipo) y **retrasos**.
- **Retrasos, con un margen de cinco minutos que cada local cambia** en Ajustes →
  «Cuándo es llegar tarde» (migración `0040`). El Resumen de Equipo gana su columna
  de retrasos, contada con la misma pieza.
- Donde había dos cifras iguales, queda una: la tarjeta «Lo que hay en cámara» de
  Almacén · Hoy es ahora la primera cifra de la fila, con su flecha.

### 3 · Cada app abre con su resumen

**Hecho (23 de septiembre de 2026, en la rama)**, con la [0045](decisiones/0045-el-aspecto-y-el-orden.md).
Richi eligió el camino corto y más limpio: **no hay un «Inicio» nuevo; el primer
destino se llama «Resumen»** (Almacén, Escandallos y Equipo), porque ya era la
pantalla que abría la app con lo urgente y «Cómo va». En Equipo, el «Resumen» de antes
—las horas— pasa a llamarse **«Fichajes»**. Y con él vinieron tres cosas que pidió
mirando la pantalla: **las tarjetas en mosaico** (cada una del alto de lo que lleva, en
las apps y en el Panel), **menos texto** (cada aviso en tres líneas, el porqué
plegado, los cuatro primeros a la vista) y **el aspecto nuevo** (tarjeta, cabeceras,
etiquetas sin mayúsculas y tema oscuro). Lo que sigue es el plan de antes, que queda
de referencia:

**Se pidió:** una pantalla de inicio con tarjetas en vez de ir directo a la lista.

**Cómo se hace, y el cuidado que pide.** Cada app gana un destino **«Inicio»** (B5 y 0018) con cuatro a seis tarjetas **de esa app** —las del punto 2 más lo urgente suyo—
y, debajo, **sus acciones de siempre a un toque**.

**Lo que cambia respecto a lo pedido:** quien entra en Almacén **para apuntar una
merma** no puede tener un paso más. Así que:

- Inicio abre **solo cuando se entra a la app desde la rueda**. Desde una acción, un
  aviso o el buscador, se va directo a lo pedido, como ahora.
- La lista sigue a un toque en la barra de abajo.
- Un rol que no ve cifras (un camarero en Almacén) no tiene Inicio: va a la lista.

### 4 · Estados vacíos que invitan a empezar

**Se pidió:** ilustración y un botón para dar el primer paso.

**Cómo se hace.** `EstadoVacio` ya existe; se le añade **un dibujo y una sola
acción**, y se repasa uno por uno. Los dibujos:

- **Una familia de dibujos de línea** con el trazo y los colores de la marca, en SVG
  y pintados con las fichas: **salen bien en claro y en oscuro sin hacer dos**.
- **Se cargan aparte** del paquete inicial: nadie descarga el dibujo de «todavía no
  hay pedidos» para fichar.
- **Un botón, no tres**, y que haga lo que dice: «Añade tu primer producto», no
  «Empezar».
- El vacío **de un filtro** no es el vacío **de verdad**: «nada con eso» ofrece
  quitar el filtro, no crear algo.

**Hecho (24 de septiembre de 2026, en la rama `v-vacios-oscuro-y-fotos`)**, con la
[0046](decisiones/0046-los-vacios-el-oscuro-y-las-fotos.md): veinte dibujos de una
familia, cada uno en su trozo; el dibujo, obligatorio en `EstadoVacio`; un botón que
dice lo que hace —las acciones del catálogo, solo a quien las puede hacer— y los
ejemplos como salida en texto; `NadaConEso` para lo filtrado; Almacén · Resumen
enseña cómo empezar, sin «Cómo va», y Productos sin género enseña solo el vacío.

### 5 · Tema oscuro, repasado, y fotos de producto

**Tema oscuro.** Se hace un repaso pantalla a pantalla **con capturas en los dos
temas**, que se quedan como prueba: las pruebas de pantalla todavía no comparan
capturas, y esta entrega lo estrena con Playwright. Lo que se encuentre
se arregla en las fichas, nunca con una clase en la pantalla (0024, regla 32). Y se
comprueba en un móvil de verdad (regla 29: cumplir el contraste no basta).

**Fotos de producto.** Van **al mismo almacén que el logo del local** (el de Supabase,
montado en M5), **en un cubo suyo** y con el mismo camino: se sube por la API, la
fila se escribe después de subir y la foto vieja se borra.

- Se reducen **en el móvil antes de subir**: 800 px de lado y WebP, unos 80 KB. Una
  foto de 4 MB por 3G desde la cámara es una merma que no se apunta.
- Se guarda también **una miniatura** de 160 px para las listas.
- **Se cargan cuando se ven** (`loading="lazy"`), nunca en la lista entera de golpe.
- Sin foto, la ficha sigue igual: la inicial y el color de su categoría.
- La foto es de la ficha **de ese local**; en M24, la del catálogo maestro de la
  cadena se hereda.

**Hecho (24 de septiembre de 2026, en la misma rama)**, con la
[0046](decisiones/0046-los-vacios-el-oscuro-y-las-fotos.md):

- **El oscuro**: una prueba mide el contraste de cada texto en diecisiete pantallas,
  en los dos temas y en ordenador y móvil; lo que encontró —el color de la app como
  texto en claro— se arregló en la pieza (`acentoParaTexto`). Y **treinta y dos
  capturas** se comparan en la integración continua, en Linux y con Ubuntu fijo; las
  nuevas se traen con `pnpm capturas:traer`.
- **Las fotos**: migración `0045`, cubo `fotos-de-producto` (creado el 24-sep con
  `almacen:preparar`), reducidas en el teléfono a 800 px en WebP —JPG en Safari— con
  miniatura cuadrada de 160, firmadas de una tanda, y en la lista, la ficha y el
  inventario.
- **Falta, de Richi**: mirarlo en un móvil de verdad (regla 29).

---

## O · Lo que se ordena

### 6 · La barra de acciones en el móvil

**Hecha en la entrega O** ([0047](decisiones/0047-lo-que-se-ordena.md)): un botón «+»
redondo, con **Fogón arriba en su propio banner** (lo pidió Richi), fichar cuando se
puede y los atajos de cada puesto, que son los mismos que las acciones rápidas. Lo que
sigue es el plan de antes.

**Se pidió:** una barra fija abajo con lo que más se hace: merma, fichar y recibir.

**Cómo se hace.** La barra de abajo ya existe y es la navegación de cada app; poner
otra encima dejaría **dos barras**, que en un móvil pequeño es un cuarto de pantalla.
Lo mejor:

- **Un botón central «+»** en la barra de siempre, que abre las acciones del que mira
  en **un toque más**, grandes y con su icono.
- **Las acciones salen del catálogo de acciones** (0020) y **dependen del rol**: un
  cocinero ve «Merma», «Fichar» y «Recibir pedido»; una camarera, «Merma» y «Fichar»;
  un gerente, además, «Cerrar caja».
- **Fichar se pone arriba solo cuando toca**: si tiene turno y no ha fichado, sale
  primero y resaltado. Si ya fichó, pasa a «Salir».
- Cada uno **puede cambiar sus tres**, igual que el Panel.

### 7 · Ajustes en secciones, con buscador

**Hecho en la entrega V (23 de septiembre de 2026, en la rama)**, adelantado de la O.
Son cinco secciones —**Este aparato, Mi cuenta, Tu local, Conexiones y Organización**—,
cada una con su dirección, y el buscador encuentra por lo que la gente escribe y sale
también en el buscador universal. **«Equipo» no es una sección de Ajustes**: quién
tiene acceso ya vive en Equipo · Personas, y dos sitios para lo mismo acaban diciendo
cosas distintas. Lo que sigue es el plan de antes:

**Se pidió:** agrupar en Local, Equipo, Cuenta e Integraciones, con buscador.

**Cómo se hace.** Cinco secciones, porque la organización **no es el local** y
mezclarlas es donde se equivoca quien lleva tres:

| Sección           | Qué lleva                                                                               | Quién la ve                  |
| ----------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| **Mi cuenta**     | Nombre, contraseña, PIN, segundo factor, aparatos, letra, tema, **modo cocina**, idioma | Todos                        |
| **Local**         | Datos, ubicación, horario y hora de corte, marca, IVA de compra, zonas                  | Quien lleva el local         |
| **Equipo**        | Quién tiene acceso, invitar, roles                                                      | Quien gestiona personas      |
| **Integraciones** | Google, TPV y reparto, con su estado en un vistazo                                      | Quien lleva el local         |
| **Organización**  | Locales, segundo factor obligatorio, plan y facturación (M26)                           | Dirección y admin. de cuenta |

**El buscador** busca **dentro de los ajustes que esa persona ve**, por su nombre y
por lo que la gente escribe de verdad («contraseña», «clave», «logo», «IVA»). Y los
mismos resultados salen en **el buscador universal**: nadie tiene que saber que «el
tema» está en Ajustes.

### 8 · Un «Hoy» único, por urgencia

**Hecha en la entrega O** (0047): `lo_de_hoy`, ordenada por el servidor con las
consultas de siempre, arriba del Panel, con su botón y «Luego». Los lotes van sin
euros: un lote no guarda cuánto queda de él, y el importe sería inventado.

**Se pidió:** un «Hoy» que junte caducidades, pedidos, turnos y caja.

**Cómo se hace.** Es **la zona de atención del Panel** que ya describe Roles 1.2, y
va arriba del Panel, fija. No se crea un noveno sitio. Cada cosa entra con **por qué
es urgente y su botón**:

| Orden | Qué                                        | Ejemplo                                          |
| ----- | ------------------------------------------ | ------------------------------------------------ |
| 1     | **Lo que ya ha pasado y no se hizo**       | «El pedido de Frutas Pepe debía llegar a las 10» |
| 2     | **Lo que cuesta dinero hoy**               | «3 lotes caducan hoy · 42 €»                     |
| 3     | **Lo que tiene hora hoy**                  | «Entras a las 16:00» · «Llega Makro a las 12»    |
| 4     | **Lo que hay que hacer hoy**               | «Cierre de caja de ayer sin hacer»               |
| 5     | **Mañana**, solo si hay que prepararlo hoy | «Mañana no reparte nadie: pide hoy»              |

Dentro de un mismo escalón, **manda el dinero en juego**. La lista la ordena **el
servidor**, no la pantalla (regla 5), y respeta los permisos: una camarera no ve la
caja. **Y se puede resolver desde ahí**: quitar un lote, fichar, abrir el pedido. Lo
resuelto se va; lo pospuesto vuelve a la hora elegida.

El «Hoy» de Almacén se queda como **el de Almacén**: la misma lista, filtrada.

### 9 · Paneles de fábrica por rol

**Hecha en la entrega O** (0047): cuatro puestos sacados de los permisos, todos con el
reloj arriba a la izquierda. La tabla de abajo era el plan; lo construido, en la 0047.

**Se pidió:** paneles pensados para cocinero, camarero, jefe y gerente.

**Cómo se hace.** Hoy hay **un** `PANEL_DE_FABRICA` para todos, filtrado por permisos.
Pasa a ser uno **por familia de rol**, en el catálogo de widgets:

| Rol                     | Arriba                               | Después                                                 |
| ----------------------- | ------------------------------------ | ------------------------------------------------------- |
| **Cocinero**            | Fichar · mi turno                    | Caducidades · bajo mínimo · merma rápida · lo que llega |
| **Camarero**            | Fichar · mi turno                    | Merma rápida · avisos · lo que viene                    |
| **Jefe de cocina/sala** | Hoy de su partida                    | Food cost o ventas 7 días · pedidos · su equipo hoy     |
| **Gerente**             | Ventas de hoy · food cost · personal | Objetivos con semáforo · merma € · caja · pedidos       |
| **Dirección / area**    | Sus locales comparados               | Lo que se sale · objetivos por local                    |

**El food cost del jefe de cocina, ya posible:** desde la migración `0041` (23-sep) el
jefe de cocina ve las ventas —«puede necesitar saber qué sale o qué no», Richi—, y con el
precio de compra que ya tenía le sale el food cost. Era lo que faltaba para esta fila.

**Lo que no cambia:** quien ya ha tocado su Panel **se queda con el suyo** (0019). El
de fábrica es para quien no lo ha tocado; y un botón «Volver al de mi puesto».

### 17 · Objetivos con semáforo

**Hecha en la entrega O** (0047), con dos cambios sobre el plan, los dos por cómo lo
hacen los que mejor lo resuelven: **la merma se mide en porcentaje de lo comprado**
(del 4 al 10 % en el sector, con el 4 % como meta), no en euros sueltos, y **la franja
es de puntos** (3 en los costes, 1 en la merma; las ventas, ámbar desde el 90 %). Se
añade **el coste primo**, y los objetivos se cambian por fin fuera del alta, en Ajustes.

**Se pidió:** food cost bajo el 30 %, merma bajo X €.

**Cómo se hace.** Los objetivos **ya existen desde M5**, con vigencia y en fracción:
materia prima, personal y margen. Se añaden **merma en euros por semana** y **ventas
por semana**, y el semáforo lo pinta el Panel con `comoVa`, que ya está en el dominio.

- **Tres colores con franja**: verde dentro, **ámbar a menos de un 10 % del límite**,
  rojo fuera. Sin ámbar, el aviso llega cuando ya no hay nada que hacer.
- **Nunca el color solo** (M21): «Food cost 32 %, objetivo 30 %, **la merluza ha
  subido un 18 %**». La causa sale de lo que ya se sabe; si no se sabe, no se inventa.
- **El objetivo de enero juzga enero** aunque se cambie en marzo: ya está así.
- Lo pone quien lleva el local; lo ve quien ve esa cifra.

---

## R · El reloj y los avisos

Estas cuatro necesitan que Estook **haga cosas sin que nadie abra la app**: mirar a
las 7:00 qué pedido no ha llegado, mandar el informe el lunes. Eso es **el reloj**, la
decisión [0016](decisiones/0016-el-reloj-es-pg-cron-llamando-a-la-api.md) que nunca se
llegó a montar: `pg_cron` dentro de Supabase llamando a nuestra API. **Es gratis en
el plan actual.** Se monta al principio de esta entrega, y con él se cierran también
la actualización diaria de Google (0040) y **la entrega 2 del repaso de M7**:

- **Avisos a quien manda**, uno por cosa y persona: un cocinero empieza un borrador y
  su jefe de cocina y su gerente reciben **un** aviso; sigue tocándolo y no llega
  ninguno más (0017, 0034).
- **«Te han invitado a hacer este pedido»**: un jefe invita a un camarero a rellenar
  un borrador; el camarero lo rellena sin poder mandarlo, y lo manda el jefe.

Ese centro de avisos es por donde llegan también los de 12, 13, 16 y 19.

### 12 · El pedido sugerido

**Se pidió:** que se rellene solo por previsión de consumo y por el día de reparto.

**Cómo se hace.** La cuenta, en el dominio y con un solo dueño:

```
lo que hay que pedir =
    consumo previsto hasta el reparto SIGUIENTE al que se está pidiendo
  + el mínimo del producto
  − lo que hay
  − lo que ya está pedido y no ha llegado
  → redondeado hacia arriba al formato en que se compra (caja de 6, saco de 25 kg)
```

- **El consumo** sale del libro de movimientos. Hoy `consumoMedioDiario` da una media
  de todos los días; **se le añade el reparto por día de la semana**, porque un
  viernes no gasta lo que un martes. Cuando llegue M20, se cambia por el
  consumo de lo vendido y la cuenta no cambia.
- **Los días de reparto** ya están en el proveedor (`dias_de_reparto`, 0031).
- **El pedido no sale solo** (lo dijo Richi): se abre **un borrador** con cada línea
  explicada —«quedan 4 kg, gastas 2,1 al día, reparte el jueves»— y se manda a mano.
- Con menos de **dos semanas** de movimientos, no propone: dice que aún está
  aprendiendo. La previsión de hoy se conforma con 7 días (`DIAS_MINIMOS_PARA_PREDECIR`),
  pero repartir por día de la semana con una sola semana es tener un dato por día, y
  una cifra inventada en un pedido es dinero tirado.
- El reloj lo prepara **la víspera del día de pedir**, y avisa.

### 13 · Alertas de subida de precio

**Se pidió:** avisar cuando un proveedor sube, comparando con los demás.

**Cómo se hace.** Se mira **en el momento en que entra el precio** —al recibir el
albarán, al conciliar la factura o al cambiarlo a mano—, en la misma transacción
(0014), y no con un repaso nocturno que avisaría tarde:

- **Sube frente a su último precio** un 5 % o más (el umbral lo cambia el gerente),
  **sin IVA** los dos (0033).
- **Y si otro proveedor tiene ese mismo producto**, se dice cuánto: «Frutas Pepe te
  cobra el tomate a 2,10 €/kg (+12 %). Distribuciones Sur te lo dejó a 1,85 € el 3
  de septiembre».
- **Solo se compara lo comparable**: el mismo producto de tu almacén, llevado a la
  misma unidad (0021). No se compara «tomate» con «tomate pera».
- **Qué no se promete:** precios de mercado que no tenemos. Solo tus proveedores.
- Llega a quien manda pedidos, **una vez por producto y proveedor** (entrega 2), y la
  gráfica de precios de la ficha marca el salto.

### 16 · Informe semanal

**Se pidió:** por correo al gerente: ventas, food cost, merma y horas.

**Cómo se hace.** Primero **una pantalla** «Tu semana», y el correo es su resumen con
un enlace. Así:

- **Sirve ya, sin Resend.** El lunes a las 8:00 el reloj lo deja hecho y avisa en la app.
- **Los números son los mismos que los de la app**, porque salen de `un_indicador`.
- Cada cifra con **su flecha frente a la semana anterior y frente al objetivo** (17),
  y **tres frases**: lo que ha ido mejor, lo que ha ido peor y lo que conviene mirar.
  Las frases salen de reglas, no de un modelo (M22 las mejorará).
- **El PDF lo hace el servidor** (regla 7), con el logo y el color del local.
- Cuando esté **Resend**, el correo sale solo, y cada uno elige si lo quiere.
- Las horas y el coste de personal **solo a quien los puede ver**.

### 19 · Reseñas

**Se pidió:** respuesta propuesta y aviso cuando baja la valoración.

**Cómo se hace, en dos partes:**

1. **Ya, con Places.** El reloj trae la ficha **una vez al día** —30 al mes, dentro
   del tope de 40 (0040)— y guarda la valoración y el número de reseñas. **Si la media
   baja o entran reseñas nuevas con la media hundida**, avisa al gerente con la cifra
   de antes y la de ahora.
2. **Cuando Google apruebe Business Profile y esté la IA (M22 y M23):** leer cada
   reseña, **proponer** una respuesta con el tono del local, y **que la mande una
   persona**. Estook nunca responde por su cuenta (M23).

---

## H · Horarios

### 18 · Cuadrante con coste en vivo y horas extra

**Se pidió:** coste de personal en vivo y aviso de horas extra, adelantando M14.

**Cómo se hace.** **Entra en la entrega 3 del repaso de M7**, que ya es Horarios como
app entera. No se hace aparte: sería montar el cuadrante dos veces.

- Mientras se monta la semana, arriba: **coste de la semana**, **% sobre las ventas
  previstas** y la diferencia con la anterior.
- **Horas extra**: cada persona con sus horas de la semana frente a las de su
  contrato; en ámbar al acercarse, en rojo al pasarse, **antes de publicar**.
- **Descansos**: aviso si entre dos turnos quedan menos de 12 horas.
- **El coste solo lo ve quien tiene su permiso** (M13). Quien monta el cuadrante sin
  él ve las horas, no los euros.

---

## I · La app instalable

Push y sin conexión comparten la misma pieza: **un _service worker_**, que hoy no
existe. Con él, Estook se instala en el móvil como una app. Se hacen juntas.

### 14 · Notificaciones push

**Cómo se hace.** Push web con claves propias (VAPID), **sin servicio de pago**:

- **En Android**, funciona desde el navegador.
- **En iPhone, solo si Estook está instalada** en la pantalla de inicio (iOS 16.4 o
  posterior). Es una regla de Apple, no nuestra, y la app **lo explica en el momento
  de pedir permiso**, con los dos toques que hay que dar.
- **Se pide permiso cuando tiene sentido**, al fichar por primera vez, nunca al entrar.
- Los tres avisos pedidos: **caducidades** (la víspera a las 18:00 y a primera hora),
  **«entras en 5 minutos»** (del horario, M25 adelantado) y **pedido que no ha
  llegado** (a la hora de reparto más 30 minutos).
- **No se duplica canal** (0017): lo que llega por push no llega también por correo.
- Cada uno **elige cuáles quiere** en Mi cuenta, y hay **horas de silencio**.

### 15 · Sin conexión para fichar y apuntar mermas

**Cómo se hace.** Lo apuntado se guarda en el móvil y se manda al volver la señal.
La idempotencia **ya está** en el cliente de la API: cada comando lleva su clave, así
que mandarlo dos veces no apunta dos mermas.

**Lo delicado es la hora del fichaje**, porque la regla 10 dice que la fecha la
decide el servidor y un móvil puede tener la hora mal. La solución:

- El móvil guarda **la última hora del servidor** que vio y **cuánto tiempo ha pasado
  desde entonces** con el reloj interno, que no se puede cambiar desde Ajustes.
- Al volver la señal, **el servidor calcula la hora** con eso, no con la del móvil.
- El fichaje sale marcado **«hecho sin conexión»**, y si han pasado más de 12 horas
  sin señal, lo revisa quien lleva el equipo.
- La merma igual: **la jornada la decide el servidor** con esa hora.

Mientras tanto, la app dice **cuántas cosas tiene pendientes de mandar**. Guardar sin
decir que no se ha mandado es peor que no guardar (regla 34).

---

## L · El lector

### 10 · Escanear el código de barras

**Hecha el 25-sep, adelantada** (Richi: «"Escanear producto" a la derecha de "Añadir
producto"»), en la rama `l-el-lector`, **sin migración**: el producto ya tenía
`codigo_de_barras` desde M6 y el buscador ya lo encontraba.

**Cómo ha quedado**, punto por punto de lo planeado:

- **La cámara**: en Android y Chrome, el lector del propio navegador; en el iPhone,
  ZXing en WebAssembly (`barcode-detector`), que se descarga solo al abrir el lector
  (unos 460 KB) y **se sirve desde Estook**, no desde una CDN. La política de seguridad
  deja compilar WebAssembly (`'wasm-unsafe-eval'`), y nada más.
- **Los lectores de mano**, reconocidos solos por su velocidad (seis o más teclas a
  menos de 45 ms y un Intro) cuando no se escribe en un campo: en Productos, en el
  inventario y al recibir.
- **Productos**: «Escanear» a la derecha de «Añadir producto». Un código de un producto
  abre su ficha; uno nuevo abre el alta con él puesto y **la propuesta de Open Food
  Facts** (solo códigos de tienda, tres segundos como mucho, y un toque para usarla).
- **Inventario**: cada lectura suma uno; con un lector de mano, además, el cursor queda
  en su casilla con el número marcado, así que lo que se teclee lo sustituye.
- **Recibir**: «Escanear lo que llega» marca cada línea y dice cuántas van.
- **Pita y vibra** distinto si el código no es de nada. **Y siempre se puede escribir el
  código a mano** (sin cámara, sin permiso o con una etiqueta ilegible).

Lo que se planeó:

**Cómo se hace:**

- **La cámara del móvil.** En Android con lo que trae el navegador; en iPhone hace
  falta una librería de lectura, que **se descarga solo al abrir el lector**.
- **Y los lectores de mano** USB o Bluetooth (15–30 €), que escriben el código como un
  teclado: **no necesitan nada**, y en un almacén con guantes son mucho más rápidos que
  la cámara. Estook los reconoce en cualquier pantalla que busque.
- **Inventario:** escanear suma uno; escanear y teclear, pone la cantidad. Pita y vibra
  distinto si el código no es de ningún producto.
- **Alta:** si el código no existe, abre el alta con él puesto. **Y propone el
  nombre** si lo conoce Open Food Facts (gratis y sin clave), como propuesta: en
  hostelería muchos códigos son de distribuidor y no estarán.
- **Recibir un pedido:** escanear marca la línea del albarán.

---

## Lo que espera a su módulo

### 11 · Leer el albarán y el Z con una foto → M22

Necesita un modelo de visión (clave de IA y presupuesto por local). **Se deja hecho
ahora** lo que no depende de eso: el botón de cámara ya está en merma y en el cierre
desde M6½; en esta tanda la foto **se sube y se guarda** con el albarán y el cierre,
como justificante. M22 solo añade la lectura, y **siempre propone: confirma una
persona**.

### 20 · Carta digital con QR → M12

Una carta que se actualiza sola al cambiar precios y alérgenos necesita **platos con
precio (M10) y alérgenos calculados (M9)**, que no existen. Hacerla ahora sería una
carta escrita a mano que habría que tirar.

**Hecho en la entrega O (0047): la dirección fija, la carta sin sesión en `estook.com/carta/<local>` y el QR en SVG, PNG y cartel desde Ajustes.** Lo que se planeó: **el QR definitivo.** Cada local recibe su
dirección fija (`estook.com/carta/nombre-del-local`) y su QR en tres formatos para
imprimir. Hasta M12 enseña el nombre, la dirección, el horario y el teléfono de
Google (0040). **El día que llegue la carta, el mismo QR ya impreso la enseña**, sin
reimprimir nada.

---

## El orden de las entregas

Cada entrega, **una rama y un pull request**, y Richi la mira en el TPV y en el móvil
antes de la siguiente. Antes de todo, **la #51** (Google a `main`).

| Orden | Entrega                          | Qué lleva                                                     | Por qué en este orden                                                |
| ----- | -------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | **Admin · La puerta**            | Entrar en `/admin/`, la primera cuenta, más admins, auditoría | Pequeña, no toca nada del local, y Richi pidió empezar por lo básico |
| 2     | **V · Lo que se ve**             | 1, 2, 3, 4, 5 · y la 7, adelantada                            | Todo lo demás se construye encima de este aspecto                    |
| 3     | **O · Lo que se ordena**         | 6, 8, 9, 17 · el QR definitivo (20)                           | Necesita las tarjetas de la anterior                                 |
| 4     | **Admin · Clientes**             | Lista, ficha, estados, notas, editar con auditoría            | Con la puerta hecha, lo que más se usará                             |
| 5     | **R · El reloj y los avisos**    | El reloj, entrega 2 de M7, 12, 13, 16, 19 (valoración)        | Los avisos necesitan el reloj; 12 y 13 necesitan los avisos          |
| 6     | **H · Horarios**                 | Entrega 3 de M7 y 18                                          | Los avisos de turno salen de la entrega anterior                     |
| 7     | **I · La app instalable**        | 14 y 15                                                       | Push necesita los avisos y los turnos                                |
| 8     | **L · El lector**                | 10                                                            | Independiente; aquí porque no bloquea a nadie                        |
| 9     | **Admin · Vendedores y códigos** | Vendedores, códigos, `?ref=`, asignaciones                    | Necesita la ficha de clientes                                        |
| 10    | **Admin · Ventas**               | El tablero de ventas                                          | Necesita el reloj (uso diario) y los vendedores                      |

**Cómo va:** la **1** está **fusionada y en producción** (#53), con Richi dentro del
admin y su segundo factor montado. Su repaso (rescatar a un admin, la cabecera del
móvil y una puerta de la API) también está en producción (#54). **La 2, V, está entera
y en producción** (#64, #65, #67). **La 3, O, también** (#69), y **E2 · el pago con
Stripe** (#71, 0048). Después, **el repaso del 25-sep** (0049), **L · el lector**,
adelantada, y **A2 · Clientes**.

**Qué esperan de fuera, y no frenan el orden:** **Resend** (el correo del informe y
de los avisos), **Business Profile** (las respuestas a reseñas), **la clave de IA**
(las fotos) y **Stripe** (el dinero real del admin, en M26).

---

## Lo que decidió Richi

El 16 de septiembre de 2026, a las tres preguntas que dejaba este plan:

1. **Lo que espera a su módulo se queda ahí**: leer fotos (11) en M22, responder
   reseñas (19) cuando Google apruebe Business Profile, y la carta con QR (20) en M12.
   Antes de M8 se deja hecho lo que no depende de eso.
2. **El orden, el recomendado**: empieza la puerta del admin y sigue la tabla de arriba.
3. **El modo cocina lo elige cada aparato**, como el tema; y en el alta de una tableta
   de cocina se propone encendido.
