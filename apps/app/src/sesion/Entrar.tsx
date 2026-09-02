import { useState, type FormEvent } from 'react';
import { Aviso, Boton, Campo, ErrorEnCristiano, Logo, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { hayApi } from '../datos/cliente.ts';
import { usarSesion } from './Sesion.tsx';

/**
 * La pantalla de entrar (M4).
 *
 * «Formulario unico con correo y, debajo, contrasena **o** PIN» (Manifiesto 28).
 * Un solo formulario, no dos pestanas: para quien entra, entrar es una cosa.
 *
 * ── Por que el PIN esta al mismo nivel y no escondido ────────────────────────
 *
 * Porque para media plantilla **es la forma normal de entrar**. Una camarera que
 * ficha todos los dias no tiene una contrasena de doce caracteres en la cabeza:
 * tiene seis numeros que le dieron el primer dia. Esconder el PIN detras de «mas
 * opciones» seria esconder la puerta principal.
 *
 * ── Lo que no se hace aqui, a proposito ──────────────────────────────────────
 *
 * **No se dice si el correo existe.** Ni antes de escribir la contrasena, ni
 * despues. El servidor devuelve la misma frase para «ese correo no esta» y para
 * «esa contrasena no es»; aqui se ensena tal cual. Si dijera cual de las dos es,
 * cualquiera podria averiguar quien trabaja donde probando direcciones.
 *
 * **No hay registro.** «Tres formas de entrar por primera vez: registro (creas tu
 * negocio), invitacion (te unen a uno) y nada mas. No hay registro abierto»
 * (Manifiesto 28). El registro llega con M5, que es quien monta el alta.
 */
export function Entrar() {
  const { entrar, cliente } = usarSesion();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [pin, setPin] = useState('');
  const [conPin, setConPin] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setError(null);

    const respuesta = await cliente.ejecutar<{ token: string }>('entrar', {
      correo,
      ...(conPin ? { pin } : { contrasena }),
    });

    if (!respuesta.ok) {
      setError(respuesta.error);
      setEnviando(false);
      // Lo escrito **no se borra**, salvo el secreto. Volver a teclear el correo
      // cada vez que uno se equivoca de contrasena es de las cosas que mas
      // molestan de cualquier aplicacion.
      if (conPin) setPin('');
      else setContrasena('');
      return;
    }

    // No se navega desde aqui: se guarda el token y ya esta. A donde va cada uno
    // lo decide `Puerta` mirando `quien_soy`, que es un solo dueno (regla 6). Si
    // esta pantalla tambien navegara, habria dos sitios decidiendo lo mismo y un
    // dia dirian cosas distintas.
    await entrar(respuesta.datos.token);
    setEnviando(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-e4 py-e6">
      <div className="w-full max-w-[26rem]">
        <div className="mb-e5 flex justify-center">
          <Logo alto={40} />
        </div>

        <h1 className="mb-e2 text-center text-pantalla font-semibold">Entra en Estook</h1>
        <p className="mb-e5 text-center text-secundario text-texto-suave">
          Con tu correo y tu contraseña, o con el PIN de tu local.
        </p>

        {!hayApi ? (
          <Aviso tono="atencion" titulo="Todavía no hay servidor al que preguntar">
            La aplicación está publicada, pero la API aún no está desplegada, así que no hay dónde
            comprobar quién eres. En cuanto se despliegue, esta pantalla funciona sin tocar nada.
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

            {conPin ? (
              <Campo
                etiqueta="Tu PIN"
                tipo="pin"
                name="pin"
                ayuda="Los seis números que te dieron al darte de alta."
                value={pin}
                onChange={(evento) => {
                  setPin(evento.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                }}
                obligatorio
              />
            ) : (
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
            )}

            {error && <ErrorEnCristiano error={error} />}

            <Boton
              type="submit"
              tono="principal"
              cargando={enviando}
              textoCargando="Entrando"
              ancho
            >
              Entrar
            </Boton>

            <button
              type="button"
              onClick={() => {
                setConPin((antes) => !antes);
                setError(null);
              }}
              className={clases(
                'min-h-toque rounded-medio text-secundario text-texto-suave underline',
                'hover:text-texto',
              )}
            >
              {conPin ? 'Prefiero usar mi contraseña' : 'Prefiero usar mi PIN'}
            </button>
          </form>
        )}

        {/*
          «Segundo administrador o correo de recuperacion obligatorio» es lo que
          hace que esto pueda decir algo util en vez de un enlace de «he olvidado
          mi contrasena» que no lleva a ningun sitio mientras no haya correo.
        */}
        <p className="mt-e5 text-center text-secundario text-texto-suave">
          ¿No te acuerdas? Quien lleva tu local puede darte una contraseña nueva o un PIN nuevo en
          un momento, desde Equipo.
        </p>
      </div>
    </main>
  );
}
