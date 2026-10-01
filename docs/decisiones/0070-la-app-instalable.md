# 0070 · I · La app instalable: en la pantalla de inicio, sin conexión y con avisos al móvil

**Fecha:** 1 de octubre de 2026
**Estado:** construido, con la migración `0054`. Sigue lo que contestó Richi el mismo día a las seis preguntas de [`i-la-app-instalable.md`](../i-la-app-instalable.md), y las mejoras 14 y 15 de [`mejoras-antes-de-m8.md`](../mejoras-antes-de-m8.md).
**Cambia:** cómo avisa Estook ([0017](0017-como-avisa-estook.md)): el tercer canal, el móvil, queda montado; Ajustes → Avisos ([0052](0052-la-campana-y-los-avisos.md)) gana la columna «Móvil»; el aparato del local ([0068](0068-las-respuestas-de-h.md)) ficha sin wifi; y el fichaje se puede apuntar a mano.

## Lo que contestó Richi (1-oct)

Pidió, antes que nada: **«lo mejor para la empresa y el restaurante, lo más lógico y menos enrevesado; que el jefe, el dueño o el cocinero sientan que está pulido y es profesional, como lo hacen otras marcas top»**.

1. **¿Dos entregas?** «Si lo ves mejor hazlo en una, como sea más óptimo; probar puedo esperarme.» → **Una entrega**: una migración, un despliegue y dos secretos, una sola vez.
2. **¿Lo último que viste, sin señal?** «Sí, lo que me recomiendes.» → **Sí**, solo para mirar, con el aviso arriba.
3. **¿El aparato del local sin wifi?** «Elige la mejor.» → **Sí, con el PIN cifrado** (abajo).
4. **¿Horas de silencio?** «El area manager no sale [en el horario]; los demás, lo que ellos quieran; que lo configuren desde Ajustes.» → **Cada uno elige**: en su turno, o fuera de sus horas de silencio, con las horas a su gusto.
5. **¿«Suele llegar hacia las…» en el proveedor?** «Sí; si se deja en blanco no pasa nada.» → **Opcional**, y **en blanco no avisa** (abajo, por qué).
6. **¿La lista de fábrica del móvil?** «Que se elija en Ajustes cuáles sí; lo que suelen hacer las apps de este estilo; **que no se quede sin ver una notificación**, que avise bien y que sea personalizable.»
7. **Extra: ¿una app en el TPV de Windows que saque tickets por la impresora de cocina?** → **Ya está pensado**, y no entra en I: es **Estook Link** (M19a), el programa del ordenador del local que imprime en cualquier impresora ESC/POS ([Anexo](../maestros/Estook-Anexo-TPV-y-Facturacion.md), capítulo 6).

## Lo que se ha construido

### En la pantalla de inicio

- **El trabajador de servicio**, escrito a mano y generado al construir (`herramientas/trabajador-de-servicio.ts`), con los nombres exactos de los ficheros de esa versión. Guarda lo de arrancar (unos 1,2 MB, una vez); lo grande que solo usa una pantalla se guarda al abrirla. **La versión nueva manda en cuanto está lista**, y la anterior se conserva una vuelta, para que una pestaña abierta no se quede sin sus trozos.
- **Instalar**: una tarjeta pequeña en el Panel del móvil, una sola vez. En Android, el botón «Instalar»; en el iPhone, los dos toques dibujados (Apple no deja poner un botón).
- **El manifiesto**: identidad fija y dos atajos al mantener pulsado el icono, «Fichar» y «Apuntar una merma».

### Sin conexión (mejora 15)

- **Fichar (entrada, pausa, vuelta, salida) y apuntar mermas** se guardan en el móvil si no hay señal y **salen solos al volver**, en orden y con la misma clave de idempotencia: nunca dos veces.
- **La hora la pone el servidor**: el móvil manda **cuánto hace** (`x-hecho-hace`), medido con su reloj entre hacerlo y mandarlo. Que el móvil vaya adelantado da igual: solo cuenta la diferencia. Se aceptan **hasta siete días**; con **más de doce horas** sin señal, el fichaje sale **«por revisar»** en Equipo → Resumen, con «Está bien» o «Abrir su ficha». Lo que no declara `sinConexion` y llega diciendo «hecho hace» se rechaza.
- **Se dice siempre**: arriba, «Sin conexión · lo de las 10:42»; «2 sin mandar» mientras haya algo; y lo que al volver Estook no pudo apuntar (entrar estando ya dentro, una merma de más) queda en «1 sin apuntar», con su porqué, hasta que se da por visto.
- **Lo último que se vio**, guardado en el móvil, se enseña sin señal (pregunta 2), **también con la señal colgada**: si en cuatro segundos no contesta nada y `/salud` tampoco, es «sin conexión», igual que el trabajador de servicio no espera más de cuatro segundos por una pantalla. Atado a la sesión que lo leyó, se borra al salir y caduca a la semana.
- **Salir con cosas sin mandar** pregunta antes: «Esperar a tener señal» o «Salir y perderlo».

### El aparato del local sin wifi (pregunta 3)

- El PIN no se puede comprobar sin conexión (su huella no sale del servidor), así que el aparato **enseña los cuatro botones**, guarda lo tecleado **cifrado con su llave pública** (RSA-OAEP) y lo manda al volver. **En la tablet no queda ningún PIN legible**: la privada solo la tiene Estook, en una tabla que solo lee el sistema.
- **Cada cifrado vale una vez** (un número de un solo uso, apuntado al usarse): copiarlo de la tablet y volver a mandarlo no ficha dos veces. Y siguen valiendo los frenos de siempre: diez PIN fallados paran el aparato.
- **Lo que no se puede apuntar no se pierde en silencio**: un PIN que no es de nadie, o entrar estando ya dentro, le llega a quien lleva el equipo como aviso («Un fichaje sin conexión no se ha podido apuntar»), y lo apunta a mano.

### El fichaje que falta, apuntado a mano

Quien lleva el equipo apunta el fichaje que falta desde la ficha de la persona, **con su nombre y su motivo** (lo exige la base), sin ubicación (su porqué es `a_mano`), en la auditoría, y **al trabajador le llega su aviso**, como al corregírselo. No se apunta encima de otro suyo ni en el futuro.

### Los avisos al móvil (mejora 14)

- **Web Push con claves propias (VAPID), sin servicio de pago ni librerías**: cifrado de punta a punta con las claves de cada navegador (RFC 8291, comprobado byte a byte con el ejemplo de la RFC) y firmado con la de Estook (RFC 8292). **Solo se manda a los servicios de avisos de Google, Apple, Mozilla y Microsoft**: una dirección inventada no hace que Estook llame a donde alguien quiera.
- **Ajustes → Avisos**: «Este móvil» (recibir, probar, dejar de recibir y la lista de sus móviles), **«Cuándo suena el móvil»** y la columna **Móvil** al lado de Campana y Correo. Sin campana no hay móvil.
- **Cuándo suena** (pregunta 4): de fábrica, **en su turno** a quien tiene horario, y **fuera de sus horas de silencio (23:00 a 08:00)** a quien no lo tiene; cada uno lo cambia. Lo que llega en silencio **espera y sale en uno solo** al acabar («Tienes 3 avisos»). «Entras en cinco minutos» no espera nunca.
- **De fábrica, al móvil** (pregunta 6), solo lo que pide hacer algo ya: entras en cinco minutos, lo que caduca, el pedido que no ha llegado, te piden ayuda con un pedido, tu horario publicado o cambiado, te corrigen o apuntan un fichaje, y un fichaje sin conexión que no se pudo apuntar. Lo demás, en la campana, y cada uno lo enciende.
- **Que no se quede sin ver** (pregunta 6): todo sigue en la campana; **lo que suena en el móvil no va también por correo**, pero si el móvil no lo recibe (cambió de teléfono, tras cinco intentos), **sale por correo** si lo quería así; y el icono de Estook lleva **el número de los sin leer**.
- **El permiso se pide cuando tiene sentido**: después de fichar, con «¿Te avisamos en el móvil?», o enseguida a quien no ficha; y siempre desde Ajustes.
- **Los cuatro avisos nuevos**: «Entras en 5 minutos» (del horario publicado o el de siempre, y se da por visto al fichar), lo que caduca (la víspera a las 18:00 y el mismo día a las 08:00, en el reloj del local), el pedido que no ha llegado (media hora después de cuando suele) y el fichaje sin conexión sin apuntar.
- **El reloj**: cada hora apunta lo de la hora siguiente; **cada minuto la base mira, dentro de sí misma, si hay algo que mandar**, y solo entonces llama a la API (`/tareas/movil`). Antes de mandar se comprueba que sigue haciendo falta: si el turno cambió o el pedido llegó, nada.

## Lo que decidí al construirlo, y por qué

1. **Una sola entrega** (pregunta 1): Richi no tiene prisa por probar, y así es una migración, un despliegue y dos secretos.
2. **La hora sin conexión, con «cuánto hace» y no con el reloj interno**: el del plan se pierde cuando el móvil cierra la app, que en el iPhone pasa a menudo. Lo que sí no se puede saber es si alguien **cambia la hora del móvil a propósito mientras está sin señal**; por eso queda marcado «sin conexión», y con más de doce horas, por revisar.
3. **En blanco, el pedido no avisa** (pregunta 5): «si se deja en blanco no pasa nada». Avisar a una hora inventada (las 12:00 que proponía el plan) daría avisos falsos a quien recibe por la tarde; el pedido de hoy ya sale en «Lo de hoy».
4. **El aparato sin wifi, con el PIN cifrado y no con huellas en la tablet** (pregunta 3): el Anexo (capítulo 3) dice que guardar las huellas de los PIN en una tablet no es seguro, y tiene razón: un PIN de seis cifras se adivina desde su huella. Cifrado con la pública, solo Estook lo lee.
5. **Un 403 del servicio de avisos no borra el móvil**: puede ser un fallo nuestro, y borrar los de todo el mundo sería mucho peor que reintentar. Se borra con un 404 o un 410 (ya no existe), o tras veinte fallos seguidos.
6. **Lo guardado sin señal se suma, no se pisa** (lo cazó una captura): al abrir con mala señal, guardar los primeros segundos —todavía sin nada leído— borraba lo bueno. Tiene su prueba.
7. **El trabajador de servicio, apagado en las pruebas de pantalla** salvo en la suya: con él encendido, Playwright no puede cortar lo que pide la app, y la prueba que corta un trozo para ver que se dice bien dejaría de cortarlo.
8. **Las claves VAPID se hacen en el ordenador de Richi** (`.\estook.cmd movil:claves`) y van a los secretos de Supabase: ni al repositorio ni al chat.
9. **`/salud` dice si los avisos al móvil están encendidos** (sí o no, nunca la clave), y `bd:comprobar-api` sale en rojo si faltan los secretos, si la API no conoce `/tareas/movil` o si `pg_cron` no tiene el latido de cada minuto.
10. **En el ordenador, la tarjeta se llama «Este ordenador»**: Chrome y Edge también reciben avisos, y llamarlo móvil confundía (repaso con capturas).
11. **Los logos de Estook también se guardan en el móvil**, y si el del local no llega sin señal, se ve el icono en su lugar: abrir sin cobertura enseñaba una imagen rota (repaso con capturas).

## Lo que no entra

El chat y lo que cambia al segundo (C) · hacer pedidos, inventarios o recibir mercancía sin conexión · publicar Estook en el App Store o en Google Play · los avisos del APPCC (M16b), que usarán esta pieza · imprimir en la cocina, que es Estook Link (M19a).
