import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
// El mismo generador que usa `bd:cuenta-de-verdad`: una lista de palabras
// copiada es una lista que se desincroniza (regla 6).
import { claveDeUnSoloUso } from '@estook/dominio';
import {
  Aviso,
  Avatar,
  Boton,
  Botones,
  Cargando,
  EstadoVacio,
  Etiqueta,
  ErrorEnCristiano,
  Hoja,
  Tabla,
  Tarjeta,
  TodaviaNo,
  type Columna,
} from '@estook/ui';
import { IconoFlechaAbajo } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Invitar } from './Invitar.tsx';
import { usarQueHacer } from '../ganchos/usarQueHacer.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FichaDePersona } from '../equipo/FichaDePersona.tsx';
import { usarPersonaAbierta } from '../ganchos/usarPersonaAbierta.ts';
import { ultimaVez } from '../equipo/contrato.ts';

/**
 * Equipo · Personas (M4, rehecha en M6½).
 *
 * ── Lo que cambia ───────────────────────────────────────────────────────────
 *
 *   · **«Dentro» ya no existe.** Decía «dentro» a quien entró una vez hace tres
 *     meses, y se leía como «está trabajando». Ahora dice **en línea** si tiene la
 *     aplicación abierta, y si no, **cuándo se le vio por última vez**. Quien fue
 *     invitado y no ha entrado sigue marcado: «nunca ha entrado».
 *   · **Los botones de acceso van en un desplegable.** «PIN nuevo», «Contraseña
 *     nueva» y «Retirar» ocupaban tres botones por fila, que en un móvil son tres
 *     líneas por persona. Son cosas que se hacen una vez al año: un botón,
 *     «Acceso», y dentro las tres.
 *   · **Retirar pregunta antes.** Deja a alguien sin poder entrar al momento, así
 *     que no puede estar a un toque sin confirmar.
 *   · **Pulsar a una persona abre su ficha**: sus horas, su horario, sus fichajes
 *     y —a quien pueda verlo— lo que cobra.
 *
 * ── Los tres estados, que siguen siendo los de siempre ──────────────────────
 *
 *   dentro         tiene acceso y ha entrado alguna vez
 *   sin_estrenar   se le invitó y no ha entrado. **Su PIN sigue valiendo**
 *   fuera          se le retiró el acceso. Sigue en el histórico, y se reactiva
 *
 * Lo que cambia es **cómo se dice**, no qué son.
 */
interface Acceso {
  readonly personaId: string;
  readonly membresiaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly correo?: string;
  readonly rol: string;
  readonly rolNombre: string;
  readonly alcance: string;
  readonly estado: 'dentro' | 'sin_estrenar' | 'fuera';
  readonly desde: string;
  readonly hasta: string | null;
  readonly tienePin: boolean;
  readonly ultimoAccesoEn: string | null;
  readonly enLinea: boolean;
  /** Si está por debajo de quien mira: a un igual no se le toca el acceso (M7, repaso). */
  readonly puedoGestionar: boolean;
}

/** Cómo está alguien, en palabras y con su color. Nunca solo color (B8). */
function comoEsta(acceso: Acceso): { texto: string; tono: 'bien' | 'atencion' | 'neutro' } {
  if (acceso.estado === 'fuera') return { texto: 'Acceso retirado', tono: 'neutro' };
  if (acceso.estado === 'sin_estrenar') return { texto: 'Nunca ha entrado', tono: 'atencion' };
  if (acceso.enLinea) return { texto: 'En línea', tono: 'bien' };
  return { texto: ultimaVez(acceso.ultimoAccesoEn), tono: 'neutro' };
}

/**
 * Qué estados enseña cada vista.
 *
 * «Con acceso» lleva los dos primeros y no solo el primero: **quien fue invitado y
 * no ha entrado tiene acceso** —su PIN vale—, y dejarlo fuera hacía que alguien
 * desapareciera de la lista justo después de invitarlo.
 */
const ESTADOS_DE_LA_VISTA: Readonly<Record<string, readonly Acceso['estado'][]>> = {
  'con-acceso': ['dentro', 'sin_estrenar'],
  'sin-entrar-todavia': ['sin_estrenar'],
  retirados: ['fuera'],
};

export function QuienTieneAcceso({ vista }: { readonly vista: string }) {
  const { cliente, yo, permisos } = usarSesion();
  const localId = yo?.local?.id ?? '';
  const persona = usarPersonaAbierta();

  const consulta = useQuery({
    queryKey: ['quien_tiene_acceso', localId],
    enabled: localId !== '',
    queryFn: async (): Promise<Acceso[]> => {
      const respuesta = await cliente.consultar<Acceso[]>('quien_tiene_acceso', {
        local_id: localId,
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const [invitando, setInvitando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  /** De quién se está tocando el acceso: la hoja del desplegable. */
  const [gestionando, setGestionando] = useState<Acceso | null>(null);
  const [claveReciente, setClaveReciente] = useState<{ nombre: string; clave: string } | null>(
    null,
  );
  const [recienInvitada, setRecienInvitada] = useState<{
    nombre: string;
    pin: string | null;
    yaExistia: boolean;
  } | null>(null);

  // «Esconder un boton no protege nada» (principio 7): esto no es la protección,
  // que la ponen las políticas de M1. Es para no enseñar un botón que va a decir
  // que no.
  const puedeInvitar = puedeEditar(permisos, 'accion.invitar_personas');

  usarQueHacer('invitar', () => {
    if (puedeInvitar) setInvitando(true);
  });

  async function retirar(acceso: Acceso) {
    setError(null);
    const respuesta = await cliente.ejecutar('retirar_acceso', {
      persona_id: acceso.personaId,
      membresia_id: acceso.membresiaId,
    });
    setGestionando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await consulta.refetch();
  }

  async function pinNuevo(acceso: Acceso) {
    setError(null);
    const respuesta = await cliente.ejecutar<{ pin: string }>('regenerar_pin', {
      persona_id: acceso.personaId,
      local_id: localId,
    });
    setGestionando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setRecienInvitada({ nombre: acceso.nombre, pin: respuesta.datos.pin, yaExistia: false });
    await consulta.refetch();
  }

  /**
   * Darle una contraseña nueva a alguien.
   *
   * Sin proveedor de correo, **esta es la forma de volver a entrar**: no hay «he
   * olvidado mi contraseña» que mande un enlace. Se genera aquí, se enseña una vez
   * y nace con «hay que cambiarla», así que muere en cuanto la persona entra.
   */
  async function claveNueva(acceso: Acceso) {
    setError(null);
    const clave = claveDeUnSoloUso();
    const respuesta = await cliente.ejecutar('poner_clave_a', {
      persona_id: acceso.personaId,
      organizacion_id: yo?.organizacion?.id ?? '',
      nueva: clave,
    });
    setGestionando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setClaveReciente({ nombre: acceso.nombre, clave });
    await consulta.refetch();
  }

  async function reactivar(acceso: Acceso) {
    setError(null);
    const respuesta = await cliente.ejecutar<{ pin: string | null }>('reactivar_persona', {
      persona_id: acceso.personaId,
      organizacion_id: yo?.organizacion?.id ?? '',
      rol: acceso.rol,
      ...(acceso.alcance === 'local' ? { local_id: localId } : {}),
    });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setRecienInvitada({ nombre: acceso.nombre, pin: respuesta.datos.pin, yaExistia: true });
    await consulta.refetch();
  }

  if (localId === '') {
    return (
      <TodaviaNo
        que="Los accesos"
        queHabra="Quién puede entrar en este local, con qué rol y desde cuándo."
        modulo="M4. Antes hay que estar dentro de un local"
      />
    );
  }

  if (consulta.isLoading) return <Cargando que="quién tiene acceso" />;

  const accesos = consulta.data ?? [];

  const columnas: readonly Columna<Acceso>[] = [
    {
      clave: 'nombre',
      titulo: 'Persona',
      principal: true,
      celda: (a: Acceso) => {
        const nombre = `${a.nombre} ${a.apellidos ?? ''}`.trim();
        return (
          <span className="flex min-w-0 items-center gap-e2">
            <Avatar nombre={nombre} tamano={28} />
            <span className="truncate">{nombre}</span>
          </span>
        );
      },
    },
    { clave: 'rolNombre', titulo: 'Rol', celda: (a: Acceso) => a.rolNombre },
    {
      clave: 'estado',
      titulo: 'Última vez',
      celda: (a: Acceso) => {
        const como = comoEsta(a);
        return como.tono === 'neutro' && a.estado !== 'fuera' ? (
          <span className="text-secundario text-texto-suave">{como.texto}</span>
        ) : (
          <Etiqueta tono={como.tono}>{como.texto}</Etiqueta>
        );
      },
    },
    {
      clave: 'acciones',
      titulo: 'Acceso',
      celda: (a: Acceso) =>
        !puedeInvitar ? null : !a.puedoGestionar && a.personaId !== yo?.personaId ? (
          // «Que los gerentes, o gente del mismo nivel, no se puedan echar entre
          // ellos.» No se enseña un botón que va a decir que no: se dice quién.
          <span className="text-secundario text-texto-suave">Lo lleva quien está por encima</span>
        ) : a.estado === 'fuera' ? (
          <Boton
            onClick={(evento) => {
              evento.stopPropagation();
              void reactivar(a);
            }}
          >
            Reactivar
          </Boton>
        ) : (
          // Un botón, y dentro las tres cosas. El `stopPropagation` es lo que
          // evita que abrirlo abra también la ficha de la persona: la fila entera
          // se pulsa, y este va dentro.
          <Boton
            tono="secundario"
            icono={<IconoFlechaAbajo size={16} />}
            onClick={(evento) => {
              evento.stopPropagation();
              setGestionando(a);
            }}
          >
            Acceso
          </Boton>
        ),
    },
  ];

  const sinEstrenar = accesos.filter((a) => a.estado === 'sin_estrenar').length;
  const deLaVista = ESTADOS_DE_LA_VISTA[vista];
  const alaVista =
    deLaVista === undefined ? accesos : accesos.filter((a) => deLaVista.includes(a.estado));

  return (
    <div className="flex flex-col gap-e4">
      {error && <ErrorEnCristiano error={error} />}

      {sinEstrenar > 0 && vista !== 'sin-entrar-todavia' && (
        <Aviso
          tono="atencion"
          titulo={`${sinEstrenar} ${sinEstrenar === 1 ? 'persona no ha entrado' : 'personas no han entrado'} nunca`}
        >
          Su PIN sigue valiendo. Si lo han perdido, dales uno nuevo desde «Acceso».
        </Aviso>
      )}

      <Tarjeta
        titulo={comoSeCuentaElEquipo(alaVista.length, vista)}
        accion={
          puedeInvitar ? (
            <Boton
              tono="principal"
              onClick={() => {
                setInvitando(true);
              }}
            >
              Invitar
            </Boton>
          ) : undefined
        }
        pegado
      >
        <Tabla
          titulo="Quién tiene acceso"
          columnas={columnas}
          filas={alaVista}
          claveDe={(a) => a.membresiaId}
          alPulsar={(a) => {
            persona.abrir(a.personaId);
          }}
          cuandoNoHay={
            vista === 'sin-entrar-todavia' ? (
              <EstadoVacio
                compacto
                titulo="Han entrado todos"
                frase="Nadie se ha quedado con un PIN sin estrenar."
                sinAccionPorque="Quien se invite aparecerá aquí hasta que entre la primera vez."
              />
            ) : vista === 'retirados' ? (
              <EstadoVacio
                compacto
                titulo="No has retirado el acceso a nadie"
                frase="Aquí aparece quien se fue, con su historial entero, para poder devolvérselo."
                sinAccionPorque="Se retira desde «Acceso», en cada persona."
              />
            ) : (
              <TodaviaNo
                que="El equipo"
                queHabra="Las personas que pueden entrar en este local, con su rol y su estado."
                modulo="M4. Invita a la primera con el botón de arriba"
              />
            )
          }
        />
      </Tarjeta>

      {/* ── El desplegable de «Acceso», como hoja ─────────────────────────── */}
      {gestionando !== null && (
        <GestionarAcceso
          acceso={gestionando}
          esYo={gestionando.personaId === yo?.personaId}
          alCerrar={() => {
            setGestionando(null);
          }}
          alPin={() => {
            void pinNuevo(gestionando);
          }}
          alClave={() => {
            void claveNueva(gestionando);
          }}
          alRetirar={() => {
            void retirar(gestionando);
          }}
        />
      )}

      {invitando && (
        <Invitar
          alCerrar={() => {
            setInvitando(false);
          }}
          alHecho={(quien) => {
            setInvitando(false);
            setRecienInvitada(quien);
            void consulta.refetch();
          }}
        />
      )}

      {recienInvitada && (
        <Hoja
          abierta
          titulo={`El PIN de ${recienInvitada.nombre}`}
          alCerrar={() => {
            setRecienInvitada(null);
          }}
        >
          {recienInvitada.yaExistia && (
            <div className="mb-e3">
              <Aviso tono="info" titulo="Ya estaba en Estook">
                Se le ha devuelto el acceso con su historial de siempre.
              </Aviso>
            </div>
          )}

          {recienInvitada.pin === null ? (
            <p className="text-secundario text-texto-suave">
              Este rol es de toda la organización: entra con su correo y su contraseña.
            </p>
          ) : (
            <>
              <p className="text-secundario text-texto-suave">
                Dáselo en mano. <strong>Solo se enseña esta vez.</strong>
              </p>
              <p className="my-e4 text-center font-mono text-[2.5rem] tracking-[0.2em] text-texto">
                {recienInvitada.pin}
              </p>
            </>
          )}

          <Boton
            tono="principal"
            ancho
            onClick={() => {
              setRecienInvitada(null);
            }}
          >
            Hecho
          </Boton>
        </Hoja>
      )}

      {claveReciente && (
        <Hoja
          abierta
          titulo={`La contraseña de ${claveReciente.nombre}`}
          alCerrar={() => {
            setClaveReciente(null);
          }}
        >
          <p className="text-secundario text-texto-suave">
            Dísela en mano o por teléfono. <strong>Solo se enseña esta vez.</strong> Al entrar se le
            pedirá que ponga una suya.
          </p>
          <p className="my-e4 rounded-medio border border-borde bg-fondo px-e3 py-e3 text-center font-mono text-cuerpo tracking-wide text-texto">
            {claveReciente.clave}
          </p>
          <Boton
            tono="principal"
            ancho
            onClick={() => {
              setClaveReciente(null);
            }}
          >
            Hecho
          </Boton>
        </Hoja>
      )}

      <FichaDePersona personaId={persona.abierta} alCerrar={persona.cerrar} />
    </div>
  );
}

/**
 * El acceso de una persona · lo que antes eran tres botones en cada fila.
 *
 * Y retirar **pregunta antes**. Es lo único de los tres que no se deshace con otro
 * toque: deja a alguien sin poder entrar al momento y le cierra las sesiones.
 */
function GestionarAcceso({
  acceso,
  esYo,
  alCerrar,
  alPin,
  alClave,
  alRetirar,
}: {
  readonly acceso: Acceso;
  readonly esYo: boolean;
  readonly alCerrar: () => void;
  readonly alPin: () => void;
  readonly alClave: () => void;
  readonly alRetirar: () => void;
}) {
  const [seguro, setSeguro] = useState(false);

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`El acceso de ${acceso.nombre}`}>
      <div className="flex flex-col gap-e2">
        {!seguro ? (
          <>
            <Boton ancho tono="secundario" onClick={alPin}>
              Darle un PIN nuevo
            </Boton>
            {/*
              En tu propia fila no sale: el servidor lo rechaza a propósito —«para
              cambiar la tuya, usa Mi acceso»—, así que aquí solo serviría para
              llevarse un error.
            */}
            {!esYo && (
              <Boton ancho tono="secundario" onClick={alClave}>
                Darle una contraseña nueva
              </Boton>
            )}
            {/*
              A uno mismo no se le retira el acceso desde aquí: lo hace quien está
              por encima, y el servidor lo dice igual si alguien lo intenta.
            */}
            {!esYo && (
              <Boton
                ancho
                tono="peligro"
                onClick={() => {
                  setSeguro(true);
                }}
              >
                Retirar el acceso
              </Boton>
            )}
          </>
        ) : (
          <Aviso
            tono="atencion"
            titulo={`¿Seguro que quieres retirarle el acceso a ${acceso.nombre}?`}
            accion={
              <Botones>
                <Boton
                  tono="texto"
                  onClick={() => {
                    setSeguro(false);
                  }}
                >
                  Mejor no
                </Boton>
                <Boton tono="peligro" onClick={alRetirar}>
                  Sí, retirarlo
                </Boton>
              </Botones>
            }
          >
            Deja de poder entrar ahora mismo y se le cierran las sesiones. Su historial se queda, y
            se le puede devolver cuando quieras.
          </Aviso>
        )}
      </div>
    </Hoja>
  );
}

/** Cómo se cuenta el equipo según lo que se esté mirando. */
function comoSeCuentaElEquipo(cuantos: number, vista: string): string {
  const cosa = cuantos === 1 ? 'persona' : 'personas';
  if (vista === 'sin-entrar-todavia') return `${cuantos} ${cosa} sin entrar todavía`;
  if (vista === 'retirados') return `${cuantos} ${cosa} con el acceso retirado`;
  return `${cuantos} ${cosa} con acceso`;
}
