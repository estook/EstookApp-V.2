# Contrato de encargado del tratamiento

> **BORRADOR para el asesor. No está revisado, no se publica y no se acepta en la app
> hasta su revisión escrita** ([decisión 0062](../decisiones/0062-lo-legal.md), pregunta
> C1 de [`preguntas-al-asesor.md`](preguntas-al-asesor.md)). Sigue el contenido mínimo
> que pide el artículo 28.3 del Reglamento General de Protección de Datos (RGPD). Lo que
> va entre corchetes está por rellenar.

## Quién firma

- **El responsable:** el cliente —la persona o la empresa que contrata Estook para su negocio—, identificado con los datos de su cuenta.
- **El encargado:** [TITULAR DE ESTOOK, NIF y domicilio], en adelante «Estook».

Se acepta al crear la cuenta, junto con las condiciones del servicio, y forma parte de ellas.

## 1 · Qué se encarga

Estook trata datos personales **por cuenta del cliente y solo para darle el servicio**: la aplicación de gestión, Estook TPV, la carta digital y el soporte.

| Qué                        | Detalle                                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **De quién son los datos** | El equipo del cliente; las personas de contacto de sus proveedores; y sus clientes, cuando piden factura o dejan una reseña pública                                                                                                      |
| **Qué datos**              | Nombre, correo y teléfono; puesto, contrato, horario y lo que cobra; fichajes con su hora y, si el local lo usa, la distancia al local al fichar; lo que cada uno hace en la aplicación; y nombre, NIF y domicilio de quien pide factura |
| **Datos que no se tratan** | Ni huella ni reconocimiento facial. Ningún dato de salud: los alérgenos son de los platos, y el aviso de alergia de una mesa no se asocia a una persona                                                                                  |
| **Para qué**               | Llevar el negocio: almacén, compras, escandallos, carta, horarios, fichajes, ventas, cobro, facturación y los informes                                                                                                                   |
| **Cuánto dura**            | Lo que dure la cuenta, más los plazos de [`conservacion-de-datos.md`](conservacion-de-datos.md)                                                                                                                                          |

## 2 · Lo que se compromete a hacer Estook

1. **Tratar los datos solo siguiendo las instrucciones del cliente**, que son este contrato y lo que el cliente configura en la aplicación. Si una instrucción le parece contraria a la ley, se lo dice.
2. **No usarlos para nada propio.** Ni venderlos, ni cederlos, ni entrenar con ellos modelos de inteligencia artificial de terceros. Las cifras agregadas y anónimas sí se usan para mejorar el servicio.
3. **Confidencialidad:** quien accede en Estook está obligado a guardarla, y cada acceso a los datos de un cliente queda registrado.
4. **Seguridad** (RGPD, art. 32), descrita en la cláusula 7.
5. **Ayudar al cliente a atender los derechos** de las personas —acceso, rectificación, supresión, portabilidad, limitación y oposición—: si alguien se dirige a Estook, se lo pasa al cliente en [PLAZO] y no contesta por él.
6. **Ayudarle a cumplir** con la seguridad, los avisos de brecha y, si le hiciera falta, una evaluación de impacto, con la información que Estook tiene.
7. **Devolver o borrar los datos al acabar**, como dice la cláusula 9.
8. **Poner a su disposición lo necesario para demostrar que cumple**, y permitir las auditorías razonables que pida, con [PREAVISO] y sin exponer los datos de otros clientes.

## 3 · Lo que le toca al cliente

- Tener una base legal para los datos que mete, e **informar a su equipo** —para los fichajes y la ubicación Estook le da el texto hecho: [`informacion-para-el-equipo.md`](informacion-para-el-equipo.md)—.
- Decidir quién entra en su cuenta y con qué permisos, y retirar el acceso a quien se va.
- No meter datos que el servicio no necesita.

## 4 · Otros encargados (subencargados)

El cliente **autoriza de forma general** a Estook a apoyarse en estos proveedores, que quedan obligados a lo mismo que Estook. **Estook avisa de cualquier alta o cambio con [30] días**, y el cliente puede oponerse; si no hay acuerdo, puede darse de baja sin coste.

| Proveedor      | Para qué                                                                                                | Dónde trata los datos       |
| -------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Supabase**   | La base de datos, los ficheros y el servidor                                                            | Unión Europea (Irlanda)     |
| **Resend**     | Enviar los correos del servicio                                                                         | [COMPROBAR país y garantía] |
| **Stripe**     | El pago de la suscripción a Estook                                                                      | [COMPROBAR país y garantía] |
| **Sentry**     | El registro de errores de la aplicación                                                                 | [COMPROBAR país y garantía] |
| **Google**     | Entrar con Google, y la ficha y las reseñas del local                                                   | [COMPROBAR país y garantía] |
| **GitHub**     | Publicar la web y la aplicación, mientras no se mude                                                    | [COMPROBAR país y garantía] |
| **Verifacti**  | Registrar los tickets y facturas en la AEAT, si cobra con Estook TPV                                    | [COMPROBAR país y garantía] |
| **Cloudflare** | Convertir en PDF los documentos que se piden (informes, registro de jornada); **no guarda nada** (0068) | [COMPROBAR país y garantía] |

Cuando Fogón exista, el proveedor del modelo de inteligencia artificial se añadirá aquí antes de encenderlo.

## 5 · Fuera de la Unión Europea

La base de datos está en la Unión Europea. Si un subencargado trata datos fuera del Espacio Económico Europeo, solo con una de las garantías del RGPD (arts. 44 a 49): decisión de adecuación o cláusulas contractuales tipo. **[El asesor comprueba proveedor por proveedor cuál aplica.]**

## 6 · Los datos de facturación

Los tickets y facturas que el cliente emite con Estook TPV **son suyos**, y Estook los conserva el plazo legal aunque se dé de baja, para que pueda cumplir (cláusula 9).

## 7 · Las medidas de seguridad

- **Cada negocio, aislado de los demás en la propia base de datos**, tabla por tabla, y comprobado con pruebas automáticas.
- **Cifrado en tránsito** siempre, y en reposo en la base y en las copias.
- **Contraseñas** guardadas con un algoritmo de derivación moderno; **PIN** con su sal por local y bloqueo tras cinco intentos; **segundo factor** disponible y exigible.
- **Permisos por rol** decididos en el servidor y en la base, no en la pantalla.
- **Registro de auditoría** que solo admite añadir: quién hizo qué y cuándo.
- **El equipo de Estook** entra a los datos de un cliente solo para darle soporte, con su acceso registrado.
- **Copias de seguridad** cifradas y fuera del proveedor principal, con su restauración probada ([`copias-de-seguridad.md`](../copias-de-seguridad.md)).

## 8 · Si hay una brecha de seguridad

Estook **avisa al cliente sin dilación indebida, y como muy tarde en [48] horas** desde que la conoce, con lo que sabe: qué ha pasado, qué datos y cuántas personas, qué consecuencias puede tener y qué se ha hecho. Avisar a la Agencia Española de Protección de Datos en 72 horas, y a los afectados si toca, es obligación del cliente como responsable (RGPD, arts. 33 y 34); Estook le da lo que necesite para hacerlo.

## 9 · Al acabar

- El cliente puede **llevarse todo** con la exportación completa, en cualquier momento y durante [60] días después de la baja.
- Pasado ese plazo, Estook **borra o anonimiza** los datos, **salvo los que la ley obliga a conservar**, que se quedan bloqueados —sin usarse para nada más— hasta que acabe su plazo.
- De las copias de seguridad desaparecen al caducar cada copia.

## 10 · Responsabilidad

[A redactar por el asesor, en coherencia con las condiciones del servicio.]
