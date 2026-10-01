import { useEffect, useMemo, useRef, useState } from 'react';
import { crearCliente, type ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, Cargando, clases } from '@estook/ui';
import { DIRECCION_DE_LA_API } from '../datos/cliente.ts';
import { guardarParaDespues, mandarLoPendiente } from '../sinConexion/cola.ts';
import { usarHayRed, usarLoPendiente } from '../ganchos/usarLaRed.ts';
import { hayRed, pedirMirandoLaRed } from '../sinConexion/red.ts';
import { guardarLaLlave, leerLaLlave } from './llaveDelAparato.ts';
import {
  cifrarElPin,
  guardarLoDelAparato,
  leerLoDelAparato,
  type LoDelAparato,
} from './sinConexion.ts';

/**
 * La pantalla del aparato del local para fichar (H1 · decisión 0068).
 *
 * Se queda encendida en una tablet o en el ordenador del local. **No hay sesión de
 * nadie**: el aparato sabe de qué local es por su llave, y cada uno teclea su PIN.
 * Solo ficha. No abre la app ni enseña nada de nadie más que el nombre de quien
 * acaba de teclear y cómo está.
 *
 * ── Pensada para las manos de un turno ─────────────────────────────────────
 *
 * Botones grandes y un toque para cada cosa, como el modo cocina: con guantes o con
 * las manos mojadas no se desliza ni se mantiene pulsado. Y **se vuelve sola al
 * teclado** a los veinte segundos, para que el siguiente no fiche con el PIN del de
 * antes a la vista.
 *
 * ── Sin wifi, se sigue fichando (I · 0070) ─────────────────────────────────
 *
 * El PIN no se puede comprobar sin conexión, así que el aparato no dice de quién es:
 * enseña los cuatro botones, **guarda lo tecleado cifrado** (`sinConexion.ts`) y lo
 * manda al volver la señal, con la hora a la que se hizo. Lo que entonces no se puede
 * apuntar —un PIN equivocado— le llega a quien lleva el equipo, que lo apunta a mano.
 */

type Estado = 'fuera' | 'dentro' | 'en_pausa';
type Que = 'entrada' | 'pausa' | 'vuelta' | 'salida';

type ElAparato = LoDelAparato;

/** Lo que tiene sin mandar el aparato: lo de todos los que ficharon en él. */
const DE_EL_APARATO = 'aparato';
/** Cada cuánto se reintenta mandar lo guardado, mientras lo haya. */
const REINTENTAR_MS = 30_000;

interface Quien {
  readonly nombre: string;
  readonly estado: Estado;
  readonly desde: string | null;
  readonly minutosDeHoy: number;
  readonly pausasEnUso: boolean;
  /** Lo suyo de los próximos días, del horario publicado (H2 · 0069). */
  readonly proximos?: readonly { readonly cuando: string; readonly que: string }[];
}

/** Lo que tarda en volver al teclado si nadie toca nada. */
const VUELVE_SOLA_MS = 20_000;
/** Lo que se queda a la vista el «Entrada apuntada». */
const CONFIRMACION_MS = 4_000;
const LARGO_DEL_PIN = 6;

const LO_QUE_SE_DICE: Readonly<Record<Que, string>> = {
  entrada: 'Entrada apuntada',
  pausa: 'Pausa empezada',
  vuelta: 'De vuelta de la pausa',
  salida: 'Salida apuntada',
};

const LO_QUE_SE_GUARDA: Readonly<Record<Que, string>> = {
  entrada: 'Entrada',
  pausa: 'Pausa',
  vuelta: 'Vuelta de la pausa',
  salida: 'Salida',
};

function hora(iso: string | null): string {
  if (iso === null) return '';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function enHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h === 0 ? `${String(m)} min` : `${String(h)} h ${String(m)} min`;
}

export function PantallaDelAparato() {
  // Sin token: aquí no ha entrado nadie. La llave va en cada petición.
  const cliente = useMemo(
    () => crearCliente({ base: DIRECCION_DE_LA_API, token: null, pedir: pedirMirandoLaRed }),
    [],
  );
  const [llave, setLlave] = useState(() => leerLaLlave());
  // Lo que recuerda de sí mismo, para arrancar sin wifi (0070).
  const [aparato, setAparato] = useState<ElAparato | null>(() =>
    leerLaLlave() === null ? null : leerLoDelAparato(),
  );
  const [pin, setPin] = useState('');
  const [quien, setQuien] = useState<Quien | null>(null);
  /** Sin wifi, con un PIN tecleado: los cuatro botones, sin saber de quién es (0070). */
  const [sinSenal, setSinSenal] = useState(false);
  const [hecho, setHecho] = useState<{ que: Que; nombre: string | null } | null>(null);
  const conRed = usarHayRed();
  const { pendientes } = usarLoPendiente(DE_EL_APARATO);
  const hayPendientes = pendientes.length > 0;
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // El reloj de la pantalla: **solo se pinta**, no decide nada. La hora del fichaje
  // la pone el servidor (regla 10).
  const [reloj, setReloj] = useState(() => Date.now());
  const tiempo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cada = setInterval(() => {
      setReloj(Date.now());
    }, 15_000);
    return () => {
      clearInterval(cada);
    };
  }, []);

  useEffect(() => {
    if (llave === null) return;
    void (async () => {
      const respuesta = await cliente.consultar<ElAparato>('el_aparato_para_fichar', {
        llave: llave.llave,
      });
      if (respuesta.ok) {
        let datos = respuesta.datos;
        // La primera vez, se prepara para cuando se caiga el wifi (0070).
        if (datos.clavePublica === null) {
          const preparado = await cliente.ejecutar<{ clavePublica: string }>(
            'preparar_el_aparato_sin_conexion',
            { llave: llave.llave },
          );
          if (preparado.ok) datos = { ...datos, clavePublica: preparado.datos.clavePublica };
        }
        setAparato(datos);
        guardarLoDelAparato(datos);
        return;
      }
      if (respuesta.error.codigo === 'aparato_retirado') {
        guardarLaLlave(null);
        guardarLoDelAparato(null);
        setLlave(null);
      }
      // Sin wifi, con lo que recuerda: no hace falta decir nada más que «sin conexión».
      if (respuesta.error.codigo === 'sin_conexion' && leerLoDelAparato() !== null) return;
      setError(respuesta.error);
    })();
  }, [cliente, llave]);

  // Lo guardado sin wifi sale solo al volver, y mientras haya, cada poco (0070).
  useEffect(() => {
    if (!conRed) return;
    void mandarLoPendiente(cliente, DE_EL_APARATO);
    if (!hayPendientes) return;
    const cada = setInterval(() => {
      if (hayRed()) void mandarLoPendiente(cliente, DE_EL_APARATO);
    }, REINTENTAR_MS);
    return () => {
      clearInterval(cada);
    };
  }, [cliente, conRed, hayPendientes]);

  function aEmpezar() {
    setPin('');
    setQuien(null);
    setSinSenal(false);
    setError(null);
    if (tiempo.current !== null) clearTimeout(tiempo.current);
  }

  function dentroDeUnRato(ms: number, hacer: () => void) {
    if (tiempo.current !== null) clearTimeout(tiempo.current);
    tiempo.current = setTimeout(hacer, ms);
  }

  async function quienSoy(elPin: string) {
    if (llave === null) return;
    // Sin wifi no se pregunta: se enseñan los cuatro botones (0070).
    if (!hayRed()) {
      setSinSenal(true);
      dentroDeUnRato(VUELVE_SOLA_MS, aEmpezar);
      return;
    }
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar<Quien>('quien_ficha_aqui', {
      llave: llave.llave,
      pin: elPin,
    });
    setOcupado(false);
    if (!respuesta.ok && respuesta.error.codigo === 'sin_conexion') {
      setSinSenal(true);
      dentroDeUnRato(VUELVE_SOLA_MS, aEmpezar);
      return;
    }
    if (!respuesta.ok) {
      setError(respuesta.error);
      setPin('');
      return;
    }
    setQuien(respuesta.datos);
    dentroDeUnRato(VUELVE_SOLA_MS, aEmpezar);
  }

  async function fichar(que: Que) {
    if (llave === null || quien === null) return;
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar<Quien>('fichar_aqui', {
      llave: llave.llave,
      pin,
      que,
    });
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setHecho({ que, nombre: respuesta.datos.nombre });
    setPin('');
    setQuien(null);
    dentroDeUnRato(CONFIRMACION_MS, () => {
      setHecho(null);
    });
  }

  /** Sin wifi: se guarda cifrado y se comprueba al volver (0070). */
  async function ficharSinSenal(que: Que) {
    if (llave === null || aparato === null) return;
    if (aparato.clavePublica === null) {
      setError({
        codigo: 'sin_conexion',
        quePasa: 'Este aparato todavía no está preparado para fichar sin conexión.',
        queSePuedeHacer:
          'Se prepara solo la próxima vez que tenga wifi. Mientras, ficha desde tu móvil o avísale al encargado.',
        boton: null,
      });
      return;
    }
    setOcupado(true);
    try {
      const pinCifrado = await cifrarElPin(aparato.clavePublica, pin);
      await guardarParaDespues(
        'fichar_aqui',
        { llave: llave.llave, pin_cifrado: pinCifrado, que },
        { de: DE_EL_APARATO, que: LO_QUE_SE_GUARDA[que] },
      );
    } finally {
      setOcupado(false);
    }
    setHecho({ que, nombre: null });
    setPin('');
    setSinSenal(false);
    dentroDeUnRato(CONFIRMACION_MS, () => {
      setHecho(null);
    });
  }

  function tecla(cifra: string) {
    setHecho(null);
    setError(null);
    if (pin.length >= LARGO_DEL_PIN) return;
    const nuevo = `${pin}${cifra}`;
    setPin(nuevo);
    if (nuevo.length === LARGO_DEL_PIN) void quienSoy(nuevo);
  }

  if (llave === null) {
    return (
      <Marco>
        <div className="flex flex-col items-center gap-e4 text-center">
          <p className="text-titulo font-semibold">Este aparato no está puesto para fichar</p>
          <p className="max-w-md text-cuerpo text-texto-suave">
            Quien lleva el local lo pone desde Estook, en este mismo aparato: Ajustes → Tu local →
            «El aparato para fichar».
          </p>
          <a
            href="#/"
            className="inline-flex min-h-toque items-center rounded-medio border border-borde-fuerte bg-superficie px-e4 text-cuerpo font-medium"
          >
            Ir a Estook
          </a>
        </div>
      </Marco>
    );
  }

  if (aparato === null) {
    // Sin wifi y sin haber arrancado nunca con él: no sabe de qué local es.
    return (
      <Marco>
        {error === null ? (
          <Cargando que="el aparato" />
        ) : (
          <p className="text-cuerpo text-mal">
            {error.quePasa} {error.queSePuedeHacer}
          </p>
        )}
      </Marco>
    );
  }

  return (
    <Marco>
      <header className="flex w-full items-baseline justify-between gap-e3">
        <div>
          <p className="text-titulo font-semibold">{aparato.local}</p>
          <p className="text-secundario text-texto-suave">{aparato.nombre}</p>
        </div>
        <div className="text-right">
          <p className="text-titulo font-semibold tabular-nums" aria-label="Hora">
            {new Date(reloj).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {(!conRed || hayPendientes) && (
            <p role="status" className="text-secundario font-medium text-atencion">
              {conRed ? '' : 'Sin conexión'}
              {!conRed && hayPendientes ? ' · ' : ''}
              {hayPendientes
                ? `${String(pendientes.length)} ${pendientes.length === 1 ? 'fichaje' : 'fichajes'} por mandar`
                : ''}
            </p>
          )}
        </div>
      </header>

      <main className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-e5">
        {hecho !== null &&
          (hecho.nombre === null ? (
            <p role="status" className="text-center text-titulo font-semibold text-atencion">
              {LO_QUE_SE_GUARDA[hecho.que]} guardada. Se apunta sola al volver la conexión.
            </p>
          ) : (
            <p role="status" className="text-center text-titulo font-semibold text-bien">
              {LO_QUE_SE_DICE[hecho.que]}, {hecho.nombre}.
            </p>
          ))}

        {error !== null && (
          <p role="alert" className="text-center text-cuerpo text-mal">
            {error.quePasa} {error.queSePuedeHacer}
          </p>
        )}

        {sinSenal ? (
          <div className="flex w-full flex-col items-center gap-e4">
            <p className="text-center text-titulo font-semibold">Sin conexión</p>
            <p className="text-center text-cuerpo text-texto-suave">
              Elige qué fichas. Se guarda y se comprueba tu PIN cuando vuelva la conexión, con la
              hora de ahora.
            </p>
            <div className="flex w-full flex-col gap-e3">
              <BotonGrande
                tono="principal"
                disabled={ocupado}
                onClick={() => void ficharSinSenal('entrada')}
              >
                Fichar la entrada
              </BotonGrande>
              {aparato.pausasEnUso && (
                <div className="grid grid-cols-2 gap-e3">
                  <BotonGrande
                    tono="secundario"
                    disabled={ocupado}
                    onClick={() => void ficharSinSenal('pausa')}
                  >
                    Empezar pausa
                  </BotonGrande>
                  <BotonGrande
                    tono="secundario"
                    disabled={ocupado}
                    onClick={() => void ficharSinSenal('vuelta')}
                  >
                    Volver
                  </BotonGrande>
                </div>
              )}
              <BotonGrande
                tono="secundario"
                disabled={ocupado}
                onClick={() => void ficharSinSenal('salida')}
              >
                Fichar la salida
              </BotonGrande>
              <Boton tono="texto" onClick={aEmpezar}>
                Me he equivocado de PIN
              </Boton>
            </div>
          </div>
        ) : quien === null ? (
          <>
            <p className="text-center text-cuerpo">Teclea tu PIN para fichar</p>
            <div
              className="flex gap-e3"
              aria-label={`${String(pin.length)} de ${String(LARGO_DEL_PIN)} cifras`}
            >
              {Array.from({ length: LARGO_DEL_PIN }, (_, i) => (
                <span
                  key={i}
                  className={clases(
                    'size-[18px] rounded-full border-2 border-borde-fuerte',
                    i < pin.length && 'bg-texto',
                  )}
                />
              ))}
            </div>
            <div className="grid w-full grid-cols-3 gap-e3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((cifra) => (
                <Tecla
                  key={cifra}
                  disabled={ocupado}
                  onClick={() => {
                    tecla(cifra);
                  }}
                >
                  {cifra}
                </Tecla>
              ))}
              <Tecla
                disabled={ocupado || pin === ''}
                onClick={() => {
                  setPin('');
                }}
                suave
              >
                Borrar
              </Tecla>
              <Tecla
                disabled={ocupado}
                onClick={() => {
                  tecla('0');
                }}
              >
                0
              </Tecla>
              <Tecla
                disabled={ocupado || pin === ''}
                onClick={() => {
                  setPin(pin.slice(0, -1));
                }}
                suave
              >
                ‹
              </Tecla>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-e4">
            <p className="text-center text-titulo font-semibold">Hola, {quien.nombre}</p>
            <p className="text-center text-cuerpo text-texto-suave">
              {quien.estado === 'fuera'
                ? quien.minutosDeHoy > 0
                  ? `Hoy llevas ${enHoras(quien.minutosDeHoy)}.`
                  : 'No has fichado hoy.'
                : quien.estado === 'en_pausa'
                  ? `En tu pausa desde las ${hora(quien.desde)}.`
                  : `Dentro desde las ${hora(quien.desde)}. Hoy llevas ${enHoras(quien.minutosDeHoy)}.`}
            </p>
            <div className="flex w-full flex-col gap-e3">
              {quien.estado === 'fuera' && (
                <BotonGrande
                  tono="principal"
                  disabled={ocupado}
                  onClick={() => void fichar('entrada')}
                >
                  Fichar la entrada
                </BotonGrande>
              )}
              {quien.estado === 'dentro' && quien.pausasEnUso && (
                <BotonGrande
                  tono="secundario"
                  disabled={ocupado}
                  onClick={() => void fichar('pausa')}
                >
                  Empezar pausa
                </BotonGrande>
              )}
              {quien.estado === 'en_pausa' && (
                <BotonGrande
                  tono="principal"
                  disabled={ocupado}
                  onClick={() => void fichar('vuelta')}
                >
                  Volver de la pausa
                </BotonGrande>
              )}
              {quien.estado !== 'fuera' && (
                <BotonGrande
                  tono="secundario"
                  disabled={ocupado}
                  onClick={() => void fichar('salida')}
                >
                  Fichar la salida
                </BotonGrande>
              )}
              <Boton tono="texto" onClick={aEmpezar}>
                No soy yo
              </Boton>
            </div>
            {/*
              Su horario, que quien no tiene correo no ve en ninguna otra parte
              (h-horarios, punto 9): lo suyo de los próximos días, al teclear su PIN.
            */}
            {quien.proximos !== undefined && quien.proximos.length > 0 && (
              <section aria-label="Tus próximos días" className="w-full">
                <h2 className="pb-e2 text-center text-etiqueta font-semibold uppercase tracking-wide text-texto-suave">
                  Tus próximos días
                </h2>
                <ul className="flex flex-col divide-y divide-borde rounded-medio border border-borde bg-superficie">
                  {quien.proximos.map((p) => (
                    <li
                      key={p.cuando}
                      className="flex items-center justify-between gap-e3 px-e4 py-e2"
                    >
                      <span className="font-medium">{p.cuando}</span>
                      <span className="text-right tabular-nums text-texto-suave">{p.que}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="text-center text-etiqueta text-texto-tenue">
        La hora la pone Estook, no este aparato. Nada de huella ni de cara: solo tu PIN.
      </footer>
    </Marco>
  );
}

function Marco({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between gap-e5 bg-fondo px-e4 py-e5 sm:px-e6">
      {children}
    </div>
  );
}

function Tecla({
  children,
  onClick,
  disabled,
  suave = false,
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly disabled: boolean;
  readonly suave?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clases(
        'min-h-[4.5rem] rounded-mayor border border-borde bg-superficie text-titulo font-semibold tabular-nums [box-shadow:var(--sombra-tarjeta)] active:bg-fondo disabled:opacity-50',
        suave && 'text-cuerpo text-texto-suave',
      )}
    >
      {children}
    </button>
  );
}

function BotonGrande({
  children,
  onClick,
  disabled,
  tono,
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly disabled: boolean;
  readonly tono: 'principal' | 'secundario';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clases(
        'min-h-[4.5rem] w-full rounded-mayor text-seccion font-semibold disabled:opacity-50',
        tono === 'principal'
          ? 'bg-naranja text-white'
          : 'border border-borde-fuerte bg-superficie text-texto',
      )}
    >
      {children}
    </button>
  );
}
