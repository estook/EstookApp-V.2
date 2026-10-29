# 0122 · T5 · 2 · 1 · Cada aparato aguanta solo: sin internet se sigue, y al volver sube una vez

**Fecha:** 29 de octubre de 2026
**Estado:** construido en la rama `t5-2-1-cada-aparato-aguanta-solo`, sin migración; la API
cambia por dentro (sigue con 115 consultas y 313 comandos) y hay que desplegarla.
**Sigue:** la [0119](0119-t5-la-caja-para-windows.md) (T5 en dos), la
[0070](0070-la-app-instalable.md) (el PIN cifrado sin conexión) y las maquetas de T5 · 2
([`docs/maquetas/t5-2-sin-internet.html`](../maquetas/t5-2-sin-internet.html)), que Richi aprobó el
29-oct.
**Cambia:** el Anexo (3.6 y 10.9), la Arquitectura (capítulo 7), el plan de M20A y ESTADO.

## 1 · Lo que pidió Richi

Seguir con Estook TPV por **T5 · 2 · Sin internet**. Las pantallas que faltaban (entrar sin
internet, lo que falta por subir, la caja de centro y la cocina) se dibujaron y **las aprobó el
29-oct** («Aprobadas»). Se entrega **en dos partes**, como dicen las maquetas: primero **cada
aparato aguanta solo** (esta), que sirve también en el iPhone; después **la caja de centro**
(T5 · 2 · 2).

## 2 · Lo que queda

- **El aparato abre sin internet** con lo último que leyó: él mismo, el plano, la botonera, las
  impresoras y las mesas que abrió en las últimas horas. Se guarda en el aparato y se borra al
  desvincularlo.
- **Sin internet se abre la mesa, se pide, se manda y se marcha.** Cada cosa se guarda **con su
  clave, nacida en el aparato**, y en su orden. La mesa abierta sin internet sale ocupada en el
  plano y se puede abrir; lo mandado se ve en su mesa, aparte y en ámbar: «Guardado aquí · la
  cocina aún no lo recibe». Lo marchado no se vuelve a ofrecer.
- **Entrar sin internet: quien ya entró hoy en ese aparato.** Su PIN se comprueba en el aparato
  con lo que se guardó al entrar con internet, y **se guarda cifrado** con la clave pública del
  aparato (como fichar sin conexión, 0070), para que **Estook lo dé por bueno al volver**. A los
  demás: «Sin conexión no se puede comprobar ese PIN. Aquí solo entra quien ya entró hoy en este
  aparato».
- **La franja**, en ámbar: «Sin conexión. Se guarda aquí: la cocina aún no lo recibe · 3 por
  subir», con **«Ver»**, que enseña lo que espera.
- **Al volver, sube solo**, en orden y una vez, y lo dice una vez: «Conexión recuperada · 3 cosas
  subidas, ninguna repetida». Lo que Estook no acepte (lo raro) se queda en «Por subir» con el
  porqué, hasta que alguien lo da por mirado.

## 3 · Lo que decidió la IA al construirlo

1. **Del PIN se guarda una huella lenta**, nunca el PIN: PBKDF2 con cien mil vueltas y su sal,
   solo de quien lo tecleó en ese aparato y durante un servicio largo (16 horas, lo mismo que un
   turno). Sirve para saber quién es sin internet; **quien lo da por bueno es Estook**, con el
   PIN cifrado.
2. **Entrar sin internet sube delante de lo suyo** y abre un turno **desde la hora en que entró**,
   sin echar a quien esté dentro en ese momento y sin mirar si ha fichado (entró cuando entró).
   **Un cifrado vale una vez**, y solo sube el mismo día (16 horas).
3. **Si la entrada no se puede comprobar al subir, lo de esa persona no se firma con otra**: se
   queda en «Por subir» con el porqué. Nadie firma por otro.
4. **Lo de la sala lleva la hora a la que llega**, no la de cuando se tocó: es cuando la cocina lo
   recibe. Fichar sigue con su hora de verdad (0070).
5. **Mientras quede algo por subir, lo nuevo va detrás**, aunque ya haya internet: mandar una mesa
   que Estook aún no sabe que se abrió no puede adelantarse a abrirla.
6. **Antes de que alguien entre con su PIN, sube lo guardado**: entrar echa a quien estaba, y lo
   suyo tiene que llegar antes con su turno.
7. **La pantalla no se inventa lo que diría la cocina**: lo mandado sin internet se ve aparte,
   sin decir qué sale y qué espera. Eso lo decide Estook al llegarle.
8. **Las lecturas no se pausan sin red** (`networkMode: 'always'`): TanStack Query, de fábrica,
   deja una lectura en pausa si el navegador dice que no hay red, y la mesa no abría nunca. Cada
   lectura ya sabe qué hacer sin internet (lección 241).
9. **La botonera se lee también desde el plano**, para tenerla guardada aunque aún no se haya
   abierto ninguna mesa en ese aparato.
10. **Lo que funciona sin internet, por ahora**: abrir la mesa, pedir, mandar, marchar, entrar y
    bloquear. Lo demás (quitar un plato, las opciones de la mesa, fichar en la caja, los ajustes)
    dice «No hay conexión», como hasta hoy.
11. **El cifrado del PIN pasa a `@estook/cliente-api`**, para que lo usen la app y Estook TPV sin
    copiarlo.

## 4 · Lo que no entra, y dónde va

- **La caja de centro** (los Android y la pantalla de cocina hablándole por el wifi, la caja que
  comprueba los PIN de todos, imprime y reparte sin internet): **T5 · 2 · 2**. Antes, tres
  preguntas a Richi sobre el local de su amigo: si los camareros van con el wifi del local o con
  sus datos, si la pantalla de cocina es una tablet Android o un iPad, y si el PC de la caja va
  por cable.
- **Fichar sin internet en la caja**: con la caja de centro, que comprueba el PIN de cualquiera.
- **Cobrar sin internet**, con su justificante: con el cobro (T7).

## 5 · Las pruebas

- **Contra la base** (`la-puerta.prueba.ts`): el latido da la clave pública; lo hecho sin
  internet sube con su turno y repetido no hace nada dos veces; bloquear sube detrás; la entrada
  cifrada abre un turno desde su hora y no echa a nadie; el mismo cifrado otra vez no vale; ni sin
  decir cuándo, ni pasadas 16 horas, ni con otro PIN, ni cifrado para otro aparato.
- **De unidad**: `subir.prueba.ts` (orden, clave, cuánto hace, la entrada delante, sin red se para,
  lo rechazado se apunta) y `loGuardado.prueba.ts` (la mesa en el plano y por dentro, lo
  marchado).
- **De pantalla** (`sin-internet.spec.ts`, en el ordenador y en el móvil, con el navegador sin red
  de verdad): abrir la mesa, pedir dos croquetas, mandar, «Ver», bloquear y volver a entrar con el
  PIN; al volver, «3 cosas subidas, ninguna repetida», y en Estook la mesa tiene las croquetas
  una vez, mandadas.
