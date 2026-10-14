import { Avatar } from '@estook/ui';
import { usarLasCaras } from '../ganchos/usarLasCaras.ts';
/**
 * La cara de alguien del equipo, con su foto si la tiene (las bases firmes, 0084).
 *
 * «Las caras con foto también en el chat.» Cada pantalla trae a sus personas con su id
 * o su nombre, y la foto se busca en `las_caras`: **una consulta para toda la app**,
 * firmada de una tanda y guardada media hora. Sin foto, o mientras llega, sus
 * iniciales, como siempre: la cara nunca espera a nada.
 */
export interface CaraDeProps {
  readonly nombre: string;
  /** Si se sabe, su id: es lo seguro. Si no, se busca por el nombre. */
  readonly personaId?: string | null;
  readonly tamano?: number;
}

export function CaraDe({ nombre, personaId = null, tamano = 32 }: CaraDeProps) {
  const { porId, porNombre } = usarLasCaras();
  const foto = (personaId === null ? undefined : porId.get(personaId)) ?? porNombre.get(nombre);
  return <Avatar nombre={nombre} tamano={tamano} foto={foto ?? null} />;
}
