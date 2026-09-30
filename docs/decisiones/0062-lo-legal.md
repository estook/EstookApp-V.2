# 0062 · Lo legal: el contrato de encargado, la conservación, los fichajes, los alérgenos y la IA

**Fecha:** 30 de septiembre de 2026
**Estado:** decidido (auditoría profunda, [0055](0055-la-auditoria-profunda.md)). Los
textos son **borradores para el asesor**: no se publican ni se aceptan en la app hasta
su revisión escrita.
**Crea:** la carpeta [`docs/legal/`](../legal/), la fuente única de lo legal.
**Corrige:** el principio 6 del Manifiesto («nada se borra»), su capítulo 22 («los
legales se conservan cinco años») y su capítulo 34 («copia diaria con 30 días»), que no
eran verdad o se contradecían.
**Cambia:** el Manifiesto (4, 16, 22, 28, 31 y 34), el Anexo (4.13), el Plan (M15,
M22, M26 y M27) y la [Arquitectura](../maestros/Estook-Arquitectura.md).

## Lo que pasó

Richi pidió que Estook **cumpla todo legalmente y no deje nada en el aire**. La
auditoría encontró lo que falta, y lo separó en tres: lo que dice la norma (con su
fuente oficial), lo que es interpretación técnica y lo que tiene que validar un
profesional.

## Lo que se decide

### 1 · Una carpeta, una fuente de verdad

| Documento                                                                 | Qué es                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`cumplimiento.md`](../legal/cumplimiento.md)                             | **El mapa**: cada obligación, su norma, cómo está Estook y qué falta. Se mantiene vivo      |
| [`preguntas-al-asesor.md`](../legal/preguntas-al-asesor.md)               | Todo lo que espera a un profesional, en un solo sitio, con lo que depende de cada respuesta |
| [`contrato-de-encargado.md`](../legal/contrato-de-encargado.md)           | Borrador del contrato del RGPD entre cada cliente y Estook                                  |
| [`conservacion-de-datos.md`](../legal/conservacion-de-datos.md)           | Cuánto se guarda cada dato, por qué, y qué pasa al darse de baja                            |
| [`registro-de-actividades.md`](../legal/registro-de-actividades.md)       | El registro de actividades de tratamiento de Estook                                         |
| [`informacion-para-el-equipo.md`](../legal/informacion-para-el-equipo.md) | El texto que el local da a su equipo sobre fichajes, ubicación y PIN                        |

### 2 · El contrato de encargado del tratamiento

La política de privacidad dice que los datos del equipo «los trata Estook por encargo
tuyo». El RGPD (art. 28) exige para eso **un contrato** con un contenido mínimo, y no
existía. Se redacta el borrador, con **la lista de subencargados** (Supabase, Resend,
Stripe, Sentry, Google, GitHub mientras publique la web, y Verifacti cuando llegue), y
**se acepta al crear la cuenta** cuando el asesor lo dé por bueno. **Antes del primer
cliente que pague de verdad.**

### 3 · «Nada se borra», dicho bien

El principio decía «nada se borra» y la privacidad, «si te das de baja, borramos tus
datos». No pueden ser las dos. Queda así:

> **Nada se borra por error ni para esconder algo.** Lo que se corrige deja rastro, lo
> emitido no se toca y lo que se desactiva sigue en la historia. **Y se borra cuando lo
> dice la política de conservación**, que es la ley: cada dato tiene su plazo, y al
> acabar se borra o se anonimiza.

Los plazos, en [`conservacion-de-datos.md`](../legal/conservacion-de-datos.md): facturas
y documentación del negocio, **seis años** (Código de Comercio, art. 30); registro de
jornada, **cuatro** (Estatuto de los Trabajadores, art. 34.9); y el resto, lo que dure la
cuenta más el periodo de baja.

### 4 · Los fichajes, preparados para el registro horario digital

A 9-sep-2026 el Real Decreto del registro horario digital **no está publicado**, pero
se ha anunciado «con efecto inmediato»: registro digital, personal y no manipulable,
con acceso a distancia para el trabajador, sus representantes y la Inspección. Se hace
en H lo que se puede hacer sin inventar el formato:

- **Una corrección es un registro nuevo** que no borra el original, y los dos se ven.
- **El trabajador ve cualquier cambio en lo suyo** y recibe un aviso.
- **La exportación para la Inspección**, del periodo, con su fecha.
- **Las pausas y las horas extra, separadas** (ya estaban en M15).
- Y cuando se publique el Real Decreto, **el acceso de la Inspección** como diga.

### 5 · La ubicación al fichar

Se pide solo al fichar, nunca después, y nunca bloquea (0025): bien. La LOPDGDD (art. 90)
obliga al local a **informar antes** a su equipo. Estook le da el texto hecho
([`informacion-para-el-equipo.md`](../legal/informacion-para-el-equipo.md)) y se lo
enseña en Ajustes al encender los fichajes.

### 6 · Los alérgenos

Informar de los alérgenos es **obligación del local** (Reglamento UE 1169/2011 y
RD 126/2015). Estook los calcula de las fichas y avisa en sala. Por eso:

- Cada alérgeno dice **de qué ingrediente sale** y **desde cuándo**.
- Se guarda **la versión con fecha**: qué decía la ficha el día de la venta.
- Se avisa de que **las trazas por contacto en la cocina no se deducen** de los
  ingredientes: las marca el local.
- Las condiciones lo dicen: Estook ayuda a informar; la información es del local.

### 7 · Fogón y la ley europea de IA

- **Fogón dice siempre que es una IA** (Reglamento UE 2024/1689, art. 50, que aplica
  desde agosto de 2026).
- **Proponer horarios es un uso de alto riesgo** (repartir trabajo entre empleados). Sus
  obligaciones se retrasaron al **2 de diciembre de 2027** con el Omnibus digital. Se
  diseña ya como si aplicaran: **Fogón propone, decide una persona, y nunca puntúa ni
  evalúa a nadie.**
- El local tiene que **informar a los representantes de los trabajadores** de los
  algoritmos que afectan a sus condiciones (Estatuto de los Trabajadores, art. 64.4.d).
  Estook le da el texto.

### 8 · El asesor, ya

La lista de preguntas estaba repartida por `ESTADO.md`, el Anexo y las decisiones.
Ahora está entera en [`preguntas-al-asesor.md`](../legal/preguntas-al-asesor.md). **Hay
que contratar al asesor fiscal y laboral ahora**, no al llegar al TPV: el contrato de
encargado va antes del primer cliente de pago, y el TPV llega en el primer semestre de 2027.

## Lo que no se decide aquí

- **Qué dice el asesor.** Todo lo marcado **[VERIFICAR]** espera a su respuesta escrita,
  y no se programa ni se publica antes.
- **El texto del Real Decreto del registro horario.** Se construye lo que no depende de
  él y se espera a su publicación para el formato de la Inspección.
