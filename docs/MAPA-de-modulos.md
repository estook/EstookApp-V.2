# El mapa · qué queda, en qué orden y por qué

Estás en **«Antes de M8»**: las compras de M7 están entregadas, y quedan cuatro entregas antes de M8 —**H · Horarios**, **I · La app instalable**, **A3 · Vendedores** y **A4 · Ventas del admin**—, con su plan en [`mejoras-antes-de-m8.md`](mejoras-antes-de-m8.md) y [`panel-de-administracion.md`](panel-de-administracion.md).

## El orden, desde el 30 de septiembre de 2026

```
ANTES DE M8   H · Horarios  →  I · La app instalable  →  A3 · Vendedores  →  A4 · Ventas del admin
FASE 2        M8 → M9 → M10
ESTOOK TPV    M16a · La jornada → M20 · Ventas y consumo → M19a · Estook Link
              → M20A · Sala y cocina → M20B · Facturación → M20C · Cobro y caja
DESPUES       M11 → M12 → M13 → M14 → M15 → M16b · APPCC → M17 → M18 → M19b
              → Fase 5 (M21 a M25) → Fase 6 (M26 a M28) → Fase 7 (M29 y M30)
```

**Las fichas de abajo van por fases, como en el Plan; el orden en el que se construyen es el de este recuadro** ([decisión 0061](decisiones/0061-el-orden-y-la-infraestructura.md)).

> Este mapa es **un resumen para orientarse**. Lo que manda es la **parte D del [Plan de desarrollo](maestros/Estook-Plan-de-Desarrollo.md)**, que es donde cada módulo dice qué entra, de qué depende y cuándo está terminado; y **lo que está construido de verdad lo dice [`ESTADO.md`](../ESTADO.md)**. Si los tres no dicen lo mismo, manda el Plan para lo que va a pasar y `ESTADO.md` para lo que ya ha pasado.

---

## Por qué el TPV va justo después de M10, y no antes ni después

**No antes, porque un TPV sin carta no existe.** Para tomar nota hace falta una carta con precios (M10), para que la carta tenga sentido hacen falta fichas (M9), y para las fichas, almacén con precios (M6 a M8). Y emitir tickets es irreversible: el día que Estook emite el primero pasa a ser un sistema de facturación con responsabilidad legal, y eso no se enciende sobre cimientos a medias.

**No después, porque hay una fecha.** Los autónomos —la mayoría de los bares— tienen que usar un programa adaptado a VeriFactu desde el **1 de julio de 2027**, y las sociedades desde el **1 de enero**. En el primer semestre de 2027 mucha gente va a cambiar de TPV, y Estook tiene que estar. Richi lo decidió el 29-sep: «justo después de M10».

**Y lo que el TPV necesitaba de los módulos de detrás se adelanta con él:** la jornada (M16a), y el motor de los PDF, que se estrena en H.

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

### M16 · Servicio, APPCC y trazabilidad · en dos partes

**M16a · La jornada**, que va delante del TPV: su fecha operativa decidida por el servidor y el cierre del día en sesenta segundos. **M16b · APPCC y trazabilidad**, que se queda aquí: el APPCC con acción correctiva obligatoria y la trazabilidad de lote.

### M17 · Cuaderno

Incidencias del turno que lee el siguiente, notas, y el mantenimiento de los equipos con sus revisiones.

---

## Fase 4 · Las ventas, y Estook TPV

**El orden es M16a → M20 → M19a → M20A → M20B → M20C, justo después de M10; y M18 y M19b, al final de la Fase 3.**

### M20 · Ventas, emparejamiento y consumo

**El motor, y va primero.** Convierte una venta —venga de donde venga— en movimientos del almacén, con su coste congelado. Sirve para las cuatro vías a la vez, así que se escribe una sola vez.

### M19a · Estook Link · el centro del local

El programa que se instala en el local, en un aparato siempre encendido. Hace tres cosas: **imprime** en cualquier impresora (ESC/POS) y abre el cajón; **mantiene la sala y la cocina hablándose sin internet**, por la red del local; y **guarda lo pendiente** para subirlo al volver. **Va antes de la sala porque una comanda que no llega a cocina no vale para nada** ([0056](decisiones/0056-estook-tpv-su-puerta-y-estook-link.md)).

### M20A · Sala y cocina

Mesas, barra y para llevar; tomar nota con comensal asignado; tandas y marchar; aviso de alergia; traspasar mesas al cambio de turno. Y la cocina: **cada partida ve lo suyo**, pantalla de pase, tiempos en tres tramos, y **la ficha técnica abierta desde cualquier plato**. Todavía sin cobrar.

### M20B · Facturación VeriFactu

El esquema aislado y de solo inserción, el alta fiscal del local, los tipos de documento, el QR, la cola de envío y el justificante provisional. **No se enciende en producción sin el asesor.**

### M20C · Cobro y caja

Efectivo, datáfono y mixto; dividir la cuenta; factura a petición; devoluciones por rectificativa; caja y arqueo. Cerrar una mesa mueve caja, ventas y almacén sin teclear nada más.

### M18 · El conector · vía nube

Para quien no quiere cambiar de TPV: Ágora y Glop por API, y Revo y Last.app cuando aprueben el acceso.

### M19b · Estook Link · conector de TPV

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

| Cuando esté       | Ya vendes                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **M7 a M10**      | La gestión de cocina: almacén, compras, escandallos y carta. **Esto ya se vende solo**      |
| **M11 a M17**     | Y además los documentos, la carta digital, el equipo, los horarios, los fichajes y el APPCC |
| **+ M20**         | Que las ventas muevan el almacén, por CSV o a mano                                          |
| **+ M19a y M20A** | **Comandero y cocina.** Puede cobrar con su TPV de siempre                                  |
| **+ M20B y M20C** | **El TPV completo**, con tickets legales                                                    |
| **+ M18**         | O conectar el TPV que ya tiene                                                              |
| **+ M26**         | Que contrate solo desde la web                                                              |

---

## Lo que queda preparado, y dónde se termina

Lo que ya existe a medias y el módulo que lo acaba. Vivía en `ESTADO.md` hasta el 30-sep-2026.

| Qué                                                       | Dónde se termina | Qué hay ya                                                     |
| --------------------------------------------------------- | ---------------- | -------------------------------------------------------------- |
| El PDF de los informes                                    | **H · Horarios** | Tu día, Tu semana y Tu mes, en pantalla y por correo (R2)      |
| Business Profile: leer y contestar reseñas                | Con accesos      | La nota en Google con su evolución, en Negocio → Reseñas (R2)  |
| Calendario, avisos con roles y turnos                     | **M14**          | La tabla, su seguridad por roles y «Lo que viene»              |
| Recalcular platos con lo que corrigió la factura          | **M9**           | Lo cobrado, en cada línea del albarán con fecha                |
| El pedido en PDF con el logo                              | **M11**          | «Imprimir», sin membrete                                       |
| El precio pactado para toda una cadena                    | **M24**          | Lo pactado por local                                           |
| Leer el albarán de una foto                               | **M22**          | La recepción línea a línea                                     |
| Avisos de fichar por push, y que fuera de turno no suene  | **Mejoras · I**  | La campana (R1) y el horario de siempre, que el widget ya dice |
| Recuento, desviación y calibración del aprovechamiento    | **M8**           | La merma con motivo; albaranes con incidencias; el recuento    |
| Descontar lo vendido del inventario                       | **M20**          | El cierre guarda los platos con el nombre normalizado          |
| Los terminales del local                                  | **M20A**         | Cómo se dan de alta, en el Anexo 3.4                           |
| El vendedor de cada cliente y el código con que llegó     | **A3**           | La ficha de cada cliente (A2)                                  |
| El tablero de ventas                                      | **A4**           | La foto diaria del uso de cada cliente (A2)                    |
| Leer los platos de la carta subida y proponer los cambios | **M10**          | La carta subida y enseñada por su QR (0049)                    |
| Plato, ficha técnica y escandallo unidos por su id        | **M9**           | El diseño de Richi, escrito en el Plan (0049)                  |
| La historia del Tablón, por días                          | **M17**          | El Tablón, con sus notas guardadas (0049)                      |
| Cerrar un local (y que la cuota baje)                     | Sin fecha        | La cuota ya sube sola al abrir uno                             |

**Sin prisa, de código:** volver a `BrowserRouter` ahora que hay dominio
([0008](decisiones/0008-enrutado-con-almohadilla.md)); pasar Pedidos, Albaranes y
Facturas a `usarListaLarga` cuando una crezca; subir a React Router 7; **el 19 de
octubre, mirar la integración continua**, que GitHub pasa `ubuntu-latest` a Ubuntu 26 ese
día; y el vectorial del logotipo y de Fogón cuando aparezcan.
