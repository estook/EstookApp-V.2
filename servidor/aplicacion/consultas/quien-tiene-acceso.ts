import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { estaPorEncima, suAmplitud } from '../jerarquia.ts';

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
  /**
   * Si tiene una sesión viva ahora mismo. «Que no ponga "dentro" cuando ya esté
   * dentro, sino "en línea" si se conecta, y si no la última vez.» El estado de
   * antes decía «dentro» a quien entró una vez hace tres meses.
   */
  readonly enLinea: boolean;
  /**
   * Si quien mira puede tocar el acceso de esta persona: está por encima de ella
   * (M7, repaso · `jerarquia.ts`). A un igual no se le retira ni se le cambia la
   * clave; la pantalla lo dice en vez de enseñar un botón que va a decir que no.
   */
  readonly puedoGestionar: boolean;
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
        en_linea: boolean;
        amplitud_del_rol: number;
        su_amplitud: number | null;
        organizacion_id: string;
      }[]
    >`
      select p.id as persona_id,
             r.amplitud::int as amplitud_del_rol,
             l.organizacion_id,
             (select max(r2.amplitud)::int
                from estook.membresia m2
                join estook.rol r2 on r2.codigo = m2.rol
               where m2.persona_id = p.id
                 and m2.organizacion_id = l.organizacion_id
                 and m2.revocada_en is null
                 and (m2.hasta is null or m2.hasta >= current_date)) as su_amplitud,
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
             exists (
               select 1 from estook.sesion s
                where s.persona_id = p.id
                  and s.cerrada_en is null
                  and s.caduca_en > now()
             ) as en_linea,
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

    const organizacionId = filas[0]?.organizacion_id;
    const mia = organizacionId === undefined ? 0 : await suAmplitud(sql, organizacionId, personaId);

    return filas.map((f) => {
      // Contra el rol más alto que tenga vivo y, si está fuera, contra el rol que
      // se le devolvería: a un gerente retirado no lo reactiva otro gerente.
      const suya = Math.max(f.su_amplitud ?? 0, f.amplitud_del_rol);
      const puedoGestionar = f.persona_id !== personaId && estaPorEncima(mia, suya);
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
        enLinea: f.vigente && f.en_linea,
        puedoGestionar,
      };
    });
  },
});
