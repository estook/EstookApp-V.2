import {
  abrirElCajonEnPapel,
  laCajaEnPapel,
  lasFormasEncendidas,
  loQueDeberiaHaber,
  type FormaDePago,
  type PapelCompuesto,
} from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { enNombreDelSistema } from './pago.ts';
import {
  cuandoEnElLocal,
  dejarEnLaCola,
  laImpresoraDe,
  loDelLocalParaImprimir,
} from './impresion.ts';

/**
 * **La caja por dentro** (R3 · 1, decisión 0144; Anexo 5.5, 10.6 y 11.6): de qué cajón es cada aparato,
 * la caja abierta de un cajón, lo que lleva cobrado y movido, los ajustes y abrir el cajón. Lo usan los
 * comandos de la caja, el cobro y las consultas de Estook TPV y de Estook.
 */

// ── El cajón del aparato ───────────────────────────────────────────────────────────

export interface ElCajon {
  readonly id: string;
  readonly nombre: string;
}

/**
 * **El cajón de este aparato** (`terminal.cajon_id`), o nulo si no tiene (un comandero). Se lee como el
 * sistema: los cajones solo los ve quien da de alta aparatos, y quien cobra también tiene que saberlo.
 */
export async function elCajonDelAparato(contexto: Contexto): Promise<ElCajon | null> {
  const terminalId = contexto.sesion?.aparato?.terminalId ?? null;
  if (terminalId === null) return null;
  const filas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ id: string; nombre: string }[]>`
      select c.id::text as id, c.nombre
        from estook.terminal t join estook.cajon c on c.id = t.cajon_id
       where t.id = ${terminalId}::uuid and t.retirado_en is null and c.retirado_en is null
    `,
  );
  return filas[0] ?? null;
}

/** El cajón, o el fallo que lo explica: la caja se lleva en un aparato con cajón. */
export async function elCajonOFallo(contexto: Contexto): Promise<ElCajon> {
  const cajon = await elCajonDelAparato(contexto);
  if (cajon === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        'Este aparato no tiene cajón. La caja se lleva en la caja: se le pone su cajón en Ajustes del TPV › Aparatos.',
    });
  }
  return cajon;
}

// ── La caja abierta ────────────────────────────────────────────────────────────────

export interface LaCajaAbierta {
  readonly id: string;
  readonly cajonId: string;
  readonly fecha: string;
  readonly abiertaEn: string;
  readonly abiertaPor: string;
  readonly abiertaPorNombre: string;
  readonly fondo: number;
}

interface FilaDeLaCajaAbierta {
  readonly id: string;
  readonly cajon_id: string;
  readonly fecha: string;
  readonly abierta_en: string;
  readonly abierta_por: string;
  readonly nombre: string;
  readonly fondo: number;
}

function comoCajaAbierta(f: FilaDeLaCajaAbierta): LaCajaAbierta {
  return {
    id: f.id,
    cajonId: f.cajon_id,
    fecha: f.fecha,
    abiertaEn: f.abierta_en,
    abiertaPor: f.abierta_por,
    abiertaPorNombre: f.nombre.trim().split(/\s+/)[0] ?? f.nombre,
    fondo: f.fondo,
  };
}

/** **La caja abierta de un cajón**, o nula. Una como mucho: lo guarda la base. */
export async function laCajaAbiertaDe(
  contexto: Contexto,
  cajonId: string,
): Promise<LaCajaAbierta | null> {
  const filas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<FilaDeLaCajaAbierta[]>`
      select t.id::text as id, t.cajon_id::text as cajon_id, t.fecha_operativa::text as fecha,
             to_char(t.abierta_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as abierta_en,
             t.abierta_por::text as abierta_por, p.nombre, t.fondo
        from estook.turno_de_caja t join estook.persona p on p.id = t.abierta_por
       where t.cajon_id = ${cajonId}::uuid and t.cerrada_en is null
    `,
  );
  const fila = filas[0];
  return fila === undefined ? null : comoCajaAbierta(fila);
}

/** Lo que se dejó en el cajón al cerrar la última vez; nulo si nunca se cerró. */
export async function loDeLaUltimaVez(contexto: Contexto, cajonId: string): Promise<number | null> {
  const filas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ para_manana: number }[]>`
      select para_manana from estook.turno_de_caja
       where cajon_id = ${cajonId}::uuid and cerrada_en is not null
       order by cerrada_en desc
       limit 1
    `,
  );
  return filas[0]?.para_manana ?? null;
}

// ── Lo que lleva una caja ──────────────────────────────────────────────────────────

export interface UnMovimientoDeLaCaja {
  readonly tipo: 'cambio' | 'sacar' | 'meter' | 'devolucion';
  readonly importe: number;
  readonly motivo: string | null;
  readonly nota: string | null;
  readonly quien: string;
  readonly aprobado: string | null;
  readonly en: string;
}

export interface LoQueLlevaLaCaja {
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly bizum: number;
  readonly cheque: number;
  readonly tickets: number;
  readonly metido: number;
  readonly sacado: number;
  readonly devuelto: number;
  readonly cajonSinVenta: number;
  readonly movimientos: readonly UnMovimientoDeLaCaja[];
}

/**
 * **Lo que lleva una caja**: lo cobrado por forma de pago (del cobro de cada ticket), los tickets y lo
 * que ha movido el cajón. Es lo que dice el X, y lo que se congela en el Z al cerrarla.
 */
export async function loQueLlevaLaCaja(
  contexto: Contexto,
  turnoId: string,
): Promise<LoQueLlevaLaCaja> {
  const [pagos, cobros, movimientos] = await enNombreDelSistema(contexto, () =>
    Promise.all([
      contexto.sql<{ forma: FormaDePago; importe: number }[]>`
        select p.forma, sum(p.importe)::integer as importe
          from estook.pago p join estook.cobro c on c.id = p.cobro_id
         where c.turno_id = ${turnoId}::uuid
         group by p.forma
      `,
      contexto.sql<{ tickets: number }[]>`
        select count(*)::integer as tickets from estook.cobro where turno_id = ${turnoId}::uuid
      `,
      contexto.sql<
        {
          tipo: UnMovimientoDeLaCaja['tipo'];
          importe: number;
          motivo: string | null;
          nota: string | null;
          quien: string;
          aprobado: string | null;
          en: string;
        }[]
      >`
        select m.tipo, m.importe, m.motivo, m.nota, p.nombre as quien, a.nombre as aprobado,
               to_char(m.en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en
          from estook.movimiento_de_caja m
          join estook.persona p on p.id = m.hecho_por
          left join estook.persona a on a.id = m.aprobado_por
         where m.turno_id = ${turnoId}::uuid
         order by m.en
      `,
    ]),
  );
  const deLaForma = (f: FormaDePago) => pagos.find((p) => p.forma === f)?.importe ?? 0;
  const deTipo = (t: UnMovimientoDeLaCaja['tipo']) =>
    movimientos.filter((m) => m.tipo === t).reduce((s, m) => s + m.importe, 0);
  return {
    efectivo: deLaForma('efectivo'),
    tarjeta: deLaForma('tarjeta'),
    bizum: deLaForma('bizum'),
    cheque: deLaForma('cheque'),
    tickets: cobros[0]?.tickets ?? 0,
    metido: deTipo('meter'),
    sacado: deTipo('sacar'),
    devuelto: deTipo('devolucion'),
    cajonSinVenta: movimientos.filter((m) => m.tipo === 'cambio').length,
    movimientos: movimientos.map((m) => ({
      ...m,
      quien: m.quien.trim().split(/\s+/)[0] ?? m.quien,
      aprobado: m.aprobado === null ? null : (m.aprobado.trim().split(/\s+/)[0] ?? m.aprobado),
    })),
  };
}

/** Lo que debería haber ahora en el cajón de una caja. */
export function loQueDeberiaHaberEn(fondo: number, lleva: LoQueLlevaLaCaja): number {
  return loQueDeberiaHaber({
    fondo,
    efectivo: lleva.efectivo,
    metido: lleva.metido,
    sacado: lleva.sacado,
    devuelto: lleva.devuelto,
  });
}

// ── Los ajustes ────────────────────────────────────────────────────────────────────

export interface LosAjustesDeLaCaja {
  readonly cajaLaAbren: 'encargados' | 'todos';
  readonly recuentoAlAbrir: boolean;
  readonly contarACiegas: boolean;
  readonly fondoDeSiempre: number | null;
  readonly conBizum: boolean;
  readonly conCheque: boolean;
}

export const AJUSTES_DE_FABRICA: LosAjustesDeLaCaja = {
  cajaLaAbren: 'encargados',
  recuentoAlAbrir: false,
  contarACiegas: true,
  fondoDeSiempre: null,
  conBizum: false,
  conCheque: false,
};

/** Los ajustes de la caja de un local, o los de fábrica. Los lee también quien cobra. */
export async function losAjustesDeLaCaja(
  contexto: Contexto,
  localId: string,
): Promise<LosAjustesDeLaCaja> {
  const filas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<
      {
        caja_la_abren: 'encargados' | 'todos';
        recuento_al_abrir: boolean;
        contar_a_ciegas: boolean;
        fondo_de_siempre: number | null;
        con_bizum: boolean;
        con_cheque: boolean;
      }[]
    >`
      select caja_la_abren, recuento_al_abrir, contar_a_ciegas, fondo_de_siempre, con_bizum, con_cheque
        from estook.ajustes_del_tpv where local_id = ${localId}::uuid
    `,
  );
  const f = filas[0];
  if (f === undefined) return AJUSTES_DE_FABRICA;
  return {
    cajaLaAbren: f.caja_la_abren,
    recuentoAlAbrir: f.recuento_al_abrir,
    contarACiegas: f.contar_a_ciegas,
    fondoDeSiempre: f.fondo_de_siempre,
    conBizum: f.con_bizum,
    conCheque: f.con_cheque,
  };
}

export function lasFormasDelLocal(ajustes: LosAjustesDeLaCaja): FormaDePago[] {
  return lasFormasEncendidas({ bizum: ajustes.conBizum, cheque: ajustes.conCheque });
}

/** Si quien está puede abrir y cerrar la caja (su permiso, o «También camareros»). */
export async function puedeLlevarLaCaja(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_llevar_la_caja(${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

// ── El cajón y el papel ────────────────────────────────────────────────────────────

/**
 * **Abre el cajón de este aparato**: la orden va a la impresora de esta caja que tiene el cajón
 * enchufado. Sin ella no se abre nada, y lo apuntado sigue valiendo: el dinero lo cuenta quien
 * cierra, no la impresora. Devuelve si se mandó.
 */
export async function abrirElCajonDeEsteAparato(
  contexto: Contexto,
  localId: string,
): Promise<boolean> {
  const terminalId = contexto.sesion?.aparato?.terminalId ?? null;
  if (terminalId === null) return false;
  const filas = await contexto.sql<{ id: string }[]>`
    select id::text as id from estook.impresora
     where local_id = ${localId}::uuid and terminal_id = ${terminalId}::uuid
       and tiene_cajon and retirada_en is null
     order by creada_en
     limit 1
  `;
  const impresoraId = filas[0]?.id;
  if (impresoraId === undefined) return false;
  await dejarEnLaCola(contexto, localId, impresoraId, 'cajon', abrirElCajonEnPapel(), null);
  return true;
}

/**
 * **Lo devuelto en efectivo sale del cajón** (0144): devolver, **en una caja con su caja abierta**, un
 * ticket que se pagó en efectivo apunta la salida en esa caja —con el motivo de la devolución y su
 * rectificativa— y abre el cajón. Sale en el X, en el Z y en lo que debería haber.
 *
 * Solo lo que se pagó en efectivo, y nunca más de lo que queda de eso: de un ticket de 30 € pagado
 * con 10 € en efectivo y 20 € con tarjeta, del cajón salen 10 € como mucho; lo de la tarjeta se
 * devuelve en el datáfono. Desde Estook, desde un comandero o con la caja cerrada no se apunta nada:
 * ahí no hay cajón del que sacar. Devuelve lo que sale, o nulo.
 */
export async function sacarDelCajonLoDevuelto(
  contexto: Contexto,
  que: {
    readonly localId: string;
    /** El ticket o la factura que se devuelve. */
    readonly originalId: string;
    readonly rectificativaId: string;
    /** Lo que se devuelve ahora, en positivo. */
    readonly total: number;
    readonly motivo: string;
  },
): Promise<{ readonly importe: number; readonly cajonAbierto: boolean } | null> {
  const personaId = contexto.personaId;
  const cajon = await elCajonDelAparato(contexto);
  if (cajon === null || personaId === null) return null;
  const caja = await laCajaAbiertaDe(contexto, cajon.id);
  if (caja === null) return null;

  // Lo que se pagó en efectivo de ese documento (o del ticket que se canjeó por esa factura), y lo
  // que ya salió del cajón en sus devoluciones de antes.
  const cuentas = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ efectivo: number; devuelto: number }[]>`
      select
        coalesce((
          select sum(p.importe)
            from estook.pago p join estook.cobro c on c.id = p.cobro_id
           where p.forma = 'efectivo' and c.local_id = ${que.localId}::uuid
             and (c.documento_id = ${que.originalId}::uuid
                  or c.documento_id in (select k.ticket_id from facturacion.canje k
                                         where k.factura_id = ${que.originalId}::uuid))
        ), 0)::integer as efectivo,
        coalesce((
          select sum(m.importe)
            from estook.movimiento_de_caja m
           where m.tipo = 'devolucion' and m.local_id = ${que.localId}::uuid
             and m.documento_id in (select r.rectificativa_id from facturacion.rectificacion r
                                     where r.documento_id = ${que.originalId}::uuid
                                       and r.clase = 'devolucion')
        ), 0)::integer as devuelto
    `,
  );
  const quedaEnEfectivo = (cuentas[0]?.efectivo ?? 0) - (cuentas[0]?.devuelto ?? 0);
  const importe = Math.min(que.total, quedaEnEfectivo);
  if (importe <= 0) return null;

  await contexto.sql`
    insert into estook.movimiento_de_caja
      (id, turno_id, local_id, tipo, importe, motivo, documento_id, hecho_por, hecho_desde, en)
    values (gen_random_uuid(), ${caja.id}::uuid, ${que.localId}::uuid, 'devolucion', ${importe},
            ${`Devolución: ${que.motivo}`.slice(0, 120)}, ${que.rectificativaId}::uuid,
            ${personaId}::uuid, ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
            ${contexto.ahora.toISOString()}::timestamptz)
  `;
  const cajonAbierto = await abrirElCajonDeEsteAparato(contexto, que.localId);
  return { importe, cajonAbierto };
}

/** «Sacar · Un proveedor · el pan», lo que dice el X y el Z de cada movimiento. */
export function elMovimientoEnTexto(m: UnMovimientoDeLaCaja): string {
  const que =
    m.tipo === 'sacar'
      ? 'Sacar'
      : m.tipo === 'meter'
        ? 'Meter'
        : m.tipo === 'devolucion'
          ? 'Devuelto'
          : 'Cajón para cambio';
  return [que, m.motivo, m.nota].filter((t) => t !== null && t !== '').join(' · ');
}

/** Lo que mueve el cajón con su signo, para el papel: lo que sale, en negativo. */
export function losMovimientosParaElPapel(
  movimientos: readonly UnMovimientoDeLaCaja[],
): { que: string; importe: number }[] {
  return movimientos
    .filter((m) => m.tipo !== 'cambio')
    .map((m) => ({
      que: elMovimientoEnTexto(m),
      importe: m.tipo === 'meter' ? m.importe : -m.importe,
    }));
}

/** Deja un papel de la caja (el X o el Z) en la impresora de la caja. Devuelve si se dejó. */
export async function imprimirLaCaja(
  contexto: Contexto,
  localId: string,
  papel: PapelCompuesto,
): Promise<boolean> {
  const impresoraId = await laImpresoraDe(contexto, localId, 'caja');
  if (impresoraId === null) return false;
  await dejarEnLaCola(contexto, localId, impresoraId, 'informe', papel, null);
  return true;
}

/** El nombre corto de una persona: «Marcos». */
export function nombreCorto(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** «Marcos, 12:02». */
export function quienYCuando(nombre: string, instante: string, zonaHoraria: string): string {
  const cuando = cuandoEnElLocal(new Date(instante), zonaHoraria);
  return `${nombreCorto(nombre)}, ${cuando.split(' ')[1] ?? cuando}`;
}

export { laCajaEnPapel, loDelLocalParaImprimir };

// ── Lo cobrado de una cuenta ───────────────────────────────────────────────────────

export interface LoCobradoDeLaCuenta {
  /** Lo cobrado ya, en todos sus cobros. */
  readonly importe: number;
  /** Los platos ya cobrados (por platos, o la cuenta entera). */
  readonly lineas: readonly string[];
  /** A partes iguales: de cuántas, y cuáles están pagadas. Nulo si no se cobra así. */
  readonly partes: { readonly de: number; readonly pagadas: readonly number[] } | null;
}

/** **Lo que ya se ha cobrado de una cuenta** (0144): para seguir cobrando por donde se dejó. */
export async function loCobradoDeLaCuenta(
  contexto: Contexto,
  cuentaId: string,
): Promise<LoCobradoDeLaCuenta> {
  const [cobros, lineas] = await Promise.all([
    contexto.sql<{ importe: number; parte: number | null; de_partes: number | null }[]>`
      select importe, parte, de_partes from estook.cobro where cuenta_id = ${cuentaId}::uuid
    `,
    contexto.sql<{ linea_id: string }[]>`
      select l.linea_id::text as linea_id
        from estook.cobro_de_linea l join estook.cobro c on c.id = l.cobro_id
       where c.cuenta_id = ${cuentaId}::uuid
    `,
  ]);
  const aPartes = cobros.filter((c) => c.parte !== null);
  const de = aPartes[0]?.de_partes ?? null;
  return {
    importe: cobros.reduce((s, c) => s + c.importe, 0),
    lineas: lineas.map((l) => l.linea_id),
    partes:
      de === null ? null : { de, pagadas: aPartes.map((c) => c.parte ?? 0).sort((a, b) => a - b) },
  };
}
