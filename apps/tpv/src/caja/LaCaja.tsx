import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { irAlPlano } from '../navegar.ts';
import { AbrirCaja } from './AbrirCaja.tsx';
import { AbrirElCajon } from './AbrirElCajon.tsx';
import { CerrarCaja } from './CerrarCaja.tsx';
import { ComoVa } from './ComoVa.tsx';

/** Las pantallas de la caja, cada una en su dirección: `#/caja/abrir`, `cerrar`, `cajon`, `como-va`. */
export type PantallaDeLaCaja = 'abrir' | 'cerrar' | 'cajon' | 'como-va';

const TITULO: Readonly<Record<PantallaDeLaCaja, string>> = {
  abrir: 'Abrir caja',
  cerrar: 'Cerrar caja',
  cajon: 'Abrir el cajón',
  'como-va': 'Cómo va la caja',
};

export function esPantallaDeLaCaja(texto: string): texto is PantallaDeLaCaja {
  return texto in TITULO;
}

/**
 * **La caja** (R3 · 1, decisión 0144): abrirla, cerrarla, abrir el cajón y «Cómo va», en pantalla
 * completa con la barra de siempre. Al acabar, a la sala.
 */
export function LaCaja({ pantalla }: { readonly pantalla: PantallaDeLaCaja }) {
  return (
    <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
      <LaBarraDeArriba titulo={TITULO[pantalla]} />
      <main className="mx-auto flex w-full max-w-[60rem] flex-col gap-e5 p-e4 md:p-e6">
        {pantalla === 'abrir' && <AbrirCaja alAbrir={irAlPlano} alVolver={irAlPlano} />}
        {pantalla === 'cerrar' && <CerrarCaja alAcabar={irAlPlano} />}
        {pantalla === 'cajon' && <AbrirElCajon alAcabar={irAlPlano} />}
        {pantalla === 'como-va' && <ComoVa />}
      </main>
    </div>
  );
}
