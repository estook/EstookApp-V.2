import { z } from 'zod';
import {
  CAFES_DE_SERIE,
  TOPES_DE_LA_DOSIS,
  UNIDADES_DE_USO,
  elProductoDelCafe,
  sinAcentos,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { elLibroDelLocal } from '../escandallos.ts';
import { elLocalDelServicio } from '../sala.ts';
import { puedeMontarLasBebidas } from '../consultas/bebidas.ts';
import { soloEnLaCaja } from './aparatos.ts';
import { crearElProductoEnLaPagina, laPaginaPorSuNombre } from './botonera.ts';
import { guardarLaReceta, vincularUnPlato } from './fichas.ts';

/**
 * **«Monta tus bebidas»** (T3 · 2 · 2, decisión 0114; 0106, 19 a 23): las bebidas, las copas y
 * los cafés del local, puestos en el TPV de una vez, con lo que ya hay. Cada uno es **un plato
 * de la carta** con su botón, y **su escandallo**: «tal cual» con su ración (la caña, 200 ml del
 * barril; la copa, 50 ml de su botella) o con su receta (el café con leche). Así el almacén
 * descontará igual que con todo lo demás.
 *
 *   montar_bebidas     las del almacén, cada ración con su precio
 *   montar_copas       las botellas, con la dosis de la casa y el «¿Con qué?» de sus refrescos
 *   montar_cafes       los de serie que se encienden, con su receta si el almacén tiene lo suyo
 *   cambiar_las_dosis  la de la copa y la de la copa de vino, una vez para todo el local
 *
 * Escriben en la carta y en Escandallos: piden los dos permisos, además de los Ajustes del TPV.
 */

const id = z.string().uuid();
const centimos = z.number().int().min(0).max(100_000_000);
const nombreDeBoton = z.string().trim().min(1).max(120);

const DEL_TPV = {
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],
} as const;

async function elLocalDeLasBebidas(contexto: Contexto): Promise<string> {
  soloEnLaCaja(contexto);
  const localId = elLocalDelServicio(contexto);
  if (!(await puedeMontarLasBebidas(contexto, localId))) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque:
        'Montar las bebidas las pone en tu carta y en Escandallos: lo hace quien puede cambiar las dos.',
    });
  }
  return localId;
}

/** Los nombres que ya tiene la carta: lo que se llama igual no se repite. */
async function losNombresDeLaCarta(contexto: Contexto, localId: string): Promise<Set<string>> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.plato where local_id = ${localId}::uuid and activo
  `;
  return new Set(filas.map((f) => sinAcentos(f.nombre)));
}

async function anotar(contexto: Contexto, accion: string, localId: string, despues: unknown) {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, 'local', ${localId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

// ═══ Las bebidas del almacén ═════════════════════════════════════════════════════

const entradaMontarBebidas = z
  .object({
    bebidas: z
      .array(
        z
          .object({
            producto_id: id,
            /** El nombre de su botón: «Caña», «Rioja crianza · copa». */
            nombre: nombreDeBoton,
            pagina: z.string().trim().min(1).max(30),
            cantidad: z.number().positive().max(100_000),
            unidad: z.enum(UNIDADES_DE_USO),
            precio_centimos: centimos,
          })
          .strict(),
      )
      .min(1)
      .max(300),
  })
  .strict();

export const montarBebidas = comando<
  z.infer<typeof entradaMontarBebidas>,
  { puestas: number; yaEstaban: string[] }
>({
  nombre: 'montar_bebidas',
  entrada: entradaMontarBebidas,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = await elLocalDeLasBebidas(contexto);
    const nombres = await losNombresDeLaCarta(contexto, localId);
    const yaEstaban: string[] = [];
    let puestas = 0;
    for (const b of entrada.bebidas) {
      if (nombres.has(sinAcentos(b.nombre))) {
        yaEstaban.push(b.nombre);
        continue;
      }
      const paginaId = await laPaginaPorSuNombre(contexto, localId, b.pagina);
      const { platoId } = await crearElProductoEnLaPagina(contexto, localId, {
        nombre: b.nombre,
        precioCentimos: b.precio_centimos,
        paginaId,
        quienLoPrepara: null,
      });
      // **Tal cual, con su ración**: la caña, 200 ml del barril; la lata, una (0106, 19).
      await vincularUnPlato(contexto, localId, platoId, {
        productoId: b.producto_id,
        cantidad: b.cantidad,
        unidad: b.unidad,
      });
      nombres.add(sinAcentos(b.nombre));
      puestas += 1;
    }
    await anotar(contexto, 'montar_bebidas', localId, { puestas, yaEstaban });
    return { puestas, yaEstaban };
  },
});

// ═══ Las copas, que se hacen solas ═══════════════════════════════════════════════

const CON_QUE = '¿Con qué?';
const SOLO_CON_HIELO = 'Solo, con hielo';

const entradaMontarCopas = z
  .object({
    botellas: z
      .array(
        z
          .object({
            producto_id: id,
            nombre: nombreDeBoton,
            precio_centimos: centimos,
            /** La suya, si no es la de la casa (el chupito, 30 ml). */
            dosis_ml: z
              .number()
              .int()
              .min(TOPES_DE_LA_DOSIS.minimoMl)
              .max(TOPES_DE_LA_DOSIS.maximoMl)
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    /** Los refrescos del «¿Con qué?», del almacén. */
    con_que: z.array(id).max(30),
  })
  .strict();

export const montarCopas = comando<
  z.infer<typeof entradaMontarCopas>,
  { puestas: number; yaEstaban: string[]; grupoId: string }
>({
  nombre: 'montar_copas',
  entrada: entradaMontarCopas,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = await elLocalDeLasBebidas(contexto);
    const local = await contexto.sql<{ dosis: number }[]>`
      select dosis_de_la_copa_ml as dosis from estook.local where id = ${localId}::uuid
    `;
    const dosisDeLaCasa = local[0]?.dosis ?? 50;

    // **El «¿Con qué?»**, uno para todas las copas: cada refresco gasta el suyo, y la copa ya
    // lo lleva en su precio (Richi, 25-oct). Si ya estaba, se pone al día.
    const refrescos = await contexto.sql<{ id: string; nombre: string }[]>`
      select id::text as id, nombre from estook.producto
       where local_id = ${localId}::uuid and activo
         and id = any (${comoLista(entrada.con_que)}::text::uuid[])
       order by nombre
    `;
    const ya = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.grupo_de_opciones
       where local_id = ${localId}::uuid and estook.sin_acentos(nombre) = estook.sin_acentos(${CON_QUE})
    `;
    let grupoId = ya[0]?.id;
    if (grupoId === undefined) {
      grupoId = (
        await contexto.sql<{ id: string }[]>`
          insert into estook.grupo_de_opciones (local_id, nombre, minimo, maximo)
          values (${localId}::uuid, ${CON_QUE}, 1, 1)
          returning id::text as id
        `
      )[0]?.id;
      if (grupoId === undefined) throw new FalloDeAplicacion('sin_permiso');
    }
    await contexto.sql`delete from estook.opcion_de_grupo where grupo_id = ${grupoId}::uuid`;
    for (const [orden, r] of refrescos.entries()) {
      await contexto.sql`
        insert into estook.opcion_de_grupo
          (local_id, grupo_id, nombre, orden, anade_producto_id, anade_cantidad, anade_unidad)
        values (${localId}::uuid, ${grupoId}::uuid, ${r.nombre.slice(0, 40)}, ${orden},
                ${r.id}::uuid, 1, 'ud')
      `;
    }
    await contexto.sql`
      insert into estook.opcion_de_grupo (local_id, grupo_id, nombre, orden)
      values (${localId}::uuid, ${grupoId}::uuid, ${SOLO_CON_HIELO}, ${refrescos.length})
    `;

    const paginaId = await laPaginaPorSuNombre(contexto, localId, 'Copas');
    const nombres = await losNombresDeLaCarta(contexto, localId);
    const yaEstaban: string[] = [];
    let puestas = 0;
    for (const b of entrada.botellas) {
      if (nombres.has(sinAcentos(b.nombre))) {
        yaEstaban.push(b.nombre);
        continue;
      }
      const { platoId } = await crearElProductoEnLaPagina(contexto, localId, {
        nombre: b.nombre,
        precioCentimos: b.precio_centimos,
        paginaId,
        quienLoPrepara: null,
      });
      // **Se hace sola**: su dosis de la botella, tal cual; el refresco lo pone el «¿Con qué?».
      await vincularUnPlato(contexto, localId, platoId, {
        productoId: b.producto_id,
        cantidad: b.dosis_ml ?? dosisDeLaCasa,
        unidad: 'ml',
      });
      await contexto.sql`
        insert into estook.grupo_del_plato (local_id, plato_id, grupo_id, orden)
        values (${localId}::uuid, ${platoId}::uuid, ${grupoId}::uuid, 0)
        on conflict (plato_id, grupo_id) do nothing
      `;
      nombres.add(sinAcentos(b.nombre));
      puestas += 1;
    }
    await anotar(contexto, 'montar_copas', localId, { puestas, yaEstaban });
    return { puestas, yaEstaban, grupoId };
  },
});

// ═══ Los cafés, que vienen hechos ════════════════════════════════════════════════

const entradaMontarCafes = z
  .object({
    cafes: z
      .array(
        z
          .object({
            clave: z.enum(CAFES_DE_SERIE.map((c) => c.clave) as [string, ...string[]]),
            precio_centimos: centimos,
          })
          .strict(),
      )
      .min(1)
      .max(CAFES_DE_SERIE.length),
  })
  .strict();

export const montarCafes = comando<
  z.infer<typeof entradaMontarCafes>,
  { puestos: number; conReceta: number; yaEstaban: string[] }
>({
  nombre: 'montar_cafes',
  entrada: entradaMontarCafes,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    const localId = await elLocalDeLasBebidas(contexto);
    const { productos } = await elLibroDelLocal(contexto, localId, false);
    const delAlmacen = [...productos.values()].filter((p) => p.activo);
    const paginaId = await laPaginaPorSuNombre(contexto, localId, 'Cafés');
    const nombres = await losNombresDeLaCarta(contexto, localId);
    const yaEstaban: string[] = [];
    let puestos = 0;
    let conReceta = 0;
    for (const c of entrada.cafes) {
      const deSerie = CAFES_DE_SERIE.find((x) => x.clave === c.clave);
      if (deSerie === undefined) continue;
      if (nombres.has(sinAcentos(deSerie.nombre))) {
        yaEstaban.push(deSerie.nombre);
        continue;
      }
      const { platoId } = await crearElProductoEnLaPagina(contexto, localId, {
        nombre: deSerie.nombre,
        precioCentimos: c.precio_centimos,
        paginaId,
        quienLoPrepara: null,
      });
      // **Unido solo a su café y su leche del almacén** (0106, 23). Si falta algo, sin receta:
      // una a medias daría un coste falso (Plan, M9), y la app enseña el aproximado.
      const lineas = deSerie.lleva.map((l) => ({
        producto: elProductoDelCafe(l.que, delAlmacen),
        cantidad: l.cantidad,
        unidad: l.unidad,
      }));
      if (lineas.every((l) => l.producto !== null)) {
        await guardarLaReceta(
          contexto,
          localId,
          { platoId },
          {
            lineas: lineas.map((l) => ({
              productoId: l.producto?.id ?? null,
              elaboracionId: null,
              cantidad: l.cantidad,
              unidad: l.unidad,
              nota: null,
            })),
            talCual: false,
            pasos: [],
            notas: null,
            minutos: null,
          },
          { version: null },
        );
        conReceta += 1;
      }
      nombres.add(sinAcentos(deSerie.nombre));
      puestos += 1;
    }
    await anotar(contexto, 'montar_cafes', localId, { puestos, conReceta, yaEstaban });
    return { puestos, conReceta, yaEstaban };
  },
});

// ═══ Las dosis de la casa ════════════════════════════════════════════════════════

const dosis = z.number().int().min(TOPES_DE_LA_DOSIS.minimoMl).max(TOPES_DE_LA_DOSIS.maximoMl);

const entradaCambiarLasDosis = z
  .object({ copa_ml: dosis.optional(), copa_de_vino_ml: dosis.optional() })
  .strict();

export const cambiarLasDosis = comando<
  z.infer<typeof entradaCambiarLasDosis>,
  { cambiadas: boolean }
>({
  nombre: 'cambiar_las_dosis',
  entrada: entradaCambiarLasDosis,
  ...DEL_TPV,

  async ejecutar(contexto, entrada) {
    soloEnLaCaja(contexto);
    const localId = elLocalDelServicio(contexto);
    // Lo que ya está montado no cambia: la dosis de la casa vale para lo que se monte después.
    await contexto.sql`
      select estook.cambiar_lo_del_tpv_del_local(
        ${localId}::uuid,
        p_dosis_ml => ${entrada.copa_ml ?? null}::smallint,
        p_copa_de_vino_ml => ${entrada.copa_de_vino_ml ?? null}::smallint
      )
    `;
    await anotar(contexto, 'cambiar_las_dosis', localId, entrada);
    return { cambiadas: true };
  },
});
