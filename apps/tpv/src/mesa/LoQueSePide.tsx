import { useMemo, useState, type ReactNode } from 'react';
import { Cargando, EstadoVacio, filtrarPorParecido } from '@estook/ui';
import type { LaCartaDeLaSala, LaMesa, PlatoDeLaSala, SeccionDeLaSala } from '../datos/tipos.ts';
import { anadirPlato, type Borrador } from '../logica/comanda.ts';
import { elPaseDeFabrica, losPasesQueSeEligen } from '../logica/laCuenta.ts';
import { euros } from '../logica/texto.ts';
import { ElegirPase } from './LaCuenta.tsx';
import { ElMenuDelDia } from './ElMenuDelDia.tsx';

/**
 * Lo que se pide (0106): **Bebidas · Carta · Menú del día**, en el orden en que se come.
 * Primero se sientan y piden de beber; luego la comida, por secciones y con su foto; y el
 * menú, aparte, que se pide entero. El postre y el café, al final, en su sección.
 *
 * Lo de bebidas va a la barra y no tiene pase. Lo de comida va en el pase que diga «Va
 * en el»: de fábrica, el 1.º en una mesa sin nada y, si no, el último con algo.
 */

type Pestana = 'bebidas' | 'carta' | 'menu';

export function LoQueSePide({
  carta,
  cargando,
  mesa,
  borrador,
  alCambiarElBorrador,
}: {
  readonly carta: LaCartaDeLaSala | undefined;
  readonly cargando: boolean;
  readonly mesa: LaMesa;
  readonly borrador: Borrador;
  readonly alCambiarElBorrador: (b: Borrador) => void;
}) {
  // Una mesa sin nada empieza por las bebidas, como en la sala.
  const [pestana, setPestana] = useState<Pestana>(
    mesa.platos.length === 0 && borrador.length === 0 ? 'bebidas' : 'carta',
  );
  const [pase, setPase] = useState<number | null>(null);
  const [buscando, setBuscando] = useState('');
  const elPase = pase ?? elPaseDeFabrica(mesa, borrador);

  const secciones = carta?.secciones ?? [];
  const deBebidas = secciones.filter((s) => s.esBebida);
  const deComida = secciones.filter((s) => !s.esBebida);
  const menus = carta?.menus ?? [];

  const lasDeAhora = pestana === 'bebidas' ? deBebidas : deComida;
  const encontradas = useMemo<readonly SeccionDeLaSala[]>(() => {
    const texto = buscando.trim();
    if (texto === '') return lasDeAhora;
    const todos = lasDeAhora.flatMap((s) => s.platos);
    const parecidos = filtrarPorParecido(todos, texto, (p) => p.nombre);
    return [
      {
        id: 'encontrados',
        nombre: 'Lo que se parece',
        esBebida: pestana === 'bebidas',
        platos: parecidos,
      },
    ];
  }, [buscando, lasDeAhora, pestana]);

  function pedir(plato: PlatoDeLaSala, esBebida: boolean) {
    alCambiarElBorrador(
      anadirPlato(borrador, plato, {
        destino: esBebida ? 'barra' : 'cocina',
        pase: esBebida ? null : mesa.porPases ? elPase : 1,
      }),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="tablist"
        aria-label="Qué se pide"
        className="flex gap-e1 bg-superficie px-e3 pt-e3"
      >
        <BotonDePestana
          puesta={pestana === 'bebidas'}
          onClick={() => {
            setPestana('bebidas');
          }}
        >
          Bebidas
        </BotonDePestana>
        <BotonDePestana
          puesta={pestana === 'carta'}
          onClick={() => {
            setPestana('carta');
          }}
        >
          Carta
        </BotonDePestana>
        {menus.length > 0 && (
          <BotonDePestana
            puesta={pestana === 'menu'}
            onClick={() => {
              setPestana('menu');
            }}
          >
            {/* En el móvil, «Menú» a secas, como en el dibujo: la pestaña no cabe en tres líneas. */}
            {menus.length === 1 ? (
              <>
                Menú<span className="hidden sm:inline">&nbsp;del día</span>
              </>
            ) : (
              'Menús'
            )}
            {menus.length === 1 && menus[0] !== undefined && (
              <span className="ml-e2 hidden rounded-redondo bg-fondo px-e2 text-etiqueta text-texto-suave sm:inline">
                {euros(menus[0].precioCentimos)}
              </span>
            )}
          </BotonDePestana>
        )}
      </div>

      {cargando ? (
        <div className="p-e6">
          <Cargando que="la carta" />
        </div>
      ) : pestana === 'menu' ? (
        <ElMenuDelDia
          menus={menus}
          mesa={mesa}
          borrador={borrador}
          alCambiarElBorrador={alCambiarElBorrador}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-e2 border-b border-borde bg-superficie px-e3 py-e2">
            <nav aria-label="Secciones" className="flex min-w-0 flex-1 gap-e1 overflow-x-auto">
              {lasDeAhora.map((s) => (
                <a
                  key={s.id ?? 'sin-seccion'}
                  href={`#seccion-${s.id ?? 'sin'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`seccion-${s.id ?? 'sin'}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className="flex min-h-toque shrink-0 items-center rounded-redondo bg-fondo px-e4 font-medium"
                >
                  {s.nombre}
                </a>
              ))}
            </nav>
            <input
              type="search"
              aria-label="Buscar un plato"
              placeholder="Buscar"
              value={buscando}
              onChange={(e) => {
                setBuscando(e.target.value);
              }}
              className="min-h-toque w-full rounded-redondo border border-borde bg-superficie px-e4 sm:w-[9rem]"
            />
          </div>
          {pestana === 'carta' && mesa.porPases && (
            <div className="border-b border-borde bg-superficie px-e3 py-e2">
              <ElegirPase
                etiqueta="Va en el"
                opciones={losPasesQueSeEligen(mesa, borrador)}
                elegido={elPase}
                alElegir={setPase}
              />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-e3">
            {lasDeAhora.length === 0 ? (
              <EstadoVacio
                compacto
                titulo={pestana === 'bebidas' ? 'Sin bebidas en la carta' : 'La carta está vacía'}
                frase={
                  pestana === 'bebidas'
                    ? 'Marca en Estook › Carta qué secciones son de bebidas (Bebidas, Vinos, Cafés…) y saldrán aquí, para la barra.'
                    : 'Pon tus platos con su precio en Estook › Carta y saldrán aquí, por secciones.'
                }
                dibujo="platos"
                sinAccionPorque="La carta se cambia en Estook, no en la sala."
              />
            ) : encontradas.every((s) => s.platos.length === 0) ? (
              <p className="py-e5 text-center text-texto-suave">
                Nada se parece a «{buscando.trim()}».
              </p>
            ) : (
              encontradas.map((s) => (
                <div key={s.id ?? 'sin'} className="mb-e5">
                  <h2
                    id={`seccion-${s.id ?? 'sin'}`}
                    className="mb-e2 scroll-mt-e3 text-cuerpo font-bold text-texto-suave"
                  >
                    {s.nombre}
                  </h2>
                  <div className="grid grid-cols-1 gap-e2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {s.platos.map((p) => (
                      <Plato
                        key={p.id}
                        plato={p}
                        cuantos={borrador
                          .filter((l) => l.platoId === p.id && l.parteDe === null)
                          .reduce((n, l) => n + l.cantidad, 0)}
                        alPedir={() => {
                          pedir(p, s.esBebida);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BotonDePestana({
  puesta,
  onClick,
  children,
}: {
  readonly puesta: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={puesta}
      onClick={onClick}
      className={[
        'flex min-h-toque-cocina flex-1 items-center justify-center rounded-t-grande px-e4 font-bold',
        puesta ? 'bg-fondo text-texto' : 'text-texto-suave',
      ].join(' ')}
    >
      {children}
    </button>
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
        'relative flex min-h-[4rem] items-stretch sm:min-h-[5.5rem] gap-e2 overflow-hidden rounded-grande border bg-superficie text-left transition-transform active:scale-[0.98]',
        cuantos > 0 ? 'border-naranja' : 'border-borde',
        plato.agotado ? 'opacity-50' : '',
      ].join(' ')}
    >
      {plato.miniatura === null ? (
        <span
          aria-hidden="true"
          className="flex w-[3.5rem] shrink-0 sm:w-[4.5rem] items-center justify-center bg-app-carta/10 text-seccion font-bold text-app-carta"
        >
          {plato.nombre.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={plato.miniatura}
          alt=""
          className="w-[3.5rem] shrink-0 sm:w-[4.5rem] object-cover"
          loading="lazy"
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-[2px] py-e2 pr-e2">
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
