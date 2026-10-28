# 0083 · La experiencia: el menú a la izquierda, el Panel con widgets distintos, las gráficas que se tocan, Compras en tres, las fotos del equipo y la primera contraseña con el PIN

**Fecha:** 14 de octubre de 2026
**Estado:** construido el 14-oct, en su pull request. **Con migración** (`0064_la_foto_de_cada_uno`: dos columnas en `estook.persona`) y **con despliegue de la API**: 81 consultas y **174 comandos** (llegan `poner_foto_de_persona` y `quitar_foto_de_persona`; `cambiar_mi_clave` pide el PIN). Sin secretos nuevos y sin cubos nuevos: la foto va en el de las fotos de producto, bajo `personas/`.
**Cambia:** la tabla B5 del [Plan](../maestros/Estook-Plan-de-Desarrollo.md) (Almacén: Movimientos fuera de la barra; Movimientos: Inventario primero; Compras: tres vistas; y la navegación del ordenador, a la izquierda), el catálogo de widgets del Manifiesto 6 (un tamaño por widget, el periodo dentro) y la paleta oscura de B1 (grafito).

Lo pidió Richi el 13-oct con siete capturas: «siento que es algo lioso todo y que no parece una app verdaderamente profesional». El plan, punto por punto, en [`la-experiencia.md`](../historia/modulos/la-experiencia.md); lo que se encontró, en la [auditoría del 14-oct](../auditorias/auditoria-2026-10-14-la-experiencia.md).

## Lo que pidió Richi, y lo que se hace

1. **«Pedir dos veces la contraseña; cuando entran con el PIN, pedir el PIN que te dieron y dos contraseñas nuevas.»** «La nueva» y «Repítela» (no deja guardar si no coinciden), y **quien todavía no tiene contraseña dice su PIN**. Lo comprueba el servidor, con los mismos intentos y el mismo bloqueo que al entrar. Era, además, el único sitio por el que se podía quedar alguien con una cuenta ajena desde un móvil con la sesión abierta.
2. **Movimientos: Inventario, Historial y Consumo**, en ese orden.
3. **Compras, de cinco pestañas a tres**, en el orden del día: **Pedidos** (abiertos, **Llegado** —lo que eran los albaranes— y cancelados) · **Facturas** · **Proveedores** (con «Precios» plegado encima). Los enlaces de antes llevan a su sitio.
4. **Movimientos fuera de la barra de Almacén**, con el botón largo **«Revisar movimientos»** debajo de «Cómo va». Almacén queda en Resumen · Productos · Compras · Mermas, que es lo que cabe en la barra de abajo del móvil.
5. **Los widgets**: dieciséis en vez de más de cuarenta, **cada uno con su tamaño y su dibujo**, **el periodo dentro** («7 d · 30 d», recordado en el aparato) y, los de cifra, **se abren al tocarlos** con la gráfica grande, la media y lo que va al lado (en Ventas, el ticket medio, las cajas y el food cost). Los Paneles guardados se traducen solos a los nuevos.
6. **Gráficas profesionales y que se tocan**: área con degradado y barras redondeadas (Recharts, cargado aparte), medidores en media luna para los objetivos y un anillo para la jornada. El dato sale al pasar el dedo o el ratón; todo a cero no se dibuja.
7. **El menú a la izquierda en el ordenador**, oscuro en los dos temas y plegable: plegado, **el logo del local** y el icono de cada app (sus destinos, al pulsarla); abierto, **el logo de Estook**, el local y cada app con sus destinos colgando. Arriba queda una barra fina: dónde estás, el buscador, la campana, el chat, **el claro y el oscuro** y tu cara. En el móvil, la barra de siempre.
8. **El hueco a los lados**: el contenido ocupa lo que deja el menú, con un tope de 112 rem que solo se nota en pantallas enormes; el Panel tiene como mucho cuatro columnas, por lo que mide él y no la pantalla.
9. **Más moderno sin perder la marca**: el oscuro pasa a **grafito** con brillo en las tarjetas; las cabeceras de cada pantalla dejan la pregunta y las migas; las pestañas son un control segmentado; los filtros de Productos caben en una línea; Personas es una línea por persona.
10. **Fotos del equipo, cuadradas con las esquinas redondeadas**. Todas las caras de Estook pasan a ese cuadrado, rellenas de su color, y llevan la foto si la hay: en el menú, en la barra, en Personas, en la ficha, en «Equipo ahora» y en «Tu cuenta».
11. **El logo del local tal cual lo suben**, más grande y sin el círculo de color; y **el saludo**: «Hola, Ricardo 👋 · Esto es lo de hoy en IKATZ».

## Lo que decidí al construirlo

1. Que el menú del ordenador sea **oscuro también en el tema claro**, como la referencia «Money T» que trajo Richi: separa la navegación del trabajo sin una línea.
2. Que la primera vez salga **abierto en pantallas de 1.280 px o más** y plegado en las más pequeñas; luego se recuerda.
3. Que Escandallos, Carta y Cuaderno, que todavía no tienen nada construido, vayan **juntas y cerradas en «Próximamente»** en el menú. En la rueda del móvil siguen como estaban.
4. **Los widgets que se quitan**: «Cuánto género», «Sin precio» (va dentro de Bajo mínimo), «Personas» (va en Equipo ahora), «Lo último apuntado» (está en Movimientos), «Ventas de hoy» (va en Ventas, con su gráfica) y las cifras sueltas de 7 y 30 días. Los de módulos futuros no se ofrecen.
5. Que **el periodo de cada widget se recuerde en el aparato**, no en la cuenta: el Panel ya es por tipo de aparato, y el servidor no tenía dónde guardarlo sin otra migración.
6. Que **la merma de quien no ve precios** siga en su Panel, con el número de apuntes y su botón, sin euros.
7. Que la foto se guarde **en el cubo que ya existe** (`fotos-de-producto/personas/…`), para no pedir a Richi crear otro con `almacen:preparar`; y que se recorte **en cuadrado de 320 px en el aparato**, antes de subir.
8. Que **la pongan la propia persona y quien da accesos** en su local, las dos políticas que ya tenía `estook.persona`. Quien entra con Google y no tiene PIN pone su primera contraseña sin PIN: Google ya dijo quién es.
9. Que la pastilla elegida de las vistas y los filtros sea **del color del texto** en las ocho apps, no del acento de cada una: se lee igual en claro y en oscuro.
10. **Una historia de ejemplo para mirar las gráficas** (`CON_HISTORIA=1 pnpm api:pruebas`): un mes de caja y de horas en Bar Centro, solo en la API de pruebas y solo si se pide.

## Lo que no se hace, y por qué

- **Rediseñar por dentro Ajustes, el chat, el horario y el cierre de caja.** Se ven con el aspecto nuevo, pero no se tocan: Richi no los señaló y funcionan. Va en la lista de propuestas.
- **Cambiar el admin**: lo usan dos personas.
- **Guardar el periodo de cada widget en el servidor**: haría falta otra columna; se hará si alguien lo echa de menos al cambiar de aparato.
- **Avisar a la persona de que le han puesto una foto.** Queda en el registro de cambios (auditoría) como cualquier cambio de su ficha.
