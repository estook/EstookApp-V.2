import type { Permiso } from '@estook/permisos';
import { FalloDeAplicacion, type Consulta, type Contexto } from './contrato.ts';
import { loQuePuede } from './lo-que-puede.ts';
import { almacenHoy } from './consultas/almacen.ts';
import { misFichas } from './consultas/escandallos.ts';
import { loDeHoyConsulta } from './consultas/hoy.ts';
import { miCarta } from './consultas/mi-carta.ts';
import { misObjetivos } from './consultas/objetivos.ts';
import { comprasDeHoy } from './consultas/pedidos.ts';

/** Lo que hace falta de una consulta sin entrada para meterla en el resumen. */
type UnaDeLasDeSiempre = Pick<Consulta<Record<string, never>, unknown>, 'exige' | 'ejecutar'>;

/**
 * Lo que lee Fogón: un resumen corto de la pantalla en la que estás (0023, 0097).
 *
 * «Teniendo un contexto de la app que la IA lee… hay que optimizarlo y que sea rápida»
 * (Richi, 18-oct). Así se hace:
 *
 *   · **Lo arma el servidor**, en la misma transacción que contesta y con las
 *     políticas puestas (0023). El navegador manda dónde estás y la pregunta; ni una
 *     cifra.
 *   · **Con las mismas consultas que pinta la app** (lo de hoy, el Almacén, la Carta…),
 *     así Fogón no puede decir «3 bajo mínimo» mientras la pantalla dice 4. Y cada una,
 *     **solo si quien pregunta puede verla**, con la misma puerta que tiene sola.
 *   · **Corto**: solo la pantalla en la que estás y lo de hoy, sin identificadores ni
 *     enlaces, las listas recortadas y un tope de letras. Lo caro de un modelo es lo
 *     que se le manda.
 *   · **Sin nombres del equipo**: Fogón 1 no le manda a la IA quién trabaja ni quién
 *     ha fichado. Para eso está el Horario. **Sí sabe quién pregunta** (Richi, 19-oct:
 *     «debería reconocerte y saber tu rol, pero sin cruzar los demás»): su nombre de
 *     pila y su puesto en este local, nada más (0098).
 *   · **Sin un euro para quien no ve importes**: se quitan antes de mandarlo, además de
 *     decírselo al modelo. Lo que no se manda no se puede contar.
 */

/**
 * Quién pregunta: su nombre de pila y su puesto en este local (el de más alcance, si
 * tiene varios). Solo lo suyo: ni apellidos ni nada de nadie más (0098). Nulo sin
 * persona (el reloj).
 */
export async function quienPregunta(
  contexto: Contexto,
  localId: string,
): Promise<{ readonly nombre: string; readonly puesto: string } | null> {
  if (!contexto.personaId) return null;
  const filas = await contexto.sql<{ nombre: string; puesto: string }[]>`
    select p.nombre, r.nombre as puesto
      from estook.persona p
      join estook.membresia m on m.persona_id = p.id
      join estook.rol r on r.codigo = m.rol
      join estook.local l on l.id = ${localId}::uuid
     where p.id = ${contexto.personaId}::uuid
       and m.organizacion_id = l.organizacion_id
       and (
         m.alcance = 'organizacion'
         or (m.alcance = 'area' and l.area_id = m.area_id)
         or (m.alcance = 'local' and l.id = m.local_id)
       )
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
     order by r.amplitud desc
     limit 1
  `;
  const fila = filas[0];
  if (fila === undefined) return null;
  const nombre = fila.nombre.trim().split(/\s+/)[0] ?? '';
  return nombre === '' ? null : { nombre, puesto: fila.puesto };
}

/** Cuántas letras puede tener el resumen entero. Unos dos mil tokens. */
const LETRAS_DEL_RESUMEN = 7000;
/** Cuántas cosas de cada lista: el resto, contado. */
const COSAS_POR_LISTA = 12;

/** Las claves que no le dicen nada al modelo y ocupan: identificadores, fotos, enlaces. */
const SOBRA = /(^id$|Id$|_id$|^ids?$|foto|miniatura|url|enlace|clave|version|^orden$|icono|color)/i;
/** Las claves que llevan dinero. */
const DINERO =
  /(centimos|precio|coste|valor|importe|margen|euros|foodcost|food_cost|comision|pvp)/i;

/** De céntimos a «12,50 €», para que el modelo no tenga que dividir. */
function enEuros(centimos: number): string {
  return `${(centimos / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

/**
 * Deja una salida de consulta en lo justo: sin lo que sobra, las listas recortadas, los
 * céntimos en euros y, si no ve importes, sin dinero. Se exporta para probarla sola.
 */
export function loJusto(valor: unknown, conDinero: boolean, hondo = 0): unknown {
  if (hondo > 6) return undefined;
  if (Array.isArray(valor)) {
    const cosas = valor
      .slice(0, COSAS_POR_LISTA)
      .map((v) => loJusto(v, conDinero, hondo + 1))
      .filter((v) => v !== undefined);
    return valor.length > COSAS_POR_LISTA
      ? [...cosas, `…y ${String(valor.length - COSAS_POR_LISTA)} más`]
      : cosas;
  }
  if (valor !== null && typeof valor === 'object') {
    const fuera: Record<string, unknown> = {};
    for (const [clave, dentro] of Object.entries(valor)) {
      if (SOBRA.test(clave)) continue;
      if (DINERO.test(clave)) {
        if (!conDinero) continue;
        if (/centimos/i.test(clave) && typeof dentro === 'number') {
          fuera[clave.replace(/_?centimos/i, '') || 'euros'] = enEuros(dentro);
          continue;
        }
      }
      const justo = loJusto(dentro, conDinero, hondo + 1);
      if (justo === undefined || justo === null) continue;
      if (Array.isArray(justo) && justo.length === 0) continue;
      fuera[clave] = justo;
    }
    return Object.keys(fuera).length === 0 ? undefined : fuera;
  }
  if (typeof valor === 'string') return valor.length > 160 ? `${valor.slice(0, 160)}…` : valor;
  return valor;
}

/** Qué se mira en cada app, además de lo de hoy. */
const DE_CADA_APP: Readonly<
  Record<string, readonly { readonly titulo: string; readonly consulta: UnaDeLasDeSiempre }[]>
> = {
  '': [{ titulo: 'Objetivos', consulta: misObjetivos }],
  almacen: [
    { titulo: 'Almacén hoy', consulta: almacenHoy },
    { titulo: 'Compras de hoy', consulta: comprasDeHoy },
  ],
  escandallos: [{ titulo: 'Escandallos y fichas', consulta: misFichas }],
  carta: [{ titulo: 'La carta', consulta: miCarta }],
  negocio: [{ titulo: 'Objetivos', consulta: misObjetivos }],
};

/** Cómo se llama cada app en la pantalla, para que Fogón la nombre igual. */
const NOMBRE_DE_LA_APP: Readonly<Record<string, string>> = {
  '': 'el Panel',
  almacen: 'Almacén',
  escandallos: 'Escandallos',
  carta: 'Carta',
  calendario: 'Calendario',
  equipo: 'Equipo',
  servicio: 'Servicio',
  negocio: 'Negocio',
  cuaderno: 'Cuaderno',
  ajustes: 'Ajustes',
};

/**
 * Para qué sirve cada app, en una línea: así Fogón contesta «¿qué puedo hacer aquí?»
 * (una de las sugerencias, 19-oct) sin inventarse pantallas.
 */
const PARA_QUE_SIRVE: Readonly<Record<string, string>> = {
  '': 'El Panel: lo que hay que atender hoy, tus cifras y tus atajos. El botón «+» abre lo que más se hace (fichar, apuntar una merma, escribir en el tablón) y a Fogón.',
  almacen:
    'Almacén: Resumen (lo bajo mínimo y lo que caduca), Productos (dar de alta, precios, mínimos), Compras (pedidos a proveedores, recibir mercancía, albaranes y facturas), Mermas y Movimientos; y contar el inventario.',
  escandallos:
    'Escandallos: Resumen, Escandallos (desgranar cada plato: lo que lleva, lo que cuesta y lo que deja en cada canal; «Rellenar con Fogón» hace un borrador) y Fichas (la ficha técnica con sus pasos y fotos, y su PDF).',
  carta:
    'Carta: las secciones y los platos con su precio y su foto, y los canales de reparto (como Uber Eats) con su comisión.',
  calendario: 'Calendario: el horario de la semana, los turnos y lo que viene.',
  equipo:
    'Equipo: quién está hoy, las personas y sus accesos, los fichajes y las incidencias, y el registro de jornada.',
  servicio: 'Servicio: el día a día del local y cerrar la caja.',
  negocio: 'Negocio: las ventas, los informes del día, la semana y el mes, y las reseñas.',
  cuaderno: 'Cuaderno: notas e incidencias del local.',
  ajustes: 'Ajustes: el local, la marca, los avisos, el plan y las apps conectadas.',
};

export interface ResumenParaFogon {
  readonly texto: string;
  /** El sello (0023): de qué local y organización, a qué hora y cuántas letras. */
  readonly sello: Record<string, unknown>;
  readonly conDinero: boolean;
}

/** La app de `donde` («almacen/compras» → «almacen»). */
export function laAppDe(donde: string): string {
  return donde.split('/')[0] ?? '';
}

async function unTrozo(
  contexto: Contexto,
  puede: { ver(permiso: Permiso): boolean },
  titulo: string,
  laConsulta: UnaDeLasDeSiempre,
  conDinero: boolean,
): Promise<string | null> {
  if (laConsulta.exige !== undefined && !puede.ver(laConsulta.exige)) return null;
  try {
    const salida = await laConsulta.ejecutar(contexto, {});
    const justo = loJusto(salida, conDinero);
    return justo === undefined ? null : `## ${titulo}\n${JSON.stringify(justo)}`;
  } catch (fallo) {
    // Un trozo que la aplicación dice que no aplica (sin local, sin datos todavía) no
    // impide contestar. Un fallo de la base, sí: la transacción ya no vale, y se dice.
    if (fallo instanceof FalloDeAplicacion) return null;
    throw fallo;
  }
}

/** El resumen de lo que hay, para quien pregunta, donde está. */
export async function elResumenParaFogon(
  contexto: Contexto,
  local: { readonly id: string; readonly organizacionId: string },
  donde: string,
): Promise<ResumenParaFogon> {
  const app = laAppDe(donde);
  const trozos = DE_CADA_APP[app] ?? [];
  const permisos = new Set<Permiso>(['dato.precio_de_compra', 'dato.ventas']);
  if (loDeHoyConsulta.exige !== undefined) permisos.add(loDeHoyConsulta.exige);
  for (const t of trozos) if (t.consulta.exige !== undefined) permisos.add(t.consulta.exige);
  const puede = await loQuePuede(contexto, local.id, [...permisos]);
  const conDinero = puede.ver('dato.precio_de_compra') || puede.ver('dato.ventas');

  const filas = await contexto.sql<{ nombre: string; hora: string }[]>`
    select l.nombre,
           to_char(${contexto.ahora.toISOString()}::timestamptz at time zone l.zona_horaria,
                   'DD-MM-YYYY HH24:MI') as hora
      from estook.local l where l.id = ${local.id}::uuid
  `;
  const nombre = filas[0]?.nombre ?? 'tu local';
  const hora = filas[0]?.hora ?? '';
  const quien = await quienPregunta(contexto, local.id);

  const partes: string[] = [
    `# RESUMEN DE ESTOOK · ${nombre} · ${hora} (hora del local)`,
    `Estás en: ${NOMBRE_DE_LA_APP[app] ?? 'Estook'}${donde.includes('/') ? ` (${donde.split('/').slice(1).join(' · ')})` : ''}.`,
    ...(PARA_QUE_SIRVE[app] === undefined ? [] : [PARA_QUE_SIRVE[app]]),
    ...(quien === null
      ? []
      : [
          `Te pregunta ${quien.nombre} (su puesto en este local: ${quien.puesto}). Llámale por su nombre si viene a cuento y contesta pensando en lo que hace su puesto.`,
        ]),
    conDinero
      ? 'Quien pregunta ve importes y costes.'
      : 'Quien pregunta NO ve importes ni costes: no des ningún precio, coste, margen ni cantidad de dinero. Si te lo pide, dile que eso no lo lleva su puesto.',
  ];
  const deHoy = await unTrozo(contexto, puede, 'Lo de hoy', loDeHoyConsulta, conDinero);
  if (deHoy !== null) partes.push(deHoy);
  for (const t of trozos) {
    const trozo = await unTrozo(contexto, puede, t.titulo, t.consulta, conDinero);
    if (trozo !== null) partes.push(trozo);
  }

  let texto = partes.join('\n\n');
  if (texto.length > LETRAS_DEL_RESUMEN) texto = `${texto.slice(0, LETRAS_DEL_RESUMEN)}…`;
  return {
    texto,
    conDinero,
    sello: {
      localId: local.id,
      organizacionId: local.organizacionId,
      hecho: contexto.ahora.toISOString(),
      donde,
      letras: texto.length,
    },
  };
}
