import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Permiso } from '@estook/permisos';
import { puedeVer } from '@estook/permisos';
import { Aviso, Boton, Cargando, Etiqueta, Tarjeta, loQueSePuedePintar } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { AL_DIA, CADA_MINUTO } from '../datos/alDia.ts';
import { Widget } from '../panel/widgets.tsx';
import { comoSeLeeElDia, comoSeLeeLaHoraDe, loQueDuraHoy, type LaJornada } from './contrato.ts';

/**
 * Servicio · Jornada · En marcha (M16a, decisión 0105): lo que pasa ahora en el local.
 *
 * Pensada para la tablet o el móvil del encargado en pleno servicio (Richi, 22-oct: «sí,
 * viva y para el servicio»). Arriba, el día: de qué hora a qué hora va, cuánto le queda y
 * si está cerrado. Debajo, **los mismos widgets del Panel**, no otros: quién está dentro,
 * lo agotado, el menú de hoy, la merma y lo que llega. Así una cifra no dice una cosa aquí
 * y otra en el Panel, y lo que se arregle en un widget se arregla en los dos sitios.
 *
 * **Se pone al día sola cada minuto**, solo con la pantalla a la vista (`AL_DIA`): con el
 * móvil en el bolsillo no se pregunta nada. Las ventas en directo llegan con Estook TPV.
 */

/** Lo que se mira en pleno servicio, en este orden. Cada uno con el permiso de su widget. */
const LO_QUE_SE_MIRA = ['fichajes', 'agotados', 'menu-de-hoy', 'merma', 'pedidos'] as const;

/** Lo que leen esos widgets: se vuelve a preguntar cada minuto mientras se mira. */
const LO_QUE_SE_REFRESCA = [
  'los_agotados',
  'mis_menus',
  'merma_de_hoy',
  'un_indicador',
  'compras_de_hoy',
  'almacen_hoy',
];

export function EnMarcha() {
  const { cliente, permisos } = usarSesion();
  const navegar = useNavigate();
  const cache = useQueryClient();

  const jornada = useQuery({
    queryKey: ['la_jornada'],
    queryFn: async (): Promise<LaJornada> => {
      const respuesta = await cliente.consultar<LaJornada>('la_jornada');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    ...AL_DIA,
  });

  useEffect(() => {
    const reloj = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      for (const nombre of LO_QUE_SE_REFRESCA) {
        void cache.invalidateQueries({ queryKey: [nombre] });
      }
    }, CADA_MINUTO);
    return () => {
      window.clearInterval(reloj);
    };
  }, [cache]);

  const tienePermiso = (permiso: Permiso) => puedeVer(permisos, permiso);
  const widgets = loQueSePuedePintar(
    LO_QUE_SE_MIRA.map((id) => ({ id, tamano: 'ancho' as const })),
    tienePermiso,
  );

  return (
    <div className="flex max-w-[64rem] flex-col gap-e4">
      {jornada.isPending ? (
        <Cargando que="la jornada" />
      ) : jornada.isError ? (
        <Aviso tono="mal" titulo="No he podido leer la jornada">
          Vuelve a intentarlo dentro de un momento.
        </Aviso>
      ) : (
        <ElDia
          dia={jornada.data}
          alCerrar={(fecha) => {
            navegar(
              fecha === null
                ? '/servicio/jornada/cierre'
                : `/servicio/jornada/cierre?fecha=${fecha}`,
            );
          }}
        />
      )}

      {widgets.length > 0 && (
        // Cada fila, lo que mida el más alto de los dos: sin huecos vacíos debajo.
        <div className="grid gap-e4 md:grid-cols-2">
          {widgets.map((w) => (
            <Widget key={w.id} id={w.id} tamano={w.tamano} editando={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/** «6 h 12 min», «45 min». */
function comoSeLeeLoQueQueda(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${String(resto)} min`;
  return resto === 0 ? `${String(horas)} h` : `${String(horas)} h ${String(resto)} min`;
}

function ElDia({
  dia,
  alCerrar,
}: {
  readonly dia: LaJornada;
  readonly alCerrar: (fecha: string | null) => void;
}) {
  const nota = loQueDuraHoy(dia.minutos);
  const cuando = comoSeLeeElDia(dia.fecha);

  return (
    <Tarjeta
      titulo={`La jornada · ${cuando}`}
      acento="var(--color-app-servicio)"
      accion={
        dia.estado === 'cerrada' ? (
          <Boton
            tono="texto"
            onClick={() => {
              alCerrar(null);
            }}
          >
            Ver el cierre
          </Boton>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-e3">
        <div className="flex flex-wrap items-center gap-e2">
          {dia.estado === 'abierta' && <Etiqueta tono="bien">Abierta</Etiqueta>}
          {dia.estado === 'reabierta' && (
            <Etiqueta tono="atencion">Reabierta, sin volver a cerrar</Etiqueta>
          )}
          {dia.estado === 'cerrada' && (
            <Etiqueta tono="neutro">
              Cerrada
              {dia.cerradaEn === null ? '' : ` a las ${comoSeLeeLaHoraDe(dia.cerradaEn)}`}
              {dia.cerradaPor === null ? '' : ` por ${dia.cerradaPor}`}
            </Etiqueta>
          )}
        </div>
        <p className="text-secundario text-texto-suave">
          Se abrió sola a las {dia.corte} y acaba a las {dia.corte} del día siguiente
          {dia.estado === 'cerrada' ? '.' : ` · quedan ${comoSeLeeLoQueQueda(dia.quedan)}.`}
        </p>
        {nota !== null && <p className="text-secundario font-medium">{nota}</p>}
        {dia.ayerSinCerrar !== null && (
          <Aviso
            tono="atencion"
            titulo={`Falta cerrar el ${comoSeLeeElDia(dia.ayerSinCerrar)}`}
            accion={
              dia.puedeCerrar ? (
                <Boton
                  tono="secundario"
                  onClick={() => {
                    alCerrar(dia.ayerSinCerrar);
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
        {/* Debajo y no en la cabecera: en el móvil, al lado del título se partía en dos. */}
        {dia.estado !== 'cerrada' && dia.puedeCerrar && (
          <div className="flex flex-col sm:flex-row">
            <Boton
              tono="principal"
              onClick={() => {
                alCerrar(null);
              }}
            >
              Cerrar el día
            </Boton>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}
