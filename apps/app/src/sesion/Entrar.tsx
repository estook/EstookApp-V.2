import { useState, type FormEvent } from 'react';
import { Aviso, Boton, Campo, ErrorEnCristiano, Logo, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { elAparato, hayApi } from '../datos/cliente.ts';
import { olvidarLosAplazamientos } from '../pantallas/recordatorios.ts';
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

    // El aparato viaja con la entrada (M5). Sin esto, cada login abre una fila
    // nueva de sesion y «Mis dispositivos» acaba ensenando veintitres visitas
    // identicas en vez de un movil. Es opcional: en navegacion privada no se
    // puede guardar la marca, y entonces se entra igual sin ella.
    const aparato = elAparato();

    const respuesta = await cliente.ejecutar<{ token: string }>('entrar', {
      correo,
      ...(conPin ? { pin } : { contrasena }),
      ...(aparato === null ? {} : { aparato }),
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
    // Entrar con contrasena o con PIN es sentarse a hacer cosas. Los avisos que
    // alguien aplazo con un «recuerdamelo» vuelven aqui: sin esto, «recuerdamelo»
    // acababa siendo «no me lo ensenes nunca mas».
    olvidarLosAplazamientos();

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

        {hayApi && <LaDemostracion />}
      </div>
    </main>
  );
}

/**
 * «Mirarlo sin cuenta» · el modo demostracion (M5).
 *
 * «**Modo demostracion aparte**, con un restaurante ficticio entero. Se entra y
 *  se sale sin dejar rastro» (Manifiesto 8).
 *
 * ── Por que esta aqui abajo y no arriba ──────────────────────────────────────
 *
 * Porque quien llega a esta pantalla casi siempre viene a trabajar, no a mirar.
 * Poner «pruébalo» al mismo nivel que «entra» le pondria delante una decision que
 * no tiene: ya tiene cuenta. Va al final, donde lo encuentra quien de verdad lo
 * busca.
 *
 * ── Y que hace exactamente ───────────────────────────────────────────────────
 *
 * Abre una sesion de **solo lectura** en el restaurante de ejemplo, con su
 * equipo, su Panel y sus locales. No se puede escribir nada: lo impide el
 * despachador, en el mismo sitio que las tres puertas de M4. Por eso no hay nada
 * que limpiar despues, que es lo que hace verdad «sin dejar rastro».
 */
function LaDemostracion() {
  const { entrar, cliente } = usarSesion();
  const [entrando, setEntrando] = useState(false);
  const [noSePuede, setNoSePuede] = useState(false);

  async function mirar() {
    setEntrando(true);
    setNoSePuede(false);

    const respuesta = await cliente.ejecutar<{ token: string }>('entrar_en_demostracion', {});

    if (!respuesta.ok) {
      // Sin restaurante de ejemplo montado no hay demostracion. Se dice, y no se
      // ensena un error rojo: no es un fallo de nadie.
      setNoSePuede(true);
      setEntrando(false);
      return;
    }

    await entrar(respuesta.datos.token);
    setEntrando(false);
  }

  if (noSePuede) {
    return (
      <p className="mt-e4 text-center text-secundario text-texto-suave">
        Ahora mismo no hay ninguna demostración montada.
      </p>
    );
  }

  return (
    <div className="mt-e5 flex flex-col items-center gap-e1 border-t border-borde pt-e5">
      <Boton
        tono="texto"
        cargando={entrando}
        textoCargando="Abriendo"
        onClick={() => {
          void mirar();
        }}
      >
        Verlo por dentro sin cuenta
      </Boton>
      <p className="text-center text-secundario text-texto-suave">
        Un restaurante de ejemplo, entero. Puedes mirarlo todo y no se guarda nada.
      </p>
    </div>
  );
}
