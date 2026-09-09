# Pasos para cerrar M6½ · la capa de producto

> ## Lo que hay hecho, y lo que falta
>
> **La primera tanda está cerrada del todo**: fusionada (PR #37), la `0025`
> aplicada —25 de 25 migraciones y 39 tablas— y la API desplegada. Y mirada en el
> móvil, que es de donde salió la segunda tanda.
>
> | Qué                 | Cómo está                                                   |
> | ------------------- | ----------------------------------------------------------- |
> | Primera tanda       | **Fusionada, migrada y desplegada** · pasos 1, 2 y 3 hechos |
> | Segunda tanda       | **Escrita y en verde**: 706 de unidad y 439 de pantalla     |
> | La auditoría        | **Escrita y en verde**, en la misma rama · nada que migrar  |
> | Su pull request     | **Por fusionar** · paso 1                                   |
> | Migraciones         | **Ninguna nueva**: el paso 2 no toca esta vez               |
> | La API              | **Ninguna operación nueva**: el paso 3 tampoco              |
> | Mirarlo en tu móvil | **Sin hacer** · paso 4, y es el que no puedo hacer yo       |
>
> Así que de esta tanda **solo hay que fusionar y mirar**. Los pasos 2 y 3 se dejan
> escritos porque valen para la próxima vez que sí toquen — y el 3 es el que se
> olvida.

---

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

## Paso 2 · Aplicar la migración `0025`

Es la del Panel de cada uno: crea una tabla nueva, `estook.panel_de_persona`, y no
toca nada de lo que ya había.

**Dónde:** una ventana de terminal, en la carpeta del proyecto.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** una línea por cada migración que aplica. Solo debería
aplicar una, la `0025`, y acabar diciendo que la base está al día.

Y para comprobarlo sin creerte lo que diga yo:

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **25 de 25** migraciones aplicadas, y **39 tablas** en el
esquema `estook` —eran 38—, todas con seguridad por filas.

---

## Paso 3 · Desplegar la API · **el que se olvida**

**Esto es lo importante de esta lista.** Las cuatro aplicaciones se publican solas
al fusionar; **la API se despliega a mano**, a propósito.

M6½ trae **tres operaciones nuevas** que la API desplegada no conoce:

| Operación          | Para qué                          |
| ------------------ | --------------------------------- |
| `mis_movimientos`  | El libro de movimientos, entero   |
| `mi_panel`         | Leer cómo tienes montado el Panel |
| `guardar_mi_panel` | Guardarlo                         |

Si se salta este paso, lo que pasa es exactamente lo que pasó al cerrar M6: la
pantalla está publicada y el servidor no conoce sus operaciones, así que **el Panel
sale vacío y Movimientos dice «Eso ya no está»**, y por fuera parece que se ha roto
todo. No se ha roto nada: falta este paso.

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

> **Lo que salga, apúntalo tal cual.** Los seis fallos del segundo paseo por el
> móvil salieron así, y ninguno ponía en rojo ninguna prueba.
