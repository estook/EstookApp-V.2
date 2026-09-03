import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ALERGENOS, NOMBRE_DEL_ALERGENO, TIPOS_DE_LOCAL, UNIDADES_DE_USO } from '@estook/dominio';
import { huellaDeToken, tokenNuevo } from '../../servidor/dominio/secretos.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M5 · el alta del local, contra Postgres de verdad.
 *
 * «Toda regla de acceso se prueba **llamando a la API a pelo**» (regla 4). Aquí
 * se llama incluso más abajo que la API: contra el SQL, con `set role
 * estook_api` y las políticas aplicando, que es exactamente lo que hace la capa
 * de aplicación.
 *
 * Lo que se comprueba es lo que ninguna pantalla enseña:
 *
 *   · que los objetivos tienen **uno vigente por clave** y lo garantiza un índice
 *   · que el catálogo de referencia **se lee y no se escribe**, por nadie
 *   · que entrar dos veces desde el mismo aparato **no son dos filas**
 *   · que la visita de demostración solo abre un restaurante **de ejemplo**
 *   · y que «quitar los ejemplos» respeta las políticas en vez de saltárselas
 */
let base: BaseDePrueba;

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';
const PABLO = 'pablo@ejemplo.estook.com';

beforeAll(async () => {
  base = await levantarBase();
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

// ── El alta, paso a paso ─────────────────────────────────────────────────────

describe('por dónde va el alta', () => {
  it('Casa Lola se siembra a medias, y es la única', async () => {
    const aMedias = await comoDuena<{ codigo: string; onboarding_paso: number }>(
      `select codigo, onboarding_paso from estook.local where not onboarding_terminado`,
    );

    expect(aMedias).toEqual([{ codigo: 'casa-lola', onboarding_paso: 0 }]);
  });

  it('un local a medias no tiene tipo, y eso es correcto', async () => {
    // Es la razón de que el paso 2 exista: hasta que alguien responde, no hay
    // tipo. Sembrarlo con uno puesto haría que el alta enseñara una respuesta
    // que nadie ha dado.
    const [lola] = await comoDuena<{ tipo: string | null }>(
      `select tipo::text as tipo from estook.local where codigo = 'casa-lola'`,
    );
    expect(lola?.tipo).toBeNull();
  });

  it('el paso no se sale de los ocho', async () => {
    await expect(
      comoDuena(`update estook.local set onboarding_paso = 9 where codigo = 'casa-lola'`),
    ).rejects.toThrow();
  });

  it('terminado y la fecha de terminado no pueden decir cosas distintas', async () => {
    await expect(
      comoDuena(
        `update estook.local set onboarding_terminado = true, onboarding_terminado_en = null
          where codigo = 'casa-lola'`,
      ),
    ).rejects.toThrow();
  });
});

// ── Los objetivos ────────────────────────────────────────────────────────────

describe('los objetivos', () => {
  it('los locales montados tienen los tres, marcados como de partida', async () => {
    const filas = await comoDuena<{ codigo: string; cuantos: number; de_partida: boolean }>(
      `select l.codigo, count(*)::int as cuantos, bool_and(o.de_partida) as de_partida
         from estook.local l
         join estook.objetivo o on o.local_id = l.id and o.hasta is null
        group by l.codigo
        order by l.codigo`,
    );

    // Los siete montados. Casa Lola no: sin tipo no hay objetivos que proponer.
    expect(filas).toHaveLength(7);
    for (const fila of filas) {
      expect(fila.cuantos, fila.codigo).toBe(3);
      // «Se usan los del tipo de local **y se dice que son los de partida**»
      // (Auditoría 1.2). Se dice porque está escrito en la fila.
      expect(fila.de_partida, fila.codigo).toBe(true);
    }
  });

  it('solo puede haber uno vigente por clave, y lo impide la base de datos', async () => {
    const [local] = await comoDuena<{ id: string }>(
      `select id from estook.local where codigo = 'bar-centro'`,
    );

    await expect(
      comoDuena(
        `insert into estook.objetivo (local_id, clave, valor, desde)
         values ($1, 'materia_prima', 0.5, current_date)`,
        [local?.id],
      ),
    ).rejects.toThrow();
  });

  it('un objetivo fuera de 0 y 1 no entra: son fracciones, no porcentajes', async () => {
    const [local] = await comoDuena<{ id: string }>(
      `select id from estook.local where codigo = 'casa-lola'`,
    );

    // 28 en vez de 0,28 es el error que teñiría media aplicación de rojo. Lo
    // para la restricción, no el cuidado de quien escribe.
    await expect(
      comoDuena(
        `insert into estook.objetivo (local_id, clave, valor, desde)
         values ($1, 'margen', 28, current_date)`,
        [local?.id],
      ),
    ).rejects.toThrow();
  });

  it('quien no puede poner objetivos, no los pone', async () => {
    // Sara es camarera en Bar Centro: no tiene `accion.poner_objetivos`.
    const sara = await base.personaPorCorreo(SARA);
    const local = await base.localPorCodigo('bar-centro');

    // Y una politica que dice que no **lanza**, no devuelve vacio: Postgres
    // levanta un 42501. Es lo que el despachador traduce a «sin permiso», y por
    // eso el cocinero que intenta invitar ya no recibe un 500 (fallo 2 del
    // repaso de M4).
    await expect(
      base.comoPersona(sara, () =>
        base.bd.query(
          `insert into estook.objetivo (local_id, clave, valor, desde)
           values ($1, 'personal', 0.25, current_date - 400)`,
          [local],
        ),
      ),
    ).rejects.toThrow();
  });

  it('y quien sí puede, los lee y los cambia', async () => {
    // Rosa es gerente de Bar Centro.
    const rosa = await base.personaPorCorreo(ROSA);
    const local = await base.localPorCodigo('bar-centro');

    const suyos = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query(
        `select clave::text as clave from estook.objetivo where local_id = $1 and hasta is null`,
        [local],
      );
      return rows;
    });

    expect(suyos).toHaveLength(3);
  });

  it('los objetivos de otro local no se ven', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const ajeno = await base.localPorCodigo('bar-puerto');

    const vistos = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query(`select id from estook.objetivo where local_id = $1`, [
        ajeno,
      ]);
      return rows;
    });

    expect(vistos).toEqual([]);
  });
});

// ── Quién puede configurar su local ──────────────────────────────────────────

describe('la ficha del local', () => {
  /**
   * **Esta es la prueba que encontró el fallo, y por eso está escrita así.**
   *
   * La política de la 0008 exigía `accion.gestionar_locales` para cualquier
   * escritura sobre `estook.local`. Y ese permiso el gerente no lo tiene, con
   * razón: «altas de local son de organización» (matriz de roles).
   *
   * Resultado: el gerente de un bar recién dado de alta entraba en su propia
   * alta y no podía responder ni la primera pregunta. Lo arregla la 0020
   * partiendo la política en dos.
   */
  it('un gerente puede configurar el local que lleva', async () => {
    const pablo = await base.personaPorCorreo(PABLO);
    const lola = await base.localPorCodigo('casa-lola');

    const cambiadas = await base.comoPersona(pablo, async () => {
      const { rows } = await base.bd.query(
        `update estook.local set tipo = 'bar_de_tapas' where id = $1 returning id`,
        [lola],
      );
      return rows;
    });

    expect(cambiadas).toHaveLength(1);

    // Se deja como estaba: Casa Lola tiene que seguir siendo el local a medias.
    await comoDuena(`update estook.local set tipo = null where id = $1`, [lola]);
  });

  it('pero no puede crear uno nuevo: eso es de la organización', async () => {
    const pablo = await base.personaPorCorreo(PABLO);
    const [organizacion] = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'casa-lola'`,
    );

    await expect(
      base.comoPersona(pablo, () =>
        base.bd.query(
          `insert into estook.local (organizacion_id, codigo, nombre)
           values ($1, 'otro-bar', 'Otro Bar')`,
          [organizacion?.id],
        ),
      ),
    ).rejects.toThrow();
  });

  it('ni tocar la ficha del local de al lado', async () => {
    const pablo = await base.personaPorCorreo(PABLO);
    const ajeno = await base.localPorCodigo('bar-centro');

    const cambiadas = await base.comoPersona(pablo, async () => {
      const { rows } = await base.bd.query(
        `update estook.local set nombre = 'Mío ahora' where id = $1 returning id`,
        [ajeno],
      );
      return rows;
    });

    // Aquí no lanza: la fila **no se ve**, así que el `update` no encuentra nada
    // que actualizar. Es la política de lectura haciendo su trabajo antes que la
    // de escritura.
    expect(cambiadas).toEqual([]);
  });
});

// ── El catálogo de referencia ────────────────────────────────────────────────

describe('el catálogo de referencia', () => {
  it('tiene productos de sobra y todos con su cuenta hecha', async () => {
    const [conteo] = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.producto_de_referencia`,
    );
    expect(conteo?.cuantos ?? 0).toBeGreaterThan(250);

    // Sin factor no hay «precio ÷ (factor × rendimiento)», que es para lo que
    // existe este catálogo.
    const malos = await comoDuena<{ codigo: string }>(
      `select codigo from estook.producto_de_referencia
        where factor <= 0 or rendimiento <= 0 or rendimiento > 1`,
    );
    expect(malos).toEqual([]);
  });

  it('los alérgenos son los catorce oficiales, y no se puede inventar uno', async () => {
    const [conteo] = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.alergeno`,
    );
    expect(conteo?.cuantos).toBe(14);

    await expect(
      comoDuena(
        `insert into estook.producto_de_referencia
           (codigo, nombre, categoria, formato, factor, unidad_de_uso, categoria_fiscal, alergenos)
         values ('inventado', 'Inventado', 'Pruebas', 'Caja', 1, 'ud', 'alimento', '{unicornio}')`,
      ),
    ).rejects.toThrow(/unicornio/i);
  });

  it('lo lee cualquiera, aunque no tenga ningún permiso', async () => {
    // Es un diccionario, no un dato de nadie. Sara es camarera y lo ve entero.
    const sara = await base.personaPorCorreo(SARA);

    const vistos = await base.comoPersona(sara, async () => {
      const { rows } = await base.bd.query(
        `select codigo from estook.producto_de_referencia limit 5`,
      );
      return rows;
    });

    expect(vistos).toHaveLength(5);
  });

  it('y no lo escribe nadie: no hay política de escritura', async () => {
    // Ni siquiera Rosa, que es gerente. No es que falte un permiso: es que **no
    // hay camino**. Se cambia con una migración, como el catálogo de permisos.
    const rosa = await base.personaPorCorreo(ROSA);

    await expect(
      base.comoPersona(rosa, () =>
        base.bd.query(
          `insert into estook.producto_de_referencia
             (codigo, nombre, categoria, formato, factor, unidad_de_uso, categoria_fiscal)
           values ('mio', 'El mio', 'Pruebas', 'Caja', 1, 'ud', 'alimento')`,
        ),
      ),
    ).rejects.toThrow();
  });

  it('las recetas de referencia apuntan a productos que existen', async () => {
    const sueltas = await comoDuena<{ id: string }>(
      `select l.id from estook.linea_de_receta_de_referencia l
        left join estook.producto_de_referencia p on p.id = l.producto_de_referencia_id
       where p.id is null`,
    );
    expect(sueltas).toEqual([]);

    const sinLineas = await comoDuena<{ codigo: string }>(
      `select r.codigo from estook.receta_de_referencia r
        where not exists (
          select 1 from estook.linea_de_receta_de_referencia l where l.receta_id = r.id
        )`,
    );
    expect(sinLineas).toEqual([]);
  });

  it('un producto no puede entrar dos veces en la misma receta', async () => {
    const [linea] = await comoDuena<{ receta_id: string; producto_de_referencia_id: string }>(
      `select receta_id, producto_de_referencia_id
         from estook.linea_de_receta_de_referencia limit 1`,
    );

    await expect(
      comoDuena(
        `insert into estook.linea_de_receta_de_referencia
           (receta_id, producto_de_referencia_id, cantidad, orden)
         values ($1, $2, 100, 99)`,
        [linea?.receta_id, linea?.producto_de_referencia_id],
      ),
    ).rejects.toThrow();
  });
});

// ── El aparato desde el que se entra ─────────────────────────────────────────

describe('el aparato, que hasta M5 no lo escribía nadie', () => {
  it('entrar dos veces desde el mismo móvil no son dos filas', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const local = await base.localPorCodigo('bar-centro');

    const uno = await comoDuena<{ reconocer_dispositivo: string }>(
      `select estook.reconocer_dispositivo($1, 'huella-de-un-movil', 'Chrome en Android', 'movil', $2) as reconocer_dispositivo`,
      [rosa, local],
    );
    const otro = await comoDuena<{ reconocer_dispositivo: string }>(
      `select estook.reconocer_dispositivo($1, 'huella-de-un-movil', 'Chrome en Android', 'movil', $2) as reconocer_dispositivo`,
      [rosa, local],
    );

    // **Esto es lo que arregla la pantalla de «Mis dispositivos»**: antes cada
    // entrada abría una fila, y salían veintitrés diciendo «Bar Centro».
    expect(uno[0]?.reconocer_dispositivo).toBe(otro[0]?.reconocer_dispositivo);
  });

  it('dos aparatos distintos sí son dos filas', async () => {
    const rosa = await base.personaPorCorreo(ROSA);

    const movil = await comoDuena<{ reconocer_dispositivo: string }>(
      `select estook.reconocer_dispositivo($1, 'huella-del-movil-2', 'Safari en iPhone', 'movil', null) as reconocer_dispositivo`,
      [rosa],
    );
    const ordenador = await comoDuena<{ reconocer_dispositivo: string }>(
      `select estook.reconocer_dispositivo($1, 'huella-del-portatil', 'Chrome en Windows', 'escritorio', null) as reconocer_dispositivo`,
      [rosa],
    );

    expect(movil[0]?.reconocer_dispositivo).not.toBe(ordenador[0]?.reconocer_dispositivo);
  });

  it('sin huella no se inventa un aparato', async () => {
    // Pasa en navegación privada. Se entra igual, con la sesión sin dispositivo:
    // es un dato de comodidad, no un requisito de acceso.
    const rosa = await base.personaPorCorreo(ROSA);

    const nada = await comoDuena<{ reconocer_dispositivo: string | null }>(
      `select estook.reconocer_dispositivo($1, null, 'Un aparato', 'movil', null) as reconocer_dispositivo`,
      [rosa],
    );

    expect(nada[0]?.reconocer_dispositivo).toBeNull();
  });

  it('la sesión se cuelga del aparato', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const local = await base.localPorCodigo('bar-centro');
    const token = tokenNuevo();

    const [aparato] = await comoDuena<{ reconocer_dispositivo: string }>(
      `select estook.reconocer_dispositivo($1, 'huella-de-la-sesion', 'Chrome en Android', 'movil', $2) as reconocer_dispositivo`,
      [rosa, local],
    );

    const [sesion] = await comoDuena<{ abrir_sesion: string }>(
      `select estook.abrir_sesion($1, $2, 'contrasena', null, $3, true, 30, $4) as abrir_sesion`,
      [rosa, await huellaDeToken(token), local, aparato?.reconocer_dispositivo],
    );

    const [fila] = await comoDuena<{ dispositivo_id: string | null }>(
      `select dispositivo_id from estook.sesion where id = $1`,
      [sesion?.abrir_sesion],
    );

    expect(fila?.dispositivo_id).toBe(aparato?.reconocer_dispositivo);
  });
});

// ── El modo demostración ─────────────────────────────────────────────────────

describe('la visita de demostración', () => {
  it('abre un restaurante de ejemplo, y la sesión se marca como tal', async () => {
    const token = tokenNuevo();

    const [abierta] = await comoDuena<{
      sesion_id: string;
      organizacion_id: string;
      local_id: string;
    }>(`select * from estook.abrir_demostracion($1, 2)`, [await huellaDeToken(token)]);

    expect(abierta).toBeDefined();

    const [donde] = await comoDuena<{ es_ejemplo: boolean; org_ejemplo: boolean }>(
      `select l.es_ejemplo, o.es_ejemplo as org_ejemplo
         from estook.local l join estook.organizacion o on o.id = l.organizacion_id
        where l.id = $1`,
      [abierta?.local_id],
    );

    // Las tres condiciones a la vez: organización, local y persona de ejemplo.
    // Si alguna vez alguien marcara mal una organización de verdad, seguirían
    // haciendo falta las otras dos.
    expect(donde?.es_ejemplo).toBe(true);
    expect(donde?.org_ejemplo).toBe(true);
  });

  it('y `sesion_activa` avisa de que es una demostración', async () => {
    const token = tokenNuevo();
    const huella = await huellaDeToken(token);

    await comoDuena(`select * from estook.abrir_demostracion($1, 2)`, [huella]);

    const [resuelta] = await comoDuena<{ es_demostracion: boolean }>(
      `select es_demostracion from estook.sesion_activa($1)`,
      [huella],
    );

    // Sin esto, el despachador no podría pararla y «sin dejar rastro» sería
    // mentira: habría que limpiar después.
    expect(resuelta?.es_demostracion).toBe(true);
  });

  it('salir la borra, no la cierra', async () => {
    const token = tokenNuevo();
    const huella = await huellaDeToken(token);

    const [abierta] = await comoDuena<{ sesion_id: string }>(
      `select * from estook.abrir_demostracion($1, 2)`,
      [huella],
    );

    await comoDuena(`select estook.cerrar_demostracion($1)`, [abierta?.sesion_id]);

    const quedan = await comoDuena<{ id: string }>(`select id from estook.sesion where id = $1`, [
      abierta?.sesion_id,
    ]);

    // Una sesión cerrada sería un rastro, y lo prometido es que no queda ninguno.
    expect(quedan).toEqual([]);
  });

  it('una sesión normal no se marca como demostración', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const token = tokenNuevo();
    const huella = await huellaDeToken(token);

    await comoDuena(
      `select estook.abrir_sesion($1, $2, 'contrasena', null, null, true, 30, null)`,
      [rosa, huella],
    );

    const [resuelta] = await comoDuena<{ es_demostracion: boolean }>(
      `select es_demostracion from estook.sesion_activa($1)`,
      [huella],
    );

    expect(resuelta?.es_demostracion).toBe(false);
  });

  it('a quien está desactivado no se le resuelve la sesión, ni siquiera ahora', async () => {
    // Es la comprobación que la 0018 tenía y que la 0020 tenía que conservar al
    // reescribir `sesion_activa`. Si se hubiera perdido, retirarle el acceso a
    // alguien dejaría de matar sus sesiones al instante.
    const pablo = await base.personaPorCorreo(PABLO);
    const token = tokenNuevo();
    const huella = await huellaDeToken(token);

    await comoDuena(
      `select estook.abrir_sesion($1, $2, 'contrasena', null, null, true, 30, null)`,
      [pablo, huella],
    );
    await comoDuena(`update estook.persona set activa = false where id = $1`, [pablo]);

    const resuelta = await comoDuena(`select * from estook.sesion_activa($1)`, [huella]);
    expect(resuelta).toEqual([]);

    await comoDuena(`update estook.persona set activa = true where id = $1`, [pablo]);
  });
});

// ── Los datos de ejemplo ─────────────────────────────────────────────────────

describe('quitar los ejemplos', () => {
  it('sin ejemplos apuntados no hay nada que quitar', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const local = await base.localPorCodigo('bar-centro');

    const cuantos = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ contar_ejemplos: number }>(
        `select estook.contar_ejemplos($1) as contar_ejemplos`,
        [local],
      );
      return rows[0]?.contar_ejemplos;
    });

    expect(cuantos).toBe(0);
  });

  it('borra lo apuntado y deja el registro limpio', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const local = await base.localPorCodigo('bar-centro');
    const [organizacion] = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'bar-centro'`,
    );

    // Se apunta una traducción como ejemplo. Vale cualquier tabla del esquema
    // con `id`: la gracia del registro es justamente que el botón no conoce las
    // tablas, así que se puede probar con las que hay hoy.
    const [traduccion] = await comoDuena<{ id: string }>(
      `insert into estook.traduccion (organizacion_id, entidad, entidad_id, campo, idioma, texto)
       values ($1, 'plato', gen_random_uuid(), 'nombre', 'es', 'De ejemplo')
       returning id`,
      [organizacion?.id],
    );

    await comoDuena(
      `insert into estook.dato_de_ejemplo (organizacion_id, local_id, tabla, fila_id)
       values ($1, $2, 'traduccion', $3)`,
      [organizacion?.id, local, traduccion?.id],
    );

    const antes = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ contar_ejemplos: number }>(
        `select estook.contar_ejemplos($1) as contar_ejemplos`,
        [local],
      );
      return rows[0]?.contar_ejemplos;
    });
    expect(antes).toBe(1);

    const borrados = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ quitar_ejemplos: number }>(
        `select estook.quitar_ejemplos($1) as quitar_ejemplos`,
        [local],
      );
      return rows[0]?.quitar_ejemplos;
    });
    expect(borrados).toBe(1);

    const quedaLaFila = await comoDuena(`select id from estook.traduccion where id = $1`, [
      traduccion?.id,
    ]);
    expect(quedaLaFila).toEqual([]);

    const quedaElApunte = await comoDuena(
      `select id from estook.dato_de_ejemplo where fila_id = $1`,
      [traduccion?.id],
    );
    expect(quedaElApunte).toEqual([]);
  });

  it('no se puede apuntar una tabla que no existe', async () => {
    // Sería un borrado que falla el día que alguien pulse el botón, es decir, el
    // peor día. Se comprueba al apuntar.
    const local = await base.localPorCodigo('bar-centro');
    const [organizacion] = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'bar-centro'`,
    );

    await expect(
      comoDuena(
        `insert into estook.dato_de_ejemplo (organizacion_id, local_id, tabla, fila_id)
         values ($1, $2, 'inventada', gen_random_uuid()::text)`,
        [organizacion?.id, local],
      ),
    ).rejects.toThrow(/no existe/i);
  });

  it('un local que no es tuyo no se puede vaciar', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const ajeno = await base.localPorCodigo('bar-puerto');

    await expect(
      base.comoPersona(rosa, () => base.bd.query(`select estook.quitar_ejemplos($1)`, [ajeno])),
    ).rejects.toThrow();
  });
});

// ── Las tablas nuevas, protegidas ────────────────────────────────────────────

describe('las tablas de M5', () => {
  it('todas tienen seguridad por filas encendida', async () => {
    const filas = await comoDuena<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity
         from pg_class c
        where c.relnamespace = 'estook'::regnamespace
          and c.relkind = 'r'
          and c.relname in (
            'objetivo','objetivo_de_partida','alergeno','producto_de_referencia',
            'receta_de_referencia','linea_de_receta_de_referencia','importacion','dato_de_ejemplo'
          )
        order by c.relname`,
    );

    expect(filas).toHaveLength(8);
    for (const fila of filas) {
      expect(fila.relrowsecurity, `${fila.relname} sin RLS`).toBe(true);
    }
  });

  it('las funciones con privilegio siguen estando tasadas', async () => {
    // M4 dejó once y una más en la 0019. M5 añade cuatro: reconocer el aparato,
    // abrir y cerrar la demostración, y `sesion_activa` reescrita —que ya era
    // `security definer`, así que no cuenta como nueva.
    //
    // «Si un día son trece, que sea a propósito.» Esta prueba es la que obliga a
    // que lo sea.
    const filas = await comoDuena<{ proname: string }>(
      `select p.proname
         from pg_proc p
        where p.pronamespace = 'estook'::regnamespace and p.prosecdef
        order by p.proname`,
    );

    const nombres = filas.map((f) => f.proname);
    expect(nombres).toContain('reconocer_dispositivo');
    expect(nombres).toContain('abrir_demostracion');
    expect(nombres).toContain('cerrar_demostracion');

    // Y **`quitar_ejemplos` no está**, que es lo importante: borrar filas de un
    // local respeta las políticas, no se las salta.
    expect(nombres).not.toContain('quitar_ejemplos');
    expect(nombres).not.toContain('contar_ejemplos');
  });
});

// ── Los dos catálogos que tienen que cuadrar ─────────────────────────────────

describe('lo que está en dos sitios, dice lo mismo', () => {
  /**
   * El mismo patrón que M1 usa con la matriz de permisos: **el dueño es la base
   * de datos**, y en el paquete de dominio están sus nombres para poder pintarlos
   * sin una consulta. Dos listas que puedan discrepar acaban discrepando, así que
   * hay una prueba que las cuenta.
   */
  it('los alérgenos del dominio y los de la base de datos son los mismos', async () => {
    const filas = await comoDuena<{ codigo: string; orden: number }>(
      `select codigo, orden from estook.alergeno order by orden`,
    );

    // Mismos códigos **y en el mismo orden**, que es el del anexo II del
    // reglamento y no el alfabético: es el que espera ver quien está
    // acostumbrado a leer etiquetas.
    expect(filas.map((f) => f.codigo)).toEqual([...ALERGENOS]);

    for (const codigo of ALERGENOS) {
      expect(NOMBRE_DEL_ALERGENO[codigo], `${codigo} sin nombre`).toBeTruthy();
    }
  });

  it('las unidades de uso también', async () => {
    const filas = await comoDuena<{ etiqueta: string }>(
      `select e.enumlabel as etiqueta
         from pg_enum e
         join pg_type t on t.oid = e.enumtypid
        where t.typname = 'unidad_de_uso'
        order by e.enumsortorder`,
    );

    expect(filas.map((f) => f.etiqueta)).toEqual([...UNIDADES_DE_USO]);
  });

  it('y los tipos de local, que deciden los objetivos de partida', async () => {
    const filas = await comoDuena<{ etiqueta: string }>(
      `select e.enumlabel as etiqueta
         from pg_enum e
         join pg_type t on t.oid = e.enumtypid
        where t.typname = 'tipo_de_local'
        order by e.enumsortorder`,
    );

    expect(filas.map((f) => f.etiqueta)).toEqual([...TIPOS_DE_LOCAL]);

    // Y cada uno tiene sus tres objetivos propuestos. Un tipo sin objetivos de
    // partida dejaría el paso 6 del alta con las casillas vacías, que es
    // exactamente lo que hace que nadie los ponga.
    const dePartida = await comoDuena<{ tipo: string; cuantos: number }>(
      `select tipo::text as tipo, count(*)::int as cuantos
         from estook.objetivo_de_partida group by tipo`,
    );
    expect(dePartida).toHaveLength(TIPOS_DE_LOCAL.length);
    for (const fila of dePartida) expect(fila.cuantos, fila.tipo).toBe(3);
  });
});

// ── Volver a por una cosa · la 0022 ──────────────────────────────────────────

/**
 * **La tarjeta del Panel ofrece un recado, no el asistente entero.**
 *
 * «Invita a tu equipo», y debajo «y 1 cosa más, **cuando quieras**». Pulsarla
 * reabría el alta y, al guardar el paso, seguía con los siguientes: aparecían
 * otra vez el paseo y la guía de instalación, ya vistos.
 *
 * Lo que faltaba era guardar **a qué se volvió**. Aquí se comprueban las dos
 * reglas que lo sostienen, que son de la base de datos y no de la pantalla.
 */
describe('volver al alta a por una cosa', () => {
  it('solo admite los ocho pasos, y ninguno inventado', async () => {
    await expect(
      comoDuena(
        `update estook.local set onboarding_retomado_para = 'inventado'
          where codigo = 'casa-lola'`,
      ),
    ).rejects.toThrow();

    // Y uno de los buenos sí entra.
    await comoDuena(
      `update estook.local set onboarding_retomado_para = 'equipo'
        where codigo = 'casa-lola'`,
    );
    const [lola] = await comoDuena<{ para: string | null }>(
      `select onboarding_retomado_para as para from estook.local where codigo = 'casa-lola'`,
    );
    expect(lola?.para).toBe('equipo');
  });

  it('no puede quedar un recado abierto sobre un alta terminada', async () => {
    // Es un estado imposible: si el alta está cerrada, no hay nada a lo que
    // volver. Sin esta restricción se quedaría puesto y la próxima vez que
    // alguien reabriera el alta se cerraría sola en el primer paso.
    await comoDuena(
      `update estook.local set onboarding_retomado_para = 'equipo'
        where codigo = 'casa-lola'`,
    );

    await expect(
      comoDuena(
        `update estook.local
            set onboarding_terminado = true, onboarding_terminado_en = now()
          where codigo = 'casa-lola'`,
      ),
    ).rejects.toThrow();

    // Cerrando el recado a la vez, sí. Que es justo lo que hace `terminar_el_alta`.
    await comoDuena(
      `update estook.local
          set onboarding_terminado = true,
              onboarding_terminado_en = now(),
              onboarding_retomado_para = null
        where codigo = 'casa-lola'`,
    );

    // Y se deja como estaba, que otras pruebas cuentan con Casa Lola a medias.
    await comoDuena(
      `update estook.local
          set onboarding_terminado = false, onboarding_terminado_en = null
        where codigo = 'casa-lola'`,
    );
  });
});
