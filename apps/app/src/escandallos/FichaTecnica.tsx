import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { comoSeLeeLaCantidad, comoSeDiceElTipo } from '@estook/dominio';
import { Aviso, Boton, Cargando, ErrorEnCristiano, PanelLateral, clases } from '@estook/ui';
import { IconoEditar, IconoHistorial, IconoModoCocina, IconoVincular } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import { comoDinero } from '../almacen/contrato.ts';
import { BotonDelDocumento } from '../documentos/BotonDelDocumento.tsx';
import { LosAlergenos } from './Alergenos.tsx';
import { EditorDeLaReceta } from './EditorDeLaReceta.tsx';
import { ModoCocina } from './ModoCocina.tsx';
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
 * La ficha de un plato o de una elaboración (M9 · 2, decisión 0087).
 *
 * Richi, 16-oct: **la ficha** es para cocina y sala —los gramos y los pasos, sin un
 * euro, para imprimir o llevar en PDF— y **el escandallo** lo desgrana todo con
 * pesos y precios, con el margen por canal. Las dos son el mismo plato, así que van
 * en el mismo panel: **«Ficha» y «Escandallo» arriba**, y el escandallo solo existe
 * para quien ve costes (a los demás el servidor no se lo manda).
 *
 * Abajo, plegado, **el historial**: quién cambió qué y cuándo, la receta de antes y
 * «Recuperar» (0086, pregunta 5). Sin versiones a la vista.
 */
export function FichaTecnica({
  ficha,
  alCerrar,
  alAbrir,
}: {
  readonly ficha: QueFicha;
  readonly alCerrar: () => void;
  /** Para saltar a la ficha de una elaboración que lleva, o a un plato donde entra. */
  readonly alAbrir: (otra: QueFicha) => void;
}) {
  const consulta = usarLectura<UnaFicha>(
    'una_ficha',
    ficha.tipo === 'plato' ? { plato_id: ficha.id } : { elaboracion_id: ficha.id },
  );
  const [cara, setCara] = useState<'ficha' | 'escandallo'>('ficha');
  const [editando, setEditando] = useState(false);
  const [cocinando, setCocinando] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const datos = consulta.data;

  if (datos === undefined) {
    return (
      <PanelLateral abierta alCerrar={alCerrar} titulo="Ficha">
        {consulta.isError ? (
          <Aviso tono="mal" titulo="No he podido abrir esta ficha">
            Puede que sea de otro local.
          </Aviso>
        ) : (
          <Cargando que="la ficha" lineas={5} />
        )}
      </PanelLateral>
    );
  }

  const sinFicha = datos.receta.lineas.length === 0;
  const conEscandallo = datos.escandallo !== undefined && !sinFicha;

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
            {conEscandallo && (
              <div
                role="tablist"
                aria-label="Ficha o escandallo"
                className="inline-flex self-start rounded-redondo bg-fondo p-[4px] shadow-[inset_0_0_0_1px_var(--color-borde)]"
              >
                {(['ficha', 'escandallo'] as const).map((una) => (
                  <button
                    key={una}
                    type="button"
                    role="tab"
                    aria-selected={cara === una}
                    onClick={() => {
                      setCara(una);
                    }}
                    className={clases(
                      'min-h-[38px] rounded-redondo px-e4 text-secundario font-medium',
                      cara === una
                        ? 'bg-texto font-semibold text-superficie shadow-s2'
                        : 'text-texto-suave hover:text-texto',
                    )}
                  >
                    {una === 'ficha' ? 'Ficha' : 'Escandallo'}
                  </button>
                ))}
              </div>
            )}

            {cara === 'escandallo' && datos.escandallo !== undefined && conEscandallo ? (
              <ElEscandallo datos={datos} escandallo={datos.escandallo} />
            ) : (
              <LaFicha datos={datos} alAbrir={alAbrir} />
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
                  Editar
                </Boton>
              )}
              <Boton
                tono="secundario"
                icono={<IconoModoCocina size={18} />}
                onClick={() => {
                  setCocinando(true);
                }}
              >
                Modo cocina
              </Boton>
              <BotonDelDocumento
                consulta={'la_ficha_en_pdf'}
                parametros={
                  datos.tipo === 'plato' ? { plato_id: datos.id } : { elaboracion_id: datos.id }
                }
                texto="PDF"
                tono="secundario"
              />
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
          alCerrar={() => {
            setEditando(false);
          }}
          alGuardar={(frase) => {
            setEditando(false);
            setHecho(frase);
          }}
        />
      )}
      {cocinando && (
        <ModoCocina
          datos={datos}
          alCerrar={() => {
            setCocinando(false);
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

function Cabecera({ datos }: { readonly datos: UnaFicha }) {
  const queEs = [
    datos.tipo === 'elaboracion'
      ? `Elaboración${datos.rinde === null ? '' : ` · rinde ${comoSeLeeLaCantidad(datos.rinde.cantidad, datos.rinde.unidad)}`}`
      : (datos.seccion ?? 'Sin sección'),
    ...(datos.receta.minutos === null ? [] : [`${String(datos.receta.minutos)} min`]),
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
  return (
    <div className="flex flex-col items-start gap-e3 rounded-grande bg-fondo p-e4">
      <p className="text-cuerpo font-semibold">Sin ficha todavía</p>
      <p className="text-secundario text-texto-suave">
        {datos.puedeEditar
          ? 'Pon lo que lleva y en qué cantidad: el coste sale solo del Almacén.'
          : 'Cuando alguien la escriba, aquí estarán los gramos y los pasos.'}
      </p>
      {datos.puedeEditar && (
        <div className="flex flex-wrap gap-e2">
          <Boton tono="principal" onClick={alDesgranar}>
            Desgranar
          </Boton>
          {datos.tipo === 'plato' && (
            <Boton tono="secundario" icono={<IconoVincular size={18} />} onClick={alVincular}>
              Vincular a un producto
            </Boton>
          )}
        </div>
      )}
    </div>
  );
}

// ── La ficha: lo que lleva y cómo se hace, sin un euro ───────────────────────

function LaFicha({
  datos,
  alAbrir,
}: {
  readonly datos: UnaFicha;
  readonly alAbrir: (otra: QueFicha) => void;
}) {
  return (
    <>
      <section aria-label="Lo que lleva" className="flex flex-col">
        <h3 className="pb-e1 text-secundario font-semibold text-texto-suave">Lo que lleva</h3>
        <ul className="flex flex-col">
          {datos.receta.lineas.map((l) => (
            <li
              key={l.id}
              className="flex min-h-toque items-center gap-e3 border-b border-borde py-e1 last:border-0"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                {l.tipo === 'elaboracion' ? (
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
              <span className="shrink-0 text-cuerpo font-semibold tabular-nums">
                {comoSeLeeLaCantidad(l.cantidad, l.unidad)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {datos.receta.pasos.length > 0 && (
        <section aria-label="Cómo se hace" className="flex flex-col gap-e2">
          <h3 className="text-secundario font-semibold text-texto-suave">Cómo se hace</h3>
          <ol className="flex flex-col gap-e2">
            {datos.receta.pasos.map((paso, i) => (
              <li key={`${String(i)}-${paso}`} className="flex gap-e3">
                <span className="grid size-[26px] shrink-0 place-items-center rounded-redondo bg-fondo text-etiqueta font-bold">
                  {i + 1}
                </span>
                <span className="text-cuerpo">{paso}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {datos.receta.notas !== null && (
        <section aria-label="Notas" className="flex flex-col gap-e1">
          <h3 className="text-secundario font-semibold text-texto-suave">Notas</h3>
          <p className="text-cuerpo whitespace-pre-line">{datos.receta.notas}</p>
        </section>
      )}
    </>
  );
}

// ── El escandallo: todo desgranado con pesos y precios ───────────────────────

function ElEscandallo({
  datos,
  escandallo,
}: {
  readonly datos: UnaFicha;
  readonly escandallo: EscandalloDeLaFicha;
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
        <h3 className="pb-e1 text-secundario font-semibold text-texto-suave">Desglose</h3>
        <ul className="flex flex-col">
          {datos.receta.lineas.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-e1 border-b border-borde py-e2 last:border-0"
            >
              <span className="flex items-baseline gap-e3">
                <span className="min-w-0 flex-1 truncate text-cuerpo">{l.nombre}</span>
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
