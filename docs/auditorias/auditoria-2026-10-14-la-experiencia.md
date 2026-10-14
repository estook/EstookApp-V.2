# Auditoría del 14 de octubre de 2026 · la experiencia, la interfaz y los fallos

Pedida por Richi el 13-oct, con la #100 en producción: «una auditoría completa de fallos, de fallos de lógica y
otra de experiencia de usuario y UI/UX». Hecha mirando la app **con datos** —la API de pruebas con un mes de caja
y de horas (`CON_HISTORIA=1`, `base-de-datos/herramientas/historia-de-ejemplo.sql`)—, en claro y en oscuro, en un
monitor de 1.920, en un portátil de 1.440 y en un móvil de 390, y leyendo el código de cada pantalla que se tocó.

Lo que se hizo con cada cosa está en la decisión [0083](../decisiones/0083-la-experiencia.md). Aquí, **qué se
encontró y por qué importaba**.

## 1 · Fallos

| #   | Qué                                                                                                                                                                                                                                                                                                 | Gravedad | Hecho                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Poner la primera contraseña no pedía nada.** Quien entra con el PIN de su invitación no tiene contraseña, y `cambiar_mi_clave` le dejaba ponerla sin decir nada más. Quien cogiera un móvil con la sesión abierta podía ponerle una contraseña y quedarse con la cuenta. Era la única puerta así. | Alta     | Pide el PIN, comprobado en el servidor con los mismos intentos y el mismo bloqueo que al entrar. Prueba que falla sin el arreglo |
| F2  | **La gráfica de cada cifra no se podía tocar** en la fila «Cómo va» de Almacén, Servicio y Equipo: un botón invisible cubría la tarjeta entera para llevar al detalle, y tapaba la gráfica                                                                                                          | Media    | La gráfica va encima del botón, y tocarla lleva igual                                                                            |
| F3  | **Almacén tenía cinco destinos** y la regla de B5 dice cuatro en la barra del móvil: por eso «Apps» se había mudado a la cabecera (0051), que era un parche                                                                                                                                         | Media    | Movimientos sale de la barra (lo pidió Richi) y vuelven a ser cuatro                                                             |
| F4  | **En un portátil de 1.280 las ocho apps no cabían** en la barra de arriba y había que desplazarla de lado; los desplegables se recortaban (ya se arregló una vez con un portal)                                                                                                                     | Media    | Menú a la izquierda: caben todas, y las que no tienen nada van en «Próximamente»                                                 |
| F5  | **El Panel ofrecía más de cuarenta widgets** y varios decían lo mismo: «Merma», «Merma · 7 días» y «Merma · 30 días»; «Valor de la cámara» dos veces; «Personas» y «Quién está trabajando». Un Panel con dos mermas es posible y no significa nada                                                  | Media    | Dieciséis, cada uno una vez; los Paneles guardados se traducen solos (`MUDANZAS`)                                                |
| F6  | **Los widgets de lo que llega en otro módulo** (Pulse, Fogón, delivery, margen) se ofrecían en gris al añadir: cinco promesas en una pantalla que se usa a diario (0045 decía que no)                                                                                                               | Baja     | No se ofrecen; llegarán con su módulo                                                                                            |
| F7  | En el widget de Compras de hoy, al reescribirlo, «Llega …» abría la recepción a quien no puede tocar el almacén (lo cazó este repaso antes de subirlo)                                                                                                                                              | Baja     | Solo quien puede tocar el almacén; los demás ven el pedido                                                                       |
| F8  | **En el modo cocina oscuro**, con el grafito nuevo, cinco colores se quedaban en 6,8–6,99:1 cuando el modo pide 7:1 (lo cazó `contraste.prueba.ts`)                                                                                                                                                 | Baja     | Aclarados lo justo; la prueba pasa                                                                                               |

Lo que **no es un fallo** aunque lo parezca, y se deja como está:

- Con los **ejemplos puestos**, Productos marca «Por debajo del mínimo» en dos de ellos y el Resumen dice «Nada que
  atender». Es a propósito: los ejemplos «no cuentan para nada» (M5) y se dicen en gris y con «ejemplo» al lado.
  Desaparece al quitarlos.
- El Panel **tarda en pintarse** en la API de pruebas (PGlite, una sola conexión). Medido: todas las consultas del
  Panel contestan en 0,8 s; en Supabase va más rápido. No hay nada que arreglar.

## 2 · La experiencia (lo que hacía la app «liosa»)

| #   | Qué se vio                                                                                                                                                                          | Lo que se hace                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| E1  | **Tres sitios para navegar a la vez** en el ordenador: la barra de arriba con ocho apps, el menú de dentro de cada app y las pestañas. Y 350 px en blanco a cada lado en un monitor | Un solo menú, a la izquierda, con cada app y sus destinos; el contenido ocupa el ancho                        |
| E2  | **Cada pantalla repetía tres veces dónde estás**: migas «Panel › Almacén», «Almacén» encima del título y la pregunta debajo («¿Qué hay en cámara, cuánto cuesta…?»)                 | El título y su app en pequeño; la pregunta, al pasar por encima del destino; las migas, en la barra de arriba |
| E3  | **Todos los widgets iguales**: el mismo marco, un título, una cifra o una lista, y «Ver ›». Nada se distinguía de un vistazo                                                        | Cada uno su dibujo: anillo, área, medidores, barras de nivel, días de colores, caras                          |
| E4  | **Las gráficas eran rayas** sin nada que tocar                                                                                                                                      | Gráficas vivas: el dato al pasar el dedo, y el detalle grande al tocarlas                                     |
| E5  | **Elegir el tamaño y el periodo al añadir** un widget: dos decisiones que nadie sabe tomar antes de verlo                                                                           | Un tamaño por widget; el periodo dentro, y se cambia mirándolo                                                |
| E6  | **Compras con cinco pestañas** sin orden, «nadie acabaría aprendiendo»                                                                                                              | Tres, en el orden del día: Pedidos (con lo llegado) · Facturas · Proveedores (con los precios)                |
| E7  | **Filtros de Productos en tres alturas**, con etiquetas, una frase de ayuda y cuatro botones sueltos                                                                                | Una línea: buscador con el escáner dentro, almacenes en pastillas, categoría y los dos botones                |
| E8  | **Personas en tarjetas de cuatro líneas** en el móvil: cuatro personas no cabían en la pantalla                                                                                     | Una línea por persona: cara, nombre, «En línea / Dirección» y su botón                                        |
| E9  | **El logo del local en un círculo de 24 px** con su color detrás: un logo apaisado quedaba ilegible                                                                                 | Tal cual se sube, más grande y sin nada detrás                                                                |
| E10 | **El oscuro, casi negro azulado**: las tarjetas se perdían                                                                                                                          | Grafito, con brillo en las tarjetas; el menú es oscuro en los dos temas                                       |
| E11 | **Las caras eran iniciales con un aro fino**, y no había fotos                                                                                                                      | Cuadradas con las esquinas redondeadas, rellenas de su color, y con foto si la ponen                          |
| E12 | **El claro y el oscuro estaban a tres toques** (Ajustes › Pantalla)                                                                                                                 | Un sol y una luna en la barra de arriba del ordenador                                                         |

## 3 · Lo que queda mirado y no se toca en esta entrega

- **Ajustes** sigue siendo una pantalla larga de secciones. Ya se plegó en V (0045); con el menú nuevo se lee
  mejor, y rehacerla es otra entrega.
- **El chat, el horario y el cierre de caja** se ven con el aspecto nuevo (fichas, tarjetas, caras) pero no se han
  rediseñado por dentro: Richi no los señaló y funcionan.
- **El admin** (`/admin/`) no cambia: lo usan dos personas.
