import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from '../ganchos/usarLaSala.ts';
import { LaBarraDeArriba } from './LaBarraDeArriba.tsx';

/**
 * **Agotados** (Anexo 3.1 y 11.5): marcar lo que se ha acabado, hasta el final de la
 * jornada, y desmarcarlo. Es lo mismo que en Estook (M10 · 1): el plato se apaga en la
 * sala al momento y vuelve solo al día siguiente.
 */

interface PlatoParaAgotar {
  readonly id: string;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly agotado: { readonly hasta: string | null } | null;
}

export function Agotados() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const platos = useQuery({
    queryKey: ['sala', 'los_agotados'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<{ platos: readonly PlatoParaAgotar[] }>(
        'los_agotados',
      );
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos.platos;
    },
  });

  async function cambiar(plato: PlatoParaAgotar) {
    setOcupado(plato.id);
    setError(null);
    const respuesta =
      plato.agotado === null
        ? await cliente.ejecutar('marcar_agotado', { plato_id: plato.id, hasta: 'jornada' })
        : await cliente.ejecutar('quitar_agotado', { plato_id: plato.id });
    setOcupado(null);
    if (!respuesta.ok) setError(respuesta.error);
    await cache.invalidateQueries({ queryKey: ['sala'] });
    await cache.invalidateQueries({ queryKey: ['carta_de_la_sala'] });
  }

  const secciones = new Map<string, PlatoParaAgotar[]>();
  for (const plato of platos.data ?? []) {
    const clave = plato.seccion ?? 'Sin sección';
    secciones.set(clave, [...(secciones.get(clave) ?? []), plato]);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-fondo text-texto">
      <LaBarraDeArriba titulo="Agotados" />
      <main className="flex flex-col gap-e5 p-e4 md:p-e5">
        <p className="text-cuerpo text-texto-suave">
          Toca un plato para agotarlo hasta el final de la jornada; tócalo otra vez si vuelve a
          haber.
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}
        {platos.isLoading ? (
          <Cargando que="la carta" />
        ) : platos.error instanceof FalloDeLaSala ? (
          <ErrorEnCristiano error={platos.error.error} />
        ) : (
          [...secciones].map(([seccion, deLaSeccion]) => (
            <section key={seccion} className="flex flex-col gap-e3">
              <h2 className="text-seccion font-bold">{seccion}</h2>
              <div className="grid gap-e3 sm:grid-cols-2 lg:grid-cols-4">
                {deLaSeccion.map((plato) => (
                  <button
                    key={plato.id}
                    type="button"
                    aria-pressed={plato.agotado !== null}
                    disabled={ocupado !== null}
                    onClick={() => void cambiar(plato)}
                    className={[
                      'flex min-h-toque-cocina flex-col items-start justify-center rounded-grande px-e4 py-e3 text-left font-bold',
                      plato.agotado !== null
                        ? 'border-2 border-mal bg-mal-suave text-mal'
                        : 'bg-superficie',
                    ].join(' ')}
                  >
                    {plato.nombre}
                    {plato.agotado !== null && (
                      <span className="text-secundario font-semibold">Agotado</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
