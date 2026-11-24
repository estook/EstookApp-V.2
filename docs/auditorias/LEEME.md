# Las auditorías

> **El registro de cada auditoría**: cuándo fue, qué miró, qué encontró y dónde está escrita. Y
> **las que tocan**, con su sitio en el orden. Qué se mira y cuándo lo manda el
> [Plan, E5](../maestros/Estook-Plan-de-Desarrollo.md) ([0146](../decisiones/0146-la-reorganizacion-del-11-nov.md),
> sección 7): **nunca más de cuatro entregas de código sin una, y siempre antes de vender**.

## Las que tocan

| Cuál                        | Cuándo                                                                                                                          | Qué mira, sobre todo                                                                                                                                                              | Cómo está                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **S1 · Cada plan, lo suyo** | Hecha el 18-nov ([la auditoría](auditoria-2026-11-18-cada-plan-lo-suyo.md), [0147](../decisiones/0147-s1-cada-plan-lo-suyo.md)) | Que Esencial no llegue a nada de Pro ni de Estook TPV, en el servidor: las 504 operaciones, la puerta `deEstookTpv`, la prueba que clasifica cada una y las pantallas de Esencial | Hecha, en `s1-cada-plan-lo-suyo` |
| **Auditoría 2**             | Con Estook TPV entero (después de T8)                                                                                           | El cobro, la caja, sin internet, las apps nativas y la facturación en sus dos formas                                                                                              | Por hacer                        |
| **Auditoría 3**             | Después de M13 a M16b                                                                                                           | Los datos de los empleados: contratos, sueldos, fichajes, vacaciones y notas personales                                                                                           | Por hacer                        |
| **Auditoría 4**             | Antes de vender (después de M24)                                                                                                | Entera: los siete puntos de seguridad y las siete clases de prueba, y el area manager solo en sus locales                                                                         | Por hacer                        |

## La lista, para no dejarse nada

**Seguridad**, llamando a la API a pelo y mirando la base: 1 · los negocios, separados · 2 · los
roles y los permisos · 3 · cada operación del servidor, con su puerta · 4 · los límites de cada plan
· 5 · la entrada y las sesiones · 6 · los datos de los empleados y de los clientes · 7 · el area
manager, solo en lo suyo.

**Calidad**: unitarias · de integración · de pantalla · de permisos · de sincronización · sin
internet · regresiones (`pnpm verifica`, `prueba:e2e:completa` y `prueba:semana`).

**Un fallo crítico para todo lo demás.** Cada hallazgo, con su arreglo y su prueba.

## Lo que dejó S1 (18-nov-2026)

- **Lo de un aparato** lo cierra la puerta del pago sin Pro desde la [0120](../decisiones/0120-estook-tpv-es-de-pro.md).
- **Lo de Estook TPV hecho desde Estook**, con la sesión de una persona, lleva la puerta
  `deEstookTpv` y también se cierra sin Pro ([0147](../decisiones/0147-s1-cada-plan-lo-suyo.md)).
  Lo que un local que deja Pro conserva (ver y descargar lo suyo, y lo que la ley pide sobre lo ya
  cobrado) está en una lista con su motivo, y una prueba obliga a decidir cada operación nueva.

## Las que ya se hicieron

| Cuándo | Cuál                                                                            | Qué miró                                                                                                                 |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 25-nov | [Las siete entregas desde S1](auditoria-2026-11-25-las-siete-entregas.md)       | Las migraciones 0119 a 0124, las nueve operaciones nuevas y los fallos de Richi; la cola de lo vendido, solo del sistema |
| 18-nov | [S1 · Cada plan, lo suyo](auditoria-2026-11-18-cada-plan-lo-suyo.md)            | Los límites de cada plan en las 504 operaciones, y las pantallas de Esencial                                             |
| 28-oct | [La auditoría del 28 de octubre](auditoria-del-28-oct.md)                       | Que todo sea coherente: documentos, Estook TPV, tickets, caja, aparatos y roles                                          |
| 27-oct | [La auditoría de GitHub](la-auditoria-de-github-del-27-oct.md)                  | Las 60 últimas vueltas de la integración, cada rojo por dentro, y producción                                             |
| 20-oct | [La auditoría del 20-oct](auditoria-del-20-oct.md)                              | Estook entero, sin el TPV: seguridad, permisos, datos, cálculos, IA, pantallas y pruebas                                 |
| 14-oct | [Las bases firmes](auditoria-2026-10-14-las-bases-firmes.md)                    | Por roles: fallos, seguridad (qué ve quién, datos cruzados), base de datos y lo visual                                   |
| 14-oct | [La experiencia](auditoria-2026-10-14-la-experiencia.md)                        | Fallos, fallos de lógica y experiencia de uso, con datos de un mes                                                       |
| 9-oct  | [La auditoría del 9-oct](auditoria-2026-10-09.md)                               | Productos, cuentas, permisos por rol, gráficas, seguridad y sincronización; producción en solo lectura                   |
| 29-sep | [La auditoría profunda](auditoria-profunda-2026-09-29.md)                       | Todo el producto y sus documentos, con cada hallazgo y su gravedad                                                       |
| —      | La lista de la Auditoría de flujos sobre [M3](m3.md), [M5](m5.md) y [M6](m6.md) | Cada módulo, al cerrarlo                                                                                                 |

Las del 8-nov (la pausa, sección 8 de la [0142](../decisiones/0142-la-pausa-del-8-nov.md)), la de las
facturas ([0138](../decisiones/0138-el-reloj-de-los-documentos-y-la-auditoria-de-las-facturas.md)) y la de
T6 · 1 ([0129](../decisiones/0129-quitar-la-empresa-y-la-auditoria-de-t6-1.md)) están escritas en su decisión.

## Cómo se escribe una

Un fichero aquí, `auditoria-AAAA-MM-DD-de-que.md`, con: **qué se miró** (los puntos de la lista) ·
**cómo** (qué se llamó, con qué rol y qué plan) · **qué salió**, de más grave a menos · **qué se
arregló**, con su prueba · y **qué queda**, con su entrega. Y su fila en la tabla de arriba.
