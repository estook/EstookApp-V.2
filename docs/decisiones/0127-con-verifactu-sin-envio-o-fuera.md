# 0127 · Cómo factura cada empresa: con VERI*FACTU, sin envío o fuera, por el SII

**Fecha:** 4 de noviembre de 2026
**Estado:** decidido y construido en la rama `t6-la-facturacion`, dentro de la migración **0099**
(todavía sin migrar). **«Sin envío» se puede ver y no elegir**: llega con **T6 · 3**.
**Sigue:** la [0126](0126-t6-1-el-alta-de-facturacion.md) (T6 · 1 · El alta).
**Cambia:** el Anexo (1.3, 1.4 y 4.14), el plan de M20A (T6 · 1 y la nueva T6 · 3),
[`lo-investigado.md`](../legal/lo-investigado.md) (A24 a A27) y ESTADO.

## 1 · Lo que pidió Richi

El 4-nov: «hay empresas que no necesitan VERI*FACTU: que en Ajustes del TPV se pueda elegir sin
VERI*FACTU o con VERI*FACTU (recomendada), bien pulido para las dos, con una «i» que explique qué es
y cómo elegir. Que las dos emitan tickets y facturas, pero que sin VERI*FACTU no se mande a la AEAT,
y cumpliendo lo que pida España. VERI*FACTU queda como hablamos.»

## 2 · Lo que dice la ley, mirado el 4-nov

Todo, con su enlace, en `lo-investigado.md`, de A24 a A27.

- **Hay dos formas de cumplir, y las dos son legales** (AEAT, «Modalidades de cumplimiento»):
  **VERI\*FACTU**, que manda cada registro a Hacienda al momento, y **NO VERI\*FACTU**, que no lo manda.
- **NO VERI\*FACTU no es «sin nada»: pide más.** Cada ticket deja igual su registro, encadenado al
  anterior. Además, cada registro va **firmado con un certificado electrónico cualificado** y en el
  momento: el registro no existe hasta que está firmado. Hay que comprobar la cadena antes de cada
  registro nuevo, y llevar **un registro de eventos** que vigila el programa y la hora (que no se
  aparte más de un minuto). Todo se **guarda sin poder cambiarlo**, y se manda a Hacienda **si lo
  pide**, tal cual se hizo. La factura lleva el QR, pero no es «verificable» (preguntas frecuentes
  para desarrolladores de la AEAT, 4-dic-2025).
- **Quien elige VERI\*FACTU se queda en ella al menos hasta el fin del año natural.** A VERI*FACTU
  se puede pasar en cualquier momento (preguntas frecuentes de la AEAT).
- **Hacienda ha dicho** que revisará más a quien no use VERI*FACTU, y que esa forma es temporal.
- **Quien lleva los libros por el SII queda fuera del reglamento** (Anexo 1.4). Esa es la empresa
  que de verdad «no necesita VERI*FACTU», y hasta hoy el alta la paraba.
- **Verifacti no hace NO VERI\*FACTU**: lo dice en sus preguntas frecuentes, por la poca demanda y
  por lo que pide. Si Estook la quiere, **la construye Estook**.

## 3 · Lo que se decide

Cada empresa factura de una de tres formas, que se ven en el paso 2 del alta (Estook › Ajustes ›
Facturación) y en **Ajustes del TPV › Facturación**, cada una con su «i»:

| Forma                                | Qué es                                                                            | Hoy                                       |
| ------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------- |
| **Con VERI\*FACTU** (recomendada)    | Cada ticket va a Hacienda al momento, por Verifacti                               | La de fábrica                             |
| **Sin envío** (NO VERI*FACTU)        | Registros firmados y guardados en Estook; a Hacienda, si los pide                 | **Se ve y no se elige**: llega con T6 · 3 |
| **Fuera de VERI\*FACTU, por el SII** | Tickets y facturas del Reglamento de facturación, sin QR de Hacienda ni registros | **Sale sola** al contestar el SII         |

- **Con el SII, el alta ya no se para**: va fuera de VERI*FACTU y queda lista con las series, sin
  alta en Verifacti ni autorización. Lo que se emite lo informa la empresa por su SII.
- **«Sin envío» no se puede elegir hasta que exista de verdad.** Elegirla y no poder emitir, o
  emitir sin firma ni registro de eventos, sería un programa que no cumple, y eso es una sanción
  para quien lo vende (Anexo 1.2). La base la rechaza con su motivo, y la pantalla lo dice.
- **La regla del año natural**, escrita y probada (`porQueNoSePuedeCambiar`): con VERI*FACTU de
  verdad, a «sin envío» solo a partir del 1 de enero. En pruebas, nada cuenta.
- **Lo del SII lo comprueba la base**: una empresa va fuera solo si lleva el SII, y si lo lleva va
  fuera.
- **Elegir cómo factura pide el mismo permiso que el alta** (gerente, dirección y administrador de
  cuenta), en Estook y en el TPV. Queda en la auditoría.
- **Mientras «sin envío» no exista, Estook sigue declarando que funciona solo como VERI\*FACTU**
  (Anexo 4.14). Cuando llegue, Estook pasa a ser un programa «dual»: el registro de eventos es
  obligatorio en el código, y la declaración se cambia y se vuelve a firmar.

## 4 · T6 · 3 · Sin envío

Su «Terminado cuando» está en [el plan](../m20a-la-sala-y-la-cocina.md). Va **después de T6 · 2**,
porque comparte el motor de emitir. Tiene **una pregunta que no se adivina**: con qué certificado se
firma cada registro. Puede ser el de cada empresa, guardado cifrado en Estook, o uno de Estook con
la representación de cada empresa. La contestan Richi y el asesor antes de construirla.

## 5 · Lo que decidió la IA

1. **El SII deja de ser una parada y pasa a ser una forma de facturar.** Era la única de las cuatro
   paradas en la que la ley deja facturar sin nada más.
2. **«Sin envío» se ve, explicada, y no se elige**, en vez de esconderla o de dejarla elegir a
   medias.
3. **La pieza «Cómo factura» es una sola** (`@estook/ui`) para Estook y el TPV, y lo que dice cada
   forma sale de un solo sitio (`@estook/dominio`).
4. **En el TPV, «Facturación» enseña cómo va el alta y cómo factura**; el alta se hace en Estook.
