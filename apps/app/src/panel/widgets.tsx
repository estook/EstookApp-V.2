import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AVISAR_ANTES_DE_ENTRAR,
  NOMBRE_DE_LA_CAPA,
  NOMBRE_DEL_ESTADO,
  minutosHasta,
  type CifraDelSemaforo,
} from '@estook/dominio';
import { appsVisibles, puedeEditar, puedeVer } from '@estook/permisos';
import {
  Anillo,
  Avatar,
  Boton,
  Cargando,
  EstadoVacio,
  Etiqueta,
  GraficaViva,
  Hoja,
  Medidor,
  appPorPermiso,
  clases,
  rutaDe,
  usarQueEstaVacio,
  widgetPorId,
  type App,
  type EstadoDelMedidor,
  type TamanoDeWidget,
} from '@estook/ui';
import { IconoAnadir, IconoEntrar, IconoReloj, IconoSalir } from '@estook/iconos';
import { usarAlmacenHoy } from '../ganchos/usarAlmacenHoy.ts';
import { usarMisObjetivos } from '../ganchos/usarMisObjetivos.ts';
import { ListaDelSemaforo } from '../objetivos/Semaforo.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';
import { AL_DIA } from '../datos/alDia.ts';
import { MiTurno } from '../horario/MiTurno.tsx';
import { usarElHorarioDeEstaSemana } from '../ganchos/usarElHorario.ts';
import { AccesosRapidos } from './AccesosRapidos.tsx';
import { ApuntarMerma } from '../almacen/ApuntarMerma.tsx';
import { loQueDiceElFichaje, usarFichar } from '../ganchos/usarFichar.ts';
import { BotonDePausa } from '../equipo/BotonDePausa.tsx';
import { usarAccion } from '../ganchos/usarAccion.ts';
import { BotonDeAccion } from '../acciones/BotonDeAccion.tsx';
import { comoSeLeeLaHora, comoSeLeenMinutos, type FichajesDeHoy } from '../equipo/contrato.ts';
import { usarComoSeCierra } from '../ganchos/usarComoSeCierra.ts';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { ComprasDeHoy, LoQueViene } from '../compras/contrato.ts';
import {
  TONO_DEL_ESTADO,
  comoSeLeeLaFecha,
  conUnidadDeUso,
  cuandoSeAgota,
  type MermaDeHoy,
} from '../almacen/contrato.ts';
import { CifraDelWidget, CifraPequena } from './CifraDelWidget.tsx';
import { Marco, Tranquilo } from './Marco.tsx';
import { QuienSePinta } from './quienSePinta.ts';
import { CaraDe } from '../caras/CaraDe.tsx';

/**
 * Los widgets del Panel (Manifiesto 6; rehechos en la experiencia, 0083).
 *
 * «Que cada widget tenga su diseño, no todos igual, que sean útiles, bonitos y
 * personalizados entre sí.» Cada uno lleva el marco común (`Marco`) y **su propio
 * dibujo** dentro: la jornada es un anillo, las ventas un área que se toca, los
 * objetivos unos medidores, lo bajo mínimo unas barras de nivel, lo que caduca unos
 * días con su color, el equipo sus caras.
 *
 * Lo que no hacen: sumar. Cada número llega hecho del servidor (regla 10) y es el
 * mismo que en su app.
 */
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
  const widget = widgetPorId(id);
  if (widget === undefined) return null;
  switch (widget.id) {
    case 'fichar':
      return <TuJornada />;
    case 'ventas':
      return <VentasWidget />;
    case 'objetivos':
      return <ObjetivosWidget />;
    case 'merma':
      return <MermaWidget />;
    case 'food-cost':
    case 'valor-de-la-camara':
    case 'gasto-en-compras':
    case 'mis-horas':
      return widget.indicador === undefined ? null : (
        <CifraDelWidget id={widget.id} titulo={widget.nombre} indicador={widget.indicador} />
      );
    case 'bajo-minimo':
      return <BajoMinimo />;
    case 'caducidades':
      return <Caducidades />;
    case 'pedidos':
      return <ComprasDeHoyWidget />;
    case 'calendario':
      return <LoQueVieneWidget />;
    case 'fichajes':
      return <EquipoAhora />;
    case 'mi-turno':
      return <MiTurnoWidget tamano={tamano} />;
    case 'mis-apps':
      return <MisApps />;
    case 'acciones-rapidas':
      return <AccesosRapidos tamano={tamano} editando={editando} />;
    default:
      return null;
  }
}

// ── Tu jornada · un anillo con tus horas de hoy ──────────────────────────────

/** Los minutos de un tramo «09:00»–«17:30». Si cruza la medianoche, se suma el día. */
function minutosDelTramo(entra: string, sale: string): number {
  const [he, me] = entra.split(':').map(Number);
  const [hs, ms] = sale.split(':').map(Number);
  const desde = (he ?? 0) * 60 + (me ?? 0);
  const hasta = (hs ?? 0) * 60 + (ms ?? 0);
  return hasta > desde ? hasta - desde : hasta + 24 * 60 - desde;
}

function TuJornada() {
  const fichar = usarFichar();
  const mio = fichar.mio;

  if (fichar.cargando) {
    return (
      <Marco titulo="Tu jornada" icono={<IconoReloj size={16} />}>
        <Cargando que="tu turno" forma="anillo" />
      </Marco>
    );
  }

  if (fichar.noSeHaPodidoLeer) {
    return (
      <Marco titulo="Tu jornada" icono={<IconoReloj size={16} />}>
        <Tranquilo>No he podido leer tu fichaje.</Tranquilo>
        <div className="mt-e3">
          <Boton tono="secundario" onClick={fichar.volverALeer}>
            Volver a intentarlo
          </Boton>
        </div>
      </Marco>
    );
  }

  if (mio === undefined || !mio.puedoFichar) {
    return (
      <Marco titulo="Tu jornada" icono={<IconoReloj size={16} />}>
        <Tranquilo>Tu acceso no incluye fichar.</Tranquilo>
      </Marco>
    );
  }

  const abierto = mio.abierto;
  const dentro = abierto !== null;
  const enPausa = dentro && mio.enPausaDesde !== null && mio.enPausaDesde !== undefined;
  const deHoyEnElHorario = mio.horario.filter((tramo) => tramo.dia === mio.diaDeLaSemana);
  const entraHoy = deHoyEnElHorario[0]?.entra ?? null;
  const faltan = entraHoy === null ? null : minutosHasta(mio.horaDelLocal, entraHoy);
  const tocaFichar =
    !dentro && faltan !== null && faltan <= AVISAR_ANTES_DE_ENTRAR && faltan > -240;
  // El anillo se llena con lo que llevas frente a tu turno de hoy; sin turno, frente
  // a ocho horas, que es una jornada.
  const delTurno = deHoyEnElHorario.reduce((suma, t) => suma + minutosDelTramo(t.entra, t.sale), 0);
  const parte = mio.minutosDeHoy / (delTurno > 0 ? delTurno : 8 * 60);
  const color = enPausa
    ? 'var(--color-atencion)'
    : dentro
      ? 'var(--color-bien)'
      : 'var(--color-app-equipo)';

  return (
    <Marco
      titulo={enPausa ? 'En tu pausa' : dentro ? 'Estás dentro' : 'Tu jornada'}
      icono={<IconoReloj size={16} />}
      ir="/mis-fichajes"
    >
      <div className="flex h-full flex-col gap-e3">
        <div className="flex items-center gap-e3">
          <Anillo
            parte={parte}
            color={color}
            tamano={76}
            grosor={8}
            titulo={`Llevas ${comoSeLeenMinutos(mio.minutosDeHoy)} hoy`}
          >
            <span className="text-secundario font-bold leading-tight">
              {comoSeLeenMinutos(mio.minutosDeHoy)}
            </span>
          </Anillo>
          <div className="min-w-0 flex-1">
            {dentro ? (
              <>
                <p className="text-secundario text-texto-suave">Desde las</p>
                <p className="text-seccion font-bold">{comoSeLeeLaHora(abierto.entroEn)}</p>
              </>
            ) : tocaFichar ? (
              <p className="text-secundario font-semibold text-atencion">
                {faltan > 0 ? `Entras en ${faltan} min` : `Entrabas a las ${entraHoy ?? ''}`}
              </p>
            ) : (
              <p className="text-secundario text-texto-suave">
                {entraHoy === null ? 'No has fichado hoy.' : `Hoy entras a las ${entraHoy}.`}
              </p>
            )}
          </div>
        </div>

        {fichar.error !== null && (
          <p className="text-secundario text-mal">{fichar.error.quePasa}</p>
        )}
        {fichar.acabaDe !== null && fichar.error === null && (
          <p
            aria-live="polite"
            className={clases(
              'text-secundario',
              loQueDiceElFichaje(fichar.acabaDe).guardado ? 'text-atencion' : 'text-bien',
            )}
          >
            {loQueDiceElFichaje(fichar.acabaDe).texto}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-e2">
          {/* La pausa de descanso, dentro del turno (0068). */}
          <BotonDePausa fichar={fichar} corto />
          <Boton
            tono={dentro ? 'secundario' : 'principal'}
            ancho
            icono={dentro ? <IconoSalir size={18} /> : <IconoEntrar size={18} />}
            cargando={fichar.fichando}
            textoCargando={
              fichar.paso === 'buscando_ubicacion' ? 'Buscando dónde estás' : 'Apuntando'
            }
            onClick={dentro ? fichar.salir : fichar.entrar}
            aria-label={dentro ? 'Fichar la salida' : 'Fichar la entrada'}
          >
            {dentro ? 'Salida' : 'Entrada'}
          </Boton>
        </div>
      </div>
    </Marco>
  );
}

// ── Ventas · el área que se toca, y la caja si no está cerrada ───────────────

function VentasWidget() {
  return (
    <CifraDelWidget
      id="ventas"
      titulo="Ventas"
      indicador="ventas"
      ancho
      sinDatos={<SinCajaCerrada />}
      enElDetalle={(dias) => (
        <div className="grid gap-e3 sm:grid-cols-3">
          <CifraPequena indicador="ticket-medio" dias={dias} />
          <CifraPequena indicador="cierres" dias={dias} />
          <CifraPequena indicador="food-cost" dias={dias} />
        </div>
      )}
    />
  );
}

/** Sin cajas cerradas: lo dice, y deja cerrarla a quien puede. */
function SinCajaCerrada() {
  const navegar = useNavigate();
  // La misma que la tarjeta de «¿Cómo entran tus ventas?», que ya viene en el lote.
  const datos = usarComoSeCierra().data;
  return (
    <div className="flex flex-col items-start gap-e3">
      <Tranquilo>
        {datos?.comoSeCierra === 'sin_decidir'
          ? 'Todavía no has elegido cómo entran tus ventas.'
          : datos?.comoSeCierra === 'tpv'
            ? 'Tu TPV traerá las ventas. Hasta entonces, se apuntan al cerrar.'
            : 'Sin cajas cerradas en estos días.'}
      </Tranquilo>
      {datos?.puedeCerrar === true && (
        <Boton
          tono="principal"
          onClick={() => {
            navegar('/servicio/jornada/cierre');
          }}
        >
          Cerrar la caja
        </Boton>
      )}
    </div>
  );
}

// ── Objetivos · medidores, como en un salpicadero ────────────────────────────

const ESTADO_DEL_SEMAFORO: Readonly<Record<CifraDelSemaforo['semaforo'], EstadoDelMedidor>> = {
  verde: 'bien',
  ambar: 'atencion',
  rojo: 'mal',
  sin_dato: 'neutro',
};

const LO_QUE_DICE: Readonly<Record<CifraDelSemaforo['semaforo'], string>> = {
  verde: 'En objetivo',
  ambar: 'Cerca del límite',
  rojo: 'Fuera',
  sin_dato: 'Sin datos',
};

/** «10,4 mil €»: dentro de un medidor no caben «10.398,80 €». */
const EN_CORTO = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Hasta dónde llega el medidor: un poco más allá del objetivo o del valor. */
function elTope(cifra: CifraDelSemaforo): number {
  const esPorcentaje = cifra.que !== 'ventas_semanales';
  const objetivo =
    cifra.objetivo === null ? null : esPorcentaje ? cifra.objetivo * 100 : cifra.objetivo;
  const valor = cifra.valor ?? 0;
  return Math.max(objetivo === null ? 0 : objetivo * 1.5, valor * 1.15, esPorcentaje ? 10 : 1);
}

function ObjetivosWidget() {
  const consulta = usarMisObjetivos();
  const datos = consulta.data;
  const [abierto, setAbierto] = useState(false);
  const conDato = (datos?.cifras ?? []).filter((c) => c.semaforo !== 'sin_dato');
  const sinDato = (datos?.cifras ?? []).filter((c) => c.semaforo === 'sin_dato');

  return (
    <Marco
      titulo="Objetivos"
      leyendo={consulta}
      alAmpliar={() => {
        setAbierto(true);
      }}
    >
      {datos === undefined ? (
        <Cargando que="tus objetivos" forma="medidores" />
      ) : datos.cifras.length === 0 ? (
        <Tranquilo>Tu acceso no incluye las cifras de los objetivos.</Tranquilo>
      ) : conDato.length === 0 ? (
        <div className="flex flex-col items-start gap-e3">
          <Tranquilo>
            Todavía no hay datos de esta semana. Salen al cerrar la caja y con tus objetivos
            puestos.
          </Tranquilo>
          <Boton
            tono="secundario"
            onClick={() => {
              setAbierto(true);
            }}
          >
            Ver qué falta
          </Boton>
        </div>
      ) : (
        <div className="flex flex-col gap-e2">
          <div className="flex flex-wrap justify-around gap-e3">
            {conDato.slice(0, 4).map((cifra) => (
              <Medidor
                key={cifra.que}
                nombre={cifra.nombre}
                valor={cifra.valor}
                tope={elTope(cifra)}
                objetivo={
                  cifra.objetivo === null
                    ? null
                    : cifra.que === 'ventas_semanales'
                      ? cifra.objetivo
                      : cifra.objetivo * 100
                }
                texto={
                  cifra.que === 'ventas_semanales' && cifra.valor !== null
                    ? EN_CORTO.format(cifra.valor / 100)
                    : cifra.valorEnTexto
                }
                estado={ESTADO_DEL_SEMAFORO[cifra.semaforo]}
                queDice={LO_QUE_DICE[cifra.semaforo]}
                tamano={118}
              />
            ))}
          </div>
          {sinDato.length > 0 && (
            <p className="text-etiqueta text-texto-tenue">
              Sin datos: {sinDato.map((c) => c.nombre).join(', ')}.
            </p>
          )}
        </div>
      )}

      <Hoja
        abierta={abierto}
        alCerrar={() => {
          setAbierto(false);
        }}
        titulo="Tus objetivos, esta semana"
      >
        {abierto && datos !== undefined && (
          <div className="pt-e3">
            <ListaDelSemaforo cifras={datos.cifras} />
          </div>
        )}
      </Hoja>
    </Marco>
  );
}

// ── Merma · barras por día, y el botón de apuntar ────────────────────────────

function MermaWidget() {
  const { permisos } = usarSesion();
  const [apuntando, setApuntando] = useState(false);
  const conEuros = puedeVer(permisos, 'dato.precio_de_compra') && puedeVer(permisos, 'app.almacen');
  const apuntar = (
    <>
      <Boton
        tono="principal"
        ancho
        icono={<IconoAnadir size={18} />}
        onClick={() => {
          setApuntando(true);
        }}
      >
        <span className="@max-[17rem]:hidden">Apuntar merma</span>
        <span className="@min-[17rem]:hidden">Apuntar</span>
      </Boton>
      {/* La hoja vive aquí: se abre desde el widget y desde Mermas, y es la misma. */}
      <ApuntarMerma
        abierta={apuntando}
        alCerrar={() => {
          setApuntando(false);
        }}
      />
    </>
  );

  if (conEuros) {
    return (
      <CifraDelWidget
        id="merma"
        titulo="Merma"
        indicador="merma"
        forma="barras"
        abajo={<div className="mt-auto pt-e1">{apuntar}</div>}
      />
    );
  }
  return <MermaSinEuros apuntar={apuntar} />;
}

/** La merma de quien no ve precios: cuántos apuntes, sin un euro. */
function MermaSinEuros({ apuntar }: { readonly apuntar: ReactNode }) {
  const { cliente, permisos, yo } = usarSesion();
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

  return (
    <Marco titulo="Merma" leyendo={consulta}>
      {datos === undefined ? (
        <Cargando que="la merma" forma="cifra" />
      ) : (
        <div className="flex h-full flex-col gap-e3">
          <div>
            <p className="text-[calc(30px*var(--escala))] font-bold leading-none">
              {datos.deHoy.cuantas}
            </p>
            <p className="mt-e1 text-secundario text-texto-suave">
              {datos.deHoy.cuantas === 1 ? 'apunte hoy' : 'apuntes hoy'}
            </p>
          </div>
          {/* Todo a cero no se dibuja, como en las demás cifras. */}
          {datos.dias.some((dia) => dia.cuantas > 0) && (
            <GraficaViva
              titulo="Apuntes de merma de los últimos días"
              puntos={datos.dias.map((dia) => ({
                etiqueta: comoSeLeeLaFecha(dia.fecha),
                valor: dia.cuantas,
              }))}
              forma="barras"
              color="var(--color-app-almacen)"
              formato={(v) => `${v} ${v === 1 ? 'apunte' : 'apuntes'}`}
              alto={52}
              resaltarElUltimo
            />
          )}
          {datos.puedeApuntar && <div className="mt-auto">{apuntar}</div>}
        </div>
      )}
    </Marco>
  );
}

// ── Bajo mínimo · barras de nivel ────────────────────────────────────────────

function BajoMinimo() {
  const consulta = usarAlmacenHoy();
  const navegar = useNavigate();
  const atencion = consulta.data?.atencion ?? [];
  usarQueEstaVacio(consulta.data === undefined ? undefined : atencion.length === 0);

  return (
    <Marco
      titulo="Bajo mínimo"
      leyendo={consulta}
      ir="/almacen/productos/bajo-minimo"
      derecha={atencion.length > 0 ? <Contador>{atencion.length}</Contador> : undefined}
    >
      {consulta.data === undefined ? (
        <Cargando que="el almacén" forma="niveles" />
      ) : atencion.length === 0 ? (
        <Tranquilo>Todo por encima de su mínimo.</Tranquilo>
      ) : (
        <ul className="flex flex-col gap-e1">
          {atencion.slice(0, 4).map((producto) => {
            const agota = cuandoSeAgota(producto.seAgotaEn, producto.diasDeCobertura);
            const tono = TONO_DEL_ESTADO[producto.estado] === 'mal' ? 'mal' : 'atencion';
            const parte =
              producto.minimo === null || producto.minimo <= 0
                ? null
                : Math.max(0, Math.min(1, producto.cantidad / producto.minimo));
            return (
              <li key={producto.id}>
                <button
                  type="button"
                  onClick={() => {
                    navegar(`/almacen/productos/bajo-minimo?producto=${producto.id}`);
                  }}
                  className="-mx-e2 flex w-[calc(100%+var(--spacing-e2)*2)] flex-col gap-[6px] rounded-medio px-e2 py-e2 text-left transition-colors duration-[--rapido] hover:bg-fondo"
                >
                  <span className="flex items-baseline gap-e2">
                    <span className="min-w-0 flex-1 truncate text-cuerpo font-medium">
                      {producto.nombre}
                    </span>
                    <span className="shrink-0 text-secundario tabular-nums text-texto-suave">
                      {conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}
                      {producto.minimo === null
                        ? ''
                        : ` / ${conUnidadDeUso(producto.minimo, producto.unidadDeUso)}`}
                    </span>
                  </span>
                  {parte !== null && (
                    <span
                      aria-hidden
                      className="block h-[6px] w-full overflow-hidden rounded-redondo bg-fondo"
                    >
                      <span
                        className={clases(
                          'block h-full rounded-redondo transition-[width] duration-[--lento] ease-curva',
                          tono === 'mal' ? 'bg-mal' : 'bg-atencion',
                        )}
                        style={{ width: `${Math.max(4, parte * 100)}%` }}
                      />
                    </span>
                  )}
                  <span className="text-etiqueta text-texto-tenue">
                    {NOMBRE_DEL_ESTADO[producto.estado]}
                    {agota === null ? '' : ` · se agota ${agota}`}
                  </span>
                </button>
              </li>
            );
          })}
          {atencion.length > 4 && (
            <li className="pt-e1 text-secundario text-texto-suave">y {atencion.length - 4} más</li>
          )}
        </ul>
      )}
    </Marco>
  );
}

// ── Caduca pronto · cada lote con su día ─────────────────────────────────────

function Caducidades() {
  const consulta = usarAlmacenHoy();
  const navegar = useNavigate();
  const caducan = consulta.data?.caducan ?? [];
  usarQueEstaVacio(consulta.data === undefined ? undefined : caducan.length === 0);

  return (
    <Marco
      titulo="Caduca pronto"
      leyendo={consulta}
      ir="/almacen/resumen"
      derecha={caducan.length > 0 ? <Contador>{caducan.length}</Contador> : undefined}
    >
      {consulta.data === undefined ? (
        <Cargando que="las caducidades" forma="dias" />
      ) : caducan.length === 0 ? (
        <Tranquilo>Nada caduca en los próximos siete días.</Tranquilo>
      ) : (
        <ul className="grid gap-e2 @min-[26rem]:grid-cols-2">
          {caducan.slice(0, 6).map((lote) => {
            const urgente = lote.dias <= 1;
            return (
              <li key={lote.loteId}>
                {/* A su producto, que es donde se quita o se congela el lote. */}
                <button
                  type="button"
                  onClick={() => {
                    navegar(`/almacen/productos/todo?producto=${lote.productoId}`);
                  }}
                  className="flex w-full items-center gap-e3 rounded-grande border border-borde bg-fondo/40 p-e2 text-left transition-colors duration-[--rapido] hover:border-borde-fuerte"
                >
                  <span
                    className={clases(
                      'grid size-11 shrink-0 place-items-center rounded-medio text-center leading-none',
                      urgente ? 'bg-mal-suave text-mal' : 'bg-atencion-suave text-atencion',
                    )}
                  >
                    {/* Lo que caduca hoy todavía no ha caducado: «hoy», como dice lo de hoy. */}
                    {lote.dias < 0 ? (
                      <span className="text-etiqueta font-bold">Ya</span>
                    ) : lote.dias === 0 ? (
                      <span className="text-etiqueta font-bold">Hoy</span>
                    ) : (
                      <span>
                        <span className="block text-seccion font-bold">{lote.dias}</span>
                        <span className="block text-[10px] font-semibold">
                          {lote.dias === 1 ? 'día' : 'días'}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-secundario font-medium">
                    {lote.producto}
                  </span>
                </button>
              </li>
            );
          })}
          {caducan.length > 6 && (
            <li className="self-center text-secundario text-texto-suave">
              y {caducan.length - 6} más
            </li>
          )}
        </ul>
      )}
    </Marco>
  );
}

// ── Compras de hoy · a quién pedir y qué llega ───────────────────────────────

function ComprasDeHoyWidget() {
  const { permisos, yo } = usarSesion();
  const navegar = useNavigate();
  const puedeTocar = puedeEditar(permisos, 'app.almacen');
  const consulta = usarLectura<ComprasDeHoy>(
    'compras_de_hoy',
    {},
    puedeVer(permisos, 'app.almacen') && yo?.local !== null && yo?.local !== undefined,
  );
  const datos = consulta.data;
  const tocaPedir = (datos?.tocaPedir ?? []).filter((t) => !t.yaPedido);
  const llegan = datos?.llegan ?? [];
  const borradores = datos?.borradores.length ?? 0;
  usarQueEstaVacio(
    datos === undefined
      ? undefined
      : tocaPedir.length === 0 && llegan.length === 0 && borradores === 0,
  );

  return (
    <Marco titulo="Compras de hoy" leyendo={consulta} ir="/almacen/compras/pedidos">
      {datos === undefined ? (
        <Cargando que="las compras" forma="lista-cara" lineas={2} />
      ) : tocaPedir.length === 0 && llegan.length === 0 ? (
        <Tranquilo>
          Hoy no llega nada y no toca pedirle a nadie.
          {borradores > 0 &&
            ` ${borradores === 1 ? 'Tienes 1 pedido' : `Tienes ${borradores} pedidos`} sin mandar.`}
        </Tranquilo>
      ) : (
        <div className="grid gap-e4 @min-[26rem]:grid-cols-2">
          {tocaPedir.length > 0 && (
            <Columna titulo="Toca pedir">
              {tocaPedir.slice(0, 3).map((t) => (
                <FilaConCara
                  key={t.proveedorId}
                  nombre={t.proveedor}
                  etiqueta={
                    <Etiqueta tono="atencion">
                      {t.pedirAntesDe === null ? 'hoy' : `antes de las ${t.pedirAntesDe}`}
                    </Etiqueta>
                  }
                  alPulsar={() => {
                    navegar(
                      t.borradorId === null
                        ? `/almacen/compras/pedidos?pedir=${t.proveedorId}`
                        : `/almacen/compras/pedidos?pedido=${t.borradorId}`,
                    );
                  }}
                />
              ))}
            </Columna>
          )}
          {llegan.length > 0 && (
            <Columna titulo="Llega">
              {llegan.slice(0, 3).map((l) => (
                <FilaConCara
                  key={l.pedidoId}
                  nombre={l.proveedor}
                  etiqueta={
                    <Etiqueta tono={l.atrasado ? 'mal' : 'info'}>
                      {l.atrasado ? 'no ha llegado' : l.llegaCuando}
                    </Etiqueta>
                  }
                  alPulsar={() => {
                    // Recibir, solo quien puede tocar el almacén; los demás, el pedido.
                    navegar(
                      `/almacen/compras/pedidos?pedido=${l.pedidoId}${puedeTocar ? '&recibir=1' : ''}`,
                    );
                  }}
                />
              ))}
            </Columna>
          )}
        </div>
      )}
    </Marco>
  );
}

// ── Lo que viene · una línea del tiempo de hoy y mañana ──────────────────────

const COLOR_DE_LA_CAPA: Readonly<Record<string, string>> = {
  entrega: 'var(--color-app-almacen)',
  caducidad: 'var(--color-mal)',
  turno: 'var(--color-app-equipo)',
  appcc: 'var(--color-app-servicio)',
  mantenimiento: 'var(--color-app-cuaderno)',
  aviso: 'var(--color-info)',
};

function LoQueVieneWidget() {
  const { permisos, yo } = usarSesion();
  const navegar = useNavigate();
  const consulta = usarLectura<LoQueViene>(
    'lo_que_viene',
    {},
    puedeVer(permisos, 'app.calendario') && yo?.local !== null && yo?.local !== undefined,
  );
  const dias = consulta.data?.dias ?? [];
  const nada = dias.every((dia) => dia.ocurrencias.length === 0);
  usarQueEstaVacio(consulta.data === undefined ? undefined : nada);

  return (
    <Marco titulo="Lo que viene" leyendo={consulta} ir="/calendario">
      {consulta.data === undefined ? (
        <Cargando que="lo que viene" forma="tiempo" />
      ) : nada ? (
        <Tranquilo>Nada apuntado para hoy ni para mañana.</Tranquilo>
      ) : (
        <div className="grid gap-e4 @min-[26rem]:grid-cols-2">
          {dias.map((dia) =>
            dia.ocurrencias.length === 0 ? null : (
              <div key={dia.fecha}>
                <p className="mb-e2 text-etiqueta font-semibold text-texto-tenue">{dia.cuando}</p>
                <ol className="relative flex flex-col border-l border-borde pl-e3">
                  {dia.ocurrencias.slice(0, 4).map((o) => (
                    <li key={`${o.id}-${dia.fecha}`} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[calc(var(--spacing-e3)+4.5px)] top-[14px] size-2 rounded-redondo ring-2 ring-superficie"
                        style={{
                          background: COLOR_DE_LA_CAPA[o.capa] ?? 'var(--color-texto-tenue)',
                        }}
                      />
                      <button
                        type="button"
                        disabled={o.ir === null}
                        onClick={() => {
                          if (o.ir !== null) navegar(o.ir);
                        }}
                        className="flex min-h-[36px] w-full items-center gap-e2 rounded-medio px-e1 text-left hover:bg-fondo disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        {o.desde !== null && (
                          <span className="shrink-0 text-etiqueta font-semibold tabular-nums text-texto-suave">
                            {o.desde}
                          </span>
                        )}
                        <span
                          className={clases(
                            'min-w-0 flex-1 truncate text-secundario',
                            o.hecho && 'text-texto-suave line-through',
                          )}
                        >
                          {o.titulo}
                        </span>
                        {/* La capa dicha con palabra, no solo con color (B8). */}
                        <span className="shrink-0 text-etiqueta text-texto-tenue">
                          {NOMBRE_DE_LA_CAPA[o.capa]}
                        </span>
                      </button>
                    </li>
                  ))}
                  {dia.ocurrencias.length > 4 && (
                    <li className="px-e1 pt-e1 text-etiqueta text-texto-suave">
                      y {dia.ocurrencias.length - 4} más
                    </li>
                  )}
                </ol>
              </div>
            ),
          )}
        </div>
      )}
    </Marco>
  );
}

// ── Equipo ahora · las caras de quien está dentro ────────────────────────────

function EquipoAhora() {
  const { cliente, permisos, yo } = usarSesion();
  const invitar = usarAccion('invitar');
  const navegar = useNavigate();

  const consulta = useQuery({
    queryKey: ['fichajes_de_hoy'],
    enabled: puedeVer(permisos, 'app.equipo') && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<FichajesDeHoy> => {
      const respuesta = await cliente.consultar<FichajesDeHoy>('fichajes_de_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    staleTime: 60_000,
    ...AL_DIA,
  });

  const datos = consulta.data;
  const gente = datos?.gente ?? [];
  const dentro = gente.filter((quien) => quien.dentro);
  const conTurno = gente.filter((quien) => !quien.dentro && quien.entraHoyALas !== null);

  return (
    <Marco
      titulo="Equipo ahora"
      leyendo={consulta}
      ir="/equipo/resumen"
      {...(datos === undefined ? {} : { derecha: <Contador>{datos.horaDelLocal}</Contador> })}
    >
      {datos === undefined ? (
        <Cargando que="los fichajes" forma="caras" />
      ) : gente.length === 0 ? (
        <EstadoVacio
          compacto
          dibujo="equipo"
          acento="var(--color-app-equipo)"
          titulo="Todavía no hay equipo"
          frase="Cuando alguien más tenga acceso, aquí verás quién ha fichado."
          {...(invitar === null
            ? { sinAccionPorque: 'Da los accesos quien lleva el local.' }
            : { accion: <BotonDeAccion accion={invitar} texto="Dar acceso a alguien" /> })}
        />
      ) : (
        <div className="flex flex-col gap-e3">
          <div className="flex items-center gap-e3">
            <p className="text-[calc(30px*var(--escala))] font-bold leading-none">
              {dentro.length}
            </p>
            <div className="min-w-0 flex-1">
              <p className="text-secundario font-semibold">
                {dentro.length === 1 ? 'persona dentro' : 'personas dentro'}
              </p>
              <p className="text-etiqueta text-texto-tenue">
                {conTurno.length === 0
                  ? `de ${gente.length} en el equipo`
                  : `${conTurno.length} con turno hoy sin fichar`}
              </p>
            </div>
            {/* Las caras, unas encima de otras. */}
            <div className="flex -space-x-2">
              {dentro.slice(0, 5).map((quien) => (
                <span key={quien.personaId} className="rounded-[11px] ring-2 ring-superficie">
                  <Avatar
                    nombre={`${quien.nombre} ${quien.apellidos ?? ''}`.trim()}
                    tamano={32}
                    foto={quien.foto ?? null}
                  />
                </span>
              ))}
            </div>
          </div>

          {dentro.length > 0 && (
            <ul className="flex flex-col">
              {dentro.slice(0, 4).map((quien) => (
                <li key={quien.personaId}>
                  <button
                    type="button"
                    onClick={() => {
                      navegar(`/equipo/personas/con-acceso?persona=${quien.personaId}`);
                    }}
                    className="flex min-h-[40px] w-full items-center gap-e2 rounded-medio px-e1 text-left hover:bg-fondo"
                  >
                    <span aria-hidden className="size-2 shrink-0 rounded-redondo bg-bien" />
                    <span className="min-w-0 flex-1 truncate text-secundario font-medium">
                      {quien.nombre}
                    </span>
                    <span className="shrink-0 text-etiqueta text-texto-tenue">
                      {quien.rolNombre}
                    </span>
                    <span className="w-16 shrink-0 text-right text-secundario tabular-nums text-texto-suave">
                      {comoSeLeenMinutos(quien.minutos ?? 0)}
                    </span>
                    {quien.turnoSospechoso && <Etiqueta tono="atencion">revisar</Etiqueta>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Marco>
  );
}

// ── Mi turno, tus apps ───────────────────────────────────────────────────────

function MiTurnoWidget({ tamano }: { readonly tamano: TamanoDeWidget }) {
  const consulta = usarElHorarioDeEstaSemana();
  return (
    <Marco titulo="Mi turno" ir="/horario" leyendo={consulta}>
      <MiTurno datos={consulta.data} tamano={tamano} />
    </Marco>
  );
}

function MisApps() {
  const { permisos } = usarSesion();
  const navegar = useNavigate();
  const misApps = appsVisibles(permisos)
    .map((permiso) => appPorPermiso(permiso))
    .filter((app): app is App => app !== undefined);

  return (
    <Marco titulo="Tus apps">
      <ul className="grid grid-cols-3 gap-e2 @min-[26rem]:grid-cols-4">
        {misApps.map((app) => (
          <li key={app.id}>
            <button
              type="button"
              onClick={() => {
                navegar(rutaDe(app));
              }}
              className="flex w-full flex-col items-center gap-e1 rounded-grande p-e2 text-center transition-colors duration-[--rapido] hover:bg-fondo"
            >
              <span
                aria-hidden
                className="grid size-11 place-items-center rounded-grande text-white"
                style={{
                  background: `linear-gradient(140deg, color-mix(in srgb, ${app.acento} 92%, white), color-mix(in srgb, ${app.acento} 70%, black))`,
                  boxShadow: `0 8px 18px -10px ${app.acento}`,
                }}
              >
                <app.icono size={20} />
              </span>
              <span className="w-full truncate text-etiqueta font-semibold">{app.nombre}</span>
            </button>
          </li>
        ))}
      </ul>
    </Marco>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function Contador({ children }: { readonly children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-redondo bg-fondo px-e2 py-[2px] text-etiqueta font-semibold tabular-nums text-texto-suave">
      {children}
    </span>
  );
}

function Columna({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-e1">
      <p className="text-etiqueta font-semibold text-texto-tenue">{titulo}</p>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function FilaConCara({
  nombre,
  etiqueta,
  alPulsar,
}: {
  readonly nombre: string;
  readonly etiqueta: ReactNode;
  readonly alPulsar: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={alPulsar}
        className="flex min-h-[44px] w-full items-center gap-e2 rounded-medio px-e1 text-left hover:bg-fondo"
      >
        <CaraDe nombre={nombre} tamano={30} />
        <span className="min-w-0 flex-1 truncate text-secundario font-medium">{nombre}</span>
        {etiqueta}
      </button>
    </li>
  );
}
