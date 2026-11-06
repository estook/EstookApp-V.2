import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, Cargando, ErrorEnCristiano, filtrarPorParecido } from '@estook/ui';
import { usarAcciones, usarLaCarta } from '../ganchos/usarLaSala.ts';
import type { PlatoDeLaSala } from '../datos/tipos.ts';
import { lasOpcionesParaCambiar, type ParaCambiar } from '../logica/cambiarElPlato.ts';
import type { LineaALaVista } from '../logica/laCuenta.ts';
import { euros } from '../logica/texto.ts';
import { LoQueSeElige } from './LoQueSeElige.tsx';

/**
 * **Cambiar un plato** (R2 · 2, decisión 0132; maqueta del 5-nov, punto 8.1): «quiere bravas en
 * vez de croquetas». **Sin PIN, nunca** (Richi: «en un servicio cada segundo es oro»).
 *
 *   · primero **los de su misma sección** (un entrante por otro, que es lo normal); en un menú,
 *     los de su sección de hoy; y el buscador para lo demás
 *   · elegido, abajo se dice qué pasa: la cocina lo ve como CAMBIO y la cuenta sube o baja
 *   · **«¿Ya estaba hecho?»** solo si está en marcha y no ha salido: dos botones grandes, y el
 *     toque ya lo cambia. Si lo estaba, va a merma como «cambio del cliente». Lo contesta el
 *     camarero, que es quien pregunta en el pase: la cocina no toca nada (Richi, 5-nov)
 */
export function CambiarElPlato({
  linea,
  alCambiar,
}: {
  readonly linea: LineaALaVista;
  readonly alCambiar: () => void;
}) {
  const ejecutar = usarAcciones();
  const carta = usarLaCarta();
  const [buscando, setBuscando] = useState('');
  const [elegido, setElegido] = useState<ParaCambiar | null>(null);
  const [eligiendo, setEligiendo] = useState<PlatoDeLaSala | null>(null);
  const [lo, setLo] = useState<{
    opciones: readonly string[];
    pesoGramos: number | null;
    precioCentimos: number;
  } | null>(null);
  const [haciendo, setHaciendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  // Si mientras tanto la cocina lo empezó, Estook lo pregunta aunque aquí no tocara.
  const [preguntar, setPreguntar] = useState(
    linea.estado === 'en_marcha' || linea.estado === 'en_la_barra',
  );

  if (carta.data === undefined) return <Cargando que="la carta" forma="lista" lineas={4} />;
  const { cercanos, todos } = lasOpcionesParaCambiar(carta.data, linea);
  const buscado = buscando.trim();
  const lista = buscado === '' ? cercanos : filtrarPorParecido(todos, buscado, (p) => p.nombre);

  function elegir(p: ParaCambiar) {
    setFallo(null);
    // Lo que pregunta algo al pedirlo (la guarnición, lo que pesa), se pregunta aquí también.
    if (p.plato !== null && ((p.plato.grupos ?? []).length > 0 || p.plato.aPeso === true)) {
      setEligiendo(p.plato);
      setElegido(p);
      return;
    }
    setElegido(p);
    setLo(null);
  }

  async function cambiar(estabaHecho?: boolean) {
    if (elegido === null) return;
    setHaciendo(true);
    setFallo(null);
    const hecho = await ejecutar('cambiar_un_plato', {
      linea_id: linea.id,
      por: {
        id: crypto.randomUUID(),
        plato_id: elegido.id,
        ...(lo === null || lo.opciones.length === 0 ? {} : { opciones: lo.opciones }),
        ...(lo?.pesoGramos == null ? {} : { peso_gramos: lo.pesoGramos }),
      },
      ...(estabaHecho === undefined ? {} : { estaba_hecho: estabaHecho }),
    });
    setHaciendo(false);
    if (hecho.ok) {
      alCambiar();
      return;
    }
    const campos = hecho.error.detalle?.['campos'];
    if (Array.isArray(campos) && campos.includes('estaba_hecho')) setPreguntar(true);
    else setFallo(hecho.error);
  }

  const precioNuevo = (lo?.precioCentimos ?? elegido?.precioCentimos ?? 0) * linea.cantidad;
  const diferencia = elegido === null ? 0 : precioNuevo - (linea.importeCentimos ?? 0);
  const queCambia =
    diferencia === 0
      ? 'La cuenta no cambia.'
      : diferencia > 0
        ? `La cuenta sube ${euros(diferencia)} €.`
        : `La cuenta baja ${euros(-diferencia)} €.`;
  const yaMandado = linea.estado !== null && linea.estado !== 'sin_mandar';

  return (
    <div className="flex flex-col gap-e3">
      <input
        type="search"
        aria-label="Buscar en la carta"
        placeholder="Buscar en la carta…"
        value={buscando}
        onChange={(e) => {
          setBuscando(e.target.value);
        }}
        className="min-h-toque w-full rounded-redondo border border-borde bg-fondo px-e4"
      />
      {lista.length === 0 ? (
        <p className="py-e4 text-center text-texto-suave">
          {buscado === ''
            ? 'Busca el plato por el que lo cambian.'
            : `Nada se parece a «${buscado}».`}
        </p>
      ) : (
        <div
          className="flex max-h-[40vh] flex-col overflow-y-auto"
          role="radiogroup"
          aria-label="Cambiar por"
        >
          {lista.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={elegido?.id === p.id}
              disabled={p.agotado}
              onClick={() => {
                elegir(p);
              }}
              className={[
                'flex min-h-toque items-center justify-between gap-e3 rounded-medio px-e3 text-left disabled:opacity-45',
                elegido?.id === p.id
                  ? 'bg-naranja-suave font-bold ring-2 ring-naranja'
                  : 'hover:bg-fondo',
              ].join(' ')}
            >
              <span>
                {p.nombre}
                {p.agotado && <span className="text-secundario"> · agotado</span>}
              </span>
              <span className="tabular-nums">
                {p.precioCentimos === 0 && linea.menuDelPlato !== null
                  ? 'incluido'
                  : `${linea.menuDelPlato !== null ? '+' : ''}${euros(p.precioCentimos)}`}
              </span>
            </button>
          ))}
        </div>
      )}

      {fallo !== null && <ErrorEnCristiano error={fallo} />}

      {elegido !== null && (
        <div className="flex flex-col gap-e3 border-t border-borde pt-e3">
          <p className="text-secundario text-texto-suave">
            {yaMandado ? 'La cocina lo verá como CAMBIO, con su sonido. ' : ''}
            {queCambia}
          </p>
          {preguntar ? (
            <>
              <p className="font-bold">
                ¿Ya estaba hecho?{' '}
                <span className="font-normal text-texto-suave">Si lo estaba, va a merma.</span>
              </p>
              <div className="grid grid-cols-2 gap-e2">
                <Boton
                  tono="secundario"
                  tamano="l"
                  cargando={haciendo}
                  onClick={() => void cambiar(false)}
                >
                  No, aún no
                </Boton>
                <Boton
                  tono="secundario"
                  tamano="l"
                  cargando={haciendo}
                  onClick={() => void cambiar(true)}
                >
                  Sí, ya estaba
                </Boton>
              </div>
            </>
          ) : (
            <Boton
              tono="principal"
              tamano="l"
              ancho
              cargando={haciendo}
              onClick={() => void cambiar()}
            >
              Cambiar por {elegido.nombre}
            </Boton>
          )}
        </div>
      )}

      {eligiendo !== null && (
        <LoQueSeElige
          plato={eligiendo}
          alCerrar={() => {
            setEligiendo(null);
            setElegido(null);
          }}
          alElegir={(e) => {
            setLo({
              opciones: e.opciones.map((o) => o.id),
              pesoGramos: e.pesoGramos,
              precioCentimos: e.precioCentimos,
            });
            setEligiendo(null);
          }}
        />
      )}
    </div>
  );
}
