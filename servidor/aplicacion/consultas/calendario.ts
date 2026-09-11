import { z } from 'zod';
import {
  cuandoCae,
  desplegar,
  fechaEnElLocal,
  fechaOperativa,
  masDias,
  type Capa,
  type EventoGuardado,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Lo que viene (M7) · hoy y mañana, del Calendario de todos.
 *
 * «Hoy y mañana en el Panel, que es donde se mira cada mañana» (0031). Es lo que
 * M7 pinta del Calendario; las pantallas de mes, semana y día son M14, y **leen
 * esta misma tabla**: por eso esta consulta ya sabe pedir más de dos días.
 *
 * Quién ve qué no lo decide esta consulta: lo decide la política de la base. Un
 * camarero pregunta lo mismo que un jefe de cocina y le vuelve menos, porque las
 * entregas y las caducidades son de Inventario y él no lo lleva.
 */

export interface OcurrenciaDicha {
  readonly id: string;
  readonly capa: Capa;
  readonly titulo: string;
  readonly detalle: string | null;
  readonly ir: string | null;
  readonly desde: string | null;
  readonly hasta: string | null;
  readonly hecho: boolean;
  readonly repetido: boolean;
}

export interface DiaQueViene {
  readonly fecha: string;
  /** «Hoy», «Mañana», «El martes». */
  readonly cuando: string;
  readonly ocurrencias: readonly OcurrenciaDicha[];
}

export interface SalidaLoQueViene {
  readonly hoy: string;
  readonly dias: readonly DiaQueViene[];
}

export const loQueViene = consulta<{ dias?: number | undefined }, SalidaLoQueViene>({
  nombre: 'lo_que_viene',
  entrada: z.object({ dias: z.coerce.number().int().min(1).max(31).optional() }).strict(),
  exige: 'app.calendario',

  async ejecutar(contexto, entrada) {
    const localId = contexto.sesion?.localId;
    if (!localId) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Hay que estar dentro de un local para ver su calendario. Elige uno primero.',
      });
    }

    const zonas = await contexto.sql<{ zona_horaria: string }[]>`
      select zona_horaria from estook.local where id = ${localId}
    `;
    // El día del calendario de pared, no la jornada: «mañana llega Makro» es
    // mañana para el proveedor aunque el bar no haya cerrado la caja de hoy.
    const hoy = fechaEnElLocal(contexto.ahora, zonas[0]?.zona_horaria ?? 'Europe/Madrid');
    const cuantos = entrada.dias ?? 2;
    const hasta = masDias(hoy, cuantos - 1);

    const filas = await contexto.sql<
      {
        id: string;
        capa: Capa;
        dia: string;
        hasta_el: string | null;
        desde: string | null;
        hasta: string | null;
        se_repite: number[] | null;
        titulo: string;
        detalle: string | null;
        ir: string | null;
        grupo: string | null;
        hecho: boolean;
      }[]
    >`
      select id, capa::text as capa, to_char(dia, 'YYYY-MM-DD') as dia,
             to_char(hasta_el, 'YYYY-MM-DD') as hasta_el,
             to_char(desde, 'HH24:MI') as desde, to_char(hasta, 'HH24:MI') as hasta,
             se_repite::int[] as se_repite, titulo, detalle, ir, grupo, hecho
        from estook.evento_de_calendario
       where local_id = ${localId}
         and dia <= ${hasta}::date
         and coalesce(hasta_el, case when se_repite is null then dia end, ${hasta}::date) >= ${hoy}::date
       order by dia
       limit 500
    `;

    const eventos: EventoGuardado[] = filas.map((f) => ({
      id: f.id,
      capa: f.capa,
      dia: fechaOperativa(f.dia),
      hastaEl: f.hasta_el === null ? null : fechaOperativa(f.hasta_el),
      desde: f.desde,
      hasta: f.hasta,
      seRepite: f.se_repite,
      titulo: f.titulo,
      detalle: f.detalle,
      ir: f.ir,
      grupo: f.grupo,
      hecho: f.hecho,
    }));

    const ocurrencias = desplegar(eventos, hoy, hasta);

    const dias: DiaQueViene[] = [];
    for (let i = 0; i < cuantos; i++) {
      const fecha = masDias(hoy, i);
      const dicho = cuandoCae(fecha, hoy);
      dias.push({
        fecha,
        cuando: dicho.charAt(0).toUpperCase() + dicho.slice(1),
        ocurrencias: ocurrencias
          .filter((o) => o.fecha === fecha)
          .map((o) => ({
            id: o.id,
            capa: o.capa,
            titulo: o.titulo,
            detalle: o.detalle,
            ir: o.ir,
            desde: o.desde,
            hasta: o.hasta,
            hecho: o.hecho,
            repetido: o.repetido,
          })),
      });
    }

    return { hoy, dias };
  },
});
