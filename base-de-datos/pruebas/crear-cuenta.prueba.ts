import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { CorreoNoSale, correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { identidadDeMentira } from '../../servidor/infraestructura/identidad-de-google.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/claves-de-ejemplo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Crear cuenta y entrar con Google (0042), contra Postgres de verdad.
 *
 * Lo que se comprueba es lo que no enseña ninguna pantalla:
 *
 *   · la cuenta no existe hasta escribir el código, y el código se gasta
 *   · no se dice si un correo tiene cuenta, y a ese correo le llega un aviso
 *   · los límites: un código por minuto, cinco intentos, diez cuentas por hora
 *   · la cuenta nace pendiente de pago, con o sin oferta; la oferta son sus días de
 *     prueba, que se dan con la tarjeta puesta (0048)
 *   · Google une la cuenta que ya existía, crea la que no, y no crea al entrar
 *   · y sin correo ni Google, lo dice en vez de romperse
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let sinNada: ApiDePrueba;
const correo = correoEnMemoria();
const ahora = () => new Date(Date.now());

/** El código del último correo mandado a esa dirección. */
function codigoPara(para: string): string {
  const ultimo = [...correo.mandados].reverse().find((c) => c.para === para);
  const encontrado = ultimo?.asunto.match(/^(\d{6}) es tu código/);
  if (!encontrado?.[1]) throw new Error(`No ha llegado ningún código a ${para}`);
  return encontrado[1];
}

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

/** Cada petición, desde su dirección: así el límite por dirección no se cruza entre pruebas. */
let ultimaDireccion = 0;
const otraDireccion = () => `10.0.0.${++ultimaDireccion}`;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, identidadDeGoogle: identidadDeMentira() });
  sinNada = montarLaApi(base.bd);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function pedir(para: string, desde = otraDireccion(), negocio = 'La Taberna de Prueba') {
  return api.ejecutarDesde(desde, null, 'pedir_codigo_de_registro', {
    nombre: 'Marta',
    negocio,
    correo: para,
    contrasena: 'una frase que me sé',
    aceptaCondiciones: true,
  });
}

async function suscripcionDe(para: string) {
  const [fila] = await comoDuena<{ estado: string; prueba_hasta: string | null }>(
    `select s.estado::text as estado, s.prueba_hasta::text as prueba_hasta
       from estook.suscripcion s
       join estook.membresia m on m.organizacion_id = s.organizacion_id
       join estook.persona p on p.id = m.persona_id
      where p.correo = $1`,
    [para],
  );
  return fila;
}

describe('sin correo ni Google conectados', () => {
  it('se dice qué hay y qué no, sin romperse', async () => {
    const como = losDatos<{ google: unknown; conCorreo: boolean; oferta: { activa: boolean } }>(
      await sinNada.consultar(null, 'como_se_entra'),
    );
    expect(como.google).toBeNull();
    expect(como.conCorreo).toBe(false);
    expect(como.oferta.activa).toBe(false);

    expect(
      elFallo(
        await sinNada.ejecutar(null, 'pedir_codigo_de_registro', {
          nombre: 'Marta',
          negocio: 'Taberna',
          correo: 'marta@correo-de-prueba.com',
          contrasena: 'una frase que me sé',
          aceptaCondiciones: true,
        }),
      ),
    ).toBe('todavia_no_disponible');
  });
});

describe('crear cuenta con correo', () => {
  it('sin aceptar las condiciones no se pide nada', async () => {
    const sinAceptar = await api.ejecutar(null, 'pedir_codigo_de_registro', {
      nombre: 'Marta',
      negocio: 'Taberna',
      correo: 'sin-aceptar@correo-de-prueba.com',
      contrasena: 'una frase que me sé',
      aceptaCondiciones: false,
    });
    expect(elFallo(sinAceptar)).toBe('faltan_datos');
  });

  it('la cuenta no existe hasta escribir el código, y con él se entra al alta de su negocio', async () => {
    const para = 'marta@correo-de-prueba.com';
    losDatos(await pedir(para));

    const antes = await comoDuena(`select 1 from estook.persona where correo = $1`, [para]);
    expect(antes).toHaveLength(0);

    // Un código mal, y se cuenta.
    expect(
      elFallo(await api.ejecutar(null, 'confirmar_registro', { correo: para, codigo: '000000' })),
    ).toBe('codigo_incorrecto');

    const dentro = losDatos<{ token: string; destino: string }>(
      await api.ejecutar(null, 'confirmar_registro', { correo: para, codigo: codigoPara(para) }),
    );
    // Sin oferta, **pendiente de pago**: a elegir su plan.
    expect(dentro.destino).toBe('elegir_plan');
    expect((await suscripcionDe(para))?.estado).toBe('pendiente_de_pago');

    // Es dirección de su negocio, y entra después con su contraseña.
    const [membresia] = await comoDuena<{ rol: string; alcance: string }>(
      `select m.rol::text as rol, m.alcance::text as alcance
         from estook.membresia m join estook.persona p on p.id = m.persona_id
        where p.correo = $1`,
      [para],
    );
    expect(membresia).toEqual({ rol: 'direccion', alcance: 'organizacion' });
    losDatos(
      await api.ejecutar(null, 'entrar', { correo: para, contrasena: 'una frase que me sé' }),
    );

    // Y el código ya no vale: se ha gastado.
    expect(
      elFallo(
        await api.ejecutar(null, 'confirmar_registro', { correo: para, codigo: codigoPara(para) }),
      ),
    ).toBe('codigo_incorrecto');
  });

  it('con un correo que ya tiene cuenta contesta lo mismo, y a ese correo le llega un aviso', async () => {
    const para = 'rosa@ejemplo.estook.com';
    const antes = correo.mandados.length;
    const respuesta = losDatos<{ enviado: boolean }>(await pedir(para));
    expect(respuesta.enviado).toBe(true);

    const ultimo = correo.mandados[correo.mandados.length - 1];
    expect(correo.mandados.length).toBe(antes + 1);
    expect(ultimo?.para).toBe(para);
    expect(ultimo?.asunto).toBe('Ya tienes una cuenta de Estook');
    // Y no se guarda ningún registro que se pueda confirmar.
    expect(
      await comoDuena(`select 1 from estook.registro_pendiente where correo = $1`, [para]),
    ).toHaveLength(0);
  });

  it('un código por minuto al mismo correo', async () => {
    const para = 'prisa@correo-de-prueba.com';
    losDatos(await pedir(para));
    expect(elFallo(await pedir(para))).toBe('espera_un_momento');
  });

  it('cinco códigos mal tiran el registro, y el bueno ya no vale', async () => {
    const para = 'cinco@correo-de-prueba.com';
    losDatos(await pedir(para));
    const bueno = codigoPara(para);
    for (let i = 0; i < 5; i++) {
      await api.ejecutar(null, 'confirmar_registro', { correo: para, codigo: '000000' });
    }
    expect(
      elFallo(await api.ejecutar(null, 'confirmar_registro', { correo: para, codigo: bueno })),
    ).toBe('codigo_incorrecto');
  });

  it('diez cuentas por hora desde la misma dirección, y la undécima no', async () => {
    const desde = '10.9.9.9';
    for (let i = 0; i < 10; i++) {
      losDatos(await pedir(`muchas-${i}@correo-de-prueba.com`, desde));
    }
    expect(elFallo(await pedir('muchas-10@correo-de-prueba.com', desde))).toBe(
      'demasiadas_cuentas',
    );
  });

  it('una contraseña corta no se acepta', async () => {
    const corta = await api.ejecutar(null, 'pedir_codigo_de_registro', {
      nombre: 'Marta',
      negocio: 'Taberna',
      correo: 'corta@correo-de-prueba.com',
      contrasena: 'corta',
      aceptaCondiciones: true,
    });
    expect(elFallo(corta)).toBe('faltan_datos');
  });
});

describe('la oferta de prueba', () => {
  let tokenDelAdmin: string;

  beforeAll(async () => {
    const entrada = losDatos<{ token: string }>(
      await api.ejecutar(null, 'entrar_en_admin', {
        correo: ADMIN_DE_EJEMPLO,
        contrasena: CLAVE_DE_EJEMPLO,
      }),
    );
    losDatos(
      await api.ejecutar(entrada.token, 'superar_doble_factor', {
        codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora()),
      }),
    );
    tokenDelAdmin = entrada.token;
  });

  it('solo la cambia un admin, y queda apuntado', async () => {
    const deRosa = await api.entrar('rosa@ejemplo.estook.com');
    expect(
      elFallo(await api.ejecutar(deRosa, 'admin_cambiar_oferta', { activa: true, dias: 12 })),
    ).toBe('sin_permiso');

    losDatos(await api.ejecutar(tokenDelAdmin, 'admin_cambiar_oferta', { activa: true, dias: 12 }));

    const oferta = losDatos<{ activa: boolean; dias: number; cambiadaPor: string }>(
      await api.consultar(tokenDelAdmin, 'admin_oferta'),
    );
    expect(oferta).toMatchObject({ activa: true, dias: 12, cambiadaPor: 'Ada' });

    const publica = losDatos<{ oferta: { activa: boolean; dias: number } }>(
      await api.consultar(null, 'como_se_entra'),
    );
    expect(publica.oferta).toEqual({ activa: true, dias: 12 });
  });

  it('con la oferta encendida, la cuenta nueva también paga antes de entrar, y guarda sus días de prueba', async () => {
    // Hasta la 0048 entraba en prueba sin tarjeta. Richi, 25-sep: «sin pago no hay
    // app; si hay prueba, pones tarjeta y una vez validada empieza la prueba».
    const para = 'con-oferta@correo-de-prueba.com';
    losDatos(await pedir(para));
    const dentro = losDatos<{ destino: string }>(
      await api.ejecutar(null, 'confirmar_registro', { correo: para, codigo: codigoPara(para) }),
    );
    expect(dentro.destino).toBe('elegir_plan');

    const suscripcion = await suscripcionDe(para);
    expect(suscripcion?.estado).toBe('pendiente_de_pago');
    expect(suscripcion?.prueba_hasta).toBeNull();
    const [dias] = await comoDuena<{ dias_de_prueba: number }>(
      `select s.dias_de_prueba from estook.suscripcion s
         join estook.membresia m on m.organizacion_id = s.organizacion_id
         join estook.persona p on p.id = m.persona_id
        where p.correo = $1`,
      [para],
    );
    expect(dias?.dias_de_prueba).toBe(12);
  });

  it('dos negocios con el mismo nombre son dos negocios', async () => {
    const a = 'mismo-a@correo-de-prueba.com';
    const b = 'mismo-b@correo-de-prueba.com';
    losDatos(await pedir(a, otraDireccion(), 'Casa Pepe'));
    losDatos(await api.ejecutar(null, 'confirmar_registro', { correo: a, codigo: codigoPara(a) }));
    losDatos(await pedir(b, otraDireccion(), 'Casa Pepe'));
    losDatos(await api.ejecutar(null, 'confirmar_registro', { correo: b, codigo: codigoPara(b) }));

    const codigos = await comoDuena<{ codigo: string }>(
      `select codigo from estook.organizacion where nombre = 'Casa Pepe' order by codigo`,
    );
    expect(codigos.map((c) => c.codigo)).toEqual(['casa-pepe', 'casa-pepe-1']);
  });
});

describe('entrar con Google', () => {
  const vuelta = 'http://localhost:5174/';
  const verificador = 'v'.repeat(43);

  const conGoogle = (codigo: string, extra: Record<string, unknown> = {}) =>
    api.ejecutar(null, 'entrar_con_google', {
      codigo,
      verificador,
      redireccion: vuelta,
      intencion: 'entrar',
      ...extra,
    });

  it('a una dirección de vuelta que no es nuestra, ni se intenta', async () => {
    const fuera = await api.ejecutar(null, 'entrar_con_google', {
      codigo: 'prueba|g-1|rosa@ejemplo.estook.com|Rosa|si',
      verificador,
      redireccion: 'https://atacante.example/app/',
      intencion: 'entrar',
    });
    expect(elFallo(fuera)).toBe('faltan_datos');
  });

  it('entrar sin cuenta no crea nada: dice que no la hay', async () => {
    expect(elFallo(await conGoogle('prueba|g-nadie|nadie@correo-de-prueba.com|Nadie|si'))).toBe(
      'sin_cuenta',
    );
    expect(
      await comoDuena(`select 1 from estook.persona where correo = 'nadie@correo-de-prueba.com'`),
    ).toHaveLength(0);
  });

  it('un correo que Google no ha verificado no demuestra nada', async () => {
    expect(elFallo(await conGoogle('prueba|g-2|sinverificar@correo-de-prueba.com|X|no'))).toBe(
      'faltan_datos',
    );
  });

  it('crear con Google: cuenta, negocio y sesión, sin contraseña', async () => {
    const creada = losDatos<{ destino: string }>(
      await conGoogle('prueba|g-luca|luca@correo-de-prueba.com|Luca|si', {
        intencion: 'crear',
        negocio: 'Trattoria Luca',
        aceptaCondiciones: true,
      }),
    );
    // Con o sin oferta, a pagar antes de nada (0048).
    expect(creada.destino).toBe('elegir_plan');

    const [identidad] = await comoDuena<{ sujeto: string }>(
      `select i.sujeto from estook.identidad_externa i
         join estook.persona p on p.id = i.persona_id where p.correo = 'luca@correo-de-prueba.com'`,
    );
    expect(identidad?.sujeto).toBe('g-luca');
    expect(
      await comoDuena(
        `select 1 from estook.credencial c join estook.persona p on p.id = c.persona_id
          where p.correo = 'luca@correo-de-prueba.com'`,
      ),
    ).toHaveLength(0);

    // Y la siguiente vez, entrar le lleva a su cuenta, sin crear otra.
    losDatos(await conGoogle('prueba|g-luca|luca@correo-de-prueba.com|Luca|si'));
    expect(
      await comoDuena(`select 1 from estook.persona where correo = 'luca@correo-de-prueba.com'`),
    ).toHaveLength(1);
  });

  it('crear con Google sin negocio o sin aceptar, no', async () => {
    expect(
      elFallo(
        await conGoogle('prueba|g-3|sinnegocio@correo-de-prueba.com|S|si', { intencion: 'crear' }),
      ),
    ).toBe('faltan_datos');
  });

  it('con un correo que ya tiene cuenta, se unen solas y entra en la suya', async () => {
    // Marta creó su cuenta con correo más arriba.
    const dentro = losDatos<{ token: string }>(
      await conGoogle('prueba|g-marta|marta@correo-de-prueba.com|Marta|si'),
    );
    expect(dentro.token).toBeTruthy();
    const [unida] = await comoDuena<{ n: number }>(
      `select count(*)::int as n from estook.identidad_externa i
         join estook.persona p on p.id = i.persona_id where p.correo = 'marta@correo-de-prueba.com'`,
    );
    expect(unida?.n).toBe(1);
  });

  it('otra cuenta de Google con el mismo correo no se queda con la suya', async () => {
    // Marta ya está unida a `g-marta`. Una cuenta de Google distinta que diga el
    // mismo correo no entra, y no la desune: se dice claro, sin un 500.
    const otra = await conGoogle('prueba|g-otra-marta|marta@correo-de-prueba.com|Marta|si');
    expect(elFallo(otra)).toBe('no_cuadra');
    const [unida] = await comoDuena<{ sujeto: string }>(
      `select i.sujeto from estook.identidad_externa i
         join estook.persona p on p.id = i.persona_id where p.correo = 'marta@correo-de-prueba.com'`,
    );
    expect(unida?.sujeto).toBe('g-marta');
  });

  it('a una persona de ejemplo no se entra con Google', async () => {
    expect(elFallo(await conGoogle('prueba|g-rosa|rosa@ejemplo.estook.com|Rosa|si'))).toBe(
      'no_cuadra',
    );
  });

  it('y si su negocio le pide segundo factor, Google no se lo salta', async () => {
    // El admin de ejemplo tiene el segundo factor montado, pero es de ejemplo; se
    // monta uno a Marta, que es de verdad.
    await base.bd.query(
      `insert into estook.doble_factor (persona_id, secreto, confirmado_en)
       select id, $1, now() from estook.persona where correo = 'marta@correo-de-prueba.com'`,
      [SECRETO_DEL_ADMIN_DE_EJEMPLO],
    );
    const dentro = losDatos<{ token: string; faltaDobleFactor: boolean }>(
      await conGoogle('prueba|g-marta|marta@correo-de-prueba.com|Marta|si'),
    );
    expect(dentro.faltaDobleFactor).toBe(true);
    expect(elFallo(await api.consultar(dentro.token, 'mis_locales'))).toBe('falta_doble_factor');
  });
});

/**
 * Cuando el correo no sale · lo que se vio en producción el 21 de septiembre.
 *
 * Richi encendió el correo, rellenó «Crea tu cuenta» y le salió **«Se nos ha roto
 * algo por dentro. Inténtalo en un minuto»**. Y no se arreglaba en un minuto,
 * porque no era una caída: era la configuración de Resend. Además, el fallo se
 * atrapaba y se traducía, así que **no quedaba ni una línea en el registro**: por
 * fuera era indistinguible de una caída de verdad.
 *
 * Estas pruebas fijan las dos mitades del arreglo:
 *
 *   · **Un 4xx no se arregla esperando**, así que no se manda a reintentar: se
 *     dice lo que es y se ofrece Google, que sí funciona.
 *   · **Un 5xx sí es pasajero**, y ahí reintentar es la respuesta correcta.
 *
 * Y una que importa tanto como las otras dos: **no se guarda nada** si el correo
 * no sale. Si se guardara, el siguiente intento chocaría con «espera un minuto»
 * por un código que nunca llegó.
 */
describe('cuando el correo no sale', () => {
  /** Una API cuyo correo siempre falla, con el código que se le diga. */
  const conCorreoQueFalla = (estado: number, motivo: string) =>
    montarLaApi(base.bd, {
      correo: {
        mandar() {
          return Promise.reject(new CorreoNoSale(estado, motivo));
        },
      },
      identidadDeGoogle: identidadDeMentira(),
    });

  const pedirCon = async (apiRota: ApiDePrueba, para: string) =>
    apiRota.ejecutarDesde(otraDireccion(), null, 'pedir_codigo_de_registro', {
      nombre: 'Marta',
      negocio: 'Taberna',
      correo: para,
      contrasena: 'una frase que me sé',
      aceptaCondiciones: true,
    });

  it('el dominio sin verificar no manda a reintentar: ofrece Google', async () => {
    // Es el caso de verdad: Resend contesta 403 «The estook.com domain is not
    // verified». Dentro de un minuto contestará lo mismo, así que «inténtalo en
    // un minuto» es mandar a perder el tiempo.
    const rota = conCorreoQueFalla(403, 'The estook.com domain is not verified');
    expect(elFallo(await pedirCon(rota, 'sin-verificar@correo-de-prueba.com'))).toBe(
      'todavia_no_disponible',
    );
  });

  it('la clave mala, igual: es configuracion, no una caida', async () => {
    const rota = conCorreoQueFalla(401, 'API key is invalid');
    expect(elFallo(await pedirCon(rota, 'clave-mala@correo-de-prueba.com'))).toBe(
      'todavia_no_disponible',
    );
  });

  it('pero una caida de Resend si es pasajera, y ahi se reintenta', async () => {
    const rota = conCorreoQueFalla(503, 'Service Unavailable');
    expect(elFallo(await pedirCon(rota, 'caida@correo-de-prueba.com'))).toBe('fallo_nuestro');
  });

  it('en ninguno de los dos casos queda la cuenta a medias', async () => {
    // Lo importante de verdad: si el registro pendiente se quedara guardado, el
    // segundo intento chocaria con «espera un minuto» por un codigo que nunca
    // llego, y la persona no podria volver a intentarlo.
    const rota = conCorreoQueFalla(403, 'The estook.com domain is not verified');
    await pedirCon(rota, 'nada-a-medias@correo-de-prueba.com');

    const pendientes = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.registro_pendiente where correo = $1`,
      ['nada-a-medias@correo-de-prueba.com'],
    );
    expect(pendientes[0]?.cuantos).toBe(0);

    const personas = await comoDuena<{ cuantas: number }>(
      `select count(*)::int as cuantas from estook.persona where correo = $1`,
      ['nada-a-medias@correo-de-prueba.com'],
    );
    expect(personas[0]?.cuantas).toBe(0);
  });

  it('y el de verdad sigue funcionando, para que se note la diferencia', async () => {
    await pedir('sigue-bien@correo-de-prueba.com');
    expect(codigoPara('sigue-bien@correo-de-prueba.com')).toMatch(/^\d{6}$/);
  });
});
