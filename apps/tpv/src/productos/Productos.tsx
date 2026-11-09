import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  COLORES_DE_LA_BOTONERA,
  COMO_SE_VE_LO_MAS_PEDIDO,
  NOMBRE_DE_QUIEN_LO_PREPARA,
  QUIEN_LO_PREPARA,
  centimos,
  comoSeVeElNombre,
  cuantasSeEligen,
  loQueProponeElNombre,
  type CaminoDeLaBotonera,
  type Centimos,
  type ColorDeLaBotonera,
  type IconoDeLaSeccion,
  type QuienLoPrepara,
} from '@estook/dominio';
import {
  IconoArrastrar,
  IconoColor,
  IconoEditar,
  IconoFlechaDerecha,
  IconoFlechaIzquierda,
} from '@estook/iconos';
import {
  Boton,
  Botones,
  COMO_SE_VE_EL_COLOR,
  Campo,
  CampoMoneda,
  Cargando,
  ElegirIconoYColor,
  ErrorEnCristiano,
  Hoja,
  Interruptor,
  LaBaldosaDeLaSeccion,
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
import { HojaDeGrupo } from './HojaDeGrupo.tsx';
import { MontaTusBebidas } from './MontaTusBebidas.tsx';
import { irA } from '../navegar.ts';
import { moverUnPuesto, usarArrastrar } from '../ganchos/usarArrastrar.ts';

/**
 * **Ajustes del TPV › Productos y precios: la botonera** (T3, Anexo 11.11; reordenada en R3,
 * 0133). Qué se vende en el TPV, en qué sección, con qué icono y color, y **quién lo prepara**.
 * **En qué pase sale no se pregunta** (Richi, 28-oct): lo elige el camarero en cada mesa.
 *
 *   · **Al empezar, tres caminos**: traer toda la carta, elegir lo que se vende aquí o
 *     empezar de cero
 *   · **las secciones** a la izquierda, con su icono y su color (Estook los pone por el
 *     nombre); se arrastran para ordenarlas. A la derecha, la que se toca: quién la prepara,
 *     que heredan sus productos, y sus productos
 *   · **los productos**: «+ De la carta», su color, lo suyo si cambia lo de su sección (el
 *     pan, de «Nadie»), «En Lo más pedido», moverlo o quitarlo
 *   · **«Nuevos en la carta»**: lo que está en la carta y aún no en el TPV, con «Añadir»
 *   · **«Nuevo producto»**: nace también en la carta de Estook, sin escandallo
 *
 * «Página» pasó a llamarse **«Sección»** en R3, como en la Carta de Estook (por dentro sigue
 * siendo `pagina_del_tpv`). La botonera no copia la carta: el precio, el IVA, la foto y el
 * escandallo son los de la carta, y se cambian en Estook.
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
        'Cada sección de tu carta, con su icono y su color, en su orden. Lo que añadas a la carta después entra solo.',
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
        'Creas los productos aquí: nombre, precio, sección y quién lo prepara. Van también a tu carta de Estook, «sin escandallo», para completarlos allí cuando quieras.',
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

// ═══ La botonera montada: las secciones a la izquierda, la que tocas a la derecha ═══

/** «Lo más pedido», en la lista de secciones: no es una sección guardada. */
const LO_MAS_PEDIDO = 'lo-mas-pedido';

type LaHoja =
  | { readonly que: 'icono'; readonly pagina: PaginaDeLaBotonera }
  | { readonly que: 'nombre'; readonly pagina: PaginaDeLaBotonera }
  | { readonly que: 'quitar'; readonly pagina: PaginaDeLaBotonera }
  | {
      readonly que: 'boton';
      readonly pagina: PaginaDeLaBotonera;
      readonly boton: BotonDeLaBotonera;
    }
  | { readonly que: 'de_la_carta'; readonly pagina: PaginaDeLaBotonera }
  | { readonly que: 'nueva_pagina' }
  | { readonly que: 'nuevo_producto' };

/**
 * **Productos y precios** (R3, 0133; maqueta aprobada el 5-nov), como el editor de un TPV
 * profesional: **la lista de secciones** a la izquierda (se arrastran para ordenarlas, en el
 * orden del comandero) y **el detalle de la que tocas** a la derecha, con su icono y su color,
 * quién la prepara y sus productos tal como se ven al pedir. En el móvil, primero la lista; al
 * tocar una sección se abre su detalle, con «‹ Secciones» para volver.
 */
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
  const [hoja, setHoja] = useState<LaHoja | null>(
    conElNuevoAbierto && datos.puedeCrearProductos ? { que: 'nuevo_producto' } : null,
  );
  const [elegida, setElegida] = useState<string | null>(null);
  const cerrar = () => {
    setHoja(null);
    if (conElNuevoAbierto) irA('ajustes/productos');
  };
  const paginas = datos.paginas;
  const marcados = paginas.flatMap((g) =>
    g.botones.filter((b) => b.fijado).map((b) => ({ pagina: g, boton: b })),
  );
  // La que se ve a la derecha: la tocada; si no, en la tablet, la primera. En el móvil, sin
  // tocar ninguna, solo la lista.
  const existe = (id: string | null) =>
    id !== null && (id === LO_MAS_PEDIDO || paginas.some((g) => g.id === id));
  const tocada = existe(elegida) ? elegida : null;
  const vista = tocada ?? paginas[0]?.id ?? null;
  // Lo de la hoja abierta, siempre como está ahora: tras ordenar o cambiar, no la copia vieja.
  const laDeAhora = (g: PaginaDeLaBotonera) => paginas.find((x) => x.id === g.id) ?? g;
  const hojaViva = ((): LaHoja | null => {
    if (hoja === null) return null;
    if (hoja.que === 'boton') {
      const id = hoja.boton.botonId;
      const pagina = paginas.find((g) => g.botones.some((b) => b.botonId === id)) ?? hoja.pagina;
      return { ...hoja, pagina, boton: pagina.botones.find((b) => b.botonId === id) ?? hoja.boton };
    }
    if ('pagina' in hoja) return { ...hoja, pagina: laDeAhora(hoja.pagina) };
    return hoja;
  })();
  const ids = useMemo(() => paginas.map((g) => g.id), [paginas]);
  const arrastre = usarArrastrar(ids, (nuevo) => {
    void orden('ordenar_las_paginas_del_tpv', { paginas: nuevo });
  });
  const laVista = paginas.find((g) => g.id === vista);

  return (
    <>
      <div className="flex flex-wrap items-center gap-e3">
        <h1 className="text-pantalla font-bold">Productos y precios</h1>
        <span className="rounded-redondo bg-charcoal px-e3 py-[2px] text-secundario font-semibold">
          {NOMBRE_DEL_CAMINO[camino]}
        </span>
        <div className="ml-auto flex flex-wrap gap-e2">
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

      <div className="grid items-start gap-e5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* ── Las secciones ── */}
        <div className={['flex-col gap-e4', tocada === null ? 'flex' : 'hidden lg:flex'].join(' ')}>
          <section aria-label="Secciones" className="flex flex-col gap-e2">
            <h2 className="text-seccion font-bold">Secciones</h2>
            <div className="flex flex-col overflow-hidden rounded-mayor bg-superficie">
              <FilaDeSeccion
                nombre="Lo más pedido"
                icono={COMO_SE_VE_LO_MAS_PEDIDO.icono}
                color={COMO_SE_VE_LO_MAS_PEDIDO.color}
                linea={
                  marcados.length === 0
                    ? 'No sale: nada marcado'
                    : `Sale · ${String(marcados.length)} ${marcados.length === 1 ? 'marcado' : 'marcados'}`
                }
                apagada={marcados.length === 0}
                vista={vista === LO_MAS_PEDIDO}
                alTocar={() => {
                  setElegida(LO_MAS_PEDIDO);
                }}
              />
              {paginas.map((g) => (
                <FilaDeSeccion
                  key={g.id}
                  id={g.id}
                  nombre={g.nombre}
                  icono={elIconoDe(g)}
                  color={g.color}
                  linea={`${g.botones.length === 1 ? '1 producto' : `${String(g.botones.length)} productos`} · ${NOMBRE_DE_QUIEN_LO_PREPARA[g.quienLoPrepara]}`}
                  vista={vista === g.id}
                  asa={arrastre.asa(g.id)}
                  arrastrando={arrastre.arrastrando === g.id}
                  sobre={arrastre.sobre === g.id}
                  alTocar={() => {
                    setElegida(g.id);
                  }}
                />
              ))}
            </div>
            {paginas.length === 0 && (
              <p className="text-secundario text-texto-suave">
                Aún no hay secciones. Crea una con «+ Nueva sección»
                {datos.puedeCrearProductos ? ', o un producto con «Nuevo producto»' : ''}.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setHoja({ que: 'nueva_pagina' });
              }}
              className="min-h-toque rounded-mayor border-2 border-dashed border-borde px-e4 font-bold text-texto-suave"
            >
              + Nueva sección
            </button>
          </section>
          <NuevosEnLaCarta datos={datos} orden={orden} />
          <div className="rounded-mayor bg-superficie p-e4">
            <Interruptor
              etiqueta="Lo nuevo de la carta entra solo"
              ayuda="Cada plato que añadas en Estook › Carta sale aquí, en su sección."
              puesto={datos.entraSolo}
              alCambiar={(si) => {
                void orden('lo_nuevo_entra_solo', { si });
              }}
            />
          </div>
          <details className="rounded-mayor bg-superficie p-e4 text-secundario text-texto-suave">
            <summary className="min-h-toque cursor-pointer content-center font-bold text-texto">
              ¿Cómo funciona?
            </summary>
            <p className="pt-e2">
              <strong className="text-texto">«Lo más pedido»</strong> sale la primera en el TPV solo
              si marcas algún producto (tócalo y enciende «En Lo más pedido»): primero lo marcado y
              después lo que más se vende a esa hora. Sin nada marcado no sale, y el camarero llega
              antes a las demás.
            </p>
            <p className="pt-e2">
              Cada sección pasa a sus productos su color y quién la prepara. Un producto puede tener
              lo suyo: el pan, en Entrantes, es de «Nadie» (se sirve tal cual y no va a ninguna
              pantalla).
            </p>
          </details>
        </div>

        {/* ── La que tocas ── */}
        <div className={['flex-col gap-e4', tocada === null ? 'hidden lg:flex' : 'flex'].join(' ')}>
          <button
            type="button"
            onClick={() => {
              setElegida(null);
            }}
            className="flex min-h-toque items-center gap-e1 self-start font-semibold text-texto-suave lg:hidden"
          >
            <IconoFlechaIzquierda size={20} />
            Secciones
          </button>
          {vista === LO_MAS_PEDIDO ? (
            <ElDetalleDeLoMasPedido
              marcados={marcados}
              alTocarUnBoton={(pagina, boton) => {
                setHoja({ que: 'boton', pagina, boton });
              }}
            />
          ) : laVista === undefined ? (
            <div className="rounded-mayor border-2 border-dashed border-borde p-e5 text-cuerpo text-texto-suave">
              Crea la primera sección con «+ Nueva sección».
            </div>
          ) : (
            <ElDetalleDeLaSeccion key={laVista.id} pagina={laVista} orden={orden} abrir={setHoja} />
          )}
        </div>
      </div>

      {hojaViva?.que === 'icono' && (
        <HojaIconoYColor pagina={hojaViva.pagina} orden={orden} alCerrar={cerrar} />
      )}
      {hojaViva?.que === 'nombre' && (
        <HojaNombreDeLaSeccion pagina={hojaViva.pagina} ids={ids} orden={orden} alCerrar={cerrar} />
      )}
      {hojaViva?.que === 'quitar' && (
        <HojaQuitarLaSeccion pagina={hojaViva.pagina} orden={orden} alCerrar={cerrar} />
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
      {hojaViva?.que === 'nueva_pagina' && (
        <HojaNuevaPagina
          orden={orden}
          alCerrar={cerrar}
          alCrear={(id) => {
            setElegida(id);
          }}
        />
      )}
      {hojaViva?.que === 'nuevo_producto' && (
        <HojaNuevoProducto paginas={paginas} orden={orden} alCerrar={cerrar} />
      )}
    </>
  );
}

/** El icono de una sección: el que manda la API, o el de su nombre con una API de antes. */
function elIconoDe(g: {
  readonly nombre: string;
  readonly icono?: IconoDeLaSeccion;
}): IconoDeLaSeccion {
  return g.icono ?? comoSeVeElNombre(g.nombre).icono;
}

/** Una fila de la lista de secciones: el asa, su baldosa, su nombre y una línea. */
function FilaDeSeccion({
  id,
  nombre,
  icono,
  color,
  linea,
  apagada = false,
  vista,
  asa,
  arrastrando = false,
  sobre = false,
  alTocar,
}: {
  readonly id?: string;
  readonly nombre: string;
  readonly icono: IconoDeLaSeccion;
  readonly color: ColorDeLaBotonera | null;
  readonly linea: string;
  readonly apagada?: boolean;
  readonly vista: boolean;
  readonly asa?: ReturnType<ReturnType<typeof usarArrastrar>['asa']>;
  readonly arrastrando?: boolean;
  readonly sobre?: boolean;
  readonly alTocar: () => void;
}) {
  return (
    <div
      {...(id === undefined ? {} : { 'data-orden': id })}
      className={[
        'flex items-center border-b border-borde last:border-b-0',
        vista ? 'lg:bg-charcoal lg:shadow-[inset_3px_0_0_var(--color-naranja)]' : '',
        arrastrando ? 'opacity-60' : '',
        sobre ? 'outline outline-2 -outline-offset-2 outline-naranja' : '',
      ].join(' ')}
    >
      {asa === undefined ? (
        <span aria-hidden="true" className="w-[2rem] shrink-0" />
      ) : (
        <span
          {...asa}
          role="img"
          aria-label={`Arrastrar ${nombre}`}
          className="flex min-h-toque w-[2rem] shrink-0 select-none items-center justify-center text-texto-tenue"
        >
          <IconoArrastrar size={18} />
        </span>
      )}
      <button
        type="button"
        onClick={alTocar}
        aria-label={`${nombre}: ${linea}`}
        aria-current={vista ? 'true' : undefined}
        className="flex min-h-toque-cocina min-w-0 flex-1 items-center gap-e3 py-e2 pr-e3 text-left"
      >
        <span className={apagada ? 'opacity-50' : ''}>
          <LaBaldosaDeLaSeccion icono={icono} color={color} lado={36} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold">{nombre}</span>
          <span className="truncate text-secundario text-texto-suave">{linea}</span>
        </span>
        <IconoFlechaDerecha size={18} className="shrink-0 text-texto-tenue" />
      </button>
    </div>
  );
}

/** El detalle de una sección: su icono y su color, quién la prepara y sus productos. */
function ElDetalleDeLaSeccion({
  pagina,
  orden,
  abrir,
}: {
  readonly pagina: PaginaDeLaBotonera;
  readonly orden: Orden;
  readonly abrir: (hoja: LaHoja) => void;
}) {
  const idsDeBotones = useMemo(() => pagina.botones.map((b) => b.botonId), [pagina.botones]);
  const arrastre = usarArrastrar(idsDeBotones, (nuevo) => {
    void orden('ordenar_los_botones', { pagina_id: pagina.id, botones: nuevo });
  });
  const n = pagina.botones.length;

  return (
    <section aria-label={`Sección ${pagina.nombre}`} className="flex flex-col gap-e4">
      <div className="flex flex-wrap items-center gap-e4">
        <LaBaldosaDeLaSeccion icono={elIconoDe(pagina)} color={pagina.color} lado={64} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-pantalla font-bold [overflow-wrap:anywhere]">{pagina.nombre}</h2>
          <span className="text-secundario text-texto-suave">
            {pagina.deLaSeccion !== null ? `Viene de «${pagina.deLaSeccion}» de tu carta · ` : ''}
            {n === 1 ? '1 producto' : `${String(n)} productos`}
          </span>
        </div>
        <div className="flex flex-wrap gap-e2">
          <Boton
            tono="secundario"
            onClick={() => {
              abrir({ que: 'icono', pagina });
            }}
          >
            <IconoColor size={18} />
            Icono y color
          </Boton>
          <Boton
            tono="secundario"
            onClick={() => {
              abrir({ que: 'nombre', pagina });
            }}
          >
            <IconoEditar size={18} />
            Nombre
          </Boton>
        </div>
      </div>

      {pagina.deSiempre !== null && (
        <p className="text-secundario text-texto-suave">
          {pagina.deSiempre === 'pan'
            ? 'Aquí entran solos el pan y el agua de tu carta, estén en la sección que estén: los sirve el camarero.'
            : 'Aquí entran solos los cafés y las infusiones de tu carta, estén en la sección que estén: los hace la barra.'}
        </p>
      )}

      <Pregunta titulo="¿Quién lo prepara?">
        {QUIEN_LO_PREPARA.map((q) => (
          <Opcion
            key={q}
            puesto={pagina.quienLoPrepara === q}
            onClick={() => {
              void orden('cambiar_pagina_del_tpv', { pagina_id: pagina.id, quien_lo_prepara: q });
            }}
          >
            {NOMBRE_DE_QUIEN_LO_PREPARA[q]}
          </Opcion>
        ))}
      </Pregunta>

      <div className="flex flex-col gap-e2">
        <p className="text-cuerpo">
          <strong>Productos</strong>
          <span className="text-secundario text-texto-suave">
            {n > 1 ? ' · arrastra para ordenar; toca uno para cambiar lo suyo' : ''}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3 xl:grid-cols-4">
          {pagina.botones.map((b) => {
            const suyo = b.quienLoPrepara !== null && b.quienLoPrepara !== pagina.quienLoPrepara;
            const color = b.color ?? pagina.color;
            return (
              <div
                key={b.botonId}
                data-orden={b.botonId}
                className={[
                  'flex min-h-[4.25rem] items-stretch overflow-hidden rounded-grande border border-borde bg-fondo',
                  color === null ? '' : `border-l-[6px] ${COMO_SE_VE_EL_COLOR[color].franja}`,
                  arrastre.arrastrando === b.botonId ? 'opacity-60' : '',
                  arrastre.sobre === b.botonId ? 'outline outline-2 outline-naranja' : '',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => {
                    abrir({ que: 'boton', pagina, boton: b });
                  }}
                  aria-label={b.nombre}
                  className="flex min-w-0 flex-1 flex-col justify-center py-e2 pl-e3 text-left"
                >
                  <span className="line-clamp-2 font-semibold leading-tight [overflow-wrap:anywhere]">
                    {b.nombre}
                  </span>
                  <span className="text-secundario text-texto-suave">
                    {b.precioCentimos === null ? 'Sin precio' : euros(b.precioCentimos)}
                    {suyo ? ` · ${NOMBRE_DE_QUIEN_LO_PREPARA[b.quienLoPrepara]}` : ''}
                    {b.fijado ? ' · ★' : ''}
                  </span>
                </button>
                {n > 1 && (
                  <span
                    {...arrastre.asa(b.botonId)}
                    role="img"
                    aria-label={`Arrastrar ${b.nombre}`}
                    className="flex w-[1.75rem] shrink-0 select-none items-center justify-center text-texto-tenue"
                  >
                    <IconoArrastrar size={16} />
                  </span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              abrir({ que: 'de_la_carta', pagina });
            }}
            className="min-h-[4.25rem] rounded-grande border-2 border-dashed border-borde px-e3 font-semibold text-texto-suave"
          >
            + De la carta
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-e2">
        <button
          type="button"
          onClick={() => {
            abrir({ que: 'quitar', pagina });
          }}
          className="min-h-toque px-e3 font-semibold text-mal"
        >
          Quitar la sección
        </button>
      </div>
    </section>
  );
}

/** «Lo más pedido», a la derecha: lo marcado, y cuándo sale. */
function ElDetalleDeLoMasPedido({
  marcados,
  alTocarUnBoton,
}: {
  readonly marcados: readonly {
    readonly pagina: PaginaDeLaBotonera;
    readonly boton: BotonDeLaBotonera;
  }[];
  readonly alTocarUnBoton: (pagina: PaginaDeLaBotonera, boton: BotonDeLaBotonera) => void;
}) {
  return (
    <section aria-label="Sección Lo más pedido" className="flex flex-col gap-e4">
      <div className="flex items-center gap-e4">
        <LaBaldosaDeLaSeccion
          icono={COMO_SE_VE_LO_MAS_PEDIDO.icono}
          color={COMO_SE_VE_LO_MAS_PEDIDO.color}
          lado={64}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-pantalla font-bold">Lo más pedido</h2>
          <span className="text-secundario text-texto-suave">
            {marcados.length === 0
              ? 'No sale en el TPV: no hay nada marcado'
              : 'Sale la primera: lo marcado, y después lo que más se vende a esa hora'}
          </span>
        </div>
      </div>
      {marcados.length === 0 ? (
        <p className="rounded-mayor border-2 border-dashed border-borde p-e4 text-cuerpo text-texto-suave">
          Para que salga, toca un producto en su sección y enciende{' '}
          <strong className="text-texto">«En Lo más pedido»</strong>. Sin nada marcado no ocupa
          sitio en el comandero.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-e2 sm:grid-cols-3 xl:grid-cols-4">
          {marcados.map(({ pagina, boton }) => {
            const color = boton.color ?? pagina.color;
            return (
              <button
                key={boton.botonId}
                type="button"
                onClick={() => {
                  alTocarUnBoton(pagina, boton);
                }}
                className={[
                  'flex min-h-[4.25rem] flex-col justify-center rounded-grande border border-borde bg-fondo py-e2 pl-e3 text-left',
                  color === null ? '' : `border-l-[6px] ${COMO_SE_VE_EL_COLOR[color].franja}`,
                ].join(' ')}
              >
                <span className="line-clamp-2 font-semibold leading-tight">{boton.nombre}</span>
                <span className="text-secundario text-texto-suave">{pagina.nombre}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ═══ Las hojas de una sección ═════════════════════════════════════════════════

/**
 * **Icono y color** (maqueta «El icono y el color de una sección»): arriba cómo quedará en el
 * comandero; debajo los once colores y los treinta iconos de Lucide.
 */
function HojaIconoYColor({
  pagina,
  orden,
  alCerrar,
}: {
  readonly pagina: PaginaDeLaBotonera;
  readonly orden: Orden;
  readonly alCerrar: () => void;
}) {
  const [color, setColor] = useState<ColorDeLaBotonera | null>(pagina.color);
  const [icono, setIcono] = useState<IconoDeLaSeccion>(elIconoDe(pagina));
  const [trabajando, setTrabajando] = useState(false);

  async function guardar() {
    setTrabajando(true);
    const hecho = await orden('cambiar_pagina_del_tpv', { pagina_id: pagina.id, icono, color });
    setTrabajando(false);
    if (hecho.ok) alCerrar();
  }

  return (
    <Hoja
      abierta
      titulo="Icono y color"
      alCerrar={alCerrar}
      pie={
        <Botones>
          <Boton
            tono="principal"
            cargando={trabajando}
            textoCargando="Guardando"
            onClick={() => {
              void guardar();
            }}
          >
            Guardar
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4 pt-e3">
        <div className="flex items-center gap-e3 rounded-mayor bg-fondo p-e3">
          <LaBaldosaDeLaSeccion icono={icono} color={color} lado={52} />
          <div className="flex min-w-0 flex-col">
            <strong className="truncate">{pagina.nombre}</strong>
            <span className="text-secundario text-texto-suave">
              {pagina.deLaSeccion === null
                ? 'Así se verá en el comandero'
                : 'Así se verá aquí y en Estook › Carta'}
            </span>
          </div>
        </div>
        <ElegirIconoYColor
          color={color}
          icono={icono}
          alCambiarElColor={setColor}
          alCambiarElIcono={setIcono}
        />
      </div>
    </Hoja>
  );
}

/** El nombre de la sección, y su sitio en la lista para quien no arrastra. */
function HojaNombreDeLaSeccion({
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
  const donde = ids.indexOf(pagina.id);

  async function guardar() {
    const hecho = await orden('cambiar_pagina_del_tpv', {
      pagina_id: pagina.id,
      nombre: nombre.trim(),
    });
    if (hecho.ok) alCerrar();
  }

  return (
    <Hoja
      abierta
      titulo={pagina.nombre}
      alCerrar={alCerrar}
      pie={
        <Botones>
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
      }
    >
      <div className="flex flex-col gap-e4 pt-e3">
        <Campo
          etiqueta="Nombre de la sección"
          value={nombre}
          maxLength={30}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
        />
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
    </Hoja>
  );
}

function HojaQuitarLaSeccion({
  pagina,
  orden,
  alCerrar,
}: {
  readonly pagina: PaginaDeLaBotonera;
  readonly orden: Orden;
  readonly alCerrar: () => void;
}) {
  return (
    <Hoja
      abierta
      titulo={`Quitar ${pagina.nombre}`}
      alCerrar={alCerrar}
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
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
            Quitar la sección
          </Boton>
        </Botones>
      }
    >
      <p className="pt-e3 text-cuerpo">
        Sus productos se van con ella. <strong>Los platos siguen en tu carta</strong>: solo dejan de
        venderse en el TPV.
      </p>
    </Hoja>
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
          Lo que no tiene sección se pone con «+ De la carta» en la sección que quieras.
        </p>
      )}
    </section>
  );
}

// ═══ Las hojas de un producto ═══════════════════════════════════════════════

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
          <span className="text-secundario font-bold text-texto-suave">Opciones al pedirlo</span>
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
        <ElegirColor
          color={color}
          alCambiar={(c) => {
            setColor(c);
            void cambiar({ color: c });
          }}
          sinColor="El de la sección"
        />
        <Interruptor
          etiqueta="En «Lo más pedido»"
          ayuda="«Lo más pedido» sale en el TPV solo si hay algo marcado: lo marcado primero, y después lo que más se vende a esa hora."
          puesto={fijado}
          alCambiar={(si) => {
            setFijado(si);
            void cambiar({ fijado: si });
          }}
        />
        {paginas.length > 1 && (
          <Selector
            etiqueta="Sección"
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
  alCrear,
}: {
  readonly orden: Orden;
  readonly alCerrar: () => void;
  /** La sección nueva se abre a la derecha. */
  readonly alCrear: (paginaId: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const propone = loQueProponeElNombre(nombre);
  const seVe = comoSeVeElNombre(nombre);
  return (
    <Hoja
      abierta
      titulo="Nueva sección"
      alCerrar={alCerrar}
      pie={
        <Botones>
          <Boton
            tono="principal"
            disabled={nombre.trim() === ''}
            onClick={() => {
              void orden<{ paginaId: string }>('crear_pagina_del_tpv', {
                nombre: nombre.trim(),
              }).then((r) => {
                if (!r.ok) return;
                alCrear(r.datos.paginaId);
                alCerrar();
              });
            }}
          >
            Crear la sección
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        <Campo
          etiqueta="Nombre de la sección"
          placeholder="Ej.: Vinos, Del día, Tapas…"
          value={nombre}
          maxLength={30}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
        />
        {nombre.trim() !== '' && (
          <div className="flex items-center gap-e3">
            <LaBaldosaDeLaSeccion icono={seVe.icono} color={seVe.color} lado={44} />
            <p className="text-secundario text-texto-suave">
              La prepara {NOMBRE_DE_QUIEN_LO_PREPARA[propone.quienLoPrepara].toLowerCase()}. El
              icono, el color y quién la prepara se cambian después con un toque.
            </p>
          </div>
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
  // Se propone la primera sección de la carta: un producto nuevo no suele ser pan ni café.
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
            etiqueta="Sección"
            value={paginaId}
            opciones={paginas.map((g) => ({ valor: g.id, texto: g.nombre }))}
            onChange={(e) => {
              setPaginaId(e.target.value);
            }}
          />
        ) : (
          <Campo
            etiqueta="Sección"
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
          Se crea también en tu carta de Estook, en la sección que se llama igual,{' '}
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
    <div className="flex flex-col gap-e2">
      <span className="text-secundario font-bold text-texto-suave">{titulo}</span>
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
