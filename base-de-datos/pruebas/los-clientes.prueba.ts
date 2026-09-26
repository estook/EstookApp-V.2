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
 * A2 · Los clientes, en el admin (decisión 0041 · migración 0049), contra Postgres
 * de verdad y con el Stripe de mentira.
 *
 * Lo que se comprueba es lo que no depende de ninguna pantalla:
 *
 *   · la lista y la ficha solo las lee el admin: ni una sesión de la app, ni la
 *     base a pelo
 *   · se busca sin acentos, y el contrato y la actividad van separados
 *   · lo que el admin hace dentro de un cliente pide motivo, y el cliente lo ve en
 *     su propia auditoría
 *   · los tres gestos de la suscripción: alargar la prueba, de la casa y cancelar
 *     al acabar; y de la casa no se le pone a quien Stripe está cobrando
 *   · el correo de acceso cambia solo con el enlace del correo nuevo, se para desde
 *     el de ahora, y cada enlace vale una vez
 *   · exportar pide el código otra vez, queda apuntado y no deja fórmulas de Excel
 *   · la foto del uso la hace el reloj, y el admin en el momento
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const pagos = pagosDeMentira('http://localhost/api', () => Date.now());
let admin: string;

const ROSA = 'rosa@ejemplo.estook.com';

/**
 * Los avisos que el Stripe de mentira manda por su cuenta, después de un cambio. Hay
 * que esperarlos antes de leer la base: PGlite es una sola conexión, y una lectura a
 * medias de un aviso caería dentro de su transacción.
 */
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

/** Una cuenta nueva de verdad, por el camino de crear cuenta, y su token. */
async function cuentaNueva(para: string, negocio: string, nombre = 'Lucía'): Promise<string> {
  direccion += 1;
  losDatos(
    await api.ejecutarDesde(`10.8.0.${String(direccion)}`, null, 'pedir_codigo_de_registro', {
      nombre,
      negocio,
      correo: para,
      contrasena: 'una frase que me sé',
      aceptaCondiciones: true,
    }),
  );
  const ultimo = [...correo.mandados].reverse().find((c) => c.para === para);
  const codigo = ultimo?.asunto.match(/^(\d{6}) es tu código/)?.[1] ?? '';
  return losDatos<{ token: string }>(
    await api.ejecutar(null, 'confirmar_registro', { correo: para, codigo }),
  ).token;
}

async function pagar(token: string): Promise<void> {
  const { url } = losDatos<{ url: string }>(
    await api.ejecutar(token, 'empezar_a_pagar', { plan: 'esencial', intervalo: 'mes' }),
  );
  const sesion = new URL(url).searchParams.get('sesion') ?? '';
  await pagos.pagar(sesion);
  losDatos(await api.ejecutar(token, 'volver_del_pago', { sesion }));
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

interface EnLista {
  organizacionId: string;
  nombre: string;
  como: string;
  actividad: string | null;
  deLaCasa: boolean;
  cancelaAlAcabar: boolean;
  pruebaHasta: string | null;
  tipo: string;
}

async function laLista(entrada: Record<string, string> = {}) {
  await queLleguenLosAvisos();
  return losDatos<{
    clientes: EnLista[];
    total: number;
    hayMas: boolean;
    porPestana: Record<string, number>;
    foto: string | null;
    cobro: { pagan: number; alMes: number; alAno: number };
  }>(await api.consultar(admin, 'admin_los_clientes', entrada));
}

async function elCliente(organizacionId: string): Promise<EnLista> {
  await queLleguenLosAvisos();
  const ficha = losDatos<{ cliente: EnLista }>(
    await api.consultar(admin, 'admin_un_cliente', { organizacion_id: organizacionId }),
  );
  return ficha.cliente;
}

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
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Quién los lee ────────────────────────────────────────────────────────────

describe('la lista de clientes solo la lee el admin', () => {
  it('una sesión de la app no la abre, aunque sea de quien lleva un local', async () => {
    const rosa = losDatos<{ token: string }>(
      await api.ejecutar(null, 'entrar', { correo: ROSA, contrasena: CLAVE_DE_EJEMPLO }),
    ).token;
    expect(elFallo(await api.consultar(rosa, 'admin_los_clientes', {}))).toBe('sin_permiso');
    expect(
      elFallo(
        await api.consultar(rosa, 'admin_un_cliente', { organizacion_id: crypto.randomUUID() }),
      ),
    ).toBe('sin_permiso');
  });

  it('y la base tampoco se la da a nadie que no sea admin, llamándola a pelo', async () => {
    const rosa = await base.personaPorCorreo(ROSA);
    for (const consulta of [
      'select * from estook.los_clientes()',
      `select estook.un_cliente(gen_random_uuid())`,
      'select * from estook.lo_que_hacen_los_clientes()',
      `select * from estook.el_uso_de(gen_random_uuid())`,
      `select estook.renombrar_desde_el_admin(gen_random_uuid(), 'Otro')`,
      `select estook.poner_de_la_casa(gen_random_uuid(), true, 'porque sí')`,
    ]) {
      await expect(
        base.comoPersona(rosa, () => base.bd.query(consulta)),
        consulta,
      ).rejects.toThrow();
    }
    const vistas = await base.comoPersona(rosa, async () => {
      const { rows } = await base.bd.query('select * from plataforma.nota_de_cliente');
      return rows;
    });
    expect(vistas).toEqual([]);
  });
});

// ── La lista ─────────────────────────────────────────────────────────────────

describe('la lista', () => {
  it('se busca sin acentos por nombre y correo, y los ejemplos no salen si no se piden', async () => {
    await cuentaNueva('lucia@meson-del-nandu.com', 'Mesón del Ñandú');

    const porNombre = await laLista({ buscar: 'meson del nandu' });
    expect(porNombre.clientes.map((c) => c.nombre)).toEqual(['Mesón del Ñandú']);
    expect(porNombre.clientes[0]?.como).toBe('sin_pagar');
    expect(porNombre.porPestana['baja']).toBe(1);
    expect(porNombre.porPestana['pagando']).toBe(0);

    const porCorreo = await laLista({ buscar: 'LUCIA@MESON' });
    expect(porCorreo.total).toBe(1);

    const sinEjemplos = await laLista();
    const conEjemplos = await laLista({ ejemplos: 'si' });
    expect(conEjemplos.total).toBeGreaterThan(sinEjemplos.total);
    expect(sinEjemplos.hayMas).toBe(false);
  });

  it('el contrato y la actividad van separados: pagar lo cambia de pestaña', async () => {
    const token = await cuentaNueva('pepa@bar-que-paga.com', 'Bar Que Paga');
    await pagar(token);
    const lista = await laLista({ buscar: 'bar que paga' });
    expect(lista.clientes[0]).toMatchObject({ como: 'al_dia', tipo: 'independiente' });
    expect(lista.porPestana['pagando']).toBe(1);
    expect(lista.porPestana['baja']).toBe(0);
    // Y lo que se cobra lo cuenta de todos, sin filtros: Esencial al mes, con el IVA.
    expect(lista.cobro.pagan).toBeGreaterThanOrEqual(1);
    expect(lista.cobro.alMes).toBeGreaterThan(0);
  });

  it('se filtra por tramos de alta y de último acceso', async () => {
    // Recién dados de alta, y han entrado hoy.
    expect((await laLista({ buscar: 'bar que paga', alta: '30' })).total).toBe(1);
    expect((await laLista({ buscar: 'bar que paga', alta: 'antes' })).total).toBe(0);
    expect((await laLista({ buscar: 'bar que paga', acceso: 'hoy' })).total).toBe(1);
    expect((await laLista({ buscar: 'bar que paga', acceso: 'nunca' })).total).toBe(0);
  });

  it('la ficha trae sus locales y su gente, con el correo solo de quien dirige', async () => {
    const org = await organizacionDe('lucia@meson-del-nandu.com');
    const ficha = losDatos<{
      locales: { nombre: string; altaTerminada: boolean }[];
      personas: { nombre: string; correo: string | null; esDireccion: boolean }[];
      ultimoApunte: { accion: string; entidad: string; en: string } | null;
      alertas: string[];
    }>(await api.consultar(admin, 'admin_un_cliente', { organizacion_id: org }));

    expect(ficha.locales).toHaveLength(1);
    expect(ficha.personas).toEqual([
      expect.objectContaining({
        nombre: 'Lucía',
        correo: 'lucia@meson-del-nandu.com',
        esDireccion: true,
      }),
    ]);
    expect(ficha.alertas).toContain('No ha pagado nunca');
    // Lo último que apuntó, sin el contenido: qué y cuándo.
    expect(ficha.ultimoApunte).toEqual({
      accion: expect.any(String) as string,
      entidad: expect.any(String) as string,
      en: expect.any(String) as string,
    });
  });
});

// ── Lo que el admin hace dentro ──────────────────────────────────────────────

describe('lo que el admin hace con un cliente', () => {
  it('la ficha comercial se guarda, se busca por su teléfono y queda en la auditoría del admin', async () => {
    const org = await organizacionDe('lucia@meson-del-nandu.com');
    losDatos(
      await api.ejecutar(admin, 'admin_guardar_la_ficha_comercial', {
        organizacion_id: org,
        responsable: 'Lucía Pérez',
        telefono: '+34 600 111 222',
        correo: 'facturas@meson-del-nandu.com',
        tipo: 'grupo',
      }),
    );
    const lista = await laLista({ buscar: '600 111 222' });
    expect(lista.clientes[0]).toMatchObject({ organizacionId: org, tipo: 'grupo' });

    const [apunte] = await comoDuena<{ accion: string }>(
      `select accion from plataforma.auditoria
        where entidad = 'cliente' and entidad_id = $1 order by ocurrido_en desc limit 1`,
      [org],
    );
    expect(apunte?.accion).toBe('editar');
  });

  it('el nombre pide motivo, y el cliente lo ve en su propia auditoría', async () => {
    const org = await organizacionDe('lucia@meson-del-nandu.com');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_cambiar_el_nombre', {
          organizacion_id: org,
          nombre: 'Mesón Ñandú',
          motivo: '',
        }),
      ),
    ).not.toBeNull();

    const { antes } = losDatos<{ antes: string }>(
      await api.ejecutar(admin, 'admin_cambiar_el_nombre', {
        organizacion_id: org,
        nombre: 'Mesón Ñandú',
        motivo: 'Lo pidió por teléfono',
      }),
    );
    expect(antes).toBe('Mesón del Ñandú');

    const [suya] = await comoDuena<{ motivo: string; despues: { nombre: string; por: string } }>(
      `select motivo, despues from estook.auditoria
        where organizacion_id = $1 and entidad = 'organizacion' order by ocurrido_en desc limit 1`,
      [org],
    );
    expect(suya).toEqual({
      motivo: 'Lo pidió por teléfono',
      despues: { nombre: 'Mesón Ñandú', por: 'Estook' },
    });
  });

  it('las notas se escriben y se fijan, pero lo escrito no se cambia', async () => {
    const org = await organizacionDe('lucia@meson-del-nandu.com');
    const { notaId } = losDatos<{ notaId: number }>(
      await api.ejecutar(admin, 'admin_escribir_una_nota', {
        organizacion_id: org,
        texto: 'Llamó: quiere la carta en inglés',
      }),
    );
    losDatos(await api.ejecutar(admin, 'admin_fijar_una_nota', { nota_id: notaId, fijada: true }));
    const ficha = losDatos<{ notas: { texto: string; fijada: boolean; autor: string | null }[] }>(
      await api.consultar(admin, 'admin_un_cliente', { organizacion_id: org }),
    );
    expect(ficha.notas[0]).toMatchObject({
      texto: 'Llamó: quiere la carta en inglés',
      fijada: true,
    });
    expect(ficha.notas[0]?.autor).not.toBeNull();

    await expect(
      comoDuena(`update plataforma.nota_de_cliente set texto = 'otra cosa' where id = $1`, [
        notaId,
      ]),
    ).rejects.toThrow();
  });
});

// ── Los tres gestos de la suscripción ────────────────────────────────────────

describe('los tres gestos de la suscripción', () => {
  it('de la casa: deja de pagar, queda en su historial, y quitárselo lo manda a pagar', async () => {
    const org = await organizacionDe('lucia@meson-del-nandu.com');
    losDatos(
      await api.ejecutar(admin, 'admin_de_la_casa', {
        organizacion_id: org,
        de_la_casa: true,
        motivo: 'Es el bar de un socio',
      }),
    );
    expect(await elCliente(org)).toMatchObject({ deLaCasa: true, como: 'al_dia' });

    const historial = await comoDuena<{ quien: string; porque: string }>(
      `select quien, porque from plataforma.cambio_de_suscripcion
        where organizacion_id = $1 order by en desc limit 1`,
      [org],
    );
    expect(historial[0]?.quien).toMatch(/^admin:/);
    expect(historial[0]?.porque).toBe('de la casa: Es el bar de un socio');

    losDatos(
      await api.ejecutar(admin, 'admin_de_la_casa', {
        organizacion_id: org,
        de_la_casa: false,
        motivo: 'Ya no es socio',
      }),
    );
    expect(await elCliente(org)).toMatchObject({ deLaCasa: false, como: 'sin_pagar' });
  });

  it('a quien Stripe está cobrando no se le hace de la casa: primero se cancela', async () => {
    const org = await organizacionDe('pepa@bar-que-paga.com');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_de_la_casa', {
          organizacion_id: org,
          de_la_casa: true,
          motivo: 'Un favor',
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('cancelar al acabar se hace en Stripe, y se puede deshacer', async () => {
    const org = await organizacionDe('pepa@bar-que-paga.com');
    const { cancelaAlAcabar } = losDatos<{ cancelaAlAcabar: boolean }>(
      await api.ejecutar(admin, 'admin_cancelar_al_acabar', {
        organizacion_id: org,
        cancelar: true,
        motivo: 'Cierra el bar en octubre',
      }),
    );
    expect(cancelaAlAcabar).toBe(true);
    expect(await elCliente(org)).toMatchObject({ cancelaAlAcabar: true, como: 'al_dia' });
    // Ya se va: sale en «Se están yendo».
    expect((await laLista({ buscar: 'bar que paga' })).porPestana['se_van']).toBe(1);

    losDatos(
      await api.ejecutar(admin, 'admin_cancelar_al_acabar', {
        organizacion_id: org,
        cancelar: false,
        motivo: 'Al final sigue',
      }),
    );
    expect(await elCliente(org)).toMatchObject({ cancelaAlAcabar: false });
  });

  it('alargar la prueba: en Stripe si la prueba es suya, y solo si hay una prueba', async () => {
    await comoDuena(`update plataforma.oferta_de_prueba set activa = true, dias = 7`);
    const token = await cuentaNueva('ana@bar-en-prueba.com', 'Bar En Prueba');
    await comoDuena(`update plataforma.oferta_de_prueba set activa = false`);
    await pagar(token);
    const org = await organizacionDe('ana@bar-en-prueba.com');
    const antes = await elCliente(org);
    expect(antes.como).toBe('prueba');

    const { hasta } = losDatos<{ hasta: string }>(
      await api.ejecutar(admin, 'admin_alargar_la_prueba', {
        organizacion_id: org,
        dias: 5,
        motivo: 'Estuvo cerrado por vacaciones',
      }),
    );
    const esperado = new Date(`${antes.pruebaHasta ?? ''}T12:00:00Z`);
    esperado.setUTCDate(esperado.getUTCDate() + 5);
    expect(hasta).toBe(esperado.toISOString().slice(0, 10));
    expect((await elCliente(org)).pruebaHasta).toBe(hasta);

    const pagando = await organizacionDe('pepa@bar-que-paga.com');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_alargar_la_prueba', {
          organizacion_id: pagando,
          dias: 5,
          motivo: 'Por probar',
        }),
      ),
    ).toBe('faltan_datos');
  });
});

// ── El correo de acceso ──────────────────────────────────────────────────────

describe('cambiar el correo de acceso, con doble confirmación', () => {
  function elEnlace(para: string, que: 'confirmar' | 'parar'): string {
    const ultimo = [...correo.mandados].reverse().find((c) => c.para === para);
    const token = ultimo?.texto.match(new RegExp(`#/correo\\?${que}=([^\\s]+)`))?.[1] ?? '';
    return decodeURIComponent(token);
  }

  async function laPersona(para: string): Promise<string> {
    const [fila] = await comoDuena<{ id: string }>(
      `select id from estook.persona where correo = $1`,
      [para],
    );
    return fila?.id ?? '';
  }

  it('sin el código otra vez no se pide', async () => {
    const org = await organizacionDe('ana@bar-en-prueba.com');
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_cambiar_el_correo', {
          organizacion_id: org,
          persona_id: await laPersona('ana@bar-en-prueba.com'),
          correo_nuevo: 'ana.nueva@bar-en-prueba.com',
          motivo: 'Perdió el acceso al correo viejo',
          codigo: '000000',
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('cambia solo con el enlace del correo nuevo, cierra sus sesiones, y el enlace vale una vez', async () => {
    const viejo = 'ana@bar-en-prueba.com';
    const nuevo = 'ana.nueva@bar-en-prueba.com';
    const org = await organizacionDe(viejo);
    const suya = losDatos<{ token: string }>(
      await api.ejecutar(null, 'entrar', { correo: viejo, contrasena: 'una frase que me sé' }),
    ).token;

    losDatos(
      await api.ejecutar(admin, 'admin_cambiar_el_correo', {
        organizacion_id: org,
        persona_id: await laPersona(viejo),
        correo_nuevo: nuevo,
        motivo: 'Perdió el acceso al correo viejo',
        codigo: await miCodigo(),
      }),
    );
    // Hasta confirmarlo, nada cambia.
    expect(await laPersona(viejo)).not.toBe('');
    expect([...correo.mandados].reverse().find((c) => c.para === viejo)?.asunto).toBe(
      'Van a cambiar tu correo de Estook',
    );

    const enlace = elEnlace(nuevo, 'confirmar');
    expect(
      losDatos(await api.ejecutar(null, 'confirmar_el_correo_nuevo', { token: enlace })),
    ).toEqual({
      correo: nuevo,
    });
    expect(await laPersona(viejo)).toBe('');
    expect(await laPersona(nuevo)).not.toBe('');
    expect(elFallo(await api.consultar(suya, 'quien_soy'))).toBe('sin_sesion');

    expect(elFallo(await api.ejecutar(null, 'confirmar_el_correo_nuevo', { token: enlace }))).toBe(
      'no_existe',
    );
    // Y en su auditoría queda que lo pidió Estook, con el motivo.
    const [apunte] = await comoDuena<{ motivo: string }>(
      `select motivo from estook.auditoria
        where organizacion_id = $1 and entidad = 'persona' order by ocurrido_en desc limit 1`,
      [org],
    );
    expect(apunte?.motivo).toBe('Perdió el acceso al correo viejo');
  });

  it('se para desde el correo de ahora, y parado ya no se confirma', async () => {
    const ahora = 'pepa@bar-que-paga.com';
    const nuevo = 'otra@bar-que-paga.com';
    losDatos(
      await api.ejecutar(admin, 'admin_cambiar_el_correo', {
        organizacion_id: await organizacionDe(ahora),
        persona_id: await laPersona(ahora),
        correo_nuevo: nuevo,
        motivo: 'Lo pidió por teléfono',
        codigo: await miCodigo(),
      }),
    );
    expect(
      losDatos(
        await api.ejecutar(null, 'parar_el_cambio_de_correo', { token: elEnlace(ahora, 'parar') }),
      ),
    ).toEqual({ parado: true });
    expect(
      elFallo(
        await api.ejecutar(null, 'confirmar_el_correo_nuevo', {
          token: elEnlace(nuevo, 'confirmar'),
        }),
      ),
    ).toBe('no_existe');
    expect(await laPersona(ahora)).not.toBe('');
  });

  it('un correo que ya es de otra cuenta no se pide', async () => {
    expect(
      elFallo(
        await api.ejecutar(admin, 'admin_cambiar_el_correo', {
          organizacion_id: await organizacionDe('pepa@bar-que-paga.com'),
          persona_id: await laPersona('pepa@bar-que-paga.com'),
          correo_nuevo: 'lucia@meson-del-nandu.com',
          motivo: 'Por probar',
          codigo: await miCodigo(),
        }),
      ),
    ).toBe('ya_hecho');
  });
});

// ── Exportar ─────────────────────────────────────────────────────────────────

describe('exportar', () => {
  it('pide el código, queda apuntado, y no deja fórmulas que Excel ejecute', async () => {
    const token = await cuentaNueva('trampa@correo-de-prueba.com', 'Bar Trampa');
    void token;
    const org = await organizacionDe('trampa@correo-de-prueba.com');
    losDatos(
      await api.ejecutar(admin, 'admin_cambiar_el_nombre', {
        organizacion_id: org,
        nombre: '=HIPERVINCULO("x")',
        motivo: 'Para probar el CSV',
      }),
    );

    expect(
      elFallo(await api.ejecutar(admin, 'admin_exportar_los_clientes', { codigo: '000000' })),
    ).toBe('faltan_datos');

    const { csv, cuantos } = losDatos<{ csv: string; cuantos: number }>(
      await api.ejecutar(admin, 'admin_exportar_los_clientes', {
        buscar: 'hipervinculo',
        codigo: await miCodigo(),
      }),
    );
    expect(cuantos).toBe(1);
    const [cabecera, fila] = csv.split('\r\n');
    expect(cabecera?.startsWith('Cliente;Código;Contrato')).toBe(true);
    expect(fila?.startsWith(`"'=HIPERVINCULO(""x"")";`)).toBe(true);

    const [apunte] = await comoDuena<{ accion: string; despues: { cuantos: number } }>(
      `select accion, despues from plataforma.auditoria
        where entidad = 'clientes' and accion = 'exportar' order by ocurrido_en desc limit 1`,
    );
    expect(apunte?.despues.cuantos).toBe(1);
  });
});

// ── La foto del uso ──────────────────────────────────────────────────────────

describe('la foto del uso', () => {
  it('el admin la pide en el momento, y la lista ya trae la actividad', async () => {
    expect((await laLista({ buscar: 'meson' })).clientes[0]?.actividad).toBeNull();

    const { clientes } = losDatos<{ clientes: number }>(
      await api.ejecutar(admin, 'admin_calcular_el_uso', {}),
    );
    expect(clientes).toBeGreaterThan(0);

    const lista = await laLista({ buscar: 'meson' });
    // Recién dada de alta y sin haber apuntado nada: entra, pero no trabaja con él.
    expect(lista.clientes[0]?.actividad).toBe('mira');
    expect(lista.foto).not.toBeNull();

    // Repetirla el mismo día la sustituye: una foto por cliente y día.
    losDatos(await api.ejecutar(admin, 'admin_calcular_el_uso', {}));
    const [repetidas] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from (
         select organizacion_id, dia from plataforma.uso_diario
          group by organizacion_id, dia having count(*) > 1) r`,
    );
    expect(repetidas?.n).toBe(0);
  });

  it('y el reloj la hace cada noche, como el sistema', async () => {
    const SECRETO = 'el-secreto-del-reloj-de-los-clientes';
    await comoDuena(
      `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
      [SECRETO],
    );
    // Mañana a las 09:10 de Madrid: el diario del día siguiente.
    const manana = new Date(Date.now() + 86_400_000);
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(manana);
    const reloj = montarLaApi(base.bd, {
      correo,
      pagos,
      ahora: () => new Date(`${dia}T07:10:00Z`),
    });

    const hecho = await reloj.despachador.latir(
      { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
      SECRETO,
    );
    expect(hecho).toMatchObject({ diario: true, fallos: 0 });
    const [foto] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from plataforma.uso_diario where dia = $1::date`,
      [dia],
    );
    expect(foto?.n).toBeGreaterThan(0);
  });
});
