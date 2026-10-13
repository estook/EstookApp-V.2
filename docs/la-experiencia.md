# La experiencia · el repaso de cómo se ve, cómo se usa y lo que falla

**Pedido por Richi el 13 de octubre de 2026**, con la #100 ya en producción y **antes de M9**. Decisión [0083](decisiones/0083-la-experiencia.md).

> «Siento que es algo lioso todo y que no parece una app verdaderamente profesional. Está bien pero no tiene
> profundidad, o intenta imitar a apps buenas sin llegar a serlo: no por funcionalidades, sino por diseño,
> animaciones, experiencia de usuario, accesibilidad y absolutamente todo.»

Con siete capturas: un panel oscuro de referencia con widgets distintos entre sí, un panel con menú a la izquierda y
gráficas que se tocan, el Panel en su monitor con mucho hueco a los lados, Personas antes y después (lista compacta,
oscura y con fotos cuadradas), los filtros de Productos («se ve feísimo») y un mosaico de gráficas profesionales.

## Lo que pidió, punto por punto

| #   | Lo que pidió                                                                                                   | Cómo queda                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Pedir la contraseña dos veces; quien entra con PIN, el PIN y dos veces la nueva                                 | «La nueva» y «Repítela»; sin contraseña, **el PIN** que le dieron, y el servidor lo comprueba                      |
| 2   | Movimientos: Inventario primero, después Historial y Consumo                                                   | En ese orden                                                                                                       |
| 3   | Compras: cinco pestañas sin orden, «nadie acabaría aprendiendo»                                                | **Tres**, en el orden del día: **Pedidos** (lo abierto y lo que ha llegado) · **Facturas** · **Proveedores** (con los precios) |
| 4   | Movimientos fuera de la barra de Almacén, con un botón largo debajo de las cifras                              | Almacén queda en **Resumen · Productos · Compras · Mermas**, y «Revisar movimientos» va debajo de «Cómo va»         |
| 5   | Menos widgets, cada uno con su diseño, un solo tamaño, el periodo dentro y que se abran                         | Catálogo recortado; cada widget su tamaño y su dibujo; 7/30 días dentro; tocar la gráfica abre su detalle          |
| 6   | Gráficas más profesionales y que se toquen                                                                     | Gráficas nuevas: área con degradado, barras redondeadas, medidores y anillos, con el dato al pasar el dedo          |
| 7   | En el ordenador, el menú a la izquierda: plegado, el logo del local; abierto, el de Estook y todas las apps     | Menú lateral oscuro que se pliega y se recuerda; en el móvil, la barra de arriba de siempre                        |
| 8   | En el ordenador sobra espacio a los lados                                                                      | El contenido ocupa todo el ancho que deja el menú, con un tope que solo se nota en pantallas enormes               |
| 9   | Aspecto más moderno sin perder la marca, cosas más pequeñas y sin información innecesaria                       | Fichas nuevas (oscuro grafito, claro limpio), cabeceras sin la pregunta, filtros en una línea                      |
| 10  | Fotos del equipo, cuadradas con las esquinas redondeadas                                                       | Foto de cada persona; todas las caras de Estook pasan a cuadradas redondeadas                                      |
| 11  | El logo del local, más grande, tal cual se sube, y saludar a quien entra                                       | Sin círculo ni fondo; «Hola, Ricardo» arriba, como en la referencia                                                |

## La auditoría

Los fallos encontrados, los de lógica y los de experiencia, con lo que se ha hecho con cada uno, están en
[`docs/auditorias/2026-10-14-la-experiencia.md`](auditorias/2026-10-14-la-experiencia.md).
