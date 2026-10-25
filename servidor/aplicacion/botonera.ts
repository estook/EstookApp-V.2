import {
  LO_MAS_PEDIDO,
  loQueProponeElNombre,
  loQueValeEnElBoton,
  type CaminoDeLaBotonera,
  type ColorDeLaBotonera,
  type PaseDeLaBotonera,
  type QuienLoPrepara,
} from '@estook/dominio';
import type { Contexto } from './contrato.ts';

/**
 * **La botonera de Estook TPV, leída** (T3, decisión 0111; Anexo 11.11): sus páginas y sus
 * botones como están guardados, y cómo se montó. La leen el TPV al pedir
 * (`la_carta_de_la_sala`) y su editor (`la_botonera`).
 *
 * **Sin montar** (`camino` nulo), el TPV enseña la carta como hasta T3: una página por
 * sección, con lo que propone su nombre. Es lo de un local recién llegado, mientras no elige
 * en Ajustes del TPV › Productos.
 */

export interface PaginaGuardada {
  readonly id: string;
  readonly nombre: string;
  readonly orden: number;
  readonly color: ColorDeLaBotonera | null;
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
  readonly seccionId: string | null;
}

export interface BotonGuardado {
  readonly id: string;
  readonly paginaId: string;
  readonly platoId: string;
  readonly orden: number;
  readonly color: ColorDeLaBotonera | null;
  /** Nulos: los de su página. */
  readonly quienLoPrepara: QuienLoPrepara | null;
  readonly pase: PaseDeLaBotonera | null;
  readonly fijado: boolean;
}

export interface LaBotoneraGuardada {
  readonly camino: CaminoDeLaBotonera | null;
  readonly entraSolo: boolean;
  readonly paginas: readonly PaginaGuardada[];
  readonly botones: readonly BotonGuardado[];
}

export async function laBotoneraGuardada(
  contexto: Contexto,
  localId: string,
): Promise<LaBotoneraGuardada> {
  const [local, paginas, botones] = await Promise.all([
    contexto.sql<{ camino: CaminoDeLaBotonera | null; entra_solo: boolean }[]>`
      select botonera_camino as camino, botonera_entra_solo as entra_solo
        from estook.local where id = ${localId}::uuid
    `,
    contexto.sql<
      {
        id: string;
        nombre: string;
        orden: number;
        color: ColorDeLaBotonera | null;
        quien_lo_prepara: QuienLoPrepara;
        pase: PaseDeLaBotonera;
        seccion_id: string | null;
      }[]
    >`
      select id::text as id, nombre, orden, color, quien_lo_prepara, pase,
             seccion_id::text as seccion_id
        from estook.pagina_del_tpv
       where local_id = ${localId}::uuid
       order by orden, nombre
    `,
    contexto.sql<
      {
        id: string;
        pagina_id: string;
        plato_id: string;
        orden: number;
        color: ColorDeLaBotonera | null;
        quien_lo_prepara: QuienLoPrepara | null;
        pase: PaseDeLaBotonera | null;
        fijado: boolean;
      }[]
    >`
      select id::text as id, pagina_id::text as pagina_id, plato_id::text as plato_id, orden,
             color, quien_lo_prepara, pase, fijado
        from estook.boton_del_tpv
       where local_id = ${localId}::uuid
       order by orden, creado_en
    `,
  ]);
  return {
    camino: local[0]?.camino ?? null,
    entraSolo: local[0]?.entra_solo ?? false,
    paginas: paginas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      orden: p.orden,
      color: p.color,
      quienLoPrepara: p.quien_lo_prepara,
      pase: p.pase,
      seccionId: p.seccion_id,
    })),
    botones: botones.map((b) => ({
      id: b.id,
      paginaId: b.pagina_id,
      platoId: b.plato_id,
      orden: b.orden,
      color: b.color,
      quienLoPrepara: b.quien_lo_prepara,
      pase: b.pase,
      fijado: b.fijado,
    })),
  };
}

/**
 * **Quién prepara un plato y en qué pase sale, por la botonera**: el de su primer botón; sin
 * botón (una botonera sin montar), lo que propone el nombre de su sección. Lo usa `pedir`
 * cuando el aparato no lo dice.
 */
export async function loQueValeParaElPlato(
  contexto: Contexto,
  localId: string,
  platoId: string,
): Promise<{
  readonly enLaBotonera: boolean;
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
}> {
  const filas = await contexto.sql<
    {
      quien_pagina: QuienLoPrepara;
      pase_pagina: PaseDeLaBotonera;
      quien_boton: QuienLoPrepara | null;
      pase_boton: PaseDeLaBotonera | null;
    }[]
  >`
    select g.quien_lo_prepara as quien_pagina, g.pase as pase_pagina,
           b.quien_lo_prepara as quien_boton, b.pase as pase_boton
      from estook.boton_del_tpv b
      join estook.pagina_del_tpv g on g.id = b.pagina_id
     where b.local_id = ${localId}::uuid and b.plato_id = ${platoId}::uuid
     order by g.orden, b.orden
     limit 1
  `;
  const fila = filas[0];
  if (fila !== undefined) {
    return {
      enLaBotonera: true,
      ...loQueValeEnElBoton(
        { quienLoPrepara: fila.quien_pagina, pase: fila.pase_pagina },
        { quienLoPrepara: fila.quien_boton, pase: fila.pase_boton },
      ),
    };
  }
  const seccion = await contexto.sql<{ nombre: string | null }[]>`
    select s.nombre from estook.plato p
      left join estook.seccion_de_carta s on s.id = p.seccion_id
     where p.id = ${platoId}::uuid
  `;
  return { enLaBotonera: false, ...loQueProponeElNombre(seccion[0]?.nombre ?? '') };
}

/**
 * **«Lo más pedido»** (Anexo 11.10): lo más vendido **a esta hora** (una hora antes o
 * después) en las últimas cuatro semanas, de más a menos. Solo los platos de la carta, sin
 * los de dentro de un menú ni lo quitado.
 */
export async function loMasPedido(contexto: Contexto, localId: string): Promise<readonly string[]> {
  const filas = await contexto.sql<{ plato_id: string }[]>`
    with ahora as (
      select extract(hour from ${contexto.ahora.toISOString()}::timestamptz at time zone l.zona_horaria) as hora,
             l.zona_horaria
        from estook.local l where l.id = ${localId}::uuid
    )
    select li.plato_id::text as plato_id
      from estook.linea_de_cuenta li, ahora
     where li.local_id = ${localId}::uuid
       and li.plato_id is not null and li.parte_de is null and li.menu_id is null
       and li.quitada_en is null
       and li.pedida_en > ${contexto.ahora.toISOString()}::timestamptz
                          - make_interval(days => ${LO_MAS_PEDIDO.semanas * 7})
       and least(
             abs(extract(hour from li.pedida_en at time zone ahora.zona_horaria) - ahora.hora),
             24 - abs(extract(hour from li.pedida_en at time zone ahora.zona_horaria) - ahora.hora)
           ) <= ${LO_MAS_PEDIDO.horasAlrededor}
     group by li.plato_id
     order by sum(li.cantidad) desc, max(li.pedida_en) desc
     limit ${LO_MAS_PEDIDO.cuantos}
  `;
  return filas.map((f) => f.plato_id);
}

/** Si el local ya eligió cómo montar su botonera (Ajustes del TPV › Productos). */
export async function laBotoneraEstaMontada(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ camino: string | null }[]>`
    select botonera_camino as camino from estook.local where id = ${localId}::uuid
  `;
  return (filas[0]?.camino ?? null) !== null;
}
