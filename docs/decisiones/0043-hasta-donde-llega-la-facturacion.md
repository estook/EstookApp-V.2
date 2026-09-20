# 0043 · Hasta dónde llega la facturación: Canarias entra, Ceuta y Melilla esperan, foral y SII quedan fuera por ley

**Fecha:** 20 de septiembre de 2026
**Estado:** decidido. **Nada construido todavía**: es M20B, en la Fase 4
**Cambia:** el apartado 1.4 del [Anexo · TPV y facturación](../maestros/Estook-Anexo-TPV-y-Facturacion.md), que bloqueaba Canarias, Ceuta y Melilla con un motivo equivocado
**Precisa:** [0006](0006-el-motor-fiscal.md) (sin regla, no se inventa un tipo)

## De dónde sale

El Anexo 1.0 dejó cuatro casos fuera del módulo de facturación en una sola tabla:
País Vasco, Navarra, empresas con SII, y **Canarias, Ceuta y Melilla**. A los tres
últimos les ponía el mismo motivo —«impuestos distintos»— y un **[VERIFICAR con el
asesor]**.

Se comprobó el 20 de septiembre de 2026 contra la
[FAQ de ámbitos de aplicación de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/cuestiones-generales-ambitos-aplicacion.html),
y **el motivo escrito era falso**:

> «Los contribuyentes con domicilio fiscal en Canarias, Ceuta y Melilla **se
> encuentran comprendidos dentro del ámbito subjetivo de aplicación** del
> Reglamento SIF aprobado por el Real Decreto 1007/2023», y las referencias al IVA
> se entienden hechas también al IGIC y al IPSI.

Es decir: **no es que la ley los deje fuera. Es que nosotros no habíamos mirado.**

Los que **sí** están fuera por ley son los otros dos casos, y por razones distintas
entre sí: País Vasco y Navarra por normativa foral en la imposición directa —allí
rige TicketBAI—, y las empresas con SII porque el reglamento dice expresamente que
no se les aplica.

## Lo que se decide

### Uno · Canarias entra, con IGIC

Porque **casi todo el trabajo ya está hecho y no lo habíamos contado**:

- `estook.local.territorio` y `estook.local.regimen` existen **desde la migración
  `0012`**, con un `check` que impone que Canarias sea IGIC.
- `estook.regla_fiscal` ya guarda territorio, régimen, vigencia y referencia legal,
  y **una regla usada no se reescribe**.
- `desglosar()` en `packages/dominio/src/fiscal/desglose.ts` **ya agrupa por
  régimen y tipo**, no solo por tipo de IVA.
- Verifacti soporta IGIC.

Lo único que falta son **las filas de `regla_fiscal` del IGIC de hostelería**, y esas
las confirma el asesor exactamente igual que tiene que confirmar las del IVA. No es
trabajo nuevo: es la misma pregunta con otra respuesta.

Y hay mercado de verdad detrás: Canarias son más de dos millones de personas con una
hostelería enorme. Dejarla fuera por no haber leído una FAQ sería el tipo de error
que este proyecto persigue.

### Dos · Ceuta y Melilla esperan, y se dice por qué de verdad

No por la ley, sino porque **el IPSI mete una dimensión más de reglas**: su tipo
depende de la **categoría del establecimiento** —un restaurante de un tenedor y uno
de tres no tributan igual— y del **epígrafe del IAE**. Eso son más reglas que
confirmar, más pruebas y más superficie donde equivocarse, para dos ciudades de unos
85.000 habitantes cada una.

El dato ya está preparado: `estook.local.actividad` y `estook.local.epigrafe_iae`
existen desde la `0012`, y el comentario de esa migración ya decía que se guardan
siempre aunque hoy no cambien nada. **Abrirlo es sembrar reglas, no migrar.**

**Se abre cuando haya un cliente que lo pida**, y no antes.

### Tres · La pantalla dice la verdad, y distingue «no se puede» de «todavía no»

El alta de facturación no puede enseñar el mismo cartel para los cuatro casos:

| Caso                 | Lo que ve el cliente                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| País Vasco o Navarra | «Tu negocio tributa por normativa foral, y ahí rige TicketBAI, que es otro sistema. **Estook todavía no lo hace.**» Definitivo por ahora, y se dice |
| SII                  | «Tu empresa lleva los libros por el SII, y el reglamento de facturación no se le aplica. **Estook no hace SII.**» Definitivo                        |
| Ceuta o Melilla      | «Tu negocio tributa por IPSI. **Todavía no lo tenemos**, pero está en camino: escríbenos y lo priorizamos.» No definitivo, y se dice                |
| Canarias             | Nada. **Se activa igual que en la península**, con IGIC                                                                                             |

Sin errores rojos, y **sin dar por definitivo lo que no lo es**: un «no se puede»
donde cabía un «todavía no» pierde un cliente que habría esperado.

### Cuatro · El territorio no se pregunta dos veces

El alta de facturación **lee `local.territorio`**, que ya se rellenó en el alta del
local (M5), y no lo vuelve a preguntar. Preguntarlo otra vez es la forma segura de
acabar con un local canario facturando con IVA, y el `check` de la base lo rechazaría
en el peor momento posible: al cobrar.

## Lo que esto obliga a hacer, cuando llegue M20B

1. Sembrar las reglas fiscales del **IGIC de hostelería**, con su referencia legal y
   su vigencia, confirmadas por el asesor.
2. En `desglosar()`, añadir la **clave de régimen** de VeriFactu a la clave de
   agrupación: hoy agrupa por `regimen` + `tipo`, y el reglamento agrupa por **tipo
   impositivo y clave de régimen**, que son cosas distintas.
3. Una prueba de que un local canario **no puede emitir con IVA**, y un local
   peninsular **no puede emitir con IGIC**.
4. Una prueba de que un local foral o con SII **no puede activar el módulo**, y de que
   la pantalla dice su motivo, el que le toca a cada uno.

## Lo que no se decide aquí

- **Los tipos concretos**, ni de IVA ni de IGIC. Los confirma el asesor (Manifiesto,
  capítulo 9), y sin regla no se inventa un tipo ([0006](0006-el-motor-fiscal.md)).
- **TicketBAI.** Verifacti lo hace, así que el día que se quiera es una ampliación
  del adaptador, no un parche. No entra en la v1.
