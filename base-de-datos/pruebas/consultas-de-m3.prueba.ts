import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PERMISOS, esPermiso, type Nivel } from '@estook/permisos';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M3 · las dos consultas nuevas, contra Postgres de verdad.
 *
 * `mis_permisos` es la que hace posible la rueda: sin ella el cliente no sabe
 * que apps ensenar. `buscar` tiene su propia prueba en `buscador.prueba.ts`.
 *
 * Se prueba la **consulta SQL**, con `set role estook_api` y las politicas de M1
 * aplicando, que es exactamente lo que hace la capa de aplicacion. Lo de encima
 * (validacion, transporte, errores en cristiano) ya lo cubre `api.prueba.ts`.
 *
 * La regla 4 del Plan: «toda regla de acceso se prueba llamando a la API a
 * pelo». Aqui se llama incluso mas abajo que la API.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

/** Lo mismo que hace la consulta `mis_permisos` del servidor. */
async function permisosDe(correo: string, codigoDelLocal: string) {
  const persona = await base.personaPorCorreo(correo);
  const local = await base.localPorCodigo(codigoDelLocal);

  return base.comoPersona(persona, async () => {
    const { rows } = await base.bd.query<{ codigo: string; nivel: string }>(
      `select p.codigo,
              estook.nivel_de_permiso($1::uuid, $2::uuid, p.codigo)::text as nivel
         from estook.permiso p
        order by p.codigo`,
      [persona, local],
    );

    const salida: Record<string, Nivel> = {};
    for (const fila of rows) {
      if (fila.nivel === 'sin_acceso') continue;
      if (!esPermiso(fila.codigo)) continue;
      salida[fila.codigo] = fila.nivel as Nivel;
    }
    return salida;
  });
}

async function locales(correo: string): Promise<string[]> {
  const persona = await base.personaPorCorreo(correo);
  return base.comoPersona(persona, async () => {
    const { rows } = await base.bd.query<{ codigo: string }>(
      `select l.codigo
         from estook.local l
        where l.id in (select local_id from estook.locales_visibles())
        order by l.codigo`,
    );
    return rows.map((f) => f.codigo);
  });
}

describe('mis_permisos · lo que la rueda ensena', () => {
  it('la camarera recibe cuatro apps de la rueda, y ninguna mas', async () => {
    const suyos = await permisosDe('sara@ejemplo.estook.com', 'bar-centro');
    const apps = Object.keys(suyos).filter((p) => p.startsWith('app.'));

    expect(apps.sort()).toEqual([
      'app.calendario',
      'app.carta',
      'app.cuaderno',
      'app.fogon',
      'app.panel',
      'app.servicio',
    ]);
  });

  it('el cocinero no recibe ni un permiso de importe', async () => {
    // «El cocinero no ve ningun importe» (M1). Lo que no se manda no se puede
    // ensenar por error.
    const suyos = await permisosDe('marcos@ejemplo.estook.com', 'bar-centro');

    expect(suyos['dato.precio_de_compra']).toBeUndefined();
    expect(suyos['dato.coste_de_plato']).toBeUndefined();
    expect(suyos['dato.ventas']).toBeUndefined();
    expect(suyos['dato.facturacion']).toBeUndefined();
  });

  it('la gerente recibe las ocho apps de la rueda', async () => {
    const suyos = await permisosDe('rosa@ejemplo.estook.com', 'bar-centro');
    const deLaRueda = [
      'app.inventario',
      'app.escandallos',
      'app.carta',
      'app.calendario',
      'app.equipo',
      'app.servicio',
      'app.negocio',
      'app.cuaderno',
    ];

    for (const app of deLaRueda) {
      expect(suyos[app], `la gerente deberia tener ${app}`).toBe('ver_y_editar');
    }
  });

  it('lo de «sin acceso» no se manda: la respuesta de un camarero es mas corta', async () => {
    const camarera = await permisosDe('sara@ejemplo.estook.com', 'bar-centro');
    const gerente = await permisosDe('rosa@ejemplo.estook.com', 'bar-centro');

    expect(Object.keys(camarera).length).toBeLessThan(Object.keys(gerente).length);
    // Y ninguno de los que llegan vale «sin_acceso».
    expect(Object.values(camarera)).not.toContain('sin_acceso');
  });

  it('nadie recibe los directos ajenos del chat, ni la direccion', async () => {
    // «Nadie, ni la direccion, ve los directos ajenos» (M1).
    for (const correo of ['rosa@ejemplo.estook.com', 'elena@ejemplo.estook.com']) {
      const local = correo.startsWith('rosa') ? 'bar-centro' : 'bar-faro';
      const suyos = await permisosDe(correo, local);
      expect(suyos['dato.chat_directos']).toBeUndefined();
    }
  });

  it('todo lo que se manda esta en el catalogo de @estook/permisos', async () => {
    // Es la prueba de que los dos catalogos siguen cuadrando: si la base de
    // datos anadiera un permiso y el paquete no, el cliente recibiria algo que
    // sus tipos no conocen.
    const suyos = await permisosDe('elena@ejemplo.estook.com', 'bar-faro');
    for (const permiso of Object.keys(suyos)) {
      expect(PERMISOS as readonly string[]).toContain(permiso);
    }
  });
});

describe('mis_permisos · el local tiene que ser suyo', () => {
  it('la del bar independiente no alcanza un local de la cadena', async () => {
    // La consulta del servidor comprueba esto antes de resolver nada, y
    // devuelve `local_ajeno`. Aqui se comprueba lo de debajo: que las politicas
    // no lo devuelven.
    expect(await locales('rosa@ejemplo.estook.com')).toEqual(['bar-centro']);
  });

  it('el area manager alcanza exactamente sus tres', async () => {
    expect(await locales('ignacio@ejemplo.estook.com')).toEqual([
      'bar-faro',
      'bar-playa',
      'bar-puerto',
    ]);
  });

  it('sobre un local que no alcanza, no tiene ningun permiso', async () => {
    // Aunque alguien se saltara la comprobacion del servidor y preguntara por un
    // local ajeno, la matriz devolveria «sin acceso» en los 33.
    const suyos = await permisosDe('rosa@ejemplo.estook.com', 'bar-faro');
    expect(suyos).toEqual({});
  });
});

describe('el recorte por local se nota', () => {
  it('a Luis le han quitado cerrar recuentos en el Bar Puerto', async () => {
    // «En este local el recuento lo cierra el gerente.» Es el recorte que siembra
    // M1, y tiene que llegar al cliente ya resuelto: la pantalla no puede
    // enterarse de esto por su cuenta.
    const suyos = await permisosDe('luis@ejemplo.estook.com', 'bar-puerto');

    expect(suyos['accion.cerrar_recuento']).toBeUndefined();
    // Y lo demas de su rol sigue estando.
    expect(suyos['app.inventario']).toBe('ver_y_editar');
  });
});
