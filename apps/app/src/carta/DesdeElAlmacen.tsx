import { useState } from 'react';
import { centimos, unidadParaEscribir } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Campo,
  CampoMoneda,
  Cargando,
  ErrorEnCristiano,
  Hoja,
  NadaConEso,
  Selector,
  clases,
} from '@estook/ui';
import { IconoHecho } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import {
  laRacionQueViaja,
  losDelAlmacen,
  type LoQuePuedeLlevar,
  type RacionQueSeEscribe,
} from '../escandallos/contrato.ts';
import { LaRacion } from '../escandallos/LaRacion.tsx';
import type { MiCarta } from './contrato.ts';

/**
 * Llevar a la carta lo que se vende tal cual, de golpe (repaso del 16-oct, A · 0087).
 *
 * Richi: «enlazar directamente un ingrediente del almacén: chuletón, pescados enteros,
 * bebidas o cosas que se vendan por unidades, y así puedes seleccionarlo de golpe y la
 * app sabe que es ese chuletón». Se marcan, se les pone el precio y entran en la carta
 * **ya vinculados**: su ficha es ese producto y su coste sale solo.
 *
 * Sale **todo el Almacén** (lección 190): lo que va por unidades es una; lo que va en
 * gramos o mililitros pide cuánto lleva la ración, porque en el Almacén de verdad el
 * entrecot, el pescado entero o el helado se llevan así.
 */
interface Elegido {
  readonly precio: number | null;
  readonly racion: RacionQueSeEscribe;
}

export function DesdeElAlmacen({
  carta,
  seccionInicial,
  alCerrar,
}: {
  readonly carta: MiCarta;
  readonly seccionInicial: string | null;
  readonly alCerrar: () => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLasFichas();
  const lo = usarLectura<LoQuePuedeLlevar>('lo_que_puede_llevar');
  const [seccion, setSeccion] = useState(seccionInicial ?? '');
  const [buscado, setBuscado] = useState('');
  const [elegidos, setElegidos] = useState<ReadonlyMap<string, Elegido>>(new Map());
  const [anadiendo, setAnadiendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [yaEstaban, setYaEstaban] = useState<readonly string[]>([]);

  const yaEnLaCarta = new Set(
    carta.platos.flatMap((p) => (p.vinculadoA === null || !p.activo ? [] : [p.vinculadoA.id])),
  );
  const productos = losDelAlmacen(lo.data, buscado);
  const delAlmacen = new Map((lo.data?.productos ?? []).map((p) => [p.id, p]));
  const sinRacion = [...elegidos].filter(([id, e]) => {
    const p = delAlmacen.get(id);
    return p !== undefined && laRacionQueViaja(p.unidad, e.racion) === null;
  }).length;

  function elegir(p: LoQuePuedeLlevar['productos'][number]) {
    setElegidos((antes) => {
      const despues = new Map(antes);
      if (despues.has(p.id)) despues.delete(p.id);
      else
        despues.set(p.id, {
          precio: null,
          racion: { cantidad: '', unidad: unidadParaEscribir(p.unidad) },
        });
      return despues;
    });
  }

  function cambiar(id: string, cambio: Partial<Elegido>) {
    setElegidos((antes) => {
      const era = antes.get(id);
      return era === undefined ? antes : new Map(antes).set(id, { ...era, ...cambio });
    });
  }

  async function anadir() {
    setAnadiendo(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ yaEstaban: string[] }>('crear_platos', {
      seccion_id: seccion === '' ? null : seccion,
      platos: [...elegidos].map(([id, e]) => {
        const p = delAlmacen.get(id);
        const racion = p === undefined ? null : laRacionQueViaja(p.unidad, e.racion);
        return {
          nombre: p?.nombre ?? '',
          precio_centimos: e.precio,
          producto_id: id,
          ...(racion === null || racion === 'por_unidades' ? {} : racion),
        };
      }),
    });
    setAnadiendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    if (respuesta.datos.yaEstaban.length > 0) {
      setYaEstaban(respuesta.datos.yaEstaban);
      setElegidos(new Map());
      return;
    }
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Desde el almacén"
      pie={
        <Botones>
          <Boton tono="secundario" onClick={alCerrar}>
            {yaEstaban.length > 0 ? 'Cerrar' : 'Cancelar'}
          </Boton>
          <Boton
            tono="principal"
            disabled={elegidos.size === 0 || sinRacion > 0}
            cargando={anadiendo}
            textoCargando="Añadiendo"
            onClick={() => {
              void anadir();
            }}
          >
            {elegidos.size <= 1
              ? 'Añadir a la carta'
              : `Añadir ${String(elegidos.size)} a la carta`}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3 pt-e3">
        <p className="text-secundario text-texto-suave">
          Lo que vendes tal como lo guardas: queda vinculado y su coste sale solo.
        </p>
        {yaEstaban.length > 0 && (
          <Aviso tono="info" titulo="Lo demás ya está en tu carta">
            {yaEstaban.join(', ')}: ya {yaEstaban.length === 1 ? 'había un plato' : 'había platos'}{' '}
            con ese nombre. Vincúlalo desde su ficha.
          </Aviso>
        )}
        {error !== null && <ErrorEnCristiano error={error} />}
        <Selector
          etiqueta="Sección"
          opciones={[
            { valor: '', texto: 'Sin sección' },
            ...carta.secciones.map((s) => ({ valor: s.id, texto: s.nombre })),
          ]}
          value={seccion}
          onChange={(e) => {
            setSeccion(e.target.value);
          }}
        />
        <Campo
          etiqueta="Buscar en el Almacén"
          value={buscado}
          onChange={(e) => {
            setBuscado(e.target.value);
          }}
        />
        {lo.data === undefined ? (
          <Cargando que="tu almacén" forma="lista" lineas={4} />
        ) : productos.length === 0 ? (
          buscado === '' ? (
            <p className="text-secundario text-texto-suave">Tu Almacén está vacío.</p>
          ) : (
            <NadaConEso
              compacto
              buscado={buscado}
              alQuitar={() => {
                setBuscado('');
              }}
            />
          )
        ) : (
          <ul aria-label="Lo que hay en el Almacén" className="flex flex-col gap-e2">
            {productos.map((p) => {
              const ya = yaEnLaCarta.has(p.id);
              const elegido = elegidos.has(p.id);
              const eleccion = elegidos.get(p.id);
              return (
                <li
                  key={p.id}
                  className={clases(
                    'flex flex-col gap-e2 rounded-grande border px-e3 py-e2',
                    elegido ? 'border-texto' : 'border-borde',
                  )}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={elegido}
                    disabled={ya}
                    onClick={() => {
                      elegir(p);
                    }}
                    className="flex min-h-toque items-center gap-e3 text-left disabled:opacity-50"
                  >
                    <span
                      className={clases(
                        'grid size-[22px] shrink-0 place-items-center rounded-[7px] border',
                        elegido ? 'border-texto bg-texto text-superficie' : 'border-borde-fuerte',
                      )}
                    >
                      {elegido && <IconoHecho size={14} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-cuerpo">{p.nombre}</span>
                      <span className="text-etiqueta text-texto-suave">
                        {ya
                          ? 'Ya está en la carta'
                          : [p.categoria, p.unidad === 'ud' ? null : `en ${p.unidad}`]
                              .filter((x) => x !== null)
                              .join(' · ') || 'Almacén'}
                      </span>
                    </span>
                  </button>
                  {eleccion !== undefined && (
                    <div className="grid gap-e2 min-[480px]:grid-cols-2">
                      {p.unidad !== 'ud' && (
                        <LaRacion
                          nombre={p.nombre}
                          unidadDelProducto={p.unidad}
                          racion={eleccion.racion}
                          alCambiar={(racion) => {
                            cambiar(p.id, { racion });
                          }}
                        />
                      )}
                      <CampoMoneda
                        etiqueta={`Precio de ${p.nombre}, con IVA`}
                        valor={eleccion.precio === null ? null : centimos(eleccion.precio)}
                        alCambiar={(valor) => {
                          cambiar(p.id, { precio: valor === null ? null : Number(valor) });
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Hoja>
  );
}
