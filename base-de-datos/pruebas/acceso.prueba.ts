import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comprobar, derivarConSalDelLocal, pinNuevo } from '../../servidor/dominio/secretos.ts';
import { CLAVE_DE_EJEMPLO } from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * M4 · identidad y acceso, contra Postgres de verdad.
 *
 * «Toda regla de acceso se prueba **llamando a la API a pelo**» (regla 4). Aquí se
 * llama incluso más abajo que la API: contra el SQL, con `set role estook_api` y
 * las políticas de M1 aplicando, que es exactamente lo que hace la capa de
 * aplicación.
 *
 * Lo que se comprueba aquí es lo que ninguna pantalla enseña y ningún tipo de
 * TypeScript puede garantizar: que dos personas del mismo local no comparten PIN,
 * que nadie ve la credencial de nadie, que retirar un acceso lo mata al instante,
 * y que las nueve puertas de atrás de la 0018 son exactamente nueve.
 */
let base: BaseDePrueba;

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';
const LUIS = 'luis@ejemplo.estook.com';
const ELENA = 'elena@ejemplo.estook.com';
const IGNACIO = 'ignacio@ejemplo.estook.com';

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

// ── Las tablas nuevas, protegidas ────────────────────────────────────────────

describe('las cinco tablas de M4', () => {
  it('todas tienen seguridad por filas encendida', async () => {
    const filas = await comoDuena<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity
         from pg_class c
        where c.relnamespace = 'estook'::regnamespace
          and c.relname in ('suscripcion','credencial','pin','doble_factor','sesion')
        order by c.relname`,
    );

    expect(filas).toHaveLength(5);
    for (const fila of filas) {
      expect(fila.relrowsecurity, `${fila.relname} sin RLS`).toBe(true);
    }
  });

  it('y ninguna tabla del esquema se ha quedado sin ella', async () => {
    // La misma comprobacion que M1 dejo puesta, ampliada sola: si M5 anade una
    // tabla y se olvida del RLS, esto salta sin tocar la prueba.
    const sinRls = await comoDuena<{ relname: string }>(
      `select c.relname from pg_class c
        where c.relnamespace = 'estook'::regnamespace
          and c.relkind = 'r'
          and not c.relrowsecurity`,
    );
    expect(sinRls.map((f) => f.relname)).toEqual([]);
  });

  it('las once puertas de atras son exactamente once, y solo las ejecuta estook_api', async () => {
    // Una funcion `security definer` mas de la cuenta es la forma mas silenciosa
    // de abrir el sistema entero. Esta prueba las cuenta y comprueba que ninguna
    // la puede ejecutar `public`.
    const definer = await comoDuena<{ proname: string; publico: boolean }>(
      `select p.proname,
              has_function_privilege('public', p.oid, 'execute') as publico
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'estook'
          and p.prosecdef
          and p.proname in (
            'credencial_para_entrar','pines_para_entrar','pin_del_quiosco',
            'anotar_intento_de_contrasena','anotar_intento_de_pin','abrir_sesion',
            'sesion_activa','persona_por_correo','poner_credencial',
            'cerrar_sesiones_de','tiene_como_volver_a_entrar'
          )
        order by p.proname`,
    );

    expect(definer).toHaveLength(11);
    for (const fila of definer) {
      expect(fila.publico, `${fila.proname} la puede ejecutar cualquiera`).toBe(false);
    }
  });

  it('y `estook.buscar` sigue SIN ser security definer', async () => {
    // De M3, y se vuelve a comprobar aqui a proposito: M4 ha anadido nueve
    // funciones con privilegio, y es justo el momento en el que alguien podria
    // pensar que el buscador tambien deberia tenerlo.
    const [buscar] = await comoDuena<{ prosecdef: boolean }>(
      `select p.prosecdef from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'estook' and p.proname = 'buscar'`,
    );
    expect(buscar?.prosecdef).toBe(false);
  });
});

// ── PIN único por local ──────────────────────────────────────────────────────

describe('PIN unico por local', () => {
  it('lo garantiza un indice, no una comprobacion', async () => {
    const indices = await comoDuena<{ indexdef: string }>(
      `select indexdef from pg_indexes
        where schemaname = 'estook' and indexname = 'pin_unico_en_su_local'`,
    );
    expect(indices[0]?.indexdef).toMatch(/UNIQUE/i);
    expect(indices[0]?.indexdef).toMatch(/local_id/);
    expect(indices[0]?.indexdef).toMatch(/huella/);
  });

  it('dos personas del mismo local NO pueden compartir PIN', async () => {
    const local = await base.localPorCodigo('bar-centro');
    const marcos = await base.personaPorCorreo('marcos@ejemplo.estook.com');

    const filas = await comoDuena<{ sal_del_pin: string }>(
      'select sal_del_pin from estook.local where id = $1',
      [local],
    );
    const sal = filas[0]?.sal_del_pin ?? '';

    // El PIN que ya tiene Sara en el Bar Centro, derivado con la sal del local.
    const elDeSara = base.pinDe(SARA, 'bar-centro');
    const huella = await derivarConSalDelLocal(elDeSara, sal);

    await expect(
      comoDuena(`update estook.pin set huella = $1 where persona_id = $2 and local_id = $3`, [
        huella,
        marcos,
        local,
      ]),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it('pero el mismo PIN en dos locales distintos si vale', async () => {
    // Son negocios distintos: que la camarera del Bar Centro y el jefe de cocina
    // del Bar Puerto tengan el mismo PIN no le importa a nadie.
    const centro = await base.localPorCodigo('bar-centro');
    const puerto = await base.localPorCodigo('bar-puerto');

    const sales = await comoDuena<{ id: string; sal_del_pin: string }>(
      'select id, sal_del_pin from estook.local where id in ($1, $2)',
      [centro, puerto],
    );

    const salCentro = sales.find((s) => s.id === centro)?.sal_del_pin ?? '';
    const salPuerto = sales.find((s) => s.id === puerto)?.sal_del_pin ?? '';

    const mismoPin = '482913';
    const enCentro = await derivarConSalDelLocal(mismoPin, salCentro);
    const enPuerto = await derivarConSalDelLocal(mismoPin, salPuerto);

    // Huellas distintas, asi que el indice unico ni se entera.
    expect(enCentro).not.toBe(enPuerto);
  });

  it('la semilla no ha repetido ningun PIN dentro de un local', () => {
    const porLocal = new Map<string, Set<string>>();
    for (const { local, pin } of base.acceso.pines) {
      const suyos = porLocal.get(local) ?? new Set();
      expect(suyos.has(pin), `PIN repetido en ${local}`).toBe(false);
      suyos.add(pin);
      porLocal.set(local, suyos);
    }
    expect(porLocal.size).toBeGreaterThan(0);
  });

  it('el quiosco identifica a quien teclea, con el local puesto', async () => {
    // Es de M14, pero la pieza es de M4 y se prueba aqui: sin ella, «se teclea el
    // PIN y aparece la confirmacion tres segundos» no se puede construir.
    const local = await base.localPorCodigo('bar-centro');
    const filas = await comoDuena<{ sal_del_pin: string }>(
      'select sal_del_pin from estook.local where id = $1',
      [local],
    );
    const sal = filas[0]?.sal_del_pin ?? '';

    const huella = await derivarConSalDelLocal(base.pinDe(ROSA, 'bar-centro'), sal);
    const encontrada = await comoDuena<{ persona_id: string }>(
      'select persona_id from estook.pin_del_quiosco($1, $2)',
      [local, huella],
    );

    expect(encontrada[0]?.persona_id).toBe(await base.personaPorCorreo(ROSA));
  });
});

// ── Nadie ve la credencial de nadie ──────────────────────────────────────────

describe('las credenciales', () => {
  it('cada uno ve la suya', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const suyas = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query('select persona_id from estook.credencial');
      return rows;
    });
    expect(suyas).toHaveLength(1);
  });

  it('**y la de nadie mas, ni siendo la gerente del local**', async () => {
    // Rosa es gerente del Bar Centro y puede invitar y quitar accesos. Aun asi no
    // ve la credencial de Sara: una contrasena no se «gestiona», se cambia.
    const rosa = await base.personaPorCorreo(ROSA);
    const sara = await base.personaPorCorreo(SARA);

    const deSara = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query(
        'select persona_id from estook.credencial where persona_id = $1',
        [sara],
      );
      return rows;
    });
    expect(deSara).toEqual([]);
  });

  it('ni la direccion de la cadena ve las de su gente', async () => {
    const elena = await base.personaPorCorreo(ELENA);
    const otras = await base.comoPersona(elena, async () => {
      const { rows } = await base.bd.query(
        'select persona_id from estook.credencial where persona_id <> $1',
        [elena],
      );
      return rows;
    });
    expect(otras).toEqual([]);
  });

  it('lo guardado no se parece a la contrasena', async () => {
    const filas = await comoDuena<{ derivada: string }>('select derivada from estook.credencial');
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(fila.derivada).not.toContain(CLAVE_DE_EJEMPLO);
      expect(fila.derivada).toMatch(/^pbkdf2-sha256\$\d+\$/);
    }
  });

  it('y la de la semilla es la que dice ser', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const [fila] = await comoDuena<{ derivada: string }>(
      'select derivada from estook.credencial where persona_id = $1',
      [rosa],
    );
    await expect(comprobar(CLAVE_DE_EJEMPLO, fila?.derivada ?? '')).resolves.toBe(true);
    await expect(comprobar('otra cosa cualquiera', fila?.derivada ?? '')).resolves.toBe(false);
  });
});

// ── Entrar sin identidad ─────────────────────────────────────────────────────

describe('las funciones de entrar, que ven sin identidad', () => {
  it('`credencial_para_entrar` encuentra por correo, sin haber entrado', async () => {
    // Es la puerta de atras deliberada: al entrar no hay identidad que consultar.
    const filas = await base.comoPersona(null, async () => {
      const { rows } = await base.bd.query('select * from estook.credencial_para_entrar($1)', [
        ROSA,
      ]);
      return rows as { persona_id: string; derivada: string }[];
    });

    expect(filas).toHaveLength(1);
    await expect(comprobar(CLAVE_DE_EJEMPLO, filas[0]?.derivada ?? '')).resolves.toBe(true);
  });

  it('y con un correo que no existe devuelve vacio, sin decir nada mas', async () => {
    const filas = await base.comoPersona(null, async () => {
      const { rows } = await base.bd.query('select * from estook.credencial_para_entrar($1)', [
        'nadie@ejemplo.estook.com',
      ]);
      return rows;
    });
    expect(filas).toEqual([]);
  });

  it('`sesion_activa` no devuelve una sesion cerrada', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const huella = 'a'.repeat(64);

    await comoDuena('select estook.abrir_sesion($1, $2, $3, null, null, true, 30)', [
      rosa,
      huella,
      'contrasena',
    ]);

    const viva = await comoDuena('select * from estook.sesion_activa($1)', [huella]);
    expect(viva).toHaveLength(1);

    await comoDuena('select estook.cerrar_sesiones_de($1, null)', [rosa]);

    const muerta = await comoDuena('select * from estook.sesion_activa($1)', [huella]);
    expect(muerta).toEqual([]);
  });

  it('ni una caducada', async () => {
    const sara = await base.personaPorCorreo(SARA);
    const huella = 'b'.repeat(64);

    await comoDuena(
      `insert into estook.sesion (persona_id, huella, entro_con, caduca_en, creada_en)
       values ($1, $2, 'pin', now() - interval '1 day', now() - interval '40 days')`,
      [sara, huella],
    );

    expect(await comoDuena('select * from estook.sesion_activa($1)', [huella])).toEqual([]);
  });

  it('del token no se guarda el token', async () => {
    const filas = await comoDuena<{ huella: string }>('select huella from estook.sesion');
    for (const fila of filas) {
      // SHA-256 en hexadecimal, y nada mas.
      expect(fila.huella).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

// ── Retirar el acceso ────────────────────────────────────────────────────────

describe('retirar el acceso mata el PIN al instante', () => {
  it('**al instante quiere decir al instante, no a medianoche**', async () => {
    // Esta prueba encontró un fallo de verdad, y por eso está escrita así.
    //
    // La primera versión cerraba la membresía con `hasta = ayer`. Contra las
    // semillas —donde todo el mundo entró hoy— eso deja una membresía que acaba
    // antes de empezar, y la restricción de la 0002 lo rechaza: retirarle el
    // acceso a alguien contratado ese mismo día fallaba con un error de base de
    // datos. Con `hasta = hoy` no fallaba, pero seguía viendo el local hasta
    // medianoche.
    //
    // Se resolvió separando las dos cosas: `hasta` es el histórico y
    // `revocada_en` es el corte. Aquí se comprueban las dos.
    const marcos = await base.personaPorCorreo('marcos@ejemplo.estook.com');
    const local = await base.localPorCodigo('bar-centro');

    const antes = await comoDuena<{ local_id: string }>(
      'select local_id from estook.locales_visibles($1)',
      [marcos],
    );
    expect(antes.map((f) => f.local_id)).toContain(local);

    // Justo lo que hace el comando `retirar_acceso`.
    await comoDuena(
      `update estook.membresia
          set hasta = greatest(desde, current_date), revocada_en = now()
        where persona_id = $1`,
      [marcos],
    );
    await comoDuena('delete from estook.pin where persona_id = $1', [marcos]);

    // Y no hace falta esperar a mañana.
    const despues = await comoDuena<{ local_id: string }>(
      'select local_id from estook.locales_visibles($1)',
      [marcos],
    );
    expect(despues).toEqual([]);

    // Tampoco los permisos, que es lo que de verdad protege.
    const [nivel] = await comoDuena<{ nivel: string }>(
      `select estook.nivel_de_permiso($1, $2, 'app.inventario')::text as nivel`,
      [marcos, local],
    );
    expect(nivel?.nivel).toBe('sin_acceso');

    // Y su PIN ya no abre nada.
    const suPin = await comoDuena('select id from estook.pin where persona_id = $1', [marcos]);
    expect(suPin).toEqual([]);

    // Pero la membresía sigue ahí, con la fecha de cuando acabó.
    const [historico] = await comoDuena<{ hasta: Date | null }>(
      'select hasta from estook.membresia where persona_id = $1',
      [marcos],
    );
    expect(historico?.hasta).not.toBeNull();

    // Se deja como estaba, que las demás pruebas cuentan con él.
    await comoDuena(
      'update estook.membresia set hasta = null, revocada_en = null where persona_id = $1',
      [marcos],
    );
  });

  it('y a quien entró hoy también se le puede retirar, sin romper nada', async () => {
    // El caso que falló. Todas las membresías de las semillas empiezan hoy.
    const sara = await base.personaPorCorreo(SARA);

    const [suya] = await comoDuena<{ desde: Date }>(
      'select desde from estook.membresia where persona_id = $1',
      [sara],
    );
    expect(suya?.desde).not.toBeNull();

    await expect(
      comoDuena(
        `update estook.membresia
            set hasta = greatest(desde, current_date), revocada_en = now()
          where persona_id = $1`,
        [sara],
      ),
    ).resolves.toBeDefined();

    const nada = await comoDuena('select local_id from estook.locales_visibles($1)', [sara]);
    expect(nada).toEqual([]);

    await comoDuena(
      'update estook.membresia set hasta = null, revocada_en = null where persona_id = $1',
      [sara],
    );
  });

  it('pero la persona sigue, con su historial', async () => {
    // «La persona no se borra: sigue en lo que firmo, en sus fichajes y en su
    // historial» (Auditoria, 2.11).
    const marcos = await comoDuena<{ id: string }>(
      'select id from estook.persona where correo = $1',
      ['marcos@ejemplo.estook.com'],
    );
    expect(marcos).toHaveLength(1);
  });
});

// ── Segundo administrador o correo de recuperación ───────────────────────────

describe('«segundo administrador o correo de recuperacion obligatorio»', () => {
  it('con dos personas que administran, se puede quitar a una', async () => {
    const organizacion = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'grupo-costa'`,
    );
    const elena = await base.personaPorCorreo(ELENA);

    // Elena es la unica direccion del Grupo Costa: quitarla lo dejaria sin nadie.
    const sinElla = await comoDuena<{ tiene: boolean }>(
      'select estook.tiene_como_volver_a_entrar($1, $2) as tiene',
      [organizacion[0]?.id, elena],
    );
    expect(sinElla[0]?.tiene).toBe(false);
  });

  it('con un correo de recuperacion puesto, ya se puede', async () => {
    const [organizacion] = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'grupo-costa'`,
    );
    const elena = await base.personaPorCorreo(ELENA);

    await comoDuena(`update estook.organizacion set correo_de_recuperacion = $1 where id = $2`, [
      'recuperacion@ejemplo.estook.com',
      organizacion?.id,
    ]);

    const ahora = await comoDuena<{ tiene: boolean }>(
      'select estook.tiene_como_volver_a_entrar($1, $2) as tiene',
      [organizacion?.id, elena],
    );
    expect(ahora[0]?.tiene).toBe(true);

    await comoDuena(`update estook.organizacion set correo_de_recuperacion = null where id = $1`, [
      organizacion?.id,
    ]);
  });

  it('un correo con mala forma no entra en la base de datos', async () => {
    const [organizacion] = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'grupo-costa'`,
    );
    await expect(
      comoDuena('update estook.organizacion set correo_de_recuperacion = $1 where id = $2', [
        'esto no es un correo',
        organizacion?.id,
      ]),
    ).rejects.toThrow();
  });
});

// ── Poner la contraseña a otra persona ───────────────────────────────────────

describe('poner la contrasena a otra persona', () => {
  it('quien puede invitar en el local, puede', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const sara = await base.personaPorCorreo(SARA);
    const [organizacion] = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'bar-centro'`,
    );

    await base.comoPersona(rosa, async () => {
      await base.bd.query('select estook.poner_credencial($1, $2, $3)', [
        sara,
        'pbkdf2-sha256$210000$c2FsYWRhc2FsYWRh$ZGVyaXZhZGFkZXJpdmFkYQ',
        organizacion?.id,
      ]);
    });

    // Y queda marcada para que Sara la cambie antes de tocar nada.
    const [credencial] = await comoDuena<{ debe_cambiarla: boolean }>(
      'select debe_cambiarla from estook.credencial where persona_id = $1',
      [sara],
    );
    expect(credencial?.debe_cambiarla).toBe(true);
  });

  it('**y quien no, no**, aunque llame a la funcion a pelo', async () => {
    // Esta es la prueba de la regla 4: la funcion comprueba el permiso ella
    // misma, asi que llamarla saltandose el comando no sirve de nada.
    const sara = await base.personaPorCorreo(SARA);
    const luis = await base.personaPorCorreo(LUIS);
    const [organizacion] = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'grupo-costa'`,
    );

    await expect(
      base.comoPersona(sara, async () => {
        await base.bd.query('select estook.poner_credencial($1, $2, $3)', [
          luis,
          'pbkdf2-sha256$210000$c2FsYWRhc2FsYWRh$ZGVyaXZhZGFkZXJpdmFkYQ',
          organizacion?.id,
        ]);
      }),
    ).rejects.toThrow(/no se puede poner la contrasena/i);
  });
});

// ── La suscripción ───────────────────────────────────────────────────────────

describe('la suscripcion', () => {
  it('toda organizacion tiene la suya, o no podria entrar nadie', async () => {
    const sinSuscripcion = await comoDuena<{ codigo: string }>(
      `select o.codigo from estook.organizacion o
        where not exists (select 1 from estook.suscripcion s where s.organizacion_id = o.id)`,
    );
    expect(sinSuscripcion).toEqual([]);
  });

  it('y una organizacion nueva nace en prueba, sin que nadie se acuerde', async () => {
    await comoDuena(
      `insert into estook.organizacion (codigo, nombre) values ('bar-de-prueba', 'Bar de Prueba')`,
    );
    const [suya] = await comoDuena<{ estado: string; prueba_hasta: Date }>(
      `select s.estado::text as estado, s.prueba_hasta
         from estook.suscripcion s
         join estook.organizacion o on o.id = s.organizacion_id
        where o.codigo = 'bar-de-prueba'`,
    );

    expect(suya?.estado).toBe('prueba');
    // «La prueba: 14 dias, sin tarjeta.»
    expect(suya?.prueba_hasta).not.toBeNull();

    await comoDuena(`delete from estook.suscripcion where organizacion_id in (
      select id from estook.organizacion where codigo = 'bar-de-prueba')`);
    await comoDuena(`delete from estook.organizacion where codigo = 'bar-de-prueba'`);
  });

  it('la ve quien ve la organizacion, y no la del vecino', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const suyas = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query('select organizacion_id from estook.suscripcion');
      return rows;
    });
    // Rosa lleva el Bar Centro y nada mas: ve una.
    expect(suyas).toHaveLength(1);
  });
});

// ── Las sesiones ─────────────────────────────────────────────────────────────

describe('las sesiones', () => {
  it('cada uno ve las suyas', async () => {
    const ignacio = await base.personaPorCorreo(IGNACIO);
    const huella = 'c'.repeat(64);
    await comoDuena('select estook.abrir_sesion($1, $2, $3, null, null, true, 30)', [
      ignacio,
      huella,
      'contrasena',
    ]);

    const suyas = await base.comoPersona(ignacio, async () => {
      const { rows } = await base.bd.query('select id from estook.sesion');
      return rows;
    });
    expect(suyas.length).toBeGreaterThan(0);
  });

  it('y la camarera no ve las de su gerente', async () => {
    const sara = await base.personaPorCorreo(SARA);
    const rosa = await base.personaPorCorreo(ROSA);

    const deRosa = await base.comoPersona(sara, async () => {
      const { rows } = await base.bd.query('select id from estook.sesion where persona_id = $1', [
        rosa,
      ]);
      return rows;
    });
    expect(deRosa).toEqual([]);
  });

  it('el contexto vive en la sesion, no en el navegador', async () => {
    // Es lo que hace que cambiar de local no obligue a entrar otra vez.
    const columnas = await comoDuena<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'estook' and table_name = 'sesion'
          and column_name in ('organizacion_id', 'local_id')`,
    );
    expect(columnas).toHaveLength(2);
  });
});

// ── El bloqueo a los cinco intentos ──────────────────────────────────────────

describe('bloqueo a los cinco intentos', () => {
  it('el quinto fallo bloquea, el cuarto no', async () => {
    const luis = await base.personaPorCorreo(LUIS);

    await comoDuena(
      'update estook.credencial set intentos_fallidos = 0, bloqueada_hasta = null where persona_id = $1',
      [luis],
    );

    for (let intento = 1; intento <= 4; intento++) {
      await comoDuena('select estook.anotar_intento_de_contrasena($1, false)', [luis]);
    }

    const [cuatro] = await comoDuena<{ bloqueada_hasta: Date | null }>(
      'select bloqueada_hasta from estook.credencial where persona_id = $1',
      [luis],
    );
    expect(cuatro?.bloqueada_hasta).toBeNull();

    await comoDuena('select estook.anotar_intento_de_contrasena($1, false)', [luis]);

    const [cinco] = await comoDuena<{ bloqueada_hasta: Date | null }>(
      'select bloqueada_hasta from estook.credencial where persona_id = $1',
      [luis],
    );
    expect(cinco?.bloqueada_hasta).not.toBeNull();
  });

  it('y acertar lo desbloquea y pone el contador a cero', async () => {
    const luis = await base.personaPorCorreo(LUIS);
    await comoDuena('select estook.anotar_intento_de_contrasena($1, true)', [luis]);

    const [tras] = await comoDuena<{ intentos_fallidos: number; bloqueada_hasta: Date | null }>(
      'select intentos_fallidos, bloqueada_hasta from estook.credencial where persona_id = $1',
      [luis],
    );
    expect(tras?.intentos_fallidos).toBe(0);
    expect(tras?.bloqueada_hasta).toBeNull();
  });

  it('el PIN se bloquea igual, y por su cuenta', async () => {
    // Bloquear el PIN no bloquea la contrasena: quien se equivoca tecleando en el
    // quiosco tiene que poder entrar desde el movil con su correo.
    const rosa = await base.personaPorCorreo(ROSA);
    const [pin] = await comoDuena<{ id: string }>(
      'select id from estook.pin where persona_id = $1 limit 1',
      [rosa],
    );

    for (let intento = 1; intento <= 5; intento++) {
      await comoDuena('select estook.anotar_intento_de_pin($1, false)', [pin?.id]);
    }

    const [bloqueado] = await comoDuena<{ bloqueado_hasta: Date | null }>(
      'select bloqueado_hasta from estook.pin where id = $1',
      [pin?.id],
    );
    expect(bloqueado?.bloqueado_hasta).not.toBeNull();

    const [credencial] = await comoDuena<{ bloqueada_hasta: Date | null }>(
      'select bloqueada_hasta from estook.credencial where persona_id = $1',
      [rosa],
    );
    expect(credencial?.bloqueada_hasta).toBeNull();

    await comoDuena('select estook.anotar_intento_de_pin($1, true)', [pin?.id]);
  });
});

// ── El onboarding ────────────────────────────────────────────────────────────

describe('el onboarding, que decide la quinta comprobacion', () => {
  it('los locales sembrados estan montados', async () => {
    const aMedias = await comoDuena<{ codigo: string }>(
      'select codigo from estook.local where not onboarding_terminado',
    );
    expect(aMedias).toEqual([]);
  });

  it('y el paso no se sale de los ocho', async () => {
    await expect(comoDuena('update estook.local set onboarding_paso = 9')).rejects.toThrow();
  });
});

// ── Y lo que M3 dejó hecho sigue hecho ───────────────────────────────────────

describe('M4 no ha roto M3', () => {
  it('la camarera sigue recibiendo cuatro apps de la rueda', async () => {
    const sara = await base.personaPorCorreo(SARA);
    const local = await base.localPorCodigo('bar-centro');

    const apps = await base.comoPersona(sara, async () => {
      const { rows } = await base.bd.query<{ codigo: string }>(
        `select p.codigo
           from estook.permiso p
          where p.codigo like 'app.%'
            and estook.nivel_de_permiso($1::uuid, $2::uuid, p.codigo) <> 'sin_acceso'
          order by p.codigo`,
        [sara, local],
      );
      return rows.map((f) => f.codigo);
    });

    expect(apps).toEqual([
      'app.calendario',
      'app.carta',
      'app.cuaderno',
      'app.fogon',
      'app.panel',
      'app.servicio',
    ]);
  });

  it('el area manager sigue viendo exactamente tres locales', async () => {
    const ignacio = await base.personaPorCorreo(IGNACIO);
    const suyos = await comoDuena<{ local_id: string }>(
      'select local_id from estook.locales_visibles($1)',
      [ignacio],
    );
    expect(suyos).toHaveLength(3);
  });

  it('y sin decir quien pregunta no se ve nada', async () => {
    const nada = await base.comoPersona(null, async () => {
      const { rows } = await base.bd.query('select id from estook.local');
      return rows;
    });
    expect(nada).toEqual([]);
  });
});

// Se usa para que la prueba del PIN unico no dependa de que exista uno concreto.
void pinNuevo;

// ── Los dos criterios de terminado de M4, con datos de verdad ────────────────

describe('los criterios de M4, contra las semillas', () => {
  it('**una camarera con dos locales**: Nuria llega a dos y a ninguno mas', async () => {
    const nuria = await base.personaPorCorreo('nuria@ejemplo.estook.com');

    const suyos = await comoDuena<{ codigo: string }>(
      `select l.codigo from estook.local l
        where l.id in (select local_id from estook.locales_visibles($1))
        order by l.codigo`,
      [nuria],
    );

    expect(suyos.map((f) => f.codigo)).toEqual(['bar-playa', 'bar-puerto']);
  });

  it('y su alcance es de local, asi que se le pregunta donde esta', async () => {
    // La diferencia con Ignacio, que tambien llega a varios: el suyo es de area,
    // asi que entra en el conjunto. Este es el par de casos que hace que el orden
    // de las comprobaciones importe.
    const nuria = await base.personaPorCorreo('nuria@ejemplo.estook.com');

    const alcances = await comoDuena<{ alcance: string }>(
      `select distinct m.alcance::text as alcance
         from estook.membresia m where m.persona_id = $1`,
      [nuria],
    );

    expect(alcances.map((f) => f.alcance)).toEqual(['local']);
  });

  it('tiene un PIN distinto en cada uno de los dos', () => {
    const enPuerto = base.pinDe('nuria@ejemplo.estook.com', 'bar-puerto');
    const enPlaya = base.pinDe('nuria@ejemplo.estook.com', 'bar-playa');

    // Podrian coincidir por azar, y no pasaria nada: son locales distintos. Lo
    // que se comprueba es que tiene uno en cada sitio, que es lo que permite
    // entrar tecleando el del local en el que esta.
    expect(enPuerto).toMatch(/^[0-9]{6}$/);
    expect(enPlaya).toMatch(/^[0-9]{6}$/);
  });
});

// ── Dar de alta a una persona · el fallo que encontró el repaso ──────────────

describe('dar de alta a una persona', () => {
  /**
   * **Invitar a alguien nuevo no funcionaba, y las quinientas pruebas pasaban.**
   *
   * `estook.persona` tenía seguridad por filas y ninguna política de alta, así
   * que el `insert` no podía pasar. No se vio porque el comando crea la persona
   * **solo si el correo no existe**, y contra estas semillas —donde las siete
   * personas ya están— ese camino no se recorría nunca.
   *
   * Lo arregla la migración `0019`, y estas pruebas son para que no vuelva.
   */
  it('quien puede invitar, puede dar de alta', async () => {
    const rosa = await base.personaPorCorreo(ROSA);

    const creada = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query<{ id: string }>(
        "select estook.dar_de_alta_persona($1, 'Alta', 'De Prueba') as id",
        [`alta-${Date.now()}@ejemplo.estook.com`],
      );
      return rows[0]?.id;
    });

    expect(creada).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('**y quien no puede invitar, no**, aunque llame a la función a pelo', async () => {
    // La regla 4: la protección se prueba llamando por debajo de la pantalla.
    const marcos = await base.personaPorCorreo('marcos@ejemplo.estook.com');

    await expect(
      base.comoPersona(marcos, async () => {
        await base.bd.query("select estook.dar_de_alta_persona($1, 'Nadie')", [
          `nadie-${Date.now()}@ejemplo.estook.com`,
        ]);
      }),
    ).rejects.toThrow(/no se puede dar de alta/i);
  });

  it('la cadena entera: persona, membresía y PIN', async () => {
    // El fallo estaba en la costura entre el comando y la política, así que se
    // recorre entera y no por partes.
    const rosa = await base.personaPorCorreo(ROSA);
    const local = await base.localPorCodigo('bar-centro');
    const organizaciones = await comoDuena<{ id: string }>(
      `select id from estook.organizacion where codigo = 'bar-centro'`,
    );
    const correo = `cadena-${Date.now()}@ejemplo.estook.com`;

    await base.comoPersona(rosa, async () => {
      const { rows: nueva } = await base.bd.query<{ id: string }>(
        "select estook.dar_de_alta_persona($1, 'Cadena') as id",
        [correo],
      );
      const persona = nueva[0]?.id;

      const { rows: membresia } = await base.bd.query(
        `insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
         values ($1, $2, $3, 'local', 'camarero') returning id`,
        [persona, organizaciones[0]?.id, local],
      );
      expect(membresia, 'la membresía se crea').toHaveLength(1);

      const { rows: pin } = await base.bd.query(
        `insert into estook.pin (persona_id, local_id, huella)
         values ($1, $2, 'pbkdf2-sha256$1$aaaa$bbbb') returning id`,
        [persona, local],
      );
      expect(pin, 'y el PIN también').toHaveLength(1);

      // Y ahora ya se la puede leer: tiene membresía, así que comparte
      // organización. Antes de tenerla no, y eso es lo que rompía el `returning`.
      const { rows: leida } = await base.bd.query(
        'select nombre from estook.persona where id = $1',
        [persona],
      );
      expect(leida, 'y se la puede leer').toHaveLength(1);
    });
  });

  it('un `insert ... returning` sobre una persona sin membresía **no pasa**', async () => {
    // Esta es la razón de que `dar_de_alta_persona` exista, y costó entenderla:
    // con `returning`, Postgres aplica también la política de **lectura** a la
    // fila devuelta. Una persona recién creada no tiene membresía, así que no
    // comparte organización con nadie y no se puede leer. El `insert` entra y el
    // `returning` lo tumba, con el mismo mensaje que si no hubiera política.
    const rosa = await base.personaPorCorreo(ROSA);

    await expect(
      base.comoPersona(rosa, async () => {
        await base.bd.query(
          'insert into estook.persona (correo, nombre) values ($1, $2) returning id',
          [`directo-${Date.now()}@ejemplo.estook.com`, 'Directo'],
        );
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it('y reactivar a quien se fue sí toca su ficha', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const sara = await base.personaPorCorreo(SARA);

    await comoDuena('update estook.persona set activa = false where id = $1', [sara]);

    await base.comoPersona(rosa, async () => {
      await base.bd.query('update estook.persona set activa = true where id = $1', [sara]);
    });

    const [tras] = await comoDuena<{ activa: boolean }>(
      'select activa from estook.persona where id = $1',
      [sara],
    );
    expect(tras?.activa).toBe(true);
  });

  it('pero no la de alguien de otra organización', async () => {
    // Rosa lleva el Bar Centro; Luis trabaja en el Grupo Costa.
    const rosa = await base.personaPorCorreo(ROSA);
    const luis = await base.personaPorCorreo(LUIS);

    await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query(
        'update estook.persona set nombre = $1 where id = $2 returning id',
        ['Cambiado', luis],
      );
      // No falla: sencillamente no toca ninguna fila, que es como se comporta
      // una política de M1 cuando dice que no.
      expect(rows).toEqual([]);
    });

    const [luisSigue] = await comoDuena<{ nombre: string }>(
      'select nombre from estook.persona where id = $1',
      [luis],
    );
    expect(luisSigue?.nombre).toBe('Luis');
  });
});
