import { useState } from 'react';
import {
  BULTOS,
  ENVASES,
  enPlural,
  presentacionDe,
  type ComoSeCompra,
  type ModoDeCompra,
  type UnidadDelContenido,
} from '@estook/dominio';
import { Campo, Interruptor, Selector, clases } from '@estook/ui';
import { Cuantos } from '../compras/Comun.tsx';

/**
 * «¿Cómo lo compras?» · tres respuestas, y la cuenta hecha (M7, repaso).
 *
 * «Si compran fruta, por kilo; leche, por litro; el queso azul viene en envases
 *  de 250 g. Que el hostelero elija lo que más le valga, rápido y lógico, que no
 *  cueste entenderlo. No explicándolo con texto sino con un buen diseño.»
 *
 * Por eso son **tres tarjetas** con su ejemplo debajo, y según la que se toque,
 * las dos o tres preguntas que tocan —ni una más— y una línea con lo que se va a
 * guardar: «Caja de 6 paquetes de 250 g · 1,5 kg en total». Lo que no se pregunta
 * lo decide `presentacionDe`, en el dominio: en qué se cuenta, cuánto trae lo que
 * se compra y cómo se llama.
 *
 * Con género ya apuntado, **la forma no se cambia** —el libro está en esa
 * unidad— y se dice, en vez de dejar tocar algo que el servidor va a rechazar.
 */
const MODOS: readonly { valor: ModoDeCompra; titulo: string; ejemplo: string }[] = [
  { valor: 'peso', titulo: 'Por peso', ejemplo: 'Fruta, carne, pescado' },
  { valor: 'volumen', titulo: 'Por litros', ejemplo: 'Aceite, leche a granel' },
  { valor: 'unidades', titulo: 'Por unidades', ejemplo: 'Paquetes, latas, botellas, huevos' },
];

function numero(escrito: string): number | null {
  const limpio = escrito.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function comoTexto(n: number | null): string {
  return n === null ? '' : String(n).replace('.', ',');
}

export function ComoLoCompras({
  valor,
  alCambiar,
  formaFija = false,
}: {
  readonly valor: ComoSeCompra;
  readonly alCambiar: (como: ComoSeCompra) => void;
  /** Con género apuntado: la forma de contar no se toca. */
  readonly formaFija?: boolean;
}) {
  // Lo escrito se guarda como texto mientras se escribe: «0,» no es un número
  // todavía, y convertirlo a cada tecla borraría la coma.
  const [porBulto, setPorBulto] = useState(comoTexto(valor.porBulto));
  const [contenido, setContenido] = useState(comoTexto(valor.contenido?.cantidad ?? null));
  // La medida se recuerda aparte: elegir «ml» antes de escribir la cifra no
  // puede volver a «g» porque todavía no haya cifra.
  const [medida, setMedida] = useState<UnidadDelContenido>(valor.contenido?.unidad ?? 'g');

  const presentacion = presentacionDe(valor);
  const grande = valor.modo === 'volumen' ? 'l' : 'kg';

  function elegirModo(modo: ModoDeCompra) {
    if (formaFija || modo === valor.modo) return;
    setPorBulto(modo === 'unidades' ? '1' : '');
    setContenido('');
    alCambiar({
      modo,
      unidad: modo === 'peso' ? 'kg' : modo === 'volumen' ? 'l' : 'ud',
      porBulto: modo === 'unidades' ? 1 : null,
      envase: modo === 'unidades' ? 'Unidad' : modo === 'volumen' ? 'Garrafa' : 'Caja',
      contenido: null,
    });
  }

  return (
    <div className="flex flex-col gap-e3">
      <div>
        <p id="como-lo-compras" className="text-etiqueta uppercase tracking-wide text-texto-suave">
          ¿Cómo lo compras?
        </p>
        <div
          role="radiogroup"
          aria-labelledby="como-lo-compras"
          className="mt-e2 grid gap-e2 sm:grid-cols-3"
        >
          {MODOS.map((modo) => {
            const puesta = modo.valor === valor.modo;
            return (
              <button
                key={modo.valor}
                type="button"
                role="radio"
                aria-checked={puesta}
                disabled={formaFija && !puesta}
                onClick={() => {
                  elegirModo(modo.valor);
                }}
                className={clases(
                  'flex min-h-toque flex-col items-start gap-e1 rounded-medio border p-e3 text-left',
                  puesta
                    ? 'border-naranja bg-naranja-suave'
                    : 'border-borde-fuerte bg-superficie hover:bg-fondo disabled:opacity-40',
                )}
              >
                <span className="text-cuerpo font-semibold">{modo.titulo}</span>
                <span className="text-secundario text-texto-suave">{modo.ejemplo}</span>
              </button>
            );
          })}
        </div>
        {formaFija && (
          <p className="mt-e2 text-secundario text-texto-suave">
            Ya tiene género apuntado en {valor.unidad}: se sigue contando igual. Lo que sí se cambia
            es cómo te lo traen.
          </p>
        )}
      </div>

      {valor.modo === 'unidades' ? (
        <>
          <div className="grid gap-e3 sm:grid-cols-2">
            <Selector
              etiqueta="Cómo viene cada una"
              opciones={ENVASES.map((e) => ({ valor: e, texto: e === 'Unidad' ? 'Suelta' : e }))}
              value={valor.envase}
              onChange={(e) => {
                alCambiar({ ...valor, envase: e.currentTarget.value });
              }}
            />
            <div className="grid grid-cols-[1fr_auto] items-end gap-e2">
              <Campo
                etiqueta="Qué trae cada una"
                tipo="numero"
                ayuda="Opcional: 250 g, 1 l. Así sé a cuánto sale el kilo."
                value={contenido}
                onChange={(e) => {
                  const escrito = e.currentTarget.value;
                  setContenido(escrito);
                  const n = numero(escrito);
                  alCambiar({
                    ...valor,
                    contenido: n === null ? null : { cantidad: n, unidad: medida },
                  });
                }}
              />
              <Selector
                etiqueta="Medida"
                opciones={(['g', 'kg', 'ml', 'l'] as const).map((u) => ({ valor: u, texto: u }))}
                value={medida}
                onChange={(e) => {
                  const unidad = e.currentTarget.value as UnidadDelContenido;
                  setMedida(unidad);
                  const n = numero(contenido);
                  alCambiar({ ...valor, contenido: n === null ? null : { cantidad: n, unidad } });
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-e1">
            <span className="text-etiqueta uppercase tracking-wide text-texto-suave">
              Cuántas vienen en cada caja
            </span>
            <Cuantos
              etiqueta="Cuántas vienen en cada caja"
              valor={valor.porBulto ?? 1}
              detras={
                (valor.porBulto ?? 1) <= 1
                  ? 'de una en una'
                  : enPlural(valor.envase === 'Unidad' ? 'Unidad' : valor.envase)
              }
              alCambiar={(n) => {
                alCambiar({ ...valor, porBulto: Math.max(1, Math.trunc(n)) });
              }}
            />
          </div>
        </>
      ) : (
        <>
          <Interruptor
            etiqueta={
              valor.modo === 'peso'
                ? 'Viene en cajas o sacos de un peso fijo'
                : 'Viene en garrafas o bidones de un tamaño fijo'
            }
            puesto={valor.porBulto !== null}
            alCambiar={(puesto) => {
              if (!puesto) {
                // Lo escrito se queda: volver a encenderlo lo recupera.
                alCambiar({ ...valor, porBulto: null });
                return;
              }
              const n = numero(porBulto) ?? 5;
              setPorBulto(comoTexto(n));
              alCambiar({ ...valor, porBulto: n });
            }}
          />
          {valor.porBulto !== null && (
            <div className="grid gap-e3 sm:grid-cols-2">
              <Selector
                etiqueta="Cómo viene"
                opciones={BULTOS.map((b) => ({ valor: b, texto: b }))}
                value={valor.envase}
                onChange={(e) => {
                  alCambiar({ ...valor, envase: e.currentTarget.value });
                }}
              />
              <Campo
                etiqueta={`Cuánto trae cada ${valor.envase.toLowerCase()}`}
                tipo="numero"
                detras={grande}
                value={porBulto}
                onChange={(e) => {
                  const escrito = e.currentTarget.value;
                  setPorBulto(escrito);
                  const n = numero(escrito);
                  if (n !== null) alCambiar({ ...valor, porBulto: n });
                }}
              />
            </div>
          )}
        </>
      )}

      <p aria-live="polite" className="rounded-medio bg-fondo px-e3 py-e2 text-cuerpo">
        {presentacion.resumen}
      </p>
    </div>
  );
}
