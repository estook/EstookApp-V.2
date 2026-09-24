# Las lecciones del proyecto

> Lo que se aprendió fallando, en orden. Vivía en el apartado 5 de `ESTADO.md` hasta el
> 23 de septiembre de 2026, y se sacó aquí para que el estado se lea en cinco minutos:
> **aquí no se ha quitado nada**. Las trece reglas que no se discuten están en
> [`reglas.md`](reglas.md); esto es lo que las completa.
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
