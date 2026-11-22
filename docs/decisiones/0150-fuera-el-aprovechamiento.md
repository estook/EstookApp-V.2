# 0150 · Fuera el aprovechamiento

**Fecha:** 22 de noviembre de 2026
**Estado:** construido en `m20-1-lo-vendido-baja` (la PR de M20 · 1, antes de fusionarla), con la migración
**0123**.
**Cambia:** la [0099](0099-el-repaso-del-19-oct.md) en lo del aprovechamiento (lo pagado era lo pagado en la
cámara, y el plato dividía entre lo que se aprovecha) y la [0149](0149-m20-1-lo-vendido-baja.md) (lo vendido
restaba «en bruto»). El Manifiesto, el Plan (M6 y M9), la Auditoría de flujos (1.2 y 2.2), el diseño de
[lo que se escapa](../como-detecta-estook-lo-que-se-escapa.md), el mapa y ESTADO.

## 1 · Lo que dijo Richi

Al ver M20 · 1 antes de fusionarlo (22-nov): «eso de restar en bruto no lo tienes que hacer. Es un lío y puede
generar muchos descuadres». Y lo que se hace en su lugar:

> «Te llega un kilo de atún, guardas un kilo en la nevera. Si le quitas 200 gramos, apuntas en merma 200
> gramos, y ya está. Si al recibirlo lo quieres limpiar, pones lo que haya dado limpio en el almacén y el resto
> en merma. Y si un escandallo pone 100 gramos de atún, salen 100 gramos de atún, punto y final.»

Y la regla de fondo: **«mientras más enrevesada la lógica, peor»**, con un margen de error asumido: «no siempre
va a ser clavado, esto no es un policía, es una aplicación de ayuda y de gestión».

## 2 · Lo que cambia

- **No hay «cuánto se aprovecha»** en ningún sitio de Estook: ni en la ficha del producto (fuera la tarjeta
  «Aprovechamiento», la hoja «Cuánto se aprovecha» y la marca «sin verificar»), ni en el alta, ni en el catálogo
  de referencia, ni en el coste.
- **El coste de una unidad es el precio entre lo que trae** (`precio ÷ factor`): un kilo de atún pagado a
  18,18 € vale 18,18 € en la cámara, en una merma y en un plato.
- **Lo que pide el escandallo es lo que sale** al vender: 100 g son 100 g.
- **Lo que se tira al limpiar es merma**, con la que ya hay, al recibir o al limpiar. Sin cuentas nuevas. Y
  con **un motivo propio, «Al limpiarlo»** (piel, espinas, huesos, recortes), en la partida «Pérdida»: con los
  de antes la plantilla lo habría apuntado como «Estaba malo», y las mermas habrían mentido.
- **Lo que rinde una elaboración** («la salsa rinde 2 litros») **se queda**: es otra cosa, cuánto sale de una
  receta, y no tiene que ver con lo que se tira de un producto.

## 3 · Cómo está hecho

- **La migración 0123** pone todos los productos al 100 % y añade el motivo «limpieza» a las mermas. Así la API de antes, que sigue en marcha entre migrar
  y desplegar, ya cuesta los platos igual que la nueva.
- **Las columnas se quedan, sin usar** (lección 276): `producto.rendimiento`, `producto.sin_verificar` y el
  `rendimiento` de los precios y de lo pactado. Se quitan en una migración de después, cuando ninguna API las
  lea. Los precios y lo pactado las pedían: ahora nacen al 100 %.
- **Lo que manda una pantalla de antes se acepta y no se guarda**: una app abierta con la versión de antes puede
  mandar el aprovechamiento al guardar la ficha; no falla, y no cambia nada. Crear un producto con
  aprovechamiento ya no se acepta.
- **El coste de los platos cambia** donde había un aprovechamiento puesto: baja, porque ya no se divide. El food
  cost real (el de los inventarios) no cambia, porque nunca lo usó; lo que se tira al limpiar ahora se ve como
  merma, que es donde se puede mirar.

## 4 · Lo que decidió la IA por su cuenta

1. **El motivo «Al limpiarlo»**, que Richi no pidió con ese nombre: es la merma que ya hay, con una opción
   más para que lo que se tira al limpiar no se confunda con lo que estaba malo. También lo entiende Fogón
   en la merma por voz.
2. **Las pruebas conservan sus cifras** cambiando el dato de partida (10 kg de carne a 75 € en vez de a 60 € con
   un 80 %), para que lo comprobado a mano siga valiendo.
3. **En «Lo que se escapa» (M20 · 2)**, el botón «Rinde menos de lo puesto» pasa a ser **«Se tira al limpiar»**,
   que recuerda apuntarlo como merma, y queda escrito que lo que cae dentro de lo normal de cada cocina nunca se
   avisa.
