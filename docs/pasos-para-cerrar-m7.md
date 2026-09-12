# Pasos para cerrar M7 · el repaso, las bases y el dominio

> ## Cómo está
>
> | Qué                     | Cómo está                                                               |
> | ----------------------- | ----------------------------------------------------------------------- |
> | La entrega 1 del repaso | **Fusionada** (#45)                                                     |
> | `estook.com`            | **Funcionando** (#46): la web y la aplicación pintan en su dominio      |
> | **Las bases** (esta)    | **Pull request abierto**: `m7-las-bases`. Al fusionarlo se publica solo |
> | La base de datos        | Le falta la **`0034`**, que añade tres columnas y el valor `venta`      |
> | La API                  | Hay que **volver a desplegarla**: lleva el `apuntar_salida` nuevo       |

## Los tres pasos de esta entrega

### 1 · Fusionar el pull request de las bases

**Dónde:** GitHub → **Pull requests** → «M7 · las bases» → espera las tres
comprobaciones en verde —`Calidad`, `Construccion y presupuestos` y
`Migraciones reversibles`— → **Merge pull request** → **Confirm merge**.

Al fusionar, la publicación se lanza sola y tarda un minuto.

**Si alguna comprobación sale en rojo:** no fusiones; mándame una foto de la que
falla.

### 2 · Aplicar la migración

No crea ninguna tabla: añade a cada producto **a cuánto lo vendes**, al libro de
movimientos **lo que se cobró**, y un tipo de movimiento nuevo, `venta`.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** la línea `0034_lo_que_sale_dice_si_se_vendio`, y que la
base está al día.

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **34 de 34** migraciones y **51 tablas**, todas con
seguridad por filas.

**Si sale un error:** no sigas; cópiame el texto rojo tal cual.

### 3 · Volver a desplegar la API

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. En verde en dos o tres minutos.

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas que tiene el código» y «y
conoce todos los comandos».

---

## Lo que trae esta entrega, y qué mirar

### 1 · Sacar género ya no dice «gastado o vendido»

**Dónde:** Inventario → Productos → el **−** rojo de cualquier fila.

Ahora el porqué va en tres grupos, y cada uno dice lo que significa:

- **Se ha vendido** · ha entrado dinero; se cuenta en la caja del día.
- **Se ha usado** · gastado en cocina, o a otro local. No entra dinero.
- **No se ha aprovechado** · caducado, malo, roto, del personal, invitación… Eso
  es merma, con su partida.

**Qué tiene que salir:** al pulsar **Vendido a un cliente** aparece «Cuánto has
cobrado», y debajo: «Esto se cuenta en la caja del día». Al guardar: «7,50 €
apuntados: salen propuestos al cerrar la caja de hoy».

> **Por qué no se suma a las ganancias ahí mismo.** Porque el dinero de un día se
> cuenta en un solo sitio, que es el cierre de caja. Si se sumara en los dos, el
> día que además metes el Z **el día valdría el doble** y no habría forma de
> verlo: el total del mes saldría mal y todo lo demás parecería correcto. Así que
> lo que cobras queda apuntado y, al cerrar la caja, te sale propuesto con su
> nombre y su importe. Lo añades de un toque, o no, si ese total ya viene del TPV.

### 2 · La caja lo propone

**Dónde:** Servicio → Jornada → **Cierre**, el mismo día en que hayas apuntado una
venta.

**Qué tiene que salir:** encima de las líneas, «Se ha vendido esto desde Inventario
hoy», con lo vendido y su importe, y un botón **Añadirlas a la lista**.

### 3 · A cuánto lo vendes, y lo que te deja

**Dónde:** Inventario → Productos → abre un producto que vendas tal cual —un
botellín, una copa— → **Poner precio de venta**.

Pon lo que cobras, **con IVA**, tal cual está en la pizarra.

**Qué tiene que salir:** debajo, «con el 10 % dentro, te entran 2,27 €». Y al
guardar, la tarjeta **Lo que deja**: lo que entra, lo que cuesta, lo que queda y
qué parte se va en género. Si el género se lleva más de un tercio, lo dice; si
vendes por debajo de lo que te cuesta, sale en rojo.

> Esto **no es la carta**. Es para lo que se vende sin cocinar. El margen de un
> plato sale de su escandallo, que es el módulo 9.

### 4 · El «sin verificar» naranja

Ya no está en la lista, y no es que se haya escondido: **era un fallo**. El
servidor volvía a marcar el producto cada vez que se guardaba su ficha, así que
salía en todos y no había forma de quitarlo.

**Dónde está ahora:** en la ficha del producto, abajo, en **La ficha**.

**Qué tiene que salir:** «Se aprovecha · 100 % · supuesto, sin medir», con un botón
**Lo he medido**. Ahí se pesa lo que entra y lo que queda limpio, y Estook hace la
cuenta y te dice cuánto sube o baja el coste **antes** de guardar.

### 5 · La ficha del producto, de otra manera

**Qué tiene que salir:** arriba, la categoría, el proveedor y el envase en
pastillas; cada bloque en su tarjeta, con su botón a la derecha; y, si tienes
mínimo puesto, una barra que dice de un vistazo si llegas.

### 6 · Las listas largas

**Dónde:** Inventario → **Movimientos**.

**Qué tiene que salir:** arriba, «Hasta dónde miro», empezando por **los últimos
tres meses**; el buscador encuentra cosas que no están en pantalla —porque ahora
pregunta al servidor—; y abajo, **Ver más**, con cuántas llevas.

Lo mismo en **Mermas**.

### 7 · Deshacer

**Dónde:** en la ficha de un producto, cambia el precio, o el precio de venta, o
corrige la ficha.

**Qué tiene que salir:** abajo, la barra oscura con **Deshacer** y una cuenta atrás
de diez segundos. Pulsándola, vuelve lo de antes.

**Lo que no lleva deshacer, y no es un olvido:** apuntar género. El libro de
movimientos solo se añade —es lo que hace que la cámara se pueda auditar— y un
movimiento equivocado se corrige con otro, que es «¿No cuadra lo que hay?».

> **Lo que salga raro, apúntalo tal cual**, con una foto si puedes.

---

## Las cuatro claves que faltan

Ninguna frena lo que hay hecho. Cada una la estrena su entrega, y hasta entonces el
sitio está hecho y apagado con su motivo.

| Clave                | Para qué                                    | Cuándo hace falta                 |
| -------------------- | ------------------------------------------- | --------------------------------- |
| **Places**           | Situar el local y buscarlo por su dirección | Entrega 5                         |
| **Business Profile** | Leer tu ficha de Google y sus reseñas       | Entrega 5, con el acceso aprobado |
| **Resend**           | Los avisos por correo                       | Entrega 2                         |
| **La de IA**         | Que Fogón hable                             | M22                               |

Los pasos de las dos de Google, con sus topes, están abajo en el **paso 6**.

---

## Lo de antes, que ya está hecho

### `estook.com` · **hecho** (#46)

Se fusionó y se desplegó la API. La web y la aplicación pintan en su dominio.

### La entrega 1 del repaso · **hecha** (#45)

- **Quitar un lote** que caduca o ha caducado, en «Caduca esta semana» y en la ficha:
  se ha gastado, o se ha tirado (y entonces es merma por caducado).
- **Congelado**, con su fecha: al dar de alta, en cada lote, «Congelar una parte», su
  etiqueta en todas partes y la vista **Productos · Congelados**.
- **Dos decimales**: «1,75 €», «0,64 €/l». Nunca más «1,7500 €».
- **El alta, rehecha**: ¿cómo lo compras? Por peso, por litros o por unidades, y la
  cuenta sale sola: «Caja de 6 tarros de 250 g · la caja sale a 21,00 € · 14,00 € el kg».
- **El IVA, bien puesto**: se guarda sin IVA, tú eliges cómo lo escribes, y a los
  precios que ya tienes se les quita una vez.
- **Los precios de antes en una gráfica**, proveedor a proveedor, y cuál es el más barato.
- **Los widgets**: al dar a Añadir salen todos, los puestos dicen «En tu panel», y
  el panel de siempre se recupera de un toque.
- **El salario** ya no falla al cambiarlo dos veces el mismo día.
- **Nadie echa a su igual**: a un gerente lo gestiona quien está por encima.

## Cómo se escriben los comandos aquí

**El lanzador es `.\estook.cmd`**, y PowerShell **no entiende `&&`**: cada comando
va en su recuadro, de uno en uno. Se abre PowerShell en la carpeta del proyecto.

---

## Paso 4 · Quitarles el IVA a tus precios, una vez

Me dijiste que tus precios llevan IVA. Estook los guarda sin él —el IVA de compra lo
recuperas, así que lo que te cuesta de verdad es sin él—, así que hay que
quitárselo **una sola vez** a los que ya tienes. Hazlo **antes** de meter precios
nuevos.

1. Apunta el precio de un producto que conozcas, por ejemplo uno de 11,00 €.
2. **Ajustes** → tarjeta **«Tus precios de compra»**.
3. Enciende **«Escribo los precios con IVA»**. Desde ahora, cada campo de precio
   empieza en «Con IVA» y te enseña debajo lo que se guarda sin él.
4. Pulsa **«Quitar el IVA a los que ya tengo»** → lee el aviso → **«Sí, quitárselo»**.

**Qué tiene que salir:** «Hecho: N precios quedan sin IVA». Y el producto del paso 1,
en 10,00 € (si es alimento, al 10 %) o en 9,09 € (si va al 21 %). En su ficha, debajo
del precio: «Sin IVA. Con IVA (10 %), 11,00 €». Y en la tarjeta, la fecha en que se
hizo: el botón ya no sale, porque no se puede hacer dos veces.

**Si un producto no es del 10 %** —el pan o la leche van al 4 %—: ábrelo → **Corregir
la ficha** → **IVA al comprarlo**. Mejor antes del paso 4, para que se le quite el suyo.

---

## Paso 5 · Mirarlo en el TPV y en el móvil

1. **Un producto como el queso azul**: Inventario → Productos → **Añadir producto** →
   **Crearlo a mano** → **Por unidades** → cómo viene cada una: **Tarro** → qué trae:
   **250 g** → cuántas en cada caja: **6** → **De cada tarro** → **3,50**.
   **Qué tiene que salir:** «Caja de 6 tarros de 250 g · 1,5 kg en total» y «La caja
   sale a 21,00 € · 14,00 € el kg». Al guardar, en su ficha, «Envase: Caja de 6
   tarros de 250 g».
2. **Fruta**: lo mismo con **Por peso** y el precio del kg. **Leche o aceite**: **Por
   litros**, y si viene en garrafa, enciende «Viene en garrafas…» y pon cuánto trae.
3. **Dos decimales**: en la lista de productos, ninguna cifra con cuatro decimales.
4. **Quitar un lote**: Inventario → **Hoy** → «Caduca esta semana» → **Quitar** en
   uno → **Se ha tirado** → cuánto → **Quitarlo**.
   **Qué tiene que salir:** «Quitado. Lo tirado de… queda apuntado como merma por
   caducado», el lote fuera de la lista, y la merma en «Merma de hoy».
5. **Congelar**: abre un producto con género → «Lotes y caducidades» → **Congelar
   una parte** → **Congelarlo**.
   **Qué tiene que salir:** «congelado el …» en el lote, la etiqueta «congelado» en
   la lista, y el producto en **Productos · Congelados**.
6. **La gráfica**: en un producto con dos precios o más (cambia el precio una vez si
   hace falta), la gráfica de lo que ha costado, en €/kg.
7. **El Panel**: **Editar** → **Añadir**. **Qué tiene que salir:** todos los widgets
   por grupos; «Valor de la cámara», «Acciones rápidas», «Bajo mínimo» y
   «Caducidades» con **«En tu panel»**. Quita uno desde ahí y vuelve a ponerlo.
   Abajo, «Recuperar el panel de siempre».
8. **El salario**: Equipo → una persona → cambia su salario **dos veces seguidas**.
   **Qué tiene que salir:** las dos veces, guardado. Ni un «se nos ha roto algo».
9. **Nadie echa a su igual**: si tienes dos gerentes, entra como uno y ve a Equipo →
   Accesos. **Qué tiene que salir:** en el otro gerente, «Lo lleva quien está por
   encima», sin botón de retirar.

> **Lo que salga raro, apúntalo tal cual**, con una foto si puedes.

---

## Paso 6 · Lo de Google, con los topes que pusiste

Para **la quinta entrega**. Tus números están bien pensados, con dos correcciones
que te debo decir antes:

- **Un presupuesto de Google Cloud avisa, pero no corta.** «Presupuestos y alertas»
  manda un correo al llegar a la cifra y **sigue cobrando**. Lo que corta de verdad
  son **las cuotas de cada API** —un máximo de peticiones al día— y, por encima,
  **nuestro propio contador por local** en la API de Estook, que es donde irán tus
  topes: 40 de Places y 1.800 de Gemini al mes por local.
- **Gemini 1.5 Flash ya no se puede contratar**: Google lo retiró. Se usa el Flash
  que esté vigente al conectarlo, con el mismo tope de 1.800 al mes; cuesta del orden
  de lo que calculaste.

### A · La clave de Places, con su corte

1. **console.cloud.google.com** → **Seleccionar un proyecto** → **Proyecto nuevo** →
   `Estook` → **Crear**.
2. ☰ → **Facturación** → **Vincular una cuenta de facturación**.
3. ☰ → **APIs y servicios** → **Biblioteca** → **«Places API (New)»** → **Habilitar**.
4. **Credenciales** → **Crear credenciales** → **Clave de API** → **Editar la clave**
   → **Restricciones de API** → solo **Places API (New)** → **Guardar**.
5. **El corte**: **APIs y servicios** → **Places API (New)** → **Cuotas** → las
   peticiones por día → **Editar** → **50**. Con cuarenta al mes por local, cincuenta
   al día solo se alcanzan si algo va mal, y ahí para.
6. **El aviso**: **Facturación** → **Presupuestos y alertas** → **Crear presupuesto**
   de **8 € al mes**, con avisos al 50 %, al 90 % y al 100 %.
7. **No me pegues la clave en el chat.** Guárdala tú; te digo dónde ponerla.

### B · El acceso a Google Business Profile

1. Con **la cuenta de Google que gestiona la ficha del local**.
2. En el proyecto `Estook`, apunta su **número de proyecto**.
3. Busca «**Google Business Profile APIs** solicitar acceso» y rellena el formulario:
   el negocio, su web, el número de proyecto, y para qué: «leer las reseñas y la
   ficha de mi propio local desde mi aplicación de gestión». No tiene coste.
4. Google contesta por correo. **Cuando te lo aprueben, avísame.**

---

## Lo que me confirmaste, y dónde queda

1. **El IVA**: tus precios lo llevan, y querías elegir. Hecho en la entrega 1
   ([0033](decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)); el paso 4 lo
   deja bien.
2. **Mandar pedidos**, de jefe de cocina para arriba, y **«te han invitado a hacer
   este pedido»** para que otro lo rellene y el jefe lo mande: **entrega 2**.
3. **El pedido no sale solo**: se queda como está, WhatsApp o correo con el pedido
   escrito.
4. **El precio nuevo vale desde hoy**, y los de antes se comparan: la gráfica de esta
   entrega.

## Lo que viene

| Entrega | Qué                                                                                                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **2**   | Avisos a jefes y gerentes de lo que hace su equipo —un borrador, la carta, un pedido—, **una vez**; e invitar a rellenar un pedido      |
| **3**   | **Horarios**, una app entera en Equipo: cuadrante semanal, por persona, historial, horas oficiales, avisos al cambiar y PDF con tu logo |
| **5**   | Los topes de Google por local y, con tus accesos, el local en Google y sus reseñas                                                      |

La **4**, el dominio, ya está hecha: `estook.com` funciona desde el 12 de septiembre.
