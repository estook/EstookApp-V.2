import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Aviso,
  Boton,
  Cargando,
  Cifra,
  EstadoVacio,
  Etiqueta,
  Selector,
  Tabla,
  Tarjeta,
  clases,
  type Columna,
} from '@estook/ui';
import { IconoFlechaDerecha } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDePersona } from './FichaDePersona.tsx';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
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
  const navegar = useNavigate();
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
  const llegaronTarde = datos.filas.reduce((total, f) => total + (f.retrasos ?? 0), 0);
  // Sin nadie con horario, «ningún retraso» sería decir que todos llegan a su hora.
  const conHorario = datos.filas.some((f) => (f.retrasos ?? null) !== null);
  // Los fichajes que revisar, contados uno a uno (no las personas): es lo que sale en
  // Incidencias → Fichajes, y las dos cifras tienen que coincidir (repaso del 9-oct).
  const fichajesRaros = datos.filas.reduce(
    (total, f) => total + f.sinCerrar + f.fueraDelLocal + f.sinUbicacion,
    0,
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
      // Frente al horario publicado, con el margen del local (0040, 0081). Una raya
      // sin horario publicado: sin hora de entrada no se llega ni tarde ni a tiempo.
      clave: 'retrasos',
      titulo: 'Retrasos',
      numerica: true,
      celda: (f) =>
        (f.retrasos ?? null) === null ? (
          <span className="text-texto-tenue">—</span>
        ) : f.retrasos === 0 ? (
          <span className="tabular-nums">0</span>
        ) : (
          <Etiqueta tono="atencion">{String(f.retrasos)}</Etiqueta>
        ),
    },
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
            origen={`Del ${fechaCorta(datos.desde)} al ${fechaCorta(datos.hasta)}`}
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
        {/*
          «Para mirar» · cada línea lleva a lo suyo (repaso del 9-oct, 2b): «aparecen 4
          fichajes que revisar y 8 retrasos, pero no se puede acceder a esa info».
          Ahora los fichajes y los retrasos abren Incidencias, filtrada; y quien se
          pasa de su contrato está en la tabla de abajo, ordenada por horas.
        */}
        <Tarjeta titulo="Para mirar" pegado>
          <ul className="flex flex-col divide-y divide-borde">
            <LineaParaMirar
              hay={sePasan.length > 0}
              texto={
                sePasan.length === 0
                  ? 'Nadie se pasa de su contrato'
                  : `${sePasan.length} ${sePasan.length === 1 ? 'se pasa' : 'se pasan'} de su contrato`
              }
              {...(sePasan.length === 1 && sePasan[0] !== undefined
                ? {
                    alPulsar: () => {
                      persona.abrir(sePasan[0]?.personaId ?? '');
                    },
                  }
                : {})}
            />
            <LineaParaMirar
              hay={fichajesRaros > 0}
              texto={
                fichajesRaros === 0
                  ? 'Ningún fichaje raro'
                  : `${fichajesRaros} ${fichajesRaros === 1 ? 'fichaje que revisar' : 'fichajes que revisar'}`
              }
              {...(fichajesRaros > 0
                ? {
                    alPulsar: () => {
                      navegar('/equipo/incidencias/fichajes');
                    },
                  }
                : {})}
            />
            {/* Sin margen en la respuesta es la API de antes: no se dice nada. */}
            {datos.margenDeRetraso !== undefined && (
              <LineaParaMirar
                hay={conHorario && llegaronTarde > 0}
                texto={
                  !conHorario
                    ? 'Sin horario publicado: no hay retrasos que contar'
                    : llegaronTarde === 0
                      ? `Ningún retraso de más de ${datos.margenDeRetraso} min`
                      : `${llegaronTarde} ${llegaronTarde === 1 ? 'retraso' : 'retrasos'} de más de ${datos.margenDeRetraso} min`
                }
                {...(conHorario && llegaronTarde > 0
                  ? {
                      alPulsar: () => {
                        navegar('/equipo/incidencias/retrasos');
                      },
                    }
                  : {})}
              />
            )}
          </ul>
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
              dibujo="reloj"
              acento="var(--color-app-equipo)"
              titulo="Nadie ha fichado en este periodo"
              frase="Cuando el equipo fiche, aquí salen sus horas frente a su contrato."
              accion={
                // Si se mira poco tiempo, lo que resuelve es mirar más; si ya son
                // treinta días, lo que falta es fichar, y se ficha en el Resumen.
                periodo === '30' ? (
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      navegar('/equipo/resumen');
                    }}
                  >
                    Ir a fichar
                  </Boton>
                ) : (
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      setPeriodo('30');
                    }}
                  >
                    Mirar los últimos 30 días
                  </Boton>
                )
              }
            />
          }
        />
      </Tarjeta>

      <RegistroParaLaInspeccion />

      <FichaDePersona personaId={persona.abierta} alCerrar={persona.cerrar} />
    </div>
  );
}

/** «2026-09»: el mes, para elegirlo. Los tres últimos, que es lo que se pide. */
function losUltimosMeses(): { valor: string; texto: string; desde: string; hasta: string }[] {
  // Solo para ofrecer los meses: qué días entran lo cuenta el servidor.
  const hoy = new Date(Date.now());
  return [0, 1, 2].map((atras) => {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() - atras + 1, 0);
    const dia = (d: Date) =>
      `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const nombre = primero.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return {
      valor: dia(primero),
      texto: nombre.charAt(0).toUpperCase() + nombre.slice(1),
      desde: dia(primero),
      hasta: dia(ultimo),
    };
  });
}

/**
 * El registro de jornada para la Inspección (0062, 0068): del mes que se elija, en
 * PDF y en hoja de cálculo, con la huella de la hoja en el PDF. Cada fichaje, sus
 * pausas, desde dónde se hizo y cada corrección con lo de antes.
 */
function RegistroParaLaInspeccion() {
  const meses = losUltimosMeses();
  const [mes, setMes] = useState(meses[0]?.valor ?? '');
  const elegido = meses.find((m) => m.valor === mes) ?? meses[0];
  if (elegido === undefined) return null;
  const parametros = { desde: elegido.desde, hasta: elegido.hasta };

  return (
    <Tarjeta titulo="Registro de jornada para la Inspección">
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Cada fichaje del mes, con sus pausas, desde dónde se hizo y lo corregido con lo de antes.
          La ley pide guardarlo cuatro años y enseñarlo si lo piden la Inspección, el trabajador o
          sus representantes.
        </p>
        <div className="max-w-[16rem]">
          <Selector
            etiqueta="Mes"
            opciones={meses.map((m) => ({ valor: m.valor, texto: m.texto }))}
            value={mes}
            onChange={(e) => {
              setMes(e.currentTarget.value);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-e3">
          <BotonDelDocumento
            consulta={'registro_de_jornada'}
            parametros={{ ...parametros, formato: 'pdf' }}
            texto="En PDF"
          />
          <BotonDelDocumento
            consulta={'registro_de_jornada'}
            parametros={{ ...parametros, formato: 'hoja' }}
            texto="En hoja de cálculo"
          />
        </div>
      </div>
    </Tarjeta>
  );
}

/**
 * Una línea de «Para mirar»: con algo que mirar, un botón que lleva a ello, con su
 * flecha; sin nada, texto apagado. Un botón que no lleva a ningún sitio no se pinta.
 */
function LineaParaMirar({
  hay,
  texto,
  alPulsar,
}: {
  readonly hay: boolean;
  readonly texto: string;
  readonly alPulsar?: () => void;
}) {
  if (alPulsar === undefined) {
    return (
      <li
        className={clases(
          'flex min-h-toque items-center px-e4 py-e2 text-secundario',
          hay ? 'font-medium text-atencion' : 'text-texto-suave',
        )}
      >
        {texto}
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={alPulsar}
        className="flex min-h-toque w-full items-center justify-between gap-e2 px-e4 py-e2 text-left text-secundario font-medium text-atencion hover:bg-fondo"
      >
        {texto}
        <IconoFlechaDerecha size={16} aria-hidden />
      </button>
    </li>
  );
}

/** De más, en su sitio o de menos, con una hora de margen: nadie ficha al minuto. */
function tonoFrenteAlContrato(minutos: number): 'atencion' | 'neutro' | 'bien' {
  if (minutos > 60) return 'atencion';
  if (minutos < -60) return 'neutro';
  return 'bien';
}

/** «10 sept»: la fecha del periodo, para leerla (auditoría del 9-oct; antes, «2026-09-10»). */
function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}
