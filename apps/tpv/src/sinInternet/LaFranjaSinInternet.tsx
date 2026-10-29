import { useEffect, useState, useSyncExternalStore } from 'react';
import { Boton, Hoja } from '@estook/ui';
import { laHora } from '../logica/texto.ts';
import { escucharLaCola, laCola, loQueEspera, quitarDeLaCola, seEnsena } from './laCola.ts';
import {
  avisarDeLaVuelta,
  escucharLaConexion,
  estamosSinInternet,
  laVuelta,
} from './laConexion.ts';

/**
 * **Lo que se ve sin internet** (T5 · 2 · 1; Anexo 10.9, maquetas de T5 · 2), siempre con texto:
 *
 *   · sin conexión, en ámbar: «Sin conexión. Se guarda aquí: la cocina aún no lo recibe ·
 *     3 por subir», y «Ver» abre lo que espera
 *   · al volver, una vez, en azul: «Conexión recuperada · 12 cosas subidas, ninguna repetida»
 *   · lo que Estook no aceptó al subir, en ámbar, hasta que alguien lo mira
 */
const LA_VUELTA_SE_VE_MS = 8_000;

function cosas(cuantas: number): string {
  return cuantas === 1 ? '1 cosa' : `${String(cuantas)} cosas`;
}

export function LaFranjaSinInternet({
  enLaMesa = false,
}: {
  /** En la mesa va abajo, encima de «Mandar»: sin márgenes propios. */
  readonly enLaMesa?: boolean;
}) {
  const cola = useSyncExternalStore(escucharLaCola, laCola);
  const sinInternet = useSyncExternalStore(escucharLaConexion, estamosSinInternet);
  const vuelta = useSyncExternalStore(escucharLaConexion, laVuelta);
  const [viendo, setViendo] = useState(false);

  useEffect(() => {
    if (vuelta === null) return undefined;
    const reloj = window.setTimeout(() => {
      avisarDeLaVuelta(null);
    }, LA_VUELTA_SE_VE_MS);
    return () => {
      window.clearTimeout(reloj);
    };
  }, [vuelta]);

  const visibles = cola.filter(seEnsena);
  const esperan = loQueEspera(visibles).length;
  const fallidas = visibles.length - esperan;

  let franja: { readonly tono: 'ambar' | 'azul'; readonly texto: string } | null = null;
  if (sinInternet) {
    franja = {
      tono: 'ambar',
      texto: `Sin conexión. Se guarda aquí: la cocina aún no lo recibe${esperan > 0 ? ` · ${String(esperan)} por subir` : ''}`,
    };
  } else if (vuelta !== null && vuelta.subidas > 0) {
    franja = {
      tono: vuelta.fallidas > 0 ? 'ambar' : 'azul',
      texto:
        vuelta.fallidas > 0
          ? `Conexión recuperada · ${cosas(vuelta.subidas)} subidas · ${cosas(vuelta.fallidas)} hay que mirarla`
          : `Conexión recuperada · ${cosas(vuelta.subidas)} subidas, ninguna repetida`,
    };
  } else if (fallidas > 0) {
    franja = { tono: 'ambar', texto: `${cosas(fallidas)} sin subir: hay que mirarlo` };
  } else if (esperan > 0) {
    franja = { tono: 'azul', texto: `Subiendo lo guardado · ${String(esperan)} por subir` };
  }

  return (
    <>
      {franja !== null && (
        <div className={enLaMesa ? '' : 'px-e4 pt-e3 md:px-e5'}>
          <div
            role="status"
            className={`flex flex-wrap items-center gap-e3 rounded-grande py-e2 pl-e4 pr-e2 font-bold ${
              franja.tono === 'ambar'
                ? 'bg-atencion-suave text-atencion'
                : 'bg-info-suave text-info'
            }`}
          >
            <span className="flex-1">{franja.texto}</span>
            {visibles.length > 0 && (
              <Boton
                tono="secundario"
                onClick={() => {
                  setViendo(true);
                }}
              >
                Ver
              </Boton>
            )}
          </div>
        </div>
      )}
      {viendo && (
        <Hoja
          abierta
          titulo={`Por subir · ${cosas(visibles.length)}`}
          alCerrar={() => {
            setViendo(false);
          }}
        >
          <ul className="flex flex-col">
            {visibles.map((cosa) => (
              <li
                key={cosa.id}
                className="flex flex-wrap items-center gap-e3 border-b border-borde py-e3 last:border-b-0"
              >
                <span className="flex min-w-[12rem] flex-1 flex-col">
                  <span className="font-bold">{cosa.que}</span>
                  <span className="text-secundario text-texto-suave">
                    {cosa.fallo ?? cosa.quien.nombre}
                  </span>
                </span>
                <span className="text-secundario tabular-nums text-texto-suave">
                  {laHora(new Date(cosa.hechoEn).toISOString())}
                </span>
                {cosa.fallo === undefined ? (
                  <span className="text-secundario font-bold text-atencion">En este aparato</span>
                ) : (
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      quitarDeLaCola(cosa.id);
                    }}
                  >
                    Ya está mirado
                  </Boton>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-e4 text-secundario text-texto-suave">
            Sube solo al volver internet, en orden y una sola vez. No hace falta hacer nada.
          </p>
        </Hoja>
      )}
    </>
  );
}
