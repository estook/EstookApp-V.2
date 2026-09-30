import { Cargando, clases } from '@estook/ui';
import type { TamanoDeWidget } from '@estook/ui';
import { conQuienCoincide, loDelDia } from './cuentas.ts';
import { nombreCorto, type ElHorario } from './contrato.ts';

/**
 * Mi turno, en el Panel (H2 · 0069).
 *
 * Lo que cada uno quiere saber al abrir la app: **qué me toca hoy y con quién**. En
 * ancho, además, **la semana en pequeño**: es «la tarjeta del horario» que el chat
 * enseñará cuando llegue (entrega C), y mientras tanto la del Panel.
 *
 * Lee lo publicado de esta semana (`ganchos/usarElHorario.ts`), que se pone al día
 * solo mientras se mira: si publican o cambian algo, sale sin recargar.
 */
export function MiTurno({
  datos,
  tamano,
}: {
  readonly datos: ElHorario | undefined;
  readonly tamano: TamanoDeWidget;
}) {
  if (datos === undefined) return <Cargando que="tu turno" />;
  if (!datos.publicado) {
    return (
      <p className="text-secundario text-texto-suave">
        Esta semana todavía no hay horario publicado. Cuando lo haya, te llega un aviso con lo tuyo.
      </p>
    );
  }

  const deHoy = datos.turnos.filter((t) => t.personaId === datos.yo && t.dia === datos.hoy);
  const hoy = loDelDia(deHoy);
  const conQuien = conQuienCoincide(datos.personas, datos.turnos, datos.yo, datos.hoy);

  return (
    <div className="flex flex-col gap-e3">
      <div>
        <p className="text-etiqueta text-texto-suave">Hoy</p>
        <p className="text-seccion font-semibold tabular-nums">
          {hoy === '' ? 'No trabajas hoy' : hoy}
        </p>
        {conQuien.length > 0 && (
          <p className="text-secundario text-texto-suave">
            Con {conQuien.map((p) => nombreCorto(p)).join(', ')}
          </p>
        )}
      </div>
      {tamano !== 'chico' && (
        <ul aria-label="Mi semana" className="grid grid-cols-7 gap-e1">
          {datos.dias.map((d) => {
            const delDia = datos.turnos.filter(
              (t) => t.personaId === datos.yo && t.dia === d.fecha,
            );
            const texto = loDelDia(delDia);
            const trabaja = delDia.some((t) => t.tipo === 'trabajo');
            return (
              <li
                key={d.fecha}
                aria-label={`${d.largo}: ${texto === '' ? 'nada' : texto}`}
                className={clases(
                  'flex min-h-[3.5rem] flex-col items-center justify-start gap-[2px] rounded-medio px-[2px] py-e1 text-center',
                  d.fecha === datos.hoy ? 'bg-naranja-suave' : 'bg-fondo',
                )}
              >
                <span className="text-etiqueta text-texto-suave">{d.corto.split(' ')[0]}</span>
                <span
                  className={clases(
                    'text-etiqueta leading-tight tabular-nums',
                    trabaja ? 'font-semibold text-texto' : 'text-texto-tenue',
                  )}
                >
                  {texto === ''
                    ? '—'
                    : trabaja
                      ? (delDia.find((t) => t.tipo === 'trabajo')?.entra ?? '')
                      : // En una casilla de un séptimo de móvil, «Vacaciones» no cabe.
                        texto === 'Vacaciones'
                        ? 'Vac.'
                        : texto}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
