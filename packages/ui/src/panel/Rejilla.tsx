import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { enumerar } from '@estook/dominio';
import { IconoAnadir, IconoHecho, IconoRejilla } from '@estook/iconos';
import { clases } from '../clases.ts';
import { Casilla, HuecoDeAnadir } from './Casilla.tsx';
import { CLASES_DE_LA_REJILLA } from './rejilla.ts';
import type { RejillaConVacios, RejillaProps } from './rejilla.ts';
import { usarMantenerPulsado } from '../ganchos/usarMantenerPulsado.ts';

/**
 * La rejilla del Panel · Manifiesto 6, «el Panel de cada uno».
 *
 * «Una rejilla de widgets que cada uno coloca a su gusto, **arrastrando**.»
 *
 * ── Lo que pidió Richi, y cómo lo hacen los que lo hacen bien ────────────────
 *
 * «Mejorar el editar: que se puedan mantener pulsados, que vibren como en Apple y
 * que se arrastren mejor que las flechas. Y quitar los cuadrados vacíos.» Es la
 * pantalla de inicio del iPhone, y la copia se hace entera porque cada pieza tiene
 * su razón (decisión 0039):
 *
 *   · **Mantener pulsado** cualquier widget entra en edición. El botón «Editar»
 *     sigue ahí, porque un gesto que no se ve no lo descubre nadie.
 *   · **Temblar** dice, sin leer nada, que el Panel está en otro modo.
 *   · **Arrastrar desde cualquier parte**, y los demás **se apartan con
 *     movimiento**. Antes saltaban de golpe al pasar el dedo, y no se sabía dónde
 *     iba a caer el widget hasta soltarlo.
 *   · **Lo vacío se aparta.** Un widget sin nada que decir no ocupa un cuadrado:
 *     sale nombrado en una línea debajo, y vuelve solo en cuanto hay algo.
 *
 * ── El arrastre, con librería, y por qué ahora sí ───────────────────────────
 *
 * Hasta M7 se hizo a mano con `elementFromPoint`, y la 0007 lo defendía: se movía
 * el orden de una lista y no hacía falta más. Lo que no daba era **lo que falta**:
 * que los demás se aparten animados, el retraso que distingue arrastrar de hacer
 * scroll en un móvil, el teclado con anuncios para un lector de pantalla, y
 * mezclar tamaños sin que el widget salte. Eso es exactamente lo que resuelve
 * `@dnd-kit`, que es la librería de arrastrar de referencia en React, accesible de
 * serie y sin dependencias. **Y solo se descarga al editar**: el Panel de todos
 * los días no la paga.
 */

const RejillaQueSeEdita = lazy(() => import('./RejillaQueSeEdita.tsx'));

export function Rejilla(props: RejillaProps) {
  const { puestos, editando, alEditar, alAnadir, guardando = false, nombreDe } = props;
  const [vacios, setVacios] = useState<ReadonlySet<string>>(() => new Set());

  const avisarDeVacio = useCallback((id: string, vacio: boolean) => {
    setVacios((antes) => {
      if (antes.has(id) === vacio) return antes;
      const despues = new Set(antes);
      if (vacio) despues.add(id);
      else despues.delete(id);
      return despues;
    });
  }, []);

  // Salir de la edición con `Esc`, que es lo que hace todo lo demás en Estook:
  // «Esc cierra hoja o panel» (B5), y esto es lo mismo.
  useEffect(() => {
    if (!editando) return;
    const alEscapar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') alEditar(false);
    };
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('keydown', alEscapar);
    };
  }, [editando, alEditar]);

  const mantener = usarMantenerPulsado(() => {
    alEditar(true);
  }, !editando);

  const apartados = puestos.filter((p) => vacios.has(p.id));

  return (
    <div className="flex flex-col gap-e3">
      <div className="flex flex-wrap items-center justify-between gap-e2">
        <p className="text-etiqueta uppercase tracking-wide text-texto-suave">
          {editando ? 'Arrastra para ordenar' : 'Tu panel'}
          {guardando && <span className="ml-e2 normal-case tracking-normal">guardando…</span>}
        </p>

        <div className="flex items-center gap-e2">
          {editando && (
            <button
              type="button"
              onClick={alAnadir}
              className="inline-flex min-h-toque items-center gap-e1 rounded-redondo border border-borde-fuerte bg-superficie px-e3 text-secundario font-medium hover:bg-fondo"
            >
              <IconoAnadir size={16} />
              Añadir
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              alEditar(!editando);
            }}
            className={clases(
              'inline-flex min-h-toque items-center gap-e1 rounded-redondo px-e3 text-secundario font-medium',
              editando
                ? 'bg-charcoal text-superficie'
                : 'border border-borde-fuerte bg-superficie hover:bg-fondo',
            )}
          >
            {editando ? <IconoHecho size={16} /> : <IconoRejilla size={16} />}
            {editando ? 'Listo' : 'Editar'}
          </button>
        </div>
      </div>

      {editando ? (
        // Mientras llega la librería se pinta la misma rejilla, ya temblando: no
        // hay un «cargando» entre pulsar y ver el Panel en edición.
        <Suspense
          fallback={<RejillaQuieta {...props} vacios={vacios} avisarDeVacio={avisarDeVacio} />}
        >
          <RejillaQueSeEdita {...props} vacios={vacios} avisarDeVacio={avisarDeVacio} />
        </Suspense>
      ) : (
        <div {...mantener} className="select-none [-webkit-touch-callout:none]">
          <RejillaQuieta {...props} vacios={vacios} avisarDeVacio={avisarDeVacio} />
        </div>
      )}

      {/*
        Lo que se ha apartado, dicho. Un widget que desaparece sin explicación es
        un widget que alguien cree haber perdido, y eso ya pasó en M7 con el
        catálogo. Aquí se nombra y se dice que vuelve.
      */}
      {!editando && apartados.length > 0 && (
        <p className="text-secundario text-texto-suave">
          Sin nada ahora en {enumerar(apartados.map((p) => nombreDe(p.id)))}. Vuelven en cuanto haya
          algo.
        </p>
      )}
    </div>
  );
}

/** La rejilla sin arrastre: la de todos los días, y la de mientras llega la librería. */
function RejillaQuieta({
  puestos,
  pintar,
  editando,
  alQuitar,
  alCambiarTamano,
  tamanosDe,
  nombreDe,
  alAnadir,
  vacios,
  avisarDeVacio,
}: RejillaConVacios) {
  return (
    <div className={CLASES_DE_LA_REJILLA}>
      {puestos.map((puesto, indice) => (
        <Casilla
          key={puesto.id}
          id={puesto.id}
          nombre={nombreDe(puesto.id)}
          tamano={puesto.tamano}
          tamanos={tamanosDe(puesto.id)}
          indice={indice}
          editando={editando}
          vacio={vacios.has(puesto.id)}
          avisarDeVacio={avisarDeVacio}
          alQuitar={() => {
            alQuitar(puesto.id);
          }}
          alCambiarTamano={(tamano) => {
            alCambiarTamano(puesto.id, tamano);
          }}
        >
          {pintar(puesto)}
        </Casilla>
      ))}
      {editando && <HuecoDeAnadir alAnadir={alAnadir} />}
    </div>
  );
}
