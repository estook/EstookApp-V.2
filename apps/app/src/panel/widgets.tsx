import { createContext, useContext, useState } from 'react';
import { nombreEn } from '../datos/nombreEn.ts';
import { useQuery } from '@tanstack/react-query';
import {
  AVISAR_ANTES_DE_ENTRAR,
  NOMBRE_DEL_ESTADO,
  NOMBRE_DEL_ORIGEN_DEL_CIERRE,
  minutosHasta,
  porcentajeDe,
} from '@estook/dominio';
import { appsVisibles, puedeVer } from '@estook/permisos';
import {
  Avatar,
  Boton,
  Cargando,
  Cifra,
  EstadoVacio,
  Etiqueta,
  Proporcion,
  Tarjeta,
  Tira,
  acentoDelWidget,
  appPorPermiso,
  clases,
  rutaDe,
  type App,
  type TamanoDeWidget,
} from '@estook/ui';
import { IconoAnadir, IconoCamara, IconoEntrar, IconoSalir, IconoUbicacion } from '@estook/iconos';
import { useNavigate } from 'react-router-dom';
import { usarLoDeHoy } from '../ganchos/usarLoDeHoy.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { AccesosRapidos } from './AccesosRapidos.tsx';
import { ApuntarMerma } from '../inventario/ApuntarMerma.tsx';
import { usarFichar } from '../ganchos/usarFichar.ts';
import {
  comoSeLeeLaHora,
  comoSeLeenMinutos,
  ultimaVez,
  type FichajesDeHoy,
} from '../equipo/contrato.ts';
import type { MisCierres } from '../servicio/contrato.ts';
import {
  TONO_DEL_ESTADO,
  comoDinero,
  comoSeLeeElDia,
  comoSeLeeLaFecha,
  conUnidadDeUso,
  cuandoSeAgota,
  type MermaDeHoy,
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
  if (id === 'fichar') return <FicharDesdeElPanel tamano={tamano} />;
  if (id === 'fichajes') return <QuienEstaTrabajandoWidget tamano={tamano} />;
  if (id === 'personas') return <PersonasWidget tamano={tamano} />;
  if (id === 'merma') return <MermaWidget tamano={tamano} />;
  if (id === 'ventas-de-hoy') return <VentasDeHoyWidget />;
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

// ── Fichar, desde el Panel ───────────────────────────────────────────────────

/**
 * Fichar · entrar y salir del turno.
 *
 * ── Por qué vive aquí y no dentro de Equipo ─────────────────────────────────
 *
 * Porque un cocinero **no tiene la app Equipo**: la matriz de M1 no se la da, y
 * con razón. Si fichar viviera solo dentro de Equipo, la mitad de la plantilla no
 * podría fichar, que es justo la mitad que ficha.
 *
 * ── Y el aviso, que es lo que pedía la lista ────────────────────────────────
 *
 * «Avisar según el horario a la gente: mañana entras a las…, o entras en 5
 * minutos, ficha ya.» Eso entero son notificaciones, y las notificaciones son M25
 * —correo con Resend y push con su trabajador de servicio— con el reloj de la
 * decisión 0016 detrás.
 *
 * Lo que **sí se puede hacer hoy, y se hace**, es lo que no necesita nada de eso:
 * si tu turno empieza dentro de media hora y no has fichado, el widget te lo dice
 * en cuanto abres la aplicación. No suena, no llega al bolsillo, y no promete que
 * lo haga. El horario de siempre de cada uno se pone en su ficha.
 */
function FicharDesdeElPanel({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const fichar = usarFichar();
  const mio = fichar.mio;

  if (fichar.cargando) {
    return (
      <Caja titulo="Fichar">
        <Cargando que="tu turno" lineas={2} />
      </Caja>
    );
  }

  if (mio === undefined || !mio.puedoFichar) {
    return (
      <Caja titulo="Fichar">
        <p className="text-secundario text-texto-suave">
          Tu acceso no incluye fichar. Las horas las lleva quien tenga ese permiso.
        </p>
      </Caja>
    );
  }

  const abierto = mio.abierto;
  const dentro = abierto !== null;
  const deHoy = comoSeLeenMinutos(mio.minutosDeHoy);

  // Su turno de hoy, si tiene horario puesto. Es de lo que cuelga el aviso.
  const deHoyEnElHorario = mio.horario.filter((tramo) => tramo.dia === mio.diaDeLaSemana);
  const entraHoy = deHoyEnElHorario[0]?.entra ?? null;
  const faltan = entraHoy === null ? null : minutosHasta(mio.horaDelLocal, entraHoy);
  const tocaFichar =
    !dentro && faltan !== null && faltan <= AVISAR_ANTES_DE_ENTRAR && faltan > -240;

  return (
    <Caja
      titulo={dentro ? 'Estás dentro' : 'Fichar'}
      origen={abierto !== null ? `Desde las ${comoSeLeeLaHora(abierto.entroEn)}` : `Hoy: ${deHoy}`}
    >
      <div className="flex h-full flex-col justify-between gap-e3">
        <div>
          {abierto !== null ? (
            <p className="text-titulo font-semibold tabular-nums">
              {comoSeLeenMinutos(abierto.minutos)}
            </p>
          ) : tocaFichar ? (
            <p className="text-cuerpo font-medium text-atencion">
              {faltan > 0
                ? `Entras en ${faltan} min. Ficha ya.`
                : `Entrabas a las ${entraHoy ?? ''}. Todavía no has fichado.`}
            </p>
          ) : (
            <p className="text-secundario text-texto-suave">
              {mio.minutosDeHoy > 0
                ? `Hoy llevas ${deHoy}. Esta semana, ${comoSeLeenMinutos(mio.minutosDeLaSemana)}.`
                : entraHoy === null
                  ? 'No has fichado hoy.'
                  : `Hoy entras a las ${entraHoy}.`}
            </p>
          )}

          {fichar.error !== null && (
            <p className="mt-e2 text-secundario text-mal">{fichar.error.quePasa}</p>
          )}

          {fichar.acabaDe !== null && fichar.error === null && (
            <p aria-live="polite" className="mt-e2 text-secundario text-bien">
              {fichar.acabaDe.entro ? 'Entrada apuntada' : 'Salida apuntada'}
              {fichar.acabaDe.metros === null ? '' : `, a ${fichar.acabaDe.metros} m del local`}.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-e2">
          <Boton
            tono={dentro ? 'secundario' : 'principal'}
            ancho
            icono={dentro ? <IconoSalir size={18} /> : <IconoEntrar size={18} />}
            cargando={fichar.fichando}
            textoCargando={
              fichar.paso === 'buscando_ubicacion' ? 'Buscando dónde estás' : 'Apuntando'
            }
            onClick={dentro ? fichar.salir : fichar.entrar}
          >
            {dentro ? 'Fichar la salida' : 'Fichar la entrada'}
          </Boton>

          {/*
            Que se va a pedir la ubicación, dicho **antes** de pulsar. Un permiso
            del navegador que salta de golpe se deniega por reflejo, y una vez
            denegado no se vuelve a preguntar: se queda denegado para siempre en
            ese aparato. Decirlo antes es la diferencia entre que la gente lo
            acepte o que todos los fichajes salgan sin ubicación.
          */}
          {tamano !== 'chico' && (
            <p className="flex items-start gap-e2 text-etiqueta text-texto-tenue">
              <span aria-hidden className="mt-[1px] shrink-0">
                <IconoUbicacion size={14} />
              </span>
              <span>
                Se te pedirá la ubicación al fichar.{' '}
                {mio.elLocalSabeDondeEsta
                  ? `Queda apuntado a cuántos metros del local estabas.`
                  : 'Tu local todavía no tiene su posición puesta, así que se guarda sin comparar.'}{' '}
                Si el móvil no la da, se ficha igual.
              </span>
            </p>
          )}
        </div>
      </div>
    </Caja>
  );
}

// ── Quién está trabajando ────────────────────────────────────────────────────

/**
 * ── Por qué esto no es «Tu equipo» ─────────────────────────────────────────
 *
 * Había un widget que enseñaba la plantilla entera en pastillas y ocupaba media
 * pantalla de un TPV para contestar algo que no se pregunta a diario: quién tiene
 * acceso. Para eso se entra en Equipo.
 *
 * Esto contesta la pregunta de las siete de la tarde: **quién ha fichado y quién
 * no**. Y ya no dice «los fichajes llegan en M15», que es lo que decía cada
 * mañana desde M5.
 */
function QuienEstaTrabajandoWidget({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const { cliente, permisos, yo } = usarSesion();
  const cuantos = tamano === 'grande' ? 8 : 4;

  const consulta = useQuery({
    queryKey: ['fichajes_de_hoy'],
    enabled: puedeVer(permisos, 'app.equipo') && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<FichajesDeHoy> => {
      const respuesta = await cliente.consultar<FichajesDeHoy>('fichajes_de_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    staleTime: 60_000,
  });

  const datos = consulta.data;
  const dentro = (datos?.gente ?? []).filter((quien) => quien.dentro);
  const fuera = (datos?.gente ?? []).filter((quien) => !quien.dentro);

  return (
    <Caja
      titulo={dentro.length === 1 ? '1 persona dentro' : `${dentro.length} personas dentro`}
      origen={`Fichajes de hoy · son las ${datos?.horaDelLocal ?? '--:--'} en el local`}
      ir="/equipo/hoy"
    >
      {datos === undefined ? (
        <Cargando que="los fichajes" lineas={3} />
      ) : datos.gente.length === 0 ? (
        <EstadoVacio
          compacto
          titulo="Todavía no hay equipo"
          frase="Cuando alguien más tenga acceso a este local, aquí verás quién ha fichado."
          sinAccionPorque="Se invita desde Equipo · Personas."
        />
      ) : dentro.length === 0 ? (
        <p className="text-secundario text-texto-suave">
          Nadie ha fichado todavía.{' '}
          {fuera.filter((quien) => quien.entraHoyALas !== null).length > 0
            ? `${fuera.filter((quien) => quien.entraHoyALas !== null).length} tienen turno hoy.`
            : ''}
        </p>
      ) : (
        <ul className="flex flex-col gap-e1">
          {dentro.slice(0, cuantos).map((quien) => (
            <li key={quien.personaId} className="flex items-center gap-e2">
              <span className="min-w-0 flex-1 truncate text-cuerpo">{quien.nombre}</span>
              <span className="shrink-0 text-secundario tabular-nums text-texto-suave">
                {comoSeLeenMinutos(quien.minutos ?? 0)}
              </span>
              {quien.turnoSospechoso && <Etiqueta tono="atencion">revisar</Etiqueta>}
            </li>
          ))}
          {dentro.length > cuantos && (
            <li className="text-secundario text-texto-suave">y {dentro.length - cuantos} más</li>
          )}
        </ul>
      )}

      {datos !== undefined && fuera.length > 0 && dentro.length > 0 && (
        <p className="mt-e2 text-secundario text-texto-suave">
          {fuera.length === 1 ? '1 persona no ha fichado' : `${fuera.length} no han fichado`}.
        </p>
      )}
    </Caja>
  );
}

// ── Personas ─────────────────────────────────────────────────────────────────

/**
 * Quién hay, quién está en línea y cuándo se le vio.
 *
 * ── «En línea» y «ha fichado» no son lo mismo ──────────────────────────────
 *
 * Y mezclarlos era lo que hacía el widget de antes. Estar en línea es tener la
 * aplicación abierta —puede ser desde casa—; haber fichado es estar trabajando.
 * Un jefe de cocina necesita lo segundo y quien lleva el local necesita lo primero
 * para saber si a alguien le falla el acceso. Son dos widgets porque son dos
 * preguntas.
 */
function PersonasWidget({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const { cliente, permisos, yo } = usarSesion();
  const navegar = useNavigate();
  const cuantos = tamano === 'grande' ? 10 : 5;

  const consulta = useQuery({
    queryKey: ['fichajes_de_hoy'],
    enabled: puedeVer(permisos, 'app.equipo') && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<FichajesDeHoy> => {
      const respuesta = await cliente.consultar<FichajesDeHoy>('fichajes_de_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    staleTime: 60_000,
  });

  const gente = consulta.data?.gente ?? [];
  const enLinea = gente.filter((quien) => quien.enLinea).length;

  return (
    <Caja
      titulo={gente.length === 1 ? '1 persona' : `${gente.length} personas`}
      origen={enLinea === 0 ? 'Nadie en línea ahora' : `${enLinea} en línea ahora`}
      ir="/equipo/personas/con-acceso"
    >
      {consulta.data === undefined ? (
        <Cargando que="tu equipo" lineas={3} />
      ) : gente.length === 0 ? (
        <EstadoVacio
          compacto
          titulo="Llevas el local solo"
          frase="Cuando des acceso a alguien, aquí verás quién es y cuándo se le vio por última vez."
          sinAccionPorque="Se invita desde Equipo · Personas."
        />
      ) : (
        <ul className="flex flex-col gap-e1">
          {gente.slice(0, cuantos).map((quien) => (
            <li key={quien.personaId}>
              {/* Al nombre se pulsa y se abre su ficha. Es lo que pedía la lista:
                  el nombre y la cara son enlaces a la persona, desde donde estén. */}
              <button
                type="button"
                onClick={() => {
                  navegar(`/equipo/personas/con-acceso?persona=${quien.personaId}`);
                }}
                className="flex w-full min-h-toque items-center gap-e2 rounded-medio px-e1 text-left hover:bg-fondo"
              >
                <Avatar nombre={`${quien.nombre} ${quien.apellidos ?? ''}`.trim()} tamano={24} />
                <span className="min-w-0 flex-1 truncate text-cuerpo">{quien.nombre}</span>
                <span className="shrink-0 text-secundario text-texto-suave">
                  {/* Color **y** palabra, nunca solo color (B8). */}
                  {quien.enLinea ? 'En línea' : ultimaVez(quien.ultimoAccesoEn)}
                </span>
              </button>
            </li>
          ))}
          {gente.length > cuantos && (
            <li className="px-e1 text-secundario text-texto-suave">
              y {gente.length - cuantos} más
            </li>
          )}
        </ul>
      )}
    </Caja>
  );
}

// ── La merma del día ─────────────────────────────────────────────────────────

/**
 * Lo que se ha ido hoy sin venderse, con su tira de los días de antes.
 *
 * ── Por qué esto es un widget y no una pantalla más ────────────────────────
 *
 * Porque la merma se apunta **en mitad de un servicio**, con una mano ocupada, y
 * lo que no está a un toque no se apunta. Y una merma que no se apunta es food
 * cost que aparece a fin de mes sin explicación.
 *
 * La tira de catorce días está porque una cifra sola no dice nada: doce euros de
 * merma es mucho o poco según lo de siempre, y eso es exactamente lo que una tira
 * de barras contesta sin leer un número.
 */
function MermaWidget({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const { cliente, permisos, yo } = usarSesion();
  const [apuntando, setApuntando] = useState(false);

  const consulta = useQuery({
    queryKey: ['merma_de_hoy'],
    enabled:
      puedeVer(permisos, 'accion.registrar_merma') && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<MermaDeHoy> => {
      const respuesta = await cliente.consultar<MermaDeHoy>('merma_de_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const datos = consulta.data;
  const conPrecios = datos?.puedeVerPrecios === true;

  return (
    <Caja
      titulo="Merma de hoy"
      origen={
        conPrecios && datos.mediaCentimos !== null && datos.mediaCentimos !== undefined
          ? `La media de estos catorce días es ${comoDinero(datos.mediaCentimos)}`
          : 'Lo que ha salido de cámara sin venderse'
      }
      // «Ver» solo a quien tiene Inventario: a un camarero le llevaría a una
      // pantalla que no puede abrir.
      {...(puedeVer(permisos, 'app.inventario') ? { ir: '/inventario/movimientos/mermas' } : {})}
    >
      {datos === undefined ? (
        <Cargando que="la merma" lineas={2} />
      ) : (
        <div className="flex h-full flex-col justify-between gap-e3">
          <div>
            {conPrecios ? (
              <Cifra
                etiqueta="Hoy"
                valor={datos.deHoy.valorCentimos ?? 0}
                formato={(v) => comoDinero(v)}
                origen={
                  datos.deHoy.cuantas === 0
                    ? 'Nada apuntado hoy'
                    : `${datos.deHoy.cuantas} ${datos.deHoy.cuantas === 1 ? 'apunte' : 'apuntes'}`
                }
              />
            ) : (
              <Cifra
                etiqueta="Hoy"
                valor={datos.deHoy.cuantas}
                formato={(v) => String(v)}
                origen={datos.deHoy.cuantas === 1 ? 'apunte' : 'apuntes'}
              />
            )}

            {datos.deHoy.loPeor !== null && (
              <p className="mt-e1 text-secundario text-texto-suave">
                Lo más caro: {datos.deHoy.loPeor.producto}
                {conPrecios ? ` · ${comoDinero(datos.deHoy.loPeor.valorCentimos)}` : ''}
              </p>
            )}

            {tamano !== 'ancho' || datos.dias.length > 0 ? (
              <div className="mt-e3">
                <Tira
                  titulo="Merma de los últimos catorce días"
                  puntos={datos.dias.map((dia) => ({
                    valor: conPrecios ? (dia.valorCentimos ?? 0) : dia.cuantas,
                    cuando: comoSeLeeLaFecha(dia.fecha),
                  }))}
                  formato={(v) => (conPrecios ? comoDinero(v) : String(v))}
                  color="var(--color-app-inventario)"
                  alto={tamano === 'grande' ? 56 : 36}
                />
              </div>
            ) : null}
          </div>

          {datos.puedeApuntar && (
            <div className="flex flex-wrap gap-e2">
              <Boton
                tono="principal"
                icono={<IconoAnadir size={18} />}
                onClick={() => {
                  setApuntando(true);
                }}
              >
                Apuntar
              </Boton>
              {/*
                La cámara, apagada y con su motivo. Leer una foto y sacar de ahí el
                producto y el peso lo hace Fogón, y llega con M22. Se deja el sitio
                hecho porque saber que va a poder hacerse cambia cómo se usa esto
                hoy, y **no se puede pulsar**: un botón que promete algo y no lo
                hace es el fallo que este proyecto persigue desde M4.
              */}
              <Boton
                tono="secundario"
                disabled
                icono={<IconoCamara size={18} />}
                onClick={() => undefined}
              >
                Con una foto · M22
              </Boton>
            </div>
          )}

          {/* La hoja vive aquí y no en la rejilla: se abre desde el widget y desde
              la pantalla de mermas, y es el mismo formulario en los dos sitios. */}
          <ApuntarMerma
            abierta={apuntando}
            alCerrar={() => {
              setApuntando(false);
            }}
          />
        </div>
      )}
    </Caja>
  );
}

// ── Las ventas de hoy ────────────────────────────────────────────────────────

/**
 * Lo que ha entrado hoy.
 *
 * ── Esta tarjeta llevaba desde M5 diciendo que llegaba en M20 ──────────────
 *
 * Y decía la verdad mientras la cifra tenía que venir del TPV. El problema es que
 * **media hostelería no va a conectar un TPV nunca**: un bar con una caja de
 * veinte años y un papel de Z no tiene API, así que el widget habría seguido
 * apagado para ellos para siempre.
 *
 * Desde M6½ la cifra sale del cierre de caja, que se apunta a mano, se sube de un
 * CSV o se saca de una foto del Z. Cuando llegue el conector de M20, lo que traiga
 * se guarda en la misma tabla y este widget no se entera de que ha cambiado nada.
 *
 * Y si no hay cierre, **no pinta un cero**: dice que falta cerrar y lleva ahí. «Un
 * cero en gris sería inventarse una cifra», y ese fallo ya estuvo en esta misma
 * tarjeta.
 */
function VentasDeHoyWidget() {
  const { cliente, permisos, yo } = usarSesion();
  const navegar = useNavigate();

  const consulta = useQuery({
    queryKey: ['mis_cierres', 'panel'],
    enabled: puedeVer(permisos, 'dato.ventas') && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<MisCierres> => {
      const respuesta = await cliente.consultar<MisCierres>('mis_cierres', { limite: '7' });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const datos = consulta.data;
  const deHoy = datos?.cierres.find((cierre) => cierre.fecha === datos.jornada) ?? null;
  // El food cost del día lo cuenta el dominio, que es su único dueño (regla 6).
  const foodCostDeHoy =
    deHoy === null ? null : porcentajeDe(deHoy.consumoCentimos ?? 0, deHoy.totalCentimos);

  return (
    <Caja
      titulo="Ventas de hoy"
      origen={
        deHoy === null
          ? 'Sin cerrar todavía'
          : nombreEn(NOMBRE_DEL_ORIGEN_DEL_CIERRE, deHoy.origen, 'Del cierre de caja')
      }
      ir="/servicio/jornada/cierre"
    >
      {datos === undefined ? (
        <Cargando que="las ventas" lineas={2} />
      ) : deHoy === null ? (
        <div className="flex h-full flex-col justify-between gap-e3">
          <p className="text-secundario text-texto-suave">
            {datos.comoSeCierra === 'sin_decidir'
              ? 'Todavía no has elegido cómo entran tus ventas.'
              : datos.comoSeCierra === 'tpv'
                ? 'Tu TPV traerá las ventas cuando esté conectado. Hasta entonces se pueden apuntar a mano.'
                : 'La caja de hoy no está cerrada.'}
          </p>
          {datos.puedeCerrar && (
            <div>
              <Boton
                tono="principal"
                onClick={() => {
                  navegar('/servicio/jornada/cierre');
                }}
              >
                Cerrar la caja
              </Boton>
            </div>
          )}
        </div>
      ) : (
        <>
          <Cifra
            etiqueta="Facturado"
            valor={deHoy.totalCentimos}
            formato={(v) => comoDinero(v)}
            origen={
              deHoy.tickets === null
                ? 'Con IVA, tal cual la caja'
                : `${deHoy.tickets} ${deHoy.tickets === 1 ? 'ticket' : 'tickets'}`
            }
          />
          {datos.puedeVerCostes && deHoy.consumoCentimos !== null && (
            <p className="mt-e2 text-secundario text-texto-suave">
              Género gastado hoy: {comoDinero(deHoy.consumoCentimos)}
              {foodCostDeHoy === null ? '' : ` · ${foodCostDeHoy.toLocaleString('es-ES')} %`}
            </p>
          )}
        </>
      )}
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
