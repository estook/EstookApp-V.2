import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { pagosDeMentira } from '../../servidor/infraestructura/pagos-de-mentira.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * A3 · Los vendedores (decisión 0076 · migración 0058), contra Postgres de verdad y
 * con el Stripe de mentira.
 *
 *   · los vendedores solo los lee el admin; la base no deja apuntar con quién vino
 *     un cliente que ya existía
 *   · el código se comprueba sin sesión, y no dice de quién es
 *   · al crear la cuenta se apunta con qué código y por dónde vino, y un código que
 *     no vale no frena nada
 *   · el descuento del primer mes: sin prueba, en la página de pago; con prueba, al
 *     acabarla y una sola vez; en el anual, nunca
 *   · lo prometido no cambia: un código no se cambia, no se borra ni se reabre
 *   · dar de baja cierra los códigos, y los clientes siguen siendo suyos
 *   · las cifras de cada vendedor, sin los de ejemplo
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const pagos = pagosDeMentira('http://localhost/api', () => Date.now());
let admin: string;

const ROSA = 'rosa@ejemplo.estook.com';

let avisos: Promise<unknown>[] = [];
async function queLleguenLosAvisos(): Promise<void> {
  await new Promise((listo) => setTimeout(listo, 0));
  await Promise.allSettled(avisos);
  avisos = [];
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  await queLleguenLosAvisos();
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

const miCodigo = () => codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, new Date(Date.now()));

async function entrarComoAdmin(): Promise<string> {
  const entrada = losDatos<{ token: string }>(
    await api.ejecutar(null, 'entrar_en_admin', {
      correo: ADMIN_DE_EJEMPLO,
      contrasena: CLAVE_DE_EJEMPLO,
    }),
  );
  losDatos(await api.ejecutar(entrada.token, 'superar_doble_factor', { codigo: await miCodigo() }));
  return entrada.token;
}

let direccion = 0;

/** Una cuenta nueva por el camino de crear cuenta, con lo que traiga el enlace. */
async function cuentaNueva(
  para: string,
  negocio: string,
  llegada?: Record<string, string>,
): Promise<string> {
  direccion += 1;
  losDatos(
    await api.ejecutarDesde(`10.9.0.${String(direccion)}`, null, 'pedir_codigo_de_registro', {
      nombre: 'Marta',
      negocio,
      correo: para,
      contrasena: 'una frase que me sé',
      aceptaCondiciones: true,
    }),
  );
  const ultimo = [...correo.mandados].reverse().find((c) => c.para === para);
  const codigo = ultimo?.asunto.match(/^(\d{6}) es tu código/)?.[1] ?? '';
  return losDatos<{ token: string }>(
    await api.ejecutar(null, 'confirmar_registro', {
      correo: para,
      codigo,
      ...(llegada === undefined ? {} : { llegada }),
    }),
  ).token;
}

async function organizacionDe(para: string): Promise<string> {
  const [fila] = await comoDuena<{ id: string }>(
    `select m.organizacion_id as id from estook.membresia m
       join estook.persona p on p.id = m.persona_id where p.correo = $1`,
    [para],
  );
  if (fila === undefined) throw new Error(`${para} no tiene organización`);
  return fila.id;
}

async function laLlegada(para: string) {
  const [fila] = await comoDuena<{
    origen: string;
    codigo: string | null;
    fuente: string | null;
    medio: string | null;
    web: string | null;
    descuento_puesto_en: string | null;
  }>(
    `select l.origen, c.codigo, l.fuente, l.medio, l.web, l.descuento_puesto_en::text
       from plataforma.llegada l
       left join plataforma.codigo_de_vendedor c on c.id = l.codigo_id
      where l.organizacion_id = $1`,
    [await organizacionDe(para)],
  );
  return fila;
}

/** Abre la página de pago y devuelve su sesión, sin pagar. */
async function abrirElPago(token: string, intervalo: 'mes' | 'ano' = 'mes'): Promise<string> {
  const { url } = losDatos<{ url: string }>(
    await api.ejecutar(token, 'empezar_a_pagar', { plan: 'esencial', intervalo }),
  );
  return new URL(url).searchParams.get('sesion') ?? '';
}

async function pagar(token: string, intervalo: 'mes' | 'ano' = 'mes'): Promise<string> {
  const sesion = await abrirElPago(token, intervalo);
  await pagos.pagar(sesion);
  losDatos(await api.ejecutar(token, 'volver_del_pago', { sesion }));
  await queLleguenLosAvisos();
  return sesion;
}

interface Vendedor {
  id: string;
  nombre: string;
  bajaEn: string | null;
  codigos: {
    id: string;
    codigo: string;
    descuento: number;
    cerradoEn: string | null;
    enlace: string;
    traidos: number;
  }[];
  cifras: Record<string, number | null>;
}

async function losVendedores(): Promise<Vendedor[]> {
  await queLleguenLosAvisos();
  return losDatos<{ vendedores: Vendedor[] }>(await api.consultar(admin, 'admin_los_vendedores'))
    .vendedores;
}

let juan: string;
let pedro: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, pagos });
  pagos.enganchar((cuerpo, firma) => {
    const aviso = api.despachador.avisoDeStripe(
      { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
      cuerpo,
      firma,
    );
    avisos.push(aviso);
    return aviso;
  });
  admin = await entrarComoAdmin();

  juan = losDatos<{ vendedorId: string }>(
    await api.ejecutar(admin, 'admin_crear_vendedor', {
      nombre: 'Juan',
      telefono: '+34 600 000 001',
      correo: 'juan@vendedores.es',
      notas: null,
    }),
  ).vendedorId;
  pedro = losDatos<{ vendedorId: string }>(
    await api.ejecutar(admin, 'admin_crear_vendedor', {
      nombre: 'Pedro',
      telefono: null,
      correo: null,
      notas: 'Feria de Madrid',
    }),
  ).vendedorId;
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Quién los lee ────────────────────────────────────────────────────────────

describe('los vendedores solo los lee el admin', () => {
  it('una sesión de la app no los abre, ni los cambia', async () => {
    const rosa = losDatos<{ token: string }>(
      await api.ejecutar(null, 'entrar', { correo: ROSA, contrasena: CLAVE_DE_EJEMPLO }),
    ).token;
    expect(elFallo(await api.consultar(rosa, 'admin_los_vendedores'))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(rosa, 'admin_un_vendedor', { vendedor_id: juan }))).toBe(
      'sin_permiso',
    );
    expect(
      elFallo(
        await api.ejecutar(rosa, 'admin_crear_vendedor', {
          nombre: 'Yo misma',
          telefono: null,
          correo: null,
          notas: null,
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('y la base no le enseña ni una fila a quien no es admin, llamándola a pelo', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const vistas = await base.comoPersona(rosa, async () => {
      const vendedores = await base.bd.query('select * from plataforma.vendedor');
      const codigos = await base.bd.query('select * from plataforma.codigo_de_vendedor');
      const llegadas = await base.bd.query('select * from plataforma.llegada');
      return [...vendedores.rows, ...codigos.rows, ...llegadas.rows];
    });
    expect(vistas).toEqual([]);
  });

  it('a un cliente que ya existía no se le apunta un vendedor llamando a la función', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    const [suya] = await comoDuena<{ id: string }>(
      `select m.organizacion_id as id from estook.membresia m
         join estook.persona p on p.id = m.persona_id where p.correo = $1`,
      [ROSA],
    );
    await expect(
      base.comoPersona(rosa, () =>
        base.bd.query(
          `select plataforma.apuntar_la_llegada($1, 'JUAN26', 'directo', null, null, null, null)`,
          [suya?.id],
        ),
      ),
    ).rejects.toThrow(/al crear la cuenta/);
  });
});

// ── Los códigos ──────────────────────────────────────────────────────────────

describe('los códigos', () => {
  it('se guardan en mayúsculas, con su enlace, y uno que ya existió no se repite', async () => {
    const { codigo } = losDatos<{ codigo: string }>(
      await api.ejecutar(admin, 'admin_crear_un_codigo', {
        vendedor_id: juan,
        codigo: 'juan26',
        campana: 'Bares de Chamberí',
        descuento: 50,
      }),
    );
    expect(codigo).toBe('JUAN26');
    losDatos(
      await api.ejecutar(admin, 'admin_crear_un_codigo', {
        vendedor_id: pedro,
        codigo: 'PEDRO-FERIA',
        campana: null,
        descuento: 0,
      }),
    );

    // Ni el mismo vendedor ni otro: un código no se repite nunca (0041).
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_crear_un_codigo', {
          vendedor_id: pedro,
          codigo: 'Juan26',
          campana: null,
          descuento: 10,
        }),
      ),
    ).toBe('ya_hecho');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_crear_un_codigo', {
          vendedor_id: juan,
          codigo: 'NUÑEZ',
          campana: null,
          descuento: 10,
        }),
      ),
    ).toBe('faltan_datos');

    const [elDeJuan] = (await losVendedores()).filter((v) => v.id === juan);
    expect(elDeJuan?.codigos[0]).toMatchObject({
      codigo: 'JUAN26',
      descuento: 50,
      enlace: 'https://estook.com/?ref=JUAN26',
    });
  });

  it('se comprueba sin sesión, en minúsculas también, y no dice de quién es', async () => {
    const datos = losDatos<Record<string, unknown>>(
      await api.consultar(null, 'el_codigo_de_vendedor', { codigo: ' juan26 ' }),
    );
    expect(datos).toEqual({ codigo: 'JUAN26', descuento: 50 });
    expect(
      elFallo(await api.consultar(null, 'el_codigo_de_vendedor', { codigo: 'NOEXISTE' })),
    ).toBe('no_existe');
    expect(elFallo(await api.consultar(null, 'el_codigo_de_vendedor', { codigo: '!!' }))).toBe(
      'no_existe',
    );
  });

  it('lo prometido no cambia: ni el descuento, ni el código, ni se borra', async () => {
    await expect(
      comoDuena(`update plataforma.codigo_de_vendedor set descuento = 90 where codigo = 'JUAN26'`),
    ).rejects.toThrow(/no se cambia/);
    await expect(
      comoDuena(`update plataforma.codigo_de_vendedor set codigo = 'OTRO' where codigo = 'JUAN26'`),
    ).rejects.toThrow(/no se cambia/);
    await expect(
      comoDuena(`delete from plataforma.codigo_de_vendedor where codigo = 'JUAN26'`),
    ).rejects.toThrow(/no se borra/);
    await expect(comoDuena(`delete from plataforma.vendedor`)).rejects.toThrow(/no se borra/);
  });
});

// ── Al crear la cuenta ───────────────────────────────────────────────────────

describe('al crear la cuenta se apunta con quién y por dónde vino', () => {
  it('con el código del enlace queda de Juan, y en el admin se ve', async () => {
    await cuentaNueva('marta@bar-de-juan.com', 'Bar de Juan', {
      codigo: 'juan26',
      fuente: 'qr',
    });
    expect(await laLlegada('marta@bar-de-juan.com')).toMatchObject({
      origen: 'vendedor',
      codigo: 'JUAN26',
      fuente: 'qr',
    });

    const lista = losDatos<{
      clientes: {
        nombre: string;
        vendedor: { nombre: string; codigo: string } | null;
        origen: string;
      }[];
    }>(await api.consultar(admin, 'admin_los_clientes', { buscar: 'bar de juan' }));
    expect(lista.clientes[0]).toMatchObject({
      vendedor: { nombre: 'Juan', codigo: 'JUAN26' },
      origen: 'vendedor',
    });
    // Y se le busca por el código de su vendedor, y se filtra por él.
    expect(
      losDatos<{ total: number }>(
        await api.consultar(admin, 'admin_los_clientes', { buscar: 'juan26' }),
      ).total,
    ).toBe(1);
    expect(
      losDatos<{ total: number }>(
        await api.consultar(admin, 'admin_los_clientes', { vendedor: juan }),
      ).total,
    ).toBe(1);
  });

  it('un código que no existe no frena nada: se crea la cuenta, sin vendedor', async () => {
    await cuentaNueva('luis@bar-sin-codigo.com', 'Bar Sin Código', { codigo: 'NOEXISTE' });
    expect(await laLlegada('luis@bar-sin-codigo.com')).toMatchObject({
      origen: 'directo',
      codigo: null,
    });
  });

  it('un anuncio lo dice su enlace, y de la web se guarda solo el nombre', async () => {
    await cuentaNueva('ana@bar-del-anuncio.com', 'Bar del Anuncio', {
      fuente: 'google',
      medio: 'cpc',
      campana: 'otono',
    });
    expect(await laLlegada('ana@bar-del-anuncio.com')).toMatchObject({
      origen: 'anuncios',
      medio: 'cpc',
    });

    await cuentaNueva('eva@bar-buscado.com', 'Bar Buscado', {
      web: 'https://www.google.es/search?q=gestion+de+mi+bar',
    });
    expect(await laLlegada('eva@bar-buscado.com')).toMatchObject({
      origen: 'buscadores',
      web: 'google.es',
    });
  });

  it('sin nada en el enlace, directo', async () => {
    await cuentaNueva('raul@bar-directo.com', 'Bar Directo');
    expect(await laLlegada('raul@bar-directo.com')).toMatchObject({ origen: 'directo' });
  });
});

// ── El descuento del primer mes ──────────────────────────────────────────────

describe('el descuento del primer mes', () => {
  it('sin prueba va en la página de pago, y se gasta en el primer cobro', async () => {
    const token = await cuentaNueva('sol@bar-sin-prueba.com', 'Bar Sin Prueba', {
      codigo: 'JUAN26',
    });
    const suya = losDatos<{ descuento: { codigo: string; porcentaje: number } | null }>(
      await api.consultar(token, 'mi_suscripcion'),
    );
    expect(suya.descuento).toEqual({ codigo: 'JUAN26', porcentaje: 50 });

    const sesion = await pagar(token);
    expect(pagos.elCuponDelPago(sesion)).toBe('estook-primer-mes-50');
    expect(await pagos.cobrar(await organizacionDe('sol@bar-sin-prueba.com'))).toBe(
      'estook-primer-mes-50',
    );
    // Pagado el primer mes, ya no se enseña.
    await queLleguenLosAvisos();
    expect(
      losDatos<{ descuento: unknown }>(await api.consultar(token, 'mi_suscripcion')).descuento,
    ).toBeNull();
  });

  it('en el anual no hay descuento del primer mes', async () => {
    const token = await cuentaNueva('teo@bar-anual.com', 'Bar Anual', { codigo: 'JUAN26' });
    const sesion = await abrirElPago(token, 'ano');
    expect(pagos.elCuponDelPago(sesion)).toBeNull();
  });

  it('un código sin descuento no pone nada', async () => {
    const token = await cuentaNueva('noa@bar-de-pedro.com', 'Bar de Pedro', {
      codigo: 'PEDRO-FERIA',
    });
    expect(
      losDatos<{ descuento: unknown }>(await api.consultar(token, 'mi_suscripcion')).descuento,
    ).toBeNull();
    expect(pagos.elCuponDelPago(await abrirElPago(token))).toBeNull();
  });

  it('con prueba, se pone al acabarla —no antes— y una sola vez', async () => {
    await comoDuena(`update plataforma.oferta_de_prueba set activa = true, dias = 7`);
    const token = await cuentaNueva('ines@bar-en-prueba.com', 'Bar En Prueba', {
      codigo: 'JUAN26',
    });
    await comoDuena(`update plataforma.oferta_de_prueba set activa = false`);
    const org = await organizacionDe('ines@bar-en-prueba.com');

    // En la página de pago no va: la factura de cero euros de la prueba se lo gastaría.
    const sesion = await pagar(token);
    expect(pagos.elCuponDelPago(sesion)).toBeNull();
    expect(pagos.elCuponDe(org)).toBeNull();
    // Y en la prueba se le sigue diciendo que lo tiene.
    expect(
      losDatos<{ descuento: unknown }>(await api.consultar(token, 'mi_suscripcion')).descuento,
    ).toEqual({ codigo: 'JUAN26', porcentaje: 50 });

    await pagos.avisarDeQueAcabaLaPrueba(org);
    await queLleguenLosAvisos();
    expect(pagos.elCuponDe(org)).toBe('estook-primer-mes-50');
    expect((await laLlegada('ines@bar-en-prueba.com'))?.descuento_puesto_en).not.toBeNull();

    // Si Stripe vuelve a avisar (un admin le alarga la prueba), no se pone dos veces.
    losDatos(
      await api.ejecutar(admin, 'admin_alargar_la_prueba', {
        organizacion_id: org,
        dias: 3,
        motivo: 'Abrió más tarde',
      }),
    );
    expect(await pagos.cobrar(org)).toBe('estook-primer-mes-50');
    await pagos.avisarDeQueAcabaLaPrueba(org);
    await queLleguenLosAvisos();
    expect(pagos.elCuponDe(org)).toBeNull();
  });

  it('el aviso de la prueba que acaba se le pide a Stripe, aunque el catálogo ya estuviera', async () => {
    await comoDuena(`update plataforma.stripe set avisos = '{}'`);
    const token = await cuentaNueva('gil@bar-de-los-avisos.com', 'Bar de los Avisos');
    await abrirElPago(token);
    const [fila] = await comoDuena<{ avisos: string[] }>(`select avisos from plataforma.stripe`);
    expect(fila?.avisos).toContain('customer.subscription.trial_will_end');
  });
});

// ── Corregir, cerrar y dar de baja ───────────────────────────────────────────

describe('lo que hace el admin', () => {
  it('pone el vendedor a quien se olvidó del código, con motivo, y queda apuntado', async () => {
    const org = await organizacionDe('raul@bar-directo.com');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_poner_el_vendedor', {
          organizacion_id: org,
          codigo: 'PEDRO-FERIA',
          motivo: '',
        }),
      ),
    ).not.toBe('no ha fallado (ok)');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_poner_el_vendedor', {
          organizacion_id: org,
          codigo: 'NOEXISTE',
          motivo: 'Lo dijo por teléfono',
        }),
      ),
    ).toBe('no_existe');

    losDatos(
      await api.ejecutar(admin, 'admin_poner_el_vendedor', {
        organizacion_id: org,
        codigo: 'pedro-feria',
        motivo: 'Se le olvidó el código en el registro',
      }),
    );
    expect(await laLlegada('raul@bar-directo.com')).toMatchObject({
      codigo: 'PEDRO-FERIA',
      // Por dónde llegó no cambia: eso no lo sabe nadie después.
      origen: 'directo',
    });
    const [apunte] = await comoDuena<{ accion: string; motivo: string }>(
      `select accion, motivo from plataforma.auditoria
        where entidad = 'cliente' and entidad_id = $1 order by ocurrido_en desc limit 1`,
      [org],
    );
    expect(apunte).toEqual({
      accion: 'poner_el_vendedor',
      motivo: 'Se le olvidó el código en el registro',
    });
    // Lo comercial es nuestro: no va a la auditoría del cliente.
    const [suya] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.auditoria
        where organizacion_id = $1 and accion = 'poner_el_vendedor'`,
      [org],
    );
    expect(suya?.n).toBe(0);
  });

  it('a un cliente de antes de A3 también se le pone, sin saber por dónde vino', async () => {
    const [suya] = await comoDuena<{ id: string }>(
      `select m.organizacion_id as id from estook.membresia m
         join estook.persona p on p.id = m.persona_id where p.correo = $1`,
      [ROSA],
    );
    await comoDuena(`delete from plataforma.llegada where organizacion_id = $1`, [suya?.id]);
    losDatos(
      await api.ejecutar(admin, 'admin_poner_el_vendedor', {
        organizacion_id: suya?.id,
        codigo: 'JUAN26',
        motivo: 'Lo trajo Juan antes de que hubiera códigos',
      }),
    );
    const [fila] = await comoDuena<{ origen: string }>(
      `select origen from plataforma.llegada where organizacion_id = $1`,
      [suya?.id],
    );
    expect(fila?.origen).toBe('sin_saber');
  });

  it('cerrar un código: no vale para nadie nuevo, ni se reabre; quien vino con él lo conserva', async () => {
    const [elDeJuan] = (await losVendedores()).filter((v) => v.id === juan);
    const id = elDeJuan?.codigos.find((c) => c.codigo === 'JUAN26')?.id ?? '';

    // Antes de cerrarlo, alguien se registra con él y todavía no ha pagado.
    const token = await cuentaNueva('pia@bar-a-tiempo.com', 'Bar a Tiempo', { codigo: 'JUAN26' });

    losDatos(
      await api.ejecutar(admin, 'admin_cerrar_un_codigo', {
        codigo_id: id,
        motivo: 'Fin de la campaña',
      }),
    );
    expect(elFallo(await api.consultar(null, 'el_codigo_de_vendedor', { codigo: 'JUAN26' }))).toBe(
      'no_existe',
    );
    await expect(
      comoDuena(`update plataforma.codigo_de_vendedor set cerrado_en = null where id = $1`, [id]),
    ).rejects.toThrow(/no se vuelve a abrir/);

    // Lo prometido se cumple.
    expect(
      losDatos<{ descuento: unknown }>(await api.consultar(token, 'mi_suscripcion')).descuento,
    ).toEqual({ codigo: 'JUAN26', porcentaje: 50 });

    // Y quien llega ahora con él, se queda sin vendedor.
    await cuentaNueva('leo@bar-tarde.com', 'Bar Tarde', { codigo: 'JUAN26' });
    expect(await laLlegada('leo@bar-tarde.com')).toMatchObject({ codigo: null, origen: 'directo' });
  });

  it('dar de baja a un vendedor cierra sus códigos, y sus clientes siguen siendo suyos', async () => {
    const { codigosCerrados } = losDatos<{ codigosCerrados: number }>(
      await api.ejecutar(admin, 'admin_dar_de_baja_al_vendedor', {
        vendedor_id: pedro,
        motivo: 'Ya no trabaja con nosotros',
      }),
    );
    expect(codigosCerrados).toBe(1);
    expect(
      elFallo(await api.consultar(null, 'el_codigo_de_vendedor', { codigo: 'PEDRO-FERIA' })),
    ).toBe('no_existe');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_crear_un_codigo', {
          vendedor_id: pedro,
          codigo: 'PEDRO-VUELVE',
          campana: null,
          descuento: 0,
        }),
      ),
    ).toBe('faltan_datos');

    const ficha = losDatos<{ vendedor: Vendedor; clientes: { nombre: string }[] }>(
      await api.consultar(admin, 'admin_un_vendedor', { vendedor_id: pedro }),
    );
    expect(ficha.vendedor.bajaEn).not.toBeNull();
    expect(ficha.clientes.map((c) => c.nombre).sort()).toEqual(['Bar Directo', 'Bar de Pedro']);
    await expect(
      comoDuena(`update plataforma.vendedor set baja_en = null where id = $1`, [pedro]),
    ).rejects.toThrow(/no se deshace/);
  });
});

// ── Las cifras ───────────────────────────────────────────────────────────────

describe('las cifras de cada vendedor', () => {
  it('cuentan con las pestañas de Clientes, y los de ejemplo no cuentan', async () => {
    const [elDeJuan] = (await losVendedores()).filter((v) => v.id === juan);
    // Bar de Juan, Bar Sin Prueba, Bar Anual, Bar En Prueba, Bar a Tiempo; y la de Rosa,
    // que es de ejemplo y no cuenta.
    expect(elDeJuan?.cifras).toMatchObject({
      traidos: 5,
      esteMes: 5,
      pagando: 2,
      sinPagar: 3,
    });
    expect(elDeJuan?.cifras['alMes']).toBeGreaterThan(0);
    expect(elDeJuan?.codigos.find((c) => c.codigo === 'JUAN26')?.traidos).toBe(5);

    const sinVendedor = losDatos<{ sinVendedor: number }>(
      await api.consultar(admin, 'admin_los_vendedores'),
    ).sinVendedor;
    expect(sinVendedor).toBeGreaterThanOrEqual(4);
  });
});
