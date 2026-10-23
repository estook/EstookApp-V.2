import {
  elPaseHaSalido,
  horaDeCorte,
  jornadaDe,
  type LaMesaEnCocina,
  type PaseDeLaMesa,
  type PlatoDeLaMesa,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from './alta.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';

/**
 * Lo común a la sala y a la cocina (M20A · 1, decisión 0106): leer una cuenta con sus
 * platos y sus pases, pasarla al dominio y apuntar lo que pasa.
 *
 * La cuenta es del local de la sesión: con un id de otro local no se encuentra (lo
 * vuelve a mirar la seguridad por filas de la 0081).
 */

export function elLocalDelServicio(contexto: Contexto): string {
  const localId = contexto.sesion?.localId ?? null;
  if (localId === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Las mesas son de un local: elige uno primero.',
    });
  }
  return localId;
}

export interface FilaDeCuenta {
  readonly id: string;
  readonly tipo: string;
  readonly mesa_id: string | null;
  readonly mesa: string | null;
  readonly nombre: string | null;
  readonly personas: number | null;
  readonly camarero_id: string | null;
  readonly camarero: string | null;
  readonly por_pases: boolean;
  readonly nota_para_cocina: string | null;
  readonly abierta_en: string;
  readonly liberada_en: string | null;
  readonly anulada_en: string | null;
  readonly motivo_de_anular: string | null;
}

export interface FilaDeLinea {
  readonly id: string;
  readonly cuenta_id: string;
  readonly plato_id: string | null;
  readonly menu_id: string | null;
  readonly parte_de: string | null;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precio_centimos: number;
  readonly destino: 'cocina' | 'barra' | 'ninguno';
  readonly pase: number | null;
  readonly nota: string | null;
  readonly nota_cambiada_en: string | null;
  readonly pedida_en: string;
  readonly mandada_en: string | null;
  readonly salio_en: string | null;
  readonly quitada_en: string | null;
  readonly motivo_de_quitar: string | null;
  readonly vuelve_en: string | null;
  readonly motivo_de_vuelve: string | null;
}

export interface FilaDePase {
  readonly cuenta_id: string;
  readonly numero: number;
  readonly marchado_en: string | null;
  readonly fuera_en: string | null;
}

/** Las cuentas pedidas, de este local, con su mesa y su camarero. */
export async function lasCuentas(
  contexto: Contexto,
  localId: string,
  ids: readonly string[],
): Promise<FilaDeCuenta[]> {
  if (ids.length === 0) return [];
  return contexto.sql<FilaDeCuenta[]>`
    select c.id::text as id, c.tipo, c.mesa_id::text as mesa_id, m.nombre as mesa, c.nombre,
           c.personas, c.camarero_id::text as camarero_id, p.nombre as camarero, c.por_pases,
           c.nota_para_cocina,
           to_char(c.abierta_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as abierta_en,
           to_char(c.liberada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as liberada_en,
           to_char(c.anulada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as anulada_en,
           c.motivo_de_anular
      from estook.cuenta c
      left join estook.mesa m on m.id = c.mesa_id
      left join estook.persona p on p.id = c.camarero_id
     where c.local_id = ${localId}::uuid and c.id = any (${comoLista(ids)}::text::uuid[])
  `;
}

/** La cuenta abierta de este local, o el fallo que lo explica. */
export async function laCuentaAbierta(
  contexto: Contexto,
  localId: string,
  cuentaId: string,
): Promise<FilaDeCuenta> {
  const [cuenta] = await lasCuentas(contexto, localId, [cuentaId]);
  if (cuenta === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Esa mesa no está abierta en este local.' });
  }
  if (cuenta.liberada_en !== null || cuenta.anulada_en !== null) {
    throw new FalloDeAplicacion('ya_hecho', {
      porque: 'Esa mesa ya está cerrada: ábrela otra vez para seguir.',
    });
  }
  return cuenta;
}

export async function losPlatos(
  contexto: Contexto,
  cuentaIds: readonly string[],
): Promise<FilaDeLinea[]> {
  if (cuentaIds.length === 0) return [];
  return contexto.sql<FilaDeLinea[]>`
    select l.id::text as id, l.cuenta_id::text as cuenta_id, l.plato_id::text as plato_id,
           l.menu_id::text as menu_id, l.parte_de::text as parte_de, l.nombre, l.cantidad,
           l.precio_centimos, l.destino, l.pase, l.nota,
           to_char(l.nota_cambiada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as nota_cambiada_en,
           to_char(l.pedida_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as pedida_en,
           to_char(l.mandada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as mandada_en,
           to_char(l.salio_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en,
           to_char(l.quitada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as quitada_en,
           l.motivo_de_quitar,
           to_char(l.vuelve_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as vuelve_en,
           l.motivo_de_vuelve
      from estook.linea_de_cuenta l
     where l.cuenta_id = any (${comoLista(cuentaIds)}::text::uuid[])
     order by l.pedida_en, l.id
  `;
}

export async function losPases(
  contexto: Contexto,
  cuentaIds: readonly string[],
): Promise<FilaDePase[]> {
  if (cuentaIds.length === 0) return [];
  return contexto.sql<FilaDePase[]>`
    select cuenta_id::text as cuenta_id, numero,
           to_char(marchado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as marchado_en,
           to_char(fuera_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fuera_en
      from estook.pase
     where cuenta_id = any (${comoLista(cuentaIds)}::text::uuid[])
     order by numero
  `;
}

/** La jornada de hoy del local: el día del menú que se sirve ahora (M16a). */
export async function laJornadaDeHoy(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}::uuid
  `;
  const local = filas[0];
  if (local === undefined) throw new FalloDeAplicacion('local_ajeno');
  return jornadaDe(contexto.ahora, local.zona_horaria, horaDeCorte(local.hora_de_corte));
}

/** Un plato de la base, como lo entiende el dominio. */
export function comoPlatoDeLaMesa(linea: FilaDeLinea): PlatoDeLaMesa {
  return {
    destino: linea.destino,
    pase: linea.pase,
    mandado: linea.mandada_en !== null,
    salio: linea.salio_en !== null,
    quitado: linea.quitada_en !== null,
  };
}

export function comoPaseDeLaMesa(pase: FilaDePase): PaseDeLaMesa {
  return {
    numero: pase.numero,
    marchado: pase.marchado_en !== null,
    fuera: pase.fuera_en !== null,
  };
}

/** El título de la cuenta: «Mesa 6», «Barra», «Para llevar · Laura». */
export function elTituloDeLaCuenta(cuenta: FilaDeCuenta): string {
  if (cuenta.tipo === 'mesa') return `Mesa ${cuenta.mesa ?? ''}`.trim();
  if (cuenta.tipo === 'barra') return cuenta.nombre === null ? 'Barra' : `Barra · ${cuenta.nombre}`;
  const tipo = cuenta.tipo === 'reparto' ? 'Reparto' : 'Para llevar';
  return cuenta.nombre === null ? tipo : `${tipo} · ${cuenta.nombre}`;
}

/** Si el pase de este plato ha salido entero, lo marca fuera; si no, lo deja abierto. */
export async function rehacerElFueraDelPase(
  contexto: Contexto,
  cuentaId: string,
  pase: number,
): Promise<void> {
  const platos = (await losPlatos(contexto, [cuentaId])).map(comoPlatoDeLaMesa);
  const salio = elPaseHaSalido(platos, pase);
  await contexto.sql`
    update estook.pase
       set fuera_en = ${salio ? contexto.ahora.toISOString() : null}::timestamptz
     where cuenta_id = ${cuentaId}::uuid and numero = ${pase}
       and (fuera_en is null) = ${salio}
  `;
}

/** Lo que pasa en una mesa, en la auditoría de siempre: quién, cuándo y qué. */
export async function apuntarEnLaMesa(
  contexto: Contexto,
  accion: string,
  cuentaId: string,
  localId: string,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, 'cuenta', ${cuentaId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

export type { LaMesaEnCocina };
