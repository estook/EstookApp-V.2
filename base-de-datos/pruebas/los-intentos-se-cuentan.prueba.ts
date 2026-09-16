import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
  SECRETO_DEL_ADMIN_DE_EJEMPLO,
} from '../semillas/claves-de-ejemplo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Los intentos fallidos se cuentan de verdad (0039, repaso de la 0042).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * El bloqueo a los cinco intentos no bloqueó nunca, desde M4
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `entrar` apuntaba el intento que no cuadraba y después fallaba. El fallo
 * deshacía la transacción, y con ella el apunte: seis contraseñas mal seguidas
 * dejaban el contador a cero, y la séptima, la buena, entraba. Lo mismo con el PIN
 * y con la entrada del admin. Se vio abriendo el registro, al preguntarse dónde se
 * guardaban los intentos del código del correo.
 *
 * Y **no había ninguna prueba del bloqueo**: estaba escrito en el Manifiesto, en la
 * migración y en el comando, y nadie lo había visto bloquear. Estas lo ven. Y el
 * segundo factor, que no tenía límite ninguno, también.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ahora = () => new Date(Date.now());

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('el bloqueo a los cinco intentos', () => {
  it('con la contraseña: cinco mal, y la buena ya no entra', async () => {
    const correo = 'marcos@ejemplo.estook.com';
    for (let i = 0; i < 5; i++) {
      expect(
        elFallo(await api.ejecutar(null, 'entrar', { correo, contrasena: 'no es esta' })),
      ).toBe('no_cuadra');
    }
    const buena = await api.ejecutar(null, 'entrar', { correo, contrasena: CLAVE_DE_EJEMPLO });
    expect(elFallo(buena)).toBe('demasiados_intentos');
  });

  it('con el PIN: cinco mal en su local, y el bueno ya no entra', async () => {
    const correo = 'sara@ejemplo.estook.com';
    const bueno = base.pinDe(correo, 'bar-centro');
    const malo = bueno === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await api.ejecutar(null, 'entrar', { correo, pin: malo });
    }
    expect(elFallo(await api.ejecutar(null, 'entrar', { correo, pin: bueno }))).toBe(
      'demasiados_intentos',
    );
  });

  it('en la puerta del admin, igual', async () => {
    for (let i = 0; i < 5; i++) {
      await api.ejecutar(null, 'entrar_en_admin', { correo: ADMIN_DE_EJEMPLO, contrasena: 'no' });
    }
    expect(
      elFallo(
        await api.ejecutar(null, 'entrar_en_admin', {
          correo: ADMIN_DE_EJEMPLO,
          contrasena: CLAVE_DE_EJEMPLO,
        }),
      ),
    ).toBe('demasiados_intentos');
  });

  it('y un fallo que no conserva nada sigue deshaciéndolo todo', async () => {
    // El arreglo no puede convertir todos los fallos en «se guarda lo hecho»: una
    // merma a medias que falla no puede quedarse a medias. Una contraseña corta al
    // cambiarla no deja nada escrito.
    const token = await api.entrar('rosa@ejemplo.estook.com');
    const corta = await api.ejecutar(token, 'cambiar_mi_clave', {
      actual: CLAVE_DE_EJEMPLO,
      nueva: 'corta',
    });
    expect(elFallo(corta)).toBe('faltan_datos');
    // Sigue entrando con la de siempre.
    await api.entrar('rosa@ejemplo.estook.com');
  });
});

describe('el segundo factor, que no tenía límite', () => {
  // Una persona suya, con el segundo factor montado con el secreto conocido: las
  // pruebas de arriba bloquean la contraseña de otras, y aquí se prueba otra cosa.
  const CON_SEGUNDO_FACTOR = 'luis@ejemplo.estook.com';

  beforeAll(async () => {
    await base.bd.query(
      `insert into estook.doble_factor (persona_id, secreto, confirmado_en)
       select id, $2, now() from estook.persona where correo = $1`,
      [CON_SEGUNDO_FACTOR, SECRETO_DEL_ADMIN_DE_EJEMPLO],
    );
  });

  it('cinco códigos mal lo paran, y el bueno ya no pasa', async () => {
    const sesiones: string[] = [];
    for (let i = 0; i < 6; i++) sesiones.push(await api.entrar(CON_SEGUNDO_FACTOR));

    for (let i = 0; i < 5; i++) {
      expect(
        elFallo(
          await api.ejecutar(sesiones[i] ?? '', 'superar_doble_factor', { codigo: '000000' }),
        ),
      ).toBe('codigo_incorrecto');
    }

    const bueno = await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora());
    expect(
      elFallo(await api.ejecutar(sesiones[5] ?? '', 'superar_doble_factor', { codigo: bueno })),
    ).toBe('demasiados_intentos');
  });

  it('y quien acierta antes del quinto vuelve a empezar de cero', async () => {
    const correo = CON_SEGUNDO_FACTOR;
    // Se quita el bloqueo de la prueba de arriba, como pasarían los quince minutos.
    await base.bd.query(
      `update estook.doble_factor set intentos_fallidos = 0, bloqueado_hasta = null
        where persona_id = (select id from estook.persona where correo = $1)`,
      [correo],
    );

    const primera = await api.entrar(correo);
    for (let i = 0; i < 4; i++) {
      await api.ejecutar(primera, 'superar_doble_factor', { codigo: '000000' });
    }
    losDatos(
      await api.ejecutar(primera, 'superar_doble_factor', {
        codigo: await codigoEn(SECRETO_DEL_ADMIN_DE_EJEMPLO, ahora()),
      }),
    );

    const { rows } = await base.bd.query<{ intentos_fallidos: number }>(
      `select intentos_fallidos from estook.doble_factor
        where persona_id = (select id from estook.persona where correo = $1)`,
      [correo],
    );
    expect(rows[0]?.intentos_fallidos).toBe(0);
  });
});
