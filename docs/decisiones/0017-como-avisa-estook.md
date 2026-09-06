# 0017 · Cómo avisa Estook: la pantalla primero, el correo para lo que no espera

**Fecha:** 5 de septiembre de 2026 · **Módulo:** decidido en M6, se monta en M25 ·
**Estado:** aceptada

## Qué se decide

Estook tiene **tres canales**, y cada uno existe por una razón distinta:

| Canal              | Para qué                                                    | Llega en |
| ------------------ | ----------------------------------------------------------- | -------- |
| **En la pantalla** | Todo. Es el canal por defecto y el único obligatorio        | M22      |
| **Correo**         | Lo que no puede esperar a que alguien abra la aplicación    | M25      |
| **Push**           | Lo mismo que el correo, pero en el momento y sin abrir nada | M25      |

**El correo se manda con Resend**, que es lo que ya hay contratado.

### Las cuatro reglas que mandan sobre los tres

**1 · Un aviso nace en la pantalla, y solo sale de ahí si se gana el salir.**
Todo lo que Estook tiene que decir aparece en el centro de avisos. Que además se
mande por correo o por push es una decisión aparte, y **por defecto es que no**.
Un producto que avisa de todo por todos lados se silencia entero en dos semanas,
y entonces ya no avisa de nada.

**2 · Sale del producto lo que cuesta dinero si se ve mañana.** No lo urgente en
abstracto: lo caro. Un producto por debajo del mínimo un martes por la tarde no
es urgente —se compra el miércoles—, pero **un APPCC fuera de rango sí**, porque
lo que hay en juego es una inspección. La lista concreta la fija cada módulo con
su ficha, no esta decisión.

**3 · Cada persona decide qué le llega y por dónde**, y puede apagarlo todo menos
lo legal. Y **fuera de turno no suena nada**: es la misma regla que M23 le pone al
chat, y aquí vale igual. Quien libra el domingo no recibe que falta perejil.

**4 · Un aviso siempre dice qué hacer.** «Ninguna alerta llega sin su acción» es
el criterio de terminado de M22, y se aplica a los tres canales: un correo que
solo informa es un correo que se archiva sin leer.

### Y una cosa que no se hace

**Estook no manda correos comerciales.** Resend es para avisos de la operación y
para lo que hace falta para entrar —recuperar la cuenta, confirmar un correo—.
Mezclar los dos usos en el mismo remitente es la forma más rápida de acabar en la
carpeta de no deseados, y entonces tampoco llegan los que importan.

## Por qué el correo es lo primero, y el push después

**Porque el correo resuelve hoy un problema real y el push todavía no puede.**

Ahora mismo, si alguien pierde su contraseña, **no hay forma de devolverle la
cuenta**: no hay proveedor de correo, así que «he olvidado mi contraseña» no
puede mandar nada. M4 lo resolvió por otro lado —«segundo administrador o correo
de recuperación obligatorio»— y esa es la razón de que exista el guardián que la
auditoría tuvo que arreglar.

Con Resend, esa puerta se abre de verdad. Y es la primera que hay que abrir,
porque es la única de las tres que hoy **deja a alguien fuera de su propio
negocio**.

**El push necesita dos cosas que el correo no.** Un trabajador de servicio
—código que vive en el navegador y sigue vivo con la aplicación cerrada— y el
permiso explícito de cada persona. Y en iPhone, además, **solo funciona si la
aplicación está añadida a la pantalla de inicio**: Safari no da push a una
pestaña normal.

Por eso el orden es este:

1. **Ya hecho, en M6:** el manifiesto de la aplicación. Sin él, Android no ofrece
   «Instalar aplicación» y en iPhone la aplicación se abre dentro de Safari, con
   su barra comiéndose una franja de pantalla. **Los iconos llevaban generados
   desde M3 y no había manifiesto que los usara.**
2. **M25:** el trabajador de servicio, el permiso, la suscripción de cada
   aparato, y el envío. Y Resend para el correo.

## Lo que hay que tener a mano cuando llegue M25

- **La clave de Resend**, en los secretos de la función de Supabase. Igual que la
  de servicio: **nunca en el repositorio y nunca en el navegador**.
- **Un dominio verificado en Resend.** Mandar desde `algo@gmail.com` no se puede;
  hay que verificar el dominio de Estook con sus registros DNS. Sin eso, los
  correos salen pero se marcan como no deseados.
- **Las claves VAPID** del push, que se generan una vez y se guardan igual.
- **La tabla de suscripciones**, una por aparato y persona, con su fecha de
  último uso: un teléfono que se cambia deja una suscripción muerta que hay que
  poder limpiar.

## Lo que esto cambia de otros módulos

- **M22 (Fogón)** ya traía el centro de alertas. Esta decisión le añade que cada
  alerta declare **si se gana salir del producto**, y por qué canal.
- **M25 (Ajustes y notificaciones)** deja de ser solo «preferencias»: es quien
  monta los dos canales de fuera.
- **El reloj** ([decisión 0016](0016-el-reloj-es-pg-cron-llamando-a-la-api.md)) es
  lo que los dispara. Sin reloj no hay correo de fondo: hoy no hay nada que corra
  solo.
