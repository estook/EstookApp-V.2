import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { CIFRAS_DEL_PIN } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import { Puntos, Teclado } from '../puerta/Teclado.tsx';
import { cifraDeLaTecla } from '../puerta/teclas.ts';

/** Lo que dura una aprobación pedida: dos minutos (Anexo 3.4). */
const DOS_MINUTOS = 120_000;

/**
 * **Lo aprueba un encargado** (maqueta 18; Anexo 3.4, Roles 1.12): el encargado teclea su
 * PIN **en este mismo aparato**, sin que salga quien lo pide. Sirve para esto y una sola
 * vez; si en dos minutos no lo aprueba nadie, se cancela y todo sigue como estaba. Quien
 * está dentro no cambia: lo que se haga queda a su nombre, con la aprobación al lado.
 */
export function LoApruebaUnEncargado({
  que,
  pide,
  motivo,
  alAprobar,
  alCancelar,
}: {
  readonly que: string;
  readonly pide: string;
  readonly motivo: string;
  /** Hace lo pedido con el PIN del encargado. Devuelve el fallo, o nulo si salió bien. */
  readonly alAprobar: (pin: string) => Promise<ErrorDeLaApi | null>;
  readonly alCancelar: () => void;
}) {
  const [pin, setPin] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const cancelar = useRef(alCancelar);
  cancelar.current = alCancelar;
  useEffect(() => {
    const caduca = window.setTimeout(() => {
      cancelar.current();
    }, DOS_MINUTOS);
    return () => {
      window.clearTimeout(caduca);
    };
  }, []);

  useEffect(() => {
    if (pin.length !== CIFRAS_DEL_PIN || ocupado) return;
    setOcupado(true);
    void alAprobar(pin).then((fallo) => {
      setOcupado(false);
      setPin('');
      setError(fallo);
    });
  }, [pin, ocupado, alAprobar]);

  const teclear = useCallback(
    (cifra: string) => {
      if (ocupado) return;
      setError(null);
      setPin((p) => (p.length >= CIFRAS_DEL_PIN ? p : `${p}${cifra}`));
    },
    [ocupado],
  );
  const borrar = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      const tecla = cifraDeLaTecla(evento);
      if (tecla === 'borrar') borrar();
      else if (tecla !== null) teclear(tecla);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [teclear, borrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/80 p-e4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lo aprueba un encargado"
        className="flex w-full max-w-[52rem] flex-col overflow-hidden rounded-mayor border border-borde bg-superficie md:flex-row"
      >
        <div className="flex flex-1 flex-col gap-e4 p-e5">
          <span className="self-start rounded-redondo bg-naranja px-e3 py-e1 text-secundario font-bold text-sobre-naranja">
            Lo aprueba un encargado
          </span>
          <span className="text-pantalla font-bold">{que}</span>
          <span className="text-cuerpo text-texto-suave">
            Lo pide <b className="text-texto">{pide}</b> · «{motivo}»
          </span>
          {error !== null && <ErrorEnCristiano error={error} />}
          <div className="flex-1" />
          <span className="text-secundario text-texto-tenue">
            El PIN sirve para esto y una sola vez. Si en 2 minutos no lo aprueba nadie, se cancela y
            el plato sigue en la cuenta.
          </span>
          <button
            type="button"
            onClick={alCancelar}
            className="min-h-toque self-start rounded-grande border-2 border-borde px-e5 font-bold"
          >
            No quitarlo
          </button>
        </div>
        <div className="flex flex-col items-center gap-e4 bg-fondo p-e5 md:w-[20rem]">
          <span className="text-seccion font-bold">PIN del encargado</span>
          <Puntos tecleadas={pin.length} de={CIFRAS_DEL_PIN} />
          <Teclado alTeclear={teclear} alBorrar={borrar} ocupado={ocupado} />
          <span className="text-center text-secundario text-texto-tenue">
            {pide} sigue dentro: el encargado no entra, solo aprueba
          </span>
        </div>
      </div>
    </div>
  );
}
