# 0139 · Sin lista de clientes

**Fecha:** 7 de noviembre de 2026
**Estado:** construido en la rama `t6-2-2-1-sin-lista-de-clientes`, **con la migración 0109**. Sin caja
nueva.
**Cambia:** el punto 4 de la [0125](0125-t6-la-facturacion-las-tres-respuestas.md) y lo que decía la
[0137](0137-t6-2-2-1-las-facturas-y-quien-hace-que.md) de guardar al cliente; el Anexo (7.6), Roles,
la conservación de datos, el plan de M20A y la maqueta.

## Lo que dijo Richi

Probando la factura en IKATZ, el 7-nov: el campo «Busca un cliente» y el cliente debajo «para un sitio
de eventos que alquilen está bien, pero no tiene sentido hacerlo en un bar o restaurante que se llena de
personas y tienes que hacer varias o muchas a la semana; se tendría que poner directamente el cliente,
ya sea empresa o particular, no guardarlo, sino esto se peta de personas a la larga».

**Tenía razón, y venía de un exceso de la IA.** La 0125 guardaba a los clientes de **la factura a mano**.
La 0137 lo extendió a **cada factura de un ticket**, sin preguntarlo: cada cliente de un bar dejaba su DNI
y su domicilio en una lista que no hacía falta (RGPD, art. 5, datos mínimos). Y el botón «Quitar», junto al
cliente, parecía quitarlo de la factura y lo borraba de la lista.

## Cómo queda

- **El cliente se escribe directo**: empresa, particular o de fuera, y su número, su nombre y su domicilio.
  **No hay buscador, ni lista, ni «Quitar», ni tabla de clientes.** El número va primero, también en un
  particular: es lo que trae lo demás.
- **Quien vuelve no dicta otra vez su dirección**: al escribir su número **entero**, el nombre, el domicilio
  y el correo salen de **su última factura**, que hay que conservar igualmente por ley y ya lleva su copia. Lo
  dice debajo del domicilio («De su última factura. Cámbialo si ya no es este»). Lo escrito a mano no se pisa.
- **Lo que no se usa no ocupa.** No hay nada aparte que se llene o se olvide borrar: estos datos se van
  con la factura, a su plazo.
- **Lo emitido no cambia**: cada documento lleva su destinatario congelado (0137).

**La IA propuso rellenar desde la factura, y Richi lo aceptó** («como propones»): sin esto, la empresa que
come cada semana tendría que dictar la dirección cada vez. Un camarero que escribe un DNI entero ve de nuevo
ese nombre y ese domicilio, como ya aprobó la 0137: no puede hojear a nadie.

## Lo que se encontró al cambiarlo, y se arregla aquí

1. **Un autónomo con el NIF escrito antes que el nombre se quedaba bloqueado**: Estook decía «Hacienda pide
   sus apellidos y su nombre» y, aunque lo escribieras, «Hacer la factura» no volvía a encenderse sin tocar otra
   vez el NIF. Lo mismo con un nombre que Hacienda no reconocía. **Ahora se vuelve a mirar al salir del nombre**, y
   sin nombre todavía no es un error: es que lo va a escribir ahora.
2. **Cambiar el número dejaba los datos del cliente anterior.** Con el número mal escrito y luego corregido, la
   factura podía salir con el domicilio de otro. **Lo que salió solo se va al cambiar el número**; lo escrito a mano
   se queda. Y si Hacienda contesta tarde del número de antes, no se hace caso.
3. **Con pasaporte no se rellenaba nada.** Ahora también.

## Lo que se mira

Para rellenar, solo su empresa y su entorno (lo de pruebas no pasa a lo real), y **nunca de una factura que
Hacienda no tiene**: sus datos pueden ser justo los que estaban mal. El correo, solo uno al que se le mandó de
verdad, no uno que se escribió y falló.

## Lo que sigue igual, para que nadie lo dé por hecho

Quien tiene la factura a mano y no la de un ticket (solo si la dirección se la quita a propósito) no puede
comprobar al cliente ni mandar copias: sale el aviso de sin permiso. La factura se hace igual.

## Las pruebas

`las-facturas.prueba.ts`, «sin lista de clientes»; y `tickets-y-facturas.spec.ts`, en la pantalla: rellenar,
cambiar de número y que se vaya, y volver. La API pasa a **124 consultas y 344 comandos**.

## Lo último antes de T6 · 2 · 2 · 2

Richi probó la factura a mano y mandó su Sentry, el 7-nov. **La factura a mano fue a Hacienda y volvió
«Correcto»**, y sus céntimos cuadran con la base del total. De esa revisión salieron cuatro cosas:

1. **El IVA de un concepto libre venía puesto al primero, el 10 %**, y un alquiler de sala se facturó a ese
   tipo sin que nadie lo eligiera. **Ahora se elige**, salvo que el local tenga uno solo. Qué lleva cada
   concepto no lo decide Estook: va al asesor (A11).
2. **El PDF de un ticket partía su número en dos líneas.** Ahora va entero.
3. **Lo que se ve en Sentry.** «2 documentos fiscales llevan más de dos horas» fue **el vigilante nuevo avisando
   bien** de los dos tickets antiguos, una vez, a las 13:07. «s.caja», en la sala del TPV, era una pestaña vieja con
   una API nueva: **la sala ya no se cae** por un estado que no conoce. «Ba[n].punto» salió de un código que ya no
   está (lo quitó la R3).
4. **Sin ver en IKATZ: un camarero**, porque no hay ninguno dado de alta. Está probado por la API y en pantalla
   (`las-facturas.prueba.ts`, `tickets-y-facturas.spec.ts`).
