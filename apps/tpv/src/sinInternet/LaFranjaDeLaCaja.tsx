import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Boton, Hoja } from '@estook/ui';
import {
  elPermisoDeChrome,
  escucharLaCaja,
  hayCaja,
  probarLaCaja,
  vaConDatos,
  type ElPermiso,
} from './laCaja.ts';
import { escucharLaConexion, estamosSinInternet } from './laConexion.ts';

/**
 * **Prepararse antes de que falte internet** (T5 · 2 · 2, decisión 0123; maquetas de T5 · 2,
 * sección 3, y de T5 · 2 · 2, secciones 1 y 4). En el plano, con internet, una línea si este
 * aparato no llegaría a la caja de centro:
 *
 *   · **Chrome aún no ha dado permiso**: se explica en una línea y «Seguir» lo pide (el aviso
 *     es de Chrome; Estook no lo puede cambiar).
 *   · **Alguien tocó «Bloquear»**: Chrome no vuelve a preguntar, así que se dice cómo darlo.
 *   · **Va con datos móviles**: sin el wifi del local no llegaría a la caja. No se puede cerrar:
 *     el día que se vaya internet ya es tarde. Se quita sola al entrar en el wifi.
 *
 * Nada de esto para el servicio ni sale si el local no tiene la caja para Windows encendida.
 */
export function LaFranjaDeLaCaja() {
  const conCaja = useSyncExternalStore(escucharLaCaja, hayCaja);
  const sinInternet = useSyncExternalStore(escucharLaConexion, estamosSinInternet);
  const [permiso, setPermiso] = useState<ElPermiso | null>(null);
  const [conDatos, setConDatos] = useState(false);
  const [viendo, setViendo] = useState(false);

  const mirar = useCallback(() => {
    void elPermisoDeChrome().then(setPermiso);
    setConDatos(vaConDatos());
  }, []);

  useEffect(() => {
    if (!conCaja) return undefined;
    mirar();
    const conexion = (navigator as Navigator & { connection?: EventTarget }).connection;
    conexion?.addEventListener('change', mirar);
    window.addEventListener('focus', mirar);
    return () => {
      conexion?.removeEventListener('change', mirar);
      window.removeEventListener('focus', mirar);
    };
  }, [conCaja, mirar]);

  if (!conCaja || sinInternet || permiso === null) return null;

  let franja: {
    tono: 'azul' | 'ambar';
    texto: string;
    boton: string | null;
    alTocar: () => void;
  } | null = null;
  if (permiso === 'por_pedir') {
    franja = {
      tono: 'azul',
      texto:
        'Para que la cocina reciba aunque se vaya internet, deja que Estook TPV hable con la caja',
      boton: 'Seguir',
      // El primer «¿estás ahí?» a la caja es lo que hace que Chrome pregunte.
      alTocar: () => {
        void probarLaCaja().finally(mirar);
      },
    };
  } else if (permiso === 'bloqueado') {
    franja = {
      tono: 'ambar',
      texto: 'Chrome no deja hablar con la caja: sin internet, la cocina no recibiría',
      boton: 'Cómo arreglarlo',
      alTocar: () => {
        setViendo(true);
      },
    };
  } else if (conDatos) {
    franja = {
      tono: 'azul',
      texto:
        'Vas con datos. Conéctate al wifi del local para que la cocina reciba si se va internet',
      boton: null,
      alTocar: () => undefined,
    };
  }
  if (franja === null) return null;

  return (
    <>
      <div className="px-e4 pt-e3 md:px-e5">
        <div
          role="status"
          className={`flex flex-wrap items-center gap-e3 rounded-grande py-e2 pl-e4 pr-e2 font-bold ${
            franja.tono === 'ambar' ? 'bg-atencion-suave text-atencion' : 'bg-info-suave text-info'
          }`}
        >
          <span className="flex-1">{franja.texto}</span>
          {franja.boton !== null && (
            <Boton
              tono={franja.tono === 'azul' ? 'principal' : 'secundario'}
              onClick={franja.alTocar}
            >
              {franja.boton}
            </Boton>
          )}
        </div>
      </div>
      {viendo && (
        <Hoja
          abierta
          titulo="Dale el permiso de red local"
          alCerrar={() => {
            setViendo(false);
          }}
        >
          <ol className="flex list-decimal flex-col gap-e2 pl-e5">
            <li>
              En Chrome, toca <b>⋮</b> › <b>Configuración</b> › <b>Configuración de sitios</b>.
            </li>
            <li>
              Toca <b>Red local</b> y luego <b>estook.com</b>.
            </li>
            <li>
              Elige <b>Permitir</b> y vuelve a Estook TPV.
            </li>
          </ol>
        </Hoja>
      )}
    </>
  );
}
