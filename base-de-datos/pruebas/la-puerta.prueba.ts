import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { alSegundoDeMentira } from '../../servidor/infraestructura/al-segundo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * T1 · La puerta de Estook TPV (decisión 0107, migración 0083), contra una base de
 * verdad: las pruebas del Anexo 11.15 que son de T1, en el orden en que pasan en Bar
 * Centro el primer día.
 *
 *   · Rosa vincula **la caja** entrando con su correo, y su sesión ya no está al acabar
 *   · Sara no puede vincular nada: es camarera
 *   · desde la caja, Rosa saca un código para **el móvil de Sara** (comandero personal) y
 *     otro para **la tablet de la terraza** (comandero para todos); llegan con su función
 *   · el código no sirve dos veces, ni pasados diez minutos, ni a la vigésima primera
 *     prueba desde la misma dirección
 *   · en el móvil de Sara **no entra Marcos**; el primero del día cae en el inicio y el
 *     siguiente, en las mesas
 *   · **Estook TPV no se abre con la sesión de Estook**, y un aparato no es una puerta a
 *     la gestión
 *   · bloquear deja el turno sin valer, y lo pedido sin mandar sigue en la mesa
 *   · lo que Sara no puede quitar de cocina **lo aprueba Rosa con su PIN** ahí mismo
 *   · «solo entra quien ha fichado», fichar la salida pasando las mesas
 *   · la tablet de la barra pasa a ser la caja 2 sin volver a vincularla
 *   · desvincular la tablet: su siguiente petición ya no vale
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const alSegundo = alSegundoDeMentira();
let reloj = new Date(Date.now());
function pasan(minutos: number): void {
  reloj = new Date(reloj.getTime() + minutos * 60_000);
}

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero

let barCentro: string;
let saraId: string;
let llaveDeLaCaja: string;
let llaveDelMovil: string;
let llaveDeLaTablet: string;
let tablet: string;

interface Aparato {
  terminalId: string;
  nombre: string;
  funcion: string;
  esPersonal: boolean;
  dueno: { id: string; nombre: string } | null;
  cajon: string | null;
  local: { id: string; nombre: string };
  temaAlSegundo: string | null;
  fichados: { nombre: string }[];
}

interface Dentro {
  turno: string;
  persona: { id: string; nombre: string; iniciales: string };
  fichaje: string;
  caeEn: string;
}

async function entrarEn(llave: string, correo: string): Promise<{ token: string; dentro: Dentro }> {
  const dentro = losDatos<Dentro>(
    await api.ejecutar(null, 'entrar_con_pin', { llave, pin: base.pinDe(correo, 'bar-centro') }),
  );
  return { token: tokenDelAparato(dentro.turno, llave), dentro };
}

async function codigoPara(token: string, que: Record<string, unknown>): Promise<string> {
  return losDatos<{ codigo: string }>(await api.ejecutar(token, 'sacar_codigo_para_vincular', que))
    .codigo;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { alSegundo, ahora: () => reloj });
  barCentro = await base.localPorCodigo('bar-centro');
  saraId = await base.personaPorCorreo(SARA);
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

describe('vincular', () => {
  it('Sara, camarera, no vincula nada: ni ve dónde', async () => {
    const sara = await api.entrar(SARA);
    expect(
      losDatos<{ locales: unknown[] }>(await api.consultar(sara, 'donde_puedo_vincular')).locales,
    ).toEqual([]);
    expect(
      elFallo(
        await api.ejecutar(sara, 'vincular_el_primer_aparato', {
          local_id: barCentro,
          funcion: 'comandero',
          nombre: 'Mi móvil',
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('Rosa vincula la caja con su correo, con su cajón, y su sesión ya no está', async () => {
    const rosa = await api.entrar(ROSA);
    const donde = losDatos<{ locales: { id: string; nombre: string }[] }>(
      await api.consultar(rosa, 'donde_puedo_vincular'),
    );
    expect(donde.locales.map((l) => l.nombre)).toContain('Bar Centro');

    const vinculado = losDatos<{ llave: string; aparato: Aparato }>(
      await api.ejecutar(rosa, 'vincular_el_primer_aparato', {
        local_id: barCentro,
        funcion: 'caja',
        nombre: 'Caja 1',
        cajon_nuevo: 'Cajón de la barra',
      }),
    );
    llaveDeLaCaja = vinculado.llave;
    expect(vinculado.aparato).toMatchObject({
      nombre: 'Caja 1',
      funcion: 'caja',
      esPersonal: false,
      cajon: 'Cajón de la barra',
      local: { id: barCentro, nombre: 'Bar Centro' },
    });
    // **La sesión personal no se queda en el aparato** (Anexo 11.3).
    expect(elFallo(await api.consultar(rosa, 'quien_soy'))).toBe('sin_sesion');

    // Lo que guarda Estook es la huella de la llave, nunca la llave.
    const { rows } = await base.bd.query<{ huella: string }>(
      'select huella from estook.terminal where id = $1',
      [vinculado.aparato.terminalId],
    );
    expect(rows[0]?.huella).not.toBe(llaveDeLaCaja);
    expect(rows[0]?.huella).toMatch(/^[0-9a-f]{64}$/);
  });

  it('una caja siempre tiene cajón, y un comandero nunca', async () => {
    const rosa = await api.entrar(ROSA);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'vincular_el_primer_aparato', {
          local_id: barCentro,
          funcion: 'comandero',
          nombre: 'Tablet',
          cajon_nuevo: 'Otro cajón',
        }),
      ),
    ).toBe('faltan_datos');
    // Y la base no deja una caja sin cajón aunque alguien se salte la API.
    await expect(
      base.bd.query(
        `insert into estook.terminal (local_id, nombre, funcion, huella)
         values ($1, 'Caja sin cajón', 'caja', repeat('a', 64))`,
        [barCentro],
      ),
    ).rejects.toThrow(/terminal_cajon_en_la_caja/);
  });

  it('desde la caja, el código del móvil de Sara llega con su función, su nombre y su dueña', async () => {
    const { token } = await entrarEn(llaveDeLaCaja, ROSA);
    const codigo = await codigoPara(token, {
      funcion: 'comandero',
      nombre: 'Móvil de Sara',
      persona_id: saraId,
    });
    expect(codigo).toMatch(/^[0-9]{6}$/);

    const vinculado = losDatos<{ llave: string; aparato: Aparato }>(
      await api.ejecutar(null, 'vincular_con_codigo', { codigo }),
    );
    llaveDelMovil = vinculado.llave;
    expect(vinculado.aparato).toMatchObject({
      nombre: 'Móvil de Sara',
      funcion: 'comandero',
      esPersonal: true,
      dueno: { id: saraId, nombre: 'Sara' },
      cajon: null,
    });

    // **No sirve dos veces.**
    expect(elFallo(await api.ejecutar(null, 'vincular_con_codigo', { codigo }))).toBe(
      'codigo_no_vale',
    );

    // Y en la base queda quién lo sacó, desde dónde y qué aparato salió de él.
    const { rows } = await base.bd.query<{ usado: boolean; desde_la_caja: boolean }>(
      `select c.usado_en is not null as usado,
              c.creado_desde = (select id from estook.terminal where nombre = 'Caja 1') as desde_la_caja
         from estook.codigo_para_vincular c where c.nombre = 'Móvil de Sara'`,
    );
    expect(rows[0]).toEqual({ usado: true, desde_la_caja: true });
  });

  it('el código caduca a los diez minutos', async () => {
    const { token } = await entrarEn(llaveDeLaCaja, ROSA);
    const codigo = await codigoPara(token, { funcion: 'comandero', nombre: 'Tablet que no llega' });
    pasan(11);
    expect(elFallo(await api.ejecutar(null, 'vincular_con_codigo', { codigo }))).toBe(
      'codigo_no_vale',
    );
  });

  it('la tablet de la terraza, para todos', async () => {
    const { token } = await entrarEn(llaveDeLaCaja, ROSA);
    const codigo = await codigoPara(token, { funcion: 'comandero', nombre: 'Tablet terraza' });
    const vinculado = losDatos<{ llave: string; aparato: Aparato }>(
      await api.ejecutar(null, 'vincular_con_codigo', { codigo }),
    );
    llaveDeLaTablet = vinculado.llave;
    tablet = vinculado.aparato.terminalId;
    expect(vinculado.aparato).toMatchObject({ funcion: 'comandero', esPersonal: false });

    // Y en Ajustes del TPV › Aparatos salen los tres, la caja la primera, y los tres
    // en línea: cada uno late cada minuto.
    for (const llave of [llaveDeLaCaja, llaveDelMovil]) {
      losDatos(await api.ejecutar(null, 'latir_el_aparato', { llave, version: '2026.10.24' }));
    }
    const aparatos = losDatos<{ este: string; aparatos: { nombre: string; enLinea: boolean }[] }>(
      await api.consultar(token, 'los_aparatos'),
    );
    expect(aparatos.aparatos.map((a) => a.nombre)).toEqual([
      'Caja 1',
      'Móvil de Sara',
      'Tablet terraza',
    ]);
    expect(aparatos.aparatos.every((a) => a.enLinea)).toBe(true);
  });

  it('una dirección no prueba más de veinte códigos en una hora', async () => {
    const desde = '203.0.113.9';
    for (let i = 0; i < 20; i++) {
      expect(
        elFallo(await api.ejecutarDesde(desde, null, 'vincular_con_codigo', { codigo: '000001' })),
      ).toBe('codigo_no_vale');
    }
    expect(
      elFallo(await api.ejecutarDesde(desde, null, 'vincular_con_codigo', { codigo: '000001' })),
    ).toBe('demasiados_codigos');
    // Desde otra dirección se sigue pudiendo.
    expect(
      elFallo(
        await api.ejecutarDesde('203.0.113.10', null, 'vincular_con_codigo', { codigo: '000001' }),
      ),
    ).toBe('codigo_no_vale');
  });
});

describe('entrar con el PIN', () => {
  it('en el móvil de Sara solo entra Sara', async () => {
    expect(
      elFallo(
        await api.ejecutar(null, 'entrar_con_pin', {
          llave: llaveDelMovil,
          pin: base.pinDe(MARCOS, 'bar-centro'),
        }),
      ),
    ).toBe('aparato_de_otra_persona');
    const { dentro } = await entrarEn(llaveDelMovil, SARA);
    expect(dentro.persona).toMatchObject({ nombre: 'Sara', iniciales: 'SA' });
  });

  it('un PIN que no es de nadie no dice nada de nadie, y diez seguidos paran el aparato', async () => {
    const malo = (n: number) => String(100_000 + n).slice(-6);
    const conocidos = new Set(base.acceso.pines.map((p) => p.pin));
    let fallos = 0;
    for (let n = 0; fallos < 10; n++) {
      if (conocidos.has(malo(n))) continue;
      expect(
        elFallo(
          await api.ejecutar(null, 'entrar_con_pin', { llave: llaveDeLaTablet, pin: malo(n) }),
        ),
      ).toBe('pin_desconocido');
      fallos += 1;
    }
    expect(
      elFallo(
        await api.ejecutar(null, 'entrar_con_pin', {
          llave: llaveDeLaTablet,
          pin: base.pinDe(SARA, 'bar-centro'),
        }),
      ),
    ).toBe('aparato_parado');
    // Se para cinco minutos: lo que dice la base es lo que cuenta.
    await base.bd.query(
      'update estook.terminal set parado_hasta = null, intentos_fallidos = 0 where id = $1',
      [tablet],
    );
  });

  it('el primero del día cae en el inicio; el siguiente, si hay mesas, en las mesas', async () => {
    // La tablet no ha tenido a nadie todavía hoy.
    const primero = await entrarEn(llaveDeLaTablet, SARA);
    expect(primero.dentro.caeEn).toBe('inicio');
    // Sin mesas dibujadas, todos al inicio.
    expect((await entrarEn(llaveDeLaTablet, ROSA)).dentro.caeEn).toBe('inicio');

    // Rosa dibuja una mesa en la caja (desde T2, la sala se dibuja en el TPV).
    const enLaCaja = await entrarEn(llaveDeLaCaja, ROSA);
    const zona = losDatos<{ zonaId: string }>(
      await api.ejecutar(enLaCaja.token, 'crear_zona_de_sala', { nombre: 'Salón' }),
    ).zonaId;
    losDatos(
      await api.ejecutar(enLaCaja.token, 'crear_mesa', { zona_id: zona, nombre: '1', plazas: 4 }),
    );
    expect((await entrarEn(llaveDeLaTablet, SARA)).dentro.caeEn).toBe('mesas');
  });

  it('quien entra después deja sin valer el turno del de antes', async () => {
    const antes = await entrarEn(llaveDeLaTablet, SARA);
    expect((await api.consultar(antes.token, 'yo_en_el_tpv')).estado).toBe('ok');
    await entrarEn(llaveDeLaTablet, ROSA);
    expect(elFallo(await api.consultar(antes.token, 'yo_en_el_tpv'))).toBe('sin_sesion');
  });

  it('el turno sin la llave de su aparato no vale, ni con la llave de otro', async () => {
    const { dentro } = await entrarEn(llaveDeLaTablet, SARA);
    expect(
      elFallo(await api.consultar(tokenDelAparato(dentro.turno, llaveDeLaCaja), 'yo_en_el_tpv')),
    ).toBe('sin_sesion');
    expect(elFallo(await api.consultar(dentro.turno, 'yo_en_el_tpv'))).toBe('sin_sesion');
  });
});

describe('una puerta en cada sentido', () => {
  it('Estook TPV no se abre con la sesión de Estook', async () => {
    const sara = await api.entrar(SARA);
    expect(elFallo(await api.consultar(sara, 'el_plano'))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(sara, 'yo_en_el_tpv'))).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(sara, 'abrir_mesa', { cuenta_id: crypto.randomUUID(), tipo: 'barra' }),
      ),
    ).toBe('sin_permiso');
  });

  it('y un aparato vinculado no es una puerta a la gestión, aunque teclee la gerente', async () => {
    const { token } = await entrarEn(llaveDeLaCaja, ROSA);
    for (const consulta of ['quien_soy', 'mis_locales', 'mis_productos', 'mis_menus']) {
      expect(elFallo(await api.consultar(token, consulta)), consulta).toBe('sin_permiso');
    }
    expect(elFallo(await api.ejecutar(token, 'crear_seccion', { nombre: 'Desde la caja' }))).toBe(
      'sin_permiso',
    );
    // Ni vincula otro aparato con el correo desde dentro del TPV.
    expect(
      elFallo(
        await api.ejecutar(token, 'vincular_el_primer_aparato', {
          local_id: barCentro,
          funcion: 'fichar',
          nombre: 'Fichar',
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('el móvil de Sara no toca los Ajustes del TPV', async () => {
    const { token } = await entrarEn(llaveDelMovil, SARA);
    expect(
      elFallo(
        await api.ejecutar(token, 'sacar_codigo_para_vincular', {
          funcion: 'comandero',
          nombre: 'Otro',
        }),
      ),
    ).toBe('sin_permiso');
  });
});

describe('servicio', () => {
  it('bloquear deja el turno sin valer, y lo pedido sin mandar sigue en la mesa', async () => {
    const rosa = await api.entrar(ROSA);
    const seccion = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: 'Principales' }),
    ).seccionId;
    const plato = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: seccion,
        platos: [{ nombre: 'Entrecot', precio_centimos: 2200 }],
      }),
    ).creados[0]?.platoId;

    const sara = await entrarEn(llaveDeLaTablet, SARA);
    const cuenta = crypto.randomUUID();
    losDatos(await api.ejecutar(sara.token, 'abrir_mesa', { cuenta_id: cuenta, tipo: 'barra' }));
    losDatos(
      await api.ejecutar(sara.token, 'pedir', {
        cuenta_id: cuenta,
        platos: [{ id: crypto.randomUUID(), plato_id: plato, cantidad: 1 }],
      }),
    );
    losDatos(await api.ejecutar(sara.token, 'bloquear', {}));
    expect(elFallo(await api.consultar(sara.token, 'la_mesa', { cuenta_id: cuenta }))).toBe(
      'sin_sesion',
    );

    const rosaEnLaTablet = await entrarEn(llaveDeLaTablet, ROSA);
    const mesa = losDatos<{ platos: { nombre: string; estado: string }[] }>(
      await api.consultar(rosaEnLaTablet.token, 'la_mesa', { cuenta_id: cuenta }),
    );
    expect(mesa.platos).toEqual([
      expect.objectContaining({ nombre: 'Entrecot', estado: 'sin_mandar' }),
    ]);
  });

  it('lo que Sara no puede quitar de cocina lo aprueba Rosa con su PIN, en el mismo aparato', async () => {
    const sara = await entrarEn(llaveDeLaTablet, SARA);
    const yo = losDatos<{ misMesas: { cuentaId: string }[] }>(
      await api.consultar(sara.token, 'yo_en_el_tpv'),
    );
    const cuenta = yo.misMesas[0]?.cuentaId ?? '';
    losDatos(await api.ejecutar(sara.token, 'mandar_a_cocina', { cuenta_id: cuenta }));
    const mesa = losDatos<{ platos: { id: string }[] }>(
      await api.consultar(sara.token, 'la_mesa', { cuenta_id: cuenta }),
    );
    const linea = mesa.platos[0]?.id ?? '';
    const quitar = (pin?: string) =>
      api.ejecutar(sara.token, 'quitar_plato', {
        linea_id: linea,
        motivo: 'Se equivocó de plato',
        ...(pin === undefined ? {} : { pin_del_encargado: pin }),
      });

    expect(elFallo(await quitar())).toBe('lo_aprueba_un_encargado');
    // Marcos es cocinero: su PIN no aprueba esto.
    expect(elFallo(await quitar(base.pinDe(MARCOS, 'bar-centro')))).toBe('sin_permiso');
    expect(losDatos<{ borrado: boolean }>(await quitar(base.pinDe(ROSA, 'bar-centro')))).toEqual({
      lineaId: linea,
      borrado: false,
    });

    const { rows } = await base.bd.query<{
      quitada_por: string;
      pedida_por: string;
      aprobada_por: string;
      usada: boolean;
    }>(
      `select l.quitada_por::text, a.pedida_por::text, a.aprobada_por::text,
              a.usada_en is not null as usada
         from estook.linea_de_cuenta l join estook.aprobacion a on a.id = l.aprobacion_id
        where l.id = $1`,
      [linea],
    );
    expect(rows[0]).toEqual({
      quitada_por: saraId,
      pedida_por: saraId,
      aprobada_por: await base.personaPorCorreo(ROSA),
      usada: true,
    });
  });

  it('lo que cambia en la sala le llega al aparato, no a quien lo usa', async () => {
    const latido = losDatos<Aparato>(
      await api.ejecutar(null, 'latir_el_aparato', { llave: llaveDeLaCaja }),
    );
    expect(latido.temaAlSegundo).not.toBeNull();
    alSegundo.toques.length = 0;
    const sara = await entrarEn(llaveDeLaTablet, SARA);
    losDatos(
      await api.ejecutar(sara.token, 'abrir_mesa', {
        cuenta_id: crypto.randomUUID(),
        tipo: 'barra',
      }),
    );
    expect(alSegundo.toques.map((t) => t.tema)).toContain(latido.temaAlSegundo);
  });

  it('«solo entra quien ha fichado», y fichar la salida pasa las mesas', async () => {
    const rosa = await entrarEn(llaveDeLaCaja, ROSA);
    losDatos(
      await api.ejecutar(rosa.token, 'guardar_pin_y_bloqueo', {
        minutos: 3,
        al_cobrar: true,
        personal_minutos: 10,
        solo_entra_quien_ficha: true,
      }),
    );
    // Rosa ficha para poder recibir las mesas de Sara.
    losDatos(await api.ejecutar(rosa.token, 'fichar_en_el_tpv', { que: 'entrada' }));

    const pin = base.pinDe(SARA, 'bar-centro');
    expect(
      elFallo(await api.ejecutar(null, 'entrar_con_pin', { llave: llaveDeLaTablet, pin })),
    ).toBe('falta_fichar');
    const dentro = losDatos<Dentro>(
      await api.ejecutar(null, 'entrar_con_pin', {
        llave: llaveDeLaTablet,
        pin,
        fichar_la_entrada: true,
      }),
    );
    expect(dentro.fichaje).toBe('dentro');
    const token = tokenDelAparato(dentro.turno, llaveDeLaTablet);

    // Con mesas abiertas no se va sin decir a quién se las deja.
    expect(elFallo(await api.ejecutar(token, 'fichar_en_el_tpv', { que: 'salida' }))).toBe(
      'faltan_datos',
    );
    const salida = losDatos<{ turnoAcabado: boolean; fichaje: { estado: string } }>(
      await api.ejecutar(token, 'fichar_en_el_tpv', {
        que: 'salida',
        pasar_mesas_a: await base.personaPorCorreo(ROSA),
      }),
    );
    expect(salida).toMatchObject({ turnoAcabado: true, fichaje: { estado: 'fuera' } });
    expect(elFallo(await api.consultar(token, 'yo_en_el_tpv'))).toBe('sin_sesion');
    const deRosa = losDatos<{ misMesas: unknown[] }>(
      await api.consultar(rosa.token, 'yo_en_el_tpv'),
    );
    expect(deRosa.misMesas.length).toBeGreaterThanOrEqual(2);
  });
});

describe('cambiar lo que es un aparato', () => {
  it('la tablet de la barra pasa a ser la caja 2, con el cajón de la barra, sin volver a vincularla', async () => {
    const rosa = await entrarEn(llaveDeLaCaja, ROSA);
    const codigo = await codigoPara(rosa.token, {
      funcion: 'comandero',
      nombre: 'Tablet de la barra',
    });
    const vinculado = losDatos<{ llave: string; aparato: Aparato }>(
      await api.ejecutar(null, 'vincular_con_codigo', { codigo }),
    );
    // Rosa, que sigue fichada: el local pide fichar para usar el TPV desde la prueba de antes.
    const enLaTablet = await entrarEn(vinculado.llave, ROSA);

    const { cajones } = losDatos<{ cajones: { id: string; nombre: string }[] }>(
      await api.consultar(rosa.token, 'los_aparatos'),
    );
    const delaBarra = cajones.find((c) => c.nombre === 'Cajón de la barra')?.id;

    // Un comandero nunca tiene cajón, tampoco al cambiarlo.
    expect(
      elFallo(
        await api.ejecutar(rosa.token, 'cambiar_aparato', {
          terminal_id: vinculado.aparato.terminalId,
          funcion: 'comandero',
          nombre: 'Tablet de la barra',
          cajon_id: delaBarra,
        }),
      ),
    ).toBe('faltan_datos');

    expect(
      losDatos(
        await api.ejecutar(rosa.token, 'cambiar_aparato', {
          terminal_id: vinculado.aparato.terminalId,
          funcion: 'caja',
          nombre: 'Caja 2',
          cajon_id: delaBarra,
        }),
      ),
    ).toEqual({ terminalId: vinculado.aparato.terminalId });

    // La misma llave sigue valiendo, ya como caja y con el cajón compartido…
    expect(
      losDatos<Aparato>(await api.ejecutar(null, 'latir_el_aparato', { llave: vinculado.llave })),
    ).toMatchObject({ nombre: 'Caja 2', funcion: 'caja', cajon: 'Cajón de la barra' });
    // …y quien estaba dentro vuelve a teclear su PIN: el aparato ya es otra cosa.
    expect(elFallo(await api.consultar(enLaTablet.token, 'yo_en_el_tpv'))).toBe('sin_sesion');
  });
});

describe('desvincular', () => {
  it('la tablet de la terraza deja de valer en su petición siguiente', async () => {
    const enLaTablet = await entrarEn(llaveDeLaTablet, ROSA);
    const rosa = await entrarEn(llaveDeLaCaja, ROSA);
    expect(
      losDatos(await api.ejecutar(rosa.token, 'desvincular_aparato', { terminal_id: tablet })),
    ).toEqual({ terminalId: tablet, eraEste: false });
    expect(elFallo(await api.consultar(enLaTablet.token, 'yo_en_el_tpv'))).toBe('sin_sesion');
    expect(elFallo(await api.ejecutar(null, 'latir_el_aparato', { llave: llaveDeLaTablet }))).toBe(
      'aparato_retirado',
    );
  });
});
