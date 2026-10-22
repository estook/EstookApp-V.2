import { z } from 'zod';
import { equilibrioDeLaCarta, type EquilibrioDeLaCarta } from '@estook/dominio';
import { consulta } from '../contrato.ts';
import { elLocalDeLaCarta } from './mi-carta.ts';

/**
 * El equilibrio de la carta (M10 · 1, decisión 0102; Manifiesto, cap. 14): sección a
 * sección, con los principios de Omnes. Lo lee quien ve la Carta: son precios de venta,
 * los que ya ve la sala. **Dice; no toca nada.**
 */
export const elEquilibrioDeLaCarta = consulta<Record<string, never>, EquilibrioDeLaCarta>({
  nombre: 'el_equilibrio_de_la_carta',
  entrada: z.object({}).strict(),
  exige: 'app.carta',

  async ejecutar(contexto) {
    const localId = elLocalDeLaCarta(contexto);
    const filas = await contexto.sql<
      { seccion: string | null; orden: number | null; nombre: string; precio: number | null }[]
    >`
      select s.nombre as seccion, s.orden, p.nombre, p.precio_centimos as precio
        from estook.plato p
        left join estook.seccion_de_carta s on s.id = p.seccion_id
       where p.local_id = ${localId}::uuid and p.activo
         -- Lo que nace en un menú no está en la carta (0104): no la desequilibra.
         and p.en_la_carta
       order by s.orden nulls last, s.nombre, p.orden, p.nombre
    `;
    const secciones = new Map<
      string,
      { nombre: string; platos: { nombre: string; precioCentimos: number | null }[] }
    >();
    for (const fila of filas) {
      const nombre = fila.seccion ?? 'Sin sección';
      const suya = secciones.get(nombre) ?? { nombre, platos: [] };
      suya.platos.push({ nombre: fila.nombre, precioCentimos: fila.precio });
      secciones.set(nombre, suya);
    }
    return equilibrioDeLaCarta([...secciones.values()]);
  },
});
