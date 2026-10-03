# ESTADO DEL PROYECTO

Última actualización: 3 de octubre de 2026 · **Antes de M8. El repaso del 3-oct (el atún, anular y el logo), en su pull request. C · El chat, contestado: lo siguiente es C1**

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
> | Por qué está hecho así            | [`docs/decisiones/`](docs/decisiones/LEEME.md) (72)                                          |
> | Lo legal, y lo ya investigado     | [`docs/legal/`](docs/legal/cumplimiento.md) · [lo investigado](docs/legal/lo-investigado.md) |
> | Lo que cuesta cada local          | [`docs/coste-por-local.md`](docs/coste-por-local.md)                                         |
> | Lo que hizo cada entrega          | [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)                         |
> | Lo aprendido fallando (140)       | [`docs/lecciones.md`](docs/lecciones.md)                                                     |
> | Los pasos de Richi                | [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)                                     |

---

## 1 · Dónde estamos · producción leída el 2-oct, en solo lectura

|               |                                                                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminado** | **M0** a **M6½** · **M7** (las compras) · y de «antes de M8»: A1, E1, V, O, E2, L, A2, R1, R2, **H · Horarios** (H1 y H2) e **I · La app instalable**, con sus repasos                                                                                     |
| **En curso**  | **El repaso del 3-oct** ([0072](docs/decisiones/0072-el-repaso-del-3-oct.md)), con la migración **0055**: sin fusionar, migrar ni desplegar. Después, **C1 · Hablar**: Richi dijo sí a las seis de C ([0071](docs/decisiones/0071-las-respuestas-de-c.md)) |
| **`main`**    | Todo fusionado hasta la **#87** (2-oct): el plan de C. I, migrada, desplegada e instalada por Richi                                                                                                                                                        |
| **Base**      | Supabase, **54 de 54** migraciones. 84 tablas, todas con seguridad por filas. Con el repaso, 55                                                                                                                                                            |
| **API**       | Desplegada con I: **66 consultas y 137 comandos**, comprobada el 2-oct. Con el repaso serán **66 y 138**                                                                                                                                                   |
| **Sitio**     | `estook.com`, `/app/`, `/carta/<local>` y `/admin/`, en GitHub Pages. Se publica solo al fusionar                                                                                                                                                          |
| **Pruebas**   | **1.580** unitarias y de base con el repaso, en verde; las de I y los avisos, en los veintiséis momentos de `pnpm prueba:semana`; y la batería de pantalla                                                                                                 |
| **Copias**    | **No hay ninguna.** La semanal está escrita y **aplazada por Richi hasta la mudanza de alojamiento** ([0065](docs/decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)). No cuesta nada: se puede encender cualquier día                             |

### El orden ([0061](docs/decisiones/0061-el-orden-y-la-infraestructura.md), y el chat adelantado en la [0067](docs/decisiones/0067-pro-a-99-el-chat-adelantado-y-el-plan-de-h.md))

```
ANTES DE M8   H · Horarios → I · La app instalable → C · El chat → A3 · Vendedores → A4 · Ventas del admin
FASE 2        M8 → M9 → M10
ESTOOK TPV    M16a · La jornada → M20 → M19a · Estook Link → M20A → M20B → M20C
DESPUES       M11 → M12 → M13 → M14 → M15 → M16b · APPCC → M17 → M18 → M19b → Fases 5, 6 y 7
```

**H, entera en producción** ([0068](docs/decisiones/0068-las-respuestas-de-h.md), plan en [`docs/h-horarios.md`](docs/h-horarios.md)): la persona sin correo ([0057](docs/decisiones/0057-quien-es-quien-en-el-tpv.md)), los fichajes listos para el registro horario digital ([0062](docs/decisiones/0062-lo-legal.md)), los PDF y el horario de la semana, publicado para todo el equipo ([0069](docs/decisiones/0069-el-horario.md)).

**I, en producción e instalada por Richi** ([0070](docs/decisiones/0070-la-app-instalable.md), plan en [`docs/i-la-app-instalable.md`](docs/i-la-app-instalable.md)): Estook en la pantalla de inicio, **fichar y apuntar mermas sin señal** (también en el aparato del local, con el PIN cifrado), lo último que se vio sin conexión, y **los avisos al móvil**, que cada uno elige qué y cuándo. **No suma dinero** y no hace falta cuenta de Apple ni de Google; los **dos secretos VAPID** los puso Richi.

**Los PDF** los imprime **Cloudflare Browser Run**, gratis hasta unos 400 al día, con la cuenta de Richi desde el 30-sep. La hoja de cálculo del registro no depende de nada.

### Lo que todavía NO está en la app

Para que nadie dé por hecho lo que solo está escrito:

- **Estook TPV, Estook Link, la facturación, Fogón, los escandallos, la carta por platos, el APPCC y el chat**: escritos, sin construir. Cada uno dice su módulo en el Plan.
- **Del horario, lo que no entra en H**: que Fogón lo proponga (M22), cambiar turnos entre compañeros y vacaciones con saldo (M13), las vistas de mes y día (M14), y mandarlo al chat (C). **Unir dos personas** que resulten ser la misma, con M13.
- **Sin conexión, solo fichar y apuntar mermas**: pedidos, inventarios y recibir mercancía necesitan señal.
- **Nadie ha pagado de verdad.** Un pago en modo prueba (Pizzeriacazzo, 26-sep).
- **Nada se borra solo**: los plazos de [`conservacion-de-datos.md`](docs/legal/conservacion-de-datos.md) los aplicará M27. **Ni hay exportación completa del negocio.**
- **Los textos legales de la web y los de `docs/legal/` son borradores**, sin revisar por un asesor.
- **De las veinte mejoras, diecisiete en producción** (con I, la 14 y la 15); del admin, la puerta y los clientes (faltan A3 y A4); ni recuperar la contraseña por correo.

### Lo que hay en producción

Cinco organizaciones reales y tres de ejemplo: `ikatz` (la de Richi, de la casa), `pizzeriacazzo` (de Santi, pagada en modo prueba), y `burger-king`, `prueba1` y `prueba1-1`, de prueba. Dos administradores, los dos con segundo factor.

---

## 2 · Lo que es de Richi

**Ahora, en este orden** (paso a paso en [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)):

1. **El repaso del 3-oct**: fusionar, `.\estook.cmd bd:migrar` (la 0055), desplegar la API y `bd:comprobar-api` (66 y 138). Después, **anular la venta del atún** en IKATZ y mirar los otros tres en negativo.
2. **Si no lo has hecho ya, montar y publicar una semana de verdad** en IKATZ, y mirar «Mi turno» en el móvil de alguien del equipo.

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

**Decidido el 1-oct** (0070): **I en una entrega**; lo último que se vio, sin señal; el aparato del local sin wifi; **cada uno elige cuándo suena el móvil** (en su turno, o fuera de sus horas de silencio); «suele llegar hacia las…» opcional; y **que ningún aviso se quede sin ver**. **Imprimir en la cocina** ya estaba: es Estook Link (M19a). **Y el 30-sep** (0067 y 0068): **el chat se adelanta** a después de la app instalable; **Pro a 99 € y Cadena a 89 €**, ya en producción; y **las seis de H**: dos entregas, el aparato del local, la pausa (también en horario partido), libres y vacaciones, el equipo ve el horario publicado de todos (sin euros) y los PDF con Cloudflare. **Mandar el horario al chat** llega con C. **Todo en Cloudflare, no**: en la mudanza se va la web; la base, la API y los ficheros siguen en Supabase.

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

**Con el repaso del 3-oct en producción, C1 · Hablar**, en su rama, con las respuestas de la [0071](docs/decisiones/0071-las-respuestas-de-c.md). Lo que cambia al segundo, que I dejó fuera, llega con él.

**Lo que decidió la IA por su cuenta**, para que Richi lo sepa: los cuatro de «Lo que decidí al construirlo» de la [0072](docs/decisiones/0072-el-repaso-del-3-oct.md), como que una merma no se confirme (no puede pasar de lo que hay) y que solo se anule lo de 31 días; los dieciséis de «Lo que decido yo» de [`c-el-chat.md`](docs/c-el-chat.md), como que el aviso de «hay algo nuevo» no lleve el mensaje dentro; los once de «Lo que decidí al construirlo» de la [0070](docs/decisiones/0070-la-app-instalable.md), como que en blanco el pedido no avise o que un 403 no borre el móvil; subir Cadena a 89 € junto con Pro; los once puntos de «Lo que decido yo» de [`h-horarios.md`](docs/h-horarios.md); que abrir el aparato para fichar cierre la sesión de quien lo abre; que la pausa, de fábrica, no cuente como trabajo (lo dice la ley si el convenio calla); los seis de «Lo que decidí al construirlo» de la [0069](docs/decisiones/0069-el-horario.md), como que el correo del horario lleve lo suyo escrito y no un PDF; partir M16 en dos; guardar el texto de la Evolución en `docs/historia/` en vez de borrarlo; el 10 % de límite de descuento del jefe de sala, de fábrica; los plazos entre corchetes de [`conservacion-de-datos.md`](docs/legal/conservacion-de-datos.md); y, del coste, los supuestos marcados como tales y los dos umbrales de la prueba final (que Pro a tope deje un 60 %, y que lo medido no se separe más de un 20 %).

**Lo que ESTADO llevaba hasta hoy** —las decisiones una a una, lo de cada entrega de E2 a R2 y la lista larga de lo que no se toca— está entero en [`docs/historia/ESTADO-hasta-el-30-sep-2026.md`](docs/historia/ESTADO-hasta-el-30-sep-2026.md), y lo que queda preparado para cada módulo, en [el mapa](docs/MAPA-de-modulos.md).
