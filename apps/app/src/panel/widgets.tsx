import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NOMBRE_DEL_ESTADO } from '@estook/dominio';
import { appsVisibles, puedeVer } from '@estook/permisos';
import {
  Cifra,
  EstadoVacio,
  Etiqueta,
  Proporcion,
  Tarjeta,
  acentoDelWidget,
  appPorPermiso,
  clases,
  rutaDe,
  type App,
  type TamanoDeWidget,
} from '@estook/ui';
import { useNavigate } from 'react-router-dom';
import { usarLoDeHoy } from '../ganchos/usarLoDeHoy.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { AccesosRapidos } from './AccesosRapidos.tsx';
import {
  TONO_DEL_ESTADO,
  comoDinero,
  comoSeLeeElDia,
  conUnidadDeUso,
  cuandoSeAgota,
  type MisMovimientos,
} from '../inventario/contrato.ts';

/**
 * Los widgets del Panel, uno por uno.
 *
 * ── Una consulta para todos, y no una por widget ─────────────────────────────
 *
 * Cuatro de los widgets de Inventario —caducidades, bajo mínimo, sin precio y el
 * valor de la cámara— salen de **la misma** consulta, `inventario_hoy`. Si cada uno
 * la pidiera por su cuenta serían cuatro viajes para pintar una pantalla, y el
 * presupuesto de velocidad de B7 da un segundo para el Panel entero.
 *
 * La resuelve TanStack Query sola: los cuatro llaman a `usarLoDeHoy()`, que usa la
 * misma `queryKey`, así que el primero pide y los otros tres leen de la caché. No
 * hay que coordinar nada, y **quitar un widget del Panel deja de pedir su parte**
 * sin que nadie tenga que acordarse.
 *
 * ── Y ninguno se inventa una cifra ───────────────────────────────────────────
 *
 * Es la regla que este proyecto ya había escrito y roto en el mismo sitio: la
 * tarjeta «Ventas de hoy» pintaba **«Facturado · 0,00 €»** en la tipografía más
 * grande de la pantalla con el TPV sin conectar, mientras el widget de «Tu equipo»
 * decía, a dos tarjetas de distancia, que «poner un cero en gris sería inventarse
 * una cifra». Ahora un widget cuyo dato no existe **no está en el catálogo como
 * disponible**: sale en la lista de los que llegan, con su módulo.
 */

/**
 * Un widget, sea el que sea.
 *
 * Devuelve `null` cuando no sabe pintar ese identificador, y eso es a propósito:
 * un Panel guardado hace meses puede nombrar un widget que ya no existe, y lo
 * correcto es que ese hueco no aparezca en vez de que la pantalla se caiga.
 */
/**
 * Quién se está pintando ahora mismo.
 *
 * ── Por qué un contexto y no un parámetro ────────────────────────────────────
 *
 * Porque lo que `Caja` necesita saber —de qué app es este widget, para pintar su
 * acento— **ya lo sabe `Widget`**, y pasarlo a mano obligaría a tocar las nueve
 * llamadas y a acordarse de la décima el día que se añada un widget nuevo. Un
 * widget que se olvidara de pasarlo saldría en blanco y nadie lo notaría hasta
 * verlo.
 *
 * Con el contexto, el acento sale solo del catálogo: un widget nuevo lo trae
 * puesto por declarar de qué app es, que es lo que ya declara.
 */
const QuienSePinta = createContext<string | null>(null);

export function Widget({
  id,
  tamano,
  editando,
}: {
  readonly id: string;
  readonly tamano: TamanoDeWidget;
  readonly editando: boolean;
}) {
  return (
    <QuienSePinta.Provider value={id}>
      <Cual id={id} tamano={tamano} editando={editando} />
    </QuienSePinta.Provider>
  );
}

function Cual({
  id,
  tamano,
  editando,
}: {
  readonly id: string;
  readonly tamano: TamanoDeWidget;
  readonly editando: boolean;
}) {
  if (id === 'acciones-rapidas') return <AccesosRapidos tamano={tamano} editando={editando} />;
  if (id === 'caducidades') return <Caducidades tamano={tamano} />;
  if (id === 'bajo-minimo') return <BajoMinimo tamano={tamano} />;
  if (id === 'sin-precio') return <SinPrecio tamano={tamano} />;
  if (id === 'valor-de-la-camara') return <ValorDeLaCamara />;
  if (id === 'cuanto-genero') return <CuantoGenero />;
  if (id === 'mis-apps') return <MisApps tamano={tamano} />;
  if (id === 'mi-equipo') return <MiEquipo />;
  if (id === 'ultimos-movimientos') return <UltimosMovimientos tamano={tamano} />;
  return null;
}

/** El envoltorio común: alto completo y el título pulsable si lleva a algún sitio. */
function Caja({
  titulo,
  origen,
  ir,
  children,
}: {
  readonly titulo: string;
  readonly origen?: string;
  readonly ir?: string;
  readonly children: React.ReactNode;
}) {
  const navegar = useNavigate();
  const quien = useContext(QuienSePinta);
  const acento = quien === null ? undefined : acentoDelWidget(quien);

  return (
    <div className="h-full [&>section]:h-full [&>section]:flex [&>section]:flex-col">
      <Tarjeta
        titulo={titulo}
        {...(acento === undefined ? {} : { acento })}
        {...(origen === undefined ? {} : { origen })}
        {...(ir === undefined
          ? {}
          : {
              accion: (
                <button
                  type="button"
                  onClick={() => {
                    navegar(ir);
                  }}
                  className="min-h-toque rounded-medio px-e2 text-secundario font-medium text-texto-suave hover:text-texto"
                >
                  Ver
                </button>
              ),
            })}
      >
        <div className="min-h-0 flex-1">{children}</div>
      </Tarjeta>
    </div>
  );
}

// ── Lo que caduca ────────────────────────────────────────────────────────────

function Caducidades({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const consulta = usarLoDeHoy();
  const navegar = useNavigate();
  const caducan = consulta.data?.caducan ?? [];
  const cuantos = tamano === 'grande' ? 6 : 3;

  return (
    <Caja
      titulo="Caduca esta semana"
      origen="Lotes con fecha · próximos 7 días"
      ir="/inventario/hoy"
    >
      {caducan.length === 0 ? (
        <p className="text-secundario text-texto-suave">Nada caduca en los próximos siete días.</p>
      ) : (
        <ul className="flex flex-col gap-e1">
          {caducan.slice(0, cuantos).map((lote) => (
            <li key={`${lote.productoId}-${lote.caducaEl}`}>
              <button
                type="button"
                onClick={() => {
                  navegar('/inventario/hoy');
                }}
                className="flex w-full items-center gap-e2 rounded-medio px-e1 py-e1 text-left hover:bg-fondo"
              >
                <span className="min-w-0 flex-1 truncate text-cuerpo">{lote.producto}</span>
                <Etiqueta tono={lote.dias <= 1 ? 'mal' : 'atencion'}>
                  {lote.dias <= 0 ? 'caducado' : lote.dias === 1 ? 'mañana' : `${lote.dias} d`}
                </Etiqueta>
              </button>
            </li>
          ))}
          {caducan.length > cuantos && (
            <li className="px-e1 text-secundario text-texto-suave">
              y {caducan.length - cuantos} más
            </li>
          )}
        </ul>
      )}
    </Caja>
  );
}

// ── Lo que está bajo mínimo ──────────────────────────────────────────────────

function BajoMinimo({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const consulta = usarLoDeHoy();
  const navegar = useNavigate();
  const atencion = consulta.data?.atencion ?? [];
  const cuantos = tamano === 'grande' ? 6 : 3;

  return (
    <Caja
      titulo="Bajo mínimo"
      origen="De tu inventario, ahora mismo"
      ir="/inventario/productos/bajo-minimo"
    >
      {atencion.length === 0 ? (
        <p className="text-secundario text-texto-suave">
          Ningún producto está por debajo de su mínimo.
        </p>
      ) : (
        <ul className="flex flex-col gap-e2">
          {atencion.slice(0, cuantos).map((producto) => {
            const agota = cuandoSeAgota(producto.seAgotaEn, producto.diasDeCobertura);
            return (
              <li key={producto.id}>
                <button
                  type="button"
                  onClick={() => {
                    navegar('/inventario/productos/bajo-minimo');
                  }}
                  className="w-full rounded-medio px-e1 py-e1 text-left hover:bg-fondo"
                >
                  <span className="flex items-center gap-e2">
                    <span className="min-w-0 flex-1 truncate text-cuerpo">{producto.nombre}</span>
                    <Etiqueta tono={TONO_DEL_ESTADO[producto.estado]}>
                      {NOMBRE_DEL_ESTADO[producto.estado]}
                    </Etiqueta>
                  </span>
                  <span className="block text-secundario text-texto-suave">
                    Quedan {conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}
                    {producto.minimo === null
                      ? ''
                      : ` de ${conUnidadDeUso(producto.minimo, producto.unidadDeUso)} de mínimo`}
                    {agota === null ? '' : ` · se agota ${agota}`}
                  </span>

                  {/*
                    Cuánto queda respecto del mínimo, de un vistazo.

                    «Bajo mínimo» es una lista de nombres, y todos los nombres
                    pesan lo mismo: al que le queda la mitad y al que no le queda
                    nada salen iguales, y lo que hay que saber es **por cuál
                    empezar**. La barra lo dice sin leer.

                    Se pinta solo si hay mínimo puesto: sin él, «bajo mínimo» no
                    es una proporción de nada y una barra sería un adorno.
                  */}
                  {producto.minimo !== null && producto.minimo > 0 && (
                    <span className="mt-e1 block">
                      <Proporcion
                        soloLaBarra
                        // eslint-disable-next-line no-restricted-syntax -- un porcentaje para leerlo, no dinero
                        titulo={`${producto.nombre}: queda el ${Math.round((producto.cantidad / producto.minimo) * 100)} % de su mínimo`}
                        trozos={[
                          {
                            que: 'lo que queda',
                            cuantos: Math.max(0, Math.min(producto.cantidad, producto.minimo)),
                            tono: TONO_DEL_ESTADO[producto.estado] === 'mal' ? 'mal' : 'atencion',
                          },
                          {
                            que: 'lo que falta',
                            cuantos: Math.max(0, producto.minimo - producto.cantidad),
                            tono: 'neutro',
                          },
                        ]}
                      />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {atencion.length > cuantos && (
            <li className="px-e1 text-secundario text-texto-suave">
              y {atencion.length - cuantos} más
            </li>
          )}
        </ul>
      )}
    </Caja>
  );
}

// ── Los que no tienen precio ─────────────────────────────────────────────────

function SinPrecio({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const consulta = usarLoDeHoy();
  const hoy = consulta.data;
  const sinPrecio = hoy?.sinPrecio ?? [];

  return (
    <Caja
      titulo="Sin precio"
      origen="Cuentan cero en el valor de la cámara"
      ir="/inventario/productos/sin-precio"
    >
      <Cifra
        etiqueta="Productos"
        valor={sinPrecio.length}
        formato={(v) => `${v}`}
        origen={
          hoy === undefined
            ? 'Leyendo…'
            : sinPrecio.length === 0
              ? 'Todos tienen precio'
              : `De ${hoy.cuantosProductos}`
        }
      />
      {tamano !== 'chico' && sinPrecio.length > 0 && (
        <p className="mt-e2 text-secundario text-texto-suave">
          {sinPrecio
            .slice(0, 4)
            .map((p) => p.nombre)
            .join(', ')}
          {sinPrecio.length > 4 ? '…' : ''}
        </p>
      )}
    </Caja>
  );
}

// ── Lo que vale la cámara ────────────────────────────────────────────────────

function ValorDeLaCamara() {
  const consulta = usarLoDeHoy();
  const hoy = consulta.data;

  // «Un rol sin costes no recibe ni un campo de coste»: si el servidor no ha
  // mandado dinero, el widget lo dice en vez de pintar un cero.
  if (hoy !== undefined && !hoy.puedeVerPrecios) {
    return (
      <Caja titulo="Valor de la cámara">
        <p className="text-secundario text-texto-suave">
          Tu acceso no incluye los costes del género.
        </p>
      </Caja>
    );
  }

  return (
    <Caja titulo="Valor de la cámara" origen="A precio medio ponderado" ir="/inventario/hoy">
      <Cifra
        etiqueta="El género que hay"
        valor={hoy?.valorTotalCentimos ?? 0}
        formato={(v) => comoDinero(v)}
        origen={hoy === undefined ? 'Leyendo…' : 'Sin contar los ejemplos'}
      />
    </Caja>
  );
}

function CuantoGenero() {
  const consulta = usarLoDeHoy();
  const hoy = consulta.data;

  return (
    <Caja titulo="Tu género" ir="/inventario/productos/todo">
      <Cifra
        etiqueta="Productos de alta"
        valor={hoy?.cuantosProductos ?? 0}
        formato={(v) => `${v}`}
        origen={
          hoy === undefined
            ? 'Leyendo…'
            : hoy.ejemplos > 0
              ? `${hoy.ejemplos} son de ejemplo`
              : 'Todos de verdad'
        }
      />

      {/*
        Y cuántos de esos llevan precio, en una barra.

        No es adorno: **un producto sin precio cuenta cero en el valor de la
        cámara**, así que la cifra de arriba y la de «Valor de la cámara» solo
        cuadran cuando esta barra está entera. Verlo de lejos y sin leer es lo que
        hace que alguien lo arregle.

        Los dos trozos no se solapan —o tiene precio o no lo tiene—, que es lo que
        hace que una barra sea honesta. Un producto puede estar a la vez bajo
        mínimo y sin precio, así que **esas dos no se pueden apilar**.
      */}
      {hoy !== undefined && hoy.cuantosProductos > 0 && (
        <div className="mt-e3">
          <Proporcion
            titulo="Cuántos de tus productos llevan precio"
            trozos={[
              {
                que: 'con precio',
                cuantos: hoy.cuantosProductos - hoy.sinPrecio.length,
                tono: 'bien',
              },
              { que: 'sin precio', cuantos: hoy.sinPrecio.length, tono: 'atencion' },
            ]}
          />
        </div>
      )}
    </Caja>
  );
}

// ── Tus apps ─────────────────────────────────────────────────────────────────

function MisApps({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const { permisos } = usarSesion();
  const navegar = useNavigate();

  const misApps = appsVisibles(permisos)
    .map((permiso) => appPorPermiso(permiso))
    .filter((app): app is App => app !== undefined);

  return (
    <Caja titulo="Tus apps">
      <ul
        className={clases(
          'grid gap-e1',
          tamano === 'grande' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {misApps.map((app) => (
          <li key={app.id}>
            <button
              type="button"
              onClick={() => {
                navegar(rutaDe(app));
              }}
              className="flex w-full min-h-toque items-center gap-e2 rounded-medio px-e1 text-left hover:bg-fondo"
            >
              <span className="shrink-0" style={{ color: app.acento }}>
                <app.icono size={18} />
              </span>
              <span className="min-w-0 flex-1 truncate text-cuerpo">{app.nombre}</span>
            </button>
          </li>
        ))}
      </ul>
    </Caja>
  );
}

// ── Tu equipo ────────────────────────────────────────────────────────────────

interface AccesoEnPanel {
  readonly personaId: string;
  readonly nombre: string;
  readonly rolNombre: string;
  readonly estado: 'dentro' | 'sin_estrenar' | 'fuera';
}

function MiEquipo() {
  const { cliente, yo, permisos } = usarSesion();
  const localId = yo?.local?.id ?? '';

  const consulta = useQuery({
    queryKey: ['quien_tiene_acceso', localId],
    enabled: localId !== '' && puedeVer(permisos, 'app.equipo'),
    queryFn: async (): Promise<readonly AccesoEnPanel[]> => {
      const respuesta = await cliente.consultar<readonly AccesoEnPanel[]>('quien_tiene_acceso', {
        local_id: localId,
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const equipo = (consulta.data ?? []).filter((a) => a.estado !== 'fuera');
  const sinEntrar = equipo.filter((a) => a.estado === 'sin_estrenar').length;

  return (
    <Caja
      titulo="Tu equipo"
      origen={
        sinEntrar === 0
          ? 'Con acceso a este local'
          : `${sinEntrar} sin entrar todavía: su PIN sigue valiendo`
      }
      ir="/equipo/personas/con-acceso"
    >
      {equipo.length <= 1 ? (
        <EstadoVacio
          compacto
          titulo="Llevas el local solo"
          frase="Cuando des acceso a alguien, aquí verás quién es y quién no ha entrado todavía."
          sinAccionPorque="Se invita desde Equipo · Personas."
        />
      ) : (
        <ul className="flex flex-col gap-e1">
          {equipo.slice(0, 5).map((persona) => (
            <li key={persona.personaId} className="flex items-center gap-e2">
              <span className="min-w-0 flex-1 truncate text-cuerpo">{persona.nombre}</span>
              <span className="shrink-0 text-secundario text-texto-suave">{persona.rolNombre}</span>
              {persona.estado === 'sin_estrenar' && <Etiqueta tono="atencion">sin entrar</Etiqueta>}
            </li>
          ))}
        </ul>
      )}
      {/* Lo que este widget **no** dice, dicho: «poner un cero en gris seria
          inventarse una cifra». */}
      <p className="mt-e2 text-secundario text-texto-tenue">
        Quién está fichado y cuántas horas lleva son los fichajes, M15.
      </p>
    </Caja>
  );
}

// ── Lo último apuntado ───────────────────────────────────────────────────────

function UltimosMovimientos({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const { cliente, permisos, yo } = usarSesion();
  const cuantos = tamano === 'grande' ? 8 : 4;

  const consulta = useQuery({
    queryKey: ['mis_movimientos', 'panel'],
    enabled: puedeVer(permisos, 'app.inventario') && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<MisMovimientos> => {
      const respuesta = await cliente.consultar<MisMovimientos>('mis_movimientos', { limite: '8' });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const datos = consulta.data;
  const lineas = datos?.movimientos ?? [];

  return (
    <Caja
      titulo="Lo último apuntado"
      origen="Del libro de movimientos"
      ir="/inventario/movimientos/todo"
    >
      {lineas.length === 0 ? (
        <p className="text-secundario text-texto-suave">
          Todavía no se ha apuntado ninguna entrada ni salida.
        </p>
      ) : (
        <ul className="flex flex-col gap-e1">
          {lineas.slice(0, cuantos).map((m) => (
            <li key={m.id} className="flex items-baseline gap-e2">
              <span className="min-w-0 flex-1 truncate text-cuerpo">{m.producto}</span>
              <span
                className={clases(
                  'shrink-0 text-secundario',
                  m.cantidad > 0 ? 'text-bien' : 'text-mal',
                )}
              >
                {m.cantidad > 0 ? '+' : '−'}
                {conUnidadDeUso(Math.abs(m.cantidad), m.unidadDeUso)}
              </span>
              <span className="shrink-0 text-secundario text-texto-tenue">
                {datos === undefined ? '' : comoSeLeeElDia(m.fechaOperativa, datos.hoy)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Caja>
  );
}
