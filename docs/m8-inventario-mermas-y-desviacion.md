# M8 · Inventario, mermas y desviación · el plan

**Escrito el 8 de octubre de 2026**, con A4 en producción y «antes de M8» cerrado (leído en la base ese día a las 21:40, en solo lectura: 59 migraciones, 101 tablas, la API con 74 y 163). **Contestado por Richi ese mismo día —las cuatro, A—** ([0078](decisiones/0078-las-respuestas-de-m8.md)), y **la primera entrega, construida** con la migración `0060`. Lo que cambió al construirla, al final de la 0078.

| Pregunta                                        | Queda así                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **1 · La desviación de los platos necesita M9** | **A**: M8 con todo lo demás y lo vendido tal cual; los platos, la calibración y el food cost teórico, con M9              |
| **2 · Quién cuenta y quién cierra**             | **A**, «como lo hagan los mejores»: a ciegas, con el libro de la hora de contar, en cajas y sueltas, y «que lo recuenten» |
| **3 · El mínimo, calculado**                    | **A**: Estook lo propone, se acepta y lo rehace cada lunes; cambiarlo a mano lo apaga                                     |
| **4 · La merma con foto**                       | **A**: si quieres, nunca obligatoria. En la segunda entrega                                                               |

De dónde sale: M8 en la parte D del [Plan](maestros/Estook-Plan-de-Desarrollo.md), «Inventario y Mermas» en el capítulo 12 del [Manifiesto](maestros/Estook-Manifiesto.md), y los hallazgos 2, 3 y 4 de la [Auditoría de flujos](maestros/Estook-Auditoria-de-Flujos.md).

## Qué es M8, en llano

**Saber cuánto género se va sin que nadie lo apunte, y cuánto dinero es.** Hoy Estook sabe lo que entra (los albaranes) y lo que alguien apunta que sale (mermas, ventas, salidas). Lo que falta es la otra mitad: **contar a menudo sin que cueste**, saber **lo que se ha gastado de verdad**, y que la diferencia salga **en euros, producto a producto y con su causa probable**.

| Pieza                    | Qué hace                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| **Toca contar**          | Cada semana, Estook dice qué contar: lo poco que vale mucho. El resto, una vez al mes       |
| **El valor del almacén** | Cuánto dinero hay en cámara hoy o **en cualquier fecha**, por zona y categoría. Se imprime  |
| **Lo gastado de verdad** | Entre dos inventarios: lo que había + lo que entró − lo que queda. En cantidad y en euros   |
| **Food cost real**       | Lo gastado entre lo vendido en la caja, con su semáforo: normal, a mirar, fuga              |
| **La desviación**        | Lo que falta sin explicar, en euros, con la causa más probable y el enlace para comprobarla |
| **Los lotes, solos**     | Lo que sale se resta del lote que antes caduca, y un lote vacío deja de avisar              |
| **El mínimo, calculado** | Con lo que se gasta y los días de reparto del proveedor (la pregunta 3)                     |
| **La merma con foto**    | Un toque más, si quieres (la pregunta 4)                                                    |

## Lo que ya hay

Comprobado en producción el 8-oct:

- **Hacer inventario**, por zonas, con el lector y con un fichero; al cerrar dice **«lo que más bailaba»**. Y su permiso aparte, que tienen quien lleva el local y el jefe de cocina; el cocinero, no.
- **El precio medio ponderado**, guardado en cada línea del libro: el valor de la cámara ya sale de ahí.
- **Las mermas** con motivo y partida aparte (pérdida, comida del personal, invitación), su listado, CSV e impresión.
- **Los lotes** con su caducidad y lo congelado aparte; **el mínimo, a mano**; **el consumo medio y el pedido sugerido** (M7).
- **El cierre de caja** con su total y sus platos (M6½): es de donde salen las ventas.

**En IKATZ**: 16 productos (11 con mínimo), **1 inventario cerrado**, 16 mermas, 32 entradas, 31 salidas, 12 cierres de caja y 21 lotes sin retirar. Pocos datos: **M8 empieza a decir cosas con el segundo inventario**, y lo dice en vez de enseñar ceros.

## Lo que ya está decidido, y no se vuelve a preguntar

| Qué                                                                                                                                             | Dónde                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Inventario cíclico**: cada semana lo que suma el 80 % del valor; el resto, una vez al mes                                                     | Manifiesto 12             |
| **Al consumir, primero lo que antes caduca** (FEFO), no lo que antes entró                                                                      | Auditoría, hallazgo 2     |
| **El food cost real**: (lo que había + compras − lo que queda) ÷ ventas. Menos de 2 puntos de brecha, normal; más de 3, a mirar; más de 8, fuga | Manifiesto 12, hallazgo 3 |
| **La desviación dice por qué**: personal sin apuntar, error de ficha, unidad de conteo, recepción mal apuntada o albarán contra factura         | Auditoría, hallazgo 4     |
| **La comida del personal y las invitaciones**, partida aparte del food cost                                                                     | Manifiesto 12 · 0026      |
| **Corregir el stock nunca bloquea a nadie**: se apunta la corrección con su nombre                                                              | Auditoría 2.5             |
| **El valor, a precio medio ponderado**                                                                                                          | Plan, M8                  |

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia. **Tres se precisaron al construir** —la 1 (sin elegir el día ni salir en «Hoy»), la 2 (el valor, vista de Productos) y la 10 (lo que sobra no crea lote)—: en la [0078](decisiones/0078-las-respuestas-de-m8.md).

1. **«Toca contar», los lunes** (se cambia el día en Ajustes): en «Hoy» del Panel y en la campana de quien cierra inventarios. **Elige por lo que se gasta**, no por lo que hay: un producto caro que no se mueve no se escapa. Mientras no hay datos, por lo que vale en cámara.
2. **Dónde vive**: «Toca contar», «Inventario» y «Desviación», en Movimientos, donde ya está hacer inventario; el valor del almacén y el food cost, en el Resumen. Almacén ya tiene cinco destinos, que es el tope.
3. **Lo contado se guarda en el móvil mientras cuentas.** Si en la cámara se va la señal o se cierra la app, no se pierde nada; para cerrar sí hace falta señal.
4. **La hoja de inventario impresa va sin las cifras del libro**, por zonas y categorías, como la pantalla: un número escrito de antemano se confirma sin mirar.
5. **El valor del almacén en cualquier fecha** sale del libro, que guarda cómo quedó la cámara tras cada movimiento. Con «Imprimir» y CSV; el membrete, con M11.
6. **El food cost real, sin IVA**, por mes natural y entre dos inventarios. Si faltan días de caja, sale con «faltan 3 días de caja» y **no se da como exacto**.
7. **El dinero solo lo ve quien ve precios de compra.** Quien cierra inventarios sin ese permiso ve cantidades; un camarero, nada.
8. **La desviación nunca señala a nadie.** Dice qué producto, cuánto y la causa probable; quién contó o quién recibió está en el libro, no en el informe.
9. **Un aviso en la campana al cerrar un inventario** solo si lo que falta pasa del 3 % de lo gastado. Lo de menos se ve, pero no avisa.
10. **Si en un lote sobra o falta al contar**, se ajusta también por FEFO: lo que falta, del que antes caduca; lo que sobra, a un lote sin fecha.
11. **La merma por voz**: dictar con el micrófono del teclado del móvil ya funciona hoy. Que Estook entienda «tira dos kilos de merluza, caducada» es Fogón (M22).
12. **Se entrega en dos veces**: primero contar, el valor, los lotes y el mínimo; después lo gastado, el food cost, la desviación y la foto. Cada una con su pull request.

## Lo que cuesta · cero

**Nada más al mes.** Todo vive en la base y en la API que ya hay. Si la 4 lleva foto, cada una se reduce en el móvil a unos 80 KB, como las de los productos: en el giga gratuito de Supabase caben unas doce mil. **De Richi no hace falta nada**: ninguna clave nueva.

## Lo que no entra

- **Leer un inventario de una foto** y **entender la merma dicha**: con Fogón (M22).
- **Descontar solo lo vendido del almacén** al cerrar la caja: M20.
- **Los documentos con membrete** (inventario valorado, informe de desviación, etiquetas de cámara): M11. Hasta entonces, «Imprimir».
- **El inventario de toda una cadena**, comparado entre locales: M24.

## Las cuatro preguntas, como se hicieron

Se quedan como se le hicieron a Richi, para que se entienda por qué se eligió lo que se eligió. Las respuestas, arriba.

### 1 · La desviación de los platos necesita sus fichas, que son M9. ¿Qué hacemos?

**De qué va.** La desviación es comparar **lo que se debería haber gastado** con **lo que se ha gastado**. Lo segundo lo sabe M8 contando. Lo primero sale de lo vendido × lo que lleva cada plato, y lo que lleva cada plato es **la ficha técnica, que es M9**. Sin fichas, Estook sabe cuánto pulpo se fue, pero no si es mucho.

**Un ejemplo.** Entre dos lunes había 10 kg de pulpo, entraron 12 y quedan 8: **se gastaron 14 kg**, 448 €. Con la ficha (150 g por ración) y las 80 raciones de la caja, **debían ser 12 kg**: faltan 2 kg, **64 €**. Eso es la desviación. Sin la ficha, solo se ve lo primero.

**Lo que sí se puede ya**: lo que se vende **tal cual**. Una Coca-Cola vendida es una Coca-Cola menos, sin ficha. Si salieron 120 de la cámara y la caja dice 104, **faltan 16** (9,92 €): invitaciones sin apuntar, roturas, o algo peor. En un bar, **buena parte de lo que se escapa está en la barra**. Basta con decir una vez que «Coca-Cola» de la caja es tu producto «Coca-Cola 33 cl».

- **A · M8 ahora con todo lo que no necesita fichas**, más la desviación de lo que se vende tal cual. **La de los platos y la calibración** («si la cocina sirve un 6 % más de pulpo, eso pasa a ser lo que lleva») **se encienden al terminar M9**, en la misma pantalla. Se cambia el Plan para decirlo.
- **B · Cambiar el orden: M9 antes que M8**, y M8 entera después. Lo que ya vale hoy —contar, el valor del almacén, el food cost real— espera a que acaben las fichas.
- **C · M8 entera ahora, comparando con lo apuntado** en el libro en vez de con las fichas. En una cocina casi nadie apunta lo que cocina, así que **todo saldría como «falta»**: una cifra que asusta y no dice nada.

**Recomiendo A**: contar bien y el food cost real valen ya, la barra se vigila desde el primer día, y M9 llega con datos de verdad para calibrar. **Lo que decides: A, B o C.**

### 2 · ¿Quién cuenta, y quién cierra el inventario?

**De qué va.** Hoy cuenta y cierra la misma persona, y solo pueden quien lleva el local y el jefe de cocina. Contar es lento y lo hace quien está en la cámara; **cerrar** es decir «esto vale», y cambia lo que hay.

**Un ejemplo.** El lunes a las 7, Marcos (cocinero) cuenta la cámara con el móvil. A las 11, el jefe de cocina abre «Contado por Marcos · 3 no cuadran», mira los tres, corrige uno y **cierra**.

- **A · Cuenta cualquiera que lleve el almacén** (el cocinero también) y **cierra quien tiene el permiso**. Dos pasos: contado → cerrado. Quien cierra también puede contar y cerrar de una vez, como hoy.
- **B · Como hoy**: solo cuenta quien puede cerrar.

**Recomiendo A**: quien cuenta no tiene por qué ser quien responde de lo que falta, y el jefe no pierde una mañana en la cámara. **Lo que decides: A o B.**

### 3 · El mínimo, ¿lo calcula Estook?

**De qué va.** El mínimo es la cifra por debajo de la cual Estook avisa y lo mete en el pedido. Hoy lo escribes tú. El Manifiesto dice que **se calcula**: lo que se gasta al día × los días hasta el próximo reparto, **+ 20 %** por si acaso, y se rehace cada semana. Con M8 hay un dato mejor para «lo que se gasta»: **lo gastado de verdad entre inventarios**, no solo lo que alguien apuntó.

**Un ejemplo.** Gastas 3 kg de tomate al día y el proveedor reparte martes y viernes. Del viernes al martes van 4 días: 3 × 4 = 12 kg, + 20 % = **14,4 kg**. Si tenías puesto 5 kg, el domingo te quedas sin tomate.

- **A · Estook lo calcula y te lo propone**: «Tomate: tienes 5 kg, te propongo 14,4 · Usar el calculado». Uno a uno o todos de golpe. El que aceptas se rehace solo cada lunes; **el que no, se queda el tuyo**.
- **B · Lo calcula y lo pone solo** en todos los que tengan dos semanas de datos. En cada uno puedes poner «Lo fijo yo».
- **C · Sigue a mano**, y el calculado sale al lado, de pista.

**Recomiendo A**: nada cambia sin que lo veas, y en un mes los buenos ya van solos. **Lo que decides: A, B o C.**

### 4 · La merma, ¿con foto?

**De qué va.** Hoy una merma son tres toques. Una foto prueba lo que se tiró: para reclamar al proveedor si llegó mal, o para que el gerente lo vea. Pero **cada toque de más es una merma que alguien deja de apuntar**.

**Un ejemplo.** Se tiran 3 kg de merluza que llegó blanda (54 €). Con la foto, la reclamación al proveedor va con prueba.

- **A · Foto si quieres**, siempre: un cuarto toque que se puede saltar.
- **B · Si quieres, y obligatoria desde 20 €** (la cifra la cambia el gerente). Por debajo, como A.
- **C · Sin foto.**

**Recomiendo A**: una merma sin foto vale más que una sin apuntar. **Lo que decides: A, B o C.** Sin señal, la merma se apunta como hoy y sin foto.

## Cómo se comprobará que M8 está terminado

- **Con dos inventarios, lo gastado y el food cost real cuadran con una cuenta a mano** sobre la base: una prueba hace las dos y las compara.
- **El valor del almacén en una fecha** sale igual que reconstruyendo el libro hasta ese día.
- **Una bebida que sale de la cámara más de lo que vende la caja** sale en la desviación con su cantidad, sus euros y su causa (si la 1 es A).
- **Un lote que se gasta deja de avisar** sin tocarlo; y lo congelado sigue aparte.
- **Un mínimo calculado** cuadra con la fórmula, con el calendario de reparto de su proveedor.
- **Quien no ve precios de compra no recibe ni un euro** de nada de esto, ni preguntando a la API a pelo.
- Todo en la batería de pantalla, **mirado en el móvil**, en claro y en oscuro.

**Dos entregas**, cada una con su migración y su despliegue (la primera, la **0060**).
