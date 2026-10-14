import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { almacenEnMemoria } from '../../servidor/infraestructura/almacen.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La experiencia (0083), lo que toca la base: la foto de cada persona y la primera
 * contraseña de quien entró con su PIN. Llamando a la API a pelo, porque es lo que
 * la pantalla no puede garantizar (regla 4):
 *
 *   · que **cada uno pone la suya** y quien da accesos la de su equipo, y nadie más,
 *     y que eso lo deciden las políticas de `estook.persona`, no un botón;
 *   · que **la foto vieja se borra** al cambiarla o quitarla;
 *   · que la cara **sale firmada** donde se enseñan personas;
 *   · y que **poner la primera contraseña pide el PIN**: era la única puerta de la
 *     cuenta que no pedía nada a quien cogiera un móvil con la sesión abierta.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const almacen = almacenEnMemoria();
let rosa: string;
let marcos: string;
let sara: string;
let idDe: Record<'rosa' | 'marcos' | 'sara', string>;

const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([20, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  Buffer.from([1, 2, 3, 4]),
]).toString('base64');

const carasDe = (personaId: string) =>
  almacen.claves().filter((clave) => clave.includes(`/personas/${personaId}/`));

async function suId(token: string): Promise<string> {
  return losDatos<{ personaId: string }>(await api.consultar(token, 'quien_soy')).personaId;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { almacen });
  rosa = await api.entrar('rosa@ejemplo.estook.com');
  marcos = await api.entrar('marcos@ejemplo.estook.com');
  sara = await api.entrar('sara@ejemplo.estook.com');
  idDe = { rosa: await suId(rosa), marcos: await suId(marcos), sara: await suId(sara) };
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('la foto de cada persona (0083)', () => {
  it('cada uno pone la suya, sin ningún permiso, y le sale en quién soy', async () => {
    losDatos(
      await api.ejecutar(marcos, 'poner_foto_de_persona', {
        persona_id: idDe.marcos,
        tipo: 'image/webp',
        foto: WEBP,
      }),
    );
    expect(carasDe(idDe.marcos)).toHaveLength(1);
    expect(carasDe(idDe.marcos)[0]).toMatch(/^fotos-de-producto\/personas\/.+\/cara-\d+\.webp$/);

    const yo = losDatos<{ foto: string | null }>(await api.consultar(marcos, 'quien_soy'));
    expect(yo.foto).toMatch(/^data:image\/webp;base64,/);
  });

  it('la ve su equipo: en Personas, en su ficha y en quién está trabajando', async () => {
    const yo = losDatos<{ local: { id: string } }>(await api.consultar(rosa, 'quien_soy'));
    const accesos = losDatos<{ personaId: string; foto: string | null }[]>(
      await api.consultar(rosa, 'quien_tiene_acceso', { local_id: yo.local.id }),
    );
    expect(accesos.find((a) => a.personaId === idDe.marcos)?.foto).toMatch(/^data:image/);
    expect(accesos.find((a) => a.personaId === idDe.sara)?.foto).toBeNull();

    const ficha = losDatos<{ foto: string | null; puedeCambiarLaFoto: boolean }>(
      await api.consultar(rosa, 'una_persona', { persona_id: idDe.marcos }),
    );
    expect(ficha.foto).toMatch(/^data:image/);
    expect(ficha.puedeCambiarLaFoto).toBe(true);

    const hoy = losDatos<{ gente: { personaId: string; foto: string | null }[] }>(
      await api.consultar(rosa, 'fichajes_de_hoy'),
    );
    expect(hoy.gente.find((g) => g.personaId === idDe.marcos)?.foto).toMatch(/^data:image/);
  });

  it('quien da accesos pone la de su equipo, y al cambiarla la vieja se borra', async () => {
    const poner = () =>
      api.ejecutar(rosa, 'poner_foto_de_persona', {
        persona_id: idDe.sara,
        tipo: 'image/webp',
        foto: WEBP,
      });
    losDatos(await poner());
    const primera = carasDe(idDe.sara);
    await new Promise((listo) => setTimeout(listo, 5));
    losDatos(await poner());
    const segunda = carasDe(idDe.sara);
    expect(segunda).toHaveLength(1);
    expect(segunda[0]).not.toBe(primera[0]);
  });

  it('un compañero no le cambia la cara a otro: decide la base, no el botón', async () => {
    const intento = await api.ejecutar(marcos, 'poner_foto_de_persona', {
      persona_id: idDe.sara,
      tipo: 'image/webp',
      foto: WEBP,
    });
    expect(elFallo(intento)).toBe('no_existe');
    // Y lo que se hubiera guardado de camino no se queda en el almacén.
    expect(carasDe(idDe.sara)).toHaveLength(1);

    const ficha = losDatos<{ puedeCambiarLaFoto: boolean }>(
      await api.consultar(rosa, 'una_persona', { persona_id: idDe.rosa }),
    );
    expect(ficha.puedeCambiarLaFoto).toBe(true);
  });

  it('lo que no es una foto no entra, aunque diga que lo es', async () => {
    const intento = await api.ejecutar(marcos, 'poner_foto_de_persona', {
      persona_id: idDe.marcos,
      tipo: 'image/webp',
      foto: Buffer.from('<svg onload="alert(1)">').toString('base64'),
    });
    expect(elFallo(intento)).toBe('faltan_datos');
  });

  it('al quitarla no queda nada, y vuelven las iniciales', async () => {
    const quitada = losDatos<{ quitada: boolean }>(
      await api.ejecutar(marcos, 'quitar_foto_de_persona', { persona_id: idDe.marcos }),
    );
    expect(quitada.quitada).toBe(true);
    expect(carasDe(idDe.marcos)).toEqual([]);
    const yo = losDatos<{ foto: string | null }>(await api.consultar(marcos, 'quien_soy'));
    expect(yo.foto).toBeNull();
  });
});

describe('la primera contraseña de quien entró con su PIN (0083)', () => {
  const correo = 'sara@ejemplo.estook.com';
  let conPin: string;

  beforeAll(async () => {
    // Sara se queda sin contraseña, como quien acaba de aceptar su invitación.
    await base.bd.query(
      `delete from estook.credencial
        where persona_id = (select id from estook.persona where correo = $1)`,
      [correo],
    );
    const entrada = losDatos<{ token: string }>(
      await api.ejecutar(null, 'entrar', { correo, pin: base.pinDe(correo, 'bar-centro') }),
    );
    conPin = entrada.token;
  });

  it('sin el PIN no la deja poner', async () => {
    const intento = await api.ejecutar(conPin, 'cambiar_mi_clave', {
      nueva: 'una frase larga de verdad',
    });
    expect(elFallo(intento)).toBe('faltan_datos');
  });

  it('con un PIN que no es el suyo tampoco, y el intento se cuenta', async () => {
    const bueno = base.pinDe(correo, 'bar-centro');
    const malo = bueno === '000000' ? '111111' : '000000';
    const intento = await api.ejecutar(conPin, 'cambiar_mi_clave', {
      pin: malo,
      nueva: 'una frase larga de verdad',
    });
    expect(elFallo(intento)).toBe('faltan_datos');
    const fallos = await base.bd.query<{ intentos_fallidos: number }>(
      `select n.intentos_fallidos from estook.pin n
         join estook.persona p on p.id = n.persona_id
        where p.correo = $1`,
      [correo],
    );
    expect(fallos.rows[0]?.intentos_fallidos).toBeGreaterThan(0);
  });

  it('con su PIN, sí: y desde entonces entra con ella', async () => {
    losDatos(
      await api.ejecutar(conPin, 'cambiar_mi_clave', {
        pin: base.pinDe(correo, 'bar-centro'),
        nueva: 'una frase larga de verdad',
      }),
    );
    const entrada = await api.ejecutar(null, 'entrar', {
      correo,
      contrasena: 'una frase larga de verdad',
    });
    expect(entrada.estado).toBe('ok');
  });
});
