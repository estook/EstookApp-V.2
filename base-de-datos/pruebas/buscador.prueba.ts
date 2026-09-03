import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M3 · el buscador universal (migracion 0017).
 *
 * «Buscador universal con `pg_trgm` [...] que busca tambien acciones» (B5) ·
 * «Toda lista larga tiene buscador **tolerante a erratas y sin acentos**»
 * (Auditoria de flujos, Parte 8).
 *
 * Se prueba llamando a la base de datos a pelo, con `set role estook_api`, que es
 * como se conecta la API (regla 4). Lo importante no es solo que encuentre: es
 * que **no encuentre lo ajeno**, y eso solo se ve preguntando como quien no
 * deberia poder verlo.
 */
let base: BaseDePrueba;

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

interface Encontrado {
  tipo: string;
  titulo: string;
  subtitulo: string;
}

async function buscarComo(correo: string | null, texto: string): Promise<Encontrado[]> {
  const persona = correo === null ? null : await base.personaPorCorreo(correo);

  return base.comoPersona(persona, async () => {
    const { rows } = await base.bd.query<Encontrado>(
      'select tipo, titulo, subtitulo from estook.buscar($1, 50)',
      [texto],
    );
    return rows;
  });
}

describe('sin_acentos', () => {
  it('quita los acentos y baja a minusculas', async () => {
    const { rows } = await base.bd.query<{ a: string; b: string; c: string }>(
      `select estook.sin_acentos('José María')  as a,
              estook.sin_acentos('BAHÍA')       as b,
              estook.sin_acentos('Amunárriz')   as c`,
    );
    expect(rows[0]).toEqual({ a: 'jose maria', b: 'bahia', c: 'amunarriz' });
  });

  it('tambien con los que no llevan tilde sino otra cosa', async () => {
    const { rows } = await base.bd.query<{ n: string; c: string; o: string }>(
      `select estook.sin_acentos('Muñoz')   as n,
              estook.sin_acentos('Françoise') as c,
              estook.sin_acentos('Søren')     as o`,
    );
    expect(rows[0]).toEqual({ n: 'munoz', c: 'francoise', o: 'soren' });
  });

  it('es inmutable, que es lo que permite indexarla', async () => {
    // Si dejara de serlo, los indices GIN de la migracion 0017 no se podrian
    // crear y esta consulta lo diria.
    const { rows } = await base.bd.query<{ volatilidad: string }>(
      `select provolatile as volatilidad
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'estook' and p.proname = 'sin_acentos'`,
    );
    expect(rows[0]?.volatilidad).toBe('i');
  });
});

describe('buscar · encuentra', () => {
  it('encuentra un local por su nombre', async () => {
    const encontrado = await buscarComo('elena@ejemplo.estook.com', 'faro');
    expect(encontrado.some((e) => e.tipo === 'local' && /faro/i.test(e.titulo))).toBe(true);
  });

  it('encuentra sin escribir los acentos', async () => {
    // «Amunarriz» sin tilde tiene que dar con «Amunarriz».
    const conTilde = await buscarComo('elena@ejemplo.estook.com', 'Amunárriz');
    const sinTilde = await buscarComo('elena@ejemplo.estook.com', 'amunarriz');
    expect(sinTilde.map((e) => e.titulo)).toEqual(conTilde.map((e) => e.titulo));
    expect(sinTilde.length).toBeGreaterThan(0);
  });

  it('aguanta una errata', async () => {
    // «Ignacio» escrito mal, con una letra cambiada.
    const encontrado = await buscarComo('elena@ejemplo.estook.com', 'Ignaico');
    expect(encontrado.some((e) => e.tipo === 'persona' && /Ignacio/.test(e.titulo))).toBe(true);
  });

  it('encuentra una persona por su correo', async () => {
    const encontrado = await buscarComo('elena@ejemplo.estook.com', 'luis@ejemplo');
    expect(encontrado.some((e) => e.tipo === 'persona' && e.subtitulo.startsWith('luis@'))).toBe(
      true,
    );
  });

  it('encuentra un local por su codigo, que hay quien lo tiene mas a mano', async () => {
    const encontrado = await buscarComo('elena@ejemplo.estook.com', 'bar-muelle');
    expect(encontrado.some((e) => e.tipo === 'local')).toBe(true);
  });

  it('no devuelve ruido: lo que no se parece a nada, no sale', async () => {
    const encontrado = await buscarComo('elena@ejemplo.estook.com', 'zzqwx');
    expect(encontrado).toEqual([]);
  });
});

describe('buscar · no ensena lo ajeno', () => {
  it('el bar independiente no encuentra ni un local de la cadena', async () => {
    // Rosa lleva el Bar Centro. «Bar» aparece en los seis locales de Grupo Costa.
    const encontrado = await buscarComo('rosa@ejemplo.estook.com', 'bar');
    const locales = encontrado.filter((e) => e.tipo === 'local');

    expect(locales).toHaveLength(1);
    expect(locales[0]?.titulo).toMatch(/centro/i);
  });

  it('el bar independiente tampoco encuentra a una persona de la cadena', async () => {
    const encontrado = await buscarComo('rosa@ejemplo.estook.com', 'elena');
    expect(encontrado.filter((e) => e.tipo === 'persona')).toEqual([]);
  });

  it('el area manager solo encuentra sus tres locales', async () => {
    const encontrado = await buscarComo('ignacio@ejemplo.estook.com', 'bar');
    const titulos = encontrado.filter((e) => e.tipo === 'local').map((e) => e.titulo);
    expect(titulos).toHaveLength(3);
  });

  it('sin decir quien pregunta no se encuentra absolutamente nada', async () => {
    // La regla de M1, aplicada tambien al buscador: es el sitio mas facil por
    // donde se escaparia, porque busca en varias tablas de una vez.
    expect(await buscarComo(null, 'bar')).toEqual([]);
    expect(await buscarComo(null, 'elena')).toEqual([]);
  });
});

describe('buscar · como esta hecha', () => {
  it('no es security definer, o se saltaria las politicas de M1', async () => {
    // Esto es lo que impide que el buscador sea la puerta de atras para leer los
    // locales de la competencia escribiendo tres letras.
    const { rows } = await base.bd.query<{ definer: boolean }>(
      `select p.prosecdef as definer
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'estook' and p.proname = 'buscar'`,
    );
    expect(rows[0]?.definer).toBe(false);
  });

  it('los indices de trigramas estan puestos', async () => {
    const { rows } = await base.bd.query<{ indexname: string }>(
      `select indexname from pg_indexes
        where schemaname = 'estook' and indexname like '%buscable'
        order by indexname`,
    );
    expect(rows.map((f) => f.indexname)).toEqual([
      'area_buscable',
      'local_buscable',
      'local_codigo_buscable',
      'organizacion_buscable',
      'persona_buscable',
      'persona_correo_buscable',
      // M6. El genero y los proveedores, que **si** entran en `estook.buscar`.
      'producto_buscable',
      // M5. El catalogo de referencia son trescientas filas, y «toda lista larga
      // tiene buscador tolerante a erratas y sin acentos» (Auditoria, parte 8).
      // No entran en `estook.buscar`: el buscador universal busca **cosas
      // tuyas**, y una referencia no es de nadie.
      'producto_de_referencia_buscable',
      'proveedor_buscable',
      'receta_de_referencia_buscable',
    ]);
  });

  it('respeta el limite que se le pide', async () => {
    const persona = await base.personaPorCorreo('elena@ejemplo.estook.com');
    const cuantos = await base.comoPersona(persona, async () => {
      const { rows } = await base.bd.query('select * from estook.buscar($1, 2)', ['bar']);
      return rows.length;
    });
    expect(cuantos).toBeLessThanOrEqual(2);
  });

  it('no se le ha caido ningun bloque por el camino', async () => {
    // ── Por que existe esta prueba ────────────────────────────────────────────
    //
    // Porque al escribir M6 se reescribio esta funcion **de memoria** para
    // anadirle el genero, y en el camino se perdieron dos bloques enteros —las
    // organizaciones y las areas— y el umbral paso de 0,18 a 0,3. Las pruebas de
    // entonces cazaron el umbral, porque «Ignaico» dejo de encontrar a
    // «Ignacio»; **los dos bloques que faltaban no los cazo ninguna**, porque
    // ninguna preguntaba por ellos.
    //
    // Esta es esa prueba. Cada modulo que anada su bloque tiene que anadir aqui
    // su linea, y el dia que alguien reescriba la funcion, esto le dice a las
    // claras que se ha dejado algo.
    //
    // Se lee el cuerpo de la funcion y no se buscan resultados a proposito: un
    // bloque puede existir y no devolver nada porque las semillas no tengan esa
    // fila, y entonces la prueba pasaria en verde con el bloque borrado.
    const { rows } = await base.bd.query<{ cuerpo: string }>(
      `select prosrc as cuerpo from pg_proc
        where pronamespace = 'estook'::regnamespace and proname = 'buscar'`,
    );
    const cuerpo = rows[0]?.cuerpo ?? '';

    for (const bloque of [
      'locales',
      'personas',
      'organizaciones',
      'areas',
      // M6 · el genero y a quien se le compra.
      'productos',
      'proveedores',
    ]) {
      // Que el bloque este escrito...
      expect(cuerpo, `falta el bloque «${bloque}» en estook.buscar`).toContain(`${bloque} as (`);
      // ...y que ademas entre en la union final. Un bloque escrito y no unido no
      // devuelve nada, y es justo el fallo que no se ve.
      expect(cuerpo, `el bloque «${bloque}» no entra en la union de estook.buscar`).toContain(
        `from ${bloque}\n`,
      );
    }

    // Y el umbral, que es el numero que decide si «Migel» encuentra a «Miguel».
    expect(cuerpo, 'el umbral del buscador ha cambiado sin querer').toContain('>= 0.18');
  });
});
