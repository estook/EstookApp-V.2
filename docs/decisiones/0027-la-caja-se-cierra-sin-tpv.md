# 0027 · La caja se cierra sin TPV, y los dos caminos acaban en el mismo sitio

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido y construido en M6½ · migración `0029`

## Lo que se pidió

Que al registrarse y en Ajustes se elija entre **conectar el TPV** o **cerrar la
caja a mano** —a mano, con un CSV o con una foto: cuánto dinero ha entrado, qué
platos han salido y cuántos—, explicando cómo. Que la tarjeta «Conecta tu TPV» del
Panel pase a ser esa elección, diciendo que se puede cambiar en Ajustes. Y que las
gráficas y la base se alimenten del cierre, con su historial, y que «ver» lleve a
Negocio.

## Lo que había

Una tarjeta fija que pedía «Conecta tus ventas» con un botón que no conectaba nada
—el asistente es M18— y un «recuérdamelo». No se podía resolver, y dejaba fuera a
quien **no va a conectar nada nunca**.

## Uno · Una pregunta, dos respuestas buenas

`local.como_se_cierra`: `sin_decidir`, `a_mano` o `tpv`, y si es TPV, cuál. La
lista de TPV **no promete conexión**: dice cuál tienes; la de cada uno llega cuando
esté verificada (M18 y M19).

**Dónde se pregunta**, y se contesta en un solo componente:

1. **Al final del alta**, en la pantalla de «Ya está». No es un noveno paso: es la
   única pregunta que no hace falta para empezar a trabajar —se puede cerrar la
   caja sin haberla contestado— y un paso más es un paso más que se abandona.
2. **En el Panel**, mientras no se haya contestado, con «recuérdamelo». En cuanto
   se contesta, la tarjeta se va.
3. **En Ajustes › Tus ventas**, para cambiarla.

## Dos · Los dos caminos acaban en la misma tabla

`estook.cierre_de_caja`: uno por local y día, con el total, cómo se cobró, tickets,
comensales, notas y **su origen** (`a_mano`, `csv`, `foto`, `tpv`). Y sus líneas:
qué plato y cuántos, con el nombre normalizado por la base —sin acentos, en
minúsculas— para que el día que haya carta (M10) se emparejen sin volver a
escribirlos.

Cambiar de camino no pierde nada: el conector escribirá en la misma tabla que hoy
escribe la mano. Cerrar dos veces el mismo día **corrige**, no duplica.

- **A mano**: la pantalla explica los tres pasos y deja apuntar el desglose, que
  avisa si no suma el total.
- **CSV**: el que saca cualquier TPV. Se lee en el dominio (`leerUnCsvDeCierre`):
  punto y coma, coma o tabulador; decimales a la española; con o sin cabecera. Lo
  que no entiende lo dice, fila a fila.
- **Foto del Z**: el botón está puesto y apagado, y llega con Fogón en **M22**.

## Tres · Lo que se calcula con eso

Negocio › Ventas, de un periodo: lo facturado, el ticket medio y un **food cost
aproximado** —el género que ha salido del libro de movimientos esos días, valorado
a precio medio, frente a lo facturado—. Es aproximado y se dice: el de verdad
necesita las fichas (M9) y el consumo teórico (M20). Cada día lleva a su cierre.

El dinero de ventas es `dato.ventas`: quien no lo tiene no ve la caja ni recibe
esos importes.

## Lo que no se ha hecho, y dónde va

- Descontar del inventario lo que dicen las ventas: **M20**, con el emparejamiento.
- Los conectores: **M18** y **M19**.
- Reabrir un cierre con motivo, APPCC y firma: **M16**, que es el cierre entero en
  cuatro pasos.
