import { useState, type FormEvent, type ReactNode } from 'react';
import { Aviso, Boton, Campo, ErrorEnCristiano } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { elAparato, hayApi } from '../datos/cliente.ts';
import { olvidarLosAplazamientos } from '../pantallas/recordatorios.ts';
import { BotonDeGoogle, MarcoDeLaPuerta, Separador, type ComoSeEntra } from './Formas.tsx';
import { OlvideLaContrasena } from './OlvideLaContrasena.tsx';
import { irAGoogle } from './google.ts';
import { usarSesion } from './Sesion.tsx';

/**
 * La pantalla de entrar (M4, con Google y crear cuenta desde la 0042).
 *
 * «Si das a iniciar sesión, puedes hacerlo con tu cuenta [...] o con Google, pero que
 *  se vean bien las opciones.» Así, de arriba abajo:
 *
 *   1. **Continuar con Google**, arriba y a lo ancho, que es lo más rápido.
 *   2. Un «o», y **correo con contraseña**, con «¿La has olvidado o no tienes una?»
 *      debajo, que manda un enlace al correo (0109).
 *   3. **¿No tienes cuenta? Créala**, abajo, que es a donde mira quien no la tiene.
 *   4. Y la demostración, al final, para quien solo quiere mirar.
 *
 * **El PIN ya no abre Estook** (0109, Richi, 24-oct, la A): es para los aparatos del
 * local, Estook TPV y fichar. Hasta la 0109 había una pestaña «Con PIN» aquí, y el PIN
 * servía para dos cosas, que es lo que lo hacía confundirse con la contraseña.
 *
 * ── Lo que no se hace aquí, a propósito ──────────────────────────────────────
 *
 * **No se dice si el correo existe.** El servidor devuelve la misma frase para «ese
 * correo no está» y para «esa contraseña no es»; aquí se enseña tal cual.
 *
 * **Google no sale si no está conectado**: un botón que no lleva a ningún sitio es
 * peor que no tener botón (0022). Lo dice `como_se_entra`.
 */
export function Entrar({
  como,
  alCrearCuenta,
  avisoDeGoogle,
}: {
  readonly como: ComoSeEntra | undefined;
  readonly alCrearCuenta: () => void;
  /** Lo que ha pasado al volver de Google, si ha ido mal. */
  readonly avisoDeGoogle: ReactNode;
}) {
  const { entrar, cliente } = usarSesion();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [olvidada, setOlvidada] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [yendoAGoogle, setYendoAGoogle] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setError(null);

    // El aparato viaja con la entrada (M5), para que «Mis dispositivos» diga
    // «Chrome en Android» y no veintitrés visitas iguales.
    const aparato = elAparato();

    const respuesta = await cliente.ejecutar<{ token: string }>('entrar', {
      correo,
      contrasena,
      ...(aparato === null ? {} : { aparato }),
    });

    if (!respuesta.ok) {
      setError(respuesta.error);
      setEnviando(false);
      // Lo escrito **no se borra**, salvo el secreto.
      setContrasena('');
      return;
    }

    // Entrar es sentarse a hacer cosas: los avisos aplazados vuelven.
    olvidarLosAplazamientos();

    await entrar(respuesta.datos.token);
    setEnviando(false);
  }

  async function conGoogle() {
    if (como?.google == null) return;
    setYendoAGoogle(true);
    try {
      await irAGoogle(como.google.clienteId, { intencion: 'entrar' });
    } catch {
      setYendoAGoogle(false);
    }
  }

  if (olvidada) {
    return (
      <OlvideLaContrasena
        correoDeAntes={correo}
        alVolver={() => {
          setOlvidada(false);
          setError(null);
        }}
      />
    );
  }

  return (
    <MarcoDeLaPuerta titulo="Entra en Estook" frase="Con Google o con tu correo y tu contraseña.">
      {!hayApi ? (
        <Aviso tono="atencion" titulo="Todavía no hay servidor al que preguntar">
          La aplicación está publicada, pero la API aún no está desplegada, así que no hay dónde
          comprobar quién eres. En cuanto se despliegue, esta pantalla funciona sin tocar nada.
        </Aviso>
      ) : (
        <>
          {avisoDeGoogle}

          {/*
            Mientras llega `como_se_entra`, Google ya ocupa su sitio. Antes aparecía
            al llegar y empujaba el formulario unos 90 px: quien pulsaba «Entrar» en
            ese momento tocaba donde ya no estaba el botón y no pasaba nada (lo cazó
            Safari en las pruebas, 25-sep). Pulsarlo antes de tiempo no hace nada, y
            si al final Google no está conectado, se va.
          */}
          {(como === undefined || como.google != null) && (
            <>
              <BotonDeGoogle
                cargando={yendoAGoogle}
                alPulsar={() => {
                  void conGoogle();
                }}
              />
              <Separador />
            </>
          )}

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

            <Boton
              type="submit"
              tono="principal"
              cargando={enviando}
              textoCargando="Entrando"
              ancho
            >
              Entrar
            </Boton>
          </form>

          {/*
            Con el correo conectado, el enlace; sin él, quien lleva el local (Equipo).
            Mientras llega `como_se_entra`, el botón ya está: no se mueve nada al llegar.
          */}
          {como?.conCorreo === false ? (
            <p className="mt-e4 text-center text-secundario text-texto-suave">
              ¿No te acuerdas? Quien lleva tu local puede darte una contraseña nueva en un momento,
              desde Equipo.
            </p>
          ) : (
            <div className="mt-e3 flex justify-center">
              <Boton
                tono="texto"
                onClick={() => {
                  setOlvidada(true);
                  setError(null);
                }}
              >
                ¿La has olvidado o no tienes una?
              </Boton>
            </div>
          )}

          <p className="mt-e2 text-center text-secundario text-texto-suave">
            ¿Te dieron de alta sin correo? Tú no entras aquí: entras en los aparatos del local, solo
            con tu PIN.
          </p>

          <div className="mt-e5 flex flex-col items-center gap-e2 border-t border-borde pt-e5">
            <p className="text-cuerpo">¿No tienes cuenta?</p>
            <Boton tono="secundario" ancho onClick={alCrearCuenta}>
              Crear cuenta
            </Boton>
          </div>

          <LaDemostracion />
        </>
      )}
    </MarcoDeLaPuerta>
  );
}

/**
 * «Verlo por dentro sin cuenta» · el modo demostración (M5).
 *
 * Va al final: quien llega aquí casi siempre viene a trabajar o a crear su cuenta.
 * Abre una sesión de **solo lectura** en el restaurante de ejemplo; no se puede
 * escribir nada, así que no hay nada que limpiar después.
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
    <div className="mt-e4 flex flex-col items-center gap-e1">
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
