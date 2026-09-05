import { useQuery } from '@tanstack/react-query';
import { NOMBRE_DEL_ESTADO } from '@estook/dominio';
import { puedeVer } from '@estook/permisos';
import { Boton, Cifra, EstadoVacio, Etiqueta, Lista, Tarjeta } from '@estook/ui';
import { IconoVacio } from '@estook/iconos';
import { useNavigate } from 'react-router-dom';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  TONO_DEL_ESTADO,
  conUnidadDeUso,
  cuandoSeAgota,
  type InventarioHoy,
} from '../inventario/contrato.ts';

/**
 * Las dos tarjetas del Panel que Inventario tenía que llenar.
 *
 * ── La conexión que faltaba ──────────────────────────────────────────────────
 *
 * El Panel llevaba desde M3 dos huecos con su letrero puesto:
 *
 *   «Lo que hay que atender»  ·  «Los pendientes los traen Inventario (M6) y
 *                                 Servicio (M12)»
 *   «Salud de los datos»      ·  «Se llenará con M6 y M8»
 *
 * **M6 terminó y no los llenó.** La consulta que hace falta —`inventario_hoy`—
 * ya devuelve exactamente eso: lo que está por debajo del mínimo, lo que caduca
 * y lo que no tiene precio. Estaba escrita, probada y llamada desde la pantalla
 * de Inventario, y el Panel seguía diciendo «todavía no hay nada que medir»
 * teniéndolo todo delante.
 *
 * Es el mismo fallo que este proyecto lleva persiguiendo desde M4, en su versión
 * más cara: no es que falte código, es que **dos partes construidas no se
 * hablan**. Y el Panel es la primera pantalla que se ve cada mañana.
 *
 * ── Qué se enseña, y por qué ese orden ───────────────────────────────────────
 *
 * «Lo que hay que atender hoy, de un vistazo» (Manifiesto). Primero lo que
 * caduca, porque tiene fecha y no espera; después lo que se agota. Y **como
 * mucho tres de cada**: «nada de scroll infinito en el Panel». El resto se ve en
 * Inventario, que es donde se actúa.
 *
 * Los ejemplos no cuentan para nada de esto, y de eso se encarga el servidor.
 */
export function LoDeInventario() {
  const { cliente, permisos, yo } = usarSesion();
  const navegar = useNavigate();

  const loTiene = puedeVer(permisos, 'app.inventario');

  const consulta = useQuery({
    queryKey: ['inventario_hoy'],
    // Sin local no hay cámara que mirar, y sin la app tampoco: preguntarlo sería
    // llevarse un «esto no está en tu acceso» en la primera pantalla del día.
    enabled: loTiene && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<InventarioHoy> => {
      const respuesta = await cliente.consultar<InventarioHoy>('inventario_hoy', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (!loTiene) return null;

  const hoy = consulta.data;

  return (
    <>
      <Atender
        hoy={hoy}
        alIr={() => {
          navegar('/inventario/hoy');
        }}
      />
      <Salud
        hoy={hoy}
        alIr={() => {
          navegar('/inventario/productos');
        }}
      />
    </>
  );
}

// ── Lo que hay que atender ───────────────────────────────────────────────────

function Atender({
  hoy,
  alIr,
}: {
  readonly hoy: InventarioHoy | undefined;
  readonly alIr: () => void;
}) {
  const caducan = hoy?.caducan.slice(0, 3) ?? [];
  const atencion = hoy?.atencion.slice(0, 3) ?? [];
  const cuantos = (hoy?.caducan.length ?? 0) + (hoy?.atencion.length ?? 0);

  return (
    <Tarjeta
      titulo="Lo que hay que atender"
      {...(hoy === undefined ? {} : { origen: 'De tu inventario, ahora mismo' })}
      {...(cuantos > 0
        ? {
            accion: (
              <Boton tono="secundario" onClick={alIr}>
                Verlo en Inventario
              </Boton>
            ),
          }
        : {})}
    >
      {cuantos === 0 ? (
        <EstadoVacio
          compacto
          titulo="Nada pendiente"
          frase="Aquí aparecerán los productos que se agotan, lo que caduca, los recuentos sin cerrar y los APPCC fuera de rango."
          sinAccionPorque="Los recuentos y el APPCC los traen M8 y Servicio (M12)."
        />
      ) : (
        <Lista
          titulo="Pendientes de hoy"
          elementos={[
            ...caducan.map((c) => ({
              clave: `caduca-${c.productoId}-${c.caducaEl}`,
              titulo: (
                <span className="flex flex-wrap items-center gap-e2">
                  <span>{c.producto}</span>
                  <Etiqueta tono={c.dias <= 1 ? 'mal' : 'atencion'}>
                    {c.dias <= 0 ? 'caducado' : c.dias === 1 ? 'caduca mañana' : `${c.dias} días`}
                  </Etiqueta>
                </span>
              ),
              detalle:
                c.lote === null ? `Caduca el ${c.caducaEl}` : `Lote ${c.lote} · ${c.caducaEl}`,
              alPulsar: alIr,
            })),
            ...atencion.map((p) => ({
              clave: `falta-${p.id}`,
              titulo: (
                <span className="flex flex-wrap items-center gap-e2">
                  <span>{p.nombre}</span>
                  <Etiqueta tono={TONO_DEL_ESTADO[p.estado]}>
                    {NOMBRE_DEL_ESTADO[p.estado]}
                  </Etiqueta>
                </span>
              ),
              detalle: (() => {
                const agota = cuandoSeAgota(p.seAgotaEn, p.diasDeCobertura);
                const queda = conUnidadDeUso(p.cantidad, p.unidadDeUso);
                return agota === null ? `Quedan ${queda}` : `Quedan ${queda} · se agota ${agota}`;
              })(),
              alPulsar: alIr,
            })),
          ]}
          cuandoNoHay={<span />}
        />
      )}

      {cuantos > caducan.length + atencion.length && (
        <p className="mt-e2 text-secundario text-texto-suave">
          Y {cuantos - caducan.length - atencion.length} más en Inventario.
        </p>
      )}
    </Tarjeta>
  );
}

// ── Salud de los datos ───────────────────────────────────────────────────────

/**
 * «Cuántos platos tienen ficha, cuántos productos tienen precio y cuántas fichas
 *  están al día.»
 *
 * De las tres, M6 puede contestar una: **cuántos productos tienen precio**. Las
 * fichas técnicas son M9, y decirlo es mejor que enseñar un cero que parezca un
 * dato. Un producto sin precio no es un despiste menor: es un escandallo que
 * saldrá mal y un valor de cámara que no cuadra.
 */
function Salud({
  hoy,
  alIr,
}: {
  readonly hoy: InventarioHoy | undefined;
  readonly alIr: () => void;
}) {
  if (hoy === undefined || hoy.cuantosProductos === 0) {
    return (
      <Tarjeta titulo="Salud de los datos" origen="Se completa con Escandallos · M9">
        <EstadoVacio
          compacto
          icono={<IconoVacio size={24} />}
          titulo="Todavía no hay nada que medir"
          frase="Cuántos productos tienen precio, cuántos platos tienen ficha y cuántas fichas están al día."
          sinAccionPorque="Hace falta que haya productos: eso es Inventario."
        />
      </Tarjeta>
    );
  }

  const conPrecio = hoy.cuantosProductos - hoy.sinPrecio.length;

  return (
    <Tarjeta
      titulo="Salud de los datos"
      origen="Se completa con Escandallos · M9"
      {...(hoy.sinPrecio.length > 0
        ? {
            accion: (
              <Boton tono="secundario" onClick={alIr}>
                Ponerles precio
              </Boton>
            ),
          }
        : {})}
    >
      <Cifra
        etiqueta="Productos con precio"
        valor={conPrecio}
        formato={(v) => `${v} de ${hoy.cuantosProductos}`}
        origen={
          hoy.sinPrecio.length === 0
            ? 'Todos tienen precio'
            : `Faltan ${hoy.sinPrecio.length}: ${hoy.sinPrecio
                .slice(0, 3)
                .map((p) => p.nombre)
                .join(', ')}${hoy.sinPrecio.length > 3 ? '…' : ''}`
        }
      />

      <p className="mt-e2 text-secundario text-texto-suave">
        Un producto sin precio no cuenta para el valor de la cámara, y hará que su escandallo salga
        mal el día que exista. Lo de las fichas técnicas llega con Escandallos.
      </p>
    </Tarjeta>
  );
}
