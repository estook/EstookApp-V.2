import { useState, type ReactNode } from 'react';
import { usarElModoDelPanel } from '../ganchos/usarElModoDelPanel.ts';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Aviso,
  Boton,
  ELIGE_EL_PUESTO,
  Hoja,
  NOMBRE_DEL_PUESTO,
  Rejilla,
  clases,
  colocarLosFijos,
  elCatalogoParaAnadir,
  elPuestoDe,
  losFijos,
  widgetPorId,
  type EstadoEnElCatalogo,
  type FormaDelFijo,
  type GrupoDeWidget,
  type ModoDelPanel,
  type Puesto,
} from '@estook/ui';
import {
  IconoAlmacen,
  IconoAnadir,
  IconoAtencion,
  IconoCalendario,
  IconoCarta,
  IconoBien,
  IconoCubiertos,
  IconoDinero,
  IconoEquipo,
  IconoEstrella,
  IconoFlechaArriba,
  IconoNegocio,
  IconoReloj,
  IconoReparto,
  IconoTablon,
} from '@estook/iconos';
import { puedeEditar, puedeVer, type Permiso } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { TarjetasDelPanel } from '../pantallas/TarjetasDelPanel.tsx';
import { CabeceraDelPanel } from './Cabecera.tsx';
import { LoQueFalta } from './LoQueFalta.tsx';
import { LoDeHoy } from './LoDeHoy.tsx';
import { usarCuantasCosasHoy } from '../ganchos/usarCuantasCosasHoy.ts';
import { Tablon } from './Tablon.tsx';
import { EscribirEnElTablon } from './EscribirEnElTablon.tsx';
import { WidgetDelPanel } from './elPanel/widgets.tsx';
import { usarMiPanel } from '../ganchos/usarMiPanel.ts';
import { EstookEnTuMovil } from '../sinConexion/EstookEnTuMovil.tsx';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { ApuntarMerma } from '../almacen/ApuntarMerma.tsx';
import { Agotados } from '../carta/Agotados.tsx';
import { InvitacionAlRecorrido } from '../recorrido/ElRecorrido.tsx';
import { PuestaEnMarcha } from './PuestaEnMarcha.tsx';
import { seEnsena, usarLaPuestaEnMarcha } from '../ganchos/usarLaPuestaEnMarcha.ts';

/**
 * El Panel · el centro de control (Manifiesto 6; el rediseño, entrega 3 · decisión 0148).
 *
 * «No "¿cómo va todo?", sino **"¿qué necesita mi atención ahora?"**». Y Richi, 18-nov: «cada
 * puesto lo suyo, **también el jefe de cocina y el jefe de sala**; los fijos arriba y **los que se
 * añaden, abajo y del mismo tamaño**; "Ventas según canal"; las gráficas dicen lo suyo al pasar el
 * ratón o al tocarlas». La maqueta aprobada dibuja los cinco Paneles; este los construye:
 *
 *   · **La cabecera**: el saludo, la fecha, el local y el puesto; y a la derecha «Hoy» (lo que
 *     antes era la zona de atención, con su número), «Pon en marcha» mientras falte algo, y
 *     «Añadir» (o «Apuntar merma», en la cocina y la sala).
 *   · **Los fijos de su puesto** (`FIJOS_DEL_PUESTO`), que no se mueven, colocados sin huecos en el
 *     PC, la tablet (en horizontal y en vertical) y el móvil (`colocarLosFijos`).
 *   · **«Añadidos por ti»**, todos del mismo tamaño y en el orden de cada uno (lo que se guarda en
 *     `mi_panel`), con «Añadir un widget» como una casilla más.
 *
 * Richi, 21-nov: «nada a lo ancho para decir poco». Por eso «Lo de hoy», el tablón, poner en
 * marcha el local y quitar los ejemplos dejan de ser franjas encima del Panel: viven en sus hojas,
 * a un toque, con su número a la vista.
 */
export function Panel() {
  const { permisos } = usarSesion();
  const tienePermiso = (permiso: Permiso) => puedeVer(permisos, permiso);
  const puesto = elPuestoDe(tienePermiso);
  const elige = ELIGE_EL_PUESTO[puesto];
  const mio = usarMiPanel();
  const [editando, setEditando] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);
  const [apuntandoMerma, setApuntandoMerma] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [agotando, setAgotando] = useState(false);
  const [mirandoHoy, setMirandoHoy] = useState(false);
  const [poniendoEnMarcha, setPoniendoEnMarcha] = useState(false);
  const cuantasHoy = usarCuantasCosasHoy();
  const puesta = usarLaPuestaEnMarcha();
  const conLaPuesta = seEnsena(puesta.data);
  const pasos = puesta.data?.pasos ?? [];
  const hechos = pasos.filter((p) => p.hecho).length;

  // Se llega aquí desde una pantalla que no está entre sus apps (`PantallaDeApp`).
  const donde = useLocation();
  const navegar = useNavigate();
  const vieneSinAcceso =
    (donde.state as { readonly sinAcceso?: boolean } | null)?.sinAcceso === true;

  // «Apuntar una merma», «Marcar un agotado» y «Escribir en el Tablón», desde los atajos, el
  // buscador, Fogón o un widget: se abren aquí porque el Panel lo tiene todo el mundo.
  usarQueHacer('merma', () => {
    setApuntandoMerma(true);
  });
  usarQueHacer('agotado', () => {
    setAgotando(true);
  });
  usarQueHacer('tablon', () => {
    setEscribiendo(true);
  });

  const fijos = losFijos(puesto, tienePermiso);
  const conElTablonArriba = fijos.some((f) => f.id === 'tablon');
  const puedeApuntarMerma = puedeEditar(permisos, 'accion.registrar_merma');

  return (
    <div className="flex flex-col gap-e4">
      <CabeceraDelPanel
        puesto={NOMBRE_DEL_PUESTO[puesto]}
        acciones={
          <>
            {(elige || cuantasHoy > 0) && (
              <BotonDeLaCabecera
                icono={<IconoCalendario size={18} />}
                cuantos={cuantasHoy}
                etiqueta={
                  cuantasHoy === 0
                    ? 'Hoy, sin nada que atender'
                    : `Hoy, ${String(cuantasHoy)} ${cuantasHoy === 1 ? 'cosa' : 'cosas'} que atender`
                }
                alPulsar={() => {
                  setMirandoHoy(true);
                }}
              >
                Hoy
              </BotonDeLaCabecera>
            )}
            {conLaPuesta && (
              <BotonDeLaCabecera
                icono={<AroDelPaso parte={pasos.length === 0 ? 0 : hechos / pasos.length} />}
                etiqueta={`Pon en marcha tu local: ${String(hechos)} de ${String(pasos.length)} pasos`}
                alPulsar={() => {
                  setPoniendoEnMarcha(true);
                }}
              >
                Pon en marcha{' '}
                <span className="tabular-nums text-texto-suave">
                  {hechos}/{pasos.length}
                </span>
              </BotonDeLaCabecera>
            )}
            {elige ? (
              <BotonDeLaCabecera
                principal
                icono={<IconoAnadir size={18} />}
                etiqueta="Añadir un widget"
                alPulsar={() => {
                  setAnadiendo(true);
                }}
              >
                Añadir
              </BotonDeLaCabecera>
            ) : (
              puedeApuntarMerma && (
                <BotonDeLaCabecera
                  principal
                  icono={<IconoAtencion size={18} />}
                  etiqueta="Apuntar merma"
                  alPulsar={() => {
                    setApuntandoMerma(true);
                  }}
                >
                  Apuntar merma
                </BotonDeLaCabecera>
              )
            )}
          </>
        }
      />

      {vieneSinAcceso && (
        <Aviso
          tono="info"
          titulo="Esa pantalla no está entre tus apps"
          alCerrar={() => {
            navegar('.', { replace: true, state: null });
          }}
        >
          Si la necesitas, pídesela a quien lleva el local.
        </Aviso>
      )}

      {/* El recorrido de la primera vez (0084): se ofrece una vez por cuenta, y se va. */}
      <div className="empty:hidden">
        <InvitacionAlRecorrido />
      </div>

      <LosFijos puesto={puesto} />

      {elige && (
        <section aria-label="Añadidos por ti" className="flex flex-col gap-e3">
          {/*
            Que un guardado que falla se vea en el sitio y en el momento, con la frase del
            servidor y su botón: la rejilla pinta el cambio al instante, y sin esto un no se
            veía igual que un sí hasta que alguien recargaba.
          */}
          {mio.noSeHaGuardado !== null && (
            <Aviso
              tono="mal"
              titulo={mio.noSeHaGuardado.quePasa}
              accion={
                <Boton tono="secundario" onClick={mio.reintentar}>
                  Reintentar
                </Boton>
              }
            >
              {mio.noSeHaGuardado.queSePuedeHacer} Lo que has colocado se ve, pero{' '}
              <strong>todavía no está guardado</strong>: si recargas ahora, vuelve el de antes.
            </Aviso>
          )}
          {mio.loCambioOtroAparato && (
            <Aviso
              tono="atencion"
              titulo="Lo cambiaste en otro aparato"
              accion={
                <Boton tono="secundario" onClick={mio.recargar}>
                  Traer el de allí
                </Boton>
              }
            >
              Este panel se ha movido desde otro sitio mientras lo tenías abierto aquí. Lo de ahora
              no se ha guardado, para no llevarse por delante lo otro.
            </Aviso>
          )}
          <Rejilla
            uniforme
            anadirSiempre
            rotulo={
              <span className="flex flex-wrap items-baseline gap-x-e3">
                <span className="text-cuerpo font-bold text-texto">Añadidos por ti</span>
                <span className="text-etiqueta text-texto-tenue">
                  Del mismo tamaño, en el orden que elijas
                </span>
              </span>
            }
            puestos={mio.puestos}
            editando={editando}
            guardando={mio.guardando}
            sinEditar={mio.cargando}
            alEditar={(sigue) => {
              setEditando(sigue);
              // «Listo» quiere decir guarda: no se deja esperando al reloj.
              if (!sigue) mio.guardarYa();
            }}
            alReordenar={mio.reordenar}
            alSoltar={mio.guardarYa}
            alQuitar={mio.quitar}
            alCambiarTamano={mio.cambiarTamano}
            tamanosDe={() => ['chico']}
            nombreDe={(id) => widgetPorId(id)?.nombre ?? id}
            alAnadir={() => {
              setAnadiendo(true);
            }}
            pintar={(p) => (
              <div className="h-[17rem]">
                <WidgetDelPanel id={p.id} />
              </div>
            )}
          />
          {editando && (
            <div className="flex flex-wrap items-center gap-e2">
              <Boton tono="texto" onClick={mio.volverAlDeFabrica}>
                Volver a los de mi puesto
              </Boton>
              <p className="text-secundario text-texto-suave">
                Se guarda solo, y vale en todos tus aparatos de este tipo.
              </p>
            </div>
          )}
        </section>
      )}

      {/* «Hoy»: lo que necesita atención, lo de arrancar y el tablón, en su hoja (0148). */}
      <Hoja
        abierta={mirandoHoy}
        alCerrar={() => {
          setMirandoHoy(false);
        }}
        titulo="Hoy"
      >
        {mirandoHoy && (
          <div className="flex flex-col gap-e4 pt-e3">
            <div className="empty:hidden">
              <LoDeHoy enLaHoja />
            </div>
            <div className="grid grid-cols-1 gap-e3 empty:hidden">
              <TarjetasDelPanel />
            </div>
            <div className="empty:hidden">
              <LoQueFalta />
            </div>
            {!conElTablonArriba && (
              <div className="empty:hidden">
                <Tablon
                  alEscribir={() => {
                    setEscribiendo(true);
                  }}
                />
              </div>
            )}
            <div className="empty:hidden">
              <EstookEnTuMovil />
            </div>
            {cuantasHoy === 0 && (
              <p className="text-secundario text-texto-suave">
                Nada que atender ahora. Lo que necesite tu atención saldrá aquí, ordenado por lo más
                urgente.
              </p>
            )}
          </div>
        )}
      </Hoja>

      <Hoja
        abierta={poniendoEnMarcha}
        alCerrar={() => {
          setPoniendoEnMarcha(false);
        }}
        titulo="Pon en marcha tu local"
      >
        {poniendoEnMarcha && (
          <div className="pt-e3">
            <PuestaEnMarcha />
          </div>
        )}
      </Hoja>

      {/* Solo abierta: una hoja cerrada dentro de la rejilla la llenaría. */}
      {escribiendo && (
        <EscribirEnElTablon
          alCerrar={() => {
            setEscribiendo(false);
          }}
        />
      )}
      {agotando && (
        <Hoja
          abierta
          titulo="Agotados"
          alCerrar={() => {
            setAgotando(false);
          }}
        >
          <div className="pt-e3">
            <Agotados />
          </div>
        </Hoja>
      )}
      <ApuntarMerma
        abierta={apuntandoMerma}
        alCerrar={() => {
          setApuntandoMerma(false);
        }}
      />

      {elige && (
        <AnadirUnWidget
          abierta={anadiendo}
          alCerrar={() => {
            setAnadiendo(false);
          }}
          puestos={mio.puestos}
          tienePermiso={tienePermiso}
          alAnadir={(id) => {
            mio.anadir(id);
          }}
          alQuitar={mio.quitar}
          alVolverAlDeMiPuesto={() => {
            mio.volverAlDeFabrica();
            setAnadiendo(false);
          }}
        />
      )}
    </div>
  );
}

// ── La cabecera ───────────────────────────────────────────────────────────────────

function BotonDeLaCabecera({
  icono,
  cuantos,
  etiqueta,
  principal = false,
  alPulsar,
  children,
}: {
  readonly icono: ReactNode;
  readonly cuantos?: number;
  readonly etiqueta: string;
  readonly principal?: boolean;
  readonly alPulsar: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={etiqueta}
      className={clases(
        'relative inline-flex min-h-toque items-center gap-[7px] rounded-grande border px-e3 text-secundario font-bold',
        'transition-[background-color,border-color,box-shadow] duration-[--rapido]',
        principal
          ? 'border-naranja bg-naranja text-sobre-naranja hover:[box-shadow:var(--sombra-tarjeta)]'
          : 'border-borde bg-superficie text-texto hover:border-borde-fuerte',
      )}
    >
      <span aria-hidden className="grid place-items-center">
        {icono}
      </span>
      {children}
      {cuantos !== undefined && cuantos > 0 && (
        <span
          aria-hidden
          className="grid min-w-[1.25rem] place-items-center rounded-redondo bg-mal px-[5px] text-etiqueta font-bold leading-5 text-white"
        >
          {cuantos}
        </span>
      )}
    </button>
  );
}

/** El aro de «Pon en marcha»: lo hecho, de un vistazo. */
function AroDelPaso({ parte }: { readonly parte: number }) {
  const r = 7;
  const largo = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 18 18" className="size-[18px] -rotate-90">
      <circle cx="9" cy="9" r={r} fill="none" stroke="var(--color-borde)" strokeWidth="3" />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke="var(--color-naranja)"
        strokeWidth="3"
        strokeDasharray={`${String(largo * parte)} ${String(largo)}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Los fijos ──────────────────────────────────────────────────────────────────────

/** El alto mínimo de cada forma, en rem: las de una fila miden lo mismo, la más alta manda. */
function elAlto(forma: FormaDelFijo, modo: ModoDelPanel): number {
  // En el móvil cada tarjeta mide lo que lleva: una por fila, un alto fijo solo deja huecos. La
  // gráfica sí lo necesita, para que se lea.
  if (modo === 'movil') return forma === 'grafica' ? 17 : forma === 'cifra' ? 8.5 : 0;
  switch (forma) {
    case 'cifra':
      return 10;
    case 'grafica':
    case 'lado':
      return modo === 'pc' || modo === 'tablet' ? 20 : 17;
    case 'fila':
      return 8;
    default:
      return 15.5;
  }
}

/**
 * Los fijos del puesto, colocados para el ancho que hay. En doce columnas siempre: lo que cambia
 * con la pantalla es cuántas ocupa cada uno (`colocarLosFijos`), y nunca queda un hueco.
 */
function LosFijos({ puesto }: { readonly puesto: Puesto }) {
  const { permisos } = usarSesion();
  const [caja, modo] = usarElModoDelPanel();
  const fijos = losFijos(puesto, (p) => puedeVer(permisos, p));
  const colocados = colocarLosFijos(fijos, modo);
  return (
    <div
      ref={caja}
      data-recorrido="panel"
      data-modo={modo}
      className={clases('grid grid-cols-12', modo === 'movil' ? 'gap-e3' : 'gap-e4')}
    >
      {colocados.map(({ fijo, columnas }) => (
        <div
          key={fijo.id}
          data-widget={fijo.id}
          data-fijo
          className="min-w-0"
          style={{
            gridColumn: `span ${String(columnas)} / span ${String(columnas)}`,
            minHeight: `${String(elAlto(fijo.forma, modo))}rem`,
          }}
        >
          <WidgetDelPanel id={fijo.id} destacado={fijo.destacado === true} />
        </div>
      ))}
    </div>
  );
}

// ── «Añadir un widget» ─────────────────────────────────────────────────────────────

const COLOR_DEL_GRUPO: Readonly<Record<GrupoDeWidget, string>> = {
  ventas: 'bg-naranja-suave text-naranja',
  almacen: 'bg-info-suave text-info',
  equipo: 'bg-bien-suave text-bien',
  canales: 'bg-fondo text-texto-suave',
};

const ICONO_DEL_WIDGET: Readonly<Record<string, ReactNode>> = {
  'cifras-del-dia': <IconoNegocio size={20} />,
  'lo-que-mas-sale': <IconoEstrella size={20} />,
  'por-secciones': <IconoCarta size={20} />,
  'como-se-cobra': <IconoDinero size={20} />,
  'mesas-ahora': <IconoCubiertos size={20} />,
  objetivos: <IconoEstrella size={20} />,
  'almacen-pide': <IconoAlmacen size={20} />,
  caducidades: <IconoReloj size={20} />,
  'bajo-minimo': <IconoAlmacen size={20} />,
  repartos: <IconoReparto size={20} />,
  'lo-que-se-escapa': <IconoFlechaArriba size={20} />,
  agotados: <IconoAtencion size={20} />,
  'menu-del-dia': <IconoCarta size={20} />,
  'para-recomendar': <IconoEstrella size={20} />,
  'equipo-ahora': <IconoEquipo size={20} />,
  'tu-dia': <IconoReloj size={20} />,
  'mis-horas': <IconoReloj size={20} />,
  tablon: <IconoTablon size={20} />,
  'acciones-rapidas': <IconoAnadir size={20} />,
  calendario: <IconoCalendario size={20} />,
  'ventas-segun-canal': <IconoReparto size={20} />,
  'uber-eats': <IconoReparto size={20} />,
};

/**
 * «Añadir un widget» (la maqueta): por grupos —Ventas, Almacén y cocina, Equipo y Canales—, cada uno
 * con su icono, lo que enseña y su botón. Lo ya añadido se puede quitar; lo fijo de tu puesto lo
 * dice; lo que llega con otro módulo sale en gris con el suyo («Con M29»). Solo lo que su rol puede
 * ver: «Lo que elijas lo ves tú. Cada widget sale solo a quien tiene su permiso».
 */
function AnadirUnWidget({
  abierta,
  alCerrar,
  puestos,
  tienePermiso,
  alAnadir,
  alQuitar,
  alVolverAlDeMiPuesto,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly puestos: readonly { readonly id: string }[];
  readonly tienePermiso: (permiso: Permiso) => boolean;
  readonly alAnadir: (id: string) => void;
  readonly alQuitar: (id: string) => void;
  readonly alVolverAlDeMiPuesto: () => void;
}) {
  const grupos = elCatalogoParaAnadir(
    puestos.map((p) => ({ id: p.id, tamano: 'chico' as const })),
    tienePermiso,
  );

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Añadir un widget">
      <div className="flex flex-col gap-e4 pt-e2">
        <p className="text-secundario text-texto-suave">
          Lo que elijas lo ves tú, abajo y del mismo tamaño. Cada widget sale solo a quien tiene su
          permiso.
        </p>
        {grupos.map((grupo) => (
          <section key={grupo.grupo} aria-label={grupo.nombre} className="flex flex-col gap-e2">
            <h3 className="text-etiqueta font-bold uppercase tracking-[0.08em] text-texto-tenue">
              {grupo.nombre}
            </h3>
            <ul className="flex flex-col gap-e2">
              {grupo.widgets.map(({ widget, estado }) => (
                <li
                  key={widget.id}
                  className={clases(
                    'flex min-h-[4rem] items-center gap-e3 rounded-grande border border-borde p-e3',
                    estado === 'pronto' && 'opacity-60',
                  )}
                >
                  <i
                    aria-hidden
                    className={clases(
                      'grid size-10 shrink-0 place-items-center rounded-grande not-italic',
                      COLOR_DEL_GRUPO[grupo.grupo],
                    )}
                  >
                    {ICONO_DEL_WIDGET[widget.id] ?? <IconoNegocio size={20} />}
                  </i>
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="block text-cuerpo font-semibold">{widget.nombre}</span>
                    <small className="block text-etiqueta text-texto-tenue">
                      {widget.queEnsena}
                    </small>
                  </span>
                  <LoQueSePuedeHacer
                    estado={estado}
                    pronto={widget.pronto}
                    nombre={widget.nombre}
                    alAnadir={() => {
                      alAnadir(widget.id);
                    }}
                    alQuitar={() => {
                      alQuitar(widget.id);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-e2 border-t border-borde pt-e3">
          <Boton tono="texto" onClick={alVolverAlDeMiPuesto}>
            Volver a los de mi puesto
          </Boton>
          <p className="text-secundario text-texto-suave">Vuelven los añadidos de fábrica.</p>
        </div>
      </div>
    </Hoja>
  );
}

function LoQueSePuedeHacer({
  estado,
  pronto,
  nombre,
  alAnadir,
  alQuitar,
}: {
  readonly estado: EstadoEnElCatalogo;
  readonly pronto: string | undefined;
  readonly nombre: string;
  readonly alAnadir: () => void;
  readonly alQuitar: () => void;
}) {
  switch (estado) {
    case 'pronto':
      return <small className="shrink-0 text-etiqueta font-bold text-texto-tenue">{pronto}</small>;
    case 'fijo':
      return (
        <small className="shrink-0 text-etiqueta font-bold text-texto-tenue">En tu panel</small>
      );
    case 'puesto':
      return (
        <span className="flex shrink-0 items-center gap-e2">
          <span className="inline-flex items-center gap-[3px] text-etiqueta font-bold text-bien">
            <IconoBien size={14} />
            Añadido
          </span>
          <button
            type="button"
            onClick={alQuitar}
            aria-label={`Quitar ${nombre}`}
            className="inline-flex h-[2.125rem] items-center rounded-medio border border-borde px-e3 text-etiqueta font-bold text-texto-suave hover:border-mal hover:bg-mal-suave hover:text-mal"
          >
            Quitar
          </button>
        </span>
      );
    default:
      return (
        <button
          type="button"
          onClick={alAnadir}
          aria-label={`Añadir ${nombre}`}
          className="inline-flex h-[2.125rem] shrink-0 items-center gap-e1 rounded-medio border border-borde bg-fondo px-e3 text-etiqueta font-bold text-texto hover:border-naranja hover:text-naranja"
        >
          <IconoAnadir size={14} />
          Añadir
        </button>
      );
  }
}
