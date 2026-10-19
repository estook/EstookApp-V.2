import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CREDITOS_DE_FOGON, cuandoFue } from '@estook/dominio';
import { IconoAtencion, IconoBien } from '@estook/iconos';
import { Boton, ErrorEnCristiano, IconoDeFogon } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { creditos, type RevisionDeFogon } from './contrato.ts';

/**
 * «Revisar mis datos» (Fogón 1 · 3, decisión 0098), arriba de la ventana de Fogón, para
 * quien lleva el almacén.
 *
 * Lo mismo que hace el reloj la noche del domingo al lunes, cuando se quiera: platos sin
 * escandallo, productos sin precio (las reglas, gratis) y, con la IA, productos
 * repetidos y pasos que no cuadran. **Vigila los datos, nunca a las personas** (0095).
 * Plegado de entrada, con lo último que encontró en una línea; el aviso de la campana lo
 * abre desplegado.
 */
export function RevisionEnFogon({
  desplegada: alAbrir,
  alIr,
}: {
  /** Si se abre ya desplegada (desde el aviso de la campana). */
  readonly desplegada: boolean;
  /** Ir a arreglar algo: cierra Fogón. */
  readonly alIr: () => void;
}) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const navegar = useNavigate();
  const consulta = usarLectura<{ revision: RevisionDeFogon | null }>('la_revision_de_fogon');
  const [desplegada, setDesplegada] = useState(alAbrir);
  const [revisando, setRevisando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const revision = consulta.data?.revision ?? null;
  const cuantas = revision?.hallazgos.length ?? 0;

  async function revisar() {
    setRevisando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<RevisionDeFogon>('revisar_mis_datos_con_fogon', {});
    setRevisando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    setDesplegada(true);
    await cache.invalidateQueries({ queryKey: ['la_revision_de_fogon'] });
    await cache.invalidateQueries({ queryKey: ['fogon_y_yo'] });
  }

  const resumen =
    revision === null
      ? 'Busca productos repetidos, platos sin escandallo y lo que no cuadra.'
      : cuantas === 0
        ? `Todo en orden · ${cuandoFue(new Date(revision.hechaEn), new Date(Date.now()))}`
        : `${cuantas === 1 ? '1 cosa' : `${String(cuantas)} cosas`} que mirar · ${cuandoFue(new Date(revision.hechaEn), new Date(Date.now()))}`;

  return (
    <section
      aria-label="Revisar mis datos"
      className="flex flex-col gap-e2 rounded-grande border border-borde bg-fondo p-e3"
    >
      <button
        type="button"
        aria-expanded={desplegada}
        onClick={() => {
          setDesplegada((antes) => !antes);
        }}
        className="flex min-h-toque items-center gap-e2 text-left"
      >
        <span aria-hidden className="text-naranja">
          <IconoDeFogon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-cuerpo font-semibold">Revisar mis datos</span>
          <span className="block text-secundario text-texto-suave">{resumen}</span>
        </span>
      </button>

      {desplegada && (
        <div className="flex flex-col gap-e3">
          {revision !== null && cuantas > 0 && (
            <ul className="flex flex-col gap-e2">
              {revision.hallazgos.map((h) => (
                <li key={`${h.que}-${h.texto}`} className="flex items-start gap-e2">
                  <span aria-hidden className="mt-[2px] shrink-0 text-atencion">
                    <IconoAtencion size={16} />
                  </span>
                  <span className="min-w-0 flex-1 text-secundario">
                    {h.texto}{' '}
                    <button
                      type="button"
                      className="font-semibold text-naranja underline"
                      onClick={() => {
                        alIr();
                        navegar(h.ir);
                      }}
                    >
                      Ir
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {revision !== null && cuantas === 0 && (
            <p className="flex items-center gap-e2 text-secundario text-texto-suave">
              <IconoBien size={16} /> No ha encontrado nada que mirar.
            </p>
          )}
          {revision?.soloReglas === true && (
            <p className="text-etiqueta text-texto-tenue">
              Esta vez solo con las reglas: Fogón no tenía créditos para lo demás.
            </p>
          )}
          {error !== null && <ErrorEnCristiano error={error} />}
          <div>
            <Boton
              tono="secundario"
              cargando={revisando}
              textoCargando="Fogón está revisando"
              onClick={() => {
                void revisar();
              }}
            >
              Revisar ahora · {creditos(CREDITOS_DE_FOGON.revisar_datos)}
            </Boton>
          </div>
          <p className="text-etiqueta text-texto-tenue">
            Fogón lo revisa solo cada lunes de madrugada y te avisa si encuentra algo.
          </p>
        </div>
      )}
    </section>
  );
}
