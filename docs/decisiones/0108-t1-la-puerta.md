# 0108 · T1 · La puerta de Estook TPV: vincular aparatos, el PIN, el bloqueo, el inicio y los Ajustes del TPV

**Fecha:** 24 de octubre de 2026
**Estado:** construida, en su pull request (`t1-la-puerta`), con la migración 0083.
**Sigue:** la [0107](0107-estook-tpv-el-tpv-entero.md) y el Anexo, capítulo 11 (11.3, 11.4, 11.5,
11.12 y 11.13) y 3.4. El plan, [`m20a-la-sala-y-la-cocina.md`](../m20a-la-sala-y-la-cocina.md),
«T1 · La puerta, terminado cuando».
**Sustituye:** de la 0107, punto 5, que el código de vincular «muere a los 5 intentos fallidos»
(sección 4, punto 1); y punto 6, que el PIN sea «de 4 cifras, lo que ya existe desde M1»: es de
6 desde M4, y se queda en 6 (sección 2).
**Cambia:** el Anexo (11.3 punto 2, 11.4, 11.14 puntos 2 y 5, y el dibujo del PIN), Roles 1.12, la
Arquitectura (capítulos 4, 5 y 6), el plan, el mapa y ESTADO.

## 1 · Qué deja T1

**Estook TPV ya no entra con la sesión de Estook**: solo funciona en un aparato vinculado al local,
y cada uno entra con su PIN.

- **Vincular** (Anexo 11.3): el primer aparato, con el correo de quien lleva el local, que elige
  qué es (caja con su cajón, comandero compartido o personal, o el aparato para fichar) y **su
  sesión se cierra al acabar**; los demás, con **un código de 6 cifras o su QR**, sacado en Ajustes
  del TPV › Aparatos › Añadir, con la función y el nombre elegidos antes.
- **Entrar con el PIN** y el **turno del operador**: todo lo que se hace queda a su nombre. **«No
  has fichado»** después del PIN, y «solo entra quien ha fichado» si el local lo pide.
- **El bloqueo** (11.4): la caja y el comandero compartido a los 2 minutos y al cobrar; el móvil
  personal, a los 10; y «Bloquear» siempre arriba.
- **Lo aprueba un encargado** (3.4): quitar un plato que ya está en cocina lo aprueba un encargado
  tecleando su PIN en el mismo aparato.
- **El inicio** (11.5) con las baldosas que ya funcionan (Mesas, Fichar, Agotados y Ajustes del
  TPV); **solo oscuro** (11.12).
- **Ajustes del TPV** (11.13): **Aparatos** (añadir con su código y su QR; en cada uno, qué es y
  cómo se llama, sin volver a vincularlo; desvincular; «En línea» o «Visto hace…») y **PIN y
  bloqueo**.
- **Sale de Estook**: «Abrir la sala» de Servicio › En marcha, y la sección «El aparato para
  fichar» de Ajustes (respuesta A, abajo).

**La base** (migración 0083, con su `.revertir.sql`): `terminal` gana las cinco funciones, de quién
es (el comandero personal), su cajón, su versión y su latido; seis tablas nuevas —`cajon`,
`codigo_para_vincular`, `intento_de_vincular`, `turno_del_operador`, `ajustes_del_tpv` y
`aprobacion`— y `linea_de_cuenta.aprobacion_id`; dos permisos, `accion.vincular_aparatos` y
`accion.ajustes_del_tpv`; y `lo_mandado_no_se_reescribe`, copiada entera de la 0081 con una sola
cosa más: quitar lo ya mandado vale también con la aprobación de un encargado.

**La API**: 3 consultas y 10 comandos nuevos (`aparatos.ts`), y fuera los 3 del aparato para fichar
de Ajustes (`aparatos_para_fichar`, `poner_aparato_para_fichar` y `quitar_aparato_para_fichar`).
Queda en **109 consultas y 261 comandos**. Un solo lector del token para todas las puertas
(`quien-llama.ts`), y dos puertas nuevas en el contrato: `enElTpv` y `enLosAparatos` (sección 5).

## 2 · Las respuestas de Richi

| Cuándo | Pregunta                                                                             | Respuesta                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23-oct | La tablet para fichar de Estook › Ajustes, ¿se queda allí o pasa a Estook TPV?       | **A · pasa al TPV**: se vincula en Ajustes del TPV › Aparatos como los demás (función «Fichar») y sale de Estook › Ajustes. Las que ya había siguen funcionando |
| 23-oct | Las maquetas de T1 (pantallas 16 a 23)                                               | **«Las pantallas de T1 me valen»**                                                                                                                              |
| 24-oct | El PIN es de 6 cifras desde M4, y el Anexo, la 0107 y las maquetas decían 4: ¿6 o 4? | **6 cifras**: nadie tiene que aprender un PIN nuevo y es cien veces más difícil de adivinar. Se corrigen el Anexo y la 0107; las maquetas, cuando se retoquen   |

## 3 · Lo que no entra en T1

- **Cocina y barra no se ofrecen al vincular** hasta T4, que trae sus pantallas (la base ya las
  acepta).
- **Las baldosas que todavía no funcionan no salen**, ni apagadas: Venta rápida, Para llevar, Caja
  y Ventas de hoy llegan con T7; la Pantalla de cocina, con T4.
- **El plano se sigue dibujando en Estook › Ajustes › Tu sala** hasta T2.
- **En T1 el cajón es solo un nombre**: abrir y cerrar caja llega con T7.
- **Desvincular no dice cuántas cosas tiene el aparato sin subir** (Anexo 11.3, punto 6, «Tiene 2
  cosas sin subir»): avisa de que lo que tuviera sin subir se pierde si no se enciende antes con
  internet. El número llega con Estook Link (T5), que es cuando el aparato tiene su cola.

## 4 · Lo que decidí al construirlo

1. **«El código muere a los 5 fallos» no se puede hacer tal cual**: un código mal tecleado no dice
   a qué código iba dirigido, así que no hay a quién matar. Lo que protege es **un uso, 10 minutos y
   20 intentos por hora por dirección**: con un millón de códigos posibles, probar a ciegas no sale.
   Cambiado en el Anexo, 11.3 punto 2 y 11.14 punto 2.
2. **El turno solo vive en la memoria del aparato**: recargar la página lo bloquea (Anexo 3.4, «al
   reiniciar vuelve a su función, bloqueado»). En la base caduca a las 16 horas.
3. **La hora del turno es la de la base** (la mira `turno_activo` en cada petición); la del código,
   la de la API.
4. **La sala solo desde un aparato vinculado** (`enElTpv: 'solo'`); la cocina y los agotados, desde
   los dos sitios hasta T4. El plano («Tu sala») sigue en Estook hasta T2.
5. **Cocina y barra no se ofrecen al vincular** hasta T4 (la base ya las acepta).
6. **El aparato «Fichar» usa la pantalla de fichar de siempre** (con su modo sin conexión), y se
   le deja su llave; esa pantalla pasa a oscura, como el resto del TPV.
7. **El primero del día cae en el inicio; sin mesas dibujadas, siempre en el inicio** (la venta
   rápida llega en T7).
8. **Los Ajustes del TPV no se abren en el móvil personal de nadie**: son del local.
9. **Los PIN que ya existen no cambian**, aunque sean fáciles; solo los nuevos los evitan.
10. **En T1 el cajón es solo un nombre**; una caja nueva viene con un cajón nuevo marcado («Cajón N
    · nuevo»), y compartir uno se elige.
11. **Quitar lo ya mandado lo aprueba el encargado con su PIN** en el mismo aparato: queda a nombre
    del camarero, con la aprobación al lado (`aprobacion`), y la base lo vuelve a mirar.
12. **El toque al segundo es del aparato**, no de quien lo usa: cambiar de camarero no vuelve a
    conectar.
13. **En el móvil más pequeño (320 px) las seis casillas del código encogen** en vez de salirse de
    la pantalla.
14. **Lo que es un aparato se cambia entre caja y comandero** desde su ficha, sin volver a vincularlo
    (Anexo 11.3): quien estaba dentro vuelve a teclear su PIN, y si es el mismo aparato se bloquea y
    vuelve con lo que es ahora. **El aparato para fichar solo cambia de nombre**: vive en la pantalla
    de fichar de Estook, con su llave, así que para que sea otra cosa se desvincula y se vincula otra
    vez.

## 5 · Cómo entra un aparato en la API

- **El token de Estook TPV es `tpv.<turno>.<llave>`** (`tokenDelAparato` en `@estook/dominio`): la
  llave del aparato y el turno del operador, y la API mira las dos en cada petición con
  `turno_activo`. **Un solo lector** (`servidor/infraestructura/quien-llama.ts`) para la API de
  verdad, la de pruebas y el despachador de las pruebas.
- **Cada operación dice si vale desde un aparato**: `enElTpv: 'tambien'` (desde Estook y desde el
  TPV) o `'solo'` (solo desde el TPV). **Lo que no lo declara no pasa desde un aparato**: un
  aparato vinculado no es una puerta a la gestión. Y `enLosAparatos` dice en qué funciones
  (**un comandero no abre el cajón aunque teclee el gerente**).
- **Las dos listas están tasadas** en `despachador.prueba.ts`: una operación nueva que valga desde
  el TPV pone la prueba en rojo hasta que se apunte.
