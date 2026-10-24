import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENLACE_POR_CORREO, tokenDelAparato } from '@estook/dominio';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { ADMIN_DE_EJEMPLO, CLAVE_DE_EJEMPLO } from '../semillas/claves-de-ejemplo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * El PIN y la contraseña (0109), contra una base de verdad. Lo que vio Richi el 24-oct
 * al probar T1, y la A que eligió: **el PIN es para los aparatos del local y la
 * contraseña para Estook**, y lo olvidado se recupera con un enlace al correo.
 *
 *   · ya no se entra en Estook con el PIN
 *   · «He olvidado mi contraseña»: el enlace, de un uso y una hora; la contraseña mala
 *     no lo gasta; las sesiones de antes se cierran; el segundo factor se sigue pidiendo
 *   · no se dice si un correo existe, y el tope por dirección salta igual
 *   · «He olvidado mi PIN» en el aparato: solo a quien trabaja en ese local; el PIN de
 *     antes deja de valer
 *   · quien vincula el primer aparato sin PIN en ese local sale con uno, y Mi acceso
 *     enseña cada local donde trabaja, tenga PIN o no
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
let reloj = new Date(Date.now());
function pasan(minutos: number): void {
  reloj = new Date(reloj.getTime() + minutos * 60_000);
}

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización
const CLAVE_NUEVA = 'una frase nueva que recuerdo';

/** Cada petición, desde su dirección: así el tope por dirección no se cruza entre pruebas. */
let ultimaDireccion = 0;
const otraDireccion = () => `10.9.0.${String(++ultimaDireccion)}`;

/** El enlace del último correo mandado a esa dirección, por su tipo. */
function elEnlacePara(para: string, que: 'contrasena' | 'pin'): string {
  const ultimo = [...correo.mandados].reverse().find((c) => c.para === para);
  const encontrado = ultimo?.texto.match(new RegExp(`#/correo\\?${que}=(\\S+)`));
  if (!encontrado?.[1]) throw new Error(`No ha llegado ningún enlace de ${que} a ${para}`);
  return decodeURIComponent(encontrado[1]);
}

const cuantosA = (para: string) => correo.mandados.filter((c) => c.para === para).length;

let barCentro: string;
let llaveDeLaTablet: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, ahora: () => reloj });
  barCentro = await base.localPorCodigo('bar-centro');
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('el PIN es para los aparatos del local, no para Estook', () => {
  it('ya no se entra en Estook con el correo y el PIN', async () => {
    expect(
      elFallo(
        await api.ejecutar(null, 'entrar', { correo: SARA, pin: base.pinDe(SARA, 'bar-centro') }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('He olvidado mi contraseña', () => {
  it('a un correo sin cuenta le llega que no la tiene, y la pantalla dice lo mismo', async () => {
    const respuesta = losDatos(
      await api.ejecutarDesde(otraDireccion(), null, 'pedir_enlace_de_contrasena', {
        correo: 'nadie@correo-de-prueba.com',
      }),
    );
    expect(respuesta).toEqual({ enviado: true, minutos: ENLACE_POR_CORREO.minutosDeLaContrasena });
    const ultimo = correo.mandados.at(-1);
    expect(ultimo?.para).toBe('nadie@correo-de-prueba.com');
    expect(ultimo?.asunto).toMatch(/No hay ninguna cuenta/);
    expect(ultimo?.texto).not.toMatch(/#\/correo\?contrasena=/);
  });

  it('Sara se pone una nueva con el enlace, y las sesiones de antes se cierran', async () => {
    const antes = await api.entrar(SARA);
    expect(
      losDatos(
        await api.ejecutarDesde(otraDireccion(), null, 'pedir_enlace_de_contrasena', {
          correo: SARA,
        }),
      ),
    ).toEqual({ enviado: true, minutos: ENLACE_POR_CORREO.minutosDeLaContrasena });
    const enlace = elEnlacePara(SARA, 'contrasena');

    // Una que no vale no gasta el enlace.
    expect(
      elFallo(
        await api.ejecutar(null, 'poner_contrasena_con_enlace', { enlace, contrasena: 'corta' }),
      ),
    ).toBe('faltan_datos');

    expect(
      losDatos(
        await api.ejecutar(null, 'poner_contrasena_con_enlace', {
          enlace,
          contrasena: CLAVE_NUEVA,
        }),
      ),
    ).toEqual({ puesta: true });

    // **Sirve una vez.**
    expect(
      elFallo(
        await api.ejecutar(null, 'poner_contrasena_con_enlace', {
          enlace,
          contrasena: CLAVE_NUEVA,
        }),
      ),
    ).toBe('no_existe');

    // La de antes ya no vale, la nueva sí, y la sesión de antes está cerrada.
    expect(
      elFallo(await api.ejecutar(null, 'entrar', { correo: SARA, contrasena: CLAVE_DE_EJEMPLO })),
    ).toBe('no_cuadra');
    expect(
      losDatos<{ token: string }>(
        await api.ejecutar(null, 'entrar', { correo: SARA, contrasena: CLAVE_NUEVA }),
      ).token,
    ).toMatch(/.+/);
    expect(elFallo(await api.consultar(antes, 'quien_soy'))).toBe('sin_sesion');
  });

  it('el enlace caduca a la hora', async () => {
    losDatos(
      await api.ejecutarDesde(otraDireccion(), null, 'pedir_enlace_de_contrasena', {
        correo: ROSA,
      }),
    );
    const enlace = elEnlacePara(ROSA, 'contrasena');
    pasan(ENLACE_POR_CORREO.minutosDeLaContrasena + 1);
    expect(
      elFallo(
        await api.ejecutar(null, 'poner_contrasena_con_enlace', {
          enlace,
          contrasena: CLAVE_NUEVA,
        }),
      ),
    ).toBe('no_existe');
  });

  it('la contraseña nueva no se salta el segundo factor', async () => {
    losDatos(
      await api.ejecutarDesde(otraDireccion(), null, 'pedir_enlace_de_contrasena', {
        correo: ADMIN_DE_EJEMPLO,
      }),
    );
    losDatos(
      await api.ejecutar(null, 'poner_contrasena_con_enlace', {
        enlace: elEnlacePara(ADMIN_DE_EJEMPLO, 'contrasena'),
        contrasena: CLAVE_NUEVA,
      }),
    );
    const entrada = losDatos<{ faltaDobleFactor: boolean }>(
      await api.ejecutar(null, 'entrar_en_admin', {
        correo: ADMIN_DE_EJEMPLO,
        contrasena: CLAVE_NUEVA,
      }),
    );
    expect(entrada.faltaDobleFactor).toBe(true);
  });

  it('a una persona no le llegan más de tres en una hora, aunque se pidan desde sitios distintos', async () => {
    pasan(61);
    const antes = cuantosA(ROSA);
    for (let i = 0; i < ENLACE_POR_CORREO.porHoraAUnaPersona + 1; i++) {
      expect(
        losDatos(
          await api.ejecutarDesde(otraDireccion(), null, 'pedir_enlace_de_contrasena', {
            correo: ROSA,
          }),
        ),
      ).toEqual({ enviado: true, minutos: ENLACE_POR_CORREO.minutosDeLaContrasena });
    }
    expect(cuantosA(ROSA) - antes).toBe(ENLACE_POR_CORREO.porHoraAUnaPersona);
  });

  it('una dirección no pide más de diez en una hora, exista el correo o no', async () => {
    const desde = otraDireccion();
    for (let i = 0; i < ENLACE_POR_CORREO.porHoraDesdeUnaDireccion; i++) {
      losDatos(
        await api.ejecutarDesde(desde, null, 'pedir_enlace_de_contrasena', {
          correo: `quien-${String(i)}@correo-de-prueba.com`,
        }),
      );
    }
    for (const quien of ['otro@correo-de-prueba.com', SARA]) {
      expect(
        elFallo(
          await api.ejecutarDesde(desde, null, 'pedir_enlace_de_contrasena', { correo: quien }),
        ),
      ).toBe('demasiados_enlaces');
    }
  });

  it('en la base queda la huella del enlace, nunca el enlace', async () => {
    const { rows } = await base.bd.query<{ huella: string | null }>(
      `select huella from estook.enlace_por_correo where huella is not null`,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const fila of rows) expect(fila.huella).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('He olvidado mi PIN, en el aparato del local', () => {
  it('quien vincula el primer aparato sin PIN en ese local sale con uno, y entra con él', async () => {
    const rosaId = await base.personaPorCorreo(ROSA);
    await base.bd.query('delete from estook.pin where persona_id = $1 and local_id = $2', [
      rosaId,
      barCentro,
    ]);

    // Mi acceso enseña Bar Centro aunque no tenga PIN: ahí es donde se pone uno.
    const rosa = await api.entrar(ROSA);
    const acceso = losDatos<{ pines: { local: string; creadoEn: string | null }[] }>(
      await api.consultar(rosa, 'mi_acceso'),
    );
    expect(acceso.pines).toContainEqual(
      expect.objectContaining({ local: 'Bar Centro', creadoEn: null }),
    );

    const vinculado = losDatos<{ llave: string; tuPinNuevo: string | null }>(
      await api.ejecutar(rosa, 'vincular_el_primer_aparato', {
        local_id: barCentro,
        funcion: 'comandero',
        nombre: 'Tablet terraza',
      }),
    );
    llaveDeLaTablet = vinculado.llave;
    expect(vinculado.tuPinNuevo).toMatch(/^\d{6}$/);
    expect(
      losDatos<{ persona: { nombre: string } }>(
        await api.ejecutar(null, 'entrar_con_pin', {
          llave: llaveDeLaTablet,
          pin: vinculado.tuPinNuevo,
        }),
      ).persona.nombre,
    ).toBe('Rosa');
  });

  it('Sara pide uno nuevo con su correo: el de antes deja de valer y el nuevo entra', async () => {
    const pinDeAntes = base.pinDe(SARA, 'bar-centro');
    expect(
      losDatos(
        await api.ejecutarDesde(otraDireccion(), null, 'pedir_pin_por_correo', {
          llave: llaveDeLaTablet,
          correo: SARA,
        }),
      ),
    ).toEqual({ enviado: true, minutos: ENLACE_POR_CORREO.minutosDelPin, local: 'Bar Centro' });
    const enlace = elEnlacePara(SARA, 'pin');

    const nuevo = losDatos<{ pin: string; local: string }>(
      await api.ejecutar(null, 'pin_con_enlace', { enlace }),
    );
    expect(nuevo.local).toBe('Bar Centro');
    expect(nuevo.pin).toMatch(/^\d{6}$/);
    expect(elFallo(await api.ejecutar(null, 'pin_con_enlace', { enlace }))).toBe('no_existe');

    expect(
      elFallo(
        await api.ejecutar(null, 'entrar_con_pin', { llave: llaveDeLaTablet, pin: pinDeAntes }),
      ),
    ).not.toBeNull();
    const dentro = losDatos<{ turno: string; persona: { nombre: string } }>(
      await api.ejecutar(null, 'entrar_con_pin', { llave: llaveDeLaTablet, pin: nuevo.pin }),
    );
    expect(dentro.persona.nombre).toBe('Sara');
    expect(
      (await api.consultar(tokenDelAparato(dentro.turno, llaveDeLaTablet), 'yo_en_el_tpv')).estado,
    ).toBe('ok');
  });

  it('a quien no trabaja en el local no le llega nada, y la pantalla dice lo mismo', async () => {
    const antes = cuantosA(LUIS);
    expect(
      losDatos(
        await api.ejecutarDesde(otraDireccion(), null, 'pedir_pin_por_correo', {
          llave: llaveDeLaTablet,
          correo: LUIS,
        }),
      ),
    ).toEqual({ enviado: true, minutos: ENLACE_POR_CORREO.minutosDelPin, local: 'Bar Centro' });
    expect(cuantosA(LUIS)).toBe(antes);
  });

  it('el enlace del PIN caduca a la media hora', async () => {
    losDatos(
      await api.ejecutarDesde(otraDireccion(), null, 'pedir_pin_por_correo', {
        llave: llaveDeLaTablet,
        correo: SARA,
      }),
    );
    const enlace = elEnlacePara(SARA, 'pin');
    pasan(ENLACE_POR_CORREO.minutosDelPin + 1);
    expect(elFallo(await api.ejecutar(null, 'pin_con_enlace', { enlace }))).toBe('no_existe');
  });

  it('sin un aparato vinculado no se pide nada', async () => {
    expect(
      elFallo(
        await api.ejecutarDesde(otraDireccion(), null, 'pedir_pin_por_correo', {
          llave: 'una-llave-que-no-es-de-ningun-aparato',
          correo: SARA,
        }),
      ),
    ).toBe('aparato_retirado');
  });
});
