# Pasos para cerrar M7 · el Panel vivo y el local en Google

> ## Cómo está
>
> | Qué                                        | Cómo está                                                                      |
> | ------------------------------------------ | ------------------------------------------------------------------------------ |
> | El repaso, las bases y las apps conectadas | **Fusionados** (#45, #47 y #48)                                                |
> | `estook.com`                               | **Funcionando** (#46)                                                          |
> | **El Panel vivo**                          | **Fusionado** en `main` (#49). Sin migración                                   |
> | **El local en Google**                     | **No llegó a `main`**: la #50 se fusionó en la rama del Panel. Lo lleva la #51 |
> | La base de datos                           | 35 de 35, comprobado el 16 de septiembre. **Le falta la `0036`** (Google)      |
> | La API                                     | Al día con la #48. Le falta lo del Panel vivo y lo de Google                   |

## Los pasos, en este orden

### 1 · Fusionar la #51 · el local en Google, esta vez a `main`

**Qué pasó:** la #50 tenía como base la rama del Panel vivo. Estos pasos decían que,
al fusionar la #49, GitHub la cambiaría a `main` sola, **y no lo hizo**: eso solo pasa
si se borra la rama de abajo. Así que la #50 se fusionó en la rama del Panel y a
`main` no llegó nada. **El código es el mismo que ya miraste**; la #51 solo lo lleva a
su sitio.

**Dónde:** GitHub → **Pull requests** → «M7 · el local en Google, a main» → espera
las tres comprobaciones en verde —`Calidad`, `Construccion y presupuestos` y
`Migraciones reversibles`— → **Merge pull request** → **Confirm merge**.

**Si alguna sale en rojo:** no fusiones; mándame una foto de la que falla.

### 2 · Comprobar que esta vez sí está en `main`

**Dónde:** GitHub → la pestaña **Code** (con `main` elegida arriba a la izquierda) →
carpeta `docs` → carpeta `decisiones`.

**Qué tiene que salir:** el fichero `0040-el-local-se-busca-en-google-con-tope.md`.
Si no está, para y dímelo.

### 3 · Aplicar la migración

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** la línea `0036_el_local_en_google`.

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que decir:** **36 de 36** migraciones y **52 tablas** (la nueva es
`uso_de_google`, el contador del tope).

### 4 · Volver a desplegar la API

**Dónde:** GitHub → **Actions** → **Desplegar la API** → **Run workflow** →
escribe `desplegar` → **Run workflow**. Cuando termine:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «y conoce todas las consultas» y «y conoce todos los
comandos». Si dice «FALTA DESPLEGARLA», el despliegue no ha terminado: vuelve a
lanzarlo.

### 5 · La clave de Google · **cuando la tengas**

Sin ella no se rompe nada: Ajustes dice «Google todavía no está conectado». Los
pasos para sacarla están abajo, en el **paso 6 · A**, y ponerla es:

**Dónde:** **supabase.com/dashboard** → tu proyecto → **Edge Functions** →
**Secrets** (en algunas versiones: **Project Settings → Edge Functions**) →
**Add new secret** → nombre **`GOOGLE_MAPS_KEY`**, valor, la clave → **Save**.

**Qué tiene que salir:** en Estook, **Ajustes → Tu local en Google** deja de decir
«Apagado» y sale **«Buscar mi local en Google»**. No hace falta desplegar otra vez.

---

## Lo que trae, y qué mirar

### 1 · Editar el Panel como en el móvil

**Dónde:** el Panel.

- **Mantén pulsado** cualquier widget medio segundo. **Qué tiene que salir:** el
  Panel entra en edición —«Arrastra para ordenar» arriba— y los widgets **tiemblan**.
  En un móvil Android notarás un toque de vibración; el iPhone no deja a las webs
  vibrar, así que ahí solo tiembla.
- **Arrastra** uno desde cualquier parte hasta otro sitio. **Qué tiene que salir:**
  los demás **se apartan deslizándose** mientras lo llevas, y donde estaba queda un
  hueco. Suelta y se queda ahí.
- En el móvil, **deja el dedo quieto un instante** antes de arrastrar; si lo mueves
  rápido, hace scroll. Es a propósito: si no, cada vez que bajaras por el Panel
  cogerías un widget.
- El **«−»** de la esquina lo quita (con **Deshacer** abajo), y **Pequeño · Ancho ·
  Grande** le cambia el tamaño. Las flechas ← → de antes ya no están.
- **Listo** (o `Esc`) para salir. El botón **Editar** sigue ahí.

### 2 · Lo vacío se aparta

**Qué tiene que salir:** si no caduca nada, no hay nada bajo mínimo o no llega
ningún pedido, **esos widgets no ocupan sitio**. Debajo del Panel sale una línea:
«Sin nada ahora en Caducidades y Bajo mínimo. Vuelven en cuanto haya algo.»

- En cuanto haya algo que decir, **vuelven solos** a su sitio.
- Al **editar** se ven todos, con «Vacío ahora», para poder colocarlos.
- Y ya no quedan **huecos** en la rejilla: si detrás de uno pequeño va uno ancho que
  no cabe, el siguiente pequeño rellena el hueco.

### 3 · Tus cifras, con su gráfica y su flecha

**Dónde:** **Editar** → **Añadir** → arriba, **«Tus cifras, con su gráfica»**.

1. Elige **qué quieres seguir**: Ventas, Ticket medio, Food cost, Merma, Compras o
   Mis horas. Solo salen las que tu acceso puede ver: un cocinero ve «Mis horas».
2. Elige **7 días** o **30 días**.
3. **Añadir al panel**.

**Qué tiene que salir:** una tarjeta «Ventas · 7 días» con la cifra grande, una
píldora **▲ 12 %** o **▼ 8 %** frente a los 7 días anteriores, y **la línea de los
días** debajo, que se dibuja al abrir.

- **El color dice si es buena noticia**, no hacia dónde va: que la merma **baje** sale
  en verde; que las ventas bajen, en rojo. Compras y horas no tienen color.
- **El food cost cambia en puntos** («▲ 3 pt»): del 30 % al 33 % son tres puntos.
- **Un día sin caja cerrada corta la línea**: no vendiste cero, es que no se sabe.
- Si no hay nada con qué comparar —la primera semana—, **no hay flecha**.
- El food cost de la tarjeta **es el mismo que el de Servicio**: salen de la misma
  cuenta.
- Puedes poner la misma cifra de 7 y de 30 días; la misma dos veces, no.

### 4 · Ventas de hoy y la pantalla grande

- **Ventas de hoy**, con la caja cerrada, lleva su flecha **frente al mismo día de
  la semana pasada**: un martes se compara con un martes.
- **En un monitor grande** el Panel pasa a **seis columnas**.

### 5 · Tu local en Google

**Dónde:** **Ajustes → Tu local en Google**. Hasta que pongas la clave, dice
«Apagado» y no hay más que mirar. Con la clave:

1. **Buscar mi local en Google** → escribe «ikatz» y la ciudad. Salen hasta cinco
   sitios.
2. Toca el tuyo. Si ya marcaste la ubicación desde el local, **«Medir los fichajes
   desde su ubicación de Google» sale apagado**: la de a mano suele ser más exacta.
3. **Es este**.

**Qué tiene que salir:** el nombre, la dirección, **★ la valoración y sus reseñas**,
el teléfono, «Su web», «Verlo en Google Maps», el horario plegado, y debajo **«Este
mes: 1 de 40 fichas y N de 400 búsquedas»**. Si has escrito tu dirección o tu
teléfono en el alta, **no se tocan**.

**Traerlo otra vez de Google** solo pide la ficha una vez cada 24 horas: la segunda
vez te dice que ya se trajo.

> **Lo que salga raro, apúntalo tal cual**, con una foto si puedes.

---

## Lo que sigue pendiente, y es tuyo

Las claves y accesos. **Ninguno frena lo que hay hecho**, y todos se ponen en
**Supabase → Edge Functions → Secrets**, nunca en el chat ni en el código. El detalle
de cada uno, en [`config/claves.md`](../config/claves.md).

| Qué                  | Nombre del secreto                           | Para qué                                 | Cómo está en el código            |
| -------------------- | -------------------------------------------- | ---------------------------------------- | --------------------------------- |
| **Places**           | `GOOGLE_MAPS_KEY`                            | Buscar el local, su ficha y su ubicación | **Hecho**: se enciende al ponerla |
| **Business Profile** | No es una clave: **acceso aprobado + OAuth** | Todas las reseñas, y responderlas        | Espera a que Google lo apruebe    |
| **Resend**           | `RESEND_API_KEY` + dominio verificado        | Los avisos por correo                    | Entrega 2                         |
| **IA**               | `AI_API_KEY` y los dos modelos               | Que Fogón hable                          | M22, eligiendo modelo y tope      |

Los pasos de las dos de Google, con sus topes, están abajo en el **paso 6**; poner la de
Places, arriba en **«5 · La clave de Google»**.

---

## Lo de antes, que ya está hecho

### `estook.com` · **hecho** (#46)

Se fusionó y se desplegó la API. La web y la aplicación pintan en su dominio.

### Las apps conectadas · **hechas** (#48)

La `0035` está aplicada y la API desplegada. El precio de venta se fue a la carta,
cada producto es de **cocina, sala o limpieza**, congelar pregunta **cuánto**, y
llegó el **recuento** («esto es lo que hay»). **Lo que tienes que repasar tú**, si no
está hecho: los productos de **limpieza**, a mano (Inventario → Productos → abre uno
→ **Corregir la ficha** → **De dónde es**).

Y una aclaración sobre las zonas: cada uno **trabaja** con la suya —la lista de
Inventario de un cocinero no trae la barra, y no puede cambiar su ficha—, pero
**leer se lee todo el local**, porque la merma la apunta quien la rompe: una camarera
tiene que poder apuntar la nata que se le ha caído.

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
   → **Restricciones de API** → solo **Places API (New)** → **Guardar**. En
   «Restricciones de aplicación» deja **Ninguna**: la usa el servidor de Supabase, no
   una web, y no tiene una IP fija.
5. **El corte**: **APIs y servicios** → **Places API (New)** → **Cuotas** → las
   peticiones **de autocompletar** por día → **Editar** → **300**, y las de **detalles
   del sitio** (Place Details) por día → **50**. Buscar un local son unas cinco
   peticiones de autocompletar —una por pausa al escribir— y una de detalles, así
   que con esto sobra para buscarlo varias veces al día y corta si algo va mal.
   Estook además lleva **su propio tope por local**: 40 fichas y 400 búsquedas al mes.
6. **El aviso**: **Facturación** → **Presupuestos y alertas** → **Crear presupuesto**
   de **8 € al mes**, con avisos al 50 %, al 90 % y al 100 %.
7. **No me pegues la clave en el chat.** Ponla tú directamente en Supabase: arriba,
   en **«5 · La clave de Google»**.

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

**Antes de M8 van tus veinte mejoras y el panel de administración**, en diez entregas.
El orden y el porqué de cada una están en
[`mejoras-antes-de-m8.md`](mejoras-antes-de-m8.md), y el admin entero en
[`panel-de-administracion.md`](panel-de-administracion.md). Las dos entregas que
quedaban de este repaso van dentro de ese orden:

| Entrega | Qué                                                                                                                                     | Dónde queda                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **2**   | Avisos a jefes y gerentes de lo que hace su equipo —un borrador, la carta, un pedido—, **una vez**; e invitar a rellenar un pedido      | Con **el reloj y los avisos** (R)      |
| **3**   | **Horarios**, una app entera en Equipo: cuadrante semanal, por persona, historial, horas oficiales, avisos al cambiar y PDF con tu logo | **Horarios** (H), con el coste en vivo |

La **4** (el dominio) y la **5** (Places con su tope) ya están hechas; lo de Business
Profile espera a que Google lo apruebe.
