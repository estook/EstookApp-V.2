import { useNavigate } from 'react-router-dom';
import { IconoAtencion } from '@estook/iconos';
import { usarLoDeHoy } from '../ganchos/usarLoDeHoy.ts';

/**
 * Lo que le falta a Estook para funcionar bien · una línea, no un widget.
 *
 * ── Lo que sustituye ─────────────────────────────────────────────────────────
 *
 * «Salud de los datos» era **un widget entero** del Panel, con su título, su cifra
 * grande, su párrafo explicativo y su botón, para decir una sola cosa: cuántos
 * productos tienen precio. Y las otras dos cosas que prometía —cuántos platos
 * tienen ficha y cuántas están al día— son M9, así que la mayor parte de la tarjeta
 * era un letrero explicando lo que todavía no hay.
 *
 * En un móvil eso es una pantalla de scroll ocupada por un indicador que, en cuanto
 * el local está en marcha, **está siempre en verde**. Sitio gastado en la pantalla
 * que más se mira, y no se podía quitar.
 *
 * Ahora es esto: una línea que **solo aparece cuando falta algo**, que dice qué
 * falta y cuál, y que lleva ahí. Quien la quiera con su cifra y su histórico tiene
 * el widget «Productos sin precio» en el catálogo, y lo pone si le sirve.
 *
 * Es literalmente lo que pidió la pausa: «si hay objetos sin poner que avise en
 * panel pero con otro indicativo más pequeño y que indique cuál es».
 *
 * ── Y no dice nada cuando no hay nada que decir ──────────────────────────────
 *
 * Ni «todo correcto», ni un tick verde, ni «0 productos sin precio». Un aviso que
 * también aparece cuando no hay aviso es un aviso que se deja de leer, y la
 * Evolución 1.0 lo dice con estas palabras: «una alerta que no se puede accionar no
 * es una alerta, es ruido».
 */
export function LoQueFalta() {
  const navegar = useNavigate();
  const consulta = usarLoDeHoy();

  const hoy = consulta.data;
  if (hoy === undefined) return null;

  const sinPrecio = hoy.sinPrecio;
  if (sinPrecio.length === 0) return null;

  // Los tres primeros por su nombre. Decir «faltan 12» sin decir cuáles obliga a
  // ir a buscarlos; decir los doce llena el Panel. Tres y «y N más» es lo que
  // permite saber si importa sin salir de aquí.
  const cuales = sinPrecio
    .slice(0, 3)
    .map((p) => p.nombre)
    .join(', ');
  const yMas = sinPrecio.length > 3 ? ` y ${sinPrecio.length - 3} más` : '';

  return (
    <button
      type="button"
      onClick={() => {
        navegar('/inventario/productos/sin-precio');
      }}
      className="flex w-full min-h-toque items-center gap-e2 rounded-medio border border-borde bg-superficie px-e3 py-e2 text-left hover:bg-fondo"
    >
      <span className="shrink-0 text-atencion">
        <IconoAtencion size={16} />
      </span>
      <span className="min-w-0 flex-1 text-secundario">
        <strong className="font-medium">
          {sinPrecio.length === 1
            ? '1 producto sin precio'
            : `${sinPrecio.length} productos sin precio`}
        </strong>
        <span className="text-texto-suave">
          {' · '}
          {cuales}
          {yMas}
        </span>
      </span>
      <span className="shrink-0 text-secundario font-medium text-texto-suave">Ponérselo</span>
    </button>
  );
}
