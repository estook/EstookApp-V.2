# 0045 · El aspecto y el orden: cada app abre con su Resumen, las tarjetas van en mosaico y Ajustes va por secciones

**Fecha:** 23 de septiembre de 2026
**Estado:** decidido y construido en la rama `v-lo-que-se-ve` (entrega V, punto 3, y la mejora 7 adelantada). **Sin fusionar**
**Cambia:** B3, B4 y B5 del Plan de desarrollo · [0018](0018-destinos-y-vistas.md) (el nombre del primer destino) · [0039](0039-el-panel-se-monta-como-un-movil.md) (el alto de los widgets)
**Migración:** ninguna

## De dónde sale

Richi, el 23 de septiembre de 2026, mirando Inventario, el Panel y Ajustes en su TPV
con el tema oscuro. Contestó la pregunta del punto 3 y trajo cinco cosas más:

| Lo que dijo                                                                                                 | Lo que se decide                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| «Cambia Hoy a Resumen, para que sea más claro que ahí va a estar todo el resumen de la aplicación»          | **Uno** · el primer destino se llama «Resumen»                                                       |
| «Es súper largo hacia abajo, hay campos vacíos enormes; que si una ocupa más, que ocupe más, y se coloquen» | **Dos** · las tarjetas van en mosaico, en las apps y en el Panel                                     |
| «Leche semidesnatada: casi nueve líneas de texto. Hay mucho texto en la aplicación»                         | **Tres** · un aviso en tres líneas, y lo demás plegado                                               |
| «En Ajustes pones todo en cascada. Que vaya por ramas, por secciones o desplegables»                        | **Cuatro** · Ajustes por secciones, con buscador (la mejora 7, que era de la entrega O, se adelanta) |
| «La aplicación parece de los 2000. Las tarjetitas son muy feas»                                             | **Cinco** · el aspecto nuevo: tarjeta, cabeceras, etiquetas y tema oscuro                            |

Y la instrucción de fondo, que es la de siempre: «hazlo de la manera más óptima, más
limpia y que menos raye a la gente que no entiende la aplicación». No se ha copiado
ninguna aplicación; se ha hecho lo que hacen las buenas —el iPhone, Linear, Stripe,
Notion— con los mismos problemas.

## Lo que se decide

### Uno · Cada app abre con su «Resumen»

El primer destino de Inventario, Escandallos y Equipo pasa de «Hoy» a **«Resumen»**
(`/inventario/resumen`, `/equipo/resumen`). Es la misma pantalla que ya abría la app
—lo urgente arriba y «Cómo va» debajo (0044)—, así que **B5 no gana un quinto
destino**, que era lo que impedía hacer un «Inicio» aparte: Inventario ya tiene sus
cuatro construidos.

- **En Equipo, el destino que se llamaba «Resumen» pasa a «Fichajes»**
  (`/equipo/fichajes`): son las horas de cada uno frente a su contrato, que salen de
  los fichajes. Dos «Resumen» en la misma app serían dos puertas con el mismo cartel.
- **Se entra al Resumen solo al abrir la app**, como pedía el plan: una acción, un
  aviso o el buscador siguen llevando directo a lo pedido.
- **Servicio no cambia:** abre en Jornada · Cierre, que ya lleva sus cifras. Tiene sus
  cuatro destinos, y un Resumen aparte le quitaría uno a algo que funciona.
- Una dirección vieja (`/inventario/hoy`) no rompe nada: un destino que no existe lleva
  al primero de la app, que es el Resumen.

### Dos · Las tarjetas van en mosaico

**El fallo:** una rejilla CSS reparte filas, y una fila mide lo que su tarjeta más
alta. Con «Lo que necesita tu atención» a novecientos píxeles, las de al lado se
estiraban hasta ahí con un hueco vacío dentro; y el Panel, además, daba a cada fila un
alto mínimo y a «grande» un doble alto fijo.

**Lo que se hace:** columnas que se llenan por la más corta, como Pinterest, Keep o
los widgets del iPad. Sin librería: la misma rejilla con filas de cuatro píxeles, cada
pieza mide su alto con un `ResizeObserver` y dice cuántas ocupa, y el flujo denso de
CSS la pone en el primer hueco donde cabe.

- `Mosaico` y `Pieza` en `@estook/ui`; la medida, en `usarFilasDelMosaico`, y **la
  misma medida la usa la casilla del Panel**. El Panel y las apps se colocan igual.
- **El tamaño de un widget decide su ancho y cuánto enseña, no su alto.** «Grande»
  sigue enseñando más filas; el alto lo pone lo que lleva.
- El orden de lectura no cambia: es el de la lista, el que se guarda y el que recorre
  el tabulador.
- En el Resumen de Inventario, lo urgente va en el mosaico y **«Cómo va» debajo, a todo
  lo ancho** (lo decidido en la 0044). En Equipo, las dos listas de gente van en
  mosaico.

### Tres · Menos texto: un aviso en tres líneas

Cada aviso de «Necesita tu atención» dice **qué es** (el producto y su estado, que abre
la ficha), **cuánto y cuándo** («0 l de 3 l de mínimo · se agota hoy a las 12:55») y
**qué hacer** («Pide 1 × Caja de 6 botellas» y el botón de pedírselo). La cuenta de por
qué esa cantidad **no se quita: se pliega en «¿Por qué?»**. La regla de las alertas
(qué, por qué, impacto y botón) se sigue cumpliendo entera.

- **Los cuatro más urgentes a la vista** y «Ver todos» en la misma tarjeta. Antes se
  cortaba en ocho sin decirlo.
- **Lo que todavía no existe sale de las pantallas que funcionan.** La tarjeta «Y lo
  que falta por venir» y los botones apagados «Con una foto · M22» (Resumen, widget de
  merma, recuento y cierre de caja) se quitan. Lo que llega está en el menú («Llega
  después») y en el plan. Las vistas pendientes del control segmentado se quedan: ahí
  no le quitan el sitio a nada (B5).
- **El menú lateral dice el nombre**, y la pregunta de cada destino sale al pasar el
  ratón. La del destino en el que se está ya va debajo del título.
- **El enlace de cada tarjeta dice «Ver ›»**, y quien usa un lector de pantalla oye el
  nombre entero («Ver pedidos»). Era lo que partía los títulos en dos líneas.

### Cuatro · Ajustes por secciones, con buscador

Cinco secciones, porque el aparato, la persona, el local y la organización no son lo
mismo:

| Sección          | Qué lleva                                               | Quién la ve                                 |
| ---------------- | ------------------------------------------------------- | ------------------------------------------- |
| **Este aparato** | Letra, tema y modo cocina, en una tarjeta               | Todos                                       |
| **Mi cuenta**    | Contraseña, PIN, doble factor, sesiones, idioma y salir | Todos                                       |
| **Tu local**     | Marca, dónde está el local, cuándo es llegar tarde, IVA | Quien tiene local; lo demás, quien lo lleva |
| **Conexiones**   | Cómo entran tus ventas y Google                         | Quien lleva el local                        |
| **Organización** | Doble factor para todos y correo de recuperación        | Quien lleva la organización                 |

- **En el ordenador**, las secciones a la izquierda y la elegida a la derecha. **En el
  móvil**, la lista con lo que hay en cada una, y al tocar se entra; «‹ Ajustes» vuelve.
- **Cada sección tiene su dirección** (`/ajustes/aparato`) y cada ajuste su ancla
  (`/ajustes/local#donde-esta-el-local`): el aviso de Equipo y el buscador llevan al
  sitio exacto.
- **El buscador** busca por lo que la gente escribe —«clave», «IVA», «logo»,
  «oscuro»— entre los ajustes que esa persona ve, **y los mismos salen en el buscador
  universal**. Hay un solo catálogo: `pantallas/lasSeccionesDeAjustes.ts`.
- **La sección «Equipo» del plan de la mejora 7 no se crea en Ajustes:** quién tiene
  acceso, invitar y los roles ya viven en Equipo · Personas, y dos sitios para lo mismo
  acaban diciendo cosas distintas (regla 6).

### Cinco · El aspecto nuevo

Lo que hacía vieja la aplicación no era un color: eran cuatro cosas a la vez.

| Antes                                                     | Ahora                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Borde duro y sombra de un píxel                           | Borde suave y **sombra en dos capas** (`--sombra-tarjeta`), que en oscuro es un filo de luz |
| Esquinas de 16 px                                         | **24 px**, las de un widget del iPhone                                                      |
| Una línea de color de 3 px encima de cada tarjeta         | **El icono de la app en su pastilla**, en la cabecera de la pantalla y de cada tarjeta      |
| Etiquetas, pies y rótulos en MAYÚSCULAS GRISES ESPACIADAS | En minúscula y en su gris. El origen de cada cifra se sigue escribiendo                     |
| La banda de 6 px con el color del local en el Panel       | **Un velo de su color** que entra por la esquina                                            |

- **La tarjeta se adapta a su propio ancho** (`@container`): en un widget estrecho, el
  icono cede su sitio al título y el relleno baja. Un widget pequeño en un monitor es
  tan estrecho como en un móvil.
- **El tema oscuro, un punto más hondo**: fondo `#0c1113`, tarjeta `#151c1f`. Medido
  con `contraste.prueba.ts`, como todo.
- **Y dos fallos que el repaso encontró, con su prueba:**
  1. **Lo elegido no se leía en oscuro.** «7 días», «Listo» y el tamaño de un widget
     iban en `bg-charcoal text-superficie`: la superficie oscura sobre el charcoal, a
     1,4:1. Ahora van invertidos (`bg-texto text-superficie`), que se lee en los dos
     temas, y una prueba no deja volver a escribir la mezcla vieja.
  2. **«El del sistema» en claro no era el tema claro**: llevaba el fondo `#fafaf8`
     de B1 y cuatro colores de antes. Ahora es el claro cifra a cifra, y una prueba lo
     compara. (Era el punto que el 5 de V tenía apuntado.)

## Lo que no se decide aquí

- **Los estados vacíos con dibujo** (punto 4 de V) y **las capturas del tema oscuro que
  se comparan en la prueba** (punto 5) siguen pendientes.
- **Las demás pantallas de lista** (Productos, Movimientos, Compras) ya ganan la tarjeta
  y las etiquetas nuevas; su orden no cambia, porque son listas y no tarjetas.
- **El admin** usa las mismas piezas de `@estook/ui`, así que gana la tarjeta nueva; sus
  pantallas no se han repasado una a una.

## Cómo se comprueba

- `apps.prueba.ts`, que lee la tabla B5 del Plan: Inventario, Escandallos y Equipo
  empiezan por «Resumen», y Equipo tiene «Fichajes».
- `contraste.prueba.ts`: el oscuro nuevo con los mínimos de B8, «el del sistema» igual
  al claro, y ninguna pieza con la superficie encima del charcoal. **Las dos pruebas
  nuevas se vieron fallar** con el arreglo quitado.
- Las pruebas de pantalla van a las secciones de Ajustes por su dirección, y las del
  Resumen lo buscan por su nombre nuevo.
