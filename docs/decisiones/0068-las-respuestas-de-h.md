# 0068 · Las respuestas de H: dos entregas, el aparato de fichar, la pausa, el horario de todos y el motor de los PDF

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido por Richi. H1 se construye con esto; H2, después.
**Completa:** la [0067](0067-pro-a-99-el-chat-adelantado-y-el-plan-de-h.md), que dejó las seis preguntas.
**Cambia:** Roles (1.3: el horario publicado lo ve todo el equipo), [`docs/h-horarios.md`](../h-horarios.md), [`coste-por-local.md`](../coste-por-local.md), [`config/claves.md`](../../config/claves.md) y la lista de encargados de [`docs/legal/`](../legal/cumplimiento.md).

## Lo que contestó Richi

1. **¿H en dos entregas?** «Ok, si lo recomiendas, sí.»
2. **¿Aparato del local para fichar?** «Sí.»
3. **¿Pausa?** «Sí, pausa de descanso si es horario partido, al igual que en el horario, claro.»
4. **¿Libre, Vacaciones y Baja?** «Como me recomiendes»: sí.
5. **¿Quién ve el horario?** «Ven el horario de todos, o pueden ver solo su horario si lo seleccionan; es interactivo, app tipo calendario, y el gerente o los jefes pueden enviarlo al chat como un short o cosas así.»
6. **¿El motor de los PDF?** «La que recomiendes tú. Que no sume dinero ni dependamos de otra, pero que los PDF queden muy profesionales, los de toda la app.» Y preguntó si todo será en Cloudflare.

## Lo que se decide

### 1 · H1 y H2

**H1 · Personas y fichajes**: la persona sin correo, el aparato de fichar, la pausa, las correcciones que no borran, la exportación para la Inspección, el motor de los PDF y los informes en PDF. **H2 · El horario**: el cuadrante entero. Cada una con su pull request.

### 2 · El aparato del local para fichar

- Quien lleva el local, **desde el propio aparato**, lo convierte en «el aparato para fichar» del local (Ajustes → Tu local). Se le da un nombre y queda con **su propia llave**, que no es la sesión de nadie.
- Enseña un teclado. Cada uno teclea **su PIN** y ve su nombre, si está dentro o fuera, y los botones que tocan: entrar, pausa, volver, salir.
- **Solo sirve para fichar.** No abre la app ni enseña nada de nadie más.
- **Se puede quitar** desde cualquier otro aparato; deja de valer al momento.
- **Contra el que prueba PIN al azar**: diez fallos seguidos y el aparato se para cinco minutos. Los PIN de verdad no se pueden sacar de él: la huella no sale del servidor (0057).
- El fichaje queda como **«hecho en el aparato del local»**, sin pedir la ubicación: el aparato está en el local.
- Es la primera pieza del **terminal** de la 0057. Estook TPV lo ampliará; no se tira nada.

### 3 · La pausa

- **Pausa de descanso**, dentro de un turno, con dos botones. **Una abierta a la vez**, y fichar la salida con una pausa abierta la cierra.
- **Si cuenta como trabajo lo elige cada local**; de fábrica **no cuenta** (Estatuto de los Trabajadores, art. 34.4). Y un local puede no usar pausas.
- **El horario partido son dos turnos**, con su salida y su entrada; el hueco no es pausa.
- En el horario (H2), cada tramo podrá llevar su descanso previsto.

### 4 · El horario lo ve todo el equipo

Una vez publicado, **cada persona del local ve el horario de todos**, o solo el suyo si lo elige, como un calendario que se toca. **Nunca los euros**, y el borrador solo quien lo monta. Cambia lo que decía Roles 1.3 («no ve el cuadrante completo»): en un bar el horario está en la pared, y si Estook no lo enseña, alguien le hace una foto. **Mandarlo al chat** es la tarjeta del horario, que H2 deja hecha y el chat (entrega C) enseña.

### 5 · El motor de los PDF: Cloudflare Browser Run

- **Plantillas en HTML** en `packages/documentos`, con una base común para todos los documentos de la app, y **Cloudflare Browser Run** convirtiéndolas en PDF.
- **No suma dinero mientras quepa en el gratuito** (unos 400 PDF al día). Cuando no quepa, 5 dólares al mes.
- **La dependencia es de Cloudflare**, que es a donde va la web de todas formas, y el motor se cambia sin tocar las plantillas (plan B: el mismo Chromium en Google Cloud Run).
- **En las pruebas**, un motor de mentira que no llama a nadie; y para mirar cómo quedan, el Chromium del proyecto (`pnpm documentos:muestra`).
- **Sin sus dos secretos, no se rompe nada**: el botón dice que los PDF todavía no están encendidos.
- **Cloudflare pasa a la lista de encargados** de datos: por ahí pasan, un momento, los nombres y las horas.

**«¿Todo en Cloudflare?»** La web, sí, en la mudanza. La base, la API y los ficheros se quedan en Supabase (0061).

## Lo que no se decide aquí

- **Unir dos personas** cuando alguien sin correo da uno que ya es de otra: se avisa y no se toca nada. Unirlas llega con M13.
- **Mandar el horario al chat**, que espera al chat (C).
