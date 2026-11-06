# Lo que ya pasó

Lo que sirvió en su día y ya no se usa para trabajar. **No manda en nada**: lo que vale hoy está
en [ESTADO](../../ESTADO.md), los [maestros](../maestros/) y las [decisiones](../decisiones/LEEME.md).
Se guarda para saber por qué algo se hizo así.

| Carpeta                | Qué hay                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| [`pasos/`](pasos/)     | Los pasos de Richi de entregas ya en producción y probadas, o que otra entrega sustituyó                    |
| [`modulos/`](modulos/) | Los planes de módulos terminados, y los papeles que otro documento ya recoge entero                         |
| Aquí mismo             | ESTADO hasta el 30-sep y la Evolución 1.2, de antes de [la 0063](../decisiones/0063-una-fuente-por-tema.md) |

**Cuándo se mueve algo aquí:** cuando su entrega está en producción y ESTADO ya no lo pide, o
cuando otro documento dice lo mismo y manda. Se mueve, no se borra, y la prueba de los enlaces
(`herramientas/los-enlaces-de-los-documentos.prueba.ts`) avisa si un enlace se queda roto.

## Cómo se ordenan los documentos

Richi pidió el 6-nov quitar lo que ya no vale para que no ocupe ni confunda, **solo si ya no vale**
([0134](../decisiones/0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md)). La regla, para todas las veces:

1. **Se mira si alguien lo pide todavía.** Unos pasos que ESTADO sigue pidiendo (porque Richi aún no
   ha probado esa entrega) **no se tocan**, aunque la entrega esté en producción.
2. **Lo que ya no se usa para trabajar, pero explica por qué algo se hizo así, se mueve aquí**, y
   nunca se borra: las decisiones lo enlazan y la historia se perdería.
3. **Lo que es una salida que se vuelve a sacar** (los PDF de los maestros, las capturas) **no se
   sube**: una copia vieja dice cosas que la fuente ya no dice. Se saca cuando se necesita.
4. **Lo que dice lo mismo que otro documento** se resume en una línea que enlaza al que manda
   ([0063](../decisiones/0063-una-fuente-por-tema.md)).
5. **La prueba de los enlaces** avisa si al mover algo se queda un enlace roto.

**Lo que se hizo el 6-nov:** fuera del repositorio los PDF de los maestros (`docs/maestros/pdf/`,
4,4 MB, del 24 y 25 de octubre, sin nada de la 0115 a la 0134; se sacan con `.\estook.cmd maestros`),
y a `pasos/` los de «Estook TPV, su propia app» (en producción desde el 28-oct). Los demás pasos los
sigue pidiendo ESTADO; las maquetas mandan sobre el aspecto de lo construido; y la plantilla de tarea,
los entornos y «Empezar un chat nuevo» siguen siendo ciertos: se quedan.
