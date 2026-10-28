# Repaso de lo que hay, con M4 ya desplegado

Escrito el 2 de septiembre de 2026, con la API sirviendo de verdad y la
aplicación entrando desde un móvil. Es el primer repaso que se hace **mirando
algo que funciona**, no leyendo código, y por eso encuentra cosas que ninguna
prueba veía.

No es una lista de deseos. Cada punto está comprobado contra la base de datos o
el código, y lleva dicho **qué pasa hoy** y **cuándo empieza a doler**.

---

## Lo que ya está arreglado

Los tres que salieron en las fotos del móvil.

| Qué se veía                              | Qué era                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| «Negocio» se comía su flecha en la rueda | Icono y nombre a radios distintos: a las tres y a las nueve se solapaban |
| 23 filas de «Bar Centro» en las sesiones | `bd:comprobar-api` entraba 20 veces por pasada y no cerraba ninguna      |
| Sillas de ruedas en «Accesibilidad»      | El símbolo decía «esto es para personas con discapacidad», y no lo es    |

---

## 1 · Hay tres mecanismos de fondo y **ninguno se ejecuta**

Lo más importante de este repaso.

El servidor tiene construidas y probadas tres cosas que trabajan solas:

- **`estook.bandeja_de_salida`** · los eventos. `invitar_persona` ya publica
  `membresia.creada`.
- **`estook.trabajo`** · la cola de tareas, con reintentos y su índice.
- **`limpiarCaducadas()`** · borra las claves de idempotencia vencidas.

**No hay nada desplegado que llame a ninguna de las tres.** La API es una única
función de Supabase que atiende peticiones y se apaga; no hay reloj, ni cron, ni
proceso de fondo. Así que:

- Los eventos se escriben y **nadie los lee**. Hoy no se nota porque nada
  reacciona a ellos todavía. En M8 (avisos) y M13 (TPV) sí.
- La cola de trabajos está vacía porque nadie encola. En cuanto algo encole, se
  queda ahí.
- `clave_de_idempotencia` crece sin parar. Hoy son 25 filas y ninguna vencida,
  así que **no es urgente**, pero es una tabla que sólo sabe crecer.

**Cuándo duele:** M8. Antes de M8 hay que decidir quién ejecuta esto. Las
opciones razonables son un `pg_cron` dentro de Supabase, o una segunda función
disparada por el programador de Supabase. Es una decisión de arquitectura, y
merece su documento en `docs/decisiones/`.

---

## 2 · «Mis dispositivos» no enseña dispositivos · **arreglado en M5**

La tabla `estook.dispositivo` existe, con su clave ajena en `sesion`. Hoy:

```
dispositivos registrados: 0
sesiones con dispositivo: 0 de 97
```

**Nadie escribe nunca en ella.** `entrar` no la toca, así que
`sesion.dispositivo_id` es siempre nulo.

Por eso la pantalla acaba enseñando el **local** de cada sesión en vez del
aparato, y de ahí salían veintitrés filas diciendo «Bar Centro»: son la misma
persona, en el mismo local, desde el mismo teléfono, y no hay forma de saberlo.

Es un fallo de coherencia, no de código: el dominio promete «mis dispositivos»
(Manifiesto 23) y los datos son «mis sesiones». Y tiene consecuencia real de
seguridad: **el caso para el que existe la pantalla es reconocer una sesión que
no es tuya**, y con todas las filas iguales no se puede.

**Qué haría falta:** que `entrar` identifique el aparato —agente de usuario más
una marca guardada en el navegador—, cree o reutilice su fila en `dispositivo`, y
que la sesión cuelgue de ella. Entonces entrar dos veces desde el mismo móvil no
son dos filas: es un dispositivo con la fecha actualizada.

**Cuándo duele:** ya duele un poco. No es urgente, pero es barato ahora y caro
cuando haya sesiones de verdad.

> **Hecho en M5.** `entrar` manda ahora una marca opaca del navegador —un número
> al azar guardado en `localStorage`, nunca nada del aparato físico—, y
> `estook.reconocer_dispositivo` la encuentra o la da de alta. La sesión cuelga de
> ella, así que entrar dos veces desde el mismo móvil ya no son dos filas. Hay
> tres pruebas que lo fijan, incluida la de que sin marca no se inventa un
> aparato: en navegación privada se entra igual, con la sesión sin dispositivo.

---

## 3 · Ninguna consulta de lista tiene tope

`mis_locales`, `mis_permisos`, `quien_tiene_acceso` y las sesiones de
`mi_acceso` devuelven **todo lo que haya**, sin `limit` ni paginación. El
buscador sí lo tiene; el resto no.

Hoy son 7 personas y 7 locales, así que no se nota. Una cadena de 40 locales con
300 personas convierte `quien_tiene_acceso` en una respuesta de cientos de filas
que el móvil tiene que descargar y dibujar entera.

**Cuándo duele:** M8 (Equipo) es la primera pantalla que lista personas de
verdad. Conviene que nazca paginada en vez de arreglarlo después.

---

## 4 · Cada entrada abre una sesión nueva

Una sesión dura 30 días y no hay tope por persona. Quien entra a diario desde el
mismo teléfono acumula treinta filas.

La pantalla ya no las enseña todas —se acortó a las cinco más recientes— pero
**eso es una tirita**: la causa es que la sesión se ata a un login y no a un
aparato, que es el punto 2.

**Cuándo duele:** cuando haya personas de verdad entrando cada día. Se arregla
solo si se arregla el punto 2.

---

## 5 · El presupuesto de tamaño va al 82 %

```
app      205,4 KB de 250  · de los cuales 106,1 KB son la tipografía
web      164,2 KB
carta    164,2 KB
admin    181,9 KB
```

La app tiene **44 KB de margen** y quedan por construir Inventario, Escandallos,
Carta, Calendario, Equipo, Servicio, Negocio, Cuaderno y Fogón.

No es una alarma, y **el presupuesto no manda sobre el producto**. Es un dato
para tenerlo delante: con este margen, las pantallas grandes van a tener que
cargarse aparte, como ya hace la gráfica (`GraficaDibujo` es su propio trozo). La
tipografía sola son 106 KB, la mitad del presupuesto; si algún día aprieta, ahí
está el bocado grande.

**Cuándo duele:** hacia M6-M7, cuando entren las primeras pantallas gordas.

---

## Lo que está bien y conviene no tocar

Vale la pena decirlo, porque en un repaso sólo se leen los problemas:

- **La seguridad de verdad la hacen las políticas de la base de datos**, no el
  código. 23 tablas, todas con seguridad por filas. Eso es lo que hace que un
  fallo en la API no sea una fuga.
- **La auditoría no se puede modificar ni borrar.** Comprobado en los datos, no
  sólo en el esquema.
- **Ninguna contraseña guardada en claro**, y hay una comprobación que lo mira
  en los datos reales en cada pasada.
- **Bloqueo a los cinco intentos**, contado en la base de datos y no en memoria,
  que es lo único que funciona cuando la API son funciones que van y vienen.
- **El aviso de actividad de la sesión está limitado a una escritura cada quince
  minutos.** Es un detalle pequeño y está bien pensado: sin él, cada lectura
  sería una escritura.
- **Idempotencia en todos los comandos**, con los que devuelven un secreto
  marcados para no guardarse.

---

## En qué orden

1. ~~**Antes de M5, nada.**~~ M5 empezó tal cual.
2. ~~**Con M5**, el punto 2 (dispositivos)~~ · **hecho**.
3. **Antes de M8**, el punto 1 (quién ejecuta lo de fondo) y el 3 (paginación).
   M8 es la primera que necesita las dos. **M5 no lo forzó** —el modo
   demostración limpia al entrar, y los eventos se siguen publicando sin que
   nadie los lea— pero M5 publica cinco eventos nuevos, así que la bandeja crece
   más deprisa que antes.
4. **El punto 5 se vigila**, no se arregla: `pnpm tamano` ya lo mide en cada
   cambio. Con M5 la app va por 216,6 KB de los 250 de referencia.

---

## Y lo que este repaso no vio

Escribiendo M5 apareció algo que este documento no miró y que era lo más grave de
todo: **la base de datos de producción tiene ocho cuentas con una contraseña
publicada en este repositorio**. Está en `ESTADO.md`, arriba del todo.

La lección para el próximo repaso: este miró **el código y los datos**, y esa es
la mitad. La otra es mirar **qué se ha ejecutado ya contra qué base**.
