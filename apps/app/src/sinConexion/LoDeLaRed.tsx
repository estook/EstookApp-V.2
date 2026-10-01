import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boton, Botones, Hoja, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarHayRed, usarLoPendiente } from '../ganchos/usarLaRed.ts';
import { loMasNuevo } from './cacheGuardada.ts';
import { olvidarNoApuntado } from './cola.ts';

function hora(cuando: number): string {
  return new Date(cuando).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Lo de la red, arriba de cada pantalla (I · decisión 0070).
 *
 *   · **Sin conexión**, una línea: desde cuándo es lo que se ve, y que fichar y las
 *     mermas se guardan. Sin señal no se pregunta nada: se ve lo último.
 *   · **«2 sin mandar»**, mientras haya algo hecho sin señal: se manda solo al volver,
 *     y se puede mirar qué es.
 *   · **«1 sin apuntar»**, si al volver Estook no pudo apuntar algo: se dice por qué y
 *     se da por visto. No se pierde nada en silencio (regla 34).
 *
 * Lo que va por detrás —mandar lo pendiente, el móvil al día— está en
 * `ganchos/usarLoDeLaRed.ts`.
 */

/** La línea de arriba: sin conexión, lo que falta por mandar y lo que no se apuntó. */
export function LoDeLaRed() {
  const { yo } = usarSesion();
  const cache = useQueryClient();
  const conRed = usarHayRed();
  const { pendientes, noApuntados } = usarLoPendiente(yo?.personaId ?? null);
  const [abierta, setAbierta] = useState(false);

  if (conRed && pendientes.length === 0 && noApuntados.length === 0) return null;
  const desde = conRed ? null : loMasNuevo(cache);

  return (
    <>
      <div
        role="status"
        className={clases(
          'mb-e3 flex flex-wrap items-center gap-x-e3 gap-y-e1 rounded-medio border px-e3 py-e2 text-secundario',
          noApuntados.length > 0
            ? 'border-mal/40 bg-mal-suave'
            : conRed
              ? 'border-borde bg-superficie'
              : 'border-atencion/40 bg-atencion-suave',
        )}
      >
        {!conRed && (
          <span className="font-semibold">
            Sin conexión{desde === null ? '' : ` · lo de las ${hora(desde)}`}
          </span>
        )}
        {!conRed && pendientes.length === 0 && (
          <span className="text-texto-suave">Fichar y las mermas se guardan y salen solos.</span>
        )}
        {(pendientes.length > 0 || noApuntados.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setAbierta(true);
            }}
            className="inline-flex min-h-toque items-center gap-e2 font-semibold underline-offset-2 hover:underline"
          >
            {pendientes.length > 0 &&
              `${String(pendientes.length)} sin mandar${conRed ? ' · mandando' : ''}`}
            {pendientes.length > 0 && noApuntados.length > 0 && ' · '}
            {noApuntados.length > 0 && (
              <span className="text-mal">{`${String(noApuntados.length)} sin apuntar`}</span>
            )}
          </button>
        )}
      </div>

      <Hoja
        abierta={abierta}
        alCerrar={() => {
          setAbierta(false);
        }}
        titulo="Lo hecho sin señal"
        pie={
          <Botones>
            <Boton
              tono="texto"
              onClick={() => {
                setAbierta(false);
              }}
            >
              Cerrar
            </Boton>
          </Botones>
        }
      >
        <div className="flex flex-col gap-e5">
          {pendientes.length > 0 && (
            <section aria-label="Sin mandar" className="flex flex-col gap-e2">
              <h3 className="text-cuerpo font-semibold">Sin mandar</h3>
              <p className="text-secundario text-texto-suave">
                Se manda solo en cuanto hay señal, con la hora a la que lo hiciste.
              </p>
              <ul className="flex flex-col divide-y divide-borde">
                {pendientes.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-e3 py-e2">
                    <span>{p.que}</span>
                    <span className="tabular-nums text-texto-suave">{hora(p.hechoEn)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {noApuntados.length > 0 && (
            <section aria-label="No se ha podido apuntar" className="flex flex-col gap-e2">
              <h3 className="text-cuerpo font-semibold text-mal">No se ha podido apuntar</h3>
              <ul className="flex flex-col divide-y divide-borde">
                {noApuntados.map((p) => (
                  <li key={p.id} className="flex flex-col gap-e1 py-e2">
                    <span className="flex items-center justify-between gap-e3">
                      <span className="font-medium">{p.que}</span>
                      <span className="tabular-nums text-texto-suave">{hora(p.hechoEn)}</span>
                    </span>
                    <span className="text-secundario text-texto-suave">{p.porque}</span>
                    <span>
                      <Boton
                        tono="texto"
                        onClick={() => {
                          void olvidarNoApuntado(p.id);
                        }}
                      >
                        Entendido
                      </Boton>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Hoja>
    </>
  );
}
