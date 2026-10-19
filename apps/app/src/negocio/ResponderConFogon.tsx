import { useState } from 'react';
import { CREDITOS_DE_FOGON } from '@estook/dominio';
import { Boton, CAJA, ErrorEnCristiano, IconoDeFogon, Tarjeta, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { puedeEditar } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarLectura } from '../ganchos/usarLectura.ts';
import { AvisoDelBorrador } from '../fogon/PedirleAFogon.tsx';
import { creditos, type FogonYYo, type RespuestaALaResena } from '../fogon/contrato.ts';

/**
 * Responder una reseña con Fogón (Fogón 1 · 3, decisión 0098).
 *
 * Leer cada reseña desde Estook espera a que Google apruebe Business Profile (M23).
 * Mientras, **se pega la reseña** (se copia de Google) con sus estrellas, y Fogón
 * escribe la respuesta: agradecida si es buena; si es mala, con disculpas y sin
 * discutir. Se copia de un toque y se publica en Google. Nada sale de Estook solo.
 */
export function ResponderConFogon({ acento }: { readonly acento: string }) {
  const { cliente, permisos } = usarSesion();
  const fogon = usarLectura<FogonYYo>('fogon_y_yo', {});
  const [resena, setResena] = useState('');
  const [estrellas, setEstrellas] = useState(5);
  const [tono, setTono] = useState<'cercano' | 'formal'>('cercano');
  const [respuesta, setRespuesta] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  // Lo escribe quien lleva Negocio: es quien habla en nombre del local.
  if (fogon.data?.habla !== true || !puedeEditar(permisos, 'app.negocio')) return null;

  async function escribir() {
    setEscribiendo(true);
    setError(null);
    setCopiada(false);
    const contesta = await cliente.ejecutar<RespuestaALaResena>('responder_resena_con_fogon', {
      resena: resena.trim(),
      estrellas,
      tono,
    });
    setEscribiendo(false);
    if (!contesta.ok) {
      setError(contesta.error);
      return;
    }
    setRespuesta(contesta.datos.respuesta);
  }

  return (
    <Tarjeta acento={acento}>
      <div className="flex flex-col gap-e3">
        <p className="flex items-center gap-e2 text-cuerpo font-semibold">
          <span aria-hidden className="text-naranja">
            <IconoDeFogon size={20} />
          </span>
          Responder una reseña con Fogón
        </p>
        <p className="text-secundario text-texto-suave">
          Copia la reseña de Google, pégala aquí y Fogón te escribe la respuesta.
        </p>
        <textarea
          aria-label="La reseña"
          value={resena}
          maxLength={2000}
          rows={3}
          placeholder="La comida estupenda, pero tardaron mucho en traer los segundos…"
          onChange={(e) => {
            setResena(e.target.value);
          }}
          className={`${CAJA} min-h-[4.5rem] bg-superficie py-e2`}
        />
        <div className="flex flex-wrap items-center gap-e2" role="group" aria-label="Estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={estrellas === n}
              aria-label={`${String(n)} ${n === 1 ? 'estrella' : 'estrellas'}`}
              onClick={() => {
                setEstrellas(n);
              }}
              className={clases(
                'grid size-toque place-items-center rounded-redondo text-titulo',
                n <= estrellas ? 'text-naranja' : 'text-texto-tenue',
              )}
            >
              ★
            </button>
          ))}
          <span className="ml-auto flex gap-e1">
            {(['cercano', 'formal'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tono === t}
                onClick={() => {
                  setTono(t);
                }}
                className={clases(
                  'min-h-toque rounded-redondo border px-e3 text-secundario',
                  tono === t ? 'border-naranja bg-naranja-suave' : 'border-borde',
                )}
              >
                {t === 'cercano' ? 'Cercano' : 'Formal'}
              </button>
            ))}
          </span>
        </div>
        {error !== null && <ErrorEnCristiano error={error} />}
        <div>
          <Boton
            tono="secundario"
            disabled={resena.trim().length < 3}
            cargando={escribiendo}
            textoCargando="Fogón está escribiendo"
            onClick={() => {
              void escribir();
            }}
          >
            Escribir la respuesta · {creditos(CREDITOS_DE_FOGON.responder_resena)}
          </Boton>
        </div>

        {respuesta !== '' && (
          <div className="flex flex-col gap-e2">
            <textarea
              aria-label="La respuesta"
              value={respuesta}
              rows={5}
              onChange={(e) => {
                setRespuesta(e.target.value);
              }}
              className={`${CAJA} min-h-[7rem] bg-superficie py-e2`}
            />
            <AvisoDelBorrador />
            <div>
              <Boton
                tono="principal"
                onClick={() => {
                  void navigator.clipboard.writeText(respuesta).then(() => {
                    setCopiada(true);
                  });
                }}
              >
                {copiada ? 'Copiada: pégala en Google' : 'Copiar la respuesta'}
              </Boton>
            </div>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}
