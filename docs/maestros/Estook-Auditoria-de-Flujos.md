---
titulo: Auditoría de flujos, dependencias y efectos en cadena
tipo: Documento de control
fecha: Septiembre de 2026 · versión 1.1
nota: Qué dato alimenta a qué, qué desencadena cada cambio, de dónde salen las opciones y qué pasa cuando algo falla. Se pasa entero antes de cerrar cualquier módulo.
---

# Cómo se lee este documento

Esta auditoría revisa los documentos maestros buscando lo que se acaba improvisando: **datos que nadie sabe de dónde salen, opciones que aparecen en un desplegable sin fuente definida, cambios que rompen algo tres pantallas más allá, y estados imposibles que nadie previó.**

Las partes 1 a 5 son **referencia de construcción**. La parte 6 son los **hallazgos**, con la decisión tomada en cada uno. La 7 son las decisiones que hay que dejar cerradas. La 8 es la **lista que se pasa antes de cerrar cada módulo**.

**Qué cambia en la versión 1.1.** Recoge la Evolución de producto 1.0: entran los canales de reparto en el mapa de dependencias, cuatro efectos en cadena nuevos, la máquina de estado de una alerta y de un pedido externo, seis hallazgos nuevos (del 13 al 18) y las decisiones de improvisación que traen las integraciones.

---

# 1 · El mapa de dependencias

## 1.1 La cadena completa

Todo Estook cuelga de doce datos. **Si uno de ellos está mal, lo que hay debajo está mal**, y casi nunca se nota donde se originó el error.

```
PRECIO DE COMPRA ──┐
FORMATO ───────────┤
FACTOR ────────────┼──▶ COSTE POR UNIDAD DE USO
RENDIMIENTO ───────┘             │
                                 ▼
GRAMAJE ────────────────▶ COSTE DEL PLATO ◀── COSTE DE ELABORACION
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
       MARGEN                FOOD COST         PRECIO RECOMENDADO
          │                      │
PVP ──────┘                      │
TIPO IMPOSITIVO ─────────────────┘

OBJETIVO ────────────────▶ SEMAFORO Y AVISO

VENTAS DEL TPV ─────┐
VENTAS DE REPARTO ──┼──▶ × GRAMAJE ──▶ CONSUMO TEORICO
                    │                         │
RECUENTO ───────────┼─────────────────────────┼──▶ DESVIACION
ENTRADAS ───────────┤                         │
MERMAS ─────────────┘─────────────────────────┘

HORAS FICHADAS × COSTE HORA ──▶ COSTE DE PERSONAL ──┐
MATERIA PRIMA ──────────────────────────────────────┼──▶ PRIME COST
VENTAS ─────────────────────────────────────────────┘
```

## 1.2 Ficha de cada dato crítico

Para cada uno: **quién lo crea, quién lo consume, qué pasa si falta y qué pasa si cambia.**

**PRECIO DE COMPRA.** _Lo crea:_ recepción de un pedido, foto de albarán, factura de proveedor o alta manual. _Lo consume:_ coste por unidad de uso · valor del inventario · gasto por proveedor · comparativa entre locales. _Si falta:_ el producto se usa igual, cuenta cero y **sale marcado en amarillo** en todas las fichas que lo llevan. Nunca bloquea. _Si cambia:_ abre vigencia nueva, la anterior queda en el histórico, y dispara el recálculo de todo lo que cuelga. **Trampa conocida:** el precio de la factura y el del albarán no siempre coinciden. **Manda la factura**, y el recálculo se aplica desde la fecha del albarán.

**FORMATO, FACTOR Y RENDIMIENTO.** _Los crea:_ el alta del producto, con propuesta del catálogo de referencia. _Los consume:_ el coste por unidad de uso, y con él todo lo demás. _Si faltan:_ se asume factor 1 y rendimiento 1, y el producto queda marcado como **«sin verificar»**, porque un rendimiento mal puesto es el error más caro del sistema. _Si cambian:_ recálculo de todos los platos que lo llevan, con aviso al jefe de cocina. **Trampa conocida:** confundir unidad de compra con unidad de uso es la primera causa de escandallos falsos. Por eso el alta obliga a decir las dos y enseña el resultado: «caja de 3 kg ÷ 3.000 g × 0,85 de rendimiento = 0,0039 €/g».

**GRAMAJE DE UN INGREDIENTE EN UNA FICHA.** _Lo crea:_ el jefe de cocina en Escandallos. _Lo consume:_ coste del plato · consumo teórico · alérgenos · valor nutricional · hoja de producción. _Si falta:_ el plato existe sin ficha, se vende, cuenta en dinero y sale marcado. _Si cambia:_ **crea versión nueva.** Los costes históricos no se tocan; las ventas pasadas siguen valoradas con la versión vigente ese día.

**PVP Y TIPO IMPOSITIVO.** _Los crea:_ la lista de precios del canal, o la importación del TPV. _Los consumen:_ margen · food cost · análisis de rentabilidad · exportación de la gestoría. _Si falta el tipo:_ se asume el general del régimen del local y se marca para revisar. _Si cambia el PVP:_ **no reescribe el pasado.** Cada línea de venta guarda el precio que tenía ese día. **Trampa conocida:** un solo precio para todos los canales falsea el margen en cuanto hay terraza o reparto.

**VENTAS.** _Las crea:_ el conector del TPV, un canal de reparto conectado, un fichero, la foto del Z o el total del día. _Las consume:_ consumo teórico · desviación · análisis de carta · productividad · previsión · Pulse. _Si faltan:_ la jornada se cierra igual, **marcada como estimada**, y no entra en la desviación de género. **Cada origen lleva su fiabilidad y viaja con ella hasta el informe final.** Un número estimado nunca se enseña como si fuera exacto.

**RECUENTO.** _Lo crea:_ el inventario físico. _Lo consume:_ desviación · valoración del stock · calibración · food cost real. _Si falta:_ no hay desviación posible, solo teórico. Estook lo dice: «llevas 42 días sin recuento; lo que ves es teórico».

**HORAS FICHADAS Y COSTE HORA.** _Las crea:_ el quiosco de fichaje; el coste, la ficha de la persona o el coste medio del puesto. _Lo consume:_ coste de personal · prime cost · productividad · planificado contra fichado. _Si falta el coste:_ se usa el medio del puesto y **se marca el dato como aproximado**.

**OBJETIVOS.** _Los crea:_ Ajustes, con propuesta según el tipo de local. _Los consume:_ **todos los semáforos de la aplicación**, todos los avisos de Fogón y el cálculo de Pulse. _Si faltan:_ se usan los del tipo de local y se dice que son los de partida. **Este es el dato más silencioso y más influyente del sistema.** Un objetivo mal puesto tiñe de rojo o de verde una aplicación entera. Por eso se revisa en el alta y se recuerda una vez al trimestre.

## 1.3 Qué usa cada app de las demás

| App         | De dónde lee                                  | Qué produce para otras                                                         |
| ----------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| Inventario  | Nada. **Es el origen**                        | Coste por unidad de uso, stock, caducidades, precios, previsión de agotamiento |
| Escandallos | Inventario                                    | Coste del plato, alérgenos, nutrición, consumo por venta                       |
| Carta       | Escandallos                                   | Platos publicados, agotados, precios por canal                                 |
| Calendario  | Equipo, Inventario, Servicio, Cuaderno        | Turnos publicados, tareas, entregas                                            |
| Equipo      | Calendario                                    | Horas, coste de personal, quién sabe qué ficha                                 |
| Servicio    | Escandallos, Inventario, conectores           | Jornadas, consumo, APPCC, trazabilidad                                         |
| Negocio     | Todas                                         | Agregados, desviación, previsión, Pulse, informes                              |
| Cuaderno    | Calendario                                    | Incidencias, revisiones de equipos                                             |
| **Alertas** | **Todas**                                     | **Nada. Es un sumidero, no una fuente**                                        |
| **Fogón**   | **Todas, con los permisos de quien pregunta** | **Explicaciones y propuestas. Nunca datos nuevos**                             |

> **Regla que evita el desastre: las flechas van en un solo sentido.** La Carta lee de Escandallos y nunca escribe en ella. Escandallos lee de Inventario y nunca escribe en él. Si alguna vez hace falta lo contrario, es una **operación explícita** —«dar de alta este ingrediente en Inventario»— y no un efecto lateral.
>
> Y dos reglas nuevas que la Evolución obliga a fijar: **el centro de alertas no crea datos**, solo lee y enlaza; y **Fogón tampoco**: propone, y quien guarda es una persona a través de un comando normal.

---

# 2 · El efecto mariposa

Dieciocho cambios que un usuario hace en dos segundos y lo que desencadenan. **Cada uno es un caso de prueba obligatorio.**

## 2.1 Sube el precio de un producto

```
Entra un albaran con el aceite un 12 % mas caro
├─ se cierra la vigencia anterior del precio y se abre la nueva
├─ se recalcula el precio medio ponderado
├─ se recalculan SOLO las elaboraciones que lo llevan
├─ y de ahi, SOLO los platos que llevan esas elaboraciones
├─ cambian margen, food cost y precio recomendado de esos platos
├─ los que caen bajo objetivo generan ALERTA con su impacto y su boton
├─ las fichas impresas de esos platos quedan marcadas «desactualizada»
├─ la carta impresa queda marcada para regenerar (el precio no cambia solo)
├─ Pulse recalcula su componente de coste
└─ entra en el resumen de Fogon de manana
```

**NO se toca:** ninguna venta pasada, ningún coste histórico, ningún informe cerrado.

**Lo que ve el usuario:** al confirmar la recepción, un aviso corto: «El aceite ha subido un 12 %. Afecta a 7 platos; 2 se quedan bajo objetivo.» Con un botón para verlos.

## 2.2 Se cambia el rendimiento de un producto

Igual que el anterior, pero **más peligroso, porque el rendimiento multiplica**. Pasar el pulpo de 0,80 a 0,65 sube su coste un 23 % de golpe.

Por eso: cambiar un rendimiento **pide confirmación enseñando el impacto antes de guardar**: «Esto sube el coste de 4 platos entre un 18 % y un 24 %. ¿Seguimos?»

## 2.3 Se cambia el gramaje de una ficha

Crea versión nueva. La anterior se conserva entera. Y se dispara lo que casi nadie prevé:

- **Todos los cocineros vuelven a «pendiente de aprender»** esa ficha, con aviso.
- La ficha impresa queda desactualizada y el QR lleva a la nueva.
- El consumo teórico del futuro usa la nueva; **el del pasado sigue con la vieja**.
- Si cambian los ingredientes, se recalculan alérgenos y valor nutricional, y **si aparece un alérgeno nuevo se avisa a sala y se marca la carta para reimprimir**.

## 2.4 Se marca un plato como agotado

```
El camarero lo marca desde el movil
├─ desaparece de la carta digital en menos de 30 segundos
├─ desaparece del menu del dia si estaba
├─ se avisa a sala y a cocina por el canal del chat
├─ NO se descuenta nada de stock: agotado no es merma
├─ recordatorio de marcarlo tambien en el TPV
└─ vuelve solo al abrir la jornada siguiente, salvo agotado indefinido
```

## 2.5 Se corrige el stock a mano

Se registra un **movimiento de ajuste** con autor y motivo, nunca una sobreescritura. El stock queda como dice la persona, y la diferencia entra en la desviación del periodo con su causa. **Nunca se bloquea a nadie por cuadrar.**

## 2.6 Se desactiva un producto que está en uso

No se borra. Se desactiva, deja de salir en los buscadores y sigue en las fichas que lo llevan, marcado. **Se avisa de en cuántas está antes de desactivar.**

## 2.7 Cambia el tipo de IVA por ley

Los precios de carta están con impuestos incluidos, así que hay que decidir. Estook lo pregunta **con las dos cifras delante**:

```
El IVA de las bebidas pasa del 10 % al 21 %.
Afecta a 34 platos.

  ○ Mantener el precio   → pierdes 3,1 puntos de margen
  ○ Subir el precio      → el cafe pasa de 1,60 € a 1,76 €
  ○ Decidir plato a plato
```

Se aplica **a partir de la fecha de entrada en vigor**. Nada de lo anterior se recalcula.

## 2.8 Se conecta el TPV por primera vez

```
├─ entran los articulos como platos SIN ficha en Escandallos
├─ los que se parecen a algo existente se proponen para emparejar
├─ NO se crea nada en Inventario: el TPV no sabe de ingredientes
├─ entran las ventas de los ultimos 30 dias, marcadas como historicas
├─ NO se descuenta stock retroactivo, porque no habia fichas
└─ el indicador de salud de datos se recalcula y baja: 96 platos, 0 fichas
```

**Lo que ve el usuario:** «He traído 96 artículos y 30 días de ventas. Ahora falta la ficha de cada uno. Empecemos por los diez que más vendes.»

## 2.9 Se desconecta el TPV o falla dos días

La jornada se cierra igual por la vía manual. **El cierre no se bloquea nunca.** Cuando vuelve la conexión, entran las ventas atrasadas **por fecha de servicio**, se recalculan los agregados de esos días y se avisa del ajuste.

## 2.10 Se publica un cuadrante

Cada persona recibe **solo lo suyo**; al cambiar algo después, solo se avisa al afectado y el aviso dice **qué** cambia. Los turnos entran en el Calendario, el coste estimado entra en el presupuesto de la semana, y las horas planificadas quedan disponibles para compararlas luego con las fichadas.

## 2.11 Se retira el acceso a una persona

PIN muerto al instante · sesiones cerradas · sus turnos futuros quedan **sin cubrir con aviso** · **la persona no se borra**: sigue en lo que firmó, en sus fichajes y en su historial · deja de escribir en el chat pero su historial permanece · si vuelve, se reactiva con todo.

## 2.12 Se cambia el rol de alguien

Los permisos se recalculan **en la petición siguiente**, sin cerrar sesión. Si pierde acceso a costes, **los campos dejan de viajar desde el servidor**, así que la información ya no está en su navegador. Si estaba en una pantalla que ya no puede ver, se le lleva al Panel con un mensaje corto.

## 2.13 Se archiva un local de un grupo

Deja de facturar · queda en solo lectura · **se excluye de las medias del grupo desde su fecha de cierre, no desde siempre** · sigue en los históricos y en las comparativas de periodos anteriores · su equipo pierde el acceso salvo quien tenga alcance de organización.

## 2.14 Se cierra la jornada

```
├─ se calcula el consumo teorico con las fichas vigentes ese dia
├─ se generan los movimientos de stock
├─ se guarda la jornada con su origen y su fiabilidad
├─ se recalculan los agregados del dia
├─ se recalcula Pulse
├─ se lanza el analisis nocturno de Fogon
└─ el APPCC pendiente queda marcado NO REGISTRADO en rojo
```

**Reabrir exige motivo escrito, deja evento y recalcula todo lo afectado.**

## 2.15 Entra un pedido de un canal de reparto

```
Llega el webhook firmado
├─ se verifica la firma. Si no cuadra, se descarta y se registra
├─ se responde 200 con cuerpo vacio, y NADA MAS
├─ se encola el trabajo
│
Y ya fuera del webhook:
├─ se trae el pedido completo por API
├─ si el identificador ya existe, se descarta: es un reintento
├─ se transforma al modelo interno de pedidos
├─ se acepta o se rechaza ANTES del limite de la plataforma
├─ entra como venta con su canal y su comision
├─ se explotan sus fichas y se mueve el stock
├─ actualiza agregados, analitica y Pulse
└─ entra en el contexto de Fogon
```

**NO se toca:** el modelo de pedidos no se duplica. **Un pedido de reparto es una venta con canal, no una entidad nueva.**

**La trampa que decide la arquitectura:** la plataforma exige aceptar o rechazar en un plazo corto —Uber Eats da 11 minutos y medio— o cancela el pedido sola. **El webhook no puede hacer el trabajo**: acusa recibo y encola.

## 2.16 Se cierra una alerta

Una alerta cerrada **no vuelve hasta que el dato que la originó cambie**. Con «ahora no», vuelve en siete días. Y **nunca hay más de una alerta viva por causa y producto**.

Si el dato cambia y la condición sigue cumpliéndose, **no se crea otra**: se actualiza la que hay, con su fecha nueva. Cinco alertas de «pollo bajo mínimo» en cinco días son un fallo de diseño, no cinco avisos.

## 2.17 Fogón propone un horario

```
Se pide «hazme el horario de la semana que viene»
├─ se leen disponibilidad, contratos, horas objetivo, vacaciones,
│  ausencias, turnos anteriores, ventas historicas, prevision,
│  eventos, minimos por puesto y coste laboral
├─ se genera una propuesta EN BORRADOR
├─ NO se publica. NO se avisa a nadie. NO entra en el calendario
├─ se ensena coste estimado, comparacion y huecos sin cubrir
└─ una persona edita y publica, y entonces empieza 2.10
```

**Lo que nunca pasa:** que alguien reciba un turno que no ha aprobado un humano.

## 2.18 Se sube un documento para que Fogón lo lea

```
Se sube un albaran, una factura o un contrato
├─ se guarda el fichero original SIEMPRE, se entienda o no
├─ Fogon extrae los campos y PROPONE
├─ lo dudoso sale en amarillo, no se da por bueno
├─ una persona confirma o corrige
├─ la operacion real la ejecuta el dominio, con su comando normal
└─ de un contrato salen ademas sus avisos de vencimiento
```

**NO se toca:** nada, hasta que una persona confirma. **Fogón no escribe.**

---

# 3 · De dónde salen las opciones

Cada desplegable de la aplicación, con su fuente, su orden y su estado vacío. **Sin esta tabla, quien construya se inventará una fuente distinta en cada pantalla.**

| Selector                      | De dónde salen                                    | Orden                                                     | Si está vacío                                                        |
| ----------------------------- | ------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Producto (en una ficha)       | Productos activos del local                       | Los más usados en fichas primero                          | «No tienes productos. Búscalo en el catálogo de referencia o créalo» |
| Producto (en un pedido)       | Productos del proveedor elegido, luego el resto   | Los que compras a ese proveedor primero                   | «Este proveedor no tiene productos asignados aún»                    |
| Proveedor                     | Proveedores activos del local                     | Por uso reciente                                          | «Crea tu primer proveedor», con el botón                             |
| Categoría de producto         | Categorías del local, sembradas por tipo de local | Alfabético, con las usadas arriba                         | Nunca vacío: vienen de serie                                         |
| Unidad de uso                 | Lista cerrada: g · ml · ud · kg · l               | Fijo                                                      | Nunca vacío                                                          |
| Alérgeno                      | Los 14 oficiales de la normativa                  | Fijo, con icono                                           | Nunca vacío                                                          |
| Motivo de merma               | Lista cerrada                                     | Por uso                                                   | Nunca vacío                                                          |
| Plato (en la carta)           | Platos activos de Escandallos                     | Los no colocados aún primero                              | «Crea tu primer plato o conecta tu TPV»                              |
| Sección de carta              | Secciones de esa carta                            | El orden que tienen                                       | «Crea la primera sección»                                            |
| Canal                         | Canales activos del local                         | Fijo                                                      | Nunca vacío: sala viene de serie                                     |
| Persona (en un turno)         | Personas activas con acceso a ese local           | Disponibles primero, luego las que tienen conflicto       | «Invita a tu equipo»                                                 |
| Puesto                        | Puestos del local                                 | Por uso                                                   | Sembrados por tipo de local                                          |
| Tipo de ausencia              | Lista cerrada                                     | Fijo                                                      | Nunca vacío                                                          |
| Punto de APPCC                | Puntos del plan vigente                           | El orden del plan                                         | «Monta tu plan de APPCC», con plantilla                              |
| Plantilla de documento        | Las del tipo de documento                         | Recomendada primero                                       | Nunca vacío                                                          |
| Plantilla de auditoría        | Las de la organización, más las de serie          | Por uso                                                   | Las de serie                                                         |
| Local (en el selector)        | Locales visibles de esa persona                   | El último usado primero                                   | No aparece si solo tiene uno                                         |
| TPV (al conectar)             | Lista de conectores soportados                    | Los más usados primero, con buscador y «el mío no está»   | Nunca vacío                                                          |
| **Integración (al conectar)** | **Catálogo de integraciones, con su estado real** | **Disponibles primero, luego próximamente, luego manual** | **Nunca vacío**                                                      |
| Equipo (en mantenimiento)     | Equipos del local                                 | Por próxima revisión                                      | «Da de alta tu primera cámara»                                       |

**Tres reglas para todos:**

1. **Toda lista tiene su botón de crear al final**, y crear desde ahí devuelve al sitio con lo creado ya seleccionado. Nunca se pierde el trabajo por tener que salir a dar de alta algo.
2. **Toda lista de más de diez entradas lleva buscador**, tolerante a erratas y sin acentos.
3. **Ninguna lista enseña elementos desactivados**, salvo en el histórico, donde salen en gris con su marca.

Y una cuarta que la Evolución añade:

4. **Ninguna lista enseña una integración que no existe como conectable real.** Tres estados y ninguno miente: disponible, próximamente, manual.

---

# 4 · Estados y transiciones

Una entidad sin máquina de estado escrita **acaba con estados imposibles**. Estas son las once que importan.

| Entidad                        | Estados                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Producto**                   | `activo → desactivado → activo`. Nunca borrado. Desactivar exige confirmar si está en fichas                                                                                                              |
| **Pedido a proveedor**         | `borrador → enviado → recibido \| recibido con incidencias \| cancelado`. Desde recibido no se vuelve atrás: se corrige con un ajuste o con un abono                                                      |
| **Ficha técnica**              | `borrador → publicada → versión nueva`. **Una versión publicada no se edita jamás**: se crea otra. `archivada` solo si el plato se retira                                                                 |
| **Recuento**                   | `abierto → cerrado`. Cerrado no se edita. Corregir es un ajuste posterior con motivo                                                                                                                      |
| **Turno**                      | `borrador → publicado → modificado → cumplido \| no cubierto`. **Publicado es el punto sin retorno**: a partir de ahí, todo cambio avisa                                                                  |
| **Jornada**                    | `abierta → cerrada → reabierta → cerrada`. Reabrir exige motivo y queda en auditoría                                                                                                                      |
| **Registro de APPCC**          | `pendiente → registrado \| fuera de rango → con acción correctiva`. **Fuera de rango sin acción correctiva no es un estado final válido**: bloquea el cierre                                              |
| **Visita de auditoría**        | `programada → en curso → cerrada → con acciones pendientes → resuelta`                                                                                                                                    |
| **Suscripción**                | `prueba → activa → impago → solo lectura → archivada`, y desde cualquiera de vuelta a activa pagando                                                                                                      |
| **Alerta**                     | `viva → pospuesta → cerrada → viva otra vez si el dato cambia`. Una alerta cerrada no revive sola                                                                                                         |
| **Pedido de un canal externo** | `recibido → aceptado \| rechazado → en preparación → listo → entregado \| cancelado`. **El paso de `recibido` a `aceptado` o `rechazado` tiene plazo**, y si se pasa lo decide la plataforma, no nosotros |

> **Regla general:** toda transición registra **quién, cuándo y desde dónde**. Y **ningún estado final se puede editar**: se corrige creando algo nuevo que lo enmiende.

---

# 5 · Cuando algo sale mal

Los fallos parciales son los que hunden la confianza, **porque el usuario no sabe si su trabajo se ha guardado**. Para cada uno: qué pasa por dentro y qué ve exactamente.

| Fallo                                     | Qué hace el sistema                                     | Qué ve el usuario                                                                  |
| ----------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Se cae la red al guardar una ficha        | Se guarda en local y se reintenta                       | «Guardado en tu móvil. Se subirá al recuperar señal.» Sin perder nada              |
| La foto del albarán se lee mal            | Se guarda la foto y lo que sí ha entendido              | Pantalla de repaso con lo dudoso en amarillo: «he leído 14 líneas, revisa estas 3» |
| El albarán trae un producto desconocido   | No se descarta                                          | «No conozco Aceite AOVE 5L. ¿Es tu aceite de oliva o es nuevo?»                    |
| El TPV manda un artículo sin emparejar    | Entra la venta en dinero, no descuenta género           | Aviso en Servicio y contador en el Panel                                           |
| El fichero del TPV cambia de formato      | Se guarda el original y no se procesa                   | «El fichero no tiene el formato de siempre. Lo he guardado.» Y aviso interno       |
| El recuento se queda a medias             | Se conserva como abierto con lo contado                 | «Tienes un recuento a medias del martes, ¿sigues o lo descartas?»                  |
| Dos personas editan la misma ficha        | Gana quien guarda primero                               | Al segundo: qué ha cambiado y opción de fusionar. **Nunca se pisa en silencio**    |
| Se agotan los créditos de Fogón           | Se pausa **solo** lo que llama al modelo                | «Has usado tus 300 créditos. Los avisos y los cálculos siguen funcionando.»        |
| Falla la generación de un PDF             | Se reintenta una vez y se guarda la receta              | «No he podido generarlo. Reintentar / avisar», sin perder la configuración         |
| Google Places no responde                 | Se usa lo guardado                                      | La sección enseña la fecha del último dato, **sin error rojo**                     |
| Se sube un CSV con columnas raras         | Se propone el mapeo y se pide confirmar                 | Pantalla de emparejar columnas con vista previa de 5 filas                         |
| El correo de invitación no llega          | El PIN sigue siendo válido                              | «Puedes darle el PIN en mano», con el código y botón de reenviar                   |
| La foto pesa 8 MB                         | Se reduce antes de subir                                | Barra de progreso, y nada más                                                      |
| Alguien intenta ver otro local            | `403` en el servidor                                    | «No tienes acceso a ese local» y vuelta a lo suyo                                  |
| **Un webhook de reparto llega dos veces** | **Se descarta por identificador de pedido**             | **Nada. Es lo correcto: el usuario no tiene que enterarse**                        |
| **Un webhook llega con la firma mal**     | **Se descarta y se registra el intento**                | **Nada en el local. Aviso interno a nosotros**                                     |
| **No se acepta un pedido a tiempo**       | **La plataforma lo cancela. Se registra con su motivo** | **«Este pedido se canceló por tiempo», con la hora exacta**                        |
| **La API del canal de reparto cae**       | **Se encola y se reintenta con espera creciente**       | **Estado de la integración en amarillo, con la última sincronización**             |
| **Fogón propone un horario imposible**    | **Se entrega igual, con los huecos señalados**          | **«Falta 1 camarero el miércoles de 20:00 a 22:00», antes de publicar**            |

**Tres reglas de error, para todos:**

1. **Nunca un código ni un «error inesperado».** Qué ha pasado, qué se puede hacer y un botón.
2. **Nunca se pierde lo escrito.** Si algo falla, el borrador se queda.
3. **Nunca un error rojo por algo que no lo es.** Que Google tarde no es un fallo del restaurante.

---

# 6 · Hallazgos de la auditoría

Dieciocho puntos que, tal y como estaban escritos, habrían obligado a improvisar. **Cada uno con su decisión.**

**1 · El stock mínimo estaba a mano y no debería.** Escribir «8 kg» en cada producto es un trabajo que nadie hace y que envejece mal. **Decisión:** se calcula. `consumo medio diario × días hasta el próximo reparto + 20 % de seguridad`, recalculado cada semana. Se puede fijar a mano, y entonces se respeta y se marca como manual.

**2 · No estaba dicho el orden de consumo de lotes.** **Decisión:** FEFO, primero el que antes caduca, no el que antes entró. En hostelería la fecha manda sobre el orden de llegada.

**3 · Faltaba el food cost real global.** **Decisión:** se calcula y se enseña junto al teórico: `(inventario inicial + compras − inventario final) ÷ ventas`. Y la brecha entre los dos, **que es donde está el dinero**. Por debajo de 2 puntos es normal; por encima de 3 hay algo que investigar; por encima de 8 hay una fuga.

**4 · La desviación no decía por qué.** Un número sin causa no sirve. **Decisión:** Estook propone la causa más probable con lo que ya sabe: consumo de personal sin registrar, error de escandallo, unidad de conteo distinta, recepción mal registrada, o diferencia entre albarán y factura. Con el enlace a comprobarlo.

**5 · Quien compra podía valorar su propio inventario.** Es un conflicto de interés reconocido en el sector. **Decisión:** permiso separado para «cerrar recuento». No se obliga, se ofrece, y en cadena se puede exigir desde la organización.

**6 · No estaba definido qué pasa con las ventas anteriores a tener fichas.** **Decisión:** entran como ventas en dinero, marcadas como históricas, y **no descuentan stock retroactivo**. Cuando existan fichas, se puede recalcular bajo petición explícita, nunca solo.

**7 · «Agotado» y «sin stock» se confundían.** **Decisión:** son dos marcas independientes. Agotado lo pone una persona y afecta a la carta. Sin stock lo calcula el sistema y afecta a los avisos. **Un plato puede estar agotado con la cámara llena.**

**8 · Faltaba decidir qué manda entre albarán y factura.** **Decisión:** el albarán mueve stock en el momento; **la factura confirma el precio** y, si difiere, abre vigencia nueva con efecto desde la fecha del albarán.

**9 · No estaba escrito el orden de los recálculos.** **Decisión:** el recálculo va siempre en el mismo orden —**precio, elaboración, plato, margen, aviso**— y se hace en cola por producto, así que dos cambios seguidos producen el mismo resultado que uno tras otro.

**10 · Los avisos podían repetirse cada día para siempre.** **Decisión:** un aviso cerrado no vuelve hasta que el dato que lo originó cambie; con «ahora no» vuelve en siete días; y **nunca hay más de un aviso vivo por causa y producto**.

**11 · Faltaba qué pasa al cambiar un plato de sección o de carta.** **Decisión:** el histórico de ventas del plato **no se rompe nunca** al moverlo. La clasificación se calcula sobre su sección actual, y el análisis dice desde cuándo está ahí.

**12 · El indicador de salud de datos no tenía fórmula.** **Decisión:** cinco componentes con su peso: platos con ficha ponderados por sus ventas (35 %), productos con precio vigente (20 %), días con APPCC completo (15 %), ventas con origen fiable (15 %), recuento en los últimos 30 días (15 %). Y **se enseña siempre qué falta para subirlo, no solo la nota**.

## Los seis que trae la Evolución 1.0

**13 · Estook Pulse podía acabar siendo un número sin sentido.** Un indicador de salud del negocio que no se puede desmontar es un adorno. **Decisión:** se construye con la misma disciplina que la salud de los datos —componentes, pesos y explicación— y **se puede abrir hasta el dato que lo mueve**. Y no se mezcla con la salud de los datos: son dos indicadores distintos que responden a preguntas distintas.

**14 · No estaba dicho de dónde nace una alerta ni cuándo muere.** Un centro de alertas sin ciclo de vida es un generador de ruido. **Decisión:** una alerta es siempre la materialización de una condición en código, con su causa, su impacto, su acción y su botón. Nace cuando la condición se cumple, **se actualiza en vez de duplicarse**, y muere cuando la condición deja de cumplirse o alguien la cierra. Su máquina de estado está en la parte 4.

**15 · Un pedido de reparto podía convertirse en una segunda fuente de verdad.** Es la tentación obvia: una tabla de pedidos de Uber, otra de Glovo. **Decisión:** cada canal tiene su **adaptador**, y todos transforman al **modelo interno de pedidos**. Un pedido de reparto es una venta con canal y comisión, no una entidad nueva. Si hiciera falta un campo que solo tiene un canal, va en un campo de datos del origen, no en una tabla paralela.

**16 · El plazo de aceptación de las plataformas no estaba contemplado.** Uber Eats cancela solo un pedido que no se acepta en 11 minutos y medio. **Decisión:** el webhook **acusa recibo y encola, y nada más**. Traer el pedido, transformarlo y responder es trabajo de la cola. Un webhook que hace el trabajo es un webhook que caduca.

**17 · No estaba escrito qué pasa cuando Fogón propone algo y nadie lo mira.** **Decisión:** una propuesta de Fogón —horario, menú, precio, pedido, respuesta a reseña— **es siempre un borrador con caducidad**. Si nadie la aprueba, caduca y se registra que caducó. Nunca se aplica sola, y nunca se queda viva para siempre ensuciando la pantalla.

**18 · Faltaba decir qué pasa si un componente de Pulse no tiene datos.** **Decisión:** el componente sin datos **no cuenta como cero**: se excluye y se reparte su peso entre los demás, y Pulse dice cuántos componentes está usando. Contar como cero castigaría a un local recién dado de alta por no tener aún un recuento, que es exactamente lo contrario de lo que se quiere.

---

# 7 · Riesgos de improvisación que quedan

Cosas que quien construya **va a tener que decidir sí o sí**, y que por tanto quedan decididas aquí.

| Decisión                                                             | Cómo queda                                                                                                                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿En qué unidad se guarda una cantidad?                               | Siempre en la unidad de uso del producto. La conversión se hace al entrar y al salir, **nunca por dentro**                                                                                                 |
| ¿Con cuántos decimales?                                              | Cantidades con 4, dinero en **céntimos enteros**, porcentajes con 4 como fracción                                                                                                                          |
| ¿Cuándo se redondea?                                                 | **Solo al presentar.** Nunca en un cálculo intermedio                                                                                                                                                      |
| ¿Qué pasa con un céntimo que sobra al repartir?                      | Va siempre a la primera línea. **Determinista**, para que dos ejecuciones den lo mismo                                                                                                                     |
| ¿La fecha operativa la calcula quién?                                | **El servidor**, con la zona y la hora de corte del local                                                                                                                                                  |
| ¿Qué timestamp lleva un fichaje?                                     | El del servidor. El del dispositivo se guarda aparte como referencia                                                                                                                                       |
| ¿Se puede tener stock negativo?                                      | **Sí**, se marca en rojo y sale en el aviso de la mañana. El programa no manda sobre el servicio                                                                                                           |
| ¿Se puede vender un plato sin ficha?                                 | **Sí.** Cuenta en dinero y sale en «sin ficha»                                                                                                                                                             |
| ¿Se puede cerrar una jornada sin ventas?                             | Sí, con cero. Un día cerrado es un día cerrado                                                                                                                                                             |
| ¿Qué pasa si el mismo producto entra dos veces en una ficha?         | Se suman las cantidades y se avisa, **no se duplica la línea**                                                                                                                                             |
| ¿Y si una elaboración se contiene a sí misma?                        | Se rechaza al guardar, con el camino del ciclo señalado                                                                                                                                                    |
| ¿Un plato puede estar en dos secciones?                              | **No.** Una sección por plato y por carta, para que el análisis no lo cuente dos veces                                                                                                                     |
| ¿Se pueden solapar dos turnos de la misma persona?                   | **No.** Se avisa y se ofrece fusionarlos en un turno partido                                                                                                                                               |
| ¿Qué pasa si alguien ficha dos veces la entrada?                     | La segunda no crea un tramo: se ignora y se avisa en pantalla                                                                                                                                              |
| ¿Un documento generado se puede editar?                              | **No.** Se regenera con otros parámetros                                                                                                                                                                   |
| ¿Se pueden borrar datos de un periodo cerrado?                       | **No.** Se reabre con motivo, o se corrige con un ajuste fechado                                                                                                                                           |
| **¿Quién ejecuta los procesos de fondo?**                            | **Hay que decidirlo antes de M8 y escribirlo.** La bandeja de salida, la cola de trabajos y la limpieza de caducados existen desde M2 y **nadie las llama**: una API que atiende y se apaga no tiene reloj |
| **¿Una alerta puede crear datos?**                                   | **No.** El centro de alertas lee y enlaza. Actuar es pulsar su botón, que llama a un comando normal                                                                                                        |
| **¿Fogón puede escribir?**                                           | **No.** Propone y rellena; guarda un comando lanzado por una persona, y queda en auditoría marcado como venido del asistente                                                                               |
| **¿Un pedido de reparto crea productos o platos?**                   | **No.** Si trae un artículo que no existe, entra sin emparejar: cuenta en dinero y no descuenta género, igual que en el TPV                                                                                |
| **¿Se acepta un pedido automáticamente?**                            | **Es una opción del local, apagada por defecto**, y con su registro. Nunca la decide Fogón                                                                                                                 |
| **¿Qué manda si el TPV y el canal de reparto traen la misma venta?** | **El canal, para su propio pedido.** Se descarta el duplicado por identificador y se avisa una vez, no cada día                                                                                            |
| **¿La API pública puede saltarse un permiso?**                       | **No.** Pasa por los mismos comandos, los mismos permisos y la misma auditoría. Un tercero nunca ve más que quien autorizó la conexión                                                                     |

---

# 8 · Lista de comprobación

Al cerrar cada módulo se comprueban las que apliquen. **Cada línea es una prueba automática.**

## Datos y cascada

- Cambiar un precio recalcula **solo lo afectado** y no toca ningún histórico.
- Cambiar un rendimiento avisa del impacto **antes** de guardar.
- Cambiar un gramaje crea versión y deja intacta la anterior.
- Una venta de hace un mes sigue valorada con la ficha que estaba vigente ese día.
- Reconstruir los agregados desde cero da **exactamente los mismos números**.
- Dos cambios simultáneos sobre el mismo producto dan el mismo resultado que en serie.

## Opciones y formularios

- Ningún desplegable enseña elementos de otro local.
- Ningún desplegable enseña desactivados fuera del histórico.
- Crear desde un desplegable devuelve al sitio con lo creado seleccionado.
- Toda lista larga tiene buscador tolerante a erratas y sin acentos.
- **Toda lista larga está acotada**: no se enseñan cincuenta filas idénticas.
- Todo estado vacío tiene una frase y un botón.
- Ninguna integración aparece como disponible sin serlo.

## Estados

- No existe forma de editar un recuento cerrado, una jornada cerrada ni una ficha publicada.
- Un APPCC fuera de rango sin acción correctiva impide cerrar.
- **Toda transición registra quién, cuándo y desde dónde.**
- Una alerta cerrada no revive sola.
- Una propuesta de Fogón sin aprobar caduca y queda registrada.

## Errores

- Ningún mensaje enseña un código ni un error de base de datos.
- **Perder la red no pierde lo escrito en ninguna pantalla.**
- Agotar los créditos no bloquea nada que no llame al modelo.

## Permisos

- **Un rol sin costes no recibe ni un campo de coste en ninguna respuesta.**
- Cambiar el rol de alguien surte efecto en la petición siguiente.
- Pedir datos de otro local devuelve `403` llamando a la API a mano.
- Fogón preguntando por algo que quien pregunta no puede ver, responde que no.
- La API pública con el alcance justo no devuelve un campo de más.

## Inteligencia

- Ninguna alerta llega **sin causa, sin impacto y sin botón**.
- Pulse se puede desglosar hasta el dato que lo mueve.
- Un componente de Pulse sin datos **no cuenta como cero**.
- Fogón no calcula ningún número: todos vienen de consultas.
- **Un texto de fuera —reseña, albarán, web— no cambia el comportamiento de Fogón.**
- Ninguna propuesta de Fogón se aplica sin que una persona la apruebe.

## Integraciones

- **Reenviar el mismo webhook no duplica el pedido.**
- Un webhook con firma inválida se descarta y se registra.
- El webhook responde y encola; **no hace el trabajo**.
- Si la API del canal cae, se encola y se reintenta sin perder nada.
- Un pedido externo **no crea productos ni platos**.
- Añadir un canal nuevo es escribir un adaptador, **no tocar el núcleo**.
