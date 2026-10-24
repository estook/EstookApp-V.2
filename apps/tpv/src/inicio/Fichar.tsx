import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { irAlInicio } from '../navegar.ts';
import { Pastilla } from '../puerta/ElegirQueSera.tsx';
import type { ElFichaje } from '../datos/tipos.ts';
import { LaBarraDeArriba } from './LaBarraDeArriba.tsx';

/**
 * **Fichar, con el mismo PIN** (0057; Anexo 11.4, maqueta 19): la entrada, la pausa, la
 * vuelta y la salida de quien está. **Fichar la salida con mesas abiertas** pregunta a
 * quién se las pasa: la venta pasa a esa persona y lo que ya pidió sigue a su nombre.
 * Quien ficha la salida se va: el aparato vuelve al PIN.
 */
export function Fichar() {
  const { cliente, datos, refrescar, bloquear } = usarSesion();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [aQuien, setAQuien] = useState<string | null>(datos.companeros[0]?.id ?? null);
  const { estado, desde, pausasEnUso } = datos.fichaje;
  const conMesas = datos.misMesas.length > 0;

  async function fichar(que: 'entrada' | 'pausa' | 'vuelta' | 'salida') {
    setOcupado(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ fichaje: ElFichaje; turnoAcabado: boolean }>(
      'fichar_en_el_tpv',
      {
        que,
        ...(que === 'salida' && conMesas && aQuien !== null ? { pasar_mesas_a: aQuien } : {}),
      },
    );
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    if (respuesta.datos.turnoAcabado) {
      bloquear();
      return;
    }
    refrescar();
    irAlInicio();
  }

  const hora =
    desde === null
      ? ''
      : new Date(desde).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const boton =
    'min-h-toque-cocina rounded-grande px-e5 text-seccion font-bold disabled:opacity-60';

  return (
    <div className="flex min-h-dvh flex-col bg-fondo text-texto">
      <LaBarraDeArriba titulo="Fichar" />
      <main className="mx-auto flex w-full max-w-[40rem] flex-col gap-e5 p-e4 md:p-e6">
        <p className="text-pantalla font-bold">
          {estado === 'dentro'
            ? `Dentro desde las ${hora}`
            : estado === 'en_pausa'
              ? `En la pausa desde las ${hora}`
              : 'No has fichado la entrada'}
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}

        {estado === 'fuera' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void fichar('entrada')}
            className={`${boton} bg-naranja text-sobre-naranja`}
          >
            Fichar la entrada
          </button>
        )}

        {estado === 'en_pausa' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void fichar('vuelta')}
            className={`${boton} bg-naranja text-sobre-naranja`}
          >
            Volver de la pausa
          </button>
        )}

        {estado === 'dentro' && (
          <>
            {pausasEnUso && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void fichar('pausa')}
                className={`${boton} bg-charcoal text-texto`}
              >
                Empezar la pausa
              </button>
            )}
            {conMesas && (
              <section className="flex flex-col gap-e3 rounded-mayor bg-superficie p-e4">
                <p className="text-cuerpo">
                  Tienes{' '}
                  {datos.misMesas.length === 1
                    ? 'una mesa abierta'
                    : `${String(datos.misMesas.length)} mesas abiertas`}
                  : {datos.misMesas.map((m) => m.titulo).join(', ')}. ¿A quién se las pasas?
                </p>
                {datos.companeros.length === 0 ? (
                  <p className="text-secundario text-atencion">
                    No hay nadie más fichado que tome nota. Pásalas cuando llegue alguien, o deja
                    que un encargado las pase.
                  </p>
                ) : (
                  <div
                    role="radiogroup"
                    aria-label="A quién se las pasas"
                    className="flex flex-wrap gap-e2"
                  >
                    {datos.companeros.map((c) => (
                      <Pastilla
                        key={c.id}
                        puesta={aQuien === c.id}
                        alElegir={() => {
                          setAQuien(c.id);
                        }}
                      >
                        {c.nombre}
                      </Pastilla>
                    ))}
                  </div>
                )}
              </section>
            )}
            <button
              type="button"
              disabled={ocupado || (conMesas && aQuien === null)}
              onClick={() => void fichar('salida')}
              className={`${boton} bg-naranja text-sobre-naranja`}
            >
              {conMesas && aQuien !== null
                ? `Pasar a ${datos.companeros.find((c) => c.id === aQuien)?.nombre ?? ''} y fichar la salida`
                : 'Fichar la salida'}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
