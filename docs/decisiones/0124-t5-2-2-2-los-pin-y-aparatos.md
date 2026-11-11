# 0124 · T5 · 2 · 2 · 2 · Los PIN y Aparatos: sin internet entra y ficha cualquiera por la caja, y Aparatos dice quién llega

**Fecha:** 2 de noviembre de 2026
**Estado:** construido en la rama `t5-2-2-2-los-pin-y-aparatos`, con la migración **0098**; la
API gana **un comando** (`los_pin_del_centro`: pasa a **115 consultas y 314 comandos**) y hay que
desplegarla; y la caja para Windows pasa a la **1.2.0**, que hay que publicar (lleva dentro la
1.1.0, que nunca se publicó).
**Sigue:** la [0123](0123-t5-2-2-la-caja-de-centro.md) (la caja de centro, su punto 5) y las
maquetas ya aprobadas: las de T5 · 2 ([`t5-2-sin-internet.html`](../maquetas/t5-2-sin-internet.html),
secciones 1 y 3, del 29-oct) y las de los cuatro avisos
([`t5-2-2-la-caja-de-centro.html`](../maquetas/t5-2-2-la-caja-de-centro.html), secciones 1 a 3,
del 31-oct). **No hay pantallas nuevas.**
**Cambia:** el Anexo (3.4 y 3.6), la Arquitectura (capítulo 7), el plan de M20A y ESTADO.

## 1 · Lo que pidió Richi

El 2-nov, sin haber probado aún nada del TPV («prefiero esperar a acabar esta parte»): seguir con
**T5 · 2 · 2 · 2 · Los PIN y Aparatos**, como está en el plan de M20A: entrar con el PIN de
cualquiera sin internet en un aparato que llegue a la caja, fichar sin internet en la caja, que
Aparatos diga quién llega a la caja y si va por wifi o por cable, y los avisos de Windows.

## 2 · Cómo lo hacen los mejores

- **Toast**, con su centro por cable: **sin internet no se puede entrar en el TPV** —quien estaba
  dentro sigue, quien sale no vuelve a entrar hasta que vuelve la conexión— y **no se ficha en otro
  aparato**. Si el cierre del turno pide repaso, tampoco se ficha la salida.
- **Square** no tiene centro: cada aparato guarda lo suyo, y lo que se ve de fichar sin conexión no
  está documentado.
- **Lightspeed** sigue mandando a cocina; de entrar con el PIN sin conexión no dice nada.
- **Los de servidor en el local** (Ágora, por ejemplo) funcionan sin internet porque todo vive en
  el local, pero hay que comprar y mantener ese servidor.

**Estook hace lo mejor de cada uno con la caja que el local ya tiene:** entra cualquiera y se ficha
sin internet, como con un servidor local, sin comprar nada. Es mejor que Toast, y es lo que dibujó
la maqueta de T5 · 2 aprobada el 29-oct.

## 3 · Lo que queda (esta entrega)

- **Entra con su PIN cualquiera del local** en un aparato que llega a la caja: arriba, «Por la
  caja»; debajo, «Sin internet: el PIN lo mira la caja». Quien ya entró hoy en ese aparato entra
  como en T5 · 2 · 1, aunque no llegue a la caja. **En un comandero, quien no ha fichado** ve
  «Sin fichar: ficha la entrada en la caja», como con internet (0115).
- **En la caja, «Fichar» funciona sin internet**: la caja dice al momento quién es («Hola, Ana ·
  ¿Fichar la entrada?»), lo apunta, y lo fichado sube al volver **a la hora en que se fichó**. En
  «Por subir» sale como «Ana · ficha la entrada · Fichado en la caja · Apuntado». Y quien entra en
  la caja sin haber fichado, «Fichar la entrada y entrar», también sin internet.
- **Aparatos dice quién llega a la caja**: arriba, «4 de 5 siguen sin internet»; en cada uno, qué
  es y cómo llega —«Llega a la caja», «Guarda lo suyo» (un iPhone), «No llegaría a la caja» (con
  datos), «Cómo darlo» (sin el permiso de Chrome, con sus pasos)—; la caja, «Es el centro» y si va
  por wifi o por cable. Debajo, lo del iPhone y, si la caja va por wifi, «mejor un cable al router»
  (no es un aviso del servicio: solo en Aparatos).
- **Los avisos de Windows**: **antes de que Windows pregunte**, la caja dice «Deja marcado «Redes
  privadas» y toca «Permitir acceso»»; si se tocó «Cancelar», su línea en Aparatos dice «Windows no
  la deja escuchar en el wifi» con «Cómo arreglarlo»; y si Windows tiene la red del local como
  pública, arriba de Aparatos, con «Cómo cambiarlo». Los dos con **«Abrir en Windows»**, que lleva
  justo a donde se cambia.

## 4 · Lo que decidió la IA al construirlo

1. **La caja guarda las huellas de los PIN del local, las de Estook** (PBKDF2 con la sal del local,
   210.000 vueltas), nunca un PIN, cifradas en su disco con la cuenta de Windows, como lo demás del
   centro. Es lo que dibujó la maqueta del 29-oct («guarda los del local cifrados»). **A un móvil no
   se le dan nunca.**
2. **Solo las recibe una caja que ya hace de centro** (que ha dicho en su latido dónde escucha): una
   caja abierta en un navegador no las recibe, y la función de la base lo mira otra vez (0098).
3. **Las recoge cada dos minutos con internet**, con lo que puede hacer cada uno y si está fichado.
   Lo fichado en la propia caja sin internet se apunta en lo que sabe ella, para que el comandero
   deje entrar a quien acaba de fichar.
4. **Comprobar un PIN tarda lo mismo diga quien diga**: todas las huellas de un local llevan la misma
   sal, así que se deriva una vez y se compara con todas sin cortar en la primera.
5. **Los mismos frenos que Estook**: diez PIN fallados seguidos desde un aparato lo paran cinco
   minutos (los demás siguen), y un PIN parado en Estook por fallarlo sigue parado en la caja. Nunca
   se dice de quién era un PIN. Y **ficha quien tiene en su puesto el permiso de fichar**, como en
   Estook: sin internet no se apunta lo que Estook rechazaría al volver.
6. **Lo que vale lo dice Estook al volver**: quien entró por la caja sube con su PIN cifrado con la
   pública de su aparato (0070), delante de lo suyo, como en T5 · 2 · 1; y lo fichado sube con el PIN
   cifrado con la pública de la caja (`fichar_en_la_caja` con `pin_cifrado`). Un cifrado vale una
   vez, y lo que no se pueda apuntar le llega a quien lleva el equipo, como en el aparato de fichar.
7. **Sin internet no se miran las mesas abiertas al fichar la salida en la caja**: se fichó cuando se
   fichó. Y quien tiene la caja abierta ficha sin internet como los demás (lo suyo, con sus mesas,
   necesita internet).
8. **Quien entra por la caja queda también como «quien entró hoy»** en ese aparato: si después no
   llega a la caja, vuelve a entrar igual.
9. **La primera vez, la caja escucha solo por dentro** (en el propio PC, donde Windows no pregunta)
   hasta que su pantalla ha enseñado qué contestar; cuatro segundos después se abre a la red y
   Windows pregunta. Si ya preguntó alguna vez, escucha en la red desde que arranca.
10. **Lo que dice Windows se lee sin ser administrador**, con PowerShell (el tipo de cada red, si es
    wifi o cable, y las reglas del cortafuegos para la caja), al arrancar, cada cinco minutos y al
    abrir Aparatos. Si no se puede leer, la caja escucha en la red como hasta ahora.
11. **Cada aparato dice en su latido qué es y cómo llega** (0098: `sistema` y `camino_al_centro`), y
    la caja, si va por wifi o por cable (`centro_por`). Lo que un aparato no sabe no lo dice: una
    versión de antes sale en Aparatos como siempre, «En línea».
12. **Un iPad de cocina no cuenta como «sigue sin internet»**: no recibe lo nuevo; la cocina tira del
    papel (0122, respuesta de Richi). Un iPhone sí: guarda lo suyo y lo sube.
13. **«Abrir en Windows»** (no estaba en la maqueta): abre la lista de aplicaciones del cortafuegos,
    o la configuración del wifi o del cable. Los tres pasos siguen en la hoja, por si acaso.

## 5 · Lo que no entra, y dónde va

- **Que un comandero vea las mesas que abrió otro sin internet**: como en Toast, cada comandero ve
  lo suyo y la cocina lo de todos (0123, punto 5).
- **Cobrar sin internet**, con su justificante: T7.

## 6 · Las pruebas

- **Del dominio** (`centro-pin.prueba.ts`): la huella de Estook se comprueba con su PIN; un PIN de
  nadie, sin forma o con una huella rota no es de nadie; con otra sal o más vueltas también vale; y
  quién sigue sin internet y qué aparato es cada uno.
- **De la caja** (`el-centro.prueba.ts`, `windows.prueba.ts`): entra el PIN de cualquiera con lo que
  puede hacer y a quién pasar las mesas, sin que viaje ninguna huella; sin personas no entra nadie;
  diez fallos paran ese aparato y la caja sigue; un PIN parado sigue parado; se ficha en la caja y no
  en un comandero, y lo fichado vale para entrar; sin pausas no hay pausa; las personas sobreviven a
  cerrar y al desvincular no queda ninguna huella; solo por dentro no dice dónde está. Y lo que dice
  Windows en cada caso: sin preguntar, deja, solo para privadas en una red pública, «Cancelar», el
  cable antes que el wifi, las listas sueltas de PowerShell 5.
- **Del TPV** (`subir.prueba.ts`, `quienLlegaALaCaja.prueba.ts`): lo fichado sube sin turno de nadie;
  «4 de 5 siguen sin internet», cada línea y cada estado como en la maqueta.
- **Contra la base** (`la-puerta.prueba.ts`): solo la caja de centro recibe los PIN y la huella de
  Rosa se comprueba con su PIN; Aparatos dice qué es cada uno y cómo llega; y fichado sin internet
  sube con el PIN cifrado, a su hora, una vez, otra entrada estando dentro no se apunta, y la caja
  ya lo ve «dentro» (lección 244: antes salía «fuera»).
- **De pantalla** (`la-caja-de-centro.spec.ts`, con un navegador de verdad y la caja escuchando):
  sin internet, se bloquea y entra con su PIN quien no había entrado hoy en el aparato, «Por la
  caja»; ficha la entrada ahí mismo; al volver sube una vez y Estook lo tiene «dentro»; y Aparatos
  dice «1 de 1 siguen sin internet» y «Es el centro». Y `sin-internet.spec.ts` cierra la hoja con
  «Esc» (lección 245).
- **Lo que no se puede probar aquí**: la pregunta de Windows de verdad, Chrome en un Android de
  verdad y el wifi de un local. Se prueba en casa y en el local del amigo ([los pasos](../pasos/pasos-de-t5-2-2.md)).
  Leer el cortafuegos y el tipo de red sí se probó en el Windows de Richi: su red de casa sale
  como **pública**.
