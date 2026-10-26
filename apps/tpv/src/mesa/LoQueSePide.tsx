import { useMemo, useState } from 'react';
import { elDestinoDeLaLinea, enSuOrden, esElPan } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import { Boton, Cargando, EstadoVacio, filtrarPorParecido } from '@estook/ui';
import type { LaCartaDeLaSala, LaMesa, PaginaDeLaSala, PlatoDeLaSala } from '../datos/tipos.ts';
import { anadirConLoElegido, anadirPlato, type Borrador } from '../logica/comanda.ts';
import { elPaseDeFabrica } from '../logica/laCuenta.ts';
import { elNumeroDelPase, laPestanaDeLaPagina, type PestanaDelPase } from '../logica/losPases.ts';
import { elAlergeno, euros } from '../logica/texto.ts';
import { irA } from '../navegar.ts';
import { COMO_SE_VE_EL_COLOR } from '../productos/colores.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ElMenuDelDia } from './ElMenuDelDia.tsx';
import { LoQueSeElige } from './LoQueSeElige.tsx';
import { usarElAvisoDeAlergia } from '../ganchos/usarElAvisoDeAlergia.tsx';

/**
 * **Lo que se pide** (T3, maqueta 9; Anexo 11.10 y 11.11): **la botonera por páginas**, con
 * **«Lo más pedido» la primera** (lo fijado y lo más vendido a esta hora), el buscador que
 * tolera erratas y la página **Menú** los días que hay menú. Cada producto es un botón con
 * su nombre entero, su precio, su color y su foto; **agotado**, en gris y sin tocar.
 *
 * **Lo que se toca va al pase marcado** en las pestañas de encima de la cuenta, y **al
 * cambiar de página se marca solo el de esa página** («¿En qué pase sale?»). Cada botón va
 * a quien lo prepara: la cocina, la barra o nadie.
 *
 * **Con alergia en la mesa** (0117), lo que la lleva sale en rojo en su botón, y al tocarlo
 * la sala avisa antes de pedirlo.
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
  const alergias = mesa.alergias ?? [];
  const { avisar, elAviso } = usarElAvisoDeAlergia(alergias);

  // Sin elegir todavía, la página del pase marcado (en una mesa recién abierta, la de las
  // bebidas); si no hay, «Lo más pedido»; si no, la primera.
  // «Pan y agua» no: el pan tiene su botón arriba («Pan para 4»).
  const deFabrica =
    paginas.find((g) => (g.deSiempre ?? null) === null && laPestanaDeLaPagina(g.pase) === marcada)
      ?.id ?? (masPedido.length > 0 ? LO_MAS_PEDIDO : paginas[0]?.id);
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
    // **Se marca solo el pase de esa página**, en una mesa por pases.
    if (mesa.porPases) alMarcar(laPestanaDeLaPagina(cual.pase));
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
    // Lo de la cocina, al pase marcado; con «Bebidas» marcada, al suyo (el de su página).
    const pase =
      destino !== 'cocina'
        ? null
        : !mesa.porPases
          ? 1
          : (elNumeroDelPase(marcada) ??
            elNumeroDelPase(laPestanaDeLaPagina(plato.pase)) ??
            elPaseDeFabrica(mesa, borrador));
    return { destino, pase };
  }

  function pedir(plato: PlatoDeLaSala) {
    avisar(plato.nombre, plato.alergenos, () => {
      // Lo que pregunta algo (sus opciones, o cuánto pesa) abre su hoja; lo demás, un toque.
      if ((plato.grupos ?? []).length > 0 || plato.aPeso === true) {
        setEligiendo(plato);
        return;
      }
      alCambiarElBorrador(anadirPlato(borrador, plato, comoVa(plato)));
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

  const sinNada = paginas.length === 0;
  const montaLaBotonera = puedeEditar(yo.permisos, 'accion.ajustes_del_tpv');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Las páginas, y el buscador que tolera erratas. */}
      <div className="flex flex-wrap items-center gap-e2 border-b border-borde bg-superficie px-e3 py-e2">
        <nav
          aria-label="Las páginas de la botonera"
          className="flex min-w-0 flex-1 gap-e1 overflow-x-auto"
        >
          {masPedido.length > 0 && (
            <BotonDePagina
              puesta={laDeAhora === LO_MAS_PEDIDO}
              color={null}
              onClick={() => {
                abrir(LO_MAS_PEDIDO);
              }}
            >
              Lo más pedido
            </BotonDePagina>
          )}
          {paginas.map((g) => (
            <BotonDePagina
              key={g.id}
              puesta={typeof laDeAhora === 'object' && laDeAhora.id === g.id}
              color={g.color}
              onClick={() => {
                abrir(g);
              }}
            >
              {g.nombre}
            </BotonDePagina>
          ))}
          {menus.length > 0 && (
            <BotonDePagina
              puesta={laDeAhora === MENU}
              color={null}
              onClick={() => {
                abrir(MENU);
              }}
            >
              {menus.length === 1 ? 'Menú' : 'Menús'}
            </BotonDePagina>
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
              alergias={alergias}
              alPedir={pedir}
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
          <LosProductos platos={masPedido} cuantos={cuantos} alergias={alergias} alPedir={pedir} />
        </div>
      ) : sinNada || laDeAhora === undefined ? (
        <div className="p-e3">
          {carta?.montada === true ? (
            <EstadoVacio
              compacto
              titulo="Aún no hay botones"
              frase="Pon lo que se vende aquí en Ajustes del TPV › Productos: toda la carta, lo que elijas o productos nuevos."
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
              frase="Pon tus platos con su precio en Estook › Carta y saldrán aquí, una página por sección."
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
            alergias={alergias}
            alPedir={pedir}
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
              alCambiarElBorrador(anadirConLoElegido(borrador, plato, comoVa(plato), elegido));
            });
          }}
        />
      )}
      {elAviso}
    </div>
  );
}

function BotonDePagina({
  puesta,
  color,
  onClick,
  children,
}: {
  readonly puesta: boolean;
  readonly color: PaginaDeLaSala['color'];
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={puesta}
      onClick={onClick}
      className={[
        'flex min-h-toque shrink-0 items-center gap-e2 rounded-redondo px-e4 font-semibold',
        puesta ? 'bg-charcoal font-bold' : 'bg-fondo text-texto-suave',
      ].join(' ')}
    >
      {color !== null && (
        <span
          aria-hidden="true"
          className={`size-[0.6rem] shrink-0 rounded-redondo ${COMO_SE_VE_EL_COLOR[color].punto}`}
        />
      )}
      {children}
    </button>
  );
}

function LosProductos({
  platos,
  cuantos,
  alergias,
  alPedir,
}: {
  readonly platos: readonly PlatoDeLaSala[];
  readonly cuantos: (p: PlatoDeLaSala) => number;
  readonly alergias: readonly string[];
  readonly alPedir: (p: PlatoDeLaSala) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-e2 lg:grid-cols-3 xl:grid-cols-4">
      {platos.map((p) => (
        <Producto
          key={p.id}
          plato={p}
          cuantos={cuantos(p)}
          alergias={alergias}
          alPedir={() => {
            alPedir(p);
          }}
        />
      ))}
    </div>
  );
}

function Producto({
  plato,
  cuantos,
  alergias,
  alPedir,
}: {
  readonly plato: PlatoDeLaSala;
  readonly cuantos: number;
  readonly alergias: readonly string[];
  readonly alPedir: () => void;
}) {
  const deLaMesa = new Set(alergias);
  const lleva = plato.alergenos.some((a) => deLaMesa.has(a));
  return (
    <button
      type="button"
      disabled={plato.agotado}
      onClick={alPedir}
      aria-label={`${plato.nombre}, ${euros(plato.precioCentimos)} €${plato.agotado ? ', agotado' : ''}`}
      className={[
        'relative flex min-h-[4.5rem] items-stretch gap-e2 overflow-hidden rounded-grande border bg-superficie text-left transition-transform active:scale-[0.98] sm:min-h-[5.5rem]',
        cuantos > 0 ? 'border-naranja' : lleva ? 'border-mal' : 'border-borde',
        plato.color === null ? '' : `border-l-[6px] ${COMO_SE_VE_EL_COLOR[plato.color].franja}`,
        plato.agotado ? 'opacity-50' : '',
      ].join(' ')}
    >
      {plato.miniatura !== null && (
        <img
          src={plato.miniatura}
          alt=""
          className="w-[3.5rem] shrink-0 object-cover sm:w-[4.5rem]"
          loading="lazy"
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-[2px] py-e2 pl-e3 pr-e2">
        <span className="line-clamp-2 font-semibold leading-tight [overflow-wrap:anywhere]">
          {plato.nombre}
        </span>
        <span className="text-secundario text-texto-suave">
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
      {cuantos > 0 && (
        <span className="absolute right-e1 top-e1 rounded-redondo bg-naranja px-e2 text-etiqueta font-bold text-sobre-naranja">
          {cuantos}
        </span>
      )}
    </button>
  );
}
