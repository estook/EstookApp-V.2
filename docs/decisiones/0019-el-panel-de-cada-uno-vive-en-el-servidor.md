# 0019 · El Panel de cada uno vive en el servidor

**Fecha:** 8 de septiembre de 2026
**Estado:** decidido y construido en M6½ · migración `0025`

## Lo que el Manifiesto prometía

> «Una rejilla de widgets que cada uno coloca a su gusto, arrastrando. La
> configuración se guarda **por persona y por dispositivo**: el gerente puede
> tener un Panel en el ordenador y otro distinto en el móvil.» (Manifiesto 6)

Con su tabla de dieciséis widgets, su lista de «qué trae puesto cada rol», y
«fijar cualquier cosa al Panel desde cualquier app».

## Lo que había

**Seis tarjetas fijas escritas a mano en el código**, iguales para las doce clases
de rol, sin poder quitar ninguna ni añadir ninguna, y **en una sola columna en el
móvil**. Seis tarjetas de ancho completo son seis pantallas de scroll para leer
cuatro cifras, y Estook se usa de pie con el teléfono en la mano.

Y de las seis:

- Una pintaba **«Facturado · 0,00 €»** en la tipografía más grande de la pantalla
  con el TPV sin conectar. Es lo que este proyecto tenía escrito que no se hace
  —«poner un cero en gris sería inventarse una cifra»— y lo tenía escrito **dos
  tarjetas más abajo, en el mismo fichero**.
- Dos decían mal en qué módulo llega lo suyo: el TPV como «M13», que es Equipo, y
  Negocio como «M17», que es Cuaderno.
- Una era un **andamio de pruebas de M3** —«apuntar una nota de prueba»— publicado
  en el Panel de un negocio de verdad.
- Y «Salud de los datos» ocupaba una tarjeta entera para decir una cifra que, en
  cuanto el local está en marcha, está siempre en verde.

## Lo decidido

**La composición del Panel se guarda en el servidor**, por persona y por aparato,
en `estook.panel_de_persona` (migración `0025`).

Y es la parte que importa de esta decisión, porque la alternativa fácil era
`localStorage`. Se descarta por la lección que la migración `0024` ya dejó escrita
con estas palabras: **«para siempre» tiene que ser para siempre en todos sus
aparatos**. Montarse el Panel en el ordenador y encontrarse el de fábrica en el
teléfono —o perderlo al cambiar de móvil— es exactamente la clase de mentira
pequeña que hace que uno deje de fiarse de los botones.

Hay una segunda razón, y decide el diseño de la tabla: **Fogón tiene que poder
leerla**. «Que te ordene lo que hay que atender por lo que más cuesta si se deja»
(M22) necesita saber qué le importa a esta persona, y eso está aquí.

### Por aparato, y no por dispositivo

La clave es `(persona, aparato)`, y `aparato` es `movil` o `escritorio`, no el
identificador de un teléfono concreto. Es lo que dice el Manifiesto, y es lo único
que se sostiene: quien se monta su Panel en el móvil de casa espera encontrárselo
en el de la cocina, no empezar de cero. `estook.dispositivo` existe desde M5 y
sirve para las sesiones, que es otra cosa.

### Y no lleva local, a propósito

Un area manager que lleva seis locales no quiere montarse seis paneles. Los
widgets dicen **qué** mirar; el local dice **de dónde**, y eso ya lo lleva la
sesión. El día que alguien pida un Panel distinto por local, se añade la columna
con su valor nulo para «el de siempre».

### El catálogo de widgets vive en el código

La base **no valida los identificadores**. Un widget que ya no existe se ignora al
pintar, y uno nuevo entra sin migración. Validarlos en la base obligaría a una
migración —o a un despliegue de la API— por cada widget nuevo, que es justo la
clase de acoplamiento que hace que nadie añada widgets.

Eso no deja ninguna puerta abierta: lo que se guarda es una lista de nombres que
**solo esa persona puede leer y escribir** (la política de la `0025` es
`persona_id = estook.persona_actual()`, y no «lo ve quien comparte
organización»), y que solo decide en qué orden se pintan unas tarjetas cuyos datos
vienen, cada uno, de su propia consulta con su propio permiso.

## El arrastre, sin librería

La decisión [0007](0007-el-movimiento-sin-libreria.md) dice que no se instala una
librería de movimiento «hasta que haga falta». Aquí no hace falta, por dos razones
concretas:

- Lo que se mueve es **el orden de una lista**, no una posición libre en un
  lienzo. Con `elementFromPoint` se sabe sobre qué widget está el dedo, y el orden
  nuevo sale de una permutación: no hay física que simular.
- Y el movimiento que hace falta ya estaba escrito en B6: «widget que se arrastra:
  levanta 4 px con sombra `--s3`, 120 ms». Eso son dos clases de CSS.

Va con eventos de puntero —los mismos para dedo, ratón y lápiz— y con
`setPointerCapture`, para que el arrastre no se pierda al salirse del widget. Y
**con teclado también**: cada widget lleva sus dos botones de mover en modo de
edición, porque un arrastre solo con el dedo deja el Panel sin configurar a quien
no puede arrastrar (B8).

## Lo que se guarda con retraso, y lo que no · **corregido**

Arrastrar un widget de una esquina a otra son veinte reordenaciones, porque el
orden cambia cada vez que el dedo pasa por encima de otro. Guardar cada una serían
veinte comandos para acabar en el mismo sitio, así que **el arrastre va con
retraso**: la pantalla se mueve al momento y el servidor se entera cuando se suelta
el dedo, o a los ochocientos milisegundos.

**La primera versión aplicaba ese retraso a todo, y perdía la personalización de
tres maneras.** Lo vio Richi con la aplicación ya desplegada: «todo lo que
personalices, si refrescas o te mueves de página y vas atrás, se quita y vuelve a
como estaba por defecto».

1. **Los gestos sueltos también esperaban 800 ms.** Quitar un widget, añadir uno o
   cambiarle el tamaño no producen veinte cambios: producen uno. Esperar abría una
   ventana en la que recargar o salir del Panel perdía el cambio, y salir del Panel
   justo después de colocar algo **es lo normal**: se coloca y uno se va a mirar lo
   que ha colocado.
2. **Al guardar no se tocaba la caché de TanStack Query**, así que seguía con lo
   viejo y con la versión vieja. Volver al Panel leía esa caché y pisaba lo tuyo, y
   el siguiente guardado mandaba una versión que ya no era la de la fila: el
   servidor contestaba «lo cambió otra persona» —contra ti mismo— y dejaba de
   guardar del todo.
3. **Y al desmontar la pantalla se cancelaba el reloj y se tiraba lo pendiente.**

Ahora: los gestos sueltos se guardan al momento, el retraso queda solo para el
arrastre, la caché es el único dueño de lo que se pinta y se actualiza con la
versión nueva en cada guardado, **solo hay un guardado en vuelo** —el siguiente
espera a que vuelva el anterior con su versión— y lo pendiente se manda al
desmontar y al cerrar la pestaña.

Y **«guardando…» dura hasta que la cola está vacía**, no hasta que vuelve la primera
petición. Es lo honesto de cara a quien lo usa, y además es lo único que deja
comprobarlo desde fuera.

Se puede escribir así porque lo que se guarda no es un dato del negocio: si se
perdiera el último gesto de un arrastre, lo que pasa es que un widget se queda donde
estaba.

## Y no publica evento

Es el primer comando del proyecto que no deja nada en la bandeja de salida, y
conviene decir por qué. La regla 14 pregunta «¿quién se entera cuando esto
cambie?», y aquí la respuesta honesta es **nadie**: mover un widget no cambia
ningún dato del negocio, no dispara ninguna reacción y no hay ninguna otra parte de
Estook que deba reaccionar. Publicar un evento por cada arrastre sería llenar de
ruido una bandeja que todavía no vacía nadie.

Tampoco entra en la auditoría, y por lo mismo: la auditoría es «de todo lo que toca
dinero, permisos o registros legales», y esto no toca ninguno de los tres.

## Lo que esto le cuesta a las pruebas

Una consecuencia que conviene tener escrita: **el Panel es ahora estado del
servidor, así que una prueba que lo toca deja el Panel cambiado para la
siguiente**. La prueba de «la barra de deshacer se va sola» quita un widget y deja
caducar la barra a propósito, así que el widget se queda fuera y guardado.

Se arregla desde la propia aplicación —«volver al panel de siempre»— y no tocando
la base a mano: es un camino de persona, y comprobarlo de paso no sobra.
