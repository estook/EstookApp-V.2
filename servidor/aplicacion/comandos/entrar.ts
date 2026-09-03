import { z } from 'zod';
import type { Destino as ADonde } from '@estook/dominio';
import { comprobar, esPinConForma, huellaDeToken, tokenNuevo } from '../../dominio/secretos.ts';
import { decidirDestino } from '../acceso.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Entrar (M4).
 *
 * «Formulario unico con correo y, debajo, contrasena **o** PIN» (Manifiesto 28).
 * Un solo comando para las dos vias, porque para quien entra es una sola cosa.
 *
 * ── Lo que sale de aqui ──────────────────────────────────────────────────────
 *
 * El token, y **a donde va**: las seis comprobaciones se hacen ya, en la misma
 * llamada. Asi la pantalla no tiene que encadenar «entra → pregunta a donde →
 * navega», que es donde se cuelan los parpadeos y las pantallas a medias.
 *
 * ── Las tres cosas que este fichero hace por seguridad y no se ven ───────────
 *
 * 1. **No dice si el correo existe.** Correo desconocido y contrasena mal dan
 *    exactamente el mismo error. Si no fuera asi, cualquiera podria averiguar
 *    quien trabaja donde probando direcciones, que en hosteleria, donde la gente
 *    cambia de sitio, es informacion que vale dinero.
 *
 * 2. **Tarda lo mismo acierte o falle.** Cuando el correo no existe se deriva
 *    igual contra una credencial de mentira. Sin eso, un correo desconocido
 *    contestaria en dos milisegundos y uno conocido en ciento cincuenta, y esa
 *    diferencia es toda la lista de clientes.
 *
 * 3. **Cuenta los intentos en la base de datos, no en memoria.** «Bloqueo a los
 *    cinco intentos» (Manifiesto 28). En memoria no serviria de nada: las Edge
 *    Functions arrancan y mueren, y cada arranque empezaria a contar de cero.
 *
 * ── Y el que si se ve ────────────────────────────────────────────────────────
 *
 * Entrar con el PIN de un local **entra en ese local**. El PIN es por local
 * (migracion 0018), asi que teclear el del Bar Puerto ya dice donde estas: una
 * pregunta menos para quien llega con prisa a un turno.
 */

/** Lo que dura una sesion sin volver a entrar. */
const DIAS_DE_SESION = 30;

/**
 * Una derivada de mentira, con la forma exacta de una de verdad.
 *
 * Se comprueba contra ella cuando el correo no existe, para tardar lo mismo. El
 * valor no importa —nunca acertara— pero la **forma** si: si no cuadrara con lo
 * que espera `comprobar`, saldria por el atajo y no se gastaria el tiempo, que
 * es justo lo que hay que gastar.
 */
const CREDENCIAL_DE_MENTIRA =
  'pbkdf2-sha256$210000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/**
 * Lo que la aplicacion cuenta del aparato desde el que se entra (M5).
 *
 * ── Por que esto hacia falta ─────────────────────────────────────────────────
 *
 * Hasta M5, `estook.dispositivo` existia desde M1 y **no la escribia nadie**: 0
 * filas, 0 sesiones con dispositivo. Por eso «Mis dispositivos» acababa
 * enseñando el local de cada sesion en vez del aparato, y salian veintitres
 * filas identicas diciendo «Bar Centro».
 *
 * Y tiene consecuencia de seguridad, que es lo que lo hace urgente: **el caso
 * para el que existe esa pantalla es reconocer una sesion que no es tuya**, y
 * con todas las filas iguales no se puede.
 *
 * Lo dice la regla critica de M4 en el Plan: «la sesion se ata al **aparato**, no
 * al login: entrar dos veces desde el mismo movil no son dos filas».
 *
 * ── Que se guarda, y que no ──────────────────────────────────────────────────
 *
 * La huella es un identificador **opaco** que se guarda en el navegador, y el
 * nombre es lo que la persona reconoce: «Chrome en Android». Nunca el modelo, ni
 * el numero de serie, ni nada que identifique el aparato fisico: lo dice el
 * comentario de la columna desde M1 y sigue en pie.
 *
 * Y es **opcional**. Quien llame a la API a pelo sin mandarlo entra igual, con
 * su sesion sin dispositivo. Exigirlo seria convertir un dato de comodidad en un
 * requisito de acceso.
 */
export const elAparato = z
  .object({
    /** Opaco, y lo pone el navegador. Ni se interpreta ni se cruza con nada. */
    huella: z.string().trim().min(8).max(128),
    nombre: z.string().trim().min(1).max(80),
    tipo: z.enum(['movil', 'tablet', 'quiosco', 'escritorio']),
  })
  .strict();

export const entradaEntrar = z
  .object({
    correo: z.string().trim().toLowerCase().email().max(320),
    /** Una de las dos, no las dos. */
    contrasena: z.string().min(1).max(512).optional(),
    pin: z.string().trim().optional(),
    aparato: elAparato.optional(),
  })
  .strict()
  .refine((e) => (e.contrasena === undefined) !== (e.pin === undefined), {
    message: 'Hace falta la contrasena o el PIN, y solo una de las dos.',
  });

export type EntradaEntrar = z.infer<typeof entradaEntrar>;

export interface SalidaEntrar {
  readonly token: string;
  readonly destino: ADonde;
  readonly organizacionId: string | null;
  readonly localId: string | null;
  readonly porque: string;
  /** Lo tiene activado: la sesion nace a medias hasta que escriba el codigo. */
  readonly faltaDobleFactor: boolean;
  /** Su organizacion lo exige y todavia no lo tiene. Entra, pero hay que montarlo. */
  readonly debeActivarDobleFactor: boolean;
  /** La puso otra persona: hay que cambiarla antes de tocar nada. */
  readonly debeCambiarClave: boolean;
  readonly organizaciones: readonly { readonly id: string; readonly nombre: string }[];
  readonly locales: readonly { readonly id: string; readonly nombre: string }[];
}

export const entrar = comando<EntradaEntrar, SalidaEntrar>({
  nombre: 'entrar',
  entrada: entradaEntrar,
  // La unica operacion de todo el catalogo que se puede llamar sin haber
  // entrado. Es, literalmente, la definicion de entrar.
  sinSesion: true,
  // Devuelve el token: no se recuerda. Ver `conSecreto` en el contrato.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const quien =
      entrada.pin === undefined
        ? await porContrasena(contexto, entrada.correo, entrada.contrasena ?? '')
        : await porPin(contexto, entrada.correo, entrada.pin);

    // ── La sesion ────────────────────────────────────────────────────────────

    const token = tokenNuevo();
    const huella = await huellaDeToken(token);

    // El destino se decide **antes** de abrir la sesion, con la identidad ya
    // puesta por la transaccion... que todavia no lo esta, porque `entrar` corre
    // sin sesion. Asi que se declara a mano, solo para esta transaccion.
    await contexto.sql`select set_config('estook.persona_id', ${quien.personaId}, true)`;

    const destino = await decidirDestino(contexto.sql, {
      organizacionId: null,
      localId: quien.localDelPin,
    });

    const exigeDoble = await exigeDobleFactor(
      contexto,
      destino.organizaciones.map((o) => o.id),
    );
    const tieneDoble = await tieneDobleFactorConfirmado(contexto, quien.personaId);

    // ── Las dos preguntas del segundo factor, que NO son la misma ────────────
    //
    //   ¿hay que pedir un codigo ahora?   → lo tiene activado, lo exija o no
    //   ¿hay que activarlo?               → la organizacion lo exige y no lo tiene
    //
    // Quien lo activa por su cuenta tiene que pasarlo aunque su organizacion no
    // lo exija; si no, activarlo seria decorativo. Y a quien tiene que activarlo
    // y aun no lo ha hecho **se le deja entrar**: no podria activarlo desde
    // fuera, asi que exigirselo antes de entrar le dejaria fuera para siempre.
    const faltaElCodigo = tieneDoble;
    const debeActivarlo = exigeDoble && !tieneDoble;

    // ── El aparato, antes de abrir la sesión ─────────────────────────────────
    //
    // Se resuelve primero porque la sesión cuelga de él. Y se resuelve con la
    // identidad ya declarada un poco más arriba, así que la política de
    // `dispositivo` —«los tuyos siempre»— aplica y no hace falta comprobar de
    // quién es.
    //
    // Si no viene aparato, la sesión nace sin dispositivo, como todas las de M4.
    // No se inventa uno: un dispositivo sin huella no se podría reconocer la
    // próxima vez y sería una fila nueva en cada entrada, que es exactamente el
    // problema que esto viene a arreglar.
    let dispositivoId: string | null = null;
    if (entrada.aparato !== undefined) {
      const aparatos = await contexto.sql<{ reconocer_dispositivo: string | null }[]>`
        select estook.reconocer_dispositivo(
          ${quien.personaId}::uuid,
          ${entrada.aparato.huella},
          ${entrada.aparato.nombre},
          ${entrada.aparato.tipo}::estook.tipo_de_dispositivo,
          ${quien.localDelPin}::uuid
        ) as reconocer_dispositivo
      `;
      dispositivoId = aparatos[0]?.reconocer_dispositivo ?? null;
    }

    const filas = await contexto.sql<{ abrir_sesion: string }[]>`
      select estook.abrir_sesion(
        ${quien.personaId}::uuid,
        ${huella},
        ${entrada.pin === undefined ? 'contrasena' : 'pin'},
        ${destino.organizacionId}::uuid,
        ${destino.localId}::uuid,
        ${!faltaElCodigo},
        ${DIAS_DE_SESION},
        ${dispositivoId}::uuid
      ) as abrir_sesion
    `;
    const sesionId = filas[0]?.abrir_sesion;
    if (sesionId === undefined) throw new FalloDeAplicacion('fallo_nuestro');

    if (destino.organizacionId !== null) {
      await contexto.sql`
        select estook.anotar(
          ${destino.organizacionId}::uuid, 'entrar', 'sesion', ${sesionId},
          ${destino.localId}::uuid, null,
          ${JSON.stringify({ con: entrada.pin === undefined ? 'contrasena' : 'pin' })}::jsonb,
          null
        )
      `;
    }

    return {
      token,
      destino: destino.destino,
      organizacionId: destino.organizacionId,
      localId: destino.localId,
      porque: destino.porque,
      faltaDobleFactor: faltaElCodigo,
      debeActivarDobleFactor: debeActivarlo,
      debeCambiarClave: quien.debeCambiarClave,
      organizaciones: destino.organizaciones.map((o) => ({ id: o.id, nombre: o.nombre })),
      locales: destino.locales.map((l) => ({ id: l.id, nombre: l.nombre })),
    };
  },
});

interface QuienEntra {
  readonly personaId: string;
  readonly debeCambiarClave: boolean;
  /** Si entro con PIN, el local de ese PIN. Ya dice donde esta. */
  readonly localDelPin: string | null;
}

async function porContrasena(
  contexto: Contexto,
  correo: string,
  contrasena: string,
): Promise<QuienEntra> {
  const filas = await contexto.sql<
    {
      persona_id: string;
      derivada: string;
      bloqueada_hasta: Date | null;
      debe_cambiarla: boolean;
      persona_activa: boolean;
    }[]
  >`select * from estook.credencial_para_entrar(${correo})`;

  const fila = filas[0];

  // El correo no existe. Se deriva igual, para tardar lo mismo, y se contesta lo
  // mismo. Quien pregunta no puede saber cual de las dos cosas ha pasado.
  if (!fila) {
    await comprobar(contrasena, CREDENCIAL_DE_MENTIRA);
    throw new FalloDeAplicacion('no_cuadra');
  }

  if (fila.bloqueada_hasta !== null && fila.bloqueada_hasta > contexto.ahora) {
    throw new FalloDeAplicacion('demasiados_intentos');
  }

  const acierta = await comprobar(contrasena, fila.derivada);
  await contexto.sql`select estook.anotar_intento_de_contrasena(${fila.persona_id}::uuid, ${acierta})`;

  // Ojo con el orden: el intento se anota **antes** de mirar si la persona esta
  // activa. Si no, a quien esta de baja se le podrian probar contrasenas sin
  // gastar intentos.
  if (!acierta) throw new FalloDeAplicacion('no_cuadra');
  if (!fila.persona_activa) throw new FalloDeAplicacion('no_cuadra');

  return { personaId: fila.persona_id, debeCambiarClave: fila.debe_cambiarla, localDelPin: null };
}

async function porPin(contexto: Contexto, correo: string, pin: string): Promise<QuienEntra> {
  if (!esPinConForma(pin)) throw new FalloDeAplicacion('no_cuadra');

  const filas = await contexto.sql<
    {
      pin_id: string;
      persona_id: string;
      local_id: string;
      sal_del_local: string;
      huella: string;
      bloqueado_hasta: Date | null;
      persona_activa: boolean;
    }[]
  >`select * from estook.pines_para_entrar(${correo})`;

  if (filas.length === 0) {
    await comprobar(pin, CREDENCIAL_DE_MENTIRA);
    throw new FalloDeAplicacion('no_cuadra');
  }

  // Se recorren **todos** los locales, sin parar al primero que acierte, por lo
  // mismo de siempre: parar antes diria, por lo que tarda, en cual acerto.
  let acertado: (typeof filas)[number] | null = null;
  let bloqueadoEnAlguno = false;

  for (const fila of filas) {
    const acierta = await comprobar(pin, fila.huella);
    const bloqueado = fila.bloqueado_hasta !== null && fila.bloqueado_hasta > contexto.ahora;

    if (acierta && bloqueado) bloqueadoEnAlguno = true;
    if (acierta && !bloqueado && acertado === null && fila.persona_activa) acertado = fila;
    if (!acierta) {
      await contexto.sql`select estook.anotar_intento_de_pin(${fila.pin_id}::uuid, false)`;
    }
  }

  if (acertado === null) {
    if (bloqueadoEnAlguno) throw new FalloDeAplicacion('demasiados_intentos');
    throw new FalloDeAplicacion('no_cuadra');
  }

  await contexto.sql`select estook.anotar_intento_de_pin(${acertado.pin_id}::uuid, true)`;

  // El PIN no obliga a cambiar contrasena: quien entra con PIN puede no tener
  // ninguna todavia, que es el caso de la invitacion recien aceptada.
  return {
    personaId: acertado.persona_id,
    debeCambiarClave: false,
    localDelPin: acertado.local_id,
  };
}

async function exigeDobleFactor(contexto: Contexto, organizaciones: string[]): Promise<boolean> {
  if (organizaciones.length === 0) return false;

  // Si **alguna** de sus organizaciones lo exige, se exige. Con dos empresas y
  // una estricta, no puede entrar por la puerta floja y saltar luego a la otra.
  const filas = await contexto.sql<{ exige: boolean }[]>`
    select bool_or(o.exige_doble_factor) as exige
      from estook.organizacion o
     where o.id = any(${organizaciones}::uuid[])
  `;
  return filas[0]?.exige === true;
}

async function tieneDobleFactorConfirmado(contexto: Contexto, personaId: string): Promise<boolean> {
  const filas = await contexto.sql<{ hay: boolean }[]>`
    select true as hay
      from estook.doble_factor
     where persona_id = ${personaId} and confirmado_en is not null
  `;
  return filas.length > 0;
}
