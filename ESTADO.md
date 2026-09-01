# ESTADO DEL PROYECTO

Última actualización: 1 de septiembre de 2026

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Si una conversación se corta, el contexto se recupera aquí.

---

## 1 · Dónde estamos

|                |                                                           |
| -------------- | --------------------------------------------------------- |
| **Terminados** | **M0 ✓** cimientos · **M1 ✓** alcances, roles y permisos  |
| **Siguiente**  | **M2** · núcleo técnico y motores transversales           |
| **Pruebas**    | 98 unitarias y de base de datos · 16 de extremo a extremo |
| **`main`**     | limpio · falta fusionar `m1-sesion-y-correlacion`         |
| **Publicado**  | web republicada, con las tres variables llegando          |

M2 no se ha empezado a propósito: Richi pidió cerrar y pulir M1 antes.

---

## 2 · Qué hay que hacer

### Ahora

**Fusionar `m1-sesion-y-correlacion`**, que es lo último de M1:
https://github.com/estook/EstookApp-V.2/compare/main...m1-sesion-y-correlacion

Después de eso no queda nada: ni ramas sueltas, ni preguntas abiertas, ni
decisiones inventadas esperando validación. Se puede empezar M2.

### Sin prisa

| Qué                                                                            | Cuándo hace falta       |
| ------------------------------------------------------------------------------ | ----------------------- |
| Quitar «Automatically expose new tables» en Supabase → Settings → API          | antes de tener clientes |
| Conseguir los SVG de marca (los PNG están, pero pesan 20 veces el presupuesto) | **M3**                  |
| Borrar las cuatro ramas ya fusionadas en GitHub, para no acumular              | cuando quieras          |
| Regenerar las claves de Google, que pasaron por un chat                        | M27                     |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ — las cuatro aplicaciones
respondiendo (`/`, `/app/`, `/carta/`, `/admin/`). Hasta que haya `estook.com`;
entonces se declara la variable `VITE_BASE` con el valor `/` y ya está.

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito. Proyecto **nuevo**; el de la versión 1 (con `correo`, `fogon` y
`lugares`) sigue apagado y sin tocar.

Comprobado con `pnpm bd:comprobar` contra la base de datos de verdad:

| Qué                            | Cuánto                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| Migraciones aplicadas          | 10 de 10                                                            |
| Tablas en el esquema `estook`  | 14, **todas con seguridad por filas**                               |
| Roles · permisos · concesiones | 12 · 33 · 166                                                       |
| Datos de ejemplo               | Bar Centro (1 local) y Grupo Costa (6 locales, 2 áreas), 7 personas |
| Tablas sueltas en `public`     | **0**                                                               |
| El area manager ve             | **exactamente 3 locales**                                           |
| La auditoría                   | añadir sí · modificar **no** · borrar **no**                        |

La conexión va por el **agrupador de sesión** de Supabase, porque la conexión
directa de los proyectos nuevos solo funciona por IPv6. `conexion.mjs` lo detecta,
apaga las consultas preparadas (que el agrupador no lleva bien) y avisa en
cristiano si `DATABASE_URL` sigue siendo la plantilla.

**Variables del repositorio** (GitHub → Settings → Secrets and variables →
Actions → **Variables**), las tres declaradas:

```
VITE_SUPABASE_URL        https://efgtzujwjztihyiwgpwg.supabase.co
VITE_SUPABASE_ANON_KEY   la clave publicable
VITE_APP_URL             https://estook.github.io/EstookApp-V.2/
```

`VITE_BASE` no hace falta: el flujo de publicación la deduce del nombre del
repositorio. Y la clave `sb_secret_` **nunca** va en GitHub: vive solo en los
secretos de Supabase. Todo en [`config/claves.md`](config/claves.md).

---

## 4 · Qué hizo cada módulo

### M0 · Cimientos y disciplina

Monorepo pnpm + Turborepo con las cuatro aplicaciones arrancando · TypeScript
estricto · ESLint, Prettier y dependency-cruiser con las reglas de A4 ·
migraciones numeradas y reversibles con ejecutor propio · tres entornos más el de
demostración · banderas de función · Sentry y registro con su hilo de sesión ·
integración continua que bloquea por tipos, lint, formato, dependencias, pruebas,
tamaño y publicación · publicación en GitHub Pages de las cuatro aplicaciones bajo
un dominio.

**Las reglas se probaron incumpliéndolas a propósito:** un import prohibido entre
capas, un `Math.round()` sobre dinero (regla 9) y un `new Date()` en el navegador
(regla 10). Las tres saltaron.

**Un fallo real, y su vacuna:** la primera publicación salió en blanco porque el
HTML pedía los ficheros en la dirección equivocada. Ahora
`herramientas/comprueba-publicacion.mjs` compara lo construido con dónde se
publica y **bloquea** si no cuadran.

### M1 · Modelo maestro: alcances, roles y permisos

| Lo que pedía el Plan                               | Dónde está                                |
| -------------------------------------------------- | ----------------------------------------- |
| Usuarios (el cuarto alcance: persona)              | `0002_personas_y_membresias.sql`          |
| Membresías con alcance y vigencia · los doce roles | idem                                      |
| Herencia de permisos y recorte por local           | `0003`, `0004`, `0009`, `0010`            |
| La función `locales_visibles`                      | `0005_quien_ve_que.sql`                   |
| Auditoría append-only                              | `0006_auditoria.sql`                      |
| Catálogo maestro, traducciones y dispositivos      | `0007_...`                                |
| RLS en todas las tablas contra `locales_visibles`  | `0008_politicas_de_seguridad.sql`         |
| La matriz compartida cliente/servidor              | `packages/permisos/`, `packages/dominio/` |

**Los tres niveles:** sin acceso · ver · ver y editar. Forman una escalera, y eso
es lo que hace que «si alguien tiene dos roles sobre el mismo local, gana el más
amplio» se resuelva comparando, permiso a permiso.

**M1 es el módulo del modelo, no del comportamiento.** Cuatro de sus tablas están
creadas, protegidas y probadas, pero todavía no las usa ningún código, y es a
propósito. Queda anotado quién les da vida, para que no se queden atrás:

| Tabla                  | Quién la usa, y cuándo                                      |
| ---------------------- | ----------------------------------------------------------- |
| `auditoria`            | **M2** la escribe desde cada comando                        |
| `dispositivo`          | **M4** · sesiones, PIN y revocación                         |
| `traduccion`           | **M9** · fichas técnicas traducibles, con Fogón proponiendo |
| `politica_de_catalogo` | **M24** · propagación y adopción del catálogo maestro       |

**33 permisos** en tres familias: `app.*` (las ocho apps más Panel, Fogón, Ajustes
y la vista de gestoría), `dato.*` (lo sensible) y `accion.*` (lo que se ejecuta).

**98 pruebas**, contra Postgres de verdad y haciendo `set role estook_api`, que es
lo que hará la API en cada transacción (decisión 0005). Lo que queda demostrado:

- Un area manager ve **exactamente** sus tres locales.
- El bar independiente no ve ni un local, ni una organización, ni una persona de
  la cadena. Pedir un local ajeno por su identificador devuelve vacío.
- **Sin decir quién pregunta no se ve absolutamente nada.**
- Una membresía caducada, o que aún no empieza, no da acceso.
- El cocinero no ve ningún importe. El camarero no ve costes, ni ventas, ni el
  cuadrante completo, ni datos de otros.
- El jefe de sala propone cambios en la carta pero **no los publica**.
- Compras central **no puede cerrar recuentos**.
- **Nadie**, ni la dirección, ve los directos ajenos del chat.
- La auditoría no se deja modificar ni borrar: ni por permisos ni por su guardián.
- Las diez migraciones se aplican, se deshacen enteras y se vuelven a aplicar.

### El repaso de la matriz · las cinco cosas que salieron

Todas resueltas.

1. **Una acción no puede estar en «ver».** Publicar o se puede o no se puede. No
   se cambió el vocabulario del Manifiesto: se cerró la combinación absurda.
2. **`dato.coste_de_genero` mezclaba dos cosas.** Separado en
   `dato.precio_de_compra` y `dato.coste_de_plato`, porque la gestoría ve compras
   pero «no ve fichas técnicas ni recetas», y compras central lleva precios pero
   «nada de recetas».
3. **Fogón:** acotado (`ver`) para camarero y cocinero — explica lo que ya ven, no
   propone ni rellena. Completo (`ver_y_editar`) para jefe de sala, jefe de
   cocina, gerente, area manager, dirección, chef corporativo, compras central y
   RRHH. Sin Fogón: gestoría y administrador de cuenta. El acotado **no ve menos
   datos, hace menos cosas**; los datos los siguen filtrando los permisos.
4. **Marcar agotado y apuntar mermas lo hace cualquiera del local.** «Entre ellos
   también se ayudan.»
5. **Los dos jefes llevan los dos cuadrantes**, sala y cocina, juntos o por
   separado. Lo que queda para M14 es **cómo se enseña** (junto, separado,
   individual, resumen en el Panel, personalizable), que es presentación.

---

## 4 bis · Sesión y correlación · un fallo de concepto que cazó una pregunta

Richi vio que el número de la pantalla cambiaba en cada recarga y preguntó si era
normal. **Lo es.** Pero al comprobarlo apareció que la pantalla lo llamaba
«correlación» cuando en realidad era otra cosa, y que el código mezclaba dos
ideas distintas:

|                 | Qué es              | Cuándo nace                 |
| --------------- | ------------------- | --------------------------- |
| **Sesión**      | Una visita entera   | Al abrir la aplicación      |
| **Correlación** | Una acción concreta | Al pulsar algo que se envía |

Una sesión contiene muchas correlaciones. Si hubiera **una sola** para toda la
visita —que es lo que había—, en un turno de ocho horas ese número no
distinguiría nada: todas las líneas del registro compartirían el mismo, y
rastrear una operación concreta sería imposible. Justo lo contrario de para lo
que existe.

Corregido: la pantalla dice **SESIÓN**, `packages/utiles` distingue los dos
conceptos con sus cabeceras (`x-sesion-id` y `x-correlacion-id`), y hay tres
pruebas que fijan la diferencia. **Las correlaciones por acción las pone en
marcha M2**, que es donde nace la API y donde empieza a haber acciones que
enviar.

---

## 5 · Cómo trabajamos

Tres reglas de proceso que salieron de repasar los pasos dados, no solo el
código. Las tres son correcciones a errores propios.

1. **Primero fusionar, después aplicar a Supabase.** La migración `0010` estuvo
   horas viva en la base de datos mientras su fichero seguía en una rama sin
   fusionar. Eso es la base de datos contando una historia y el código contando
   otra. El orden correcto: verificar contra el Postgres de usar y tirar →
   fusionar → y **solo entonces** aplicar a Supabase.

2. **«Terminado» solo cuando además no queden preguntas abiertas.** M1 se declaró
   terminado y se reabrió dos veces. No rompió nada porque no se avanzó de
   módulo, pero la palabra pierde valor. Terminado = pasa su lista de aceptación
   **y** no hay nada esperando respuesta de Richi.

3. **Una rama por módulo.** M1 acabó en cuatro ramas, y eso son cuatro rondas de
   botones para Richi. El Plan dice `mNN-lo-que-hace`. **Desde M2: una sola rama
   por módulo, y un solo pull request al final.** La integración continua corre
   en todas las ramas, así que no se pierde ninguna red de seguridad.

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/):

|          |                                                                        |
| -------- | ---------------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify, con la dirección de hoy                |
| **0002** | La API en Hono sobre Supabase Edge Functions. Se implementa en M2      |
| **0003** | M0 crea el esqueleto mínimo de alcances, para que las semillas existan |
| **0004** | El presupuesto de velocidad de B7, reconstruido                        |
| **0005** | Cómo se conecta la API: `set local role` y `set local` en transacción  |

De M1, sin fichero propio:

- **Quién pregunta se declara en cada transacción**, con `set local
estook.persona_id`, no con `auth.uid()`. Así el modelo se prueba en cualquier
  Postgres. M4 conectará Supabase Auth con esto. **El detalle completo, y por qué
  `set local` y no `set`, está en la decisión 0005: es una decisión de seguridad,
  no de comodidad.**
- **La matriz vive solo en la base de datos.** `packages/permisos` tiene el
  vocabulario, no los niveles (regla 6: un cálculo, un único dueño). Una prueba
  comprueba que los dos catálogos cuadran.
- **Las funciones de visibilidad son `security definer`**, o la política de
  `membresia` entra en recursión infinita consigo misma. Pasó de verdad.
- **No se usa `force row level security`**: rompería las semillas, y no hace falta
  porque la API se conecta como `estook_api`, que no es el dueño de las tablas.
- **Dependencia nueva justificada:** `@electric-sql/pglite`, solo de desarrollo,
  para tener el «Postgres efímero» que pide el Plan sin depender de Docker.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin una decisión escrita:

- `packages/utiles/src/` — entorno, banderas, correlación y registro (M0).
- `base-de-datos/herramientas/` — migrar, sembrar, comprobar, conexión (M0).
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js` (M0).
- `herramientas/comprueba-publicacion.mjs` (M0).
- **Las migraciones `0001` a `0010`. Están aplicadas en Supabase: se amplían con
  una `0011`, nunca se editan** (regla 2).

Sobre el candado de `main`: los nombres de las comprobaciones obligatorias van
**sin tilde** y coinciden exactamente con `Calidad`, `Construccion y
presupuestos`, `Migraciones reversibles`. **Nunca añadir `Construir` ni
`Publicar`**: ese flujo solo corre después de fusionar, y exigirlo antes deja el
botón bloqueado sin salida.

---

## 8 · El siguiente paso · M2

**Núcleo técnico y motores transversales.** Lo que entra, según el Plan:

- **La API:** versionada con compatibilidad N−2 · comandos y consultas ·
  validación con esquemas · catálogo de errores en cristiano · idempotencia por
  cabecera.
- **Los cimientos de los eventos:** bandeja de salida transaccional y publicador ·
  workers con reintento · control optimista por versión · cliente tipado.
- **Los siete motores:** fiscal (tipos con vigencia, IVA/IGIC/IPSI, prorrateo en
  fórmulas) · dinero (céntimos y reparto determinista) · unidades y coste
  (`precio ÷ (factor × rendimiento)` y precio medio ponderado) · tiempo (fecha
  operativa, hora de corte, cambio de hora) · textos · permisos · recálculo.

**Terminado cuando:** el mismo comando tres veces con la misma clave produce un
solo efecto; y el motor fiscal desglosa una fórmula con tipos mixtos cuadrando al
céntimo.

**Deuda que hereda de M1:** el criterio de M1 dice «devuelve vacío **y 403**». El
vacío está hecho y probado; el 403 lo devuelve una API, que no existía. M2 tiene
que traducirlo y escribir la prueba llamando a la API a pelo.

**Recordatorios:** la API se escribe en Hono y se despliega como Supabase Edge
Functions (decisión 0002). Sin proceso largo, así que los workers van por cola en
tabla más `pg_cron`. Y el motor de permisos ya tiene su fuente de verdad en la
base de datos: M2 lo que hace es servirla, no recalcularla.
