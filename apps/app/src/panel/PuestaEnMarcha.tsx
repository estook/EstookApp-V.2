import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { puedeVer } from '@estook/permisos';
import { Anillo, Boton, clases } from '@estook/ui';
import {
  IconoAlmacen,
  IconoCalendario,
  IconoColor,
  IconoEquipo,
  IconoFlechaDerecha,
  IconoHecho,
  IconoReparto,
  type Icono,
} from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Pon en marcha tu local** (0085).
 *
 * Richi, el 15-oct: «una lista de puesta en marcha para las cuentas nuevas —logo,
 * primer producto, proveedores, publicar el horario, invitar al equipo—, junto al
 * recorrido. Que desaparezca sola al completarla y que no les salga a quien ya lo
 * tiene todo».
 *
 * Arriba del Panel, debajo del recorrido. Cada paso dice lo que es en dos palabras y
 * **un toque lleva a hacerlo**, con lo que abre ya abierto: el logo en su hoja de
 * Ajustes, el producto y el proveedor con su «nuevo», la invitación con la suya. Lo
 * hecho se marca solo, porque lo mide el servidor con lo que hay de verdad en el
 * local, no con lo que se ha tocado aquí.
 *
 * Sale mientras falte algo; **con todo hecho no sale**, y quien termina el último
 * paso ve una vez «Tu local ya está en marcha». «No me lo recuerdes más» es el mismo
 * de «Termina de configurar», que esta tarjeta sustituye mientras está a la vista.
 */
export type PasoDeLaPuestaEnMarcha = 'logo' | 'producto' | 'proveedor' | 'horario' | 'equipo';

export interface LaPuestaEnMarcha {
  readonly pasos: readonly { readonly paso: PasoDeLaPuestaEnMarcha; readonly hecho: boolean }[];
  readonly oculta: boolean;
}

const COMO_ES: Readonly<
  Record<
    PasoDeLaPuestaEnMarcha,
    { readonly nombre: string; readonly icono: Icono; readonly ir: string }
  >
> = {
  logo: { nombre: 'Tu logo', icono: IconoColor, ir: '/ajustes/local#tu-marca' },
  producto: {
    nombre: 'Tu primer producto',
    icono: IconoAlmacen,
    ir: '/almacen/productos/todo?hacer=nuevo',
  },
  proveedor: {
    nombre: 'Tus proveedores',
    icono: IconoReparto,
    ir: '/almacen/compras/proveedores?hacer=nuevo',
  },
  horario: { nombre: 'Publicar el horario', icono: IconoCalendario, ir: '/calendario/turnos' },
  equipo: {
    nombre: 'Invitar a tu equipo',
    icono: IconoEquipo,
    ir: '/equipo/personas/con-acceso?hacer=invitar',
  },
};

/**
 * La consulta, para quien la necesite: «Termina de configurar» se aparta mientras sale.
 *
 * **Se vuelve a preguntar cada vez que se vuelve al Panel**: se sale de él a dar un
 * paso —crear el producto, invitar a alguien— y al volver tiene que estar marcado. Con
 * el minuto de siempre, el paso recién dado seguía pendiente (lo cazó su prueba).
 */
export function usarLaPuestaEnMarcha() {
  const { cliente, permisos, yo } = usarSesion();
  return useQuery({
    queryKey: ['la_puesta_en_marcha', {}],
    enabled: puedeVer(permisos, 'app.ajustes') && yo?.local !== null && yo?.local !== undefined,
    refetchOnMount: 'always',
    queryFn: async (): Promise<LaPuestaEnMarcha> => {
      const respuesta = await cliente.consultar<LaPuestaEnMarcha>('la_puesta_en_marcha', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}

/** Si está a la vista: con algo que hacer, y sin apagar. */
export function seEnsena(puesta: LaPuestaEnMarcha | undefined): boolean {
  return puesta !== undefined && !puesta.oculta && puesta.pasos.some((p) => !p.hecho);
}

export function PuestaEnMarcha() {
  const { cliente, yo } = usarSesion();
  const navegar = useNavigate();
  const cache = useQueryClient();
  const consulta = usarLaPuestaEnMarcha();
  const puesta = consulta.data;
  const visible = seEnsena(puesta);

  // Si se ha visto con algo pendiente en este rato y ahora está todo, se celebra una
  // vez; quien ya lo tenía todo al abrir no ve ni esto.
  const vistaAMedias = useRef(false);
  const [recienAcabada, setRecienAcabada] = useState(false);
  useEffect(() => {
    if (visible) vistaAMedias.current = true;
    else if (vistaAMedias.current && puesta !== undefined && !puesta.oculta) {
      vistaAMedias.current = false;
      setRecienAcabada(true);
    }
  }, [visible, puesta]);

  const apagar = useMutation({
    mutationFn: async () => {
      const respuesta = await cliente.ejecutar('ocultar_el_recordatorio_del_alta', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
    },
    onSuccess: async () => {
      vistaAMedias.current = false;
      await cache.invalidateQueries({ queryKey: ['la_puesta_en_marcha'] });
      await cache.invalidateQueries({ queryKey: ['el_alta'] });
    },
  });

  if (recienAcabada) {
    return (
      <section
        aria-label="Tu local, en marcha"
        className="flex items-center gap-e3 rounded-mayor border border-borde bg-superficie p-e4 [box-shadow:var(--sombra-tarjeta)]"
      >
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-grande bg-bien text-white"
        >
          <IconoHecho size={22} />
        </span>
        <p className="min-w-0 flex-1 text-cuerpo font-semibold">Tu local ya está en marcha</p>
        <Boton
          tono="texto"
          onClick={() => {
            setRecienAcabada(false);
          }}
        >
          Cerrar
        </Boton>
      </section>
    );
  }

  if (!visible || puesta === undefined) return null;

  const hechos = puesta.pasos.filter((p) => p.hecho).length;
  const cuantos = puesta.pasos.length;
  const local = yo?.local?.nombre ?? 'tu local';

  return (
    <section
      aria-label="Pon en marcha tu local"
      className="rounded-mayor border border-borde bg-superficie p-e4 [background-image:var(--relleno-tarjeta)] [box-shadow:var(--sombra-tarjeta)]"
    >
      <div className="flex items-center gap-e3">
        <Anillo
          parte={hechos / cuantos}
          color="var(--color-naranja)"
          tamano={48}
          grosor={5}
          titulo={`${hechos} de ${cuantos} hechos`}
        >
          <span className="text-etiqueta font-bold tabular-nums">
            {hechos}/{cuantos}
          </span>
        </Anillo>
        <div className="min-w-0 flex-1">
          <h2 className="text-cuerpo font-semibold">Pon en marcha {local}</h2>
          <p className="text-secundario text-texto-suave">
            {cuantos - hechos === 1 ? 'Te queda uno' : `Te quedan ${cuantos - hechos}`}
          </p>
        </div>
      </div>

      <ul className="mt-e3 grid gap-e1 sm:grid-cols-2 lg:grid-cols-3">
        {puesta.pasos.map(({ paso, hecho }) => {
          const como = COMO_ES[paso];
          return (
            <li key={paso}>
              <button
                type="button"
                disabled={hecho}
                onClick={() => {
                  navegar(como.ir);
                }}
                className={clases(
                  'flex min-h-toque w-full items-center gap-e3 rounded-grande px-e2 py-e2 text-left transition-colors duration-[--rapido]',
                  hecho ? 'cursor-default' : 'hover:bg-fondo',
                )}
              >
                <span
                  aria-hidden
                  className={clases(
                    'grid size-8 shrink-0 place-items-center rounded-redondo',
                    hecho ? 'bg-bien text-white' : 'bg-naranja-suave text-naranja',
                  )}
                >
                  {hecho ? <IconoHecho size={16} /> : <como.icono size={16} />}
                </span>
                <span
                  className={clases(
                    'min-w-0 flex-1 truncate text-secundario font-medium',
                    hecho && 'text-texto-suave line-through decoration-texto-tenue',
                  )}
                >
                  {como.nombre}
                  {hecho && <span className="sr-only"> · hecho</span>}
                </span>
                {!hecho && <IconoFlechaDerecha size={16} className="shrink-0 text-texto-tenue" />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-e2 flex justify-end">
        <Boton
          tono="texto"
          cargando={apagar.isPending}
          textoCargando="Quitando"
          onClick={() => {
            apagar.mutate();
          }}
        >
          No me lo recuerdes más
        </Boton>
      </div>
    </section>
  );
}
