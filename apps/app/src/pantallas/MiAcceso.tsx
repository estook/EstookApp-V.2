import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fechaCorta, type FechaOperativa } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Cargando,
  ErrorEnCristiano,
  Etiqueta,
  Hoja,
  Lista,
  Tarjeta,
  TodaviaNo,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { ActivarDobleFactor, CambiarMiClave } from './HojasDeMiAcceso.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * «Mi acceso» · contrasena, PIN, doble factor y mis dispositivos (M4).
 *
 * «Ajustes → **Mi acceso** (contrasena, PIN, doble factor, mis dispositivos)»
 * (Manifiesto 23). Las cuatro cosas, en una pantalla, porque las cuatro son la
 * misma pregunta: ¿como entro yo, y quien mas esta dentro con mi cuenta?
 *
 * ── Los secretos se ensenan una vez y se dice que una vez ────────────────────
 *
 * El PIN nuevo y los codigos de respaldo salen **en pantalla, una sola vez**, y la
 * pantalla lo dice antes de ensenarlos. No es una limitacion tecnica que haya que
 * disculpar: es que lo guardado es su huella, y si se pudieran volver a consultar
 * no protegerian nada. Decirlo evita la llamada de «¿donde vuelvo a ver mi PIN?».
 */
interface DatosDeMiAcceso {
  readonly contrasena: {
    readonly puesta: boolean;
    readonly cambiadaEn: string | null;
    readonly laPusoOtraPersona: boolean;
  };
  readonly pines: readonly {
    readonly localId: string;
    readonly local: string;
    readonly creadoEn: string;
    readonly bloqueadoHasta: string | null;
  }[];
  readonly dobleFactor: {
    readonly activo: boolean;
    readonly empezadoSinTerminar: boolean;
    readonly codigosDeRespaldoQueQuedan: number;
    readonly loExigeLaOrganizacion: boolean;
  };
  readonly sesiones: readonly {
    readonly id: string;
    readonly esLaDeAhora: boolean;
    readonly entroCon: string;
    readonly creadaEn: string;
    readonly ultimaActividadEn: string;
    readonly local: string | null;
  }[];
}

/**
 * El día de un instante, sin leer el reloj del navegador.
 *
 * **Regla 10**: la fecha la decide el servidor. Aquí solo se corta el día del
 * instante que ya viene del servidor y se pinta. Nada de «hace tres días»: para
 * calcular eso haría falta un `new Date()` en el navegador, y ese reloj puede
 * estar mal puesto.
 */
function elDia(instante: string): string {
  if (instante === '') return 'una fecha que no ha llegado';
  return fechaCorta(instante.slice(0, 10) as FechaOperativa);
}

export function MiAcceso() {
  const { cliente, yo, refrescar } = usarSesion();

  const consulta = useQuery({
    queryKey: ['mi_acceso'],
    queryFn: async (): Promise<DatosDeMiAcceso> => {
      const respuesta = await cliente.consultar<DatosDeMiAcceso>('mi_acceso');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const [verTodasLasSesiones, setVerTodasLasSesiones] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [activandoDoble, setActivandoDoble] = useState(false);
  /** El PIN recien generado. Se ensena hasta que se cierra, y no vuelve. */
  const [pinReciente, setPinReciente] = useState<{ local: string; pin: string } | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function volverAPreguntar() {
    await consulta.refetch();
    await refrescar();
  }

  async function pinNuevoPara(localId: string, local: string) {
    setError(null);
    const respuesta = await cliente.ejecutar<{ pin: string }>('regenerar_pin', {
      persona_id: yo?.personaId ?? '',
      local_id: localId,
    });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setPinReciente({ local, pin: respuesta.datos.pin });
    await volverAPreguntar();
  }

  async function cerrarLasDemas() {
    setError(null);
    const respuesta = await cliente.ejecutar('cerrar_sesion', { todas_las_demas: true });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await volverAPreguntar();
  }

  if (consulta.isLoading) {
    return (
      <Tarjeta titulo="Mi acceso">
        <Cargando que="tu acceso" />
      </Tarjeta>
    );
  }

  const datos = consulta.data;
  if (!datos) {
    return (
      <Tarjeta titulo="Mi acceso">
        <TodaviaNo
          que="Mi acceso"
          queHabra="Tu contraseña, tu PIN, el doble factor y tus dispositivos."
          modulo="M4, en cuanto la API esté desplegada"
        />
      </Tarjeta>
    );
  }

  return (
    <>
      <Tarjeta titulo="Mi acceso" origen="Tu contraseña, tu PIN y desde dónde has entrado">
        {error && (
          <div className="mb-e3">
            <ErrorEnCristiano error={error} />
          </div>
        )}

        <div className="flex flex-col gap-e4">
          {/* ── La contraseña ─────────────────────────────────────────────── */}
          <Bloque titulo="Contraseña">
            {datos.contrasena.laPusoOtraPersona ? (
              <Aviso tono="atencion" titulo="La que tienes te la dio otra persona">
                Ponte una tuya: mientras no lo hagas, la sabe alguien más.
              </Aviso>
            ) : (
              <p className="text-secundario text-texto-suave">
                {datos.contrasena.puesta
                  ? `Cambiada el ${elDia(datos.contrasena.cambiadaEn ?? '')}.`
                  : 'Todavía no tienes ninguna: entras con tu PIN. Puedes ponerte una cuando quieras.'}
              </p>
            )}
            <div className="mt-e2">
              <Boton
                onClick={() => {
                  setCambiandoClave(true);
                }}
              >
                {datos.contrasena.puesta ? 'Cambiar mi contraseña' : 'Ponerme una contraseña'}
              </Boton>
            </div>
          </Bloque>

          {/* ── El PIN, por local ─────────────────────────────────────────── */}
          <Bloque titulo="Mi PIN">
            <p className="text-secundario text-texto-suave">
              Es <strong>de cada local</strong> y no se repite dentro de él. Sirve para entrar
              rápido y para fichar; lo que tiene consecuencia queda con tu nombre y hora igualmente.
            </p>
            <div className="mt-e2">
              <Lista
                titulo="Mis PIN"
                elementos={datos.pines.map((pin) => ({
                  clave: pin.localId,
                  titulo: pin.local,
                  detalle:
                    pin.bloqueadoHasta !== null
                      ? 'Bloqueado un rato por fallar cinco veces'
                      : `Desde el ${elDia(pin.creadoEn)}`,
                  derecha: (
                    <Boton
                      onClick={() => {
                        void pinNuevoPara(pin.localId, pin.local);
                      }}
                    >
                      Uno nuevo
                    </Boton>
                  ),
                }))}
                cuandoNoHay={
                  <p className="text-secundario text-texto-suave">
                    Todavía no tienes PIN en ningún local. Te lo da quien lleva el local, en mano.
                  </p>
                }
              />
            </div>
          </Bloque>

          {/* ── El doble factor ───────────────────────────────────────────── */}
          <Bloque titulo="Doble factor">
            {datos.dobleFactor.activo ? (
              <>
                <p className="flex items-center gap-e2 text-secundario text-texto-suave">
                  <Etiqueta tono="bien">Activado</Etiqueta>
                  Te quedan {datos.dobleFactor.codigosDeRespaldoQueQuedan} códigos de respaldo.
                </p>
                {datos.dobleFactor.loExigeLaOrganizacion && (
                  <p className="mt-e2 text-secundario text-texto-suave">
                    Tu negocio lo exige, así que no se puede quitar.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-secundario text-texto-suave">
                  Un código de seis dígitos que cambia cada treinta segundos, desde una aplicación
                  de autenticación. Funciona sin cobertura y no cuesta nada.
                </p>
                {datos.dobleFactor.loExigeLaOrganizacion && (
                  <div className="mt-e2">
                    <Aviso tono="atencion" titulo="Tu negocio lo exige">
                      Actívalo cuando puedas: es la forma de que nadie entre con tu cuenta aunque
                      sepa tu contraseña.
                    </Aviso>
                  </div>
                )}
                <div className="mt-e2">
                  <Boton
                    tono={datos.dobleFactor.loExigeLaOrganizacion ? 'principal' : 'secundario'}
                    onClick={() => {
                      setActivandoDoble(true);
                    }}
                  >
                    {datos.dobleFactor.empezadoSinTerminar ? 'Terminar de activarlo' : 'Activarlo'}
                  </Boton>
                </div>
              </>
            )}
          </Bloque>

          {/* ── Mis dispositivos ──────────────────────────────────────────── */}
          {/*
            La lista va **acortada a proposito**. Una sesion dura treinta dias y
            cada entrada abre una nueva, asi que quien entra a diario acumula
            decenas: veintitres filas identicas que dicen «Bar Centro» no
            informan de nada y ademas empujan fuera de la pantalla lo unico que
            de verdad sirve, que es el boton de cerrarlas.

            Se ensenan las cinco mas recientes, que es donde estaria una sesion
            que no reconoces, y se dice cuantas hay. El resto se puede ver, pero
            hay que pedirlo.
          */}
          <Bloque titulo="Dónde tienes la sesión abierta">
            <Lista
              titulo="Mis sesiones"
              elementos={(verTodasLasSesiones ? datos.sesiones : datos.sesiones.slice(0, 5)).map(
                (sesion) => ({
                  clave: sesion.id,
                  titulo: (
                    <>
                      {sesion.local ?? 'Sin local elegido'}
                      {sesion.esLaDeAhora && (
                        <span className="ml-e2">
                          <Etiqueta tono="info">Esta</Etiqueta>
                        </span>
                      )}
                    </>
                  ),
                  detalle: `Entró con ${
                    sesion.entroCon === 'pin' ? 'PIN' : 'contraseña'
                  } · última vez el ${elDia(sesion.ultimaActividadEn)}`,
                }),
              )}
              cuandoNoHay={<p className="text-secundario text-texto-suave">Solo esta.</p>}
            />

            {!verTodasLasSesiones && datos.sesiones.length > 5 && (
              <button
                type="button"
                className="mt-e2 min-h-toque text-secundario text-texto-suave underline"
                onClick={() => {
                  setVerTodasLasSesiones(true);
                }}
              >
                Ver las {datos.sesiones.length} sesiones
              </button>
            )}

            {datos.sesiones.length > 1 && (
              <div className="mt-e3">
                <Boton
                  tono="peligro"
                  onClick={() => {
                    void cerrarLasDemas();
                  }}
                >
                  Cerrar las demás
                </Boton>
                <p className="mt-e1 text-secundario text-texto-suave">
                  Si has perdido el móvil, esto lo deja fuera al instante. La de aquí no se cierra.
                </p>
              </div>
            )}
          </Bloque>
        </div>
      </Tarjeta>

      {cambiandoClave && (
        <CambiarMiClave
          yaTiene={datos.contrasena.puesta}
          alCerrar={() => {
            setCambiandoClave(false);
          }}
          alHecho={() => {
            setCambiandoClave(false);
            void volverAPreguntar();
          }}
        />
      )}

      {activandoDoble && (
        <ActivarDobleFactor
          alCerrar={() => {
            setActivandoDoble(false);
          }}
          alHecho={() => {
            setActivandoDoble(false);
            void volverAPreguntar();
          }}
        />
      )}

      {pinReciente && (
        <Hoja
          abierta
          titulo="Tu PIN nuevo"
          alCerrar={() => {
            setPinReciente(null);
          }}
        >
          <p className="text-secundario text-texto-suave">
            En {pinReciente.local}. <strong>Se enseña una sola vez</strong>: lo que se guarda no
            permite volver a leerlo. Si se te olvida, se genera otro.
          </p>
          <p className="my-e4 text-center font-mono text-[2.5rem] tracking-[0.2em] text-texto">
            {pinReciente.pin}
          </p>
          <Boton
            tono="principal"
            ancho
            onClick={() => {
              setPinReciente(null);
            }}
          >
            Ya lo tengo apuntado
          </Boton>
        </Hoja>
      )}
    </>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-borde pt-e3 first:border-0 first:pt-0">
      <h3 className="mb-e2 text-seccion font-medium text-texto">{titulo}</h3>
      {children}
    </section>
  );
}
