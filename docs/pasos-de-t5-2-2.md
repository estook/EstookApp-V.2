# Pasos de «T5 · 2 · 2 · La caja de centro»

> ## Cómo está
>
> **En su pull request**, sin fusionar. En `estook.com` no se ve hasta que fusiones.
>
> | Qué              | Cómo está                                                                                  |
> | ---------------- | ------------------------------------------------------------------------------------------ |
> | Pull request     | **«T5 · 2 · 2 · La caja de centro» (#158)**, rama `t5-2-2-la-caja-de-centro`               |
> | La base de datos | **Migración 0097**: hay que migrar (pasan a **97**)                                        |
> | La API           | Cambia por dentro (sigue con **115 consultas y 313 comandos**): **hay que desplegarla**    |
> | La caja          | **1.1.0**: hay que publicarla. **Lleva dentro lo de la 1.0.1**: no hace falta publicar esa |

---

## Lo que cambia para ti

- **Sin internet, la cocina sigue recibiendo por la caja.** Lo que se manda y se marcha en un
  móvil Android llega a la caja para Windows por el wifi del local: **ella lo imprime** en la
  cocina y en la barra, y **se lo da a la pantalla de cocina**.
- **Arriba, en el comandero**: «Sin internet. Todo sigue funcionando en el local». Y al mandar:
  «Sin internet: la cocina ya lo tiene, por la caja».
- **La pantalla de cocina sin internet** sigue con lo que tenía, suma lo que llega y deja tachar.
  Arriba dice «Por la caja».
- **Al volver internet**, todo sube a Estook **una vez** y **no se vuelve a imprimir**.
- **En el plano, una línea** si el Android aún no tiene el permiso de Chrome («Seguir»), si alguien
  lo bloqueó («Cómo arreglarlo») o si va con datos móviles.
- **El iPhone y el iPad** siguen como en T5 · 2 · 1: guardan lo suyo y lo suben al volver.

Lo decidido, en la [0123](decisiones/0123-t5-2-2-la-caja-de-centro.md).

## Lo que te toca · fusionar, migrar, desplegar y publicar

**En este orden.** Si algo falla, no sigas y pásame lo que dice la pantalla.

1. **En GitHub**: fusiona **«T5 · 2 · 2 · La caja de centro» (#158)** con las comprobaciones **en verde**:
   **Merge pull request** → **Confirm merge**.
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

   **Tiene que** decir que aplicó la **0097** y que hay **97 de 97**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde.
4. **En GitHub**: **Actions** → **La caja para Windows** → **Run workflow**, rama `main`, y en la
   casilla escribe **`publicar`**. Espera al círculo verde (unos 10 minutos).
   - **Tiene que salir** en **Releases** «v1.1.0» con tres ficheros: el `.exe`, su `.blockmap` y
     `latest.yml`.
   - La caja que ya tienes instalada se actualiza sola: **ciérrala y vuelve a abrirla** para que se
     ponga la nueva.

## Lo que te toca · probarlo en casa primero

Así no tocas nada del local de tu amigo hasta saber que funciona. Necesitas **tu portátil con
Windows** (la caja), **un móvil Android** (el comandero) y, si tienes, **una tablet Android** (la
cocina). Sin impresora: esto prueba la cocina en pantalla.

1. **Conecta el portátil y el Android al mismo wifi de casa.** Abre la caja para Windows 1.1.0.
   - **Windows te preguntará** «El Firewall de Windows Defender bloqueó algunas características de
     esta aplicación». **Deja marcado «Redes privadas» y toca «Permitir acceso».**
   - **Si no pregunta y luego nada llega**, puede que Windows tenga tu wifi como «red pública»:
     abajo a la derecha, icono del wifi → **›** junto a tu wifi → **Propiedades** → **Tipo de
     perfil de red: Red privada**.
2. **En Ajustes del TPV › Impresoras y cajón**, abajo, «Lo de la cocina sale en…»: **Pantalla**.
3. **En el Android**, abre Estook TPV (vinculado como comandero) y **espera dos minutos** en el plano:
   la caja tiene que decir dónde está.
   - **Tiene que salir** arriba, en azul: «Para que la cocina reciba aunque se vaya internet, deja
     que Estook TPV hable con la caja» → **Seguir** → Chrome pregunta «Buscar dispositivos de tu
     red local…» → **Permitir**. La línea desaparece.
4. **Si tienes la tablet**, vincúlala como **pantalla de cocina** y ábrela. Toca **Seguir** si sale
   la misma línea.
5. **Quita internet sin quitar el wifi**: desenchufa **el cable que va de la caja de la fibra al
   router** (no el router: el wifi tiene que seguir encendido). Si tu router y la fibra son el mismo
   aparato, en su lugar haz el paso 5 bis.
   - **5 bis**: en tu móvil personal, crea una **zona wifi** con los **datos móviles apagados** y
     conecta a ella el portátil, el Android y la tablet. Es un wifi sin internet.
6. **En el Android**, abre una mesa, pide algo de 1.º y de 2.º y **Mandar**.
   - **Tiene que** decir «Sin internet: la cocina ya lo tiene, por la caja», y arriba «Sin
     internet. Todo sigue funcionando en el local».
   - **En la tablet**, en **2 segundos o menos**, la mesa con el 1.º en marcha y el 2.º esperando,
     y arriba «Por la caja».
7. **Marcha el 2.º** en el Android. **En la tablet** tiene que pasar a marcha. **Tacha** un plato en
   la tablet.
8. **Vuelve a enchufar el cable** (o apaga la zona wifi y vuelve al de casa). En unos segundos el
   Android dice «Conexión recuperada · N cosas subidas, ninguna repetida», y en la tablet la mesa
   sigue igual, con lo tachado tachado. **Nada sale dos veces.**

## Lo que te toca · en el local de tu amigo

Igual que en casa, con **el restaurante cerrado** y [los pasos de antes](pasos-en-el-local-del-amigo.md)
(dar de alta sus impresoras desde tu portátil). Ahora, además:

1. **Pide permiso a tu amigo para quitar internet 5 minutos**: desenchufar el cable de la fibra al
   router, no el router. Su TPV se quedará sin internet esos minutos; con el local cerrado no pasa
   nada. **Si no quiere**, prueba solo con internet: ya lo has visto funcionar en casa.
2. **Lo de la cocina sale en…**: **Papel** (o **Las dos** si llevas la tablet).
3. **Con internet quitado**, manda una mesa desde el Android: **tiene que salir** la comanda en su
   impresora de cocina **en 2 segundos o menos**, con «1.º · YA» y «2.º · EN ESPERA»; y al marchar,
   «¡MARCHA EL 2.º!».
4. **Vuelve a enchufar el cable**: lo mandado sube a Estook y **no sale otra vez en el papel**.
5. **Al acabar**, si no va a seguir probándolo: quita sus impresoras en ⚙ › Impresoras y cajón y
   cierra el programa.

**Si algo no sale así**, haz una foto con el número del paso y pásamela. No toques nada de sus
aparatos para arreglarlo.

## Lo que aún no está (la segunda parte, T5 · 2 · 2 · 2)

- **Entrar con el PIN sin internet en cualquier Android** (hoy, como en T5 · 2 · 1, solo quien ya
  entró hoy en ese aparato) y **fichar sin internet en la caja**.
- **Aparatos dice quién llega a la caja**, y los avisos de Windows dentro de Estook TPV (hoy, los
  pasos de arriba).
- **Que un comandero vea las mesas que abrió otro sin internet**: la cocina las ve todas.
