# Pasos para cerrar M6½ · lo que viste en el TPV

> ## Cómo está
>
> Todo M6½ está fusionado (#37 a #41), migrado y desplegado. Esta entrega arregla
> lo que salió al mirarlo en el TPV y en el móvil.
>
> | Qué             | Cómo está                                                           |
> | --------------- | ------------------------------------------------------------------- |
> | El pull request | **Fusionado** (#42)                                                 |
> | Migración       | **Aplicada**: 30 de 30                                              |
> | La API          | **Desplegada**, y los JSON se guardan como objetos                  |
> | Mirarlo         | **Hecho por Richi**: el Panel se guarda y el GPS ficha a 47 m, ±5 m |
>
> **M6½ está cerrado.** Lo de abajo se deja como estaba, para poder repasarlo.

## Qué arregla, una línea cada cosa

- **El Panel no se guardaba nunca**, en ningún aparato. El servidor publicado
  guardaba los datos «envueltos» dos veces y la base los rechazaba: en tu base no
  había ni un Panel guardado. Arreglado, con una prueba para que no vuelva.
- **Fichar salía «sin señal»** si tardabas en pulsar «Permitir»: ese rato contaba
  como espera. Ya no cuenta, y si el GPS no llega se usa la posición de la wifi.
- **Marcar el local desde el TPV** sitúa la manzana, no el local: ahora te dice el
  error en metros y te avisa si es grande.
- **Las ventanas del ordenador** ya no van de lado a lado: se abren en el centro,
  con ancho de formulario.
- **En el cierre de caja**, el importe de cada plato se pone solo con el de la
  última vez, y se puede cambiar. Con la carta (M10), saldrá de la carta.
- **La ficha de un producto**, ordenada en bloques y sin frases de más. Y «vale
  0,00 €» con 500 burratas dentro ya no sale: lo que entró sin coste se valora a
  su precio de hoy, y lo dice.

## Cómo se escriben los comandos aquí

**El lanzador es `.\estook.cmd`**, y PowerShell **no entiende `&&`**: cada comando
va en su recuadro, de uno en uno.

---

## Paso 1 · Fusionar el pull request

**Dónde:** GitHub → **Pull requests** → el que se llama «M6½ · lo que viste en el
TPV…» → abajo del todo.

Las tres comprobaciones en verde —`Calidad`, `Construccion y presupuestos` y
`Migraciones reversibles`— y entonces **Merge pull request** → **Confirm merge**.

**Qué sale si va bien:** el pull request en morado, con **Merged**.

---

## Paso 2 · Aplicar la migración `0030`

No crea tablas: arregla los datos que se guardaron «envueltos» —los avisos
pendientes y las respuestas guardadas— y añade una función para leer los que no
se pueden tocar, que son la auditoría y el libro de movimientos.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** una línea, la `0030`, y que la base está al día.

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **30 de 30** migraciones, y las mismas **44 tablas**.

---

## Paso 3 · Desplegar la API · **este es el que arregla el Panel**

El arreglo del Panel está en el servidor, y el servidor se despliega a mano. Hasta
que no hagas este paso, el Panel seguirá sin guardarse.

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. En verde en dos o tres minutos.

Y la comprobación:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:**

- **«los JSON se guardan como objetos, no envueltos en un texto»** con los tres
  contadores a cero: panel, bandeja e idempotencia. Si sale alguno después de
  desplegar, es que la API publicada no tiene el arreglo: dímelo.
- Que conoce **las 25 consultas y los 58 comandos**.

---

## Paso 4 · Mirarlo en el TPV y en el móvil

1. **El Panel**, en el TPV: **Editar**, mueve o quita un widget, **Listo**, y
   recarga la página. **Tiene que seguir como lo dejaste.** Hazlo también en el
   móvil: cada aparato tiene el suyo. Si vuelve a salir el aviso rojo, mándame una
   foto.
2. **Tu fichaje de hoy sigue abierto**: entraste a las 16:15 y no hay salida.
   Fíchala, o corrígela desde Equipo → Personas → tú → el fichaje.
3. **Fichar desde el móvil**, con calma: si pregunta «¿Permitir la ubicación?», tómate
   el tiempo que quieras. Tiene que decir **«Entrada apuntada, a X m del local»**.
4. **Ajustes → Dónde está el local**, **desde el móvil y dentro del local**:
   «Volver a marcarlo desde aquí». Te dice el error en metros. Hazlo desde el TPV y
   verás el aviso de que ahí es poco preciso. Y mira el radio: **50 m es justo** para
   un GPS dentro de un edificio; **100 m** es más realista.
5. **En el ordenador**, abre «Añadir producto» y el «Acceso» de una persona: **una
   ventana en el centro**, no de lado a lado.
6. **La ficha de la burrata**: tiene que leerse en bloques —en cámara, precio,
   últimos movimientos y la ficha— y decir **«Vale 1.000,00 € · a su precio de
   hoy»**.
7. **El cierre de caja**: cierra un día con un plato y su importe. Otro día —cambia
   la fecha arriba—, escribe el mismo plato y cuántos: **el importe sale solo**, con
   «como la última vez» debajo.

> **Lo que salga, apúntalo tal cual**, con una foto si puedes.

## Lo que decidiste al cerrar

- **Google, al final de M7**, con Places bien acotada y actualizándose sola al
  acabar el día ([decisión 0030](decisiones/0030-el-local-se-situa-con-google.md)).
  Hará falta tu clave de Google con facturación y pedir el acceso a Business
  Profile al empezar M7.
- **Las entregas y las caducidades, en el Calendario**, y los avisos con los roles
  que los ven ([decisión 0031](decisiones/0031-el-calendario-recoge-lo-de-todos.md)).
