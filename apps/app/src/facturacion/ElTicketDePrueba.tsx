import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Boton, ErrorEnCristiano, Tarjeta } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Probar el papel** (Ajustes › Facturación, maqueta de T6; T6 · 2 · 1, decisión 0136): un
 * ticket de verdad en el entorno de pruebas, por la impresora de la caja, con su QR y «PRUEBA ·
 * SIN VALIDEZ», para ver el QR en la impresora de verdad antes de cobrar (Anexo, prueba 24). No
 * cuenta en ventas. Solo con el alta lista y en pruebas.
 */
export function ElTicketDePrueba() {
  const { cliente } = usarSesion();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const imprimir = useMutation({
    mutationFn: async () => {
      const r = await cliente.ejecutar<{ documentoId: string; numero: string }>(
        'imprimir_un_ticket_de_prueba',
        {},
      );
      if (!r.ok) throw new FalloDeLaApi(r.error);
      return r.datos;
    },
    onSuccess: () => {
      setError(null);
    },
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  return (
    <Tarjeta titulo="Probar el papel">
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Sale por la impresora de la caja, con su QR y «PRUEBA · SIN VALIDEZ». No cuenta en ventas.
        </p>
        <div>
          <Boton
            tono="secundario"
            cargando={imprimir.isPending}
            textoCargando="Mandando a Hacienda"
            onClick={() => {
              imprimir.mutate();
            }}
          >
            Imprimir un ticket de prueba
          </Boton>
        </div>
        {imprimir.data !== undefined && (
          <p className="text-secundario">
            Hecho: <strong className="tabular-nums">{imprimir.data.numero}</strong>.{' '}
            <Link className="underline" to="/negocio/ventas/tickets-y-facturas">
              Verlo en Tickets y facturas
            </Link>
          </p>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
      </div>
    </Tarjeta>
  );
}
