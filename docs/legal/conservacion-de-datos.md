# Cuánto se guarda cada dato

> **BORRADOR para el asesor** (preguntas A16 y C3 de
> [`preguntas-al-asesor.md`](preguntas-al-asesor.md)). Es **la única tabla de plazos de
> Estook**: la política de privacidad, las condiciones, el Manifiesto y el Anexo enlazan
> aquí en vez de repetir cifras ([decisión 0062](../decisiones/0062-lo-legal.md)).
>
> **Hoy nada de esto se borra solo.** El trabajo nocturno que aplica estos plazos se
> construye en M27. Hasta entonces, lo de esta tabla es lo que se hará, no lo que ya pasa.

## El principio

**Nada se borra por error ni para esconder algo**: lo que se corrige deja rastro, lo emitido no se toca y lo que se desactiva sigue en la historia. **Y se borra cuando toca**: cada dato tiene su plazo, y al acabar se borra o se anonimiza.

**Anonimizar** es quitar lo que identifica a la persona y dejar la cifra: «un camarero cobró 1.240 €» sigue valiendo para comparar años; su nombre, no hace falta.

## Mientras la cuenta está viva

| Dato                                                      | Cuánto                                                                    | Por qué                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Tickets, facturas y sus registros ante Hacienda**       | **6 años** desde que se emiten                                            | Código de Comercio, art. 30. La prescripción fiscal son 4 (LGT, art. 66), y manda el mayor    |
| **Albaranes, facturas de proveedor y pedidos**            | **6 años**                                                                | Código de Comercio, art. 30                                                                   |
| **Cierres del día, turnos de caja y movimientos de caja** | **6 años**                                                                | Son la documentación del negocio                                                              |
| **Movimientos de almacén, mermas e inventarios**          | **6 años**                                                                | Justifican el coste de lo vendido                                                             |
| **Fichajes, con sus correcciones**                        | **4 años**                                                                | Estatuto de los Trabajadores, art. 34.9                                                       |
| **La ubicación de un fichaje** (los metros al local)      | **4 años**, con el fichaje                                                | Es parte del registro. **[El asesor dice si puede ser menos]**                                |
| **Horarios publicados**                                   | **4 años**                                                                | Se contrastan con los fichajes                                                                |
| **Contrato y lo que cobra cada persona**                  | Mientras trabaja en el local, y **4 años** después                        | Prescripción de las obligaciones laborales y de Seguridad Social. **[El asesor lo confirma]** |
| **Registros del APPCC y trazabilidad**                    | **[El asesor o la autoridad sanitaria dicen cuánto]**; de fábrica, 2 años | Depende del plan de autocontrol del local                                                     |
| **Registro de auditoría** (quién hizo qué)                | **6 años**                                                                | Es la prueba de todo lo anterior                                                              |
| **Avisos, notas, incidencias y chat**                     | Mientras dure la cuenta                                                   | Son del día a día del local                                                                   |
| **Sesiones y códigos de un solo uso**                     | Hasta que caducan, y **90 días** de historial                             | Seguridad                                                                                     |
| **Registros técnicos y de errores**                       | **90 días**                                                               | Para investigar un fallo                                                                      |
| **Copias de seguridad**                                   | **90 días** la semanal; 7 días la diaria                                  | Lo que tarda en desaparecer de las copias un dato borrado                                     |

## Cuando una persona deja el local

- **Se le retira el acceso** y su PIN deja de valer al instante.
- **Sigue en lo que hizo**: sus fichajes, sus ventas y sus movimientos no se tocan, porque son del negocio y tienen su plazo.
- Acabados los plazos de arriba, **su nombre se anonimiza** en lo que quede.

## Cuando el cliente se da de baja

```
dia 0       baja pedida. Se puede exportar todo
dias 1-60   la cuenta queda en solo lectura: mirar, exportar y sacar documentos
dia 60      se borra o se anonimiza todo lo que no tiene plazo legal
despues     lo que tiene plazo legal queda BLOQUEADO: guardado, sin usarse para
            nada mas, hasta que acabe su plazo. Entonces se borra
```

- **Sus tickets y facturas se conservan los seis años aunque se dé de baja**, y los puede pedir.
- **Una cuenta que deja de pagar** no se borra: pasa a solo lectura y, a los 60 días, se archiva. El plazo de borrado empieza con la baja, no con el impago. **[El asesor dice cuánto puede estar archivada una cuenta sin baja pedida; de fábrica, 12 meses y un aviso antes.]**

## Los datos de Estook como empresa

| Dato                                            | Cuánto                                   | Por qué                     |
| ----------------------------------------------- | ---------------------------------------- | --------------------------- |
| Las facturas de la suscripción                  | 6 años                                   | Código de Comercio, art. 30 |
| La cuenta del cliente y su historial de soporte | Mientras sea cliente, y [3] años después | Atender reclamaciones       |
| Quien pidió información y no contrató           | [12] meses                               | Interés comercial           |

## Cómo se aplicará

Un trabajo nocturno (M27) que recorre esta tabla, **escrita una sola vez en el código**, y que borra o anonimiza por tandas. Tres reglas: **nunca toca nada de facturación dentro de su plazo**; deja apuntado en la auditoría cuánto borró de cada cosa, sin decir de quién; y se prueba con la fecha movida, como las pruebas de la semana entera.
