import { useNavigate } from 'react-router-dom';
import { IconoLocal } from '@estook/iconos';
import { Boton, Lista, TodaviaNo, Tarjeta, clases } from '@estook/ui';
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
export function VistaDeCadena() {
  const { yo, cliente, refrescar } = usarSesion();
  const navegar = useNavigate();

  if (!yo) return null;

  const suyos = yo.locales.filter((local) => local.organizacionId === yo.organizacion?.id);

  async function entrarEn(id: string) {
    await cliente.ejecutar('cambiar_de_contexto', { local_id: id });
    await refrescar();
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
            derecha: (
              <Boton
                tono="principal"
                onClick={() => {
                  void entrarEn(local.id);
                }}
              >
                Entrar
              </Boton>
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

      <div className={clases('grid gap-e3', 'sm:grid-cols-2')}>
        <TodaviaNo
          que="Necesitan que vayas"
          queHabra="Los locales que se salen de objetivo, con su explicación y el botón de entrar."
          modulo="M8 y M12, que son los que traen el margen y las ventas"
        />
        <TodaviaNo
          que="Comparativa entre locales"
          queHabra="Ventas, materia prima, personal y margen de cada local, uno al lado de otro."
          modulo="M17 · Negocio"
        />
        <TodaviaNo
          que="Visitas y estándares"
          queHabra="Las auditorías de local con sus plantillas, la nota de cada uno y su evolución."
          modulo="su propio módulo, más adelante"
        />
        <TodaviaNo
          que="El calendario del conjunto"
          queHabra="Tus visitas, las entregas grandes y los cierres de todos tus locales a la vez."
          modulo="M11 · Calendario"
        />
      </div>
    </div>
  );
}
