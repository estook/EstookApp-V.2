# Pasos de M20A · Estook TPV

> ## Cómo está
>
> Leído el 23 de octubre de 2026, en producción y en solo lectura.
>
> | Qué              | Cómo está                                                                               |
> | ---------------- | --------------------------------------------------------------------------------------- |
> | Pull requests    | **#130 y #131 fusionadas** (M20A · 1). **Estook TPV entero** (solo documentos), abierta |
> | La base de datos | **82 de 82** migraciones (la 0082, migrada)                                             |
> | La API           | Desplegada con M20A · 1 · 2: **107 consultas y 253 comandos**                           |
>
> **M20A · 1 está en producción entera**: fusionada, migrada, desplegada y comprobada el 23-oct.
> Lo de antes, en [`pasos-de-m16a.md`](pasos-de-m16a.md).

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · leer Estook TPV entero y fusionarlo

Es **solo documentos**: no hay migración ni API que desplegar.

1. **Lee la decisión**: [`docs/decisiones/0107-estook-tpv-el-tpv-entero.md`](decisiones/0107-estook-tpv-el-tpv-entero.md).
   Tus once respuestas están en el apartado 2, tal cual las diste. **Mira sobre todo el
   apartado 6, «Lo que decidí yo»**: son diez cosas que no me dijiste y he decidido como lo hacen
   los mejores. Si alguna no te cuadra, dímelo con su número.
2. **Mira las maquetas** en [Estook TPV · el TPV completo](https://claude.ai/artifact/EUZuQhUJSg13As8qeUWk5X).
   Están corregidas con tus respuestas: el editor de la sala, sin centímetros; la pantalla nueva
   de **Productos**, con los tres caminos; y las mesas con las iniciales de su camarero.
3. **Si quieres el detalle**, está en el Anexo, **capítulo 11**: pantalla a pantalla, y al final
   (11.15) lo que se va a probar.
4. **En GitHub**: abre el pull request **«Estook TPV entero»** y, con las **tres comprobaciones en
   verde**, **Merge pull request** → **Confirm merge**.
5. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main` y `git pull`.
   **No hace falta `bd:migrar`**: no hay migración.

**Si algo falla, o algo no te cuadra:** dímelo antes de fusionar. No hace falta deshacer nada.

## Lo que hay hoy en `estook.com/tpv/`, para que no te líe

- **Son las primeras pantallas (M20A · 1 · 2)**, las que no te gustaron: entran con tu sesión de
  Estook y el plano se dibuja en Estook › Ajustes › Tu sala. **Se rehacen enteras** en T1 a T3.
  Puedes seguir probándolas, pero **no las uses en un servicio de verdad**.
- **No hay todavía**: vincular aparatos, el PIN de cada uno, el inicio, la caja, el editor del plano
  en el TPV, la botonera, la pantalla de cocina, imprimir ni cobrar. Cada cosa tiene su entrega en
  [el plan](m20a-la-sala-y-la-cocina.md).

## Lo siguiente · T1 · La puerta

Cuando fusiones, empiezo **T1**: vincular aparatos con un código y su función (caja, comandero,
pantalla de cocina, pantalla de barra o fichar), entrar con el PIN, el bloqueo, el inicio y el
tema oscuro, y quitar «Abrir la sala» de Estook. **Hecha el 24-oct: sus pasos, en [`pasos-de-t1.md`](pasos-de-t1.md).**
