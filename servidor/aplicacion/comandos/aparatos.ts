import { z } from 'zod';
import {
  BLOQUEO_DE_FABRICA,
  CODIGO_PARA_VINCULAR,
  FUNCIONES_QUE_SE_ELIGEN,
  LIMITES_DEL_BLOQUEO,
  dondeCae,
  esCodigoConForma,
  horaDeCorte,
  inicialesDe,
  jornadaDe,
  type AjustesDelBloqueo,
  type FuncionDelAparato,
} from '@estook/dominio';
import type { PermisosResueltos } from '@estook/permisos';
import { huellaDeToken, pinNuevo, tokenNuevo } from '../../dominio/secretos.ts';
import {
  comando,
  consulta,
  FalloDeAplicacion,
  falloQueSeGuarda,
  type Contexto,
} from '../contrato.ts';
import { enNombreDelSistema } from '../pago.ts';
import { leerPermisos } from '../consultas/quien-soy.ts';
import { ponerPinNuevo } from '../pines.ts';
import { cerrarLaSesion } from './salir.ts';
import {
  comoEsta,
  ficharEnElAparato,
  quienEsElPin,
  type ElAparato,
  type QuienFichaAqui,
} from './aparato-para-fichar.ts';
import { pasarAOtroCamarero } from './sala.ts';

/**
 * Los aparatos de Estook TPV y quién los usa (T1 · La puerta, decisión 0107; Anexo
 * 11.3, 11.4 y 11.13).
 *
 * ── Vincular ─────────────────────────────────────────────────────────────────
 *
 *   donde_puedo_vincular        con el correo, en el primer aparato: dónde y con qué
 *   vincular_el_primer_aparato  el primero, con el correo. **Cierra esa sesión**: el
 *                               aparato se queda con su propia llave, no con la persona
 *   sacar_codigo_para_vincular  los demás, desde un aparato ya vinculado: la función y el
 *                               nombre primero, y sale el código de 6 cifras (10 minutos)
 *   vincular_con_codigo         en el aparato nuevo, sin nadie dentro todavía
 *   latir_el_aparato            cada minuto: «en línea», su versión, y lo que enseña su
 *                               pantalla del PIN (fichados, el bloqueo)
 *   los_aparatos · cambiar_aparato · desvincular_aparato   Ajustes del TPV › Aparatos
 *
 * ── Quién lo usa ─────────────────────────────────────────────────────────────
 *
 *   entrar_con_pin   solo el PIN, sin elegir la cara antes: abre **el turno del operador**
 *   yo_en_el_tpv     quién está, su fichaje, sus permisos y sus mesas abiertas
 *   fichar_en_el_tpv la entrada, la pausa y la salida, con el mismo PIN (0057)
 *   bloquear         y el siguiente entra con el suyo
 *   guardar_pin_y_bloqueo   Ajustes del TPV › PIN y bloqueo
 *
 * El token de Estook TPV es `tpv.<turno>.<llave>` (`tokenDelAparato`), y la API mira los
 * dos en cada petición (`quien-llama.ts`). Lo que no declara `enElTpv` no pasa desde un
 * aparato: un aparato vinculado no es una puerta a la gestión.
 */

const llave = z.string().trim().min(20).max(200);
const id = z.string().uuid();
const version = z.string().trim().max(40).optional();

/** Las que se eligen hoy (`FUNCIONES_QUE_SE_ELIGEN`): cocina y barra llegan con T4. */
const funcion = z.enum(FUNCIONES_QUE_SE_ELIGEN);

// ═══ El aparato por dentro ════════════════════════════════════════════════════

interface FilaDelAparato {
  terminal_id: string;
  local_id: string;
  organizacion_id: string;
  nombre: string;
  funcion: FuncionDelAparato;
  persona_id: string | null;
  nombre_del_dueno: string | null;
  cajon_id: string | null;
  nombre_del_cajon: string | null;
  sal_del_pin: string;
  parado: boolean;
  nombre_del_local: string;
  pausas_en_uso: boolean;
  tema_al_segundo: string | null;
}

interface AparatoDelTpv extends ElAparato {
  readonly funcion: FuncionDelAparato;
  readonly duenoId: string | null;
  readonly nombreDelDueno: string | null;
  readonly nombreDelCajon: string | null;
  readonly temaAlSegundo: string | null;
}

function comoAparato(fila: FilaDelAparato): AparatoDelTpv {
  return {
    terminalId: fila.terminal_id,
    localId: fila.local_id,
    organizacionId: fila.organizacion_id,
    nombre: fila.nombre,
    salDelPin: fila.sal_del_pin,
    nombreDelLocal: fila.nombre_del_local,
    pausasEnUso: fila.pausas_en_uso,
    funcion: fila.funcion,
    duenoId: fila.persona_id,
    nombreDelDueno: fila.nombre_del_dueno,
    nombreDelCajon: fila.nombre_del_cajon,
    temaAlSegundo: fila.tema_al_segundo,
  };
}

/** El aparato de una llave, vivo. Si no, «ya no está vinculado». */
async function elAparatoDeLaLlave(contexto: Contexto, laLlave: string): Promise<AparatoDelTpv> {
  const filas = await contexto.sql<FilaDelAparato[]>`
    select * from estook.aparato_por_llave(${await huellaDeToken(laLlave)})
  `;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('aparato_retirado');
  if (fila.parado) throw new FalloDeAplicacion('aparato_parado');
  return comoAparato(fila);
}

/** El aparato desde el que opera quien tecleó su PIN (la sesión de Estook TPV). */
async function elAparatoDeLaSesion(contexto: Contexto): Promise<AparatoDelTpv> {
  const terminalId = contexto.sesion?.aparato?.terminalId ?? null;
  if (terminalId === null) throw new FalloDeAplicacion('sin_permiso');
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<FilaDelAparato[]>`
      select t.id as terminal_id, t.local_id, l.organizacion_id, t.nombre, t.funcion,
             t.persona_id, d.nombre as nombre_del_dueno, t.cajon_id, c.nombre as nombre_del_cajon,
             l.sal_del_pin, coalesce(t.parado_hasta > now(), false) as parado,
             l.nombre as nombre_del_local, l.pausas_en_uso,
             t.tema_al_segundo
        from estook.terminal t
        join estook.local l on l.id = t.local_id
        left join estook.persona d on d.id = t.persona_id
        left join estook.cajon c on c.id = t.cajon_id
       where t.id = ${terminalId}::uuid and t.retirado_en is null
    `,
  );
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('aparato_retirado');
  return comoAparato(fila);
}

/**
 * **Los Ajustes del TPV son de la caja** (0115; Richi, 25-oct: los comanderos «solo pedir»).
 * Antes también de la tablet de la sala; ahora un comandero, de todos o de alguien, solo
 * pide y cobra.
 */
export function soloEnLaCaja(contexto: Contexto): void {
  const aparato = contexto.sesion?.aparato ?? null;
  if (aparato !== null && aparato.funcion !== 'caja') {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Los ajustes del TPV se tocan en la caja.',
    });
  }
}

/** Los minutos del bloqueo de un local (los de fábrica si nadie los ha tocado). */
async function losAjustesDelBloqueo(
  contexto: Contexto,
  localId: string,
): Promise<AjustesDelBloqueo> {
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<
        {
          bloqueo_minutos: number;
          bloqueo_al_cobrar: boolean;
          bloqueo_personal_minutos: number;
          solo_entra_quien_ficha: boolean;
        }[]
      >`
      select bloqueo_minutos, bloqueo_al_cobrar, bloqueo_personal_minutos, solo_entra_quien_ficha
        from estook.ajustes_del_tpv where local_id = ${localId}::uuid
    `,
  );
  const fila = filas[0];
  if (fila === undefined) return BLOQUEO_DE_FABRICA;
  return {
    minutos: fila.bloqueo_minutos,
    alCobrar: fila.bloqueo_al_cobrar,
    personalMinutos: fila.bloqueo_personal_minutos,
    soloEntraQuienFicha: fila.solo_entra_quien_ficha,
  };
}

/** Lo que enseña el aparato antes de que nadie entre, y lo que necesita para trabajar. */
export interface ElAparatoPorDentro {
  readonly terminalId: string;
  readonly nombre: string;
  readonly funcion: FuncionDelAparato;
  readonly esPersonal: boolean;
  readonly dueno: { readonly id: string; readonly nombre: string } | null;
  readonly cajon: string | null;
  readonly local: { readonly id: string; readonly nombre: string };
  readonly bloqueo: AjustesDelBloqueo;
  /** «Fichados ahora: Sara · Rosa», en la pantalla del PIN. */
  readonly fichados: readonly {
    readonly nombre: string;
    readonly iniciales: string;
    readonly desde: string;
  }[];
  /** El toque «algo ha cambiado en la sala» le llega al aparato, no a quien lo usa. */
  readonly temaAlSegundo: string | null;
  /** Sin mesas dibujadas, tras el bloqueo se cae en el inicio. */
  readonly hayMesas: boolean;
}

async function elAparatoPorDentro(
  contexto: Contexto,
  aparato: AparatoDelTpv,
  laLlave: string,
): Promise<ElAparatoPorDentro> {
  const [fichados, bloqueo, mesas] = await Promise.all([
    contexto.sql<{ nombre: string; desde: Date }[]>`
      select nombre, desde from estook.fichados_en_el_aparato(${await huellaDeToken(laLlave)})
       order by desde
    `,
    losAjustesDelBloqueo(contexto, aparato.localId),
    enNombreDelSistema(
      contexto,
      () =>
        contexto.sql<{ hay: boolean }[]>`
        select exists (
          select 1 from estook.mesa where local_id = ${aparato.localId}::uuid and archivada_en is null
        ) as hay
      `,
    ),
  ]);
  return {
    terminalId: aparato.terminalId,
    nombre: aparato.nombre,
    funcion: aparato.funcion,
    esPersonal: aparato.duenoId !== null,
    dueno:
      aparato.duenoId === null
        ? null
        : { id: aparato.duenoId, nombre: aparato.nombreDelDueno ?? '' },
    cajon: aparato.nombreDelCajon,
    local: { id: aparato.localId, nombre: aparato.nombreDelLocal },
    bloqueo,
    fichados: fichados.map((f) => ({
      nombre: f.nombre,
      iniciales: inicialesDe(f.nombre),
      desde: new Date(f.desde).toISOString(),
    })),
    temaAlSegundo: aparato.temaAlSegundo,
    hayMesas: mesas[0]?.hay === true,
  };
}

/** Quién toma nota en el local: los que pueden tener su móvil como comandero. */
async function quienesTomanNota(
  contexto: Contexto,
  localId: string,
): Promise<{ id: string; nombre: string }[]> {
  return contexto.sql<{ id: string; nombre: string }[]>`
    select p.id::text as id, p.nombre
      from estook.persona p
     where p.id in (select estook.quien_lleva_el_servicio(${localId}::uuid))
       and p.activa
       and estook.nivel_de_permiso(p.id, ${localId}::uuid, 'accion.tomar_nota') = 'ver_y_editar'
     order by p.nombre
  `;
}

// ═══ Lo que será el aparato: la función, el nombre, de quién y su cajón ═══════

const queSera = {
  funcion,
  nombre: z.string().trim().min(1).max(60),
  /** De quién es, si es el móvil de un camarero (comandero personal). */
  persona_id: id.optional(),
  /** El cajón de una caja: uno que ya hay, o uno nuevo con este nombre. */
  cajon_id: id.optional(),
  cajon_nuevo: z.string().trim().min(1).max(40).optional(),
};

interface QueSera {
  readonly funcion: FuncionDelAparato;
  readonly nombre: string;
  readonly persona_id?: string | undefined;
  readonly cajon_id?: string | undefined;
  readonly cajon_nuevo?: string | undefined;
}

/**
 * Comprueba lo elegido y deja el cajón hecho: **una caja siempre tiene el suyo** y un
 * comandero nunca; y el móvil personal es de alguien que toma nota en ese local.
 */
async function prepararLoQueSera(
  contexto: Contexto,
  localId: string,
  que: QueSera,
): Promise<{ personaId: string | null; cajonId: string | null }> {
  if (que.funcion !== 'comandero' && que.persona_id !== undefined) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Solo un comandero puede ser el móvil de alguien.',
    });
  }
  let personaId: string | null = null;
  if (que.persona_id !== undefined) {
    const toman = await quienesTomanNota(contexto, localId);
    if (!toman.some((p) => p.id === que.persona_id)) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa persona no toma nota en este local: su móvil no puede ser un comandero.',
      });
    }
    personaId = que.persona_id;
  }

  if (que.funcion !== 'caja') {
    if (que.cajon_id !== undefined || que.cajon_nuevo !== undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Solo una caja tiene cajón: un comandero nunca lo abre.',
      });
    }
    return { personaId, cajonId: null };
  }

  if (que.cajon_id !== undefined) {
    const cajones = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.cajon
       where id = ${que.cajon_id}::uuid and local_id = ${localId}::uuid and retirado_en is null
    `;
    if (cajones[0] === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese cajón no es de este local.' });
    }
    return { personaId, cajonId: que.cajon_id };
  }
  const nombre = que.cajon_nuevo ?? 'Cajón 1';
  const repetido = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.cajon
     where local_id = ${localId}::uuid and retirado_en is null
       and lower(btrim(nombre)) = lower(btrim(${nombre}))
  `;
  if (repetido[0] !== undefined) return { personaId, cajonId: repetido[0].id };
  const nuevos = await contexto.sql<{ id: string }[]>`
    insert into estook.cajon (local_id, nombre, creado_por)
    values (${localId}::uuid, ${nombre}, ${contexto.personaId}::uuid)
    returning id::text as id
  `;
  const cajonId = nuevos[0]?.id;
  if (cajonId === undefined) throw new FalloDeAplicacion('sin_permiso');
  return { personaId, cajonId };
}

/** Lo que se apunta en la auditoría de cada aparato: vincular, cambiar, desvincular. */
async function apuntar(
  contexto: Contexto,
  organizacionId: string,
  accion: string,
  terminalId: string,
  localId: string,
  despues: Record<string, unknown> | null,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${organizacionId}::uuid, ${accion}, 'terminal', ${terminalId}, ${localId}::uuid,
      null, ${despues === null ? null : JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

/** Un aparato nuevo, con su llave. Lo inserta quien vincula (o quien sacó el código). */
async function crearElAparato(
  contexto: Contexto,
  localId: string,
  que: QueSera,
  loPreparado: { personaId: string | null; cajonId: string | null },
  laVersion: string | null,
): Promise<{ terminalId: string; llave: string }> {
  const laLlave = tokenNuevo();
  const filas = await contexto.sql<{ id: string }[]>`
    insert into estook.terminal
      (local_id, nombre, funcion, persona_id, cajon_id, huella, creado_por,
       version_de_la_app, ultimo_latido_en, tema_al_segundo)
    values (${localId}::uuid, ${que.nombre}, ${que.funcion}, ${loPreparado.personaId}::uuid,
            ${loPreparado.cajonId}::uuid, ${await huellaDeToken(laLlave)}, ${contexto.personaId}::uuid,
            ${laVersion}, ${contexto.ahora.toISOString()}::timestamptz, ${tokenNuevo()})
    returning id::text as id
  `;
  const terminalId = filas[0]?.id;
  if (terminalId === undefined) throw new FalloDeAplicacion('sin_permiso');
  return { terminalId, llave: laLlave };
}

// ═══ Vincular el primero, con el correo ═══════════════════════════════════════

export interface DondeSePuedeVincular {
  readonly locales: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly cajones: readonly { readonly id: string; readonly nombre: string }[];
    readonly aparatos: readonly string[];
    readonly personas: readonly { readonly id: string; readonly nombre: string }[];
  }[];
}

export const dondePuedoVincular = consulta<Record<string, never>, DondeSePuedeVincular>({
  nombre: 'donde_puedo_vincular',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const locales = await contexto.sql<{ id: string; nombre: string }[]>`
      select l.id::text as id, l.nombre
        from estook.local l
       where l.id in (select local_id from estook.locales_visibles())
         and l.activo
         and estook.puede_editar('accion.vincular_aparatos', l.id)
       order by l.nombre
    `;
    return {
      locales: await Promise.all(
        locales.map(async (l) => {
          const [cajones, aparatos, personas] = await Promise.all([
            contexto.sql<{ id: string; nombre: string }[]>`
              select id::text as id, nombre from estook.cajon
               where local_id = ${l.id}::uuid and retirado_en is null order by nombre
            `,
            contexto.sql<{ nombre: string }[]>`
              select nombre from estook.terminal
               where local_id = ${l.id}::uuid and retirado_en is null order by nombre
            `,
            quienesTomanNota(contexto, l.id),
          ]);
          return { ...l, cajones, aparatos: aparatos.map((a) => a.nombre), personas };
        }),
      ),
    };
  },
});

export const entradaVincularElPrimero = z
  .object({
    local_id: id,
    ...queSera,
    version,
    /** «No recuerdo mi PIN»: quien vincula, que ya ha entrado con su correo, saca uno nuevo. */
    pin_nuevo: z.boolean().optional(),
  })
  .strict();

export interface AparatoVinculado {
  /** **Una sola vez**: se guarda en el aparato y no se puede volver a pedir. */
  readonly llave: string;
  readonly aparato: ElAparatoPorDentro;
  /**
   * El PIN de quien vinculó el primer aparato, **una sola vez**, si no tenía en ese local
   * o pidió uno nuevo (0109). Sin él, quien crea el restaurante no podía entrar en su
   * propio TPV. Nulo en los demás casos.
   */
  readonly tuPinNuevo: string | null;
}

export const vincularElPrimerAparato = comando<
  z.infer<typeof entradaVincularElPrimero>,
  AparatoVinculado
>({
  nombre: 'vincular_el_primer_aparato',
  entrada: entradaVincularElPrimero,
  // Devuelve la llave: no se recuerda.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const puede = await contexto.sql<{ puede: boolean; organizacion_id: string | null }[]>`
      select estook.puede_editar('accion.vincular_aparatos', l.id) as puede,
             l.organizacion_id::text as organizacion_id
        from estook.local l
       where l.id = ${entrada.local_id}::uuid
         and l.id in (select local_id from estook.locales_visibles())
         and l.activo
    `;
    const fila = puede[0];
    if (fila?.puede !== true || fila.organizacion_id === null) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Vincula aparatos quien lleva el local. Pídeselo a tu gerente.',
      });
    }
    const preparado = await prepararLoQueSera(contexto, entrada.local_id, entrada);
    const { terminalId, llave: laLlave } = await crearElAparato(
      contexto,
      entrada.local_id,
      entrada,
      preparado,
      entrada.version ?? null,
    );
    await apuntar(contexto, fila.organizacion_id, 'vincular', terminalId, entrada.local_id, {
      nombre: entrada.nombre,
      funcion: entrada.funcion,
      como: 'con el correo',
    });

    // **Su PIN, si no tiene en este local** (0109): quien crea el restaurante entraba con su
    // correo y no tenía ninguno, así que no podía entrar en su propio TPV. Ya ha
    // demostrado quién es con el correo (y su segundo factor), así que se le da aquí.
    const tuPinNuevo = await suPinSiHaceFalta(
      contexto,
      fila.organizacion_id,
      entrada.local_id,
      entrada.pin_nuevo === true,
    );

    // **La sesión personal no se queda en el aparato** (Anexo 11.3): lo que se queda es
    // su llave. Lo que viene después lo hace cada uno con su PIN.
    await cerrarLaSesion(contexto);

    const aparato = await elAparatoDeLaLlave(contexto, laLlave);
    return {
      llave: laLlave,
      aparato: await elAparatoPorDentro(contexto, aparato, laLlave),
      tuPinNuevo,
    };
  },
});

/** Un PIN para quien vincula, si no tiene en el local o lo pide. Nulo si no hace falta. */
async function suPinSiHaceFalta(
  contexto: Contexto,
  organizacionId: string,
  localId: string,
  loPide: boolean,
): Promise<string | null> {
  const personaId = contexto.sesion?.personaId;
  if (personaId === undefined) return null;
  const tiene = await contexto.sql<{ hay: boolean }[]>`
    select true as hay from estook.pin where persona_id = ${personaId}::uuid and local_id = ${localId}::uuid
  `;
  if (tiene.length > 0 && !loPide) return null;
  const pin = await ponerPinNuevo(contexto.sql, personaId, localId);
  await contexto.sql`
    select estook.anotar(
      ${organizacionId}::uuid, 'regenerar_pin', 'pin', ${personaId}, ${localId}::uuid,
      null, null, 'Al vincular el primer aparato'
    )
  `;
  return pin;
}

// ═══ Los demás, con el código ═════════════════════════════════════════════════

export const entradaSacarCodigo = z.object(queSera).strict();

export interface CodigoParaVincular {
  /** Las seis cifras, **una sola vez**: aquí y en el QR. Se guarda su huella. */
  readonly codigo: string;
  readonly caducaEn: string;
}

export const sacarCodigoParaVincular = comando<
  z.infer<typeof entradaSacarCodigo>,
  CodigoParaVincular
>({
  nombre: 'sacar_codigo_para_vincular',
  entrada: entradaSacarCodigo,
  exige: 'accion.vincular_aparatos',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const aparato = await elAparatoDeLaSesion(contexto);
    const preparado = await prepararLoQueSera(contexto, aparato.localId, entrada);
    const caducaEn = new Date(contexto.ahora.getTime() + CODIGO_PARA_VINCULAR.minutos * 60_000);

    // Seis cifras al azar, y que no coincidan con otro código vivo (uno entre un millón).
    for (let intento = 0; intento < 10; intento++) {
      const codigo = pinNuevo(CODIGO_PARA_VINCULAR.cifras);
      const huella = await huellaDeToken(codigo);
      const vivo = await contexto.sql<{ codigo_id: string }[]>`
        select codigo_id from estook.codigo_vivo_por_huella(${huella}, ${contexto.ahora.toISOString()}::timestamptz)
      `;
      if (vivo.length > 0) continue;
      await contexto.sql`
        insert into estook.codigo_para_vincular
          (local_id, funcion, nombre, persona_id, cajon_id, huella, creado_por, creado_desde,
           creado_en, caduca_en)
        values (${aparato.localId}::uuid, ${entrada.funcion}, ${entrada.nombre},
                ${preparado.personaId}::uuid, ${preparado.cajonId}::uuid, ${huella},
                ${contexto.personaId}::uuid, ${aparato.terminalId}::uuid,
                ${contexto.ahora.toISOString()}::timestamptz, ${caducaEn.toISOString()}::timestamptz)
      `;
      return { codigo, caducaEn: caducaEn.toISOString() };
    }
    throw new FalloDeAplicacion('fallo_nuestro');
  },
});

export const entradaVincularConCodigo = z
  .object({ codigo: z.string().trim().min(1).max(12), version })
  .strict();

export const vincularConCodigo = comando<
  z.infer<typeof entradaVincularConCodigo>,
  AparatoVinculado
>({
  nombre: 'vincular_con_codigo',
  entrada: entradaVincularConCodigo,
  // En el aparato nuevo todavía no hay nadie: el código dice el local y quién lo sacó.
  sinSesion: true,
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    // **Veinte por hora desde una dirección** (Anexo 11.3, punto 2): con un millón de
    // códigos y diez minutos de vida, probar a ciegas no sale nunca.
    const desde = await huellaDeToken(contexto.desde ?? 'sin-direccion');
    const unaHoraAntes = new Date(contexto.ahora.getTime() - 60 * 60_000).toISOString();
    const probados = await enNombreDelSistema(
      contexto,
      () =>
        contexto.sql<{ cuantos: number }[]>`
        select count(*)::int as cuantos from estook.intento_de_vincular
         where desde = ${desde} and en > ${unaHoraAntes}::timestamptz
      `,
    );
    if ((probados[0]?.cuantos ?? 0) >= CODIGO_PARA_VINCULAR.porHora) {
      throw new FalloDeAplicacion('demasiados_codigos');
    }

    const apuntarIntento = (acerto: boolean) =>
      enNombreDelSistema(contexto, async () => {
        await contexto.sql`
          insert into estook.intento_de_vincular (desde, en, acerto)
          values (${desde}, ${contexto.ahora.toISOString()}::timestamptz, ${acerto})
        `;
        // Lo de más de un día ya no cuenta para nada.
        await contexto.sql`
          delete from estook.intento_de_vincular
           where en < ${new Date(contexto.ahora.getTime() - 24 * 60 * 60_000).toISOString()}::timestamptz
        `;
      });

    const filas = esCodigoConForma(entrada.codigo)
      ? await contexto.sql<
          {
            codigo_id: string;
            local_id: string;
            organizacion_id: string;
            funcion: FuncionDelAparato;
            nombre: string;
            persona_id: string | null;
            cajon_id: string | null;
            creado_por: string;
          }[]
        >`select * from estook.codigo_vivo_por_huella(
          ${await huellaDeToken(entrada.codigo)}, ${contexto.ahora.toISOString()}::timestamptz
        )`
      : [];
    const elCodigo = filas[0];
    if (elCodigo === undefined) {
      // **Se guarda aunque falle**: si no, el tope por dirección no contaría nunca.
      await apuntarIntento(false);
      throw falloQueSeGuarda('codigo_no_vale');
    }
    await apuntarIntento(true);

    // Lo vincula quien sacó el código: con su identidad, y con su permiso de ahora.
    await contexto.sql`select set_config('estook.persona_id', ${elCodigo.creado_por}, true)`;
    const ctx: Contexto = { ...contexto, personaId: elCodigo.creado_por };
    const { terminalId, llave: laLlave } = await crearElAparato(
      ctx,
      elCodigo.local_id,
      {
        funcion: elCodigo.funcion,
        nombre: elCodigo.nombre,
        ...(elCodigo.persona_id === null ? {} : { persona_id: elCodigo.persona_id }),
      },
      { personaId: elCodigo.persona_id, cajonId: elCodigo.cajon_id },
      entrada.version ?? null,
    );
    await contexto.sql`
      update estook.codigo_para_vincular
         set usado_en = ${contexto.ahora.toISOString()}::timestamptz, terminal_id = ${terminalId}::uuid
       where id = ${elCodigo.codigo_id}::uuid
    `;
    await apuntar(ctx, elCodigo.organizacion_id, 'vincular', terminalId, elCodigo.local_id, {
      nombre: elCodigo.nombre,
      funcion: elCodigo.funcion,
      como: 'con un código',
    });
    // Y el aparato nuevo empieza sin nadie dentro.
    await contexto.sql`select set_config('estook.persona_id', '', true)`;

    const aparato = await elAparatoDeLaLlave(contexto, laLlave);
    return {
      llave: laLlave,
      aparato: await elAparatoPorDentro(contexto, aparato, laLlave),
      tuPinNuevo: null,
    };
  },
});

// ═══ El latido ════════════════════════════════════════════════════════════════

export const latirElAparato = comando<
  { llave: string; version?: string | undefined },
  ElAparatoPorDentro
>({
  nombre: 'latir_el_aparato',
  entrada: z.object({ llave, version }).strict(),
  sinSesion: true,
  // Uno por minuto y aparato, todo el día: repetirlo ya es lo mismo (`sinRecordar`).
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const aparato = await elAparatoDeLaLlave(contexto, entrada.llave);
    const tema = aparato.temaAlSegundo ?? tokenNuevo();
    await enNombreDelSistema(
      contexto,
      () => contexto.sql`
        update estook.terminal
           set ultimo_latido_en = ${contexto.ahora.toISOString()}::timestamptz,
               version_de_la_app = coalesce(${entrada.version ?? null}, version_de_la_app),
               tema_al_segundo = ${tema}
         where id = ${aparato.terminalId}::uuid
      `,
    );
    return elAparatoPorDentro(contexto, { ...aparato, temaAlSegundo: tema }, entrada.llave);
  },
});

// ═══ Entrar con el PIN ════════════════════════════════════════════════════════

export const entradaEntrarConPin = z
  .object({
    llave,
    pin: z.string().trim().min(1).max(12),
    /** «Fichar la entrada y entrar», en un local donde solo entra quien ha fichado. */
    fichar_la_entrada: z.boolean().optional(),
  })
  .strict();

export interface DentroDelTpv {
  /** **Solo en la memoria del aparato**: al recargar, se bloquea (Anexo 3.4). */
  readonly turno: string;
  readonly persona: { readonly id: string; readonly nombre: string; readonly iniciales: string };
  readonly fichaje: QuienFichaAqui['estado'];
  readonly caeEn: 'inicio' | 'mesas';
}

export const entrarConPin = comando<z.infer<typeof entradaEntrarConPin>, DentroDelTpv>({
  nombre: 'entrar_con_pin',
  entrada: entradaEntrarConPin,
  sinSesion: true,
  // Devuelve el turno: no se recuerda.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const aparato = await elAparatoDeLaLlave(contexto, entrada.llave);
    if (aparato.funcion !== 'caja' && aparato.funcion !== 'comandero') {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'En este aparato no se entra con el PIN: es para fichar o una pantalla.',
      });
    }
    // Los fallos se cuentan aquí, por persona y por aparato (0018, 0068).
    const personaId = await quienEsElPin(contexto, aparato, entrada.pin);

    // **El móvil de Sara solo lo abre Sara** (Anexo 11.3).
    if (aparato.duenoId !== null && aparato.duenoId !== personaId) {
      throw new FalloDeAplicacion('aparato_de_otra_persona', {
        porque: `Este móvil es de ${aparato.nombreDelDueno ?? 'otra persona'}: solo entra su PIN.`,
      });
    }

    const bloqueo = await losAjustesDelBloqueo(contexto, aparato.localId);
    const enLaCaja = aparato.funcion === 'caja';
    let estado = await comoEsta(contexto, personaId, aparato.localId);
    // **Se ficha en la caja, no en el comandero** (0115): allí, «Fichar la entrada y
    // entrar»; en un comandero no se entra sin haber fichado antes, en la caja o en Estook.
    if (estado.estado === 'fuera' && entrada.fichar_la_entrada === true && enLaCaja) {
      await ficharEnElAparato(contexto, aparato, personaId, 'entrada');
      estado = await comoEsta(contexto, personaId, aparato.localId);
    }
    if (estado.estado === 'fuera' && (!enLaCaja || bloqueo.soloEntraQuienFicha)) {
      throw new FalloDeAplicacion('falta_fichar', { nombre: estado.nombre, enLaCaja });
    }

    // ¿Es el primero del día en este aparato? Cae en el inicio; si no, en las mesas. El
    // turno lleva la hora de la base (la que mira `turno_activo`), así que se compara
    // con la de la base.
    const relojes = await enNombreDelSistema(
      contexto,
      () =>
        contexto.sql<
          { zona: string; corte: string; ultimo: Date | null; ahora: Date; hay_mesas: boolean }[]
        >`
        select l.zona_horaria as zona, to_char(l.hora_de_corte, 'HH24:MI') as corte,
               (select max(o.desde) from estook.turno_del_operador o
                 where o.terminal_id = ${aparato.terminalId}::uuid) as ultimo,
               now() as ahora,
               exists (select 1 from estook.mesa m
                        where m.local_id = l.id and m.archivada_en is null) as hay_mesas
          from estook.local l where l.id = ${aparato.localId}::uuid
      `,
    );
    const reloj = relojes[0];
    if (reloj === undefined) throw new FalloDeAplicacion('local_ajeno');
    const corte = horaDeCorte(reloj.corte);
    const primeroDelDia =
      reloj.ultimo === null ||
      jornadaDe(new Date(reloj.ultimo), reloj.zona, corte) !==
        jornadaDe(new Date(reloj.ahora), reloj.zona, corte);

    const turno = tokenNuevo();
    await enNombreDelSistema(contexto, async () => {
      // Quien estaba deja de estar: lo que haga el siguiente es suyo.
      await contexto.sql`
        update estook.turno_del_operador
           set hasta = now(), por_que_acabo = 'otro_operador'
         where terminal_id = ${aparato.terminalId}::uuid and hasta is null
      `;
      await contexto.sql`
        insert into estook.turno_del_operador (terminal_id, persona_id, local_id, huella)
        values (${aparato.terminalId}::uuid, ${personaId}::uuid, ${aparato.localId}::uuid,
                ${await huellaDeToken(turno)})
      `;
    });
    await apuntar(contexto, aparato.organizacionId, 'entrar', aparato.terminalId, aparato.localId, {
      aparato: aparato.nombre,
    });

    const nombres = await contexto.sql<{ nombre: string }[]>`
      select nombre from estook.persona where id = ${personaId}::uuid
    `;
    const nombre = nombres[0]?.nombre ?? estado.nombre;
    return {
      turno,
      persona: { id: personaId, nombre, iniciales: inicialesDe(nombre) },
      fichaje: estado.estado,
      caeEn: dondeCae(aparato.funcion, primeroDelDia, reloj.hay_mesas),
    };
  },
});

// ═══ Quién está, bloquear y fichar ════════════════════════════════════════════

export interface YoEnElTpv {
  readonly persona: { readonly id: string; readonly nombre: string; readonly iniciales: string };
  readonly local: { readonly id: string; readonly nombre: string };
  readonly permisos: PermisosResueltos;
  readonly aparato: {
    readonly terminalId: string;
    readonly nombre: string;
    readonly funcion: FuncionDelAparato;
    readonly esPersonal: boolean;
  };
  readonly fichaje: QuienFichaAqui;
  /** Las mesas abiertas a su nombre: al fichar la salida, se pasan a otro. */
  readonly misMesas: readonly { readonly cuentaId: string; readonly titulo: string }[];
  /** Quién toma nota y está fichado: a quién se le pueden pasar. */
  readonly companeros: readonly { readonly id: string; readonly nombre: string }[];
}

export const yoEnElTpv = consulta<Record<string, never>, YoEnElTpv>({
  nombre: 'yo_en_el_tpv',
  entrada: z.object({}).strict(),
  enElTpv: 'solo',

  async ejecutar(contexto) {
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
    const aparato = await elAparatoDeLaSesion(contexto);
    const [personas, permisos, fichaje, mesas, companeros] = await Promise.all([
      contexto.sql<
        { nombre: string }[]
      >`select nombre from estook.persona where id = ${personaId}::uuid`,
      leerPermisos(contexto.sql, personaId, aparato.localId),
      comoEsta(contexto, personaId, aparato.localId),
      contexto.sql<{ cuenta_id: string; titulo: string }[]>`
        select c.id::text as cuenta_id,
               coalesce(m.nombre, c.nombre, 'Barra') as titulo
          from estook.cuenta c
          left join estook.mesa m on m.id = c.mesa_id
         where c.local_id = ${aparato.localId}::uuid and c.camarero_id = ${personaId}::uuid
           and c.liberada_en is null and c.anulada_en is null
         order by c.abierta_en
      `,
      contexto.sql<{ id: string; nombre: string }[]>`
        select distinct p.id::text as id, p.nombre
          from estook.fichaje f
          join estook.persona p on p.id = f.persona_id and p.activa
         where f.local_id = ${aparato.localId}::uuid and f.salio_en is null
           and f.persona_id <> ${personaId}::uuid
           and p.id in (select estook.quien_lleva_el_servicio(${aparato.localId}::uuid))
           and estook.nivel_de_permiso(p.id, ${aparato.localId}::uuid, 'accion.tomar_nota') = 'ver_y_editar'
         order by p.nombre
      `,
    ]);
    const nombre = personas[0]?.nombre ?? fichaje.nombre;
    return {
      persona: { id: personaId, nombre, iniciales: inicialesDe(nombre) },
      local: { id: aparato.localId, nombre: aparato.nombreDelLocal },
      permisos,
      aparato: {
        terminalId: aparato.terminalId,
        nombre: aparato.nombre,
        funcion: aparato.funcion,
        esPersonal: aparato.duenoId !== null,
      },
      fichaje,
      misMesas: mesas.map((m) => ({ cuentaId: m.cuenta_id, titulo: m.titulo })),
      companeros,
    };
  },
});

/** Acaba el turno de quien está: lo siguiente lo hará quien teclee su PIN. */
async function acabarElTurno(contexto: Contexto, porQue: 'bloqueo' | 'salir'): Promise<void> {
  const turnoId = contexto.sesion?.id ?? null;
  if (turnoId === null || (contexto.sesion?.aparato ?? null) === null) {
    throw new FalloDeAplicacion('sin_sesion');
  }
  await enNombreDelSistema(
    contexto,
    () => contexto.sql`
      update estook.turno_del_operador
         set hasta = now(), por_que_acabo = ${porQue}
       where id = ${turnoId}::uuid and hasta is null
    `,
  );
}

export const bloquear = comando<Record<string, never>, { bloqueado: true }>({
  nombre: 'bloquear',
  entrada: z.object({}).strict(),
  enElTpv: 'solo',
  sinRecordar: true,

  async ejecutar(contexto) {
    await acabarElTurno(contexto, 'bloqueo');
    return { bloqueado: true };
  },
});

export const entradaFicharEnElTpv = z
  .object({
    que: z.enum(['entrada', 'pausa', 'vuelta', 'salida']),
    /** Al fichar la salida con mesas abiertas: a quién se le pasan. */
    pasar_mesas_a: id.optional(),
  })
  .strict();

export const ficharEnElTpv = comando<
  z.infer<typeof entradaFicharEnElTpv>,
  { fichaje: QuienFichaAqui; turnoAcabado: boolean }
>({
  nombre: 'fichar_en_el_tpv',
  entrada: entradaFicharEnElTpv,
  enElTpv: 'solo',
  // Repetirlo dice «ya estás fichado» o «no estás fichado»: el estado protege.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
    const aparato = await elAparatoDeLaSesion(contexto);

    if (entrada.que === 'salida') {
      const abiertas = await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.cuenta
         where local_id = ${aparato.localId}::uuid and camarero_id = ${personaId}::uuid
           and liberada_en is null and anulada_en is null
      `;
      if (abiertas.length > 0) {
        if (entrada.pasar_mesas_a === undefined) {
          throw new FalloDeAplicacion('faltan_datos', {
            porque: `Tienes ${String(abiertas.length)} ${abiertas.length === 1 ? 'mesa abierta' : 'mesas abiertas'}: di a quién se las pasas antes de fichar la salida.`,
          });
        }
        await pasarAOtroCamarero.ejecutar(contexto, {
          cuenta_ids: abiertas.map((c) => c.id),
          camarero_id: entrada.pasar_mesas_a,
        });
      }
    }

    await ficharEnElAparato(contexto, aparato, personaId, entrada.que);
    // Quien ficha la salida se va: el aparato vuelve al PIN.
    const turnoAcabado = entrada.que === 'salida';
    if (turnoAcabado) await acabarElTurno(contexto, 'salir');
    return { fichaje: await comoEsta(contexto, personaId, aparato.localId), turnoAcabado };
  },
});

// ═══ Fichar en la caja, sin entrar ═════════════════════════════════════════════

/**
 * **El botón naranja «Fichar» de la caja** (0115; Richi, 25-oct: «la caja la abre siempre
 * un gerente y ahí fichas y sales»): cada uno teclea su PIN y ficha, **sin entrar en la
 * caja**, como en el aparato de fichar de antes (0068). Primero quién es y cómo está, para
 * enseñarle solo lo que toca; después, lo que elige. Son comandos porque apuntan los fallos
 * del PIN, y no se recuerdan: guardarían un PIN acertado.
 */
async function laCajaQueFicha(contexto: Contexto, laLlave: string): Promise<AparatoDelTpv> {
  const aparato = await elAparatoDeLaLlave(contexto, laLlave);
  if (aparato.funcion !== 'caja') {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Se ficha en la caja, o en Estook con el móvil.',
    });
  }
  return aparato;
}

export const quienFichaEnLaCaja = comando<{ llave: string; pin: string }, QuienFichaAqui>({
  nombre: 'quien_ficha_en_la_caja',
  entrada: z.object({ llave, pin: z.string().trim().min(1).max(12) }).strict(),
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const aparato = await laCajaQueFicha(contexto, entrada.llave);
    const personaId = await quienEsElPin(contexto, aparato, entrada.pin);
    return comoEsta(contexto, personaId, aparato.localId);
  },
});

export const entradaFicharEnLaCaja = z
  .object({
    llave,
    pin: z.string().trim().min(1).max(12),
    que: z.enum(['entrada', 'pausa', 'vuelta', 'salida']),
  })
  .strict();

export const ficharEnLaCaja = comando<z.infer<typeof entradaFicharEnLaCaja>, QuienFichaAqui>({
  nombre: 'fichar_en_la_caja',
  entrada: entradaFicharEnLaCaja,
  sinSesion: true,
  // Repetirlo dice «ya estás fichado» o «no estás fichado»: el estado protege.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const aparato = await laCajaQueFicha(contexto, entrada.llave);
    const personaId = await quienEsElPin(contexto, aparato, entrada.pin);
    // Quien se va con mesas abiertas las pasa antes, dentro, a quien se quede.
    if (entrada.que === 'salida') {
      const abiertas = await contexto.sql<{ cuantas: number }[]>`
        select count(*)::int as cuantas from estook.cuenta
         where local_id = ${aparato.localId}::uuid and camarero_id = ${personaId}::uuid
           and liberada_en is null and anulada_en is null
      `;
      const cuantas = abiertas[0]?.cuantas ?? 0;
      if (cuantas > 0) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: `Tienes ${cuantas === 1 ? 'una mesa abierta' : `${String(cuantas)} mesas abiertas`}: entra con tu PIN, pásalas a quien se queda y ficha la salida.`,
        });
      }
    }
    await ficharEnElAparato(contexto, aparato, personaId, entrada.que);
    return comoEsta(contexto, personaId, aparato.localId);
  },
});

// ═══ Ajustes del TPV › Aparatos ═══════════════════════════════════════════════

export interface UnAparato {
  readonly id: string;
  readonly nombre: string;
  readonly funcion: FuncionDelAparato;
  readonly dueno: { readonly id: string; readonly nombre: string } | null;
  readonly cajon: { readonly id: string; readonly nombre: string } | null;
  /** Ha latido en los últimos dos minutos. */
  readonly enLinea: boolean;
  readonly vistoEn: string | null;
  readonly version: string | null;
  /** El móvil de alguien que ya no toma nota en el local ya no vale. */
  readonly vale: boolean;
}

export interface LosAparatos {
  readonly este: string;
  readonly aparatos: readonly UnAparato[];
  readonly cajones: readonly { readonly id: string; readonly nombre: string }[];
  readonly personas: readonly { readonly id: string; readonly nombre: string }[];
}

export const losAparatos = consulta<Record<string, never>, LosAparatos>({
  nombre: 'los_aparatos',
  entrada: z.object({}).strict(),
  exige: 'accion.vincular_aparatos',
  enElTpv: 'solo',
  // Los Ajustes del TPV, en la caja (0115).
  enLosAparatos: ['caja'],

  async ejecutar(contexto) {
    const aparato = await elAparatoDeLaSesion(contexto);
    const hace2 = new Date(contexto.ahora.getTime() - 2 * 60_000).toISOString();
    const [filas, cajones, personas] = await Promise.all([
      contexto.sql<
        {
          id: string;
          nombre: string;
          funcion: FuncionDelAparato;
          dueno_id: string | null;
          dueno: string | null;
          cajon_id: string | null;
          cajon: string | null;
          latido: Date | null;
          version: string | null;
          en_linea: boolean;
          vale: boolean;
        }[]
      >`
        select t.id::text as id, t.nombre, t.funcion,
               t.persona_id::text as dueno_id, d.nombre as dueno,
               t.cajon_id::text as cajon_id, c.nombre as cajon,
               coalesce(t.ultimo_latido_en, t.ultimo_uso_en) as latido,
               t.version_de_la_app as version,
               coalesce(t.ultimo_latido_en > ${hace2}::timestamptz, false) as en_linea,
               (t.persona_id is null
                or (d.activa and estook.nivel_de_permiso(t.persona_id, t.local_id, 'accion.tomar_nota') <> 'sin_acceso')
               ) as vale
          from estook.terminal t
          left join estook.persona d on d.id = t.persona_id
          left join estook.cajon c on c.id = t.cajon_id
         where t.local_id = ${aparato.localId}::uuid and t.retirado_en is null
         order by (t.id = ${aparato.terminalId}::uuid) desc,
                  array_position(array['caja', 'comandero', 'cocina', 'barra', 'fichar'], t.funcion),
                  t.nombre
      `,
      contexto.sql<{ id: string; nombre: string }[]>`
        select id::text as id, nombre from estook.cajon
         where local_id = ${aparato.localId}::uuid and retirado_en is null order by nombre
      `,
      quienesTomanNota(contexto, aparato.localId),
    ]);
    return {
      este: aparato.terminalId,
      aparatos: filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        funcion: f.funcion,
        dueno: f.dueno_id === null ? null : { id: f.dueno_id, nombre: f.dueno ?? '' },
        cajon: f.cajon_id === null ? null : { id: f.cajon_id, nombre: f.cajon ?? '' },
        enLinea: f.en_linea,
        vistoEn: f.latido === null ? null : new Date(f.latido).toISOString(),
        version: f.version,
        vale: f.vale,
      })),
      cajones,
      personas,
    };
  },
});

export const entradaCambiarAparato = z.object({ terminal_id: id, ...queSera }).strict();

export const cambiarAparato = comando<
  z.infer<typeof entradaCambiarAparato>,
  { terminalId: string }
>({
  nombre: 'cambiar_aparato',
  entrada: entradaCambiarAparato,
  exige: 'accion.vincular_aparatos',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const aparato = await elAparatoDeLaSesion(contexto);
    const preparado = await prepararLoQueSera(contexto, aparato.localId, entrada);
    const filas = await contexto.sql<{ id: string }[]>`
      update estook.terminal
         set nombre = ${entrada.nombre}, funcion = ${entrada.funcion},
             persona_id = ${preparado.personaId}::uuid, cajon_id = ${preparado.cajonId}::uuid
       where id = ${entrada.terminal_id}::uuid and local_id = ${aparato.localId}::uuid
         and retirado_en is null
      returning id::text as id
    `;
    if (filas.length === 0) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese aparato ya no está vinculado.' });
    }
    // Si cambia lo que es, quien estaba dentro vuelve a teclear su PIN.
    await enNombreDelSistema(
      contexto,
      () => contexto.sql`
        update estook.turno_del_operador
           set hasta = now(), por_que_acabo = 'otro_operador'
         where terminal_id = ${entrada.terminal_id}::uuid and hasta is null
           and id <> ${contexto.sesion?.id ?? null}::uuid
      `,
    );
    await apuntar(
      contexto,
      aparato.organizacionId,
      'cambiar',
      entrada.terminal_id,
      aparato.localId,
      {
        nombre: entrada.nombre,
        funcion: entrada.funcion,
      },
    );
    return { terminalId: entrada.terminal_id };
  },
});

export const desvincularAparato = comando<
  { terminal_id: string },
  { terminalId: string; eraEste: boolean }
>({
  nombre: 'desvincular_aparato',
  entrada: z.object({ terminal_id: id }).strict(),
  exige: 'accion.vincular_aparatos',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const aparato = await elAparatoDeLaSesion(contexto);
    const filas = await contexto.sql<{ id: string }[]>`
      update estook.terminal
         set retirado_en = ${contexto.ahora.toISOString()}::timestamptz,
             retirado_por = ${contexto.personaId}::uuid
       where id = ${entrada.terminal_id}::uuid and local_id = ${aparato.localId}::uuid
         and retirado_en is null
      returning id::text as id
    `;
    if (filas.length === 0) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese aparato ya no estaba vinculado.' });
    }
    // **Deja de valer en la petición siguiente**: su llave ya no resuelve, y su turno se cierra.
    await enNombreDelSistema(
      contexto,
      () => contexto.sql`
        update estook.turno_del_operador
           set hasta = now(), por_que_acabo = 'desvinculado'
         where terminal_id = ${entrada.terminal_id}::uuid and hasta is null
      `,
    );
    await apuntar(
      contexto,
      aparato.organizacionId,
      'desvincular',
      entrada.terminal_id,
      aparato.localId,
      null,
    );
    return { terminalId: entrada.terminal_id, eraEste: entrada.terminal_id === aparato.terminalId };
  },
});

// ═══ Ajustes del TPV › PIN y bloqueo ══════════════════════════════════════════

export const entradaPinYBloqueo = z
  .object({
    minutos: z
      .number()
      .int()
      .min(LIMITES_DEL_BLOQUEO.minutos.desde)
      .max(LIMITES_DEL_BLOQUEO.minutos.hasta),
    al_cobrar: z.boolean(),
    personal_minutos: z
      .number()
      .int()
      .min(LIMITES_DEL_BLOQUEO.personalMinutos.desde)
      .max(LIMITES_DEL_BLOQUEO.personalMinutos.hasta),
    solo_entra_quien_ficha: z.boolean(),
  })
  .strict();

export const guardarPinYBloqueo = comando<z.infer<typeof entradaPinYBloqueo>, AjustesDelBloqueo>({
  nombre: 'guardar_pin_y_bloqueo',
  entrada: entradaPinYBloqueo,
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const aparato = await elAparatoDeLaSesion(contexto);
    await contexto.sql`
      insert into estook.ajustes_del_tpv
        (local_id, bloqueo_minutos, bloqueo_al_cobrar, bloqueo_personal_minutos,
         solo_entra_quien_ficha, cambiado_por, cambiado_en)
      values (${aparato.localId}::uuid, ${entrada.minutos}, ${entrada.al_cobrar},
              ${entrada.personal_minutos}, ${entrada.solo_entra_quien_ficha},
              ${contexto.personaId}::uuid, ${contexto.ahora.toISOString()}::timestamptz)
      on conflict (local_id) do update
        set bloqueo_minutos = excluded.bloqueo_minutos,
            bloqueo_al_cobrar = excluded.bloqueo_al_cobrar,
            bloqueo_personal_minutos = excluded.bloqueo_personal_minutos,
            solo_entra_quien_ficha = excluded.solo_entra_quien_ficha,
            cambiado_por = excluded.cambiado_por,
            cambiado_en = excluded.cambiado_en
    `;
    await contexto.sql`
      select estook.anotar(
        ${aparato.organizacionId}::uuid, 'cambiar', 'ajustes_del_tpv', ${aparato.localId},
        ${aparato.localId}::uuid, null, ${JSON.stringify(entrada)}::text::jsonb, null
      )
    `;
    return losAjustesDelBloqueo(contexto, aparato.localId);
  },
});
