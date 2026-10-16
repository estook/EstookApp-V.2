import { useState } from 'react';
import { Boton, Campo, Cargando, ErrorEnCristiano, Hoja, NadaConEso } from '@estook/ui';
import { IconoVincular } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { usarRefrescarLasFichas } from '../ganchos/usarRefrescarLasFichas.ts';
import { losQueSeVendenTalCual, type LoQuePuedeLlevar } from './contrato.ts';

/**
 * Vincular un plato a lo que se vende por unidades tal como se guarda (repaso del
 * 16-oct, A · decisión 0087). Richi: «si les llega el lomo de ternera entero, 20 kg
 * sin cortar, ahí sí habría que hacer escandallo». Lo que va en kilos o en litros no
 * sale aquí: se desgrana con sus gramos.
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
  const productos = losQueSeVendenTalCual(lo.data, buscado);

  async function vincular(productoId: string, suNombre: string) {
    setVinculando(productoId);
    setError(null);
    const respuesta = await cliente.ejecutar('vincular_plato', {
      plato_id: platoId,
      producto_id: productoId,
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
          Lo que se vende por unidades, tal como está en el Almacén.
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
          <ul aria-label="Lo que se vende tal cual" className="flex flex-col">
            {productos.map((p) => (
              <li
                key={p.id}
                className="flex min-h-toque items-center gap-e3 border-b border-borde last:border-0"
              >
                <span className="flex min-w-0 flex-1 flex-col py-e1">
                  <span className="truncate text-cuerpo">{p.nombre}</span>
                  {p.categoria !== null && (
                    <span className="text-etiqueta text-texto-suave">{p.categoria}</span>
                  )}
                </span>
                <Boton
                  tono="secundario"
                  tamano="s"
                  icono={<IconoVincular size={16} />}
                  cargando={vinculando === p.id}
                  textoCargando="Vinculando"
                  onClick={() => {
                    void vincular(p.id, p.nombre);
                  }}
                >
                  Vincular
                </Boton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Hoja>
  );
}
