import { useNavigate } from 'react-router-dom';
import { Boton, type TonoDeBoton } from '@estook/ui';
import type { Accion } from './catalogo.tsx';

/**
 * El botón de una acción del catálogo, con su icono (entrega V, punto 4).
 *
 * Lleva a su dirección, igual que desde el Panel o el buscador: «una acción es una
 * dirección» (0020). Así el botón de un vacío abre **lo mismo** que el acceso
 * rápido, y no una copia del formulario que un día dejaría de parecerse.
 *
 * El texto lo pone quien lo usa, porque en un vacío se habla distinto: el catálogo
 * dice «Añadir un producto»; el vacío de la cámara, «Añade tu primer producto».
 */
export function BotonDeAccion({
  accion,
  texto,
  tono = 'principal',
}: {
  readonly accion: Accion;
  readonly texto: string;
  readonly tono?: TonoDeBoton;
}) {
  const navegar = useNavigate();
  const Icono = accion.icono;
  return (
    <Boton
      tono={tono}
      icono={<Icono size={18} />}
      onClick={() => {
        navegar(accion.ir);
      }}
    >
      {texto}
    </Boton>
  );
}
