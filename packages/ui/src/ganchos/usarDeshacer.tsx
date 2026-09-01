import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * El deshacer universal · Manifiesto y Partes B4 y B6 del Plan.
 *
 * «**Deshacer siempre**, diez segundos, en todo lo que no tenga consecuencia
 * legal» · «`Deshacer` (barra inferior de 10 segundos)» · «Deshacer: aparece
 * abajo y se va sola a los 10 s».
 *
 * ── Como esta pensado ────────────────────────────────────────────────────────
 *
 * Deshacer **no es un historial**. Es una sola accion, la ultima, durante diez
 * segundos. Un historial largo suena mejor y es peor: nadie se acuerda de que
 * hizo hace ocho pasos, y en cuanto hay red de por medio deshacer lo de hace
 * ocho pasos deja de ser posible sin inventarse un modelo entero de compensacion.
 *
 * Diez segundos es el arrepentimiento de verdad: acabo de darle y no queria.
 *
 * ── Lo que NO hace ───────────────────────────────────────────────────────────
 *
 * No revierte por su cuenta. Cada accion **trae su contraria escrita**, porque
 * solo quien la hizo sabe deshacerla: cambiar el idioma se deshace volviendo a
 * llamar al comando con el idioma de antes, y eso pasa por la API, con su clave
 * de idempotencia y su version. Aqui solo se guarda esa funcion y se llama.
 *
 * Y no se usa para nada con consecuencia legal: cerrar una jornada, publicar un
 * cuadrante o firmar un APPCC no se deshacen con una barra que se va sola. Eso
 * se corrige con un asiento nuevo que deja rastro.
 */
export interface AccionQueSePuedeDeshacer {
  /** Que se acaba de hacer, en pasado y en una frase: «Idioma cambiado a ingles». */
  readonly que: string;
  /** Como se deshace. Puede tardar: se espera y se avisa si falla. */
  readonly deshacer: () => void | Promise<void>;
}

interface Pendiente extends AccionQueSePuedeDeshacer {
  readonly id: number;
}

interface Contexto {
  /** Apunta una accion como deshacible. Sustituye a la anterior, si la habia. */
  readonly sePuedeDeshacer: (accion: AccionQueSePuedeDeshacer) => void;
  readonly pendiente: Pendiente | null;
  readonly deshacer: () => void;
  readonly olvidar: () => void;
  /** Si algo fallo al deshacer, para poder decirlo. */
  readonly fallo: string | null;
}

/** Los diez segundos del Plan. Se exporta para que la prueba no los adivine. */
export const SEGUNDOS_PARA_DESHACER = 10;

const DeshacerContexto = createContext<Contexto | null>(null);

export function ProveedorDeDeshacer({ children }: { readonly children: ReactNode }) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
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
        setFallo(`No se ha podido deshacer «${laAccion.que}». Compruebalo antes de seguir.`);
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
    () => ({ sePuedeDeshacer, pendiente, deshacer, olvidar, fallo }),
    [sePuedeDeshacer, pendiente, deshacer, olvidar, fallo],
  );

  return <DeshacerContexto.Provider value={valor}>{children}</DeshacerContexto.Provider>;
}

export function usarDeshacer(): Contexto {
  const contexto = useContext(DeshacerContexto);
  if (!contexto) {
    throw new Error(
      'usarDeshacer() necesita estar dentro de <ProveedorDeDeshacer>. Se pone una sola vez, en la raiz de la aplicacion.',
    );
  }
  return contexto;
}
