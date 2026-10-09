# 0079 · M8, la segunda entrega: lo gastado de verdad, el food cost real, la desviación de lo que se vende tal cual y la foto de la merma

**Fecha:** 9 de octubre de 2026
**Estado:** construida el 9-oct con la migración `0061`, en su pull request. Sigue las respuestas de la [0078](0078-las-respuestas-de-m8.md) (1A y 4A); lo de aquí abajo lo decidí al construirlo, y se cambia si no cuadra.
**Cambia:** la tabla B5 del [Plan](../maestros/Estook-Plan-de-Desarrollo.md): Movimientos gana «Desviación».

## Lo que se construye

**Almacén → Movimientos → Desviación**, para quien cierra inventarios:

- **El food cost real**: (lo que había + lo comprado − lo que queda) ÷ lo vendido **sin IVA**, entre los dos últimos inventarios o en un mes, con su semáforo frente al **objetivo de materia prima** del local. Si faltan días de caja, lo dice y no se da por exacto.
- **Lo que se vende tal cual**: lo que salió de la cámara frente a lo que vendió la caja, en unidades y en euros, con **su causa más probable** y el botón para comprobarla.
- **Emparejar la caja**: «Coca-Cola» de la caja es tu «Coca-Cola 33 cl», se dice una vez. Estook propone el producto que más se le parece.
- **Lo gastado de verdad** de cada producto contado dos veces: había, entró, queda, gastado y en euros.
- **Un aviso** al cerrar un inventario si lo que falta pasa del 3 % de lo gastado.
- **La foto de la merma**, un cuarto toque que se puede saltar (4A), y «Ver la foto» en la lista de mermas.

## Lo que decidí al construirlo

1. **La desviación con su causa, solo de lo que se vende tal cual** (lo emparejado con la caja). De lo que se cocina sale **lo gastado de verdad**, pero no «lo que falta»: sin la ficha no se sabe cuánto debía gastarse, y compararlo con lo apuntado lo daría todo por «falta», que es la 1C que se descartó. Llega con M9.
2. **Sin brecha hasta M9.** La brecha del Manifiesto es real frente a teórico, y el teórico sale de las fichas. Mientras, el food cost real se compara con **tu objetivo de materia prima**, con el semáforo de siempre: verde hasta el objetivo, ámbar hasta 3 puntos más, rojo por encima.
3. **Cada producto, entre sus dos últimos inventarios.** El inventario es cíclico: lo caro se cuenta cada semana y lo demás al mes, así que no hay un «inventario de todo». Lo que había es lo contado la primera vez y lo que queda, lo contado la segunda; el libro solo pone lo que entró entre medias, **leído por posición** (hasta qué línea se contó), no por fechas.
4. **El food cost entre dos inventarios también va por posición**: lo que había justo al cerrar el primero y lo que queda justo al cerrar el segundo. Por días saldría mal: si se cuenta el lunes por la mañana, el ajuste cae el lunes, dentro del periodo. **Por meses va por días**, como se hace siempre: lo que faltó cuenta el día en que se cierra el inventario.
5. **Qué días de caja van con cada inventario**: contar en las siete horas tras el corte (de 05:00 a 12:00, con el corte de fábrica) es contar antes de abrir, y las ventas de ese día van después; contar más tarde es contar después. La pantalla dice qué días entran.
6. **Sin IVA con el motor fiscal**: el tipo del servicio de restauración del territorio del local (10 % en la península, 7 % de IGIC en Canarias, lo de su ordenanza en Ceuta y Melilla). Si no se sabe, no hay porcentaje: se dice.
7. **Fuera del food cost**: la comida del personal y las invitaciones (su partida, 0026) y lo que se lleva otro local. Lo devuelto al proveedor resta de lo comprado.
8. **Un día sin cerrar la caja, o cerrado sin sus líneas, es un día sin caja**: el food cost no se da por exacto, y en la desviación es la primera causa, antes que culpar a nadie.
9. **Emparejar**: una vez, sin mayúsculas ni acentos; con **cuánto gasta cada venta** (1 de fábrica; una caña de un barril en litros, 0,2); «No es de almacén» para no volver a proponerla; y «Quitar» lo deshace. Lo hace quien cierra inventarios y ve las ventas.
10. **Las causas, en este orden**: contado en otra unidad (cajas por unidades), sobra (entró sin apuntarse), faltan días de caja, se vende con otro nombre en la caja, recepción (un albarán con incidencias, o una entrada a mano igual a lo que falta) y, si no hay otra, salidas sin apuntar. «Error de escandallo» llega con M9; «albarán contra factura» mueve euros y no unidades, y se mira en Compras → Facturas.
11. **Cuadra** si la diferencia no pasa del 2 % de lo gastado: contar 9,8 kg donde había 10 es pesar, no perder.
12. **El aviso al cerrar** cuenta solo lo que se vende tal cual, avisa desde el 3 % de lo gastado, en euros, a quien cierra inventarios y ve precios —**menos a quien lo acaba de cerrar**, que lo está viendo— y de fábrica solo en la campana.
13. **La foto de la merma va después de apuntarla**, por su lado: si no sube, la merma se queda. Una por merma y no se cambia (es la prueba). La pone quien apuntó la merma o quien lleva el almacén. Sin señal, la merma sale sola y sin foto. Va al cubo de las fotos de producto, que ya existe: **no hay que preparar nada**.
14. **El food cost real vive en Desviación, no en el Resumen** (el plan decía Resumen): es la misma pantalla que lo explica, y el Resumen ya tiene el food cost del día.
15. **La API pasa a 80 consultas y 171 comandos**; la base, a **106 tablas**.

## Lo que se descartó

- **Comparar lo que se cocina con lo apuntado** (la 1C de la 0078): todo saldría «falta».
- **La brecha contra lo apuntado**: con una cocina que no apunta, siempre «fuga».
- **La foto dentro de la merma** (en el mismo envío): la merma se apunta también sin señal, y una foto de 80 KB en la cola del móvil no aporta nada.
