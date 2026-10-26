# 0115 · Cada aparato a lo suyo, fichar en la caja y Estook TPV instalable

**Fecha:** 25 de octubre de 2026
**Estado:** construida, en su pull request (`cada-aparato-a-lo-suyo`), sin migración.
**Sigue:** la [0107](0107-estook-tpv-el-tpv-entero.md) y la [0108](0108-t1-la-puerta.md); lo que dijo
Richi el 25-oct al ver las maquetas de T4
([`docs/maquetas/t4-la-cocina-y-la-barra.html`](../maquetas/t4-la-cocina-y-la-barra.html)).
**Cambia:** el Anexo 3.4, 11.3, 11.4, 11.5 y 11.13, el plan y ESTADO.

## 1 · Lo que dijo Richi

Al ver las maquetas de T4 (25-oct), además de lo de la cocina, que va en T4:

- **«Que el de la caja sea donde se ficha, con un botón arriba que ponga fichar en naranja, y quitar
  el dispositivo de fichar»**: la caja la abre siempre un gerente, y allí fichan todos al llegar.
- **Los comanderos, sin fichar no**: «si intentas iniciar sesión sale en rojo y dice sin fichar», y que
  fiche en la caja o en Estook con la ubicación.
- **Los comanderos, solo pedir y cobrar**: nada de ajustes, ni fichar, ni agotados. **Había vinculado un
  comandero y solo le dejaba fichar y ver los agotados**, no la sala.
- **Estook TPV no se instala, y Estook tampoco se ofrece a instalar en el ordenador**: «acceder por
  internet suena feo»; las dos, instalables en el móvil, la tablet y el ordenador, y la primera vez que
  se entra, que lo diga.
- **«Que sea todo un baile perfecto y sincronizado»**, como lo hacen las mejores.

## 2 · Qué deja

- **El comandero va directo a la sala**: el plano y las mesas. No tiene inicio, ni «Fichar», ni
  agotados, ni Ajustes del TPV; la «E» de arriba lleva a la sala. Si entra alguien cuyo puesto no toma
  nota, se le dice («Tu puesto no toma nota»), en vez de dejarle en un inicio que no le sirve.
- **En un comandero no se entra sin fichar**, y no se ficha ahí: «Sin fichar · ficha la entrada en la
  caja o en Estook con el móvil, y entra». Lo mira la API, no solo la pantalla.
- **En la caja, «Fichar» en naranja**, arriba, **también en la pantalla del PIN**: cada uno teclea su
  PIN y ficha la entrada, la pausa, la vuelta o la salida **sin entrar en la caja**, y sale «✓ Ana ·
  entrada a las 12:02». Dentro de la caja, el mismo botón abre el fichar de quien está.
- **Los Ajustes del TPV, solo en la caja**: la sala, los productos, los aparatos y el PIN y el bloqueo.
  Antes también en la tablet de la sala; **ahora lo mira la API en cada consulta y cada orden**.
- **El aparato para fichar ya no se vincula**. Los que ya estén puestos siguen funcionando, en Estook,
  hasta que se quiten; si se abre uno en Estook TPV, dice que ahora se ficha en la caja y cómo cambiarlo.
- **Estook TPV se instala**, como Estook: su manifiesto, su icono y su trabajador de servicio, con su
  propia caché. **La primera vez, una franja arriba**: «Instala Estook TPV», con el botón donde el
  navegador deja, o los dos toques en el iPhone y el iPad. **Estook también lo ofrece en el ordenador**.

**La API**: dos órdenes, `quien_ficha_en_la_caja` y `fichar_en_la_caja`, sin sesión, con la llave de
una caja y el PIN. `entrar_con_pin` no deja entrar sin fichar en un comandero, y el comandero cae siempre
en la sala. Las consultas y órdenes de los Ajustes del TPV, solo en la caja (`enLosAparatos: ['caja']`).
Con esto, **112 consultas y 295 comandos**.

## 3 · Lo que decidí al construirlo

1. **Una entrega aparte, antes de T4**: es lo que Richi vio mal en lo que ya está en producción, y T4
   espera a que conteste sus maquetas.
2. **Fichar en la caja sin entrar en ella**, como el aparato para fichar de antes: así ficha también el
   cocinero, que no usa la caja. **Dos órdenes** (quién es y cómo está, y fichar), para enseñarle solo los
   botones que le tocan. No se recuerdan: guardarían un PIN acertado.
3. **Fichar la salida con mesas abiertas, con el botón naranja, no se puede**: dice que se entre y se
   pasen, porque sin entrar no hay a quién elegir.
4. **En la caja, «Solo entra quien ha fichado» sigue siendo un ajuste** (apagado de fábrica): la caja es
   donde se ficha, y quien la abre puede fichar al entrar. **En el comandero no es un ajuste**: nunca sin
   fichar.
5. **Fichar con la ubicación en Estook sigue igual**: vale para entrar en un comandero.
6. **Los aparatos para fichar que ya hay no se rompen**: no se vinculan nuevos, pero los de antes siguen
   hasta que se quiten. **Fichar sin wifi en un aparato del local se va con ellos**: el móvil sigue
   fichando sin señal (0070), y la caja para Windows, cuando llegue, trabajará sin internet.
7. **La invitación a instalar, una franja y no una hoja**: invita sin tapar el teclado del PIN. Sale
   **antes de vincular**, porque en el iPhone lo instalado no ve lo que guardó Safari. «Ahora no» se
   recuerda.
8. **Cada app, su caché**: Estook y Estook TPV viven en el mismo dominio, y el trabajador de una borraba
   las cachés de Estook que no eran la suya; ahora no toca la de la otra.
9. **Lo de instalar pasa a `@estook/ui`**, para que lo usen las dos apps igual.
10. **La página del QR (`/tpv/vincular/`) pide el manifiesto un nivel más arriba**: sin eso, desde el QR
    no se podía instalar.
11. **El comandero que intenta abrir el inicio, los ajustes o fichar** (escribiendo la dirección) cae en
    la sala.

## 4 · Lo que queda para que lo diga Richi

En las maquetas de T4, 2.ª versión, con tres preguntas: si le valen; **la caja para Windows con Estook
Link dentro** (cambia T5: en vez de un programa aparte, la caja descargable, que imprime los tickets y
las comandas en cualquier impresora, abre el cajón y sigue sin internet); y si «los comanderos no tienen
acceso a precios» es que **no los cambian** (los ven, para cobrar).
