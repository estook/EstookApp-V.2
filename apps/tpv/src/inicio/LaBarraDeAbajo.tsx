import { useState, useSyncExternalStore } from 'react';
import { inicialesDe } from '@estook/dominio';
import {
  IconoAjustes,
  IconoCandado,
  IconoFlechaDerecha,
  IconoMenu,
  IconoPersona,
  IconoRejilla,
  IconoReloj,
  type Icono,
} from '@estook/iconos';
import { Hoja } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { escucharLaDireccion, irA, irAlPlano, laDireccion } from '../navegar.ts';
import { ponerSoloMias, usarSoloMias } from '../ganchos/usarElFiltroMias.ts';
import { BotonDeLaCampana } from '../avisos/LosAvisos.tsx';
import { ElegirElTema } from '../ajustes/AjustesDelTpv.tsx';

/**
 * **La barra de abajo del móvil** (el rediseño, entrega 2 · 2, 0148; maqueta aprobada el 18-nov):
 * donde llega el pulgar, **Sala · Mías · Avisos · Tú**. «Tú» lleva el tema, Ajustes y Bloquear
 * (y, en la caja, Fichar: la pausa se ficha donde se ficha todo, 0115). Solo en el móvil y en la
 * sala; en la tablet y el PC, todo eso está arriba.
 */
export function LaBarraDeAbajo() {
  const { aparato } = usarSesion();
  const direccion = useSyncExternalStore(escucharLaDireccion, laDireccion);
  const soloMias = usarSoloMias(aparato.esPersonal);
  const [conTu, setConTu] = useState(false);
  const enLaSala = direccion !== 'llevar';

  return (
    <>
      <nav
        aria-label="Abajo"
        className="fixed inset-x-0 bottom-0 z-20 flex gap-e1 border-t border-borde bg-superficie px-e2 pb-[calc(env(safe-area-inset-bottom)+var(--spacing-e1))] pt-e1 md:hidden"
      >
        <Pestana
          icono={IconoRejilla}
          texto="Sala"
          puesta={enLaSala && !soloMias}
          onClick={() => {
            ponerSoloMias(false);
            irAlPlano();
          }}
        />
        {/* «Mías» es un filtro, como el botón de encima del plano: se pulsa y se suelta. */}
        <Pestana
          icono={IconoPersona}
          texto="Mías"
          puesta={enLaSala && soloMias}
          esFiltro
          onClick={() => {
            ponerSoloMias(!(enLaSala && soloMias));
            irAlPlano();
          }}
        />
        <BotonDeLaCampana conTexto />
        <Pestana
          icono={IconoMenu}
          texto="Tú"
          puesta={conTu}
          onClick={() => {
            setConTu(true);
          }}
        />
      </nav>
      <Hoja
        abierta={conTu}
        ajustada
        titulo="Tú"
        alCerrar={() => {
          setConTu(false);
        }}
      >
        <Tu
          alCerrar={() => {
            setConTu(false);
          }}
        />
      </Hoja>
    </>
  );
}

function Pestana({
  icono: Dibujo,
  texto,
  puesta,
  esFiltro = false,
  onClick,
}: {
  readonly icono: Icono;
  readonly texto: string;
  readonly puesta: boolean;
  /** Un filtro que se pulsa y se suelta («Mías»), no un sitio. */
  readonly esFiltro?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={!esFiltro && puesta ? 'page' : undefined}
      aria-pressed={esFiltro ? puesta : undefined}
      onClick={onClick}
      className={[
        'flex min-h-toque flex-1 flex-col items-center justify-center gap-[2px] rounded-grande text-etiqueta font-semibold',
        puesta ? 'bg-naranja-suave text-texto' : 'text-texto-suave',
      ].join(' ')}
    >
      <Dibujo size={22} aria-hidden className={puesta ? 'text-naranja' : undefined} />
      {texto}
    </button>
  );
}

/** Lo de «Tú»: quién está, el tema, y a un toque Fichar (en la caja), Ajustes y Bloquear. */
function Tu({ alCerrar }: { readonly alCerrar: () => void }) {
  const { yo, aparato, bloquear } = usarSesion();
  const ir = (donde: string) => {
    alCerrar();
    irA(donde);
  };
  return (
    <div className="flex flex-col gap-e3 pb-e2">
      <div className="flex items-center gap-e3">
        <span className="flex size-11 items-center justify-center rounded-grande bg-app-servicio font-bold text-fondo">
          {inicialesDe(yo.nombre)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-seccion font-bold">{yo.nombre}</span>
          <span className="truncate text-secundario text-texto-suave">
            {aparato.local.nombre} · {aparato.nombre}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-e3 rounded-grande bg-fondo p-e3">
        <span id="tema-de-tu" className="font-bold">
          Tema
        </span>
        <ElegirElTema etiquetadoPor="tema-de-tu" />
      </div>
      <div className="flex flex-col overflow-hidden rounded-grande bg-fondo">
        {aparato.funcion === 'caja' && (
          <FilaDeTu
            icono={IconoReloj}
            texto="Fichar"
            etiqueta="Fichar"
            detalle="La entrada, la pausa o la salida"
            onClick={() => {
              ir('fichar');
            }}
          />
        )}
        <FilaDeTu
          icono={IconoAjustes}
          texto="Ajustes"
          etiqueta="Ajustes"
          detalle={aparato.funcion === 'caja' ? 'Del TPV y de tu sesión' : 'Tu sesión y el tema'}
          onClick={() => {
            ir('ajustes');
          }}
        />
        <FilaDeTu
          icono={IconoCandado}
          texto="Bloquear"
          etiqueta={`${yo.nombre}: bloquear`}
          detalle="Vuelve al PIN para el siguiente"
          onClick={() => {
            alCerrar();
            bloquear();
          }}
        />
      </div>
    </div>
  );
}

function FilaDeTu({
  icono: Dibujo,
  texto,
  etiqueta,
  detalle,
  onClick,
}: {
  readonly icono: Icono;
  readonly texto: string;
  /** El mismo nombre que arriba: «Ajustes», «Ana: bloquear». */
  readonly etiqueta: string;
  readonly detalle: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="flex min-h-[4rem] items-center gap-e3 border-b border-borde px-e3 text-left last:border-b-0 active:bg-charcoal"
    >
      <Dibujo size={22} aria-hidden className="shrink-0 text-texto-suave" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold">{texto}</span>
        <span className="truncate text-secundario text-texto-suave">{detalle}</span>
      </span>
      <IconoFlechaDerecha size={20} aria-hidden className="shrink-0 text-texto-tenue" />
    </button>
  );
}
