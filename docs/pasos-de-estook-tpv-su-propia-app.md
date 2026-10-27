# Pasos de «Estook TPV, su propia app»

> ## Cómo está
>
> **En su pull request, sin fusionar** (27 de octubre de 2026). **Sin migración y sin tocar la API**:
> solo fusionar, y se publica solo.
>
> | Qué              | Cómo está                                                        |
> | ---------------- | ---------------------------------------------------------------- |
> | Pull request     | **«Estook TPV, su propia app»**, rama `estook-tpv-su-propia-app` |
> | La base de datos | **93 de 93**, no cambia                                          |
> | La API           | **115 consultas y 312 comandos**, no cambia                      |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Qué pasaba, en dos frases

- Al poner **Estook TPV en el escritorio** desde el navegador, Chrome decía que había que
  **actualizar** y acababa abriendo **Estook** (`/app/`). Para el navegador eran **la misma app**:
  las dos se presentaban con el mismo carné (el `id` del manifiesto), y el carné se lee contra
  `estook.com`, no contra la carpeta. Pasaba desde el 25-oct, cuando Estook TPV se hizo instalable
  ([lección 235](lecciones.md)).
- Ahora **cada una tiene el suyo**: Estook, el de siempre (los móviles donde ya está instalada no
  notan nada), y Estook TPV, `estook.com/tpv/`. Y el navegador **se entera** de que el carné ha
  cambiado, que antes no se enteraba ([lección 236](lecciones.md)).

**Entrar por la web nunca falló**: `estook.com/tpv/` en el navegador abre Estook TPV. Y **la caja
para Windows** (el programa, T5 · 1) es otra cosa, que no tiene este problema.

## Lo que te toca

1. **En GitHub**: abre **«Estook TPV, su propia app»**. Con las comprobaciones **en verde**,
   **Merge pull request** → **Confirm merge**. Espera a que **«Publicar en GitHub Pages»**, en
   **Actions**, salga con el **círculo verde** (unos 3 minutos).
2. **En PowerShell**, para tener la carpeta al día:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

3. **En el PC donde pusiste Estook TPV en el escritorio**, quita lo instalado, porque se quedó
   mezclado:
   - **Inicio › Configuración › Aplicaciones › Aplicaciones instaladas**, busca **«Estook»** y
     **Desinstalar** las que salgan (Estook y Estook TPV).
   - **Qué debe salir:** ya no hay ningún Estook en la lista. Tus datos no se pierden: viven en el
     servidor.
4. **En ese PC, en Chrome**, abre `estook.com/tpv/` y **recarga dos veces** (la primera trae lo
   nuevo, la segunda lo usa). Arriba, en la barra de la dirección, toca el icono de **instalar** (una
   pantalla con una flecha) o la franja **«Instala Estook TPV»**.
   - **Qué debe salir:** pide instalar **«Estook TPV»**, sin hablar de actualizar. Se abre en su
     ventana, oscura, con «Vincula este aparato a tu local» o con tu sala.
5. **Ahora `estook.com/app/`** en Chrome, e instálala igual.
   - **Qué debe salir:** **«Estook»**, otra app distinta. En el escritorio, **dos iconos**, cada uno
     abre lo suyo.

**Si una tablet o un móvil ya tenía Estook TPV en la pantalla de inicio**, haz lo mismo: quítalo y
vuelve a ponerlo desde `estook.com/tpv/`.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Para el PC de la caja, el programa

En el PC de la caja de un local **lo bueno es la caja para Windows** (imprime y abre el cajón), no
el icono del navegador. Se baja de la franja **«Descarga la caja para Windows»** de Estook TPV, y
el enlace sirve también para tu web:

`https://github.com/estook/EstookApp-V.2/releases/latest/download/Estook-TPV-caja-para-Windows.exe`

**Hoy ese enlace no baja nada**: el programa todavía no está publicado. Se publica con el paso 5 de
[los pasos de T5 · 1](pasos-de-t5-1.md). Y **el día que el repositorio pase a privado** (la
mudanza), el enlace deja de servir: hay que llevar el programa al alojamiento nuevo antes.
