import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FotoQueSePone } from '../fotos/FotoQueSePone.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { UnProducto } from './contrato.ts';

/**
 * La foto de un producto, en su ficha (entrega V, punto 5).
 *
 * Arriba del todo, al lado de las pastillas de qué es, de quién y en qué envase: es
 * lo primero que hace falta para reconocerlo. Pequeña; tocándola se ve grande, y ahí
 * se cambia o se quita. Todo lo de poner, ver y quitar vive en `FotoQueSePone`, que
 * desde la 0086 usa también el plato.
 */
export function FotoDeLaFicha({
  datos,
  puedeTocar,
  alHecho,
  alFallar,
}: {
  readonly datos: UnProducto;
  readonly puedeTocar: boolean;
  /** Lo que se ha hecho, en una frase, para el aviso de la ficha. */
  readonly alHecho: (frase: string) => Promise<void>;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}) {
  const { cliente } = usarSesion();
  const producto = datos.producto;
  return (
    <FotoQueSePone
      nombre={producto.nombre}
      categoria={producto.categoria}
      foto={datos.foto}
      miniatura={producto.miniatura ?? null}
      puedeTocar={puedeTocar}
      poner={(reducida) =>
        cliente.ejecutar('poner_foto_de_producto', { producto_id: producto.id, ...reducida })
      }
      quitar={() => cliente.ejecutar('quitar_foto_de_producto', { producto_id: producto.id })}
      alHecho={alHecho}
      alFallar={alFallar}
    />
  );
}
