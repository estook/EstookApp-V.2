import { DIAS_PARA_RESERVAR } from '@estook/dominio';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Aviso, Boton, Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLosAjustesDeReservas } from '../ganchos/usarLasReservas.ts';
import type { LosAjustesDeReservas, ServicioDeReservas } from '../datos/tipos.ts';
import { irA } from '../navegar.ts';
import { Casilla, Minutos } from './PinYBloqueo.tsx';

/**
 * **Ajustes del TPV › Reservas** (la Ampliación 5 · 1, 0153): **apagadas de fábrica**. Encendidas, salen
 * arriba («Reservas», a la derecha de Tickets) en la caja, el comandero y el móvil. Aquí: los servicios
 * (comida, cena) con sus horas, **cuánto dura una mesa** según los que son —y lo que duran de verdad,
 * cuando hay cuentas cobradas de sobra—, el tope de comensales por cuarto de hora y a los cuántos
 * minutos de retraso se libera la mesa. Las mesas que se juntan se marcan en el editor de la sala.
 *
 * **Por internet** (la Ampliación 5 · 2): el enlace de su web de reservas, para copiarlo en su web, Instagram,
 * Google y WhatsApp; **«Avisar al cliente por correo»** y **«Pedir que confirmen»**, las dos apagadas de
 * fábrica (Richi, 24-nov).
 */

const TAMANOS = ['De 1 a 2', 'De 3 a 4', 'De 5 a 6', '7 o más'] as const;

/** Las horas en cuartos, para elegir el principio y el final de un servicio. */
const CUARTOS: readonly string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function enHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m)}`;
}

export function LasReservasEnAjustes() {
  const lo = usarLosAjustesDeReservas();
  if (lo.data === undefined) return <Cargando que="las reservas" />;
  return <ElFormulario ajustes={lo.data} />;
}

function ElFormulario({ ajustes }: { readonly ajustes: LosAjustesDeReservas }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [encendidas, setEncendidas] = useState(ajustes.encendidas);
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
  const [copiado, setCopiado] = useState(false);
  const enlace = ajustes.direccion == null ? null : `estook.com/reservar/${ajustes.direccion}`;
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function guardar(cambio?: { readonly encendidas: boolean }) {
    setGuardando(true);
    setFallo(null);
    setGuardado(false);
    const respuesta = await cliente.ejecutar('guardar_ajustes_de_reservas', {
      encendidas: cambio?.encendidas ?? encendidas,
      servicios: servicios.map((s) => ({ ...s, nombre: s.nombre.trim() })),
      duraciones,
      tope_por_cuarto: conTope ? tope : null,
      liberar_tras: liberarTras,
      avisar_por_correo: avisarPorCorreo,
      pedir_que_confirmen: pedirQueConfirmen,
      minutos_para_confirmar: minutosParaConfirmar,
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setFallo(respuesta.error);
      return;
    }
    setGuardado(true);
    await cache.invalidateQueries({ queryKey: ['sala'] });
  }

  const cambiarServicio = (i: number, cambio: Partial<ServicioDeReservas>) => {
    setServicios((antes) => antes.map((s, j) => (j === i ? { ...s, ...cambio } : s)));
  };
  const serviciosBien = servicios.every((s) => s.nombre.trim() !== '' && s.desde <= s.hasta);

  return (
    <div className="flex max-w-[44rem] flex-col gap-e6">
      <header className="flex flex-col gap-e1">
        <h1 className="text-pantalla font-bold">Reservas</h1>
        <p className="text-texto-suave">
          Sobre el mismo plano que cobra: la mesa la pone Estook y, al sentar, la cuenta queda unida
          a la reserva.
        </p>
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

      <Casilla
        titulo="Reservas encendidas"
        frase="Salen arriba, a la derecha de Tickets, en la caja, el comandero y el móvil."
        puesta={encendidas}
        ocupado={guardando}
        alCambiar={(puesta) => {
          setEncendidas(puesta);
          void guardar({ encendidas: puesta });
        }}
      />

      <section className="flex flex-col gap-e3">
        <h2 className="text-seccion font-bold">Los servicios</h2>
        <p className="text-secundario text-texto-tenue">
          De la primera hora a la que se reserva a la última, cada cuarto de hora, y los días que
          abre.
        </p>
        {servicios.map((s, i) => (
          <div key={i} className="flex flex-col gap-e2 rounded-grande border border-borde p-e3">
            <div className="flex flex-wrap items-center gap-e2">
              <input
                aria-label="Nombre del servicio"
                value={s.nombre}
                maxLength={20}
                onChange={(e) => {
                  cambiarServicio(i, { nombre: e.currentTarget.value });
                }}
                className="min-h-toque w-36 rounded-grande border border-borde bg-fondo px-e3 font-bold"
              />
              <span className="text-texto-suave">de</span>
              <select
                aria-label={`${s.nombre}: desde`}
                value={s.desde}
                onChange={(e) => {
                  cambiarServicio(i, { desde: e.currentTarget.value });
                }}
                className="min-h-toque rounded-grande border border-borde bg-fondo px-e3 tabular-nums"
              >
                {CUARTOS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <span className="text-texto-suave">a</span>
              <select
                aria-label={`${s.nombre}: hasta`}
                value={s.hasta}
                onChange={(e) => {
                  cambiarServicio(i, { hasta: e.currentTarget.value });
                }}
                className="min-h-toque rounded-grande border border-borde bg-fondo px-e3 tabular-nums"
              >
                {CUARTOS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
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
        )}
      </section>

      <section className="flex flex-col gap-e3">
        <h2 className="text-seccion font-bold">Cuánto dura una mesa</h2>
        <p className="text-secundario text-texto-tenue">
          Con unas cuantas cuentas cobradas de cada tamaño, Estook usa lo que duran de verdad.
        </p>
        {TAMANOS.map((t, i) => (
          <CuantoDura
            key={t}
            titulo={t}
            frase={
              ajustes.aprendidas[i] === true
                ? `De verdad, en tus cuentas: ${enHoras(ajustes.reales[i] ?? 0)}. Se usa esa.`
                : 'Todavía con esta: faltan cuentas cobradas de este tamaño.'
            }
            valor={duraciones[i] ?? 90}
            ocupado={guardando}
            alCambiar={(v) => {
              setDuraciones((antes) => antes.map((d, j) => (j === i ? v : d)));
            }}
          />
        ))}
      </section>

      <section className="flex flex-col gap-e3">
        <h2 className="text-seccion font-bold">En servicio</h2>
        <Casilla
          titulo="Tope de comensales por cuarto de hora"
          frase="Para no hundir la cocina: avisa al reservar, y no impide al camarero."
          puesta={conTope}
          ocupado={guardando}
          alCambiar={setConTope}
        />
        {conTope && (
          <label className="flex items-center gap-e3">
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
            <span className="text-texto-suave">comensales que empiezan a la vez</span>
          </label>
        )}
        <Minutos
          titulo="Liberar la mesa de quien no llega"
          frase="Pasados estos minutos, su mesa cuenta como libre y sale el aviso para liberarla."
          valor={liberarTras}
          desde={5}
          hasta={120}
          paso={5}
          ocupado={guardando}
          alCambiar={setLiberarTras}
        />
      </section>

      <section className="flex flex-col gap-e3">
        <h2 className="text-seccion font-bold">Por internet</h2>
        {enlace === null ? (
          <p className="text-secundario text-texto-tenue">
            La web de reservas usa la dirección de la carta del local, y este local aún no la tiene.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-e3 rounded-grande border border-borde bg-fondo p-e3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-bold">Tu web de reservas</span>
              <span className="truncate text-secundario text-texto-tenue">
                {enlace} · para tu web, Instagram, Google y WhatsApp
              </span>
            </span>
            <Boton
              tono="secundario"
              tamano="s"
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
              {copiado ? 'Copiado' : 'Copiar el enlace'}
            </Boton>
          </div>
        )}
        <Casilla
          titulo="Avisar al cliente por correo"
          frase="Su reserva con el código, el recordatorio del día antes y «Avísame si se libera». Pide su correo al reservar."
          puesta={avisarPorCorreo}
          ocupado={guardando}
          alCambiar={setAvisarPorCorreo}
        />
        <Casilla
          titulo="Pedir que confirmen"
          frase="Si no confirma antes de la hora que digas, se cancela sola y la mesa queda libre."
          puesta={pedirQueConfirmen}
          ocupado={guardando}
          alCambiar={setPedirQueConfirmen}
        />
        {pedirQueConfirmen && (
          <Minutos
            titulo="Confirmar hasta"
            frase="Estos minutos antes de la hora de la reserva: una de las 21:15 con 30, hasta las 20:45."
            valor={minutosParaConfirmar}
            desde={15}
            hasta={60}
            paso={5}
            ocupado={guardando}
            alCambiar={setMinutosParaConfirmar}
          />
        )}
      </section>

      <p className="text-secundario text-texto-tenue">
        Las mesas que se juntan para una reserva grande (la 7 con la 8) se marcan en{' '}
        <button
          type="button"
          onClick={() => {
            irA('sala/editar');
          }}
          className="font-bold text-texto underline"
        >
          La sala y las mesas
        </button>
        : toca una mesa y elige con cuál se junta, y si sale en la web de reservas (la barra o la
        del rincón, mejor para quien llega).
      </p>

      <div>
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
  );
}

/** Lo que dura una mesa, de cuarto en cuarto de hora y dicho en horas: «1 h 45». */
function CuantoDura({
  titulo,
  frase,
  valor,
  ocupado,
  alCambiar,
}: {
  readonly titulo: string;
  readonly frase: string;
  readonly valor: number;
  readonly ocupado: boolean;
  readonly alCambiar: (minutos: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-e4">
      <span className="flex min-w-[12rem] flex-1 flex-col">
        <span className="font-bold">{titulo}</span>
        <span className="text-secundario text-texto-tenue">{frase}</span>
      </span>
      <span className="flex items-center gap-e2">
        <button
          type="button"
          aria-label={`${titulo}: un cuarto de hora menos`}
          disabled={ocupado || valor <= 30}
          onClick={() => {
            alCambiar(Math.max(30, valor - 15));
          }}
          className="size-12 rounded-grande bg-charcoal text-pantalla font-bold disabled:opacity-50"
        >
          −
        </button>
        <span
          className="w-28 whitespace-nowrap text-center text-pantalla font-bold tabular-nums"
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
          className="size-12 rounded-grande bg-charcoal text-pantalla font-bold disabled:opacity-50"
        >
          +
        </button>
      </span>
    </div>
  );
}

const TODOS_LOS_DIAS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * **Los días que abre cada servicio** (maqueta aprobada: «Cerrado: domingo noche y lunes»): L M X J V S D, y los que
 * se apagan no se reservan ni en el TPV ni en la web. Siempre queda uno.
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
