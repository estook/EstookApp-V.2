import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  Boton,
  CAJA,
  Campo,
  dentroDelPlano,
  elSitioDeLaMesa,
  Envoltorio,
  ErrorEnCristiano,
  Hoja,
  unSitioLibre,
  type FormaDeMesa,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Tu sala (M20A · 1 · 2, decisión 0106): las zonas y las mesas que ve Estook TPV. **Se
 * dibuja una vez** y se toca poco: la terraza que se abre en verano, una mesa que se
 * junta para siempre.
 *
 * Las mesas se colocan arrastrándolas, con el dedo o con el ratón (y con las flechas del
 * teclado); tocar una la cambia. Se pinta con la misma función que la sala
 * (`elSitioDeLaMesa`), así que donde se deja aquí es donde la ve el camarero.
 */

interface MesaDelPlano {
  readonly id: string;
  readonly nombre: string;
  readonly plazas: number;
  readonly forma: FormaDeMesa;
  readonly x: number;
  readonly y: number;
  readonly abierta: boolean;
}

interface ElPlanoDelLocal {
  readonly puedeEditar: boolean;
  readonly zonas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly orden: number;
    readonly mesas: readonly MesaDelPlano[];
  }[];
}

const CLAVE = ['el_plano_del_local'];
const FORMAS: readonly { valor: FormaDeMesa; texto: string }[] = [
  { valor: 'cuadrada', texto: 'Cuadrada' },
  { valor: 'redonda', texto: 'Redonda' },
  { valor: 'alargada', texto: 'Alargada' },
];

/** El nombre de la mesa nueva: el número siguiente al más alto que haya. */
function elSiguienteNombre(nombres: readonly string[]): string {
  const numeros = nombres.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  return String(numeros.length === 0 ? 1 : Math.max(...numeros) + 1);
}

export function TuSala() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const consulta = useQuery({
    queryKey: CLAVE,
    queryFn: async (): Promise<ElPlanoDelLocal> => {
      const respuesta = await cliente.consultar<ElPlanoDelLocal>('el_plano_del_local');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
  const [zonaElegida, setZonaElegida] = useState<string | null>(null);
  const [nuevaZona, setNuevaZona] = useState<string | null>(null);
  const [tocada, setTocada] = useState<MesaDelPlano | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [haciendo, setHaciendo] = useState(false);
  // Dónde va la mesa que se arrastra, mientras se arrastra.
  const [moviendo, setMoviendo] = useState<{ id: string; x: number; y: number } | null>(null);
  const plano = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ id: string; dx: number; dy: number; seMovio: boolean } | null>(null);

  async function hacer(nombre: string, entrada: unknown): Promise<boolean> {
    setHaciendo(true);
    setFallo(null);
    const respuesta = await cliente.ejecutar(nombre, entrada);
    setHaciendo(false);
    if (!respuesta.ok) {
      setFallo(respuesta.error);
      return false;
    }
    await cache.invalidateQueries({ queryKey: CLAVE });
    return true;
  }

  if (consulta.isError) return null;
  const datos = consulta.data;
  if (datos === undefined) return null;
  const zona = datos.zonas.find((z) => z.id === zonaElegida) ?? datos.zonas[0];
  const todas = datos.zonas.flatMap((z) => z.mesas);

  function enElPlano(evento: PointerEvent): { x: number; y: number } | null {
    const caja = plano.current?.getBoundingClientRect();
    if (caja === undefined || caja.width === 0) return null;
    return {
      x: ((evento.clientX - caja.left) / caja.width) * 1000,
      y: ((evento.clientY - caja.top) / caja.height) * 1000,
    };
  }

  function alPulsar(evento: PointerEvent<HTMLButtonElement>, mesa: MesaDelPlano) {
    if (!datos?.puedeEditar) return;
    const punto = enElPlano(evento);
    if (punto === null) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastre.current = { id: mesa.id, dx: punto.x - mesa.x, dy: punto.y - mesa.y, seMovio: false };
  }

  function alMover(evento: PointerEvent<HTMLButtonElement>, mesa: MesaDelPlano) {
    const yendo = arrastre.current;
    if (yendo?.id !== mesa.id) return;
    const punto = enElPlano(evento);
    if (punto === null) return;
    const destino = dentroDelPlano(mesa.forma, punto.x - yendo.dx, punto.y - yendo.dy);
    if (Math.abs(destino.x - mesa.x) > 8 || Math.abs(destino.y - mesa.y) > 8) yendo.seMovio = true;
    if (yendo.seMovio) setMoviendo({ id: mesa.id, ...destino });
  }

  function alSoltar(mesa: MesaDelPlano) {
    const yendo = arrastre.current;
    arrastre.current = null;
    if (yendo?.id !== mesa.id) return;
    if (!yendo.seMovio || moviendo === null) {
      setMoviendo(null);
      setTocada(mesa);
      return;
    }
    const { x, y } = moviendo;
    void hacer('cambiar_mesa', { mesa_id: mesa.id, x, y }).then(() => {
      setMoviendo(null);
    });
  }

  /** Con el teclado: las flechas la mueven, Intro la abre. */
  function alTeclear(evento: KeyboardEvent<HTMLButtonElement>, mesa: MesaDelPlano) {
    const paso = evento.shiftKey ? 100 : 20;
    const mover: Record<string, [number, number]> = {
      ArrowLeft: [-paso, 0],
      ArrowRight: [paso, 0],
      ArrowUp: [0, -paso],
      ArrowDown: [0, paso],
    };
    const cuanto = mover[evento.key];
    if (cuanto === undefined || !datos?.puedeEditar) return;
    evento.preventDefault();
    const destino = dentroDelPlano(mesa.forma, mesa.x + cuanto[0], mesa.y + cuanto[1]);
    void hacer('cambiar_mesa', { mesa_id: mesa.id, ...destino });
  }

  async function anadirMesa() {
    if (zona === undefined) return;
    const sitio = unSitioLibre('cuadrada', zona.mesas);
    await hacer('crear_mesa', {
      zona_id: zona.id,
      nombre: elSiguienteNombre(todas.map((m) => m.nombre)),
      plazas: 4,
      forma: 'cuadrada',
      ...sitio,
    });
  }

  return (
    <div className="flex flex-col gap-e4">
      <p className="text-texto-suave">
        Las zonas y las mesas que ve el camarero en Estook TPV. Arrastra cada mesa a su sitio;
        tócala para cambiarla.
      </p>

      <div className="flex flex-wrap items-center gap-e2">
        {datos.zonas.map((z) => (
          <button
            key={z.id}
            type="button"
            aria-pressed={zona?.id === z.id}
            onClick={() => {
              setZonaElegida(z.id);
            }}
            className={[
              'min-h-toque rounded-redondo px-e4 font-semibold',
              zona?.id === z.id ? 'bg-charcoal text-white' : 'border border-borde bg-superficie',
            ].join(' ')}
          >
            {z.nombre}
          </button>
        ))}
        {datos.puedeEditar && nuevaZona === null && (
          <Boton
            tono="texto"
            onClick={() => {
              setNuevaZona('');
            }}
          >
            + Zona
          </Boton>
        )}
      </div>

      {nuevaZona !== null && (
        <form
          className="flex flex-wrap items-end gap-e2"
          onSubmit={(e) => {
            e.preventDefault();
            void hacer('crear_zona_de_sala', { nombre: nuevaZona.trim() }).then((bien) => {
              if (bien) setNuevaZona(null);
            });
          }}
        >
          <div className="min-w-[12rem] flex-1">
            <Campo
              etiqueta="Nombre de la zona"
              placeholder="Salón, Terraza, Barra…"
              maxLength={40}
              value={nuevaZona}
              autoFocus
              onChange={(e) => {
                setNuevaZona(e.target.value);
              }}
            />
          </div>
          <Boton
            type="submit"
            tono="principal"
            disabled={nuevaZona.trim() === ''}
            cargando={haciendo}
          >
            Añadir
          </Boton>
          <Boton
            tono="texto"
            onClick={() => {
              setNuevaZona(null);
            }}
          >
            Cancelar
          </Boton>
        </form>
      )}

      {fallo !== null && <ErrorEnCristiano error={fallo} />}

      {zona === undefined ? (
        <p className="rounded-grande bg-fondo p-e4 text-texto-suave">
          Empieza por una zona: el salón, la terraza… y luego sus mesas.
        </p>
      ) : (
        <>
          <div
            ref={plano}
            aria-label={`El plano de ${zona.nombre}`}
            className="relative aspect-[16/10] w-full touch-none select-none rounded-mayor border border-borde bg-fondo"
          >
            {zona.mesas.map((m) => {
              const donde = moviendo?.id === m.id ? moviendo : m;
              const sitio = elSitioDeLaMesa(m.forma, donde.x, donde.y);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-label={`Mesa ${m.nombre}, ${m.plazas} plazas`}
                  onPointerDown={(e) => {
                    alPulsar(e, m);
                  }}
                  onPointerMove={(e) => {
                    alMover(e, m);
                  }}
                  onPointerUp={() => {
                    alSoltar(m);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setTocada(m);
                      return;
                    }
                    alTeclear(e, m);
                  }}
                  style={{
                    left: `${sitio.izquierda}%`,
                    top: `${sitio.arriba}%`,
                    width: `${sitio.ancho}%`,
                    height: `${sitio.alto}%`,
                  }}
                  className={[
                    'absolute flex cursor-grab flex-col items-center justify-center border-2 bg-superficie text-texto shadow-s1 active:cursor-grabbing',
                    m.forma === 'redonda' ? 'rounded-redondo' : 'rounded-grande',
                    moviendo?.id === m.id ? 'border-naranja' : 'border-borde-fuerte',
                  ].join(' ')}
                >
                  <span className="text-seccion font-bold leading-none">{m.nombre}</span>
                  <span className="text-etiqueta text-texto-suave">{m.plazas} pl.</span>
                </button>
              );
            })}
          </div>
          {datos.puedeEditar && (
            <div className="flex flex-wrap gap-e2">
              <Boton
                tono="principal"
                cargando={haciendo}
                onClick={() => {
                  void anadirMesa();
                }}
              >
                Añadir mesa
              </Boton>
              <OpcionesDeLaZona
                zona={zona}
                haciendo={haciendo}
                alRenombrar={(nombre) =>
                  hacer('cambiar_zona_de_sala', { zona_id: zona.id, nombre })
                }
                alArchivar={() => hacer('archivar_zona_de_sala', { zona_id: zona.id })}
              />
            </div>
          )}
        </>
      )}

      {tocada !== null && (
        <LaMesa
          mesa={tocada}
          zonas={datos.zonas}
          zonaId={zona?.id ?? ''}
          puedeEditar={datos.puedeEditar}
          haciendo={haciendo}
          fallo={fallo}
          alCerrar={() => {
            setTocada(null);
            setFallo(null);
          }}
          alGuardar={async (cambios) => {
            if (await hacer('cambiar_mesa', { mesa_id: tocada.id, ...cambios })) setTocada(null);
          }}
          alArchivar={async () => {
            if (await hacer('archivar_mesa', { mesa_id: tocada.id })) setTocada(null);
          }}
        />
      )}
    </div>
  );
}

function OpcionesDeLaZona({
  zona,
  haciendo,
  alRenombrar,
  alArchivar,
}: {
  readonly zona: { readonly nombre: string; readonly mesas: readonly MesaDelPlano[] };
  readonly haciendo: boolean;
  readonly alRenombrar: (nombre: string) => Promise<boolean>;
  readonly alArchivar: () => Promise<boolean>;
}) {
  const [abierta, setAbierta] = useState(false);
  const [nombre, setNombre] = useState(zona.nombre);
  return (
    <>
      <Boton
        tono="secundario"
        onClick={() => {
          setNombre(zona.nombre);
          setAbierta(true);
        }}
      >
        La zona
      </Boton>
      {abierta && (
        <Hoja
          abierta
          titulo={zona.nombre}
          alCerrar={() => {
            setAbierta(false);
          }}
        >
          <div className="flex flex-col gap-e4 pb-e4">
            <Campo
              etiqueta="Nombre"
              maxLength={40}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
              }}
            />
            <div className="flex flex-wrap justify-between gap-e2">
              <Boton
                tono="peligro"
                cargando={haciendo}
                onClick={() => {
                  void alArchivar().then((bien) => {
                    if (bien) setAbierta(false);
                  });
                }}
              >
                Quitar la zona y sus {zona.mesas.length} mesas
              </Boton>
              <Boton
                tono="principal"
                disabled={nombre.trim() === '' || nombre.trim() === zona.nombre}
                cargando={haciendo}
                onClick={() => {
                  void alRenombrar(nombre.trim()).then((bien) => {
                    if (bien) setAbierta(false);
                  });
                }}
              >
                Guardar
              </Boton>
            </div>
          </div>
        </Hoja>
      )}
    </>
  );
}

function LaMesa({
  mesa,
  zonas,
  zonaId,
  puedeEditar,
  haciendo,
  fallo,
  alCerrar,
  alGuardar,
  alArchivar,
}: {
  readonly mesa: MesaDelPlano;
  readonly zonas: ElPlanoDelLocal['zonas'];
  readonly zonaId: string;
  readonly puedeEditar: boolean;
  readonly haciendo: boolean;
  readonly fallo: ErrorDeLaApi | null;
  readonly alCerrar: () => void;
  readonly alGuardar: (cambios: Record<string, unknown>) => Promise<void>;
  readonly alArchivar: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(mesa.nombre);
  const [plazas, setPlazas] = useState(String(mesa.plazas));
  const [forma, setForma] = useState<FormaDeMesa>(mesa.forma);
  const [zona, setZona] = useState(zonaId);
  const cambios: Record<string, unknown> = {
    ...(nombre.trim() !== mesa.nombre ? { nombre: nombre.trim() } : {}),
    ...(Number(plazas) !== mesa.plazas ? { plazas: Number(plazas) } : {}),
    ...(forma !== mesa.forma ? { forma, ...dentroDelPlano(forma, mesa.x, mesa.y) } : {}),
    ...(zona !== zonaId ? { zona_id: zona } : {}),
  };
  const valePlazas = Number(plazas) >= 1 && Number(plazas) <= 50;
  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`Mesa ${mesa.nombre}`}>
      <div className="flex flex-col gap-e4 pb-e4">
        <Campo
          etiqueta="Nombre"
          maxLength={20}
          value={nombre}
          disabled={!puedeEditar}
          onChange={(e) => {
            setNombre(e.target.value);
          }}
        />
        <Campo
          etiqueta="Plazas"
          inputMode="numeric"
          value={plazas}
          disabled={!puedeEditar}
          onChange={(e) => {
            setPlazas(e.target.value.replace(/\D/g, '').slice(0, 2));
          }}
        />
        <fieldset className="flex flex-col gap-e2">
          <legend className="mb-e2 text-secundario font-medium text-texto-suave">Forma</legend>
          <div className="flex flex-wrap gap-e2">
            {FORMAS.map((f) => (
              <button
                key={f.valor}
                type="button"
                aria-pressed={forma === f.valor}
                disabled={!puedeEditar}
                onClick={() => {
                  setForma(f.valor);
                }}
                className={[
                  'min-h-toque rounded-medio px-e4 font-semibold',
                  forma === f.valor
                    ? 'bg-charcoal text-white'
                    : 'border border-borde bg-superficie',
                ].join(' ')}
              >
                {f.texto}
              </button>
            ))}
          </div>
        </fieldset>
        {zonas.length > 1 && (
          <Envoltorio id="zona-de-la-mesa" etiqueta="Zona">
            <select
              id="zona-de-la-mesa"
              className={CAJA}
              value={zona}
              disabled={!puedeEditar}
              onChange={(e) => {
                setZona(e.target.value);
              }}
            >
              {zonas.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </Envoltorio>
        )}
        {mesa.abierta && (
          <p className="text-secundario text-texto-suave">
            Está abierta ahora: para quitarla, libérala antes en Estook TPV.
          </p>
        )}
        {fallo !== null && <ErrorEnCristiano error={fallo} />}
        {puedeEditar && (
          <div className="flex flex-wrap justify-between gap-e2">
            <Boton
              tono="peligro"
              disabled={mesa.abierta}
              cargando={haciendo}
              onClick={() => {
                void alArchivar();
              }}
            >
              Quitar la mesa
            </Boton>
            <Boton
              tono="principal"
              disabled={Object.keys(cambios).length === 0 || !valePlazas || nombre.trim() === ''}
              cargando={haciendo}
              onClick={() => {
                void alGuardar(cambios);
              }}
            >
              Guardar
            </Boton>
          </div>
        )}
      </div>
    </Hoja>
  );
}
