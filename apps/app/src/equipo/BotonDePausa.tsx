import { Boton } from '@estook/ui';
import { IconoReloj } from '@estook/iconos';
import type { Fichar } from '../ganchos/usarFichar.ts';

/**
 * «Empezar pausa» y «Volver» (H1 · decisión 0068).
 *
 * Solo sale **dentro de un turno** y si el local ficha las pausas. Es la pausa de
 * descanso de dentro del turno; el horario partido no es esto, son dos turnos con su
 * salida y su entrada. Si la pausa cuenta como trabajo lo dice el local, y no cambia
 * nada de lo que se ve aquí: solo cómo se cuentan las horas.
 */
export function BotonDePausa({
  fichar,
  corto = false,
}: {
  readonly fichar: Fichar;
  /** En la casilla pequeña del Panel: «Pausa» y «Volver», sin más. */
  readonly corto?: boolean;
}) {
  const mio = fichar.mio;
  if (mio === undefined || mio.abierto === null || mio.pausasEnUso === false) return null;
  // Sin el dato todavía (la API va por detrás): no se enseña un botón que fallaría.
  if (mio.enPausaDesde === undefined) return null;

  const enPausa = mio.enPausaDesde !== null;
  return (
    <Boton
      tono="secundario"
      icono={<IconoReloj size={18} />}
      cargando={fichar.fichando}
      textoCargando="Apuntando"
      onClick={enPausa ? fichar.volverDeLaPausa : fichar.empezarPausa}
      aria-label={enPausa ? 'Volver de la pausa' : 'Empezar la pausa de descanso'}
    >
      {enPausa ? 'Volver' : corto ? 'Pausa' : 'Empezar pausa'}
    </Boton>
  );
}
