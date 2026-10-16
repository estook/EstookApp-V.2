# 0087 · Fichas y escandallos (M9 · 2), y la carta que vincula, cuenta raciones y dice lo que pica

**Fecha:** 16 de octubre de 2026
**Estado:** construido en la rama `m9-fichas-y-escandallos`, en su pull request. Hay que fusionar, migrar (la `0069`) y desplegar la API.
**Cambia:** el [Plan](../maestros/Estook-Plan-de-Desarrollo.md) (B5: las vistas de Escandallos · Fichas), [Roles](../maestros/Estook-Roles-y-Administracion.md) (1.3 y 1.5: la sala ve las fichas), [el mapa](../MAPA-de-modulos.md) y [el plan de M9](../m9-escandallos.md).

Richi, el 16-oct, con M9 · 1 en producción, pidió dos cosas: **arreglar y mejorar la Carta** (tres puntos) y **construir M9 · 2** con lo que es cada pieza para él. Esto es lo que queda.

## Lo que pidió Richi

**La Carta (A, B y C):**

| #   | Lo que pidió                                                                                                                                                                                                                                                   | Lo que hay                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Un botón con el icono de **vincular** para enlazar un producto del Almacén y llevarlo a la carta: el chuletón, el pescado entero, las bebidas, **lo que se vende por unidades**, «de golpe». Lo que llega entero y se corta (el lomo de 20 kg) se **desgrana** | **«Desde el almacén»** en la Carta: se marcan varios productos en unidades, se les pone precio y entran **ya vinculados**. Y en la ficha de cada plato, **«Vincular»** (y «Quitar»). La fila lleva la cadena                    |
| B   | **Las unidades de la ración** para el cliente («8 croquetas»), opcional y sin estar siempre a la vista                                                                                                                                                         | **«Unidades por ración»**, dentro del plegable de la ficha. La fila dice «8 ud»                                                                                                                                                 |
| C   | Elegir **los alérgenos** y si **pica**, en una sección plegable, **con su dibujo** (el chile y los alérgenos de siempre)                                                                                                                                       | **«Alérgenos, picante y más»**: los catorce con su dibujo y su color, el picante en tres guindillas y, además, **vegetariano y vegano**. Los que trae la receta ya están marcados y no se quitan. Los iconos salen en cada fila |

**M9 · 2**, con lo que es cada pieza para él:

- **La ficha** es para camareros y cocineros sobre todo (pero la ven todos): los gramos y los pasos, **sin euros**, para imprimir o llevar en PDF.
- **El escandallo** lo desgrana todo con pesos y precios, con **el margen por canal**.
- **La carta** es lo que se vende, por secciones y a cuánto.

Y la lista: «sin ficha»; lo que lleva cada plato y cada elaboración, con lo que rinde; el escandallo con el margen por canal; los alérgenos; el modo cocina; la ficha en PDF; el historial de la receta con «recuperar» (sin versiones a la vista); y la desviación de los platos, oculta hasta el TPV. **Está todo.**

## Lo que queda

| Dónde                           | Qué                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Escandallos › Resumen**       | Cuántos platos tienen ficha («4 de 6») y, a quien ve costes, **el food cost de la carta**, **cuántos pasan del objetivo** y **cuántos pierden dinero en algún canal**. Debajo, las listas: los que pierden dinero, **«Sin ficha»** y los que pasan del objetivo. Si no hay platos, lleva a la Carta             |
| **Escandallos › Fichas**        | Los platos de la carta por secciones, con sus alérgenos y su food cost con su color. «Sin ficha» y «Bajo objetivo» **solo salen si tienen algo**                                                                                                                                                                |
| **Escandallos › Elaboraciones** | La salsa, el caldo: con **lo que rinde**, **lo que cuesta el litro o el kilo** y en cuántas recetas entra. Se archivan sin romper nada                                                                                                                                                                          |
| **La ficha** (un panel al lado) | Arriba, «**Ficha · Escandallo**». La ficha: lo que lleva en gramos y los pasos. El escandallo: coste, food cost frente al objetivo, **precio recomendado**, **lo que te deja en cada canal** (y «Pierdes dinero» si es el caso) y el desglose línea a línea con su parte. **Editar**, **Modo cocina** y **PDF** |
| **Escribir la ficha**           | Fila a fila, como «Añadir platos»: se busca el ingrediente entre el Almacén y las elaboraciones, la cantidad y su unidad (g o kg, ml o l, ud), una nota si hace falta. **Si no está, se crea en el Almacén** desde ahí. Los pasos, igual. Y el tiempo y las notas                                               |
| **El historial**                | Plegado: quién cambió qué y cuándo, «Carne picada: 180 g → 200 g». **«Ver cómo era»** y **«Recuperar»**                                                                                                                                                                                                         |
| **El modo cocina**              | A pantalla completa: primero lo que lleva, con letra grande, y después **un paso por pantalla**. Se pasa deslizando, con las flechas grandes o con el teclado. **Ni un euro**                                                                                                                                   |
| **El PDF**                      | La ficha en papel, con el logo del local: alérgenos, lo que lleva y los pasos. **No recibe ni un importe**                                                                                                                                                                                                      |
| **La desviación de los platos** | Construida y probada (`la_desviacion_de_los_platos`): lo que se debía gastar según lo vendido y **la receta de cada día**, frente a lo gastado. **No se enseña** hasta que la caja traiga lo vendido plato a plato (Estook TPV)                                                                                 |
| **La base** (`0069`)            | `elaboracion`, `receta`, `linea_de_receta` y `receta_guardada`, todas con seguridad por filas; y el plato gana unidades por ración, alérgenos, picante y distintivos. **116 tablas**                                                                                                                            |
| **La API**                      | **90 consultas y 194 comandos** (cinco y seis nuevos). `bd:comprobar-api` comprueba lo que deja la 0069                                                                                                                                                                                                         |

### Cómo lo hacen los mejores, y lo que se ha cogido

Las herramientas de recetas y escandallos para restaurantes que más se usan coinciden en cinco cosas, y están todas:

1. **La ficha de cocina y el coste son la misma receta en dos caras**: una pestaña para cocina y otra para costes, no dos documentos.
2. **Las preparaciones (salsas, fondos) son recetas con su rendimiento**, que se usan dentro de otras, y su coste baja solo al plato.
3. **Los alérgenos se calculan de los ingredientes**, y el plato los hereda de sus preparaciones.
4. **Un modo cocina** paso a paso, con letra grande y sin precios.
5. **El margen por canal**, con la comisión de cada plataforma, y el aviso del plato que pierde dinero en reparto.

Lo que **no** se ha cogido: las versiones a la vista y el comparador (Richi: «mantener Estook limpio»), y los precios por porcentaje automático por canal (0086).

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **La ficha la ven todos.** El camarero y el jefe de sala reciben Escandallos **para ver** (el cocinero ya lo tenía). Sin `dato.coste_de_plato`, el servidor no les manda ni un euro: ni el escandallo, ni el coste de una línea, ni el food cost de la lista.
2. **Ficha y escandallo, en el mismo panel**, con dos pestañas. La de «Escandallo» solo existe para quien ve costes.
3. **Vincular es la ficha entera**: «este plato es una unidad de ese producto». Cuenta como desgranado, cuesta lo que la unidad y Estook sabe qué se vende. **Solo productos en unidades.** Un plato que ya tiene una ficha de varios ingredientes no se pisa con un vínculo; desvincular lo deja sin ficha.
4. **Los alérgenos de un plato son los de su receta más los puestos a mano** en la carta. Los de la receta **no se quitan desde la carta**: si la mayonesa lleva huevo, el plato lleva huevo.
5. **El picante va en tres niveles** (no, una, dos o tres guindillas). Y **vegetariano y vegano** (vegano ya es vegetariano). **«Sin gluten» no**: es una promesa sobre trazas que Estook no puede comprobar.
6. **Las unidades de la ración son un dato de la carta**, opcional y plegado: no salen de la receta, porque «8 croquetas» se decide al emplatar.
7. **El coste no se guarda: se calcula cada vez** con el Almacén de ese momento (el precio medio, o el de hoy si lo que hay entró sin coste, como el valor de la cámara). Que suba el aceite no apunta nada y el escandallo ya lo sabe.
8. **Sin el precio de un ingrediente no hay coste**, ni uno a medias: se dice «falta el precio de 1 ingrediente», también si falta dentro de una elaboración.
9. **Las cantidades se escriben como se cocina**: gramos o kilos, mililitros o litros, unidades. Se convierten dentro de su familia y **nunca entre familias** (100 g de leche no son 100 ml).
10. **Lo repetido se suma**: si la carne entra dos veces, queda una línea y se avisa.
11. **El precio recomendado** es el que deja el food cost en tu objetivo, con IVA, redondeado a 0,10 € hacia arriba. **«Pasan del objetivo»** son los que están en ámbar o en rojo.
12. **Lo que te deja un canal** = precio sin IVA − comisión (un porcentaje del precio con IVA) − envase − coste (0086).
13. **El historial guarda cada guardado entero.** Guardar sin cambios no apunta nada; recuperar es otro guardado que dice «Recuperó la del 12 oct». Se ven los veinte últimos.
14. **Un ingrediente que no está se crea desde la ficha**, en el Almacén, sin precio y con su unidad. Solo quien edita el Almacén.
15. **El modo cocina** empieza por lo que lleva (es lo que se prepara antes) y sigue un paso por pantalla.
16. **El PDF de la ficha no recibe importes**: el documento ni los pide.
17. **Archivar una elaboración no rompe nada**: lo que ya la lleva sigue costando igual; deja de salir para añadir.

## Lo que decidí al construirlo

1. Que **la hora de cada guardado la ponga el servidor** (`contexto.ahora`), no la base: así la desviación sabe qué receta valía cada día, y las pruebas lo pueden comprobar con fechas de verdad.
2. Que **lo vendido de cada plato salga de las líneas de la caja que se llaman como él** (sin mayúsculas ni acentos, los dos lados igual: 0086, punto 9). Y que en la desviación de los platos **solo se dé por explicado lo tirado**: lo sacado a cocina es justo lo que los platos tenían que gastar.
3. Que **los catorce alérgenos y el chile** vayan con el mismo trazo que el resto de la app: ocho son de Lucide (licencia ISC) y siete, dibujados aquí. Sus colores son los de los pictogramas de siempre, oscurecidos para que el blanco se lea encima.
4. Que **el motor del escandallo viva en el dominio** (`escandallo.ts`) y sea dueño de su redondeo: suma en milésimas y redondea una vez, al final (regla 9; entra en la lista de la configuración del linter con los otros motores).
5. Que **los canales del local vivan aparte** (`canales-del-local.ts`): los leen la Carta y el escandallo, y así no se llaman en círculo.
6. Que **«Análisis» de Escandallos siga con su cartel**: es «qué ha cambiado y por qué», que va con M9 · 3.
7. Que en las listas **los iconos vayan en una línea** (lo de al lado se recorta) y en la ficha, **con su nombre**: es lo que la sala lee para contestar.

## Lo que no se hace, y por qué

- **«Qué ha cambiado»** (el aceite sube un 12 % y afecta a 7 platos): no estaba en lo pedido para M9 · 2 y el coste ya se recalcula solo. Va con **M9 · 3**.
- **Empezar una ficha desde una receta de referencia**, **las fotos de los pasos**, **escalar raciones**, **extras**, **«ya la sé»**, **la hoja de producción** y **el QR**: **M9 · 3**.
- **Que el buscador encuentre las elaboraciones** (y los platos a quien no tiene Carta, como el cocinero): **M9 · 3**, copiando entera la función del buscador.
- **La ficha en el idioma del cocinero y dictar «siguiente»**: Fogón (M22).
- **Enseñar la desviación de los platos**: con Estook TPV, cuando la caja traiga lo vendido plato a plato (0086, 3B).
