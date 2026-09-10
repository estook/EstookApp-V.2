import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Aviso,
  Cargando,
  Cifra,
  EstadoVacio,
  Etiqueta,
  Selector,
  Tabla,
  Tarjeta,
  type Columna,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDePersona } from './FichaDePersona.tsx';
import { usarPersonaAbierta } from '../ganchos/usarPersonaAbierta.ts';
import {
  comoDinero,
  comoSeLeenMinutos,
  type FilaDelResumen,
  type ResumenDelEquipo as ElResumen,
} from './contrato.ts';

/**
 * Equipo · Resumen (M6½).
 *
 * «Añadir pestaña resumen, para gerentes o managers (todos), o jefe de cocina si
 * son cocineros, o jefe de sala si son camareros. No hay opción de poder ver horas
 * que han hecho, si se han pasado, etc.»
 *
 * ── Quién ve a quién, y dónde se decide ─────────────────────────────────────
 *
 * **No aquí.** Lo decide la base, con `estook.a_quien_lleva`, en la política de
 * los fichajes: un jefe de cocina que abra esta pantalla recibe las horas de la
 * cocina y ninguna de la sala, porque las de la sala no le llegan. Una pantalla que
 * filtrara lo que le llega sería una pantalla que un día se olvida de filtrar.
 *
 * ── Y lo que se ve de cada uno ──────────────────────────────────────────────
 *
 * Las horas, **frente a su contrato**: eso contesta «¿se ha pasado?» sin hacer
 * cuentas. Sin contrato puesto sale una raya y no un cero, porque «no se ha pasado»
 * y «no sé cuánto le toca» son respuestas distintas. Y lo que hay que revisar —un
 * turno sin cerrar, un fichaje lejos del local— sale en la misma fila.
 *
 * Esto es lo que usará Fogón cuando proponga un horario (M14 y M22): quién debe
 * horas y quién va sobrado.
 */
export function ResumenDelEquipo() {
  const { cliente, yo } = usarSesion();
  const persona = usarPersonaAbierta();
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | '30'>('30');

  // El periodo **por su nombre**, y las fechas las pone el servidor con el reloj
  // del local (regla 10): «esta semana» empieza el lunes del local, no el del
  // navegador.
  const consulta = useQuery({
    queryKey: ['resumen_del_equipo', periodo],
    enabled: yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<ElResumen> => {
      const respuesta = await cliente.consultar<ElResumen>('resumen_del_equipo', { periodo });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="las horas del equipo" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer las horas">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;
  const sePasan = datos.filas.filter((f) => (f.frenteAlContrato ?? 0) > 60);
  const porRevisar = datos.filas.filter(
    (f) => f.sinCerrar > 0 || f.fueraDelLocal > 0 || f.sinUbicacion > 0,
  );

  const columnas: Columna<FilaDelResumen>[] = [
    {
      clave: 'nombre',
      titulo: 'Persona',
      principal: true,
      celda: (f) => (
        <span className="flex min-w-0 flex-col">
          <span>{`${f.nombre} ${f.apellidos ?? ''}`.trim()}</span>
          <span className="text-secundario text-texto-tenue">{f.rolNombre}</span>
        </span>
      ),
    },
    {
      clave: 'horas',
      titulo: 'Horas',
      numerica: true,
      celda: (f) => <span className="tabular-nums">{comoSeLeenMinutos(f.minutos)}</span>,
    },
    {
      clave: 'contrato',
      titulo: 'Frente al contrato',
      numerica: true,
      celda: (f) =>
        f.frenteAlContrato === null ? (
          <span className="text-texto-tenue">—</span>
        ) : (
          <Etiqueta tono={tonoFrenteAlContrato(f.frenteAlContrato)}>
            {f.frenteAlContrato > 0 ? '+' : f.frenteAlContrato < 0 ? '−' : ''}
            {comoSeLeenMinutos(Math.abs(f.frenteAlContrato))}
          </Etiqueta>
        ),
    },
    { clave: 'turnos', titulo: 'Turnos', numerica: true, celda: (f) => String(f.turnos) },
    {
      clave: 'revisar',
      titulo: 'A revisar',
      celda: (f) => {
        const cosas = [
          f.sinCerrar > 0 ? `${f.sinCerrar} sin cerrar` : null,
          f.fueraDelLocal > 0 ? `${f.fueraDelLocal} lejos` : null,
          f.sinUbicacion > 0 ? `${f.sinUbicacion} sin ubicación` : null,
        ].filter((cosa): cosa is string => cosa !== null);
        return cosas.length === 0 ? (
          <span className="text-texto-tenue">—</span>
        ) : (
          <span className="text-secundario text-atencion">{cosas.join(' · ')}</span>
        );
      },
    },
    // El dinero **solo existe si el servidor lo ha mandado**. No se esconde.
    ...(datos.puedeVerCostes
      ? [
          {
            clave: 'coste',
            titulo: 'Coste',
            numerica: true,
            celda: (f: FilaDelResumen) => (
              <span className="tabular-nums">{comoDinero(f.costeCentimos)}</span>
            ),
          } satisfies Columna<FilaDelResumen>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-end justify-between gap-e3">
        <div className="min-w-[12rem]">
          <Selector
            etiqueta="Periodo"
            opciones={[
              { valor: 'semana', texto: 'Esta semana' },
              { valor: 'mes', texto: 'Este mes' },
              { valor: '30', texto: 'Últimos 30 días' },
            ]}
            value={periodo}
            onChange={(e) => {
              setPeriodo(e.currentTarget.value as 'semana' | 'mes' | '30');
            }}
          />
        </div>
      </div>

      <div className="grid gap-e3 sm:grid-cols-3">
        <Tarjeta titulo="Horas del equipo" acento="var(--color-app-equipo)">
          <Cifra
            etiqueta="En total"
            valor={datos.minutosTotales}
            formato={(v) => comoSeLeenMinutos(v)}
            origen={`Del ${datos.desde} al ${datos.hasta}`}
          />
        </Tarjeta>
        {datos.puedeVerCostes && (
          <Tarjeta titulo="Lo que cuestan">
            <Cifra
              etiqueta="Coste de personal"
              valor={datos.costeTotalCentimos ?? 0}
              formato={(v) => comoDinero(v)}
              origen="Solo de quien tiene lo que cobra puesto"
            />
          </Tarjeta>
        )}
        <Tarjeta titulo="Para mirar">
          <p className="text-cuerpo">
            {sePasan.length === 0
              ? 'Nadie se pasa de su contrato.'
              : `${sePasan.length} ${sePasan.length === 1 ? 'se pasa' : 'se pasan'} de su contrato.`}
          </p>
          <p className="text-secundario text-texto-suave">
            {porRevisar.length === 0
              ? 'Ningún fichaje raro.'
              : `${porRevisar.length} con fichajes que revisar.`}
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo={`${datos.filas.length} personas`} pegado>
        <Tabla
          titulo="Las horas de cada uno"
          columnas={columnas}
          filas={datos.filas}
          claveDe={(f) => f.personaId}
          alPulsar={(f) => {
            persona.abrir(f.personaId);
          }}
          cuandoNoHay={
            <EstadoVacio
              compacto
              titulo="Nadie ha fichado en este periodo"
              frase="Cuando el equipo fiche desde el Panel, aquí salen sus horas."
              sinAccionPorque="Se ficha desde el Panel, con el widget «Fichar»."
            />
          }
        />
      </Tarjeta>

      <FichaDePersona personaId={persona.abierta} alCerrar={persona.cerrar} />
    </div>
  );
}

/** De más, en su sitio o de menos, con una hora de margen: nadie ficha al minuto. */
function tonoFrenteAlContrato(minutos: number): 'atencion' | 'neutro' | 'bien' {
  if (minutos > 60) return 'atencion';
  if (minutos < -60) return 'neutro';
  return 'bien';
}
