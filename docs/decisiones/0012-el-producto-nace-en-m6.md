# 0012 · El producto nace en M6, y M5 le deja el diccionario

**Fecha:** 3 de septiembre de 2026 · **Módulo:** M5 · **Estado:** aceptada

## Qué se decide

**M5 no crea `estook.producto`.** El catálogo de referencia se construye entero
—302 productos y 10 recetas, con su buscador y su consulta— pero es una tabla
aparte, `estook.producto_de_referencia`, que no es de nadie y no aparece en el
inventario de ningún local.

En consecuencia, dos cosas de la ficha de M5 en el Plan **aterrizan en M6**:

- los **datos de ejemplo** («seis o siete productos, dos elaboraciones, tres
  fichas y una carta de cuatro platos»), de los que M5 construye la maquinaria
  pero no las filas;
- y el criterio **«crear un producto desde el catálogo de referencia lleva menos
  de quince segundos»**, del que M5 cumple la mitad que le corresponde.

## Por qué

### Porque el producto es M6 entero, no una tabla

La ficha de M6 en el Plan dice qué es un producto: «formato, unidad de uso,
factor, rendimiento, peso variable, código de barras, tipo impositivo, alérgenos
y mínimo · **libro de movimientos con lote** · ajuste manual como movimiento ·
**precios con vigencia y precio medio ponderado** · entrada por todas las vías ·
lotes y caducidades».

Una tabla `producto` creada en M5 con la mitad de eso no es medio M6: es una
tabla que M6 tiene que rehacer, y mientras tanto un sitio donde escribir stock
sin libro de movimientos, que es lo que la regla 8 prohíbe.

Y hay una razón de riesgo encima. La Auditoría (1.2) señala el factor y el
rendimiento como **el error más caro del sistema**: «confundir unidad de compra
con unidad de uso es la primera causa de escandallos falsos». Ese dato se define
bien una vez, con sus pruebas, en el módulo que lo tiene por objetivo.

### Porque el propio Manifiesto separa las dos cosas

> «El onboarding pregunta por el local y enseña a usar la app. **No pide
> catálogo, ni proveedores, ni recetas.** Eso viene después, cuando ya se
> entiende para qué sirve.» (Manifiesto 8)

El alta de M5 —los ocho pasos— no necesita productos. Lo que sí los necesita es
«el resto del arranque», que es la parte que M6 y M7 completan.

### Y porque el catálogo de referencia **no es lo mismo** que un producto

Esto es lo que más se confunde, y E4 avisa de ello con esas palabras: «el nombre
de una cosa decide dónde acaba; dos listas parecidas con nombres parecidos
terminan mezcladas».

|                  | Catálogo de referencia  | Producto (M6)                 |
| ---------------- | ----------------------- | ----------------------------- |
| De quién es      | De nadie                | De un local                   |
| Cuántos hay      | 302, iguales para todos | Los que tenga cada cocina     |
| Se cambia        | Con una migración       | Desde la aplicación           |
| Tiene stock      | No                      | Sí, como libro de movimientos |
| Cuenta para algo | Para nada               | Para todo                     |

El Manifiesto lo remata: «Estook **no mete nada en tu inventario**. Te lo rellena
cuando tú se lo pides. [...] el catálogo de referencia es **una ayuda que se
consulta**, no un inventario que hay que limpiar».

## Qué hace M5 entonces, exactamente

**La mitad valiosa, que es la que ahorra el tiempo:**

- El catálogo entero, con formato, factor, unidad de uso, rendimiento, categoría
  fiscal y alérgenos ya puestos, buscable con erratas y sin acentos.
- La cuenta explicada —«Garrafa de 5 l = 5.000 ml para usar»— que es lo que hace
  que alguien note un error de unidad **antes** de guardarlo.
- Las recetas de referencia, con sus líneas en la unidad de uso de cada producto.

**La maquinaria de los datos de ejemplo, sin las filas:**

- `estook.dato_de_ejemplo`, donde cada módulo apunta lo que crea de mentira.
- `estook.quitar_ejemplos`, que los borra del más nuevo al más viejo **sin
  conocer las tablas**, así que M6, M9 y M10 no tocan ese código.
- La tarjeta del Panel, que solo aparece cuando hay algo que quitar.

Lo que M6 tiene que hacer para cerrar el criterio: copiar una fila de referencia
a un producto del local, y apuntar los suyos en el registro de ejemplos.

## Qué se pierde

Que **M5 no puede firmar entero su «terminado cuando»**. Se dice así en
`ESTADO.md`, sin redondearlo: el alta de cuatro minutos está comprobada; los
quince segundos, a medias.

## Alternativas que se descartaron

**Adelantar de M6 lo mínimo.** M5 habría cerrado su criterio tal como está
escrito, a cambio de una tabla `producto` nacida sin libro de movimientos, sin
precios con vigencia y sin lotes, que M6 tendría que ampliar mientras ya hay
datos dentro. Es empezar M6 con M5 a medias, que es lo que la regla 12 y el orden
E3 prohíben.

**Aplazar también el catálogo de referencia.** Más pequeño y más limpio, pero el
catálogo es dato puro y no depende de nada: tenerlo listo antes no estorba, y
llegar a M6 con el diccionario ya escrito y probado es exactamente lo que hace
que el producto de M6 se pueda crear en quince segundos.
