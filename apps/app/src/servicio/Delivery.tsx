import { IconoReparto } from '@estook/iconos';
import { Aviso, Etiqueta, Tarjeta, clases } from '@estook/ui';

/**
 * Servicio · Delivery (el sitio, no la integración).
 *
 * ── Por qué esta pantalla existe antes que la integración ────────────────────
 *
 * Es lo mismo que se hizo con Fogón en M6 ([decisión 0015](../../../../docs/decisiones/0015-fogon-es-una-burbuja-no-una-pestana.md)):
 * **dónde vive algo es navegación, y la navegación se decide ahora**. Dejar el
 * reparto para M29 obligaría a rehacer la barra de Servicio, el menú lateral y el
 * catálogo de widgets cuando llegue, y a que hasta entonces la pregunta «¿y los
 * pedidos de Uber Eats?» no tuviera respuesta en ninguna parte de la aplicación.
 *
 * ── Y por qué no hay ni un botón de conectar ─────────────────────────────────
 *
 * «**Ninguna integración se da por disponible hasta verificar sus requisitos y
 * capacidades reales**» (Evolución 1.0, capítulo 16, y es la lección del 11.1).
 * Un botón «Conectar Uber Eats» que abriera un cartel sería el fallo que este
 * proyecto lleva persiguiendo desde M4, y en el sitio donde más caro sale: el que
 * hace pensar que el dinero ya está entrando solo.
 *
 * Lo que sí hay es **qué va a entrar por aquí, dicho por su nombre**, que es
 * información útil hoy: quien está montando su carta necesita saber que los
 * precios de delivery van a poder ser distintos, y quien está montando su
 * inventario, que esas ventas van a descontar género igual que las del TPV.
 */

/** Los canales, y por cuál se empieza. */
const CANALES = [
  {
    id: 'uber-eats',
    nombre: 'Uber Eats',
    estado: 'el primero' as const,
    queHara: 'Los pedidos entran solos, con su hora, su estado y lo que lleva cada uno.',
  },
  {
    id: 'glovo',
    nombre: 'Glovo',
    estado: 'después' as const,
    queHara: 'Mismo camino que Uber Eats, cuando esté el primero funcionando de verdad.',
  },
  {
    id: 'just-eat',
    nombre: 'Just Eat',
    estado: 'después' as const,
    queHara: 'Igual: un canal más sobre la misma carta, no una carta aparte.',
  },
];

export function Delivery() {
  return (
    <div className="flex flex-col gap-e3">
      <Aviso tono="info" titulo="El sitio está, la conexión llega con el módulo 29">
        Aquí van a entrar los pedidos de reparto, y por eso la pantalla existe ya: dónde vive cada
        cosa se decide antes de construirla, para no tener que mover la aplicación de sitio después.
        <strong> No hay nada que conectar todavía</strong>, y un botón que dijera lo contrario sería
        peor que no tenerlo.
      </Aviso>

      <Tarjeta titulo="Los canales" origen="Se empieza por Uber Eats · M29">
        <ul className="flex flex-col gap-e2">
          {CANALES.map((canal) => (
            <li
              key={canal.id}
              className={clases(
                'flex items-start gap-e3 rounded-medio border border-borde p-e3',
                canal.estado === 'después' && 'opacity-70',
              )}
            >
              <span className="mt-[2px] shrink-0 text-texto-suave">
                <IconoReparto size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-e2">
                  <span className="text-cuerpo font-medium">{canal.nombre}</span>
                  <Etiqueta tono={canal.estado === 'el primero' ? 'marca' : 'neutro'}>
                    {canal.estado === 'el primero' ? 'el primero' : 'después'}
                  </Etiqueta>
                </span>
                <span className="block text-secundario text-texto-suave">{canal.queHara}</span>
              </span>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Y qué cambia cuando esté" origen="Para que nada se construya dos veces">
        <ul className="flex flex-col gap-e3 text-secundario text-texto-suave">
          <li>
            <strong className="text-texto">Una venta de reparto es una venta.</strong> Descuenta
            género del libro de movimientos igual que la del TPV, así que el inventario no se entera
            de por dónde entró. Eso ya está construido.
          </li>
          <li>
            <strong className="text-texto">Pero el precio puede ser otro.</strong> Un plato puede
            valer distinto en la carta de sala y en la de reparto, con la comisión del canal por
            medio. Eso vive en Carta · Análisis · Por canal, y por eso el margen de delivery se mira
            aparte.
          </li>
          <li>
            <strong className="text-texto">Y el pedido tiene su reloj.</strong> Entra, se acepta, se
            prepara y sale, y ese reloj es lo que se enseña aquí: no es una lista de ventas, es lo
            que hay ahora mismo en la cocina.
          </li>
        </ul>
      </Tarjeta>
    </div>
  );
}
