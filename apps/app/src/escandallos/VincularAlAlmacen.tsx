import { useState } from 'react';
import { unidadParaEscribir } from '@estook/dominio';
import { Boton, Campo, Cargando, ErrorEnCristiano, Hoja, NadaConEso } from '@estook/ui';
import { IconoVincular } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import {
  laRacionQueViaja,
  losDelAlmacen,
  type LoQuePuedeLlevar,
  type RacionQueSeEscribe,
} from './contrato.ts';
import { LaRacion } from './LaRacion.tsx';

/**
 * Vincular un plato a lo que se vende tal como se guarda (repaso del 16-oct, A ·
 * decisión 0087): la lata, la botella, el entrecot, la dorada entera.
 *
 * Sale **todo el Almacén** (lección 190). Lo que va por unidades se vincula de un toque;
 * lo que va en gramos o mililitros pregunta antes cuánto lleva la ración.
 */
export function VincularAlAlmacen({
  platoId,
  nombre,
  alCerrar,
  alHecho,
}: {
  readonly platoId: string;
  readonly nombre: string;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLasFichas();
  const lo = usarLectura<LoQuePuedeLlevar>('lo_que_puede_llevar');
  const [buscado, setBuscado] = useState('');
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [abierto, setAbierto] = useState<{
    readonly id: string;
    readonly racion: RacionQueSeEscribe;
  } | null>(null);
  const productos = losDelAlmacen(lo.data, buscado);

  async function vincular(
    productoId: string,
    suNombre: string,
    racion: { readonly cantidad: number; readonly unidad: string } | null,
  ) {
    setVinculando(productoId);
    setError(null);
    const respuesta = await cliente.ejecutar('vincular_plato', {
      plato_id: platoId,
      producto_id: productoId,
      ...(racion ?? {}),
    });
    setVinculando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alHecho(`Vinculado a ${suNombre}`);
  }

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`Vincular ${nombre}`}>
      <div className="flex flex-col gap-e3 pt-e3">
        <p className="text-secundario text-texto-suave">
          Lo que se vende tal como está en el Almacén.
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}
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
          <ul aria-label="Lo que hay en el Almacén" className="flex flex-col">
            {productos.map((p) => {
              const esteAbierto = abierto?.id === p.id ? abierto : null;
              const racion =
                esteAbierto === null ? null : laRacionQueViaja(p.unidad, esteAbierto.racion);
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-e2 border-b border-borde py-e1 last:border-0"
                >
                  <div className="flex min-h-toque items-center gap-e3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-cuerpo">{p.nombre}</span>
                      <span className="text-etiqueta text-texto-suave">
                        {[p.categoria, p.unidad === 'ud' ? null : `en ${p.unidad}`]
                          .filter((x) => x !== null)
                          .join(' · ') || 'Almacén'}
                      </span>
                    </span>
                    {esteAbierto === null && (
                      <Boton
                        tono="secundario"
                        tamano="s"
                        icono={<IconoVincular size={16} />}
                        cargando={vinculando === p.id}
                        textoCargando="Vinculando"
                        onClick={() => {
                          if (p.unidad === 'ud') void vincular(p.id, p.nombre, null);
                          else
                            setAbierto({
                              id: p.id,
                              racion: { cantidad: '', unidad: unidadParaEscribir(p.unidad) },
                            });
                        }}
                      >
                        Vincular
                      </Boton>
                    )}
                  </div>
                  {esteAbierto !== null && (
                    <div className="flex flex-col gap-e2 pb-e2">
                      <LaRacion
                        nombre={p.nombre}
                        unidadDelProducto={p.unidad}
                        racion={esteAbierto.racion}
                        alCambiar={(nueva) => {
                          setAbierto({ id: p.id, racion: nueva });
                        }}
                      />
                      <div className="flex justify-end gap-e2">
                        <Boton
                          tono="texto"
                          tamano="s"
                          onClick={() => {
                            setAbierto(null);
                          }}
                        >
                          Cancelar
                        </Boton>
                        <Boton
                          tono="principal"
                          tamano="s"
                          icono={<IconoVincular size={16} />}
                          disabled={racion === null || racion === 'por_unidades'}
                          cargando={vinculando === p.id}
                          textoCargando="Vinculando"
                          onClick={() => {
                            if (racion !== null && racion !== 'por_unidades')
                              void vincular(p.id, p.nombre, racion);
                          }}
                        >
                          Vincular
                        </Boton>
                      </div>
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
