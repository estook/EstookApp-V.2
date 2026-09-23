import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DeshacerContexto,
  type AccionQueSePuedeDeshacer,
  SEGUNDOS_PARA_DESHACER,
  type Contexto,
  type FalloQueHayQueDecir,
  type Pendiente,
} from '../ganchos/usarDeshacer.tsx';

/** El deshacer universal: cómo está pensado, en `ganchos/usarDeshacer.tsx`. */
export function ProveedorDeDeshacer({ children }: { readonly children: ReactNode }) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [fallo, setFallo] = useState<FalloQueHayQueDecir | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siguienteId = useRef(0);

  const parar = useCallback(() => {
    if (reloj.current !== null) clearTimeout(reloj.current);
    reloj.current = null;
  }, []);

  const olvidar = useCallback(() => {
    parar();
    setPendiente(null);
    setFallo(null);
  }, [parar]);

  const sePuedeDeshacer = useCallback(
    (accion: AccionQueSePuedeDeshacer) => {
      parar();
      setFallo(null);
      siguienteId.current += 1;
      setPendiente({ ...accion, id: siguienteId.current });

      reloj.current = setTimeout(() => {
        // Se acabo el plazo. Lo hecho, hecho esta.
        setPendiente(null);
      }, SEGUNDOS_PARA_DESHACER * 1000);
    },
    [parar],
  );

  const deshacer = useCallback(() => {
    const laAccion = pendiente;
    if (!laAccion) return;

    parar();
    setPendiente(null);

    // Si deshacer falla (no hay red, alguien lo cambio antes), hay que decirlo:
    // callarselo dejaria a la persona creyendo que se deshizo.
    void (async () => {
      try {
        await laAccion.deshacer();
      } catch {
        setFallo({
          titulo: 'No se ha podido deshacer',
          texto: `No se ha podido deshacer «${laAccion.que}». Compruebalo antes de seguir.`,
        });
      }
    })();
  }, [pendiente, parar]);

  // Al desmontar, que no quede un temporizador suelto.
  useEffect(() => parar, [parar]);

  // «Ctrl+Z» de toda la vida. No se pisa el de un campo de texto: si el foco
  // esta escribiendo, deshacer es cosa del navegador, no nuestra.
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'z' || !(evento.ctrlKey || evento.metaKey) || evento.shiftKey) return;

      const donde = document.activeElement;
      const escribiendo =
        donde instanceof HTMLInputElement ||
        donde instanceof HTMLTextAreaElement ||
        (donde instanceof HTMLElement && donde.isContentEditable);
      if (escribiendo) return;

      if (!pendiente) return;
      evento.preventDefault();
      deshacer();
    };

    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [pendiente, deshacer]);

  const valor = useMemo<Contexto>(
    () => ({ sePuedeDeshacer, pendiente, deshacer, olvidar, fallo, avisarDeUnFallo: setFallo }),
    [sePuedeDeshacer, pendiente, deshacer, olvidar, fallo],
  );

  return <DeshacerContexto.Provider value={valor}>{children}</DeshacerContexto.Provider>;
}
