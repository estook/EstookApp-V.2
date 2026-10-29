# Probar Estook TPV en el local de tu amigo, sin tocar nada suyo

> **Para qué es esto:** probar la caja para Windows (imprimir y el cajón) y seguir sin internet en el
> restaurante de tu amigo **sin estropear lo que ya tiene**: su TPV por wifi, la impresora de la
> caja por cable y las de cocina por wifi.

---

## Lo que Estook toca en su local, y lo que no

- **No cambia nada de sus aparatos.** No toca la configuración de las impresoras, del router ni de
  su TPV. Su TPV sigue imprimiendo como siempre.
- **«Buscar impresoras» no imprime nada.** Solo mira qué aparatos de la red escuchan donde escucha
  una impresora, y cuelga. A los que no has elegido **no se les manda ni un byte**: así una
  impresora de oficina no saca hojas raras. El nombre lo lee de su página web, que solo se mira.
- **Solo imprime en las impresoras que tú das de alta**, y solo lo que se pide desde Estook TPV.
- **Para dejarlo todo como estaba**: quita las impresoras en ⚙ › Impresoras y cajón, cierra el
  programa y desinstálalo. En sus aparatos no queda nada.

## Antes de ir

1. **Que esté fusionado** el pull request **«Antes del local del amigo»** y **publicada la caja
   1.0.1**:
   - **En GitHub**: **Actions** → **La caja para Windows** → **Run workflow**, rama `main`, y en la
     casilla escribe **`publicar`**. Espera al círculo verde (unos 10 minutos).
   - **Qué debe salir:** en **Releases**, «v1.0.1» con tres ficheros: el `.exe`, su `.blockmap` y
     `latest.yml`.
2. **Crea su cuenta de prueba** (la de tu amigo) con su carta, como siempre.
3. **Lleva tu portátil con Windows.** La prueba se hace en **tu** portátil, no en el PC de su TPV:
   así su caja no se toca.

## En el local, con el restaurante cerrado

**Nunca en mitad del servicio**: si Estook y su TPV imprimen a la vez en la cocina, salen comandas
de los dos y se lían.

1. **Conecta tu portátil al wifi del local** (el mismo que usan su TPV y las impresoras).
2. **Abre estook.com/tpv en tu portátil**, vincula la caja con tu correo y descarga **la caja para
   Windows** desde la franja de arriba. Al abrirla: «Windows protegió su PC» → **Más información**
   → **Ejecutar de todas formas**. Pásale la caja con el código de ⚙ › Aparatos › **«Pasar a la
   app»**.
3. **⚙ › Impresoras y cajón › Buscar impresoras.**
   - **Qué debe salir:** sus impresoras de tickets, con su nombre si su web lo dice («Epson
     TM-…»); y quizá otras (una de oficina, un router). **No elijas las que no son de tickets.**
4. **Elige la de la caja** (la del cable) → **Imprimir prueba**.
   - **Qué debe salir:** un papel que dice «Si lees esto, sale bien», con tildes y eñes. **«Sí, ha
     salido»** → nómbrala **Caja**, que imprime **la cuenta**, y si tiene **el cajón** enchufado.
5. **Haz lo mismo con la de cocina** (la del wifi) → nómbrala **Cocina**, que imprime **las
   comandas**.
6. **Si tiene cajón**: en la de la caja, **«Abrir el cajón»**, con su motivo. **Debe abrirse.**
7. **Abajo, «Lo de la cocina sale en…»**: **Papel** (si no llevas pantalla de cocina) o **Las dos**.
8. **Con tu móvil conectado al wifi del local** (vinculado como comandero), abre una mesa, pide algo
   de primero y de segundo, y **Mandar**.
   - **Qué debe salir:** en **menos de 6 segundos**, la comanda en la impresora de cocina: la mesa
     enorme, «1.º · YA» y «2.º · EN ESPERA».
9. **Marcha el 2.º** desde el móvil. **Debe salir** otro papel: «¡MARCHA EL 2.º!».
10. **Opciones de la mesa › Imprimir la cuenta.** **Debe salir** en la de la caja, con «Documento no
    válido como factura».
11. **Sin internet** (en el móvil): **modo avión**, abre otra mesa, pide y **Mandar**. Sale
    «Guardado en este aparato». Quita el modo avión: en unos segundos, «Conexión recuperada», y la
    comanda sale en cocina **una vez**.
12. **Al acabar**: si tu amigo no va a seguir probándolo, quita las dos impresoras en ⚙ ›
    Impresoras y cajón y cierra el programa.

**Si algo no sale así**, haz una foto o una captura con el número del paso y pásamela. No toques nada
de sus aparatos para arreglarlo.

## Si al día siguiente una impresora no responde

Puede que su router le haya dado **otra dirección**. **Buscar impresoras** otra vez y volver a darla
de alta. Su TPV suele tenerlas con dirección fija; si es así, no pasará.

## Lo que aún no está

- **Que la cocina reciba sin internet** (la caja de centro): T5 · 2 · 2.
- **Cobrar, el ticket y el cajón al cobrar**: T6 y T7.
- **Impresoras por USB**: cuando un local la tenga.
