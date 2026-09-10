import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NOMBRE_DE_COMO_SE_CIERRA, QUE_ES_CADA_FORMA_DE_CERRAR, TPVS } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { Boton, ErrorEnCristiano, Selector, Tarjeta, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { aplazar, estaAplazado } from '../pantallas/recordatorios.ts';
import type { MisCierres } from './contrato.ts';

/**
 * ¿Cómo entran tus ventas? · la pregunta que sustituye a «Conecta tu TPV».
 *
 * ── Lo que había ────────────────────────────────────────────────────────────
 *
 * Una tarjeta fija en el Panel que pedía «Conecta tus ventas» con un botón que no
 * conectaba nada —el asistente es M18— y un «recuérdamelo». Pedía siempre lo mismo
 * y no se podía resolver, que es la definición de una tarjeta que se aprende a
 * ignorar. Y dejaba fuera a quien **no va a conectar nada nunca**: un bar con una
 * caja de veinte años.
 *
 * ── Lo que hay ──────────────────────────────────────────────────────────────
 *
 * Dos caminos, y se elige uno:
 *
 *   · **Lo apunto yo.** Al cerrar la caja se escribe el total y, si se quiere, qué
 *     platos han salido. O se sube el fichero de ventas del TPV.
 *   · **Lo trae mi TPV.** Se dice cuál. La conexión llega con su módulo, y
 *     mientras tanto se puede cerrar a mano igual.
 *
 * Se pregunta **una vez** —en el Panel— y se cambia en Ajustes. Y por debajo los
 * dos acaban en la misma tabla, así que cambiar de camino no pierde nada.
 *
 * El mismo componente sirve para los tres sitios donde sale: la tarjeta del Panel,
 * Ajustes y la pantalla del cierre. Una pregunta, un solo sitio donde se contesta.
 */
export function ComoEntranTusVentas({ modo }: { readonly modo: 'tarjeta' | 'ajustes' | 'alta' }) {
  const { cliente, permisos, yo } = usarSesion();
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [escondida, setEscondida] = useState(() => estaAplazado('tpv'));

  const puedeElegir = puedeEditar(permisos, 'app.ajustes');
  const consulta = useQuery({
    queryKey: ['mis_cierres', 'como'],
    enabled: puedeVer(permisos, 'dato.ventas') && yo?.local !== null && yo?.local !== undefined,
    retry: 1,
    queryFn: async (): Promise<MisCierres> => {
      const respuesta = await cliente.consultar<MisCierres>('mis_cierres', { limite: '1' });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const como = consulta.data?.comoSeCierra ?? null;
  const [tpv, setTpv] = useState<string>('');
  const tpvPuesto = consulta.data?.tpv ?? null;

  async function elegir(nuevo: 'a_mano' | 'tpv', cual: string | null) {
    setError(null);
    setGuardando(true);
    const respuesta = await cliente.ejecutar('elegir_como_se_cierra', {
      como: nuevo,
      ...(nuevo === 'tpv' ? { tpv: cual } : {}),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['mis_cierres'] });
    await cache.invalidateQueries({ queryKey: ['un_cierre'] });
  }

  if (!puedeElegir || como === null) return null;

  // En el Panel solo sale **mientras no se ha elegido**. Una vez elegido, la
  // tarjeta ya no tiene nada que pedir, y una tarjeta que no pide nada es ruido.
  if (modo === 'tarjeta' && (como !== 'sin_decidir' || escondida)) return null;

  const opciones: readonly ('a_mano' | 'tpv')[] = ['a_mano', 'tpv'];

  const cuerpo = (
    <div className="flex flex-col gap-e3">
      {error !== null && <ErrorEnCristiano error={error} />}

      <div
        role="radiogroup"
        aria-label="Cómo entran tus ventas"
        className="grid gap-e2 sm:grid-cols-2"
      >
        {opciones.map((cual) => {
          const puesta = como === cual;
          return (
            <button
              key={cual}
              type="button"
              role="radio"
              aria-checked={puesta}
              disabled={guardando}
              onClick={() => {
                if (cual === 'a_mano') void elegir('a_mano', null);
                else void elegir('tpv', tpvPuesto ?? (tpv === '' ? null : tpv));
              }}
              className={clases(
                'flex min-h-toque flex-col items-start gap-e1 rounded-medio border p-e3 text-left',
                puesta
                  ? 'border-naranja bg-naranja-suave'
                  : 'border-borde-fuerte bg-superficie hover:bg-fondo',
              )}
            >
              <span className="text-cuerpo font-semibold">{NOMBRE_DE_COMO_SE_CIERRA[cual]}</span>
              <span className="text-secundario text-texto-suave">
                {QUE_ES_CADA_FORMA_DE_CERRAR[cual]}
              </span>
            </button>
          );
        })}
      </div>

      {como === 'tpv' && (
        <div className="flex flex-col gap-e2">
          <Selector
            etiqueta="Qué TPV tienes"
            opciones={TPVS.map((nombre) => ({ valor: nombre, texto: nombre }))}
            sinElegir="Elígelo"
            value={tpvPuesto ?? tpv}
            onChange={(e) => {
              const cual = e.currentTarget.value;
              setTpv(cual);
              void elegir('tpv', cual === '' ? null : cual);
            }}
          />
          <p className="text-secundario text-texto-suave">
            La conexión llega con el módulo de conectores. Hasta entonces, cierra la caja a mano o
            sube el fichero de ventas que saca tu TPV: acaba en el mismo sitio.
          </p>
        </div>
      )}
    </div>
  );

  // En la última pantalla del alta: la misma pregunta, sin «recuérdamelo». Dejarla
  // sin contestar es pulsar «Entrar», y entonces la vuelve a hacer el Panel.
  if (modo === 'alta') {
    return (
      <section
        aria-labelledby="como-entran-tus-ventas"
        className="rounded-medio border border-borde bg-superficie p-e4"
      >
        <h2
          id="como-entran-tus-ventas"
          className="mb-e3 text-etiqueta uppercase tracking-wide text-texto-suave"
        >
          ¿Cómo entran tus ventas?
        </h2>
        {cuerpo}
        <p className="mt-e3 text-secundario text-texto-suave">
          Se puede cambiar cuando quieras en Ajustes.
        </p>
      </section>
    );
  }

  if (modo === 'ajustes') {
    return (
      <Tarjeta titulo="Tus ventas">
        {/* El ancla del buscador: «cómo entran las ventas» lleva aquí. */}
        <span id="tus-ventas" />
        {cuerpo}
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo="¿Cómo entran tus ventas?">
      {cuerpo}
      <div className="mt-e3 flex flex-wrap items-center gap-e2">
        <Boton
          tono="texto"
          onClick={() => {
            aplazar('tpv');
            setEscondida(true);
          }}
        >
          Recuérdamelo
        </Boton>
        <p className="text-secundario text-texto-suave">
          Se puede cambiar cuando quieras en Ajustes.
        </p>
      </div>
    </Tarjeta>
  );
}
