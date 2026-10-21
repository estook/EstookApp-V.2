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
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const local = yo?.local ?? null;
  if (local === null) return null;

  async function cambiar(sirve: boolean) {
    setCambiando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('sirve_menus', { sirve });
    setCambiando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await Promise.all([refrescar(), cache.invalidateQueries({ queryKey: ['mis_menus'] })]);
  }

  return (
    <div className="flex flex-col gap-e2">
      {error !== null && <ErrorEnCristiano error={error} />}
      <Interruptor
        etiqueta="Tu local sirve menús"
        ayuda={
          local.sirveMenus === true
            ? 'El menú del día está en Carta › Menús.'
            : 'Apagado, Carta › Menús no sale. Encendido, el menú del día nace hecho.'
        }
        puesto={local.sirveMenus === true}
        disabled={cambiando || !puedeEditar(permisos, 'app.carta')}
        alCambiar={(sirve) => {
          void cambiar(sirve);
        }}
      />
    </div>
  );
}
