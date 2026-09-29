# 0063 · Los documentos: una fuente por tema

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)) y hecho
en la misma rama.
**Sustituye:** la Evolución como documento propio (se funde, y su fichero se queda como
índice de dónde fue cada capítulo), `docs/reglas.md` (pasa al Plan) y la regla de A2
«ningún fichero pasa de 300 líneas».
**Crea:** la [Arquitectura](../maestros/Estook-Arquitectura.md), el
[registro de cambios](../maestros/CAMBIOS.md) de los maestros y
[`docs/legal/`](../legal/) (0062).

## Lo que pasó

La auditoría encontró que **el TPV estaba escrito en los seis maestros**, que cada cambio
había que hacerlo seis veces y que alguno siempre se quedaba atrás: ya pasó con
Canarias, y el 29-sep aparecieron **doce contradicciones más** (la prueba «sin tarjeta»,
el PIN que «firma» y que «no firma», la cocina que imprime sin internet, «la ley no
permite», los cuatro años, el esquema `public`, el `vite-plugin-pwa` que no está, la
regla de las 300 líneas con 97 ficheros que la pasan, los fichajes sin wifi que no
existen, la exportación prometida, «Enlace» y «Link», y la migración libre que era la
0040). Y `ESTADO.md`, que tiene que leerse en dos minutos, tenía casi 800 líneas.

La Evolución, además, repetía casi entera el Manifiesto: el Panel, Pulse, las apps,
Fogón, las alertas, el chat, la API y el mercado estaban escritos en los dos.

## Lo que se decide

### 1 · Cada tema vive en un solo sitio

| Tema                                       | Su sitio                                                        | Los demás                                  |
| ------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------ |
| **Dónde estamos**                          | `ESTADO.md`, **150 líneas como mucho**                          | Enlazan                                    |
| **Qué es el producto**, y hacia dónde va    | **Manifiesto** (con lo que era la Evolución: visión y mercado)  | Enlazan                                    |
| **Cómo está hecho**                         | **Arquitectura** (nueva): capas, el modelo, aparatos, sin conexión, servicios externos, claves, despliegue, copias, escala y lo que no se toca | Plan A3–A5 y Anexo 2 y 3.4 pasan a enlazarla |
| **Estook TPV y la facturación**            | El **Anexo**, y solo el Anexo                                   | Un párrafo y un enlace                     |
| **Quién ve qué**                           | **Roles**                                                       | —                                          |
| **Qué desencadena cada cambio**            | **Auditoría de flujos**                                         | —                                          |
| **Cómo se trabaja, el diseño y el orden**  | **Plan** (con las reglas, que dejan `docs/reglas.md`)           | —                                          |
| **Por qué está hecho así**                 | `docs/decisiones/`                                              | —                                          |
| **Lo legal**                               | `docs/legal/`                                                   | —                                          |
| **Lo que cambió en cada versión**          | `docs/maestros/CAMBIOS.md`                                      | Sale de la cabecera de cada maestro        |
| **Lo que hizo cada entrega**               | `docs/historia-de-los-modulos.md`                               | Sale de `ESTADO.md`                         |
| **Lo aprendido fallando**                  | `docs/lecciones.md`                                             | —                                          |
| **Los pasos de Richi**                     | `docs/pasos-antes-de-m8.md`, uno por entrega                    | —                                          |

**Siguen siendo seis maestros**: el Manifiesto, la Arquitectura, el Plan, Roles, la
Auditoría de flujos y el Anexo. **La Evolución deja de serlo**: su fichero se queda con
una tabla de dónde está ahora cada capítulo, para que ningún enlace de una decisión vieja
se rompa.

### 2 · Los estados de lo que se escribe

Para que nunca se confunda lo escrito con lo hecho, los maestros dicen de cada cosa
**que no esté construida** en qué módulo llega, y `ESTADO.md` lleva la lista corta de
**lo que todavía no está en la app**. Lo que existe de verdad lo sigue diciendo el
catálogo del código (`packages/ui/src/apps.ts`), que una prueba cuadra con la tabla B5 del
Plan.

### 3 · La regla del tamaño de los ficheros

La regla «ningún fichero pasa de 300 líneas sin justificarlo» **no la vigilaba nada** y
la pasan 97 ficheros, muchos con un tercio de comentarios. Richi: «si es una regla
tonta, quítala, y que sea lo más óptimo posible». Queda así:

> **Un fichero tiene una responsabilidad.** Un componente de pantalla que pasa de unas
> 400 líneas de código (sin contar los comentarios) o que hace varias cosas se parte
> **la próxima vez que se toque**, por responsabilidades —la ficha, la hoja de corregir,
> la del aprovechamiento—, nunca todos de golpe. Lo que no se toca, no se parte: partir
> sin necesidad es riesgo sin beneficio.

### 4 · Los nombres que cambian en todos los documentos vivos

- **Estook Enlace → Estook Link** (0056).
- **Estook TPV es una puerta propia**, `apps/tpv` (0056), no un modo de `apps/app`.
- **La prueba pide tarjeta** (0048), en el Manifiesto y en el Plan.
- **El PIN deja a nombre de quien lo teclea** (0057).
- **El cierre de caja de Servicio es el cierre del día** (0058).

Las decisiones y la historia **no se reescriben**: cuentan lo que se pensó entonces.

## Cómo se comprueba

- Las dos pruebas que leen documentos siguen en verde: la tabla B5 del Plan (no se ha
  tocado) y el lanzador bien escrito.
- Ningún enlace de ningún documento apunta a un fichero que no existe.
- El formato de todo el repositorio pasa.
- Los PDF de los maestros se regeneran.
