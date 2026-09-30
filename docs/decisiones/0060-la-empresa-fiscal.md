# 0060 · La empresa fiscal: organización → empresa → local

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)). Se
construye con la primera necesidad: los datos fiscales de quien paga la cuota o M20B,
lo que llegue antes.
**Resuelve:** la pregunta abierta del punto 5 de
[`lo-que-el-tpv-toca-de-lo-construido.md`](../lo-que-el-tpv-toca-de-lo-construido.md)
(«de qué cuelga el obligado tributario»).
**Cambia:** el Anexo (4.3 y 7), la [Arquitectura](../maestros/Estook-Arquitectura.md) y
Roles (1.12).

## Lo que pasó

Hoy el modelo es **organización → local**, y la organización ni siquiera tiene CIF. El
Anexo pensaba un `facturacion.obligados` por NIF, pero no decía de qué colgaba, y una
cadena puede tener **un NIF por local** o **varios locales bajo el mismo NIF**. Si se
improvisa, se improvisa mal: es el dato que sale impreso en cada ticket.

## Lo que se decide

```
ORGANIZACIÓN        el cliente de Estook: quien contrata y paga la cuota
├── EMPRESA FISCAL  el obligado tributario: NIF, razón social, domicilio fiscal
│   ├── LOCAL       el establecimiento: su dirección, su territorio, sus series
│   └── LOCAL
└── EMPRESA FISCAL
    └── LOCAL
```

| Pieza              | Lo suyo                                                                                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Organización**   | Nombre, plan, suscripción. **Quién paga la cuota** puede ser cualquiera de sus empresas (sus datos van a Stripe)                                                                                                                                                                        |
| **Empresa fiscal** | Razón social o nombre y apellidos, **NIF**, nombre comercial, **domicilio fiscal completo**, contacto, datos registrales si los hay, **si está en el SII**, **si su domicilio es foral**, la representación ante Hacienda (quién firmó y cuándo) y **su titular o representante legal** |
| **Local**          | Su nombre comercial, **la dirección del establecimiento**, zona horaria, **territorio** (ya existe), series, terminales, cajas e impresoras                                                                                                                                             |

- **Lo que hereda el local de su empresa**, sin volver a escribirlo: NIF, razón social,
  domicilio fiscal, SII y foral.
- **Lo que es solo del local**: dónde está y qué impuesto aplica. Un local en Tenerife de
  una empresa de Madrid factura con IGIC, porque el impuesto lo decide dónde se vende
  (`local.territorio`, desde la migración `0012`). En cambio el régimen foral y el SII
  van con la empresa, porque los decide su domicilio fiscal y su forma de llevar los
  libros (Anexo 1.4).
- **El titular es una persona marcada en la empresa**, no un rol: la autorización ante
  Hacienda solo la firma él o su representante legal, aunque otro sea gerente (Roles
  1.12).
- **Quién la ve y quién la cambia**: la ven quienes llevan la organización y los
  gerentes de sus locales; la cambian dirección y el administrador de cuenta. Cambiar el
  NIF de una empresa con documentos emitidos **no se puede**: es otra empresa.
- **Los documentos fiscales cuelgan de la empresa** (su serie es de un local de esa
  empresa) y guardan una copia de sus datos del momento: si mañana cambia el domicilio,
  el ticket de ayer sigue diciendo el de ayer.

## Lo que da hecho

- **Multiempresa y multilocal** sin trucos: Empresa A con Madrid y Barcelona, y Empresa
  B con Valencia, en la misma cuenta de Estook.
- **La cuota de Estook** se factura a la empresa que la paga, con su NIF (hoy la
  organización no tiene ninguno).
- **La exportación a la gestoría**, por empresa, que es como llevan los libros.
