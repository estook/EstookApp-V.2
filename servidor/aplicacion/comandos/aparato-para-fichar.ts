import { z } from 'zod';
import {
  avisoDeFichajeSinApuntar,
  comoSeLeeElDia,
  comoSeLlamaElDia,
  dejaEscribir,
  diaDeLaSemana,
  diasEntre,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  horaEnElLocal,
  fechaEnElLocal,
  laHoraDeLoHecho,
  type PorQueNoSeApunto,
  type TipoDeTurno,
} from '@estook/dominio';
import {
  derivarConSalDelLocal,
  descifrarElPin,
  esPinConForma,
  huellaDeToken,
  llavesDelAparato,
  tokenNuevo,
} from '../../dominio/secretos.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import {
  comando,
  consulta,
  FalloDeAplicacion,
  falloQueSeGuarda,
  type Contexto,
} from '../contrato.ts';
import { avisar, quienesPuedenRecibir } from '../avisos.ts';
import { comoEstaAhora, enNombreDelSistema, laSuscripcionDe } from '../pago.ts';
import { abrirElTurno, acabarLaPausa, cerrarElTurno, empezarLaPausa } from './fichar.ts';

/**
 * El aparato del local para fichar (H1 · decisión 0068).
 *
 * Una tablet o el ordenador del local, que se queda en una pantalla con un teclado.
 * Cada uno teclea **su PIN** y ficha: entrar, pausa, volver, salir. Es lo que deja
 * fichar a quien no tiene correo, que no puede entrar desde un móvil suyo (0057).
 *
 * ── Dos mitades ─────────────────────────────────────────────────────────────
 *
 *   PONERLO   Quien lleva el local, **desde el propio aparato** y con su sesión,
 *             lo convierte en aparato para fichar. Recibe una llave que se queda
 *             guardada en ese aparato; del lado de Estook solo queda su huella.
 *   USARLO    Sin sesión de nadie: la llave dice de qué local es, y el PIN, quién
 *             teclea. Solo sirve para fichar: no abre la app ni enseña nada más.
 *
 * ── Contra quien prueba PIN al azar ────────────────────────────────────────
 *
 * Un PIN que no es de nadie no tiene fila en la que contar los fallos, así que se
 * cuentan **en el aparato**: diez seguidos, y cinco minutos parado (la función con
 * privilegio de la 0052). Y el de alguien que sí existe sigue contando en su PIN,
 * como al entrar: cinco, y quince minutos.
 */

// ── Ponerlo y quitarlo, desde Ajustes ────────────────────────────────────────

export const entradaPonerAparato = z.object({ nombre: z.string().trim().min(1).max(60) }).strict();

export type EntradaPonerAparato = z.infer<typeof entradaPonerAparato>;

export interface SalidaPonerAparato {
  readonly terminalId: string;
  readonly nombre: string;
  /** **Una sola vez**, en claro: se guarda en el aparato y no se puede volver a pedir. */
  readonly llave: string;
}

export const ponerAparatoParaFichar = comando<EntradaPonerAparato, SalidaPonerAparato>({
  nombre: 'poner_aparato_para_fichar',
  entrada: entradaPonerAparato,
  exige: 'app.ajustes',
  // Devuelve la llave: no se recuerda (`conSecreto`, en el contrato).
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const llave = tokenNuevo();
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.terminal (local_id, nombre, huella, creado_por)
      values (${localId}, ${entrada.nombre}, ${await huellaDeToken(llave)}, ${contexto.personaId})
      returning id::text as id
    `;
    const terminalId = filas[0]?.id;
    if (terminalId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'crear', 'terminal', ${terminalId}, ${localId}::uuid,
        null, ${JSON.stringify({ nombre: entrada.nombre, funcion: 'fichar' })}::text::jsonb, null
      )
    `;
    return { terminalId, nombre: entrada.nombre, llave };
  },
});

export const entradaQuitarAparato = z.object({ terminal_id: z.string().uuid() }).strict();
export type EntradaQuitarAparato = z.infer<typeof entradaQuitarAparato>;

/** Quitarlo **deja de valer al momento**, esté donde esté: la llave ya no abre nada. */
export const quitarAparatoParaFichar = comando<EntradaQuitarAparato, { terminalId: string }>({
  nombre: 'quitar_aparato_para_fichar',
  entrada: entradaQuitarAparato,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const filas = await contexto.sql<{ id: string }[]>`
      update estook.terminal
         set retirado_en = ${contexto.ahora.toISOString()}, retirado_por = ${contexto.personaId}
       where id = ${entrada.terminal_id} and local_id = ${localId} and retirado_en is null
      returning id::text as id
    `;
    if (filas.length === 0) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese aparato ya no estaba puesto para fichar.',
      });
    }
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'retirar', 'terminal', ${entrada.terminal_id},
        ${localId}::uuid, null, null, null
      )
    `;
    return { terminalId: entrada.terminal_id };
  },
});

export interface AparatoParaFichar {
  readonly terminalId: string;
  readonly nombre: string;
  readonly puestoEn: string;
  readonly puestoPor: string | null;
  readonly ultimoUsoEn: string | null;
}

export const aparatosParaFichar = consulta<Record<string, never>, readonly AparatoParaFichar[]>({
  nombre: 'aparatos_para_fichar',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const filas = await contexto.sql<
      {
        id: string;
        nombre: string;
        creado_en: string;
        quien: string | null;
        ultimo: string | null;
      }[]
    >`
      select t.id::text as id, t.nombre,
             to_char(t.creado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creado_en,
             p.nombre as quien,
             to_char(t.ultimo_uso_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ultimo
        from estook.terminal t
        left join estook.persona p on p.id = t.creado_por
       where t.local_id = ${localId} and t.retirado_en is null and t.funcion = 'fichar'
       order by t.creado_en
    `;
    return filas.map((f) => ({
      terminalId: f.id,
      nombre: f.nombre,
      puestoEn: f.creado_en,
      puestoPor: f.quien,
      ultimoUsoEn: f.ultimo,
    }));
  },
});

// ── Usarlo, sin sesión de nadie ──────────────────────────────────────────────

/** La llave del aparato: 43 caracteres de azar, como un token de sesión. */
const llave = z.string().trim().min(20).max(200);

interface ElAparato {
  readonly terminalId: string;
  readonly localId: string;
  readonly organizacionId: string;
  readonly nombre: string;
  readonly salDelPin: string;
  readonly nombreDelLocal: string;
  readonly pausasEnUso: boolean;
}

async function elAparato(contexto: Contexto, laLlave: string): Promise<ElAparato> {
  const filas = await contexto.sql<
    {
      terminal_id: string;
      local_id: string;
      organizacion_id: string;
      nombre: string;
      sal_del_pin: string;
      parado_hasta: Date | null;
      nombre_del_local: string;
      pausas_en_uso: boolean;
    }[]
  >`select * from estook.terminal_por_llave(${await huellaDeToken(laLlave)})`;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('aparato_retirado');
  if (fila.parado_hasta !== null && fila.parado_hasta > contexto.ahora) {
    throw new FalloDeAplicacion('aparato_parado');
  }
  return {
    terminalId: fila.terminal_id,
    localId: fila.local_id,
    organizacionId: fila.organizacion_id,
    nombre: fila.nombre,
    salDelPin: fila.sal_del_pin,
    nombreDelLocal: fila.nombre_del_local,
    pausasEnUso: fila.pausas_en_uso,
  };
}

/**
 * Quién es el PIN, en este local. **Con la identidad puesta desde aquí**: lo que se
 * hace después pasa la seguridad de las filas como esa persona, igual que si
 * hubiera fichado desde su móvil. Nadie ficha por otro.
 */
async function quienEsElPin(contexto: Contexto, aparato: ElAparato, pin: string): Promise<string> {
  if (!esPinConForma(pin)) {
    await contexto.sql`select estook.anotar_intento_en_terminal(${aparato.terminalId}::uuid, false)`;
    throw falloQueSeGuarda('pin_desconocido');
  }
  const huella = await derivarConSalDelLocal(pin, aparato.salDelPin);
  const filas = await contexto.sql<
    { pin_id: string; persona_id: string; bloqueado_hasta: Date | null }[]
  >`select * from estook.pin_del_quiosco(${aparato.localId}::uuid, ${huella})`;
  const fila = filas[0];

  if (fila === undefined) {
    // **Se guarda aunque falle**: si el fallo deshiciera el apunte, el aparato no se
    // pararía nunca (lo mismo que pasó al entrar, repaso de la 0042).
    await contexto.sql`select estook.anotar_intento_en_terminal(${aparato.terminalId}::uuid, false)`;
    throw falloQueSeGuarda('pin_desconocido');
  }
  if (fila.bloqueado_hasta !== null && fila.bloqueado_hasta > contexto.ahora) {
    throw new FalloDeAplicacion('demasiados_intentos');
  }

  await contexto.sql`select estook.anotar_intento_en_terminal(${aparato.terminalId}::uuid, true)`;
  await contexto.sql`select estook.anotar_intento_de_pin(${fila.pin_id}::uuid, true)`;
  await contexto.sql`select set_config('estook.persona_id', ${fila.persona_id}, true)`;
  return fila.persona_id;
}

/**
 * Lo que deja hacer la cuenta: en solo lectura o sin pagar no se apunta nada, igual
 * que desde la app. Aquí no hay sesión, así que la quinta puerta se mira a mano.
 */
async function laCuentaDejaFichar(contexto: Contexto, aparato: ElAparato): Promise<void> {
  const suscripcion = await laSuscripcionDe(contexto, aparato.organizacionId);
  if (suscripcion === null) return;
  const { como } = comoEstaAhora(suscripcion, contexto.ahora);
  if (!dejaEscribir(como)) throw new FalloDeAplicacion('cuenta_en_solo_lectura');
}

async function puedeFicharAqui(contexto: Contexto, localId: string): Promise<void> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_editar('accion.fichar', ${localId}::uuid) as puede
  `;
  if (filas[0]?.puede !== true) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Tu puesto no ficha en este local. Si crees que sí, díselo a quien lo lleva.',
    });
  }
}

export interface ElAparatoPorDentro {
  readonly nombre: string;
  readonly local: string;
  readonly pausasEnUso: boolean;
  /**
   * Con la que cifra el PIN tecleado sin conexión (0070). Nula hasta que se prepara
   * (`preparar_el_aparato_sin_conexion`), que lo hace el propio aparato al encenderse.
   */
  readonly clavePublica: string | null;
}

/** La pública de un aparato, si ya la tiene. La lee el sistema: no hay sesión. */
async function suClavePublica(contexto: Contexto, terminalId: string): Promise<string | null> {
  return enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<{ clave_publica: string | null }[]>`
      select clave_publica from estook.terminal where id = ${terminalId}
    `;
    return filas[0]?.clave_publica ?? null;
  });
}

/** Lo que enseña el aparato arriba: su nombre y su local. Si ya no vale, lo dice. */
export const elAparatoParaFichar = consulta<{ llave: string }, ElAparatoPorDentro>({
  nombre: 'el_aparato_para_fichar',
  entrada: z.object({ llave }).strict(),
  sinSesion: true,

  async ejecutar(contexto, entrada) {
    // El nombre del local lo dice la llave misma: no hay sesión con la que leerlo.
    const aparato = await elAparato(contexto, entrada.llave);
    return {
      nombre: aparato.nombre,
      local: aparato.nombreDelLocal,
      pausasEnUso: aparato.pausasEnUso,
      clavePublica: await suClavePublica(contexto, aparato.terminalId),
    };
  },
});

/**
 * **Prepararlo para cuando se caiga el wifi** (0070): la primera vez, Estook le hace
 * su llave de cifrado y le da la pública. La privada se queda en Estook, donde solo la
 * lee el sistema. Lo pide el propio aparato al encenderse, si todavía no la tiene.
 */
export const prepararElAparatoSinConexion = comando<{ llave: string }, { clavePublica: string }>({
  nombre: 'preparar_el_aparato_sin_conexion',
  entrada: z.object({ llave }).strict(),
  sinSesion: true,
  // Repetirlo devuelve la misma pública: no hace falta recordar nada.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const aparato = await elAparato(contexto, entrada.llave);
    const ya = await suClavePublica(contexto, aparato.terminalId);
    if (ya !== null) return { clavePublica: ya };

    const { publica, privada } = await llavesDelAparato();
    return enNombreDelSistema(contexto, async () => {
      // Dos a la vez: se queda la primera, y la segunda devuelve esa.
      const puestas = await contexto.sql<{ id: string }[]>`
        update estook.terminal set clave_publica = ${publica}
         where id = ${aparato.terminalId} and clave_publica is null
        returning id::text as id
      `;
      if (puestas.length === 0) {
        return { clavePublica: (await suClavePublica(contexto, aparato.terminalId)) ?? publica };
      }
      await contexto.sql`
        insert into estook.clave_del_terminal (terminal_id, privada)
        values (${aparato.terminalId}, ${privada})
      `;
      return { clavePublica: publica };
    });
  },
});

export type EstadoEnElAparato = 'fuera' | 'dentro' | 'en_pausa';

export interface QuienFichaAqui {
  readonly nombre: string;
  readonly estado: EstadoEnElAparato;
  /** Desde cuándo está dentro o en la pausa. */
  readonly desde: string | null;
  /** Lo que lleva hoy, sin las pausas si no cuentan. */
  readonly minutosDeHoy: number;
  readonly pausasEnUso: boolean;
  /**
   * Lo suyo de los próximos siete días, del horario publicado (H2 · 0069). Quien no
   * tiene correo no ve la app: su horario lo ve aquí, al teclear su PIN.
   */
  readonly proximos: readonly { readonly cuando: string; readonly que: string }[];
}

/** Lo suyo publicado de hoy a seis días vista, día a día. */
async function susProximosDias(
  contexto: Contexto,
  personaId: string,
  localId: string,
  hoy: string,
): Promise<QuienFichaAqui['proximos']> {
  const filas = await contexto.sql<
    {
      dia: string;
      tipo: TipoDeTurno;
      entra: string | null;
      sale: string | null;
      descanso: number;
    }[]
  >`
    select to_char(tp.dia, 'YYYY-MM-DD') as dia, tp.tipo::text as tipo,
           to_char(tp.entra, 'HH24:MI') as entra, to_char(tp.sale, 'HH24:MI') as sale,
           tp.descanso_minutos as descanso
      from estook.turno_publicado tp
     where tp.persona_id = ${personaId} and tp.local_id = ${localId}
       and tp.dia between ${hoy}::date and ${hoy}::date + 6
     order by tp.dia, tp.entra nulls first
  `;
  const dias = [...new Set(filas.map((f) => f.dia))];
  return dias.map((dia) => {
    const faltan = diasEntre(fechaOperativa(hoy), fechaOperativa(dia));
    const nombre = comoSeLlamaElDia(diaDeLaSemana(fechaOperativa(dia)));
    return {
      cuando:
        faltan === 0
          ? 'Hoy'
          : faltan === 1
            ? 'Mañana'
            : `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${String(Number(dia.slice(8)))}`,
      que: comoSeLeeElDia(
        filas
          .filter((f) => f.dia === dia)
          .map((f) => ({
            personaId,
            dia: f.dia,
            tipo: f.tipo,
            entra: f.entra,
            sale: f.sale,
            descansoMinutos: f.descanso,
          })),
      ),
    };
  });
}

export const entradaQuienFichaAqui = z
  .object({ llave, pin: z.string().trim().min(1).max(12) })
  .strict();

async function comoEsta(
  contexto: Contexto,
  personaId: string,
  localId: string,
): Promise<QuienFichaAqui> {
  // «Hoy» es la jornada del local, con su hora de corte (regla 10): quien entró a
  // las once de la noche sigue en la jornada de ayer a las dos de la mañana.
  const relojes = await contexto.sql<{ zona: string; corte: string }[]>`
    select zona_horaria as zona, to_char(hora_de_corte, 'HH24:MI') as corte
      from estook.local where id = ${localId}
  `;
  const reloj = relojes[0];
  if (reloj === undefined) throw new FalloDeAplicacion('local_ajeno');
  const jornada = jornadaDe(contexto.ahora, reloj.zona, horaDeCorte(reloj.corte));

  const filas = await contexto.sql<
    {
      nombre: string;
      apellidos: string | null;
      dentro_desde: string | null;
      pausa_desde: string | null;
      minutos: number;
      pausas: boolean;
    }[]
  >`
    select p.nombre, p.apellidos,
           (select to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              from estook.fichaje f where f.persona_id = p.id and f.salio_en is null) as dentro_desde,
           (select to_char(pa.empezo_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              from estook.pausa pa where pa.persona_id = p.id and pa.acabo_en is null) as pausa_desde,
           coalesce((
             select floor(sum(estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz)) / 60)
               from estook.fichaje f
              where f.persona_id = p.id and f.fecha_operativa = ${jornada}::date
           ), 0)::int as minutos,
           (select l.pausas_en_uso from estook.local l where l.id = ${localId}) as pausas
      from estook.persona p
     where p.id = ${personaId}
  `;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('sin_permiso');
  return {
    nombre: fila.apellidos === null ? fila.nombre : `${fila.nombre} ${fila.apellidos.charAt(0)}.`,
    estado:
      fila.pausa_desde !== null ? 'en_pausa' : fila.dentro_desde !== null ? 'dentro' : 'fuera',
    desde: fila.pausa_desde ?? fila.dentro_desde,
    minutosDeHoy: fila.minutos,
    pausasEnUso: fila.pausas,
    proximos: await susProximosDias(contexto, personaId, localId, jornada),
  };
}

/**
 * Teclear el PIN: quién es y cómo está, para enseñarle solo los botones que tocan.
 * Es un comando y no una consulta porque **apunta los fallos**.
 */
export const quienFichaAqui = comando<z.infer<typeof entradaQuienFichaAqui>, QuienFichaAqui>({
  nombre: 'quien_ficha_aqui',
  entrada: entradaQuienFichaAqui,
  sinSesion: true,
  // Mirar quién es no cambia nada que se pueda repetir mal, y recordarlo guardaría
  // un PIN acertado en una tabla. Los fallos se apuntan igual, con o sin clave.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const aparato = await elAparato(contexto, entrada.llave);
    const personaId = await quienEsElPin(contexto, aparato, entrada.pin);
    return comoEsta(contexto, personaId, aparato.localId);
  },
});

export const entradaFicharAqui = z
  .object({
    llave,
    pin: z.string().trim().min(1).max(12).optional(),
    /**
     * Sin conexión (0070): el PIN cifrado con la pública del aparato, con su número de
     * un solo uso dentro. En la tablet no queda ningún PIN legible.
     */
    pin_cifrado: z
      .string()
      .regex(/^[A-Za-z0-9_-]{300,400}$/, 'No tiene la forma de un PIN cifrado.')
      .optional(),
    que: z.enum(['entrada', 'pausa', 'vuelta', 'salida']),
  })
  .strict()
  .refine((e) => (e.pin === undefined) !== (e.pin_cifrado === undefined), {
    message: 'Hace falta el PIN o el PIN cifrado, y solo uno de los dos.',
  });

/**
 * Lo que contesta un fichaje que se hizo sin conexión (0070). Nadie lo está mirando
 * —quien fichó ya se fue—, así que no hace falta su nombre: basta con saber si se
 * apuntó. Si no, a quien lleva el equipo ya le ha llegado el porqué.
 */
export type FichajeSinConexion =
  { readonly apuntado: true } | { readonly apuntado: false; readonly porque: PorQueNoSeApunto };

/** Lo que no se pudo apuntar, a quien lleva el equipo: en la campana y en el móvil. */
async function avisarDeLoQueNoSeApunto(
  contexto: Contexto,
  aparato: ElAparato,
  que: 'entrada' | 'pausa' | 'vuelta' | 'salida',
  porque: PorQueNoSeApunto,
  personaId: string | null,
  numero: string,
): Promise<void> {
  const cuando = laHoraDeLoHecho(contexto.ahora, contexto.hechoHaceMs ?? 0);
  const datos = await enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<{ zona_horaria: string; nombre: string | null }[]>`
      select l.zona_horaria,
             (select p.nombre from estook.persona p where p.id = ${personaId}::uuid) as nombre
        from estook.local l where l.id = ${aparato.localId}
    `;
    return filas[0];
  });
  const zona = datos?.zona_horaria ?? 'Europe/Madrid';
  const dia = fechaEnElLocal(cuando, zona);
  const enLetra = `el ${comoSeLlamaElDia(diaDeLaSemana(dia))} ${String(Number(dia.slice(8)))} a las ${horaEnElLocal(cuando, zona)}`;
  await avisar(
    contexto,
    {
      tipo: 'fichaje.sin_apuntar',
      organizacionId: aparato.organizacionId,
      localId: aparato.localId,
      clave: `sin_apuntar:${numero}`,
      texto: () =>
        avisoDeFichajeSinApuntar(que, aparato.nombre, enLetra, porque, datos?.nombre ?? null),
      ir: '/equipo/personas',
      quien: null,
    },
    await quienesPuedenRecibir(contexto, aparato.localId, 'fichaje.sin_apuntar'),
  );
}

/** El fichaje de dentro, como desde el móvil: lo comparten el de ahora y el de sin conexión. */
async function ficharEnElAparato(
  contexto: Contexto,
  aparato: ElAparato,
  personaId: string,
  que: 'entrada' | 'pausa' | 'vuelta' | 'salida',
): Promise<void> {
  await laCuentaDejaFichar(contexto, aparato);
  await puedeFicharAqui(contexto, aparato.localId);
  const desde = { desde: 'aparato' as const, terminalId: aparato.terminalId };
  if (que === 'entrada') {
    await abrirElTurno(contexto, personaId, aparato.organizacionId, aparato.localId, desde, null);
  } else if (que === 'salida') {
    await cerrarElTurno(contexto, personaId, aparato.organizacionId, desde, null);
  } else if (que === 'pausa') {
    await empezarLaPausa(contexto, personaId, aparato.terminalId);
  } else {
    await acabarLaPausa(contexto, personaId);
  }
}

/**
 * **Lo que se fichó en el aparato sin conexión**, al volver la señal (0070). El PIN se
 * comprueba ahora, con los mismos frenos de siempre (diez fallos paran el aparato). Si
 * no se puede apuntar —un PIN que no es de nadie, o entrar estando ya dentro—, no se
 * pierde en silencio: le llega a quien lleva el equipo, que lo apunta a mano.
 */
async function loQueSeFichoSinConexion(
  contexto: Contexto,
  aparato: ElAparato,
  cifrado: string,
  que: 'entrada' | 'pausa' | 'vuelta' | 'salida',
): Promise<FichajeSinConexion> {
  const privada = await enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<{ privada: string }[]>`
      select privada from estook.clave_del_terminal where terminal_id = ${aparato.terminalId}
    `;
    return filas[0]?.privada ?? null;
  });
  const leido = privada === null ? null : await descifrarElPin(privada, cifrado);
  if (leido === null) {
    // No se puede leer: no es de este aparato. Nadie puede saber de quién era.
    throw new FalloDeAplicacion('pin_desconocido');
  }

  // **Un cifrado vale una vez.** Si ya se usó, esto ya se apuntó (se perdió la respuesta).
  const nuevo = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ numero: string }[]>`
      insert into estook.cifrado_usado (terminal_id, numero)
      values (${aparato.terminalId}, ${leido.numero})
      on conflict do nothing
      returning numero
    `,
  );
  if (nuevo.length === 0) return { apuntado: true };

  let personaId: string;
  try {
    personaId = await quienEsElPin(contexto, aparato, leido.pin);
  } catch (fallo) {
    if (fallo instanceof FalloDeAplicacion && fallo.codigo === 'pin_desconocido') {
      await avisarDeLoQueNoSeApunto(contexto, aparato, que, 'pin', null, leido.numero);
      return { apuntado: false, porque: 'pin' };
    }
    throw fallo;
  }

  try {
    await ficharEnElAparato(contexto, aparato, personaId, que);
  } catch (fallo) {
    if (!(fallo instanceof FalloDeAplicacion)) throw fallo;
    const porque: PorQueNoSeApunto =
      fallo.codigo === 'ya_hecho'
        ? 'ya_estaba'
        : fallo.codigo === 'no_existe'
          ? 'no_estaba'
          : 'otro';
    await avisarDeLoQueNoSeApunto(contexto, aparato, que, porque, personaId, leido.numero);
    return { apuntado: false, porque };
  }
  return { apuntado: true };
}

/**
 * Fichar en el aparato. **Lo mismo que desde el móvil** (`fichar.ts`), con la
 * identidad de quien teclea y el aparato apuntado; sin pedir la ubicación.
 */
export const ficharAqui = comando<
  z.infer<typeof entradaFicharAqui>,
  QuienFichaAqui | FichajeSinConexion
>({
  nombre: 'fichar_aqui',
  entrada: entradaFicharAqui,
  sinSesion: true,
  // Sin wifi se guarda en el aparato, con el PIN cifrado, y se manda al volver (0070).
  sinConexion: true,
  // Repetirlo no hace dos cosas: entrar dos veces dice «ya estás fichado» y salir
  // dos veces, «no estás fichado». El estado de la persona es la protección, y
  // recordar la respuesta guardaría su PIN acertado en una tabla.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const aparato = await elAparato(contexto, entrada.llave);

    // Sin conexión, el PIN llega cifrado; con conexión, tal cual. Y uno cifrado solo se
    // acepta como lo que es: algo que se hizo sin señal y se manda después.
    if (entrada.pin_cifrado !== undefined) {
      if (contexto.hechoHaceMs === undefined || contexto.hechoHaceMs === null) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'Un PIN cifrado es de algo que se fichó sin conexión, y eso dice cuánto hace.',
        });
      }
      return loQueSeFichoSinConexion(contexto, aparato, entrada.pin_cifrado, entrada.que);
    }

    const personaId = await quienEsElPin(contexto, aparato, entrada.pin ?? '');
    await ficharEnElAparato(contexto, aparato, personaId, entrada.que);
    return comoEsta(contexto, personaId, aparato.localId);
  },
});
