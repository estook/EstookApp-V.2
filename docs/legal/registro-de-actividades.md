# Registro de actividades de tratamiento

> **BORRADOR para el asesor** ([decisión 0062](../decisiones/0062-lo-legal.md)). Es el
> registro que pide el artículo 30 del RGPD. Tiene dos partes porque Estook hace dos
> papeles: **responsable** de los datos de sus propios clientes y **encargado** de los
> datos que cada restaurante mete en la aplicación. Los plazos no se repiten aquí: están
> en [`conservacion-de-datos.md`](conservacion-de-datos.md).

**Titular:** [TITULAR DE ESTOOK, NIF, domicilio y correo de contacto para protección de datos]
**Delegado de protección de datos:** [si hace falta, lo dice el asesor: pregunta C4]

## Parte 1 · Estook como responsable (art. 30.1)

| Actividad                           | Para qué                                           | Base legal                                    | De quién                              | Qué datos                                                           | A quién llegan                                 |
| ----------------------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| **Cuentas de cliente**              | Dar de alta el negocio y darle el servicio         | El contrato                                   | Quien contrata y su equipo con acceso | Nombre, correo, teléfono, datos del negocio                         | Supabase, Resend, Google (si entra con Google) |
| **Cobro de la suscripción**         | Cobrar, facturar y gestionar el impago             | El contrato y la obligación legal de facturar | Quien contrata                        | Datos de facturación. **La tarjeta no: la guarda Stripe**           | Stripe                                         |
| **Soporte**                         | Atender dudas y fallos                             | El contrato                                   | Quien escribe                         | Nombre, correo, lo que cuenta, y los accesos de soporte a su cuenta | Resend                                         |
| **Web y contacto comercial**        | Contestar a quien pide información                 | Interés legítimo o consentimiento             | Quien escribe                         | Nombre, correo, teléfono y el local                                 | Resend                                         |
| **Seguridad y registro de errores** | Proteger el servicio e investigar fallos           | Interés legítimo                              | Cualquier usuario                     | Dirección IP, aparato y el error                                    | Supabase, Sentry                               |
| **Vendedores y comisiones** (A3)    | Llevar quién trajo a cada cliente y qué se le paga | El contrato con el vendedor                   | Los vendedores                        | Nombre, contacto y sus ventas                                       | —                                              |

## Parte 2 · Estook como encargado (art. 30.2)

Por cuenta de **cada cliente**, que es el responsable. Sus datos de contacto son los de su cuenta.

| Categoría de tratamiento        | Qué se hace                                                                                | De quién                           |
| ------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| **Equipo y permisos**           | Alta de cada persona, su rol y su acceso con contraseña o PIN                              | El equipo del local                |
| **Horarios y fichajes**         | El cuadrante, fichar con la hora del servidor y, si el local lo usa, la distancia al local | El equipo del local                |
| **Lo que cobra cada uno**       | Coste por hora o al mes, visible solo con su permiso                                       | El equipo del local                |
| **Compras y proveedores**       | Pedidos, albaranes y facturas, con sus personas de contacto                                | Los contactos de sus proveedores   |
| **Ventas y cobro** (Estook TPV) | Quién tomó nota y quién cobró; y el nombre, NIF y domicilio de quien pide factura          | El equipo y los clientes del local |
| **Reseñas**                     | Leer y analizar las reseñas públicas de la ficha de Google del local                       | Quien escribió la reseña           |
| **Registro de auditoría**       | Quién hizo qué y cuándo                                                                    | El equipo del local                |
| **Chat, notas e incidencias**   | Lo que el equipo se escribe                                                                | El equipo del local                |

**Transferencias fuera de la Unión Europea y subencargados:** los de la cláusula 4 del [contrato de encargado](contrato-de-encargado.md).

**Medidas de seguridad:** las de su cláusula 7.
