import { z } from 'zod';
import {
  comoVaConSuContrato,
  costeDeUnaHora,
  fechaEnElLocal,
  fechaOperativa,
  horaDeCorte,
  jornadaDe,
  llegoTarde,
  loQueCuesta,
  masDias,
  type Retribucion,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';

/**
 * Lo que Equipo enseña de verdad (M6½, anticipando M13 y M15).
 *
 * ── La regla que ordena este fichero ────────────────────────────────────────
 *
 * La misma que ordena Almacén: **un rol sin costes no recibe ni un campo de
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
  readonly margenDeRetraso: number;
}

export async function elReloj(contexto: Contexto, localId: string): Promise<RelojDelLocal> {
  const filas = await contexto.sql<
    {
      zona_horaria: string;
      hora_de_corte: string;
      ahora: string;
      dia: number;
      latitud: string | null;
      longitud: string | null;
      radio: number;
      margen: number;
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
           l.radio_de_fichaje_metros as radio,
           l.margen_de_retraso_minutos as margen
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
    margenDeRetraso: fila.margen,
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
  /**
   * Mis tramos de esta semana, de lo publicado en Horarios. Vacío si la semana no
   * está publicada: el horario de siempre ya no cuenta (0081).
   */
  readonly horario: readonly TramoDelHorario[];
  /** Si el local tiene marcado dónde está: de eso depende poder decir «a X m». */
  readonly elLocalSabeDondeEsta: boolean;
  readonly radioMetros: number;
  /** Los minutos de margen antes de contar un retraso (0040). Se cambian en Ajustes. */
  readonly margenDeRetrasoMinutos: number;
  readonly puedoFichar: boolean;
  /** Si en este local se ficha la pausa de descanso (0068). */
  readonly pausasEnUso: boolean;
  /** Y si cuenta como trabajo. Se cambia en Ajustes → Tu local. */
  readonly pausaCuentaComoTrabajo: boolean;
  /** La pausa en la que estoy ahora, si estoy en una. */
  readonly enPausaDesde: string | null;
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
             floor(estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60)::int as minutos,
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
               then estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60
               else 0 end
        ), 0)::int as de_hoy,
        coalesce(sum(
          estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60
        ), 0)::int as de_la_semana
        from estook.fichaje f
       where f.persona_id = ${contexto.personaId}
         and f.fecha_operativa >= ${lunes}::date
         and f.fecha_operativa <= ${reloj.jornada}::date
    `;

    // **El horario es el publicado** (0069, y desde el 9-oct, el único: 0081). Sin
    // semana publicada no hay tramos, y «entras en cinco minutos» no sale.
    const publicada = await laSemanaPublicada(contexto, localId, lunes);
    const elHorario = publicada
      ? await contexto.sql<{ dia: number; entra: string; sale: string }[]>`
          select extract(isodow from tp.dia)::int as dia,
                 to_char(tp.entra, 'HH24:MI') as entra,
                 to_char(tp.sale, 'HH24:MI') as sale
            from estook.turno_publicado tp
           where tp.persona_id = ${contexto.personaId}
             and tp.local_id = ${localId}
             and tp.tipo = 'trabajo'
             and tp.dia between ${lunes}::date and ${lunes}::date + 6
           order by tp.dia, tp.entra
        `
      : [];

    const abierto = abiertos[0];

    const pausa = await contexto.sql<{ en_uso: boolean; cuenta: boolean; desde: string | null }[]>`
      select l.pausas_en_uso as en_uso, l.pausa_cuenta_como_trabajo as cuenta,
             (select to_char(p.empezo_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                from estook.pausa p
               where p.persona_id = ${contexto.personaId} and p.acabo_en is null) as desde
        from estook.local l
       where l.id = ${localId}
    `;

    return {
      pausasEnUso: pausa[0]?.en_uso ?? true,
      pausaCuentaComoTrabajo: pausa[0]?.cuenta ?? false,
      enPausaDesde: pausa[0]?.desde ?? null,
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
      horario: elHorario,
      elLocalSabeDondeEsta: reloj.latitud !== null && reloj.longitud !== null,
      radioMetros: reloj.radio,
      margenDeRetrasoMinutos: reloj.margenDeRetraso,
      puedoFichar: puede[0]?.puede === true,
    };
  },
});

/** Si la semana de ese lunes tiene horario publicado en el local (H2 · 0069). */
async function laSemanaPublicada(
  contexto: Contexto,
  localId: string,
  lunes: string,
): Promise<boolean> {
  const filas = await contexto.sql<{ publicada: boolean }[]>`
    select exists (
      select 1 from estook.semana_de_horario s
       where s.local_id = ${localId} and s.lunes = ${lunes}::date and s.publicada_en is not null
    ) as publicada
  `;
  return filas[0]?.publicada === true;
}

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
  /** A qué hora entra hoy, de lo publicado en Horarios (0081). */
  readonly entraHoyALas: string | null;
  /** Si el turno lleva demasiado abierto: casi siempre es que se olvidó salir. */
  readonly turnoSospechoso: boolean;
}

/** Un fichaje hecho con más de doce horas sin señal, que nadie ha revisado (0070). */
export interface FichajePorRevisar {
  readonly fichajeId: string;
  readonly personaId: string;
  readonly nombre: string;
  readonly fecha: string;
  readonly entroEn: string;
  readonly salioEn: string | null;
}

export interface SalidaFichajesDeHoy {
  readonly gente: readonly QuienEstaTrabajando[];
  readonly jornada: string;
  readonly horaDelLocal: string;
  readonly dentro: number;
  readonly fuera: number;
  /** Lo que hay que revisar de lo fichado sin conexión, de la gente que llevas (0070). */
  readonly porRevisar: readonly FichajePorRevisar[];
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
    // A qué hora entra hoy cada uno: lo publicado en Horarios (0069, 0081). En
    // `turno_publicado` solo hay semanas publicadas: no hace falta preguntarlo.

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
           -- A quién lleva quien pregunta: un jefe de cocina, a la cocina. Lo
           -- decide la base (estook.a_quien_lleva), no esta consulta.
           and p.id in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
         order by p.id, r.amplitud desc
      )
      select e.id::text as persona_id, e.nombre, e.apellidos, e.rol_nombre,
             to_char(a.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde,
             case when a.entro_en is null then null
                  else floor(a.segundos / 60)::int
             end as minutos,
             a.entro_metros as metros,
             coalesce(h.minutos, 0)::int as minutos_de_hoy,
             estook.visto_por_ultima_vez(e.id) as ultimo_acceso_en,
             -- Con la app abierta y a la vista, no «con una sesión sin cerrar» (0042).
             estook.esta_en_linea(e.id) as en_linea,
             to_char(hp.entra, 'HH24:MI') as entra_hoy
        from equipo e
        left join lateral (
          select f.entro_en, f.entro_metros,
                 -- Lo trabajado, sin las pausas si no cuentan (0052).
                 estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) as segundos
            from estook.fichaje f
           where f.persona_id = e.id and f.salio_en is null
           limit 1
        ) a on true
        left join lateral (
          select sum(
            estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60
          ) as minutos
            from estook.fichaje f
           where f.persona_id = e.id
             and f.local_id = ${localId}
             and f.fecha_operativa = ${reloj.jornada}::date
        ) h on true
        left join lateral (
          select tp.entra
            from estook.turno_publicado tp
           where tp.persona_id = e.id
             and tp.local_id = ${localId}
             and tp.dia = ${reloj.jornada}::date
             and tp.tipo = 'trabajo'
           order by tp.entra
           limit 1
        ) hp on true
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

    // Lo fichado sin conexión que hay que revisar: lo ve quien ve esos fichajes (las
    // políticas de la 0027), del más viejo al más nuevo.
    const porRevisar = await contexto.sql<
      {
        fichaje_id: string;
        persona_id: string;
        nombre: string;
        fecha: string;
        entro_en: string;
        salio_en: string | null;
      }[]
    >`
      select f.id::text as fichaje_id, f.persona_id::text as persona_id, p.nombre,
             to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha,
             to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
             to_char(f.salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en
        from estook.fichaje f
        join estook.persona p on p.id = f.persona_id
       where f.local_id = ${localId} and f.por_revisar
       order by f.entro_en
       limit 20
    `;

    return {
      gente,
      jornada: reloj.jornada,
      horaDelLocal: reloj.ahora,
      dentro: gente.filter((quien) => quien.dentro).length,
      fuera: gente.filter((quien) => !quien.dentro).length,
      porRevisar: porRevisar.map((f) => ({
        fichajeId: f.fichaje_id,
        personaId: f.persona_id,
        nombre: f.nombre,
        fecha: f.fecha,
        entroEn: f.entro_en,
        salioEn: f.salio_en,
      })),
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
  /**
   * Cuántas veces llegó tarde frente a su horario de siempre (0040). Nulo si no
   * tiene horario puesto en el periodo: sin hora de entrada no se llega tarde,
   * pero tampoco a tiempo, y un cero diría lo segundo.
   */
  readonly retrasos: number | null;

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
  /** Los minutos de margen del local antes de contar un retraso (0040). */
  readonly margenDeRetraso: number;
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
    /**
     * El periodo por su nombre. «Esta semana» empieza el lunes **del local** y
     * «este mes» el día uno **del local**: por eso lo decide el servidor y no la
     * pantalla, que puede estar en otro huso (regla 10).
     */
    periodo: z.enum(['semana', 'mes', '30']).optional(),
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
    const desde =
      entrada.desde ??
      (entrada.periodo === 'semana'
        ? masDias(fechaOperativa(reloj.jornada), -(reloj.diaDeLaSemana - 1))
        : entrada.periodo === 'mes'
          ? `${reloj.jornada.slice(0, 7)}-01`
          : masDias(fechaOperativa(hasta), -29));

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
           and p.id in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
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
                   estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60
                 ) as minutos,
                 count(*) as turnos,
                 -- Sin cerrar es **olvidarse de salir**: abierto hace más de doce horas.
                 -- Quien está trabajando ahora no es algo que revisar (repaso del 9-oct).
                 count(*) filter (
                   where f.salio_en is null
                     and f.entro_en < ${contexto.ahora.toISOString()}::timestamptz - interval '12 hours'
                 ) as sin_cerrar,
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

    // Los retrasos, con la misma pieza que la cifra de Equipo: si la regla
    // cambia, cambia en los dos sitios a la vez.
    const { margen, entradas } = await lasEntradasDelHorario(contexto, localId, desde, hasta);
    const retrasosDe = new Map<string, number>();
    for (const entrada of entradas) {
      const antes = retrasosDe.get(entrada.personaId) ?? 0;
      retrasosDe.set(entrada.personaId, antes + (esUnRetrasoQueCuenta(entrada, margen) ? 1 : 0));
    }

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
        retrasos: retrasosDe.get(f.persona_id) ?? null,
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
      margenDeRetraso: margen,
      puedeVerCostes,
      ...(puedeVerCostes ? { costeTotalCentimos: costeTotal } : {}),
    };
  },
});

// ── V · lo que comparten el Resumen y las cifras de Equipo ────────────────────
//
// Las horas y los retrasos de la gente que llevas salen en dos sitios: el Resumen,
// persona a persona, y las cifras con flecha de Equipo, día a día. **Tienen que
// cuadrar**, y por eso lo que decide quién llegó tarde se escribe una vez, aquí, y
// lo llaman los dos. La gente es la misma que la del Resumen —el mismo `with
// equipo`—, y una prueba contra la base compara los totales
// (`las-cifras-de-cada-app.prueba.ts`).

/** Un tramo de trabajo publicado en Horarios cuya hora de entrada ya ha pasado. */
export interface EntradaDelHorario {
  readonly personaId: string;
  /** La jornada a la que pertenece. */
  readonly fecha: string;
  /** Cuándo empieza y cuándo acaba el tramo, en ISO. */
  readonly empieza: string;
  readonly acaba: string;
  /** El tramo como se publicó, «10:00» y «16:00», en el reloj del local. */
  readonly entra: string;
  readonly sale: string;
  /**
   * Minutos enteros entre la hora de entrada y el fichaje de esa entrada: positivo
   * si tarde, negativo si antes. **Nulo si no fichó la entrada en el tramo** (ni en
   * las tres horas de antes).
   */
  readonly minutosTarde: number | null;
  /** «09:58»: a qué hora fichó esa entrada, en el reloj del local. */
  readonly fichoA: string | null;
  /**
   * Si estuvo trabajando en algún momento del tramo: un fichaje que se cruza con él.
   * Un tramo que ya acabó sin ninguno es **una falta** (0081).
   */
  readonly vino: boolean;
  /** Si el tramo ya acabó: antes de eso, no haber fichado no es faltar todavía. */
  readonly acabado: boolean;
  /** Lo que haya dicho quien lleva al equipo: justificada, no cuenta. */
  readonly faltaJustificada: Justificacion | null;
  readonly retrasoJustificado: Justificacion | null;
}

/** Por qué no vino o llegó tarde, y quién lo dijo (0081). */
export interface Justificacion {
  readonly motivo: string;
  readonly nota: string | null;
  readonly puestaPor: string | null;
  readonly puestaEn: string;
}

/**
 * Las entradas del horario publicado de la gente que llevas, con cuándo fichó cada
 * uno, y el margen del local (0040, 0069 y, desde el 9-oct, **solo lo publicado**:
 * 0081).
 *
 * ── Cuál es la hora de entrada de un día ────────────────────────────────────
 *
 * La de cada tramo de trabajo publicado en Horarios. El día del tramo es el día en
 * que empieza; si empieza antes de la hora de corte, es **de la jornada de antes**:
 * quien entra a las 00:30 de la noche del viernes al sábado, en un bar que corta a
 * las 05:00, entra en la jornada del viernes.
 *
 * ── Qué fichaje es el de esa entrada ────────────────────────────────────────
 *
 * **El más cercano** a esa hora, desde tres horas antes hasta que acaba el tramo.
 * Así una jornada partida —entra a las 12:00 y a las 20:00— casa cada entrada con
 * su fichaje, y volver del descanso a las 16:30 no cuenta como llegar cuatro horas y
 * media tarde a las 12:00. Y quien llega a las 14:00 a un tramo de 10:00 a 18:00
 * llega **cuatro horas tarde**: antes, con una ventana de tres horas, no contaba ni
 * como retraso ni como nada.
 *
 * ── Cuándo es una falta ─────────────────────────────────────────────────────
 *
 * Un tramo **que ya ha acabado** y en el que no hay ningún fichaje que se cruce con
 * él. Basta con haber estado dentro un rato: quien fichó a las 9:00 de un turno que
 * empezaba a las 12:00 y siguió no ha faltado al de las 12:00.
 *
 * Solo las entradas **cuya hora ya ha pasado**: a las 8:00 no se sabe si quien
 * entra a las 9:00 llegará tarde.
 */
export async function lasEntradasDelHorario(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
  soloDe: string | null = null,
): Promise<{ readonly margen: number; readonly entradas: readonly EntradaDelHorario[] }> {
  const locales = await contexto.sql<{ margen: number }[]>`
    select margen_de_retraso_minutos as margen from estook.local where id = ${localId}
  `;
  const local = locales[0];
  if (!local) throw new FalloDeAplicacion('local_ajeno');

  const ahora = contexto.ahora.toISOString();
  const filas = await contexto.sql<
    {
      persona_id: string;
      fecha: string;
      empieza: string;
      acaba: string;
      entra: string;
      sale: string;
      minutos_tarde: number | null;
      ficho_a: string | null;
      vino: boolean;
      acabado: boolean;
      falta_motivo: string | null;
      falta_nota: string | null;
      falta_por: string | null;
      falta_en: string | null;
      retraso_motivo: string | null;
      retraso_nota: string | null;
      retraso_por: string | null;
      retraso_en: string | null;
    }[]
  >`
    with equipo as (
      -- La misma gente que el Resumen: con acceso a este local, activa y que llevas.
      select distinct on (p.id) p.id
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
         and p.id in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
         and (${soloDe}::uuid is null or p.id = ${soloDe}::uuid)
       order by p.id, r.amplitud desc
    ),
    publicadas as (
      select s.lunes
        from estook.semana_de_horario s
       where s.local_id = ${localId}::uuid and s.publicada_en is not null
         and s.lunes >= ${desde}::date - 7 and s.lunes <= ${hasta}::date + 1
    ),
    entradas as (
      select e.id as persona_id, l.zona_horaria,
             (case when tp.entra >= l.hora_de_corte then tp.dia else tp.dia - 1 end) as fecha,
             (tp.dia + tp.entra) at time zone l.zona_horaria as instante,
             (tp.dia + tp.entra
               + (case when tp.sale > tp.entra then tp.sale - tp.entra
                       else tp.sale - tp.entra + interval '24 hours' end)
             ) at time zone l.zona_horaria as acaba,
             tp.entra, tp.sale
        from equipo e
        join estook.local l on l.id = ${localId}::uuid
        join estook.turno_publicado tp
          on tp.persona_id = e.id and tp.local_id = l.id and tp.tipo = 'trabajo'
        join publicadas pu on tp.dia between pu.lunes and pu.lunes + 6
       where (case when tp.entra >= l.hora_de_corte then tp.dia else tp.dia - 1 end)
             between ${desde}::date and ${hasta}::date
    )
    select en.persona_id::text as persona_id,
           to_char(en.fecha, 'YYYY-MM-DD') as fecha,
           to_char(en.instante at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as empieza,
           to_char(en.acaba at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as acaba,
           to_char(en.entra, 'HH24:MI') as entra,
           to_char(en.sale, 'HH24:MI') as sale,
           floor(extract(epoch from (f.entro_en - en.instante)) / 60)::int as minutos_tarde,
           to_char(f.entro_en at time zone en.zona_horaria, 'HH24:MI') as ficho_a,
           exists (
             select 1 from estook.fichaje fx
              where fx.persona_id = en.persona_id and fx.local_id = ${localId}
                and fx.entro_en < en.acaba
                and coalesce(fx.salio_en, ${ahora}::timestamptz) > en.instante
           ) as vino,
           en.acaba <= ${ahora}::timestamptz as acabado,
           jf.motivo::text as falta_motivo, jf.nota as falta_nota, pf.nombre as falta_por,
           to_char(jf.puesta_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as falta_en,
           jr.motivo::text as retraso_motivo, jr.nota as retraso_nota, pr.nombre as retraso_por,
           to_char(jr.puesta_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as retraso_en
      from entradas en
      left join lateral (
        select fi.entro_en
          from estook.fichaje fi
         where fi.persona_id = en.persona_id
           and fi.local_id = ${localId}
           and fi.entro_en >= en.instante - interval '3 hours'
           and fi.entro_en < en.acaba
         order by abs(extract(epoch from (fi.entro_en - en.instante)))
         limit 1
      ) f on true
      left join estook.justificacion jf
        on jf.persona_id = en.persona_id and jf.local_id = ${localId}
       and jf.tipo = 'falta' and jf.empieza = en.instante
      left join estook.persona pf on pf.id = jf.puesta_por
      left join estook.justificacion jr
        on jr.persona_id = en.persona_id and jr.local_id = ${localId}
       and jr.tipo = 'retraso' and jr.empieza = en.instante
      left join estook.persona pr on pr.id = jr.puesta_por
     where en.instante <= ${ahora}::timestamptz
     order by en.fecha, en.persona_id, en.instante
  `;

  const justificacion = (
    motivo: string | null,
    nota: string | null,
    por: string | null,
    en: string | null,
  ): Justificacion | null =>
    motivo === null || en === null ? null : { motivo, nota, puestaPor: por, puestaEn: en };

  return {
    margen: local.margen,
    entradas: filas.map((f) => ({
      personaId: f.persona_id,
      fecha: f.fecha,
      empieza: f.empieza,
      acaba: f.acaba,
      entra: f.entra,
      sale: f.sale,
      minutosTarde: f.minutos_tarde,
      fichoA: f.ficho_a,
      vino: f.vino,
      acabado: f.acabado,
      faltaJustificada: justificacion(f.falta_motivo, f.falta_nota, f.falta_por, f.falta_en),
      retrasoJustificado: justificacion(
        f.retraso_motivo,
        f.retraso_nota,
        f.retraso_por,
        f.retraso_en,
      ),
    })),
  };
}

/**
 * Si una entrada es un retraso **que cuenta**: tarde pasado el margen, y sin
 * justificar. La usan el Resumen, la cifra de Retrasos e Incidencias: lo que en uno
 * es un retraso, en los otros también.
 */
export function esUnRetrasoQueCuenta(entrada: EntradaDelHorario, margen: number): boolean {
  return (
    entrada.minutosTarde !== null &&
    llegoTarde(entrada.minutosTarde, margen) &&
    entrada.retrasoJustificado === null
  );
}

/** Si una entrada es una falta: el tramo acabó y no estuvo en él (justificada o no). */
export function esUnaFalta(entrada: EntradaDelHorario): boolean {
  return entrada.acabado && !entrada.vino;
}

/** Los segundos que ha fichado cada persona que llevas, cada día, en este local. */
export interface HorasDeUnDia {
  readonly personaId: string;
  readonly fecha: string;
  readonly segundos: number;
}

/**
 * Lo fichado por la gente que llevas, por persona y día, en este local.
 *
 * Los segundos y no los minutos, a propósito: el Resumen redondea **el total de
 * cada persona** (`::int` sobre la suma), y redondear cada día por separado daría
 * otro total. Quien llama suma y redondea igual que el Resumen, y así la cifra
 * de Equipo y el Resumen dicen las mismas horas.
 */
export async function lasHorasDelEquipo(
  contexto: Contexto,
  localId: string,
  desde: string,
  hasta: string,
): Promise<readonly HorasDeUnDia[]> {
  const filas = await contexto.sql<{ persona_id: string; fecha: string; segundos: string }[]>`
    with equipo as (
      select distinct on (p.id) p.id
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
         and p.id in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
       order by p.id, r.amplitud desc
    )
    select f.persona_id::text as persona_id,
           to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha,
           -- El turno abierto cuenta hasta ahora, como en el Resumen.
           sum(estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz))::text as segundos
      from estook.fichaje f
      join equipo e on e.id = f.persona_id
     where f.local_id = ${localId}
       and f.fecha_operativa between ${desde}::date and ${hasta}::date
     group by f.persona_id, f.fecha_operativa
  `;
  return filas.map((f) => ({
    personaId: f.persona_id,
    fecha: f.fecha,
    segundos: Number(f.segundos),
  }));
}

/** Lo que cobra cada uno de los que se le pide, vigente un día (el del final del periodo). */
export async function lasRetribuciones(
  contexto: Contexto,
  localId: string,
  personas: readonly string[],
  cuando: string,
): Promise<ReadonlyMap<string, Retribucion>> {
  if (personas.length === 0) return new Map();
  const filas = await contexto.sql<
    {
      persona_id: string;
      forma: string;
      importe_centimos: string;
      horas_semanales: string | null;
    }[]
  >`
    -- La vigente ese día, con la del local por delante de la de toda la
    -- organización: el mismo orden que el Resumen.
    select distinct on (re.persona_id)
           re.persona_id::text as persona_id, re.forma::text as forma,
           re.importe_centimos::text as importe_centimos,
           re.horas_semanales::text as horas_semanales
      from estook.retribucion re
     where re.persona_id = any (${comoLista(personas)}::text::uuid[])
       and re.desde <= ${cuando}::date
       and (re.hasta is null or re.hasta >= ${cuando}::date)
       and (re.local_id is null or re.local_id = ${localId})
     order by re.persona_id, re.local_id nulls last, re.desde desc
  `;
  return new Map(
    filas.map((f) => [
      f.persona_id,
      {
        forma: f.forma as 'por_hora' | 'mensual',
        importeCentimos: Number(f.importe_centimos),
        horasSemanales: f.horas_semanales === null ? null : Number(f.horas_semanales),
      },
    ]),
  );
}

// ── Los fichajes de una persona ──────────────────────────────────────────────

/**
 * Cuántos fichajes enseña la ficha antes del «Ver todos» (23-sep-2026).
 *
 * Eran treinta seguidos, y la ficha se hacía larguísima. Richi: «mostrar los tres
 * últimos y un "Ver más" que abra todo el historial».
 */
const FICHAJES_EN_LA_FICHA = 3;

export interface FichajeDeUnaPersona {
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
  /** El aparato del local donde se fichó (0068), o nulo si fue desde el suyo. */
  readonly aparato: string | null;
  /**
   * **Sin conexión** (0070): la entrada o la salida se ficharon sin señal y se mandaron
   * después; la hora la contó el servidor. `porRevisar`, si fue con más de doce horas
   * sin señal y nadie lo ha mirado todavía.
   */
  readonly sinConexion: { readonly entrada: boolean; readonly salida: boolean };
  readonly porRevisar: boolean;
  /** Si lo apuntó a mano quien lleva el equipo, porque faltaba (0070): quién y por qué. */
  readonly aMano: { readonly quien: string | null; readonly motivo: string } | null;
  /** Sus pausas de descanso, de la primera a la última (0052). */
  readonly pausas: readonly { readonly empezoEn: string; readonly acaboEn: string | null }[];
  /**
   * Cada corrección, con lo de antes y lo de después (0062): **el original no se
   * borra**, y lo ve también el trabajador.
   */
  readonly correcciones: readonly CorreccionDeUnFichaje[];
}

export interface CorreccionDeUnFichaje {
  readonly numero: number;
  readonly entroAntes: string;
  readonly salioAntes: string | null;
  readonly entroDespues: string;
  readonly salioDespues: string | null;
  readonly motivo: string;
  readonly quien: string | null;
  readonly cuando: string;
}

/** Las pausas y las correcciones de unos fichajes, de una vez (no una consulta por fila). */
async function loDeDentro(
  contexto: Contexto,
  ids: readonly string[],
): Promise<{
  pausas: ReadonlyMap<string, { empezoEn: string; acaboEn: string | null }[]>;
  correcciones: ReadonlyMap<string, CorreccionDeUnFichaje[]>;
}> {
  const pausas = new Map<string, { empezoEn: string; acaboEn: string | null }[]>();
  const correcciones = new Map<string, CorreccionDeUnFichaje[]>();
  if (ids.length === 0) return { pausas, correcciones };

  const filasDePausa = await contexto.sql<
    { fichaje_id: string; empezo_en: string; acabo_en: string | null }[]
  >`
    select fichaje_id::text as fichaje_id,
           to_char(empezo_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as empezo_en,
           to_char(acabo_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as acabo_en
      from estook.pausa
     where fichaje_id = any (${comoLista(ids)}::text::bigint[])
     order by empezo_en
  `;
  for (const p of filasDePausa) {
    const lista = pausas.get(p.fichaje_id) ?? [];
    lista.push({ empezoEn: p.empezo_en, acaboEn: p.acabo_en });
    pausas.set(p.fichaje_id, lista);
  }

  const filasDeCorreccion = await contexto.sql<
    {
      fichaje_id: string;
      numero: number;
      entro_antes: string;
      salio_antes: string | null;
      entro_despues: string;
      salio_despues: string | null;
      motivo: string;
      quien: string | null;
      cuando: string;
    }[]
  >`
    select c.fichaje_id::text as fichaje_id, c.numero,
           to_char(c.entro_antes, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_antes,
           to_char(c.salio_antes, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_antes,
           to_char(c.entro_despues, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_despues,
           to_char(c.salio_despues, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_despues,
           c.motivo, p.nombre as quien,
           to_char(c.corregido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cuando
      from estook.correccion_de_fichaje c
      left join estook.persona p on p.id = c.corregido_por
     where c.fichaje_id = any (${comoLista(ids)}::text::bigint[])
     order by c.numero
  `;
  for (const c of filasDeCorreccion) {
    const lista = correcciones.get(c.fichaje_id) ?? [];
    lista.push({
      numero: c.numero,
      entroAntes: c.entro_antes,
      salioAntes: c.salio_antes,
      entroDespues: c.entro_despues,
      salioDespues: c.salio_despues,
      motivo: c.motivo,
      quien: c.quien,
      cuando: c.cuando,
    });
    correcciones.set(c.fichaje_id, lista);
  }

  return { pausas, correcciones };
}

/**
 * Los fichajes de una persona, del último hacia atrás, y cuántos hay en total.
 *
 * Lo que se ve lo deciden las políticas de la 0027 —los tuyos, y los de la gente que
 * llevas en cada local—, así que aquí no se filtra nada a mano, y el total cuenta
 * lo mismo que la lista. «En el local» se mide con el radio **del local donde se
 * fichó**, no con el del que estás mirando: quien trabaja en dos locales ficha en
 * los dos.
 */
async function leerFichajes(
  contexto: Contexto,
  personaId: string,
  limite: number,
  salto: number,
): Promise<{ fichajes: FichajeDeUnaPersona[]; cuantos: number }> {
  const filas = await contexto.sql<
    {
      id: string;
      fecha: string;
      entro_en: string;
      salio_en: string | null;
      minutos: number | null;
      metros: number | null;
      radio: number;
      sin_donde: string | null;
      corregido_por: string | null;
      motivo: string | null;
      aparato: string | null;
      entro_sin_conexion: boolean;
      salio_sin_conexion: boolean;
      por_revisar: boolean;
      a_mano_por: string | null;
      motivo_a_mano: string | null;
      total: number;
    }[]
  >`
    select f.id::text as id,
           to_char(f.fecha_operativa, 'YYYY-MM-DD') as fecha,
           to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as entro_en,
           to_char(f.salio_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as salio_en,
           case when f.salio_en is null then null
                else floor(estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60)::int end as minutos,
           f.entro_metros as metros,
           l.radio_de_fichaje_metros as radio,
           f.entro_sin_donde as sin_donde,
           c.nombre as corregido_por,
           f.motivo_de_la_correccion as motivo,
           t.nombre as aparato,
           f.entro_sin_conexion, f.salio_sin_conexion, f.por_revisar,
           m.nombre as a_mano_por, f.motivo_a_mano,
           count(*) over ()::int as total
      from estook.fichaje f
      join estook.local l on l.id = f.local_id
      left join estook.persona c on c.id = f.corregido_por
      left join estook.persona m on m.id = f.apuntado_por
      -- El nombre del aparato solo sale si quien mira puede ver los aparatos de
      -- Ajustes; si no, sale nulo y se dice «en el aparato del local».
      left join estook.terminal t on t.id = f.terminal_id
     where f.persona_id = ${personaId}
     order by f.entro_en desc, f.id
     limit ${limite} offset ${salto}
  `;

  // Una página vacía no trae el total. Pasa al pedir más allá del final, y
  // entonces se cuenta aparte para no decir «0» de alguien que sí ha fichado.
  let cuantos = filas[0]?.total;
  if (cuantos === undefined) {
    const [cuenta] = await contexto.sql<{ total: number }[]>`
      select count(*)::int as total from estook.fichaje where persona_id = ${personaId}
    `;
    cuantos = cuenta?.total ?? 0;
  }

  const dentro = await loDeDentro(
    contexto,
    filas.map((f) => f.id),
  );

  return {
    cuantos,
    fichajes: filas.map((f) => ({
      fichajeId: f.id,
      fecha: f.fecha,
      entroEn: f.entro_en,
      salioEn: f.salio_en,
      minutos: f.minutos,
      metros: f.metros,
      enElLocal: f.metros === null ? null : f.metros <= f.radio,
      sinUbicacion: f.sin_donde,
      corregidoPor: f.corregido_por,
      motivoDeLaCorreccion: f.motivo,
      aparato: f.sin_donde === 'aparato_del_local' ? (f.aparato ?? 'el aparato del local') : null,
      sinConexion: { entrada: f.entro_sin_conexion, salida: f.salio_sin_conexion },
      porRevisar: f.por_revisar,
      aMano: f.motivo_a_mano === null ? null : { quien: f.a_mano_por, motivo: f.motivo_a_mano },
      pausas: dentro.pausas.get(f.id) ?? [],
      correcciones: dentro.correcciones.get(f.id) ?? [],
    })),
  };
}

export const entradaFichajesDeUnaPersona = z
  .object({
    persona_id: z.string().uuid(),
    limite: z.coerce.number().int().min(1).max(100).optional(),
    salto: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();
export type EntradaFichajesDeUnaPersona = z.infer<typeof entradaFichajesDeUnaPersona>;

export interface SalidaFichajesDeUnaPersona {
  readonly fichajes: readonly FichajeDeUnaPersona[];
  readonly cuantos: number;
  readonly hayMas: boolean;
}

/**
 * El historial entero de fichajes de una persona, por páginas: es el «Ver todos»
 * de su ficha.
 *
 * Pide lo mismo que la ficha para abrirse: que sea alguien a quien llevas en este
 * local (`a_quien_lleva`, 0027), o tú. Sin eso, «no existe», igual que la ficha, para
 * no confirmar a nadie de fuera que esa persona está en Estook.
 */
export const fichajesDeUnaPersona = consulta<
  EntradaFichajesDeUnaPersona,
  SalidaFichajesDeUnaPersona
>({
  nombre: 'fichajes_de_una_persona',
  entrada: entradaFichajesDeUnaPersona,

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocal(contexto);

    const [laLlevas] = await contexto.sql<{ si: boolean }[]>`
      select exists (
        select 1 from estook.a_quien_lleva(${localId}::uuid) q
         where q.persona_id = ${entrada.persona_id}::uuid
      ) as si
    `;
    if (laLlevas?.si !== true) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa persona no está, o no es de un local que puedas ver.',
      });
    }

    const limite = entrada.limite ?? 50;
    const salto = entrada.salto ?? 0;
    const { fichajes, cuantos } = await leerFichajes(contexto, entrada.persona_id, limite, salto);
    return { fichajes, cuantos, hayMas: salto + fichajes.length < cuantos };
  },
});

// ── La ficha de una persona ──────────────────────────────────────────────────

export interface SalidaUnaPersona {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  /** Solo a quien ve los datos del equipo. Nulo: no tiene correo (0057). */
  readonly correo?: string | null;
  /**
   * **No tiene correo** (0057): entra solo en el aparato del local, con su PIN. Esto
   * lo ve cualquiera que vea su ficha, porque decide cómo se le avisa y dónde ficha.
   */
  readonly sinCorreo: boolean;
  /** Si quien mira puede ponerle el correo: quien puede dar acceso en este local. */
  readonly puedePonerCorreo: boolean;
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

  /** Los tres últimos. El resto, en `fichajes_de_una_persona`. */
  readonly ultimosFichajes: readonly FichajeDeUnaPersona[];
  /** Cuántos tiene en total, los que quien mira puede ver: para el «Ver todos». */
  readonly cuantosFichajes: number;

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
      { costes: boolean; equipo: boolean; datos: boolean; invitar: boolean }[]
    >`
      select estook.puede_ver('dato.coste_de_personal', ${localId}::uuid) as costes,
             estook.puede_editar('app.equipo', ${localId}::uuid) as equipo,
             estook.puede_ver('dato.datos_del_equipo', ${localId}::uuid) as datos,
             estook.puede_editar('accion.invitar_personas', ${localId}::uuid) as invitar
    `;
    const puedeVerCostes = permisos[0]?.costes === true || esMia;
    const puedeEditar = permisos[0]?.equipo === true;
    const veLosDatos = permisos[0]?.datos === true || esMia;

    const gente = await contexto.sql<
      {
        id: string;
        nombre: string;
        apellidos: string | null;
        correo: string | null;
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
             estook.visto_por_ultima_vez(p.id) as ultimo_acceso_en,
             -- Con la app abierta y a la vista, no «con una sesión sin cerrar» (0042).
             estook.esta_en_linea(p.id) as en_linea,
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
         and p.id in (select q.persona_id from estook.a_quien_lleva(${localId}::uuid) q)
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
               then estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60
               else 0 end
        ), 0)::int as de_la_semana,
        coalesce(sum(
          estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60
        ), 0)::int as del_mes,
        max(case when f.salio_en is null
                 then to_char(f.entro_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end) as abierto,
        max(case when f.salio_en is null
                 then floor(estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz) / 60)::int
            end) as minutos
        from estook.fichaje f
       where f.persona_id = ${entrada.persona_id}
         and f.fecha_operativa >= ${haceUnMes}::date
         and f.fecha_operativa <= ${reloj.jornada}::date
    `;

    const fichajes = await leerFichajes(contexto, entrada.persona_id, FICHAJES_EN_LA_FICHA, 0);

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
      permisos[0]?.costes === true && !esMia && (mio[0]?.amplitud ?? 0) > quien.amplitud;

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
      sinCorreo: quien.correo === null,
      puedePonerCorreo: quien.correo === null && permisos[0]?.invitar === true && !esMia,
      rol: quien.rol,
      rolNombre: quien.rol_nombre,
      estado: !quien.vigente
        ? 'fuera'
        : quien.ultimo_acceso_en === null
          ? 'sin_estrenar'
          : 'dentro',
      enLinea: quien.en_linea,
      ultimoAccesoEn: quien.ultimo_acceso_en?.toISOString() ?? null,
      desde: quien.desde.toISOString().slice(0, 10),

      trabajandoDesde: horas[0]?.abierto ?? null,
      minutosDelTurno: horas[0]?.minutos ?? null,
      minutosDeLaSemana: horas[0]?.de_la_semana ?? 0,
      minutosDelMes: delMes,

      ultimosFichajes: fichajes.fichajes,
      cuantosFichajes: fichajes.cuantos,

      ...(puedeVerCostes
        ? {
            retribucion: laRetribucion,
            costeDelMesCentimos: laRetribucion === null ? null : loQueCuesta(delMes, laRetribucion),
          }
        : {}),
      puedeVerCostes,
      puedePonerRetribucion,
      puedeEditar,
      radioMetros: reloj.radio,
    };
  },
});
