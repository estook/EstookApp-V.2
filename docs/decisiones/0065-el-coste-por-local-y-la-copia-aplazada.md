# 0065 · El coste por local, con su prueba final; y la copia de seguridad, aplazada

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido por Richi, al fusionar la #78 y la #79.
**Cambia:** de la [0061](0061-el-orden-y-la-infraestructura.md), «las copias de
seguridad, ya»: la copia semanal queda **escrita y apagada** hasta la mudanza de
alojamiento. Y del Manifiesto (32), la tabla de costes, que pasa a
[`docs/coste-por-local.md`](../coste-por-local.md).

## Lo que pasó

Richi pidió dos cosas al cerrar la auditoría:

1. **Dejar la copia de seguridad para más tarde**: «cuando migremos a otro hosting, ahí
   cambiamos todo y lo dejamos fino». No quiere pagar Supabase Pro todavía.
2. **«Una prueba final de gastos por local total, contando la IA y todo.»**

## 1 · La copia de seguridad

**La copia semanal no cuesta nada ni necesita Supabase Pro**: la hace GitHub, gratis, y
solo pide tres secretos. Se le dijo a Richi así, y **la decisión de cuándo encenderla es
suya**. Queda de esta forma:

- **El flujo `Copia de seguridad` sigue en el repositorio, y sin secretos no hace nada**:
  los lunes sale en verde con un aviso de que no hay copia, en vez de en rojo cada
  semana. Lanzado a mano sin secretos, sí falla y dice qué falta.
- **Se enciende en la mudanza** a Cloudflare, junto con Supabase Pro, el repositorio en
  privado y las claves nuevas: los cuatro pasos van juntos en
  [`pasos-antes-de-m8.md`](../pasos-antes-de-m8.md).
- **La condición no cambia**: antes del primer cliente que pague de verdad.

**El riesgo, dicho claro:** hasta entonces **no hay ninguna copia** de la base de
producción. Si algo se borra por error o Supabase pierde el proyecto, no hay vuelta
atrás. Hoy lo que hay dentro es `ikatz`, el negocio de Richi, con datos de verdad, y
cuatro cuentas de prueba. Encenderla son cinco minutos, y se puede hacer cualquier día
sin esperar a la mudanza.

## 2 · El coste por local

- **Una sola cuenta**, en [`docs/coste-por-local.md`](../coste-por-local.md), con todo:
  la IA, Google, el servidor, Stripe, Verifacti y lo fijo de cada mes.
- **Los precios viven en un fichero** (`herramientas/coste-por-local.mjs`), cada uno con
  su fuente, y las tablas del documento salen de ahí. `verifica` y la integración
  continua comprueban que cuadran (`pnpm coste:comprobar`).
- **Cada cifra dice qué es**: comprobada contra el precio publicado, heredada de un
  documento, o un supuesto sin medir.

**Lo que salió al hacer la cuenta, y que corrige lo escrito:**

| Lo que decía                                                    | Lo que es                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| «Resultado medido: menos de 1,50 € de IA al mes»                | **No estaba medido**: Fogón no existe. Es el objetivo. Un Pro que gasta sus 1.500 créditos puede costar 11 € |
| Pasarela de pago, 0,84 € por local                              | Entre 1,33 y 3 €: faltaba el 0,7 % de Stripe por llevar la suscripción                                       |
| El punto de equilibrio, con ingresos de 490 € por diez Esencial | Llevaba el IVA dentro. Sin él son 405 €                                                                      |
| Costes fijos                                                    | Hoy, cero. Para vender, unos 65 € al mes; con Estook TPV, unos 163 €                                         |

**La conclusión no cambia**: un local normal deja entre el 80 y el 90 %, y el precio
está bien puesto. Lo que cambia es que **el caso malo —un bar muy ocupado, con TPV y
gastando todos sus créditos— deja un 30 %**, y eso hay que saberlo antes de decidir en
qué plan entra el TPV y cuántos créditos lleva Pro.

## 3 · La prueba final

Tres momentos, escritos en el Plan:

1. **M22**: medir los tokens de cada acción de Fogón y cambiar el supuesto por lo medido.
   Condición: gastar todos los créditos de Pro deja al menos un 60 %.
2. **M27**: un mes de un local de ejemplo cargado como uno de verdad, con la factura real
   de cada proveedor al lado. El coste medido no se separa más de un 20 % de la tabla.
3. **M28**: el coste real de los locales del piloto, en el panel interno.

## Lo que queda de Richi

- **Qué modelo es «el grande»** de Fogón Pro, y si 1.500 créditos son los que tienen que
  ser. Se decide en M22, con lo medido delante.
- **Preguntar a Verifacti qué se paga con menos de diez NIF** (la oferta caduca hacia el
  19 de octubre).
