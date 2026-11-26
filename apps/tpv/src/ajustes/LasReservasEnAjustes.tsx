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
          De la primera hora a la que se reserva a la última, cada cuarto de hora.
        </p>
        {servicios.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-e2">
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
          <Minutos
            key={t}
            titulo={t}
            frase={
              ajustes.aprendidas[i] === true
                ? `De verdad, en tus cuentas: ${enHoras(ajustes.reales[i] ?? 0)}. Se usa esa.`
                : 'Todavía con esta: faltan cuentas cobradas de este tamaño.'
            }
            valor={duraciones[i] ?? 90}
            desde={30}
            hasta={360}
            paso={15}
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
        : toca una mesa y elige con cuál se junta.
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
