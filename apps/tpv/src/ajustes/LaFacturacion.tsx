import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { LAS_MODALIDADES, enMinuscula, type ModalidadDeFacturacion } from '@estook/dominio';
import { Cargando, ComoFactura, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from '../ganchos/usarLaSala.ts';
import { usarLaFacturacionDelTpv } from '../ganchos/usarLaFacturacionDelTpv.ts';

/**
 * **Ajustes del TPV › Facturación** (0127): cómo factura el local —con VERI*FACTU, la recomendada;
 * sin envío, que todavía no está; o fuera, por el SII— con su «i», y cómo va el alta. Para quien
 * hace el alta (gerente, dirección y administrador de cuenta), con el mismo permiso que en Estook.
 * **El alta se hace en Estook**: aquí solo se ve y se elige cómo factura.
 */

export function LaFacturacion() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const lo = usarLaFacturacionDelTpv();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function elegir(modalidad: ModalidadDeFacturacion) {
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar('elegir_la_modalidad', { modalidad });
    setOcupado(false);
    if (!respuesta.ok) setError(respuesta.error);
    await cache.invalidateQueries({ queryKey: ['mi_facturacion'] });
  }

  if (lo.data === undefined) {
    return lo.error instanceof FalloDeLaSala ? (
      <ErrorEnCristiano error={lo.error.error} />
    ) : (
      <Cargando que="la facturación" lineas={3} />
    );
  }
  const e = lo.data.empresa;
  const como = lo.data.como;

  return (
    <section aria-label="Facturación" className="flex max-w-[44rem] flex-col gap-e4">
      <h2 className="text-seccion font-bold">Facturación</h2>
      <div className="rounded-grande border border-borde bg-superficie p-e4">
        <p className="text-cuerpo font-semibold">
          {e === null ? 'Sin dar de alta' : e.nombre}
          {e !== null && (
            <span className="ml-e2 text-secundario font-medium text-atencion">
              {e.entorno === 'real' ? 'En real' : 'En pruebas'}
            </span>
          )}
        </p>
        <p className="text-secundario text-texto-suave">
          {como.estado === 'lista'
            ? 'El alta está terminada.'
            : como.estado === 'parada'
              ? como.parada.titulo
              : `Falta: ${enMinuscula(como.falta)}. Se hace en Estook › Ajustes › Facturación.`}
        </p>
      </div>
      {e !== null && (
        <ComoFactura
          elegida={e.modalidad}
          enSii={e.enSii === true}
          alElegir={(m) => {
            void elegir(m);
          }}
          ocupado={ocupado}
        />
      )}
      {error !== null && <ErrorEnCristiano error={error} />}
    </section>
  );
}

/** La línea de la baldosa: cómo factura el local. */
export function ComoFacturaEnUnaLinea() {
  const lo = usarLaFacturacionDelTpv();
  const e = lo.data?.empresa ?? null;
  if (lo.data === undefined) return <>Cómo factura el local</>;
  if (e === null) return <>Sin dar de alta: se hace en Estook</>;
  return <>{LAS_MODALIDADES[e.modalidad].nombre}</>;
}
