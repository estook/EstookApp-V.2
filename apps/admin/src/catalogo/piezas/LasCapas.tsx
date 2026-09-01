import { useState } from 'react';
import {
  Avatar,
  Boton,
  Botones,
  Campo,
  Hoja,
  PanelLateral,
  Tarjeta,
  usarDeshacer,
} from '@estook/ui';
import { Fila, Pieza } from '../Pieza.tsx';

/**
 * Lo que se abre encima: la hoja, el panel lateral, la tarjeta y el deshacer.
 *
 * La hoja y el panel son el mismo `<dialog>` con distinta colocación, y eso no es
 * pereza: `showModal()` trae de serie lo que se hace mal a mano casi siempre —el
 * foco atrapado dentro, `Esc` para cerrar, el fondo inerte, y el foco de vuelta
 * a donde estaba al cerrar—. Ábrelas y prueba a tabular: no se sale.
 */
export function LasCapas() {
  const [hoja, setHoja] = useState(false);
  const [panel, setPanel] = useState(false);
  const { sePuedeDeshacer } = usarDeshacer();

  return (
    <>
      <Pieza
        nombre="Hoja"
        cuando="En móvil, sube desde abajo y ocupa el 92 %. El 8 % que queda no es margen: es lo que deja ver que hay algo detrás."
      >
        <Fila>
          <Boton
            tono="principal"
            onClick={() => {
              setHoja(true);
            }}
          >
            Abrir la hoja
          </Boton>
          <p className="self-center text-secundario text-texto-suave">
            Prueba `Esc`, y prueba a tabular dentro
          </p>
        </Fila>

        <Hoja
          abierta={hoja}
          alCerrar={() => {
            setHoja(false);
          }}
          titulo="Registrar una merma"
          pie={
            <Botones>
              <Boton
                tono="texto"
                onClick={() => {
                  setHoja(false);
                }}
              >
                Cancelar
              </Boton>
              <Boton
                tono="principal"
                onClick={() => {
                  setHoja(false);
                }}
              >
                Registrar
              </Boton>
            </Botones>
          }
        >
          <div className="flex flex-col gap-e4 pt-e3">
            <Campo etiqueta="Producto" defaultValue="Tomate pera" />
            <Campo etiqueta="Cantidad" tipo="numero" defaultValue={2} detras="kg" />
            <Campo
              etiqueta="Motivo"
              placeholder="Se pasó"
              ayuda="Ayuda a saber dónde se va el género"
            />
          </div>
        </Hoja>
      </Pieza>

      <Pieza
        nombre="PanelLateral"
        cuando="En escritorio, entra desde la derecha y no tapa la lista: es lo que permite ir de una ficha a otra sin cerrar."
      >
        <Fila>
          <Boton
            tono="principal"
            onClick={() => {
              setPanel(true);
            }}
          >
            Abrir el panel
          </Boton>
        </Fila>

        <PanelLateral
          abierta={panel}
          alCerrar={() => {
            setPanel(false);
          }}
          titulo="Rosa Iglesias"
          pie={
            <Botones>
              <Boton
                tono="texto"
                onClick={() => {
                  setPanel(false);
                }}
              >
                Cerrar
              </Boton>
              <Boton tono="principal">Guardar</Boton>
            </Botones>
          }
        >
          <div className="flex flex-col gap-e4 pt-e3">
            <Fila>
              <Avatar nombre="Rosa Iglesias" tamano={48} />
              <div>
                <p className="text-seccion font-semibold">Rosa Iglesias</p>
                <p className="text-secundario text-texto-suave">Gerente · Bar Centro</p>
              </div>
            </Fila>
            <Campo etiqueta="Correo" tipo="correo" defaultValue="rosa@ejemplo.estook.com" />
            <Campo etiqueta="Teléfono" tipo="telefono" placeholder="600 00 00 00" />
          </div>
        </PanelLateral>
      </Pieza>

      <Pieza
        nombre="Tarjeta"
        cuando="El contenedor de casi todo. Su pie es donde va el origen del dato: una cifra sin origen es una cifra en la que no se puede confiar."
      >
        <div className="grid gap-e3 md:grid-cols-2">
          <Tarjeta
            titulo="Con acento de app"
            acento="var(--color-app-inventario)"
            origen="Recuento del 3 de marzo"
            accion={<Boton tono="texto">Ver todo</Boton>}
          >
            <p className="text-secundario text-texto-suave">
              El acento se usa con moderación: tres píxeles arriba, y nada más de color.
            </p>
          </Tarjeta>

          <Tarjeta titulo="Sin acento">
            <p className="text-secundario text-texto-suave">
              Lo normal. El fondo y los botones no cambian de color entre apps, o parecerían cuatro
              productos distintos.
            </p>
          </Tarjeta>
        </div>
      </Pieza>

      <Pieza
        nombre="Deshacer"
        cuando="Diez segundos, en todo lo que no tenga consecuencia legal. La barra vive en la raíz, no en la pantalla: navegar después de hacer algo es justo cuando uno se da cuenta de que no quería."
      >
        <Fila>
          <Boton
            onClick={() => {
              sePuedeDeshacer({
                que: 'Merma registrada · 2 kg de tomate',
                deshacer: () => undefined,
              });
            }}
          >
            Hacer algo que se pueda deshacer
          </Boton>
          <p className="self-center text-secundario text-texto-suave">
            Sale abajo, cuenta diez segundos, y también responde a Ctrl+Z
          </p>
        </Fila>
      </Pieza>
    </>
  );
}
