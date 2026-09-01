# ESTADO DEL PROYECTO

Última actualización: 1 de septiembre de 2026

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Nunca puede afirmar algo que no sea cierto en ese momento.

---

## 1 · Dónde estamos

|                |                                                            |
| -------------- | ---------------------------------------------------------- |
| **Terminados** | **M0 ✓** cimientos · **M1 ✓** alcances, roles y permisos   |
| **En curso**   | **M2** · los siete motores hechos, falta la API            |
| **Pruebas**    | 226 unitarias y de base de datos · 16 de extremo a extremo |
| **Rama**       | `m2-nucleo-tecnico`, se fusiona con M2 entero              |
| **Publicado**  | web viva, con Sentry escuchando                            |

---

## 2 · Qué hay que hacer

### Ahora

**Nada.** No hay preguntas abiertas ni decisiones inventadas esperando
validación. M2 sigue en su rama.

Al fusionar M2 se aplicarán a Supabase **las cuatro migraciones fiscales**
(`0011` a `0014`), que hoy solo están probadas contra Postgres efímero. Primero
fusionar, después aplicar.

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No es que falte el dato: es
que **no existe un dato único**, porque dependen del bien y de la operación.
Hacen falta tantas reglas como categorías distinga cada tarifa. **Cuando
aparezcan se añaden como filas, sin tocar código.**

Mientras tanto el motor devuelve «sin regla» y para, en vez de inventarse un
tipo. Está en [`docs/decisiones/0006`](docs/decisiones/0006-el-motor-fiscal.md).

### Sin prisa

| Qué                                                                   | Cuándo            |
| --------------------------------------------------------------------- | ----------------- |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes |
| Conseguir los SVG de marca (los PNG están, pero pesan de más)         | **M3**            |
| Borrar las ramas ya fusionadas en GitHub                              | cuando quieras    |
| Regenerar las claves de Google, que pasaron por un chat               | M27               |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ · `/app/` · `/carta/` · `/admin/`
Hasta que haya `estook.com`; entonces basta con declarar `VITE_BASE` a `/`.

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito. Proyecto nuevo; el de la versión 1 sigue apagado y sin tocar.

Comprobado con `pnpm bd:comprobar` contra la base de datos de verdad:

| Qué                            | Cuánto                                       |
| ------------------------------ | -------------------------------------------- |
| Migraciones aplicadas          | 10 de 10                                     |
| Tablas en el esquema `estook`  | 14, **todas con seguridad por filas**        |
| Roles · permisos · concesiones | 12 · 33 · 166                                |
| Datos de ejemplo               | 2 organizaciones, 7 locales, 7 personas      |
| Tablas sueltas en `public`     | **0**                                        |
| El area manager ve             | **exactamente 3 locales**                    |
| La auditoría                   | añadir sí · modificar **no** · borrar **no** |

La conexión va por el agrupador de sesión de Supabase, porque la conexión directa
de los proyectos nuevos solo funciona por IPv6.

**Errores:** proyecto `estook-app` en Sentry, con solo «Error monitoring»
encendido y el repositorio enlazado. Comprobado en lo publicado: Sentry está
dentro, con su DSN, y cada aplicación se identifica con el commit exacto que se
publicó, para que Sentry pueda señalar qué cambio provocó un fallo.

**Variables del repositorio** (GitHub → Settings → Secrets and variables →
Actions → Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_APP_URL` y `VITE_SENTRY_DSN`, las cuatro declaradas. `VITE_BASE` y
`VITE_VERSION` no hacen falta: las rellena solo el flujo de publicación. **En
Secrets no hay nada**, y es correcto: lo verdaderamente secreto vive solo en
Supabase. Todo en [`config/claves.md`](config/claves.md).

**El peso real de lo publicado:** 72 KB comprimidos por aplicación, de 250
permitidos. Medido descargándolo, no calculado.

---

## 4 · Qué hizo cada módulo

### M0 · Cimientos y disciplina

Monorepo con las cuatro aplicaciones arrancando · TypeScript estricto · ESLint,
Prettier y reglas de dependencia entre capas · migraciones numeradas y reversibles
con ejecutor propio · tres entornos más el de demostración · banderas de función ·
Sentry y registro con su hilo de sesión · integración continua que bloquea ·
publicación en GitHub Pages de las cuatro aplicaciones bajo un dominio.

Las reglas se probaron **incumpliéndolas a propósito**: un import prohibido entre
capas, un `Math.round()` sobre dinero (regla 9) y un `new Date()` en el navegador
(regla 10). Las tres saltaron.

### M1 · Modelo maestro: alcances, roles y permisos

Cuatro niveles de alcance (organización, área, local, persona) · membresías con
vigencia · los doce roles · 33 permisos en tres familias · herencia y recorte
local a local · `locales_visibles` · seguridad por filas escrita contra ella ·
auditoría que solo sabe añadir · catálogo maestro con sus tres políticas ·
traducciones · dispositivos con revocación.

**Los tres niveles** (sin acceso · ver · ver y editar) forman una escalera, y eso
es lo que hace que «si alguien tiene dos roles sobre el mismo local, gana el más
amplio» se resuelva comparando, permiso a permiso.

Lo que queda demostrado con pruebas, contra Postgres de verdad:

- Un area manager ve **exactamente** sus tres locales.
- El bar independiente no ve ni un local, ni una organización, ni una persona de
  la cadena. Pedir un local ajeno por su identificador devuelve vacío.
- **Sin decir quién pregunta no se ve absolutamente nada.**
- Una membresía caducada, o que aún no empieza, no da acceso.
- El cocinero no ve ningún importe. El camarero no ve costes, ni ventas, ni el
  cuadrante completo, ni datos de otros.
- El jefe de sala propone cambios en la carta pero **no los publica**.
- Compras central **no puede cerrar recuentos** (conflicto de interés conocido).
- **Nadie**, ni la dirección, ve los directos ajenos del chat.
- La auditoría no se deja modificar ni borrar, ni por permisos ni por su guardián.
- La identidad **no sobrevive** a la transacción, así que no se filtra a la
  siguiente petición.
- Las diez migraciones se aplican, se deshacen enteras y se vuelven a aplicar.

**M1 es el módulo del modelo, no del comportamiento.** Cuatro tablas están
creadas y protegidas pero todavía sin usar, a propósito. Quién les da vida:

| Tabla                  | Módulo                                     |
| ---------------------- | ------------------------------------------ |
| `auditoria`            | **M2** · la escribe cada comando           |
| `dispositivo`          | **M4** · sesiones, PIN y revocación        |
| `traduccion`           | **M9** · fichas técnicas traducibles       |
| `politica_de_catalogo` | **M24** · propagación del catálogo maestro |

---

## 5 · Cómo trabajamos

1. **Primero fusionar, después aplicar a Supabase.** La base de datos nunca va
   por delante del código.
2. **«Terminado» solo cuando además no queden preguntas abiertas.**
3. **Una rama por módulo**, y un solo pull request al final.
4. **Ante la duda, preguntar** antes de construir, y preguntar explicado.
5. **Revisar lo propio antes de entregarlo.** Y `ESTADO.md` no puede afirmar
   nada que no sea cierto en ese momento.

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/):

| Núm      | Qué                                                               |
| -------- | ----------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify, con la dirección de hoy           |
| **0002** | La API en Hono sobre Supabase Edge Functions                      |
| **0003** | M0 crea el esqueleto mínimo de alcances                           |
| **0004** | El presupuesto de velocidad de B7, reconstruido                   |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción |

Otras de M1, sin fichero propio:

- **La matriz de permisos vive solo en la base de datos.** `packages/permisos`
  tiene el vocabulario, no los niveles (regla 6). Una prueba comprueba que los
  dos catálogos cuadran.
- **Las funciones de visibilidad son `security definer`**, o la política de
  `membresia` entra en recursión infinita consigo misma. Pasó de verdad.
- **No se usa `force row level security`**: rompería las semillas y no hace falta.
- **Sesión y correlación son cosas distintas.** Una sesión es una visita; una
  correlación, una acción dentro de ella. Las correlaciones por acción las pone
  en marcha M2.
- **Dependencia nueva justificada:** `@electric-sql/pglite`, solo de desarrollo,
  para tener «Postgres efímero» sin depender de Docker.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/`
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js`
- `herramientas/comprueba-publicacion.mjs`
- **Las migraciones `0001` a `0010`. Están aplicadas en Supabase: se amplían con
  una `0011`, nunca se editan** (regla 2).

Sobre el candado de `main`: los nombres de las comprobaciones obligatorias van
**sin tilde** — `Calidad`, `Construccion y presupuestos`, `Migraciones
reversibles`. **Nunca añadir `Construir` ni `Publicar`**: ese flujo solo corre
después de fusionar, y exigirlo antes deja el botón bloqueado sin salida.

---

## 8 · M2 · dónde va

### Hecho · los siete motores

Todos en `packages/dominio`, salvo el de permisos que amplía `packages/permisos`.
Son cálculo puro: las mismas cuentas dan lo mismo en el servidor y en la pantalla,
con un solo dueño (regla 6).

| Motor         | Qué resuelve                                                                               |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Dinero**    | Céntimos enteros. Reparte sin perder ni ganar: el que sobra, a la primera línea            |
| **Tiempo**    | La fecha operativa, con zona y hora de corte. Probado en las dos noches del cambio de hora |
| **Coste**     | `precio ÷ (factor × rendimiento)` y precio medio ponderado                                 |
| **Fiscal**    | IVA, IGIC e IPSI. Reglas versionadas, nunca recalcula el pasado                            |
| **Textos**    | Español de España, sin jerga y sin emojis. Y el catálogo de errores en cristiano           |
| **Permisos**  | El servidor no envía lo que el rol no puede ver: los campos se quitan, no se vacían        |
| **Recálculo** | El orden: precio, elaboración, plato, margen, aviso. Una cola por producto                 |

**La trampa que resolvió el motor de coste:** 0,0039 €/g no cabe en céntimos
enteros. Hay dos tipos y el compilador no deja mezclarlos: `Centimos` para
dinero, `Milesimas` para un precio por unidad. Se redondea una sola vez, al
final.

### Falta · la API

Versionada con compatibilidad N−2 · comandos y consultas · validación con
esquemas · **idempotencia por cabecera** · bandeja de salida transaccional y
publicador de eventos · workers con reintento · control optimista por versión ·
cliente tipado.

**Terminado cuando:** el mismo comando tres veces con la misma clave produce un
solo efecto; y el motor fiscal desglosa una fórmula con tipos mixtos cuadrando al
céntimo (esto último, hecho y probado).

**Deuda que hereda de M1:** el criterio de M1 dice «devuelve vacío **y 403**». El
vacío está hecho y probado; el 403 lo devuelve la API.

**Antes de escribir la primera línea de la API:** leer
[`docs/decisiones/0005`](docs/decisiones/0005-como-se-conecta-la-api.md). El fallo
que evita no da error, da datos de más.
