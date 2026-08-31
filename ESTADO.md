# ESTADO DEL PROYECTO

Última actualización: 1 de septiembre de 2026

> Este fichero es la memoria del proyecto. Se lee lo primero de cada sesión y se
> escribe lo último. Si una conversación se corta, el contexto se recupera aquí.

## Dónde estamos

**M1 · Modelo maestro: alcances, roles y permisos — escrito y probado.**
Pendiente de fusionar en `main`.

Módulos terminados: **M0 ✓** · **M1 ✓** (con una salvedad, más abajo)

Siguiente: **M2 · Núcleo técnico y motores transversales.**

## La dirección web

**https://estook.github.io/EstookApp-V.2/** — hasta que se compre `estook.com`.
Las cuatro aplicaciones cuelgan de ahí: la web en la raíz, y `/app/`, `/carta/` y
`/admin/` debajo. Cuando haya dominio propio se declara la variable `VITE_BASE`
con el valor `/` en GitHub. No hay que tocar código.

## Qué hizo M1

Todo lo que pedía el Plan, punto por punto de su lista de «Entra»:

| Lo que pedía M1                                   | Dónde está                                                  |
| ------------------------------------------------- | ----------------------------------------------------------- |
| Usuarios (el cuarto alcance: persona)             | `0002_personas_y_membresias.sql`                            |
| Membresías con alcance y vigencia                 | idem                                                        |
| Los doce roles                                    | idem, sembrados en la propia migración                      |
| Herencia de permisos y recorte por local          | `0003_catalogo_de_permisos.sql`, `0004_matriz_de_roles.sql` |
| La función `locales_visibles`                     | `0005_quien_ve_que.sql`                                     |
| RLS en todas las tablas contra `locales_visibles` | `0008_politicas_de_seguridad.sql`                           |
| Auditoría append-only                             | `0006_auditoria.sql`                                        |
| Catálogo maestro con sus tres políticas           | `0007_traducciones_dispositivos_catalogo.sql`               |
| Traducciones                                      | idem                                                        |
| Dispositivos con revocación                       | idem                                                        |
| La matriz compartida cliente/servidor             | `packages/permisos/`, `packages/dominio/`                   |

**Los doce roles**, tal como los fija el Manifiesto: dirección, administrador de
cuenta, chef corporativo, compras central, RRHH y gestoría (organización);
area manager (área); gerente, jefe de cocina, jefe de sala, cocinero y camarero
(local).

**Los tres niveles**: sin acceso · ver · ver y editar. Un permiso que no aparece
en la matriz vale «sin acceso», y solo se guarda lo concedido, para que la tabla
se pueda leer de un vistazo.

**32 permisos** en tres familias: las ocho apps más Panel, Fogón, Ajustes y la
vista de gestoría (`app.*`); los datos sensibles (`dato.*`); y lo que se puede
ejecutar (`accion.*`).

## Qué se ha comprobado, ejecutándolo de verdad

| Comprobación                       | Resultado                               |
| ---------------------------------- | --------------------------------------- |
| `pnpm tipos`                       | 14 de 14 paquetes                       |
| `pnpm lint` · `pnpm formato`       | limpios                                 |
| `pnpm dependencias`                | sin violaciones · 46 módulos            |
| `pnpm prueba`                      | **76 de 76**                            |
| `pnpm prueba:e2e`                  | 16 de 16, escritorio y móvil pequeño    |
| `pnpm tamano` · `pnpm publicacion` | dentro del presupuesto y apuntando bien |

Las pruebas del modelo corren contra **Postgres de verdad**, con `set role
estook_api`, que es como se conecta la API. Nada se prueba desde una pantalla: la
regla 4 dice justamente eso.

Lo que queda demostrado:

- Un area manager ve **exactamente** sus tres locales, ni uno más.
- La gerente del bar independiente no ve ni un local, ni una organización, ni una
  persona de la cadena. Pedir un local ajeno por su identificador devuelve vacío.
- **Sin decir quién pregunta no se ve absolutamente nada.** Es el fallo seguro.
- Una membresía caducada, o que aún no empieza, no da acceso. Un local archivado
  desaparece de la vista de todos.
- El cocinero no ve ningún importe. El camarero no ve costes, ni ventas, ni el
  cuadrante completo, ni datos de otros.
- El jefe de sala puede proponer cambios en la carta pero **no publicarlos**.
- Compras central **no puede cerrar recuentos** (decisión 5 de la Auditoría de
  flujos: quien compra no valora su propio inventario).
- **Nadie**, ni la dirección, ve los directos ajenos del chat.
- El recorte quita un permiso que el rol traía, y también da uno que no traía.
- Con dos roles sobre el mismo local, gana el más amplio, permiso a permiso.
- La auditoría no se puede modificar ni borrar: ni por permisos (`estook_api` no
  los tiene) ni por el guardián (que alcanza incluso al dueño de la tabla).
- Las ocho migraciones se aplican, se deshacen enteras y se vuelven a aplicar.
- Sembrar dos veces no duplica nada.
- El vocabulario de la base de datos y el de TypeScript cuadran exactamente.

## La salvedad honesta

El criterio de terminado de M1 dice: «toda consulta cruzada entre organizaciones
devuelve vacío **y 403**».

La primera mitad está hecha y probada. **La segunda no puede estarlo todavía**:
un 403 lo devuelve una API, y la API se construye en M2. Hoy la base de datos
devuelve vacío, que es lo correcto a su nivel. Cuando exista la API, M2 tiene que
traducir ese vacío a un 403 con su mensaje del catálogo de errores, y hay que
escribir la prueba que lo compruebe llamando a la API a pelo.

**Queda anotado como deuda explícita de M2, no como algo olvidado.**

## Decisiones tomadas

En `docs/decisiones/`:

1. **0001 · GitHub Pages en vez de Netlify**, con la dirección de arriba.
2. **0002 · La API en Hono sobre Supabase Edge Functions.** Se implementa en M2.
3. **0003 · M0 crea el esqueleto mínimo de organización, área y local.**
4. **0004 · El presupuesto de velocidad, reconstruido.** La tabla de B7 estaba
   descolocada en el PDF. Richi confirmó que salió de una investigación con IA,
   que no hay que ser estricto y que se use como guía. Se reconstruyó conservando
   las cifras originales.

De M1, sin fichero propio pero anotadas aquí:

- **Quién pregunta se declara en la conexión**, con `set local estook.persona_id`,
  y no con `auth.uid()`. Así el modelo se puede probar en cualquier Postgres sin
  depender del esquema de autenticación de Supabase, y encaja con la decisión 0002
  (la API es nuestra). M4 conectará Supabase Auth con esto.
- **La matriz de roles vive solo en la base de datos.** `packages/permisos` tiene
  el vocabulario y las funciones de lectura, no los niveles. Es la regla 6: un
  cálculo, un único dueño. Una prueba comprueba que los dos catálogos cuadran.
- **Las funciones de visibilidad son `security definer`.** Sin eso, la política de
  `membresia` llamaría a una función que consulta `membresia`, que volvería a
  aplicar la política: recursión infinita. Pasó de verdad al escribir M1.
- **No se usa `force row level security`.** Se aplicaría también al dueño de las
  tablas, que es quien ejecuta migraciones y semillas. No hace falta: la API se
  conecta como `estook_api`, que no es el dueño.
- **La matriz se derivó frase a frase del documento de Roles**, y cada bloque de
  la migración cita la frase que lo justifica. Conviene que Richi la repase.
- **Dependencia nueva: `@electric-sql/pglite`**, solo de desarrollo. El Plan pide
  «Postgres efímero» en la capa de pruebas. Con Docker no valía: no todas las
  máquinas lo tienen, y una prueba que solo corre en una máquina acaba sin correr
  en ninguna. PGlite es Postgres compilado a WebAssembly. Además, en integración
  continua las migraciones se aplican también contra un Postgres 17 de verdad, así
  que no hay una sola vía de comprobación.

## Lo que falta, y es cosa de Richi

1. **Fusionar la rama `m1-alcances-y-permisos`.**
2. **Repasar la matriz de permisos** de `0004_matriz_de_roles.sql`. Está derivada
   del documento de Roles y cada bloque cita su frase, pero es la pieza que más
   conviene que valide una persona.
3. **Los ficheros de marca** en `packages/ui/marca/`. Se usan en M3.
4. **`DATABASE_URL` en `.env.local`** si se quiere migrar contra Supabase desde
   esta máquina.
5. **Las claves de Google han pasado por un chat** (Maps y Gemini). Hay que
   regenerarlas antes del lanzamiento. Anotado para M27.

Nota sobre el candado de `main`: los nombres de las comprobaciones obligatorias
van **sin tilde** y tienen que coincidir exactamente con los que reporta el
sistema: `Calidad`, `Construccion y presupuestos`, `Migraciones reversibles`. No
añadir nunca `Construir` ni `Publicar`: ese flujo solo corre después de fusionar,
así que exigirlo antes deja el botón bloqueado sin salida.

## Lo que NO hay que tocar

Cerrados y probados. Ampliarlos es normal; reescribirlos, no, sin una decisión
escrita en `docs/decisiones/`:

- `packages/utiles/src/` — entorno, banderas, correlación y registro (M0).
- `base-de-datos/herramientas/` — el ejecutor de migraciones y el sembrador (M0).
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js` (M0).
- `herramientas/comprueba-publicacion.mjs` (M0).
- Las migraciones `0001` a `0008`. **Ya están aplicadas en las pruebas y en
  integración continua: se amplían con una `0009`, nunca se editan** (regla 2).

## El siguiente paso · M2

**Núcleo técnico y motores transversales.** Qué entra, según el Plan:

- API versionada con compatibilidad N−2 · comandos y consultas · validación con
  esquemas · catálogo de errores en cristiano · idempotencia por cabecera.
- Bandeja de salida transaccional y publicador de eventos · workers con reintento
  · control optimista por versión · cliente tipado.
- Los siete motores: **fiscal** (tipos con vigencia, IVA/IGIC/IPSI, prorrateo en
  fórmulas), **dinero** (céntimos y reparto determinista), **unidades y coste**
  (`precio ÷ (factor × rendimiento)` y precio medio ponderado), **tiempo** (fecha
  operativa, hora de corte, cambio de hora), **textos**, **permisos** y
  **recálculo**.

**Terminado cuando.** El mismo comando tres veces con la misma clave produce un
solo efecto; y el motor fiscal desglosa una fórmula con tipos mixtos cuadrando al
céntimo.

**Deuda que M2 hereda de M1:** traducir a `403` la consulta cruzada entre
organizaciones, con su prueba llamando a la API a pelo.

Recordatorio de la decisión 0002: la API se escribe en Hono y se despliega como
Supabase Edge Functions. Sin proceso largo, así que los workers van por cola en
tabla más `pg_cron`.
