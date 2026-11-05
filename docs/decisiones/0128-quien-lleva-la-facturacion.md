# 0128 · Quién lleva la facturación, y la empresa de pruebas no se firma

**Fecha:** 5 de noviembre de 2026
**Estado:** construido en la rama `t6-1-quien-ve-la-facturacion`, con la migración **0100**
(sin migrar todavía).
**Sigue:** la [0126](0126-t6-1-el-alta-de-facturacion.md) (T6 · 1 · El alta) y la
[0127](0127-con-verifactu-sin-envio-o-fuera.md) (cómo factura).
**Cambia:** Roles (1.12), el catálogo de errores (tres nuevos y dos frases) y ESTADO.

## 1 · Lo que pidió Richi

El 5-nov, probando T6 · 1 en IKATZ: «la configuración de la facturación y los datos de la empresa,
la firma y todo, ¿es mejor solo en Estook o también en Estook TPV? Que esta info solo la vea la
cuenta que creó la cuenta de Estook, o que se pueda invitar a otra cuenta, como lo hagan los
mejores o como me recomiendes». Y mandó el PDF firmado con AutoFirma, que Verifacti rechazó con
«Certificado incorrecto».

## 2 · Dónde vive: en Estook, y en el TPV solo cómo va

**Se queda como está**, porque es lo que hacen los TPV grandes: lo fiscal se da de alta en la
oficina, en la web, y el TPV enseña cómo va. Estook TPV lo usa la plantilla con su PIN en un
aparato compartido. Ahí no deben estar el NIF, el domicilio fiscal ni un certificado para firmar.

- **En Estook, en Ajustes › Facturación:** el alta entera, en cinco pasos, y quién la lleva.
- **En Estook TPV, en Ajustes › Facturación** (desde la 0127): cómo va el alta, «Falta: … Se hace
  en Estook», y cómo factura el local, con su «i». También la declaración responsable, que la ley
  pide a mano de quien usa el programa.

## 3 · Quién la ve: la dirección, y a quien ella se la dé

Hasta aquí la traían puesta tres roles: la dirección, el administrador de cuenta y el gerente
(0099). **Desde la 0100, de fábrica solo la dirección.** Quien crea la cuenta nace dirección
(0038), y también la tiene quien entre después como dirección: es el propietario o un socio.

**La dirección se la da a quien quiera**, local a local, en una tarjeta nueva de Ajustes ›
Facturación: **«Quién la lleva»**. Ahí sale quien manda en ese local (administrador de cuenta,
area manager, gerente o gestoría) con un interruptor. Así lo hacen Square, Shopify y Holded: lo
fiscal es del propietario, y él lo comparte con cada persona.

- **Quien la recibe la ve y la cambia**, aquí y en Estook TPV. Es una acción, y una acción se
  puede o no se puede (0009): no hay «solo verla».
- **Firmar ante Hacienda sigue siendo solo del titular** (Roles 1.12, 0060), aunque la lleve otro.
- **Al titular no se le quita** mientras lo sea: antes se cambia en el paso 1.
- **Los demás no ven la tarjeta**: no saben ni a quién se le ha dado.
- **La sala, la cocina, el chef corporativo, compras central y RRHH no pueden recibirla**: no
  tienen nada que ver con Hacienda.

**Cómo se guarda:** como un **recorte de permiso** (0003), que nació justo para esto, «salvo que se
le dé expresamente». La política de los recortes (0008) deja escribirlos a quien invita personas.
Por eso, **un disparador de la 0100 no deja a la API poner el de la facturación si no es la
dirección**: un gerente que invita personas no puede dársela a sí mismo. Quitarla no se vigila,
porque cerrar una puerta nunca da nada.

**Las gerentes de ejemplo de la semilla** (Rosa, Pablo y Vera) la llevan como si su dirección se
la hubiera dado. Bar Centro y Casa Lola no tienen dirección sembrada, y Vera es la de las capturas:
así las pruebas y las capturas siguen como estaban.

## 4 · El certificado incorrecto: no era culpa de Richi, del todo

**Lo que pasó.** En AutoFirma, Richi eligió el único certificado que le ofrecía Windows. Su
titular y su emisor eran el mismo código (`58ed0be5-…`) y su uso, «Autenticación». Es un
certificado que crea Windows o algún programa para sí mismo. **No es un certificado reconocido**
(de la FNMT, el DNI electrónico u otra autoridad), y Hacienda no lo acepta: de ahí «Certificado
incorrecto». AutoFirma dice «firma correcta en cuanto a estructura», pero eso no dice nada de si el
certificado vale.

**Y el fallo era nuestro.** Lo que estaba firmando era **la autorización de BILBABIT SL**, la
empresa de pruebas de Verifacti: una sociedad real que no es nuestra. **Estook no debía dejar
firmar en su nombre**, ni a Richi ni a nadie. La 0126 ya decía que con la empresa de pruebas «el
alta en Verifacti y la autorización vienen hechas». Pero el paso 5 miraba lo que decía Verifacti,
y como no decía «correcta», lo pedía.

**El arreglo:**

- **Con la empresa de pruebas, el paso 5 no se pide.** Sale «La empresa de pruebas: no se firma»
  y el alta queda lista con las series (`comoVaLaFacturacion`).
- **El servidor no deja descargar, subir ni firmar en línea** con la empresa de pruebas
  (`empresa_de_pruebas`), y no llama a Verifacti.
- **Ni la base lo apunta**, aunque alguien se salte el servidor: `apuntar_la_autorizacion` para con
  la empresa de pruebas.
- **Lo que quedó apuntado en IKATZ** (la firma rechazada del 5-nov) se borra de la empresa. Sigue
  en la auditoría, que solo crece.
- **En el paso 5 de una sociedad**, un aviso dice **qué certificado vale**: el de representante de
  la sociedad o el DNI electrónico de su administrador. Y cómo se ve en AutoFirma uno que no vale.

**Lo que no se sabe todavía:** si Verifacti deja emitir con la empresa de pruebas sin una
representación hecha. Es la que da a todos para probar, así que lo normal es que sí. Se comprueba
con el primer ticket de pruebas en T6 · 2.

## 5 · Para cuando Richi dé de alta su empresa de verdad

- **Como persona física** (autónomo): «firmar en línea». Verifacti manda un enlace, y se firma con
  el DNI o el pasaporte y un vídeo corto, sin certificado (2,90 € + IVA).
- **Como sociedad**: el modelo relleno, firmado en AutoFirma con **el certificado de representante
  de la sociedad** (FNMT) o el DNI electrónico de quien la administra, y subido aquí.

## Lo que decidió la IA al construirlo

1. Pueden recibirla **el administrador de cuenta, el area manager, el gerente y la gestoría**. La
   gestoría porque el asesor fiscal hace a menudo estas altas.
2. **Solo la dirección la da.** Quien la recibe no puede dársela a otro: si no, se iría pasando de
   mano en mano sin que la dirección lo sepa.
3. **Se da local a local**, como todos los recortes. En una cadena, la dirección elige a quién en
   cada local.
4. Si alguien tiene varias membresías en ese local, el recorte va en **la más amplia**. Al
   quitarla, se quita de todas.
5. **El disparador vigila a todos menos a la dueña de la tabla**, que son las migraciones, las
   semillas y la función que ya mira que sea la dirección.
6. **La empresa de pruebas no se firma** aunque Verifacti no la dé por autorizada.
