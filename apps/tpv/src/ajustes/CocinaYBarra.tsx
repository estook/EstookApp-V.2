import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { despertar, tocar } from '../cocina/sonidos.ts';
import { Casilla, Minutos } from './PinYBloqueo.tsx';

interface LaCocinaYLaBarra {
  readonly avisoMin: number;
  readonly tardeMin: number;
  readonly suena: boolean;
}

/**
 * **Ajustes del TPV › Cocina y barra** (T4 · 1, decisión 0116; Anexo 3.2 y 11.13): a los
 * cuántos minutos se pone un pase en ámbar y en rojo, y si la pantalla suena. Una vez, para
 * todo el local; la pantalla lo coge en su siguiente vuelta.
 */
export function CocinaYBarra() {
  const { cliente } = usarSesion();
  const leido = useQuery({
    queryKey: ['la_cocina_y_la_barra'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LaCocinaYLaBarra>('la_cocina_y_la_barra');
      if (!respuesta.ok) throw new Error(respuesta.error.quePasa);
      return respuesta.datos;
    },
  });
  const [ajustes, setAjustes] = useState<LaCocinaYLaBarra | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);
  useEffect(() => {
    if (leido.data !== undefined) setAjustes(leido.data);
  }, [leido.data]);

  async function guardar(nuevos: LaCocinaYLaBarra) {
    setAjustes(nuevos);
    setOcupado(true);
    setError(null);
    setGuardado(false);
    const respuesta = await cliente.ejecutar<LaCocinaYLaBarra>('guardar_la_cocina_y_la_barra', {
      aviso_min: nuevos.avisoMin,
      tarde_min: nuevos.tardeMin,
      suena: nuevos.suena,
    });
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      setAjustes(leido.data ?? null);
      return;
    }
    setAjustes(respuesta.datos);
    setGuardado(true);
  }

  if (ajustes === null) return <Cargando que="la cocina" />;
  return (
    <div className="flex max-w-[44rem] flex-col gap-e5">
      <div className="flex flex-col gap-e1">
        <h1 className="text-cifra-media font-bold">Cocina y barra</h1>
        <span className="text-secundario text-texto-tenue">
          El tiempo cuenta desde que el pase llega a la cocina, o desde que se marcha el 2.º.
        </span>
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}

      <section className="flex flex-col gap-e4 rounded-mayor bg-superficie p-e5">
        <span className="text-seccion font-bold">El color del tiempo</span>
        <Minutos
          titulo="Se pone en ámbar a los"
          frase="Va justo"
          valor={ajustes.avisoMin}
          desde={1}
          hasta={ajustes.tardeMin - 1}
          paso={1}
          ocupado={ocupado}
          alCambiar={(avisoMin) => void guardar({ ...ajustes, avisoMin })}
        />
        <Minutos
          titulo="Y en rojo, tarde, a los"
          frase="Sube arriba, con lo que lleva esperando"
          valor={ajustes.tardeMin}
          desde={ajustes.avisoMin + 1}
          hasta={180}
          paso={1}
          ocupado={ocupado}
          alCambiar={(tardeMin) => void guardar({ ...ajustes, tardeMin })}
        />
      </section>

      <section className="flex flex-col gap-e4 rounded-mayor bg-superficie p-e5">
        <Casilla
          titulo="Suena"
          frase="Al entrar una mesa, al marchar el 2.º, y distinto con algo anulado o «tienen prisa»"
          puesta={ajustes.suena}
          ocupado={ocupado}
          alCambiar={(suena) => void guardar({ ...ajustes, suena })}
        />
        <div>
          <Boton
            tono="secundario"
            onClick={() => {
              despertar();
              tocar('nueva');
            }}
          >
            Probar el sonido
          </Boton>
        </div>
      </section>

      <p role="status" className="text-secundario text-texto-tenue">
        {guardado ? 'Guardado. La pantalla de cocina lo coge al momento.' : 'Se guarda solo.'}
      </p>
    </div>
  );
}
