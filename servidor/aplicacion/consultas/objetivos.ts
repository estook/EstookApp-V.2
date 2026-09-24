import { z } from 'zod';
import {
  LO_NORMAL_EN_EL_SECTOR,
  LO_QUE_SE_JUZGA,
  MERMA_DE_PARTIDA,
  fechaOperativa,
  lasCifrasDelSemaforo,
  loQueCuesta,
  masDias,
  minutosDeSegundos,
  propuestaDeVentas,
  type CifraDelSemaforo,
  type ClaveDeObjetivo,
  type LoQueSeSabeDeLaSemana,
  type ObjetivosVigentes,
} from '@estook/dominio';
import { LO_QUE_PIDE_EL_OBJETIVO, type Permiso } from '@estook/permisos';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { lasHorasDelEquipo, lasRetribuciones } from './equipo.ts';
import { laJornada, losDias } from './indicador.ts';

/**
 * Los objetivos del local y cómo va cada uno esta semana (entrega O, mejora 17).
 *
 * Lo que se enseña en el widget «Objetivos» del Panel y en Ajustes · Tu local. Las
 * cuentas **son las de las cifras de siempre**: el género y las ventas salen de
 * `losDias` —las mismas que el food cost del Panel y que `mis_cierres`—, y las
 * horas del equipo, de `lasHorasDelEquipo` y `lasRetribuciones`, como Equipo ·
 * Resumen. Si aquí se contara distinto, el semáforo y la tarjeta de al lado
 * dirían dos food cost para la misma semana.
 *
 * El color y las frases los pone el dominio (`lasCifrasDelSemaforo`): aquí se lee
 * y se suma, y nada más.
 *
 * ── Y cada cifra, con su permiso ────────────────────────────────────────────
 *
 * Lo que no se puede ver **no se calcula**: un jefe de cocina ve el food cost y la
 * merma, pero no el personal ni el coste primo —quien no ve lo que cuesta el
 * personal no puede ver el coste primo, porque restándole el food cost lo
 * tendría—. Se piden los permisos una vez, con `nivel_de_permiso`, y cada cifra sale
 * o no sale entera.
 */

const DIAS = 7;

export interface ObjetivoPuesto {
  readonly clave: ClaveDeObjetivo;
  /** En fracción. Nulo en el de ventas. */
  readonly valor: number | null;
  /** En céntimos. Solo el de ventas. */
  readonly importeCentimos: number | null;
  /** Si lo puso Estook (el alta, o al duplicar un local) y nadie lo ha revisado. */
  readonly dePartida: boolean;
  readonly desde: string;
}

export interface SalidaMisObjetivos {
  readonly desde: string;
  readonly hasta: string;
  /** Las que esta persona puede ver, en el orden de siempre. */
  readonly cifras: readonly CifraDelSemaforo[];
  /** Los puestos, para Ajustes. Solo a quien puede cambiarlos. */
  readonly puestos: readonly ObjetivoPuesto[] | null;
  readonly puedeCambiarlos: boolean;
  /** Lo facturado de media estas cuatro semanas, para proponer el de ventas. */
  readonly propuestaDeVentas: number | null;
  /** Lo normal en el sector, para enseñarlo al lado de cada casilla. */
  readonly loNormal: Readonly<Partial<Record<ClaveDeObjetivo, string>>>;
}

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver sus objetivos. Elige uno primero.',
    });
  }
  return localId;
}

export const misObjetivos = consulta<Record<string, never>, SalidaMisObjetivos>({
  nombre: 'mis_objetivos',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const localId = elLocal(contexto);

    const todos = [
      ...new Set([
        ...LO_QUE_SE_JUZGA.flatMap((que) => LO_QUE_PIDE_EL_OBJETIVO[que]),
        'accion.poner_objetivos' as Permiso,
      ]),
    ];
    const puede = await loQuePuede(contexto, localId, todos);
    const visibles = LO_QUE_SE_JUZGA.filter((que) => puede.verTodos(LO_QUE_PIDE_EL_OBJETIVO[que]));
    const puedeCambiarlos = puede.editar('accion.poner_objetivos');

    const jornada = await laJornada(contexto, localId);
    const hoy = fechaOperativa(jornada);
    const deAhora = Array.from({ length: DIAS }, (_, i) => masDias(hoy, -(DIAS - 1 - i)));
    const desde = deAhora[0] ?? hoy;
    const deAntes = Array.from({ length: DIAS }, (_, i) => masDias(desde, -(DIAS - i)));

    const puestos = await losObjetivosPuestos(contexto, localId);
    const vigente = (clave: ClaveDeObjetivo) => puestos.find((p) => p.clave === clave);
    const objetivos: ObjetivosVigentes = {
      materia_prima: vigente('materia_prima')?.valor ?? null,
      personal: vigente('personal')?.valor ?? null,
      // Sin la suya, la meta del sector: el semáforo de la merma no espera a nadie.
      merma: vigente('merma')?.valor ?? MERMA_DE_PARTIDA,
      ventas_semanales: vigente('ventas_semanales')?.importeCentimos ?? null,
    };

    const sabe =
      visibles.length === 0
        ? null
        : await loQueSeSabe(contexto, localId, deAntes, deAhora, {
            dinero: puede.verTodos(['dato.ventas']),
            genero: puede.verTodos(LO_QUE_PIDE_EL_OBJETIVO.materia_prima),
            personal: puede.verTodos(LO_QUE_PIDE_EL_OBJETIVO.personal),
            merma: puede.verTodos(LO_QUE_PIDE_EL_OBJETIVO.merma),
          });

    const cifras =
      sabe === null
        ? []
        : lasCifrasDelSemaforo(sabe, objetivos).filter((cifra) => visibles.includes(cifra.que));

    return {
      desde,
      hasta: hoy,
      cifras,
      puestos: puedeCambiarlos ? puestos : null,
      puedeCambiarlos,
      propuestaDeVentas:
        puedeCambiarlos && puede.ver('dato.ventas')
          ? await laPropuestaDeVentas(contexto, localId, hoy)
          : null,
      loNormal: LO_NORMAL_EN_EL_SECTOR,
    };
  },
});

// ── Lo que se lee ───────────────────────────────────────────────────────────

async function losObjetivosPuestos(
  contexto: Contexto,
  localId: string,
): Promise<readonly ObjetivoPuesto[]> {
  const filas = await contexto.sql<
    {
      clave: string;
      valor: string | null;
      importe: string | null;
      de_partida: boolean;
      desde: string;
    }[]
  >`
    select clave::text as clave, valor::text as valor, importe_centimos::text as importe,
           de_partida, to_char(desde, 'YYYY-MM-DD') as desde
      from estook.objetivo
     where local_id = ${localId} and hasta is null
     order by clave
  `;
  return filas.map((f) => ({
    clave: f.clave as ClaveDeObjetivo,
    valor: f.valor === null ? null : Number(f.valor),
    importeCentimos: f.importe === null ? null : Number(f.importe),
    dePartida: f.de_partida,
    desde: f.desde,
  }));
}

interface QueSeLee {
  readonly dinero: boolean;
  readonly genero: boolean;
  readonly personal: boolean;
  readonly merma: boolean;
}

/**
 * Los números de la semana, ya sumados. Lo que no se puede ver sale a cero y no se
 * lee: su cifra no llega a la pantalla, pero el dominio necesita un número.
 */
async function loQueSeSabe(
  contexto: Contexto,
  localId: string,
  deAntes: readonly string[],
  deAhora: readonly string[],
  lee: QueSeLee,
): Promise<LoQueSeSabeDeLaSemana> {
  const desde = deAntes[0] ?? deAhora[0] ?? '';
  const hasta = deAhora.at(-1) ?? desde;
  const ahora = new Set(deAhora);
  const antes = new Set(deAntes);

  // Las ventas por día: la misma cuenta que la cifra «Ventas».
  const ventasPorDia = lee.dinero
    ? await losDias(contexto, localId, 'ventas', desde, hasta)
    : new Map();
  const conCaja = [...ventasPorDia.keys()].filter((fecha) => ahora.has(fecha));
  let ventas = 0;
  for (const fecha of conCaja) ventas += ventasPorDia.get(fecha)?.arriba ?? 0;
  const deAntesConCaja = [...ventasPorDia.keys()].filter((fecha) => antes.has(fecha));
  const ventasDeAntes =
    deAntesConCaja.length === 0
      ? null
      : deAntesConCaja.reduce((suma, fecha) => suma + (ventasPorDia.get(fecha)?.arriba ?? 0), 0);

  // El género gastado en los días con caja: la cuenta del food cost.
  let genero = 0;
  let masPesa: LoQueSeSabeDeLaSemana['masPesa'] = null;
  if (lee.genero && conCaja.length > 0) {
    const porDia = await losDias(contexto, localId, 'food-cost', desde, hasta);
    for (const fecha of conCaja) genero += porDia.get(fecha)?.arriba ?? 0;
    masPesa = await loQueMas(contexto, localId, conCaja, ['salida', 'merma', 'venta', 'consumo']);
  }

  // Las horas del equipo en los días con caja, como Equipo · Resumen: se suman los
  // segundos de cada persona y se redondea una vez, con lo que cobra hoy.
  let personal = 0;
  let sinSalario = 0;
  if (lee.personal && conCaja.length > 0) {
    const horas = await lasHorasDelEquipo(contexto, localId, deAhora[0] ?? desde, hasta);
    const dias = new Set(conCaja);
    const segundosDe = new Map<string, number>();
    for (const h of horas) {
      if (!dias.has(h.fecha)) continue;
      segundosDe.set(h.personaId, (segundosDe.get(h.personaId) ?? 0) + h.segundos);
    }
    const cobra = await lasRetribuciones(contexto, localId, [...segundosDe.keys()], hasta);
    for (const [personaId, segundos] of segundosDe) {
      const suya = cobra.get(personaId);
      const cuesta = suya === undefined ? null : loQueCuesta(minutosDeSegundos(segundos), suya);
      if (cuesta === null) sinSalario += 1;
      else personal += cuesta;
    }
  }

  // La merma y las compras, de los siete días: el libro está siempre.
  let merma = 0;
  let compras = 0;
  let masSeTira: LoQueSeSabeDeLaSemana['masSeTira'] = null;
  if (lee.merma) {
    const mermaPorDia = await losDias(contexto, localId, 'merma', desde, hasta);
    const comprasPorDia = await losDias(contexto, localId, 'compras', desde, hasta);
    for (const fecha of deAhora) {
      merma += mermaPorDia.get(fecha)?.arriba ?? 0;
      compras += comprasPorDia.get(fecha)?.arriba ?? 0;
    }
    if (merma > 0) masSeTira = await loQueMas(contexto, localId, deAhora, ['merma']);
  }

  return {
    diasConCaja: conCaja.length,
    ventas,
    genero,
    personal,
    sinSalario,
    merma,
    compras,
    ventasDeAntes,
    masPesa,
    masSeTira,
  };
}

/** El producto que más pesa en unos movimientos, a coste medio y sin los ejemplos. */
async function loQueMas(
  contexto: Contexto,
  localId: string,
  fechas: readonly string[],
  tipos: readonly string[],
): Promise<{ readonly nombre: string; readonly centimos: number } | null> {
  const filas = await contexto.sql<{ nombre: string; centimos: string }[]>`
    select p.nombre, sum(round(abs(m.cantidad) * m.coste_medio_despues / 1000))::text as centimos
      from estook.movimiento_de_stock m
      join estook.producto p on p.id = m.producto_id
     where m.local_id = ${localId}
       and m.fecha_operativa = any(${comoLista(fechas)}::text::date[])
       and m.tipo::text = any(${comoLista(tipos)}::text::text[])
       and not p.es_ejemplo
     group by p.id, p.nombre
     order by 2 desc
     limit 1
  `;
  const fila = filas[0];
  if (fila === undefined || Number(fila.centimos) <= 0) return null;
  return { nombre: fila.nombre, centimos: Number(fila.centimos) };
}

/** Lo facturado cada una de las cuatro semanas de antes, para proponer el objetivo. */
async function laPropuestaDeVentas(
  contexto: Contexto,
  localId: string,
  hoy: string,
): Promise<number | null> {
  const desde = masDias(fechaOperativa(hoy), -28);
  const porDia = await losDias(
    contexto,
    localId,
    'ventas',
    desde,
    masDias(fechaOperativa(hoy), -1),
  );
  const semanas = [0, 0, 0, 0];
  for (const [fecha, delDia] of porDia) {
    const hace = Math.floor(
      (Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${fecha}T00:00:00Z`)) / 86_400_000,
    );
    const semana = Math.floor((hace - 1) / 7);
    if (semana >= 0 && semana < 4) semanas[semana] = (semanas[semana] ?? 0) + delDia.arriba;
  }
  return propuestaDeVentas(semanas);
}
