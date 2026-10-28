# La auditoría del 28 de octubre

> **Lo que pidió Richi:** que todo sea coherente y tenga sentido —documentos, Estook TPV, tickets,
> caja, aparatos y roles—, ordenar lo viejo y dejarlo listo para seguir. Sin vibe coding: lo que es
> decisión suya se pregunta.

## Lo que se ha mirado

- **Producción**, en solo lectura: 93 migraciones, la API con 115 consultas y 312 comandos, el reloj,
  y los dos manifiestos y trabajadores publicados tras la #149.
- **GitHub por dentro**: las vueltas de la #148 y la #149, sin flaky; el instalador de Windows se
  construye.
- **Los documentos**: los 209, sus enlaces, y todo lo que nombra a Estook Link.
- **Estook TPV en los maestros**: lo decidido y lo pendiente del Anexo, los aparatos (3.4), la
  precuenta, sin red, cobrar y la caja (5), y la tabla de Roles 1.12 **contra los permisos que de
  verdad da la base**.
- **Lo que hacen los mejores TPV** (venta rápida, dividir, traspasos, X y Z, arqueo ciego, vales,
  propinas): el Anexo lo cubre todo menos el precio por franja horaria.

## Lo arreglado

| Qué estaba mal                                                                                              | Dónde                                               |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Estook TPV instalado se convertía en Estook, y el navegador no se enteraba del cambio (lecciones 235 y 236) | #149, en producción                                 |
| El Plan decía que el camarero abre Estook TPV «con su sesión» y que se llega por el Panel y Servicio        | Plan, «Sala y Cocina viven en Estook TPV»           |
| «En qué planes entra Estook TPV» seguía pendiente; Richi lo contestó: Pro y Cadena                          | Anexo, lo decidido                                  |
| Roles decía «desde Estook no se entra al TPV», sin el botón nuevo de Ajustes                                | Roles, «Dónde abre cada uno»                        |
| Ajustes › Tu local prometía «sala», que salió de ahí en T2                                                  | `lasSeccionesDeAjustes.ts`                          |
| M19a se seguía llamando «Estook Link» (es la caja para Windows desde la 0119)                               | `m20-ventas-y-consumo.md`, `coste-por-local.md`     |
| Un enlace roto en la 0114, y nada que vigilara los enlaces                                                  | La 0114 y `los-enlaces-de-los-documentos.prueba.ts` |
| 58 papeles sueltos en `docs/`: 28 eran de entregas cerradas                                                 | `docs/historia/` y `docs/auditorias/`               |

## Lo que necesita a Richi

1. **El candado de Esencial y el cobro** (pregunta 1 de [la maqueta](../maquetas/estook-tpv-en-ajustes.html)):
   el cobro llega con T6 y T7; el candado no puede prometerlo antes.
2. **Esencial: ¿nada de Estook TPV, o solo no cobra?** (pregunta 2). **Hoy la API no mira el plan**:
   un local en Esencial usa la sala y la cocina entrando por `estook.com/tpv`.
3. **El conector de un TPV ajeno (M19b), que todavía se llama Estook Link.** Lo de imprimir y sin
   internet ya va dentro de la caja para Windows. Queda el programa que sube las ventas de otro TPV
   (Revo, por ejemplo). **Propuesta:** que sea **el mismo programa de Windows**, que en un local con
   otro TPV solo conecta, y que el nombre Estook Link desaparezca. Un solo instalador, una sola
   firma y una sola forma de actualizarse.

## Lo que se construye con el botón, sin preguntar

- **La pantalla de elegir plan dirá «Estook TPV incluido» en Pro.** Hoy Pro promete «Conexión
  automática con tu TPV» y no nombra el nuestro (`packages/dominio/src/registro.ts`).
- **La API mirará el plan** según lo que conteste Richi en la 2. Cadena lo tiene; Pausa, no; la
  cuenta de la casa (IKATZ), todo.

## Lo que hay que saber, sin ser un fallo

- **El programa de Windows no está publicado**: hasta el paso 5 de [T5 · 1](../pasos-de-t5-1.md),
  «Descargar» no baja nada.
- **El enlace de descarga vive en GitHub**: el día que el repositorio pase a privado (la mudanza),
  hay que llevar el programa al alojamiento nuevo antes.
- **Precio por franja horaria** (la caña más barata de 19 a 21): ningún documento lo trae. Se propone
  con la botonera cuando Richi diga si sus clientes lo usan.
- Cuatro avisos de lint de siempre en `apps/tpv/src/plano` y el aviso de GitHub sobre Node 20: no
  rompen nada.

## Lo que no ha cubierto esta pasada

**Las pantallas una a una en el móvil, la velocidad medida y el servidor línea a línea.** Son
centenares de ficheros. Se hacen en la siguiente pasada, por partes (Estook, Estook TPV y la API),
cada una con sus capturas y sus números.
