import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import {
  MOTIVOS_DE_LA_DIFERENCIA,
  NOMBRE_DEL_MOTIVO_DE_LA_DIFERENCIA,
  comoCuadra,
  elTotalContado,
  enDinero,
  loQueSeProponeParaManana,
  type MotivoDeLaDiferencia,
} from '@estook/dominio';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from '../ganchos/usarLaSala.ts';
import { LoApruebaUnEncargado } from '../mesa/LoApruebaUnEncargado.tsx';
import { eurosConSimbolo } from '../logica/texto.ts';
import { ContarElCajon } from './ContarElCajon.tsx';
import { AvisoDeLaCaja, ErrorDeLaCaja } from './AbrirCaja.tsx';
import { deEurosACentimos, enLaCasilla } from './dinero.ts';
import { pideEncargado, usarLaCaja, usarRecargarLaCaja } from '../ganchos/usarLaCaja.ts';
import type { ComoVaLaCaja, ElRecuento, LaCajaCerrada } from './tipos.ts';

type Paso = 1 | 2 | 3;
const LOS_PASOS = ['Contar', 'Datáfono', 'Para mañana', 'El resultado'] as const;

/**
 * **Cerrar caja, a ciegas** (Anexo 11.6; maqueta del 9-nov, tramo 4): cuatro pasos a la vista.
 * Contar **sin ver lo que debería haber** (si el local no lo apaga), el total del datáfono y lo que
 * se queda para mañana. **La diferencia se ve con la caja ya cerrada**: así nadie vuelve a contar
 * hasta cuadrar. No bloquea nada y queda a nombre de quien cierra; después, un motivo de un toque si
 * se sabe, e «Imprimir el Z».
 */
export function CerrarCaja({ alAcabar }: { readonly alAcabar: () => void }) {
  const { yo, cliente } = usarSesion();
  const caja = usarLaCaja();
  const recargar = usarRecargarLaCaja();
  const [paso, setPaso] = useState<Paso>(1);
  const [recuento, setRecuento] = useState<ElRecuento>({});
  const [datafono, setDatafono] = useState('');
  const [sinDatafono, setSinDatafono] = useState(false);
  const [manana, setManana] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [aprobar, setAprobar] = useState(false);
  const [cerrada, setCerrada] = useState<LaCajaCerrada | null>(null);
  const aCiegas = caja.data?.ajustes.contarACiegas !== false;
  // Sin «a ciegas», quien cuenta ve lo que debería haber: se lee el X.
  const comoVa = useQuery({
    queryKey: ['caja', 'como_va_la_caja'],
    enabled: !aCiegas && caja.data?.abierta != null && caja.data.puedoLlevarla,
    queryFn: async () => {
      const r = await cliente.consultar<ComoVaLaCaja>('como_va_la_caja', {});
      if (!r.ok) throw new FalloDeLaSala(r.error);
      return r.datos;
    },
  });

  if (caja.isLoading || caja.data === undefined) {
    return caja.error === null ? <Cargando que="la caja" /> : <ErrorDeLaCaja />;
  }
  const c = caja.data;
  const abierta = c.abierta;
  if (cerrada !== null) {
    return <ElResultado cerrada={cerrada} alAcabar={alAcabar} />;
  }
  if (abierta === null) {
    return (
      <AvisoDeLaCaja
        titulo="La caja no está abierta"
        frase="No hay nada que cerrar en este cajón."
        alVolver={alAcabar}
      />
    );
  }

  const contado = elTotalContado(recuento);
  const propuesto = loQueSeProponeParaManana({
    fondoDeSiempre: c.ajustes.fondoDeSiempre,
    loDeLaUltimaVez: abierta.fondo,
    contado,
  });
  const paraManana = manana === null ? propuesto : (deEurosACentimos(manana) ?? -1);
  const datafonoBien = sinDatafono ? null : deEurosACentimos(datafono);

  async function cerrar(pin?: string): Promise<ErrorDeLaApi | null> {
    if (abierta === null) return null;
    setOcupado(true);
    setFallo(null);
    const respuesta = await cliente.ejecutar<LaCajaCerrada>('cerrar_caja', {
      turno_id: abierta.turnoId,
      contado: recuento,
      datafono: datafonoBien,
      para_manana: paraManana,
      ...(pin === undefined ? {} : { pin_del_encargado: pin }),
    });
    setOcupado(false);
    if (respuesta.ok) {
      setAprobar(false);
      setCerrada(respuesta.datos);
      await recargar();
      return null;
    }
    if (pin === undefined && pideEncargado(respuesta.error)) {
      setAprobar(true);
      return null;
    }
    if (pin === undefined) setFallo(respuesta.error);
    return respuesta.error;
  }

  if (aprobar) {
    return (
      <LoApruebaUnEncargado
        que="Cerrar la caja"
        pide={yo.nombre}
        motivo={`Contados ${eurosConSimbolo(contado)}`}
        alAprobar={(pin) => cerrar(pin)}
        alCancelar={() => {
          setAprobar(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      <ol className="flex flex-wrap gap-e2" aria-label="Pasos para cerrar la caja">
        {LOS_PASOS.map((nombre, i) => {
          const elPaso = i + 1;
          const como = elPaso === paso ? 'ahora' : elPaso < paso ? 'hecho' : 'falta';
          return (
            <li key={nombre}>
              <button
                type="button"
                disabled={elPaso > paso}
                aria-current={como === 'ahora' ? 'step' : undefined}
                onClick={() => {
                  if (elPaso < paso) setPaso(elPaso as Paso);
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

      {fallo !== null && <ErrorEnCristiano error={fallo} />}

      {paso === 1 && (
        <>
          {c.mesasAbiertas > 0 && (
            <p className="rounded-grande bg-info-suave p-e3 font-bold text-info">
              {c.mesasAbiertas === 1
                ? 'Queda 1 mesa abierta'
                : `Quedan ${String(c.mesasAbiertas)} mesas abiertas`}
              : lo que cobren en efectivo irá a la caja de mañana.
            </p>
          )}
          <ContarElCajon recuento={recuento} alCambiar={setRecuento} />
          <div className="flex flex-wrap items-center justify-between gap-e3 rounded-grande bg-superficie p-e4">
            <div className="flex flex-col">
              <span className="text-secundario text-texto-tenue">Contado</span>
              <span className="text-cifra-media font-bold tabular-nums">
                {eurosConSimbolo(contado)}
              </span>
            </div>
            <span className="max-w-[16rem] text-secundario text-texto-tenue">
              {aCiegas
                ? 'Lo que debería haber sale al final.'
                : comoVa.data === undefined
                  ? ''
                  : `Debería haber ${eurosConSimbolo(comoVa.data.deberiaHaber)}.`}
            </span>
            <button
              type="button"
              onClick={() => {
                setPaso(2);
              }}
              className="min-h-toque-cocina rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja"
            >
              Seguir
            </button>
          </div>
        </>
      )}

      {paso === 2 && (
        <div className="flex max-w-[30rem] flex-col gap-e3">
          <div>
            <h2 className="text-pantalla font-bold">El cierre del datáfono</h2>
            <p className="text-texto-suave">
              Saca el cierre del día en el datáfono y escribe su total.
            </p>
          </div>
          <label className="flex items-center justify-between gap-e3 rounded-grande border-2 border-borde bg-fondo px-e4 py-e2 focus-within:border-naranja">
            <span className="text-texto-suave">Total del datáfono</span>
            <input
              inputMode="decimal"
              value={datafono}
              placeholder="0,00"
              disabled={sinDatafono}
              onChange={(e) => {
                setDatafono(e.currentTarget.value);
              }}
              className="w-[9ch] bg-transparent text-right text-cifra-larga font-bold tabular-nums outline-none"
            />
          </label>
          <div className="grid grid-cols-1 gap-e3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setSinDatafono(true);
                setPaso(3);
              }}
              className="min-h-toque-cocina rounded-grande border-2 border-borde font-bold"
            >
              Hoy no se ha usado
            </button>
            <button
              type="button"
              disabled={deEurosACentimos(datafono) === null}
              onClick={() => {
                setSinDatafono(false);
                setPaso(3);
              }}
              className="min-h-toque-cocina rounded-grande bg-naranja font-bold text-sobre-naranja disabled:opacity-50"
            >
              Seguir
            </button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="flex max-w-[30rem] flex-col gap-e3">
          <div>
            <h2 className="text-pantalla font-bold">Lo que se queda para mañana</h2>
            <p className="text-texto-suave">El fondo de siempre. Lo demás lo retiras.</p>
          </div>
          <div className="flex flex-col gap-e3 rounded-grande border border-borde bg-superficie p-e4">
            <label className="flex items-center justify-between gap-e3 rounded-grande border-2 border-borde bg-fondo px-e4 py-e2 focus-within:border-naranja">
              <span className="text-texto-suave">Se queda en el cajón</span>
              <input
                inputMode="decimal"
                value={manana ?? enLaCasilla(propuesto)}
                onChange={(e) => {
                  setManana(e.currentTarget.value);
                }}
                className="w-[9ch] bg-transparent text-right text-cifra-larga font-bold tabular-nums outline-none"
              />
            </label>
            <div className="flex items-baseline justify-between border-t border-borde pt-e3">
              <span className="font-bold">Retiras</span>
              <span className="text-cifra-larga font-bold tabular-nums">
                {paraManana < 0 || paraManana > contado
                  ? '—'
                  : eurosConSimbolo(contado - paraManana)}
              </span>
            </div>
          </div>
          {(paraManana < 0 || paraManana > contado) && (
            <p className="font-bold text-atencion">
              Para mañana no se puede dejar más de lo que has contado ({eurosConSimbolo(contado)}).
            </p>
          )}
          <button
            type="button"
            disabled={ocupado || paraManana < 0 || paraManana > contado}
            onClick={() => void cerrar()}
            className="min-h-toque-cocina rounded-grande bg-atencion text-seccion font-bold text-fondo disabled:opacity-50"
          >
            {ocupado ? 'Cerrando…' : 'Cerrar caja y ver el resultado'}
          </button>
        </div>
      )}
    </div>
  );
}

/** **El resultado** (paso 4): la diferencia, con la caja ya cerrada. */
function ElResultado({
  cerrada,
  alAcabar,
}: {
  readonly cerrada: LaCajaCerrada;
  readonly alAcabar: () => void;
}) {
  const { cliente, yo } = usarSesion();
  const [motivo, setMotivo] = useState<MotivoDeLaDiferencia | null>(null);
  const [impreso, setImpreso] = useState<string | null>(null);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);

  async function explicar(m: MotivoDeLaDiferencia) {
    setFallo(null);
    const r = await cliente.ejecutar('explicar_la_diferencia', {
      turno_id: cerrada.turnoId,
      motivo: m,
    });
    if (r.ok) setMotivo(m);
    else setFallo(r.error);
  }

  async function imprimir() {
    setFallo(null);
    const r = await cliente.ejecutar<{ impreso: boolean }>('imprimir_el_z', {
      turno_id: cerrada.turnoId,
    });
    if (!r.ok) setFallo(r.error);
    else setImpreso(r.datos.impreso ? 'El Z sale por la impresora.' : 'No hay impresora de caja.');
  }

  const tono = (d: number) =>
    comoCuadra(d) === 'cuadra'
      ? 'bg-bien-suave text-bien'
      : comoCuadra(d) === 'poco'
        ? 'bg-atencion-suave text-atencion'
        : 'bg-mal-suave text-mal';

  return (
    <div className="flex flex-col gap-e4">
      <h2 className="text-pantalla font-bold">Caja cerrada</h2>
      <div className="grid grid-cols-1 gap-e3 md:grid-cols-2">
        <section className="flex flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e4">
          <Renglon que="Debería haber" cuanto={cerrada.deberiaHaber} />
          <Renglon que="Has contado" cuanto={cerrada.contado} />
          <p
            className={`flex justify-between rounded-grande p-e3 font-bold ${tono(cerrada.diferencia)}`}
          >
            <span>
              Efectivo ·{' '}
              {cerrada.diferencia === 0 ? 'cuadra' : cerrada.diferencia < 0 ? 'faltan' : 'sobran'}
            </span>
            {cerrada.diferencia !== 0 && (
              <span className="tabular-nums">{enDinero(Math.abs(cerrada.diferencia))}</span>
            )}
          </p>
        </section>
        <section className="flex flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e4">
          <Renglon que="Con tarjeta, en Estook" cuanto={cerrada.tarjeta} />
          {cerrada.datafono === null ? (
            <p className="text-texto-tenue">Sin el cierre del datáfono.</p>
          ) : (
            <>
              <Renglon que="El datáfono" cuanto={cerrada.datafono} />
              <p
                className={`flex justify-between rounded-grande p-e3 font-bold ${tono(cerrada.diferenciaDeTarjeta ?? 0)}`}
              >
                <span>
                  Tarjeta ·{' '}
                  {cerrada.diferenciaDeTarjeta === 0
                    ? 'cuadra'
                    : (cerrada.diferenciaDeTarjeta ?? 0) < 0
                      ? 'el datáfono dice menos'
                      : 'el datáfono dice más'}
                </span>
                {cerrada.diferenciaDeTarjeta !== 0 && (
                  <span className="tabular-nums">
                    {enDinero(Math.abs(cerrada.diferenciaDeTarjeta ?? 0))}
                  </span>
                )}
              </p>
            </>
          )}
          {cerrada.bizum > 0 && <Renglon que="Bizum" cuanto={cerrada.bizum} />}
          {cerrada.cheque > 0 && <Renglon que="Cheques, a contar aparte" cuanto={cerrada.cheque} />}
        </section>
      </div>

      {cerrada.diferencia !== 0 && (
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

      <section className="flex flex-col gap-e2 rounded-grande border border-borde bg-superficie p-e4">
        <Renglon que="Se queda para mañana" cuanto={cerrada.paraManana} />
        <div className="border-t border-borde pt-e2">
          <Renglon que="Retiras" cuanto={cerrada.retiras} fuerte />
        </div>
      </section>

      <p className="text-secundario text-texto-suave">
        {cerrada.diaCerrado
          ? 'Era la última caja abierta: el día queda cerrado y ya está en Estook › Cierres de caja.'
          : `Sigue abierta ${cerrada.quedanAbiertas.join(', ')}: el día se cierra con ella.`}{' '}
        A nombre de {yo.nombre}. La diferencia no bloquea nada.
      </p>
      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      {impreso !== null && <p className="font-bold text-bien">{impreso}</p>}
      <div className="grid grid-cols-1 gap-e3 sm:grid-cols-[1fr_2fr]">
        <button
          type="button"
          onClick={() => void imprimir()}
          className="min-h-toque-cocina rounded-grande border-2 border-borde font-bold"
        >
          Imprimir el Z
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

function Renglon({
  que,
  cuanto,
  fuerte = false,
}: {
  readonly que: string;
  readonly cuanto: number;
  readonly fuerte?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-e3">
      <span className={fuerte ? 'font-bold' : 'text-texto-suave'}>{que}</span>
      <span className={`font-bold tabular-nums ${fuerte ? 'text-cifra-larga' : ''}`}>
        {eurosConSimbolo(cuanto)}
      </span>
    </div>
  );
}

export { Renglon as RenglonDeLaCaja };
