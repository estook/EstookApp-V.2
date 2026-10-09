# La auditoría del 9-oct, por la tarde

Pedida por Richi junto con los cinco cambios de la [0081](../decisiones/0081-un-solo-horario-y-las-incidencias.md): «que todo tenga sentido; productos, cuentas, permisos por rol, gráficas, empleados, seguridad, sincronización, y lo más importante, la experiencia de usuario; rendimiento y fiabilidad; preparación para el futuro; pruebas reales». Aquí está **lo que se miró de verdad, lo que salió y lo que queda**. Lo que no se miró no se da por bueno.

## Cómo se miró

- **Producción, en solo lectura** (9-oct, 22:45): una transacción `read only` con consultas de comprobación. Nada se escribió.
- **Las pantallas, en capturas**: veinte pantallas como gerente, en escritorio y en un móvil pequeño, el Panel del cocinero y de la camarera, y tres en oscuro. Se miró cada una buscando lo que sobra, lo que se repite y lo que no se entiende.
- **Las pruebas**: las 1.843 unitarias y de base, y las de pantalla en escritorio y móvil, con las nuevas de este trabajo.

## Lo que dice producción

| Qué                                                     | Resultado                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Migraciones                                             | 61 de 61                                                                                                       |
| Tablas sin seguridad por filas (`estook`, `plataforma`) | **Ninguna**                                                                                                    |
| Fichajes abiertos hace más de 12 horas                  | Ninguno                                                                                                        |
| Productos activos con existencias negativas             | Ninguno                                                                                                        |
| Inventarios contados o cerrados                         | **Ninguno todavía**: lo gastado de verdad y el food cost entre inventarios salen vacíos hasta contar dos veces |
| Semanas de horario publicadas                           | 2 (IKATZ, la última la del 5-oct). Pizzeriacazzo, ninguna                                                      |
| Tramos del «horario de siempre» escritos                | IKATZ 22, Pizzeriacazzo 10: **dejan de contar con la 0081**                                                    |
| Avisos con correo mandado, 30 días                      | 35 (los que más: Tu mes 6, Tu semana 5, horario publicado 5, Tablón 4)                                         |
| Correos del chat, 30 días                               | 1                                                                                                              |
| Preferencias con correo encendido a mano                | Una persona, dieciséis tipos. Se respetan                                                                      |
| Una persona activa que no ve ningún local               | `santidearmijo58`: su acceso está **retirado**. Es lo correcto                                                 |

## Lo que se arregló, cada uno con su prueba

| Dónde      | Qué pasaba                                                                                                                 | Prueba                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Inventario | Escanear sumaba uno: mil latas, mil lecturas. Y con lector de mano, la siguiente lectura caía en la casilla de la cantidad | `contratoDelInventario.prueba.ts`, `el-lector.spec.ts`                                  |
| Equipo     | Dos horarios que no concordaban; las faltas no salían en ningún sitio; «Para mirar» no llevaba a nada                      | `las-incidencias.prueba.ts` (18), `las-incidencias.spec.ts`, `incidencias.prueba.ts`    |
| Equipo     | «Sin cerrar» contaba a quien estaba trabajando ahora                                                                       | `las-incidencias.prueba.ts`                                                             |
| Equipo     | Llegar más de tres horas tarde no era ni retraso ni falta                                                                  | `las-incidencias.prueba.ts`                                                             |
| Equipo     | Fechas como «2026-09-10» y «Última vez: Nunca ha entrado»                                                                  | a la vista en las capturas                                                              |
| Almacén    | Vistas vacías ocupando sitio                                                                                               | `las-incidencias.spec.ts`                                                               |
| Almacén    | «Contar» de una zona sin género enseñaba fichero, opciones y un botón apagado                                              | a la vista en las capturas                                                              |
| Panel      | Cifras que solo cuentan se podían hacer grandes                                                                            | `catalogo.prueba.ts`                                                                    |
| Avisos     | Siete tipos por correo de fábrica                                                                                          | `avisos.prueba.ts`, `los-avisos.prueba.ts`, `el-pedido-los-informes-y-google.prueba.ts` |
| Ajustes    | Avisos: doce pantallas de scroll en el móvil                                                                               | a la vista en las capturas                                                              |
| Negocio    | PDF de un informe vacío                                                                                                    | `personas-y-fichajes.spec.ts`                                                           |
| Base       | Buscar el fichaje de cada tramo recorría todos los de la persona                                                           | el índice de la 0062                                                                    |

## Por áreas

**Los productos, cuánto hay y cuánto se resta.** El libro de movimientos sigue siendo la única fuente (regla 8); en producción no hay ningún producto en negativo. Contar escaneando ahora suma o sustituye con su cuenta probada. Lo que no se ha podido mirar con datos reales: **un inventario cerrado**, porque nadie ha contado todavía.

**Quién ve qué (por rol).** Lo deciden la base y `a_quien_lleva`, no las pantallas. Probado en esta entrega: el cocinero no ve las incidencias de nadie ni justifica; nadie se justifica a sí mismo; lo justificado lo lee también el trabajador (es su registro horario). Las 1.843 pruebas de base incluyen las de permisos de cada módulo anterior.

**Los empleados: horas, horario, retrasos y fichajes.** Un solo horario, el publicado. Las horas frente al contrato siguen saliendo de lo que cobra cada uno (horas semanales). Retrasos, Resumen e Incidencias cuentan con la **misma pieza** (`lasEntradasDelHorario`), y una prueba comprueba que suman lo mismo.

**Las gráficas y las cifras.** Cada cifra lleva a su detalle; las que se cuentan no crecen sin decir más. Sin horario publicado, Retrasos e Incidencias dicen «Sin horario publicado», no un cero que mentiría.

**La experiencia de uso.** Ver «Lo que se arregló». Lo que queda, abajo.

**Rendimiento.** La cifra de Incidencias reutiliza la consulta del horario (no la repite) y tiene su índice. El resto de consultas pesadas ya se midió en el repaso del 23-sep.

**Registros de errores y monitorización.** Las cuatro aplicaciones mandan sus errores a **Sentry**. **La API no**: sus errores quedan en los registros de Supabase, sin alerta. Ver abajo.

**Preparado para el futuro.** El destino nuevo entra por el catálogo (`apps.ts`) y el Plan, con la prueba que los compara; la migración va y vuelve; el permiso es `app.equipo` y la base lo vuelve a mirar. `horario_habitual` queda en desuso con su comentario, para quitarla en M13.

## Lo que queda, por orden de importancia

1. **No hay copias de seguridad.** Aplazadas por Richi hasta la mudanza ([0065](../decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)). Es lo único de esta lista que puede perder datos de un cliente. Antes del primer cliente que pague.
2. **Los errores de la API no avisan a nadie.** Van a los registros de Supabase; si algo falla de noche, nadie se entera hasta que lo dice un cliente. Mandarlos a Sentry, como las aplicaciones, cuesta poco y no necesita nada de Richi (el proyecto ya existe).
3. **IKATZ y Pizzeriacazzo deben publicar su semana en Horarios.** Sin ella, desde la 0081, no hay retrasos ni «entras en cinco minutos».
4. **El cierre de caja en el móvil es largo**: diez campos y el fichero. Los opcionales (tickets, comensales, platos y notas) podrían ir plegados en «Más detalles».
5. **El chat con el teclado del iPhone** sigue sin confirmar en un iPhone de verdad (0080).
6. **Con pocos widgets, el Panel de escritorio deja algún hueco**: el mosaico ya los rellena cuando hay con qué; con widgets anchos que no encajan, queda.
