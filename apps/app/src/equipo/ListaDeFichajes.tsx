import { useInfiniteQuery } from '@tanstack/react-query';
import { Aviso, Boton, Cargando, ErrorEnCristiano, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  comoSeLeeDonde,
  comoSeLeeLaHora,
  comoSeLeenMinutos,
  type CorreccionDeUnFichaje,
  type FichajeDeLaFicha,
  type FichajesDeUnaPersona,
} from './contrato.ts';

/**
 * Los fichajes de una persona, en lista (M6½; partido de la ficha con H1 · 0068).
 *
 * Lo usan la ficha de una persona, su «Ver todos» y **Mis fichajes**, que es donde
 * cada uno ve lo suyo aunque no tenga la app Equipo. Va aparte porque la ficha pasaba
 * de novecientas líneas y esto es otra cosa: la lista (0063, la regla del tamaño).
 *
 * ── Lo que dice cada fichaje desde H1 ───────────────────────────────────────
 *
 *   · **Sus pausas**, si las hubo, y cuánto.
 *   · **Dónde se fichó**: a cuántos metros, sin ubicación y por qué, o en el aparato
 *     del local.
 *   · **Cada corrección, con lo de antes** (0062): el fichaje de antes no se borra,
 *     y se ve quién lo cambió, cuándo y por qué. También el propio trabajador.
 */
export function ListaDeFichajes({
  fichajes,
  puedeCorregir,
  alCorregir,
}: {
  readonly fichajes: readonly FichajeDeLaFicha[];
  readonly puedeCorregir: boolean;
  readonly alCorregir?: (fichaje: FichajeDeLaFicha) => void;
}) {
  return (
    <ul className="flex flex-col">
      {fichajes.map((fichaje) => {
        const pausas = minutosDePausa(fichaje);
        const correcciones = fichaje.correcciones ?? [];
        return (
          <li
            key={fichaje.fichajeId}
            className="flex flex-wrap items-center justify-between gap-e2 border-b border-borde py-e2 last:border-0"
          >
            <span className="min-w-0">
              <span className="block text-cuerpo">
                {fichaje.fecha} · {comoSeLeeLaHora(fichaje.entroEn)}–
                {fichaje.salioEn === null ? 'sin salir' : comoSeLeeLaHora(fichaje.salioEn)}
                {fichaje.minutos === null ? '' : ` · ${comoSeLeenMinutos(fichaje.minutos)}`}
              </span>
              <span
                className={clases(
                  'block text-secundario',
                  fichaje.enElLocal === false ||
                    (fichaje.sinUbicacion !== null && fichaje.sinUbicacion !== 'aparato_del_local')
                    ? 'text-atencion'
                    : 'text-texto-suave',
                )}
              >
                {comoSeLeeDonde(
                  fichaje.metros,
                  fichaje.enElLocal,
                  fichaje.sinUbicacion,
                  fichaje.aparato ?? null,
                )}
                {pausas === null ? '' : ` · pausa de ${comoSeLeenMinutos(pausas)}`}
                {/* Sin señal (0070): la hora la contó Estook al volver la conexión. */}
                {fichaje.sinConexion?.entrada === true || fichaje.sinConexion?.salida === true
                  ? ' · sin conexión'
                  : ''}
              </span>
              {fichaje.porRevisar === true && (
                <span className="block text-secundario font-medium text-atencion">
                  Por revisar: más de doce horas sin señal
                </span>
              )}
              {fichaje.aMano !== null && fichaje.aMano !== undefined && (
                <span className="block text-secundario text-texto-suave">
                  Apuntado a mano por {fichaje.aMano.quien ?? 'alguien'}: «{fichaje.aMano.motivo}»
                </span>
              )}
              {correcciones.length > 0 ? (
                correcciones.map((c) => <LaCorreccion key={c.numero} correccion={c} />)
              ) : fichaje.corregidoPor === null ? null : (
                // De antes de la 0052: se corrigió sin guardar lo de antes aparte.
                <span className="block text-secundario text-texto-suave">
                  Corregido por {fichaje.corregidoPor}: «{fichaje.motivoDeLaCorreccion ?? ''}»
                </span>
              )}
            </span>
            {puedeCorregir && alCorregir !== undefined && (
              <Boton
                tono="texto"
                onClick={() => {
                  alCorregir(fichaje);
                }}
              >
                Corregir
              </Boton>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** «Corregido por Carla el 26 sep: «Se fue sin fichar». Antes: 20:00–sin salir.» */
function LaCorreccion({ correccion: c }: { readonly correccion: CorreccionDeUnFichaje }) {
  const cuando = new Date(c.cuando).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const antes = `${comoSeLeeLaHora(c.entroAntes)}–${c.salioAntes === null ? 'sin salir' : comoSeLeeLaHora(c.salioAntes)}`;
  return (
    <span className="block text-secundario text-texto-suave">
      Corregido por {c.quien ?? 'alguien'} el {cuando}: «{c.motivo}». Antes: {antes}.
    </span>
  );
}

/** Lo que duraron sus pausas, en minutos. Nulo si no hubo ninguna. */
function minutosDePausa(fichaje: FichajeDeLaFicha): number | null {
  const pausas = fichaje.pausas ?? [];
  if (pausas.length === 0) return null;
  let total = 0;
  for (const p of pausas) {
    // Una pausa abierta cuenta hasta ahora: solo se pinta, no se decide nada con ella.
    const fin = p.acaboEn === null ? Date.now() : new Date(p.acaboEn).getTime();
    total += Math.max(0, Math.floor((fin - new Date(p.empezoEn).getTime()) / 60_000));
  }
  return total;
}

/** Cuántos fichajes trae cada vez el historial. */
const FICHAJES_POR_PAGINA = 50;

/**
 * Todos los fichajes de una persona, del último hacia atrás (23-sep-2026).
 *
 * La ficha enseña los tres últimos; esto es su «Ver todos», y también **Mis
 * fichajes**. Va por páginas de cincuenta y agrupado por meses, que es como se busca
 * un fichaje: «el del martes de la semana pasada», «los de agosto».
 */
export function HistorialDeFichajes({
  personaId,
  puedeCorregir,
  alCorregir,
  alVolver,
  error,
  noticia,
  alCerrarLaNoticia,
}: {
  readonly personaId: string;
  readonly puedeCorregir: boolean;
  readonly alCorregir?: (fichaje: FichajeDeLaFicha) => void;
  readonly alVolver?: () => void;
  readonly error?: ErrorDeLaApi | null;
  readonly noticia?: string | null;
  readonly alCerrarLaNoticia?: () => void;
}) {
  const { cliente } = usarSesion();
  const historial = useInfiniteQuery({
    queryKey: ['fichajes_de_una_persona', personaId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<FichajesDeUnaPersona> => {
      const respuesta = await cliente.consultar<FichajesDeUnaPersona>('fichajes_de_una_persona', {
        persona_id: personaId,
        limite: String(FICHAJES_POR_PAGINA),
        salto: String(pageParam),
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    getNextPageParam: (ultima, paginas) =>
      ultima.hayMas
        ? paginas.reduce((suma, pagina) => suma + pagina.fichajes.length, 0)
        : undefined,
  });

  const paginas = historial.data?.pages ?? [];
  const fichajes = paginas.flatMap((pagina) => pagina.fichajes);
  const cuantos = paginas[0]?.cuantos ?? 0;
  const porMeses = agruparPorMeses(fichajes);

  return (
    <div className="flex flex-col gap-e4">
      {alVolver !== undefined && (
        <div>
          <Boton tono="texto" onClick={alVolver}>
            ‹ Volver a la ficha
          </Boton>
        </div>
      )}

      {error !== null && error !== undefined && <ErrorEnCristiano error={error} />}
      {noticia !== null && noticia !== undefined && (
        <Aviso
          tono="bien"
          titulo={noticia}
          esNoticia
          {...(alCerrarLaNoticia ? { alCerrar: alCerrarLaNoticia } : {})}
        >
          Queda guardado con tu nombre.
        </Aviso>
      )}

      {historial.isPending && <Cargando que="los fichajes" />}

      {historial.isError && (
        <Aviso tono="mal" titulo="No he podido leer los fichajes">
          <Boton
            tono="texto"
            onClick={() => {
              void historial.refetch();
            }}
          >
            Volver a intentarlo
          </Boton>
        </Aviso>
      )}

      {historial.isSuccess && (
        <>
          <p className="text-secundario text-texto-suave">
            {cuantos === 0
              ? 'Todavía no hay ningún fichaje.'
              : `${cuantos === 1 ? 'Un fichaje' : `${cuantos.toLocaleString('es-ES')} fichajes`}, del último hacia atrás.`}
          </p>

          {porMeses.map(({ mes, deEseMes }) => (
            <section key={mes} className="flex flex-col gap-e1">
              <h3 className="text-etiqueta font-semibold uppercase tracking-wide text-texto-suave">
                {mes}
              </h3>
              <ListaDeFichajes
                fichajes={deEseMes}
                puedeCorregir={puedeCorregir}
                {...(alCorregir ? { alCorregir } : {})}
              />
            </section>
          ))}

          {historial.hasNextPage && (
            <div>
              <Boton
                tono="texto"
                cargando={historial.isFetchingNextPage}
                textoCargando="Cargando"
                onClick={() => {
                  void historial.fetchNextPage();
                }}
              >
                Ver más fichajes
              </Boton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** «septiembre de 2026» → sus fichajes, en el orden en que llegan. */
function agruparPorMeses(
  fichajes: readonly FichajeDeLaFicha[],
): { mes: string; deEseMes: FichajeDeLaFicha[] }[] {
  const grupos: { mes: string; deEseMes: FichajeDeLaFicha[] }[] = [];
  for (const fichaje of fichajes) {
    // La fecha operativa es un día, sin hora: se lee a mediodía para que ningún
    // huso la pase al mes de al lado.
    const mes = new Date(`${fichaje.fecha}T12:00:00`).toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    const ultimo = grupos.at(-1);
    if (ultimo?.mes === mes) ultimo.deEseMes.push(fichaje);
    else grupos.push({ mes, deEseMes: [fichaje] });
  }
  return grupos;
}
