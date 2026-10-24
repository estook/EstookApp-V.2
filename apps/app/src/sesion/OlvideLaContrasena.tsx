import { useState, type FormEvent } from 'react';
import { Aviso, Boton, Campo, ErrorEnCristiano } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { MarcoDeLaPuerta } from './Formas.tsx';
import { usarSesion } from './Sesion.tsx';

/**
 * **«He olvidado mi contraseña»**, o ponerse la primera (0109).
 *
 * Se escribe el correo y llega un enlace, de un uso y que vale una hora, para poner una
 * nueva. La pantalla dice **lo mismo exista o no el correo**: si no, cualquiera podría
 * averiguar quién usa Estook probando direcciones. A un correo sin cuenta le llega uno
 * que lo dice, que es donde se entera el dueño de verdad.
 *
 * Es también la puerta de quien entraba con el PIN y no tenía contraseña: desde la 0109
 * el PIN es solo para los aparatos del local.
 */
export function OlvideLaContrasena({
  correoDeAntes,
  alVolver,
}: {
  readonly correoDeAntes: string;
  readonly alVolver: () => void;
}) {
  const { cliente } = usarSesion();
  const [correo, setCorreo] = useState(correoDeAntes);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [mandado, setMandado] = useState<{ correo: string; minutos: number } | null>(null);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ minutos: number }>('pedir_enlace_de_contrasena', {
      correo,
    });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setMandado({ correo: correo.trim(), minutos: respuesta.datos.minutos });
  }

  if (mandado !== null) {
    return (
      <MarcoDeLaPuerta titulo="Mira tu correo">
        <div role="status" className="flex flex-col gap-e4">
          <p className="text-center text-cuerpo">
            Si <strong>{mandado.correo}</strong> tiene cuenta en Estook, te hemos mandado un enlace
            para poner tu contraseña. Vale durante {mandado.minutos} minutos y sirve una vez.
          </p>
          <p className="text-center text-secundario text-texto-suave">
            Si no llega en un par de minutos, mira en el correo no deseado.
          </p>
          <Boton tono="principal" ancho onClick={alVolver}>
            Volver a entrar
          </Boton>
        </div>
      </MarcoDeLaPuerta>
    );
  }

  return (
    <MarcoDeLaPuerta
      titulo="Tu contraseña"
      frase="Si la has olvidado, o todavía no tienes una, te mandamos un enlace para ponerla."
    >
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
        {error && <ErrorEnCristiano error={error} />}
        <Boton type="submit" tono="principal" cargando={enviando} textoCargando="Mandando" ancho>
          Mandarme el enlace
        </Boton>
      </form>
      <div className="mt-e4">
        <Aviso tono="info" titulo="¿Te dieron de alta sin correo?">
          Entonces no entras en Estook: entras en los aparatos del local con tu PIN. Si lo has
          olvidado, pídele uno nuevo a quien lleva el local.
        </Aviso>
      </div>
      <div className="mt-e4 flex justify-center">
        <Boton tono="texto" onClick={alVolver}>
          Volver
        </Boton>
      </div>
    </MarcoDeLaPuerta>
  );
}
