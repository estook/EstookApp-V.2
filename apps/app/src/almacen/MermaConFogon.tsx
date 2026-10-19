import { useState } from 'react';
import { CREDITOS_DE_FOGON, LETRAS_PARA_FOGON, NOMBRE_DEL_MOTIVO_DE_MERMA } from '@estook/dominio';
import { Boton, CAJA, ErrorEnCristiano, IconoDeFogon } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { Dictar } from '../fogon/Dictar.tsx';
import { FotoParaFogon } from '../fogon/FotoParaFogon.tsx';
import { creditos, type MermaLeida, type MermasLeidas } from '../fogon/contrato.ts';
import { conUnidadDeUso } from './contrato.ts';

/**
 * La merma dicha o por foto (Fogón 1 · 2, decisión 0098).
 *
 * «Se me han caído dos botellas de vino y hay un kilo de tomate pasado»: se dice (o se
 * le hace una foto a lo que se tira) y Fogón lo entiende **casado con tus productos**.
 * Cada cosa que entiende es un botón: al tocarlo, se rellena la hoja de siempre —qué,
 * cuánto y por qué— y la persona pulsa Apuntar. Nada se apunta solo. Con varias cosas,
 * se apunta una y se toca la siguiente.
 */
export function MermaConFogon({ alElegir }: { readonly alElegir: (merma: MermaLeida) => void }) {
  const { cliente } = usarSesion();
  const [dicho, setDicho] = useState('');
  const [entendiendo, setEntendiendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [leidas, setLeidas] = useState<readonly MermaLeida[]>([]);
  const [usadas, setUsadas] = useState<ReadonlySet<number>>(new Set());

  async function pedir(entrada: Record<string, unknown>): Promise<ErrorDeLaApi | null> {
    const respuesta = await cliente.ejecutar<MermasLeidas>('leer_la_merma_con_fogon', entrada);
    if (!respuesta.ok) return respuesta.error;
    setLeidas(respuesta.datos.mermas);
    setUsadas(new Set());
    const primera = respuesta.datos.mermas.find((m) => m.producto !== null);
    if (primera !== undefined) {
      alElegir(primera);
      setUsadas(new Set([respuesta.datos.mermas.indexOf(primera)]));
    }
    return null;
  }

  return (
    <section aria-label="Con Fogón" className="flex flex-col gap-e2 rounded-grande bg-fondo p-e4">
      <p className="flex items-center gap-e2 text-cuerpo font-semibold">
        <span aria-hidden className="text-naranja">
          <IconoDeFogon size={20} />
        </span>
        Dímelo, o hazle una foto
      </p>
      <textarea
        aria-label="Qué se tira"
        value={dicho}
        maxLength={LETRAS_PARA_FOGON}
        rows={2}
        placeholder="Se han caído dos botellas de vino tinto"
        onChange={(e) => {
          setDicho(e.target.value);
        }}
        className={`${CAJA} min-h-[3.25rem] bg-superficie py-e2`}
      />
      <div className="flex flex-wrap items-center gap-e2">
        <Dictar
          alDecir={(texto) => {
            setDicho((antes) =>
              `${antes.trim() === '' ? '' : `${antes.trim()} `}${texto}`.slice(
                0,
                LETRAS_PARA_FOGON,
              ),
            );
          }}
        />
        <Boton
          tono="secundario"
          disabled={dicho.trim().length < 2}
          cargando={entendiendo}
          textoCargando="Fogón está entendiendo"
          onClick={() => {
            setEntendiendo(true);
            setError(null);
            void pedir({ dicho: dicho.trim() }).then((fallo) => {
              setEntendiendo(false);
              setError(fallo);
            });
          }}
        >
          Entenderlo · {creditos(CREDITOS_DE_FOGON.leer_merma_voz)}
        </Boton>
        <FotoParaFogon
          compacto
          titulo="Con una foto"
          ayuda=""
          boton="Con una foto"
          gasta={CREDITOS_DE_FOGON.leer_merma_foto}
          alLeer={(foto) => pedir({ foto })}
        />
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}

      {leidas.length > 0 && (
        <div className="flex flex-col gap-e2">
          <p className="text-secundario text-texto-suave">
            {leidas.length === 1
              ? 'Lo he puesto abajo. Revísalo y pulsa Apuntar.'
              : 'Toca cada una para ponerla abajo; apúntalas de una en una.'}
          </p>
          <ul className="flex flex-col gap-e1">
            {leidas.map((m, i) => (
              <li key={`${m.texto}-${String(i)}`}>
                {m.producto === null ? (
                  <p className="text-secundario text-texto-suave">
                    «{m.texto}»: no sé cuál de tus productos es. Búscalo abajo.
                  </p>
                ) : (
                  <Boton
                    tono={usadas.has(i) ? 'texto' : 'secundario'}
                    onClick={() => {
                      alElegir(m);
                      setUsadas((antes) => new Set([...antes, i]));
                    }}
                  >
                    {m.producto.nombre}
                    {m.cuanto === null
                      ? ''
                      : ` · ${conUnidadDeUso(m.cuanto, m.producto.unidadDeUso)}`}{' '}
                    · {NOMBRE_DEL_MOTIVO_DE_MERMA[m.motivo].toLocaleLowerCase('es')}
                    {usadas.has(i) ? ' ✓' : ''}
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
