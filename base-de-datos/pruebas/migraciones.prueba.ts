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

  it('dejan el local independiente y la cadena de seis en dos areas', async () => {
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
