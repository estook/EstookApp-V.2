import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  comoSeDiceElTipo,
  comoSeLeeEscalada,
  comoSeLeeLaCantidad,
  factorParaUnIngrediente,
  unidadesQueSirven,
  type UnidadDeUso,
} from '@estook/dominio';
import { Aviso, Boton, Cargando, ErrorEnCristiano, PanelLateral, clases } from '@estook/ui';
import { IconoDocumento, IconoEditar, IconoHistorial, IconoVincular } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import { comoDinero } from '../almacen/contrato.ts';
import { LosAlergenos } from './Alergenos.tsx';
import { EditorDeLaReceta } from './EditorDeLaReceta.tsx';
import { VincularAlAlmacen } from './VincularAlAlmacen.tsx';
import {
  comoPorcentaje,
  comoSeLeeElCuando,
  tonoDelSemaforo,
  type CambioDeLaReceta,
  type EscandalloDeLaFicha,
  type QueFicha,
  type UnaFicha,
} from './contrato.ts';

/**
 * El escandallo de un plato (M9 · 2, 0087; solo el escandallo desde el repaso del
 * 16-oct, 0090).
 *
 * Lo desgrana todo: lo que lleva, en qué cantidad, lo que cuesta cada cosa y lo que
 * deja en cada canal. **Sin los pasos**: eso es la ficha técnica, en su pestaña, que
 * coge de aquí lo que lleva. Antes las dos iban en este panel («Ficha» y
 * «Escandallo» arriba), con un modo cocina, y Richi lo vio un lío: «repetimos dos
 * veces y es mucho trabajo».
 *
 * A quien no ve costes el servidor no le manda ni un euro: ve lo que lleva y sus
 * cantidades. Abajo, plegado, **el historial**: quién cambió qué y cuándo, la receta
 * de antes y «Recuperar» (0086, pregunta 5).
 *
 * También abre una elaboración que ya existiera (0087): no tienen pestaña desde el
 * 16-oct, pero las recetas que las llevan siguen enlazando a la suya.
 */
export function ElEscandalloDelPlato({
  ficha,
  alCerrar,
  alAbrir,
  empezarEditando = false,
}: {
  readonly ficha: QueFicha;
  readonly alCerrar: () => void;
  /** Para saltar a la ficha de una elaboración que lleva, o a un plato donde entra. */
  readonly alAbrir: (otra: QueFicha) => void;
  /** Recién elegido en «Añadir» (19-oct): el editor ya abierto, sin otro toque. */
  readonly empezarEditando?: boolean;
}) {
  const consulta = usarLectura<UnaFicha>(
    'una_ficha',
    ficha.tipo === 'plato' ? { plato_id: ficha.id } : { elaboracion_id: ficha.id },
  );
  const navegar = useNavigate();
  const [editando, setEditando] = useState(empezarEditando);
  const [vinculando, setVinculando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const datos = consulta.data;

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo="Escandallo">
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir este escandallo">
            Puede que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="el escandallo" lineas={5} />
        )}
      </PanelLateral>
    );
  }

  const sinFicha = datos.receta.lineas.length === 0;

  return (
    <PanelLateral abierta alCerrar={alCerrar} titulo={datos.nombre}>
      <div className="flex flex-col gap-e4 pt-e3">
        {hecho !== null && (
          <p aria-live="polite" className="text-secundario font-semibold text-bien">
            {hecho}
          </p>
        )}

        <Cabecera datos={datos} />

        {sinFicha ? (
          <SinFicha
            datos={datos}
            alDesgranar={() => {
              setEditando(true);
            }}
            alVincular={() => {
              setVinculando(true);
            }}
          />
        ) : (
          <>
            {datos.escandallo !== undefined ? (
              <ElEscandallo datos={datos} escandallo={datos.escandallo} alAbrir={alAbrir} />
            ) : (
              <LoQueLleva datos={datos} alAbrir={alAbrir} />
            )}

            <div className="flex flex-wrap gap-e2">
              {datos.puedeEditar && (
                <Boton
                  tono="principal"
                  icono={<IconoEditar size={18} />}
                  onClick={() => {
                    setEditando(true);
                  }}
                >
                  Editar el escandallo
                </Boton>
              )}
              {/* Su ficha técnica, al lado: coge de aquí lo que lleva (0090). También la
                  de una elaboración (19-oct). */}
              {(datos.tipo === 'elaboracion' || datos.vinculadoA === null) && (
                <Boton
                  tono="secundario"
                  icono={<IconoDocumento size={18} />}
                  onClick={() => {
                    navegar(`/escandallos/fichas/todas?ficha=${datos.tipo}.${datos.id}`);
                  }}
                >
                  Ficha técnica
                </Boton>
              )}
            </div>
          </>
        )}

        {datos.usadaEn.length > 0 && (
          <section aria-label="Dónde entra" className="flex flex-col gap-e1">
            <h3 className="text-secundario font-semibold text-texto-suave">Entra en</h3>
            <ul className="flex flex-wrap gap-e2">
              {datos.usadaEn.map((u) => (
                <li key={`${u.tipo}.${u.id}`}>
                  <Boton
                    tono="secundario"
                    tamano="s"
                    onClick={() => {
                      alAbrir({ tipo: u.tipo, id: u.id });
                    }}
                  >
                    {u.nombre}
                  </Boton>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Historial
          datos={datos}
          alHecho={(frase) => {
            setHecho(frase);
          }}
        />

        {datos.tipo === 'elaboracion' && datos.puedeEditar && (
          <ArchivarLaElaboracion
            datos={datos}
            alHecho={(frase) => {
              setHecho(frase);
            }}
          />
        )}
      </div>

      {editando && (
        <EditorDeLaReceta
          datos={datos}
          que="escandallo"
          alCerrar={() => {
            setEditando(false);
          }}
          alGuardar={(frase) => {
            setEditando(false);
            setHecho(frase);
          }}
        />
      )}
      {vinculando && datos.tipo === 'plato' && (
        <VincularAlAlmacen
          platoId={datos.id}
          nombre={datos.nombre}
          alCerrar={() => {
            setVinculando(false);
          }}
          alHecho={(frase) => {
            setVinculando(false);
            setHecho(frase);
          }}
        />
      )}
    </PanelLateral>
  );
}

// ── Archivar una elaboración (nada se borra) ─────────────────────────────────

function ArchivarLaElaboracion({
  datos,
  alHecho,
}: {
  readonly datos: UnaFicha;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLasFichas();
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  return (
    <div className="flex flex-col items-start gap-e2">
      {error !== null && <ErrorEnCristiano error={error} />}
      {!datos.activo && (
        <p className="text-secundario text-texto-suave">
          Archivada: no sale para añadir. Lo que ya la lleva sigue igual.
        </p>
      )}
      <Boton
        tono="texto"
        cargando={trabajando}
        textoCargando={datos.activo ? 'Archivando' : 'Recuperando'}
        onClick={() => {
          void (async () => {
            setTrabajando(true);
            const respuesta = await cliente.ejecutar(
              datos.activo ? 'archivar_elaboracion' : 'recuperar_elaboracion',
              { elaboracion_id: datos.id },
            );
            setTrabajando(false);
            if (!respuesta.ok) {
              setError(respuesta.error);
              return;
            }
            alHecho(datos.activo ? 'Archivada' : 'Recuperada');
            await refrescar();
          })();
        }}
      >
        {datos.activo ? 'Archivar' : 'Recuperar'}
      </Boton>
    </div>
  );
}

// ── La cabecera: foto, qué es y sus alérgenos ────────────────────────────────

export function Cabecera({ datos }: { readonly datos: UnaFicha }) {
  const queEs = [
    datos.tipo === 'elaboracion'
      ? `Elaboración${datos.rinde === null ? '' : ` · rinde ${comoSeLeeLaCantidad(datos.rinde.cantidad, datos.rinde.unidad)}`}`
      : (datos.seccion ?? 'Sin sección'),
    // Los minutos, no: van con los pasos, en la ficha técnica (0090).
    ...(datos.unidadesPorRacion === null
      ? []
      : [`${String(datos.unidadesPorRacion)} ud por ración`]),
  ].join(' · ');
  return (
    <div className="flex items-start gap-e3">
      {datos.foto !== null && (
        <img
          src={datos.miniatura ?? datos.foto}
          alt=""
          className="size-[72px] shrink-0 rounded-grande bg-fondo object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-e2">
        <p className="text-secundario text-texto-suave">{queEs}</p>
        {datos.vinculadoA !== null && (
          <p className="flex items-center gap-e1 text-secundario">
            <IconoVincular size={16} className="shrink-0 text-texto-suave" />
            Se vende tal cual: <strong className="font-semibold">{datos.vinculadoA}</strong>
          </p>
        )}
        <LosAlergenos
          alergenos={datos.alergenos}
          picante={datos.picante}
          distintivos={datos.distintivos}
          lado={22}
          conNombre
        />
      </div>
    </div>
  );
}

// ── Sin ficha todavía ────────────────────────────────────────────────────────

function SinFicha({
  datos,
  alDesgranar,
  alVincular,
}: {
  readonly datos: UnaFicha;
  readonly alDesgranar: () => void;
  readonly alVincular: () => void;
}) {
  // **Desgranar es lo de casi siempre, y va grande** (Richi, 19-oct): «el de enlazar
  // en grande cuando solo se suele usar para bebidas confunde». Vincular queda debajo,
  // pequeño, diciendo para qué es.
  return (
    <div className="flex flex-col gap-e3 rounded-grande bg-fondo p-e4">
      <p className="text-cuerpo font-semibold">Sin escandallo todavía</p>
      <p className="text-secundario text-texto-suave">
        {datos.puedeEditar
          ? 'Pon lo que lleva una ración y en qué cantidad: el coste sale solo del Almacén.'
          : 'Cuando alguien lo desgrane, aquí estará lo que lleva.'}
      </p>
      {datos.puedeEditar && (
        <>
          <Boton tono="principal" ancho onClick={alDesgranar}>
            Desgranar
          </Boton>
          {datos.tipo === 'plato' && (
            <button
              type="button"
              onClick={alVincular}
              className="flex min-h-toque items-start gap-e2 self-start text-left text-secundario text-texto-suave hover:text-texto"
            >
              <IconoVincular size={16} className="mt-[3px] shrink-0" />
              <span>
                <span className="font-semibold text-texto underline decoration-borde-fuerte underline-offset-4">
                  Vincular a un producto
                </span>{' '}
                · para lo que se vende tal cual, sin elaborar: una bebida, un postre comprado
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Lo que lleva, sin un euro (a quien no ve costes) ─────────────────────────

/** Lo que lleva y en qué cantidad. Lo usa también la ficha técnica (0090). */
export function LoQueLleva({
  datos,
  alAbrir,
  factor = 1,
  alTener,
}: {
  readonly datos: UnaFicha;
  readonly alAbrir?: (otra: QueFicha) => void;
  /** Cuánto se multiplica lo escrito al escalar la ficha técnica (0092); 1, como está. */
  readonly factor?: number;
  /**
   * Si se puede escalar tocando un ingrediente: tocar su cantidad pregunta cuánto
   * tienes, y avisa con el factor (como meez: «tengo 3 kg de carrillera»).
   */
  readonly alTener?: (factor: number) => void;
}) {
  const [tocada, setTocada] = useState<string | null>(null);
  return (
    <section aria-label="Lo que lleva" className="flex flex-col">
      <h3 className="pb-e1 text-secundario font-semibold text-texto-suave">Lo que lleva</h3>
      <ul className="flex flex-col">
        {datos.receta.lineas.map((l) => {
          const cantidad =
            factor === 1
              ? comoSeLeeLaCantidad(l.cantidad, l.unidad)
              : comoSeLeeEscalada(l.cantidad, l.unidad, factor);
          return (
            <li key={l.id} className="flex flex-col border-b border-borde py-e1 last:border-0">
              <div className="flex min-h-toque items-center gap-e3">
                <span className="flex min-w-0 flex-1 flex-col">
                  {l.tipo === 'elaboracion' && alAbrir !== undefined ? (
                    <button
                      type="button"
                      className="self-start text-left text-cuerpo underline decoration-borde-fuerte underline-offset-4"
                      onClick={() => {
                        alAbrir({ tipo: 'elaboracion', id: l.refId });
                      }}
                    >
                      {l.nombre}
                    </button>
                  ) : (
                    <span className="truncate text-cuerpo">{l.nombre}</span>
                  )}
                  {(l.nota !== null || l.tipo === 'elaboracion') && (
                    <span className="text-etiqueta text-texto-suave">
                      {[l.tipo === 'elaboracion' ? 'Elaboración' : null, l.nota]
                        .filter((t): t is string => t !== null)
                        .join(' · ')}
                    </span>
                  )}
                </span>
                {alTener === undefined ? (
                  <span className="shrink-0 text-cuerpo font-semibold tabular-nums">
                    {cantidad}
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Escalar por lo que tienes de ${l.nombre}`}
                    aria-expanded={tocada === l.id}
                    onClick={() => {
                      setTocada((antes) => (antes === l.id ? null : l.id));
                    }}
                    className="-mr-e2 min-h-toque shrink-0 rounded-boton px-e2 text-cuerpo font-semibold tabular-nums underline decoration-borde-fuerte decoration-dotted underline-offset-4 hover:bg-fondo"
                  >
                    {cantidad}
                  </button>
                )}
              </div>
              {alTener !== undefined && tocada === l.id && (
                <TengoTanto
                  lleva={{ cantidad: l.cantidad, unidad: l.unidad }}
                  alEscalar={(nuevo) => {
                    setTocada(null);
                    alTener(nuevo);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Como las cajas de los campos (`CAJA`), pero del ancho de lo que llevan. */
const CAJITA =
  'min-h-toque rounded-medio border border-borde-fuerte bg-superficie text-cuerpo text-texto';

/** «Tengo [ 3 ] [kg] · Escalar»: escala toda la receta por lo que hay de un ingrediente. */
function TengoTanto({
  lleva,
  alEscalar,
}: {
  readonly lleva: { readonly cantidad: number; readonly unidad: UnidadDeUso };
  readonly alEscalar: (factor: number) => void;
}) {
  const sirven = unidadesQueSirven(lleva.unidad);
  const id = useId();
  const [cuanto, setCuanto] = useState('');
  // En la unidad en que se lee: 3000 g se leen «3 kg», y lo que tienes se dice en kilos.
  const comoSeLee =
    lleva.cantidad >= 1000 && lleva.unidad === 'g'
      ? 'kg'
      : lleva.cantidad >= 1000 && lleva.unidad === 'ml'
        ? 'l'
        : lleva.unidad;
  const [unidad, setUnidad] = useState<UnidadDeUso>(
    sirven.includes(comoSeLee) ? comoSeLee : (sirven[0] ?? lleva.unidad),
  );
  const numero = Number(cuanto.replace(',', '.'));
  const factor =
    Number.isFinite(numero) && numero > 0
      ? factorParaUnIngrediente(lleva, { cantidad: numero, unidad })
      : null;
  return (
    <form
      className="anima-aparece flex flex-wrap items-center gap-e2 pb-e2"
      onSubmit={(e) => {
        e.preventDefault();
        if (factor !== null) alEscalar(factor);
      }}
    >
      <label className="text-secundario text-texto-suave" htmlFor={id}>
        Tengo
      </label>
      <input
        id={id}
        autoFocus
        inputMode="decimal"
        value={cuanto}
        onChange={(e) => {
          setCuanto(e.currentTarget.value);
        }}
        className={`${CAJITA} w-[9ch] px-e3 text-right tabular-nums`}
      />
      {sirven.length > 1 ? (
        <select
          aria-label="Unidad"
          value={unidad}
          onChange={(e) => {
            setUnidad(e.currentTarget.value as UnidadDeUso);
          }}
          className={`${CAJITA} cursor-pointer px-e2`}
        >
          {sirven.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-cuerpo">{unidad}</span>
      )}
      <Boton type="submit" tono="secundario" tamano="s" disabled={factor === null}>
        Escalar
      </Boton>
    </form>
  );
}

// ── El escandallo: todo desgranado con pesos y precios ───────────────────────

function ElEscandallo({
  datos,
  escandallo,
  alAbrir,
}: {
  readonly datos: UnaFicha;
  readonly escandallo: EscandalloDeLaFicha;
  readonly alAbrir: (otra: QueFicha) => void;
}) {
  const navegar = useNavigate();
  const sinCoste = escandallo.costeCentimos === null;
  return (
    <div className="flex flex-col gap-e4">
      {escandallo.faltanPrecios > 0 && (
        <Aviso
          tono="atencion"
          titulo={
            escandallo.faltanPrecios === 1
              ? 'Falta el precio de 1 ingrediente'
              : `Falta el precio de ${String(escandallo.faltanPrecios)} ingredientes`
          }
        >
          Sin él no te doy un coste que no es. Ponlo en Almacén y sale solo.
        </Aviso>
      )}

      <dl className="grid grid-cols-3 gap-e2">
        <CifraPequena
          nombre="Coste"
          valor={sinCoste ? '—' : comoDinero(escandallo.costeCentimos)}
          // Una receta de olla cuesta lo de una ración (0092): la tanda entera, dividida.
          debajo={(datos.receta.raciones ?? 1) > 1 ? 'la ración' : undefined}
        />
        <CifraPequena
          nombre="Food cost"
          valor={escandallo.foodCost === null ? '—' : comoPorcentaje(escandallo.foodCost)}
          debajo={
            escandallo.objetivo === null
              ? undefined
              : `objetivo ${comoPorcentaje(escandallo.objetivo * 100)}`
          }
          tono={tonoDelSemaforo(escandallo.semaforo)}
        />
        <CifraPequena
          nombre="Precio recomendado"
          valor={
            escandallo.precioRecomendadoCentimos === null
              ? '—'
              : comoDinero(escandallo.precioRecomendadoCentimos)
          }
        />
      </dl>

      {escandallo.precioCentimos === null && datos.puedeAbrirLaCarta && (
        <Boton
          tono="texto"
          onClick={() => {
            navegar(`/carta/carta/por-secciones?plato=${datos.id}`);
          }}
        >
          Ponle precio en la Carta
        </Boton>
      )}

      <section aria-label="Lo que deja en cada canal" className="flex flex-col gap-e2">
        <h3 className="text-secundario font-semibold text-texto-suave">Lo que te deja</h3>
        <ul className="flex flex-col gap-e2">
          {escandallo.canales.map((c) => (
            <li
              key={c.canal}
              className={clases(
                'flex items-center gap-e3 rounded-grande border px-e3 py-e2',
                c.pierde ? 'border-mal/40 bg-mal-suave' : 'border-borde',
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-cuerpo font-medium">{c.nombre}</span>
                <span className="text-etiqueta text-texto-suave">
                  {c.precioCentimos === null ? 'Sin precio' : comoDinero(c.precioCentimos)}
                  {c.igualQueSala ? ' · igual que sala' : ''}
                  {c.seLlevaCentimos > 0 ? ` · se lleva ${comoDinero(c.seLlevaCentimos)}` : ''}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span
                  className={clases(
                    'text-cuerpo font-semibold tabular-nums',
                    c.pierde
                      ? 'text-mal'
                      : c.margenCentimos === null
                        ? 'text-texto-suave'
                        : 'text-texto',
                  )}
                >
                  {c.margenCentimos === null ? '—' : comoDinero(c.margenCentimos)}
                </span>
                {c.pierde ? (
                  <span className="text-etiqueta font-semibold text-mal">Pierdes dinero</span>
                ) : c.margenPuntos !== null ? (
                  <span className="text-etiqueta text-texto-suave">
                    {comoPorcentaje(c.margenPuntos)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {escandallo.iva !== null && (
          <p className="text-etiqueta text-texto-tenue">
            Sin el {comoSeDiceElTipo(escandallo.iva)} de IVA, y con la comisión y el envase de cada
            canal.
          </p>
        )}
      </section>

      <section aria-label="Desglose" className="flex flex-col">
        <h3 className="pb-e1 text-secundario font-semibold text-texto-suave">
          Desglose
          {(datos.receta.raciones ?? 1) > 1 &&
            ` · la tanda de ${String(datos.receta.raciones)} raciones`}
        </h3>
        <ul className="flex flex-col">
          {datos.receta.lineas.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-e1 border-b border-borde py-e2 last:border-0"
            >
              <span className="flex items-baseline gap-e3">
                {l.tipo === 'elaboracion' ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-cuerpo underline decoration-borde-fuerte underline-offset-4"
                    onClick={() => {
                      alAbrir({ tipo: 'elaboracion', id: l.refId });
                    }}
                  >
                    {l.nombre}
                  </button>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-cuerpo">{l.nombre}</span>
                )}
                <span className="shrink-0 text-secundario text-texto-suave tabular-nums">
                  {comoSeLeeLaCantidad(l.cantidad, l.unidad)}
                </span>
                <span className="min-w-[4.5rem] shrink-0 whitespace-nowrap text-right text-cuerpo font-semibold tabular-nums">
                  {l.costeCentimos === null || l.costeCentimos === undefined ? (
                    <span className="text-secundario text-atencion">Falta precio</span>
                  ) : (
                    comoDinero(l.costeCentimos)
                  )}
                </span>
              </span>
              <span className="flex items-center gap-e2">
                <span className="h-[6px] flex-1 overflow-hidden rounded-redondo bg-fondo">
                  <span
                    className="block h-full rounded-redondo"
                    style={{
                      width: `${String(Math.min(100, l.parte ?? 0))}%`,
                      background: 'var(--color-app-escandallos)',
                    }}
                  />
                </span>
                <span className="w-[8.5rem] shrink-0 text-right text-etiqueta text-texto-suave">
                  {l.parte === null || l.parte === undefined ? '' : `${comoPorcentaje(l.parte)} · `}
                  {l.costePorUnidad ?? ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CifraPequena({
  nombre,
  valor,
  debajo,
  tono = 'neutro',
}: {
  readonly nombre: string;
  readonly valor: string;
  readonly debajo?: string | undefined;
  readonly tono?: 'bien' | 'atencion' | 'mal' | 'neutro';
}) {
  return (
    <div className="flex flex-col gap-e1 rounded-grande bg-fondo p-e3">
      <dt className="text-etiqueta text-texto-suave">{nombre}</dt>
      <dd className="flex flex-col items-start gap-e1">
        <span className="whitespace-nowrap text-[1.25rem] font-semibold leading-none tabular-nums">
          {valor}
        </span>
        {debajo !== undefined && (
          <span
            className={clases(
              'flex items-center gap-e1 text-etiqueta',
              tono === 'bien'
                ? 'font-semibold text-bien'
                : tono === 'atencion'
                  ? 'font-semibold text-atencion'
                  : tono === 'mal'
                    ? 'font-semibold text-mal'
                    : 'text-texto-suave',
            )}
          >
            {tono !== 'neutro' && (
              <span aria-hidden className="size-[6px] shrink-0 rounded-redondo bg-current" />
            )}
            {debajo}
          </span>
        )}
      </dd>
    </div>
  );
}

// ── El historial, plegado, con «Recuperar» ───────────────────────────────────

function Historial({
  datos,
  alHecho,
}: {
  readonly datos: UnaFicha;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLasFichas();
  const [viendo, setViendo] = useState<string | null>(null);
  const [recuperando, setRecuperando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  if (datos.historial.length === 0) return null;
  const ultima = datos.historial[0]?.version;

  async function recuperar(cambio: CambioDeLaReceta) {
    setRecuperando(cambio.id);
    setError(null);
    const respuesta = await cliente.ejecutar('recuperar_receta', { guardada_id: cambio.id });
    setRecuperando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setViendo(null);
    alHecho('Recuperada: ya es la receta de ahora');
    await refrescar();
  }

  return (
    <details className="rounded-grande border border-borde">
      <summary className="flex min-h-toque cursor-pointer items-center gap-e2 px-e3 text-secundario font-semibold text-texto-suave">
        <IconoHistorial size={18} />
        Historial
      </summary>
      {error !== null && (
        <div className="px-e3">
          <ErrorEnCristiano error={error} />
        </div>
      )}
      <ol aria-label="Historial de la receta" className="flex flex-col gap-e3 px-e3 pb-e3">
        {datos.historial.map((cambio) => {
          const abierta = viendo === cambio.id;
          return (
            <li key={cambio.id} className="flex flex-col gap-e1">
              <span className="text-etiqueta text-texto-tenue">
                {comoSeLeeElCuando(cambio.cuando)}
                {cambio.quien === null ? '' : ` · ${cambio.quien}`}
              </span>
              {cambio.cambios.map((linea) => (
                <span key={linea} className="text-secundario">
                  {linea}
                </span>
              ))}
              {cambio.version !== ultima && (
                <span className="flex flex-wrap gap-e2">
                  <Boton
                    tono="texto"
                    tamano="s"
                    onClick={() => {
                      setViendo(abierta ? null : cambio.id);
                    }}
                  >
                    {abierta ? 'Ocultar' : 'Ver cómo era'}
                  </Boton>
                  {datos.puedeEditar && (
                    <Boton
                      tono="texto"
                      tamano="s"
                      cargando={recuperando === cambio.id}
                      textoCargando="Recuperando"
                      onClick={() => {
                        void recuperar(cambio);
                      }}
                    >
                      Recuperar
                    </Boton>
                  )}
                </span>
              )}
              {abierta && (
                <div className="rounded-medio bg-fondo p-e3">
                  <ul className="flex flex-col gap-e1">
                    {cambio.receta.lineas.map((l) => (
                      <li
                        key={`${l.tipo}.${l.id}`}
                        className="flex justify-between gap-e3 text-secundario"
                      >
                        <span className="min-w-0 truncate">{l.nombre}</span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {comoSeLeeLaCantidad(l.cantidad, l.unidad)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {cambio.receta.pasos.length > 0 && (
                    <p className="pt-e2 text-etiqueta text-texto-suave">
                      {cambio.receta.pasos.length === 1
                        ? '1 paso'
                        : `${String(cambio.receta.pasos.length)} pasos`}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
