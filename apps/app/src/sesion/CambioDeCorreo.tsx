import { useState } from 'react';
import { Boton, EstadoVacio, ErrorEnCristiano } from '@estook/ui';
import { crearCliente, type ErrorDeLaApi } from '@estook/cliente-api';
import { DIRECCION_DE_LA_API } from '../datos/cliente.ts';
import type { EnlaceDelCorreo } from './enlaceDelCorreo.ts';

/**
 * Los dos enlaces del cambio del correo de acceso (A2 · 0041): el que llega al
 * correo **nuevo** para confirmarlo, y el que llega al **de ahora** para pararlo.
 *
 * Se abren desde el correo, así que van **antes que cualquier otra puerta** de la
 * app: da igual si hay alguien dentro, si la cuenta está sin pagar o si es la sesión
 * de otra persona. Y por eso se llaman **sin token**: el enlace es lo que vale.
 *
 * **Nada se hace al abrirlo**: hay que pulsar el botón. Los antivirus de algunos
 * correos abren los enlaces por su cuenta para mirarlos, y abrir no puede bastar
 * para cambiar con qué correo se entra en una cuenta.
 */
type Como =
  | { readonly paso: 'preguntar' }
  | { readonly paso: 'hecho'; readonly correo: string | null }
  | { readonly paso: 'fallo'; readonly error: ErrorDeLaApi };

export function CambioDeCorreo({ enlace }: { readonly enlace: EnlaceDelCorreo }) {
  const [como, setComo] = useState<Como>({ paso: 'preguntar' });
  const [enviando, setEnviando] = useState(false);

  async function hacerlo() {
    setEnviando(true);
    const cliente = crearCliente({ base: DIRECCION_DE_LA_API, token: null });
    const respuesta =
      enlace.que === 'confirmar'
        ? await cliente.ejecutar<{ correo: string | null }>('confirmar_el_correo_nuevo', {
            token: enlace.token,
          })
        : await cliente.ejecutar<{ parado: boolean }>('parar_el_cambio_de_correo', {
            token: enlace.token,
          });
    setEnviando(false);
    if (!respuesta.ok) {
      setComo({ paso: 'fallo', error: respuesta.error });
      return;
    }
    setComo({
      paso: 'hecho',
      correo: 'correo' in respuesta.datos ? respuesta.datos.correo : null,
    });
  }

  /** A Estook, sin el enlace en la dirección: si se recargara, no se repetiría nada. */
  function aEstook() {
    window.location.replace(window.location.pathname);
  }

  const irAEstook = (
    <Boton tono={como.paso === 'preguntar' ? 'texto' : 'principal'} onClick={aEstook}>
      Ir a Estook
    </Boton>
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-e4 pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-[30rem]">
        {como.paso === 'hecho' ? (
          <EstadoVacio
            esLaPagina
            dibujo="todo-en-orden"
            titulo={enlace.que === 'confirmar' ? 'Correo cambiado' : 'Cambio parado'}
            frase={
              enlace.que === 'confirmar'
                ? `Desde ahora entras con ${como.correo ?? 'tu correo nuevo'}. Por seguridad, se han cerrado tus sesiones: entra otra vez.`
                : 'Tu correo sigue siendo el de siempre y no ha cambiado nada más.'
            }
            accion={irAEstook}
          />
        ) : (
          <EstadoVacio
            esLaPagina
            dibujo="candado"
            titulo={
              enlace.que === 'confirmar' ? 'Confirma tu correo nuevo' : 'Parar el cambio de correo'
            }
            frase={
              enlace.que === 'confirmar'
                ? 'Al confirmarlo, entrarás en Estook con este correo en vez del de antes.'
                : 'Si no has pedido cambiar el correo con el que entras, páralo: tu cuenta se queda como está.'
            }
            accion={
              <div className="flex flex-col items-center gap-e3">
                {como.paso === 'fallo' && <ErrorEnCristiano error={como.error} />}
                <Boton
                  tono={enlace.que === 'confirmar' ? 'principal' : 'peligro'}
                  cargando={enviando}
                  textoCargando="Un momento"
                  onClick={() => {
                    void hacerlo();
                  }}
                >
                  {enlace.que === 'confirmar' ? 'Confirmar el correo' : 'Parar el cambio'}
                </Boton>
              </div>
            }
            alternativa={irAEstook}
          />
        )}
      </div>
    </main>
  );
}
