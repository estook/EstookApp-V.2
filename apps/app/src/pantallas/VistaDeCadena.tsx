import { useNavigate } from 'react-router-dom';
import { IconoFlechaAbajo, IconoFlechaDerecha, IconoLocal } from '@estook/iconos';
import { Lista, TodaviaNo, Tarjeta } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El consolidado · la vista de cadena (M4).
 *
 * «Un area manager **no entra en un local: entra en su conjunto**» (Roles, 2.1).
 * Es uno de los dos criterios de terminado de M4, y por eso existe esta pantalla
 * aunque las cifras que la llenan sean de M17.
 *
 * ── Lo que hay hoy, y lo que no ──────────────────────────────────────────────
 *
 * Hay lo que M4 puede sostener de verdad: **la lista de sus locales y el boton de
 * entrar en cada uno**, que es lo que hace que el consolidado sea el sitio desde
 * el que se trabaja y no una pantalla de paso.
 *
 * No hay ventas, ni margen, ni «necesitan que vayas». No porque falte tiempo:
 * porque **esos datos no existen todavia**. Ventas es M12, margen es M8 y los
 * avisos son M22. Pintar aqui unas cifras inventadas seria lo peor que se puede
 * hacer en esta pantalla, porque son justamente las cifras con las que un area
 * manager decide a que local va manana.
 *
 * Asi que el hueco esta, dice de que modulo viene cada cosa, y se rellena solo
 * cuando lo que ponga sea verdad.
 */
const LO_QUE_LLEGARA = [
  {
    que: 'Necesitan que vayas',
    queHabra: 'los locales que se salen de objetivo, con su explicación',
    modulo: 'M8 y M12',
  },
  {
    que: 'Comparativa entre locales',
    queHabra: 'ventas, materia prima, personal y margen, uno al lado de otro',
    modulo: 'M17',
  },
  {
    que: 'Visitas y estándares',
    queHabra: 'las auditorías de cada local y su evolución',
    modulo: 'más adelante',
  },
  {
    que: 'El calendario del conjunto',
    queHabra: 'visitas, entregas grandes y cierres de todos tus locales',
    modulo: 'M14',
  },
] as const;

export function VistaDeCadena() {
  const { yo, cambiarDeSitio } = usarSesion();
  const navegar = useNavigate();

  if (!yo) return null;

  const suyos = yo.locales.filter((local) => local.organizacionId === yo.organizacion?.id);

  async function entrarEn(id: string) {
    // Si el cambio no sale, no se navega: quedarse aqui es lo unico honesto.
    if (!(await cambiarDeSitio({ local: id }))) return;
    navegar('/');
  }

  return (
    <div className="flex flex-col gap-e4">
      <div>
        <h1 className="text-pantalla font-semibold">{yo.organizacion?.nombre ?? 'Tu conjunto'}</h1>
        <p className="text-secundario text-texto-suave">
          {suyos.length} {suyos.length === 1 ? 'local' : 'locales'}. Entra en uno para trabajar en
          él; siempre puedes volver aquí.
        </p>
      </div>

      <Tarjeta titulo="Tus locales">
        <Lista
          titulo="Tus locales"
          elementos={suyos.map((local) => ({
            clave: local.id,
            titulo: local.nombre,
            // Los números llegan con M12 y M17. Hasta entonces esto no dice nada
            // que no sea verdad.
            detalle: 'Sin cifras todavía',
            delante: (
              <span className="text-texto-suave">
                <IconoLocal size={20} />
              </span>
            ),
            // La fila entera entra (26-sep): seis botones naranjas pegados unos a
            // otros gritaban más que los locales.
            alPulsar: () => {
              void entrarEn(local.id);
            },
            derecha: (
              <span className="flex shrink-0 items-center gap-e1 text-secundario font-semibold text-texto-suave">
                Entrar
                <IconoFlechaDerecha size={16} />
              </span>
            ),
          }))}
          cuandoNoHay={
            <TodaviaNo
              que="Tus locales"
              queHabra="En cuanto te asignen los tuyos, aparecerán aquí con sus cifras."
              modulo="M4"
            />
          }
        />
      </Tarjeta>

      {/*
        Lo que llegará aquí, **en una línea plegada** (26-sep). Eran cuatro carteles
        grandes de «todavía no tengo datos» en la pantalla con la que trabaja quien
        lleva varios locales: lo que todavía no existe no ocupa la pantalla.
      */}
      <details className="group rounded-mayor border border-borde bg-superficie px-e4 [box-shadow:var(--sombra-tarjeta)]">
        <summary className="flex min-h-toque cursor-pointer list-none items-center gap-e2 text-secundario font-semibold text-texto-suave [&::-webkit-details-marker]:hidden">
          Lo que llegará aquí
          <span className="ml-auto transition-transform group-open:rotate-180">
            <IconoFlechaAbajo size={16} />
          </span>
        </summary>
        <ul className="flex flex-col gap-e2 pb-e3 text-secundario">
          {LO_QUE_LLEGARA.map((cosa) => (
            <li key={cosa.que}>
              <span className="font-semibold">{cosa.que}</span>
              <span className="text-texto-suave">
                {' '}
                · {cosa.queHabra} ({cosa.modulo})
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
