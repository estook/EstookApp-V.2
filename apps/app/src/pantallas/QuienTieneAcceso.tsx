import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { puedeEditar } from '@estook/permisos';
// El mismo generador que usa `bd:cuenta-de-verdad`: una lista de palabras
// copiada es una lista que se desincroniza (regla 6).
import { claveDeUnSoloUso } from '@estook/dominio';
import {
  Aviso,
  Boton,
  Botones,
  Cargando,
  Etiqueta,
  ErrorEnCristiano,
  Hoja,
  Tabla,
  Tarjeta,
  TodaviaNo,
  type Columna,
} from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Invitar } from './Invitar.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Quien tiene acceso a este local · Equipo → Personas (M4).
 *
 * **Esto no es la app Equipo.** Equipo entera es M10, con contratos, horas,
 * ausencias y documentos. Lo que hay aqui es lo que M4 tiene que dejar
 * funcionando: dar acceso, quitarlo y devolverlo.
 *
 * Se pone en su sitio definitivo —dentro de Equipo, en la pestana Personas— y no
 * en Ajustes, aunque hoy sea lo unico que hay en esa app. Ponerlo en Ajustes
 * «de momento» obligaria a M10 a mudarlo, y la gente ya se habria acostumbrado a
 * buscarlo donde no va.
 *
 * ── Los tres estados, y por que el de en medio importa ───────────────────────
 *
 *   dentro         tiene acceso y ha entrado alguna vez
 *   sin estrenar   se le invito y no ha entrado. **Su PIN sigue valiendo**
 *   fuera          se le retiro el acceso. Sigue en el historico, y se reactiva
 *
 * El de en medio es el que se olvida siempre, y es el util: quien da de alta a
 * cinco personas el lunes necesita saber el viernes a cuales hay que volver a
 * darles el PIN en mano.
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
}

const COMO_SE_LLAMA_EL_ESTADO: Record<
  Acceso['estado'],
  { texto: string; tono: 'bien' | 'atencion' | 'neutro' }
> = {
  dentro: { texto: 'Dentro', tono: 'bien' },
  sin_estrenar: { texto: 'Sin estrenar', tono: 'atencion' },
  fuera: { texto: 'Fuera', tono: 'neutro' },
};

export function QuienTieneAcceso() {
  const { cliente, yo, permisos } = usarSesion();
  const localId = yo?.local?.id ?? '';

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
  /** La contrasena recien dada a alguien. Se ensena una vez y no vuelve. */
  const [claveReciente, setClaveReciente] = useState<{ nombre: string; clave: string } | null>(
    null,
  );
  /** El PIN de quien se acaba de invitar. Se enseña una vez y no vuelve. */
  const [recienInvitada, setRecienInvitada] = useState<{
    nombre: string;
    pin: string | null;
    yaExistia: boolean;
  } | null>(null);

  // «Esconder un boton no protege nada» (principio 7): esto no es la proteccion,
  // que la ponen las politicas de M1. Es para que a quien no puede invitar no se
  // le enseñe un boton que le va a decir que no.
  const puedeInvitar = puedeEditar(permisos, 'accion.invitar_personas');

  async function retirar(acceso: Acceso) {
    setError(null);
    const respuesta = await cliente.ejecutar('retirar_acceso', {
      persona_id: acceso.personaId,
      membresia_id: acceso.membresiaId,
    });
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
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setRecienInvitada({ nombre: acceso.nombre, pin: respuesta.datos.pin, yaExistia: true });
    await consulta.refetch();
  }

  /**
   * Darle una contraseña nueva a alguien.
   *
   * **La pantalla de entrar lo prometía y no existía.** Dice, palabra por
   * palabra: «¿No te acuerdas? Quien lleva tu local puede darte una contraseña
   * nueva o un PIN nuevo en un momento». El PIN sí estaba; la contraseña no, y
   * `poner_clave_a` llevaba desde M4 escrito, registrado y probado sin que lo
   * llamara ninguna pantalla.
   *
   * Sin proveedor de correo, esta **es** la forma de volver a entrar: no hay
   * «he olvidado mi contraseña» que mande un enlace. Prometerlo y no tenerlo
   * dejaba a quien perdiera la suya sin ninguna salida.
   *
   * La contraseña se genera aquí y se enseña una vez, como el PIN. Nace con
   * «hay que cambiarla», así que muere en cuanto la persona entra y se pone la
   * suya: eso es lo que hace aceptable que otra persona la haya sabido.
   */
  async function claveNueva(acceso: Acceso) {
    setError(null);
    const clave = claveDeUnSoloUso();

    const respuesta = await cliente.ejecutar('poner_clave_a', {
      persona_id: acceso.personaId,
      organizacion_id: yo?.organizacion?.id ?? '',
      nueva: clave,
    });
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
      // En móvil, esta es la que hace de título de la tarjeta (B4).
      principal: true,
      celda: (a: Acceso) => `${a.nombre} ${a.apellidos ?? ''}`.trim(),
    },
    { clave: 'rolNombre', titulo: 'Rol', celda: (a: Acceso) => a.rolNombre },
    {
      clave: 'estado',
      titulo: 'Estado',
      celda: (a: Acceso) => (
        <Etiqueta tono={COMO_SE_LLAMA_EL_ESTADO[a.estado].tono}>
          {COMO_SE_LLAMA_EL_ESTADO[a.estado].texto}
        </Etiqueta>
      ),
    },
    {
      clave: 'acciones',
      titulo: 'Acceso',
      celda: (a: Acceso) =>
        !puedeInvitar ? null : a.estado === 'fuera' ? (
          <Boton
            onClick={() => {
              void reactivar(a);
            }}
          >
            Reactivar
          </Boton>
        ) : (
          <Botones>
            <Boton
              onClick={() => {
                void pinNuevo(a);
              }}
            >
              PIN nuevo
            </Boton>
            {/*
              En tu propia fila no sale, y no es un adorno: el servidor lo
              rechaza a propósito —«para cambiar la tuya, usa Mi acceso: ahí se
              te pide la de ahora»—, así que un botón aquí solo serviría para
              llevarse un error. Lo cazó su propia prueba, que pulsaba la
              primera fila y resultó ser la de quien miraba.
            */}
            {a.personaId !== yo?.personaId && (
              <Boton
                onClick={() => {
                  void claveNueva(a);
                }}
              >
                Contraseña nueva
              </Boton>
            )}
            <Boton
              tono="peligro"
              onClick={() => {
                void retirar(a);
              }}
            >
              Retirar
            </Boton>
          </Botones>
        ),
    },
  ];

  const sinEstrenar = accesos.filter((a) => a.estado === 'sin_estrenar').length;

  return (
    <div className="flex flex-col gap-e4">
      {error && <ErrorEnCristiano error={error} />}

      {sinEstrenar > 0 && (
        <Aviso
          tono="atencion"
          titulo={`${sinEstrenar} ${sinEstrenar === 1 ? 'persona no ha entrado' : 'personas no han entrado'} todavía`}
        >
          Su PIN sigue valiendo. Si se les ha perdido, genera otro y dáselo en mano.
        </Aviso>
      )}

      <Tarjeta
        titulo="Quién tiene acceso"
        origen="Retirar el acceso mata el PIN al instante y cierra sus sesiones"
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
          filas={accesos}
          claveDe={(a) => a.membresiaId}
          cuandoNoHay={
            <TodaviaNo
              que="El equipo"
              queHabra="Las personas que pueden entrar en este local, con su rol y su estado."
              modulo="M4. Invita a la primera con el botón de arriba"
            />
          }
        />
      </Tarjeta>

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
              <Aviso tono="info" titulo="Ese correo ya estaba en Estook">
                Se le ha añadido el acceso a este local.{' '}
                <strong>No se ha duplicado la persona</strong>: conserva su historial y sus fichas.
              </Aviso>
            </div>
          )}

          {recienInvitada.pin === null ? (
            <p className="text-secundario text-texto-suave">
              Este rol es de toda la organización, así que no lleva PIN de local. Entrará con su
              correo y su contraseña.
            </p>
          ) : (
            <>
              <p className="text-secundario text-texto-suave">
                Dáselo en mano. <strong>Se enseña una sola vez</strong>: lo que se guarda no permite
                volver a leerlo. Si se pierde, se genera otro y ya está.
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
            Dísela en mano o por teléfono. <strong>Se enseña una sola vez</strong>: lo que se guarda
            es su huella, no la contraseña. Si se pierde, se genera otra y ya está.
          </p>
          <p className="my-e4 rounded-medio border border-borde bg-fondo px-e3 py-e3 text-center font-mono text-cuerpo tracking-wide text-texto">
            {claveReciente.clave}
          </p>
          <p className="text-secundario text-texto-suave">
            Al entrar con ella se le pedirá que se ponga una suya, y esta dejará de valer. Hasta
            entonces, la sabéis dos.
          </p>
          <div className="mt-e4">
            <Boton
              tono="principal"
              ancho
              onClick={() => {
                setClaveReciente(null);
              }}
            >
              Hecho
            </Boton>
          </div>
        </Hoja>
      )}
    </div>
  );
}
