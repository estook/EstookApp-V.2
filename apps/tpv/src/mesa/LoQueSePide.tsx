import { useMemo, useState } from 'react';
import { Cargando, EstadoVacio, filtrarPorParecido } from '@estook/ui';
import type { LaCartaDeLaSala, LaMesa, PlatoDeLaSala, SeccionDeLaSala } from '../datos/tipos.ts';
import { anadirPlato, type Borrador } from '../logica/comanda.ts';
import { elPaseDeFabrica } from '../logica/laCuenta.ts';
import { elNumeroDelPase, laPestanaDeLaSeccion, type PestanaDelPase } from '../logica/losPases.ts';
import { euros } from '../logica/texto.ts';
import { ElMenuDelDia } from './ElMenuDelDia.tsx';

/**
 * **Lo que se pide** (T2, maqueta 9; Anexo 11.10): la carta **por páginas, una por
 * sección** (hasta que T3 traiga la botonera), y la página **Menú** los días que hay
 * menú. Cada plato es un botón con su nombre entero, su precio y su foto; **agotado**, en
 * gris y sin tocar.
 *
 * **Lo que se toca va al pase marcado** en las pestañas de encima de la cuenta; **al
 * cambiar de página se marca solo el de esa página** (Entrantes, el 1.º; Principales, el
 * 2.º; las bebidas, Bebidas). Lo de beber va siempre a la barra, sin pase.
 */

const MENU = 'menu';

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
  const secciones = useMemo(() => carta?.secciones ?? [], [carta]);
  const menus = carta?.menus ?? [];
  const [pagina, setPagina] = useState<string | null>(null);
  const [buscando, setBuscando] = useState('');

  const clave = (s: SeccionDeLaSala) => s.id ?? 'sin-seccion';
  // Sin elegir todavía, la página del pase marcado: en una mesa recién abierta, las bebidas.
  const deFabrica =
    secciones.find((s) => laPestanaDeLaSeccion(s) === marcada) ??
    secciones.find((s) => !s.esBebida) ??
    secciones[0];
  const laDeAhora =
    pagina === MENU && menus.length > 0
      ? MENU
      : (secciones.find((s) => clave(s) === pagina) ?? deFabrica);

  function abrir(cual: SeccionDeLaSala | typeof MENU) {
    setBuscando('');
    if (cual === MENU) {
      setPagina(MENU);
      return;
    }
    setPagina(clave(cual));
    // **Se marca solo el pase de esa página**, en una mesa por pases.
    const suya = laPestanaDeLaSeccion(cual);
    if (suya !== null && mesa.porPases) alMarcar(suya);
  }

  const encontradas = useMemo<readonly (PlatoDeLaSala & { readonly esBebida: boolean })[]>(() => {
    const texto = buscando.trim();
    if (texto === '') return [];
    const todos = secciones.flatMap((s) => s.platos.map((p) => ({ ...p, esBebida: s.esBebida })));
    return filtrarPorParecido(todos, texto, (p) => p.nombre);
  }, [buscando, secciones]);

  function pedir(plato: PlatoDeLaSala, esBebida: boolean) {
    const pase = esBebida
      ? null
      : mesa.porPases
        ? (elNumeroDelPase(marcada) ?? elPaseDeFabrica(mesa, borrador))
        : 1;
    alCambiarElBorrador(
      anadirPlato(borrador, plato, { destino: esBebida ? 'barra' : 'cocina', pase }),
    );
  }

  const cuantos = (p: PlatoDeLaSala) =>
    borrador
      .filter((l) => l.platoId === p.id && l.parteDe === null)
      .reduce((n, l) => n + l.cantidad, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Las páginas, y el buscador que tolera erratas. */}
      <div className="flex flex-wrap items-center gap-e2 border-b border-borde bg-superficie px-e3 py-e2">
        <nav
          aria-label="Las páginas de la carta"
          className="flex min-w-0 flex-1 gap-e1 overflow-x-auto"
        >
          {secciones.map((s) => (
            <BotonDePagina
              key={clave(s)}
              puesta={
                laDeAhora !== MENU && laDeAhora !== undefined && clave(laDeAhora) === clave(s)
              }
              onClick={() => {
                abrir(s);
              }}
            >
              {s.nombre}
            </BotonDePagina>
          ))}
          {menus.length > 0 && (
            <BotonDePagina
              puesta={laDeAhora === MENU}
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
          aria-label="Buscar un plato"
          placeholder="Buscar"
          value={buscando}
          onChange={(e) => {
            setBuscando(e.target.value);
          }}
          className="min-h-toque w-full rounded-redondo border border-borde bg-fondo px-e4 sm:w-[9rem]"
        />
      </div>

      {cargando ? (
        <div className="p-e6">
          <Cargando que="la carta" />
        </div>
      ) : buscando.trim() !== '' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-e3">
          {encontradas.length === 0 ? (
            <p className="py-e5 text-center text-texto-suave">
              Nada se parece a «{buscando.trim()}».
            </p>
          ) : (
            <LosPlatos
              platos={encontradas}
              cuantos={cuantos}
              alPedir={(p) => {
                pedir(p, p.esBebida);
              }}
            />
          )}
        </div>
      ) : laDeAhora === MENU ? (
        <ElMenuDelDia
          menus={menus}
          mesa={mesa}
          borrador={borrador}
          alCambiarElBorrador={alCambiarElBorrador}
        />
      ) : laDeAhora === undefined ? (
        <div className="p-e3">
          <EstadoVacio
            compacto
            titulo="La carta está vacía"
            frase="Pon tus platos con su precio en Estook › Carta y saldrán aquí, una página por sección."
            dibujo="platos"
            sinAccionPorque="La carta se cambia en Estook, no en la sala."
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-e3">
          <LosPlatos
            platos={laDeAhora.platos}
            cuantos={cuantos}
            alPedir={(p) => {
              pedir(p, laDeAhora.esBebida);
            }}
          />
        </div>
      )}
    </div>
  );
}

function BotonDePagina({
  puesta,
  onClick,
  children,
}: {
  readonly puesta: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={puesta}
      onClick={onClick}
      className={[
        'min-h-toque shrink-0 rounded-redondo px-e4 font-semibold',
        puesta ? 'bg-charcoal font-bold' : 'bg-fondo text-texto-suave',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function LosPlatos<P extends PlatoDeLaSala>({
  platos,
  cuantos,
  alPedir,
}: {
  readonly platos: readonly P[];
  readonly cuantos: (p: P) => number;
  readonly alPedir: (p: P) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-e2 lg:grid-cols-3 xl:grid-cols-4">
      {platos.map((p) => (
        <Plato
          key={p.id}
          plato={p}
          cuantos={cuantos(p)}
          alPedir={() => {
            alPedir(p);
          }}
        />
      ))}
    </div>
  );
}

function Plato({
  plato,
  cuantos,
  alPedir,
}: {
  readonly plato: PlatoDeLaSala;
  readonly cuantos: number;
  readonly alPedir: () => void;
}) {
  return (
    <button
      type="button"
      disabled={plato.agotado}
      onClick={alPedir}
      aria-label={`${plato.nombre}, ${euros(plato.precioCentimos)} €${plato.agotado ? ', agotado' : ''}`}
      className={[
        'relative flex min-h-[4.5rem] items-stretch gap-e2 overflow-hidden rounded-grande border bg-superficie text-left transition-transform active:scale-[0.98] sm:min-h-[5.5rem]',
        cuantos > 0 ? 'border-naranja' : 'border-borde',
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
          {plato.agotado ? 'Agotado' : euros(plato.precioCentimos)}
        </span>
        {plato.alergenos.length > 0 && !plato.agotado && (
          <span className="truncate text-etiqueta text-texto-tenue">
            {plato.alergenos.join(', ')}
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
