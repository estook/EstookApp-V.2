import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PERFILES_DE_MUESTRA,
  ROL_EN_LA_BASE_DE_DATOS,
} from '../../apps/app/src/sesion/perfiles.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M3 · el andamio de los perfiles no puede mentir.
 *
 * Hasta M4 no hay login, asi que la aplicacion usa seis perfiles de muestra para
 * poder ensenar hoy que la rueda de un camarero tiene cuatro sectores y la de un
 * gerente ocho. Son andamio, y el andamio tiene un peligro conocido: que se quede
 * atras y acabe ensenando una aplicacion que no existe.
 *
 * Esta prueba lo impide. Compara **permiso a permiso** lo que dicen los perfiles
 * con lo que dice `0004_matriz_de_roles.sql`, que es su unico dueno (regla 6). Si
 * alguien cambia la matriz y no toca los perfiles, falla aqui y no en una demo.
 *
 * Vive en `base-de-datos/pruebas` y no en la aplicacion porque necesita un
 * Postgres levantado, que es lo unico que sabe de verdad que trae cada rol.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

/** El rol de un perfil, o revienta la prueba diciendo cual falta. */
function rolDe(id: string): string {
  const rol = ROL_EN_LA_BASE_DE_DATOS[id];
  if (!rol) throw new Error(`El perfil «${id}» no dice que rol es en la base de datos`);
  return rol;
}

/** Las apps que la matriz le da a un rol, en el orden de la rueda. */
async function appsSegunLaMatriz(rol: string): Promise<string[]> {
  const { rows } = await base.bd.query<{ permiso: string }>(
    `select pr.permiso
       from estook.permiso_de_rol pr
      where pr.rol = $1
        and pr.permiso like 'app.%'
        and pr.nivel <> 'sin_acceso'
      order by pr.permiso`,
    [rol],
  );
  return rows.map((f) => f.permiso);
}

describe('los perfiles de muestra cuadran con la matriz de roles', () => {
  for (const perfil of PERFILES_DE_MUESTRA) {
    const rol = rolDe(perfil.id);

    it(`${perfil.nombre} (${rol}) tiene exactamente las apps de su rol`, async () => {
      const segunLaBase = await appsSegunLaMatriz(rol);
      const segunElPerfil = Object.keys(perfil.permisos)
        .filter((p) => p.startsWith('app.'))
        .sort();

      expect(segunElPerfil).toEqual(segunLaBase);
    });

    it(`${perfil.nombre} tiene los mismos niveles que su rol`, async () => {
      const { rows } = await base.bd.query<{ permiso: string; nivel: string }>(
        `select permiso, nivel::text as nivel
           from estook.permiso_de_rol
          where rol = $1 and nivel <> 'sin_acceso'
          order by permiso`,
        [rol],
      );
      const enLaBase = new Map(rows.map((f) => [f.permiso, f.nivel]));

      // No se exige que el perfil declare los 33 permisos: seria repetir la
      // matriz entera. Se exige que **lo que declara sea cierto**.
      for (const [permiso, nivel] of Object.entries(perfil.permisos)) {
        expect(enLaBase.get(permiso), `${perfil.nombre} dice que ${permiso} es «${nivel}»`).toBe(
          nivel,
        );
      }
    });
  }
});

describe('los perfiles son los de las semillas', () => {
  it('las seis personas existen, con ese nombre', async () => {
    const { rows } = await base.bd.query<{ nombre: string; apellidos: string | null }>(
      'select nombre, apellidos from estook.persona order by nombre',
    );
    const enLaBase = rows.map((f) => `${f.nombre} ${f.apellidos ?? ''}`.trim());

    for (const perfil of PERFILES_DE_MUESTRA) {
      expect(enLaBase).toContain(perfil.nombre);
    }
  });

  it('cada uno tiene la membresia que dice el perfil', async () => {
    const { rows } = await base.bd.query<{ nombre: string; rol: string }>(
      `select p.nombre, m.rol
         from estook.membresia m
         join estook.persona p on p.id = m.persona_id
        order by p.nombre`,
    );
    const rolEnLaBase = new Map(rows.map((f) => [f.nombre, f.rol]));

    for (const perfil of PERFILES_DE_MUESTRA) {
      const soloElNombre = perfil.nombre.split(' ')[0] ?? '';
      expect(rolEnLaBase.get(soloElNombre)).toBe(rolDe(perfil.id));
    }
  });
});

describe('lo que los perfiles ensenan de la rueda', () => {
  it('los seis no ensenan todos lo mismo, o el andamio no serviria', () => {
    // Si los seis tuvieran las ocho apps, cambiar de perfil no demostraria nada
    // y el criterio de M3 se quedaria sin comprobar.
    const cuantas = PERFILES_DE_MUESTRA.map(
      (p) => Object.keys(p.permisos).filter((x) => x.startsWith('app.')).length,
    );
    expect(new Set(cuantas).size).toBeGreaterThan(2);
  });

  it('el primero es el que menos ve, para que se note al arrancar', () => {
    const primero = PERFILES_DE_MUESTRA[0];
    const cuantas = (p: (typeof PERFILES_DE_MUESTRA)[number]) =>
      Object.keys(p.permisos).filter((x) => x.startsWith('app.')).length;

    for (const otro of PERFILES_DE_MUESTRA) {
      expect(cuantas(primero)).toBeLessThanOrEqual(cuantas(otro));
    }
  });
});
