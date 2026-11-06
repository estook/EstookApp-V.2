# Lo que cuesta un local, contándolo todo

**Escrito el 30 de septiembre de 2026** ([decisión 0065](decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)) y **rehecho el 6 de noviembre** con los precios finales sin IVA, la IA a un tercio y el precio nuevo de Verifacti ([0135](decisiones/0135-r4-precios-ia-y-papeles.md)). Es **la única cuenta de costes de Estook**: el Manifiesto, el precio de Verifacti y el panel interno enlazan aquí.

> **Para qué existe este papel.** Para saber, antes de poner un precio o de meter una función, **cuánto le cuesta a Estook cada local al mes** —la inteligencia artificial, Google, el servidor, Stripe, Verifacti y lo fijo— y cuánto deja. Y para que esa cuenta no se quede vieja: **las tablas de abajo salen de un fichero** (`herramientas/coste-por-local.mjs`) y `verifica` comprueba que el documento dice lo mismo.

## Cómo se lee cada cifra

| Etiqueta       | Qué es                                                                        |
| -------------- | ----------------------------------------------------------------------------- |
| **COMPROBADO** | El precio que publica el proveedor, mirado el 30 de septiembre de 2026        |
| **DOCUMENTO**  | Lo que ya decía un documento de Estook, sin volver a medir                    |
| **SUPUESTO**   | Una estimación nuestra, **sin medir**. Vale para orientarse, no para prometer |

**Lo más importante de esta página:** lo que gasta la inteligencia artificial es **SUPUESTO**, pero **tiene techo**: el servidor corta a **1,65 € por local y mes** antes de llamar al modelo ([0135](decisiones/0135-r4-precios-ia-y-papeles.md)), así que ningún local cuesta más que eso en IA. Fogón 1 ya habla ([0097](decisiones/0097-fogon-1-las-respuestas-y-la-base.md)) y apunta lo que cuesta cada llamada; lo mira Richi con el piloto, en la sección Fogón del admin. Se mide de verdad al construir Fogón (M22), y ahí se cierra esta cuenta.

## De dónde sale cada precio

| Qué                           | Precio                                                                                                                 | Etiqueta                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Los planes**                | Esencial 39 €, Pro 99 €, Cadena 89 € por local y Pausa 9 €, **sin IVA**: el IVA va aparte                              | DOCUMENTO (Manifiesto 32, [0135](decisiones/0135-r4-precios-ia-y-papeles.md)). El ingreso es el precio tal cual                  |
| **Los créditos y el tope**    | 100 créditos en Esencial y 500 en Pro y Cadena; **nunca más de 1,65 € de IA por local y mes**                          | DOCUMENTO ([0135](decisiones/0135-r4-precios-ia-y-papeles.md)). El tope lo cumple el servidor antes de cada llamada              |
| **Modelo económico**          | Claude Haiku 5.5: 0,10 $ por millón de tokens de entrada, 0,01 $ lo cacheado, 0,50 $ la salida (el de Fogón 1, 0097)   | COMPROBADO ([precios de Anthropic](https://platform.claude.com/docs/en/about-claude/pricing))                                    |
| **Modelo grande**             | Claude Sonnet 5.5: 2 $, 0,20 $ y 10 $                                                                                  | COMPROBADO. **Qué modelo es «el grande» no está decidido**: es de Richi, en M22                                                  |
| **El más caro que se usaría** | Claude Opus 5.5: 4 $, 0,20 $ y 20 $                                                                                    | COMPROBADO. Está en la tabla para ver el techo                                                                                   |
| **Tokens de un crédito**      | 6.000 cacheados (el resumen del local), 1.500 nuevos y 400 de respuesta                                                | **SUPUESTO**. Es la cifra que más mueve la cuenta                                                                                |
| **Uso normal**                | Un local gasta el 40 % de sus créditos; en Pro, el 30 % de ellos va al modelo grande                                   | **SUPUESTO**                                                                                                                     |
| **Stripe**                    | 1,5 % + 0,25 € con tarjeta europea normal; 2,8 % + 0,25 € con tarjeta de empresa; y 0,7 % por llevar la suscripción    | COMPROBADO ([stripe.com/es/pricing](https://stripe.com/es/pricing)). Se cobra sobre lo que paga el cliente, con IVA              |
| **Google Places**             | 0,90 € por local                                                                                                       | DOCUMENTO. Con pocos locales será menos: Google regala un cupo mensual por tipo de consulta                                      |
| **Servidor, por local**       | 0,55 €                                                                                                                 | DOCUMENTO. Lo fijo va aparte, abajo                                                                                              |
| **Conector**                  | 0,40 €                                                                                                                 | DOCUMENTO. Es trabajo de mantenimiento repartido, no una factura                                                                 |
| **Verifacti**                 | **14,99 € al mes el primer NIF y 1,99 € cada NIF más**, sin IVA; 3.000 tickets al mes dentro y 0,002 € cada uno de más | DOCUMENTO ([0135](decisiones/0135-r4-precios-ia-y-papeles.md)). Lo de los tickets es de la propuesta del 21-sep: **[VERIFICAR]** |
| **Un dólar**                  | 0,90 €                                                                                                                 | **SUPUESTO**, prudente a propósito                                                                                               |

## Las cuentas

<!-- coste:inicio · sale de herramientas/coste-por-local.mjs, no se edita a mano -->

### Lo que cuesta un crédito de Fogón

| Modelo            | Por crédito | Los 100 de Esencial | Los 500 de Pro |
| ----------------- | ----------- | ------------------- | -------------- |
| Claude Haiku 5.5  | 0,04 cént.  | 0,04 €              | 0,18 €         |
| Claude Sonnet 5.5 | 0,74 cént.  | 0,74 €              | 3,69 €         |
| Claude Opus 5.5   | 1,37 cént.  | 1,37 €              | 6,84 €         |

**Nunca más de 1,65 € de IA por local y mes**: el servidor corta antes de pasarse, use el modelo que use.

### Verifacti, según cuántos clientes cobran con Estook TPV

| Clientes con TPV | Al mes, todos | Por cliente |
| ---------------- | ------------- | ----------- |
| 1                | 14,99 €       | 14,99 €     |
| 10               | 32,90 €       | 3,29 €      |
| 50               | 112,50 €      | 2,25 €      |
| 200              | 411,00 €      | 2,06 €      |

En las cuentas de abajo, el de 10 clientes, más las facturas que pasen de 3.000 al mes por NIF.

### Lo que cuesta un local al mes, y lo que deja

| Caso                                              | Ingreso sin IVA | IA     | Google, servidor y conector | Stripe | Verifacti | Coste total | Margen             |
| ------------------------------------------------- | --------------- | ------ | --------------------------- | ------ | --------- | ----------- | ------------------ |
| Esencial · uso normal                             | 39,00 €         | 0,01 € | 1,85 €                      | 1,29 € | —         | **3,15 €**  | **35,85 € · 92 %** |
| Esencial · gasta todos sus créditos               | 39,00 €         | 0,04 € | 1,85 €                      | 1,90 € | —         | **3,79 €**  | **35,21 € · 90 %** |
| Pro sin TPV · uso normal                          | 99,00 €         | 0,49 € | 1,85 €                      | 2,89 € | —         | **5,23 €**  | **93,77 € · 95 %** |
| Pro sin TPV · gasta todos sus créditos            | 99,00 €         | 1,65 € | 1,85 €                      | 4,44 € | —         | **7,94 €**  | **91,06 € · 92 %** |
| Pro con TPV · restaurante de carta, uso normal    | 99,00 €         | 0,49 € | 1,85 €                      | 2,89 € | 3,29 €    | **8,52 €**  | **90,48 € · 91 %** |
| Pro con TPV · bar de tapas, uso normal            | 99,00 €         | 0,49 € | 1,85 €                      | 2,89 € | 12,29 €   | **17,52 €** | **81,48 € · 82 %** |
| Pro con TPV · bar muy ocupado, todos sus créditos | 99,00 €         | 1,65 € | 1,85 €                      | 4,44 € | 27,29 €   | **35,23 €** | **63,77 € · 64 %** |
| Cadena con TPV · por local, uso normal            | 89,00 €         | 0,49 € | 1,85 €                      | 2,62 € | 3,29 €    | **8,25 €**  | **80,75 € · 91 %** |

### Lo fijo de cada mes

| Qué                                       | Al mes  | Desde cuándo                     | De dónde sale                                                                    |
| ----------------------------------------- | ------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Supabase Pro                              | 22,50 € | Antes del primer cliente de pago | supabase.com/pricing · copia diaria de 7 días                                    |
| Resend Pro                                | 18,00 € | Antes del primer cliente de pago | resend.com/pricing · el gratuito da 100 correos al día                           |
| Sentry Team                               | 23,40 € | Antes del primer cliente de pago | sentry.io/pricing · el gratuito es para una sola persona                         |
| Cloudflare Pages                          | 0,00 €  | Antes del primer cliente de pago | plan gratuito: 500 publicaciones al mes                                          |
| Cloudflare Browser Run (los PDF)          | 0,00 €  | Antes del primer cliente de pago | gratuito: 10 minutos al día, unos 400 PDF; pasado eso, Workers Paid a 5 $ (0068) |
| Dominio estook.com                        | 1,50 €  | Antes del primer cliente de pago | SUPUESTO: unos 18 € al año                                                       |
| GitHub con el repositorio privado         | 0,00 €  | Antes del primer cliente de pago | 2.000 minutos al mes incluidos; después, 0,006 $ el minuto                       |
| Recuperación a un punto exacto (Supabase) | 90,00 € | Con Estook TPV                   | supabase.com/pricing · 7 días                                                    |
| Cuenta de desarrollador de Apple          | 7,42 €  | Con Estook TPV                   | 99 $ al año; solo si se publica la cáscara del iPad                              |

**Para poder vender: 65,40 € al mes. Con Estook TPV: 162,83 € al mes.** Hoy, con todo en planes gratuitos, cero.

### Lo fijo, repartido entre los locales

| Locales de pago | Fijo por local, sin TPV | Fijo por local, con TPV |
| --------------- | ----------------------- | ----------------------- |
| 1               | 65,40 €                 | 162,83 €                |
| 10              | 6,54 €                  | 16,28 €                 |
| 50              | 1,31 €                  | 3,26 €                  |
| 200             | 0,33 €                  | 0,81 €                  |

### El punto de equilibrio

Con 600,00 € fijos al mes, uso normal, sin TPV y **sin el IVA, que no es ingreso**:

| Clientes                           | Ingreso sin IVA | Margen     | Resultado       |
| ---------------------------------- | --------------- | ---------- | --------------- |
| 10 Esencial                        | 390,00 €        | 358,47 €   | **−241,53 €**   |
| 15 mixtos (9 Esencial + 6 Pro)     | 945,00 €        | 885,24 €   | **+285,24 €**   |
| 50 mixtos (30 Esencial + 20 Pro)   | 3150,00 €       | 2950,82 €  | **+2350,82 €**  |
| 200 mixtos (120 Esencial + 80 Pro) | 12600,00 €      | 11803,26 € | **+11203,26 €** |

<!-- coste:fin -->

## Lo que dicen estas cuentas

1. **Un local normal deja entre el 91 y el 95 %.** Esencial cuesta unos 3,15 € y Pro unos 5,20 €; con Estook TPV, unos 8,50 €.
2. **El caso malo sigue siendo Pro con TPV**, y ahora deja un 64 %: un bar muy ocupado que cobra con Estook y gasta todos sus créditos cuesta unos 35 € de 99. Lo mueven **los tickets** (Verifacti cobra 0,002 € cada uno por encima de 3.000 al mes) más que la IA, que ya no pasa de 1,65 €.
3. **La IA tiene techo.** Con el tope de 1,65 €, gastar todos los créditos de Pro con un modelo grande ya no son 11 €: son 1,65 €. Si Fogón se queda corto con ese tope, se ve en el admin y se decide con lo medido (M22).
4. **Verifacti, el primer cliente es el caro**: 14,99 € al mes para uno solo; con diez que cobren con Estook, 3,29 € cada uno, y con doscientos, unos 2 €.
5. **Stripe cobra sobre lo que paga el cliente**, IVA incluido: entre 1,30 y 4,40 € por local.
6. **El punto de equilibrio**, sin IVA: quince clientes mixtos cubren los 600 € fijos y dejan unos 285 €; con diez Esencial se pierden unos 240 € al mes.
7. **Hoy Estook no gasta nada al mes**, porque todo va en planes gratuitos. **Para vender hacen falta unos 65 € al mes**, y con Estook TPV, unos 163 €.

## Los precios finales, desde el 6 de noviembre

Lo decidió Richi el 6-nov-2026 ([decisión 0135](decisiones/0135-r4-precios-ia-y-papeles.md)): **Esencial 39 €, Pro 99 €, Cadena 89 € por local y Pausa 9 €, todos más IVA**, y la IA a un tercio. Las tablas de arriba ya son con todo eso.

## Lo que no está en la cuenta

- **La firma de la autorización ante Hacienda de un autónomo**: 2,90 € + IVA, una sola vez por cliente que cobre con Estook TPV (documentación de Verifacti, 30-sep-2026). A una sociedad no le cuesta: firma con su certificado.

- **El asesor** fiscal y laboral: no hay presupuesto todavía. Va dentro de los 600 € fijos del punto de equilibrio, que son de DOCUMENTO y hay que rehacer cuando lo haya.
- **El tiempo de soporte** y la puesta en marcha remota de Pro.
- **El certificado para firmar la caja para Windows** ([0119](decisiones/0119-t5-la-caja-para-windows.md)), y la cuenta de Google Play (25 $, una vez).
- **Los minutos de GitHub** si el repositorio privado pasa de 2.000 al mes: cada vuelta entera de las comprobaciones son unos 20 minutos, así que caben unas cien.
- **El datáfono**: su comisión es del local con su banco, o con su proveedor si cobra con tarjeta en el propio aparato (M20D, [0134](decisiones/0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md)). Estook no cobra ni paga nada ahí.
- **Las comisiones de Stripe si un cobro se devuelve o se disputa.**
- **Más base de datos de la incluida** (8 GB con Pro; hoy son 20 MB): 0,125 $ por GB de más.

## La prueba final, antes de vender

Esta cuenta se cierra en tres momentos, y **ninguno se salta**:

| Cuándo                       | Qué se hace                                                                                                                                                                        | Qué la da por buena                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Al construir Fogón (M22)** | Se guarda, de cada llamada al modelo, los tokens y su coste. Se mide cada acción de la tabla de créditos con datos de verdad y se cambia el SUPUESTO de este fichero por lo medido | Un crédito cuesta lo mismo haga lo que haga, y **gastar todos los créditos de Pro deja al menos un 60 %**                                 |
| **Al endurecer (M27)**       | **La prueba final:** un mes de un local de ejemplo cargado como uno de verdad —sus ventas, sus tickets, sus correos, su Fogón— y la factura real de cada proveedor al lado         | El coste medido por local no se separa más de un 20 % de estas tablas. Si se separa, se corrige la tabla o el precio, **antes** de vender |
| **En el piloto (M28)**       | El coste real de los tres locales, día a día, en el panel interno (Roles 4.6), con su alarma                                                                                       | El margen real por plan, que es la cifra que dice si un precio está bien puesto                                                           |

Y siempre: **si cambia un precio, un plan, los créditos o el tope, se cambia en `herramientas/coste-por-local.mjs`**, se pasa `pnpm coste:escribir` y se relee esta página. Si no, `verifica` se pone en rojo.
