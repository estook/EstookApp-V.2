# 0024 · El color del local pinta la app, y hay dos temas

**Fecha:** 9 de septiembre de 2026
**Estado:** decidido y construido en M6½ · migración `0026`

## Lo que se pidió

Richi abrió Estook en el TPV de la cocina y mandó la foto: «mira qué raro se ve
todo… es súper sencilla, todo blanco, texto suelto. No está a la altura de una
app profesional. Meter más color y que puedan elegir en Ajustes el color de la
app, que es el color de la empresa. Y modo oscuro. **Cuidado con el texto**: si
cambias colores, cuidado con las cosas que pueden ser del mismo color y no se
vean, como texto negro sobre fondo negro.»

## Uno · Por qué la pantalla parecía una hoja de papel

No era el contenido, era **una medida**. B1 daba `#fafaf8` de fondo y blanco de
tarjeta, y esos dos colores contrastan **1,02:1**. Sobre el papel es una paleta
limpia; en una pantalla real no hay tarjetas, hay texto flotando sobre blanco.

El fondo baja a `#f1efea` y da 1,15. Con él bajan los dos bordes —un borde claro
sobre un fondo más oscuro se pierde— y se oscurecen `bien`, `atención` y
`texto-tenue`, que sobre el fondo nuevo se quedaban por debajo de 4,5:1.

Es un cambio de tres líneas que arregla la pantalla entera, y es el tipo de cosa
que solo aparece **mirándolo en el aparato en el que se usa**. Ninguna prueba lo
podía ver: todas pasaban.

## Dos · Los dos temas, y por qué B1 decía lo contrario

B1 decía «esquema claro fijo; el modo oscuro del sistema no repinta la app», y
era razonable mientras Estook fuera la pantalla del pase: una cocina se mira de
lejos y con la luz encendida, y ahí el claro gana.

Pero la misma aplicación la abre quien lleva el local a las once de la noche, en
la oficina, para mirar el margen del día. **El de fábrica sigue siendo el claro**
—quien no entre en Ajustes ve lo de antes— y hay tres opciones: claro, oscuro y
el del sistema.

Y vive **en el aparato**, como el tamaño de letra, no en la persona: la tableta
del pase quiere el claro a las dos de la tarde y el portátil quiere el oscuro a
las once de la noche, y puede ser la misma persona.

### Cómo se hace, que es lo que decide si esto es deuda o no

Redefiniendo **las fichas**, en `packages/ui/estilos/temas.css`. Las utilidades de
Tailwind salen de `@theme`, así que `bg-superficie` compila a
`var(--color-superficie)`: cambiar la ficha cambia las cuarenta pantallas a la
vez.

**Ninguna pantalla lleva una clase de modo oscuro.** Eso es lo que hace que una
pantalla nueva salga bien en los dos sin que quien la escriba se acuerde de nada.
Si hubiera que poner `dark:` en cada clase, el modo oscuro estaría roto en la
tercera pantalla que se escribiera.

### Y el fallo que apareció el primer día

**El logotipo es tipografía charcoal sobre transparente**, así que en la barra de
arriba se quedaba negro sobre negro. Exactamente lo que Richi avisó.

Se genera del mismo original una versión clara, en
`herramientas/reducir-marca.mjs`, **tocando solo lo que es gris**: un `invert()`
de CSS habría vuelto azul el naranja de la marca.

## Tres · El color del local, pintando la aplicación

El logo y el color se pedían en el paso 5 del alta y **no se podían cambiar
nunca más**: el paso vive dentro del alta y el alta no se repite. Un local que
subía el logo de la cadena en vez del suyo se quedaba con él para siempre.

Ahora están en Ajustes, y el color puede pintar el acento de toda la aplicación
con un interruptor. **Apagado de fábrica**, porque ese color se eligió pensando
en una cabecera y encenderlo por nuestra cuenta cambiaría de golpe el aspecto de
todos los locales que ya lo tienen puesto.

El interruptor es del **local** y no del aparato (migración `0026`): es el color
de la empresa, y si viviera en el navegador el gerente lo encendería en su
ordenador y el equipo seguiría viendo naranja.

## Y lo importante: el color que se guarda no es el que se pinta

Aquí es donde se rompen las aplicaciones que dejan personalizar, y es lo que
Richi avisó con esas palabras.

Un granate de bodega sobre una tarjeta blanca se ve perfectamente. Pero el texto
del botón principal era `text-charcoal` —escrito a mano, porque el naranja de
Estook es claro— y encima del granate **no se lee**: 1,8:1 donde B8 pide 4,5. Y
un amarillo corporativo no se ve contra el blanco por mucho que sea el color de
la empresa.

B8 no dice «4,5:1 salvo que lo haya elegido el usuario». Así que **se guarda lo
que la persona eligió y se pinta lo que cumple**. De un color de marca salen
cuatro, cada uno medido contra el fondo donde va a aparecer:

| Ficha                       | Para qué                                  | Mínimo                                      |
| --------------------------- | ----------------------------------------- | ------------------------------------------- |
| `--color-naranja`           | Iconos, bordes, el relleno del botón      | 3:1 contra la tarjeta **y** contra el tinte |
| `--color-sobre-naranja`     | Lo que se escribe **encima** del acento   | 4,5:1                                       |
| `--color-naranja-suave`     | El fondo de una pastilla seleccionada     | 4,5:1 con el texto normal encima            |
| `--color-naranja-en-oscuro` | El acento **dentro** de la barra charcoal | 4,5:1                                       |

La cuarta existe por «Deshacer», que va en naranja sobre la barra oscura: ahí el
fondo es otro y un color de marca oscuro desaparece. Y la primera exige los dos
fondos porque un acento que daba justo 3,00 sobre la tarjeta se quedaba en 2,98
sobre la pastilla.

Hay colores que **no admiten texto legible encima de ninguna clase**: un gris del
50 % da 3,95 con el blanco y 4,34 con el charcoal. Para esos, el acento se empuja
—siempre en la dirección contraria a la superficie, que mejora las dos cosas a la
vez— hasta que sí. Y cuando ha habido que tocarlo, **se dice en Ajustes**:
callárselo sería que alguien pusiera su amarillo, viera un mostaza y pensara que
Estook no sabe leer un color.

La aritmética vive en `packages/ui/src/color.ts`, sin React, probada color a
color con doce elegidos para hacer daño.

## Cómo se comprueba que esto no se rompe mañana

Tres redes, en tres sitios distintos, porque son tres cosas distintas:

- **`contraste.prueba.ts`** mide **la paleta de fábrica**, los dos temas, leyendo
  los CSS. Si alguien aclara un gris «para que se vea mejor», salta.
- **`color.prueba.ts`** mide **la aritmética**: doce colores de marca, dos
  superficies, cuatro mínimos cada uno.
- Y una prueba de extremo a extremo mide **el píxel**: pone cinco colores de
  marca desde Ajustes y lee el contraste del botón principal ya pintado en el
  Panel. Es la única de las tres que caza que un componente se haya quedado con
  un color escrito a mano, y se comprobó devolviendo el `text-charcoal`: se pone
  roja con «con #1f3a5f, "Conectar ahora"».
