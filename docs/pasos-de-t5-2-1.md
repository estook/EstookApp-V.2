# Pasos de «T5 · 2 · 1 · Cada aparato aguanta solo»

> ## Cómo está
>
> **Fusionada y con la API desplegada** (29-oct). Te queda probarlo en IKATZ con el iPhone (abajo).
>
> | Qué              | Cómo está                                                                                    |
> | ---------------- | -------------------------------------------------------------------------------------------- |
> | Pull request     | **«T5 · 2 · 1 · Cada aparato aguanta solo» (#156)**, rama `t5-2-1-cada-aparato-aguanta-solo` |
> | La base de datos | **Sin migración**: no hay que migrar (siguen **96**)                                         |
> | La API           | Cambia por dentro (sigue con **115 consultas y 313 comandos**): **hay que desplegarla**      |

---

## Lo que cambia para ti

- **Sin internet, Estook TPV sigue**: abre con lo último que vio, y se abre la mesa, se pide, se
  manda y se marcha. Se guarda en el aparato y **sube solo al volver, una vez**.
- **Lo mandado sin internet se ve aparte, en ámbar**: «Guardado aquí · la cocina aún no lo
  recibe». La cocina lo recibe al volver internet (la caja de centro, que lo reparte sin internet,
  llega en T5 · 2 · 2).
- **Arriba, la franja**: «Sin conexión. Se guarda aquí: la cocina aún no lo recibe · 3 por
  subir», y «Ver» enseña lo que espera. Al volver: «Conexión recuperada · 3 cosas subidas,
  ninguna repetida».
- **Bloqueado sin internet, entra con su PIN quien ya entró hoy en ese aparato.** Los demás ven
  que sin conexión no se puede comprobar su PIN.

Lo decidido, en la [0122](decisiones/0122-t5-2-1-cada-aparato-aguanta-solo.md).

## Lo que te toca · fusionar y desplegar

**En este orden.** No hay que migrar.

1. **En GitHub**: fusiona **«T5 · 2 · 1 · Cada aparato aguanta solo»** con las comprobaciones **en
   verde**: **Merge pull request** → **Confirm merge**.
2. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Cuando acabe
   en verde, ya está.
3. **Para tener `main` al día en tu ordenador**, en PowerShell, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

**Si algo falla**: no sigas con el paso siguiente y pásame lo que dice la pantalla.

## Lo que te toca · probarlo en IKATZ

Con el iPhone, en el comandero (Estook TPV instalado). **Antes, entra una vez con internet** con
tu PIN y abre la sala: así el móvil guarda lo que necesita.

1. **Corta internet**: activa el **modo avión**. Arriba **tiene que** salir en ámbar «Sin
   conexión. Se guarda aquí: la cocina aún no lo recibe».
2. **Abre una mesa libre**, pide dos platos y toca **Mandar**. **Tiene que** decir «Guardado en
   este aparato: la cocina lo recibe al volver internet», y en la cuenta, en ámbar, lo pedido.
3. **Abre otra mesa** y haz lo mismo. La franja **tiene que** decir «· 6 por subir» (en cada mesa,
   abrirla, pedir y mandar). Toca **Ver**: salen las seis, «En este aparato».
4. **Toca Bloquear** y teclea tu PIN. **Tiene que** dejarte entrar, sin internet.
5. **Quita el modo avión.** En unos segundos **tiene que** salir en azul «Conexión recuperada · 6
   cosas subidas, ninguna repetida», y la franja se va. En la pantalla de cocina (o en el papel),
   las dos mesas **una vez cada una, en orden**.
6. **Prueba a entrar con otro PIN sin internet** (alguien que no haya entrado hoy en ese móvil):
   **tiene que** decir «Sin conexión no se puede comprobar ese PIN».

**Si algo no sale así**, haz una captura y pásamela con el número del paso.

## Lo que no está y por qué

- **La caja de centro** (que la cocina reciba sin internet, por el wifi del local): es
  **T5 · 2 · 2**. Antes necesito tus respuestas a tres preguntas del local de tu amigo.
- **Fichar sin internet en la caja**: llega con la caja de centro, que comprueba el PIN de
  cualquiera.
- **Quitar un plato, las opciones de la mesa o los ajustes sin internet**: dicen «No hay
  conexión», como hasta hoy.
