# ESTADO DEL PROYECTO

Última actualización: 12 de septiembre de 2026 · **M7: fusionadas la #44, la #45 y la #46. `estook.com` ya pinta. Ahora, el repaso de las bases: lo que sale de cámara dice si se vendió, y la ficha se lee**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> Aquí está lo que hace falta para trabajar hoy. **Lo que hizo cada módulo, con sus
> fallos y sus porqués, está entero en
> [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)**, y las
> razones de fondo, en [`docs/decisiones/`](docs/decisiones/).

---

## 1 · Dónde estamos

|                |                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0** a **M6½** ✓ · **M7, entregas 1 y 4** ✓ (#44, #45, #46): compras, el Calendario, el repaso de Richi y el dominio                |
| **Ahora**      | **El repaso de las bases** (rama `m7-las-bases`, sin fusionar): vender no es gastar, la ficha se lee, y las listas largas se recorren |
| **Pruebas**    | 945 unitarias y de base de datos · 347 de pantalla en escritorio y móvil, en verde · catálogo **103 de 109** (94 %)                   |
| **Rama**       | `m7-las-bases`, con su pull request. La `estook-com` se fusionó en la #46                                                             |
| **Base**       | En el código, **34** migraciones y 51 tablas: la `0034` solo añade columnas y un valor al catálogo de movimientos                     |
| **API**        | **Hay que volver a desplegarla** con esta entrega: `apuntar_salida` cambia y el cierre propone lo vendido                             |
| **Entrar**     | La cuenta de Ricardo, con su negocio (`ikatz`). Ninguna cuenta de ejemplo puede entrar                                                |
| **Dirección**  | **Evolución de producto 1.0**: de aplicación de gestión a sistema operativo del local                                                 |

> **Lo de ahora:** `estook.com` funciona. Lo que falta es fusionar el repaso de las
> bases, aplicar la `0034` y volver a desplegar la API. Los pasos, en
> **[`docs/pasos-para-cerrar-m7.md`](docs/pasos-para-cerrar-m7.md)**.

---

## 0 · Los cinco documentos maestros

Viven en [`docs/maestros/`](docs/maestros/) en Markdown; el PDF sale con
`pnpm maestros`. Se leen en este orden:

| Documento                                                                | Qué responde                       | Cuándo se lee            |
| ------------------------------------------------------------------------ | ---------------------------------- | ------------------------ |
| [Evolución 1.0](docs/maestros/Estook-Evolucion-1.0.md)                   | Hacia dónde va y en qué orden      | **Primero, siempre**     |
| [Manifiesto](docs/maestros/Estook-Manifiesto.md)                         | Qué es el producto y cuánto cuesta | Antes de diseñar         |
| [Plan de desarrollo](docs/maestros/Estook-Plan-de-Desarrollo.md)         | Cómo se construye y con qué reglas | Antes de escribir código |
| [Roles y administración](docs/maestros/Estook-Roles-y-Administracion.md) | Qué ve exactamente cada persona    | Antes de tocar permisos  |
| [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)       | Qué desencadena cada cambio        | Antes de cerrar módulo   |

**Si dos parecen decir cosas distintas, manda el más específico.** Si de verdad se
contradicen, se para y se pregunta (regla 13). Y si uno se queda corto frente a lo
que el producto necesita, se propone lo mejor y **se cambia el documento**, con su
decisión escrita: un maestro no frena el producto.

Lo que cambió con la **Evolución 1.0**: el tamaño del paquete se mide y no bloquea
(bloquea la velocidad); cada módulo nace con su capa inteligente dentro; y nada
entra aislado (regla 14: qué datos usa, quién se entera, qué automatiza Fogón y
qué aprueba una persona).

---

## 2 · Qué hay que hacer

### Ahora mismo · es de Richi

Todo en [`docs/pasos-para-cerrar-m7.md`](docs/pasos-para-cerrar-m7.md), en orden:

1. **Fusionar** el pull request de `m7-las-bases`. Al fusionar se publica solo.
2. **`bd:migrar`** y **`bd:comprobar`**: 34 de 34 y 51 tablas.
3. **Desplegar la API** (Actions → Desplegar la API → `desplegar`), que lleva el
   `apuntar_salida` nuevo y lo que propone la caja.
4. **Quitarles el IVA a sus precios, una vez**, si no está hecho: Ajustes → «Tus
   precios de compra». Antes de meter precios nuevos.
5. **Mirarlo en el TPV y en el móvil**, con la lista del paso 5.
6. **Los cuatro accesos que faltan** —Places, Business Profile, Resend y el de IA—,
   con su tope de gasto puesto. **No frenan nada de lo que hay**: cada uno lo
   estrena su entrega ([`config/claves.md`](config/claves.md)).

### Lo que Richi confirmó el 11 de septiembre

1. **Sus precios llevan IVA**, y quería poder elegir: hecho, [0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md).
2. **Mandan pedidos** jefe de cocina, gerente y manager; y los jefes pueden invitar a
   alguien a rellenar un pedido, que luego mandan ellos: **entrega 2**.
3. **El pedido no sale solo**: se queda así.
4. **El precio nuevo vale desde hoy**, y los de antes se comparan: la gráfica de la ficha.

### Las entregas del repaso

| Entrega | Qué                                                                                                           | Cómo está               |
| ------- | ------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **1**   | Quitar y congelar lotes, dos decimales, el alta por cómo se compra, IVA, gráfica, widgets, salario, jerarquía | **Fusionada** (#45)     |
| **1½**  | **Las bases**: vender no es gastar, la ficha se lee, las listas largas se recorren, y vuelve el deshacer      | **Hecha, sin fusionar** |
| **2**   | Avisos a jefes y gerentes de lo que hace su equipo, una vez; invitar a rellenar un pedido                     | La siguiente            |
| **3**   | **Horarios**, una app entera en Equipo: cuadrante, historial, horas, avisos, PDF con logo                     | Después                 |
| **4**   | El dominio **`estook.com`**: el sitio ya vive ahí                                                             | **Fusionada** (#46)     |
| **5**   | Los topes de Google por local, y conectar Places, Business Profile y el modelo de IA                          | Espera los accesos      |

### La entrega 1½ · las bases, punto por punto

Son los ocho que trajo Richi mirando la aplicación en su TPV, en su orden:

| Lo que dijo                                          | Qué se ha hecho                                                                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| «La merma me busca en el catálogo de ejemplo»        | Ya no: la búsqueda de merma solo trae género de verdad                                                                                              |
| «Que quede claro si se ha vendido, y cuánto»         | Tres familias al sacar género, y lo vendido se apunta con lo que se cobró ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)) |
| «¿Se suma a ganancias?»                              | Sí, **en la caja del día**: sale propuesto al cerrarla, y por eso no se cuenta dos veces                                                            |
| «El tag naranja de "sin verificar" no sé quitarlo»   | Se iba y volvía solo: era un fallo del servidor. Ahora es el aprovechamiento, en su ficha y con «Lo he medido»                                      |
| «La tarjeta de producto es demasiado sencilla»       | Cada sección es una tarjeta con su título y sus botones; y una nueva, «Lo que deja», con el margen                                                  |
| «Si hay listas enormes, ver más y buscar por tiempo» | El libro y las mermas van por tramos —mes, trimestre, semestre, año—, buscan en el servidor y traen más                                             |
| «El deshacer ha desaparecido»                        | Vuelve donde se edita algo que importa: la ficha, el precio de compra y el de venta                                                                 |
| «Si ves mejoras, aplícalas»                          | Cuatro fallos encontrados de paso, abajo                                                                                                            |

**Lo que se encontró de paso, y era de antes:**

1. **«Sin verificar» se volvía a poner solo.** El servidor guardaba
   `sin_verificar = !cambiaElCoste`: corregir una errata en el nombre marcaba el
   producto como sin medir. Por eso la etiqueta salía en todos y no se podía quitar.
2. **La vista «Mermas» del libro estaba rota.** La barra mandaba `tipo=merma` y la
   consulta solo aceptaba entrada, salida y ajuste: contestaba «datos no válidos».
   Llevaba así desde M6½.
3. **El buscador del libro mentía.** Filtraba las cien líneas ya traídas, así que
   buscar algo de hace tres meses contestaba «nada con eso». Es el mismo fallo que
   ya costó las vistas de Productos.
4. **Cambiar el envase daba el aprovechamiento por medido.** Son dos datos que se
   multiplican en la misma fórmula, y darlos por medidos juntos vaciaba de
   significado la marca.

### Lo que deja preparado, y dónde se termina

| Qué                                                                        | Dónde se termina | Qué hay ya                                               |
| -------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| El reloj y el local en Google                                              | **Entrega 5**    | Decidido en 0016 y 0030; espera los accesos de Google    |
| Las pantallas del Calendario, los avisos con roles y los turnos            | **M14**          | La tabla, su seguridad por roles y «Lo que viene»        |
| Recalcular los platos de los días que la factura corrigió                  | **M9**           | Lo cobrado, guardado en cada línea del albarán con fecha |
| El pedido en PDF con el logo                                               | **M11**          | «Imprimir», que da el PDF sin membrete                   |
| El precio pactado para toda una cadena                                     | **M24**          | Lo pactado por local, con su aviso en la puerta          |
| Leer el albarán de una foto                                                | **M22**          | La recepción línea a línea, que es donde entrará         |
| Avisos «mañana entras a las 9» y «entras en 5 minutos, ficha ya», por push | **M25**          | El horario de siempre; el widget ya lo dice              |
| El recuento, la desviación y la calibración del aprovechamiento            | **M8**           | La merma con motivo; los albaranes y sus incidencias     |
| Descontar lo vendido del inventario                                        | **M20**          | El cierre guarda los platos con el nombre normalizado    |

### Lo que sigue sin decidirse · es de Richi

1. **El chat de Estook.** «Mandar el horario al chat, a un grupo o a una persona»
   necesita un chat dentro de Estook, que no existe. ¿Se construye con Horarios o va
   aparte? Hasta decidirlo, el horario se comparte en PDF.
2. **Si Fogón habla antes de M22.** Tiene su sitio y su contexto; le falta la voz,
   que necesita elegir modelo, presupuesto diario por local y caché.
3. **Si se quitan de la API `mis_locales`, `mis_permisos` y `un_local`**, que
   `quien_soy` dejó sin trabajo en M4.

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No existe un dato único:
dependen del bien y de la operación. Cuando aparezcan se añaden como filas; hasta
entonces el motor dice «sin regla» y para ([0006](docs/decisiones/0006-el-motor-fiscal.md)).
Por lo mismo, **en Canarias, Ceuta y Melilla no se propone IVA de compra** (0033).

### Sin prisa

| Qué                                                                   | Cuándo                                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes                                                       |
| Regenerar las claves de Google, que pasaron por un chat               | M27                                                                     |
| Volver a `BrowserRouter`: ya hay dominio y Pages copia el `404.html`  | cuando toque ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)) |
| El vectorial del logotipo y de Fogón                                  | cuando aparezcan; se sustituyen en un sitio                             |
| Pasar Pedidos, Albaranes y Facturas a `usarListaLarga`                | cuando una de las tres crezca                                           |

Lo último no es un fallo hoy: esas tres traen más pidiendo la lista otra vez con un
tope mayor, y **no tienen buscador**, así que no engañan a nadie —que era lo que sí
hacía el libro—. Cuando un local lleve un año de albaranes, el tramo de tiempo y el
«Ver más» por páginas ya están escritos y es cambiar el gancho.

---

## 3 · Lo que está vivo

**Web:** https://estook.com · `/app/` · `/carta/` · `/admin/` (el catálogo del
sistema de diseño está en `/admin/`). El DNS lo lleva Hostinger: cuatro registros
A a GitHub Pages y `www` por CNAME. La dirección vieja redirige sola
([0036](docs/decisiones/0036-la-direccion-es-estook-com.md)).

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito, por el agrupador de sesión (la conexión directa de los proyectos nuevos
solo va por IPv6). Todas las tablas con seguridad por filas; la única vista es
`estook.existencias`. **Con la `0034`, 34 migraciones y 51 tablas**: la `0034` no
crea ninguna tabla, añade tres columnas y el valor `venta` al catálogo de
movimientos. Se comprueba con `.\estook.cmd bd:comprobar`, que lo lee de la base y
no de aquí.

**Organizaciones:** `bar-centro`, `casa-lola` y `grupo-costa` son semillas de
ejemplo, **con las cuentas cerradas desde el 3 de septiembre** —tenían una
contraseña publicada en este repositorio—. **`ikatz` es el negocio de verdad**.

**Errores:** `estook-app` en Sentry, solo «Error monitoring», con el repositorio
enlazado. **Variables** del repositorio: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`; en
Secrets, `TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. Todo en
[`config/claves.md`](config/claves.md).

**El peso**, medido con `pnpm tamano` el 12 de septiembre:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | **268,4 KB** | 106,1 KB                 |
| `admin`         | 186,5 KB     | 106,1 KB                 |
| `web` · `carta` | 165,9 KB     | 106,1 KB                 |

La referencia es 250 y **se mide, no bloquea**. Las bases suben `app` 1,8 KB: el
catálogo de porqués, el margen y el tramo de las listas largas son texto y una
resta. Antes, el repaso había subido 6,1 KB: el
alta por cómo se compra, el precio con IVA, los lotes y la gráfica de precios van
con el resto de Inventario, y la tarjeta del IVA con Ajustes. **Compras entera y
Recharts se siguen cargando aparte.**

---

## 4 · Qué hizo cada módulo

En una línea. **El detalle está en
[`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md).**

| Módulo  | Qué dejó                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------ |
| **M0**  | Monorepo, reglas, integración continua con el candado de `main`, publicación en GitHub Pages     |
| **M1**  | Alcances, roles y permisos en la base, con seguridad por filas en cada tabla                     |
| **M2**  | La API (Hono), el despachador de comandos y consultas, los motores de dinero, fechas e impuestos |
| **M3**  | El sistema de diseño, el esqueleto de las ocho apps, la rueda y el buscador universal            |
| **M4**  | El login propio, PIN, segundo factor, sesiones y el primer despliegue de verdad                  |
| **M5**  | El alta en ocho pasos, el catálogo de referencia, los ejemplos y el modo demostración            |
| **M6**  | Inventario: productos, el libro de movimientos, precio medio ponderado, lotes, previsión         |
| **M6½** | La capa de producto: destinos y vistas, Panel en el servidor, merma, fichajes, caja y equipo     |
| **M7**  | Las compras enteras y el Calendario (#44); el repaso de lo que vio Richi, y las bases            |

### M7 · el repaso, primera entrega

- **Un lote que caduca se quita**, desde «Hoy» y desde la ficha: gastado, o tirado
  —y entonces es merma por caducado—. **Lo congelado se ve**, con su fecha, su
  etiqueta y la vista **Productos · Congelados**.
- **El alta pregunta cómo se compra** —por peso, por litros o por unidades— y la
  cuenta sale sola, con el precio que se tenga a mano ([0035](docs/decisiones/0035-el-alta-pregunta-como-se-compra.md)).
  **Dos decimales siempre**, cambiando de unidad en vez de añadir ceros.
- **El IVA**: se guarda sin él, cada campo lo deja escribir con o sin, y a los
  precios de antes se les quita una vez ([0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)).
  Y **los precios de antes, en una gráfica** por proveedor.
- **El catálogo de widgets enseña todos**, con «En tu panel» en los puestos.
- **Nadie gestiona a su igual** ([0034](docs/decisiones/0034-nadie-gestiona-a-su-igual.md)).

**Lo que se encontró:** cambiar el salario **dos veces el mismo día** rompía la
restricción `hasta >= desde` de la vigencia y salía «se nos ha roto algo por
dentro». Ahora el cambio del mismo día corrige la fila de hoy, con su prueba.

### M7 · las bases, antes de seguir

- **Vender deja de ser lo mismo que gastar.** Al sacar género se elige entre tres
  familias —se vende, se usa, no se aprovecha—, y lo vendido se apunta **con lo que
  se ha cobrado** ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)).
  Ese dinero **no suma solo**: sale propuesto al cerrar la caja del día, que es su
  único dueño, y así el día no se cuenta dos veces.
- **A cuánto lo vendes, y lo que te deja.** Un precio de venta en la ficha, con IVA
  —el de la pizarra—, y debajo lo que entra sin impuesto, lo que cuesta y lo que
  queda, con aviso si el género se lleva más de un tercio.
- **La ficha se lee.** Cada sección es una tarjeta con su título y sus botones, con
  la categoría, el proveedor y el envase arriba, y una barra del mínimo.
- **El aprovechamiento, en su sitio y con su botón.** La etiqueta «sin verificar»
  se va de la lista: **volvía sola** cada vez que se guardaba la ficha —un fallo del
  servidor— y salía en todos los productos.
- **Las listas largas se recorren.** El libro y las mermas van por tramos de tiempo,
  buscan en el servidor y traen más de tanto en tanto.
- **Vuelve el deshacer** en lo que se edita y se puede volver a editar: la ficha, el
  precio de compra y el de venta.
- **La merma solo busca en tu género**, no en el catálogo de ejemplo.

**Lo que se encontró:** cuatro fallos de antes. «Sin verificar» se volvía a poner
sola al guardar la ficha; la vista **Mermas** del libro contestaba «datos no
válidos» desde M6½; el buscador del libro filtraba solo lo ya traído; y **la barra
de deshacer no se podía pulsar con una hoja abierta** —un `<dialog>` modal vive en
la capa superior del navegador— que es justo cuando hace falta.

---

## 5 · Cómo trabajamos

**Los comandos, con `.\estook.cmd`**, uno por recuadro: PowerShell no entiende
`&&`, y una ventana abierta antes de instalar `pnpm` no lo encuentra.

1. **Primero fusionar, después aplicar a Supabase.** La base nunca va por delante
   del código.
2. **«Terminado» solo si no quedan preguntas abiertas.**
3. **Una rama por entrega, y un pull request.** Nada entra en `main` sin él.
4. **Ante la duda, preguntar**, y preguntar explicado.
5. **Revisar lo propio antes de entregarlo**, y que esto no afirme nada falso.
6. **Un repaso después de fusionar vale la pena**: casi todos los fallos que
   quedaban eran algo construido y probado al que no llegaba nadie desde la pantalla.
7. **Si se toca una pantalla, `prueba:e2e:completa`.** `prueba:e2e` a secas prueba
   lo ya construido.
8. **Si el rojo es del servidor, mirar el puerto 5177**: Playwright reutiliza una
   API de pruebas viva con el código viejo.
9. **Una lección se convierte en prueba.** Escrita en un documento no impide nada.
10. **Una consulta que ninguna prueba llama es una consulta rota que aún no se sabe
    que lo está.** `pnpm cobertura` lo mide corriendo.
11. **Una excepción con una razón bonita sigue siendo un agujero.** Las listas de
    deuda sirven para no olvidar, no para justificar.
12. **Lo que no se mide, no está probado.** Contar nombres con `grep` no mide nada.
13. **Antes de mandar a alguien a hacer algo, comprobar que no está hecho ya.**
14. **`toBeVisible()` no ve el recorte.** Para saber si algo se ve, se pregunta al
    navegador qué hay en ese punto (`seVeDeVerdad`).
15. **Una prueba que compara el código con una copia del documento no compara
    nada.** `apps.prueba.ts` lee la tabla B5 del Plan.
16. **Un dato con dos dueños acaba con dos valores**, aunque sea una frase.
17. **Un andamio de pruebas no va en una pantalla de verdad.**
18. **Lo que toca un estado compartido, en un bloque, de una en una**, y ningún
    otro fichero tocándolo. **Y en un solo navegador de móvil**: el móvil pequeño y
    Safari comparten el Panel del móvil, y en la integración continua corren a la
    vez. Y no vale buscar «una cuenta que no toca nadie»: se probó con Luis, y otra
    prueba le añadía un segundo local. **Lo que cambia un ajuste del local, en un
    local nuevo** (la prueba del IVA crea el suyo).
19. **Guardar tarde es perder.** El retraso solo donde hay ráfaga; lo pendiente se
    manda al irse.
20. **Una sola cosa pinta la pantalla**: lo que se guarda se escribe en la caché.
21. **Se arregla lo que se ha visto**, no lo que uno deduce. Antes de quitar de
    más, se pregunta.
22. **Lo que salió en un iPhone se prueba con `CON_WEBKIT=1`.**
23. **Una prueba hace lo que hace una persona**: tocar algo e irse.
24. **Un rojo que no habla de lo probado casi nunca es del producto**: primero,
    quién sirve las pruebas.
25. **Una comprobación que hace dos cosas sin decirlo se lleva la segunda por
    delante.** Se escriben aparte.
26. **Lo que protege el dato y lo que lo enseña son dos capas**, y se prueban las dos.
27. **Una prueba nueva hay que verla fallar** con el arreglo quitado.
28. **El texto se escribe cuando el comportamiento existe.** Mientras, se dice lo
    que pasa.
29. **Cumplir el contraste no hace una buena pantalla**: se mira en el aparato.
30. **Un color que alguien elige se ajusta y se pinta**, y se le dice.
31. **Lo que una aplicación no elige, no se elige por ella.**
32. **Un tema se hace en las fichas, nunca en las pantallas.**
33. **Un permiso sin pantalla es una promesa rota.** Merma y fichar llevaban desde M1
    en la matriz sin dónde hacerse.
34. **Guardar sin decir que ha fallado es peor que no guardar.**
35. **Se prueba con el rol más pequeño que puede hacerlo.** La merma de la camarera
    solo falló entrando como ella.
36. **Una restricción de la base se prueba con el caso normal, no solo con el
    malo.** «Toda salida dice dónde» era correcta y dejaba sin cerrar el turno que
    alguien olvidó, que es lo más normal de corregir.
37. **Después de desplegar, se mira la base de verdad.** Cero paneles guardados en
    producción con todo en verde: el conductor de las pruebas no es el de
    producción. Lo que dependa del conductor se escribe para que dé igual
    (`::text::jsonb`), y `bd:comprobar-api` lo mira en Supabase.
38. **Las listas a Postgres, como texto** (`comoLista` y `::text::tipo[]`), por lo
    mismo que el JSON: una lista vacía de un tipo enumerado llegaba como `''`.
39. **Una consulta pide «ver»; un comando, «editar».** Y **el recorte de un local
    manda** sobre el permiso de la organización. Lo prueba `leer-con-ver.prueba.ts`.
40. **Una ficha que se abre desde varios sitios vive en la dirección** (`?pedido=`),
    no en un estado: así la abre el Panel, «Hoy» o el Calendario sin conocerse.
41. **Un precio de compra se escribe con o sin IVA, y se guarda sin él** (0033).
    Cada campo lo dice, con su tipo y la otra cifra calculada.
42. **Una vigencia se prueba con dos cambios el mismo día.** El salario fallaba solo
    la segunda vez, que es la de corregir una errata.
43. **Un catálogo que solo enseña lo que falta hace creer que lo quitado se pierde.**
    Se enseña todo, y lo puesto lo dice.
44. **Un permiso dice qué; la amplitud del rol, a quién** (0034).
45. **Un precio se lee con dos decimales.** Si no llega, se cambia de unidad; las
    cuentas siguen en milésimas.
46. **`current_date` es UTC, y no es «hoy».** La fecha la pone el servidor con la
    zona y la hora de corte del local (`jornadaDe`, regla 10). Lo cazó una prueba
    corriendo a las 00:30: lo congelado quedaba fechado el día anterior.
47. **La dirección del producto va en el código** ([0036](docs/decisiones/0036-la-direccion-es-estook-com.md)).
    Estrenar `estook.com` dejó la app en blanco porque la raíz y los orígenes vivían
    en variables y secretos que había que acordarse de cambiar.
48. **Dos cosas en el mismo botón es no preguntar nada.** «Gastado o vendido» hacía
    imposible saber si por lo que salió entró dinero, que es de lo que cuelga el
    margen entero ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)).
49. **El dinero de un día tiene un solo dueño.** Si una salida de cámara sumara a las
    ganancias y además se metiera el papel de la caja, el día valdría el doble y no
    se vería: el total del mes saldría mal y todo lo demás parecería correcto.
50. **Una marca que sale en todos no marca nada.** «Sin verificar» se volvía a poner
    sola al guardar la ficha, salía en naranja en toda la lista y no se podía quitar
    desde ninguna parte. Un dato que no se puede corregir desde donde se lee es un
    dato que nadie corrige.
51. **Un filtro que solo funciona cuando la lista cabe entera es un filtro que
    miente.** Ya costó las vistas de Productos, y el libro de movimientos seguía
    buscando dentro de las cien líneas traídas. Toda lista que crece a diario va con
    su tramo de tiempo, su búsqueda en el servidor y su «Ver más».
52. **Restar el precio de carta menos el coste es regalarse el IVA como margen.** El
    de venta se ingresa y el de compra se recupera: la resta se hace con las dos
    cifras sin impuesto, y por eso la hace el dominio y no la pantalla.

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/), una por fichero:

| Núm      | Qué                                                                      |
| -------- | ------------------------------------------------------------------------ |
| **0001** | GitHub Pages en vez de Netlify                                           |
| **0002** | La API en Hono sobre Supabase Edge Functions                             |
| **0003** | M0 crea el esqueleto mínimo de alcances                                  |
| **0004** | El presupuesto de velocidad de B7, reconstruido                          |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción        |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                        |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta        |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages        |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`         |
| **0010** | El login es nuestro, no de Supabase Auth                                 |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad               |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                      |
| **0013** | Google Places se aplaza a M23                                            |
| **0014** | Un módulo reacciona a otro en la misma transacción                       |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app              |
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta con Google       |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push                    |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                       |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato          |
| **0020** | Un catálogo de acciones, y una acción es una dirección                   |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha          |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero          |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor        |
| **0024** | El color del local pinta la app, y hay dos temas                         |
| **0025** | Fichar pide dónde, y no bloquea nunca                                    |
| **0026** | La merma tiene motivo y partida, y la apunta quien la rompe              |
| **0027** | La caja se cierra sin TPV, y los dos caminos acaban en el mismo          |
| **0028** | El alta de producto pregunta cuánto hay, no cuánto se aprovecha          |
| **0029** | Lo que va a una columna JSON viaja como texto                            |
| **0030** | El local se sitúa con Google, al final de M7, con tope de gasto          |
| **0031** | El Calendario recoge lo de todos los módulos, con quién lo ve            |
| **0032** | Las compras: Estook no manda, el albarán mueve y la factura confirma     |
| **0033** | **Los precios de compra se guardan sin IVA, y se escriben como venga**   |
| **0034** | **Nadie gestiona el acceso de su igual: lo hace quien está por encima**  |
| **0035** | **El alta pregunta cómo se compra, y la cuenta la hace el dominio**      |
| **0036** | **La dirección es `estook.com`, y la sabe el código**                    |
| **0037** | **Lo que sale de cámara dice si se vendió; el dinero lo cuenta la caja** |

Otras, sin fichero propio:

- **La matriz de permisos vive solo en la base.** Una prueba cuadra los dos catálogos.
- **Las funciones de visibilidad son `security definer`**, o `membresia` entra en
  recursión consigo misma. No se usa `force row level security`: rompería las semillas.
- **Sesión y correlación son cosas distintas**: una visita y una acción dentro de ella.
- **Los ganchos de React se llaman en español** (`usar…`) y viven en `ganchos/`.
- **El token va en `Authorization: Bearer`**, no en una cookie: la aplicación y la
  API viven en dominios distintos.
- **Dependencias nuevas justificadas:** `@electric-sql/pglite`, solo de desarrollo.
  Contraseñas, segundo factor y tokens van con `crypto.subtle`.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/migrar.mjs` ·
  `.dependency-cruiser.cjs` · las reglas 9 y 10 de `eslint.config.js` ·
  `herramientas/comprueba-publicacion.mjs`.
- **Las fichas de diseño** (`packages/ui/estilos/fichas.css`), que son B1.
- **Los ficheros generados**: `packages/iconos/src/generados.tsx`,
  `packages/ui/fuentes/` y los PNG de `packages/ui/marca/`.
- **Las migraciones `0001` a `0034`.** Se amplían con una `0035`, nunca se editan
  (regla 2). Y al ampliar una función SQL, **se copia la original entera**.
- **Un valor de un tipo enumerado no se quita**: Postgres no sabe hacerlo. Por eso
  la `0034` añade `venta` con `add value if not exists … after 'merma'`, y su
  reversión **para** si ya hay ventas apuntadas en vez de borrarles el importe.
  Y por eso su restricción compara `tipo::text`: el valor nuevo no se puede **usar**
  en la misma transacción en la que se añade.
- **Lo que va a una columna JSON se escribe `${…}::text::jsonb`**, nunca `::jsonb` a
  secas; **y las listas, `${comoLista(…)}::text::tipo[]`** ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md), [0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)).
- **El libro de movimientos.** Solo se añade; un movimiento equivocado se enmienda
  con otro. `estook.existencias` es **una vista**. Todo lo que mueve género pasa
  por `apuntar` —**recibir, devolver y tirar un lote también**—, y **el candado de
  apuntar es `pg_advisory_xact_lock`**: volver a `for update` vuelve a dejar sin
  merma a la sala ([0026](docs/decisiones/0026-la-merma-tiene-motivo-y-partida.md)).
- **Un lote no se borra: se retira** (`retirado_en`, `como_se_retiro`), y su evento
  del Calendario se va con él por la reacción. **Un producto con género apuntado no
  cambia de unidad**: el servidor lo rechaza (0035).
- **La factura no mueve género**: confirma el precio desde hoy y guarda lo cobrado
  en la línea del albarán ([0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)).
  **Los importes de compra, sin impuestos, siempre**; el IVA se calcula al
  enseñarlo ([0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)).
- **La aritmética vive en `packages/dominio`**: inventario, merma, equipo, cierre,
  compras, Calendario, **IVA de compra (`iva.ts`) y cómo se compra
  (`presentacion.ts`)**. Ni un disparador suma stock ni pondera precios (regla 6).
- **Quién ve las horas de quién lo decide `estook.a_quien_lleva`**, en la base. Las
  consultas no filtran por su cuenta ([0025](docs/decisiones/0025-fichar-pide-donde-y-no-bloquea.md)).
  **Y quién ve qué del Calendario, la política de su tabla** ([0031](docs/decisiones/0031-el-calendario-recoge-lo-de-todos.md)).
  **Y quién gestiona a quién, `servidor/aplicacion/jerarquia.ts`**, con la amplitud
  de cada rol que guarda la base ([0034](docs/decisiones/0034-nadie-gestiona-a-su-igual.md)).
- **Los catálogos**: el de navegación (`packages/ui/src/apps.ts`, cuyas tablas se
  cambian en B5 del Plan primero), el de widgets (`packages/ui/src/panel/catalogo.ts`,
  donde cada widget construido dice su grupo) y el de acciones
  (`apps/app/src/acciones/catalogo.tsx`).
- **El catálogo de referencia** (`0021`): se corrige con una migración, no desde la
  aplicación.
- **Las diecisiete funciones `security definer`.** Son la puerta de atrás del
  sistema y están tasadas: una prueba las cuenta, y la última es `a_quien_lleva`.
  El repaso no añade ninguna.

Sobre el candado de `main`: las comprobaciones obligatorias van **sin tilde** —
`Calidad`, `Construccion y presupuestos`, `Migraciones reversibles`—. **Nunca
añadir `Construir` ni `Publicar`**: ese flujo solo corre después de fusionar.

---

## 8 · El siguiente paso · la entrega 2 del repaso

### Antes de empezarla

1. **Que las bases estén cerradas**: la `m7-las-bases` fusionada, `bd:comprobar` con
   34 de 34, la API desplegada con `bd:comprobar-api` en verde, el IVA quitado a los
   precios de Richi, y Richi habiéndolo mirado en el TPV y en el móvil.
2. **La clave de Resend**, que es lo que manda los correos de los avisos (0017). Sin
   ella, la entrega 2 se queda en los avisos de pantalla.

### Qué entra

- **Los avisos a quien manda**: «Avisar a gerentes y jefes cuando alguien por
  debajo empieza un borrador, edita la carta o abre un pedido; **solo una vez**,
  para no petar.» Un centro de avisos dentro de Estook, con lo que cada rol recibe de
  quién está por debajo en la amplitud (0034), **uno por cosa y persona** —el
  primer toque de un borrador avisa; los veinte siguientes, no—, sobre lo que decidió
  la [0017](docs/decisiones/0017-como-avisa-estook.md).
- **«Te han invitado a hacer este pedido»**: un jefe invita a alguien a rellenar un
  borrador; esa persona solo rellena, y lo manda el jefe (`accion.enviar_pedidos`).

**Terminado cuando:** un cocinero empieza un borrador y su jefe de cocina y su
gerente reciben un aviso, uno; el cocinero sigue tocándolo y no llega ninguno más; y
un jefe invita a un camarero a rellenar un pedido, el camarero lo rellena sin poder
mandarlo, y el jefe lo manda.

**Cómo se comprueba que no rompe lo de antes:** `pnpm verifica`,
`pnpm prueba:e2e:completa`, `pnpm cobertura` y `pnpm bd:comprobar-api` contra
Supabase.
