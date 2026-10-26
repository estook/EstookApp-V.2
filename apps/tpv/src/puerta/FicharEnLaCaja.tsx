import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { CIFRAS_DEL_PIN } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import { crearClienteDelTpv } from '../datos/cliente.ts';
import type { ElFichaje } from '../datos/tipos.ts';
import { Puntos, Teclado } from './Teclado.tsx';
import { cifraDeLaTecla } from './teclas.ts';

/**
 * **«Fichar», el botón naranja de la caja** (0115; Richi, 25-oct): cada uno teclea su PIN y
 * ficha, **sin entrar en la caja**. Los cocineros y los camareros fichan aquí al llegar,
 * antes de coger su aparato, y al irse. Primero quién es y cómo está; después, solo los
 * botones que le tocan. Al acabar, «✓ Ana · entrada a las 12:02», y vuelve al PIN.
 */

type Que = 'entrada' | 'pausa' | 'vuelta' | 'salida';

const LO_QUE_SE_HIZO: Readonly<Record<Que, string>> = {
  entrada: 'entrada',
  pausa: 'pausa',
  vuelta: 'de vuelta de la pausa',
  salida: 'salida fichada',
};

export function FicharEnLaCaja({
  llave,
  alAcabar,
}: {
  readonly llave: string;
  /** Con lo que se fichó, para decirlo en la pantalla del PIN; nulo si se volvió sin fichar. */
  readonly alAcabar: (hecho: string | null) => void;
}) {
  const cliente = useMemo(() => crearClienteDelTpv({ token: () => null }), []);
  const [pin, setPin] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [quien, setQuien] = useState<{ readonly pin: string; readonly fichaje: ElFichaje } | null>(
    null,
  );

  const mirar = useCallback(
    async (elPin: string) => {
      setOcupado(true);
      setError(null);
      const respuesta = await cliente.ejecutar<ElFichaje>('quien_ficha_en_la_caja', {
        llave,
        pin: elPin,
      });
      setOcupado(false);
      setPin('');
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      setQuien({ pin: elPin, fichaje: respuesta.datos });
    },
    [cliente, llave],
  );

  const fichar = useCallback(
    async (que: Que) => {
      if (quien === null) return;
      setOcupado(true);
      setError(null);
      const respuesta = await cliente.ejecutar<ElFichaje>('fichar_en_la_caja', {
        llave,
        pin: quien.pin,
        que,
      });
      setOcupado(false);
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      // La hora, la del servidor: la de la entrada o la de la pausa que acaba de empezar.
      const desde = que === 'entrada' || que === 'pausa' ? respuesta.datos.desde : null;
      const hora =
        desde === null
          ? ''
          : ` a las ${new Date(desde).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      alAcabar(`✓ ${quien.fichaje.nombre} · ${LO_QUE_SE_HIZO[que]}${hora}`);
    },
    [cliente, llave, quien, alAcabar],
  );

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

  // Con la última cifra, mira quién es: sin botón de «Seguir».
  useEffect(() => {
    if (pin.length === CIFRAS_DEL_PIN && !ocupado) void mirar(pin);
  }, [pin, ocupado, mirar]);

  useEffect(() => {
    if (quien !== null) return undefined;
    const alPulsar = (evento: KeyboardEvent) => {
      const tecla = cifraDeLaTecla(evento);
      if (tecla === 'borrar') borrar();
      else if (tecla !== null) teclear(tecla);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [teclear, borrar, quien]);

  const boton =
    'min-h-toque-cocina rounded-grande px-e5 text-seccion font-bold disabled:opacity-60';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo p-e5 text-texto">
      <section className="flex w-full max-w-[28rem] flex-col items-center gap-e5">
        {quien === null ? (
          <>
            <span className="text-pantalla font-bold">Fichar · teclea tu PIN</span>
            <Puntos tecleadas={pin.length} de={CIFRAS_DEL_PIN} />
            {error !== null && <ErrorEnCristiano error={error} />}
            <Teclado alTeclear={teclear} alBorrar={borrar} ocupado={ocupado} />
          </>
        ) : (
          <div className="flex w-full flex-col gap-e4">
            <span className="text-pantalla font-bold">
              {quien.fichaje.nombre}
              <br />
              <span className="text-seccion text-texto-suave">
                {quien.fichaje.estado === 'dentro'
                  ? 'Estás dentro'
                  : quien.fichaje.estado === 'en_pausa'
                    ? 'Estás en la pausa'
                    : 'No has fichado la entrada'}
              </span>
            </span>
            {error !== null && <ErrorEnCristiano error={error} />}
            {quien.fichaje.estado === 'fuera' && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void fichar('entrada')}
                className={`${boton} bg-naranja text-sobre-naranja`}
              >
                Fichar la entrada
              </button>
            )}
            {quien.fichaje.estado === 'en_pausa' && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void fichar('vuelta')}
                className={`${boton} bg-naranja text-sobre-naranja`}
              >
                Volver de la pausa
              </button>
            )}
            {quien.fichaje.estado === 'dentro' && quien.fichaje.pausasEnUso && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void fichar('pausa')}
                className={`${boton} bg-charcoal text-texto`}
              >
                Empezar la pausa
              </button>
            )}
            {quien.fichaje.estado === 'dentro' && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void fichar('salida')}
                className={`${boton} bg-naranja text-sobre-naranja`}
              >
                Fichar la salida
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            alAcabar(null);
          }}
          className="min-h-toque text-secundario font-semibold text-texto-tenue"
        >
          Volver
        </button>
      </section>
    </main>
  );
}
