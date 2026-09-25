import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import {
  pagosDeMentira,
  SECRETO_DEL_AVISO_DE_MENTIRA,
} from '../../servidor/infraestructura/pagos-de-mentira.ts';
import { firmarComoStripe } from '../../servidor/infraestructura/stripe.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * El pago con Stripe (entrega E2 · decisión 0048), contra Postgres de verdad y con
 * el Stripe de mentira, que avisa firmado por la misma puerta que el de verdad.
 *
 * Lo que se comprueba es lo que no puede saltarse nadie, con pantalla o sin ella:
 *
 *   · sin pago no hay app: ni mirar ni escribir, salvo pagar y salir
 *   · pagar abre la app; la oferta de prueba se da con la tarjeta puesta
 *   · un aviso sin la firma de Stripe no toca nada, y uno repetido no se aplica dos veces
 *   · un cobro fallido: siete días trabajando, y el octavo solo lectura; cobrar lo arregla
 *   · un local más sube la cuota, y Pro con dos locales pasa a Cadena
 *   · cancelar y reanudar
 *   · el reloj: sin su secreto no late, y el correo del impago sale una vez al día
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
let sinStripe: ApiDePrueba;
const correo = correoEnMemoria();
let ahora = new Date('2026-09-25T10:00:00Z');
const pagos = pagosDeMentira('http://localhost/api', () => ahora.getTime());
const UN_DIA = 86_400_000;

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

const quien = () => ({ tokenDeSesion: null, correlacionId: crypto.randomUUID() });

let direccion = 0;

/** Una cuenta nueva de verdad, por el camino de crear cuenta, y su token. */
async function cuentaNueva(para: string, negocio: string): Promise<string> {
  direccion += 1;
  losDatos(
    await api.ejecutarDesde(`10.9.0.${String(direccion)}`, null, 'pedir_codigo_de_registro', {
      nombre: 'Lucía',
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

async function suscripcionDe(para: string) {
  const [fila] = await comoDuena<{
    organizacion_id: string;
    estado: string;
    plan: string | null;
    locales_pagados: number | null;
    prueba_hasta: string | null;
    cancela_al_acabar: boolean;
    impago_desde: string | null;
  }>(
    `select s.organizacion_id, s.estado::text as estado, s.plan, s.locales_pagados,
            s.prueba_hasta::text as prueba_hasta, s.cancela_al_acabar, s.impago_desde::text as impago_desde
       from estook.suscripcion s
       join estook.membresia m on m.organizacion_id = s.organizacion_id
       join estook.persona p on p.id = m.persona_id
      where p.correo = $1`,
    [para],
  );
  if (fila === undefined) throw new Error(`${para} no tiene suscripción`);
  return fila;
}

/** Pagar como se paga: pedir la página de pago y abrirla (en el de mentira, abrirla es pagar). */
async function pagar(token: string, plan = 'esencial', intervalo = 'mes'): Promise<void> {
  const { url } = losDatos<{ url: string }>(
    await api.ejecutar(token, 'empezar_a_pagar', { plan, intervalo }),
  );
  const sesion = new URL(url).searchParams.get('sesion') ?? '';
  const vuelta = await pagos.pagar(sesion);
  expect(vuelta).toContain(`sesion=${sesion}`);
  // Lo que hace la app al volver de Stripe.
  losDatos(await api.ejecutar(token, 'volver_del_pago', { sesion }));
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, pagos, ahora: () => ahora });
  sinStripe = montarLaApi(base.bd, { correo, ahora: () => ahora });
  pagos.enganchar((cuerpo, firma) => api.despachador.avisoDeStripe(quien(), cuerpo, firma));
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('sin pago no hay app (0048)', () => {
  it('una cuenta nueva no mira ni escribe nada, ni llamando a la API a pelo', async () => {
    const token = await cuentaNueva('sinpagar@correo-de-prueba.com', 'Bar Sin Pagar');

    const yo = losDatos<{ destino: string; cuenta: { como: string } }>(
      await api.consultar(token, 'quien_soy'),
    );
    expect(yo.destino).toBe('elegir_plan');
    expect(yo.cuenta.como).toBe('sin_pagar');

    expect(elFallo(await api.consultar(token, 'mis_productos'))).toBe('cuenta_sin_pagar');
    expect(elFallo(await api.consultar(token, 'inventario_hoy'))).toBe('cuenta_sin_pagar');
    expect(
      elFallo(
        await api.ejecutar(token, 'crear_producto', {
          nombre: 'Leche',
          unidad_de_uso: 'l',
          zona: 'cocina',
        }),
      ),
    ).toBe('cuenta_sin_pagar');

    // Lo que hace falta para pagar o irse, sí.
    const suya = losDatos<{ como: string; pagoAbierto: boolean }>(
      await api.consultar(token, 'mi_suscripcion'),
    );
    expect(suya).toMatchObject({ como: 'sin_pagar', pagoAbierto: true });
  });

  it('sin clave de Stripe, pagar dice que el pago no está abierto', async () => {
    const token = await cuentaNueva('sinclave@correo-de-prueba.com', 'Bar Sin Clave');
    expect(
      elFallo(
        await sinStripe.ejecutar(token, 'empezar_a_pagar', { plan: 'esencial', intervalo: 'mes' }),
      ),
    ).toBe('pago_sin_abrir');
  });

  it('los ejemplos son de la casa: trabajan sin pagar', async () => {
    const rosa = await api.entrar('rosa@ejemplo.estook.com');
    losDatos(await api.consultar(rosa, 'mis_productos'));
  });
});

describe('pagar abre la app', () => {
  it('se paga en Stripe, el aviso llega firmado, y se entra', async () => {
    const para = 'paga@correo-de-prueba.com';
    const token = await cuentaNueva(para, 'Bar Que Paga');
    await pagar(token);

    const suya = await suscripcionDe(para);
    expect(suya).toMatchObject({ estado: 'activa', plan: 'esencial', locales_pagados: 1 });

    const yo = losDatos<{ destino: string; cuenta: { como: string } }>(
      await api.consultar(token, 'quien_soy'),
    );
    expect(yo.destino).toBe('onboarding');
    expect(yo.cuenta.como).toBe('al_dia');
    losDatos(await api.consultar(token, 'mis_productos'));

    // Y pagar otra vez no abre una segunda suscripción.
    expect(
      elFallo(await api.ejecutar(token, 'empezar_a_pagar', { plan: 'pro', intervalo: 'mes' })),
    ).toBe('ya_hecho');
  });

  it('si el aviso llega antes que la persona, la sesión se pone al día sola', async () => {
    // Entró sin pagar, sin local. Paga, cierra la pestaña de Stripe y vuelve otro día:
    // no pasa por `volver_del_pago`. Sin ponerse al día, cada comando le decía «hay que
    // estar dentro de un local» (lo cazó esta batería, 25-sep).
    const token = await cuentaNueva('sinvolver@correo-de-prueba.com', 'Bar Sin Volver');
    const { url } = losDatos<{ url: string }>(
      await api.ejecutar(token, 'empezar_a_pagar', { plan: 'esencial', intervalo: 'mes' }),
    );
    await pagos.pagar(new URL(url).searchParams.get('sesion') ?? '');

    const yo = losDatos<{ destino: string; local: { id: string } | null }>(
      await api.consultar(token, 'quien_soy'),
    );
    expect(yo.destino).toBe('onboarding');
    expect(yo.local).not.toBeNull();
    losDatos(
      await api.ejecutar(token, 'crear_producto', {
        nombre: 'Harina',
        unidad_de_uso: 'kg',
        zona: 'cocina',
      }),
    );
  });

  it('con la oferta encendida, la prueba empieza con la tarjeta puesta y no cobra hasta el final', async () => {
    await comoDuena(`update plataforma.oferta_de_prueba set activa = true, dias = 12`);
    const para = 'prueba@correo-de-prueba.com';
    const token = await cuentaNueva(para, 'Bar En Prueba');
    await comoDuena(`update plataforma.oferta_de_prueba set activa = false`);

    const antes = losDatos<{ diasDePrueba: number | null }>(
      await api.consultar(token, 'mi_suscripcion'),
    );
    expect(antes.diasDePrueba).toBe(12);

    await pagar(token);
    const suya = await suscripcionDe(para);
    expect(suya.estado).toBe('prueba');
    expect(suya.prueba_hasta).not.toBeNull();
    const yo = losDatos<{ cuenta: { como: string } }>(await api.consultar(token, 'quien_soy'));
    expect(yo.cuenta.como).toBe('prueba');
  });
});

describe('los avisos de Stripe', () => {
  it('uno sin la firma de Stripe no toca nada', async () => {
    const cuerpo = JSON.stringify({ id: 'evt_falso', type: 'invoice.paid', data: { object: {} } });
    const sinFirma = await api.despachador.avisoDeStripe(quien(), cuerpo, null);
    expect(sinFirma.firmaValida).toBe(false);
    const conOtra = await api.despachador.avisoDeStripe(
      quien(),
      cuerpo,
      await firmarComoStripe(cuerpo, 'whsec_de_otro', Math.floor(ahora.getTime() / 1000)),
    );
    expect(conOtra.firmaValida).toBe(false);
    const vieja = await api.despachador.avisoDeStripe(
      quien(),
      cuerpo,
      await firmarComoStripe(
        cuerpo,
        SECRETO_DEL_AVISO_DE_MENTIRA,
        Math.floor(ahora.getTime() / 1000) - 3600,
      ),
    );
    expect(vieja.firmaValida).toBe(false);
  });

  it('y el mismo aviso dos veces se aplica una', async () => {
    const cuerpo = JSON.stringify({
      id: 'evt_repetido',
      type: 'invoice.paid',
      data: { object: { object: 'invoice' } },
    });
    const firma = await firmarComoStripe(
      cuerpo,
      SECRETO_DEL_AVISO_DE_MENTIRA,
      Math.floor(ahora.getTime() / 1000),
    );
    const primero = await api.despachador.avisoDeStripe(quien(), cuerpo, firma);
    const segundo = await api.despachador.avisoDeStripe(quien(), cuerpo, firma);
    expect(primero).toEqual({ firmaValida: true, resultado: 'sin_suscripcion' });
    expect(segundo).toEqual({ firmaValida: true, resultado: 'repetido' });
  });
});

describe('un cobro que falla', () => {
  it('siete días trabajando con el aviso, el octavo solo lectura, y cobrar lo arregla', async () => {
    const para = 'impago@correo-de-prueba.com';
    const token = await cuentaNueva(para, 'Bar Impago');
    await pagar(token);
    const { organizacion_id: org } = await suscripcionDe(para);

    await pagos.fallarElCobro(org);
    expect((await suscripcionDe(para)).estado).toBe('impago');
    const primerDia = losDatos<{ cuenta: { como: string; diasQuedan: number } }>(
      await api.consultar(token, 'quien_soy'),
    );
    expect(primerDia.cuenta).toEqual({ como: 'impago', diasQuedan: 7, laLlevo: true });
    losDatos(
      await api.ejecutar(token, 'crear_producto', {
        nombre: 'Aceite',
        unidad_de_uso: 'l',
        zona: 'cocina',
      }),
    );

    const antes = ahora;
    ahora = new Date(antes.getTime() + 8 * UN_DIA);
    try {
      const octavo = losDatos<{ cuenta: { como: string } }>(
        await api.consultar(token, 'quien_soy'),
      );
      expect(octavo.cuenta.como).toBe('solo_lectura');
      losDatos(await api.consultar(token, 'mis_productos'));
      expect(
        elFallo(
          await api.ejecutar(token, 'crear_producto', {
            nombre: 'Sal',
            unidad_de_uso: 'kg',
            zona: 'cocina',
          }),
        ),
      ).toBe('cuenta_en_solo_lectura');
      // Pagar sí se puede: el portal abre en solo lectura.
      losDatos(await api.ejecutar(token, 'abrir_el_portal', {}));

      await pagos.cobrar(org);
      expect((await suscripcionDe(para)).impago_desde).toBeNull();
      losDatos(
        await api.ejecutar(token, 'crear_producto', {
          nombre: 'Sal',
          unidad_de_uso: 'kg',
          zona: 'cocina',
        }),
      );
    } finally {
      ahora = antes;
    }
  });
});

describe('la cuota sigue a los locales', () => {
  it('un local más suma uno, y Pro con dos locales pasa a Cadena', async () => {
    const para = 'cadena@correo-de-prueba.com';
    const token = await cuentaNueva(para, 'Grupo Que Crece');
    await pagar(token, 'pro', 'mes');
    expect(await suscripcionDe(para)).toMatchObject({ plan: 'pro', locales_pagados: 1 });

    const antes = losDatos<{ conUnLocalMas: { plan: string; cuota: number } }>(
      await api.consultar(token, 'mi_suscripcion'),
    );
    expect(antes.conUnLocalMas).toEqual({ plan: 'cadena', cuota: 13_800 });

    losDatos(await api.ejecutar(token, 'crear_local', { nombre: 'Segundo local' }));
    expect(await suscripcionDe(para)).toMatchObject({ plan: 'cadena', locales_pagados: 2 });
  });
});

describe('cancelar y reanudar', () => {
  it('se cancela al acabar lo pagado, y se puede deshacer', async () => {
    const para = 'cancela@correo-de-prueba.com';
    const token = await cuentaNueva(para, 'Bar Que Cancela');
    await pagar(token);

    losDatos(await api.ejecutar(token, 'cancelar_la_suscripcion', {}));
    expect((await suscripcionDe(para)).cancela_al_acabar).toBe(true);
    // Hasta el final de lo pagado, todo sigue igual.
    losDatos(
      await api.ejecutar(token, 'crear_producto', {
        nombre: 'Café',
        unidad_de_uso: 'kg',
        zona: 'cocina',
      }),
    );

    losDatos(await api.ejecutar(token, 'reanudar_la_suscripcion', {}));
    expect((await suscripcionDe(para)).cancela_al_acabar).toBe(false);
  });

  it('quien no lleva la facturación no puede ni mirarla', async () => {
    const sara = await api.entrar('sara@ejemplo.estook.com');
    expect(elFallo(await api.consultar(sara, 'mi_suscripcion'))).toBe('sin_permiso');
    expect(elFallo(await api.ejecutar(sara, 'cancelar_la_suscripcion', {}))).toBe('sin_permiso');
  });
});

describe('el reloj', () => {
  const SECRETO = 'el-secreto-del-reloj-de-las-pruebas';

  beforeAll(async () => {
    await comoDuena(
      `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
      [SECRETO],
    );
  });

  it('sin su secreto no late', async () => {
    expect(await api.despachador.latir(quien(), null)).toBeNull();
    expect(await api.despachador.latir(quien(), 'otro')).toBeNull();
  });

  it('antes de las ocho solo late; después, manda el correo del impago una vez al día', async () => {
    const para = 'reloj@correo-de-prueba.com';
    const token = await cuentaNueva(para, 'Bar Del Reloj');
    await pagar(token);
    const { organizacion_id: org } = await suscripcionDe(para);
    await pagos.fallarElCobro(org);

    const antes = ahora;
    try {
      ahora = new Date('2026-09-26T04:30:00Z'); // 06:30 en Madrid
      expect(await api.despachador.latir(quien(), SECRETO)).toMatchObject({ diario: false });

      ahora = new Date('2026-09-26T07:10:00Z'); // 09:10 en Madrid
      const cuantosAntes = correo.mandados.filter((c) => c.para === para).length;
      const hecho = await api.despachador.latir(quien(), SECRETO);
      expect(hecho).toMatchObject({ diario: true, fallos: 0 });
      const suyos = correo.mandados.filter((c) => c.para === para);
      expect(suyos.length).toBe(cuantosAntes + 1);
      expect(suyos.at(-1)?.asunto).toContain('no hemos podido cobrar tu suscripción');
      expect(suyos.at(-1)?.texto).toContain('No se pierde nada');

      // El latido de la hora siguiente no lo repite.
      ahora = new Date('2026-09-26T08:10:00Z');
      expect(await api.despachador.latir(quien(), SECRETO)).toMatchObject({ diario: false });
      expect(correo.mandados.filter((c) => c.para === para).length).toBe(cuantosAntes + 1);

      const [reloj] = await comoDuena<{ ultimo_latido: string | null }>(
        `select ultimo_latido::text from plataforma.reloj`,
      );
      expect(reloj?.ultimo_latido).not.toBeNull();
    } finally {
      ahora = antes;
    }
  });
});
