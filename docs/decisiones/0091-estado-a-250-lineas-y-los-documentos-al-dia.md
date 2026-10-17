# 0091 · ESTADO a 250 líneas, y qué documento se toca con cada cambio

**Fecha:** 17 de octubre de 2026
**Estado:** decidido por Richi y hecho en la rama `la-puesta-al-dia-del-17-oct`.
**Cambia:** el tope de `ESTADO.md` de la [0063](0063-una-fuente-por-tema.md) (150 líneas) y el Plan, A2.

## Lo que pasó

La 0063 dejó `ESTADO.md` en **150 líneas como mucho**, para que se leyera en dos minutos.
Se cumplía en la letra y no en el fondo: el 17-oct tenía 150 líneas justas, pero **siete
de ellas eran párrafos de 1.400 a 6.300 caracteres** (el de «Lo que decidió la IA» solo, más
de seis mil). Contar líneas premiaba apretar, no resumir. Y **decía cosas que ya no eran
verdad**: el repaso del 16-oct seguía «en su pull request» cuando ya estaba fusionado,
migrado y desplegado.

Richi, el 17-oct: que se amplíe a **200-250 líneas, bien optimizadas**, y que **siempre se
actualice junto a los otros documentos**, porque es lo que evita construir a ojo y hace el
proyecto fuerte.

## Lo que se decide

1. **`ESTADO.md` pasa a 250 líneas como mucho**, y **ninguna línea de texto pasa de 700
   caracteres** (las filas de las tablas no cuentan: Prettier las rellena con espacios).
   Las dos cosas las vigila una prueba (`base-de-datos/pruebas/el-estado-se-lee-bien.prueba.ts`).
2. **Las cifras de la cabecera cuadran con el repositorio**: cuántas decisiones y cuántas
   lecciones dice, las que hay. La misma prueba.
3. **«Lo que decidió la IA por su cuenta» se va a su documento**,
   [`docs/lo-que-decidio-la-ia.md`](../lo-que-decidio-la-ia.md). En `ESTADO.md` quedan las
   de la última entrega.
4. **Lleva una nota de relevo**: desde el 17-oct trabajan dos cuentas de la IA por turnos,
   nunca a la vez, y la que entra tiene que saber si la otra dejó algo a medias.
5. **Qué documento se toca con cada cambio** lo dice una tabla del Plan (A2), y **va en el
   mismo pull request que el cambio**, no después. Es lo que ya pedía E2 («documentación
   actualizada en el mismo pull request»), escrito de forma que no se pueda olvidar.

## Lo que decidí al construirlo

1. **Medir también lo largo de cada línea de texto**, y no solo cuántas hay: sin eso, el
   tope se vuelve a cumplir apretando párrafos. Setecientos caracteres son unas cinco
   líneas de pantalla; las filas de las tablas no cuentan, porque Prettier las rellena.
2. **Que la prueba cuadre las cifras de decisiones y lecciones** de la cabecera con las que
   hay en el repositorio. Son las dos que se quedaban atrás en cada entrega; las de
   producción (migraciones, consultas y comandos) no las puede saber una prueba, y las
   comprueban `bd:comprobar` y `bd:comprobar-api`.

## Y lo que contestó Richi el mismo día

- **El modo cocina de Ajustes se queda** (lo dejó preguntado la [0090](0090-el-repaso-del-16-oct.md),
  punto 4): «no se usará, pero déjalo». Es el de botones y letra grandes para la tablet; el
  de Escandallos sigue quitado.
- **La app, «un 25 % más rápida, tal vez»** después del repaso del 16-oct.
- **VeriFactu**: Richi había oído que se aplazaba otra vez. Comprobado en la fuente: el 5-oct
  Hacienda anunció la **previsión** de llevarlo a **octubre de 2028**, **sin BOE todavía**.
  Queda apuntado en el Anexo (1.2) y en el mapa; hasta que se publique, mandan las fechas de
  2027 y no cambia ni el orden ni lo que se construye.

## Lo que no cambia

Lo demás de la 0063: cada tema en un solo documento, la historia de cada entrega fuera de
`ESTADO.md` (en [`historia-de-los-modulos.md`](../historia-de-los-modulos.md)) y que nunca
afirme algo que no sea cierto en ese momento.
