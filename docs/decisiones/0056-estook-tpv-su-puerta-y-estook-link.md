# 0056 · Estook TPV con su puerta, y Estook Link como centro del local

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)). **Solo
documentos**: se construye en M19a y M20A.
**Sustituye:** de la [0054](0054-estook-tpv-y-uber-eats-comprobado.md), «Estook TPV es un
nombre, no una aplicación», y de A5 del Plan 1.3, «Sala y Cocina son modos de
`apps/app`». Y el nombre **Estook Enlace**, que pasa a ser **Estook Link**.
**Cambia:** el Anexo (capítulos 2, 3, 6 y 10), el Plan (A5 pasa a la Arquitectura, M19 y
M20A), el Manifiesto (capítulos 1, 2, 17, 24, 29 y 34) y la
[Arquitectura](../maestros/Estook-Arquitectura.md), que nace con esto.

## Lo que pasó

La auditoría encontró que **la cocina «sin internet» estaba diseñada de una forma que
no podía funcionar**: cada comanda iba a una cola en la nube y Estook Enlace la recogía
de la nube. Si se cae internet, la tablet no puede dejar la comanda en esa cola, Enlace
no se entera y la impresora de cocina no imprime. Además, la app no tenía todavía
ninguna pieza para trabajar sin conexión: solo el manifiesto de instalación.

Y que el argumento de A5 contra separar el TPV —«duplicaría sesión, permisos, datos y
diseño»— vale para **otra aplicación de producto**, no para **otra puerta del mismo
código**: la sesión, los permisos y los datos viven en el servidor, y el diseño y los
cálculos en los paquetes compartidos.

Richi contestó a las dos preguntas: **puerta propia** y **«Estook Link»**, el nombre de
su documento («Estook gestiona, TPV opera, Link conecta, Fogón entiende»).

## Lo que se decide

### 1 · Estook TPV es una puerta propia del mismo código

- Vive en **`apps/tpv`**, en el mismo repositorio, y se publica en **`estook.com/tpv/`**.
- **Comparte todo lo que importa**: la API, la base, el login y el PIN, los permisos, y
  los paquetes `ui`, `dominio`, `permisos`, `cliente-api` y `utiles`. **No duplica ni
  una regla, ni una tabla, ni un botón.** Un cálculo sigue teniendo un solo dueño.
- **Gana lo que un TPV necesita y la gestión no**: se instala aparte con su icono
  «Estook TPV»; arranca a pantalla completa y en la función del terminal; trabaja **sin
  conexión** (su propio _service worker_ y su copia de trabajo en el aparato); y **se
  actualiza cuando lo decide el local**, nunca en mitad de un servicio.
- **Estook** (`apps/app`) sigue como está, con conexión. Lo que en Servicio es de
  consulta —la caja de cada día, los tickets y facturas— sigue ahí, para quien lleva el
  local: son las mismas operaciones, llamadas desde otra pantalla.
- **Un móvil personal** abre Estook TPV desde Estook con un botón: es el mismo dominio,
  así que la sesión es la misma y no se vuelve a entrar.
- **La cáscara nativa** (`apps/movil`, Capacitor) envuelve a Estook TPV y es opcional.
  Hace falta en **iPad**, porque Safari no deja hablar con la red del local, y en el
  food truck sin Link, para imprimir directamente.
- El **modo cocina** de Estook (letra grande, sin importes, para leer fichas) no es la
  **pantalla de cocina** de Estook TPV. Son dos cosas y se llaman distinto.

### 2 · Estook Link es el centro del local

El programa que se instala en el local se llama **Estook Link**, y hace de centro:

| Trabajo                        | Qué hace                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Relevo sin internet**        | Recibe las comandas de los terminales por la red del local y las reparte a las pantallas de cocina |
| **Impresión**                  | Habla ESC/POS con cualquier impresora, por red, USB o Bluetooth, y abre el cajón                   |
| **Cola**                       | Guarda en orden todo lo que no ha podido subir, y lo sube al volver internet                       |
| **PIN sin conexión**           | Comprueba el PIN de quien entra en un terminal cuando no hay nube (0057)                           |
| **Reloj**                      | Da a los terminales una hora fiable cuando no hay nube                                             |
| **Conector de un TPV externo** | Vigila la carpeta del TPV de otro fabricante (M19b), para quien no cobra con Estook                |

- **Escucha solo en la red del local, y solo a terminales emparejados.** Nunca abre un
  puerto hacia internet: hacia fuera sigue saliendo él, cifrado.
- **Cómo lo encuentran los terminales:** Link le dice a la nube en qué dirección de la
  red del local está; el terminal lo aprende mientras hay conexión y lo guarda.
- **Cómo le habla el navegador:** Chrome y Edge lo permiten con el permiso de **acceso a
  la red local**, que se da una vez por terminal y que un administrador puede dejar dado
  en los aparatos del local ([Chrome, Local Network Access](https://developer.chrome.com/blog/local-network-access)).
  En iPad, con la cáscara.
- **Dónde se instala:** en el PC del TPV, en un mini PC o en una Raspberry. Rust,
  firmado, para Windows, Linux y macOS, como ya decía M19.
- **Sin Link también se trabaja**, con menos: cada terminal guarda su cola, la sala ve
  en grande que la cocina no está recibiendo, y se imprime solo desde la cáscara.

Es lo que hacen los que funcionan sin internet: Toast con un aparato del local que hace
de centro ([su documentación](https://doc.toasttab.com/doc/platformguide/platformOfflineModeLocalSync.html)),
y Revo con su «iPad Host» ([su soporte](https://support.revo.works/es/articles/722)).
Food&Service, en cambio, exige internet siempre. **Y Estook lo mejora en una cosa:** con
Toast, sin internet, un TPV no ve las comandas de otro, solo la cocina; con Link los
terminales del local siguen viéndose entre sí.

### 3 · Qué funciona sin conexión

| Funciona                                                         | No funciona (todavía)                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Tomar nota, mandar y marchar, marcar listo, precuenta            | Emitir el ticket: se entrega un justificante y el ticket sale al volver (0059) |
| Cobrar en efectivo o con el datáfono del banco, con justificante | La factura a petición, las rectificativas y las anulaciones                    |
| Abrir el cajón, el informe X                                     | Cambiar la carta o los precios, dar de alta a alguien                          |
| Imprimir comandas y justificantes (con Link)                     | El datáfono conectado y los pedidos de reparto                                 |
| Fichar y apuntar mermas (la cola del aparato)                    | El informe Z definitivo, que espera a que todo haya subido                     |

**Lo que lo hace posible:** identificadores creados en el aparato (reintentar no
duplica), la cola del aparato con sus estados, la idempotencia de la API (ya existe),
reglas de conflicto sencillas (a una cuenta se le **añaden** líneas, nunca se
sobreescriben; los cambios de estado llevan versión) y la hora del servidor estimada por
el aparato (ya diseñada en la mejora 15).

### 4 · Las actualizaciones de Estook TPV

- La versión nueva se descarga sola y **se aplica al cerrar la caja o sin cuentas
  abiertas**, o cuando alguien toca «Actualizar».
- Si una versión es incompatible con la API, la API lo dice y el TPV lo avisa antes de
  que nada falle.
- La versión de cada terminal se ve en Ajustes › Terminales y en el panel interno: es lo
  primero que pregunta soporte.

## Lo que no se toca

- **Un solo código, en web.** Sigue descartado reescribir en nativo o un TPV de
  escritorio aparte.
- **Los datos, los permisos y el diseño son los mismos.** La puerta cambia; lo de dentro
  no.
- **Lo fiscal no se mueve a Link** en la primera versión: el ticket lo sigue emitiendo
  la nube (0059). Que Link genere el registro sin internet es futuro y necesita al asesor.
