import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  ErrorEnCristiano,
  Hoja,
  Interruptor,
  fondoDegradado,
  type NombreDeDegradado,
} from '@estook/ui';
import {
  IconoAvisos,
  IconoFormacion,
  IconoInspeccion,
  IconoLimpieza,
  IconoNota,
} from '@estook/iconos';
import { PARA_QUIEN_EN_LETRA, type TipoDeRecordatorio } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { MisNotas, UnaNota, UnRecordatorio } from './contrato.ts';

/**
 * Tus notas y lo que viene, en Calendario › Personal (la Ampliación 4 · 3, 0153; maqueta, «Lo tuyo,
 * en una pantalla que da gusto abrir»).
 *
 * **Las notas de cada uno, que no ve nadie más** (tampoco el gerente: lo dice la base), en amarillo,
 * con aviso a la hora que se quiera. Y junto a ellas, **lo del equipo que te toca** en las dos
 * semanas que vienen —la formación del jueves, la limpieza de la cocina—, con su color.
 */

const DEL_EQUIPO: Readonly<
  Record<TipoDeRecordatorio, { readonly degradado: NombreDeDegradado; readonly icono: ReactNode }>
> = {
  limpieza: { degradado: 'historial', icono: <IconoLimpieza size={16} /> },
  inspeccion: { degradado: 'incidencias', icono: <IconoInspeccion size={16} /> },
  formacion: { degradado: 'formacion', icono: <IconoFormacion size={16} /> },
  otro: { degradado: 'formacion', icono: <IconoAvisos size={16} /> },
};

function elDiaCorto(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  const manana = new Date(Date.parse(`${hoy}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  if (fecha === manana) return 'Mañana';
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
function sinCero(hora: string): string {
  return hora.replace(/^0(\d)/, '$1');
}

type LoQueViene =
  | { readonly clase: 'nota'; readonly dia: string; readonly nota: UnaNota }
  | { readonly clase: 'equipo'; readonly dia: string; readonly recordatorio: UnRecordatorio };

export function TusNotas() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const lo = usarLectura<MisNotas>('mis_notas');
  const [abierta, setAbierta] = useState<UnaNota | 'nueva' | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);

  const datos = lo.data;
  if (datos === undefined) return null;

  const hoy = datos.hoy;
  // Lo del equipo que dura varios días sale desde hoy, no desde que empezó.
  const lista: LoQueViene[] = [
    ...datos.notas.map((nota) => ({ clase: 'nota' as const, dia: nota.dia, nota })),
    ...datos.delEquipo.map((recordatorio) => ({
      clase: 'equipo' as const,
      dia: recordatorio.dia < hoy ? hoy : recordatorio.dia,
      recordatorio,
    })),
  ].sort((a, b) => a.dia.localeCompare(b.dia));

  async function refrescar(frase: string) {
    setNoticia(frase);
    await cache.invalidateQueries({ queryKey: ['mis_notas'] });
  }

  return (
    <section className="flex flex-col gap-e2" aria-label="Tus notas y lo que viene">
      <div className="flex items-center justify-between gap-e3">
        <h2 className="text-seccion font-semibold">Tus notas y lo que viene</h2>
        <button
          type="button"
          onClick={() => {
            setAbierta('nueva');
          }}
          className="inline-flex min-h-toque items-center gap-e2 rounded-[12px] px-e3 font-bold"
          style={{ ...fondoDegradado('nota'), color: 'var(--texto-sobre-nota)' }}
        >
          <IconoNota size={16} aria-hidden />
          Apuntar una nota
        </button>
      </div>
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
      {lista.length === 0 ? (
        <p className="text-secundario text-texto-suave">
          Nada apuntado. Una nota tuya la ves solo tú, y te avisa a la hora que pongas.
        </p>
      ) : (
        lista.map((cosa) =>
          cosa.clase === 'nota' ? (
            <button
              key={`n${cosa.nota.id}`}
              type="button"
              onClick={() => {
                setAbierta(cosa.nota);
              }}
              className="flex w-full items-center gap-e3 rounded-[18px] border border-borde bg-superficie p-e3 text-left [box-shadow:var(--sombra-tarjeta)]"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-[12px]"
                style={{ ...fondoDegradado('nota'), color: 'var(--texto-sobre-nota)' }}
              >
                <IconoNota size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-cuerpo">{cosa.nota.texto}</strong>
                <span className="text-secundario text-texto-suave">Tu nota · solo tú</span>
              </span>
              <span className="shrink-0 text-right text-secundario">
                <strong className="block">{elDiaCorto(cosa.nota.dia, hoy)}</strong>
                <span className="text-texto-suave">
                  {cosa.nota.avisaA === null ? 'sin aviso' : sinCero(cosa.nota.avisaA)}
                </span>
              </span>
            </button>
          ) : (
            <div
              key={`e${cosa.recordatorio.id}`}
              className="flex w-full items-center gap-e3 rounded-[18px] border border-borde bg-superficie p-e3 [box-shadow:var(--sombra-tarjeta)]"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-[12px] text-white"
                style={fondoDegradado(DEL_EQUIPO[cosa.recordatorio.tipo].degradado)}
              >
                {DEL_EQUIPO[cosa.recordatorio.tipo].icono}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-cuerpo">{cosa.recordatorio.titulo}</strong>
                <span className="text-secundario text-texto-suave">
                  Del equipo · {PARA_QUIEN_EN_LETRA[cosa.recordatorio.para].toLowerCase()}
                </span>
              </span>
              <span className="shrink-0 text-right text-secundario">
                <strong className="block">{elDiaCorto(cosa.dia, hoy)}</strong>
                <span className="text-texto-suave">
                  {cosa.recordatorio.desde === null
                    ? 'todo el día'
                    : sinCero(cosa.recordatorio.desde)}
                </span>
              </span>
            </div>
          ),
        )
      )}

      {abierta !== null && (
        <LaNota
          hoy={hoy}
          nota={abierta === 'nueva' ? null : abierta}
          alCerrar={() => {
            setAbierta(null);
          }}
          alGuardar={async (entrada) => {
            const respuesta = await cliente.ejecutar('poner_mi_nota', entrada);
            if (!respuesta.ok) return respuesta.error;
            setAbierta(null);
            await refrescar('Nota apuntada: solo la ves tú');
            return null;
          }}
          alQuitar={async (id) => {
            const respuesta = await cliente.ejecutar('quitar_mi_nota', { id });
            if (!respuesta.ok) return respuesta.error;
            setAbierta(null);
            await refrescar('Nota quitada');
            return null;
          }}
        />
      )}
    </section>
  );
}

function LaNota({
  hoy,
  nota,
  alCerrar,
  alGuardar,
  alQuitar,
}: {
  readonly hoy: string;
  readonly nota: UnaNota | null;
  readonly alCerrar: () => void;
  readonly alGuardar: (entrada: Record<string, unknown>) => Promise<ErrorDeLaApi | null>;
  readonly alQuitar: (id: string) => Promise<ErrorDeLaApi | null>;
}) {
  const [texto, setTexto] = useState(nota?.texto ?? '');
  const [dia, setDia] = useState(nota?.dia ?? hoy);
  const [avisa, setAvisa] = useState(nota === null || nota.avisaA !== null);
  const [avisaA, setAvisaA] = useState(nota?.avisaA ?? '09:00');
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const listo = texto.trim() !== '' && dia >= hoy && !haciendo;

  async function con(promesa: Promise<ErrorDeLaApi | null>) {
    setHaciendo(true);
    setError(null);
    const fallo = await promesa;
    setHaciendo(false);
    if (fallo !== null) setError(fallo);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={nota === null ? 'Apuntar una nota' : 'Tu nota'}
      pie={
        <Botones>
          {nota === null ? (
            <Boton tono="texto" onClick={alCerrar}>
              Dejarlo
            </Boton>
          ) : (
            <Boton
              tono="peligro"
              disabled={haciendo}
              onClick={() => {
                void con(alQuitar(nota.id));
              }}
            >
              Quitarla
            </Boton>
          )}
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={haciendo}
            textoCargando="Guardando"
            onClick={() => {
              void con(
                alGuardar({
                  ...(nota === null ? {} : { id: nota.id }),
                  texto: texto.trim(),
                  dia,
                  ...(avisa ? { avisa_a: avisaA } : {}),
                }),
              );
            }}
          >
            {nota === null ? 'Apuntarla' : 'Guardar'}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        <Campo
          etiqueta="Qué te apuntas"
          ayuda="Solo la ves tú: ni tus jefes ni quien lleva el local."
          value={texto}
          maxLength={200}
          onChange={(e) => {
            setTexto(e.currentTarget.value);
          }}
        />
        <Campo
          etiqueta="Qué día"
          tipo="fecha"
          value={dia}
          onChange={(e) => {
            setDia(e.currentTarget.value);
          }}
        />
        <Interruptor
          etiqueta="Avisarme"
          ayuda="A la campana y al móvil, ese día a esa hora."
          puesto={avisa}
          alCambiar={setAvisa}
        />
        {avisa && (
          <Campo
            etiqueta="A qué hora"
            tipo="hora"
            value={avisaA}
            onChange={(e) => {
              setAvisaA(e.currentTarget.value);
            }}
          />
        )}
      </div>
    </Hoja>
  );
}
