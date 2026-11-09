import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { elTotalContado, enDinero } from '@estook/dominio';
import { Cargando, ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { LoApruebaUnEncargado } from '../mesa/LoApruebaUnEncargado.tsx';
import { eurosConSimbolo } from '../logica/texto.ts';
import { irA } from '../navegar.ts';
import { ContarElCajon } from './ContarElCajon.tsx';
import { idNuevo, pideEncargado, usarLaCaja, usarRecargarLaCaja } from './usarLaCaja.ts';
import type { CajaAbierta, ElRecuento } from './tipos.ts';

/**
 * **Abrir caja** (Anexo 11.6; maqueta del 9-nov, tramo 1; Richi, 9-nov): se propone lo que se dejó
 * anoche en el cajón. **«Está correcto · Abrir caja»** abre con eso, en un toque; **«Contar»** va
 * billete a billete y dice si hay más o menos que anoche, sin parar. El primer día, o con «Recuento
 * obligatorio al abrir», se cuenta siempre. Si quien está no puede, lo aprueba un encargado con su
 * PIN ahí mismo. El cajón se abre para meter el fondo.
 */
export function AbrirCaja({
  alAbrir,
  alVolver,
}: {
  /** Ya está abierta: a cobrar, o a la sala. */
  readonly alAbrir: () => void;
  readonly alVolver: () => void;
}) {
  const { yo, cliente } = usarSesion();
  const caja = usarLaCaja();
  const recargar = usarRecargarLaCaja();
  const [turnoId] = useState(idNuevo);
  const [contando, setContando] = useState(false);
  const [recuento, setRecuento] = useState<ElRecuento>({});
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [aprobar, setAprobar] = useState<{ contado: ElRecuento | null } | null>(null);
  const [hecho, setHecho] = useState<CajaAbierta | null>(null);

  if (caja.isLoading || caja.data === undefined) {
    return caja.error === null ? <Cargando que="la caja" /> : <ErrorDeLaCaja />;
  }
  const c = caja.data;
  if (c.cajon === null) {
    return (
      <Aviso
        titulo="Este aparato no tiene cajón"
        frase="La caja se abre en la caja: el aparato que tiene el cajón. Se le pone en Ajustes del TPV › Aparatos."
        alVolver={alVolver}
      />
    );
  }
  if (c.abierta?.deOtroDia === true) {
    return (
      <Aviso
        titulo="La caja de ayer sigue abierta"
        frase={`La abrió ${c.abierta.abiertaPor}. Mientras, se sigue cobrando con ella. Ciérrala contando el cajón y después abre la de hoy.`}
        accion={{
          texto: 'Cerrarla',
          alTocar: () => {
            irA('caja/cerrar');
          },
        }}
        alVolver={alVolver}
      />
    );
  }

  const ultima = c.loDeLaUltimaVez;
  const siempreSeCuenta = c.ajustes.recuentoAlAbrir || ultima === null;
  const cuenta = contando || siempreSeCuenta;
  const total = elTotalContado(recuento);

  async function abrir(contado: ElRecuento | null, pin?: string): Promise<ErrorDeLaApi | null> {
    setOcupado(true);
    setFallo(null);
    const respuesta = await cliente.ejecutar<CajaAbierta>('abrir_caja', {
      turno_id: turnoId,
      ...(contado === null ? {} : { contado }),
      ...(pin === undefined ? {} : { pin_del_encargado: pin }),
    });
    setOcupado(false);
    if (respuesta.ok) {
      setAprobar(null);
      setHecho(respuesta.datos);
      await recargar();
      return null;
    }
    if (pin === undefined && pideEncargado(respuesta.error)) {
      setAprobar({ contado });
      return null;
    }
    if (pin === undefined) setFallo(respuesta.error);
    return respuesta.error;
  }

  if (aprobar !== null) {
    return (
      <LoApruebaUnEncargado
        que="Abrir la caja"
        pide={yo.nombre}
        motivo={
          aprobar.contado === null
            ? `Con ${eurosConSimbolo(ultima ?? 0)}, lo que se quedó anoche`
            : `Con ${eurosConSimbolo(elTotalContado(aprobar.contado))}, contados`
        }
        alAprobar={(pin) => abrir(aprobar.contado, pin)}
        alCancelar={() => {
          setAprobar(null);
        }}
      />
    );
  }

  if (hecho !== null) {
    const frente = hecho.frenteALaUltimaVez;
    return (
      <div className="flex flex-col items-start gap-e4">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-redondo bg-bien text-cifra-media text-fondo"
        >
          ✓
        </span>
        <h2 className="text-pantalla font-bold">Caja abierta con {eurosConSimbolo(hecho.fondo)}</h2>
        {frente !== 0 && (
          <p className="rounded-grande bg-atencion-suave p-e3 font-bold text-atencion">
            Había {enDinero(Math.abs(frente))} {frente < 0 ? 'menos' : 'más'} que lo que se quedó
            anoche. Queda apuntado.
          </p>
        )}
        <p className="text-texto-suave">
          {hecho.cajonAbierto ? 'El cajón se ha abierto para meter el fondo. ' : ''}A nombre de{' '}
          {yo.nombre}.
        </p>
        <button
          type="button"
          onClick={alAbrir}
          className="min-h-toque-cocina rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja"
        >
          Seguir
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e4">
      {ultima === null ? (
        <div>
          <h2 className="text-pantalla font-bold">¿Con cuánto empiezas?</h2>
          <p className="text-texto-suave">
            Es la primera vez: cuenta lo que metes en el cajón. Será lo que se proponga mañana.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-e1 rounded-mayor border border-borde bg-superficie p-e5 text-center">
          <span className="text-texto-suave">Anoche se quedó en el cajón</span>
          <span className="text-cifra font-bold tabular-nums">{eurosConSimbolo(ultima)}</span>
          {c.ajustes.recuentoAlAbrir && (
            <span className="text-secundario text-texto-tenue">
              En este local se cuenta siempre al abrir.
            </span>
          )}
        </div>
      )}

      {fallo !== null && <ErrorEnCristiano error={fallo} />}

      {!cuenta ? (
        <div className="grid grid-cols-1 gap-e3 sm:grid-cols-[1fr_2fr]">
          <button
            type="button"
            onClick={() => {
              setContando(true);
            }}
            className="min-h-toque-cocina rounded-grande border-2 border-borde text-seccion font-bold"
          >
            Contar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void abrir(null)}
            className="min-h-toque-cocina rounded-grande bg-bien text-seccion font-bold text-fondo disabled:opacity-60"
          >
            {ocupado ? 'Abriendo…' : 'Está correcto · Abrir caja'}
          </button>
        </div>
      ) : (
        <>
          <ContarElCajon recuento={recuento} alCambiar={setRecuento} />
          <div className="flex flex-wrap items-center justify-between gap-e3 rounded-grande bg-superficie p-e4">
            <span className="text-texto-suave">En el cajón</span>
            <span className="text-cifra-media font-bold tabular-nums">
              {eurosConSimbolo(total)}
            </span>
          </div>
          {ultima !== null && total > 0 && total !== ultima && (
            <p className="rounded-grande bg-atencion-suave p-e3 font-bold text-atencion">
              Hay {enDinero(Math.abs(total - ultima))} {total < ultima ? 'menos' : 'más'} que lo que
              se quedó anoche. Se apunta y se abre igual.
            </p>
          )}
          {ultima !== null && total === ultima && (
            <p className="rounded-grande bg-bien-suave p-e3 font-bold text-bien">
              Igual que lo que se quedó anoche
            </p>
          )}
          <button
            type="button"
            disabled={ocupado || total <= 0}
            onClick={() => void abrir(recuento)}
            className="min-h-toque-cocina rounded-grande bg-bien text-seccion font-bold text-fondo disabled:opacity-60"
          >
            {ocupado ? 'Abriendo…' : `Abrir caja con ${eurosConSimbolo(total)}`}
          </button>
        </>
      )}
    </div>
  );
}

function Aviso({
  titulo,
  frase,
  accion,
  alVolver,
}: {
  readonly titulo: string;
  readonly frase: string;
  readonly accion?: { readonly texto: string; readonly alTocar: () => void };
  readonly alVolver: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-e4">
      <h2 className="text-pantalla font-bold">{titulo}</h2>
      <p className="text-texto-suave">{frase}</p>
      <div className="flex flex-wrap gap-e3">
        {accion !== undefined && (
          <button
            type="button"
            onClick={accion.alTocar}
            className="min-h-toque-cocina rounded-grande bg-atencion px-e6 text-seccion font-bold text-fondo"
          >
            {accion.texto}
          </button>
        )}
        <button
          type="button"
          onClick={alVolver}
          className="min-h-toque-cocina rounded-grande border-2 border-borde px-e6 text-seccion font-bold"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

function ErrorDeLaCaja() {
  return (
    <p className="rounded-grande bg-mal-suave p-e4 font-bold text-mal">
      No se ha podido leer la caja. Mira la conexión y vuelve a entrar.
    </p>
  );
}

export { Aviso as AvisoDeLaCaja, ErrorDeLaCaja };
