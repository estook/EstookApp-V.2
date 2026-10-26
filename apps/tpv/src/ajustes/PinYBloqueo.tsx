import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { LIMITES_DEL_BLOQUEO, type AjustesDelBloqueo } from '@estook/dominio';
import { ErrorEnCristiano } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Ajustes del TPV › PIN y bloqueo** (maqueta 17; Anexo 11.4): a los cuántos minutos se
 * bloquea cada aparato, si se bloquea al acabar cada cobro, y si solo entra quien ha
 * fichado. Los PIN se dan y se cambian en Estook › Equipo.
 */
export function PinYBloqueo() {
  const { cliente, aparato } = usarSesion();
  const [ajustes, setAjustes] = useState<AjustesDelBloqueo>(aparato.bloqueo);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function guardar(nuevos: AjustesDelBloqueo) {
    setAjustes(nuevos);
    setOcupado(true);
    setError(null);
    setGuardado(false);
    const respuesta = await cliente.ejecutar<AjustesDelBloqueo>('guardar_pin_y_bloqueo', {
      minutos: nuevos.minutos,
      al_cobrar: nuevos.alCobrar,
      personal_minutos: nuevos.personalMinutos,
      solo_entra_quien_ficha: nuevos.soloEntraQuienFicha,
    });
    setOcupado(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      setAjustes(aparato.bloqueo);
      return;
    }
    setAjustes(respuesta.datos);
    setGuardado(true);
  }

  return (
    <div className="flex max-w-[44rem] flex-col gap-e5">
      <div className="flex flex-col gap-e1">
        <h1 className="text-cifra-media font-bold">PIN y bloqueo</h1>
        <span className="text-secundario text-texto-tenue">
          Cada uno entra con su PIN de Estook. Los PIN se dan y se cambian en Estook › Equipo.
        </span>
      </div>
      {error !== null && <ErrorEnCristiano error={error} />}

      <section className="flex flex-col gap-e4 rounded-mayor bg-superficie p-e5">
        <span className="text-seccion font-bold">Cuándo se bloquea solo</span>
        <Minutos
          titulo="Caja y comandero para todos"
          frase="Sin tocar la pantalla"
          valor={ajustes.minutos}
          desde={LIMITES_DEL_BLOQUEO.minutos.desde}
          hasta={LIMITES_DEL_BLOQUEO.minutos.hasta}
          paso={1}
          ocupado={ocupado}
          alCambiar={(minutos) => void guardar({ ...ajustes, minutos })}
        />
        <Casilla
          titulo="Y al acabar cada cobro"
          frase="El siguiente cliente lo atiende quien teclee su PIN"
          puesta={ajustes.alCobrar}
          ocupado={ocupado}
          alCambiar={(alCobrar) => void guardar({ ...ajustes, alCobrar })}
        />
        <div className="h-px bg-borde" />
        <Minutos
          titulo="El móvil de cada camarero"
          frase="Solo lo abre su dueño: puede aguantar más"
          valor={ajustes.personalMinutos}
          desde={LIMITES_DEL_BLOQUEO.personalMinutos.desde}
          hasta={LIMITES_DEL_BLOQUEO.personalMinutos.hasta}
          paso={5}
          ocupado={ocupado}
          alCambiar={(personalMinutos) => void guardar({ ...ajustes, personalMinutos })}
        />
        <span className="text-secundario text-texto-tenue">
          Las pantallas de cocina y de barra no se bloquean nunca: nadie las maneja con PIN.
        </span>
      </section>

      <section className="rounded-mayor bg-superficie p-e5">
        <Casilla
          titulo="En la caja, solo entra quien ha fichado"
          frase="Apagado: a quien no ha fichado se le ofrece fichar la entrada en un toque, y entra igual. En un comandero no se entra nunca sin fichar"
          puesta={ajustes.soloEntraQuienFicha}
          ocupado={ocupado}
          alCambiar={(soloEntraQuienFicha) => void guardar({ ...ajustes, soloEntraQuienFicha })}
        />
      </section>

      <p role="status" className="text-secundario text-texto-tenue">
        {guardado
          ? 'Guardado. Los aparatos lo cogen en su siguiente latido, en menos de un minuto.'
          : 'Se guarda solo.'}
      </p>
    </div>
  );
}

export function Minutos({
  titulo,
  frase,
  valor,
  desde,
  hasta,
  paso,
  ocupado,
  alCambiar,
}: {
  readonly titulo: string;
  readonly frase: string;
  readonly valor: number;
  readonly desde: number;
  readonly hasta: number;
  readonly paso: number;
  readonly ocupado: boolean;
  readonly alCambiar: (valor: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-e4">
      <span className="flex min-w-[12rem] flex-1 flex-col">
        <span className="font-bold">{titulo}</span>
        <span className="text-secundario text-texto-tenue">{frase}</span>
      </span>
      <span className="flex items-center gap-e2">
        <button
          type="button"
          aria-label={`${titulo}: menos minutos`}
          disabled={ocupado || valor <= desde}
          onClick={() => {
            alCambiar(Math.max(desde, valor - paso));
          }}
          className="size-12 rounded-grande bg-charcoal text-pantalla font-bold disabled:opacity-50"
        >
          −
        </button>
        <span className="w-24 text-center text-pantalla font-bold tabular-nums" aria-live="polite">
          {valor} min
        </span>
        <button
          type="button"
          aria-label={`${titulo}: más minutos`}
          disabled={ocupado || valor >= hasta}
          onClick={() => {
            alCambiar(Math.min(hasta, valor + paso));
          }}
          className="size-12 rounded-grande bg-charcoal text-pantalla font-bold disabled:opacity-50"
        >
          +
        </button>
      </span>
    </div>
  );
}

export function Casilla({
  titulo,
  frase,
  puesta,
  ocupado,
  alCambiar,
}: {
  readonly titulo: string;
  readonly frase: string;
  readonly puesta: boolean;
  readonly ocupado: boolean;
  readonly alCambiar: (puesta: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-e4">
      <span className="flex flex-1 flex-col">
        <span className="font-bold">{titulo}</span>
        <span className="text-secundario text-texto-tenue">{frase}</span>
      </span>
      <input
        type="checkbox"
        checked={puesta}
        disabled={ocupado}
        onChange={(e) => {
          alCambiar(e.target.checked);
        }}
        className="size-7 accent-naranja"
      />
    </label>
  );
}
