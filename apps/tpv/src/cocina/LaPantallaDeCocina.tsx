import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { escucharAlSegundo, haySegundo } from '@estook/cliente-api/al-segundo';
import { Cargando, EstadoVacio } from '@estook/ui';
import { crearClienteDelTpv } from '../datos/cliente.ts';
import type { ElAparatoPorDentro, LaPantallaDeCocina, TarjetaDeCocina } from '../datos/tipos.ts';
import { FalloDeLaSala } from '../ganchos/usarLaSala.ts';
import {
  elColorDelTiempo,
  elPaseQueAcabaDeMarchar,
  separarLoProgramado,
  cuandoSeEmpieza,
  elPlatoQueSigue,
  losAcabados,
  loQueSuena,
  type ColorDelTiempo,
} from './laCocina.ts';
import { alCambiarSiSuena, despertar, puedeSonar, tocar } from './sonidos.ts';
import { usarPantallaEncendida, usarReloj } from '../ganchos/usarLaPantallaDeCocina.ts';
import { losNombres } from '../logica/texto.ts';
import { guardarLaCopia, leerLaCopia } from '../sinInternet/laCopia.ts';
import { hayCaja, loQueTieneLaCaja } from '../sinInternet/laCaja.ts';
import { conLoTachado, laCocinaConLoDeLaCaja } from './porLaCaja.ts';
import {
  escucharLosTachados,
  losTachados,
  subirLosTachados,
  tacharSinInternet,
} from './losTachados.ts';

/**
 * **La pantalla de cocina** (T4 · 1, decisión 0116; Anexo 3.2; maquetas de T4 1, 1b y 2).
 *
 * Se vincula una vez y **se queda siempre encendida, sin PIN** ni nadie dentro. Dos
 * pestañas: **En marcha**, lo que hay que sacar, y **Acabados**, lo que ya salió (lo de los
 * últimos 40 minutos a la vista, lo de antes plegado). **La cocina no confirma nada**: un
 * toque en un plato lo tacha, otro lo destacha; al tachar el último, la mesa pasa sola a
 * Acabados. Y «Llamar a Lucía», que le sale en su comandero.
 *
 * Suena al entrar una mesa, al marchar y con lo que pide mirar ya; la pantalla no se apaga
 * sola; y el teclado de cocina tacha con el número de cada tarjeta.
 *
 * **La pantalla de barra es esta misma** (T4 · 2, 0117), con lo que prepara la barra: sin
 * pases, todo en marcha al llegar. Y en las dos, **la alergia de la mesa en rojo**: la franja
 * arriba y «LLEVA GLUTEN» en el plato. No se confirma nada: se ve.
 *
 * **Sin internet** (T5 · 2 · 2, 0123): lo de antes sigue a la vista y se puede tachar; con la
 * caja de centro, lo nuevo le llega por ella. Lo tachado sube al volver.
 */

/** De dónde sale lo que se ve: de Estook, por la caja sin internet, o solo lo de antes. */
type DeDonde = 'estook' | 'por_la_caja' | 'sin_caja';
const POR_LA_CAJA_CADA = 1_500;

const DONDE = {
  direccion: (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '',
  clavePublica: (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '',
};
const CADA_POCO = 5_000;
const POR_SI_ACASO = 30_000;

const DEL_COLOR: Readonly<Record<ColorDelTiempo, string>> = {
  en_hora: 'bg-bien-suave text-bien',
  justo: 'bg-atencion-suave text-atencion',
  tarde: 'bg-mal-suave text-mal',
};

export function LaPantallaDeCocina({
  llave,
  aparato,
}: {
  readonly llave: string;
  readonly aparato: ElAparatoPorDentro;
}) {
  const cliente = useMemo(() => crearClienteDelTpv({ token: () => null }), []);
  const cache = useQueryClient();
  const [pestana, setPestana] = useState<'en_marcha' | 'acabados'>('en_marcha');
  const [conectado, setConectado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const suena = useSyncExternalStore(alCambiarSiSuena, puedeSonar, () => false);
  const ahora = usarReloj(30_000);
  const antes = useRef<LaPantallaDeCocina | undefined>(undefined);
  const [deDonde, setDeDonde] = useState<DeDonde>('estook');
  const tachados = useSyncExternalStore(escucharLosTachados, losTachados);
  usarPantallaEncendida();

  const clave = useMemo(() => ['pantalla_de_cocina', llave], [llave]);
  const datos = useQuery({
    queryKey: clave,
    queryFn: async () => {
      const respuesta = await cliente.ejecutar<LaPantallaDeCocina>('la_pantalla_de_cocina', {
        llave,
      });
      if (respuesta.ok) {
        setDeDonde('estook');
        guardarLaCopia('la_cocina', respuesta.datos);
        return respuesta.datos;
      }
      if (respuesta.error.codigo !== 'sin_conexion') throw new FalloDeLaSala(respuesta.error);
      // **Sin internet**: lo de antes, y lo que haya llegado a la caja encima (0123).
      const loDeAntes = leerLaCopia<LaPantallaDeCocina>('la_cocina');
      const llegado = hayCaja() ? await loQueTieneLaCaja() : null;
      if (loDeAntes === undefined) throw new FalloDeLaSala(respuesta.error);
      setDeDonde(llegado === null ? 'sin_caja' : 'por_la_caja');
      return llegado === null ? loDeAntes : laCocinaConLoDeLaCaja(loDeAntes, llegado, Date.now());
    },
    refetchInterval:
      deDonde === 'por_la_caja' ? POR_LA_CAJA_CADA : conectado ? POR_SI_ACASO : CADA_POCO,
    refetchOnWindowFocus: true,
  });

  // **Al segundo**: lo que pide la sala llega con un toque, y se vuelve a preguntar.
  const tema = aparato.temaAlSegundo;
  useEffect(() => {
    if (!haySegundo(DONDE) || tema === null) return undefined;
    const escucha = escucharAlSegundo(
      DONDE,
      tema,
      (canal) => {
        if (canal.startsWith('servicio:')) void cache.invalidateQueries({ queryKey: clave });
      },
      setConectado,
    );
    return () => {
      escucha.parar();
    };
  }, [tema, cache, clave]);

  // **Al volver internet**, lo tachado sin él sube, y se vuelve a leer lo de Estook.
  const hayTachados = tachados.length > 0;
  useEffect(() => {
    if (deDonde !== 'estook' || !hayTachados) return;
    void subirLosTachados((orden, lineaId) =>
      cliente.ejecutar(orden, { llave, linea_id: lineaId }),
    ).then(() => cache.invalidateQueries({ queryKey: clave }));
  }, [deDonde, hayTachados, cliente, llave, cache, clave]);

  // Suena con lo nuevo, comparado con lo de la vez anterior.
  const leido = datos.data;
  const lo = useMemo(
    () =>
      leido === undefined || deDonde === 'estook'
        ? leido
        : conLoTachado(leido, tachados, Date.now()),
    [leido, deDonde, tachados],
  );
  useEffect(() => {
    if (lo === undefined) return;
    const sonido = loQueSuena(antes.current, lo);
    antes.current = lo;
    if (sonido !== null && lo.ajustes.suena) tocar(sonido);
  }, [lo]);

  const hacer = useCallback(
    async (orden: string, entrada: Record<string, unknown>) => {
      setFallo(null);
      const respuesta = await cliente.ejecutar(orden, { llave, ...entrada });
      if (!respuesta.ok) setFallo(respuesta.error.quePasa);
      await cache.invalidateQueries({ queryKey: clave });
    },
    [cliente, llave, cache, clave],
  );
  const alTocarElPlato = useCallback(
    (lineaId: string, salio: boolean) => {
      // Sin internet se tacha aquí y sube al volver (0123).
      if (deDonde !== 'estook') {
        tacharSinInternet(lineaId, !salio);
        return;
      }
      void hacer(salio ? 'destachar_en_la_pantalla' : 'tachar_en_la_pantalla', {
        linea_id: lineaId,
      });
    },
    [hacer, deDonde],
  );

  // **El teclado de cocina**: la tecla de cada tarjeta tacha su siguiente plato. Lo programado
  // que aún no toca no lleva tecla (0121).
  const enMarcha = lo === undefined ? undefined : separarLoProgramado(lo.enMarcha, ahora).ya;
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      despertar();
      const n = Number(evento.key);
      if (!Number.isInteger(n) || n < 1 || n > 9 || enMarcha === undefined) return;
      const tarjeta = enMarcha[n - 1];
      const plato = tarjeta === undefined ? null : elPlatoQueSigue(tarjeta);
      if (plato !== null) alTocarElPlato(plato, false);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [enMarcha, alTocarElPlato]);

  const esBarra = aparato.funcion === 'barra' || lo?.prepara === 'barra';

  if (lo === undefined) {
    return (
      <main className="flex min-h-pantalla items-center justify-center bg-fondo p-e5 text-texto">
        {datos.isLoading ? (
          <Cargando que={esBarra ? 'la barra' : 'la cocina'} />
        ) : (
          <EstadoVacio
            esLaPagina
            titulo="No llegamos a Estook"
            frase="Puede ser la conexión. Se vuelve a probar solo."
            dibujo="perdido"
            sinAccionPorque="Se vuelve a probar solo."
          />
        )}
      </main>
    );
  }

  const acabados = losAcabados(lo.fuera, ahora);
  const { ya, programados } = separarLoProgramado(lo.enMarcha, ahora);
  const hora = new Date(ahora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="flex min-h-pantalla flex-col bg-fondo text-texto"
      onPointerDown={() => {
        despertar();
      }}
    >
      <header className="flex flex-wrap items-center gap-e3 border-b border-borde bg-superficie px-e4 py-e3">
        <div role="tablist" aria-label={esBarra ? 'Barra' : 'Cocina'} className="flex gap-e2">
          {(
            [
              ['en_marcha', `En marcha · ${String(lo.enMarcha.length + lo.esperando.length)}`],
              ['acabados', `Acabados · ${String(lo.fuera.length)}`],
            ] as const
          ).map(([id, texto]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pestana === id}
              onClick={() => {
                setPestana(id);
              }}
              className={[
                'min-h-toque rounded-redondo border-2 px-e4 text-cuerpo font-bold md:px-e5 md:text-seccion',
                pestana === id ? 'border-texto bg-texto text-fondo' : 'border-borde',
              ].join(' ')}
            >
              {texto}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {deDonde !== 'estook' && (
          <span className="rounded-redondo border border-borde px-e3 py-e1 text-secundario font-bold">
            {deDonde === 'por_la_caja' ? 'Por la caja' : 'Sin conexión'}
          </span>
        )}
        <span className="rounded-redondo bg-charcoal px-e3 py-e1 text-secundario font-bold">
          {aparato.nombre} · {lo.aparato.local}
        </span>
        <span className="text-seccion font-bold tabular-nums">{hora}</span>
      </header>

      {lo.ajustes.suena && !suena && (
        <button
          type="button"
          onClick={despertar}
          className="bg-atencion-suave px-e4 py-e3 text-left text-seccion font-bold text-atencion"
        >
          🔇 Toca la pantalla para que suene
        </button>
      )}
      {/* Sin internet (0123): con la caja todo sigue; sin ella, lo de antes sigue aquí. */}
      {deDonde === 'por_la_caja' && (
        <p role="status" className="border-b border-borde bg-superficie px-e4 py-e2 font-bold">
          Sin internet. Todo sigue funcionando en el local
        </p>
      )}
      {deDonde === 'sin_caja' && (
        <p role="status" className="bg-atencion-suave px-e4 py-e2 font-bold text-atencion">
          Lo nuevo no llega a esta pantalla. Lo de antes sigue aquí y se puede tachar
        </p>
      )}
      {fallo !== null && (
        <p role="alert" className="bg-mal-suave px-e4 py-e2 font-bold text-mal">
          {fallo}
        </p>
      )}

      <main className="flex-1 p-e4">
        {pestana === 'en_marcha' ? (
          lo.enMarcha.length + lo.esperando.length === 0 ? (
            <EstadoVacio
              titulo={esBarra ? 'Nada que servir' : 'Nada que sacar'}
              frase={
                esBarra
                  ? 'Cuando la sala pida bebida, cafés o copas, sale aquí y suena.'
                  : 'Cuando la sala mande una mesa, sale aquí y suena.'
              }
              dibujo="local"
              sinAccionPorque="Llega sola."
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] items-start gap-e3">
              {ya.map((t, i) => (
                <Tarjeta
                  key={t.cuentaId}
                  tarjeta={t}
                  tecla={i < 9 ? i + 1 : null}
                  ajustes={lo.ajustes}
                  alTocarElPlato={alTocarElPlato}
                  alLlamar={() => void hacer('llamar_al_camarero', { cuenta_id: t.cuentaId })}
                />
              ))}
              {lo.esperando.map((t) => (
                <Tarjeta
                  key={t.cuentaId}
                  tarjeta={t}
                  tecla={null}
                  ajustes={lo.ajustes}
                  alTocarElPlato={alTocarElPlato}
                  alLlamar={() => void hacer('llamar_al_camarero', { cuenta_id: t.cuentaId })}
                />
              ))}
              {/* Lo de llevar programado, al final y en gris, hasta que toca empezarlo (0121). */}
              {programados.map((t) => (
                <Tarjeta
                  key={t.cuentaId}
                  tarjeta={t}
                  tecla={null}
                  ajustes={lo.ajustes}
                  alTocarElPlato={alTocarElPlato}
                  todaviaNo
                />
              ))}
            </div>
          )
        ) : lo.fuera.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no ha salido nada hoy"
            frase={
              esBarra
                ? 'Al tachar lo último de una mesa, pasa aquí sola.'
                : 'Al tachar el último plato de una mesa, pasa aquí sola.'
            }
            dibujo="local"
            sinAccionPorque="Llega sola."
          />
        ) : (
          <div className="flex flex-col gap-e4">
            {acabados.recientes.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] items-start gap-e3">
                {acabados.recientes.map((t) => (
                  <Tarjeta
                    key={t.cuentaId}
                    tarjeta={t}
                    tecla={null}
                    ajustes={lo.ajustes}
                    alTocarElPlato={alTocarElPlato}
                  />
                ))}
              </div>
            )}
            {acabados.plegados.length > 0 && (
              <div className="flex flex-col rounded-mayor bg-superficie">
                {acabados.plegados.map((t) => (
                  <details key={t.cuentaId} className="border-b border-borde last:border-0">
                    <summary className="flex min-h-toque cursor-pointer items-center gap-e3 px-e4 font-bold">
                      {t.titulo}
                      <span className="text-secundario font-normal text-texto-suave">
                        {t.anulada !== null ? 'anulada' : 'salió'} a las {laHora(t.fueraEn)}
                      </span>
                    </summary>
                    <div className="p-e3">
                      <Tarjeta
                        tarjeta={t}
                        tecla={null}
                        ajustes={lo.ajustes}
                        alTocarElPlato={alTocarElPlato}
                      />
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function laHora(cuando: string | null): string {
  return cuando === null
    ? ''
    : new Date(cuando).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function Tarjeta({
  tarjeta: t,
  tecla,
  ajustes,
  alTocarElPlato,
  alLlamar,
  todaviaNo = false,
}: {
  readonly tarjeta: TarjetaDeCocina;
  readonly tecla: number | null;
  readonly ajustes: LaPantallaDeCocina['ajustes'];
  readonly alTocarElPlato: (lineaId: string, salio: boolean) => void;
  readonly alLlamar?: () => void;
  /** Lo de llevar programado que aún no toca empezar (0121): en gris, con su hora. */
  readonly todaviaNo?: boolean;
}) {
  const acabada = t.estado === 'fuera';
  const marcha = acabada ? null : elPaseQueAcabaDeMarchar(t);
  const color = elColorDelTiempo(t.minutos, ajustes);
  const borde =
    t.anulada !== null
      ? 'border-mal'
      : acabada
        ? 'border-bien/40'
        : t.conPrisa || color === 'tarde' || (t.alergias ?? []).length > 0
          ? 'border-mal'
          : marcha !== null
            ? 'border-bien'
            : 'border-transparent';
  return (
    <article
      aria-label={t.titulo}
      className={`overflow-hidden rounded-mayor border-[3px] bg-superficie ${borde} ${acabada ? 'opacity-80' : todaviaNo ? 'opacity-60' : ''}`}
    >
      {t.paraLas !== undefined && t.paraLas !== null && !acabada && (
        <p className="bg-info px-e3 py-e1 text-seccion font-bold text-fondo">
          PARA LAS {laHora(t.paraLas)}
          {todaviaNo
            ? ` · se empieza a las ${laHora(new Date(cuandoSeEmpieza(t) ?? 0).toISOString())}`
            : ''}
        </p>
      )}
      {t.anulada !== null ? (
        <p className="bg-mal px-e3 py-e1 text-etiqueta font-bold text-fondo">
          ANULADA{t.anulada === '' ? '' : ` · «${t.anulada}»`}
        </p>
      ) : acabada ? (
        <p className="bg-bien-suave px-e3 py-e1 text-etiqueta font-bold text-bien">
          ✓ SALIÓ A LAS {laHora(t.fueraEn)}
        </p>
      ) : (
        <>
          {t.conPrisa && (
            <p className="bg-atencion px-e3 py-e1 text-etiqueta font-bold text-fondo">
              ⚡ TIENEN PRISA
            </p>
          )}
          {(t.alergias ?? []).length > 0 && (
            <p className="bg-mal px-e3 py-e1 text-seccion font-bold text-fondo">
              ⚠ ALERGIA · {losNombres(t.alergias ?? []).toUpperCase()}
            </p>
          )}
          {marcha !== null && (
            <p className="bg-bien px-e3 py-e1 text-seccion font-bold text-fondo">
              ¡MARCHA EL {marcha}.º!
            </p>
          )}
          {t.estado === 'esperando' && (
            <p className="bg-charcoal px-e3 py-e1 text-etiqueta font-bold text-texto-suave">
              FUERA LO MARCHADO · ESPERANDO A QUE MARCHEN
            </p>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center gap-e2 px-e3 py-e2">
        {tecla !== null && (
          <span className="flex size-7 items-center justify-center rounded-medio bg-charcoal text-secundario font-bold">
            {tecla}
          </span>
        )}
        <h2 className="text-cifra-media font-bold">{t.titulo}</h2>
        {!acabada && (
          <span
            className={`ml-auto rounded-medio px-e2 text-seccion font-bold tabular-nums ${DEL_COLOR[color]}`}
          >
            {t.minutos}′
          </span>
        )}
        <span className="w-full text-secundario text-texto-suave">
          {[
            t.personas === null
              ? null
              : `${String(t.personas)} ${t.personas === 1 ? 'comensal' : 'comensales'}`,
            t.camarero,
            t.notaParaCocina,
          ]
            .filter((x) => x !== null && x !== '')
            .join(' · ')}
        </span>
      </div>
      {t.pases.map((pase) => (
        <div
          key={pase.numero}
          className={`border-t border-borde px-e3 pb-e2 ${pase.marchadoEn === null ? 'opacity-50' : ''}`}
        >
          {/* La barra no tiene pases (0117): sin título. */}
          {pase.numero > 0 && (
            <p className="pt-e2 text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
              {!t.porPases
                ? 'Todo junto'
                : acabada
                  ? `${String(pase.numero)}.º`
                  : `${String(pase.numero)}.º · ${pase.marchadoEn === null ? 'en espera' : 'en marcha'}`}
            </p>
          )}
          {pase.platos.map((p) => {
            const salio = p.salioEn !== null;
            const puede = !p.anulado && pase.marchadoEn !== null;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!puede}
                onClick={() => {
                  alTocarElPlato(p.id, salio);
                }}
                aria-pressed={salio}
                className="flex min-h-toque w-full items-baseline gap-e3 py-e1 text-left disabled:cursor-default"
              >
                <span className="min-w-[1.5rem] text-seccion font-bold tabular-nums">
                  {p.cantidad}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-seccion font-bold">
                    <span
                      className={
                        p.anulado
                          ? 'text-mal line-through'
                          : salio
                            ? 'text-texto-suave line-through'
                            : ''
                      }
                    >
                      {p.nombre}
                    </span>
                    {p.vuelve !== null && <Marca tono="bg-info text-fondo">VUELVE</Marca>}
                    {p.anulado && <Marca tono="bg-mal text-fondo">ANULADO</Marca>}
                    {p.nuevo && !p.anulado && <Marca tono="bg-info text-fondo">NUEVO</Marca>}
                    {p.cambio && <Marca tono="bg-atencion text-fondo">CAMBIO</Marca>}
                    {(p.lleva ?? []).length > 0 && !p.anulado && (
                      <Marca tono="bg-mal text-fondo">
                        {`LLEVA ${losNombres(p.lleva ?? []).toUpperCase()}`}
                      </Marca>
                    )}
                    {salio && (
                      <span className="ml-e2 text-secundario font-bold text-bien">
                        ✓ {laHora(p.salioEn)}
                      </span>
                    )}
                  </span>
                  {(p.opciones.length > 0 || p.delMenu || p.pesoGramos !== null) && (
                    <span className="text-secundario text-texto-suave">
                      {[
                        ...p.opciones,
                        p.pesoGramos === null ? null : `${String(p.pesoGramos)} g`,
                        p.delMenu ? 'menú' : null,
                      ]
                        .filter((x) => x !== null)
                        .join(' · ')}
                    </span>
                  )}
                  {p.vuelve !== null && p.vuelve !== '' && (
                    <span className="text-secundario text-info">«{p.vuelve}»</span>
                  )}
                  {p.nota !== null && p.nota !== '' && (
                    <span className="text-cuerpo font-bold text-atencion">{p.nota}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ))}
      {alLlamar !== undefined && t.camarero !== null && t.anulada === null && (
        <div className="border-t border-borde p-e3">
          {t.cocinaLlamaEn === null ? (
            <button
              type="button"
              onClick={alLlamar}
              className="min-h-toque rounded-grande border-2 border-borde px-e4 font-bold"
            >
              🛎 Llamar a {t.camarero}
            </button>
          ) : (
            <span className="text-secundario font-bold text-info">
              🛎 Llamada a las {laHora(t.cocinaLlamaEn)}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function Marca({ tono, children }: { readonly tono: string; readonly children: string }) {
  return (
    <span
      className={`ml-e2 inline-block rounded-medio px-e1 align-middle text-etiqueta font-bold ${tono}`}
    >
      {children}
    </span>
  );
}
