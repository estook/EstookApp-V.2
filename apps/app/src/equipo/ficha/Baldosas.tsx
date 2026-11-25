import type { ReactNode } from 'react';
import type { DegradadoDeTipo } from '@estook/ui';
import { IconoCalendario, IconoDocumento, IconoPalmera, IconoReloj } from '@estook/iconos';
import { TIPOS_DE_CONTRATO, cuantoLleva, diasEnLetra } from '@estook/dominio';
import type { LaFichaDelTrabajador } from '../contrato.ts';
import { fechaCorta } from './comoSeLee.ts';

/**
 * Los cuatro cuadrados de la ficha (la Ampliación 3, 0153; maqueta, pestaña 3): **jornada,
 * contrato, incorporación y vacaciones disponibles**, lo que se mira de un vistazo.
 *
 * Cada uno con el color de su tipo y siempre el mismo en toda la app (Richi, 24-nov:
 * «nada monótono»): las horas, naranja; el contrato, verde; las fechas, violeta; las
 * vacaciones, el azul de playa con su palmera. El icono grande y medio transparente, al
 * fondo, es lo que hace que no parezcan cajas planas.
 */

function Baldosa({
  degradado,
  icono,
  etiqueta,
  valor,
  detalle,
}: {
  readonly degradado: DegradadoDeTipo;
  readonly icono: (tamano: number) => ReactNode;
  readonly etiqueta: string;
  readonly valor: string;
  readonly detalle: string;
}) {
  return (
    <div
      data-baldosa={etiqueta}
      className="relative grid min-h-[104px] content-start gap-[3px] overflow-hidden rounded-[18px] p-e3 text-white [box-shadow:var(--sombra-baldosa)]"
      style={{ background: `var(--degradado-${degradado})` }}
    >
      <span aria-hidden className="absolute -bottom-3 -right-2 opacity-20">
        {icono(72)}
      </span>
      <span
        aria-hidden
        className="mb-e1 grid size-[30px] place-items-center rounded-[10px] bg-white/25"
      >
        {icono(17)}
      </span>
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.04em] opacity-95">
        {etiqueta}
      </span>
      <strong className="text-[1.15rem] font-extrabold leading-tight tracking-[-0.01em]">
        {valor}
      </strong>
      <span className="text-[0.74rem] opacity-95">{detalle}</span>
    </div>
  );
}

export function CuatroBaldosas({
  ficha,
  horasDeLaRetribucion,
  hoy,
}: {
  readonly ficha: LaFichaDelTrabajador;
  /** Si la ficha no dice la jornada, la de lo que cobra (quien la ve), que era donde estaba. */
  readonly horasDeLaRetribucion: number | null;
  readonly hoy: string;
}) {
  const l = ficha.laboral;
  const horas = l?.horasSemanales ?? horasDeLaRetribucion;
  const vacaciones = ficha.vacaciones;
  return (
    <section aria-label="Lo esencial de su ficha" className="grid grid-cols-2 gap-e2">
      <Baldosa
        degradado="horas"
        icono={(t) => <IconoReloj size={t} />}
        etiqueta="Jornada"
        valor={horas === null ? 'Sin poner' : `${diasEnLetra(horas)} h`}
        detalle={horas === null ? 'Las horas de su contrato' : 'a la semana'}
      />
      <Baldosa
        degradado="contrato"
        icono={(t) => <IconoDocumento size={t} />}
        etiqueta="Contrato"
        valor={l?.contrato == null ? 'Sin poner' : TIPOS_DE_CONTRATO[l.contrato]}
        detalle={
          l?.jornada === 'completa'
            ? 'jornada completa'
            : l?.jornada === 'parcial'
              ? 'jornada parcial'
              : 'El tipo de contrato'
        }
      />
      <Baldosa
        degradado="fechas"
        icono={(t) => <IconoCalendario size={t} />}
        etiqueta="Incorporación"
        valor={l?.incorporacion == null ? 'Sin poner' : fechaCorta(l.incorporacion)}
        detalle={l?.incorporacion == null ? 'Cuándo empezó' : cuantoLleva(l.incorporacion, hoy)}
      />
      <Baldosa
        degradado="vacaciones"
        icono={(t) => <IconoPalmera size={t} />}
        etiqueta="Vacaciones"
        valor={vacaciones === null ? 'Sin poner' : `${diasEnLetra(vacaciones.disponibles)} días`}
        detalle={vacaciones === null ? 'Los días al año' : 'disponibles'}
      />
    </section>
  );
}
