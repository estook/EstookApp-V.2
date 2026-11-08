import type { PropsDeUnPaso } from '../contrato.ts';
import { LaFichaDelLocal } from '../LaFichaDelLocal.tsx';

/**
 * Paso 4 · «¿Dónde está tu restaurante?» (M5).
 *
 * ── Desde la pausa del 8-nov, se busca en Google (0142) ──────────────────────
 *
 * El Manifiesto lo pedía así desde el principio y se aplazó a M23 (0013); con Google ya
 * conectado (0040), se escribe el nombre, se toca el tuyo y se rellenan el nombre, la
 * dirección, el teléfono y el horario. Sin la clave de Google se escribe a mano, como antes.
 *
 * ── Y la hora de cierre ya no se pregunta ────────────────────────────────────
 *
 * «Un bar cierra a las tres de la mañana. Una venta de las 02:30 del sábado pertenece a la
 * jornada del viernes» (motor de tiempo, M2): sigue haciendo falta, pero se pone sola a las
 * cinco, o la que propone Google, y se cambia plegada aquí o en Ajustes › Tu local.
 */
export function DondeEsta({ alta, cliente, alGuardar, alFallar }: PropsDeUnPaso) {
  return (
    <LaFichaDelLocal
      ficha={{
        nombre: alta.nombre,
        direccion: alta.ficha.direccion,
        codigoPostal: alta.ficha.codigoPostal,
        poblacion: alta.ficha.poblacion,
        provincia: alta.ficha.provincia,
        telefono: alta.ficha.telefono,
        horaDeCorte: alta.ficha.horaDeCorte,
      }}
      cliente={cliente}
      boton="Continuar"
      alGuardar={alGuardar}
      alFallar={alFallar}
      conBuscador
    />
  );
}
