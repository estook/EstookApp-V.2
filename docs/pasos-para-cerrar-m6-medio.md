# Pasos para cerrar M6½ · la capa de producto

> ## Lo que hay hecho, y lo que falta
>
> **La primera tanda está cerrada del todo**: fusionada (PR #37), la `0025`
> aplicada y la API desplegada. **La segunda se fusionó (PR #38), y se fusionó
> antes de que llegaran los tres commits de la auditoría**, así que esos van en
> la rama de ahora junto con la limpieza de imagen.
>
> | Qué                     | Cómo está                                                       |
> | ----------------------- | --------------------------------------------------------------- |
> | Primera y segunda tanda | **Fusionadas** (PR #37 y #38)                                   |
> | La auditoría            | **Escrita y en verde**, sin fusionar · iba en la #38 y no llegó |
> | La imagen y la marca    | **Escrita y en verde**, sin fusionar                            |
> | Su pull request         | **Por fusionar** · paso 1                                       |
> | Migraciones             | **La `0026`, sin aplicar** · paso 2, y esta vez sí toca         |
> | La API                  | **Sin desplegar** · paso 3, y esta vez también toca             |
> | Mirarlo en tu móvil     | **Sin hacer** · paso 4, y es el que no puedo hacer yo           |
>
> Esta vez **hay que hacer los cuatro pasos**. La `0026` añade una columna al
> local y el comando del color aprende a guardarla, así que sin el paso 2 y sin el
> paso 3 el interruptor de «usar mi color» no guarda nada.

## Cómo se escriben los comandos aquí

**El lanzador es `.\estook.cmd`.** En tu ordenador `pnpm` a veces no se encuentra,
porque la ventana de terminal se abrió antes de instalarlo y se quedó con el PATH
viejo. `.\estook.cmd` busca `pnpm` donde de verdad está, así que funciona siempre.

Y una cosa de PowerShell: **no entiende `&&`**. Por eso cada comando va en su
propio recuadro, de uno en uno.

---

## Paso 1 · Fusionar el pull request

**Dónde:** GitHub → pestaña **Pull requests** → entrar en el que hay abierto →
bajar al recuadro del final.

Las tres comprobaciones tienen que estar en verde: `Calidad`, `Construccion y
presupuestos` y `Migraciones reversibles`. Entonces, **Merge pull request** y
**Confirm merge**.

**Qué sale si va bien:** el pull request en morado, con la palabra **Merged**. Y
al fusionar, GitHub publica solo las cuatro aplicaciones: eso tarda un par de
minutos y no hay que hacer nada.

> **Si alguna comprobación sale en rojo, para y dímelo.** No fusiones: el candado
> de `main` está para eso.

---

## Paso 2 · Aplicar la migración `0026`

Es la del color de marca: añade **una columna** al local, `color_en_la_app`, que
dice si el color de ese local pinta la aplicación entera. No toca nada de lo que
ya había, y nace apagada, así que aplicarla no cambia el aspecto de nada.

**Dónde:** una ventana de terminal, en la carpeta del proyecto.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** una línea por cada migración que aplica. Solo debería
aplicar una, la `0026`, y acabar diciendo que la base está al día.

Y para comprobarlo sin creerte lo que diga yo:

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **26 de 26** migraciones aplicadas, y **39 tablas** en el
esquema `estook` —las mismas: esta añade una columna, no una tabla—, todas con
seguridad por filas.

---

## Paso 3 · Desplegar la API · **el que se olvida**

**Esto es lo importante de esta lista.** Las cuatro aplicaciones se publican solas
al fusionar; **la API se despliega a mano**, a propósito.

Esta vez no hay ninguna operación nueva, pero **dos de las que ya había han
cambiado por dentro**:

| Operación                | Qué ha cambiado                                     |
| ------------------------ | --------------------------------------------------- |
| `guardar_color_de_marca` | Aprende a guardar el interruptor de «usar mi color» |
| `quien_soy`              | Devuelve si ese interruptor está encendido          |

Si se salta este paso, lo que pasa es que **el interruptor de Ajustes no guarda
nada**: se enciende, se ve el color, y al recargar vuelve al naranja. La API
desplegada no conoce ese campo y lo tira.

Y si se hace el paso 3 sin el paso 2, la API intenta escribir en una columna que
no existe. **Van en este orden y no en el otro.**

**Dónde:** GitHub → pestaña **Actions** → en la lista de la izquierda, el flujo de
desplegar la API → botón **Run workflow** → **Run workflow**.

**Qué sale si va bien:** el flujo en verde en dos o tres minutos.

Y después, la comprobación que existe justo para esto:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** que la API desplegada conoce **todas** las consultas del
código. Si va por detrás, lo dice con esas palabras y con la lista de las que le
faltan.

---

## Paso 4 · Mirarlo en tu móvil · esto no puedo firmarlo yo

Es la regla 11, y es la que ha encontrado la mitad de los fallos de este proyecto.
Lo que hay que mirar, en este orden:

### En el Panel

1. **La rejilla son dos columnas**, no una. Se ve más de una tarjeta a la vez sin
   hacer scroll.
2. **Pulsa «Editar».** Aparecen el asa de mover, la ✕ y los tamaños en cada
   widget.
3. **Arrastra uno por el asa.** Tiene que levantarse un poco y cambiar de sitio al
   pasar por encima de otro. Suéltalo y pulsa «Listo».
4. **Sal de Estook y vuelve a entrar.** El widget tiene que estar donde lo dejaste.
   Esto es lo que comprueba que se guarda en el servidor y no en el navegador.
5. **Quita uno con la ✕.** Sale la barra de deshacer abajo: púlsala y tiene que
   volver.
6. **Añade uno** con el hueco de rayas. En la lista, abajo, salen en gris los que
   llegan con su módulo: esos **no se pueden pulsar**, y eso es lo correcto.

### Y lo que la segunda tanda arregla · **mira esto primero**

1b. **Quita un widget y recarga la página sin pulsar «Listo».** Tiene que seguir
quitado. Y lo mismo saliendo a Inventario y volviendo. Esto es lo que se perdía
siempre.

1c. **Abre la rueda con el dedo.** No tiene que salir ningún cuadrado naranja
alrededor: el círculo, limpio.

### Arriba, en la barra

7. **Cuenta los botones: son cinco y el avatar.** Buscar, avisos, chat, Fogón y tu
   retrato, con el nombre del local a la izquierda. **Lo único que no está es
   Ajustes**, porque sale abajo. En el ordenador sí está, con su icono.
8. **Pulsa el avatar.** Se abre «Tu cuenta»: ahí están Ajustes, Mi acceso, cambiar
   de local y Salir. **Y funciona también dentro de una app**, que es donde antes
   no había forma de llegar a Ajustes.

### Dentro de Inventario

9. **La barra de abajo tiene cuatro sitios y los cuatro llevan a algo**: Hoy,
   Productos, Movimientos y Compras. Ya no hay «Pedidos» vacía ni «Más».
10. **En Productos, arriba, hay cuatro pastillas**: Todo, Bajo mínimo, Sin precio y
    Desactivados. Púlsalas: la lista cambia y el título de arriba dice qué estás
    mirando.
11. **Abre Movimientos.** Es el libro entero, por días, con quién apuntó cada línea
    y cuánto quedó después. Esta pantalla no existía.
12. **Pulsa «Añadir producto» y luego «Crearlo a mano».** Pregunta tres cosas: cómo
    se llama, **en qué se mide** —cinco pastillas: g, ml, ud, kg, l— y **lo que te
    cuesta el kg** (o el litro, según lo que elijas). Ya no hay «cuánto trae» ni
    «unidad con la que cocinas»: eso está plegado en «lo compro por envases», y se
    abre solo si lo pides o si eliges algo del catálogo.

13. **Y en Servicio, abre Delivery.** Está Uber Eats con su icono y lo que va a
    entrar por ahí. **No hay ningún botón de conectar**, y eso es lo correcto: la
    conexión es M29.

### Fogón

14. **Pulsa la burbuja.** Tiene que decir dónde estás **y las cifras que hay
    delante**, y ofrecer botones que hacen algo de verdad. Pruébalos.

### Y lo que arregla la auditoría · **esto es lo más importante de mirar**

15. **Cambia de local y mira el inventario.** Si llegas a más de un local: cambia
    arriba, entra en **Inventario · Productos** y mira la lista. Tienen que ser los
    productos **del local en el que acabas de entrar**, no los de antes. Esto es lo
    que estaba mal: durante un minuto salía el género de un local con el nombre de
    otro arriba.
16. **Y hazlo con el móvil en avión.** Pon el modo avión, cambia de local, y tiene
    que decir que no ha cambiado, que sigues donde estabas y que lo que apuntes va
    al local de antes. Antes se iba al Panel como si hubiera cambiado.
17. **Con el modo avión puesto, intenta apuntar una salida.** Ahora dice «lo que
    has escrito sigue en la pantalla: vuelve a darle cuando tengas señal», y es
    verdad. Antes decía que se guardaba solo y **se perdía**. La cola que haría
    verdad el mensaje viejo está apuntada como lo siguiente que hay que construir.
18. **Sube un logo desde el alta, si tienes un local a medio dar de alta.** Tiene
    que salir la vista previa y el botón «Quitarlo». Es la comprobación de que la
    política de seguridad nueva no ha roto nada: bloquea lo que hay que bloquear y
    no la carga de una imagen tuya.
19. **Y entra desde el móvil de otra persona, si compartís tablet.** Tus acciones
    rápidas tienen que ser las tuyas, no las del último que entró.

### Y la limpieza de imagen · **esto es lo que hay que mirar esta vez**

20. **Abre el Panel y mira si parece una aplicación.** Las tarjetas tienen que
    verse **como tarjetas**, separadas del fondo, no como texto flotando sobre
    blanco. Ese era el fallo de la foto del TPV, y era una medida: el fondo y la
    tarjeta contrastaban 1,02:1.
21. **Arriba del Panel hay una cabecera con la cara de tu local**: una banda de tu
    color y tu logo. Ese logo se te pidió en el alta y hasta hoy no salía en
    ninguna parte.
22. **Los widgets llevan el color de su app.** Los de Inventario, naranja; los de
    Equipo, morado. Se lee de un vistazo de dónde sale cada cifra.
23. **Ajustes → Cómo se ve → Oscuro.** Toda la aplicación cambia al momento.
    Recarga: tiene que seguir oscura, porque se guarda en ese aparato.
24. **Y con el oscuro puesto, mira el logotipo de arriba.** Tiene que leerse. Era
    tipografía negra sobre transparente y se quedaba negro sobre negro; ahora hay
    una versión clara del mismo dibujo, con el naranja intacto.
25. **Ajustes → Tu marca.** Cambia el logo y quítalo. Antes solo se podía hacer
    dentro del alta, o sea: una vez en la vida del local.
26. **Elige un color y enciende «usar mi color en toda la aplicación».** Los
    botones, las pastillas y el resaltado pasan a ser de tu color.
27. **Y ahora el que importa: pon un color raro.** Un amarillo chillón, un negro,
    un gris. **El texto de los botones se tiene que seguir leyendo siempre.** Si
    el color que elegiste no llegaba, la propia tarjeta te lo dice: «para que se
    lea sobre el fondo, ese color se pinta un poco más oscuro».
28. **Prueba las dos cosas juntas**: tu color con el tema oscuro. El acento se
    recalcula contra el fondo nuevo, así que tiene que verse igual de bien.

> **Lo que salga, apúntalo tal cual.** Los seis fallos del segundo paseo por el
> móvil salieron así, y ninguno ponía en rojo ninguna prueba.
