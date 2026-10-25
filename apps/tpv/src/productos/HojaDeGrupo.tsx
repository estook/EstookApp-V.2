import { useState } from 'react';
import { TOPES_DEL_GRUPO, centimos, type Centimos, type UnidadDeUso } from '@estook/dominio';
import { Boton, Botones, Campo, CampoMoneda, Hoja, Selector } from '@estook/ui';
import type { GrupoParaMontar, ProductoParaLasOpciones } from '../datos/tipos.ts';
import type { Resultado } from '../ganchos/usarLaSala.ts';

/**
 * **Un grupo de opciones, para montarlo** (T3 · 2, maqueta 4; Anexo 10.3): su nombre, cuántas
 * se eligen y sus opciones, cada una con su precio y **lo que gasta del almacén**: añade un
 * producto en su cantidad, quita un ingrediente del escandallo, cambia uno por otro, o nada.
 *
 * Si lo usan varios platos, lo dice: cambiarlo los cambia a todos, y «Copiar y cambiar» hace uno
 * para este plato solo.
 */

type Orden = <T>(nombre: string, entrada: unknown) => Promise<Resultado<T>>;

type QueGasta = 'nada' | 'anade' | 'quita' | 'cambia';

interface OpcionEnLaHoja {
  readonly clave: string;
  readonly nombre: string;
  readonly precio: Centimos | null;
  readonly gasta: QueGasta;
  readonly anadeId: string;
  readonly cantidad: string;
  readonly unidad: UnidadDeUso | '';
  readonly quitaId: string;
}

type Cuantas = 'una' | 'opcional' | 'varias';

const NOMBRE_DE_LO_QUE_GASTA: Readonly<Record<QueGasta, string>> = {
  nada: 'Nada (extra libre)',
  anade: 'Añade algo del almacén',
  quita: 'Quita un ingrediente',
  cambia: 'Cambia uno por otro',
};

function comoEnLaHoja(o: GrupoParaMontar['opciones'][number]): OpcionEnLaHoja {
  const gasta: QueGasta =
    o.anade !== null && o.quita !== null
      ? 'cambia'
      : o.anade !== null
        ? 'anade'
        : o.quita !== null
          ? 'quita'
          : 'nada';
  return {
    clave: o.id,
    nombre: o.nombre,
    precio: centimos(o.precioCentimos),
    gasta,
    anadeId: o.anade?.productoId ?? '',
    cantidad: o.anade === null ? '' : String(o.anade.cantidad).replace('.', ','),
    unidad: o.anade?.unidad ?? '',
    quitaId: o.quita?.productoId ?? '',
  };
}

const opcionVacia = (): OpcionEnLaHoja => ({
  clave: crypto.randomUUID(),
  nombre: '',
  precio: null,
  gasta: 'nada',
  anadeId: '',
  cantidad: '',
  unidad: '',
  quitaId: '',
});

export function HojaDeGrupo({
  grupo,
  platoId,
  nombreDelPlato,
  productos,
  orden,
  alCerrar,
}: {
  /** Nulo: un grupo nuevo, que se pone en este plato. */
  readonly grupo: GrupoParaMontar | null;
  readonly platoId: string;
  readonly nombreDelPlato: string;
  readonly productos: readonly ProductoParaLasOpciones[];
  readonly orden: Orden;
  readonly alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(grupo?.nombre ?? '');
  const [cuantas, setCuantas] = useState<Cuantas>(
    grupo === null ? 'una' : grupo.minimo >= 1 ? 'una' : grupo.maximo === 1 ? 'opcional' : 'varias',
  );
  const [hasta, setHasta] = useState(grupo !== null && grupo.maximo > 1 ? grupo.maximo : 3);
  const [opciones, setOpciones] = useState<readonly OpcionEnLaHoja[]>(
    grupo === null ? [opcionVacia(), opcionVacia()] : grupo.opciones.map(comoEnLaHoja),
  );
  const [trabajando, setTrabajando] = useState(false);
  const [quitar, setQuitar] = useState(false);
  const otrosPlatos = (grupo?.platos ?? []).filter((p) => p.id !== platoId);

  const cambiar = (clave: string, cambios: Partial<OpcionEnLaHoja>) => {
    setOpciones((antes) => antes.map((o) => (o.clave === clave ? { ...o, ...cambios } : o)));
  };
  const llenas = opciones.filter((o) => o.nombre.trim() !== '');
  const maximo = cuantas === 'varias' ? Math.min(hasta, Math.max(llenas.length, 1)) : 1;
  const minimo = cuantas === 'una' ? 1 : 0;
  const unidadesDe = (productoId: string) =>
    productos.find((p) => p.id === productoId)?.unidades ?? [];

  async function guardar() {
    setTrabajando(true);
    const hecho = await orden('guardar_grupo_de_opciones', {
      ...(grupo === null ? { plato_id: platoId } : { grupo_id: grupo.id }),
      nombre: nombre.trim(),
      minimo,
      maximo,
      opciones: llenas.map((o) => {
        const anade =
          (o.gasta === 'anade' || o.gasta === 'cambia') && o.anadeId !== '' && o.unidad !== ''
            ? {
                producto_id: o.anadeId,
                cantidad: Number(o.cantidad.replace(',', '.')),
                unidad: o.unidad,
              }
            : null;
        const quita =
          (o.gasta === 'quita' || o.gasta === 'cambia') && o.quitaId !== '' ? o.quitaId : null;
        return {
          nombre: o.nombre.trim(),
          precio_centimos: o.precio ?? 0,
          ...(anade === null ? {} : { anade }),
          ...(quita === null ? {} : { quita_producto_id: quita }),
        };
      }),
    });
    setTrabajando(false);
    if (hecho.ok) alCerrar();
  }

  async function copiar() {
    if (grupo === null) return;
    setTrabajando(true);
    const hecho = await orden('copiar_grupo_de_opciones', {
      grupo_id: grupo.id,
      nombre: `${grupo.nombre} · ${nombreDelPlato}`.slice(0, 40),
      plato_id: platoId,
    });
    setTrabajando(false);
    if (hecho.ok) alCerrar();
  }

  const listo =
    nombre.trim() !== '' &&
    llenas.length > 0 &&
    llenas.every(
      (o) =>
        (o.gasta !== 'anade' && o.gasta !== 'cambia') ||
        (o.anadeId !== '' && o.unidad !== '' && Number(o.cantidad.replace(',', '.')) > 0),
    );

  return (
    <Hoja
      abierta
      titulo={grupo === null ? 'Grupo nuevo' : grupo.nombre}
      alCerrar={alCerrar}
      pie={
        quitar && grupo !== null ? (
          <Botones>
            <Boton
              tono="secundario"
              onClick={() => {
                setQuitar(false);
              }}
            >
              No, dejarlo
            </Boton>
            <Boton
              tono="peligro"
              onClick={() => {
                void orden('quitar_grupo_de_opciones', { grupo_id: grupo.id }).then((r) => {
                  if (r.ok) alCerrar();
                });
              }}
            >
              Quitar el grupo
            </Boton>
          </Botones>
        ) : (
          <Botones>
            {grupo !== null && (
              <Boton
                tono="texto"
                onClick={() => {
                  setQuitar(true);
                }}
              >
                Quitar el grupo
              </Boton>
            )}
            <Boton
              tono="principal"
              disabled={!listo}
              cargando={trabajando}
              textoCargando="Guardando"
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
      {quitar && grupo !== null ? (
        <p className="pt-e3 text-cuerpo">
          Se va de{' '}
          {grupo.platos.length === 1
            ? 'su plato'
            : `los ${String(grupo.platos.length)} platos que lo usan`}
          . Lo ya pedido no cambia.
        </p>
      ) : (
        <div className="flex flex-col gap-e4 pt-e3">
          {otrosPlatos.length > 0 && (
            <div className="flex flex-col gap-e2 rounded-grande border-2 border-atencion bg-atencion-suave p-e3">
              <p className="text-secundario">
                Cambiarlo lo cambia en los {String(grupo?.platos.length ?? 0)} platos que lo usan (
                {otrosPlatos.map((p) => p.nombre).join(', ')}).
              </p>
              <Boton
                tono="secundario"
                tamano="s"
                disabled={trabajando}
                onClick={() => {
                  void copiar();
                }}
              >
                Copiar y cambiar solo en {nombreDelPlato}
              </Boton>
            </div>
          )}
          <Campo
            etiqueta="Nombre del grupo"
            placeholder="Ej.: Guarnición, Extras, ¿Con qué?"
            value={nombre}
            maxLength={40}
            onChange={(e) => {
              setNombre(e.target.value);
            }}
          />
          <div className="flex flex-col gap-e1">
            <span className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">
              ¿Cuántas se eligen?
            </span>
            <div
              role="radiogroup"
              aria-label="¿Cuántas se eligen?"
              className="flex flex-wrap gap-e1"
            >
              {(
                [
                  ['una', 'Obligatoria, una'],
                  ['opcional', 'Opcional, una'],
                  ['varias', 'Opcional, varias'],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={cuantas === valor}
                  onClick={() => {
                    setCuantas(valor);
                  }}
                  className={[
                    'min-h-toque rounded-grande px-e4 font-semibold',
                    cuantas === valor ? 'bg-texto text-fondo' : 'border-2 border-borde',
                  ].join(' ')}
                >
                  {texto}
                </button>
              ))}
            </div>
            {cuantas === 'varias' && (
              <Selector
                etiqueta="Hasta"
                value={String(hasta)}
                opciones={Array.from({ length: TOPES_DEL_GRUPO.maximo - 1 }, (_, i) => ({
                  valor: String(i + 2),
                  texto: String(i + 2),
                }))}
                onChange={(e) => {
                  setHasta(Number(e.target.value));
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-e3">
            <span className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">
              Las opciones
            </span>
            {opciones.map((o, i) => (
              <div
                key={o.clave}
                className="flex flex-col gap-e2 rounded-grande border border-borde p-e3"
              >
                <div className="grid gap-e2 sm:grid-cols-[minmax(0,1fr)_8rem]">
                  <Campo
                    etiqueta={`Opción ${String(i + 1)}`}
                    placeholder="Ej.: Patatas, Doble de queso"
                    value={o.nombre}
                    maxLength={40}
                    onChange={(e) => {
                      cambiar(o.clave, { nombre: e.target.value });
                    }}
                  />
                  <CampoMoneda
                    etiqueta="Suma"
                    valor={o.precio}
                    alCambiar={(precio) => {
                      cambiar(o.clave, { precio });
                    }}
                  />
                </div>
                <Selector
                  etiqueta="¿Qué gasta del almacén?"
                  value={o.gasta}
                  opciones={(Object.keys(NOMBRE_DE_LO_QUE_GASTA) as QueGasta[]).map((g) => ({
                    valor: g,
                    texto: NOMBRE_DE_LO_QUE_GASTA[g],
                  }))}
                  onChange={(e) => {
                    cambiar(o.clave, { gasta: e.target.value as QueGasta });
                  }}
                />
                {(o.gasta === 'quita' || o.gasta === 'cambia') && (
                  <Selector
                    etiqueta={o.gasta === 'cambia' ? 'Quita' : 'Ingrediente que quita'}
                    value={o.quitaId}
                    sinElegir="Elige un producto"
                    opciones={productos.map((p) => ({ valor: p.id, texto: p.nombre }))}
                    cuandoNoHay="Tu almacén está vacío"
                    onChange={(e) => {
                      cambiar(o.clave, { quitaId: e.target.value });
                    }}
                  />
                )}
                {(o.gasta === 'anade' || o.gasta === 'cambia') && (
                  <div className="grid gap-e2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
                    <Selector
                      etiqueta={o.gasta === 'cambia' ? 'Pone' : 'Añade'}
                      value={o.anadeId}
                      sinElegir="Elige un producto"
                      opciones={productos.map((p) => ({ valor: p.id, texto: p.nombre }))}
                      cuandoNoHay="Tu almacén está vacío"
                      onChange={(e) => {
                        const unidades = unidadesDe(e.target.value);
                        cambiar(o.clave, { anadeId: e.target.value, unidad: unidades[0] ?? '' });
                      }}
                    />
                    <Campo
                      etiqueta="Cuánto"
                      inputMode="decimal"
                      value={o.cantidad}
                      onChange={(e) => {
                        cambiar(o.clave, { cantidad: e.target.value });
                      }}
                    />
                    <Selector
                      etiqueta="En"
                      value={o.unidad}
                      opciones={unidadesDe(o.anadeId).map((u) => ({ valor: u, texto: u }))}
                      cuandoNoHay="—"
                      onChange={(e) => {
                        cambiar(o.clave, { unidad: e.target.value as UnidadDeUso });
                      }}
                    />
                  </div>
                )}
                {opciones.length > 1 && (
                  <Boton
                    tono="texto"
                    tamano="s"
                    onClick={() => {
                      setOpciones((antes) => antes.filter((x) => x.clave !== o.clave));
                    }}
                  >
                    Quitar la opción
                  </Boton>
                )}
              </div>
            ))}
            {opciones.length < TOPES_DEL_GRUPO.opciones && (
              <Boton
                tono="secundario"
                onClick={() => {
                  setOpciones((antes) => [...antes, opcionVacia()]);
                }}
              >
                + Otra opción
              </Boton>
            )}
          </div>
          <p className="text-secundario text-texto-suave">
            El punto de la carne no es una opción: va en la nota de la línea.
          </p>
        </div>
      )}
    </Hoja>
  );
}
