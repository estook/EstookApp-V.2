# 0130 · La pausa del 5-nov, y R1 · Lo rápido

**Fecha:** 5 de noviembre de 2026
**Estado:** R1 construido en la rama `r1-lo-rapido`, **sin migración**. R2 a R4, con sus maquetas
aprobadas, por construir.
**Sigue:** la [0129](0129-quitar-la-empresa-y-la-auditoria-de-t6-1.md) (#163, en producción).
**Cambia:** ESTADO y el plan de M20A (la pausa va antes de T6 · 2 · 1).

## 1 · La pausa

Con la #163 en producción y T6 · 2 · 1 por empezar, Richi paró para nueve puntos que vio usando Estook
TPV y Estook en IKATZ: tachar y mandar lentos, el estado de las mesas, la mesa en el móvil, los Ajustes
del TPV, el logo al abrir, la barra de arriba del iPhone, el gasto de IA, los precios sin IVA y las apps
nativas de Estook TPV. Se miró cada uno en el código, con capturas de un local de prueba y viendo cómo
lo resuelven Toast, Square y Lightspeed, y se hicieron maquetas. **Richi las aprobó el 5-nov** con un
cambio: cada sección del TPV lleva **su color y su icono**, que Estook pone solo por el nombre y el
local cambia en Productos y precios, y esa pantalla se reordena. **Los iconos son de Lucide**, la
colección que ya usa Estook (nunca dibujados a mano).

Se construye en cuatro entregas, y después se vuelve a T6 · 2 · 1:

| Entrega                        | Puntos de Richi       | Qué                                                                                                                                                        |
| ------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1 · Lo rápido**             | 1, 2, 3 y 4           | Tachar al momento, mandar de una vez, sin recargas a la vista, abrir sin esperar al logo, la barra del iPhone opaca. **Esta decisión**                     |
| **R2 · La mesa en el móvil**   | 1.1, 1.2, 1.3, 8, 8.1 | Esperando · Comiendo · ¿Cuenta? en el plano; la mesa entera al tocarla con Pedir, Servido, Cuenta y Cobrar; el camarero marca lo servido; cambiar un plato |
| **R3 · Ajustes y secciones**   | 1.4 y 6               | Ajustes en listas compactas; Productos y precios con las secciones a la izquierda; icono y color de cada sección                                           |
| **R4 · Precios, IA y papeles** | 5, 7 y 9              | Planes sin IVA (Esencial 49 €, Pro 119 €); la IA a un tercio; el coste con Verifacti a 15 €; Estook TPV para Android e iOS, como módulo final              |

Quedan **preguntas de Richi** para R2 y R4 (cambiar un plato ya en cocina, Cadena y Pausa sin IVA, el
paquete de IA y el precio de Verifacti); R1 no espera a ninguna.

## 2 · R1 · Lo rápido

### Tachar, al momento (punto 1)

La pantalla de cocina mandaba el tachado, esperaba la respuesta y volvía a leerlo todo antes de pintar:
dos viajes a Irlanda con el cocinero esperando. **Ahora se tacha al momento** y se manda por detrás,
como hacen las pantallas de cocina de Toast o Square. Lo que va de camino se pinta igual que lo tachado
sin internet (`conLoTachado`), y se quita cuando Estook ya lo dice. **Los toques salen en fila**:
tachar y destachar seguidos no llegan al revés. Si Estook no lo acepta, el plato vuelve a su sitio y se
dice; si se corta justo entonces, se guarda como lo de sin internet y sube al volver.

### Mandar a cocina, de una vez (punto 3)

«Mandar» hacía dos órdenes seguidas (`pedir` y `mandar_a_cocina`) y, entre una y otra, **volvía a leer
toda la sala** (el plano, la mesa y las impresoras). La cocina esperaba a las dos. Ahora:

- **`mandar_a_cocina` acepta los platos nuevos** y los pide en la misma transacción, con las mismas
  reglas que `pedir` (agotados, opciones, menús, la botonera). Si un plato no vale, no entra nada. No es
  un comando nuevo: la API sigue con 119 consultas y 334 comandos.
- **Con internet, una sola orden**, y solo se espera a releer esa mesa; lo demás se relee por detrás.
  Marchar, igual.
- **Sin internet, como siempre**, por partes y guardadas en el aparato (T5 · 2 · 1). Si se corta justo
  al mandar, se sigue por ese camino; pedir dos veces lo mismo no lo pide dos veces (cada plato lleva
  su id).

### El logo que volvía, y el que tardaba (punto 2)

- **Volvía** porque la app se recargaba sola si, al abrirla, llegaba una versión nueva y no se había
  tocado nada en 15 segundos. Como se publica varias veces al día, pasaba a menudo. **Ahora no se
  recarga nunca delante de nadie**: la que está abierta sigue con la suya, la nueva entra la próxima
  vez que se abra, y solo se recarga si la página no se está viendo. Un trozo que ya no existe lo
  sigue arreglando `SiAlgoFalla`, como hasta ahora. En Estook y en Estook TPV.
- **Tardaba** porque esperaba a que Irlanda dijera quién eres. **Ahora, quien ya entró en ese aparato
  abre con lo guardado de quién es** y se vuelve a preguntar al momento; el Panel sale con sus siluetas
  y se lee. Solo si ibas al Panel o al de la cadena: elegir local o plan, la puerta y el alta se
  preguntan siempre (es lo que hizo quitar lo guardado al abrir el 1-oct, y no vuelve).

### La barra de arriba del iPhone (punto 4)

Con `black-translucent` la página se pintaba debajo del reloj y, desde iOS 26, el iPhone pone encima su
difuminado: el «cristal raro». Además, ese modo tiene un fallo abierto en iOS 26 (WebKit 301994,
reabierto en octubre de 2026). **Ahora la barra del reloj es opaca**: en Estook, clara con el tema claro
y negra con el oscuro (lo pone `tema-al-arrancar.js` antes de pintar); en Estook TPV, negra. **Solo se
comprueba en el iPhone**: lo prueba Richi.

## 3 · Lo que decidió la IA al construirlo

1. Ampliar `mandar_a_cocina` en vez de un comando nuevo: el mismo nombre que ya entienden la caja de
   centro y lo guardado sin internet, y la API no crece.
2. Esperar solo a la mesa al mandar y al marchar; el resto de acciones de la sala siguen esperando a
   releerla entera, como hasta hoy.
3. Recuperar al abrir solo `quien_soy`, y solo con destino Panel o cadena; nunca las cifras.
4. Recargar con la versión nueva solo con la página oculta, en vez de un aviso «Hay versión nueva».
5. El color de la barra del navegador (`theme-color`) también sigue al tema, que antes era siempre
   oscuro.
