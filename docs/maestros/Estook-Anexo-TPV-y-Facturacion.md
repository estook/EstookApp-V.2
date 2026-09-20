---
titulo: Anexo · TPV y facturación
tipo: Documento maestro de especificación
fecha: Septiembre de 2026 · versión 1.0
nota: Cómo Estook toma nota, cobra y emite tickets y facturas cumpliendo VeriFactu. Manda sobre los demás documentos en su tema. Se lee entero antes de tocar sala, cocina, cobro, caja o facturación.
---

# Qué es este documento

Los cinco documentos maestros decían que Estook no cobra y no emite facturas. **Desde la Evolución 1.1, capítulo 19, eso cambia:** el local elige entre conectar su TPV o usar el de Estook. Este anexo es la especificación completa de esa parte, y **manda sobre cualquier otro documento donde hablen de lo mismo**.

Va dirigido a quien construya Estook, que será en su mayor parte una IA. Cubre los módulos **M20A (sala y cocina)**, **M20B (facturación VeriFactu)** y **M20C (cobro y caja)**.

Documentos hermanos: **Evolución 1.1** (por qué y con qué riesgos), **Manifiesto** (qué es el producto), **Plan de desarrollo** (cómo se construye y las quince reglas), **Roles y administración** (quién puede qué, apartado 1.12) y **Auditoría de flujos** (efectos en cadena 2.27 a 2.33, estados, fallos y la lista de comprobación de Facturación).

> **Lo marcado [VERIFICAR] no se programa hasta comprobarlo** contra la documentación oficial de la AEAT, la de Verifacti o el asesor fiscal, y lo comprobado se escribe en `ESTADO.md` con su fuente y su fecha. Es la regla 13 del Plan aplicada al sitio donde equivocarse sale más caro.

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
┌─────────── ZONA OPERATIVA · esquema publico ────────────┐
│  Mesas → Comandas → Cocina → Precuenta → Cobro          │
│  Caja · Ventas · Inventario · Negocio · Fogon           │
│  Se puede corregir, reprocesar y recalcular             │
└──────────────────────┬──────────────────────────────────┘
                       │ llama a
                       ▼
┌─────────── ZONA FISCAL · esquema facturacion ───────────┐
│  emitir_documento()  · SOLO INSERCION                   │
│   1. bloqueo por NIF                                    │
│   2. numero de la serie                                 │
│   3. POST a Verifacti (ProveedorFacturacion)            │
│   4. 200 → se guarda documento + uuid + QR + huella     │
│   5. evento documento.emitido                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼          Verifacti → XML + huella + cadena → AEAT
                 evento venta.cerrada → M20 → stock, costes, Negocio
```

**Cinco reglas de arquitectura, innegociables:**

1. **Esquema `facturacion` separado.** Ningún rol de la aplicación tiene permiso de escritura directa. Solo lo escribe una función `SECURITY DEFINER` propiedad del módulo.
2. **Las flechas van en un sentido.** La zona fiscal **lee** de la operativa y **nunca escribe** en ella. La operativa guarda la referencia al documento; el documento no depende de la operativa.
3. **Solo inserción.** Triggers que rechazan `UPDATE` y `DELETE` sobre `documentos`, `registros` y `envios`, para todos los roles incluido el de servicio. Se prueba rompiéndolo a propósito (E4 del Plan).
4. **Un solo sitio habla con Verifacti:** `servidor/facturacion/`. Ningún otro fichero importa su cliente ni conoce sus claves.
5. **El TPV es una fuente de ventas más.** La venta que nace al cobrar entra en el mismo motor de M20 que el CSV o el conector. **Nadie escribe un segundo motor de consumo.**

---

# 3 · M20A · Sala y cocina

> **El listón de este capítulo.** Un TPV que solo manda platos a una pantalla lo tiene cualquiera. Lo que Estook puede hacer y ninguno de los demás es que **la cocina conozca el plato**: su ficha, sus fotos, sus pasos, sus alérgenos y su tiempo real, porque todo eso ya vive en M9. Un KDS normal enseña un texto; el de Estook enseña el plato. Esa es la diferencia y se construye aquí.

## 3.1 Sala

**Sala es un modo de pantalla** (Plan, A5 y B5), no un destino de Servicio: una disposición completa, sin barra de navegación, para un aparato que hace una sola cosa durante el servicio. Se entra desde el Panel o directamente al abrir sesión si el rol lo tiene por defecto.

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

**Abrir:** comensales y camarero, que entra con su PIN (M4).

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
- **Ya en cocina**, deja autor y motivo y pide el permiso de Roles 1.12. Y **cocina se entera**: la línea sale tachada en su pantalla, con aviso, porque puede estar ya en la plancha.

### Mover, juntar, dividir y traspasar

- **Mover** una mesa a otra, **juntar** dos y **pasar platos** de una a otra, todo con rastro.
- **Dividir** una mesa en dos cuentas antes de cobrar.
- **Traspasar la mesa a otro camarero.** Es el cambio de turno: a las 16:00 entra otro y las mesas abiertas tienen que cambiar de dueño. **Sin esto, o el que se va se queda hasta que cierre la mesa, o las ventas se le apuntan a quien no es.** Se traspasa una mesa o todas las de una persona, con su rastro.

### Agotado

Se marca desde la comanda y desaparece de la carta y de la carta digital (M10 y M12). **Y Estook avisa antes de que pase**: como conoce el escandallo y el stock, sabe cuántas raciones quedan de un plato y lo dice en sala cuando bajan de un mínimo. Un TPV sin inventario no puede.

## 3.2 Cocina

Un modo de pantalla para un aparato fijo en cocina, a pantalla completa. Letra grande, contraste alto, botones grandes: se usa de lejos y con las manos ocupadas.

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

**Aparato compartido de sala.** El aparato tiene su propia sesión, emparejada con el local (M4) y revocable si se pierde. Encima de esa sesión, **cada acción que compromete algo va firmada con el PIN de quien la hace**: abrir una mesa, cobrar, invitar, quitar un plato ya mandado. Tomar nota en una mesa que ya abriste no vuelve a pedirlo mientras no cambie la persona.

**Quién se queda con la venta:** el camarero de la cuenta, que es el que la abrió o el que la recibió en un traspaso (3.1). No el aparato, y no quien pasaba por ahí.

**Pantalla de cocina en quiosco.** Sesión del aparato, no de una persona. Marcar un plato listo **no pide PIN** —en cocina eso no se puede hacer— y queda a nombre del aparato; lo que sí pide PIN es **salir del modo** y cualquier cosa de un jefe, como desmarcar pasado el margen.

**Y la regla que lo cierra:** un aparato registrado del local **no puede salirse a la aplicación de gestión** sin que alguien entre con su PIN. Una tablet de sala tirada en la barra no es una puerta al inventario ni a los sueldos.

## 3.5 Precuenta

Documento **no fiscal**:

- Encabezado `PRECUENTA` y pie `Documento no válido como factura`.
- **Sin número de serie, sin QR tributario y sin la leyenda VERI\*FACTU.**
- Se reimprime y se modifica libremente hasta el cobro.

## 3.6 Sin red

- La comanda **se guarda en el aparato y sube al recuperar señal**.
- La pantalla de cocina no recibe hasta que vuelve la red, **y la sala lo ve avisado**: si el camarero cree que la cocina lo tiene y no es así, el servicio se rompe.
- Con **Estook Enlace** instalado y la impresora en la red del local, **la comanda impresa sigue saliendo aunque no haya internet** (capítulo 6). Es la razón de fondo para recomendarlo en cualquier local con cocina.

## 3.7 Lo que hay que probar

- Un servicio de una mesa de seis con tres tandas, dos alergias y un plato quitado ya en cocina: **cuadra en sala, en cocina y en el pase**.
- Un local con tres pantallas: **cada partida ve solo lo suyo**, y un plato sin partida sale en todas y en la lista de fallos.
- Marchar desde sala llega a cocina **en menos de 2 segundos**.
- Un plato marcado por error se recupera dentro del margen, y fuera del margen lo desmarca un jefe.
- Se vende en barra sin abrir mesa, y se cobra en el mismo gesto.
- Se traspasa una mesa abierta a otro camarero y las ventas quedan a nombre del nuevo desde ese momento.
- Un plato con un alérgeno marcado en la mesa **avisa en sala antes de mandarlo** y sale marcado en cocina.
- Se corta el wifi: se sigue tomando nota, la sala lo ve avisado y con Enlace la comanda impresa sale igual.
- Un cocinero abre la ficha desde la comanda y **no recibe ni un importe**, comprobado llamando a la API a pelo.
- Dos camareros en la **misma tablet**: cada venta queda a nombre de quien la hizo, no del aparato ni del primero que entró.
- Desde un aparato en quiosco **no se llega a la aplicación de gestión** sin PIN.
- Un aparato revocado deja de funcionar en la petición siguiente.

---

# 4 · M20B · Facturación VeriFactu

## 4.1 El proveedor: Verifacti

| Qué                  | Cómo                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Formato              | API REST, JSON                                                                           |
| Autenticación        | `Authorization: Bearer <API Key>`, **una clave por NIF y por entorno**                   |
| Entornos             | La URL no cambia. **La clave decide**: `vf_test_…` es pruebas, `vf_prod_…` es producción |
| QR                   | Llega en la respuesta inmediata, en imagen Base64                                        |
| Huella y cadena      | **Las hace el proveedor.** Estook no calcula ninguna cadena                              |
| Envío a la AEAT      | Lo hace el proveedor con su certificado, en el minuto siguiente                          |
| Respuesta de la AEAT | Por webhook (preferido) o consultando el estado del registro                             |

**Dos detalles que ahorran errores:**

- **No se manda el identificador del SIF en la llamada.** Lo pone el proveedor en el XML.
- **Todas las series de un mismo NIF forman una sola cadena**, así que a efectos de la AEAT hay un solo sistema de facturación aunque el local tenga cinco tablets y tres series.

## 4.2 El adaptador

```ts
interface ProveedorFacturacion {
  emitir(nif: string, doc: DocumentoAEmitir): Promise<RespuestaEmision>; // uuid, qr, huella
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

1. **Datos fiscales del titular:** razón social o nombre y apellidos, NIF, domicilio fiscal completo. Es lo que sale impreso en cada ticket.
2. **Régimen:** IVA peninsular o balear · SII · foral · Canarias, Ceuta o Melilla. Todo lo que no sea el primero bloquea el módulo con su explicación (1.4).
3. **Series:** prefijo propio, comprobando que no choca con otro sistema que el local ya use. Propuesta: `T-{LOCAL}-{AÑO}-` para tickets, `F-{LOCAL}-{AÑO}-` para facturas y `R-{LOCAL}-{AÑO}-` para rectificativas. **Serie más número no pasan de 60 caracteres.**
4. **Alta del NIF en Verifacti**, por su API de gestión de NIF, y guardado de la clave en Vault.
5. **Autorización ante Hacienda:** se firma el modelo de representación que permite que los registros se envíen en nombre del negocio. Verifacti da el formulario relleno y el camino para firmarlo, por su web o por su API. **Solo lo firma el titular o su representante legal** (Roles 1.12), y Estook guarda quién firmó y cuándo.

**Pruebas y producción.** El entorno de pruebas de la AEAT **no admite NIF ficticios** y está limitado en volumen y en tiempo: se usa mientras se integra y se para cuando no se está integrando. La empresa de prueba gratuita de Verifacti es compartida y añade un prefijo al número de factura; **ese prefijo no existe con un NIF propio**, así que no se programa nada que dependa de él.

## 4.4 Series y numeración

- **Una serie por tipo de documento y por local.** Las rectificativas van **siempre** en serie propia; el abono en negativo puede ir en la serie original.
- **Numeración correlativa dentro de cada serie, sin huecos.** Es una obligación del reglamento de facturación que VeriFactu **no comprueba**: que la AEAT acepte un registro no significa que la numeración esté bien.
- **El número se asigna cuando el proveedor devuelve 200.** Si devuelve un error, el número **no se consume**.
- Si la AEAT rechaza después un registro ya devuelto con 200, **el número queda usado**: se corrige con una rectificativa, nunca reutilizándolo.
- Con varios aparatos cobrando a la vez, la emisión se serializa por NIF con `pg_advisory_xact_lock` dentro de la transacción. Sin eso salen huecos o duplicados.
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

```
1. El cobro llama a facturacion.emitir_documento(cuenta, cobro, tipo)
2. Bloqueo por NIF (pg_advisory_xact_lock)
3. Se comprueba que el alta de facturacion esta activa
4. Se toma el siguiente numero de la serie
5. Se compone el JSON: lineas agrupadas POR TIPO DE IVA Y CLAVE DE REGIMEN
6. POST a Verifacti
   ├─ 200 → se guarda documento (numero, uuid, QR, huella, estado «pendiente»)
   │        se marca la cuenta cobrada y se lanza documento.emitido y venta.cerrada
   ├─ 400 → NO se emite nada, NO se consume numero, la mesa sigue abierta
   │        se enseña que dato falla, en cristiano
   ├─ 429 → se reintenta con espera creciente
   └─ 500 / sin red → justificante provisional (4.11)
7. Minutos despues, el webhook trae la respuesta de la AEAT
```

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

La ley no permite entregar una factura sin haber generado antes su registro, y el registro lo genera Verifacti. **Sin conexión no hay ticket.** Lo que sí se puede es seguir vendiendo y cobrando.

```
Se cobra igual (efectivo o datafono)
        ↓
Se entrega un JUSTIFICANTE PROVISIONAL DE VENTA
  · lleva lo mismo que llevaria el ticket
  · dice claramente que NO es una factura
  · dice como pedir la factura despues
  · sin numero de serie fiscal, sin QR, sin leyenda
        ↓
La venta queda «pendiente de ticket», en el orden del cobro
        ↓
Al volver la red: se emiten en ese orden
  · campo de incidencia marcado
  · fecha_operacion con la fecha real si ha pasado mas de un dia
```

**Reglas:** no se reserva ningún número por adelantado; el orden es el de los cobros; y la sala distingue en pantalla «sin conexión con Estook» (no se emite) de «Hacienda no responde» (se emite normal, el envío espera).

**[VERIFICAR con el asesor el texto exacto del justificante provisional.]** En el alta se recomienda un router con 4G de respaldo.

> **Fuera de la v1:** emitir sin conexión desde el propio aparato. Un dispositivo que emite por su cuenta con su propio QR es **otro sistema de facturación independiente**, con su cadena y sus obligaciones. Solo se estudiará con demanda real y con asesoría.

## 4.12 Lo que el software no puede tener nunca

- Editar o borrar un ticket o una factura emitidos, desde cualquier sitio.
- Emitir un documento sin su registro.
- Un «modo formación» que imprima documentos con apariencia real en producción. Las pruebas van en el entorno de pruebas, y sus documentos llevan `PRUEBA · SIN VALIDEZ` visible.
- Informes que excluyan ventas, o cualquier forma de llevar una facturación paralela. Eso es software de doble uso.
- Reabrir una mesa cobrada para cambiar lo cobrado.
- Que Fogón emita, anule o corrija un documento, ni que lo ofrezca como acción de un toque.

## 4.13 Conservación y baja

- En modalidad VERI*FACTU **no hay obligación de conservar los registros**, porque ya están en la AEAT. Aun así, **Estook conserva sus documentos** el plazo legal —cuatro años a efectos fiscales— porque son del restaurante y los necesita.
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

- **Formas de pago:** efectivo (con entregado y cambio), tarjeta en el datáfono del local —el camarero confirma que se cobró— y mixto.
- **Propinas.** La de tarjeta la gestiona el datáfono y **Estook no la toca**. La de efectivo se puede apuntar como **entrada de caja con motivo «propina»**, que es lo que hace falta para que el arqueo cuadre y para repartirla al cierre. **La propina no va en el ticket ni se manda a Hacienda como parte de la venta** [VERIFICAR con el asesor].
- **Dividir la cuenta:** por comensal, por platos o a partes iguales. **Cada cobro genera su propio ticket** con lo que paga esa persona.
- **Invitaciones y descuentos:** con permiso y motivo (Roles 1.12). Una invitación descuenta género y cuenta como consumo interno, no como merma (regla del Manifiesto, capítulo 28).
- **Si la emisión falla, la mesa no se cierra.** Nunca hay una mesa cobrada sin ticket ni justificante.
- **Al emitir:** se imprime el ticket, se lanza `venta.cerrada` hacia M20 y la mesa queda libre.

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

**La caja es una vista de Servicio · Jornada**, donde ya vive el cierre. Apertura con fondo, entradas y salidas con motivo, arqueo con lo contado frente a lo esperado, y el descuadre guardado sin bloquear. El **cierre de caja de M6½ se rellena solo**, con origen «TPV de Estook» y su fiabilidad máxima.

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
        COLA DE IMPRESION (Supabase)
        trabajo: local, impresora, contenido, estado
                 ↓
   ┌─────────────┼─────────────┬──────────────┐
   ▼             ▼             ▼              ▼
ESTOOK        ESTOOK        IMPRESORA      CORREO
ENLACE        TPV (app)     QUE PREGUNTA   (PDF)
   │             │             │
ESC/POS       ESC/POS       ella sola
TCP · USB     TCP · BT      por HTTPS
   │             │             │
   ▼             ▼             ▼
CUALQUIER     CUALQUIER      Star / Epson
IMPRESORA     IMPRESORA      compatibles
```

### Vía 1 · Estook Enlace · **la principal**

Un programa pequeño instalado en el local que **lee la cola por HTTPS y habla ESC/POS con las impresoras de la red**. Ya está previsto en el proyecto (M19, servicio en Rust) para traer los datos del TPV; aquí gana un segundo trabajo. **Su parte de impresión se construye en M19a, antes de la sala y la cocina**, porque sin ella M20A no sirve de nada.

- **Vale cualquier impresora ESC/POS**: Epson, Star, Bixolon, HPRT, Citizen, las genéricas chinas, y las de impacto de cocina. Por red, por USB o por Bluetooth.
- Imprime **en silencio**, sin cuadros de diálogo.
- **Funciona con todas las tablets apagadas**, que es el requisito de cocina.
- Si se va internet, **sigue imprimiendo lo que tenga en cola** y se pone al día al volver.
- No hace falta un ordenador caro: vale un mini PC o una Raspberry Pi de unos 50 €. **Se compila también para Linux y para Mac**, no solo para Windows.

### Vía 2 · La app de Estook en la tablet

**Y aquí está la respuesta a «¿web o nativo?»: no hay que elegir.** La aplicación sigue siendo la web que ya está construida, y para las tablets y móviles del local se envuelve en una cáscara nativa —Capacitor— que se publica en Google Play y en la App Store.

Dentro de la cáscara, la web es exactamente la misma. Lo que la cáscara añade es lo que un navegador no puede dar:

- **Abrir sockets TCP** y hablar ESC/POS con cualquier impresora de la red o por Bluetooth. Hay plugins y librerías maduras para esto.
- Modo quiosco, para que un empleado no se salga de la app.
- Bloquear el apagado de pantalla durante el servicio.
- Avisos con sonido aunque la app esté en segundo plano.
- Cámara y lector de códigos de verdad.

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

| Lo que tiene el local        | Lo que se le pone                                                   |
| ---------------------------- | ------------------------------------------------------------------- |
| Ya tiene impresoras y un PC  | **Estook Enlace.** No compra nada                                   |
| Ya tiene impresoras, sin PC  | Estook Enlace en una Raspberry (~50 €), o la app en una tablet fija |
| No tiene nada y abre de cero | Pantalla de cocina, y una impresora que pregunta sola para la caja  |
| Food truck, barra pequeña    | La app en la tablet, imprimiendo directamente                       |
| Varios locales               | Estook Enlace en cada uno, gestionados desde el panel de cadena     |

**Ningún local se queda fuera**, y en la web pública no se promete una marca: se dice «funciona con tu impresora».

## 6.5 Cómo se construye

**La cola.** `impresion_trabajos`: local, impresora, tipo (`comanda`, `ticket`, `precuenta`, `informe`), **contenido ya compuesto por el servidor**, estado (`pendiente`, `entregado`, `impreso`, `error`), intentos y momento de cada paso. Un trabajo por documento, con identificador único.

**El contenido se compone en el servidor, una sola vez, y en un formato intermedio propio** —líneas, alineación, tamaño, negrita, corte, cajón—, no en ESC/POS crudo. Cada agente lo traduce a lo que entiende su impresora. Así una impresora nueva es un traductor nuevo, y no se toca nada más. Es la misma regla de los documentos del Manifiesto: reimprimir da exactamente lo mismo.

**Cómo lee cada agente la cola:**

- **Estook Enlace y la app:** se suscriben en tiempo real a la cola (Realtime de Supabase), con una consulta periódica de seguridad por si se pierde un aviso. Confirman cada trabajo.
- **Impresora que pregunta sola:** una Edge Function con los tres métodos de su protocolo —pregunta, recogida y confirmación—, con un identificador largo e irrepetible por impresora y autenticación básica. **La dirección de una impresora es un secreto.**

**Reintentos.** Un trabajo `entregado` que no se confirma en un tiempo razonable vuelve a `pendiente`, con un límite de intentos para no imprimir la misma comanda quince veces.

**Varias impresoras.** Cada plato lleva **a qué impresora va**, heredado de su sección de carta. Una comanda que toca cocina y barra genera **dos trabajos**, cada uno con lo suyo.

**Ajustes › Impresoras.** Dar de alta, ver el estado y cuándo se supo de ella por última vez, y un botón de **imprimir prueba**. Sin ese botón, configurar una impresora es adivinar.

## 6.6 Térmica o de impacto

El papel térmico es sensible al calor, a la luz y a la humedad, así que en una cocina con vapor una comanda térmica puede volverse ilegible.

- **Para la comanda** da igual en la práctica: vive minutos. Y la térmica es silenciosa y rápida, que en cocina se agradece.
- **Si el local usa impacto** (la clásica Epson TM-U220), va por Estook Enlace o por la app: ESC/POS es ESC/POS. Es una razón más para que la vía principal sea el agente y no una impresora concreta.
- **Para el ticket de caja**, térmica siempre.

## 6.7 Reglas

1. **El ticket se emite antes de imprimirse.** Si la impresión falla, el documento ya existe con su número: se reimprime o se manda por correo, y **nunca se vuelve a emitir**.
2. **Reimprimir es reimprimir.** Sale marcado como copia y no genera ningún registro fiscal nuevo.
3. **La comanda no es un documento fiscal.** Sin numeración de serie, sin QR, sin leyenda.
4. **La impresión no bloquea el servicio.** Ni mandar a cocina ni cobrar esperan a que salga el papel.
5. **Si la cocina lleva un rato sin imprimir, se avisa** en la sala y en el Panel. Y si hay pantalla de cocina, ahí se sigue viendo todo.
6. **El núcleo no conoce ninguna marca.** Solo deja trabajos en la cola.

## 6.8 Qué hay que probar

- La misma comanda sale igual por **Enlace, por la app y por una impresora que pregunta sola**. Es la prueba de que el formato intermedio funciona.
- Mandar a cocina y cronometrar: **menos de 6 segundos**.
- Apagar la impresora, mandar tres comandas y encenderla: salen las tres, en orden y sin repetirse.
- Cortar internet con Enlace instalado: **la cocina sigue imprimiendo**.
- Quitar el papel: Estook lo avisa antes de que nadie lo mire.
- Una comanda con platos de cocina y de barra: dos trabajos.
- Reimprimir un ticket: idéntico, marcado como copia, sin registro nuevo.
- Con todas las tablets apagadas, una comanda lanzada desde otro sitio se imprime igual.
- La dirección de una impresora **no aparece** en el cliente ni en ningún registro.
- Al menos **tres marcas distintas** de impresora, una de ellas de impacto.

# 7 · Modelo de datos

Orientativo: **manda el esquema real**. Todo lleva `local_id`, con RLS escrita contra `locales_visibles` (M1). Dinero en **céntimos enteros**, cantidades con cuatro decimales, fechas en `timestamptz` y la jornada calculada por el servidor con el corte del local.

> **Regla al leer este capítulo.** Si algo del capítulo 3, 5 o 6 no tiene dónde guardarse aquí, **el que está mal es este capítulo**. Antes de construir se comprueban los dos contra el esquema real.

## 7.1 Sala (esquema `public`)

- `zonas_sala` — nombre, orden, canal por defecto (M10)
- `mesas` — zona, nombre, plazas, posición en el plano
- `cuentas` — **tipo** (`mesa`, `barra`, `para_llevar`), mesa si la tiene, **nombre o número de recogida** si es para llevar, estado, camarero **actual**, comensales, canal, apertura, cierre
- `cuenta_alergenos` — cuenta, alérgeno, quién lo marcó y cuándo
- `cuenta_lineas` — plato, cantidad, precio, tipo de IVA, extras y modificadores, nota, **comensal** (número o nulo), **tanda**, **partida** (copiada al mandar, no leída después), estado (`pedida`, `en cocina`, `lista`, `servida`, `quitada`), y autor y motivo si se quita
- `cuenta_traspasos` — cuenta, de quién, a quién, cuándo, quién lo hizo

**Por qué `partida` se copia en la línea y no se lee del plato:** si mañana el plato cambia de partida, la comanda de ayer tiene que seguir contando lo que pasó de verdad. Es la misma regla que congela el precio y el coste.

## 7.2 Cocina (esquema `public`)

- `partidas` — nombre, orden en el pase, color. Sembradas por tipo de local
- `cocina_pantallas` — nombre, **qué partidas enseña**, si es **pantalla de pase**, aparato emparejado
- `cocina_tandas` — cuenta, número de tanda, estado (`pendiente`, `marchada`, `en cocina`, `lista`, `servida`), **cuándo se marchó y quién**
- `cuenta_lineas` gana los tiempos: `mandada_at`, `marchada_at`, `lista_at`, `servida_at`, **quién la marcó lista** y, si se deshizo, **quién y cuándo**
- `tiempos_objetivo` — por local y, si se quiere, por plato: los minutos de cada tramo del semáforo

**El contador del día por plato no se guarda:** es una consulta sobre `cuenta_lineas` de la jornada. Guardarlo sería una segunda fuente de verdad.

## 7.3 Cobro y caja (esquema `public`)

- `cobros` — cuenta, importe, forma de pago, entregado, cambio, **qué líneas o qué comensales paga**, `documento_id`, `justificante_id`
- `caja_sesiones` — local, apertura con su fondo, arqueo, cierre, descuadre
- `caja_movimientos` — sesión, tipo, importe, motivo, autor

## 7.4 Impresión (esquema `public`)

- `impresoras` — local, nombre, **agente** (`enlace`, `app`, `pregunta_sola`), dirección o identificador, ancho de papel, **partidas que imprime**, activa, último contacto, **último estado que mandó**
- `impresion_trabajos` — local, impresora, tipo (`comanda`, `ticket`, `precuenta`, `informe`), **contenido ya compuesto en el formato intermedio**, estado (`pendiente`, `entregado`, `impreso`, `error`), intentos, momentos de cada paso, referencia a lo que lo originó
- **Identificador único por trabajo**, que es lo que hace que un reintento no imprima dos veces

## 7.5 Facturación (esquema `facturacion`, solo inserción)

- `obligados` — NIF, razón social, domicilio, régimen, referencia a la clave en Vault, estado de la representación con quién firmó y cuándo, estado del alta
- `series` — obligado, local, tipo, prefijo, ejercicio, último número
- `documentos` — obligado, serie, número, tipo, fecha de expedición, fecha de operación, destinatario si lo hay, base, cuota, total, **copia congelada de las líneas**, `sustituye_a` (F3), `rectifica_a` (R), referencia al cobro, `uuid` del proveedor, QR, huella
- `registros` — documento, tipo, estado ante la AEAT, respuesta, momento
- `webhooks_recibidos` — `X-Webhook-Id` único, contenido, procesado
- `justificantes_provisionales` — cobro, contenido, documento emitido después

## 7.6 Enlace con el resto de Estook

- Al emitir un ticket se crea la `venta` de M20 con `origen = 'estook_tpv'` e `id_externo = serie + número`.
- Una rectificativa por devolución genera la anulación de stock correspondiente.
- **Un canje F3 no toca el stock.**
- Los tiempos de `cuenta_lineas` alimentan la ficha de M9 y la analítica de M21 **por consulta**, sin copiarse.
- Un plato marcado agotado escribe en donde ya vive el agotado de M10, no en una tabla nueva.

## 7.7 Lo que este modelo hace posible, comprobado uno a uno

Cada promesa del producto, con el sitio donde se guarda. **Si alguna se queda sin fila, el modelo está mal.**

| Lo que promete el producto           | Dónde vive                                   |
| ------------------------------------ | -------------------------------------------- |
| Dividir la cuenta por comensal       | `cuenta_lineas.comensal` + `cobros.qué paga` |
| Vender en barra sin abrir mesa       | `cuentas.tipo`                               |
| Para llevar con nombre de recogida   | `cuentas.tipo` y su nombre                   |
| Aviso de alergia de la mesa          | `cuenta_alergenos`                           |
| Mandar por tandas y marchar          | `cuenta_lineas.tanda` + `cocina_tandas`      |
| Cada partida ve lo suyo              | `cuenta_lineas.partida` + `cocina_pantallas` |
| Pantalla de pase                     | `cocina_pantallas.es_pase`                   |
| Semáforo con los minutos del local   | `tiempos_objetivo`                           |
| Deshacer un plato marcado            | los tiempos y el autor de `cuenta_lineas`    |
| Contador del día por plato           | consulta, no se guarda                       |
| Traspasar una mesa de camarero       | `cuentas.camarero` + `cuenta_traspasos`      |
| Tiempo real de cocina hacia la ficha | los tiempos de `cuenta_lineas`               |
| Imprimir en cualquier impresora      | `impresoras.agente` + formato intermedio     |
| Reimprimir idéntico                  | `impresion_trabajos.contenido` congelado     |
| Un reintento no duplica              | identificador único del trabajo              |
| Ticket con su QR y su estado         | `documentos` + `registros`                   |
| Cobrar sin conexión                  | `justificantes_provisionales`                |
| Corregir sin tocar lo emitido        | `sustituye_a` y `rectifica_a`                |

---

# 8 · Pruebas obligatorias

Todas automáticas, contra el entorno de pruebas. Cada una se rompe a propósito antes de darla por buena (E4 del Plan).

**Aislamiento**

1. `UPDATE` y `DELETE` sobre `facturacion.documentos` fallan con todos los roles, incluido el de servicio.
2. El panel interno no consigue modificar un documento llamando a la API a pelo.
3. Las claves del proveedor no aparecen en el cliente, ni en los registros, ni en un error.

**Numeración y cadena**

4. Cien cobros simultáneos desde cinco aparatos del mismo NIF: numeración correlativa, sin huecos ni duplicados.
5. Un 400 del proveedor no consume número.
6. Dos NIF cobrando a la vez: no se mezclan series ni claves.

**Documentos**

7. Ticket con dos tipos de IVA: dos líneas de desglose, y la suma cuadra al céntimo.
8. Canje F3: importe igual al ticket, ticket marcado como canjeado, segundo canje bloqueado, ticket original intacto.
9. Devolución con R5 en su serie, con su registro, con salida de caja.
10. Anulación solo disponible para el rol que puede y con motivo.

**Fallos**

11. Caída del proveedor durante 30 minutos: se cobra con justificante y al volver salen los tickets en orden y con incidencia.
12. Rechazo simulado de la AEAT: aparece en registros con error y se corrige sin tocar el original.
13. El mismo webhook dos veces no cambia nada.
14. Un registro que lleva más de una hora pendiente se consulta solo.
15. La impresora no responde: el ticket sigue emitido y se puede reimprimir.

**Reloj y regímenes**

16. Cobro a las 02:30: jornada del día anterior, fecha de expedición del día real.
17. Los dos cambios de hora del año, correctos.
18. Un local foral, en SII o de Canarias no puede activar el módulo, y la pantalla lo explica.

**De punta a punta**

19. Servicio completo de diez mesas, una dividida en tres, un pago mixto, una factura pedida y una devolución: caja, tickets, ventas e inventario cuadran al céntimo.
20. El QR impreso en 58 y en 80 mm se lee con la aplicación de la AEAT.

---

# 9 · Lo que tiene que estar antes de producción

1. Todas las pruebas del capítulo 8 **y las del apartado 3.7**, en verde.
2. Todos los **[VERIFICAR]** resueltos y escritos en `ESTADO.md`, con su fuente y su fecha.
3. **Declaración responsable de Estook** redactada por el asesor y publicada dentro de la app.
4. **Revisión escrita del asesor fiscal** sobre el planteamiento entero.
5. Suscripción de pago con el proveedor, con su NIF de producción dado de alta y su representación firmada.
6. Procedimiento de baja escrito, con la exportación de XML antes de cancelar nada.
7. Vía de impresión decidida y probada con impresoras reales.

**Hasta que las siete estén hechas, el módulo de facturación se queda desactivado.** Sala y cocina pueden estar en producción sin él: un comandero no factura.
