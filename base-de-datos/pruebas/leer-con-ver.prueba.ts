import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Quien solo puede ver, puede leer (M7).
 *
 * ── El fallo, y cómo salió ───────────────────────────────────────────────────
 *
 * El despachador pedía **«ver y editar»** también para las consultas. Así que a
 * quien la matriz le da un permiso solo para mirar se le cerraba la puerta hasta
 * para mirar:
 *
 *   · Un **jefe de cocina** tiene Equipo para ver: «ve los fichajes y las horas
 *     de la cocina» (Roles 1.6). Le salía «sin permiso» en quién está trabajando
 *     y en el resumen de horas.
 *   · Un **jefe de sala** tiene las ventas para ver: «las ventas del turno con su
 *     ticket medio» (Roles 1.5). Le salía «sin permiso» en los cierres.
 *   · Y un **cocinero**, que tiene el Calendario para ver, no podía leer «Lo que
 *     viene» del Panel, que es para él.
 *
 * Nadie lo vio en M6½ porque las pruebas de esas pantallas entraban como el
 * gerente, que lo tiene todo para editar. Es la lección 35 otra vez: **se prueba
 * con el rol más pequeño que puede hacerlo**. Lo encontró la prueba de compras de
 * M7 al preguntar por el Calendario como el cocinero.
 *
 * Leer pide poder ver; cambiar pide poder editar. Y lo que cada uno ve dentro de
 * lo que lee lo siguen decidiendo las políticas y las consultas: el jefe de
 * cocina lee las horas **de la cocina**, no las de todos.
 *
 * ── Y el segundo fallo, que salió al escribir esta prueba ────────────────────
 *
 * Con el primero arreglado, la tercera prueba seguía en rojo: a Marcos, con
 * Inventario recortado a «ver», **el despachador le dejaba ajustar la cámara**.
 * Si el nivel del local no llegaba, preguntaba por el de toda la organización,
 * que no mira los recortes de cada local. Lo paraba la política de la base, más
 * abajo, pero con un error que no era el suyo. Ahora la organización se pregunta
 * solo para lo que es de la organización.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('una consulta pide poder ver, no poder cambiar', () => {
  it('un jefe de cocina lee quién está trabajando y las horas de su cocina', async () => {
    const luis = await api.entrar('luis@ejemplo.estook.com');
    expect((await api.consultar(luis, 'fichajes_de_hoy')).estado).toBe('ok');
    expect((await api.consultar(luis, 'resumen_del_equipo', { periodo: 'semana' })).estado).toBe(
      'ok',
    );
  });

  it('un cocinero lee lo que viene en el Calendario, que solo puede mirar', async () => {
    const marcos = await api.entrar('marcos@ejemplo.estook.com');
    expect((await api.consultar(marcos, 'lo_que_viene')).estado).toBe('ok');
  });

  it('con Inventario solo para ver, se lee la lista y no se ajusta la cámara', async () => {
    // Un recorte, que es como se le deja a alguien mirar sin tocar.
    await base.bd.query(
      `insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel, motivo)
       select m.id, m.local_id, 'app.inventario', 'ver', 'Solo mira'
         from estook.membresia m
         join estook.persona p on p.id = m.persona_id
        where p.correo = 'marcos@ejemplo.estook.com'`,
    );
    const marcos = await api.entrar('marcos@ejemplo.estook.com');

    expect((await api.consultar(marcos, 'mis_productos')).estado).toBe('ok');
    const ajuste = await api.ejecutar(marcos, 'ajustar_stock', {
      producto_id: '00000000-0000-4000-8000-000000000000',
      hay: 3,
      motivo: 'Probando',
    });
    expect(elFallo(ajuste)).toBe('sin_permiso');
  });

  it('y sin el permiso, ni se lee', async () => {
    const sara = await api.entrar('sara@ejemplo.estook.com');
    expect(elFallo(await api.consultar(sara, 'mis_productos'))).toBe('sin_permiso');
  });
});
