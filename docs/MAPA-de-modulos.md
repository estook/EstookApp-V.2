# El mapa · qué queda, en qué orden y por qué

**Ahora, M10 · La carta, menús y análisis**, el último módulo antes de Estook TPV ([el plan](m10-la-carta-menus-y-analisis.md)), en dos entregas: **M10 · 1 · La carta que trabaja** —agotados, el precio del cierre desde la carta, leer tu carta y el equilibrio— **en producción** desde el 20-oct (migración 0078, [0102](decisiones/0102-m10-1-la-carta-que-trabaja.md)); y **M10 · 2 · Los menús y «Analiza mi zona»**, contestada el 21-oct ([0103](decisiones/0103-las-respuestas-de-m10-2.md)) y **construida en su pull request** el 22-oct (migración 0079, [0104](decisiones/0104-m10-2-los-menus-y-tu-zona.md)). **Fogón 1 está entero en producción** (19-oct, [0097](decisiones/0097-fogon-1-las-respuestas-y-la-base.md) y [0098](decisiones/0098-fogon-1-entero.md)), con los repasos del 19 y del 20-oct y la auditoría del 20-oct ([0099](decisiones/0099-el-repaso-del-19-oct.md) a [0101](decisiones/0101-la-auditoria-del-20-oct.md)). **M9 · Escandallos está terminado** (M9 · 3 en producción desde el 18-oct, [0092](decisiones/0092-las-respuestas-de-m9-3.md) a [0095](decisiones/0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md)). **M8 está entero en producción**, con sus repasos, la experiencia (0083), las bases firmes (0084) y la 0085; **«antes de M8»**, desde el 8-oct ([`mejoras-antes-de-m8.md`](mejoras-antes-de-m8.md), [`panel-de-administracion.md`](panel-de-administracion.md)). El chat se adelantó el 30-sep ([0067](decisiones/0067-pro-a-99-el-chat-adelantado-y-el-plan-de-h.md)): su contenido, en el capítulo 23 del Manifiesto.

## El orden, desde el 30 de septiembre de 2026

```
ANTES DE M8   H · Horarios  →  I · La app instalable  →  C · El chat
              →  A3 · Vendedores  →  A4 · Ventas del admin
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

**No después, porque hay una fecha.** Los autónomos —la mayoría de los bares— tienen que usar un programa adaptado a VeriFactu desde el **1 de julio de 2027**, y las sociedades desde el **1 de enero**. En el primer semestre de 2027 mucha gente va a cambiar de TPV, y Estook tiene que estar. Richi lo decidió el 29-sep: «justo después de M10». **El 5-oct-2026 Hacienda anunció pasar esas fechas a octubre de 2028**, todavía sin BOE ([Anexo, 1.2](maestros/Estook-Anexo-TPV-y-Facturacion.md)): hasta que se publique mandan las de 2027, y si se publica, se revisa este orden con Richi.

**Y lo que el TPV necesitaba de los módulos de detrás se adelanta con él:** la jornada (M16a), y el motor de los PDF, que se estrena en H.

---

## Fase 2 · Lo que da valor en cocina _(estás aquí)_

### M7 · Proveedores y compras — las compras, entregadas

Ficha del proveedor con sus días de reparto y su pedido mínimo, el ciclo `borrador → enviado → recibido`, la sugerencia de pedido con su motivo escrito, recepción con «¿entero o con cambios?», y la factura conciliada con sus albaranes. Más el reloj del sistema y la ficha del local en Google.

**Se entrega en dos veces:** las compras enteras primero —hechas—; el reloj y Google después. El reloj entró en las mejoras de antes de M8, y Business Profile espera a que Google apruebe el acceso.

### M8 · Inventario, mermas y desviación

Inventario cíclico, almacén valorado, mermas en tres toques, consumo de personal como partida aparte, y **la desviación**: lo que dice el escandallo frente a lo que falta de verdad. Ahí está el dinero que se escapa, y es de lo que más vende.

**Contestado el 8-oct** ([0078](decisiones/0078-las-respuestas-de-m8.md)): la desviación de los platos, la calibración y el food cost teórico **pasan a M9**, que es donde se sabe qué lleva cada plato. M8 se entrega en dos veces: contar y cerrar en dos pasos, el valor, FEFO y el mínimo; y después lo gastado, el food cost real y la desviación de lo que se vende tal cual.

**La segunda entrega, construida el 9-oct** ([0079](decisiones/0079-lo-gastado-y-la-desviacion.md)): Movimientos → Desviación, con el food cost real frente al objetivo, lo que falta de lo vendido tal cual con su causa, emparejar la caja y lo gastado de verdad; y la foto de la merma. Lo que se cocina tiene lo gastado, y su desviación llega con las fichas (M9).

### M9 · Escandallos

El corazón. **Contestado el 15-oct** ([0086](decisiones/0086-las-respuestas-de-m9.md)) y en tres entregas: **M9 · 1 · El plato y tu carta** —secciones, platos, los canales con su precio a mano (Uber Eats el primero) y el historial de cada plato—, adelantada de M10 para que el plato nazca donde va a vivir; **M9 · 2 · Fichas y escandallos** —«sin ficha», fichas anidables con detección de ciclos y su rendimiento, el escandallo con el margen por canal, alérgenos calculados, el modo cocina sin importes y la ficha en PDF, con una receta a la vista y su historial—; y **M9 · 3** —escalar, extras, «ya la sé», la hoja de producción, el QR y «qué ha cambiado»—. **M9 · 2, construida el 16-oct** ([0087](decisiones/0087-fichas-y-escandallos.md)), con la carta que vincula lo que se vende tal cual y dice sus alérgenos y lo que pica. **El repaso del 16-oct** ([0090](decisiones/0090-el-repaso-del-16-oct.md)) separa el escandallo de la ficha técnica (Resumen · Escandallos · Fichas, con foto en cada paso), **quita el modo cocina de Escandallos** (en servicio, la cocina tendrá Estook TPV) y **para las elaboraciones** hasta que Richi las pida: la hoja de producción con su stock espera con ellas. **M9 · 3, contestado el 17-oct** ([0092](decisiones/0092-las-respuestas-de-m9-3.md), [el plan](m9-3-las-fichas-y-lo-que-ha-cambiado.md)): la receta por ración o por tanda y la ficha que se escala, «qué ha cambiado» y empezar desde una receta de Estook; **sin «ya la sé» ni QR**; los extras, a Estook TPV (M20A); y la desviación de los platos, la calibración y el teórico, a M20. **Contestado entero el mismo día** ([0093](decisiones/0093-como-detecta-estook-lo-que-se-escapa.md)) y **construido el 18-oct** (migración 0073), con el coste aproximado de lo que no tiene escandallo ([0095](decisiones/0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md)). Todo lo que hace especial al TPV después sale de aquí.

### M10 · Carta, menús y análisis

Lo que queda de la carta tras la 0086, en dos entregas ([el plan](m10-la-carta-menus-y-analisis.md)). **M10 · 1, en producción** ([0102](decisiones/0102-m10-1-la-carta-que-trabaja.md)): agotados que vuelven solos y avisan a quien trabaja, el precio al cierre de caja desde la carta, leer la carta subida (PDF sin IA, fotos con Fogón) y el equilibrio con Omnes. **M10 · 2, construida el 22-oct** ([0103](decisiones/0103-las-respuestas-de-m10-2.md) y [0104](decisiones/0104-m10-2-los-menus-y-tu-zona.md)): **los menús** —el del día por semanas, donde un día sin tocar repite el anterior, y «otro menú»—, con lo que dejan, «Descargar» (el cartel A3, el PDF, WhatsApp y la imagen), su interruptor en Ajustes y el widget del Panel de la sala; y **«Analiza mi zona»**, que hace Fogón buscando en internet una vez cada 24 horas. **Lo que sale de M10**: estrella, caballo, puzzle y perro, a M20; los destacados y las columnas, a M11 y M12; y la propuesta del menú del día de Fogón, a cuando un local lleve cuatro semanas de menús. **Sin esto no hay TPV**, porque es la carta que se va a picar.

### M11 · Documentos y diseños

Los PDF de verdad, hechos en el servidor con tipografías incrustadas. Es el bloque que más convierte en la web, porque es lo único tangible antes de comprar. **Trae de M10 los destacados («Sugerencia del chef») y la carta a una o a dos columnas** (0103).

### M12 · Carta digital pública

La carta con QR, en el idioma del móvil del cliente, con los agotados en vivo y sin cookies. Y con **los platos destacados** de M10 (0103).

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

**M16a · La jornada**, que va delante del TPV: su fecha operativa decidida por el servidor y el cierre del día en sesenta segundos. **M16b · APPCC y trazabilidad**, que se queda aquí: el APPCC con acción correctiva obligatoria y la trazabilidad de lote.

### M17 · Cuaderno

Incidencias del turno que lee el siguiente, notas, y el mantenimiento de los equipos con sus revisiones.

---

## Fase 4 · Las ventas, y Estook TPV

**El orden es M16a → M20 → M19a → M20A → M20B → M20C, justo después de M10; y M18 y M19b, al final de la Fase 3.**

### M20 · Ventas, emparejamiento y consumo

**El motor, y va primero.** Trae también **cómo detecta Estook lo que se escapa** ([el diseño](como-detecta-estook-lo-que-se-escapa.md), 0093): cuatro filtros, sin porcentajes inventados ni avisos mientras aprende. Convierte una venta —venga de donde venga— en movimientos del almacén, con su coste congelado. Sirve para las cuatro vías a la vez, así que se escribe una sola vez. **Y trae de M10 lo que deja cada plato: estrella, caballo, puzzle y perro, por canal** (0103), porque necesita lo vendido de cada uno.

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

El asistente en todas las apps, el centro de alertas, la voz para mermas y temperaturas, y la lectura de albaranes por foto. Con su presupuesto por local y día. **Lo que propuso Richi el 18-oct** —«Rellenar con Fogón» en Escandallos, los pasos de la ficha, revisar los datos y «¿cuánto preparo mañana?»—, y cuándo: en [`fogon-en-cada-sitio.md`](fogon-en-cada-sitio.md) y la [0095](decisiones/0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md). **Decidido el 18-oct: Fogón en dos mitades** —**Fogón 1**, la base, justo después de M9 · 3 y antes de M10; **Fogón 2**, lo que necesita ventas, con el TPV (M20)—. **Fogón 1, en tres entregas** ([0097](decisiones/0097-fogon-1-las-respuestas-y-la-base.md)): **1 · 1** la base y los escandallos (el motor con sus topes, preguntar, rellenar el escandallo y los pasos, los interruptores del admin), **1 · 2** fotos y voz, **1 · 3** revisar los datos y los borradores de pedido, cuadrante y reseñas. **Las dos construidas el 19-oct** ([0098](decisiones/0098-fogon-1-entero.md), migración 0075): Fogón 1 está entero; Fogón 2 espera al TPV.

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

| Qué                                                        | Dónde se termina       | Qué hay ya                                                     |
| ---------------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| Unir dos personas que resultan ser la misma                | **M13**                | Poner el correo a quien no lo tenía, que no une (H1)           |
| Business Profile: leer y contestar reseñas                 | Con accesos            | La nota en Google con su evolución, en Negocio → Reseñas (R2)  |
| Calendario, avisos con roles y turnos                      | **M14**                | La tabla, su seguridad por roles y «Lo que viene»              |
| Recalcular platos con lo que corrigió la factura           | **M9**                 | Lo cobrado, en cada línea del albarán con fecha                |
| El pedido en PDF con el logo                               | **M11**                | «Imprimir», sin membrete                                       |
| El precio pactado para toda una cadena                     | **M24**                | Lo pactado por local                                           |
| Leer el albarán de una foto                                | **M22**                | La recepción línea a línea                                     |
| Avisos de fichar por push, y que fuera de turno no suene   | **Mejoras · I**        | La campana (R1) y el horario de siempre, que el widget ya dice |
| Lo gastado de verdad, food cost real y desviación          | **M8**, la 2.ª         | Contar en dos pasos, el valor en una fecha y FEFO (0078)       |
| Desviación de los platos y calibración del aprovechamiento | **M20** (0092)         | Lo contado con su hora, y la pantalla que deja M8 (0078)       |
| Descontar lo vendido del inventario                        | **M20**                | El cierre guarda los platos con el nombre normalizado          |
| Los terminales del local                                   | **M20A**               | `estook.terminal`, hoy solo para fichar (H1); Anexo 3.4        |
| Leer los platos de la carta subida y proponer los cambios  | **Hecho** (M10 · 1)    | Del PDF sin IA o de las fotos con Fogón (0102)                 |
| Estrella, caballo, puzzle y perro (lo que deja cada plato) | **M20** (0103)         | Lo que deja cada plato por canal, del escandallo (M9 · 2)      |
| Fogón propone el menú del día                              | **M22** (0103)         | Con cuatro semanas de menús: M10 · 2 guarda el de cada día     |
| Destacados y columnas de la carta                          | **M11 y M12** (0103)   | El orden de secciones y platos, con las flechas (M9 · 1)       |
| Comparar precios con los locales de Estook, sin nombres    | **M23**, con clientes  | «Analiza mi zona» con Fogón (M10 · 2), de cada local           |
| Plato, ficha técnica y escandallo unidos por su id         | **Hecho** (M9 · 1 y 2) | El plato nace en la Carta y su escandallo cuelga de él (0086)  |
| La historia del Tablón, por días                           | **M17**                | El Tablón, con sus notas guardadas (0049)                      |
| Cerrar un local (y que la cuota baje)                      | Sin fecha              | La cuota ya sube sola al abrir uno                             |

**Sin prisa, de código:** volver a `BrowserRouter` ahora que hay dominio
([0008](decisiones/0008-enrutado-con-almohadilla.md)); pasar Pedidos, Albaranes y
Facturas a `usarListaLarga` cuando una crezca; subir a React Router 7; **pasar las máquinas de GitHub a Ubuntu 26**
cuando convenga (desde el 17-oct todas van fijas en la 24, y no en `ubuntu-latest`, que
cambia el 19-oct: se sube a mano, todas a la vez y con las capturas rehechas en el mismo
cambio); y el vectorial del logotipo y de Fogón cuando aparezcan.
