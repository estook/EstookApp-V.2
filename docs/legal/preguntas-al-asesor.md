# Las preguntas para el asesor

> **Todo lo que espera a un profesional, en un solo sitio** ([decisión 0062](../decisiones/0062-lo-legal.md)).
> Hacen falta dos perfiles, que pueden ser el mismo despacho: **fiscal** (VeriFactu y
> facturación) y **laboral y de protección de datos**. Cada pregunta dice **qué depende
> de la respuesta**, para que se vea qué frena y qué no. Las respuestas se apuntan aquí,
> con su fecha y quién las dio, **por escrito**.
>
> **El 30-sep-2026 Richi decidió seguir sin asesor por ahora**
> ([0066](../decisiones/0066-sin-asesor-por-ahora-verifacti-y-el-chat.md)). Lo que se ha
> podido contestar leyendo las fuentes oficiales está en
> [`lo-investigado.md`](lo-investigado.md), pregunta por pregunta. **Lo que ahí sale como
> pendiente sigue necesitando a un profesional**, y dice cuándo: lo primero, antes del
> primer cliente que pague.

## A · Fiscal · VeriFactu y facturación

| N.º | La pregunta                                                                                                                                                                  | Qué depende de la respuesta                                                                                | Respuesta |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------- |
| A1  | **¿El planteamiento entero cumple?** Estook prepara el documento, Verifacti genera el registro, la huella y el encadenamiento, y lo manda a la AEAT (Anexo, capítulos 1 y 4) | Encender la facturación en producción. **Frena M20B en producción**                                        |           |
| A2  | **La declaración responsable** de Estook como productor del programa, con Verifacti de proveedor técnico: redactarla                                                         | Igual: sin ella no se enciende                                                                             |           |
| A3  | **Sin conexión:** entregar un justificante provisional («no es una factura») y emitir el ticket al volver, con la incidencia marcada. ¿Cumple? ¿Qué texto lleva?             | El texto del justificante (Anexo 4.11)                                                                     |           |
| A4  | Si Verifacti **rechaza por los datos antes de registrar nada**, ¿se puede corregir y mandar **con el mismo número**, puesto que no se ha entregado?                          | El flujo de emisión (Anexo 4.9)                                                                            |           |
| A5  | **Rectificativas:** cuándo toca R1, R2, R3 o R4 en un restaurante, además de la R5 del ticket; y sustitución o diferencias                                                   | Las pantallas de corregir (Anexo 4.5)                                                                      |           |
| A6  | **El reparto a domicilio** no es «consumir en el acto». ¿Vuelve a aplicar el límite de 400 € de la factura simplificada?                                                     | Abrir el TPV a los canales de reparto                                                                      |           |
| A7  | **¿Quién factura un pedido de reparto**, el restaurante al cliente o a la plataforma? ¿Estook emite algo?                                                                    | M29 con Estook TPV (Anexo 10.8)                                                                            |           |
| A8  | **El ticket por correo o en un QR en pantalla**, ¿vale como entrega, o hay que ofrecer siempre el papel?                                                                     | La pantalla de cobrar (Anexo 10.5)                                                                         |           |
| A9  | **Las propinas:** la de efectivo como entrada de caja, la de tarjeta apuntada aparte. ¿Tratamiento fiscal y laboral?                                                         | La caja (Anexo 5.1 y 10.7)                                                                                 |           |
| A10 | **Las invitaciones** (descuento del 100 %): ¿ticket a cero, autoconsumo, o nada?                                                                                             | Cómo se cobra una invitación                                                                               |           |
| A11 | **Los tipos de IVA** de un restaurante por canal (sala, para llevar, reparto, alcohol): confirmar la tabla de fábrica                                                        | Los valores por defecto del motor fiscal                                                                   |           |
| A12 | **Varios locales con el mismo NIF:** ¿una serie por local? ¿Cómo se encadenan los registros?                                                                                 | La empresa fiscal ([0060](../decisiones/0060-la-empresa-fiscal.md)) y facturar sin internet desde el local |           |
| A13 | **Ceuta y Melilla (IPSI)** y los **territorios forales**: confirmar que quedan fuera por ahora, y qué haría falta para entrar                                                | A quién se le puede vender el TPV                                                                          |           |
| A14 | **La autorización de representación** para que Verifacti envíe en nombre del restaurante: qué documento, quién lo firma y cómo se guarda                                     | El alta de facturación (Anexo 4.3)                                                                         |           |
| A15 | **Las facturas de Estook a sus clientes:** el titular, ¿autónomo o sociedad?, ¿desde qué fecha le obliga?, ¿valen las de Stripe?                                             | M26. **Tiene fecha: 1-ene o 1-jul de 2027**                                                                |           |
| A16 | **La conservación:** seis años de facturas aunque el cliente se dé de baja. ¿Quién responde de conservarlas, él o Estook?                                                    | [`conservacion-de-datos.md`](conservacion-de-datos.md) y la baja                                           |           |
| A17 | **El informe Z y el X** son consultas, no documentos fiscales. ¿Correcto?                                                                                                    | La caja (Anexo 5.5)                                                                                        |           |

## B · Pagos

| N.º | La pregunta                                                                                                                                                                             | Qué depende                   | Respuesta |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------- |
| B1  | **El datáfono conectado:** la cuenta con el proveedor es del restaurante y el dinero no pasa por Estook. ¿Queda Estook fuera de la normativa de servicios de pago, en cualquier modelo? | Qué proveedor se elige (M20C) |           |
| B2  | Si algún día Estook cobrase una comisión por cobro —**hoy está descartado**—, ¿qué cambiaría?                                                                                           | Nada hoy; para no tropezar    |           |

## C · Protección de datos

| N.º | La pregunta                                                                                                                           | Qué depende                                            | Respuesta |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------- |
| C1  | **Revisar el contrato de encargado** ([borrador](contrato-de-encargado.md)) y cómo se acepta al crear la cuenta                       | **Antes del primer cliente de pago**                   |           |
| C2  | **Los subencargados y las transferencias** fuera de la UE: comprobar la garantía de cada uno (Resend, Stripe, Sentry, Google, GitHub) | La lista del contrato                                  |           |
| C3  | **La tabla de conservación** ([borrador](conservacion-de-datos.md)): plazos y qué se anonimiza                                        | El trabajo nocturno de M27 y la política de privacidad |           |
| C4  | ¿Tiene Estook que nombrar **delegado de protección de datos**?                                                                        | El aviso legal                                         |           |
| C5  | **La ubicación al fichar:** ¿hace falta evaluación de impacto? ¿La hace el local, con un modelo nuestro?                              | Los fichajes                                           |           |
| C6  | **Revisar la política de privacidad, las condiciones y el aviso legal** de la web, que son borradores                                 | **Antes del primer cliente de pago**                   |           |
| C7  | **Una persona sin correo** (nombre y PIN): ¿cómo se le informa y cómo ejerce sus derechos? ¿A través del local?                       | La entrega H                                           |           |
| C8  | **Las reseñas de Google** con el nombre de quien las escribe: base legal para guardarlas y analizarlas                                | Negocio › Reseñas (M23)                                |           |

## D · Laboral

| N.º | La pregunta                                                                                                                                    | Qué depende          | Respuesta |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------- |
| D1  | **El registro de jornada de Estook**, ¿es suficiente hoy? Corrección como registro nuevo, aviso al trabajador y exportación para la Inspección | La entrega H         |           |
| D2  | **El Real Decreto del registro horario digital:** avisar cuando se publique y qué formato pide para la Inspección                              | M15                  |           |
| D3  | **El texto para el equipo** sobre fichajes, ubicación y PIN ([borrador](informacion-para-el-equipo.md))                                        | Ajustes › Fichajes   |           |
| D4  | **Exigir estar fichado para usar el TPV** (apagado de fábrica): ¿algún problema?                                                               | Estook TPV           |           |
| D5  | **Fogón proponiendo horarios:** qué hay que informar a los representantes de los trabajadores y con qué texto                                  | M14 y M22            |           |
| D6  | **El descuadre de caja a nombre de un camarero** (la bolsa): ¿qué se puede hacer con ese dato y qué no?                                        | La bolsa (Anexo 5.5) |           |

## E · Mercantil y de producto

| N.º | La pregunta                                                                                                                     | Qué depende                 | Respuesta |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------- |
| E1  | **El límite de responsabilidad** de Estook si el TPV se cae en pleno servicio, o si un cálculo de alérgenos o de coste está mal | Las condiciones             |           |
| E2  | **La cláusula de los alérgenos:** Estook ayuda a informar; la información es del local                                          | Las condiciones, M9 y M12   |           |
| E3  | **La disponibilidad prometida** y el soporte: qué se puede prometer y qué no                                                    | Las condiciones y el precio |           |
| E4  | **La marca «Estook», «Estook TPV», «Estook Link» y «Fogón»:** registro                                                          | Antes de hacer publicidad   |           |
