import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  Cargando,
  EstadoVacio,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  fondoDegradado,
} from '@estook/ui';
import { IconoAtencion, IconoPalmera } from '@estook/iconos';
import { delAl, diasEnLetra } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { COMO_SE_LLAMA_LA_ZONA } from '../horario/contrato.ts';
import { estiloDeLaZona } from '../horario/zonas.ts';
import { PedirVacaciones } from './PedirVacaciones.tsx';
import type { LasVacacionesDelEquipo, UnaPeticionDelEquipo } from './contrato.ts';

/**
 * Calendario › Propuestas (la Ampliación 4 · 2, 0153; maqueta, «Propuestas: ver quién falta antes de
 * decir que sí»). Para quien gestiona las vacaciones de su gente.
 *
 * Cada petición con **lo que importa para decidir**: cuántos días y cuántos le quedarían, **con quién
 * de su zona coincide**, **cuántos quedarían trabajando el peor día** (verde o naranja) y si empiezan
 * con menos de dos meses de margen (la ley lo pide; avisa, no impide). Y tres botones: **Aprobar,
 * Otras fechas, Rechazar** (con motivo). Debajo, las aprobadas que vienen; arriba, «Poner vacaciones».
 */
export function Propuestas() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const lo = usarLectura<LasVacacionesDelEquipo>('las_vacaciones_del_equipo');
  const [proponiendo, setProponiendo] = useState<UnaPeticionDelEquipo | null>(null);
  const [rechazando, setRechazando] = useState<UnaPeticionDelEquipo | null>(null);
  const [poniendo, setPoniendo] = useState(false);
  const [haciendo, setHaciendo] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [noticia, setNoticia] = useState<string | null>(null);

  async function refrescar(frase: string) {
    setNoticia(frase);
    await cache.invalidateQueries({ queryKey: ['las_vacaciones_del_equipo'] });
    await cache.invalidateQueries({ queryKey: ['el_horario_en_borrador'] });
    await cache.invalidateQueries({ queryKey: ['el_horario'] });
  }

  async function responder(
    p: UnaPeticionDelEquipo,
    entrada: Record<string, unknown>,
    frase: string,
  ): Promise<ErrorDeLaApi | null> {
    setHaciendo(p.id);
    setError(null);
    const respuesta = await cliente.ejecutar('responder_vacaciones', {
      solicitud_id: p.id,
      ...entrada,
    });
    setHaciendo(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return respuesta.error;
    }
    await refrescar(frase);
    return null;
  }

  if (lo.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer las vacaciones del equipo">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }
  const datos = lo.data;
  if (datos === undefined)
    return <Cargando que="las vacaciones del equipo" forma="lista" lineas={4} />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-e4">
      <div className="flex flex-wrap items-center justify-between gap-e3">
        <p className="text-secundario text-texto-suave">
          Lo que te pide tu gente. Las coincidencias avisan; decides tú.
        </p>
        {datos.equipo.length > 0 && (
          <Boton
            icono={<IconoPalmera size={16} />}
            onClick={() => {
              setPoniendo(true);
            }}
          >
            Poner vacaciones a alguien
          </Boton>
        )}
      </div>

      {error !== null && <ErrorEnCristiano error={error} />}
      {noticia !== null && (
        <Aviso
          tono="bien"
          titulo={noticia}
          esNoticia
          alCerrar={() => {
            setNoticia(null);
          }}
        >
          A la persona le llega su aviso.
        </Aviso>
      )}

      {datos.pendientes.length === 0 ? (
        <EstadoVacio
          compacto
          dibujo="todo-en-orden"
          acento="var(--color-app-calendario)"
          titulo="Nada que contestar"
          frase="Cuando alguien de tu equipo pida vacaciones, sale aquí y te llega un aviso."
          sinAccionPorque="Las vacaciones las pide cada uno desde Personal."
        />
      ) : (
        datos.pendientes.map((p) => (
          <article
            key={p.id}
            aria-label={`${p.nombre}, ${delAl(p.desde, p.hasta)}`}
            className="flex flex-col gap-e3 rounded-[20px] border border-borde bg-superficie p-e4 [box-shadow:var(--sombra-tarjeta)]"
          >
            <header className="flex flex-wrap items-center gap-e3">
              <span
                aria-hidden
                className="grid size-10 place-items-center rounded-full text-[0.74rem] font-extrabold"
                style={estiloDeLaZona(p.zona)}
              >
                {`${p.nombre.charAt(0)}${p.apellidos?.charAt(0) ?? ''}`.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-cuerpo">
                  {p.nombre} · {delAl(p.desde, p.hasta)}
                </strong>
                <span className="text-secundario text-texto-suave">
                  {p.rolNombre} · {diasEnLetra(p.dias)} {p.dias === 1 ? 'día' : 'días'}
                  {p.leQuedarian === null ? '' : ` · le quedarían ${diasEnLetra(p.leQuedarian)}`}
                </span>
              </span>
            </header>
            {p.nota !== null && (
              <p className="rounded-medio bg-fondo p-e3 text-secundario">«{p.nota}»</p>
            )}

            <div className="flex flex-wrap gap-e2">
              {p.quedan !== null && (
                <Etiqueta tono={p.quedan.quedan >= 2 ? 'bien' : 'atencion'}>
                  {COMO_SE_LLAMA_LA_ZONA[p.zona]}: quedarían {p.quedan.quedan} de {p.quedan.de} el
                  peor día
                </Etiqueta>
              )}
              {p.coincidencias.map((c) => (
                <Etiqueta
                  key={`${c.nombre}${c.desde}`}
                  tono="atencion"
                  icono={<IconoAtencion size={12} />}
                >
                  Coincide con {c.nombre} ({c.estado === 'aprobada' ? 'aprobadas' : 'pedidas'},{' '}
                  {delAl(c.desde, c.hasta)})
                </Etiqueta>
              ))}
              {p.conPocoMargen && <Etiqueta tono="info">Empiezan en menos de dos meses</Etiqueta>}
            </div>

            <div className="flex flex-wrap gap-e2">
              <button
                type="button"
                disabled={haciendo !== null}
                className="inline-flex min-h-toque items-center rounded-[12px] px-e4 font-extrabold text-white disabled:opacity-50"
                style={{
                  ...fondoDegradado('contrato'),
                  boxShadow: '0 10px 20px -12px rgba(15, 125, 81, 0.55)',
                }}
                onClick={() => {
                  void responder(
                    p,
                    { respuesta: 'aprobar' },
                    `Vacaciones de ${p.nombre} aprobadas: ya salen en Turnos`,
                  );
                }}
              >
                {haciendo === p.id ? 'Guardando…' : 'Aprobar'}
              </button>
              <Boton
                onClick={() => {
                  setProponiendo(p);
                }}
              >
                Otras fechas
              </Boton>
              <Boton
                tono="texto"
                onClick={() => {
                  setRechazando(p);
                }}
              >
                Rechazar
              </Boton>
            </div>
          </article>
        ))
      )}

      {datos.proximas.length > 0 && (
        <section className="flex flex-col gap-e2">
          <h2 className="text-seccion font-semibold">Las que vienen, aprobadas</h2>
          {datos.proximas.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-e3 rounded-mayor border border-borde bg-superficie p-e3"
            >
              <span
                aria-hidden
                className="block size-3 rounded-full"
                style={estiloDeLaZona(v.zona)}
              />
              <span className="min-w-0 flex-1">
                <strong>{v.nombre}</strong>{' '}
                <span className="text-texto-suave">
                  {delAl(v.desde, v.hasta)} · {diasEnLetra(v.dias)} {v.dias === 1 ? 'día' : 'días'}
                </span>
              </span>
            </div>
          ))}
        </section>
      )}

      {proponiendo !== null && (
        <PedirVacaciones
          hoy={datos.hoy}
          vacacionesEn="naturales"
          sePuedenPedir={null}
          titulo={`Otras fechas para ${proponiendo.nombre}`}
          boton="Proponérselas"
          conMotivo
          conNota={false}
          desdeDeEntrada={proponiendo.desde}
          hastaDeEntrada={proponiendo.hasta}
          alCerrar={() => {
            setProponiendo(null);
          }}
          alEnviar={async ({ desde, hasta, texto }) => {
            const p = proponiendo;
            const fallo = await responder(
              p,
              { respuesta: 'proponer', desde, hasta, ...(texto === null ? {} : { motivo: texto }) },
              `Le has propuesto a ${p.nombre} ${delAl(desde, hasta)}`,
            );
            if (fallo === null) setProponiendo(null);
            return fallo;
          }}
        />
      )}

      {rechazando !== null && (
        <Rechazar
          peticion={rechazando}
          alCerrar={() => {
            setRechazando(null);
          }}
          alRechazar={async (motivo) => {
            const p = rechazando;
            const fallo = await responder(
              p,
              { respuesta: 'rechazar', motivo },
              `Vacaciones de ${p.nombre} rechazadas`,
            );
            if (fallo === null) setRechazando(null);
            return fallo;
          }}
        />
      )}

      {poniendo && (
        <PedirVacaciones
          hoy={datos.hoy}
          vacacionesEn="naturales"
          sePuedenPedir={null}
          titulo="Poner vacaciones"
          boton="Ponérselas"
          conNota={false}
          personas={datos.equipo.map((e) => ({
            personaId: e.personaId,
            nombre: `${e.nombre} ${e.apellidos ?? ''}`.trim(),
          }))}
          alCerrar={() => {
            setPoniendo(false);
          }}
          alEnviar={async ({ desde, hasta, personaId }) => {
            const respuesta = await cliente.ejecutar('pedir_vacaciones', {
              desde,
              hasta,
              ...(personaId === null ? {} : { persona_id: personaId }),
            });
            if (!respuesta.ok) return respuesta.error;
            setPoniendo(false);
            await refrescar(`Vacaciones puestas ${delAl(desde, hasta)}`);
            return null;
          }}
        />
      )}
    </div>
  );
}

function Rechazar({
  peticion,
  alCerrar,
  alRechazar,
}: {
  readonly peticion: UnaPeticionDelEquipo;
  readonly alCerrar: () => void;
  readonly alRechazar: (motivo: string) => Promise<ErrorDeLaApi | null>;
}) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Rechazar las vacaciones de ${peticion.nombre}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={motivo.trim().length < 3 || enviando}
            cargando={enviando}
            textoCargando="Rechazando"
            onClick={() => {
              setEnviando(true);
              void alRechazar(motivo.trim()).then(() => {
                setEnviando(false);
              });
            }}
          >
            Rechazarlas
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          {delAl(peticion.desde, peticion.hasta)}. Si puedes, mejor «Otras fechas»: así no se queda
          sin vacaciones.
        </p>
        <Campo
          etiqueta="Por qué"
          obligatorio
          ayuda="Lo lee quien las pidió."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
