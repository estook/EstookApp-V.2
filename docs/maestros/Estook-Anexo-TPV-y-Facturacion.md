---
titulo: Anexo · TPV y facturación
tipo: Documento maestro de especificación
fecha: Septiembre de 2026 · versión 1.2
nota: Cómo Estook toma nota, cobra y emite tickets y facturas cumpliendo VeriFactu, y cómo se ve y se usa Estook TPV en un día de servicio. Manda sobre los demás documentos en su tema. Se lee entero antes de tocar sala, cocina, cobro, caja o facturación.
---

# Qué es este documento

**Estook cobra.** El local elige entre cobrar con **Estook TPV**, conectar su TPV o apuntar las ventas a mano (Manifiesto, capítulo 1). Este anexo es la especificación completa de la primera forma, y **manda sobre cualquier otro documento donde se hable de lo mismo**: los demás dicen un párrafo y enlazan aquí.

Va dirigido a quien construya Estook, que será en su mayor parte una IA. Cubre los módulos **M16a (la jornada)**, **M19a (Estook Link)**, **M20A (sala y cocina)**, **M20B (facturación VeriFactu)** y **M20C (cobro y caja)**, que se construyen **justo después de M10** ([0061](../decisiones/0061-el-orden-y-la-infraestructura.md)).

Documentos hermanos: **Manifiesto** (qué es el producto), **Arquitectura** (cómo está hecho: las piezas, el modelo, los aparatos y qué funciona sin conexión), **Plan de desarrollo** (cómo se construye y en qué orden), **Roles y administración** (quién puede qué, apartado 1.12) y **Auditoría de flujos** (efectos en cadena 2.27 a 2.34, estados, fallos y las listas de comprobación de Facturación y Caja). Lo que cambió en cada versión, en el [registro de cambios](CAMBIOS.md).

**La versión 1.2** (30 de septiembre de 2026) recoge la auditoría profunda ([0055](../decisiones/0055-la-auditoria-profunda.md)): Estook TPV con su propia puerta y **Estook Link** como centro del local sin internet ([0056](../decisiones/0056-estook-tpv-su-puerta-y-estook-link.md)); el terminal, el operador y la aprobación con PIN ([0057](../decisiones/0057-quien-es-quien-en-el-tpv.md)); el cobro, sus pagos, la caja y la bolsa del camarero ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)); la emisión con estados y lo que dice de verdad la AEAT sin conexión ([0059](../decisiones/0059-emitir-un-documento-fiscal.md)); y la empresa fiscal ([0060](../decisiones/0060-la-empresa-fiscal.md)).

> **Lo marcado [VERIFICAR] no se programa hasta comprobarlo** contra la documentación oficial de la AEAT, la de Verifacti o el asesor, y lo comprobado se escribe con su fuente y su fecha. Las preguntas al asesor están todas en [`docs/legal/preguntas-al-asesor.md`](../legal/preguntas-al-asesor.md). Es la regla 13 del Plan aplicada al sitio donde equivocarse sale más caro.

## Lo que está decidido y no se reabre

|                                            | Decisión                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Web o nativo?                             | **Web, una sola base de código.** La cáscara nativa es opcional (iPad y food truck sin Link)                                                                |
| ¿Una aplicación aparte para el TPV?        | **Una puerta propia del mismo código**, `apps/tpv`: mismos datos, permisos, PIN y diseño ([0056](../decisiones/0056-estook-tpv-su-puerta-y-estook-link.md)) |
| ¿Estook toca el dinero?                    | **Nunca.** El efectivo va al cajón y la tarjeta al datáfono del local. Estook apunta ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md))           |
| ¿Quién hace la parte técnica de VeriFactu? | **Verifacti**, detrás de un adaptador. Estook responde de su parte (1.5)                                                                                    |
| ¿Qué impresoras?                           | **Cualquiera ESC/POS**, por Estook Link. Ninguna marca en el núcleo (capítulo 6)                                                                            |
| ¿Sin internet?                             | **Se sigue trabajando** con Estook Link en el local; el ticket, con justificante y al volver (3.6 y 4.11)                                                   |
| ¿Un «modo formación»?                      | **No existe en producción.** Se practica en el local de ejemplo (4.12)                                                                                      |

## Lo que sigue pendiente de Richi, y no frena nada hasta la Fase 4

1. **En qué planes entra Estook TPV.** Propuesta: en Pro y en Cadena; en Esencial no, porque Esencial es gestión a mano. Con el precio de Verifacti delante.
2. **El soporte en horario de servicio**: horario, canal y quién. Se decide antes de vender el primer TPV.
3. **Si el camarero cobra de fábrica.** Propuesta: sí, y el gerente lo apaga por local.
4. **Qué datáfono conectado va primero** (10.7), con sus precios y comisiones delante.

---

# 1 · El marco legal, en corto

## 1.1 Qué obliga a qué

| Pieza                                 | Qué es                                       | Régimen                                                                          |
| ------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Mesas, comandas, cocina, precuenta    | Operativa interna                            | Libre. **No son facturas**, así que el reglamento no las toca                    |
| Cobro con tarjeta                     | Lo hace el datáfono del banco del local      | Estook solo apunta el resultado. **No toca fondos**                              |
| Cobro en efectivo                     | Lo recoge el camarero                        | Estook apunta importe y cambio                                                   |
| **Ticket**                            | Es una **factura simplificada**              | **Sistema informático de facturación (SIF): RD 1007/2023 + Orden HAC/1177/2024** |
| **Factura completa**                  | Cuando el cliente la pide, o venta a empresa | Igual que el ticket                                                              |
| Stock, costes, escandallos, analítica | Consecuencia de la venta                     | Libre                                                                            |

**La consecuencia, dicha claro:** en cuanto Estook imprime el ticket, Estook es el sistema de facturación de ese restaurante **para todos sus tickets y facturas**. El datáfono no cambia nada: su recibo justifica el pago, no es el ticket.

**Lo que no es factura y por tanto no lleva QR ni numeración fiscal:** la comanda, la precuenta y cualquier albarán sin requisitos de factura.

## 1.2 Fechas

| Quién                                                      | Cuándo                              |
| ---------------------------------------------------------- | ----------------------------------- |
| Fabricantes y comercializadores de software                | **29 de julio de 2025**, ya vencida |
| Restaurantes que declaran por el Impuesto sobre Sociedades | 1 de enero de 2027                  |
| Autónomos y el resto                                       | 1 de julio de 2027                  |

Las dos últimas las fijó el Real Decreto-ley 15/2025, que retrasó un año las de 2026 ([nota de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html), comprobado el 29 de septiembre de 2026). **Y son la razón del orden**: en el primer semestre de 2027 mucha gente cambia de TPV, y por eso Estook TPV va justo después de M10 ([0061](../decisiones/0061-el-orden-y-la-infraestructura.md)).

**La primera fila es la nuestra y ya está vencida:** solo se puede comercializar software de facturación conforme. Vender uno que no lo sea expone a la infracción del artículo 201 bis de la Ley General Tributaria.

Y una que no se aplazó: **el software de doble uso** —el que permite borrar o alterar ventas— está prohibido desde la Ley Antifraude, con multas de hasta 50.000 € para quien lo use. Es la razón de fondo del principio 17 del Manifiesto.

## 1.3 Modalidad: solo VERI*FACTU

Estook opera **únicamente en modalidad VERI\*FACTU**: cada registro se envía a la AEAT al emitir.

La otra modalidad, «no verificable», obliga a firmar cada registro con certificado, **conservar los registros** todo el periodo de prescripción y mantener un registro de eventos. Además, la AEAT ha dicho que quien la elija tiene más probabilidad de inspección y que es una opción temporal. No se implementa.

## 1.4 Quién queda fuera, y por qué

_Comprobado el 20 de septiembre de 2026 contra la [FAQ de ámbitos de aplicación de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/cuestiones-generales-ambitos-aplicacion.html). Decidido en la [0043](../decisiones/0043-hasta-donde-llega-la-facturacion.md)._

**Hay dos cosas distintas y no se pueden mezclar en la misma frase:** a quién **la ley** deja fuera, y a quién **Estook** deja fuera de momento. Decirle a un canario que «la ley no se lo permite» sería mentirle.

| Caso                               | Qué dice la ley                                                                                                                                                             | Qué hace Estook                                                                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domicilio fiscal en **País Vasco** | **Fuera del reglamento**, por normativa foral en la imposición directa. Allí rige TicketBAI                                                                                 | **No se activa**, y la pantalla dice que es otro sistema, no un fallo. Verifacti hace TicketBAI: es una ampliación futura, no un parche                                                                                                                                   |
| Domicilio fiscal en **Navarra**    | **Fuera del reglamento**, régimen foral propio                                                                                                                              | Igual que el anterior                                                                                                                                                                                                                                                     |
| Acogido al **SII**                 | **Fuera del reglamento**: no se aplica a quien lleva los libros registro por el SII. Son ámbitos excluyentes                                                                | **No se activa.** Estook no hace SII                                                                                                                                                                                                                                      |
| **Canarias · IGIC**                | **Dentro.** La AEAT dice que los domiciliados en Canarias «se encuentran comprendidos dentro del ámbito subjetivo», y que las referencias al IVA valen también para el IGIC | **Se activa.** El esquema ya distingue IGIC desde la migración `0012` y el motor fiscal ya agrupa por régimen. Lo único que falta son sus reglas, y las confirma el asesor igual que las del IVA                                                                          |
| **Ceuta y Melilla · IPSI**         | **Dentro**, con el IPSI en lugar del IVA                                                                                                                                    | **Todavía no**, y la pantalla dice «todavía no», no «no se puede». El tipo del IPSI depende de la categoría del establecimiento y del epígrafe del IAE: es una dimensión más de reglas para dos ciudades de 85.000 habitantes. Se abre cuando haya un cliente que lo pida |

El alta de facturación pregunta NIF, domicilio fiscal y régimen. Cuando el módulo no se puede activar, **la pantalla explica por qué con la razón verdadera de la fila que toque**, sin errores rojos, y dice si es definitivo o si es un «todavía no».

> **Una advertencia que vale dinero.** `estook.local.territorio` ya existe desde M2 y **decide el régimen por `check`**: Canarias es IGIC, Ceuta y Melilla son IPSI, el resto IVA. El alta de facturación **lee ese campo, no lo vuelve a preguntar**. Preguntarlo dos veces es la forma segura de acabar con un local canario facturando con IVA.

## 1.5 La arquitectura mixta y quién responde de qué

Usar una API como Verifacti crea, a ojos de la AEAT, un sistema formado por dos componentes:

- **CPF · Componente principal de facturación:** Estook. Desde aquí se emiten las facturas.
- **CEF · Componente externo de facturación:** Verifacti.

**Cada uno publica su propia declaración responsable.** Verifacti tiene la suya publicada; **Estook tiene que redactar, firmar y publicar la suya dentro de la app.**

Lo que **no** delega Estook, aunque use Verifacti:

1. Llamar a tiempo y con los datos correctos cuando se emite una factura.
2. Poner el QR en el ticket o en la factura.
3. Publicar su declaración responsable de forma legible, individualizada y accesible dentro del propio software.
4. Numerar correlativamente dentro de cada serie.

Lo que **sí** hace Verifacti: generar el XML del registro, calcular la huella, encadenar los registros, firmar con su certificado, enviar a la AEAT y devolver el QR y la respuesta.

---

# 2 · Arquitectura

```
┌─────────── ZONA OPERATIVA · esquema estook ─────────────┐
│  Mesas → Cuentas → Cocina → Precuenta → Cobro → Pagos   │
│  Caja · Venta · Almacén · Negocio · Fogon               │
│  Se puede corregir, reprocesar y recalcular             │
└──────────────────────┬──────────────────────────────────┘
                       │ el cobro pide su documento
                       ▼
┌─────────── ZONA FISCAL · esquema facturacion ───────────┐
│  SOLO INSERCION · el flujo entero en 4.9                │
│   1. PREPARADO · numero de la serie y todo congelado    │
│      (transaccion corta, candado de la serie)           │
│   2. ENVIANDO  · Verifacti FUERA de la transaccion,     │
│      con la clave de idempotencia del documento         │
│   3. REGISTRADO · uuid + QR + huella + XML guardados    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼          Verifacti → XML + huella + cadena → AEAT
   la VENTA nace con el COBRO (M20): stock, costes y Negocio no esperan al documento
```

**Seis reglas de arquitectura, innegociables:**

1. **Esquema `facturacion` separado.** Ningún rol de la aplicación tiene permiso de escritura directa. Solo lo escribe una función `SECURITY DEFINER` propiedad del módulo.
2. **Las flechas van en un sentido.** La zona fiscal **lee** de la operativa y **nunca escribe** en ella. La operativa guarda la referencia al documento; el documento no depende de la operativa.
3. **Solo inserción.** Disparadores que rechazan `UPDATE`, `DELETE` **y `TRUNCATE`** sobre `documento`, `registro` y `envio`, para todos los roles incluido el de servicio. Se prueba rompiéndolo a propósito (E4 del Plan).
4. **Un solo sitio habla con Verifacti:** `servidor/facturacion/`. Ningún otro fichero importa su cliente ni conoce sus claves.
5. **Nunca se llama a Verifacti dentro de una transacción de la base** ([0059](../decisiones/0059-emitir-un-documento-fiscal.md)): una respuesta perdida no puede deshacer lo que Hacienda ya tiene.
6. **El TPV es una fuente de ventas más.** La venta que nace al cobrar entra en el mismo motor de M20 que el CSV o el conector. **Nadie escribe un segundo motor de consumo.**

---

# 3 · M20A · Sala y cocina

> **El listón de este capítulo.** Un TPV que solo manda platos a una pantalla lo tiene cualquiera. Lo que Estook puede hacer y ninguno de los demás es que **la cocina conozca el plato**: su ficha, sus fotos, sus pasos, sus alérgenos y su tiempo real, porque todo eso ya vive en M9. Un KDS normal enseña un texto; el de Estook enseña el plato. Esa es la diferencia y se construye aquí.

## 3.1 Sala

**Sala es una función de Estook TPV** (`apps/tpv`, [0056](../decisiones/0056-estook-tpv-su-puerta-y-estook-link.md)), no un destino de Servicio: una pantalla completa, sin barra de navegación, para un aparato que hace una sola cosa durante el servicio. Un terminal de sala arranca directamente en ella; desde un móvil personal se entra con un botón desde Estook.

### El plano

Mesas por zonas —salón, terraza, barra—, con el estado a color **y con icono**, nunca solo por color (B1): libre, ocupada, pidió la cuenta, cobrada. Cada mesa enseña de un vistazo **cuánto lleva abierta**, sus comensales y su total.

### Los tres caminos de venta, porque no todo es una mesa

Un bar de tapas no abre mesas, y un local con barra y comedor hace las dos cosas a la vez. **Si solo existe la mesa, la mitad del mercado no puede usar Estook.**

| Camino          | Cómo va                                                | Para                         |
| --------------- | ------------------------------------------------------ | ---------------------------- |
| **Mesa**        | Se abre, se pide en tandas, se cobra al final          | Restaurante de carta         |
| **Barra**       | Se pide y se cobra en el mismo gesto, sin abrir nada   | Bar de tapas, cafetería      |
| **Para llevar** | Como barra, con nombre o número de recogida y su canal | Take away, recogida en local |

Los tres acaban en una venta con su ticket. Lo que cambia es cuánto vive la cuenta abierta.

### Abrir mesa y tomar nota

**Abrir:** un toque en la mesa libre, con los comensales que se ajustan después. El camarero es **el operador** del terminal, que entró con su PIN (3.4).

**La carta que se ve es la del canal de esa mesa** (M10): la terraza puede tener otro precio que el salón, y el de reparto otro distinto. De ahí sale el precio, y de ahí sale el tipo de IVA de cada línea.

**Tomar nota:** buscador tolerante a erratas, los más vendidos primero, extras y modificadores del plato, y una nota libre por línea. Cantidades con el `+` y el `−`, nunca escribiendo.

**Cada línea se puede asignar a un comensal.** No es un lujo: **sin esto, «dividir por comensal» al cobrar es imposible**. Se hace con un toque —comensal 1, 2, 3— y **se puede dejar sin asignar**, que es lo normal en una mesa que comparte. Al cobrar, lo no asignado se reparte o se elige a mano.

**Aviso de alergia de la mesa.** Se marca al abrirla o después, eligiendo de los catorce alérgenos oficiales que Estook ya tiene (M9). A partir de ahí:

- Al pedir un plato que lo lleva, **la sala avisa antes de mandarlo**.
- La comanda **sale marcada en cocina**, en su color y con su icono, y no se puede marcar lista sin confirmarlo.

Esto Estook lo puede hacer sin pedir un dato más, porque los alérgenos ya están en la ficha. **Ningún TPV que no tenga escandallos puede hacerlo.**

### Mandar a cocina, y marchar

**Las tandas son del servicio, no del software:** entrantes, principales, postres, y las que el local quiera. Al mandar, cada línea va a su tanda.

**Marchar** es decirle a la cocina «empieza con la siguiente tanda». Tres formas, y el local elige:

1. **A mano desde sala**, que es lo normal: el camarero ve que la mesa va por la mitad y marcha los segundos.
2. **Al retirar la tanda anterior**, si la sala la marca como retirada.
3. **Por tiempo**, con un margen configurable desde que la anterior salió. Apagado por defecto.

Una tanda sin marchar **se ve en cocina en espera, no desaparece**: el cocinero sabe lo que viene.

### Corregir lo que ya se mandó

- **Antes de mandar**, libre.
- **Ya en cocina**, deja autor y motivo, y si quien lo quita no tiene el permiso de Roles 1.12, **lo aprueba un encargado con su PIN en la misma pantalla** ([0057](../decisiones/0057-quien-es-quien-en-el-tpv.md)). Y **cocina se entera**: la línea sale tachada en su pantalla, con aviso, porque puede estar ya en la plancha. Si ya se había hecho, es una merma con su motivo.

### Mover, juntar, dividir y traspasar

- **Mover** una mesa a otra, **juntar** dos y **pasar platos** de una a otra, todo con rastro.
- **Dividir** una mesa en dos cuentas antes de cobrar.
- **Traspasar la mesa a otro camarero.** Es el cambio de turno: a las 16:00 entra otro y las mesas abiertas tienen que cambiar de dueño. **Sin esto, o el que se va se queda hasta que cierre la mesa, o las ventas se le apuntan a quien no es.** Se traspasa una mesa o todas las de una persona, con su rastro.

### Agotado

Se marca desde la comanda y desaparece de la carta y de la carta digital (M10 y M12). **Y Estook avisa antes de que pase**: como conoce el escandallo y el stock, sabe cuántas raciones quedan de un plato y lo dice en sala cuando bajan de un mínimo. Un TPV sin inventario no puede.

**Cuántas quedan cuenta lo que ya está en cocina** ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)): quedan = lo que hay − lo comprometido, que es lo mandado a cocina y todavía sin cobrar. Se calcula al vuelo con el escandallo; **no se guarda un segundo número**. Sin eso, con veinte mesas abiertas, «Quedan 5» mentiría.

## 3.2 Cocina

**La función de cocina de Estook TPV**, para un aparato fijo en cocina, a pantalla completa. Letra grande, contraste alto, botones grandes: se usa de lejos y con las manos ocupadas. Admite **teclados de cocina** (los «bump bar»), que escriben como un teclado. No es el **modo cocina** de Estook, que sirve para leer fichas en la gestión: son dos cosas y se llaman distinto.

### Cada partida ve lo suyo

**Es la función más importante de una pantalla de cocina y la que más se nota.** Un cocinero de plancha que tiene que leer los postres de otras cuatro mesas para encontrar lo suyo trabaja peor y más lento.

- Cada plato lleva **su partida** —fría, caliente, plancha, postres, barra—, heredada de su sección de carta (M10) y ajustable plato a plato.
- **Cada pantalla se configura con las partidas que enseña.** Un local con una sola pantalla las ve todas; uno con tres, cada una la suya.
- Un plato sin partida sale en **todas**, y aparece en una lista de «platos sin partida» para arreglarlo. **Nunca se pierde un plato por un fallo de configuración.**

### El pase

Una pantalla más, con un trabajo distinto: **ve el pedido completo de la mesa** y cuánto lleva listo cada partida. Es lo que permite que todo salga a la vez y caliente, que es de lo que se queja un comedor.

Cuando todas las partidas han marcado lo suyo, el pase marca el pedido servido y **la sala recibe el aviso**.

En un local pequeño, la pantalla de cocina hace de pase. **Se configura, no se impone.**

### Los tiempos

- Temporizador por pedido y por plato, desde que se mandó o se marchó.
- **Tres tramos, con su color y su icono:** en hora, aviso, tarde. Los minutos de cada tramo **los pone el local** en Ajustes, con una propuesta por defecto; y se pueden afinar por plato, porque un solomillo no tarda lo que un gazpacho.
- Lo tarde **sube arriba**, con lo que lleva esperando.

### Trabajar

- **Marcar un plato listo**, o el pedido entero.
- **Deshacer, dentro de un margen corto.** Se marca sin querer y ahora mismo no hay vuelta atrás; en cocina eso es un plato que nadie hace. Se puede recuperar lo marcado durante unos minutos, queda con autor, y pasado ese margen lo desmarca un jefe.
- **Aviso sonoro** al entrar un pedido, y distinto cuando entra uno marcado por alergia o uno con prioridad.
- **Prioridad** que la sala puede pedir desde una mesa.
- **Lo que llevamos hoy**, por plato: «14 solomillos». Sirve para producción, para saber qué se está acabando y para cuadrar el pase.

### La ficha, que es lo que nadie más tiene

Desde cualquier plato de la pantalla se abre **su ficha técnica en modo cocina** (M9): foto, gramajes, pasos con sus fotos y el truco del jefe, en el idioma del cocinero y **sin un solo importe**.

Un cocinero nuevo deja de necesitar que alguien le explique cada plato en pleno servicio, que es el problema que originó Estook.

### Lo que la cocina nunca ve

**Ni un solo importe.** Ni precio, ni coste, ni margen. **Tampoco en la respuesta del servidor** (Roles 1.1).

### Sin IA

Las prioridades, los retrasos y los avisos son **reglas en código**, no llamadas al modelo, y no gastan un crédito. Preguntar a Fogón por voz llega en M22 y no es requisito de este módulo.

## 3.3 Lo que la cocina devuelve al resto de Estook

Aquí está la ventaja que un KDS suelto no puede tener, porque no está conectado a nada:

| Lo que se mide                                        | A dónde va                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| Tiempo real de cada plato, por partida y por franja   | La ficha de M9, junto a su tiempo estimado                     |
| Platos que van tarde siempre                          | Aviso de Fogón: el problema es la receta, la partida o la hora |
| Lo vendido por franja frente a quién había trabajando | El cuadrante de M14                                            |
| Agotados y su hora                                    | Previsión de compra de M7                                      |
| Devoluciones y platos tirados                         | Merma con su motivo (M8)                                       |

**Ningún dato se pide dos veces**, que es el principio 2 del Manifiesto: todo esto sale de trabajar, no de rellenar nada.

## 3.4 Los aparatos del local, y quién es quién

Una tablet de sala la usan cinco camareros, y la pantalla de cocina lleva encendida desde las ocho de la mañana. **Sin esto escrito, o cada uno tiene que entrar y salir cada vez —y no lo va a hacer—, o todo queda a nombre de quien abrió sesión por la mañana.**

El modelo entero —persona, terminal, operador, aprobación— está en la [Arquitectura](Estook-Arquitectura.md), capítulo 5, y su porqué en la [0057](../decisiones/0057-quien-es-quien-en-el-tpv.md). Aquí, cómo se usa.

**El terminal es del local, no de nadie.** Tiene su propia sesión, emparejada con el local y revocable si se pierde, y **una función**: sala, barra, cocina, pase o fichar. Sigue ahí cuando cambia la plantilla.

**El operador es quien lo usa ahora.** Entra tecleando **solo su PIN** —el terminal ya sabe de qué local es— y todo lo que hace queda **a su nombre, con la hora y el aparato**: abrir una mesa, mandar, cobrar, invitar, quitar un plato. No es una firma electrónica: es identificarse en un aparato del local. **Una persona sin correo** entra igual, con su PIN (0057).

**Se bloquea solo:** tras un minuto sin tocar —lo cambia el local— y, si el local lo quiere, **al mandar o al cobrar**. Bloqueado enseña el teclado del PIN, y el siguiente entra en un segundo. **Fichar y entrar son el mismo PIN**: a quien no ha fichado se le ofrece en un toque, y el local puede pedir que **solo quien está fichado use el TPV** (apagado de fábrica).

**Lo que pide un encargado se aprueba ahí mismo.** Quitar un plato ya en cocina, un descuento por encima del límite, abrir el cajón sin venta: sale «lo aprueba un encargado» y el encargado teclea su PIN en el mismo terminal. **Una aprobación sirve para una cosa, una vez**, y caduca en dos minutos; queda quién lo pidió, quién lo aprobó, qué y por qué.

**Quién se queda con la venta:** el camarero de la cuenta, que es el que la abrió o el que la recibió en un traspaso (3.1). No el aparato, y no quien pasaba por ahí.

**La pantalla de cocina no tiene operador.** Marcar un plato listo **no pide PIN** —en cocina eso no se puede hacer— y queda a nombre del terminal; lo que sí pide PIN es **salir de la función** y cualquier cosa de un jefe, como desmarcar pasado el margen.

**Un terminal no es una puerta a la gestión.** No se sale a Estook sin que alguien con permiso entre con su PIN. Una tablet de sala tirada en la barra no es una puerta al almacén ni a los sueldos.

**Al reiniciar o cerrarse**, vuelve a su función, bloqueado, con lo pendiente de subir intacto.

**Sin conexión, los PIN los comprueba Estook Link**, que guarda los del local cifrados y solo para el servicio. Sin nube y sin Link, solo siguen quienes ya entraron ese día en ese terminal: guardar las huellas de los PIN en una tablet no es seguro.

**Dar de alta un terminal** (Richi, 23-sep-2026):

1. Quien lleva el local entra en **Ajustes › Terminales › Añadir terminal** y le pone **un nombre** («Tablet terraza», «Pantalla pase») y **una función**. Sala y Barra son la misma función de Sala (3.1) con su forma de vender por defecto —mesa o barra—; Cocina y Pase son la pantalla de cocina (3.2); Fichar es el quiosco de fichajes (M15).
2. Estook enseña **un código corto y un QR**, de un solo uso y con caducidad de pocos minutos, como el emparejamiento de Link (M19a).
3. En el aparato se abre Estook TPV, se elige «Es un terminal del local» y se escribe el código o se lee el QR. **El terminal queda emparejado con el local, no con nadie**, y se revoca desde la misma pantalla si se pierde.
4. Al encenderse, **carga su función directamente**, a pantalla completa y sin la barra de navegación.
5. Los trabajadores **entran con su PIN**, y todo lo que hacen queda a su nombre.

El terminal es **una pieza aparte, del local**, con su propia sesión, y la sesión personal de M4 se queda como está (decidido el 23-sep, completado en la [0057](../decisiones/0057-quien-es-quien-en-el-tpv.md)).

## 3.5 Precuenta

Documento **no fiscal**:

- Encabezado `PRECUENTA` y pie `Documento no válido como factura`.
- **Sin número de serie, sin QR tributario y sin la leyenda VERI\*FACTU.**
- Se reimprime y se modifica libremente hasta el cobro.

## 3.6 Sin red

La versión 1.1 prometía que la cocina seguía imprimiendo sin internet con una cola que vivía en la nube, y eso no podía funcionar: sin internet, la tablet no llega a la cola. Queda así ([0056](../decisiones/0056-estook-tpv-su-puerta-y-estook-link.md), y el detalle en la [Arquitectura](Estook-Arquitectura.md), capítulo 7):

- **Con Estook Link en el local**, los terminales le mandan la comanda **por la red del local**, sin pasar por internet. Link la reparte a las pantallas de cocina, la imprime y la guarda para subirla al volver. **La sala y la cocina siguen hablándose** como si nada.
- **Sin Link**, la comanda **se guarda en el aparato y sube al recuperar la señal**, y la sala ve en grande que **la cocina no la está recibiendo**: si el camarero cree que la cocina lo tiene y no es así, el servicio se rompe.
- **Cada comanda nace con su identificador en el aparato**: subirla dos veces no crea dos, y a una cuenta se le **añaden** líneas, nunca se sobreescriben.
- Es la razón de fondo para recomendar Link en cualquier local con cocina.

## 3.7 Lo que hay que probar

- Un servicio de una mesa de seis con tres tandas, dos alergias y un plato quitado ya en cocina: **cuadra en sala, en cocina y en el pase**.
- Un local con tres pantallas: **cada partida ve solo lo suyo**, y un plato sin partida sale en todas y en la lista de fallos.
- Marchar desde sala llega a cocina **en menos de 2 segundos**.
- Un plato marcado por error se recupera dentro del margen, y fuera del margen lo desmarca un jefe.
- Se vende en barra sin abrir mesa, y se cobra en el mismo gesto.
- Se traspasa una mesa abierta a otro camarero y las ventas quedan a nombre del nuevo desde ese momento.
- Un plato con un alérgeno marcado en la mesa **avisa en sala antes de mandarlo** y sale marcado en cocina.
- Se corta internet **con Link**: se sigue tomando nota, **la pantalla de cocina recibe** y la comanda impresa sale; al volver, todo sube una vez y en orden.
- Se corta internet **sin Link**: se sigue tomando nota, la sala ve en grande que la cocina no recibe, y al volver sube todo sin duplicar.
- Un cocinero abre la ficha desde la comanda y **no recibe ni un importe**, comprobado llamando a la API a pelo.
- Dos camareros en la **misma tablet**: cada venta queda a nombre de quien la hizo, no del aparato ni del primero que entró.
- El terminal **se bloquea solo** al minuto sin tocar, y el siguiente entra con su PIN sin correo.
- **Una persona sin correo** entra en el terminal con su PIN, ficha y toma nota.
- Quitar un plato ya en cocina **pide la aprobación de un encargado**, y la aprobación no sirve dos veces ni pasados dos minutos.
- Desde un terminal **no se llega a la gestión** sin el PIN de alguien con permiso.
- Un terminal revocado deja de funcionar en la petición siguiente.
- «Quedan N» **cuenta lo que está en cocina sin cobrar**.

---

# 4 · M20B · Facturación VeriFactu

## 4.1 El proveedor: Verifacti

| Qué                  | Cómo                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formato              | API REST, JSON                                                                                                                                           |
| Autenticación        | `Authorization: Bearer <API Key>`, **una clave por NIF y por entorno**                                                                                   |
| Entornos             | La URL no cambia. **La clave decide**: `vf_test_…` es pruebas, `vf_prod_…` es producción                                                                 |
| QR                   | Llega en la respuesta inmediata, en imagen Base64                                                                                                        |
| Huella y cadena      | **Las hace el proveedor.** Estook no calcula ninguna cadena                                                                                              |
| Envío a la AEAT      | Lo hace el proveedor con su certificado, en el minuto siguiente                                                                                          |
| Respuesta de la AEAT | Por webhook (preferido) o consultando el estado del registro                                                                                             |
| Idempotencia         | **Cabecera `Idempotency-Key` en `/verifactu/create`**: 409 si ya se está procesando, 422 si el cuerpo no cuadra con la clave (comprobado el 29-sep-2026) |

> **[VERIFICAR en M20B]** los avisos por webhook: el 29-sep no aparecían en la documentación pública de Verifacti. Hasta confirmarlos con ellos, el estado se consulta (`/verifactu/status`) y el webhook es un añadido, nunca la única vía.

**Dos detalles que ahorran errores:**

- **No se manda el identificador del SIF en la llamada.** Lo pone el proveedor en el XML.
- **Todas las series de un mismo NIF forman una sola cadena**, así que a efectos de la AEAT hay un solo sistema de facturación aunque el local tenga cinco tablets y tres series.

## 4.2 El adaptador

```ts
interface ProveedorFacturacion {
  // `clave` es el identificador del documento: reintentar con ella nunca crea dos (4.9)
  emitir(nif: string, doc: DocumentoAEmitir, clave: string): Promise<RespuestaEmision>; // uuid, qr, huella
  anular(nif: string, ref: ReferenciaDocumento, motivo: string): Promise<RespuestaEmision>;
  estado(nif: string, uuid: string): Promise<EstadoRegistro>;
  descargarXml(nif: string, uuid: string): Promise<{ peticion: string; respuesta: string }>;
  altaNif(datos: DatosObligado): Promise<{ apiKeyRef: string }>;
  estadoRepresentacion(nif: string): Promise<EstadoRepresentacion>;
  declaracionResponsable(): Promise<string>; // la del proveedor, la nuestra es propia
}
```

`servidor/facturacion/` es el único sitio que importa el cliente de Verifacti. **Nunca se llama al endpoint de eliminación permanente de un NIF:** borra sus registros de forma irreversible y va justo contra lo que este módulo promete. Dar de baja a un cliente es **desactivar**, que es reversible.

**Las claves viven en el servidor**, en Supabase Vault, una por NIF y entorno. No aparecen en el cliente, ni en los registros de la aplicación, ni en un mensaje de error.

## 4.3 Alta de facturación de un local

Cinco pasos, uno por pantalla, y **hasta el último el botón de cobrar sale bloqueado diciendo qué falta**:

1. **La empresa fiscal** ([0060](../decisiones/0060-la-empresa-fiscal.md)): razón social o nombre y apellidos, NIF, domicilio fiscal completo y **quién es su titular o representante legal**. Es lo que sale impreso en cada ticket. **Si la empresa ya existe** —otro local suyo ya cobra con Estook—, se elige y no se vuelve a escribir nada.
2. **Régimen:** **no se pregunta el territorio**, que ya lo dijo el alta del local (M5) y vive en `local.territorio`; se enseña y se pide confirmarlo, porque el impuesto lo decide dónde se vende. Lo que sí se pregunta, **de la empresa**, es **si está acogida al SII** y **si su domicilio fiscal es foral**. Con eso, **IVA peninsular o balear e IGIC canario siguen adelante**; foral, SII, Ceuta y Melilla paran el módulo, cada uno con su explicación y diciendo si es definitivo o un «todavía no» (1.4 y [0043](../decisiones/0043-hasta-donde-llega-la-facturacion.md)).
3. **Series:** prefijo propio, comprobando que no choca con otro sistema que el local ya use. Propuesta: `T-{LOCAL}-{AÑO}-` para tickets, `F-{LOCAL}-{AÑO}-` para facturas y `R-{LOCAL}-{AÑO}-` para rectificativas. **Serie más número no pasan de 60 caracteres.**
4. **Alta del NIF en Verifacti**, por su API de gestión de NIF, y guardado de la clave en Vault.
5. **Autorización ante Hacienda:** se firma el modelo de representación que permite que los registros se envíen en nombre del negocio. Verifacti da el formulario relleno y el camino para firmarlo, por su web o por su API. **Solo lo firma el titular o su representante legal** (Roles 1.12), y Estook guarda quién firmó y cuándo.

**Pruebas y producción.** El entorno de pruebas de la AEAT **no admite NIF ficticios** y está limitado en volumen y en tiempo: se usa mientras se integra y se para cuando no se está integrando. La empresa de prueba gratuita de Verifacti es compartida y añade un prefijo al número de factura; **ese prefijo no existe con un NIF propio**, así que no se programa nada que dependa de él.

## 4.4 Series y numeración

- **Una serie por tipo de documento y por local.** Las rectificativas van **siempre** en serie propia; el abono en negativo puede ir en la serie original.
- **Numeración correlativa dentro de cada serie, sin huecos.** Es una obligación del reglamento de facturación que VeriFactu **no comprueba**: que la AEAT acepte un registro no significa que la numeración esté bien.
- **El número se asigna al preparar el documento**, en una transacción corta con el candado de **su serie** (`pg_advisory_xact_lock`), que dura milisegundos. Con varios aparatos cobrando a la vez, **ninguno espera a Verifacti para numerar**. Así lo corrigió la [0059](../decisiones/0059-emitir-un-documento-fiscal.md): la versión 1.1 numeraba al volver la respuesta, con la llamada dentro de la transacción, y una respuesta perdida dejaba el número libre para el siguiente cobro.
- **Un documento preparado nunca se pierde**: o se registra, o se queda a la vista con su error. **Si Verifacti lo rechaza por los datos antes de registrar nada**, se corrige y se vuelve a mandar **con el mismo número**, porque no se ha entregado. **[VERIFICAR con el asesor.]**
- Si la AEAT rechaza después un registro ya aceptado por Verifacti, **el número queda usado**: se corrige con otro documento, nunca reutilizándolo.
- La misma serie y número pueden repetirse en **ejercicios distintos**: la AEAT solo ve duplicado si coinciden serie, número y fecha de expedición.

## 4.5 Tipos de documento

_Los motivos de rectificativa se comprobaron el 20 de septiembre de 2026 contra la [FAQ de procedimientos de facturación de la AEAT](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/procedimientos-facturacion.html)._

| Clave          | Qué es                                                                          | Cuándo en Estook                                                                  |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| F2             | Factura simplificada                                                            | **El ticket de cada cobro.** El caso normal                                       |
| F1             | Factura completa, con destinatario identificado                                 | Evento, catering, venta a empresa                                                 |
| F3             | Factura que sustituye a simplificadas ya declaradas                             | **El canje:** el cliente pide factura de su ticket                                |
| R5             | Rectificativa de **factura simplificada**                                       | **Devolución o error sobre un ticket.** Es la de hostelería                       |
| R1             | Rectificativa por error fundado en derecho y art. 80.Uno, Dos y Seis de la LIVA | Error sobre una **factura completa**: importe, destinatario o descuento posterior |
| R2             | Rectificativa del art. 80.Tres de la LIVA                                       | Concurso de acreedores. **No se da en un restaurante**                            |
| R3             | Rectificativa del art. 80.Cuatro de la LIVA                                     | Créditos incobrables. **No se da en un restaurante**                              |
| R4             | Resto de causas del art. 80 de la LIVA                                          | Lo que no encaje en las anteriores **[VERIFICAR con el asesor cuándo]**           |
| F1 en negativo | Abono por devolución total                                                      | Puede ir en la serie original                                                     |
| Anulación      | Registro propio, no es una factura                                              | Solo si el documento **nunca debió existir**                                      |

**Y un segundo dato que va con toda rectificativa, y que se olvida:** además de la clave R, VeriFactu pide la **naturaleza de la rectificación**, que es `S` si **sustituye** al documento anterior o `I` si va **por diferencias**. Son dos formas distintas de contar lo mismo y la AEAT las trata distinto. **[VERIFICAR con el asesor cuál se usa en una devolución de hostelería]**, y **[VERIFICAR el nombre exacto del campo]** en la referencia de la API del proveedor antes de escribirlo: aquí no se inventa ningún nombre.

**Reglas de uso, que es donde se equivoca todo el mundo:**

- Sobre un ticket, la rectificativa es **R5**, no R1. Usar R1 es declarar mal el documento aunque las cifras cuadren.
- **R2 y R3 no se programan** en la v1. Son concurso e incobrables: un restaurante que cobra al contado no los usa, y ofrecerlos en un desplegable es invitar a elegir mal. Si un día hacen falta, se añaden.
- **El canje no es una rectificativa.** La factura F3 referencia al ticket sustituido; **el ticket no se anula ni se rectifica** y sigue en su cadena. Confundirlo anula un documento que debía quedarse.
- **Anular es excepcional**, solo para lo emitido por error y no entregado al cliente. Un número anulado **no se reutiliza**.
- **Subsanar** solo vale para un campo sin implicación fiscal, como la descripción.

## 4.6 Qué lleva cada documento

**Ticket (factura simplificada):** serie y número · fecha de expedición · NIF y nombre o razón social del local · descripción de lo vendido · tipo de IVA, con «IVA incluido» si se dice así · importe total · **QR tributario** · leyenda.

**Factura completa:** todo lo anterior más los datos del destinatario (nombre o razón social, NIF y domicilio) · base imponible, tipo, cuota y total · fecha de operación si es distinta de la de expedición.

**Límite de la factura simplificada: 3.000 €, IVA incluido.** Comprobado el 20 de septiembre de 2026 en el [artículo 4 del RD 1619/2012](https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696): el límite general es 400 € (art. 4.1), y el art. 4.2.e) lo sube a **3.000 €** para «servicios de hostelería y restauración prestados por restaurantes, bares, cafeterías… así como el suministro de bebidas o comidas **para consumir en el acto**». **Se programa el límite de 3.000 €**: por encima, el TPV obliga a factura completa antes de cobrar.

> **El matiz que hay que preguntar.** La ley dice «para consumir en el acto». El **reparto a domicilio** no es eso, y ahí podría volver a aplicar el límite de 400 €. **[VERIFICAR con el asesor]** antes de abrir el TPV a los canales de reparto; mientras tanto el límite se guarda **por canal**, no como una constante en el código.

**Los tipos de IVA no se programan fijos.** Cada plato lleva el suyo por canal, con su vigencia (capítulo 9 del Manifiesto), y el aviso de ese capítulo aplica aquí: el tipo de un servicio de restauración **lo confirma el asesor**.

## 4.7 El QR

_Todo lo de este apartado se comprobó el 20 de septiembre de 2026 contra el [artículo 21 de la Orden HAC/1177/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138), y coincide._

- **Contenido:** una URL del servicio de cotejo de la AEAT con cinco datos: NIF del emisor, serie, número, fecha e importe. La devuelve Verifacti en Base64 y **se pega tal cual**.
- **Formato:** ISO/IEC 18004, corrección de errores nivel M, **entre 30 × 30 y 40 × 40 mm** impreso, con margen blanco de al menos 2 mm (recomendado 6). Los que genera Verifacti traen 6 módulos de margen.
- **Posición:** al principio del documento. Si hubiera más de un QR, este va primero.
- **Encima:** `QR tributario:`. **Debajo:** `Factura verificable en la sede electrónica de la AEAT` o `VERI*FACTU`.
- **Se guarda** el QR en la base de datos con el documento, para poder reimprimir sin volver a llamar a nadie.
- Con VeriFactu **no hace falta imprimir la huella**: basta el QR.
- Contraste negro sobre blanco. Se prueba en papel térmico de 58 y de 80 mm con la aplicación de la AEAT.

## 4.8 Fechas y hora

| Campo              | Quién lo pone         | Qué es                                                                       |
| ------------------ | --------------------- | ---------------------------------------------------------------------------- |
| `fecha_expedicion` | El servidor de Estook | Obligatorio. **Tiene que ser la fecha de hoy**                               |
| `fecha_operacion`  | El servidor de Estook | Opcional. Solo si la operación fue antes: es la que decide el periodo de IVA |
| Hora del registro  | **Verifacti**         | No se manda. El control de tiempo de la AEAT va sobre ella                   |

**Nunca se usa el reloj del aparato.** Y ojo con la jornada operativa: un cobro a las 02:30 pertenece a la **jornada** del día anterior a efectos de gestión, pero su **fecha de expedición es la del día real**. Son dos cosas distintas y no se mezclan.

Prueba obligatoria en los dos cambios de hora del año.

## 4.9 El flujo de emisión, paso a paso

Corregido en la versión 1.2 ([0059](../decisiones/0059-emitir-un-documento-fiscal.md)): **la llamada a Verifacti va fuera de la transacción**, con una clave que hace imposible registrar dos veces lo mismo.

```
TRANSACCION CORTA (el cobro)
1. El cobro pide su documento: facturacion.preparar_documento(cobro, tipo)
2. Se comprueba que el alta de facturacion esta activa y que los datos valen:
   NIF, importes, desglose (doce lineas como mucho) y el limite de la simplificada
3. Candado de LA SERIE (pg_advisory_xact_lock) y su siguiente numero
4. Se guarda el documento PREPARADO: todo congelado, lineas agrupadas
   POR TIPO DE IVA Y CLAVE DE REGIMEN, y la copia de los datos de la empresa
5. Se guardan el cobro, sus pagos y la VENTA (M20). Fin de la transaccion

FUERA DE LA TRANSACCION
6. ENVIANDO: POST a Verifacti con Idempotency-Key = el id del documento
   ├─ 200 → REGISTRADO: uuid, QR y huella; se imprime el ticket
   ├─ 400 → RECHAZADO POR DATOS: se enseña que falla, en cristiano; se
   │        corrige y se manda con el MISMO numero [VERIFICAR]
   ├─ 409 → ya se esta procesando: se espera y se pregunta el estado
   ├─ 429 → se reintenta con espera creciente y la MISMA clave
   └─ sin respuesta (timeout, 5xx, sin red) → se pregunta el estado
            (/verifactu/status); si Verifacti no contesta, justificante (4.11)
7. Un trabajo repasa cada pocos minutos los documentos ENVIANDO o
   pendientes, y los termina con la misma clave
8. La respuesta de la AEAT llega despues (4.10)
```

**Lo que ya no pasa:** que una respuesta perdida deje un registro en Hacienda que Estook no conoce, que un número se use dos veces, o que un terminal espere a Verifacti porque otro está cobrando.

**Cuatro cosas de la llamada que suelen salir mal:**

- Las **líneas** de VeriFactu no son los platos: son el **desglose por tipo de IVA**, agrupado por tipo impositivo **y** clave de régimen. Un ticket con comida al 10 % y alcohol al 21 % son dos líneas, no doce platos. Máximo doce.
- Los importes van con **punto decimal y dos decimales**, y en **euros**, siempre.
- **No hay campo de descuento:** se refleja ajustando los importes, o con una línea negativa del mismo tipo de IVA.
- Si el ticket lleva **retención de IRPF**, la retención **no se comunica**: el total en VeriFactu no coincide con el que paga el cliente. Raro en hostelería, pero está previsto.

## 4.10 Respuestas de la AEAT

| Estado               | Qué significa                        | Qué hace Estook                                                 |
| -------------------- | ------------------------------------ | --------------------------------------------------------------- |
| Pendiente            | Enviado, sin respuesta todavía       | Nada. Es lo normal durante uno o dos minutos                    |
| Correcto             | Aceptado                             | Nada                                                            |
| Aceptado con errores | Aceptado, pero con un fallo señalado | A la pantalla de registros con error, con su corrección         |
| Rechazado            | No aceptado                          | Igual. **El número sigue usado**: se corrige con otro documento |
| Duplicado            | La AEAT ya tenía ese registro        | Se ignora. **No se emite ninguna rectificativa por esto**       |

**Webhooks del proveedor:** se registra un endpoint por entorno. Cada notificación trae `X-Webhook-Id`, **que es la clave de idempotencia**: la misma notificación dos veces no cambia nada. El proveedor reintenta hasta tres veces, con esperas de 1, 6 y 30 minutos, no reintenta los 4xx y **desactiva el webhook si falla mucho**, avisando por correo, sin reactivarlo solo.

Por eso, además del webhook, un trabajo repasa a diario los registros que lleven más de una hora en «pendiente» y consulta su estado. **Un webhook no es una garantía de entrega.**

**Pantalla de registros con error** (gerente y dirección): qué documento, qué dijo la AEAT traducido a lenguaje normal, y el botón de la corrección que toca. **Nunca se corrige tocando el original.**

## 4.11 Sin conexión

**Lo que dice la AEAT**, en sus [preguntas frecuentes sobre VERI\*FACTU](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/sistemas-verifactu.html) (comprobado el 29 de septiembre de 2026): un corte de luz, de internet o de su sede **«no suponen en ningún caso que deba interrumpirse la facturación de la empresa»**; se sigue facturando con normalidad y los registros se mandan después, marcando la incidencia, sin un plazo máximo fijo.

**Lo que hace Estook en la primera versión, y por qué.** El registro —la huella y el encadenamiento— lo genera Verifacti en su servidor, así que sin llegar a Verifacti Estook no puede generarlo. **Es una limitación de la arquitectura elegida, no de la ley** (la versión 1.1 decía lo contrario, y se corrigió en la [0059](../decisiones/0059-emitir-un-documento-fiscal.md)). Se hace lo que recomienda el propio Verifacti cuando su servicio no responde:

```
Se cobra igual (efectivo o datafono)
        ↓
Se entrega un JUSTIFICANTE PROVISIONAL DE VENTA
  · lleva lo mismo que llevaria el ticket
  · dice claramente que NO es una factura
  · lleva un codigo para descargar el ticket desde el movil en cuanto se emita
  · sin numero de serie fiscal, sin QR tributario, sin leyenda
        ↓
El cobro y la VENTA ya existen (el almacen se mueve); el documento queda
«pendiente», en el orden del cobro
        ↓
Al volver la conexion: se emiten en ese orden
  · Incidencia = S
  · fecha_operacion con la fecha real si ha pasado mas de un dia
```

**Reglas:** el orden es el de los cobros; nada se emite dos veces (4.9); y la sala distingue en pantalla «sin conexión con Estook» (justificante) de «Hacienda no responde» (se emite normal y el envío espera).

**[VERIFICAR con el asesor el texto del justificante y que esta forma de trabajar cumple.]** En el alta se recomienda un router con 4G de respaldo.

> **El futuro, y la ventaja:** que **Estook Link** genere el registro en el local cuando no hay internet y lo mande después con la incidencia, como permite la AEAT. Sería facturar de verdad sin conexión, que pocos TPV en la nube pueden. Exige saber **cómo se encadenan los registros de varios locales del mismo NIF**, si Verifacti admite registros generados fuera, y el visto bueno del asesor. Se estudia después de M20B.

## 4.12 Lo que el software no puede tener nunca

- Editar o borrar un ticket o una factura emitidos, desde cualquier sitio.
- Emitir un documento sin su registro.
- Un «modo formación» que imprima documentos con apariencia real en producción. Las pruebas van en el entorno de pruebas, y sus documentos llevan `PRUEBA · SIN VALIDEZ` visible.
- Informes que excluyan ventas, o cualquier forma de llevar una facturación paralela. Eso es software de doble uso.
- Reabrir una mesa cobrada para cambiar lo cobrado.
- Que Fogón emita, anule o corrija un documento, ni que lo ofrezca como acción de un toque.

## 4.13 Conservación y baja

- En modalidad VERI*FACTU **no hay obligación de conservar los registros**, porque ya están en la AEAT. Aun así, **Estook conserva sus documentos seis años**, porque son del restaurante y los necesita: la prescripción fiscal son cuatro, pero el Código de Comercio ([art. 30](https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627)) obliga al empresario a guardar la documentación de su negocio seis, y el más largo manda **[VERIFICAR con el asesor]**. Con ellos, **los XML de petición y respuesta** de cada registro (`/verifactu/downloadXML`), para poder demostrar lo emitido aunque el proveedor desaparezca. Todos los plazos, en [`docs/legal/conservacion-de-datos.md`](../legal/conservacion-de-datos.md).
- Si un cliente deja Estook: acceso de solo lectura y **exportación completa** (PDF de los documentos y fichero de registros).
- **Antes de cancelar la suscripción con el proveedor** hay que exportar sus XML: al cancelar, los elimina a los 30 días salvo el último. Es un paso obligatorio del procedimiento de baja, escrito en el manual de operaciones.
- El contrato de encargado de tratamiento del RGPD recoge que **Verifacti es subencargado**. Los datos de un cliente final en una factura son solo los que la factura exige.

## 4.14 La declaración responsable

Una sección fija en **Ajustes › Legal › Declaración responsable del sistema de facturación**. La Orden exige que esté **dentro del propio sistema informático, de forma legible e individualizada, y accesible por el usuario de forma rápida, fácil e intuitiva**; y además que se pueda **entregar en papel o en un formato electrónico gratuito y de uso extendido** (un PDF del servidor, regla 7).

**Qué lleva, comprobado el 20 de septiembre de 2026 en el [artículo 15 de la Orden HAC/1177/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138)** —capítulo IV, que tiene ese único artículo—:

| Dato                                                           | De dónde sale en Estook                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Nombre del sistema informático                                 | Constante del código                                               |
| **Código identificador único** del sistema                     | Constante del código                                               |
| **Identificador completo de la versión**                       | La versión desplegada, **la misma que viaja en cada registro**     |
| Componentes de hardware y software, con sus funcionalidades    | Redactado, e incluye a **Verifacti como componente externo** (1.5) |
| Si funciona **exclusivamente** como VERI\*FACTU                | **Sí**, y así se declara (1.3)                                     |
| Si permite **varios obligados tributarios**                    | **Sí**: un mismo despliegue sirve a muchos restaurantes            |
| Tipos de firma utilizados                                      | Los del proveedor, que es quien firma                              |
| Nombre o razón social del productor                            | **Los datos del titular de Estook**                                |
| NIF del productor                                              | Ídem                                                               |
| Dirección postal completa de contacto                          | Ídem                                                               |
| Declaración de cumplimiento de la normativa                    | La redacta el asesor                                               |
| **Fecha y lugar** de suscripción, con día, mes y año completos | Se fija al firmarla                                                |

**Y tres reglas que van con esto:**

- El texto lo redacta el asesor sobre la plantilla del proveedor; **la app solo lo muestra**, no lo compone.
- El **identificador y la versión del sistema** que viajan en cada registro tienen que coincidir **exactamente** con lo declarado. Si no coinciden, la declaración no vale. Por eso la versión sale de un solo sitio y hay una prueba que lo comprueba.
- Si cambia la parte fiscal del software, se revisa con el asesor si hay que volver a firmarla.

---

# 5 · M20C · Cobro y caja

## 5.1 Cobrar

**Cuatro piezas que no se mezclan** ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)):

```
CUENTA   lo que pide la mesa (o la barra, o el para llevar, o el reparto)
  └─ COBRO    lo que se cobra de una vez: unas lineas, unos comensales o una parte
       ├─ DOCUMENTO FISCAL   su ticket o su factura (o su justificante, 4.11)
       ├─ PAGOS              uno o varios: efectivo, tarjeta, Bizum del banco...
       │    └─ MOVIMIENTO DE CAJA   solo el efectivo, en su turno de caja o en su bolsa
       └─ VENTA              lo que mueve el almacen y cuenta en Negocio (M20)
```

- **Un cobro, un documento; uno o varios pagos.** El pago mixto son dos pagos del mismo cobro.
- **Formas de pago:** efectivo (con entregado y cambio), tarjeta en el datáfono del local —el camarero confirma que se cobró—, y lo que cobre el banco del local (Bizum de empresa, por ejemplo), que Estook solo apunta. **Con efectivo se abre el cajón solo**, y el datáfono puede estar conectado para no teclear el importe: cómo se ve y cómo funciona, en el capítulo 10.
- **La venta nace con el cobro**, haya ticket o justificante: el almacén no espera al documento.
- **Estook nunca guarda dinero ni cobra comisión por los pagos del local**, y no pasa a ser entidad de pago (Real Decreto-ley 19/2018). Richi: «sin meternos en cosas que no podemos».
- **Propinas.** La de tarjeta la gestiona el datáfono y **Estook no la toca**. La de efectivo se puede apuntar como **entrada de caja con motivo «propina»**, que es lo que hace falta para que el arqueo cuadre y para repartirla al cierre. **La propina no va en el ticket ni se manda a Hacienda como parte de la venta** [VERIFICAR con el asesor].
- **Dividir la cuenta:** por comensal, por platos o a partes iguales. **Cada cobro genera su propio ticket** con lo que paga esa persona.
- **Invitaciones y descuentos:** con permiso y motivo (Roles 1.12), y por encima del límite, con la aprobación de un encargado (3.4). **La invitación no es un pago**: es un descuento del 100 % en esas líneas, que descuenta género y cuenta como consumo interno, no como merma (Manifiesto, capítulo 28). **[VERIFICAR con el asesor si es autoconsumo a efectos del IVA.]**
- **Si Verifacti rechaza los datos, la mesa no se cierra** y se dice qué falla. **Si no responde**, se entrega el justificante (4.11). Nunca hay una mesa cobrada sin ticket ni justificante.
- **Al registrarse:** se imprime el ticket y la mesa queda libre. La venta ya existía desde el cobro.

## 5.2 Imprimir

Todo lo de impresión —el ticket de caja y la comanda de cocina— está en el **capítulo 6**, que es donde se decide.

Lo que importa aquí: **el ticket se emite antes de imprimirse.** Si la impresora falla, el documento ya existe y tiene su número; se ofrece reimprimir o mandarlo por correo, y **nunca se vuelve a emitir**.

## 5.3 Factura a petición del cliente

Desde el ticket, en un toque: nombre o razón social, NIF y domicilio. Se emite la F3 referenciando al ticket.

- El importe **tiene que coincidir** con el del ticket.
- El ticket queda **canjeado** y no se puede canjear dos veces.
- **No toca el stock ni la caja:** la venta ya se registró.
- Verifacti valida por defecto que el NIF del destinatario está censado en la AEAT; si no lo está, la AEAT rechazaría. Ese aviso se enseña **antes** de emitir.

## 5.4 Devoluciones

Rectificativa R5 sobre el ticket, en la serie de rectificativas, con su registro. Salida de caja con motivo. **El género vuelve al libro de movimientos solo si vuelve de verdad**, y lo dice quien hace la devolución: un plato ya servido no vuelve a la cámara.

## 5.5 Caja

| Pieza                  | Qué es                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cajón**              | El cajón físico, enchufado a una impresora. Varios terminales pueden usar el mismo                                                                           |
| **Turno de caja**      | Apertura con su fondo contado → entradas y salidas con motivo → arqueo ciego → cierre, que es **su Z**. Uno abierto por cajón                                |
| **Bolsa del camarero** | Un turno de caja de una persona, sin cajón: lo que cobra en la mesa y lleva encima. **Se liquida en un cajón** al acabar, con arqueo ciego de lo que entrega |
| **Cierre del día**     | **La suma de los Z del día.** Es lo que rellena el cierre de caja de Servicio (M6½), con origen «Estook TPV» y su fiabilidad máxima                          |

- **El local elige cómo se cobra**: caja central (de fábrica), bolsa del camarero, o las dos según la persona (Richi, 29-sep).
- **El cierre de caja de Servicio sigue siendo uno por día** (`cierre_uno_por_jornada`, migración `0029`), y ahora eso es lo correcto: es el cierre del día, no el de un cajón. No cambia ni una tabla de lo construido.
- **El descuadre se guarda y no bloquea**, a nombre de quien cerró el turno o entregó la bolsa.
- Se hace en Estook TPV; **se consulta** en Estook, en **Servicio · Jornada · Caja**. El cajón, los informes X y Z, el arqueo ciego y el cuadre del datáfono, en 10.6.

---

# 6 · Impresión

_Investigado en septiembre de 2026. Cubre las dos impresiones del local: la **comanda de cocina** (M20A) y el **ticket de caja** (M20C)._

> **La regla que ordena todo este capítulo: Estook imprime en cualquier impresora ESC/POS, que es el 95 % de lo que hay en hostelería.** No se ata el producto a una marca. Lo que cambia según el local es **quién** habla con la impresora, no si funciona.

## 6.1 Por qué esto no es trivial

Estook es una aplicación web servida por HTTPS, y eso choca con cómo se imprime en hostelería:

1. **Un navegador no abre sockets TCP.** La impresión de tickets es ESC/POS al puerto 9100, y eso un navegador no lo puede hacer. No es un problema de permisos: no existe la capacidad.
2. **El navegador bloquea la red local.** Una página HTTPS no puede llamar a `http://192.168.1.50` sin más: es contenido mixto, y Chrome ha añadido además un permiso de acceso a la red local con su propio aviso. Es terreno que se endurece cada año.
3. **La cocina no puede depender de una tablet.** Si la comanda sale desde el aparato del camarero, basta con que se bloquee la pantalla o se salga de la app para que la cocina se quede a ciegas en pleno servicio.

## 6.2 Las cuatro formas que existen, y las dos que valen

|                                      | Cómo va                                              | Qué impresoras        | Por qué sí o por qué no                                                                  |
| ------------------------------------ | ---------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| **A · Diálogo del navegador**        | Web → «Imprimir» → driver del sistema                | Todas                 | **No.** Un cuadro de diálogo por cada comanda. Sin control del corte, sin saber si salió |
| **B · Del navegador a la impresora** | Web → API del navegador o SDK del fabricante         | Muy pocas             | **No.** Depende del navegador, del sistema y del modelo. Frágil por definición           |
| **C · Agente local**                 | Web → cola → **un programa en el local** → impresora | **Todas las ESC/POS** | **Sí.** Imprime en silencio, gestiona su propia cola y reconecta solo                    |
| **D · Impresora que pregunta sola**  | Web → cola → **la impresora pregunta**               | Solo las que lo traen | **Sí, como opción.** Cero instalación, pero obliga a un modelo concreto                  |

La forma profesional de montar esto en un SaaS es **C y D a la vez, sobre una misma cola en el servidor**: la nube decide qué hay que imprimir y algo dentro del local lo ejecuta y aguanta los cortes de red. Es la recomendación del sector y es lo que hace Estook.

## 6.3 La arquitectura: una cola, varios agentes

**Lo único que hace el núcleo de Estook es dejar un trabajo en una cola.** Nunca habla con una impresora. Quién recoge ese trabajo depende de lo que tenga el local, y **el núcleo no se entera de cuál es**.

```
Camarero manda a cocina  /  Se cobra una mesa
                 ↓
   CON INTERNET: COLA DE IMPRESION (Supabase)          SIN INTERNET: el terminal
   trabajo: local, impresora, contenido, estado        se lo da a Link por la red
                 ↓                                     del local, y Link lo apunta
   ┌─────────────┼─────────────┬──────────────┐        en su cola para subirlo
   ▼             ▼             ▼              ▼
ESTOOK        LA CASCARA    IMPRESORA      CORREO
LINK          (Capacitor)   QUE PREGUNTA   (PDF)
   │             │             │
ESC/POS       ESC/POS       ella sola
TCP · USB     TCP · BT      por HTTPS
   │             │             │
   ▼             ▼             ▼
CUALQUIER     CUALQUIER      Star / Epson
IMPRESORA     IMPRESORA      compatibles
```

### Vía 1 · Estook Link · **la principal**

El programa del local, **y su centro** ([0056](../decisiones/0056-estook-tpv-su-puerta-y-estook-link.md)): **lee la cola por HTTPS cuando hay internet, recibe las comandas de los terminales por la red del local cuando no lo hay, y habla ESC/POS con las impresoras**. También hace de relevo hacia las pantallas de cocina y trae los datos de un TPV ajeno (M19b). **Su parte de impresión y de centro se construye en M19a, antes de la sala y la cocina**, porque sin ella M20A no sirve de nada.

- **Vale cualquier impresora ESC/POS**: Epson, Star, Bixolon, HPRT, Citizen, las genéricas chinas, y las de impacto de cocina. Por red, por USB o por Bluetooth.
- Imprime **en silencio**, sin cuadros de diálogo.
- **Funciona con todas las tablets apagadas**, que es el requisito de cocina.
- **Si se va internet, la cocina sigue recibiendo e imprimiendo**: lo que ya tenía en cola, y lo nuevo que le mandan los terminales por la red del local. Al volver, sube todo en orden.
- **Escucha solo en la red del local y solo a terminales emparejados**; hacia internet sale él, cifrado, y no abre ningún puerto.
- No hace falta un ordenador caro: vale el PC del TPV, un mini PC o una Raspberry Pi de unos 50 €. **Se compila también para Linux y para Mac**, no solo para Windows.

### Vía 2 · La cáscara de Estook TPV

**Y aquí está la respuesta a «¿web o nativo?»: no hay que elegir.** Estook TPV es web, y para el iPad y para imprimir sin Link se envuelve en una cáscara nativa —Capacitor— que se publica en Google Play y en la App Store. Es opcional.

Dentro de la cáscara, la web es exactamente la misma. Lo que la cáscara añade es lo que un navegador no puede dar:

- **Abrir sockets TCP** y hablar ESC/POS con cualquier impresora de la red o por Bluetooth. Hay plugins y librerías maduras para esto.
- Modo quiosco, para que un empleado no se salga de la app.
- Bloquear el apagado de pantalla durante el servicio.
- Avisos con sonido aunque la app esté en segundo plano.
- Cámara y lector de códigos de verdad.
- **Hablar con Link por la red del local en el iPad**, que Safari no deja.

**No se rehace nada.** Se empaqueta lo que ya hay.

> Es la vía para el food truck, la barra pequeña o el local que no quiere un ordenador encendido. **No sirve para la cocina como única vía**, por lo dicho en 6.1: depende de que un aparato concreto esté vivo.

### Vía 3 · Impresora que pregunta sola

Algunas impresoras salen a internet y preguntan ellas cada pocos segundos si hay algo para imprimir. **Star con CloudPRNT** pregunta cada 5 segundos por defecto en sus modelos actuales; **Epson con Server Direct Print**, cada 60 por defecto.

- **Ventaja:** cero instalación en el local. Se configura una URL en la impresora y ya está.
- **Precio de esa comodidad:** obliga a comprar ese modelo. Orden de magnitud, unos 290 € **[VERIFICAR al comprar]**.
- **Cuándo se ofrece:** al local que abre de cero y quiere lo más simple posible, o al que no puede tener un aparato encendido.

### Vía 4 · Sin impresora

La **pantalla de cocina** de M20A hace más que el papel: tiempos, prioridades, marcar plato a plato, cero consumibles. Una tablet de gama baja cuesta menos que una impresora.

Y el **ticket por correo o por QR**, que el cliente se lleva en el móvil.

## 6.4 Qué se le ofrece a cada local

La puesta en marcha pregunta qué tiene, no qué le vendemos:

| Lo que tiene el local        | Lo que se le pone                                                     |
| ---------------------------- | --------------------------------------------------------------------- |
| Ya tiene impresoras y un PC  | **Estook Link.** No compra nada                                       |
| Ya tiene impresoras, sin PC  | Estook Link en una Raspberry (~50 €), o la cáscara en una tablet fija |
| No tiene nada y abre de cero | Pantalla de cocina, y una impresora que pregunta sola para la caja    |
| Food truck, barra pequeña    | La cáscara en la tablet, imprimiendo directamente                     |
| Varios locales               | Estook Link en cada uno, gestionados desde el panel de cadena         |

**Ningún local se queda fuera**, y en la web pública no se promete una marca: se dice «funciona con tu impresora».

## 6.5 Cómo se construye

**La cola.** `trabajo_de_impresion`: local, impresora, tipo (`comanda`, `ticket`, `precuenta`, `informe`), **contenido ya compuesto por el servidor**, estado (`pendiente`, `entregado`, `impreso`, `error`), intentos y momento de cada paso. Un trabajo por documento, con identificador único.

**El contenido se compone en el servidor, una sola vez, y en un formato intermedio propio** —líneas, alineación, tamaño, negrita, corte, cajón—, no en ESC/POS crudo. Cada agente lo traduce a lo que entiende su impresora. Así una impresora nueva es un traductor nuevo, y no se toca nada más. Es la misma regla de los documentos del Manifiesto: reimprimir da exactamente lo mismo.

**Cómo lee cada agente la cola:**

- **Estook Link y la cáscara:** se suscriben en tiempo real a la cola (Realtime de Supabase), con una consulta periódica de seguridad por si se pierde un aviso. Confirman cada trabajo.
- **Sin internet, Link recibe los trabajos directamente de los terminales** por la red del local, con el mismo identificador que tendrían en la cola: al volver internet los sube, y la cola sabe que ya están impresos.
- **Impresora que pregunta sola:** una Edge Function con los tres métodos de su protocolo —pregunta, recogida y confirmación—, con un identificador largo e irrepetible por impresora y autenticación básica. **La dirección de una impresora es un secreto.**

**Reintentos.** Un trabajo `entregado` que no se confirma en un tiempo razonable vuelve a `pendiente`, con un límite de intentos para no imprimir la misma comanda quince veces.

**Varias impresoras.** Cada plato lleva **a qué impresora va**, heredado de su sección de carta. Una comanda que toca cocina y barra genera **dos trabajos**, cada uno con lo suyo.

**Ajustes › Impresoras.** Dar de alta, ver el estado y cuándo se supo de ella por última vez, y un botón de **imprimir prueba**. Sin ese botón, configurar una impresora es adivinar.

## 6.6 Térmica o de impacto

El papel térmico es sensible al calor, a la luz y a la humedad, así que en una cocina con vapor una comanda térmica puede volverse ilegible.

- **Para la comanda** da igual en la práctica: vive minutos. Y la térmica es silenciosa y rápida, que en cocina se agradece.
- **Si el local usa impacto** (la clásica Epson TM-U220), va por Estook Link o por la cáscara: ESC/POS es ESC/POS. Es una razón más para que la vía principal sea el agente y no una impresora concreta.
- **Para el ticket de caja**, térmica siempre.

## 6.7 Reglas

1. **El ticket se emite antes de imprimirse.** Si la impresión falla, el documento ya existe con su número: se reimprime o se manda por correo, y **nunca se vuelve a emitir**.
2. **Reimprimir es reimprimir.** Sale marcado como copia y no genera ningún registro fiscal nuevo.
3. **La comanda no es un documento fiscal.** Sin numeración de serie, sin QR, sin leyenda.
4. **La impresión no bloquea el servicio.** Ni mandar a cocina ni cobrar esperan a que salga el papel.
5. **Si la cocina lleva un rato sin imprimir, se avisa** en la sala y en el Panel. Y si hay pantalla de cocina, ahí se sigue viendo todo.
6. **El núcleo no conoce ninguna marca.** Solo deja trabajos en la cola.

## 6.8 Qué hay que probar

- La misma comanda sale igual por **Link, por la cáscara y por una impresora que pregunta sola**. Es la prueba de que el formato intermedio funciona.
- Mandar a cocina y cronometrar: **menos de 6 segundos**.
- Apagar la impresora, mandar tres comandas y encenderla: salen las tres, en orden y sin repetirse.
- Cortar internet con Link instalado y mandar una comanda desde un terminal: **la cocina la recibe y la imprime**, y al volver sube una vez.
- Quitar el papel: Estook lo avisa antes de que nadie lo mire.
- Una comanda con platos de cocina y de barra: dos trabajos.
- Reimprimir un ticket: idéntico, marcado como copia, sin registro nuevo.
- Con todas las tablets apagadas, una comanda lanzada desde otro sitio se imprime igual.
- La dirección de una impresora **no aparece** en el cliente ni en ningún registro.
- Al menos **tres marcas distintas** de impresora, una de ellas de impacto.

# 7 · Modelo de datos

Orientativo: **manda el esquema real**. Todo lo operativo vive en el esquema **`estook`**, como el resto de Estook (la versión 1.1 decía `public`, y no es donde vive nada), con su seguridad por filas escrita contra `locales_visibles`. Lo fiscal, en **`facturacion`**, solo de inserción. Dinero en **céntimos enteros**, cantidades con cuatro decimales, fechas en `timestamptz` y la jornada calculada por el servidor con el corte del local.

**Los nombres, como el resto del esquema:** en singular y con «de» (`linea_de_cierre`, `pedido_de_compra`). Por eso aquí se escribe `linea_de_cuenta` y no `cuenta_lineas`.

> **Regla al leer este capítulo.** Si algo del capítulo 3, 5, 6 o 10 no tiene dónde guardarse aquí, **el que está mal es este capítulo**. Antes de construir se comprueban los dos contra el esquema real. El modelo entero de Estook —persona, terminal, operador, empresa, caja— está en la [Arquitectura](Estook-Arquitectura.md), capítulo 5.

## 7.1 Quién, y desde qué

- `persona` — **el correo pasa a ser opcional** ([0057](../decisiones/0057-quien-es-quien-en-el-tpv.md)); sin correo, entra solo en los terminales, con su PIN. Se hace en H
- `terminal` — local, nombre, **función** (`sala`, `barra`, `cocina`, `pase`, `fichar`), huella de su sesión, emparejado cuándo y por quién, revocado cuándo y por quién, **versión que lleva**, último latido
- `turno_del_operador` — terminal, persona, desde, hasta, por qué acabó (bloqueo, otro operador, salir)
- `aprobacion` — qué operación y sobre qué, **quién la pidió** y **quién la aprobó**, motivo, terminal, cuándo, **usada**; caduca a los dos minutos y sirve una vez
- `empresa` — la empresa fiscal ([0060](../decisiones/0060-la-empresa-fiscal.md)): organización, razón social, NIF, nombre comercial, domicilio fiscal, SII, foral, **titular** (una persona), representación ante Hacienda con quién firmó y cuándo, estado del alta. Y `local.empresa_id`

## 7.2 Sala

- `zona_de_sala` — nombre, orden, canal por defecto (M10)
- `mesa` — zona, nombre, plazas, posición en el plano
- `cuenta` — **tipo** (`mesa`, `barra`, `para_llevar`, `reparto`, `consumo_interno`), mesa si la tiene, **nombre o número de recogida** si es para llevar o de reparto, estado, camarero **actual**, comensales, canal, apertura, cierre, versión. **`reparto` solo lo crea el adaptador del canal** (M29) y lleva el identificador del pedido en la plataforma: es la comanda que va a cocina (10.8), no una tabla de pedidos aparte. **Su identificador nace en el aparato**, para que subirla dos veces no cree dos
- `alergeno_de_la_cuenta` — cuenta, alérgeno, quién lo marcó y cuándo
- `linea_de_cuenta` — plato, cantidad, **precio y tipo de impuesto congelados**, modificadores elegidos (cada uno con su precio y su escandallo), nota, **comensal** (número o nulo), **tanda**, **partida** (copiada al mandar, no leída después), estado (`pedida`, `en_cocina`, `lista`, `servida`, `quitada`), y autor, motivo y aprobación si se quita. **Su identificador también nace en el aparato**, y a una cuenta **se le añaden líneas, nunca se sobreescriben**
- `traspaso_de_cuenta` — cuenta, de quién, a quién, cuándo, quién lo hizo

**Por qué `partida` se copia en la línea y no se lee del plato:** si mañana el plato cambia de partida, la comanda de ayer tiene que seguir contando lo que pasó de verdad. Es la misma regla que congela el precio y el coste.

## 7.3 Cocina

- `partida` — nombre, orden en el pase, color. Sembradas por tipo de local
- `pantalla_de_cocina` — terminal, **qué partidas enseña**, si es **pantalla de pase**
- `tanda` — cuenta, número de tanda, estado (`pendiente`, `marchada`, `en_cocina`, `lista`, `servida`), **cuándo se marchó y quién**
- `linea_de_cuenta` gana los tiempos: `mandada_en`, `marchada_en`, `lista_en`, `servida_en`, **quién la marcó lista** (persona o terminal) y, si se deshizo, **quién y cuándo**
- `tiempo_objetivo` — por local y, si se quiere, por plato: los minutos de cada tramo del semáforo

**El contador del día por plato no se guarda:** es una consulta sobre `linea_de_cuenta` de la jornada. **Tampoco «lo comprometido»** para «Quedan N»: es una consulta sobre las líneas mandadas y sin cobrar ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)). Guardarlos sería una segunda fuente de verdad.

## 7.4 Cobro, pagos y caja

- `cobro` — cuenta, **qué líneas o qué comensales o qué parte paga**, importe, operador, terminal, **turno de caja o bolsa**, `documento_id` o `justificante_id`, estado, y su identificador nacido en el aparato
- `pago` — cobro, **forma** (`efectivo`, `tarjeta`, `otro`), importe, **entregado y cambio** si es efectivo, y si el datáfono está conectado (10.7), **la operación del proveedor y su estado**. **Un cobro, uno o varios pagos**
- `cajon` — local, nombre, la impresora que lo abre
- `turno_de_caja` — **un cajón o una persona** (la bolsa del camarero), apertura con su fondo contado, **si el arqueo es ciego**, arqueo por billetes y monedas, **el total que dio el datáfono al cerrar**, cierre, descuadre de efectivo y de tarjeta, y quién abrió y cerró
- `movimiento_de_caja` — turno, tipo (`fondo`, `cobro_en_efectivo`, `cambio`, `entrada`, `salida`, `apertura_sin_venta`, `liquidacion_de_bolsa`, `devolucion`), importe, motivo, autor, aprobación si la hubo

**Los informes X y Z no se guardan**: son consultas sobre el turno de caja, sus movimientos y sus cobros. **El cierre del día** es la suma de los Z, y rellena `cierre_de_caja` (M6½), que sigue siendo uno por jornada.

## 7.5 Impresión

- `impresora` — local, nombre, **agente** (`link`, `cascara`, `pregunta_sola`), dirección o identificador, ancho de papel, **partidas que imprime**, activa, último contacto, **último estado que mandó**
- `trabajo_de_impresion` — local, impresora, tipo (`comanda`, `ticket`, `justificante`, `precuenta`, `informe`), **contenido ya compuesto en el formato intermedio**, estado (`pendiente`, `entregado`, `impreso`, `error`), intentos, momentos de cada paso, referencia a lo que lo originó
- **Identificador único por trabajo**, que es lo que hace que un reintento —o un trabajo que Link imprimió sin internet y sube después— no imprima dos veces

## 7.6 Facturación (esquema `facturacion`, solo inserción)

- `serie` — empresa, local, tipo, prefijo, ejercicio, último número
- `documento` — empresa, serie, número, tipo, fecha de expedición, fecha de operación, destinatario si lo hay, base, cuota, total, **copia congelada de las líneas y del desglose**, **copia de los datos de la empresa del momento**, `sustituye_a` (F3), `rectifica_a` (R), referencia al cobro, y su identificador, que es **la clave de idempotencia** ante el proveedor ([0059](../decisiones/0059-emitir-un-documento-fiscal.md)). **Nace preparado y no cambia nunca más**
- `registro` — documento, lo que devolvió el proveedor al registrarlo (`uuid`, **QR**, **huella**), y cada estado ante la AEAT que llegue después, **una fila por novedad**
- `envio` — documento, **cada intento**: cuándo, qué se mandó, qué contestó, código
- `xml_del_registro` — documento, **petición y respuesta** descargadas del proveedor, para no depender de él
- `aviso_recibido` — el identificador único del aviso, contenido, procesado
- `justificante` — cobro, contenido, **código para descargar el ticket**, documento emitido después

**El estado de un documento no se guarda en el documento: se lee de lo que se le ha ido añadiendo** —preparado, enviando, registrado, pendiente por incidencia, rechazado o aceptado con errores—, con una vista. Así **todo el esquema es de verdad solo de inserción**, sin una sola excepción en los disparadores. **[Se prueba rompiéndolo a propósito.]**

## 7.7 Cómo se une con el resto de Estook

- **Al cobrar** se crea la `venta` de M20 con `origen = 'estook_tpv'` y su cobro. **No espera al documento** ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)).
- Una rectificativa por devolución genera los movimientos contrarios, **si el género vuelve de verdad**.
- **Un canje F3 no toca el stock.**
- Los tiempos de `linea_de_cuenta` alimentan la ficha de M9 y la analítica de M21 **por consulta**, sin copiarse.
- Un plato marcado agotado escribe en donde ya vive el agotado de M10, no en una tabla nueva.

## 7.8 Lo que este modelo hace posible, comprobado uno a uno

Cada promesa del producto, con el sitio donde se guarda. **Si alguna se queda sin fila, el modelo está mal.**

| Lo que promete el producto                     | Dónde vive                                                   |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Entrar solo con el PIN en un terminal          | `terminal` + `turno_del_operador`                            |
| Un trabajador sin correo                       | `persona` con correo opcional                                |
| Que un encargado apruebe con su PIN            | `aprobacion`                                                 |
| Dividir la cuenta por comensal                 | `linea_de_cuenta.comensal` + `cobro` (qué paga)              |
| Pagar una parte en efectivo y otra con tarjeta | varios `pago` del mismo `cobro`                              |
| La bolsa del camarero                          | `turno_de_caja` de una persona + `liquidacion_de_bolsa`      |
| Vender en barra sin abrir mesa                 | `cuenta.tipo`                                                |
| Para llevar con nombre de recogida             | `cuenta.tipo` y su nombre                                    |
| Aviso de alergia de la mesa                    | `alergeno_de_la_cuenta`                                      |
| Mandar por tandas y marchar                    | `linea_de_cuenta.tanda` + `tanda`                            |
| Cada partida ve lo suyo                        | `linea_de_cuenta.partida` + `pantalla_de_cocina`             |
| Pantalla de pase                               | `pantalla_de_cocina.es_pase`                                 |
| Semáforo con los minutos del local             | `tiempo_objetivo`                                            |
| Deshacer un plato marcado                      | los tiempos y el autor de `linea_de_cuenta`                  |
| Contador del día y «Quedan N»                  | consultas, no se guardan                                     |
| Traspasar una mesa de camarero                 | `cuenta.camarero` + `traspaso_de_cuenta`                     |
| Tiempo real de cocina hacia la ficha           | los tiempos de `linea_de_cuenta`                             |
| Trabajar sin conexión sin duplicar             | identificadores nacidos en el aparato + idempotencia         |
| Imprimir en cualquier impresora                | `impresora.agente` + formato intermedio                      |
| Reimprimir idéntico                            | `trabajo_de_impresion.contenido` congelado                   |
| Un reintento no duplica                        | identificador único del trabajo                              |
| Ticket con su QR y su estado                   | `documento` + `registro` + `envio`                           |
| Una respuesta perdida no duplica               | la clave de idempotencia del `documento`                     |
| Cobrar sin conexión                            | `justificante`                                               |
| Corregir sin tocar lo emitido                  | `sustituye_a` y `rectifica_a`                                |
| Demostrar lo emitido sin el proveedor          | `xml_del_registro`                                           |
| Abrir el cajón sin venta, con rastro           | `movimiento_de_caja` (apertura sin venta) + `aprobacion`     |
| Arqueo ciego y cuadre de la tarjeta            | `turno_de_caja`                                              |
| Informes X y Z, y el cierre del día            | consultas, no se guardan; el cierre rellena `cierre_de_caja` |
| Cobrar con el datáfono conectado               | la operación del proveedor en `pago`                         |
| Pedido de reparto en la cocina                 | `cuenta.tipo = reparto` y sus líneas                         |
| Varias empresas en una cuenta                  | `empresa` + `local.empresa_id`                               |

---

# 8 · Pruebas obligatorias

Todas automáticas, contra el entorno de pruebas. Cada una se rompe a propósito antes de darla por buena (E4 del Plan).

**Aislamiento**

1. `UPDATE` y `DELETE` sobre `facturacion.documento` fallan con todos los roles, incluido el de servicio.
2. El panel interno no consigue modificar un documento llamando a la API a pelo.
3. Las claves del proveedor no aparecen en el cliente, ni en los registros, ni en un error.

**Numeración y cadena**

4. Cien cobros simultáneos desde cinco aparatos del mismo NIF: numeración correlativa, sin huecos ni duplicados, y **ninguno espera a Verifacti para numerar**.
5. Un rechazo por datos de Verifacti **se corrige y sale con el mismo número**, sin huecos.
6. Dos NIF cobrando a la vez: no se mezclan series ni claves.
7. **Verifacti registra y la respuesta se pierde**: al reintentar con la misma clave no hay dos registros ni dos números, y el documento acaba registrado.
8. **La función se cae con el documento enviándose**: el trabajo lo encuentra y lo termina.
9. `UPDATE`, `DELETE` y **`TRUNCATE`** sobre las tablas de `facturacion` fallan con todos los roles.

**Documentos**

10. Ticket con dos tipos de IVA: dos líneas de desglose, y la suma cuadra al céntimo.
11. Canje F3: importe igual al ticket, ticket marcado como canjeado, segundo canje bloqueado, ticket original intacto.
12. Devolución con R5 en su serie, con su registro, con salida de caja.
13. Anulación solo disponible para el rol que puede y con motivo.

**Fallos**

14. Caída del proveedor durante 30 minutos: se cobra con justificante, **la venta y el almacén se mueven al momento**, y al volver salen los tickets en orden, con la incidencia, y **se pueden descargar con el código del justificante**.
15. Rechazo simulado de la AEAT: aparece en registros con error y se corrige sin tocar el original.
16. El mismo webhook dos veces no cambia nada.
17. Un registro que lleva más de una hora pendiente se consulta solo.
18. La impresora no responde: el ticket sigue emitido y se puede reimprimir.

**Reloj y regímenes**

19. Cobro a las 02:30: jornada del día anterior, fecha de expedición del día real.
20. Los dos cambios de hora del año, correctos.
21. Un local **foral, en SII, de Ceuta o de Melilla** no puede activar el módulo, y la pantalla explica **su** motivo, no uno genérico, diciendo si es definitivo o un «todavía no».
22. Un local **canario sí lo activa**, emite con **IGIC** y **no puede emitir con IVA**; y un local peninsular no puede emitir con IGIC.

**De punta a punta**

23. Servicio completo de diez mesas, una dividida en tres, un pago mixto, una factura pedida y una devolución: caja, tickets, ventas y almacén cuadran al céntimo.
24. El QR impreso en 58 y en 80 mm se lee con la aplicación de la AEAT.
25. **Dos camareros con bolsa y una caja central** en el mismo turno: cada bolsa se liquida en la caja con su arqueo ciego, y el cierre del día suma los Z sin pisarse.
26. **Todos los documentos de una empresa con dos locales** comparten sus datos fiscales y cada local tiene sus series.

---

# 9 · Lo que tiene que estar antes de producción

1. Todas las pruebas del capítulo 8 **y las de los apartados 3.7 y 10.12**, en verde.
2. Todos los **[VERIFICAR]** resueltos y escritos en `ESTADO.md`, con su fuente y su fecha.
3. **Declaración responsable de Estook** redactada por el asesor y publicada dentro de la app.
4. **Revisión escrita del asesor fiscal** sobre el planteamiento entero.
5. Suscripción de pago con el proveedor, con su NIF de producción dado de alta y su representación firmada.
6. Procedimiento de baja escrito, con la exportación de XML antes de cancelar nada.
7. Vía de impresión decidida y probada con impresoras reales.
8. **Supabase de pago con recuperación a un punto en el tiempo**: con tickets, perder un día no vale ([0061](../decisiones/0061-el-orden-y-la-infraestructura.md)).
9. **El contrato de encargado del tratamiento** aceptado por el cliente, y la tabla de conservación en vigor ([0062](../decisiones/0062-lo-legal.md)).
10. **El soporte en horario de servicio** decidido y funcionando, y el latido de cada terminal a la vista de soporte.
11. **La publicación en Cloudflare Pages**, con el repositorio privado ([0061](../decisiones/0061-el-orden-y-la-infraestructura.md)).

**Hasta que las once estén hechas, el módulo de facturación se queda desactivado.** Sala y cocina pueden estar en producción sin él: un comandero no factura.

---

# 10 · Estook TPV · cómo se ve y cómo se usa

_Añadido en la versión 1.1 (27 de septiembre de 2026, [decisión 0054](../decisiones/0054-estook-tpv-y-uber-eats-comprobado.md)), después de mirar cómo lo hacen Last.app, Revo, Ágora, Glop, Square y Toast. De ellos se adoptan patrones, **no diseño, textos ni identidad** (Manifiesto, capítulo 27)._

> **El listón de este capítulo.** Un camarero decide en el primer servicio si un TPV le sirve. Si para cobrar una caña hacen falta seis toques, vuelve a la libreta. Todo lo de aquí se mide en **toques y en segundos**, y se prueba (10.12).

## 10.1 Dos nombres, una aplicación

| Lo que ve el cliente | Para qué                                                 | Por dentro                                                                   |
| -------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Estook**           | Gestionar: almacén, escandallos, carta, equipo, Negocio… | `apps/app`, la de siempre, con conexión                                      |
| **Estook TPV**       | El servicio: tomar nota, cocina, cobrar, la caja         | `apps/tpv`, **su propia puerta del mismo código**, que funciona sin conexión |

**Estook TPV es una puerta propia, no otra aplicación de producto** ([0056](../decisiones/0056-estook-tpv-su-puerta-y-estook-link.md)): comparte la API, la base, el login, el PIN, los permisos y el diseño, así que **no duplica nada**; y gana lo que un TPV necesita —instalarse aparte con su icono, arrancar en la función del terminal, trabajar sin conexión y actualizarse cuando lo decide el local—. Un terminal del local (3.4) enciende directamente en Estook TPV; un móvil personal abre Estook y entra al TPV con un botón, sin volver a entrar.

**Lo que eso le da al local:** el mismo PIN, los mismos permisos y los mismos datos. Lo que se cobra a las 14:31 está en Negocio a las 14:31, y el género ya ha salido del almacén. **No hay exportar, ni CSV, ni emparejar, ni sincronizar**: es la razón por la que un local que cobra con Estook trabaja menos que uno que conecta su TPV (Manifiesto, capítulo 1).

## 10.2 Un día, de principio a fin

```
08:30  El terminal enciende en su funcion (Sala, Barra o Cocina)
       └─ quien abre entra con su PIN y ABRE CAJA: cuenta el fondo
          (se propone el que quedo ayer) y el cajon se abre para meterlo
13:00  Servicio: mesas, barra y para llevar. Los pedidos de reparto
       entran en la misma cocina (10.8)
       └─ con efectivo se abre el cajon; con tarjeta, el datafono
16:00  Cambio de turno: cada camarero traspasa sus mesas (3.1)
       y mira su informe X
00:30  CIERRE: arqueo ciego, total del datafono e informe Z
       └─ la caja se cierra y el cierre de caja de Servicio se rellena solo
Y en Estook, al momento: ventas por plato y por hora, el genero
descontado, los tiempos de cocina, Negocio y el «Tu dia» de mañana
```

**Cada cobro emite su ticket, lo pida el cliente o no.** Es la factura simplificada, y VeriFactu la registra en Hacienda en ese momento (capítulo 4). Lo que el cliente elige es **cómo se lo lleva** —en papel, por correo o en un QR en pantalla—, no si existe (10.5).

## 10.3 Tomar nota

La tablet apaisada es la referencia:

```
┌───────────────────────────────┬──────────────────────────────────────────┐
│ MESA 12 · 4 pax · Ana         │ Entrantes  Principales  Postres  Bebidas │
│ ! Alergia: frutos secos       │ [ Buscar ]                               │
│                               │ ┌────────┐┌────────┐┌────────┐┌────────┐ │
│ TANDA 1                       │ │Croqueta││Bravas  ││Ensalada││Pulpo   │ │
│ (1) 2 Croquetas       14,00   │ │        ││        ││        ││Quedan 3│ │
│ (2) 1 Ensalada         9,50   │ └────────┘└────────┘└────────┘└────────┘ │
│ TANDA 2                       │ ┌────────┐┌────────┐┌────────┐┌────────┐ │
│ (1) 1 Entrecot · al punto 24  │ │Entrecot││Merluza ││Risotto ││AGOTADO │ │
│                               │ └────────┘└────────┘└────────┘└────────┘ │
│ Total               47,50 €   │                                          │
│ [Mandar] [Cuenta] [Cobrar]    │                                          │
└───────────────────────────────┴──────────────────────────────────────────┘
```

- **A la derecha, la carta del canal de esa mesa** (M10): sus secciones arriba y los platos en botones grandes, con el color de su sección y su foto si la tiene. **Primero lo que más se vende a esa hora**, después el resto. El buscador tolera erratas (3.1).
- **Un toque añade uno.** Si el plato tiene **opciones obligatorias** —«¿al punto?», «¿qué guarnición?»— se abre una hoja pequeña, y **no se puede mandar sin contestarlas**: es lo que evita que el cocinero salga a preguntar. Los extras, en la misma hoja, con su precio.
- **Toque largo** sobre una línea: nota libre, comensal, tanda, quitar.
- **A la izquierda, la cuenta, por tandas**, cada línea con su comensal si se asignó. Arriba, la mesa: nombre, comensales, camarero y **el aviso de alergia con icono y texto**.
- **Abajo, siempre a la vista: Mandar** (lo nuevo va a cocina), **Cuenta** (la precuenta, 3.5) **y Cobrar** (10.5).
- **El menú del día** pide sus pasos uno detrás de otro —primero, segundo, postre, bebida— y cada elección va a cocina como su plato (M10).
- **Agotado** sale en gris y no se puede tocar; con pocas raciones, **«Quedan 3»**, calculado con el escandallo, el stock y lo que ya está en cocina (3.1).
- **«Otra ronda»**: repite lo último que pidió la mesa en dos toques. En un bar es lo que más se hace.
- **Grupos de opciones que se reutilizan** —«punto de la carne» para cinco platos, «guarnición»—, con mínimo, máximo, precio por canal y **su propio escandallo**: «extra de queso» gasta queso. Sin eso, el almacén miente.
- **Artículo libre**, con precio y permiso («varios, 3 €»), y siempre con su descripción, que el ticket la necesita.
- **Productos a peso** —pescado, jamón—: se escribe el peso o lo da la balanza, y el precio sale solo.

**La vara de medir: una comanda de cuatro platos en diez toques o menos, desde el plano.**

**En el móvil del camarero** —el comandero— es la misma pantalla en una columna: las secciones arriba, los platos en cuadrícula, y la cuenta en una hoja que sube desde abajo con el total y **Mandar** siempre a mano. Se usa con una mano. No es otra aplicación.

**En la barra**, arriba del todo y siempre: **«Venta rápida»**. Se pide y se cobra sin abrir nada (3.1).

## 10.4 El plano

- **Las zonas en pestañas** (Salón · Terraza · Barra) y las mesas donde están de verdad.
- **Cada mesa dice, sin abrirla:** su estado con color e icono (3.1), cuánto lleva abierta, sus comensales, su total y las iniciales de su camarero. «Pidió la cuenta» destaca sobre todo lo demás.
- **«Mis mesas»**, un filtro que en el móvil del camarero viene puesto.
- **El plano se dibuja arrastrando** en Ajustes › Sala, empezando por una plantilla del tipo de local. Se hace con `@dnd-kit`, que ya está en el proyecto por el Panel ([0039](../decisiones/0039-el-panel-se-monta-como-un-movil.md)): **ninguna dependencia nueva**.
- **Lo que cambia en un aparato se ve en los demás en menos de 2 segundos**, lo mismo que marchar (3.7).

## 10.5 Cobrar

```
┌──────────────── COBRAR · MESA 12 ────────────────┐
│                     47,50 €                      │
│    [ Efectivo ]   [ Tarjeta ]   [ Dividir ]      │
│                                                  │
│  Entregado:  [Exacto] [50] [20] [10] [5]         │
│              o escribirlo                        │
│  CAMBIO                                 2,50 €   │
│                                                  │
│  El ticket:  [ Imprimir ]  [ Correo ]  [ QR ]    │
└──────────────────────────────────────────────────┘
```

- **El total es lo más grande de la pantalla.**
- **Efectivo:** botones de billete para no teclear —el importe exacto y los billetes que lo cubren— y **el cambio en grande**. Al confirmar se emite el ticket y **se abre el cajón** (10.6).
- **Tarjeta:** 10.7. **Mixto:** se pone lo que va en efectivo y el resto va a tarjeta: son **dos pagos del mismo cobro**, con un solo ticket (5.1).
- **Dividir:** por comensal, por platos o a partes iguales (5.1). Cada parte es su cobro y su ticket, y la mesa se libera con la última.
- **Invitar o descontar**, desde la cuenta, con permiso y motivo (Roles 1.12).
- **El ticket, como lo quiera el cliente:** impreso, por correo, o en un QR en pantalla que se lleva en el móvil. El documento es el mismo y **ya está emitido antes de elegir** (6.7). **[VERIFICAR con el asesor que el correo y el QR en pantalla valen como entrega de la factura simplificada.]**
- **«Pedir factura»** está en la misma pantalla del ticket recién emitido (el canje F3, 5.3): no hay que ir a buscarlo después.
- **Si los datos no valen, la mesa sigue abierta** y se dice qué pasa en cristiano (4.9). **Si Verifacti no responde**, sale el justificante con su código para descargar el ticket después (4.11).

## 10.6 El cajón y la caja

**Estook no toca el dinero**: el efectivo lo guarda el cajón del local. Lo que hace Estook es **abrirlo cuando toca y apuntar por qué**.

- **Cómo se abre.** El cajón va enchufado a la impresora de tickets, que es lo normal, y se abre con una orden de la propia impresora. Por eso **abrir el cajón es una línea más del formato intermedio** de impresión (6.5): el ticket de un cobro en efectivo la lleva —o el justificante, si no hay conexión (4.11)—, y la ejecuta el agente que tenga el local —Link, la cáscara o la impresora que pregunta sola—. **[VERIFICAR que las impresoras que preguntan solas aceptan la orden del cajón en sus modelos actuales.]**
- **Se abre solo** al cobrar en efectivo (o la parte en efectivo de un mixto), al abrir caja y en cada entrada o salida de caja.
- **Abrir el cajón sin venta** —cambiar un billete— se puede, **con permiso, motivo y rastro**, y cada apertura sale en el informe X y en el Z con quién y cuándo. Es la vía clásica por la que se escapa dinero de una caja, y los buenos TPV lo controlan así.
- **Un turno de caja por cajón.** Con uno, una caja; con dos —barra y comedor—, dos, cada una con su fondo y su arqueo.
- **Y la bolsa del camarero**, si el local la usa: quien cobra en la mesa con el comandero lleva su propio turno de caja, sin cajón, y **lo liquida en un cajón** al acabar, con arqueo ciego de lo que entrega (5.5). El local elige caja central, bolsa, o las dos según la persona.
- **Informe X**: cómo va el turno sin cerrarlo, para el cambio de turno; el camarero ve el de su bolsa. **Informe Z**: el cierre del turno. **El cierre del día** suma los Z. Son los nombres que usa cualquier hostelero, y **ninguno es un documento fiscal**: los tickets ya están en Hacienda uno a uno.
- **El Z enseña lo que el dueño quiere vigilar**: las anulaciones, las invitaciones, los descuentos y las aperturas del cajón sin venta, con quién y quién lo aprobó. Es el control de lo que se escapa, y nadie lo apaga.
- **Arqueo ciego, de fábrica.** Al cerrar se cuenta por billetes y monedas **sin ver lo que debería haber**, y solo después se enseña la diferencia: contar sabiendo el número invita a cuadrarlo. El gerente lo puede apagar en su local.
- **La tarjeta también se cuadra.** Al cerrar se escribe el total que da el cierre del datáfono, y Estook lo compara con lo cobrado con tarjeta. Un cobro marcado «con tarjeta» que no pasó por el datáfono sale ese mismo día, y no a fin de mes. Con el datáfono conectado (10.7), se hace solo.
- **El descuadre se guarda y no bloquea el cierre** (5.5). El Z rellena el cierre de caja de Servicio con origen «TPV de Estook».
- **Más adelante, por adaptador:** los cajones que cuentan solos (Cashlogy, CashDro, Glory), que cobran, dan el cambio y cierran sin descuadre. **[VERIFICAR cómo se integra cada uno cuando haya un cliente que lo tenga.]**

## 10.7 El datáfono

Dos niveles, y **en los dos el dinero va de la tarjeta del cliente a la cuenta del local**: Estook solo sabe el importe y si salió aprobado.

|                     | Nivel 1 · sin conectar                                                                | Nivel 2 · conectado                                                                      |
| ------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Qué es              | El datáfono del banco, el de siempre                                                  | Un datáfono que habla con Estook por internet                                            |
| Cómo se cobra       | El camarero teclea el importe en el datáfono y confirma «Cobrado» en Estook           | Estook manda el importe; el cliente pasa la tarjeta; vuelve «aprobado» o «denegado» solo |
| Lo que puede fallar | Teclear mal, o marcar cobrado lo que no pasó. **Lo caza el cuadre del cierre** (10.6) | Nada de eso: no se teclea                                                                |
| Propina en tarjeta  | La lleva el datáfono; Estook no la toca                                               | Vuelve con la operación y se apunta aparte **[VERIFICAR con el asesor, 5.1]**            |
| Cuándo              | **Desde el primer día (M20C), para cualquier local**                                  | **Después de M20C**, local a local                                                       |

**El nivel 1 no se quita nunca**: el datáfono del banco es lo que tiene casi todo local en España, y el TPV no puede exigir cambiarlo.

**El nivel 2, comprobado el 27 de septiembre de 2026.** Estos existen y tienen documentación pública; **ninguno se ha probado todavía**:

- **Stripe Terminal**, con su integración «dirigida por el servidor»: Estook habla con la API de Stripe y Stripe con el lector, sin tocar la red del local. Disponible en España con lectores inteligentes (S700, WisePOS E). [Documentación](https://docs.stripe.com/terminal/payments/setup-reader).
- **Viva.com**, con su Cloud Terminal API: el TPV manda la orden de cobro al datáfono por internet. Muy extendido en la hostelería española, y cobra también con el móvil. [Documentación](https://developer.viva.com/apis-for-point-of-sale/card-terminals-devices/rest-api/).
- **SumUp**, con su Cloud API y el lector Solo, a cualquier distancia, con lector virtual y cuenta de pruebas. [Documentación](https://developer.sumup.com/terminal-payments/cloud-api).
- **Los datáfonos de banco (Redsys)**: **[VERIFICAR]**. Su integración suele ser local y distinta en cada banco. Se estudia cuando un cliente lo pida.

**Cómo se construye:** detrás de un adaptador, `ProveedorDatafono`, igual que la facturación (4.2), con cobrar, consultar, anular y devolver una operación. **La cuenta del datáfono es del local**, a su nombre con ese proveedor: Estook no guarda tarjetas, no recibe fondos y **no pasa a ser pasarela de pago** ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)). **Cuál va primero** se decide al llegar a M20C con los precios delante (decisión 0054). Y ningún campo ni llamada se escribe sin leer antes su documentación oficial de ese día.

**Si el datáfono conectado no responde**, se cobra como en el nivel 1 y queda marcado. **Nunca se para un cobro.**

**Y la regla que no se mueve** ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)): **Estook no cobra comisión por los pagos del local** ni pasa a ser entidad de pago. Lo mismo vale, cuando lleguen, para pagar en la mesa con el móvil y para Bizum: el proveedor es del local y el dinero va a su cuenta.

## 10.8 Los pedidos de reparto, en la misma cocina

_Cuando el local tiene un canal conectado (M29) **y** cobra con Estook._ Es lo que hacen los mejores: una sola pantalla para todo, y **ninguna tablet de cada plataforma encima de la barra**.

```
La plataforma avisa (webhook) → Estook trae el pedido (M29)
├─ suena en Estook TPV y en Servicio · Delivery: «Uber Eats · 3 platos · Laura»
├─ se acepta con su tiempo de preparacion (o solo, si el local lo enciende)
├─ va a COCINA como una comanda mas, por partidas, con la etiqueta del
│  canal y el nombre de recogida (cuenta de tipo «reparto», 7.1)
├─ cocina lo marca listo → se le dice a la plataforma, si su API lo permite
└─ NO pasa por el cobro de la sala: el cliente ya pago a la plataforma
   └─ entra en Ventas con su canal y su comision (M20) y mueve el almacen
```

Y tres cosas que un TPV sin almacén no puede hacer:

1. **Lo agotado en Estook se agota en la plataforma**, y vuelve cuando se desmarca.
2. **Pausar la tienda** en la plataforma desde Estook cuando la cocina no da abasto, y volver a abrirla.
3. **La carta del canal** (M10) es la que se publica en la plataforma: un precio, un sitio.

**Antes de construirlo** (Arquitectura, capítulo 10, «Los pedidos de reparto»): la 1 y la 3 exigen que la carta se suba **desde Estook** por la API de menús de la plataforma, y **solo una aplicación por tienda puede aceptar pedidos** —la que Uber llama _order manager_—: si el local ya usa otro integrador, Estook no puede serlo a la vez. **[VERIFICAR con el asesor quién factura un pedido de plataforma]** —el restaurante, o la plataforma en su nombre—. **Hasta saberlo, un pedido de reparto no emite ticket de Estook**, y el límite de la simplificada ya se guarda por canal (4.6).

## 10.9 Sin internet, lo que se ve

Arriba del TPV, siempre con icono y texto, nunca solo con color:

| Estado                                | Qué pasa                                                                                | Qué ve la sala                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Todo bien                             | —                                                                                       | Nada                                                                                  |
| **Hacienda no responde**              | Se emite normal y el envío espera (4.10)                                                | Nada. Al gerente, un aviso si pasa de una hora                                        |
| **Sin conexión con Estook, con Link** | Se toma nota, **la cocina recibe**, se imprime y se cobra con justificante (3.6 y 4.11) | Una franja discreta: «Sin internet. Todo sigue funcionando en el local»               |
| **Sin conexión con Estook, sin Link** | Se toma nota y se cobra con justificante; la cocina no recibe                           | Una franja ámbar: «Sin conexión. Se sigue trabajando; **la cocina aún no lo recibe**» |

Y al volver, **una vez**: «Conexión recuperada · 3 tickets emitidos».

## 10.10 Por qué es mejor, dicho en concreto

Lo que ninguno de los investigados tiene junto, porque ninguno tiene detrás el almacén, los escandallos y la carta:

| Estook TPV                                                                         | Un TPV normal                                      |
| ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| La cocina ve **el plato**: ficha, fotos, pasos y alérgenos (3.2)                   | Un texto                                           |
| **Avisa de la alergia** antes de mandar (3.1)                                      | No sabe qué lleva un plato                         |
| **«Quedan 3»** antes de agotarse (3.1)                                             | Se entera cuando ya no hay                         |
| Cada venta **descuenta el género y mueve el margen** al momento                    | Exportar, importar y emparejar                     |
| Los pedidos de reparto, **en la misma cocina**, y el agotado llega a la plataforma | Otra tablet por plataforma, o un integrador aparte |
| **Tarjeta y efectivo cuadrados el mismo día** (10.6)                               | Se ve a fin de mes                                 |
| El tiempo real de cada plato vuelve a su ficha y al cuadrante (3.3)                | Se queda en la pantalla                            |
| Fogón explica el día, y **nunca toca un ticket** (4.12)                            | —                                                  |
| **Sin internet, la sala y la cocina siguen hablándose** por Estook Link (3.6)      | Solo la cocina recibe, o nada                      |
| **Fichar y entrar al TPV con el mismo PIN**, y el TPV solo para quien ha fichado   | Dos sistemas que no se conocen                     |
| Todo en la misma cuenta, con el mismo PIN                                          | Dos programas y dos accesos                        |

## 10.11 Ponerlo en marcha

Que un local que viene de otro TPV **no tenga que reescribir nada**:

1. **La carta.** Si ya está en Estook (M10), ya está. Si viene de otro TPV, se importa su catálogo de artículos con el mismo lector de M18 y se empareja con las fichas.
2. **El plano**, desde la plantilla del tipo de local, ajustándolo con el dedo.
3. **Estook Link**, si la cocina quiere papel o el local quiere trabajar sin internet (6.4). Lo instalamos en una sesión remota.
4. **Los terminales** (3.4) y **las impresoras**, con su botón de imprimir prueba (6.5). El cajón se prueba desde ahí.
5. **La caja:** el fondo de siempre, y si el local usa **bolsa del camarero** o caja central (5.5).
6. **La facturación:** los cinco pasos de 4.3. Hasta el último, **el botón de cobrar sale bloqueado diciendo qué falta**.
7. **Practicar, en el local de ejemplo**, nunca en el de verdad. **No hay «modo formación» en producción** (4.12): una venta de mentira en el local real es justo lo que persigue la ley antifraude.

**Qué hace falta, sin atar marca:** una tablet de 10 pulgadas o más para la sala, o los móviles de los camareros · una pantalla en cocina, que puede ser una tablet · una impresora térmica de 80 mm ESC/POS por red **con el cajón enchufado a ella** · Estook Link en el PC del TPV, en un mini PC o en una Raspberry, si la cocina quiere papel o el local quiere trabajar sin internet (6.4) · el datáfono del banco · y un router con 4G de respaldo (4.11).

## 10.12 Lo que hay que probar, además de 3.7 y del capítulo 8

- Una comanda de cuatro platos, **en diez toques o menos** desde el plano.
- Un plato con una opción obligatoria **no se manda** sin contestarla.
- Cobrar en efectivo **abre el cajón**; con tarjeta, no.
- **Abrir el cajón sin venta** pide permiso y motivo, y sale en el X y en el Z con quién y cuándo.
- **El arqueo ciego** no enseña lo esperado hasta haber contado.
- Un cobro «con tarjeta» que no está en el total del datáfono **sale como descuadre** al cerrar.
- Lo que cambia en un aparato se ve en otro en menos de 2 segundos.
- Con un canal conectado, **un pedido aceptado sale en cocina por sus partidas y no pasa por el cobro**.
- Un datáfono conectado que no responde **no para el cobro**: se cobra como en el nivel 1 y queda marcado.
- **«Otra ronda»** repite lo último en dos toques; **un grupo de opciones** con su escandallo descuenta su género; un **producto a peso** cobra lo que pesa.
- **Estook TPV no se actualiza en mitad de un servicio**: con cuentas abiertas espera, y avisa si una versión es incompatible.
- **Cada objetivo de la tabla de 10.13**, medido con un camarero que no conoce Estook.

## 10.13 La velocidad, en toques

La vara de 10.3 —cuatro platos en diez toques— no basta: un camarero decide en el primer servicio. Estos son los objetivos, y se prueban (10.12).

| Lo que se hace                   | Objetivo                         |
| -------------------------------- | -------------------------------- |
| Abrir una mesa                   | 1 toque                          |
| Añadir un plato                  | 1 toque                          |
| Contestar una opción obligatoria | 1 toque por pregunta             |
| Mandar a cocina                  | 1 toque                          |
| Otra ronda                       | 2 toques                         |
| Mover una mesa                   | 3 toques                         |
| Dividir la cuenta                | De 3 a 5 toques                  |
| Cobrar una caña en barra, exacto | 3 toques, con el ticket impreso  |
| Imprimir el ticket               | 0: sale solo                     |
| Quitar una línea                 | 2 toques y el motivo             |
| Cambiar de camarero              | Su PIN, en menos de un segundo   |
| Abrir la caja                    | 3 toques, con el fondo propuesto |
| Cerrar la caja                   | Lo que se tarde en contar        |
