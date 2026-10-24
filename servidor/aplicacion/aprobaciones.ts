import { derivarConSalDelLocal, esPinConForma } from '../dominio/secretos.ts';
import { FalloDeAplicacion, falloQueSeGuarda, type Contexto } from './contrato.ts';
import { enNombreDelSistema } from './pago.ts';

/**
 * **Lo aprueba un encargado, ahí mismo** (Anexo 3.4; Roles 1.12, «Aprobación»).
 *
 * Donde pone «lo pide; lo aprueba un jefe con su PIN», el jefe teclea su PIN **en el
 * mismo aparato**, sin que el camarero salga: la aprobación sirve para una cosa, una
 * vez, y caduca a los dos minutos. Queda quién lo pidió, quién lo aprobó, qué, por qué y
 * desde qué aparato. La base lo vuelve a mirar (0083, `lo_mandado_no_se_reescribe`).
 *
 * Solo desde Estook TPV: en la app cada uno está en su móvil y no hay a quién pasárselo.
 */
export type OperacionQueSeAprueba = 'quitar_de_cocina';

const PERMISO_QUE_APRUEBA = {
  quitar_de_cocina: 'accion.quitar_de_cocina',
} as const satisfies Record<OperacionQueSeAprueba, string>;

export async function aprobarConElPin(
  contexto: Contexto,
  que: {
    readonly operacion: OperacionQueSeAprueba;
    readonly sobre: string;
    readonly motivo: string;
    readonly pin: string;
  },
): Promise<string> {
  const pide = contexto.personaId;
  const terminalId = contexto.sesion?.aparato?.terminalId ?? null;
  if (pide === null || terminalId === null) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Lo aprueba un encargado con su PIN, en el aparato del local.',
    });
  }

  // El PIN de quien aprueba se mira **sin cambiar quién está dentro**: el camarero sigue
  // siendo el camarero, y lo que se quite queda a su nombre con la aprobación al lado.
  const aparatos = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ local_id: string; sal_del_pin: string }[]>`
      select t.local_id::text as local_id, l.sal_del_pin
        from estook.terminal t join estook.local l on l.id = t.local_id
       where t.id = ${terminalId}::uuid and t.retirado_en is null
    `,
  );
  const aparato = aparatos[0];
  if (aparato === undefined) throw new FalloDeAplicacion('aparato_retirado');

  const fallo = async () => {
    // **Se guarda aunque falle**, como al teclear el PIN para entrar (0068).
    await contexto.sql`select estook.anotar_intento_en_terminal(${terminalId}::uuid, false)`;
    return falloQueSeGuarda('pin_desconocido');
  };
  if (!esPinConForma(que.pin)) throw await fallo();
  const huella = await derivarConSalDelLocal(que.pin, aparato.sal_del_pin);
  const pines = await contexto.sql<
    { pin_id: string; persona_id: string; bloqueado_hasta: Date | null }[]
  >`select * from estook.pin_del_quiosco(${aparato.local_id}::uuid, ${huella})`;
  const elPin = pines[0];
  if (elPin === undefined) throw await fallo();
  if (elPin.bloqueado_hasta !== null && new Date(elPin.bloqueado_hasta) > contexto.ahora) {
    throw new FalloDeAplicacion('demasiados_intentos');
  }

  const niveles = await contexto.sql<{ nivel: string }[]>`
    select estook.nivel_de_permiso(
      ${elPin.persona_id}::uuid, ${aparato.local_id}::uuid, ${PERMISO_QUE_APRUEBA[que.operacion]}
    )::text as nivel
  `;
  if (elPin.persona_id === pide || niveles[0]?.nivel !== 'ver_y_editar') {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Ese PIN no es de un encargado: lo aprueba un jefe de sala o quien lleva el local.',
    });
  }
  await contexto.sql`select estook.anotar_intento_en_terminal(${terminalId}::uuid, true)`;
  await contexto.sql`select estook.anotar_intento_de_pin(${elPin.pin_id}::uuid, true)`;

  // La hora la pone la base: es la que mira la regla de los dos minutos.
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ id: string }[]>`
      insert into estook.aprobacion
        (local_id, terminal_id, operacion, sobre, pedida_por, aprobada_por, motivo)
      values (${aparato.local_id}::uuid, ${terminalId}::uuid, ${que.operacion}, ${que.sobre}::uuid,
              ${pide}::uuid, ${elPin.persona_id}::uuid, ${que.motivo})
      returning id::text as id
    `,
  );
  const aprobacionId = filas[0]?.id;
  if (aprobacionId === undefined) throw new FalloDeAplicacion('fallo_nuestro');
  return aprobacionId;
}

/** Una aprobación sirve una vez: se marca al usarla. */
export async function usarLaAprobacion(contexto: Contexto, aprobacionId: string): Promise<void> {
  await enNombreDelSistema(
    contexto,
    () => contexto.sql`
      update estook.aprobacion set usada_en = now()
       where id = ${aprobacionId}::uuid and usada_en is null
    `,
  );
}
