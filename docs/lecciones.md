# Las lecciones del proyecto

> Lo que se aprendió fallando, en orden. Vivía en el apartado 5 de `ESTADO.md` hasta el
> 23 de septiembre de 2026, y se sacó aquí para que el estado se lea en cinco minutos:
> **aquí no se ha quitado nada**. Las quince reglas que no se discuten están en el
> [Plan de desarrollo](maestros/Estook-Plan-de-Desarrollo.md), parte A1; esto es lo que las completa.
>
> **Una lección que se puede convertir en prueba, se convierte** (la 9). Estas son las
> que todavía hay que tener en la cabeza, o las que explican por qué existe una prueba.

1. **Primero fusionar, después aplicar a Supabase.** La base nunca va por delante
   del código.
2. **«Terminado» solo si no quedan preguntas abiertas.**
3. **Una rama por entrega, y un pull request.** Nada entra en `main` sin él.
4. **Ante la duda, preguntar**, y preguntar explicado.
5. **Revisar lo propio antes de entregarlo**, y que esto no afirme nada falso.
6. **Un repaso después de fusionar vale la pena**: casi todos los fallos que
   quedaban eran algo construido y probado al que no llegaba nadie desde la pantalla.
7. **Si se toca una pantalla, `prueba:e2e:completa`.** `prueba:e2e` a secas prueba
   lo ya construido.
8. **Si el rojo es del servidor, mirar el puerto 5177**: Playwright reutiliza una
   API de pruebas viva con el código viejo.
9. **Una lección se convierte en prueba.** Escrita en un documento no impide nada.
10. **Una consulta que ninguna prueba llama es una consulta rota que aún no se sabe
    que lo está.** `pnpm cobertura` lo mide corriendo.
11. **Una excepción con una razón bonita sigue siendo un agujero.** Las listas de
    deuda sirven para no olvidar, no para justificar.
12. **Lo que no se mide, no está probado.** Contar nombres con `grep` no mide nada.
13. **Antes de mandar a alguien a hacer algo, comprobar que no está hecho ya.**
14. **`toBeVisible()` no ve el recorte.** Para saber si algo se ve, se pregunta al
    navegador qué hay en ese punto (`seVeDeVerdad`).
15. **Una prueba que compara el código con una copia del documento no compara
    nada.** `apps.prueba.ts` lee la tabla B5 del Plan.
16. **Un dato con dos dueños acaba con dos valores**, aunque sea una frase.
17. **Un andamio de pruebas no va en una pantalla de verdad.**
18. **Lo que toca un estado compartido, en un bloque, de una en una**, y ningún
    otro fichero tocándolo. **Y en un solo navegador de móvil**: el móvil pequeño y
    Safari comparten el Panel del móvil, y en la integración continua corren a la
    vez. Y no vale buscar «una cuenta que no toca nadie»: se probó con Luis, y otra
    prueba le añadía un segundo local. **Lo que cambia un ajuste del local, en un
    local nuevo** (la prueba del IVA crea el suyo).
19. **Guardar tarde es perder.** El retraso solo donde hay ráfaga; lo pendiente se
    manda al irse.
20. **Una sola cosa pinta la pantalla**: lo que se guarda se escribe en la caché.
21. **Se arregla lo que se ha visto**, no lo que uno deduce. Antes de quitar de
    más, se pregunta.
22. **Lo que salió en un iPhone se prueba con `CON_WEBKIT=1`.**
23. **Una prueba hace lo que hace una persona**: tocar algo e irse.
24. **Un rojo que no habla de lo probado casi nunca es del producto**: primero,
    quién sirve las pruebas.
25. **Una comprobación que hace dos cosas sin decirlo se lleva la segunda por
    delante.** Se escriben aparte.
26. **Lo que protege el dato y lo que lo enseña son dos capas**, y se prueban las dos.
27. **Una prueba nueva hay que verla fallar** con el arreglo quitado.
28. **El texto se escribe cuando el comportamiento existe.** Mientras, se dice lo
    que pasa.
29. **Cumplir el contraste no hace una buena pantalla**: se mira en el aparato.
30. **Un color que alguien elige se ajusta y se pinta**, y se le dice.
31. **Lo que una aplicación no elige, no se elige por ella.**
32. **Un tema se hace en las fichas, nunca en las pantallas.**
33. **Un permiso sin pantalla es una promesa rota.** Merma y fichar llevaban desde M1
    en la matriz sin dónde hacerse.
34. **Guardar sin decir que ha fallado es peor que no guardar.**
35. **Se prueba con el rol más pequeño que puede hacerlo.** La merma de la camarera
    solo falló entrando como ella.
36. **Una restricción de la base se prueba con el caso normal, no solo con el
    malo.** «Toda salida dice dónde» era correcta y dejaba sin cerrar el turno que
    alguien olvidó, que es lo más normal de corregir.
37. **Después de desplegar, se mira la base de verdad.** Cero paneles guardados en
    producción con todo en verde: el conductor de las pruebas no es el de
    producción. Lo que dependa del conductor se escribe para que dé igual
    (`::text::jsonb`), y `bd:comprobar-api` lo mira en Supabase.
38. **Las listas a Postgres, como texto** (`comoLista` y `::text::tipo[]`), por lo
    mismo que el JSON: una lista vacía de un tipo enumerado llegaba como `''`.
39. **Una consulta pide «ver»; un comando, «editar».** Y **el recorte de un local
    manda** sobre el permiso de la organización. Lo prueba `leer-con-ver.prueba.ts`.
40. **Una ficha que se abre desde varios sitios vive en la dirección** (`?pedido=`),
    no en un estado: así la abre el Panel, «Hoy» o el Calendario sin conocerse.
41. **Un precio de compra se escribe con o sin IVA, y se guarda sin él** (0033).
    Cada campo lo dice, con su tipo y la otra cifra calculada.
42. **Una vigencia se prueba con dos cambios el mismo día.** El salario fallaba solo
    la segunda vez, que es la de corregir una errata.
43. **Un catálogo que solo enseña lo que falta hace creer que lo quitado se pierde.**
    Se enseña todo, y lo puesto lo dice.
44. **Un permiso dice qué; la amplitud del rol, a quién** (0034).
45. **Un precio se lee con dos decimales.** Si no llega, se cambia de unidad; las
    cuentas siguen en milésimas.
46. **`current_date` es UTC, y no es «hoy».** La fecha la pone el servidor con la
    zona y la hora de corte del local (`jornadaDe`, regla 10). Lo cazó una prueba
    corriendo a las 00:30: lo congelado quedaba fechado el día anterior.
47. **La dirección del producto va en el código** ([0036](decisiones/0036-la-direccion-es-estook-com.md)).
    Estrenar `estook.com` dejó la app en blanco porque la raíz y los orígenes vivían
    en variables y secretos que había que acordarse de cambiar.
48. **Dos cosas en el mismo botón es no preguntar nada.** «Gastado o vendido» hacía
    imposible saber si por lo que salió entró dinero, que es de lo que cuelga el
    margen entero ([0037](decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)).
49. **El dinero de un día tiene un solo dueño.** Si una salida de cámara sumara a las
    ganancias y además se metiera el papel de la caja, el día valdría el doble y no
    se vería: el total del mes saldría mal y todo lo demás parecería correcto.
50. **Una marca que sale en todos no marca nada.** «Sin verificar» se volvía a poner
    sola al guardar la ficha, salía en naranja en toda la lista y no se podía quitar
    desde ninguna parte. Un dato que no se puede corregir desde donde se lee es un
    dato que nadie corrige.
51. **Un filtro que solo funciona cuando la lista cabe entera es un filtro que
    miente.** Ya costó las vistas de Productos, y el libro de movimientos seguía
    buscando dentro de las cien líneas traídas. Toda lista que crece a diario va con
    su tramo de tiempo, su búsqueda en el servidor y su «Ver más».
52. **Restar el precio de carta menos el coste es regalarse el IVA como margen.** El
    de venta se ingresa y el de compra se recupera: la resta se hace con las dos
    cifras sin impuesto, y por eso la hace el dominio y no la pantalla.
53. **Un ingrediente no tiene precio de venta.** Lo que se vende es un plato, y su
    precio vive en la carta; lo que cuesta sale de su escandallo. Ponerle un precio
    de venta al género era inventarse un tercer sitio para un dato que ya tiene el
    suyo ([0037](decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md),
    corregida).
54. **Un dato que se pide dos veces acaba con dos respuestas.** Preguntar «cuánto
    has cobrado» al sacar género, teniendo la carta y la caja, era pedir la misma
    cifra por segunda vez.
55. **Acotar lo que se gestiona no es esconder el dato.** Meter la zona en la
    lectura del género dejó a una camarera sin poder apuntar la merma de una nata.
    Se lee todo el local; lo que se acota es la lista de Inventario y quién edita
    la ficha ([0038](decisiones/0038-cada-producto-es-de-una-zona.md)).
56. **Un catálogo cuenta dentro de lo que se está mirando.** «Carnes (14)» en la
    vista de sala, con cero al entrar, es peor que no ofrecer la categoría.
57. **Una marca sobre un total miente cuando es una parte.** «Congelado» sobre un
    producto de 43 kg del que hay 10 congelados decía que no quedaba nada fresco.
58. **Un recuento no pone a cero lo que no se ha contado**, salvo que se diga a
    propósito y se enseñe cuántos se van a vaciar. Contar la cámara el martes y el
    almacén el jueves es lo normal.
59. **Una cifra elige su tamaño por lo que ocupa escrita.** «128 h 45 min» a 34 px
    parte en dos líneas; «9 l» a 20 px desperdicia la tarjeta.
60. **Un botón que se mueve no se deja pulsar.** El temblor va en la tarjeta; los
    controles, quietos. Lo cazó Playwright esperando a que el «quitar» parase.
61. **Una flecha compara lo mismo con lo mismo**: el periodo con el anterior del
    mismo largo, una proporción sobre el periodo entero, y un día sin caja como
    «no se sabe», no como cero. De nada a algo no hay flecha.
62. **Que un título no se vea ya no dice que se haya quitado.** Desde que lo vacío
    se aparta, las pruebas de quitar miran la casilla (`data-widget`), y las de
    ver aceptan «se ve» o «está nombrado en la línea».
63. **Lo que cuesta dinero se cuenta antes de gastarlo**, en una sola orden que solo
    suma si queda sitio. Un aviso de presupuesto avisa y sigue cobrando.
64. **Una integración se construye con su puerto y uno de mentira**, y se enciende
    con la clave. Sin clave se dice, no se rompe (0022, 0040).
65. **Un nombre de clave se comprueba contra la API de verdad antes de apuntarlo.**
    `GOOGLE_BUSINESS_KEY` llevaba desde M5 en la lista y esa API no usa claves.
66. **Un pull request encadenado no cambia de base solo** si la rama de abajo no se
    borra. La #50 apuntaba a la rama del Panel; al fusionarla, la #49 ya estaba en
    `main`, y Google acabó en una rama que nadie iba a fusionar. **Los pull requests
    van a `main`**, y si uno depende de otro, se dice y se fusiona en orden.
67. **Una sesión vale para un sitio.** La del admin y la de la app no se cruzan aunque
    sean de la misma persona, y lo decide el despachador, no la pantalla: un token
    olvidado en la tablet del pase no puede abrir el admin.
68. **Una pieza que se renderiza dos veces se busca por la que se ve.** La tabla pinta
    la de escritorio y las tarjetas del móvil a la vez, una oculta: `getByText` a secas
    encuentra dos, o la que no se ve (`filter({ visible: true })`).
69. **Una puerta nueva se prueba con cada estado de la sesión**: sin segundo factor,
    con él a medias y **con la contraseña por cambiar**. La del admin miraba los dos
    primeros y dejaba leer con la contraseña de un solo uso; lo vio el repaso, no las
    pruebas.
70. **Lo que da un acceso tiene que poder rescatarlo.** El admin nació sin forma de
    volver a entrar si se perdía la contraseña o el móvil: una puerta sin llave de
    repuesto es una puerta que un día hay que tirar.
71. **Cambiar un documento maestro es cambiar el código.** La prueba de B5 lee la tabla
    del Plan **del fichero**, así que poner el Plan 1.2 en su sitio puso la integración
    en rojo al momento: la tabla decía «En marcha · Caja · Cierre» y el catálogo decía
    otra cosa. **Eso es la prueba funcionando**, no un estorbo. Un documento maestro que
    nadie compara con el código es un documento que se queda atrás en silencio.
72. **Se entra por lo que existe, no por lo primero de la lista.** Las tablas del Plan
    se escriben en el orden en el que se entienden —«En marcha · Caja · Cierre» es el
    orden de un día—, no en el que se construyen. Con `vistas[0]`, Servicio habría
    abierto en «En marcha», que es M16, y el cierre de caja de M6½ —lo único que
    funciona ahí— habría quedado detrás de un cartel. Es la pestaña muerta de B5 un
    piso más abajo, y se arregla igual: `dondeEntraEnElDestino`.
73. **Dos sitios que deciden lo mismo acaban decidiendo distinto.** La dirección a la
    que se redirige y la vista que se pinta las calculaban `rutaDe` y `PantallaDeApp`
    por separado. Mientras el criterio era «la primera» daba igual; en cuanto dejó de
    serlo, habrían sido dos criterios y un bucle de redirecciones. Ahora los dos llaman
    a la misma función (regla 6).
74. **Un número escrito en un documento envejece solo.** El mapa decía «el módulo 22 de
    36» y el Plan decía «los cinco documentos» cuando ya eran seis. Si un número no lo
    comprueba nadie, o se quita o se le pone una prueba: la de las fichas de módulo
    pasó de 31 a 34 y saltó sola.
75. **Tener un dominio verificado y enviar desde él son dos cosas.** `estook.com`
    llevaba verificado en Resend desde el 17 de septiembre, y crear cuenta no
    funcionaba: `CORREO_REMITENTE` estaba puesto a `estookapp@gmail.com` —el correo de
    la cuenta, que es lo que parece razonable— y **desde Gmail no se envía**. Se buscó
    el fallo un día entero en el sitio equivocado. Ahora el servidor **comprueba el
    remitente antes de llamar a Resend** y, si es de un correo gratuito, lo dice y usa
    el de siempre en vez de quedarse sin mandar nada.
76. **Cuando algo de fuera falla, lo primero es leer lo que contesta, no deducirlo.**
    El motivo literal —«The gmail.com domain is not verified»— llevaba un día en el
    registro del servidor, con todas las letras. Mientras no se miró, se estuvo
    adivinando; en cuanto se miró, el arreglo fue cambiar un secreto. **La suposición
    más razonable no es un diagnóstico.**
77. **Un «terminado cuando» que no comprueba nadie no está terminado.** El modo cocina
    se dio por hecho con las pruebas de sus fichas, y su criterio pedía medir las
    pantallas. La prueba que las mide encontró tres fallos el primer día, uno de ellos
    desde M3: la letra grande y el modo cocina **no se aplicaban al abrir la app**.
78. **Cumplir en la ficha no es cumplir en la pantalla.** Una clase de utilidad
    (`min-h-[36px]`) gana a cualquier regla de la capa base, y un color con
    significado (el rojo, el acento de la app) no es un gris. Lo que se promete para
    toda la aplicación se mide en el navegador, pantalla a pantalla (`modo-cocina.spec.ts`).
79. **Una cifra que ya sale en otra pantalla se cuenta como allí**, y una prueba las
    compara. Y **lo que se tiene no se suma**: el valor de la cámara de una semana es
    una foto del último día, no siete fotos juntas.
80. **Una caché solo dice la verdad si sabe qué la ensucia.** Las cifras con flecha se
    guardaban un minuto y ni cerrar la caja ni apuntar una merma las refrescaban. Lo
    que cambia un dato refresca **todo** lo que lo enseña.
81. **Una prueba que pasa por el orden en que se ejecutan no prueba nada.** Las cifras
    de Inventario pasaban solo porque otra prueba, antes, daba de alta un producto.
    Cada prueba se prepara lo suyo.
82. **Una rejilla por filas estira lo corto.** Una fila mide lo que su tarjeta más alta,
    así que la de tres líneas acababa con ochocientos píxeles de nada. Varias tarjetas
    en una pantalla van en `Mosaico` (0045).
83. **Un color se mide en los dos temas, y también cuando va de fondo.** «7 días» iba
    en `bg-charcoal text-superficie`: blanco sobre casi negro en claro y 1,4:1 en
    oscuro. Llevaba así desde M6½ porque la prueba de contraste mira la paleta, no las
    parejas que escribe cada pantalla. Ahora hay una que busca esa pareja.
84. **Dos copias de una paleta acaban siendo dos paletas.** «El del sistema» en claro
    seguía con el fondo de B1 tres semanas después de que el tema claro lo cambiara.
    Lo que se escribe dos veces se compara en una prueba, o no se escribe dos veces.
85. **Lo que todavía no existe no se enseña en la pantalla que se usa.** Una tarjeta de
    «lo que falta por venir» o un botón apagado con su módulo en mitad del día a día
    son texto sobre el futuro que alguien tiene que leer cada vez. Va en el menú
    («Llega después») y en el plan.
86. **Un documento se sube igual que el código: con `verifica` antes.** Los pasos de V
    se subieron sin pasarla, con los tres comandos
    escritos `.estook.cmd` sin la barra, que PowerShell no encuentra,
    y con la carpeta rota; la prueba del lanzador lo cazó en GitHub, no aquí. Y al escribir un fichero desde la consola, **las barras
    `\` se las come la consola**: se escribe con el editor, no con `sed` ni `node -e`.
87. **Un rojo dentro de una vuelta en verde también se mira, y un arreglo se comprueba
    en el sitio donde falló.** «1 flaky» quiere decir que una prueba falló y pasó al
    repetirla. El 22-sep era Safari («WebKit encountered an internal error») al
    recargar; se cambió a abrir la dirección otra vez y se dio por arreglado **sin
    verlo en la integración continua**, que es el único sitio donde corre Safari. El
    23-sep volvió a pasar, al abrir. Es el motor del navegador antes de cargar nada, no
    Estook: ahora las diez ayudas de entrar abren con `abrirSinQueSeCaiga` (`pruebas/e2e/abrir.ts`),
    que repite una vez **solo con ese error**, y una prueba vigila que no tape ningún otro.
88. **Una puerta que va a decir que no, lo dice antes de pedir nada más.** Pedir el
    código del segundo factor para luego contestar «no tienes negocio» abría una sesión
    inútil y hacía creer que las cuentas se mezclaban. Y **una pantalla que pide algo
    dice a quién se lo pide**: el código sin el correo delante no se sabe de quién es.
89. **Lo que se descarga a trozos necesita una red debajo.** Partir la app para que
    abra rápido (B7) crea un fallo nuevo: el trozo que no llega. Sin nada que lo recoja,
    la primera versión que se publica con la app abierta deja pantallas en blanco. Lo
    cazó una prueba de Safari que falló una vez; mirado a fondo, no era Safari.
90. **Una regla que se puede saltar, un día se salta.** «Primero migrar, después
    desplegar» estaba escrita en cada paso, y la #64 se desplegó sin la `0040`: Equipo
    dejó de funcionar. Ahora el despliegue lo comprueba y no deja pasar
    (`la-base-va-al-dia.mjs`). Lo que protege producción lo hace la máquina, no la memoria.
91. **«No he podido leerlo» no es «no puedes» ni «no hay nada».** El widget de fichar le
    dijo al director que su acceso no incluía fichar, y los demás, sin datos, decían que
    no caducaba nada. Un dato que no ha llegado se dice así, con su botón de volver a
    intentarlo; nunca se pinta como una respuesta.
92. **Un título que cuenta, cuenta lo que se enseña.** «11 productos por debajo del
    mínimo» encima de tres: el número era el de todo el local, fuese cual fuese la vista.
    Y «Bajo mínimo» traía los cincuenta primeros y filtraba después, así que se perdía
    los del final del abecedario. El total lo da la misma consulta que la lista
    (`cuantosCumplen`), y una prueba lo mira en cada vista y partida en páginas.
    **Y contar no puede costar lo que enseñar**: el primer arreglo contaba con
    `count(*) over ()` y obligaba a calcular lo caro de todos los productos, no de los
    cincuenta de la página; la lista tardaba el doble. Se vio por una prueba de Safari
    que tardó más de la cuenta, y se **midió** antes de tocar nada. Y medir consulta
    a consulta encontró lo que nadie sospechaba: el precio vigente, pedido producto a
    producto, era casi todo el tiempo de la pantalla. **Lo lento no se adivina: se
    cronometra**, y lo que no cambia el número se deshace.
93. **Lo que no puede pasar en la cámara no puede pasar en el libro.** Tirar cinco kilos
    de los dos que hay dejaba el producto en negativo sin decir nada. La pantalla lo
    avisa, y **el servidor lo impide** (`mas_de_lo_que_hay`), porque la pantalla no se
    puede garantizar (regla 4).
94. **«En línea» es tener la app delante, no tener una sesión.** Una sesión dura días.
    Y lo que depende de las políticas de otra tabla se prueba con el rol más pequeño que
    lo mira: el jefe de cocina veía a todos fuera de línea porque no puede leer sesiones
    ajenas (regla 35, otra vez). Y un aviso que sale cuando la página se esconde puede
    salir justo antes de que se vaya: Safari corta la petición y lo cuenta como un fallo.
    Ese aviso espera un segundo y no sale si la página se va (`pagehide`).
95. **Un trabajo nocturno que no lanza nadie no existe.** Las claves de idempotencia
    caducadas las tenía que tirar un proceso de fondo que todavía no tiene reloj: en
    producción había 440. Lo que tiene que pasar pasa en un camino que ya se recorre.
96. **Una costumbre que llega tarde deja atrás lo de antes.** Desde M4 toda función con
    privilegio nace cerrada, y las siete de antes se quedaron abiertas. La prueba no
    nombra ninguna: mira todas, así que la próxima que se olvide no pasa.
97. **Cumplir en la paleta no es cumplir en la pantalla.** Cada ficha llegaba a su
    contraste, y la pestaña elegida de cada vista pintaba su nombre en el color de la
    app: en claro, el ámbar de Inventario sobre blanco daba 3,46:1. Lo encontró medir
    cada texto contra el fondo que tiene debajo, en pantallas de verdad. Y **se mide en
    el móvil también**: la barra de abajo solo existe ahí, y era la mitad del fallo.
98. **Una captura solo se compara con otra del mismo sistema.** La letra se suaviza
    distinto en Windows y en Linux, y distinto en dos versiones de Ubuntu. Las de
    referencia son las de la integración continua, con su Ubuntu fijo; las de otro
    ordenador son para mirar. Y lo que sale en la foto no puede depender de lo que otra
    prueba esté haciendo a la vez: por eso las hace una persona con la que no entra
    nadie más.
99. **Un navegador que no sabe hacer algo a veces no lo dice.** Safari, pedido un WebP
    desde un lienzo, devuelve un PNG sin avisar. Se mira qué ha salido de verdad, no lo
    que se pidió.
100. **Lo que dice ser un fichero no lo es hasta que se miran sus primeros bytes.** El
     tipo lo manda quien llama; la firma del formato, no. Vale para las fotos y valía,
     sin mirarse, para el logo.
101. **Un tope que no se ve con una persona se ve con dos recargas.** La API iba por el
     agrupador de Supabase en modo sesión, que admite quince clientes a la vez. Con las
     pruebas y con una persona mirando nunca se llegaba; con Richi recargando dos veces
     en el móvil, sí. Se encontró **midiendo**: treinta consultas a la vez contra
     producción, quince fallaban. Lo que cuenta conexiones se prueba con una ráfaga.
102. **Un fallo del servidor no es «no has entrado».** Si preguntar «¿quién soy?»
     fallaba por lo que fuera, la app enseñaba la pantalla de entrar con la sesión
     guardada. Solo el servidor diciendo `sin_sesion` manda a entrar; lo demás se
     reintenta y se dice como lo que es.
103. **Un hueco flexible no se estrecha por debajo de su palabra.** `flex-1` sin
     `min-w-0` no deja que el recorte actúe: el nombre del producto se quedó con 50 px
     (y a 320 px, con cero) y la barra de abajo se salía por los lados. Y partir por
     cualquier letra (`overflow-wrap:anywhere`) tapa el problema en vez de dar sitio:
     lo que se da es ancho, y se parte por palabras.
104. **Quitar lo que alguien está esperando lo deja esperando para siempre.** Vaciar la
     caché con `removeQueries` cuando una pantalla ya ha pedido lo suyo la deja mirando
     una consulta que nadie vuelve a pedir. Para tirar lo de antes y seguir, se
     reinicia (`resetQueries`). Y el orden importa: React monta a los hijos antes de que
     corra el efecto del padre.
105. **Lo que solo se puede leer una vez no se repite a ciegas.** Repetir una navegación
     porque el navegador se cayó está bien, salvo si la primera ya gastó algo, como la
     vuelta de Google. Quien abre algo de un solo uso dice cómo volver a prepararlo.
106. **Cada fecha con su reloj.** La caja y las cifras cuentan con la jornada, que corta
     a la hora de corte del local; las caducidades y las compras, con el calendario, que
     es el de la fecha impresa y el del proveedor. Juntar las dos en una pantalla es
     elegir, cosa a cosa, cuál manda. Se ve de madrugada, así que se prueba de madrugada.
107. **No se cambia de rama con una batería corriendo.** La API de pruebas se levanta
     desde el código: cambiar de rama a mitad hace que unas pruebas corran contra un
     código y otras contra otro, y los rojos no significan nada. Se repite entera.
108. **Una persona de las pruebas es de todas las pruebas a la vez.** La prueba de «el
     Panel no puede leer» daba por hecho que Rosa tenía el widget de fichar, y las del
     Panel, en otro fichero y al mismo tiempo, se lo quitaban. Pasaba sola y fallaba en
     compañía. Lo que otra prueba puede cambiar no se da por hecho: se contesta en la
     propia prueba, o se prueba dentro del mismo bloque, que corre en fila.
109. **De lo que se repite hay que guardar el intento que falla.** Playwright grababa
     el rastro de la segunda vuelta, la que pasa, y el informe solo se subía con la
     ejecución en rojo: de cada prueba de Safari repetida no quedaba nada de cuando
     falló, y cada vez era una distinta. Sin ese rastro no se arregla, se espera a que
     no pase. Se graba la primera vuelta y se guarda si falla, también en verde. La
     siguiente repetida, con su rastro, resultó ser un fallo de verdad del Panel.
110. **Lo que se estira a lo ancho no puede llevar nada redondo.** La línea de las
     cifras es un SVG que se estira a lo ancho de la tarjeta; un día suelto se pintaba
     como un círculo dentro, y en el móvil salía como una raya achatada que parecía un
     fallo. Lo redondo va fuera del dibujo, en tanto por ciento. Y un hueco en los
     datos se dice en discontinuo, no dejando piezas sueltas.
111. **Una consulta apagada está pendiente para siempre.** En TanStack 5, `isPending`
     es «no hay datos todavía», y una consulta con `enabled: false` no los tendrá
     nunca: la ficha cerrada dejaba un «Cargando» vivo y escondido. Lo que se enseña
     mientras llega es `isLoading`, que además pide que se esté pidiendo.
112. **Una rejilla sin columnas dichas crece con la línea más larga.** Sin
     `grid-cols-1`, la columna implícita toma el ancho mínimo de su contenido, y un
     texto que no se parte la ensancha más allá de la pantalla. Se dice la columna
     (`minmax(0, 1fr)`) y el recorte vuelve a funcionar.
113. **Lo que aparece encima de un botón mueve el botón.** «Continuar con Google»
     salía al contestar el servidor, encima del formulario, y lo empujaba 94 px: quien
     pulsaba «Entrar» en ese momento tocaba el aire. Lo cazó Safari, el más lento, una
     vez de cada muchas. Lo que va a llegar ocupa su sitio desde el principio.
114. **Una ruta nueva puede tapar a las de siempre.** El latido del reloj se escribió como
     `/v:version/tareas/latir`, al lado de las consultas y los comandos, y el enrutador
     de Hono dejó de encontrar **todas** las rutas: 404 en cada petición. Ni escrita a
     mano como `/v1/…` se arreglaba. Lo que no es de la app va fuera de `/v1`
     (`/tareas/latir`, `/stripe/aviso`), y una prueba mira que las de siempre siguen.
115. **Quien entra sin poder entrar se queda sin sitio.** Una cuenta sin pagar abre la
     sesión sin local, porque va a elegir su plan. Al pagar, la decisión ya le da su
     local, pero la sesión no se enteraba, y cada comando decía «hay que estar dentro de
     un local». Lo que cambia a dónde entra alguien pone al día su sesión en el mismo
     paso; y `quien_soy`, por si el cambio llegó por otro camino (el aviso de Stripe).
116. **En el iPhone, `:has(:empty)` no se vuelve a mirar.** La zona de atención del Panel
     se escondía con `:not(:has(>:not(:empty)))`; «Hoy» llega después que lo demás, y
     WebKit —todos los navegadores del iPhone— no volvía a mirar el selector al llenarse:
     la zona se quedaba escondida hasta que algo repintaba. En Chrome no pasa, así que
     ninguna prueba de pantalla lo veía. Lo que se esconde por estar vacío lo decide la
     página (`usarSinNadaDentro`), y una prueba lee el código para que no vuelva.
117. **Lo `fixed` abajo se pega al visor de maquetación, no a la pantalla.** Con la app
     instalada en el iPhone, al cerrar el teclado el visor visible se queda desplazado,
     y la barra de abajo se quedaba a media pantalla. Lo pegado abajo mide
     `visualViewport` y baja lo que se ha quedado colgado; y con el teclado abierto, se
     aparta. No se reproduce en un navegador de pruebas: la prueba finge el visor.
118. **Renombrar un fichero cambia cuándo se ejecuta.** Las semillas se cargan por orden
     alfabético, y `inventario.sql` renombrada a `almacen.sql` pasaba a ir antes de las
     que crean los locales: siete locales sin categorías. Lo cazó la prueba de
     migraciones. El nombre de un fichero que se ordena solo es parte de su contrato.
119. **Cambiar de nombre un permiso es leer las políticas, no reescribirlas.** El permiso
     `app.inventario` estaba escrito en 23 políticas. Copiarlas a mano en la migración
     era la forma de colar una diferencia; la `0048` las lee de `pg_policies` y solo
     cambia el nombre, y deshacerla hace lo contrario.
120. **Una prueba con un día fijo caduca si la base apunta con su `now()`.** Las del pago
     fijaban el reloj en el 25-sep, y el cobro fallido lo fechaba la base con la hora de
     verdad: al día siguiente, «ocho días después» ya no lo era y la prueba cayó sola, sin
     tocar nada. Lo que la prueba mueve en el tiempo se cuenta desde hoy.
121. **Una hoja que espera a recargar la pantalla para cerrarse parece rota.** El Tablón
     esperaba a que el Panel volviera a pedir sus datos antes de cerrar la hoja: con la red
     lenta se quedaba abierta sin decir nada. Guardado es guardado: se cierra, y lo de
     detrás se pone al día solo.
122. **Lo que se esconde cuando está vacío no se echa en falta: no se sabe que existe.**
     El Tablón, «Hoy» y cuatro tarjetas del Panel se escondían sin nada dentro. Parecía
     limpio, y Richi, que lo había pedido, no encontraba el Tablón. Un sitio que dice «sin
     avisos» enseña que existe y que está al día; uno que no sale, ni lo uno ni lo otro.
123. **Un interruptor que se apaga al salir no se puede anidar.** `enNombreDelSistema`
     ponía el modo sistema y al acabar lo apagaba. El reloj, ya como sistema, manda los
     correos de los avisos, que también lo piden: la llamada de dentro apagaba el modo a
     la de fuera a mitad de camino. Al salir se deja **como estaba**, no apagado.
124. **Lo que se ve al momento todavía no está guardado.** Ajustes → Avisos cambia el
     interruptor en pantalla y guarda por detrás; la prueba recargaba antes de que llegara
     al servidor, y una vez de cada tres el cambio se perdía. No era la base ni otra
     prueba a la vez: era no esperar. Antes de recargar, se espera a la respuesta.
125. **Lo último que se toca también pasa por `verifica`, aunque sea un documento.** La #76
     salió en rojo por dos cosas escritas después de la última pasada: la guía de Richi con
     `.estook.cmd` sin la barra (la barra se la comió el guion que la escribió) y una
     prueba que recargaba con `page.reload` en vez de `recargarSinQueSeCaiga`. Las dos
     tenían su prueba, y las dos la habrían cazado en local. Y de paso: en el Safari de
     la integración continua, un clic forzado en una casilla escondida no llega; se toca
     lo que se ve.
126. **Una regla de ortografía escrita con una letra de más se equivoca callada.** `enumerar`
     cambiaba la «y» por «e» ante **cualquier** palabra con «h», y el aviso de lo bajo
     mínimo decía «tomate e harina». La prueba tenía «hígado» y «hielo», los dos casos
     difíciles, y ninguno de los fáciles. La «e» va solo ante el sonido «i» (`i-`, `hi-`,
     no `hie-`), y la prueba lleva ahora «harina» y «huevos».
127. **Una pantalla con captura de referencia que cambia a propósito sale en rojo en GitHub
     la primera vez, y en Windows no se ve.** R2 añadió filas a Ajustes → Avisos, que tiene
     su captura (0052), y las capturas solo se comparan en Linux: en local todo verde y en
     GitHub cuatro rojas. Antes de subir se mira qué pantallas tocadas tienen captura
     (`capturas.spec.ts`, `PANTALLAS`) y se avisa de que tocará `pnpm capturas:traer`.
128. **Una prueba que cuenta desde hoy se pasa la semana entera antes de darla por buena.**
     `el-pedido-los-informes-y-google.prueba.ts` pasó en GitHub el domingo 27-sep y falló el
     martes 29 en el ordenador. Dos fallos, y ninguno de la app: los martes, un pedido de
     otra prueba llegaba justo el día del reparto que mira el reloj, y el reloj entendía
     —bien— que ya estaba pedido; y los lunes entre las 00:00 y la hora de corte, la
     jornada del local todavía es la del domingo y la semana no está cerrada. Una sola
     vuelta no lo ve nunca: `pnpm prueba:semana` pasa las pruebas en veintiséis días y
     horas (mueve también el reloj de la base de las pruebas), y se usa al escribir o
     tocar una prueba con fechas. Lo de la lección 120 sigue: contar desde hoy, y además,
     comprobarlo toda la semana.
129. **Compartir no es guardar, y los ordenadores también saben compartir.** El botón del
     PDF compartía si el aparato sabía y solo descargaba si no, pensando en «móvil
     comparte, ordenador descarga». En el Windows de Richi, Chrome sabe compartir, así que
     solo salía la hoja de compartir y el PDF no se podía guardar. Ahora se descarga
     siempre y «Compartir» sale al lado; la prueba finge un aparato que sabe compartir,
     que es el caso que falló (30-sep).
130. **Cambiar de pantalla antes de volver a preguntar enseña lo de antes.** El recado del
     alta refrescaba la sesión, la app saltaba al alta, y el alta pintaba lo que tenía
     guardado —«terminada», o sea «Ya está»— mientras volvía a preguntar. Con el servidor
     cargado se quedaba ahí: dos rojos seguidos en la batería entera y ninguno suelto. Se
     pregunta primero y se cambia de pantalla después (`TarjetasDelPanel.tsx`).
131. **Guardar «lo último que se vio» se suma, no se pisa.** Al abrir con mala señal, los
     primeros segundos la app todavía no tiene nada leído, y guardar entonces borraba lo
     bueno de la vez anterior: sin señal salía el Panel vacío. Lo cazó una captura, no una
     prueba. Ahora se guarda sumando a lo que había y, como mucho, cada dos segundos
     (`cacheGuardada.ts`, I · 0070).
132. **Un fallo de red no es «sin conexión».** Con una sola petición fallida la app se daba
     por desconectada entera. Ahora lo dice el navegador o una pregunta a `/salud`: sin
     las dos cosas, es un fallo de esa petición y se dice como tal (`red.ts`). Y al revés:
     **una señal colgada no falla**, se queda esperando minutos. Si `quien_soy` no contesta
     en cuatro segundos y `/salud` tampoco en tres, es «sin conexión» y se enseña lo
     guardado; se vio con «Cargando tu sesión» fijo en la prueba de la señal mala.
133. **Lo guardado se enseña solo sin señal.** Recuperarlo siempre al abrir enseñaba un
     momento lo de antes —el Panel viejo, el local que ya no era— aunque hubiera red. Se
     recupera al abrir sin red, o cuando el servidor no contesta por falta de conexión.
134. **Una consulta en pausa sin datos no es «sin entrar».** Sin red y sin nada guardado,
     la sesión parecía cerrada y salía la pantalla de entrar. «Sin servidor» incluye ahora
     la pausa sin datos, y se espera a la vuelta (`ProveedorDeSesion.tsx`).
135. **Salir no espera al trabajador de servicio.** Cerrar sesión pedía el registro del
     trabajador «cuando esté listo», y en un navegador sin él tardaba cinco segundos en
     salir. Se pregunta si hay uno y, si no, se sigue. Y lo que viene de internet (el logo
     del local) no está sin señal: se pinta lo de repuesto, nunca una imagen rota.
136. **Un tope que ya se roza no avisa: corta.** «Construccion y presupuestos» tenía 25
     minutos y en una vuelta buena gastaba 22. Con las pruebas de I y un día en que GitHub
     tardó 19 minutos en bajar los navegadores, se canceló a medias, sin un solo rojo de la
     app, y Richi se encontró un pull request que no podía fusionar sin saber por qué. El
     trabajo pasa a 40 minutos y bajar los navegadores tiene su tope de 10 (1-oct). Cuando
     una vuelta buena pase de los 30, se mira antes de que vuelva a cortar.
137. **Lo que el navegador corta al cambiar de página no es «sin red».** Cada petición
     cortada lanzaba al momento una pregunta a `/salud`, que también se cortaba, y Safari
     apunta esos cortes como «access control checks»: en WebKit, la prueba de las ocho
     apps salía en rojo y en Chrome no. Ahora se espera un instante, se pregunta una sola
     vez aunque fallen varias, y nada si la página se está yendo o la app canceló la
     petición (`red.ts`). WebKit no arranca en el Windows de trabajo: lo de Safari solo lo
     ve GitHub, así que se lee entero su rojo antes de suponer nada.
138. **Una lista que se filtra en el servidor se mueve después de escribir.** El buscador
     de Clientes del admin pregunta 300 ms después de dejar de escribir y, mientras, sigue
     enseñando a todos. La prueba pulsaba la fila del cliente en ese momento; al llegar la
     respuesta la fila subía arriba y el toque caía en el hueco. En Safari salió una vez
     repetida («flaky») el 2-oct. Ahora se espera a «1 cliente» antes de pulsar
     (`los-clientes.spec.ts`): lo mismo que hace una persona, mirar antes de tocar.
139. **El tope de los navegadores, con margen de verdad.** Los 10 minutos de la lección 136
     se quedaron cortos al día siguiente: el espejo de Ubuntu de GitHub iba a 200 KB/s y
     cortó la vuelta sin probar nada. Pasa a 15; con los 21 de una vuelta buena, el trabajo
     sigue cabiendo en sus 40. Un rojo en «Instalar navegadores» no es de la app: se
     relanza ese trabajo y se mira si se repite.
140. **Un libro que solo se añade necesita una forma de anular.** Santi sacó 2.000 kg de
     atún donde había 6,6 (eligió «por kilo» y escribió 2000) y nada le preguntó. «¿No
     cuadra?» devolvía lo que hay, pero las dos toneladas seguían vendidas en cada cuenta
     cuatro semanas. Ahora sacar más de lo que hay se confirma, y anular apunta la línea
     contraria: las cuentas leen `movimiento_que_cuenta`, que deja fuera las dos
     (`anular-un-movimiento.prueba.ts`, 0072). Una suma nueva sobre el libro lee esa vista.
141. **Una vuelta puede cruzar el cambio de día.** La prueba de cerrar la caja usaba un
     día por navegador, seguidos (3, 4 y 5 atrás). La vuelta del 3-oct empezó a las 02:51
     de Madrid: escritorio contó desde el día 2 y el móvil, pasadas las 03:00 (la hora de
     corte), desde el 3, y los dos cayeron en el 29. Rojo en `main` sin un fallo de la app.
     Los días van ahora de dos en dos (1, 3 y 5): si la jornada cambia a mitad de vuelta,
     cada uno se mueve uno y no alcanza al siguiente.
142. **Una hoja que sube no recibe el toque hasta que para.** La prueba de Fogón pulsaba
     «Pregúntale a Fogón» en cuanto el menú del «+» aparecía; una vez en GitHub el toque
     llegó con la hoja aún subiendo, se perdió, y la frase de Fogón estaba en su ventana
     cerrada: «oculta». Ahora se espera a que acabe la animación y a que la ventana de
     Fogón esté a la vista antes de mirar dentro (`pantalla.spec.ts`).
143. **Pedir la fila nueva obliga a poder verla.** Insertar con `on conflict` o con
     `returning` hace que Postgres compruebe la política de **leer** sobre la fila recién
     puesta. La de los canales mira la tabla para saber quién los ve, y ahí la fila todavía
     no está: «abrir el chat» salía «sin permiso». Los canales de fábrica se crean como
     sistema y los nuevos llevan su identificador puesto antes, sin `returning` (0073).
144. **Una hora que se compara con la del servidor se guarda con la del servidor.** Lo que
     espera al móvil del chat guardaba su hora con `now()` de la base, y se comparaba con
     la del servidor: con la hora fija de las pruebas parecía de hace días y se tiraba sin
     sonar. Ahora se guarda `contexto.ahora`, como pide la regla 10 (`el-chat.prueba.ts`).
145. **El cursor se coloca al pintar, no un fotograma después.** Al elegir a alguien con
     «@», el cursor se ponía detrás del nombre en el fotograma siguiente; lo tecleado
     deprisa justo entonces caía delante y la primera letra acababa al final («í, a las
     nueve…s»). Ahora va en `useLayoutEffect`. Lo cazó repetir la prueba (`--repeat-each`).
146. **Escribir da por leído lo de antes, y eso pisa a las pruebas que van a la vez.**
     Las tres vueltas escriben en el mismo «Todo el equipo»: el mensaje de Marcos de una
     marcaba como leída la respuesta de Rosa de otra. Lo que depende de quién ha leído qué
     se prueba en un canal propio de la vuelta (`el-chat.spec.ts`).
147. **Borrar con `where` también obliga a poder leer la fila.** Leer un canal tenía que
     quitar lo que esperaba al móvil, y lo borraba con la sesión de quien lee; esa tabla
     solo la lee el sistema, así que el borrado no encontraba nada y no fallaba. A Richi le
     iba a sonar a las 8:00 lo que había leído a medianoche. Ahora se borra como sistema,
     con la persona de la sesión (`el-chat.prueba.ts`, 0074).
148. **Lo que espera a su hora no puede caducar antes de que llegue.** Lo del chat que no
     podía sonar se tiraba a las 12 horas; quien no tenía turno hasta pasado mañana no se
     enteraba nunca. Espera lo mismo que los avisos, una semana, y leerlo lo quita
     (`el-chat.prueba.ts`, 0074).
149. **Una nota grabada en WebM no dice cuánto dura.** El reproductor del navegador se
     quedaba con la rueda de «cargando» y «--:--» hasta pulsar play, porque busca la
     duración dentro del fichero y la grabadora no la escribe. La duración ya se sabe al
     grabar: el reproductor es nuestro y la enseña sin esperar (`NotaDeVoz.tsx`, 0074).
150. **Con el teclado abierto, lo que llena la pantalla se mide con el visor visible.** El
     chat iba entre las dos barras de la página entera; el teclado del iPhone no encoge la
     página, la empuja, y el chat subía con ella con un hueco encima del teclado. Ahora,
     con teclado, ocupa justo lo que se ve; y mientras está abierto la página de debajo no
     se desplaza ni se estira (`conElTeclado.ts`, 0074).
151. **Como sistema, la tabla de personas no enseña nada.** El correo del chat buscaba el
     correo de cada uno en `estook.persona` dentro del sistema, no encontraba a nadie y
     tiraba lo que esperaba sin mandarlo; el recordatorio decía «un mensaje de alguien».
     Lo que el sistema necesita de una persona se lo da una función que solo le contesta
     a él (`estook.a_quien_escribir`, como `quien_recibe`). Lo cazó `lo-oficial.prueba.ts`.
152. **Unas cifras que cambian por fuera no se reutilizan de la memoria de la pantalla.**
     La tarjeta de un vendedor decía «0 traídos» con su cliente ya registrado: el admin
     guardaba lo leído 30 segundos, y quien se registra no avisa al admin. Las cifras de
     los vendedores se leen otra vez al entrar (`Vendedores.tsx`, A3). Lo cazó
     `los-vendedores.spec.ts`.
153. **El Stripe de mentira tiene que mandar lo que manda el de verdad.** Su aviso de «la
     prueba acaba» no decía `object: 'subscription'`, y la API no sabía de qué suscripción
     hablaba: no pasaba nada y nada fallaba. Ahora lo dice. Los de «la suscripción ha
     cambiado» del simulador siguen sin decirlo, y en las pruebas no se aplican: el comando
     que los provoca ya guarda lo mismo (`pagos-de-mentira.ts`, A3).
154. **Un cupón de «una vez» se lo gasta la primera factura, aunque sea de cero euros.** Con
     prueba, Stripe hace una factura de 0 € al empezar; un descuento puesto al pagar se
     gastaría ahí. El del primer mes se pone cuando Stripe avisa de que la prueba acaba
     (`customer.subscription.trial_will_end`), y una sola vez (`los-vendedores.prueba.ts`,
     0076).
155. **«Lo mismo del año pasado» se cuenta por el calendario, no por días.** El tablero de
     ventas comparaba el trozo del periodo anterior sumando los días que van del actual:
     el 29 de febrero de 2028 se comparaba con el 1 de marzo de 2027. Ahora es el mismo
     día unos meses antes, o el último del mes si no lo tiene (`losTramos`, 0077). Lo
     cazó `ventas.prueba.ts` antes de llegar a ninguna pantalla.
156. **Una cuenta en solo lectura puede estar pagando.** El plan Pausa cobra 12 € por
     guardar los datos, y su cuenta es de solo lectura, que es lo que compra; la lista de
     Clientes la metía en «Sin pagar» y no contaba su cuota. Ahora «En Pausa» va en
     Pagando, en Clientes, en Vendedores y en Ventas (`estaEnPausa`, 0077).
157. **Una comilla invertida en un comentario SQL rompe la plantilla que lo lleva.** Un
     comentario dentro de `contexto.sql` llevaba la palabra «set» entre comillas
     invertidas: la comilla cerró la plantilla de JavaScript y el servidor dejó de
     compilar. Los comentarios de dentro de una consulta van sin ellas (`productos.ts`,
     0078). Lo cazó `pnpm tipos`.
158. **Cerrar un inventario tarde no puede comerse lo que entró después de contarlo.**
     Contado a las 7 y cerrado a las 11, la diferencia es con lo que decía el libro a las 7
     (`decia`, `hasta_movimiento`), y se suma a lo que haya al cerrar. Comparando con lo de
     las 11, el albarán de las 9 desaparecía. Lo prueba `contar-el-almacen.prueba.ts`, que
     sale en rojo con la comparación de antes (0078).
159. **Un inventario que se cuenta por la mañana no se puede medir por días.** El food cost
     entre dos inventarios contados un lunes temprano salía de 33,20 € donde se habían
     gastado 489,80: el ajuste del segundo caía el lunes, fuera del periodo, y el del
     primero, dentro. Entre dos inventarios se mide **por posición en el libro** (justo al
     cerrar cada uno); por meses, por días. Lo prueba `lo-gastado-y-la-desviacion.prueba.ts`,
     que sale en rojo midiendo por días (0079).
160. **Comparar lo gastado con lo apuntado es acusar a la cocina.** Casi nadie apunta lo que
     cocina, así que «lo que falta» de un ingrediente era todo lo gastado, y la brecha del
     food cost contra lo apuntado salía siempre «fuga». La desviación con causa es solo de
     lo que se vende tal cual, contra la caja; lo cocinado espera a sus fichas (M9, 0079).
161. **Con lo que se compara no es lo de antes.** En Tu día, la flecha de atrás llevaba al
     periodo con el que se compara —el mismo día de la semana anterior— y la de delante
     avanzaba uno: ida de siete días y vuelta de uno (Richi, 9-oct). En la semana y el mes
     coincidían por casualidad, y por eso no se vio. Las flechas salen ahora de
     `lasFlechasDelInforme`, con su prueba de ida y vuelta en los tres (0080).
162. **Una anulación es lo que anula, no lo que dice su motivo.** El food cost reconocía un
     traspaso por su motivo («A otro local…»), y su anulación se apunta con otro («Anula lo
     apuntado el…»): diez Coca-Colas que al final no se llevó nadie salían gastadas. Ahora
     cada anulación se lee con el origen y el motivo del movimiento que anula. Lo prueba
     `lo-gastado-y-la-desviacion.prueba.ts`, que sale en rojo sin el arreglo (0080).
163. **El teclado del iPhone se mide más de una vez.** El chat leía el visor una vez por
     aviso, y WebKit avisa a mitad de la animación del teclado y corrige después, a veces
     sin avisar: la caja de escribir se quedaba debajo del teclado. La barra de abajo ya
     volvía a mirar a los 50, 150 y 300 ms desde el 25-sep; el chat no. Lo que se arregla
     en un sitio se busca en los demás que hacen lo mismo (0080).
164. **Un dato con dos sitios donde escribirse acaba con dos valores.** El horario vivía en
     la ficha de cada persona («el de siempre») y en Horarios, y la app usaba uno u otro
     según la semana estuviera publicada: Richi vio que no concordaban y no sabía cuál
     mandaba. Ahora solo cuenta el publicado; el otro no se puede ni poner (0081). Es la
     regla 6 aplicada a una pantalla, no solo al código.
165. **«Sin cerrar» no es «trabajando ahora».** La columna «A revisar» y «Para mirar»
     contaban como fichaje raro el turno abierto de quien estaba en la cocina en ese
     momento. Lo raro es olvidarse de salir: abierto hace más de doce horas, como ya decía
     el aviso de turno sospechoso. Lo prueba `las-incidencias.prueba.ts` (0081).
166. **Una ventana fija deja fuera lo que más importa.** El fichaje de una entrada se buscaba
     en las tres horas de alrededor: quien llegaba cuatro horas tarde no salía ni como
     retraso ni como falta, justo el caso que hay que ver. Ahora se busca hasta que acaba el
     tramo, y la falta es un tramo acabado sin ningún fichaje que se cruce con él. Lo
     prueba `las-incidencias.prueba.ts`, que sale en rojo con la ventana de antes (0081).
167. **En el iPhone, `window.innerHeight` encoge con el teclado.** Para saber si había
     teclado se comparaba el alto visible con él, la resta salía casi cero y el chat nunca
     se recolocaba: dos repasos «arreglándolo» sin tocar la causa. El alto de la página se
     mide con el del documento (`altoDeLaPagina`), y escribiendo en el chat va a lo visible
     pase lo que pase. La prueba de pantalla finge también que `innerHeight` encoge, y sin
     eso salía en verde con el fallo puesto (0082).
168. **Mover algo al perder el foco se come el toque.** El foco se va al apretar el dedo y
     el toque acaba al levantarlo: si el chat se recolocaba entre las dos cosas, el botón
     de opciones de un mensaje no hacía nada. Lo cazaron las pruebas del chat en el móvil,
     no la nueva; al soltar la caja se espera 400 ms (0082).
169. **«Avisado» no es «le ha llegado».** Al publicar el horario la pantalla decía «les ha
     llegado el aviso a 4 personas», y a tres solo les llegó a la campana, que no ven sin
     abrir Estook: no tenían el móvil puesto y el correo estaba apagado. Antes de dar por
     bueno un aviso se mira **por dónde** llega, en producción, y la pantalla lo dice (0082).
170. **Lo que va fijo en pantalla no sabe que ha llegado un menú.** Al poner el menú a la
     izquierda, todo se apartó solo… menos el chat, que va `fixed` para el teclado del
     iPhone y se quedó debajo del menú: en el ordenador no se podía pulsar ninguna
     conversación. Lo cazaron las pruebas del chat, no las del menú. Al cambiar la forma de
     la pantalla se buscan las piezas fijas (`fixed`) una a una (0083).
171. **Un punto de Recharts sin dato llega con `cy` nulo, no indefinido.** El día de hoy, sin
     caja, se pintaba como un puntito suelto arriba del todo de la gráfica. Se comprueba
     `== null`, que coge las dos cosas (0083).
172. **Las gráficas que llegan tarde mueven lo que se arrastra.** Con la máquina cargada,
     la prueba de arrastrar un widget fallaba una vez de cada pocas: el dibujo de las
     gráficas (que se descarga aparte) llegaba a mitad del arrastre, los widgets cambiaban
     de alto y el dedo soltaba en otro sitio. Sola pasaba siempre. Se espera a que no quede
     nada por cargar antes de arrastrar (0083).
173. **Un cambio de aspecto se mira con datos, no con la base vacía.** Con Bar Centro recién
     sembrado todas las gráficas eran rayas en el suelo y no se podía juzgar ninguna. La
     API de pruebas lleva desde hoy una historia de un mes que solo se carga si se pide
     (`CON_HISTORIA=1`), y con ella salieron tres fallos de dibujo (0083).
174. **Un trozo que se descarga aparte no puede romper la pantalla sin señal.** Las gráficas
     nuevas llegaban con un `lazy`; sin cobertura su trozo no llegaba, la red de la pantalla
     recargaba la página para traerlo y se llevaba la hoja de fichar a mitad de fichar. En
     local pasaba porque el trozo ya estaba descargado: lo cazó GitHub, más lento. Lo que se
     usa sin señal no depende de lo que se trae aparte (`GraficaViva`, 0083).
175. **Una búsqueda que encuentra no es una búsqueda que funciona.** La prueba del buscador
     preguntaba a la API y estaba en verde desde M6; en la pantalla, cada resultado llevaba
     al Panel («los destinos los traen los módulos», y nadie volvió). Richi: «no funciona
     nunca». La prueba de algo que se elige tiene que **elegirlo** y mirar dónde acaba
     (0084).
176. **Un mosaico medido encaja tarjetas iguales, no tamaños mezclados.** Con pequeños y
     anchos, el flujo denso dejaba medias filas en blanco y escalones; se veía «descolocado».
     Con dos tamaños, filas completas que se llenan solas (0084).
177. **Un enlace firmado es otra imagen para el navegador.** Cada respuesta de la API trae
     una firma nueva para la misma foto, así que el logo y las caras se descargaban otra vez
     cada vez que la app se ponía al día. Se reutiliza el enlace mientras vale (0084).
178. **Lo que pesa al abrir se mide al abrir.** El paquete inicial pasó de 318 a 364 KB sin
     que nadie lo viera: se mide y no bloquea (B7). Al tocar la forma de la app se mira
     `pnpm tamano` antes y después, y cada pantalla nueva entra en `lasPantallas.ts`, aparte
     (0084).
179. **Una ruta nueva en Hono puede apagar las de siempre.** `POST /v1/consultas` al lado de
     `GET /v1/consultas/:nombre`, con la versión en una expresión regular, dejó al
     enrutador sin encontrar **ninguna** ruta de `/v1`: un 404 en todo. Lo cazaron las
     pruebas de la API, no la nueva. Una ruta nueva va con la misma forma que las que hay
     (`/consultas/varias`) y se pasan las pruebas de la API enteras (0085).
180. **Lo que se guarda y lo que se lee tienen que ser lo mismo.** La colocación del Panel se
     guardaba como lista de nombres y se leía como lista de objetos: la primera vez iba
     bien (no había nada guardado) y desde la segunda el Panel se adelantaba vacío. A mano
     no se ve, porque a mano se prueba una vez. La prueba recarga dos veces (0085).
181. **Una prueba que escucha la red empieza a escuchar cuando ha acabado lo de antes.** Al
     entrar, el lote del Panel sale justo después del saludo; la prueba que contaba lotes
     tras recargar contaba también ese, y parecía que la app pedía dos veces. Se espera a
     que la red esté quieta antes de escuchar (0085).
182. **Lo que se guarda mientras se lee por primera vez se queda con lo de antes.** TanStack
     Query no vuelve a pedir lo que aún no tiene dato y va de camino: se queda con esa
     lectura, que salió antes del cambio. Con consultas que volvían enseguida no se notaba;
     con el lote, la prueba del Tablón escribía nada más abrir y seguía «Sin avisos». La
     caché de la app cancela esa lectura y la pide otra vez (`CacheQueNoSeQuedaAtras`, 0085).
183. **Una prueba que mira el Panel necesita un Panel que nadie más toque.** Rosa se queda
     sin widgets a mitad (las pruebas del Panel los quitan) y a Luis le sale «¿Dónde estás
     hoy?» (otra le da un segundo local). Solas pasan; en la batería entera, no. Lo que mira
     el Panel entero va con una cuenta nueva (0085).
184. **En Postgres, una tabla y un índice comparten nombres.** `estook.canal_del_local`
     chocaba con el índice `canal_del_local` del chat (0056): «relation already exists».
     Antes de nombrar una tabla nueva se busca el nombre en todas las migraciones, no
     solo entre las tablas (0086).
185. **Lo que se escribe dos veces se separa.** La lista de índices del buscador vive en una
     prueba y en `bd:comprobar-api`. La 0068 añadió `plato_buscable` a la prueba y no a la
     herramienta, y en producción salió «MAL · sobran plato_buscable» cuando todo estaba
     bien. Ahora una prueba lee la lista de la herramienta y la compara con la base: al
     añadir una tabla buscable, se pone en rojo hasta tocar las dos (0086).
186. **Un icono con `aria-label` sigue escondido.** `crearIcono` pone `aria-hidden` a todo icono
     que no lleve `titulo`, así que la cadena de «vinculado» se veía y el lector de pantalla
     no la nombraba. Lo cazó la prueba de pantalla al buscarla por su nombre. Un icono que
     dice algo solo va con `titulo` (0087).
187. **`se-usan` busca el nombre entre comillas simples.** `consulta="la_ficha_en_pdf"` en el
     JSX no contaba, y la prueba decía que nadie la llamaba aunque el botón estaba ahí. Se
     escribe `consulta={'…'}`, como el resto de botones de documento (0087).
188. **La hora de lo guardado la pone el servidor.** Con `default now()` en la base, todas las
     recetas de la prueba eran «de hoy» y la desviación no encontraba la de cada día. Lo que
     después se lee por fechas se guarda con `contexto.ahora` (regla 10), y la prueba que
     cambia la receta a mitad de semana falla si se cuenta con la de hoy (0087).
189. **Un `grant` suma, no quita.** La 0006 da a toda tabla nueva de `estook` leer, añadir,
     cambiar y borrar para la API (`alter default privileges`). La 0069 escribió
     `grant select, insert on receta_guardada` creyendo que eso era todo, y en producción la
     API podía cambiar y borrar el historial. Lo cazó `bd:comprobar-api`, no las pruebas: ahí
     nadie lo miraba. Una tabla con menos permisos de los de siempre empieza con
     `revoke all … from estook_api`, y una prueba mira `has_table_privilege` (0070, 0088).
190. **Los ejemplos de quien lo pide se prueban con datos como los suyos.** «Vincular lo que
     se vende por unidades: el chuletón, el pescado entero» se construyó para productos en
     `ud`, y en el catálogo de serie el entrecot, la dorada o el helado van en gramos o
     mililitros. Con una semilla hecha a mano todo salía; en IKATZ no salía nada suyo.
     Antes de filtrar por un campo, se mira cómo viene de verdad. Y al abrirlo, lo que se
     deducía de la forma («una línea, 1 ud») dejó de bastar: un pan tostado parecía
     vinculado. Lo cazó la prueba de pantalla; ahora lo dice la receta (0088).
191. **Buscar `delete from` no encuentra todos los borrados.** Antes de quitar a la API borrar
     en el producto se buscó en el servidor y no salía nadie. Pero `quitar_ejemplos` (0020)
     borra con `execute format(…)` y con los permisos de quien la llama, y lo cazó la batería
     entera, no la búsqueda. Al quitar un permiso se busca, y además se pasa la batería
     entera; y lo que se apunta como ejemplo se comprueba que la API lo pueda borrar (0089).
192. **Safari apunta como error lo que el navegador corta al irse.** La 137 lo arregló para
     `/salud`, pero en la #108 —que no tocaba la app— la prueba de las ocho apps salió en
     rojo en Safari dos veces seguidas: «ya me ha llegado» del chat y la petición del Panel,
     cortadas al saltar de pantalla, salían como «… due to access control checks». Las
     pruebas que recorren muchas pantallas leen los errores con `vigilarLosErrores`, que
     descuenta solo ese aviso y solo de la API de pruebas (`pruebas/e2e/abrir.ts`).
193. **Una función «en el borde» no está al lado de su base.** Supabase ejecuta la API en la
     región de quien llama (París, desde España) y la base está en Irlanda: cada viaje a la
     base cruzaba Europa, y una consulta hace de 5 a 32. En local todo iba rápido porque la
     base está en el mismo ordenador. La lentitud de verdad se mide donde vive
     (`x-sb-edge-region`) y contando los viajes, no los milisegundos de una prueba local.
     Fijada la región (`x-region`) y quitados dos viajes fijos por petición (0090).
194. **«Red primero» para abrir una app instalada es una pantalla en negro.** El trabajador
     de servicio esperaba hasta 4 s a que GitHub contestara antes de pintar. En una app
     instalada la página se sirve guardada y la red se mira por detrás (0090).
195. **Verde no es limpio: una vuelta de `main` con dos repetidas.** Al fusionar la #109,
     `main` salió en verde con dos pruebas de Safari que solo pasaron al repetirse: la del
     catálogo, que medía **una** petición contra un tope de 1 s (1.370 ms, con la máquina
     ocupada), y la de las ocho apps, que se cortó con «Frame load interrupted», que es como
     cuenta Safari lo que la 2.ª regla de `abrir.ts` ya repetía con otras palabras. Se mide
     la más rápida de tres y se reconoce la frase de Safari. Y después de fusionar se mira
     también la vuelta de `main` por dentro, no solo la de la rama.
196. **Una pregunta que no dice qué es ni por qué se hace, no se puede contestar.** El 17-oct
     Richi recibió tres tandas de preguntas de M9 · 3 y no entendió varias: «ya la sé» y el QR salían
     del plan escrito sin decir de dónde ni para qué; «la receta de referencia» parecía lo ya hecho;
     y «vigilar solo con todo escandallado» daba por sabido que se puede vender sin escandallo. Cada
     pregunta lleva **qué es, de dónde sale, qué hay ya hecho y en qué se diferencia, un ejemplo de
     restaurante, lo que pasa con cada opción** y la recomendación; y si se apoya en algo que Richi
     cree imposible, **se explica primero cómo pasa** (0094). Antes de preguntar, la prueba de la
     plantilla: lo que no la pasa no se pregunta, se quita.
197. **Un enlace con «?» lleva su vista, o llega sin lo de después.** El aviso «un plato pasa
     de tu objetivo» llevaba a `/escandallos/escandallos?ficha=…`: la app redirige a la vista
     de entrada (`…/todos`) y la redirección **suelta el «?ficha=»**, así que se abría la lista
     y no el plato. La prueba de la base solo miraba que el enlace fuera el escrito; lo cazó la
     de pantalla, abriendo esa misma dirección. Los avisos llevan la vista en su enlace, como
     ya hacían los de Compras e Informes, y la prueba abre el enlace que manda la campana (M9 · 3).
198. **El mes de una prueba es el de la jornada, no el del calendario.** La prueba del traspaso
     anulado pedía el food cost del mes `HOY.slice(0, 7)`, y a la 1:00 del 1 de enero salía en
     rojo: lo apuntado antes de las 5:00 (la hora de corte) es de la jornada del 31 de diciembre,
     y no estaba en enero. Fallaba igual antes de M9 · 3; solo lo ve `prueba:semana`, porque
     en un día normal las dos fechas coinciden. La prueba pide ahora el mes de `jornadaDe`.
199. **Lo que se ve antes del código manda en el primer segundo, y no va en ninguna capa.**
     La pantalla de arranque de `index.html` era siempre clara, y su fondo del `<html>`, escrito
     en la página, ganaba al del tema: en el iPhone de Richi, con el oscuro, el logo salía sobre
     claro, saltaba a oscuro y quedaba una franja clara abajo. Las pruebas entraban siempre con
     el claro y no lo veían. El tema se pone ahora antes de pintar (`tema-al-arrancar.js`) y una
     prueba mira el arranque en los dos temas, con el código y la sesión haciéndose esperar (0096).
200. **Un interruptor de todos no se toca en una prueba que corre junto a otras.** Fogón tiene
     uno general (0097), y las pruebas de pantalla corren a la vez contra la misma API: la que
     lo encendiera haría cambiar lo que ve la que mira Fogón apagado. La puerta de prueba
     (`/api/pruebas/fogon`) enciende **solo la organización de una persona**, la prueba del
     admin **solo enciende** el general, nunca lo apaga, y las de la ventana aceptan los dos
     motivos de «no habla». Y la frase de una regla («no des ningún precio») no cuenta como dato:
     la prueba de que a la camarera no le llega un euro mira solo lo que va después de la regla.
     Y la puerta de prueba escribía en la base **fuera de la cola**: con una sola conexión, a
     veces se colaba en la transacción de otra petición, con el disfraz de la app, y no se
     guardaba. Fallaba una de cada dos veces; repetida cuatro (`--repeat-each`), se vio.
201. **Un servicio de fuera que falla tiene que decir por qué, o no se arregla.** Fogón convertía
     cualquier fallo de Anthropic en «no ha contestado bien»: con la clave y el saldo puestos,
     Richi no podía saber si era la clave, el saldo o el modelo, y yo tampoco, sin los
     registros de Supabase. Ahora el fallo lleva el código, el tipo y la frase de Anthropic a
     los registros y a Sentry, y el admin tiene «Probar la conexión», que lo traduce (0097).
202. **Un mismo número no puede valer para dos cosas.** El coste por unidad llevaba el
     aprovechamiento, que es lo que pide un plato, y con él se valoraba también la cámara: un
     kilo de atún pagado a 18,18 € «valía» 25,97 €, y la ficha enseñaba tres precios. Lo que
     hay en cámara vale lo pagado; lo limpio se calcula al costear el plato (0099).
203. **Un campo de precio dice siempre de qué es.** «Precio», a secas, en un producto contado
     en gramos sin envase era el precio de un gramo: se escribió el del kilo y la cámara dijo
     91.000 €. Ahora el campo dice «Precio del kilo» y el servidor no deja que nada nazca a
     tanto el gramo (0099).
204. **Una prueba que no mira la cifra no prueba la cifra.** La de «¿No cuadra?» usaba un saco
     de 10 kg, escribía «4» y solo comprobaba que el motivo salía en Movimientos. Con el fallo
     de la 0099 guardaba 40 kg y seguía en verde. Una corrección de cantidad se prueba con un
     producto **con caja** y mirando **lo que queda**; y la hoja lo dice antes de guardar:
     «Pasa de 10 kg a 4 kg» (0100).
205. **Una variable con dos dueños rompe al que no la enseña.** `como` («por envases» o «en
     kilos») servía a «Ha llegado» y «Ha salido», que tienen su selector, y la 0099 la usó
     también en «¿No cuadra?», que no lo tiene: arrancaba en «por envases» y nadie podía verlo.
     Lo que una hoja no enseña, no lo puede decidir (0100).
206. **Un arreglo de datos va en la jornada del local, no en el día del calendario.** La 0076
     apuntó «Revalorado» a la 1:43 con la fecha del 20, cuando IKATZ aún estaba en la jornada del
     19, y la tarjeta del valor no la leía. La 0077 usa la jornada, y la foto de hoy lee el libro
     entero (0100).
207. **Un verde que no mira nada es peor que un rojo.** La prueba «el food cost del Panel es el
     mismo que el de Servicio» comparaba las dos cuentas con IVA, y pasaba porque su semana no
     gastaba género: 0 % con y sin IVA. Una cifra se prueba con un caso hecho a mano que dé
     algo que no sea cero (30 € de género para 110 € de caja: 30 %, no 27,3) (0101).
208. **Una red de seguridad que nunca se ha visto en rojo no está probada.** El barrido que ataca
     las 307 operaciones de la API salía en verde, y al quitarle a propósito una política a la
     base **siguió en verde**: rellenaba Bar Centro con una fecha fija que ya era pasado y el
     tablón se quedaba vacío. Con el relleno a mano y las fechas de hoy, el mismo agujero sale en
     rojo. Antes de fiarse de una prueba así, se le mete un fallo y se mira que lo caza (0101).
209. **Deshacer tiene que deshacer también lo que se calculó con lo deshecho.** Anular una
     entrada quitaba los kilos y dejaba el precio medio que había metido: la cámara seguía
     valiendo miles. Lo que una línea movió de paso (el precio medio, un lote) también se
     devuelve, o «anular» no anula (0101).
210. **Un fallo intermitente de una prueba de pantalla suele ser de la app.** «Opciones de la
     conversación» no se abría una de cada muchas: el rastro de GitHub enseñaba el toque en
     y=26 y el botón en y=86. El chat se movía bajo el dedo entre apretar y soltar. Se arregla
     la app (esperar al dedo), no la prueba con una espera, y se demuestra con una prueba que
     falla siempre con el código viejo: un toque largo de 700 ms (0101).
211. **La vista previa del panel arranca desde la carpeta principal, no desde la del trabajo.**
     Revisé pantallas que eran de `main` sin la #123: la app servía un `index-….js` que ni
     existía en mi carpeta. Lo que se mira en el navegador para probar una rama se levanta desde
     su carpeta (las pruebas de Playwright lo hacen bien) (0101).
212. **Un arreglo de seguridad se prueba también donde no hay proxy.** Para cerrar el tope de
     crear cuenta, metí todo lo que llegaba sin dirección en un mismo montón. En producción
     siempre llega, pero la API de pruebas no la recibe nunca: tras diez altas, la undécima se
     frenaba, y cayeron de golpe las pruebas que crean cuentas. Lo cazó la batería de pantalla
     entera; el arreglo bueno era leer la primera dirección **con forma de dirección** (0101).
213. **«Como sistema» no abre todas las tablas.** El aviso de un agotado tenía que sonar solo a
     quien está fichado, y leí los fichajes con `enNombreDelSistema`: devolvía cero filas, porque
     las políticas de `fichaje` no hablan del sistema, y sonaba a todos. Lo cazó la prueba que
     mira a qué móvil llega. Para saber algo de otros sin enseñárselo a quien pregunta, una
     función con privilegio que devuelve **solo lo justo** (aquí, identificadores) (0102).
214. **Antes de fijar una hora en una prueba, se mira la del local de ejemplo.** Escribí que
     el agotado volvía a las 05:00 y Bar Centro corta a las 03:00 (0096): la prueba falló y el
     código estaba bien. La hora de corte, la zona y el régimen se leen de la semilla, no se
     suponen (0102).
215. **El orden de un catálogo es parte de lo que se ve.** Puse «Leer tu carta» arriba del
     catálogo de acciones, y la ventana de Fogón, que enseña las cuatro primeras del Panel,
     dejó de ofrecer «Ver qué hay que atender»: lo cazó su prueba de pantalla. Una acción
     nueva va donde le toca en el día (las de cada día, primero), no donde se escribe (0102).
216. **Un texto se mira en la pantalla, no solo en el código.** «Tu carta y su QR» llevaba
     del 8 al 22-oct «EnseÃ±a», «dÃ³nde» y «Escanea con la cÃ¡mara del mÃ³vil» —también en
     el cartel del QR que se imprime—: el fichero se había guardado dos veces en UTF-8. Lo vi
     al recorrer Ajustes buscando otra cosa. `pnpm textos` mira ahora las letras rotas en todo
     el fichero, y se ha visto fallar con el fichero de antes (0104).
217. **Una hoja que se abre desde dos sitios tiene que recibir lo mismo desde los dos.** Las
     opciones de una mesa se abrían desde la mesa (con su nota) y desde el plano (sin ella):
     desde el plano, «Nota para cocina» empezaba en blanco y al guardar **borraba la nota que
     había**. Lo encontró la auditoría que pidió Richi, no una prueba. Ahora la mesa del plano
     trae su nota y cómo sale la cocina, y la prueba de pantalla abre las opciones desde el
     plano y mira que la nota se queda (M20A · 1 · 2).
218. **Una regla que hace algo sola tiene que distinguir lo nuevo de lo que ya esperaba.**
     «Sale solo el pase que no tiene nada delante» estaba pensada para los postres del final,
     y también sacaba el 2.º que esperaba a que lo marchara el camarero en cuanto se le
     añadía un plato. Lo vi probándolo con las manos, no en las pruebas, que solo pedían
     platos nuevos (M20A · 1 · 2).
219. **Un rojo de GitHub tapa los que vienen detrás.** T1 se subió con el lint en rojo, y
     «Calidad» se paró ahí: nunca llegó a mirar las dependencias, que tenían un ciclo entre
     `postgres.ts` y `quien-llama.ts`. Lo encontró la batería entera en el ordenador, al
     arreglar lo demás. Las pruebas que cuentan cosas (los errores del catálogo, lo que dice
     cada puerta al arrancar) fallan cuando se añade algo sin tocarlas: **se pasa todo en local
     antes de subir**, no solo lo de la entrega (T1).
220. **Que la API lo haga no es que esté hecho.** `cambiar_aparato` cambiaba la función de un
     aparato, pero la pantalla solo mandaba el nombre, y ninguna prueba lo llamaba: el Anexo
     pedía «cambiar la función o el nombre» y solo se podía lo segundo. Se vio leyendo la
     pantalla contra el Anexo punto a punto, no en las pruebas (T1).
221. **Una prueba que prepara a mano lo que en la vida no está, esconde el fallo.** La prueba
     de pantalla de la puerta le sacaba un PIN al dueño antes de vincular la caja, así que
     pasaba; en IKATZ, Richi no tenía PIN y no podía entrar en su propio TPV. Ahora la prueba
     empieza como empieza un local de verdad, sin PIN, y sale con el suyo (0109).
222. **Un tope por dirección se come las pruebas, que salen todas del mismo ordenador.** El de
     los enlaces al correo es de diez por hora desde una dirección, y las pruebas de pantalla
     que daban de alta a alguien pedían todas su enlace desde el mismo sitio: a la undécima,
     «Desde aquí se han pedido muchos enlaces». Cada una pide ahora desde su dirección, como
     ya hacían las de crear cuenta (0109).
223. **Un disparador que escribe donde quien lo dispara no puede, le rompe lo suyo.** Lo nuevo
     de la carta entra solo en la botonera con un disparador. Sin su privilegio, el jefe de
     cocina —que cambia la carta pero no los Ajustes del TPV— no habría podido ni crear un
     plato: la base le negaba el botón, y con él el plato entero. Lo cazó la prueba que lo
     crea como él, no la que lo crea como la gerente, que puede con todo (T3 · 1).
224. **Cambiar con `update` tampoco falla cuando la seguridad por filas no deja: no cambia
     nada.** Como borrar (la 147). En T3 · 1, el camino de la botonera y «lo nuevo entra solo»
     se guardaban en el local, que solo escribe quien tiene los Ajustes de Estook: a otro con
     los del TPV, «Guardado» y nada guardado. Se vio al poner las dosis de la casa, probando
     como quien solo tiene los del TPV. Ahora va por una función que mira ese permiso
     (`monta-tus-bebidas.prueba.ts`, 0114).
225. **Recoger un fallo de la base no lo aparta: con `postgres.js`, tira la transacción
     entera.** La librería apunta cualquier consulta que falla, aunque el código la recoja, y
     al acabar deshace todo con ese fallo; un `savepoint` escrito a mano no lo evita, solo
     `sql.savepoint`. La madrugada del lunes 26-oct, la revisión de noche de Fogón, que no
     veía lo ya revisado (el reloj no lee las revisiones), chocaba cada hora con lo guardado,
     y ese choque «apartado» dio un 500 en cada latido desde la 01:07, hasta la última hora en que revisa (las 06:07). Las pruebas no
     lo veían porque su `sql` no se portaba como el de verdad: ahora sí
     (`el-sql-de-pglite.mjs`), y **una prueba que imita a la base tiene que fallar donde falla
     la de verdad** (`el-reloj-del-lunes.prueba.ts`, 0091).
226. **Una vuelta en rojo no siempre es una prueba que falla.** El 26-oct, en la #142, un
     trozo de las pruebas de pantalla se cortó porque los servidores de Ubuntu tardaron más de
     quince minutos en dar los navegadores; ninguna prueba falló. Se lee el registro antes de
     tocar el código, y lo que depende de fuera se reintenta una vez, con su tope por intento
     (`integracion.yml`, «Instalar navegadores»).
227. **Una hora al segundo empata, y un empate se ordena al azar.** La API da las horas sin
     milésimas. En la barra, una caña servida y un café pedido en el mismo segundo salían en el
     orden de sus identificadores, y la ronda nueva se juntaba con la vieja una vez de cada
     dos. A la misma hora, lo servido va antes (`laRondaDeLaBarra`); y una prueba de un empate
     se escribe para que el orden de los identificadores sea el malo (T4 · 2).
228. **Una prueba de pantalla que tarda más que el bloqueo prueba otra cosa.** La caja se
     bloquea a los dos minutos sin tocarla; la prueba de la barra abría las otras pantallas
     después de pedir, tardaba más que eso, y la cuenta de la sala ya no se refrescaba. Las
     pantallas se encienden antes, como en un local (`la-barra-y-la-alergia.spec.ts`).
229. **Un botón que aún hace algo no va desactivado.** Lo agotado de la botonera iba con
     `disabled`, y después con `aria-disabled`: un toque no lo pide, pero mantenerlo lo hace
     volver. Desactivado, ni el lector de pantalla ni Playwright lo dejaban tocar, y la prueba
     se quedó esperando. Va sin desactivar, y su nombre dice «agotado» (0118).
230. **«Hace un día» no son 24 horas.** La prueba de las bajas de Ventas restaba 24 y 48 horas y
     miraba el día en Madrid. El lunes 26-oct a las 23:05, con el domingo de 25 horas por el
     cambio de hora, las dos cuentas daban el mismo domingo, y la vuelta de `main` tras la #145
     salió en rojo (su rama, horas antes, pasó). Los días se restan en el calendario, nunca en
     milisegundos (`las-ventas.prueba.ts`).
231. **Un reintento que no se ha visto fallar no es un reintento.** El de la 226 cortaba a
     `pnpm` con `timeout`, pero el `apt-get` de debajo seguía vivo con el candado de `dpkg`
     cogido, y el segundo intento fallaba al instante («Could not get lock»): en la #146 la
     vuelta salió en rojo otra vez sin fallar ninguna prueba. Ahora `apt` corta a los 20 s, se
     corta también lo de debajo y se espera al candado, hasta tres veces. Y se escribió «corta
     también a `apt`» sin comprobarlo: lo que se afirma de una herramienta, se prueba.
232. **Lento no es atascado.** El arreglo de la 231 cortaba cada intento a los cinco minutos, y el
     servidor de Ubuntu estaba dando los paquetes a 50 KB por segundo, pero dándolos: tres trozos
     de Pantallas, cortados a medias tres veces. Se leyó el registro (las horas de cada paquete)
     antes de tocar nada más. Ahora lo bajado se guarda en la caché y lo lento se espera; solo se
     corta una conexión muerta ([la auditoría del 27-oct](auditorias/la-auditoria-de-github-del-27-oct.md)).
233. **La caché de GitHub es de cada rama.** Una rama solo ve lo guardado en ella y en `main`, y
     en `main` las pruebas de pantalla se saltan: lo que guardaba una rama no le servía a la
     siguiente. Y a cada máquina le toca una conexión distinta (de 0,18 a 28 MB/s en la misma
     vuelta), así que un trozo puede caer aunque los otros tres pasen. Ahora `navegadores.yml`
     los guarda desde `main` en cada fusión, para todas las ramas.
234. **Una dependencia puede bajarse algo enorme al instalarse.** Electron trae un script que,
     al instalar, baja su navegador entero (unos 100 MB); pnpm 9 ejecuta esos scripts, así que
     cada vuelta de GitHub —Calidad, Migraciones y los cuatro trozos de Pantallas— lo habría
     bajado sin usarlo, justo después de la auditoría del 27-oct. Antes de añadir una
     dependencia se mira qué hace al instalarse: Electron va en `neverBuiltDependencies` y su
     navegador se baja solo al arrancar o empaquetar la caja para Windows (0119).
235. **El `id` de una app instalable se resuelve contra el dominio, no contra su carpeta.** Estook
     (`/app/`) y Estook TPV (`/tpv/`) llevaban `"id": "./"` en su manifiesto, y para el navegador
     las dos eran `https://estook.com/`: la misma app. Desde la 0115 (25-oct), al poner Estook TPV
     en el escritorio, Chrome pedía «actualizar» Estook y se quedaba en `/app/` (Richi, 27-oct). Se
     separaron sus cachés y sus trabajadores, pero no su identidad. Ahora Estook es `/` (la de
     siempre, para no perder las ya instaladas) y Estook TPV, `/tpv/`; `laAppInstalable.prueba.ts`
     lo resuelve como el navegador.
236. **Lo que no lleva huella en el nombre también cambia.** La versión del trabajador de servicio
     salía de los nombres de los ficheros, y el manifiesto y los iconos se llaman igual siempre:
     cambiar solo el manifiesto (la 235) dejaba el trabajador idéntico, el navegador no lo
     renovaba y seguía dando el manifiesto viejo desde lo guardado. Ahora la versión mira también
     lo que llevan dentro los de `public/`, y `herramientas/` entra en las pruebas
     (`trabajador-de-servicio.prueba.ts`, vista fallar con el código de antes).
237. **Al guardar, los ficheros por su nombre; nunca una carpeta entera.** Al ordenar los
     documentos (#150) se añadió `pruebas/` de golpe, y se coló
     `capturas-del-repaso-temporal.spec.ts`, el fichero sin subir de otra sesión que no se toca:
     en GitHub falló en tres trozos de Pantallas. En local ya había salido en rojo, y se descartó
     con «no va a GitHub» sin mirar qué se estaba guardando. Antes de cada commit,
     `git diff --cached --name-status` y que no haya ni un fichero que no sea de la entrega.
238. **Una herramienta que sube a la vez no debe crear lo que comparten.** electron-builder subía
     el instalador y su `.blockmap` en paralelo, y cada subida intentaba crear la publicación
     v1.0.0: una la creó y la otra chocó («Published releases must have a valid tag»). La
     publicación quedó sin `latest.yml`, que es lo que lee el programa para actualizarse solo, y la
     vuelta salió en rojo. Ahora se construye igual que en un pull request y la publica `gh`, en
     un solo paso: la crea si no existe, y si existe le pone los tres ficheros.
239. **Una prueba con un programa de mentira, primero se comprueba que usa el de mentira.** Para
     probar el guion de publicar se puso un `gh` falso delante en el `PATH`, con la ruta de Windows
     (`C:/…`): los dos puntos partieron el `PATH` y se ejecutó **el `gh` de verdad**, que subió a la
     v1.0.0 los tres ficheros construidos en el PC de Richi. Quedó completa y coherente, pero
     hecha desde aquí y sin pedirlo. Ahora, antes de ejecutar, `command -v` dice cuál se usará, y
     si no es el falso se para.
240. **Lo que se instala a pantalla completa deja el hueco del teléfono en todas sus pantallas.**
     Estook TPV se instala con `viewport-fit=cover` y la barra translúcida, como Estook, pero solo
     Estook dejaba el hueco del reloj (`env(safe-area-inset-top)` en su barra): el TPV se pintaba
     debajo del reloj y de la isla del iPhone, y con iOS 26 lo de debajo además se emborrona (lo vio
     Richi en el comandero, 28-oct). Ninguna prueba lo cazaba: el Chrome de las pruebas no tiene
     muesca. Ahora el hueco lo deja la raíz de la aplicación, y las pantallas miden
     `min-h-pantalla`, no `100dvh`; una pantalla nueva no puede olvidarlo.
