# Las trece reglas que evitan el desastre

Se leen al empezar cada sesion de trabajo. Una decision que las incumpla se
revierte aunque el codigo funcione.

1. Nunca se escribe una pantalla antes de tener escrito el modelo de datos y el contrato de la operacion que va a llamar.
2. Nunca se anade una tabla con un fichero llamado «parche». Solo migraciones numeradas, reversibles y compatibles hacia atras.
3. Nunca escribe el cliente en una tabla de dominio. El cliente llama comandos y lee vistas.
4. Nunca se protege algo solo desde la interfaz. Toda regla de acceso se prueba llamando a la API a pelo.
5. Nunca hay logica de negocio dentro de un componente. Un componente pinta y llama.
6. Nunca se calcula lo mismo en dos sitios. Un calculo, una funcion, un unico dueno.
7. Nunca se genera un PDF en el cliente.
8. Nunca se hace `UPDATE stock SET cantidad = …`. Se inserta un movimiento.
9. Nunca se guarda dinero en coma flotante. Centimos en entero.
10. Nunca se decide la fecha operativa en el navegador. La decide el servidor.
11. Nunca se da un modulo por terminado sin probarlo en un movil real y con datos de verdad.
12. Nunca se avanza al siguiente modulo con el anterior a medias.
13. Si aparece una decision de producto que no esta escrita, se pregunta y se para. No se inventa.

## Cuales comprueba la maquina

Que una regla este escrita no basta. Estas se vigilan solas:

| Regla | Quien la vigila                                                                 |
| ----- | ------------------------------------------------------------------------------- |
| 2     | `base-de-datos/herramientas/migrar.mjs` · para si una migracion aplicada cambia |
| 5, 6  | `.dependency-cruiser.cjs` · las capas y su sentido                              |
| 9     | `eslint.config.js` · `no-restricted-syntax` sobre `Math.round`                  |
| 10    | `eslint.config.js` · `no-restricted-syntax` sobre `new Date()` sin argumentos   |
| 11    | `playwright.config.ts` · el proyecto `movil-pequeno`                            |
| 12    | `ESTADO.md` · y la revision de la lista de aceptacion antes de cerrar el modulo |

## Definicion de terminado (E1 del Plan)

- Funciona en movil pequeno real, tablet y escritorio, sin desbordes ni titulos cortados.
- Funciona con conexion mala y con datos vacios, con su estado «todavia no tengo datos».
- Cumple su presupuesto de velocidad, medido.
- Pasa las pruebas de permisos y de aislamiento de su dominio.
- Ninguna operacion de stock se puede duplicar reintentando.
- Los textos van por el motor de textos, en espanol de Espana, sin jerga y sin emojis.
- Las cifras llevan su origen y su periodo.
- Ninguna dependencia nueva sin justificar.
- `ESTADO.md` actualizado.
