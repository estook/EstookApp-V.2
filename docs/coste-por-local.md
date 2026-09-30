# Lo que cuesta un local, contándolo todo

**Escrito el 30 de septiembre de 2026** ([decisión 0065](decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)). Es **la única cuenta de costes de Estook**: el Manifiesto, el precio de Verifacti y el panel interno enlazan aquí.

> **Para qué existe este papel.** Para saber, antes de poner un precio o de meter una función, **cuánto le cuesta a Estook cada local al mes** —la inteligencia artificial, Google, el servidor, Stripe, Verifacti y lo fijo— y cuánto deja. Y para que esa cuenta no se quede vieja: **las tablas de abajo salen de un fichero** (`herramientas/coste-por-local.mjs`) y `verifica` comprueba que el documento dice lo mismo.

## Cómo se lee cada cifra

| Etiqueta       | Qué es                                                                        |
| -------------- | ----------------------------------------------------------------------------- |
| **COMPROBADO** | El precio que publica el proveedor, mirado el 30 de septiembre de 2026        |
| **DOCUMENTO**  | Lo que ya decía un documento de Estook, sin volver a medir                    |
| **SUPUESTO**   | Una estimación nuestra, **sin medir**. Vale para orientarse, no para prometer |

**Lo más importante de esta página:** la inteligencia artificial es **SUPUESTO**. Fogón no está construido, así que nadie ha medido cuánto gasta una pregunta. El Manifiesto decía «resultado medido: menos de un euro y medio al mes», y **no era verdad que estuviera medido**: era el objetivo. Se mide al construir Fogón (M22), y ahí se cierra esta cuenta.

## De dónde sale cada precio

| Qué                           | Precio                                                                                                              | Etiqueta                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Los planes**                | Esencial 49 €, Pro 99 €, Cadena 89 € por local, **con el IVA dentro**                                               | DOCUMENTO (Manifiesto 32; Pro y Cadena, desde la 0067). **El ingreso de verdad es sin IVA**: 40,50, 81,82 y 73,55 € |
| **Modelo económico**          | Claude Haiku 4.5: 1 $ por millón de tokens de entrada, 0,10 $ lo cacheado, 5 $ la salida                            | COMPROBADO ([precios de Anthropic](https://platform.claude.com/docs/en/about-claude/pricing))                       |
| **Modelo grande**             | Claude Sonnet 5.5: 2 $, 0,20 $ y 10 $                                                                               | COMPROBADO. **Qué modelo es «el grande» no está decidido**: es de Richi, en M22                                     |
| **El más caro que se usaría** | Claude Opus 5.5: 4 $, 0,20 $ y 20 $                                                                                 | COMPROBADO. Está en la tabla para ver el techo                                                                      |
| **Tokens de un crédito**      | 6.000 cacheados (el resumen del local), 1.500 nuevos y 400 de respuesta                                             | **SUPUESTO**. Es la cifra que más mueve la cuenta                                                                   |
| **Uso normal**                | Un local gasta el 40 % de sus créditos; en Pro, el 30 % de ellos va al modelo grande                                | **SUPUESTO**                                                                                                        |
| **Stripe**                    | 1,5 % + 0,25 € con tarjeta europea normal; 2,8 % + 0,25 € con tarjeta de empresa; y 0,7 % por llevar la suscripción | COMPROBADO ([stripe.com/es/pricing](https://stripe.com/es/pricing)). El Manifiesto decía 0,84 €: se quedaba corto   |
| **Google Places**             | 0,90 € por local                                                                                                    | DOCUMENTO. Con pocos locales será menos: Google regala un cupo mensual por tipo de consulta                         |
| **Servidor, por local**       | 0,55 €                                                                                                              | DOCUMENTO. Lo fijo va aparte, abajo                                                                                 |
| **Conector**                  | 0,40 €                                                                                                              | DOCUMENTO. Es trabajo de mantenimiento repartido, no una factura                                                    |
| **Verifacti**                 | De 5,59 € por NIF con diez a 3,71 € con cincuenta; 3.000 tickets al mes dentro y 0,002 € cada uno de más            | DOCUMENTO ([`el-precio-de-verifacti.md`](el-precio-de-verifacti.md)). **Falta saber qué se paga con menos de diez** |
| **Un dólar**                  | 0,90 €                                                                                                              | **SUPUESTO**, prudente a propósito                                                                                  |

## Las cuentas

<!-- coste:inicio · sale de herramientas/coste-por-local.mjs, no se edita a mano -->

### Lo que cuesta un crédito de Fogón

| Modelo            | Por crédito | Los 300 de Esencial | Los 1.500 de Pro |
| ----------------- | ----------- | ------------------- | ---------------- |
| Claude Haiku 4.5  | 0,37 cént.  | 1,11 €              | 5,54 €           |
| Claude Sonnet 5.5 | 0,74 cént.  | 2,21 €              | 11,07 €          |
| Claude Opus 5.5   | 1,37 cént.  | 4,10 €              | 20,52 €          |

### Lo que cuesta un local al mes, y lo que deja

| Caso                                              | Ingreso sin IVA | IA      | Google, servidor y conector | Stripe | Verifacti | Coste total | Margen             |
| ------------------------------------------------- | --------------- | ------- | --------------------------- | ------ | --------- | ----------- | ------------------ |
| Esencial · uso normal                             | 40,50 €         | 0,44 €  | 1,85 €                      | 1,33 € | —         | **3,62 €**  | **36,88 € · 91 %** |
| Esencial · gasta todos sus créditos               | 40,50 €         | 1,11 €  | 1,85 €                      | 1,97 € | —         | **4,92 €**  | **35,57 € · 88 %** |
| Pro sin TPV · uso normal                          | 81,82 €         | 2,88 €  | 1,85 €                      | 2,43 € | —         | **7,16 €**  | **74,66 € · 91 %** |
| Pro sin TPV · gasta todos sus créditos            | 81,82 €         | 11,07 € | 1,85 €                      | 3,72 € | —         | **16,64 €** | **65,18 € · 80 %** |
| Pro con TPV · restaurante de carta, uso normal    | 81,82 €         | 2,88 €  | 1,85 €                      | 2,43 € | 5,59 €    | **12,75 €** | **69,07 € · 84 %** |
| Pro con TPV · bar de tapas, uso normal            | 81,82 €         | 2,88 €  | 1,85 €                      | 2,43 € | 14,59 €   | **21,75 €** | **60,07 € · 73 %** |
| Pro con TPV · bar muy ocupado, todos sus créditos | 81,82 €         | 11,07 € | 1,85 €                      | 3,72 € | 29,59 €   | **46,23 €** | **35,59 € · 44 %** |
| Cadena con TPV · por local, uso normal            | 73,55 €         | 2,88 €  | 1,85 €                      | 2,21 € | 5,59 €    | **12,53 €** | **61,03 € · 83 %** |

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

| Clientes                           | Ingreso sin IVA | Margen     | Resultado      |
| ---------------------------------- | --------------- | ---------- | -------------- |
| 10 Esencial                        | 404,96 €        | 368,75 €   | **−231,25 €**  |
| 15 mixtos (9 Esencial + 6 Pro)     | 855,37 €        | 779,85 €   | **+179,85 €**  |
| 50 mixtos (30 Esencial + 20 Pro)   | 2851,24 €       | 2599,49 €  | **+1999,49 €** |
| 200 mixtos (120 Esencial + 80 Pro) | 11404,96 €      | 10397,97 € | **+9797,97 €** |

<!-- coste:fin -->

## Lo que dicen estas cuentas

1. **Un local normal deja entre el 80 y el 90 %.** Esencial cuesta unos 3,60 € y Pro unos 7,20 €; con Estook TPV, unos 12,80 €.
2. **El caso malo existe, y es Pro.** Un bar muy ocupado que cobra con Estook y gasta todos sus créditos deja un 44 %: unos 36 € de 82. Con Pro a 79 € dejaba un 30 %. Lo mueven dos cosas: **los tickets** (Verifacti cobra 0,002 € cada uno por encima de 3.000 al mes) y **los créditos**.
3. **1.500 créditos con un modelo grande no son 1,33 €: son hasta 11 €**, y hasta 20 € si «el grande» fuera el más caro. Por eso **antes de encender Fogón se mide** lo que gasta cada acción y se ajusta la tabla de créditos, no al revés.
4. **Stripe cuesta más de lo que estaba escrito**: entre 1,33 y 3,70 € por local, no 0,84 €.
5. **El punto de equilibrio estaba hecho con el IVA dentro.** Sin él, quince clientes mixtos cubren gastos y dejan unos 180 €; con diez Esencial se pierden unos 230 € al mes.
6. **Hoy Estook no gasta nada al mes**, porque todo va en planes gratuitos. **Para vender hacen falta unos 65 € al mes**, y con Estook TPV, unos 163 €. Con diez locales de pago eso ya es menos de un plan Esencial.

## Pro a 99 € y Cadena a 89 €, desde el 30 de septiembre

Lo decidió Richi el 30-sep-2026 ([decisión 0067](decisiones/0067-pro-a-99-el-chat-adelantado-y-el-plan-de-h.md)): «desde ya; si no, no tenemos margen». **Cada local de Pro deja unos 16 € más al mes que a 79 €, y el caso malo pasa del 30 al 44 %.** Las tablas de arriba ya son con los precios nuevos.

## Lo que no está en la cuenta

- **La firma de la autorización ante Hacienda de un autónomo**: 2,90 € + IVA, una sola vez por cliente que cobre con Estook TPV (documentación de Verifacti, 30-sep-2026). A una sociedad no le cuesta: firma con su certificado.

- **El asesor** fiscal y laboral: no hay presupuesto todavía. Va dentro de los 600 € fijos del punto de equilibrio, que son de DOCUMENTO y hay que rehacer cuando lo haya.
- **El tiempo de soporte** y la puesta en marcha remota de Pro.
- **El certificado para firmar Estook Link** en Windows, y la cuenta de Google Play (25 $, una vez).
- **Los minutos de GitHub** si el repositorio privado pasa de 2.000 al mes: cada vuelta entera de las comprobaciones son unos 20 minutos, así que caben unas cien.
- **El datáfono**: su comisión es del local con su banco. Estook no cobra ni paga nada ahí.
- **Las comisiones de Stripe si un cobro se devuelve o se disputa.**
- **Más base de datos de la incluida** (8 GB con Pro; hoy son 20 MB): 0,125 $ por GB de más.

## La prueba final, antes de vender

Esta cuenta se cierra en tres momentos, y **ninguno se salta**:

| Cuándo                       | Qué se hace                                                                                                                                                                        | Qué la da por buena                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Al construir Fogón (M22)** | Se guarda, de cada llamada al modelo, los tokens y su coste. Se mide cada acción de la tabla de créditos con datos de verdad y se cambia el SUPUESTO de este fichero por lo medido | Un crédito cuesta lo mismo haga lo que haga, y **gastar todos los créditos de Pro deja al menos un 60 %**                                 |
| **Al endurecer (M27)**       | **La prueba final:** un mes de un local de ejemplo cargado como uno de verdad —sus ventas, sus tickets, sus correos, su Fogón— y la factura real de cada proveedor al lado         | El coste medido por local no se separa más de un 20 % de estas tablas. Si se separa, se corrige la tabla o el precio, **antes** de vender |
| **En el piloto (M28)**       | El coste real de los tres locales, día a día, en el panel interno (Roles 4.6), con su alarma                                                                                       | El margen real por plan, que es la cifra que dice si un precio está bien puesto                                                           |

Y siempre: **si cambia un precio, un plan o los créditos, se cambia en `herramientas/coste-por-local.mjs`**, se pasa `pnpm coste:escribir` y se relee esta página. Si no, `verifica` se pone en rojo.
