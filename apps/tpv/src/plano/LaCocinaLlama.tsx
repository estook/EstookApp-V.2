import { useEffect, useRef } from 'react';
import { Boton } from '@estook/ui';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import type { CuentaEnElPlano } from '../datos/tipos.ts';

/**
 * **«La cocina te llama»** (T4 · 1, decisión 0116): cuando la pantalla de cocina toca
 * «Llamar a Lucía», sale aquí, arriba del plano y de la mesa, hasta que alguien dice **«Ya
 * voy»**. Si la mesa es tuya, el móvil vibra. Dentro de una mesa, flotando arriba.
 */
export function LaCocinaLlama({
  cuentas,
  flotante = false,
}: {
  readonly cuentas: readonly CuentaEnElPlano[];
  readonly flotante?: boolean;
}) {
  const ejecutar = usarAcciones();
  const llaman = cuentas.filter((c) => c.cocinaLlamaEn !== null);
  const vistas = useRef(new Set<string>());

  // Vibra una vez por llamada nueva a una mesa mía.
  useEffect(() => {
    const nuevas = llaman.filter(
      (c) => c.esMia && !vistas.current.has(`${c.cuentaId}:${c.cocinaLlamaEn ?? ''}`),
    );
    for (const c of llaman) vistas.current.add(`${c.cuentaId}:${c.cocinaLlamaEn ?? ''}`);
    if (nuevas.length > 0 && 'vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  }, [llaman]);

  if (llaman.length === 0) return null;
  return (
    <div
      className={`flex flex-col gap-e2 px-e4 md:px-e5 ${flotante ? 'fixed inset-x-0 top-0 z-30 pb-e3 pt-[calc(env(safe-area-inset-top)+var(--spacing-e3))]' : 'pt-e3'}`}
    >
      {llaman.map((c) => (
        <div
          key={c.cuentaId}
          role="status"
          className={`flex flex-wrap items-center gap-e3 rounded-grande py-e2 pl-e4 pr-e2 ${c.esMia ? 'bg-info text-fondo' : 'bg-info-suave text-info'}`}
        >
          <span className="flex-1 font-bold">🛎 La cocina te llama · {c.titulo}</span>
          <Boton
            tono="secundario"
            onClick={() => {
              void ejecutar('ya_voy', { cuenta_id: c.cuentaId });
            }}
          >
            Ya voy
          </Boton>
        </div>
      ))}
    </div>
  );
}
