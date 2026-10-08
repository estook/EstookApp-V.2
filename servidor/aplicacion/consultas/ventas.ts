import { z } from 'zod';
import { PERIODOS_DE_VENTAS, type PeriodoDeVentas, type TableroDeVentas } from '@estook/dominio';
import { anotarEnElAdmin } from '../admin.ts';
import { consulta } from '../contrato.ts';
import { hoyEnMadrid } from '../pago.ts';
import { lasVentas } from '../ventas.ts';

/**
 * El tablero de ventas, en el admin (A4 · decisión 0077).
 *
 * Todo lo cuenta el servidor: la pantalla solo lo pinta. **Ver lo cobrado deja
 * rastro** (panel de administración, 5): una línea en la auditoría del admin, **una
 * vez al día por persona**, no cada vez que se abre o se cambia de periodo. Es la única
 * consulta que escribe, y escribe solo eso.
 */
export const adminLasVentas = consulta<{ periodo?: PeriodoDeVentas | undefined }, TableroDeVentas>({
  nombre: 'admin_las_ventas',
  entrada: z.object({ periodo: z.enum(PERIODOS_DE_VENTAS).optional() }).strict(),
  soloAdmin: true,

  async ejecutar(contexto, entrada) {
    const hoy = hoyEnMadrid(contexto.ahora);
    const tablero = await lasVentas(contexto, entrada.periodo ?? 'mes', hoy);

    const quien = contexto.sesion?.personaId ?? null;
    if (quien !== null) {
      const [ya] = await contexto.sql<{ hay: boolean }[]>`
        select exists (
          select 1 from plataforma.auditoria
           where persona_id = ${quien}::uuid and accion = 'ver_lo_cobrado'
             and (ocurrido_en at time zone 'Europe/Madrid')::date = ${hoy}::date
        ) as hay
      `;
      if (ya?.hay !== true) {
        await anotarEnElAdmin(contexto, {
          accion: 'ver_lo_cobrado',
          entidad: 'ventas',
          entidadId: null,
          despues: { periodo: tablero.periodo, modo: tablero.modo },
        });
      }
    }
    return tablero;
  },
});
