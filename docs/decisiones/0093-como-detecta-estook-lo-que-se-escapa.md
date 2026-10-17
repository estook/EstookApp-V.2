# 0093 · M9 · 3 cerrado, y cómo detecta Estook lo que se escapa (para M20)

**Fecha:** 17 de octubre de 2026
**Estado:** M9 · 3, **contestado entero** y listo para construir. La detección, **diseñada y sin construir** (va con M20), con **dos preguntas abiertas**: [`como-detecta-estook-lo-que-se-escapa.md`](../como-detecta-estook-lo-que-se-escapa.md).
**Sigue:** [0092](0092-las-respuestas-de-m9-3.md). Sustituye, **cuando se construya M20**, los dos números fijos de M8 (el 2 % de `LO_QUE_CUADRA` y el aviso desde el 3 % de la [0079](0079-lo-gastado-y-la-desviacion.md)).

## Lo que contestó Richi a las cuatro preguntas de M9 · 3

1. **Escalar también tocando un ingrediente: A.**
2. **«Descargar todas» las fichas técnicas en un PDF: A.**
3. **La regla para avisar: C, con matices.** Que se estudie cómo combinar el coste, el comportamiento habitual de cada producto, la repetición y la fiabilidad de los datos; que tenga en cuenta que al principio no hay datos para aprender; qué datos necesita antes de avisar; y nada implementado todavía.
4. **La calibración: le interesa, pero sin complicar Estook.**

Y una petición que vale para todo: **«no quiero complicar la app, quiero que sea un compañero de control de la cocina, la sala y los empleados; no quiero que sea restrictivo y que la odien»**. Que se audite.

## Lo que se decide

1. **M9 · 3 entra entero**: la receta por ración o por tanda, escalar (por raciones, por tandas y tocando un ingrediente), el PDF escalado, «Descargar todas», «qué ha cambiado» y la receta de Estook.
2. **La detección de lo que se escapa**, para M20, con **cuatro filtros**: datos fiables, lo normal de cada producto (con «aprendiendo» hasta tres periodos fiables), no es lo de siempre (dos reglas clásicas de los gráficos de control) y que cueste dinero (solo lo caro de «Toca contar»). Y **la fuga constante**, aparte.
3. **La calibración, en sencillo**: una pregunta de tres botones, una sola vez, y solo ante una fuga constante de lo caro. **La receta nunca se sube a lo que se sirve**; lo que se corrige, si lo confirma una persona, es el aprovechamiento.
4. **Un mes en silencio antes de encenderlo**, para medir cuántos avisos habría dado.

## Lo que decidí al diseñarlo

1. **Lo normal con la mediana y la desviación absoluta mediana**, y no con la media: aguantan un mal recuento suelto.
2. **Los últimos ocho periodos fiables como mucho**: unos dos meses de lo caro; se adapta a un cambio de cocinero o de temporada.
3. **Las dos reglas, de los gráficos de control**: un salto de 3,5 (Iglewicz y Hoaglin) o dos de los tres últimos por encima de 2, del mismo lado (Western Electric). Juntas, unas 3,5 falsas alarmas por cada 1.000 periodos con datos de libro.
4. **«Que cueste dinero» es la lista de lo caro de «Toca contar»** (el 80 % de lo que se gasta), que ya existe: ni una raya nueva.
5. **Como mucho un aviso por inventario cerrado**, en la campana y con «Ya sé por qué» opcional; «error al contar» saca ese periodo del aprendizaje.
6. **Los dos números fijos de M8 siguen hasta M20**: hoy no hay ventas plato a plato para aprender nada.

## Lo que queda abierto

Las dos preguntas del final del documento: si Estook solo vigila cuando **todo** lo vendido tiene escandallo (1), y si **la prueba de la plantilla** (seis preguntas: trabajo nuevo, bloqueos, formación, avisos con qué hacer, datos a medias, señalar a nadie) entra en la regla 14 del Plan (2).
