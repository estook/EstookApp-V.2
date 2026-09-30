# 0064 · Las gráficas contestan una pregunta, y se ven mejor sin engañar

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)). Se
construye antes de M21, y Informes y Ventas se pasan al sistema nuevo en cuanto exista.
**Cambia:** el Plan (B4 y el nuevo B9), el Manifiesto (27) y la
[Arquitectura](../maestros/Estook-Arquitectura.md).

## Lo que pasó

Hoy Estook tiene **tarjetas de cifra con flecha y objetivo**, que están bien
(`TarjetaDeIndicador`, 0044), y **tres gráficas de barras sin comparar con nada**. La
muestra del sistema de diseño pinta el margen en rojo, que es el color de lo malo. Y
Richi pidió, al aprobarlo, «un mejor diseño, más 3D y más bonito que las que tenemos».

## Lo que se decide

### 1 · Cada gráfica contesta una pregunta

Un catálogo de gráficas, como el de widgets (`packages/ui`), donde **cada una nace con
su pregunta**. Si una gráfica no contesta nada, no entra.

| La pregunta                                      | La gráfica                                                                  | Dónde                     |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------- |
| ¿Voy mejor que la semana pasada?                 | Línea de este periodo, el anterior en gris detrás, y la diferencia al final | Ventas, Informes, Panel   |
| ¿A qué hora se me llena?                         | Mapa de calor día × hora                                                    | Negocio, el cuadrante (H) |
| ¿Qué platos me dan dinero y cuáles solo trabajo? | Matriz de popularidad y margen: estrellas, caballos, rompecabezas y perros  | Carta (M10)               |
| ¿Dónde se va el margen?                          | Cascada: ventas → género → personal → mermas → margen                       | Negocio, Pulse            |
| ¿Llego al objetivo?                              | Barra contra la línea del objetivo, con lo que falta                        | Panel, Informes           |
| ¿Qué 20 % me hace el 80 %?                       | Pareto de productos o de proveedores                                        | Almacén, Compras          |
| ¿Cuánto me cuesta el personal para lo que vendo? | Ventas por hora trabajada, por franja                                       | Negocio (con H y el TPV)  |

### 2 · Las reglas

- **El rojo es solo para lo malo.** Una serie normal va con el acento de su app.
- **Siempre con qué se compara**: el periodo anterior, el objetivo o la media.
- **Unidades en el eje y el periodo debajo** (la regla de «cada número dice de dónde sale
  y de qué periodo es»).
- **Se toca y dice el valor**, en móvil y en escritorio.
- **Una tabla escondida para los lectores de pantalla**, con los mismos datos.
- **Se ven igual de bien en claro y en oscuro**, medido, como el resto.

### 3 · «Más 3D y más bonito», bien hecho

Lo que se hace es **dar profundidad** sin tocar las cifras: degradados suaves en las
áreas y las barras, sombras suaves, esquinas redondeadas, la gráfica sobre su tarjeta
con relieve, y una entrada animada corta (que se apaga con «reducir movimiento»).

Lo que **no** se hace es la perspectiva 3D de verdad —barras en cubo, quesos
inclinados—: deforma el tamaño de lo que se ve, y una barra más cerca parece más grande
aunque valga menos. Una gráfica de Estook puede ser bonita; **no puede mentir**.

### 4 · Qué no cambia

Recharts se sigue cargando aparte, solo donde hay gráficas (B7). Si un tipo de gráfica
no se puede hacer bien con Recharts, se justifica por escrito antes de meter otra
librería.
