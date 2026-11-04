# 0126 · T6 · 1 · El alta de facturación: la empresa, las series, Verifacti y la autorización

**Fecha:** 4 de noviembre de 2026
**Estado:** construido en la rama `t6-la-facturacion`, con la migración **0099**. La API gana
**4 consultas y 16 comandos** (pasa a **119 consultas y 330 comandos**) y hay que desplegarla. La
base pasa a **153 tablas**, todas con seguridad por filas.
**Sigue:** la [0125](0125-t6-la-facturacion-las-tres-respuestas.md) (las tres respuestas de Richi)
y las maquetas de T6 ([`t6-la-facturacion.html`](../maquetas/t6-la-facturacion.html), secciones
1, 2 y 7), aprobadas el 2-nov.
**Cambia:** el Anexo (4.2, 4.3, 4.14 y 7), Roles (1.12), el plan de M20A, `config/claves.md` y ESTADO.
**Cambiada por la [0127](0127-con-verifactu-sin-envio-o-fuera.md)**, el mismo día: **el SII ya no para el alta**, sino que la empresa factura fuera de VERI\*FACTU; y cada empresa elige cómo factura. La API queda con **119 consultas y 331 comandos**.

## 1 · Lo que pidió Richi

El 4-nov, con la suscripción de pago de Verifacti hecha y su clave puesta en los secretos: «hazlo
perfecto», con la documentación de Verifacti y lo que exigen la ley y Hacienda. También contó que
todavía no es autónomo ni tiene sociedad: la creará antes de vender.

## 2 · De dónde sale cada cosa

- **La API de Verifacti, leída entera el 4-nov** en su documentación pública (la de NIF y la de
  facturas), con sus campos tal cual. No se ha escrito ningún campo de memoria. Lo que se usa está
  apuntado en `servidor/facturacion/verifacti.ts`.
- **Sus preguntas frecuentes**, que corrigen dos cosas de nuestro Anexo (abajo, puntos 1 y 2).
- **La ley**: lo mirado para la 0125 (`lo-investigado.md`, de A18 a A23) y el artículo 15 de la
  Orden HAC/1177/2024 para la declaración responsable.

## 3 · Lo que queda (esta entrega)

- **Ajustes › Facturación**, en Estook, para el gerente, la dirección y el administrador de cuenta
  (Roles 1.12, permiso nuevo `accion.alta_de_facturacion`). Arriba, en una línea, cómo está («En
  pruebas», «Parada», «En real»); debajo, **los cinco pasos con lo que falta**, cada uno en su
  hoja, para dejarlo y seguir otro día.
- **Paso 1 · la empresa**. **El NIF se mira en Hacienda al escribirlo**: primero su forma y su
  letra, aquí mismo (DNI, NIE y CIF), y después Hacienda por Verifacti. Se guarda **con el nombre
  que tiene Hacienda**, que es el que sale en cada ticket. **La provincia sale del código postal**.
  El segundo local de una empresa la elige sin escribir nada. Se elige quién la autoriza ante
  Hacienda.
- **Paso 2 · dónde tributa**. El territorio no se pregunta: es el del local. Se preguntan el SII y
  si el domicilio fiscal es foral, **con la respuesta marcada por el código postal**. País Vasco,
  Navarra, el SII, Ceuta y Melilla **paran el alta, cada uno con su motivo verdadero** y si es un
  «todavía no». Canarias sigue, con IGIC.
- **Paso 3 · las series**. Se proponen con las siglas del local (`T-IKA`, `F-IKA`, `R-IKA`) y se
  enseña el primer número («T-IKA-2026-000001»). Tienen que ser distintas, y ninguna puede usarla
  otro local de la misma empresa. Se pregunta si el local ya factura con otro programa.
- **Paso 4 · el alta en Verifacti**, que se hace sola, **en su entorno de pruebas**. Si ya estaba
  dada de alta (otro local, un reintento), no se repite.
- **Paso 5 · la autorización ante Hacienda**, **que solo empieza su titular**. Una persona firma en
  línea con su DNI o pasaporte (el enlace se le enseña y le llega al correo). Una sociedad descarga
  el modelo ya relleno, lo firma con el certificado de su representante y lo sube. Sus seis
  estados, a la vista, con quién firmó y cuándo.
- **«Pide tu factura»**, encendido de fábrica, que el local puede apagar. El QR del ticket sale con
  el cobro (T7).
- **La declaración responsable de Estook**, en Ajustes › Facturación y en los Ajustes de Estook TPV,
  que la ve cualquiera que esté en la caja, y en PDF. **Es un borrador, y lo dice**, hasta que el
  asesor escriba el texto y se firme.
- **En el admin, Facturación**: probar la conexión con Verifacti; **las once condiciones**, cada
  una con dónde está su prueba; **quién produce Estook**, para la declaración; **la empresa de
  pruebas de Verifacti** en un local de una cuenta de la casa; y las empresas de todos, con
  **«Pasar a real», cerrado mientras falte una condición**.

**Lo que no está y es a propósito**: emitir, el papel y la lista de tickets y facturas son T6 · 2.
«Imprimir un ticket de prueba», que dibujaba la maqueta en Ajustes, va con T6 · 2, porque necesita
emitir.

## 4 · Lo que decidió la IA al construirlo

1. **La clave de cada NIF no se guarda en Estook** (cambia el Anexo 4.2, que decía Vault). Se le pide
   a Verifacti cada vez que hace falta con la clave de la cuenta, y se recuerda una hora como mucho.
   Así no hay ninguna clave en la base que alguien se pueda llevar, y si se rota en Verifacti no se
   queda una vieja guardada. Lo único guardado es `VERIFACTI_CLAVE_DE_CUENTA`, en los secretos.
2. **En los registros va la identificación de Verifacti, no la de Estook** (corrige el Anexo 4.14).
   Lo dicen sus preguntas frecuentes: en producción, el sistema que figura en cada registro es el
   suyo (Bilbabit SL, «bilbabit», A1). Por eso la declaración de Estook pone a Verifacti como
   componente externo **con la versión que da su API en ese momento**. La versión de Estook sale
   de un solo sitio (`servidor/facturacion/sistema.ts`), y una prueba mira que la declaración diga
   eso. Antes, la regla era que «la versión que se declara viaje en cada registro», y eso con
   Verifacti no es posible.
3. **Los datos de quien produce Estook no van en el código**, que es público: se escriben en el
   admin. Hoy no hay ninguno (Richi todavía no tiene sociedad), y la declaración sale como borrador
   con «Sin rellenar».
4. **El código de Estook en la declaración es «ES», versión 1.0**: lo elige el productor y lo
   confirma el asesor. No viaja en ningún registro. La versión sube cuando cambia la parte fiscal.
5. **La empresa y las series solo se escriben con las funciones del alta** (8 con privilegio en
   `estook` y 1 en `facturacion`), que miran el permiso y el paso. A la API se le quita a mano la
   escritura que da `estook` a toda tabla nueva. Las series **solo se insertan**: cambiarlas es una
   fila más, y el disparador rechaza cambiar, borrar y vaciar, también a la dueña de la base.
6. **Un NIF, una empresa en todo Estook** (índice único). La empresa de pruebas, que es compartida,
   no cuenta. **El NIF de una empresa ya dada de alta en Verifacti no se cambia**: es otra empresa.
7. **Un paso no se salta**, y lo mira el servidor, no la pantalla: sin las series no hay alta en
   Verifacti, y sin el alta no hay firma.
8. **Antes de pedir otra firma en línea, se mira si hay una en curso**, porque cada una le cuesta a
   Estook 2,90 € + IVA. Si Verifacti dice que ya hay una, se recupera su enlace. El enlace no se
   guarda en ningún sitio, y solo se le enseña al titular.
9. **«Pasar a real» mira las once antes de llamar a Verifacti**, porque dar de alta un NIF en
   producción se cobra. Con las once y la empresa terminada, lo da de alta en producción y la
   marca en real. La autorización ya vale, porque Verifacti la pide una vez por NIF.
10. **La empresa de pruebas solo va en una cuenta de la casa** (IKATZ lo es desde la 0047), con sus
    datos y su autorización leídos de Verifacti.
11. **Cada paso deja su línea en la auditoría**, que solo crece: quién, qué y cuándo. A la del admin
    no va el NIF del productor, que es un dato personal. En la lista de empresas del admin, el NIF
    de una persona sale tapado («•••••678Z»).
12. **Quién puede ser titular**: alguien que puede hacer el alta en ese local. La base lo vuelve a
    mirar.
13. **Las siglas del local para las series**: las tres primeras letras si es una palabra, o las
    iniciales si son varias («Bar Centro», `T-BC`), sin rellenar con letras de más.
14. **Si Verifacti no contesta, no se apunta nada** y se dice en castellano. Lo que contestó va al
    registro de fallos, nunca a la pantalla.

## 5 · Lo que tiene que hacer Richi

Fusionar, migrar la **0099** (99 de 99), desplegar la API y probarlo en IKATZ, con
[sus pasos](../pasos-de-t6-1.md).
