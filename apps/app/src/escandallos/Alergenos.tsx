import { ALERGENOS, NOMBRE_DEL_ALERGENO, type Alergeno } from '@estook/dominio';
import { COLOR_DEL_ALERGENO } from './colores.ts';
import { clases } from '@estook/ui';
import {
  ICONO_DEL_ALERGENO,
  IconoHecho,
  IconoPicante,
  IconoVegano,
  IconoVegetariano,
} from '@estook/iconos';

/**
 * Los alérgenos, el picante y lo vegetariano, como se ven en una carta (repaso del
 * 16-oct, C · decisión 0087).
 *
 * **Un círculo de su color con su dibujo**: se reconoce antes de leer, que es como se
 * mira una carta. El color es el de los pictogramas de siempre, y va **además** del
 * nombre, nunca en su lugar (B8): el nombre está en `title` y para el lector de
 * pantalla, y donde hay sitio, escrito.
 */

const COLOR_DEL_PICANTE = '#C62828';

export function Alergeno({
  alergeno,
  lado = 24,
}: {
  readonly alergeno: Alergeno;
  readonly lado?: number;
}) {
  const Icono = ICONO_DEL_ALERGENO[alergeno];
  return (
    <span
      role="img"
      aria-label={NOMBRE_DEL_ALERGENO[alergeno]}
      title={NOMBRE_DEL_ALERGENO[alergeno]}
      className="inline-flex shrink-0 items-center justify-center rounded-redondo text-white"
      style={{ width: lado, height: lado, background: COLOR_DEL_ALERGENO[alergeno] }}
    >
      {Icono !== undefined && <Icono size={Math.floor(lado * 0.62)} />}
    </span>
  );
}

export function Picante({ nivel, lado = 24 }: { readonly nivel: number; readonly lado?: number }) {
  if (nivel <= 0) return null;
  const nombre = nivel === 1 ? 'Pica un poco' : nivel === 2 ? 'Pica' : 'Pica mucho';
  return (
    <span
      role="img"
      aria-label={nombre}
      title={nombre}
      className="inline-flex shrink-0 items-center"
      style={{ color: COLOR_DEL_PICANTE }}
    >
      {Array.from({ length: nivel }, (_, i) => (
        <IconoPicante key={i} size={Math.floor(lado * 0.8)} className="-mx-[1px]" />
      ))}
    </span>
  );
}

/** Los alérgenos de un plato en una fila, con el picante detrás. Nada si no tiene. */
export function LosAlergenos({
  alergenos,
  picante = 0,
  distintivos = [],
  lado = 24,
  conNombre = false,
  enUnaLinea = false,
}: {
  readonly alergenos: readonly Alergeno[];
  readonly picante?: number;
  readonly distintivos?: readonly string[];
  readonly lado?: number;
  /** Con el nombre escrito al lado de cada uno: en la ficha, donde hay sitio. */
  readonly conNombre?: boolean;
  /** En una fila de lista: sin saltar de línea, que el texto de al lado se recorta. */
  readonly enUnaLinea?: boolean;
}) {
  if (alergenos.length === 0 && picante <= 0 && distintivos.length === 0) return null;
  const enOrden = ALERGENOS.filter((a) => alergenos.includes(a));
  return (
    <span
      className={clases(
        'inline-flex items-center',
        enUnaLinea ? 'shrink-0 flex-nowrap' : 'flex-wrap',
        conNombre ? 'gap-e2' : 'gap-e1',
      )}
    >
      {enOrden.map((a) =>
        conNombre ? (
          <span key={a} className="inline-flex items-center gap-e1 text-secundario">
            <Alergeno alergeno={a} lado={lado} />
            {NOMBRE_DEL_ALERGENO[a]}
          </span>
        ) : (
          <Alergeno key={a} alergeno={a} lado={lado} />
        ),
      )}
      <Picante nivel={picante} lado={lado} />
      {distintivos.includes('vegano') ? (
        <Distintivo cual="vegano" lado={lado} />
      ) : distintivos.includes('vegetariano') ? (
        <Distintivo cual="vegetariano" lado={lado} />
      ) : null}
    </span>
  );
}

function Distintivo({
  cual,
  lado,
}: {
  readonly cual: 'vegetariano' | 'vegano';
  readonly lado: number;
}) {
  const Icono = cual === 'vegano' ? IconoVegano : IconoVegetariano;
  const nombre = cual === 'vegano' ? 'Vegano' : 'Vegetariano';
  return (
    <span
      role="img"
      aria-label={nombre}
      title={nombre}
      className="inline-flex shrink-0 items-center text-bien"
    >
      <Icono size={Math.floor(lado * 0.8)} />
    </span>
  );
}

/**
 * Elegir los alérgenos de un plato, en la carta: los catorce con su dibujo, para
 * tocarlos. **Los que trae su receta ya están puestos y no se quitan**: si la mayonesa
 * lleva huevo, el plato lleva huevo, lo diga quien lo diga.
 */
export function ElegirAlergenos({
  puestos,
  deLaReceta,
  alCambiar,
}: {
  readonly puestos: readonly string[];
  readonly deLaReceta: readonly string[];
  readonly alCambiar: (puestos: readonly string[]) => void;
}) {
  return (
    <div role="group" aria-label="Alérgenos" className="grid grid-cols-2 gap-e2 sm:grid-cols-3">
      {ALERGENOS.map((a) => {
        const porLaReceta = deLaReceta.includes(a);
        const puesto = porLaReceta || puestos.includes(a);
        return (
          <button
            key={a}
            type="button"
            role="checkbox"
            aria-checked={puesto}
            aria-disabled={porLaReceta}
            title={porLaReceta ? 'Lo lleva su receta' : undefined}
            onClick={() => {
              if (porLaReceta) return;
              alCambiar(puesto ? puestos.filter((p) => p !== a) : [...puestos, a]);
            }}
            className={clases(
              'flex min-h-toque items-center gap-e2 rounded-medio border px-e2 py-e1 text-left text-secundario transition-colors duration-rapido',
              puesto
                ? 'border-texto bg-fondo font-semibold'
                : 'border-borde bg-superficie text-texto-suave hover:bg-fondo',
              porLaReceta && 'cursor-default',
            )}
          >
            <span className={clases('shrink-0', !puesto && 'opacity-40 grayscale')}>
              <Alergeno alergeno={a} lado={26} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">{NOMBRE_DEL_ALERGENO[a]}</span>
            {puesto && <IconoHecho size={16} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
