import { useState } from 'react';
import { PUESTOS_QUE_LA_LLEVAN } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { ErrorEnCristiano, Etiqueta, Interruptor, Tarjeta } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { QuienLaLlevaLaFacturacion } from './contrato.ts';

/**
 * **Quién lleva la facturación** (0128, pedido por Richi el 5-nov). Solo la ve la dirección: de
 * fábrica la facturación es suya, y aquí se la da a quien quiera de quien manda en el local
 * (gerente, area manager, administrador de cuenta o gestoría). Quien la lleva ve y cambia
 * Ajustes › Facturación, aquí y en Estook TPV; **firmar ante Hacienda sigue siendo solo del
 * titular**. Al titular no se le quita: antes se cambia en el paso 1.
 */
export function QuienLaLleva({
  personas,
  alCambiar,
}: {
  readonly personas: readonly QuienLaLlevaLaFacturacion[];
  readonly alCambiar: () => void;
}) {
  const { cliente } = usarSesion();
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const otras = personas.filter((p) => !p.siempre);

  return (
    <Tarjeta titulo="Quién la lleva">
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Lo fiscal es de la dirección. Dásela a quien quieras: la verá y la podrá cambiar, aquí y
          en Estook TPV. Firmar ante Hacienda sigue siendo solo del titular.
        </p>
        <ul className="flex flex-col">
          {personas
            .filter((p) => p.siempre)
            .map((p) => (
              <li
                key={p.personaId}
                className="flex min-h-toque items-center gap-e3 border-b border-borde py-e2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-cuerpo font-medium">{p.nombre}</span>
                  <span className="block text-secundario text-texto-suave">
                    {PUESTOS_QUE_LA_LLEVAN[p.rol]}
                    {p.esTitular ? ' · firma ante Hacienda' : ''}
                  </span>
                </span>
                <Etiqueta tono="neutro">Siempre</Etiqueta>
              </li>
            ))}
          {otras.map((p) => (
            <li
              key={p.personaId}
              className="flex min-h-toque items-center gap-e3 border-b border-borde py-e2 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-cuerpo font-medium">{p.nombre}</span>
                <span className="block text-secundario text-texto-suave">
                  {PUESTOS_QUE_LA_LLEVAN[p.rol]}
                  {p.esTitular ? ' · firma ante Hacienda' : ''}
                </span>
              </span>
              <Interruptor
                etiqueta={`${p.nombre} lleva la facturación`}
                etiquetaOculta
                puesto={p.laLleva}
                disabled={cambiando !== null || (p.esTitular && p.laLleva)}
                alCambiar={(puesto) => {
                  setCambiando(p.personaId);
                  setError(null);
                  void cliente
                    .ejecutar('dar_la_facturacion', { persona_id: p.personaId, la_lleva: puesto })
                    .then((r) => {
                      setCambiando(null);
                      if (!r.ok) setError(r.error);
                      alCambiar();
                    });
                }}
              />
            </li>
          ))}
        </ul>
        {otras.length === 0 && (
          <p className="text-secundario text-texto-suave">
            En este local no hay nadie más a quien dársela. Se le puede dar a un gerente, un area
            manager, un administrador de cuenta o la gestoría.
          </p>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
      </div>
    </Tarjeta>
  );
}
