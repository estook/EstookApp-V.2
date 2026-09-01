import type { SVGProps } from 'react';

/**
 * La cabecera comun de todos los iconos (Parte B3 del Plan).
 *
 * «Cada icono se convierte en un componente React que **hereda `currentColor`** y
 * acepta `size`. Trazo de 1,75 px, tamano base 20 px, 24 px en barras de
 * navegacion.»
 *
 * Que herede el color no es un detalle: es lo que permite que el mismo icono
 * valga en un boton principal (blanco sobre naranja), en una barra (charcoal) y
 * en un aviso (rojo), sin tres variantes ni un `color` que alguien se olvide de
 * pasar.
 *
 * El trazo se declara en unidades del lienzo. Lucide dibuja sobre 24x24 y
 * declara 2; aqui se pide 1,75 porque el Plan lo pide mas fino. Como
 * `vector-effect` no se usa, el trazo escala con el icono, que es lo que se
 * quiere: a 16 px se ve fino, a 24 px se ve igual de fino.
 */
export interface IconoProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** El lado, en pixeles. 20 por defecto; 24 en barras de navegacion. */
  readonly size?: number;
  /**
   * Que dice el icono, para quien no lo ve.
   *
   * Sin esto el icono es decoracion, y se marca `aria-hidden` para que un lector
   * de pantalla no lo nombre. **Es lo correcto casi siempre**: un icono al lado
   * de su texto no se lee dos veces. Solo lleva `titulo` el icono que va solo y
   * significa algo, y en ese caso lo normal es que su boton ya tenga etiqueta.
   */
  readonly titulo?: string;
}

export function crearIcono(nombre: string, figura: string) {
  function Icono({ size = 20, titulo, ...resto }: IconoProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        {...(titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true })}
        {...resto}
        // La figura viene de un fichero generado a partir de los SVG de Lucide,
        // que estan en el repositorio. No hay ninguna entrada de usuario por
        // aqui: no es un sitio por donde pueda colarse nada.
        dangerouslySetInnerHTML={{ __html: figura }}
      />
    );
  }

  Icono.displayName = `Icono(${nombre})`;
  return Icono;
}

export type Icono = ReturnType<typeof crearIcono>;
