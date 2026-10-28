import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
 * antes de coger su aparato, y al irse. Primero quién es y cómo está —«Hola, Ana ·
 * ¿Fichar la entrada?»—; después, solo los botones que le tocan. Al acabar, «✓ Ana ·
 * entrada a las 12:02».
 *
 * **Es el mismo con la caja abierta** (Richi, 28-oct): el «Fichar» de arriba **pide el PIN a
 * todos**, porque en el ordenador de la caja ficha cualquiera, y no ficha a quien la tiene
 * abierta. Si el PIN es el suyo, `alSerQuienEstaDentro` lo lleva a lo suyo: su salida
 * cierra también su sesión.
 *
 * **Una salida por error no rompe nada**: si vuelve y ficha la entrada el mismo día, es otro
 * tramo de la misma jornada (la jornada partida de siempre, desde M4).
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
  cabecera,
  alSerQuienEstaDentro,
  aviso,
}: {
  readonly llave: string;
  /** Con lo que se fichó, para decirlo en la pantalla del PIN; nulo si se volvió sin fichar. */
  readonly alAcabar: (hecho: string | null) => void;
  /** Con la caja abierta, la barra de arriba. */
  readonly cabecera?: ReactNode;
  /**
   * Con la caja abierta: si el PIN es de quien la tiene abierta, devuelve verdadero y se
   * encarga él (sus mesas, y cerrar su sesión al irse).
   */
  readonly alSerQuienEstaDentro?: (fichaje: ElFichaje) => boolean;
  /** «✓ Ana · entrada a las 12:02», del que acaba de fichar, mientras teclea el siguiente. */
  readonly aviso?: string | null;
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
      if (alSerQuienEstaDentro?.(respuesta.datos) === true) return;
      setQuien({ pin: elPin, fichaje: respuesta.datos });
    },
    [cliente, llave, alSerQuienEstaDentro],
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

  const cuerpo = (
    <main
      className={`flex items-center justify-center bg-fondo p-e5 text-texto ${cabecera === undefined ? 'min-h-pantalla' : 'flex-1'}`}
    >
      <section className="flex w-full max-w-[28rem] flex-col items-center gap-e5">
        {quien === null ? (
          <>
            {aviso !== undefined && aviso !== null && (
              <p
                role="status"
                className="rounded-redondo bg-bien-suave px-e4 py-e2 font-semibold text-bien"
              >
                {aviso}
              </p>
            )}
            <span className="text-pantalla font-bold">Fichar · teclea tu PIN</span>
            <Puntos tecleadas={pin.length} de={CIFRAS_DEL_PIN} />
            {error !== null && <ErrorEnCristiano error={error} />}
            <Teclado alTeclear={teclear} alBorrar={borrar} ocupado={ocupado} />
          </>
        ) : (
          <div className="flex w-full flex-col gap-e4">
            <span className="text-pantalla font-bold">
              Hola, {quien.fichaje.nombre}
              <br />
              <span className="text-seccion text-texto-suave">
                {quien.fichaje.estado === 'dentro'
                  ? `Estás dentro desde las ${laHora(quien.fichaje.desde)}`
                  : quien.fichaje.estado === 'en_pausa'
                    ? `Estás en la pausa desde las ${laHora(quien.fichaje.desde)}`
                    : '¿Fichar la entrada?'}
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
                Sí, fichar la entrada
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
            if (quien === null) {
              alAcabar(null);
              return;
            }
            // «No»: no ficha, y vuelve al teclado para el siguiente.
            setQuien(null);
            setError(null);
          }}
          className="min-h-toque text-secundario font-semibold text-texto-tenue"
        >
          {quien === null ? 'Volver' : 'No, volver'}
        </button>
      </section>
    </main>
  );

  if (cabecera === undefined) return cuerpo;
  return (
    <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
      {cabecera}
      {cuerpo}
    </div>
  );
}

/** «12:02», la hora del aparato; vacía si no hay. */
function laHora(cuando: string | null): string {
  if (cuando === null) return '';
  return new Date(cuando).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
