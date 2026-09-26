import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { plural } from '@estook/dominio';
import { IconoAnadir, IconoCerrar, IconoHecho, IconoTablon } from '@estook/iconos';
import { ErrorEnCristiano, clases } from '@estook/ui';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CLAVE_DEL_TABLON, usarElTablon, type NotaDelTablon } from '../ganchos/usarElTablon.ts';

/**
 * El Tablón · el corcho de la cocina, en el Panel (repaso del 25-sep · 0049).
 *
 * «Poder poner mensajes compartidos y avisos tipo reservas: "reserva a las 5:00 de
 * 20 personas", y marcas como leído.» (Richi) Como el tablón de 7shifts o las
 * noticias de Deputy, y con lo que en un bar se entiende sin explicarlo: una
 * chincheta, lo que hay por leer arriba y un «Leído» en cada nota.
 *
 * ── Poco, y lo que importa ───────────────────────────────────────────────────
 *
 *   · **Sin notas, se ve igual**, con una línea para escribir la primera: escondido,
 *     nadie sabía que existía (Richi, 26-sep: «el tablón no lo veo en el Panel»).
 *   · Lo que no has leído, arriba y con su punto, y lo tuyo; lo leído, plegado.
 *   · Quien la escribió ve quién la ha leído; quien lleva al equipo, además, quién
 *     falta. Los demás, solo su «Leído».
 *   · Con hora, sale también en «Hoy» y en el Calendario, y su botón trae aquí
 *     (`?nota=`), con la nota señalada.
 */
export function Tablon({ alEscribir }: { readonly alEscribir: () => void }) {
  const consulta = usarElTablon();
  const [verLeidas, setVerLeidas] = useState(false);
  const [parametros] = useSearchParams();
  const senalada = parametros.get('nota');

  const notas = consulta.data?.notas;
  // Mientras carga, o si no se ha podido leer, nada: el Panel no se llena de un
  // «cargando» arriba del todo, igual que «Hoy».
  if (notas === undefined) return null;
  if (notas.length === 0) {
    return (
      <section
        aria-label="Tablón"
        className="flex min-h-toque items-center gap-e2 rounded-mayor border border-borde bg-superficie px-e4 py-e1 [box-shadow:var(--sombra-tarjeta)]"
      >
        <span className="shrink-0 text-texto-suave">
          <IconoTablon size={18} />
        </span>
        <h2 className="text-cuerpo font-semibold">Tablón</h2>
        <p className="min-w-0 truncate text-secundario text-texto-suave">Sin avisos.</p>
        <button
          type="button"
          onClick={alEscribir}
          className="-mr-e2 ml-auto inline-flex min-h-toque shrink-0 items-center gap-e1 px-e2 text-secundario font-semibold text-texto-suave hover:text-texto"
        >
          <IconoAnadir size={16} />
          Escribir
        </button>
      </section>
    );
  }

  // Lo que no has leído, y **lo tuyo**, que no se pliega nunca: quien escribe una
  // nota la quiere ver, y ver quién la ha leído. Se plegaba como «leída» y se perdía
  // en cuanto otro escribía algo (lo cazó Safari, 26-sep).
  const porLeer = notas.filter((n) => !n.leida || n.esMia);
  const sinLeer = notas.filter((n) => !n.leida).length;
  const leidas = notas.filter((n) => n.leida && !n.esMia);
  // Con algo a la vista, lo leído se pliega; sin nada, se ven las dos primeras.
  const lasLeidasQueSeVen = verLeidas ? leidas : porLeer.length > 0 ? [] : leidas.slice(0, 2);
  const plegadas = leidas.length - lasLeidasQueSeVen.length;

  return (
    <section
      aria-label="Tablón"
      className="overflow-hidden rounded-mayor border border-borde bg-superficie [box-shadow:var(--sombra-tarjeta)]"
    >
      <div className="flex items-center gap-e2 px-e4 pt-e2">
        <span className="text-texto-suave">
          <IconoTablon size={18} />
        </span>
        <h2 className="text-cuerpo font-semibold">Tablón</h2>
        {sinLeer > 0 && (
          <span className="rounded-redondo bg-naranja-suave px-e2 py-[1px] text-etiqueta font-semibold text-texto">
            {plural(sinLeer, 'sin leer', 'sin leer')}
          </span>
        )}
        <button
          type="button"
          onClick={alEscribir}
          className="-mr-e2 ml-auto inline-flex min-h-toque items-center gap-e1 px-e2 text-secundario font-semibold text-texto-suave hover:text-texto"
        >
          <IconoAnadir size={16} />
          Escribir
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-borde px-e4 pb-e1">
        {[...porLeer, ...lasLeidasQueSeVen].map((nota) => (
          <NotaEnElTablon key={nota.id} nota={nota} senalada={nota.id === senalada} />
        ))}
      </ul>

      {plegadas > 0 && (
        <button
          type="button"
          onClick={() => {
            setVerLeidas(true);
          }}
          className="min-h-toque w-full border-t border-borde px-e4 text-left text-secundario font-medium text-texto-suave hover:text-texto"
        >
          {plegadas === 1 ? 'Ver la leída' : `Ver las ${String(plegadas)} leídas`}
        </button>
      )}
    </section>
  );
}

function NotaEnElTablon({
  nota,
  senalada,
}: {
  readonly nota: NotaDelTablon;
  readonly senalada: boolean;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const fila = useRef<HTMLLIElement>(null);
  const [verLectura, setVerLectura] = useState(false);
  const [quitando, setQuitando] = useState(false);

  // La que trae «Hoy» o el Calendario, a la vista y señalada.
  useEffect(() => {
    if (senalada) fila.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [senalada]);

  const alDia = async () => {
    await cache.invalidateQueries({ queryKey: CLAVE_DEL_TABLON });
    await cache.invalidateQueries({ queryKey: ['lo_de_hoy'] });
  };

  const leer = useMutation({
    mutationFn: async () => {
      const respuesta = await cliente.ejecutar('marcar_nota_leida', { nota_id: nota.id });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    onSuccess: alDia,
  });

  const quitar = useMutation({
    mutationFn: async () => {
      const respuesta = await cliente.ejecutar('quitar_nota', { nota_id: nota.id });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    onSuccess: alDia,
  });

  const fallo = leer.error ?? quitar.error;
  const cuando = [nota.cuando, nota.hora].filter((t) => t !== null).join(' · ');
  const deQuien = nota.esMia ? 'tuya' : `de ${nota.autor}`;
  const para = nota.zona === null ? null : nota.zona === 'cocina' ? 'Cocina' : 'Sala';

  return (
    <li
      ref={fila}
      className={clases(
        'flex flex-col gap-e1 py-e2',
        senalada && '-mx-e2 rounded-grande px-e2 ring-2 ring-naranja',
      )}
    >
      <div className="flex items-center gap-e3">
        <span
          aria-hidden
          className={clases(
            'size-[8px] shrink-0 rounded-redondo',
            nota.leida ? 'bg-transparent' : 'bg-naranja',
          )}
        />
        <span className="min-w-0 flex-1">
          <span
            className={clases(
              'block text-secundario leading-snug',
              nota.leida ? 'text-texto-suave' : 'font-medium',
            )}
          >
            {nota.texto}
          </span>
          <span className="block truncate text-etiqueta text-texto-suave">
            {cuando} · {deQuien}
            {para === null ? '' : ` · ${para}`}
          </span>
        </span>
        <span className="-mr-e2 flex shrink-0 items-center">
          {!nota.leida && (
            <button
              type="button"
              disabled={leer.isPending}
              onClick={() => {
                leer.mutate();
              }}
              className="group inline-flex min-h-toque items-center px-e1"
            >
              <span className="whitespace-nowrap rounded-redondo bg-fondo px-e3 py-[6px] text-secundario font-semibold text-texto group-hover:bg-borde/60">
                Leído
              </span>
            </button>
          )}
          {nota.lectura !== null && (
            <button
              type="button"
              aria-expanded={verLectura}
              onClick={() => {
                setVerLectura(!verLectura);
              }}
              aria-label={`Quién la ha leído: ${plural(nota.lectura.leidas, 'persona', 'personas')}`}
              className="inline-flex min-h-toque items-center gap-[2px] px-e2 text-etiqueta font-semibold text-texto-suave hover:text-texto"
            >
              <IconoHecho size={14} />
              {nota.lectura.leidas}
            </button>
          )}
          {nota.puedeQuitarla &&
            (quitando ? (
              <button
                type="button"
                disabled={quitar.isPending}
                onClick={() => {
                  quitar.mutate();
                }}
                className="inline-flex min-h-toque items-center px-e2 text-secundario font-semibold text-mal"
              >
                Quitar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQuitando(true);
                }}
                aria-label={`Quitar del tablón «${nota.texto}»`}
                className="grid size-toque place-items-center rounded-redondo text-texto-tenue hover:text-texto"
              >
                <IconoCerrar size={16} />
              </button>
            ))}
        </span>
      </div>

      {verLectura && nota.lectura !== null && (
        <p className="pl-e5 text-etiqueta text-texto-suave">
          {nota.lectura.quien.length === 0
            ? 'Nadie la ha leído todavía.'
            : `Leída por ${nota.lectura.quien.join(', ')}.`}
          {nota.lectura.faltan !== null && nota.lectura.faltan.length > 0
            ? ` Falta${nota.lectura.faltan.length === 1 ? '' : 'n'} ${nota.lectura.faltan.join(', ')}.`
            : ''}
        </p>
      )}

      {fallo instanceof FalloDeLaApi && <ErrorEnCristiano error={fallo.error} />}
    </li>
  );
}
