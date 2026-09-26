import { useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  Boton,
  Botones,
  CAJA,
  Campo,
  Envoltorio,
  ErrorEnCristiano,
  Hoja,
  clases,
} from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CLAVE_DEL_TABLON } from '../ganchos/usarElTablon.ts';

/**
 * Escribir en el Tablón (repaso del 25-sep · 0049).
 *
 * Tres preguntas, y solo la primera hace falta: **qué**, **para quién** —todos,
 * cocina o sala— y **cuándo**: hoy, mañana u otro día, con hora si la tiene. Con
 * hora sale también en «Hoy» y en el Calendario, que es lo que pide una reserva.
 */
type Para = 'todos' | 'cocina' | 'sala';
type Cuando = 'hoy' | 'manana' | 'otro';

const PARA: readonly { valor: Para; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'cocina', texto: 'Cocina' },
  { valor: 'sala', texto: 'Sala' },
];

const CUANDO: readonly { valor: Cuando; texto: string }[] = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'manana', texto: 'Mañana' },
  { valor: 'otro', texto: 'Otro día' },
];

export function EscribirEnElTablon({ alCerrar }: { readonly alCerrar: () => void }) {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const idDelTexto = useId();
  const [texto, setTexto] = useState('');
  const [para, setPara] = useState<Para>('todos');
  const [cuando, setCuando] = useState<Cuando>('hoy');
  const [otroDia, setOtroDia] = useState('');
  const [hora, setHora] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const listo = texto.trim() !== '' && (cuando !== 'otro' || otroDia !== '') && !guardando;

  async function poner() {
    setGuardando(true);
    setError(null);
    // «Mañana» lo cuenta el servidor, con el reloj del local (regla 10).
    const respuesta = await cliente.ejecutar('escribir_en_el_tablon', {
      texto: texto.trim(),
      ...(para === 'todos' ? {} : { zona: para }),
      ...(cuando === 'manana' ? { manana: true } : {}),
      ...(cuando === 'otro' ? { dia: otroDia } : {}),
      ...(hora === '' ? {} : { hora }),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return;
    }
    await cache.invalidateQueries({ queryKey: CLAVE_DEL_TABLON });
    await cache.invalidateQueries({ queryKey: ['lo_de_hoy'] });
    alCerrar();
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Escribir en el tablón"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={guardando}
            textoCargando="Poniéndola"
            onClick={() => {
              void poner();
            }}
          >
            Poner en el tablón
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}

        <Envoltorio id={idDelTexto} etiqueta="Qué" obligatorio ayuda="Como mucho, 280 letras.">
          <textarea
            id={idDelTexto}
            autoFocus
            rows={3}
            maxLength={280}
            placeholder="Reserva a las 17:00 de 20 personas"
            value={texto}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
            className={clases(CAJA, 'py-e2')}
          />
        </Envoltorio>

        <Eleccion etiqueta="Para quién" opciones={PARA} valor={para} alElegir={setPara} />

        <Eleccion etiqueta="Cuándo" opciones={CUANDO} valor={cuando} alElegir={setCuando} />

        <div className="grid gap-e3 sm:grid-cols-2">
          {cuando === 'otro' && (
            <Campo
              etiqueta="Qué día"
              tipo="fecha"
              value={otroDia}
              onChange={(e) => {
                setOtroDia(e.currentTarget.value);
              }}
            />
          )}
          <Campo
            etiqueta="A qué hora"
            tipo="hora"
            value={hora}
            ayuda="Opcional. Con hora, sale también en «Hoy» y en el Calendario."
            onChange={(e) => {
              setHora(e.currentTarget.value);
            }}
          />
        </div>
      </div>
    </Hoja>
  );
}

/** Unas pocas opciones en fila, como las del alta: se ven todas y se toca una. */
function Eleccion<T extends string>({
  etiqueta,
  opciones,
  valor,
  alElegir,
}: {
  readonly etiqueta: string;
  readonly opciones: readonly { readonly valor: T; readonly texto: string }[];
  readonly valor: T;
  readonly alElegir: (valor: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-e1">
      <p id={id} className="text-secundario font-medium text-texto-suave">
        {etiqueta}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-e2">
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={valor === opcion.valor}
            onClick={() => {
              alElegir(opcion.valor);
            }}
            className={clases(
              'inline-flex min-h-toque items-center rounded-medio border px-e4 text-secundario font-medium',
              valor === opcion.valor
                ? 'border-naranja bg-naranja-suave text-texto'
                : 'border-borde-fuerte bg-superficie text-texto-suave hover:bg-fondo',
            )}
          >
            {opcion.texto}
          </button>
        ))}
      </div>
    </div>
  );
}
