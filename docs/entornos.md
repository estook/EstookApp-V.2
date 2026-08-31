# Los entornos

Tres, mas el de demostracion. Lo dice M0 y lo resuelve `packages/utiles/src/entorno.ts`.

| Entorno        | Donde vive                       | Base de datos                       | Para que                                           |
| -------------- | -------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `desarrollo`   | La maquina de quien programa     | La suya, con las dos semillas       | Construir                                          |
| `pruebas`      | La integracion continua, efimera | Postgres efimero, se tira al acabar | Que nada se fusione roto                           |
| `demostracion` | Publicado, con datos ficticios   | Propia, con el restaurante ficticio | Ensenar el producto y sacar las capturas de la web |
| `produccion`   | Publicado                        | La de verdad                        | Los locales reales                                 |

## Como se decide en que entorno se esta

Nadie lee `import.meta.env` ni `process.env` por su cuenta. Se llama a
`resolverEntorno()`, que mira `VITE_ENTORNO` y luego `ENTORNO`. Si no hay nada, es
`desarrollo`: el entorno que menos dano hace equivocandose.

## Banderas de funcion

Viven en `packages/utiles/src/banderas.ts`, con un valor por entorno. El catalogo
es cerrado y tipado, para que no acaben apareciendo cadenas sueltas por el codigo.
Se pueden pisar con `VITE_BANDERA_<NOMBRE>` en cualquier entorno.

A partir de M25 se podran encender por local desde Ajustes. Hasta entonces, solo
por catalogo y por variable.

## El de demostracion

Lleva el restaurante ficticio entero, se entra y se sale sin dejar rastro, y es de
donde salen las capturas de la web publica (C5). Nunca se hacen capturas con datos
de un cliente real.
