import {
  TITULO_DEL_INFORME,
  avisoDeBajoMinimo,
  avisoDeTocaPedir,
  diaDeLaSemana,
  fechaEnElLocal,
  hayDatos,
  lasCifrasDelCorreo,
  lasFrasesJuntas,
  masDias,
  type FechaOperativa,
  type TipoDeAviso,
  type TipoDeInforme,
} from '@estook/dominio';
import { avisar, losQueLoQuieren, quienesPuedenRecibir, type QuienRecibe } from './avisos.ts';
import { elProveedor, elRelojDelLocal, suProximoReparto } from './compras.ts';
import { almacenHoy } from './consultas/almacen.ts';
import { elInforme } from './consultas/informes.ts';
import type { Contexto } from './contrato.ts';
import { DIAS_ENTRE_LECTURAS, ponerAlDiaLaNota } from './nota-de-google.ts';
import { comoLista } from './listas.ts';

/**
 * Lo que avisa el reloj cada mañana (entrega R2 · decisión 0053).
 *
 * Una vez al día, a partir de las ocho de Madrid, con lo del día (`reloj.ts`), y
 * **local a local de las cuentas que pagan o están en prueba**:
 *
 *   1 · **Mañana toca pedir** (mejora 12): a quien manda los pedidos, la víspera de
 *       cada día de pedir. El pedido se prepara al tocarlo, no ahora.
 *   2 · **Tu día, Tu semana y Tu mes** (mejora 16): el de ayer cada día, el de la
 *       semana los lunes y el del mes el día 1, con sus cifras para el correo.
 *   3 · **Lo que está bajo mínimo**, a quien lo haya encendido: ya sale en «Hoy».
 *   4 · **La nota en Google** (mejora 19), si lleva tres días sin mirarse.
 *
 * ── A nombre de quien lo recibe ──────────────────────────────────────────────
 *
 * Un informe no es igual para todos: un gerente ve el coste de personal y un area
 * manager quizá no. Así que **se cuenta como lo vería quien lo recibe**
 * (`comoSiFuera`), con sus permisos y las políticas de siempre, y solo para quien
 * lo tiene encendido. El sistema solo sabe qué locales hay y a quién le toca.
 *
 * ── Si algo falla, lo demás sigue ────────────────────────────────────────────
 *
 * Cada local va en su propio punto de guardado (`aparte`): un fallo deshace lo de
 * ese local, se apunta en el registro, y el reloj sigue con el siguiente. No hace
 * repetir el día entero —esto no cobra ni escribe nada que no se pueda volver a
 * hacer—: al día siguiente vuelve a salir.
 */

export interface LoQueAvisoElReloj {
  readonly avisos: number;
  readonly notas: number;
  readonly fallos: number;
}

interface LocalDelReloj {
  readonly id: string;
  readonly organizacionId: string;
  readonly nombre: string;
  readonly zonaHoraria: string;
  readonly googleId: string | null;
  readonly googleLeidoEn: string | null;
}

/**
 * Hace algo en su propio punto de guardado: si falla, lo deshace —también quién
 * era cada uno (`comoSiFuera`)— y contesta nulo en vez de romper el reloj.
 */
async function aparte<T>(
  contexto: Contexto,
  que: string,
  hacer: () => Promise<T>,
): Promise<T | null> {
  await contexto.sql`savepoint lo_que_avisa_el_reloj`;
  try {
    const hecho = await hacer();
    await contexto.sql`release savepoint lo_que_avisa_el_reloj`;
    return hecho;
  } catch (fallo) {
    await contexto.sql`rollback to savepoint lo_que_avisa_el_reloj`;
    await contexto.sql`release savepoint lo_que_avisa_el_reloj`;
    console.error(
      JSON.stringify({
        nivel: 'error',
        mensaje: `el reloj no ha podido ${que}`,
        correlacion_id: contexto.correlacionId,
        detalle: fallo instanceof Error ? fallo.message : String(fallo),
      }),
    );
    return null;
  }
}

/**
 * Hace algo **como lo haría esa persona**: su identidad en la base, sin el sistema,
 * y su sesión en ese local. Las políticas y los permisos son los suyos.
 *
 * Va siempre dentro de \`aparte\`: si falla, el punto de guardado devuelve la
 * identidad de antes; si no falla, se devuelve aquí.
 */
async function comoSiFuera<T>(
  contexto: Contexto,
  quien: { readonly personaId: string; readonly organizacionId: string; readonly localId: string },
  hacer: (suyo: Contexto) => Promise<T>,
): Promise<T> {
  const antes = await contexto.sql<{ persona: string; sistema: string }[]>`
    select coalesce(current_setting('estook.persona_id', true), '') as persona,
           coalesce(current_setting('estook.sistema', true), '') as sistema
  `;
  await contexto.sql`
    select set_config('estook.persona_id', ${quien.personaId}, true),
           set_config('estook.sistema', 'no', true)
  `;
  const hecho = await hacer({
    ...contexto,
    personaId: quien.personaId,
    sesion: {
      id: `reloj-${contexto.correlacionId}`,
      personaId: quien.personaId,
      organizacionId: quien.organizacionId,
      localId: quien.localId,
      dobleFactorSuperado: true,
      debeCambiarClave: false,
      esDemostracion: false,
      paraAdmin: false,
    },
  });
  await contexto.sql`
    select set_config('estook.persona_id', ${antes[0]?.persona ?? ''}, true),
           set_config('estook.sistema', ${antes[0]?.sistema ?? ''}, true)
  `;
  return hecho;
}

/** A quién le toca un aviso en un local y lo tiene encendido. */
async function aQuien(
  contexto: Contexto,
  localId: string,
  tipo: TipoDeAviso,
): Promise<readonly QuienRecibe[]> {
  return losQueLoQuieren(contexto, tipo, await quienesPuedenRecibir(contexto, localId, tipo));
}

// ── 1 · Mañana toca pedir ────────────────────────────────────────────────────

async function losPedidosDeManana(contexto: Contexto, local: LocalDelReloj): Promise<number> {
  const quienes = await aQuien(contexto, local.id, 'pedido.toca');
  const primero = quienes[0];
  if (primero === undefined) return 0;

  // Qué proveedores tocan mañana, visto por quien los manda.
  const tocan = await comoSiFuera(
    contexto,
    { personaId: primero.personaId, organizacionId: local.organizacionId, localId: local.id },
    async (suyo) => {
      const reloj = await elRelojDelLocal(suyo, local.id);
      const manana = masDias(reloj.hoy, 1);
      const proveedores = await suyo.sql<{ id: string }[]>`
        select pv.id from estook.proveedor pv
         where pv.local_id = ${local.id} and pv.activo and not pv.es_ejemplo
           and cardinality(pv.dias_de_reparto) > 0
           -- Sin productos suyos no hay nada que pedirle.
           and exists (select 1 from estook.producto p
                        where p.proveedor_id = pv.id and p.activo and not p.es_ejemplo)
         order by pv.nombre
      `;
      const lista: { id: string; nombre: string; llega: FechaOperativa; antesDe: string | null }[] =
        [];
      for (const { id } of proveedores) {
        const proveedor = await elProveedor(suyo, id);
        // Desde mañana a primera hora: si el primer reparto al que se llega se pide
        // mañana, mañana toca pedir.
        const reparto = suProximoReparto(proveedor, { ...reloj, hoy: manana, hora: '00:00' });
        if (reparto === null || reparto.pedirEl !== manana) continue;
        const mandados = await suyo.sql<{ cuantos: number }[]>`
          select count(*)::int as cuantos from estook.pedido_de_compra
           where proveedor_id = ${id} and estado = 'enviado' and llega_el = ${reparto.llega}::date
        `;
        if ((mandados[0]?.cuantos ?? 0) > 0) continue;
        lista.push({
          id,
          nombre: proveedor.nombre,
          llega: reparto.llega,
          antesDe: reparto.pedirAntesDe,
        });
      }
      return { hoy: reloj.hoy, manana, lista };
    },
  );

  let avisos = 0;
  for (const proveedor of tocan.lista) {
    avisos += await avisar(
      contexto,
      {
        tipo: 'pedido.toca',
        organizacionId: local.organizacionId,
        localId: local.id,
        // Uno por proveedor y día de pedir; el de la vez anterior se queda viejo.
        clave: `${proveedor.id}:${tocan.manana}`,
        sustituyeA: `${proveedor.id}:`,
        texto: () =>
          avisoDeTocaPedir(proveedor.nombre, proveedor.llega, proveedor.antesDe, tocan.hoy),
        // Al tocarlo se abre «Un pedido nuevo» con lo que haya **entonces** (Richi, 27-sep).
        ir: `/almacen/compras/pedidos?pedir=${proveedor.id}`,
        quien: null,
      },
      quienes,
    );
  }
  return avisos;
}

// ── 2 · Los informes ─────────────────────────────────────────────────────────

/** Cuáles tocan hoy: el día siempre, la semana los lunes y el mes el día 1. */
function losQueTocan(hoy: FechaOperativa): readonly TipoDeInforme[] {
  const tocan: TipoDeInforme[] = ['dia'];
  if (diaDeLaSemana(hoy) === 1) tocan.push('semana');
  if (hoy.endsWith('-01')) tocan.push('mes');
  return tocan;
}

/** El detalle de un aviso cabe en 600: las frases no suelen pasar de 300. */
function recortado(texto: string): string {
  return texto.length <= 600 ? texto : `${texto.slice(0, 597)}…`;
}

async function losInformes(contexto: Contexto, local: LocalDelReloj): Promise<number> {
  const hoy = fechaEnElLocal(contexto.ahora, local.zonaHoraria);
  let avisos = 0;

  for (const tipo of losQueTocan(hoy)) {
    const avisoDelTipo: TipoDeAviso = `informe.${tipo}`;
    for (const quien of await aQuien(contexto, local.id, avisoDelTipo)) {
      const informe = await comoSiFuera(
        contexto,
        { personaId: quien.personaId, organizacionId: local.organizacionId, localId: local.id },
        (suyo) => elInforme(suyo, local.id, tipo, null),
      );
      // Sin nada que contar no se manda: «no hay datos» cada mañana es ruido.
      if (!hayDatos(informe.cifras)) continue;

      const { periodo } = informe;
      avisos += await avisar(
        contexto,
        {
          tipo: avisoDelTipo,
          organizacionId: local.organizacionId,
          localId: local.id,
          clave: `${local.id}:${periodo.desde}`,
          // El de ayer se queda viejo con el de hoy: el informe sigue en Negocio.
          sustituyeA: `${local.id}:`,
          texto: () => ({
            titulo: `${TITULO_DEL_INFORME[tipo]} en ${local.nombre}: ${periodo.nombre}`,
            detalle: recortado(lasFrasesJuntas(informe.frases)),
          }),
          ir: `/negocio/informes/${tipo}?del=${periodo.desde}`,
          quien: null,
          cifras: lasCifrasDelCorreo(informe.cifras, periodo),
        },
        [quien],
      );
    }
  }
  return avisos;
}

// ── 3 · Lo que está bajo mínimo ─────────────────────────────────────────────

async function loQueEstaBajoMinimo(contexto: Contexto, local: LocalDelReloj): Promise<number> {
  const hoy = fechaEnElLocal(contexto.ahora, local.zonaHoraria);
  let avisos = 0;
  for (const quien of await aQuien(contexto, local.id, 'almacen.bajo_minimo')) {
    // «Hoy» de Almacén, tal cual lo vería: con sus zonas (0038).
    const { atencion } = await comoSiFuera(
      contexto,
      { personaId: quien.personaId, organizacionId: local.organizacionId, localId: local.id },
      (suyo) => almacenHoy.ejecutar(suyo, {}),
    );
    if (atencion.length === 0) continue;
    const nombres = atencion.map((p) => p.nombre);
    avisos += await avisar(
      contexto,
      {
        tipo: 'almacen.bajo_minimo',
        organizacionId: local.organizacionId,
        localId: local.id,
        clave: `${local.id}:${hoy}`,
        sustituyeA: `${local.id}:`,
        texto: () => avisoDeBajoMinimo(nombres),
        ir: '/almacen/productos/bajo-minimo',
        quien: null,
      },
      [quien],
    );
  }
  return avisos;
}

// ── Todo junto ───────────────────────────────────────────────────────────────

/** Las cuentas a las que se les avisa: las que pagan o están en prueba, sin los ejemplos. */
export interface CuentaQueSeAvisa {
  readonly organizacionId: string;
}

/** Ya dentro del sistema, con lo del día. */
export async function loQueAvisaElReloj(
  contexto: Contexto,
  cuentas: readonly CuentaQueSeAvisa[],
): Promise<LoQueAvisoElReloj> {
  if (cuentas.length === 0) return { avisos: 0, notas: 0, fallos: 0 };

  const filas = await contexto.sql<
    {
      id: string;
      organizacion_id: string;
      nombre: string;
      zona_horaria: string;
      google_id: string | null;
      google_leido_en: string | null;
    }[]
  >`
    select id, organizacion_id, nombre, zona_horaria, google_id,
           to_char(google_leido_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as google_leido_en
      from estook.local
     where activo and not es_ejemplo
       and organizacion_id = any (${comoLista(cuentas.map((c) => c.organizacionId))}::text::uuid[])
     order by nombre, id
  `;

  let avisos = 0;
  let notas = 0;
  let fallos = 0;
  const hace = contexto.ahora.getTime() - DIAS_ENTRE_LECTURAS * 24 * 60 * 60 * 1000;

  for (const fila of filas) {
    const local: LocalDelReloj = {
      id: fila.id,
      organizacionId: fila.organizacion_id,
      nombre: fila.nombre,
      zonaHoraria: fila.zona_horaria,
      googleId: fila.google_id,
      googleLeidoEn: fila.google_leido_en,
    };

    const pasos: readonly [string, () => Promise<number>][] = [
      ['avisar de los pedidos de mañana', () => losPedidosDeManana(contexto, local)],
      ['hacer los informes', () => losInformes(contexto, local)],
      ['avisar de lo que está bajo mínimo', () => loQueEstaBajoMinimo(contexto, local)],
    ];
    for (const [que, hacer] of pasos) {
      const hecho = await aparte(contexto, `${que} de ${local.nombre}`, hacer);
      if (hecho === null) fallos += 1;
      else avisos += hecho;
    }

    // La nota en Google, cada tres días.
    const toca =
      contexto.google !== null &&
      local.googleId !== null &&
      (local.googleLeidoEn === null || Date.parse(local.googleLeidoEn) <= hace);
    if (toca) {
      const hecho = await aparte(contexto, `poner al día la nota de ${local.nombre}`, () =>
        ponerAlDiaLaNota(contexto, local.organizacionId, local.id),
      );
      if (hecho === null) fallos += 1;
      else if (hecho) notas += 1;
    }
  }

  return { avisos, notas, fallos };
}
