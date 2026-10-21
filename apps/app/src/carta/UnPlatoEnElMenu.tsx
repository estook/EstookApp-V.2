import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boton, Botones, CampoMoneda, ErrorEnCristiano, Hoja } from '@estook/ui';
import { IconoBorrar, IconoEscandallos } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { centimos, type Centimos } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { elDiaEnLetra, type UnMenu, type UnPlatoDelMenu } from './contratoDeLosMenus.ts';

/**
 * Un plato del menú, tocado (0103 y 0104): su suplemento, quitarlo de ese día, su
 * escandallo y, si nació en el menú, ponerlo también en la carta («por si un día se
 * queda»).
 */

export function UnPlatoEnElMenu({
  menu,
  fecha,
  seccionId,
  plato,
  alCerrar,
}: {
  readonly menu: UnMenu;
  readonly fecha: string;
  readonly seccionId: string;
  readonly plato: UnPlatoDelMenu;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const navegar = useNavigate();
  const [suplemento, setSuplemento] = useState<Centimos | null>(
    plato.suplementoCentimos > 0 ? centimos(plato.suplementoCentimos) : null,
  );
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const delDia = menu.clase === 'del_dia';
  const elPlato = { menu_id: menu.id, fecha, seccion_id: seccionId, plato_id: plato.platoId };

  async function hacer(que: string, comando: string, entrada: Record<string, unknown>) {
    setTrabajando(que);
    setError(null);
    const respuesta = await cliente.ejecutar(comando, entrada);
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={plato.nombre}
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            tono="principal"
            cargando={trabajando === 'guardar'}
            textoCargando="Guardando"
            onClick={() =>
              void hacer('guardar', 'cambiar_plato_del_menu', {
                ...elPlato,
                suplemento_centimos: suplemento ?? 0,
              })
            }
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        {delDia && <p className="text-secundario text-texto-suave">{elDiaEnLetra(fecha)}</p>}
        <CampoMoneda
          etiqueta="Suplemento"
          ayuda="Lo que se cobra de más por elegirlo. Vacío, sin suplemento."
          valor={suplemento}
          alCambiar={setSuplemento}
        />
        <div className="flex flex-col gap-e2">
          <Boton
            tono="secundario"
            icono={<IconoEscandallos size={16} />}
            onClick={() => {
              navegar(`/escandallos/escandallos/menus?ficha=plato.${plato.platoId}`);
            }}
          >
            {plato.tieneEscandallo ? 'Ver su escandallo' : 'Desgranarlo en Escandallos'}
          </Boton>
          {plato.soloDelMenu && (
            <Boton
              tono="secundario"
              cargando={trabajando === 'carta'}
              textoCargando="Poniendo"
              onClick={() => void hacer('carta', 'poner_en_la_carta', { plato_id: plato.platoId })}
            >
              Ponerlo también en la carta
            </Boton>
          )}
          <Boton
            tono="peligro"
            icono={<IconoBorrar size={16} />}
            cargando={trabajando === 'quitar'}
            textoCargando="Quitando"
            onClick={() => void hacer('quitar', 'quitar_plato_del_menu', elPlato)}
          >
            {delDia ? 'Quitarlo de este día' : 'Quitarlo del menú'}
          </Boton>
        </div>
      </div>
    </Hoja>
  );
}
