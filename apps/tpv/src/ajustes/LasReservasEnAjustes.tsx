import { useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { ANTELACIONES_DE_LA_WEB, DIAS_PARA_RESERVAR, laAntelacionEnLetra } from '@estook/dominio';
import {
  IconoCalendario,
  IconoCubiertos,
  IconoEnviar,
  IconoReloj,
  IconoVincular,
  type Icono as IconoDeLucide,
} from '@estook/iconos';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  fondoDegradado,
  type NombreDeDegradado,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLosAjustesDeReservas } from '../ganchos/usarLasReservas.ts';
import type { LosAjustesDeReservas, ServicioDeReservas } from '../datos/tipos.ts';
import { irA } from '../navegar.ts';
import { Casilla, Minutos } from './PinYBloqueo.tsx';

/**
 * **Ajustes del TPV › Reservas** (la Ampliación 5 · 1 y 5 · 2, 0153), **ordenados** (Richi, 26-nov: «está todo
 * suelto, sin orden ninguno»; «el enlace está abajo cuando debería estar arriba»). De arriba abajo, en
 * tarjetas con su color y su icono:
 *
 *   1. **Reservas encendidas**, el interruptor de todo (apagadas de fábrica).
 *   2. **Tu web de reservas**: el enlace para copiar, lo primero que se busca.
 *   3. **Cuándo se reserva**: los servicios, los días que abre cada uno y hasta cuánto antes por internet.
 *   4. **Las mesas**: cuánto tarda una mesa en quedar libre (dicho en llano), cuándo se libera la de quien no
 *      llega y el tope de comensales; qué mesas se juntan y cuáles salen en la web, en el editor de la sala.
 *   5. **Avisos al cliente**: el correo y «Pedir que confirmen».
 *
 * Guardar sale abajo, fijo, solo cuando hay algo cambiado.
 */

const TAMANOS = ['1 o 2 personas', '3 o 4', '5 o 6', '7 o más'] as const;

/** Las horas en cuartos, para elegir el principio y el final de un servicio. */
const CUARTOS: readonly string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const TODOS_LOS_DIAS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

function enHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${String(m)} min`;
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m)}`;
}

export function LasReservasEnAjustes() {
  const lo = usarLosAjustesDeReservas();
  if (lo.data === undefined) return <Cargando que="las reservas" />;
  return <ElFormulario ajustes={lo.data} />;
}

interface LoQueSeGuarda {
  readonly servicios: readonly ServicioDeReservas[];
  readonly duraciones: readonly number[];
  readonly topePorCuarto: number | null;
  readonly liberarTras: number;
  readonly avisarPorCorreo: boolean;
  readonly pedirQueConfirmen: boolean;
  readonly minutosParaConfirmar: number;
  readonly antelacionWeb: number;
}

function loQueTiene(a: LosAjustesDeReservas): LoQueSeGuarda {
  return {
    servicios: a.servicios,
    duraciones: a.duraciones,
    topePorCuarto: a.topePorCuarto,
    liberarTras: a.liberarTras,
    avisarPorCorreo: a.avisarPorCorreo === true,
    pedirQueConfirmen: a.pedirQueConfirmen === true,
    minutosParaConfirmar: a.minutosParaConfirmar ?? 30,
    antelacionWeb: a.antelacionWeb ?? 120,
  };
}

function ElFormulario({ ajustes }: { readonly ajustes: LosAjustesDeReservas }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [encendidas, setEncendidas] = useState(ajustes.encendidas);
  const [guardadoAntes, setGuardadoAntes] = useState(() => loQueTiene(ajustes));
  const [servicios, setServicios] = useState<ServicioDeReservas[]>([...ajustes.servicios]);
  const [duraciones, setDuraciones] = useState<number[]>([...ajustes.duraciones]);
  const [conTope, setConTope] = useState(ajustes.topePorCuarto !== null);
  const [tope, setTope] = useState(ajustes.topePorCuarto ?? 20);
  const [liberarTras, setLiberarTras] = useState(ajustes.liberarTras);
  const [avisarPorCorreo, setAvisarPorCorreo] = useState(ajustes.avisarPorCorreo === true);
  const [pedirQueConfirmen, setPedirQueConfirmen] = useState(ajustes.pedirQueConfirmen === true);
  const [minutosParaConfirmar, setMinutosParaConfirmar] = useState(
    ajustes.minutosParaConfirmar ?? 30,
  );
  const [antelacionWeb, setAntelacionWeb] = useState(ajustes.antelacionWeb ?? 120);
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);

  const ahora: LoQueSeGuarda = {
    servicios: servicios.map((s) => ({ ...s, nombre: s.nombre.trim() })),
    duraciones,
    topePorCuarto: conTope ? tope : null,
    liberarTras,
    avisarPorCorreo,
    pedirQueConfirmen,
    minutosParaConfirmar,
    antelacionWeb,
  };
  const hayCambios = JSON.stringify(ahora) !== JSON.stringify(guardadoAntes);
  const serviciosBien = servicios.every((s) => s.nombre.trim() !== '' && s.desde <= s.hasta);

  async function guardar(cambio?: { readonly encendidas: boolean }) {
    setGuardando(true);
    setFallo(null);
    setGuardado(false);
    // Encender o apagar guarda solo eso: lo demás que esté a medias espera a «Guardar».
    const lo = cambio === undefined ? ahora : guardadoAntes;
    const respuesta = await cliente.ejecutar('guardar_ajustes_de_reservas', {
      encendidas: cambio?.encendidas ?? encendidas,
      servicios: lo.servicios,
      duraciones: lo.duraciones,
      tope_por_cuarto: lo.topePorCuarto,
      liberar_tras: lo.liberarTras,
      avisar_por_correo: lo.avisarPorCorreo,
      pedir_que_confirmen: lo.pedirQueConfirmen,
      minutos_para_confirmar: lo.minutosParaConfirmar,
      antelacion_web: lo.antelacionWeb,
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setFallo(respuesta.error);
      return;
    }
    if (cambio === undefined) {
      setGuardadoAntes(ahora);
      setGuardado(true);
    }
    await cache.invalidateQueries({ queryKey: ['sala'] });
  }

  const cambiarServicio = (i: number, cambio: Partial<ServicioDeReservas>) => {
    setServicios((antes) => antes.map((s, j) => (j === i ? { ...s, ...cambio } : s)));
  };

  return (
    <div className="flex max-w-[46rem] flex-col gap-e5 pb-e5">
      {/* 1 · El interruptor de todo */}
      <header
        className="flex flex-wrap items-center gap-e4 rounded-[22px] p-e5 text-white [box-shadow:var(--sombra-baldosa)]"
        style={fondoDegradado('fechas')}
      >
        <span className="grid size-[52px] shrink-0 place-items-center rounded-[16px] bg-white/15">
          <IconoCalendario size={28} strokeWidth={2} aria-hidden />
        </span>
        <span className="flex min-w-[12rem] flex-1 flex-col">
          <h1 className="text-pantalla font-bold leading-tight">Reservas</h1>
          <span className="text-secundario text-white/85">
            {encendidas
              ? 'Encendidas: salen arriba, junto a Tickets, en la caja, el comandero y el móvil.'
              : 'Apagadas. Enciéndelas para reservar en el TPV y por internet.'}
          </span>
        </span>
        <Interruptor
          puesto={encendidas}
          ocupado={guardando}
          etiqueta="Reservas encendidas"
          alCambiar={(puesto) => {
            setEncendidas(puesto);
            void guardar({ encendidas: puesto });
          }}
        />
      </header>

      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {guardado && (
        <Aviso
          tono="bien"
          titulo="Guardado"
          esNoticia
          alCerrar={() => {
            setGuardado(false);
          }}
        />
      )}

      {encendidas && (
        <>
          {/* 2 · Tu web de reservas */}
          <TuWeb direccion={ajustes.direccion ?? null} />

          {/* 3 · Cuándo se reserva */}
          <Tarjeta
            icono={IconoReloj}
            degradado="vacaciones"
            titulo="Cuándo se reserva"
            frase="Cada servicio, de la primera hora a la última (cada cuarto de hora), y los días que abre."
          >
            {servicios.map((s, i) => (
              <div key={i} className="flex flex-col gap-e3 rounded-grande bg-fondo p-e3">
                <div className="flex flex-wrap items-center gap-e2">
                  <input
                    aria-label="Nombre del servicio"
                    value={s.nombre}
                    maxLength={20}
                    onChange={(e) => {
                      cambiarServicio(i, { nombre: e.currentTarget.value });
                    }}
                    className="min-h-toque w-36 rounded-grande border border-borde bg-superficie px-e3 font-bold"
                  />
                  <span className="text-texto-suave">de</span>
                  <Hora
                    etiqueta={`${s.nombre}: desde`}
                    valor={s.desde}
                    alCambiar={(desde) => {
                      cambiarServicio(i, { desde });
                    }}
                  />
                  <span className="text-texto-suave">a</span>
                  <Hora
                    etiqueta={`${s.nombre}: hasta`}
                    valor={s.hasta}
                    alCambiar={(hasta) => {
                      cambiarServicio(i, { hasta });
                    }}
                  />
                  {servicios.length > 1 && (
                    <Boton
                      tono="texto"
                      tamano="s"
                      onClick={() => {
                        setServicios((antes) => antes.filter((_, j) => j !== i));
                      }}
                    >
                      Quitar
                    </Boton>
                  )}
                </div>
                <LosDias
                  servicio={s.nombre}
                  dias={s.dias ?? TODOS_LOS_DIAS}
                  alCambiar={(dias) => {
                    // Los siete es «todos»: se guarda sin días, como de fábrica.
                    setServicios((antes) =>
                      antes.map((otro, j) => {
                        if (j !== i) return otro;
                        const { nombre, desde, hasta } = otro;
                        return dias.length === 7
                          ? { nombre, desde, hasta }
                          : { nombre, desde, hasta, dias };
                      }),
                    );
                  }}
                />
              </div>
            ))}
            {servicios.length < 4 && (
              <div>
                <Boton
                  tono="secundario"
                  tamano="s"
                  onClick={() => {
                    setServicios((antes) => [
                      ...antes,
                      { nombre: 'Otro', desde: '12:00', hasta: '14:00' },
                    ]);
                  }}
                >
                  + Otro servicio
                </Boton>
              </div>
            )}
            <Separador />
            <div className="flex flex-col gap-e2">
              <span className="font-bold">Por internet, hasta cuánto antes</span>
              <span className="text-secundario text-texto-tenue">
                Más cerca de la hora, por internet ya no se puede: se llama. En el TPV se reserva
                siempre.
              </span>
              <div
                role="radiogroup"
                aria-label="Por internet, hasta cuánto antes"
                className="flex flex-wrap gap-e2"
              >
                {ANTELACIONES_DE_LA_WEB.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={antelacionWeb === m}
                    onClick={() => {
                      setAntelacionWeb(m);
                    }}
                    className={`min-h-toque rounded-redondo px-e4 font-bold tabular-nums transition-colors ${
                      antelacionWeb === m
                        ? 'bg-texto text-fondo'
                        : 'border border-borde text-texto-suave hover:text-texto'
                    }`}
                  >
                    {laAntelacionEnLetra(m)}
                  </button>
                ))}
              </div>
            </div>
          </Tarjeta>

          {/* 4 · Las mesas */}
          <Tarjeta
            icono={IconoCubiertos}
            degradado="contrato"
            titulo="Las mesas"
            frase="Para que Estook no dé la misma mesa a dos reservas."
          >
            <div className="flex flex-col gap-e1">
              <span className="font-bold">Cuánto tarda una mesa en quedar libre</span>
              <span className="text-secundario text-texto-tenue">
                Desde que se sientan hasta que se van. Mientras, esa mesa no se da a otra reserva.
                Con tus cuentas cobradas, Estook aprende lo que tardan de verdad.
              </span>
            </div>
            <div className="flex flex-col divide-y divide-borde rounded-grande bg-fondo">
              {TAMANOS.map((t, i) => (
                <CuantoDura
                  key={t}
                  titulo={t}
                  real={ajustes.aprendidas[i] === true ? enHoras(ajustes.reales[i] ?? 0) : null}
                  valor={duraciones[i] ?? 90}
                  ocupado={guardando}
                  alCambiar={(v) => {
                    setDuraciones((antes) => antes.map((d, j) => (j === i ? v : d)));
                  }}
                />
              ))}
            </div>
            <Separador />
            <Minutos
              titulo="Si no llegan, la mesa se libera a los"
              frase="La reserva sigue, por si llegan tarde; la mesa ya se puede dar a otros."
              valor={liberarTras}
              desde={5}
              hasta={120}
              paso={5}
              ocupado={guardando}
              alCambiar={setLiberarTras}
            />
            <Separador />
            <Casilla
              titulo="Tope de comensales por cuarto de hora"
              frase="Para no hundir la cocina. Por internet no se pasa; en el TPV, avisa."
              puesta={conTope}
              ocupado={guardando}
              alCambiar={setConTope}
            />
            {conTope && (
              <label className="flex flex-wrap items-center gap-e3">
                <span className="font-bold">Como mucho</span>
                <input
                  inputMode="numeric"
                  value={String(tope)}
                  onChange={(e) => {
                    const n = Number(e.currentTarget.value.replace(/\D/g, '').slice(0, 3));
                    if (n > 0) setTope(n);
                  }}
                  className="min-h-toque w-24 rounded-grande border border-borde bg-fondo px-e3 text-center text-seccion font-bold tabular-nums"
                />
                <span className="text-texto-suave">que empiecen a la vez</span>
              </label>
            )}
            <Separador />
            <button
              type="button"
              onClick={() => {
                irA('sala/editar');
              }}
              className="flex items-center justify-between gap-e3 rounded-grande bg-fondo p-e3 text-left"
            >
              <span className="flex flex-col">
                <span className="font-bold">Qué mesas se juntan y cuáles salen en la web</span>
                <span className="text-secundario text-texto-tenue">
                  En La sala y las mesas: toca una mesa.
                </span>
              </span>
              <span aria-hidden className="text-seccion text-texto-suave">
                ›
              </span>
            </button>
          </Tarjeta>

          {/* 5 · Avisos al cliente */}
          <Tarjeta
            icono={IconoEnviar}
            degradado="formacion"
            titulo="Avisos al cliente"
            frase="Lo que le llega a quien reserva por internet."
          >
            <Casilla
              titulo="Avisar por correo"
              frase="Su reserva, el recordatorio del día antes y «Avísame si se libera». Al reservar se le pide el correo."
              puesta={avisarPorCorreo}
              ocupado={guardando}
              alCambiar={setAvisarPorCorreo}
            />
            <Separador />
            <Casilla
              titulo="Pedir que confirmen"
              frase="Si no confirma a tiempo, se cancela sola y la mesa queda libre."
              puesta={pedirQueConfirmen}
              ocupado={guardando}
              alCambiar={setPedirQueConfirmen}
            />
            {pedirQueConfirmen && (
              <Minutos
                titulo="Hasta cuántos minutos antes"
                frase="Una reserva de las 21:15 con 30 minutos: hasta las 20:45."
                valor={minutosParaConfirmar}
                desde={15}
                hasta={60}
                paso={5}
                ocupado={guardando}
                alCambiar={setMinutosParaConfirmar}
              />
            )}
          </Tarjeta>
        </>
      )}

      {/* Guardar: fijo abajo, solo con cambios */}
      {encendidas && hayCambios && (
        <div className="sticky bottom-0 z-20 pb-[calc(env(safe-area-inset-bottom)+var(--spacing-e4))]">
          <div className="flex w-full items-center justify-between gap-e3 rounded-[18px] border border-borde bg-superficie p-e3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]">
            <span className="text-secundario font-semibold text-texto-suave">
              {serviciosBien ? 'Tienes cambios sin guardar' : 'Revisa las horas de los servicios'}
            </span>
            <Boton
              tono="principal"
              disabled={!serviciosBien}
              cargando={guardando}
              textoCargando="Guardando"
              onClick={() => {
                void guardar();
              }}
            >
              Guardar
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Tu web de reservas ═══════════════════════════════════════════════════════

function TuWeb({ direccion }: { readonly direccion: string | null }) {
  const [copiado, setCopiado] = useState(false);
  const enlace = useMemo(
    () => (direccion === null ? null : `estook.com/reservar/${direccion}`),
    [direccion],
  );
  return (
    <Tarjeta
      icono={IconoVincular}
      degradado="fechas"
      titulo="Tu web de reservas"
      frase="Para tu Instagram, tu ficha de Google y WhatsApp."
    >
      {enlace === null ? (
        <p className="text-secundario text-texto-tenue">
          La web de reservas usa la dirección de la carta del local, y este local aún no la tiene.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-e3 rounded-grande bg-fondo p-e3">
          <span className="min-w-0 flex-1 truncate text-seccion font-bold">{enlace}</span>
          <Boton
            tono="principal"
            onClick={() => {
              // Sin conexión segura el navegador no deja copiar: entonces el enlace se ve igual.
              if (!('clipboard' in navigator)) return;
              void navigator.clipboard.writeText(`https://${enlace}`).then(
                () => {
                  setCopiado(true);
                },
                () => undefined,
              );
            }}
          >
            {copiado ? 'Copiado ✓' : 'Copiar el enlace'}
          </Boton>
        </div>
      )}
      <p className="text-secundario text-texto-tenue">
        ¿Tienes web propia? En Estook › Servicio › Reservas te damos el código para poner las
        reservas dentro de ella, con tus colores.
      </p>
    </Tarjeta>
  );
}

// ═══ Las piezas ═══════════════════════════════════════════════════════════════

function Tarjeta({
  icono: ElIcono,
  degradado,
  titulo,
  frase,
  children,
}: {
  readonly icono: IconoDeLucide;
  readonly degradado: NombreDeDegradado;
  readonly titulo: string;
  readonly frase: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e4 rounded-[22px] border border-borde bg-superficie p-e5">
      <header className="flex items-center gap-e3">
        <span
          aria-hidden
          className="grid size-[44px] shrink-0 place-items-center rounded-[14px] text-white"
          style={fondoDegradado(degradado)}
        >
          <ElIcono size={22} strokeWidth={2} />
        </span>
        <span className="flex flex-col">
          <h2 className="text-seccion font-bold leading-tight">{titulo}</h2>
          <span className="text-secundario text-texto-tenue">{frase}</span>
        </span>
      </header>
      {children}
    </section>
  );
}

function Separador() {
  return <hr className="border-borde" />;
}

/** El interruptor grande de la cabecera: se ve encendido o apagado desde lejos. */
function Interruptor({
  puesto,
  ocupado,
  etiqueta,
  alCambiar,
}: {
  readonly puesto: boolean;
  readonly ocupado: boolean;
  readonly etiqueta: string;
  readonly alCambiar: (puesto: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={puesto}
      aria-label={etiqueta}
      disabled={ocupado}
      onClick={() => {
        alCambiar(!puesto);
      }}
      className={`relative h-[38px] w-[68px] shrink-0 rounded-redondo transition-colors disabled:opacity-60 ${
        puesto ? 'bg-white' : 'bg-white/25'
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-[4px] size-[30px] rounded-redondo transition-[left] ${
          puesto ? 'left-[34px] bg-[#5433c4]' : 'left-[4px] bg-white'
        }`}
      />
    </button>
  );
}

function Hora({
  etiqueta,
  valor,
  alCambiar,
}: {
  readonly etiqueta: string;
  readonly valor: string;
  readonly alCambiar: (hora: string) => void;
}) {
  return (
    <select
      aria-label={etiqueta}
      value={valor}
      onChange={(e) => {
        alCambiar(e.currentTarget.value);
      }}
      className="min-h-toque rounded-grande border border-borde bg-superficie px-e3 tabular-nums"
    >
      {CUARTOS.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}

/** Lo que tarda una mesa de tantos, de cuarto en cuarto de hora, con lo que dicen sus cuentas al lado. */
function CuantoDura({
  titulo,
  real,
  valor,
  ocupado,
  alCambiar,
}: {
  readonly titulo: string;
  /** «1 h 24», si ya hay cuentas de sobra de este tamaño: entonces se usa esa. */
  readonly real: string | null;
  readonly valor: number;
  readonly ocupado: boolean;
  readonly alCambiar: (minutos: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-e3 p-e3">
      <span className="flex min-w-[10rem] flex-1 flex-col">
        <span className="font-bold">{titulo}</span>
        <span className="text-etiqueta text-texto-tenue">
          {real === null
            ? 'Aún sin cuentas: se usa la tuya'
            : `Tus cuentas dicen ${real}: se usa esa`}
        </span>
      </span>
      <span className="flex items-center gap-e2">
        <button
          type="button"
          aria-label={`${titulo}: un cuarto de hora menos`}
          disabled={ocupado || valor <= 30}
          onClick={() => {
            alCambiar(Math.max(30, valor - 15));
          }}
          className="size-11 rounded-grande bg-charcoal text-seccion font-bold disabled:opacity-50"
        >
          −
        </button>
        <span
          className="w-24 whitespace-nowrap text-center text-seccion font-bold tabular-nums"
          aria-live="polite"
        >
          {enHoras(valor)}
        </span>
        <button
          type="button"
          aria-label={`${titulo}: un cuarto de hora más`}
          disabled={ocupado || valor >= 360}
          onClick={() => {
            alCambiar(Math.min(360, valor + 15));
          }}
          className="size-11 rounded-grande bg-charcoal text-seccion font-bold disabled:opacity-50"
        >
          +
        </button>
      </span>
    </div>
  );
}

/**
 * **Los días que abre cada servicio** (maqueta aprobada: «Cerrado: domingo noche y lunes»): L M X J V S D, y los
 * que se apagan no se reservan ni en el TPV ni en la web. Siempre queda uno.
 */
function LosDias({
  servicio,
  dias,
  alCambiar,
}: {
  readonly servicio: string;
  readonly dias: readonly number[];
  readonly alCambiar: (dias: number[]) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`${servicio}: los días que abre`}
      className="flex flex-wrap gap-e1"
    >
      {DIAS_PARA_RESERVAR.map(({ dia, letra }) => {
        const abre = dias.includes(dia);
        return (
          <button
            key={dia}
            type="button"
            aria-pressed={abre}
            aria-label={`${letra}: ${abre ? 'abre' : 'cerrado'}`}
            disabled={abre && dias.length === 1}
            onClick={() => {
              alCambiar(
                abre ? dias.filter((d) => d !== dia) : [...dias, dia].sort((a, b) => a - b),
              );
            }}
            className={`grid size-[40px] place-items-center rounded-redondo text-secundario font-bold transition-colors ${
              abre
                ? 'bg-texto text-fondo'
                : 'border border-borde text-texto-tenue line-through decoration-2'
            }`}
          >
            {letra}
          </button>
        );
      })}
    </div>
  );
}
