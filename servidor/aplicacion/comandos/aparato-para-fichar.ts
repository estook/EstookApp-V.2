import { z } from 'zod';
import { dejaEscribir, horaDeCorte, jornadaDe } from '@estook/dominio';
import {
  derivarConSalDelLocal,
  esPinConForma,
  huellaDeToken,
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
import { comoEstaAhora, laSuscripcionDe } from '../pago.ts';
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
    };
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
    pin: z.string().trim().min(1).max(12),
    que: z.enum(['entrada', 'pausa', 'vuelta', 'salida']),
  })
  .strict();

/**
 * Fichar en el aparato. **Lo mismo que desde el móvil** (`fichar.ts`), con la
 * identidad de quien teclea y el aparato apuntado; sin pedir la ubicación.
 */
export const ficharAqui = comando<z.infer<typeof entradaFicharAqui>, QuienFichaAqui>({
  nombre: 'fichar_aqui',
  entrada: entradaFicharAqui,
  sinSesion: true,
  // Repetirlo no hace dos cosas: entrar dos veces dice «ya estás fichado» y salir
  // dos veces, «no estás fichado». El estado de la persona es la protección, y
  // recordar la respuesta guardaría su PIN acertado en una tabla.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const aparato = await elAparato(contexto, entrada.llave);
    const personaId = await quienEsElPin(contexto, aparato, entrada.pin);
    await laCuentaDejaFichar(contexto, aparato);
    await puedeFicharAqui(contexto, aparato.localId);

    const desde = { desde: 'aparato' as const, terminalId: aparato.terminalId };
    if (entrada.que === 'entrada') {
      await abrirElTurno(contexto, personaId, aparato.organizacionId, aparato.localId, desde, null);
    } else if (entrada.que === 'salida') {
      await cerrarElTurno(contexto, personaId, aparato.organizacionId, desde, null);
    } else if (entrada.que === 'pausa') {
      await empezarLaPausa(contexto, personaId, aparato.terminalId);
    } else {
      await acabarLaPausa(contexto, personaId);
    }
    return comoEsta(contexto, personaId, aparato.localId);
  },
});
