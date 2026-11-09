import { useMemo, useState } from 'react';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  EL_ICONO,
  ElegirIconoYColor,
  ErrorEnCristiano,
  EstadoVacio,
  Etiqueta,
  FotoDeProducto,
  Hoja,
  LaBaldosaDeLaSeccion,
  Lista,
  NadaConEso,
  Selector,
  Tarjeta,
  elAcentoDelColor,
  type ElementoDeLista,
} from '@estook/ui';
import {
  IconoAnadir,
  IconoBorrar,
  IconoDocumento,
  IconoEditar,
  IconoFlechaAbajo,
  IconoFlechaArriba,
  IconoMas,
  IconoVincular,
} from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { centimos, type ColorDeLaBotonera, type IconoDeLaSeccion } from '@estook/dominio';
import { puedeEditar, puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLaCarta } from '../ganchos/usarRefrescarLaCarta.ts';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarAbiertoEnLaDireccion } from '../ganchos/usarAbiertoEnLaDireccion.ts';
import { comoDinero } from '../almacen/contrato.ts';
import {
  canalesConPrecio,
  comoSeVeLaSeccionDeLaCarta,
  losAlergenosDe,
  soloLoDeLaCarta,
  type MiCarta,
  type UnaSeccion,
  type UnCanal,
  type UnPlato,
} from './contrato.ts';
import {
  comoPorcentaje,
  tonoDelSemaforo,
  type MisFichas,
  type PlatoEnLaLista,
} from '../escandallos/contrato.ts';
import { FichaDelPlato } from './FichaDelPlato.tsx';
import { DesdeElAlmacen } from './DesdeElAlmacen.tsx';
import { LeerTuCarta } from './LeerTuCarta.tsx';
import { LosAlergenos } from '../escandallos/Alergenos.tsx';

/**
 * Tu carta (M9 · 1, decisión 0086).
 *
 * «Primero la carta» (Richi, 15-oct): lo que se vende, **por secciones y a cuánto**.
 * El plato es uno solo y nace aquí; en Escandallos se desgranará.
 *
 *   · **Por secciones**, en su orden, y «Sin sección» al final si hay alguno.
 *   · **Todos los platos**, de la A a la Z, con su buscador; y los archivados, aparte.
 *   · **Añadir platos de golpe**: nombre y precio, fila a fila, que es como se pasa
 *     una carta de papel.
 *
 * Cada fila dice su precio de sala y, si en un canal activo tiene otro, ese también
 * («Uber Eats 12,50 €»). Igual que sala no se repite: sería ruido.
 *
 * **El repaso del 8-nov (0143)**: arriba solo «+ Plato»; lo que se hace pocas veces (importar
 * la carta, una sección nueva, traer algo del almacén) va en «⋯». **Cada sección con su color
 * y su icono, los mismos que en Estook TPV**, y cada plato con su foto o, sin foto, el icono
 * de su sección; a quien ve costes, su food cost debajo del precio.
 */

/** Lo que se abre en la hoja de una sección. */
interface SeccionEnHoja {
  readonly id: string | null;
  readonly nombre: string;
  readonly color: ColorDeLaBotonera | null;
  readonly icono: IconoDeLaSeccion;
}

const SECCION_NUEVA: SeccionEnHoja = {
  id: null,
  nombre: '',
  color: null,
  icono: 'utensils-crossed',
};

/** Cómo se ve la sección de un plato; sin sección, los cubiertos en gris. */
interface ComoSeVe {
  readonly color: ColorDeLaBotonera | null;
  readonly icono: IconoDeLaSeccion;
}

const SIN_SECCION: ComoSeVe = { color: null, icono: 'utensils-crossed' };

/** El food cost de cada plato, a quien ve costes (de Escandallos). */
type ElCoste = NonNullable<PlatoEnLaLista['coste']>;

export function LaCarta({ vista }: { readonly vista: string }) {
  const consulta = usarLectura<MiCarta>('mi_carta');
  const plato = usarAbiertoEnLaDireccion('plato');
  const [anadiendo, setAnadiendo] = useState<string | null | undefined>(undefined);
  const [seccionEnHoja, setSeccionEnHoja] = useState<SeccionEnHoja | null>(null);
  /** «⋯»: lo que se hace pocas veces. */
  const [mas, setMas] = useState(false);

  // Lo que nació en un menú no está en la carta (0104): sale en Carta › Menús.
  const datos = useMemo(
    () => (consulta.data === undefined ? undefined : soloLoDeLaCarta(consulta.data)),
    [consulta.data],
  );
  // Con los permisos de la sesión, que están desde el principio: con los de la carta,
  // el «Añadir platos» del «+» se perdía si llegaba antes que ella (repaso, 15-oct).
  const { permisos } = usarSesion();
  usarQueHacer('nuevo', () => {
    if (puedeEditar(permisos, 'app.carta')) setAnadiendo(null);
  });
  // Vincular es escribir la ficha: hace falta Escandallos para editar, y ver el Almacén.
  const puedeVincular =
    puedeEditar(permisos, 'app.escandallos') && puedeVer(permisos, 'app.almacen');
  const [desdeElAlmacen, setDesdeElAlmacen] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  // El food cost de cada plato, de Escandallos, a quien lo ve (0143).
  const fichas = usarLectura<MisFichas>('mis_fichas', {}, puedeVer(permisos, 'app.escandallos'));
  const costeDe = useMemo(() => {
    const mapa = new Map<string, ElCoste>();
    if (fichas.data?.conImportes !== true) return mapa;
    for (const p of fichas.data.platos) if (p.coste !== undefined) mapa.set(p.id, p.coste);
    return mapa;
  }, [fichas.data]);
  const seVeDe = useMemo(() => {
    const mapa = new Map(
      (datos?.secciones ?? []).map((x) => [x.id, comoSeVeLaSeccionDeLaCarta(x)] as const),
    );
    return (plato: UnPlato): ComoSeVe =>
      (plato.seccionId === null ? undefined : mapa.get(plato.seccionId)) ?? SIN_SECCION;
  }, [datos?.secciones]);
  // «Leer tu carta» desde el buscador o Fogón (0102).
  usarQueHacer('leer', () => {
    if (puedeEditar(permisos, 'app.carta')) setLeyendo(true);
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="tu carta" forma="lista-foto" lineas={6} />
      </div>
    );
  }
  if (datos === undefined) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tu carta">
        Prueba en un momento.
      </Aviso>
    );
  }

  const activos = datos.platos.filter((p) => p.activo);
  const conPrecio = canalesConPrecio(datos.canales);

  return (
    <div className="flex flex-col gap-e4">
      {/* Arriba, solo lo de todos los días (0143): un plato nuevo. Lo demás, en «⋯». */}
      {datos.puedeEditar && activos.length > 0 && (
        <div className="flex items-center gap-e2">
          <Boton
            tono="principal"
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              setAnadiendo(null);
            }}
          >
            Plato
          </Boton>
          <Boton
            tono="secundario"
            aria-label="Más opciones de la carta"
            title="Más opciones"
            onClick={() => {
              setMas(true);
            }}
          >
            <IconoMas size={20} />
          </Boton>
        </div>
      )}

      {activos.length === 0 && datos.platos.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            dibujo="platos"
            acento="var(--color-app-carta)"
            titulo="Tu carta, aquí"
            frase="Importa tu carta de una foto o un PDF, o añade los platos a mano."
            {...(datos.puedeEditar
              ? {
                  accion: (
                    <div className="flex flex-wrap justify-center gap-e2">
                      <Boton
                        tono="principal"
                        icono={<IconoDocumento size={18} />}
                        onClick={() => {
                          setLeyendo(true);
                        }}
                      >
                        Importar tu carta
                      </Boton>
                      <Boton
                        tono="secundario"
                        icono={<IconoAnadir size={18} />}
                        onClick={() => {
                          setAnadiendo(null);
                        }}
                      >
                        Añadir platos
                      </Boton>
                    </div>
                  ),
                }
              : { sinAccionPorque: 'La carta la monta quien lleva el local.' })}
          />
        </Tarjeta>
      ) : vista === 'todos-los-platos' ? (
        <TodosLosPlatos
          datos={datos}
          conPrecio={conPrecio}
          alAbrir={plato.abrir}
          seVeDe={seVeDe}
          costeDe={costeDe}
        />
      ) : (
        <PorSecciones
          datos={datos}
          conPrecio={conPrecio}
          alAbrir={plato.abrir}
          alAnadir={setAnadiendo}
          alEditarSeccion={setSeccionEnHoja}
          seVeDe={seVeDe}
          costeDe={costeDe}
        />
      )}

      {mas && (
        <MasDeLaCarta
          puedeVincular={puedeVincular}
          alCerrar={() => {
            setMas(false);
          }}
          alImportar={() => {
            setMas(false);
            setLeyendo(true);
          }}
          alNuevaSeccion={() => {
            setMas(false);
            setSeccionEnHoja(SECCION_NUEVA);
          }}
          alDesdeElAlmacen={() => {
            setMas(false);
            setDesdeElAlmacen(true);
          }}
        />
      )}

      {anadiendo !== undefined && (
        <AnadirPlatos
          secciones={datos.secciones}
          seccionInicial={anadiendo}
          alCerrar={() => {
            setAnadiendo(undefined);
          }}
          {...(puedeVincular
            ? {
                alDesdeElAlmacen: () => {
                  setAnadiendo(undefined);
                  setDesdeElAlmacen(true);
                },
              }
            : {})}
        />
      )}
      {leyendo && (
        <LeerTuCarta
          carta={datos}
          alCerrar={() => {
            setLeyendo(false);
          }}
        />
      )}
      {desdeElAlmacen && (
        <DesdeElAlmacen
          carta={datos}
          seccionInicial={null}
          alCerrar={() => {
            setDesdeElAlmacen(false);
          }}
        />
      )}
      {seccionEnHoja !== null && (
        <HojaDeSeccion
          seccion={seccionEnHoja}
          secciones={datos.secciones}
          platos={activos.filter((p) => p.seccionId === seccionEnHoja.id).length}
          alCerrar={() => {
            setSeccionEnHoja(null);
          }}
        />
      )}
      {plato.abierto !== null && (
        <FichaDelPlato
          key={plato.abierto}
          platoId={plato.abierto}
          carta={datos}
          alCerrar={plato.cerrar}
        />
      )}
    </div>
  );
}

// ── Una fila de plato ────────────────────────────────────────────────────────

function fila(
  plato: UnPlato,
  conPrecio: readonly UnCanal[],
  alAbrir: (id: string) => void,
  detalle: string | null,
  seVe: ComoSeVe,
  coste: ElCoste | undefined,
): ElementoDeLista {
  const otros = conPrecio.flatMap((canal) => {
    const suyo = plato.precios[canal.canal];
    return suyo === undefined ? [] : [`${canal.nombre} ${comoDinero(suyo)}`];
  });
  // El de otro canal va delante del detalle y no a la derecha: a la derecha, en el
  // móvil, le quitaba sitio al nombre («Croquetas de j…», 15-oct).
  const texto = [
    ...(plato.unidadesPorRacion === null ? [] : [`${String(plato.unidadesPorRacion)} ud`]),
    ...otros,
    ...(detalle === null ? [] : [detalle]),
  ].join(' · ');
  const alergenos = losAlergenosDe(plato);
  const agotado = plato.agotado !== null;
  const conIconos =
    agotado ||
    alergenos.length > 0 ||
    plato.picante > 0 ||
    plato.distintivos.length > 0 ||
    plato.vinculadoA !== null;
  // Los alérgenos y el picante, con su dibujo (0087): se ven antes de leer.
  const debajo = conIconos ? (
    <span className="flex min-w-0 items-center gap-e2">
      {/* Agotado, lo primero (M10 · 1, 0102): es lo que la sala tiene que ver. */}
      {agotado && <Etiqueta tono="mal">Agotado</Etiqueta>}
      {plato.vinculadoA !== null && (
        <IconoVincular
          size={14}
          className="shrink-0"
          titulo={`Vinculado a ${plato.vinculadoA.nombre}${plato.vinculadoA.racion === null ? '' : ` · ${plato.vinculadoA.racion}`}`}
        />
      )}
      <LosAlergenos
        alergenos={alergenos}
        picante={plato.picante}
        distintivos={plato.distintivos}
        lado={18}
        enUnaLinea
      />
      {texto !== '' && <span className="min-w-0 truncate">{texto}</span>}
    </span>
  ) : (
    texto
  );
  return {
    clave: plato.id,
    // Su foto; sin foto, **el icono de su sección sobre su color**, como en el TPV (0143), y no
    // dos iniciales de un color al azar.
    delante:
      plato.miniatura !== null ? (
        <FotoDeProducto nombre={plato.nombre} categoria={null} enlace={plato.miniatura} lado={40} />
      ) : (
        <LaBaldosaDeLaSeccion icono={seVe.icono} color={seVe.color} lado={40} suave />
      ),
    titulo: plato.nombre,
    ...(debajo === '' ? {} : { detalle: debajo }),
    derecha: (
      <span className="flex shrink-0 flex-col items-end leading-tight">
        <span className="text-cuerpo font-semibold tabular-nums">
          {plato.precioCentimos === null ? 'Sin precio' : comoDinero(plato.precioCentimos)}
        </span>
        {/* El food cost, a quien ve costes: lo que cuesta de lo que se cobra (0143). */}
        {coste?.foodCost !== null && coste?.foodCost !== undefined && (
          <span
            title="Food cost"
            className={`text-etiqueta font-semibold tabular-nums ${COLOR_DEL_TONO[tonoDelSemaforo(coste.semaforo)]}`}
          >
            {comoPorcentaje(coste.foodCost)} coste
          </span>
        )}
      </span>
    ),
    alPulsar: () => {
      alAbrir(plato.id);
    },
  };
}

const COLOR_DEL_TONO: Readonly<Record<ReturnType<typeof tonoDelSemaforo>, string>> = {
  bien: 'text-bien',
  atencion: 'text-atencion',
  mal: 'text-mal',
  neutro: 'text-texto-tenue',
};

// ── Por secciones ────────────────────────────────────────────────────────────

function PorSecciones({
  datos,
  conPrecio,
  alAbrir,
  alAnadir,
  alEditarSeccion,
  seVeDe,
  costeDe,
}: {
  readonly datos: MiCarta;
  readonly conPrecio: readonly UnCanal[];
  readonly alAbrir: (id: string) => void;
  readonly alAnadir: (seccionId: string | null) => void;
  readonly alEditarSeccion: (seccion: SeccionEnHoja) => void;
  readonly seVeDe: (plato: UnPlato) => ComoSeVe;
  readonly costeDe: ReadonlyMap<string, ElCoste>;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [ordenando, setOrdenando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const activos = datos.platos.filter((p) => p.activo);
  const sinSeccion = activos.filter((p) => p.seccionId === null);

  async function moverPlato(
    seccionId: string | null,
    lista: readonly UnPlato[],
    indice: number,
    salto: -1 | 1,
  ) {
    const ids = lista.map((p) => p.id);
    const otro = indice + salto;
    if (otro < 0 || otro >= ids.length) return;
    [ids[indice], ids[otro]] = [ids[otro] as string, ids[indice] as string];
    const respuesta = await cliente.ejecutar('ordenar_platos', {
      seccion_id: seccionId,
      platos: ids,
    });
    if (!respuesta.ok) setError(respuesta.error);
    await refrescar();
  }

  const grupos: readonly (ComoSeVe & { id: string | null; nombre: string })[] = [
    ...datos.secciones.map((x) => ({
      id: x.id,
      nombre: x.nombre,
      ...comoSeVeLaSeccionDeLaCarta(x),
    })),
    ...(sinSeccion.length > 0 ? [{ id: null, nombre: 'Sin sección', ...SIN_SECCION }] : []),
  ];

  return (
    <div className="flex flex-col gap-e4">
      {error !== null && <ErrorEnCristiano error={error} />}
      {/* Un atajo a cada sección, con su icono y su color: en el móvil no hay que bajar. */}
      {grupos.length > 2 && (
        <nav
          aria-label="Ir a una sección"
          className="-mx-e1 flex gap-e2 overflow-x-auto px-e1 pb-e1"
        >
          {grupos.map((grupo) => (
            <a
              key={grupo.id ?? 'sin'}
              href={`#seccion-${grupo.id ?? 'sin'}`}
              onClick={(evento) => {
                evento.preventDefault();
                document
                  .getElementById(`seccion-${grupo.id ?? 'sin'}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex min-h-toque shrink-0 items-center gap-e2 rounded-redondo border border-borde bg-superficie py-e1 pl-e1 pr-e3 text-secundario font-semibold"
            >
              <LaBaldosaDeLaSeccion icono={grupo.icono} color={grupo.color} lado={26} />
              {grupo.nombre}
            </a>
          ))}
        </nav>
      )}
      {grupos.map((grupo) => {
        const suyos = activos
          .filter((p) => p.seccionId === grupo.id)
          .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
        const clave = grupo.id ?? 'sin';
        const enOrden = ordenando === clave;
        const ElIcono = EL_ICONO[grupo.icono];
        return (
          <div key={clave} id={`seccion-${clave}`} className="scroll-mt-e6">
            <Tarjeta
              titulo={grupo.nombre}
              cuantos={suyos.length}
              acento={elAcentoDelColor(grupo.color)}
              icono={<ElIcono size={18} strokeWidth={2.2} />}
              {...(datos.puedeEditar
                ? {
                    accion: (
                      <div className="flex items-center gap-e1">
                        {grupo.id !== null && (
                          <Boton
                            tono="texto"
                            tamano="s"
                            aria-label={`Cambiar la sección ${grupo.nombre}`}
                            onClick={() => {
                              alEditarSeccion({
                                id: grupo.id,
                                nombre: grupo.nombre,
                                color: grupo.color,
                                icono: grupo.icono,
                              });
                            }}
                          >
                            <IconoEditar size={16} />
                          </Boton>
                        )}
                        {suyos.length > 1 && (
                          <Boton
                            tono="texto"
                            tamano="s"
                            onClick={() => {
                              setOrdenando(enOrden ? null : clave);
                            }}
                          >
                            {enOrden ? 'Listo' : 'Ordenar'}
                          </Boton>
                        )}
                      </div>
                    ),
                  }
                : {})}
            >
              {enOrden ? (
                <ol aria-label={`Orden de ${grupo.nombre}`} className="flex flex-col">
                  {suyos.map((plato, i) => (
                    <li
                      key={plato.id}
                      className="flex min-h-toque items-center gap-e2 border-b border-borde px-e3 last:border-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-cuerpo">{plato.nombre}</span>
                      <Boton
                        tono="texto"
                        tamano="s"
                        aria-label={`Subir ${plato.nombre}`}
                        disabled={i === 0}
                        onClick={() => {
                          void moverPlato(grupo.id, suyos, i, -1);
                        }}
                      >
                        <IconoFlechaArriba size={16} />
                      </Boton>
                      <Boton
                        tono="texto"
                        tamano="s"
                        aria-label={`Bajar ${plato.nombre}`}
                        disabled={i === suyos.length - 1}
                        onClick={() => {
                          void moverPlato(grupo.id, suyos, i, 1);
                        }}
                      >
                        <IconoFlechaAbajo size={16} />
                      </Boton>
                    </li>
                  ))}
                </ol>
              ) : (
                <Lista
                  titulo={grupo.nombre}
                  elementos={suyos.map((p) =>
                    fila(p, conPrecio, alAbrir, p.descripcion, seVeDe(p), costeDe.get(p.id)),
                  )}
                  cuandoNoHay={
                    <p className="px-e3 py-e2 text-secundario text-texto-suave">
                      Sin platos todavía.
                    </p>
                  }
                />
              )}
              {datos.puedeEditar && !enOrden && (
                <div className="px-e3 pt-e2">
                  <Boton
                    tono="texto"
                    icono={<IconoAnadir size={16} />}
                    onClick={() => {
                      alAnadir(grupo.id);
                    }}
                  >
                    Añadir aquí
                  </Boton>
                </div>
              )}
            </Tarjeta>
          </div>
        );
      })}
      <Archivados datos={datos} conPrecio={conPrecio} alAbrir={alAbrir} seVeDe={seVeDe} />
    </div>
  );
}

// ── Todos los platos ─────────────────────────────────────────────────────────

function TodosLosPlatos({
  datos,
  conPrecio,
  alAbrir,
  seVeDe,
  costeDe,
}: {
  readonly datos: MiCarta;
  readonly conPrecio: readonly UnCanal[];
  readonly alAbrir: (id: string) => void;
  readonly seVeDe: (plato: UnPlato) => ComoSeVe;
  readonly costeDe: ReadonlyMap<string, ElCoste>;
}) {
  const [buscado, setBuscado] = useState('');
  const nombreDeLaSeccion = useMemo(
    () => new Map(datos.secciones.map((s) => [s.id, s.nombre])),
    [datos.secciones],
  );
  const texto = buscado.trim().toLocaleLowerCase('es');
  const sinAcentos = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '');
  const activos = datos.platos
    .filter((p) => p.activo)
    .filter(
      (p) =>
        texto === '' || sinAcentos(p.nombre.toLocaleLowerCase('es')).includes(sinAcentos(texto)),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <div className="flex flex-col gap-e4">
      <Tarjeta titulo="Todos los platos" cuantos={datos.platos.filter((p) => p.activo).length}>
        <div className="px-e3 pb-e3">
          <Campo
            etiqueta="Buscar un plato"
            value={buscado}
            onChange={(evento) => {
              setBuscado(evento.target.value);
            }}
          />
        </div>
        <Lista
          titulo="Todos los platos"
          elementos={activos.map((p) =>
            fila(
              p,
              conPrecio,
              alAbrir,
              p.seccionId === null ? 'Sin sección' : (nombreDeLaSeccion.get(p.seccionId) ?? null),
              seVeDe(p),
              costeDe.get(p.id),
            ),
          )}
          cuandoNoHay={
            <NadaConEso
              compacto
              buscado={buscado}
              alQuitar={() => {
                setBuscado('');
              }}
            />
          }
        />
      </Tarjeta>
      <Archivados datos={datos} conPrecio={conPrecio} alAbrir={alAbrir} seVeDe={seVeDe} />
    </div>
  );
}

/** Lo archivado, plegado al final: no sale en la carta y se recupera desde su ficha. */
function Archivados({
  datos,
  conPrecio,
  alAbrir,
  seVeDe,
}: {
  readonly datos: MiCarta;
  readonly conPrecio: readonly UnCanal[];
  readonly alAbrir: (id: string) => void;
  readonly seVeDe: (plato: UnPlato) => ComoSeVe;
}) {
  const archivados = datos.platos.filter((p) => !p.activo);
  if (archivados.length === 0) return null;
  return (
    <details className="rounded-grande border border-borde bg-superficie">
      <summary className="flex min-h-toque cursor-pointer items-center px-e4 text-secundario font-semibold text-texto-suave">
        Archivados ({archivados.length})
      </summary>
      <Lista
        titulo="Archivados"
        elementos={archivados.map((p) =>
          fila(p, conPrecio, alAbrir, 'No sale en la carta', seVeDe(p), undefined),
        )}
        cuandoNoHay={null}
      />
    </details>
  );
}

// ── Añadir platos de golpe ───────────────────────────────────────────────────

interface FilaNueva {
  readonly nombre: string;
  readonly precio: number | null;
}

const VACIA: FilaNueva = { nombre: '', precio: null };

function AnadirPlatos({
  secciones,
  seccionInicial,
  alCerrar,
  alDesdeElAlmacen,
}: {
  readonly secciones: MiCarta['secciones'];
  readonly seccionInicial: string | null;
  readonly alCerrar: () => void;
  /** Lo que se vende tal cual (una lata, una botella): del almacén (0143). */
  readonly alDesdeElAlmacen?: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [seccion, setSeccion] = useState<string>(seccionInicial ?? '');
  const [filas, setFilas] = useState<readonly FilaNueva[]>([VACIA, VACIA, VACIA]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [yaEstaban, setYaEstaban] = useState<readonly string[]>([]);

  const llenas = filas.filter((f) => f.nombre.trim() !== '');

  function cambiar(indice: number, nueva: FilaNueva) {
    setFilas((antes) => {
      const despues = antes.map((f, i) => (i === indice ? nueva : f));
      // Siempre queda una fila libre al final: se sigue escribiendo sin buscar botones.
      const ultima = despues[despues.length - 1];
      return ultima !== undefined && ultima.nombre.trim() !== '' && despues.length < 60
        ? [...despues, VACIA]
        : despues;
    });
  }

  async function anadir() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ yaEstaban: string[] }>('crear_platos', {
      seccion_id: seccion === '' ? null : seccion,
      platos: llenas.map((f) => ({ nombre: f.nombre.trim(), precio_centimos: f.precio })),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    if (respuesta.datos.yaEstaban.length > 0) {
      setYaEstaban(respuesta.datos.yaEstaban);
      setFilas([VACIA, VACIA, VACIA]);
      return;
    }
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Añadir platos"
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
            {yaEstaban.length > 0 ? 'Cerrar' : 'Cancelar'}
          </Boton>
          <Boton
            tono="principal"
            disabled={llenas.length === 0}
            cargando={guardando}
            textoCargando="Añadiendo"
            onClick={() => {
              void anadir();
            }}
          >
            {llenas.length <= 1 ? 'Añadir el plato' : `Añadir ${llenas.length} platos`}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {yaEstaban.length > 0 && (
          <Aviso tono="info" titulo="Lo demás ya está en tu carta">
            {yaEstaban.join(', ')}: ya {yaEstaban.length === 1 ? 'estaba' : 'estaban'}, y no se
            {yaEstaban.length === 1 ? ' ha repetido' : ' han repetido'}.
          </Aviso>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
        <Selector
          etiqueta="Sección"
          opciones={[
            { valor: '', texto: 'Sin sección' },
            ...secciones.map((s) => ({ valor: s.id, texto: s.nombre })),
          ]}
          value={seccion}
          onChange={(evento) => {
            setSeccion(evento.target.value);
          }}
        />
        <ol className="flex flex-col gap-e2" aria-label="Los platos que se añaden">
          {filas.map((f, i) => (
            <li key={i} className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-e2">
              <Campo
                etiqueta={`Plato ${String(i + 1)}`}
                value={f.nombre}
                maxLength={120}
                onChange={(evento) => {
                  cambiar(i, { ...f, nombre: evento.target.value });
                }}
              />
              <CampoMoneda
                etiqueta="Precio"
                valor={f.precio === null ? null : centimos(f.precio)}
                alCambiar={(valor) => {
                  cambiar(i, { ...f, precio: valor === null ? null : Number(valor) });
                }}
              />
            </li>
          ))}
        </ol>
        <p className="text-secundario text-texto-suave">
          El precio, con IVA, como en tu carta de papel. Lo demás, en la ficha de cada plato.
        </p>
        {alDesdeElAlmacen !== undefined && (
          <Boton tono="texto" icono={<IconoVincular size={16} />} onClick={alDesdeElAlmacen}>
            ¿Lo vendes tal cual, como un refresco? Tráelo del almacén
          </Boton>
        )}
      </div>
    </Hoja>
  );
}

// ── Crear, cambiar o quitar una sección ──────────────────────────────────────

/**
 * **Una sección: su nombre, su color y su icono** (0143). El color y el icono son los mismos
 * que en Estook TPV: lo que se elige aquí se ve allí. Si no se tocan, se quedan los que
 * propone su nombre, que cambian solos si se renombra.
 */
function HojaDeSeccion({
  seccion,
  secciones,
  platos,
  alCerrar,
}: {
  readonly seccion: SeccionEnHoja;
  readonly secciones: readonly UnaSeccion[];
  readonly platos: number;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLaCarta();
  const [nombre, setNombre] = useState(seccion.nombre);
  const [color, setColor] = useState<ColorDeLaBotonera | null>(seccion.color);
  const [icono, setIcono] = useState<IconoDeLaSeccion>(seccion.icono);
  /** Solo se manda lo que se ha tocado: lo demás sigue siendo «el de su nombre». */
  const [tocado, setTocado] = useState({ color: false, icono: false });
  const [trabajando, setTrabajando] = useState<'guardando' | 'quitando' | null>(null);
  const [quitar, setQuitar] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const nueva = seccion.id === null;
  const donde = secciones.findIndex((s) => s.id === seccion.id);

  async function mover(salto: -1 | 1) {
    const ids = secciones.map((s) => s.id);
    const otra = donde + salto;
    if (donde < 0 || otra < 0 || otra >= ids.length) return;
    [ids[donde], ids[otra]] = [ids[otra] as string, ids[donde] as string];
    const respuesta = await cliente.ejecutar('ordenar_secciones', { secciones: ids });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
  }

  async function guardar() {
    setTrabajando('guardando');
    const aspecto = {
      ...(tocado.color ? { color } : {}),
      ...(tocado.icono ? { icono } : {}),
    };
    const respuesta = nueva
      ? await cliente.ejecutar('crear_seccion', { nombre: nombre.trim(), ...aspecto })
      : await cliente.ejecutar('cambiar_seccion', {
          seccion_id: seccion.id,
          nombre: nombre.trim(),
          ...aspecto,
        });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  async function quitarla() {
    setTrabajando('quitando');
    const respuesta = await cliente.ejecutar('quitar_seccion', { seccion_id: seccion.id });
    setTrabajando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={nueva ? 'Nueva sección' : seccion.nombre}
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
              cargando={trabajando === 'quitando'}
              textoCargando="Borrando"
              onClick={() => {
                void quitarla();
              }}
            >
              Borrar la sección
            </Boton>
          </Botones>
        ) : (
          <Botones>
            {!nueva && (
              <Boton
                tono="texto"
                icono={<IconoBorrar size={16} />}
                onClick={() => {
                  setQuitar(true);
                }}
              >
                Borrar la sección
              </Boton>
            )}
            <Boton
              tono="principal"
              disabled={nombre.trim() === ''}
              cargando={trabajando === 'guardando'}
              textoCargando="Guardando"
              onClick={() => {
                void guardar();
              }}
            >
              {nueva ? 'Crear la sección' : 'Guardar'}
            </Boton>
          </Botones>
        )
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        {quitar ? (
          <div className="flex flex-col gap-e2">
            <p className="text-cuerpo font-semibold">¿Borrar «{seccion.nombre}»?</p>
            <p className="text-cuerpo">
              No hay vuelta atrás.{' '}
              {platos === 0
                ? 'No tiene platos.'
                : platos === 1
                  ? 'Su plato pasa a «Sin sección»: el plato no se borra.'
                  : `Sus ${String(platos)} platos pasan a «Sin sección»: no se borra ninguno.`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-e3 rounded-mayor bg-fondo p-e3">
              <LaBaldosaDeLaSeccion icono={icono} color={color} lado={48} />
              <div className="flex min-w-0 flex-col">
                <strong className="truncate">
                  {nombre.trim() === '' ? 'Tu sección' : nombre.trim()}
                </strong>
                <span className="text-secundario text-texto-suave">
                  Así se ve aquí y en Estook TPV
                </span>
              </div>
            </div>
            <Campo
              etiqueta="Nombre de la sección"
              value={nombre}
              maxLength={80}
              onChange={(evento) => {
                setNombre(evento.target.value);
              }}
            />
            <ElegirIconoYColor
              color={color}
              icono={icono}
              alCambiarElColor={(c) => {
                setColor(c);
                setTocado((t) => ({ ...t, color: true }));
              }}
              alCambiarElIcono={(i) => {
                setIcono(i);
                setTocado((t) => ({ ...t, icono: true }));
              }}
            />
            {!nueva && secciones.length > 1 && (
              <div className="flex flex-wrap items-center gap-e2">
                <span className="text-secundario text-texto-suave">
                  En la carta va la {String(donde + 1)}.ª de {String(secciones.length)}
                </span>
                <Boton
                  tono="secundario"
                  tamano="s"
                  icono={<IconoFlechaArriba size={16} />}
                  disabled={donde <= 0}
                  onClick={() => {
                    void mover(-1);
                  }}
                >
                  Subir
                </Boton>
                <Boton
                  tono="secundario"
                  tamano="s"
                  icono={<IconoFlechaAbajo size={16} />}
                  disabled={donde >= secciones.length - 1}
                  onClick={() => {
                    void mover(1);
                  }}
                >
                  Bajar
                </Boton>
              </div>
            )}
          </>
        )}
      </div>
    </Hoja>
  );
}

// ── «⋯» · lo que se hace pocas veces ─────────────────────────────────────────

/**
 * **Más opciones de la carta** (0143): importar la carta se hace una vez, una sección nueva de
 * vez en cuando y traer algo del almacén solo con lo que se vende tal cual. Juntas en una hoja,
 * cada una con lo que hace, en vez de cuatro botones arriba.
 */
function MasDeLaCarta({
  puedeVincular,
  alCerrar,
  alImportar,
  alNuevaSeccion,
  alDesdeElAlmacen,
}: {
  readonly puedeVincular: boolean;
  readonly alCerrar: () => void;
  readonly alImportar: () => void;
  readonly alNuevaSeccion: () => void;
  readonly alDesdeElAlmacen: () => void;
}) {
  const opciones = [
    {
      clave: 'importar',
      icono: <IconoDocumento size={18} />,
      titulo: 'Importar tu carta',
      detalle: 'De una foto o un PDF',
      alPulsar: alImportar,
    },
    {
      clave: 'seccion',
      icono: <IconoAnadir size={18} />,
      titulo: 'Nueva sección',
      detalle: 'Con su color y su icono',
      alPulsar: alNuevaSeccion,
    },
    ...(puedeVincular
      ? [
          {
            clave: 'almacen',
            icono: <IconoVincular size={18} />,
            titulo: 'Desde el almacén',
            detalle: 'Lo que vendes tal cual: un refresco, una botella',
            alPulsar: alDesdeElAlmacen,
          },
        ]
      : []),
  ];
  return (
    <Hoja abierta ajustada alCerrar={alCerrar} titulo="Más opciones">
      <ul className="flex flex-col pt-e2">
        {opciones.map((o) => (
          <li key={o.clave} className="border-b border-borde last:border-0">
            <button
              type="button"
              onClick={o.alPulsar}
              className="flex min-h-[3.5rem] w-full items-center gap-e3 py-e2 text-left"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-grande bg-fondo">
                {o.icono}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-cuerpo font-semibold">{o.titulo}</span>
                <span className="text-secundario text-texto-suave">{o.detalle}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Hoja>
  );
}
