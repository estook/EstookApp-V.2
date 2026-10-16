import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  LO_QUE_TIENE,
  agrupar,
  enTexto,
  lasMigraciones,
  loQueNoCuadra,
  loQueQuisieron,
} from '../herramientas/los-permisos-de-la-api.mjs';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * Lo que la API puede hacer en cada tabla de `estook` es lo que su migración escribió.
 *
 * La 0006 dejó puesto que toda tabla nueva naciera con leer, añadir, cambiar y borrar
 * para `estook_api`, y un `grant` más corto **no quita** nada: suma (lección 189). La
 * 0069 escribió «el historial solo se lee y se añade» y en producción la API podía
 * cambiarlo. La seguridad por filas lo paraba, pero era una barrera, no dos.
 *
 * Aquí se leen las migraciones en orden y se compara lo que cada una **quiso** dar con
 * lo que la API **tiene**. Si alguien escribe un `grant` corto y se olvida del
 * `revoke all`, o crea una tabla sin decir nada, se pone en rojo aquí y no en
 * producción. `bd:comprobar-api` mira lo mismo contra la base de verdad (0089).
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function loQueTieneLaApi() {
  const { rows } = await base.bd.query<{ tabla: string; permiso: string }>(LO_QUE_TIENE);
  return agrupar(rows);
}

describe('lo que la API puede hacer en cada tabla', () => {
  it('la lectura de las migraciones encuentra lo que se sabe que dicen', () => {
    // Sin esto, un fallo de lectura dejaría la de abajo en verde sin mirar nada.
    const quiso = loQueQuisieron(lasMigraciones());
    expect(quiso.size).toBeGreaterThan(80);
    expect(enTexto(quiso.get('auditoria'))).toBe('INSERT, SELECT');
    expect(enTexto(quiso.get('movimiento_de_stock'))).toBe('DELETE, INSERT, SELECT');
    expect(enTexto(quiso.get('receta_guardada'))).toBe('INSERT, SELECT');
    expect(enTexto(quiso.get('rol'))).toBe('SELECT');
    expect(enTexto(quiso.get('registro_pendiente'))).toBe('nada');
    expect(enTexto(quiso.get('linea_de_receta'))).toBe('DELETE, INSERT, SELECT, UPDATE');
  });

  it('y lee la 0070 como la leería Postgres, no como la leería alguien con prisa', () => {
    // Hasta la 0069, el historial «quería» leer y añadir; tener, tenía los cuatro.
    const hastaLa69 = loQueQuisieron(lasMigraciones(69));
    expect(enTexto(hastaLa69.get('receta_guardada'))).toBe('INSERT, SELECT');
    // Una tabla que no dice nada no quiere nada, aunque el defecto le diera los cuatro.
    expect(enTexto(hastaLa69.get('producto'))).toBe('nada');
  });

  it('ni un permiso de más ni uno de menos', async () => {
    const quiso = loQueQuisieron(lasMigraciones());
    expect(loQueNoCuadra(quiso, await loQueTieneLaApi())).toEqual([]);
  });

  it('una tabla que se cree mañana nace sin nada para la API', async () => {
    // La 0071 quitó el defecto de la 0006: lo que no se escribe no se da.
    await base.bd.exec('create table estook.de_prueba_sin_decir (id int)');
    try {
      const tiene = await loQueTieneLaApi();
      expect(enTexto(tiene.get('de_prueba_sin_decir'))).toBe('nada');
    } finally {
      await base.bd.exec('drop table estook.de_prueba_sin_decir');
    }
  });
});
