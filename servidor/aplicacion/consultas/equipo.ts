import { z } from 'zod';
import {
  comoVaConSuContrato,
  costeDeUnaHora,
  fechaEnElLocal,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  loQueCuesta,
  masDias,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Lo que Equipo enseña de verdad (M6½, anticipando M13 y M15).
 *
 * ── La regla que ordena este fichero ────────────────────────────────────────
 *
 * La misma que ordena Inventario: **un rol sin costes no recibe ni un campo de
 * coste en ninguna respuesta**. Aquí el campo es lo que cobra una persona, y el
 * permiso es `dato.coste_de_personal`. No se esconde en la pantalla: **no se
 * envía**. Un jefe de cocina ve las horas de su equipo y no ve un solo euro, y eso
 * se cumple porque el JSON no lo lleva.
 *
 * ── Y la segunda: las horas son de quien las hace ───────────────────────────
 *
 * Cualquiera ve **las suyas**, tenga o no tenga Equipo. No es una concesión: es lo
 * que dice la ley y lo que dice el sentido común, y la política de la 0027 lo
 * cumple sin que ninguna consulta tenga que acordarse.
 */

// ── El local y su reloj ──────────────────────────────────────────────────────

interface RelojDelLocal {
  readonly localId: string;
  readonly zonaHoraria: string;
  readonly corte: string;
  readonly hoy: string;
  /** La jornada operativa, que antes de la hora de corte es la de ayer. */
  readonly jornada: string;
  /** La hora del local ahora mismo, «HH:MM». Para el aviso de fichar. */
  readonly ahora: string;
  /** 1 lunes … 7 domingo, del día de hoy en el local. */
  readonly diaDeLaSemana: number;
  readonly latitud: number | null;
  readonly longitud: number | null;
  readonly radio: number;
}

async function elReloj(contexto: Contexto, localId: string): Promise<RelojDelLocal> {
  const filas = await contexto.sql<
    {
      zona_horaria: string;
      hora_de_corte: string;
      ahora: string;
      dia: number;
      latitud: string | null;
      longitud: string | null;
      radio: number;
    }[]
  >`
    select l.zona_horaria,
           to_char(l.hora_de_corte, 'HH24:MI') as hora_de_corte,
           -- La hora del local **la da Postgres con la zona del local**, no el
           -- reloj de quien pregunta (regla 10). La tableta de una cocina puede
           -- estar en otro huso, y de esto cuelga el aviso de «entras en cinco
           -- minutos».
           to_char(${contexto.ahora.toISOString()}::timestamptz at time zone l.zona_horaria, 'HH24:MI') as ahora,
           extract(isodow from (${contexto.ahora.toISOString()}::timestamptz at time zone l.zona_horaria))::int as dia,
           l.latitud::text as latitud, l.longitud::text as longitud,
           l.radio_de_fichaje_metros as radio
      from estook.local l
     where l.id = ${localId}
  `;

  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');

  return {
    localId,
    zonaHoraria: fila.zona_horaria,
    corte: fila.hora_de_corte,
    hoy: fechaEnElLocal(contexto.ahora, fila.zona_horaria),
    jornada: jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte)),
    ahora: fila.ahora,
    diaDeLaSemana: fila.dia,
    latitud: fila.latitud === null ? null : Number(fila.latitud),
    longitud: fila.longitud === null ? null : Number(fila.longitud),
    radio: fila.radio,
  };
}

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para fichar. Elige uno primero.',
    });
  }
  return localId;
}

// ── Mi fichaje: ¿estoy dentro? ───────────────────────────────────────────────

export interface TramoDelHorario {
  readonly dia: number;
  readonly entra: string;
  readonly sale: string;
}

export interface MiFichaje {
  /** El turno abierto, si lo hay. */
  readonly abierto: {
    readonly fichajeId: string;
    readonly entroEn: string;
    readonly local: string;
    readonly localId: string;
    readonly minutos: number;
    readonly metros: number | null;
  } | null;
  /** Lo que llevo hecho en esta jornada, contando el turno abierto. */
  readonly minutosDeHoy: number;
  /** Y en la semana que va de lunes a hoy. */
  readonly minutosDeLaSemana: number;
  readonly jornada: string;
  /** La hora del local, «HH:MM». La decide el servidor (regla 10). */
  readonly horaDelLocal: string;
  readonly diaDeLaSemana: number;
  /** Mi horario de siempre, entero. Vacío si no tengo ninguno puesto. */
  readonly horario: readonly TramoDelHorario[];
  /** Si el local tiene marcado dónde está: de eso depende poder decir «a X m». */
  readonly elLocalSabeDondeEsta: boolean;
  readonly radioMetros: number;
  readonly puedoFichar: boolean;
}

export const miFichaje = consulta<Record<string, never>, MiFichaje>({
  nombre: 'mi_fichaje',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocal(contexto);
    const reloj = await elReloj(contexto, localId);

    const puede = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_editar('accion.fichar', ${localId}::uuid) as puede
    `;

    const abiertos = await contexto.sql<
      {
        id: string;
        entro_en: string;
        local: string;
        local_id: string;
        minutos: number;
        metros: number | null;
      }[]
    >`
      select f.id::text as id,
             to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
             l.nombre as local, f.local_id::text as local_id,
             floor(extract(epoch from (${contexto.ahora.toISOString()}::timestamptz - f.entro_en)) / 60)::int as minutos,
             f.entro_metros as metros
        from estook.fichaje f
        join estook.local l on l.id = f.local_id
       where f.persona_id = ${contexto.personaId} and f.salio_en is null
    `;

    // El lunes de esta semana: la jornada de hoy menos (isodow - 1) días.
    const lunes = masDias(fechaOperativa(reloj.jornada), -(reloj.diaDeLaSemana - 1));

    const sumas = await contexto.sql<{ de_hoy: number; de_la_semana: number }[]>`
      select
        coalesce(sum(
          case when f.fecha_operativa = ${reloj.jornada}::date
               then extract(epoch from (coalesce(f.salio_en, ${contexto.ahora.toISOString()}::timestamptz) - f.entro_en)) / 60
               else 0 end
        ), 0)::int as de_hoy,
        coalesce(sum(
          extract(epoch from (coalesce(f.salio_en, ${contexto.ahora.toISOString()}::timestamptz) - f.entro_en)) / 60
        ), 0)::int as de_la_semana
        from estook.fichaje f
       where f.persona_id = ${contexto.personaId}
         and f.fecha_operativa >= ${lunes}::date
         and f.fecha_operativa <= ${reloj.jornada}::date
    `;

    const horario = await contexto.sql<{ dia: number; entra: string; sale: string }[]>`
      select dia_de_la_semana as dia,
             to_char(entra, 'HH24:MI') as entra,
             to_char(sale, 'HH24:MI') as sale
        from estook.horario_habitual
       where persona_id = ${contexto.personaId}
         and local_id = ${localId}
         and desde <= current_date
         and (hasta is null or hasta >= current_date)
       order by dia_de_la_semana, entra
    `;

    const abierto = abiertos[0];

    return {
      abierto:
        abierto === undefined
          ? null
          : {
              fichajeId: abierto.id,
              entroEn: abierto.entro_en,
              local: abierto.local,
              localId: abierto.local_id,
              minutos: abierto.minutos,
              metros: abierto.metros,
            },
      minutosDeHoy: sumas[0]?.de_hoy ?? 0,
      minutosDeLaSemana: sumas[0]?.de_la_semana ?? 0,
      jornada: reloj.jornada,
      horaDelLocal: reloj.ahora,
      diaDeLaSemana: reloj.diaDeLaSemana,
      horario,
      elLocalSabeDondeEsta: reloj.latitud !== null && reloj.longitud !== null,
      radioMetros: reloj.radio,
      puedoFichar: puede[0]?.puede === true,
    };
  },
});

// ── Quién está trabajando ahora ──────────────────────────────────────────────

export interface QuienEstaTrabajando {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly rolNombre: string;
  /** Dentro ahora mismo. */
  readonly dentro: boolean;
  readonly desde: string | null;
  readonly minutos: number | null;
  readonly metros: number | null;
  readonly enElLocal: boolean | null;
  /** Lo que lleva hecho hoy, contando el turno abierto. */
  readonly minutosDeHoy: number;
  /** Cuándo se le vio por última vez en la aplicación. */
  readonly ultimoAccesoEn: string | null;
  /** Si tiene sesión viva ahora mismo: eso es «en línea», y es otra cosa. */
  readonly enLinea: boolean;
  /** Su horario de hoy, si tiene puesto uno. */
  readonly entraHoyALas: string | null;
  /** Si el turno lleva demasiado abierto: casi siempre es que se olvidó salir. */
  readonly turnoSospechoso: boolean;
}

export interface SalidaFichajesDeHoy {
  readonly gente: readonly QuienEstaTrabajando[];
  readonly jornada: string;
  readonly horaDelLocal: string;
  readonly dentro: number;
  readonly fuera: number;
}

/** Cuánto tiene que llevar abierto un turno para ser sospechoso. Doce horas. */
const SOSPECHOSO_DESDE_MINUTOS = 12 * 60;

export const fichajesDeHoy = consulta<Record<string, never>, SalidaFichajesDeHoy>({
  nombre: 'fichajes_de_hoy',
  entrada: z.object({}).strict(),
  exige: 'app.equipo',

  async ejecutar(contexto) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocal(contexto);
    const reloj = await elReloj(contexto, localId);

    const filas = await contexto.sql<
      {
        persona_id: string;
        nombre: string;
        apellidos: string | null;
        rol_nombre: string;
        desde: string | null;
        minutos: number | null;
        metros: number | null;
        minutos_de_hoy: number;
        ultimo_acceso_en: Date | null;
        en_linea: boolean;
        entra_hoy: string | null;
      }[]
    >`
      with equipo as (
        -- Quién trabaja aquí: las membresías vigentes que alcanzan este local.
        -- Es la misma cuenta que hace quien_tiene_acceso, y se hace aqui otra
        -- vez a propósito: aquella responde «quién puede entrar en Estook» y esta
        -- responde «quién trabaja en este local», que hoy coinciden y el día que
        -- haya personal sin acceso a la aplicación dejarán de coincidir.
        select distinct on (p.id)
               p.id, p.nombre, p.apellidos, p.ultimo_acceso_en, r.nombre as rol_nombre,
               r.amplitud
          from estook.membresia m
          join estook.persona p on p.id = m.persona_id
          join estook.rol r on r.codigo = m.rol
          join estook.local l on l.id = ${localId}::uuid
         where m.organizacion_id = l.organizacion_id
           and (
             m.alcance = 'organizacion'
             or (m.alcance = 'area' and l.area_id = m.area_id)
             or (m.alcance = 'local' and l.id = m.local_id)
           )
           and p.activa
           and m.desde <= current_date
           and (m.hasta is null or m.hasta >= current_date)
           and (m.revocada_en is null or m.revocada_en > now())
           and p.id in (select persona_id from estook.personas_visibles())
         order by p.id, r.amplitud desc
      )
      select e.id::text as persona_id, e.nombre, e.apellidos, e.rol_nombre,
             to_char(a.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde,
             case when a.entro_en is null then null
                  else floor(extract(epoch from (${contexto.ahora.toISOString()}::timestamptz - a.entro_en)) / 60)::int
             end as minutos,
             a.entro_metros as metros,
             coalesce(h.minutos, 0)::int as minutos_de_hoy,
             e.ultimo_acceso_en,
             exists (
               select 1 from estook.sesion s
                where s.persona_id = e.id
                  and s.cerrada_en is null
                  and s.caduca_en > now()
             ) as en_linea,
             to_char(ho.entra, 'HH24:MI') as entra_hoy
        from equipo e
        left join lateral (
          select f.entro_en, f.entro_metros
            from estook.fichaje f
           where f.persona_id = e.id and f.salio_en is null
           limit 1
        ) a on true
        left join lateral (
          select sum(
            extract(epoch from (
              coalesce(f.salio_en, ${contexto.ahora.toISOString()}::timestamptz) - f.entro_en
            )) / 60
          ) as minutos
            from estook.fichaje f
           where f.persona_id = e.id
             and f.local_id = ${localId}
             and f.fecha_operativa = ${reloj.jornada}::date
        ) h on true
        left join lateral (
          select hh.entra
            from estook.horario_habitual hh
           where hh.persona_id = e.id
             and hh.local_id = ${localId}
             and hh.dia_de_la_semana = ${reloj.diaDeLaSemana}
             and hh.desde <= current_date
             and (hh.hasta is null or hh.hasta >= current_date)
           order by hh.entra
           limit 1
        ) ho on true
       order by (a.entro_en is null), e.nombre
    `;

    const gente = filas.map((f) => ({
      personaId: f.persona_id,
      nombre: f.nombre,
      apellidos: f.apellidos,
      rolNombre: f.rol_nombre,
      dentro: f.desde !== null,
      desde: f.desde,
      minutos: f.minutos,
      metros: f.metros,
      enElLocal: f.metros === null ? null : f.metros <= reloj.radio,
      minutosDeHoy: f.minutos_de_hoy,
      ultimoAccesoEn: f.ultimo_acceso_en?.toISOString() ?? null,
      enLinea: f.en_linea,
      entraHoyALas: f.entra_hoy,
      turnoSospechoso: (f.minutos ?? 0) > SOSPECHOSO_DESDE_MINUTOS,
    }));

    return {
      gente,
      jornada: reloj.jornada,
      horaDelLocal: reloj.ahora,
      dentro: gente.filter((quien) => quien.dentro).length,
      fuera: gente.filter((quien) => !quien.dentro).length,
    };
  },
});

// ── El resumen: horas por persona en un periodo ──────────────────────────────

export interface FilaDelResumen {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly rolNombre: string;
  readonly minutos: number;
  readonly turnos: number;
  /** Turnos que se quedaron sin cerrar. Son los que hay que revisar. */
  readonly sinCerrar: number;
  /** Los que alguien tuvo que corregir a mano. */
  readonly corregidos: number;
  /** Los que se ficharon lejos del local, o sin decir dónde. */
  readonly fueraDelLocal: number;
  readonly sinUbicacion: number;
  /** Las de contrato a la semana, si las tiene puestas. */
  readonly horasSemanales: number | null;
  /** Minutos de más (positivo) o de menos frente al contrato. Nulo si no hay. */
  readonly frenteAlContrato: number | null;

  // ── Solo con `dato.coste_de_personal` ──────────────────────────────────────
  readonly costeCentimos?: number | null;
  readonly costeDeLaHoraCentimos?: number | null;
}

export interface SalidaResumenDelEquipo {
  readonly filas: readonly FilaDelResumen[];
  readonly desde: string;
  readonly hasta: string;
  readonly dias: number;
  readonly minutosTotales: number;
  readonly puedeVerCostes: boolean;
  readonly costeTotalCentimos?: number | null;
}

export const entradaResumenDelEquipo = z
  .object({
    desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    hasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export type EntradaResumenDelEquipo = z.infer<typeof entradaResumenDelEquipo>;

/**
 * Las horas de cada uno, en un periodo.
 *
 * ── Por qué la suma la hace Postgres ────────────────────────────────────────
 *
 * Porque un mes de una plantilla de quince son unos cuatrocientos fichajes, y
 * traérselos para sumarlos aquí es traerse cuatrocientas filas para devolver
 * quince. Lo que **no** hace Postgres es convertir minutos en dinero: eso lo hace
 * el motor del dominio, que es su único dueño (regla 6), y por eso el coste sale
 * de multiplicar aquí lo que la base ha contado.
 */
export const resumenDelEquipo = consulta<EntradaResumenDelEquipo, SalidaResumenDelEquipo>({
  nombre: 'resumen_del_equipo',
  entrada: entradaResumenDelEquipo,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocal(contexto);
    const reloj = await elReloj(contexto, localId);

    // Por defecto, los últimos treinta días acabando en la jornada de hoy. Es lo
    // que se mira cuando alguien abre esta pantalla sin pedir nada.
    const hasta = entrada.hasta ?? reloj.jornada;
    const desde = entrada.desde ?? masDias(fechaOperativa(hasta), -29);

    const conCostes = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_ver('dato.coste_de_personal', ${localId}::uuid) as puede
    `;
    const puedeVerCostes = conCostes[0]?.puede === true;

    const filas = await contexto.sql<
      {
        persona_id: string;
        nombre: string;
        apellidos: string | null;
        rol_nombre: string;
        minutos: number;
        turnos: number;
        sin_cerrar: number;
        corregidos: number;
        fuera_del_local: number;
        sin_ubicacion: number;
        forma: string | null;
        importe_centimos: string | null;
        horas_semanales: string | null;
      }[]
    >`
      with equipo as (
        select distinct on (p.id)
               p.id, p.nombre, p.apellidos, r.nombre as rol_nombre, r.amplitud
          from estook.membresia m
          join estook.persona p on p.id = m.persona_id
          join estook.rol r on r.codigo = m.rol
          join estook.local l on l.id = ${localId}::uuid
         where m.organizacion_id = l.organizacion_id
           and (
             m.alcance = 'organizacion'
             or (m.alcance = 'area' and l.area_id = m.area_id)
             or (m.alcance = 'local' and l.id = m.local_id)
           )
           and p.activa
           and (m.revocada_en is null or m.revocada_en > now())
           and p.id in (select persona_id from estook.personas_visibles())
         order by p.id, r.amplitud desc
      )
      select e.id::text as persona_id, e.nombre, e.apellidos, e.rol_nombre,
             coalesce(t.minutos, 0)::int as minutos,
             coalesce(t.turnos, 0)::int as turnos,
             coalesce(t.sin_cerrar, 0)::int as sin_cerrar,
             coalesce(t.corregidos, 0)::int as corregidos,
             coalesce(t.fuera_del_local, 0)::int as fuera_del_local,
             coalesce(t.sin_ubicacion, 0)::int as sin_ubicacion,
             r.forma::text as forma,
             r.importe_centimos::text as importe_centimos,
             r.horas_semanales::text as horas_semanales
        from equipo e
        left join lateral (
          select sum(
                   extract(epoch from (
                     coalesce(f.salio_en, ${contexto.ahora.toISOString()}::timestamptz) - f.entro_en
                   )) / 60
                 ) as minutos,
                 count(*) as turnos,
                 count(*) filter (where f.salio_en is null) as sin_cerrar,
                 count(*) filter (where f.corregido_por is not null) as corregidos,
                 count(*) filter (
                   where f.entro_metros is not null and f.entro_metros > ${reloj.radio}
                 ) as fuera_del_local,
                 count(*) filter (where f.entro_sin_donde is not null) as sin_ubicacion
            from estook.fichaje f
           where f.persona_id = e.id
             and f.local_id = ${localId}
             and f.fecha_operativa >= ${desde}::date
             and f.fecha_operativa <= ${hasta}::date
        ) t on true
        -- La retribución **vigente al final del periodo**, no la de hoy: un
        -- resumen de marzo tiene que costar lo que costaba en marzo.
        left join lateral (
          select re.forma, re.importe_centimos, re.horas_semanales
            from estook.retribucion re
           where re.persona_id = e.id
             and re.desde <= ${hasta}::date
             and (re.hasta is null or re.hasta >= ${hasta}::date)
             and (re.local_id is null or re.local_id = ${localId})
           order by re.local_id nulls last, re.desde desc
           limit 1
        ) r on true
       order by coalesce(t.minutos, 0) desc, e.nombre
    `;

    // Los días del periodo, contados por la base para no volver a discutir con
    // los cambios de hora.
    const cuantos = await contexto.sql<{ dias: number }[]>`
      select (${hasta}::date - ${desde}::date + 1)::int as dias
    `;
    const dias = cuantos[0]?.dias ?? 1;

    let costeTotal = 0;
    const compuestas = filas.map((f) => {
      const horasSemanales = f.horas_semanales === null ? null : Number(f.horas_semanales);
      const base: FilaDelResumen = {
        personaId: f.persona_id,
        nombre: f.nombre,
        apellidos: f.apellidos,
        rolNombre: f.rol_nombre,
        minutos: f.minutos,
        turnos: f.turnos,
        sinCerrar: f.sin_cerrar,
        corregidos: f.corregidos,
        fueraDelLocal: f.fuera_del_local,
        sinUbicacion: f.sin_ubicacion,
        horasSemanales,
        frenteAlContrato: comoVaConSuContrato(f.minutos, horasSemanales, dias),
      };

      if (!puedeVerCostes || f.forma === null || f.importe_centimos === null) return base;

      const retribucion = {
        forma: f.forma as 'por_hora' | 'mensual',
        importeCentimos: Number(f.importe_centimos),
        horasSemanales,
      };
      const laHora = costeDeUnaHora(retribucion);
      const coste = loQueCuesta(f.minutos, retribucion);
      if (coste !== null) costeTotal += coste;

      return { ...base, costeDeLaHoraCentimos: laHora, costeCentimos: coste };
    });

    return {
      filas: compuestas,
      desde,
      hasta,
      dias,
      minutosTotales: filas.reduce((total, f) => total + f.minutos, 0),
      puedeVerCostes,
      ...(puedeVerCostes ? { costeTotalCentimos: costeTotal } : {}),
    };
  },
});

// ── La ficha de una persona ──────────────────────────────────────────────────

export interface SalidaUnaPersona {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly correo?: string;
  readonly rolNombre: string;
  readonly rol: string;
  readonly estado: 'dentro' | 'sin_estrenar' | 'fuera';
  readonly enLinea: boolean;
  readonly ultimoAccesoEn: string | null;
  readonly desde: string;

  /** Si está fichado ahora mismo. */
  readonly trabajandoDesde: string | null;
  readonly minutosDelTurno: number | null;
  readonly minutosDeLaSemana: number;
  readonly minutosDelMes: number;

  readonly horario: readonly TramoDelHorario[];
  readonly ultimosFichajes: readonly {
    readonly fichajeId: string;
    readonly fecha: string;
    readonly entroEn: string;
    readonly salioEn: string | null;
    readonly minutos: number | null;
    readonly metros: number | null;
    readonly enElLocal: boolean | null;
    readonly sinUbicacion: string | null;
    readonly corregidoPor: string | null;
    readonly motivoDeLaCorreccion: string | null;
  }[];

  // ── Solo con `dato.coste_de_personal` ──────────────────────────────────────
  readonly retribucion?: {
    readonly forma: 'por_hora' | 'mensual';
    readonly importeCentimos: number;
    readonly horasSemanales: number | null;
    readonly puesto: string | null;
    readonly desde: string;
  } | null;
  readonly costeDelMesCentimos?: number | null;
  readonly puedeVerCostes: boolean;
  /** Si quien mira puede cambiarle la retribución: no se toca hacia arriba. */
  readonly puedePonerRetribucion: boolean;
  readonly puedeEditar: boolean;
  readonly radioMetros: number;
}

export const unaPersona = consulta<{ persona_id: string }, SalidaUnaPersona>({
  nombre: 'una_persona',
  entrada: z.object({ persona_id: z.string().uuid() }).strict(),

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocal(contexto);
    const reloj = await elReloj(contexto, localId);
    const esMia = entrada.persona_id === contexto.personaId;

    const permisos = await contexto.sql<
      { costes: boolean; equipo: boolean; datos: boolean }[]
    >`
      select estook.puede_ver('dato.coste_de_personal', ${localId}::uuid) as costes,
             estook.puede_editar('app.equipo', ${localId}::uuid) as equipo,
             estook.puede_ver('dato.datos_del_equipo', ${localId}::uuid) as datos
    `;
    const puedeVerCostes = permisos[0]?.costes === true || esMia;
    const puedeEditar = permisos[0]?.equipo === true;
    const veLosDatos = permisos[0]?.datos === true || esMia;

    const gente = await contexto.sql<
      {
        id: string;
        nombre: string;
        apellidos: string | null;
        correo: string;
        rol: string;
        rol_nombre: string;
        amplitud: number;
        desde: Date;
        ultimo_acceso_en: Date | null;
        en_linea: boolean;
        vigente: boolean;
      }[]
    >`
      select distinct on (p.id)
             p.id::text as id, p.nombre, p.apellidos, p.correo,
             m.rol, r.nombre as rol_nombre, r.amplitud, m.desde,
             p.ultimo_acceso_en,
             exists (
               select 1 from estook.sesion s
                where s.persona_id = p.id and s.cerrada_en is null and s.caduca_en > now()
             ) as en_linea,
             (
               p.activa
               and m.desde <= current_date
               and (m.hasta is null or m.hasta >= current_date)
               and (m.revocada_en is null or m.revocada_en > now())
             ) as vigente
        from estook.persona p
        join estook.membresia m on m.persona_id = p.id
        join estook.rol r on r.codigo = m.rol
        join estook.local l on l.id = ${localId}::uuid
       where p.id = ${entrada.persona_id}
         and m.organizacion_id = l.organizacion_id
         and p.id in (select persona_id from estook.personas_visibles())
       order by p.id, r.amplitud desc
    `;

    const quien = gente[0];
    if (!quien) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa persona no está, o no es de un local que puedas ver.',
      });
    }

    const lunes = masDias(fechaOperativa(reloj.jornada), -(reloj.diaDeLaSemana - 1));
    const haceUnMes = masDias(fechaOperativa(reloj.jornada), -29);

    const horas = await contexto.sql<
      { de_la_semana: number; del_mes: number; abierto: string | null; minutos: number | null }[]
    >`
      select
        coalesce(sum(
          case when f.fecha_operativa >= ${lunes}::date
               then extract(epoch from (coalesce(f.salio_en, ${contexto.ahora.toISOString()}::timestamptz) - f.entro_en)) / 60
               else 0 end
        ), 0)::int as de_la_semana,
        coalesce(sum(
          extract(epoch from (coalesce(f.salio_en, ${contexto.ahora.toISOString()}::timestamptz) - f.entro_en)) / 60
        ), 0)::int as del_mes,
        max(case when f.salio_en is null
                 then to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end) as abierto,
        max(case when f.salio_en is null
                 then floor(extract(epoch from (${contexto.ahora.toISOString()}::timestamptz - f.entro_en)) / 60)::int
            end) as minutos
        from estook.fichaje f
       where f.persona_id = ${entrada.persona_id}
         and f.fecha_operativa >= ${haceUnMes}::date
         and f.fecha_operativa <= ${reloj.jornada}::date
    `;

    const fichajes = await contexto.sql<
      {
        id: string;
        fecha: string;
        entro_en: string;
        salio_en: string | null;
        minutos: number | null;
        metros: number | null;
        sin_donde: string | null;
        corregido_por: string | null;
        motivo: string | null;
      }[]
    >`
      select f.id::text as id,
             to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha,
             to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
             to_char(f.salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en,
             case when f.salio_en is null then null
                  else floor(extract(epoch from (f.salio_en - f.entro_en)) / 60)::int end as minutos,
             f.entro_metros as metros,
             f.entro_sin_donde as sin_donde,
             c.nombre as corregido_por,
             f.motivo_de_la_correccion as motivo
        from estook.fichaje f
        left join estook.persona c on c.id = f.corregido_por
       where f.persona_id = ${entrada.persona_id}
       order by f.entro_en desc
       limit 30
    `;

    const horario = await contexto.sql<{ dia: number; entra: string; sale: string }[]>`
      select dia_de_la_semana as dia,
             to_char(entra, 'HH24:MI') as entra,
             to_char(sale, 'HH24:MI') as sale
        from estook.horario_habitual
       where persona_id = ${entrada.persona_id}
         and local_id = ${localId}
         and desde <= current_date
         and (hasta is null or hasta >= current_date)
       order by dia_de_la_semana, entra
    `;

    // La retribución: las políticas de la 0027 ya deciden si vuelve algo. Si esta
    // persona no puede verla, la consulta devuelve cero filas y aquí no hay nada
    // que esconder — que es exactamente como tiene que ser.
    const retribuciones = await contexto.sql<
      {
        forma: string;
        importe_centimos: string;
        horas_semanales: string | null;
        puesto: string | null;
        desde: string;
      }[]
    >`
      select forma::text as forma, importe_centimos::text as importe_centimos,
             horas_semanales::text as horas_semanales, puesto,
             to_char(desde, 'YYYY-MM-DD') as desde
        from estook.retribucion
       where persona_id = ${entrada.persona_id}
         and hasta is null
         and (local_id is null or local_id = ${localId})
       order by local_id nulls last
       limit 1
    `;

    // ¿Puede ponerle sueldo? La misma regla que el comando: no hacia arriba.
    const mio = await contexto.sql<{ amplitud: number | null }[]>`
      select max(r.amplitud) as amplitud
        from estook.membresia m join estook.rol r on r.codigo = m.rol
       where m.persona_id = ${contexto.personaId}
         and m.revocada_en is null
    `;
    const puedePonerRetribucion =
      permisos[0]?.costes === true &&
      !esMia &&
      (mio[0]?.amplitud ?? 0) > quien.amplitud;

    const retribucion = retribuciones[0];
    const laRetribucion =
      retribucion === undefined
        ? null
        : {
            forma: retribucion.forma as 'por_hora' | 'mensual',
            importeCentimos: Number(retribucion.importe_centimos),
            horasSemanales:
              retribucion.horas_semanales === null ? null : Number(retribucion.horas_semanales),
            puesto: retribucion.puesto,
            desde: retribucion.desde,
          };

    const delMes = horas[0]?.del_mes ?? 0;

    return {
      personaId: quien.id,
      nombre: quien.nombre,
      apellidos: quien.apellidos,
      ...(veLosDatos ? { correo: quien.correo } : {}),
      rol: quien.rol,
      rolNombre: quien.rol_nombre,
      estado: !quien.vigente ? 'fuera' : quien.ultimo_acceso_en === null ? 'sin_estrenar' : 'dentro',
      enLinea: quien.en_linea,
      ultimoAccesoEn: quien.ultimo_acceso_en?.toISOString() ?? null,
      desde: quien.desde.toISOString().slice(0, 10),

      trabajandoDesde: horas[0]?.abierto ?? null,
      minutosDelTurno: horas[0]?.minutos ?? null,
      minutosDeLaSemana: horas[0]?.de_la_semana ?? 0,
      minutosDelMes: delMes,

      horario,
      ultimosFichajes: fichajes.map((f) => ({
        fichajeId: f.id,
        fecha: f.fecha,
        entroEn: f.entro_en,
        salioEn: f.salio_en,
        minutos: f.minutos,
        metros: f.metros,
        enElLocal: f.metros === null ? null : f.metros <= reloj.radio,
        sinUbicacion: f.sin_donde,
        corregidoPor: f.corregido_por,
        motivoDeLaCorreccion: f.motivo,
      })),

      ...(puedeVerCostes
        ? {
            retribucion: laRetribucion,
            costeDelMesCentimos:
              laRetribucion === null ? null : loQueCuesta(delMes, laRetribucion),
          }
        : {}),
      puedeVerCostes,
      puedePonerRetribucion,
      puedeEditar,
      radioMetros: reloj.radio,
    };
  },
});
