import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
import { ErrorEnCristiano, Interruptor } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * «¿Tu local sirve menús?», en Ajustes › Tu local, debajo de «Tu carta» (Richi, 21-oct,
 * 0103). Apagado, Carta › Menús no sale; encendido, el menú del día nace hecho. Es lo
 * mismo que se pregunta la primera vez que se abre Menús.
 */
export function TusMenus() {
  const { cliente, yo, permisos, refrescar } = usarSesion();
  const cache = useQueryClient();
  // Lo pulsado, mientras se guarda y se relee la sesión: sin esto, el interruptor
  // volvía un momento a como estaba (y una prueba lo cazó con la máquina cargada).
  const [pulsado, setPulsado] = useState<boolean | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const local = yo?.local ?? null;
  if (local === null) return null;

  async function cambiar(nuevo: boolean) {
    setPulsado(nuevo);
    setError(null);
    const respuesta = await cliente.ejecutar('sirve_menus', { sirve: nuevo });
    if (respuesta.ok) {
      await Promise.all([refrescar(), cache.invalidateQueries({ queryKey: ['mis_menus'] })]);
    } else {
      setError(respuesta.error);
    }
    setPulsado(null);
  }
  const sirve = pulsado ?? local.sirveMenus === true;

  return (
    <div className="flex flex-col gap-e2">
      {error !== null && <ErrorEnCristiano error={error} />}
      <Interruptor
        etiqueta="Tu local sirve menús"
        ayuda={
          sirve
            ? 'El menú del día está en Carta › Menús.'
            : 'Apagado, Carta › Menús no sale. Encendido, el menú del día nace hecho.'
        }
        puesto={sirve}
        disabled={pulsado !== null || !puedeEditar(permisos, 'app.carta')}
        alCambiar={(nuevo) => {
          void cambiar(nuevo);
        }}
      />
    </div>
  );
}
