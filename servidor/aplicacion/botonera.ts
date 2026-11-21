import {
  comoSeVeLaSeccion,
  loQueProponeElNombre,
  loQueValeEnElBoton,
  type CaminoDeLaBotonera,
  type ColorDeLaBotonera,
  type IconoDeLaSeccion,
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
  /**
   * Su color y su icono **como se ven** (R3, 0133): lo que eligió el local, y si no, lo que
   * propone su nombre. El color sigue pudiendo ser nulo: el gris de lo que no se reconoce.
   */
  readonly color: ColorDeLaBotonera | null;
  readonly icono: IconoDeLaSeccion;
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
  readonly seccionId: string | null;
  /** «Pan y agua» o «Cafés» (0112); nulo, una página cualquiera. */
  readonly deSiempre: 'pan' | 'cafes' | null;
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
  /** Si su plato es de los recomendados (0120): es del plato, no del botón. */
  readonly recomendado: boolean;
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
        icono: IconoDeLaSeccion | null;
        quien_lo_prepara: QuienLoPrepara;
        pase: PaseDeLaBotonera;
        seccion_id: string | null;
        de_siempre: 'pan' | 'cafes' | null;
      }[]
    >`
      -- El color y el icono de una página que vino de una sección son **los de su sección**
      -- (0143): los mismos en Estook y en el TPV.
      select p.id::text as id, p.nombre, p.orden,
             case when p.seccion_id is null then p.color else s.color end as color,
             case when p.seccion_id is null then p.icono else s.icono end as icono,
             p.quien_lo_prepara, p.pase, p.seccion_id::text as seccion_id, p.de_siempre
        from estook.pagina_del_tpv p
        left join estook.seccion_de_carta s on s.id = p.seccion_id
       where p.local_id = ${localId}::uuid
       order by p.orden, p.nombre
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
        recomendado: boolean;
      }[]
    >`
      select b.id::text as id, b.pagina_id::text as pagina_id, b.plato_id::text as plato_id,
             b.orden, b.color, b.quien_lo_prepara, b.pase, p.recomendado
        from estook.boton_del_tpv b
        join estook.plato p on p.id = b.plato_id
       where b.local_id = ${localId}::uuid
       order by b.orden, b.creado_en
    `,
  ]);
  return {
    camino: local[0]?.camino ?? null,
    entraSolo: local[0]?.entra_solo ?? false,
    paginas: paginas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      orden: p.orden,
      ...comoSeVeLaSeccion(p),
      quienLoPrepara: p.quien_lo_prepara,
      pase: p.pase,
      seccionId: p.seccion_id,
      deSiempre: p.de_siempre,
    })),
    botones: botones.map((b) => ({
      id: b.id,
      paginaId: b.pagina_id,
      platoId: b.plato_id,
      orden: b.orden,
      color: b.color,
      quienLoPrepara: b.quien_lo_prepara,
      pase: b.pase,
      recomendado: b.recomendado,
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

/** Si el local ya eligió cómo montar su botonera (Ajustes del TPV › Productos). */
export async function laBotoneraEstaMontada(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ camino: string | null }[]>`
    select botonera_camino as camino from estook.local where id = ${localId}::uuid
  `;
  return (filas[0]?.camino ?? null) !== null;
}
