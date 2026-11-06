import {
  IconoAgotado,
  IconoAjustes,
  IconoAparatos,
  IconoCaja,
  IconoCandado,
  IconoDeclaracion,
  IconoDocumento,
  IconoEtiqueta,
  IconoFogon,
  IconoImprimir,
  IconoMovil,
  IconoRejilla,
  IconoReloj,
  IconoTableta,
  type Icono as IconoDeLucide,
} from '@estook/iconos';

/**
 * **Los dibujos de Estook TPV**: el engranaje de los Ajustes y el de cada cosa que se ajusta o
 * se vincula, a trazo, del color del texto. Cada uno va **además** de su nombre, nunca en su
 * lugar (B8).
 *
 * **Desde R3 (0133), todos de Lucide**, los de la maqueta aprobada de los Ajustes: eran
 * trazos dibujados a mano, y Richi pidió el 5-nov que ningún icono lo fuera.
 */

export type Dibujo =
  | 'ajustes'
  | 'sala'
  | 'agotado'
  | 'producto'
  | 'cocina'
  | 'aparatos'
  | 'candado'
  | 'caja'
  | 'movil'
  | 'pantalla'
  | 'reloj'
  | 'impresora'
  | 'documento'
  | 'declaracion';

const DE_LUCIDE: Readonly<Record<Dibujo, IconoDeLucide>> = {
  ajustes: IconoAjustes,
  sala: IconoRejilla,
  agotado: IconoAgotado,
  producto: IconoEtiqueta,
  cocina: IconoFogon,
  aparatos: IconoAparatos,
  candado: IconoCandado,
  caja: IconoCaja,
  movil: IconoMovil,
  pantalla: IconoTableta,
  reloj: IconoReloj,
  impresora: IconoImprimir,
  documento: IconoDocumento,
  declaracion: IconoDeclaracion,
};

export function Icono({ dibujo, lado = 24 }: { readonly dibujo: Dibujo; readonly lado?: number }) {
  const ElIcono = DE_LUCIDE[dibujo];
  return <ElIcono size={lado} strokeWidth={2} />;
}

/** Los colores de cada cosa: el fondo suave y el trazo, de las fichas del TPV. */
export type Tono = 'rojo' | 'verde' | 'naranja' | 'ambar' | 'azul' | 'gris';

const DEL_TONO: Readonly<Record<Tono, string>> = {
  rojo: 'bg-mal-suave text-mal',
  verde: 'bg-bien-suave text-bien',
  naranja: 'bg-naranja-suave text-naranja',
  ambar: 'bg-atencion-suave text-atencion',
  azul: 'bg-info-suave text-info',
  gris: 'bg-charcoal text-texto-suave',
};

/** El dibujo en su cuadro de color: el de cada fila de Ajustes y de cada aparato. */
export function IconoEnSuColor({
  dibujo,
  tono,
  lado = 46,
}: {
  readonly dibujo: Dibujo;
  readonly tono: Tono;
  readonly lado?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${lado >= 40 ? 'rounded-grande' : 'rounded-medio'} ${DEL_TONO[tono]}`}
      style={{ width: lado, height: lado }}
    >
      <Icono dibujo={dibujo} lado={Math.floor(lado * 0.55)} />
    </span>
  );
}
