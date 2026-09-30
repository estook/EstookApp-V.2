# 0057 · Quién es quién: la persona sin correo, el terminal, el operador y la aprobación

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)). La
persona sin correo se construye **con H**; lo demás, en M20A.
**Completa:** el Anexo 3.4 (el terminal es del local, decidido el 23-sep) y la
[0034](0034-nadie-gestiona-a-su-igual.md) (quién gestiona a quién).
**Resuelve** una contradicción: el Manifiesto decía «el PIN identifica, no firma» y el
Anexo, «cada acción va firmada con el PIN».
**Cambia:** el Anexo (3.4 y 7), Roles (1.12), el Manifiesto (16, 17, 28 y 31), la
Auditoría de flujos y la [Arquitectura](../maestros/Estook-Arquitectura.md).

## Lo que pasó

La auditoría separó seis cosas que se tienden a mezclar: **persona, empleado, usuario,
aparato, terminal y caja**, y comprobó cada una contra el esquema real. Encontró dos
huecos:

1. **Una persona no puede existir sin correo** (`estook.persona.correo` es obligatorio,
   invitar lo exige y entrar con PIN también lo pide). En hostelería hay extras,
   ayudantes y friegaplatos que no tienen correo o no lo quieren dar. Hoy no pueden
   fichar, y mañana no podrían cobrar.
2. **El terminal compartido estaba decidido a medias.** Faltaba quién lo está usando
   ahora, cuándo se bloquea, cómo aprueba un encargado y qué pasa al reiniciar.

Richi contestó: **sí a los trabajadores sin correo**, con nombre y PIN.

## Lo que se decide

### 1 · La persona sin correo

- **El correo pasa a ser opcional.** Se da de alta a alguien con su nombre y se le da
  un PIN en mano, como hoy.
- **Sin correo entra solo en los terminales del local**, con su PIN. No puede entrar en
  un móvil propio ni en el ordenador, porque para eso hace falta demostrar quién es con
  algo suyo (correo y contraseña, o Google).
- **Ficha igual, trabaja igual y sale igual en el cuadrante y en el registro horario.**
- **Si un día da su correo**, se le añade y sigue siendo la misma persona, con su
  historia. Si ese correo ya es de otra persona de Estook, no se unen solas: se avisa, y
  unir dos personas lo hace quien lleva el local con confirmación. Se detalla en H.
- «Un correo, una identidad» sigue valiendo **cuando hay correo**.

### 2 · El terminal y su operador

| Pieza                  | Qué es                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Terminal**           | El aparato del local: nombre, función (sala, barra, cocina, pase o fichar) y su propia sesión, revocable |
| **Operador**           | La persona que lo usa ahora. Entra tecleando **solo su PIN**, sin correo                                 |
| **Turno del operador** | Desde que entra hasta que se bloquea o entra otro. Todo lo que hace queda a su nombre                    |

- **Solo el PIN, porque el terminal ya sabe de qué local es.** La sal del PIN es del
  local y el PIN es único dentro de él (migración `0018`): se encuentra a la persona con un solo
  cálculo. Estaba pensado para esto.
- **Se bloquea solo:** tras un minuto sin tocar (lo cambia el local) y, si el local lo
  quiere, **al mandar o al cobrar**. Bloqueado enseña el teclado del PIN, y el siguiente
  entra en un segundo.
- **La pantalla de cocina no tiene operador.** Marcar un plato listo queda a nombre del
  terminal; lo que es de un jefe (desmarcar fuera de plazo, salir del modo) pide su PIN.
- **Al reiniciar o cerrar**, el terminal vuelve a su función, bloqueado, con lo pendiente
  de subir intacto.
- **Fichar y entrar al TPV son el mismo PIN.** Si quien entra no ha fichado, se le ofrece
  fichar en un toque. Y el local puede pedir que **solo quien está fichado use el TPV**
  (apagado de fábrica): Toast lo tiene, y en Estook sale solo porque los fichajes ya
  están dentro.
- **Más adelante**, la llave o tarjeta de camarero: los lectores USB escriben como un
  teclado y el navegador ya los lee.

### 3 · La aprobación de un encargado, una sola pieza para todo

Hasta ahora cada operación declaraba **un** permiso (`exige`). El TPV pide tres cosas
más, y se construyen **una vez, en el despachador**, declaradas en cada operación igual
que hoy `exige`:

| Qué             | Cómo se declara                           | Ejemplo                                                                       |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| **Aprobación**  | «esto lo aprueba alguien con tal permiso» | Quitar un plato ya en cocina: lo pide el camarero, aprueba un jefe con su PIN |
| **Límite**      | «hasta tanto sin aprobación»              | Descuento hasta un 10 % el jefe de sala; más, el gerente                      |
| **Solo lo mío** | «solo sobre lo que es tuyo»               | El camarero ve sus tickets y su informe X del turno                           |

- **Una aprobación sirve para una cosa, una vez**, y caduca en dos minutos. Queda quién
  lo pidió, quién lo aprobó, qué, con qué motivo y desde qué terminal.
- La pantalla lee lo mismo que el servidor, así que el botón dice «lo aprueba un
  encargado» antes de tocarlo, no después de fallar.
- **«Solo lo mío» se cumple en la base** (en sus políticas), no en la pantalla.

### 4 · Lo que se hace con PIN

Queda escrito así, en el Manifiesto y en el Anexo: **lo que se hace con PIN queda a
nombre de esa persona, con la hora y el aparato.** No es una firma electrónica: es
identificarse en un aparato del local. El APPCC y el cierre del día «se firman con PIN»
en ese mismo sentido.

### 5 · Sin conexión

- Guardar las huellas de los PIN en una tablet **no es seguro**: con la huella delante,
  un PIN de seis cifras se saca probando en minutos.
- **Sin nube, los PIN los comprueba Link**, que guarda las del local cifradas y solo
  para las operaciones del servicio.
- **Sin nube y sin Link**, solo pueden seguir quienes ya entraron ese día en ese
  terminal. Nadie nuevo entra hasta que vuelve la conexión.
- Todo lo hecho sin conexión sube con su autor y su hora, y queda en la auditoría.

Se revisa con pruebas de seguridad al construir M19a.

## Lo que no se toca

- La **membresía** (persona + alcance + rol) y la matriz de permisos en la base.
- **Nadie gestiona a su igual** (0034).
- La **sesión personal** de M4 (contraseña, PIN con correo, Google, segundo factor): el
  terminal es una pieza aparte, como decidió el Anexo 3.4.
