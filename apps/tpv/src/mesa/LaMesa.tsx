import { useEffect, useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Aviso, Boton, Cargando, ErrorEnCristiano, Hoja } from '@estook/ui';
import {
  FalloDeLaSala,
  usarAcciones,
  usarAlSegundo,
  usarElPlano,
  usarLaCarta,
  usarLaMesa,
} from '../ganchos/usarLaSala.ts';
import type { CuentaEnElPlano } from '../datos/tipos.ts';
import {
  comoPedido,
  guardarBorrador,
  leerBorrador,
  loQueVale,
  type Borrador,
} from '../logica/comanda.ts';
import { elPase, losGruposDeLaCuenta } from '../logica/laCuenta.ts';
import { cuantoLlevan, eurosConSimbolo, personas } from '../logica/texto.ts';
import { irAlPlano } from '../navegar.ts';
import { LaCuenta } from './LaCuenta.tsx';
import { LoQueSePide } from './LoQueSePide.tsx';
import { OpcionesDeLaMesa } from './OpcionesDeLaMesa.tsx';

/**
 * Una mesa (0106, «Comanda»): a la izquierda, la cuenta en el orden en que se come; a
 * la derecha, lo que se pide. **El botón grande dice siempre lo siguiente**: mandar lo
 * nuevo, marchar el pase que toca o, si todo va, nada que hacer. En el móvil, lo que se
 * pide ocupa la pantalla y la cuenta se abre desde abajo («Movil»).
 *
 * Lo nuevo se queda en el aparato hasta «Mandar» (`comanda.ts`): sale a la vez a cocina
 * y a la barra, y lo que sale en marcha lo decide la API (el 1.º sale; el 2.º espera).
 */
export function LaMesa({ cuentaId }: { readonly cuentaId: string }) {
  const conectado = usarAlSegundo();
  const mesa = usarLaMesa(cuentaId, conectado);
  const plano = usarElPlano(conectado);
  const carta = usarLaCarta();
  const ejecutar = usarAcciones();
  const [borrador, setBorradorEnMemoria] = useState<Borrador>(() => leerBorrador(cuentaId));
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [opciones, setOpciones] = useState(false);
  const [cuentaEnElMovil, setCuentaEnElMovil] = useState(false);
  const [salir, setSalir] = useState(false);

  const setBorrador = (nuevo: Borrador) => {
    setBorradorEnMemoria(nuevo);
    guardarBorrador(cuentaId, nuevo);
  };

  useEffect(() => {
    if (hecho === null) return undefined;
    const reloj = window.setTimeout(() => {
      setHecho(null);
    }, 5_000);
    return () => {
      window.clearTimeout(reloj);
    };
  }, [hecho]);

  if (mesa.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fondo">
        <Cargando que="la mesa" />
      </main>
    );
  }
  const datos = mesa.data;
  if (datos === undefined) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-e4 bg-fondo p-e5">
        {mesa.error instanceof FalloDeLaSala ? (
          <ErrorEnCristiano error={mesa.error.error} />
        ) : (
          <Aviso tono="mal" titulo="No llegamos a la mesa">
            Puede ser la conexión. Se vuelve a probar solo.
          </Aviso>
        )}
        <Boton onClick={irAlPlano}>Volver al plano</Boton>
      </main>
    );
  }

  // Otro la liberó, la anuló o la juntó con otra mientras se miraba: se dice, y lo que
  // no se llegó a mandar se enseña para pedirlo donde toque, en vez de perderlo callado.
  if (!datos.abierta) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-e4 bg-fondo p-e5">
        <div className="w-full max-w-[32rem]">
          <Aviso tono="atencion" titulo={`${datos.titulo} ya no está abierta`}>
            Se liberó, se anuló o se juntó con otra desde otro aparato.
            {borrador.length > 0 &&
              ` No se llegó a mandar: ${borrador
                .filter((l) => l.parteDe === null)
                .map((l) => `${l.cantidad} ${l.nombre}`)
                .join(', ')}.`}
          </Aviso>
        </div>
        <Boton
          tono="principal"
          onClick={() => {
            guardarBorrador(cuentaId, []);
            irAlPlano();
          }}
        >
          Volver al plano
        </Boton>
      </main>
    );
  }

  const guardadas = datos.platos.filter((p) => p.estado === 'sin_mandar').length;
  const porMandar = borrador.length + guardadas;
  const grupos = losGruposDeLaCuenta(datos, borrador);
  const total = datos.totalCentimos + loQueVale(borrador);
  const siguiente = datos.loSiguiente;
  const enElPlano: CuentaEnElPlano | undefined = [
    ...(plano.data?.zonas.flatMap((z) =>
      z.mesas.flatMap((m) => (m.cuenta === null ? [] : [m.cuenta])),
    ) ?? []),
    ...(plano.data?.sinMesa ?? []),
  ].find((c) => c.cuentaId === cuentaId);

  async function mandar(): Promise<boolean> {
    setMandando(true);
    setFallo(null);
    if (borrador.length > 0) {
      const pedido = await ejecutar('pedir', { cuenta_id: cuentaId, platos: comoPedido(borrador) });
      if (!pedido.ok) {
        setMandando(false);
        setFallo(pedido.error);
        return false;
      }
      setBorrador([]);
    }
    const mandado = await ejecutar<{
      aCocina: number;
      aLaBarra: number;
      salen: number[];
      esperan: number[];
    }>('mandar_a_cocina', { cuenta_id: cuentaId });
    setMandando(false);
    if (!mandado.ok) {
      setFallo(mandado.error);
      return false;
    }
    setHecho(loQueSeMando(mandado.datos));
    setCuentaEnElMovil(false);
    return true;
  }

  async function marchar(pase: number) {
    setMandando(true);
    setFallo(null);
    const marchado = await ejecutar('marchar', { cuenta_id: cuentaId, pase });
    setMandando(false);
    if (marchado.ok) setHecho(`Marchado el ${elPase(pase)}: la cocina ya lo tiene`);
    else setFallo(marchado.error);
  }

  const elBoton =
    porMandar > 0 ? (
      <Boton
        tono="principal"
        tamano="l"
        ancho
        cargando={mandando}
        textoCargando="Mandando"
        onClick={() => {
          void mandar();
        }}
      >
        Mandar
      </Boton>
    ) : siguiente.que === 'marchar' ? (
      <Boton
        tono="principal"
        tamano="l"
        ancho
        cargando={mandando}
        textoCargando="Marchando"
        onClick={() => {
          void marchar(siguiente.pase);
        }}
      >
        Marchar el {elPase(siguiente.pase)}
      </Boton>
    ) : null;

  // Lo que dice abajo cuando no hay nada que pulsar: qué espera, o que todo va.
  const espera = datos.pases.find((p) => p.marchadoEn === null);
  const comoVa =
    espera === undefined
      ? 'Todo en marcha o servido.'
      : `El ${elPase(espera.numero)} espera: te avisamos cuando salga todo lo de antes.`;

  const subtitulo = [personas(datos.personas), datos.camarero, cuantoLlevan(datos.minutos)]
    .filter((x) => x !== null)
    .join(' · ');

  const laCuenta = (
    <LaCuenta
      grupos={grupos}
      borrador={borrador}
      alCambiarElBorrador={setBorrador}
      porPases={datos.porPases}
      pases={datos.pases.map((p) => p.numero)}
      tocaMarchar={siguiente.que === 'marchar' ? siguiente.pase : null}
      alMarchar={(pase) => {
        void marchar(pase);
      }}
    />
  );

  const volver = () => {
    if (borrador.length > 0) setSalir(true);
    else irAlPlano();
  };

  return (
    <div className="flex h-dvh flex-col bg-fondo text-texto md:flex-row">
      {/* La cuenta: a la izquierda en la tablet. */}
      <section
        aria-label="La cuenta de la mesa"
        className="hidden w-[26rem] shrink-0 flex-col border-r border-borde bg-superficie md:flex"
      >
        <Cabecera
          titulo={datos.titulo}
          subtitulo={subtitulo}
          nota={datos.notaParaCocina}
          alVolver={volver}
          alOpciones={() => {
            setOpciones(true);
          }}
          opcionesListas={enElPlano !== undefined}
        />
        <div className="flex-1 overflow-y-auto px-e4">{laCuenta}</div>
        <div className="flex flex-col gap-e3 border-t border-borde p-e4">
          <Avisos hecho={hecho} fallo={fallo} />
          <div className="flex items-baseline justify-between">
            <span className="text-texto-suave">Total</span>
            <span className="text-cifra">{eurosConSimbolo(total)}</span>
          </div>
          {elBoton}
          {elBoton === null && datos.platos.length > 0 && (
            <p className="text-center text-secundario text-texto-suave">{comoVa}</p>
          )}
        </div>
      </section>

      {/* Lo que se pide: la pantalla entera en el móvil. */}
      <section aria-label="Lo que se pide" className="flex min-h-0 flex-1 flex-col">
        <div className="md:hidden">
          <Cabecera
            titulo={datos.titulo}
            subtitulo={subtitulo}
            nota={datos.notaParaCocina}
            alVolver={volver}
            alOpciones={() => {
              setOpciones(true);
            }}
            opcionesListas={enElPlano !== undefined}
          />
        </div>
        <LoQueSePide
          carta={carta.data}
          cargando={carta.isLoading}
          mesa={datos}
          borrador={borrador}
          alCambiarElBorrador={setBorrador}
        />
        <div className="flex flex-col gap-e2 border-t border-borde bg-superficie p-e3 md:hidden">
          <Avisos hecho={hecho} fallo={fallo} />
          <div className="flex items-center gap-e2">
            <button
              type="button"
              onClick={() => {
                setCuentaEnElMovil(true);
              }}
              className="flex min-h-toque flex-col items-start justify-center rounded-medio px-e2 text-left"
            >
              <span className="text-secundario text-texto-suave">Ver la cuenta</span>
              <span className="font-bold">{eurosConSimbolo(total)}</span>
            </button>
            <div className="flex-1">{elBoton}</div>
          </div>
        </div>
      </section>

      {cuentaEnElMovil && (
        <Hoja
          abierta
          titulo={`La cuenta · ${datos.titulo}`}
          alCerrar={() => {
            setCuentaEnElMovil(false);
          }}
          pie={elBoton ?? undefined}
        >
          {laCuenta}
          <div className="mt-e4 flex items-baseline justify-between">
            <span className="text-texto-suave">Total</span>
            <span className="text-cifra">{eurosConSimbolo(total)}</span>
          </div>
        </Hoja>
      )}

      {opciones && plano.data !== undefined && enElPlano !== undefined && (
        <OpcionesDeLaMesa
          cuenta={enElPlano}
          plano={plano.data}
          sinMandarAqui={borrador.length}
          alCerrar={() => {
            setOpciones(false);
          }}
        />
      )}

      {salir && (
        <Hoja
          abierta
          titulo="Hay platos sin mandar"
          alCerrar={() => {
            setSalir(false);
          }}
        >
          <div className="flex flex-col gap-e3">
            <p>
              {borrador.length === 1 ? 'Un plato nuevo' : `${borrador.length} platos nuevos`} no han
              llegado a la cocina. Se quedan apuntados en esta tablet para cuando vuelvas.
            </p>
            <Boton
              tono="principal"
              tamano="l"
              ancho
              cargando={mandando}
              onClick={() => {
                void mandar().then((bien) => {
                  setSalir(false);
                  if (bien) irAlPlano();
                });
              }}
            >
              Mandar ahora
            </Boton>
            <Boton ancho onClick={irAlPlano}>
              Volver al plano sin mandar
            </Boton>
          </div>
        </Hoja>
      )}
    </div>
  );
}

function Cabecera({
  titulo,
  subtitulo,
  nota,
  alVolver,
  alOpciones,
  opcionesListas,
}: {
  readonly titulo: string;
  readonly subtitulo: string;
  readonly nota: string | null;
  readonly alVolver: () => void;
  readonly alOpciones: () => void;
  /** Las opciones necesitan el plano (las mesas libres, quién toma nota): hasta que llega, espera. */
  readonly opcionesListas: boolean;
}) {
  return (
    <div className="flex items-center gap-e3 border-b border-borde bg-superficie px-e3 py-e3">
      <button
        type="button"
        aria-label="Volver al plano"
        onClick={alVolver}
        className="flex size-toque items-center justify-center rounded-medio bg-fondo text-seccion font-bold"
      >
        ‹
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-seccion font-bold">{titulo}</h1>
        <span className="truncate text-secundario text-texto-suave">{subtitulo}</span>
        {nota !== null && (
          <span className="truncate text-secundario font-semibold text-atencion">
            Cocina: {nota}
          </span>
        )}
      </div>
      <Boton
        tono="secundario"
        cargando={!opcionesListas}
        textoCargando="Opciones"
        onClick={alOpciones}
      >
        Opciones
      </Boton>
    </div>
  );
}

function Avisos({
  hecho,
  fallo,
}: {
  readonly hecho: string | null;
  readonly fallo: ErrorDeLaApi | null;
}) {
  if (fallo !== null) return <ErrorEnCristiano error={fallo} />;
  if (hecho !== null) {
    return (
      <p role="status" className="rounded-medio bg-bien-suave px-e3 py-e2 font-semibold text-bien">
        {hecho}
      </p>
    );
  }
  return null;
}

/** «A cocina 4 y a la barra 2 · sale el 1.º, el 2.º espera». */
function loQueSeMando(m: {
  readonly aCocina: number;
  readonly aLaBarra: number;
  readonly salen: readonly number[];
  readonly esperan: readonly number[];
}): string {
  const adonde = [
    m.aCocina > 0 ? `a cocina ${m.aCocina}` : null,
    m.aLaBarra > 0 ? `a la barra ${m.aLaBarra}` : null,
  ]
    .filter((x) => x !== null)
    .join(' y ');
  const pases = [
    m.salen.length > 0 ? `sale el ${m.salen.map(elPase).join(' y el ')}` : null,
    m.esperan.length > 0
      ? `el ${m.esperan.map(elPase).join(' y el ')} espera${m.esperan.length > 1 ? 'n' : ''}`
      : null,
  ]
    .filter((x) => x !== null)
    .join(', ');
  return `Mandado: ${adonde || 'nada nuevo'}${pases === '' ? '' : ` · ${pases}`}`;
}
