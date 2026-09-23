import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MARGENES_DE_RETRASO } from '@estook/dominio';
import { Aviso, Selector, Tarjeta } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { MiFichaje } from '../equipo/contrato.ts';

/**
 * Cuándo es llegar tarde (V, punto 2 · 0040).
 *
 * Equipo cuenta los retrasos frente al horario de siempre de cada uno, y «tarde»
 * necesita un margen: nadie llama retraso a fichar a las 9:01. **Cinco minutos de
 * fábrica, y cada local lo cambia**, lo decidió Richi el 23 de septiembre de 2026.
 *
 * Va junto a «Dónde está el local» porque las dos cosas deciden cómo se lee un
 * fichaje: dónde se hizo y a qué hora. Lo cambia quien lleva el local, con el
 * mismo permiso que el resto de su ficha, y el servidor lo vuelve a mirar.
 *
 * Cambiarlo **vuelve a contar también lo de antes**: un retraso no se apunta, se
 * cuenta al mirar. Se dice en la propia tarjeta para que nadie se lleve la
 * sorpresa de ver cambiar el mes pasado.
 */
export function CuandoEsLlegarTarde() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  // La misma clave que «Dónde está el local» y que el widget de fichar: un viaje.
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
  /** Lo elegido mientras se guarda: el selector no vuelve atrás mientras tanto. */
  const [guardando, setGuardando] = useState<number | null>(null);
  const [guardado, setGuardado] = useState<number | null>(null);

  if (consulta.isError) return null;
  const margen = consulta.data?.margenDeRetrasoMinutos;

  /**
   * Se guarda al elegir, y **se dice cuando está guardado**. Sin eso, quien elige y
   * se va en el mismo segundo no sabe si se ha quedado, y a veces no se quedaba: lo
   * cazó la prueba de pantalla, que hace eso mismo (reglas 19 y 23).
   */
  async function guardar(minutos: number) {
    setError(null);
    setGuardado(null);
    setGuardando(minutos);
    const respuesta = await cliente.ejecutar<{ minutos: number }>('guardar_margen_de_retraso', {
      minutos,
    });
    setGuardando(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    // Lo guardado se escribe en la caché (regla 20), y lo que cuenta retrasos se
    // vuelve a leer, que ha cambiado con el margen.
    cache.setQueryData<MiFichaje>(['mi_fichaje'], (antes) =>
      antes === undefined ? antes : { ...antes, margenDeRetrasoMinutos: respuesta.datos.minutos },
    );
    setGuardado(respuesta.datos.minutos);
    await Promise.all(
      ['resumen_del_equipo', 'un_indicador'].map((clave) =>
        cache.invalidateQueries({ queryKey: [clave] }),
      ),
    );
  }

  // Un margen puesto a mano en la base que no está en la lista se enseña igual:
  // mejor una opción de más que un selector que miente sobre lo guardado.
  const comoSeDice = (minutos: number) =>
    minutos === 0 ? 'Desde el primer minuto' : `Más de ${minutos} min`;
  const opciones = [...new Set([...MARGENES_DE_RETRASO, ...(margen === undefined ? [] : [margen])])]
    .sort((a, b) => a - b)
    .map((minutos) => ({ valor: String(minutos), texto: comoSeDice(minutos) }));
  const enPantalla = guardando ?? margen;

  return (
    <Tarjeta titulo="Cuándo es llegar tarde">
      <div className="flex flex-col gap-e3">
        {error !== null && (
          <Aviso tono="mal" titulo={error.quePasa}>
            {error.queSePuedeHacer}
          </Aviso>
        )}
        <p className="text-cuerpo">
          Un fichaje de entrada cuenta como retraso si llega después de la hora del horario de
          siempre de esa persona, pasado este margen.
        </p>
        <div className="max-w-[16rem]">
          <Selector
            etiqueta="Cuenta como retraso"
            opciones={opciones}
            value={enPantalla === undefined ? '' : String(enPantalla)}
            disabled={margen === undefined || guardando !== null}
            onChange={(e) => {
              void guardar(Number(e.currentTarget.value));
            }}
          />
        </div>
        <p role="status" className="text-secundario text-bien">
          {guardando !== null
            ? 'Guardando…'
            : guardado !== null
              ? `Guardado: ${comoSeDice(guardado).toLowerCase()}.`
              : ''}
        </p>
        <p className="text-secundario text-texto-suave">
          Con 5 minutos, quien entra a las 9:00 y ficha a las 9:05 llega a tiempo; a las 9:06,
          tarde. Al cambiarlo se vuelven a contar también los días de antes.
        </p>
      </div>
    </Tarjeta>
  );
}
