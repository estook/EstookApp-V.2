# 0096 · El arranque sin parpadeo, y el precio en la jornada del local

**Fecha:** 18 de octubre de 2026
**Estado:** hecho en la rama `el-arranque-y-el-precio-en-la-jornada`. Lo de «enseñar lo último que viste al abrir» queda **propuesto, a la espera del sí de Richi**.
**Sigue:** la [0092](0092-las-respuestas-de-m9-3.md) («Lo que vi y no toqué») y la [0070](0070-la-app-instalable.md).

## 1 · La app, al abrir

**Lo que vio Richi** (18-oct, iPhone con el tema oscuro, con capturas): «abres la app, se ve unos segundos una pantalla en negro con una franja blanca abajo, de repente aparece en una fracción de segundo el logo de Estook, a veces parpadea, luego entra a la app y tienes que esperar a que cargue el contenido».

**Lo que pasaba, medido:**

| Lo que se veía                          | Por qué                                                                                                                                                                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El logo sobre claro y el salto a oscuro | La pantalla de arranque (`index.html`) era **siempre clara**: el tema se guarda en el aparato y solo lo ponía React, al arrancar                                                                                                                                              |
| La franja clara abajo                   | El fondo del `<html>` era claro fijo y asomaba en la zona de la barra de inicio del iPhone                                                                                                                                                                                    |
| La pantalla casi vacía                  | Mientras el servidor decía quién eres, en vez del logo salían unas líneas grises sobre el fondo                                                                                                                                                                               |
| Esperar al contenido                    | **Dos viajes al servidor, uno detrás de otro**: «quién soy» y después el Panel (~0,4 s cada uno desde España). Y en el iPhone, la precarga de las treinta pantallas saltaba a los 1,5 s, **justo cuando llegaban los datos del Panel** (Safari no avisa de cuándo está libre) |

La API, medida desde fuera el 18-oct, va como antes: **~0,4 s por consulta, en Irlanda junto a su base**. No era M9 · 3.

**Lo que se ha hecho:**

1. **El tema antes de pintar**: `tema-al-arrancar.js` lee el tema del aparato y lo pone en el `<html>` antes de nada. El fondo y el logo de arranque lo siguen (el logo claro sobre oscuro, y al revés). Va en un fichero aparte porque la política de seguridad no deja ejecutar scripts escritos en la página. Y lo guarda el trabajador de servicio: sin señal, también sale en su tema.
2. **El mismo logo mientras se comprueba la sesión** (`ElArranque`): el paso de la página a la app no se nota.
3. **La precarga, después y de una en una**: en Safari espera 4 s, y cada pantalla se trae cuando ha llegado la anterior.

Su prueba: `el-arranque.spec.ts`, en claro y en oscuro, en escritorio y en móvil, con el código y «quién soy» haciéndose esperar.

## 2 · Lo que se propone, y espera el sí de Richi: abrir con lo último que viste

**Qué es.** Hoy, al abrir **con señal**, la app no enseña nada hasta que el servidor contesta: por eso salen los esqueletos del Panel. Lo último que viste ya está guardado en el móvil, pero solo se usa **sin señal** (0070).

**De dónde sale que sea así.** El 1-oct se decidió no enseñarlo con señal, porque un momento se veía el Panel de antes, o la pantalla de elegir local que ya se había elegido.

**Cómo lo hacen las mejores apps** (las de los TPV grandes, Slack, la del banco): abren con lo último que viste y lo ponen al día por detrás, en un segundo. **Lo que se propone:** lo mismo, **solo con los datos** (las cifras del Panel, las listas), **nunca con quién eres ni en qué local estás**, que se siguen preguntando siempre. Así no vuelve lo del 1-oct.

**Ejemplo de restaurante.** Abres a las 9:00: el Panel sale al instante con lo de ayer a las 23:00, y en un segundo cambia a lo de ahora. Hoy, ese segundo lo pasas mirando esqueletos.

**Lo que pasa con cada opción.**

- **Sí**: el Panel sale al momento; durante un segundo puede verse una cifra de la última vez, y se corrige sola.
- **No**: como hoy, esqueletos hasta que llegan los datos; nunca una cifra vieja.

**Recomendación: sí.** Para un hostelero, ver algo al instante y que se ponga al día vale más que esperar en blanco.

## 3 · El precio, en la jornada del local

**Richi** (18-oct): que no se pase al día del calendario, «porque la jornada puede acabar de madrugada perfectamente o incluso más tarde; si no, se mezcla el dinero»; y «haz lo que me has recomendado».

**Lo que se ha hecho:** el precio de un producto y lo pactado con un proveedor se apuntan **en la jornada del local**, con su hora de corte (`laJornadaDelProducto`), como ya hacían el stock, los fichajes, el cierre y los lotes (regla 10). Antes usaban `current_date`, el día de la hora universal. Cambia:

- Al poner un precio: el anterior acaba la jornada de ayer y el nuevo vale desde la de hoy.
- El primer precio de un producto nuevo, y el de los productos de ejemplo.
- Lo pactado: desde la jornada de hoy, y **vale hasta el final de su último día de jornada** (el género que llega a la 1:00 aún es de esa noche), en el pedido sugerido y al recibir.
- «Qué ha cambiado» (M9 · 3) lee el precio que valía en la jornada de aquel instante.

Lo ya apuntado no se toca: solo cambia cómo se fecha lo nuevo.

Su prueba: `el-precio-en-la-jornada.prueba.ts`, a las 2:30 y a mediodía (Bar Centro corta a las 3:00), vista fallar con el código de antes.

## Lo que decidí al hacerlo

1. **Mientras se comprueba la sesión, el logo y no las líneas grises**: es la misma pantalla que antes del código, así que no se nota el cambio.
2. **En Safari, la precarga a los 4 s** y no a los 1,5: es cuando el Panel suele estar pintado.
3. **Lo pactado entra también**, aunque Richi habló del «precio»: es un precio y se fechaba igual de mal.
4. **El fichero del tema no pasa por el revisor de código** (como la entrada de la API en Deno): son seis líneas sin tipos del navegador, y se revisan leyendo.
