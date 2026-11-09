import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { MOTIVOS_PARA_METER, MOTIVOS_PARA_SACAR, type ParaQueSeAbre } from '@estook/dominio';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { LoApruebaUnEncargado } from '../mesa/LoApruebaUnEncargado.tsx';
import { eurosConSimbolo } from '../logica/texto.ts';
import { AvisoDeLaCaja, ErrorDeLaCaja } from './AbrirCaja.tsx';
import { deEurosACentimos } from './dinero.ts';
import { idNuevo, pideEncargado, usarLaCaja, usarRecargarLaCaja } from '../ganchos/usarLaCaja.ts';

const PARA_QUE: readonly { readonly que: ParaQueSeAbre; readonly nombre: string }[] = [
  { que: 'cambio', nombre: 'Cambio' },
  { que: 'sacar', nombre: 'Sacar dinero' },
  { que: 'meter', nombre: 'Meter dinero' },
];

/**
 * **Abrir el cajón** (Anexo 11.6; Richi, 28-oct; maqueta del 9-nov, tramo 3): un solo botón para todo
 * lo que no es una venta, que **siempre pregunta para qué**. Cambio (sin importe), sacar o meter
 * dinero con su para qué. Queda con quién, cuándo y por qué, y sale en el X y en el Z. Si quien está
 * no puede, lo aprueba un encargado con su PIN ahí mismo.
 */
export function AbrirElCajon({ alAcabar }: { readonly alAcabar: () => void }) {
  const { yo, cliente } = usarSesion();
  const caja = usarLaCaja();
  const recargar = usarRecargarLaCaja();
  const [movimientoId, setMovimientoId] = useState(idNuevo);
  const [que, setQue] = useState<ParaQueSeAbre>('sacar');
  const [importe, setImporte] = useState('');
  const [motivo, setMotivo] = useState<string>('Un proveedor');
  const [nota, setNota] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [aprobar, setAprobar] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);

  if (caja.isLoading || caja.data === undefined) {
    return caja.error === null ? <Cargando que="la caja" /> : <ErrorDeLaCaja />;
  }
  if (caja.data.abierta === null) {
    return (
      <AvisoDeLaCaja
        titulo="La caja no está abierta"
        frase="Lo que se mete o se saca va a una caja abierta: ábrela primero."
        alVolver={alAcabar}
      />
    );
  }

  const motivos: readonly string[] = que === 'sacar' ? MOTIVOS_PARA_SACAR : MOTIVOS_PARA_METER;
  const centimos = deEurosACentimos(importe);
  const falta =
    que !== 'cambio' &&
    (centimos === null || centimos <= 0 || (motivo === 'Otro' && nota.trim().length < 2));

  async function hacer(pin?: string): Promise<ErrorDeLaApi | null> {
    setOcupado(true);
    setFallo(null);
    const respuesta = await cliente.ejecutar('mover_dinero', {
      movimiento_id: movimientoId,
      que,
      ...(que === 'cambio'
        ? {}
        : {
            importe: centimos ?? 0,
            motivo,
            ...(nota.trim() === '' ? {} : { nota: nota.trim() }),
          }),
      ...(pin === undefined ? {} : { pin_del_encargado: pin }),
    });
    setOcupado(false);
    if (respuesta.ok) {
      setAprobar(false);
      setHecho(
        que === 'cambio'
          ? 'Cajón abierto para dar cambio.'
          : `${que === 'sacar' ? 'Sacados' : 'Metidos'} ${eurosConSimbolo(centimos ?? 0)}: ${motivo === 'Otro' ? nota.trim() : motivo}.`,
      );
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
        que={
          que === 'cambio' ? 'Abrir el cajón' : que === 'sacar' ? 'Sacar dinero' : 'Meter dinero'
        }
        pide={yo.nombre}
        motivo={
          que === 'cambio' ? 'Para dar cambio' : `${eurosConSimbolo(centimos ?? 0)} · ${motivo}`
        }
        alAprobar={(pin) => hacer(pin)}
        alCancelar={() => {
          setAprobar(false);
        }}
      />
    );
  }

  if (hecho !== null) {
    return (
      <div className="flex flex-col items-start gap-e4">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-redondo bg-bien text-cifra-media text-fondo"
        >
          ✓
        </span>
        <h2 className="text-pantalla font-bold">{hecho}</h2>
        <p className="text-texto-suave">Queda apuntado a nombre de {yo.nombre}, y sale en el Z.</p>
        <div className="flex flex-wrap gap-e3">
          <button
            type="button"
            onClick={() => {
              setHecho(null);
              setImporte('');
              setNota('');
              setMovimientoId(idNuevo());
            }}
            className="min-h-toque-cocina rounded-grande border-2 border-borde px-e5 font-bold"
          >
            Otra vez
          </button>
          <button
            type="button"
            onClick={alAcabar}
            className="min-h-toque-cocina rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[32rem] flex-col gap-e4">
      <div className="grid grid-cols-3 gap-e2" role="group" aria-label="Para qué se abre">
        {PARA_QUE.map((p) => (
          <button
            key={p.que}
            type="button"
            aria-pressed={que === p.que}
            onClick={() => {
              setQue(p.que);
              if (p.que !== 'cambio') {
                const lista: readonly string[] =
                  p.que === 'sacar' ? MOTIVOS_PARA_SACAR : MOTIVOS_PARA_METER;
                if (!lista.includes(motivo)) setMotivo(lista[0] ?? 'Otro');
              }
            }}
            className={`min-h-toque-cocina rounded-redondo border-2 px-e2 font-bold ${
              que === p.que ? 'border-naranja bg-naranja-suave' : 'border-borde'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {que === 'cambio' ? (
        <p className="text-texto-suave">
          Para cambiar un billete. Sin importe: solo queda apuntado quién y cuándo.
        </p>
      ) : (
        <>
          <label className="flex items-center justify-between gap-e3 rounded-grande border-2 border-borde bg-fondo px-e4 py-e2 focus-within:border-naranja">
            <span className="text-texto-suave">Cuánto</span>
            <input
              inputMode="decimal"
              value={importe}
              placeholder="0,00"
              onChange={(e) => {
                setImporte(e.currentTarget.value);
              }}
              className="w-[9ch] bg-transparent text-right text-cifra-larga font-bold tabular-nums outline-none"
            />
          </label>
          <div className="flex flex-col gap-e2">
            <span className="text-secundario font-bold text-texto-suave">Para qué</span>
            <div className="flex flex-wrap gap-e2" role="group" aria-label="Para qué">
              {motivos.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={motivo === m}
                  onClick={() => {
                    setMotivo(m);
                  }}
                  className={`min-h-toque rounded-redondo border-2 px-e4 font-bold ${
                    motivo === m ? 'border-naranja bg-naranja-suave' : 'border-borde'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-e3 rounded-grande border-2 border-borde bg-fondo px-e4 py-e2 focus-within:border-naranja">
            <span className="text-texto-suave">
              {motivo === 'Otro' ? 'Escribe para qué' : 'Nota, si quieres'}
            </span>
            <input
              value={nota}
              maxLength={120}
              onChange={(e) => {
                setNota(e.currentTarget.value);
              }}
              className="min-w-0 flex-1 bg-transparent text-right font-bold outline-none"
            />
          </label>
        </>
      )}

      {fallo !== null && <ErrorEnCristiano error={fallo} />}
      <button
        type="button"
        disabled={ocupado || falta}
        onClick={() => void hacer()}
        className="min-h-toque-cocina rounded-grande bg-naranja text-seccion font-bold text-sobre-naranja disabled:opacity-50"
      >
        {ocupado
          ? 'Un momento…'
          : que === 'cambio'
            ? 'Abrir el cajón'
            : `${que === 'sacar' ? 'Sacar' : 'Meter'} ${centimos === null ? '' : eurosConSimbolo(centimos)}`}
      </button>
    </div>
  );
}
