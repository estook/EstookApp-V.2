# 0061 · El orden nuevo y la infraestructura: el TPV tras M10, las copias, Cloudflare y las claves

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)).
**Sustituye:** el orden de la Fase 4 del Plan 1.3 («el TPV va después de M17») y, de la
[0002](0002-runtime-de-la-api.md), «el servicio de documentos se decide en M11».
**Cambia:** el Plan (D y E3), la [Arquitectura](../maestros/Estook-Arquitectura.md),
`config/claves.md` y el `MAPA-de-modulos.md`.

## Lo que pasó

Richi contestó cinco cosas que ordenan lo que viene:

- **El TPV, justo después de M10.** Los autónomos —la mayoría de los bares— tienen que
  usar un programa adaptado a VeriFactu desde el **1 de julio de 2027**, y las
  sociedades desde el 1 de enero ([nota de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html)).
  En el primer semestre de 2027 mucha gente cambia de TPV.
- **Supabase Pro, en unas semanas**, «si no es estrictamente necesario».
- **Cloudflare, al final**: «ahora es fácil en GitHub por los pull request; al acabar el
  último módulo lo movemos».
- **¿Qué pasa con las claves, los secretos, las funciones y la API?**
- **Que no quede nada en el aire.**

## 1 · El orden

```
ANTES DE M8   H · Horarios        (con la persona sin correo y los fichajes listos
                                   para el registro horario digital)
              I · La app instalable (el service worker: la base del TPV)
              A3 · Vendedores  ·  A4 · Ventas del admin
FASE 2        M8 → M9 → M10
ESTOOK TPV    M16a · La jornada → M20 · Ventas y consumo → M19a · Estook Link
              → M20A · Sala y cocina → M20B · Facturación → M20C · Cobro y caja
DESPUÉS       M11 → M12 → M13 → M14 → M15 → M16b · APPCC → M17 → M18 → M19b
              → Fase 5 (M21 a M25) → Fase 6 (M26 a M28) → Fase 7 (M29, M30)
```

- **M16 se parte en dos.** El TPV necesitaba M16 por **la jornada** (abrirla sola, la
  fecha operativa, la noche del cambio de hora, el cierre del día), no por el APPCC.
  **M16a · La jornada** va delante del TPV; **M16b · APPCC y trazabilidad** se queda
  en la Fase 3.
- **Los números de los módulos no cambian**, para no romper las referencias.
- **Lo que el TPV necesita de M11** —el PDF de la factura completa— ya existe para
  entonces, porque el motor de documentos se estrena en H (abajo, punto 5).
- **Quedan con el TPV** también los dos datos que M15 pedía para el quiosco de fichar:
  el terminal del local es el mismo aparato (0057).

## 2 · Las copias de seguridad, ya, y Supabase Pro en unas semanas

**No es estrictamente necesario pagar Pro hoy** si hay copias de verdad mientras tanto.
Así queda:

| Cuándo                                | Qué                                                                                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ya** (rama de la prueba del martes) | Una copia **semanal, cifrada y fuera de Supabase**, hecha por GitHub cada lunes de madrugada, que **se restaura sola en una base de prueba** en el mismo paso: una copia que no se ha restaurado no es una copia. Y la de los ficheros (logos, fotos, cartas) |
| **En unas semanas**                   | **Supabase Pro**: copia diaria de siete días, sin pausas, registros de más días. La semanal sigue                                                                                                                                                             |
| **Como muy tarde**                    | **Antes del primer cliente que pague de verdad.** Es la condición, no una fecha                                                                                                                                                                               |
| **Con el TPV en marcha**              | La recuperación a un punto exacto en el tiempo (un añadido de Pro): con tickets, perder un día no vale                                                                                                                                                        |

La copia necesita dos secretos en GitHub, y los pone Richi (sus pasos, en
`docs/pasos-antes-de-m8.md`): **`URL_DE_LA_COPIA`**, la misma dirección de la base que
ya tiene en su ordenador, y **`CLAVE_DE_LA_COPIA`**, una contraseña larga que guarda
también en su gestor de contraseñas, porque sin ella la copia no se puede abrir.
Opcional, **`CLAVE_DE_SERVICIO_COPIA`**, para los ficheros.

## 3 · Cloudflare al final, con una condición

**Se mueve al final, como pidió Richi, con una condición que no se negocia:** antes del
primer cliente que pague de verdad o antes de vender Estook TPV, lo que llegue primero.
Hasta entonces GitHub Pages vale para desarrollar; después no, porque sus condiciones
no permiten un SaaS de pago
([límites de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)).

**Y lo que Richi preguntó: qué pasa con las claves, las funciones y la API.** Casi nada
se mueve, porque Cloudflare solo sustituye al escaparate:

| Pieza                                                        | Dónde vive hoy                      | Con Cloudflare                                                                               |
| ------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| El código, los pull request y las pruebas                    | GitHub                              | **GitHub, igual.** Se sigue trabajando exactamente igual                                     |
| La web, la app, la carta y el admin (páginas)                | GitHub Pages                        | **Cloudflare Pages**                                                                         |
| La API                                                       | Supabase Edge Functions             | **Igual**                                                                                    |
| La base y los ficheros                                       | Supabase                            | **Igual**                                                                                    |
| Los secretos del servidor (Stripe, Resend, Google, la base…) | Supabase → Edge Functions → Secrets | **Igual. No se toca ni uno**                                                                 |
| Las variables públicas `VITE_…`                              | GitHub → Variables                  | **Igual**: GitHub sigue construyendo y le entrega a Cloudflare lo construido                 |
| Los secretos de desplegar la API                             | GitHub → Secrets                    | **Igual**                                                                                    |
| La dirección `estook.com`                                    | DNS en Hostinger → GitHub           | DNS en Hostinger → Cloudflare. Es el único cambio que se nota, y se prepara con vuelta atrás |
| Entrar con Google, Stripe, los enlaces de los correos        | Apuntan a `estook.com`              | **Igual**: el dominio no cambia                                                              |
| **Nuevo**                                                    | —                                   | Dos secretos en GitHub: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`                     |

**Lo que se gana ese día:** cabeceras de seguridad de verdad (hoy la app se podría meter
dentro de otra web para engañar a alguien), direcciones sin «#», y **una vista previa de
cada pull request que Richi abre en el iPhone antes de fusionar**.

## 4 · El repositorio público

El repositorio es público, porque GitHub Pages gratis solo publica repositorios públicos
y porque así las pruebas de GitHub no cuestan. Se comprobó en producción que no abre
ninguna puerta. Pero enseña el plan de negocio, la oferta de Verifacti y datos
personales.

- **Ya:** los correos personales salen de los documentos (el de Santi estaba en varios).
  El historial de git los conserva: por eso lo siguiente.
- **En la mudanza a Cloudflare, el repositorio pasa a privado.** Ese día GitHub Pages ya
  no hace falta. Las pruebas pasarán a gastar minutos de GitHub: en septiembre fueron
  unas 350 vueltas y unos 1.700 minutos de reloj, que se facturan algo más porque cada
  vuelta lleva tres trabajos a la vez; con 2.000 minutos gratis al mes, **del orden de
  5 a 25 € al mes** según el ritmo. Se mide ese día y se decide si se recorta algo.

## 5 · El motor de los PDF se decide al empezar H

La [0002](0002-runtime-de-la-api.md) ya decía que un Chromium sin interfaz **no cabe**
en las Edge Functions (256 MB de memoria y 2 s de CPU por petición,
[límites de Supabase](https://supabase.com/docs/guides/functions/limits)) y lo dejaba
para M11. Pero **H ya necesita el PDF** (los informes y el cuadrante), así que se decide
al empezar H, **con una prueba de verdad** de las dos salidas: un servicio aparte que
convierta HTML en PDF, o una librería de PDF en el servidor. Gana la que dé el documento
bien hecho, rápido y sin coste fijo que no se justifique. Sigue en pie la regla 7: **el
PDF nunca se hace en el navegador**.

## 6 · Lo técnico que se adelanta

| Qué                               | Por qué                                                                                                                                                                                                                                            | Cuándo                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **La API junto a la base**        | Supabase ejecuta la función en la región más cercana al usuario y recomienda la de la base si hay varias consultas ([documentación](https://supabase.com/docs/guides/functions/regional-invocation)). Se mide, se fija Irlanda y se vuelve a medir | Con la siguiente entrega         |
| **Errores del servidor a Sentry** | Hoy solo avisan los del navegador. Y en el admin, buscar lo que pasó por su hilo                                                                                                                                                                   | Con la siguiente entrega         |
| **El reloj por tandas**           | Hoy un latido recorre todas las cuentas; con cientos de locales no cabe en el tiempo de una función. Se reparte en la cola de trabajos                                                                                                             | Antes de M20                     |
| **El trabajador de la cola**      | Para que una venta no espere a recalcular costes e informes: lo que no puede quedar a medias, en la misma transacción; lo demás, detrás                                                                                                            | Antes de M20                     |
| **La exportación completa**       | La prometen las condiciones: «lo que escribes es tuyo y puedes exportarlo»                                                                                                                                                                         | Antes del primer cliente de pago |
