import { IconoAnadir, IconoBorrar, IconoDeshacer } from '@estook/iconos';
import { Boton, Botones, Etiqueta } from '@estook/ui';
import { Fila, Pieza } from '../Pieza.tsx';

/**
 * Los botones y las etiquetas.
 *
 * Aquí se ve de un vistazo lo que B4 pide y que no se puede comprobar leyendo el
 * código: que el botón principal se distingue del secundario, que el de peligro
 * no grita, y que los cuatro tonos de etiqueta se leen.
 */
export function LosBotones() {
  return (
    <>
      <Pieza
        nombre="Boton"
        cuando="Un botón principal por pantalla. El resto, secundarios. El que ejecuta va abajo a la derecha."
      >
        <div className="flex flex-col gap-e4">
          <Fila>
            <Boton tono="principal" icono={<IconoAnadir size={18} />}>
              Principal
            </Boton>
            <Boton tono="secundario">Secundario</Boton>
            <Boton tono="texto">Texto</Boton>
            <Boton tono="peligro" icono={<IconoBorrar size={18} />}>
              Peligro
            </Boton>
          </Fila>

          <Fila>
            <Boton tono="principal" tamano="l">
              Tamaño l · listas de cocina
            </Boton>
            <Boton cargando>Guardar</Boton>
            <Boton disabled>Deshabilitado</Boton>
          </Fila>

          <div className="max-w-[22rem]">
            <Boton tono="principal" ancho>
              Ancho completo · lo normal dentro de una hoja
            </Boton>
          </div>
        </div>
      </Pieza>

      <Pieza
        nombre="Botones"
        cuando="Coloca los botones de una pantalla o de una hoja: el que ejecuta a la derecha, cancelar a su izquierda. En móvil se apilan y el que ejecuta queda arriba, que es donde llega el pulgar."
      >
        <Botones>
          <Boton tono="texto">Cancelar</Boton>
          <Boton tono="principal" icono={<IconoDeshacer size={18} />}>
            Guardar cambios
          </Boton>
        </Botones>
      </Pieza>

      <Pieza
        nombre="Etiqueta"
        cuando="Un estado, una categoría, un contador. El color del estado nunca va solo: aquí lo acompaña el texto, y si hace falta un icono."
      >
        <Fila>
          <Etiqueta>Neutro</Etiqueta>
          <Etiqueta tono="bien">Al día</Etiqueta>
          <Etiqueta tono="atencion">Caduca pronto</Etiqueta>
          <Etiqueta tono="mal">Fuera de rango</Etiqueta>
          <Etiqueta tono="info">Borrador</Etiqueta>
          <Etiqueta tono="marca">Nuevo</Etiqueta>
        </Fila>
      </Pieza>
    </>
  );
}
