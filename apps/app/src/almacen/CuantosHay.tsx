import { useState } from 'react';
import { Boton, Botones, Campo, FotoDeProducto, clases } from '@estook/ui';
import { conUnidadDeUso, type ProductoEnLista } from './contrato.ts';
import {
  juntarLoContado,
  nombreDelEnvase,
  numeroEscrito,
  seCuentaEnCajas,
  type LoEscrito,
} from './contratoDelInventario.ts';
import { limpiarElCodigo } from '../lector/codigos.ts';
import { loContadoEnUnidades } from '@estook/dominio';

/**
 * «¿Cuántos hay?» · lo que pregunta escanear en el inventario (repaso del 9-oct, punto 1).
 *
 * «Si tienes mil unidades te hace pasarlo mil veces: mejor que te pregunte cuántas
 * hay, o en el método de medida elegido.» Escanear dice **qué** es; cuántos se
 * escribe una vez, como esté en la estantería: en cajas y sueltas, en kilos o en
 * unidades, lo que diga la ficha del producto.
 *
 * Si ya estaba contado, lo nuevo **se suma** (la misma leche en dos estanterías), y
 * se puede cambiar a «sustituir» con un toque.
 *
 * Un lector de mano escribe donde esté el cursor: si lo que llega a la casilla es el
 * código de otro producto, no es una cantidad, es la siguiente lectura (`alLeerOtro`).
 */
export function CuantosHay({
  producto,
  llevabas,
  alGuardar,
  alCancelar,
  alLeerOtro,
}: {
  readonly producto: ProductoEnLista;
  readonly llevabas: LoEscrito | undefined;
  readonly alGuardar: (escrito: LoEscrito) => void;
  readonly alCancelar: () => void;
  /** Lo escrito en la casilla era un código de barras: otra lectura. */
  readonly alLeerOtro?: (codigo: string) => void;
}) {
  const enCajas = seCuentaEnCajas(producto);
  const [escrito, setEscrito] = useState<LoEscrito>({});
  const [sumar, setSumar] = useState(true);

  const antes = cuantoHayEn(producto, llevabas);
  const ahora = cuantoHayEn(producto, escrito);
  const total =
    ahora === null ? null : cuantoHayEn(producto, juntarLoContado(llevabas, escrito, sumar));

  function guardar() {
    // Un lector de mano que escribe en la casilla: 8 cifras o más no son una cantidad.
    const enLaCasilla = escrito.hay ?? escrito.formatos ?? escrito.sueltas ?? '';
    const codigo = /^\d{8,}$/.test(enLaCasilla.trim()) ? limpiarElCodigo(enLaCasilla) : null;
    if (codigo !== null && alLeerOtro !== undefined) {
      // Si el código no es de ningún producto, la pregunta sigue: sin sus cifras dentro.
      setEscrito({});
      alLeerOtro(codigo);
      return;
    }
    if (ahora === null) return;
    alGuardar(juntarLoContado(llevabas, escrito, sumar));
  }

  const escribir = (campo: keyof LoEscrito) => (e: { currentTarget: HTMLInputElement }) => {
    const valor = e.currentTarget.value;
    setEscrito((todo) => ({ ...todo, [campo]: valor }));
  };

  return (
    <form
      aria-label={`Cuántos hay de ${producto.nombre}`}
      className="flex flex-col gap-e3 rounded-grande border border-borde bg-superficie p-e3 shadow-s1"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <div className="flex items-center gap-e3">
        <FotoDeProducto
          nombre={producto.nombre}
          categoria={producto.categoria}
          enlace={producto.miniatura}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-cuerpo font-semibold">{producto.nombre}</span>
          <span className="block text-etiqueta text-texto-tenue">
            {producto.formato ?? producto.unidadDeUso}
          </span>
        </span>
      </div>

      {enCajas ? (
        <div className="grid grid-cols-2 gap-e2">
          <Campo
            id="cuantos-hay-formatos"
            etiqueta={nombreDelEnvase(producto.formato)}
            tipo="numero"
            inputMode="decimal"
            autoFocus
            value={escrito.formatos ?? ''}
            onChange={escribir('formatos')}
          />
          <Campo
            id="cuantos-hay-sueltas"
            etiqueta="Sueltas"
            tipo="numero"
            inputMode="decimal"
            detras={producto.unidadDeUso}
            value={escrito.sueltas ?? ''}
            onChange={escribir('sueltas')}
          />
        </div>
      ) : (
        <Campo
          id="cuantos-hay"
          etiqueta="¿Cuántos hay?"
          tipo="numero"
          inputMode="decimal"
          autoFocus
          detras={producto.unidadDeUso}
          value={escrito.hay ?? ''}
          onChange={escribir('hay')}
        />
      )}

      {antes !== null && (
        <div className="flex flex-wrap items-center gap-e2 text-secundario">
          <span className="text-texto-suave">
            Llevabas {conUnidadDeUso(antes, producto.unidadDeUso)}
          </span>
          <span role="radiogroup" aria-label="Con lo que llevabas" className="flex gap-e1">
            {[
              { valor: true, texto: 'Sumar' },
              { valor: false, texto: 'Sustituir' },
            ].map((opcion) => (
              <button
                key={opcion.texto}
                type="button"
                role="radio"
                aria-checked={sumar === opcion.valor}
                onClick={() => {
                  setSumar(opcion.valor);
                }}
                className={clases(
                  'min-h-toque rounded-redondo border px-e3 text-secundario font-medium',
                  sumar === opcion.valor
                    ? 'border-naranja bg-naranja-suave'
                    : 'border-borde-fuerte bg-superficie',
                )}
              >
                {opcion.texto}
              </button>
            ))}
          </span>
        </div>
      )}

      <Botones>
        <Boton tono="principal" type="submit" disabled={ahora === null}>
          {total === null ? 'Guardar' : `Guardar · ${conUnidadDeUso(total, producto.unidadDeUso)}`}
        </Boton>
        <Boton tono="texto" onClick={alCancelar}>
          Cancelar
        </Boton>
      </Botones>
    </form>
  );
}

/** Lo que hay según lo escrito, en la unidad de uso. Nulo: nada escrito. */
function cuantoHayEn(producto: ProductoEnLista, escrito: LoEscrito | undefined): number | null {
  if (escrito === undefined) return null;
  if (seCuentaEnCajas(producto)) {
    return loContadoEnUnidades(
      numeroEscrito(escrito.formatos),
      numeroEscrito(escrito.sueltas),
      producto.factor,
    );
  }
  return numeroEscrito(escrito.hay);
}
