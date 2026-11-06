import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { IconoHecho } from '@estook/iconos';
import { Boton, Cargando, ErrorEnCristiano, Hoja } from '@estook/ui';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import type { LaMesa } from '../datos/tipos.ts';
import {
  losGruposParaServir,
  loQueDiceElBoton,
  type PlatoParaServir,
} from '../logica/loServido.ts';

/**
 * **Servido** (R2 · 2, decisión 0132; maqueta del 5-nov, punto 1.2): el ticket de la mesa con
 * **casillas grandes**, para marcar lo que se acaba de llevar. Lo que espera a marchar se ve
 * apagado; lo ya servido, marcado (y lo que marcó la sala se puede desmarcar). «Todo el 2.º»
 * marca un pase entero de un toque. La cocina lo ve al momento, en verde, con «Deshacer».
 */
export function LoServido({
  titulo,
  mesa,
  alVolver,
  alAcabar,
}: {
  readonly titulo: string;
  readonly mesa: LaMesa | undefined;
  readonly alVolver: () => void;
  readonly alAcabar: () => void;
}) {
  const ejecutar = usarAcciones();
  const [marcar, setMarcar] = useState<ReadonlySet<string>>(new Set());
  const [desmarcar, setDesmarcar] = useState<ReadonlySet<string>>(new Set());
  const [haciendo, setHaciendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const grupos = mesa === undefined ? [] : losGruposParaServir(mesa);
  const boton = loQueDiceElBoton(marcar.size, desmarcar.size);

  function cambiar(conjunto: ReadonlySet<string>, id: string): ReadonlySet<string> {
    const nuevo = new Set(conjunto);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    return nuevo;
  }

  function tocar(p: PlatoParaServir) {
    if (p.como === 'por_servir') setMarcar((antes) => cambiar(antes, p.id));
    else if (p.como === 'servido' && p.deLaSala) setDesmarcar((antes) => cambiar(antes, p.id));
  }

  async function guardar() {
    if (mesa === undefined) return;
    setHaciendo(true);
    setFallo(null);
    const hecho = await ejecutar('marcar_servido', {
      cuenta_id: mesa.cuentaId,
      ...(marcar.size === 0 ? {} : { servidos: [...marcar] }),
      ...(desmarcar.size === 0 ? {} : { no_servidos: [...desmarcar] }),
    });
    setHaciendo(false);
    if (hecho.ok) alAcabar();
    else setFallo(hecho.error);
  }

  return (
    <Hoja
      abierta
      ajustada
      alCerrar={alVolver}
      titulo={`Servido · ${titulo}`}
      pie={
        <Boton
          tono="principal"
          tamano="l"
          ancho
          disabled={boton === null}
          cargando={haciendo}
          onClick={() => void guardar()}
        >
          {boton ?? 'Marca lo que has llevado'}
        </Boton>
      }
    >
      <p className="mb-e3 mt-e2 text-secundario text-texto-suave">
        Marca lo que acabas de llevar a la mesa
      </p>
      {fallo !== null && (
        <div className="mb-e3">
          <ErrorEnCristiano error={fallo} />
        </div>
      )}
      {mesa === undefined ? (
        <Cargando que="los platos de la mesa" forma="lista" lineas={3} />
      ) : grupos.length === 0 ? (
        <p className="py-e5 text-center text-texto-suave">
          Aún no hay nada mandado que se pueda marcar.
        </p>
      ) : (
        <div className="flex flex-col gap-e4 pb-e2">
          {grupos.map((g) => {
            const porServir = g.platos.filter((p) => p.como === 'por_servir');
            return (
              <div key={g.clave} className="flex flex-col gap-e1">
                <div className="flex items-center justify-between gap-e2">
                  <h3 className="text-etiqueta font-bold uppercase tracking-wide text-texto-suave">
                    {g.titulo}
                  </h3>
                  {porServir.length > 1 && (
                    <Boton
                      tono="secundario"
                      tamano="s"
                      onClick={() => {
                        setMarcar((antes) => new Set([...antes, ...porServir.map((p) => p.id)]));
                      }}
                    >
                      {g.clave === 'barra' ? 'Todas' : `Todo el ${g.titulo.split(' · ')[0] ?? ''}`}
                    </Boton>
                  )}
                </div>
                {g.platos.map((p) => {
                  const puesta = p.como === 'servido' ? !desmarcar.has(p.id) : marcar.has(p.id);
                  const sePuede = p.como === 'por_servir' || (p.como === 'servido' && p.deLaSala);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="checkbox"
                      aria-checked={puesta}
                      disabled={!sePuede}
                      onClick={() => {
                        tocar(p);
                      }}
                      className={[
                        'flex min-h-toque-cocina items-center gap-e3 rounded-grande px-e2 text-left',
                        sePuede ? 'hover:bg-fondo' : '',
                        p.como === 'espera' ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden
                        className={[
                          'flex size-9 shrink-0 items-center justify-center rounded-medio border-2',
                          puesta ? 'border-bien bg-bien text-fondo' : 'border-borde bg-superficie',
                        ].join(' ')}
                      >
                        {puesta && <IconoHecho size={22} strokeWidth={3} />}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className={p.como === 'servido' && puesta ? 'text-texto-suave' : ''}>
                          <b>{p.cantidad}</b> {p.nombre}
                        </span>
                        {(p.detalle !== null || p.como !== 'por_servir') && (
                          <span className="text-secundario text-texto-suave">
                            {[
                              p.detalle,
                              p.como === 'espera'
                                ? 'espera a marchar'
                                : p.como === 'servido' && !p.deLaSala
                                  ? 'lo tachó cocina'
                                  : null,
                            ]
                              .filter((x) => x !== null)
                              .join(' · ')}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </Hoja>
  );
}
