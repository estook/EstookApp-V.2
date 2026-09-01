import type { ReactNode } from 'react';

/**
 * El marco de cada componente del catálogo.
 *
 * Está aparte de `Catalogo.tsx` por la misma razón que los tipos de la gráfica:
 * el catálogo importa las seis familias y las seis importan esto, así que
 * dejarlo allí sería un **ciclo de dependencias**, y `.dependency-cruiser.cjs`
 * lo bloquea con razón. Un tercer fichero sin dependencias lo deshace.
 */
export function Pieza({
  nombre,
  cuando,
  children,
}: {
  readonly nombre: string;
  /**
   * Cuándo se usa este y no otro.
   *
   * No es decoración: la mitad de las decisiones de B4 son «cuál de los dos
   * uso», y esa pregunta se responde aquí o no se responde en ningún sitio.
   */
  readonly cuando: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-e3">
      <header>
        <h2 className="text-seccion font-semibold">{nombre}</h2>
        <p className="text-secundario text-texto-suave">{cuando}</p>
      </header>
      <div className="rounded-grande border border-borde bg-superficie p-e4">{children}</div>
    </section>
  );
}

/** Una fila de variantes, que se apila sola cuando no cabe. */
export function Fila({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-e3">{children}</div>;
}
