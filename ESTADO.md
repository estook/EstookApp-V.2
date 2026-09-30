# ESTADO DEL PROYECTO

Última actualización: 30 de septiembre de 2026 · **Antes de M8. La auditoría profunda, hecha y aprobada: los documentos ordenados y tres pull requests por fusionar. Después, H · Horarios**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo último.
> **Nunca puede afirmar algo que no sea cierto en ese momento**, y **no pasa de 150 líneas**
> ([0063](docs/decisiones/0063-una-fuente-por-tema.md)): lo que ya pasó vive en su sitio.
>
> | Para saber…                         | Se lee                                                                                  |
> | ----------------------------------- | --------------------------------------------------------------------------------------- |
> | Qué es Estook                       | [Manifiesto](docs/maestros/Estook-Manifiesto.md)                                        |
> | Cómo está hecho, y qué no se toca   | [Arquitectura](docs/maestros/Estook-Arquitectura.md) (lo que no se toca, capítulo 17)   |
> | Cómo se trabaja y en qué orden      | [Plan](docs/maestros/Estook-Plan-de-Desarrollo.md) · [el mapa](docs/MAPA-de-modulos.md) |
> | Quién ve qué                        | [Roles](docs/maestros/Estook-Roles-y-Administracion.md)                                 |
> | Qué desencadena cada cambio         | [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)                      |
> | Estook TPV y la facturación         | [Anexo](docs/maestros/Estook-Anexo-TPV-y-Facturacion.md), **que manda en lo suyo**      |
> | Por qué está hecho así              | [`docs/decisiones/`](docs/decisiones/LEEME.md) (64)                                     |
> | Lo legal, y lo que espera al asesor | [`docs/legal/`](docs/legal/cumplimiento.md)                                             |
> | Lo que hizo cada entrega            | [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)                    |
> | Lo aprendido fallando (128)         | [`docs/lecciones.md`](docs/lecciones.md)                                                |
> | Los pasos de Richi                  | [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)                                |

---

## 1 · Dónde estamos · producción leída el 30-sep, en solo lectura

|                  |                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminado**    | **M0** a **M6½** · **M7** (las compras) · y de «antes de M8»: A1, E1, V, O, E2, L, A2, R1 y R2, con sus repasos                                                                                           |
| **Por fusionar** | **#79** · la prueba de los martes y la copia de seguridad semanal → **#78** · los maestros y Estook TPV → **#80** · la auditoría profunda, los documentos. Ninguna lleva migración ni despliegue |
| **Ahora**        | Que Richi fusione las tres, ponga los secretos de la copia y la lance una vez (apartado 2). Después, **H · Horarios**                                                                                     |
| **`main`**       | Todo fusionado hasta la **#77** (R2, 27-sep)                                                                                                                                                              |
| **Base**         | Supabase, **51 de 51** migraciones. 73 tablas, todas con seguridad por filas                                                                                                                              |
| **API**          | Desplegada con R2: **58 consultas y 117 comandos**, y el reloj latiendo cada hora                                                                                                                         |
| **Sitio**        | `estook.com`, `/app/`, `/carta/<local>` y `/admin/`, en GitHub Pages. Se publica solo al fusionar                                                                                                         |
| **Pruebas**      | **1.450** unitarias y de base, en verde en veintiséis días y horas distintos (`pnpm prueba:semana`), y la batería de pantalla                                                                             |
| **Copias**       | **Ninguna hecha todavía.** La semanal está escrita en la #79 y empieza cuando Richi ponga sus secretos ([`docs/copias-de-seguridad.md`](docs/copias-de-seguridad.md))                                     |

### El orden ([0061](docs/decisiones/0061-el-orden-y-la-infraestructura.md))

```
ANTES DE M8   H · Horarios  →  I · La app instalable  →  A3 · Vendedores  →  A4 · Ventas del admin
FASE 2        M8 → M9 → M10
ESTOOK TPV    M16a · La jornada → M20 → M19a · Estook Link → M20A → M20B → M20C
DESPUES       M11 → M12 → M13 → M14 → M15 → M16b · APPCC → M17 → M18 → M19b → Fases 5, 6 y 7
```

**H lleva dentro**: la entrega 3 de M7, el cuadrante con el coste en vivo, las horas extra, el PDF de los informes, **la persona sin correo** ([0057](docs/decisiones/0057-quien-es-quien-en-el-tpv.md)) y **los fichajes listos para el registro horario digital** ([0062](docs/decisiones/0062-lo-legal.md)). **Y antes de escribirla se decide el motor de los PDF**: Chromium no cabe en las funciones de Supabase (0002).

### Lo que todavía NO está en la app

Para que nadie dé por hecho lo que solo está escrito:

- **Estook TPV, Estook Link, la facturación, Fogón, los escandallos, la carta por platos, el APPCC y el chat**: escritos, sin construir. Cada uno dice su módulo en el Plan.
- **Nada funciona sin conexión.** No hay service worker: llega con la entrega I.
- **Nadie ha pagado de verdad.** Un pago en modo prueba (Pizzeriacazzo, 26-sep).
- **Nada se borra solo**: los plazos de [`conservacion-de-datos.md`](docs/legal/conservacion-de-datos.md) los aplicará M27. **Ni hay exportación completa del negocio.**
- **Los textos legales de la web y los de `docs/legal/` son borradores**, sin revisar por un asesor.
- **De las veinte mejoras, catorce**; del admin, la puerta y los clientes (faltan A3 y A4); ni avisos al móvil, ni recuperar la contraseña por correo.

### Lo que hay en producción

Cinco organizaciones reales y tres de ejemplo: `ikatz` (la de Richi, de la casa), `pizzeriacazzo` (de Santi, pagada en modo prueba), y `burger-king`, `prueba1` y `prueba1-1`, de prueba. Dos administradores, los dos con segundo factor.

---

## 2 · Lo que es de Richi

**Ahora, en este orden** (paso a paso en [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)):

1. **Fusionar la #79.**
2. **Poner los secretos de la copia** en GitHub (`URL_DE_LA_COPIA`, `CLAVE_DE_LA_COPIA` y `CLAVE_DE_SERVICIO_COPIA`) y **lanzar «Copia de seguridad» una vez**. Tiene que salir en verde: es la primera vez que corre contra la base de verdad.
3. **Fusionar la #78**, y después **la #80**, la de la auditoría profunda.
4. **Contratar al asesor** (fiscal, y laboral y de datos) y pasarle [`docs/legal/preguntas-al-asesor.md`](docs/legal/preguntas-al-asesor.md). Ya no espera al TPV.
5. **Contestar lo del chat** (abajo, el 1): hace falta antes de H.

**Con fecha o con condición:**

| Qué                                                       | Cuándo                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Supabase Pro** (copia diaria)                           | En unas semanas; **como muy tarde, antes del primer cliente que pague**         |
| **Cloudflare Pages y el repositorio en privado**          | Antes del primer cliente que pague o de vender Estook TPV, lo que llegue antes  |
| **El contrato de encargado**, revisado y en el alta       | Antes del primer cliente que pague                                              |
| **La oferta de Verifacti**                                | **Caduca hacia el 19 de octubre** ([el precio](docs/el-precio-de-verifacti.md)) |
| **La sociedad o el alta de autónomo**, y Stripe de verdad | Para cobrar de verdad                                                           |
| **Las facturas de la cuota conformes a VeriFactu**        | 1-ene-2027 si es sociedad; 1-jul-2027 si es autónomo                            |

**Sin decidir, y es de Richi:**

1. **El chat de Estook**: ¿con Horarios o aparte? Mientras, el horario se comparte en PDF.
2. **Si Fogón habla antes de M22**: falta elegir modelo, presupuesto por local y caché.
3. **Para Estook TPV** (Anexo, «Lo que sigue pendiente de Richi»): en qué planes entra, el soporte en horario de servicio, si el camarero cobra por defecto y qué datáfono conectado va primero.

**Cuando quiera:** las alertas de Dependabot, quitar «Automatically expose new tables» en Supabase y regenerar las claves de Google que pasaron por un chat.

**Las claves nunca por el chat**: se ponen como secretos y se dice solo el nombre ([`config/claves.md`](config/claves.md)). **Y no se toca jamás el borrado permanente de un NIF en Verifacti.**

---

## 3 · Lo que no se puede olvidar

1. **Estook va a ser productor de un sistema de facturación.** Nada de facturación llega a producción sin las once condiciones del capítulo 9 del Anexo, y la primera es el asesor.
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
- **GitHub:** `main` protegida, con tres comprobaciones obligatorias —`Calidad`, `Construccion y presupuestos` y `Migraciones reversibles`—. **Nunca añadir `Construir` ni `Publicar`.** Y el flujo nuevo, `Copia de seguridad`, los lunes de madrugada.
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

**Fusionar las tres ramas** (apartado 2). **Después, H · Horarios**, que empieza por tres cosas escritas antes de programar: las preguntas a Richi que no estén contestadas, el motor de los PDF y la migración que hace opcional el correo de una persona.

**Lo que decidió la IA por su cuenta en la auditoría**, para que Richi lo sepa: partir M16 en dos; guardar el texto de la Evolución en `docs/historia/` en vez de borrarlo; poner como condición de Cloudflare «antes del primer cliente de pago»; el 10 % de límite de descuento del jefe de sala, de fábrica; y los plazos de [`conservacion-de-datos.md`](docs/legal/conservacion-de-datos.md) marcados entre corchetes, que son propuestas para el asesor.

**Lo que ESTADO llevaba hasta hoy** —las decisiones una a una, lo de cada entrega de E2 a R2 y la lista larga de lo que no se toca— está entero en [`docs/historia/ESTADO-hasta-el-30-sep-2026.md`](docs/historia/ESTADO-hasta-el-30-sep-2026.md), y lo que queda preparado para cada módulo, en [el mapa](docs/MAPA-de-modulos.md).
