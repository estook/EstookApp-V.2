import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Aviso, Tarjeta } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { MiFichaje } from '../equipo/contrato.ts';

/**
 * Las pausas de descanso, en Ajustes → Tu local (H1 · decisión 0068).
 *
 * Dos preguntas: si en el local se ficha la pausa, y si cuenta como trabajo. **La
 * segunda la contesta el convenio**, no Estook: de fábrica no cuenta, que es lo que
 * dice el Estatuto de los Trabajadores (art. 34.4) cuando el convenio no dice otra
 * cosa. Cambiarlo vuelve a contar también las horas de antes, como el margen de
 * retraso: las horas no se guardan hechas, se cuentan al mirar.
 */
export function LasPausas() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const consulta = useQuery({
    queryKey: ['mi_fichaje'],
    retry: 1,
    queryFn: async (): Promise<MiFichaje> => {
      const respuesta = await cliente.consultar<MiFichaje>('mi_fichaje');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  /** Lo marcado mientras se guarda: la casilla no vuelve atrás mientras tanto. */
  const [pedido, setPedido] = useState<{ enUso: boolean; cuenta: boolean } | null>(null);

  const datos = consulta.data;
  if (consulta.isError || datos === undefined || datos.pausasEnUso === undefined) return null;
  const enUso = pedido?.enUso ?? datos.pausasEnUso;
  const cuenta = pedido?.cuenta ?? datos.pausaCuentaComoTrabajo ?? false;

  async function guardar(cambio: { enUso: boolean; cuenta: boolean }) {
    setError(null);
    setGuardado(false);
    setGuardando(true);
    setPedido(cambio);
    const respuesta = await cliente.ejecutar<{ enUso: boolean; cuentaComoTrabajo: boolean }>(
      'guardar_las_pausas',
      { en_uso: cambio.enUso, cuenta_como_trabajo: cambio.cuenta },
    );
    setGuardando(false);
    setPedido(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    cache.setQueryData<MiFichaje>(['mi_fichaje'], (antes) =>
      antes === undefined
        ? antes
        : {
            ...antes,
            pausasEnUso: respuesta.datos.enUso,
            pausaCuentaComoTrabajo: respuesta.datos.cuentaComoTrabajo,
          },
    );
    setGuardado(true);
    await Promise.all(
      ['resumen_del_equipo', 'un_indicador', 'fichajes_de_hoy'].map((clave) =>
        cache.invalidateQueries({ queryKey: [clave] }),
      ),
    );
  }

  return (
    <Tarjeta titulo="Las pausas de descanso">
      <div className="flex flex-col gap-e3">
        {error !== null && (
          <Aviso tono="mal" titulo={error.quePasa}>
            {error.queSePuedeHacer}
          </Aviso>
        )}
        <label className="flex min-h-toque items-start gap-e2 text-cuerpo">
          <input
            type="checkbox"
            checked={enUso}
            disabled={guardando}
            onChange={(e) => {
              void guardar({ enUso: e.currentTarget.checked, cuenta });
            }}
            className="mt-[3px] size-[20px] shrink-0 accent-[var(--color-naranja)]"
          />
          <span>
            Se ficha la pausa
            <span className="block text-secundario text-texto-suave">
              Dentro del turno salen «Empezar pausa» y «Volver», en el móvil y en el aparato del
              local.
            </span>
          </span>
        </label>
        <label className="flex min-h-toque items-start gap-e2 text-cuerpo">
          <input
            type="checkbox"
            checked={cuenta}
            disabled={guardando || !enUso}
            onChange={(e) => {
              void guardar({ enUso, cuenta: e.currentTarget.checked });
            }}
            className="mt-[3px] size-[20px] shrink-0 accent-[var(--color-naranja)]"
          />
          <span>
            La pausa cuenta como trabajo
            <span className="block text-secundario text-texto-suave">
              Márcalo solo si lo dice tu convenio o el contrato. Si no, la ley dice que no cuenta.
            </span>
          </span>
        </label>
        <p role="status" className="text-secundario text-bien">
          {guardando ? 'Guardando…' : guardado ? 'Guardado.' : ''}
        </p>
        <p className="text-secundario text-texto-suave">
          El horario partido no es una pausa: son dos turnos, con su salida y su entrada. Al cambiar
          esto se vuelven a contar también las horas de antes.
        </p>
      </div>
    </Tarjeta>
  );
}
