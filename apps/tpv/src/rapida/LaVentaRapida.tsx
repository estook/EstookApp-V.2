import { useEffect, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import type { FormaDePago } from '@estook/dominio';
import { Aviso, ErrorEnCristiano, Hoja } from '@estook/ui';
import {
  IconoCobrar,
  IconoDinero,
  IconoEditar,
  IconoMovil,
  IconoPrisa,
  IconoRejilla,
  type Icono,
} from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  usarAcciones,
  usarAlSegundo,
  usarElPlano,
  usarLaCarta,
  usarLaMesa,
} from '../ganchos/usarLaSala.ts';
import { usarLaCaja } from '../ganchos/usarLaCaja.ts';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { LoQueSePide } from '../mesa/LoQueSePide.tsx';
import { LaCuenta } from '../mesa/LaCuenta.tsx';
import { Cobrar } from '../caja/Cobrar.tsx';
import { losGruposDeLaCuenta } from '../logica/laCuenta.ts';
import {
  comoPedido,
  guardarBorrador,
  leerBorrador,
  loQueVale,
  type Borrador,
} from '../logica/comanda.ts';
import type { PestanaDelPase } from '../logica/losPases.ts';
import { eurosConSimbolo } from '../logica/texto.ts';
import { estamosSinInternet } from '../sinInternet/laConexion.ts';
import { irAlPlano } from '../navegar.ts';
import { laVentaSinMesa, LOS_METODOS_DE_LA_RAPIDA } from './sinMesa.ts';
import type { MesaDelPlano } from '../datos/tipos.ts';

/**
 * **La venta rápida** (el rediseño, 0148; Anexo 3.1; Richi, 17-nov: «ticar y cobrar, sin comensales,
 * para los que lo piden directo en la barra; la pizzería de mi amigo suele ser así»).
 *
 * A la izquierda, la botonera de siempre; a la derecha, el ticket, **«Aquí · Para llevar»** y,
 * abajo, **un toque por método**: efectivo, tarjeta o Bizum (si el local lo usa). Cobrar abre la
 * cuenta, la manda a cocina y a la barra y cobra con el cobro de siempre (0144), ya en ese método.
 * Lo opcional, al final: **el nombre o el número** para cantarlo, y **«Pasar a una mesa»**, que se
 * lleva lo ticado a esa mesa sin cobrar.
 *
 * Lo ticado se queda en el aparato hasta cobrar o pasarlo: si se bloquea a medias, sigue ahí. **Sin
 * internet todavía no se cobra** (T7): se dice, y lo ticado no se pierde.
 */
export function LaVentaRapida() {
  const { aparato } = usarSesion();
  const conectado = usarAlSegundo();
  const carta = usarLaCarta();
  const plano = usarElPlano(conectado);
  const caja = usarLaCaja();
  const ejecutar = usarAcciones();
  const clave = `venta-rapida-${aparato.terminalId}`;
  const [borrador, setBorrador] = useState<Borrador>(() => leerBorrador(clave));
  const [tipo, setTipo] = useState<'barra' | 'para_llevar'>('barra');
  const [nombre, setNombre] = useState('');
  const [poniendoNombre, setPoniendoNombre] = useState(false);
  const [pasando, setPasando] = useState(false);
  const [marcada, setMarcada] = useState<PestanaDelPase>('bebidas');
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState<{
    readonly cuentaId: string;
    readonly forma: FormaDePago;
  } | null>(null);

  useEffect(() => {
    guardarBorrador(clave, borrador);
  }, [clave, borrador]);

  const deNuevo = () => {
    setBorrador([]);
    setNombre('');
    setTipo('barra');
    setFallo(null);
  };

  if (cobrando !== null) {
    return (
      <ElCobro
        cuentaId={cobrando.cuentaId}
        forma={cobrando.forma}
        alAcabar={() => {
          setCobrando(null);
          deNuevo();
          setAviso('Cobrado. Otra venta.');
        }}
        alVolver={() => {
          setCobrando(null);
          deNuevo();
          setAviso('Sin cobrar: la venta queda abierta en «Para llevar».');
        }}
      />
    );
  }

  const mesa = laVentaSinMesa(tipo);
  const grupos = losGruposDeLaCuenta(mesa, borrador);
  const total = loQueVale(borrador);
  const vacia = borrador.length === 0;
  const formas = (caja.data?.formas ?? ['efectivo', 'tarjeta']).filter((f) =>
    LOS_METODOS_DE_LA_RAPIDA.includes(f),
  );

  /** Abre la cuenta y la manda: lo de cobrar y lo de pasarla, igual. */
  async function abrirYMandar(): Promise<string | null> {
    if (estamosSinInternet()) {
      setAviso(
        'Sin internet la venta rápida todavía no cobra. Lo ticado se queda aquí; ábrelo en «Para llevar» si no puede esperar.',
      );
      return null;
    }
    setOcupado(true);
    setFallo(null);
    setAviso(null);
    const cuentaId = crypto.randomUUID();
    const abierta = await ejecutar('abrir_mesa', {
      cuenta_id: cuentaId,
      tipo,
      por_pases: false,
      ...(nombre.trim() === '' ? {} : { nombre: nombre.trim() }),
    });
    if (!abierta.ok) {
      setOcupado(false);
      setFallo(abierta.error);
      return null;
    }
    const mandada = await ejecutar(
      'mandar_a_cocina',
      { cuenta_id: cuentaId, platos: comoPedido(borrador) },
      undefined,
      undefined,
      ['sala', 'la_mesa', cuentaId],
    );
    setOcupado(false);
    if (!mandada.ok) {
      setFallo(mandada.error);
      return null;
    }
    return cuentaId;
  }

  async function cobrar(forma: FormaDePago) {
    const cuentaId = await abrirYMandar();
    if (cuentaId !== null) setCobrando({ cuentaId, forma });
  }

  async function pasarA(m: MesaDelPlano) {
    setPasando(false);
    // Una mesa ocupada se lleva lo ticado como un pedido más; una libre, la venta entera.
    if (m.cuenta !== null) {
      setOcupado(true);
      const hecho = await ejecutar(
        'mandar_a_cocina',
        { cuenta_id: m.cuenta.cuentaId, platos: comoPedido(borrador) },
        undefined,
        undefined,
        ['sala', 'la_mesa', m.cuenta.cuentaId],
      );
      setOcupado(false);
      if (!hecho.ok) {
        setFallo(hecho.error);
        return;
      }
    } else {
      const cuentaId = await abrirYMandar();
      if (cuentaId === null) return;
      const movida = await ejecutar('cambiar_de_mesa', { cuenta_id: cuentaId, mesa_id: m.id });
      if (!movida.ok) {
        setFallo(movida.error);
        return;
      }
    }
    deNuevo();
    irAlPlano();
  }

  const mesas = (plano.data?.zonas ?? []).flatMap((z) => z.mesas);

  /** El pie de la venta: lo opcional, el total y un toque por método. */
  const elPie = (donde: string) => (
    <div className={`flex flex-col gap-e3 border-t border-borde bg-superficie p-e4 ${donde}`}>
      {aviso !== null && (
        <p role="status" className="text-center text-secundario font-semibold text-texto-suave">
          {aviso}
        </p>
      )}
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      <div className="grid grid-cols-2 gap-e2">
        <BotonOpcional
          icono={IconoEditar}
          texto={nombre.trim() === '' ? 'Nombre o número' : 'Cambiar el nombre'}
          onClick={() => {
            setPoniendoNombre(true);
          }}
        />
        <BotonOpcional
          icono={IconoRejilla}
          texto="Pasar a una mesa"
          apagado={vacia || ocupado}
          onClick={() => {
            setPasando(true);
          }}
        />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-bold text-texto-suave">Cobrar</span>
        <span className="text-cifra tabular-nums">{eurosConSimbolo(total)}</span>
      </div>
      <div
        className="grid gap-e2"
        style={{ gridTemplateColumns: `repeat(${String(formas.length)}, minmax(0, 1fr))` }}
      >
        {formas.map((f) => (
          <BotonDelMetodo
            key={f}
            forma={f}
            apagado={vacia || ocupado}
            onClick={() => {
              void cobrar(f);
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-pantalla flex-col bg-fondo text-texto md:h-pantalla md:min-h-0">
      <LaBarraDeArriba />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label="Lo que se vende" className="flex min-h-0 flex-1 flex-col">
          <LoQueSePide
            carta={carta.data}
            cargando={carta.isLoading}
            mesa={mesa}
            borrador={borrador}
            alCambiarElBorrador={(b) => {
              setBorrador(b);
              setAviso(null);
            }}
            marcada={marcada}
            alMarcar={setMarcada}
          />
        </section>

        <aside
          aria-label="La venta rápida"
          className="flex shrink-0 flex-col border-borde bg-superficie md:w-[24rem] md:border-l"
        >
          <header className="flex items-center gap-e3 border-b border-borde px-e4 py-e3">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-medio bg-mesa-te-toca text-sobre-mesa-te-toca"
            >
              <IconoPrisa size={22} />
            </span>
            <h1 className="flex-1 text-pantalla font-bold">
              Venta rápida{nombre.trim() === '' ? '' : ` · ${nombre.trim()}`}
            </h1>
          </header>
          <div
            role="radiogroup"
            aria-label="Dónde se lo toman"
            className="mx-e4 mt-e3 grid grid-cols-2 gap-e1 rounded-grande border border-borde bg-fondo p-e1"
          >
            {(
              [
                ['barra', 'Aquí'],
                ['para_llevar', 'Para llevar'],
              ] as const
            ).map(([cual, texto]) => (
              <button
                key={cual}
                type="button"
                role="radio"
                aria-checked={tipo === cual}
                onClick={() => {
                  setTipo(cual);
                }}
                className={[
                  'min-h-toque rounded-medio font-bold',
                  tipo === cual ? 'bg-texto text-superficie' : 'text-texto-suave',
                ].join(' ')}
              >
                {texto}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-e4 py-e2">
            {vacia ? (
              <p className="py-e6 text-center text-texto-suave">Toca un producto para empezar.</p>
            ) : (
              <LaCuenta
                grupos={grupos}
                borrador={borrador}
                alCambiarElBorrador={setBorrador}
                porPases={false}
                pases={[]}
                tocaMarchar={null}
                alMarchar={() => undefined}
              />
            )}
          </div>

          {elPie('hidden md:flex')}
        </aside>
      </div>
      {/* En el móvil, el total y el cobro siempre a la vista, al pie: sin bajar para cobrar. */}
      {elPie('sticky bottom-0 z-10 md:hidden')}

      <Hoja
        abierta={poniendoNombre}
        ajustada
        titulo="Nombre o número"
        alCerrar={() => {
          setPoniendoNombre(false);
        }}
      >
        <form
          className="flex flex-col gap-e3 pb-e2"
          onSubmit={(e) => {
            e.preventDefault();
            setPoniendoNombre(false);
          }}
        >
          <label htmlFor="nombre-de-la-venta" className="font-semibold">
            Para cantarlo cuando salga
          </label>
          <input
            id="nombre-de-la-venta"
            value={nombre}
            maxLength={40}
            autoFocus
            onChange={(e) => {
              setNombre(e.target.value);
            }}
            placeholder="Laura, o el 23"
            className="min-h-toque rounded-grande border border-borde bg-fondo px-e3 text-cuerpo"
          />
          <button
            type="submit"
            className="min-h-toque-cocina rounded-grande bg-naranja font-bold text-sobre-naranja"
          >
            Listo
          </button>
        </form>
      </Hoja>

      <Hoja
        abierta={pasando}
        ajustada
        titulo="Pasar a una mesa"
        alCerrar={() => {
          setPasando(false);
        }}
      >
        <p className="mb-e3 text-secundario text-texto-suave">
          Lo ticado se va a esa mesa, a cocina y a la barra, sin cobrar. Si está libre, se abre.
        </p>
        {mesas.length === 0 ? (
          <Aviso tono="info" titulo="Sin mesas en el plano">
            Dibuja la sala en Ajustes para poder pasar una venta a una mesa.
          </Aviso>
        ) : (
          <div className="grid grid-cols-3 gap-e2 pb-e2 sm:grid-cols-4">
            {mesas.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Mesa ${m.nombre}: ${m.cuenta === null ? 'libre' : 'ocupada'}`}
                onClick={() => {
                  void pasarA(m);
                }}
                className={[
                  'flex min-h-[4.5rem] flex-col items-center justify-center rounded-grande font-bold',
                  m.cuenta === null
                    ? 'border-2 border-mesa-libre-borde bg-mesa-libre text-sobre-mesa-libre'
                    : 'bg-mesa-esperando text-sobre-mesa-esperando',
                ].join(' ')}
              >
                <span className="text-pantalla leading-none">{m.nombre}</span>
                <span className="text-etiqueta">{m.cuenta === null ? 'Libre' : 'Ocupada'}</span>
              </button>
            ))}
          </div>
        )}
      </Hoja>
    </div>
  );
}

/** El cobro de siempre (0144), con la cuenta ya abierta y mandada, empezando en el método tocado. */
function ElCobro({
  cuentaId,
  forma,
  alAcabar,
  alVolver,
}: {
  readonly cuentaId: string;
  readonly forma: FormaDePago;
  readonly alAcabar: () => void;
  readonly alVolver: () => void;
}) {
  const mesa = usarLaMesa(cuentaId, usarAlSegundo());
  return (
    <Cobrar
      mesa={mesa.data}
      sinMandarAqui={0}
      formaDeEntrada={forma}
      textoDeAcabar="Listo · otra venta"
      alVolver={alVolver}
      alAcabar={alAcabar}
    />
  );
}

const COMO_SE_VE_EL_METODO: Readonly<
  Record<'efectivo' | 'tarjeta' | 'bizum', { texto: string; icono: Icono; color: string }>
> = {
  efectivo: {
    texto: 'Efectivo',
    icono: IconoDinero,
    color: 'bg-mesa-comiendo text-sobre-mesa-comiendo',
  },
  tarjeta: {
    texto: 'Tarjeta',
    icono: IconoCobrar,
    color: 'bg-mesa-esperando text-sobre-mesa-esperando',
  },
  bizum: { texto: 'Bizum', icono: IconoMovil, color: 'border border-borde bg-charcoal text-texto' },
};

function BotonDelMetodo({
  forma,
  apagado,
  onClick,
}: {
  readonly forma: FormaDePago;
  readonly apagado: boolean;
  readonly onClick: () => void;
}) {
  const como =
    forma === 'efectivo' || forma === 'tarjeta' || forma === 'bizum'
      ? COMO_SE_VE_EL_METODO[forma]
      : COMO_SE_VE_EL_METODO.tarjeta;
  const Dibujo = como.icono;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={apagado}
      aria-label={`Cobrar en ${como.texto.toLowerCase()}`}
      className={[
        'flex min-h-[4.5rem] flex-col items-center justify-center gap-e1 rounded-grande font-bold disabled:opacity-45',
        como.color,
      ].join(' ')}
    >
      <Dibujo size={24} aria-hidden />
      {como.texto}
    </button>
  );
}

function BotonOpcional({
  icono: Dibujo,
  texto,
  apagado = false,
  onClick,
}: {
  readonly icono: Icono;
  readonly texto: string;
  readonly apagado?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={apagado}
      className="flex min-h-toque items-center justify-center gap-e2 rounded-grande border border-dashed border-borde-fuerte px-e2 text-secundario font-bold text-texto-suave disabled:opacity-45"
    >
      <Dibujo size={18} aria-hidden />
      {texto}
    </button>
  );
}
