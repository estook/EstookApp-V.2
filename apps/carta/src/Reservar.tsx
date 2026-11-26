import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { crearCliente, type ErrorDeLaApi } from '@estook/cliente-api';
import {
  COMENSALES_DE_LA_WEB,
  DIRECCION_DE_ESTOOK,
  elTextoSobreElColor,
  laAntelacionEnLetra,
} from '@estook/dominio';
import { Boton, Campo, Cargando, ErrorEnCristiano, fondoDegradado, Logo } from '@estook/ui';
import { AntesDeIrte } from './AntesDeIrte.tsx';

/**
 * **La web de reservas de cada local** (la Ampliación 5 · 2, decisión 0153, secciones 6 y 20).
 *
 * `estook.com/reservar/<dirección>`: la misma dirección que su carta. El cliente elige cuántos son, el día
 * y una hora **que tiene mesa de verdad** (Estook la busca entre las mesas que el local ofrece por
 * internet) y pone su nombre y su teléfono. **Arriba del todo, «¿Ya tienes reserva?» con dos botones
 * grandes, Confirmar y Cancelar, que solo piden el teléfono** (Richi, 26-nov: «hay gente de más de 80 que
 * reserva»; «la gente no va por ahí apuntándose códigos»). El enlace del correo abre la reserva sin teclear.
 *
 * **Dentro de la web del local** (`?incrustada=1&color=…`, el código de Servicio › Reservas): sin la cabecera
 * grande, con el color que eligió el local y abajo solo «Reservas con estook.com»; le dice a la web de fuera
 * cuánto ocupa para que el hueco crezca solo.
 *
 * **Lo más sencillo gana**: todo en una sola página, de arriba abajo, sin cuentas ni contraseñas, sin
 * cookies y sin guardar nada en el navegador. Lo que confirma o cancela se hace tocando aquí, nunca solo
 * por abrir un enlace (los correos los abren a veces los antivirus).
 */
const API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

interface LaWeb {
  readonly nombre: string;
  readonly poblacion: string | null;
  readonly telefono: string | null;
  readonly color: string | null;
  readonly hoy: string;
  readonly ultimoDia: string;
  readonly comensalesMax: number;
  /** Los días de la semana que abre (0 domingo … 6 sábado). */
  readonly abre: readonly number[];
  /** Hasta cuántos minutos antes se reserva por aquí: lo elige el local. */
  readonly antelacion: number;
  readonly avisaPorCorreo: boolean;
  readonly pideQueConfirmen: boolean;
  readonly minutosParaConfirmar: number;
}

interface LasHoras {
  readonly dia: string;
  readonly servicios: readonly { readonly nombre: string; readonly horas: readonly string[] }[];
  readonly lleno: boolean;
  readonly noCaben: boolean;
  readonly cerrado: boolean;
  readonly tarde: boolean;
}

interface SuReserva {
  readonly id: string;
  readonly dia: string;
  readonly diaEnLetra: string;
  readonly hora: string;
  readonly comensales: number;
  readonly nombre: string;
  readonly estado: 'reservada' | 'sentada' | 'cancelada' | 'no_vino';
  readonly confirmada: boolean;
  readonly confirmarAntesDe: string | null;
  readonly local: string;
}

/** Con qué se demuestra que es suya: su teléfono, o el código que lleva escondido el enlace del correo. */
type Llave = { readonly telefono: string } | { readonly codigo: string };

type Cliente = ReturnType<typeof crearCliente>;

type ComoVa =
  | { readonly que: 'cargando' }
  | { readonly que: 'no_existe' }
  | { readonly que: 'sin_red' }
  | { readonly que: 'lista'; readonly web: LaWeb };

/** Lo que trae el enlace del correo: `#/mi-reserva?r=<id>&c=<código>&que=confirmar`. */
interface ElEnlace {
  readonly id: string;
  readonly codigo: string;
  readonly que: 'confirmar' | 'cancelar' | null;
}

function elEnlaceDelCorreo(almohadilla: string): ElEnlace | null {
  const encontrado = /^#\/mi-reserva\?(.*)$/.exec(almohadilla);
  if (encontrado === null) return null;
  const datos = new URLSearchParams(encontrado[1] ?? '');
  const id = datos.get('r') ?? '';
  const codigo = datos.get('c') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{4}$/.test(codigo)) return null;
  const que = datos.get('que');
  return { id, codigo, que: que === 'confirmar' || que === 'cancelar' ? que : null };
}

// ═══ El color: el de Estook, o el que eligió el local para su web ════════════

interface ElAcento {
  /** El fondo de lo elegido (cuántos, el día, la hora) y de los números de cada paso. */
  readonly fondo: CSSProperties;
  readonly texto: string;
  readonly sombra: string;
}

const DE_ESTOOK: ElAcento = {
  fondo: fondoDegradado('fechas'),
  texto: '#ffffff',
  sombra: '0 8px 18px -10px rgba(103,68,224,0.8)',
};

const Acento = createContext<ElAcento>(DE_ESTOOK);

/** Lo que dice la dirección: si va dentro de otra web y con qué color. */
function comoSeVe(): { readonly incrustada: boolean; readonly color: string | null } {
  const datos = new URLSearchParams(window.location.search);
  const color = datos.get('color') ?? '';
  return {
    incrustada: datos.get('incrustada') === '1',
    color: /^[0-9a-f]{6}$/i.test(color) ? `#${color.toLowerCase()}` : null,
  };
}

// ═══ Las fechas ═══════════════════════════════════════════════════════════════

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;
const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

function masDias(dia: string, dias: number): string {
  return new Date(Date.parse(`${dia}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

/** «Hoy», «Mañana» o «vie 28»; con el mes debajo para los botones de los días. */
function elDiaCorto(dia: string, hoy: string): { readonly arriba: string; readonly abajo: string } {
  const fecha = new Date(`${dia}T12:00:00Z`);
  const numero = String(fecha.getUTCDate());
  const mes = MESES_CORTOS[fecha.getUTCMonth()] ?? '';
  if (dia === hoy) return { arriba: 'Hoy', abajo: `${numero} ${mes}` };
  if (dia === masDias(hoy, 1)) return { arriba: 'Mañana', abajo: `${numero} ${mes}` };
  return { arriba: DIAS_CORTOS[fecha.getUTCDay()] ?? '', abajo: `${numero} ${mes}` };
}

function elDiaLargo(dia: string, hoy: string): string {
  const corto = elDiaCorto(dia, hoy);
  return corto.arriba === 'Hoy' || corto.arriba === 'Mañana'
    ? corto.arriba.toLowerCase()
    : `el ${corto.arriba} ${corto.abajo}`;
}

const conMayuscula = (texto: string) => texto.replace(/^./, (c) => c.toUpperCase());
const personas = (n: number) => `${String(n)} ${n === 1 ? 'persona' : 'personas'}`;
const sonDemasiados = (error: ErrorDeLaApi) => error.codigo === 'demasiados_intentos';

// ═══ La página ════════════════════════════════════════════════════════════════

export function Reservar({ direccion }: { readonly direccion: string }) {
  const cliente = useRef(crearCliente({ base: API })).current;
  const [como, setComo] = useState<ComoVa>({ que: 'cargando' });
  const [{ incrustada, color }] = useState(comoSeVe);
  const [enlace] = useState(() => elEnlaceDelCorreo(window.location.hash));
  const [suya, setSuya] = useState<{ reserva: SuReserva; llave: Llave } | null>(null);
  const [sinEnlace, setSinEnlace] = useState(false);
  /** «Confirmar» o «Cancelar» mi reserva, con el teléfono. */
  const [conTelefono, setConTelefono] = useState<'confirmar' | 'cancelar' | null>(null);
  /** «Antes de irte» (5 · 3): al acabar de reservar, una vez. */
  const [recienHecha, setRecienHecha] = useState<SuReserva | null>(null);
  const principal = useRef<HTMLElement>(null);

  const acento = useMemo<ElAcento>(
    () =>
      color === null
        ? DE_ESTOOK
        : { fondo: { backgroundColor: color }, texto: elTextoSobreElColor(color), sombra: 'none' },
    [color],
  );

  // Otro enlace del correo abierto en esta misma pestaña: la página se vuelve a leer entera.
  useEffect(() => {
    const alCambiar = () => {
      if (elEnlaceDelCorreo(window.location.hash) !== null) window.location.reload();
    };
    window.addEventListener('hashchange', alCambiar);
    return () => {
      window.removeEventListener('hashchange', alCambiar);
    };
  }, []);

  // Dentro de otra web, sin fondo propio: que se vea el de la web del local.
  useEffect(() => {
    if (!incrustada) return;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, [incrustada]);

  // Dentro de otra web: le dice cuánto ocupa, para que el hueco crezca solo (sin dos barras).
  useEffect(() => {
    if (!incrustada || principal.current === null || window.parent === window) return undefined;
    const decirElAlto = () => {
      const alto = Math.ceil(principal.current?.getBoundingClientRect().height ?? 0);
      window.parent.postMessage({ estook: 'reservas', alto }, '*');
    };
    const observador = new ResizeObserver(decirElAlto);
    observador.observe(principal.current);
    decirElAlto();
    return () => {
      observador.disconnect();
    };
  }, [incrustada]);

  useEffect(() => {
    if (API === '') {
      setComo({ que: 'sin_red' });
      return undefined;
    }
    let vigente = true;
    void cliente.consultar<LaWeb>('la_web_de_reservas', { direccion }).then((r) => {
      if (!vigente) return;
      if (r.ok) {
        setComo({ que: 'lista', web: r.datos });
        document.title = `Reservar en ${r.datos.nombre}`;
      } else {
        setComo({ que: r.error.codigo === 'no_existe' ? 'no_existe' : 'sin_red' });
      }
    });
    return () => {
      vigente = false;
    };
  }, [cliente, direccion]);

  const web = como.que === 'lista' ? como.web : null;

  function volverAlPrincipio() {
    setSuya(null);
    setConTelefono(null);
    setSinEnlace(true);
    if (window.location.hash !== '') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // El color del local también en el botón principal (variables del sistema de diseño).
  const estiloDelColor =
    color === null
      ? undefined
      : ({
          '--color-naranja': color,
          '--color-sobre-naranja': acento.texto,
        } as CSSProperties);

  return (
    <Acento.Provider value={acento}>
      <main
        ref={principal}
        style={estiloDelColor}
        className={
          incrustada
            ? 'mx-auto flex w-full max-w-[40rem] flex-col gap-e5 px-e4 py-e5'
            : 'mx-auto flex min-h-dvh w-full max-w-[34rem] flex-col gap-e5 px-e4 pb-e7 pt-[calc(env(safe-area-inset-top)+var(--spacing-e5))]'
        }
      >
        {como.que === 'cargando' && <Cargando que="las reservas" lineas={4} />}
        {como.que === 'no_existe' && (
          <UnEstado
            dibujo="parado"
            titulo="Aquí no se reserva por internet"
            frase="Este local no tiene reservas por internet. Llámales o pásate por allí."
          />
        )}
        {como.que === 'sin_red' && (
          <UnEstado
            dibujo="parado"
            titulo="No llego a las reservas"
            frase="Puede ser la conexión del móvil. Vuelve a abrir el enlace dentro de un momento."
          />
        )}
        {web !== null && (
          <>
            {!incrustada && <Cabecera web={web} />}
            {suya !== null ? (
              <MiReserva
                web={web}
                reserva={suya.reserva}
                llave={suya.llave}
                direccion={direccion}
                cliente={cliente}
                destacar={enlace?.que ?? null}
                alCambiar={(reserva) => {
                  setSuya({ reserva, llave: suya.llave });
                }}
                alVolver={volverAlPrincipio}
              />
            ) : enlace !== null && !sinEnlace ? (
              <AbrirElEnlace
                enlace={enlace}
                direccion={direccion}
                cliente={cliente}
                alEncontrar={(reserva) => {
                  setSuya({ reserva, llave: { codigo: enlace.codigo } });
                }}
                alFallar={() => {
                  setSinEnlace(true);
                }}
              />
            ) : conTelefono !== null ? (
              <ConElTelefono
                que={conTelefono}
                web={web}
                direccion={direccion}
                cliente={cliente}
                alVolver={volverAlPrincipio}
              />
            ) : (
              <>
                <YaTienesReserva alElegir={setConTelefono} incrustada={incrustada} />
                <LaReserva
                  web={web}
                  direccion={direccion}
                  cliente={cliente}
                  alHecha={(reserva, telefono) => {
                    setSuya({ reserva, llave: { telefono } });
                    setRecienHecha(reserva);
                  }}
                />
              </>
            )}
            {recienHecha !== null && (
              <AntesDeIrte
                nombre={recienHecha.nombre}
                confirmarAntesDe={recienHecha.confirmarAntesDe}
                minutosParaConfirmar={web.minutosParaConfirmar}
                alCerrar={() => {
                  setRecienHecha(null);
                }}
              />
            )}
          </>
        )}

        {incrustada ? (
          <footer className="flex justify-center pt-e3 text-etiqueta text-texto-tenue">
            <a
              href={DIRECCION_DE_ESTOOK}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              Reservas con estook.com
            </a>
          </footer>
        ) : (
          <footer className="mt-auto flex items-center justify-center gap-e2 pt-e5 text-etiqueta text-texto-tenue">
            <span>Reservas con</span>
            <a href={DIRECCION_DE_ESTOOK} aria-label="Estook" rel="noreferrer">
              <Logo alto={16} />
            </a>
          </footer>
        )}
      </main>
    </Acento.Provider>
  );
}

// ═══ La cabecera ══════════════════════════════════════════════════════════════

function Cabecera({ web }: { readonly web: LaWeb }) {
  return (
    <header
      className="relative flex flex-col gap-e1 overflow-hidden rounded-[24px] p-e5 text-white [box-shadow:var(--sombra-baldosa)]"
      style={fondoDegradado('fechas')}
    >
      <span className="text-etiqueta font-bold uppercase tracking-[0.08em] text-white/80">
        Reserva tu mesa
      </span>
      <h1 className="text-pantalla font-semibold leading-tight">{web.nombre}</h1>
      {web.poblacion !== null && <p className="text-secundario text-white/85">{web.poblacion}</p>}
      {web.color !== null && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[4px]"
          style={{ backgroundColor: web.color }}
        />
      )}
    </header>
  );
}

// ═══ «¿Ya tienes reserva?» ════════════════════════════════════════════════════

/**
 * Arriba, que se vea: **dos botones grandes**, cada uno con su color y su signo, para que lo encuentre
 * cualquiera a la primera. Solo piden el teléfono.
 */
function YaTienesReserva({
  alElegir,
  incrustada,
}: {
  readonly alElegir: (que: 'confirmar' | 'cancelar') => void;
  readonly incrustada: boolean;
}) {
  return (
    <section
      aria-label="Ya tengo reserva"
      className="flex flex-col gap-e3 rounded-[20px] border border-borde bg-superficie p-e4"
    >
      <h2 className="text-seccion font-bold">
        {incrustada ? '¿Ya tienes reserva?' : '¿Ya tienes reserva aquí?'}
      </h2>
      <div className="grid grid-cols-2 gap-e3">
        <button
          type="button"
          onClick={() => {
            alElegir('confirmar');
          }}
          className="flex min-h-[64px] items-center justify-center gap-e2 rounded-grande bg-bien-suave px-e3 text-cuerpo font-bold text-bien transition-transform active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="grid size-[28px] place-items-center rounded-redondo bg-bien text-white"
          >
            ✓
          </span>
          Confirmarla
        </button>
        <button
          type="button"
          onClick={() => {
            alElegir('cancelar');
          }}
          className="flex min-h-[64px] items-center justify-center gap-e2 rounded-grande bg-mal-suave px-e3 text-cuerpo font-bold text-mal transition-transform active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="grid size-[28px] place-items-center rounded-redondo bg-mal text-white"
          >
            ✕
          </span>
          Cancelarla
        </button>
      </div>
      <p className="text-secundario text-texto-suave">Solo te pedimos el teléfono que diste.</p>
    </section>
  );
}

/** Confirmar o cancelar con el teléfono: lo escribe, salen sus reservas, y un botón grande para cada una. */
function ConElTelefono({
  que,
  web,
  direccion,
  cliente,
  alVolver,
}: {
  readonly que: 'confirmar' | 'cancelar';
  readonly web: LaWeb;
  readonly direccion: string;
  readonly cliente: Cliente;
  readonly alVolver: () => void;
}) {
  const [telefono, setTelefono] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [reservas, setReservas] = useState<readonly SuReserva[] | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [hecha, setHecha] = useState<SuReserva | null>(null);
  const listo = telefono.replace(/\D/g, '').length >= 6;

  function buscar() {
    setBuscando(true);
    setError(null);
    void cliente
      .ejecutar<{ reservas: SuReserva[] }>('mis_reservas_en_la_web', {
        direccion,
        telefono: telefono.trim(),
      })
      .then((r) => {
        setBuscando(false);
        if (r.ok) setReservas(r.datos.reservas);
        else setError(r.error);
      });
  }

  function hacer(reserva: SuReserva) {
    setHaciendo(reserva.id);
    setError(null);
    void cliente
      .ejecutar<SuReserva>(que === 'confirmar' ? 'confirmar_mi_reserva' : 'cancelar_mi_reserva', {
        direccion,
        reserva_id: reserva.id,
        telefono: telefono.trim(),
      })
      .then((r) => {
        setHaciendo(null);
        if (r.ok) {
          setHecha(r.datos);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else setError(r.error);
      });
  }

  if (hecha !== null) {
    return (
      <section className="flex flex-col gap-e4">
        <UnEstado
          dibujo={que === 'confirmar' ? 'bien' : 'parado'}
          titulo={que === 'confirmar' ? '¡Confirmada! Te esperamos' : 'Reserva cancelada'}
        >
          <p className="text-cuerpo text-texto">
            {conMayuscula(hecha.diaEnLetra)} a las <strong>{hecha.hora}</strong>,{' '}
            {personas(hecha.comensales)}.
          </p>
          {que === 'cancelar' && (
            <p className="text-secundario text-texto-suave">
              Gracias por avisar: la mesa queda libre para otros.
            </p>
          )}
        </UnEstado>
        <Boton tono="secundario" tamano="l" ancho onClick={alVolver}>
          Volver
        </Boton>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-e4">
      <button
        type="button"
        onClick={alVolver}
        className="self-start text-secundario font-semibold text-info"
      >
        ← Volver
      </button>
      <h1 className="text-pantalla font-semibold leading-tight">
        {que === 'confirmar' ? 'Confirmar mi reserva' : 'Cancelar mi reserva'}
      </h1>

      {reservas === null ? (
        <>
          <Campo
            etiqueta="Tu teléfono"
            tipo="telefono"
            value={telefono}
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            ayuda="El mismo que diste al reservar."
            onChange={(e) => {
              setTelefono(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && listo) buscar();
            }}
          />
          {error !== null &&
            (sonDemasiados(error) ? (
              <UnEstado
                dibujo="parado"
                titulo="Demasiados intentos"
                frase="Espera una hora y vuelve a probar."
              />
            ) : (
              <ErrorEnCristiano error={error} />
            ))}
          <Boton
            tono="principal"
            tamano="l"
            ancho
            disabled={!listo}
            cargando={buscando}
            textoCargando="Buscando"
            onClick={buscar}
          >
            Buscar mi reserva
          </Boton>
          {web.telefono !== null && (
            <p className="text-secundario text-texto-suave">
              ¿No la encuentras? Llámales al{' '}
              <a
                className="font-semibold text-info underline"
                href={`tel:${web.telefono.replace(/\s/g, '')}`}
              >
                {web.telefono}
              </a>
              .
            </p>
          )}
        </>
      ) : (
        <>
          {reservas.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-e3 rounded-[20px] border border-borde bg-superficie p-e4"
            >
              <div className="flex flex-col">
                <span className="text-secundario font-semibold text-texto-suave">
                  {conMayuscula(r.diaEnLetra)}
                </span>
                <span className="text-[2rem] font-bold leading-tight tabular-nums">{r.hora}</span>
                <span className="text-cuerpo text-texto">
                  {r.nombre} · {personas(r.comensales)}
                </span>
              </div>
              {que === 'confirmar' && r.confirmada ? (
                <p className="rounded-grande bg-bien-suave px-e3 py-e2 font-semibold text-bien">
                  ✓ Ya está confirmada. Te esperamos.
                </p>
              ) : que === 'confirmar' ? (
                <Boton
                  tono="principal"
                  tamano="l"
                  ancho
                  cargando={haciendo === r.id}
                  textoCargando="Confirmando"
                  onClick={() => {
                    hacer(r);
                  }}
                >
                  Sí, confirmo que vamos
                </Boton>
              ) : (
                <BotonRojo
                  cargando={haciendo === r.id}
                  textoCargando="Cancelando"
                  alTocar={() => {
                    hacer(r);
                  }}
                >
                  Sí, cancelar esta reserva
                </BotonRojo>
              )}
            </div>
          ))}
          {error !== null && <ErrorEnCristiano error={error} />}
        </>
      )}
    </section>
  );
}

// ═══ Reservar ═════════════════════════════════════════════════════════════════

/** Los días que se ven de un vistazo; el resto, con «Otro día». */
const DIAS_A_LA_VISTA = 14;

function LaReserva({
  web,
  direccion,
  cliente,
  alHecha,
}: {
  readonly web: LaWeb;
  readonly direccion: string;
  readonly cliente: Cliente;
  readonly alHecha: (reserva: SuReserva, telefono: string) => void;
}) {
  const acento = useContext(Acento);
  const abreEse = (d: string) => web.abre.includes(new Date(`${d}T12:00:00Z`).getUTCDay());
  const [comensales, setComensales] = useState(2);
  // El primer día que abre: si hoy cierra, mañana (o el siguiente).
  const [dia, setDia] = useState(
    () =>
      Array.from({ length: DIAS_A_LA_VISTA }, (_, i) => masDias(web.hoy, i)).find(abreEse) ??
      web.hoy,
  );
  const [horas, setHoras] = useState<LasHoras | null>(null);
  const [errorDeHoras, setErrorDeHoras] = useState<ErrorDeLaApi | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [nota, setNota] = useState('');
  const [ofertas, setOfertas] = useState(false);
  const [reservando, setReservando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [demasiados, setDemasiados] = useState(false);
  // Sube cuando hay que volver a pedir las horas (la que se eligió se acaba de ocupar).
  const [vuelta, setVuelta] = useState(0);
  // Si hoy ya es tarde y el cliente no ha tocado el día, se abre en el siguiente que abre.
  const eligioElDia = useRef(false);
  // Nace aquí: tocar dos veces o perder la red no duplica la reserva.
  const id = useRef(crypto.randomUUID());

  const dias = useMemo(
    () => Array.from({ length: DIAS_A_LA_VISTA }, (_, i) => masDias(web.hoy, i)),
    [web.hoy],
  );

  useEffect(() => {
    let vigente = true;
    setHoras(null);
    setErrorDeHoras(null);
    setHora(null);
    void cliente
      .consultar<LasHoras>('horas_en_la_web', {
        direccion,
        dia,
        comensales: String(comensales),
      })
      .then((r) => {
        if (!vigente) return;
        if (r.ok && r.datos.tarde && !eligioElDia.current && dia === web.hoy) {
          const otro = Array.from({ length: DIAS_A_LA_VISTA - 1 }, (_, i) =>
            masDias(web.hoy, i + 1),
          ).find(abreEse);
          if (otro !== undefined) {
            setDia(otro);
            return;
          }
        }
        if (r.ok) setHoras(r.datos);
        else setErrorDeHoras(r.error);
      });
    return () => {
      vigente = false;
    };
  }, [cliente, direccion, dia, comensales, vuelta]);

  if (demasiados) {
    return (
      <UnEstado
        dibujo="parado"
        titulo="Demasiados intentos"
        frase="Espera una hora y vuelve a probar."
      />
    );
  }

  const pideCorreo = web.avisaPorCorreo;
  const listo =
    hora !== null &&
    nombre.trim() !== '' &&
    telefono.replace(/\D/g, '').length >= 6 &&
    (!pideCorreo || /^\S+@\S+\.\S+$/.test(correo.trim()));
  const antelacion = laAntelacionEnLetra(web.antelacion);

  function reservar() {
    if (hora === null) return;
    setReservando(true);
    setError(null);
    void cliente
      .ejecutar<SuReserva>('reservar_en_la_web', {
        direccion,
        id: id.current,
        dia,
        hora,
        comensales,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        ...(pideCorreo ? { correo: correo.trim(), ofertas } : {}),
        ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
      })
      .then((r) => {
        setReservando(false);
        if (r.ok) {
          alHecha(r.datos, telefono.trim());
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (sonDemasiados(r.error)) {
          setDemasiados(true);
        } else {
          setError(r.error);
          // Si la hora se acaba de ocupar, se vuelven a pedir las horas.
          setVuelta((v) => v + 1);
        }
      });
  }

  return (
    <>
      <Paso numero={1} titulo="¿Cuántos sois?">
        <div role="radiogroup" aria-label="Cuántos sois" className="flex flex-wrap gap-e2">
          {Array.from(
            { length: Math.min(web.comensalesMax, COMENSALES_DE_LA_WEB) },
            (_, i) => i + 1,
          ).map((n) => (
            <Ficha
              key={n}
              puesta={n === comensales}
              etiqueta={personas(n)}
              alTocar={() => {
                setComensales(n);
              }}
            >
              {String(n)}
            </Ficha>
          ))}
        </div>
        <p className="text-etiqueta text-texto-tenue">
          ¿Sois más de {String(web.comensalesMax)}?{' '}
          {web.telefono !== null ? (
            <a
              className="font-semibold text-info underline"
              href={`tel:${web.telefono.replace(/\s/g, '')}`}
            >
              Llámales al {web.telefono}
            </a>
          ) : (
            'Llámales.'
          )}
        </p>
      </Paso>

      <Paso numero={2} titulo="¿Qué día?">
        <div
          role="radiogroup"
          aria-label="Qué día"
          className="-mx-e4 flex gap-e2 overflow-x-auto px-e4 pb-e1 [scrollbar-width:none]"
        >
          {dias.map((d) => {
            const corto = elDiaCorto(d, web.hoy);
            const abre = abreEse(d);
            return (
              <Ficha
                key={d}
                ancha
                puesta={d === dia}
                apagada={!abre}
                etiqueta={abre ? elDiaLargo(d, web.hoy) : `${elDiaLargo(d, web.hoy)}: cerrado`}
                alTocar={() => {
                  eligioElDia.current = true;
                  setDia(d);
                }}
              >
                <span className="text-etiqueta font-bold capitalize">{corto.arriba}</span>
                <span className="text-etiqueta opacity-80">{abre ? corto.abajo : 'Cerrado'}</span>
              </Ficha>
            );
          })}
        </div>
        <label className="flex items-center gap-e2 text-secundario text-texto-suave">
          <span>Otro día</span>
          <input
            type="date"
            className="rounded-medio border border-borde bg-superficie px-e2 py-e1 text-texto"
            min={web.hoy}
            max={web.ultimoDia}
            value={dia}
            onChange={(e) => {
              if (e.target.value === '') return;
              eligioElDia.current = true;
              setDia(e.target.value);
            }}
          />
        </label>
      </Paso>

      <Paso numero={3} titulo="¿A qué hora?">
        {errorDeHoras !== null ? (
          <ErrorEnCristiano error={errorDeHoras} />
        ) : horas === null ? (
          <Cargando que="las horas" lineas={2} />
        ) : horas.cerrado || horas.tarde ? (
          <div className="flex flex-col gap-e1 rounded-grande bg-fondo p-e4">
            <p className="font-semibold text-texto">
              {horas.cerrado
                ? `${conMayuscula(elDiaLargo(dia, web.hoy))} ${web.nombre} no abre.`
                : 'Por aquí ya no se puede reservar para hoy.'}
            </p>
            <p className="text-secundario text-texto-suave">
              {horas.cerrado
                ? 'Elige otro día.'
                : `Se reserva hasta ${antelacion} antes${web.telefono !== null ? `: llámales al ${web.telefono}` : ''}, o elige otro día.`}
            </p>
          </div>
        ) : horas.lleno ? (
          <Lleno
            web={web}
            dia={dia}
            comensales={comensales}
            noCaben={horas.noCaben}
            direccion={direccion}
            cliente={cliente}
          />
        ) : (
          <div className="flex flex-col gap-e4">
            {horas.servicios
              .filter((s) => s.horas.length > 0)
              .map((s) => (
                <div key={s.nombre} className="flex flex-col gap-e2">
                  <span className="text-etiqueta font-bold uppercase tracking-[0.06em] text-texto-tenue">
                    {s.nombre}
                  </span>
                  <div role="radiogroup" aria-label={s.nombre} className="flex flex-wrap gap-e2">
                    {s.horas.map((h) => (
                      <Ficha
                        key={h}
                        puesta={h === hora}
                        etiqueta={`A las ${h}`}
                        alTocar={() => {
                          setHora(h);
                        }}
                      >
                        {h}
                      </Ficha>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Paso>

      {hora !== null && (
        <Paso numero={4} titulo="Tus datos">
          <Campo
            etiqueta="Nombre"
            value={nombre}
            autoComplete="name"
            maxLength={60}
            obligatorio
            onChange={(e) => {
              setNombre(e.target.value);
            }}
          />
          <Campo
            etiqueta="Teléfono"
            tipo="telefono"
            value={telefono}
            autoComplete="tel"
            maxLength={20}
            obligatorio
            ayuda="Por si el local tiene que avisarte. Con él confirmas o cancelas tu reserva."
            onChange={(e) => {
              setTelefono(e.target.value);
            }}
          />
          {pideCorreo && (
            <Campo
              etiqueta="Correo"
              tipo="correo"
              value={correo}
              autoComplete="email"
              maxLength={120}
              obligatorio
              ayuda={
                web.pideQueConfirmen
                  ? 'Te llega la reserva, el recordatorio y el botón para confirmarla.'
                  : 'Te llega la reserva y el recordatorio del día antes.'
              }
              onChange={(e) => {
                setCorreo(e.target.value);
              }}
            />
          )}
          <Campo
            etiqueta="Algo que deba saber el local"
            value={nota}
            maxLength={200}
            ayuda="Una alergia, una trona, un cumpleaños… (si quieres)"
            onChange={(e) => {
              setNota(e.target.value);
            }}
          />
          {pideCorreo && (
            <label className="flex items-start gap-e2 text-secundario text-texto-suave">
              <input
                type="checkbox"
                className="mt-[3px] size-[18px] accent-[var(--color-naranja)]"
                checked={ofertas}
                onChange={(e) => {
                  setOfertas(e.target.checked);
                }}
              />
              <span>Quiero que {web.nombre} me mande sus novedades y ofertas por correo.</span>
            </label>
          )}
          <p
            className="flex flex-wrap items-center gap-x-e2 rounded-grande px-e4 py-e3 font-semibold"
            style={{ ...acento.fondo, color: acento.texto }}
          >
            <span>{personas(comensales)}</span>
            <span aria-hidden className="opacity-60">
              ·
            </span>
            <span className="first-letter:uppercase">{elDiaLargo(dia, web.hoy)}</span>
            <span aria-hidden className="opacity-60">
              ·
            </span>
            <span>{hora}</span>
          </p>
          {error !== null && <ErrorEnCristiano error={error} />}
          <Boton
            tono="principal"
            tamano="l"
            ancho
            disabled={!listo}
            cargando={reservando}
            textoCargando="Reservando"
            onClick={reservar}
          >
            Reservar
          </Boton>
          <p className="text-etiqueta text-texto-tenue">
            Tus datos son solo para {web.nombre} y esta reserva. Más en{' '}
            <a
              className="underline"
              href={`${DIRECCION_DE_ESTOOK}/privacidad/`}
              target="_blank"
              rel="noreferrer"
            >
              privacidad
            </a>
            .
          </p>
        </Paso>
      )}
    </>
  );
}

/** El día está lleno para tantos: «Avísame si se libera» (si el local avisa por correo) o llamar. */
function Lleno({
  web,
  dia,
  comensales,
  noCaben,
  direccion,
  cliente,
}: {
  readonly web: LaWeb;
  readonly dia: string;
  readonly comensales: number;
  readonly noCaben: boolean;
  readonly direccion: string;
  readonly cliente: Cliente;
}) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [mandando, setMandando] = useState(false);
  const [apuntado, setApuntado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  useEffect(() => {
    setApuntado(false);
    setError(null);
  }, [dia, comensales]);

  const llamar =
    web.telefono === null ? null : (
      <a
        className="font-semibold text-info underline"
        href={`tel:${web.telefono.replace(/\s/g, '')}`}
      >
        llámales al {web.telefono}
      </a>
    );
  const frase = `${conMayuscula(elDiaLargo(dia, web.hoy))} no queda mesa para ${String(comensales)}.`;
  if (noCaben) {
    return (
      <div className="flex flex-col gap-e2 rounded-grande bg-atencion-suave p-e4">
        <p className="font-semibold text-texto">
          Para {String(comensales)} no hay mesa por internet.
        </p>
        <p className="text-secundario text-texto-suave">
          Un grupo así lo prepara el local: {llamar ?? 'llámales'}.
        </p>
      </div>
    );
  }
  if (!web.avisaPorCorreo) {
    return (
      <div className="flex flex-col gap-e2 rounded-grande bg-atencion-suave p-e4">
        <p className="font-semibold text-texto">{frase}</p>
        <p className="text-secundario text-texto-suave">
          Prueba otro día{llamar === null ? '' : ' o '}
          {llamar}.
        </p>
      </div>
    );
  }
  if (apuntado) {
    return (
      <div className="flex flex-col gap-e1 rounded-grande bg-bien-suave p-e4">
        <p className="font-semibold text-bien">Apuntado</p>
        <p className="text-secundario text-texto-suave">
          Si se libera una mesa para {String(comensales)} {elDiaLargo(dia, web.hoy)}, te escribimos
          a <strong>{correo.trim()}</strong>. Quien antes reserve, se la queda.
        </p>
      </div>
    );
  }
  const listo =
    nombre.trim() !== '' &&
    telefono.replace(/\D/g, '').length >= 6 &&
    /^\S+@\S+\.\S+$/.test(correo.trim());
  return (
    <div className="flex flex-col gap-e3 rounded-grande border border-borde bg-superficie p-e4">
      <p className="font-semibold text-texto">{frase}</p>
      <p className="text-secundario text-texto-suave">
        Prueba otro día, o déjanos tu correo y te avisamos si alguien cancela.
      </p>
      <Campo
        etiqueta="Nombre"
        value={nombre}
        autoComplete="name"
        maxLength={60}
        onChange={(e) => {
          setNombre(e.target.value);
        }}
      />
      <Campo
        etiqueta="Teléfono"
        tipo="telefono"
        value={telefono}
        autoComplete="tel"
        maxLength={20}
        onChange={(e) => {
          setTelefono(e.target.value);
        }}
      />
      <Campo
        etiqueta="Correo"
        tipo="correo"
        value={correo}
        autoComplete="email"
        maxLength={120}
        onChange={(e) => {
          setCorreo(e.target.value);
        }}
      />
      {error !== null && <ErrorEnCristiano error={error} />}
      <Boton
        tono="principal"
        ancho
        disabled={!listo}
        cargando={mandando}
        textoCargando="Apuntando"
        onClick={() => {
          setMandando(true);
          setError(null);
          void cliente
            .ejecutar<{ apuntado: true }>('avisame_si_se_libera', {
              direccion,
              dia,
              comensales,
              nombre: nombre.trim(),
              telefono: telefono.trim(),
              correo: correo.trim(),
            })
            .then((r) => {
              setMandando(false);
              if (r.ok) setApuntado(true);
              else setError(r.error);
            });
        }}
      >
        Avísame si se libera
      </Boton>
    </div>
  );
}

// ═══ El enlace del correo ═════════════════════════════════════════════════════

/** Se busca la reserva y se enseña (sin confirmar ni cancelar nada: eso se toca). */
function AbrirElEnlace({
  enlace,
  direccion,
  cliente,
  alEncontrar,
  alFallar,
}: {
  readonly enlace: ElEnlace;
  readonly direccion: string;
  readonly cliente: Cliente;
  readonly alEncontrar: (reserva: SuReserva) => void;
  readonly alFallar: () => void;
}) {
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const encontrada = useRef(alEncontrar);
  useEffect(() => {
    let vigente = true;
    void cliente
      .ejecutar<SuReserva>('mi_reserva_en_la_web', {
        direccion,
        reserva_id: enlace.id,
        codigo: enlace.codigo,
      })
      .then((r) => {
        if (!vigente) return;
        if (r.ok) encontrada.current(r.datos);
        else setError(r.error);
      });
    return () => {
      vigente = false;
    };
  }, [cliente, direccion, enlace]);
  if (error === null) return <Cargando que="tu reserva" lineas={3} />;
  return (
    <div className="flex flex-col gap-e3">
      <ErrorEnCristiano error={error} />
      <Boton tono="secundario" onClick={alFallar}>
        Ir a las reservas
      </Boton>
    </div>
  );
}

// ═══ Su reserva ═══════════════════════════════════════════════════════════════

function MiReserva({
  web,
  reserva,
  llave,
  direccion,
  cliente,
  destacar,
  alCambiar,
  alVolver,
}: {
  readonly web: LaWeb;
  readonly reserva: SuReserva;
  readonly llave: Llave;
  readonly direccion: string;
  readonly cliente: Cliente;
  readonly destacar: 'confirmar' | 'cancelar' | null;
  readonly alCambiar: (reserva: SuReserva) => void;
  readonly alVolver: () => void;
}) {
  const [haciendo, setHaciendo] = useState<'confirmar' | 'cancelar' | null>(null);
  const [seguro, setSeguro] = useState(destacar === 'cancelar');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const viva = reserva.estado === 'reservada';
  const cancelada = reserva.estado === 'cancelada';

  function hacer(que: 'confirmar' | 'cancelar') {
    setHaciendo(que);
    setError(null);
    void cliente
      .ejecutar<SuReserva>(que === 'confirmar' ? 'confirmar_mi_reserva' : 'cancelar_mi_reserva', {
        direccion,
        reserva_id: reserva.id,
        ...llave,
      })
      .then((r) => {
        setHaciendo(null);
        setSeguro(false);
        if (r.ok) alCambiar(r.datos);
        else setError(r.error);
      });
  }

  return (
    <section className="flex flex-col gap-e4">
      <UnEstado
        dibujo={cancelada ? 'parado' : 'bien'}
        titulo={
          cancelada
            ? 'Reserva cancelada'
            : !viva
              ? 'Tu reserva'
              : reserva.confirmada
                ? '¡Confirmada! Te esperamos'
                : 'Reserva hecha'
        }
      >
        <div className="flex flex-col rounded-[20px] border border-borde bg-superficie p-e4">
          <span className="text-secundario font-semibold text-texto-suave">
            {conMayuscula(reserva.diaEnLetra)}
          </span>
          <span className="text-[2rem] font-bold leading-tight tabular-nums">{reserva.hora}</span>
          <span className="text-cuerpo text-texto">
            {reserva.nombre} · {personas(reserva.comensales)}
          </span>
        </div>
      </UnEstado>

      {viva && reserva.confirmarAntesDe !== null && (
        <div className="flex flex-col gap-e1 rounded-grande bg-atencion-suave p-e4">
          <p className="font-semibold text-texto">
            Confírmala antes de las {reserva.confirmarAntesDe}
          </p>
          <p className="text-secundario text-texto-suave">
            Si no, se cancela sola y la mesa queda para otro.
            {web.avisaPorCorreo ? ' Te lo recordamos por correo.' : ''}
          </p>
        </div>
      )}

      {cancelada && (
        <p className="text-secundario text-texto-suave">
          La mesa ha quedado libre. Si queréis venir otro día, haz una reserva nueva.
        </p>
      )}

      {error !== null && <ErrorEnCristiano error={error} />}

      {viva && !reserva.confirmada && web.pideQueConfirmen && (
        <Boton
          tono="principal"
          tamano="l"
          ancho
          cargando={haciendo === 'confirmar'}
          textoCargando="Confirmando"
          onClick={() => {
            hacer('confirmar');
          }}
        >
          Sí, confirmo que vamos
        </Boton>
      )}

      {viva &&
        (seguro ? (
          <div className="flex flex-col gap-e3 rounded-grande border border-mal/40 bg-mal-suave p-e4">
            <p className="font-semibold text-texto">¿Cancelar la reserva?</p>
            <p className="text-secundario text-texto-suave">La mesa queda libre para otros.</p>
            <div className="grid grid-cols-2 gap-e2">
              <BotonRojo
                cargando={haciendo === 'cancelar'}
                textoCargando="Cancelando"
                alTocar={() => {
                  hacer('cancelar');
                }}
              >
                Sí, cancelarla
              </BotonRojo>
              <Boton
                tono="secundario"
                tamano="l"
                onClick={() => {
                  setSeguro(false);
                }}
              >
                No
              </Boton>
            </div>
          </div>
        ) : (
          <Boton
            tono="peligro"
            tamano="l"
            ancho
            onClick={() => {
              setSeguro(true);
            }}
          >
            Cancelar la reserva
          </Boton>
        ))}

      {viva && (
        <p className="text-secundario text-texto-suave">
          Para confirmarla o cancelarla más tarde, vuelve aquí y toca «Confirmarla» o «Cancelarla»
          con tu teléfono.
          {web.telefono !== null && (
            <>
              {' '}
              ¿Cambiar la hora o sois más? Llámales al{' '}
              <a
                className="font-semibold text-info underline"
                href={`tel:${web.telefono.replace(/\s/g, '')}`}
              >
                {web.telefono}
              </a>
              .
            </>
          )}
        </p>
      )}

      <Boton tono="secundario" tamano="l" ancho onClick={alVolver}>
        Hacer otra reserva
      </Boton>
    </section>
  );
}

// ═══ Las piezas ═══════════════════════════════════════════════════════════════

/** Cancelar, en rojo lleno: que no se confunda con nada (hay quien reserva con más de 80 años). */
function BotonRojo({
  cargando,
  textoCargando,
  alTocar,
  children,
}: {
  readonly cargando: boolean;
  readonly textoCargando: string;
  readonly alTocar: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={cargando}
      onClick={alTocar}
      className="min-h-[56px] w-full rounded-grande bg-mal px-e4 text-cuerpo font-bold text-white shadow-s1 transition-[transform,filter] hover:brightness-95 active:scale-[0.99] disabled:opacity-70"
    >
      {cargando ? `${textoCargando}…` : children}
    </button>
  );
}

function Paso({
  numero,
  titulo,
  children,
}: {
  readonly numero: number;
  readonly titulo: string;
  readonly children: ReactNode;
}) {
  const acento = useContext(Acento);
  return (
    <section className="flex flex-col gap-e3">
      <h2 className="flex items-center gap-e2 text-seccion font-bold">
        <span
          aria-hidden
          className="grid size-[26px] shrink-0 place-items-center rounded-redondo text-etiqueta font-bold"
          style={{ ...acento.fondo, color: acento.texto }}
        >
          {String(numero)}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Un botón que se elige (cuántos, el día, la hora): del color del local cuando está puesto. */
function Ficha({
  puesta,
  etiqueta,
  ancha = false,
  apagada = false,
  alTocar,
  children,
}: {
  readonly puesta: boolean;
  readonly etiqueta: string;
  readonly ancha?: boolean;
  /** Un día que el local cierra: se ve, tachado y sin poder elegirse. */
  readonly apagada?: boolean;
  readonly alTocar: () => void;
  readonly children: ReactNode;
}) {
  const acento = useContext(Acento);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={puesta}
      aria-label={etiqueta}
      disabled={apagada}
      onClick={alTocar}
      className={`flex shrink-0 flex-col items-center justify-center rounded-medio border font-semibold tabular-nums transition-[transform,box-shadow] active:scale-[0.97] ${
        ancha ? 'min-w-[68px] px-e3 py-e2' : 'min-h-[48px] min-w-[52px] px-e3'
      } ${
        puesta
          ? 'border-transparent'
          : apagada
            ? 'border-dashed border-borde bg-transparent text-texto-tenue'
            : 'border-borde bg-superficie text-texto hover:border-borde-fuerte'
      }`}
      style={
        puesta ? { ...acento.fondo, color: acento.texto, boxShadow: acento.sombra } : undefined
      }
    >
      {children}
    </button>
  );
}

const LOS_DIBUJOS = {
  bien: { signo: '✓', clases: 'bg-bien-suave text-bien' },
  parado: { signo: '!', clases: 'bg-atencion-suave text-atencion' },
} as const;

function UnEstado({
  dibujo,
  titulo,
  frase,
  children,
}: {
  readonly dibujo?: keyof typeof LOS_DIBUJOS;
  readonly titulo: string;
  readonly frase?: string;
  readonly children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e3 py-e2">
      {dibujo !== undefined && (
        <span
          aria-hidden
          className={`grid size-e7 place-items-center rounded-redondo text-pantalla font-bold ${LOS_DIBUJOS[dibujo].clases}`}
        >
          {LOS_DIBUJOS[dibujo].signo}
        </span>
      )}
      <h1 className="text-pantalla font-semibold leading-tight">{titulo}</h1>
      {frase !== undefined && <p className="text-secundario text-texto-suave">{frase}</p>}
      {children}
    </section>
  );
}
