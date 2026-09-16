import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Aviso, Boton, Campo, Cargando, ErrorEnCristiano, Interruptor, Tarjeta } from '@estook/ui';
import { FalloDeLaApi, type ErrorDeLaApi } from '@estook/cliente-api';
import { DIAS_DE_OFERTA_MAXIMOS, DIAS_DE_OFERTA_MINIMOS } from '@estook/dominio';
import { fechaYHora } from '../datos/cliente.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La oferta de prueba (0042).
 *
 * «De vez en cuando subiremos una prueba de 12 días para marketing, no siempre;
 *  desde el admin manejamos si activamos la oferta o no.»
 *
 * Encendida, quien crea su cuenta entra con esos días de prueba, y la web y la
 * pantalla de crear cuenta lo anuncian. Apagada, paga al empezar. **Solo afecta a
 * las cuentas que se creen a partir de ahora.**
 */

interface Oferta {
  readonly activa: boolean;
  readonly dias: number;
  readonly cambiadaEn: string;
  readonly cambiadaPor: string | null;
}

export function OfertaDePrueba() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();

  const consulta = useQuery({
    queryKey: ['admin_oferta'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<Oferta>('admin_oferta');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });

  const [activa, setActiva] = useState(false);
  const [dias, setDias] = useState('12');
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada] = useState(false);

  // Lo guardado manda al abrir; después, lo que se toca.
  useEffect(() => {
    if (consulta.data === undefined) return;
    setActiva(consulta.data.activa);
    setDias(String(consulta.data.dias));
  }, [consulta.data]);

  const numero = Number(dias);
  const diasValen =
    Number.isInteger(numero) &&
    numero >= DIAS_DE_OFERTA_MINIMOS &&
    numero <= DIAS_DE_OFERTA_MAXIMOS;
  const cambiado =
    consulta.data !== undefined &&
    (activa !== consulta.data.activa || numero !== consulta.data.dias);
  const puedeCambiar = yo?.nivel === 'total';

  async function guardar() {
    if (!diasValen || guardando) return;
    setGuardando(true);
    setError(null);
    setGuardada(false);
    const respuesta = await cliente.ejecutar('admin_cambiar_oferta', { activa, dias: numero });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setGuardada(true);
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['admin_oferta'] }),
      cache.invalidateQueries({ queryKey: ['admin_auditoria'] }),
    ]);
  }

  return (
    <div className="flex flex-col gap-e5">
      <div>
        <h1 className="text-pantalla font-semibold">Oferta de prueba</h1>
        <p className="text-secundario text-texto-suave">
          Si quien crea su cuenta entra con días de prueba o paga al empezar.
        </p>
      </div>

      {consulta.isLoading ? (
        <Cargando que="La oferta" lineas={2} />
      ) : consulta.error instanceof FalloDeLaApi ? (
        <ErrorEnCristiano error={consulta.error.error} />
      ) : (
        consulta.data !== undefined && (
          <Tarjeta
            titulo={consulta.data.activa ? 'Encendida' : 'Apagada'}
            origen={
              consulta.data.cambiadaPor === null
                ? 'Sin cambiar desde que existe'
                : `La cambió ${consulta.data.cambiadaPor} el ${fechaYHora(consulta.data.cambiadaEn)}`
            }
          >
            <div className="flex flex-col gap-e4">
              <Aviso
                tono={consulta.data.activa ? 'bien' : 'info'}
                titulo={
                  consulta.data.activa
                    ? `Las cuentas nuevas entran con ${consulta.data.dias} días de prueba`
                    : 'Las cuentas nuevas pagan al empezar'
                }
              >
                {consulta.data.activa
                  ? 'La web y la pantalla de crear cuenta lo anuncian.'
                  : 'Al crear la cuenta, eligen su plan antes de entrar.'}
              </Aviso>

              <Interruptor
                etiqueta="Oferta de prueba encendida"
                puesto={activa}
                disabled={!puedeCambiar}
                alCambiar={(puesto) => {
                  setActiva(puesto);
                  setGuardada(false);
                }}
                ayuda="Solo cambia las cuentas que se creen a partir de ahora."
              />

              <Campo
                etiqueta="Días de prueba"
                tipo="numero"
                name="dias"
                inputMode="numeric"
                value={dias}
                disabled={!puedeCambiar}
                onChange={(evento) => {
                  setDias(evento.target.value.replace(/[^0-9]/g, '').slice(0, 2));
                  setGuardada(false);
                }}
                {...(diasValen
                  ? { ayuda: `Entre ${DIAS_DE_OFERTA_MINIMOS} y ${DIAS_DE_OFERTA_MAXIMOS}.` }
                  : {
                      error: `Tienen que ser entre ${DIAS_DE_OFERTA_MINIMOS} y ${DIAS_DE_OFERTA_MAXIMOS} días.`,
                    })}
              />

              {error && <ErrorEnCristiano error={error} />}
              {guardada && (
                <p role="status" className="text-secundario text-bien">
                  Guardado. Queda apuntado en la auditoría.
                </p>
              )}

              {puedeCambiar ? (
                <div>
                  <Boton
                    tono="principal"
                    cargando={guardando}
                    textoCargando="Guardando"
                    disabled={!cambiado || !diasValen}
                    onClick={() => {
                      void guardar();
                    }}
                  >
                    Guardar
                  </Boton>
                </div>
              ) : (
                <p className="text-secundario text-texto-suave">
                  Solo la cambia un admin con acceso total.
                </p>
              )}
            </div>
          </Tarjeta>
        )
      )}
    </div>
  );
}
