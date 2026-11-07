# 0141 · T6 · 2 · 3 · Pide tu factura

**Fecha:** 7 de noviembre de 2026
**Estado:** en producción con la #176 (7-nov), **migración 0111**, y probado en IKATZ: dos facturas pedidas desde el móvil, «Correcto», con su PDF en el correo. Sin caja nueva:
la línea nueva del justificante es texto, y la 1.3.0 lo imprime.
**Sigue:** la [0125](0125-t6-la-facturacion-las-tres-respuestas.md), la
[0136](0136-t6-2-1-el-motor-y-el-ticket.md) y la [0140](0140-t6-2-2-2-las-correcciones.md).
**Maquetas:** la pantalla principal, aprobada el 2-nov ([T6, las preguntas](../maquetas/t6-la-facturacion.html));
sus estados, lo del justificante y lo que se ve en Estook, aprobados el 7-nov
([T6 · 2 · 3](../maquetas/t6-2-3-pide-tu-factura.html)).
**Cambia:** el Anexo (4.11, 5.3, 7.6 y 8), `conservacion-de-datos.md`, `registro-de-actividades.md`,
`preguntas-al-asesor.md`, el plan de M20A, el mapa y ESTADO.

`estook.com/factura/<código>`: el cliente pide la factura de su ticket en su móvil, y le llega al correo sin
que nadie del equipo teclee nada. **Todo en pruebas**: nada llega a Hacienda de verdad hasta las once
condiciones. **El QR en el papel llega con el cobro (T7).** Hasta entonces, «Copiar el enlace» en cada ticket.

## 1 · Cómo funciona

| Qué pasa                 | Qué hace                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Abre el enlace           | Dice lo que toca: el formulario, que espere, que ya tiene factura, que no se puede o que se pide en el local |
| Escribe su NIF           | Se comprueba en Hacienda al salir del campo. **No se rellena nada de lo que Estook sepa de ese número**      |
| Pide la factura          | Una **F3**, con el importe del ticket, la misma que hace el equipo, con el origen `pedida`                   |
| Hacienda dice «Correcto» | El reloj de los documentos le manda el PDF al correo, en menos de un minuto                                  |
| Hacienda la rechaza      | El ticket queda libre, le llega un correo con el enlace, y a ti te sale arriba y en la campana               |
| Vuelve a abrir el enlace | «Este ticket ya tiene factura», y «Mandarla otra vez», **solo al correo que se dio**                         |

## 2 · Lo que hace falta para que no enseñe nada a quien no debe

- **La puerta es el código del ticket**, doce letras y cifras al azar (60 bits), de un alfabeto sin las que se
  confunden al copiarlas. Lo guarda `codigo_de_ticket`, y cada ticket nace con el suyo con un disparador. **Los
  que ya había también**: el enlace de uno de ayer tiene que funcionar.
- **Nada se rellena solo.** En la pantalla del equipo, un NIF conocido trae su domicilio y su correo (0139). Aquí
  eso enseñaría los datos de otro a quien escriba un NIF ajeno, así que no se usa.
- **La factura no se descarga, solo llega al correo.** Quien se encuentre un ticket en una papelera no puede leer
  los datos de nadie. **El ticket sí**: no lleva datos de ninguna persona, y es a lo que da derecho el justificante.
- **El correo no sale de la API**, ni siquiera tapado. Cuando ya tiene factura, la página solo sabe si hay a dónde
  mandarla.
- **Son comandos, no consultas**: cuentan intentos, y el código viaja en el cuerpo y no en una dirección que se
  queda en los registros. Y la página le dice a los buscadores que no la guarden.

## 3 · Los límites, a la hora

| Qué                          | Por ticket | Por dirección de internet |
| ---------------------------- | ---------- | ------------------------- |
| Un código que no es de nadie | —          | 30                        |
| Comprobar un NIF o pedirla   | 10         | 30                        |
| Mandarla otra vez            | 3          | 10                        |
| Descargar el ticket          | 10         | 30                        |

Sin ellos, cualquiera usaría la página para preguntarle a Hacienda por NIF ajenos o para llenarle el correo a
alguien. **La dirección de internet se guarda una hora** y se borra sola: solo sirve para contar. Sin ella (si no
llega), cuenta el ticket.

## 4 · Lo que costaba de verdad

- **Sin sesión, las filas no se ven.** Los comandos entran como el sistema (`estook.es_el_sistema()`), el mismo
  camino que el reloj. `preparar_el_documento` y `apuntar_el_canje` lo miran: **el origen `pedida` solo lo puede
  preparar el sistema**, y con sesión no se puede pasar por uno. Esas dos funciones se copiaron enteras de la 0110.
- **El correo espera a Hacienda**, porque hasta entonces la factura puede acabar rechazada. Va en una cola
  (`correo_por_mandar`) que mira el reloj de los documentos, **no** el aviso de Verifacti: ese hay que contestarlo
  en menos de diez segundos y un PDF puede tardar más. Si no sale, reintenta a 1, 5, 15, 60 y 240 minutos; después
  lo dice en Tickets y facturas y en Sentry, y `bd:comprobar-api` sale en rojo.
- **Lo que corrige una pedida le llega a quien la pidió**: con un disparador en `rehecho`, así vale cuando la
  corrige el equipo y cuando la repite el cliente. Y si la repite él, **la rechazada deja de salir arriba**.

## 5 · Lo que decidió la IA, sobre lo aprobado, y por qué

1. **«Ya tiene factura» manda aunque el local la haya apagado después**: volver a mandarla no hace nada nuevo.
2. **Con la factura apagada, el ticket se sigue pudiendo descargar**: el justificante da derecho a él (Anexo 4.11),
   y apagar «Pide tu factura» no debería quitárselo.
3. **Solo con el ticket en «Correcto»**, no en «En Hacienda», aunque el equipo pueda hacerla antes: el texto de la
   0125 dice «solo cuando está registrado», y es cuestión de un minuto.
4. **El enlace sale mientras el cliente pueda usarlo**, también con el ticket todavía en Hacienda: la página espera sola.
5. **A quien tenga factura hecha por el equipo y mandada a un correo, se le reenvía al último de esos.** Si no se
   mandó a ninguno, dice «Esta factura la tiene IKATZ. Pídesela allí».
6. **Una factura pedida no avisa a nadie**, salvo que Hacienda la rechace: se ha hecho sola y queda en su sitio con
   su chapa. Es lo de «un compañero, no un policía».
7. **El pago no la para**: el derecho del cliente a su factura no depende de que el local esté al día con Estook.
8. **Lo que escribió el cliente no vuelve a salir** si Hacienda lo rechaza: el formulario sale vacío, y el correo
   que se le manda no repite sus datos.

## 6 · Lo que queda para el asesor (Anexo, capítulo 9)

- **Quien se encuentra un ticket y pide la factura a su nombre.** Es lo mismo que pasa en los demás TPV con QR: el
  ticket es la prueba. El equipo la puede anular o corregir.
- **El aviso de privacidad** de la página, que dice que el responsable es el restaurante y Estook su encargado.
- **El texto del correo** cuando Hacienda rechaza los datos.

## 7 · Lo que sigue sin hacer, para que nadie lo dé por hecho

- **El QR «Pide tu factura» en el papel**, con T7: abajo y más pequeño, después del tributario.
- **Un rechazo de verdad** no se puede forzar en IKATZ: se ha visto contra el Verifacti de mentira.
- **El tema oscuro**: la página sale siempre en claro, como la carta.

## 8 · Las pruebas

En `pide-tu-factura.prueba.ts` (21, contra la base y el Verifacti de mentira), `pide-tu-factura.prueba.ts` del dominio
(15) y, desde la pantalla, en `tickets-y-facturas.spec.ts`. De la **prueba 14** del Anexo queda hecho lo de descargar
el ticket con el justificante.
