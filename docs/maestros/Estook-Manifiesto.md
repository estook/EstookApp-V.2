---
titulo: Manifiesto
tipo: Documento maestro de producto
fecha: Septiembre de 2026 · versión 1.1
nota: Qué es Estook, para quién, cómo se comporta hasta el último detalle, qué cuesta y cuánto se cobra. Un Panel y ocho apps, cada una una app de verdad. Documentos hermanos: Evolución 1.0, Plan de desarrollo, Roles y administración, y Auditoría de flujos.
---

# Qué es este documento

Este documento define qué es Estook, para quién, cómo se comporta hasta el último detalle, qué cuesta y cuánto se cobra. Es la referencia única de producto: **si algo no está aquí, se pregunta antes de construirlo.**

Marca: charcoal `#111C1F` · naranja `#FF7A00` · blanco · negro. Claim: «Tu cocina, bajo control.»

**Qué cambia en la versión 1.1.** Recoge la Evolución de producto 1.0: Estook pasa de ser una aplicación de gestión a ser el sistema operativo del restaurante. Los capítulos afectados son el 1, el 6, el 7 nuevo (Pulse), el 20 (Fogón), el 21 nuevo (alertas), el 24 nuevo (integraciones) y el 33 (negocio y mercado). Todo lo demás sigue palabra por palabra, y eso también es una decisión.

Documentos hermanos: **Evolución 1.0**, que dice hacia dónde va y en qué orden y se lee antes que este; **Plan de desarrollo**, que dice cómo se construye; **Roles, vistas, auditorías y administración**, que dice qué ve exactamente cada persona; y **Auditoría de flujos**, que dice qué desencadena cada cambio.

---

# 1 · Qué es Estook

Estook es **el sistema operativo del restaurante**: la aplicación donde vive todo lo que no es cobrar —el género, los costes, la carta, el equipo, el calendario, el control sanitario, los documentos y las decisiones— con todas las piezas conectadas entre sí y una capa de inteligencia que las lee todas.

Cobrar ya lo hace su TPV, y lo hace bien. Lo que ningún TPV hace bien es todo lo demás, y ahí es donde está el dinero que se escapa.

```
                        ESTOOK
                           │
        ┌──────────────────┼──────────────────┐
     PERSONAS          OPERACIONES         NEGOCIO
        │                  │                  │
     Equipo             Inventario         Gastos
     Horarios           Escandallos        Ventas
     Fichajes           Carta              Analitica
     Vacaciones         Servicio           Rentabilidad
                        Documentos
                           │
                           ▼
                       FOGON IA
                 analiza · predice · propone
                           │
                           ▼
                      AUTOMATIZA
                           │
                      API / DATOS
                           │
              TPV · ERP · DELIVERY · etc.
```

## Las cuatro superficies

| Superficie          | Quién entra                    | Qué es                                           |
| ------------------- | ------------------------------ | ------------------------------------------------ |
| Estook (app web)    | El restaurante y su equipo     | La aplicación completa: el Panel y sus ocho apps |
| Estook Enlace       | Se instala una vez en el local | El conector que trae las ventas del TPV          |
| Carta digital       | El cliente del restaurante     | La carta pública con QR, sin login               |
| Web y panel interno | Cualquiera / nosotros          | Vender, contratar y administrar                  |

**Lo que Estook hace:** controlar el género y las compras, calcular el coste real de cada plato, montar y analizar la carta, organizar el calendario del local, cuadrar el equipo y sus horas, llevar el APPCC, leer las ventas del TPV para cerrar el círculo, agregar los canales de reparto, generar documentos profesionales y explicarlo todo con Fogón.

**Lo que Estook no hace, y es una decisión firme:** cobrar, emitir facturas, llevar la caja, imprimir comandas, gestionar mesas, hacer nóminas, llevar reservas o guardar datos de clientes finales. Nada de eso es nuestro.

> Esa frontera no es una limitación: es lo que permite que un TPV se integre con nosotros en vez de vernos como competencia. El mercado ya lo demuestra —el TPV líder en España se integra con dos back-office de nuestra categoría— y por eso la frontera se defiende.

## Lo que nos hace distintos

No es ninguna función suelta. Es que **todas las piezas están conectadas**, de forma que cada dato nuevo hace más inteligente al resto del sistema:

```
Proveedor sube el precio del aceite
        ↓
Inventario detecta el coste nuevo
        ↓
Escandallos recalcula los platos afectados
        ↓
Carta recalcula su rentabilidad
        ↓
Negocio detecta la caida de margen
        ↓
Fogon analiza el impacto
        ↓
Panel genera la alerta
        ↓
Fogon recomienda la accion
        ↓
El gerente decide  ·  Estook registra el cambio
```

---

# 2 · El conector · Estook Enlace

## Cómo está el terreno

El conector no es uno: es uno por cada TPV, y no todos funcionan igual. Este es el estado real de los ocho que más se usan en hostelería española:

| TPV          | Dónde viven los datos                           | Vía de conexión                                                           |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Ágora        | Windows, base de datos local, con nube opcional | API oficial. Ya la usan Gstock y tSpoonLab para exactamente esto          |
| Glop         | Windows, base de datos local Firebird           | API oficial, con credenciales que el restaurante pide a Glop dando su CIF |
| Hosteltáctil | Windows, base de datos local                    | Local. Vía de agente o de exportación                                     |
| Last.app     | Nube                                            | API. No hay nada que leer en el local                                     |
| Revo XEF     | iPad y nube, con copia local en el dispositivo  | API y webhooks. No hay PC que leer                                        |
| ICG / HIOPOS | Híbrido, con nube                               | API del fabricante                                                        |
| Camarero10   | Nube                                            | API                                                                       |
| Qamarero     | Nube                                            | API                                                                       |

La conclusión: de los ocho, **solo tres viven en un PC con Windows**. Los otros cinco son de nube y no tienen nada que leer en el local. Una aplicación de escritorio no serviría para más de un tercio del mercado, así que no puede ser la única vía.

Y un aviso claro: leer directamente la base de datos de otro fabricante puede ir contra su licencia, y se rompe en cuanto ellos actualizan sin avisar. **No es una vía sobre la que construir un negocio.**

## La solución: un botón, tres vías por debajo

```
Ajustes → Mi TPV → [ Conectar mi TPV ]
                  │
          ¿cual usas? (lista con logos)
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
VIA 1 · NUBE  VIA 2 · ENLACE  VIA 3 · A MANO
API oficial   programa que    CSV, foto del Z
autorizas     se instala una  o total del dia
y ya          vez en el PC
```

**Vía 1 · Conexión por la nube (la preferida).** El cliente autoriza, o pega las credenciales que su proveedor le da. Sin instalar nada. Es la vía de Last.app, Revo, Camarero10, Qamarero, HIOPOS y también de Ágora y Glop cuando tienen la API contratada.

**Vía 2 · Estook Enlace.** Un programa pequeño para Windows, para los locales cuyo TPV vive en el PC y no expone API. Y aquí está la decisión importante de diseño:

> **Estook Enlace no entra en la base de datos del TPV. Vigila una carpeta.**

Casi todos los TPV de Windows saben dejar sus informes de cierre en una carpeta, programados a una hora. Enlace vigila esa carpeta, y cuando aparece un fichero nuevo lo lee, lo interpreta y lo sube. Nada más.

Esto lo cambia todo: no toca nada que no sea suyo, no depende de la estructura interna de nadie, no se rompe cuando el TPV actualiza, y no hay problema de licencia. Es sencillo, es legal y es aburrido, que es exactamente lo que tiene que ser un conector.

Cómo funciona Enlace:

- **Solo lectura.** No escribe en ningún sitio.
- **No abre puertos.** Él llama a Estook; nadie puede llamarle a él.
- Sale cifrado, con un código de emparejamiento de un solo uso que se genera en la app.
- Se instala una vez y arranca solo con Windows. Sin ventanas: un icono en la barra con el estado.
- **Consumo:** unos pocos kilobytes por envío. Sube al detectar un fichero nuevo, y si no hay nada, un latido cada quince minutos.
- Si el PC está apagado, no pasa nada: cuando arranca, sube lo que quedó pendiente.
- **Lo ponemos en marcha nosotros**, en una sesión remota de veinte minutos incluida en el alta de todos los planes con conexión.
- Las credenciales de su TPV se las pedimos nosotros por él cuando su proveedor las entrega bajo petición, que es lo habitual.
- Firmado, para que Windows no lo marque como sospechoso.

**Vía 3 · A mano, siempre disponible.** Subir el CSV del TPV, hacer una foto del Z, o escribir el total del día. Cada una con su nivel de fiabilidad marcado, porque una jornada estimada no puede entrar en la desviación de género como si fuera exacta.

## Qué se trae del TPV

El catálogo de artículos con sus precios y familias, que es lo que monta la carta sola la primera vez · ventas por artículo · importe y forma de pago · fecha y hora de servicio · turno y empleado si lo da · descuentos, invitaciones y anulaciones · cierre de caja · canal (barra, sala, terraza, reparto) si lo distingue.

**Qué no se trae y no nos interesa:** datos de tarjetas, datos personales de clientes y cualquier cosa que no sirva para calcular consumo, coste y margen.

## El emparejamiento, que es lo único que cuesta trabajo

```
Emparejar articulos · 148 encontrados
  ✓ 131 emparejados solos
  ⚠  17 por confirmar

  Hamburg. completa  → [ Hamburguesa Estook ▾ ] [ ✓ ]
  Coca-Cola 33       → [ Coca-Cola lata      ▾ ] [ ✓ ]
  Menu mediodia      → [ es un menu: desglosar   ]
```

Fogón propone por parecido, la persona confirma. Esto se hace una vez. Lo que quede sin emparejar cuenta en dinero pero no descuenta género, y aparece avisado.

**Y si su TPV no está en la lista:** se le dice la verdad. Aún no, pero funciona con CSV o con el total del día, y su petición entra en nuestra lista de próximos. **Nunca se le vende una conexión que no existe.**

---

# 3 · Para quién

**El local independiente.** Un bar o restaurante español de 3 a 25 personas, con un gerente sin tiempo. Muchos son de una generación que no ha crecido con software: si algo necesita explicación, está mal hecho.

**El grupo o la cadena.** De 2 a 40 locales, con dirección arriba, uno o varios area managers que llevan varios locales cada uno, y un gerente en cada local con su equipo. Su problema no es solo controlar: es comparar, estandarizar y detectar el local que se sale.

## Los cuatro niveles de alcance

```
ORGANIZACION   la empresa que contrata. De 1 a 40 locales
├── AREA       agrupacion opcional: "Zona Norte", "Madrid"
├── LOCAL      el restaurante. Donde ocurre la operacion
└── PERSONA    lo tuyo: tus horas, tu horario, tus fichas
```

Un local independiente usa un solo nivel y **no ve la palabra «área» en ninguna parte**. Una cadena de doce usa los cuatro. La misma aplicación.

## Los roles

**De organización:** dirección o propietario (todo) · administrador de cuenta (plan, facturación, altas de local y de personas) · chef corporativo (catálogo maestro de recetas y cartas) · compras central (proveedores y contratos marco) · RRHH (personas, horarios y fichajes) · gestoría (periodos cerrados y exportaciones, solo lectura, y solo de los locales que se le asignen).

**De área:** area manager, que hace lo de un gerente pero en sus locales y en vista comparada, sin tocar facturación ni crear locales.

**De local:** gerente · jefe de cocina · jefe de sala · cocinero · camarero.

Una persona tiene una o varias membresías, y cada una es `persona + alcance + rol`. Los permisos se heredan hacia abajo y se recortan local a local, en tres estados: sin acceso · ver · ver y editar. **Viven en el servidor:** un rol sin costes no recibe los campos de precio.

---

# 4 · Los principios innegociables

1. **Inventario es la única fuente de verdad del género.** La carta lee, no escribe.
2. **Ningún dato se pide dos veces.** Si se puede derivar, se deriva. Si lo tiene el TPV, se trae.
3. **Los documentos son salidas, nunca entradas.**
4. **El cliente pide operaciones, no cambios de tablas.**
5. **El stock es un libro de movimientos.** Los ajustes a mano también son movimientos, con autor y motivo.
6. **Nada se borra.** Se desactiva, se archiva o se anula, dejando rastro.
7. **La seguridad se hace en el servidor.** La interfaz esconde, no protege.
8. **Un local jamás ve los datos de otro.**
9. **Toda operación es idempotente.** Importar dos veces el mismo día no descuenta el género dos veces.
10. **Fogón propone y rellena; una persona aprueba y guarda.**
11. **Fogón ve exactamente lo que ve quien pregunta.**
12. **Nada crítico depende de internet ni del presupuesto de IA.**
13. **Se prueba en móvil real** antes de dar nada por terminado.
14. **Cero jerga.** «Lo que hay en cámara», no «stock disponible».
15. **Cada app se siente una app.** No una pestaña dentro de otra cosa.
16. **Cada dato nuevo hace más inteligente al resto de Estook.** Nada entra aislado: antes de construir algo se dice qué otras partes tienen que enterarse cuando cambie.

---

# 5 · La arquitectura de la aplicación

## Un Panel y ocho apps

```
                    EL PANEL
        (inicio · atencion · resumen · Fogon)
                        │
  ┌──────┬──────┬──────┼──────┬──────┬──────┬──────┐
  ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
INVEN- ESCAN- CARTA CALEN- EQUIPO SERVI- NEGO-  CUA-
TARIO  DALLOS       DARIO         CIO    CIO   DERNO
```

| App         | Qué resuelve                                 | Su pregunta                                   |
| ----------- | -------------------------------------------- | --------------------------------------------- |
| Inventario  | Qué hay, qué cuesta, a quién se le compra    | ¿Qué tenemos? ¿Qué se acaba? ¿Qué caduca?     |
| Escandallos | Todo lo que vendes, plato a plato            | ¿Cuánto cuesta de verdad? ¿Qué margen deja?   |
| Carta       | Componer la carta y el menú, imprimirlos     | ¿Qué funciona? ¿Qué pierde dinero?            |
| Calendario  | Qué pasa cada día en el local                | ¿Qué hay hoy? ¿Quién trabaja?                 |
| Equipo      | Quién trabaja, cuándo y cuánto cuesta        | ¿Cuántas horas? ¿Cuánto cuesta?               |
| Servicio    | El día a día: jornada, ventas, APPCC, cierre | ¿Qué está pasando hoy?                        |
| Negocio     | Cómo va, dónde se va el margen               | ¿Dónde se pierde dinero? ¿Qué cambiar?        |
| Cuaderno    | Notas, incidencias y mantenimiento           | ¿Qué ha pasado? ¿Qué debe saber el siguiente? |

Y encima de todo, **Fogón**, presente en cada pantalla, y el chat del equipo en la cabecera.

## Qué significa «cada app es una app»

No es una frase bonita. Es una regla de construcción, y cada una de las ocho la cumple:

- Tiene su propio icono y su acento de color. Se reconoce de un vistazo.
- Tiene su propia navegación interna, con sus vistas.
- Tiene su propia pantalla de inicio, con lo que hay que atender hoy dentro de esa app.
- Tiene su buscador y sus filtros propios.
- Genera sus documentos desde dentro, con el botón donde están los datos.
- Tiene su historial: lo que ha pasado ahí, quién lo hizo y cuándo.
- Tiene su bandeja de pendientes y su contador, que aparece en la rueda y en el Panel.
- Se puede abrir sola desde el móvil, con su acceso directo.
- **Habla con las demás por datos, nunca por copia:** la Carta lee de Escandallos y Escandallos lee de Inventario.

## Cómo se navega

En móvil, tres posiciones abajo y la rueda de apps en el centro:

```
┌──────────────┬───────────────────┬──────────────┐
│    PANEL     │         ✦         │   AJUSTES    │
└──────────────┴───────────────────┴──────────────┘
```

La rueda se abre sobre fondo desenfocado, con un sector por app, su icono, su color y su contador de pendientes. Las apps que el rol no tiene **no aparecen** y los sectores se reparten. Se puede pulsar, o mantener el dedo y arrastrar. Pulsación larga sobre el botón central: acciones rápidas del rol.

Dentro de una app, en móvil, la barra de abajo pasa a ser la de esa app:

```
INVENTARIO   │ Hoy │ Productos │ Pedidos       │ Mas │
ESCANDALLOS  │ Hoy │ Fichas    │ Elaboraciones │ Mas │
CALENDARIO   │ Mes │ Semana    │ Dia           │ Mas │
```

En escritorio, barra superior fija con todas las apps y sus desplegables, y dentro de cada app un menú lateral propio. La ficha se abre en panel lateral derecho sin tapar la lista. Atajos: `⌘K` buscador universal · `⌘1`–`⌘8` apps · `⌘G` genera el PDF de la pantalla · `⌘J` Fogón.

En tableta, por debajo de 1.024 px se comporta como el móvil, y por encima como el ordenador.

**Regla de profundidad:** máximo tres niveles. App → vista → ficha.

---

# 6 · El Panel · el centro de control

El Panel no es una app: es el sitio donde se entra, se mira y se organiza. Y es distinto para cada persona.

**Lo que cambia con la Evolución 1.0:** deja de ser un tablero de información y pasa a ser un centro de control. La diferencia cabe en una pregunta: no «¿cómo va todo?», sino **«¿qué necesita mi atención ahora?»**.

## La zona de atención

Por encima de los widgets hay una zona fija que no se puede quitar y que se ordena sola por prioridad:

```
ESTOOK

Buenos dias, Carlos.

HOY
  Ventas previstas        2.840 €
  Personal previsto       1.120 €
  Food cost previsto       28,4 %

⚠ 3 cosas necesitan atencion

  ● Pollo
    Stock critico. Prevision: se agota el viernes a las 20:30.

  ● Carta
    2 platos han caido por debajo del margen objetivo.

  ● Equipo
    Carlos tiene 3 h 20 m mas planificadas que su objetivo semanal.

  [ Ver todo ]
```

La zona de atención **también es distinta por rol**. Un cocinero no ve «margen bajo objetivo»: ve «tres fichas nuevas y dos cosas que caducan». El detalle está en el documento de Roles.

## Debajo, el Panel de cada uno

Una rejilla de widgets que cada uno coloca a su gusto, arrastrando. La configuración se guarda **por persona y por dispositivo**: el gerente puede tener un Panel en el ordenador y otro distinto en el móvil.

| Widget                | Qué enseña                                                          |
| --------------------- | ------------------------------------------------------------------- |
| Cifras del día        | Ventas, materia prima, personal, margen, con objetivo y comparación |
| Estook Pulse          | La salud del negocio con su explicación                             |
| Calendario            | Lo de hoy y lo de mañana: turnos, entregas, limpiezas, tareas       |
| Mi turno              | A qué hora entro, con quién, y qué me toca                          |
| Avisos de Fogón       | Tarjetas con acción y con ✕                                         |
| Hoy hay que hacer     | Lo pendiente, de todas las apps                                     |
| Gráfica de ventas     | Semana, mes o año                                                   |
| Dónde se va el margen | Las cuatro fugas principales                                        |
| Bajo mínimo           | Lo que hay que pedir, con su previsión de agotamiento               |
| Caducidades           | Lo que hay que sacar antes del jueves                               |
| Fichas nuevas         | Lo que hay que aprenderse (cocina)                                  |
| Platos bajo objetivo  | Los que están dejando poco                                          |
| Competencia y reseñas | Una línea cada uno                                                  |
| Salud de los datos    | Lo que le falta a Estook para funcionar bien                        |
| Accesos rápidos       | Los botones que cada uno quiera                                     |
| Fijados               | Lo que cada uno haya clavado desde cualquier app                    |

## Fijar cualquier cosa al Panel

Desde cualquier pantalla de cualquier app hay un botón de fijar. Un plato, un producto que se está vigilando, una nota, una ficha, un proveedor, un informe. Aparece como tarjeta viva, con su dato actualizado.

Un cocinero se fija sus tres fichas del plato nuevo. Un gerente se fija el margen del pulpo mientras dura la subida del pescado. **El Panel se convierte en el escritorio de cada uno.**

## Qué trae puesto cada rol

Nadie empieza con el Panel vacío:

- **Gerente y propietario:** cifras del día, Pulse, calendario, avisos de Fogón, dónde se va el margen, bajo mínimo, reseñas.
- **Jefe de cocina:** calendario, bajo mínimo, caducidades, platos bajo objetivo, gasto de cocina, APPCC pendiente.
- **Jefe de sala:** mi turno, calendario del equipo, ventas del turno, agotados, alérgenos.
- **Cocinero:** mi turno, fichas nuevas, caducidades, mis tareas, notas de cocina. **Ningún importe.**
- **Camarero:** mi turno, menú del día, agotados, alérgenos, mis horas.
- **Area manager:** comparativa de sus locales, lo que se sale de la media, calendario de sus locales.
- **Gestoría:** periodos cerrados, exportaciones, avisos de cuadre.

> **Regla sin excepción:** cada número lleva debajo, en letra pequeña, de dónde sale y de qué periodo es.

---

# 7 · Estook Pulse

La salud del restaurante en un número, con su explicación. Vive en el Panel y en Negocio.

```
ESTOOK PULSE

SALUD DEL NEGOCIO

████████░░  82 / 100

  Ventas          ↑ 12 %
  Food cost       ↓  3 %
  Personal        →  1 %
  Margen          ↑  5 %

PROBLEMAS
  ⚠ Pollo bajo minimo
  ⚠ Aceite +12 %
  ⚠ Martes -23 % en ventas

OPORTUNIDADES
  · Reducir personal el martes de 22:00 a 00:00
  · Revisar el precio de 2 platos
  · Cambiar de proveedor de aceite
```

> **Nunca se enseña un número solo.** Pulse siempre explica por qué una métrica está en verde, en amarillo o en rojo, y qué la mueve. Un indicador que no se puede desmontar en sus componentes es un adorno.

## Pulse y salud de los datos son dos cosas distintas

|              | Salud de los datos                             | Estook Pulse                      |
| ------------ | ---------------------------------------------- | --------------------------------- |
| Qué mide     | Si Estook tiene lo que necesita para funcionar | Cómo va el negocio                |
| Para quién   | Todos, sobre todo al arrancar                  | Gerencia, dirección, area manager |
| Si sale bajo | Falta configurar cosas                         | Hay un problema en el restaurante |

No se mezclan y no se suman. Un local puede tener la salud de datos al 100 % y el Pulse en 54, y eso significa exactamente lo que parece: los datos están bien y el negocio va mal.

---

# 8 · Onboarding · los primeros tres minutos y los primeros tres días

## El alta

Una conversación corta, una pregunta por pantalla, con botones grandes y la opción de saltar cualquier cosa.

1. **«¿Cómo te llamas?»** Nombre y correo. Ese correo recibe lo importante.
2. **«¿Qué tipo de local tienes?»** Bar de tapas · Restaurante de carta · Cafetería · Obrador · Food truck · Otro. Determina la plantilla de APPCC, las categorías de producto, los objetivos de margen y qué apps vienen encendidas.
3. **«¿Cuántos locales?»** Con dos o más se crea la organización primero y se ofrece duplicar el local.
4. **«¿Cuál es tu restaurante?»** Se escribe el nombre y salen los resultados de Google. Al tocar el tuyo se rellenan nombre, dirección, teléfono y horarios, se traen tus reseñas y se detectan los locales de tu zona.
5. **«Sube tu logo y elige tu color.»** Se aplican a la app y a todos los documentos, con previsualización.
6. **Régimen fiscal y objetivos.** Península, Canarias o Ceuta y Melilla, y los porcentajes objetivo de materia prima y personal.
7. **Invita a tu equipo**, si quieres ahora.
8. **El paseo:** cinco pantallas cortas sobre el Panel, la rueda, Generar PDF, el chat y Fogón.

> El onboarding pregunta por el local y enseña a usar la app. **No pide catálogo, ni proveedores, ni recetas.** Eso viene después, cuando ya se entiende para qué sirve.

## Los datos de ejemplo: pocos y con un botón para quitarlos

Una app vacía el primer día es la peor primera impresión posible. Y una app llena de trescientos productos que no son tuyos es peor todavía.

- Estook crea **seis o siete productos, dos elaboraciones, tres fichas y una carta de cuatro platos**. Lo justo para entender cómo un producto alimenta una ficha y una ficha alimenta la carta.
- Todo lleva una etiqueta gris **«ejemplo»** bien visible.
- **No cuenta para nada:** ni avisos, ni análisis, ni salud de los datos, ni informes.
- Un solo botón, **«Quitar los ejemplos»**, los borra todos de golpe.
- Al crear el primer producto de verdad, Estook lo pregunta.

## Conectar tu TPV · el segundo día, no el primero

Pedirle credenciales de otro programa en el minuto dos es la forma más rápida de asustar a un gerente. Por eso, al terminar el paseo aparece una tarjeta fija en el Panel que no se va hasta que se resuelve:

```
┌──────────────────────────────────────────────┐
│ CONECTA TUS VENTAS                           │
│ Trae tu carta y tus ventas automaticamente.  │
│ Se hace una vez y son cinco minutos.         │
│                                              │
│ [ Conectar ahora ]    [ Recordarmelo ]       │
└──────────────────────────────────────────────┘
```

## El asistente, en cuatro pantallas

**1 · ¿Qué TPV usas?** Una rejilla con los logos, buscador y un «el mío no está». Nada de escribir a mano el nombre.

**2 · Cómo se conecta el tuyo.** Aquí es donde Estook se gana la confianza: cada TPV tiene su propia explicación, con su sistema, sus capturas y lo que hay que pedir. **Nunca una instrucción genérica.**

```
GLOP · Windows

Glop entrega las claves de conexion a peticion del titular.

1. Escribe a soporte de Glop desde el correo de tu empresa
   pidiendo las claves de la API, con tu CIF.
   ▸ Te lo redactamos nosotros:  [ Copiar el correo ]
2. Cuando te las manden, pegalas aqui.
3. Si prefieres no esperar, puedes empezar con un fichero.

[ Tengo las claves ]   [ Prefiero el fichero ]
```

**3 · La vía que le toque.** Con credenciales, se pega y se prueba en el momento. Sin ellas, se instala Enlace en una sesión remota de veinte minutos que hacemos nosotros. Y si nada encaja, el fichero.

**4 · Comprobación.** Se trae un día de prueba y se enseña qué ha entrado: «He leído 148 artículos y las ventas de ayer: 1.284 €, 96 tickets.» **Hasta que no se ve un dato real, la conexión no se da por buena.**

## Lo que trae la conexión, y dónde aterriza cada cosa

| Lo que trae                            | Dónde aterriza                     | Para qué sirve                           |
| -------------------------------------- | ---------------------------------- | ---------------------------------------- |
| Artículos con precio y familia         | Escandallos, como platos sin ficha | Ya tienes la lista de todo lo que vendes |
| Ventas por artículo, con fecha y hora  | Servicio                           | Descontar género y saber qué se vende    |
| Importes, formas de pago y tickets     | Servicio y Negocio                 | Cuadrar la caja y el ingreso             |
| Descuentos, invitaciones y anulaciones | Negocio                            | Control de lo que se escapa              |
| Familias y categorías                  | Escandallos y Carta                | La organización ya hecha                 |
| Modificadores y extras                 | Escandallos                        | Que un extra de queso descuente queso    |
| Menús y fórmulas                       | Escandallos                        | Para explotarlos a sus platos            |
| Canal, mesa o zona, si lo distingue    | Negocio                            | Margen por canal, con su comisión        |
| Empleado que cobra, si lo da           | Negocio                            | Ventas por persona                       |
| Cierre de caja                         | Servicio                           | El cuadre del día                        |
| Inventario o proveedores, si los lleva | Inventario                         | Para no teclearlo                        |

**Lo que ningún TPV tiene:** los ingredientes de cada plato y lo que cuestan. Un TPV sabe que vendiste una hamburguesa a 14,50 €; no sabe qué lleva dentro ni lo que te costó. **Eso lo pone el restaurante en Escandallos, y es exactamente lo que hace Estook.**

## El catálogo de referencia

Estook **no mete nada en tu inventario.** Te lo rellena cuando tú se lo pides.

Al crear un producto, el buscador consulta un catálogo de referencia de unos 250 productos habituales de hostelería española. Escribes «aceite de oliva» y salen las variantes con su unidad de compra, su factor, su rendimiento aproximado, su categoría y sus alérgenos ya puestos. Aceptas, pones tu precio y tu proveedor: **un producto bien definido en quince segundos en vez de en dos minutos**, y sin el error clásico de confundir la unidad de compra con la de uso.

Lo mismo con las recetas de referencia. Nadie obliga, y lo que no se usa no existe.

> La diferencia es de fondo: el catálogo de referencia es **una ayuda que se consulta**, no un inventario que hay que limpiar.

## Y el resto del arranque

- Importadores desde Excel, CSV, PDF y foto, con el mapeo propuesto por Fogón y confirmado por una persona.
- **Importación por acumulación:** fotografía los albaranes de una semana y el inventario se construye solo.
- **Camino de mínimo esfuerzo:** «empieza por tus diez platos más vendidos». Con diez fichas, Estook ya da avisos útiles.
- **Barra de progreso con valor, no con tareas:** «con lo que llevas ya calculo el margen de 6 platos; con 4 más te digo cuál te está costando dinero».
- **Modo demostración** aparte, con un restaurante ficticio entero. Se entra y se sale sin dejar rastro.

---

# 9 · El dinero: impuestos, canales y objetivos

**Impuestos.** Un bar maneja tres tipos a la vez: comida al 10 %, bebida alcohólica al 21 %, pan y leche al 4 %. Cada producto y cada plato llevan **su tipo impositivo**, no un porcentaje escrito a mano, y los tipos tienen vigencia: cuando cambia la ley se abre una vigencia nueva y **ninguna venta pasada se mueve**. El local declara su régimen en el alta: península y Baleares con IVA, Canarias con IGIC, Ceuta y Melilla con IPSI. En una fórmula con tipos mixtos, el impuesto se prorratea por el peso de cada componente.

Los precios de la carta se guardan **con impuestos incluidos**, que es como los piensa el hostelero, y por dentro se desglosan. El margen se calcula siempre sobre la base sin impuestos.

**Canales.** El mismo café vale distinto en barra, en terraza y en reparto, y en reparto la plataforma se lleva su comisión. Cada canal tiene su lista de precios con vigencia y su comisión, y **el margen de reparto se calcula con la comisión ya descontada**.

**Objetivos.** Materia prima, personal y margen por familia. Son los que ponen en verde o en rojo los semáforos de toda la aplicación, y los que usa Fogón para decir si algo está bien o mal. Vienen propuestos según el tipo de local.

---

# 10 · Idiomas

Interfaz en español, catalán, gallego, euskera e inglés, **elegida por persona, no por local**: en la misma cocina puede haber quien la quiera en castellano y quien la quiera en inglés.

**Fichas técnicas traducibles:** Fogón propone la traducción, una persona la aprueba, y el cocinero ve los pasos en su idioma. Una ficha que no se entiende no sirve de nada.

Carta digital en los idiomas que el local elija, con el del móvil del cliente seleccionado solo.

---

# 11 · Cadena · cuando hay varios locales

**Panel de cadena.** Comparativa por local de ventas, materia prima, personal, margen, mermas, desviación, cumplimiento de APPCC y valoración, con su objetivo y su semáforo. Arriba del todo, **gestión por excepción**: solo lo que se sale de la media, con su explicación. Un toque baja al local, otro vuelve.

**Catálogo maestro.** Productos, recetas, cartas, plantillas de APPCC, plantillas de tarea y objetivos que viven en la organización o en el área:

| Política    | Qué significa                                                                    |
| ----------- | -------------------------------------------------------------------------------- |
| Obligatorio | El local lo lee del maestro. No puede editarlo, y un cambio arriba llega a todos |
| Sugerido    | El local puede desviarse, y su desviación queda registrada y visible             |
| Libre       | El local lo gestiona por su cuenta                                               |

Así una franquicia bloquea la receta del plato estrella y deja libre la carta de vinos.

**Lo que nunca se hereda:** el stock, los albaranes, los precios de compra reales, los fichajes y los canales de chat. Son del local siempre.

**Comparativa de compras:** «Bar Puerto está pagando el aceite un 11 % por encima del precio de grupo.» Es el tipo de aviso por el que una cadena paga.

**Visitas y auditorías de local.** El area manager visita con un checklist en el móvil, puntúa, adjunta fotos y firma. Queda el informe, la comparación entre locales y las acciones pendientes con responsable y fecha. Hoy esto se hace en una libreta o en un Excel.

**Movilidad de personal:** asignar a alguien un turno en otro local desde el mismo cuadrante, con sus horas y su coste imputados allí.

---

# 12 · APP · INVENTARIO

El corazón. Lo que la app sabe que hay y lo que no. Todas las demás leen de aquí.

_Su navegación: Hoy · Productos · Proveedores · Pedidos · Inventario · Mermas_

## Hoy

La pantalla de inicio de la app: lo que hay que atender ahora. Bajo mínimo **con su previsión de agotamiento**, caducidades de esta semana, pedidos por recibir, precios que han subido, productos sin precio y recuento pendiente. Cada línea con su botón.

## Productos

Cada producto guarda nombre, categoría, foto, unidad de compra («caja 3 kg»), unidad de uso (g/ml/ud), factor, rendimiento, peso variable, código de barras, tipo impositivo, alérgenos, mínimo en cámara y proveedor principal.

> **Coste real por unidad de uso = precio ÷ (factor × rendimiento)**
> Es lo que usan los escandallos. El precio del formato no costea nunca.

**El stock: la cifra manda, el historial explica.** Siempre visible y siempre editable a mano. Si el jefe de cocina dice que hay 4 kg, hay 4 kg: se apunta el ajuste con quién y cuándo. **Nunca se bloquea a nadie por cuadrar.** Por dentro, ese ajuste es un movimiento más del libro.

**Entrada de género por donde se pueda:** a mano, por foto del albarán, por documento o CSV, por lector de código de barras, dictándoselo a Fogón, o desde un escandallo al escribir un ingrediente que no existe. **Solo dos campos obligatorios: nombre y cantidad.**

Un producto sin precio se usa igual: cuenta cero, sale en amarillo en las fichas que lo llevan y Fogón lo recuerda hasta el primer albarán donde aparezca.

El consumo se valora a **precio medio ponderado**, recalculado en cada entrada. Es lo único que evita que el margen salte cada vez que llega un albarán caro.

## Inventario predictivo

Además del stock, cada producto enseña **consumo medio, velocidad de consumo, días restantes, previsión de agotamiento con fecha y hora, caducidades, precio histórico, evolución del proveedor y sugerencia de pedido con su motivo**:

```
POLLO

  Actual              4,2 kg
  Consumo diario      3,1 kg
  Prevision           se agota el viernes a las 20:30

  PEDIDO RECOMENDADO
  35 kg

  Motivo: mantener unos 5 dias de cobertura.
```

Y la comparación entre proveedores para lo mismo, que es donde aparece el dinero fácil.

## Proveedores

Ficha con CIF, teléfono, correo, web, días de reparto, pedido mínimo, forma de pago y notas. Botones grandes: WhatsApp con el pedido escrito, llamar, correo, web. Se llena solo: qué te sirve, gasto del mes, subidas detectadas, incidencias y puntualidad. Y **contratos marco** con precio de referencia, para comparar lo pactado con lo que de verdad te cobran.

## Pedidos

`BORRADOR → ENVIADO → RECIBIDO`. La sugerencia por bajo mínimo respeta el calendario de reparto y avisa si el pedido no llega al mínimo del proveedor. Al recibir, lo primero que pregunta es **«¿entero o con cambios?»**: entero son dos toques.

Y algo que casi ningún programa hace: **la factura del proveedor se concilia con sus albaranes**, con las diferencias señaladas. El albarán mueve stock; la factura confirma el precio.

## Inventario y Mermas

- **Recuento cíclico:** cada semana las referencias que suman el 80 % del valor, el resto una vez al mes.
- **El stock mínimo se calcula, no se escribe:** `consumo medio diario × días hasta el próximo reparto + 20 % de seguridad`, recalculado cada semana.
- **Al consumir, primero lo que antes caduca.** Con varios lotes manda la fecha, no el orden de llegada.
- **El food cost, teórico y real, uno al lado del otro.** El real sale de `(inventario inicial + compras − inventario final) ÷ ventas`. La brecha es donde está el dinero: por debajo de dos puntos es normal, por encima de tres hay algo que mirar, por encima de ocho hay una fuga.
- **La desviación dice por qué.** Estook propone la causa más probable: consumo de personal sin registrar, error de escandallo, unidad de conteo distinta, recepción mal registrada o diferencia entre albarán y factura.
- **Quien compra no tiene por qué cerrar el recuento.** Es un permiso aparte.
- **La calibración:** si la cocina sirve un 6 % más de pulpo cada semana, eso pasa a ser el factor del producto. Necesita tres recuentos; hasta entonces sale como «aprendiendo».
- **Mermas en tres toques** con motivo obligatorio, también por voz y con foto. La comida del personal y las invitaciones van con motivo propio y como **partida aparte** del food cost.

_Documentos: inventario valorado · listado de productos con precios · etiquetas de cámara · hoja de recuento · informe de desviación · parte de mermas · pedido para el proveedor · comparativa entre proveedores · gasto por proveedor._

_Habla con: Escandallos (le da el coste), Servicio (le descuenta el consumo), Calendario (le pone las entregas), Negocio (le da el gasto)._

---

# 13 · APP · ESCANDALLOS

Aquí se calcula toda la carta, plato a plato. Es la app que convierte Estook en una herramienta de dinero y no de papeleo.

_Su navegación: Hoy · Fichas · Elaboraciones · Análisis · Aprendizaje_

## La ficha técnica, en dos caras

**Cara A · Coste.** Ingredientes con cantidad editable, porcentaje sobre el total, coste por línea, coste total, base sin impuestos, margen, precio recomendado, alérgenos con símbolos oficiales y simulador de gramajes.

```
HAMBURGUESA ESTOOK                       version 4
────────────────────────────────────────────────
  Carne picada       180 g      1,44 €     42 %
  Pan brioche          1 ud     0,55 €     16 %
  Queso                2 ud     0,38 €     11 %
  Salsa de la casa    30 g      0,21 €      6 %
  Patatas            150 g      0,29 €      8 %
  Otros                         0,55 €     17 %
────────────────────────────────────────────────
  COSTE       3,42 €
  PVP        14,50 €     Food cost    23,6 %
  MARGEN     11,08 €     Objetivo    ≤ 30 %  ✓
```

**Cara B · Elaboración.** Mise en place, pasos numerados con foto, tiempo, temperatura, utensilio, truco del jefe de cocina, conservación y rendimiento.

## Por qué las fichas técnicas son el motor de todo

> **Sin ficha, un plato es un nombre y un precio. Con ficha, es un cálculo.**

```
FICHA DEL PLATO
├─ ingredientes × coste por unidad de uso → coste del plato
├─ coste vs. PVP                          → margen y food cost
├─ margen vs. objetivo                    → aviso de plato bajo objetivo
├─ × ventas del TPV                       → consumo teorico
│                                         → movimientos de Inventario
│                                         → desviacion contra el recuento
│                                         → coste real del dia
├─ ingredientes                           → alergenos y valor nutricional
├─ ingredientes                           → que pedir y cuanto
├─ pasos y fotos                          → formacion del equipo
└─ rendimiento                            → hoja de produccion del dia
```

El indicador de salud de los datos enseña cuántos platos llevan ficha y qué se está perdiendo: «38 de 96 platos con ficha. Los 58 que faltan son el 41 % de tus ventas, y de esa parte no puedo decirte el margen ni descontar género.»

**Un plato sin ficha no bloquea nada:** se vende, cuenta en dinero, y sale marcado en «sin ficha».

Y hacerlas es más rápido de lo que parece: los platos ya vienen del TPV con su nombre y su precio, los ingredientes se buscan en el catálogo de referencia, **Fogón propone un borrador** a partir del nombre del plato y de recetas parecidas, y el jefe de cocina solo ajusta gramajes. De diez minutos por ficha a dos.

## Margen explicado

Cada plato enseña PVP, coste, food cost, margen, margen en euros, objetivo y desviación. Y cuando algo cambia, Fogón lo explica:

```
ACEITE  +12 %

  Afecta a          7 platos
  Bajo objetivo     2 platos
  Impacto maximo    -3,8 puntos de margen
```

> Respeta el sistema de dependencias existente. **Nunca se modifican ventas históricas. Nunca se recalcula el pasado con precios de hoy.**

## El modo cocina

Pantalla completa, letra grande, **sin un solo importe**, pensado para leerse desde el pase con las manos ocupadas. Foto del plato, gramajes, pasos con sus fotos, alérgenos y conservación. Se recorre con un gesto o dictando «siguiente». Y en el idioma del cocinero.

## Lo demás que la hace una app de verdad

- **Biblioteca con colecciones:** por categoría, por temporada, por dificultad, y colecciones propias.
- **Elaboraciones** con ficha, coste, stock y rendimiento propios, anidables, con detección de ciclos.
- **Extras y sustituciones** con su coste y su precio.
- **Versionado:** cada cambio de gramaje crea versión nueva sin tocar los costes históricos. Y comparador de dos versiones.
- **Escalado:** «esto es para 10, dame para 35».
- **Modo aprendizaje:** cada cocinero marca «ya la sé»; el jefe de cocina ve quién sabe hacer qué.
- **Análisis:** qué platos están bajo objetivo, cuáles no se revisan desde hace seis meses, cuáles llevan un producto sin precio.
- **La ficha impresa lleva QR** a la versión viva.

## Tres cosas que la competencia no da bien

**Valor nutricional y alérgenos calculados** a partir de los ingredientes. Sale en la ficha, en la carta digital y en el listado de alérgenos, que es obligación legal informar.

**Hoja de producción del día.** Cruzando el menú programado, las ventas previstas y lo que ya hay elaborado, sale la lista de mise en place. Es lo primero que mira un jefe de cocina al llegar.

**Escalado a evento.** «Esto es para 10, tengo un catering de 120»: gramajes, compra necesaria y coste total, en un botón.

_Habla con: Inventario (le pide el coste), Carta (le da coste y margen), Servicio (le explica el consumo), Negocio (le da la rentabilidad)._

---

# 14 · APP · CARTA

Aquí se compone lo que va impreso y lo que ve el cliente. **Los platos y sus costes viven en Escandallos; la Carta los coloca.** La Carta lee y nunca escribe.

_Su navegación: Carta · Menús · Análisis · Diseños · Carta digital_

## Montar la carta

Secciones que se añaden y se ordenan arrastrando. Dentro, platos con nombre, precio, descripción, foto y enlace a su ficha, de la que heredan alérgenos y coste. Cada plato se marca **agotado** desde el móvil, en dos toques, y desaparece de la carta digital, del PDF y del análisis. Estook recuerda que hay que marcarlo también en el TPV.

**Precios por canal.** El mismo café vale 1,30 € en barra, 1,60 € en terraza y 1,80 € en reparto, donde además la plataforma se lleva su comisión.

**Menús y fórmulas** con reparto del precio entre componentes para el margen, y prorrateo de impuestos cuando llevan bebida.

**Menú del día** con sus bloques, suplementos y programación. Fogón lo propone cruzando lo que caduca, lo que hay, lo que no se ha repetido en dos semanas y el margen objetivo.

## El análisis, que es lo que nadie más te da

|                | Se vende mucho                     | Se vende poco     |
| -------------- | ---------------------------------- | ----------------- |
| **Deja mucho** | Estrella · dale sitio              | Puzzle · empújalo |
| **Deja poco**  | Caballo · baja coste o sube precio | Perro · quítalo   |

Y la matriz de decisión, que es la misma idea vista de frente:

```
POPULARIDAD
     ↑
     │  ⭐ ESTRELLA          🔥 POPULAR
     │
─────┼───────────────────────────────→ RENTABILIDAD
     │
     │  ⚠ REVISAR            💰 RENTABLE
```

Fogón clasifica en estrellas, rentables, populares, a revisar y candidatos a retirar. **Nunca retira ni modifica nada por su cuenta.**

**El equilibrio de la carta:**

- Cuántos platos hay de cada familia y si la carta está descompensada.
- El rango de precios: si hay un salto raro, si falta algo en la franja media.
- Cuántos platos comparten ingrediente principal, que es lo que dispara las mermas.
- Cuántos llevan producto de temporada y qué va a pasar cuando suba.
- **El tamaño de la carta:** una carta de 80 platos no se puede ejecutar bien ni comprar bien, y Estook lo dice.

**Y la comparación con tu zona:** qué cobran los de al lado por el menú y por los platos que también tienes tú.

## Diseños y carta digital

Plantillas de verdad —minimal, elegante, bar, tradicional, moderno—, en vectorial, con la marca del local. Se genera con los datos reales, así que cambiar un precio no obliga a rehacer el diseño.

La **carta digital** es la página pública del local con su QR en tres formatos: mesa, cartel y pegatina. Precios del canal elegido, filtros por alérgeno y dieta, idiomas por el móvil del cliente, agotados en vivo y enlace para dejar reseña. Carga en menos de un segundo, aparece en Google, **sin cookies ni seguimiento**.

---

# 15 · APP · CALENDARIO

Todo lo que pasa en el local, en un sitio. **No es un calendario de turnos: es el calendario del negocio.**

_Su navegación: Mes · Semana · Día · Turnos · Tareas_

| Qué vive aquí |                                                            |
| ------------- | ---------------------------------------------------------- |
| Turnos        | Quién trabaja, en qué tramo y en qué puesto                |
| Entregas      | Los repartos de cada proveedor, sacados de sus días        |
| Limpiezas     | Campana, cámaras, extractores, fondos, con su periodicidad |
| Tareas        | Apertura, cierre, y las que se creen                       |
| Mantenimiento | Revisiones de equipos y visitas de técnicos                |
| APPCC         | Los registros que tocan hoy                                |
| Menús         | Qué menú del día está programado                           |
| Eventos       | Reservas grandes, catering, celebraciones                  |
| Cierres       | Vacaciones del local, festivos, días especiales            |
| Personas      | Vacaciones, bajas y permisos aprobados                     |

## Lo que hace que sea una app y no una rejilla

- Arrastrar para crear y para mover. Un turno se estira para alargarlo.
- Turnos partidos con dos o más tramos.
- Plantillas y copiar semana anterior.
- **Coste en vivo mientras montas:** la semana lleva 1.240 € y el objetivo son 1.150 €.
- Avisos automáticos: descanso menor de 12 h, más de 40 h, turno sin cubrir, choque con una vacación aprobada.
- **Borrador y publicado.** Hasta publicar, el equipo no lo ve.
- Al publicar, cada uno recibe **lo suyo**, no el cuadrante entero.
- Al cambiar algo, **solo se avisa al afectado**, y el aviso dice qué cambia.
- Recurrencias, suscripción de calendario para el móvil, y vista «solo lo mío».

## Horarios inteligentes

Un botón: **generar horario con Fogón**. Se le pide «hazme el horario de la semana que viene» y usa, cuando existan: disponibilidad, contratos, horas objetivo, vacaciones, ausencias, turnos anteriores, ventas históricas, previsión de ventas, eventos, necesidades mínimas de cada puesto y coste laboral.

```
HORARIO PROPUESTO

  Coste estimado         1.184 €
  vs semana anterior      -6,3 %

  COBERTURA
    Cocina                  98 %
    Sala                   100 %

  ⚠ El miercoles falta 1 camarero entre 20:00 y 22:00

  [ Editar ]  [ Aceptar horario ]
```

> **Nunca se publica automáticamente.** El cuadrante propuesto nace en borrador, y publicar es un acto de una persona.

---

# 16 · APP · EQUIPO

Quién trabaja, con qué condiciones, cuántas horas y cuánto cuesta.

_Su navegación: Hoy · Personas · Fichajes · Ausencias · Documentos_

## Personas

Ficha con rol, alcance, contacto, contrato y sus documentos. Alta por invitación con **PIN generado y mostrado en pantalla** para darlo en mano. Retirar acceso mata el PIN al instante, deja los turnos futuros sin cubrir con aviso y **conserva la persona**, porque sigue en lo que firmó. Quien se va y vuelve se reactiva con todo.

El **coste por hora** vive aquí, con vigencia y con permiso propio. Y para quien no quiera meter sueldos, la alternativa por defecto: **coste medio por puesto**, que da un porcentaje de personal correcto sin datos individuales.

## Fichajes

Se ficha en el local, y en dos toques:

- **En un dispositivo del local en modo quiosco:** una tablet o un PC viejo con Estook en pantalla de PIN, sin acceso a nada más.
- **Desde el móvil, solo si el local lo activa:** con una foto del puesto de trabajo como comprobante.

> Sobre la foto, con claridad: **es del puesto de trabajo, nunca de la persona.** No es biometría, no se compara con nada y no identifica a nadie: solo demuestra que quien fichó estaba allí. Se conserva 90 días y se borra sola. Nada de geolocalización ni de huella.

**No se ficha desde casa.** El registro de jornada es inalterable, se conserva cuatro años, y las correcciones son registros nuevos con autor y motivo.

Y el número que casi nadie enseña: **lo planificado contra lo fichado**. «Planificaste 32 horas y se ficharon 38», con su desglose y el coste de la diferencia.

## Ausencias

Vacaciones, bajas, permisos y asuntos propios, con solicitud, aprobación y saldo. Calendario laboral con festivos nacionales, autonómicos y locales por código postal. Bolsa de horas con su saldo.

---

# 17 · APP · SERVICIO

El día a día: abrir, controlar y cerrar.

_Su navegación: Jornada · Ventas · APPCC · Cierres_

## Jornada

Se abre sola con el primer fichaje o la primera venta importada. Fija la **fecha operativa** con la hora de corte del local: lo cobrado hasta las 06:00 cuenta del día anterior, **y lo calcula el servidor**.

## Ventas

| Origen                     | Fiabilidad | Qué permite                                              |
| -------------------------- | ---------- | -------------------------------------------------------- |
| Conexión con el TPV        | Alta       | Todo: consumo real, desviación, análisis de carta        |
| Canal de reparto conectado | Alta       | Todo, con su comisión descontada                         |
| CSV del TPV                | Alta       | Todo, con un minuto de trabajo                           |
| Foto del Z                 | Media      | Consumo aproximado, marcado como estimado                |
| Total del día              | Baja       | Caja y gasto al día, consumo repartido por mix histórico |

> **Regla que no se rompe:** una jornada estimada no entra en la desviación de género sin avisar. Sale sombreada y etiquetada.

## APPCC

El plan lo monta el gerente o el jefe de cocina, con plantillas por tipo de local. El equipo lo rellena en dos toques y firma con PIN. **Fuera de rango no se puede seguir sin registrar la acción correctiva.** Un punto sin registrar sale `NO REGISTRADO` en rojo, y no se puede registrar en el pasado.

Y la **trazabilidad de lote**: de un lote concreto, en qué elaboraciones entró y qué días se sirvió. Es la pregunta exacta que hace una inspección.

## Cierre en cuatro pasos y sesenta segundos

1. De dónde salen las ventas de hoy (la app propone la mejor fuente).
2. Mermas, por voz, por botones o ninguna.
3. El APPCC que falte.
4. Repaso y firma con PIN.

Al cerrar se calcula el consumo teórico, se descuenta del inventario, se guarda la jornada con su origen y fiabilidad, y se dispara el análisis nocturno de Fogón. **Reabrir exige motivo escrito y queda en auditoría.**

---

# 18 · APP · NEGOCIO

Cómo va, por qué, y qué hacer.

_Su navegación: Resumen · Pulse · Costes · Reseñas · Competencia · Exportar_

## Resumen

Día, semana, mes y año: ventas, materia prima, personal, prime cost, mermas, desviación y margen, con su objetivo y su comparación. Y la otra mitad del negocio: **productividad**. Ventas por hora trabajada, ventas por franja cruzadas con el personal que había, ticket por comensal y días fuertes y flojos.

**Previsión de ventas.** Con el histórico, el día de la semana, la estacionalidad y los eventos del calendario, Estook estima las ventas de los próximos siete días. Sirve para tres cosas concretas: **cuánto pedir, cuánta gente poner y cuánto producir.** Se enseña siempre como estimación, con su margen de error, y se compara después con lo que pasó de verdad.

**Presupuesto.** Objetivo de ventas y de costes por mes, con el seguimiento al lado.

En cadena, la comparativa entre locales con gestión por excepción.

## Costes

Dónde se va el margen, **con cada línea llevando a la app donde se arregla**: subidas de precio sin repercutir, género sin explicar, mermas, platos bajo objetivo, horas de más, comisiones de reparto.

## Reseñas y Competencia

**Reseñas** conectadas con Google: valoración, evolución, clasificación por tema, lo que se repite, detección de caídas y respuesta propuesta en el tono del local, **para mandarla tú**. Y el cruce que importa: si las quejas de espera coinciden con los viernes noche, lo cruza con el cuadrante y sugiere refuerzo.

**Competencia:** los locales de tu zona con su precio de menú, su valoración y su evolución, refrescados una vez por semana.

## Exportar

Lo que la gestoría necesita, en su formato: desglose por tipo de IVA, ventas por método de pago, compras por proveedor, horas del periodo. En PDF, en CSV y en los formatos de A3, Sage, Contasol y Holded. Y la **auditoría consultable**: quién, qué, cuándo, antes y después.

---

# 19 · APP · CUADERNO

Lo que hoy vive en la cabeza del jefe de cocina y en un grupo de WhatsApp.

_Su navegación: Incidencias · Notas · Equipos_

**Incidencias del turno.** «Se ha roto el abatidor.» «El cliente de la 12 se quejó de la espera.» Se apunta en dos toques o dictándoselo a Fogón, queda enlazada a la jornada y **la lee el turno siguiente al entrar**.

**Notas.** Mis notas, notas del equipo y notas del local. Con enlaces a platos, productos, proveedores y personas. **Compartir cambia los permisos de la nota, no la duplica.**

**Equipos y mantenimiento.** Cámaras, abatidor, campana, lavavajillas, extintores. Cada uno con su ficha, su histórico de averías, sus revisiones con vencimiento y sus documentos. **Avisa antes de que venza**, que es justo lo que pregunta una inspección.

---

# 20 · FOGÓN

No es un chat pegado al lado. Es **la capa que lee las ocho apps**, y precisamente porque el ecosistema es cerrado puede decir cosas que un asistente suelto no podría.

## Presente en todas las apps, con el contexto de cada una

| Dónde       | Qué dice                                                                   |
| ----------- | -------------------------------------------------------------------------- |
| Inventario  | «El aceite ha subido un 12 %. Afecta a 7 platos y 2 quedan bajo objetivo.» |
| Escandallos | «El coste de esta receta ha subido un 8,2 % desde junio.»                  |
| Carta       | «Este plato vende mucho y tiene uno de los peores márgenes de la carta.»   |
| Equipo      | «El cuadrante actual cuesta un 6,8 % más que la semana pasada.»            |
| Negocio     | «El problema de este mes no son las ventas: es el coste de materia prima.» |

## Qué cruza

- El precio del albarán de ayer con el escandallo de un plato y con sus ventas del mes.
- Las quejas de espera de las reseñas con el cuadrante de los viernes.
- Lo que caduca el jueves con el menú del día que aún no está montado.
- Lo planificado con lo fichado y con las ventas por franja.
- El equilibrio de la carta con lo que cobran los de tu calle.

## Qué puede hacer

Analizar · resumir · comparar · detectar anomalías · predecir · recomendar · rellenar · generar documentos · proponer acciones · preparar horarios · leer albaranes · analizar cierres · analizar cartas · explicar datos.

## Cómo Estook le ahorra trabajo

Cada llamada al modelo cuesta dinero y tarda. La aplicación está construida para que Fogón trabaje lo mínimo, **y eso es también lo que la hace rápida**:

1. **Los números no los calcula la IA.** Coste, margen, food cost, desviación, horas y comparaciones salen de consultas a la base de datos. Fogón recibe el resultado ya hecho y solo lo explica. Es más barato, más rápido y, sobre todo, **no se equivoca**.
2. **Las reglas van en código.** «Bajo mínimo», «caduca en tres días», «plato bajo objetivo», «turno sin cubrir» son condiciones, no opiniones. **Dieciocho de cada veintidós avisos no llaman al modelo y cuestan cero.**
3. **Las fichas técnicas son datos, no texto.** Preguntar «¿cuánto me cuesta la hamburguesa?» no necesita a nadie leyendo una receta.
4. **El contexto va cacheado.** El resumen del local se envía una vez y las siguientes cuestan una décima parte.
5. **Cada tarea, a su modelo.** Redactar o leer un albarán, al económico. El análisis del cierre y las propuestas de precio, al grande.
6. **Lo pesado va en lote y de noche.**
7. **Las respuestas frecuentes se guardan** por local y día.
8. **Las imágenes se reducen antes de enviarse.**
9. **Se pide lo justo.** Fogón nunca recibe una tabla entera: pide el dato concreto.

_Resultado medido: un local de uso normal se queda por debajo de un euro y medio de coste de IA al mes, con Fogón contestando en dos segundos._

## Lo que nunca puede hacer

1. **Guardar sin aprobación.** Propone y rellena; una persona confirma, y queda en auditoría marcado como venido del asistente.
2. **Ver más de lo que ve quien pregunta.** Un cocinero preguntando por márgenes recibe un «eso no lo llevas tú».
3. **Hablar con la base de datos.** Usa un catálogo cerrado de herramientas, cada una con sus permisos.
4. **Recibir una sola clave privada.**
5. **Inventarse una cifra.** Si el dato no está, lo dice.
6. **Ejecutar una operación crítica unilateralmente.** Ni publicar un cuadrante, ni retirar un plato, ni lanzar un pedido.

> Y una regla de seguridad que importa más de lo que parece: **el texto que viene de fuera —reseñas, webs de proveedores, albaranes, notas— se trata como dato, jamás como instrucción.**

## Cómo habla

Español de España, directo, máximo cuatro frases. Al gerente le habla de todo. Al jefe de cocina, de costes de cocina, precios, fichas, mermas y APPCC. Al cocinero, de sus tareas y caducidades, **sin un solo importe**. A sala, del menú, alérgenos y agotados.

**Ejemplos reales:**

- «El rabo de toro te deja un 2 % de margen. Sus ingredientes han subido un 14 % desde marzo.» → _Ver escandallo · Subir precio_
- «Sube el pulpo: la caja entró un 18 % más cara. Para tu 70 %, serían 19,90 €.» → _Aplicar_
- «Quedan 2,1 kg de merluza que caducan el 19 y hoy no está en el menú.» → _Ponerla en el menú_
- «El martes es tu día más flojo desde junio: te sobran dos horas de sala.» → _Abrir cuadrante_
- «Llevas tres mañanas con la cámara de pescado por encima de 4 °C.» → _Ver registros_

**Y por voz.** En cocina, con las manos ocupadas, la voz es la interfaz natural: apuntar una merma, registrar una temperatura, preguntar un gramaje, dejar una incidencia.

---

# 21 · El centro de alertas

Un sistema transversal con una regla que lo distingue de cualquier lista de notificaciones:

> **Una alerta que no se puede accionar no es una alerta: es ruido.**

```
🔔 7

  ● Stock critico
  ● Contrato proximo a vencer
  ● Margen bajo objetivo
  ● APPCC pendiente
  ○ Horario publicado
  ○ Sincronizacion con el TPV completada
```

Cada alerta lleva, sin excepción: **qué ocurre · por qué ocurre · qué impacto tiene · qué acción se recomienda · un botón para actuar.**

Fogón prioriza. Y la regla que impide el ruido: _un aviso cerrado no vuelve hasta que el dato que lo originó cambie; con «ahora no» vuelve en siete días; y nunca hay más de un aviso vivo por causa y producto._

---

# 22 · Los documentos

Un hostelero que consigue en un botón el cuadrante para la pared, la carta bonita para el atril y la carpeta de la inspección lista, **ya no se va**.

- Se generan **desde dentro de cada app**, en la pantalla donde están los datos. No hay una sección de documentos, porque un documento no es un sitio: es una salida.
- Previsualización real antes de generar, y tres acciones: enviar por correo o WhatsApp, imprimir, descargar.
- Dos versiones de cada uno: una completa y una sobria.
- Todos con el logo, el color, la dirección y el CIF del local, **jamás con los nuestros**.
- **Se guarda la receta, no el fichero:** regenerarlo dentro de un año da el mismo documento. Salvo los legales, que se conservan cinco años.
- Cada uno diseñado a medida de su contenido. Nada de una plantilla genérica para todo.

**Documentos inteligentes.** Cuando alguien sube un documento, Fogón lo lee y propone:

```
Subir: contrato_proveedor.pdf

  Fogon extrae
    Proveedor          ·  Fecha de inicio
    Fecha de fin       ·  Condiciones
    Precios            ·  Renovacion

  Y genera aviso: «El contrato vence en 27 dias.»
```

Igual con los albaranes. **Fogón propone la lectura, una persona confirma, y la operación real la ejecuta el dominio.**

_Reglas que no se negocian: ninguna tabla se desborda, la cabecera se repite al partir, «pág. X de Y», legible en blanco y negro, tipografías incrustadas y huella de verificación al pie._

---

# 23 · Chat del equipo

Arriba, junto a la campana. Es la forma oficial de hablar del trabajo, y por eso queda registrado.

Canales por área y directos · menciones que avisan al móvil · fotos y adjuntos con enlace firmado · **tarjetas de contexto**: se comparte un plato, un pedido, una ficha o un aviso y llega como tarjeta enlazada · confirmación de lectura en los mensajes importantes · mensaje fijado como comunicación oficial · buscador · silencio fuera del turno.

**Conectado al contexto.** Un jefe de cocina escribe «se ha terminado el pulpo». Estook puede ofrecer convertirlo en una incidencia, en un agotado, en un aviso a sala o en una tarea.

> **Con acción explícita, siempre.** Escribir un mensaje no marca un plato como agotado. Se ofrece, y alguien pulsa. **Nada de efectos secundarios ocultos.**

**Reglas:** cada uno ve los canales de su rol y sus directos. El gerente ve todos los canales del local, **nunca los directos entre dos empleados**. Al retirar el acceso, la persona deja de escribir y su historial se queda.

---

# 24 · Integraciones

La filosofía no cambia: **API oficial cuando existe, Estook Enlace para Windows, importación manual como último recurso**, con sincronización, idempotencia y estado de conexión a la vista.

Lo que se añade es una sección propia, con estados honestos:

```
🔌 INTEGRACIONES

TPV
  ● Agora        Conectado · ultima sincronizacion hace 4 min
  ○ Glop         Conectar
  ○ Last.app     Conectar
  ○ Revo         Conectar

CONTABILIDAD          DELIVERY           PAGOS      OTROS
  Holded                Glovo              Stripe     Google
  Sage                  Uber Eats
  Contasol              Just Eat
```

> **No se enseña una integración que no existe como conectable real.** Tres estados y ninguno miente: **disponible**, **próximamente**, **manual**.

## Los canales de reparto

Un pedido de una plataforma de reparto es una venta como otra cualquiera, y tiene que entrar por el mismo sitio:

```
Uber Eats ─────┐
               │
Glovo ─────────┤
               ├──→ ADAPTADORES ──→ ESTOOK
Just Eat ──────┤
               │
TPV ───────────┘
```

Cada proveedor tiene su adaptador; **todos transforman a los modelos internos de Estook**. No se crea una estructura de datos paralela: sería una segunda fuente de verdad.

Los pedidos alimentan ventas, inventario, escandallos, carta, analítica, rentabilidad, alertas y Fogón, exactamente igual que los del TPV. Con idempotencia por identificador de pedido, auditoría, reintentos y recuperación ante pérdida de conexión.

Y siempre que la API lo permita, Estook gestiona desde su interfaz el ciclo del pedido: aceptar, rechazar, cancelar o marcar como preparado.

> **Esto no convierte a Estook en un TPV.** El canal de reparto es externo; Estook agrega y analiza. El detalle técnico de cada integración está en el documento de Evolución 1.0.

---

# 25 · La API pública

La API interna ya existe y seguirá siendo la separación entre el frontend y el dominio. A medio plazo se prepara una **API pública** para TPV, ERP, contabilidad, herramientas externas, desarrolladores, agentes de IA y plataformas de reparto.

```
                    ESTOOK API
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
     TPV                ERP             FOGON
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                    DATOS ESTOOK
```

Fogón usa herramientas internas por ese mismo camino, de forma controlada.

Y hay una razón de mercado, no solo técnica: **el TPV líder de España se integra con dos back-office de nuestra categoría.** Quiere integrarse con nosotros, y para eso tiene que haber dónde.

---

# 26 · Ajustes

Apps (encender y apagar partes, con el aviso concreto de qué pasa; se ocultan, no se borran) · Local y marca · **Objetivos** (materia prima, personal y margen por familia: son los que ponen en verde o rojo los semáforos de toda la app) · Mi TPV · **Integraciones** · Organización (locales, áreas, area managers y catálogo maestro, solo con más de un local) · Mi acceso (contraseña, PIN, doble factor, mis dispositivos) · Avisos y contacto · Plan y facturación.

---

# 27 · Interfaz y experiencia

## Lo que no se negocia

1. **Se prueba en móvil real antes de entregar.** Ni un desbordamiento, ni un título cortado.
2. Tablas anchas → tarjetas en móvil.
3. Las cifras no se parten: tipografía tabular.
4. **Toque de 44 px mínimo.** Se usa con prisa y con las manos mojadas.
5. Esquema claro fijo: el modo oscuro del móvil no repinta la app.
6. Estados vacíos con acción y errores en cristiano con botón.
7. **Deshacer siempre, diez segundos**, en todo lo que no tenga consecuencia legal.
8. Cero jerga y cero emojis, salvo los símbolos oficiales de alérgenos.
9. Una acción principal por pantalla. Formularios progresivos.
10. Nada de scroll infinito en el Panel.
11. Cada app con su icono y su acento de color, sobre el mismo fondo.
12. Tamaño de letra en tres pasos: el pase de cocina se lee de lejos.

## El principio que ordena todo lo demás

La aplicación no pregunta «¿qué tabla quieres modificar?». Pregunta **«¿qué quieres hacer?»**.

| Nunca                           | Siempre                      |
| ------------------------------- | ---------------------------- |
| Editar movimiento de inventario | Ajustar lo que hay en cámara |
| Crear entidad turno             | Crear horario                |
| Crear registro de APPCC         | Completar el control de hoy  |

## Velocidad, con números

| Acción                             | Objetivo |
| ---------------------------------- | -------- |
| Abrir una app desde la rueda       | 200 ms   |
| Abrir el Panel con un año de datos | 1 s      |
| Abrir una ficha técnica            | 300 ms   |
| Buscar en el buscador universal    | 150 ms   |
| Generar un PDF de una página       | 2 s      |
| Cargar la carta digital en 4G      | 1 s      |

**Una pantalla que no cumple su presupuesto de velocidad no está terminada.**

> **Sobre el tamaño del paquete.** Se mide en cada cambio y se vigila, pero **ya no es una norma que bloquee**: si una pantalla necesita algo que la hace mejor, entra, con su razón escrita y con el rendimiento comprobado. Lo que el usuario nota es el tiempo, no los kilobytes. Sigue en pie, eso sí, que **ninguna dependencia entra sin justificarse**.

## Las cuatro preguntas

Cada pantalla responde a: **¿dónde estoy? ¿qué puedo hacer? ¿qué necesita mi atención? ¿cuál es el siguiente paso?** Si no las responde, está mal diseñada.

## Salud de los datos

Un indicador con lo que le falta al local para que Estook funcione bien: cuántos platos tienen ficha, cuántos productos tienen precio, cuántos días llevan el APPCC completo, cuántas ventas tienen origen fiable. Convierte una tarea aburrida en un número que sube.

---

# 28 · Reglas de lógica

Detalles pequeños que, mal resueltos, hacen que un hostelero abandone en la primera semana.

- **El stock negativo se permite.** Si el sistema dice que no queda género, deja de creerse el sistema. Se apunta, se marca en rojo y sale en el aviso de la mañana.
- **La comida del personal no es merma**, ni las invitaciones. Van con motivo propio y como partida aparte, o el food cost miente.
- **Al servir, primero lo que caduca antes.**
- **El bajo mínimo sabe qué día reparte tu proveedor.** Avisar el jueves de un pescado que llega los martes no sirve de nada.
- **El menú del día importado del TPV se explota** a los platos que lo componen.
- **Importar dos veces el mismo fichero no cambia nada.**
- **Si sube el IVA, decides tú.** Estook enseña las dos cifras y aplica lo que digas.
- **La misma persona en dos empresas entra con un solo correo.** Invitar a un correo que ya existe añade una membresía, **nunca duplica la persona**.
- Si alguien tiene dos roles sobre el mismo local, **gana el más amplio**.
- **El PIN identifica, no firma.** Lo que tiene consecuencia queda con nombre y hora.
- **La cocina no tiene ordenador.** Las fichas se leen en tablet, y donde no hay tablet se imprimen con QR a la versión viva.
- **Un producto en uso no se borra:** se desactiva y sigue en el histórico.

---

# 29 · Casos límite

| Situación                                              | Qué hace la app                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Se cae el wifi en cocina                               | Fichajes, APPCC y mermas se guardan en el móvil y suben al recuperar señal                     |
| El PC del local está apagado                           | Enlace sube lo pendiente al arrancar. No se pierde una venta                                   |
| El TPV cambia de versión y rompe el fichero            | Enlace avisa, guarda el original y se ofrece el camino manual                                  |
| Llegan ventas de un día ya cerrado                     | Entran en su jornada por fecha de servicio y avisan del ajuste                                 |
| Artículo del TPV sin emparejar                         | Cuenta en dinero, no descuenta género, y sale avisado                                          |
| Dos personas editan la misma ficha                     | Gana quien guarda primero; al segundo se le enseña qué cambió                                  |
| El producto cambia de formato                          | Precio nuevo con su formato; se compara por unidad de uso                                      |
| Pescado a peso variable                                | Se pide en piezas y entra en kilos reales; el coste va por peso real                           |
| Se vende un plato sin ficha                            | Cuenta en dinero, no descuenta género, sale en «sin ficha»                                     |
| Registrar una temperatura de hace tres días            | No se puede. Lo anterior queda `NO REGISTRADO`                                                 |
| Un local del grupo se queda sin gerente                | El area manager asume su Panel: ya lo tenía por alcance                                        |
| Se cambia una receta maestra que un local había tocado | Los obligatorios se actualizan; los desviados reciben aviso                                    |
| Se vende o se cierra un local del grupo                | Se archiva: deja de facturar, queda en lectura, se excluye de las medias                       |
| Un pedido de reparto llega dos veces por webhook       | Se descarta el duplicado por identificador de pedido                                           |
| Impago                                                 | Solo lectura a los 7 días, archivo a los 60. **Nunca se borran datos**                         |
| Baja voluntaria                                        | Exportación completa en un clic y 60 días de lectura                                           |
| Se agota el presupuesto de IA                          | Se aplaza lo automático y se abarata el modelo. **Lo que el usuario pide se responde siempre** |

---

# 30 · La web pública

Separada de la app, con enlace a entrar. Bifurcación en la portada: **tengo un local / tengo varios locales**.

**Camino de local único:** qué es y en qué ayuda → recorrido con capturas reales → **los documentos que genera**, que se pueden abrir y ver (es el bloque que más convierte, porque es lo único tangible) → cómo se conecta con tu TPV → precios → preguntas frecuentes → probar 14 días. Autoservicio de principio a fin.

**Camino de cadena:** página propia con la comparativa entre locales, el catálogo maestro, el rol de area manager y los informes de grupo.

Además: una página por app, una de la carta digital, una de Fogón, una para gestorías, comparativa honesta con el mercado, casos por tipo de local, centro de ayuda público y páginas legales.

**Lo que no lleva:** testimonios inventados, logos de clientes que no existen, contadores falsos ni chat emergente a los tres segundos. Y ningún dato de un restaurante real.

> Y una decisión de tono que la investigación de mercado confirma: **«no cambias de TPV» deja de ser una objeción que se resuelve abajo y pasa a ser un argumento principal, arriba.** Los TPV modernos se integran con back-office como el nuestro; no somos su competencia y no hay que hablar como si lo fuéramos.

---

# 31 · Acceso y prueba

**Un correo, una identidad.** Formulario único con correo y, debajo, contraseña o PIN. Tres formas de entrar por primera vez: registro, invitación, y nada más. **No hay registro abierto.**

Después de entrar, en este orden: se comprueba el estado de la suscripción → si pertenece a varias organizaciones, se elige → si su alcance es organización o área, entra en la vista de cadena → si llega a varios locales, «¿dónde estás hoy?» → si no ha terminado el onboarding, sigue por donde iba.

**Cambiar de local no cierra la sesión:** cambia el contexto, y el color y el logo de la cabecera, para que nadie apunte una merma en el local equivocado.

**La prueba: 14 días, sin tarjeta.** Este producto exige configurar cosas, y pedir la tarjeta en la puerta hunde el número de pruebas. Lo que evita el abuso no es la tarjeta: es el freno y el límite.

Durante la prueba: 10 preguntas a Fogón y 3 documentos al día, 5 albaranes por foto en total, una consulta de competencia, reseñas en solo lectura y sin acceso para la gestoría. **La conexión con el TPV sí entra en la prueba**, porque es justo lo que hay que demostrar. Los avisos de Fogón siguen funcionando, que son los que enganchan y cuestan cero.

Al día 15 sin contratar: **solo lectura, con todo exportable**. A los 60 días, archivo. **Nada se borra nunca**, y pagar lo devuelve todo tal cual.

**Seguridad:** contraseñas con hash moderno, PIN único por local con bloqueo a los cinco intentos, doble factor exigible desde la organización, límites de peticiones, enlaces de fichero firmados y caducos, y auditoría de todo lo que toca dinero, permisos o registros legales. **Nunca vemos ni guardamos datos de tarjeta.**

---

# 32 · Negocio

Estook no toca dinero ni emite facturas, así que su estructura de costes es ligera: unos pocos euros por local y mes.

## Lo que cuesta servir a un local

| Concepto                           | € / local / mes |
| ---------------------------------- | --------------- |
| Inteligencia artificial            | 1,33            |
| Google Places (con caché por zona) | 0,90            |
| Infraestructura                    | 0,55            |
| Conector (mantenimiento repartido) | 0,40            |
| Pasarela de pago                   | 0,84            |
| **Total**                          | **≈ 4,02 €**    |

## Los planes

Tres planes, con una diferencia clara: **el primero es gestión a mano, el segundo lo hace solo, y el tercero es lo mismo para varios locales.**

### ESTOOK ESENCIAL · 49 € por local y mes

Para el bar que quiere controlar su cocina sin cambiar nada más.

Las ocho apps completas · carta digital con QR · documentos sin límite · auditorías con autoevaluación · acceso para la gestoría · **Fogón Esencial**: 300 créditos al mes, con el modelo económico.

Las ventas y el catálogo entran **por fichero**, con la guía de exportación de su TPV.

_Coste para nosotros ≈ 3,90 € · Margen 45,10 € · 92 %_

### ESTOOK PRO · 79 € por local y mes

Para el local que factura de verdad y quiere que Estook trabaje solo. Todo lo de Esencial, y además:

- **Conexión automática con el TPV**, sincronizando cada 15 minutos y al cierre.
- **Canales de reparto conectados**, con su comisión descontada.
- **Fogón Pro**: 1.500 créditos al mes, con el modelo grande. Análisis del cierre cada noche, resumen semanal, propuestas de menú, de precios y de cuadrante.
- **Estook Pulse** con su histórico.
- Previsión de ventas y presupuesto por mes.
- Análisis de equilibrio de carta y comparación con tu zona.
- Reseñas con respuesta propuesta y alertas de competencia.
- Auditorías completas con plantillas propias.
- Soporte prioritario y puesta en marcha remota incluida.

_Coste para nosotros ≈ 7,10 € · Margen 71,90 € · 91 %_

### ESTOOK CADENA · 69 € por local y mes · de 2 a 10 locales

Todo lo de Pro en cada local, y encima la capa que solo necesita un grupo: panel de cadena con gestión por excepción · catálogo maestro con sus tres políticas · áreas y area managers sin límite · auditorías comparadas · informes de grupo · **bolsa común de 1.500 créditos por local** · una sola factura con desglose por local.

_4 locales: 276 €/mes · coste ≈ 28,40 € · margen 247,60 € · 90 %_

**A partir de 11 locales** no hay precio en la web: formulario corto y presupuesto, porque a ese tamaño entran integración con su ERP, informes propios, formación y responsable asignado. Punto de partida orientativo: **desde 59 € por local**.

**PAUSA · 12 € por local y mes.** Para chiringuitos que cierran en invierno o locales en reforma. Solo lectura, datos conservados y exportables.

**Anual:** dos meses gratis pagando por adelantado. Esencial 490 € · Pro 790 € · Cadena 690 € por local.

## Los créditos de Fogón

La IA es el único coste que crece con el uso, así que se mide y se enseña. **Lo que no cuesta, no consume.**

**Lo que no gasta un solo crédito:** los avisos automáticos del Panel, las alertas de bajo mínimo y caducidad, los semáforos, los cálculos de coste y margen, la desviación, Pulse y los informes. **Dieciocho de cada veintidós avisos son gratis, y son los que enganchan.**

| Acción                                 | Créditos |
| -------------------------------------- | -------- |
| Preguntar algo a Fogón                 | 1        |
| Respuesta propuesta a una reseña       | 1        |
| Traducir una ficha técnica             | 2        |
| Leer un albarán por foto               | 3        |
| Análisis del cierre del día            | 5        |
| Propuesta de menú del día              | 5        |
| Propuesta de precios o de cuadrante    | 5        |
| Resumen semanal del negocio            | 8        |
| Importar un listado o una carta entera | 10       |

**Cuando se acaban.** Al 80 % se avisa. Al llegar al tope, **todo lo que no cuesta sigue funcionando igual**. Solo se pausa lo que llama al modelo.

**Ampliar créditos**, sin cambiar de plan: 500 por 9 € · 1.500 por 22 € · 5.000 por 59 €. Los del plan se renuevan cada mes y no se acumulan; los comprados duran doce meses.

---

# 33 · Dónde estamos frente al mercado

_Investigado en septiembre de 2026._

## Hay dos categorías, y no somos la que parece

**Los TPV cobran.** No son nuestra competencia: son nuestro conector.

| Producto   | Precio al mes                       |
| ---------- | ----------------------------------- |
| Glop       | desde 20 € (o pago único 130-290 €) |
| Ágora      | 32-40 € + módulos                   |
| Camarero10 | desde 39,90 €                       |
| Last.app   | 45-160 €                            |
| Revo XEF   | 50-70 €                             |
| Square     | gratis + 1,15 % por transacción     |

**La gestión de cocina y back-office es lo nuestro.**

| Producto            | Precio                             | Qué es                                                     |
| ------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Yurest · Cuiner     | desde 40 €                         | TPV o personal, alcance corto                              |
| **Estook Esencial** | **49 €**                           | Gestión completa con IA                                    |
| ia.rest             | 59 €/local                         | TPV con IA                                                 |
| **Estook Pro**      | **79 €**                           | Todo automatizado con IA potente                           |
| Gstock ONE          | ~82 € · **no publica precio**      | El comparable directo, sin carta, calendario ni auditorías |
| Gstock Premium      | ~124 € · **no publica precio**     | Informes y analítica de proveedores                        |
| Apicbase            | ~160-249 € · **no publica precio** | Internacional, para grupos y cocinas centrales             |
| MarketMan           | ~220 € / local                     | Internacional                                              |
| Mapal · Easilys     | a medida                           | Colectividades y compra centralizada                       |

## Los cinco hallazgos que deciden cosas

**1 · Los dos competidores directos esconden el precio.** Gstock manda a «solicitar tarifas»; Apicbase tampoco publica. Para un bar de veinte mesas, pedir presupuesto es una barrera. **Nosotros publicamos el precio, y eso cuesta cero construirlo.**

**2 · Somos entre tres y cinco veces más baratos que el comparable internacional**, con un margen del 90 %. No hay que bajar el precio: hay que **decir el del comparable**, porque nos favorece.

**3 · Last.app se integra con Apicbase y con Gstock.** Un TPV moderno quiere un back-office conectado, no construirlo. De ahí salen dos decisiones: **la API pública sube de prioridad**, y en la web dejamos de hablar de los TPV como rivales.

**4 · La IA de la competencia se queda en previsión de demanda.** Apicbase predice qué pedir. Es útil, y es todo. **Nadie explica por qué ha caído un margen, ni cruza las quejas de las reseñas con el cuadrante, ni encadena una subida de precio hasta la alerta.** Ahí está Fogón, y ahí está el producto.

**5 · El moat de Last.app son 250 integraciones.** En su categoría gana quien se conecta con todo. Asumimos que en la nuestra pasa igual: **las integraciones son producto, no un apaño.**

> La posición no cambia y la investigación la confirma: **no somos los más baratos, somos los que hacen más**, y encima somos los únicos que dicen lo que cuestan.

## Cuando un pago falla

```
dia 0   rechazado → correo y aviso en la app. Nada se bloquea
dia 1   reintento automatico
dia 3   reintento + correo + aviso mas visible
dia 5   reintento
dia 7   SOLO LECTURA. Se puede mirar, exportar y sacar documentos
dia 60  cuenta archivada, datos conservados 12 meses
```

**Nada se borra en ningún momento**, y pagar lo devuelve todo tal cual.

## Punto de equilibrio

_Costes fijos estimados: 600 €/mes._

| Clientes                         | Ingreso  | Margen bruto | Resultado |
| -------------------------------- | -------- | ------------ | --------- |
| 10 Esencial                      | 490 €    | 451 €        | −149 €    |
| 15 mixtos (9 Esencial + 6 Pro)   | 915 €    | 838 €        | +238 €    |
| 50 mixtos (30 Esencial + 20 Pro) | 3.050 €  | 2.795 €      | +2.195 €  |
| 200 mixtos                       | 12.200 € | 11.180 €     | +10.580 € |

**Con quince locales de pago, el proyecto se sostiene solo. Con cincuenta, es un sueldo. Con doscientos, es una empresa.**

## Los frenos

Topes técnicos en el código: Google Places 0,10 €/día con corte duro · correos 30/día · almacenamiento 2 GB · 12 consultas al modelo por persona cada 10 minutos.

**La regla de degradación:** primero se aplaza lo automático, después se abarata el modelo, después se recorta el contexto, y lo último que se toca es lo que el usuario ha pedido activamente. **Nada crítico depende del presupuesto:** generar un PDF, fichar, registrar el APPCC o recibir un pedido funcionan siempre.

---

# 34 · Riesgos

| Riesgo                                                     | Cómo se cubre                                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Un TPV cambia su formato y rompe el conector               | Enlace guarda el fichero original, avisa y deja el camino manual                    |
| Un fabricante de TPV no quiere que nos conectemos          | Por eso Enlace lee carpetas y no bases de datos. Y por eso hay tres vías            |
| El cliente no consigue las credenciales de su TPV          | Se las pedimos nosotros por él en la puesta en marcha                               |
| Una plataforma de reparto cambia su API o revoca el acceso | Cada canal es un adaptador aparte. Si cae, el resto sigue                           |
| Un cliente ve datos de otro                                | Aislamiento en tres capas y prueba automática permanente                            |
| Fogón dice una cifra inventada                             | Los números los calcula la base. Pruebas de regresión sobre respuestas              |
| El proveedor de IA sube precios o cierra                   | La IA vive detrás de una interfaz propia: cambiar de modelo es cambiar un adaptador |
| Google cambia condiciones de Places                        | Reseñas y Competencia están aisladas. Si caen, el resto va igual                    |
| Se pierde la base de datos                                 | Copia diaria con 30 días y prueba de restauración trimestral                        |
| El proyecto se vuelve inmantenible                         | Arquitectura escrita antes de programar y pruebas obligatorias por módulo           |

---

# 35 · Lo que Estook no hace

No cobra. No emite facturas. No lleva la caja. No imprime comandas. No gestiona mesas ni reservas. **No sustituye al TPV: se conecta a él.** No hace nóminas ni contratos. No lleva la contabilidad. No guarda datos personales de clientes finales. No responde reseñas por su cuenta: las escribe para que las mandes tú. Y Fogón no ejecuta nada crítico por su cuenta.

Y no promete adivinar el futuro. **Enseña lo que pasa, con la fuente al lado, y propone lo que haría un buen jefe de cocina con esos datos delante.**
