# 0069 · H2 · El horario de la semana

**Fecha:** 1 de octubre de 2026
**Estado:** construido en H2, con migración `0053`. Sigue lo decidido por Richi en la [0068](0068-las-respuestas-de-h.md) y los once puntos de «Lo que decido yo» de [`h-horarios.md`](../h-horarios.md).
**Cambia:** Roles (el horario publicado se mira en Calendario › Turnos y en «Mi turno»), el Panel de fábrica de la sala y la cocina, y lo que miran «entras en cinco minutos», quién entra hoy y los retrasos.

## Lo que hay

- **La semana del local**, de lunes a domingo, tramo a tramo: turnos partidos, de noche (el que sale antes de entrar acaba al día siguiente), el descanso previsto de cada tramo, y **libre, vacaciones y baja**, que ocupan el día entero.
- **Borrador y publicado, en dos sitios.** Lo que se monta (`turno`) solo lo ve quien lleva el horario (`accion.publicar_cuadrante`). Al publicar se copia a `turno_publicado`, que es **lo único que ve el equipo**. Así se puede seguir tocando una semana publicada sin que el equipo vea cada paso, y al volver a publicar se sabe exactamente a quién le cambia algo.
- **Lo que se mira antes de publicar**, en rojo o en ámbar, y **nunca impide publicar**: menos de 12 horas entre jornadas (rojo), pasarse de las horas de contrato (rojo), más de 9 horas de trabajo un día, sin día y medio seguido de descanso en la semana, o al 90 % de sus horas (ámbar). Quien no tiene contrato puesto se compara con 40.
- **Lo que cuesta**, solo a quien ve el coste de personal: la semana, cuántos no tienen sueldo puesto, y qué parte es de las ventas previstas (la media del mismo día en las cuatro semanas de antes con caja; con menos de dos, «todavía no se sabe»). **Quien lo monta sin ese permiso ve horas y ni un euro**: sus horas de contrato le llegan por `horas_de_contrato`, sin los sueldos.
- **Publicar avisa**: la primera vez, a cada uno lo suyo; después, **solo a quien le cambia algo**, y le dice qué día y cómo queda. En la campana y por correo, de fábrica.
- **Para no empezar de cero**: copiar la semana anterior y rellenar con el horario de siempre, que preguntan antes de pisar lo que haya.
- **En PDF**: el de la pared (apaisado, sala, cocina y el resto) y el de cada uno. Solo lo publicado.
- **Lo ve todo el equipo**: en Calendario › Turnos (camareros y cocineros tienen Calendario, no Equipo), en Equipo › Horarios, en `/horario`, y **«Mi turno»** en el Panel: hoy, con quién coincido, y la semana en pequeño, que es la tarjeta que el chat enseñará (entrega C).
- **Cuando hay horario publicado, manda el horario**: «entras en cinco minutos», a qué hora entra hoy cada uno y los retrasos miran lo publicado; sin él, el de siempre.
- **Quien no tiene correo** ve sus próximos días al teclear su PIN en el aparato del local.

## Lo que decidí al construirlo, y por qué

1. **Sale en el horario quien ficha en el local** (su puesto tiene `accion.fichar`), y todo el equipo, no «a quien llevas»: los dos jefes llevan los dos horarios (0010). La gestoría y quien solo administra la cuenta no salen.
2. **El sueldo que cuenta es el vigente el domingo**, al acabar la semana, como el Resumen de Equipo con su periodo. Con el del lunes, quien tenía el sueldo puesto desde el jueves costaba 0 €: salió al mirar las capturas.
3. **El correo del horario lleva lo suyo escrito, no un PDF adjunto.** Hacer un PDF por persona al publicar serían quince llamadas a Cloudflare de golpe, y el gratuito deja una cada diez segundos. El PDF está en la app, a un toque.
4. **Un tramo no se pisa con otro de la misma persona**, contando el de la noche de antes. Eso sí se impide: no es un aviso, es un error de teclear.
5. **El «día» de un tramo es el día en que empieza**, como se lee en la pared. Para los retrasos, un tramo que empieza antes de la hora de corte es de la jornada de antes, igual que el horario de siempre.
6. **`dato.cuadrante_completo` se queda sin uso en H2**: el horario publicado lo ve todo el local (0068) y el borrador lo da `accion.publicar_cuadrante`. Se revisa en M14, con las vistas de mes y día.

## Lo que no entra

Que Fogón proponga el horario (M22), cambiar turnos entre compañeros, vacaciones con solicitud y saldo, festivos (M13), las vistas de mes y de día (M14), avisos al móvil (I) y mandarlo al chat (C). **El horario de la semana siguiente en «entras en cinco minutos»** del domingo por la noche mira la semana en curso: se afina con los avisos al móvil (I).
