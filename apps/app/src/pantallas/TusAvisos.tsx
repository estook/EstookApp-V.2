import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { GRUPOS_DE_AVISOS, type TipoDeAviso } from '@estook/dominio';
import { Cargando, ErrorEnCristiano, Interruptor, Tarjeta, clases } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Ajustes → Avisos (entrega R · decisión 0052).
 *
 * «Puedes elegir cuáles sí y cuáles no desde Ajustes» (Richi, 27-sep). Como en
 * Slack o Linear: **una fila por aviso y dos interruptores**, la campana y el
 * correo, con las columnas rotuladas una vez arriba. Solo salen los que te pueden
 * llegar: a la sala no se le enseña la subida de un precio que no ve.
 *
 * Surte efecto al tocar, sin «Guardar» (es un interruptor). Apagar la campana
 * apaga el correo: un aviso que solo está en el correo no se da por visto en
 * ningún sitio.
 */
interface AvisoElegible {
  readonly tipo: TipoDeAviso;
  readonly nombre: string;
  readonly explica: string;
  readonly grupo: string;
  readonly enLaApp: boolean;
  readonly porCorreo: boolean;
}

interface MisAvisosElegidos {
  readonly avisos: readonly AvisoElegible[];
  readonly correo: string | null;
  readonly hayCorreo: boolean;
  readonly subidaQueAvisa: number | null;
}

const CLAVE = ['mis_avisos_elegidos'] as const;

/** Lo que se ofrece para la subida: de lo que se nota a lo que ya duele. */
const UMBRALES = [3, 5, 8, 10, 15] as const;

export function TusAvisos() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const consulta = useQuery({
    queryKey: CLAVE,
    queryFn: async (): Promise<MisAvisosElegidos> => {
      const respuesta = await cliente.consultar<MisAvisosElegidos>('mis_avisos_elegidos', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
  const datos = consulta.data;

  async function guardar(tipo: TipoDeAviso, enLaApp: boolean, porCorreo: boolean) {
    setError(null);
    const antes = cache.getQueryData<MisAvisosElegidos>(CLAVE);
    // Al momento en pantalla; si no se guarda, vuelve a como estaba.
    if (antes !== undefined) {
      cache.setQueryData<MisAvisosElegidos>(CLAVE, {
        ...antes,
        avisos: antes.avisos.map((a) =>
          a.tipo === tipo ? { ...a, enLaApp, porCorreo: enLaApp && porCorreo } : a,
        ),
      });
    }
    const respuesta = await cliente.ejecutar('guardar_mis_avisos', {
      tipo,
      en_la_app: enLaApp,
      por_correo: porCorreo,
    });
    if (!respuesta.ok) {
      setError(respuesta.error);
      if (antes !== undefined) cache.setQueryData(CLAVE, antes);
    }
  }

  async function ponerUmbral(porcentaje: number) {
    setError(null);
    const respuesta = await cliente.ejecutar('guardar_la_subida_que_avisa', { porcentaje });
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: CLAVE });
  }

  if (consulta.isError) return null;

  const dondeVaElCorreo =
    datos === undefined
      ? null
      : !datos.hayCorreo
        ? 'El correo todavía no está conectado: por ahora, todo llega a la campana.'
        : datos.correo === null
          ? null
          : `Los correos van a ${datos.correo}`;

  return (
    <div className="flex flex-col gap-e4">
      <Tarjeta
        titulo="Qué te llega"
        {...(dondeVaElCorreo === null ? {} : { origen: dondeVaElCorreo })}
      >
        {datos === undefined ? (
          <Cargando que="tus avisos" lineas={3} />
        ) : (
          <div className="flex flex-col gap-e4">
            {error !== null && <ErrorEnCristiano error={error} />}

            {/* Las dos columnas, rotuladas una vez. */}
            <div
              aria-hidden
              className="grid grid-cols-[1fr_56px_56px] items-end gap-e2 text-etiqueta font-semibold text-texto-suave"
            >
              <span />
              <span className="text-center">Campana</span>
              <span className="text-center">Correo</span>
            </div>

            {GRUPOS_DE_AVISOS.map((grupo) => {
              const delGrupo = datos.avisos.filter((a) => a.grupo === grupo);
              if (delGrupo.length === 0) return null;
              return (
                <section key={grupo} aria-label={grupo} className="flex flex-col">
                  <h4 className="pb-e1 text-secundario font-semibold text-texto-suave">{grupo}</h4>
                  <ul className="flex flex-col divide-y divide-borde">
                    {delGrupo.map((aviso) => (
                      <li
                        key={aviso.tipo}
                        className="grid grid-cols-[1fr_56px_56px] items-center gap-e2 py-e3"
                      >
                        <span className="min-w-0">
                          <span className="block text-cuerpo">{aviso.nombre}</span>
                          <span className="block text-etiqueta text-texto-suave">
                            {aviso.explica}
                          </span>
                        </span>
                        <span className="flex justify-center">
                          <Interruptor
                            etiquetaOculta
                            etiqueta={`${aviso.nombre}: en la campana`}
                            puesto={aviso.enLaApp}
                            alCambiar={(puesto) => {
                              void guardar(aviso.tipo, puesto, aviso.porCorreo);
                            }}
                          />
                        </span>
                        <span
                          className={clases('flex justify-center', !aviso.enLaApp && 'opacity-40')}
                        >
                          <Interruptor
                            etiquetaOculta
                            etiqueta={`${aviso.nombre}: también por correo`}
                            puesto={aviso.porCorreo}
                            disabled={!aviso.enLaApp || !datos.hayCorreo}
                            alCambiar={(puesto) => {
                              void guardar(aviso.tipo, aviso.enLaApp, puesto);
                            }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Tarjeta>

      {datos?.subidaQueAvisa !== null && datos?.subidaQueAvisa !== undefined && (
        <div
          id="subida-de-precio"
          className="scroll-mt-[calc(var(--alto-barra-escritorio)+var(--spacing-e4))]"
        >
          <Tarjeta
            titulo="Desde cuánto avisa una subida de precio"
            origen="Para todo el local. Sin IVA, y comparando lo que cuesta cada kilo, litro o unidad."
          >
            <div
              role="radiogroup"
              aria-label="Desde cuánto avisa una subida de precio"
              className="flex flex-wrap gap-e2"
            >
              {[...new Set([...UMBRALES, datos.subidaQueAvisa])]
                .sort((a, b) => a - b)
                .map((umbral) => {
                  const elegido = umbral === datos.subidaQueAvisa;
                  return (
                    <button
                      key={umbral}
                      type="button"
                      role="radio"
                      aria-checked={elegido}
                      onClick={() => {
                        void ponerUmbral(umbral);
                      }}
                      className={clases(
                        'inline-flex min-h-toque items-center rounded-redondo border px-e4 transition-colors',
                        elegido
                          ? 'border-naranja bg-naranja-suave text-texto'
                          : 'border-borde bg-superficie text-texto-suave hover:bg-fondo',
                      )}
                    >
                      {umbral} %
                    </button>
                  );
                })}
            </div>
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
