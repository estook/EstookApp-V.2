# 0105 · M16a · La jornada: el día que se abre solo, se cierra en tres pasos y se reabre con motivo

**Fecha:** 22 de octubre de 2026
**Estado:** construida en la rama `m16a-la-jornada` (migración **0080**). Cambia la API y la app.
**Sigue:** el Plan, M16a («apertura automática de jornada · fecha operativa en el servidor,
incluida la noche del cambio de hora · panel en vivo · cierre del día en cuatro pasos y sesenta
segundos · reapertura con motivo»), el Manifiesto («Cierre en cuatro pasos y sesenta segundos») y
la Auditoría de Flujos (la jornada, `abierta → cerrada → reabierta → cerrada`). Es la primera
pieza de Estook TPV ([0061](0061-el-orden-y-la-infraestructura.md)).

## 1 · Lo que contestó Richi, el 22-oct

Con M10 · 2 en producción, se le preguntó lo que los documentos no decían:

| Pregunta                                          | Lo que eligió                                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **¿Quién reabre un día cerrado?**                 | **Quien puede cerrar la caja**, con el motivo escrito siempre y a la vista en el cierre. A la una de la mañana no hay que despertar a nadie por un euro |
| **¿Se firma el cierre con PIN?**                  | **Sin PIN en tu móvil**: queda a tu nombre por tu sesión. El PIN, solo cuando se cierre desde un aparato del local (hoy solo fichan y apuntan mermas)   |
| **«En marcha», la pantalla de lo que pasa ahora** | **Sí, viva y para el servicio**: se pone al día sola cada minuto. Las ventas en directo, con Estook TPV                                                 |

## 2 · Lo que se ha hecho

| Pieza                            | Lo hecho                                                                                                                                                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **El día se abre solo**          | **Un día sin cierre está abierto**: nadie lo abre ni hace falta un reloj que lo apunte. Va **de hora de corte a hora de corte en el reloj del local**, y lo decide el servidor                                                                                                               |
| **La noche del cambio de hora**  | `laJornadaEntera` (dominio) cuenta de corte a corte, no sumando 24 horas: **el sábado 24 de octubre de 2026 dura 25 horas** y el 27 de marzo de 2027, 23. Probado en el dominio, contra la base y en `prueba:semana`                                                                         |
| **En marcha**                    | Servicio › Jornada entra por aquí: el día, si está abierto o cerrado (y quién lo cerró), cuánto le queda, la nota del cambio de hora, «falta cerrar el martes» y **los mismos widgets del Panel** —quién está dentro, agotados, menú de hoy, merma y lo que llega—, cada uno con su permiso  |
| **Cerrar el día, en tres pasos** | **Las ventas** (lo de siempre: total, cómo se cobró, platos, la foto del Z), **las mermas** (lo que se ha tirado ese día y «Apuntar una merma», la hoja de siempre) y **el repaso** (lo facturado, el ticket medio, si el desglose no cuadra, cuántos siguen fichados y «queda a tu nombre») |
| **Un día cerrado no se toca**    | Ni volviendo a cerrar (`jornada_cerrada`) ni por debajo: **la base** no deja cambiar sus cifras ni sus platos. Tampoco una app de antes con «Corregir»                                                                                                                                       |
| **Reabrir con motivo**           | «Reabrir» en el día cerrado pide **por qué**; el día vuelve al formulario con lo que tenía y sale «Reabierto · sin volver a cerrar» con el motivo. Al cerrarlo, **corrige sin duplicar**, y debajo queda «Reabierto por Ana el miércoles a las 10:12: «…»». También en la auditoría          |

Las operaciones nuevas: la **consulta** `la_jornada` (sin un euro: la ve también la sala) y el
**comando** `reabrir_la_jornada`. `un_cierre` trae el estado del día, sus reaperturas y cuántos
siguen fichados. La API pasa a **102 consultas y 230 comandos**. La 0080 trae
`cierre_de_caja.estado`, la tabla `reapertura_de_jornada` (solo se lee y se añade), las dos
reglas que no dejan tocar un día cerrado y `como_esta_la_jornada`. Un evento nuevo,
`jornada.reabierta`, y dos errores, `jornada_cerrada` y `jornada_abierta`.

## 3 · Lo que decidí al construirlo

1. **«Abierta» no es una fila.** Guardar «la jornada está abierta» junto a «no hay cierre» serían
   dos verdades que pueden contradecirse, y haría falta un reloj que abriera cada día de cada
   local. Sin cierre, abierto; el cierre de caja, que ya era uno por jornada (0029), gana el estado.
2. **Tres pasos, no cuatro**, mientras no exista el APPCC (M16b): un paso sin nada que hacer no se
   enseña. Llegará en su sitio, entre las mermas y el repaso.
3. **El repaso avisa y no bloquea**: un desglose que no cuadra o dos personas fichadas se dicen y
   se cierra igual («un compañero, no un policía»).
4. **Quién sigue fichado, solo cuántos**: lo que se viene a hacer es cerrar la caja; los nombres
   están en Equipo para quien los ve.
5. **Las mermas se apuntan solo en el día de hoy**: una merma lleva la hora en que se tiró. Cerrando
   un día de antes, se ven las suyas.
6. **«En marcha» con los widgets del Panel, no con otros**: así una cifra no dice una cosa aquí y
   otra en el Panel. Se refrescan cada minuto solo con la pantalla a la vista.
7. **La base guarda la regla, no solo la API**: un día cerrado en otra transacción solo admite
   pasar a reabierto, y solo si en esa misma transacción se ha escrito por qué. Borrar el local o
   quitar los ejemplos sí se lleva sus días: eso no es tocarlos.
8. **Reabrir dos veces no apunta dos reaperturas**: si ya está reabierto, se dice y no se escribe nada.
9. **Mientras la API no esté desplegada**, la app nueva no se cae: un día con cierre se ve cerrado
   y uno sin cierre, abierto.

## 4 · Lo que no entra, y dónde va

- **El APPCC que falte** (el tercer paso del Manifiesto): con **M16b**.
- **Calcular el consumo teórico y descontarlo al cerrar**: con **M20**, que trae las ventas plato a
  plato. El evento `jornada.reabierta` ya avisa para rehacerlo cuando exista.
- **El análisis nocturno de Fogón al cerrar**: con **Fogón 2**, que necesita esas ventas.
- **Cerrar con PIN desde un aparato del local**: cuando el aparato pueda cerrar (Estook TPV, M20A).
- **Que el día se cierre solo si nadie lo cierra**: no. Sin TPV, Estook no sabe lo que se ha
  vendido; se queda abierto y el Panel y «En marcha» dicen «falta cerrar el martes».
