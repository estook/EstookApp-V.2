import { useMemo, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { ErrorEnCristiano } from '@estook/ui';
import { crearClienteDelTpv } from '../datos/cliente.ts';

/**
 * **¿Has olvidado tu PIN?** (0109), en el aparato del local.
 *
 * Se escribe el correo y le llega un enlace, de un uso y que vale media hora, que da un
 * PIN nuevo **para este local**; el de antes deja de valer. No hay que esperar al
 * gerente, que era lo que pasaba. La pantalla dice lo mismo sea el correo de alguien
 * del local o no.
 *
 * Quien no tiene correo, se lo pide a quien lleva el local (Estook › Equipo).
 */
export function OlvideMiPin({
  llave,
  alVolver,
}: {
  readonly llave: string;
  readonly alVolver: () => void;
}) {
  const cliente = useMemo(() => crearClienteDelTpv({ token: () => null }), []);
  const [correo, setCorreo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [mandado, setMandado] = useState<{ local: string; minutos: number } | null>(null);

  async function pedirlo() {
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ local: string; minutos: number }>(
      'pedir_pin_por_correo',
      { llave, correo: correo.trim() },
    );
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setMandado(respuesta.datos);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo p-e5 text-texto">
      <section className="flex w-full max-w-[32rem] flex-col gap-e4 rounded-mayor bg-superficie p-e6">
        <h1 className="text-cifra-media font-bold">¿Has olvidado tu PIN?</h1>
        {mandado === null ? (
          <form
            className="flex flex-col gap-e4"
            onSubmit={(e) => {
              e.preventDefault();
              void pedirlo();
            }}
          >
            <p className="text-cuerpo text-texto-suave">
              Escribe tu correo y te mandamos un enlace para sacar uno nuevo. Ábrelo en tu móvil.
            </p>
            <label className="flex flex-col gap-e2">
              <span className="text-secundario font-semibold text-texto-tenue">Tu correo</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                }}
                className="min-h-toque-cocina w-full rounded-grande border-2 border-borde bg-fondo px-e4 text-seccion text-texto"
              />
            </label>
            {error !== null && <ErrorEnCristiano error={error} />}
            <button
              type="submit"
              disabled={ocupado || correo.trim() === ''}
              className="min-h-toque-cocina rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja disabled:opacity-60"
            >
              {ocupado ? 'Mandando…' : 'Mandarme el enlace'}
            </button>
          </form>
        ) : (
          <p role="status" className="text-cuerpo">
            Si ese correo es de alguien de <b>{mandado.local}</b>, le llega un enlace en un minuto.
            Vale {mandado.minutos} minutos y sirve una vez. Con el PIN nuevo, vuelve aquí.
          </p>
        )}
        <p className="text-secundario text-texto-tenue">
          ¿No tienes correo? Pídele un PIN nuevo a quien lleva el local: lo saca en Estook › Equipo.
        </p>
        <button
          type="button"
          onClick={alVolver}
          className="min-h-toque self-start rounded-grande border-2 border-borde px-e5 font-bold"
        >
          Volver al PIN
        </button>
      </section>
    </main>
  );
}
