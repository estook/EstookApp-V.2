import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Las fotos del equipo, de `las_caras` (las bases firmes, 0084): una consulta para toda
 * la app, firmada de una tanda y guardada media hora. La usa `CaraDe`.
 */
interface UnaCara {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly foto: string;
}

const MEDIA_HORA = 30 * 60 * 1000;

/** Las fotos del equipo, por id y por nombre (solo los nombres que no se repiten). */
export function usarLasCaras(): {
  readonly porId: ReadonlyMap<string, string>;
  readonly porNombre: ReadonlyMap<string, string>;
} {
  const { yo, cliente } = usarSesion();
  const consulta = useQuery({
    queryKey: ['las_caras', yo?.personaId ?? null],
    enabled: yo !== null,
    // Media hora: las caras cambian poco, y así el enlace de cada foto no cambia y el
    // navegador no la descarga otra vez en cada pantalla.
    staleTime: MEDIA_HORA,
    queryFn: async (): Promise<{ readonly caras: readonly UnaCara[] }> => {
      const respuesta = await cliente.consultar<{ readonly caras: readonly UnaCara[] }>(
        'las_caras',
      );
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
  return useMemo(() => {
    const porId = new Map<string, string>();
    const vecesDe = new Map<string, number>();
    const porNombre = new Map<string, string>();
    for (const cara of consulta.data?.caras ?? []) {
      porId.set(cara.personaId, cara.foto);
      // Por el nombre y por el nombre entero; sin apellidos son el mismo, y cuenta una vez.
      for (const nombre of new Set([
        cara.nombre,
        `${cara.nombre} ${cara.apellidos ?? ''}`.trim(),
      ])) {
        vecesDe.set(nombre, (vecesDe.get(nombre) ?? 0) + 1);
        porNombre.set(nombre, cara.foto);
      }
    }
    // Dos «Ana» son dos caras: por el nombre no se sabe cuál, y mejor las iniciales.
    for (const [nombre, veces] of vecesDe) if (veces > 1) porNombre.delete(nombre);
    return { porId, porNombre };
  }, [consulta.data]);
}
