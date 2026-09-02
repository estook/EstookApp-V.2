import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconoBuscar } from '@estook/iconos';
import { EstadoVacio } from '../componentes/EstadoVacio.tsx';
import { Cargando } from '../componentes/Cargando.tsx';
import { Fila, Grupo } from './FilaDelBuscador.tsx';
import { filtrarPorParecido } from './trigramas.ts';

/**
 * El buscador universal · Parte B5 del Plan.
 *
 * «`⌘K` buscador universal» · «Buscador universal con `pg_trgm` y `unaccent`
 * **que busca tambien acciones**» · «Buscar en el buscador universal: 150 ms»
 * (B7).
 *
 * ── Las dos mitades ──────────────────────────────────────────────────────────
 *
 * Arriba las **acciones**: sitios y botones de la propia aplicacion. Salen al
 * instante, sin pedir nada, porque ya estan en memoria. Escribir «ajus» y darle
 * a `Enter` lleva a Ajustes antes de que el servidor se entere.
 *
 * Debajo los **resultados**: locales, personas y, segun vayan llegando los
 * modulos, productos y platos. Esos los busca Postgres, con las politicas de M1
 * aplicando.
 *
 * Las acciones van primero a proposito: casi siempre lo que se quiere es ir a un
 * sitio, y esperar a la red para eso seria absurdo.
 */
export interface Accion {
  readonly id: string;
  readonly nombre: string;
  /** Donde esta: «Ajustes», «Inventario». Ayuda a distinguir dos parecidas. */
  readonly donde?: string;
  readonly icono?: ReactNode;
  readonly hacer: () => void;
}

export interface ResultadoDeBusqueda {
  readonly tipo: string;
  readonly id: string;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly ir: () => void;
}

export interface BuscadorProps {
  readonly abierto: boolean;
  readonly alCerrar: () => void;
  /** Todo lo que se puede hacer desde aqui. Se filtra en memoria. */
  readonly acciones: readonly Accion[];
  /** Lo que ha traido el servidor para lo escrito. */
  readonly resultados: readonly ResultadoDeBusqueda[];
  readonly buscando?: boolean;
  /** Se llama al escribir, ya con el retardo aplicado por quien lo usa. */
  readonly alEscribir: (texto: string) => void;
  /** Menos de esto no se pregunta al servidor. Lo mismo que exige la API. */
  readonly minimoDeLetras?: number;
}

export function Buscador({
  abierto,
  alCerrar,
  acciones,
  resultados,
  buscando = false,
  alEscribir,
  minimoDeLetras = 2,
}: BuscadorProps) {
  const [escrito, setEscrito] = useState('');
  const [señalado, setSeñalado] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const accionesQueEncajan = useMemo(
    () =>
      filtrarPorParecido(
        acciones,
        escrito,
        // Se puntua **el nombre**; el «donde» solo cuenta si lo contiene. Si se
        // puntuara todo junto, una errata dejaria de encontrar la accion.
        (a) => a.nombre,
        undefined,
        (a) => a.donde ?? '',
      ).slice(0, 5),
    [acciones, escrito],
  );

  // Una sola lista para moverse con las flechas: acciones y resultados seguidos,
  // porque para quien pulsa la flecha abajo esto es una lista, no dos.
  const todo = useMemo(
    () => [
      ...accionesQueEncajan.map((a) => ({ clave: `accion-${a.id}`, hacer: a.hacer })),
      ...resultados.map((r) => ({ clave: `dato-${r.tipo}-${r.id}`, hacer: r.ir })),
    ],
    [accionesQueEncajan, resultados],
  );

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;

    if (abierto && !el.open) {
      setEscrito('');
      setSeñalado(0);
      alEscribir('');
      el.showModal();
      campo.current?.focus();
    }
    if (!abierto && el.open) el.close();
  }, [abierto, alEscribir]);

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    const alCerrarse = () => {
      alCerrar();
    };
    el.addEventListener('close', alCerrarse);
    return () => {
      el.removeEventListener('close', alCerrarse);
    };
  }, [alCerrar]);

  // Al cambiar la lista, el senalado vuelve al principio: si no, se queda
  // apuntando a un hueco que ya no existe.
  useEffect(() => {
    setSeñalado(0);
  }, [escrito]);

  const alPulsarTecla = (evento: React.KeyboardEvent) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (todo.length === 0) return;
      const salto = evento.key === 'ArrowDown' ? 1 : -1;
      setSeñalado((antes) => (antes + salto + todo.length) % todo.length);
      return;
    }

    if (evento.key === 'Enter') {
      evento.preventDefault();
      const elegido = todo[señalado];
      if (!elegido) return;
      alCerrar();
      elegido.hacer();
    }
  };

  const cortito = escrito.trim().length < minimoDeLetras;

  return (
    <dialog
      ref={dialogo}
      aria-label="Buscar en todo"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-charcoal/35"
    >
      <div className="flex h-full w-full justify-center p-e3 pt-[10vh]">
        <div className="flex max-h-[70vh] w-full max-w-[36rem] flex-col overflow-hidden rounded-grande border border-borde bg-superficie shadow-s3">
          <div className="flex items-center gap-e2 border-b border-borde px-e3">
            <IconoBuscar size={20} className="shrink-0 text-texto-suave" />
            <input
              ref={campo}
              type="search"
              value={escrito}
              onChange={(evento) => {
                setEscrito(evento.target.value);
                alEscribir(evento.target.value);
              }}
              onKeyDown={alPulsarTecla}
              // Una etiqueta de verdad, no solo un texto de ejemplo (B8). Y
              // distinta de la del dialogo y de la del boton que lo abre: tres
              // cosas con el mismo nombre son tres cosas que un lector de
              // pantalla no sabe distinguir.
              aria-label="Que quieres buscar"
              placeholder="Busca un local, una persona o una acción"
              className="min-h-toque w-full bg-transparent text-cuerpo outline-none placeholder:text-texto-tenue"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {cortito ? (
              <EstadoVacio
                compacto
                titulo="Escribe para buscar"
                frase={`Con ${minimoDeLetras} letras basta. No hacen falta acentos, y aguanta alguna errata.`}
                sinAccionPorque="También encuentra acciones: «ajustes», «tamaño de letra», el nombre de una app."
              />
            ) : (
              <>
                {accionesQueEncajan.length > 0 && (
                  <Grupo titulo="Acciones">
                    {accionesQueEncajan.map((accion, i) => (
                      <Fila
                        key={accion.id}
                        senalada={i === señalado}
                        titulo={accion.nombre}
                        subtitulo={accion.donde}
                        icono={accion.icono}
                        alPulsar={() => {
                          alCerrar();
                          accion.hacer();
                        }}
                        alSenalar={() => {
                          setSeñalado(i);
                        }}
                      />
                    ))}
                  </Grupo>
                )}

                {buscando && (
                  <div className="p-e4">
                    <Cargando que="los resultados" lineas={2} />
                  </div>
                )}

                {!buscando && resultados.length > 0 && (
                  <Grupo titulo="Resultados">
                    {resultados.map((resultado, i) => (
                      <Fila
                        key={`${resultado.tipo}-${resultado.id}`}
                        senalada={accionesQueEncajan.length + i === señalado}
                        titulo={resultado.titulo}
                        subtitulo={resultado.subtitulo}
                        etiqueta={resultado.tipo}
                        alPulsar={() => {
                          alCerrar();
                          resultado.ir();
                        }}
                        alSenalar={() => {
                          setSeñalado(accionesQueEncajan.length + i);
                        }}
                      />
                    ))}
                  </Grupo>
                )}

                {!buscando && todo.length === 0 && (
                  <EstadoVacio
                    compacto
                    titulo={`No hay nada que se parezca a «${escrito.trim()}»`}
                    frase="Prueba con menos letras, o con el código del local en vez del nombre."
                    sinAccionPorque="Solo se busca en lo que tu acceso alcanza."
                  />
                )}
              </>
            )}
          </div>

          <p className="border-t border-borde px-e3 py-e2 text-etiqueta text-texto-suave">
            Flechas para moverte · Enter para abrir · Esc para cerrar
          </p>
        </div>
      </div>
    </dialog>
  );
}
