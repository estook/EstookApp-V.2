import { useState, type FormEvent, type ReactNode } from 'react';
import { Aviso, Boton, Campo, ErrorEnCristiano, EstadoVacio, Logo, clases } from '@estook/ui';
import { IconoLocal, IconoOrganizacion } from '@estook/iconos';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from './Sesion.tsx';

/**
 * Las cuatro pantallas que hay entre entrar y el Panel (M4).
 *
 * Salen de las seis comprobaciones del Manifiesto (28), y **cada una existe
 * porque la resolucion de destino puede parar ahi**. No son pasos de un asistente:
 * la mayoria de la gente no ve ninguna. Quien trabaja en un local de una empresa
 * entra y aparece en su Panel, que es como tiene que ser.
 *
 *   cuenta_parada         la suscripcion no deja trabajar
 *   elegir_organizacion   trabaja en mas de una empresa
 *   elegir_local          «¿donde estas hoy?»
 *   doble factor          el codigo de su aplicacion de autenticacion
 *   clave por cambiar     la que tiene se la dio otra persona
 *
 * Las dos ultimas no son destinos: son puertas del servidor. Se pintan aqui
 * porque para quien entra son lo mismo, una pantalla mas antes de trabajar.
 */

function Marco({
  titulo,
  frase,
  children,
}: {
  titulo: string;
  frase?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-e4 py-e6">
      <div className="w-full max-w-[30rem]">
        <div className="mb-e5 flex justify-center">
          <Logo alto={36} />
        </div>
        <h1 className="mb-e2 text-center text-pantalla font-semibold">{titulo}</h1>
        {frase !== undefined && (
          <p className="mb-e5 text-center text-secundario text-texto-suave">{frase}</p>
        )}
        {children}
      </div>
    </main>
  );
}

/** Un boton grande de lista. Se usa para las empresas y para los locales. */
function Fila({
  icono,
  titulo,
  subtitulo,
  alPulsar,
}: {
  icono: ReactNode;
  titulo: string;
  subtitulo?: string;
  alPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className={clases(
        'flex w-full min-h-toque-cocina items-center gap-e3 rounded-medio border px-e4 py-e3',
        'border-borde-fuerte bg-superficie text-left hover:bg-fondo',
      )}
    >
      <span className="shrink-0 text-texto-suave">{icono}</span>
      <span className="min-w-0">
        <span className="block truncate text-cuerpo font-medium text-texto">{titulo}</span>
        {subtitulo !== undefined && (
          <span className="block truncate text-secundario text-texto-suave">{subtitulo}</span>
        )}
      </span>
    </button>
  );
}

// ── La cuenta parada ─────────────────────────────────────────────────────────

export function CuentaParada({ porque }: { readonly porque: string }) {
  const { salir } = usarSesion();

  return (
    <Marco titulo="Tu cuenta está parada">
      {/*
        «Nada se borra nunca, y pagar lo devuelve todo tal cual» (Manifiesto 28).
        Se dice aqui, en la pantalla que da la mala noticia, porque es justo el
        momento en que hace falta oirlo.
      */}
      <Aviso tono="atencion" titulo={porque}>
        No se ha borrado nada. En cuanto se resuelva, todo vuelve a estar donde estaba.
      </Aviso>
      <div className="mt-e4 flex justify-center">
        <Boton
          onClick={() => {
            void salir();
          }}
        >
          Salir
        </Boton>
      </div>
    </Marco>
  );
}

// ── ¿En qué empresa? ─────────────────────────────────────────────────────────

export function ElegirOrganizacion() {
  const { yo, cliente, refrescar } = usarSesion();

  if (!yo) return null;

  async function elegir(id: string) {
    await cliente.ejecutar('cambiar_de_contexto', { organizacion_id: id });
    await refrescar();
  }

  return (
    <Marco
      titulo="¿En qué negocio estás?"
      frase="Trabajas en más de uno. Puedes cambiar cuando quieras desde arriba."
    >
      <div className="flex flex-col gap-e2">
        {yo.organizaciones.map((organizacion) => (
          <Fila
            key={organizacion.id}
            icono={<IconoOrganizacion size={22} />}
            titulo={organizacion.nombre}
            alPulsar={() => {
              void elegir(organizacion.id);
            }}
          />
        ))}
      </div>
    </Marco>
  );
}

// ── ¿Dónde estás hoy? ────────────────────────────────────────────────────────

export function ElegirLocal() {
  const { yo, cliente, refrescar } = usarSesion();

  if (!yo) return null;

  const suyos = yo.locales.filter((local) => local.organizacionId === yo.organizacion?.id);

  async function elegir(id: string) {
    await cliente.ejecutar('cambiar_de_contexto', { local_id: id });
    await refrescar();
  }

  return (
    <Marco
      titulo="¿Dónde estás hoy?"
      // La frase no es decorativa: es la razon de que esta pantalla exista.
      frase="Para que no acabes apuntando una merma en el local equivocado."
    >
      {suyos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no tienes ningún local"
          frase="Pídeselo a quien lleva el negocio: en cuanto te dé acceso, aparecerá aquí."
        />
      ) : (
        <div className="flex flex-col gap-e2">
          {suyos.map((local) => (
            <Fila
              key={local.id}
              icono={<IconoLocal size={22} />}
              titulo={local.nombre}
              alPulsar={() => {
                void elegir(local.id);
              }}
            />
          ))}
        </div>
      )}
    </Marco>
  );
}

// ── El segundo factor ────────────────────────────────────────────────────────

export function PedirDobleFactor() {
  const { cliente, refrescar, salir } = usarSesion();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const respuesta = await cliente.ejecutar('superar_doble_factor', { codigo });
    if (!respuesta.ok) {
      setError(respuesta.error);
      setCodigo('');
      setEnviando(false);
      return;
    }

    await refrescar();
    setEnviando(false);
  }

  return (
    <Marco
      titulo="Tu código de seis dígitos"
      frase="Ábrelo en tu aplicación de autenticación y escribe el que enseña ahora."
    >
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <Campo
          etiqueta="Código"
          tipo="pin"
          name="codigo"
          value={codigo}
          onChange={(evento) => {
            // Se admiten mas de seis porque un codigo de respaldo tiene diez y un
            // guion. Si solo se aceptaran seis digitos, quien perdiera el movil no
            // podria usar los codigos que le dimos justo para eso.
            setCodigo(evento.target.value.toUpperCase().slice(0, 16));
          }}
          ayuda="Si has perdido el móvil, sirve uno de tus códigos de respaldo."
          obligatorio
        />

        {error && <ErrorEnCristiano error={error} />}

        <Boton type="submit" tono="principal" cargando={enviando} textoCargando="Comprobando" ancho>
          Continuar
        </Boton>

        <Boton
          tono="texto"
          onClick={() => {
            void salir();
          }}
        >
          Salir y entrar con otra cuenta
        </Boton>
      </form>
    </Marco>
  );
}

// ── La contraseña que puso otra persona ──────────────────────────────────────

export function PonerMiContrasena() {
  const { cliente, refrescar, salir } = usarSesion();
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const noCuadran = repetida !== '' && nueva !== repetida;

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (noCuadran) return;

    setEnviando(true);
    setError(null);

    const respuesta = await cliente.ejecutar('cambiar_mi_clave', { nueva });
    if (!respuesta.ok) {
      setError(respuesta.error);
      setEnviando(false);
      return;
    }

    await refrescar();
    setEnviando(false);
  }

  return (
    <Marco
      titulo="Pon una contraseña tuya"
      // Se dice por que, en vez de mandar. Quien entiende el motivo no busca como
      // saltarselo.
      frase="La que estás usando te la dio otra persona, así que la sabe alguien más."
    >
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <Campo
          etiqueta="Tu contraseña nueva"
          tipo="contrasena"
          name="nueva"
          autoComplete="new-password"
          ayuda="Al menos diez caracteres. Una frase que recuerdes vale más que un símbolo raro."
          value={nueva}
          onChange={(evento) => {
            setNueva(evento.target.value);
          }}
          obligatorio
        />

        <Campo
          etiqueta="Otra vez, para comprobar"
          tipo="contrasena"
          name="repetida"
          autoComplete="new-password"
          {...(noCuadran ? { error: 'Las dos no son iguales.' } : {})}
          value={repetida}
          onChange={(evento) => {
            setRepetida(evento.target.value);
          }}
          obligatorio
        />

        {error && <ErrorEnCristiano error={error} />}

        <Boton
          type="submit"
          tono="principal"
          cargando={enviando}
          textoCargando="Guardando"
          disabled={noCuadran}
          ancho
        >
          Guardar y entrar
        </Boton>

        <Boton
          tono="texto"
          onClick={() => {
            void salir();
          }}
        >
          Salir
        </Boton>
      </form>
    </Marco>
  );
}
