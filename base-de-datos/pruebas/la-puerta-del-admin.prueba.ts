import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La puerta del admin (0041, entrega A1), contra Postgres de verdad.
 *
 * «Toda regla de acceso se prueba llamando a la API a pelo» (regla 4). Lo que se
 * comprueba aquí es lo que ninguna pantalla puede garantizar:
 *
 *   · a quien no es admin se le contesta lo mismo que a una contraseña mal
 *   · una sesión de la app no abre el admin, **y una del admin no abre la app**
 *   · sin segundo factor, en el admin solo se puede montarlo
 *   · dar y quitar el acceso piden el código otra vez, y quedan apuntados
 *   · nunca uno mismo, nunca el último total, y lo guarda también la base
 *   · la auditoría no se puede tocar, y la sesión no puede durar más de 8 horas
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro, sin acceso al admin

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

const ahora = () => new Date(Date.now());

/** Entra en el admin como el admin de ejemplo, con su código ya escrito. */
async function entrarComoAdmin(): Promise<string> {
  const entrada = losDatos<{ token: string; faltaDobleFactor: boolean }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  expect(entrada.faltaDobleFactor).toBe(true);
  losDatos(
    await api.ejecutar(entrada.token, 'superar_doble_factor', {
      codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora()),
    }),
  );
  return entrada.token;
}

const miCodigo = () => codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora());

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Lo que guarda la base ────────────────────────────────────────────────────

describe('el esquema plataforma', () => {
  it('todas sus tablas tienen seguridad por filas', async () => {
    const sinRls = await comoDuena<{ relname: string }>(
      `select c.relname from pg_class c
        where c.relnamespace = 'plataforma'::regnamespace
          and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(sinRls.map((f) => f.relname)).toEqual([]);
  });

  it('sus funciones con privilegio son exactamente seis, y no las ejecuta cualquiera', async () => {
    // Las mismas razones que las de `estook`, contadas aparte: si un día son
    // cuatro, que sea a propósito. La tercera es de la 0042: `oferta_vigente`, que
    // la pantalla de crear cuenta lee antes de que haya sesión. Y la 0049 (A2) añade
    // las tres del cambio del correo de acceso: pedirlo —solo un admin total, y lo
    // comprueba ella—, y confirmarlo o pararlo desde el enlace, que no trae sesión.
    const definer = await comoDuena<{ proname: string; publico: boolean }>(
      `select p.proname, has_function_privilege('public', p.oid, 'execute') as publico
         from pg_proc p
        where p.pronamespace = 'plataforma'::regnamespace and p.prosecdef
        order by p.proname`,
    );
    expect(definer.map((f) => f.proname)).toEqual([
      'confirmar_cambio_de_correo',
      'dar_acceso',
      'nivel_de',
      'oferta_vigente',
      'parar_cambio_de_correo',
      'pedir_cambio_de_correo',
    ]);
    for (const fila of definer) {
      expect(fila.publico, `${fila.proname} la puede ejecutar cualquiera`).toBe(false);
    }
  });

  it('quien no es admin no ve ni una fila de quién lo es', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const vistas = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query('select * from plataforma.administrador');
      return rows;
    });
    expect(vistas).toEqual([]);
  });

  it('la auditoría del admin no se modifica ni se borra, ni siendo la dueña', async () => {
    await comoDuena(`insert into plataforma.auditoria (accion, entidad) values ('probar', 'nada')`);
    await expect(comoDuena(`update plataforma.auditoria set motivo = 'otro'`)).rejects.toThrow();
    await expect(comoDuena(`delete from plataforma.auditoria`)).rejects.toThrow();
  });

  it('un admin no se borra: se le quita el acceso', async () => {
    await expect(comoDuena(`delete from plataforma.administrador`)).rejects.toThrow();
  });

  it('la base no deja quitar al último admin total, aunque lo intente la dueña', async () => {
    const [vivos] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from plataforma.administrador
        where nivel = 'total' and quitado_en is null`,
    );
    // Con uno solo es cuando tiene que saltar: si hubiera dos, no probaría nada.
    expect(vivos?.n).toBe(1);

    await expect(
      comoDuena(
        `update plataforma.administrador
            set quitado_en = now(), quitado_por = persona_id, motivo_de_quitar = 'probar'
          where quitado_en is null`,
      ),
    ).rejects.toThrow(/sin ningún admin total/);
  });

  it('y una sesión del admin no puede durar más de ocho horas', async () => {
    const [sesion] = await comoDuena<{ id: string }>(`select id from estook.sesion limit 1`);
    // Si no hay ninguna todavía, se abre una para la prueba.
    const id =
      sesion?.id ??
      (
        await comoDuena<{ id: string }>(
          `insert into estook.sesion (persona_id, huella, entro_con, caduca_en)
           select id, repeat('a', 64), 'contrasena', now() + interval '30 days'
             from estook.persona where correo = $1
           returning id`,
          [ROSA],
        )
      )[0]?.id;

    await expect(
      comoDuena(
        `update estook.sesion set para_admin = true, caduca_en = creada_en + interval '30 days'
          where id = $1`,
        [id],
      ),
    ).rejects.toThrow();
  });
});

// ── Entrar ───────────────────────────────────────────────────────────────────

describe('entrar en el admin', () => {
  it('a quien no es admin se le contesta lo mismo que a una contraseña mal', async () => {
    const sinAcceso = await api.ejecutar(null, 'entrar_en_admin', {
      correo: ROSA,
      contrasena: CLAVE_DE_EJEMPLO,
    });
    const claveMal = await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: 'no es esta',
    });
    expect(elFallo(sinAcceso)).toBe('no_cuadra');
    expect(elFallo(claveMal)).toBe('no_cuadra');
  });

  it('abre una sesión del admin, de ocho horas, y la apunta', async () => {
    const token = await entrarComoAdmin();
    const yo = losDatos<{ nivel: string; caducaEn: string; faltaElCodigo: boolean }>(
      await api.consultar(token, 'admin_quien_soy'),
    );
    expect(yo.nivel).toBe('total');
    expect(yo.faltaElCodigo).toBe(false);

    const horas = (new Date(yo.caducaEn).getTime() - Date.now()) / 3_600_000;
    expect(horas).toBeGreaterThan(7.9);
    expect(horas).toBeLessThanOrEqual(8);

    const entradas = await comoDuena<{ n: number }>(
      `select count(*)::int as n from plataforma.auditoria a
         join estook.persona p on p.id = a.persona_id
        where p.correo = $1 and a.accion = 'entrar'`,
      [ADMIN_DE_EJEMPLO],
    );
    expect(entradas[0]?.n).toBeGreaterThan(0);
  });

  it('antes del código solo se puede escribir el código', async () => {
    const { token } = losDatos<{ token: string }>(
      await api.ejecutar(null, 'entrar_en_admin', {
        correo: ADMIN_DE_EJEMPLO,
        contrasena: CLAVE_DE_EJEMPLO,
      }),
    );
    // Quién soy sí: es lo que dice a la pantalla que tiene que pedirlo.
    const yo = losDatos<{ faltaElCodigo: boolean }>(await api.consultar(token, 'admin_quien_soy'));
    expect(yo.faltaElCodigo).toBe(true);
    expect(elFallo(await api.consultar(token, 'admin_administradores'))).toBe('falta_doble_factor');
  });
});

// ── Dos mundos que no se tocan ───────────────────────────────────────────────

describe('la app y el admin no se abren el uno al otro', () => {
  it('una sesión de la app no abre el admin, ni siendo admin', async () => {
    const deRosa = await api.entrar(ROSA);
    expect(elFallo(await api.consultar(deRosa, 'admin_administradores'))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(deRosa, 'admin_quien_soy'))).toBe('sin_permiso');
  });

  /*
    Lo que vio Richi el 23-sep: entrando en la **app** con la cuenta que solo es del
    admin, la app le pedía el código del segundo factor y después le decía que no
    tenía negocio. Parecía que las cuentas se mezclaban. Ahora la app lo dice antes
    de pedir nada, y no abre ninguna sesión.
  */
  it('la cuenta que solo es del admin no entra en la app, y no se le pide el código', async () => {
    const sesiones = async () =>
      (
        await comoDuena<{ n: number }>(
          `select count(*)::int as n from estook.sesion s
             join estook.persona p on p.id = s.persona_id
            where p.correo = $1`,
          [ADMIN_DE_EJEMPLO],
        )
      )[0]?.n ?? 0;
    const antes = await sesiones();

    const porLaApp = await api.ejecutar(null, 'entrar', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    });
    expect(elFallo(porLaApp)).toBe('sin_negocio');
    expect(await sesiones(), 'no se abre una sesión que no sirve para nada').toBe(antes);

    // Y con la contraseña mal, lo de siempre: no descubre que la cuenta existe.
    expect(
      elFallo(
        await api.ejecutar(null, 'entrar', { correo: ADMIN_DE_EJEMPLO, contrasena: 'no es esta' }),
      ),
    ).toBe('no_cuadra');
  });

  it('y una sesión del admin no sirve para la app', async () => {
    const token = await entrarComoAdmin();
    expect(elFallo(await api.consultar(token, 'quien_soy'))).toBe('sin_permiso');
    expect(
      elFallo(await api.ejecutar(token, 'cambiar_mi_idioma', { idioma: 'es', version: 1 })),
    ).toBe('sin_permiso');
  });

  it('pero salir sí, desde las dos', async () => {
    const token = await entrarComoAdmin();
    losDatos(await api.ejecutar(token, 'salir', {}));
    expect(elFallo(await api.consultar(token, 'admin_quien_soy'))).toBe('sin_sesion');
  });
});

// ── Dar y quitar el acceso ───────────────────────────────────────────────────

describe('dar acceso al admin', () => {
  const NUEVA = 'nueva-admin@correo-de-prueba.com';

  it('pide el código otra vez', async () => {
    const token = await entrarComoAdmin();
    const sinCodigo = await api.ejecutar(token, 'admin_dar_acceso', {
      correo: NUEVA,
      nombre: 'Nueva',
      nivel: 'total',
      codigo: '000000',
    });
    expect(elFallo(sinCodigo)).toBe('faltan_datos');
  });

  it('a quien no tiene cuenta se la crea, con clave de un solo uso, y queda apuntado', async () => {
    const token = await entrarComoAdmin();
    const dado = losDatos<{ personaId: string; personaNueva: boolean; clave: string | null }>(
      await api.ejecutar(token, 'admin_dar_acceso', {
        correo: NUEVA,
        nombre: 'Nueva',
        nivel: 'total',
        codigo: await miCodigo(),
      }),
    );
    expect(dado.personaNueva).toBe(true);
    expect(dado.clave).not.toBeNull();

    const lista = losDatos<{ correo: string; soyYo: boolean; dadoPor: string | null }[]>(
      await api.consultar(token, 'admin_administradores'),
    );
    expect(lista.map((a) => a.correo)).toContain(NUEVA);
    expect(lista.find((a) => a.correo === NUEVA)?.dadoPor).toBe('Ada');

    const auditoria = losDatos<{ lineas: { accion: string; sobreQuien: string | null }[] }>(
      await api.consultar(token, 'admin_auditoria'),
    );
    expect(
      auditoria.lineas.some((l) => l.accion === 'dar_acceso' && l.sobreQuien === 'Nueva'),
    ).toBe(true);

    // Dárselo otra vez no duplica nada.
    expect(
      elFallo(
        await api.ejecutar(token, 'admin_dar_acceso', {
          correo: NUEVA,
          nombre: 'Nueva',
          nivel: 'total',
          codigo: await miCodigo(),
        }),
      ),
    ).toBe('ya_hecho');
  });

  it('la persona nueva entra, se pone su contraseña y sin segundo factor no ve nada hasta montarlo', async () => {
    // La clave de un solo uso no se puede leer de la base: se le pone otra, como
    // haría la consola, y se entra con ella.
    const token = await entrarComoAdmin();
    const OTRA = 'otra-admin@correo-de-prueba.com';
    const { clave } = losDatos<{ clave: string }>(
      await api.ejecutar(token, 'admin_dar_acceso', {
        correo: OTRA,
        nombre: 'Otra',
        nivel: 'total',
        codigo: await miCodigo(),
      }),
    );

    const entrada = losDatos<{
      token: string;
      debeCambiarClave: boolean;
      debeActivarDobleFactor: boolean;
    }>(await api.ejecutar(null, 'entrar_en_admin', { correo: OTRA, contrasena: clave }));
    expect(entrada.debeCambiarClave).toBe(true);
    expect(entrada.debeActivarDobleFactor).toBe(true);

    const suyo = entrada.token;

    // Con la contraseña de un solo uso, **ni leer**: la ha visto quien la dio.
    expect(elFallo(await api.consultar(suyo, 'admin_administradores'))).toBe('clave_por_cambiar');
    expect(elFallo(await api.consultar(suyo, 'admin_auditoria'))).toBe('clave_por_cambiar');
    expect(
      losDatos<{ debeCambiarClave: boolean }>(await api.consultar(suyo, 'admin_quien_soy'))
        .debeCambiarClave,
    ).toBe(true);

    losDatos(
      await api.ejecutar(suyo, 'cambiar_mi_clave', {
        actual: clave,
        nueva: 'una frase larga que solo sé yo',
      }),
    );

    // Con la contraseña ya puesta, **sin segundo factor no pasa de la puerta**.
    expect(elFallo(await api.consultar(suyo, 'admin_administradores'))).toBe(
      'falta_activar_doble_factor',
    );

    const alta = losDatos<{ secreto: string }>(
      await api.ejecutar(suyo, 'activar_doble_factor', {}),
    );
    const secreto = alta.secreto.replace(/\s/g, '');
    losDatos(
      await api.ejecutar(suyo, 'confirmar_doble_factor', {
        codigo: await codigoEn(secreto, ahora()),
      }),
    );

    expect(
      losDatos<unknown[]>(await api.consultar(suyo, 'admin_administradores')).length,
    ).toBeGreaterThan(1);

    // Y ya no se lo puede quitar desde la app: en el admin es obligatorio.
    expect(
      elFallo(
        await api.ejecutar(suyo, 'quitar_doble_factor', {
          contrasena: 'una frase larga que solo sé yo',
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('a una persona de ejemplo no se le da acceso', async () => {
    const token = await entrarComoAdmin();
    expect(
      elFallo(
        await api.ejecutar(token, 'admin_dar_acceso', {
          correo: ROSA,
          nombre: 'Rosa',
          nivel: 'total',
          codigo: await miCodigo(),
        }),
      ),
    ).toBe('sin_permiso');
  });
});

describe('quitar el acceso al admin', () => {
  it('a uno mismo, no', async () => {
    const token = await entrarComoAdmin();
    const ada = await base.personaPorCorreo(ADMIN_DE_EJEMPLO);
    expect(
      elFallo(
        await api.ejecutar(token, 'admin_quitar_acceso', {
          personaId: ada,
          motivo: 'probar',
          codigo: await miCodigo(),
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('a otro, con motivo y código; y la sesión que tenía deja de valer en su siguiente petición', async () => {
    const token = await entrarComoAdmin();
    const QUITADA = 'quitada-admin@correo-de-prueba.com';
    const dado = losDatos<{ personaId: string; clave: string }>(
      await api.ejecutar(token, 'admin_dar_acceso', {
        correo: QUITADA,
        nombre: 'Quitada',
        nivel: 'total',
        codigo: await miCodigo(),
      }),
    );
    const suya = losDatos<{ token: string }>(
      await api.ejecutar(null, 'entrar_en_admin', { correo: QUITADA, contrasena: dado.clave }),
    ).token;

    losDatos(
      await api.ejecutar(token, 'admin_quitar_acceso', {
        personaId: dado.personaId,
        motivo: 'ya no trabaja con nosotros',
        codigo: await miCodigo(),
      }),
    );

    expect(elFallo(await api.consultar(suya, 'admin_quien_soy'))).toBe('sin_permiso');

    // Y se queda como historia, con quién y por qué.
    const lista = losDatos<
      {
        correo: string;
        quitadoEn: string | null;
        quitadoPor: string | null;
        motivoDeQuitar: string | null;
      }[]
    >(await api.consultar(token, 'admin_administradores'));
    const quitada = lista.find((a) => a.correo === QUITADA);
    expect(quitada?.quitadoEn).not.toBeNull();
    expect(quitada?.quitadoPor).toBe('Ada');
    expect(quitada?.motivoDeQuitar).toBe('ya no trabaja con nosotros');

    // Volver a quitarlo no encuentra nada que quitar.
    expect(
      elFallo(
        await api.ejecutar(token, 'admin_quitar_acceso', {
          personaId: dado.personaId,
          motivo: 'otra vez',
          codigo: await miCodigo(),
        }),
      ),
    ).toBe('no_existe');
  });
});
