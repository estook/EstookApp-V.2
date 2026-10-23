# Pasos de M20A · La sala y la cocina

> ## Cómo está
>
> Leído el 23 de octubre de 2026, en producción y en solo lectura.
>
> | Qué              | Cómo está                                                                        |
> | ---------------- | -------------------------------------------------------------------------------- |
> | Pull requests    | **#130 fusionada** (M20A · 1 · 1). **M20A · 1 · 2 · La sala**, abierta           |
> | La base de datos | **81 de 81** migraciones (la 0081, migrada); con 1 · 2 llega la **0082**         |
> | La API           | Desplegada con 1 · 1: **105 consultas y 253 comandos**; con 1 · 2, **107 y 253** |
>
> **M20A · 1 · 1 está hecha entera**: fusionada, migrada, desplegada y comprobada el 23-oct.
> Lo de antes, en [`pasos-de-m16a.md`](pasos-de-m16a.md).

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · M20A · 1 · 2, la sala

Lo hecho y por qué, en [el plan de M20A](m20a-la-sala-y-la-cocina.md) («1 · 2, entregada»).
**Con migración (0082) y con la API.** Hazlo **en este orden y seguido**: hasta que despliegues,
Estook TPV abre pero no encuentra su carta.

1. **En GitHub**: abre el pull request **«M20A · 1 · 2 · La sala»** y, con las **tres
   comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y
   `.\estook.cmd bd:migrar`. Tiene que decir que aplica **la 0082** y que hay **82 en total**.
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **Pruébalo en IKATZ** (en el móvil, cierra la app y ábrela dos veces, que la primera trae la
   versión nueva):
   - **Dibuja tu sala**: Estook → **Ajustes › Tu local › Tu sala**. Pulsa **+ Zona**, escribe
     «Salón» y **Añadir**. Pulsa **Añadir mesa** unas cuantas veces: salen numeradas. **Arrastra**
     cada una a su sitio. Toca una para cambiarle las plazas o la forma (redonda, alargada).
   - **Tus bebidas**: en **Carta**, toca el nombre de una sección de bebidas (Bebidas, Vinos,
     Cafés…). Tiene que tener **«Es de bebidas»** encendido. Si alguna no lo tiene, enciéndelo.
   - **Abre la sala**: **Servicio › En marcha › Abrir la sala**. Sale el plano con tus mesas.
   - **Una mesa entera**: toca una mesa libre → **2** → **Abrir**. Empieza en **Bebidas**: pide
     dos cañas. Pasa a **Carta**, deja **«Va en el 1.º»** y pide un entrante; cambia a **2.º** y
     pide un principal. Toca el principal en la cuenta y escribe una nota. Pulsa **Mandar**: tiene
     que decir «Mandado: a cocina 2 y a la barra 1 · sale el 1.º, el 2.º espera». En la cuenta,
     junto a «2.º · en espera», pulsa **Marchar ya**: pasa a «en marcha».
   - **El menú del día**, si lo tienes montado hoy: pestaña **Menú del día**, elige los primeros
     y los segundos, **Añadir** y **Mandar**.
   - **Las opciones**: en el plano, toca la mesa abierta. Prueba **Cambiar de mesa** y
     **Liberar la mesa**.
5. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde.

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.

## Lo que no está todavía, para que no lo busques

- **La pantalla de cocina** (En marcha · Delivery · Fuera, tachar, con su sonido), y la **tablet
  del local con el PIN de cada uno**: M20A · 1 · 3. Mientras, nadie tacha, así que el aviso
  «ha salido todo el 1.º» no llega: marcha tú con **Marchar ya**. Cada camarero entra con su
  sesión de Estook.
- **Las copas que se hacen solas, varias raciones (caña, doble, jarra) y los cafés hechos**:
  M20A · 1 · 4.
- **Imprimir, cobrar, dividir la cuenta y la venta rápida**: Estook Link (M19a) y M20C. Hasta
  entonces se cobra en tu TPV de siempre y en la sala se libera la mesa.
