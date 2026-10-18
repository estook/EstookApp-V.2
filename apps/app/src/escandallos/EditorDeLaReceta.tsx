import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  UNIDADES_DE_USO,
  elProductoQueSeParece,
  laRecetaQueSeParece,
  unidadesQueSirven,
  type UnidadDeUso,
} from '@estook/dominio';
import {
  Boton,
  Botones,
  CAJA,
  Campo,
  Envoltorio,
  ErrorEnCristiano,
  Hoja,
  clases,
  sinAcentos,
} from '@estook/ui';
import { IconoAnadir, IconoAlmacen, IconoCerrar } from '@estook/iconos';
import { puedeEditar } from '@estook/permisos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import {
  NOMBRE_DE_LA_UNIDAD,
  leerCantidad,
  type LoQuePuedeLlevar,
  type RecetasDeReferencia,
  type UnaFicha,
} from './contrato.ts';

/**
 * Escribir lo que lleva un plato (el escandallo) o cómo se hace (la ficha técnica)
 * (M9 · 2, 0087; separados en el repaso del 16-oct, 0090).
 *
 * Es la misma receta y el mismo guardado, pero **cada pestaña edita lo suyo**: el
 * escandallo, los ingredientes y sus cantidades; la ficha técnica, los pasos, el tiempo
 * y las notas. Lo que no se toca viaja tal cual estaba. Antes las dos cosas iban en la
 * misma hoja, y Richi no sabía dónde se hacía cada una.
 *
 * «Primero la carta» (Richi, 15-oct): el plato ya existe y aquí **se desgrana**: el
 * ingrediente y el peso, y Estook saca el precio del Almacén. Como se pasa una receta
 * de un papel: **fila a fila, y siempre queda una libre al final**, igual que «Añadir
 * platos» de la Carta. Los pasos, lo mismo.
 *
 * El ingrediente se busca escribiendo en el Almacén (las elaboraciones ya no se
 * ofrecen: 0090). **Si no está, se crea desde aquí** con su nombre y su unidad, sin
 * precio (Plan, M9): el plato dirá «falta el precio de 1» y no se inventa un coste.
 *
 * Guardar es confirmar (0086, pregunta 5): lo guardado es la receta de ahora, y lo de
 * antes queda en el historial.
 *
 * Y desde M9 · 3 (0092): **«¿Es una receta de olla?»**, plegado, para escribirla como se
 * cocina («sale para 25 raciones»); y si el plato se llama como una de las diez recetas
 * de Estook, **«¿Empezar desde la de Estook?»**: copia sus ingredientes y cantidades, y
 * cada uno **pregunta cuál de tus productos es** (con el que más se parece propuesto).
 * Nada se une ni se crea solo: hasta que se elija, no se puede guardar.
 */

interface Fila {
  readonly clave: string;
  readonly tipo: 'producto' | 'elaboracion' | null;
  readonly refId: string | null;
  readonly nombre: string;
  readonly cantidad: string;
  readonly unidad: UnidadDeUso;
  readonly nota: string;
  readonly conNota: boolean;
  /** De la receta de Estook: el producto tuyo que más se parece, para proponerlo (0092). */
  readonly propuesta?: {
    readonly id: string;
    readonly nombre: string;
    readonly unidad: UnidadDeUso;
  };
  /** Copiada de la receta de Estook y sin elegir todavía cuál de tus productos es. */
  readonly copiada?: true;
}

let contador = 0;
function clave(): string {
  contador += 1;
  return `fila-${String(contador)}`;
}

const VACIA = (): Fila => ({
  clave: clave(),
  tipo: null,
  refId: null,
  nombre: '',
  cantidad: '',
  unidad: 'g',
  nota: '',
  conNota: false,
});

function comoSeEscribe(numero: number): string {
  return String(Number(numero.toFixed(4))).replace('.', ',');
}

/** Un paso que se escribe, y de qué paso guardado viene (para que su foto le siga). */
interface PasoQueSeEscribe {
  readonly texto: string;
  readonly de: number | null;
}

export function EditorDeLaReceta({
  datos,
  que,
  alCerrar,
  alGuardar,
}: {
  readonly datos: UnaFicha;
  /** El escandallo (lo que lleva) o la ficha técnica (cómo se hace). */
  readonly que: 'escandallo' | 'pasos';
  readonly alCerrar: () => void;
  readonly alGuardar: (frase: string) => void;
}) {
  const { cliente, permisos } = usarSesion();
  const cache = useQueryClient();
  const refrescar = usarRefrescarLasFichas();
  const lo = usarLectura<LoQuePuedeLlevar>('lo_que_puede_llevar', {}, que === 'escandallo');
  const esElaboracion = datos.tipo === 'elaboracion';
  const enLosPasos = que === 'pasos';
  const empiezaVacia = datos.receta.lineas.length === 0;
  const referencia = usarLectura<RecetasDeReferencia>(
    'recetas_de_referencia',
    {},
    que === 'escandallo' && !esElaboracion && empiezaVacia,
  );
  const parecida = laRecetaQueSeParece(datos.nombre, referencia.data?.recetas ?? []);

  const [nombre, setNombre] = useState(datos.nombre);
  const [rinde, setRinde] = useState(
    datos.rinde === null ? '' : comoSeEscribe(datos.rinde.cantidad),
  );
  const [rindeUnidad, setRindeUnidad] = useState<UnidadDeUso>(datos.rinde?.unidad ?? 'l');
  const [filas, setFilas] = useState<readonly Fila[]>(() => [
    ...datos.receta.lineas.map((l): Fila => ({
      clave: clave(),
      tipo: l.tipo,
      refId: l.refId,
      nombre: l.nombre,
      cantidad: comoSeEscribe(l.cantidad),
      unidad: l.unidad,
      nota: l.nota ?? '',
      conNota: l.nota !== null,
    })),
    VACIA(),
  ]);
  const [pasos, setPasos] = useState<readonly PasoQueSeEscribe[]>([
    ...datos.receta.pasos.map((texto, i) => ({ texto, de: i })),
    { texto: '', de: null },
  ]);
  const [minutos, setMinutos] = useState(
    datos.receta.minutos === null ? '' : String(datos.receta.minutos),
  );
  const [notas, setNotas] = useState(datos.receta.notas ?? '');
  // La tanda (0092): de fábrica, una ración; plegado, «¿Es una receta de olla?».
  const [esOlla, setEsOlla] = useState((datos.receta.raciones ?? 1) > 1);
  const [raciones, setRaciones] = useState(
    (datos.receta.raciones ?? 1) > 1 ? String(datos.receta.raciones) : '',
  );
  const [deEstook, setDeEstook] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  function cambiar(fila: Fila) {
    setFilas((antes) => {
      const despues = antes.map((f) => (f.clave === fila.clave ? fila : f));
      const ultima = despues[despues.length - 1];
      return ultima !== undefined &&
        (ultima.nombre.trim() !== '' || ultima.refId !== null) &&
        despues.length < 60
        ? [...despues, VACIA()]
        : despues;
    });
  }

  function quitar(fila: Fila) {
    setFilas((antes) => {
      const despues = antes.filter((f) => f.clave !== fila.clave);
      return despues.length === 0 ? [VACIA()] : despues;
    });
  }

  async function crearEnElAlmacen(fila: Fila) {
    const unidad: UnidadDeUso =
      fila.unidad === 'kg' ? 'g' : fila.unidad === 'l' ? 'ml' : fila.unidad;
    const respuesta = await cliente.ejecutar<{ productoId: string }>('crear_producto', {
      nombre: fila.nombre.trim(),
      unidad_de_uso: unidad,
    });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: ['lo_que_puede_llevar'] });
    cambiar({ ...fila, tipo: 'producto', refId: respuesta.datos.productoId });
    setBuscando(null);
  }

  const llenas = filas.filter((f) => f.refId !== null || f.nombre.trim() !== '');
  const sinElegir = llenas.filter((f) => f.refId === null);
  const sinCantidad = llenas.filter((f) => f.refId !== null && leerCantidad(f.cantidad) === null);
  const rindeLeido = leerCantidad(rinde);
  const minutosLeidos = minutos.trim() === '' ? null : Number.parseInt(minutos, 10);
  const racionesLeidas = raciones.trim() === '' ? null : Number.parseInt(raciones, 10);
  const racionesMal =
    esOlla &&
    (racionesLeidas === null ||
      !Number.isInteger(racionesLeidas) ||
      racionesLeidas < 2 ||
      racionesLeidas > 1000);
  const minutosMal =
    minutosLeidos !== null &&
    (!Number.isInteger(minutosLeidos) || minutosLeidos < 1 || minutosLeidos > 2880);
  const sePuede = enLosPasos
    ? !minutosMal
    : sinElegir.length === 0 &&
      sinCantidad.length === 0 &&
      !racionesMal &&
      (!esElaboracion || (rindeLeido !== null && nombre.trim() !== ''));
  const pasosEscritos = pasos
    .map((p) => ({ ...p, texto: p.texto.trim() }))
    .filter((p) => p.texto !== '');

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{
      version: number;
      cambios: string[];
      sumadas: string[];
    }>('guardar_ficha', {
      ...(esElaboracion ? { elaboracion_id: datos.id } : { plato_id: datos.id }),
      version: datos.receta.version,
      // Lo que no se edita en esta hoja viaja tal cual estaba.
      lineas: enLosPasos
        ? datos.receta.lineas.map((l) => ({
            ...(l.tipo === 'elaboracion' ? { elaboracion_id: l.refId } : { producto_id: l.refId }),
            cantidad: l.cantidad,
            unidad: l.unidad,
            nota: l.nota,
          }))
        : llenas.map((f) => ({
            ...(f.tipo === 'elaboracion' ? { elaboracion_id: f.refId } : { producto_id: f.refId }),
            cantidad: leerCantidad(f.cantidad),
            unidad: f.unidad,
            nota: f.nota.trim() === '' ? null : f.nota.trim(),
          })),
      pasos: enLosPasos ? pasosEscritos.map((p) => p.texto) : datos.receta.pasos,
      // Cada paso, con la foto del que era (0090): borrar el segundo no le pasa su foto
      // al tercero.
      ...(enLosPasos ? { foto_de_antes: pasosEscritos.map((p) => p.de) } : {}),
      notas: enLosPasos ? (notas.trim() === '' ? null : notas.trim()) : datos.receta.notas,
      tiempo_minutos: enLosPasos ? minutosLeidos : datos.receta.minutos,
      // La tanda es del escandallo (0092): en los pasos viaja como estaba.
      ...(esElaboracion || enLosPasos ? {} : { raciones: esOlla ? racionesLeidas : 1 }),
      ...(esElaboracion
        ? { nombre: nombre.trim(), rinde_cantidad: rindeLeido, rinde_unidad: rindeUnidad }
        : {}),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    const { cambios, sumadas } = respuesta.datos;
    if (sumadas.length > 0) {
      alGuardar(`Guardada. ${sumadas.join(', ')} venía dos veces: se ha sumado.`);
      return;
    }
    alGuardar(cambios.length === 0 ? 'Sin cambios' : 'Guardada');
  }

  function empezarDesdeLaDeEstook() {
    if (parecida === null) return;
    const productos = lo.data?.productos ?? [];
    setFilas([
      ...parecida.lineas.map((l): Fila => {
        const propuesta = elProductoQueSeParece(l.producto, productos);
        return {
          clave: clave(),
          tipo: null,
          refId: null,
          nombre: l.producto,
          cantidad: comoSeEscribe(l.cantidad),
          unidad: l.unidad,
          nota: '',
          conNota: false,
          copiada: true,
          ...(propuesta === null
            ? {}
            : {
                propuesta: { id: propuesta.id, nombre: propuesta.nombre, unidad: propuesta.unidad },
              }),
        };
      }),
      VACIA(),
    ]);
    if (parecida.raciones > 1) {
      setEsOlla(true);
      setRaciones(String(parecida.raciones));
    }
    setDeEstook(parecida.nombre);
  }

  const titulo = enLosPasos
    ? 'Cómo se hace'
    : datos.receta.lineas.length === 0
      ? 'Desgranar'
      : 'Editar el escandallo';

  return (
    <Hoja
      abierta
      amplia
      alCerrar={alCerrar}
      titulo={titulo}
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            tono="principal"
            disabled={!sePuede}
            cargando={guardando}
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
      <div className="flex flex-col gap-e5 pt-e3">
        {error !== null && <ErrorEnCristiano error={error} />}

        {!enLosPasos && esElaboracion && (
          <div className="grid grid-cols-1 gap-e3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <Campo
              etiqueta="Nombre"
              value={nombre}
              maxLength={120}
              onChange={(e) => {
                setNombre(e.target.value);
              }}
            />
            <Campo
              etiqueta="Rinde"
              inputMode="decimal"
              value={rinde}
              placeholder="2"
              onChange={(e) => {
                setRinde(e.target.value);
              }}
              unidad={{
                valor: rindeUnidad,
                opciones: UNIDADES_DE_USO.map((u) => ({ valor: u, larga: NOMBRE_DE_LA_UNIDAD[u] })),
                alElegir: (u) => {
                  setRindeUnidad(u as UnidadDeUso);
                },
              }}
              {...(rinde !== '' && rindeLeido === null ? { error: 'Un número, como 2 o 1,5' } : {})}
            />
          </div>
        )}

        {!enLosPasos && !esElaboracion && parecida !== null && llenas.length === 0 && (
          <div className="flex flex-col items-start gap-e2 rounded-grande bg-fondo p-e4">
            <p className="text-cuerpo font-semibold">
              ¿Empezar desde «{parecida.nombre}» de Estook?
            </p>
            <p className="text-secundario text-texto-suave">
              Para {parecida.raciones} {parecida.raciones === 1 ? 'ración' : 'raciones'} ·{' '}
              {parecida.lineas.length} ingredientes. Luego eliges cuál de tus productos es cada uno,
              y la cambias a tu gusto.
            </p>
            <Boton tono="secundario" onClick={empezarDesdeLaDeEstook}>
              Empezar desde ella
            </Boton>
          </div>
        )}

        {!enLosPasos && deEstook !== null && (
          <p className="text-secundario text-texto-suave">
            Copiada de «{deEstook}». Elige en cada línea cuál de tus productos es.
          </p>
        )}

        {!enLosPasos && !esElaboracion && (
          <div className="flex flex-col gap-e2">
            {esOlla ? (
              <div className="flex flex-wrap items-end gap-e3">
                <Campo
                  etiqueta="Esta receta es para una tanda de"
                  inputMode="numeric"
                  value={raciones}
                  placeholder="25"
                  detras="raciones"
                  onChange={(e) => {
                    setRaciones(e.target.value.replace(/\D/g, ''));
                  }}
                  {...(raciones !== '' && racionesMal ? { error: 'Entre 2 y 1.000' } : {})}
                />
                <button
                  type="button"
                  onClick={() => {
                    setEsOlla(false);
                    setRaciones('');
                  }}
                  className="min-h-toque text-secundario font-semibold text-texto-suave underline decoration-borde-fuerte underline-offset-4 hover:text-texto"
                >
                  Es de una ración
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEsOlla(true);
                }}
                className="flex min-h-toque items-center gap-e1 self-start text-secundario font-semibold text-texto-suave hover:text-texto"
              >
                <IconoAnadir size={16} />
                ¿Es una receta de olla?
              </button>
            )}
          </div>
        )}

        {!enLosPasos && (
          <section aria-label="Lo que lleva" className="flex flex-col gap-e2">
            <h3 className="text-cuerpo font-semibold">
              Lo que lleva
              {esElaboracion ? '' : esOlla ? ', la tanda entera' : ', por ración'}
            </h3>
            <ol className="flex flex-col gap-e2">
              {filas.map((fila, i) => (
                <LineaQueSeEscribe
                  key={fila.clave}
                  fila={fila}
                  numero={i + 1}
                  lo={lo.data}
                  abierta={buscando === fila.clave}
                  alBuscar={(abierta) => {
                    setBuscando(abierta ? fila.clave : null);
                  }}
                  alCambiar={cambiar}
                  alQuitar={() => {
                    quitar(fila);
                  }}
                  puedeCrear={puedeEditar(permisos, 'app.almacen')}
                  alCrear={() => {
                    void crearEnElAlmacen(fila);
                  }}
                />
              ))}
            </ol>
          </section>
        )}

        {enLosPasos && (
          <>
            <section aria-label="Cómo se hace" className="flex flex-col gap-e2">
              <h3 className="text-cuerpo font-semibold">Los pasos</h3>
              <p className="text-secundario text-texto-suave">
                Uno por paso, como se lo explicarías a alguien nuevo. Las fotos se ponen después, en
                cada paso.
              </p>
              <ol className="flex flex-col gap-e2">
                {pasos.map((paso, i) => {
                  const foto =
                    paso.de === null ? null : (datos.receta.fotosDeLosPasos?.[paso.de] ?? null);
                  return (
                    <li key={i} className="flex items-start gap-e2">
                      <span className="mt-[10px] grid size-[26px] shrink-0 place-items-center rounded-redondo bg-fondo text-etiqueta font-bold">
                        {i + 1}
                      </span>
                      <textarea
                        aria-label={`Paso ${String(i + 1)}`}
                        value={paso.texto}
                        maxLength={400}
                        rows={2}
                        placeholder={i === 0 ? 'Marcar la carne a fuego fuerte…' : ''}
                        onChange={(e) => {
                          const valor = e.target.value;
                          setPasos((antes) => {
                            const despues = antes.map((p, j) =>
                              j === i ? { ...p, texto: valor } : p,
                            );
                            const ultimo = despues[despues.length - 1];
                            return ultimo !== undefined &&
                              ultimo.texto.trim() !== '' &&
                              despues.length < 40
                              ? [...despues, { texto: '', de: null }]
                              : despues;
                          });
                        }}
                        className={`${CAJA} min-h-[3.25rem] py-e2`}
                      />
                      {/* Su foto, en pequeño: dice que el paso la lleva y que va con él. */}
                      {foto !== null && (
                        <img
                          src={foto}
                          alt=""
                          className="mt-e1 size-[44px] shrink-0 rounded-medio bg-fondo object-cover"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className="grid grid-cols-1 gap-e3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Campo
                etiqueta="Tiempo"
                inputMode="numeric"
                value={minutos}
                detras="min"
                onChange={(e) => {
                  setMinutos(e.target.value.replace(/\D/g, ''));
                }}
                {...(minutosMal ? { error: 'Entre 1 y 2.880 minutos' } : {})}
              />
              <Envoltorio id="notas-de-la-receta" etiqueta="Notas · emplatado, conservación">
                <textarea
                  id="notas-de-la-receta"
                  value={notas}
                  maxLength={1000}
                  rows={2}
                  onChange={(e) => {
                    setNotas(e.target.value);
                  }}
                  className={`${CAJA} min-h-[3.25rem] py-e2`}
                />
              </Envoltorio>
            </div>
          </>
        )}

        {!enLosPasos && sinElegir.length > 0 && (
          <p className="text-secundario text-atencion">
            Elige {sinElegir.length === 1 ? `«${sinElegir[0]?.nombre ?? ''}»` : 'cada ingrediente'}{' '}
            de la lista, o créalo en el Almacén.
          </p>
        )}
      </div>
    </Hoja>
  );
}

// ── Una línea: el ingrediente, cuánto y en qué ───────────────────────────────

function LineaQueSeEscribe({
  fila,
  numero,
  lo,
  abierta,
  alBuscar,
  alCambiar,
  alQuitar,
  puedeCrear,
  alCrear,
}: {
  readonly fila: Fila;
  readonly numero: number;
  readonly lo: LoQuePuedeLlevar | undefined;
  readonly abierta: boolean;
  readonly alBuscar: (abierta: boolean) => void;
  readonly alCambiar: (fila: Fila) => void;
  readonly alQuitar: () => void;
  readonly puedeCrear: boolean;
  readonly alCrear: () => void;
}) {
  const texto = sinAcentos(fila.nombre.trim().toLocaleLowerCase('es'));
  const opciones = useMemo(() => {
    if (lo === undefined || texto === '' || fila.refId !== null) return [];
    const casa = (nombre: string) => sinAcentos(nombre.toLocaleLowerCase('es')).includes(texto);
    // Sin elaboraciones (0090): por ahora no se ofrecen. Las que ya estaban en una
    // receta siguen ahí, con su nombre.
    return [
      ...lo.productos
        .filter((p) => casa(p.nombre))
        .map((p) => ({
          tipo: 'producto' as const,
          id: p.id,
          nombre: p.nombre,
          unidad: p.unidad,
          de: p.categoria ?? 'Almacén',
        })),
    ].slice(0, 8);
  }, [lo, texto, fila.refId]);
  const exacto = opciones.some((o) => sinAcentos(o.nombre.toLocaleLowerCase('es')) === texto);
  // Lo que se propone, a la vista: escribiendo en la última fila, quedaba debajo del borde.
  const propuestas = useRef<HTMLUListElement>(null);
  const conPropuestas = abierta && fila.refId === null && texto !== '';
  useEffect(() => {
    if (conPropuestas) propuestas.current?.scrollIntoView({ block: 'nearest' });
  }, [conPropuestas, opciones.length]);
  const sirven = fila.refId === null ? UNIDADES_DE_USO : unidadesQueSirven(fila.unidad);
  const caja = useRef<HTMLInputElement>(null);

  return (
    <li className="flex flex-col gap-e1 border-b border-borde pb-e2 last:border-0">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-end gap-e2">
        <div className="relative">
          <label className="sr-only" htmlFor={fila.clave}>
            Ingrediente {numero}
          </label>
          <input
            ref={caja}
            id={fila.clave}
            value={fila.nombre}
            placeholder={numero === 1 ? 'Carne picada, salsa de la casa…' : 'Otro ingrediente'}
            autoComplete="off"
            onFocus={() => {
              alBuscar(true);
            }}
            onChange={(e) => {
              alBuscar(true);
              alCambiar({ ...fila, nombre: e.target.value, refId: null, tipo: null });
            }}
            className={clases(CAJA, fila.refId !== null && 'font-semibold')}
          />
        </div>
        <div className="relative flex items-center">
          <input
            aria-label={`Cantidad de ${fila.nombre === '' ? `ingrediente ${String(numero)}` : fila.nombre}`}
            inputMode="decimal"
            value={fila.cantidad}
            placeholder="0"
            onChange={(e) => {
              alCambiar({ ...fila, cantidad: e.target.value });
            }}
            className={clases(CAJA, 'pr-[3.25rem] text-right tabular-nums')}
          />
          <select
            aria-label={`Unidad de ${fila.nombre === '' ? `ingrediente ${String(numero)}` : fila.nombre}`}
            value={fila.unidad}
            onChange={(e) => {
              alCambiar({ ...fila, unidad: e.target.value as UnidadDeUso });
            }}
            className="absolute right-e1 min-h-[36px] cursor-pointer rounded-medio bg-transparent px-e1 text-secundario font-semibold"
          >
            {sirven.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label={`Quitar ${fila.nombre === '' ? `la línea ${String(numero)}` : fila.nombre}`}
          onClick={alQuitar}
          className="grid size-toque place-items-center rounded-medio text-texto-suave hover:bg-fondo"
        >
          <IconoCerrar size={18} />
        </button>
      </div>

      {fila.refId === null && fila.propuesta !== undefined && !conPropuestas && (
        <button
          type="button"
          onClick={() => {
            const p = fila.propuesta;
            if (p === undefined) return;
            const sirvenLasDos = unidadesQueSirven(p.unidad).includes(fila.unidad);
            alCambiar({
              ...fila,
              tipo: 'producto',
              refId: p.id,
              nombre: p.nombre,
              unidad: sirvenLasDos ? fila.unidad : (unidadesQueSirven(p.unidad)[0] ?? p.unidad),
            });
          }}
          className="flex min-h-toque items-center gap-e1 self-start rounded-medio px-e2 text-secundario font-semibold text-texto-suave hover:bg-fondo hover:text-texto"
        >
          ¿Es tu «{fila.propuesta.nombre}»?
        </button>
      )}

      {fila.refId === null &&
        fila.copiada === true &&
        fila.propuesta === undefined &&
        !conPropuestas && (
          <button
            type="button"
            onClick={() => {
              caja.current?.focus();
            }}
            className="flex min-h-toque items-center gap-e1 self-start rounded-medio px-e2 text-secundario font-semibold text-atencion hover:bg-fondo"
          >
            ¿Cuál de tus productos es?
          </button>
        )}

      {conPropuestas && (
        <ul
          ref={propuestas}
          role="listbox"
          aria-label={`Lo que puede ser «${fila.nombre}»`}
          className="flex flex-col"
        >
          {opciones.map((o) => (
            <li key={`${o.tipo}.${o.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  const unidad = unidadesQueSirven(o.unidad)[0] ?? o.unidad;
                  alCambiar({
                    ...fila,
                    tipo: o.tipo,
                    refId: o.id,
                    nombre: o.nombre,
                    unidad: unidadesQueSirven(o.unidad).includes(fila.unidad)
                      ? fila.unidad
                      : unidad,
                  });
                  alBuscar(false);
                }}
                className="flex min-h-toque w-full items-center gap-e2 rounded-medio px-e2 text-left hover:bg-fondo"
              >
                <span className="min-w-0 flex-1 truncate text-cuerpo">{o.nombre}</span>
                <span className="shrink-0 text-etiqueta text-texto-suave">{o.de}</span>
              </button>
            </li>
          ))}
          {!exacto && puedeCrear && (
            <li>
              <button
                type="button"
                onClick={alCrear}
                className="flex min-h-toque w-full items-center gap-e2 rounded-medio px-e2 text-left text-secundario font-semibold hover:bg-fondo"
              >
                <IconoAlmacen size={18} />
                Crear «{fila.nombre.trim()}» en el Almacén
              </button>
            </li>
          )}
          {opciones.length === 0 && !puedeCrear && (
            <li className="px-e2 py-e1 text-secundario text-texto-suave">
              No está en el Almacén. Pídele a quien lo lleva que lo dé de alta.
            </li>
          )}
        </ul>
      )}

      {fila.refId !== null &&
        (fila.conNota ? (
          <input
            aria-label={`Nota de ${fila.nombre}`}
            value={fila.nota}
            maxLength={80}
            placeholder="Picada fina, en láminas…"
            onChange={(e) => {
              alCambiar({ ...fila, nota: e.target.value });
            }}
            className={clases(CAJA, 'min-h-[36px] text-secundario')}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              alCambiar({ ...fila, conNota: true });
            }}
            className="flex items-center gap-e1 self-start px-e1 text-etiqueta font-semibold text-texto-suave hover:text-texto"
          >
            <IconoAnadir size={14} />
            Nota
          </button>
        ))}
    </li>
  );
}
