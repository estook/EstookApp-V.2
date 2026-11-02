import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { CIFRAS_DEL_PIN } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import { crearClienteDelTpv } from '../datos/cliente.ts';
import type { ElFichaje } from '../datos/tipos.ts';
import { elPinPorLaCaja, ficharPorLaCaja, hayCaja } from '../sinInternet/laCaja.ts';
import { guardarElFichaje, porQueNoEntra } from '../sinInternet/porLaCaja.ts';
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
 *
 * **Sin internet, ficha igual** (T5 · 2 · 2 · 2, decisión 0124; Toast no deja): el PIN lo
 * comprueba la caja de centro, que dice al momento quién es, y lo fichado sube al volver con
 * el PIN cifrado, a la hora en que se fichó. Lo que Estook no pueda apuntar le llega a quien
 * lleva el equipo, como en el aparato de fichar (0070).
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
  clavePublica,
  alAcabar,
  cabecera,
  alSerQuienEstaDentro,
  aviso,
}: {
  readonly llave: string;
  /** La pública de la caja, con la que se cifra el PIN fichado sin internet (0070, 0124). */
  readonly clavePublica: string | null;
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
  const [quien, setQuien] = useState<{
    readonly pin: string;
    readonly fichaje: ElFichaje;
    /** Sin internet: lo dijo la caja de centro (0124). */
    readonly porLaCaja?: true;
  } | null>(null);
  /** Sin internet, lo que no se pudo hacer, dicho para quien lo lee. */
  const [sinRed, setSinRed] = useState<{ readonly titulo: string; readonly frase: string } | null>(
    null,
  );

  /** Sin internet: quién es lo dice la caja de centro. */
  const mirarPorLaCaja = useCallback(async (elPin: string) => {
    const dice = await elPinPorLaCaja(elPin);
    if (!dice.ok) {
      setSinRed(porQueNoEntra(dice.porque === 'no_llega' && !hayCaja() ? 'sin_caja' : dice.porque));
      return;
    }
    setQuien({
      pin: elPin,
      porLaCaja: true,
      fichaje: {
        personaId: dice.persona.id,
        nombre: dice.persona.nombre,
        estado: dice.fichaje,
        desde: dice.desde,
        minutosDeHoy: 0,
        pausasEnUso: dice.pausasEnUso,
      },
    });
  }, []);

  const mirar = useCallback(
    async (elPin: string) => {
      setOcupado(true);
      setError(null);
      setSinRed(null);
      const respuesta = await cliente.ejecutar<ElFichaje>('quien_ficha_en_la_caja', {
        llave,
        pin: elPin,
      });
      if (!respuesta.ok && respuesta.error.codigo === 'sin_conexion') {
        await mirarPorLaCaja(elPin);
        setOcupado(false);
        setPin('');
        return;
      }
      setOcupado(false);
      setPin('');
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      if (alSerQuienEstaDentro?.(respuesta.datos) === true) return;
      setQuien({ pin: elPin, fichaje: respuesta.datos });
    },
    [cliente, llave, alSerQuienEstaDentro, mirarPorLaCaja],
  );

  /** Sin internet: ficha la caja de centro, y sube al volver con el PIN cifrado. */
  const ficharPorLaCajaYGuardar = useCallback(
    async (elPin: string, nombre: string, que: Que) => {
      const dice = clavePublica === null ? null : await ficharPorLaCaja(elPin, que);
      if (dice === null || clavePublica === null || !dice.ok) {
        setQuien(null);
        setSinRed(porQueNoEntra(dice === null || dice.ok ? 'no_llega' : dice.porque));
        return;
      }
      await guardarElFichaje(llave, clavePublica, elPin, dice.persona, que);
      const desde = que === 'entrada' || que === 'pausa' ? dice.desde : null;
      const hora = desde === null ? '' : ` a las ${laHora(desde)}`;
      alAcabar(`✓ ${nombre} · ${LO_QUE_SE_HIZO[que]}${hora} · sube al volver internet`);
    },
    [clavePublica, llave, alAcabar],
  );

  const fichar = useCallback(
    async (que: Que) => {
      if (quien === null) return;
      setOcupado(true);
      setError(null);
      if (quien.porLaCaja === true) {
        await ficharPorLaCajaYGuardar(quien.pin, quien.fichaje.nombre, que);
        setOcupado(false);
        return;
      }
      const respuesta = await cliente.ejecutar<ElFichaje>('fichar_en_la_caja', {
        llave,
        pin: quien.pin,
        que,
      });
      if (!respuesta.ok && respuesta.error.codigo === 'sin_conexion') {
        // Se fue justo ahora: lo hace la caja, con el mismo PIN.
        await ficharPorLaCajaYGuardar(quien.pin, quien.fichaje.nombre, que);
        setOcupado(false);
        return;
      }
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
    [cliente, llave, quien, alAcabar, ficharPorLaCajaYGuardar],
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
            {sinRed !== null && (
              <p
                role="alert"
                className="rounded-grande bg-atencion-suave p-e3 text-center text-atencion"
              >
                <b>{sinRed.titulo}</b> {sinRed.frase}
              </p>
            )}
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
            {quien.porLaCaja === true && (
              <p role="status" className="text-secundario font-semibold text-atencion">
                Sin internet: lo apunta la caja y sube al volver.
              </p>
            )}
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
