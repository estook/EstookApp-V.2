# 0073 · C1 · Hablar: el chat del equipo, al segundo y en el móvil

**Fecha:** 6 de octubre de 2026
**Estado:** construido, con la migración `0056`. Sigue el plan de [`docs/c-el-chat.md`](../c-el-chat.md) y las seis respuestas de Richi ([0071](0071-las-respuestas-de-c.md)).
**Cambia:** la barra de arriba (el botón del chat, con su número, abre el chat de verdad), la campana (llega al segundo), el aviso del móvil (también por el chat) y la política de seguridad de la app (`wss:` a nuestro Supabase y el audio de las notas de voz).

## Lo que se ha construido

### Dónde se habla

- **«Todo el equipo», «Cocina» y «Sala»**, que se crean solos la primera vez que alguien abre el chat en el local (pregunta 3).
- **Quién ve cada canal sale del rol**: «Todo el equipo», todo el local menos la gestoría; «Cocina», la cocina (y el chef corporativo); «Sala», la sala; y **dirección, area manager y gerente, todos**. Una sola regla en la base, `estook.puede_ver_el_canal`, que usan todas las políticas.
- **Canales creados** («Barra», «Encargados») por quien lleva el local, con quién entra; quien lleva el local los ve todos.
- **Privados**, de dos o de un grupo de hasta doce, que abre cualquiera. **Con una sola persona, el que ya hubiera.** **Nadie más los ve**: ni el gerente, ni el dueño, ni preguntando por su identificador, ni en el buscador (probado).
- **Añadir gente** a un grupo o a un canal creado, y **salir** de ellos. De los tres de fábrica no se sale: se silencian.

### Qué se manda

- **Texto**, con **@nombre** para nombrar a alguien (la app propone los nombres al escribir «@»).
- **Fotos**, reducidas en el móvil antes de subir; **documentos** (PDF, Word, Excel, hasta 10 MB); y **notas de voz** de hasta tres minutos, grabadas con lo que trae el móvil.
- **Responder** a un mensaje, **reaccionar** (👍 ❤️ 😂 😮 🙏 ✅), **copiar**.
- **Corregir** lo propio los primeros 15 minutos (sale «editado»), **borrar** lo propio de verdad (queda «Se eliminó este mensaje») y **retirar** de un canal quien lleva el local, con su porqué en la auditoría. **En un privado no retira nadie.**

### Leído, al segundo y en el móvil

- **Enviado ✓, entregado ✓✓ y leído ✓✓ en verde**; en un grupo, «3/8» y **quién lo ha leído**. Leído es con el canal abierto y la app a la vista. **No se puede ocultar** (pregunta 6).
- **Al segundo**: Supabase manda a cada móvil abierto un toque «hay algo nuevo en tal canal», **sin el mensaje**; la app lo pide con su sesión. Sin toque, el chat abierto pregunta cada 30 segundos. **La campana también llega al segundo.**
- **El móvil suena** con las reglas de I: en tu turno, o fuera de tus horas de silencio. Lo que se junta de un canal sale en uno («Cocina · 3 mensajes nuevos»). **Los privados y lo que te nombra suenan siempre**; un canal se puede silenciar. **Nunca va por correo** ni a la campana.
- **El número** del botón del chat y el del icono de la app cuentan lo que no se ha leído.

### Buscar

Arriba de la lista, con y sin acentos, en lo que cada uno puede ver.

## Lo que decidí al construirlo, y por qué

1. **El toque al segundo, por un canal público con nombre secreto** (`estook.tema_al_segundo`), y no por canales privados de Supabase: los privados piden la sesión de Supabase, y Estook tiene la suya. Como por el toque no viaja el mensaje, escucharlo no enseña nada. **Sin claves nuevas**: el servidor usa las del almacén.
2. **Los toques se dan con el comando ya guardado**: si llegaran antes, la app preguntaría y no vería nada.
3. **La lista y el móvil leen los nombres con la sesión o con la función del chat**, nunca la tabla de personas a pelo: como sistema, esa tabla no enseña nombres.
4. **Los canales de fábrica se crean como sistema**, y los nuevos con su identificador puesto antes: insertar con `on conflict` o con `returning` obliga a poder **ver** la fila nueva, y quién ve un canal se decide mirando en la tabla, donde todavía no está (lección 143).
5. **Los documentos, hasta 10 MB y no 20** (el plan decía 20): viajan dentro de la petición, en base64, como el logo.
6. **En el modo cocina del móvil estrecho se recoge el buscador**, no el chat: antes se recogía el chat porque solo decía lo que sería; ahora es de verdad y una cocina lo usa con las manos ocupadas.
7. **El «+» se esconde dentro del chat**: iba justo donde va el botón de mandar.
8. **Silenciar es por canal, dentro del propio chat**, y no en Ajustes → Avisos: es donde se nota y donde se cambia.
9. **El jefe de cocina o de sala que puede editar Equipo también crea canales y retira mensajes**: es «quien lleva el equipo», y la regla de la base es la misma que la del Tablón.

## Lo que no entra en C1

Lo de **C2 · Lo oficial**: fijados, «Confirmar que lo he leído», las tarjetas y mandar el horario al chat. Y lo que ya no entraba en C (`c-el-chat.md`): la traducción (con Fogón), llamadas, un canal de toda la cadena y hablar con el proveedor.
