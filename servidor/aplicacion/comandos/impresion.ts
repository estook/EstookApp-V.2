import { z } from 'zod';
import {
  abrirElCajonEnPapel,
  esPapelCompuesto,
  laPruebaEnPapel,
  type PapelCompuesto,
} from '@estook/dominio';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { elLocalDelServicio, laCuentaAbierta, losPlatos } from '../sala.ts';
import {
  cuandoEnElLocal,
  dejarEnLaCola,
  laComandaALaCola,
  laCuentaALaCola,
  loDelLocalParaImprimir,
  type DondeSale,
} from '../impresion.ts';
import { tocarElServicio } from '../al-segundo.ts';
import { elAparatoDeLaLlave, soloEnLaCaja } from './aparatos.ts';

/**
 * **Imprimir y el cajón** (T5 · 1, decisión 0119; Anexo 6, 10.6 y 11.13).
 *
 * ── Ajustes del TPV › Impresoras y cajón, en la caja ─────────────────────────────
 *
 *   las_impresoras       las del local, sin su dirección (Anexo 6.8), y dónde sale cada cosa
 *   guardar_impresora    darla de alta o cambiarla: qué imprime, el cajón, la de reserva
 *   quitar_impresora     y lo suyo pendiente no sale
 *   imprimir_prueba      el papel de prueba, por la cola de siempre
 *   abrir_el_cajon       sin una venta, con motivo; queda en la auditoría
 *
 * ── En la sala ─────────────────────────────────────────────────────────────────
 *
 *   como_estan_las_impresoras  para la franja de «sin papel» y si la cocina es solo papel
 *   imprimir_la_cuenta         la precuenta, por la impresora de la caja
 *   reimprimir_la_comanda      lo ya mandado, otra vez, marcado «COPIA»
 *
 * ── La caja para Windows, con su llave y sin nadie dentro ──────────────────────
 *
 *   la_cola_de_la_caja   lo que tiene que imprimir, con la dirección de sus impresoras
 *   apuntar_lo_impreso   cómo salió cada trabajo y cómo está cada impresora
 */

const id = z.string().uuid();
const llave = z.string().trim().min(20).max(200);
const IMPRIME = ['cocina', 'barra', 'caja'] as const;
const ESTADOS = ['lista', 'poco_papel', 'sin_papel', 'no_responde'] as const;

type EstadoDeLaImpresora = 'sin_saber' | (typeof ESTADOS)[number];

async function apuntar(
  contexto: Contexto,
  accion: string,
  impresoraId: string,
  localId: string,
  despues: Record<string, unknown>,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, 'impresora', ${impresoraId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

function laCajaDeLaSesion(contexto: Contexto): string {
  const terminalId = contexto.sesion?.aparato?.terminalId ?? null;
  if (terminalId === null) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: 'Las impresoras se dan de alta en la caja.',
    });
  }
  return terminalId;
}

// ═══ Ajustes del TPV › Impresoras y cajón ═════════════════════════════════════════

export interface ImpresoraDelLocal {
  readonly id: string;
  readonly nombre: string;
  readonly modelo: string | null;
  readonly anchoMm: 58 | 80;
  readonly imprime: readonly (typeof IMPRIME)[number][];
  readonly tieneCajon: boolean;
  readonly reservaId: string | null;
  readonly estado: EstadoDeLaImpresora;
  readonly vistoEn: string | null;
  /** La caja que la imprime, por su nombre. */
  readonly laImprime: string;
  /** Si la imprime este mismo aparato. */
  readonly deEstaCaja: boolean;
}

export interface LasImpresoras {
  readonly impresoras: readonly ImpresoraDelLocal[];
  readonly cocinaSaleEn: DondeSale;
  readonly barraSaleEn: DondeSale;
}

interface FilaDeImpresora {
  id: string;
  nombre: string;
  modelo: string | null;
  ancho_mm: number;
  imprime: string[];
  tiene_cajon: boolean;
  reserva_id: string | null;
  estado: EstadoDeLaImpresora;
  visto_en: string | null;
  terminal_id: string;
  la_imprime: string | null;
}

async function lasDelLocal(contexto: Contexto, localId: string): Promise<LasImpresoras> {
  // **Sin la dirección** (Anexo 6.8): solo la lee la caja que la imprime, con su llave.
  const [filas, local] = await Promise.all([
    contexto.sql<FilaDeImpresora[]>`
      select i.id::text as id, i.nombre, i.modelo, i.ancho_mm, i.imprime, i.tiene_cajon,
             i.reserva_id::text as reserva_id, i.estado,
             to_char(i.visto_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as visto_en,
             i.terminal_id::text as terminal_id, t.nombre as la_imprime
        from estook.impresora i
        left join estook.terminal t on t.id = i.terminal_id
       where i.local_id = ${localId}::uuid and i.retirada_en is null
       order by i.creada_en
    `,
    loDelLocalParaImprimir(contexto, localId),
  ]);
  if (local === null) throw new FalloDeAplicacion('local_ajeno');
  const estaCaja = contexto.sesion?.aparato?.terminalId ?? null;
  return {
    impresoras: filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      modelo: f.modelo,
      anchoMm: f.ancho_mm === 58 ? 58 : 80,
      imprime: f.imprime.filter((i): i is (typeof IMPRIME)[number] =>
        (IMPRIME as readonly string[]).includes(i),
      ),
      tieneCajon: f.tiene_cajon,
      reservaId: f.reserva_id,
      estado: f.estado,
      vistoEn: f.visto_en,
      laImprime: f.la_imprime ?? 'Una caja',
      deEstaCaja: f.terminal_id === estaCaja,
    })),
    cocinaSaleEn: local.cocinaSaleEn,
    barraSaleEn: local.barraSaleEn,
  };
}

export const lasImpresoras = consulta<Record<string, never>, LasImpresoras>({
  nombre: 'las_impresoras',
  entrada: z.object({}).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto) {
    return lasDelLocal(contexto, elLocalDelServicio(contexto));
  },
});

export const entradaGuardarImpresora = z
  .object({
    impresora_id: id.optional(),
    nombre: z.string().trim().min(1).max(40),
    modelo: z.string().trim().max(80).nullable().optional(),
    // «192.168.1.50:9100», como la encontró la caja. Al cambiar una, puede no venir.
    direccion: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z.:[\]_-]{3,120}$/)
      .optional(),
    ancho_mm: z.union([z.literal(58), z.literal(80)]).optional(),
    imprime: z.array(z.enum(IMPRIME)).max(3),
    tiene_cajon: z.boolean().optional(),
    reserva_id: id.nullable().optional(),
  })
  .strict();

export const guardarImpresora = comando<z.infer<typeof entradaGuardarImpresora>, LasImpresoras>({
  nombre: 'guardar_impresora',
  entrada: entradaGuardarImpresora,
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    const terminalId = laCajaDeLaSesion(contexto);
    const imprime = [...new Set(entrada.imprime)];
    const anchoMm = entrada.ancho_mm ?? 80;
    const tieneCajon = entrada.tiene_cajon ?? false;
    if (entrada.reserva_id !== undefined && entrada.reserva_id !== null) {
      if (entrada.reserva_id === entrada.impresora_id) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'Una impresora no puede ser su propia reserva.',
        });
      }
      const reserva = await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.impresora
         where id = ${entrada.reserva_id}::uuid and local_id = ${localId}::uuid and retirada_en is null
      `;
      if (reserva.length === 0) throw new FalloDeAplicacion('no_existe');
    }
    const repetida = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.impresora
       where local_id = ${localId}::uuid and retirada_en is null
         and lower(btrim(nombre)) = lower(btrim(${entrada.nombre}))
         and id is distinct from ${entrada.impresora_id ?? null}::uuid
    `;
    if (repetida.length > 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['nombre'],
        porque: `Ya hay una impresora que se llama «${entrada.nombre}».`,
      });
    }

    let impresoraId = entrada.impresora_id ?? null;
    if (impresoraId === null) {
      if (entrada.direccion === undefined) {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'Búscala desde la caja para Windows: ella sabe dónde está.',
        });
      }
      const filas = await contexto.sql<{ id: string }[]>`
        insert into estook.impresora
          (local_id, terminal_id, nombre, modelo, direccion, ancho_mm, imprime, tiene_cajon,
           reserva_id, estado, visto_en, creada_por, creada_en)
        values (${localId}::uuid, ${terminalId}::uuid, ${entrada.nombre}, ${entrada.modelo ?? null},
                ${entrada.direccion}, ${anchoMm}, ${imprime}::text[], ${tieneCajon},
                ${entrada.reserva_id ?? null}::uuid, 'lista',
                ${contexto.ahora.toISOString()}::timestamptz, ${contexto.personaId}::uuid,
                ${contexto.ahora.toISOString()}::timestamptz)
        returning id::text as id
      `;
      impresoraId = filas[0]?.id ?? null;
      if (impresoraId === null) throw new FalloDeAplicacion('sin_permiso');
      await apuntar(contexto, 'dar_de_alta_impresora', impresoraId, localId, {
        nombre: entrada.nombre,
        imprime,
        tieneCajon,
      });
    } else {
      const filas = await contexto.sql<{ id: string }[]>`
        update estook.impresora
           set nombre = ${entrada.nombre},
               modelo = coalesce(${entrada.modelo ?? null}, modelo),
               direccion = coalesce(${entrada.direccion ?? null}, direccion),
               -- Si la vuelve a encontrar otra caja, pasa a imprimirla esa.
               terminal_id = case when ${entrada.direccion ?? null}::text is null
                                  then terminal_id else ${terminalId}::uuid end,
               ancho_mm = ${anchoMm},
               imprime = ${imprime}::text[],
               tiene_cajon = ${tieneCajon},
               reserva_id = ${entrada.reserva_id ?? null}::uuid
         where id = ${impresoraId}::uuid and local_id = ${localId}::uuid and retirada_en is null
        returning id::text as id
      `;
      if (filas.length === 0) throw new FalloDeAplicacion('no_existe');
      await apuntar(contexto, 'cambiar_impresora', impresoraId, localId, {
        nombre: entrada.nombre,
        imprime,
        tieneCajon,
      });
    }
    return lasDelLocal(contexto, localId);
  },
});

export const quitarImpresora = comando<{ impresora_id: string }, LasImpresoras>({
  nombre: 'quitar_impresora',
  entrada: z.object({ impresora_id: id }).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    const filas = await contexto.sql<{ nombre: string }[]>`
      update estook.impresora set retirada_en = ${contexto.ahora.toISOString()}::timestamptz
       where id = ${entrada.impresora_id}::uuid and local_id = ${localId}::uuid and retirada_en is null
      returning nombre
    `;
    if (filas.length === 0) throw new FalloDeAplicacion('no_existe');
    // Las que la tenían de reserva se quedan sin ella.
    await contexto.sql`
      update estook.impresora set reserva_id = null
       where local_id = ${localId}::uuid and reserva_id = ${entrada.impresora_id}::uuid
    `;
    await apuntar(contexto, 'quitar_impresora', entrada.impresora_id, localId, {
      nombre: filas[0]?.nombre ?? null,
    });
    return lasDelLocal(contexto, localId);
  },
});

async function laImpresoraDelLocal(
  contexto: Contexto,
  localId: string,
  impresoraId: string,
): Promise<{ nombre: string; imprime: string[]; tiene_cajon: boolean }> {
  const filas = await contexto.sql<{ nombre: string; imprime: string[]; tiene_cajon: boolean }[]>`
    select nombre, imprime, tiene_cajon from estook.impresora
     where id = ${impresoraId}::uuid and local_id = ${localId}::uuid and retirada_en is null
  `;
  const fila = filas[0];
  if (fila === undefined) throw new FalloDeAplicacion('no_existe');
  return fila;
}

const NOMBRE_DE_LO_QUE_IMPRIME: Record<string, string> = {
  cocina: 'Cocina',
  barra: 'Barra',
  caja: 'Caja (la cuenta y el ticket)',
};

export const imprimirPrueba = comando<{ impresora_id: string }, { trabajoId: string }>({
  nombre: 'imprimir_prueba',
  entrada: z.object({ impresora_id: id }).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    const [impresora, local] = await Promise.all([
      laImpresoraDelLocal(contexto, localId, entrada.impresora_id),
      loDelLocalParaImprimir(contexto, localId),
    ]);
    if (local === null) throw new FalloDeAplicacion('local_ajeno');
    const papel = laPruebaEnPapel({
      local: local.nombre,
      impresora: impresora.nombre,
      cuando: cuandoEnElLocal(contexto.ahora, local.zonaHoraria),
      imprime: impresora.imprime.map((i) => NOMBRE_DE_LO_QUE_IMPRIME[i] ?? i),
    });
    const trabajoId = await dejarEnLaCola(
      contexto,
      localId,
      entrada.impresora_id,
      'prueba',
      papel,
      null,
    );
    return { trabajoId };
  },
});

/**
 * **Abrir el cajón sin una venta** (Anexo 10.6; Roles 1.12): con permiso y motivo, solo en la
 * caja (un comandero no abre un cajón aunque teclee el gerente), y queda quién y cuándo. Con el
 * cobro (T7), cada apertura sale también en el informe X y en el Z.
 */
export const abrirElCajon = comando<{ motivo: string }, { trabajoId: string }>({
  nombre: 'abrir_el_cajon',
  entrada: z.object({ motivo: z.string().trim().min(3).max(200) }).strict(),
  exige: 'accion.abrir_el_cajon',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    const terminalId = laCajaDeLaSesion(contexto);
    // El cajón de esta caja está enchufado a una impresora que imprime esta caja.
    const filas = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.impresora
       where local_id = ${localId}::uuid and terminal_id = ${terminalId}::uuid
         and tiene_cajon and retirada_en is null
       order by creada_en
       limit 1
    `;
    const impresoraId = filas[0]?.id;
    if (impresoraId === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esta caja no tiene ninguna impresora con el cajón enchufado.',
      });
    }
    const trabajoId = await dejarEnLaCola(
      contexto,
      localId,
      impresoraId,
      'cajon',
      abrirElCajonEnPapel(),
      null,
    );
    await apuntar(contexto, 'abrir_el_cajon', impresoraId, localId, {
      motivo: entrada.motivo,
      sinVenta: true,
    });
    return { trabajoId };
  },
});

// ═══ En la sala ═══════════════════════════════════════════════════════════════════

export interface ComoEstanLasImpresoras {
  readonly cocinaSaleEn: DondeSale;
  readonly barraSaleEn: DondeSale;
  /** Si hay dónde imprimir la cuenta, y si lo de la cocina o la barra sale en papel. */
  readonly hayParaLaCuenta: boolean;
  readonly hayParaLaComanda: boolean;
  /** Lo que pide mirar ya: sin papel, sin responder, o con papeles que no salen. */
  readonly avisos: readonly {
    readonly impresora: string;
    readonly que: 'sin_papel' | 'no_responde' | 'no_sale';
    readonly sinSalir: number;
  }[];
}

/** A los cuántos segundos un papel que no sale es un aviso. */
const SIN_SALIR_SEGUNDOS = 30;

export const comoEstanLasImpresoras = consulta<Record<string, never>, ComoEstanLasImpresoras>({
  nombre: 'como_estan_las_impresoras',
  entrada: z.object({}).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const desde = new Date(contexto.ahora.getTime() - SIN_SALIR_SEGUNDOS * 1000).toISOString();
    const [local, filas] = await Promise.all([
      loDelLocalParaImprimir(contexto, localId),
      contexto.sql<
        { nombre: string; estado: EstadoDeLaImpresora; imprime: string[]; sin_salir: number }[]
      >`
        select i.nombre, i.estado, i.imprime,
               (select count(*)::int from estook.trabajo_de_impresion t
                 where t.impresora_id = i.id and t.estado in ('pendiente', 'entregado')
                   and t.creado_en < ${desde}::timestamptz) as sin_salir
          from estook.impresora i
         where i.local_id = ${localId}::uuid and i.retirada_en is null
         order by i.creada_en
      `,
    ]);
    if (local === null) throw new FalloDeAplicacion('local_ajeno');
    const imprimen = (que: string) => filas.some((f) => f.imprime.includes(que));
    return {
      cocinaSaleEn: local.cocinaSaleEn,
      barraSaleEn: local.barraSaleEn,
      hayParaLaCuenta: imprimen('caja'),
      hayParaLaComanda:
        (local.cocinaSaleEn !== 'pantalla' && imprimen('cocina')) ||
        (local.barraSaleEn !== 'pantalla' && imprimen('barra')),
      avisos: filas.flatMap((f): ComoEstanLasImpresoras['avisos'][number][] => {
        if (f.estado === 'sin_papel' || f.estado === 'no_responde') {
          return [{ impresora: f.nombre, que: f.estado, sinSalir: f.sin_salir }];
        }
        return f.sin_salir > 0
          ? [{ impresora: f.nombre, que: 'no_sale', sinSalir: f.sin_salir }]
          : [];
      }),
    };
  },
});

export const imprimirLaCuenta = comando<{ cuenta_id: string }, { trabajoId: string }>({
  nombre: 'imprimir_la_cuenta',
  entrada: z.object({ cuenta_id: id }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    const trabajoId = await laCuentaALaCola(contexto, localId, entrada.cuenta_id, false);
    if (trabajoId === null) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'No hay ninguna impresora para la cuenta: dala de alta en la caja.',
      });
    }
    return { trabajoId };
  },
});

export const reimprimirLaComanda = comando<{ cuenta_id: string }, { papeles: number }>({
  nombre: 'reimprimir_la_comanda',
  entrada: z.object({ cuenta_id: id }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    await laCuentaAbierta(contexto, localId, entrada.cuenta_id);
    const mandados = (await losPlatos(contexto, [entrada.cuenta_id])).filter(
      (l) => l.mandada_en !== null && l.quitada_en === null,
    );
    const papeles = await laComandaALaCola(contexto, localId, entrada.cuenta_id, {
      que: 'nueva',
      lineaIds: mandados.map((l) => l.id),
      copia: true,
    });
    if (papeles === 0) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'No hay nada mandado que salga en papel en esta mesa.',
      });
    }
    return { papeles };
  },
});

// ═══ La caja para Windows, con su llave ════════════════════════════════════════════

export interface TrabajoParaLaCaja {
  readonly id: string;
  readonly tipo: string;
  readonly papel: PapelCompuesto;
  readonly intentos: number;
  readonly impresora: {
    readonly id: string;
    readonly nombre: string;
    readonly direccion: string;
    readonly anchoMm: 58 | 80;
  };
  /** Su reserva, si también la imprime esta caja. */
  readonly reserva: {
    readonly id: string;
    readonly direccion: string;
    readonly anchoMm: 58 | 80;
  } | null;
}

export interface LaColaDeLaCaja {
  readonly trabajos: readonly TrabajoParaLaCaja[];
  /** El tema al segundo de la caja: lo escucha para enterarse al momento. */
  readonly temaAlSegundo: string | null;
  /** Las impresoras que imprime, con su dirección, para mirar cómo están. */
  readonly impresoras: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly direccion: string;
  }[];
}

async function laCajaDeLaLlave(contexto: Contexto, laLlave: string) {
  const aparato = await elAparatoDeLaLlave(contexto, laLlave);
  if (aparato.funcion !== 'caja') {
    throw new FalloDeAplicacion('sin_permiso', { porque: 'Imprime la caja.' });
  }
  return aparato;
}

const ancho = (mm: number): 58 | 80 => (mm === 58 ? 58 : 80);

export const laColaDeLaCaja = comando<{ llave: string }, LaColaDeLaCaja>({
  nombre: 'la_cola_de_la_caja',
  entrada: z.object({ llave }).strict(),
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const caja = await laCajaDeLaLlave(contexto, entrada.llave);
    const [filas, impresoras] = await Promise.all([
      contexto.sql<
        {
          trabajo_id: string;
          tipo: string;
          papel: unknown;
          intentos: number;
          impresora_id: string;
          impresora: string;
          direccion: string;
          ancho_mm: number;
          reserva_id: string | null;
          reserva_direccion: string | null;
          reserva_ancho_mm: number | null;
        }[]
      >`
        select trabajo_id::text as trabajo_id, tipo, papel, intentos, impresora_id::text as impresora_id,
               impresora, direccion, ancho_mm, reserva_id::text as reserva_id, reserva_direccion,
               reserva_ancho_mm
          from estook.la_cola_de_la_caja(${caja.terminalId}::uuid, ${contexto.ahora.toISOString()}::timestamptz)
      `,
      contexto.sql<{ id: string; nombre: string; direccion: string }[]>`
        select impresora_id::text as id, impresora as nombre, direccion
          from estook.las_impresoras_de_la_caja(${caja.terminalId}::uuid)
      `,
    ]);
    return {
      temaAlSegundo: caja.temaAlSegundo,
      impresoras,
      trabajos: filas.flatMap((f) => {
        // Lo que no es un papel que se sabe imprimir no se manda: se queda y se ve que no sale.
        if (!esPapelCompuesto(f.papel)) return [];
        return [
          {
            id: f.trabajo_id,
            tipo: f.tipo,
            papel: f.papel,
            intentos: f.intentos,
            impresora: {
              id: f.impresora_id,
              nombre: f.impresora,
              direccion: f.direccion,
              anchoMm: ancho(f.ancho_mm),
            },
            reserva:
              f.reserva_id === null || f.reserva_direccion === null
                ? null
                : {
                    id: f.reserva_id,
                    direccion: f.reserva_direccion,
                    anchoMm: ancho(f.reserva_ancho_mm ?? 80),
                  },
          },
        ];
      }),
    };
  },
});

export const entradaApuntarLoImpreso = z
  .object({
    llave,
    trabajos: z
      .array(
        z
          .object({
            id,
            salio: z.boolean(),
            por_la_reserva: z.boolean().optional(),
            error: z.string().trim().max(300).nullable().optional(),
          })
          .strict(),
      )
      .max(100),
    impresoras: z
      .array(z.object({ id, estado: z.enum(ESTADOS) }).strict())
      .max(50)
      .optional(),
  })
  .strict();

export const apuntarLoImpreso = comando<
  z.infer<typeof entradaApuntarLoImpreso>,
  { apuntados: number }
>({
  nombre: 'apuntar_lo_impreso',
  entrada: entradaApuntarLoImpreso,
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const caja = await laCajaDeLaLlave(contexto, entrada.llave);
    const ahora = contexto.ahora.toISOString();
    let apuntados = 0;
    for (const t of entrada.trabajos) {
      const filas = await contexto.sql<{ apuntado: boolean }[]>`
        select estook.apuntar_lo_impreso(
          ${caja.terminalId}::uuid, ${t.id}::uuid, ${t.salio}, ${t.por_la_reserva ?? false},
          ${t.error ?? null}, ${ahora}::timestamptz
        ) as apuntado
      `;
      if (filas[0]?.apuntado === true) apuntados += 1;
    }
    const impresoras = entrada.impresoras ?? [];
    for (const i of impresoras) {
      await contexto.sql`
        select estook.apuntar_como_esta_la_impresora(
          ${caja.terminalId}::uuid, ${i.id}::uuid, ${i.estado}, ${ahora}::timestamptz
        )
      `;
    }
    // Si algo no sale, la sala lo ve al momento en su franja.
    const algoNoSale =
      entrada.trabajos.some((t) => !t.salio) ||
      impresoras.some((i) => i.estado === 'sin_papel' || i.estado === 'no_responde');
    if (algoNoSale) await tocarElServicio(contexto, caja.localId);
    return { apuntados };
  },
});
