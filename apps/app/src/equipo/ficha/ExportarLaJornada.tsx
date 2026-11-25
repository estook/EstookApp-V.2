import { useState } from 'react';
import { Boton, Campo, Hoja } from '@estook/ui';
import { BotonDelDocumento } from '../../documentos/BotonDelDocumento.tsx';

/**
 * Exportar el historial de jornadas de una persona (la Ampliación 3, 0153; lo que el Plan
 * tenía en M15 y se adelanta porque vive en la ficha).
 *
 * **La última semana, el último mes o los días que elijas**, en PDF (el registro de
 * jornada de siempre, con su huella) o en hoja de cálculo. Lo hace el servidor con
 * `registro_de_jornada`, el mismo de Resumen, solo con los fichajes de esa persona.
 */

/** «2026-11-25» de hoy, en la hora de quien mira: solo para proponer las fechas. */
function hoyEnFecha(): string {
  const hoy = new Date(Date.now());
  return `${String(hoy.getFullYear())}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function masDias(fecha: string, dias: number): string {
  const cuando = new Date(`${fecha}T12:00:00Z`);
  cuando.setUTCDate(cuando.getUTCDate() + dias);
  return cuando.toISOString().slice(0, 10);
}

type Periodo = 'semana' | 'mes' | 'elegir';

export function ExportarLaJornada({
  personaId,
  nombre,
  alCerrar,
}: {
  readonly personaId: string;
  readonly nombre: string;
  readonly alCerrar: () => void;
}) {
  const hoy = hoyEnFecha();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [desde, setDesde] = useState(masDias(hoy, -29));
  const [hasta, setHasta] = useState(hoy);

  const elDesde =
    periodo === 'semana' ? masDias(hoy, -6) : periodo === 'mes' ? masDias(hoy, -29) : desde;
  const elHasta = periodo === 'elegir' ? hasta : hoy;
  const vale = elDesde !== '' && elHasta !== '' && elDesde <= elHasta;
  const parametros = { desde: elDesde, hasta: elHasta, persona_id: personaId };

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`Exportar las jornadas de ${nombre}`}>
      <div className="flex flex-col gap-e4">
        <div role="radiogroup" aria-label="Qué días" className="grid grid-cols-3 gap-e2">
          {(
            [
              ['semana', 'La última semana'],
              ['mes', 'El último mes'],
              ['elegir', 'Los días que elijas'],
            ] as const
          ).map(([valor, texto]) => (
            <Boton
              key={valor}
              role="radio"
              aria-checked={periodo === valor}
              tono={periodo === valor ? 'principal' : 'secundario'}
              onClick={() => {
                setPeriodo(valor);
              }}
            >
              {texto}
            </Boton>
          ))}
        </div>
        {periodo === 'elegir' && (
          <div className="grid grid-cols-2 gap-e3">
            <Campo
              etiqueta="Desde"
              tipo="fecha"
              value={desde}
              onChange={(e) => {
                setDesde(e.currentTarget.value);
              }}
            />
            <Campo
              etiqueta="Hasta"
              tipo="fecha"
              value={hasta}
              {...(vale ? {} : { error: 'El periodo empieza antes de acabar.' })}
              onChange={(e) => {
                setHasta(e.currentTarget.value);
              }}
            />
          </div>
        )}
        {vale && (
          <div className="flex flex-wrap gap-e3">
            <BotonDelDocumento
              consulta="registro_de_jornada"
              parametros={{ ...parametros, formato: 'pdf' }}
              texto="En PDF"
              tono="principal"
            />
            <BotonDelDocumento
              consulta="registro_de_jornada"
              parametros={{ ...parametros, formato: 'hoja' }}
              texto="En hoja de cálculo"
            />
          </div>
        )}
        <p className="text-secundario text-texto-suave">
          Con cada entrada y salida, las pausas, las correcciones con su motivo y la huella que dice
          que no se ha tocado. Es el registro de jornada que pide la ley, solo de {nombre}.
        </p>
      </div>
    </Hoja>
  );
}
