import { laActividad, type ActividadDeCliente, type FechaOperativa } from '@estook/dominio';
import type { Contexto } from './contrato.ts';

/**
 * La foto diaria del uso de cada cliente (A2 · 0041).
 *
 * «La actividad no se guarda: se calcula cada noche con lo que hace el cliente.»
 * La base cuenta (`estook.lo_que_hacen_los_clientes`) y **el dominio decide**
 * (`laActividad`); aquí solo se juntan y se guarda la foto del día, una por
 * cliente y día: repetirla el mismo día la sustituye.
 *
 * La hace el reloj a diario, y el admin puede pedirla en el momento («Calcular
 * ahora») el primer día, antes de que haya pasado ninguna noche.
 */
export async function hacerLaFotoDelUso(contexto: Contexto, hoy: FechaOperativa): Promise<number> {
  const filas = await contexto.sql<
    {
      organizacion_id: string;
      dias_de_alta: number;
      productos: number;
      dias_sin_entrar: number | null;
      apuntes_7: number;
      apuntes_14: number;
      apuntes_14_antes: number;
    }[]
  >`select * from estook.lo_que_hacen_los_clientes()`;

  if (filas.length === 0) return 0;
  const fotos = filas.map((f) => ({
    organizacion_id: f.organizacion_id,
    dias_de_alta: f.dias_de_alta,
    productos: f.productos,
    dias_sin_entrar: f.dias_sin_entrar,
    apuntes_7: f.apuntes_7,
    apuntes_14: f.apuntes_14,
    apuntes_14_antes: f.apuntes_14_antes,
    actividad: laActividad({
      diasDeAlta: f.dias_de_alta,
      productos: f.productos,
      diasSinEntrar: f.dias_sin_entrar,
      apuntes7: f.apuntes_7,
      apuntes14: f.apuntes_14,
      apuntes14Antes: f.apuntes_14_antes,
    }) satisfies ActividadDeCliente,
  }));
  // Todas de una vez: con mil clientes, mil escrituras serían mil viajes a la base.
  await contexto.sql`
    insert into plataforma.uso_diario (
      organizacion_id, dia, dias_de_alta, productos, dias_sin_entrar,
      apuntes_7, apuntes_14, apuntes_14_antes, actividad
    )
    select f.organizacion_id, ${hoy}::date, f.dias_de_alta, f.productos, f.dias_sin_entrar,
           f.apuntes_7, f.apuntes_14, f.apuntes_14_antes, f.actividad
      from jsonb_to_recordset(${JSON.stringify(fotos)}::text::jsonb) as f (
        organizacion_id uuid, dias_de_alta integer, productos integer, dias_sin_entrar integer,
        apuntes_7 integer, apuntes_14 integer, apuntes_14_antes integer, actividad text
      )
    on conflict (organizacion_id, dia) do update set
      dias_de_alta = excluded.dias_de_alta, productos = excluded.productos,
      dias_sin_entrar = excluded.dias_sin_entrar, apuntes_7 = excluded.apuntes_7,
      apuntes_14 = excluded.apuntes_14, apuntes_14_antes = excluded.apuntes_14_antes,
      actividad = excluded.actividad
  `;
  return filas.length;
}
