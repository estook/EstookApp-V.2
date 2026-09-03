import { useQuery } from '@tanstack/react-query';
import { NOMBRE_DEL_ESTADO } from '@estook/dominio';
import { Aviso, Boton, Cargando, Cifra, EstadoVacio, Etiqueta, Tarjeta } from '@estook/ui';
import { IconoAtencion, IconoReloj, IconoVacio } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  TONO_DEL_ESTADO,
  comoDinero,
  conUnidadDeUso,
  cuandoSeAgota,
  type InventarioHoy,
  type ProductoEnLista,
} from './contrato.ts';

/**
 * Inventario · Hoy (M6).
 *
 * «La pantalla de inicio de la app: **lo que hay que atender ahora**. Bajo mínimo
 *  **con su previsión de agotamiento**, caducidades de esta semana, pedidos por
 *  recibir, precios que han subido, productos sin precio y recuento pendiente.
 *  **Cada línea con su botón**» (Manifiesto 12).
 *
 * De esa lista, M6 puede dar cuatro: bajo mínimo con previsión, caducidades,
 * productos sin precio y el valor de la cámara. Los pedidos por recibir son M7 y
 * el recuento es M8, y se dice cuál falta y dónde llega en vez de dejar el hueco
 * en blanco.
 *
 * ── La regla que ordena esta pantalla ────────────────────────────────────────
 *
 * «Una alerta que no se puede accionar no es una alerta, es ruido» (Evolución
 * 1.0, capítulo 9). Cada línea de aquí lleva las cuatro cosas: qué ocurre, por
 * qué, qué impacto tiene y un botón. Y **los datos de ejemplo no salen**: «no
 * cuenta para nada: ni avisos, ni análisis» (Manifiesto 8). Eso lo filtra el
 * servidor, no esta pantalla.
 */
export function Hoy({ alAbrirProducto }: { readonly alAbrirProducto: (id: string) => void }) {
  const { cliente } = usarSesion();

  const consulta = useQuery({
    queryKey: ['inventario_hoy'],
    queryFn: async (): Promise<InventarioHoy> => {
      const respuesta = await cliente.consultar<InventarioHoy>('inventario_hoy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  if (consulta.isPending) {
    return (
      <div className="py-e6">
        <Cargando que="lo que hay que atender" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <Aviso tono="mal" titulo="No he podido leer tu inventario">
        Vuelve a intentarlo dentro de un momento. Si sigue igual, avísanos.
      </Aviso>
    );
  }

  const hoy = consulta.data;
  const nadaQueAtender =
    hoy.atencion.length === 0 && hoy.caducan.length === 0 && hoy.sinPrecio.length === 0;

  return (
    <div className="grid gap-e3 md:grid-cols-2 xl:grid-cols-3">
      {hoy.cuantosProductos === 0 ? (
        <Tarjeta titulo="Todavía no tienes género">
          <EstadoVacio
            compacto
            icono={<IconoVacio size={24} />}
            titulo="La cámara está vacía"
            frase="En cuanto des de alta tu primer producto, aquí verás lo que se está acabando, lo que caduca y lo que te está costando."
            sinAccionPorque="Se empieza por «Productos», que es la pestaña de al lado."
          />
        </Tarjeta>
      ) : (
        <>
          {/*
            La zona de atención va primero y no se puede quitar (Evolución 1.0,
            capítulo 5): terminar de mirar lo que falta va antes que cualquier
            cifra bonita.
          */}
          <Tarjeta
            titulo={
              nadaQueAtender
                ? 'Nada que atender'
                : `${cuantasCosas(hoy)} ${cuantasCosas(hoy) === 1 ? 'cosa necesita' : 'cosas necesitan'} tu atención`
            }
            origen={`Sobre ${hoy.cuantosProductos} ${hoy.cuantosProductos === 1 ? 'producto' : 'productos'} · ahora mismo`}
          >
            {nadaQueAtender ? (
              <EstadoVacio
                compacto
                titulo="Todo en su sitio"
                frase="Ningún producto está por debajo de su mínimo, no caduca nada esta semana y todos tienen precio."
                sinAccionPorque="Cuando algo se salga, aparecerá aquí solo."
              />
            ) : (
              <ul className="flex flex-col gap-e3">
                {hoy.atencion.slice(0, 8).map((producto) => (
                  <li key={producto.id}>
                    <LineaDeAtencion
                      producto={producto}
                      alAbrir={() => {
                        alAbrirProducto(producto.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          {hoy.caducan.length > 0 && (
            <Tarjeta titulo="Caduca esta semana" origen="Lotes con fecha · próximos 7 días">
              <ul className="flex flex-col gap-e2">
                {hoy.caducan.map((lote) => (
                  <li key={`${lote.productoId}-${lote.caducaEl}`}>
                    <button
                      type="button"
                      onClick={() => {
                        alAbrirProducto(lote.productoId);
                      }}
                      className="flex w-full min-h-toque items-center gap-e3 rounded-medio px-e2 text-left hover:bg-fondo"
                    >
                      <span className={lote.dias < 0 ? 'text-mal' : 'text-atencion'}>
                        <IconoReloj size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-cuerpo">{lote.producto}</span>
                        <span className="block text-secundario text-texto-suave">
                          {cuandoCaduca(lote.dias)}
                          {lote.lote === null ? '' : ` · lote ${lote.lote}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {hoy.puedeVerPrecios && (
            <Tarjeta
              titulo="Lo que hay en cámara"
              origen="A precio medio ponderado · sin contar los ejemplos"
            >
              <Cifra
                etiqueta="Valor del género"
                valor={hoy.valorTotalCentimos ?? 0}
                formato={(v) => comoDinero(v)}
                origen="Suma de lo que costó lo que hay"
              />
              <p className="mt-e2 text-secundario text-texto-suave">
                Se valora a precio medio ponderado, que es lo que de verdad costó llenar la cámara,
                y no al último precio de la lista.
              </p>
            </Tarjeta>
          )}

          {hoy.sinPrecio.length > 0 && (
            <Tarjeta titulo="Sin precio todavía" origen="Cuentan cero hasta que se les ponga uno">
              <p className="text-cuerpo text-texto-suave">
                Estos {hoy.sinPrecio.length === 1 ? 'no tiene precio' : 'no tienen precio'}, así que
                cuentan cero en el valor de la cámara y saldrán marcados en las fichas que los
                lleven. No bloquean nada.
              </p>
              <ul className="mt-e3 flex flex-col gap-e1">
                {hoy.sinPrecio.slice(0, 10).map((producto) => (
                  <li key={producto.id}>
                    <button
                      type="button"
                      onClick={() => {
                        alAbrirProducto(producto.id);
                      }}
                      className="flex w-full min-h-toque items-center rounded-medio px-e2 text-left text-cuerpo hover:bg-fondo"
                    >
                      {producto.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </>
      )}

      {/*
        Lo que esta pantalla todavía no puede dar, dicho por su nombre. Es más
        honesto y más útil que dejar el hueco: quien la abre sabe que no está
        rota, sabe qué falta y sabe cuándo llega.
      */}
      <Tarjeta titulo="Y lo que falta por venir" origen="Pedidos, recuento y mermas">
        <ul className="flex flex-col gap-e2 text-secundario text-texto-suave">
          <li>
            <strong className="text-texto">Pedidos por recibir</strong> · con la sugerencia que
            respeta los días de reparto de cada proveedor. Llega con Proveedores y compras.
          </li>
          <li>
            <strong className="text-texto">Recuento y desviación</strong> · lo que dice el papel
            contra lo que dice Estook, con su causa probable. Llega con Recuentos y mermas.
          </li>
        </ul>
      </Tarjeta>
    </div>
  );
}

function cuantasCosas(hoy: InventarioHoy): number {
  return hoy.atencion.length + hoy.caducan.length;
}

function cuandoCaduca(dias: number): string {
  if (dias < 0) return `Caducó hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Caduca hoy';
  if (dias === 1) return 'Caduca mañana';
  return `Caduca en ${dias} días`;
}

/**
 * Una línea de atención, con las cuatro cosas que exige el centro de alertas.
 *
 * Qué ocurre («Pollo · por debajo del mínimo»), por qué («quedan 4,2 kg y el
 * mínimo son 8»), qué impacto tiene («se agota mañana a las 18:24») y un botón
 * («Ver la ficha»). Sin las cuatro es ruido.
 */
function LineaDeAtencion({
  producto,
  alAbrir,
}: {
  readonly producto: ProductoEnLista;
  readonly alAbrir: () => void;
}) {
  const agota = cuandoSeAgota(producto.seAgotaEn, producto.diasDeCobertura);

  return (
    <div className="flex flex-col gap-e2 rounded-medio border border-borde p-e3">
      <div className="flex flex-wrap items-center gap-e2">
        <span className={producto.estado === 'negativo' ? 'text-mal' : 'text-atencion'}>
          <IconoAtencion size={18} />
        </span>
        <span className="text-cuerpo font-medium">{producto.nombre}</span>
        <Etiqueta tono={TONO_DEL_ESTADO[producto.estado]}>
          {NOMBRE_DEL_ESTADO[producto.estado]}
        </Etiqueta>
      </div>

      <p className="text-secundario text-texto-suave">
        Quedan {conUnidadDeUso(producto.cantidad, producto.unidadDeUso)}
        {producto.minimo === null
          ? ''
          : `, y el mínimo son ${conUnidadDeUso(producto.minimo, producto.unidadDeUso)}`}
        .
        {agota === null
          ? ` ${producto.consumo.porque ?? 'Todavía no sé a qué ritmo se gasta.'}`
          : ` Al ritmo de estos ${producto.consumo.diasMirados} días, se agota ${agota}.`}
      </p>

      {producto.sugerencia !== null && (
        <p className="text-secundario">
          <strong>Pide {conUnidadDeUso(producto.sugerencia.cuanto, producto.unidadDeUso)}.</strong>{' '}
          <span className="text-texto-suave">{producto.sugerencia.motivo}</span>
        </p>
      )}

      <div>
        <Boton tono="secundario" onClick={alAbrir}>
          Ver la ficha
        </Boton>
      </div>
    </div>
  );
}
