import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Quien tiene acceso a este local, y con que (M4).
 *
 * Es la lista de la pantalla de invitar y retirar. **No es la app Equipo**, que
 * llega en M10 con contratos, horas y documentos: aqui solo esta lo que M4 tiene
 * que dejar funcionando, que es el acceso.
 *
 * ── Los tres estados que hay que distinguir ──────────────────────────────────
 *
 *   dentro           tiene acceso y ha entrado alguna vez
 *   sin_estrenar     se le invito y todavia no ha entrado. Su PIN sigue valiendo
 *   fuera            se le retiro el acceso. Sigue en el historico, y se reactiva
 *
 * El segundo es el que importa y el que se olvida: sin el, quien invita a cinco
 * personas el lunes no sabe el viernes cuales han entrado y a cuales hay que
 * volver a dar el PIN.
 *
 * ── Lo que no viaja ──────────────────────────────────────────────────────────
 *
 * El PIN no, claro. Y el correo solo si se tiene `dato.datos_del_equipo`: un
 * jefe de cocina puede tener que invitar a un ayudante sin que eso le de la lista
 * de correos de la plantilla de sala. Lo quita el motor de M2, con `recortar`.
 */
export interface QuienTieneAcceso {
  readonly personaId: string;
  readonly membresiaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly correo?: string;
  readonly rol: string;
  readonly rolNombre: string;
  readonly alcance: string;
  readonly estado: 'dentro' | 'sin_estrenar' | 'fuera';
  readonly desde: string;
  readonly hasta: string | null;
  readonly tienePin: boolean;
  readonly ultimoAccesoEn: string | null;
}

export const quienTieneAcceso = consulta<{ local_id: string }, QuienTieneAcceso[]>({
  nombre: 'quien_tiene_acceso',
  entrada: z.object({ local_id: z.string().uuid() }).strict(),

  async ejecutar({ sql, personaId }, entrada) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');

    // Primero, que el local sea suyo. Se pregunta a las politicas y no se
    // comprueba a quien pertenece: si no lo devuelven, no se puede ver.
    const suyos = await sql<{ local_id: string }[]>`
      select local_id from estook.locales_visibles() where local_id = ${entrada.local_id}
    `;
    if (!suyos[0]) throw new FalloDeAplicacion('local_ajeno');

    // ¿Puede ver los datos del equipo? De eso depende que viaje el correo.
    const nivel = await sql<{ nivel: string }[]>`
      select estook.nivel_de_permiso(
        estook.persona_actual(), ${entrada.local_id}::uuid, 'dato.datos_del_equipo'
      )::text as nivel
    `;
    const veLosDatos = nivel[0]?.nivel !== 'sin_acceso';

    const filas = await sql<
      {
        persona_id: string;
        membresia_id: string;
        nombre: string;
        apellidos: string | null;
        correo: string;
        rol: string;
        rol_nombre: string;
        alcance: string;
        desde: Date;
        hasta: Date | null;
        tiene_pin: boolean;
        ultimo_acceso_en: Date | null;
        vigente: boolean;
      }[]
    >`
      select p.id as persona_id,
             m.id as membresia_id,
             p.nombre, p.apellidos, p.correo,
             m.rol, r.nombre as rol_nombre,
             m.alcance::text as alcance,
             m.desde, m.hasta,
             exists (
               select 1 from estook.pin n
                where n.persona_id = p.id and n.local_id = ${entrada.local_id}
             ) as tiene_pin,
             p.ultimo_acceso_en,
             -- La vigencia la decide Postgres, no JavaScript. Comparar fechas en
             -- el servidor de aplicacion abre la puerta a que un cambio de huso
             -- deje a alguien fuera un dia antes de tiempo.
             (
               p.activa
               and m.desde <= current_date
               and (m.hasta is null or m.hasta >= current_date)
               and (m.revocada_en is null or m.revocada_en > now())
             ) as vigente
        from estook.membresia m
        join estook.persona p on p.id = m.persona_id
        join estook.rol r on r.codigo = m.rol
        join estook.local l on l.id = ${entrada.local_id}::uuid
       where m.organizacion_id = l.organizacion_id
         and (
           m.alcance = 'organizacion'
           or (m.alcance = 'area' and l.area_id = m.area_id)
           or (m.alcance = 'local' and l.id = m.local_id)
         )
         and p.id in (select persona_id from estook.personas_visibles())
       order by r.amplitud desc, p.nombre
    `;

    return filas.map((f) => {
      const estado: QuienTieneAcceso['estado'] = !f.vigente
        ? 'fuera'
        : f.ultimo_acceso_en === null
          ? 'sin_estrenar'
          : 'dentro';

      return {
        personaId: f.persona_id,
        membresiaId: f.membresia_id,
        nombre: f.nombre,
        apellidos: f.apellidos,
        ...(veLosDatos ? { correo: f.correo } : {}),
        rol: f.rol,
        rolNombre: f.rol_nombre,
        alcance: f.alcance,
        estado,
        desde: f.desde.toISOString().slice(0, 10),
        hasta: f.hasta?.toISOString().slice(0, 10) ?? null,
        tienePin: f.tiene_pin,
        ultimoAccesoEn: f.ultimo_acceso_en?.toISOString() ?? null,
      };
    });
  },
});
