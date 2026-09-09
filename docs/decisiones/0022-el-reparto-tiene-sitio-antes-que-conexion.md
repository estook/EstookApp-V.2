# 0022 · El reparto tiene sitio antes que conexión

**Fecha:** 9 de septiembre de 2026
**Estado:** decidido y construido en M6½ · segunda tanda · la conexión es M29

## Lo que se pidió

«No veo opción delivery, añádelo, es importante, y conectaremos únicamente Uber
Eats. Pon el icono y todo.»

## Lo decidido

**Servicio gana un destino, `Delivery`**, con su icono, marcado con su módulo. La
pantalla existe, dice qué va a entrar por ahí y nombra los canales —Uber Eats el
primero, Glovo y Just Eat después—. **Y no tiene ni un botón de conectar.**

Y **el Panel gana un widget**, «Pedidos de delivery», que sale en el catálogo en
gris con su módulo: saber que va a haber pedidos de reparto cambia cómo te montas
el Panel hoy.

Es exactamente lo que se hizo con Fogón en M6
([decisión 0015](0015-fogon-es-una-burbuja-no-una-pestana.md)): **dónde vive algo
es navegación, y la navegación se decide ahora**. Dejarlo para M29 obligaría a
rehacer la barra de Servicio, el menú lateral y el catálogo de widgets cuando
llegue, y hasta entonces la pregunta «¿y los pedidos de Uber Eats?» no tendría
respuesta en ninguna parte de la aplicación.

## Por qué en Servicio y no en Carta

Porque lo que se mira en esa pantalla son **los pedidos que están entrando ahora**,
y esa es la pregunta de Servicio: «¿qué está pasando hoy?» (Evolución 1.0, capítulo
4). Lo que se publica en cada canal y a qué precio es de Carta, y ahí vive: «Carta ·
Análisis · Por canal».

Esa separación no es cosmética. Un plato puede valer distinto en la carta de sala y
en la de reparto, con la comisión del canal por medio, así que **el margen de
delivery se mira aparte**; pero una venta de reparto descuenta género del libro de
movimientos igual que la del TPV, así que **el inventario no se entera de por dónde
entró**. Eso segundo ya está construido desde M6.

## Y cómo cabe sin pasar de cuatro destinos

Servicio tenía `Jornada · Ventas · APPCC · Cierre`. **El cierre pasa a ser una vista
de la jornada**, que es lo que es: cerrar la jornada es el final de la jornada, no
otro sitio. Separarlo gastaba una de las cuatro posiciones de la app en algo que se
hace una vez al día, y dejaba fuera el reparto.

Queda `Jornada · Ventas · Delivery · APPCC`, cuatro, como manda B5.

## Lo que no se hace, y por qué

**No hay botón de «Conectar Uber Eats».** «Ninguna integración se da por disponible
hasta verificar sus requisitos y capacidades reales» (Evolución 1.0, capítulo 16, y
es la lección entera del 11.1). Un botón que abriera un cartel sería el fallo que
este proyecto lleva persiguiendo desde M4 **en el sitio donde más caro sale**: el
que hace pensar que el dinero ya está entrando solo.

**Y el icono es de la categoría, no de la marca.** La bici del repartidor vale para
Uber Eats, para Glovo y para el chaval que reparte por su cuenta. Los logotipos de
las marcas no entran en el paquete de iconos: son de otros y llevan sus reglas de
uso. Cada canal traerá el suyo cuando se conecte de verdad.
