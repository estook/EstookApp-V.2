import { useState } from 'react';
import { Boton, Botones, Campo, ErrorEnCristiano, Hoja, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarRefrescarLotes } from '../ganchos/usarRefrescarLotes.ts';
import { comoSeLeeLaFecha } from './contrato.ts';

/**
 * Quitar un lote y congelar (M7, repaso).
 *
 * Dos hojas pequeñas que se abren desde «Caduca esta semana» y desde la ficha del
 * producto. Las dos tocan lo mismo —lo que avisa, lo que hay y el Calendario—,
 * así que al acabar se refresca todo junto (`usarRefrescarLotes`).
 */

export interface LoteQueSeQuita {
  readonly id: string;
  readonly producto: string;
  readonly codigo: string | null;
  readonly caducaEl: string | null;
  readonly unidadDeUso: string;
}

/**
 * «¿Qué ha pasado con él?» · se ha gastado, o se ha tirado.
 *
 * Son dos botones grandes y no un desplegable porque es la única pregunta, y
 * decide si hay merma: lo tirado sale de cámara como merma por caducado, que es
 * lo que el food cost del mes tiene que saber.
 */
export function QuitarLote({
  lote,
  alCerrar,
  alHecho,
}: {
  readonly lote: LoteQueSeQuita;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLotes();
  const [como, setComo] = useState<'gastado' | 'tirado' | null>(null);
  const [cuanto, setCuanto] = useState('');
  const [quitando, setQuitando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const cuantoEscrito = Number(cuanto.replace(',', '.'));
  const listo = como === 'gastado' || (como === 'tirado' && cuantoEscrito > 0);

  async function quitar() {
    if (como === null) return;
    setQuitando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('quitar_lote', {
      lote_id: lote.id,
      como,
      ...(como === 'tirado' ? { cuanto: cuantoEscrito } : {}),
    });
    setQuitando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alHecho(
      como === 'tirado'
        ? `Quitado. Lo tirado de ${lote.producto} queda apuntado como merma por caducado.`
        : `Quitado. ${lote.producto} ya no avisa de su caducidad.`,
    );
  }

  const opcion = (puesta: boolean) =>
    clases(
      'flex min-h-toque-cocina w-full flex-col items-start gap-e1 rounded-medio border p-e3 text-left',
      puesta
        ? 'border-naranja bg-naranja-suave'
        : 'border-borde-fuerte bg-superficie hover:bg-fondo',
    );

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Quitar ${lote.producto}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={quitando}
            textoCargando="Quitando"
            onClick={() => {
              void quitar();
            }}
          >
            Quitarlo
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <p className="text-secundario text-texto-suave">
          {lote.codigo === null ? 'El lote' : `El lote ${lote.codigo}`}
          {lote.caducaEl === null ? '' : `, que caduca el ${comoSeLeeLaFecha(lote.caducaEl)}`}. ¿Qué
          ha pasado con él?
        </p>
        <div role="radiogroup" aria-label="Qué ha pasado con él" className="flex flex-col gap-e2">
          <button
            type="button"
            role="radio"
            aria-checked={como === 'gastado'}
            onClick={() => {
              setComo('gastado');
            }}
            className={opcion(como === 'gastado')}
          >
            <span className="text-cuerpo font-semibold">Se ha gastado</span>
            <span className="text-secundario text-texto-suave">
              Se usó entero. Deja de avisar y no cambia lo que hay.
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={como === 'tirado'}
            onClick={() => {
              setComo('tirado');
            }}
            className={opcion(como === 'tirado')}
          >
            <span className="text-cuerpo font-semibold">Se ha tirado</span>
            <span className="text-secundario text-texto-suave">
              Sale de cámara como merma por caducado.
            </span>
          </button>
        </div>
        {como === 'tirado' && (
          <Campo
            etiqueta="Cuánto se tira"
            tipo="numero"
            obligatorio
            autoFocus
            detras={lote.unidadDeUso}
            value={cuanto}
            onChange={(e) => {
              setCuanto(e.currentTarget.value);
            }}
          />
        )}
      </div>
    </Hoja>
  );
}

/**
 * Congelar · «la mitad de la carne va al congelador».
 *
 * Con un lote, se congela ese; sin él, se apunta uno congelado hoy. La fecha de
 * caducidad nueva es opcional: congelado aguanta meses, y quien no la sabe no
 * tiene por qué inventarla.
 */
export function Congelar({
  productoId,
  producto,
  lote,
  alCerrar,
  alHecho,
}: {
  readonly productoId: string;
  readonly producto: string;
  readonly lote: { readonly id: string; readonly caducaEl: string | null } | null;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLotes();
  const [caducaEl, setCaducaEl] = useState('');
  const [codigo, setCodigo] = useState('');
  const [congelando, setCongelando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function congelar() {
    setCongelando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('congelar', {
      producto_id: productoId,
      ...(lote === null ? {} : { lote_id: lote.id }),
      ...(caducaEl === '' ? {} : { caduca_el: caducaEl }),
      ...(lote === null && codigo.trim() !== '' ? { codigo: codigo.trim() } : {}),
    });
    setCongelando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alHecho(`${producto}: congelado hoy. Sale en «Congelados» con su fecha.`);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={`Congelar ${producto}`}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            cargando={congelando}
            textoCargando="Congelando"
            onClick={() => {
              void congelar();
            }}
          >
            Congelarlo
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <Campo
          etiqueta="Caduca el, ya congelado"
          tipo="fecha"
          ayuda={
            lote?.caducaEl === null || lote === null
              ? 'Congelado aguanta meses. Si no lo sabes, déjalo en blanco.'
              : `Ahora caduca el ${comoSeLeeLaFecha(lote.caducaEl)}. Congelado aguanta más: pon la fecha nueva, o déjalo en blanco para que siga igual.`
          }
          value={caducaEl}
          onChange={(e) => {
            setCaducaEl(e.currentTarget.value);
          }}
        />
        {lote === null && (
          <Campo
            etiqueta="Lote o nota"
            ayuda="Opcional: «bolsas de 1 kg», «lote del martes»."
            value={codigo}
            onChange={(e) => {
              setCodigo(e.currentTarget.value);
            }}
          />
        )}
      </div>
    </Hoja>
  );
}
