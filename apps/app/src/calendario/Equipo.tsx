import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  ErrorEnCristiano,
  Hoja,
  Interruptor,
  Segmentado,
  clases,
  fondoDegradado,
  type NombreDeDegradado,
} from '@estook/ui';
import {
  IconoAnadir,
  IconoAvisos,
  IconoFlechaDerecha,
  IconoFlechaIzquierda,
  IconoFormacion,
  IconoInspeccion,
  IconoLimpieza,
} from '@estook/iconos';
import {
  NOMBRE_DEL_RECORDATORIO,
  PARA_QUIEN_EN_LETRA,
  caeEn,
  comoAvisa,
  cuantosDiasDura,
  delAl,
  type ParaQuien,
  type TipoDeRecordatorio,
} from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { ElCalendarioDelEquipo, UnRecordatorio } from './contrato.ts';

/**
 * Calendario › Equipo (la Ampliación 4 · 3, 0153; maqueta, pestaña 4, «Equipo en el móvil» y «En el
 * PC, el mes entero y con sus capas»).
 *
 * Lo que el gerente y los jefes ponen para todos, sala o cocina —una limpieza a fondo, la inspección
 * de Sanidad, una formación—, **cada tipo con su color y su icono**. En el PC, el mes con el texto
 * dentro de cada día, la barra de la izquierda con el mes pequeño, las capas y lo próximo, y
 * **arrastrar una píldora la lleva a otro día**. En el móvil, el mes con puntos de color, el día
 * tocado debajo en tarjetas y «Próximos». Las vacaciones de la gente no salen aquí (Richi, 24-nov).
 */

/** La capa de cada tipo: la formación y los avisos van juntos, como en la maqueta. */
type Capa = 'limpieza' | 'inspeccion' | 'formacion';
const CAPA_DE: Readonly<Record<TipoDeRecordatorio, Capa>> = {
  limpieza: 'limpieza',
  inspeccion: 'inspeccion',
  formacion: 'formacion',
  otro: 'formacion',
};
const NOMBRE_DE_LA_CAPA: Readonly<Record<Capa, string>> = {
  limpieza: 'Limpiezas',
  inspeccion: 'Inspecciones',
  formacion: 'Formación y avisos',
};
const CAPAS: readonly Capa[] = ['limpieza', 'inspeccion', 'formacion'];

const ESTILO: Readonly<
  Record<TipoDeRecordatorio, { readonly degradado: NombreDeDegradado; readonly icono: ReactNode }>
> = {
  limpieza: { degradado: 'historial', icono: <IconoLimpieza size={14} /> },
  inspeccion: { degradado: 'incidencias', icono: <IconoInspeccion size={14} /> },
  formacion: { degradado: 'formacion', icono: <IconoFormacion size={14} /> },
  otro: { degradado: 'formacion', icono: <IconoAvisos size={14} /> },
};

const DIAS_DE_LA_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
const NOMBRES_DE_LA_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

// ── Las fechas ───────────────────────────────────────────────────────────────

function aMediodia(fecha: string): Date {
  return new Date(`${fecha}T12:00:00Z`);
}
function masDias(fecha: string, dias: number): string {
  return new Date(aMediodia(fecha).getTime() + dias * 86_400_000).toISOString().slice(0, 10);
}
/** Del 1 (lunes) al 7 (domingo). */
function diaDeLaSemana(fecha: string): number {
  const d = aMediodia(fecha).getUTCDay();
  return d === 0 ? 7 : d;
}
function elLunes(fecha: string): string {
  return masDias(fecha, 1 - diaDeLaSemana(fecha));
}
function primeroDelMes(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}
function otroMes(fecha: string, meses: number): string {
  const d = aMediodia(primeroDelMes(fecha));
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}
/** Las semanas que pinta un mes: de su primer lunes al domingo de su última semana. */
function losDiasDelMes(fecha: string): string[] {
  const inicio = elLunes(primeroDelMes(fecha));
  const fin = masDias(otroMes(fecha, 1), -1);
  const dias: string[] = [];
  for (let d = inicio; d <= fin || diaDeLaSemana(d) !== 1; d = masDias(d, 1)) dias.push(d);
  return dias;
}
function elMesEnLetra(fecha: string): string {
  const texto = aMediodia(fecha).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`.replace(' de ', ' ');
}
function elDiaEnLetra(fecha: string): string {
  const texto = aMediodia(fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}
function elDiaCorto(fecha: string): string {
  return aMediodia(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
function sinCero(hora: string): string {
  return hora.replace(/^0(\d)/, '$1');
}

// ── La pantalla ──────────────────────────────────────────────────────────────

type ComoSeVe = 'mes' | 'semana' | 'dia';

export function Equipo() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [mirando, setMirando] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [comoSeVe, setComoSeVe] = useState<ComoSeVe>('mes');
  const [apagadas, setApagadas] = useState<readonly Capa[]>([]);
  const [poniendo, setPoniendo] = useState<UnRecordatorio | 'nuevo' | null>(null);
  const [abierto, setAbierto] = useState<UnRecordatorio | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);

  // Sin mes elegido, el servidor da el de hoy en el local: qué día es no lo decide el navegador
  // (regla 10). Al cambiar de mes, se piden sus semanas.
  const pedidas = mirando === null ? null : losDiasDelMes(mirando);
  const lo = usarLectura<ElCalendarioDelEquipo>(
    'el_calendario_del_equipo',
    pedidas === null
      ? {}
      : { desde: pedidas[0] ?? mirando ?? '', hasta: pedidas[pedidas.length - 1] ?? mirando ?? '' },
    true,
    true,
  );

  async function refrescar(frase: string) {
    setNoticia(frase);
    await cache.invalidateQueries({ queryKey: ['el_calendario_del_equipo'] });
    await cache.invalidateQueries({ queryKey: ['mis_notas'] });
  }

  async function mover(r: UnRecordatorio, dia: string) {
    if (dia === r.dia) return;
    setError(null);
    const respuesta = await cliente.ejecutar('mover_recordatorio', { id: r.id, dia });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar(`${r.titulo}, al ${elDiaCorto(dia)}`);
  }

  if (lo.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer el calendario del equipo">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }
  const datos = lo.data;
  if (datos === undefined)
    return <Cargando que="el calendario del equipo" forma="dias" lineas={6} />;

  const hoy = datos.hoy;
  const centro = mirando ?? hoy;
  const dias = losDiasDelMes(centro);
  const dia = elegido ?? hoy;
  const visibles = datos.recordatorios.filter((r) => !apagadas.includes(CAPA_DE[r.tipo]));
  const deUnDia = (fecha: string) => visibles.filter((r) => caeEn(r.dia, r.hastaEl, fecha));
  const losProximos = datos.proximos
    .filter((r) => (r.hastaEl ?? r.dia) >= hoy && !apagadas.includes(CAPA_DE[r.tipo]))
    .slice(0, 5);
  const cuantasHay = (capa: Capa) =>
    datos.recordatorios.filter((r) => CAPA_DE[r.tipo] === capa).length;

  function irA(fecha: string) {
    setElegido(fecha);
    if (fecha.slice(0, 7) !== centro.slice(0, 7)) setMirando(fecha);
  }
  function atras() {
    if (comoSeVe === 'mes') setMirando(otroMes(centro, -1));
    else irA(masDias(dia, comoSeVe === 'semana' ? -7 : -1));
  }
  function adelante() {
    if (comoSeVe === 'mes') setMirando(otroMes(centro, 1));
    else irA(masDias(dia, comoSeVe === 'semana' ? 7 : 1));
  }
  function alternar(capa: Capa) {
    setApagadas((antes) =>
      antes.includes(capa) ? antes.filter((c) => c !== capa) : [...antes, capa],
    );
  }

  const lasCapas = (
    <div className="flex flex-wrap gap-e2" role="group" aria-label="Capas">
      {CAPAS.map((capa) => {
        const encendida = !apagadas.includes(capa);
        const tipo: TipoDeRecordatorio = capa === 'formacion' ? 'formacion' : capa;
        return (
          <button
            key={capa}
            type="button"
            aria-pressed={encendida}
            onClick={() => {
              alternar(capa);
            }}
            className={clases(
              'flex min-h-toque items-center gap-e2 rounded-redondo border px-e3 text-secundario font-semibold transition-opacity',
              encendida ? 'border-borde bg-superficie' : 'border-borde bg-fondo opacity-55',
            )}
          >
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-full text-white"
              style={fondoDegradado(ESTILO[tipo].degradado)}
            >
              {ESTILO[tipo].icono}
            </span>
            {NOMBRE_DE_LA_CAPA[capa]}
            <span className="text-texto-suave">{cuantasHay(capa)}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-e4 lg:flex-row lg:items-start">
      {/* La barra de la izquierda, en el PC: el mes pequeño, las capas y lo próximo. */}
      <aside className="hidden w-[17rem] shrink-0 flex-col gap-e4 lg:flex">
        {datos.puedePoner && (
          <Boton
            tono="principal"
            ancho
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              setPoniendo('nuevo');
            }}
          >
            Añadir
          </Boton>
        )}
        <ElMesPequeno
          dias={dias}
          centro={centro}
          hoy={hoy}
          elegido={dia}
          conAlgo={(fecha) => deUnDia(fecha).length > 0}
          alElegir={irA}
        />
        <section className="flex flex-col gap-e2">
          <h2 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
            Capas
          </h2>
          {lasCapas}
        </section>
        <LosProximos recordatorios={losProximos} alAbrir={setAbierto} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {noticia !== null && (
          <Aviso
            tono="bien"
            titulo={noticia}
            esNoticia
            alCerrar={() => {
              setNoticia(null);
            }}
          />
        )}

        <header className="flex flex-wrap items-center gap-e3">
          <h2 className="text-[1.3rem] font-extrabold tracking-[-0.02em]">
            {comoSeVe === 'dia' ? elDiaEnLetra(dia) : elMesEnLetra(centro)}
          </h2>
          <div className="ml-auto flex items-center gap-e2">
            <Boton
              tono="secundario"
              tamano="s"
              onClick={() => {
                setMirando(null);
                setElegido(hoy);
              }}
            >
              Hoy
            </Boton>
            <button
              type="button"
              aria-label="Antes"
              onClick={atras}
              className="grid size-toque place-items-center rounded-full border border-borde bg-superficie"
            >
              <IconoFlechaIzquierda size={18} />
            </button>
            <button
              type="button"
              aria-label="Después"
              onClick={adelante}
              className="grid size-toque place-items-center rounded-full border border-borde bg-superficie"
            >
              <IconoFlechaDerecha size={18} />
            </button>
            <span className="hidden md:inline-flex">
              <Segmentado
                etiqueta="Cómo se ve"
                valor={comoSeVe}
                alElegir={setComoSeVe}
                opciones={[
                  { valor: 'mes', texto: 'Mes' },
                  { valor: 'semana', texto: 'Semana' },
                  { valor: 'dia', texto: 'Día' },
                ]}
              />
            </span>
          </div>
        </header>

        <div className="lg:hidden">{lasCapas}</div>

        {comoSeVe === 'mes' || comoSeVe === 'semana' ? (
          <ElMes
            dias={comoSeVe === 'mes' ? dias : losDiasDeLaSemana(dia)}
            centro={centro}
            hoy={hoy}
            elegido={dia}
            semana={comoSeVe === 'semana'}
            deUnDia={deUnDia}
            puedeMover={datos.puedePoner}
            alElegir={setElegido}
            alAbrir={setAbierto}
            alMover={(r, fecha) => {
              void mover(r, fecha);
            }}
          />
        ) : null}

        {/* El día tocado, debajo (en el móvil siempre; en el PC, en la vista de día). */}
        <section
          className={clases('flex flex-col gap-e2', comoSeVe === 'dia' ? '' : 'md:hidden')}
          aria-label={elDiaEnLetra(dia)}
        >
          <h3 className="flex items-center justify-between text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
            {elDiaEnLetra(dia)}
            <span>{deUnDia(dia).length}</span>
          </h3>
          {deUnDia(dia).length === 0 ? (
            <p className="rounded-[16px] bg-fondo p-e4 text-secundario text-texto-suave">
              Nada ese día.
              {datos.puedePoner ? ' Con «+» pones una limpieza, una inspección o un aviso.' : ''}
            </p>
          ) : (
            deUnDia(dia).map((r) => (
              <Tarjeta key={r.id} recordatorio={r} dia={dia} alAbrir={setAbierto} />
            ))
          )}
        </section>

        <div className="lg:hidden">
          <LosProximos recordatorios={losProximos} alAbrir={setAbierto} />
        </div>
      </section>

      {/* El «+» del móvil, abajo a la derecha, encima del botón de Fogón. */}
      {datos.puedePoner && (
        <button
          type="button"
          aria-label="Añadir al calendario del equipo"
          onClick={() => {
            setPoniendo('nuevo');
          }}
          className="fixed bottom-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom)+var(--spacing-e3)+72px-var(--desfase-abajo,0px))] right-e4 z-20 grid size-14 place-items-center rounded-full text-white [box-shadow:var(--sombra-baldosa)] lg:hidden"
          style={fondoDegradado('horas')}
        >
          <IconoAnadir size={24} />
        </button>
      )}

      {abierto !== null && (
        <ElRecordatorio
          recordatorio={abierto}
          puedeCambiarlo={datos.puedePoner}
          alCerrar={() => {
            setAbierto(null);
          }}
          alCambiar={() => {
            setPoniendo(abierto);
            setAbierto(null);
          }}
          alQuitar={async () => {
            const respuesta = await cliente.ejecutar('quitar_recordatorio', { id: abierto.id });
            if (!respuesta.ok) return respuesta.error;
            const titulo = abierto.titulo;
            setAbierto(null);
            await refrescar(`«${titulo}», quitado`);
            return null;
          }}
        />
      )}

      {poniendo !== null && (
        <PonerRecordatorio
          hoy={hoy}
          diaDeEntrada={dia < hoy ? hoy : dia}
          recordatorio={poniendo === 'nuevo' ? null : poniendo}
          alCerrar={() => {
            setPoniendo(null);
          }}
          alGuardar={async (entrada) => {
            const respuesta = await cliente.ejecutar('poner_recordatorio', entrada);
            if (!respuesta.ok) return respuesta.error;
            setPoniendo(null);
            await refrescar(
              `«${String(entrada['titulo'])}» ${poniendo === 'nuevo' ? 'puesto' : 'cambiado'}`,
            );
            return null;
          }}
        />
      )}
    </div>
  );
}

function losDiasDeLaSemana(fecha: string): string[] {
  const lunes = elLunes(fecha);
  return [0, 1, 2, 3, 4, 5, 6].map((n) => masDias(lunes, n));
}

// ── El mes (y la semana, que es una fila del mes con más sitio) ──────────────

function ElMes({
  dias,
  centro,
  hoy,
  elegido,
  semana,
  deUnDia,
  puedeMover,
  alElegir,
  alAbrir,
  alMover,
}: {
  readonly dias: readonly string[];
  readonly centro: string;
  readonly hoy: string;
  readonly elegido: string;
  readonly semana: boolean;
  readonly deUnDia: (fecha: string) => readonly UnRecordatorio[];
  readonly puedeMover: boolean;
  readonly alElegir: (fecha: string) => void;
  readonly alAbrir: (r: UnRecordatorio) => void;
  readonly alMover: (r: UnRecordatorio, fecha: string) => void;
}) {
  const [sobre, setSobre] = useState<string | null>(null);
  return (
    <div className="overflow-hidden rounded-[20px] border border-borde bg-superficie [box-shadow:var(--sombra-tarjeta)]">
      <div className="grid grid-cols-7 border-b border-borde bg-fondo">
        {NOMBRES_DE_LA_SEMANA.map((n, i) => (
          <span
            key={n}
            className="py-e2 text-center text-etiqueta font-bold uppercase tracking-wide text-texto-suave"
          >
            <span className="md:hidden">{DIAS_DE_LA_SEMANA[i]}</span>
            <span className="hidden md:inline">{n}</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((fecha) => {
          const deEse = deUnDia(fecha);
          const fuera = !semana && fecha.slice(0, 7) !== centro.slice(0, 7);
          const esHoy = fecha === hoy;
          const esElegido = fecha === elegido;
          const pasado = fecha < hoy;
          return (
            <div
              key={fecha}
              role="button"
              tabIndex={0}
              aria-label={`${elDiaEnLetra(fecha)}${deEse.length > 0 ? `, ${String(deEse.length)}` : ''}`}
              aria-pressed={esElegido}
              onClick={() => {
                alElegir(fecha);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  alElegir(fecha);
                }
              }}
              onDragOver={(e) => {
                if (!puedeMover || pasado) return;
                e.preventDefault();
                setSobre(fecha);
              }}
              onDragLeave={() => {
                setSobre((s) => (s === fecha ? null : s));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setSobre(null);
                const id = e.dataTransfer.getData('text/plain');
                const r = dias.flatMap((d) => deUnDia(d)).find((x) => x.id === id);
                if (r !== undefined) alMover(r, fecha);
              }}
              className={clases(
                'flex flex-col gap-[3px] border-b border-r border-borde p-[5px] text-left outline-none focus-visible:ring-2 focus-visible:ring-naranja',
                semana ? 'min-h-[14rem]' : 'min-h-[3.6rem] md:min-h-[6.4rem]',
                fuera && 'bg-fondo/60',
                esElegido && 'bg-naranja/5',
                sobre === fecha && 'bg-naranja/15',
              )}
            >
              <span
                className={clases(
                  'grid size-7 place-items-center self-center rounded-full text-secundario font-semibold md:self-start',
                  esHoy && 'bg-texto text-superficie',
                  !esHoy && esElegido && 'ring-2 ring-naranja',
                  fuera && 'text-texto-tenue',
                )}
              >
                {Number(fecha.slice(8))}
              </span>
              {/* En el móvil, puntos de color; en el PC, píldoras con su texto. */}
              <span className="flex flex-wrap justify-center gap-[3px] md:hidden">
                {deEse.slice(0, 3).map((r) => (
                  <span
                    key={r.id}
                    aria-hidden
                    className="size-[7px] rounded-full"
                    style={fondoDegradado(ESTILO[r.tipo].degradado)}
                  />
                ))}
              </span>
              <span className="hidden flex-col gap-[3px] md:flex">
                {deEse.slice(0, semana ? 8 : 3).map((r) => (
                  <Pildora
                    key={r.id}
                    recordatorio={r}
                    fecha={fecha}
                    puedeMover={puedeMover}
                    alAbrir={alAbrir}
                  />
                ))}
                {deEse.length > (semana ? 8 : 3) && (
                  <span className="px-[4px] text-etiqueta text-texto-suave">
                    y {deEse.length - (semana ? 8 : 3)} más
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Una píldora del mes: su degradado, su icono y su texto. Lo que dura varios días se pinta como una
 * banda: sin esquinas por dentro, y con el texto el primer día y cada lunes.
 */
function Pildora({
  recordatorio: r,
  fecha,
  puedeMover,
  alAbrir,
}: {
  readonly recordatorio: UnRecordatorio;
  readonly fecha: string;
  readonly puedeMover: boolean;
  readonly alAbrir: (r: UnRecordatorio) => void;
}) {
  const empieza = fecha === r.dia;
  const acaba = fecha === (r.hastaEl ?? r.dia);
  const conTexto = empieza || diaDeLaSemana(fecha) === 1;
  return (
    <button
      type="button"
      draggable={puedeMover}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', r.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(e) => {
        e.stopPropagation();
        alAbrir(r);
      }}
      title={r.titulo}
      className={clases(
        'flex min-h-[1.45rem] items-center gap-[4px] overflow-hidden px-[6px] text-left text-[0.72rem] font-semibold leading-tight text-white',
        empieza ? 'rounded-l-[8px]' : '-ml-[6px] pl-[12px]',
        acaba ? 'rounded-r-[8px]' : '-mr-[6px] pr-[12px]',
        puedeMover && 'cursor-grab active:cursor-grabbing',
      )}
      style={fondoDegradado(ESTILO[r.tipo].degradado)}
    >
      {conTexto ? (
        <>
          <span aria-hidden className="shrink-0">
            {ESTILO[r.tipo].icono}
          </span>
          <span className="truncate">
            {r.desde !== null && empieza && (
              <span className="hidden font-bold xl:inline">{sinCero(r.desde)} </span>
            )}
            {r.titulo}
          </span>
        </>
      ) : (
        <span className="sr-only">{r.titulo}</span>
      )}
    </button>
  );
}

// ── El mes pequeño de la barra ───────────────────────────────────────────────

function ElMesPequeno({
  dias,
  centro,
  hoy,
  elegido,
  conAlgo,
  alElegir,
}: {
  readonly dias: readonly string[];
  readonly centro: string;
  readonly hoy: string;
  readonly elegido: string;
  readonly conAlgo: (fecha: string) => boolean;
  readonly alElegir: (fecha: string) => void;
}) {
  return (
    <div className="rounded-[18px] border border-borde bg-superficie p-e3">
      <p className="mb-e2 text-secundario font-bold">{elMesEnLetra(centro)}</p>
      <div className="grid grid-cols-7 gap-y-[2px] text-center">
        {DIAS_DE_LA_SEMANA.map((d) => (
          <span key={d} className="text-etiqueta font-semibold text-texto-tenue">
            {d}
          </span>
        ))}
        {dias.map((fecha) => (
          <button
            key={fecha}
            type="button"
            aria-label={elDiaEnLetra(fecha)}
            onClick={() => {
              alElegir(fecha);
            }}
            className={clases(
              'relative mx-auto grid size-7 place-items-center rounded-full text-etiqueta',
              fecha.slice(0, 7) !== centro.slice(0, 7) && 'text-texto-tenue',
              fecha === hoy && 'bg-texto font-bold text-superficie',
              fecha !== hoy && fecha === elegido && 'ring-2 ring-naranja',
            )}
          >
            {Number(fecha.slice(8))}
            {conAlgo(fecha) && fecha !== hoy && (
              <span
                aria-hidden
                className="absolute bottom-[2px] size-[4px] rounded-full bg-naranja"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Las tarjetas y lo próximo ────────────────────────────────────────────────

function LoQueDice({ recordatorio: r }: { readonly recordatorio: UnRecordatorio }) {
  const dias = cuantosDiasDura(r.dia, r.hastaEl);
  const partes = [
    PARA_QUIEN_EN_LETRA[r.para],
    r.avisaA === null ? null : comoAvisa(r.avisaA, dias).replace('Avisa', 'aviso'),
  ].filter((p): p is string => p !== null);
  return <>{partes.join(' · ')}</>;
}

function Tarjeta({
  recordatorio: r,
  dia,
  alAbrir,
}: {
  readonly recordatorio: UnRecordatorio;
  readonly dia?: string;
  readonly alAbrir: (r: UnRecordatorio) => void;
}) {
  const dias = cuantosDiasDura(r.dia, r.hastaEl);
  return (
    <button
      type="button"
      onClick={() => {
        alAbrir(r);
      }}
      className="flex w-full items-center gap-e3 rounded-[18px] border border-borde bg-superficie p-e3 text-left [box-shadow:var(--sombra-tarjeta)]"
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-[12px] text-white"
        style={fondoDegradado(ESTILO[r.tipo].degradado)}
      >
        {ESTILO[r.tipo].icono}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-cuerpo">{r.titulo}</strong>
        <span className="block truncate text-secundario text-texto-suave">
          <LoQueDice recordatorio={r} />
        </span>
      </span>
      <span className="shrink-0 text-right text-secundario">
        <strong className="block">
          {dia === undefined
            ? elDiaCorto(r.dia)
            : dias > 1
              ? `Día ${String(cuantosDiasDura(r.dia, dia))} de ${String(dias)}`
              : ''}
        </strong>
        <span className="text-texto-suave">
          {r.desde === null ? 'todo el día' : sinCero(r.desde)}
        </span>
      </span>
    </button>
  );
}

function LosProximos({
  recordatorios,
  alAbrir,
}: {
  readonly recordatorios: readonly UnRecordatorio[];
  readonly alAbrir: (r: UnRecordatorio) => void;
}) {
  if (recordatorios.length === 0) return null;
  return (
    <section className="flex flex-col gap-e2" aria-label="Próximos">
      <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">Próximos</h3>
      {recordatorios.map((r) => (
        <Tarjeta key={r.id} recordatorio={r} alAbrir={alAbrir} />
      ))}
    </section>
  );
}

// ── Abrir uno ────────────────────────────────────────────────────────────────

function ElRecordatorio({
  recordatorio: r,
  puedeCambiarlo,
  alCerrar,
  alCambiar,
  alQuitar,
}: {
  readonly recordatorio: UnRecordatorio;
  readonly puedeCambiarlo: boolean;
  readonly alCerrar: () => void;
  readonly alCambiar: () => void;
  readonly alQuitar: () => Promise<ErrorDeLaApi | null>;
}) {
  const [quitando, setQuitando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const dias = cuantosDiasDura(r.dia, r.hastaEl);
  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={r.titulo}
      pie={
        puedeCambiarlo ? (
          <Botones>
            <Boton
              tono="peligro"
              cargando={quitando}
              textoCargando="Quitando"
              onClick={() => {
                setQuitando(true);
                void alQuitar().then((fallo) => {
                  setQuitando(false);
                  setError(fallo);
                });
              }}
            >
              Quitar
            </Boton>
            <Boton tono="principal" onClick={alCambiar}>
              Cambiar
            </Boton>
          </Botones>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <div
          className="flex items-center gap-e3 rounded-[16px] p-e3 text-white"
          style={fondoDegradado(ESTILO[r.tipo].degradado)}
        >
          <span aria-hidden className="grid size-10 place-items-center rounded-[12px] bg-white/20">
            {ESTILO[r.tipo].icono}
          </span>
          <span>
            <strong className="block text-cuerpo">{NOMBRE_DEL_RECORDATORIO[r.tipo]}</strong>
            <span className="text-secundario">
              {r.hastaEl === null ? elDiaEnLetra(r.dia) : delAl(r.dia, r.hastaEl)}
              {r.desde === null ? ' · todo el día' : ` · ${sinCero(r.desde)}`}
            </span>
          </span>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-e4 gap-y-e2 text-secundario">
          <dt className="text-texto-suave">Para</dt>
          <dd>{PARA_QUIEN_EN_LETRA[r.para]}</dd>
          <dt className="text-texto-suave">Aviso</dt>
          <dd>{comoAvisa(r.avisaA, dias)}</dd>
          {r.puestoPor !== null && (
            <>
              <dt className="text-texto-suave">Lo puso</dt>
              <dd>{r.puestoPor}</dd>
            </>
          )}
        </dl>
        {r.detalle !== null && (
          <p className="rounded-[14px] bg-fondo p-e3 text-secundario">{r.detalle}</p>
        )}
      </div>
    </Hoja>
  );
}

// ── Poner o cambiar uno ──────────────────────────────────────────────────────

const TIPOS: readonly TipoDeRecordatorio[] = ['limpieza', 'inspeccion', 'formacion', 'otro'];

function PonerRecordatorio({
  hoy,
  diaDeEntrada,
  recordatorio,
  alCerrar,
  alGuardar,
}: {
  readonly hoy: string;
  readonly diaDeEntrada: string;
  readonly recordatorio: UnRecordatorio | null;
  readonly alCerrar: () => void;
  readonly alGuardar: (entrada: Record<string, unknown>) => Promise<ErrorDeLaApi | null>;
}) {
  const [titulo, setTitulo] = useState(recordatorio?.titulo ?? '');
  const [tipo, setTipo] = useState<TipoDeRecordatorio>(recordatorio?.tipo ?? 'limpieza');
  const [para, setPara] = useState<ParaQuien>(recordatorio?.para ?? 'todos');
  const [dia, setDia] = useState(recordatorio?.dia ?? diaDeEntrada);
  const [hastaEl, setHastaEl] = useState(
    recordatorio?.hastaEl ?? recordatorio?.dia ?? diaDeEntrada,
  );
  const [todoElDia, setTodoElDia] = useState(recordatorio === null || recordatorio.desde === null);
  const [desde, setDesde] = useState(recordatorio?.desde ?? '10:00');
  const [avisa, setAvisa] = useState(recordatorio === null || recordatorio.avisaA !== null);
  const [avisaA, setAvisaA] = useState(recordatorio?.avisaA ?? '09:00');
  const [detalle, setDetalle] = useState(recordatorio?.detalle ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const dias = hastaEl >= dia ? cuantosDiasDura(dia, hastaEl) : 0;
  const listo =
    titulo.trim() !== '' && dia !== '' && hastaEl >= dia && hastaEl >= hoy && !guardando;

  async function guardar() {
    setGuardando(true);
    setError(null);
    const fallo = await alGuardar({
      ...(recordatorio === null ? {} : { id: recordatorio.id }),
      titulo: titulo.trim(),
      tipo,
      para,
      dia,
      ...(hastaEl > dia ? { hasta_el: hastaEl } : {}),
      ...(todoElDia ? {} : { desde }),
      ...(avisa ? { avisa_a: avisaA } : {}),
      ...(detalle.trim() === '' ? {} : { detalle: detalle.trim() }),
    });
    setGuardando(false);
    if (fallo !== null) setError(fallo);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={recordatorio === null ? 'Añadir al calendario del equipo' : 'Cambiarlo'}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            {recordatorio === null ? 'Ponerlo' : 'Guardar'}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        <fieldset className="flex flex-col gap-e2">
          <legend className="mb-e2 text-secundario font-semibold">Qué es</legend>
          <div className="grid grid-cols-2 gap-e2 sm:grid-cols-4">
            {TIPOS.map((t) => {
              const puesto = tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={puesto}
                  onClick={() => {
                    setTipo(t);
                  }}
                  className={clases(
                    'flex min-h-toque items-center gap-e2 rounded-[14px] border px-e3 text-secundario font-semibold',
                    puesto ? 'border-transparent text-white' : 'border-borde bg-superficie',
                  )}
                  style={puesto ? fondoDegradado(ESTILO[t].degradado) : undefined}
                >
                  <span aria-hidden>{ESTILO[t].icono}</span>
                  {NOMBRE_DEL_RECORDATORIO[t]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Campo
          etiqueta="Qué pone"
          ayuda="«Limpieza a fondo», «Inspección de Sanidad», «Formación de alérgenos»…"
          value={titulo}
          maxLength={80}
          onChange={(e) => {
            setTitulo(e.currentTarget.value);
          }}
        />
        <Segmentado
          etiqueta="Para quién"
          ancho
          valor={para}
          alElegir={setPara}
          opciones={[
            { valor: 'todos', texto: 'Todos' },
            { valor: 'sala', texto: 'Solo sala' },
            { valor: 'cocina', texto: 'Solo cocina' },
          ]}
        />
        <div className="grid grid-cols-2 gap-e3">
          <Campo
            etiqueta="El primer día"
            tipo="fecha"
            value={dia}
            onChange={(e) => {
              const valor = e.currentTarget.value;
              setDia(valor);
              if (hastaEl < valor) setHastaEl(valor);
            }}
          />
          <Campo
            etiqueta="El último día"
            tipo="fecha"
            value={hastaEl}
            onChange={(e) => {
              setHastaEl(e.currentTarget.value);
            }}
          />
        </div>
        <Interruptor etiqueta="Todo el día" puesto={todoElDia} alCambiar={setTodoElDia} />
        {!todoElDia && (
          <Campo
            etiqueta="A qué hora"
            tipo="hora"
            value={desde}
            onChange={(e) => {
              setDesde(e.currentTarget.value);
            }}
          />
        )}
        <Interruptor
          etiqueta="Avisar"
          ayuda={
            dias > 1
              ? 'A la campana y al móvil de a quien le toca, a esa hora cada día.'
              : 'A la campana y al móvil de a quien le toca, a esa hora.'
          }
          puesto={avisa}
          alCambiar={setAvisa}
        />
        {avisa && (
          <Campo
            etiqueta="A qué hora avisa"
            tipo="hora"
            value={avisaA}
            onChange={(e) => {
              setAvisaA(e.currentTarget.value);
            }}
          />
        )}
        <Campo
          etiqueta="Algo más (opcional)"
          ayuda="«Traed ropa de cambio», «Viene a las 10:00 con el inspector»…"
          value={detalle}
          maxLength={200}
          onChange={(e) => {
            setDetalle(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
