# ESTADO DEL PROYECTO

Última actualización: 20 de octubre de 2026 · **M10 · 1 · La carta que trabaja, en su pull request** (rama `m10-la-carta-que-trabaja`, migración **0078**, con la API, [0102](docs/decisiones/0102-m10-1-la-carta-que-trabaja.md)): agotados que vuelven solos y avisan a quien trabaja, el precio del cierre desde la carta, leer tu carta en PDF o foto y el equilibrio. **M10 · 2 espera cinco respuestas de Richi** ([el plan](docs/m10-la-carta-menus-y-analisis.md)). La auditoría del 20-oct, en producción

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo último, **en el mismo pull request que el trabajo**.
> **Nunca afirma algo que no sea cierto en ese momento**, **no pasa de 250 líneas** y ninguna línea de texto pasa de 700 caracteres
> ([0091](docs/decisiones/0091-estado-a-250-lineas-y-los-documentos-al-dia.md)); una prueba lo vigila. Lo que ya pasó vive en su sitio.
>
> | Para saber…                         | Se lee                                                                                                   |
> | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
> | Qué es Estook                       | [Manifiesto](docs/maestros/Estook-Manifiesto.md)                                                         |
> | Cómo está hecho, y qué no se toca   | [Arquitectura](docs/maestros/Estook-Arquitectura.md) (lo que no se toca, capítulo 17)                    |
> | Cómo se trabaja y en qué orden      | [Plan](docs/maestros/Estook-Plan-de-Desarrollo.md) (las reglas, A1) · [el mapa](docs/MAPA-de-modulos.md) |
> | Qué documento se toca con cada cosa | [Plan, A2](docs/maestros/Estook-Plan-de-Desarrollo.md)                                                   |
> | Quién ve qué                        | [Roles](docs/maestros/Estook-Roles-y-Administracion.md)                                                  |
> | Qué desencadena cada cambio         | [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)                                       |
> | Estook TPV y la facturación         | [Anexo](docs/maestros/Estook-Anexo-TPV-y-Facturacion.md), **que manda en lo suyo**                       |
> | Por qué está hecho así              | [`docs/decisiones/`](docs/decisiones/LEEME.md) (102)                                                     |
> | Lo que decidió la IA por su cuenta  | [`docs/lo-que-decidio-la-ia.md`](docs/lo-que-decidio-la-ia.md)                                           |
> | Lo legal, y lo ya investigado       | [`docs/legal/`](docs/legal/cumplimiento.md) · [lo investigado](docs/legal/lo-investigado.md)             |
> | Lo que cuesta cada local            | [`docs/coste-por-local.md`](docs/coste-por-local.md)                                                     |
> | Lo que hizo cada entrega            | [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)                                     |
> | Lo aprendido fallando (214)         | [`docs/lecciones.md`](docs/lecciones.md)                                                                 |
> | Los pasos de Richi                  | [`docs/pasos-de-m10.md`](docs/pasos-de-m10.md)                                                           |
> | Dónde vive cada clave               | [`config/claves.md`](config/claves.md) (los nombres, nunca los valores)                                  |

---

## 0 · El relevo

Desde el 17-oct trabajan **dos cuentas de la IA por turnos, nunca a la vez**, en el mismo ordenador y el mismo repositorio. La que entra lee esto primero.

- **Trabajo a medias: ninguno.** Abierta la rama `m10-la-carta-que-trabaja` con su pull request: **con la migración 0078 y la API**. Se trabajó en una carpeta aparte (`.claude/worktrees/m10-la-carta-que-trabaja`) para no pisar los pasos de Richi. **Lo siguiente: las cinco respuestas de M10 · 2** ([el plan](docs/m10-la-carta-menus-y-analisis.md)) y lo que diga Richi al probar M10 · 1. **Ojo:** cuando Richi hace sus pasos (`git checkout main`), la carpeta cambia de rama: mirar en qué rama se está antes de tocar nada. Y la vista previa del panel arranca desde la carpeta principal, no desde la de trabajo (lección 211).
- **Al entrar:** `git status`, `git fetch`, las ramas y los pull requests abiertos. Si hay cambios sin guardar o una rama a medias, **no se borra, no se deshace y no se cambia de rama encima**: se le pregunta a Richi.
- **Al salir, o con poco límite:** todo en un commit **subido a su rama, sin fusionar**; esta sección dice qué falta exactamente y en qué fichero; y lo aprendido de Richi, en las notas de memoria de la IA (se actualizan, no se duplican).
- **No son de ninguna cuenta y no se tocan sin preguntar:** `.claude/worktrees/`, `C:\Users\rixy-\estook-repaso`, las carpetas `capturas-*` y `pruebas/e2e/capturas-del-repaso-temporal.spec.ts` (sin subir).

---

## 1 · Dónde estamos · producción leída el 20-oct, en solo lectura

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminado** | **M0** a **M6½** · **M7** (las compras) · **«antes de M8» entero** · **M8** con sus repasos · la experiencia, las bases firmes y la 0085 · **M9 · 1** y **M9 · 2** con su arreglo, los permisos de la API y **el repaso del 16-oct** (#104–#109) · **M9 · 3** (#113 y #114, 18-oct) · **el arranque sin parpadeo y el precio en la jornada** (#116, [0096](docs/decisiones/0096-el-arranque-y-el-precio-en-la-jornada.md)) · **la puesta al día del 17-oct** (#110, [0091](docs/decisiones/0091-estado-a-250-lineas-y-los-documentos-al-dia.md)) · **Fogón 1 entero** (#117–#121, [0098](docs/decisiones/0098-fogon-1-entero.md)) · **el repaso del 19-oct** (#122, [0099](docs/decisiones/0099-el-repaso-del-19-oct.md)) · **el repaso del 20-oct** (#123, [0100](docs/decisiones/0100-el-repaso-del-20-oct.md)) · **la auditoría del 20-oct** (#124, [0101](docs/decisiones/0101-la-auditoria-del-20-oct.md)) |
| **En curso**  | **M10 · 1 · La carta que trabaja** (rama `m10-la-carta-que-trabaja`, migración 0078, [0102](docs/decisiones/0102-m10-1-la-carta-que-trabaja.md)): agotados, el precio del cierre desde la carta, leer tu carta y el equilibrio. **M10 · 2**, con las [cinco preguntas](docs/m10-la-carta-menus-y-analisis.md) sin contestar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **`main`**    | Todo fusionado hasta la **#124** (20-oct): la auditoría del 20-oct                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Base**      | Supabase, **77 de 77** migraciones (la 0077 migrada el 20-oct). **120 tablas**, todas con seguridad por filas. M10 · 1 trae la **0078** (una tabla más, `plato_agotado`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **API**       | Desplegada el 20-oct con la auditoría (#124, a las 20:15): **96 consultas y 211 comandos**, comprobado con `bd:comprobar-api`. M10 · 1 añade 2 consultas y 4 comandos (**98 y 215**). **Corre en Irlanda, junto a su base**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Sitio**     | `estook.com`, `/app/`, `/carta/<local>` y `/admin/`, en GitHub Pages. Se publica solo al fusionar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Pruebas**   | **2.224** unitarias y de base, en verde (20-oct, rama `m10-la-carta-que-trabaja`), con la que ataca toda la API desde otro negocio y con cada rol. Las de pantalla, en GitHub, en cuatro trozos a la vez                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **GitHub**    | Tres comprobaciones obligatorias. **Las de pantalla en cuatro máquinas a la vez** (de 35 min a 7, 0099) y `main` no las repite si el código fusionado es el que pasó en su rama. Todas las máquinas fijas en Ubuntu 24                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Copias**    | **No hay ninguna.** La semanal está escrita y **aplazada por Richi hasta la mudanza de alojamiento** ([0065](docs/decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)). No cuesta nada: se puede encender cualquier día                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### El camino ([0061](docs/decisiones/0061-el-orden-y-la-infraestructura.md); cada módulo, en el [mapa](docs/MAPA-de-modulos.md))

```
HECHO         M0 … M8 · «antes de M8» (H, I, C, A1–A4, E1, E2, R…) · M9 entero (1, 2 y 3)
HECHO         Fogón 1 entero (0097, 0098) · los repasos del 19 y 20-oct y la auditoría (0099 a 0101)
AHORA         M10 · 1 (0102), en su PR  →  M10 · 2, con las respuestas de Richi
ESTOOK TPV    M16a · La jornada → M20 → M19a · Estook Link → M20A → M20B → M20C
DESPUÉS       M11 → M12 → M13 → M14 → M15 → M16b · APPCC → M17 → M18 → M19b → Fases 5, 6 y 7
```

### Lo que hay en la app, por partes

| Parte                     | Lo esencial                                                                                                                          | Por qué                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **La base** (M0 a M6½)    | Cuentas, roles y permisos por local y cadena; entrar y el alta; el almacén como libro de movimientos, con coste y aprovechamiento    | [historia](docs/historia-de-los-modulos.md)                                                                                        |
| **Compras** (M7)          | Proveedores con días de reparto, pedido sugerido con su motivo, recepción «¿entero o con cambios?» y factura conciliada              | [mapa](docs/MAPA-de-modulos.md)                                                                                                    |
| **Antes de M8**           | Crear cuenta y **pagar con Stripe** (sin pago no hay app), el admin (clientes, vendedores, ventas), la campana y los avisos          | [mejoras](docs/mejoras-antes-de-m8.md)                                                                                             |
| **H · Horarios**          | La semana publicada para todo el equipo, los fichajes listos para el registro horario y sus PDF                                      | [0068](docs/decisiones/0068-las-respuestas-de-h.md), [0069](docs/decisiones/0069-el-horario.md)                                    |
| **I · La app instalable** | En la pantalla de inicio; **fichar y mermas sin señal** (también en el aparato del local, con PIN); avisos al móvil                  | [0070](docs/decisiones/0070-la-app-instalable.md)                                                                                  |
| **C · El chat**           | Canales y privados, fotos, documentos y voz; **«Confirmar que lo he leído»**; correo a quien no tiene móvil. **No traduce**          | [0073](docs/decisiones/0073-c1-hablar.md), [0075](docs/decisiones/0075-las-respuestas-de-c2.md)                                    |
| **M8 · Inventario**       | Contar a ciegas y cerrar con permiso, «Toca contar», el valor en cualquier fecha, FEFO, **food cost real** y lo gastado              | [0078](docs/decisiones/0078-las-respuestas-de-m8.md), [0079](docs/decisiones/0079-lo-gastado-y-la-desviacion.md)                   |
| **Sus repasos**           | Un solo horario e **Incidencias** que se justifican (0081); congelar y descongelar, Sentry, el chat del iPhone (0082)                | [0081](docs/decisiones/0081-un-solo-horario-y-las-incidencias.md), [0082](docs/decisiones/0082-el-repaso-antes-de-m9.md)           |
| **La experiencia**        | Menú lateral, widgets y gráficas que se tocan, buscador que abre lo que encuentra, **el Panel en una petición**, «Pon en marcha»     | [0083](docs/decisiones/0083-la-experiencia.md) a [0085](docs/decisiones/0085-una-peticion-siluetas-buscador-y-puesta-en-marcha.md) |
| **M9 · 1 · La carta**     | Secciones, platos con foto, **canales** con comisión y envase (Uber Eats, activo en IKATZ), precio por canal, historial del plato    | [0086](docs/decisiones/0086-las-respuestas-de-m9.md)                                                                               |
| **M9 · 2 · Escandallos**  | **Lo que deja cada canal**, alérgenos con dibujo, PDF sin euros, historial con «Recuperar»; la sala ve las fichas sin un euro        | [0087](docs/decisiones/0087-fichas-y-escandallos.md) a [0089](docs/decisiones/0089-lo-que-la-api-puede-en-cada-tabla.md)           |
| **El repaso del 16-oct**  | **Resumen · Escandallos · Fichas** (técnicas, pasos con foto); la ficha del producto rehecha; **kilos desde mil gramos**; más rápida | [0090](docs/decisiones/0090-el-repaso-del-16-oct.md)                                                                               |

**Lo que no se deshace de M9** (0090): **el escandallo y la ficha técnica son cosas distintas**; Escandallos **sin modo cocina** (en servicio, la cocina tendrá Estook TPV); **las elaboraciones vuelven** el 19-oct (0099): «Añadir › Una elaboración desde cero», con lo que rinde, y se ponen dentro de los platos. **El escandallo es de una ración** (0099): la tanda es de las elaboraciones y la ficha técnica escala. **El modo cocina de Ajustes se queda** (botones y letra grandes en la tablet): lo contestó Richi el 17-oct.

### Lo que todavía NO está en la app (para que nadie dé por hecho lo que solo está escrito)

- **«Qué ha cambiado» en IKATZ** no sale hasta que el coste de algún plato se mueva: necesita precios de hace días. **La desviación de los platos** sigue escondida hasta el TPV.
- **Fogón 1 entero** está en producción (19-oct). **Fogón 2** (lo que necesita ventas plato a plato) llega con el TPV.
- **M10 · 1** (agotados, el precio del cierre desde la carta, leer tu carta y el equilibrio) está **en su pull request, sin fusionar**: hasta que se fusione, se migre la 0078 y se despliegue la API, en la app no se ve.
- **Estook TPV, Estook Link, la facturación, M10 · 2** (menús, el menú del día, lo que deja cada plato, la comparación con la zona) y **el APPCC**: escritos, sin construir. Cada uno dice su módulo en el Plan.
- **De M8 y M9, construido y sin enseñar hasta el TPV:** «lo que falta» de lo que se cocina y la desviación de los platos. **La calibración, el coste teórico y los avisos de lo que se escapa**, diseñados y sin construir: van con M20, cuando haya ventas plato a plato ([el diseño](docs/como-detecta-estook-lo-que-se-escapa.md); en IKATZ, 1 de 21 cierres trae los platos). **En IKATZ hay un solo inventario cerrado** (11-oct): la desviación y lo gastado salen vacíos hasta el segundo.
- **Del chat**, llamadas, un canal de toda la cadena y hablar con el proveedor. **Del admin**, lo que nos cuesta cada cliente (M26).
- **Del horario**: cambiar turnos y vacaciones con saldo (M13), vistas de mes y día (M14), unir dos personas que son la misma (M13).
- **Sin conexión, solo fichar y apuntar mermas**: pedidos y recibir mercancía necesitan señal.
- **Nadie ha pagado de verdad.** Un pago en modo prueba (Pizzeriacazzo, 26-sep).
- **Nada se borra solo** (los plazos de [`conservacion-de-datos.md`](docs/legal/conservacion-de-datos.md), con M27), **ni hay exportación completa del negocio**, ni recuperar la contraseña por correo.
- **Los textos legales de la web y los de `docs/legal/` son borradores**, sin revisar por un asesor.

### Lo que hay en producción

Cinco organizaciones reales y tres de ejemplo: `ikatz` (la de Richi, de la casa; 14 platos, Uber Eats activo y 3 semanas de horario publicadas), `pizzeriacazzo` (de Santi, pagada en modo prueba; ninguna semana publicada todavía), y `burger-king`, `prueba1` y `prueba1-1`, de prueba. Dos administradores, los dos con segundo factor. Un vendedor dado de alta, sin clientes traídos todavía.

---

## 2 · Lo que es de Richi

**Ahora** (paso a paso en [`docs/pasos-de-m10.md`](docs/pasos-de-m10.md)):

1. **M10 · 1**: fusionar su pull request, **migrar la 0078** y **desplegar la API**.
2. **Probarlo en el iPhone, en IKATZ**: marcar un plato agotado (Carta › Agotados, o el «+» desde la cocina), ver el aviso en el chat y «Ya hay»; **leer tu carta** con el PDF de IKATZ; mirar Carta › Análisis; y cerrar una caja apuntando un plato: el precio sale de la carta.
3. **Contestar las cinco preguntas de M10 · 2** ([el plan](docs/m10-la-carta-menus-y-analisis.md)): con ellas se construyen los menús y el análisis.
4. **Si no lo has hecho ya:** mirar el food cost del Panel y «Lo que cobra» de la auditoría ([sus pasos](docs/pasos-de-la-auditoria-del-20-oct.md)), el precio de los contramuslos (5,45 € la caja de 5 kg, ¿o 45,45?), probar Fogón 1 entero, **cerrar un segundo inventario** en IKATZ y que **Santi publique una semana** en Pizzeriacazzo.

**Con fecha o con condición:**

| Qué                                                                                                                    | Cuándo                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **La mudanza, todo junto**: Cloudflare Pages, Supabase Pro, **la copia semanal encendida** y el repositorio en privado | Antes del primer cliente que pague o de vender Estook TPV, lo que llegue antes                                                                      |
| **El contrato de encargado**, revisado y en el alta                                                                    | Antes del primer cliente que pague                                                                                                                  |
| **La oferta de Verifacti**                                                                                             | **Caducaba hacia el 19 de octubre** ([el precio](docs/el-precio-de-verifacti.md)): si no se pidió mantenerla, preguntar a Verifacti si sigue en pie |
| **La sociedad o el alta de autónomo**, y Stripe de verdad                                                              | Para cobrar de verdad                                                                                                                               |
| **Las facturas de la cuota conformes a VeriFactu**                                                                     | Hoy, 1-ene-2027 si es sociedad y 1-jul-2027 si es autónomo. **Hacienda anunció el 5-oct pasarlo a octubre de 2028, sin BOE todavía** (Anexo 1.2)    |

**Sin decidir, y es de Richi:**

1. **Fogón**: qué modelo es «el grande» y cuántos créditos lleva Pro. Se decide en M22, con lo medido ([el coste](docs/coste-por-local.md)).
2. **Para Estook TPV** (Anexo, «Lo que sigue pendiente de Richi»): el soporte en horario de servicio, si el camarero cobra por defecto, qué datáfono conectado va primero, y el tope de tickets dentro del precio.
3. **Si VeriFactu se aplaza de verdad a 2028** (cuando salga en el BOE): si el orden de la 0061 —el TPV justo después de M10— se mantiene. Hasta entonces, no cambia nada.

**Cuando quiera:** las alertas de Dependabot, quitar «Automatically expose new tables» en Supabase y regenerar las claves de Google que pasaron por un chat. **Las claves nunca por el chat**: se ponen como secretos y se dice solo el nombre ([`config/claves.md`](config/claves.md)). **Y no se toca jamás el borrado permanente de un NIF en Verifacti.**

---

## 3 · Lo que no se puede olvidar

1. **Estook va a ser productor de un sistema de facturación.** Nada de facturación llega a producción sin las once condiciones del capítulo 9 del Anexo, y la primera es **la revisión de un profesional por escrito**. Lo investigado sin asesor sirve para diseñar, no para firmar.
2. **Un ticket o una factura emitidos no se tocan desde ningún sitio**: se corrigen con otro documento (regla 15 del Plan).
3. **Estook nunca tiene el dinero del local**, ni es entidad de pago, ni cobra comisión por cobro.
4. **No se inventa ni un campo ni un endpoint** de un servicio de fuera: primero su documentación oficial; hasta entonces, adaptador simulado. Y lo marcado **[VERIFICAR]** no se programa.
5. **Cada tema vive en un solo documento**, y los demás enlazan. En lo suyo manda el más específico; si dos se contradicen, se para y se pregunta.
6. **Las pruebas leen los documentos**: cambiar la tabla B5 del Plan pone la integración en rojo hasta que el código la siga; y una prueba vigila este fichero (0091).
7. **El repositorio es público**: ni datos personales ni nada que abra una puerta en los documentos.
8. **Un maestro no frena el producto**: si se queda corto, se propone lo mejor y se cambia el documento, con su decisión.
9. **Una decisión de producto que no está escrita se pregunta y se para**, y lo decidido no se reabre: se propone con su razón.

### Lo que ya se construye pensando en Estook TPV y en Fogón

Para que lo de después no obligue a rehacer lo de ahora (el detalle, en [el mapa](docs/MAPA-de-modulos.md), «Lo que queda preparado»):

- **Un solo plato, con su id**, del que cuelgan la carta, el escandallo y la ficha técnica (0049, 0086): la comanda (M20A) y «la ficha abierta desde cualquier plato» en cocina saldrán de ahí.
- **El coste del plato se calcula, no se guarda**, con el precio de cada día: descontar lo vendido (M20) lo congelará en el momento de la venta.
- **La desviación de los platos** y **emparejar la caja** están construidos y escondidos hasta que haya ventas plato a plato.
- **Los aparatos del local** (`estook.terminal`, hoy para fichar con PIN cifrado) son los que usará la sala (M20A, Anexo 3.4).
- **La facturación, cuando llegue (M20B)**, ya está escrita: esquema aislado y de solo añadir, Verifacti detrás de un adaptador y las once condiciones (Anexo).
- **Fogón**: la IA **propone y una persona confirma** (0049); su contexto **nunca se arma en el navegador** (0023); y su coste por local está calculado, con los supuestos marcados ([el coste](docs/coste-por-local.md)).

---

## 4 · Lo que está vivo

Dónde vive cada pieza, cada servicio y cada clave: [Arquitectura](docs/maestros/Estook-Arquitectura.md), capítulos 10 a 13, y [`config/claves.md`](config/claves.md). Lo que cambia y conviene tener a mano:

- **Base:** Supabase `efgtzujwjztihyiwgpwg`, Irlanda, **plan gratuito**. `.\estook.cmd bd:comprobar` la lee; `bd:comprobar-api`, la API desplegada.
- **La API**, en Supabase Edge Functions, **pedida en Irlanda** con la cabecera `x-region` (0090, lección 193).
- **GitHub:** `main` protegida, con tres comprobaciones obligatorias —`Calidad`, `Construccion y presupuestos` (desde el 19-oct junta los cuatro trozos de «Pantallas») y `Migraciones reversibles`—. **Nunca añadir `Construir` ni `Publicar`.** Las máquinas, fijas en Ubuntu 24; pasar a la 26 se hace a mano, todas a la vez y con las capturas rehechas. `Copia de seguridad` corre los lunes y, sin secretos, solo deja un aviso.
- **El peso inicial** (26-sep): `app` 317,8 KB y `admin` 222,5. Se mide y no bloquea; manda la velocidad. Richi notó la app **«un 25 % más rápida»** tras el repaso del 16-oct.

---

## 5 · Cómo trabajamos

**Los comandos de Richi, con `.\estook.cmd`**, uno por recuadro: PowerShell no entiende `&&`.

1. **Todo en castellano**: el chat, los pasos, los documentos, los commits y el código.
2. **El orden de cada trabajo** (Plan, A1): leer esto → los maestros que toquen → el módulo y de qué depende → el modelo de datos → el contrato de la API → diseñar → construir → pruebas → permisos llamando a la API → móvil → los documentos.
3. **Los documentos, en el mismo pull request** que el cambio: qué se toca con cada cosa, en el Plan (A2).
4. **Primero fusionar, después migrar, después desplegar.**
5. **Una rama por entrega y un pull request.** Nada entra en `main` sin él.
6. **Ante la duda, preguntar**, explicado en llano: **qué es y de dónde sale**, qué hay ya hecho y en qué se diferencia, un ejemplo de restaurante, las opciones con lo que pasa en cada una y una recomendación (lección 196). Y antes, **la prueba de la plantilla** (Plan, regla 14): lo que no la pasa no se pregunta, se quita.
7. **Revisar lo propio antes de entregarlo.** `pnpm verifica` en verde; si se toca una pantalla, `prueba:e2e:completa`; con fechas, `prueba:semana`.
8. **GitHub entero en verde, mirado por dentro**: la vuelta de la rama **y la de `main` después de fusionar**, sin pruebas repetidas.
9. **Una lección se convierte en prueba**, y una prueba nueva se ve fallar con el arreglo quitado.
10. **A Richi, siempre sus pasos**: qué hacer, dónde, qué debe salir y qué hacer si falla; y al cerrar, un resumen, lo que se necesita de él y sus pasos.

Las quince reglas, en el Plan (A1); el porqué de cada costumbre, en [`docs/lecciones.md`](docs/lecciones.md).

---

## 6 · El siguiente paso

**Que Richi fusione M10 · 1, migre la 0078, despliegue la API y lo pruebe** ([los pasos](docs/pasos-de-m10.md)), y **conteste las cinco preguntas de M10 · 2** ([el plan](docs/m10-la-carta-menus-y-analisis.md)). Con sus respuestas, M10 · 2 (menús y el análisis); con M10 terminado, **Estook TPV**.

**Lo que decidió la IA por su cuenta**, para que Richi lo sepa: los doce de «Lo que decidí al construirlo» de la [0102](docs/decisiones/0102-m10-1-la-carta-que-trabaja.md) (como que el aviso del agotado vaya a «Todo el equipo» y suene solo a quien está fichado, o que lo que ya no está en la carta leída salga sin marcar). **Todo lo anterior**, entrega a entrega, en [`docs/lo-que-decidio-la-ia.md`](docs/lo-que-decidio-la-ia.md).
