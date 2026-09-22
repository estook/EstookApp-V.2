# Empezar un chat nuevo

**Para qué existe este papel.** Un chat nuevo no recuerda nada del anterior, y Richi
no tiene por qué llevar el estado del proyecto en la cabeza. Esto es lo que hay que
decir para arrancar, y **es corto a propósito**: todo lo demás ya está escrito.

---

## Lo que hay que escribir, tal cual

> Lee `ESTADO.md` entero y dime dónde estamos antes de tocar nada.

**Y ya está.** No hace falta más.

`ESTADO.md` dice qué está hecho, qué está a medias, en qué rama, qué falta de Richi y
cuál es la siguiente entrega. Si alguna vez hace falta contarle algo de palabra al
chat nuevo, **es que `ESTADO.md` se ha quedado corto**, y lo que toca es arreglar el
fichero, no repetirlo en el chat.

### Si vienes a seguir con algo concreto

Se añade una línea, y nada más:

> Lee `ESTADO.md` entero y dime dónde estamos antes de tocar nada.
> Quiero seguir con **la entrega V**, por donde se quedó.

O lo que toque: «con E2», «con el punto 3 de V», «quiero mirar un fallo que me sale
en…».

### Si vienes con un fallo

> Lee `ESTADO.md` entero. Me sale este error: _(pegar la pantalla o el texto)_.

Con una captura basta. Lo que ayuda de verdad es decir **qué estabas haciendo** y
**qué esperabas que pasara**.

---

## Lo que NO hace falta decir

- Ni el historial de lo hecho: está en `ESTADO.md` y en
  [`historia-de-los-modulos.md`](historia-de-los-modulos.md).
- Ni las reglas de trabajo: están en el
  [Plan de desarrollo](maestros/Estook-Plan-de-Desarrollo.md), parte A1.
- Ni por qué algo está hecho así: está en [`decisiones/`](decisiones/).
- Ni los documentos maestros: `ESTADO.md` los enlaza en su apartado 0.

---

## Las tres reglas que evitan perderse

Están en el Plan y se repiten aquí porque son las que más se notan cuando fallan:

1. **`ESTADO.md` se lee al empezar y se escribe al terminar.** Si dice algo que no es
   cierto, eso es un fallo y se arregla antes de seguir.
2. **Una entrega, una rama, un pull request.** Y no se fusiona sin que Richi lo mire
   en el TPV y en el móvil.
3. **Si aparece una decisión de producto que no está escrita, se para y se pregunta.**
   No se inventa.

---

## Cómo se sabe que un chat nuevo ha arrancado bien

Porque lo primero que hace es **decirte dónde estamos** y **preguntarte si sigue por
ahí**, en vez de empezar a escribir código. Si se pone a construir sin decirte antes
qué ha entendido, córtalo: no ha leído `ESTADO.md`.
