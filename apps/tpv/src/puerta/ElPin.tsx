import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { escucharAlSegundo, haySegundo } from '@estook/cliente-api/al-segundo';
import { DONDE } from '../ganchos/usarLaSala.ts';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { CIFRAS_DEL_PIN, tokenDelAparato } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import {
  IconoCerrar,
  IconoCuenta,
  IconoDinero,
  IconoPersona,
  IconoReloj,
  type Icono,
} from '@estook/iconos';
import { ElSimbolo } from '../iconos.tsx';
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
import { eurosConSimbolo } from '../logica/texto.ts';

/**
 * **Teclea tu PIN, y ya está** (maquetas 3 y 22; Anexo 11.4): sin buscar antes la cara.
 * El PIN es único en el local, así que dice quién es. En el móvil de un camarero, «Hola,
 * Sara»: solo entra el suyo.
 *
 * Después del PIN, en la caja, a quien no ha fichado se le ofrece la entrada en un toque
 * (maqueta 19). Si el local pide fichar para usar el TPV, «Entrar sin fichar» no sale.
 * **En un comandero no se entra sin fichar** (0115): se ficha antes, en la caja o en Estook.
 *
 * **La puerta con botones** (el rediseño, 0148; Richi, 17-nov: «prefiero que haya botones y ocultar
 * el teclado»): **Entrar**, **Tickets** y **Abrir o cerrar caja**, grandes y con su color; al tocar
 * uno, el teclado sale en su mitad de la pantalla con lo que se va a hacer arriba. Fichar va dentro
 * de Entrar: quien no ha fichado ficha ahí mismo. Y sin textos que expliquen lo que ya se ve. En el
 * PC, teclear una cifra es tocar Entrar.
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
  /** **Fichar sin entrar** (0115): la entrada, la pausa o la salida, con el PIN y nada más. */
  const [fichando, setFichando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  /**
   * El botón tocado (0148): entrar, los tickets o la caja (0144). Quien teclee su PIN entra directo
   * a hacerlo; nulo, los botones.
   */
  const [intencion, setIntencion] = useState<Intencion | null>(null);
  /** Un cobro pendiente tocado (0145): quien teclee su PIN entra directo a cobrarlo, a su nombre. */
  const [paraCobrar, setParaCobrar] = useState<{
    readonly id: string;
    readonly titulo: string;
    readonly enEfectivo: number;
    readonly por: string;
  } | null>(null);
  // Al llegar a la puerta nadie ha tocado la caja todavía: una dirección de la caja que quedara de
  // antes (un bloqueo, una recarga) no manda a abrirla ni a cerrarla a quien entra después.
  useEffect(() => {
    if (window.location.hash.startsWith('#/caja/') || window.location.hash.startsWith('#/cobro/')) {
      window.location.hash = '/';
    }
  }, []);
  /** Sin internet, un PIN que no se puede comprobar aquí: lo que se le dice. */
  const [noSePuedeSinInternet, setNoSePuedeSinInternet] = useState<{
    readonly titulo: string;
    readonly frase: string;
  } | null>(null);
  const sinInternet = useSyncExternalStore(escucharLaConexion, estamosSinInternet);
  useSyncExternalStore(escucharLaCaja, llegamosALaCaja);
  const porLaCaja = sinInternet && hayCaja() && llegamosALaCaja() !== false;
  const enLaCaja = aparato.funcion === 'caja';
  // **La caja bloqueada se entera al momento** (0145): el camarero deja un cobro y va a la caja, que
  // no puede esperar al latido de cada minuto para enseñarlo. Con el toque de la sala, se vuelve a latir.
  const cache = useQueryClient();
  const tema = aparato.temaAlSegundo;
  useEffect(() => {
    if (!enLaCaja || !haySegundo(DONDE) || tema === null) return undefined;
    const escucha = escucharAlSegundo(
      DONDE,
      tema,
      (canal) => {
        if (canal.startsWith('servicio:'))
          void cache.invalidateQueries({ queryKey: ['latido', llave] });
      },
      () => undefined,
    );
    return () => {
      escucha.parar();
    };
  }, [enLaCaja, tema, cache, llave]);
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
      // En el PC, teclear sin tocar un botón es entrar.
      if (intencion === null && paraCobrar === null && aparato.dueno === null) {
        setIntencion('entrar');
        window.location.hash = '/';
      }
      setPin((p) => (p.length >= CIFRAS_DEL_PIN ? p : `${p}${cifra}`));
    },
    [ocupado, intencion, paraCobrar, aparato.dueno],
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
  const pendientes = enLaCaja ? (aparato.cobrosPendientes ?? []) : [];
  // El móvil de un camarero es suyo: solo entra él, y el teclado está siempre a la vista.
  const conTeclado = aparato.dueno !== null || intencion !== null || paraCobrar !== null;
  const volver = () => {
    setIntencion(null);
    setParaCobrar(null);
    setPin('');
    setError(null);
    setNoSePuedeSinInternet(null);
    window.location.hash = '/';
  };
  const elegir = (para: Intencion) => {
    setIntencion(para);
    setParaCobrar(null);
    setPin('');
    setError(null);
    window.location.hash = DONDE_ENTRA[para](aparato.cajaAbierta === true);
  };
  const laDeAhora: LoQueSeVaAHacer | null =
    paraCobrar !== null
      ? {
          titulo: `Cobrar ${paraCobrar.titulo}`,
          detalle: `${eurosConSimbolo(paraCobrar.enEfectivo)} en efectivo que dejó ${paraCobrar.por}. El cobro queda a tu nombre.`,
          icono: IconoDinero,
          color: 'bg-atencion-suave text-atencion',
        }
      : intencion !== null
        ? COMO_SE_VE_LA_INTENCION[intencion](aparato.cajaAbierta === true)
        : null;

  return (
    <main className="flex min-h-pantalla flex-col bg-fondo text-texto md:flex-row">
      <section
        className={[
          'flex flex-col gap-e5 p-e5 md:flex-1 md:p-e7',
          conTeclado ? 'max-md:hidden' : '',
        ].join(' ')}
      >
        {enLaCaja && <ElAvisoDeWindows enLaPuerta />}
        <div className="flex items-center gap-e3">
          <span className="flex size-12 items-center justify-center rounded-grande bg-texto text-fondo">
            <ElSimbolo lado={34} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-seccion font-bold">{aparato.local.nombre}</span>
            <span className="text-secundario font-semibold text-texto-tenue">{aparato.nombre}</span>
          </span>
        </div>
        <div className="flex flex-col gap-e1">
          <span className="text-[5.5rem] font-bold leading-none tracking-tight tabular-nums max-md:text-[4rem]">
            {hora}
          </span>
          <span className="text-seccion font-semibold text-texto-suave first-letter:uppercase">
            {dia}
          </span>
        </div>
        <div className="flex-1" />
        {aparato.dueno === null && aparato.fichados.length > 0 && (
          <div className="flex flex-col gap-e3 max-md:hidden">
            <span className="text-etiqueta font-bold uppercase tracking-[0.07em] text-texto-tenue">
              Fichados ahora
            </span>
            <ul className="flex flex-wrap gap-e2">
              {aparato.fichados.map((f) => (
                <li
                  key={`${f.nombre}-${f.desde}`}
                  className="flex items-center gap-e2 rounded-grande border border-borde bg-superficie py-e1 pl-e1 pr-e4"
                >
                  <span className="flex size-9 items-center justify-center rounded-medio bg-charcoal text-secundario font-bold">
                    {f.iniciales}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-bold">{f.nombre}</span>
                    <span className="text-secundario font-semibold text-bien">
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
        {(pendientes.length > 0 || (enLaCaja && aparato.cajaAbierta != null)) && (
          <div className="grid gap-e3 sm:grid-cols-2">
            {enLaCaja && aparato.cajaAbierta != null && (
              <div className="flex flex-col rounded-grande border border-borde bg-superficie p-e4">
                <span className="text-secundario font-semibold text-texto-tenue">La caja</span>
                <span
                  className={[
                    'text-pantalla font-bold',
                    aparato.cajaAbierta ? 'text-bien' : 'text-texto-suave',
                  ].join(' ')}
                >
                  {aparato.cajaAbierta ? 'Abierta' : 'Cerrada'}
                </span>
              </div>
            )}
            {/* **Los cobros en efectivo que esperan** (0145; Richi, 10-nov): los de todos, a la
                vista. Se toca uno, se teclea el PIN de quien cobra y se entra directo a cobrarlo. */}
            {pendientes.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={paraCobrar?.id === p.id}
                aria-label={`${p.titulo}: ${eurosConSimbolo(p.enEfectivo)} en efectivo que dejó ${p.por}`}
                onClick={() => {
                  setParaCobrar(p);
                  setIntencion(null);
                  setPin('');
                  window.location.hash = `/cobro/${p.id}`;
                }}
                className="flex flex-col rounded-grande bg-atencion-suave p-e4 text-left"
              >
                <span className="text-secundario font-bold text-atencion">Efectivo por cobrar</span>
                <span className="text-pantalla font-bold tabular-nums">
                  {eurosConSimbolo(p.enEfectivo)}
                </span>
                <span className="text-secundario text-texto-suave">
                  {p.titulo} · lo dejó {p.por}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="relative flex flex-1 flex-col gap-e4 border-borde bg-superficie p-e5 md:w-[34rem] md:flex-none md:border-l md:p-e7">
        {!conTeclado ? (
          <div className="flex flex-1 flex-col justify-center gap-e4">
            <BotonGrande
              icono={IconoPersona}
              titulo="Entrar"
              detalle="Con tu PIN. Si no has fichado, fichas aquí."
              color="bg-naranja text-sobre-naranja"
              alto="min-h-[9rem]"
              onClick={() => {
                elegir('entrar');
              }}
            />
            {hecho !== null && (
              <span
                role="status"
                className="rounded-grande bg-bien-suave p-e3 text-center font-bold text-bien"
              >
                {hecho}
              </span>
            )}
            <div className={`grid gap-e4 ${enLaCaja ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* **Fichar sin entrar** (0115), solo en la caja: la pausa y la salida en un toque. */}
              {enLaCaja && (
                <BotonGrande
                  icono={IconoReloj}
                  titulo="Fichar"
                  color="border border-borde bg-charcoal text-texto"
                  alto="min-h-[6rem]"
                  pequeno
                  onClick={() => {
                    setFichando(true);
                    setHecho(null);
                    setPin('');
                  }}
                />
              )}
              <BotonGrande
                icono={IconoCuenta}
                titulo="Tickets"
                color="border border-borde bg-charcoal text-texto"
                alto="min-h-[6rem]"
                pequeno
                onClick={() => {
                  elegir('tickets');
                }}
              />
              {enLaCaja && aparato.cajaAbierta != null && (
                <BotonGrande
                  icono={IconoDinero}
                  titulo={aparato.cajaAbierta ? 'Cerrar caja' : 'Abrir caja'}
                  color="border border-borde bg-charcoal text-texto"
                  alto="min-h-[6rem]"
                  pequeno
                  onClick={() => {
                    elegir('caja');
                  }}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setOlvidado(true);
                setPin('');
              }}
              className="min-h-toque self-center text-secundario font-semibold text-texto-tenue underline underline-offset-4"
            >
              ¿Has olvidado tu PIN?
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-e4 anima-sube">
            {aparato.dueno !== null ? (
              <div className="flex flex-col items-center gap-e2 text-center">
                <span className="flex size-16 items-center justify-center rounded-grande bg-charcoal text-pantalla font-bold">
                  {aparato.dueno.nombre.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-pantalla font-bold">Hola, {aparato.dueno.nombre}</span>
              </div>
            ) : (
              laDeAhora !== null && (
                <div className="flex w-full items-center gap-e3">
                  <span
                    aria-hidden
                    className={[
                      'flex size-12 shrink-0 items-center justify-center rounded-grande',
                      laDeAhora.color,
                    ].join(' ')}
                  >
                    <laDeAhora.icono size={24} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-pantalla font-bold">{laDeAhora.titulo}</span>
                    {laDeAhora.detalle !== null && (
                      <span className="text-secundario text-texto-suave">{laDeAhora.detalle}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={volver}
                    aria-label="Volver"
                    className="grid size-toque shrink-0 place-items-center rounded-grande border border-borde"
                  >
                    <IconoCerrar size={20} aria-hidden />
                  </button>
                </div>
              )
            )}
            <span className="mt-e3 text-cuerpo font-bold text-texto-suave">Teclea tu PIN</span>
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
                <p
                  role="status"
                  className="text-center text-secundario font-semibold text-atencion"
                >
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
              className="min-h-toque text-secundario font-semibold text-texto-tenue underline underline-offset-4"
            >
              ¿Has olvidado tu PIN?
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * **A qué se entra** (el rediseño, 0148): el botón tocado en la puerta. La dirección se pone antes
 * del PIN, y al entrar la aplicación va ahí.
 */
type Intencion = 'entrar' | 'tickets' | 'caja';

const DONDE_ENTRA: Readonly<Record<Intencion, (cajaAbierta: boolean) => string>> = {
  entrar: () => '/',
  tickets: () => '/facturas',
  caja: (abierta) => `/caja/${abierta ? 'cerrar' : 'abrir'}`,
};

interface LoQueSeVaAHacer {
  readonly titulo: string;
  readonly detalle: string | null;
  readonly icono: Icono;
  readonly color: string;
}

const COMO_SE_VE_LA_INTENCION: Readonly<
  Record<Intencion, (cajaAbierta: boolean) => LoQueSeVaAHacer>
> = {
  entrar: () => ({
    titulo: 'Entrar',
    detalle: null,
    icono: IconoPersona,
    color: 'bg-naranja text-sobre-naranja',
  }),
  tickets: () => ({
    titulo: 'Tickets',
    detalle: null,
    icono: IconoCuenta,
    color: 'bg-info-suave text-info',
  }),
  caja: (abierta) => ({
    titulo: abierta ? 'Cerrar caja' : 'Abrir caja',
    detalle: 'De quien lleva la caja. Si no la llevas, lo aprueba un encargado.',
    icono: IconoDinero,
    color: abierta ? 'bg-atencion-suave text-atencion' : 'bg-bien-suave text-bien',
  }),
};

/** Un botón grande de la puerta: su icono en su cuadro, el nombre y, si cabe, una línea. */
function BotonGrande({
  icono: Dibujo,
  titulo,
  detalle,
  color,
  alto,
  pequeno = false,
  onClick,
}: {
  readonly icono: Icono;
  readonly titulo: string;
  readonly detalle?: string;
  readonly color: string;
  readonly alto: string;
  readonly pequeno?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex rounded-mayor font-bold transition-transform active:scale-[0.98]',
        // Los pequeños, de tres en fila: el icono encima y el nombre debajo, sin partirse.
        pequeno
          ? 'flex-col items-center justify-center gap-e2 px-e2 text-center'
          : 'items-center gap-e4 px-e5 text-left',
        color,
        alto,
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'flex shrink-0 items-center justify-center rounded-grande bg-sobre-mesa-libre/15',
          pequeno ? 'size-12' : 'size-16',
        ].join(' ')}
      >
        <Dibujo size={pequeno ? 24 : 32} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={pequeno ? 'text-cuerpo' : 'text-cifra-media'}>{titulo}</span>
        {detalle !== undefined && (
          <span className="text-secundario font-semibold opacity-85">{detalle}</span>
        )}
      </span>
    </button>
  );
}
