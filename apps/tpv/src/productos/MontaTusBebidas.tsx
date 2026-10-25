import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  CAFES_DE_SERIE,
  centimos,
  comoSeLeeLaCantidad,
  resta,
  sinIva,
  type Centimos,
} from '@estook/dominio';
import {
  Aviso,
  Boton,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Interruptor,
  Selector,
  filtrarPorParecido,
} from '@estook/ui';
import type { LasBebidasParaMontar } from '../datos/tipos.ts';
import { FalloDeLaSala, usarAcciones } from '../ganchos/usarLaSala.ts';
import { euros } from '../logica/texto.ts';
import { irA } from '../navegar.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Monta tus bebidas** (T3 · 2 · 2, maquetas 1 a 3; 0106, 19 a 23): Ajustes del TPV ›
 * Productos › Monta tus bebidas. Tres pestañas:
 *
 *   · **Bebidas**: lo que hay en el almacén, agrupado por la página a la que va, con lo que se
 *     propone (la caña, la doble y la jarra; la copa de vino y la botella; la lata entera), lo
 *     que cuesta cada ración y su precio. Buscador, «Solo lo que falta» y «Mismo precio a todas»
 *   · **Copas**: las botellas, con la dosis de la casa (o la suya) y el «¿Con qué?» con los
 *     refrescos; y lo que te deja cada copa
 *   · **Cafés**: los de serie, que se encienden y llevan su precio
 *
 * Cada cosa que se pone es un plato de tu carta, con su botón y su escandallo.
 */

const CLAVE = ['bebidas_para_montar'];

/** El IVA de lo que se sirve en el local (0111, punto 11). */
const IVA_DE_LA_SALA = 0.1;

/** Las dosis que se eligen, de la casa o de una botella, con la que ya tiene si es otra. */
function lasDosis(laQueHay: number | null): { valor: string; texto: string }[] {
  const comunes = [20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80];
  const todas =
    laQueHay === null || comunes.includes(laQueHay)
      ? comunes
      : [...comunes, laQueHay].sort((a, b) => a - b);
  return todas.map((ml) => ({ valor: String(ml), texto: `${String(ml)} ml` }));
}

type Pestana = 'bebidas' | 'copas' | 'cafes';

export function MontaTusBebidas() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const ejecutar = usarAcciones();
  const [pestana, setPestana] = useState<Pestana>('bebidas');
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const datos = useQuery({
    queryKey: CLAVE,
    queryFn: async () => {
      const respuesta = await cliente.consultar<LasBebidasParaMontar>('las_bebidas_para_montar');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- la forma de lo que vuelve la afirma quien llama, como en `ejecutar<T>`
  async function orden<T>(nombre: string, entrada: unknown, dice: (r: T) => string) {
    setFallo(null);
    setHecho(null);
    const r = await ejecutar<T>(nombre, entrada);
    if (!r.ok) {
      setFallo(r.error);
      return false;
    }
    await Promise.all([
      cache.invalidateQueries({ queryKey: CLAVE }),
      cache.invalidateQueries({ queryKey: ['botonera'] }),
      cache.invalidateQueries({ queryKey: ['carta_de_la_sala'] }),
      cache.invalidateQueries({ queryKey: ['grupos_de_opciones'] }),
    ]);
    // Después de poner la lista al día: que el «✓» no salga con lo puesto todavía a la vista.
    setHecho(dice(r.datos));
    return true;
  }

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-center gap-e3">
        <Boton
          tono="texto"
          onClick={() => {
            irA('ajustes/productos');
          }}
        >
          ‹ Productos
        </Boton>
        <h1 className="text-pantalla font-bold">Monta tus bebidas</h1>
      </div>
      <div role="radiogroup" aria-label="Qué se monta" className="flex flex-wrap gap-e1">
        {(
          [
            ['bebidas', 'Bebidas'],
            ['copas', 'Copas'],
            ['cafes', 'Cafés'],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={pestana === valor}
            onClick={() => {
              setPestana(valor);
              setHecho(null);
            }}
            className={[
              'min-h-toque rounded-grande px-e5 font-semibold',
              pestana === valor ? 'bg-texto text-fondo' : 'border-2 border-borde',
            ].join(' ')}
          >
            {texto}
          </button>
        ))}
      </div>
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {hecho !== null && (
        <p role="status" className="font-semibold text-bien">
          {hecho}
        </p>
      )}
      {datos.isLoading ? (
        <Cargando que="las bebidas de tu almacén" />
      ) : datos.error instanceof FalloDeLaSala ? (
        <ErrorEnCristiano error={datos.error.error} />
      ) : datos.data === undefined ? null : !datos.data.puedeMontarlas ? (
        <Aviso tono="atencion" titulo="Hace falta poder cambiar la carta y Escandallos">
          Montar las bebidas las pone en tu carta y en Escandallos: lo hace quien puede cambiar las
          dos.
        </Aviso>
      ) : pestana === 'bebidas' ? (
        <LasBebidas
          datos={datos.data}
          alPoner={(bebidas) =>
            orden<{ puestas: number; yaEstaban: string[] }>('montar_bebidas', { bebidas }, (r) =>
              loQueSePuso(r.puestas, r.yaEstaban, 'bebida', 'bebidas'),
            )
          }
        />
      ) : pestana === 'copas' ? (
        <LasCopas
          datos={datos.data}
          alCambiarLaDosis={(copa_ml) =>
            orden(
              'cambiar_las_dosis',
              { copa_ml },
              () => `La dosis de la casa, ${String(copa_ml)} ml`,
            )
          }
          alPoner={(entrada) =>
            orden<{ puestas: number; yaEstaban: string[] }>('montar_copas', entrada, (r) =>
              loQueSePuso(r.puestas, r.yaEstaban, 'copa', 'copas'),
            )
          }
        />
      ) : (
        <LosCafes
          datos={datos.data}
          alPoner={(cafes) =>
            orden<{ puestos: number; yaEstaban: string[] }>('montar_cafes', { cafes }, (r) =>
              loQueSePuso(r.puestos, r.yaEstaban, 'café', 'cafés'),
            )
          }
        />
      )}
    </div>
  );
}

function loQueSePuso(puestas: number, yaEstaban: readonly string[], una: string, varias: string) {
  const dicho = `${puestas === 1 ? `1 ${una}` : `${String(puestas)} ${varias}`} en el TPV`;
  return yaEstaban.length === 0 ? `✓ ${dicho}` : `✓ ${dicho}. Ya estaban: ${yaEstaban.join(', ')}`;
}

/** «cuesta 0,45 €»; o «sin precio en el almacén». */
function loQueCuesta(costeCentimos: number | null): string {
  return costeCentimos === null ? 'sin precio en el almacén' : `cuesta ${euros(costeCentimos)} €`;
}

// ═══ Las bebidas ═════════════════════════════════════════════════════════════

type Marcadas = Readonly<
  Record<string, { readonly puesta: boolean; readonly precio: Centimos | null }>
>;

const claveDe = (productoId: string, racion: string) => `${productoId}:${racion}`;

function LasBebidas({
  datos,
  alPoner,
}: {
  readonly datos: LasBebidasParaMontar;
  readonly alPoner: (
    bebidas: readonly {
      producto_id: string;
      nombre: string;
      pagina: string;
      cantidad: number;
      unidad: string;
      precio_centimos: number;
    }[],
  ) => Promise<boolean>;
}) {
  const [buscando, setBuscando] = useState('');
  const [soloLoQueFalta, setSoloLoQueFalta] = useState(true);
  const [marcadas, setMarcadas] = useState<Marcadas>(() =>
    Object.fromEntries(
      datos.bebidas.flatMap((b) =>
        b.raciones.map((r) => [
          claveDe(b.productoId, r.racion),
          { puesta: r.puesta && !r.yaEsta, precio: null },
        ]),
      ),
    ),
  );
  const [trabajando, setTrabajando] = useState(false);

  const visibles = useMemo(() => {
    const conFalta = soloLoQueFalta
      ? datos.bebidas.filter((b) => b.raciones.some((r) => !r.yaEsta))
      : datos.bebidas;
    return buscando.trim() === ''
      ? conFalta
      : filtrarPorParecido(conFalta, buscando, (b) => b.nombre);
  }, [datos.bebidas, soloLoQueFalta, buscando]);
  const paginas = [...new Set(visibles.map((b) => b.pagina))];
  const enElTpv = datos.bebidas.filter((b) => b.raciones.some((r) => r.yaEsta)).length;

  const cambiar = (clave: string, cambio: Partial<Marcadas[string]>) => {
    setMarcadas((antes) => ({
      ...antes,
      [clave]: {
        puesta: antes[clave]?.puesta ?? false,
        precio: antes[clave]?.precio ?? null,
        ...cambio,
      },
    }));
  };

  const lasQueVan = datos.bebidas.flatMap((b) =>
    b.raciones.flatMap((r) => {
      const m = marcadas[claveDe(b.productoId, r.racion)];
      return m?.puesta === true && !r.yaEsta ? [{ b, r, precio: m.precio }] : [];
    }),
  );
  const sinPrecio = lasQueVan.filter((x) => x.precio === null).length;

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-center gap-e3">
        <span className="rounded-redondo bg-charcoal px-e3 py-[2px] text-secundario font-semibold">
          {datos.bebidas.length} bebidas en tu almacén · {enElTpv} ya en el TPV
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-e3">
          <Interruptor
            etiqueta="Solo lo que falta"
            puesto={soloLoQueFalta}
            alCambiar={setSoloLoQueFalta}
          />
          <input
            type="search"
            aria-label="Buscar una bebida"
            placeholder="Buscar: «mahou», «rioja»…"
            value={buscando}
            onChange={(e) => {
              setBuscando(e.target.value);
            }}
            className="min-h-toque w-[14rem] rounded-redondo border border-borde bg-fondo px-e4"
          />
        </div>
      </div>

      {datos.bebidas.length === 0 && (
        <Aviso tono="info" titulo="Tu almacén no tiene bebidas">
          Tu almacén no tiene bebidas todavía. Ponlas en Estook › Almacén, o crea aquí la que
          quieras vender con «+ Una que no está en el almacén».
        </Aviso>
      )}

      {paginas.map((pagina) => {
        const deEsta = visibles.filter((b) => b.pagina === pagina);
        // «Mismo precio a todas» es para lo que se vende de una forma (los refrescos, las
        // latas): la caña y la doble del mismo barril no cuestan lo mismo.
        const deUnaForma = deEsta.filter((b) => b.raciones.length === 1);
        return (
          <Seccion key={pagina} titulo={`${pagina} · van a «${pagina}»`}>
            {deUnaForma.length > 1 && (
              <MismoPrecio
                alAplicar={(precio) => {
                  for (const b of deUnaForma) {
                    for (const r of b.raciones) {
                      const m = marcadas[claveDe(b.productoId, r.racion)];
                      if (m?.puesta === true && !r.yaEsta)
                        cambiar(claveDe(b.productoId, r.racion), { precio });
                    }
                  }
                }}
              />
            )}
            {deEsta.map((b) => (
              <div
                key={b.productoId}
                className="flex flex-col gap-e2 border-b border-borde py-e3 last:border-0"
              >
                <span className="font-bold">{b.nombre}</span>
                <div className="flex flex-wrap gap-e3">
                  {b.raciones.map((r) => {
                    const clave = claveDe(b.productoId, r.racion);
                    const m = marcadas[clave];
                    return (
                      <div key={clave} className="flex flex-col gap-e1">
                        <div className="flex items-end gap-e2">
                          <button
                            type="button"
                            aria-pressed={m?.puesta === true || r.yaEsta}
                            disabled={r.yaEsta}
                            onClick={() => {
                              cambiar(clave, { puesta: m?.puesta !== true });
                            }}
                            className={[
                              'min-h-toque rounded-grande px-e4 font-semibold disabled:opacity-60',
                              m?.puesta === true || r.yaEsta
                                ? 'bg-texto text-fondo'
                                : 'border-2 border-borde',
                            ].join(' ')}
                          >
                            {r.racion === 'Entera'
                              ? 'Se vende'
                              : `${r.racion} ${comoSeLeeLaCantidad(r.cantidad, r.unidad)}`}
                          </button>
                          {!r.yaEsta && m?.puesta === true && (
                            <div className="w-[7.5rem]">
                              <CampoMoneda
                                etiqueta={`Precio de ${r.nombre}`}
                                valor={m.precio}
                                alCambiar={(precio) => {
                                  cambiar(clave, { precio });
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <span className="text-etiqueta text-texto-suave">
                          {r.yaEsta ? 'Ya en el TPV' : loQueCuesta(r.costeCentimos)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Seccion>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-e3">
        <span className="text-secundario text-texto-suave">
          La copa de vino, de {datos.dosis.copaDeVinoMl} ml; la caña, de 200 ml.
          {sinPrecio > 0 ? ` Falta el precio de ${String(sinPrecio)}.` : ''}
        </span>
        <div className="flex flex-wrap gap-e2">
          <Boton
            tono="secundario"
            onClick={() => {
              irA('ajustes/productos/nuevo');
            }}
          >
            + Una que no está en el almacén
          </Boton>
          <Boton
            tono="principal"
            disabled={lasQueVan.length === 0 || sinPrecio > 0}
            cargando={trabajando}
            textoCargando="Poniendo"
            onClick={() => {
              setTrabajando(true);
              void alPoner(
                lasQueVan.map(({ b, r, precio }) => ({
                  producto_id: b.productoId,
                  nombre: r.nombre,
                  pagina: b.pagina,
                  cantidad: r.cantidad,
                  unidad: r.unidad,
                  precio_centimos: precio ?? 0,
                })),
              ).finally(() => {
                setTrabajando(false);
              });
            }}
          >
            {lasQueVan.length === 1
              ? 'Poner 1 en el TPV'
              : `Poner ${String(lasQueVan.length)} en el TPV`}
          </Boton>
        </div>
      </div>
    </div>
  );
}

function MismoPrecio({ alAplicar }: { readonly alAplicar: (precio: Centimos) => void }) {
  const [precio, setPrecio] = useState<Centimos | null>(null);
  return (
    <div className="flex flex-wrap items-end gap-e2">
      <div className="w-[9rem]">
        <CampoMoneda etiqueta="Mismo precio a todas" valor={precio} alCambiar={setPrecio} />
      </div>
      <Boton
        tono="secundario"
        tamano="s"
        disabled={precio === null}
        onClick={() => {
          if (precio !== null) alAplicar(precio);
        }}
      >
        Ponérselo
      </Boton>
    </div>
  );
}

// ═══ Las copas ═══════════════════════════════════════════════════════════════

function LasCopas({
  datos,
  alCambiarLaDosis,
  alPoner,
}: {
  readonly datos: LasBebidasParaMontar;
  readonly alCambiarLaDosis: (ml: number) => Promise<boolean>;
  readonly alPoner: (entrada: {
    botellas: { producto_id: string; nombre: string; precio_centimos: number; dosis_ml?: number }[];
    con_que: string[];
  }) => Promise<boolean>;
}) {
  const [anadidas, setAnadidas] = useState<readonly { productoId: string; nombre: string }[]>([]);
  const botellas = [
    ...datos.botellas,
    ...anadidas.map((a) => ({ ...a, costeDeLaDosisCentimos: null, yaEsCopa: false })),
  ];
  const [elegidas, setElegidas] = useState<
    Readonly<
      Record<
        string,
        { readonly nombre: string; readonly precio: Centimos | null; readonly dosis: number | null }
      >
    >
  >({});
  const [conQue, setConQue] = useState<ReadonlySet<string>>(
    () => new Set(datos.conQue.map((r) => r.productoId)),
  );
  const [dosis, setDosis] = useState(String(datos.dosis.copaMl));
  const [otra, setOtra] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  const lasQueVan = botellas.flatMap((b) => {
    const e = elegidas[b.productoId];
    return e === undefined || b.yaEsCopa ? [] : [{ b, e }];
  });
  const sinPrecio = lasQueVan.filter((x) => x.e.precio === null).length;

  return (
    <div className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-end gap-e3">
        <div className="w-[10rem]">
          <Selector
            etiqueta="Dosis de la casa"
            value={dosis}
            opciones={lasDosis(Number(dosis))}
            onChange={(e) => {
              setDosis(e.target.value);
            }}
          />
        </div>
        <Boton
          tono="secundario"
          disabled={Number(dosis) === datos.dosis.copaMl}
          onClick={() => {
            void alCambiarLaDosis(Number(dosis));
          }}
        >
          Guardar la dosis
        </Boton>
        <span className="text-secundario text-texto-suave">
          Vale para las copas que pongas a partir de ahora.
        </span>
      </div>

      <div className="grid items-start gap-e4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Seccion titulo="Las botellas">
          {botellas.length === 0 && (
            <p className="text-secundario text-texto-suave">
              No hay botellas de destilados en tu almacén. Añádelas en Estook › Almacén, o elige una
              aquí abajo.
            </p>
          )}
          {botellas.map((b) => {
            const e = elegidas[b.productoId];
            const precio = e?.precio ?? null;
            const coste = b.costeDeLaDosisCentimos;
            const teDeja =
              precio === null || coste === null
                ? null
                : resta(sinIva(precio, IVA_DE_LA_SALA), centimos(coste));
            return (
              <div
                key={b.productoId}
                className="flex flex-wrap items-end gap-e3 border-b border-borde py-e3 last:border-0"
              >
                <button
                  type="button"
                  aria-pressed={e !== undefined || b.yaEsCopa}
                  disabled={b.yaEsCopa}
                  onClick={() => {
                    setElegidas((antes) =>
                      antes[b.productoId] === undefined
                        ? {
                            ...antes,
                            [b.productoId]: { nombre: b.nombre, precio: null, dosis: null },
                          }
                        : Object.fromEntries(
                            Object.entries(antes).filter(([id]) => id !== b.productoId),
                          ),
                    );
                  }}
                  className={[
                    'min-h-toque rounded-grande px-e4 text-left font-semibold disabled:opacity-60',
                    e !== undefined || b.yaEsCopa ? 'bg-texto text-fondo' : 'border-2 border-borde',
                  ].join(' ')}
                >
                  {b.nombre}
                </button>
                {b.yaEsCopa ? (
                  <span className="text-secundario text-texto-suave">Ya es una copa del TPV</span>
                ) : (
                  e !== undefined && (
                    <>
                      <div className="w-[7.5rem]">
                        <CampoMoneda
                          etiqueta={`Precio de ${b.nombre}`}
                          valor={precio}
                          alCambiar={(p) => {
                            setElegidas((antes) => ({
                              ...antes,
                              [b.productoId]: { ...e, precio: p },
                            }));
                          }}
                        />
                      </div>
                      <div className="w-[12rem]">
                        <Selector
                          etiqueta="Su dosis"
                          value={e.dosis === null ? '' : String(e.dosis)}
                          sinElegir="La de la casa"
                          opciones={lasDosis(e.dosis)}
                          onChange={(ev) => {
                            const valor = ev.target.value === '' ? null : Number(ev.target.value);
                            setElegidas((antes) => ({
                              ...antes,
                              [b.productoId]: { ...e, dosis: valor },
                            }));
                          }}
                        />
                      </div>
                    </>
                  )
                )}
                <span className="text-etiqueta text-texto-suave">
                  {coste === null
                    ? 'sin precio en el almacén'
                    : `la dosis cuesta ${euros(coste)} €`}
                  {teDeja !== null && (
                    <span className="font-semibold text-bien">
                      {' '}
                      · te deja {euros(teDeja)} € sin IVA, sin el refresco
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          {datos.otrasBotellas.length > 0 && (
            <div className="flex flex-wrap items-end gap-e2 pt-e3">
              <div className="min-w-[14rem] flex-1">
                <Selector
                  etiqueta="+ Añadir botellas del almacén"
                  value={otra}
                  sinElegir="Elige una botella"
                  opciones={datos.otrasBotellas
                    .filter((o) => !anadidas.some((a) => a.productoId === o.productoId))
                    .map((o) => ({ valor: o.productoId, texto: o.nombre }))}
                  onChange={(e) => {
                    setOtra(e.target.value);
                  }}
                />
              </div>
              <Boton
                tono="secundario"
                disabled={otra === ''}
                onClick={() => {
                  const o = datos.otrasBotellas.find((x) => x.productoId === otra);
                  if (o !== undefined) setAnadidas((antes) => [...antes, o]);
                  setOtra('');
                }}
              >
                Añadir
              </Boton>
            </div>
          )}
        </Seccion>

        <Seccion titulo="«¿Con qué?» · para todas las copas">
          {datos.conQue.map((r) => (
            <Interruptor
              key={r.productoId}
              etiqueta={r.nombre}
              puesto={conQue.has(r.productoId)}
              alCambiar={(si) => {
                setConQue((antes) => {
                  const nuevo = new Set(antes);
                  if (si) nuevo.add(r.productoId);
                  else nuevo.delete(r.productoId);
                  return nuevo;
                });
              }}
            />
          ))}
          <p className="text-secundario">Solo, con hielo</p>
          <p className="text-etiqueta text-texto-suave">
            Salen los refrescos de tu almacén. El precio de la copa ya lleva el refresco; uno que
            sume, como el Red Bull, se cambia después en el grupo «¿Con qué?».
          </p>
        </Seccion>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-e3">
        {sinPrecio > 0 && (
          <span className="text-secundario text-texto-suave">Falta el precio de {sinPrecio}.</span>
        )}
        <Boton
          tono="principal"
          disabled={lasQueVan.length === 0 || sinPrecio > 0}
          cargando={trabajando}
          textoCargando="Poniendo"
          onClick={() => {
            setTrabajando(true);
            void alPoner({
              botellas: lasQueVan.map(({ b, e }) => ({
                producto_id: b.productoId,
                nombre: e.nombre,
                precio_centimos: e.precio ?? 0,
                ...(e.dosis === null ? {} : { dosis_ml: e.dosis }),
              })),
              con_que: [...conQue],
            }).finally(() => {
              setTrabajando(false);
            });
          }}
        >
          {lasQueVan.length === 1
            ? 'Poner 1 copa en el TPV'
            : `Poner ${String(lasQueVan.length)} copas en el TPV`}
        </Boton>
      </div>
    </div>
  );
}

// ═══ Los cafés ═══════════════════════════════════════════════════════════════

function LosCafes({
  datos,
  alPoner,
}: {
  readonly datos: LasBebidasParaMontar;
  readonly alPoner: (cafes: { clave: string; precio_centimos: number }[]) => Promise<boolean>;
}) {
  const [encendidos, setEncendidos] = useState<
    Readonly<Record<string, { readonly si: boolean; readonly precio: Centimos | null }>>
  >(() =>
    Object.fromEntries(
      datos.cafes.map((c) => [c.clave, { si: c.puesto && !c.yaEsta, precio: null }]),
    ),
  );
  const [trabajando, setTrabajando] = useState(false);
  const lleva = (clave: string) =>
    CAFES_DE_SERIE.find((c) => c.clave === clave)
      ?.lleva.map(
        (l) => `${comoSeLeeLaCantidad(l.cantidad, l.unidad)} de ${QUE_ES[l.que] ?? l.que}`,
      )
      .join(' y ') ?? '';
  const losQueVan = datos.cafes.flatMap((c) => {
    const e = encendidos[c.clave];
    return e?.si === true && !c.yaEsta ? [{ c, precio: e.precio }] : [];
  });
  const sinPrecio = losQueVan.filter((x) => x.precio === null).length;

  return (
    <div className="flex flex-col gap-e4">
      <Seccion titulo="Van a la página «Cafés», de la barra">
        {datos.cafes.map((c) => {
          const e = encendidos[c.clave];
          return (
            <div
              key={c.clave}
              className="flex flex-wrap items-end gap-e3 border-b border-borde py-e3 last:border-0"
            >
              <button
                type="button"
                aria-pressed={e?.si === true || c.yaEsta}
                disabled={c.yaEsta}
                onClick={() => {
                  setEncendidos((antes) => ({
                    ...antes,
                    [c.clave]: {
                      si: antes[c.clave]?.si !== true,
                      precio: antes[c.clave]?.precio ?? null,
                    },
                  }));
                }}
                className={[
                  'min-h-toque rounded-grande px-e4 text-left font-semibold disabled:opacity-60',
                  e?.si === true || c.yaEsta ? 'bg-texto text-fondo' : 'border-2 border-borde',
                ].join(' ')}
              >
                {c.nombre}
              </button>
              {!c.yaEsta && e?.si === true && (
                <div className="w-[7.5rem]">
                  <CampoMoneda
                    etiqueta={`Precio de ${c.nombre}`}
                    valor={e.precio}
                    alCambiar={(precio) => {
                      setEncendidos((antes) => ({ ...antes, [c.clave]: { si: true, precio } }));
                    }}
                  />
                </div>
              )}
              <span className="text-etiqueta text-texto-suave">
                {c.yaEsta
                  ? 'Ya en el TPV'
                  : `${lleva(c.clave)} · ${
                      c.costeCentimos === null
                        ? 'sin coste'
                        : `${c.aproximado ? '≈' : ''}${euros(c.costeCentimos)} €${c.aproximado ? ' aprox.' : ''}`
                    }${c.falta.length > 0 ? ` · falta en el almacén: ${c.falta.join(', ')}` : ''}`}
              </span>
            </div>
          );
        })}
      </Seccion>
      <div className="flex flex-wrap items-center justify-between gap-e3">
        <span className="text-secundario text-texto-suave">
          El que no tenga su café y su leche en el almacén se pone sin escandallo, con su coste
          aproximado.
          {sinPrecio > 0 ? ` Falta el precio de ${String(sinPrecio)}.` : ''}
        </span>
        <div className="flex flex-wrap gap-e2">
          <Boton
            tono="secundario"
            onClick={() => {
              irA('ajustes/productos/nuevo');
            }}
          >
            + Otro café, con su receta
          </Boton>
          <Boton
            tono="principal"
            disabled={losQueVan.length === 0 || sinPrecio > 0}
            cargando={trabajando}
            textoCargando="Poniendo"
            onClick={() => {
              setTrabajando(true);
              void alPoner(
                losQueVan.map(({ c, precio }) => ({
                  clave: c.clave,
                  precio_centimos: precio ?? 0,
                })),
              ).finally(() => {
                setTrabajando(false);
              });
            }}
          >
            {losQueVan.length === 1
              ? 'Poner 1 café en el TPV'
              : `Poner ${String(losQueVan.length)} cafés en el TPV`}
          </Boton>
        </div>
      </div>
    </div>
  );
}

const QUE_ES: Readonly<Record<string, string>> = {
  cafe: 'café',
  descafeinado: 'descafeinado',
  leche: 'leche',
  cacao: 'cacao',
  te: 'té',
  manzanilla: 'manzanilla',
  poleo: 'poleo',
};

function Seccion({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-e2 rounded-mayor bg-superficie p-e4">
      <h2 className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">{titulo}</h2>
      {children}
    </section>
  );
}
