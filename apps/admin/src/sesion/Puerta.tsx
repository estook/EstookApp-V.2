import { useState, type FormEvent, type ReactNode } from 'react';
import { Aviso, Boton, Campo, ErrorEnCristiano, Logo } from '@estook/ui';
import { elAparato, type ErrorDeLaApi } from '@estook/cliente-api';
import { LARGO_MINIMO_DE_CLAVE } from '@estook/dominio';
import { hayApi } from '../datos/cliente.ts';
import { usarSesion } from './Sesion.tsx';

/**
 * La puerta del admin (0041): las cuatro pantallas antes de entrar.
 *
 *   entrar                 correo y contraseña; el PIN no vale aquí
 *   el código              lo tiene montado y hay que escribirlo
 *   poner la contraseña    la que tiene se la dio otra persona, o la consola
 *   montar el segundo      no lo tiene, y en el admin es obligatorio
 *
 * Son las mismas preguntas que la puerta de la app, y **las respuestas las da el
 * servidor**: aquí solo se pinta la que toca. Las pantallas no se comparten con
 * la app porque viven en otra aplicación, con otra sesión y otro almacén; lo que
 * sí se comparte es lo que importa, los comandos y su comprobación.
 */

function Marco({
  titulo,
  frase,
  children,
}: {
  readonly titulo: string;
  readonly frase?: string;
  readonly children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-e4 py-e6">
      <div className="w-full max-w-[28rem]">
        <div className="mb-e5 flex flex-col items-center gap-e2">
          <Logo alto={36} />
          <span className="text-etiqueta font-medium uppercase tracking-wide text-texto-suave">
            Admin
          </span>
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

// ── Entrar ───────────────────────────────────────────────────────────────────

export function Entrar() {
  const { entrar, cliente } = usarSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);

    const aparato = elAparato();
    const respuesta = await cliente.ejecutar<{ token: string }>('entrar_en_admin', {
      correo,
      contrasena,
      ...(aparato === null ? {} : { aparato }),
    });

    if (!respuesta.ok) {
      setError(respuesta.error);
      setContrasena('');
      setEnviando(false);
      return;
    }

    await entrar(respuesta.datos.token);
    setEnviando(false);
  }

  return (
    <Marco titulo="Entra en el admin" frase="Solo para el equipo de Estook.">
      {!hayApi ? (
        <Aviso tono="atencion" titulo="Todavía no hay servidor al que preguntar">
          El admin está publicado, pero la API no está configurada, así que no hay dónde comprobar
          quién eres.
        </Aviso>
      ) : (
        <form
          onSubmit={(evento) => {
            void alEnviar(evento);
          }}
          className="flex flex-col gap-e4"
        >
          <Campo
            etiqueta="Tu correo"
            tipo="correo"
            name="correo"
            autoComplete="username"
            value={correo}
            onChange={(evento) => {
              setCorreo(evento.target.value);
            }}
            obligatorio
          />
          <Campo
            etiqueta="Tu contraseña"
            tipo="contrasena"
            name="contrasena"
            autoComplete="current-password"
            value={contrasena}
            onChange={(evento) => {
              setContrasena(evento.target.value);
            }}
            obligatorio
          />

          {error && <ErrorEnCristiano error={error} />}

          <Boton type="submit" tono="principal" cargando={enviando} textoCargando="Entrando" ancho>
            Entrar
          </Boton>
        </form>
      )}
    </Marco>
  );
}

// ── El código ────────────────────────────────────────────────────────────────

export function EscribirElCodigo() {
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
            // Hasta dieciséis: un código de respaldo tiene diez y un guion.
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
          Salir
        </Boton>
      </form>
    </Marco>
  );
}

// ── Poner la contraseña ──────────────────────────────────────────────────────

export function PonerMiContrasena() {
  const { cliente, refrescar, salir } = usarSesion();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const noCuadran = repetida !== '' && nueva !== repetida;
  const corta = nueva !== '' && nueva.length < LARGO_MINIMO_DE_CLAVE;

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (noCuadran || corta) return;
    setEnviando(true);
    setError(null);

    // Con la actual: el servidor la exige, y hace bien (ver la pantalla de la app).
    const respuesta = await cliente.ejecutar('cambiar_mi_clave', { actual, nueva });
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
      frase="La que estás usando salió por una pantalla, así que puede saberla alguien más."
    >
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <Campo
          etiqueta="La contraseña con la que has entrado"
          tipo="contrasena"
          name="actual"
          autoComplete="current-password"
          value={actual}
          onChange={(evento) => {
            setActual(evento.target.value);
          }}
          obligatorio
        />
        <Campo
          etiqueta="Tu contraseña nueva"
          tipo="contrasena"
          name="nueva"
          autoComplete="new-password"
          ayuda={`Al menos ${LARGO_MINIMO_DE_CLAVE} caracteres. Una frase que recuerdes vale más que un símbolo raro.`}
          {...(corta
            ? { error: `Te faltan caracteres: tiene que tener ${LARGO_MINIMO_DE_CLAVE}.` }
            : {})}
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
          Guardar y seguir
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

// ── Montar el segundo factor ─────────────────────────────────────────────────

export function MontarElSegundoFactor() {
  const { cliente, refrescar, salir } = usarSesion();
  const [alta, setAlta] = useState<{ enlace: string; secreto: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState<readonly string[] | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function empezar() {
    setEnviando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ enlace: string; secreto: string }>(
      'activar_doble_factor',
      {},
    );
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setAlta(respuesta.datos);
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ codigosDeRespaldo: string[] }>(
      'confirmar_doble_factor',
      { codigo },
    );
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      setCodigo('');
      return;
    }
    setRespaldo(respuesta.datos.codigosDeRespaldo);
  }

  // Los códigos de respaldo van antes de entrar, y se enseñan una sola vez: si se
  // entrara directamente, se perderían para siempre al primer clic.
  if (respaldo) {
    return (
      <Marco
        titulo="Tus códigos de respaldo"
        frase="Para cuando pierdas el móvil. Se enseñan una sola vez: apúntalos donde los encuentres sin el teléfono."
      >
        <ul className="mb-e5 grid grid-cols-2 gap-e2 font-mono text-cuerpo">
          {respaldo.map((uno) => (
            <li key={uno} className="rounded-medio border border-borde bg-superficie px-e2 py-e1">
              {uno}
            </li>
          ))}
        </ul>
        <Boton
          tono="principal"
          ancho
          onClick={() => {
            void refrescar();
          }}
        >
          Ya los tengo apuntados
        </Boton>
      </Marco>
    );
  }

  return (
    <Marco
      titulo="Monta el segundo factor"
      frase="En el admin es obligatorio. Necesitas una aplicación de autenticación en el móvil, y es un minuto."
    >
      {alta === null ? (
        <div className="flex flex-col gap-e4">
          {error && <ErrorEnCristiano error={error} />}
          <Boton
            tono="principal"
            ancho
            cargando={enviando}
            textoCargando="Preparando"
            onClick={() => {
              void empezar();
            }}
          >
            Empezar
          </Boton>
          <Boton
            tono="texto"
            onClick={() => {
              void salir();
            }}
          >
            Salir
          </Boton>
        </div>
      ) : (
        <form
          onSubmit={(evento) => {
            void confirmar(evento);
          }}
          className="flex flex-col gap-e4"
        >
          <div>
            <p className="text-secundario text-texto-suave">
              Mete esta clave en tu aplicación de autenticación:
            </p>
            <p className="my-e2 select-all rounded-medio border border-borde bg-superficie px-e3 py-e2 text-center font-mono text-seccion tracking-widest">
              {alta.secreto}
            </p>
            <p className="text-secundario text-texto-suave">
              O abre este enlace desde el móvil, y la aplicación se configura sola:{' '}
              <a href={alta.enlace} className="break-all underline">
                {alta.enlace.slice(0, 48)}…
              </a>
            </p>
          </div>

          <Campo
            etiqueta="El código que enseña ahora"
            tipo="pin"
            name="codigo"
            value={codigo}
            onChange={(evento) => {
              setCodigo(evento.target.value.replace(/[^0-9]/g, '').slice(0, 6));
            }}
            ayuda="Con esto se comprueba que la aplicación ha quedado bien configurada."
            obligatorio
          />

          {error && <ErrorEnCristiano error={error} />}

          <Boton
            type="submit"
            tono="principal"
            cargando={enviando}
            textoCargando="Comprobando"
            ancho
          >
            Confirmar
          </Boton>
        </form>
      )}
    </Marco>
  );
}
