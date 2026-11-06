# 0132 · R2 · 2 · Servido y cambiar un plato

**Fecha:** 6 de noviembre de 2026
**Estado:** construido en la rama `r2-2-servido-y-cambiar`, **con la migración 0103**.
**Sigue:** la [0131](0131-r2-1-la-sala-y-la-mesa.md) (R2 · 1, fusionada con la #165) y las respuestas
de Richi del 5-nov en la [0130](0130-la-pausa-del-5-nov-r1-lo-rapido.md). Las maquetas, aprobadas el
5-nov (puntos 1.2 y 8.1).
**Cambia:** el Anexo (3.2, 3.4 y 11.8), ESTADO y el plan de M20A.

La segunda mitad de R2. Con ella queda entera la mesa en el móvil.

## 1 · El camarero también marca lo servido (punto 1.2)

Richi, 5-nov: «una opción en Ajustes para que los camareros puedan tachar lo servido». Y después: **la
cocina no toca nada de más, porque tiene las manos ocupadas o grasientas**.

- **Ajustes del TPV › Cocina y barra › La sala: «Los camareros también marcan lo servido»**. Viene
  apagado de fábrica, así que tacha la cocina, como hasta hoy.
- **Con la cocina solo en papel, la sala lo marca siempre**: nadie más lo tacha y es la única forma de
  que el plano sepa qué ha salido. Lo mismo con la barra en papel.
- **«Servido», en la mesa**, junto a Pedir, Cuenta y Cobrar. Abre el ticket de la mesa con **casillas
  grandes**:
  - Lo que está en marcha se marca con un toque.
  - «Todo el 2.º» marca un pase entero de un toque.
  - Lo que espera a marchar sale apagado: no se sirve lo que nadie está haciendo.
  - Lo ya servido sale marcado. Lo que marcó la sala se puede desmarcar; lo que tachó la cocina, no.
- **En cocina**, la tarjeta se pone en verde: **«Lucía ha marcado servido · 2 Entrecot · 1 Merluza»**,
  con **«Deshacer · quedan 4 min»** (5 minutos, `MINUTOS_PARA_DESHACER_SERVIDO`). Deshacer destacha
  esos platos. Pasados los 5 minutos, se quedan tachados como los de la cocina.
- **El plano lo cuenta igual que si tachara la cocina**: al marcarlo todo, la mesa pasa a «Comiendo» y
  luego a «¿Cuenta?». **Con la cocina solo en papel**, «Esperando» ya no se queda para siempre: se
  queda hasta que el camarero lo marca. El tiempo sigue sin ponerse en rojo, porque nadie tacha a su
  hora.
- **Si la cocina tachó algo y a la vez el camarero lo marca, no es un error**: en un servicio se
  cruzan, así que lo ya tachado se deja como está.

## 2 · Cambiar un plato, sin PIN (punto 8.1)

Richi, 5-nov: «no necesita pin… si lo cambian se cambia y listo… si ya estaba hecho, se apunta en merma
como cambio del cliente. En un servicio cada segundo es oro».

- **Al tocar un plato: La nota, Cambiar y Quitar** (y Devolver si ya salió).
- En **Cambiar** salen primero **los de su misma sección** (un entrante por un entrante). En un menú,
  salen los de su sección de hoy, con su suplemento. Hay un buscador para lo demás. Si el plato elegido
  pregunta algo al pedirlo (la guarnición, lo que pesa), se pregunta aquí igual.
- Al elegirlo, abajo se dice qué pasa: «La cocina lo verá como CAMBIO, con su sonido. La cuenta baja
  2,50 €».
- **Sin mandar**, se cambia sin más.
- **Ya mandado**:
  - El de antes queda quitado con «Cambio del cliente» y apunta al nuevo.
  - El nuevo va a cocina **en su mismo pase**: si estaba en marcha, en marcha; si esperaba, esperando.
  - La cocina lo ve en naranja, **«CAMBIO · Lucía · 1 Croquetas → 1 Bravas»**. El de antes sale tachado
    con «→ Bravas», y suena el aviso fuerte de lo anulado.
  - En papel sale **CAMBIO** con «EN LUGAR DE: 1 Croquetas».
- **«¿Ya estaba hecho?» lo contesta el camarero, con dos botones grandes**. Richi rechazó que fuera la
  cocina. **Solo se pregunta si hace falta**:
  - Si su pase espera a marchar, no estaba hecho, porque nadie lo ha empezado.
  - Si ya salió, lo estaba.
  - Solo cuando está en marcha y no ha salido, el camarero lo sabe y lo dice.
  - **Si lo estaba, lo que lleva su ficha va a merma con el motivo nuevo «Cambio del cliente»**, que
    cuenta como pérdida (food cost).
- **Quitar sin más sigue igual**: lo que ya está en cocina lo quita un jefe o lo aprueba un encargado
  con su PIN (0107). Cambiar no baja la cuenta a cero, porque en su lugar va otro plato de verdad. La
  base solo deja quitarlo sin PIN si el plato nuevo existe, es de la misma mesa, está mandado y dice
  qué cambió.

## 3 · Los minutos de «¿Cuenta?», del local

Eran 15 fijos (0131). Ahora se cambian en **Ajustes del TPV › Cocina y barra › La sala**, de 5 en 5,
entre 5 y 120. De fábrica siguen siendo 15.

## 4 · La base

Migración **0103**:

- En el local, `camareros_marcan_servido` y `minutos_para_la_cuenta`.
- En cada plato:
  - `servida_en_sala`: lo marcó la sala.
  - `cambio_de`: «1 Croquetas».
  - `cambiada_por`: el plato nuevo.
  - `estaba_hecho`.
- El motivo de merma `cambio_del_cliente`.
- `la_cocina_del_local` y `cambiar_lo_del_tpv_del_local` se copian enteras con lo nuevo.
- **La regla que guarda lo mandado** (`lo_mandado_no_se_reescribe`, la de la 0090 copiada entera) gana
  dos puertas:
  - La sala tacha lo servido si el local lo deja, y destacha solo lo suyo.
  - Un plato cambiado se quita sin PIN.

  Sin ellas, la API decía que sí y la base que no (lección 251).

Hay dos órdenes nuevas en la API: `marcar_servido` y `cambiar_un_plato`. Quedan **119 consultas y 336
comandos**.

## 5 · Lo que decidió la IA al construirlo

1. **«¿Ya estaba hecho?» solo cuando hace falta.** Se deduce si su pase espera a marchar (no lo estaba)
   o si ya salió (lo estaba), y solo se pregunta en marcha.
2. **La merma se apunta producto a producto, por su ficha**, y nunca por encima de lo que hay. No se
   apunta si quien cambia no puede apuntar mermas: el camarero puede de fábrica. **El cambio no se para
   por la merma**, y el plato queda apuntado con «estaba hecho» igual.
3. **«Cambio del cliente» no sale al apuntar una merma a mano**: lo apunta la sala sola, y en la lista
   sería uno más que leer. En la lista de Mermas sí se puede filtrar por él.
4. **Un menú no se cambia entero.** Se cambia el plato de dentro, por otro de su sección de hoy. El
   mismo plato tampoco se cambia: para eso está la nota.
5. **El camarero desmarca solo lo que marcó él (la sala)**. Lo tachado por la cocina lo destacha la
   cocina.
6. **«Deshacer» en cocina dura 5 minutos** y se lleva lo último que marcó esa persona de una vez.
7. **El sonido de un cambio es el aviso fuerte de lo anulado**, sin sonido nuevo: el plato de antes
   cuenta como anulado, y es lo que hay que mirar ya.
