import { clases } from '../clases.ts';

/**
 * La barra de proporción · un gráfico que no se inventa nada.
 *
 * ── Por qué esto y no una gráfica ────────────────────────────────────────────
 *
 * Porque una gráfica necesita una serie —doce meses, treinta días— y hoy Estook
 * no tiene ninguna: las ventas llegan con M12 y el margen con M8. Poner una
 * gráfica ahora sería dibujar una línea con datos inventados, que es el fallo que
 * este proyecto persigue desde M4.
 *
 * Lo que sí hay es **una cifra dentro de otra**: cuántos productos de los que
 * tienes llevan precio, cuánto queda de un producto respecto de su mínimo. Eso no
 * es una serie, es una proporción, y una barra la enseña mejor que un número
 * porque se ve **de lejos y sin leer** — que es como se mira una pantalla en una
 * cocina.
 *
 * Cuando lleguen las series, la gráfica ya está: `Grafica.tsx`, con Recharts
 * detrás de un `lazy`. Esto no la sustituye, cuenta otra cosa.
 *
 * ── Y por qué lleva su texto al lado ─────────────────────────────────────────
 *
 * «Los colores de estado nunca van solos: siempre con icono o con texto» (B1).
 * Una barra de colores es exactamente eso, así que debajo va lo mismo escrito. Y
 * para un lector de pantalla la barra es `aria-hidden` entera y lo que se lee es
 * la frase: leer «rectángulo, rectángulo» no ayuda a nadie.
 */
export interface Trozo {
  /** Qué es. Sale escrito debajo, junto a su color. */
  readonly que: string;
  readonly cuantos: number;
  /** El tono, de los de B1. `marca` usa el acento de la aplicación. */
  readonly tono: 'bien' | 'atencion' | 'mal' | 'info' | 'marca' | 'neutro';
  /**
   * Cómo se escribe la cifra debajo, si no es el número tal cual.
   *
   * ── Por qué esto hace falta ───────────────────────────────────────────────
   *
   * Porque la barra reparte **céntimos** en cuanto se usa para dinero, y «14350
   * Pérdida» no es una cifra: es la que se guarda. La proporción necesita el
   * número crudo para calcular el ancho, y la lista de debajo necesita el número
   * escrito como se lee. Son dos cosas distintas del mismo dato, y por eso van en
   * dos campos en vez de convertir aquí —que obligaría a que este componente
   * supiera de dinero, y no sabe—.
   */
  readonly comoSeLee?: string;
}

const FONDO: Record<Trozo['tono'], string> = {
  bien: 'bg-bien',
  atencion: 'bg-atencion',
  mal: 'bg-mal',
  info: 'bg-info',
  marca: 'bg-naranja',
  neutro: 'bg-borde-fuerte',
};

export interface ProporcionProps {
  /** Qué cuenta la barra entera, para quien no la ve. */
  readonly titulo: string;
  readonly trozos: readonly Trozo[];
  /** Sin la lista de debajo, para cuando el texto ya está al lado. */
  readonly soloLaBarra?: boolean;
}

export function Proporcion({ titulo, trozos, soloLaBarra = false }: ProporcionProps) {
  const total = trozos.reduce((suma, trozo) => suma + Math.max(0, trozo.cuantos), 0);

  // Sin nada que repartir no se pinta una barra vacía: se calla. Una barra al
  // 0 % parece un dato y es la ausencia de dato.
  if (total <= 0) return null;

  const conSitio = trozos.filter((trozo) => trozo.cuantos > 0);

  return (
    <div>
      <div
        aria-hidden
        className="flex h-[10px] w-full overflow-hidden rounded-redondo bg-fondo"
        title={titulo}
      >
        {conSitio.map((trozo) => (
          <span
            key={trozo.que}
            className={clases('h-full', FONDO[trozo.tono])}
            style={{ width: `${(trozo.cuantos / total) * 100}%` }}
          />
        ))}
      </div>

      {!soloLaBarra && (
        <ul className="mt-e2 flex flex-wrap gap-x-e3 gap-y-e1">
          {conSitio.map((trozo) => (
            <li key={trozo.que} className="flex items-center gap-e2 text-secundario">
              <span
                aria-hidden
                className={clases('size-[10px] shrink-0 rounded-redondo', FONDO[trozo.tono])}
              />
              <span className="text-texto-suave">
                <strong className="text-texto">{trozo.comoSeLee ?? trozo.cuantos}</strong>{' '}
                {trozo.que}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
