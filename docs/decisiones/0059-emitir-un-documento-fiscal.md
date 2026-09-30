# 0059 · Emitir un ticket o una factura: con estados, clave y sin llamar dentro de la transacción

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)). **Solo
documentos**: se construye en M20B. **Nada de esto va a producción sin la revisión
escrita del asesor** (Anexo, capítulo 9).
**Corrige:** el flujo de emisión del Anexo (4.4 y 4.9), su apartado sin conexión (4.11),
la conservación (4.13) y la frase del Manifiesto «la ley no permite dar una factura sin
haber generado antes su registro» como razón de que sin internet no haya ticket.
**Cambia:** el Anexo (4 y 8), el Manifiesto (principio 12, 29 y 34), la Evolución (19,
que se funde, [0063](0063-una-fuente-por-tema.md)) y la Auditoría de flujos (2.29, 2.32 y
2.33).

## Lo que pasó

La auditoría encontró **un fallo de diseño** y **una afirmación que no era verdad**:

1. **El Anexo mandaba el ticket a Verifacti dentro de la transacción de la base**, con
   el candado del NIF cogido. Si Verifacti lo registra pero la respuesta no llega —se
   corta la red, la función se cae, pasa el tiempo máximo—, Estook deshace todo, el
   número vuelve a quedar libre y el siguiente cobro lo reutiliza: queda un registro en
   la AEAT que Estook no conoce, o dos con el mismo número. Y mientras se espera a
   Verifacti, los demás terminales del mismo NIF esperan en fila.
2. **«Sin conexión no hay ticket porque la ley no lo permite» no es lo que dice la
   AEAT.** En sus [preguntas frecuentes](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/sistemas-verifactu.html),
   ante un corte de luz, de internet o de su sede, esas incidencias «no suponen en
   ningún caso que deba interrumpirse la facturación de la empresa. Esta deberá
   continuar con normalidad y los sistemas podrán enviar los registros a posteriori»,
   marcando la incidencia y sin un plazo máximo fijo. Lo que impide a Estook facturar
   sin internet **es su arquitectura**: el registro (la huella y el encadenamiento) lo
   genera Verifacti en su servidor.

## Lo que se decide

### 1 · El documento tiene estados, y la llamada va fuera

```
PREPARADO   se asigna el número de su serie y se guarda todo congelado
    ↓         (transacción corta: el candado es de la serie y dura milisegundos)
ENVIANDO    se llama a Verifacti FUERA de la transacción,
    │         con la clave de idempotencia = el identificador del documento
    ├─ responde   → REGISTRADO, con su QR y su huella
    ├─ rechaza    → RECHAZADO, a la pantalla de registros con error
    └─ no se sabe → se pregunta el estado a Verifacti y se reintenta con la MISMA clave
                    (nunca crea dos), y un trabajo repasa lo que quede a medias
```

- **El documento nace preparado y no cambia nunca más.** Su estado se lee de lo que se
  le va añadiendo —cada envío, cada respuesta—, una fila por novedad. Así el esquema
  `facturacion` es de verdad solo de inserción, sin una excepción en sus disparadores
  (Anexo 7.6).
- **Verifacti admite la clave** (`Idempotency-Key` en `/verifactu/create`: contesta
  409 si ya se está procesando y 422 si el cuerpo no cuadra con la clave;
  [documentación](https://www.verifacti.com/docs)). El Anexo no la usaba.
- **El número se asigna al preparar**, no al volver la respuesta. Un documento
  preparado **nunca se pierde**: o se registra, o se queda a la vista con su error.
- **Lo que se puede comprobar, se comprueba antes de numerar**: NIF, importes, el
  desglose (doce líneas como mucho) y el límite de la simplificada. Así un rechazo por
  datos es raro.
- **Si Verifacti rechaza por datos antes de registrar nada**, se corrige y se vuelve a
  mandar **con el mismo número**, porque ese documento no se ha entregado.
  **[VERIFICAR con el asesor.]**
- **Si la AEAT lo rechaza después**, el número queda usado y se corrige con otro
  documento, como ya decía el Anexo.

### 2 · Sin conexión: lo que dice la ley y lo que hace Estook

| Qué pasa                                | Qué dice la AEAT              | Qué hace Estook en la primera versión                                                     |
| --------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| Hacienda no responde                    | Se factura y se envía después | Igual: Verifacti guarda y reintenta. En sala no se nota                                   |
| Verifacti no responde o no hay internet | Se sigue facturando           | **Justificante provisional**, y el ticket se emite al volver, en orden, con la incidencia |

- **El justificante** lleva lo mismo que el ticket, dice claramente que no es una
  factura, **y un código para descargar el ticket** en cuanto se emita, desde el móvil.
  Es lo que recomienda el propio Verifacti cuando su servicio no responde.
  **[VERIFICAR con el asesor el texto y que esto cumple.]**
- **Facturar sin internet de verdad** —que Estook Link genere el registro en el local y
  lo mande después, como permite la AEAT— **es posible y sería una ventaja clara**, pero
  exige saber cómo se encadenan los registros de varios locales del mismo NIF y si
  Verifacti acepta registros generados fuera. Queda como futuro, con el asesor y la
  documentación técnica de la AEAT delante.

### 3 · Lo que Estook guarda para no depender de nadie

El documento congelado entero, sus estados, su clave, lo que devolvió Verifacti (su
identificador, el QR y la huella), **cada envío** con su fecha y su respuesta, los
avisos recibidos, y **los XML de petición y respuesta** (`/verifactu/downloadXML`).
Verifacti borra los datos 30 días después de cancelar: con esto, Estook puede demostrar
lo emitido aunque el proveedor desaparezca.

### 4 · Cuánto tiempo se guarda

**Seis años**, no cuatro. La prescripción fiscal son cuatro (Ley General Tributaria),
pero el Código de Comercio ([art. 30](https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627))
obliga al empresario a guardar la documentación de su negocio seis años, y el más largo
manda. **[VERIFICAR con el asesor.]** La tabla de todos los plazos, en
[`docs/legal/conservacion-de-datos.md`](../legal/conservacion-de-datos.md).

### 5 · Solo inserción, de verdad

Los disparadores que rechazan `update` y `delete` en `documentos`, `registros` y
`envios` **también rechazan `truncate`**, que no pasa por los de fila. Y la auditoría
gana el mismo bloqueo.

## Pruebas nuevas en M20B

- Verifacti registra y la respuesta se pierde: al reintentar **no hay dos registros ni
  dos números**, y el documento acaba registrado.
- Se cae la función con el documento enviándose: el trabajo lo encuentra y lo termina.
- Cinco terminales cobrando a la vez: **ninguno espera a Verifacti para numerar**.
- Un rechazo por datos se corrige y sale con el mismo número.
- `truncate` sobre las tablas fiscales falla con todos los roles.
