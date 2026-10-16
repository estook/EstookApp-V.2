# 0090 · El repaso del 16-oct: la ficha del producto, los escandallos separados de la ficha técnica y la app más rápida

**Fecha:** 17 de octubre de 2026
**Estado:** construido en la rama `el-repaso-del-16-oct`, en su pull request. Hay que fusionar, **migrar la `0072`** y **desplegar la API**.
**Sigue:** M9 · 2 ([0087](0087-fichas-y-escandallos.md), [0088](0088-todo-el-almacen-y-el-historial-que-solo-crece.md)). Donde la 0087 dice otra cosa de las pestañas, del modo cocina o de las elaboraciones, manda esta.

## Lo que pidió Richi, y lo que se ha hecho

1. **La ficha del producto, «fea y desordenada».** Ahora, de arriba abajo: **qué es** (foto, zona y categoría, proveedor, envase, alérgenos, con «Editar» al lado); **cuánto hay** (una cifra, una barra con la raya del mínimo y tres datos en fila: vale, se gasta, se acaba); **los dos botones** (ha llegado, ha salido); y **plegado**, cada cosa con su resumen a la vista: precio, caducidades y lotes, movimientos, aprovechamiento y más datos. Lo caducado se abre solo y en rojo. Se fue «● 4602 g Lo que hay», que repetía la cifra, y «95,2381 g al día».
2. **Gramos y kilos.** Todo lo que se cuenta en gramos o mililitros **se lee en kilos o litros a partir de mil** («4,602 kg», no «4602 g»), en toda la app; el libro sigue guardando lo mismo. Y el **mínimo** se escribe en g o kg (o ml y l), tocando la unidad.
3. **Lenta.** Medido, tres causas, y las tres arregladas (abajo).
4. **Escandallos**: pestañas **Resumen · Escandallos · Fichas** (las fichas técnicas; una palabra, como todas las pestañas). El escandallo, **solo** lo que lleva y lo que cuesta. La ficha técnica coge **el plato de la Carta y lo que lleva su escandallo** (en gramos, sin euros) y añade **los pasos, cada uno con su foto**, el tiempo, las notas y el PDF. Para que un plato salga ahí tiene que estar en la Carta y tener escandallo; se dice arriba, en una línea.
   - **Sin modo cocina** en Escandallos: en servicio, la cocina tendrá Estook TPV.
   - **Sin elaboraciones** por ahora: ni pestaña ni se ofrecen al escribir un escandallo.
5. **La barra de una app**: «Apps» aparte, con una raya fina, y los destinos repartidos a partes iguales y centrados.
6. **«Hoy» sin nada, no sale.** El 26-sep se había pedido lo contrario; manda lo último.
7. **La cara de quien escribe** en cada nota del Tablón, en pequeño.
8. **Sin el recuadro naranja al tocar.** `showModal()` da el foco a la «X» y el iPhone (y el ordenador al hacer clic) lo pintaba como si se hubiera llegado con el teclado. Ahora la página sabe si se maneja con el dedo (`modalidad.ts`) y solo enseña el anillo con el teclado, que es lo que pide B8. Los campos de escribir lo conservan.

## Por qué tardaba, medido el 16-oct

1. **La API corría en París y la base está en Irlanda.** Supabase ejecuta la función en la región más cercana a quien llama (`x-sb-edge-region: eu-west-3`). Cada consulta hace de 5 a 32 viajes a la base (contados en la API de pruebas), y cada viaje París–Irlanda son unos 18 ms: el Panel, con quince consultas, se iba cerca de un segundo solo en idas y vueltas. Supabase deja fijar la región con la cabecera `x-region` («Regional invocation», documentación oficial). **La API dice en cada respuesta dónde está su base** (`x-estook-region: eu-west-1`) y la app, en cuanto lo oye, la pide. Una API de antes no lo dice y la app no pide nada, así que **el orden de publicar no rompe nada**; y si algún día la cabecera no pasara, la app la olvida y repite sin ella.
2. **Cuatro viajes fijos por petición, ahora dos.** El disfraz, el hilo, quién es y declararlo: `set_config('role', …, true)` es `set local role`, así que van juntos el disfraz y el hilo, y quién es se declara en la misma consulta que lo averigua.
3. **La pantalla en negro al volver a abrir.** El trabajador de servicio pedía la página a la red y esperaba **hasta 4 segundos** antes de pintar nada. Ahora sirve la guardada al momento y mira la red por detrás; si al abrir llega una versión nueva y todavía no se ha tocado nada, la app se recarga sola una vez. Y la página trae **el logo sobre el fondo de la app** mientras llega el código, en vez de una pantalla vacía.

## Lo que decidí al construirlo

1. **El destino de las fichas técnicas se llama `fichas`** en la dirección (`/escandallos/fichas`) y el de los escandallos, `escandallos`. Los identificadores van en minúsculas y sin guiones (prueba de B5). Un enlace viejo a `fichas?ficha=plato.X` abre ahora su ficha técnica, que es lo que se mandaba por el chat («mira cómo se hace»); `elaboraciones` lleva a Escandallos.
2. **Las fotos de los pasos van al lado de los pasos** (`receta.fotos_de_los_pasos`, migración 0072), en el mismo orden. **Se ponen en el paso ya guardado**, desde la ficha técnica (en el móvil, «Foto» abre la cámara). Al editar los pasos, **cada uno se lleva su foto** aunque se borre el de antes (`foto_de_antes`); guardar el escandallo no las toca. No van al historial: no cambian el coste ni lo que se gasta.
3. **Las elaboraciones que ya existían siguen**: las recetas que las llevan las enseñan, se abren desde ahí y se archivan. Solo no se crean (`crear_elaboracion` queda sin pantalla, apuntado en `se-usan`). En el atajo «+» de Escandallos, «Nueva elaboración» pasa a **«Desgranar un plato»**.
4. **El modo cocina de Ajustes se queda**: es otra cosa (botones y letra grandes para la tablet, de la entrega V). Lo que se quita es el de Escandallos. Pregunto a Richi si quiere quitar también el de Ajustes.
5. **Los resúmenes de la ficha del producto, sin abrir**: «18,18 € el kilo» (y el precio por unidad solo si dice algo distinto), «1 lote · el primero caduca el 20 dic», «16 oct · Ha salido −598 g».
6. **Kilos con tres decimales** («4,602 kg»): es el gramo exacto y en un inventario importa. Lo que es un ritmo («se gasta») va redondeado, como ya hacía `conUnidadAproximada`.

## Lo que no se hace, y por qué

- **Enseñar lo guardado antes de que conteste el servidor** (con señal). Haría la app instantánea, pero el 1-oct se quitó porque se veía un momento el Panel de antes o la pantalla de elegir local; con la región fijada y la página al momento, primero se mide cuánto queda.
- **Las fotos de los pasos en el historial**: no aportan a «qué cambió» y pesarían en cada guardado.
