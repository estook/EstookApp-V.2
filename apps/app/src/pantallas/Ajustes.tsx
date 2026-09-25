import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  IconoAbrirFuera,
  IconoDinero,
  IconoBuscar,
  IconoColor,
  IconoFlechaDerecha,
  IconoFlechaIzquierda,
  IconoLocal,
  IconoLuna,
  IconoOrganizacion,
  IconoPersona,
  IconoSalir,
  IconoSol,
  IconoTamanoDeLetra,
  IconoUbicacion,
  IconoVer,
  type Icono,
} from '@estook/iconos';
import { IDIOMAS, NOMBRE_DEL_IDIOMA } from '@estook/dominio';
import { puedeEditar } from '@estook/permisos';
import {
  Aviso,
  Boton,
  COMO_SE_LLAMA,
  COMO_SE_LLAMA_EL_TEMA,
  CUANTO_MULTIPLICA,
  Interruptor,
  Selector,
  TAMANOS,
  TEMAS,
  Tarjeta,
  clases,
  usarDeshacer,
  usarEsEscritorio,
  usarModoCocina,
  usarTamanoDeLetra,
  usarTema,
  type TamanoDeLetra,
  type Tema,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { TuMarca } from '../marca/TuMarca.tsx';
import { AjustesDeOrganizacion } from './AjustesDeOrganizacion.tsx';
import { MiAcceso } from './MiAcceso.tsx';
import { TuLocalEnGoogle } from './TuLocalEnGoogle.tsx';
import { CuandoEsLlegarTarde } from './CuandoEsLlegarTarde.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';
import { ComoEntranTusVentas } from '../servicio/ComoEntranTusVentas.tsx';
import { preguntarDondeEstoy } from '../ganchos/usarFichar.ts';
import { TusPreciosDeCompra } from '../inventario/TusPreciosDeCompra.tsx';
import { TusObjetivos } from './TusObjetivos.tsx';
import { TuCartaYSuQr } from './TuCartaYSuQr.tsx';
import { TuSuscripcion } from './TuSuscripcion.tsx';
import type { MiFichaje } from '../equipo/contrato.ts';
import {
  ajustesQueVe,
  buscarAjustes,
  llevaLosObjetivos,
  llevaLosPrecios,
  nombreDeLaSeccion,
  rutaDelAjuste,
  seccionesQueVe,
  type IdDeSeccion,
} from './lasSeccionesDeAjustes.ts';

/**
 * Ajustes, por secciones (entrega V, mejora 7 · [0045](../../../../docs/decisiones/0045-el-aspecto-y-el-orden.md)).
 *
 * «En Ajustes haces exactamente lo mismo: pones todo en cascada en vez de por
 *  secciones o desplegables. Que vaya por ramas.» Eran catorce tarjetas una debajo
 *  de otra. Ahora es lo que hacen los ajustes de un iPhone o de cualquier
 *  herramienta profesional:
 *
 *   · **En el ordenador**, las secciones a la izquierda y la elegida a la derecha,
 *     con el buscador encima de la lista.
 *   · **En el móvil**, la lista de secciones con lo que hay en cada una, y al
 *     tocar una se entra en ella; «‹ Ajustes» vuelve.
 *   · **Cada sección tiene su dirección** (`/ajustes/aparato`), para que «cambia el
 *     tema» o el aviso de Equipo lleven directo al sitio y el botón de volver
 *     funcione (regla 40).
 *   · **El buscador** busca por lo que la gente escribe —«clave», «IVA», «logo»—
 *     entre los ajustes que esa persona ve, y los mismos salen en el buscador
 *     universal (`lasSeccionesDeAjustes.ts`, un solo dueño).
 *
 * ── Menos texto, y es a propósito ───────────────────────────────────────────
 *
 * «Solo pon "Elige tu tema" y las opciones.» Cada ajuste dice qué es y enseña sus
 * opciones; el porqué es para el código, no para quien lo usa.
 */
export function Ajustes() {
  const { seccion: pedida } = useParams();
  const { hash } = useLocation();
  const navegar = useNavigate();
  const escritorio = usarEsEscritorio();
  const { yo, permisos } = usarSesion();
  const [buscando, setBuscando] = useState('');

  const quien = {
    permisos,
    tieneLocal: yo?.local !== null && yo?.local !== undefined,
    tieneOrganizacion: yo?.organizacion !== null && yo?.organizacion !== undefined,
    llevaLaSuscripcion: yo?.cuenta?.laLlevo === true,
  };
  const secciones = seccionesQueVe(quien);
  const encontrados = buscarAjustes(ajustesQueVe(quien), buscando);

  const laSeccion = secciones.find((s) => s.id === pedida);
  // En el ordenador siempre hay una abierta: la lista está al lado.
  const abierta = laSeccion?.id ?? (escritorio ? 'aparato' : undefined);

  // Al llegar con un ancla —«/ajustes/local#donde-esta-el-local»—, a ese ajuste.
  useEffect(() => {
    if (hash === '') return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash, abierta]);

  // Una sección que no existe, o que esta persona no ve: a la lista.
  if (pedida !== undefined && laSeccion === undefined) return <Navigate to="/ajustes" replace />;

  const irA = (ruta: string) => {
    setBuscando('');
    navegar(ruta);
  };

  const buscador = (
    <label className="relative block">
      <span className="sr-only">Buscar en Ajustes</span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-e3 top-1/2 -translate-y-1/2 text-texto-tenue"
      >
        <IconoBuscar size={18} />
      </span>
      <input
        type="search"
        value={buscando}
        onChange={(e) => {
          setBuscando(e.currentTarget.value);
        }}
        placeholder="Buscar: clave, tema, IVA…"
        className="min-h-toque w-full rounded-grande border border-borde bg-superficie pl-[2.5rem] pr-e3 text-cuerpo placeholder:text-texto-tenue"
      />
    </label>
  );

  const resultados = buscando.trim() !== '' && (
    <Tarjeta titulo="Lo que has buscado" cuantos={encontrados.length} pegado>
      {encontrados.length === 0 ? (
        <p className="px-e4 pb-e4 text-secundario text-texto-suave @min-[22rem]:px-e5">
          Nada con «{buscando.trim()}». Prueba con otra palabra.
        </p>
      ) : (
        <ul className="pb-e2">
          {encontrados.map((ajuste) => (
            <li key={ajuste.id}>
              <button
                type="button"
                onClick={() => {
                  irA(rutaDelAjuste(ajuste));
                }}
                className="flex min-h-toque w-full items-center gap-e3 px-e4 py-e2 text-left hover:bg-fondo @min-[22rem]:px-e5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-cuerpo font-medium">{ajuste.nombre}</span>
                  <span className="block text-secundario text-texto-suave">
                    {nombreDeLaSeccion(ajuste.seccion)}
                  </span>
                </span>
                <IconoFlechaDerecha size={18} className="shrink-0 text-texto-tenue" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );

  const lista = (
    <nav aria-label="Secciones de Ajustes" className="flex flex-col gap-e1">
      {secciones.map((s) => {
        const IconoDeLaSeccion = ICONO[s.id];
        const activa = s.id === abierta;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={activa ? 'page' : undefined}
            onClick={() => {
              irA(`/ajustes/${s.id}`);
            }}
            className={clases(
              'flex min-h-toque w-full items-center gap-e3 rounded-grande px-e3 py-e2 text-left transition-colors',
              activa
                ? 'bg-superficie [box-shadow:var(--sombra-tarjeta)]'
                : escritorio
                  ? 'hover:bg-superficie/60'
                  : 'bg-superficie [box-shadow:var(--sombra-tarjeta)]',
            )}
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-medio bg-fondo text-texto-suave"
            >
              <IconoDeLaSeccion size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-cuerpo font-medium">{s.nombre}</span>
              {!escritorio && (
                <span className="block text-secundario text-texto-suave">{s.queHay}</span>
              )}
            </span>
            {!escritorio && <IconoFlechaDerecha size={18} className="shrink-0 text-texto-tenue" />}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex w-full max-w-[64rem] flex-col gap-e4">
      <h1 className="text-pantalla font-semibold tracking-[-0.015em]">Ajustes</h1>

      {escritorio ? (
        <div className="flex items-start gap-e6">
          <div className="sticky top-[calc(var(--alto-barra-escritorio)+var(--spacing-e4))] flex w-[15rem] shrink-0 flex-col gap-e3">
            {buscador}
            {lista}
          </div>
          <div className="flex min-w-0 max-w-[44rem] flex-1 flex-col gap-e4">
            {resultados}
            {abierta !== undefined && <LaSeccion id={abierta} />}
          </div>
        </div>
      ) : abierta === undefined ? (
        <div className="flex flex-col gap-e3">
          {buscador}
          {resultados}
          {buscando.trim() === '' && lista}
        </div>
      ) : (
        <div className="flex flex-col gap-e4">
          <div>
            <button
              type="button"
              onClick={() => {
                irA('/ajustes');
              }}
              className="-ml-e2 inline-flex min-h-toque items-center gap-e1 rounded-redondo px-e2 text-secundario font-medium text-texto-suave hover:text-texto"
            >
              <IconoFlechaIzquierda size={18} />
              Ajustes
            </button>
          </div>
          <LaSeccion id={abierta} />
        </div>
      )}
    </div>
  );
}

const ICONO: Readonly<Record<IdDeSeccion, Icono>> = {
  aparato: IconoColor,
  cuenta: IconoPersona,
  local: IconoLocal,
  conexiones: IconoAbrirFuera,
  suscripcion: IconoDinero,
  organizacion: IconoOrganizacion,
};

/** Lo que hay dentro de cada sección, con el título de la sección encima. */
function LaSeccion({ id }: { readonly id: IdDeSeccion }) {
  const { yo, permisos, salir } = usarSesion();
  const tieneLocal = yo?.local !== null && yo?.local !== undefined;
  const llevaElLocal = tieneLocal && puedeEditar(permisos, 'app.ajustes');

  return (
    <section aria-labelledby={`seccion-${id}`} className="flex flex-col gap-e4">
      <h2 id={`seccion-${id}`} className="text-seccion font-semibold">
        {nombreDeLaSeccion(id)}
      </h2>

      {id === 'aparato' && <ComoSeVe />}

      {id === 'cuenta' && (
        <>
          <Ancla id="mi-acceso">
            <MiAcceso />
          </Ancla>
          <Ancla id="idioma">
            <Idioma />
          </Ancla>
          <Ancla id="salir">
            <div>
              <Boton
                icono={<IconoSalir size={18} />}
                onClick={() => {
                  void salir();
                }}
              >
                Salir de este aparato{yo ? `, ${yo.nombre}` : ''}
              </Boton>
            </div>
          </Ancla>
        </>
      )}

      {id === 'local' && (
        <>
          <Ancla id="tu-marca">
            <TuMarca />
          </Ancla>
          {llevaElLocal && (
            <Ancla id="donde-esta-el-local">
              <DondeEstaElLocal />
            </Ancla>
          )}
          {llevaElLocal && (
            <Ancla id="llegar-tarde">
              <CuandoEsLlegarTarde />
            </Ancla>
          )}
          {llevaLosObjetivos(permisos, tieneLocal) && (
            <Ancla id="objetivos">
              <TusObjetivos />
            </Ancla>
          )}
          {llevaElLocal && (
            <Ancla id="tu-carta">
              <TuCartaYSuQr />
            </Ancla>
          )}
          {llevaLosPrecios(permisos, tieneLocal) && (
            <Ancla id="precios-de-compra">
              <TusPreciosDeCompra />
            </Ancla>
          )}
        </>
      )}

      {id === 'conexiones' && (
        <>
          <Ancla id="tus-ventas">
            <ComoEntranTusVentas modo="ajustes" />
          </Ancla>
          <Ancla id="google">
            <TuLocalEnGoogle />
          </Ancla>
        </>
      )}

      {id === 'suscripcion' && (
        <Ancla id="suscripcion">
          <TuSuscripcion />
        </Ancla>
      )}

      {id === 'organizacion' && (
        <Ancla id="acceso-de-la-organizacion">
          <AjustesDeOrganizacion />
        </Ancla>
      )}
    </section>
  );
}

/** El sitio al que lleva un ajuste encontrado: la tarjeta, con aire por arriba. */
function Ancla({ id, children }: { readonly id: string; readonly children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-[calc(var(--alto-barra-escritorio)+var(--spacing-e4))]">
      {children}
    </div>
  );
}

/**
 * Cómo se ve este aparato: la letra, el tema y el modo cocina, **en una tarjeta**.
 *
 * Son lo mismo —cómo se ve esta tablet o este móvil, no la persona— y por eso van
 * juntos, en filas, en vez de en tres tarjetas con un párrafo cada una.
 */
function ComoSeVe() {
  const { tamano, poner } = usarTamanoDeLetra();
  const { tema, poner: ponerTema } = usarTema();
  const { sePuedeDeshacer } = usarDeshacer();

  const cambiarTamano = (nuevo: TamanoDeLetra) => {
    const antes = tamano;
    poner(nuevo);
    if (antes === nuevo) return;

    sePuedeDeshacer({
      que: `Letra ${COMO_SE_LLAMA[nuevo].toLowerCase()}`,
      deshacer: () => {
        poner(antes);
      },
    });
  };

  return (
    <Tarjeta origen="Se queda guardado en este aparato">
      <div className="flex flex-col divide-y divide-borde">
        <Fila id="tamano-de-letra" titulo="Tamaño de letra">
          <div role="radiogroup" aria-label="Tamaño de letra" className="flex flex-wrap gap-e2">
            {TAMANOS.map((cual) => (
              <Opcion
                key={cual}
                elegida={cual === tamano}
                alElegir={() => {
                  cambiarTamano(cual);
                }}
                icono={<IconoTamanoDeLetra size={18} />}
              >
                <span style={{ fontSize: `${15 * CUANTO_MULTIPLICA[cual]}px` }}>
                  {COMO_SE_LLAMA[cual]}
                </span>
              </Opcion>
            ))}
          </div>
        </Fila>

        <Fila id="tema" titulo="Elige tu tema">
          <div role="radiogroup" aria-label="Elige tu tema" className="flex flex-wrap gap-e2">
            {TEMAS.map((cual: Tema) => (
              <Opcion
                key={cual}
                elegida={cual === tema}
                alElegir={() => {
                  ponerTema(cual);
                }}
                icono={cual === 'oscuro' ? <IconoLuna size={18} /> : <IconoSol size={18} />}
              >
                {COMO_SE_LLAMA_EL_TEMA[cual]}
              </Opcion>
            ))}
          </div>
        </Fila>

        <Fila id="modo-cocina" titulo="Modo cocina">
          <ModoCocina />
        </Fila>
      </div>
    </Tarjeta>
  );
}

/** Una fila de ajuste dentro de una tarjeta: su nombre arriba y sus opciones. */
function Fila({
  id,
  titulo,
  children,
}: {
  readonly id: string;
  readonly titulo: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="flex scroll-mt-[calc(var(--alto-barra-escritorio)+var(--spacing-e4))] flex-col gap-e3 py-e4 first:pt-e1 last:pb-e1"
    >
      <h3 className="text-cuerpo font-semibold">{titulo}</h3>
      {children}
    </div>
  );
}

/** Una opción de un grupo de radio: la pastilla elegida, en el color de la acción. */
function Opcion({
  elegida,
  alElegir,
  icono,
  children,
}: {
  readonly elegida: boolean;
  readonly alElegir: () => void;
  readonly icono: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={alElegir}
      className={clases(
        'inline-flex min-h-toque items-center gap-e2 rounded-redondo border px-e4 transition-colors',
        elegida
          ? 'border-naranja bg-naranja-suave text-texto'
          : 'border-borde bg-superficie text-texto-suave hover:bg-fondo',
      )}
    >
      {icono}
      {children}
    </button>
  );
}

/** El idioma de la persona: se guarda en su cuenta, no en el aparato. */
function Idioma() {
  const { yo, cliente, refrescar } = usarSesion();
  const [cambiando, setCambiando] = useState(false);

  return (
    <Tarjeta titulo="Idioma">
      <Selector
        etiqueta="Idioma"
        opciones={IDIOMAS.map((idioma) => ({
          valor: idioma,
          texto: NOMBRE_DEL_IDIOMA[idioma],
        }))}
        value={yo?.idioma ?? 'es'}
        disabled={cambiando}
        onChange={(e) => {
          const nuevo = e.currentTarget.value;
          setCambiando(true);
          void cliente.ejecutar('cambiar_mi_idioma', { idioma: nuevo }).then(async () => {
            setCambiando(false);
            await refrescar();
          });
        }}
      />
    </Tarjeta>
  );
}

/**
 * Dónde está el local · para que un fichaje diga si se hizo en el local.
 *
 * ── Por qué con un botón y no con la dirección ──────────────────────────────
 *
 * Porque sale mejor: quien lo pone está **en el local**, y el móvil sabe dónde está
 * con más precisión que cualquier dirección. Desde M7 la ubicación también puede
 * salir de la ficha de Google (tarjeta de arriba, decisión 0040), y **la marcada
 * aquí manda** sobre la de Google.
 *
 * Sin esto, los fichajes guardan su posición igual y no se comparan con nada. Se
 * puede poner cualquier día sin perder lo de antes.
 */
function DondeEstaElLocal() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noLaDio, setNoLaDio] = useState(false);
  /** Con cuánta precisión se marcó la última vez, en metros. Solo en esta visita. */
  const [precision, setPrecision] = useState<number | null>(null);

  const consulta = useQuery({
    queryKey: ['mi_fichaje'],
    retry: 1,
    queryFn: async (): Promise<MiFichaje> => {
      const respuesta = await cliente.consultar<MiFichaje>('mi_fichaje');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const puesto = consulta.data?.elLocalSabeDondeEsta === true;
  const radio = consulta.data?.radioMetros ?? 100;

  async function guardar(cuerpo: Record<string, unknown>) {
    setError(null);
    const respuesta = await cliente.ejecutar('poner_donde_esta_el_local', cuerpo);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['mi_fichaje'] });
    await cache.invalidateQueries({ queryKey: ['fichajes_de_hoy'] });
  }

  async function aqui() {
    setNoLaDio(false);
    setPrecision(null);
    setBuscando(true);
    const donde = await preguntarDondeEstoy();
    setBuscando(false);
    if (!('donde' in donde)) {
      setNoLaDio(true);
      return;
    }
    setPrecision(donde.donde.precision ?? null);
    await guardar({
      latitud: donde.donde.latitud,
      longitud: donde.donde.longitud,
      radio_metros: radio,
    });
  }

  /**
   * Más de cien metros de error es marcar la manzana, no el local. Pasa en un
   * ordenador o un TPV, que no tienen GPS y se sitúan por la wifi o por la
   * conexión: se marca igual —algo es mejor que nada— y se dice cómo mejorarlo.
   */
  const pocoPreciso = precision !== null && precision > 100;

  if (consulta.isError) return null;

  return (
    <Tarjeta titulo="Dónde está el local">
      {/* El ancla del aviso de Equipo · Hoy: «marca dónde está el local». */}
      <span id="donde-esta-el-local" />
      <div className="flex flex-col gap-e3">
        {error !== null && (
          <Aviso tono="mal" titulo={error.quePasa}>
            {error.queSePuedeHacer}
          </Aviso>
        )}
        {noLaDio && (
          <Aviso tono="atencion" titulo="El móvil no ha dado la ubicación">
            Activa la ubicación y dale permiso a Estook, y vuelve a probar.
          </Aviso>
        )}

        {pocoPreciso && (
          <Aviso tono="atencion" titulo={`Marcado, pero con ±${precision} m de error`}>
            Este aparato se sitúa por la conexión, no por GPS. Márcalo desde un móvil, dentro del
            local y con la ubicación exacta activada.
          </Aviso>
        )}

        <p className="text-cuerpo">
          {puesto
            ? precision !== null && !pocoPreciso
              ? `Puesto, con ±${precision} m de error. Cada fichaje dice a cuántos metros del local se hizo.`
              : 'Puesto. Cada fichaje dice a cuántos metros del local se hizo.'
            : 'Sin poner. Hazlo desde el propio local.'}
        </p>

        <div className="flex flex-wrap items-end gap-e3">
          <Boton
            tono={puesto ? 'secundario' : 'principal'}
            icono={<IconoUbicacion size={18} />}
            cargando={buscando}
            textoCargando="Buscando dónde estás"
            onClick={() => {
              void aqui();
            }}
          >
            {puesto ? 'Volver a marcarlo desde aquí' : 'Estoy en el local: márcalo'}
          </Boton>

          {puesto && (
            <div className="min-w-[10rem]">
              <Selector
                etiqueta="Cuenta como en el local hasta"
                opciones={[
                  { valor: '50', texto: '50 m' },
                  { valor: '100', texto: '100 m' },
                  { valor: '200', texto: '200 m' },
                  { valor: '500', texto: '500 m' },
                ]}
                value={String(radio)}
                onChange={(e) => {
                  // Solo el radio: sin coordenadas en el cuerpo, el comando deja
                  // las que hay. Mandarlas a nulo las borraría.
                  void guardar({ radio_metros: Number(e.currentTarget.value) });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Tarjeta>
  );
}

/**
 * El modo cocina · mejora 1 de la entrega V.
 *
 * Lo que hace está entero en `estilos/cocina.css`: aquí solo está el interruptor
 * y el texto que explica qué cambia, **sin jerga** (principio 14: «lo que hay en
 * cámara», no «stock disponible»).
 *
 * Va en la misma tarjeta que el tema y la letra a propósito: los tres son lo
 * mismo —cómo se ve **este aparato**— y quien busca uno encuentra los otros dos.
 */
function ModoCocina() {
  const { puesto, poner } = usarModoCocina();
  const { sePuedeDeshacer } = usarDeshacer();

  return (
    <div className="flex flex-col gap-e3">
      <Interruptor
        etiqueta="Ponlo en la tablet de la cocina"
        ayuda="Botones y letra grandes, más contraste y todo con un toque, que con guantes no se desliza."
        puesto={puesto}
        alCambiar={(nuevo) => {
          poner(nuevo);
          sePuedeDeshacer({
            que: nuevo ? 'Modo cocina puesto' : 'Modo cocina quitado',
            deshacer: () => {
              poner(!nuevo);
            },
          });
        }}
      />
      {puesto && (
        <p className="flex items-start gap-e2 text-secundario text-texto-suave">
          <IconoVer size={18} className="mt-[2px] shrink-0" />
          <span>
            Los botones no bajan de 64 píxeles y el texto se lee a más de dos metros. Si has elegido
            letra grande, sigue siendo más grande que la normal.
          </span>
        </p>
      )}
    </div>
  );
}
