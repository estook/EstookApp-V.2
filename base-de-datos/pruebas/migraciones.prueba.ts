import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { migraciones, reversiones, semillas, levantarBase } from './entorno.ts';

/**
 * Regla 2 del Plan: «solo migraciones numeradas, reversibles y compatibles hacia
 * atras». Aqui se comprueban las tres cosas de verdad, no de palabra.
 */
const CONTROL = `
  create schema if not exists estook;
  create table if not exists estook.migracion (
    numero integer primary key, nombre text not null,
    huella text not null, aplicada_en timestamptz not null default now()
  );
`;

/**
 * Cuántas migraciones trae el módulo que se está construyendo.
 *
 * Se deshacen y se vuelven a aplicar **con los datos ya sembrados**, para
 * comprobar que se pueden aplicar sobre una base que no está vacía. Es un
 * número que hay que cambiar a propósito al empezar un módulo nuevo, igual que
 * el que cuenta las funciones con privilegio: si un día no cuadra, que sea
 * porque alguien lo ha decidido.
 *
 * M5 trae dos: la 0020 y la 0021.
 */
const LAS_DE_ESTE_MODULO = 2;

describe('las migraciones', () => {
  it('todas siguen el formato NNNN_nombre.sql', async () => {
    for (const { nombre } of await migraciones()) {
      expect(nombre, nombre).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
    }
  });

  it('todas tienen su reversion al lado', async () => {
    const conReversion = new Set((await reversiones()).map((r) => r.nombre));
    for (const { nombre } of await migraciones()) {
      expect(conReversion, nombre).toContain(nombre.replace(/\.sql$/, '.revertir.sql'));
    }
  });

  it('los numeros no se repiten y no dejan huecos', async () => {
    const numeros = (await migraciones()).map((m) => Number(m.nombre.slice(0, 4)));
    expect(numeros).toEqual(numeros.map((_, i) => i + 1));
  });

  it('se aplican, se deshacen enteras y se vuelven a aplicar', async () => {
    // Con pg_trgm enchufada, que es lo que necesita la migracion 0017.
    const bd = new PGlite({ extensions: { pg_trgm } });
    try {
      await bd.exec(CONTROL);

      const enOrden = await migraciones();
      for (const { sql } of enOrden) await bd.exec(sql);

      const tablasDespues = await contarTablas(bd);
      expect(tablasDespues).toBeGreaterThan(10);

      // Deshacer, de la ultima a la primera.
      const alReves = (await reversiones()).slice().reverse();
      for (const { sql } of alReves) await bd.exec(sql);

      // Solo debe quedar la tabla de control de migraciones.
      expect(await contarTablas(bd)).toBe(1);

      // Y se puede volver a aplicar todo desde cero.
      for (const { sql } of enOrden) await bd.exec(sql);
      expect(await contarTablas(bd)).toBe(tablasDespues);
    } finally {
      await bd.close();
    }
  }, 120_000);

  /**
   * **La prueba que faltaba, y que costó un despliegue fallido.**
   *
   * Hasta aquí, las migraciones solo se aplicaban contra una base **vacía**: en
   * el entorno de pruebas las semillas corren después, así que `estook.local`
   * no tiene ni una fila cuando pasa la migración 0020.
   *
   * Contra una base de verdad no es así. La 0020 añadía la restricción de
   * coherencia del alta **antes** de rellenar la columna, y con siete locales ya
   * montados saltó en la cara al aplicarla. Aquí pasaba en verde.
   *
   * Es «una prueba que corre en un sitio no prueba el otro» (E4) con una forma
   * nueva: **una migración probada solo contra una tabla vacía no está probada.**
   *
   * Esto lo arregla reproduciendo la situación de verdad: se aplica todo, se
   * siembra, y después se deshacen y se vuelven a aplicar las migraciones de
   * este módulo, que entonces sí encuentran datos delante.
   */
  it('se pueden aplicar sobre una base que YA tiene datos', async () => {
    // `levantarBase` aplica las migraciones **y siembra las cinco semillas**,
    // incluida la cuarta, que es la que marca los locales como montados. Sembrar
    // solo los `.sql` no bastaba: los deja con el alta sin terminar, que es
    // justo el caso en el que la restricción no se queja. Costó una pasada en
    // verde con el fallo puesto.
    const base = await levantarBase();
    try {
      const locales = await cuantasFilas(base.bd, 'local');
      const montados = await cuantosLocalesMontados(base.bd);

      // Las dos condiciones que hacen que esta prueba valga algo. Sin ellas
      // pasaría en verde sin comprobar nada, que es peor que no tenerla (E4).
      expect(locales).toBeGreaterThan(0);
      expect(montados).toBeGreaterThan(0);

      // Las de este módulo, deshechas y vueltas a poner con los datos delante.
      const reversionesEnOrden = (await reversiones()).slice(-LAS_DE_ESTE_MODULO).reverse();
      for (const { sql } of reversionesEnOrden) await base.bd.exec(sql);

      // Los locales siguen ahí: revertir quita columnas, no filas.
      expect(await cuantasFilas(base.bd, 'local')).toBe(locales);
      expect(await cuantosLocalesMontados(base.bd)).toBe(montados);

      // Y aquí es donde saltaba: la 0020 se aplica sobre siete locales que ya
      // dicen que tienen el alta terminada.
      for (const { sql } of (await migraciones()).slice(-LAS_DE_ESTE_MODULO)) {
        await base.bd.exec(sql);
      }

      expect(await cuantasFilas(base.bd, 'local')).toBe(locales);
    } finally {
      await base.cerrar();
    }
  }, 120_000);
});

describe('las semillas', () => {
  it('sembrar dos veces no duplica nada', async () => {
    const base = await levantarBase();
    try {
      const antes = await censo(base.bd);
      for (const { sql } of await semillas()) await base.bd.exec(sql);
      expect(await censo(base.bd)).toEqual(antes);
    } finally {
      await base.cerrar();
    }
  }, 120_000);

  it('dejan los dos locales independientes y la cadena de seis en dos areas', async () => {
    const base = await levantarBase();
    try {
      const { rows } = await base.bd.query<{ codigo: string; areas: number; locales: number }>(`
        select o.codigo,
               count(distinct a.id)::int as areas,
               count(distinct l.id)::int as locales
          from estook.organizacion o
          left join estook.area a on a.organizacion_id = o.id
          left join estook.local l on l.organizacion_id = o.id
         group by o.codigo
         order by o.codigo
      `);
      expect(rows).toEqual([
        { codigo: 'bar-centro', areas: 0, locales: 1 },
        // Casa Lola la añade M5: es el local con el alta a medias, y sin él la
        // quinta comprobación al entrar no se puede recorrer con lo sembrado.
        { codigo: 'casa-lola', areas: 0, locales: 1 },
        { codigo: 'grupo-costa', areas: 2, locales: 6 },
      ]);
    } finally {
      await base.cerrar();
    }
  }, 120_000);

  it('todo lo sembrado queda marcado como ejemplo, para poder borrarlo de un boton', async () => {
    const base = await levantarBase();
    try {
      const { rows } = await base.bd.query<{ sin_marcar: number }>(`
        select (
          (select count(*) from estook.organizacion where not es_ejemplo)
          + (select count(*) from estook.area where not es_ejemplo)
          + (select count(*) from estook.local where not es_ejemplo)
          + (select count(*) from estook.persona where not es_ejemplo)
        )::int as sin_marcar
      `);
      expect(rows[0]?.sin_marcar).toBe(0);
    } finally {
      await base.cerrar();
    }
  }, 120_000);
});

/** Los que dicen tener el alta terminada. Son los que rompían la 0020. */
async function cuantosLocalesMontados(bd: PGlite): Promise<number> {
  const { rows } = await bd.query<{ n: number }>(
    `select count(*)::int as n from estook.local where onboarding_terminado`,
  );
  return rows[0]?.n ?? 0;
}

async function cuantasFilas(bd: PGlite, tabla: string): Promise<number> {
  const { rows } = await bd.query<{ n: number }>(`select count(*)::int as n from estook.${tabla}`);
  return rows[0]?.n ?? 0;
}

async function contarTablas(bd: PGlite): Promise<number> {
  const { rows } = await bd.query<{ cuantas: number }>(`
    select count(*)::int as cuantas from pg_class
     where relnamespace = 'estook'::regnamespace and relkind = 'r'
  `);
  return rows[0]?.cuantas ?? 0;
}

async function censo(bd: PGlite): Promise<Record<string, number>> {
  const { rows } = await bd.query<Record<string, number>>(`
    select (select count(*) from estook.organizacion)::int as organizaciones,
           (select count(*) from estook.area)::int         as areas,
           (select count(*) from estook.local)::int        as locales,
           (select count(*) from estook.persona)::int      as personas,
           (select count(*) from estook.membresia)::int    as membresias,
           (select count(*) from estook.recorte_de_permiso)::int as recortes,
           (select count(*) from estook.politica_de_catalogo)::int as politicas
  `);
  return rows[0] ?? {};
}
