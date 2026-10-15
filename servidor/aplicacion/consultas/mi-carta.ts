import { z } from 'zod';
import { CANALES_DE_VENTA, type CanalDeVenta } from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { firmarLasFotos, laFirmada } from '../fotos-firmadas.ts';

/**
 * Tu carta (M9 · 1, decisión 0086): las secciones, los platos y los canales.
 *
 * El plato es uno solo y **la Carta es la dueña de lo que se vende y a cuánto**: su
 * sección, su descripción, su foto, su precio de sala y su precio en cada canal.
 * La lee quien tiene Carta (el camarero también: la necesita para contestar en
 * sala); **las comisiones y los envases, solo quien la edita**, que es quien los pone.
 */

export interface UnCanal {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  readonly tipo: 'propio' | 'plataforma';
  /** Si hoy se puede activar (el catálogo de la app, 0086). */
  readonly disponible: boolean;
  readonly activo: boolean;
  /** Solo a quien edita la carta; a los demás, nulo. */
  readonly comisionPorcentaje: number | null;
  readonly envaseCentimos: number | null;
  readonly comisionHabitual: number | null;
}

export interface UnaSeccion {
  readonly id: string;
  readonly nombre: string;
  readonly orden: number;
}

export interface UnPlato {
  readonly id: string;
  readonly seccionId: string | null;
  readonly nombre: string;
  readonly descripcion: string | null;
  /** El de sala, con IVA. */
  readonly precioCentimos: number | null;
  /** Los que tiene puestos a mano en otros canales; sin uno, vale el de sala. */
  readonly precios: Readonly<Partial<Record<CanalDeVenta, number>>>;
  readonly foto: string | null;
  readonly miniatura: string | null;
  readonly orden: number;
  readonly activo: boolean;
  readonly version: number;
}

export interface MiCarta {
  readonly puedeEditar: boolean;
  readonly canales: readonly UnCanal[];
  readonly secciones: readonly UnaSeccion[];
  /** Todos, también los archivados (`activo: false`), que se ven aparte. */
  readonly platos: readonly UnPlato[];
}

export async function puedeEditarLaCarta(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_editar('app.carta', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

export function elLocalDeLaCarta(contexto: Contexto): string {
  const localId = contexto.sesion?.localId ?? null;
  if (localId === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'La carta es de un local: elige uno primero.',
    });
  }
  return localId;
}

export async function losCanalesDelLocal(
  contexto: Contexto,
  localId: string,
  conComisiones: boolean,
): Promise<readonly UnCanal[]> {
  const filas = await contexto.sql<
    {
      canal: CanalDeVenta;
      activo: boolean;
      comision_porcentaje: string | null;
      envase_centimos: number | null;
    }[]
  >`
    select canal::text as canal, activo, comision_porcentaje::text as comision_porcentaje,
           envase_centimos
      from estook.canal_de_venta_del_local
     where local_id = ${localId}::uuid
  `;
  const delLocal = new Map(filas.map((f) => [f.canal, f]));
  return CANALES_DE_VENTA.map((como) => {
    const suyo = delLocal.get(como.canal);
    // Sala está siempre; los demás, si se activaron y hoy se pueden tener.
    const activo = como.canal === 'sala' || (como.disponible && suyo?.activo === true);
    return {
      canal: como.canal,
      nombre: como.nombre,
      tipo: como.tipo,
      disponible: como.disponible,
      activo,
      comisionPorcentaje:
        conComisiones && suyo?.comision_porcentaje != null
          ? Number(suyo.comision_porcentaje)
          : null,
      envaseCentimos: conComisiones ? (suyo?.envase_centimos ?? null) : null,
      comisionHabitual: como.comisionHabitual,
    };
  });
}

interface FilaDePlato {
  id: string;
  seccion_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio_centimos: number | null;
  foto_clave: string | null;
  miniatura_clave: string | null;
  orden: number;
  activo: boolean;
  version: number;
  precios: Record<string, number> | null;
}

export async function losPlatos(
  contexto: Contexto,
  localId: string,
  soloEste: string | null = null,
): Promise<readonly UnPlato[]> {
  const filas = await contexto.sql<FilaDePlato[]>`
    select p.id, p.seccion_id, p.nombre, p.descripcion, p.precio_centimos,
           p.foto_clave, p.miniatura_clave, p.orden, p.activo, p.version,
           (select jsonb_object_agg(pp.canal::text, pp.precio_centimos)
              from estook.precio_de_plato pp where pp.plato_id = p.id) as precios
      from estook.plato p
     where p.local_id = ${localId}::uuid
       and (${soloEste}::uuid is null or p.id = ${soloEste}::uuid)
     order by p.orden, p.nombre
  `;
  const firmadas = await firmarLasFotos(
    contexto,
    filas.flatMap((f) => [f.foto_clave, f.miniatura_clave]),
  );
  return filas.map((f) => ({
    id: f.id,
    seccionId: f.seccion_id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    precioCentimos: f.precio_centimos,
    precios: f.precios ?? {},
    foto: laFirmada(firmadas, f.foto_clave),
    miniatura: laFirmada(firmadas, f.miniatura_clave),
    orden: f.orden,
    activo: f.activo,
    version: f.version,
  }));
}

export const miCarta = consulta<Record<string, never>, MiCarta>({
  nombre: 'mi_carta',
  entrada: z.object({}).strict(),
  exige: 'app.carta',

  async ejecutar(contexto) {
    const localId = elLocalDeLaCarta(contexto);
    const puedeEditar = await puedeEditarLaCarta(contexto, localId);
    const [canales, secciones, platos] = await Promise.all([
      losCanalesDelLocal(contexto, localId, puedeEditar),
      contexto.sql<UnaSeccion[]>`
        select id, nombre, orden from estook.seccion_de_carta
         where local_id = ${localId}::uuid
         order by orden, nombre
      `,
      losPlatos(contexto, localId),
    ]);
    return {
      puedeEditar,
      canales,
      secciones: secciones.map((s) => ({ id: s.id, nombre: s.nombre, orden: s.orden })),
      platos,
    };
  },
});

// ── Un plato, con su historial ───────────────────────────────────────────────

export interface UnCambio {
  readonly cuando: string;
  readonly quien: string | null;
  readonly que: string;
  readonly antes: Record<string, unknown> | null;
  readonly despues: Record<string, unknown> | null;
}

export interface ElPlato {
  readonly plato: UnPlato;
  readonly puedeEditar: boolean;
  /** Lo último que se le ha cambiado, de lo más nuevo a lo más viejo (la auditoría). */
  readonly historial: readonly UnCambio[];
}

/** Las líneas del historial que se enseñan: las del plato, las treinta últimas. */
const LINEAS_DEL_HISTORIAL = 30;

export const unPlato = consulta<{ plato_id: string }, ElPlato>({
  nombre: 'un_plato',
  entrada: z.object({ plato_id: z.string().uuid() }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const [plato] = await losPlatos(contexto, localId, entrada.plato_id);
    if (plato === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese plato no está en la carta de este local.',
      });
    }
    const puedeEditar = await puedeEditarLaCarta(contexto, localId);
    const historial = await contexto.sql<
      {
        cuando: string;
        quien: string | null;
        accion: string;
        antes: Record<string, unknown> | null;
        despues: Record<string, unknown> | null;
      }[]
    >`
      select to_char(a.ocurrido_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cuando,
             p.nombre as quien, a.accion, a.antes, a.despues
        from estook.auditoria a
        left join estook.persona p on p.id = a.persona_id
       where a.entidad = 'plato' and a.entidad_id = ${entrada.plato_id}
         and a.local_id = ${localId}::uuid
       order by a.ocurrido_en desc, a.id desc
       limit ${LINEAS_DEL_HISTORIAL}
    `;
    return {
      plato,
      puedeEditar,
      historial: historial.map((h) => ({
        cuando: h.cuando,
        quien: h.quien,
        que: h.accion,
        antes: h.antes,
        despues: h.despues,
      })),
    };
  },
});
