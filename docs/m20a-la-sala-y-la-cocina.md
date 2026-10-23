# M20A · 1 · La sala y la cocina en pantalla

> **Estado: 1 · 1 en producción** (23-oct, #130) **y 1 · 2 hecha** (la sala en Estook TPV y
> Ajustes › Sala, rama `m20a-1-2-la-sala`). **Lo siguiente, 1 · 3: la cocina.** Lo que hace cada pantalla lo decidió Richi sobre los dibujos ([0106](decisiones/0106-estook-tpv-la-sala-y-la-cocina.md));
> aquí está **cómo se construye y en qué orden**. Es la primera pieza de Estook TPV que se toca con
> las manos: **la sala toma nota en una tablet o en el móvil y la cocina lo ve en su pantalla, por
> internet**. Sin imprimir (eso es M19a y M20A · 2) y **sin cobrar** (M20C).

## Por qué en cuatro entregas

M16a, que era un día y su cierre, fueron 43 ficheros. La sala y la cocina son varias veces eso, y
una entrega que no se puede probar entera es la que se rompe. Cada una se fusiona, se prueba en IKATZ
y deja algo que funciona.

| Entrega                                      | Qué deja                                                                                                                                                                                                                                                    | Cómo se prueba                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **1 · 1 · La mesa y la comanda, por dentro** | La base y la API: zonas, mesas, cuentas, sus platos y sus pases; abrir, pedir, mandar, marchar, tachar, «Fuera», quitar con motivo, cambiar de mesa, juntar, pasar a otro camarero y anular. El aviso al segundo a la sala y a la cocina. **Sin pantallas** | Con pruebas que juegan la mesa 6 entera, de principio a fin, y atacan desde otro negocio |
| **1 · 2 · La sala**                          | Estook TPV en su función de sala, en tablet y en móvil: el plano, abrir la mesa, **Bebidas · Carta · Menú del día**, la nota, las opciones de la mesa y «Marchar el 2.º». Y en Estook, **Ajustes › Sala** para dibujar las mesas                            | En IKATZ, con su carta, desde el móvil                                                   |
| **1 · 3 · La cocina**                        | La pantalla de cocina: **En marcha · Delivery · Fuera**, tachar, «Esperando la marcha», NUEVO, ANULADO, CAMBIO y VUELVE, con su sonido                                                                                                                      | En IKATZ, con dos aparatos: uno pide y el otro cocina                                    |
| **1 · 4 · Las bebidas en Estook**            | Cada sección de la carta, **comida o bebida**; «Monta tus bebidas»; varias raciones del mismo producto (caña, doble y jarra); **las copas que se hacen solas**; **los cafés hechos**                                                                        | En IKATZ, montando sus bebidas de una vez                                                |

**Los terminales del local** (la tablet de sala o la pantalla de cocina con su PIN, Anexo 3.4) llegan
en 1 · 2 y 1 · 3, sobre la tabla `terminal` que ya existe para fichar (0068). Mientras, se entra con
la sesión de cada uno.

## 1 · 1 · La mesa y la comanda, por dentro

**Lo que se guarda** (Anexo, capítulo 7, con la 0106):

- **`zona_de_sala`** y **`mesa`**: el plano del local (nombre, plazas y dónde está).
- **`cuenta`**: la mesa abierta (o barra, o para llevar), sus personas, **su camarero**, «por pases» o
  «todo junto», su nota para cocina, cuándo se abrió, y si se cerró o se anuló, con su motivo.
- **`pase`**: el 1.º y el 2.º de cada cuenta, con cuándo se mandó, **cuándo se marchó y quién** (siempre
  la sala) y cuándo salió todo.
- **`linea_de_cuenta`**: cada plato, con su cantidad, **el precio de la carta congelado**, su nota, su
  pase, si es del menú, y **cuándo salió y quién lo tachó**; y si se quitó, quién, cuándo y por qué.
  **Se le añaden líneas; nunca se sobrescriben** (Anexo 3.6): un quitar es una marca con motivo, no un
  borrado.
- **Lo que ha pasado**: cada paso queda en la auditoría de siempre, con quién y desde dónde.

**Lo que se puede hacer** (cada cosa, una operación de la API con su permiso):

| Operación                               | Quién (Roles 1.12)                                                                                                          | Lo que no deja                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Dibujar el plano**: zonas y mesas     | Quien toca los ajustes del local (Ajustes › Sala)                                                                           | Archivar una mesa abierta, o dos mesas con el mismo nombre      |
| Abrir una mesa, pedir, cambiar una nota | Sala                                                                                                                        | Pedir en una mesa cerrada o anulada, o un plato agotado         |
| **Mandar a cocina**                     | Sala                                                                                                                        | Mandar dos veces lo mismo: cada línea nace con su identificador |
| **Marchar el 2.º**                      | Sala; **nunca la cocina**                                                                                                   | Marchar un pase ya marchado                                     |
| **Tachar y destachar** un plato         | Cocina (y quien lleva el local)                                                                                             | Tachar lo que no se ha mandado                                  |
| «Todo fuera» y «Recuperar»              | Cocina                                                                                                                      |                                                                 |
| **Quitar un plato**                     | Sala; ya en cocina, con motivo, y el camarero lo pide y lo aprueba un jefe (la aprobación con PIN llega con los terminales) | Quitar sin motivo lo que ya está en cocina                      |
| Cambiar de mesa, juntar mesas           | Sala                                                                                                                        | Juntar con una mesa de otro local                               |
| **Pasar a otro camarero**               | El camarero, las suyas; jefe de sala y gerente, cualquiera                                                                  |                                                                 |
| Anular la mesa                          | Jefe de sala y gerente, con motivo                                                                                          |                                                                 |

**Lo que se lee**: el plano (cada mesa con su estado: libre, comiendo, «toca marchar», pide la cuenta…),
una mesa con su cuenta, y **la cocina** (En marcha, Delivery y Fuera) **sin un solo importe**, tampoco
en la respuesta.

**El aviso al segundo**: lo que cambia una mesa toca a quien la tiene abierta y a la cocina, con el
mismo toque del chat (0073). Si el toque no llega, la pantalla pregunta cada pocos segundos.

## La regla 14 y la prueba de la plantilla, de M20A · 1

| Pregunta                            | Respuesta                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Qué datos usa?                     | La carta y sus precios por canal (M9 · 1), el menú del día (M10 · 2), los agotados (M10 · 1), los alérgenos (M9 · 2), las personas y sus roles (M1), la jornada (M16a) |
| ¿Quién más se entera?               | La cocina y la sala, al segundo. Los agotados, en la carta. Nadie más hasta cobrar (M20C)                                                                              |
| ¿Qué automatiza Fogón?              | Nada. Todo son reglas en código, sin gastar créditos (Anexo 3.2)                                                                                                       |
| ¿Qué aprueba una persona?           | Quitar un plato que ya está en cocina, y anular la mesa                                                                                                                |
| Permisos                            | Roles 1.12, en la base y no en la pantalla                                                                                                                             |
| ¿Sin internet?                      | En 1 · 1 a 1 · 4, no: va por internet. Sin internet, con Estook Link (M19a)                                                                                            |
| ¿Dos veces?                         | Cada línea y cada mesa nacen con su identificador: mandar dos veces no pide dos platos                                                                                 |
| Auditoría                           | Abrir, mandar, marchar, tachar, quitar, cambiar, juntar, pasar y anular, con quién y cuándo                                                                            |
| 16 · ¿Trabajo nuevo?                | No: sustituye a la libreta y al grito a cocina. Quien lleva el local dibuja su plano una vez                                                                           |
| 17 · ¿Duplica algo?                 | No: la carta, los precios y los menús son los de Estook; el TPV no configura nada                                                                                      |
| 18 · ¿Bloquea el servicio?          | No: nada impide pedir ni mandar. Lo único que pide un jefe es quitar lo que ya está en cocina                                                                          |
| 19 · ¿Fácil?                        | El botón grande dice siempre lo siguiente; una comanda de cuatro platos en diez toques                                                                                 |
| 20 · ¿Avisa solo cuando hace falta? | A la sala, cuando ha salido todo un pase; a la cocina, lo nuevo, lo anulado y la marcha                                                                                |
| 21 · ¿Con datos a medias?           | Sin plano, se pide en barra o para llevar; un plato sin foto sale con su nombre                                                                                        |
| 22 · ¿Señala a alguien?             | No: lo que ha pasado dice quién, como cualquier historial, y nada más                                                                                                  |

## 1 · 1, entregada (23-oct-2026)

**La base**: la migración 0081 (cinco tablas, tres permisos y las reglas que la base vuelve a mirar
aunque alguien se salte la API: marchar es de la sala, tachar de la cocina, lo mandado no se
reescribe y quitarlo pide motivo y un jefe). **La API**: 3 consultas (`el_plano`, `la_mesa`,
`la_cocina`) y 23 comandos (el plano, la sala y la cocina), que la dejan en **105 consultas y 253
comandos**. **El dominio** (`packages/dominio/src/sala.ts`): qué pase sale al mandar, cuándo toca
marchar, qué dice el botón grande y dónde está la mesa en la cocina, en una sola función para la
sala y la cocina.

**La prueba** (`base-de-datos/pruebas/la-sala-y-la-cocina.prueba.ts`) juega la mesa 6 entera: Rosa
dibuja el plano; Sara abre para cuatro, pide primero las bebidas y luego dos de carta y dos menús;
sale el 1.º y el 2.º espera; Marcos lo ve sin un euro, tacha y a Sara le toca marchar; NUEVO,
CAMBIO, ANULADO y VUELVE; «Fuera», «Recuperar» y «Todo fuera»; los postres salen solos; pasar la
mesa, cambiarla, juntarla y liberarla; anular; «todo junto» y la barra. Y Luis, de otro negocio,
no ve nada.

### Lo que decidí al construirlo

1. **El plano entra en 1 · 1** (seis operaciones), aunque su pantalla sea de 1 · 2: sin mesas no se
   abre ninguna, y la API no se podía probar entera.
2. **Una mesa recién abierta dice «Pedir»**, no «Cobrar», y sale en el plano como «sin pedir».
3. **Una mesa anulada no desaparece de la cocina**: pasa a «Fuera» marcada ANULADA, con su motivo,
   para que nadie siga haciéndola sin saber por qué se fue.
4. **Quitar el último plato que faltaba de un pase da el pase por salido**, igual que tacharlo.
5. **Lo agotado no se pide**: la pantalla lo enseñará apagado, y la API lo vuelve a mirar.
6. **Liberar la mesa no quita nada de la cocina**: lo que quede sigue en «En marcha» hasta tacharlo.
7. **Quitar lo que ya está en cocina** lo hace directamente quien tiene «Quitar de cocina» (un
   jefe). Que el camarero lo pida y el jefe lo apruebe con su PIN llega con los terminales (1 · 2).
8. **El plato de un menú se cobra por su suplemento** del último día montado; la línea del menú no
   va a cocina, van sus platos.
9. **«Recuperar» devuelve lo último que se tachó** del último pase que salió: es lo que se dio por
   salido sin querer.
10. **Pasar mesas**: el camarero, las suyas; quien tiene «Quitar de cocina», cualquiera; y solo a
    quien toma nota en el local.

## 1 · 2, entregada (23-oct-2026)

**Estook TPV ya tiene su puerta**, `apps/tpv` (`estook.com/tpv/`): el plano con cada mesa y cómo
va, el aviso «Mesa 6 · ha salido todo el 1.º» con su «Marchar el 2.º», abrir la mesa (cuántos son y
por pases o todo junto), **Bebidas · Carta · Menú del día**, la nota de cada plato, lo que se hace
con lo ya mandado (cambiar la nota, devolver, quitar con motivo) y las opciones de la mesa (cambiar
de mesa, juntar, pasar a otro camarero, nota para cocina, personas, sacadlo todo, liberar y
anular). En la tablet, la cuenta a la izquierda; en el móvil, lo que se pide ocupa la pantalla.

**En Estook**: Ajustes › Tu local › **Tu sala** (las zonas y las mesas, arrastrándolas), el
interruptor **«Es de bebidas»** en cada sección de la Carta, y **«Abrir la sala»** en Servicio ›
En marcha para quien toma nota.

**La base y la API**: la migración 0082 (`es_bebida` en las secciones de la carta y del menú),
`la_carta_de_la_sala` (la carta por secciones y los menús de hoy con el pase de cada sección),
`el_plano_del_local` (para dibujarlo con el permiso de Ajustes) y quién toma nota en `el_plano`.
La API queda en **107 consultas y 253 comandos**.

**Las pruebas**: la mesa 6 suma la carta de la sala, las bebidas que van solas a la barra, lo del
menú que no está hoy y el 2.º que no sale solo (35 contra la base); el dominio (33), el plano dibujado (3), la lógica de
la comanda (10); y `la-sala.spec.ts`, de Ajustes › Tu sala a mandar desde Estook TPV, en escritorio
y en móvil.

### Lo que decidí al construirlo

1. **Estook TPV entra con la sesión de Estook**: los dos viven en `estook.com` y comparten el token.
   La tablet compartida del local, con el PIN de cada uno (los terminales, Anexo 3.4), llega con
   la cocina, que es donde hace más falta.
2. **«Es de bebidas» se adelanta de 1 · 4**: sin ella, la pestaña Bebidas no sabe qué enseñar ni
   la caña a dónde va. Lo que ya había se marcó por su nombre (Bebidas, Vinos, Cafés, Copas…), y
   una sección nueva con esos nombres nace marcada.
3. **El destino lo decide la API**, por la sección: la pantalla no puede mandar una caña a cocina.
4. **Lo que se pide se queda en la tablet hasta «Mandar»**: cada toque no espera a la red, y si
   se recarga no se pierde. Al salir de la mesa con algo sin mandar, se pregunta.
5. **Un pase que ya esperaba no sale solo al añadirle algo** (un fallo que salió probándolo: el
   1.º había salido de cocina, se pidió otro principal y el 2.º salía en marcha). Ahora solo sale
   solo un pase nuevo, como los postres; el que espera lo marcha el camarero.
6. **«Va en el»**: lo de comida va en el 1.º en una mesa sin nada y, si no, en el último pase con
   algo; se cambia con un toque. Una mesa recién abierta empieza en Bebidas.
7. **El plato de un menú tiene que estar en el menú de hoy**, el de la jornada (la cena que acaba a
   la una es del día de antes), y lo que solo está en el menú no se pide suelto.
8. **Los menús se reparten en orden** (el primer menú lleva el primero de cada sección) y **el
   postre del menú se elige al final**, dentro de su menú.
9. **Al segundo, con el toque del chat**; si no llega, la pantalla pregunta cada 8 segundos, y si
   llega, una vez por minuto por si acaso.
10. **«Marchar ya»** junto a cada pase que espera: el aviso llega cuando la cocina ha sacado todo
    lo de antes, pero marcha el camarero cuando quiera, que es quien ve la mesa.
11. **Liberar la mesa** dice «ya han pagado en el TPV de siempre» hasta M20C. **Cobrar, imprimir,
    dividir, venta rápida, las alergias de la mesa, «pide la cuenta» y «lo que ha pasado»**
    llegan con lo suyo (M19a, M20C), no se enseñan apagados.

### La auditoría de después (23-oct)

Richi pidió revisarla entera antes de fusionar. Los dos rojos de GitHub no eran del código: la
tanda 4 de pantallas se quedó 15 minutos bajando los navegadores, y «Construcción y
presupuestos» junta las cuatro. Lo que sí salió, ya arreglado y probado:

- **La nota de la mesa se borraba** al guardarla desde el plano: empezaba en blanco (lección
  217). Y desde el plano no salía «Sacadlo todo». La mesa del plano trae ahora su nota, si va
  por pases y quién la lleva.
- **Una mesa que se cierra en otro aparato** (liberada, anulada o juntada) lo dice, enseña lo
  que no se llegó a mandar y vuelve al plano, en vez de dejar pedir y fallar al mandar.
- **«Marchar ya» pregunta** si lo de antes aún no ha salido entero: marchar no tiene vuelta
  atrás. Cuando ya toca, lo hace el botón grande y «Marchar ya» no sale.
- **Lo ya mandado**: un menú solo se quita; lo que ya salió abre en «Devolver», sin nota; la
  nota de una bebida es «para la barra»; y quien no es jefe sabe antes de escribir que lo
  quita un jefe.
- **«Mandar ahora»** al salir con algo sin mandar lleva al plano; **liberar** avisa si hay
  platos sin mandar; **pasar a otro camarero** elige por la persona, no por el nombre; el
  aviso de arriba dice el pase que ha salido de verdad («todo el 1.º»).
- **En el móvil**: «Menú» en vez de «Menú del día 16,50» en tres líneas, el buscador en su
  línea, los platos a una columna y sin cortar el nombre.
- **En Ajustes › Tu sala**, quitar una zona o una mesa pide un segundo toque.
- **La escucha al segundo**, una sola para toda la sala: entrar y salir de una mesa no vuelve
  a conectar. Y el nombre de arriba lleva de vuelta a Estook.
