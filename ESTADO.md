# ESTADO DEL PROYECTO

Última actualización: 9 de octubre de 2026 · **M8: la primera entrega en producción (#96) y la segunda construida, en su pull request (0079)**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo último.
> **Nunca puede afirmar algo que no sea cierto en ese momento**, y **no pasa de 150 líneas**
> ([0063](docs/decisiones/0063-una-fuente-por-tema.md)): lo que ya pasó vive en su sitio.
>
> | Para saber…                       | Se lee                                                                                       |
> | --------------------------------- | -------------------------------------------------------------------------------------------- |
> | Qué es Estook                     | [Manifiesto](docs/maestros/Estook-Manifiesto.md)                                             |
> | Cómo está hecho, y qué no se toca | [Arquitectura](docs/maestros/Estook-Arquitectura.md) (lo que no se toca, capítulo 17)        |
> | Cómo se trabaja y en qué orden    | [Plan](docs/maestros/Estook-Plan-de-Desarrollo.md) · [el mapa](docs/MAPA-de-modulos.md)      |
> | Quién ve qué                      | [Roles](docs/maestros/Estook-Roles-y-Administracion.md)                                      |
> | Qué desencadena cada cambio       | [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)                           |
> | Estook TPV y la facturación       | [Anexo](docs/maestros/Estook-Anexo-TPV-y-Facturacion.md), **que manda en lo suyo**           |
> | Por qué está hecho así            | [`docs/decisiones/`](docs/decisiones/LEEME.md) (79)                                          |
> | Lo legal, y lo ya investigado     | [`docs/legal/`](docs/legal/cumplimiento.md) · [lo investigado](docs/legal/lo-investigado.md) |
> | Lo que cuesta cada local          | [`docs/coste-por-local.md`](docs/coste-por-local.md)                                         |
> | Lo que hizo cada entrega          | [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)                         |
> | Lo aprendido fallando (160)       | [`docs/lecciones.md`](docs/lecciones.md)                                                     |
> | Los pasos de Richi                | [`docs/pasos-de-m8.md`](docs/pasos-de-m8.md)                                                 |

---

## 1 · Dónde estamos · producción leída el 9-oct por la mañana, en solo lectura

|               |                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Terminado** | **M0** a **M6½** · **M7** (las compras) · y **«antes de M8» entero**: A1, E1, V, O, E2, L, A2, R1, R2, H, I, sus repasos, el del 3-oct, **C · El chat**, **A3 · Vendedores** y **A4 · Ventas** · y **M8, la primera entrega**  |
| **En curso**  | **M8, la segunda entrega** ([0079](docs/decisiones/0079-lo-gastado-y-la-desviacion.md)): construida, migración **0061**, en la **#97**. **Sin fusionar, migrar ni desplegar**                                                  |
| **`main`**    | Todo fusionado hasta la **#96** (8-oct): M8, la primera entrega                                                                                                                                                                |
| **Base**      | Supabase, **60 de 60** migraciones (la 0060 aplicada). **104 tablas** (84 de `estook` y 20 de `plataforma`), todas con seguridad por filas. Con la 0061, 61 y 106                                                              |
| **API**       | Desplegada con la primera entrega de M8: **78 consultas y 169 comandos**, los avisos al móvil encendidos y el reloj latiendo (el último latido, 09:07 UTC). Con la segunda, **80 y 171**                                       |
| **Sitio**     | `estook.com`, `/app/`, `/carta/<local>` y `/admin/`, en GitHub Pages. Se publica solo al fusionar                                                                                                                              |
| **Pruebas**   | **1.772** unitarias y de base con M8, en verde; **641** de pantalla en local: 622 en verde, 17 de Safari saltadas y 2 de carga (chat y Panel) que pasan al repetirlas (8-oct)                                                  |
| **Copias**    | **No hay ninguna.** La semanal está escrita y **aplazada por Richi hasta la mudanza de alojamiento** ([0065](docs/decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)). No cuesta nada: se puede encender cualquier día |

### El orden ([0061](docs/decisiones/0061-el-orden-y-la-infraestructura.md), y el chat adelantado en la [0067](docs/decisiones/0067-pro-a-99-el-chat-adelantado-y-el-plan-de-h.md))

```
ANTES DE M8   H · Horarios → I · La app instalable → C · El chat → A3 · Vendedores → A4 · Ventas del admin
FASE 2        M8 → M9 → M10
ESTOOK TPV    M16a · La jornada → M20 → M19a · Estook Link → M20A → M20B → M20C
DESPUES       M11 → M12 → M13 → M14 → M15 → M16b · APPCC → M17 → M18 → M19b → Fases 5, 6 y 7
```

**H, entera en producción** ([0068](docs/decisiones/0068-las-respuestas-de-h.md), plan en [`docs/h-horarios.md`](docs/h-horarios.md)): la persona sin correo ([0057](docs/decisiones/0057-quien-es-quien-en-el-tpv.md)), los fichajes listos para el registro horario digital ([0062](docs/decisiones/0062-lo-legal.md)), los PDF y el horario de la semana, publicado para todo el equipo ([0069](docs/decisiones/0069-el-horario.md)). **I, en producción e instalada por Richi** ([0070](docs/decisiones/0070-la-app-instalable.md), plan en [`docs/i-la-app-instalable.md`](docs/i-la-app-instalable.md)): Estook en la pantalla de inicio, **fichar y apuntar mermas sin señal** (también en el aparato del local, con el PIN cifrado), lo último que se vio sin conexión, y **los avisos al móvil**, que cada uno elige qué y cuándo. **No suma dinero** y no hace falta cuenta de Apple ni de Google; los **dos secretos VAPID** los puso Richi. **C1 · Hablar, en producción** desde el 6-oct ([0073](docs/decisiones/0073-c1-hablar.md), plan en [`docs/c-el-chat.md`](docs/c-el-chat.md)), **con su repaso** (#91, [0074](docs/decisiones/0074-el-repaso-de-c1.md)): canales y privados (que ni el dueño ve); texto, fotos, documentos y notas de voz; leído siempre a la vista; el mensaje sale al momento; **al segundo** y **en el móvil**, en tu turno. **Cero euros al mes.** Y **C2 · Lo oficial**, desde el 7-oct ([0075](docs/decisiones/0075-las-respuestas-de-c2.md)): de fábrica solo «Todo el equipo» («Cocina» y «Sala» se quitan: estaban vacías), los canales los crean **el gerente y los jefes** y se renombran y borran; **tres fijados** por canal; **«Confirmar que lo he leído»** con quién falta y un recordatorio al empezar su siguiente turno; **«Al chat»** en productos y pedidos; al publicar el horario, **«¿Avisar en Todo el equipo?»**; y **el correo del chat** a quien no tiene móvil. **El chat no traduce, nunca.**

**A3 · Vendedores, en producción** desde el 8-oct ([0076](docs/decisiones/0076-a3-los-vendedores.md), plan en [`a3-vendedores.md`](docs/a3-vendedores.md)): el vendedor es **una ficha del admin y no entra en Estook**; sus códigos, con **enlace y QR**; quien llega por el enlace ve el descuento y se registra **con el código ya escrito** (si no, la casilla); cada cliente dice **con quién y por dónde llegó**; cada código puede dar **un descuento del primer cobro mensual**; y las **cifras de cada vendedor**. **Las comisiones se pactan fuera.** El código **no se guarda en el navegador**: no hace falta aviso de cookies. **A4 · Ventas, en producción** desde el 8-oct ([0077](docs/decisiones/0077-a4-las-ventas.md), plan en [`a4-ventas.md`](docs/a4-ventas.md)): una pestaña **Ventas** en el admin, con doce cifras **sin IVA** y siete gráficas; **lo cobrado de verdad**, factura a factura y con las devoluciones restadas; **las visitas de los enlaces de vendedor**, un número por código y día; y **un correo cada lunes** a los admins. La foto de cada noche dice desde ahora cómo está cada cuenta: **las bajas y la cuota de cada mes cuentan desde el 8-oct**, y lo cobrado antes lo trae el reloj la primera mañana (en la base, todavía 0 cobros). Y dos arreglos: **Pausa paga** (sale en Pagando) y **la cuota es la que cobra Stripe** (Pizzeriacazzo, 79 €).

**M8, la primera entrega, en producción** desde el 9-oct ([0078](docs/decisiones/0078-las-respuestas-de-m8.md)): **cuenta quien lleva el almacén, a ciegas y en cajas y sueltas, y cierra quien tiene el permiso**, comparando con lo que decía el libro **a la hora de contar** (lo que entra entre medias no se pierde); «que lo recuenten» y descartar; **«Toca contar»** (lo que más vale cada semana, lo demás al mes), con su aviso los lunes y la hoja impresa; **el valor del almacén en cualquier fecha**; **los lotes se gastan solos, primero el que antes caduca**; y **el mínimo que propone Estook**. La desviación de los platos, la calibración y el food cost teórico **pasan a M9**. **La segunda, construida** ([0079](docs/decisiones/0079-lo-gastado-y-la-desviacion.md)), en **Movimientos → Desviación**: **el food cost real** sin IVA frente al objetivo de materia prima; **lo gastado de verdad** de cada producto entre sus dos últimos inventarios; **lo que falta de lo vendido tal cual**, emparejando una vez cada línea de la caja con su producto, con su causa probable; un aviso si al cerrar falta más del 3 %; y **la foto de la merma**, si se quiere.

### Lo que todavía NO está en la app (para que nadie dé por hecho lo que solo está escrito)

- **Estook TPV, Estook Link, la facturación, Fogón, los escandallos, la carta por platos y el APPCC**: escritos, sin construir. Cada uno dice su módulo en el Plan.
- **Del chat**, llamadas, un canal de toda la cadena y hablar con el proveedor. **Del admin**, lo que nos cuesta cada cliente (M26).
- **Del horario, lo que no entra en H**: que Fogón lo proponga (M22), cambiar turnos entre compañeros y vacaciones con saldo (M13) y las vistas de mes y día (M14). **Unir dos personas** que resulten ser la misma, con M13.
- **Sin conexión, solo fichar y apuntar mermas**: pedidos y recibir mercancía necesitan señal; lo contado se guarda en el móvil, pero mandarlo también.
- **De M8, la segunda entrega, en producción**: está en su pull request. Y **«lo que falta» de lo que se cocina** espera a las fichas (M9).
- **Nadie ha pagado de verdad.** Un pago en modo prueba (Pizzeriacazzo, 26-sep).
- **Nada se borra solo**: los plazos de [`conservacion-de-datos.md`](docs/legal/conservacion-de-datos.md) los aplicará M27. **Ni hay exportación completa del negocio.**
- **Los textos legales de la web y los de `docs/legal/` son borradores**, sin revisar por un asesor.
- **De las veinte mejoras, diecisiete en producción** (con I, la 14 y la 15); del admin, la puerta, los clientes, los vendedores y las ventas; ni recuperar la contraseña por correo.

### Lo que hay en producción

Cinco organizaciones reales y tres de ejemplo: `ikatz` (la de Richi, de la casa), `pizzeriacazzo` (de Santi, pagada en modo prueba), y `burger-king`, `prueba1` y `prueba1-1`, de prueba. Dos administradores, los dos con segundo factor. Un vendedor dado de alta, con un código y ningún cliente traído todavía.

---

## 2 · Lo que es de Richi

**Ahora, en este orden** (paso a paso en [`docs/pasos-de-m8.md`](docs/pasos-de-m8.md)):

1. **M8, la segunda entrega**: fusionar, `.\estook.cmd bd:migrar` (la 0061), desplegar la API, `bd:comprobar-api` (80 y 171) y **probarlo**; y **la primera, con alguien de cocina**, si solo la miraste por encima.
2. **Mirar A4**: el 9-oct después de las 8, Pizzeriacazzo a **65,29 €** al mes y su cobro del 26-sep en «Cobrado»; el lunes 12-oct, el primer correo de la semana.
3. **Acabar de probar A3** con un vendedor «Prueba» aparte, y **C2** con alguien del equipo, si no lo has hecho ya (los dos, en [`pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)).
4. **Si no lo has hecho ya, montar y publicar una semana de verdad** en IKATZ, y mirar «Mi turno» en el móvil de alguien del equipo.

**Con fecha o con condición:**

| Qué                                                                                                                    | Cuándo                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **La mudanza, todo junto**: Cloudflare Pages, Supabase Pro, **la copia semanal encendida** y el repositorio en privado | Antes del primer cliente que pague o de vender Estook TPV, lo que llegue antes                                                                            |
| **El contrato de encargado**, revisado y en el alta                                                                    | Antes del primer cliente que pague                                                                                                                        |
| **La oferta de Verifacti**                                                                                             | **Caduca hacia el 19 de octubre**. Su web deja contratar desde 1 NIF: lo más probable es que no haya mínimo ([el precio](docs/el-precio-de-verifacti.md)) |
| **La sociedad o el alta de autónomo**, y Stripe de verdad                                                              | Para cobrar de verdad                                                                                                                                     |
| **Las facturas de la cuota conformes a VeriFactu**                                                                     | 1-ene-2027 si es sociedad; 1-jul-2027 si es autónomo                                                                                                      |

**Sin decidir, y es de Richi:**

1. **Fogón**: qué modelo es «el grande» y cuántos créditos lleva Pro. Se decide en M22, con lo medido ([el coste](docs/coste-por-local.md)).
2. **Para Estook TPV** (Anexo, «Lo que sigue pendiente de Richi»): el soporte en horario de servicio, si el camarero cobra por defecto, qué datáfono conectado va primero, y el tope de tickets dentro del precio.

**Cuando quiera:** las alertas de Dependabot, quitar «Automatically expose new tables» en Supabase y regenerar las claves de Google que pasaron por un chat. **Las claves nunca por el chat**: se ponen como secretos y se dice solo el nombre ([`config/claves.md`](config/claves.md)). **Y no se toca jamás el borrado permanente de un NIF en Verifacti.**

---

## 3 · Lo que no se puede olvidar

1. **Estook va a ser productor de un sistema de facturación.** Nada de facturación llega a producción sin las once condiciones del capítulo 9 del Anexo, y la primera es **la revisión de un profesional por escrito**. Lo investigado sin asesor sirve para diseñar, no para firmar.
2. **Un ticket o una factura emitidos no se tocan desde ningún sitio**: se corrigen con otro documento (regla 15 del Plan).
3. **Estook nunca tiene el dinero del local**, ni es entidad de pago, ni cobra comisión por cobro.
4. **No se inventa ni un campo ni un endpoint** de un servicio de fuera: primero su documentación oficial; hasta entonces, adaptador simulado. Y lo marcado **[VERIFICAR]** no se programa.
5. **Cada tema vive en un solo documento**, y los demás enlazan. En lo suyo manda el más específico; si dos se contradicen, se para y se pregunta.
6. **Las pruebas leen los documentos**: cambiar la tabla B5 del Plan pone la integración en rojo hasta que el código la siga.
7. **El repositorio es público**: ni datos personales ni nada que abra una puerta en los documentos.
8. **Un maestro no frena el producto**: si se queda corto, se propone lo mejor y se cambia el documento, con su decisión.

---

## 4 · Lo que está vivo

Dónde vive cada pieza, cada servicio y cada clave: [Arquitectura](docs/maestros/Estook-Arquitectura.md), capítulos 10 a 13, y [`config/claves.md`](config/claves.md). Lo que cambia y conviene tener a mano:

- **Base:** Supabase `efgtzujwjztihyiwgpwg`, Irlanda, **plan gratuito**. `.\estook.cmd bd:comprobar` la lee; `bd:comprobar-api`, la API.
- **GitHub:** `main` protegida, con tres comprobaciones obligatorias —`Calidad`, `Construccion y presupuestos` y `Migraciones reversibles`—. **Nunca añadir `Construir` ni `Publicar`.** El flujo `Copia de seguridad` corre los lunes y, sin secretos, solo deja un aviso.
- **El peso inicial** (26-sep): `app` 317,8 KB y `admin` 222,5. Se mide y no bloquea; manda la velocidad.
- **El 19 de octubre** GitHub pasa `ubuntu-latest` a Ubuntu 26: mirar la integración continua ese día.

---

## 5 · Cómo trabajamos

**Los comandos, con `.\estook.cmd`**, uno por recuadro: PowerShell no entiende `&&`.

1. **Todo en castellano**: el chat, los pasos, los documentos, los commits y el código.
2. **Primero fusionar, después migrar, después desplegar.**
3. **Una rama por entrega y un pull request.** Nada entra en `main` sin él.
4. **Ante la duda, preguntar**, explicado en llano y con una recomendación.
5. **Revisar lo propio antes de entregarlo.**
6. **A Richi, siempre sus pasos**: qué hacer, dónde y qué debe salir.
7. **GitHub entero en verde, mirado por dentro.**
8. **Una lección se convierte en prueba**, y una prueba nueva se ve fallar con el arreglo quitado.
9. **Una prueba con fechas se pasa la semana entera** (`pnpm prueba:semana`, lección 128).
10. **Si se toca una pantalla, `prueba:e2e:completa`**; y después de desplegar, `bd:comprobar-api`.

Las quince reglas, en el Plan (A1); el porqué de cada costumbre, en [`docs/lecciones.md`](docs/lecciones.md).

---

## 6 · El siguiente paso

**Con la segunda entrega de M8 en producción y probada, M8 queda terminado.** Lo siguiente es **M9 · Escandallos** (Plan, parte D): primero su plan, con las preguntas explicadas a Richi, y con lo que le pasó M8 —la desviación de los platos, la calibración y el food cost teórico, en la pantalla de Desviación—.

**Lo que decidió la IA por su cuenta**, para que Richi lo sepa: los quince de «Lo que decidí al construirlo» de la [0079](docs/decisiones/0079-lo-gastado-y-la-desviacion.md), como que «lo que falta» sea solo de lo vendido tal cual, que el food cost real se mida frente al objetivo hasta que haya teórico, o que entre dos inventarios se mida por posición en el libro; los doce de «Lo que decidí al construirlo» de la [0078](docs/decisiones/0078-las-respuestas-de-m8.md), como que «Toca contar» no salga en «Hoy» del Panel o que los lotes que ya había empiecen con lo que trajeron; los doce de «Lo que decido yo» de [`m8-inventario-mermas-y-desviacion.md`](docs/m8-inventario-mermas-y-desviacion.md), como que «Toca contar» elija por lo que se gasta, que la desviación nunca señale a nadie o que la hoja impresa vaya sin las cifras del libro; los once de «Lo que decido yo» de [`a4-ventas.md`](docs/a4-ventas.md) y los nueve de «Lo que decidí al construirlo» de la [0077](docs/decisiones/0077-a4-las-ventas.md), como que IKATZ no cuente, que con menos de diez clientes la pérdida se dé en «1 de 4», que Pausa salga en Pagando o que una visita repetida por la red cuente dos veces; los diez de «Lo que decido yo» de [`a3-vendedores.md`](docs/a3-vendedores.md) y los ocho de «Lo que decidí al construirlo» de la [0076](docs/decisiones/0076-a3-los-vendedores.md), como que el descuento no se cambie una vez puesto, que solo valga en el pago mensual o que con prueba se ponga al acabarla; los siete de «Lo que decido yo» de C2, al final de [`c-el-chat.md`](docs/c-el-chat.md), como quitar «Cocina» y «Sala» porque estaban vacías, y los ocho de «Lo que decidí al construirlo» de la 0075, como que el recordatorio de confirmar sea un aviso de la campana y que el correo del chat no lleve el texto de los mensajes; los seis de «Lo que decidí al construirlo» de la [0074](docs/decisiones/0074-el-repaso-de-c1.md), como que sin red no salga ninguno hasta que salga el primero; los nueve de «Lo que decidí al construirlo» de la [0073](docs/decisiones/0073-c1-hablar.md), como que el toque al segundo vaya por un canal público con nombre secreto y sin el mensaje, o que en el modo cocina estrecho se recoja el buscador y no el chat; los cuatro de «Lo que decidí al construirlo» de la [0072](docs/decisiones/0072-el-repaso-del-3-oct.md), como que una merma no se confirme (no puede pasar de lo que hay) y que solo se anule lo de 31 días; los dieciséis de «Lo que decido yo» de [`c-el-chat.md`](docs/c-el-chat.md), como que el aviso de «hay algo nuevo» no lleve el mensaje dentro; los once de «Lo que decidí al construirlo» de la [0070](docs/decisiones/0070-la-app-instalable.md), como que en blanco el pedido no avise o que un 403 no borre el móvil; subir Cadena a 89 € junto con Pro; los once puntos de «Lo que decido yo» de [`h-horarios.md`](docs/h-horarios.md); que abrir el aparato para fichar cierre la sesión de quien lo abre; que la pausa, de fábrica, no cuente como trabajo (lo dice la ley si el convenio calla); los seis de «Lo que decidí al construirlo» de la [0069](docs/decisiones/0069-el-horario.md), como que el correo del horario lleve lo suyo escrito y no un PDF; partir M16 en dos; guardar el texto de la Evolución en `docs/historia/` en vez de borrarlo; el 10 % de límite de descuento del jefe de sala, de fábrica; los plazos entre corchetes de [`conservacion-de-datos.md`](docs/legal/conservacion-de-datos.md); y, del coste, los supuestos marcados como tales y los dos umbrales de la prueba final (que Pro a tope deje un 60 %, y que lo medido no se separe más de un 20 %).

**Lo que ESTADO llevaba hasta hoy** —las decisiones una a una, lo de cada entrega de E2 a R2 y la lista larga de lo que no se toca— está entero en [`docs/historia/ESTADO-hasta-el-30-sep-2026.md`](docs/historia/ESTADO-hasta-el-30-sep-2026.md), y lo que queda preparado para cada módulo, en [el mapa](docs/MAPA-de-modulos.md).
