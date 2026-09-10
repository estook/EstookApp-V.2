# Pasos para cerrar M6½ · la tercera tanda

> ## Cómo está
>
> Las tres primeras entregas de M6½ están **fusionadas** (PR #37, #38 y #39). Esta
> es la cuarta y la última: la lista de trece cosas —el Panel que se deshacía,
> fichar, la merma, el cierre de caja, el equipo, la rueda, los textos— y los
> documentos.
>
> | Qué                 | Cómo está                                                 |
> | ------------------- | --------------------------------------------------------- |
> | El pull request     | **Fusionado** (#40), con las tres comprobaciones en verde |
> | Migraciones         | **Aplicadas**: 29 de 29 y 44 tablas, leído en Supabase    |
> | La API              | **Desplegada**: conoce las 25 consultas y los 58 comandos |
> | Mirarlo en tu móvil | **Hecho por Richi** el 10 de septiembre                   |
>
> **Los cuatro están hechos.** Queda fusionar un arreglo pequeño de una prueba del
> Panel que salió «flaky» al fusionar la #40 —falló una vez en Safari y pasó al
> repetirse—; no toca la aplicación. Lo de abajo se deja como estaba, para poder
> repasarlo.

## Cómo se escriben los comandos aquí

**El lanzador es `.\estook.cmd`.** En tu ordenador `pnpm` a veces no se encuentra,
porque la ventana de terminal se abrió antes de instalarlo y se quedó con el PATH
viejo. `.\estook.cmd` lo busca donde de verdad está, así que funciona siempre.

Y PowerShell **no entiende `&&`**: cada comando va en su recuadro, de uno en uno.

---

## Paso 1 · Fusionar el pull request

**Dónde:** GitHub → pestaña **Pull requests** → el que se llama «M6½ · tercera
tanda…» → bajar al recuadro del final.

Las tres comprobaciones tienen que estar en verde: `Calidad`, `Construccion y
presupuestos` y `Migraciones reversibles`. Entonces, **Merge pull request** y
**Confirm merge**.

**Qué sale si va bien:** el pull request en morado, con la palabra **Merged**. Las
cuatro aplicaciones se publican solas en un par de minutos.

> **Si alguna comprobación sale en rojo, para y dímelo.** No fusiones.

---

## Paso 2 · Aplicar las migraciones `0027`, `0028` y `0029`

Son tres, y ninguna toca lo que ya había:

| Migración | Qué pone                                                                         |
| --------- | -------------------------------------------------------------------------------- |
| `0027`    | Los fichajes, lo que cobra cada uno, el horario de siempre y dónde está el local |
| `0028`    | El motivo de cada merma y su partida                                             |
| `0029`    | El cierre de caja de cada día y cómo entran las ventas del local                 |

**Dónde:** una ventana de terminal, en la carpeta del proyecto.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** tres líneas, una por migración —la `0027`, la `0028` y la
`0029`—, y al final que la base está al día.

Y para comprobarlo sin fiarte de mí:

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **29 de 29** migraciones aplicadas y **44 tablas** en el
esquema `estook` —eran 39: entran cinco—, **todas** con seguridad por filas.

---

## Paso 3 · Desplegar la API · **el que se olvida**

Las aplicaciones se publican solas al fusionar; **la API se despliega a mano**, a
propósito. Y esta vez trae **nueve consultas y nueve comandos nuevos** —fichar,
apuntar una merma, cerrar la caja, la ficha de cada persona…— y cambia por dentro
dos que ya había: dar de alta un producto, que ahora apunta lo que hay, y apuntar
cualquier movimiento, que ya deja a una camarera apuntar su merma.

**Si se salta este paso:** el Panel enseña «Fichar» y «Merma de hoy», y al
pulsarlos dicen «Eso ya no está». Por fuera parece que se ha roto todo.

**Si se hace antes del paso 2:** la API busca tablas que no existen. **Van en este
orden, y no en el otro.**

**Dónde:** GitHub → pestaña **Actions** → a la izquierda, **Desplegar la API** →
botón **Run workflow** → escribe `desplegar` donde lo pide → **Run workflow**.

**Qué sale si va bien:** el flujo en verde en dos o tres minutos.

Y después, la comprobación que existe justo para esto:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:**

- que la API desplegada conoce **las 25 consultas** y, esto es nuevo, **los 58
  comandos**. Antes solo preguntaba por las consultas, y una API vieja lee bien y
  falla al guardar: es lo que le pasaba al Panel.
- en el bloque de M6½: **las cinco tablas nuevas con seguridad por filas**, la merma
  con su motivo, el local con sus cuatro columnas y la función que decide quién ve
  las horas de quién.

Lo que sale como **«sin poder comprobar»** es normal: son cosas que necesitan
cuentas de ejemplo, y en tu base no hay a propósito. La salida lo explica.

---

## Paso 4 · Mirarlo en tu móvil · esto no puedo firmarlo yo

Es la regla 11, y es la que ha encontrado la mitad de los fallos de este proyecto.
Con la aplicación del móvil, **después** de los pasos 2 y 3.

### Antes de nada · una vez

1. **Ajustes → Dónde está el local**, estando **dentro del local**: pulsa «Estoy en
   el local: márcalo». El móvil te pedirá la ubicación: dale permiso. Tiene que
   quedar marcado, con el radio debajo.
2. **Ajustes → Tus ventas**: elige «Lo apunto yo» o «Lo trae mi TPV». La tarjeta
   del Panel que lo preguntaba tiene que desaparecer.

### El Panel · lo que se deshacía

3. **Editar → quita un widget → recarga la página.** Tiene que seguir quitado.
4. **Quita «Acciones rápidas» y vuelve a ponerla desde «Añadir».** Tiene que estar
   en la lista. Antes, quitada, no se podía recuperar.
5. **Si alguna vez sale un aviso rojo** «No se ha guardado el Panel», pulsa
   «Reintentar». Si sale a menudo, **dímelo**: quiere decir que la API no está al
   día, y eso es el paso 3.
6. **Añadir** tiene los widgets nuevos: **Fichar**, **Quién está trabajando**,
   **Personas**, **Merma de hoy** y **Ventas de hoy**. «Tu equipo», el grande, ya
   no está.

### Fichar

7. **Pulsa «Fichar la entrada».** El móvil pide la ubicación (la primera vez). Tiene
   que decir «Entrada apuntada, a X m del local».
8. **Ahora prueba a negarla**: quita el permiso de ubicación a la app en el móvil y
   ficha la salida. **Tiene que fichar igual**, y decir que no se sabe dónde.
   Fichar no se bloquea nunca.
9. **Equipo → Hoy**: sales tú, desde qué hora, y quién falta por fichar.

### El equipo

10. **Equipo → Personas → pulsa a alguien.** Se abre su ficha: horas de hoy, de la
    semana y del mes, sus fichajes, su horario y **Lo que cobra**.
11. **Ponle lo que cobra**, por hora o al mes (al mes te pide las horas de contrato).
    Y **ponle su horario** de la semana.
12. **Corrige un fichaje suyo**: te obliga a escribir el motivo.
13. **En la lista, «Acceso»** abre un desplegable con PIN nuevo, contraseña nueva y
    Retirar, y **Retirar pregunta antes**. La columna dice «En línea» o cuándo entró
    por última vez, no «dentro».
14. **Equipo → Resumen**: las horas de cada uno en la semana, el mes o los últimos
    treinta días, frente a su contrato.
15. **Si tienes un jefe de cocina de verdad**, que entre él: en Resumen solo tiene
    que ver a los de cocina. Y no ve lo que cobra nadie más que él.

### La merma

16. **Panel → Merma de hoy → Apuntar.** Busca un producto, pon cuánto, elige por qué.
    Debajo te dice en qué partida cuenta. «Otra cosa» te obliga a escribir qué pasó.
17. **Si tienes un camarero de verdad**, que la apunte él: tiene que poder, **y no
    tiene que ver ningún precio**.
18. **Inventario → Hoy**: la tarjeta de merma, con la tira de los catorce días y
    «Ver a detalle».
19. **Ver a detalle** (o Inventario → Movimientos → Mermas): los totales por partida,
    el buscador, «Exportar» —se abre en Excel— e **«Imprimir o PDF»**: en el
    diálogo del móvil, «Guardar como PDF». Tiene que salir **sin las barras ni los
    botones**, solo la lista.

### Productos

20. **Añadir producto → Crearlo a mano.** Las etiquetas dicen **Producto**, **Cuánto
    trae**, **Precio (por todo)**, **Cuánto hay ahora**, **Caduca el**, **Categoría**
    y **Proveedor (opcional)**. **No hay «qué porcentaje se aprovecha»**. Pon cuánto
    hay: al guardar, la cámara ya lo cuenta.
21. **En la lista, el + verde**: ya trae el precio de siempre. Cámbialo y enciende
    «usarlo como su precio a partir de hoy».
22. **El − rojo**: te pregunta por qué sale. Si eliges un motivo de merma, aparece
    en Mermas.
23. **Inventario → Hoy**: el **valor de la cámara ya no sale a cero** con productos
    que tienen precio.

### La caja y las ventas

24. **Servicio → Jornada → Cierre.** Escribe el total del día y cómo se cobró, y
    **Cerrar la caja**. Si el desglose no suma el total, te lo dice sin impedirte
    cerrar. Prueba también a subir el CSV de tu TPV, si lo tienes.
25. **Negocio → Ventas**: el día que acabas de cerrar, con el ticket medio. Púlsalo
    y te lleva a su cierre.

### La rueda, Fogón y Ajustes

26. **Abre la rueda**: sale **más abajo**, a mano del pulgar. **En el centro, el
    logotipo del Panel**: púlsalo y vas al Panel. **No hay botón de cerrar**: pulsa
    fuera y se cierra.
27. **Fogón**: solo dice dónde estás y que pronto podrás preguntarle. Sin cifras ni
    recuadros.
28. **Ajustes**: «Tamaño de letra», «Elige tu tema», «Tu marca», «Tus ventas»,
    «Dónde está el local» e «Idioma», **sin párrafos que expliquen lo evidente**.

> **Lo que salga, apúntalo tal cual**, con una foto si puedes. Los fallos del móvil
> salen así, y ninguno pone en rojo ninguna prueba.
