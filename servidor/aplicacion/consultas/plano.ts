import { z } from 'zod';
import {
  tamanoDeLaMesa,
  type CosaDeLaSala,
  type FormaDeMesa,
} from '@estook/dominio';
import { consulta, type Contexto } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';

/**
 * **El plano del local, para dibujarlo en Estook TPV** (T2 · La sala, decisión 0110;
 * Anexo 11.9): sus salas, sus mesas con su forma, su tamaño y su giro, y lo que hay en la
 * sala y no se abre (la barra, las paredes…). Sin las cuentas: lo que pasa en cada mesa
 * lo lee la sala con `el_plano`, que usa esta misma lectura para pintarlas.
 *
 * Lo lee el editor del TPV con el permiso de los Ajustes del TPV (Roles 1.12): quien
 * dibuja el plano no tiene por qué tomar nota. Hasta T2 lo leía Estook › Tu sala.
 */

export interface MesaDibujada {
  readonly id: string;
  readonly nombre: string;
  readonly plazas: number;
  readonly forma: FormaDeMesa;
  readonly x: number;
  readonly y: number;
  /** El tamaño con el que se pinta: el estirado, o el que le toca por sus plazas. */
  readonly ancho: number;
  readonly fondo: number;
  /** Si se estiró a mano: «Volver al tamaño de 4 plazas» lo quita. */
  readonly estirada: boolean;
  readonly giro: number;
}

export interface CosaDibujada {
  readonly id: string;
  readonly tipo: CosaDeLaSala;
  readonly texto: string | null;
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly fondo: number;
  readonly giro: number;
}

export interface SalaDibujada {
  readonly id: string;
  readonly nombre: string;
  readonly orden: number;
  readonly mesas: readonly MesaDibujada[];
  readonly cosas: readonly CosaDibujada[];
}

interface FilaDeMesa {
  id: string;
  zona_id: string;
  nombre: string;
  plazas: number;
  forma: FormaDeMesa;
  x: number;
  y: number;
  ancho: number | null;
  fondo: number | null;
  giro: number;
}

/** Las salas del local con lo dibujado en cada una, en el orden de sus pestañas. */
export async function lasSalasDibujadas(
  contexto: Contexto,
  localId: string,
): Promise<readonly SalaDibujada[]> {
  const [zonas, mesas, cosas] = await Promise.all([
    contexto.sql<{ id: string; nombre: string; orden: number }[]>`
      select id::text as id, nombre, orden from estook.zona_de_sala
       where local_id = ${localId}::uuid and archivada_en is null
       order by orden, nombre
    `,
    contexto.sql<FilaDeMesa[]>`
      select id::text as id, zona_id::text as zona_id, nombre, plazas, forma, x, y, ancho, fondo, giro
        from estook.mesa
       where local_id = ${localId}::uuid and archivada_en is null
       order by nombre
    `,
    contexto.sql<
      {
        id: string;
        zona_id: string;
        tipo: CosaDeLaSala;
        texto: string | null;
        x: number;
        y: number;
        ancho: number;
        fondo: number;
        giro: number;
      }[]
    >`
      select id::text as id, zona_id::text as zona_id, tipo, texto, x, y, ancho, fondo, giro
        from estook.elemento_de_sala
       where local_id = ${localId}::uuid and archivado_en is null
       order by creado_en
    `,
  ]);
  return zonas.map((z) => ({
    id: z.id,
    nombre: z.nombre,
    orden: z.orden,
    mesas: mesas.filter((m) => m.zona_id === z.id).map(laMesaDibujada),
    cosas: cosas
      .filter((c) => c.zona_id === z.id)
      .map((c) => ({
        id: c.id,
        tipo: c.tipo,
        texto: c.texto,
        x: c.x,
        y: c.y,
        ancho: c.ancho,
        fondo: c.fondo,
        giro: c.giro,
      })),
  }));
}

function laMesaDibujada(m: FilaDeMesa): MesaDibujada {
  const propio = tamanoDeLaMesa(m.forma, m.plazas);
  return {
    id: m.id,
    nombre: m.nombre,
    plazas: m.plazas,
    forma: m.forma,
    x: m.x,
    y: m.y,
    ancho: m.ancho ?? propio.ancho,
    fondo: m.fondo ?? propio.fondo,
    estirada: m.ancho !== null || m.fondo !== null,
    giro: m.giro,
  };
}

export interface SalidaElPlanoDelLocal {
  readonly salas: readonly (SalaDibujada & {
    readonly mesas: readonly (MesaDibujada & {
      /** Abierta ahora: se mueve sin tocar su cuenta, pero no se quita (Anexo 11.9). */
      readonly abierta: boolean;
    })[];
    /** Con alguna mesa abierta: no se quita la sala. */
    readonly conAlgoAbierto: boolean;
  })[];
}

export const elPlanoDelLocal = consulta<Record<string, never>, SalidaElPlanoDelLocal>({
  nombre: 'el_plano_del_local',
  entrada: z.object({}).strict(),
  exige: 'accion.ajustes_del_tpv',
  // Se dibuja en el TPV, en la caja o en la tablet; en el móvil de nadie (Anexo 11.9).
  enElTpv: 'solo',
  enLosAparatos: ['caja', 'comandero'],

  async ejecutar(contexto) {
    const localId = elLocalDelServicio(contexto);
    const [salas, abiertas] = await Promise.all([
      lasSalasDibujadas(contexto, localId),
      contexto.sql<{ mesa_id: string }[]>`
        select distinct c.mesa_id::text as mesa_id from estook.cuenta c
         where c.local_id = ${localId}::uuid and c.mesa_id is not null
           and c.liberada_en is null and c.anulada_en is null
      `,
    ]);
    const abierta = new Set(abiertas.map((a) => a.mesa_id));
    return {
      salas: salas.map((s) => ({
        ...s,
        mesas: s.mesas.map((m) => ({ ...m, abierta: abierta.has(m.id) })),
        conAlgoAbierto: s.mesas.some((m) => abierta.has(m.id)),
      })),
    };
  },
});
