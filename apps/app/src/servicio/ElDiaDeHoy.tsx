import { useNavigate } from 'react-router-dom';
import { Aviso, Boton, Etiqueta } from '@estook/ui';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { comoSeLeeElDia, comoSeLeeLaHoraDe, type LaJornada } from './contrato.ts';
import type { LoQueSeVende } from './contratoDeLoQueSeVende.ts';

/**
 * Hoy, en una línea (la pausa del 8-nov, 0142): lo que «En marcha» tenía y no estaba en el Panel
 * —si el día está abierto o cerrado, cuánto le queda, el día de antes sin cerrar y «Cerrar el
 * día»— junto a lo que pasa en las mesas ahora mismo. Lo demás de «En marcha» eran los widgets
 * del Panel repetidos, y se fue.
 *
 * **Con Estook TPV** (R3 · 1, 0144) el día lo cierra la caja: aquí no se ofrece cerrarlo ni se
 * avisa del de ayer —lo dice la caja, que es donde se puede hacer algo—, y «Ver el cierre» lleva
 * a sus cierres de caja.
 */
export function ElDiaDeHoy({ ahoraMismo }: { readonly ahoraMismo: LoQueSeVende['ahoraMismo'] }) {
  const navegar = useNavigate();
  const { yo } = usarSesion();
  const conEstookTpv = yo?.cuenta?.conEstookTpv === true;
  const lectura = usarLectura<LaJornada>('la_jornada', {}, true);
  const dia = lectura.data;
  const alCierre = (fecha: string | null) => {
    navegar(
      fecha === null
        ? '/servicio/jornada/cierre'
        : `/servicio/jornada/cierre?${conEstookTpv ? 'dia' : 'fecha'}=${fecha}`,
    );
  };
  if (dia === undefined && ahoraMismo === null) return null;
  const horas = dia === undefined ? 0 : Math.floor(dia.quedan / 60);

  return (
    <div className="flex flex-col gap-e2">
      <div className="flex flex-wrap items-center gap-x-e4 gap-y-e2 rounded-mayor border border-borde bg-superficie px-e4 py-e3 text-cuerpo [box-shadow:var(--sombra-tarjeta)]">
        {dia !== undefined && (
          <>
            {dia.estado === 'abierta' && (
              <Etiqueta tono="bien">Abierto · quedan {horas} h</Etiqueta>
            )}
            {dia.estado === 'reabierta' && (
              <Etiqueta tono="atencion">Reabierto, sin volver a cerrar</Etiqueta>
            )}
            {dia.estado === 'cerrada' && (
              <Etiqueta tono="neutro">
                Cerrado
                {dia.cerradaEn === null ? '' : ` a las ${comoSeLeeLaHoraDe(dia.cerradaEn)}`}
              </Etiqueta>
            )}
          </>
        )}
        {ahoraMismo !== null && (
          <>
            <span>
              <b>{ahoraMismo.mesas}</b> {ahoraMismo.mesas === 1 ? 'mesa abierta' : 'mesas abiertas'}{' '}
              · <b>{ahoraMismo.personas}</b> personas
            </span>
            <span>
              <b>{ahoraMismo.enCocina}</b> en cocina
            </span>
            {ahoraMismo.minutosDeCocina !== null && (
              <span>
                La cocina, a <b>{ahoraMismo.minutosDeCocina} min</b> de media
              </span>
            )}
          </>
        )}
        {dia !== undefined && (
          <span className="ml-auto">
            {dia.estado === 'cerrada' ? (
              <Boton
                tono="texto"
                onClick={() => {
                  alCierre(conEstookTpv ? dia.fecha : null);
                }}
              >
                Ver el cierre
              </Boton>
            ) : (
              dia.puedeCerrar &&
              !conEstookTpv && (
                <Boton
                  tono="secundario"
                  onClick={() => {
                    alCierre(null);
                  }}
                >
                  Cerrar el día
                </Boton>
              )
            )}
          </span>
        )}
      </div>
      {dia?.ayerSinCerrar != null && !conEstookTpv && (
        <Aviso
          tono="atencion"
          titulo={`Falta cerrar el ${comoSeLeeElDia(dia.ayerSinCerrar)}`}
          accion={
            dia.puedeCerrar ? (
              <Boton
                tono="secundario"
                onClick={() => {
                  alCierre(dia.ayerSinCerrar);
                }}
              >
                Cerrarlo
              </Boton>
            ) : undefined
          }
        >
          Se suele cerrar ese día y está sin cerrar.
        </Aviso>
      )}
    </div>
  );
}
