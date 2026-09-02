---
titulo: Roles, vistas, auditorías y administración
tipo: Documento maestro de comportamiento por rol
fecha: Septiembre de 2026 · versión 1.1
nota: Qué ve exactamente cada rol pantalla por pantalla, qué le llega a cada uno del centro de alertas, cómo navega el area manager entre sus locales, las auditorías completas y el panel interno.
---

# Qué es este documento

Aquí está el detalle que, sin escribir, se acaba improvisando:

- **Qué ve exactamente cada rol**, pantalla por pantalla, y qué alertas le llegan.
- **Cómo navega un area manager** entre el conjunto de sus locales y uno concreto.
- **Las auditorías de local, enteras:** plantillas, visita, informe y seguimiento.
- **Nuestro panel de administración**, sección por sección.

**Qué cambia en la versión 1.1.** Recoge la Evolución de producto 1.0: cada rol tiene ahora su **zona de atención** en el Panel y su reparto de alertas, se dice quién ve **Estook Pulse**, las auditorías **detectan solas** lo que el resto de Estook ya sabe, y el panel interno vigila también las integraciones.

---

# 1 · Qué ve cada rol

## 1.1 El principio

> **Un rol no es un menú más corto. Es un producto distinto hecho con las mismas piezas.**

Un cocinero no usa «Estook con cosas ocultas»: usa una aplicación pensada para él, donde lo que hay es lo suyo y **no hay huecos ni candados**. Por eso las apps que un rol no tiene no aparecen, la rueda se reparte entre las que quedan y los sectores se agrandan.

Y la regla técnica que lo sostiene: **el servidor no envía lo que el rol no puede ver.** Un cocinero no recibe un campo de coste, así que no hay nada que esconder en la interfaz.

## 1.2 Lo que la Evolución 1.0 añade a todos los roles

Tres cosas, y las tres respetan el principio de arriba.

**La zona de atención.** Encima de los widgets, una zona fija que no se puede quitar y que se ordena sola por prioridad. **Es distinta por rol**, y no es un recorte de la del gerente: es la lista de lo que esa persona puede resolver.

**El reparto de alertas.** Una alerta llega a quien puede actuar sobre ella, **no a todo el mundo**. Una alerta que llega a alguien que no puede hacer nada con ella es ruido, y el ruido enseña a ignorar.

**Estook Pulse.** Lo ve quien tiene responsabilidad sobre el resultado del negocio. No es un secreto: es que a un camarero no le sirve de nada, y ocupar su pantalla con ello es empeorarle la herramienta.

| Rol            | Zona de atención                                      | Alertas que le llegan                                     | ¿Ve Pulse?                        |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| Camarero       | Su turno, agotados, lo que le han cambiado            | Cambios en su turno, agotados de sala                     | No                                |
| Cocinero       | Fichas nuevas, caducidades, sus tareas, APPCC del día | Caducidad, ficha nueva, APPCC pendiente suyo              | No                                |
| Jefe de sala   | Turnos sin cubrir de sala, agotados, ventas del turno | Turno sin cubrir, agotado, incidencia de sala             | No                                |
| Jefe de cocina | Bajo mínimo, caducidades, platos bajo objetivo, APPCC | Stock crítico, margen de plato, APPCC, pedido por recibir | **Solo la parte de cocina**       |
| Gerente        | Todo lo del local                                     | Todas las del local                                       | **Sí, completo**                  |
| Area manager   | Los locales que se salen, primero                     | Las de sus locales, agrupadas por local                   | **Sí, de cada local y comparado** |
| Gestoría       | Periodos por cerrar, descuadres                       | Descuadre, periodo sin cerrar                             | No                                |
| Dirección      | Lo que se sale, en todos los locales                  | Las de todos, agrupadas                                   | **Sí, y el consolidado**          |

## 1.3 Camarero o personal de sala

**Entra y ve:** su turno de hoy, el menú del día, los agotados, los alérgenos y sus horas de la semana.

**Su rueda:** Calendario, Carta (solo lectura), Cuaderno y Servicio limitado a registrar mermas. Cuatro sectores grandes.

```
Buenos dias, Sara

┌─────────────────────────────┐
│ MI TURNO · hoy              │
│ 12:00 – 16:00 · Sala        │
│ Con: Luis, Marta            │
└─────────────────────────────┘
┌─────────────────────────────┐
│ MENU DEL DIA                │
│ Primeros · Segundos · Postre│
└─────────────────────────────┘
┌─────────────────────────────┐
│ AGOTADOS HOY (2)            │
│ Pulpo · Tarta de queso      │
└─────────────────────────────┘
┌──────────────┬──────────────┐
│ MIS HORAS    │ ALERGENOS    │
│ 28 h / 38 h  │ Consultar    │
└──────────────┴──────────────┘
```

**Qué puede hacer:** fichar, consultar la carta y los alérgenos, marcar un plato agotado, apuntar una merma, escribir en el chat, dejar una incidencia y descargarse su horario.

**Qué no ve, en ningún sitio:** costes, márgenes, precios de compra, ventas del local, datos de otras personas ni el cuadrante completo.

## 1.4 Cocinero

**Entra y ve:** su turno, las fichas nuevas que tiene que aprenderse, lo que caduca, sus tareas y la hoja de producción del día.

**Su rueda:** Escandallos, Inventario (registrar), Servicio (APPCC y mermas), Calendario y Cuaderno.

**Lo que hace especial su experiencia:** el **modo cocina** a pantalla completa, con letra grande, foto del plato, gramajes, pasos con sus fotos y el truco del jefe, en su idioma y **sin un solo importe**. Se avanza con un gesto o diciendo «siguiente». Y el **modo aprendizaje**: marca «ya la sé» y en su Panel ve cuántas lleva.

**Qué no ve:** **ningún importe.** Ni coste de línea, ni coste total, ni margen, ni precio recomendado. **Esa columna no existe para él**, tampoco en la respuesta del servidor.

## 1.5 Jefe de sala

Todo lo del camarero, y además: el cuadrante de sala en borrador y publicado, los fichajes de su equipo, las ventas del turno con su ticket medio, los agotados, y proponer cambios en la carta **sin publicarlos**.

No ve costes de materia prima ni escandallos con importes.

## 1.6 Jefe de cocina

**Su Panel:** gasto de cocina contra objetivo, platos bajo objetivo, valor en cámara, caducidades de la semana, pedidos por recibir y APPCC pendiente. Y **la parte de cocina de Pulse**: food cost, mermas y desviación, sin la parte de personal de sala ni la de facturación.

**Manda en:** Inventario entera, Escandallos entera, la parte de cocina de la Carta, el APPCC, el cuadrante de cocina y las fichas de su equipo.

**No ve:** el margen global del negocio, el coste de personal de sala, la facturación ni la parte de plan y facturación de Ajustes.

## 1.7 Gerente

Todo lo de su local. Es quien tiene el Panel completo, quien pone los objetivos, quien invita y quita accesos, quien conecta el TPV y **las integraciones**, y quien recibe los avisos de negocio.

**No ve:** los directos entre dos empleados en el chat, ni otros locales de la organización si no se le han dado.

## 1.8 Gestoría

Entra en una vista aparte, **sin rueda de apps**. Cuatro cosas:

```
GESTORIA · Bar Centro
┌─────────────────────────────────────────────┐
│ PERIODOS    julio ✓ cerrado · agosto ⧗      │
│ EXPORTAR    IVA · ventas · compras · horas  │
│ CUADRES     3 avisos de descuadre           │
│ DOCUMENTOS  los del periodo                 │
└─────────────────────────────────────────────┘
```

**Solo lectura**, solo de los locales que se le asignen, y con descarga en PDF, CSV y en los formatos de A3, Sage, Contasol y Holded.

**No ve** fichas técnicas, ni recetas, ni el chat, ni datos personales del equipo más allá de las horas.

## 1.9 Roles de organización

- **Chef corporativo:** Escandallos y Carta de todos los locales, más el catálogo maestro de recetas. Nada de personal ni de facturación.
- **Compras central:** Inventario y proveedores de todos los locales, contratos marco y la comparativa de precios entre locales. Nada de recetas ni de personal.
- **RRHH:** Equipo y Calendario de todos los locales, con costes de personal. Sin acceso a materia prima ni a márgenes.
- **Administrador de cuenta:** plan, facturación, licencias, altas de local y de personas. Sin acceso a la operación diaria, salvo que se le dé expresamente.
- **Dirección o propietario:** todo, en todos los locales.

---

# 2 · El area manager

Cómo se pasa de ver seis locales a estar dentro de uno.

## 2.1 Al entrar

**Un area manager no entra en un local: entra en su conjunto.** Y lo primero que ve es lo que se sale, no una tabla ordenada alfabéticamente.

```
┌───────────────────────────────────────────────────────────────┐
│ ESTOOK       Zona Norte ▾                            🔔 3     │
├───────────────────────────────────────────────────────────────┤
│ ZONA NORTE · 4 locales           hoy · semana · mes           │
│                                                               │
│ Ventas hoy  9.412 € ▲6%     Margen medio  31,0 % ▼1,2         │
│                                                               │
│ ⚠ NECESITAN QUE VAYAS                                         │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ PUERTO  materia prima 36,4 % · 5 puntos sobre la media   │   │
│ │         3 dias seguidos          [ Ver ]  [ Entrar ]     │   │
│ ├─────────────────────────────────────────────────────────┤   │
│ │ PLAYA   APPCC de ayer sin registrar  [ Ver ] [ Entrar ]  │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ TUS LOCALES                                                   │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│ │ LOCAL    │ VENTAS   │ M.PRIMA  │ PERSONAL │ MARGEN   │      │
│ │ Centro   │ 3.104 €  │ 29,8 % ● │ 27,1 % ● │ 34,2 % ● │      │
│ │ Puerto   │ 2.870 €  │ 36,4 % ● │ 31,0 % ● │ 24,1 % ● │      │
│ │ Playa    │ 2.210 €  │ 30,1 % ● │ 28,4 % ● │ 33,0 % ● │      │
│ │ Estacion │ 1.228 €  │ 31,2 % ● │ 26,9 % ● │ 32,8 % ● │      │
│ └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                               │
│ RANKING · COMPRAS · ESTANDARES · VISITAS · CALENDARIO · PULSE │
└───────────────────────────────────────────────────────────────┘
```

**Arriba del todo solo lo que se sale**, con su explicación y dos botones: **Ver** abre el detalle sin salir del consolidado; **Entrar** cambia de contexto.

Y desde la Evolución 1.0, **cada línea de «necesitan que vayas» es una alerta de verdad**: con su causa, su impacto, su acción recomendada y su botón. No es un semáforo con un número al lado.

## 2.2 Entrar en un local y volver

Al pulsar **Entrar** en Puerto, el area manager ve **exactamente lo que vería su gerente**: el Panel completo del local, las ocho apps, sus datos y sus avisos. No una versión reducida ni una de solo lectura.

Lo único que cambia es que **queda claro dónde está**:

```
┌───────────────────────────────────────────────────────────────┐
│ ← Zona Norte │  BAR PUERTO ▾                        🔔 ⚙ 👤   │
└───────────────────────────────────────────────────────────────┘
```

- El **logo y el color** de la cabecera pasan a ser los del local, para que nadie apunte una merma en el sitio equivocado.
- A la izquierda, una flecha permanente **«← Zona Norte»** que devuelve al consolidado desde cualquier pantalla, en un toque.
- El selector de local sigue arriba: se puede saltar de Puerto a Playa **sin volver a pasar por el consolidado**.
- Y al volver, **el consolidado aparece donde se dejó**, no recargado desde cero.

**Qué puede hacer dentro de un local:** todo lo de un gerente, salvo tres cosas reservadas a la organización: tocar el plan y la facturación, crear o archivar locales, y modificar el catálogo maestro. Al intentarlo, **se le dice quién sí puede**.

**Auditoría:** cada acción registra que la hizo un area manager desde el contexto de ese local, y **el gerente puede verlo en su propia auditoría**. Nada de accesos invisibles.

## 2.3 En móvil

Lo mismo en columna: **una tarjeta por local ordenada por lo que necesita atención**, no alfabéticamente.

```
┌─────────────────────────────┐
│ ⚠ PUERTO                    │
│ M. prima 36,4 %  ▲5 pts     │
│ 3 avisos · APPCC al dia     │
│ [ Entrar → ]                │
├─────────────────────────────┤
│ CENTRO                      │
│ Todo en objetivo            │
│ [ Entrar → ]                │
└─────────────────────────────┘
```

Y una barra fija abajo: **Locales · Visitas · Calendario · Más**.

## 2.4 El calendario del area manager

Su calendario **no es el de un local: es el de todos**. Con filtro por local y por tipo, ve de un vistazo sus visitas programadas, las entregas grandes, los eventos, los cierres y las vacaciones aprobadas de los responsables. Y desde ahí programa su ruta de la semana.

---

# 3 · Visitas y auditorías de local

Hoy esto se hace con una libreta o un Excel en el móvil, y se pierde. **Es de lo que más piden las cadenas.**

## 3.1 Las plantillas

Las monta dirección o el area manager, **una vez**, y se reutilizan. Una plantilla tiene bloques, y cada bloque tiene puntos:

```
PLANTILLA · Visita mensual de local
├── IMAGEN Y LIMPIEZA                      peso 20 %
│    · Fachada y entrada          0-5 · foto obligatoria
│    · Aseos                      0-5 · foto obligatoria
│    · Sala y mobiliario          0-5
│    · Uniformidad del equipo     0-5
├── COCINA Y PRODUCTO                      peso 35 %
│    · Orden en camaras           0-5 · foto obligatoria
│    · Etiquetado y caducidades   si/no · critico
│    · Gramajes segun ficha       0-5
│    · APPCC al dia               si/no · critico · automatico
├── EQUIPO                                 peso 20 %
│    · Cuadrante publicado        si/no · automatico
│    · Fichajes sin incidencias   si/no · automatico
│    · Formacion al dia           0-5   · automatico
└── GESTION                                peso 25 %
     · Inventario del mes hecho   si/no · automatico
     · Desviacion bajo el 3 %     si/no · automatico
     · Mermas justificadas        0-5
```

**Tres tipos de punto:**

- **Manual:** lo puntúa la persona que visita, de 0 a 5 o sí/no, con nota y foto.
- **Automático:** Estook lo rellena solo con lo que ya sabe. Si el APPCC de la semana está completo, ese punto sale verde sin que nadie lo toque. **Esto es lo que ninguna hoja de Excel puede hacer, y es la razón de que la auditoría viva aquí.**
- **Crítico:** un fallo en un punto crítico **marca la visita como no superada**, aunque la nota media sea alta.

Las plantillas viven en el catálogo maestro, así que **todos los locales del grupo se auditan con la misma vara**.

## 3.2 La auditoría que se rellena sola

Lo que la Evolución 1.0 potencia: los puntos automáticos dejan de ser cuatro y pasan a ser **todo lo que Estook ya sabe**. Antes de que el area manager llegue al local, la visita ya trae detectado:

| Lo que detecta solo      | De dónde lo saca                                   |
| ------------------------ | -------------------------------------------------- |
| APPCC incompleto         | Servicio · registros del periodo                   |
| Inventario atrasado      | Inventario · fecha del último recuento             |
| Desviación elevada       | Inventario · brecha entre food cost teórico y real |
| Fichajes anómalos        | Equipo · planificado contra fichado                |
| Formación pendiente      | Escandallos · fichas sin aprender por su equipo    |
| Documentación incompleta | Cuaderno · revisiones de equipos vencidas          |
| Problemas de stock       | Inventario · bajo mínimo y stock negativo          |
| Tareas sin cerrar        | Calendario · tareas vencidas                       |

> El area manager llega al local **a mirar lo que un ordenador no puede ver** —la limpieza, el trato, cómo sale el plato— porque el resto ya está puntuado.

## 3.3 La visita, en el móvil y sin cobertura

El area manager llega al local, abre **Visitas → Nueva visita**, elige la plantilla y recorre los bloques.

- Una pantalla por bloque, con los puntos en lista grande.
- **Puntuar es un toque.** La nota y la foto, opcionales salvo donde sean obligatorias.
- Los puntos automáticos ya vienen resueltos, con su dato al lado: «APPCC 6 de 7 días ✓».
- **Funciona sin cobertura** y sube al recuperar señal. Las cámaras de muchos locales no tienen wifi.
- Al terminar: nota global ponderada, puntos críticos fallados, y **firma del area manager y del responsable del local** en la pantalla.

## 3.4 El informe y, sobre todo, el seguimiento

> **Una auditoría que no genera acciones no sirve para nada.**

```
VISITA · Bar Puerto · 14 de agosto
Nota global 3,8 / 5          ⚠ 1 punto critico fallado
──────────────────────────────────────────────────
  Imagen y limpieza  4,2      Cocina y producto  3,1
  Equipo             4,5      Gestion            3,6

ACCIONES (se crean como tareas con responsable y fecha)
  · Reetiquetar camara de pescado      Luis   18 ago  ⧗
  · Repasar gramaje del pulpo          Luis   20 ago  ⧗
  · Pintar el marco de la entrada      Ana    31 ago  ⧗
```

- **Cada acción es una tarea de verdad**, con responsable y fecha, que aparece en el Calendario y en el Panel de quien la tenga.
- **La visita siguiente empieza revisando las acciones de la anterior.** Ese es el bucle que hace que sirva.
- Se genera el PDF de la visita con las fotos, para el local y para dirección.
- Y en el consolidado: **evolución de la nota de cada local y comparativa entre locales**, que es lo que dirección quiere ver.

## 3.5 Quién ve qué de una auditoría

|                              | Dirección | Area manager   | Gerente del local | Su equipo |
| ---------------------------- | --------- | -------------- | ----------------- | --------- |
| Ver la visita de su local    | ✓         | ✓              | ✓                 | —         |
| Ver visitas de otros locales | ✓         | solo los suyos | —                 | —         |
| Comparativa entre locales    | ✓         | solo los suyos | —                 | —         |
| Crear plantillas             | ✓         | —              | —                 | —         |
| Hacer una visita             | ✓         | ✓              | autoevaluación    | —         |
| Las acciones que le tocan    | ✓         | ✓              | ✓                 | ✓         |

**En un local independiente también sirve:** el gerente se pasa su propia plantilla una vez al mes y tiene el mismo informe, las mismas acciones y la misma evolución. Sin area manager, pero con el mismo bucle.

> **La autoevaluación es una idea que merece la pena:** el propio gerente puede pasarse la plantilla antes de que llegue la visita. Deja de ser un examen sorpresa y pasa a ser una herramienta, **y los locales mejoran solos**.

---

# 4 · Nuestro panel de administración

En `admin.estook.com`. **Solo para nosotros**, con doble factor obligatorio y sesión de ocho horas. Es lo que nos permite no vender a ciegas.

## 4.1 Inicio

```
ESTOOK ADMIN                              hoy · 7 dias · mes
──────────────────────────────────────────────────────────────────
CLIENTES     Activos 84   Prueba 19   Solo lectura 6   Baja 3
INGRESOS     4.116 €/mes recurrente        ▲ 312 € este mes
COSTE IA     118 €    Google 74 €    Infra 46 €    → 5,2 %
ACTIVACION   De 19 pruebas, 11 han pasado de 10 fichas (58 %)
──────────────────────────────────────────────────────────────────
⚠ ATENCION
 · Bar Marina lleva 6 dias sin entrar (era Pro, alta hace 3 semanas)
 · Casa Nieves gasto 1,84 € de IA ayer · 4,2 veces su media
 · Conector Glop: 3 locales con error de credenciales
 · Uber Eats: 2 pedidos rechazados por tiempo en Bar Centro
 · 2 pagos fallidos pendientes de reintento
```

## 4.2 Clientes

Lista con buscador y filtros por plan, estado, TPV, antigüedad y salud. La ficha de un cliente lleva:

- **Identidad:** organización, locales, CIF, contacto y desde cuándo.
- **Plan y facturación:** plan, importe, método de pago, próximas y últimas facturas, historial de cambios.
- **Uso real:** entradas por semana y por persona, qué apps usa y **cuáles no ha abierto nunca**, documentos generados, preguntas a Fogón.
- **Salud de los datos:** el mismo indicador que ve el cliente. **Es la mejor señal temprana de una baja:** cuando la salud cae y las entradas bajan, ese cliente se va en seis semanas.
- **Estado del conector:** qué TPV, por qué vía, si llegó a completarse el asistente o se quedó a medias, última sincronización, artículos sin emparejar y errores recientes. **Un cliente que no termina de conectar el TPV en la primera semana es el que más se va**, así que sale marcado.
- **Estado de las integraciones:** qué canales de reparto tiene conectados, tasa de aceptación a tiempo, pedidos perdidos por plazo y errores de webhook.
- **Coste que nos genera:** IA, Google e infraestructura del mes, y su margen real.
- **Soporte:** conversaciones, incidencias y notas internas.

## 4.3 Acceso a los datos de un cliente

La parte delicada, y la única forma honesta de hacerla:

1. Un administrador **pide acceso indicando el motivo y el tiempo** (por ejemplo, 60 minutos).
2. **El cliente recibe un aviso y lo autoriza.** Sin autorización no se entra, salvo en una urgencia de seguridad, que queda marcada como tal y se notifica igualmente.
3. Se entra **en solo lectura** y con una **banda roja permanente** en la pantalla que dice de quién es la sesión.
4. Todo queda en la **auditoría del cliente, visible para él**, y el acceso caduca solo.

> **Nunca se entra sin dejar rastro. Nunca se escribe en los datos de un cliente.**

## 4.4 Producto

Métricas que dicen si esto funciona: **activación** (cuántos llegan a 10 fichas y a la primera venta importada), **retención** por semanas desde el alta, **embudo del onboarding** con el paso exacto donde la gente abandona, uso por app, **avisos de Fogón aplicados frente a cerrados sin actuar**, y NPS con su comentario.

Y desde la Evolución 1.0, dos más que dicen si la inteligencia sirve: **cuántas propuestas de Fogón se aprueban frente a las que caducan**, y **cuántas alertas se resuelven frente a las que se posponen**. Una propuesta que nadie aprueba y una alerta que todo el mundo pospone son la misma señal: no valía.

## 4.5 Integraciones y conectores

Estado de Stripe, Google, correo, push y del proveedor de IA. Y una tabla propia de conectores **por TPV**: cuántos locales con cada uno, tasa de error, última sincronización, y **qué formatos de fichero han cambiado**. Cuando un TPV cambia su formato, esta pantalla lo enseña **antes de que llame el cliente**.

Y otra por **canal de reparto**: locales conectados, pedidos por día, tasa de aceptación dentro de plazo, webhooks rechazados por firma y errores de la API del proveedor.

## 4.6 Costes y alarmas

Coste por cliente y por día, con **alarma de anomalía** cuando alguien supera 1,3 veces su media de siete días. Tope diario de IA y de Google de toda la empresa **con corte automático**. Y el **margen real por plan**, que es la cifra que dice si un precio está bien puesto.

## 4.7 Soporte y comercial

Bandeja de incidencias **con contexto** (local, rol, pantalla y última acción, que llegan solos). Peticiones de demostración de cadenas. Lista de espera de «a medida». Y **la lista de TPV y de integraciones pedidos y no soportados, ordenada por cuántos los han pedido**: es la que decide qué conector se construye después.

## 4.8 Lo que el panel interno no hace

- **No permite escribir en los datos de un cliente.**
- No permite ver el chat del equipo de nadie.
- No permite descargar datos personales de empleados.
- **No tiene un botón de «entrar como» sin autorización.**
- Y no guarda nada que no esté en la auditoría del cliente.
