# 0034 · Nadie gestiona el acceso de su igual: lo hace quien está por encima de los dos

**Fecha:** 11 de septiembre de 2026
**Estado:** decidido y construido en el repaso de M7

## Lo que pidió Richi

«Que los gerentes, o gente en el mismo nivel, no se puedan echar ni retirar el
acceso a gente de su nivel.»

Hasta ahora el permiso decía **qué** se podía hacer —invitar, retirar un acceso,
cambiar una contraseña— pero no **a quién**. Dos gerentes del mismo local podían
retirarse el acceso el uno al otro, y un gerente podía invitar a alguien como
director de área.

## Lo que se decide

### La regla

Cada rol tiene su **amplitud** en la base (`rol.amplitud`, del documento de Roles):

| Rol                             | Amplitud |
| ------------------------------- | -------- |
| Dirección                       | 100      |
| Administración                  | 90       |
| Director de área                | 80       |
| Gerente                         | 70       |
| Chef, compras, recursos humanos | 60       |
| Jefe de cocina, jefe de sala    | 50       |
| Cocinero, camarero              | 30       |
| Gestoría                        | 10       |

La amplitud de una persona es la mayor de sus membresías vivas en la organización.
**Se gestiona a alguien solo si se está por encima**: `mía > suya`. Con dos
excepciones, y las dos a propósito:

- **A uno mismo, nunca** desde la gestión de otros: nadie se retira su propio
  acceso ni se reactiva. Su propio PIN sí, que es «Mi acceso».
- **La dirección puede con todos**, también con otra dirección: alguien tiene que
  tener la última palabra, y en una organización es ella.

### Dónde se aplica

En el servidor, en un solo sitio (`servidor/aplicacion/jerarquia.ts`), y desde todos
los comandos que tocan a otra persona:

| Comando                           | Qué comprueba                                 |
| --------------------------------- | --------------------------------------------- |
| `retirar_acceso`                  | que quien retira esté por encima              |
| `reactivar_persona`               | que esté por encima, y que no dé un rol mayor |
| `poner_clave_a` · `regenerar_pin` | que esté por encima (el PIN propio, libre)    |
| `invitar_persona`                 | que el rol que da quede por debajo del suyo   |

La respuesta es `sin_permiso`, con la frase: «a alguien de tu mismo nivel, o de más
arriba, lo hace quien está por encima de los dos».

**Invitar, también solo por debajo**, y no «hasta tu nivel». Se probó la otra forma y
dejaba un callejón: un gerente nombraba a otro gerente y en el mismo minuto no podía
darle la contraseña, porque ya era su igual. Quien nombra es quien después gestiona,
así que a un gerente lo nombra quien está por encima de los dos. La pantalla de
invitar solo ofrece los roles que se pueden dar (`rolesQuePuedoDar`, de `quien_soy`).

**Y el guardián de siempre va primero.** Si la última dirección intenta irse, oye «el
negocio se queda sin nadie que lo administre», que le dice qué hacer, y no «no es
tu nivel».

### Y la pantalla lo dice antes

`quien_tiene_acceso` devuelve `puedoGestionar` por persona, y **Equipo → Accesos** no
enseña un botón que va a decir que no: donde no se puede, dice «Lo lleva quien está
por encima». Es la regla 26: lo que protege el dato y lo que lo enseña son dos
capas, y se prueban las dos (`lo-que-vio-richi.prueba.ts`).

## Lo que no cambia

La matriz de permisos sigue siendo la que dice **qué** se puede hacer; esto solo
añade **a quién**. Un rol sin `app.equipo` en editar sigue sin poder gestionar a
nadie, esté por encima o no.
