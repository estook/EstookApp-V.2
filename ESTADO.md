# ESTADO DEL PROYECTO

Última actualización: 1 de septiembre de 2026

> Este fichero es la memoria del proyecto. Se lee lo primero de cada sesión y se
> escribe lo último. Si una conversación se corta, el contexto se recupera aquí.

## Dónde estamos

**M1 · Modelo maestro: alcances, roles y permisos — terminado, probado y aplicado
en Supabase.** Falta fusionar la rama `m1-fogon-y-cuadrantes`.

Módulos terminados: **M0 ✓** · **M1 ✓** (con una salvedad, más abajo)

Siguiente: **M2 · Núcleo técnico y motores transversales.** No empezado a
propósito: Richi pidió cerrar y pulir M1 antes.

## Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ — las cuatro aplicaciones
respondiendo. Hasta que haya `estook.com`.

**Base de datos:** proyecto de Supabase `efgtzujwjztihyiwgpwg`, región Europa
(eu-west-1), plan gratuito. Es un proyecto **nuevo**; el anterior, con las
funciones `correo`, `fogon` y `lugares` de la versión 1, sigue apagado y sin
tocar.

Lo que hay creado ahí, comprobado con `pnpm bd:comprobar`:

| Qué                            | Cuánto                                                  |
| ------------------------------ | ------------------------------------------------------- |
| Migraciones aplicadas          | 10 de 10                                                |
| Tablas en el esquema `estook`  | 14, **todas con seguridad por filas**                   |
| Roles · permisos · concesiones | 12 · 33 · 166                                           |
| Organizaciones de ejemplo      | Bar Centro (1 local) y Grupo Costa (6 locales, 2 áreas) |
| Personas de ejemplo            | 7                                                       |
| Tablas en el esquema `public`  | **0**                                                   |

Y las dos comprobaciones que importan, contra la base de datos de verdad:

- El area manager ve **exactamente 3 locales**. La dirección, 6. El jefe de
  cocina, 1. La camarera, 1.
- La auditoría: añadir **sí**, modificar **no**, borrar **no**.

La conexión se hace por el **agrupador de sesión** de Supabase
(`aws-1-eu-west-1.pooler.supabase.com:5432`), porque la conexión directa de los
proyectos nuevos solo va por IPv6. `conexion.mjs` lo detecta y apaga las consultas
preparadas, que el agrupador no lleva bien.

## Qué hizo M1

| Lo que pedía el Plan                              | Dónde está                                    |
| ------------------------------------------------- | --------------------------------------------- |
| Usuarios (el cuarto alcance: persona)             | `0002_personas_y_membresias.sql`              |
| Membresías con alcance y vigencia                 | idem                                          |
| Los doce roles                                    | idem                                          |
| Herencia de permisos y recorte por local          | `0003`, `0004`, `0009`                        |
| La función `locales_visibles`                     | `0005_quien_ve_que.sql`                       |
| RLS en todas las tablas contra `locales_visibles` | `0008_politicas_de_seguridad.sql`             |
| Auditoría append-only                             | `0006_auditoria.sql`                          |
| Catálogo maestro con sus tres políticas           | `0007_traducciones_dispositivos_catalogo.sql` |
| Traducciones y dispositivos con revocación        | idem                                          |
| La matriz compartida cliente/servidor             | `packages/permisos/`, `packages/dominio/`     |

**93 pruebas, todas pasando**, contra Postgres de verdad y con `set role
estook_api`, que es como se conectará la API. Nada se prueba desde una pantalla.

## El repaso de la matriz · qué salió

Richi pidió repasarla «por si algo se me escapa». Salieron cinco cosas. Las cinco
están resueltas: dos en la migración `0009` y tres en la `0010`.

### Arregladas

1. **Una acción no puede estar en «ver».** Publicar la carta o se puede o no se
   puede; decir que alguien tiene «ver» sobre publicar no significa nada. No se
   cambió el vocabulario del Manifiesto (los tres estados forman una escalera, y
   es lo que hace que «gana el más amplio» se resuelva comparando): se cerró la
   puerta a la combinación absurda, con su prueba.

2. **`dato.coste_de_genero` metía dos cosas en el mismo saco.** Se separó en
   `dato.precio_de_compra` y `dato.coste_de_plato`, porque hay roles que
   necesitan lo uno y no lo otro:
   - La gestoría exporta «compras», así que ve precios; pero el documento dice
     que «no ve fichas técnicas, ni recetas», o sea, ni costes de plato ni
     márgenes. Con un solo permiso eso no se podía expresar.
   - Compras central lleva «la comparativa de precios» pero «nada de recetas».

### Resueltas por Richi el 1 de septiembre · migración `0010`

3. **Fogón lo usa todo el mundo, pero no todos igual.** Encaja en la escalera que
   ya existía, sin inventar vocabulario:
   - **`ver` · Fogón acotado.** Pregunta y explica lo que esa persona ya ve en
     pantalla («explícame esto», «explica lo que ves»). No propone cambios ni
     rellena. Lo tienen **camarero y cocinero**.
   - **`ver_y_editar` · Fogón completo.** Además propone y rellena, y una persona
     aprueba (principio 10). Lo tienen **jefe de sala** (igual que el jefe de
     cocina, tal como pidió Richi), jefe de cocina, gerente, area manager,
     dirección, chef corporativo, compras central y RRHH.
   - **Sin Fogón:** gestoría (su vista son cuatro cosas y ninguna rueda) y
     administrador de cuenta (sin operación diaria). Es lectura mía, fácil de
     cambiar si hace falta.

   Sigue valiendo el principio 11: Fogón ve exactamente lo que ve quien pregunta.
   El acotado no ve menos datos, **hace menos cosas**; los datos los siguen
   filtrando los permisos de siempre, y hay una prueba que lo comprueba.

4. **Marcar un plato agotado lo hace cualquiera del local.** Camarero, cocinero,
   jefe de sala, jefe de cocina y gerente. Palabras de Richi: «entre ellos
   también se ayudan». En un local pequeño no hay fronteras rígidas entre sala y
   cocina, y quien ve que se ha acabado el pulpo lo apunta, sea quien sea. Lo
   mismo vale para apuntar una merma.

5. **Los dos jefes llevan los dos cuadrantes.** «Hay ocasiones en que uno hace
   los dos», así que jefe de sala y jefe de cocina pueden con el de sala y el de
   cocina, por separado o juntos. Deja de ser una simplificación pendiente: es la
   decisión.

   **Lo que queda para M14 es cómo se ENSEÑA**, no quién puede: junto, separado
   por sección o individual, con su resumen en el Panel, y todo personalizable.
   Eso es presentación y no toca estos permisos.

   Cuidado con no confundir dos cosas que siguen siendo distintas: ver **tu**
   turno y con quién lo haces lo tiene todo el mundo (sale en el Panel del
   camarero tal como lo dibuja el documento de Roles); ver el **cuadrante
   completo** del local es otra cosa, y el documento dice expresamente que un
   camarero no lo tiene.

## La salvedad de M1

El criterio dice «devuelve vacío **y 403**». El vacío está hecho y probado. El
403 lo devuelve una API, y la API se construye en M2. **Deuda explícita de M2**,
con su prueba pendiente.

## Decisiones tomadas

En `docs/decisiones/`: **0001** Pages en vez de Netlify · **0002** la API en Hono
sobre Supabase Edge Functions · **0003** el esqueleto mínimo de alcances en M0 ·
**0004** el presupuesto de velocidad reconstruido.

De M1, anotadas aquí:

- **Quién pregunta se declara en la conexión**, con `set local estook.persona_id`,
  y no con `auth.uid()`. Así el modelo se prueba en cualquier Postgres. M4
  conectará Supabase Auth con esto.
- **La matriz vive solo en la base de datos.** `packages/permisos` tiene el
  vocabulario, no los niveles (regla 6). Una prueba comprueba que cuadran.
- **Las funciones de visibilidad son `security definer`**, o la política de
  `membresia` entra en recursión infinita consigo misma. Pasó de verdad.
- **No se usa `force row level security`**: rompería las semillas, y no hace falta
  porque la API se conecta como `estook_api`, que no es el dueño.
- **Dependencia nueva justificada:** `@electric-sql/pglite`, solo de desarrollo,
  para tener el «Postgres efímero» que pide el Plan sin depender de Docker.

## Lo que falta, y es cosa de Richi

| #   | Qué                                                               | Cuándo      |
| --- | ----------------------------------------------------------------- | ----------- |
| 1   | Fusionar la rama `m1-fogon-y-cuadrantes`                          | ahora       |
| 2   | ~~Contestar las preguntas del repaso~~ · hecho el 1 de septiembre | ✓           |
| 3   | Declarar las variables públicas del repositorio en GitHub         | antes de M4 |
| 4   | Apagar «Automatically expose new tables» en Supabase              | sin prisa   |
| 5   | Conseguir los SVG de marca (los PNG ya están, pero pesan)         | **M3**      |
| 6   | Regenerar las claves de Google, que pasaron por un chat           | M27         |

Las variables del repositorio (Settings → Secrets and variables → Actions →
Variables) son estas, y son públicas por naturaleza:

```
VITE_SUPABASE_URL       https://efgtzujwjztihyiwgpwg.supabase.co
VITE_SUPABASE_ANON_KEY  la clave publicable del panel de Supabase
VITE_APP_URL            https://estook.github.io/EstookApp-V.2/
```

`VITE_BASE` no hace falta declararla: el flujo de publicación la deduce del
nombre del repositorio.

Nota sobre el candado de `main`: los nombres van **sin tilde** y tienen que
coincidir exactamente: `Calidad`, `Construccion y presupuestos`, `Migraciones
reversibles`. Nunca añadir `Construir` ni `Publicar`.

## Lo que NO hay que tocar

- `packages/utiles/src/` (M0) · `base-de-datos/herramientas/` (M0)
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js` (M0)
- `herramientas/comprueba-publicacion.mjs` (M0)
- **Las migraciones `0001` a `0009`. Ya están aplicadas en Supabase: se amplían
  con una `0010`, nunca se editan** (regla 2).

## El siguiente paso · M2

**Núcleo técnico y motores transversales.** API versionada con compatibilidad
N−2 · comandos y consultas · validación con esquemas · catálogo de errores en
cristiano · idempotencia por cabecera · bandeja de salida transaccional y
publicador de eventos · workers con reintento · control optimista por versión ·
cliente tipado · y los siete motores: fiscal, dinero, unidades y coste, tiempo,
textos, permisos y recálculo.

**Terminado cuando.** El mismo comando tres veces con la misma clave produce un
solo efecto; y el motor fiscal desglosa una fórmula con tipos mixtos cuadrando al
céntimo.

**Deuda que hereda de M1:** traducir a `403` la consulta cruzada entre
organizaciones, con su prueba llamando a la API a pelo.

La API se escribe en Hono y se despliega como Supabase Edge Functions (decisión
0002). Sin proceso largo, así que los workers van por cola en tabla más `pg_cron`.
