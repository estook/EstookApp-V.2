import { useNavigate } from 'react-router-dom';
import type { CifraDelSemaforo, Semaforo as ColorDelSemaforo } from '@estook/dominio';
import { Boton, Etiqueta, clases } from '@estook/ui';

/**
 * Una cifra del semáforo de objetivos (entrega O, mejora 17 · 0047).
 *
 * Lo esencial a la vista —qué es, cuánto y cómo va— y **el porqué plegado**: quien
 * mira el Panel por la mañana quiere saber si algo está en rojo, no leer cinco
 * frases. Lo abre con un toque y ahí está de dónde sale la cifra y qué la mueve.
 *
 * **Nunca el color solo** (B8): la etiqueta dice con palabras cómo va, además del
 * punto de color.
 */

const COMO_VA: Readonly<
  Record<
    ColorDelSemaforo,
    { readonly texto: string; readonly tono: 'bien' | 'atencion' | 'mal' | 'neutro' }
  >
> = {
  verde: { texto: 'En objetivo', tono: 'bien' },
  ambar: { texto: 'Cerca del límite', tono: 'atencion' },
  rojo: { texto: 'Fuera', tono: 'mal' },
  sin_dato: { texto: 'Sin datos', tono: 'neutro' },
};

export function FilaDelSemaforo({ cifra }: { readonly cifra: CifraDelSemaforo }) {
  const navegar = useNavigate();
  const como = COMO_VA[cifra.semaforo];

  return (
    <details className="group rounded-medio [&_summary::-webkit-details-marker]:hidden">
      <summary
        className={clases(
          'flex min-h-toque cursor-pointer list-none items-center gap-e3 rounded-medio px-e1 py-e2',
          'hover:bg-fondo focus-visible:outline-2 focus-visible:outline-naranja',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{cifra.nombre}</span>
          <span className="mt-e1 block">
            <Etiqueta tono={como.tono}>{como.texto}</Etiqueta>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-titulo font-semibold tabular-nums">{cifra.valorEnTexto}</span>
          {cifra.objetivoEnTexto !== null && (
            <span className="block text-etiqueta text-texto-suave">{cifra.objetivoEnTexto}</span>
          )}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-texto-suave transition-transform duration-rapido group-open:rotate-90"
        >
          ›
        </span>
      </summary>

      <div className="flex flex-col gap-e2 px-e1 pb-e3 pt-e1">
        {cifra.porque.map((frase) => (
          <p key={frase} className="text-secundario text-texto-suave">
            {frase}
          </p>
        ))}
        {cifra.queHacer !== null && (
          <div>
            <Boton
              tono="secundario"
              onClick={() => {
                if (cifra.queHacer !== null) navegar(cifra.queHacer.ir);
              }}
            >
              {cifra.queHacer.texto}
            </Boton>
          </div>
        )}
      </div>
    </details>
  );
}

/** El orden de lo que se mira: primero lo que se sale. */
const PESO: Readonly<Record<ColorDelSemaforo, number>> = {
  rojo: 0,
  ambar: 1,
  verde: 2,
  sin_dato: 3,
};

/**
 * Las cifras del semáforo, con **las que no tienen datos juntas en una línea**.
 *
 * Cinco filas de «Sin datos» con una raya cada una es mucho texto para no decir
 * nada, que es lo primero que ve quien acaba de empezar. Así, las que existen van en
 * su fila —las rojas primero— y las demás dicen de una vez que faltan datos y qué
 * hacer para tenerlos (sin repetir el mismo botón).
 */
export function ListaDelSemaforo({
  cifras,
  cuantas,
}: {
  readonly cifras: readonly CifraDelSemaforo[];
  /** Cuántas filas como mucho, en un widget pequeño. Sin decirlo, todas. */
  readonly cuantas?: number;
}) {
  const navegar = useNavigate();
  const conDato = [...cifras]
    .filter((c) => c.semaforo !== 'sin_dato')
    .sort((a, b) => PESO[a.semaforo] - PESO[b.semaforo]);
  const sinDato = cifras.filter((c) => c.semaforo === 'sin_dato');
  const queHacer = [
    ...new Map(
      sinDato.flatMap((c) =>
        c.queHacer === null ? [] : [[c.queHacer.texto, c.queHacer] as const],
      ),
    ).values(),
  ];
  const nombres = sinDato.map((c) => c.nombre);
  const enUnaFrase =
    nombres.length <= 1
      ? (nombres[0] ?? '')
      : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1) ?? ''}`;

  return (
    <div className="flex flex-col divide-y divide-borde">
      {conDato.slice(0, cuantas ?? conDato.length).map((cifra) => (
        <FilaDelSemaforo key={cifra.que} cifra={cifra} />
      ))}
      {sinDato.length > 0 && (
        <div className="flex flex-col gap-e2 px-e1 py-e3">
          <p className="text-secundario text-texto-suave">
            {conDato.length === 0 ? 'Todavía no hay datos de esta semana' : 'Sin datos todavía'}:{' '}
            {enUnaFrase}.
          </p>
          {queHacer.length > 0 && (
            <div className="flex flex-wrap gap-e2">
              {queHacer.map((accion) => (
                <Boton
                  key={accion.texto}
                  tono="secundario"
                  onClick={() => {
                    navegar(accion.ir);
                  }}
                >
                  {accion.texto}
                </Boton>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
