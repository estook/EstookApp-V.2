import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { cifrarElPin } from '@estook/cliente-api/pin-cifrado';
import { CIFRAS_DEL_PIN, tokenDelAparato } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import { crearClienteDelTpv } from '../datos/cliente.ts';
import type { Dentro, DentroDelTpv, ElAparatoPorDentro } from '../datos/tipos.ts';
import { anadirALaCola } from '../sinInternet/laCola.ts';
import { escucharLaConexion, estamosSinInternet } from '../sinInternet/laConexion.ts';
import { apuntarQuienEntro, quienEsSinInternet } from '../sinInternet/quienEntroHoy.ts';
import { Puntos, Teclado } from './Teclado.tsx';
import { cifraDeLaTecla } from './teclas.ts';
import { OlvideMiPin } from './OlvideMiPin.tsx';
import { FicharEnLaCaja } from './FicharEnLaCaja.tsx';

/**
 * **Teclea tu PIN, y ya está** (maquetas 3 y 22; Anexo 11.4): sin buscar antes la cara.
 * El PIN es único en el local, así que dice quién es. En el móvil de un camarero, «Hola,
 * Sara»: solo entra el suyo.
 *
 * Después del PIN, en la caja, a quien no ha fichado se le ofrece la entrada en un toque
 * (maqueta 19). Si el local pide fichar para usar el TPV, «Entrar sin fichar» no sale.
 * **En un comandero no se entra sin fichar** (0115): se ficha antes, en la caja o en Estook.
 *
 * **En la caja, «Fichar» en naranja arriba** (0115): cada uno ficha con su PIN sin entrar.
 *
 * **¿Has olvidado tu PIN?** (0109) manda un enlace al correo para sacar uno nuevo, sin
 * esperar al gerente.
 *
 * **Sin internet** (T5 · 2 · 1), entra quien ya entró hoy en este aparato: su PIN se comprueba
 * aquí con lo que se guardó al entrar, y se guarda cifrado para que Estook lo dé por bueno al
 * volver, delante de lo que haga. A los demás, que no se puede comprobar su PIN.
 */
export function ElPin({
  llave,
  aparato,
  antesDeEntrar,
  alEntrar,
  alDesvincularse,
}: {
  readonly llave: string;
  readonly aparato: ElAparatoPorDentro;
  /**
   * Antes de entrar, sube lo guardado: entrar echa a quien estaba, y lo suyo tiene que llegar
   * antes con su turno.
   */
  readonly antesDeEntrar: () => Promise<void>;
  readonly alEntrar: (dentro: Dentro) => void;
  /** Lo han desvinculado desde otro aparato: se dice en vez de enseñar un error. */
  readonly alDesvincularse: () => void;
}) {
  const cliente = useMemo(() => crearClienteDelTpv({ token: () => null }), []);
  const [pin, setPin] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  /** Después del PIN, sin fichar: el PIN se guarda solo para fichar y entrar. */
  const [sinFichar, setSinFichar] = useState<{
    readonly pin: string;
    readonly nombre: string;
    readonly dentro: DentroDelTpv | null;
    /** En un comandero no se ficha: se dice dónde, y nada más. */
    readonly enLaCaja: boolean;
  } | null>(null);
  const [olvidado, setOlvidado] = useState(false);
  const [fichando, setFichando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  /** Sin internet, un PIN que no se puede comprobar aquí. */
  const [noSePuedeSinInternet, setNoSePuedeSinInternet] = useState(false);
  const sinInternet = useSyncExternalStore(escucharLaConexion, estamosSinInternet);
  const enLaCaja = aparato.funcion === 'caja';
  // El reloj de la pantalla **solo se pinta**: la hora de lo que se hace la pone el servidor.
  const [reloj, setReloj] = useState(() => Date.now());

  useEffect(() => {
    const cada = window.setInterval(() => {
      setReloj(Date.now());
    }, 15_000);
    return () => {
      window.clearInterval(cada);
    };
  }, []);

  /** Sin internet: si es de quien entró hoy aquí, entra, y su PIN cifrado sube al volver. */
  const entrarSinInternet = useCallback(
    async (elPin: string) => {
      const quien = await quienEsSinInternet(elPin);
      const clave = aparato.clavePublica ?? null;
      if (
        quien?.yo === null ||
        quien === null ||
        clave === null ||
        (aparato.dueno !== null && aparato.dueno.id !== quien.persona.id)
      ) {
        setNoSePuedeSinInternet(true);
        return;
      }
      const id = crypto.randomUUID();
      anadirALaCola({
        id,
        nombre: 'entrar_con_pin',
        entrada: { llave, pin_cifrado: await cifrarElPin(clave, elPin) },
        hechoEn: Date.now(),
        quien: { id: quien.persona.id, nombre: quien.persona.nombre },
        con: { entrada: id },
        que: `${quien.persona.nombre} · entra sin internet`,
      });
      alEntrar({
        turno: '',
        persona: quien.persona,
        fichaje: quien.fichaje,
        caeEn: 'mesas',
        sinInternet: id,
        yo: quien.yo,
      });
    },
    [aparato, llave, alEntrar],
  );

  const entrar = useCallback(
    async (elPin: string, ficharLaEntrada: boolean) => {
      setOcupado(true);
      setError(null);
      setNoSePuedeSinInternet(false);
      await antesDeEntrar();
      const respuesta = await cliente.ejecutar<DentroDelTpv>('entrar_con_pin', {
        llave,
        pin: elPin,
        ...(ficharLaEntrada ? { fichar_la_entrada: true } : {}),
      });
      if (!respuesta.ok && respuesta.error.codigo === 'sin_conexion') {
        await entrarSinInternet(elPin);
        setOcupado(false);
        setPin('');
        return;
      }
      setOcupado(false);
      setPin('');
      if (respuesta.ok) {
        // Para que pueda volver a entrar sin internet en este aparato (T5 · 2 · 1).
        void apuntarQuienEntro(elPin, respuesta.datos);
        if (respuesta.datos.fichaje === 'fuera') {
          setSinFichar({
            pin: elPin,
            nombre: respuesta.datos.persona.nombre,
            dentro: respuesta.datos,
            enLaCaja: true,
          });
          return;
        }
        alEntrar(respuesta.datos);
        return;
      }
      if (respuesta.error.codigo === 'aparato_retirado') {
        alDesvincularse();
        return;
      }
      if (respuesta.error.codigo === 'falta_fichar') {
        const nombre = respuesta.error.detalle?.['nombre'];
        setSinFichar({
          pin: elPin,
          nombre: typeof nombre === 'string' ? nombre : '',
          dentro: null,
          enLaCaja: respuesta.error.detalle?.['enLaCaja'] !== false,
        });
        return;
      }
      setError(respuesta.error);
    },
    [cliente, llave, alEntrar, alDesvincularse, antesDeEntrar, entrarSinInternet],
  );

  const teclear = useCallback(
    (cifra: string) => {
      if (ocupado) return;
      setError(null);
      setPin((p) => (p.length >= CIFRAS_DEL_PIN ? p : `${p}${cifra}`));
    },
    [ocupado],
  );

  // Con la última cifra, entra solo: sin botón de «Entrar».
  useEffect(() => {
    if (pin.length === CIFRAS_DEL_PIN && !ocupado) void entrar(pin, false);
  }, [pin, ocupado, entrar]);
  const borrar = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  useEffect(() => {
    // Escribiendo el correo, las cifras van al campo y no al PIN; fichando, al de fichar.
    if (sinFichar !== null || olvidado || fichando) return undefined;
    const alPulsar = (evento: KeyboardEvent) => {
      const tecla = cifraDeLaTecla(evento);
      if (tecla === 'borrar') borrar();
      else if (tecla !== null) teclear(tecla);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [teclear, borrar, sinFichar, olvidado, fichando]);

  // «✓ Ana · entrada a las 12:02» se queda unos segundos y se va.
  useEffect(() => {
    if (hecho === null) return undefined;
    const fuera = window.setTimeout(() => {
      setHecho(null);
    }, 5_000);
    return () => {
      window.clearTimeout(fuera);
    };
  }, [hecho]);

  if (fichando) {
    return (
      <FicharEnLaCaja
        llave={llave}
        alAcabar={(loHecho) => {
          setFichando(false);
          setHecho(loHecho);
        }}
      />
    );
  }

  if (olvidado) {
    return (
      <OlvideMiPin
        llave={llave}
        alVolver={() => {
          setOlvidado(false);
          setError(null);
        }}
      />
    );
  }

  if (sinFichar !== null && !sinFichar.enLaCaja) {
    // **En un comandero no se entra sin fichar, ni se ficha** (0115).
    return (
      <main className="flex min-h-pantalla items-center justify-center bg-fondo p-e5 text-texto">
        <section className="flex w-full max-w-[32rem] flex-col gap-e4 rounded-mayor border-2 border-mal bg-superficie p-e6">
          <h1 className="text-cifra-media font-bold text-mal">Sin fichar</h1>
          <p className="text-seccion">
            {sinFichar.nombre === '' ? 'Ficha' : `${sinFichar.nombre}, ficha`} la entrada en la caja
            o en Estook con el móvil, y entra.
          </p>
          <button
            type="button"
            onClick={() => {
              setSinFichar(null);
              setError(null);
            }}
            className="min-h-toque rounded-grande border-2 border-borde text-cuerpo font-bold"
          >
            Volver
          </button>
        </section>
      </main>
    );
  }

  if (sinFichar !== null) {
    return (
      <main className="flex min-h-pantalla items-center justify-center bg-fondo p-e5 text-texto">
        <section className="flex w-full max-w-[32rem] flex-col gap-e4 rounded-mayor bg-superficie p-e6">
          <h1 className="text-cifra-media font-bold">
            Hola{sinFichar.nombre === '' ? '' : `, ${sinFichar.nombre}`}.
            <br />
            No has fichado la entrada.
          </h1>
          {error !== null && <ErrorEnCristiano error={error} />}
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              void (async () => {
                if (sinFichar.dentro === null) {
                  await entrar(sinFichar.pin, true);
                  return;
                }
                // Ya está dentro (el local deja entrar sin fichar): ficha con su turno.
                setOcupado(true);
                const turno = sinFichar.dentro.turno;
                const conTurno = crearClienteDelTpv({ token: () => tokenDelAparato(turno, llave) });
                const fichado = await conTurno.ejecutar('fichar_en_el_tpv', { que: 'entrada' });
                setOcupado(false);
                if (!fichado.ok) {
                  setError(fichado.error);
                  return;
                }
                alEntrar({ ...sinFichar.dentro, fichaje: 'dentro' });
              })();
            }}
            className="min-h-toque-cocina rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja disabled:opacity-60"
          >
            {ocupado ? 'Fichando…' : 'Fichar la entrada y entrar'}
          </button>
          {sinFichar.dentro !== null && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                if (sinFichar.dentro !== null) alEntrar(sinFichar.dentro);
              }}
              className="min-h-toque rounded-grande border-2 border-borde text-cuerpo font-bold"
            >
              Entrar sin fichar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSinFichar(null);
              setError(null);
            }}
            className="self-start text-secundario font-semibold text-texto-tenue"
          >
            No soy yo
          </button>
        </section>
      </main>
    );
  }

  const hora = new Date(reloj).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dia = new Date(reloj).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <main className="flex min-h-pantalla flex-col bg-fondo text-texto md:flex-row">
      <section className="flex flex-col gap-e4 p-e5 md:flex-1 md:p-e7">
        <div className="flex flex-col gap-e1">
          <span className="text-[4rem] font-bold leading-none tabular-nums max-md:text-cifra">
            {hora}
          </span>
          <span className="text-seccion text-texto-tenue">
            <span className="first-letter:uppercase">{dia}</span> · {aparato.nombre} ·{' '}
            {aparato.local.nombre}
          </span>
        </div>
        {aparato.dueno === null && aparato.fichados.length > 0 && (
          <div className="hidden flex-col gap-e3 md:flex">
            <span className="text-cuerpo font-bold text-texto-suave">Fichados ahora</span>
            <ul className="flex flex-wrap gap-e2">
              {aparato.fichados.map((f) => (
                <li
                  key={`${f.nombre}-${f.desde}`}
                  className="flex items-center gap-e2 rounded-redondo bg-superficie py-e1 pl-e1 pr-e4"
                >
                  <span className="flex size-9 items-center justify-center rounded-redondo bg-charcoal text-secundario font-bold">
                    {f.iniciales}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-bold">{f.nombre}</span>
                    <span className="text-secundario text-bien">
                      desde{' '}
                      {new Date(f.desde).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex-1" />
        <p className="hidden max-w-[32rem] text-secundario text-texto-tenue md:block">
          {aparato.dueno === null
            ? 'No hace falta tocar tu nombre: tu PIN ya dice quién eres. Se bloquea solo al rato sin tocarlo, y lo que estabas pidiendo se queda en la mesa, sin mandar.'
            : 'Se bloquea solo al rato sin tocarlo.'}
        </p>
      </section>
      <section className="flex flex-col items-center gap-e5 border-borde bg-superficie/40 p-e5 md:w-[28rem] md:border-l md:p-e7">
        {enLaCaja && (
          <div className="flex w-full flex-col items-end gap-e2">
            <button
              type="button"
              onClick={() => {
                setFichando(true);
                setHecho(null);
                setPin('');
              }}
              className="min-h-toque rounded-redondo bg-naranja px-e5 font-bold text-sobre-naranja"
            >
              Fichar
            </button>
            {hecho !== null && (
              <span
                role="status"
                className="self-stretch rounded-grande bg-bien-suave p-e3 text-center font-bold text-bien"
              >
                {hecho}
              </span>
            )}
          </div>
        )}
        {aparato.dueno !== null ? (
          <div className="flex flex-col items-center gap-e2 text-center">
            <span className="flex size-16 items-center justify-center rounded-redondo bg-charcoal text-pantalla font-bold">
              {aparato.dueno.nombre.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-pantalla font-bold">Hola, {aparato.dueno.nombre}</span>
            <span className="text-secundario text-texto-suave">
              Este móvil es tuyo: solo entra tu PIN.
            </span>
          </div>
        ) : (
          <span className="text-pantalla font-bold">Teclea tu PIN</span>
        )}
        <Puntos tecleadas={pin.length} de={CIFRAS_DEL_PIN} />
        {error !== null && <ErrorEnCristiano error={error} />}
        {noSePuedeSinInternet ? (
          <p
            role="alert"
            className="rounded-grande bg-atencion-suave p-e3 text-center text-atencion"
          >
            <b>Sin conexión no se puede comprobar ese PIN.</b> Aquí solo entra quien ya entró hoy en
            este aparato. Usa la caja o espera a que vuelva.
          </p>
        ) : (
          sinInternet && (
            <p role="status" className="text-center text-secundario font-semibold text-atencion">
              Sin conexión: entra quien ya entró hoy en este aparato.
            </p>
          )
        )}
        <div className="flex-1" />
        <Teclado alTeclear={teclear} alBorrar={borrar} ocupado={ocupado} />
        <button
          type="button"
          onClick={() => {
            setOlvidado(true);
            setPin('');
          }}
          className="min-h-toque text-secundario font-semibold text-texto-tenue"
        >
          ¿Has olvidado tu PIN?
        </button>
      </section>
    </main>
  );
}
