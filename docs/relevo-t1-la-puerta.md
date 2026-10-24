# Relevo · T1 · La puerta de Estook TPV (24-oct-2026)

> Lo deja la cuenta que construyó T1, al quedarse sin límite, para la otra cuenta. **Se lee
> entero antes de tocar nada.** Rama: **`t1-la-puerta`** (subida, sin pull request todavía).
> Al acabar T1, este fichero se borra en el mismo pull request (lo que importa pasa a la
> decisión 0108 y al plan).

## 1 · El prompt para la otra cuenta (copiar y pegar tal cual)

```
Sigue con Estook TPV, entrega T1 · La puerta. La empezó la otra cuenta y la ha dejado
subida en la rama `t1-la-puerta`, sin pull request. NO empieces de cero ni rehagas nada
que funcione.

Antes de tocar nada, en este orden:
1. `git status`, `git fetch`, `git branch --show-current` y los pull requests abiertos.
   Ponte en la rama `t1-la-puerta` (`git switch t1-la-puerta` y `git pull`). Si hay
   cambios sin guardar que no sean tuyos, NO los borres: pregúntame.
2. Lee entero `docs/relevo-t1-la-puerta.md` (lo que está hecho, lo que falta, las
   decisiones tomadas y la pregunta pendiente).
3. Lee ESTADO.md, la decisión `docs/decisiones/0107-estook-tpv-el-tpv-entero.md`, el
   Anexo `docs/maestros/Estook-Anexo-TPV-y-Facturacion.md` capítulo 11 (sobre todo
   11.3, 11.4, 11.5, 11.13, 11.14 y 11.15) y 3.4, y el plan
   `docs/m20a-la-sala-y-la-cocina.md` («T1 · La puerta, terminado cuando»).
4. Mira las maquetas aprobadas por Richi (pantallas 1 a 4, 11 y 16 a 23):
   https://claude.ai/artifact/EUZuQhUJSg13As8qeUWk5X  (se leen con la herramienta
   Artifact, acción read; NO se publican cambios sin pedírmelo).
5. Pasa las pruebas para ver que todo sigue en verde antes de seguir:
   `pnpm tipos`, `npx vitest run base-de-datos/pruebas/la-puerta.prueba.ts
   base-de-datos/pruebas/la-sala-y-la-cocina.prueba.ts` y, si puedes, la batería entera.

Después, termina lo que falta según la sección 3 del relevo, en este orden:
  a) Preguntarme en lenguaje llano la pregunta pendiente (sección 4: el PIN de 6 o de 4
     cifras), con las opciones y tu recomendación. NO cambies el largo del PIN sin mi
     respuesta.
  b) Los documentos (decisión 0108 con «Lo que decidí al construirlo», el plan, el Anexo
     si algo cambió, Roles 1.12, el mapa, lo-que-decidio-la-ia.md, historia de los
     módulos, lecciones si las hay, `docs/pasos-de-t1.md` con mis pasos, y ESTADO.md),
     todo en el mismo pull request.
  c) `pnpm verifica` en verde y `pnpm prueba:e2e:completa` (o al menos las pruebas de
     pantalla de la sala, la puerta, la jornada, personas y fichajes y la app instalable).
  d) Abrir el pull request de `t1-la-puerta` contra `main`, mirar GitHub entero en verde
     por dentro (sin pruebas que fallan a ratos), y darme mis pasos.

Reglas de siempre: no te inventes nada que no esté escrito; si falta algo, para y
pregúntame en lenguaje llano (qué es, de dónde sale, qué hay hecho, un ejemplo de
restaurante, las opciones y tu recomendación). Lo lógico no se pregunta: se hace y se
explica. Revisa lo tuyo antes de entregármelo. Nada entra en `main` sin pull request.
Todo en español: el chat, los documentos, los commits y el código. Pregúntame si es
necesario. Y al acabar, dame un resumen corto, lo que necesitas de mí y mis pasos
detallados (qué hacer, dónde, qué debe salir y qué hacer si falla), como hacemos
siempre: fusionar el pull request en GitHub, `git checkout main`, `git pull`,
`.\estook.cmd bd:migrar` (la migración 0083) y desplegar la API desde GitHub, cada
comando en su recuadro y sin `&&`.
```

## 2 · Lo que está hecho y probado (en la rama, sin fusionar)

**Respuesta de Richi del 23-oct (no está en ningún documento todavía):** **A · la tablet para
fichar pasa al TPV**: se vincula desde Ajustes del TPV › Aparatos como los demás (función
«Fichar») y **sale de Estook › Ajustes**. Las que ya había siguen funcionando. Y aprobó las
maquetas de T1 (pantallas 16 a 23) con «Las pantallas de T1 me valen».

**La base · `base-de-datos/migraciones/0083_la_puerta.sql`** (con su `.revertir.sql`):
- `terminal` gana las cinco funciones (`caja`, `comandero`, `cocina`, `barra`, `fichar`),
  `persona_id` (comandero personal), `cajon_id`, `version_de_la_app`, `ultimo_latido_en`,
  `tema_al_segundo`. Una caja siempre tiene cajón; un comandero, nunca (la base lo impide).
- Tablas nuevas: `cajon`, `codigo_para_vincular` (huella, 10 minutos, un uso),
  `intento_de_vincular` (20 por hora por dirección), `turno_del_operador`,
  `ajustes_del_tpv` (bloqueo), `aprobacion`. `linea_de_cuenta.aprobacion_id`.
- Permisos nuevos: `accion.vincular_aparatos` (gerente, area manager, dirección,
  administrador de cuenta) y `accion.ajustes_del_tpv` (gerente, area manager, dirección).
- Funciones con privilegio: `turno_activo`, `aparato_por_llave`, `codigo_vivo_por_huella`,
  `fichados_en_el_aparato`.
- `lo_mandado_no_se_reescribe` copiada entera de la 0081 con una sola cosa más: quitar lo
  ya mandado vale también con la aprobación de un encargado (menos de 2 minutos).

**La API:**
- `servidor/infraestructura/quien-llama.ts`: **un solo lector del token** para la API de
  verdad, la de pruebas y el despachador de las pruebas. El token de Estook TPV es
  `tpv.<turno>.<llave>` (`tokenDelAparato` en `@estook/dominio`) y se mira con
  `turno_activo`.
- Puertas nuevas en el contrato: `enElTpv: 'tambien' | 'solo'` y `enLosAparatos`. Lo que
  no lo declara **no pasa desde un aparato**; lo `'solo'` no pasa con la sesión de Estook.
  La sala entera es `'solo'`; cocina y agotados, `'tambien'`.
- `servidor/aplicacion/comandos/aparatos.ts`: `donde_puedo_vincular`,
  `vincular_el_primer_aparato` (cierra la sesión), `sacar_codigo_para_vincular`,
  `vincular_con_codigo`, `latir_el_aparato`, `entrar_con_pin`, `yo_en_el_tpv`, `bloquear`,
  `fichar_en_el_tpv` (la salida pide a quién pasar las mesas), `los_aparatos`,
  `cambiar_aparato`, `desvincular_aparato`, `guardar_pin_y_bloqueo`.
- `servidor/aplicacion/aprobaciones.ts` + `quitar_plato` con `pin_del_encargado`.
- `pinNuevo` nunca da un PIN fácil (`esPinFacil`).
- Quitados `poner_aparato_para_fichar`, `quitar_aparato_para_fichar` y
  `aparatos_para_fichar` (respuesta A).
- El toque al segundo llega a cada aparato del local (`al-segundo.ts`).

**Estook TPV (`apps/tpv`):** solo oscuro (`data-tema='tpv'`, fichas en
`packages/ui/estilos/temas.css`, medidas en `contraste.prueba.ts`); `puerta/` (vincular con
código o correo, «¿Qué es este aparato?», PIN, «No has fichado», «ya no está vinculado»);
`ganchos/usarElBloqueo.ts`; `inicio/` (inicio con las baldosas que funcionan, fichar,
agotados, la barra de arriba con Bloquear); `ajustes/` (Aparatos, añadir con código y QR,
uno con renombrar y desvincular, PIN y bloqueo); `mesa/LoApruebaUnEncargado.tsx`. La
dirección del QR `estook.com/tpv/vincular/#123456` existe al construir (`vite.config.ts`).
Un aparato «Fichar» deja su llave y se va a la pantalla de fichar de Estook
(`/app/#/aparato-para-fichar`), que ahora también es oscura (`.zona-tpv`).

**Estook (`apps/app`):** fuera «Abrir la sala» (Servicio › En marcha) y la sección «El
aparato para fichar» de Ajustes (borrado `ElAparatoParaFichar.tsx`); textos del quiosco
cambiados a «vincúlalo en Estook TPV».

**Pruebas, todas en verde el 24-oct:** `la-puerta.prueba.ts` (20, contra la base: vincular,
código, caducidad, 20 por hora, móvil de Sara, dónde cae, las dos puertas, bloqueo,
aprobación, solo quien ficha, desvincular); `la-sala-y-la-cocina.prueba.ts` (35, pasada a
aparatos); `aparatos.prueba.ts`, `despachador.prueba.ts` (la puerta por función del
aparato: «un comandero no abre el cajón»), `secretos.prueba.ts`, `contraste.prueba.ts`,
listas tasadas de `almacen.prueba.ts`; y las de pantalla `la-puerta.spec.ts` (nueva),
`la-sala.spec.ts`, `la-jornada.spec.ts`, `personas-y-fichajes.spec.ts` y
`la-app-instalable.spec.ts`: **24 de 24** en escritorio y móvil. `pnpm tipos` y el lint de
lo tocado, limpios. La batería entera de vitest se pasó a mitad (21 rojos, todos
arreglados después uno a uno); **falta volver a pasarla entera**.

## 3 · Lo que falta, exactamente

1. **La pregunta pendiente** (sección 4), antes de cerrar.
2. **Volver a pasar todo**: `pnpm verifica` entero y la batería de pantalla completa. Dos
   cambios del final no tienen prueba de pantalla propia: la caja nueva viene con «Cajón N ·
   nuevo» marcado (`puerta/ElegirQueSera.tsx`) y la última baldosa del inicio llena su fila
   (`inicio/ElInicio.tsx`, «mosaico sin huecos»). Mirarlos.
3. **Los documentos**, en el mismo pull request:
   - `docs/decisiones/0108-t1-la-puerta.md`: la respuesta A de Richi, y **«Lo que decidí al
     construirlo»** (sección 5 de este relevo).
   - `docs/m20a-la-sala-y-la-cocina.md`: T1 entregada; en «Lo que sale de Estook», añadir
     «El aparato para fichar» de Ajustes.
   - Anexo 11.3, punto 2: **«a los 5 intentos fallidos el código muere» no se puede hacer
     así** (ver sección 5, punto 1); proponer el texto nuevo. Y 11.4 dice «PIN de 4
     cifras»: depende de la pregunta.
   - Roles 1.12 (los dos permisos nuevos), el mapa, `lo-que-decidio-la-ia.md`,
     `historia-de-los-modulos.md`, Arquitectura capítulo 5 si hace falta (el token
     `tpv.<turno>.<llave>`), ESTADO.md (sin pasar de 250 líneas; una prueba lo vigila) y
     `docs/pasos-de-t1.md` con los pasos de Richi para probarlo en IKATZ (vincular la caja
     con su correo, un móvil como comandero personal de un camarero y una tablet como
     comandero compartido; el PIN; el bloqueo; desvincular).
   - Borrar este fichero de relevo.
4. **El pull request** contra `main` y GitHub en verde por dentro. Después de fusionar: la
   migración 0083 (`.\estook.cmd bd:migrar`) y desplegar la API. Son **25 consultas y
   comandos nuevos** y 3 quitados: `bd:comprobar-api` dirá las cifras nuevas.

## 4 · La pregunta pendiente para Richi (no está escrita en ningún sitio)

**El PIN es hoy de 6 cifras** (`DIGITOS_DEL_PIN = 6` en `servidor/dominio/secretos.ts`, desde
M4), pero el Anexo 11.4, la 0107 y las maquetas dicen **4 cifras**, «lo que ya existe desde
M1», y no es así. Los documentos se contradicen con lo construido: se para y se pregunta.

- **A · Seguir con 6 (lo recomendado):** nadie tiene que aprender un PIN nuevo, es más
  difícil de adivinar (un millón frente a diez mil), y solo se corrigen los documentos y las
  maquetas. Son dos toques más cada vez que se desbloquea.
- **B · Pasar a 4, como Revo o Square:** más rápido en pleno servicio, pero **hay que darle
  un PIN nuevo a todo el equipo de todos los locales** y cambiar la regla del servidor.

T1 está construida con 6 y lee el largo de una sola constante (`CIFRAS_DEL_PIN` en
`packages/dominio/src/aparatos.ts`; una prueba vigila que sea igual que la del servidor).

## 5 · Lo que decidió la IA al construirlo (para la 0108)

1. **«El código muere a los 5 fallos» no se puede hacer tal cual**: un código mal tecleado
   no dice a qué código iba dirigido. Lo que protege es: un uso, 10 minutos, y **20 intentos
   por hora por dirección** (con un millón de códigos, probar a ciegas no sale). Cambiar el
   Anexo 11.3 punto 2 y 11.14 punto 2.
2. **El turno solo vive en la memoria del aparato**: recargar lo bloquea (Anexo 3.4). En la
   base caduca a las 16 horas.
3. **La hora del turno es la de la base** (la que mira `turno_activo` en cada petición); la
   del código, la de la API.
4. **La sala solo desde un aparato vinculado** (`enElTpv: 'solo'`); la cocina y los agotados,
   desde los dos sitios hasta T4. El plano («Tu sala») sigue en Estook hasta T2.
5. **Cocina y barra no se ofrecen al vincular** hasta T4 (la base ya las acepta).
6. **El aparato «Fichar» usa la pantalla de fichar de siempre** (con su modo sin conexión),
   dejándole su llave; esa pantalla pasa a oscura.
7. **El primero del día cae en el inicio; sin mesas dibujadas, siempre en el inicio** (la
   venta rápida llega en T7).
8. **Los Ajustes del TPV no se abren en el móvil personal de nadie.**
9. **Los PIN que ya existen no cambian**, aunque sean fáciles; solo los nuevos los evitan.
10. **En T1 el cajón es solo un nombre**; una caja nueva viene con un cajón nuevo, y
    compartir uno se elige.
11. **Quitar lo ya mandado lo aprueba el encargado con su PIN** en el mismo aparato: queda a
    nombre del camarero, con la aprobación al lado (`aprobacion`), y la base lo vuelve a
    mirar.
12. **El toque al segundo es del aparato**, no de quien lo usa: cambiar de camarero no
    vuelve a conectar.

## 6 · Las maquetas y las capturas

- Maquetas aprobadas: https://claude.ai/artifact/EUZuQhUJSg13As8qeUWk5X (filas 5 y 6 nuevas,
  pantallas 16 a 23; retocadas la 1 y la 2). Los ficheros con los que se publicaron estaban en
  el borrador de la sesión que las hizo (`scratchpad/tpv3/project`); si hay que cambiarlas, se
  leen otra vez del artifact (acción read) y se publican con `root` = la carpeta que contiene
  `project/`, nunca con `root` = `project`.
- Comprobado en el navegador el 24-oct contra la API de pruebas: vincular con el correo,
  «¿Qué es este aparato?», el PIN, «No has fichado», el inicio, añadir aparato con su código
  y su QR, y PIN y bloqueo. Se parecen a las maquetas.
- Para mirarlo en local: en `.claude/launch.json` están `api-de-pruebas` y `tpv-dev`
  (Estook TPV en `http://localhost:5178/tpv/`). Ojo: `tpv-dev` reconstruye al guardar y
  cambia los nombres de los trozos; tras un cambio, **recargar** antes de mirar (se bloquea:
  hay que volver a teclear el PIN). Rosa, de Bar Centro: `rosa@ejemplo.estook.com`; su PIN
  de la base de pruebas se saca con `regenerar_pin` (la base de pruebas se rehace al
  arrancar).
