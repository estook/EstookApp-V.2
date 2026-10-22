# M20A · 1 · La sala y la cocina en pantalla

> **Estado: en construcción desde el 22-oct-2026**, en la rama `m20a-1-la-sala-y-la-cocina`. Lo que
> hace cada pantalla lo decidió Richi sobre los dibujos ([0106](decisiones/0106-estook-tpv-la-sala-y-la-cocina.md));
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
| Abrir una mesa, pedir, cambiar una nota | Sala                                                                                                                        | Pedir en una mesa cerrada o anulada                             |
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
