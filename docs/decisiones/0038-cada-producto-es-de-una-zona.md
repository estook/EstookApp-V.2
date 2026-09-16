# 0038 · Cada producto es de una zona, y cada uno trabaja con la suya

**Fecha:** 16 de septiembre de 2026
**Estado:** decidido y construido en M7 (migración `0035`)

## Lo que dijo Richi

> «Añade un filtro en Inventario de sala, cocina y limpieza, con un botón al lado
> del de categoría. Ahora la categoría es del total de productos que hay, pero
> vamos a cambiar esto: que cocina y sala tengan categorías personalizadas, pero
> limpieza no. Al crear un producto hay que poner si es de sala, cocina o
> limpieza. Así todo se organiza mejor: **cocineros ven cocina y limpieza,
> camareros ven sala y limpieza, y jefes ven todo.**»

## El agujero

Inventario era **un solo montón**. Un cocinero buscando harina pasaba por las
servilletas y el lavavajillas; el desplegable de categorías mezclaba «Carnes» con
«Productos de limpieza»; y el camarero que iba a apuntar una botella rota se
encontraba la cámara entera.

Un bar tiene tres almacenes distintos, los lleva gente distinta y se cuentan en
días distintos. Enseñarlos juntos es pedirle a cada uno que ignore dos tercios de
lo que ve, todos los días.

## Lo que se decide

### Uno · Tres zonas, catálogo cerrado

`estook.zona_del_producto`: `cocina`, `sala`, `limpieza`. Se elige al dar de alta
—con los tres delante, no en un desplegable— y se cambia en la ficha.

| Zona         | Qué entra                                             | ¿Categorías? |
| ------------ | ----------------------------------------------------- | ------------ |
| **cocina**   | Lo que se cocina: la cámara y el almacén              | Sí           |
| **sala**     | Lo que se sirve tal cual: botellas, café, servilletas | Sí           |
| **limpieza** | Lo que no se come: productos, papel, bolsas           | **No**       |

Limpieza no lleva categorías **a propósito**: son quince cosas, y montarles un
árbol encima es trabajo de configuración para no encontrar nada mejor. Y cuando
una zona no las lleva, el desplegable de categoría no se apaga: **no está**
(Auditoría, parte 3). Un control apagado obliga a mirarlo para descubrir que no
sirve.

### Dos · La categoría es el índice de la zona, no del almacén entero

Las categorías se cuentan **dentro de la zona que se está mirando**. Antes
contaban sobre el local entero, así que en «Sala» salía «Carnes (14)» y al
elegirla no había ninguna. Una categoría que promete catorce y enseña cero es peor
que no ofrecerla.

Y al cambiar de zona, la categoría que hubiera puesta **se suelta**: «Carnes» no
significa nada en la barra.

### Tres · La zona decide con qué trabaja cada uno

| Rol                           | Ve               |
| ----------------------------- | ---------------- |
| cocinero                      | cocina, limpieza |
| camarero                      | sala, limpieza   |
| de jefe de cocina para arriba | todo             |

Los dos ven lo de limpieza porque los dos limpian. Y de jefe de cocina y jefe de
sala para arriba se ve todo, porque son los que piden, los que cuadran y los que
responden de lo que falta.

Y no es un secreto: es que **no es su trabajo**. La diferencia importa, y decide
dónde va el límite:

|            | Qué se puede                                                    |
| ---------- | --------------------------------------------------------------- |
| **Leer**   | Todo el género del local                                        |
| **Listar** | Solo tus zonas, en la lista de Inventario (filtro del servidor) |
| **Editar** | Solo tus zonas · **la política de la tabla**                    |

### Tres y medio · Por qué leer se queda abierto, y costó una prueba en rojo

La primera versión metió la zona **también en la lectura**, y rompió algo que ya
estaba decidido y bien decidido: «la merma la apunta quien la rompe»
([0026](0026-la-merma-tiene-motivo-y-partida.md)). Una camarera que tira una nata
de la cámara **no podía apuntarla**, porque la nata no existía para ella.

Y detrás venían más: un albarán de bebidas recibido por quien esté ese día, el
escandallo de un cóctel que lleva zumo de cocina, el buscador universal. Esconder
el dato obligaba a abrir un agujero por cada uno.

Así que se lee todo y **se acota lo que se gestiona**, que es lo que Richi pidió:
que cada uno tenga delante su almacén. La lista de Inventario de un cocinero no
trae las botellas de la barra ni aunque pida «Sala» a mano, y su ficha no la puede
cambiar: eso sí lo dice la política de la tabla.

**Y lo que apareció al probarlo:** `cambiar_producto` contestaba «Ficha guardada»
cuando la política no le dejaba escribir, porque nadie miraba si el `update` había
tocado alguna fila. «Guardar sin decir que ha fallado es peor que no guardar»
(regla 34), y llevaba así desde M6.

### Cuatro · Una función más con privilegio, la dieciocho

`estook.zonas_que_ve(local)` es `security definer` porque lee `estook.membresia`
para saber el rol, y `membresia` tiene su propia seguridad por filas que volvería
a llamar aquí: la misma recursión que obligó a M1 a hacer lo mismo con
`nivel_de_permiso`. Son diecisiete y pasan a ser dieciocho, **a propósito**, y la
prueba que las cuenta lo dice con nombres.

La regla vive dos veces —en SQL y en `packages/dominio/src/zona.ts`— porque la
seguridad por filas no puede preguntarle al dominio. Es el mismo caso que
`partida_de_la_merma` desde M6½, con su prueba cuadrando las dos.

### Cinco · Lo que ya estaba se reparte con lo que se sabe

La migración no deja trescientos productos en un montón para que alguien los
ordene uno a uno: usa **la categoría fiscal**, que ya dice si algo es una bebida.
Cerveza, refrescos y alcohol pasan a sala; lo demás se queda en cocina, que es de
donde venía Inventario entero. Es una propuesta razonada, se dice que lo es, y se
cambia en la ficha de cada uno.

## Lo que esto abre

- **El recuento por zonas** (misma entrega): se cuenta la cámara un martes y la
  barra un jueves, sin que el primero borre al segundo.
- **Los pedidos de cada uno** (M7, entrega 2): un jefe de sala pide bebidas y un
  jefe de cocina pide género, cada uno con su lista delante.
- **La compra de limpieza aparte**, que es otro proveedor y otro presupuesto.

## Lo que se descartó

**Hacerlo solo con categorías.** Una categoría «Limpieza» habría sido gratis y no
resuelve lo que importa: quién lo ve. Las categorías las crea cada local y se
cambian desde la aplicación; una política de seguridad no puede colgar de un
nombre que alguien puede renombrar el martes.

**Dejar que cada rol configure sus zonas.** Suena flexible y es una pantalla de
ajustes más, con su matriz, para resolver un caso que no existe: en un bar, un
cocinero no lleva la barra. Si algún día hace falta, el recorte de permisos de M1
ya sabe hacer excepciones por persona.
