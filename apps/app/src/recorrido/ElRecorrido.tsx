import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconoCerrar } from '@estook/iconos';
import { Boton, EstrellaDeLasApps, clases, usarEsEscritorio } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarElRecorrido } from '../ganchos/usarElRecorrido.ts';

/**
 * El recorrido de la primera vez (las bases firmes, 0084).
 *
 * «Un recorrido de 30 segundos la primera vez que alguien entra, enseñando el menú, el
 * "+" y el Panel.» Cuatro pasos, cada uno con **el sitio de verdad iluminado** y una
 * frase: dónde están las apps, el «+», el buscador y el Panel. No explica cada
 * pantalla: dice dónde está cada cosa, que es lo que nadie encuentra solo.
 *
 * ── Se ofrece, no se impone ─────────────────────────────────────────────────
 *
 * Sale una tarjeta arriba del Panel —«Te lo enseño en 30 segundos»— con «Empezar» y
 * «Ya lo conozco». Quien ya usa Estook (Richi, Santi) no tiene que cerrar nada que no
 * pidió, y la tarjeta no tapa nada mientras está: va en su sitio, como «Hoy».
 *
 * ── Una vez por cuenta ──────────────────────────────────────────────────────
 *
 * Visto o saltado, se guarda **en la cuenta** (`ya_he_visto_el_recorrido`, migración
 * 0066), y no vuelve en ningún aparato. Y en el aparato también, por si la cuenta no
 * se puede escribir (la demostración, o una API de antes de desplegar).
 */
interface Paso {
  readonly donde: string;
  readonly titulo: string;
  readonly frase: { readonly movil: string; readonly escritorio: string };
}

const PASOS: readonly Paso[] = [
  {
    donde: 'menu',
    titulo: 'Tus apps',
    frase: {
      movil:
        'La estrella abre todas tus apps: Almacén, Equipo, Servicio… Dentro de cada una, sus pantallas van en la barra de abajo.',
      escritorio:
        'Todas tus apps, a la izquierda, con sus pantallas debajo. Para plegarlo o abrirlo, toca el logo de arriba.',
    },
  },
  {
    donde: 'hacer',
    titulo: 'Lo que más haces, a un toque',
    frase: {
      movil: 'Fichar, apuntar una merma, hacer un pedido o preguntar a Fogón. Siempre aquí.',
      escritorio: 'Fichar, apuntar una merma, hacer un pedido o preguntar a Fogón. Siempre aquí.',
    },
  },
  {
    donde: 'buscar',
    titulo: 'Busca lo que sea',
    frase: {
      movil: 'Un producto, una persona, un proveedor o una pantalla. No hacen falta tildes.',
      escritorio:
        'Un producto, una persona, un proveedor o una pantalla. También con Ctrl+K, desde cualquier sitio.',
    },
  },
  {
    donde: 'panel',
    titulo: 'Tu Panel',
    frase: {
      movil:
        'Lo que tienes que mirar hoy. Toca una cifra para verla en grande, y «Editar» para quitar o añadir.',
      escritorio:
        'Lo que tienes que mirar hoy. Toca una cifra para verla en grande, y «Editar» para quitar o añadir.',
    },
  },
];

/** La tarjeta de arriba del Panel, y el recorrido cuando se empieza. */
export function InvitacionAlRecorrido() {
  const { yo } = usarSesion();
  const { toca, yaEsta } = usarElRecorrido();
  const [paso, setPaso] = useState<number | null>(null);

  if (!toca && paso === null) return null;
  const nombre = yo?.nombre.split(' ')[0] ?? '';

  const acabar = () => {
    setPaso(null);
    yaEsta();
  };

  return (
    <>
      {/* Se queda mientras dura el recorrido: si se fuera, el Panel subiría debajo del foco. */}
      {toca && (
        <section
          aria-label="El recorrido de Estook"
          className="flex flex-wrap items-center gap-x-e4 gap-y-e3 rounded-mayor border border-borde bg-superficie p-e4 [background-image:var(--relleno-tarjeta)] [box-shadow:var(--sombra-tarjeta)]"
        >
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-grande bg-naranja text-sobre-naranja shadow-s2"
          >
            <EstrellaDeLasApps size={22} />
          </span>
          <div className="min-w-[12rem] flex-1">
            <p className="text-cuerpo font-semibold">
              {nombre === '' ? 'Te lo enseño' : `${nombre}, te lo enseño`} en 30 segundos
            </p>
            <p className="text-secundario text-texto-suave">
              Dónde están tus apps, el «+», el buscador y tu Panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-e2">
            <Boton tono="texto" onClick={yaEsta}>
              Ya lo conozco
            </Boton>
            <Boton
              onClick={() => {
                setPaso(0);
              }}
            >
              Empezar
            </Boton>
          </div>
        </section>
      )}
      {paso !== null && <Pasos paso={paso} alCambiar={setPaso} alAcabar={acabar} />}
    </>
  );
}

/** El sitio de un paso que se ve ahora (en el móvil el menú es la estrella, y en el ordenador, el lateral). */
function elSitio(donde: string): HTMLElement | null {
  for (const sitio of document.querySelectorAll<HTMLElement>(`[data-recorrido="${donde}"]`)) {
    const caja = sitio.getBoundingClientRect();
    if (caja.width > 0 && caja.height > 0) return sitio;
  }
  return null;
}

interface Caja {
  readonly arriba: number;
  readonly izquierda: number;
  readonly ancho: number;
  readonly alto: number;
}

const HOLGURA = 8;
/** Lo grande (el Panel entero) se ilumina por arriba: con ver el principio basta. */
const ALTO_MAXIMO = 300;

function Pasos({
  paso,
  alCambiar,
  alAcabar,
}: {
  readonly paso: number;
  readonly alCambiar: (paso: number) => void;
  readonly alAcabar: () => void;
}) {
  const enEscritorio = usarEsEscritorio();
  const [caja, setCaja] = useState<Caja | null>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  const elPaso = PASOS[paso];

  const medir = useCallback(() => {
    if (elPaso === undefined) return;
    const sitio = elSitio(elPaso.donde);
    if (sitio === null) {
      setCaja(null);
      return;
    }
    const r = sitio.getBoundingClientRect();
    setCaja({
      arriba: r.top - HOLGURA,
      izquierda: r.left - HOLGURA,
      ancho: r.width + HOLGURA * 2,
      alto: Math.min(r.height, ALTO_MAXIMO) + HOLGURA * 2,
    });
  }, [elPaso]);

  // Al cambiar de paso, el sitio a la vista y medido antes de pintar.
  useLayoutEffect(() => {
    if (elPaso === undefined) return;
    const sitio = elSitio(elPaso.donde);
    sitio?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    medir();
  }, [elPaso, medir]);

  useEffect(() => {
    // El foco, en «Siguiente»: el último botón de la tarjeta.
    const botones = tarjeta.current?.querySelectorAll('button');
    botones?.[botones.length - 1]?.focus();
    const alMoverse = () => {
      medir();
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') alAcabar();
    };
    window.addEventListener('resize', alMoverse);
    window.addEventListener('scroll', alMoverse, { passive: true });
    document.addEventListener('keydown', alTeclear);
    // Y si algo de la página cambia de alto mientras (llega «Hoy», una cifra), se vuelve
    // a medir: el foco no se queda donde estaba el sitio.
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(alMoverse);
    observador?.observe(document.body);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', alMoverse);
      window.removeEventListener('scroll', alMoverse);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [medir, alAcabar, paso]);

  if (elPaso === undefined) return null;
  const ultimo = paso === PASOS.length - 1;

  // La tarjeta, debajo del sitio si cabe; si no, encima. Siempre dentro de la pantalla.
  const ANCHO_DE_LA_TARJETA = Math.min(340, window.innerWidth - 32);
  const debajo = caja === null || caja.arriba + caja.alto + 200 < window.innerHeight;
  const izquierda =
    caja === null
      ? (window.innerWidth - ANCHO_DE_LA_TARJETA) / 2
      : Math.min(
          Math.max(16, caja.izquierda + caja.ancho / 2 - ANCHO_DE_LA_TARJETA / 2),
          window.innerWidth - ANCHO_DE_LA_TARJETA - 16,
        );
  const posicion =
    caja === null
      ? { top: window.innerHeight / 2 - 100 }
      : debajo
        ? { top: Math.min(caja.arriba + caja.alto + 12, window.innerHeight - 220) }
        : { bottom: Math.max(window.innerHeight - caja.arriba + 12, 16) };

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label="El recorrido">
      {/* Lo de fuera, oscuro; el sitio, con un hueco que lo deja ver. Tocar fuera no hace nada. */}
      {caja === null ? (
        <div className="absolute inset-0 bg-charcoal/55" />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-grande transition-all duration-[--normal] ease-curva"
          style={{
            top: caja.arriba,
            left: caja.izquierda,
            width: caja.ancho,
            height: caja.alto,
            boxShadow: '0 0 0 9999px rgb(15 18 21 / 0.58), 0 0 0 2px var(--color-naranja)',
          }}
        />
      )}

      <div
        ref={tarjeta}
        className="absolute rounded-mayor border border-borde bg-superficie p-e4 shadow-s3 anima-aparece"
        style={{ width: ANCHO_DE_LA_TARJETA, left: izquierda, ...posicion }}
      >
        <div className="flex items-start gap-e2">
          <p className="min-w-0 flex-1 text-etiqueta font-semibold text-texto-suave">
            {paso + 1} de {PASOS.length}
          </p>
          <button
            type="button"
            onClick={alAcabar}
            aria-label="Cerrar el recorrido"
            className="-mr-e2 -mt-e2 grid size-toque place-items-center rounded-medio text-texto-suave hover:bg-fondo hover:text-texto"
          >
            <IconoCerrar size={18} />
          </button>
        </div>
        <h2 className="text-seccion font-bold tracking-[-0.01em]">{elPaso.titulo}</h2>
        <p className="mt-e1 text-secundario text-texto-suave">
          {enEscritorio ? elPaso.frase.escritorio : elPaso.frase.movil}
        </p>
        <div className="mt-e4 flex items-center justify-between gap-e2">
          <span aria-hidden className="flex gap-e1">
            {PASOS.map((p, i) => (
              <span
                key={p.donde}
                className={clases(
                  'h-[6px] rounded-redondo transition-all duration-[--normal]',
                  i === paso ? 'w-5 bg-naranja' : 'w-[6px] bg-borde-fuerte',
                )}
              />
            ))}
          </span>
          <div className="flex gap-e2">
            {paso > 0 && (
              <Boton
                tono="texto"
                onClick={() => {
                  alCambiar(paso - 1);
                }}
              >
                Atrás
              </Boton>
            )}
            <Boton
              onClick={() => {
                if (ultimo) alAcabar();
                else alCambiar(paso + 1);
              }}
            >
              {ultimo ? 'Listo' : 'Siguiente'}
            </Boton>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
