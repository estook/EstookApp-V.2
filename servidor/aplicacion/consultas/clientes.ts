import { z } from 'zod';
import {
  comoEstaLaCuenta,
  cuotaAlMes,
  estaEnLaPestana,
  laCuota,
  type ActividadDeCliente,
  type CodigoDePlan,
  type ComoEstaLaCuenta,
  type EstadoDeSuscripcion,
  type FechaOperativa,
  type Intervalo,
  type PestanaDeClientes,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { hoyEnMadrid } from '../pago.ts';

/**
 * Los clientes, en el admin (A2 · decisión 0041 · panel de administración 2).
 *
 * **El cliente es la organización.** De cada uno, su contrato —cómo está su cuenta,
 * que lo cuenta el dominio con lo que dice Stripe— y su actividad —la foto de la
 * noche—, separados. Y nada de dentro del restaurante: lo que se lee pasa por
 * funciones que devuelven lo justo (`estook.los_clientes`, `estook.un_cliente`).
 *
 * **Se busca, se filtra y se ordena en el servidor** (regla 51): la lista llega de
 * cincuenta en cincuenta y nunca se filtra lo ya cargado.
 */

export interface ClienteEnLista {
  readonly organizacionId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly esEjemplo: boolean;
  /** El día de alta, `AAAA-MM-DD`. */
  readonly alta: string;
  readonly diasDeCliente: number;
  readonly como: ComoEstaLaCuenta;
  readonly diasQuedan: number | null;
  readonly estado: string;
  readonly plan: string | null;
  readonly intervalo: string | null;
  readonly locales: number;
  /** Lo que paga en cada cobro —al mes o al año—, en céntimos. Nulo sin plan o de la casa. */
  readonly cuota: number | null;
  /** Lo que deja al mes, en céntimos: la columna «Cuota/mes». Nulo sin plan o de la casa. */
  readonly cuotaAlMes: number | null;
  readonly ultimoAcceso: string | null;
  readonly diasSinEntrar: number | null;
  /** La de la última foto. Nula si todavía no ha pasado ninguna noche. */
  readonly actividad: ActividadDeCliente | null;
  readonly tipo: 'independiente' | 'grupo' | 'cadena';
  readonly correos: readonly string[];
  readonly cancelaAlAcabar: boolean;
  readonly deLaCasa: boolean;
  readonly pruebaHasta: string | null;
  readonly periodoHasta: string | null;
  readonly impagoDesde: string | null;
  readonly tarjeta: string | null;
  readonly conStripe: boolean;
  /** Para «Abrir en Stripe»: el cliente de Stripe y si es del modo de prueba. */
  readonly stripe: { readonly cliente: string; readonly prueba: boolean } | null;
}

interface FilaDeCliente {
  organizacion_id: string;
  codigo: string;
  nombre: string;
  es_ejemplo: boolean;
  alta: string;
  estado: string;
  plan: string | null;
  intervalo: string | null;
  locales_pagados: number | null;
  locales_activos: number;
  prueba_hasta: string | null;
  periodo_hasta: string | null;
  cancela_al_acabar: boolean;
  impago_desde: string | null;
  de_la_casa: boolean;
  stripe_suscripcion: string | null;
  stripe_cliente: string | null;
  stripe_modo: string | null;
  tarjeta: string | null;
  correos: string[];
  ultimo_acceso: string | null;
  buscable: string;
}

const DIA_MS = 86_400_000;

/** Todos los clientes, ya contados: el contrato por el dominio, la actividad de la foto. */
export async function losClientes(contexto: Contexto): Promise<{
  readonly clientes: readonly (ClienteEnLista & { buscable: string })[];
  readonly foto: string | null;
}> {
  const filas = await contexto.sql<FilaDeCliente[]>`
    select organizacion_id, codigo, nombre, es_ejemplo, alta::text as alta, estado, plan, intervalo,
           locales_pagados, locales_activos, to_char(prueba_hasta, 'YYYY-MM-DD') as prueba_hasta,
           periodo_hasta::text as periodo_hasta, cancela_al_acabar, impago_desde::text as impago_desde,
           de_la_casa, stripe_suscripcion, stripe_cliente, stripe_modo, tarjeta, correos,
           ultimo_acceso::text as ultimo_acceso, buscable
      from estook.los_clientes()
  `;
  const fotos = await contexto.sql<{ organizacion_id: string; dia: string; actividad: string }[]>`
    select distinct on (organizacion_id) organizacion_id, dia::text as dia, actividad
      from plataforma.uso_diario
     order by organizacion_id, dia desc
  `;
  const fichas = await contexto.sql<{ organizacion_id: string; tipo: string | null }[]>`
    select organizacion_id, tipo from plataforma.ficha_comercial
  `;
  const actividadDe = new Map(fotos.map((f) => [f.organizacion_id, f.actividad]));
  const tipoDe = new Map(fichas.map((f) => [f.organizacion_id, f.tipo]));
  const foto = fotos.reduce<string | null>(
    (ultima, f) => (ultima === null || f.dia > ultima ? f.dia : ultima),
    null,
  );

  const hoy = hoyEnMadrid(contexto.ahora);
  const ahora = contexto.ahora.getTime();

  const clientes = filas.map((f) => {
    const plan = f.plan as CodigoDePlan | null;
    const intervalo = (f.intervalo ?? 'mes') as Intervalo;
    const locales = Math.max(1, f.locales_pagados ?? f.locales_activos);
    const cuenta = comoEstaLaCuenta(
      {
        estado: f.estado as EstadoDeSuscripcion,
        plan,
        pruebaHasta: f.prueba_hasta as FechaOperativa | null,
        impagoDesde: f.impago_desde === null ? null : new Date(f.impago_desde),
        deLaCasa: f.de_la_casa,
        esEjemplo: f.es_ejemplo,
        conStripe: f.stripe_suscripcion !== null,
      },
      contexto.ahora,
      hoy,
    );
    const alta = new Date(f.alta);
    const ultimo = f.ultimo_acceso === null ? null : new Date(f.ultimo_acceso);
    const tipoPuesto = tipoDe.get(f.organizacion_id) ?? null;
    const cuota = plan === null || f.de_la_casa ? null : laCuota(plan, intervalo, locales);
    return {
      organizacionId: f.organizacion_id,
      codigo: f.codigo,
      nombre: f.nombre,
      esEjemplo: f.es_ejemplo,
      alta: alta.toISOString().slice(0, 10),
      diasDeCliente: Math.max(0, Math.trunc((ahora - alta.getTime()) / DIA_MS)),
      como: cuenta.como,
      diasQuedan: cuenta.diasQuedan,
      estado: f.estado,
      plan: f.plan,
      intervalo: f.intervalo,
      locales: f.locales_activos,
      cuota,
      cuotaAlMes: cuota === null ? null : cuotaAlMes(cuota, f.intervalo as 'mes' | 'ano' | null),
      ultimoAcceso: ultimo?.toISOString() ?? null,
      diasSinEntrar:
        ultimo === null ? null : Math.max(0, Math.trunc((ahora - ultimo.getTime()) / DIA_MS)),
      actividad: (actividadDe.get(f.organizacion_id) ?? null) as ActividadDeCliente | null,
      tipo: (tipoPuesto ??
        (f.locales_activos > 1 ? 'grupo' : 'independiente')) as ClienteEnLista['tipo'],
      correos: f.correos,
      cancelaAlAcabar: f.cancela_al_acabar,
      deLaCasa: f.de_la_casa,
      pruebaHasta: f.prueba_hasta,
      periodoHasta: f.periodo_hasta === null ? null : new Date(f.periodo_hasta).toISOString(),
      impagoDesde: f.impago_desde === null ? null : new Date(f.impago_desde).toISOString(),
      tarjeta: f.tarjeta,
      conStripe: f.stripe_suscripcion !== null,
      stripe:
        f.stripe_cliente === null
          ? null
          : { cliente: f.stripe_cliente, prueba: f.stripe_modo !== 'real' },
      buscable: f.buscable,
    };
  });
  return { clientes, foto };
}

/** Lo buscable es para buscar en el servidor: no sale. */
function sinLoBuscable({
  buscable: _,
  ...cliente
}: ClienteEnLista & { buscable: string }): ClienteEnLista {
  return cliente;
}

// ── La lista ─────────────────────────────────────────────────────────────────

const PESTANAS = ['todos', 'prueba', 'pagando', 'se_van', 'baja'] as const;
const ORDENES = ['nombre', 'alta', 'ultimo_acceso', 'cuota', 'contrato', 'actividad'] as const;
const COMOS = ['al_dia', 'prueba', 'impago', 'solo_lectura', 'sin_pagar'] as const;
const ACTIVIDADES = ['activo', 'bajando', 'dormido', 'sin_estrenar', 'mira'] as const;

/** Lo que se busca: sin acentos y en minúsculas, como lo buscable que da la base. */
export function comoSeBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export const entradaLosClientes = z
  .object({
    pestana: z.enum(PESTANAS).optional(),
    buscar: z.string().trim().max(120).optional(),
    contrato: z.enum(COMOS).optional(),
    actividad: z.enum(ACTIVIDADES).optional(),
    plan: z.enum(['esencial', 'pro', 'cadena', 'pausa', 'sin_plan']).optional(),
    tipo: z.enum(['independiente', 'grupo', 'cadena']).optional(),
    ejemplos: z.enum(['si', 'no']).optional(),
    /** Por tramos: dados de alta en los últimos 30 o 90 días, o antes. */
    alta: z.enum(['30', '90', 'antes']).optional(),
    /** Por tramos: la última vez que entró alguien de su gente. */
    acceso: z.enum(['hoy', '7', '30', 'mas', 'nunca']).optional(),
    orden: z.enum(ORDENES).optional(),
    sentido: z.enum(['asc', 'desc']).optional(),
    desde: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export type EntradaLosClientes = z.infer<typeof entradaLosClientes>;

export interface SalidaLosClientes {
  readonly clientes: readonly ClienteEnLista[];
  readonly total: number;
  readonly hayMas: boolean;
  /** Cuántos hay en cada pestaña, con lo buscado y filtrado. */
  readonly porPestana: Readonly<Record<PestanaDeClientes, number>>;
  /** El día de la última foto del uso. Nulo: todavía ninguna. */
  readonly foto: string | null;
  /**
   * Lo que se cobra, de todos y sin filtros: quién paga y cuánto, con el IVA. Lo
   * mensual y lo anual, cada uno en lo suyo: repartir un año en doce sería redondear
   * dinero (regla 9). Sin los ejemplos ni los de la casa.
   */
  readonly cobro: { readonly pagan: number; readonly alMes: number; readonly alAno: number };
}

/** De cincuenta en cincuenta: con mil clientes, la lista no puede cargarlos todos. */
export const CLIENTES_POR_VEZ = 50;

const ORDEN_DEL_CONTRATO: Readonly<Record<ComoEstaLaCuenta, number>> = {
  impago: 0,
  solo_lectura: 1,
  sin_pagar: 2,
  prueba: 3,
  al_dia: 4,
};
const ORDEN_DE_LA_ACTIVIDAD: Readonly<Record<ActividadDeCliente, number>> = {
  dormido: 0,
  bajando: 1,
  sin_estrenar: 2,
  mira: 3,
  activo: 4,
};

/** Los que caben con esos filtros, sin la pestaña. Lo usan la lista y el CSV. */
export function losQueCaben(
  clientes: readonly (ClienteEnLista & { buscable: string })[],
  e: EntradaLosClientes,
): (ClienteEnLista & { buscable: string })[] {
  const buscado = comoSeBusca(e.buscar ?? '');
  return clientes.filter(
    (c) =>
      (e.ejemplos === 'si' || !c.esEjemplo) &&
      (buscado === '' || c.buscable.includes(buscado)) &&
      (e.contrato === undefined || c.como === e.contrato) &&
      (e.actividad === undefined || c.actividad === e.actividad) &&
      (e.plan === undefined || (e.plan === 'sin_plan' ? c.plan === null : c.plan === e.plan)) &&
      (e.tipo === undefined || c.tipo === e.tipo) &&
      (e.alta === undefined || enElTramoDeAlta(e.alta, c.diasDeCliente)) &&
      (e.acceso === undefined || enElTramoDeAcceso(e.acceso, c.diasSinEntrar)),
  );
}

function enElTramoDeAlta(tramo: '30' | '90' | 'antes', dias: number): boolean {
  if (tramo === '30') return dias <= 30;
  if (tramo === '90') return dias <= 90;
  return dias > 90;
}

function enElTramoDeAcceso(
  tramo: 'hoy' | '7' | '30' | 'mas' | 'nunca',
  dias: number | null,
): boolean {
  if (tramo === 'nunca') return dias === null;
  if (dias === null) return false;
  if (tramo === 'hoy') return dias === 0;
  if (tramo === '7') return dias <= 7;
  if (tramo === '30') return dias <= 30;
  return dias > 30;
}

/** Lo que se cobra: los que pagan de verdad, sin ejemplos ni los de la casa. */
function loQueSeCobra(clientes: readonly ClienteEnLista[]): SalidaLosClientes['cobro'] {
  const pagan = clientes.filter(
    (c) => !c.esEjemplo && !c.deLaCasa && (c.como === 'al_dia' || c.como === 'impago'),
  );
  const cuanto = (intervalo: 'mes' | 'ano') =>
    pagan
      .filter((c) => (c.intervalo ?? 'mes') === intervalo)
      .reduce((suma, c) => suma + (c.cuota ?? 0), 0);
  return { pagan: pagan.length, alMes: cuanto('mes'), alAno: cuanto('ano') };
}

export function ordenar<T extends ClienteEnLista>(
  clientes: readonly T[],
  orden: (typeof ORDENES)[number],
  sentido: 'asc' | 'desc',
): T[] {
  const signo = sentido === 'asc' ? 1 : -1;
  const valor = (c: ClienteEnLista): number | string => {
    switch (orden) {
      case 'nombre':
        return comoSeBusca(c.nombre);
      case 'alta':
        return c.alta;
      case 'ultimo_acceso':
        return c.ultimoAcceso ?? '';
      case 'cuota':
        return c.cuotaAlMes ?? -1;
      case 'contrato':
        return ORDEN_DEL_CONTRATO[c.como];
      case 'actividad':
        return c.actividad === null ? 99 : ORDEN_DE_LA_ACTIVIDAD[c.actividad];
    }
  };
  return [...clientes].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (va === vb) return a.nombre.localeCompare(b.nombre, 'es') * signo;
    return (va < vb ? -1 : 1) * signo;
  });
}

export const adminLosClientes = consulta<EntradaLosClientes, SalidaLosClientes>({
  nombre: 'admin_los_clientes',
  entrada: entradaLosClientes,
  soloAdmin: true,

  async ejecutar(contexto, e) {
    const { clientes, foto } = await losClientes(contexto);
    const caben = losQueCaben(clientes, e);
    const pestana = e.pestana ?? 'todos';
    const porPestana = Object.fromEntries(
      PESTANAS.map((p) => [p, caben.filter((c) => estaEnLaPestana(p, c)).length]),
    ) as Record<PestanaDeClientes, number>;
    const enLaPestana = caben.filter((c) => estaEnLaPestana(pestana, c));
    const ordenados = ordenar(enLaPestana, e.orden ?? 'alta', e.sentido ?? 'desc');
    const desde = e.desde ?? 0;
    const trozo = ordenados.slice(desde, desde + CLIENTES_POR_VEZ);
    return {
      clientes: trozo.map(sinLoBuscable),
      total: ordenados.length,
      hayMas: desde + CLIENTES_POR_VEZ < ordenados.length,
      porPestana,
      foto,
      cobro: loQueSeCobra(clientes),
    };
  },
});

// ── La ficha de un cliente ──────────────────────────────────────────────────

export interface FichaDeCliente {
  readonly cliente: ClienteEnLista;
  readonly ficha: {
    readonly responsable: string | null;
    readonly telefono: string | null;
    readonly correo: string | null;
    readonly tipo: string | null;
  };
  readonly locales: readonly {
    readonly nombre: string;
    readonly poblacion: string | null;
    readonly direccion: string | null;
    readonly telefono: string | null;
    readonly activo: boolean;
    readonly carta: string | null;
    readonly altaTerminada: boolean;
  }[];
  readonly personas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly rol: string;
    readonly correo: string | null;
    readonly esDireccion: boolean;
    readonly ultimoAcceso: string | null;
    readonly estaSemana: boolean;
    readonly dobleFactor: boolean;
    readonly sesiones: number;
    readonly creada: string;
  }[];
  readonly uso: readonly {
    readonly que: string;
    readonly ultimos: number;
    readonly anteriores: number;
  }[];
  readonly historial: readonly {
    readonly en: string;
    readonly de: string | null;
    readonly a: string;
    readonly plan: string | null;
    readonly quien: string;
    readonly porque: string;
  }[];
  readonly auditoria: readonly {
    readonly en: string;
    readonly quien: string | null;
    readonly accion: string;
    readonly antes: unknown;
    readonly despues: unknown;
    readonly motivo: string | null;
  }[];
  readonly notas: readonly {
    readonly id: number;
    readonly texto: string;
    readonly fijada: boolean;
    readonly en: string;
    readonly autor: string | null;
  }[];
  readonly cambiosDeCorreo: readonly {
    readonly correoViejo: string;
    readonly correoNuevo: string;
    readonly pedidoEn: string;
    readonly como: 'pendiente' | 'confirmado' | 'parado' | 'caducado';
  }[];
  /** Lo último que apuntó su gente: qué y cuándo, sin el contenido. */
  readonly ultimoApunte: {
    readonly accion: string;
    readonly entidad: string;
    readonly en: string;
  } | null;
  /** Lo que hay que saber en diez segundos, en frases cortas. */
  readonly alertas: readonly string[];
}

export const adminUnCliente = consulta<{ organizacion_id: string }, FichaDeCliente>({
  nombre: 'admin_un_cliente',
  entrada: z.object({ organizacion_id: z.string().uuid() }).strict(),
  soloAdmin: true,

  async ejecutar(contexto, entrada) {
    const { clientes } = await losClientes(contexto);
    const encontrado = clientes.find((c) => c.organizacionId === entrada.organizacion_id);
    if (encontrado === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese cliente no está.' });
    }
    const cliente = sinLoBuscable(encontrado);
    const id = entrada.organizacion_id;

    const [dentro] = await contexto.sql<
      {
        datos: {
          locales: FichaDeCliente['locales'];
          personas: FichaDeCliente['personas'];
          ultimoApunte: FichaDeCliente['ultimoApunte'];
        };
      }[]
    >`
      select estook.un_cliente(${id}::uuid) as datos
    `;
    const fichas = await contexto.sql<
      {
        responsable: string | null;
        telefono: string | null;
        correo: string | null;
        tipo: string | null;
      }[]
    >`
      select responsable, telefono, correo, tipo from plataforma.ficha_comercial where organizacion_id = ${id}
    `;
    const uso = await contexto.sql<{ que: string; ultimos: number; anteriores: number }[]>`
      select que, ultimos, anteriores from estook.el_uso_de(${id}::uuid)
    `;
    const historial = await contexto.sql<
      {
        en: string;
        de: string | null;
        a: string;
        plan: string | null;
        quien: string;
        porque: string;
      }[]
    >`
      select en::text as en, de_estado as de, a_estado as a, plan, quien, porque
        from plataforma.cambio_de_suscripcion where organizacion_id = ${id}
       order by en desc limit 30
    `;
    const auditoria = await contexto.sql<
      {
        en: string;
        quien: string | null;
        accion: string;
        antes: unknown;
        despues: unknown;
        motivo: string | null;
      }[]
    >`
      select a.ocurrido_en::text as en, p.nombre as quien, a.accion, a.antes, a.despues, a.motivo
        from plataforma.auditoria a
        left join estook.persona p on p.id = a.persona_id
       where a.entidad = 'cliente' and a.entidad_id = ${id}
       order by a.ocurrido_en desc limit 50
    `;
    const notas = await contexto.sql<
      { id: string; texto: string; fijada: boolean; en: string; autor: string | null }[]
    >`
      select n.id::text as id, n.texto, n.fijada, n.creada_en::text as en, p.nombre as autor
        from plataforma.nota_de_cliente n
        left join estook.persona p on p.id = n.autor_id
       where n.organizacion_id = ${id}
       order by n.fijada desc, n.creada_en desc limit 100
    `;
    const personas = dentro?.datos.personas ?? [];
    const idsDeSuGente = personas.map((p) => p.id);
    const cambios =
      idsDeSuGente.length === 0
        ? []
        : await contexto.sql<
            {
              correo_viejo: string;
              correo_nuevo: string;
              pedido_en: string;
              confirmado: boolean;
              parado: boolean;
              caducado: boolean;
            }[]
          >`
            select correo_viejo, correo_nuevo, pedido_en::text as pedido_en,
                   confirmado_en is not null as confirmado, parado_en is not null as parado,
                   caduca_en < now() as caducado
              from plataforma.cambio_de_correo
             where persona_id = any (${comoLista(idsDeSuGente)}::text::uuid[])
             order by pedido_en desc limit 10
          `;

    const locales = dentro?.datos.locales ?? [];
    const alertas: string[] = [];
    if (cliente.como === 'impago') alertas.push('Tiene un cobro fallido');
    if (cliente.como === 'solo_lectura') alertas.push('Está en solo lectura por no pagar');
    if (cliente.como === 'sin_pagar') alertas.push('No ha pagado nunca');
    if (cliente.cancelaAlAcabar) alertas.push('Ha pedido cancelar al acabar el periodo');
    if (cliente.actividad === 'dormido')
      alertas.push(
        cliente.diasSinEntrar === null
          ? 'Nadie ha entrado nunca'
          : `Dormido: nadie entra desde hace ${String(cliente.diasSinEntrar)} días`,
      );
    if (cliente.actividad === 'bajando') alertas.push('Lo usa la mitad que hace un mes');
    if (locales.some((l) => l.activo && !l.altaTerminada)) alertas.push('No ha terminado el alta');

    return {
      cliente,
      ficha: fichas[0] ?? { responsable: null, telefono: null, correo: null, tipo: null },
      locales,
      personas,
      ultimoApunte: dentro?.datos.ultimoApunte ?? null,
      uso,
      historial,
      auditoria,
      notas: notas.map((n) => ({ ...n, id: Number(n.id) })),
      cambiosDeCorreo: cambios.map((c) => ({
        correoViejo: c.correo_viejo,
        correoNuevo: c.correo_nuevo,
        pedidoEn: c.pedido_en,
        como: c.confirmado
          ? 'confirmado'
          : c.parado
            ? 'parado'
            : c.caducado
              ? 'caducado'
              : 'pendiente',
      })),
      alertas,
    };
  },
});
