# ESTADO DEL PROYECTO

Última actualización: 1 de septiembre de 2026

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Si una conversación se corta, el contexto se recupera aquí.

---

## 1 · Dónde estamos

|                       |                                                           |
| --------------------- | --------------------------------------------------------- |
| **Terminados**        | **M0 ✓** cimientos · **M1 ✓** alcances, roles y permisos  |
| **Siguiente**         | **M2** · núcleo técnico y motores transversales           |
| **Pruebas**           | 93 unitarias y de base de datos · 16 de extremo a extremo |
| **Rama sin fusionar** | `m1-fogon-y-cuadrantes`                                   |

M2 no se ha empezado a propósito: Richi pidió cerrar y pulir M1 antes.

---

## 2 · Qué hay que hacer

### Ahora

1. **Fusionar `m1-fogon-y-cuadrantes`.** Es lo único que separa lo escrito de
   `main`: https://github.com/estook/EstookApp-V.2/compare/main...m1-fogon-y-cuadrantes

2. **Comprobar que las variables llegaron.** Tras fusionar, la web se republica
   sola. Abre https://estook.github.io/EstookApp-V.2/ y mira la línea **«Base de
   datos»**: tiene que poner **configurada**. Si pone «sin configurar», es que
   falta alguna de las tres variables del repositorio.

### Sin prisa

| Qué                                                                            | Cuándo hace falta       |
| ------------------------------------------------------------------------------ | ----------------------- |
| Quitar «Automatically expose new tables» en Supabase → Settings → API          | antes de tener clientes |
| Conseguir los SVG de marca (los PNG están, pero pesan 20 veces el presupuesto) | **M3**                  |
| Borrar las cuatro ramas ya fusionadas en GitHub, para no acumular              | cuando quieras          |
| Regenerar las claves de Google, que pasaron por un chat                        | M27                     |

### Nada más

No hay preguntas abiertas ni decisiones inventadas pendientes de validar.

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
demostración · banderas de función · Sentry y registro con `correlacion_id` ·
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

**33 permisos** en tres familias: `app.*` (las ocho apps más Panel, Fogón, Ajustes
y la vista de gestoría), `dato.*` (lo sensible) y `accion.*` (lo que se ejecuta).

Lo que queda demostrado con pruebas, contra Postgres de verdad y con `set role
estook_api`, que es como se conectará la API:

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

## 5 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/):

|          |                                                                        |
| -------- | ---------------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify, con la dirección de hoy                |
| **0002** | La API en Hono sobre Supabase Edge Functions. Se implementa en M2      |
| **0003** | M0 crea el esqueleto mínimo de alcances, para que las semillas existan |
| **0004** | El presupuesto de velocidad de B7, reconstruido                        |

De M1, sin fichero propio:

- **Quién pregunta se declara en la conexión**, con `set local
estook.persona_id`, no con `auth.uid()`. Así el modelo se prueba en cualquier
  Postgres. M4 conectará Supabase Auth con esto.
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

## 6 · Lo que NO hay que tocar

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

## 7 · El siguiente paso · M2

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
