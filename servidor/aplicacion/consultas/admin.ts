import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Lo que lee la puerta del admin (0041, entrega A1).
 *
 * Tres consultas: quién soy dentro del admin, quién más tiene acceso, y lo que se
 * ha hecho. Ninguna lee un dato de un restaurante.
 */

// ── Quién soy en el admin ────────────────────────────────────────────────────

export interface YoEnElAdmin {
  readonly personaId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly nivel: 'total' | 'comercial' | 'soporte' | 'vendedor';
  /** Tiene el segundo factor montado. Sin él, solo puede montarlo. */
  readonly conDobleFactor: boolean;
  /** Lo tiene montado y en esta sesión todavía no ha escrito el código. */
  readonly faltaElCodigo: boolean;
  readonly debeCambiarClave: boolean;
  /** Cuándo se acaba la sesión, para decirlo antes de que eche a nadie. */
  readonly caducaEn: string;
}

/**
 * La primera que pregunta el admin, y la que decide qué pantalla toca: la
 * contraseña, el segundo factor o dentro.
 *
 * Se deja llamar **sin el segundo factor superado**, porque es justo lo que
 * necesita saber la pantalla para pedirlo. No enseña nada que no sea de quien
 * pregunta.
 */
export const yoEnElAdmin = consulta<Record<string, never>, YoEnElAdmin>({
  nombre: 'admin_quien_soy',
  entrada: z.object({}).strict(),
  soloAdmin: true,
  aunSinDobleFactor: true,
  // Y con la contraseña por cambiar: es lo que dice a la pantalla que la pida.
  aunConClavePorCambiar: true,

  async ejecutar({ sql, sesion }) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<
      {
        nombre: string;
        correo: string;
        nivel: YoEnElAdmin['nivel'];
        con_doble_factor: boolean;
        caduca_en: Date;
      }[]
    >`
      select p.nombre,
             p.correo,
             plataforma.nivel_de(p.id)::text as nivel,
             exists (
               select 1 from estook.doble_factor d
                where d.persona_id = p.id and d.confirmado_en is not null
             ) as con_doble_factor,
             s.caduca_en
        from estook.persona p
        join estook.sesion s on s.id = ${sesion.id}::uuid
       where p.id = ${sesion.personaId}::uuid
    `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('sin_sesion');

    return {
      personaId: sesion.personaId,
      nombre: fila.nombre,
      correo: fila.correo,
      nivel: fila.nivel,
      conDobleFactor: fila.con_doble_factor,
      faltaElCodigo: fila.con_doble_factor && !sesion.dobleFactorSuperado,
      debeCambiarClave: sesion.debeCambiarClave,
      caducaEn: fila.caduca_en.toISOString(),
    };
  },
});

// ── Quién tiene acceso ───────────────────────────────────────────────────────

export interface AccesoAlAdmin {
  readonly personaId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly nivel: YoEnElAdmin['nivel'];
  readonly dadoEn: string;
  /** Nulo si lo dio la consola: la primera cuenta no la da nadie. */
  readonly dadoPor: string | null;
  readonly quitadoEn: string | null;
  readonly quitadoPor: string | null;
  readonly motivoDeQuitar: string | null;
  readonly soyYo: boolean;
}

/**
 * Los que tienen acceso, y **los que lo tuvieron**: una fila cerrada es historia,
 * y saber que alguien tuvo acceso hasta marzo es lo que se pregunta cuando algo
 * no cuadra. Primero los vivos.
 *
 * No dice quién tiene montado el segundo factor: esa tabla solo deja ver el propio
 * (M4), y así se queda. Tampoco hace falta: sin él, no pasan de la puerta.
 */
export const accesosAlAdmin = consulta<Record<string, never>, readonly AccesoAlAdmin[]>({
  nombre: 'admin_administradores',
  entrada: z.object({}).strict(),
  soloAdmin: true,

  async ejecutar({ sql, sesion }) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<
      {
        persona_id: string;
        nombre: string;
        correo: string;
        nivel: YoEnElAdmin['nivel'];
        dado_en: Date;
        dado_por: string | null;
        quitado_en: Date | null;
        quitado_por: string | null;
        motivo_de_quitar: string | null;
      }[]
    >`
      select a.persona_id,
             p.nombre,
             p.correo,
             a.nivel::text as nivel,
             a.dado_en,
             dp.nombre as dado_por,
             a.quitado_en,
             qp.nombre as quitado_por,
             a.motivo_de_quitar
        from plataforma.administrador a
        join estook.persona p on p.id = a.persona_id
        left join estook.persona dp on dp.id = a.dado_por
        left join estook.persona qp on qp.id = a.quitado_por
       order by a.quitado_en is not null, a.dado_en desc
    `;

    return filas.map((f) => ({
      personaId: f.persona_id,
      nombre: f.nombre,
      correo: f.correo,
      nivel: f.nivel,
      dadoEn: f.dado_en.toISOString(),
      dadoPor: f.dado_por,
      quitadoEn: f.quitado_en?.toISOString() ?? null,
      quitadoPor: f.quitado_por,
      motivoDeQuitar: f.motivo_de_quitar,
      soyYo: f.persona_id === sesion.personaId,
    }));
  },
});

// ── Lo que se ha hecho ───────────────────────────────────────────────────────

export interface LineaDelAdmin {
  readonly id: string;
  readonly ocurridoEn: string;
  /** Nulo cuando lo hizo la consola (`bd:dar-admin`). */
  readonly quien: string | null;
  readonly nivel: string | null;
  readonly accion: string;
  readonly entidad: string;
  readonly entidadId: string | null;
  /** El nombre de la persona afectada, cuando la entidad es una persona. */
  readonly sobreQuien: string | null;
  readonly antes: Record<string, unknown> | null;
  readonly despues: Record<string, unknown> | null;
  readonly motivo: string | null;
  readonly ip: string | null;
}

const POR_TANDA = 50;

/**
 * La auditoría del admin, de la más nueva a la más vieja, **de cincuenta en
 * cincuenta**: crece cada vez que alguien entra, y una lista que crece a diario
 * no se trae entera (regla 51).
 */
export const auditoriaDelAdmin = consulta<
  { readonly antesDe?: string | undefined },
  { readonly lineas: readonly LineaDelAdmin[]; readonly hayMas: boolean }
>({
  nombre: 'admin_auditoria',
  // Por la dirección todo llega como texto.
  entrada: z
    .object({
      antesDe: z
        .string()
        .regex(/^\d{1,18}$/)
        .optional(),
    })
    .strict(),
  soloAdmin: true,

  async ejecutar({ sql }, entrada) {
    const filas = await sql<
      {
        id: string;
        ocurrido_en: Date;
        quien: string | null;
        nivel: string | null;
        accion: string;
        entidad: string;
        entidad_id: string | null;
        sobre_quien: string | null;
        antes: Record<string, unknown> | null;
        despues: Record<string, unknown> | null;
        motivo: string | null;
        ip: string | null;
      }[]
    >`
      select a.id::text as id,
             a.ocurrido_en,
             p.nombre as quien,
             a.nivel::text as nivel,
             a.accion,
             a.entidad,
             a.entidad_id,
             sp.nombre as sobre_quien,
             a.antes,
             a.despues,
             a.motivo,
             a.ip
        from plataforma.auditoria a
        left join estook.persona p on p.id = a.persona_id
        left join estook.persona sp
          on a.entidad = 'administrador'
         and sp.id::text = a.entidad_id
       where ${entrada.antesDe ?? null}::bigint is null or a.id < ${entrada.antesDe ?? null}::bigint
       order by a.id desc
       limit ${POR_TANDA + 1}
    `;

    const hayMas = filas.length > POR_TANDA;

    return {
      lineas: filas.slice(0, POR_TANDA).map((f) => ({
        id: f.id,
        ocurridoEn: f.ocurrido_en.toISOString(),
        quien: f.quien,
        nivel: f.nivel,
        accion: f.accion,
        entidad: f.entidad,
        entidadId: f.entidad_id,
        sobreQuien: f.sobre_quien,
        antes: f.antes,
        despues: f.despues,
        motivo: f.motivo,
        ip: f.ip,
      })),
      hayMas,
    };
  },
});

// ── La oferta de prueba (0042) ───────────────────────────────────────────────

export interface OfertaEnElAdmin {
  readonly activa: boolean;
  readonly dias: number;
  readonly cambiadaEn: string;
  /** Nulo si no la ha cambiado nadie desde que existe. */
  readonly cambiadaPor: string | null;
}

export const ofertaEnElAdmin = consulta<Record<string, never>, OfertaEnElAdmin>({
  nombre: 'admin_oferta',
  entrada: z.object({}).strict(),
  soloAdmin: true,

  async ejecutar({ sql }) {
    const filas = await sql<
      { activa: boolean; dias: number; cambiada_en: Date; cambiada_por: string | null }[]
    >`
      select o.activa, o.dias, o.cambiada_en, p.nombre as cambiada_por
        from plataforma.oferta_de_prueba o
        left join estook.persona p on p.id = o.cambiada_por
       where o.unica
    `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('fallo_nuestro');
    return {
      activa: fila.activa,
      dias: fila.dias,
      cambiadaEn: fila.cambiada_en.toISOString(),
      cambiadaPor: fila.cambiada_por,
    };
  },
});
