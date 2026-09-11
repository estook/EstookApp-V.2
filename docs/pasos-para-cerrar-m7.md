# Pasos para cerrar M7 · el repaso de lo que viste

> ## Cómo está
>
> | Qué                      | Cómo está                                                               |
> | ------------------------ | ----------------------------------------------------------------------- |
> | La primera entrega (#44) | **Fusionada**, y mirada por ti en el móvil y en el TPV                  |
> | Este repaso              | **Pull request abierto**: `m7-lo-que-vio-richi`                         |
> | Migración                | **Una nueva sin aplicar**: `0033_lotes_congelados_y_precios_con_iva`    |
> | La API                   | **Sin desplegar**: la publicada no conoce las cuatro operaciones nuevas |
> | Lo que queda de tu lista | **Cuatro entregas más**, al final de este documento                     |

Tus once puntos van en **cinco entregas pequeñas**, cada una con su pull request, para
que ninguna se quede a medias. Esta es la primera: Inventario, el Panel y los fallos.

## Qué trae, una línea cada cosa

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

## Paso 1 · Fusionar el pull request

**Dónde:** GitHub → **Pull requests** → «M7 · lo que vio Richi…» → abajo del todo.

Espera a las tres comprobaciones en verde —`Calidad`, `Construccion y
presupuestos` y `Migraciones reversibles`— y entonces **Merge pull request** →
**Confirm merge**.

**Qué sale si va bien:** el pull request en morado, con **Merged**.

**Si alguna sale en rojo:** no fusiones; mándame una foto de la que falla.

---

## Paso 2 · Aplicar la migración

No crea tablas: añade columnas —lo congelado y lo retirado de cada lote, el IVA de
compra de cada producto y cómo escribe los precios el local—.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** la línea `0033_lotes_congelados_y_precios_con_iva`, y que la
base está al día. (Si también salen la `0031` y la `0032`, es que no se aplicaron con
la primera entrega: está bien, van en orden.)

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **33 de 33** migraciones y **51 tablas**, todas con
seguridad por filas.

**Si sale un error:** no sigas; cópiame el texto rojo tal cual.

---

## Paso 3 · Desplegar la API

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** → escribe
`desplegar` → **Run workflow**. En verde en dos o tres minutos.

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas que tiene el código» y «y
conoce todos los comandos». **Si dice «FALTA DESPLEGARLA»** con nombres como
`quitar_lote` o `congelar`, el paso de arriba no ha terminado bien: vuelve a
lanzarlo y dímelo si se repite.

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

1. **El IVA**: tus precios lo llevan, y querías elegir. Hecho en esta entrega
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
| **4**   | El dominio **`estook.com`**: el código, los documentos y los pasos de DNS                                                               |
| **5**   | Los topes de Google por local y, con tus accesos, el local en Google y sus reseñas                                                      |
