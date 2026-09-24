import {
  Component,
  Suspense,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';
import { DIBUJOS, type NombreDelDibujo } from '../dibujos/catalogo.ts';
import { clases } from '../clases.ts';

/**
 * Un dibujo de los vacíos, cargado aparte (entrega V, punto 4).
 *
 * ── Tres cuidados, y los tres se notan ───────────────────────────────────────
 *
 *   · **El hueco se reserva antes de que llegue.** La caja mide lo mismo con el
 *     dibujo que sin él, así que cuando llega no empuja el título ni el botón: la
 *     pantalla no salta.
 *   · **Aparece, no se enciende de golpe**: un fundido corto (`anima-aparece`), que
 *     «reducir movimiento» apaga como todo lo demás.
 *   · **Si no llega, no pasa nada.** Un trozo que no se descarga —una red mala, o
 *     una publicación nueva que se llevó el de antes— deja el hueco vacío y el
 *     vacío sigue diciendo lo suyo con su título y su botón. Sin esta red, el fallo
 *     subiría hasta `SiAlgoFalla` y se llevaría la pantalla entera por un adorno.
 */
export interface DibujoProps {
  readonly nombre: NombreDelDibujo;
  /** Más pequeño, para dentro de un widget o una lista. */
  readonly compacto?: boolean;
  /** El color del acento: el de la app. Sin decir nada, el naranja de la marca. */
  readonly acento?: string;
}

const PEREZOSOS = new Map<NombreDelDibujo, LazyExoticComponent<ComponentType>>();

/** Uno por dibujo y para siempre: si cambiara en cada pintado, se volvería a cargar. */
function elDibujo(nombre: NombreDelDibujo): LazyExoticComponent<ComponentType> {
  const ya = PEREZOSOS.get(nombre);
  if (ya !== undefined) return ya;
  const nuevo = lazy(DIBUJOS[nombre]);
  PEREZOSOS.set(nombre, nuevo);
  return nuevo;
}

export function Dibujo({ nombre, compacto = false, acento }: DibujoProps) {
  const Pintado = elDibujo(nombre);
  return (
    <span
      aria-hidden
      data-dibujo={nombre}
      className={clases('block shrink-0', compacto ? 'h-[78px] w-[104px]' : 'h-[120px] w-[160px]')}
      style={{ color: acento ?? 'var(--color-naranja)' }}
    >
      <SiNoLlega>
        <Suspense fallback={null}>
          <span className="block size-full anima-aparece">
            <Pintado />
          </span>
        </Suspense>
      </SiNoLlega>
    </span>
  );
}

/** La red de debajo de un dibujo: si no llega, no se pinta, y ya está. */
class SiNoLlega extends Component<{ readonly children: ReactNode }, { readonly fallo: boolean }> {
  override state = { fallo: false };

  static getDerivedStateFromError(): { fallo: boolean } {
    return { fallo: true };
  }

  override render() {
    return this.state.fallo ? null : this.props.children;
  }
}
