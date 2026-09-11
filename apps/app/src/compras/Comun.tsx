import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { clases } from '@estook/ui';
import { IconoAnadir, IconoQuitar } from '@estook/iconos';

/**
 * Los componentes que usan todas las pantallas de Compras (M7).
 *
 * No van en `@estook/ui` porque solo los usa Compras, y «nadie escribe un
 * componente nuevo sin justificarlo» (B4): el día que otra app los necesite, se
 * suben allí con su razón. Hasta entonces, un sitio y no cinco copias.
 *
 * Lo que no pinta —leer consultas, refrescar, imprimir— vive en `ganchos/` y en
 * `utilidades.ts`.
 */

/**
 * Filtros en pastillas, dentro de una vista: «Abiertos · Recibidos · Todos».
 *
 * No son vistas —esas van arriba, en la barra segmentada—: son la misma lista
 * mirada un poco más de cerca. Van como pastillas y no como desplegable por lo
 * mismo que los motivos de merma: se ve de un vistazo cuál está puesta.
 */
export function Filtros<T extends string>({
  titulo,
  opciones,
  puesto,
  alElegir,
}: {
  readonly titulo: string;
  readonly opciones: readonly {
    readonly valor: T;
    readonly texto: string;
    readonly cuantos?: number;
  }[];
  readonly puesto: T;
  readonly alElegir: (valor: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={titulo} className="flex flex-wrap gap-e2">
      {opciones.map((opcion) => {
        const esta = opcion.valor === puesto;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={esta}
            onClick={() => {
              alElegir(opcion.valor);
            }}
            className={clases(
              'inline-flex min-h-toque items-center gap-e2 rounded-redondo border px-e3 text-secundario font-medium',
              esta
                ? 'border-naranja bg-naranja-suave text-texto'
                : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
            )}
          >
            {opcion.texto}
            {opcion.cuantos !== undefined && opcion.cuantos > 0 && (
              <span className="rounded-redondo bg-superficie px-e2 text-etiqueta text-texto">
                {opcion.cuantos}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Un dato con su nombre al lado: «Llega · mañana». Como los de la ficha de producto. */
export function Dato({ que, children }: { readonly que: string; readonly children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-e3 py-e1">
      <dt className="text-secundario text-texto-suave">{que}</dt>
      <dd className="text-right text-cuerpo font-medium">{children}</dd>
    </div>
  );
}

/**
 * Cuántos, con un − y un + a los lados.
 *
 * En un almacén se cuenta de uno en uno —«uno, dos, tres sacos»— y con la otra
 * mano ocupada, así que los botones son de 44 px y el número también se puede
 * escribir. Admite decimales porque hay cosas que se piden por kilos.
 */
export function Cuantos({
  etiqueta,
  valor,
  alCambiar,
  detras,
  paso = 1,
  disabled = false,
}: {
  readonly etiqueta: string;
  readonly valor: number;
  readonly alCambiar: (valor: number) => void;
  readonly detras?: string;
  readonly paso?: number;
  readonly disabled?: boolean;
}) {
  const bajar = () => {
    alCambiar(Math.max(0, Number((valor - paso).toFixed(3))));
  };
  const subir = () => {
    alCambiar(Number((valor + paso).toFixed(3)));
  };

  return (
    <div className="flex items-center gap-e1" role="group" aria-label={etiqueta}>
      <button
        type="button"
        aria-label={`Uno menos de ${etiqueta}`}
        disabled={disabled || valor <= 0}
        onClick={bajar}
        className="grid size-toque shrink-0 place-items-center rounded-medio border border-borde-fuerte bg-superficie text-texto hover:bg-fondo disabled:opacity-40"
      >
        <IconoQuitar size={16} />
      </button>
      <input
        aria-label={etiqueta}
        inputMode="decimal"
        disabled={disabled}
        value={String(valor).replace('.', ',')}
        onChange={(e) => {
          const escrito = e.currentTarget.value.trim();
          if (escrito === '') {
            alCambiar(0);
            return;
          }
          const numero = Number(escrito.replace(',', '.'));
          if (Number.isFinite(numero) && numero >= 0) alCambiar(numero);
        }}
        className="min-h-toque w-[4.5rem] rounded-medio border border-borde-fuerte bg-superficie px-e2 text-center text-cuerpo font-medium"
      />
      <button
        type="button"
        aria-label={`Uno más de ${etiqueta}`}
        disabled={disabled}
        onClick={subir}
        className="grid size-toque shrink-0 place-items-center rounded-medio border border-borde-fuerte bg-superficie text-texto hover:bg-fondo disabled:opacity-40"
      >
        <IconoAnadir size={16} />
      </button>
      {detras !== undefined && (
        <span className="ml-e1 text-secundario text-texto-suave">{detras}</span>
      )}
    </div>
  );
}

/**
 * Un enlace que se pinta como un botón.
 *
 * WhatsApp, el correo y llamar **son enlaces**, no botones: `wa.me`, `mailto:` y
 * `tel:` los abre el sistema, y un enlace de verdad es lo único que un navegador
 * de móvil deja abrir sin pedir permiso. Un botón que hiciera `window.open`
 * después de pensar lo bloquea el navegador por ventana emergente.
 */
export function EnlaceComoBoton({
  tono = 'secundario',
  icono,
  children,
  ...resto
}: {
  readonly tono?: 'principal' | 'secundario';
  readonly icono?: ReactNode;
  readonly children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'>) {
  return (
    <a
      {...resto}
      className={clases(
        'inline-flex min-h-toque items-center justify-center gap-e2 rounded-medio px-e4 text-cuerpo font-medium',
        tono === 'principal'
          ? 'border border-naranja bg-naranja text-sobre-naranja shadow-s1 hover:brightness-95'
          : 'border border-borde-fuerte bg-superficie text-texto hover:bg-fondo',
      )}
    >
      {icono}
      {children}
    </a>
  );
}
