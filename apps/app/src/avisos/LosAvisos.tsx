import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconoAjustes,
  IconoAlmacen,
  IconoAtencion,
  IconoBorrar,
  IconoCalendario,
  IconoCarta,
  IconoChat,
  IconoDinero,
  IconoDocumento,
  IconoReparto,
  IconoReloj,
  IconoTablon,
  type Icono,
} from '@estook/iconos';
import { cuandoFue, tramoDelAviso, type TipoDeAviso, type TramoDeAvisos } from '@estook/dominio';
import { Aviso, Boton, Cargando, EstadoVacio, Hoja, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLeerAvisos, usarMisAvisos, type UnAviso } from '../ganchos/usarLosAvisos.ts';

/**
 * La campana, abierta (entrega R · decisión 0052).
 *
 * Como la de cualquier app de ahora: lo último arriba, agrupado por cuándo pasó,
 * lo que no has visto en negrita y con su punto, y **tocar uno lleva a donde se
 * resuelve** (0017, regla 4) y lo da por visto. Arriba, «Marcar todo como leído»;
 * abajo, a Ajustes → Avisos, para elegir qué te llega.
 *
 * Si el aviso es de otro de tus locales, primero te lleva a ese local: el pedido
 * de Bar Puerto no se abre estando en Bar Playa.
 */
const ICONO_DEL_AVISO: Readonly<Record<TipoDeAviso, Icono>> = {
  'pedido.empezado': IconoAlmacen,
  'pedido.mandado': IconoAlmacen,
  'pedido.invitacion': IconoAlmacen,
  'pedido.listo': IconoAlmacen,
  'albaran.incidencias': IconoAtencion,
  'merma.grande': IconoBorrar,
  'precio.subida': IconoDinero,
  'carta.publicada': IconoCarta,
  'tablon.nota': IconoTablon,
  // R2 (0053)
  'pedido.toca': IconoReparto,
  'almacen.bajo_minimo': IconoAtencion,
  'informe.dia': IconoDocumento,
  'informe.semana': IconoDocumento,
  'informe.mes': IconoDocumento,
  'google.nota': IconoCarta,
  // H1 (0068)
  'fichaje.corregido': IconoReloj,
  // H2 (0069)
  'horario.publicado': IconoCalendario,
  'horario.cambiado': IconoCalendario,
  // I (0070)
  'turno.entras': IconoReloj,
  'lote.caduca': IconoAtencion,
  'pedido.no_llega': IconoReparto,
  'fichaje.sin_apuntar': IconoReloj,
  // C2 (0075)
  'chat.confirmar': IconoChat,
  // M8 (0078)
  'inventario.toca': IconoAlmacen,
  'inventario.contado': IconoAlmacen,
  'inventario.recontar': IconoAlmacen,
};

const TRAMOS: readonly TramoDeAvisos[] = ['Hoy', 'Ayer', 'Esta semana', 'Antes'];

export function LosAvisos({
  abierta,
  alCerrar,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
}) {
  const navegar = useNavigate();
  const { yo, cambiarDeSitio } = usarSesion();
  const consulta = usarMisAvisos(abierta);
  const leer = usarLeerAvisos();

  const datos = consulta.data;
  const variosLocales = (yo?.locales.length ?? 0) > 1;
  const porTramo = useMemo(() => {
    const grupos = new Map<TramoDeAvisos, UnAviso[]>();
    for (const aviso of datos?.avisos ?? []) {
      const tramo = tramoDelAviso(aviso.dia, datos?.hoy ?? aviso.dia);
      grupos.set(tramo, [...(grupos.get(tramo) ?? []), aviso]);
    }
    return TRAMOS.filter((t) => grupos.has(t)).map((t) => [t, grupos.get(t) ?? []] as const);
  }, [datos]);

  async function abrir(aviso: UnAviso) {
    if (!aviso.leido) void leer([aviso.id]);
    alCerrar();
    const localDeAhora = yo?.local?.id ?? null;
    if (aviso.localId !== null && aviso.localId !== localDeAhora) {
      const esMio = yo?.locales.some((l) => l.id === aviso.localId) === true;
      if (esMio && !(await cambiarDeSitio({ local: aviso.localId }))) return;
    }
    navegar(aviso.ir ?? '/');
  }

  const sinLeer = datos?.sinLeer ?? 0;
  const ahora = new Date(Date.now());

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Avisos"
      pie={
        <Boton
          tono="texto"
          icono={<IconoAjustes size={18} />}
          onClick={() => {
            alCerrar();
            navegar('/ajustes/avisos');
          }}
        >
          Elegir qué me llega
        </Boton>
      }
    >
      {consulta.isLoading && <Cargando que="tus avisos" lineas={3} />}
      {consulta.isError && (
        <Aviso
          tono="mal"
          titulo="No han llegado tus avisos"
          esNoticia
          accion={
            <Boton
              tono="secundario"
              onClick={() => {
                void consulta.refetch();
              }}
            >
              Reintentar
            </Boton>
          }
        >
          Mira la conexión y vuelve a probar.
        </Aviso>
      )}

      {datos !== undefined && datos.avisos.length === 0 && (
        <EstadoVacio
          compacto
          dibujo="todo-en-orden"
          titulo="Todo al día"
          frase="Aquí llega lo que pasa y tienes que saber: un pedido empezado, una subida de precio, una nota del Tablón."
          sinAccionPorque="Lo que hay que hacer hoy sigue en «Hoy», en el Panel."
        />
      )}

      {datos !== undefined && datos.avisos.length > 0 && (
        <div className="flex flex-col gap-e4">
          <div className="flex min-h-toque items-center justify-between gap-e3">
            <p className="text-secundario text-texto-suave" aria-live="polite">
              {sinLeer === 0 ? 'Todo visto' : `${String(sinLeer)} sin leer`}
            </p>
            {sinLeer > 0 && (
              <Boton
                tono="texto"
                onClick={() => {
                  void leer();
                }}
              >
                Marcar todo como leído
              </Boton>
            )}
          </div>

          {porTramo.map(([tramo, avisos]) => (
            <section key={tramo} aria-label={tramo} className="flex flex-col gap-e1">
              <h3 className="text-secundario font-semibold text-texto-suave">{tramo}</h3>
              <ul className="-mx-e2 flex flex-col">
                {avisos.map((aviso) => {
                  const IconoDelAviso = ICONO_DEL_AVISO[aviso.tipo];
                  return (
                    <li key={aviso.id}>
                      <button
                        type="button"
                        onClick={() => {
                          void abrir(aviso);
                        }}
                        className="flex w-full items-start gap-e3 rounded-grande px-e2 py-e3 text-left transition-colors hover:bg-fondo"
                      >
                        <span
                          aria-hidden
                          className={clases(
                            'grid size-[40px] shrink-0 place-items-center rounded-redondo',
                            aviso.leido
                              ? 'bg-fondo text-texto-suave'
                              : 'bg-naranja-suave text-texto',
                          )}
                        >
                          <IconoDelAviso size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={clases('block text-cuerpo', !aviso.leido && 'font-semibold')}
                          >
                            {aviso.titulo}
                          </span>
                          {aviso.detalle !== null && (
                            <span className="mt-e1 line-clamp-2 block text-secundario text-texto-suave">
                              {aviso.detalle}
                            </span>
                          )}
                          <span className="mt-e1 block text-etiqueta text-texto-suave">
                            {cuandoFue(new Date(aviso.cuando), ahora)}
                            {variosLocales && aviso.local !== null ? ` · ${aviso.local}` : ''}
                          </span>
                        </span>
                        {!aviso.leido && (
                          <span
                            role="img"
                            aria-label="Sin leer"
                            className="mt-e2 size-[10px] shrink-0 rounded-redondo bg-naranja"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Hoja>
  );
}
