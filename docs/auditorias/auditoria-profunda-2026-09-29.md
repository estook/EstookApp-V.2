> **Informe de la auditoría profunda de Estook, del 29 de septiembre de 2026**, con las respuestas de Richi de esa noche. Es el mismo texto que se le publicó para aprobarlo, pasado a Markdown. **Es una foto de ese día y no se actualiza**: lo que se decidió a partir de él está en las decisiones [0055](../decisiones/0055-la-auditoria-profunda.md) a [0064](../decisiones/0064-las-graficas-contestan-una-pregunta.md), y ahí es donde manda. Donde dice «Estook Enlace», desde el día 30 es **Estook Link**.
>
> Cada hallazgo lleva su gravedad, si existe o no, y una de tres etiquetas: **CONFIRMADO** (lo dice una norma o una fuente oficial, enlazada), **INTERPRETACIÓN** (criterio técnico) o **PENDIENTE DE VALIDACIÓN** (lo tiene que decir un profesional).

Estook · auditoría del 29 de septiembre de 2026

# Auditoría profunda de Estook

He recorrido el proyecto entero (estructura, capas y tamaños) y he leído línea a línea las piezas críticas: el despachador, la entrada y el PIN, la conexión a la base, el reloj, los fichajes, la caja y las migraciones de identidad, permisos, auditoría y compras. También los seis maestros, las decisiones y tu documento «Auditoría profunda». He pasado las comprobaciones del proyecto sin tocar nada, y lo he contrastado con la AEAT, el BOE, Verifacti, Supabase y cómo lo hacen Toast, Lightspeed, Revo, Food&Service y compañía. **No he cambiado ni un fichero.**

- **30 días** de proyecto (31-ago a hoy)
- **~150.000 líneas** de código, pruebas y migraciones
- **1.449 / 1.450 pruebas** en verde (1 falla según el día)
- **0 errores** de tipos, estilo y capas

### El veredicto, en corto

**La base está muy bien hecha y no hay que rehacer nada.** La seguridad, el despachador, el libro de movimientos, el motor fiscal y las pruebas están al nivel de un producto profesional. Lo que falla está en tres sitios: la **infraestructura** (no hay copias de seguridad), el **diseño del TPV que todavía no se ha construido** (sin internet, emitir facturas, cobro y caja) y los **documentos**, que repiten lo mismo en seis sitios y ya se contradicen.

**3 críticos**, y ninguno es código roto: sin copias de seguridad; la cocina «sin internet» está diseñada de una forma que no puede funcionar; y el flujo de emisión de tickets puede dejar un registro en Hacienda sin rastro en Estook. Dos de los tres se arreglan solo en los documentos, hoy, antes de escribir el TPV.

Y un hallazgo que cambia el enfoque: **la AEAT dice que un corte de internet no obliga a dejar de facturar**. Lo que nos obliga es nuestra arquitectura, no la ley (C5).

## Lo que he hecho con tu documento

Lo he seguido como guía, no al pie de la letra, como me pediste. He respetado sus reglas (clasificar el estado de cada cosa, severidad honesta, no rehacer, fuentes oficiales, casos extremos) y he ajustado lo que no encajaba con Estook:

### 1 · Usa nombres de módulos que no son los de Estook

«Gastos», «Horarios», «Fichajes», «APPCC» o «Configuración» no son apps: viven dentro de las ocho. Lo he traducido así.

| En tu documento                             | En Estook                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Inventario, compras, proveedores, productos | **Almacén** (Resumen, Productos, Movimientos, Compras, Mermas)                |
| Escandallos                                 | **Escandallos** (M9)                                                          |
| Carta                                       | **Carta** (M10) y carta digital (M12)                                         |
| Horarios                                    | **Calendario** (cuadrante, M14) · la entrega H                                |
| Equipo, fichajes                            | **Equipo** (M13, M15; fichar ya existe)                                       |
| APPCC, documentación                        | **Servicio** (APPCC, M16) · documentos (M11)                                  |
| Gastos, analítica, negocio                  | **Negocio** (Ventas, Informes, Pulse, Costes, Reseñas)                        |
| Cuaderno                                    | **Cuaderno** (M17)                                                            |
| Configuración                               | **Ajustes**                                                                   |
| Estook TPV                                  | Los modos **Sala** y **Cocina** (Fase 4, Anexo)                               |
| Estook Link                                 | En los documentos se llama **Estook Enlace**: hay que elegir uno (decisión 6) |

### 2 · Parte de cero en el TPV, y el TPV ya está muy pensado

Hay más de mil líneas en el Anexo y 54 decisiones. No las he vuelto a pensar: he buscado dónde fallan.

Casi todo lo que pide tu documento sobre el TPV (series, rectificativas, canje, QR, impresoras, cajón, arqueo ciego, datáfono, alergias, partidas de cocina) ya está escrito y bien. Por eso la auditoría no repite eso: señala los huecos concretos (B2, B3, C2, C3, C4, C5) y lo que falta de verdad (D6).

### 3 · Pide «no modificar nada» y a la vez «que los documentos queden bien»

Lo he hecho en dos fases: hoy el informe; cuando apruebes el plan, los documentos y el código.

Este informe vive fuera del repositorio. Lo que apruebes en la sección I se escribe después en los maestros, con su pull request, y el informe se guarda en `docs/auditorias/`.

### 4 · No dice cuándo toca cada cosa

El TPV es la Fase 4. He puesto a cada hallazgo su momento: ahora, antes de H, antes del TPV o futuro.

Sin eso, todo parece urgente y nada avanza. Cada hallazgo lleva «Cuándo», y el plan (I) los ordena en P0, P1, P2 y P3.

### 5 · Se deja cosas importantes

Copias de seguridad, dónde está alojada la web, la ley europea de IA, los alérgenos, el contrato con los clientes, la ventana de mercado de 2027. Están en L.

Tu punto 25 pedía justo esto: buscar lo que no se había pensado. La sección L recoge solo lo que no estaba en los puntos 1 a 24.

### 6 · «Food&Service» sí existe, y lo he mirado

Es un TPV español en la nube. Ellos mismos dicen que necesita internet siempre.

Licencias de aparatos ilimitadas, soporte 365 días por teléfono y WhatsApp, Bizum, KDS, carta QR, inventario y VeriFactu. Y «requiere conexión a internet (wifi, 4G/5G o tarjeta SIM)» ([su web](https://foodyservice.com/en/pos)). Está en la comparativa (G).

## Lo que está bien, y por qué

No es cortesía: esto es lo que hace que Estook pueda crecer años sin volverse un monstruo. No se toca (F).

- **La seguridad está en el servidor y en la base, no en la pantalla.** Cada petición entra por el despachador (`servidor/aplicacion/despachador.ts`): sesión, segundo factor, contraseña por cambiar, pago, admin y permiso, en un solo sitio y antes de ejecutar nada. Debajo, seguridad por filas en las 73 tablas y la API disfrazada de `estook_api` dentro de cada transacción. Una operación nueva nace protegida sin acordarse de nada.

- **Todo comando es idempotente.** Cada uno lleva su clave, y el resultado se guarda en la misma transacción. Pulsar dos veces o reintentar sin cobertura no duplica nada. Es exactamente lo que un TPV necesita.

- **El almacén es un libro de movimientos** con candado por producto y lo que hay como vista. No hay «stock» que se pueda desincronizar.

- **El motor fiscal** (`desglosar()`) redondea una sola vez y saca la cuota restando: base + cuota es exactamente lo que paga el cliente. Las reglas de IVA tienen vigencia y una regla usada no se reescribe. El territorio decide el impuesto con un `check` en la base.

- **La auditoría solo añade**, con dos barreras (permisos y disparador).

- **El PIN está pensado para el TPV sin saberlo:** la sal es del local y hay un índice único por local, así que en un terminal basta teclear el PIN (sin correo) y se encuentra a la persona con un solo cálculo. Y lo genera el sistema, así que elegir un PIN nunca revela el de otro.

- **El login es propio y cuidadoso:** tarda lo mismo acierte o falle, no revela qué correos existen, cuenta los intentos en la base, y retirar el acceso corta al instante.

- **Las capas se vigilan solas** (dependency-cruiser: 485 módulos, 0 violaciones). Tipos, estilo y dependencias: limpios.

- **Los catálogos cerrados** (apps, widgets, acciones, eventos, errores, permisos) y las pruebas que leen los documentos evitan cadenas sueltas y que el código se separe del Plan.

- **Un solo cliente de API** con hilo de correlación, idempotencia y errores en cristiano.

- **Stripe sin librería**, con firma comprobada, cada aviso una vez y volviendo a leer a Stripe. **El reloj** con secreto generado por la migración.

- **El sistema de diseño:** fichas únicas, modo cocina, tema oscuro medido, contraste probado, velocidad medida en las pruebas de pantalla.

- **El Anexo del TPV** ya acierta en lo fiscal difícil: solo modalidad VERI*FACTU, R5 para tickets, el canje F3 que no anula el ticket, el QR, la declaración responsable, nunca borrar un NIF en el proveedor y el esquema de facturación aparte y solo de inserción.

- **La idea de Estook TPV** (mismos datos, mismos permisos, mismo PIN, mismo diseño) es la correcta. Solo propongo cambiar la puerta de entrada (C11), no la idea.

## Problemas críticos

Pueden hacer perder datos, crear un problema fiscal serio o impedir una función fundamental. Toca el nombre para ver el detalle.

### B1 · No hay copias de seguridad

El plan gratuito de Supabase no guarda copias y el proyecto no hace ninguna por su cuenta. Ya hay datos reales (IKATZ).

_Crítico · NO EXISTE · CONFIRMADO_

- **Dónde:** La base de producción (Supabase, plan gratuito). Ningún flujo de `.github/workflows` ni herramienta hace un volcado. Tampoco del almacén de ficheros (fotos, cartas, marca).

- **Por qué:** Supabase solo hace copias diarias en los planes de pago; en el gratuito recomienda hacerlas uno mismo ([documentación de Supabase](https://supabase.com/docs/guides/platform/backups)). Y el RGPD (art. 32) pide poder restaurar los datos tras un incidente.

- **Qué puede pasar:** Una migración que sale mal, un borrado por error o un fallo del proveedor y se pierde todo, sin vuelta atrás.

- **Solución:** 1) Pasar el proyecto a Pro, que trae copia diaria de 7 días. 2) Un volcado semanal cifrado, guardado fuera de Supabase, hecho por GitHub Actions. 3) Copia del almacén de ficheros. 4) Un simulacro de restauración escrito paso a paso y hecho una vez de verdad. Cuando haya TPV: recuperación a un punto concreto en el tiempo.

- **Riesgo de cambiarlo:** Ninguno para la app.

- **Depende de:** Que pagues el plan Pro (unos 25 $ al mes).

- **Cuándo:** **Ahora.**

### B2 · La cocina «sin internet» está diseñada de una forma que no puede funcionar

Las comandas van a una cola en la nube y Estook Enlace las recoge de la nube. Sin internet, la tablet no puede dejarlas en esa cola.

_Crítico · DOCUMENTADO · NO CONSTRUIBLE ASÍ · INTERPRETACIÓN TÉCNICA_

- **Dónde:** Anexo 3.6, 6.3 (vía 1) y 10.9 · Manifiesto 17 y 29 · Plan M19 y M20A («con Enlace, la impresa sale igual»).

- **Por qué:** El Anexo promete que con Enlace la cocina sigue imprimiendo aunque caiga internet. Pero en ese diseño la tablet manda la comanda a la nube y Enlace la lee de la nube: si no hay internet, Enlace nunca se entera. Además, hoy la app no tiene ninguna pieza para trabajar sin conexión: solo el manifiesto de instalación, sin _service worker_ ni cola en el aparato (`apps/app/public/manifest.webmanifest`).

- **Qué puede pasar:** Un sábado cae la fibra, la sala cree que cocina recibe y cocina no recibe nada.

- **Solución:** Escribir ya que **Estook Enlace es el centro del local**: los terminales hablan con él por la red del local, y con la nube cuando la hay. Enlace imprime, reparte las comandas a las pantallas de cocina y guarda lo pendiente hasta que vuelve internet. Es lo que hacen [Toast con su «local hub»](https://doc.toasttab.com/doc/platformguide/platformOfflineModeLocalSync.html) y [Revo con su «iPad Host»](https://support.revo.works/es/articles/722). Chrome y Edge ya lo permiten con un permiso de [acceso a la red local](https://developer.chrome.com/blog/local-network-access) que se da una vez; en iPad hace falta la cáscara (Capacitor). Y cada terminal guarda en el aparato la carta, el plano y las mesas abiertas. El detalle, en H · «Sin conexión».

- **Riesgo de cambiarlo:** M19a crece. Es trabajo nuevo, no riesgo para lo construido.

- **Depende de:** La puerta propia del TPV (C11) y el nombre Enlace/Link (decisión 6).

- **Cuándo:** Decidir y escribirlo **ahora** (cuesta cero). Construir en M19a y M20A.

### B3 · Emitir un ticket puede dejar un registro en Hacienda sin rastro en Estook

La llamada a Verifacti va dentro de la transacción. Si la respuesta se pierde, Estook deshace todo y vuelve a usar el mismo número.

_Crítico · DOCUMENTADO CON FALLO · INTERPRETACIÓN TÉCNICA · PENDIENTE DE VALIDACIÓN_

- **Dónde:** Anexo 4.4 y 4.9 · Plan M20B («un documento solo existe si el proveedor ha devuelto 200»).

- **Por qué:** El Anexo manda el ticket a Verifacti con la transacción abierta y el candado del NIF cogido. Si Verifacti lo registra pero la respuesta no llega (se corta la red, la función se cae, pasa el tiempo máximo), Estook deshace todo y el número vuelve a quedar libre. El siguiente cobro lo reutiliza: queda un registro en la AEAT que Estook no conoce, o dos con el mismo número. Y mientras se espera a Verifacti, los demás terminales del mismo NIF esperan en fila.

- **Qué puede pasar:** Un descuadre fiscal que no se arregla editando (la facturación es intocable), solo con rectificativas, y difícil de explicar en una inspección.

- **Solución:** Un documento con estados: 1) en una transacción corta se asigna el número y se guarda el documento «preparado», con todo congelado; 2) fuera de la transacción se manda a Verifacti con su clave de idempotencia (su API admite `Idempotency-Key` en `/verifactu/create`; [documentación](https://www.verifacti.com/docs)) igual al identificador del documento; 3) con la respuesta, «registrado» con su QR y su huella; 4) si no hay respuesta, se pregunta el estado (`/verifactu/status`) y se reintenta con la misma clave, que nunca crea dos; 5) un trabajo repasa los que se queden a medias.

- **Riesgo de cambiarlo:** Ninguno: es un cambio de documento.

- **Depende de:** El asesor: qué número y qué texto lleva el justificante cuando Verifacti no responde.

- **Cuándo:** Corregir el Anexo **ahora**. Se construye en M20B.

## Problemas importantes

Pueden causar fallos serios en producción o bloquear algo esencial. Conviene resolverlos pronto, varios antes de H.

### C1 · Un trabajador tiene que tener correo para existir

Extras, ayudantes o friegaplatos sin correo no pueden fichar hoy ni cobrar mañana. Es tu «empleado ≠ usuario».

_Alto · NO EXISTE_

- **Dónde:** `estook.persona.correo` es obligatorio (migración 0002) · `invitar_persona` exige correo · entrar con PIN también pide el correo (`entrar.ts`, `porPin`).

- **Qué puede pasar:** El registro horario queda incompleto, o se comparten cuentas y todo queda a nombre de otro.

- **Solución:** El correo pasa a opcional. Una persona sin correo se da de alta con nombre y PIN, entra solo en los aparatos del local con su PIN y ficha igual. Si un día da su correo, se le añade y sigue siendo la misma persona. «Un correo, una identidad» sigue valiendo cuando hay correo.

- **Riesgo:** Medio: toca identidad (M4). Migración nueva y pruebas de acceso llamando a la API a pelo.

- **Cuándo:** Decidir ahora; construir al empezar H, porque el cuadrante tiene que incluir a todos.

### C2 · Quién es quién en un terminal compartido: falta la mitad

Está decidido que el terminal es del local (bien). Falta el PIN sin correo, el bloqueo, la aprobación del encargado y el reinicio.

_Alto · PARCIAL_

- **Dónde:** Anexo 3.4 · Roles 1.12 · `servidor/aplicacion/contrato.ts` (cada operación declara un solo permiso, `exige`).

- **Qué falta:** 1) Teclear solo el PIN en el terminal. 2) El **operador**: quién usa la tablet ahora, que se bloquea solo tras unos segundos sin tocar o al mandar. 3) La **aprobación de un encargado con su PIN** como mecanismo único (hoy no existe «yo pido, otro aprueba»). 4) Al reiniciar, el terminal vuelve solo a su función, sin operador. 5) Cómo se comprueba un PIN sin internet.

- **Una contradicción:** El Manifiesto (28) dice «el PIN identifica, no firma»; el Anexo 3.4 y el APPCC dicen «firmada con el PIN». Propuesta: «lo hecho con PIN queda a nombre de esa persona, con la hora y el aparato».

- **Sin internet:** Guardar las huellas de los PIN en una tablet no es seguro: con la huella delante, un PIN de seis cifras se saca probando en minutos. Sin internet los PIN los comprueba Enlace; sin Enlace, solo siguen quienes ya entraron ese día en ese aparato.

- **Solución:** El modelo completo está en H · «El modelo». Escribirlo en el documento de arquitectura.

- **Cuándo:** Antes de M20A. La parte de la persona sin correo, con C1.

### C3 · Cobro, pago y caja están mezclados en el modelo del Anexo

No cabe un pago mixto, falta la «bolsa del camarero» y el cierre de caja es uno por día.

_Alto · DOCUMENTADO CON FALLOS_

- **Dónde:** Anexo 7.3 (`cobros` con una sola forma de pago), 5.5 y 10.6 · migración 0029 (`cierre_uno_por_jornada`).

- **Tres fallos:** 1) Un pago mixto (20 € en efectivo y el resto con tarjeta) es un ticket con dos pagos, y `cobros` solo guarda una forma de pago. 2) Falta la **bolsa del camarero**: en muchos restaurantes el camarero cobra en la mesa con su comandero, lleva el efectivo encima y lo liquida al acabar el turno. 3) El cierre de caja de Servicio es uno por día y local, y el Anexo quiere que lo rellene el Z de cada caja: con dos cajones (barra y comedor) o dos turnos, el segundo Z pisaría al primero.

- **Solución:** **Cobro** (qué se cobra; un documento fiscal) → **Pagos** (uno o varios: efectivo, tarjeta, Bizum…) → **Movimiento de caja** (solo el efectivo, en el turno del cajón o en la bolsa del camarero). El cierre de caja de Servicio pasa a ser «el cierre del día», que suma las cajas. Detalle en H · «Caja y dinero».

- **Cuándo:** Corregir el Anexo ahora; se construye en M20C.

### C4 · La venta nace tarde, y «Quedan 3» contaría mal

Si la venta solo existe al emitir el ticket, sin internet el almacén no se mueve y lo que está en cocina no cuenta.

_Alto · DOCUMENTADO CON FALLO_

- **Dónde:** Plan M20 («descuenta al cerrarse la venta, ticket emitido; una mesa abierta no descuenta») · Anexo 7.6 («al emitir un ticket se crea la venta»).

- **Por qué:** Sin internet el ticket se emite horas después y el almacén no se mueve hasta entonces. Y en pleno servicio, con veinte mesas abiertas, «Quedan 5» puede ser mentira porque lo mandado a cocina sin cobrar no cuenta.

- **Solución:** La **venta nace al cobrar** (con ticket o con justificante) y el documento fiscal la acompaña. **«Quedan N» = lo que hay − lo comprometido** (mandado a cocina y sin cobrar), calculado al momento, sin guardar un segundo número.

- **Cuándo:** Ahora, en los documentos.

### C5 · «Sin conexión no hay ticket porque la ley no lo permite» no es lo que dice la AEAT

La AEAT dice que un corte no interrumpe la facturación. Lo que nos para es que el registro lo genera Verifacti en su servidor.

_Alto · DOCUMENTADO CON ERROR · CONFIRMADO POR NORMATIVA · PENDIENTE DE VALIDACIÓN_

- **Dónde:** Anexo 4.11 · Manifiesto, principio 12 · Evolución 19.

- **Lo que dice la AEAT:** Ante un corte de luz, de internet o de su sede, estas incidencias «no suponen en ningún caso que deba interrumpirse la facturación de la empresa. Esta deberá continuar con normalidad y los sistemas podrán enviar los registros a posteriori», marcando la incidencia, y sin plazo máximo fijo ([preguntas frecuentes de la AEAT sobre VERI*FACTU](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/sistemas-verifactu.html)).

- **La diferencia:** Sin conexión, Estook no puede emitir porque el registro (huella y encadenamiento) lo hace Verifacti. Es la arquitectura elegida, no la ley. Y Verifacti recomienda precisamente un justificante provisional cuando su servicio no responde.

- **Solución:** Reescribir la frase con la verdad; mantener el justificante en la primera versión con el visto bueno del asesor; y dejar escrito el camino para facturar sin internet desde el local (E1).

- **Cuándo:** Ahora, en los documentos. El justificante, al asesor.

### C6 · La web y la app están alojadas donde no se permite un SaaS de pago

GitHub Pages lo prohíbe en sus condiciones, y no deja poner las cabeceras de seguridad que protegen la app.

_Alto · IMPLEMENTADO EN EL SITIO EQUIVOCADO · CONFIRMADO_

- **Dónde:** GitHub Pages (decisión 0001) para `estook.com`, `/app`, `/carta` y `/admin`.

- **Por qué:** Sus condiciones dicen que no se puede usar para «software as a service comercial», y que los sitios no deberían tratar contraseñas ([límites de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). Además, la política de seguridad va en una etiqueta `meta`, que no admite `frame-ancestors` (lo reconoce `herramientas/politica-de-seguridad.ts`): la app se puede meter dentro de otra web para engañar a alguien.

- **Qué puede pasar:** Que GitHub desactive el sitio con clientes dentro.

- **Solución:** Publicar en Cloudflare Pages (gratis, con servidores en Madrid): cabeceras de seguridad de verdad, direcciones sin «#» (lo que ya pedía la 0008) y **una vista previa de cada pull request que puedes abrir en el iPhone antes de fusionar**.

- **Riesgo:** Bajo: cambiar el DNS en Hostinger con cuidado, con vuelta atrás preparada.

- **Cuándo:** Antes del primer cliente que pague de verdad.

### C7 · Una prueba falla según el día de la semana

Pasó en GitHub el domingo 27 y hoy, martes, falla. La próxima vuelta de GitHub puede salir en rojo sin haber roto nada.

_Alto · CONFIRMADO HOY_

- **Dónde:** `base-de-datos/pruebas/el-pedido-los-informes-y-google.prueba.ts:233` («Mañana toca pedir a Frutas R2» no aparece). 1.449 de 1.450 en verde.

- **Por qué:** La prueba cuenta los días desde hoy y la base usa la hora real (`now()`), que las pruebas no pueden fijar. Es la lección 120 otra vez.

- **Qué puede pasar:** `main` en rojo al fusionar la #78 o cualquier otra cosa, según el día.

- **Solución:** Arreglar esta prueba y dar a la base un reloj que las pruebas puedan fijar (una sola función para «ahora»), para que no vuelva a pasar.

- **Cuándo:** **Ahora**, antes de fusionar la #78.

### C8 · Falta el contrato de encargado del tratamiento, y la conservación se contradice

La privacidad dice que tratamos los datos del equipo «por encargo tuyo», pero ese contrato no existe. Y «borramos» choca con «nada se borra».

_Alto · NO EXISTE · CONFIRMADO POR NORMATIVA · PENDIENTE DE VALIDACIÓN_

- **Dónde:** `apps/web/src/Privacidad.tsx` y `Condiciones.tsx` · Manifiesto 31 («nada se borra nunca») · Anexo 4.13 («cuatro años»).

- **Por qué:** El RGPD (art. 28) exige un contrato con contenido mínimo cuando otro trata datos por tu cuenta. La privacidad dice «si te das de baja, borramos tus datos» y el Manifiesto dice que nada se borra nunca: no pueden ser las dos. Y el Código de Comercio ([art. 30](https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627)) obliga a guardar la documentación del negocio **seis años**, no cuatro.

- **Solución:** Contrato de encargado, con la lista de subencargados (Supabase, Resend, Stripe, Sentry, Google y Verifacti cuando llegue), aceptado al crear la cuenta. Una tabla de conservación por tipo de dato (cuenta, fichajes 4 años, facturas 6, auditoría, avisos, errores). Y el principio reescrito: «nada se borra por error ni para esconder; se borra cuando lo dice la política».

- **Cuándo:** Antes del primer cliente de pago. Lo redacto yo; lo revisa el asesor.

### C9 · Fichajes: listos para hoy, no para el registro horario que viene

Corregir un fichaje sobreescribe la hora y el trabajador no lo ve. El Real Decreto digital puede salir «con efecto inmediato».

_Alto · PARCIAL · PENDIENTE (TEXTO DEL RD)_

- **Dónde:** Migración 0027 · `corregir_fichaje` en `servidor/aplicacion/comandos/fichar.ts`.

- **Hoy:** La corrección cambia la hora en la misma fila; lo anterior queda en la auditoría con quién y por qué (bien). Pero el trabajador no ve que le han tocado su registro, y no hay exportación para la Inspección (es M15).

- **Lo que viene:** A 9-sep-2026 el Real Decreto del registro horario digital sigue sin publicarse, pero el Ministerio anunció que entrará «con efecto inmediato» y pedirá un registro digital, personal y no manipulable, con acceso inmediato y a distancia para el trabajador, sus representantes y la Inspección, y separando horas ordinarias y extra (noticia de prensa especializada; no es texto oficial). La obligación actual es el [art. 34.9 del Estatuto de los Trabajadores](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430): registro diario y cuatro años de conservación.

- **Solución:** La corrección es un registro nuevo que no borra el original; el trabajador ve cualquier cambio en lo suyo y recibe aviso; exportación en el formato de la Inspección; y el acceso de la Inspección cuando se publique cómo. La ubicación, solo al fichar (ya es así, y está bien).

- **Cuándo:** Con H o justo después.

### C10 · Los documentos repiten lo mismo en seis sitios, y ya se contradicen

Cada cambio del TPV hay que hacerlo seis veces. He encontrado doce contradicciones concretas.

_Alto · IMPLEMENTADO · MAL REPARTIDO_

El TPV está escrito en los seis maestros; ya pasó con Canarias y volverá a pasar. `ESTADO.md` tiene casi 800 líneas y debería leerse en dos minutos. Las contradicciones de hoy:

- Manifiesto 31 y Plan M26: «prueba gratis **sin tarjeta**». E2 (decisión 0048) decidió que la prueba **pide tarjeta**.

- Manifiesto 28 «el PIN identifica, no firma» · Anexo 3.4 «firmada con el PIN».

- Anexo 3.6 y 6 · Plan M20A: la cocina imprime sin internet (B2).

- Anexo 4.11 · Manifiesto 4: «la ley no permite» (C5).

- Anexo 4.13: «cuatro años» (C8).

- Anexo 7 pone las tablas del TPV en el esquema `public`; todo Estook vive en `estook`. Y nombra en plural (`cuenta_lineas`) cuando el código nombra en singular (`linea_de_cierre`).

- Plan A3: la PWA usa vite-plugin-pwa. No está instalado y no hay service worker.

- Plan A2: «ningún fichero pasa de 300 líneas». Pasan 97.

- Manifiesto 29: «fichajes, APPCC y mermas se guardan en el móvil sin wifi». Todavía no existe.

- Condiciones: «puedes exportarlo». Solo hay exportaciones sueltas (mermas, inventario).

- Tu documento dice «Estook Link»; los maestros, «Estook Enlace».

- `lo-que-el-tpv-toca-de-lo-construido.md`: «la siguiente migración libre es la 0040». Va por la 0052.

- **Solución:** Una fuente por tema (H · «Los documentos»), ESTADO de 150 líneas como mucho, la historia de cada entrega fuera de ESTADO, y los «qué cambia en la versión…» de cada maestro en un solo registro de cambios.
- **Cuándo:** Un pull request de documentos, justo después de las correcciones del TPV.

### C11 · Estook TPV: la misma app, pero con su propia puerta

«Una app aparte duplicaría sesión, permisos y datos» vale para otra aplicación, no para otra puerta del mismo código.

_Medio · DECISIÓN POR REVISAR · INTERPRETACIÓN TÉCNICA_

- **Dónde:** Plan A5 · Evolución 19.

- **Por qué:** La sesión, los permisos y los datos viven en el servidor; el diseño y los cálculos, en los paquetes compartidos. Una puerta propia (`apps/tpv`, en el mismo repositorio) los usa igual y no duplica nada: mismo PIN, mismo login, mismos datos al momento.

- **Lo que gana:** Se instala aparte como «Estook TPV», con su icono, y arranca a pantalla completa. Su trabajo sin conexión no carga a la app de gestión. Se actualiza cuando lo decide el local, nunca en mitad de un servicio. Pesa menos en una tablet barata. Y Estook (gestión) sigue como está.

- **Lo que cuesta:** Una segunda configuración de construcción y de rutas. Hoy no hay nada del TPV construido que mover (solo dos vistas apagadas).

- **Cuándo:** Decidir antes de M20A (decisión 3).

## Mejoras recomendadas

Suben la calidad, la velocidad o la facilidad de mantener Estook. Ninguna es urgente hoy, algunas lo serán antes del TPV.

### D1 · La API se ejecuta lejos de la base

Supabase la ejecuta en la región más cercana al usuario, y cada petición hace varios viajes a la base, que está en Irlanda (calculo que entre 8 y 15; hay que medirlo).

_Medio · CONFIRMADO (DOC. SUPABASE)_

Supabase recomienda ejecutar en la región de la base cuando hay varias consultas ([documentación](https://supabase.com/docs/guides/functions/regional-invocation)). En Estook, cada petición mira sesión, pago, permiso, idempotencia, hace la operación y la auditoría. **Solución:** medir con `bd:rafaga`, fijar la región de Irlanda (`x-region` o `forceFunctionRegion`) y volver a medir. Poco trabajo, puede notarse en cada pantalla. **Cuándo:** P1.

### D2 · Los errores del servidor no avisan a nadie

Sentry solo recoge los del navegador. Si un restaurante llama diciendo «no me va», hoy no se puede ver qué pasó.

_Medio_

Los fallos del servidor quedan en los registros de Supabase, que en el plan gratuito duran poco. **Solución:** errores del servidor a Sentry con el hilo de correlación (ya existe), y un buscador por hilo en el admin. Para el TPV, además, el latido de cada aparato: versión, conexión, impresora y último error. **Cuándo:** P1 el servidor; los aparatos, antes de M20A.

### D3 · El reloj lo hace todo de una vez

Un solo latido recorre todas las cuentas. Con unos cientos de locales no cabrá en el tiempo que da Supabase.

_Medio · CONFIRMADO (LÍMITES)_

Correos, Stripe, Google e informes de todas las cuentas en un latido. Las funciones tienen 150 s (gratis) o 400 s (pago) y 2 s de CPU ([límites](https://supabase.com/docs/guides/functions/limits)), y `pg_net` espera 60 s. **Solución:** repartirlo en la cola de trabajos (`estook.trabajo`, que ya existe) por cuenta y por tandas, y montar el trabajador que consume la bandeja de salida, para que una venta del TPV no espere a recalcular costes. **Cuándo:** P1–P2, antes de M20.

### D4 · Gráficas que contestan una pregunta

Hoy: tarjetas de cifra con flecha y objetivo (bien) y tres gráficas de barras sin comparar. Propuesta: un catálogo de gráficas con su pregunta.

_Medio_

| La pregunta                                      | La gráfica                                                                                      | Dónde                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------ |
| ¿Voy mejor que la semana pasada?                 | Línea de este periodo y el anterior en gris, con la diferencia al final                         | Ventas, Informes         |
| ¿A qué hora se me llena?                         | Mapa de calor día × hora (ventas o tickets)                                                     | Negocio, cuadrante (H)   |
| ¿Qué platos me dan dinero y cuáles solo trabajo? | Matriz de popularidad y margen (ingeniería de menú: estrellas, caballos, rompecabezas y perros) | Carta (M10)              |
| ¿Dónde se va el margen?                          | Cascada: ventas → género → personal → mermas → margen                                           | Negocio, Pulse           |
| ¿Llego al objetivo?                              | Barra contra la línea del objetivo, con lo que falta                                            | Panel, Informes          |
| ¿Qué 20 % me hace el 80 %?                       | Pareto de productos o proveedores                                                               | Almacén, Compras         |
| ¿Cuánto me cuesta el personal para lo que vendo? | Ventas por hora trabajada, por franja                                                           | Negocio (con H y el TPV) |

**Reglas:** rojo solo para lo malo (la muestra del sistema de diseño pinta el margen en rojo); siempre el periodo comparable; unidades en el eje; el detalle al tocar; y una tabla escondida para lectores de pantalla. **Cuándo:** antes de M21, y pasar Informes y Ventas.

### D5 · Permisos que crecen sin llenar el código de condiciones

El catálogo cerrado y la matriz en la base están muy bien. Al contrato de cada operación le faltan tres cosas que pide el TPV.

_Medio_

1. **Aprobación** de otro con su PIN. 2) **Límites**: «descuento hasta un 10 %; más, un encargado». 3) **Solo lo mío** (el camarero ve sus tickets del turno, Roles 1.12). Una sola pieza en el despachador, declarada en cada operación igual que hoy `exige`, y la pantalla lo lee del mismo sitio. Toast lo hace así: permisos por puesto y aprobación con el código del encargado ([su guía de permisos](https://support.toasttab.com/en/article/Access-Permissions-Reference)). **Cuándo:** diseñarlo antes de M20A.

### D6 · Lo que le falta a cómo se usa Estook TPV

El capítulo 10 del Anexo es bueno. Le faltan cosas que en un bar español se usan cada día.

_Medio_

- **Repetir la última ronda** en dos toques («otra ronda»).

- **Artículo libre** con precio y permiso («varios 3 €»), con su descripción, que VeriFactu la pide.

- **Productos a peso** (pescado, jamón), con balanza o escribiendo el peso.

- **Grupos de modificadores reutilizables** («punto de la carne» para cinco platos), con mínimo, máximo, precio por canal y **su propio escandallo**: «extra de queso» gasta queso. Sin esto, el almacén miente.

- **Fichar y entrar al TPV con el mismo PIN**, y poder limitar el TPV a quien está fichado (Toast lo tiene). Nadie más puede hacerlo sin tener los fichajes.

- **Bloqueo automático** por inactividad, y «bloquear al mandar» como opción del local.

- **Llave o tarjeta de camarero**: los lectores USB escriben como un teclado y el navegador ya los lee (como el lector de L).

- **Pantalla para el cliente** en la barra (segunda pantalla del PC).

- **El Z con anulaciones, invitaciones, descuentos y aperturas de cajón**, con quién. Es el control antifraude del dueño.

- **Una tabla de toques objetivo**, no solo «4 platos en 10 toques» (en H · «Velocidad»).

**Cuándo:** escribirlo en el Anexo antes de M20A.

### D7 · La empresa fiscal no existe como pieza

Organización → local no basta: falta la empresa con su NIF, que puede tener varios locales, o una organización varias empresas.

_Medio · NO EXISTE_

Es la pregunta que dejó abierta `lo-que-el-tpv-toca-de-lo-construido.md` (punto 5), y hoy la organización ni siquiera tiene CIF (ESTADO, A2). El modelo completo está en K. **Cuándo:** diseñarlo ya; construirlo con la primera necesidad (los datos fiscales de quien paga la cuota, o M20B).

### D8 · Borrados en cascada donde la ley obliga a guardar

Si alguien borrara un local, se llevaría sus fichajes, compras y cierres de caja.

_Bajo_

`on delete cascade` desde `local` en fichajes, facturas de compra, albaranes y cierres de caja (migraciones 0023, 0027, 0029, 0031). Hoy no pasa porque otras tablas lo impiden y no hay forma de borrar un local, pero es una trampa para un script futuro. **Solución:** «no se puede borrar» en lo que se guarda por ley, y un disparador contra `truncate` en la auditoría y, mañana, en facturación. Migración pequeña. **Cuándo:** P2.

### D9 · La exportación completa que prometen las condiciones

«Lo que escribes es tuyo y puedes exportarlo». Hoy solo hay exportaciones sueltas.

_Medio · PARCIAL_

Un botón en Ajustes que prepara todo el negocio (CSV por tabla y PDF de lo que es documento) y avisa cuando está. Es también la base de la baja y de la exportación de fichajes para la Inspección. **Cuándo:** P1.

### D10 · La app instalable (entrega I) es la base del TPV

Service worker, actualización controlada y cola sin conexión. Y quitar la orientación vertical fija del manifiesto.

_Medio · DOCUMENTADO_

La entrega I ya está bien pensada (la hora del fichaje sin conexión la decide el servidor). Añadir: la actualización no se aplica sola en mitad del trabajo; y `"orientation": "portrait"` del manifiesto bloquea las tablets apaisadas y las pantallas de cocina una vez instaladas. **Cuándo:** P1.

### D11 · Alérgenos: que quede claro de quién es la responsabilidad

Estook los calcula de las fichas y avisa en sala. Si un dato está mal, alguien puede acabar en urgencias.

_Medio · CONFIRMADO POR NORMATIVA · PENDIENTE (CONDICIONES)_

La información de alérgenos es obligación del local (Reglamento UE 1169/2011 y [RD 126/2015](https://www.boe.es/buscar/act.php?id=BOE-A-2015-2293)). **Solución:** decir de dónde sale cada alérgeno y desde cuándo; guardar la versión con fecha (qué decía la ficha el día de la venta); avisar de que las trazas por contacto en cocina no se deducen de los ingredientes; y dejarlo en las condiciones. **Cuándo:** antes de M12 y M20A.

### D12 · Fogón y la ley europea de IA

Hay que decir siempre que es IA, y «Fogón propone el horario» es un uso de alto riesgo a partir de diciembre de 2027.

_Medio · CONFIRMADO · PENDIENTE DE VALIDACIÓN_

La obligación de avisar de que se habla con una IA (art. 50) aplica desde agosto de 2026. Los sistemas que reparten trabajo entre empleados son de alto riesgo (anexo III); el Omnibus retrasó esas obligaciones al 2 de diciembre de 2027 ([resumen de White & Case](https://www.whitecase.com/insight-alert/eu-ai-omnibus-enters-force-amending-ai-act)). Y el local tiene que informar a los representantes de los trabajadores de los algoritmos que afectan a sus condiciones (ET, art. 64.4.d). **Solución:** diseñarlo ya así: Fogón propone, decide una persona, y nunca puntúa a nadie. **Cuándo:** antes de M22.

### D13 · Las pruebas de pantalla no miran las palabras

La captura de referencia enseña «Inventario», la pantalla dice «Almacén», y la prueba pasa.

_Bajo_

La comparación deja hasta un 0,2 % de píxeles distintos, y un cambio de palabra cabe (`sistema-navegar-*.png`, del 24-sep). Y `pruebas/e2e/capturas/win32` son 32 capturas viejas que no se usan (una se llama `inventario-vacio`, justo lo que pediste que no quedara). **Solución:** regenerar, comparar por zonas más pequeñas y borrar las viejas. **Cuándo:** P2.

### D14 · Componentes grandes: partirlos cuando se toquen, no ahora

97 ficheros pasan de 300 líneas. No hay fallos por ello, y buena parte son comentarios.

_Bajo_

El más grande, `apps/app/src/almacen/FichaDeProducto.tsx` (1.879 líneas, con un componente de unas 750). Le siguen `consultas/almacen.ts` (1.827), `panel/widgets.tsx` (1.455) y `consultas/equipo.ts` (1.250). Partirlos ahora sería riesgo sin beneficio. **Regla nueva:** un componente se parte cuando se toca y pasa de unas 400 líneas de código, por responsabilidades (la ficha, la hoja de corregir, la del aprovechamiento); y la regla de A2 se reescribe a eso.

### D15 · Ajustes → Avisos, con poco texto

Dieciséis filas con dos interruptores y dos o tres líneas cada una.

_Bajo_

Con tu criterio de «poco texto»: tres opciones arriba (Lo recomendado · Solo lo urgente · Todo), el detalle plegado debajo. **Cuándo:** cuando se vuelva a tocar Ajustes.

## Mejoras opcionales

Interesantes, algunas pueden ser ventaja clara, pero no son necesarias ahora.

### E1 · Facturar sin internet desde el local

Que Enlace genere el registro VeriFactu cuando no hay red y lo mande después con «incidencia», como permite la AEAT.

_Oportunidad · PENDIENTE DE VALIDACIÓN_

Sería una ventaja real frente a los TPV que solo funcionan en la nube. Exige comprobar con el asesor y con la documentación técnica de la AEAT cómo se encadenan los registros de varios locales del mismo NIF, y si Verifacti admite registros generados fuera. **Cuándo:** después de M20B.

### E2 · Datáfono conectado, pago en la mesa por QR y Bizum

El datáfono conectado ya está previsto. Pagar en la mesa con el móvil exige que el local tenga su propio proveedor de pagos.

_Oportunidad_

Estook nunca toca el dinero: el pago en mesa iría con la cuenta del local en su proveedor, igual que el datáfono conectado.

### E3 · Pantalla de cliente, balanza, cajones que cuentan solos

La balanza se puede leer desde Chrome o Edge (puerto serie) o desde Enlace.

_Oportunidad_

### E4 · Reservas, por integración

Tu recorrido del día empieza «revisar reservas» y Estook no tiene reservas.

_Oportunidad_

Conectar con CoverManager, TheFork o similares antes que construir las propias: que las reservas del día salgan en «Hoy» y en el plano de mesas.

### E5 · Pedir desde la mesa con la carta digital

Food&Service lo tiene. En Estook encaja con M12 y la cocina de M20A.

_Oportunidad_

### E6 · Particionar la auditoría y las ventas por mes, y agregados diarios

Cuando crezcan. Con el TPV, la auditoría crece rápido.

_Oportunidad_

### E7 · Instaladores o socios locales

Ágora y Glop venden a través de distribuidores que instalan y atienden en el local. Ver L6.

_Oportunidad_

## Lo que no tocaría

Funciona, está probado y cambiarlo sería perder calidad para hacerlo «diferente».

    El despachadorPuertas, permisos, idempotencia y errores traducidos, en un sitio.
    La conexión a la baseset local role en cada transacción y seguridad por filas en todas las tablas.
    El libro de movimientosCon su candado y lo que hay como vista.
    El motor fiscalUn redondeo, reglas con vigencia, territorio con check.
    La auditoríaSolo añade, con dos barreras.
    El PIN y el loginSal por local, índice único, tiempos iguales, bloqueo en base.
    Los catálogosApps, widgets, acciones, eventos, errores y permisos, cerrados.
    El cliente de la APIHilo, idempotencia y errores en cristiano.
    Stripe y el relojFirma comprobada, re-lectura, secreto por huella.
    El sistema de diseñoFichas, modo cocina, oscuro medido.
    Lo fiscal del AnexoModalidad, series, R5, F3, QR, declaración, no borrar un NIF.
    Las migracionesNumeradas, reversibles y comprobadas en GitHub.

## Comparativa con el mercado

Separo lo que está en su documentación (con enlace) de mi opinión. Hay patrones que copiar y cosas que no.

| Producto                  | Lo que hace bien (documentado)                                                                                                                                                                                                                                                                                                                                                                                                                             | Lo que deja (opinión)                                    | Qué aprender                                                    | Qué no copiar                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| **Toast** EE. UU.         | Un aparato del local hace de centro sin internet y las pantallas de cocina siguen recibiendo ([doc.](https://doc.toasttab.com/doc/platformguide/platformOfflineModeLocalSync.html)). Aun así, sin internet un TPV no ve las comandas de otro, solo cocina. Permisos por puesto y aprobación con el código del encargado; limitar permisos al puesto fichado ([doc.](https://support.toasttab.com/en/article/Limit-POS-Permissions-to-the-Clocked-in-Job)). | Obliga a su hardware y vive de la comisión de los pagos. | El centro del local, la aprobación del encargado, fichar = TPV. | Atar el hardware; cobrar por transacción.   |
| **Lightspeed Restaurant** | Sin internet sigue mandando a cocina e imprimiendo y sincroniza al volver ([doc.](https://k-series-support.lightspeedhq.com/hc/en-us/articles/4403006478107-How-printing-works)).                                                                                                                                                                                                                                                                          | Solo iPad; inventario ligero.                            | Un modo sin conexión completo.                                  | Depender de un solo tipo de aparato.        |
| **Square**                | Empezar en minutos, cuota baja.                                                                                                                                                                                                                                                                                                                                                                                                                            | Back-office de cocina flojo.                             | La sencillez del alta.                                          | El modelo de comisión.                      |
| **Revo XEF** España       | Sin internet y sin «iPad Host»: venta directa, mesas abiertas solo para mirar, sin número de pedido ni impresión; con Host, sigue todo ([doc.](https://support.revo.works/es/articles/13)).                                                                                                                                                                                                                                                                | Solo iPad; integraciones por solicitud.                  | Decir claro qué funciona sin red y qué no.                      | Depender de un iPad concreto como servidor. |
| **Last.app** España       | Más de 250 integraciones; se conecta con Gstock y Apicbase.                                                                                                                                                                                                                                                                                                                                                                                                | Back-office por terceros.                                | Las integraciones como producto (ya está en la Evolución).      | —                                           |
| **Ágora · Glop** España   | Windows con base local: funcionan sin internet por diseño.                                                                                                                                                                                                                                                                                                                                                                                                 | Aspecto antiguo, nube a medias.                          | Su red de distribuidores que instala y atiende en el local.     | La base en un solo PC.                      |
| **Food&Service** España   | Nube, licencias ilimitadas, soporte 365 días por teléfono y WhatsApp, Bizum, KDS, carta QR, VeriFactu. Exige internet siempre ([su web](https://foodyservice.com/en/pos)).                                                                                                                                                                                                                                                                                 | Sin modo sin conexión; inventario básico.                | Licencias ilimitadas y soporte cercano.                         | Depender del todo de internet.              |
| **Gstock · Apicbase**     | Back-office de cocina y compras.                                                                                                                                                                                                                                                                                                                                                                                                                           | Esconden el precio.                                      | —                                                               | Esconder el precio.                         |

    Mejor que ellosLa cocina ve el plato (ficha, alérgenos), «Quedan N» con el escandallo, cada venta mueve el almacén al momento, fichar y TPV con el mismo PIN, cualquier impresora, precio público.
    Peor que ellos, hoyAún no cobra; no funciona sin conexión; no hay soporte en horario de servicio ni quien instale; no hay reservas ni pagos integrados.
    La ventaja que puede ser nuestraSer el único TPV en la nube que sigue facturando sin internet (E1) y el único que sabe lo que cuesta cada plato que vende.

## La arquitectura recomendada

Cómo queda Estook con las mejoras. No es rehacer: es añadir las piezas del TPV en su sitio y escribir lo que falta.

    GestionaEstookAlmacén, escandallos, carta, equipo, horarios, Negocio. Con conexión.
    OperaEstook TPVSala, barra, cocina, cobro y caja. Funciona sin conexión.
    ConectaEstook EnlaceEl centro del local: impresoras, cajón, pantallas de cocina, cola sin internet.
    EntiendeFogónLee lo mismo que tú, con tus permisos, y explica. Nunca toca una factura.

    En la nube · Supabase, Unión Europea
      API · despachadorDominio (cálculos)Base · estookBase · facturacion (solo inserción)Trabajador (cola)Tiempo real (comandas, mesas)Fogón
      Adaptador VeriFactu → Verifacti → AEATStripe (cuota)Datáfono conectado (futuro)

    ⇅ internet cuando lo hay
    En el restaurante · red del local
      Estook en el móvil o el PCTerminales Estook TPV (sala, barra, comandero)Pantallas de cocina y pase
      ⇅ red del local, también sin internet
      Estook Enlace · el centro del localImpresoras ESC/POSCajónBalanza (futuro)

### El modelo: quién, dónde, desde qué, con qué caja

Lo que pide tu documento: que usuario, empleado, dispositivo, terminal, sesión y caja no sean la misma cosa.

| Pieza                     | Qué es                                                                                              | Cómo se relaciona                                                                       | Hoy                     |
| ------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| **Organización**          | El cliente de Estook: quien contrata y paga la cuota                                                | Tiene una o varias empresas y uno o varios locales                                      | Existe                  |
| **Empresa fiscal**        | El obligado tributario: NIF, razón social, domicilio fiscal, SII sí o no, representación firmada    | De una organización; tiene uno o varios locales                                         | Falta (K)               |
| **Local**                 | El establecimiento: dirección, zona horaria, territorio (IVA o IGIC), series                        | De una empresa; tiene terminales, cajones, impresoras, zonas y mesas                    | Existe, sin empresa     |
| **Persona**               | Alguien, con o sin correo                                                                           | Tiene membresías (rol + alcance) y un PIN por local                                     | Exige correo (C1)       |
| **Membresía y rol**       | Qué puede hacer y dónde                                                                             | Permisos de la matriz, recortados por local                                             | Existe                  |
| **Aparato personal**      | El móvil o el PC de alguien                                                                         | Su sesión es de la persona (30 días, revocable)                                         | Existe                  |
| **Terminal del local**    | Tablet, PC táctil o pantalla de cocina del restaurante, con una función (sala, barra, cocina, pase) | Emparejado con el local por código o QR; su sesión es del aparato, revocable            | Decidido, sin construir |
| **Operador**              | Quién usa el terminal ahora                                                                         | Entra con su PIN; se bloquea por inactividad o al mandar; lo que hace queda a su nombre | Falta (C2)              |
| **Aprobación**            | Un encargado autoriza algo con su PIN                                                               | Queda quién pidió, quién aprobó, qué y cuándo                                           | Falta (D5)              |
| **Cajón y turno de caja** | El cajón físico, y su apertura → arqueo → cierre                                                    | Un turno abierto por cajón; varios terminales pueden usar el mismo cajón                | Documentado             |
| **Bolsa del camarero**    | El efectivo que lleva encima quien cobra en la mesa                                                 | Se liquida en un cajón al acabar el turno                                               | Falta (C3)              |
| **Cuenta**                | El pedido: mesa, barra, para llevar o reparto                                                       | Tiene líneas (comensal, tanda, partida, modificadores)                                  | Documentado             |
| **Cobro → pagos**         | Lo que se cobra (un documento) y cómo se paga (uno o varios pagos)                                  | Los pagos en efectivo mueven su caja o su bolsa                                         | Por corregir (C3)       |
| **Venta**                 | El hecho operativo que mueve el almacén                                                             | Nace al cobrar; una por cobro                                                           | Por corregir (C4)       |
| **Documento fiscal**      | Ticket, factura, canje, rectificativa                                                               | Acompaña al cobro; vive en `facturacion`, con su registro y sus envíos                  | Documentado (B3)        |

La pregunta de tu documento, contestada en orden: quién es la persona → qué puede lo dice su membresía en ese local → dónde es el local del terminal → desde qué es el terminal → qué sesión es la del terminal más el turno del operador → con qué caja es el turno del cajón o su bolsa.

### Qué pasa si un camarero intenta…

| Acción                                        | Qué pasa                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Descontar o invitar                           | Sale «Lo aprueba un encargado»: su PIN en la misma pantalla, con motivo. Queda quién pidió y quién aprobó |
| Quitar un plato ya en cocina                  | Igual, y cocina lo ve tachado con aviso                                                                   |
| Devolver o rectificar                         | No puede; solo gerente o dirección, con motivo                                                            |
| Abrir o cerrar caja, abrir el cajón sin venta | No, salvo que el local se lo dé; con el cajón sin venta siempre queda en el X y el Z                      |
| Cambiar un precio                             | No existe en el TPV: el precio es de la carta. Un artículo libre pide permiso                             |
| Ver ventas del local o costes                 | El servidor no se los manda. Ve lo suyo del turno                                                         |
| Salir del TPV a la gestión                    | Solo con el PIN de alguien que pueda                                                                      |

### Dónde vive cada cosa

| Sitio                          | Qué vive ahí                                                                                                                       | Qué no vive nunca ahí                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Nube**                       | La verdad: carta, precios, IVA, permisos, cuentas, ventas, caja, facturas, cola de impresión, analítica, Fogón                     | —                                                          |
| **Navegador (PWA)**            | Las pantallas, una copia de trabajo (carta, plano, mesas abiertas), la cola de lo que falta por mandar, el bloqueo por inactividad | Huellas de PIN, claves, lo único de algo                   |
| **Cáscara nativa (Capacitor)** | Imprimir directo sin Enlace (food truck), quiosco, pantalla encendida, sonido en segundo plano; el iPad                            | Pantallas propias                                          |
| **Estook Enlace**              | El relevo entre aparatos sin internet, la impresión, el cajón, la cola local, la comprobación de PIN sin red, la balanza           | Decisiones de negocio: solo transporta                     |
| **El terminal**                | Nada que no sea una copia                                                                                                          | Datos que solo estén en él: si se rompe, no se pierde nada |

### Los aparatos

| Aparato                                                 | Cómo funciona con Estook                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| PC Windows táctil (TPV de barra)                        | Estook TPV instalado desde Edge o Chrome, a pantalla completa, y Enlace en el mismo PC            |
| Tablet Android                                          | Estook TPV instalado desde Chrome; o la cáscara                                                   |
| iPad                                                    | La cáscara (Safari no deja hablar con la red del local)                                           |
| Móvil del camarero                                      | El comandero: Estook TPV en una columna                                                           |
| Pantalla de cocina                                      | Tablet o pantalla con Estook TPV en modo cocina, en quiosco; recibe por Enlace si no hay internet |
| Impresora de cocina y de tickets                        | Cualquier ESC/POS, por Enlace; o las que preguntan solas a la nube                                |
| Cajón                                                   | Enchufado a la impresora de tickets; se abre con una línea del ticket                             |
| Datáfono                                                | El del banco (se teclea y se cuadra al cierre) o uno conectado por internet                       |
| Lector de códigos, llave de camarero, teclado de cocina | Escriben como un teclado: el navegador ya los lee                                                 |
| Balanza                                                 | Por el puerto serie desde Chrome o Edge, o por Enlace (futuro)                                    |

### Estook TPV instalado en Windows

- **Instalar:** «Instalar Estook TPV» en Edge o Chrome, desde `estook.com/tpv`, con su icono.

- **Encender con Windows:** Enlace deja un acceso directo en el inicio, o Edge en modo quiosco para un PC que solo cobra.

- **Pantalla completa** y sin barra del navegador.

- **Sesión:** la del terminal dura hasta que se revoca; el operador entra y sale con su PIN.

- **Actualizaciones:** se descargan solas, se aplican con la caja cerrada o sin mesas abiertas, nunca en mitad de un cobro. Si una versión es obligatoria, la API lo dice y el TPV lo avisa.

- **Al cerrar o reiniciar:** vuelve a su función, bloqueado, con lo pendiente de mandar intacto.

- **Sin conexión:** ver la tabla siguiente.

- **Impresión y hardware:** por Enlace. El navegador nunca habla con una impresora.

### Sin conexión: qué funciona

| Lo que pasa                                 | Con Enlace en el local                                                                                                                        | Sin Enlace                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Hay internet, pero cae Estook (el servidor) | Se toma nota, cocina recibe, imprime, se cobra con justificante. Todo sube al volver                                                          | Se toma nota en cada aparato; cocina no recibe (aviso claro en sala); se cobra con justificante |
| Hay Estook, pero cae internet del local     | Igual que arriba                                                                                                                              | Igual que arriba                                                                                |
| Hay wifi sin internet                       | Igual: la red del local funciona                                                                                                              | Igual que arriba                                                                                |
| No hay wifi                                 | Cada aparato solo; lo pendiente se guarda                                                                                                     | Cada aparato solo; papel                                                                        |
| Un solo terminal pierde conexión            | Los demás siguen; el suyo sube al volver                                                                                                      | Igual                                                                                           |
| Se cae durante un cobro                     | El cobro lleva su clave: al volver, o está hecho o se hace una vez. El datáfono del banco no depende de Estook                                |                                                                                                 |
| Se cae después de mandar una comanda        | La comanda nace con su identificador en el aparato: reintentar no la duplica                                                                  |                                                                                                 |
| Se cae mientras imprime                     | Cada trabajo tiene su identificador y la impresora confirma: no sale dos veces                                                                |                                                                                                 |
| Vuelve internet                             | Sube en orden, se emiten los tickets pendientes marcados como incidencia, y la sala lo ve una vez: «Conexión recuperada · 3 tickets emitidos» |                                                                                                 |

**Funciona sin conexión:** tomar nota, mandar y marchar, marcar listo, precuenta, cobrar en efectivo o con el datáfono del banco (con justificante), abrir el cajón, el informe X, fichar y apuntar mermas. **No funciona:** emitir el ticket (en la primera versión), la factura a petición, las rectificativas, cambiar la carta o los precios, dar de alta a alguien, el datáfono conectado y los pedidos de reparto. **Lo que hace falta:** identificadores creados en el aparato, la cola del aparato con sus estados, la idempotencia (ya existe), reglas de conflicto (a una mesa se le añaden líneas, nunca se sobreescriben; los cambios de estado llevan versión), la hora del servidor estimada (ya diseñada en la mejora 15) y Enlace.

### Caja y dinero

| Concepto            | Qué es                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| Cajón (caja física) | El cajón portamonedas, enchufado a una impresora                            |
| Terminal            | La pantalla que cobra; tiene un cajón por defecto                           |
| Turno de caja       | Apertura con fondo → movimientos → arqueo → cierre. Uno abierto por cajón   |
| Bolsa del camarero  | Un turno de caja de una persona, sin cajón; se liquida en un cajón          |
| Entradas y salidas  | Movimientos con motivo y autor; la apertura sin venta es uno más            |
| Efectivo esperado   | Fondo + cobrado en efectivo + entradas − salidas − devoluciones en efectivo |
| Contado             | Arqueo ciego, por billetes y monedas                                        |
| Diferencia          | Contado − esperado. Se guarda y no bloquea                                  |
| Tarjeta             | Total del cierre del datáfono frente a lo cobrado con tarjeta               |
| Informe X / Z       | Consultas del turno, no documentos fiscales. El Z cierra el turno           |
| Cierre del día      | La suma de los Z del día: rellena el cierre de caja de Servicio             |

Quién puede qué sigue la tabla 1.12 de Roles, con dos añadidos: **la bolsa** la liquida quien lleva la caja, y **retirar dinero** es una salida con motivo que pide jefe de sala o gerente. Con dos TPV, los dos pueden usar el mismo cajón y el mismo turno; con dos cajones, dos turnos. Cada pago en efectivo va al turno del cajón que se abrió o a la bolsa de quien cobró.

### Cómo se hablan los módulos

| Cadena                                     | En el momento, en la misma transacción   | Después, por la cola                                   |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------ |
| Venta → almacén → costes → Negocio → Fogón | La venta y sus salidas del almacén       | Costes del día, cifras, informes, lo que lee Fogón     |
| Compra → almacén → costes → escandallo     | La entrada del género y su precio        | Recalcular platos afectados y avisar si baja el margen |
| Fichaje → equipo → horarios → Negocio      | El fichaje                               | Horas, coste de personal, ventas por hora trabajada    |
| Producto → carta → TPV → cocina            | Cambiar la carta publica una versión     | Los terminales la reciben por tiempo real              |
| TPV → caja → ventas → Negocio              | Cobro, pagos, movimiento de caja y venta | El documento fiscal (si no hay red), cifras, informes  |

Regla: un módulo nunca escribe en las tablas de otro; publica un evento (ya existe el catálogo cerrado y la bandeja de salida) y el otro reacciona. Lo que no puede quedar a medias va en la misma transacción; lo demás, por la cola, con el trabajador de D3.

### Fogón dentro de todo esto

La base ya es la buena: Fogón no arma nada en el navegador, lo arma el servidor con los permisos de quien pregunta (decisión 0023). Lo que le falta para «entender»: **las mismas cifras que el Panel** (que use `calcularElIndicador` y `laCifraEscrita`, nunca sus propias cuentas, para no contradecir nunca una tarjeta), **agregados diarios** (M21) para no recorrer tablas enteras, **la historia de los eventos** para explicar el porqué, y **herramientas que son las consultas que ya existen**, con su permiso. Y nunca toca una factura.

### Los documentos: una fuente por tema

| Tema                           | Fuente única                                                                                                   | Los demás                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Dónde estamos                  | `ESTADO.md`, 150 líneas como mucho                                                                             | La historia, en `historia-de-los-modulos.md` |
| Qué es el producto             | Manifiesto (con lo que hoy es la Evolución: visión y mercado)                                                  | Enlazan                                      |
| Arquitectura                   | Un documento nuevo: capas, el modelo de esta sección, aparatos, sin conexión, comunicación, despliegue, copias | Plan A3–A5 y Anexo 2–3.4 pasan a enlazarlo   |
| Estook TPV y facturación       | El Anexo, y solo el Anexo                                                                                      | Un párrafo y un enlace en cada maestro       |
| Quién ve qué                   | Roles                                                                                                          | —                                            |
| Qué desencadena cada cambio    | Auditoría de flujos                                                                                            | —                                            |
| Cómo se trabaja y en qué orden | Plan (reglas, módulos, terminado)                                                                              | El sistema de diseño (B1–B8) puede ir aparte |
| Por qué está hecho así         | `docs/decisiones/`                                                                                             | —                                            |
| Lo que cambió en cada versión  | Un solo registro de cambios de los maestros                                                                    | Se quita de la cabecera de cada uno          |
| Tus pasos                      | Uno por entrega, que se archiva al acabar                                                                      | —                                            |

### Velocidad: toques objetivo

| Estook TPV                       | Objetivo        | Estook                  | Objetivo         |
| -------------------------------- | --------------- | ----------------------- | ---------------- |
| Abrir mesa                       | 1 toque         | Dar de alta un producto | escanear + 2     |
| Añadir un plato                  | 1 toque         | Preparar un pedido      | 1 toque (R2)     |
| Opción obligatoria               | +1 por pregunta | Apuntar una merma       | 3 toques         |
| Mandar a cocina                  | 1 toque         | Consultar lo que hay    | buscador, 150 ms |
| Repetir ronda                    | 2 toques        | Fichar                  | 1 toque          |
| Mover mesa                       | 3 toques        | Ver mi horario          | 0 (en el Panel)  |
| Dividir la cuenta                | 3–5 toques      | Abrir un aviso          | 1 toque          |
| Cobrar una caña en barra, exacto | 3 toques        | Hacer un escandallo     | M9               |
| Imprimir el ticket               | 0 (solo)        |                         |                  |
| Anular una línea                 | 2 + motivo      |                         |                  |
| Cambiar de camarero              | su PIN, < 1 s   |                         |                  |
| Abrir caja                       | 3 toques        |                         |                  |

### Con 1, 10, 100 y 1.000 restaurantes

|       | Qué aguanta                                                   | Qué se rompe                                                                                                     | Qué hacer ya                                                                          |
| ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1–10  | Todo                                                          | Sin copias, un fallo es definitivo (B1)                                                                          | Copias y plan Pro                                                                     |
| 100   | API, base, seguridad por filas, agrupador en modo transacción | El reloj de una pasada (D3); errores sin ver (D2); el Panel con un año de datos si no hay agregados              | Cola de trabajos, Sentry del servidor, región                                         |
| 1.000 | El diseño (datos por local, idempotencia)                     | Conexiones de tiempo real de miles de terminales y pantallas; tamaño de la auditoría; coste de Verifacti por NIF | Comprobar los límites de tiempo real del plan antes de M20A; particionar por mes (E6) |

### Casos extremos

| Caso                                                 | ¿Lo soporta?      | Cómo                                                                                                     |
| ---------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| Dos personas cambian lo mismo                        | Sí                | Versión en cada fila: gana quien guarda primero y al otro se le enseña                                   |
| Dos TPV tocan la misma mesa                          | Por diseñar       | Añadir líneas nunca choca; los cambios de estado llevan versión                                          |
| Dos cobran la misma cuenta                           | Por diseñar       | El segundo recibe «ya está cobrada»                                                                      |
| Una petición llega dos veces                         | Sí                | Clave de idempotencia en todos los comandos                                                              |
| Falla después de ejecutarse                          | Sí / por corregir | Sí en Estook; en Verifacti, B3                                                                           |
| Se cierra el navegador a medias                      | Sí                | Cada comando es todo o nada; la cola del aparato, por construir                                          |
| Se reinicia Windows o se apaga el TPV                | Por construir     | El terminal vuelve a su función; lo pendiente, en la cola y en Enlace                                    |
| Se pierde la impresora o la pantalla de cocina       | Documentado       | Cola con reintento y aviso; falta la impresora de respaldo de la pantalla                                |
| Cae un proveedor externo o va lento                  | Sí                | Cada uno detrás de su puerto; Verifacti con justificante                                                 |
| Un aviso de webhook llega dos veces o nunca          | Sí                | Stripe una vez por aviso y re-lectura; Verifacti con repaso diario (documentado)                         |
| Pierde permisos con la sesión abierta                | Sí                | Cada petición lo mira en la base                                                                         |
| Se da de baja a un empleado con histórico            | Sí                | Nada se borra: se desactiva                                                                              |
| Cambia un precio, un escandallo o el IVA tras vender | Sí                | Precio, coste y regla fiscal congelados en la línea                                                      |
| Migración a medias                                   | Sí                | Transaccionales y reversibles, comprobadas en GitHub                                                     |
| Restaurar una copia                                  | No                | No hay copias (B1)                                                                                       |
| Versión defectuosa y volver atrás                    | Parcial           | Web y API se vuelven a publicar; la base se revierte con riesgo; el TPV, con actualizaciones controladas |
| Se rompe un PC y se cambia                           | Por construir     | Revocar y emparejar otro en un minuto; lo pendiente del roto, en Enlace                                  |

### Un día en un restaurante, de principio a fin

| Momento                                                                        | Lo que hay hoy                                              | Lo que falta                                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------- |
| **Antes de abrir**: encender, entrar, abrir caja, ver avisos, stock y reservas | «Hoy», la campana, el Tablón, el pedido sugerido, fichar    | Terminal que enciende en su función; abrir caja; reservas (E4)  |
| **Servicio**: mesa, comanda, cocina, marchar, cobrar, imprimir                 | Nada (Fase 4)                                               | Todo el TPV, con B2, B3, C2, C3, C4 y D6 resueltos en el diseño |
| **Incidencia**: cae internet, se apaga un TPV, se pierde una impresora         | Nada                                                        | Enlace como centro del local (B2)                               |
| **Al cerrar**: mesas, arqueo, pagos, ventas, stock, jornada, informes          | Cierre de caja a mano o con CSV, informes, mermas, fichajes | Z y cierre del día (C3), exportación de fichajes (C9)           |

Con los cambios de este informe, el recorrido completo encaja sin contradicciones: nada de lo construido se rehace.

## Cumplimiento legal

No certifica que Estook cumpla: dice qué hay que revisar y qué construir para llevarlo al asesor. Cada fila lleva su fuente y su etiqueta.

| Requisito                                                                   | Norma                                                                                                                                                                                     | Aplica a Estook                               | Estado                                              | Riesgo                       | Cambio                                            | Prioridad                        | Validación       |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ---------------------------- | ------------------------------------------------- | -------------------------------- | ---------------- |
| Sistema de facturación conforme (SIF, VERI*FACTU)                           | [RD 1007/2023](https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840) · [Orden HAC/1177/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138)                                      | Cuando emita tickets                          | No emite (correcto)                                 | Alto si se vende sin cumplir | M20B + declaración responsable                    | Antes de vender el TPV           | NORMA ASESOR     |
| Fechas: sociedades 1-ene-2027, resto 1-jul-2027; fabricantes, ya            | RDL 15/2025 · [nota de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html) | A los clientes del TPV y a la cuota de Estook | Anotado                                             | Medio                        | Ninguno                                           | —                                | NORMA            |
| Contenido de la factura simplificada; límite de 3.000 € en hostelería       | [RD 1619/2012](https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696), arts. 4 y 7                                                                                                        | Ticket                                        | Bien en el Anexo 4.6                                | Bajo                         | Límite del reparto (400 € o 3.000 €)              | M20B                             | ASESOR (reparto) |
| Numeración correlativa sin huecos                                           | RD 1619/2012, art. 6                                                                                                                                                                      | Series                                        | Documentado con fallo                               | Alto                         | B3                                                | Ahora (documento)                | TÉCNICA          |
| Rectificativas (R5, R1/R4, S o I), canje F3, anulación                      | Orden HAC/1177/2024 · FAQ AEAT                                                                                                                                                            | Devoluciones y facturas a petición            | Documentado                                         | Medio                        | Ninguno                                           | M20B                             | ASESOR           |
| Integridad e inalterabilidad; prohibido el software de doble uso            | LGT, art. 29.2.j y 201 bis (Ley 11/2021)                                                                                                                                                  | Todo lo fiscal y los informes                 | Bien diseñado                                       | Alto si se relaja            | Añadir bloqueo de `truncate`; anulaciones en el Z | M20B                             | NORMA            |
| Seguir facturando si cae internet                                           | [FAQ de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/sistemas-verifactu.html)                                 | Cobro sin conexión                            | Documentado con error (C5)                          | Alto                         | Reescribir; justificante al asesor; E1            | Ahora (documento)                | NORMA ASESOR     |
| Conservar facturas y documentación                                          | LGT (4 años) · [Código de Comercio, art. 30](https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627) (6 años)                                                                               | Facturas, compras, cierres                    | El Anexo dice 4                                     | Medio                        | 6 años por defecto                                | Ahora (documento)                | ASESOR           |
| Declaración responsable dentro del programa                                 | Orden HAC/1177/2024, art. 15                                                                                                                                                              | Ajustes › Legal                               | Documentado                                         | Alto si falta                | Ninguno                                           | M20B                             | NORMA            |
| Tipos de IVA e IGIC; propinas; pedido de plataforma; ticket por correo o QR | LIVA · Ley del IGIC                                                                                                                                                                       | Carta, cobro, reparto                         | Pendientes del asesor                               | Medio                        | Ninguno hasta la respuesta                        | Antes de M20B                    | ASESOR           |
| Contrato de encargado del tratamiento                                       | [RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/oj), art. 28                                                                                                                            | Datos del equipo de cada local                | No existe (C8)                                      | Alto                         | Redactarlo y aceptarlo al crear cuenta            | Antes del primer cliente de pago | NORMA ASESOR     |
| Conservación y supresión                                                    | RGPD, art. 5.1.e                                                                                                                                                                          | Todo                                          | Contradictorio (C8)                                 | Medio                        | Tabla de conservación                             | P0                               | ASESOR           |
| Registro de actividades de tratamiento                                      | RGPD, art. 30                                                                                                                                                                             | Estook como responsable y como encargado      | No existe                                           | Bajo                         | Un documento                                      | P1                               | NORMA            |
| Geolocalización al fichar: informar antes                                   | [LOPDGDD](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673), art. 90                                                                                                                 | Fichar                                        | Solo al fichar (bien); falta el texto para el local | Medio                        | Plantilla de información al trabajador            | P1                               | NORMA            |
| Registro de jornada: diario, 4 años, accesible                              | ET, art. 34.9 · RD digital en trámite                                                                                                                                                     | Fichajes                                      | Parcial (C9)                                        | Alto si sale el RD           | C9                                                | Con H                            | NORMA RD         |
| Seguridad y poder restaurar                                                 | RGPD, art. 32                                                                                                                                                                             | Todo                                          | Seguridad bien; copias no (B1)                      | Crítico                      | B1                                                | Ahora                            | NORMA            |
| Aviso legal y cookies                                                       | LSSI-CE                                                                                                                                                                                   | La web                                        | Bien (solo técnicas)                                | Bajo                         | Añadir Google Places a la lista de proveedores    | P2                               | NORMA            |
| Alérgenos                                                                   | Reglamento UE 1169/2011 · [RD 126/2015](https://www.boe.es/buscar/act.php?id=BOE-A-2015-2293)                                                                                             | Fichas, carta digital, aviso en sala          | Parcial (D11)                                       | Medio                        | Origen, versión y condiciones                     | Antes de M12                     | ASESOR           |
| Inteligencia artificial                                                     | Reglamento UE 2024/1689 y Omnibus · ET, art. 64.4.d                                                                                                                                       | Fogón                                         | Documentado                                         | Medio                        | D12                                               | Antes de M22                     | ASESOR           |
| No ser entidad de pago                                                      | RDL 19/2018 (servicios de pago)                                                                                                                                                           | Cobro y datáfono                              | Bien: el dinero nunca pasa por Estook               | Bajo                         | Mantenerlo en el datáfono conectado               | —                                | TÉCNICA          |
| Accesibilidad                                                               | Ley 11/2023                                                                                                                                                                               | La web pública                                | Contraste probado                                   | Bajo (microempresa)          | Ninguno ahora                                     | —                                | ASESOR           |

«Norma» = confirmado en la fuente oficial citada. «Técnica» = mi interpretación técnica. «Asesor» = pendiente de validación profesional.

## Identidad fiscal y VeriFactu

### La empresa, el local y quién paga

| Pieza                         | Datos                                                                                                                                                                                                                                                                                       | Qué hereda el local                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Empresa fiscal** (obligado) | Razón social o nombre y apellidos, NIF, nombre comercial, domicilio fiscal completo, teléfono, correo, web, datos registrales si los hay, **si está en el SII**, **si su domicilio es foral**, la representación ante Hacienda con quién firmó y cuándo, y el titular o representante legal | NIF, razón social, domicilio fiscal, SII y foral: se heredan y no se repiten    |
| **Local** (establecimiento)   | Nombre comercial del local, dirección del establecimiento, código postal, municipio, provincia, país, zona horaria, **territorio** (ya existe: IVA o IGIC se decide por dónde se vende), series, terminales, cajas, impresoras                                                              | Lo suyo es suyo: un local en Tenerife de una empresa de Madrid factura con IGIC |
| **Quién paga Estook**         | Los datos de facturación de la cuota, en Stripe                                                                                                                                                                                                                                             | Puede ser otra empresa de la organización                                       |

Así caben **Empresa A → Madrid y Barcelona** y **Empresa B → Valencia** en una misma organización, cada local con sus series, terminales, cajas, empleados e impresoras. Hoy la organización ni tiene CIF: el modelo nuevo lo arregla también para la cuota.

### La arquitectura de la facturación

    Estook TPV · el cobro→Motor de facturación · facturacion→Adaptador ProveedorFacturacion→Verifacti→AEAT

El patrón es el adecuado y ya está en el Anexo: cambiar de proveedor es cambiar el adaptador. Lo que añado es qué guardar para **no depender nunca de que Verifacti siga existiendo**.

| Qué se guarda en Estook                                                                                                     | Por qué                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| El documento entero, congelado: líneas, desglose por tipo y clave de régimen, importes, destinatario, serie, número, fechas | Reimprimir y demostrar lo emitido sin nadie más                         |
| Su estado: preparado, enviando, registrado, pendiente por incidencia, aceptado con errores, rechazado                       | Saber siempre en qué punto está (B3)                                    |
| La clave de idempotencia (el id del documento)                                                                              | Reintentar sin duplicar                                                 |
| Lo que devuelve Verifacti: su identificador, el QR, la huella                                                               | El QR en papel y el enlace con su registro                              |
| Cada envío: fecha, respuesta, código                                                                                        | Explicar qué pasó a soporte y a un inspector                            |
| Los XML de petición y respuesta (`/verifactu/downloadXML`)                                                                  | Evidencia propia: Verifacti borra los datos 30 días después de cancelar |
| Los avisos recibidos por webhook, con su identificador                                                                      | Que el mismo aviso dos veces no cambie nada                             |

| La integración con Verifacti                                                         | Lo que sabemos                                                                             | Estado                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| Autenticación                                                                        | Clave por NIF y entorno; `vf_test_` pruebas, `vf_prod_` producción; la dirección no cambia | Comprobado el 20-sep (Anexo 4.1)      |
| Identificar al cliente                                                               | Por NIF, dado de alta por su API de gestión                                                | Documentado                           |
| Autorización                                                                         | Modelo de representación que firma el titular                                              | Documentado                           |
| Datos enviados                                                                       | Serie, número, fechas, tipo, destinatario, desglose, incidencia                            | Revalidar en M20B                     |
| Idempotencia                                                                         | `Idempotency-Key` en `create` (409 si se está procesando, 422 si el cuerpo no cuadra)      | Comprobado hoy · el Anexo no lo usaba |
| Estado y reintento                                                                   | `/verifactu/status`, `list`, `export`, `downloadXML`                                       | Comprobado hoy                        |
| Webhooks                                                                             | El Anexo los describe; hoy no los he encontrado en su documentación pública                | REVALIDAR                             |
| Precio con menos de diez NIF, acuerdo de nivel de servicio, contrato de subencargado | No publicado                                                                               | PREGUNTARLES                          |
| Registros generados fuera (para E1)                                                  | No aparece                                                                                 | PREGUNTARLES                          |

**Lo que sigue siendo de Estook aunque use Verifacti:** llamar a tiempo y con datos correctos, numerar sin huecos, poner el QR, publicar su declaración responsable, guardar sus documentos y no permitir nunca editar lo emitido. Que un proveedor diga «compatible con VeriFactu» no hace que Estook cumpla.

## Descubrimientos que no estaban en tu lista

Hay cosas importantes que no se habían pedido revisar y que conviene mirar antes de seguir.

|     | Qué he visto                                        | Por qué importa                                                                                                                                                                                        | Prioridad | Cuándo                 |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------- |
| L1  | No hay copias de seguridad (B1)                     | Se puede perder todo sin vuelta atrás                                                                                                                                                                  | Crítico   | Ahora                  |
| L2  | GitHub Pages prohíbe un SaaS comercial (C6)         | Pueden desactivar la web con clientes dentro                                                                                                                                                           | Alto      | Antes de cobrar        |
| L3  | La AEAT permite seguir facturando sin internet (C5) | Cambia el diseño del TPV y puede ser nuestra ventaja (E1)                                                                                                                                              | Alto      | Documentos, ya         |
| L4  | Una prueba depende del día de la semana (C7)        | `main` puede salir en rojo sin haber roto nada                                                                                                                                                         | Alto      | Ahora                  |
| L5  | La ventana de mercado de 2027                       | Los autónomos (la mayoría de bares) tienen que usar software adaptado desde el 1-jul-2027: muchos cambiarán de TPV en el primer semestre de 2027. Con el orden actual, Estook TPV llega después de M17 | Alto      | Decisión 2             |
| L6  | El soporte en horario de servicio y quién instala   | Un TPV que falla un sábado a las 22:00 necesita a alguien al teléfono. Ágora y Glop tienen distribuidores; Food&Service, soporte 365 días                                                              | Alto      | Antes de vender el TPV |
| L7  | La API lejos de la base (D1)                        | Latencia en cada pantalla                                                                                                                                                                              | Medio     | P1                     |
| L8  | La ley de IA y Fogón (D12)                          | Los horarios por IA son de alto riesgo desde dic-2027                                                                                                                                                  | Medio     | Antes de M22           |
| L9  | Alérgenos: la responsabilidad (D11)                 | Un error puede tener consecuencias graves para un cliente                                                                                                                                              | Medio     | Antes de M12           |
| L10 | Seis años de conservación, no cuatro (C8)           | Código de Comercio, art. 30                                                                                                                                                                            | Medio     | Documentos, ya         |
| L11 | Las capturas no miran las palabras (D13)            | Un cambio de texto no lo caza nadie                                                                                                                                                                    | Bajo      | P2                     |

## Tu documento, punto por punto

| #   | Punto                        | Estado                                  | En corto                                                                                                                                                                                                                                         | Dónde               |
| --- | ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 1   | Arquitectura general         | Implementado                            | Capas claras y vigiladas por máquina. Sin dependencias circulares. Falta la pieza del local para el TPV                                                                                                                                          | A, H                |
| 2   | Estook y Estook TPV          | Documentado                             | Comparten datos y permisos sin duplicar. Propuesta: puerta propia                                                                                                                                                                                | C11                 |
| 3   | Modelo de datos              | Parcial                                 | Existen organización, local, persona, membresía, rol, permiso, producto, proveedor, compra, movimiento, cierre, fichaje y auditoría. Faltan empresa fiscal, terminal, mesa, cuenta, cobro, pago, caja, impresora, venta; la persona exige correo | H · modelo, C1      |
| 4   | Acceso, PIN y sesiones       | Implementado (personas) · Parcial (TPV) | Contraseña, PIN, Google, segundo factor y sesiones revocables, bien. Falta operador, aprobación y PIN sin correo                                                                                                                                 | C2                  |
| 5   | Dispositivos y hardware      | Parcial                                 | Aparato personal y lector de códigos, hechos. Terminales, impresoras, cajón y datáfono, documentados                                                                                                                                             | H · aparatos        |
| 6   | PWA y Windows                | Parcial                                 | Manifiesto sí, service worker no; orientación vertical fija                                                                                                                                                                                      | D10, H              |
| 7   | Sin conexión                 | No existe                               | El diseño tiene un hueco                                                                                                                                                                                                                         | B2, H               |
| 8   | Caja y dinero                | Parcial                                 | Cierre diario a mano o con CSV, hecho. Turnos, arqueo y cajón con huecos                                                                                                                                                                         | C3, H · caja        |
| 9   | Diseño y experiencia         | Implementado                            | Sistema de diseño sólido, oscuro medido, vacíos que invitan. Detalles en D13–D15                                                                                                                                                                 | A, D                |
| 10  | Paneles y gráficas           | Parcial                                 | Tarjetas con flecha y objetivo, bien; gráficas sin comparar                                                                                                                                                                                      | D4                  |
| 11  | Velocidad de uso             | Parcial                                 | La app se mide en las pruebas; el TPV solo tiene una vara                                                                                                                                                                                        | H · velocidad       |
| 12  | Código demasiado grande      | —                                       | 97 ficheros grandes; no es urgente                                                                                                                                                                                                               | D14                 |
| 13  | Pantalla frente a reglas     | Implementado                            | Reglas en el dominio, la base y el despachador. Bien                                                                                                                                                                                             | A                   |
| 14  | Permisos y seguridad         | Implementado                            | Muy bien; crecerá con aprobación y límites                                                                                                                                                                                                       | A, D5               |
| 15  | Comunicación entre módulos   | Implementado                            | Reacciones en la misma transacción y bandeja de salida; falta el trabajador                                                                                                                                                                      | D3, H               |
| 16  | Impresión, cocina y Enlace   | Documentado                             | Bien pensado salvo sin internet                                                                                                                                                                                                                  | B2, H               |
| 17  | Rendimiento                  | Implementado (cliente)                  | Carga aparte y velocidad medida; en el servidor, región y reloj                                                                                                                                                                                  | D1, D3              |
| 18  | Documentación                | Implementado · redundante               | Mucha y trazable, repetida y contradictoria                                                                                                                                                                                                      | C10, H · documentos |
| 19  | Comparativa                  | —                                       | —                                                                                                                                                                                                                                                | G                   |
| 20  | Fogón                        | Documentado                             | La arquitectura lo permite; necesita las mismas cifras y agregados                                                                                                                                                                               | H · Fogón           |
| 21  | Un día en el restaurante     | —                                       | Encaja con los cambios                                                                                                                                                                                                                           | H · día             |
| 22  | Principios                   | Respetados                              | No se rehace nada                                                                                                                                                                                                                                | —                   |
| 23  | Legal                        | —                                       | —                                                                                                                                                                                                                                                | J                   |
| 24  | Identidad fiscal y VeriFactu | Parcial                                 | Falta la empresa fiscal; el flujo de emisión, a corregir                                                                                                                                                                                         | K, B3               |
| 25  | Auditoría abierta            | —                                       | —                                                                                                                                                                                                                                                | L                   |

## El plan, y lo que contestó Richi

Richi lo aprobó entero el 29 de septiembre por la noche. Donde añadió algo, va entre comillas.

### P0 · Imprescindible antes de seguir con H

| Punto    | Qué                                                                                                                                                                                                                                                                                                                                                                      | Quién                           | Cuándo                           | Richi                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **P0-1** | **Copias de seguridad de verdad.** Supabase a Pro, volcado semanal fuera de Supabase, copia de los ficheros y un simulacro de restauración. (ver B1)                                                                                                                                                                                                                     | Tú pagas Pro; yo monto el resto | Esta semana                      | Sí                                                                                                                                      |
| **P0-2** | **Arreglar la prueba que depende del día, y el reloj de la base.** Una rama pequeña. Después se puede fusionar la #78 sin rojo. (ver C7)                                                                                                                                                                                                                                 | Yo                              | Lo primero                       | Sí                                                                                                                                      |
| **P0-3** | **Corregir los documentos del TPV con lo encontrado.** Enlace como centro del local, emisión con estados y clave de idempotencia, cobro y pagos separados, bolsa del camarero, cierre del día, la venta al cobrar, «Quedan N» con lo comprometido, lo que dice la AEAT sin conexión, seis años de conservación, el esquema estook. Solo documentos. (ver B2 B3 C3 C4 C5) | Yo                              | Esta semana                      | Sí                                                                                                                                      |
| **P0-4** | **Personas sin correo, decidido y escrito.** Se construye al empezar H, porque el cuadrante tiene que incluir a todos. (ver C1)                                                                                                                                                                                                                                          | Tú decides; yo lo escribo       | Antes de H                       | Sí                                                                                                                                      |
| **P0-5** | **Salir de GitHub Pages a Cloudflare Pages.** Cabeceras de seguridad, direcciones sin #, y vista previa de cada pull request en tu móvil. (ver C6)                                                                                                                                                                                                                       | Yo, con tu ayuda en el DNS      | Antes del primer cliente de pago | Sí, **pero al final**: «ahora es fácil en GitHub por los pull request; al acabar el último módulo lo movemos a Cloudflare, si se puede» |
| **P0-6** | **Contrato de encargado del tratamiento y tabla de conservación.** Borrador mío, revisión del asesor, aceptado al crear la cuenta. (ver C8)                                                                                                                                                                                                                              | Yo redacto; el asesor revisa    | Antes del primer cliente de pago | Sí                                                                                                                                      |

### P1 · Importante, el próximo mes

| Punto    | Qué                                                                                                                                                                           | Quién | Cuándo                           | Richi |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------- | ----- |
| **P1-1** | **La API junto a la base.** Medir, fijar Irlanda, volver a medir. (ver D1)                                                                                                    | Yo    | Con la siguiente entrega         | Sí    |
| **P1-2** | **Errores del servidor a Sentry y buscador por hilo en el admin.** Para poder contestar «¿qué le ha pasado a este cliente?». (ver D2)                                         | Yo    | Con la siguiente entrega         | Sí    |
| **P1-3** | **La app instalable (I), adelantada.** Service worker, actualización controlada, cola sin conexión para fichar y mermas, manifiesto sin orientación fija. (ver D10)           | Yo    | Después de H                     | Sí    |
| **P1-4** | **Fichajes listos para el registro horario digital.** Correcciones que no borran, el trabajador ve y recibe aviso de cambios, exportación para la Inspección. (ver C9)        | Yo    | Con H                            | Sí    |
| **P1-5** | **Ordenar los documentos: una fuente por tema.** ESTADO de 150 líneas, documento de Arquitectura con el modelo, el TPV solo en el Anexo, registro de cambios único. (ver C10) | Yo    | Después de P0-3                  | Sí    |
| **P1-6** | **Exportación completa del negocio.** Lo que prometen las condiciones, y la base de la baja. (ver D9)                                                                         | Yo    | Antes del primer cliente de pago | Sí    |
| **P1-7** | **El reloj por tandas y el trabajador de la cola.** Para que aguante cientos de locales y las ventas no esperen. (ver D3)                                                     | Yo    | Antes de M20                     | Sí    |

### P2 · Recomendable

| Punto    | Qué                                                                                                                                                                                  | Quién                      | Cuándo                                        | Richi                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| **P2-1** | **Gráficas que contestan una pregunta.** Catálogo de gráficas, rojo solo para lo malo, periodo comparable. (ver D4)                                                                  | Yo                         | Antes de M21                                  | Sí, «con un mejor diseño, más 3D y más bonito que las que tenemos»    |
| **P2-2** | **Permisos con aprobación, límites y «lo mío».** Una pieza en el despachador para todo Estook. (ver D5)                                                                              | Yo                         | Diseño antes de M20A                          | Sí                                                                    |
| **P2-3** | **Ampliar cómo se usa Estook TPV.** Repetir ronda, artículo libre, a peso, modificadores con escandallo, fichar = TPV, bloqueo, llave, pantalla del cliente, el Z completo. (ver D6) | Yo lo escribo; tú lo miras | Antes de M20A                                 | Sí                                                                    |
| **P2-4** | **La empresa fiscal en el modelo.** Organización → empresa → local. (ver D7, K)                                                                                                      | Yo                         | Diseño ya; construir con la primera necesidad | Sí                                                                    |
| **P2-5** | **Quitar los borrados en cascada en lo que la ley obliga a guardar.** Y bloquear truncate en la auditoría. (ver D8)                                                                  | Yo                         | Con cualquier migración                       | Sí                                                                    |
| **P2-6** | **Alérgenos y Fogón: lo legal.** Origen y versión de los alérgenos; decir que Fogón es IA; horarios que propone y decide una persona. (ver D11 D12)                                  | Yo; el asesor revisa       | Antes de M12 y M22                            | Sí                                                                    |
| **P2-7** | **Capturas de pantalla fiables.** Regenerar, comparar por zonas, borrar las 32 viejas. (ver D13)                                                                                     | Yo                         | Con la siguiente pantalla                     | Sí                                                                    |
| **P2-8** | **Partir componentes grandes al tocarlos.** Y reescribir la regla del tamaño. (ver D14)                                                                                              | Yo                         | Siempre                                       | Sí: «si es una regla tonta, quítala, y que sea lo más óptimo posible» |

### P3 · Futuro

| Punto    | Qué                                                                                              | Quién | Cuándo                    | Richi                                      |
| -------- | ------------------------------------------------------------------------------------------------ | ----- | ------------------------- | ------------------------------------------ |
| **P3-1** | **Facturar sin internet desde el local.** Tras el asesor y la documentación de la AEAT. (ver E1) | —     | Después de M20B           | Sí                                         |
| **P3-2** | **Datáfono conectado, pago en mesa, Bizum.** Siempre con la cuenta del local. (ver E2)           | —     | Después de M20C           | Sí, «sin meternos en cosas que no podemos» |
| **P3-3** | **Pantalla de cliente, balanza, llave, cajones inteligentes.** (ver E3)                          | —     | Con clientes que lo pidan | Sí                                         |
| **P3-4** | **Reservas por integración y pedir desde la mesa.** (ver E4 E5)                                  | —     | Fase 5–7                  | Sí                                         |
| **P3-5** | **Particionar y agregar cuando crezca.** (ver E6)                                                | —     | Con 100+ locales          | Sí                                         |

## Las ocho preguntas, y sus respuestas

| Pregunta                                                                                                                                                                                                                                                                        | Lo que contestó Richi                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **1 · ¿Pasamos Supabase a Pro ya, por las copias de seguridad?** Hoy, si algo se borra por error, no hay vuelta atrás. Pro cuesta unos 25 $ al mes y guarda una copia de cada día de la última semana.                                                                          | **En unas semanas**, «si no es estrictamente necesario». Mientras, la copia semanal |
| **2 · ¿Adelantamos Estook TPV?** Los autónomos, que son la mayoría de bares, tienen que usar un programa adaptado a VeriFactu desde el 1 de julio de 2027. En el primer semestre de 2027 mucha gente va a cambiar de TPV. Con el orden de hoy, el TPV llega después de M17.     | **Justo después de M10**                                                            |
| **3 · ¿Estook TPV con su propia puerta?** Mismo login, mismo PIN, mismos datos y mismo diseño. La diferencia: se instala aparte como «Estook TPV» con su icono, arranca a pantalla completa, funciona sin conexión y se actualiza cuando tú digas, nunca en mitad del servicio. | **Sí, puerta propia**                                                               |
| **4 · ¿Trabajadores sin correo?** Hoy, para fichar hay que tener correo. Un extra o un friegaplatos sin correo no puede.                                                                                                                                                        | **Sí**: nombre y PIN bastan                                                         |
| **5 · ¿Cómo se cobra en sala?** En muchos restaurantes el camarero cobra en la mesa, lleva el efectivo encima y lo liquida al final del turno. En otros, todo va a una caja.                                                                                                    | **Las dos formas**, a elegir por local                                              |
| **6 · ¿Cómo se llama el programa que se instala en el local?** Los documentos dicen «Estook Enlace»; tu documento, «Estook Link». Tiene que ser uno.                                                                                                                            | **Estook Link**                                                                     |
| **7 · ¿Publicamos la web y la app en Cloudflare Pages?** GitHub Pages no permite un SaaS de pago. Cloudflare es gratis, tiene servidores en Madrid y te daría una vista previa de cada cambio en el móvil antes de fusionar.                                                    | **Sí, al final**                                                                    |
| **8 · ¿Qué hacemos con la #78?** Es correcta y está en verde. Pero si se fusiona hoy, la prueba del día puede poner main en rojo.                                                                                                                                               | **Arreglar la prueba, fusionar la #78 y lo nuevo en otra rama**                     |
