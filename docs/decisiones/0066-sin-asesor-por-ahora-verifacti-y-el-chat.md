# 0066 · Sin asesor por ahora: lo legal se investiga en las fuentes; lo que dice la API de Verifacti; y el chat, dicho entero

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido lo de los puntos 1 a 3. **Los puntos 4 y 5 son una recomendación que espera el sí de Richi.**
**Cambia:** de la [0062](0062-lo-legal.md), «hay que contratar al asesor ya»; el Anexo (1.4, 4.1, 4.3, 4.9 y 4.13); el Manifiesto (23) y el Plan (M23); y [`docs/coste-por-local.md`](../coste-por-local.md).

## Lo que pasó

Con la #80 fusionada, Richi contestó cinco cosas:

1. **No tiene asesor por ahora.** Pidió que la información legal se buscase, y revisarlo todo con más detalle al ir a producción: «pero que cumplamos todo».
2. **Mandó la documentación de la API de Verifacti** con la que se dan de alta los NIF.
3. **El chat**: no entendió la pregunta «¿con Horarios o aparte?», y contó lo que quiere: el chat del equipo y los privados, adjuntar horarios y fichas técnicas, y los avisos de leído. «Que sea el método oficial de comunicación.»
4. **Subir Pro a 99 €**, y pidió opinión.
5. **Que se le explique mejor**, sin dar por hecho que lo tiene todo en la cabeza.

## 1 · Lo legal, sin asesor

- Cada pregunta de [`preguntas-al-asesor.md`](../legal/preguntas-al-asesor.md) se busca **en el BOE, en la Agencia Tributaria y en la documentación de cada proveedor**, y lo encontrado se escribe en [`lo-investigado.md`](../legal/lo-investigado.md) con su enlace, su fecha y una de tres etiquetas: **resuelto**, **interpretación** o **pendiente**.
- **Lo resuelto se construye. Lo que es interpretación se construye fácil de cambiar. Lo pendiente no se construye.**
- **Un profesional sigue haciendo falta, pero más tarde**, y en cuatro momentos escritos: antes del primer cliente que pague (contrato de encargado, condiciones y cómo factura Estook), antes de encender la facturación (M20B), y antes de M20C y M29 para propinas, invitaciones y reparto.
- **Hasta M10 no hay nada que dependa de un asesor.**

**Lo que quien lo ha investigado no puede hacer:** firmar que cumple. Es una IA leyendo normas, no un profesional colegiado. Por eso la regla de la 0062 no cambia: **nada de facturación llega a producción sin revisión profesional por escrito.**

## 2 · Lo que dice la API de Verifacti para los NIF

Leída el 30-sep-2026. El fichero no se guarda en el repositorio (es suyo); lo que importa está aquí y en el Anexo.

| Lo que dice                                                                                                                                                                | Qué cambia                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Los avisos por webhook existen**: van firmados (`X-Webhook-Signature`, HMAC-SHA256) y llevan `X-Webhook-Id` para no procesar dos veces; hay que contestar en 10 segundos | Se quita el **[VERIFICAR]** del Anexo 4.1. Consultar el estado sigue siendo la red de seguridad                                      |
| **Desactivar un NIF borra sus registros a los 30 días**, salvo que se reactive antes. Borrarlo del todo, al instante                                                       | **Antes de desactivar se exportan los XML**, siempre. Y una cuenta en impago **no se desactiva sola**: se decide a mano (Anexo 4.13) |
| **Se paga por NIF activo en producción**; los de prueba son gratis; al desactivar deja de cobrarse                                                                         | Confirma lo escrito                                                                                                                  |
| **La autorización ante Hacienda** se firma **en línea** (solo personas físicas: 2,90 € + IVA por intento) o **con certificado**                                            | El alta de un autónomo cuesta 2,90 €; la de una sociedad necesita su certificado. Entra en el coste por local                        |
| Se puede **comprobar un NIF contra la AEAT** antes de darlo de alta                                                                                                        | El alta de facturación lo comprueba al escribirlo, no al final                                                                       |
| Admite las haciendas de **Álava, Gipuzkoa y Bizkaia** (TicketBAI)                                                                                                          | El País Vasco deja de ser «imposible»: es «más adelante, con el mismo proveedor»                                                     |
| **Cada NIF tiene su clave**, y se puede cambiar; la anterior deja de valer al instante                                                                                     | Ya estaba: una clave por NIF, en el Vault. Se añade el botón de cambiarla al panel interno                                           |

**Lo que el fichero no dice:** cuánto cuesta con menos de diez NIF. Su web pública (mirada el mismo día) dice «desde 2,9 € por NIF al mes», deja elegir **de 1 a 100 NIF** y no habla de ningún mínimo. **Lo más probable es que no haya mínimo de diez**, pero el precio exacto de uno a nueve solo lo enseña su calculadora o un correo. Sigue siendo una pregunta para ellos, ya sin urgencia.

**Y la pregunta de Richi —«¿con uno que entre ya nos paga los demás?»—:** si hubiese que pagar diez NIF desde el primer día (55,90 €), un solo Pro a 79 € lo cubre **por los pelos** (deja unos 65 € sin IVA, servirle cuesta unos 7, y sobran menos de 3 €); **a 99 € sobran unos 19 €**, y con dos clientes sobra en cualquier caso. Si no hay mínimo, que es lo que parece, el primer cliente ya deja más del 80 %.

## 3 · El chat, dicho entero

**La pregunta era de calendario, no de producto**, y estaba mal hecha. El chat ya estaba escrito (Manifiesto 23) y su módulo es M23. Lo que se preguntaba era si construirlo **junto con Horarios**, porque publicar un horario pide un sitio donde mandarlo.

**Queda así:**

- **Horarios (H) no espera al chat.** Al publicar un horario, cada persona recibe **su aviso en la campana y por correo, con su PDF**. Eso ya se puede hacer hoy.
- **El chat es una entrega propia**, con todo lo que pidió Richi y lo que le falta para ser el medio oficial. Se escribe entero en el Manifiesto 23: el canal del equipo y los de cada área, los privados, los **avisos de entregado y leído**, adjuntar fotos, documentos, **horarios y fichas técnicas como tarjetas**, responder a un mensaje, reacciones, mensajes fijados, **«confirmar que lo he leído» en lo importante**, notas de voz, **traducción al idioma de cada uno**, buscador y **silencio fuera del turno**.
- **Dos reglas que son de ley y no de gusto:** nadie lee los privados de otros, tampoco el dueño (ya estaba); y **fuera de su turno a nadie le suena** salvo que él lo quiera, que es el derecho a la desconexión digital (LOPDGDD, art. 88).

## 4 · Recomendación: adelantar el chat · **espera el sí de Richi**

Hoy el chat está en M23, casi al final. Si tiene que ser «el método oficial de comunicación», es de lo que más se usa cada día y de lo que más engancha a un equipo. **Se recomienda hacerlo justo después de la app instalable (I)**, que es la que trae los avisos al móvil: un chat que no suena no sirve.

```
HOY           H → I → A3 → A4 → M8 …            (el chat, en M23)
RECOMENDADO   H → I → C · El chat → A3 → A4 → M8 …
```

## 5 · Recomendación: el precio de Pro · **espera el sí de Richi**

**Sí a los 99 €, con una condición: cuando Pro lleve Estook TPV dentro.**

- **Por qué sí.** Quien hoy quiere lo que dará Pro paga un TPV (de 45 a 70 € al mes) **más** un programa de gestión (de 80 a 120 €). Pro con TPV por 99 € sigue siendo la mitad. Y arregla el caso malo: el bar muy ocupado pasa de dejar un 30 % a un 44 % ([la cuenta](../coste-por-local.md)).
- **Por qué no antes.** Sin el TPV, Pro compite con programas de unos 82 €; a 99 € y sin cobrar, cuesta más de defender.
- **Esencial se queda en 49 €**: es la puerta de entrada y está en precio.
- **Cadena**, a 89 € por local, para que siga siendo más barata que Pro.
- **Precio de lanzamiento:** quien entre antes de que salga el TPV se queda en 79 € mientras no se dé de baja. Premia a los primeros y no obliga a bajar el precio nunca.
- **Los tickets, con tope razonable:** 3.000 al mes por NIF dentro del precio —lo mismo que nos incluye Verifacti—, y de ahí en adelante, a precio de coste. Casi nadie llega.

Cambiarlo toca la web, Stripe y el Manifiesto: se hace en una entrega pequeña cuando Richi diga que sí.

## Lo que no se decide aquí

- **Cuántos créditos de Fogón lleva Pro.** Con lo medido, en M22 (0065).
- **El orden y el precio**, hasta que Richi conteste.
