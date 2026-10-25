import { useState } from 'react';
import { Boton, instalar, usarComoSeInstala } from '@estook/ui';

/**
 * **«Instala Estook TPV»** (0115; Richi, 25-oct: «acceder por internet suena feo»): la
 * primera vez que se abre, una franja arriba. En Android y en Chrome o Edge del ordenador,
 * un botón; en el iPhone y el iPad, los dos toques, porque Apple no deja poner un botón.
 * **Una franja y no una hoja**: invita sin tapar nada, ni el teclado del PIN.
 *
 * **Antes de vincular**, y no después: en el iPhone, lo instalado no ve lo que guardó
 * Safari, así que el aparato se vincula ya dentro de la app instalada. «Ahora no» se
 * recuerda y no vuelve a salir en ese aparato.
 */

const CERRADA = 'estook.tpv.instalar.cerrada';

function yaSeCerro(): boolean {
  try {
    return window.localStorage.getItem(CERRADA) === 'si';
  } catch {
    return false;
  }
}

function cerrar(): void {
  try {
    window.localStorage.setItem(CERRADA, 'si');
  } catch {
    // Sin poder guardarlo, vuelve a salir la próxima vez: no se pierde nada.
  }
}

/** El icono de Compartir del iPhone: un cuadrado con una flecha hacia arriba. */
function IconoCompartir() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="inline size-[1.15em] align-[-0.2em]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export function InstalaEstookTpv() {
  const comoSeInstala = usarComoSeInstala();
  const [cerrada, setCerrada] = useState(yaSeCerro);
  const abierta = !cerrada && (comoSeInstala === 'boton' || comoSeInstala === 'iphone');

  const ahoraNo = () => {
    cerrar();
    setCerrada(true);
  };

  if (!abierta) return null;
  return (
    <section
      aria-label="Instala Estook TPV"
      className="flex flex-wrap items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e3 text-texto md:px-e5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-e1">
        <span className="font-bold">Instala Estook TPV</span>
        {comoSeInstala === 'boton' ? (
          <span className="text-secundario text-texto-suave">
            Con su icono y a pantalla completa. Y la pantalla de cocina suena siempre.
          </span>
        ) : (
          <span className="text-secundario text-texto-suave">
            Toca <IconoCompartir /> <span className="font-medium">Compartir</span> en Safari, elige{' '}
            <span className="font-medium">«Añadir a la pantalla de inicio»</span> y abre Estook TPV
            desde su icono.
          </span>
        )}
      </div>
      {comoSeInstala === 'boton' && (
        <Boton
          tono="principal"
          onClick={() => {
            void instalar().then((instalada) => {
              if (instalada) ahoraNo();
            });
          }}
        >
          Instalar
        </Boton>
      )}
      <Boton tono="texto" onClick={ahoraNo}>
        Ahora no
      </Boton>
    </section>
  );
}
