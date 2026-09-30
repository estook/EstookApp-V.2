# 0055 · La auditoría profunda, y lo que Richi aprobó

**Fecha:** 29 y 30 de septiembre de 2026
**Estado:** decidido. Esta decisión es el índice: cada tema tiene la suya, de la
[0056](0056-estook-tpv-su-puerta-y-estook-link.md) a la
[0064](0064-las-graficas-contestan-una-pregunta.md).
**Cambia:** los seis maestros, `ESTADO.md` y la forma de ordenar los documentos
([0063](0063-una-fuente-por-tema.md)). El informe entero, con las respuestas, está en
[`docs/auditorias/auditoria-profunda-2026-09-29.md`](../auditorias/auditoria-profunda-2026-09-29.md).

## Lo que pasó

Antes de seguir con H, Richi pidió una auditoría completa de Estook con un documento
propio, «Auditoría profunda», escrito con otra IA: arquitectura, datos, acceso,
aparatos, sin conexión, caja, diseño, gráficas, rendimiento, documentos, mercado, Fogón,
lo legal y lo fiscal, y todo lo que no se hubiera pensado. Con una regla: **no tocar
nada hasta tener el diagnóstico y aprobarlo**. Y otra, dicha en el chat: tomar su
documento como guía, no al pie de la letra, y mejorar lo que no encajara.

Se recorrió el código y la base, se pasaron las comprobaciones del proyecto sin
modificar nada (tipos, estilo, capas y las 1.450 pruebas, con una en rojo), y se
contrastó con la AEAT, el BOE, Verifacti, Supabase, GitHub y la documentación de Toast,
Lightspeed, Revo y Food&Service. El informe se publicó para Richi con un botón de «Sí /
No / Hablamos» en cada punto del plan y ocho preguntas de negocio.

**El veredicto:** la base está bien hecha y no se rehace nada. Lo que falla está en la
infraestructura (no había copias de seguridad), en el diseño del TPV, que todavía no se
ha construido, y en los documentos, que repetían lo mismo en seis sitios y se
contradecían en doce.

## Lo que contestó Richi (29-sep, por la noche)

**El plan entero, aprobado.** Con estos matices, que mandan:

| Punto                                          | Respuesta                                                                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-5 · Salir de GitHub Pages                   | **Sí, pero al final**: «ahora es fácil en GitHub por los pull request; al acabar el último módulo lo movemos a Cloudflare, si se puede». Condición en la [0061](0061-el-orden-y-la-infraestructura.md) |
| P2-1 · Gráficas                                | Sí, «con un mejor diseño, más 3D y más bonito que las que tenemos» ([0064](0064-las-graficas-contestan-una-pregunta.md))                                                                               |
| P2-8 · La regla de las 300 líneas              | «Si es una regla tonta, quítala, y que sea lo más óptimo posible» ([0063](0063-una-fuente-por-tema.md))                                                                                                |
| P3-2 · Datáfono conectado, pago en mesa, Bizum | Sí, «sin meternos en cosas que no podemos»: Estook nunca guarda dinero ni pasa a ser entidad de pago ([0058](0058-el-cobro-los-pagos-y-la-caja.md))                                                    |
| 1 · Supabase Pro                               | **En unas semanas**, «si no es estrictamente necesario». Mientras, la copia semanal gratuita ([0061](0061-el-orden-y-la-infraestructura.md))                                                           |
| 2 · Adelantar Estook TPV                       | **Justo después de M10** ([0061](0061-el-orden-y-la-infraestructura.md))                                                                                                                               |
| 3 · Estook TPV con su puerta                   | **Sí, puerta propia** ([0056](0056-estook-tpv-su-puerta-y-estook-link.md))                                                                                                                             |
| 4 · Trabajadores sin correo                    | **Sí**: nombre y PIN bastan ([0057](0057-quien-es-quien-en-el-tpv.md))                                                                                                                                 |
| 5 · Cómo se cobra en sala                      | **Las dos formas**: caja central y bolsa del camarero, a elegir por local ([0058](0058-el-cobro-los-pagos-y-la-caja.md))                                                                               |
| 6 · El programa del local                      | **Estook Link** ([0056](0056-estook-tpv-su-puerta-y-estook-link.md))                                                                                                                                   |
| 7 · Cloudflare Pages                           | **Sí, al final**, y preguntó qué pasa con las claves (respondido en la [0061](0061-el-orden-y-la-infraestructura.md))                                                                                  |
| 8 · La #78                                     | Primero se arregla la prueba del día, después se fusiona la #78, y lo nuevo va en otra rama                                                                                                            |

Y un encargo para todo: **«que sea una estructura profesional, que cumpla todo
legalmente y que no dejemos nada en el aire»**.

## Lo que se decide, por temas

| Decisión                                            | Qué                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [0056](0056-estook-tpv-su-puerta-y-estook-link.md)  | Estook TPV con su propia puerta (`apps/tpv`); Estook Link, el centro del local; qué funciona sin conexión |
| [0057](0057-quien-es-quien-en-el-tpv.md)            | Quién es quién: la persona sin correo, el terminal, el operador, el bloqueo y la aprobación con PIN       |
| [0058](0058-el-cobro-los-pagos-y-la-caja.md)        | El cobro, sus pagos y la caja; la bolsa del camarero; el cierre del día; la venta nace al cobrar          |
| [0059](0059-emitir-un-documento-fiscal.md)          | Emitir un ticket o una factura: con estados y clave de idempotencia; qué dice la AEAT sin conexión        |
| [0060](0060-la-empresa-fiscal.md)                   | La empresa fiscal: organización → empresa → local                                                         |
| [0061](0061-el-orden-y-la-infraestructura.md)       | El orden nuevo (el TPV tras M10), las copias, Cloudflare al final, las claves y el repositorio público    |
| [0062](0062-lo-legal.md)                            | Lo legal: contrato de encargado, conservación, fichajes, alérgenos, IA y lo que va al asesor              |
| [0063](0063-una-fuente-por-tema.md)                 | Los documentos: una fuente por tema, la Evolución fundida, la Arquitectura nueva, ESTADO corto            |
| [0064](0064-las-graficas-contestan-una-pregunta.md) | Las gráficas: cada una contesta una pregunta, y con profundidad sin engañar                               |

## Un hallazgo del 30-sep que no estaba en el informe

**El repositorio es público.** Lo es porque GitHub Pages gratis solo publica
repositorios públicos, y porque así las pruebas de GitHub no cuestan minutos. Se
comprobó en producción, solo leyendo, que no expone nada que abra una puerta: los dos
únicos administradores son los de verdad, ninguna cuenta de ejemplo tiene contraseña y
no hay sesiones de ejemplo vivas (la semilla nunca pone claves en una base remota).

Pero deja a la vista lo que no debería: el plan de negocio entero, la oferta comercial
de Verifacti y el correo personal de Santi. Se decide en la
[0061](0061-el-orden-y-la-infraestructura.md): el correo sale de los documentos ya, y
el repositorio pasa a privado **en la misma mudanza a Cloudflare**, que es cuando deja de
hacer falta que sea público.

## Lo primero, y en qué orden

1. **La prueba de los martes** y **la copia semanal**, en su rama: la prueba fallaba
   solo los martes (un pedido de otra prueba llegaba justo el día que mira el reloj) y
   los lunes de madrugada (la jornada del local todavía era la del domingo). Se pasaron
   las 1.450 pruebas en veintiséis días y horas distintos antes de darlo por bueno
   (lección 128).
2. **Richi fusiona la #78.**
3. **Esta rama de documentos.** Sin código ni migración.
4. **H · Horarios**, que ya lleva dentro la persona sin correo y los fichajes preparados
   para el registro horario digital.
