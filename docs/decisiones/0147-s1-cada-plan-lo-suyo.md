# 0147 · S1 · Cada plan, lo suyo: lo de Estook TPV hecho desde Estook también es de Pro

**Fecha:** 18 de noviembre de 2026
**Estado:** construido en `s1-cada-plan-lo-suyo`. **Sin migración.**
**Sigue:** la [0120](0120-estook-tpv-es-de-pro.md) (Estook TPV es de Pro, que ya cerraba los
aparatos) y la [0146](0146-la-reorganizacion-del-11-nov.md), sección 8, que dejó escrito lo que
faltaba.
**Cambia:** el contrato del servidor (la puerta `deEstookTpv`), la puerta del pago, Ajustes ›
Facturación y Tickets y facturas en Estook, [las auditorías](../auditorias/LEEME.md), el
[mapa](../MAPA-de-modulos.md) y ESTADO. La auditoría, en
[`auditoria-2026-11-18-cada-plan-lo-suyo.md`](../auditorias/auditoria-2026-11-18-cada-plan-lo-suyo.md).

## 1 · Lo que faltaba

Desde la 0120, **lo que entra con un aparato** (la llave, el PIN, la pantalla de cocina) lo cierra
la API si el local no es de Pro. Lo que no cerraba era **lo de Estook TPV que se hace desde
Estook, con la sesión de una persona**: el alta de facturación, la factura a mano y la de una
señal, el ticket de prueba y la pantalla de cocina. La pantalla lo escondía; llamando a la API a
pelo, un local en Esencial llegaba. No cruzaba datos entre empresas, pero un plan llegaba a lo de
otro.

Lo que se miró antes de tocar nada, en las 504 operaciones del catálogo:

- **La sala, la botonera, el plano, las opciones y las bebidas** se hacen solo desde un aparato
  (`enElTpv: 'solo'`): ya estaban cerradas.
- **Vincular** (con el correo o con un código sacado en Estook) ya miraba el plan por dentro.
- **Las reseñas con respuesta de Pro** son M23, que no existe: lo de Fogón con una reseña pegada es
  de todos ([0098](0098-fogon-1-entero.md)). **Los canales de reparto conectados** (M29) y **lo de
  la cadena** (M24) tampoco existen. No hay nada más de Pro abierto a Esencial.

## 2 · Lo que queda

- **Una puerta nueva, `deEstookTpv`**, en el contrato: la operación lo declara y la puerta del pago
  la cierra sin Pro, con `estook_tpv_es_de_pro`, con la sesión de una persona igual que con un
  aparato. Lo que no se comprueba a mano no se olvida en la operación número cuarenta.
- **Se cierran 21 operaciones**: el alta de facturación paso a paso y quién factura (12), dar un
  permiso de facturas, la factura a mano, la de una señal, el ticket de prueba, y la cocina en el
  servicio (la pantalla, tachar, destachar, todo fuera y recuperar).
- **Un local que deja Pro no pierde nada** (0120), y lo dijo Richi el 18-nov: «claro que puede ver
  sus datos». Se quedan abiertas, cada una con su motivo en la prueba: **ver y descargar** sus
  tickets, facturas, cierres de caja y el Z; y **lo que la ley pide sobre lo ya cobrado**: la
  factura completa de un ticket (F3, [lo investigado](../legal/lo-investigado.md), A19), devolver,
  corregir y anular ([A5](../legal/lo-investigado.md)). No abre mesas, no cobra y no monta nada:
  «para eso tiene que pagar el Pro».
- **Una prueba clasifica cada operación de Estook TPV** que se puede llamar desde Estook: o lleva la
  puerta, o está en la lista de lo que se queda. Una nueva sin decidir la pone en rojo. Y otra, contra
  la base, llama a pelo con un local en Esencial y lo ve cerrado; con Pro, abierto.
- **Las pantallas de Esencial**: en Ajustes › Facturación, sin Pro, el alta se ve como estaba y no
  se toca, con un aviso que lo dice; en Tickets y facturas, «Hacer una factura» y «Factura de una
  señal» no salen (lo decide el servidor), y la factura de un ticket y corregir, sí.
- **Si se da de baja**, ya está escrito en [la conservación de datos](../legal/conservacion-de-datos.md):
  sesenta días en solo lectura para mirar y descargar todo, y sus tickets y facturas guardados los
  seis años. La pantalla «Tus datos», solo con lo que se descarga, llega con M27, que es donde está
  la exportación completa del negocio.

## 3 · Lo que decidió la IA al construirlo

1. **Una puerta y no un plan por operación.** El Plan decía «cada operación dice de qué plan es».
   Hoy el único límite de plan que existe en el código es Estook TPV: poner un plan a las 504 era
   ruido. La puerta se llama por lo que cierra y la prueba obliga a decidir cada operación nueva de
   Estook TPV. El día que haya otro límite (M23, M24, M29), se hace igual.
2. **Leer no se cierra.** Las consultas de lo suyo siguen abiertas sin Pro: es su información y la
   ley le obliga a conservarla. Solo se cierra la pantalla de cocina, que es trabajo del servicio.
3. **Quitar la empresa** (0129) se queda abierto: es irse sin dejar el alta a medias.
4. **«Pide tu factura» no se puede apagar ni encender sin Pro**: el interruptor sale quieto. Los
   tickets que ya llevan el QR siguen pudiendo pedir su factura, que es lo que pide la ley.
