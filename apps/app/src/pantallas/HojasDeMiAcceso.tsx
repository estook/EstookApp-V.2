import { useState, type FormEvent } from 'react';
import { Boton, Botones, Campo, ErrorEnCristiano, Hoja } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Las dos hojas de «Mi acceso» (M4).
 *
 * Cambiar la contrasena y activar el segundo factor. Estan aparte de `MiAcceso`
 * porque juntos pasaban de las trescientas lineas que fija A2, y porque son otra
 * cosa: la tarjeta **ensena**, y estas dos **piden algo y lo guardan**.
 */

// ── Cambiar mi contraseña ────────────────────────────────────────────────────

export function CambiarMiClave({
  yaTiene,
  alCerrar,
  alHecho,
}: {
  yaTiene: boolean;
  alCerrar: () => void;
  alHecho: () => void;
}) {
  const { cliente } = usarSesion();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const respuesta = await cliente.ejecutar('cambiar_mi_clave', {
      ...(yaTiene ? { actual } : {}),
      nueva,
    });

    if (!respuesta.ok) {
      setError(respuesta.error);
      setEnviando(false);
      return;
    }
    alHecho();
  }

  return (
    <Hoja abierta titulo="Cambiar mi contraseña" alCerrar={alCerrar}>
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        {yaTiene && (
          <Campo
            etiqueta="La de ahora"
            tipo="contrasena"
            autoComplete="current-password"
            // Se pide **siempre** que ya haya una. Sin esto, a quien se dejara la
            // sesión abierta en la tablet del pase le podrían cambiar la
            // contraseña de un clic y quedarse con la cuenta.
            ayuda="Se pide para que nadie pueda cambiarla desde una sesión que te dejaste abierta."
            value={actual}
            onChange={(evento) => {
              setActual(evento.target.value);
            }}
            obligatorio
          />
        )}

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

        {error && <ErrorEnCristiano error={error} />}

        <p className="text-secundario text-texto-suave">
          Al cambiarla se cierran <strong>todas tus demás sesiones</strong>. Si alguien la sabía,
          deja de valerle.
        </p>

        <Botones>
          <Boton type="submit" tono="principal" cargando={enviando}>
            Guardar
          </Boton>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
        </Botones>
      </form>
    </Hoja>
  );
}

// ── Activar el doble factor ──────────────────────────────────────────────────

export function ActivarDobleFactor({
  alCerrar,
  alHecho,
}: {
  alCerrar: () => void;
  alHecho: () => void;
}) {
  const { cliente } = usarSesion();
  const [alta, setAlta] = useState<{ enlace: string; secreto: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState<readonly string[] | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function empezar() {
    setError(null);
    const respuesta = await cliente.ejecutar<{ enlace: string; secreto: string }>(
      'activar_doble_factor',
      {},
    );
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
    if (!respuesta.ok) {
      setError(respuesta.error);
      setCodigo('');
      setEnviando(false);
      return;
    }
    setRespaldo(respuesta.datos.codigosDeRespaldo);
    setEnviando(false);
  }

  // Los códigos de respaldo, que es lo último y lo que no se puede volver a ver.
  if (respaldo) {
    return (
      <Hoja abierta titulo="Tus códigos de respaldo" alCerrar={alHecho}>
        <p className="text-secundario text-texto-suave">
          Para cuando pierdas el móvil. <strong>Se enseñan una sola vez.</strong> Apúntalos donde
          los encuentres sin el teléfono; cada uno vale una vez.
        </p>
        <ul className="my-e4 grid grid-cols-2 gap-e2 font-mono text-cuerpo">
          {respaldo.map((uno) => (
            <li key={uno} className="rounded-medio border border-borde bg-fondo px-e2 py-e1">
              {uno}
            </li>
          ))}
        </ul>
        <Boton tono="principal" ancho onClick={alHecho}>
          Ya los tengo apuntados
        </Boton>
      </Hoja>
    );
  }

  return (
    <Hoja abierta titulo="Activar el doble factor" alCerrar={alCerrar}>
      {alta === null ? (
        <div className="flex flex-col gap-e3">
          <p className="text-secundario text-texto-suave">
            Necesitas una aplicación de autenticación en el móvil. Te enseñaremos una clave para
            meter en ella, y luego el código que salga.
          </p>
          {error && <ErrorEnCristiano error={error} />}
          <Botones>
            <Boton
              tono="principal"
              onClick={() => {
                void empezar();
              }}
            >
              Empezar
            </Boton>
            <Boton tono="texto" onClick={alCerrar}>
              Dejarlo
            </Boton>
          </Botones>
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
            <p className="my-e2 select-all rounded-medio border border-borde bg-fondo px-e3 py-e2 text-center font-mono text-seccion tracking-widest">
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
            value={codigo}
            onChange={(evento) => {
              setCodigo(evento.target.value.replace(/[^0-9]/g, '').slice(0, 6));
            }}
            ayuda="Con esto comprobamos que la aplicación ha quedado bien configurada antes de exigírtelo."
            obligatorio
          />

          {error && <ErrorEnCristiano error={error} />}

          <Botones>
            <Boton type="submit" tono="principal" cargando={enviando}>
              Confirmar
            </Boton>
            <Boton tono="texto" onClick={alCerrar}>
              Dejarlo
            </Boton>
          </Botones>
        </form>
      )}
    </Hoja>
  );
}
