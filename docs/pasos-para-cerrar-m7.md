# Pasos para cerrar M7 · la primera entrega: las compras y el Calendario

> ## Cómo está
>
> | Qué             | Cómo está                                                           |
> | --------------- | ------------------------------------------------------------------- |
> | El pull request | **Abierto**, sin fusionar: `m7-proveedores-y-compras`               |
> | Migraciones     | **Dos nuevas sin aplicar**: `0031_compras` y `0032_el_calendario`   |
> | La API          | **Sin desplegar**: la publicada no conoce las 22 operaciones nuevas |
> | Mirarlo         | **Pendiente**: en el TPV y en el móvil, con la lista del paso 4     |
> | Google          | **Pendiente de ti**: el paso 5, que tarda en llegar                 |

## Qué trae, una línea cada cosa

- **Compras, entera**, en cinco vistas: Pedidos, Albaranes, Facturas, Proveedores y
  Precios. Pedidos empieza por **lo de hoy**: a quién toca pedirle antes de su hora
  límite, lo que llega hoy y mañana, y los borradores por mandar.
- **La ficha del proveedor** completa: con quién hablas, teléfono, WhatsApp, correo,
  web, CIF, **qué días reparte, con cuántos días de antelación y hasta qué hora**,
  forma de pago, pedido mínimo y portes. Y se llena sola: qué te sirve, gasto del
  mes, incidencias, puntualidad y lo que te ha subido.
- **Hacer un pedido** empieza por lo que Estook le pediría hoy, en cajas enteras y
  con el porqué. Se manda **por WhatsApp o por correo con el pedido escrito**, se
  copia o se imprime, y se apunta «mandado» cuando dices que lo has mandado.
- **Recibir entero son dos toques.** Con cambios, cada línea: lo que ha llegado, a
  cuánto, si no se acepta, lote y caducidad. Lo que falta se vuelve a pedir de un
  toque, y lo que se ve malo después se **devuelve**.
- **La factura se compara con sus albaranes mientras la escribes**: «te cobran
  6,50 € de más». Y si una línea viene cobrada distinta, el precio nuevo se apunta.
- **Lo pactado** con cada proveedor, y **quién te lo deja mejor**, en euros al mes.
- **El Calendario empieza a llenarse**: los repartos, los pedidos que llegan y lo que
  caduca. En el Panel, dos widgets nuevos: **«Compras de hoy»** y **«Lo que viene»**.
- **Un cocinero** hace el borrador y recibe el camión **sin ver un solo precio**, y
  mandar el pedido lo hace quien puede comprometer el dinero del local.

## Cómo se escriben los comandos aquí

**El lanzador es `.\estook.cmd`**, y PowerShell **no entiende `&&`**: cada comando
va en su recuadro, de uno en uno. Se abre PowerShell en la carpeta del proyecto.

---

## Paso 1 · Fusionar el pull request

**Dónde:** GitHub → **Pull requests** → el que se llama «M7 · proveedores y
compras…» → abajo del todo.

Espera a las tres comprobaciones en verde —`Calidad`, `Construccion y
presupuestos` y `Migraciones reversibles`— y entonces **Merge pull request** →
**Confirm merge**.

**Qué sale si va bien:** el pull request en morado, con **Merged**.

**Si alguna sale en rojo:** no fusiones; mándame una foto de la que falla.

---

## Paso 2 · Aplicar las dos migraciones

Crean las tablas de las compras —pedidos, albaranes, facturas y lo pactado— y la
del Calendario, y ponen en el Calendario las caducidades de los lotes que ya hay.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** dos líneas, la `0031_compras` y la `0032_el_calendario`, y
que la base está al día.

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **32 de 32** migraciones y **51 tablas**, todas con
seguridad por filas.

**Si sale un error:** no sigas; cópiame el texto rojo tal cual.

---

## Paso 3 · Desplegar la API

Las pantallas nuevas hablan con 22 operaciones que la API publicada todavía no
conoce. Hasta este paso, Compras dirá que no puede leer nada.

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. En verde en dos o tres minutos.

Y la comprobación:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas que tiene el código» y «y
conoce todos los comandos», y los JSON como objetos. **Si dice «FALTA
DESPLEGARLA»** con una lista de nombres, el paso de arriba no ha terminado bien:
vuelve a lanzarlo y dímelo si se repite.

---

## Paso 4 · Mirarlo en el TPV y en el móvil

Todo está en **Inventario → Compras**. Hazlo con calma y apunta lo que no te guste.

1. **Un proveedor de verdad**: Compras → **Proveedores** → **Añadir**. Pon con quién
   hablas, **tu propio móvil como WhatsApp** (para probar sin molestar a nadie),
   los días que reparte, cuántos días antes hay que pedir y hasta qué hora.
   **Qué tiene que salir:** debajo de los días, la frase «Se le pide la víspera,
   hasta las 20:00» (o la que toque), y en la lista, cuándo es su próximo reparto.
2. **Que te sirva algo**: abre un producto y ponle ese proveedor, o da de alta uno
   nuevo con él.
3. **Un pedido**: Compras → **Pedidos** → **Hacer un pedido** → elige el proveedor.
   **Qué tiene que salir:** «Si lo pides hoy antes de las…, llega el…», y lo que le
   pediría. Empieza con eso o en blanco, cambia una cantidad con el + y **Guardar
   los cambios**.
4. **Mandarlo**: **Por WhatsApp**. Se abre WhatsApp con el pedido escrito, **sin
   precios**, saludando a quien pusiste. Mándatelo, vuelve a Estook y pulsa **«Sí,
   ya está mandado»**.
   **Qué tiene que salir:** «Apuntado: mandado por WhatsApp», y el pedido en
   **Inventario → Hoy**, en «Compras de hoy».
5. **Recibirlo entero**: **Recibir lo que ha llegado** → **Sí, ha llegado entero**.
   **Qué tiene que salir:** «Apuntado: ha entrado todo en cámara», y en el producto,
   lo que había más lo que ha llegado.
6. **Otro, con cambios**: haz y manda otro pedido de dos cajas, y al recibir pulsa
   **Con cambios**: pon que ha llegado una y otro precio.
   **Qué tiene que salir:** «Ha venido menos» y «Precio distinto», y el botón
   **«Pedirle lo que faltó»**.
7. **La factura**: Compras → **Facturas** → **Apuntar una factura** → el proveedor,
   un número, la fecha y una base un euro más alta que lo que llegó.
   **Qué tiene que salir, mientras escribes:** «te cobran 1,00 € de más».
8. **El Panel**: tus Paneles guardados **no reciben los widgets nuevos solos**.
   **Editar** → **Añadir** → **«Compras de hoy»** y **«Lo que viene»**, en el TPV y
   en el móvil, que cada aparato tiene el suyo.
9. **Si tienes una cuenta de cocinero**, entra con ella y abre un borrador.
   **Qué tiene que salir:** «Queda en borrador: lo manda quien puede mandar
   pedidos», y ni un euro en toda la ficha.

> **Lo que salga raro, apúntalo tal cual**, con una foto si puedes.

---

## Paso 5 · Lo de Google, que tarda en llegar

Es para **la segunda entrega de M7**: el local en Google y sus reseñas, que se
actualizan solas al cerrar el día. Sin estos dos accesos no se puede probar de
verdad, y el segundo tarda días o semanas. Los nombres de los botones de Google
cambian a veces: si alguno no está donde digo, búscalo por su nombre.

### A · Una clave de Google Cloud, con facturación, para Places

1. Entra en **console.cloud.google.com** con tu cuenta de Google.
2. Arriba, **Seleccionar un proyecto** → **Proyecto nuevo** → nombre `Estook` →
   **Crear**.
3. Menú ☰ → **Facturación** → **Vincular una cuenta de facturación** (una tarjeta).
   Google da un crédito mensual gratis para Maps; con el tope que pondremos, no
   deberías pasar de él.
4. Menú ☰ → **APIs y servicios** → **Biblioteca** → busca **«Places API (New)»** →
   **Habilitar**.
5. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **Clave de
   API**. Después, **Editar la clave** → **Restricciones de API** → marca solo
   **Places API (New)** → **Guardar**.
6. **Facturación** → **Presupuestos y alertas** → **Crear presupuesto** de **10 € al
   mes**, con aviso por correo.
7. **No me pegues la clave en el chat**: una clave que pasa por un chat hay que
   cambiarla. Guárdala tú; en la segunda entrega te digo dónde ponerla.

### B · El acceso a las API de Google Business Profile

1. Hazlo con **la cuenta de Google que gestiona la ficha del local** en Google Maps.
2. En el proyecto `Estook` de arriba, apunta su **número de proyecto** (sale en el
   Panel del proyecto).
3. Busca «**Google Business Profile APIs** solicitar acceso» y rellena el formulario
   de acceso de Google: el nombre del negocio, su web, el número de proyecto, y para
   qué: «leer las reseñas y la ficha de mi propio local desde mi aplicación de
   gestión».
4. Google contesta por correo. **Cuando te lo aprueben, avísame**, y empiezo la
   segunda entrega.

---

## Lo que necesito que me confirmes

1. **Mandar pedidos**: el cocinero hace el borrador y recibe, pero **mandarlo al
   proveedor** lo hacen el jefe de cocina, el gerente y los de arriba. ¿Te vale así?
2. **Los precios, sin IVA**: los pedidos, albaranes y facturas se comparan sin IVA.
   **¿Los precios que pusiste a tus productos llevaban IVA?** Si sí, hay que
   corregirlos, o las facturas no te cuadrarán.
3. **El pedido no sale solo**: Estook abre tu WhatsApp o tu correo con el pedido
   escrito, y lo mandas tú. El PDF con tu logo llega con los documentos (M11).
4. **Lo pactado es de cada local**. El precio pactado para toda una cadena llega con
   el catálogo maestro (M24).
5. **Si una factura cobra distinto, el precio nuevo vale desde hoy**, y lo que
   cobró queda apuntado con su fecha para recalcular los platos de esos días cuando
   estén los escandallos (M9).
