import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { IconoAbrirFuera } from '@estook/iconos';
import { cuandoFue, plural } from '@estook/dominio';
import { Aviso, Boton, Cargando, EstadoVacio, Tarjeta, Tendencia } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import type { MiNotaEnGoogle } from './contrato.ts';

/**
 * Negocio → Reseñas · la nota en Google (entrega R2, mejora 19 · decisión 0053).
 *
 * La nota del local, cuántas reseñas tiene y cómo ha ido, y un enlace a Google para
 * leerlas. **Al abrirla, si lleva más de un día sin mirarse, se trae otra vez**
 * (`mirar_mi_nota_de_google`): es la mitad del punto medio que pidió Richi; la otra
 * mitad es el reloj, cada tres días. Si baja, avisa la campana y lleva aquí.
 *
 * Leer cada reseña y contestarla desde Estook espera a que Google apruebe Business
 * Profile (M23): se dice plegado, sin prometer fecha.
 */
const ACENTO = 'var(--color-app-negocio)';

function nota(valor: number): string {
  return valor.toFixed(1).replace('.', ',');
}

export function Resenas() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const navegar = useNavigate();
  const consulta = usarLectura<MiNotaEnGoogle>('mi_nota_en_google');
  const mirada = useRef(false);

  // Una vez por visita: el servidor decide si toca (más de un día) y cuenta el tope.
  useEffect(() => {
    if (mirada.current) return;
    mirada.current = true;
    void (async () => {
      const respuesta = await cliente.ejecutar<{ actualizada: boolean }>(
        'mirar_mi_nota_de_google',
        {},
      );
      if (respuesta.ok && respuesta.datos.actualizada) {
        await cache.invalidateQueries({ queryKey: ['mi_nota_en_google'] });
      }
    })();
  }, [cliente, cache]);

  if (consulta.isPending) return <Cargando que="tu nota en Google" lineas={3} />;
  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tu nota en Google">
        Vuelve a intentarlo dentro de un momento.
      </Aviso>
    );
  }

  const datos = consulta.data;
  const laNota = datos.nota;

  if (laNota === null) {
    return (
      <Tarjeta acento={ACENTO}>
        <EstadoVacio
          compacto
          dibujo="local"
          acento={ACENTO}
          titulo="Tu local todavía no está enlazado con Google"
          frase="Enlázalo una vez y aquí verás su nota, cuántas reseñas tiene y cómo va cambiando."
          {...(datos.puedeEnlazarlo
            ? {
                accion: (
                  <Boton
                    tono="principal"
                    onClick={() => {
                      navegar('/ajustes/local#google');
                    }}
                  >
                    Enlazarlo con Google
                  </Boton>
                ),
              }
            : { sinAccionPorque: 'Lo enlaza quien lleva los ajustes del local.' })}
        />
      </Tarjeta>
    );
  }

  // «hace 3 h», o «el 12 sep» pasado un día.
  const cuando = cuandoFue(new Date(laNota.leidaEn), new Date(Date.now()));
  const leida = cuando === 'Ahora' ? 'ahora mismo' : /^d/.test(cuando) ? `el ${cuando}` : cuando;
  const evolucion = datos.evolucion;

  return (
    <div className="flex flex-col gap-e4">
      <Tarjeta
        titulo="Tu nota en Google"
        acento={ACENTO}
        origen={`Leída ${leida}. Se mira sola cada tres días.`}
      >
        <div className="flex flex-col gap-e3">
          <div className="flex flex-wrap items-baseline gap-x-e3 gap-y-e1">
            <p className="text-[2.5rem] font-bold leading-none tabular-nums">
              {laNota.valoracion === null ? '—' : `★ ${nota(laNota.valoracion)}`}
            </p>
            {laNota.resenas !== null && (
              <p className="text-cuerpo text-texto-suave">
                {plural(laNota.resenas, 'reseña', 'reseñas')}
              </p>
            )}
          </div>

          {evolucion.length >= 2 && (
            <Tendencia
              valores={evolucion.map((e) => e.valoracion)}
              titulo="Tu nota en Google, día a día"
              color={ACENTO}
              alto={56}
              formato={(v) => `★ ${nota(v)}`}
            />
          )}

          {laNota.mapa !== null && (
            <div>
              <a
                href={laNota.mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-toque items-center gap-e2 rounded-medio border border-borde px-e4 font-medium hover:bg-fondo"
              >
                Ver las reseñas en Google
                <IconoAbrirFuera size={16} aria-hidden />
              </a>
            </div>
          )}

          <details className="text-secundario text-texto-suave">
            <summary className="cursor-pointer">¿Y contestarlas desde aquí?</summary>
            <p className="mt-e2">
              Cuando Google apruebe el acceso a tu ficha (Business Profile), aquí leerás cada reseña
              y Estook te propondrá una respuesta que mandas tú. Mientras, se contestan en Google.
            </p>
          </details>
        </div>
      </Tarjeta>
    </div>
  );
}
