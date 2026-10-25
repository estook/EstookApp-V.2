import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  COLORES_DE_LA_BOTONERA,
  NOMBRE_DE_QUIEN_LO_PREPARA,
  NOMBRE_DEL_PASE,
  PASES_DE_LA_BOTONERA,
  QUIEN_LO_PREPARA,
  centimos,
  cuantasSeEligen,
  loQueProponeElNombre,
  type CaminoDeLaBotonera,
  type Centimos,
  type ColorDeLaBotonera,
  type PaseDeLaBotonera,
  type QuienLoPrepara,
} from '@estook/dominio';
import {
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Hoja,
  Interruptor,
  Selector,
} from '@estook/ui';
import type {
  BotonDeLaBotonera,
  GrupoParaMontar,
  LaBotonera,
  LosGruposDeOpciones,
  PaginaDeLaBotonera,
  PlatoParaLaBotonera,
} from '../datos/tipos.ts';
import { FalloDeLaSala, usarAcciones, type Resultado } from '../ganchos/usarLaSala.ts';
import { euros } from '../logica/texto.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { COMO_SE_VE_EL_COLOR } from './colores.ts';
import { HojaDeGrupo } from './HojaDeGrupo.tsx';
import { MontaTusBebidas } from './MontaTusBebidas.tsx';
import { irA } from '../navegar.ts';
import { moverUnPuesto, usarArrastrar } from '../ganchos/usarArrastrar.ts';

/**
 * **Ajustes del TPV › Productos: la botonera** (T3, maquetas «Productos: cómo empezar» y
 * «Productos: la botonera»; Anexo 11.11). Qué se vende en el TPV, en qué página y de qué
 * color, **quién lo prepara** y **en qué pase sale**.
 *
 *   · **Al empezar, tres caminos**: traer toda la carta, elegir lo que se vende aquí o
 *     empezar de cero
 *   · **las páginas**, cada una con sus dos preguntas, que heredan sus botones; se
 *     arrastran para ordenarlas
 *   · **los botones**: «+ De la carta», su color, lo suyo si cambia lo de su página (el pan,
 *     de «Nadie»), fijarlo en «Lo más pedido», moverlo o quitarlo
 *   · **«Nuevos en la carta»**: lo que está en la carta y aún no en el TPV, con «Añadir»
 *   · **«Nuevo producto»**: nace también en la carta de Estook, sin escandallo
 *
 * La botonera no copia la carta: el precio, el IVA, la foto y el escandallo son los de la
 * carta, y se cambian en Estook.
 */

const CLAVE = ['botonera'];
const CLAVE_DE_LOS_GRUPOS = ['grupos_de_opciones'];

const NOMBRE_DEL_CAMINO: Readonly<Record<CaminoDeLaBotonera, string>> = {
  toda_la_carta: 'Toda la carta',
  elegir: 'Elegido a mano',
  de_cero: 'Desde cero',
};

type Orden = <T>(nombre: string, entrada: unknown) => Promise<Resultado<T>>;

export function Productos({ resto = '' }: { readonly resto?: string }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const ejecutar = usarAcciones();
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const botonera = useQuery({
    queryKey: CLAVE,
    queryFn: async () => {
      const respuesta = await cliente.consultar<LaBotonera>('la_botonera');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });

  // Cada cambio vuelve a leer la botonera, y la carta de la sala de este aparato.
  const orden = useCallback<Orden>(
    async <T,>(nombre: string, entrada: unknown) => {
      setFallo(null);
      const hecho = await ejecutar<T>(nombre, entrada);
      if (!hecho.ok) setFallo(hecho.error);
      await Promise.all([
        cache.invalidateQueries({ queryKey: CLAVE }),
        cache.invalidateQueries({ queryKey: ['carta_de_la_sala'] }),
      ]);
      return hecho;
    },
    [ejecutar, cache],
  );

  if (botonera.isLoading) return <Cargando que="la botonera" />;
  if (botonera.error instanceof FalloDeLaSala) {
    return <ErrorEnCristiano error={botonera.error.error} />;
  }
  const datos = botonera.data;
  if (datos === undefined) return null;

  return (
    <div className="flex flex-col gap-e4">
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {datos.camino === null ? (
        <TresCaminos datos={datos} orden={orden} />
      ) : resto === 'bebidas' ? (
        <MontaTusBebidas />
      ) : (
        <LaBotoneraMontada
          datos={datos}
          camino={datos.camino}
          orden={orden}
          conElNuevoAbierto={resto === 'nuevo'}
        />
      )}
    </div>
  );
}

// ═══ Al empezar: tres caminos ═════════════════════════════════════════════════

function TresCaminos({ datos, orden }: { readonly datos: LaBotonera; readonly orden: Orden }) {
  const platos = datos.carta.reduce((n, s) => n + s.platos.length, 0);
  const secciones = datos.carta.filter((s) => s.id !== null).length;
  const hayCarta = platos > 0;
  const [camino, setCamino] = useState<CaminoDeLaBotonera>(hayCarta ? 'toda_la_carta' : 'de_cero');
  const [eligiendo, setEligiendo] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  async function montar(plato_ids?: readonly string[]) {
    setTrabajando(true);
    await orden('montar_la_botonera', {
      camino,
      ...(plato_ids === undefined ? {} : { plato_ids }),
    });
    setTrabajando(false);
  }

  if (eligiendo) {
    return (
      <ElegirDeLaCarta
        titulo="Elige lo que se vende aquí"
        carta={datos.carta}
        yaEstan={new Set()}
        textoDelBoton={(n) => `Poner ${String(n)} en el TPV`}
        trabajando={trabajando}
        alVolver={() => {
          setEligiendo(false);
        }}
        alElegir={(ids) => {
          void montar(ids);
        }}
      />
    );
  }

  const caminos: readonly {
    readonly id: CaminoDeLaBotonera;
    readonly titulo: string;
    readonly frase: string;
    readonly paraQuien: string;
  }[] = [
    {
      id: 'toda_la_carta',
      titulo: 'Traer toda la carta',
      frase:
        'Cada sección de tu carta, una página, en su orden. Lo que añadas a la carta después entra solo.',
      paraQuien: hayCarta
        ? `Recomendado: tu carta ya está en Estook · ${String(secciones)} ${secciones === 1 ? 'sección' : 'secciones'}, ${String(platos)} ${platos === 1 ? 'plato' : 'platos'}`
        : 'Para cuando tu carta ya esté en Estook',
    },
    {
      id: 'elegir',
      titulo: 'Elegir lo que se vende aquí',
      frase:
        'Tu carta con casillas, sección a sección, y «Todos» en cada una. Lo nuevo de la carta no entra solo: te lo enseñamos para que lo añadas.',
      paraQuien: 'Para cuando el TPV no vende todo lo de la carta',
    },
    {
      id: 'de_cero',
      titulo: 'Empezar de cero',
      frase:
        'Creas los productos aquí: nombre, precio, página y quién lo prepara. Van también a tu carta de Estook, «sin escandallo», para completarlos allí cuando quieras.',
      paraQuien: hayCarta
        ? 'Para un local que no quiere su carta en el TPV'
        : 'Recomendado: un local sin carta en Estook',
    },
  ];

  return (
    <section className="flex max-w-[44rem] flex-col gap-e4">
      <div className="flex flex-col gap-e1">
        <h1 className="text-pantalla font-bold">¿Cómo quieres montar los botones del TPV?</h1>
        <p className="text-cuerpo text-texto-suave">
          Los botones apuntan a los platos de tu carta: el precio, el IVA, la foto y el escandallo
          son los de la carta. Puedes cambiar de camino cuando quieras.
        </p>
      </div>
      <div role="radiogroup" aria-label="Cómo montar los botones" className="flex flex-col gap-e2">
        {caminos.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={camino === c.id}
            disabled={c.id !== 'de_cero' && !hayCarta}
            onClick={() => {
              setCamino(c.id);
            }}
            className={[
              'flex flex-col gap-e1 rounded-mayor p-e4 text-left disabled:opacity-50',
              camino === c.id
                ? 'border-2 border-naranja bg-charcoal'
                : 'border-2 border-borde bg-superficie',
            ].join(' ')}
          >
            <span className="text-seccion font-bold">{c.titulo}</span>
            <span className="text-cuerpo text-texto-suave">{c.frase}</span>
            <span className="text-secundario font-semibold text-texto-tenue">{c.paraQuien}</span>
          </button>
        ))}
      </div>
      <Botones>
        <Boton
          tono="principal"
          cargando={trabajando}
          textoCargando="Montando"
          onClick={() => {
            if (camino === 'elegir') setEligiendo(true);
            else void montar();
          }}
        >
          {camino === 'toda_la_carta'
            ? 'Traer la carta'
            : camino === 'elegir'
              ? 'Elegir los platos'
              : 'Empezar de cero'}
        </Boton>
      </Botones>
    </section>
  );
}

// ═══ La botonera montada ══════════════════════════════════════════════════════

function LaBotoneraMontada({
  datos,
  camino,
  orden,
  conElNuevoAbierto,
}: {
  readonly datos: LaBotonera;
  readonly camino: CaminoDeLaBotonera;
  readonly orden: Orden;
  /** Desde «Monta tus bebidas», «+ Una que no está en el almacén» abre «Nuevo producto». */
  readonly conElNuevoAbierto: boolean;
}) {
  const [hoja, setHoja] = useState<
    | { readonly que: 'pagina'; readonly pagina: PaginaDeLaBotonera }
    | {
        readonly que: 'boton';
        readonly pagina: PaginaDeLaBotonera;
        readonly boton: BotonDeLaBotonera;
      }
    | { readonly que: 'de_la_carta'; readonly pagina: PaginaDeLaBotonera }
    | { readonly que: 'nueva_pagina' }
    | { readonly que: 'nuevo_producto' }
    | null
  >(conElNuevoAbierto && datos.puedeCrearProductos ? { que: 'nuevo_producto' } : null);
  const cerrar = () => {
    setHoja(null);
    if (conElNuevoAbierto) irA('ajustes/productos');
  };
  const paginas = datos.paginas;
  // Lo de la hoja abierta, siempre como está ahora: tras ordenar o cambiar, no la copia vieja.
  const laDeAhora = (g: PaginaDeLaBotonera) => paginas.find((x) => x.id === g.id) ?? g;
  const hojaViva = (() => {
    if (hoja === null) return null;
    if (hoja.que === 'boton') {
      const id = hoja.boton.botonId;
      const pagina = paginas.find((g) => g.botones.some((b) => b.botonId === id)) ?? hoja.pagina;
      return { ...hoja, pagina, boton: pagina.botones.find((b) => b.botonId === id) ?? hoja.boton };
    }
    if (hoja.que === 'pagina' || hoja.que === 'de_la_carta') {
      return { ...hoja, pagina: laDeAhora(hoja.pagina) };
    }
    return hoja;
  })();
  const ids = useMemo(() => paginas.map((g) => g.id), [paginas]);
  const ordenarPaginas = (nuevo: readonly string[]) => {
    void orden('ordenar_las_paginas_del_tpv', { paginas: nuevo });
  };
  const arrastre = usarArrastrar(ids, ordenarPaginas);

  return (
    <>
      <div className="flex flex-wrap items-center gap-e3">
        <h1 className="text-pantalla font-bold">Productos</h1>
        <span className="rounded-redondo bg-charcoal px-e3 py-[2px] text-secundario font-semibold">
          {NOMBRE_DEL_CAMINO[camino]}
        </span>
        <div className="ml-auto flex flex-wrap gap-e2">
          <Boton
            tono="secundario"
            onClick={() => {
              setHoja({ que: 'nueva_pagina' });
            }}
          >
            + Página
          </Boton>
          <Boton
            tono="secundario"
            onClick={() => {
              irA('ajustes/productos/bebidas');
            }}
          >
            Monta tus bebidas
          </Boton>
          {datos.puedeCrearProductos && (
            <Boton
              tono="principal"
              onClick={() => {
                setHoja({ que: 'nuevo_producto' });
              }}
            >
              Nuevo producto
            </Boton>
          )}
        </div>
      </div>

      <div className="grid items-start gap-e5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-e3">
          {paginas.length === 0 ? (
            <div className="rounded-mayor border-2 border-dashed border-borde p-e5 text-cuerpo text-texto-suave">
              Aún no hay páginas. Crea una con «+ Página»
              {datos.puedeCrearProductos ? ', o un producto con «Nuevo producto»' : ''}.
            </div>
          ) : (
            <p className="text-secundario text-texto-suave">
              Arrastra para ordenar. Toca un botón para su color, quién lo prepara o su pase.
            </p>
          )}
          {paginas.map((g) => (
            <TarjetaDePagina
              key={g.id}
              pagina={g}
              orden={orden}
              asa={arrastre.asa(g.id)}
              arrastrando={arrastre.arrastrando === g.id}
              sobre={arrastre.sobre === g.id}
              alTocarLaPagina={() => {
                setHoja({ que: 'pagina', pagina: g });
              }}
              alTocarUnBoton={(b) => {
                setHoja({ que: 'boton', pagina: g, boton: b });
              }}
              alPonerDeLaCarta={() => {
                setHoja({ que: 'de_la_carta', pagina: g });
              }}
            />
          ))}
        </div>

        <aside className="flex flex-col gap-e4">
          <div className="rounded-mayor bg-superficie p-e4 text-secundario text-texto-suave">
            <strong className="text-texto">«Lo más pedido»</strong> va la primera y se llena sola
            con lo que más se vende a cada hora. Cada página se lo pasa a sus botones; un botón
            puede tener lo suyo: el pan, en Entrantes, es de «Nadie» (se sirve tal cual y no va a
            ninguna pantalla).
          </div>
          <NuevosEnLaCarta datos={datos} orden={orden} />
          <div className="rounded-mayor bg-superficie p-e4">
            <Interruptor
              etiqueta="Lo nuevo de la carta entra solo"
              ayuda="Cada plato que añadas en Estook › Carta sale solo en la página de su sección."
              puesto={datos.entraSolo}
              alCambiar={(si) => {
                void orden('lo_nuevo_entra_solo', { si });
              }}
            />
          </div>
        </aside>
      </div>

      {hojaViva?.que === 'pagina' && (
        <HojaDePagina pagina={hojaViva.pagina} ids={ids} orden={orden} alCerrar={cerrar} />
      )}
      {hojaViva?.que === 'boton' && (
        <HojaDeBoton
          pagina={hojaViva.pagina}
          boton={hojaViva.boton}
          paginas={paginas}
          puedeTocarLaCarta={datos.puedeCrearProductos}
          orden={orden}
          alCerrar={cerrar}
        />
      )}
      {hojaViva?.que === 'de_la_carta' && (
        <Hoja abierta titulo={`Poner en ${hojaViva.pagina.nombre}`} alCerrar={cerrar}>
          <ElegirDeLaCarta
            carta={datos.carta}
            yaEstan={new Set(hojaViva.pagina.botones.map((b) => b.platoId))}
            textoDelBoton={(n) => `Poner ${String(n)}`}
            trabajando={false}
            alElegir={(plato_ids) => {
              void orden('poner_botones', { pagina_id: hojaViva.pagina.id, plato_ids }).then(
                (r) => {
                  if (r.ok) cerrar();
                },
              );
            }}
          />
        </Hoja>
      )}
      {hojaViva?.que === 'nueva_pagina' && <HojaNuevaPagina orden={orden} alCerrar={cerrar} />}
      {hojaViva?.que === 'nuevo_producto' && (
        <HojaNuevoProducto paginas={paginas} orden={orden} alCerrar={cerrar} />
      )}
    </>
  );
}

function TarjetaDePagina({
  pagina,
  orden,
  asa,
  arrastrando,
  sobre,
  alTocarLaPagina,
  alTocarUnBoton,
  alPonerDeLaCarta,
}: {
  readonly pagina: PaginaDeLaBotonera;
  readonly orden: Orden;
  readonly asa: ReturnType<ReturnType<typeof usarArrastrar>['asa']>;
  readonly arrastrando: boolean;
  readonly sobre: boolean;
  readonly alTocarLaPagina: () => void;
  readonly alTocarUnBoton: (b: BotonDeLaBotonera) => void;
  readonly alPonerDeLaCarta: () => void;
}) {
  const idsDeBotones = useMemo(() => pagina.botones.map((b) => b.botonId), [pagina.botones]);
  const arrastre = usarArrastrar(idsDeBotones, (nuevo) => {
    void orden('ordenar_los_botones', { pagina_id: pagina.id, botones: nuevo });
  });
  const cambiar = (cambios: Record<string, unknown>) => {
    void orden('cambiar_pagina_del_tpv', { pagina_id: pagina.id, ...cambios });
  };
  const n = pagina.botones.length;

  return (
    <section
      data-orden={pagina.id}
      aria-label={`Página ${pagina.nombre}`}
      className={[
        'flex flex-col gap-e3 rounded-mayor bg-superficie p-e4',
        pagina.color === null ? '' : `border-l-[6px] ${COMO_SE_VE_EL_COLOR[pagina.color].franja}`,
        arrastrando ? 'opacity-60' : '',
        sobre ? 'outline outline-2 outline-naranja' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-e3">
        <span
          {...asa}
          role="img"
          aria-label={`Arrastrar ${pagina.nombre}`}
          className="select-none px-e1 text-seccion text-texto-tenue"
        >
          ⋮⋮
        </span>
        <button
          type="button"
          onClick={alTocarLaPagina}
          className="min-h-toque text-left text-seccion font-bold underline-offset-4 hover:underline"
        >
          {pagina.nombre}
        </button>
        <span className="text-secundario text-texto-suave">
          {n === 1 ? '1 botón' : `${String(n)} botones`}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-e5 gap-y-e3">
        <Pregunta titulo="¿Quién lo prepara?">
          {QUIEN_LO_PREPARA.map((q) => (
            <Opcion
              key={q}
              puesto={pagina.quienLoPrepara === q}
              onClick={() => {
                cambiar({ quien_lo_prepara: q });
              }}
            >
              {NOMBRE_DE_QUIEN_LO_PREPARA[q]}
            </Opcion>
          ))}
        </Pregunta>
        <Pregunta titulo="¿En qué pase sale?">
          {PASES_DE_LA_BOTONERA.map((p) => (
            <Opcion
              key={p}
              puesto={pagina.pase === p}
              onClick={() => {
                cambiar({ pase: p });
              }}
            >
              {NOMBRE_DEL_PASE[p]}
            </Opcion>
          ))}
        </Pregunta>
      </div>

      <div className="flex flex-wrap gap-e2">
        {pagina.botones.map((b) => {
          const suyo = b.quienLoPrepara !== null && b.quienLoPrepara !== pagina.quienLoPrepara;
          const color = b.color ?? pagina.color;
          return (
            <div
              key={b.botonId}
              data-orden={b.botonId}
              className={[
                'flex items-stretch overflow-hidden rounded-grande border bg-fondo',
                color === null
                  ? 'border-borde'
                  : `border-borde border-l-[5px] ${COMO_SE_VE_EL_COLOR[color].franja}`,
                arrastre.arrastrando === b.botonId ? 'opacity-60' : '',
                arrastre.sobre === b.botonId ? 'outline outline-2 outline-naranja' : '',
              ].join(' ')}
            >
              <span
                {...arrastre.asa(b.botonId)}
                role="img"
                aria-label={`Arrastrar ${b.nombre}`}
                className="flex select-none items-center px-e1 text-texto-tenue"
              >
                ⋮
              </span>
              <button
                type="button"
                onClick={() => {
                  alTocarUnBoton(b);
                }}
                className="min-h-toque py-e1 pr-e3 text-left font-semibold"
              >
                {b.nombre}
                {suyo && (
                  <span className="font-normal text-texto-suave">
                    {' '}
                    · {NOMBRE_DE_QUIEN_LO_PREPARA[b.quienLoPrepara]}
                  </span>
                )}
                {b.fijado && <span className="font-normal text-texto-suave"> · fijado</span>}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={alPonerDeLaCarta}
          className="min-h-toque rounded-grande border-2 border-dashed border-borde px-e4 font-semibold text-texto-suave"
        >
          + De la carta
        </button>
      </div>
    </section>
  );
}

function NuevosEnLaCarta({ datos, orden }: { readonly datos: LaBotonera; readonly orden: Orden }) {
  const nuevos = datos.nuevosEnLaCarta;
  if (nuevos.length === 0) return null;
  return (
    <section
      aria-label="Nuevos en la carta"
      className="flex flex-col gap-e3 rounded-mayor border-2 border-atencion bg-atencion-suave p-e4"
    >
      <div className="flex flex-col gap-e1">
        <h2 className="text-seccion font-bold">Nuevos en la carta · {nuevos.length}</h2>
        <p className="text-secundario text-texto-suave">
          Están en tu carta y todavía no en el TPV.
          {datos.entraSolo ? '' : ' Con «Lo nuevo entra solo», entrarían solos.'}
        </p>
      </div>
      <ul className="flex flex-col gap-e2">
        {nuevos.slice(0, 12).map((p) => (
          <li key={p.id} className="flex items-center gap-e2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.nombre}</span>
              <span className="block text-etiqueta text-texto-suave">
                {p.seccion ?? 'Sin sección'}
              </span>
            </span>
            <Boton
              tono="secundario"
              tamano="s"
              disabled={p.seccion === null}
              onClick={() => {
                void orden('traer_de_la_carta', { plato_ids: [p.id] });
              }}
            >
              Añadir
            </Boton>
          </li>
        ))}
      </ul>
      {nuevos.length > 1 && (
        <Boton
          tono="secundario"
          onClick={() => {
            void orden('traer_de_la_carta', {});
          }}
        >
          Añadir los {nuevos.length}
        </Boton>
      )}
      {nuevos.some((p) => p.seccion === null) && (
        <p className="text-etiqueta text-texto-suave">
          Lo que no tiene sección se pone con «+ De la carta» en la página que quieras.
        </p>
      )}
    </section>
  );
}

// ═══ Las hojas ════════════════════════════════════════════════════════════════

function HojaDePagina({
  pagina,
  ids,
  orden,
  alCerrar,
}: {
  readonly pagina: PaginaDeLaBotonera;
  readonly ids: readonly string[];
  readonly orden: Orden;
  readonly alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(pagina.nombre);
  const [color, setColor] = useState(pagina.color);
  const [quitar, setQuitar] = useState(false);
  const donde = ids.indexOf(pagina.id);

  async function guardar() {
    const hecho = await orden('cambiar_pagina_del_tpv', {
      pagina_id: pagina.id,
      nombre: nombre.trim(),
      color,
    });
    if (hecho.ok) alCerrar();
  }

  return (
    <Hoja
      abierta
      titulo={pagina.nombre}
      alCerrar={alCerrar}
      pie={
        quitar ? (
          <Botones>
            <Boton
              tono="secundario"
              onClick={() => {
                setQuitar(false);
              }}
            >
              No, dejarla
            </Boton>
            <Boton
              tono="peligro"
              onClick={() => {
                void orden('quitar_pagina_del_tpv', { pagina_id: pagina.id }).then((r) => {
                  if (r.ok) alCerrar();
                });
              }}
            >
              Quitar la página
            </Boton>
          </Botones>
        ) : (
          <Botones>
            <Boton
              tono="texto"
              onClick={() => {
                setQuitar(true);
              }}
            >
              Quitar la página
            </Boton>
            <Boton
              tono="principal"
              disabled={nombre.trim() === ''}
              onClick={() => {
                void guardar();
              }}
            >
              Guardar
            </Boton>
          </Botones>
        )
      }
    >
      {quitar ? (
        <p className="pt-e3 text-cuerpo">
          Sus botones se van con ella. <strong>Los platos siguen en tu carta</strong>: solo dejan de
          venderse en el TPV.
        </p>
      ) : (
        <div className="flex flex-col gap-e4 pt-e3">
          {pagina.deLaSeccion !== null && (
            <p className="text-secundario text-texto-suave">
              Viene de «{pagina.deLaSeccion}» de tu carta.
            </p>
          )}
          {pagina.deSiempre !== null && (
            <p className="text-secundario text-texto-suave">
              {pagina.deSiempre === 'pan'
                ? 'Aquí entran solos el pan y el agua de tu carta, estén en la sección que estén: los sirve el camarero.'
                : 'Aquí entran solos los cafés y las infusiones de tu carta, estén en la sección que estén: los hace la barra.'}
            </p>
          )}
          <Campo
            etiqueta="Nombre de la página"
            value={nombre}
            maxLength={30}
            onChange={(e) => {
              setNombre(e.target.value);
            }}
          />
          <ElegirColor color={color} alCambiar={setColor} sinColor="Sin color" />
          {ids.length > 1 && (
            <div className="flex flex-wrap items-center gap-e2">
              <span className="text-secundario text-texto-suave">
                Va la {String(donde + 1)}.ª de {String(ids.length)}
              </span>
              <Opcion
                desactivado={donde <= 0}
                onClick={() => {
                  void orden('ordenar_las_paginas_del_tpv', {
                    paginas: moverUnPuesto(ids, pagina.id, -1),
                  });
                }}
              >
                Antes
              </Opcion>
              <Opcion
                desactivado={donde >= ids.length - 1}
                onClick={() => {
                  void orden('ordenar_las_paginas_del_tpv', {
                    paginas: moverUnPuesto(ids, pagina.id, 1),
                  });
                }}
              >
                Después
              </Opcion>
            </div>
          )}
        </div>
      )}
    </Hoja>
  );
}

function HojaDeBoton({
  pagina,
  boton,
  paginas,
  puedeTocarLaCarta,
  orden,
  alCerrar,
}: {
  readonly pagina: PaginaDeLaBotonera;
  readonly boton: BotonDeLaBotonera;
  readonly paginas: readonly PaginaDeLaBotonera[];
  /** El precio y «a peso» son de la carta: solo quien puede cambiarla (T3 · 2). */
  readonly puedeTocarLaCarta: boolean;
  readonly orden: Orden;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const grupos = useQuery({
    queryKey: CLAVE_DE_LOS_GRUPOS,
    queryFn: async () => {
      const respuesta = await cliente.consultar<LosGruposDeOpciones>('los_grupos_de_opciones');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });
  const cache = useQueryClient();
  const conLosGrupos: Orden = async <T,>(nombre: string, entrada: unknown) => {
    const hecho = await orden<T>(nombre, entrada);
    await cache.invalidateQueries({ queryKey: CLAVE_DE_LOS_GRUPOS });
    return hecho;
  };
  const [grupoAbierto, setGrupoAbierto] = useState<GrupoParaMontar | 'nuevo' | null>(null);
  const [precio, setPrecio] = useState<Centimos | null>(
    boton.precioCentimos === null ? null : centimos(boton.precioCentimos),
  );
  const [aPeso, setAPeso] = useState(boton.aPeso === true);
  const suyos = boton.grupoIds ?? [];
  // Lo de la hoja se ve al momento; se guarda cada toque.
  const [quien, setQuien] = useState<QuienLoPrepara | null>(boton.quienLoPrepara);
  const [pase, setPase] = useState<PaseDeLaBotonera | null>(boton.pase);
  const [color, setColor] = useState<ColorDeLaBotonera | null>(boton.color);
  const [fijado, setFijado] = useState(boton.fijado);
  const ids = pagina.botones.map((b) => b.botonId);
  const donde = ids.indexOf(boton.botonId);
  const cambiar = (cambios: Record<string, unknown>) =>
    orden('cambiar_boton_del_tpv', { boton_id: boton.botonId, ...cambios });

  return (
    <Hoja
      abierta
      titulo={boton.nombre}
      alCerrar={alCerrar}
      pie={
        <Botones>
          <Boton
            tono="texto"
            onClick={() => {
              void orden('quitar_boton_del_tpv', { boton_id: boton.botonId }).then((r) => {
                if (r.ok) alCerrar();
              });
            }}
          >
            Quitar del TPV
          </Boton>
          <Boton tono="principal" onClick={alCerrar}>
            Listo
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4 pt-e3">
        {puedeTocarLaCarta ? (
          <div className="flex flex-col gap-e2">
            <div className="flex flex-wrap items-end gap-e2">
              <div className="w-[10rem]">
                <CampoMoneda
                  etiqueta={aPeso ? 'Precio del kilo, con IVA' : 'Precio en sala, con IVA'}
                  valor={precio}
                  alCambiar={setPrecio}
                />
              </div>
              <Boton
                tono="secundario"
                disabled={precio === null || precio === boton.precioCentimos}
                onClick={() => {
                  void orden('cambiar_precio_desde_el_tpv', {
                    plato_id: boton.platoId,
                    precio_centimos: precio,
                  });
                }}
              >
                Guardar el precio
              </Boton>
            </div>
            <p className="text-secundario text-texto-suave">
              Es el de tu carta: cambia también en Estook, con su historial.
            </p>
            <Interruptor
              etiqueta="Se vende a peso"
              ayuda="El jamón, el pescado del día: el precio es el del kilo, y al pedirlo se dice cuánto pesa."
              puesto={aPeso}
              alCambiar={(si) => {
                setAPeso(si);
                void orden('vender_a_peso', { plato_id: boton.platoId, si });
              }}
            />
          </div>
        ) : (
          <p className="text-secundario text-texto-suave">
            {boton.precioCentimos === null ? 'Sin precio' : `${euros(boton.precioCentimos)} €`}, el
            de tu carta. El precio lo cambia quien puede cambiar la carta.
          </p>
        )}

        <div className="flex flex-col gap-e2">
          <span className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">
            Opciones al pedirlo
          </span>
          {grupos.data === undefined ? (
            <Cargando que="los grupos" />
          ) : (
            <>
              {grupos.data.grupos.map((g) => {
                const puesto = suyos.includes(g.id);
                return (
                  <div key={g.id} className="flex items-center gap-e3">
                    <div className="min-w-0 flex-1">
                      <Interruptor
                        etiqueta={g.nombre}
                        ayuda={`${cuantasSeEligen(g)} · ${g.opciones.map((o) => o.nombre).join(', ')}`}
                        puesto={puesto}
                        alCambiar={(si) => {
                          void conLosGrupos('poner_grupos_al_plato', {
                            plato_id: boton.platoId,
                            grupo_ids: si ? [...suyos, g.id] : suyos.filter((x) => x !== g.id),
                          });
                        }}
                      />
                    </div>
                    <Boton
                      tono="texto"
                      tamano="s"
                      onClick={() => {
                        setGrupoAbierto(g);
                      }}
                    >
                      Cambiar
                    </Boton>
                  </div>
                );
              })}
              <Boton
                tono="secundario"
                onClick={() => {
                  setGrupoAbierto('nuevo');
                }}
              >
                + Grupo nuevo
              </Boton>
            </>
          )}
        </div>
        <Pregunta titulo="¿Quién lo prepara?">
          <Opcion
            puesto={quien === null}
            onClick={() => {
              setQuien(null);
              void cambiar({ quien_lo_prepara: null });
            }}
          >
            Lo de {pagina.nombre} ({NOMBRE_DE_QUIEN_LO_PREPARA[pagina.quienLoPrepara]})
          </Opcion>
          {QUIEN_LO_PREPARA.filter((q) => q !== pagina.quienLoPrepara).map((q) => (
            <Opcion
              key={q}
              puesto={quien === q}
              onClick={() => {
                setQuien(q);
                void cambiar({ quien_lo_prepara: q });
              }}
            >
              {NOMBRE_DE_QUIEN_LO_PREPARA[q]}
            </Opcion>
          ))}
        </Pregunta>
        <Pregunta titulo="¿En qué pase sale?">
          <Opcion
            puesto={pase === null}
            onClick={() => {
              setPase(null);
              void cambiar({ pase: null });
            }}
          >
            Lo de {pagina.nombre} ({NOMBRE_DEL_PASE[pagina.pase]})
          </Opcion>
          {PASES_DE_LA_BOTONERA.filter((p) => p !== pagina.pase).map((p) => (
            <Opcion
              key={p}
              puesto={pase === p}
              onClick={() => {
                setPase(p);
                void cambiar({ pase: p });
              }}
            >
              {NOMBRE_DEL_PASE[p]}
            </Opcion>
          ))}
        </Pregunta>
        <ElegirColor
          color={color}
          alCambiar={(c) => {
            setColor(c);
            void cambiar({ color: c });
          }}
          sinColor="El de la página"
        />
        <Interruptor
          etiqueta="Fijado en «Lo más pedido»"
          ayuda="Sale el primero en «Lo más pedido», se venda o no."
          puesto={fijado}
          alCambiar={(si) => {
            setFijado(si);
            void cambiar({ fijado: si });
          }}
        />
        {paginas.length > 1 && (
          <Selector
            etiqueta="Página"
            value={pagina.id}
            opciones={paginas.map((g) => ({ valor: g.id, texto: g.nombre }))}
            onChange={(e) => {
              const otra = e.target.value;
              if (otra === pagina.id) return;
              void cambiar({ pagina_id: otra }).then((r) => {
                if (r.ok) alCerrar();
              });
            }}
          />
        )}
        {ids.length > 1 && (
          <div className="flex flex-wrap items-center gap-e2">
            <span className="text-secundario text-texto-suave">
              Va el {String(donde + 1)}.º de {String(ids.length)}
            </span>
            <Opcion
              desactivado={donde <= 0}
              onClick={() => {
                void orden('ordenar_los_botones', {
                  pagina_id: pagina.id,
                  botones: moverUnPuesto(ids, boton.botonId, -1),
                });
              }}
            >
              Antes
            </Opcion>
            <Opcion
              desactivado={donde >= ids.length - 1}
              onClick={() => {
                void orden('ordenar_los_botones', {
                  pagina_id: pagina.id,
                  botones: moverUnPuesto(ids, boton.botonId, 1),
                });
              }}
            >
              Después
            </Opcion>
          </div>
        )}
      </div>
      {grupoAbierto !== null && grupos.data !== undefined && (
        <HojaDeGrupo
          grupo={grupoAbierto === 'nuevo' ? null : grupoAbierto}
          platoId={boton.platoId}
          nombreDelPlato={boton.nombre}
          productos={grupos.data.productos}
          orden={conLosGrupos}
          alCerrar={() => {
            setGrupoAbierto(null);
          }}
        />
      )}
    </Hoja>
  );
}

function HojaNuevaPagina({
  orden,
  alCerrar,
}: {
  readonly orden: Orden;
  readonly alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const propone = loQueProponeElNombre(nombre);
  return (
    <Hoja
      abierta
      titulo="Nueva página"
      alCerrar={alCerrar}
      pie={
        <Botones>
          <Boton
            tono="principal"
            disabled={nombre.trim() === ''}
            onClick={() => {
              void orden('crear_pagina_del_tpv', { nombre: nombre.trim() }).then((r) => {
                if (r.ok) alCerrar();
              });
            }}
          >
            Crear la página
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        <Campo
          etiqueta="Nombre de la página"
          placeholder="Ej.: Vinos, Del día, Tapas…"
          value={nombre}
          maxLength={30}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
        />
        {nombre.trim() !== '' && (
          <p className="text-secundario text-texto-suave">
            La prepara {NOMBRE_DE_QUIEN_LO_PREPARA[propone.quienLoPrepara].toLowerCase()} y sale en{' '}
            {NOMBRE_DEL_PASE[propone.pase]}. Se cambia después con un toque.
          </p>
        )}
      </div>
    </Hoja>
  );
}

function HojaNuevoProducto({
  paginas,
  orden,
  alCerrar,
}: {
  readonly paginas: readonly PaginaDeLaBotonera[];
  readonly orden: Orden;
  readonly alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState<Centimos | null>(null);
  // Se propone la primera de las de la carta: un producto nuevo no suele ser pan ni café.
  const [paginaId, setPaginaId] = useState(
    (paginas.find((g) => g.deSiempre === null) ?? paginas[0])?.id ?? '',
  );
  const [nuevaPagina, setNuevaPagina] = useState('');
  const pagina = paginas.find((g) => g.id === paginaId);
  const [quien, setQuien] = useState<QuienLoPrepara | null>(null);
  const deLaPagina = pagina?.quienLoPrepara ?? loQueProponeElNombre(nuevaPagina).quienLoPrepara;
  const [trabajando, setTrabajando] = useState(false);
  const listo =
    nombre.trim() !== '' && precio !== null && (pagina !== undefined || nuevaPagina.trim() !== '');

  async function crear() {
    setTrabajando(true);
    let destino = pagina?.id;
    if (destino === undefined) {
      const hecha = await orden<{ paginaId: string }>('crear_pagina_del_tpv', {
        nombre: nuevaPagina.trim(),
      });
      destino = hecha.ok ? hecha.datos.paginaId : undefined;
    }
    if (destino !== undefined) {
      const hecho = await orden('nuevo_producto_del_tpv', {
        nombre: nombre.trim(),
        precio_centimos: precio,
        pagina_id: destino,
        ...(quien === null ? {} : { quien_lo_prepara: quien }),
      });
      if (hecho.ok) alCerrar();
    }
    setTrabajando(false);
  }

  return (
    <Hoja
      abierta
      titulo="Nuevo producto"
      alCerrar={alCerrar}
      pie={
        <Botones>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={trabajando}
            textoCargando="Creando"
            onClick={() => {
              void crear();
            }}
          >
            Crear el producto
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4 pt-e3">
        <Campo
          etiqueta="Nombre"
          placeholder="Ej.: Tortilla de patatas"
          value={nombre}
          maxLength={120}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
        />
        <CampoMoneda etiqueta="Precio, con IVA" valor={precio} alCambiar={setPrecio} />
        {paginas.length > 0 ? (
          <Selector
            etiqueta="Página"
            value={paginaId}
            opciones={paginas.map((g) => ({ valor: g.id, texto: g.nombre }))}
            onChange={(e) => {
              setPaginaId(e.target.value);
            }}
          />
        ) : (
          <Campo
            etiqueta="Página"
            placeholder="Ej.: Entrantes"
            value={nuevaPagina}
            maxLength={30}
            onChange={(e) => {
              setNuevaPagina(e.target.value);
            }}
          />
        )}
        <Pregunta titulo="¿Quién lo prepara?">
          {QUIEN_LO_PREPARA.map((q) => (
            <Opcion
              key={q}
              puesto={(quien ?? deLaPagina) === q}
              onClick={() => {
                setQuien(q);
              }}
            >
              {NOMBRE_DE_QUIEN_LO_PREPARA[q]}
            </Opcion>
          ))}
        </Pregunta>
        <p className="text-secundario text-texto-suave">
          Se crea también en tu carta de Estook, en la sección que se llama como la página,{' '}
          <strong className="text-texto">sin escandallo</strong>: complétalo allí cuando quieras
          para que el almacén lo descuente.
        </p>
      </div>
    </Hoja>
  );
}

// ═══ Las piezas ═══════════════════════════════════════════════════════════════

/** La carta con casillas, sección a sección, y «Todos» en cada una (Anexo 11.11). */
function ElegirDeLaCarta({
  titulo,
  carta,
  yaEstan,
  textoDelBoton,
  trabajando,
  alVolver,
  alElegir,
}: {
  readonly titulo?: string;
  readonly carta: LaBotonera['carta'];
  readonly yaEstan: ReadonlySet<string>;
  readonly textoDelBoton: (n: number) => string;
  readonly trabajando: boolean;
  readonly alVolver?: () => void;
  readonly alElegir: (ids: readonly string[]) => void;
}) {
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(new Set());
  const marcar = (ids: readonly string[], si: boolean) => {
    setMarcados((antes) => {
      const nuevo = new Set(antes);
      for (const id of ids) {
        if (si) nuevo.add(id);
        else nuevo.delete(id);
      }
      return nuevo;
    });
  };
  const libres = (platos: readonly PlatoParaLaBotonera[]) =>
    platos.filter((p) => !yaEstan.has(p.id)).map((p) => p.id);

  return (
    <div className="flex flex-col gap-e4">
      {titulo !== undefined && <h1 className="text-pantalla font-bold">{titulo}</h1>}
      {carta.length === 0 && (
        <p className="text-cuerpo text-texto-suave">
          Tu carta está vacía: pon platos en Estook › Carta.
        </p>
      )}
      {carta.map((s) => {
        const deEsta = libres(s.platos);
        const todos = deEsta.length > 0 && deEsta.every((id) => marcados.has(id));
        return (
          <fieldset key={s.id ?? 'sin-seccion'} className="flex flex-col gap-e2">
            <div className="flex items-center gap-e3">
              <legend className="text-seccion font-bold">{s.nombre}</legend>
              {deEsta.length > 1 && (
                <label className="flex min-h-toque items-center gap-e2 text-secundario font-semibold">
                  <input
                    type="checkbox"
                    checked={todos}
                    onChange={(e) => {
                      marcar(deEsta, e.target.checked);
                    }}
                    className="size-[1.2rem] accent-naranja"
                  />
                  Todos
                </label>
              )}
            </div>
            <div className="grid gap-e1 sm:grid-cols-2">
              {s.platos.map((p) => {
                const esta = yaEstan.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={[
                      'flex min-h-toque items-center gap-e3 rounded-grande border border-borde px-e3',
                      esta ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      disabled={esta}
                      checked={esta || marcados.has(p.id)}
                      onChange={(e) => {
                        marcar([p.id], e.target.checked);
                      }}
                      className="size-[1.2rem] accent-naranja"
                    />
                    <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                    <span className="text-secundario text-texto-suave">
                      {esta
                        ? 'ya está'
                        : p.precioCentimos === null
                          ? 'sin precio'
                          : euros(p.precioCentimos)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <Botones>
        {alVolver !== undefined && (
          <Boton tono="secundario" onClick={alVolver}>
            Volver
          </Boton>
        )}
        <Boton
          tono="principal"
          disabled={marcados.size === 0}
          cargando={trabajando}
          textoCargando="Poniendo"
          onClick={() => {
            alElegir([...marcados]);
          }}
        >
          {textoDelBoton(marcados.size)}
        </Boton>
      </Botones>
    </div>
  );
}

function ElegirColor({
  color,
  alCambiar,
  sinColor,
}: {
  readonly color: ColorDeLaBotonera | null;
  readonly alCambiar: (c: ColorDeLaBotonera | null) => void;
  readonly sinColor: string;
}) {
  return (
    <Pregunta titulo="Color">
      <Opcion
        puesto={color === null}
        onClick={() => {
          alCambiar(null);
        }}
      >
        {sinColor}
      </Opcion>
      {COLORES_DE_LA_BOTONERA.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={color === c}
          aria-label={COMO_SE_VE_EL_COLOR[c].nombre}
          title={COMO_SE_VE_EL_COLOR[c].nombre}
          onClick={() => {
            alCambiar(c);
          }}
          className={[
            'size-toque rounded-redondo',
            COMO_SE_VE_EL_COLOR[c].punto,
            color === c ? 'outline outline-[3px] outline-offset-2 outline-texto' : '',
          ].join(' ')}
        />
      ))}
    </Pregunta>
  );
}

function Pregunta({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-e1">
      <span className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">
        {titulo}
      </span>
      <div role="radiogroup" aria-label={titulo} className="flex flex-wrap gap-e1">
        {children}
      </div>
    </div>
  );
}

function Opcion({
  puesto,
  desactivado = false,
  onClick,
  children,
}: {
  readonly puesto?: boolean;
  readonly desactivado?: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={desactivado}
      onClick={onClick}
      {...(puesto === undefined ? {} : { role: 'radio', 'aria-checked': puesto })}
      className={[
        'min-h-toque rounded-grande px-e4 font-semibold disabled:opacity-50',
        puesto === true ? 'bg-texto text-fondo' : 'border-2 border-borde',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
