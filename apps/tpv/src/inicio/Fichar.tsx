import { useEffect, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { irAlPlano } from '../navegar.ts';
import { leerLaLlave } from '../datos/cliente.ts';
import { Pastilla } from '../puerta/ElegirQueSera.tsx';
import { FicharEnLaCaja } from '../puerta/FicharEnLaCaja.tsx';
import type { ElFichaje } from '../datos/tipos.ts';
import { LaBarraDeArriba } from './LaBarraDeArriba.tsx';

/**
 * **Fichar, en la caja abierta** (0057; Anexo 11.4; Richi, 28-oct): **pide el PIN a todos**.
 * La caja la abre el gerente y se queda abierta todo el día, y en ese ordenador ficha
 * cualquiera: el que llega teclea su PIN y le sale «Hola, Ana · ¿Fichar la entrada?», sin
 * tocar la sesión de quien la tiene abierta. Al acabar, «✓ Ana · entrada a las 12:02» y el
 * teclado listo para el siguiente.
 *
 * **Si el PIN es el de quien tiene la caja abierta**, es lo suyo (`LoMio`): sus mesas, y su
 * salida cierra también su sesión.
 */
export function Fichar() {
  const { yo, refrescar } = usarSesion();
  const llave = leerLaLlave();
  const [esLoMio, setEsLoMio] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);

  // «✓ Ana · entrada a las 12:02» se queda unos segundos y se va, como en el PIN.
  useEffect(() => {
    if (aviso === null) return undefined;
    const fuera = window.setTimeout(() => {
      setAviso(null);
    }, 5_000);
    return () => {
      window.clearTimeout(fuera);
    };
  }, [aviso]);

  if (llave === null || esLoMio) {
    return (
      <LoMio
        alVolver={() => {
          setEsLoMio(false);
        }}
      />
    );
  }
  return (
    <FicharEnLaCaja
      key={vuelta}
      llave={llave}
      cabecera={<LaBarraDeArriba titulo="Fichar" />}
      aviso={aviso}
      alSerQuienEstaDentro={(fichaje) => {
        if (fichaje.personaId !== yo.personaId) return false;
        setEsLoMio(true);
        return true;
      }}
      alAcabar={(hecho) => {
        if (hecho === null) {
          irAlPlano();
          return;
        }
        setAviso(hecho);
        setVuelta((v) => v + 1);
        refrescar();
      }}
    />
  );
}

/**
 * **Lo de quien tiene la caja abierta** (0057, maqueta 19): la entrada, la pausa, la vuelta y
 * la salida. **Fichar la salida con mesas abiertas** pregunta a quién se las pasa: la venta
 * pasa a esa persona y lo que ya pidió sigue a su nombre. **Su salida cierra su sesión**: el
 * aparato vuelve al PIN.
 */
function LoMio({ alVolver }: { readonly alVolver: () => void }) {
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
    irAlPlano();
  }

  const hora =
    desde === null
      ? ''
      : new Date(desde).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const boton =
    'min-h-toque-cocina rounded-grande px-e5 text-seccion font-bold disabled:opacity-60';

  return (
    <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
      <LaBarraDeArriba titulo="Fichar" />
      <main className="mx-auto flex w-full max-w-[40rem] flex-col gap-e5 p-e4 md:p-e6">
        <p className="text-pantalla font-bold">
          Hola, {datos.fichaje.nombre}
          <br />
          <span className="text-seccion text-texto-suave">
            {estado === 'dentro'
              ? `Estás dentro desde las ${hora}`
              : estado === 'en_pausa'
                ? `Estás en la pausa desde las ${hora}`
                : '¿Fichar la entrada?'}
          </span>
        </p>
        {error !== null && <ErrorEnCristiano error={error} />}

        {estado === 'fuera' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void fichar('entrada')}
            className={`${boton} bg-naranja text-sobre-naranja`}
          >
            Sí, fichar la entrada
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
                ? `Pasar a ${datos.companeros.find((c) => c.id === aQuien)?.nombre ?? ''}, fichar la salida y cerrar sesión`
                : 'Fichar la salida y cerrar sesión'}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={alVolver}
          className="min-h-toque text-secundario font-semibold text-texto-tenue"
        >
          No, volver
        </button>
      </main>
    </div>
  );
}
