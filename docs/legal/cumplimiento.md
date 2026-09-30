# El mapa de lo legal

> **Documento vivo.** Cada obligación que toca a Estook, su norma, cómo está hoy y qué
> falta. Se revisa al cerrar cada módulo y cada vez que cambia una norma. **No es
> asesoramiento jurídico**: lo que dice una norma va con su referencia; lo que es criterio
> nuestro, marcado; y lo que tiene que decir un profesional está en
> [`preguntas-al-asesor.md`](preguntas-al-asesor.md) —con lo que ya se ha podido buscar en
> [`lo-investigado.md`](lo-investigado.md)— y no se da por bueno antes
> ([decisión 0062](../decisiones/0062-lo-legal.md)).

Las tres etiquetas de la auditoría:

- **CONFIRMADO** · lo dice la norma o una fuente oficial.
- **INTERPRETACIÓN** · criterio técnico nuestro sobre cómo cumplirla.
- **PENDIENTE** · lo tiene que validar el asesor.

## 1 · Quién es quién

| Papel                                        | Quién                                        | Qué significa                                                                  |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| **Responsable** de los datos de su negocio   | Cada cliente (el restaurante)                | Decide para qué se usan los datos de su equipo, sus proveedores y sus clientes |
| **Encargado** del tratamiento                | Estook                                       | Los trata por cuenta del restaurante, con un contrato (RGPD, art. 28)          |
| **Responsable** de los datos de sus clientes | Estook                                       | La cuenta, el cobro de la suscripción, la web y el soporte                     |
| **Obligado a facturar**                      | El titular de cada empresa fiscal            | Los tickets y facturas son suyos, no de Estook                                 |
| **Productor del sistema de facturación**     | Estook, con Verifacti como proveedor técnico | Firma la declaración responsable del programa (RD 1007/2023, art. 13)          |
| **Empleador**                                | El restaurante                               | El registro de jornada y la información a su equipo son obligaciones suyas     |

## 2 · Protección de datos

| Obligación                                                  | Norma                            | Cómo está Estook                                                                                 | Qué falta                                                                                       |
| ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Contrato de encargado con cada cliente                      | RGPD, art. 28.3 · CONFIRMADO     | No existía. Borrador en [`contrato-de-encargado.md`](contrato-de-encargado.md)                   | Revisión del asesor y aceptarlo al crear la cuenta. **Antes del primer cliente de pago**        |
| Registro de actividades de tratamiento                      | RGPD, art. 30 · CONFIRMADO       | Borrador en [`registro-de-actividades.md`](registro-de-actividades.md)                           | Datos del titular y revisión                                                                    |
| Seguridad adecuada, y poder restaurar tras un incidente     | RGPD, art. 32 · CONFIRMADO       | Aislamiento por fila en todas las tablas, auditoría, cifrado en tránsito, copia semanal cifrada  | Copia diaria (Supabase Pro), cabeceras de seguridad (Cloudflare) y simulacro anotado            |
| Avisar de una brecha                                        | RGPD, arts. 33 y 34 · CONFIRMADO | No hay procedimiento escrito                                                                     | El procedimiento, en el contrato de encargado (cláusula 8) y en M27                             |
| Información a quien da sus datos                            | RGPD, arts. 13 y 14 · CONFIRMADO | Política de privacidad en la web (borrador sin revisar)                                          | Revisión del asesor; igualarla con la tabla de conservación                                     |
| Derechos de acceso, rectificación, supresión y portabilidad | RGPD, arts. 15 a 20 · CONFIRMADO | Se atienden a mano                                                                               | La exportación completa del negocio (antes del primer cliente de pago) y la baja con su plazo   |
| Plazos de conservación                                      | RGPD, art. 5.1.e · CONFIRMADO    | [`conservacion-de-datos.md`](conservacion-de-datos.md). El borrado automático no está construido | El trabajo nocturno que lo aplica, en M27                                                       |
| Subencargados y transferencias fuera de la UE               | RGPD, arts. 28.2 y 44 a 49       | Lista en el contrato de encargado. La base está en la UE (Irlanda)                               | **PENDIENTE**: comprobar proveedor por proveedor dónde trata y con qué garantía                 |
| Evaluación de impacto                                       | RGPD, art. 35                    | No hecha                                                                                         | **PENDIENTE**: si la ubicación al fichar la exige, y quién la hace (el local es el responsable) |
| Delegado de protección de datos                             | RGPD, art. 37                    | No hay                                                                                           | **PENDIENTE**: si Estook tiene que nombrarlo                                                    |
| Cookies y avisos de la web                                  | LSSI, art. 22.2 · CONFIRMADO     | La web solo usa lo técnico imprescindible                                                        | Revisarlo si algún día entra analítica de terceros                                              |

## 3 · Lo laboral: fichajes y horarios

| Obligación                                                                                | Norma                                                | Cómo está Estook                                              | Qué falta                                                                                      |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Registro diario de jornada, con inicio y fin                                              | Estatuto de los Trabajadores, art. 34.9 · CONFIRMADO | Fichar con la hora del servidor, un turno abierto por persona | Pausas y horas extra separadas (M15)                                                           |
| Conservarlo cuatro años, a disposición del trabajador, sus representantes y la Inspección | ET, art. 34.9 · CONFIRMADO                           | Se guarda; cada uno ve lo suyo                                | La exportación del periodo para la Inspección (entrega H)                                      |
| Que el registro sea fiable y no se pueda manipular                                        | Criterio de la Inspección · INTERPRETACIÓN           | La corrección lleva nombre y motivo, y queda en la auditoría  | Que la corrección sea **un registro nuevo** que no toca el original, y aviso al trabajador (H) |
| Registro horario **digital**                                                              | Real Decreto en tramitación, **no publicado**        | Ya es digital, con credencial personal y sin biometría        | El formato para la Inspección, cuando se publique. **No se inventa**                           |
| Informar al equipo antes de usar la ubicación                                             | LOPDGDD, art. 90 · CONFIRMADO                        | La ubicación se pide solo al fichar y nunca bloquea           | Dar al local el texto hecho: [`informacion-para-el-equipo.md`](informacion-para-el-equipo.md)  |
| Sin huella ni reconocimiento facial                                                       | RGPD, art. 9 · criterio de la AEPD                   | Regla dura del módulo: no existe                              | Nada                                                                                           |
| Informar a los representantes de los algoritmos que afectan al trabajo                    | ET, art. 64.4.d · CONFIRMADO                         | Fogón todavía no propone horarios                             | El texto para el local, con M14 y M22                                                          |

## 4 · Lo fiscal: tickets, facturas y VeriFactu

El detalle entero está en el **Anexo TPV y facturación**, capítulos 1 y 4, y manda él.

| Obligación                                                         | Norma                                                                        | Cómo está Estook                                                                         | Qué falta                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Usar un sistema de facturación que cumpla                          | Ley General Tributaria, art. 29.2.j · RD 1007/2023 · CONFIRMADO              | Diseñado: Verifacti detrás de un adaptador, modalidad VERI\*FACTU                        | Construirlo (M20B)                                               |
| Fechas: 1 de enero de 2027 sociedades, 1 de julio de 2027 el resto | RD-ley 15/2025 · CONFIRMADO                                                  | El TPV va justo después de M10 para llegar                                               | —                                                                |
| Declaración responsable del programa                               | RD 1007/2023, art. 13 · Orden HAC/1177/2024 · CONFIRMADO                     | No existe                                                                                | La redacta el asesor. **Sin ella no se enciende la facturación** |
| Un corte no interrumpe la facturación                              | Preguntas frecuentes de la AEAT · CONFIRMADO                                 | Justificante provisional y emisión al volver: es límite de la arquitectura, no de la ley | **PENDIENTE**: que el asesor valide el texto y la forma          |
| Factura simplificada y sus límites                                 | RD 1619/2012, art. 4 · CONFIRMADO                                            | Escrito en el Anexo 4.6                                                                  | **PENDIENTE**: el reparto a domicilio                            |
| Conservar facturas y libros                                        | Código de Comercio, art. 30 (seis años) · LGT, art. 66 (cuatro) · CONFIRMADO | Se guarda seis años, aunque el cliente se dé de baja                                     | Decirlo igual en privacidad y condiciones                        |
| Las facturas de Estook a sus clientes                              | Las mismas                                                                   | Hoy las emite Stripe                                                                     | **PENDIENTE**: con qué sistema y desde qué fecha                 |
| Sanción por vender un programa que no cumple                       | LGT, art. 201 bis · CONFIRMADO                                               | Por eso nada de facturación va a producción sin el asesor                                | —                                                                |

## 5 · Los pagos

| Obligación                                    | Norma                                           | Cómo está Estook                                                            | Qué falta                                                    |
| --------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| No prestar servicios de pago sin autorización | RD-ley 19/2018 (servicios de pago) · CONFIRMADO | **Estook nunca tiene el dinero**: el datáfono y su cuenta son del local     | **PENDIENTE**: confirmarlo para el datáfono conectado (M20C) |
| No guardar datos de tarjeta                   | Norma PCI DSS (del sector, no ley)              | La tarjeta de la suscripción la guarda Stripe; la del comensal, el datáfono | Nada                                                         |

## 6 · Alimentos

| Obligación                        | Norma                                                | Cómo está Estook                                          | Qué falta                                                             |
| --------------------------------- | ---------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Informar de los catorce alérgenos | Reglamento (UE) 1169/2011 · RD 126/2015 · CONFIRMADO | Se calculan de las fichas. **La obligación es del local** | Origen y versión de cada alérgeno, y el aviso de las trazas (M9, M12) |
| Autocontrol basado en el APPCC    | Reglamento (CE) 852/2004, art. 5 · CONFIRMADO        | Diseñado (M16b)                                           | Construirlo. Estook da la herramienta; el plan es del local           |
| Trazabilidad                      | Reglamento (CE) 178/2002, art. 18 · CONFIRMADO       | Lotes y caducidades en el almacén                         | El informe de trazabilidad de un lote (M16b)                          |

## 7 · La inteligencia artificial

| Obligación                                                 | Norma                                                    | Cómo está Estook                                        | Qué falta                                 |
| ---------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| Decir que se habla con una IA                              | Reglamento (UE) 2024/1689, art. 50 · CONFIRMADO          | Fogón todavía no existe (M22)                           | Que lo diga siempre                       |
| Sistemas que reparten trabajo entre empleados: alto riesgo | Reglamento (UE) 2024/1689, anexo III · fechas según 0062 | Diseño: Fogón propone, decide una persona, nunca puntúa | **PENDIENTE**: revisarlo al construir M14 |

## 8 · Vender el servicio

| Obligación                                  | Norma                       | Cómo está Estook                                                   | Qué falta                                                                                                                 |
| ------------------------------------------- | --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Aviso legal con los datos del titular       | LSSI, art. 10 · CONFIRMADO  | Página en la web (borrador)                                        | Los datos definitivos del titular                                                                                         |
| Condiciones del servicio claras             | Código Civil y de Comercio  | Página en la web (borrador sin revisar)                            | **PENDIENTE**: revisión, límite de responsabilidad y disponibilidad prometida                                             |
| Alojamiento que permita un servicio de pago | Condiciones de GitHub Pages | Hoy la web y la app se publican en GitHub Pages, que no lo permite | Mudanza a Cloudflare Pages antes del primer cliente de pago ([0061](../decisiones/0061-el-orden-y-la-infraestructura.md)) |

## Lo que no puede pasar nunca

1. Encender la facturación sin la revisión escrita del asesor y la declaración responsable publicada.
2. Tocar un ticket o una factura emitidos: se corrige con otro documento.
3. Que Estook tenga en la mano el dinero de un restaurante.
4. Huella o reconocimiento facial para fichar.
5. Que Fogón puntúe, evalúe o decida sobre una persona.
6. Publicar un texto legal marcado como borrador como si estuviera revisado.
