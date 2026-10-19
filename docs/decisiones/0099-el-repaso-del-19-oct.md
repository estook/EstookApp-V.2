# 0099 · El repaso del 19-oct: la cámara vale lo pagado, el escandallo es de una ración y la cocina sin compras

**Fecha:** 19 y 20 de octubre de 2026
**Estado:** construida en la rama `el-repaso-del-19-oct`, con su migración **0076**.
**Sigue:** la [0090](0090-el-repaso-del-16-oct.md) (escandallo ≠ ficha técnica; las elaboraciones, paradas) y la [0098](0098-fogon-1-entero.md). **Cambia** lo de la 0090 sobre las elaboraciones: vuelven, porque Richi las ha pedido.

Richi, con Fogón 1 en producción: «antes de empezar con el siguiente módulo quiero revisar fallos, que hay algunos muy graves y así no podemos seguir». Ocho puntos y una auditoría de datos y precios.

## 1 · Lo que encontró la auditoría

| Lo que se veía                                   | Por qué pasaba                                                                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Contramuslos: 20 kg «valen» 91.000 €**         | Nacieron desde «Crear en el Almacén» de un escandallo, **en gramos y sin envase**: su precio era el de **un gramo**. La entrada se apuntó a 4,55 € (el gramo). Luego se les puso «Caja de 5 kg», pero el coste medio ya era 4,55 €/g |
| **El atún enseñaba tres precios**                | Con IVA, sin IVA, y **25,97 €/kg**: el coste por unidad llevaba el aprovechamiento (70 %), y ese número valoraba también la cámara, las mermas y las compras. **Un kilo pagado a 18,18 € «valía» 25,97 €**                           |
| **Precios que no son de su envase**              | El precio guarda el envase del día; cambiar el envase del producto no lo rehacía. El aceite de girasol leía «25 € el litro» con 25 € por cinco litros                                                                                |
| **La zanahoria «Bolsa de 5 kg»** con 1 kg dentro | Un envase escrito a mano que no casaba con lo que trae                                                                                                                                                                               |

La cámara de IKATZ sumaba **92.466 €**; con la 0076 queda en **2.039 €** (ensayado contra la base de verdad dentro de una transacción deshecha).

## 2 · Las cuatro respuestas de Richi (19-oct)

1. **La cámara vale lo pagado.** El coste guardado es `precio ÷ factor`; **el aprovechamiento solo cuenta en el escandallo**, que lleva gramos limpios (`costeLimpio` del dominio). La cámara, las mermas, las compras y el food cost real valen lo de la factura.
2. **Los datos rotos de IKATZ los arregla la 0076**, a su precio de hoy, **sin borrar ni cambiar un movimiento**: se añade una línea «Revalorado a lo pagado» (un ajuste de cero, origen `revalorar`) por producto.
3. **Las elaboraciones vuelven** («una salsa, el aceite de albahaca»): dicen cuánto rinden, sale lo que cuestan **y se usan dentro de los platos**.
4. **Escandallos y food cost, sin IVA**, dicho. En la ficha del producto, el precio **como lo apunta el local** (con IVA si así está en Ajustes) y debajo, pequeño, el otro.

## 3 · Lo hecho, punto a punto

| Punto                               | Lo hecho                                                                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Un precio**                   | Una cifra: «20,00 € el kilo» (o «50,00 € la caja de 5 kg · 10,00 €/kg»), y debajo «Sin IVA, 18,18 €». Lo limpio, en **Aprovechamiento**: «Lo limpio sale a 25,97 €/kg». «El caja» pasa a «la caja»                                                                  |
| **1.1 · Cambiar el precio**         | **Antes** (fijo) → **nuevo**, en la medida del producto, y luego **«¿Sube un 20 %?»** con «Sí, guardar» y «Corregirlo». Si es tres veces más o un tercio, avisa de que puede ser el precio de otra cosa. El proveedor, el suyo de entrada                           |
| **2 · Añadir un escandallo**        | Escandallos enseña **solo lo desgranado** y las elaboraciones. **«Añadir»**: «De un plato de la carta» (los que faltan) o «Una elaboración desde cero» (nombre y cuánto sale). Vacío: «Aún no tienes escandallos»                                                   |
| **2.1 · Crear ficha técnica**       | Fichas enseña **solo las hechas**. **«Crear ficha técnica»**: arriba lo que tiene escandallo, abajo en gris lo que no, diciendo que primero hay que desgranarlo. Lo que se vende tal cual (bebidas) no sale. **Las elaboraciones también tienen ficha técnica**     |
| **3 · La cocina sin compras**       | Compras y Mermas, fuera de su barra; «Compras de hoy», fuera de su Resumen y de su Panel. **Empezar un pedido es de quien los manda**; el cocinero rellena el que le piden y solo ve ese. Tirar sigue igual, sin un euro                                            |
| **4 · Salir del aparato de fichar** | «Volver a Estook» en la pantalla de fichar: correo y contraseña **de quien puede llevar el local** (`app.ajustes`). Lo mira el servidor (`entrar` con la llave del aparato) y entra en ese local                                                                    |
| **5 · Desgranar**                   | **Una ración**: fuera «¿Es una receta de olla?»; lo guardado para una tanda (o la receta de Estook, o Fogón) se pasa a una ración. Fogón y la receta de Estook, **botones pequeños debajo de la lista**. El cursor salta solo a la cantidad, e «Intro» al siguiente |
| **5 · El teclado del iPhone**       | La hoja ya no se desplaza con el visor mientras hay teclado (el arreglo del 25-sep para la barra se peleaba con Safari al enfocar)                                                                                                                                  |
| **5.1 · Desgranar grande**          | En el escandallo y en el plato de la Carta: **Desgranar** grande y primero; **«Vincular a un producto»** pequeño, «para lo que se vende tal cual: una bebida, un postre comprado»                                                                                   |
| **6 · El almacén**                  | Lo de arriba (1). **En gramos sin envase, el servidor lo pone «Kilo»** (venga de donde venga), los campos dicen «Precio del kilo», y **al cambiar el envase el precio le sigue** con lo mismo por kilo                                                              |
| **6.1 · En kilos**                  | «¿No cuadra?», «Ha llegado» y «Ha salido» cuentan **en kg de entrada**, con selector a g (o l y ml)                                                                                                                                                                 |
| **7 · Borrar**                      | «Borrar el plato» en su ficha (también archivado), con «No hay vuelta atrás». «Borrar la sección», igual; sus platos pasan a «Sin sección»                                                                                                                          |
| **8 · Los checks**                  | Las pruebas de pantalla, **en cuatro máquinas a la vez**: la vuelta de una rama, de 35 min a 7. Y `main` **no repite** las de pantalla si el código fusionado es el mismo que pasó en su rama                                                                       |

## 4 · Lo que decidí al construirlo

1. **El libro no se reescribe**: revalorar es una línea nueva («Revalorado a lo pagado»), la única que puede no mover cantidad. Deshacer la 0076 la quita.
2. **Compras es de `accion.enviar_pedidos`, Mermas de `dato.precio_de_compra`.** Un destino ya puede pedir un permiso además del de su app (`Destino.permiso`). Su dirección sigue valiendo: el cocinero invitado llega por el aviso.
3. **Recibir el camión sigue pudiendo hacerlo el cocinero** por la API (`recibir_albaran`), pero sin la pestaña no tiene por dónde; lo hace quien manda o el invitado. Si Richi quiere que la cocina reciba, es una línea.
4. **Salir del aparato con Google no se ofrece**: hace falta contraseña. Quien entre solo con Google tiene que ponerse una en Mi cuenta.
5. **Borrar un plato** se lleva su escandallo, su ficha y su historial (`cascade`); **el plato del almacén al que estaba vinculado no se toca**.

## 5 · Lo que queda por ver con Richi

- **El precio de los contramuslos**: en su base pone **5,45 €** la caja de 5 kg (cambiado el 19-oct a las 19:58); si era 45,45, se cambia en la ficha.
- **La bola de masa de Pizzeriacazzo** dice «Caja de 20 bolas» contada en kilos de uno en uno: se arregla desde su ficha, que es de prueba.
- **El fallo del teclado del iPhone** no se puede reproducir sin un iPhone: el arreglo quita la causa más probable; hay que probarlo en el suyo.
