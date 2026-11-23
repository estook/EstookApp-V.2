import { useCallback, useEffect, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  CIFRAS_DEL_PIN,
  MOTIVOS_DE_LA_DIFERENCIA,
  NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA,
  comoCuadra,
  enDinero,
  type MotivoDeLaDiferencia,
} from '@estook/dominio';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { Puntos, Teclado } from '../puerta/Teclado.tsx';
import { cifraDeLaTecla } from '../puerta/teclas.ts';
import { eurosConSimbolo } from '../logica/texto.ts';
import { idNuevo, usarLaCaja, usarRecargarLaCaja } from '../ganchos/usarLaCaja.ts';
import { AvisoDeLaCaja, ErrorDeLaCaja } from './AbrirCaja.tsx';
import { RenglonDeLaCaja } from './CerrarCaja.tsx';
import { ContarOEscribir } from './ContarOEscribir.tsx';
import { SIN_CONTAR, elTotalDe, loContadoParaLaApi, type LoContado } from './loContado.ts';
import type { LaCajaEntregada } from './tipos.ts';

const LOS_PASOS = ['Contar', 'Quién la recibe', 'Listo'] as const;

/**
 * **Entregar la caja** (E7, decisión 0152; maqueta corregida del 23-nov): el cambio de turno sin
 * cerrar. Tres pasos: quien la deja **cuenta a ciegas** (billete a billete, o escribiendo el total si el
 * local lo deja); quien la recibe **teclea su PIN**; y la diferencia, con la caja ya entregada, como al
 * cerrar. Sigue abierta a nombre de quien la recibe, con lo contado. **Sin datáfono**: la tarjeta no se
 * cuenta (Richi, 11-nov). El día no se cierra.
 */
export function EntregarLaCaja({ alAcabar }: { readonly alAcabar: () => void }) {
  const { cliente } = usarSesion();
  const caja = usarLaCaja();
  const recargar = usarRecargarLaCaja();
  const [nuevoTurnoId] = useState(idNuevo);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [loContado, setLoContado] = useState<LoContado>(SIN_CONTAR);
  const [entregada, setEntregada] = useState<LaCajaEntregada | null>(null);

  if (caja.isLoading || caja.data === undefined) {
    return caja.error === null ? <Cargando que="la caja" /> : <ErrorDeLaCaja />;
  }
  const abierta = caja.data.abierta;
  if (entregada !== null) return <ElResultado entregada={entregada} alAcabar={alAcabar} />;
  if (abierta === null) {
    return (
      <AvisoDeLaCaja
        titulo="La caja no está abierta"
        frase="No hay nada que entregar en este cajón."
        alVolver={alAcabar}
      />
    );
  }
  if (abierta.deOtroDia) {
    return (
      <AvisoDeLaCaja
        titulo="La caja de ayer no se entrega"
        frase="Se cierra contando el cajón, y después se abre la de hoy."
        alVolver={alAcabar}
      />
    );
  }
  const contado = elTotalDe(loContado) ?? -1;
  const turnoId = abierta.turnoId;

  async function entregar(pin: string): Promise<ErrorDeLaApi | null> {
    const r = await cliente.ejecutar<LaCajaEntregada>('entregar_la_caja', {
      turno_id: turnoId,
      nuevo_turno_id: nuevoTurnoId,
      ...loContadoParaLaApi(loContado),
      pin,
    });
    if (!r.ok) return r.error;
    setEntregada(r.datos);
    await recargar();
    return null;
  }

  return (
    <div className="flex flex-col gap-e4">
      <ol className="flex flex-wrap gap-e2" aria-label="Pasos para entregar la caja">
        {LOS_PASOS.map((nombre, i) => {
          const elPaso = i + 1;
          const como = elPaso === paso ? 'ahora' : elPaso < paso ? 'hecho' : 'falta';
          return (
            <li key={nombre}>
              <button
                type="button"
                disabled={elPaso >= paso}
                aria-current={como === 'ahora' ? 'step' : undefined}
                onClick={() => {
                  if (elPaso < paso) setPaso(1);
                }}
                className={`rounded-redondo px-e3 py-e1 text-secundario font-bold ${
                  como === 'ahora'
                    ? 'bg-naranja text-sobre-naranja'
                    : como === 'hecho'
                      ? 'bg-bien-suave text-bien'
                      : 'bg-superficie text-texto-tenue'
                }`}
              >
                {elPaso} {nombre}
              </button>
            </li>
          );
        })}
      </ol>

      {paso === 1 ? (
        <>
          <div>
            <h2 className="text-pantalla font-bold">Cuenta lo que hay en el cajón</h2>
            <p className="text-texto-suave">
              La abrió {abierta.abiertaPor}. Lo que debería haber sale al final.
            </p>
          </div>
          <ContarOEscribir
            valor={loContado}
            alCambiar={setLoContado}
            sePuedeEscribir={caja.data.ajustes.contarEscribiendo === true}
          />
          <div className="flex flex-wrap items-center justify-between gap-e3 rounded-grande bg-superficie p-e4">
            <div className="flex flex-col">
              <span className="text-secundario text-texto-tenue">Contado</span>
              <span className="text-cifra-media font-bold tabular-nums">
                {contado < 0 ? '—' : eurosConSimbolo(contado)}
              </span>
            </div>
            <button
              type="button"
              disabled={contado < 0}
              onClick={() => {
                setPaso(2);
              }}
              className="min-h-toque-cocina rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja disabled:opacity-50"
            >
              Seguir
            </button>
          </div>
        </>
      ) : (
        <QuienLaRecibe contado={contado} alTeclear={entregar} />
      )}
    </div>
  );
}

/** **¿Quién se queda con la caja?** Que teclee su PIN quien la recibe: es quien la va a llevar. */
function QuienLaRecibe({
  contado,
  alTeclear,
}: {
  readonly contado: number;
  readonly alTeclear: (pin: string) => Promise<ErrorDeLaApi | null>;
}) {
  const [pin, setPin] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  useEffect(() => {
    if (pin.length !== CIFRAS_DEL_PIN || ocupado) return;
    setOcupado(true);
    void alTeclear(pin).then((fallo) => {
      setOcupado(false);
      setPin('');
      setError(fallo);
    });
  }, [pin, ocupado, alTeclear]);

  const teclear = useCallback(
    (cifra: string) => {
      if (ocupado) return;
      setError(null);
      setPin((p) => (p.length >= CIFRAS_DEL_PIN ? p : `${p}${cifra}`));
    },
    [ocupado],
  );
  const borrar = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      const tecla = cifraDeLaTecla(evento);
      if (tecla === 'borrar') borrar();
      else if (tecla !== null) teclear(tecla);
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [teclear, borrar]);

  return (
    <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-e4 rounded-mayor bg-superficie p-e5 text-center">
      <h2 className="text-pantalla font-bold">¿Quién se queda con la caja?</h2>
      <p className="text-texto-suave">
        Que teclee su PIN quien la recibe. Sigue abierta a su nombre, con {eurosConSimbolo(contado)}
        .
      </p>
      {error !== null && <ErrorEnCristiano error={error} />}
      <Puntos tecleadas={pin.length} de={CIFRAS_DEL_PIN} />
      <Teclado alTeclear={teclear} alBorrar={borrar} ocupado={ocupado} />
    </div>
  );
}

/** **La diferencia**, con la caja ya entregada: como al cerrar, no se vuelve a contar hasta cuadrar. */
function ElResultado({
  entregada,
  alAcabar,
}: {
  readonly entregada: LaCajaEntregada;
  readonly alAcabar: () => void;
}) {
  const { cliente } = usarSesion();
  const [motivo, setMotivo] = useState<MotivoDeLaDiferencia | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [impreso, setImpreso] = useState<string | null>(null);
  const d = entregada.diferencia;
  const tono =
    comoCuadra(d) === 'cuadra'
      ? 'bg-bien-suave text-bien'
      : comoCuadra(d) === 'poco'
        ? 'bg-atencion-suave text-atencion'
        : 'bg-mal-suave text-mal';

  async function explicar(m: MotivoDeLaDiferencia) {
    setFallo(null);
    const r = await cliente.ejecutar('explicar_la_diferencia', {
      turno_id: entregada.turnoId,
      motivo: m,
    });
    if (r.ok) setMotivo(m);
    else setFallo(r.error);
  }
  async function imprimir() {
    setFallo(null);
    const r = await cliente.ejecutar<{ impreso: boolean }>('imprimir_el_z', {
      turno_id: entregada.turnoId,
    });
    if (!r.ok) setFallo(r.error);
    else
      setImpreso(
        r.datos.impreso ? 'El arqueo sale por la impresora.' : 'No hay impresora de caja.',
      );
  }

  return (
    <div className="flex flex-col gap-e4">
      <h2 className="text-pantalla font-bold">Caja entregada a {entregada.recibe}</h2>
      <section className="flex max-w-[30rem] flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e4">
        <RenglonDeLaCaja que="Debería haber" cuanto={entregada.deberiaHaber} />
        <RenglonDeLaCaja que="Has contado" cuanto={entregada.contado} />
        <p className={`flex justify-between rounded-grande p-e3 font-bold ${tono}`}>
          <span>Efectivo · {d === 0 ? 'cuadra' : d < 0 ? 'faltan' : 'sobran'}</span>
          {d !== 0 && <span className="tabular-nums">{enDinero(Math.abs(d))}</span>}
        </p>
      </section>
      {d !== 0 && (
        <div className="flex flex-col gap-e2">
          <span className="text-secundario font-bold text-texto-suave">
            ¿Por qué? Si lo sabes (no hace falta)
          </span>
          <div className="flex flex-wrap gap-e2">
            {MOTIVOS_DE_LA_DIFERENCIA.map((m) => (
              <button
                key={m}
                type="button"
                disabled={motivo !== null}
                aria-pressed={motivo === m}
                onClick={() => void explicar(m)}
                className={`min-h-toque rounded-redondo border-2 px-e4 font-bold ${
                  motivo === m ? 'border-naranja bg-naranja-suave' : 'border-borde'
                } disabled:opacity-70`}
              >
                {NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA[m]}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="max-w-[30rem] rounded-grande bg-superficie p-e3 text-texto-suave">
        Sigue abierta a nombre de <b className="text-texto">{entregada.recibe}</b>, con{' '}
        {eurosConSimbolo(entregada.contado)}.
      </p>
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {impreso !== null && <p className="font-bold text-bien">{impreso}</p>}
      <div className="grid max-w-[30rem] grid-cols-1 gap-e3 sm:grid-cols-[1fr_2fr]">
        <button
          type="button"
          onClick={() => void imprimir()}
          className="min-h-toque-cocina rounded-grande border-2 border-borde font-bold"
        >
          Imprimir el arqueo
        </button>
        <button
          type="button"
          onClick={alAcabar}
          className="min-h-toque-cocina rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
