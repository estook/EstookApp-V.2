import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { laCuotaSinIva, type TableroDeVentas } from '@estook/dominio';
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
 * A4 · Las ventas (decisión 0077 · migración 0059), contra Postgres de verdad y con el
 * Stripe de mentira.
 *
 *   · el tablero solo lo lee el admin, y ver lo cobrado deja una línea al día
 *   · lo que cobra Stripe a cada uno, con el precio con el que se apuntó
 *   · lo cobrado y lo devuelto, apuntados una vez, sin IVA aparte
 *   · las visitas de los enlaces: un número por código y día, y nada más (3B)
 *   · la foto de cada noche dice cómo está la cuenta y cuánto deja
 *   · el tablero cuadra con una consulta a mano, y un cliente de ejemplo no cambia nada
 *   · las bajas salen de las fotos
 *   · el correo del lunes, una vez por semana, a los admins (4A)
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const pagos = pagosDeMentira('http://localhost/api', () => Date.now());
let admin: string;

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

async function cuentaNueva(
  para: string,
  negocio: string,
  llegada?: Record<string, string>,
): Promise<string> {
  direccion += 1;
  losDatos(
    await api.ejecutarDesde(`10.8.0.${String(direccion)}`, null, 'pedir_codigo_de_registro', {
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

async function pagar(token: string): Promise<void> {
  const { url } = losDatos<{ url: string }>(
    await api.ejecutar(token, 'empezar_a_pagar', { plan: 'esencial', intervalo: 'mes' }),
  );
  const sesion = new URL(url).searchParams.get('sesion') ?? '';
  await pagos.pagar(sesion);
  losDatos(await api.ejecutar(token, 'volver_del_pago', { sesion }));
  await queLleguenLosAvisos();
}

async function lasVentas(periodo = 'mes'): Promise<TableroDeVentas> {
  await queLleguenLosAvisos();
  return losDatos<TableroDeVentas>(await api.consultar(admin, 'admin_las_ventas', { periodo }));
}

const MADRID = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' });
const hoy = () => MADRID.format(new Date(Date.now()));
const haceDias = (n: number) => MADRID.format(new Date(Date.now() - n * 86_400_000));

let pagadora: string;

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

  // Una que paga Esencial, al mes, sin prueba.
  await pagar(await cuentaNueva('ana@bar-que-paga.es', 'Bar Que Paga'));
  pagadora = await organizacionDe('ana@bar-que-paga.es');
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Quién lo lee ─────────────────────────────────────────────────────────────

describe('las ventas solo las lee el admin', () => {
  it('una sesión de la app no las abre, ni preguntando a la API a pelo', async () => {
    const rosa = await api.entrar('rosa@ejemplo.estook.com');
    expect(elFallo(await api.consultar(rosa, 'admin_las_ventas'))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(null, 'admin_las_ventas'))).toBe('sin_sesion');
  });

  it('ver lo cobrado deja una línea en la auditoría, una al día, no una por vez', async () => {
    await lasVentas('mes');
    await lasVentas('7');
    await lasVentas('ano');
    const [lineas] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from plataforma.auditoria where accion = 'ver_lo_cobrado'`,
    );
    expect(lineas?.n).toBe(1);
  });
});

// ── Lo que cobra Stripe ──────────────────────────────────────────────────────

describe('lo que cobra Stripe a cada uno, con el precio con el que se apuntó', () => {
  it('al pagar se apunta lo que dice Stripe: Esencial, 49 €', async () => {
    const [cuota] = await comoDuena<{ importe: number; modo: string }>(
      `select importe, modo from plataforma.cuota_de_stripe where organizacion_id = $1`,
      [pagadora],
    );
    expect(cuota).toEqual({ importe: 4_900, modo: 'prueba' });
  });

  it('y manda sobre el precio de hoy: quien entró a 39 € sigue contando 39 €', async () => {
    await comoDuena(
      `update plataforma.cuota_de_stripe set importe = 3900 where organizacion_id = $1`,
      [pagadora],
    );
    const lista = losDatos<{ clientes: { organizacionId: string; cuotaAlMes: number | null }[] }>(
      await api.consultar(admin, 'admin_los_clientes', { buscar: 'Bar Que Paga' }),
    );
    expect(lista.clientes.find((c) => c.organizacionId === pagadora)?.cuotaAlMes).toBe(3_900);
    await comoDuena(
      `update plataforma.cuota_de_stripe set importe = 4900 where organizacion_id = $1`,
      [pagadora],
    );
  });
});

// ── Lo cobrado y lo devuelto ─────────────────────────────────────────────────

describe('lo cobrado y lo devuelto (2A)', () => {
  it('cada cobro se apunta una vez, con el IVA aparte como lo dice la factura', async () => {
    await pagos.cobrar(pagadora);
    const cobros = await comoDuena<{ importe: number; sin_iva: number; motivo: string }>(
      `select importe, sin_iva, motivo from plataforma.cobro where organizacion_id = $1`,
      [pagadora],
    );
    expect(cobros).toEqual([{ importe: 4_900, sin_iva: 4_050, motivo: 'subscription_create' }]);
  });

  it('lo devuelto se apunta por partes, sin contar dos veces lo de antes', async () => {
    await pagos.devolver(pagadora, 1_000);
    await pagos.devolver(pagadora, 500);
    const devoluciones = await comoDuena<{ importe: number; sin_iva: number }>(
      `select importe, sin_iva from plataforma.devolucion where organizacion_id = $1 order by id`,
      [pagadora],
    );
    expect(devoluciones).toEqual([
      { importe: 1_000, sin_iva: laCuotaSinIva(1_000) },
      { importe: 500, sin_iva: laCuotaSinIva(500) },
    ]);
  });

  it('lo cobrado no se toca: ni se cambia ni se borra', async () => {
    await expect(comoDuena(`update plataforma.cobro set importe = 1`)).rejects.toThrow(
      /solo se añaden/,
    );
    await expect(comoDuena(`delete from plataforma.devolucion`)).rejects.toThrow(/solo se añaden/);
  });

  it('el tablero lo cuenta igual que una suma a mano', async () => {
    const t = await lasVentas('mes');
    const [aMano] = await comoDuena<{ con_iva: number; sin_iva: number }>(
      `select (select coalesce(sum(importe), 0) from plataforma.cobro
                where modo = 'prueba' and (cobrado_en at time zone 'Europe/Madrid')::date >= date_trunc('month', $1::date))
            - (select coalesce(sum(importe), 0) from plataforma.devolucion
                where modo = 'prueba' and (devuelto_en at time zone 'Europe/Madrid')::date >= date_trunc('month', $1::date)) as con_iva,
              (select coalesce(sum(sin_iva), 0) from plataforma.cobro
                where modo = 'prueba' and (cobrado_en at time zone 'Europe/Madrid')::date >= date_trunc('month', $1::date))
            - (select coalesce(sum(sin_iva), 0) from plataforma.devolucion
                where modo = 'prueba' and (devuelto_en at time zone 'Europe/Madrid')::date >= date_trunc('month', $1::date)) as sin_iva`,
      [hoy()],
    );
    expect(t.dinero.cobrado.conIva).toBe(Number(aMano?.con_iva));
    expect(t.dinero.cobrado.ahora).toBe(Number(aMano?.sin_iva));
    expect(t.dinero.cobrado.conIva).toBe(4_900 - 1_500);
    expect(t.modo).toBe('prueba');
  });
});

// ── Las visitas de los enlaces ───────────────────────────────────────────────

describe('las visitas de los enlaces de vendedor (3B)', () => {
  let vendedor: string;

  beforeAll(async () => {
    vendedor = losDatos<{ vendedorId: string }>(
      await api.ejecutar(admin, 'admin_crear_vendedor', {
        nombre: 'Lola',
        telefono: null,
        correo: null,
        notas: null,
      }),
    ).vendedorId;
    for (const codigo of ['LOLA26', 'LOLA-VIEJO']) {
      losDatos(
        await api.ejecutar(admin, 'admin_crear_un_codigo', {
          vendedor_id: vendedor,
          codigo,
          campana: null,
          descuento: 0,
        }),
      );
    }
  });

  it('se cuentan sin sesión, sin distinguir mayúsculas; uno que no vale no cuenta', async () => {
    const contar = async (codigo: string) =>
      losDatos<{ contada: boolean }>(await api.ejecutar(null, 'contar_la_visita', { codigo }))
        .contada;
    expect(await contar('LOLA26')).toBe(true);
    expect(await contar('lola26')).toBe(true);
    expect(await contar('NOEXISTE')).toBe(false);
    expect(await contar('a b')).toBe(false);

    const [codigo] = await comoDuena<{ id: string }>(
      `select id from plataforma.codigo_de_vendedor where codigo = 'LOLA-VIEJO'`,
    );
    losDatos(
      await api.ejecutar(admin, 'admin_cerrar_un_codigo', {
        codigo_id: codigo?.id,
        motivo: 'era de la feria',
      }),
    );
    expect(await contar('LOLA-VIEJO')).toBe(false);

    const filas = await comoDuena<{ codigo: string; visitas: number }>(
      `select c.codigo, v.visitas from plataforma.visita_del_codigo v
         join plataforma.codigo_de_vendedor c on c.id = v.codigo_id`,
    );
    expect(filas).toEqual([{ codigo: 'LOLA26', visitas: 2 }]);
  });

  it('se guarda un número por código y día, y nada más: ni quién, ni desde dónde', async () => {
    const columnas = await comoDuena<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'plataforma' and table_name = 'visita_del_codigo' order by column_name`,
    );
    expect(columnas.map((c) => c.column_name)).toEqual(['codigo_id', 'dia', 'visitas']);
  });

  it('salen en el embudo y en la ficha del vendedor', async () => {
    const t = await lasVentas('7');
    expect(t.embudo.visitas).toBe(2);
    expect(t.vendedores.find((v) => v.id === vendedor)).toMatchObject({ visitas: 2, traidos: 0 });
    const ficha = losDatos<{ vendedor: { codigos: { codigo: string; visitas: number }[] } }>(
      await api.consultar(admin, 'admin_un_vendedor', { vendedor_id: vendedor }),
    );
    expect(ficha.vendedor.codigos.find((c) => c.codigo === 'LOLA26')?.visitas).toBe(2);
  });

  it('una sesión de la app no las lee', async () => {
    const rosa = await api.entrar('rosa@ejemplo.estook.com');
    expect(elFallo(await api.consultar(rosa, 'admin_un_vendedor', { vendedor_id: vendedor }))).toBe(
      'sin_permiso',
    );
  });
});

// ── La foto ──────────────────────────────────────────────────────────────────

describe('la foto de cada noche dice cómo está la cuenta y cuánto deja', () => {
  it('«Calcular ahora» apunta la cuenta de cada uno, y la cuota de quien paga', async () => {
    losDatos(await api.ejecutar(admin, 'admin_calcular_el_uso', {}));
    const [foto] = await comoDuena<{
      como: string;
      en_pausa: boolean;
      cuota_al_mes: number | null;
      de_la_casa: boolean;
      modo: string | null;
    }>(
      `select como, en_pausa, cuota_al_mes, de_la_casa, modo from plataforma.uso_diario
        where organizacion_id = $1 and dia = $2::date`,
      [pagadora, hoy()],
    );
    expect(foto).toEqual({
      como: 'al_dia',
      en_pausa: false,
      cuota_al_mes: 4_900,
      de_la_casa: false,
      modo: 'prueba',
    });
  });
});

// ── Cuadra con la base ───────────────────────────────────────────────────────

describe('el tablero cuadra con una consulta a mano', () => {
  it('«Pagando» es lo que dice la base, y lo mismo que la pestaña de Clientes', async () => {
    const t = await lasVentas('mes');
    const [aMano] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.suscripcion s
         join estook.organizacion o on o.id = s.organizacion_id
        where not o.es_ejemplo and not s.de_la_casa and s.estado = 'activa'
          and (s.stripe_modo is null or s.stripe_modo = 'prueba')`,
    );
    expect(t.clientes.pagando.ahora).toBe(aMano?.n);

    const lista = losDatos<{ clientes: { deLaCasa: boolean }[]; porPestana: { pagando: number } }>(
      await api.consultar(admin, 'admin_los_clientes', { pestana: 'pagando' }),
    );
    const deLaCasa = lista.clientes.filter((c) => c.deLaCasa).length;
    expect(t.clientes.pagando.ahora).toBe(lista.porPestana.pagando - deLaCasa);
  });

  it('la cuota al mes, sin IVA, es la suma a mano de lo que cobra Stripe', async () => {
    const t = await lasVentas('mes');
    const [aMano] = await comoDuena<{ suma: number }>(
      `select coalesce(sum(q.importe), 0)::int as suma from plataforma.cuota_de_stripe q
         join estook.suscripcion s on s.organizacion_id = q.organizacion_id
         join estook.organizacion o on o.id = q.organizacion_id
        where not o.es_ejemplo and not s.de_la_casa and s.estado in ('activa', 'impago')
          and s.intervalo = 'mes' and q.modo = 'prueba'`,
    );
    expect(t.dinero.cuotaAlMes.conIva).toBe(aMano?.suma);
    expect(t.dinero.cuotaAlMes.ahora).toBe(laCuotaSinIva(aMano?.suma ?? 0));
  });

  it('un cliente de ejemplo no cambia ninguna cifra', async () => {
    const antes = await lasVentas('mes');
    await comoDuena(
      `update estook.suscripcion s set estado = 'impago', impago_desde = now()
         from estook.organizacion o
        where o.id = s.organizacion_id and o.es_ejemplo`,
    );
    await comoDuena(`update estook.organizacion set creado_en = now() where es_ejemplo`);
    const despues = await lasVentas('mes');
    expect(despues).toEqual(antes);
  });
});

// ── Las bajas ────────────────────────────────────────────────────────────────

describe('las bajas salen de las fotos', () => {
  it('pagaba anteayer y ayer ya no: una baja, con la cuota que se llevó', async () => {
    await comoDuena(
      `insert into plataforma.uso_diario (organizacion_id, dia, dias_de_alta, productos, dias_sin_entrar,
         apuntes_7, apuntes_14, apuntes_14_antes, actividad, como, en_pausa, cuota_al_mes, de_la_casa, modo)
       values ($1, $2::date, 1, 0, 0, 0, 0, 0, 'activo', 'al_dia', false, 4900, false, 'prueba'),
              ($1, $3::date, 2, 0, 0, 0, 0, 0, 'activo', 'sin_pagar', false, null, false, 'prueba')
       on conflict (organizacion_id, dia) do update set como = excluded.como, cuota_al_mes = excluded.cuota_al_mes`,
      [pagadora, haceDias(2), haceDias(1)],
    );
    const t = await lasVentas('7');
    expect(t.clientes.bajas.ahora).toBe(1);
    expect(t.dinero.perdida.cuota).toBe(laCuotaSinIva(4_900));
    expect(t.fotosDesde).not.toBeNull();
  });
});

// ── El correo del lunes ──────────────────────────────────────────────────────

describe('el correo del lunes (4A)', () => {
  const SECRETO = 'el-secreto-del-reloj-de-las-ventas';

  /** El próximo lunes y el martes de después, a las 09:10 de Madrid. */
  function losDias(): { lunes: string; martes: string } {
    const ahora = new Date(Date.now());
    const dia = ahora.getUTCDay();
    const hasta = ((8 - dia) % 7) + 7;
    const lunes = new Date(ahora.getTime() + hasta * 86_400_000).toISOString().slice(0, 10);
    const martes = new Date(ahora.getTime() + (hasta + 1) * 86_400_000).toISOString().slice(0, 10);
    return { lunes, martes };
  }

  async function latirEl(dia: string) {
    const reloj = montarLaApi(base.bd, {
      correo,
      pagos,
      ahora: () => new Date(`${dia}T07:10:00Z`),
    });
    return reloj.despachador.latir(
      { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
      SECRETO,
    );
  }

  const losDelLunes = () =>
    correo.mandados.filter((c) => c.asunto.startsWith('Estook, la semana:'));

  it('el lunes llega a cada admin, con las cifras sin IVA y el modo prueba dicho', async () => {
    await comoDuena(
      `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
      [SECRETO],
    );
    const { lunes } = losDias();
    const hecho = await latirEl(lunes);
    expect(hecho).toMatchObject({ diario: true, fallos: 0 });
    const llegados = losDelLunes();
    expect(llegados.map((c) => c.para)).toEqual([ADMIN_DE_EJEMPLO]);
    expect(llegados[0]?.texto).toContain('Entra al mes, sin IVA');
    expect(llegados[0]?.texto).toContain('modo prueba');
  });

  it('y una sola vez por semana: el martes no se repite', async () => {
    const { martes } = losDias();
    await latirEl(martes);
    expect(losDelLunes()).toHaveLength(1);
  });

  it('el reloj trae lo cobrado de antes una vez, sin apuntar nada dos veces', async () => {
    const [stripe] = await comoDuena<{ traidos: boolean }>(
      `select cobros_traidos_en is not null as traidos from plataforma.stripe where modo = 'prueba'`,
    );
    expect(stripe?.traidos).toBe(true);
    const [cobros] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from plataforma.cobro where organizacion_id = $1`,
      [pagadora],
    );
    expect(cobros?.n).toBe(1);
  });
});
