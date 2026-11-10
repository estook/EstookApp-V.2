import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { CIFRAS_DEL_PIN, tokenDelAparato } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import { crearClienteDelTpv } from '../datos/cliente.ts';
import type { Dentro, DentroDelTpv, ElAparatoPorDentro } from '../datos/tipos.ts';
import { escucharLaConexion, estamosSinInternet } from '../sinInternet/laConexion.ts';
import {
  apuntarQuienEntro,
  guardarSuYo,
  quienEsSinInternet,
} from '../sinInternet/quienEntroHoy.ts';
import {
  elPinPorLaCaja,
  escucharLaCaja,
  ficharPorLaCaja,
  hayCaja,
  llegamosALaCaja,
  type QuienEsParaLaCaja,
} from '../sinInternet/laCaja.ts';
import {
  elYoQueDaLaCaja,
  guardarElFichaje,
  guardarLaEntrada,
  porQueNoEntra,
} from '../sinInternet/porLaCaja.ts';
import { Puntos, Teclado } from './Teclado.tsx';
import { cifraDeLaTecla } from './teclas.ts';
import { OlvideMiPin } from './OlvideMiPin.tsx';
import { FicharEnLaCaja } from './FicharEnLaCaja.tsx';
import { ElAvisoDeWindows } from '../sinInternet/ElAvisoDeWindows.tsx';

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
 * volver, delante de lo que haga. **Y si el aparato llega a la caja** (T5 · 2 · 2 · 2, 0124),
 * entra cualquiera del local: el PIN lo mira la caja (maqueta de T5 · 2, sección 1). En la caja,
 * quien no ha fichado ficha ahí mismo; en un comandero, se le dice que fiche en la caja. A los
 * demás, que no se puede comprobar su PIN, sin decir nunca de quién era.
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
    /** Sin internet, lo que dijo la caja de esta persona (0124). */
    readonly porLaCaja?: QuienEsParaLaCaja;
  } | null>(null);
  const [olvidado, setOlvidado] = useState(false);
  const [fichando, setFichando] = useState(false);
  /** «Abrir caja» o «Cerrar caja» tocado (0144): quien teclee su PIN entra directo a hacerlo. */
  const [paraLaCaja, setParaLaCaja] = useState(false);
  // Al llegar a la puerta nadie ha tocado la caja todavía: una dirección de la caja que quedara de
  // antes (un bloqueo, una recarga) no manda a abrirla ni a cerrarla a quien entra después.
  useEffect(() => {
    if (window.location.hash.startsWith('#/caja/')) window.location.hash = '/';
  }, []);
  const [hecho, setHecho] = useState<string | null>(null);
  /** Sin internet, un PIN que no se puede comprobar aquí: lo que se le dice. */
  const [noSePuedeSinInternet, setNoSePuedeSinInternet] = useState<{
    readonly titulo: string;
    readonly frase: string;
  } | null>(null);
  const sinInternet = useSyncExternalStore(escucharLaConexion, estamosSinInternet);
  useSyncExternalStore(escucharLaCaja, llegamosALaCaja);
  const porLaCaja = sinInternet && hayCaja() && llegamosALaCaja() !== false;
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

  /** Por la caja: entra con lo que dijo ella, y su PIN cifrado sube al volver (0124). */
  const entrarPorLaCaja = useCallback(
    async (elPin: string, quien: QuienEsParaLaCaja, clave: string) => {
      const yo = elYoQueDaLaCaja(aparato, quien);
      const id = await guardarLaEntrada(llave, clave, elPin, quien.persona);
      const dentro: DentroDelTpv = {
        turno: '',
        persona: quien.persona,
        fichaje: quien.fichaje,
        caeEn: 'mesas',
      };
      // Y queda como quien entró hoy aquí: si luego no llega a la caja, vuelve a entrar igual.
      void apuntarQuienEntro(elPin, dentro).then(() => {
        guardarSuYo(yo);
      });
      alEntrar({ ...dentro, sinInternet: id, yo });
    },
    [aparato, llave, alEntrar],
  );

  /**
   * Sin internet: quien entró hoy aquí entra con lo guardado; si no, se pregunta a la caja. Su
   * PIN cifrado sube al volver, delante de lo que haga.
   */
  const entrarSinInternet = useCallback(
    async (elPin: string) => {
      const clave = aparato.clavePublica ?? null;
      const esDeOtro = (id: string) => aparato.dueno !== null && aparato.dueno.id !== id;
      if (clave === null) {
        setNoSePuedeSinInternet(porQueNoEntra('sin_caja'));
        return;
      }
      const quien = await quienEsSinInternet(elPin);
      if (quien !== null && quien.yo !== null && !esDeOtro(quien.persona.id)) {
        const id = await guardarLaEntrada(llave, clave, elPin, quien.persona);
        alEntrar({
          turno: '',
          persona: quien.persona,
          fichaje: quien.fichaje,
          caeEn: 'mesas',
          sinInternet: id,
          yo: quien.yo,
        });
        return;
      }
      if (!hayCaja()) {
        setNoSePuedeSinInternet(porQueNoEntra('sin_caja'));
        return;
      }
      const dice = await elPinPorLaCaja(elPin);
      if (!dice.ok) {
        setNoSePuedeSinInternet(porQueNoEntra(dice.porque));
        return;
      }
      if (esDeOtro(dice.persona.id)) {
        setNoSePuedeSinInternet({
          titulo: `Este móvil es de ${aparato.dueno?.nombre ?? 'otra persona'}.`,
          frase: 'Solo entra su PIN.',
        });
        return;
      }
      if (dice.fichaje === 'fuera') {
        setSinFichar({
          pin: elPin,
          nombre: dice.persona.nombre,
          dentro: null,
          enLaCaja,
          porLaCaja: dice,
        });
        return;
      }
      await entrarPorLaCaja(elPin, dice, clave);
    },
    [aparato, llave, alEntrar, enLaCaja, entrarPorLaCaja],
  );

  /** En la caja, sin internet: «Fichar la entrada y entrar», con la caja comprobando el PIN. */
  const ficharYEntrarPorLaCaja = useCallback(
    async (elPin: string) => {
      const clave = aparato.clavePublica ?? null;
      if (clave === null) return;
      const fichado = await ficharPorLaCaja(elPin, 'entrada');
      if (!fichado.ok) {
        setSinFichar(null);
        setNoSePuedeSinInternet(porQueNoEntra(fichado.porque));
        return;
      }
      await guardarElFichaje(llave, clave, elPin, fichado.persona, 'entrada');
      await entrarPorLaCaja(elPin, fichado, clave);
    },
    [aparato, llave, entrarPorLaCaja],
  );

  const entrar = useCallback(
    async (elPin: string, ficharLaEntrada: boolean) => {
      setOcupado(true);
      setError(null);
      setNoSePuedeSinInternet(null);
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
        clavePublica={aparato.clavePublica ?? null}
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
                if (sinFichar.porLaCaja !== undefined) {
                  setOcupado(true);
                  await ficharYEntrarPorLaCaja(sinFichar.pin);
                  setOcupado(false);
                  return;
                }
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
          {(sinFichar.dentro !== null ||
            (sinFichar.porLaCaja !== undefined && !aparato.bloqueo.soloEntraQuienFicha)) && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                if (sinFichar.dentro !== null) alEntrar(sinFichar.dentro);
                else if (sinFichar.porLaCaja !== undefined && aparato.clavePublica != null) {
                  void entrarPorLaCaja(sinFichar.pin, sinFichar.porLaCaja, aparato.clavePublica);
                }
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
        {enLaCaja && <ElAvisoDeWindows enLaPuerta />}
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
            <div className="flex flex-wrap justify-end gap-e2">
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
              {/* La caja, al lado de Fichar (0142, 0144): verde para abrirla, ámbar para cerrarla.
                  Quien teclee su PIN entra directo a hacerlo; si no puede, lo aprueba un encargado. */}
              {aparato.cajaAbierta != null && (
                <button
                  type="button"
                  aria-pressed={paraLaCaja}
                  onClick={() => {
                    const ir = !paraLaCaja;
                    setParaLaCaja(ir);
                    setPin('');
                    window.location.hash = ir
                      ? `/caja/${aparato.cajaAbierta === true ? 'cerrar' : 'abrir'}`
                      : '/';
                  }}
                  className={`min-h-toque rounded-redondo px-e5 font-bold text-fondo ${
                    aparato.cajaAbierta ? 'bg-atencion' : 'bg-bien'
                  } ${paraLaCaja ? 'outline outline-2 outline-offset-2 outline-texto' : ''}`}
                >
                  {aparato.cajaAbierta ? 'Cerrar caja' : 'Abrir caja'}
                </button>
              )}
            </div>
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
          <span className="flex flex-col items-center gap-e1 text-center">
            <span className="text-pantalla font-bold">
              {paraLaCaja
                ? `${aparato.cajaAbierta === true ? 'Cerrar' : 'Abrir'} caja · tu PIN`
                : 'Teclea tu PIN'}
            </span>
            {paraLaCaja && (
              <span className="text-secundario text-texto-suave">
                De quien lleva la caja. Si no la llevas, lo aprueba un encargado.
              </span>
            )}
          </span>
        )}
        {porLaCaja && (
          <span className="rounded-redondo bg-info-suave px-e3 py-e1 text-secundario font-bold text-info">
            Por la caja
          </span>
        )}
        <Puntos tecleadas={pin.length} de={CIFRAS_DEL_PIN} />
        {error !== null && <ErrorEnCristiano error={error} />}
        {noSePuedeSinInternet !== null ? (
          <p
            role="alert"
            className="rounded-grande bg-atencion-suave p-e3 text-center text-atencion"
          >
            <b>{noSePuedeSinInternet.titulo}</b> {noSePuedeSinInternet.frase}
          </p>
        ) : (
          sinInternet && (
            <p role="status" className="text-center text-secundario font-semibold text-atencion">
              {porLaCaja
                ? 'Sin internet: el PIN lo mira la caja'
                : 'Sin conexión: entra quien ya entró hoy en este aparato.'}
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
