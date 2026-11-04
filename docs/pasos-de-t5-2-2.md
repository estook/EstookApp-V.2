# Pasos de «T5 · 2 · 2 · La caja de centro» (las dos partes)

> ## Cómo está
>
> | Qué              | Cómo está                                                                                        |
> | ---------------- | ------------------------------------------------------------------------------------------------ |
> | La 1.ª parte     | **«T5 · 2 · 2 · La caja de centro» (#158)**: fusionada, migración 0097 y API desplegada (31-oct) |
> | La 2.ª parte     | **«T5 · 2 · 2 · 2 · Los PIN y Aparatos» (#159)**: fusionada el 2-nov                             |
> | La base de datos | **Migración 0098**: migrada, **98 de 98** (comprobado el 2-nov)                                  |
> | La API           | Desplegada el 2-nov, con **115 consultas y 314 comandos** (comprobado)                           |
> | La caja          | **1.2.0, publicada el 2-nov**. Lleva dentro la 1.1.0 y la 1.0.1: **no publiques ninguna otra**   |
>
> **Lo de fusionar, migrar, desplegar y publicar ya está hecho.** Te queda probarlo: en casa primero, y
> después en el local de tu amigo.

---

## Lo que cambia para ti

- **Sin internet, la cocina sigue recibiendo por la caja.** Lo que se manda y se marcha en un
  móvil Android llega a la caja para Windows por el wifi del local: **ella lo imprime** en la
  cocina y en la barra, y **se lo da a la pantalla de cocina**.
- **Sin internet entra cualquiera con su PIN** en un Android que llega a la caja: arriba, «Por la
  caja». Quien no ha fichado, ficha en la caja, como siempre.
- **«Fichar» en la caja funciona sin internet**: «Hola, Ana · ¿Fichar la entrada?», y sube a
  Estook al volver, a la hora en que se fichó.
- **Ajustes del TPV › Aparatos dice quién llega a la caja**: «4 de 5 siguen sin internet», y en
  cada uno «Llega a la caja», «Guarda lo suyo» (un iPhone) o lo que le pasa, con sus pasos.
- **Los avisos de Windows**: antes de que Windows pregunte, la caja dice qué contestar; y si
  Windows no la deja escuchar o tiene el wifi como «red pública», Aparatos lo dice con los pasos y
  el botón **Abrir en Windows**.
- **Al volver internet**, todo sube a Estook **una vez** y **no se vuelve a imprimir**.
- **El iPhone y el iPad** siguen como en T5 · 2 · 1: guardan lo suyo y lo suben al volver.

Lo decidido, en la [0123](decisiones/0123-t5-2-2-la-caja-de-centro.md) y la
[0124](decisiones/0124-t5-2-2-2-los-pin-y-aparatos.md).

## Lo que te tocaba · fusionar, migrar, desplegar y publicar (hecho el 2-nov)

**Ya está hecho**; se deja escrito por si hay que repetirlo. Si algo falla, no sigas y pásame lo que dice la pantalla.

1. **En GitHub**: fusiona **«T5 · 2 · 2 · 2 · Los PIN y Aparatos» (#159)** con las comprobaciones
   **en verde**: **Merge pull request** → **Confirm merge**.
2. **En tu ordenador**, en PowerShell, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

   ```powershell
   .\estook.cmd bd:migrar
   ```

   **Tiene que** decir que aplicó la **0098** y que hay **98 de 98**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde.
4. **En GitHub**: **Actions** → **La caja para Windows** → **Run workflow**, rama `main`, y en la
   casilla escribe **`publicar`**. Espera al círculo verde (unos 10 minutos).
   - **Tiene que salir** en **Releases** «v1.2.0» con tres ficheros: el `.exe`, su `.blockmap` y
     `latest.yml`.
   - La caja que ya tienes instalada se actualiza sola: **ciérrala y vuelve a abrirla** para que se
     ponga la nueva (a veces hay que hacerlo dos veces: la primera la descarga).

## Lo que te toca · probarlo en casa primero

Así no tocas nada del local de tu amigo hasta saber que funciona. Necesitas **tu portátil con
Windows** (la caja), **un móvil Android** (el comandero) y, si tienes, **una tablet Android** (la
cocina). Sin impresora: esto prueba la cocina en pantalla.

**Ojo:** tu Windows tiene la red de casa («vodafone52EA») como **red pública**. Lo he leído yo en
tu PC. Así que vas a ver el aviso del paso 2: es lo que tiene que pasar.

1. **Conecta el portátil y el Android a la misma red de casa.** Abre la caja para Windows 1.2.0 y
   entra con tu PIN.
   - **Tiene que salir** arriba, en azul: «Windows va a preguntar si Estook TPV puede usar la red.
     Deja marcado «Redes privadas» y toca «Permitir acceso»».
   - **Unos segundos después** Windows pregunta («El Firewall de Windows Defender bloqueó algunas
     características…»). **Marca «Redes privadas», toca «Permitir acceso»** y, si te lo pide, la
     contraseña del ordenador.
2. **Ajustes del TPV (⚙) › Aparatos.**
   - **Tiene que salir** arriba, en ámbar: «Windows tiene «vodafone52EA» como red pública…» →
     **Cómo cambiarlo** → **Abrir en Windows** → en **Tipo de perfil de red**, **Red privada**.
   - **Vuelve a la caja**: en unos segundos el aviso desaparece.
3. **En Ajustes del TPV › Impresoras y cajón**, abajo, «Lo de la cocina sale en…»: **Pantalla**.
4. **En el Android**, abre Estook TPV (vinculado como comandero) y **espera dos minutos** en el plano.
   - **Tiene que salir** arriba, en azul: «Para que la cocina reciba aunque se vaya internet, deja
     que Estook TPV hable con la caja» → **Seguir** → Chrome pregunta «Buscar dispositivos de tu
     red local…» → **Permitir**. La línea desaparece.
5. **Si tienes la tablet**, vincúlala como **pantalla de cocina** y ábrela. Toca **Seguir** si sale
   la misma línea.
6. **En la caja, Aparatos** (espera un par de minutos, o sal y vuelve a entrar).
   - **Tiene que** decir arriba «N de N siguen sin internet», la caja «Es el centro» con «por cable»
     o «por wifi», y el Android (y la tablet) «Llega a la caja».
   - Si un iPhone está vinculado, «Guarda lo suyo».
7. **Quita internet sin quitar el wifi**: desenchufa **el cable que va de la caja de la fibra al
   router** (no el router: el wifi tiene que seguir encendido). Si tu router y la fibra son el mismo
   aparato, en su lugar haz el paso 7 bis.
   - **7 bis**: en tu móvil personal, crea una **zona wifi** con los **datos móviles apagados** y
     conecta a ella el portátil, el Android y la tablet. Es un wifi sin internet. **Esa red también
     será «pública» la primera vez**: repite el paso 2 con ella.
8. **En el Android**, abre una mesa, pide algo de 1.º y de 2.º y **Mandar**.
   - **Tiene que** decir «Sin internet: la cocina ya lo tiene, por la caja», y arriba «Sin
     internet. Todo sigue funcionando en el local».
   - **En la tablet**, en **2 segundos o menos**, la mesa con el 1.º en marcha y el 2.º esperando,
     y arriba «Por la caja».
9. **Marcha el 2.º** en el Android. **En la tablet** tiene que pasar a marcha. **Tacha** un plato en
   la tablet.
10. **El PIN de otro, sin internet**: en el Android, **bloquea** (o espera a que se bloquee) y entra
    con el PIN de **alguien que hoy no ha entrado en ese móvil** (de IKATZ, uno que ya haya fichado).
    - **Tiene que salir** «Por la caja» y, debajo, «Sin internet: el PIN lo mira la caja», y entrar.
    - Con el PIN de alguien **sin fichar**: «Sin fichar · ficha la entrada en la caja».
    - Con un PIN que no es de nadie: «Ese PIN no vale». Sin decir de quién era.
11. **Fichar sin internet**, en la caja: toca **Fichar** (naranja, arriba) y teclea el PIN de quien
    no ha fichado.
    - **Tiene que** decir «Hola, … · ¿Fichar la entrada?» y «Sin internet: lo apunta la caja y sube
      al volver». Al fichar, «✓ … · entrada a las … · sube al volver internet».
    - Ahora, en el Android, ese PIN **sí entra**.
12. **Vuelve a enchufar el cable** (o apaga la zona wifi y vuelve al de casa). En unos segundos el
    Android dice «Conexión recuperada · N cosas subidas, ninguna repetida», y en la tablet la mesa
    sigue igual, con lo tachado tachado. **Nada sale dos veces.**
    - **En Estook (la app)**, en el horario de hoy, el fichaje del paso 11 **a la hora en que lo
      hiciste**, no a la de volver internet.

## Lo que te toca · en el local de tu amigo

Igual que en casa, con **el restaurante cerrado** y [los pasos de antes](pasos-en-el-local-del-amigo.md)
(dar de alta sus impresoras desde tu portátil). Ahora, además:

1. **Pide permiso a tu amigo para quitar internet 5 minutos**: desenchufar el cable de la fibra al
   router, no el router. Su TPV se quedará sin internet esos minutos; con el local cerrado no pasa
   nada. **Si no quiere**, prueba solo con internet: ya lo has visto funcionar en casa.
2. **En su PC**, si Windows pregunta o Aparatos dice «red pública» o «Windows no la deja
   escuchar», haz lo mismo que en casa (pasos 1 y 2). **Si su PC no es tuyo y no sabes la
   contraseña de administrador, no lo cambies**: díselo a tu amigo, o usa tu portátil como caja.
3. **Lo de la cocina sale en…**: **Papel** (o **Las dos** si llevas la tablet).
4. **Con internet quitado**, manda una mesa desde el Android: **tiene que salir** la comanda en su
   impresora de cocina **en 2 segundos o menos**, con «1.º · YA» y «2.º · EN ESPERA»; y al marchar,
   «¡MARCHA EL 2.º!».
5. **Vuelve a enchufar el cable**: lo mandado sube a Estook y **no sale otra vez en el papel**.
6. **Al acabar**, si no va a seguir probándolo: quita sus impresoras en ⚙ › Impresoras y cajón y
   cierra el programa.

**Si algo no sale así**, haz una foto con el número del paso y pásamela. No toques nada de sus
aparatos para arreglarlo.

## Lo que aún no está

- **Que un comandero vea las mesas que abrió otro sin internet**: como en Toast, cada comandero ve
  lo suyo, y la cocina lo de todos.
- **Cobrar sin internet**: con T7.
