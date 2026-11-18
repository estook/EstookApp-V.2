# La auditoría S1 · Cada plan, lo suyo (18-nov-2026)

> La primera de las que pide el [Plan, E5](../maestros/Estook-Plan-de-Desarrollo.md): que Esencial
> no llegue a nada de Pro ni de Estook TPV, **en el servidor y no solo en la pantalla**. Lo
> decidido, en la [0147](../decisiones/0147-s1-cada-plan-lo-suyo.md).

## Qué se miró

- **El punto 4 de seguridad, los límites de cada plan**, entero: las 504 operaciones del catálogo
  (134 consultas y 370 comandos), una a una.
- **Las pantallas de Estook** que usan algo de Estook TPV, con un local en Esencial.
- **Los puntos 1 a 3** (los negocios separados, los roles y la puerta de cada operación) los vigila
  en cada pull request la prueba que ataca toda la API desde otro negocio y con cada rol
  ([0101](../decisiones/0101-la-auditoria-del-20-oct.md)): se pasó entera con este cambio
  (`pnpm verifica`).

## Cómo

- **Leyendo cada operación**: quién la puede llamar (sin sesión, desde un aparato, con la sesión de
  una persona o desde el admin) y qué permiso exige. Las de un aparato ya las cierra la puerta del
  pago (0120). Las que se llaman con la sesión de una persona y exigen un permiso de Estook TPV
  (Roles 1.12) son las que se clasificaron.
- **Llamando a la API a pelo**, contra la base, con la gerente de un local en Esencial, en Pausa y
  en Pro (`base-de-datos/pruebas/estook-tpv-es-de-pro.prueba.ts`).

## Qué salió, de más grave a menos

1. **Lo de Estook TPV hecho desde Estook no miraba el plan.** Un local en Esencial podía, llamando a
   la API, hacer el alta de facturación, una factura a mano o de una señal, imprimir el ticket de
   prueba y abrir la pantalla de cocina. **Sin datos cruzados entre empresas**: cada uno, con lo
   suyo. **Arreglado**: la puerta `deEstookTpv` en 21 operaciones.
2. **Tickets y facturas ofrecía «Hacer una factura» y «Factura de una señal» sin Pro.** Arreglado:
   lo decide el servidor (`puede.aMano`).
3. **Ajustes › Facturación dejaba abrir los pasos del alta sin Pro.** Arreglado: se ve como estaba,
   con un aviso, y no se toca.

Lo que estaba bien: la sala, la botonera, el plano, las opciones y las bebidas solo se hacen desde
un aparato; vincular ya miraba el plan; y no hay más de Pro construido (las reseñas de Pro son M23,
los canales conectados M29 y la cadena M24).

## Qué se arregló, con su prueba

- `servidor/aplicacion/cada-plan-lo-suyo.prueba.ts`: cada operación de Estook TPV que se llama
  desde Estook está decidida, cerrada sin Pro o abierta con su motivo. **Vista fallar** quitando la
  puerta de `tachar` y quitando `marcar_cobrada` de la lista.
- `base-de-datos/pruebas/estook-tpv-es-de-pro.prueba.ts`, «S1»: en Esencial, la cocina, el ticket
  de prueba, «Pide tu factura» y la modalidad dan `estook_tpv_es_de_pro`; sus tickets y su alta se
  siguen leyendo; la lista no ofrece la factura nueva; con Pro, todo abierto. **Vista fallar**
  quitando la línea de la puerta del pago.

## Qué queda, con su entrega

- **Los datos de los empleados** (punto 6): en la Auditoría 3, después de M13 a M16b.
- **El area manager** (punto 7): no existe todavía; en la Auditoría 4, con M24.
- **La pantalla «Tus datos»** para quien se da de baja: con M27.
- **Las siete clases de prueba enteras**: en la Auditoría 2, con Estook TPV terminado.
