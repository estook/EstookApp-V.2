# 0120 · Estook TPV es de Pro, y se llega por el botón de Ajustes

**Fecha:** 28 de octubre de 2026
**Estado:** decidido y construido en la rama `estook-tpv-es-de-pro` (migración 0094).
**Sigue:** la [0107](0107-estook-tpv-el-tpv-entero.md), la [0119](0119-t5-la-caja-para-windows.md)
y [la maqueta del botón](../maquetas/estook-tpv-en-ajustes.html), contestada por Richi el 28-oct.
**Cambia:** el Manifiesto (32, los planes), el Anexo (lo decidido), el Plan (M19b), lo que lleva
cada plan en la pantalla de elegir plan, y ESTADO.

## 1 · Lo que pidió Richi

«Ponlo en Ajustes, un botón que se diferencie de color, que ponga Estook TPV, y que salga a quien
haya comprado el Pro; si tienen Esencial sale bloqueado, y que diga: actualiza a Pro para poder
cobrar con nuestro TPV, y explica un poco.»

Y al contestar la maqueta:

1. **Programarlo como estará al final**, con el cobro: nadie lo va a ver antes de que esté todo.
2. **«TPV es únicamente Pro.»**
3. **Cadena siempre va en modo Pro, e IKATZ es la prueba en modo Pro**: lo tienen todo. Y la
   pantalla del candado **vende** Estook TPV: la unión de los dos, el control del gasto. Con un
   «aprender más» que llevará a la web, que se hace la última.
4. **Los conectores de otro TPV van en Estook, con Esencial**, al final: «no usan nuestro sistema
   de TPV, solo traen los datos de otro, así que no podemos pedirle que pague tanto».

## 2 · Lo que queda

- **Estook TPV es de Pro y de Cadena.** Esencial y Pausa, no. En la prueba de 7 días vale el plan
  elegido. La casa (IKATZ) y los locales de ejemplo lo tienen todo. La regla vive en un solo sitio,
  `llevaEstookTpv` (`@estook/dominio`).
- **Lo cierra la API, no la pantalla.** En dos sitios que juntos cubren cada entrada de un aparato:
  al reconocer su llave (el latido, el PIN, la pantalla de cocina) y en la puerta del pago (lo que se
  hace tras teclear el PIN). Tampoco se vincula uno nuevo, ni con el correo ni con un código sacado
  antes. **Fichar no se cierra**: es de Horarios.
- **Un local que deja Pro no pierde nada.** Sus aparatos siguen vinculados y enseñan «Este local no
  tiene Estook TPV: es de Pro», con quién lo cambia; al volver a Pro, entran como siempre.
- **El botón de Ajustes**, el único con color propio, para gerente y dirección, que son quienes
  vinculan los aparatos. Con Pro: en el ordenador, «Abrir Estook TPV» y «Descargar para Windows»;
  en el móvil abre Estook TPV. Con Esencial: «PRO», y al tocarlo vende Estook TPV con el precio y
  «Pasar a Pro».
- **Los planes dicen la verdad.** Pro: «Estook TPV: la sala, la cocina y la caja». Esencial: «Las
  ventas de tu TPV, por fichero o conectado». La conexión automática con otro TPV salió de Pro.

## 3 · Lo que decidió la IA al construirlo

1. **La migración 0094, `estook.el_plan_de`.** Lo que entra con la llave de un aparato no tiene
   persona, y la suscripción solo la ve quien ve la organización: leída a pelo llegaba vacía y el
   aparato de un local en Esencial pasaba. La prueba lo cazó antes de subirlo.
2. **Sin el dato del plan (la API sin desplegar), el botón se pinta como con Pro**, y la API decide.
3. **Sin icono de candado**: Estook no tiene uno. Bloqueado va en gris, con borde de puntos y «PRO».
4. **Los textos del botón, cortos** («Sala, cocina y caja», «Cobra con Estook»): en la columna de
   Ajustes del ordenador, los largos se partían en dos líneas.

## 4 · Lo que falta contestar

- **Dónde ficha en Esencial quien no tiene móvil.** Desde la 0115 se ficha en la caja, y un local
  en Esencial no tiene caja.
- **Adónde lleva «Aprende más» mientras no haya web.**
