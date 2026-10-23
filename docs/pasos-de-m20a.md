# Pasos de M20A · La sala y la cocina

> ## Cómo está
>
> Leído el 23 de octubre de 2026.
>
> | Qué              | Cómo está                                                                    |
> | ---------------- | ---------------------------------------------------------------------------- |
> | Pull requests    | **#129 fusionada** (lo decidido, solo documentos). **M20A · 1 · 1**, abierta |
> | La base de datos | **80 de 80** migraciones; con 1 · 1 llega la **0081**                        |
> | La API           | Desplegada con M16a (102 consultas y 230 comandos); con 1 · 1, **105 y 253** |
>
> Lo de antes, en [`pasos-de-m16a.md`](pasos-de-m16a.md).

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · M20A · 1 · 1, la sala y la cocina por dentro

Lo hecho y por qué, en [el plan de M20A](m20a-la-sala-y-la-cocina.md) y en la
[0106](decisiones/0106-estook-tpv-la-sala-y-la-cocina.md). **Con migración (0081) y con la API.**
**No hay pantallas todavía**: en la app no vas a ver nada nuevo. Es la base y la API de la sala y
la cocina, probadas jugando la mesa 6 entera. Hazlo **en este orden y seguido**.

1. **En GitHub**: abre el pull request **«M20A · 1 · 1 · La sala y la cocina, por dentro»** y, con
   las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y
   `.\estook.cmd bd:migrar`. Tiene que decir que aplica **la 0081** y que hay **81 en total**.
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **Dímelo**, y compruebo yo que la API desplegada tiene **105 consultas y 253 comandos**.

**Si algo falla:** dime en qué paso y qué pone. No hace falta deshacer nada: la app sigue igual.

## Lo que no está todavía, para que no lo busques

- **La pantalla de la sala** (el plano, Bebidas · Carta · Menú del día, la nota y las opciones de la
  mesa) y **Ajustes › Sala** para dibujar tus mesas: M20A · 1 · 2.
- **La pantalla de cocina** (En marcha · Delivery · Fuera, con su sonido): M20A · 1 · 3.
- **Las bebidas montadas desde el almacén** (las copas y los cafés): M20A · 1 · 4.
- **Imprimir** y **cobrar**: Estook Link (M19a) y M20C.
