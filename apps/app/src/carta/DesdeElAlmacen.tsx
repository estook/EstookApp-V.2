import { useState } from 'react';
import { centimos } from '@estook/dominio';
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
import { losQueSeVendenTalCual, type LoQuePuedeLlevar } from '../escandallos/contrato.ts';
import type { MiCarta } from './contrato.ts';

/**
 * Llevar a la carta lo que se vende tal cual, de golpe (repaso del 16-oct, A · 0087).
 *
 * Richi: «enlazar directamente un ingrediente del almacén: chuletón, pescados enteros,
 * bebidas o cosas que se vendan por unidades, y así puedes seleccionarlo de golpe y la
 * app sabe que es ese chuletón». Se marcan, se les pone el precio y entran en la carta
 * **ya vinculados**: su ficha es ese producto, una unidad, y su coste sale solo.
 *
 * **Solo lo que va en unidades**: lo que llega entero y se corta (el lomo de 20 kg) se
 * desgrana en Escandallos con sus gramos.
 */
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
  const [elegidos, setElegidos] = useState<ReadonlyMap<string, number | null>>(new Map());
  const [anadiendo, setAnadiendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [yaEstaban, setYaEstaban] = useState<readonly string[]>([]);

  const yaEnLaCarta = new Set(
    carta.platos.flatMap((p) => (p.vinculadoA === null || !p.activo ? [] : [p.vinculadoA.id])),
  );
  const productos = losQueSeVendenTalCual(lo.data, buscado);
  const nombreDe = new Map((lo.data?.productos ?? []).map((p) => [p.id, p.nombre]));

  function elegir(id: string) {
    setElegidos((antes) => {
      const despues = new Map(antes);
      if (despues.has(id)) despues.delete(id);
      else despues.set(id, null);
      return despues;
    });
  }

  async function anadir() {
    setAnadiendo(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ yaEstaban: string[] }>('crear_platos', {
      seccion_id: seccion === '' ? null : seccion,
      platos: [...elegidos].map(([id, precio]) => ({
        nombre: nombreDe.get(id) ?? '',
        precio_centimos: precio,
        producto_id: id,
      })),
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
            disabled={elegidos.size === 0}
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
          Lo que vendes por unidades tal como lo guardas: queda vinculado y su coste sale solo.
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
            <p className="text-secundario text-texto-suave">
              No hay nada en unidades en tu Almacén.
            </p>
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
          <ul aria-label="Lo que se vende tal cual" className="flex flex-col gap-e2">
            {productos.map((p) => {
              const ya = yaEnLaCarta.has(p.id);
              const elegido = elegidos.has(p.id);
              const precio = elegidos.get(p.id) ?? null;
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
                      elegir(p.id);
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
                        {ya ? 'Ya está en la carta' : (p.categoria ?? 'Almacén')}
                      </span>
                    </span>
                  </button>
                  {elegido && (
                    <CampoMoneda
                      etiqueta={`Precio de ${p.nombre}, con IVA`}
                      valor={precio === null ? null : centimos(precio)}
                      alCambiar={(valor) => {
                        setElegidos((antes) =>
                          new Map(antes).set(p.id, valor === null ? null : Number(valor)),
                        );
                      }}
                    />
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
