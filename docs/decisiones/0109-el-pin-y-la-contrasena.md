# 0109 · El PIN y la contraseña: el PIN, para los aparatos del local; la contraseña, para Estook; y lo olvidado, con un enlace al correo

**Fecha:** 24 de octubre de 2026
**Estado:** decidido con Richi (la A) y construido, en su pull request (`el-pin-y-la-contrasena`),
con la migración 0084.
**Sigue:** la [0108](0108-t1-la-puerta.md) (T1 · La puerta) y la
[0017](0017-como-avisa-estook.md), que ya decía que con el correo encendido se abriría «he olvidado
mi contraseña».
**Sustituye:** de M4 (Manifiesto 31, Plan M4) y de la [0083](0083-la-experiencia.md), que **en
Estook se entre también con el PIN**. Lo demás de las dos sigue valiendo.
**Cambia:** el Manifiesto (31), el Plan (M4), la Auditoría de flujos (los fallos), la Arquitectura
(16), el mapa y ESTADO.

## 1 · Lo que vio Richi

El 24-oct, probando T1 en IKATZ, Richi se encontró con esto:

1. **Quien crea el restaurante no tiene PIN.** Crear la cuenta no daba ninguno, y Mi acceso solo
   enseñaba los PIN que ya existían. A quien no tenía ninguno le decía «te lo da quien lleva el
   local»… siendo él quien lo lleva. No podía entrar en su propio TPV.
2. **Quien olvida su PIN o su contraseña depende de que esté el gerente**: no había forma de
   recuperarlos solo. Le pasó con la cuenta de gerente de prueba y con la de jefe de cocina.
3. **El PIN y la contraseña se solapan y confunden**: el PIN servía para dos cosas, para entrar en
   Estook con el correo (la pestaña «Con PIN») y para los aparatos del local.

Pidió auditarlo, mirar cómo lo hacen las mejores, y arreglarlo.

## 2 · Cómo lo hacen las mejores

- **Square**: el dueño ve y cambia el código de cada uno desde su panel.
- **Toast**: el código del TPV lo da y lo cambia el encargado desde la web; el empleado no puede
  cambiarlo solo, y su acceso a la web es aparte, con su contraseña.
- **Lightspeed**: el administrador cambia las credenciales del personal; el dueño recupera su
  contraseña con un enlace al correo.

En las tres, **el código corto es solo para el TPV del local**, y a la web de gestión se entra con
correo y contraseña, que se recupera por correo.

## 3 · La respuesta de Richi

| Pregunta                                                    | Respuesta                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ¿Se sigue pudiendo entrar en Estook con el correo y el PIN? | **A · PIN solo en el local**: el PIN es para Estook TPV y fichar, y Estook se abre con contraseña o con Google |

## 4 · Lo que se decide

1. **El PIN es para los aparatos del local** —Estook TPV y la pantalla de fichar—, y **Estook se
   abre con la contraseña o con Google**. Fuera la pestaña «Con PIN» de la puerta, y `entrar` ya no
   acepta el PIN.
2. **«¿La has olvidado o no tienes una?»**, debajo de la contraseña: se escribe el correo y llega
   un enlace, de un uso y que vale **una hora**, para poner una. Las sesiones de antes se cierran,
   y **el segundo factor se sigue pidiendo**. Es también la puerta de quien entraba con el PIN y no
   tenía contraseña, y de quien acaba de ser invitado.
3. **«¿Has olvidado tu PIN?»**, en la pantalla del PIN de Estook TPV y en la de fichar: se escribe
   el correo y llega un enlace, de un uso y que vale **media hora**, que da un PIN nuevo **para ese
   local**; el de antes deja de valer. Quien no tiene correo se lo pide a quien lleva el local, como
   hasta ahora (Equipo › la persona › Acceso › PIN nuevo).
4. **Quien vincula el primer aparato sale con su PIN** si no tenía en ese local (el caso de quien
   crea el restaurante), y puede pedir uno nuevo en ese mismo paso («No recuerdo mi PIN»).
5. **Mi acceso › Mi PIN enseña cada local donde trabajas**, tengas PIN o no, con «Ponerme un PIN» o
   «Uno nuevo».
6. **El PIN no se puede volver a ver**, ni en Mi acceso ni en Equipo (Square sí lo enseña): lo que
   se guarda es su huella, y si se pudiera leer no protegería nada. Si se olvida, se saca otro.

## 5 · Lo que decidí al construirlo

1. **No se dice si un correo existe.** Pedir el enlace contesta lo mismo siempre. En la puerta de
   Estook, a un correo sin cuenta le llega uno que lo dice (como al crear cuenta, 0042): así tarda
   lo mismo y quien se equivocó de correo lo sabe. En el aparato del local, al de fuera **no se le
   escribe nada**: el correo llevaría el nombre de un local que no es suyo.
2. **Diez peticiones por hora desde una dirección**, exista el correo o no, y **tres enlaces por
   hora a una persona** aunque se pidan desde sitios distintos: más, no se manda ninguno, y la
   pantalla dice lo mismo. Error nuevo: `demasiados_enlaces`.
3. **Abrir el enlace no hace nada**: hay que pulsar «Poner mi contraseña» o «Ver mi PIN nuevo».
   Los antivirus de algunos correos abren los enlaces solos y los gastarían (lo mismo que el cambio
   de correo, 0041).
4. **El enlace va tras la almohadilla** (`estook.com/app/#/correo?contrasena=…`), que el navegador
   no manda en ninguna petición, y **se guarda su huella**, nunca el enlace.
5. **Una contraseña que no vale no gasta el enlace**: se mira antes de usarlo.
6. **Los administradores también la recuperan por correo**: el admin sigue pidiendo su segundo
   factor, que es lo que lo protege. Rescatar a un admin que perdió el móvil sigue siendo cosa de
   otro admin (0041).
7. **Las sesiones abiertas con el PIN antes de la 0109 siguen vivas hasta caducar** (30 días como
   mucho): Richi eligió que se pidiera la contraseña «la próxima vez». Mientras, ponerse la primera
   contraseña desde una de ellas sigue pidiendo el PIN (0083).
8. **El PIN de quien vincula el primer aparato** se da en el TPV, antes de cerrar su sesión: ya ha
   demostrado quién es con su correo (y su segundo factor).
9. **Los textos de Equipo, invitar y el alta** dicen ahora que el PIN es para los aparatos del local
   y que para Estook se pone su contraseña con el enlace.

## 6 · Lo que no cambia

- **El alta con el PIN en pantalla**, para darlo en mano el primer día (Manifiesto, M4).
- **Las personas sin correo** entran solo en los aparatos del local, con su PIN (0057).
- **Cinco fallos de una persona la paran 15 minutos; diez en un aparato lo paran 5** (0068).
- **El PIN es de 6 cifras** (0108).
