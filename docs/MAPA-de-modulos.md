# El mapa · qué queda, en qué orden y por qué

Estás en **«Antes de M8»**: las compras de M7 están entregadas, y lo que le falta —los avisos a quien manda, Horarios, el reloj diario y Business Profile— se reparte entre las veinte mejoras y lo que espera a Google. Esto es lo que hay en cada módulo que queda y por qué está donde está.

> Este mapa es **un resumen para orientarse**. Lo que manda es la **parte D del [Plan de desarrollo](maestros/Estook-Plan-de-Desarrollo.md)**, que es donde cada módulo dice qué entra, de qué depende y cuándo está terminado; y **lo que está construido de verdad lo dice [`ESTADO.md`](../ESTADO.md)**. Si los tres no dicen lo mismo, manda el Plan para lo que va a pasar y `ESTADO.md` para lo que ya ha pasado.

---

## Por qué el TPV no va antes

La pregunta de fondo es: si el cobro es lo que más vende, ¿por qué no lo primero? Por tres razones, y las tres son de coste.

**1 · Un TPV sin carta no existe.** Para tomar nota hace falta una carta con precios (M10), y para que la carta tenga sentido hacen falta fichas (M9), y para las fichas hace falta almacén con precios (M6 y M7). Construir el TPV antes significaría inventarse una carta provisional y tirarla después.

**2 · Emitir tickets es irreversible.** El día que Estook emite su primer ticket, pasa a ser un sistema de facturación con responsabilidad legal. Eso no se enciende sobre cimientos a medias.

**3 · Lo que ya tienes ya se vende.** La gestión —almacén, escandallos, carta, equipo, documentos— es lo que venden Gstock y Apicbase, y es donde está tu precio. El TPV es lo que te quita la dependencia de que un TPV ajeno te dé acceso, pero no es lo que te da de comer el primer año.

> Y el matiz que importa: **el TPV está en la mitad, no al final.** Cae en la Fase 4 de siete, y detrás quedan la analítica, Fogón, la cadena, el negocio y el ecosistema.

---

## Fase 2 · Lo que da valor en cocina _(estás aquí)_

### M7 · Proveedores y compras — las compras, entregadas

Ficha del proveedor con sus días de reparto y su pedido mínimo, el ciclo `borrador → enviado → recibido`, la sugerencia de pedido con su motivo escrito, recepción con «¿entero o con cambios?», y la factura conciliada con sus albaranes. Más el reloj del sistema y la ficha del local en Google.

**Se entrega en dos veces:** las compras enteras primero —hechas—; el reloj y Google después. El reloj entró en las mejoras de antes de M8, y Business Profile espera a que Google apruebe el acceso.

### M8 · Inventario, mermas y desviación

Inventario cíclico, almacén valorado, mermas en tres toques, consumo de personal como partida aparte, y **la desviación**: lo que dice el escandallo frente a lo que falta de verdad. Ahí está el dinero que se escapa, y es de lo que más vende.

### M9 · Escandallos

El corazón. Fichas anidables con detección de ciclos, dos caras —producto y elaboración—, versionado, alérgenos y nutrición calculados, y el **modo cocina** a pantalla completa sin importes. Todo lo que hace especial al TPV después sale de aquí.

### M10 · Carta, menús y análisis

Canales con sus listas de precio y comisiones, el constructor por secciones, menús con reparto de precio, y el análisis de rentabilidad. **Sin esto no hay TPV**, porque es la carta que se va a picar.

### M11 · Documentos y diseños

Los PDF de verdad, hechos en el servidor con tipografías incrustadas. Es el bloque que más convierte en la web, porque es lo único tangible antes de comprar.

### M12 · Carta digital pública

La carta con QR, en el idioma del móvil del cliente, con los agotados en vivo y sin cookies.

---

## Fase 3 · Personas y día a día

### M13 · Equipo

Contratos con vigencia, coste por hora con su permiso propio, festivos por código postal, ausencias con su saldo y bolsa de horas.

### M14 · Calendario

Turnos, turnos partidos, plantillas, coste en vivo mientras montas el cuadrante, borrador y publicado, y **generar el horario con Fogón**. Nunca se publica solo.

### M15 · Fichajes

Modo quiosco en un aparato del local, comparativa de lo planificado contra lo fichado, **las pausas, y las horas ordinarias frente a las extraordinarias**.

> **Aquí hay ley.** Registrar la jornada es obligatorio desde 2019 y ya se sanciona. Y hay un Real Decreto de registro horario digital **en tramitación, todavía no publicado en el BOE**, cuyo borrador exige inmutabilidad, credencial individual, nada de biometría, pausas, clasificación de horas, cuatro años de conservación y acceso de la Inspección. Estook ya cumple la mitad por diseño; el resto entra en este módulo.

### M16 · Servicio, APPCC y trazabilidad

La jornada con su fecha operativa decidida por el servidor, el APPCC con acción correctiva obligatoria, la trazabilidad de lote y el cierre en sesenta segundos.

### M17 · Cuaderno

Incidencias del turno que lee el siguiente, notas, y el mantenimiento de los equipos con sus revisiones.

---

## Fase 4 · Las ventas _(aquí entra el TPV)_

**El orden es M20 → M19a → M20A → M20B → M20C → M18 → M19b.**

### M20 · Ventas, emparejamiento y consumo

**El motor, y va primero.** Convierte una venta —venga de donde venga— en movimientos del almacén, con su coste congelado. Sirve para las cuatro vías a la vez, así que se escribe una sola vez.

### M19a · Estook Enlace · agente e impresión

El programa que se instala en el local. Aquí solo su parte de **impresión**: lee la cola y habla ESC/POS con cualquier impresora. **Va antes de la sala porque una comanda que no se imprime no vale para nada.**

### M20A · Sala y cocina

Mesas, barra y para llevar; tomar nota con comensal asignado; tandas y marchar; aviso de alergia; traspasar mesas al cambio de turno. Y la cocina: **cada partida ve lo suyo**, pantalla de pase, tiempos en tres tramos, y **la ficha técnica abierta desde cualquier plato**. Todavía sin cobrar.

### M20B · Facturación VeriFactu

El esquema aislado y de solo inserción, el alta fiscal del local, los tipos de documento, el QR, la cola de envío y el justificante provisional. **No se enciende en producción sin el asesor.**

### M20C · Cobro y caja

Efectivo, datáfono y mixto; dividir la cuenta; factura a petición; devoluciones por rectificativa; caja y arqueo. Cerrar una mesa mueve caja, ventas y almacén sin teclear nada más.

### M18 · El conector · vía nube

Para quien no quiere cambiar de TPV: Ágora y Glop por API, y Revo y Last.app cuando aprueben el acceso.

### M19b · Estook Enlace · conector de TPV

La otra mitad del agente: vigilar la carpeta y leer los formatos de los TPV de Windows.

---

## Fase 5 · La inteligencia

### M21 · Negocio, analítica y Estook Pulse

Los agregados, la previsión de ventas, el presupuesto, las exportaciones para la gestoría y **Pulse**, que se puede desmontar hasta el dato que lo mueve.

### M22 · Fogón

El asistente en todas las apps, el centro de alertas, la voz para mermas y temperaturas, y la lectura de albaranes por foto. Con su presupuesto por local y día.

### M23 · Reseñas, competencia y chat

Las reseñas de Google clasificadas con respuesta propuesta, la competencia de la zona, y el chat del equipo.

### M24 · Cadena

El panel de varios locales con gestión por excepción, el catálogo maestro y las auditorías de local.

### M25 · Ajustes, apps activables y notificaciones

Encender y apagar partes, y el motor de avisos con sus tres niveles y sus canales.

---

## Fase 6 · El negocio

### M26 · Suscripciones, web y panel interno

**Aquí es cuando un gerente contrata solo**, con su tarjeta y sin que intervengas. Antes de esto las altas las haces tú a mano, que es lo normal con los primeros clientes.

### M27 · Endurecimiento y puesta en producción

Revisión de seguridad tabla por tabla, pruebas de carga, RGPD con su retención, copias con restauración probada, **datos alojados en la Unión Europea** y **la ventana de despliegue**, que en hostelería es de 04:00 a 07:00 y nunca en servicio.

### M28 · Piloto real

Tres locales, un mes. **No se abre ninguna función nueva mientras haya fricción del piloto sin resolver.** Es donde aparecen los fallos que ningún documento encuentra.

---

## Fase 7 · El ecosistema

### M29 · Canales de reparto

Uber Eats primero, con su OAuth, su firma y el plazo de once minutos y medio para aceptar. Después Glovo y Just Eat.

### M30 · API pública

Que un TPV o un ERP puedan leer y escribir con permiso del cliente. Va al final porque exige el dominio cerrado, y porque el TPV líder de España ya se integra con dos competidores tuyos: cuando quiera integrarse contigo, tiene que haber dónde.

---

## Lo que puedes vender en cada momento

| Cuando esté       | Ya vendes                                                  |
| ----------------- | ---------------------------------------------------------- |
| **M7 a M12**      | La gestión de cocina entera. **Esto ya se vende solo**     |
| **M13 a M17**     | Y además el equipo, los horarios, los fichajes y el APPCC  |
| **+ M20**         | Que las ventas muevan el almacén, por CSV o a mano         |
| **+ M19a y M20A** | **Comandero y cocina.** Puede cobrar con su TPV de siempre |
| **+ M20B y M20C** | **El TPV completo**, con tickets legales                   |
| **+ M18**         | O conectar el TPV que ya tiene                             |
| **+ M26**         | Que contrate solo desde la web                             |
