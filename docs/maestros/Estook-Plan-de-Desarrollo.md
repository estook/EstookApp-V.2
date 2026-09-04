---
titulo: Plan de desarrollo
tipo: Documento de construcción
fecha: Septiembre de 2026 · versión 1.1
nota: Reglas de trabajo, sistema de diseño, web pública y 31 módulos en orden. Escrito para que no haga falta inventar nada. Documentos hermanos - Evolución 1.0, Manifiesto, Roles y administración, y Auditoría de flujos.
---

# Qué es este documento

Este documento va dirigido a quien construya Estook, que será en su mayor parte una IA. Está escrito para que **no haga falta inventar nada**: cada decisión que se podría improvisar ya está tomada aquí.

**Qué cambia en la versión 1.1.** Recoge la Evolución de producto 1.0. Los cambios están en A1 (la regla 14), en B7 (el tamaño deja de bloquear), en la parte D (cada módulo lleva ahora su capa inteligente, y hay dos módulos nuevos) y en E3. Lo demás sigue igual.

Documentos hermanos: **Evolución 1.0**, que se lee antes que este; el **Manifiesto**, que dice qué es el producto; **Roles, vistas, auditorías y administración**, que dice qué ve cada persona; y la **Auditoría de flujos**, que es el documento de control obligatorio antes de cerrar cualquier módulo.

---

# A · Cómo se trabaja

## A1 · Las catorce reglas que evitan el desastre

Se leen al empezar cada sesión de trabajo, y **una decisión que las incumpla se revierte aunque el código funcione**.

1. Nunca se escribe una pantalla antes de tener escrito el modelo de datos y el contrato de la operación que va a llamar.
2. Nunca se añade una tabla con un fichero llamado «parche». **Solo migraciones numeradas, reversibles y compatibles hacia atrás.**
3. Nunca escribe el cliente en una tabla de dominio. El cliente **llama comandos y lee vistas**.
4. Nunca se protege algo solo desde la interfaz. **Toda regla de acceso se prueba llamando a la API a pelo.**
5. Nunca hay lógica de negocio dentro de un componente. Un componente pinta y llama.
6. Nunca se calcula lo mismo en dos sitios. **Un cálculo, una función, un único dueño.**
7. Nunca se genera un PDF en el cliente.
8. Nunca se hace `UPDATE stock SET cantidad = …`. **Se inserta un movimiento.**
9. Nunca se guarda dinero en coma flotante. **Céntimos en entero.**
10. Nunca se decide la fecha operativa en el navegador. **La decide el servidor.**
11. Nunca se da un módulo por terminado sin probarlo **en un móvil real y con datos de verdad**.
12. Nunca se avanza al siguiente módulo con el anterior a medias.
13. Si aparece una decisión de producto que no está escrita, **se pregunta y se para**. No se inventa.
14. **Nada entra aislado.** Antes de construir algo se responde: qué datos usa, de dónde vienen, qué otras partes de Estook tienen que enterarse cuando cambien, qué puede automatizar Fogón, qué tiene que aprobar una persona, qué permisos tiene cada rol, qué pasa si falla internet, qué pasa si se ejecuta dos veces y qué queda en auditoría.

> La regla 14 es la que la Evolución 1.0 añade, y es la que convierte «ocho apps que funcionan» en «un sistema donde cada dato nuevo hace más inteligente al resto».

## A2 · Cómo no perder el contexto

El riesgo principal de construir esto con una IA es que a mitad de camino olvide qué está haciendo y empiece a improvisar arquitectura. Se evita con tres cosas.

**El fichero de estado.** En la raíz del repositorio vive `ESTADO.md`, y es lo primero que se lee y lo último que se escribe en cada sesión:

```
# ESTADO DEL PROYECTO
Ultima actualizacion: <fecha>

## Modulo actual
M7 · Proveedores y compras — en curso

## Que esta terminado
M0 ✓  M1 ✓  M2 ✓  M3 ✓  M4 ✓  M5 ✓  M6 ✓

## Que he hecho en la ultima sesion
- Ficha de proveedor con sus botones de contacto
- Ciclo borrador → enviado

## Que queda en este modulo
- [ ] Recepcion con «¿entero o con cambios?»
- [ ] Conciliacion de factura con albaranes

## Decisiones que he tomado por mi cuenta
- El numero de albaran admite letras (hay proveedores que las usan)

## Preguntas pendientes
- Ninguna

## Lo que NO hay que tocar
- packages/dominio/coste.ts (cerrado y probado en M6)
```

**La plantilla de tarea.** Ninguna tarea se pide ni se acepta sin estos ocho apartados:

| Apartado   | Qué dice                                          |
| ---------- | ------------------------------------------------- |
| CONTEXTO   | Qué módulo, qué existe ya, qué documentos leer    |
| OBJETIVO   | Qué tiene que funcionar al terminar, en una frase |
| FICHEROS   | Los que puede tocar. Los demás son intocables     |
| REGLAS     | Las catorce de A1, más las del módulo             |
| NO HACER   | Las tentaciones concretas de esta tarea           |
| PRUEBAS    | Qué pruebas escribe y qué cubren                  |
| ACEPTACIÓN | La lista del módulo, punto por punto              |
| ENTREGA    | Rama, formato del commit, qué documentar          |

**Los límites de tamaño.** Ninguna tarea toca más de un módulo. Ningún fichero pasa de 300 líneas sin justificarlo. Toda función pública lleva su tipo y su prueba. **Al terminar, se dice con honestidad qué queda pendiente.**

## A3 · Stack, cerrado

| Capa               | Tecnología                                     | Por qué                                              |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------- |
| Repositorio        | Monorepo con pnpm workspaces + Turborepo       | Cuatro aplicaciones compartiendo dominio, tipos y UI |
| Aplicación         | React 18 + Vite + TypeScript estricto          | Terreno conocido y rápido en móvil                   |
| Estilos            | Tailwind con los tokens de B1                  | Sin CSS suelto por ahí                               |
| Estado de servidor | TanStack Query                                 | Caché, reintentos, invalidación por evento           |
| Enrutado           | React Router                                   | Simple y suficiente                                  |
| Animación          | Motion + CSS                                   | Con respeto a `prefers-reduced-motion`               |
| Gráficas           | Recharts                                       | Suficiente y ligero                                  |
| PWA                | vite-plugin-pwa                                | Instalable, aguanta red intermitente                 |
| Base de datos      | PostgreSQL (Supabase)                          | Relacional, RLS, extensiones, copias                 |
| API y dominio      | Servicio propio en TypeScript con Hono         | El dominio aislado del transporte                    |
| Autenticación      | Sesiones propias + PIN                         | Login único con dos formas de entrar                 |
| Trabajos           | Cola en tabla + worker programado              | Analítica, IA nocturna, reintentos                   |
| Documentos         | Chromium sin interfaz + HTML/CSS con `@page`   | Tipografías incrustadas y paginación real            |
| IA                 | Detrás de una interfaz propia `ProveedorIA`    | Cambiar de modelo es cambiar un adaptador            |
| Enlace             | Rust, servicio de Windows con icono de bandeja | Ligero, firmable, sin interfaz que mantener          |
| Pagos              | Stripe Billing + webhooks                      | Suscripciones y prorrateos                           |
| Correo             | Resend con dominio verificado                  | Invitaciones, horarios, documentos                   |
| Pruebas            | Vitest · Postgres efímero · Playwright         | Las tres capas, obligatorias                         |
| CI/CD              | GitHub Actions                                 | Todo desde GitHub                                    |

**Descartado a propósito:** Next.js, Flutter, jsPDF, cualquier librería de componentes pesada, y cualquier dependencia nueva que no se justifique por escrito.

> Que el presupuesto de tamaño ya no bloquee (B7) **no cambia esta regla**. Una dependencia entra cuando aporta más de lo que cuesta, con su razón escrita en el pull request, no porque quepa.

## A4 · Estructura del repositorio

```
estook/
├── ESTADO.md              ← se lee y se escribe en cada sesion
├── apps/
│   ├── web/               landing publica
│   ├── app/               la aplicacion (Panel + 8 apps)
│   ├── carta/             carta digital publica
│   └── admin/             panel interno
├── packages/
│   ├── dominio/           tipos, reglas puras, calculos (sin red)
│   ├── ui/                sistema de diseno y componentes
│   ├── iconos/            los SVG, ya descargados
│   ├── cliente-api/       cliente tipado
│   ├── permisos/          matriz compartida
│   ├── documentos/        plantillas HTML/CSS
│   └── utiles/            fechas, dinero, unidades, formatos
├── servidor/
│   ├── api/               rutas HTTP. Solo transporte y validacion
│   ├── aplicacion/        un fichero por comando y por consulta
│   ├── dominio/           entidades, invariantes, servicios
│   ├── infraestructura/   repositorios, Postgres, storage
│   ├── eventos/           catalogo, publicacion, bandeja de salida
│   ├── trabajos/          workers
│   ├── conectores/        uno por TPV y por canal de reparto
│   └── ia/                orquestador y herramientas de Fogon
├── enlace/                el conector de Windows
├── base-de-datos/
│   └── migraciones/ politicas/ vistas/ semillas/
├── docs/
│   └── maestros/          los cinco documentos, en Markdown
└── pruebas/
```

**Regla de dependencias, en un solo sentido:** `apps → packages`, `api → aplicacion → dominio`, y el dominio no importa nada de infraestructura ni de red. Se comprueba en integración continua con `dependency-cruiser`.

> **Los documentos maestros viven en el repositorio.** Su fuente es el Markdown de `docs/maestros/` y el PDF es lo que sale, generado con `pnpm maestros`. Es la misma regla que el resto del producto: los documentos son salidas, nunca entradas. Un documento maestro que solo existe como PDF en un escritorio no se puede versionar, ni comparar, ni corregir sin rehacerlo entero.

---

# B · El sistema de diseño

Esta parte existe para que la interfaz no se invente pantalla a pantalla. **Todo lo visual sale de aquí.**

## B1 · Fichas de diseño

```css
/* Color · marca */
--charcoal: #111c1f; /* texto principal y fondos oscuros */
--naranja: #ff7a00; /* accion, foco, marca */
--naranja-suave: #fff1e5; /* fondos de aviso y seleccion */

/* Color · superficie */
--fondo: #fafaf8;
--superficie: #ffffff;
--borde: #e6e3de;
--borde-fuerte: #cfcac2;

/* Color · texto */
--texto: #111c1f;
--texto-suave: #5a6568;
--texto-tenue: #6d7577;

/* Color · estado */
--bien: #1a7d4f;
--atencion: #9f5f00;
--mal: #c4372b;
--info: #2c6e9b;

/* Espaciado · escala de 4 */
--e1: 4px;
--e2: 8px;
--e3: 12px;
--e4: 16px;
--e5: 24px;
--e6: 32px;
--e7: 48px;
--e8: 64px;

/* Radio */
--r-s: 8px;
--r-m: 12px;
--r-l: 16px;
--r-xl: 24px;
--r-full: 999px;

/* Sombra · discreta, siempre */
--s1: 0 1px 2px rgba(17, 28, 31, 0.06);
--s2: 0 2px 8px rgba(17, 28, 31, 0.08);
--s3: 0 8px 24px rgba(17, 28, 31, 0.12);

/* Movimiento */
--rapido: 120ms;
--normal: 200ms;
--lento: 320ms;
--curva: cubic-bezier(0.2, 0.8, 0.2, 1);
```

**Reglas de color:**

- El naranja es solo para **la acción principal, el foco y la marca**. Si una pantalla tiene tres naranjas, dos están mal.
- Los colores de estado **nunca van solos**: siempre con icono o con texto, porque hay gente que no distingue rojo de verde.
- **Esquema claro fijo.** El modo oscuro del sistema no repinta la app.

## B2 · Tipografía

**Montserrat**, descargada de Google Fonts (licencia SIL Open Font), **autoalojada** en `packages/ui/fuentes/` en formato WOFF2 con los pesos 400, 500, 600 y 700. Nada de cargarla desde un servidor ajeno.

| Uso                        | Tamaño | Peso | Interlineado |
| -------------------------- | ------ | ---- | ------------ |
| Cifra grande del Panel     | 34 px  | 700  | 1,1          |
| Título de pantalla         | 22 px  | 600  | 1,2          |
| Título de sección          | 17 px  | 600  | 1,3          |
| Cuerpo                     | 15 px  | 400  | 1,5          |
| Secundario                 | 13 px  | 400  | 1,4          |
| Etiqueta y origen del dato | 11 px  | 500  | 1,3          |

Las cifras siempre con `font-variant-numeric: tabular-nums`. Tres tamaños de letra ajustables en Ajustes, que multiplican por 0,9 · 1 · 1,15.

## B3 · Iconos

**Lucide** (licencia ISC). Se descargan los SVG y se guardan en `packages/iconos/`; no se instala la librería entera ni se carga nada desde fuera. Cada icono se convierte en un componente React que hereda `currentColor` y acepta `size`. Trazo de 1,75 px, tamaño base 20 px, 24 px en barras.

| App         | Icono Lucide       | Acento       |
| ----------- | ------------------ | ------------ |
| Panel       | `layout-dashboard` | `--charcoal` |
| Inventario  | `package`          | `#C77700`    |
| Escandallos | `calculator`       | `#1E8E5A`    |
| Carta       | `book-open`        | `#B23A6E`    |
| Calendario  | `calendar-days`    | `#2C6E9B`    |
| Equipo      | `users`            | `#6B4FBB`    |
| Servicio    | `clipboard-check`  | `#0F8B8D`    |
| Negocio     | `trending-up`      | `#C4372B`    |
| Cuaderno    | `notebook-pen`     | `#7A6A56`    |
| Fogón       | `flame`            | `--naranja`  |

El acento se usa con moderación: el icono de la app, la línea superior de su cabecera y el sector de la rueda. **El fondo y los botones no cambian de color entre apps**, o parecerían cuatro productos distintos.

> **Un icono dice lo que hace la función, no a quién va dirigida.** Nada de símbolos de accesibilidad para marcar opciones que usa cualquiera: para «reducir movimiento» va una rejilla, y para «se maneja con teclado» va un teclado.

## B4 · Componentes base

Se construyen una vez en `packages/ui` y **nadie escribe uno nuevo sin justificarlo**:

`Boton` (principal, secundario, texto, peligro · tamaños m y l · estado cargando) · `Campo` (texto, número, moneda, fecha, hora, selección, búsqueda) · `Selector` · `Interruptor` · `Tarjeta` · `Hoja` (deslizante en móvil al 92 %) · `PanelLateral` · `Tabla` (que se convierte en tarjetas por debajo de 768 px) · `Lista` · `Cifra` (con su comparación, su objetivo y su origen debajo) · `Grafica` · `Aviso` · `EstadoVacio` (siempre con acción) · `Buscador` · `Etiqueta` · `Avatar` · `Migas` · `Paginador` · `Deshacer` · `Cargando` (esqueletos, nunca ruedas girando) · `Alerta` (con su causa, su impacto y su botón).

**Reglas de componente:**

- Toque mínimo 44 px. En listas de cocina, 52 px.
- **Un botón principal por pantalla.** El resto, secundarios.
- El botón que ejecuta va abajo a la derecha; cancelar a su izquierda.
- Los formularios son progresivos: se pregunta lo siguiente en función de lo anterior.
- **Todo estado vacío lleva una frase y un botón.** Nunca una pantalla en blanco.
- **Todo error dice qué ha pasado, qué se puede hacer y con qué botón.**
- **Toda lista larga se acorta.** Una lista de veintitrés filas idénticas no informa: se enseñan las más recientes y el resto se piden.

## B5 · Navegación

**Móvil · tres posiciones y la rueda.**

```
┌──────────────┬───────────────────┬──────────────┐
│    PANEL     │         ✦         │   AJUSTES    │
└──────────────┴───────────────────┴──────────────┘
```

La rueda se abre sobre fondo desenfocado con un sector por app, con su icono, su acento y su contador. Las apps que el rol no tiene **no aparecen y los sectores se reparten**. Se pulsa un sector, o se mantiene el dedo en el botón central y se arrastra. Con «reducir movimiento» activo, la rueda es una rejilla de tarjetas con la misma información.

> **Dentro de un sector, el icono y el nombre se apilan en vertical de pantalla, no a lo largo del radio.** Colocarlos a radios distintos los separa en la dirección del radio, que arriba y abajo es la vertical pero a las tres y a las nueve es la horizontal: el icono acaba al lado del nombre y con un nombre largo se le monta encima.

Dentro de una app, la barra de abajo pasa a ser la de esa app, con un máximo de cuatro posiciones y un «Más»:

| App         | Sus pestañas                       |
| ----------- | ---------------------------------- |
| Inventario  | Hoy · Productos · Pedidos · Más    |
| Escandallos | Hoy · Fichas · Elaboraciones · Más |
| Carta       | Carta · Menús · Análisis · Más     |
| Calendario  | Mes · Semana · Día · Más           |
| Equipo      | Hoy · Personas · Fichajes · Más    |
| Servicio    | Jornada · Ventas · APPCC · Más     |
| Negocio     | Resumen · Pulse · Costes · Más     |
| Cuaderno    | Incidencias · Notas · Equipos      |

**Escritorio ·** barra superior y menú lateral propio. Arriba, el selector de local, las ocho apps con su desplegable y, a la derecha, notificaciones, chat, Fogón y avatar. Dentro de una app, menú lateral con sus vistas y la ficha abriéndose en panel derecho sin tapar la lista.

**Y en móvil, esa misma fila de la derecha va arriba.** Buscador, avisos, chat, Fogón y avatar, con el local en el que estás a la izquierda. Sin ella, en un teléfono **no hay buscador** —`⌘K` no existe— y a Ajustes no se llega desde dentro de una app, porque ahí la barra de abajo es la de esa app. Arriba lo que es de la sesión entera; abajo, lo de navegar.

> **Fogón no es una pestaña de cada app: es una burbuja que va contigo** (decisión 0015). En móvil, flotando abajo a la derecha por encima de la barra; en escritorio, el icono de arriba abriendo un panel lateral que no tapa lo que estabas mirando; y `⌘J` desde cualquier sitio. **Se abre sabiendo en qué pantalla estás**, y se le puede preguntar cualquier cosa desde cualquier sitio. Una pestaña «Fogón» por app gastaría una de las cuatro posiciones que hay y obligaría a salir de lo que estás haciendo para preguntar por lo que estás haciendo.

**Reglas de profundidad y de vuelta:** máximo tres niveles (app → vista → ficha). Siempre hay una forma de volver que no es el botón del navegador. **Nunca se pierde el trabajo al navegar.**

**Atajos:** `⌘K` buscador universal · `⌘1`–`⌘8` apps · `⌘G` genera el PDF de la pantalla · `⌘J` Fogón · `Esc` cierra hoja o panel.

## B6 · Movimiento

La animación explica de dónde viene lo que aparece. **Si no explica nada, sobra.**

| Qué                         | Cómo                                                  | Duración       |
| --------------------------- | ----------------------------------------------------- | -------------- |
| Hoja que sube en móvil      | Desde abajo, con curva                                | 260 ms         |
| Panel lateral en escritorio | Desde la derecha                                      | 200 ms         |
| Rueda de apps               | Fondo se desenfoca, sectores escalonados cada 30 ms   | 260 ms         |
| Entrar en una app           | Desde el sector que se pulsó, y al volver se invierte | 240 ms         |
| Widget que se arrastra      | Levanta 4 px con sombra `--s3`                        | 120 ms         |
| Cifra que cambia            | Cuenta desde el valor anterior                        | 400 ms         |
| Aviso que se cierra         | Se desliza y colapsa su hueco                         | 200 ms         |
| Deshacer                    | Aparece abajo y se va sola a los 10 s                 | 200 ms         |
| Cargando                    | Esqueleto con brillo lento                            | ciclo de 1,4 s |

`prefers-reduced-motion` **se respeta siempre**. Nada rebota más de una vez, nada gira, nada parpadea.

## B7 · Presupuesto de velocidad

| Acción                       | Objetivo          | ¿Bloquea?                    |
| ---------------------------- | ----------------- | ---------------------------- |
| Abrir una app desde la rueda | 200 ms            | **Sí**                       |
| Panel con un año de datos    | 1 s               | **Sí**                       |
| Ficha técnica                | 300 ms            | **Sí**                       |
| Buscador universal           | 150 ms            | **Sí**                       |
| PDF de una página            | 2 s               | **Sí**                       |
| Carta digital en 4G          | 1 s               | **Sí**                       |
| Paquete inicial de la app    | 250 KB comprimido | **No. Se mide y se informa** |

**Un módulo que no cumple su presupuesto de velocidad no está terminado.**

> **El tamaño deja de ser una norma y pasa a ser una medida.** Se sigue midiendo en cada cambio con `pnpm tamano`, se sigue vigilando y se sigue optimizando, pero no condiciona el producto: si una pantalla necesita algo que la hace mejor, entra, con su razón técnica escrita y con el rendimiento comprobado. Lo que el usuario nota es el tiempo, no los kilobytes: un paquete de 400 KB que abre en 180 ms es mejor producto que uno de 240 KB que abre en 600 ms.
>
> En la práctica: `pnpm tamano` informa y sigue; la integración continua no se bloquea por tamaño, y sí por tipos, lint, dependencias, pruebas y velocidad.

## B8 · Accesibilidad

Contraste mínimo 4,5:1 en texto y 3:1 en iconos con significado · foco visible siempre, con anillo naranja de 2 px · toda la app manejable con teclado · etiquetas en todos los campos, nunca solo un texto de ejemplo dentro · los colores de estado acompañados de icono · `aria-live` para los avisos · la rueda con alternativa en rejilla.

> Y una regla de lenguaje: **la accesibilidad no se marca con el símbolo de la discapacidad.** Reducir el movimiento lo agradece quien se marea, quien tiene migraña y quien simplemente lo prefiere; el teclado lo usa cualquiera que trabaje rápido. Se nombra la función, no a quién se supone que va dirigida.

---

# C · La web pública

Aplicación aparte (`apps/web`), renderizada en servidor para posicionar. Comparte marca con la app y **nada más**: ni sesión, ni datos, ni base de datos.

## C1 · Tono

Serio y directo. Se le habla a alguien que lleva veinte años con un bar y no tiene tiempo. Se explica qué hace, en qué ayuda y por qué ahorra tiempo y dinero, **con números cuando los hay**.

**Prohibido:** signos de exclamación, «revoluciona», «el futuro de», «potencia», «lleva tu negocio al siguiente nivel», contadores de clientes inventados, testimonios falsos, cuentas atrás, chat emergente a los tres segundos y repetir la misma idea en tres secciones. **Cada sección dice algo nuevo.**

## C2 · Estructura de la portada

1. **Encabezado.** Titular en una línea: _La gestión de tu restaurante, en una sola aplicación._ Dos botones: «Probar 14 días» y «Ver cómo funciona».
2. **El problema, con números.** Tres datos honestos y verificables. Sin dramatismo.
3. **La bifurcación.** Dos tarjetas: _Tengo un local_ / _Tengo varios locales_.
4. **Las ocho apps.** Rejilla con icono, nombre y una frase. Al pasar el ratón, captura.
5. **Cómo se conecta con tu TPV.** El bloque que más dudas resuelve, y **arriba, no abajo**: no cambias de TPV, sigues cobrando como siempre.
6. **Los documentos.** Muestras reales que se abren a tamaño completo. **Es el bloque que más convierte**, porque es lo único tangible.
7. **Fogón.** Tres avisos reales de ejemplo, y la frase que lo resume: propone, nunca decide.
8. **En qué se nota.** Cuatro bloques cortos con el beneficio y su porqué.
9. **Precios**, resumidos, con enlace a la página completa. **Con el precio a la vista**, que es donde la competencia no está.
10. **Preguntas frecuentes**, las diez de verdad.
11. **Cierre** con el mismo botón del principio.

## C3 · El resto del sitio

`/un-local` · `/cadenas` · una página por app (ocho) · `/tpv` con la lista de compatibilidad · `/integraciones` · `/carta-digital` · `/fogon` · `/documentos` · `/precios` · `/comparativa` · `/para-gestorias` · casos por tipo de local · `/ayuda` (público, y posiciona) · `/blog` · legales · `/estado` · `/registro` · `/entrar`.

## C4 · Efectos de desplazamiento

Discretos y con propósito. **Nada de elementos que se persiguen por la pantalla.**

Aparición al entrar en pantalla (opacidad de 0 a 1 y 16 px de subida, 400 ms, escalonado de 60 ms, una sola vez) · cabecera transparente arriba y con sombra al bajar 80 px · paralaje muy leve en la imagen del encabezado, 8 % y ni un píxel más · rejilla de apps con elevación de 4 px al pasar el ratón · cifras que cuentan desde cero una sola vez · muestras de documento que se abren a pantalla completa.

`prefers-reduced-motion`: todo aparece sin desplazamiento y sin paralaje.

## C5 · Imágenes y recursos

**Nada de imágenes de banco con gente sonriendo señalando un portátil.**

Procedimiento obligatorio, una sola vez: descargar de Unsplash o Pexels (licencia libre, uso comercial) → guardar el original en `originales/` → convertir a WebP en tres anchos (480, 960, 1600) con calidad 78 → anotar autor, licencia y origen en `creditos.json` → servir con `<picture>`, `srcset`, `loading="lazy"` y `width`/`height` puestos.

**Ninguna cara identificable en primer plano**, para no depender de cesiones de imagen.

Las capturas de la app se hacen desde el entorno de demostración, con el restaurante ficticio, a 2× y recortadas con margen. **Nunca con datos de un cliente real.**

## C6 · Posicionamiento y rendimiento

Una página por app, por tipo de local y por caso de uso, cada una con su título y su descripción escritos a mano · datos estructurados · sitemap y canónicas · el centro de ayuda público, que resuelve y posiciona · la carta digital de cada cliente enlaza a Estook, lo que genera enlaces reales · medición propia, agregada y sin identificar a nadie, para **no necesitar banner de cookies** · objetivo de carga por debajo de 1,5 s en 4G.

---

# D · Los módulos

**31 módulos, de M0 a M30**, en el orden exacto de construcción. Cada uno se entrega funcionando, probado en móvil real y con datos de verdad. **Ninguno se da por bueno «al 90 %».**

Cada ficha lleva: _Objetivo · Qué entra · Qué NO entra · Depende de · Datos · Reglas críticas · Errores típicos · Terminado cuando · Pruebas._

> **Cómo entra la Evolución 1.0 aquí.** No como módulos sueltos al final: cada módulo se construye **ya con su capa inteligente dentro**. Un Inventario plano al que después hay que añadirle la previsión es más caro que un Inventario que nace con ella. Los apartados marcados **«y su capa inteligente»** son lo que la evolución añade a cada uno.

## Fase 1 · Cimientos

### M0 · Cimientos y disciplina

**Objetivo.** El esqueleto y las reglas, antes de una sola pantalla.

**Entra.** Monorepo con las cuatro apps arrancando vacías · TypeScript estricto · lint, formato y reglas de dependencia · migraciones numeradas y reversibles · tres entornos más el de demostración · integración continua que bloquea por tipos, lint, dependencias, pruebas y velocidad · `ESTADO.md` y las plantillas de A2 · Sentry y registro con `correlacion_id` · banderas de función · dos semillas: un local independiente y una cadena de seis locales en dos áreas.

**Terminado cuando.** Se clona, se ejecuta un comando y todo arranca con las dos semillas; y un pull request con un fallo de tipos no se puede fusionar.

### M1 · Modelo maestro: alcances, roles y permisos

**Entra.** Organizaciones, áreas, locales, usuarios · membresías con alcance y vigencia · función `locales_visibles` · los doce roles · herencia de permisos y recorte por local · **RLS en todas las tablas** escrita contra `locales_visibles` · auditoría _append-only_ · catálogo maestro con sus tres políticas · traducciones · dispositivos con revocación.

**Reglas críticas.** Aunque el primer cliente tenga un local, **el modelo nace con los cuatro alcances**. La auditoría rechaza `UPDATE` por permisos de base de datos.

**Errores típicos.** Montar todo sobre «un usuario pertenece a un local». Fiarse del `local_id` que manda el cliente. Dejar traducciones para luego.

**Terminado cuando.** Toda consulta cruzada entre organizaciones devuelve vacío y `403`; un area manager ve exactamente sus tres locales.

### M2 · Núcleo técnico y motores transversales

**Entra.** API versionada con compatibilidad N−2 · comandos y consultas · validación con esquemas · catálogo de errores en cristiano · idempotencia por cabecera · **bandeja de salida transaccional** y publicador de eventos · workers con reintento · control optimista por versión · cliente tipado · los siete motores: fiscal, dinero, unidades y coste, tiempo, textos, permisos y recálculo.

**Terminado cuando.** El mismo comando tres veces con la misma clave produce un solo efecto; y el motor fiscal desglosa una fórmula con tipos mixtos cuadrando al céntimo.

### M3 · Sistema de diseño y esqueleto

**Entra.** Todo lo de la parte B: fichas, tipografía autoalojada, iconos descargados, componentes base, barra de móvil, rueda de apps, barra de escritorio, buscador universal con `pg_trgm` y `unaccent`, deshacer universal, estados vacíos, tres tamaños de letra, accesibilidad y presupuesto de velocidad medido.

**Y su capa inteligente.** El componente `Alerta`, con su causa, su impacto y su botón, porque lo van a usar todos los módulos siguientes. Y la **zona de atención del Panel** como marco vacío que cada módulo irá llenando.

**Terminado cuando.** Se navega por las ocho apps sin un salto raro en móvil pequeño real; la rueda funciona con arrastre y con teclado, **y en los ocho sectores el icono y el nombre no se solapan**; deshacer funciona en tres flujos; y todos los widgets tienen su versión «todavía no tengo datos».

### M4 · Identidad y acceso

**Entra.** Login único con correo y contraseña o PIN · selector de organización y luego de local, con cambio de contexto sin nueva sesión · resolución de destino tras entrar · invitación con PIN mostrado en pantalla · invitar a un correo existente añade membresía, **nunca duplica persona** · reactivar a quien se fue · PIN único por local · doble factor exigible desde la organización · segundo administrador o correo de recuperación obligatorio · sesiones y dispositivos.

**Regla crítica que se aprendió construyéndolo.** La sesión se ata al **aparato**, no al login: entrar dos veces desde el mismo móvil no son dos filas. Sin eso, «Mis dispositivos» enseña sesiones y no dispositivos, y deja de servir para lo único que existe —reconocer una sesión que no es tuya.

**Terminado cuando.** Una camarera con dos locales elige dónde está; un area manager entra en su consolidado; y una llamada a la API pidiendo un local ajeno devuelve `403`.

### M5 · Onboarding y arranque asistido

**Entra.** Los ocho pasos del alta · Google Places con volcado de ficha, reseñas y competidores · régimen fiscal y objetivos · logo y color con previsualización · camino de grupo con duplicado de local · datos de ejemplo mínimos etiquetados como ejemplo, que no cuentan para nada y se borran con un botón · catálogo de referencia consultable de unos 250 productos · recetas de referencia opcionales · importadores con mapeo propuesto por Fogón · importación por acumulación de albaranes · modo demostración con salida limpia · barra de progreso con valor · guía de instalación distinta para iPhone y Android · la tarjeta fija del Panel «Conecta tus ventas».

**Dependencia que hay que respetar.** El asistente de conexión con el TPV **no se construye aquí**: vive en M18 y M20. En M5 solo existe la tarjeta del Panel.

**Terminado cuando.** Un local termina el alta en menos de cuatro minutos con su nombre real, su valoración, sus competidores y su marca aplicada; crear un producto desde el catálogo de referencia lleva menos de quince segundos; y el gasto de Google queda por debajo de 0,50 €.

## Fase 2 · El valor de cocina

### M6 · Inventario

**Entra.** Productos con formato, unidad de uso, factor, rendimiento, peso variable, código de barras, tipo impositivo, alérgenos y mínimo · libro de movimientos con lote · ajuste manual como movimiento · precios con vigencia y precio medio ponderado · entrada por todas las vías · lotes y caducidades · ficha completa.

**Y su capa inteligente.** Consumo medio y velocidad de consumo por producto, calculados por consulta. **Días de cobertura y previsión de agotamiento con fecha y hora.** Histórico de precio por proveedor.

**Reglas críticas.** El stock nunca se escribe directo. Un producto sin precio se usa y queda marcado. **El stock negativo se permite y se marca.**

**Terminado cuando.** Se da de alta un producto en 30 segundos; al cambiar el precio, el coste por unidad de uso y el medio ponderado cambian bien en un producto con factor y rendimiento distintos de 1; el stock se reconstruye entero desde los movimientos; y la previsión de agotamiento acierta el día en un producto con consumo estable.

### M7 · Proveedores y compras

**Entra.** Ficha con días de reparto y pedido mínimo · contratos marco · ciclo `borrador → enviado → recibido` · sugerencia que respeta el calendario de reparto y el mínimo del proveedor · envío por WhatsApp, correo y PDF · recepción con «¿entero o con cambios?» · factura de compra conciliada con sus albaranes · abonos y devoluciones.

**Y su capa inteligente.** **Sugerencia de pedido con su motivo escrito** («mantener unos 5 días de cobertura») y comparación entre proveedores para el mismo producto.

**Reglas críticas.** El albarán mueve stock; **la factura confirma el precio**. La recepción es idempotente.

**Terminado cuando.** Un pedido recorre el ciclo, el inventario cuadra, el precio nuevo ya está repercutido en los escandallos, y una factura con tres albaranes y una diferencia sale conciliada con esa diferencia señalada.

### M8 · Inventario, mermas y desviación

**Entra.** Recuento cíclico con lector · inventario valorado a precio medio ponderado · mermas en tres toques con motivo obligatorio, por voz y con foto · partida aparte para consumo de personal e invitaciones · desviación · calibración con estado «aprendiendo» hasta el tercer recuento · **FEFO** · stock mínimo calculado · **food cost real global** junto al teórico y su brecha · causa probable de la desviación · permiso separado para cerrar recuento.

**Terminado cuando.** Con dos recuentos, la desviación sale explicada producto a producto; y un producto que se sirve de más deja de saltar tras el tercer recuento.

### M9 · Escandallos

**Entra.** Elaboraciones anidables con detección de ciclos · ficha en dos caras · extras y sustituciones · versionado con comparador · escalado de gramajes · **modo cocina** a pantalla completa, sin importes y en el idioma del cocinero · modo aprendizaje · valor nutricional y alérgenos calculados · hoja de producción del día · borrador de ficha propuesto por Fogón · indicador de cobertura de fichas · grafo de recálculo · ficha impresa con QR a la versión viva.

**Y su capa inteligente.** El bloque **«qué ha cambiado y por qué»**: cuánto ha subido el coste desde una fecha, qué ingrediente lo ha movido, a cuántos platos afecta una subida y cuál es el impacto máximo en puntos de margen.

**Reglas críticas.** Escandallo por unidad de venta. Margen sobre base sin impuestos. **La ficha es dato estructurado, no texto.** Un plato sin ficha nunca bloquea nada. Los importes **no viajan al cliente** de un rol sin permiso de costes.

**Terminado cuando.** Se monta una carta entera sin tocar la base a mano; un cocinero abre la ficha **sin ver ningún importe**; y al subir un ingrediente solo se recalcula lo afectado.

### M10 · Carta, menús y análisis

**Entra.** Canales con listas de precio y comisiones · constructor por secciones · agotado desde el móvil · fórmulas y menús con reparto de precio · menú del día con propuesta de Fogón · análisis de rentabilidad por canal (estrella, caballo, puzzle, perro) · análisis de equilibrio de carta · comparación con la zona.

**Y su capa inteligente.** La **matriz de popularidad contra rentabilidad** con su clasificación y su precio recomendado, y la lista de candidatos a retirar. **Nunca retira ni modifica nada por su cuenta.**

**Terminado cuando.** El mismo plato tiene tres precios en tres canales y el análisis lo clasifica distinto en cada uno; y el informe de equilibrio detecta una carta descompensada sembrada a propósito.

### M11 · Documentos y diseños

**Entra.** Renderizado en servidor con tipografías incrustadas y paginación real · las plantillas del catálogo · diseños de carta y cartelería en vectorial · personalización · previsualización · enviar, imprimir, descargar · guardado de la receta y regeneración idéntica · conservación de los legales.

**Y su capa inteligente.** **Lectura de documentos subidos:** albaranes, facturas y contratos. Fogón extrae los campos y **propone**; una persona confirma; la operación la ejecuta el dominio. De un contrato salen además sus avisos de vencimiento.

**Terminado cuando.** Desde el móvil se genera un menú con fotos y logo y se manda por WhatsApp; se ve idéntico en un ordenador; regenerarlo tres semanas después da el mismo fichero; y de un albarán fotografiado sale una recepción propuesta que una persona confirma en dos toques.

### M12 · Carta digital pública

**Entra.** Página por local con su dirección y su QR en tres formatos · marca del local · precios del canal elegido · filtros por alérgeno y dieta · idiomas automáticos · agotados en vivo · datos de contacto y enlace a reseña · caché con invalidación por evento · SEO y datos estructurados · **cero cookies**.

**Terminado cuando.** Se escanea el QR, la carta aparece en menos de un segundo en el idioma del móvil, y un plato marcado agotado desaparece en menos de treinta segundos.

## Fase 3 · Personas y día a día

### M13 · Equipo

**Entra.** Personas con rol, alcance y documentos · contratos con vigencia · **coste por hora con permiso propio**, o coste medio por puesto como opción por defecto · calendario laboral con festivos por código postal · ausencias con solicitud, aprobación y saldo · bolsa de horas · reactivación de quien vuelve.

**Reglas críticas.** El coste por hora **solo lo ve quien tiene ese permiso**. No aparece en documentos ni en Fogón.

**Terminado cuando.** Con costes por puesto y sin un solo sueldo individual, el porcentaje de personal del Panel sale correcto.

### M14 · Calendario

**Entra.** Vistas mes, semana, día, turnos y tareas · todo lo que pasa en el local con su color y su filtro · arrastrar para crear y mover · turnos partidos · plantillas y copiar semana · **coste en vivo mientras montas** · avisos automáticos · borrador y publicado · al publicar, cada uno recibe lo suyo; al cambiar, solo se avisa al afectado · recurrencias · suscripción de calendario · vista «solo lo mío».

**Y su capa inteligente · horarios con Fogón.** Botón de **generar horario**, que cruza disponibilidad, contratos, horas objetivo, vacaciones, ausencias, turnos anteriores, ventas históricas, previsión de ventas, eventos, necesidades mínimas por puesto y coste laboral. Devuelve coste estimado, comparación con la semana anterior, cobertura por área y los huecos sin cubrir.

**Regla crítica.** **Nunca se publica automáticamente.** La propuesta nace en borrador.

**Terminado cuando.** Una semana con partidos se publica, cada persona recibe lo suyo, un cambio avisa solo al afectado, el cuadrante impreso sale legible, **y una propuesta de Fogón se puede editar antes de publicar**.

### M15 · Fichajes

**Entra.** Modo quiosco en cualquier dispositivo registrado del local · fichaje desde el móvil con foto del puesto, solo si el local lo activa, conservada 90 días · **hora del servidor** · prohibido fichar desde un dispositivo no registrado · turnos sin cerrar con corrección con rastro · comparativa de lo planificado contra lo fichado con su coste.

**Errores típicos.** Poner el botón de fichar en el móvil sin comprobación, que equivale a permitir fichar desde casa. **Añadir huella o GPS.**

**Terminado cuando.** Se ficha en menos de tres segundos con dos toques; fichar desde un dispositivo no registrado devuelve `403`; y la comparativa sale cuadrada.

### M16 · Servicio, APPCC y trazabilidad

**Entra.** Apertura automática de jornada · **fecha operativa en el servidor**, incluida la noche del cambio de hora · panel en vivo · plan de APPCC versionado con plantillas · registro en dos toques con firma por PIN y **acción correctiva obligatoria** · `NO REGISTRADO` en rojo · informe de trazabilidad de lote · cierre en cuatro pasos y sesenta segundos · reapertura con motivo.

**Terminado cuando.** Un mes de APPCC se exporta listo para inspección; un cierre real se completa en menos de sesenta segundos; y de un lote sale el listado de días y platos en que se sirvió.

### M17 · Cuaderno

**Entra.** Incidencias del turno enlazadas a la jornada, que lee el turno siguiente · notas privadas, de equipo y de local, donde **compartir cambia permisos y no duplica** · enlaces a platos, productos, proveedores y personas · equipos con revisiones, vencimientos y adjuntos, que aparecen solas en el Calendario.

**Terminado cuando.** El turno de la mañana lee la incidencia de la noche anterior sin que nadie se lo cuente.

## Fase 4 · Los datos de venta

### M18 · El conector · vía nube

**Entra.** El asistente de conexión en cuatro pantallas · guías por marca y por sistema operativo, cada una con sus pasos, sus capturas y el correo redactado para pedir credenciales · importación del catálogo de artículos que monta la Carta sola · marco de conectores con una interfaz común (`autenticar`, `listar_articulos`, `traer_ventas`, `estado`) · implementación de Ágora y de Glop por su API oficial · pantalla de conexión con la lista de TPV y sus logos · sincronización cada 15 minutos, más al cierre, más botón de sincronizar ahora · idempotencia por identificador de pedido y fecha de servicio · panel de estado.

**Reglas críticas.** **Nunca pedimos las credenciales del TPV dentro de Estook cuando existe autorización**; cuando el proveedor las entrega bajo petición, se explica de dónde salen y las pedimos nosotros. **Importar dos veces el mismo día no cambia nada.**

**Terminado cuando.** Un día de ventas real entra solo y el consumo mueve el inventario; y al conectar por primera vez, **la Carta aparece montada** con todos los artículos del TPV, sus precios y sus secciones, sin que nadie escriba un plato a mano.

> **Aclaración que evita un error caro.** El TPV trae **artículos de venta, no ingredientes**. Sabe que se vendió una hamburguesa a 14,50 €; no sabe qué lleva dentro ni lo que costó. Conectar monta la Carta; el inventario y los escandallos los pone el restaurante, y eso es precisamente lo que aporta Estook.

### M19 · El conector · Estook Enlace

**Entra.** Servicio de Windows en Rust, firmado, que **vigila una carpeta** y sube los ficheros nuevos · emparejamiento con un código de un solo uso · solo lectura, sin puertos abiertos, saliente y cifrado · latido cada 15 minutos · cola local si no hay red · icono de bandeja con el estado · instalador y guía de puesta en marcha remota · lectores de formato para Hosteltáctil y para los informes de Ágora y Glop cuando no hay API.

**Reglas críticas.** **Enlace no entra en la base de datos del TPV.** Si un formato cambia, guarda el fichero original, avisa y no rompe nada.

**Terminado cuando.** Con el PC apagado dos días, al arrancar sube lo pendiente sin duplicar; y un fichero con formato inesperado se queda guardado con su aviso.

### M20 · Ventas, emparejamiento y consumo

**Entra.** Pantalla de ventas con **el origen y su fiabilidad siempre a la vista** · emparejamiento de artículos con propuesta por parecido y confirmación · explosión de menús y modificadores · caminos manuales explicados por marca y por sistema · foto del Z y total del día · consumo teórico descontando del inventario · lo no emparejado cuenta en dinero y no descuenta género, avisado.

**Reglas críticas.** Una jornada estimada **no entra en la desviación sin avisar**. El menú importado se explota a sus platos.

**Terminado cuando.** El stock se mueve solo con las ventas del día y el cierre cuadra con el Z; **reimportar el mismo fichero no cambia nada**.

## Fase 5 · Inteligencia

### M21 · Negocio, analítica y Estook Pulse

**Entra.** Agregados por worker: diarios, por franja, por producto, por plato, por canal y por empleado · resúmenes con objetivo y comparación · productividad · **dónde se va el margen con enlace a donde se arregla** · previsión de ventas a siete días con su margen de error y contraste posterior · presupuesto por mes con seguimiento · salud de los datos · exportaciones en PDF, CSV y formatos de A3, Sage, Contasol y Holded · auditoría consultable · reconstrucción completa de agregados con un comando.

**Y su capa inteligente · Estook Pulse.** La salud del negocio en un número, **con sus componentes, sus pesos y su explicación**, exactamente con la disciplina del indicador de salud de datos: se puede desmontar y dice qué la está bajando. Con sus problemas y sus oportunidades, cada uno accionable.

**Regla crítica.** **Nunca se enseña un número solo.** Pulse siempre explica por qué está en verde, amarillo o rojo. Y Pulse y salud de los datos **son dos indicadores distintos que no se mezclan**.

**Terminado cuando.** Los números cuadran con el Z y con la gestoría; el Panel carga en menos de un segundo con un año de datos; reconstruir da los mismos números; **y Pulse se puede abrir y desglosar hasta el dato que lo mueve**.

### M22 · Fogón

**Entra.** Resumen vivo del local y perfil del negocio con sus límites · catálogo de herramientas con permisos · presupuesto por local y día · avisos automáticos, **la mayoría por consulta sin llamar al modelo** · asistente contextual · voz para merma, temperatura, gramaje e incidencia · cadencias y cupos por plan con aviso al 80 % · caché · registro de consumo y de acciones · reglas de degradación · borradores de pedido, menú, precio, cuadrante, respuesta a reseña y traducción de fichas.

**Y su capa inteligente · Fogón transversal.** Presente en **todas** las apps, trabajando con el contexto de la pantalla. Y el **centro de alertas**: cada alerta con qué ocurre, por qué, qué impacto tiene, qué se recomienda y un botón, priorizadas por Fogón.

**Dónde vive, decidido en M6** (decisión 0015). Burbuja flotante en móvil, icono de arriba a la derecha con panel lateral en escritorio, y `⌘J`. **Nunca una pestaña dentro de una app.** Se abre sabiendo en qué pantalla estás, y además es un chat de verdad: se le pregunta cualquier cosa desde cualquier sitio, y se le pide que rellene o prepare cosas. El sitio ya está construido y probado desde M6; M22 lo llena.

**Y las pestañas de cada app llevan los análisis que Fogón deja hechos**, no la conversación. Se calculan **fuera de hora y se guardan**, con la hora a la que se miraron a la vista: **cada 8 horas** lo que se mueve con cada servicio —género, mermas, agotados—, **cada 12** lo que se mueve con el día —ventas, margen, personal— y **cada 24** lo que se mueve con la semana —carta, proveedores, reseñas—. La cadencia la decide **el dato, no la app**. Recalcular un análisis cada vez que alguien abre una pantalla es la forma más rápida de gastarse el presupuesto del mes en una tarde, y contradice «lo pesado, en lote nocturno».

**Reglas críticas de optimización, que son también de coste.** Los números los calcula la base de datos, **nunca el modelo**. Las reglas de aviso van en código. El contexto va cacheado y se parchea. Cada tarea a su modelo. Lo pesado, en lote nocturno. Respuestas frecuentes cacheadas. Imágenes reducidas. **Fogón pide el dato concreto, jamás una tabla entera.** Nada se guarda sin aprobación. **El texto que viene de fuera se trata como dato, jamás como instrucción.**

**Terminado cuando.** Da tres avisos útiles seguidos sin inventarse una cifra; un cocinero preguntando por márgenes recibe una negativa; **una inyección desde una reseña no cambia su comportamiento**; ninguna alerta llega sin su acción; y el coste por local se queda por debajo de 50 céntimos medidos.

### M23 · Reseñas, competencia y chat

**Entra.** Enlace de la ficha del local autorizando con la cuenta de Google que la gestiona · reseñas por Google Business Profile, refrescadas cada 9 horas · conteo, clasificación por tema, media, evolución y detección de caídas **resueltos con consultas, sin llamar al modelo** · una sola llamada al modelo al día · cruce con el cuadrante y respuesta propuesta · competencia con recálculo cada 6 h sobre lo guardado y caché compartida por zona · chat con canales, directos, menciones, tarjetas de contexto, confirmación de lectura, buscador y silencio fuera de turno.

**Y su capa inteligente · chat conectado.** Lo que se escribe puede **ofrecerse** para convertirse en incidencia, agotado, aviso o tarea. **Con acción explícita, siempre: nada de efectos secundarios ocultos.**

**Reglas críticas.** Estook **nunca responde una reseña por su cuenta**. El gerente ve todos los canales, **nunca los directos entre dos empleados**.

### M24 · Cadena

**Entra.** Panel de cadena con comparativa y **gestión por excepción**, servido de agregados precalculados · bajada al local en un toque · ranking configurable · comparativa de precios de compra frente al contrato marco · catálogo maestro con propagación y adopción · informe de cumplimiento de estándares · gestión de áreas y area managers · **visitas y auditorías de local completas** según el documento de Roles · movilidad de personal · archivado de local excluido de las medias.

**Y su capa inteligente.** La auditoría **detecta sola** APPCC incompleto, inventario atrasado, desviación elevada, fichajes anómalos, formación pendiente, documentación incompleta, problemas de stock y tareas sin cerrar. Y convierte cada problema en **tarea + responsable + fecha**.

**Terminado cuando.** El area manager ve sus tres locales en menos de un segundo e identifica el que se sale; y un cambio en la receta maestra llega a los obligatorios y avisa a los desviados.

### M25 · Ajustes, apps activables y notificaciones

**Entra.** Ajustes completos, incluido Organización, Mi TPV e **Integraciones** · apps con interruptores y el aviso de qué pasa al apagar cada una · motor de notificaciones con tres niveles, agrupación, acción y archivo de 90 días · push con tokens por dispositivo y escalado por otro canal si no se entrega · correo con el logo del local · WhatsApp para lo que sale fuera · **regla de no duplicar canal**.

## Fase 6 · Negocio y producción

### M26 · Suscripciones, web y panel interno

**Entra.** Motor de derechos de uso: plan → derechos y cupos comprobados en servidor, con `402` y el código del derecho · contadores por día natural · prueba de 14 días sin tarjeta con paso a solo lectura el día 15 · antiabuso por ficha de Google, CIF y dirección · planes en Stripe con anual, pausa y prorrateo · una factura por organización con desglose por local · impago escalonado **sin cortar en mitad del servicio** · baja con exportación completa · la web pública entera de la parte C · panel interno completo según el documento de Roles.

**Terminado cuando.** Cada derecho tiene su prueba llamando a la API con un plan inferior y esperando `402`; cambiar los derechos en el navegador no desbloquea nada; y un local se da de alta y contrata de principio a fin sin que intervengamos.

### M27 · Endurecimiento y puesta en producción

**Entra.** Revisión de seguridad y de RLS tabla por tabla · límites de petición · pruebas de carga en los caminos calientes · índices revisados con planes reales · RGPD: registro de actividades, retención por tipo de dato aplicada por un trabajo nocturno, borrado y portabilidad, contrato de encargado, aviso a empleados sobre fichajes y chat · copias diarias con prueba de restauración · página de estado · dominio, correo verificado y certificados · la lista de claves · alta de la cuenta propia.

**Y algo que la construcción de M4 enseñó.** Aquí se cierra el hueco de los procesos de fondo: **la bandeja de salida, la cola de trabajos y la limpieza de caducados necesitan quién los ejecute.** Una API que atiende y se apaga no tiene reloj. La decisión —`pg_cron` dentro de Supabase, o una función con programador— se escribe antes de M8, no aquí, pero aquí se comprueba que funciona bajo carga.

### M28 · Piloto real

**Entra.** Tres locales reales durante un mes, uno con Ágora y otro con Glop · acompañamiento en la instalación y la primera semana · **registro de cada fricción y cada llamada** · medición de activación, salud de datos y coste real · corrección con prioridad sobre cualquier función nueva · entrevista de salida.

**Regla crítica.** **No se abre ninguna función nueva mientras haya fricción del piloto sin resolver.**

## Fase 7 · El ecosistema

### M29 · Canales de reparto e integraciones

**Objetivo.** Que un pedido de una plataforma de reparto entre en Estook por el mismo sitio que una venta del TPV, y alimente lo mismo.

**Entra.** Sección de **Integraciones** con sus tres estados honestos (disponible, próximamente, manual) · marco de adaptadores de canal con interfaz común · **Uber Eats** como primera implementación: OAuth 2.0 con credenciales de cliente, verificación de la firma `X-Uber-Signature`, webhooks `orders.notification`, `orders.release` y `order.fulfillment_issues.resolved`, y el ciclo del pedido con `accept_pos_order`, `deny_pos_order`, `cancel` y `cart` · gestión del pedido desde la interfaz de Estook · idempotencia por identificador de pedido · registro de eventos, reintentos y recuperación tras corte.

**Regla crítica de arquitectura.** El webhook **acusa recibo y encola**; no hace el trabajo. Uber exige aceptar o rechazar en menos de 11 minutos y medio o cancela el pedido solo, así que la respuesta la da un trabajo que trae el pedido completo por API. Encaja con la bandeja de salida y la cola de M2.

**Regla crítica de datos.** Los pedidos se transforman **al modelo interno de Estook**. Crear una estructura paralela sería una segunda fuente de verdad.

**Qué NO entra.** Convertir Estook en un TPV. El canal de reparto es externo; Estook agrega y analiza.

**Antes de escribir una línea.** Se investiga la documentación oficial vigente: proceso de alta y aprobación, OAuth y autorización del restaurante, permisos y alcances, identificación de tiendas, APIs de pedidos, datos que devuelve cada pedido, webhooks y eventos, tiempos para aceptar o rechazar, sincronización de estados, impuestos, descuentos y totales, límites de la API, requisitos técnicos y comerciales, y entorno de pruebas y certificación. **No se implementa nada basándose en suposiciones.**

**Terminado cuando.** Un pedido real entra por webhook, se acepta desde Estook, actualiza ventas y consumo, y **reenviar el mismo webhook no lo duplica**. Y añadir un segundo canal es escribir un adaptador, no tocar el núcleo.

### M30 · API pública

**Objetivo.** Que un TPV, un ERP o una herramienta externa puedan leer y escribir en Estook con permiso del cliente.

**Entra.** Superficie pública versionada sobre la API interna existente · autenticación por aplicación con alcances y autorización del cliente · límites por aplicación y por cliente · documentación y entorno de pruebas · registro de uso y auditoría de quién llamó a qué · webhooks salientes para que un tercero se entere de lo que cambia en Estook.

**Reglas críticas.** La API pública **no es un atajo al dominio**: pasa por los mismos comandos, los mismos permisos y la misma auditoría que la aplicación. Un tercero **nunca** ve más de lo que vería la persona que autorizó la conexión.

**Por qué está aquí y no antes.** Porque exige que el dominio esté cerrado. Y por qué está: el TPV líder de España se integra con dos back-office de nuestra categoría, así que **quiere integrarse con nosotros** y tiene que haber dónde.

---

# E · Control

## E1 · Definición de terminado

- Funciona en móvil pequeño real, tablet y escritorio, **sin desbordes ni títulos cortados**.
- Funciona con conexión mala y con datos vacíos, con su estado «todavía no tengo datos».
- **Cumple su presupuesto de velocidad, medido.** El de tamaño se informa.
- Pasa las pruebas de permisos y de aislamiento de su dominio.
- Ninguna operación de stock se puede duplicar reintentando.
- Los textos van por el motor de textos, en español de España, sin jerga y sin emojis.
- **Las cifras llevan su origen y su periodo.**
- Ninguna dependencia nueva sin justificar.
- Se ha respondido a la regla 14: qué datos usa, quién se entera cuando cambien, qué automatiza Fogón y qué aprueba una persona.
- `ESTADO.md` actualizado.

## E2 · Qué se entrega en cada módulo

Código en su rama con commits legibles · migraciones numeradas y reversibles · pruebas que cubren la aceptación · **documentación actualizada en el mismo pull request** · capturas o vídeo en un móvil real · la lista de aceptación marcada punto por punto · **un apartado honesto de qué queda pendiente y qué se ha decidido por cuenta propia**.

## E3 · Orden que no se salta

1. **M0 entero** antes de tocar producto.
2. **M1 y M2 antes que cualquier pantalla de negocio.** El modelo de alcances y los motores transversales son lo que se paga carísimo si se deja para después.
3. **M3 antes que cualquier app**, para que ninguna invente su propio botón.
4. Ningún módulo empieza con el anterior a medias.
5. **Antes de M8 hay que haber decidido quién ejecuta los procesos de fondo.** La bandeja de salida y la cola de trabajos existen desde M2 y nadie las llama: en cuanto un módulo dependa de un evento, eso deja de ser gratis.
6. **M29 y M30 van al final, y no es un descuido.** Una integración sobre un dominio a medio cerrar se rehace entera.
7. **No se lanza sin M28.** Un mes con tres locales reales vale más que seis meses de suposiciones.

> **Documento de control obligatorio.** Antes de cerrar cualquier módulo se pasa la lista de la **Auditoría de flujos, dependencias y efectos en cadena**, que define el mapa de dependencias de datos, los efectos en cascada de cada cambio, de dónde salen las opciones de cada desplegable, las máquinas de estado y el comportamiento ante fallos parciales.

## E4 · Lo que la construcción ya ha enseñado

Tres cosas que costaron caro y que quedan escritas para no repetirlas.

**Una prueba que corre en un sitio no prueba el otro.** Las pruebas corren en Node; la API desplegada corre en Deno. Un camino que solo existe en producción es un camino que nadie comprueba. Cada entorno de ejecución distinto necesita su comprobación propia.

**Una comprobación que no puede fallar es peor que no tenerla**, porque da confianza. Antes de dar por buena una comprobación nueva, se rompe a propósito lo que debería detectar y se verifica que falla.

**El nombre de una cosa decide dónde acaba.** Dos listas parecidas con nombres parecidos terminan mezcladas. Si dos sitios distintos necesitan datos distintos, los nombres tienen que hacer obvio cuál va dónde.
