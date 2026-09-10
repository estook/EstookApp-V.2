import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Qué persona tiene abierta su ficha · en la dirección, no en un estado.
 *
 * ── Por qué en la dirección ─────────────────────────────────────────────────
 *
 * «Se entra pulsando en el widget de equipo, o en la cápsula de la persona en
 * Equipo, o clicando en su nombre en el calendario o en los horarios.» Son cuatro
 * sitios y ninguno está dentro del otro. Con un estado de React habría que pasarlo
 * de mano en mano; con la dirección, cualquier sitio abre la ficha escribiendo
 * `?persona=…`, y además:
 *
 *   · el enlace se puede copiar y mandar —«mira las horas de Marcos»—, y
 *   · el botón de atrás del móvil **cierra la ficha** en vez de sacarte de Equipo,
 *     que es lo que la gente espera de ese botón.
 */
export function usarPersonaAbierta(): {
  readonly abierta: string | null;
  readonly abrir: (personaId: string) => void;
  readonly cerrar: () => void;
} {
  const [parametros, ponerParametros] = useSearchParams();
  const abierta = parametros.get('persona');

  const abrir = useCallback(
    (personaId: string) => {
      const nuevos = new URLSearchParams(parametros);
      nuevos.set('persona', personaId);
      ponerParametros(nuevos);
    },
    [parametros, ponerParametros],
  );

  const cerrar = useCallback(() => {
    const nuevos = new URLSearchParams(parametros);
    nuevos.delete('persona');
    ponerParametros(nuevos, { replace: true });
  }, [parametros, ponerParametros]);

  return { abierta, abrir, cerrar };
}
