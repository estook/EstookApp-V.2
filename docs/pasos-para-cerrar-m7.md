# Pasos para cerrar M7 · las apps conectadas

> ## Cómo está
>
> | Qué                            | Cómo está                                                                  |
> | ------------------------------ | -------------------------------------------------------------------------- |
> | El repaso y las bases          | **Fusionados** (#45 y #47)                                                 |
> | `estook.com`                   | **Funcionando** (#46)                                                      |
> | **Las apps conectadas** (esta) | **Pull request abierto**: `m7-conectar-las-apps`                           |
> | La base de datos               | Le falta la **`0035`**: quita el precio de venta y pone la zona del género |
> | La API                         | Hay que **volver a desplegarla**: el recuento es nuevo                     |

## Los tres pasos, y uno más que es tuyo

### 1 · Fusionar el pull request

**Dónde:** GitHub → **Pull requests** → «M7 · las apps conectadas» → espera las
tres comprobaciones en verde —`Calidad`, `Construccion y presupuestos` y
`Migraciones reversibles`— → **Merge pull request** → **Confirm merge**.

**Si alguna sale en rojo:** no fusiones; mándame una foto de la que falla.

### 2 · Aplicar la migración

Quita el precio de venta del producto, le pone a cada uno **de dónde es**, deja que
un lote diga cuánto lleva, y cambia quién ve qué.

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** la línea `0035_el_precio_vive_en_la_carta_y_el_genero_tiene_zona`.

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **35 de 35** migraciones y **51 tablas**.

> **Lo que se pierde, y te lo digo yo antes de que lo veas:** si estos días le
> pusiste precio de venta a algún producto, esa cifra desaparece. Es la que estaba
> en el sitio equivocado. No se pierde nada de lo que mueve género.

### 3 · Volver a desplegar la API

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** →
escribe `desplegar` → **Run workflow**.

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los
comandos». Si dice «FALTA DESPLEGARLA» con `cerrar_recuento`, el paso no ha
terminado: vuelve a lanzarlo.

### 4 · Repasar de dónde es tu género · **este es tuyo**

La migración no deja tus nueve productos en un montón: los reparte con lo que ya
sabe. **Las bebidas van a sala** —cerveza, refrescos, alcohol, por su categoría
fiscal— y **lo demás se queda en cocina**, que es de donde venía.

Lo que hay que repasar a mano es **lo de limpieza**, que no hay forma de adivinar.

**Dónde:** Inventario → Productos → abre el producto → **Corregir la ficha** →
**De dónde es**.

---

## Lo que trae, y qué mirar

### 1 · El «a cuánto lo vendes» se ha ido de la ficha

Tenías razón y era el modelo, no la pantalla. Un kilo de queso no tiene precio de
venta: lo tiene **el plato** que lo lleva.

```
lo que cuesta   ←  Inventario · el precio de compra, sin IVA
cuánto lleva    ←  el escandallo (M9)
a cuánto sale   ←  la carta (M10)
lo que entró    ←  el cierre de caja, o el TPV (M20)
```

**Qué tiene que salir:** en la ficha de un producto **ya no hay** «Lo que deja» ni
«Poner precio de venta». Y al sacar género y decir «Vendido a un cliente», tampoco
se pregunta cuánto has cobrado: se apunta que se vendió, y el importe sale de la
caja cuando la cierres.

**Lo que se queda**, que era lo bueno: sigue distinguiendo **vendido**, **gastado
en cocina** y **no aprovechado**.

### 2 · De dónde es cada producto

**Dónde:** Inventario → Productos. Al lado del buscador, **«De dónde»**: Todo ·
Cocina · Sala · Limpieza, con cuántos hay en cada una.

**Qué tiene que salir:**

- Al elegir **Sala**, la lista trae solo lo de la barra, y **la categoría cuenta
  dentro de sala**: ya no sale «Carnes (14)» para luego no enseñar ninguna.
- Al elegir **Limpieza**, el desplegable de categoría **desaparece**. No se apaga:
  no está. Son quince cosas y no llevan árbol.
- Al **añadir un producto**, lo pregunta con tres botones grandes.

**Y lo que no se ve, que es la mitad:** un cocinero **no recibe** los productos de
sala. No se le esconden en la pantalla: la base no se los da. Un camarero, al
revés. Los dos ven lo de limpieza, porque los dos limpian. De jefe de cocina y
jefe de sala para arriba, todo.

### 3 · Congelar una parte

**Dónde:** la ficha de un producto → **Congelar una parte**.

**Qué tiene que salir:** lo primero que te pregunta es **cuánto**, con lo que hay
delante: «De 43 kg que hay». Y si escribes más de lo que hay, te lo dice y no te
deja.

Después, en la lista y en la ficha, sale **«10 kg congelados»** en vez de
«congelado» a secas sobre los 43. Eso era lo que estaba mal.

### 4 · El recuento · «esto es lo que hay»

**Dónde:** Inventario → Productos → **Hacer recuento**. (También en Movimientos →
Recuento.)

Se elige qué estás contando —cocina, sala o limpieza—, se escribe lo contado y
cada producto pasa a valer eso. **No suma: cambia.**

**Qué tiene que salir:**

- Las casillas salen **en blanco**, y debajo, en pequeño, «El libro dice 43 kg».
  No se rellenan con lo que había a propósito: una cifra puesta de antemano se
  confirma sin mirar, y entonces el recuento no cuenta nada.
- Al escribir, la diferencia sale al momento: **−5 kg** en rojo.
- Al cerrar: cuántos has corregido, cuántos ya cuadraban, y **«Lo que más
  bailaba»**, que es lo que se viene a mirar.
- **Lo que no cuentes no se toca.** Si quieres vaciarlo, hay que decirlo, y antes
  te dice cuántos productos se van a poner a cero.

**Y si lo tienes en un fichero:** dos columnas —el producto y cuánto hay— y se
sube. Lo que no encaje con ningún producto te lo dice con su número de fila. La
foto sigue apagada con su motivo: leerla es Fogón, y es el módulo 22.

### 5 · El Panel

- **«Hola, Ricardo» se abre.** Dentro: lo que llevas fichado hoy, lo de la semana,
  qué hay que atender y qué caduca.
- **Las cifras grandes ya no se cortan**: eligen su tamaño según lo que ocupan.
- **En el ordenador se estira**: en un monitor grande deja de estar en una columna
  en el medio.
- **«Tu género»** enseña una barra con cocina, sala y limpieza.

> **Lo que salga raro, apúntalo tal cual**, con una foto si puedes.

---

## Lo que sigue pendiente, y es tuyo

Las cuatro claves. **Ninguna frena lo que hay hecho:**

| Clave                | Para qué                                    | Cuándo hace falta                 |
| -------------------- | ------------------------------------------- | --------------------------------- |
| **Places**           | Situar el local y buscarlo por su dirección | Entrega 5                         |
| **Business Profile** | Tu ficha de Google y sus reseñas            | Entrega 5, con el acceso aprobado |
| **Resend**           | Los avisos por correo                       | Entrega 2                         |
| **La de IA**         | Que Fogón hable                             | M22                               |

Los pasos de las dos de Google, con sus topes, están abajo en el **paso 6**.

---

## Lo de antes, que ya está hecho

### `estook.com` · **hecho** (#46)

Se fusionó y se desplegó la API. La web y la aplicación pintan en su dominio.

### Las bases · **hechas** (#47)

Vender dejó de ser lo mismo que gastar, la ficha se lee, el libro y las mermas van
por tramos de tiempo, y volvió el deshacer. De ahí salió lo de esta entrega: el
precio de venta estaba en el sitio equivocado, y lo dijiste en cuanto lo viste.

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
