# 0009 · El buscador quita los acentos con `translate`, no con `unaccent`

**Fecha:** 1 de septiembre de 2026 · **Módulo:** M3 · **Estado:** aceptada

## Qué se decide

`estook.sin_acentos()` (migración **0017**) se escribe con `translate()` y una
lista explícita de letras. **No se instala la extensión `unaccent`**, aunque B5
la nombre. `pg_trgm` sí se usa, tal cual.

## Por qué

### 1. `unaccent` no existe en el Postgres de las pruebas

A3 exige tres capas de pruebas, y una es «**Postgres efímero**», que aquí es
PGlite. PGlite trae `pg_trgm` como extensión enchufable, pero **no trae
`unaccent`**. Se comprobó:

```
pg_trgm       create OK
unaccent      extension "unaccent" is not available
```

Usarlo dejaría el buscador entero —dieciséis pruebas: sin acentos, con erratas, y
sobre todo el **aislamiento entre organizaciones**— sin poder ejecutarse. Un
buscador que solo se comprueba a mano contra Supabase es un buscador sin probar,
y el aislamiento es justo lo que no se puede dejar sin probar: es el sitio más
fácil por donde se escaparían los datos de otro local, porque busca en varias
tablas a la vez.

### 2. `unaccent()` no es inmutable, y aquí hay que indexar

`unaccent()` depende de un diccionario que se puede cambiar por debajo, así que
Postgres —con razón— **no deja indexar una expresión que lo use**. Sin índice
GIN, buscar entre cien mil productos sería recorrerlos todos, y B7 da 150 ms.

Se puede rodear declarando un envoltorio `immutable`... que estaría mintiendo: si
alguien tocara el diccionario, los índices quedarían mal **en silencio**.

`translate()` no tiene ninguno de los dos problemas: es inmutable de verdad, no
depende de nada externo, y existe en cualquier Postgres.

## Qué cubre la lista

Los cinco idiomas de la interfaz (español, catalán, gallego, euskera e inglés) y
los nombres europeos que aparecen en proveedores y personas:

```
áàäâãå → a    éèëê → e    íìïî → i    óòöôõø → o    úùüû → u
ñ → n    ç → c    ýÿ → y    šžćčřěłđ → s z c c r e l d
```

Lo mismo hace la mitad de JavaScript (`packages/ui/src/buscar/trigramas.ts`),
para que **las dos mitades del buscador perdonen lo mismo**: la misma errata en
un local y en una acción.

## Cuándo se revisaría

Si un día hiciera falta buscar en un alfabeto que esta lista no cubre —cirílico,
griego—. Entonces habría que traer `unaccent` de verdad y, con él, una forma de
probar el buscador que no dependa de PGlite.
