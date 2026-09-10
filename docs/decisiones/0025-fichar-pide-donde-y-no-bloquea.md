# 0025 · Fichar pide dónde, y no bloquea nunca

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido y construido en M6½ · migración `0027`
**Sustituye:** la frase del Manifiesto «Nada de geolocalización ni de huella» y el
«error típico» de M15 «añadir huella o GPS». **La huella sigue fuera.**

## Lo que se pidió

Richi, en la lista de M6½: que fichar pida la ubicación **al entrar y al salir**,
que cuente las horas y que los encargados lo vean. Que cada persona tenga su
perfil —horas, fichajes, puesto, si está en línea o cuándo entró— y que quien la
lleva le ponga lo que cobra, por hora o al mes, **en privado**. Y una pestaña de
resumen: el gerente y el manager ven a todos; el jefe de cocina, a los cocineros;
el jefe de sala, a los camareros.

## Por qué el Manifiesto decía lo contrario, y por qué deja de valer

Lo que el Manifiesto temía del GPS eran dos cosas, y las dos siguen siendo
ciertas: que **bloquee** —sin señal no se ficha, y el registro se llena de huecos
que nadie sabe explicar— y que sea **vigilancia**. Lo que se decide respeta las
dos:

- **Se pide siempre, y no se exige nunca.** Si la persona no da permiso, si no hay
  señal o si el aparato no la da, se ficha igual y **queda escrito por qué**, de
  una lista cerrada: `la_nego`, `sin_senal`, `no_la_da_el_aparato`.
- **Solo en el instante de fichar.** No se sigue a nadie: se guarda la posición
  de ese momento y a cuántos metros del local cae.
- **Un fichaje lejos no se rechaza: se señala.** Lo mira quien lleva el equipo.

La foto del puesto de trabajo que proponía el Manifiesto como comprobante deja de
hacer falta: la posición dice lo mismo sin pedirle nada a nadie.

## Cómo es por dentro

**El fichaje** (`estook.fichaje`) es una fila por turno. La de hoy sin salida es
quien está dentro, y **solo puede haber una abierta por persona** (índice único).
La hora la pone el servidor, y la jornada, `jornadaDe`.

La base obliga a que cada entrada diga **o su posición o por qué no la hay, nunca
las dos ni ninguna**. La salida igual, **salvo cuando la pone quien corrige**: el
caso más normal de corregir es la salida que alguien olvidó, y ahí no hay aparato
al que preguntar; el porqué es el motivo de la corrección.

**El local** guarda su posición y un radio (100 m de fábrica, entre 10 y 5.000).
Se marca en Ajustes desde el propio local: «estoy en el local: márcalo». Cambiar
el radio no borra la posición.

**Corregir** exige permiso de Equipo, **nombre y motivo** —la restricción lo pide
en la base, no solo la pantalla— y deja el antes y el después en la auditoría. No
hay borrado. Y lo que no se manda no se toca: corregir la entrada no le quita la
salida a nadie.

## Quién ve las horas de quién

Lo decide **una función de la base**, `estook.a_quien_lleva(local)`:

| Quien mira                       | Ve a                        |
| -------------------------------- | --------------------------- |
| Gerente, y quien está por encima | todo el local               |
| Jefe de cocina                   | cocineros y jefes de cocina |
| Jefe de sala                     | camareros y jefes de sala   |
| Cualquier otro                   | a sí mismo                  |

Las políticas de los fichajes la usan, y las consultas **no filtran por su
cuenta**: una pantalla que filtra lo que le llega es una pantalla que un día se
olvida de filtrar. Es `security definer` —la número diecisiete— porque tiene que
leer los roles de los demás, que la persona que mira no puede leer.

## Lo que cobra cada uno

**Por hora**, o **al mes con sus horas de contrato**: un sueldo mensual sin horas no
se puede repartir, y entonces el coste de un turno sería un invento. La base lo
rechaza. El coste de una hora sale de `importe ÷ (horas semanales × 52 ÷ 12)`, en
el dominio (`costeDeUnaHora`).

- **Cada uno ve el suyo.** El de los demás lo ve y lo pone quien tiene
  `dato.coste_de_personal`; a quien no lo tiene **no le llega**.
- **Nunca hacia arriba**: nadie pone ni mira lo que cobra alguien con un rol más
  amplio que el suyo. Y **nadie se pone el suyo**.
- Tiene vigencia: poner uno nuevo cierra el anterior el día de antes.

## El horario de siempre

Qué días entra cada persona y a qué hora (`estook.horario_habitual`). Es poco, y
es la base de dos cosas que vienen: los avisos «mañana entras a las 9» y «entras
en 5 minutos, ficha ya» (M25; hoy el widget de Fichar ya lo dice al abrir el
Panel) y el cuadrante que propondrá Fogón (M14).

## Lo que no se ha hecho, y dónde va

- El modo quiosco con PIN y, para el local que lo quiera, fichar **solo** desde sus
  aparatos: **M15**.
- Lo planificado contra lo fichado: **M14**, cuando haya cuadrante.
- Los avisos por el móvil sin abrir la app: **M25**.
- Los fichajes raros detectados solos en la auditoría de local: **M24**.
- El aviso a los empleados sobre el tratamiento de su posición, que exige el
  RGPD: **M27**, con el resto del registro de actividades.
