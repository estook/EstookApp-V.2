import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Aviso, Boton, Campo, ErrorEnCristiano, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { LARGO_MINIMO_DE_CLAVE, SEGUNDOS_ENTRE_CODIGOS } from '@estook/dominio';
import { elAparato } from '../datos/cliente.ts';
import {
  BotonDeGoogle,
  DIRECCION_DE_LA_PRIVACIDAD,
  DIRECCION_DE_LAS_CONDICIONES,
  MarcoDeLaPuerta,
  Separador,
  type ComoSeEntra,
} from './Formas.tsx';
import { irAGoogle } from './google.ts';
import { usarSesion } from './Sesion.tsx';

/**
 * Crear cuenta (0042).
 *
 * «Si dan a crear cuenta, pueden hacerlo con correo normal y verificación o con
 *  Google.» Lo que se pide es lo mínimo para montar su negocio: **el nombre del
 * negocio**, y aceptar las condiciones. Todo lo demás lo pregunta el alta, con su
 * porqué, cuando ya está dentro.
 *
 * ── El orden de la pantalla ─────────────────────────────────────────────────
 *
 * El nombre del negocio y las condiciones van **arriba**, antes de elegir cómo,
 * porque valen para las dos formas: así «Continuar con Google» no tiene que volver
 * a preguntarlo a la vuelta.
 *
 * Con correo, la cuenta **no existe hasta escribir el código** que llega por
 * correo: sin eso, cualquiera podría crear cuentas con correos de otros.
 */
export function CrearCuenta({
  como,
  alEntrar,
  avisoDeGoogle,
}: {
  readonly como: ComoSeEntra | undefined;
  readonly alEntrar: () => void;
  readonly avisoDeGoogle: ReactNode;
}) {
  const { cliente, entrar } = usarSesion();

  const [negocio, setNegocio] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [falta, setFalta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [yendoAGoogle, setYendoAGoogle] = useState(false);
  /** Con el código ya pedido, se pasa a escribirlo. */
  const [codigoPedido, setCodigoPedido] = useState<string | null>(null);

  const negocioVale = negocio.trim().length >= 2;
  const corta = contrasena !== '' && contrasena.length < LARGO_MINIMO_DE_CLAVE;

  function faltaLoComun(): string | null {
    if (!negocioVale) return 'Escribe el nombre de tu negocio.';
    if (!acepta) return 'Para crear tu cuenta tienes que aceptar las condiciones y la privacidad.';
    return null;
  }

  async function conGoogle() {
    const motivo = faltaLoComun();
    setFalta(motivo);
    if (motivo !== null || como?.google == null) return;
    setYendoAGoogle(true);
    try {
      await irAGoogle(como.google.clienteId, {
        intencion: 'crear',
        negocio: negocio.trim(),
        aceptaCondiciones: true,
      });
    } catch {
      setYendoAGoogle(false);
    }
  }

  async function pedirCodigo(evento: FormEvent) {
    evento.preventDefault();
    const motivo = faltaLoComun();
    setFalta(motivo);
    if (motivo !== null || corta || enviando) return;

    setEnviando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('pedir_codigo_de_registro', {
      nombre: nombre.trim(),
      negocio: negocio.trim(),
      correo: correo.trim(),
      contrasena,
      aceptaCondiciones: true,
    });
    setEnviando(false);

    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setCodigoPedido(correo.trim().toLowerCase());
  }

  if (codigoPedido !== null) {
    return (
      <EscribirElCodigo
        correo={codigoPedido}
        alCambiarDeCorreo={() => {
          setCodigoPedido(null);
        }}
        alReenviar={async () => {
          const respuesta = await cliente.ejecutar('pedir_codigo_de_registro', {
            nombre: nombre.trim(),
            negocio: negocio.trim(),
            correo: codigoPedido,
            contrasena,
            aceptaCondiciones: true,
          });
          return respuesta.ok ? null : respuesta.error;
        }}
        alConfirmar={async (codigo) => {
          const aparato = elAparato();
          const respuesta = await cliente.ejecutar<{ token: string }>('confirmar_registro', {
            correo: codigoPedido,
            codigo,
            ...(aparato === null ? {} : { aparato }),
          });
          if (!respuesta.ok) return respuesta.error;
          await entrar(respuesta.datos.token);
          return null;
        }}
      />
    );
  }

  const nadaEncendido = como !== undefined && como.google === null && !como.conCorreo;

  return (
    <MarcoDeLaPuerta
      titulo="Crea tu cuenta"
      frase={
        como?.oferta.activa === true
          ? `Prueba Estook ${como.oferta.dias} días gratis. Montas tu negocio en unos minutos.`
          : 'Montas tu negocio en unos minutos, y eliges tu plan al terminar.'
      }
    >
      {avisoDeGoogle}

      {como?.oferta.activa === true && (
        <div className="mb-e4">
          {/* Con tarjeta desde la 0048: hoy no se cobra, y se cancela antes sin pagar nada. */}
          <Aviso tono="bien" titulo={`${como.oferta.dias} días de prueba gratis`}>
            Pones tu tarjeta y hoy no se cobra nada. Si cancelas antes de que acabe, no pagas nada.
          </Aviso>
        </div>
      )}

      {nadaEncendido ? (
        <Aviso tono="atencion" titulo="Todavía no se puede crear cuenta desde aquí">
          Estamos terminando de conectarlo. Vuelve dentro de poco.
        </Aviso>
      ) : (
        <>
          <div className="flex flex-col gap-e4">
            <Campo
              etiqueta="El nombre de tu negocio"
              name="negocio"
              autoComplete="organization"
              value={negocio}
              onChange={(evento) => {
                setNegocio(evento.target.value);
                setFalta(null);
              }}
              ayuda="Como lo conocen tus clientes. Luego se puede cambiar."
              obligatorio
            />

            <label className="flex items-start gap-e3 text-secundario">
              <input
                type="checkbox"
                name="acepta"
                checked={acepta}
                onChange={(evento) => {
                  setAcepta(evento.target.checked);
                  setFalta(null);
                }}
                className="mt-[3px] h-5 w-5 shrink-0 accent-naranja"
              />
              <span>
                Acepto las{' '}
                <a
                  href={DIRECCION_DE_LAS_CONDICIONES}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  condiciones de uso
                </a>{' '}
                y la{' '}
                <a
                  href={DIRECCION_DE_LA_PRIVACIDAD}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  política de privacidad
                </a>
                .
              </span>
            </label>

            {falta !== null && (
              <p role="alert" className="text-secundario text-mal">
                {falta}
              </p>
            )}
          </div>

          {como?.google != null && (
            <>
              <div className="mt-e5">
                <BotonDeGoogle
                  cargando={yendoAGoogle}
                  alPulsar={() => {
                    void conGoogle();
                  }}
                />
              </div>
              {como.conCorreo && <Separador texto="o con tu correo" />}
            </>
          )}

          {como?.conCorreo === true ? (
            <form
              onSubmit={(evento) => {
                void pedirCodigo(evento);
              }}
              className={clases('flex flex-col gap-e4', como.google === null && 'mt-e5')}
            >
              <Campo
                etiqueta="Tu nombre"
                name="nombre"
                autoComplete="given-name"
                value={nombre}
                onChange={(evento) => {
                  setNombre(evento.target.value);
                }}
                obligatorio
              />
              <Campo
                etiqueta="Tu correo"
                tipo="correo"
                name="correo"
                autoComplete="email"
                value={correo}
                onChange={(evento) => {
                  setCorreo(evento.target.value);
                }}
                ayuda="Te mandaremos un código para comprobar que es tuyo."
                obligatorio
              />
              <Campo
                etiqueta="Una contraseña"
                tipo="contrasena"
                name="contrasena"
                autoComplete="new-password"
                value={contrasena}
                onChange={(evento) => {
                  setContrasena(evento.target.value);
                }}
                ayuda={`Al menos ${LARGO_MINIMO_DE_CLAVE} caracteres. Una frase que recuerdes vale más que un símbolo raro.`}
                {...(corta
                  ? { error: `Te faltan caracteres: tiene que tener ${LARGO_MINIMO_DE_CLAVE}.` }
                  : {})}
                obligatorio
              />

              {error && <ErrorEnCristiano error={error} />}

              <Boton
                type="submit"
                tono="principal"
                cargando={enviando}
                textoCargando="Mandando el código"
                ancho
              >
                Crear cuenta
              </Boton>
            </form>
          ) : (
            como !== undefined && (
              <p className="mt-e4 text-center text-secundario text-texto-suave">
                Crear cuenta con correo se abre muy pronto. Mientras, hazlo con Google.
              </p>
            )
          )}
        </>
      )}

      <div className="mt-e5 flex flex-col items-center gap-e2 border-t border-borde pt-e5">
        <p className="text-cuerpo">¿Ya tienes cuenta?</p>
        <Boton tono="secundario" ancho onClick={alEntrar}>
          Entrar
        </Boton>
      </div>
    </MarcoDeLaPuerta>
  );
}

// ── El código del correo ─────────────────────────────────────────────────────

function EscribirElCodigo({
  correo,
  alConfirmar,
  alReenviar,
  alCambiarDeCorreo,
}: {
  readonly correo: string;
  readonly alConfirmar: (codigo: string) => Promise<ErrorDeLaApi | null>;
  readonly alReenviar: () => Promise<ErrorDeLaApi | null>;
  readonly alCambiarDeCorreo: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(SEGUNDOS_ENTRE_CODIGOS);
  const [reenviado, setReenviado] = useState(false);

  // La cuenta atrás para pedir otro: el servidor no deja antes, y un botón que
  // falla al pulsarlo es peor que uno que dice cuándo se puede.
  useEffect(() => {
    if (espera <= 0) return;
    const reloj = window.setTimeout(() => {
      setEspera((antes) => antes - 1);
    }, 1_000);
    return () => {
      window.clearTimeout(reloj);
    };
  }, [espera]);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const fallo = await alConfirmar(codigo);
    if (fallo !== null) {
      setError(fallo);
      setCodigo('');
      setEnviando(false);
    }
  }

  return (
    <MarcoDeLaPuerta
      titulo="Mira tu correo"
      frase={
        <>
          Te hemos mandado un código de seis cifras a{' '}
          <strong className="text-texto">{correo}</strong>.
        </>
      }
    >
      <form
        onSubmit={(evento) => {
          void alEnviar(evento);
        }}
        className="flex flex-col gap-e4"
      >
        <Campo
          etiqueta="El código"
          tipo="pin"
          name="codigo"
          autoComplete="one-time-code"
          value={codigo}
          onChange={(evento) => {
            setCodigo(evento.target.value.replace(/[^0-9]/g, '').slice(0, 6));
          }}
          ayuda="Si no llega en un minuto, mira en la carpeta de correo no deseado."
          obligatorio
        />

        {error && <ErrorEnCristiano error={error} />}
        {reenviado && error === null && (
          <p role="status" className="text-secundario text-bien">
            Te hemos mandado otro código.
          </p>
        )}

        <Boton
          type="submit"
          tono="principal"
          cargando={enviando}
          textoCargando="Creando tu cuenta"
          ancho
        >
          Crear mi cuenta
        </Boton>

        <div className="flex flex-wrap justify-center gap-x-e4">
          <Boton
            tono="texto"
            disabled={espera > 0}
            onClick={() => {
              void (async () => {
                setError(null);
                const fallo = await alReenviar();
                if (fallo !== null) setError(fallo);
                else setReenviado(true);
                setEspera(SEGUNDOS_ENTRE_CODIGOS);
              })();
            }}
          >
            {espera > 0 ? `Pedir otro en ${espera} s` : 'Pedir otro código'}
          </Boton>
          <Boton tono="texto" onClick={alCambiarDeCorreo}>
            Cambiar el correo
          </Boton>
        </div>
      </form>
    </MarcoDeLaPuerta>
  );
}
