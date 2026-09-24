# 0046 · Los vacíos invitan a empezar, el oscuro se mide y se fotografía, y cada producto tiene su foto

**Fecha:** 24 de septiembre de 2026
**Estado:** en su rama, `v-vacios-oscuro-y-fotos`, con su pull request
**Cambia:** B3, B4 y B8 del Plan de desarrollo · [0024](0024-el-color-del-local-pinta-la-app.md) (el acento como texto)
**Migración:** `0045` (la foto del producto)

## De dónde sale

Son los dos puntos que le faltaban a la entrega V, tal como los dejó escritos el
plan de las mejoras (`docs/mejoras-antes-de-m8.md`, puntos 4 y 5) y con las reglas
que Richi puso al mirar la primera parte el 23 de septiembre ([0045](0045-el-aspecto-y-el-orden.md)):
poco texto, lo esencial a la vista, nada de huecos y aspecto de aplicación de ahora.
Y con su instrucción de fondo para esta entrega: «hazlo todo bien, sin dejarte nada,
para que esta app sea profesional».

## Lo que se decide

### Uno · Los vacíos: un dibujo y un botón que hace lo que dice

- **El dibujo es obligatorio en `EstadoVacio`**, como la frase. Si fuera opcional,
  dentro de un año habría vacíos con dibujo y vacíos con el icono de antes, y la
  aplicación volvería a parecer de dos épocas.
- **Veinte dibujos, una familia** (`packages/ui/src/dibujos/`): el mismo lienzo de
  160 × 120, el mismo trazo, un halo del color de la app detrás y su suelo. Se pintan
  **con las fichas** —`stroke-texto-suave`, `fill-superficie`—, así que el mismo
  dibujo sale bien en claro y en oscuro, y el acento llega de fuera como
  `currentColor`: en Inventario son ámbar; en Equipo, violeta.
- **Cada dibujo es su propio trozo** (`import()`): el paquete inicial no crece por
  tenerlos, y quien ve un vacío descarga uno de kilobyte y medio, una vez. El hueco
  se reserva antes de que llegue —la pantalla no salta— y si no llega, el vacío se
  queda con su título y su botón: un adorno no se lleva una pantalla por delante.
  Una prueba vigila que nadie los importe de frente, que todos usen el lienzo común
  y que ninguno lleve un color escrito a mano.
- **Un botón, no tres**, que dice lo que hace: «Añade tu primer producto», «Dar
  acceso a alguien», «Cerrar la caja de hoy». Los que llevan a otra pantalla son
  **acciones del catálogo** ([0020](0020-un-catalogo-de-acciones.md)), así que abren
  exactamente lo mismo que el acceso rápido del Panel o el buscador, y solo salen a
  quien las puede hacer. Si hay una segunda salida razonable —«ponme unos
  ejemplos»—, va **en texto y debajo** (`alternativa`), nunca como otro botón igual.
- **El vacío de un filtro no es el vacío de verdad** (`NadaConEso`): ofrece quitar el
  filtro o borrar lo buscado, nunca crear algo, porque lo normal es que exista y no
  se haya sabido buscar. Y cuando un filtro vacío es buena noticia —«todos tienen
  precio», «ninguna factura con diferencia»— lo dice así, con su dibujo de «todo en
  orden», y ofrece volver a la lista entera.
- **Con la cámara vacía, Inventario · Resumen enseña cómo empezar** y no «Cómo va»:
  el botón que abre el alta y, debajo, los tres pasos que hacen útil Inventario, en
  una línea cada uno. Y **Productos, sin un solo producto, enseña solo el vacío**: la
  barra de filtros decía «Todavía no tienes género» dentro de un desplegable, había
  un «Hacer recuento» de nada, dos botones naranjas y «la cámara vale 0,00 €».
- De paso se quitaron las dos frases sobre el futuro que quedaban en una pantalla que
  se usa —«con una foto, más adelante… llega con el módulo 22», en la hoja de apuntar
  una merma y en Mermas—, por la regla de la 0045.

### Dos · El oscuro, medido en pantalla y fotografiado

- **Se mide el contraste en las pantallas de verdad**, no solo en la paleta
  (`contraste-de-los-temas.spec.ts`): diecisiete pantallas, con datos y vacías, en
  claro y en oscuro, en el ordenador y en el móvil. Cada texto visible contra el
  fondo que tiene debajo de verdad, componiendo las transparencias. El mínimo es el
  de B8.
- **Lo que encontró**, y no estaba en el oscuro sino en el claro: la vista elegida y
  la barra de abajo del móvil llevaban el nombre **en el color de la app**, y en
  claro el ámbar de Inventario sobre blanco da 3,46:1 (el verde de Servicio, 4,11).
  Se arregla en la pieza, no en la pantalla: `acentoParaTexto` mezcla el acento con
  el color del texto, que lo oscurece en claro y lo aclara en oscuro. Sigue siendo
  ámbar; solo que se lee.
- **Las capturas se comparan** (`capturas.spec.ts`): el sistema de diseño entero —las
  seis familias del catálogo del admin, dibujos incluidos— y cinco pantallas de la
  app, en los dos temas; las de la app, también en el móvil. **Treinta y dos.**
  - Las pantallas son las de **Vera**, la gerente del Bar Ribera sembrada para esto:
    ninguna otra prueba entra con ella, así que nadie le cambia lo que sale en la
    foto mientras se hace.
  - **Se comparan en Linux, y solo en Linux**: una letra no se suaviza igual en
    Windows, y una captura de un ordenador no coincide nunca con la de otro. Por lo
    mismo, el trabajo que las compara lleva **su versión de Ubuntu fija**
    (`ubuntu-24.04`): el cambio de GitHub del 19 de octubre las pondría todas en rojo
    sin que la aplicación hubiera cambiado.
  - **Cuando una pantalla cambia a propósito**, la integración continua sale en rojo
    y deja la captura nueva en el artefacto `capturas-nuevas`; `pnpm capturas:traer`
    la baja a su sitio, se mira y, si es lo que se quería, se sube. Una captura que
    falta o no coincide **siempre es un rojo**: ninguna se da por buena sin mirarla.
- **El catálogo del admin se puede ver en oscuro** con un selector propio. El admin no
  tiene tema, y no se le da: el selector pone el tema en la página mientras se mira y
  no lo guarda, porque el almacén del navegador es el mismo que el de la app.

### Tres · La foto de cada producto

- **Mismo camino que el logo** (M5): se sube por la API, a un cubo suyo y privado
  (`fotos-de-producto`), **la fila se escribe después de subir** y la foto vieja se
  borra al final. La fila guarda **las claves** de dos objetos —la foto y su
  miniatura—, nunca una dirección, que caduca (migración `0045`).
- **Se reduce en el teléfono antes de subir**: 800 px de lado y WebP; en Safari, que
  no sabe escribir WebP desde un lienzo y devuelve PNG sin avisar, JPG. Y una
  **miniatura cuadrada de 160 px**, recortada por el centro, para las listas. Lo que
  viaja son unos cien kilobytes, no los cuatro megas de la cámara.
- **El servidor no se fía**: vuelve a comprobar el tamaño y **mira los primeros bytes**
  para ver que es de verdad un WebP o un JPG, diga lo que diga quien llama. La misma
  comprobación la gana el logo.
- **Decide la política de la tabla**, no una copia de ella: antes de subir nada se
  toma la fila con `for update`, que Postgres solo concede si se puede editar —el
  permiso y la zona—. Un cocinero pone la foto de lo de su cocina y no la de la
  barra; quien no lleva Inventario, ninguna.
- **Se firman de una tanda**: una lista de cincuenta productos pide sus enlaces al
  almacén en una sola petición, válidos doce horas (un turno con la lista abierta en
  la tableta). Si el almacén no contesta, la lista sale igual, con las iniciales.
- **Dónde se ven**: en la lista de productos (cuarenta píxeles, cargando cuando se
  ven), en la ficha —pequeña, al lado de lo que es, para no empujar hacia abajo lo que
  hay en cámara; tocándola se ve grande y ahí se cambia o se quita— y en el recuento,
  que es donde más ayuda reconocer un producto de un vistazo.
- **Sin foto**, la inicial en un recuadro del color de su categoría (`FotoDeProducto`):
  una lista con diez fotos y cuarenta productos sin ella no parece a medias.
- **La foto es de la ficha de ese local.** En M24, la del catálogo maestro de una
  cadena se heredará.

## Lo que no se hace, y por qué

- **Leer la foto** —que Estook sepa qué producto es, o lea un albarán— es M22.
- **Pedir la foto en el alta del producto**: el alta es de quince segundos y la foto
  no hace falta para empezar. Al crear, se abre la ficha, que es donde se pone.
- **Un cubo público**, que dejaría cachear las fotos para siempre: las direcciones
  serían permanentes y de cualquiera que las tuviera. Se queda privado, como el logo.
- **Tema oscuro en el admin**: es una herramienta de dentro; lo que tenía que poder
  verse en oscuro eran las piezas de la app, y se ven.
