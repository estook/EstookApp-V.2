import { useState } from 'react';
import { Boton, Botones, Campo, ErrorEnCristiano, Hoja, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { plural } from '@estook/dominio';
import { IconoCongelado } from '@estook/iconos';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarRefrescarLotes } from '../ganchos/usarRefrescarLotes.ts';
import { comoSeLeeLaFecha, conUnidadDeUso } from './contrato.ts';

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
 * Con un lote, se congela ese; sin él, se apunta uno congelado hoy.
 *
 * **Ya no pregunta la caducidad** (repaso del 25-sep, 0049): lo congelado no
 * caduca, se queda viejo. Avisa cuando cumple lo que aguanta congelado ese
 * producto, y eso se dice aquí en una línea y se cambia en su ficha.
 *
 * ── Lo que faltaba, y era lo primero ────────────────────────────────────────
 *
 * **Cuánto.** Esto marcaba el producto entero: congelar 10 kg de los 43 que hay
 * dejaba los 43 con la etiqueta de congelado, y en la lista salía «Bacon ·
 * congelado» como si no quedara nada fresco. Richi lo vio a la primera y tenía
 * razón: congelar una parte es el caso normal, no el raro.
 *
 * Ahora se dice cuánto y se separa esa parte. Lo que queda fresco sigue siendo lo
 * que hay menos lo congelado, y las dos cifras se leen en la ficha.
 */
export function Congelar({
  productoId,
  producto,
  lote,
  unidadDeUso,
  hay,
  aguantaMeses,
  alCerrar,
  alHecho,
}: {
  readonly productoId: string;
  readonly producto: string;
  readonly lote: { readonly id: string; readonly caducaEl: string | null } | null;
  readonly unidadDeUso: string;
  /** Lo que hay en cámara, para no dejar congelar más de lo que existe. */
  readonly hay: number;
  /** Lo que aguanta congelado este producto: de ahí sale su aviso (0049). */
  readonly aguantaMeses: number;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => void;
}) {
  const { cliente } = usarSesion();
  const refrescar = usarRefrescarLotes();
  const [cuanto, setCuanto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [congelando, setCongelando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const cuantoEscrito = Number(cuanto.replace(',', '.'));
  const hayCuanto = cuanto.trim() !== '' && Number.isFinite(cuantoEscrito) && cuantoEscrito > 0;
  const sePasa = hayCuanto && cuantoEscrito > hay;

  async function congelar() {
    setCongelando(true);
    setError(null);
    const respuesta = await cliente.ejecutar('congelar', {
      producto_id: productoId,
      ...(lote === null ? {} : { lote_id: lote.id }),
      ...(hayCuanto ? { cuanto: cuantoEscrito } : {}),
      ...(lote === null && codigo.trim() !== '' ? { codigo: codigo.trim() } : {}),
    });
    setCongelando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await refrescar();
    alHecho(
      hayCuanto
        ? `${producto}: ${conUnidadDeUso(cuantoEscrito, unidadDeUso)} al congelador. Salen en «Congelados» con su fecha.`
        : `${producto}: congelado hoy. Sale en «Congelados» con su fecha.`,
    );
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
            disabled={sePasa}
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

        {/*
          Cuánto, lo primero y con lo que hay delante: «de 43 kg». Es la pregunta
          que faltaba, y la que evita marcar como congelado lo que sigue fresco.
        */}
        <Campo
          etiqueta="Cuánto se congela"
          tipo="numero"
          autoFocus
          detras={unidadDeUso}
          ayuda={
            sePasa
              ? `Solo hay ${conUnidadDeUso(hay, unidadDeUso)}.`
              : `De ${conUnidadDeUso(hay, unidadDeUso)} que hay. Si lo dejas en blanco, se apunta sin decir cuánto.`
          }
          {...(sePasa ? { error: 'No puedes congelar más de lo que hay.' } : {})}
          value={cuanto}
          onChange={(e) => {
            setCuanto(e.currentTarget.value);
          }}
        />

        {/* Lo que avisa, en una línea: lo congelado no caduca, se queda viejo. */}
        <p className="flex items-center gap-e2 text-secundario text-texto-suave">
          <IconoCongelado size={16} />
          Te aviso cuando lleve {plural(aguantaMeses, 'mes', 'meses')} congelado. Se cambia en su
          ficha.
        </p>
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
