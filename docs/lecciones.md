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
