import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, Campo, ErrorEnCristiano, Hoja } from '@estook/ui';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import type { MesaDelPlano } from '../datos/tipos.ts';
import { irALaMesa } from '../navegar.ts';

/**
 * Abrir una mesa (0106, «AbrirMesa»): cuántos son y cómo sale la cocina. Dos preguntas
 * y un botón; lo demás se cambia luego en las opciones de la mesa.
 *
 * El id de la cuenta nace aquí: si la red se corta y se vuelve a pulsar, no se abren dos.
 * Si otro camarero la abrió un segundo antes, se entra en la suya.
 */
export function AbrirMesa({
  mesa,
  alCerrar,
}: {
  /** Nula: en barra o para llevar, sin mesa. */
  readonly mesa: MesaDelPlano | null;
  readonly alCerrar: () => void;
}) {
  const ejecutar = usarAcciones();
  const [cuentaId] = useState(() => crypto.randomUUID());
  const [cuantos, setCuantos] = useState<number | null>(null);
  const [otroNumero, setOtroNumero] = useState('');
  const [porPases, setPorPases] = useState(true);
  const [tipo, setTipo] = useState<'barra' | 'para_llevar'>('barra');
  const [nombre, setNombre] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  const elNumero = cuantos ?? (otroNumero.trim() === '' ? null : Number(otroNumero));
  const sePuede = mesa === null || (elNumero !== null && elNumero >= 1 && elNumero <= 99);

  async function abrir() {
    setAbriendo(true);
    setFallo(null);
    const hecho = await ejecutar<{ cuentaId: string }>(
      'abrir_mesa',
      mesa === null
        ? {
            cuenta_id: cuentaId,
            tipo,
            por_pases: porPases,
            ...(nombre.trim() === '' ? {} : { nombre: nombre.trim() }),
          }
        : { cuenta_id: cuentaId, mesa_id: mesa.id, personas: elNumero, por_pases: porPases },
      cuentaId,
    );
    setAbriendo(false);
    if (hecho.ok) {
      irALaMesa(hecho.datos.cuentaId);
      return;
    }
    // Otro la abrió antes: se entra en la suya, que es la misma mesa.
    const suya = hecho.error.detalle?.['cuentaId'];
    if (hecho.error.codigo === 'ya_hecho' && typeof suya === 'string') {
      irALaMesa(suya);
      return;
    }
    setFallo(hecho.error);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={mesa === null ? 'En barra o para llevar' : `Mesa ${mesa.nombre}`}
      pie={
        <Boton
          tono="principal"
          tamano="l"
          ancho
          disabled={!sePuede}
          cargando={abriendo}
          textoCargando="Abriendo"
          onClick={() => {
            void abrir();
          }}
        >
          Abrir
        </Boton>
      }
    >
      <div className="flex flex-col gap-e5 pt-e2">
        {mesa === null ? (
          <>
            <Eleccion
              pregunta="¿Dónde?"
              opciones={[
                { valor: 'barra', texto: 'En barra' },
                { valor: 'para_llevar', texto: 'Para llevar' },
              ]}
              elegida={tipo}
              alElegir={(v) => {
                setTipo(v as 'barra' | 'para_llevar');
              }}
            />
            <Campo
              etiqueta="Nombre (si quieres)"
              value={nombre}
              maxLength={40}
              placeholder="Laura, Iker…"
              onChange={(e) => {
                setNombre(e.target.value);
              }}
            />
          </>
        ) : (
          <fieldset className="flex flex-col gap-e3">
            <legend className="mb-e3 text-seccion font-bold">¿Cuántos sois?</legend>
            <div className="grid grid-cols-4 gap-e2 sm:grid-cols-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={cuantos === n}
                  onClick={() => {
                    setCuantos(n);
                    setOtroNumero('');
                  }}
                  className={[
                    'min-h-toque-cocina rounded-grande text-seccion font-bold',
                    cuantos === n
                      ? 'bg-charcoal text-white'
                      : 'border border-borde bg-superficie text-texto',
                  ].join(' ')}
                >
                  {n}
                </button>
              ))}
            </div>
            <Campo
              etiqueta="Más"
              inputMode="numeric"
              value={otroNumero}
              placeholder="12"
              onChange={(e) => {
                setOtroNumero(e.target.value.replace(/\D/g, '').slice(0, 2));
                setCuantos(null);
              }}
            />
          </fieldset>
        )}
        <Eleccion
          pregunta="¿Cómo sale la cocina?"
          opciones={[
            { valor: 'pases', texto: 'Por pases', ayuda: 'el 2.º espera a que lo marches' },
            { valor: 'junto', texto: 'Todo junto', ayuda: 'sale todo a la vez' },
          ]}
          elegida={porPases ? 'pases' : 'junto'}
          alElegir={(v) => {
            setPorPases(v === 'pases');
          }}
        />
        {fallo !== null && <ErrorEnCristiano error={fallo} />}
      </div>
    </Hoja>
  );
}

export function Eleccion({
  pregunta,
  opciones,
  elegida,
  alElegir,
}: {
  readonly pregunta: string;
  readonly opciones: readonly { valor: string; texto: string; ayuda?: string }[];
  readonly elegida: string;
  readonly alElegir: (valor: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-e3">
      <legend className="mb-e3 text-seccion font-bold">{pregunta}</legend>
      <div className="grid grid-cols-2 gap-e2">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={elegida === o.valor}
            onClick={() => {
              alElegir(o.valor);
            }}
            className={[
              'flex min-h-toque-cocina flex-col items-start justify-center rounded-grande px-e4 py-e2 text-left',
              elegida === o.valor
                ? 'bg-charcoal text-white'
                : 'border border-borde bg-superficie text-texto',
            ].join(' ')}
          >
            <span className="font-bold">{o.texto}</span>
            {o.ayuda !== undefined && (
              <span
                className={[
                  'text-secundario',
                  elegida === o.valor ? 'text-white/80' : 'text-texto-suave',
                ].join(' ')}
              >
                {o.ayuda}
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
