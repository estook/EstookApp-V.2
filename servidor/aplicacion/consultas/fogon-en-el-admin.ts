import { z } from 'zod';
import { centimosDeMicroEuros } from '@estook/dominio';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Fogón en el admin: los dos interruptores y lo gastado este mes (decisión 0097).
 *
 * «Eso lo miraremos nosotros con el piloto» (Richi, 18-oct): cuánto pregunta cada
 * cliente, cuántos créditos lleva y **lo que de verdad ha costado**, en euros, con lo
 * apuntado de cada llamada. El mes, el del calendario de Madrid, que es el de la
 * factura de Anthropic.
 */

export interface FogonEnElAdmin {
  readonly encendido: boolean;
  readonly cambiadoEn: string;
  readonly cambiadoPor: string | null;
  /** Lo de todos este mes. */
  readonly mes: { readonly llamadas: number; readonly creditos: number; readonly centimos: number };
  readonly clientes: readonly {
    readonly organizacionId: string;
    readonly nombre: string;
    readonly encendido: boolean;
    readonly llamadas: number;
    readonly creditos: number;
    /** Lo que ha costado, en céntimos enteros, redondeado hacia arriba. */
    readonly centimos: number;
  }[];
}

export const fogonEnElAdmin = consulta<Record<string, never>, FogonEnElAdmin>({
  nombre: 'admin_fogon',
  entrada: z.object({}).strict(),
  soloAdmin: true,

  async ejecutar({ sql }) {
    const general = await sql<
      { encendido: boolean; cambiado_en: Date; cambiado_por: string | null }[]
    >`
      select f.encendido, f.cambiado_en, p.nombre as cambiado_por
        from plataforma.fogon f
        left join estook.persona p on p.id = f.cambiado_por
       where f.unica
    `;
    const fila = general[0];
    if (fila === undefined) throw new FalloDeAplicacion('fallo_nuestro');

    const clientes = await sql<
      {
        organizacion_id: string;
        nombre: string;
        encendido: boolean;
        llamadas: number;
        creditos: number;
        micro_euros: string | number;
      }[]
    >`
      with desde as (
        select date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid' as mes
      ),
      gastado as (
        select f.organizacion_id, count(*)::int as llamadas, sum(f.creditos)::int as creditos,
               sum(f.coste_micro_euros)::bigint as micro_euros
          from estook.llamada_a_fogon f, desde d
         where f.hecha_en >= d.mes
         group by f.organizacion_id
      )
      select c.organizacion_id, c.nombre, coalesce(e.encendido, false) as encendido,
             coalesce(g.llamadas, 0) as llamadas, coalesce(g.creditos, 0) as creditos,
             coalesce(g.micro_euros, 0) as micro_euros
        from estook.los_clientes() c
        left join plataforma.fogon_del_cliente e on e.organizacion_id = c.organizacion_id
        left join gastado g on g.organizacion_id = c.organizacion_id
       where not c.es_ejemplo
       order by coalesce(e.encendido, false) desc, coalesce(g.micro_euros, 0) desc, c.nombre
    `;
    const lista = clientes.map((c) => ({
      organizacionId: c.organizacion_id,
      nombre: c.nombre,
      encendido: c.encendido,
      llamadas: c.llamadas,
      creditos: c.creditos,
      centimos: centimosDeMicroEuros(Number(c.micro_euros)),
    }));
    return {
      encendido: fila.encendido,
      cambiadoEn: fila.cambiado_en.toISOString(),
      cambiadoPor: fila.cambiado_por,
      mes: {
        llamadas: lista.reduce((n, c) => n + c.llamadas, 0),
        creditos: lista.reduce((n, c) => n + c.creditos, 0),
        centimos: centimosDeMicroEuros(clientes.reduce((n, c) => n + Number(c.micro_euros), 0)),
      },
      clientes: lista,
    };
  },
});
