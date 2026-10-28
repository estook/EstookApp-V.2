# 0086 · Las respuestas de M9: un solo plato, la carta adelantada, los canales con su precio a mano y la receta sin versiones a la vista

**Fecha:** 15 de octubre de 2026
**Estado:** contestado por Richi el 15-oct. La primera entrega (**M9 · 1 · El plato y tu carta**) se construye a continuación, en su pull request.
**Cambia:** el [Manifiesto](../maestros/Estook-Manifiesto.md) (capítulos 9, 13 y 14), el [Plan](../maestros/Estook-Plan-de-Desarrollo.md) (B5, M9 y M10), [el mapa](../MAPA-de-modulos.md) y [el plan de M9](../historia/modulos/m9-escandallos.md).

Las cinco preguntas del plan de M9 se le hicieron a Richi en llano el 15-oct. Contestó las cinco, añadió dos (los precios por canal y el orden en que el hostelero monta las cosas) y aclaró para qué sirve cada pieza. Esto es lo que queda.

## Para qué sirve cada pieza (Richi, 15-oct)

| Pieza             | Para quién                                   | Qué dice                                                                                                        | Qué **no** lleva                                    |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Carta**         | Quien lleva el local y el cliente            | Lo que se vende, **por secciones**, y a cuánto en cada canal. De ella salen el diseño para imprimir y la online | Ni ingredientes ni costes                           |
| **Ficha técnica** | **Cocina y sala**, para saber hacer el plato | Lo que lleva, en gramos (los mismos del escandallo), y **los pasos**. Se imprime o se lleva en PDF              | **Ni un euro**                                      |
| **Escandallo**    | Quien ve costes                              | Todo desgranado: cada ingrediente con su peso, su precio y su parte; el coste, el food cost y el margen         | Nada escrito a mano: sale de la ficha y del Almacén |

**El diseño de la carta para imprimir** —que el local no tenga que pagar a un diseñador— es M11, y **la carta online personalizable**, M12. Los dos leen de esta Carta.

## Las respuestas

| #   | La pregunta                                            | Lo que decidió Richi                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ¿Dónde nace el plato y su precio?                      | **Se adelanta la base de la Carta a M9**, y M9 va en dos entregas. Nada se queda a medias: el precio nace donde va a vivir siempre                                                                                                                                                                                                                                              |
| 2   | ¿Las elaboraciones, con stock?                         | **A**: en la primera parte, para el coste y los alérgenos, «como lo hacen los mejores, lo más lógico para el hostelero». Cada elaboración dice **cuánto sale** («rinde 2 litros») y así se sabe lo que cuesta el litro. Su stock llega con la hoja de producción                                                                                                                |
| 3   | ¿La desviación de los platos, ya o con el TPV?         | **B**: se construye y se prueba, y **se enseña sola cuando la caja traiga lo vendido plato a plato** (Estook TPV). Mientras tanto, el food cost teórico de cada plato junto al real                                                                                                                                                                                             |
| 4   | ¿Valor nutricional?                                    | **A**: solo alérgenos. La nutrición, cuando el catálogo de Estook traiga los datos de cada producto                                                                                                                                                                                                                                                                             |
| 5   | ¿Cuándo se guarda una versión nueva de la receta?      | **C, sin versiones a la vista**: al cambiar la receta se confirma y se guarda, y **esa es la receta de ahora**. Un **historial plegado** dice quién cambió qué y cuándo, deja **ver la de antes y recuperarla**. «Mantener Estook limpio, intuitivo y organizado»                                                                                                               |
| 6   | Los precios por canal                                  | **Una sección propia, «Canales»**, no en Ajustes: con **todas las plataformas programadas** y, de momento, **solo Uber Eats para activar**, que es la que se usa. **El precio de cada plato en cada canal se pone a mano**, que es como se hace («no suelen poner un porcentaje más»). Sin precio en un canal, vale el de sala. El margen por canal, con su comisión descontada |
| 7   | ¿Primero la carta y después el escandallo, o al revés? | **Primero la carta**: el hostelero ya la tiene en la cabeza (o en papel, o en el TPV), y casi nunca tiene fichas. Monta sus platos y Escandallos le dice cuáles le faltan por **desgranar**: pone el ingrediente y el peso, y Estook saca el precio del Almacén                                                                                                                 |

## Lo que queda

### Un solo plato, que se crea una vez

El plato es **uno**, con su identificador, y la Carta y Escandallos son dos maneras de mirarlo: **no se copia ni se enlaza a mano**. Se crea desde la Carta —el camino normal— y aparece en Escandallos como «sin ficha». Las **elaboraciones** (la salsa, el caldo) no se venden: nacen en Escandallos y nunca salen en la Carta.

Esto corrige el Manifiesto, que decía que «los platos viven en Escandallos y la Carta solo los coloca y nunca escribe». Ahora **la Carta es la dueña de lo que se vende** —nombre, sección, descripción, foto, precios— y **Escandallos, de lo que lleva y lo que cuesta**. Cada dato sigue teniendo un solo dueño, que es lo que pedía la 0049.

### M9 en dos entregas, y lo que se queda M10

| Entrega                                       | Qué trae                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M9 · 1 · El plato y tu carta**              | **Secciones** que se crean y se ordenan; **platos** con nombre, sección, descripción, foto y **precio de sala** (con IVA, como en la carta de papel); **añadir varios de golpe** (nombre y precio, fila a fila); **Canales** con su comisión y su envase, y **el precio de cada plato en cada canal**; archivar y recuperar; **el historial del plato** (quién cambió qué precio y cuándo); y **el buscador encuentra los platos**                |
| **M9 · 2 · Fichas y escandallos**             | **«Sin ficha»** con cuántos faltan por desgranar; lo que lleva cada plato y cada elaboración (con lo que rinde), **el coste, el food cost y el margen por canal**, el precio recomendado, **los alérgenos** sumados, **el modo cocina** sin importes, **la ficha impresa o en PDF**, «qué ha cambiado», el historial de la receta con recuperar, y lo de M8: el food cost teórico y la desviación de los platos (construida, enseñada con el TPV) |
| **M9 · 3 · Lo que la hace una app de verdad** | Extras y sustituciones, escalar raciones, «ya la sé», la hoja de producción del día **con el stock de las elaboraciones**, y la ficha con QR a la receta viva                                                                                                                                                                                                                                                                                     |
| **M10, lo que queda**                         | Agotado desde el móvil, menús y fórmulas con su reparto de precio, el menú del día, **el orden de la carta como se imprime** (destacados, columnas), la matriz de qué platos dan dinero por canal, el equilibrio de la carta, la comparación con la zona, **leer la carta que el local subió** y **el precio al cierre de caja**                                                                                                                  |

M9 · 3 existía ya en el plan de M9 como «la segunda entrega»; al adelantar la Carta pasa a ser la tercera. Nada desaparece: cambia el orden.

### Los canales

- **Están todos programados**: Sala, Para llevar, Uber Eats, Glovo y Just Eat. **Hoy se pueden activar Sala (siempre) y Uber Eats**; los demás salen como «Próximamente» y encenderlos es cambiar una línea del catálogo (`CANALES_DE_VENTA`).
- **Cada canal activo** lleva **su comisión** («30 %») y, si se quiere, **el coste del envase** por pedido. Se ponen una vez, en Carta › Canales.
- **Cada plato** lleva su precio de sala y, **en cada canal activo, su precio a mano**. Si un canal no tiene precio, vale el de sala, y la pantalla lo dice («igual que sala»).
- **El margen por canal** (M9 · 2) es: precio sin IVA − comisión − envase − coste del plato. «Sala: te deja 9,76 € · Uber Eats: 6,12 €», y un aviso si en algún canal **se pierde dinero**.
- **Activar un canal en Estook no lo conecta**: es su lista de precios. Recibir los pedidos de Uber Eats es Estook Link (M29), y publicar la carta en la plataforma, también.

### La receta, sin versiones a la vista

Una sola receta, la de ahora. Al cambiarla (M9 · 2) se pide confirmar y se guarda; **cada guardado queda en el historial** con quién, cuándo y qué cambió («carne 180 → 200 g»), y desde ahí **se ve la de antes y se recupera** (que es otro guardado más). Que suba el aceite **no** apunta nada: el coste se recalcula solo. **Lo vendido se sigue contando con la receta que había ese día** (Manifiesto 13: nunca se recalcula el pasado), y para eso el historial guarda cada receta entera, aunque en pantalla solo se vea la de ahora. No hay comparador de versiones: el historial dice qué cambió.

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **El precio va con IVA**, como en la carta de papel y en Uber Eats. El margen se calcula sin él (regla del Plan).
2. **La comisión del canal es un porcentaje** sobre el precio con IVA, que es como la cobran las plataformas; el envase, en euros por pedido.
3. **Un plato sin sección** es posible —«Sin sección»— para no frenar a quien añade de golpe; se coloca después.
4. **Quitar una sección con platos** no los borra: pasan a «Sin sección».
5. **Archivar** un plato lo quita de la carta y de las listas sin borrar nada; se recupera desde «Archivados». **Nada se borra** (principio 6).
6. **Quién toca la carta**: quien tiene Carta para editar —quien lleva el local, el jefe de sala y el jefe de cocina, como ya decía la matriz—. Cambiar un precio **vale al guardarlo dentro de Estook**; «publicar la carta» sigue siendo enseñarla fuera (el QR y las plataformas), y es de quien tiene ese permiso.
7. **Los canales los configura** quien edita la Carta. El camarero ve la carta y sus precios, pero no las comisiones.
8. **El historial del plato** apunta lo que cambia la persona: crearlo, renombrarlo, cada precio, la sección, archivarlo. Con quién y cuándo, en una línea cada cosa.
9. **Dos platos no pueden llamarse igual** en el mismo local (sin contar mayúsculas ni acentos): el cierre de caja y el TPV los emparejan por nombre la primera vez.
10. **La foto del plato** va en el mismo cubo y con el mismo recorte que la del producto.

## Lo que decidí al construir M9 · 1

1. Que **el historial del plato sea la auditoría** (`estook.anotar`, con su antes y su después): ya guardaba quién y cuándo, y una tabla aparte sería otra copia de lo mismo. `un_plato` enseña las treinta últimas líneas.
2. Que **ordenar sea con flechas** («Ordenar» en cada sección para sus platos; la sección, con «Subir» y «Bajar» en su hoja, para no llenar de botones su cabecera en el móvil), no arrastrando: con el dedo en una lista que se desplaza, arrastrar se confunde con bajar. Arrastrar, si se echa de menos, va en las propuestas.
3. Que **crear un plato que estaba archivado lo recupere**, con su historial, en vez de decir que ya existe: es lo que se quiere cuando se vuelve a añadir.
4. Que **«sin ficha» vaya en M9 · 2**, junto a desgranar: un número de lo que falta sin poder hacerlo sería un cartel sin botón.
5. Que **la ficha del plato diga lo que se lleva cada plataforma y lo que queda** («Uber Eats se lleva 3,75 €: te quedan 8,75 €») desde ya: el margen con el coste llega con el escandallo, pero la comisión ya se sabe.
6. Que **el buscador encuentre los platos** (la 0068 copia entera la función de la 0067 y añade su bloque), a quien tiene Carta.
7. Que el cocinero **no vea la Carta**: la matriz de roles no se la da (lo suyo es la ficha, sin importes, en M9 · 2).
8. Que la tabla de los canales del local se llame `canal_de_venta_del_local`: `canal_del_local` era ya el nombre de un índice del chat (lección 184).

## Lo que no se hace, y por qué

- **Un porcentaje automático por canal** («Uber Eats = sala + 15 %»): Richi, «no suelen poner solo un porcentaje más, suele ser a mano cada plato». A mano, y sin precio vale el de sala.
- **Los precios en Ajustes**: «lo hacemos interminable». Van en la Carta, que es donde se miran.
- **Las versiones a la vista y el comparador**: ensucian la pantalla. El historial dice lo mismo, plegado.
- **La nutrición**: hasta que el catálogo traiga los datos de cada producto.
