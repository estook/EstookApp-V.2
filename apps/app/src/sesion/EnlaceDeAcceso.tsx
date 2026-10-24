import { useState, type FormEvent } from 'react';
import { Boton, Campo, EstadoVacio, ErrorEnCristiano } from '@estook/ui';
import { crearCliente, type ErrorDeLaApi } from '@estook/cliente-api';
import { DIRECCION_DE_LA_API } from '../datos/cliente.ts';

/**
 * Los dos enlaces de recuperar el acceso (0109), abiertos desde el correo:
 *
 *   · **la contraseña**: se escribe la nueva dos veces, y las sesiones de antes se cierran
 *   · **el PIN**: un PIN nuevo para los aparatos de un local, **enseñado una vez**
 *
 * Como el cambio de correo, van antes que cualquier otra puerta y se llaman **sin
 * token**: el enlace es lo que vale. Y **abrirlo no hace nada**: hay que pulsar, porque
 * los antivirus de algunos correos abren los enlaces solos y gastarían el enlace.
 */
export function EnlaceDeAcceso({
  enlace,
}: {
  readonly enlace: { readonly que: 'contrasena' | 'pin'; readonly token: string };
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-e4 pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-[30rem]">
        {enlace.que === 'contrasena' ? (
          <LaContrasena token={enlace.token} />
        ) : (
          <ElPin token={enlace.token} />
        )}
      </div>
    </main>
  );
}

/** A Estook, sin el enlace en la dirección: si se recargara, no se repetiría nada. */
function aEstook() {
  window.location.replace(window.location.pathname);
}

function cliente() {
  return crearCliente({ base: DIRECCION_DE_LA_API, token: null });
}

function LaContrasena({ token }: { readonly token: string }) {
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [puesta, setPuesta] = useState(false);
  const noCoinciden = repetida !== '' && repetida !== nueva;

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando || noCoinciden) return;
    setEnviando(true);
    setError(null);
    const respuesta = await cliente().ejecutar('poner_contrasena_con_enlace', {
      enlace: token,
      contrasena: nueva,
    });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setPuesta(true);
  }

  if (puesta) {
    return (
      <EstadoVacio
        esLaPagina
        dibujo="todo-en-orden"
        titulo="Contraseña puesta"
        frase="Ya puedes entrar en Estook con tu correo y esta contraseña. Por seguridad, se han cerrado las sesiones que tuvieras abiertas."
        accion={
          <Boton tono="principal" onClick={aEstook}>
            Entrar en Estook
          </Boton>
        }
      />
    );
  }

  return (
    <section className="rounded-grande bg-superficie p-e5 shadow-s1">
      <h1 className="mb-e2 text-pantalla font-semibold">Pon tu contraseña</h1>
      <p className="mb-e4 text-secundario text-texto-suave">
        Es la de entrar en Estook con tu correo. El PIN de los aparatos del local no cambia.
      </p>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <Campo
          etiqueta="La nueva"
          tipo="contrasena"
          autoComplete="new-password"
          ayuda="Al menos diez caracteres. Una frase que recuerdes vale más que un símbolo raro."
          value={nueva}
          onChange={(evento) => {
            setNueva(evento.target.value);
          }}
          obligatorio
        />
        <Campo
          etiqueta="Repítela"
          tipo="contrasena"
          autoComplete="new-password"
          value={repetida}
          onChange={(evento) => {
            setRepetida(evento.target.value);
          }}
          {...(noCoinciden ? { error: 'No es igual que la de arriba.' } : {})}
          obligatorio
        />
        {error && <ErrorEnCristiano error={error} />}
        <Boton
          type="submit"
          tono="principal"
          cargando={enviando}
          textoCargando="Poniéndola"
          disabled={noCoinciden}
          ancho
        >
          Poner mi contraseña
        </Boton>
      </form>
    </section>
  );
}

function ElPin({ token }: { readonly token: string }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [nuevo, setNuevo] = useState<{ pin: string; local: string } | null>(null);

  async function sacarlo() {
    setEnviando(true);
    setError(null);
    const respuesta = await cliente().ejecutar<{ pin: string; local: string }>('pin_con_enlace', {
      enlace: token,
    });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setNuevo(respuesta.datos);
  }

  if (nuevo !== null) {
    return (
      <section role="status" className="rounded-grande bg-superficie p-e5 text-center shadow-s1">
        <h1 className="mb-e2 text-pantalla font-semibold">Tu PIN nuevo de {nuevo.local}</h1>
        <p className="text-secundario text-texto-suave">
          Para Estook TPV y para fichar. <strong>Se enseña una sola vez</strong>: apúntalo. El de
          antes ya no vale.
        </p>
        <p className="my-e5 font-mono text-[2.5rem] tracking-[0.2em] text-texto">{nuevo.pin}</p>
        <Boton tono="principal" ancho onClick={aEstook}>
          Ya lo tengo apuntado
        </Boton>
      </section>
    );
  }

  return (
    <EstadoVacio
      esLaPagina
      dibujo="candado"
      titulo="Tu PIN nuevo"
      frase="Al sacarlo, el PIN que tenías en ese local deja de valer, y el nuevo sale aquí una sola vez."
      accion={
        <div className="flex flex-col items-center gap-e3">
          {error && <ErrorEnCristiano error={error} />}
          <Boton
            tono="principal"
            cargando={enviando}
            textoCargando="Un momento"
            onClick={() => {
              void sacarlo();
            }}
          >
            Ver mi PIN nuevo
          </Boton>
        </div>
      }
      alternativa={
        <Boton tono="texto" onClick={aEstook}>
          Ir a Estook
        </Boton>
      }
    />
  );
}
