import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { puedeEditar } from '@estook/permisos';
import { Aviso, Avatar, Boton, Cargando, EstadoVacio, Etiqueta, Tarjeta, clases } from '@estook/ui';
import { IconoEntrar, IconoSalir } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDePersona } from './FichaDePersona.tsx';
import { usarFichar } from '../ganchos/usarFichar.ts';
import { usarPersonaAbierta } from '../ganchos/usarPersonaAbierta.ts';
import {
  comoSeLeeDonde,
  comoSeLeeLaHora,
  comoSeLeenMinutos,
  ultimaVez,
  type FichajesDeHoy,
  type QuienEstaTrabajando,
} from './contrato.ts';

/**
 * Equipo · Hoy (M6½).
 *
 * «¿Quién está hoy, quién falta y qué hay que resolver?» Llevaba desde M3 con su
 * cartel de «llega en M13», y lo que hacía falta para contestarla no era el módulo
 * entero de Equipo: eran los fichajes.
 *
 * ── Tres bloques, en el orden en el que se mira ─────────────────────────────
 *
 *   1. **Lo tuyo**, si fichas: estás dentro o no, y el botón.
 *   2. **Quién está dentro**, desde cuándo y desde dónde fichó.
 *   3. **Quién no ha fichado**, con su hora de entrada si tiene horario.
 *
 * Y lo que hay que resolver sale **marcado en la fila**, no en una lista aparte:
 * un turno abierto de más de doce horas o un fichaje lejos del local se ven al
 * lado del nombre, que es donde alguien los va a buscar.
 */
export function EquipoHoy() {
  const { cliente, permisos, yo } = usarSesion();
  const navegar = useNavigate();
  const persona = usarPersonaAbierta();
  const fichar = usarFichar();

  const consulta = useQuery({
    queryKey: ['fichajes_de_hoy'],
    enabled: yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<FichajesDeHoy> => {
      const respuesta = await cliente.consultar<FichajesDeHoy>('fichajes_de_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    staleTime: 60_000,
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="quién está hoy" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer los fichajes">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;
  const dentro = datos.gente.filter((quien) => quien.dentro);
  const fuera = datos.gente.filter((quien) => !quien.dentro);
  const mio = fichar.mio;
  const puedeMarcarElLocal = puedeEditar(permisos, 'app.ajustes');

  return (
    <div className="flex flex-col gap-e4">
      {/* ── 1 · Lo tuyo ─────────────────────────────────────────────────── */}
      {mio !== undefined && mio.puedoFichar && (
        <section className="flex flex-wrap items-center justify-between gap-e3 rounded-grande border border-borde bg-superficie p-e3 shadow-s1">
          <div>
            <p className="text-cuerpo font-semibold">
              {mio.abierto === null
                ? 'No estás fichado'
                : `Dentro desde las ${comoSeLeeLaHora(mio.abierto.entroEn)}`}
            </p>
            <p className="text-secundario text-texto-suave">
              Hoy llevas {comoSeLeenMinutos(mio.minutosDeHoy)} · esta semana{' '}
              {comoSeLeenMinutos(mio.minutosDeLaSemana)}
            </p>
            {fichar.error !== null && (
              <p className="text-secundario text-mal">{fichar.error.quePasa}</p>
            )}
          </div>
          <Boton
            tono={mio.abierto === null ? 'principal' : 'secundario'}
            icono={mio.abierto === null ? <IconoEntrar size={18} /> : <IconoSalir size={18} />}
            cargando={fichar.fichando}
            textoCargando={
              fichar.paso === 'buscando_ubicacion' ? 'Buscando dónde estás' : 'Apuntando'
            }
            onClick={mio.abierto === null ? fichar.entrar : fichar.salir}
          >
            {mio.abierto === null ? 'Fichar la entrada' : 'Fichar la salida'}
          </Boton>
        </section>
      )}

      {mio !== undefined && !mio.elLocalSabeDondeEsta && puedeMarcarElLocal && (
        <Aviso
          tono="info"
          titulo="Marca dónde está el local"
          accion={
            <Boton
              tono="secundario"
              onClick={() => {
                navegar('/ajustes#donde-esta-el-local');
              }}
            >
              Ir a Ajustes
            </Boton>
          }
        >
          Así cada fichaje dice si se hizo en el local o lejos.
        </Aviso>
      )}

      {datos.gente.length === 0 ? (
        <Tarjeta titulo="Todavía no hay equipo">
          <EstadoVacio
            compacto
            titulo="Llevas el local solo"
            frase="Cuando des acceso a alguien, aquí verás si ha fichado y desde cuándo."
            sinAccionPorque="Se invita desde Personas."
          />
        </Tarjeta>
      ) : (
        <div className="grid gap-e3 lg:grid-cols-2">
          {/* ── 2 · Quién está dentro ─────────────────────────────────── */}
          <Tarjeta
            titulo={dentro.length === 1 ? '1 persona dentro' : `${dentro.length} personas dentro`}
            origen={`Son las ${datos.horaDelLocal} en el local`}
            acento="var(--color-app-equipo)"
            pegado
          >
            {dentro.length === 0 ? (
              <p className="p-e3 text-secundario text-texto-suave">Nadie ha fichado todavía.</p>
            ) : (
              <ul>
                {dentro.map((quien) => (
                  <Fila
                    key={quien.personaId}
                    quien={quien}
                    alAbrir={() => {
                      persona.abrir(quien.personaId);
                    }}
                  />
                ))}
              </ul>
            )}
          </Tarjeta>

          {/* ── 3 · Quién no ha fichado ────────────────────────────────── */}
          <Tarjeta
            titulo={fuera.length === 1 ? '1 sin fichar' : `${fuera.length} sin fichar`}
            origen="Con su hora de entrada, si tienen horario"
            pegado
          >
            {fuera.length === 0 ? (
              <p className="p-e3 text-secundario text-texto-suave">Han fichado todos.</p>
            ) : (
              <ul>
                {fuera.map((quien) => (
                  <Fila
                    key={quien.personaId}
                    quien={quien}
                    alAbrir={() => {
                      persona.abrir(quien.personaId);
                    }}
                  />
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      )}

      <FichaDePersona personaId={persona.abierta} alCerrar={persona.cerrar} />
    </div>
  );
}

/** Una persona, con lo que hay que saber de ella hoy. Se pulsa y abre su ficha. */
function Fila({
  quien,
  alAbrir,
}: {
  readonly quien: QuienEstaTrabajando;
  readonly alAbrir: () => void;
}) {
  const nombre = `${quien.nombre} ${quien.apellidos ?? ''}`.trim();
  const lejos = quien.dentro && quien.enElLocal === false;

  return (
    <li className="border-b border-borde last:border-b-0">
      <button
        type="button"
        onClick={alAbrir}
        className="flex w-full min-h-toque items-center gap-e3 px-e3 py-e2 text-left hover:bg-fondo"
      >
        <Avatar nombre={nombre} tamano={32} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-e2">
            <span className="truncate text-cuerpo font-medium">{nombre}</span>
            {quien.enLinea && <Etiqueta tono="bien">en línea</Etiqueta>}
            {quien.turnoSospechoso && <Etiqueta tono="atencion">revisar</Etiqueta>}
          </span>
          <span
            className={clases(
              'block text-secundario',
              lejos ? 'text-atencion' : 'text-texto-suave',
            )}
          >
            {quien.dentro
              ? `Desde las ${comoSeLeeLaHora(quien.desde ?? '')} · ${comoSeLeeDonde(quien.metros, quien.enElLocal, null)}`
              : quien.entraHoyALas !== null
                ? `Entra a las ${quien.entraHoyALas}`
                : `${quien.rolNombre} · ${quien.enLinea ? 'en línea' : ultimaVez(quien.ultimoAccesoEn)}`}
          </span>
        </span>
        {quien.dentro && (
          <span className="shrink-0 text-cuerpo font-medium tabular-nums">
            {comoSeLeenMinutos(quien.minutos ?? 0)}
          </span>
        )}
      </button>
    </li>
  );
}
