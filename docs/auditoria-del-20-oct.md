# La auditoría del 20-oct

> Una auditoría entera de Estook App, pedida por Richi el 20 de octubre de 2026: seguridad,
> permisos, datos, cálculos, IA, pantallas y pruebas. **Sin el TPV ni lo que no existe.**
> Lo hecho se resume en la [0101](decisiones/0101-la-auditoria-del-20-oct.md); aquí está lo
> mirado, la evidencia, lo que queda y lo que no se ha podido comprobar.
>
> Se distingue siempre: **confirmado** (visto fallar, con prueba), **sospecha** (razonada, sin
> verla fallar) y **mejora** (no es un fallo).

## 1 · Alcance y cómo se ha hecho

| Qué                      | Cómo                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Código**               | El servidor (despachador, puertas, sesión, `postgres.ts`, la capa HTTP), el dominio de dinero (dinero, coste, almacén, compras, escandallo, IVA, cierre, objetivos, equipo), Fogón entero, el chat, el campo de precio, el trabajador de servicio y la política de seguridad                                                                              |
| **Base**                 | Las 77 migraciones en una base efímera: 120 tablas, **todas con seguridad por filas**; las 68 funciones que se saltan las políticas (`security definer`), **todas con `search_path` fijo**; lo que puede la API en cada tabla                                                                                                                             |
| **La API, atacada**      | Una prueba nueva lanza **las 96 consultas y los 211 comandos** desde otra organización (Elena, dirección de Grupo Costa; Vera, gerente de Bar Ribera) con los ids de Bar Centro, vigilando lo que contestan y **cada fila de la base**, contraseñas y sesiones incluidas; y cada consulta con cada persona de ejemplo, buscando importes que su rol no ve |
| **Producción**           | **Solo lectura**, en transacciones `read only`: el libro de IKATZ rehecho movimiento a movimiento, las compras de la semana cuadradas a mano, las direcciones de crear cuenta, las migraciones y el despliegue. **No se ha escrito nada en producción**                                                                                                   |
| **Pantallas**            | 28 pantallas con datos de ejemplo, a 320 y 375 px, midiendo desbordes, errores y «se nos ha roto»; y capturas mirando una a una                                                                                                                                                                                                                           |
| **El chat intermitente** | El rastro de la vuelta que falló en GitHub (19-oct), fotograma a fotograma                                                                                                                                                                                                                                                                                |
| **Servicios de fuera**   | **Ninguno de verdad**: Fogón, Stripe, Google, el correo y el móvil, con sus dobles de prueba                                                                                                                                                                                                                                                              |

## 2 · Lo encontrado

### Confirmado y arreglado

| Gravedad  | Qué                                                                                        | Evidencia                                                                                                   | Causa                                                                                            |
| --------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Alta**  | Food cost del Panel, Servicio y objetivos con la caja **con IVA**                          | 30 € de género para 110 € de caja: **27,3 %** antes, **30 %** ahora (prueba en rojo con el código viejo)    | El Panel se quedó con la cuenta de M7; la 0079 y la 0099 ya decían «sin IVA»                     |
| **Alta**  | Anular una entrada dejaba el **precio medio sucio**                                        | 10 kg a 5 € + 10 kg a 500 € anulados: **203,20 €/kg** antes, **5,40 €/kg** ahora (rojo con el código viejo) | La anulación solo restaba la cantidad                                                            |
| **Media** | **«Opciones de la conversación» a veces no se abría** (la prueba intermitente)             | Rastro de GitHub: toque en y=26, botón en y=86; pruebas nuevas en rojo siempre con el código viejo          | La hoja de retirar subía el chat; al cerrarla, el chat bajaba 400 ms después, bajo el dedo       |
| **Media** | Fogón: **lo contestado y rechazado no contaba** para el tope                               | Prueba: la llamada que no se entiende no quedaba apuntada                                                   | El fallo deshacía la transacción con el apunte dentro                                            |
| **Media** | **Una zona horaria inventada rompía el local** (500 en cada pantalla con fecha)            | El barrido guardó «2026-10-19» y crear proveedor, tablón e inventario dieron excepción                      | `guardar_donde_esta` aceptaba cualquier texto, y pisaba la zona si no se mandaba                 |
| **Media** | Pedido sugerido de **403 cajas** con un descuadre de −1.994 kg                             | Prueba del dominio                                                                                          | Restaba el negativo entero                                                                       |
| **Media** | Crear cuenta: el **tope por dirección se saltaba** con basura delante en `X-Forwarded-For` | Prueba: la undécima pasaba                                                                                  | Con dirección nula la función no contaba                                                         |
| **Media** | «Compraste» del food cost real contaba lo del alta                                         | Prueba: 30 € de alta salían como compra                                                                     | La pantalla llamaba compra a toda entrada                                                        |
| **Baja**  | El precio escrito con IVA **cambiaba un céntimo** al salir del campo                       | 1 de cada 6 precios al 21 %; prueba de pantalla: «0,32» → «0,31» con el código viejo                        | Se guarda sin IVA y al céntimo, y se volvía a calcular                                           |
| **Baja**  | «Lo que cobra» pedía el **bruto**                                                          | El texto decía «en bruto»                                                                                   | Sin la Seguridad Social ni las pagas extra, el coste de personal sale hasta un tercio por debajo |
| **Baja**  | Una prueba que pasaba **sin mirar nada** (el food cost del Panel contra Servicio)          | Comparaba dos cuentas con IVA en una semana sin género gastado                                              | Ver lección 207                                                                                  |

### Confirmado y sin arreglar (y por qué)

| Gravedad  | Qué                                                                                                                                | Por qué no                                                                                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Media** | La dirección de quien llama se lee de la **primera** de `X-Forwarded-For`, que puede poner el cliente                              | Depende de cómo reenvía Supabase, y no se puede comprobar sin escribir en producción. Hay que mirarlo con un registro de las cabeceras                                                                                                          |
| **Media** | Dependencias con avisos: **PDF.js 5** (alta: código al abrir un PDF malicioso), React Router 6 (moderada), Hono 4.13.5 (moderadas) | PDF.js solo abre el PDF que la persona elige para su carta, y la política `script-src 'self'` frena lo inyectado; las de Hono son de partes que la API no usa. Subir PDF.js a 6 y React Router a 7 son cambios mayores: con sus pruebas, aparte |
| **Baja**  | A 320 px el botón flotante «+» tapa el «−» del primer producto y parte de «Copiar la semana anterior»                              | Al bajar, el «+» se aparta; moverlo cambia todas las pantallas y las capturas de referencia                                                                                                                                                     |
| **Baja**  | Un local de **Canarias** no tiene cómo ponerse su hora: fichajes, jornada y registro, con la de Madrid                             | Hoy no hay ninguno; es una decisión de producto (¿sale del territorio fiscal?)                                                                                                                                                                  |
| **Baja**  | El horario cuenta las horas **planificadas** con la hora del reloj: la noche del cambio de hora, 8 h en vez de 9                   | Los fichajes sí se cuentan bien (con instantes); es solo lo planificado                                                                                                                                                                         |
| **Baja**  | `el_alta` enseña los **objetivos en %** a la camarera y al cocinero                                                                | No son importes; se decide si es dato del gerente                                                                                                                                                                                               |

### Sospechas y riesgos (sin verlos fallar)

- **Fogón llama a Anthropic con la transacción de la base abierta**: con una foto, 5–20 s ocupando una conexión del agrupador. Con muchos locales a la vez, las demás peticiones esperarían. Cambiarlo es partir la llamada en dos transacciones.
- **Interbloqueos**: los comandos que tocan varios productos los bloquean en el orden de sus líneas; dos a la vez en orden contrario se bloquearían y uno fallaría (se reintenta con su clave). No se ha visto.
- **El PIN del aparato de fichar**: 4 cifras, diez fallos paran el aparato cinco minutos. Con la tablet en la mano y tiempo, se acaba acertando el de alguien del equipo.
- **El libro ya no se rehace solo con `reconstruir`**: las revaloraciones de la 0076 ponen el precio a mano. Lo nuevo (`elMedioSinLoAnulado`) las tiene en cuenta; lo que use `reconstruir` en el futuro, también tendrá que hacerlo.
- **Precisión de lo muy barato en gramos**: el coste se guarda en milésimas de céntimo por gramo; por debajo de 0,50 €/kg el redondeo puede pasar del 1 %. En dinero, céntimos.

### Mirado y en orden

- **Ningún dato de un negocio se lee ni se toca desde otro** en las 307 operaciones (87 «no existe», 37 «sin permiso», ni una fila de Bar Centro cambiada, contraseñas y sesiones incluidas). Y se comprobó que la prueba lo caza: con una política quitada a propósito, sale en rojo.
- **Ningún importe llega a quien no lo ve**: cocinero, camarera, gestoría y jefe de cocina, en las 96 consultas.
- **El libro de IKATZ cuadra**: 548 movimientos de 44 productos rehechos uno a uno; solo difieren los 9 «Revalorado» de la 0076, que fueron a propósito. **Las compras de la semana (584,11 €) son la suma exacta** de las entradas.
- **Dos apuntes a la vez no se pisan**: cada camino que apunta en el libro bloquea antes el producto.
- **Un doble toque apunta una vez** (comprobado en Chrome y en Safari).
- **Fogón** no sabe más que quien pregunta (el resumen sale de sus consultas, sin importes si no los ve), no guarda nada solo (devuelve borradores; el horario va al borrador) y lo que lee en una foto es un dato, no una orden.
- **La carta pública** solo enseña lo que el local ya enseña al mundo.
- **Las fechas y el cambio de hora** del domingo 25: los fichajes se cuentan con instantes.
- **La seguridad del navegador**: el token va en una cabecera, no se pinta HTML de nadie y la política de seguridad no deja ejecutar código de fuera.
- **Las pantallas**: 28, a 320 y 375 px, sin desbordes ni errores.

## 3 · Lo que no se ha podido comprobar

- **Lo que pasa con servicios de verdad** (Anthropic, Stripe, Google, Resend, los avisos al móvil): no se han usado sin permiso.
- **Un iPhone de verdad**: el teclado, la hoja y el chat se han probado con el motor de Safari de Playwright, no con un teléfono.
- **La carga**: no se ha medido con muchos locales a la vez (ver Fogón e interbloqueos).
- **Cómo reenvía Supabase la dirección de quien llama** (ver arriba).
- **El admin y la web, a fondo**: el barrido cubre sus operaciones (todas contestan «sin permiso» desde la app), pero sus pantallas no se han recorrido una a una.

## 4 · Cómo está Estook App

**Sólida en lo que más importa**: la separación entre negocios y entre roles aguanta un ataque a toda la API, el libro de almacén cuadra con la realidad de IKATZ y las decisiones de seguridad están bien pensadas y escritas. Lo que fallaba eran **cuentas que se quedaron atrás cuando cambió la regla** (el food cost con IVA, anular sin el precio medio) y **detalles de pantalla bajo el dedo**: justo lo que se ve trabajando con datos reales, como hace Richi.

**Para el primer cliente que pague** faltan cosas que ya están escritas en `ESTADO.md` y no son de código: la copia de seguridad (aplazada a la mudanza), el contrato de encargado y los textos legales revisados. De lo técnico, lo primero sería mirar `X-Forwarded-For` en producción y subir PDF.js.

## 5 · Las pruebas

| Qué                                                                                                        | Resultado                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verifica` (tipos, lint, formato, dependencias, textos, grafo, coste y todas las unitarias y de base) | Ver el pull request                                                                                                                                                                                                                                                                                                                   |
| Pruebas nuevas de base (`la-auditoria-del-20-oct`, `nadie-toca-lo-de-otro-negocio`) y del dominio          | En verde; cada una vista en rojo con el arreglo quitado                                                                                                                                                                                                                                                                               |
| `el-chat.spec.ts`, 10 veces                                                                                | **60 de 60** en `movil-pequeno` y **60 de 60** en `movil-safari`                                                                                                                                                                                                                                                                      |
| Pruebas nuevas de pantalla (`la-auditoria-del-20-oct.spec.ts`)                                             | En verde en escritorio, móvil y Safari; la del IVA, en rojo con el campo viejo                                                                                                                                                                                                                                                        |
| La batería de pantalla entera, en local (1.062, los tres navegadores a la vez)                             | 944 bien y 55 mal. **Las que crean cuentas caían por un fallo mío** (lección 212), ya arreglado; repetidas las 16 con fallos, sin nada más en marcha: **343 bien y 1 mal**. Esa (`el-pago.spec.ts`, volver del portal en Safari) falla igual sobre `main` sin la auditoría: es del motor de Safari en Windows; en GitHub (Linux) pasa |
