# 0129 · Quitar la empresa de un local, y la auditoría de T6 · 1

**Fecha:** 5 de noviembre de 2026
**Estado:** construido en la rama `t6-1-quitar-la-empresa`, con la migración **0102** (sin migrar
todavía).
**Sigue:** la [0128](0128-quien-lleva-la-facturacion.md) (quién lleva la facturación y la empresa de
pruebas, #161 y #162, en producción).
**Cambia:** el catálogo de errores (uno nuevo), ESTADO y el plan de M20A.

## 1 · Lo que pidió Richi

El 5-nov, con la #162 ya en producción y la empresa de pruebas bien puesta en IKATZ: «haz que se
puedan eliminar, por si me equivoco y pongo otra». Y: «no me vas a prometer que no hay ningún fallo,
así que haz una auditoría de lo que acabamos de hacer».

## 2 · Quitar la empresa de un local

**Mientras se está en pruebas, la empresa de un local se puede quitar.** El local se queda sin empresa
y el alta vuelve al paso 1. **No se borra nada**: lo fiscal solo crece (0126) y la auditoría se queda
con todo. Así lo hacen los programas de facturación grandes: lo que tiene historia se da de baja, no se
borra.

- **Dónde:** en Ajustes › Facturación › paso 1, «Quitar esta empresa de este local», con su
  confirmación en la misma pantalla. Lo puede quien lleva la facturación (la dirección, o a quien se la
  dé). **La empresa de pruebas, también desde el admin**, que es quien la pone: «Quitarla de ese local».
- **En real no se quita** (`empresa_en_real`). Con tickets de verdad, la empresa es la que los firmó.
  Si un local cambia de dueño (un traspaso), es otra cosa, y llega cuando toque.
- **Si otro local la usa, solo se suelta.** Con el último, la empresa queda **quitada**: deja libre su
  NIF, para que se pueda dar de alta bien en esta cuenta o en otra.
- **Ponerla otra vez la recupera**, la misma, con su alta en Verifacti y su autorización: escribiendo su
  NIF en el paso 1, o eligiéndola en «Ya tienes una empresa». Así, quitar por error no cuesta otra
  firma (2,90 € + IVA).
- **En Verifacti no se toca nada**: su NIF se queda en la cuenta. Nunca se borra un NIF (Anexo 4.2).
- **La empresa de pruebas no queda quitada nunca**: es la de la cuenta, y ponerla otra vez la vuelve a
  usar.

## 3 · La auditoría (5-nov)

Mirado entero lo construido en T6 · 1 y en la 0128: las migraciones 0099 a 0101, los comandos del alta
y del admin, las pantallas y lo que se guarda. Y probado en la app, en local.

### Lo que está bien

- **Cada escritura la mira la base**, no solo la pantalla: las funciones del alta comprueban el permiso
  en ese local, y la API no tiene escritura directa en las empresas ni en las series.
- **Quién lleva la facturación** lo decide solo la dirección. Un gerente que invita personas no puede
  dársela a sí mismo, ni saltándose el servidor (el disparador de la 0100).
- **Solo firma el titular**, y la base lo vuelve a mirar. Al titular no se le quita la facturación.
- **Los datos personales no se quedan donde no deben**: el enlace de la firma no se guarda, el PDF
  relleno (con el DNI del representante) tampoco, y en el admin el NIF de una persona sale tapado. La
  clave de cada NIF de Verifacti no se guarda en Estook.
- **La empresa de pruebas tiene las tres puertas cerradas**: el admin, el paso 1 y la base (0101).
- **La gestoría**, si se la dan, entra de verdad: elige el local y ve Ajustes › Facturación, sin «Quién
  la lleva» (comprobado en la app).

### Lo que se ha arreglado ahora

1. **Subir un modelo firmado siendo una persona**: el servidor solo dejaba descargarlo a una sociedad,
   pero subirlo, a cualquiera. Ahora tampoco se sube.
2. **El admin podía poner la empresa de pruebas encima de la empresa de un local**: la soltaba sin
   avisar y su NIF se quedaba ocupado. Ahora se para y dice que primero se quite.
3. **Una empresa quitada no pasa a real**, aunque el admin lo intentara.
4. **La empresa de pruebas no se elige desde el local** («Ya tienes una empresa»): la pone el admin.

### Lo que se acepta, y por qué

- **Comprobar el NIF en Hacienda no tiene un tope de veces.** Solo lo puede quien lleva la facturación
  y la pantalla espera a que se deje de escribir. Si Verifacti frena, se dice en llano.
- **Cada firma en línea nueva cuesta 2,90 € + IVA** (si caducó o la rechazaron). Solo la pide el titular,
  y una en curso se recupera sin pagar otra.
- **Quien lleva la facturación de un local ve las empresas de toda la cuenta**, con su NIF: es lo que
  deja elegir la misma empresa en el segundo local.

### Lo que no se puede comprobar todavía

- **Una firma de verdad**: nadie puede firmar por la empresa de pruebas. Se hace antes del primer
  cliente, con un NIF real (0125).
- **Emitir**: es T6 · 2. Ahí se ve todo de punta a punta, contra el entorno de pruebas de Verifacti.

## Lo que decidió la IA al construirlo

1. **Quitar, solo en pruebas.** En real, la empresa firmó tickets y no se cambia así.
2. **La empresa quitada libera su NIF solo si ningún local la usa.**
3. **Ponerla otra vez recupera la misma**, en vez de crear otra: no se pierde su firma.
4. **La de pruebas nunca queda quitada**, y se quita también desde el admin.
5. **El admin no pisa la empresa de un local**: pide quitarla antes.
6. **Un error nuevo**, `empresa_en_real`, en vez de uno genérico: así se lee qué pasa y qué hacer.
