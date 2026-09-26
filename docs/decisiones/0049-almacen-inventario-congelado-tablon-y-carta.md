# 0049 · Almacén e Inventario, lo congelado aparte, el Tablón y la carta subida

**Fecha:** 25 de septiembre de 2026
**Estado:** decidido. Es **el repaso del 25-sep**, lo que Richi vio al mirar E2, con la
migración `0048`
**Cambia:** el nombre de la app «Inventario» (M6) y de la vista «Recuento» (M7); el aviso
de lo congelado del repaso de M7 (`congelar` ya no pregunta la caducidad); y lo que enseña
el QR de la carta de la [0047](0047-lo-que-se-ordena.md) hasta M12
**Precisa:** M9, M10 y M12 del Plan (el plato, su ficha y su escandallo; leer la carta
subida), Roles 1.11 (el Tablón) y la [0046](0046-los-vacios-el-oscuro-y-las-fotos.md) (las
claves del almacén, ahora también de la carta)

## Lo que vio Richi (25-sep)

1. «Si congelas una parte, esa parte se separa: **no te puede avisar de que está
   caducado, sino que avisa cuando lleva mucho tiempo**.»
2. «**Almacén** es donde se guarda todo, y hacer recuento se suele llamar **hacer
   inventario**. Que no queden restos de cómo era.»
3. «**Subir una carta suya** o un diseño, que pase a ser la que se muestra en la carta
   online, y que Estook lea los platos y pregunte antes: platos nuevos, cambios… ¿seguro?»
   Y cómo tienen que ir **carta, ficha técnica y escandallo**: un plato, tres vistas.
4. «Al añadir producto **no te pide el mínimo**» (sí en la ficha); **elegir kg o g**
   tocando la unidad; y **«Escanear producto»** junto a «Añadir producto».
5. «Hoy», arriba del Panel, **en el móvil a veces sale y a veces no, o tarda**.
6. **Mensajes compartidos**: «reserva a las 5:00 de 20 personas», y marcar como leído.
7. Al deslizar en el móvil, **la barra de abajo sube a media pantalla y se queda ahí**.

Y contestó (las siete, la recomendada): lo congelado aguanta **3 meses, cambiable por
producto**; la carta **se sube ya** y los platos se leen en M9–M10; **L se adelanta
entera**; el **Tablón en el Panel**.

## Lo que se decide

### Uno · Almacén e Inventario, sin restos

- La app es **Almacén** (`/almacen`, permiso `app.almacen`, acento `--color-app-almacen`,
  `IconoAlmacen`), y la vista de contar la cámara es **Inventario**
  (`/almacen/movimientos/inventario`, «Hacer inventario», «Cerrar un inventario»).
- **El permiso cambia de nombre en la base** con sus 23 políticas. No se reescriben a mano:
  la `0048` **lee cada política de `pg_policies` y cada función de su definición**, y solo
  cambia el nombre del permiso. Así no se puede colar una diferencia, y deshacerla hace
  exactamente lo contrario.
- **Las direcciones de antes no se rompen**: la app lleva `/inventario/…` a `/almacen/…`
  (`direccionesViejas.ts`), y la migración cambia los enlaces que guarda el Calendario.
- **Por dentro**, lo que es el almacén se llama `almacen` (carpetas, identificadores,
  `almacen_hoy`), y **el acto de contar sigue llamándose `recuento`** donde no se ve: el
  tipo de movimiento `recuento` (un valor de un enumerado no se quita), el comando
  `cerrar_recuento` y el permiso `accion.cerrar_recuento`, que en pantalla es «Cerrar un
  inventario». En el código, «recuento» es la operación; en pantalla, «inventario» es lo
  que se hace.
- **La historia no se reescribe**: la historia de los módulos, las lecciones, las
  auditorías y las decisiones anteriores cuentan lo que pasó con los nombres de entonces.
  Los maestros, los planes vivos, `ESTADO.md` y todo lo que se ve, con los de ahora.

### Dos · Lo congelado va aparte

- **Lo congelado no caduca: se queda viejo.** No sale entre lo que caduca, ni en el
  Almacén, ni en el Panel, ni en «Hoy». Su aviso es **el día que cumple lo que aguanta
  congelado** su producto (`congelado_aguanta_meses`), **tres meses** si nadie lo cambia
  —lo habitual en el APPCC de hostelería para lo que congela el propio local—, y se cambia
  en su ficha («Congelado aguanta: 6 meses»).
- **Avisa una semana antes** («2 congelados cumplen su tiempo esta semana») y **el día
  que se cumple** («El bacon lleva demasiado tiempo congelado»). En el Calendario, el aviso
  es ese día: «El bacon cumple 3 meses congelado». Cambiar lo que aguanta mueve los avisos
  de lo que ya está en el congelador.
- **Congelar ya no pregunta la caducidad.** La fecha de cuando estaba fresco se queda como
  estaba, porque dice de dónde viene. Congelar dice en una línea cuándo avisará.
- El día que cumple lo cuenta la base (`congelado_el + meses`, como suma meses Postgres: del
  30 de noviembre, tres meses después es el 28 de febrero); qué se dice y desde cuándo, el
  dominio (`congelado.ts`).

### Tres · La carta del local, subida

- **Se sube en Ajustes → Tu local → Tu carta**: un PDF o unas fotos. **El navegador pasa
  cada página a una imagen** de 1600 px (WebP, o JPG en Safari) —el PDF con PDF.js, que se
  descarga solo al elegir un PDF—, porque una imagen se ve y se amplía en el móvil de quien
  escanea el QR sin abrir ningún visor.
- **Tres pasos y ninguno a ciegas**: elegir, **ver las páginas**, publicar. Las páginas
  suben de una en una y se publican juntas: quien escanea a mitad de la subida ve la de
  antes entera. Como mucho doce.
- **En el cubo `cartas`, privado**, que crea la propia `0048` en Supabase. En la fila del
  local, **claves, nunca direcciones** (0046); la carta pública las firma de una tanda.
  Solo se publican páginas de la carta de ese local, y la de antes se borra al publicar.
- **Leer los platos de la carta subida llega con los platos (M10)**, con el resumen
  delante —«4 platos nuevos, 2 precios distintos, 1 que ya no está · ¿actualizo tu carta?»—.
  Un PDF con texto lo lee Estook sin IA; una foto, cuando haya lectura de imágenes (M22).

### Cuatro · Un plato, tres vistas (para M9 y M10)

Escrito en el Plan, M9: **la carta** dice qué se vende y a cuánto; **la ficha técnica**,
cómo se prepara y con cuánto de cada cosa; **el escandallo** se calcula con la ficha y los
costes del Almacén, **con el aprovechamiento** (10 kg a 60 € de los que quedan 8 son 7,50
€/kg reales). Los tres, colgados del plato **por su identificador**; nada se escribe dos
veces; todo se recalcula solo y solo lo afectado; y **la IA solo propone** coincidencias,
que confirma una persona. Lo que Estook puede contar, lo cuenta él.

### Cinco · El alta pide el mínimo, y la unidad se elige tocándola

- **El mínimo, en el alta**, al lado de «Cuánto hay ahora» y en la misma unidad.
- **La unidad de detrás del campo se toca** («kg ▾») y abre el desplegable del sistema:
  kg (kilos) o g (gramos); l (litros) o ml (mililitros). En el alta, sin nada apuntado,
  cambia en qué se cuenta el producto. Es una pieza del sistema de diseño
  (`Campo` con `unidad`).
- Con «Está congelado», la caducidad ni se pregunta.

### Seis · El Tablón

- **El corcho de la cocina, en el Panel**, debajo de «Hoy» (Roles 1.11): escribe cualquiera
  del local, para todos o para cocina o sala, para hoy, mañana u otro día, con hora si la
  tiene. **Sin notas, no está**; escribir se hace desde el «+» («Escribir en el tablón»,
  en los atajos de los cuatro puestos) o desde la propia tarjeta.
- **Lo que no has leído, arriba y con su punto**, con su «Leído»; lo leído, plegado.
  **Quien la escribió ve quién la ha leído**; quien lleva al equipo, también quién falta.
- **Con hora, sale en el Calendario** y, **en cuanto se ha leído, en «Hoy»** («17:00 ·
  Reserva de 20 personas», en «Tiene hora hoy»): sin leer ya está en el Tablón, justo
  debajo, con su punto, y salir dos veces seguidas era ruido (se vio en la captura). Se
  lee de su tabla con su política: quitarla la quita de los tres.
- **Se va sola al pasar su día**: no se borra, deja de enseñarse. En M17, las Notas del
  Cuaderno enseñarán su historia.

### Siete · Lo que falla solo en el iPhone

- **«Hoy» que no salía**: la zona de atención se escondía con `:has(:empty)`, y **WebKit no
  vuelve a mirarlo** cuando un hijo se llena después (arreglado solo en Safari 27). Ahora
  la esconde la página (`usarSinNadaDentro`), y una prueba lee el código para que no
  vuelva `:has(:empty)`.
- **La barra que subía a media pantalla**: con la app instalada, al cerrar el teclado el
  iPhone deja el visor visible desplazado, y lo `fixed` con `bottom: 0` se queda a media
  pantalla. Ahora lo pegado abajo —la barra, el «+», el aviso de deshacer y las hojas— baja
  lo que se ha quedado colgado (`--desfase-abajo`, `anclaAbajo.ts`), y **con el teclado
  abierto la barra se aparta**, como en las apps del teléfono.

## Lo que no entra

- **Leer los platos** de la carta subida (M10) y leer fotos (M22).
- **El historial del Tablón** (M17, en el Cuaderno) y **avisar por push** de una nota nueva
  (entrega I).
- Cambiar de nombre por dentro lo que es el acto de contar (`recuento`): ver Uno.
