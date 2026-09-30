# Las copias de seguridad

**Escrito el 30 de septiembre de 2026** con la auditoría profunda
([decisión 0055](decisiones/0055-la-auditoria-profunda.md) y
[0061](decisiones/0061-el-orden-y-la-infraestructura.md)). Hasta ese día **no había
ninguna copia**: el plan gratuito de Supabase no las hace.

> **Aplazada por Richi el 30 de septiembre de 2026**
> ([decisión 0065](decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)): se
> enciende en la mudanza de alojamiento, con Supabase Pro. **Hasta entonces no hay
> ninguna copia.** El flujo está en el repositorio y no hace nada mientras falten sus
> secretos: cada lunes deja un aviso. **No cuesta dinero ni necesita Supabase Pro**, así
> que se puede encender cualquier día: son los pasos 2 y 3 de «La mudanza» en
> [`pasos-antes-de-m8.md`](pasos-antes-de-m8.md).

## Qué se copia, y dónde queda

| Qué                                     | Cómo                                                                              | Dónde queda                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **La base** (`estook` y `plataforma`)   | `pg_dump`, cada lunes a las 03:23 UTC, con el flujo «Copia de seguridad»          | GitHub → Actions → la vuelta → «copia-de-seguridad»                                   |
| **Los ficheros** (logos, fotos, cartas) | `herramientas/copia-de-los-ficheros.mjs`, en el mismo flujo, si está su clave     | Dentro del mismo fichero cifrado                                                      |
| **Comprobación**                        | La copia **se restaura sola en una base de prueba** en el mismo paso, y se cuenta | El resumen de la vuelta: migraciones, organizaciones, locales, personas y movimientos |

- **Todo sale cifrado** (AES-256 con `CLAVE_DE_LA_COPIA`), porque el repositorio es
  público. **Sin esa contraseña la copia no se abre**: Richi la guarda también en su
  gestor de contraseñas.
- **Se guarda noventa días**: unas doce copias semanales.
- **Con Supabase Pro** llega además la copia diaria de siete días, y con el TPV la
  recuperación a un punto exacto. **Esta semanal sigue**, porque vive fuera de Supabase.

## Lo que la copia no lleva, y dónde está

| Qué                                              | Dónde vive                               | Qué hacer al restaurar                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El esquema                                       | En la propia copia, y en las migraciones | Nada                                                                                                                                                           |
| Las extensiones (`pg_trgm`, `pg_cron`, `pg_net`) | En Supabase                              | En un proyecto nuevo, se crean antes de restaurar                                                                                                              |
| El secreto del reloj                             | El Vault de Supabase                     | En un proyecto nuevo, se genera otro, se guarda en el Vault como `estook_reloj` y su huella en `plataforma.reloj`, como hace la parte E de la migración `0047` |
| Los secretos de la API                           | Supabase → Edge Functions → Secrets      | Se vuelven a poner (`config/claves.md`)                                                                                                                        |
| La programación del reloj (`pg_cron`)            | Supabase                                 | En un proyecto nuevo, se programa como en esa misma parte E                                                                                                    |

## Restaurar, paso a paso

**Esto no se hace nunca a la ligera**: restaurar pisa la base. Primero se hace en una base
de prueba, se mira, y solo después sobre la de verdad.

1. **Bajar la copia.** GitHub → Actions → «Copia de seguridad» → la vuelta del día que se
   quiere → abajo, «copia-de-seguridad». Sale un `.zip` con un fichero
   `estook-AAAA-MM-DD.tar.gz.cifrado` dentro.
2. **Descifrarla**, en una terminal de Git Bash, en la carpeta donde esté:

   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in estook-AAAA-MM-DD.tar.gz.cifrado -out copia.tar.gz
   ```

   Pide la contraseña de la copia. Si no es la buena, dice `bad decrypt`.

3. **Abrirla:** `tar -xzf copia.tar.gz`. Salen `base.dump`, `lo-que-hay.txt` (lo que se
   contó al hacerla) y, si estaba la clave, la carpeta `ficheros`.
4. **Restaurar la base** en la base de destino, con `pg_restore` de la versión 17:

   ```bash
   pg_restore --no-owner --no-privileges --exit-on-error -d "<dirección de la base de destino>" base.dump
   ```

   En un proyecto de Supabase nuevo, antes: crear las extensiones del cuadro de arriba.

5. **Subir los ficheros** a sus cubos, con la misma carpeta que tienen dentro de
   `ficheros/` (`marca`, `fotos-de-producto`, `cartas`).
6. **El reloj y los secretos**, como dice el cuadro de arriba.
7. **Comprobar:** `.\estook.cmd bd:comprobar` y, desplegada la API,
   `.\estook.cmd bd:comprobar-api`.

## Si la copia falla

El flujo sale en rojo en GitHub → Actions, y el correo de GitHub avisa. Los motivos que se
pueden esperar:

- **Faltan los secretos**: lo dice el primer paso, con su nombre.
- **No se puede restaurar**: la copia no vale, y eso es justo lo que el flujo está para
  cazar. Se mira el paso «Restaurarla en una base de prueba» y se arregla antes del lunes
  siguiente.
- **La contraseña de la copia cambia**: las copias viejas siguen necesitando la vieja.
  Por eso no se cambia sin guardar las dos.
