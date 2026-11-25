import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarAcciones } from './usarLaSala.ts';
import { irALaMesa } from '../navegar.ts';

/** Lo que dice el servidor al abrir: entra en la cuenta, o en la de quien la abrió antes. */
export function usarAbrirLaMesa(cuentaId: string, que: string) {
  const ejecutar = usarAcciones();
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  async function abrir(entrada: Record<string, unknown>) {
    setAbriendo(true);
    setFallo(null);
    const hecho = await ejecutar<{ cuentaId: string }>('abrir_mesa', entrada, cuentaId, {
      que,
      cuentaId,
      respuesta: { cuentaId },
    });
    setAbriendo(false);
    if (hecho.ok) {
      irALaMesa(hecho.datos.cuentaId);
      return;
    }
    // Otro la abrió antes: se entra en la suya, que es la misma mesa.
    const suya = hecho.error.detalle?.['cuentaId'];
    if (hecho.error.codigo === 'ya_hecho' && typeof suya === 'string') {
      irALaMesa(suya);
      return;
    }
    setFallo(hecho.error);
  }
  return { abrir, abriendo, fallo };
}
