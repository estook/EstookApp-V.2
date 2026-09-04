import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { App } from '../apps.ts';
import { clases } from '../clases.ts';
import { anguloDe, caminoDeSector, puntoEn, sectorEn, sectores, type Sector } from './geometria.ts';

/**
 * La rueda de verdad, la redonda · Partes B5 y B6 del Plan.
 *
 * «Se pulsa un sector, **o se mantiene el dedo en el boton central y se arrastra
 * hacia el**.»
 *
 * Arrastrar funciona asi: al pulsar el centro se empieza a seguir el dedo; el
 * sector que queda bajo el se resalta; al soltar, se abre. Si se suelta encima
 * del centro no se abre nada, que es como uno se arrepiente a mitad de gesto.
 *
 * La clave para que el arrastre funcione es `releasePointerCapture`: por defecto
 * el navegador manda todos los eventos al elemento donde se empezo a pulsar, asi
 * que sin soltarlo el dedo «no saldria nunca» del boton central.
 */
export const LIENZO = 320;
const CENTRO = LIENZO / 2;
const RADIO_EXTERIOR = 152;
const RADIO_INTERIOR = 62;
/** El hueco entre sectores, en grados: lo justo para verlos separados. */
const SEPARACION = 1.4;

export interface RuedaCirculoProps {
  readonly apps: readonly App[];
  readonly pendientes: Readonly<Record<string, number>>;
  /** El cursor. `-1` es «ninguna», y entonces no se resalta ningun sector. */
  readonly señalada: number;
  /** En que app se esta, para decirlo con `aria-current` y no solo con color. */
  readonly appActiva?: string | null;
  readonly alSenalar: (indice: number) => void;
  readonly alElegir: (indice: number) => void;
  readonly alPulsarTecla: (evento: KeyboardEvent) => void;
}

export function RuedaCirculo({
  apps,
  pendientes,
  señalada,
  appActiva = null,
  alSenalar,
  alElegir,
  alPulsarTecla,
}: RuedaCirculoProps) {
  const trozos = sectores(apps.length);
  const [arrastrando, setArrastrando] = useState(false);
  const lienzo = useRef<SVGSVGElement>(null);

  /** El angulo bajo el dedo. `null` si sigue dentro del boton central. */
  const bajoElDedo = (evento: PointerEvent): number | null => {
    const caja = lienzo.current?.getBoundingClientRect();
    if (!caja) return null;

    const dx = evento.clientX - (caja.left + caja.width / 2);
    const dy = evento.clientY - (caja.top + caja.height / 2);

    const minimo = (RADIO_INTERIOR / CENTRO) * (caja.width / 2);
    if (Math.hypot(dx, dy) < minimo) return null;

    return anguloDe(dx, dy);
  };

  return (
    <div
      className="relative touch-none select-none"
      onPointerMove={(evento) => {
        if (!arrastrando) return;
        const grados = bajoElDedo(evento);
        if (grados === null) return;
        const indice = sectorEn(grados, apps.length);
        if (indice !== null) alSenalar(indice);
      }}
      onPointerUp={(evento) => {
        if (!arrastrando) return;
        setArrastrando(false);
        if (bajoElDedo(evento) !== null && señalada >= 0) alElegir(señalada);
      }}
      onPointerCancel={() => {
        setArrastrando(false);
      }}
    >
      <svg
        ref={lienzo}
        viewBox={`0 0 ${LIENZO} ${LIENZO}`}
        className="h-[min(78vw,340px)] w-[min(78vw,340px)]"
        role="menu"
        aria-label="Elige una app"
        aria-activedescendant={apps[señalada] ? `sector-${apps[señalada].id}` : undefined}
        tabIndex={0}
        onKeyDown={alPulsarTecla}
      >
        {trozos.map((sector, i) => {
          const app = apps[i];
          if (!app) return null;

          return (
            <SectorDeApp
              key={app.id}
              app={app}
              sector={sector}
              activo={i === señalada}
              aqui={app.id === appActiva}
              retraso={i * 30}
              pendientes={pendientes[app.id] ?? 0}
              alSenalar={() => {
                alSenalar(i);
              }}
              alElegir={() => {
                alElegir(i);
              }}
            />
          );
        })}
      </svg>

      <button
        type="button"
        // No entra en el recorrido de teclado: el `<svg>` de arriba ya es el
        // menu, y tenerlo dos veces obligaria a tabular por lo mismo dos veces.
        aria-hidden
        tabIndex={-1}
        onPointerDown={(evento) => {
          // Sin esto el dedo no «sale» nunca de este boton y arrastrar no va.
          evento.currentTarget.releasePointerCapture(evento.pointerId);
          setArrastrando(true);
        }}
        className={clases(
          'absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center',
          'rounded-redondo bg-superficie shadow-s2 px-e3 text-center leading-tight',
          'h-[min(30vw,132px)] w-[min(30vw,132px)]',
          arrastrando ? 'text-cuerpo font-semibold text-texto' : 'text-secundario text-texto-suave',
        )}
      >
        {arrastrando ? (apps[señalada]?.nombre ?? 'Arrastra o pulsa') : 'Arrastra o pulsa'}
      </button>
    </div>
  );
}

function SectorDeApp({
  app,
  sector,
  activo,
  aqui,
  retraso,
  pendientes,
  alSenalar,
  alElegir,
}: {
  readonly app: App;
  readonly sector: Sector;
  readonly activo: boolean;
  readonly aqui: boolean;
  readonly retraso: number;
  readonly pendientes: number;
  readonly alSenalar: () => void;
  readonly alElegir: () => void;
}) {
  const camino = caminoDeSector(
    { ...sector, desde: sector.desde + SEPARACION / 2, hasta: sector.hasta - SEPARACION / 2 },
    RADIO_INTERIOR,
    RADIO_EXTERIOR,
    CENTRO,
  );

  /*
   * Donde van el contador, el icono y el nombre.
   *
   * ── El fallo que esto arregla ──────────────────────────────────────────────
   *
   * Antes cada uno se colocaba a un radio distinto sobre el angulo del sector:
   * el icono mas adentro, el nombre mas afuera. Eso los separa **en la direccion
   * del radio**, que arriba y abajo es la vertical —y se ve bien— pero a las
   * tres y a las nueve es la horizontal: el icono quedaba al lado del nombre, y
   * con un nombre largo se le montaba encima. «Negocio» y su flecha, en un
   * movil, uno sobre otro.
   *
   * Ahora los tres cuelgan de un solo punto —el medio de la corona— y se apilan
   * **en vertical de pantalla**, que es como se leen. Asi los ocho sectores se
   * ven igual, y no solo los cuatro afortunados.
   *
   * Los tres caben: un sector de los ocho mide unos 82 px de alto a este radio,
   * y de -30 a +14 hay 44.
   */
  const medio = (RADIO_INTERIOR + RADIO_EXTERIOR) / 2;
  const anclaje = puntoEn(sector.medio, medio, CENTRO);
  const dondeElContador = { x: anclaje.x, y: anclaje.y - 30 };
  const dondeElIcono = { x: anclaje.x, y: anclaje.y - 13 };
  const dondeElTexto = { x: anclaje.x, y: anclaje.y + 14 };
  const Icono = app.icono;

  return (
    <g
      id={`sector-${app.id}`}
      role="menuitem"
      // «Estas aqui» se dice con `aria-current`, que es lo que un lector de
      // pantalla anuncia, y no solo con el color del sector.
      aria-current={aqui ? 'page' : undefined}
      aria-label={`${app.nombre}. ${app.queHace}${aqui ? '. Estás aquí' : ''}${pendientes > 0 ? `. ${pendientes} pendientes` : ''}`}
      className="cursor-pointer anima-sector"
      // «Sectores escalonados cada 30 ms» (B6).
      style={{ animationDelay: `${retraso}ms` }}
      onPointerEnter={alSenalar}
      onClick={alElegir}
    >
      {/*
        El sector senalado se marca con un borde grueso del acento y un tinte,
        **no rellenandolo del acento**. Con relleno habria que poner el nombre en
        blanco encima, y sobre los acentos de Inventario, Escandallos y Servicio
        eso da entre 3,5 y 4,1:1, por debajo del 4,5 que pide B8 para el texto.
        Asi el nombre va siempre en charcoal (16:1) y se lee en los ocho.
      */}
      <path
        d={camino}
        fill={activo ? 'var(--color-naranja-suave)' : 'var(--color-superficie)'}
        stroke={activo ? app.acento : 'var(--color-borde)'}
        strokeWidth={activo ? 3 : 1}
        className="transition-[fill] duration-[--rapido] ease-curva"
      />

      <g
        transform={`translate(${dondeElIcono.x - 11} ${dondeElIcono.y - 11})`}
        style={{ color: app.acento }}
        className="pointer-events-none"
      >
        <Icono size={activo ? 24 : 22} />
      </g>

      <text
        x={dondeElTexto.x}
        y={dondeElTexto.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="pointer-events-none"
        style={{ fill: 'var(--color-texto)', fontSize: 11, fontWeight: activo ? 700 : 600 }}
      >
        {app.nombre}
      </text>

      {pendientes > 0 && (
        <g className="pointer-events-none">
          <circle
            cx={dondeElContador.x}
            cy={dondeElContador.y}
            r={9}
            fill="var(--color-charcoal)"
            stroke={app.acento}
            strokeWidth={2}
          />
          <text
            x={dondeElContador.x}
            y={dondeElContador.y + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: '#ffffff', fontSize: 10, fontWeight: 700 }}
          >
            {pendientes > 99 ? '99+' : pendientes}
          </text>
        </g>
      )}
    </g>
  );
}
