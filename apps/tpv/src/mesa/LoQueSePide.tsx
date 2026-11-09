import { useMemo, useState } from 'react';
import {
  COMO_SE_VE_LO_MAS_PEDIDO,
  comoSeVeElNombre,
  elDestinoDeLaLinea,
  enSuOrden,
  esElPan,
  type ColorDeLaBotonera,
  type IconoDeLaSeccion,
} from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Boton,
  COMO_SE_VE_EL_COLOR,
  Cargando,
  EL_ICONO,
  EstadoVacio,
  LaBaldosaDeLaSeccion,
  filtrarPorParecido,
  laBaldosa,
} from '@estook/ui';
import type { LaCartaDeLaSala, LaMesa, PaginaDeLaSala, PlatoDeLaSala } from '../datos/tipos.ts';
import {
  anadirConLoElegido,
  anadirConNota,
  anadirPlato,
  type Borrador,
} from '../logica/comanda.ts';
import { elPaseDeFabrica } from '../logica/laCuenta.ts';
import { elNumeroDelPase, laPestanaDelPase, type PestanaDelPase } from '../logica/losPases.ts';
import { elAlergeno, euros } from '../logica/texto.ts';
import { irA } from '../navegar.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ElMenuDelDia } from './ElMenuDelDia.tsx';
import { LoQueSeElige } from './LoQueSeElige.tsx';
import { usarElAvisoDeAlergia } from '../ganchos/usarElAvisoDeAlergia.tsx';
import { usarPulsacionLarga } from '../ganchos/usarPulsacionLarga.ts';
import { LoDelProducto } from './LoDelProducto.tsx';

/**
 * **Lo que se pide** (T3, maqueta 9; Anexo 11.10 y 11.11): **la botonera por secciones**,
 * cada una **con su icono y su color** (R3, 0133), con **«Lo más pedido» la primera** solo si
 * el local marcó algo (lo marcado y lo más vendido a esta hora), el buscador que tolera
 * erratas y la sección **Menú** los días que hay menú. Cada producto es un botón con su
 * nombre entero, su precio, la franja del color de su sección y su foto; **agotado**, en gris
 * y sin tocar.
 *
 * **Lo que se toca va al pase marcado** en las pestañas de encima de la cuenta, y **el pase lo
 * elige siempre el camarero** (Richi, 28-oct): un plato no está atado a un pase, porque el
 * cliente pide en el orden que quiere («el chuletón, de segundo»). Cambiar de página no
 * cambia el pase. Cada botón va a quien lo prepara: la cocina, la barra o nadie.
 *
 * **Con alergia en la mesa** (0117), lo que la lleva sale en rojo en su botón, y al tocarlo
 * la sala avisa antes de pedirlo.
 *
 * **Mantener pulsado un botón** (la entrada nueva): «Se ha agotado» y pedirlo con una nota; lo
 * agotado, al mantenerlo, vuelve.
 */

const MENU = 'menu';
const LO_MAS_PEDIDO = 'mas-pedido';

export function LoQueSePide({
  carta,
  cargando,
  mesa,
  borrador,
  alCambiarElBorrador,
  marcada,
  alMarcar,
}: {
  readonly carta: LaCartaDeLaSala | undefined;
  readonly cargando: boolean;
  readonly mesa: LaMesa;
  readonly borrador: Borrador;
  readonly alCambiarElBorrador: (b: Borrador) => void;
  readonly marcada: PestanaDelPase;
  readonly alMarcar: (p: PestanaDelPase) => void;
}) {
  const { yo } = usarSesion();
  const paginas = useMemo(() => carta?.paginas ?? [], [carta]);
  const masPedido = carta?.loMasPedido ?? [];
  const menus = carta?.menus ?? [];
  const [pagina, setPagina] = useState<string | null>(null);
  const [buscando, setBuscando] = useState('');
  const [eligiendo, setEligiendo] = useState<PlatoDeLaSala | null>(null);
  const [pulsado, setPulsado] = useState<PlatoDeLaSala | null>(null);
  const alergias = mesa.alergias ?? [];
  const { avisar, elAviso } = usarElAvisoDeAlergia(alergias);

  // Sin elegir todavía: con «Bebidas» marcada (la mesa recién abierta), la primera página de lo
  // que prepara la barra, que se sientan y piden de beber; si no, «Lo más pedido»; si no, la
  // primera. «Pan y agua» no: el pan tiene su botón arriba («Pan para 4»).
  const normales = paginas.filter((g) => (g.deSiempre ?? null) === null);
  const deBeber = normales.find(
    (g) =>
      g.platos.length > 0 &&
      g.platos.every((p) => elDestinoDeLaLinea(p.quienLoPrepara) === 'barra'),
  );
  const deFabrica =
    marcada === 'bebidas' && deBeber !== undefined
      ? deBeber.id
      : masPedido.length > 0
        ? LO_MAS_PEDIDO
        : (normales[0]?.id ?? paginas[0]?.id);
  const elegida = pagina ?? deFabrica;
  const laDeAhora: PaginaDeLaSala | typeof MENU | typeof LO_MAS_PEDIDO | undefined =
    elegida === MENU && menus.length > 0
      ? MENU
      : elegida === LO_MAS_PEDIDO && masPedido.length > 0
        ? LO_MAS_PEDIDO
        : (paginas.find((g) => g.id === elegida) ?? paginas[0]);

  function abrir(cual: PaginaDeLaSala | typeof MENU | typeof LO_MAS_PEDIDO) {
    setBuscando('');
    if (cual === MENU || cual === LO_MAS_PEDIDO) {
      setPagina(cual);
      return;
    }
    setPagina(cual.id);
  }

  const encontradas = useMemo<readonly PlatoDeLaSala[]>(() => {
    const texto = buscando.trim();
    if (texto === '') return [];
    const vistos = new Set<string>();
    const todos = paginas
      .flatMap((g) => g.platos)
      .filter((p) => (vistos.has(p.id) ? false : (vistos.add(p.id), true)));
    return filtrarPorParecido(todos, texto, (p) => p.nombre);
  }, [buscando, paginas]);

  function comoVa(plato: PlatoDeLaSala) {
    const destino = elDestinoDeLaLinea(plato.quienLoPrepara);
    // Lo de la cocina, al pase marcado; con «Bebidas» marcada, al que toca: el último con
    // algo, o el 1.º.
    const pase =
      destino !== 'cocina'
        ? null
        : !mesa.porPases
          ? 1
          : (elNumeroDelPase(marcada) ?? elPaseDeFabrica(mesa, borrador));
    return { destino, pase };
  }

  /**
   * Lo añade, y si estaba marcada «Bebidas» y era comida, **marca el pase al que ha ido**: el
   * camarero ve dónde está y, si no es ese, toca otra pestaña.
   */
  function anadir(como: ReturnType<typeof comoVa>, nuevo: Borrador) {
    alCambiarElBorrador(nuevo);
    if (mesa.porPases && marcada === 'bebidas' && como.pase !== null) {
      alMarcar(laPestanaDelPase(como.pase));
    }
  }

  function pedir(plato: PlatoDeLaSala) {
    avisar(plato.nombre, plato.alergenos, () => {
      // Lo que pregunta algo (sus opciones, o cuánto pesa) abre su hoja; lo demás, un toque.
      if ((plato.grupos ?? []).length > 0 || plato.aPeso === true) {
        setEligiendo(plato);
        return;
      }
      const como = comoVa(plato);
      anadir(como, anadirPlato(borrador, plato, como));
    });
  }

  const cuantos = (p: PlatoDeLaSala) =>
    borrador
      .filter((l) => l.platoId === p.id && l.parteDe === null)
      .reduce((n, l) => n + l.cantidad, 0);

  // **«Pan para 4»** (0112): el pan se pregunta al sentarse y no se cobra si no se pide; con
  // un toque, uno por comensal. Sale mientras la mesa no tiene pan.
  const elPan = paginas.flatMap((g) => g.platos).find((p) => esElPan(p.nombre) && !p.agotado);
  const yaTienePan =
    elPan !== undefined &&
    (borrador.some((l) => l.platoId === elPan.id) ||
      mesa.platos.some((l) => l.platoId === elPan.id && l.estado !== 'quitado'));
  const comensales = mesa.personas ?? 0;
  function ponerElPan() {
    if (elPan === undefined) return;
    let nuevo = borrador;
    const destino = elDestinoDeLaLinea(elPan.quienLoPrepara);
    for (let i = 0; i < comensales; i += 1) {
      nuevo = anadirPlato(nuevo, elPan, { destino, pase: destino === 'cocina' ? 1 : null });
    }
    alCambiarElBorrador(nuevo);
  }

  // El icono y el color de la sección de cada plato: un botón sin foto lleva los suyos
  // (0143). Lo encontrado y «Lo más pedido» vienen de varias secciones.
  const deSuSeccion = useMemo(() => {
    const mapa = new Map<string, LaSeccionDelPlato>();
    for (const g of paginas) {
      const icono = g.icono ?? comoSeVeElNombre(g.nombre).icono;
      for (const p of g.platos) if (!mapa.has(p.id)) mapa.set(p.id, { icono, color: g.color });
    }
    return (p: PlatoDeLaSala): LaSeccionDelPlato =>
      mapa.get(p.id) ?? { icono: comoSeVeElNombre(p.nombre).icono, color: p.color };
  }, [paginas]);

  const sinNada = paginas.length === 0;
  const montaLaBotonera = puedeEditar(yo.permisos, 'accion.ajustes_del_tpv');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Las secciones, y el buscador que tolera erratas. */}
      <div className="flex flex-wrap items-center gap-e2 border-b border-borde bg-superficie px-e3 py-e2">
        <nav
          aria-label="Las secciones de la botonera"
          className="flex min-w-0 flex-1 gap-e1 overflow-x-auto [scrollbar-width:thin]"
        >
          {masPedido.length > 0 && (
            <BotonDeSeccion
              puesta={laDeAhora === LO_MAS_PEDIDO}
              icono={COMO_SE_VE_LO_MAS_PEDIDO.icono}
              color={COMO_SE_VE_LO_MAS_PEDIDO.color}
              rotulo="Lo más"
              onClick={() => {
                abrir(LO_MAS_PEDIDO);
              }}
            >
              Lo más pedido
            </BotonDeSeccion>
          )}
          {paginas.map((g) => (
            <BotonDeSeccion
              key={g.id}
              puesta={typeof laDeAhora === 'object' && laDeAhora.id === g.id}
              icono={g.icono ?? comoSeVeElNombre(g.nombre).icono}
              color={g.color}
              onClick={() => {
                abrir(g);
              }}
            >
              {g.nombre}
            </BotonDeSeccion>
          ))}
          {menus.length > 0 && (
            <BotonDeSeccion
              puesta={laDeAhora === MENU}
              icono="chef-hat"
              color="naranja"
              onClick={() => {
                abrir(MENU);
              }}
            >
              {menus.length === 1 ? 'Menú' : 'Menús'}
            </BotonDeSeccion>
          )}
        </nav>
        <input
          type="search"
          aria-label="Buscar un producto"
          placeholder="Buscar"
          value={buscando}
          onChange={(e) => {
            setBuscando(e.target.value);
          }}
          className="min-h-toque w-full rounded-redondo border border-borde bg-fondo px-e4 sm:w-[9rem]"
        />
      </div>

      {elPan !== undefined && !yaTienePan && comensales > 0 && buscando.trim() === '' && (
        <div className="flex items-center gap-e3 border-b border-borde bg-superficie px-e3 py-e2">
          <span className="text-secundario text-texto-suave">¿Pan para la mesa?</span>
          <button
            type="button"
            onClick={ponerElPan}
            className="min-h-toque rounded-redondo border-2 border-borde px-e4 font-semibold"
          >
            {elPan.nombre} para {String(comensales)} · {euros(elPan.precioCentimos * comensales)}
          </button>
        </div>
      )}

      {cargando ? (
        <div className="p-e6">
          <Cargando que="los productos" />
        </div>
      ) : buscando.trim() !== '' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-e3">
          {encontradas.length === 0 ? (
            <p className="py-e5 text-center text-texto-suave">
              Nada se parece a «{buscando.trim()}».
            </p>
          ) : (
            <LosProductos
              platos={encontradas}
              cuantos={cuantos}
              deSuSeccion={deSuSeccion}
              alergias={alergias}
              alPedir={pedir}
              alMantener={setPulsado}
            />
          )}
        </div>
      ) : laDeAhora === MENU ? (
        <ElMenuDelDia
          menus={menus}
          mesa={mesa}
          borrador={borrador}
          alCambiarElBorrador={alCambiarElBorrador}
          avisar={avisar}
        />
      ) : laDeAhora === LO_MAS_PEDIDO ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-e3">
          <LosProductos
            platos={masPedido}
            cuantos={cuantos}
            deSuSeccion={deSuSeccion}
            alergias={alergias}
            alPedir={pedir}
            alMantener={setPulsado}
          />
        </div>
      ) : sinNada || laDeAhora === undefined ? (
        <div className="p-e3">
          {carta?.montada === true ? (
            <EstadoVacio
              compacto
              titulo="Aún no hay botones"
              frase="Pon lo que se vende aquí en Ajustes del TPV › Productos y precios: toda la carta, lo que elijas o productos nuevos."
              dibujo="platos"
              {...(montaLaBotonera
                ? {
                    accion: (
                      <Boton
                        tono="principal"
                        onClick={() => {
                          irA('ajustes/productos');
                        }}
                      >
                        Montar los botones
                      </Boton>
                    ),
                  }
                : { sinAccionPorque: 'Los botones los monta quien lleva el local.' })}
            />
          ) : (
            <EstadoVacio
              compacto
              titulo="La carta está vacía"
              frase="Pon tus platos con su precio en Estook › Carta y saldrán aquí, sección a sección."
              dibujo="platos"
              sinAccionPorque="La carta se cambia en Estook, no en la sala."
            />
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-e3">
          <LosProductos
            platos={laDeAhora.platos}
            cuantos={cuantos}
            deSuSeccion={deSuSeccion}
            alergias={alergias}
            alPedir={pedir}
            alMantener={setPulsado}
          />
        </div>
      )}
      {eligiendo !== null && (
        <LoQueSeElige
          plato={eligiendo}
          alCerrar={() => {
            setEligiendo(null);
          }}
          alElegir={(elegido) => {
            const plato = eligiendo;
            setEligiendo(null);
            // Lo del plato ya se avisó al tocarlo: aquí, solo lo que añaden sus opciones.
            const deLasOpciones = new Set(elegido.opciones.map((o) => o.id));
            const anaden = (plato.grupos ?? [])
              .flatMap((g) => g.opciones)
              .filter((o) => deLasOpciones.has(o.id))
              .flatMap((o) => o.alergenos ?? [])
              .filter((a) => !plato.alergenos.includes(a));
            avisar(plato.nombre, anaden, () => {
              const como = comoVa(plato);
              anadir(como, anadirConLoElegido(borrador, plato, como, elegido));
            });
          }}
        />
      )}
      {pulsado !== null && (
        <LoDelProducto
          plato={pulsado}
          alCerrar={() => {
            setPulsado(null);
          }}
          alPedirConNota={(nota) => {
            const plato = pulsado;
            avisar(plato.nombre, plato.alergenos, () => {
              const como = comoVa(plato);
              anadir(como, anadirConNota(borrador, plato, como, nota));
            });
          }}
        />
      )}
      {elAviso}
    </div>
  );
}

/**
 * **Una sección, en baldosa** (R3, maqueta «Dentro de la mesa, pidiendo»): su icono sobre su
 * color, y debajo su nombre. La puesta, con un aro.
 */
function BotonDeSeccion({
  puesta,
  icono,
  color,
  rotulo,
  onClick,
  children,
}: {
  readonly puesta: boolean;
  readonly icono: IconoDeLaSeccion;
  readonly color: ColorDeLaBotonera | null;
  /** Lo que se lee debajo, si el nombre entero no cabe («Lo más»). */
  readonly rotulo?: string;
  readonly onClick: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={puesta}
      onClick={onClick}
      aria-label={children}
      title={children}
      className={[
        'flex w-[4.25rem] shrink-0 flex-col items-center gap-[3px] rounded-grande py-e1 sm:w-[4.75rem]',
        puesta ? 'font-bold text-texto' : 'font-semibold text-texto-suave',
      ].join(' ')}
    >
      <span
        className={[
          'rounded-grande',
          puesta ? 'outline outline-[3px] outline-offset-2 outline-texto' : '',
        ].join(' ')}
      >
        <LaBaldosaDeLaSeccion icono={icono} color={color} lado={42} />
      </span>
      <span className="w-full truncate text-center text-etiqueta leading-tight">
        {rotulo ?? children}
      </span>
    </button>
  );
}

interface LaSeccionDelPlato {
  readonly icono: IconoDeLaSeccion;
  readonly color: ColorDeLaBotonera | null;
}

function LosProductos({
  platos,
  cuantos,
  deSuSeccion,
  alergias,
  alPedir,
  alMantener,
}: {
  readonly platos: readonly PlatoDeLaSala[];
  readonly cuantos: (p: PlatoDeLaSala) => number;
  readonly deSuSeccion: (p: PlatoDeLaSala) => LaSeccionDelPlato;
  readonly alergias: readonly string[];
  readonly alPedir: (p: PlatoDeLaSala) => void;
  readonly alMantener: (p: PlatoDeLaSala) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {platos.map((p) => (
        <Producto
          key={p.id}
          plato={p}
          cuantos={cuantos(p)}
          seccion={deSuSeccion(p)}
          alergias={alergias}
          alPedir={() => {
            alPedir(p);
          }}
          alMantener={() => {
            alMantener(p);
          }}
        />
      ))}
    </div>
  );
}

/**
 * **Un producto** (el repaso del 8-nov, 0143): **la foto arriba**, la que se sube en Estook ›
 * Carta, y debajo su nombre y su precio; sin foto, **el icono de su sección sobre su color**,
 * nunca un hueco. El color de la sección, en una línea abajo; con alergia en la mesa, el
 * borde en rojo; lo que ya hay en la cuenta, su número en naranja.
 */
function Producto({
  plato,
  cuantos,
  seccion,
  alergias,
  alPedir,
  alMantener,
}: {
  readonly plato: PlatoDeLaSala;
  readonly cuantos: number;
  readonly seccion: LaSeccionDelPlato;
  readonly alergias: readonly string[];
  readonly alPedir: () => void;
  readonly alMantener: () => void;
}) {
  const deLaMesa = new Set(alergias);
  const lleva = plato.alergenos.some((a) => deLaMesa.has(a));
  // Lo agotado no se pide con un toque, pero se mantiene pulsado para que vuelva: por eso no
  // va desactivado, y su nombre dice «agotado».
  const pulsar = usarPulsacionLarga(alMantener, () => {
    if (!plato.agotado) alPedir();
  });
  const color = plato.color ?? seccion.color;
  const ElIcono = EL_ICONO[seccion.icono];
  return (
    <button
      type="button"
      {...pulsar}
      aria-label={`${plato.nombre}, ${euros(plato.precioCentimos)} €${plato.agotado ? ', agotado' : ''}`}
      className={[
        'relative flex flex-col overflow-hidden rounded-grande border-2 bg-superficie text-left transition-transform active:scale-[0.98]',
        cuantos > 0 ? 'border-naranja' : lleva ? 'border-mal' : 'border-transparent',
        plato.agotado ? 'opacity-50' : '',
      ].join(' ')}
    >
      {plato.miniatura !== null ? (
        <img
          src={plato.miniatura}
          alt=""
          className={[
            'h-[4.25rem] w-full object-cover sm:h-[5.25rem]',
            plato.agotado ? 'grayscale' : '',
          ].join(' ')}
          loading="lazy"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`flex h-[4.25rem] w-full items-center justify-center sm:h-[5.25rem] ${laBaldosa(color)}`}
        >
          <ElIcono size={30} strokeWidth={2} />
        </span>
      )}
      <span className="flex min-h-[3.25rem] flex-1 flex-col gap-[2px] px-e3 pb-e2 pt-e2">
        <span className="line-clamp-2 font-semibold leading-tight [overflow-wrap:anywhere]">
          {plato.nombre}
        </span>
        <span className="text-secundario font-semibold text-texto-suave">
          {plato.agotado
            ? 'Agotado'
            : `${euros(plato.precioCentimos)}${plato.aPeso === true ? ' el kilo' : ''}`}
        </span>
        {plato.alergenos.length > 0 && !plato.agotado && (
          <span className="truncate text-etiqueta text-texto-tenue">
            {lleva && '⚠ '}
            {enSuOrden(plato.alergenos).map((a, i) => (
              <span key={a} className={deLaMesa.has(a) ? 'font-bold text-mal' : ''}>
                {i > 0 ? ', ' : ''}
                {elAlergeno(a)}
              </span>
            ))}
          </span>
        )}
      </span>
      {color !== null && (
        <span aria-hidden="true" className={`h-[4px] w-full ${COMO_SE_VE_EL_COLOR[color].punto}`} />
      )}
      {cuantos > 0 && (
        <span className="absolute right-e1 top-e1 flex min-w-[1.75rem] items-center justify-center rounded-redondo bg-naranja px-e2 py-[2px] text-secundario font-bold text-sobre-naranja shadow">
          {cuantos}
        </span>
      )}
    </button>
  );
}
