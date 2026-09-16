# La web pública · `estook.com`

> **Cómo está (16 de septiembre de 2026):** una **portada básica**, a propósito
> ([0042](decisiones/0042-registro-abierto-google-y-la-oferta.md)). Existe para que desde
> `estook.com` se pueda **crear cuenta** y **entrar**. La de verdad es la Parte C del
> Plan, y se hace después.

## Lo que hay

| Página      | Dirección                 | Qué tiene                                                   |
| ----------- | ------------------------- | ----------------------------------------------------------- |
| La portada  | `estook.com/`             | Una frase, **Crear cuenta**, **Iniciar sesión**, tres cosas |
| Privacidad  | `estook.com/privacidad/`  | La política de privacidad, básica                           |
| Condiciones | `estook.com/condiciones/` | Las condiciones de uso, básicas                             |

Arriba en todas: el logo (a la portada), **Iniciar sesión** y **Crear cuenta** (este se
esconde en el móvil, porque en la portada ya está en grande). Abajo: Privacidad y
Condiciones.

**Los dos accesos:**

- **Crear cuenta** → `estook.com/app/#/crear-cuenta`. Nombre del negocio, aceptar las
  condiciones, y Google o correo con código.
- **Iniciar sesión** → `estook.com/app/`. Google, contraseña o PIN, y «¿No tienes cuenta?».

**La oferta:** si está encendida en **admin → Oferta**, la portada dice «Prueba N días
gratis, sin tarjeta» y el botón pasa a «Empezar la prueba». Lo pregunta a la API
(`como_se_entra`) al abrir; si la API no contesta, **no se anuncia nada** y la portada
se pinta igual.

## Dónde está el código

| Qué                       | Fichero                                              |
| ------------------------- | ---------------------------------------------------- |
| La portada                | `apps/web/src/Portada.tsx`                           |
| El marco (cabecera y pie) | `apps/web/src/Marco.tsx`                             |
| Privacidad y condiciones  | `apps/web/src/Privacidad.tsx`, `Condiciones.tsx`     |
| El titular y la versión   | `apps/web/src/Legal.tsx`                             |
| Las tres páginas          | `apps/web/index.html`, `privacidad/`, `condiciones/` |

Cada página tiene **su HTML** (`vite.config.ts`, `rollupOptions.input`): así
`estook.com/privacidad/` existe de verdad, y Google la encuentra cuando revise la app.

**Una trampa de Windows:** no pueden convivir `privacidad.tsx` y `Privacidad.tsx` en la
misma carpeta —Windows no distingue mayúsculas y uno pisa al otro—. Por eso las entradas
de cada página están en `src/paginas/`.

## Lo legal · lo que falta

- **El titular:** razón social, NIF y domicilio. Mientras no estén, se enseña el nombre
  comercial y el correo de contacto, **sin inventar nada**. Se rellenan en
  `TITULAR`, dentro de `Legal.tsx`, y se cambia `VERSION_DE_LOS_TEXTOS`.
- **Una revisión de alguien que sepa**, antes de crecer.
- **Stripe** se añadirá a la lista de proveedores de la privacidad cuando se conecte (E2).

## Lo que será la web de verdad (Parte C del Plan)

El encabezado con el problema en números, las ocho apps, cómo se conecta con tu TPV
(«no cambias de TPV» arriba, Manifiesto 30), los planes con sus precios, los documentos
de muestra y las preguntas frecuentes. **Nada de eso está hecho**, y la portada básica
no pretende parecerlo.
