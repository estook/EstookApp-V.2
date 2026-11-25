import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, Campo, ErrorEnCristiano, Hoja } from '@estook/ui';
import { IconoJuntar, IconoPases, type Icono } from '@estook/iconos';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { MesaDelPlano } from '../datos/tipos.ts';
import { irALaMesa } from '../navegar.ts';
import { laHoraDeHoy, losCuartosDeAhora } from '../logica/texto.ts';

/**
 * Abrir una mesa (0106, «AbrirMesa»): los comensales y cómo sale la cocina; lo demás se cambia luego
 * en las opciones de la mesa. **Lo de llevar no pregunta cómo sale** (Richi, 28-oct): sale todo junto,
 * que se lo llevan entero. **Y se programa**: el cliente llama y lo quiere para las 21:30;
 * «Programar» y la hora (0121). **En medio y en dos pasos** desde la Ampliación (0153).
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
  return mesa === null ? (
    <AbrirSinMesa alCerrar={alCerrar} />
  ) : (
    <AbrirUnaMesa mesa={mesa} alCerrar={alCerrar} />
  );
}

/** Lo que dice el servidor al abrir: entra en la cuenta, o en la de quien la abrió antes. */
function usarAbrir(cuentaId: string, que: string) {
  const ejecutar = usarAcciones();
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  async function abrir(entrada: Record<string, unknown>) {
    setAbriendo(true);
    setFallo(null);
    const hecho = await ejecutar<{ cuentaId: string }>('abrir_mesa', entrada, cuentaId, {
      que,
      cuentaId,
      respuesta: { cuentaId },
    });
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
  return { abrir, abriendo, fallo };
}

/** Hasta cuántos llega el deslizador; más, escribiendo el número. */
const HASTA_EN_EL_DESLIZADOR = 20;
/** **Dos, de entrada**: la mesa más habitual, y así abrir sigue costando tres toques (Anexo 10.3). */
const COMENSALES_DE_ENTRADA = 2;

/**
 * **Abrir una mesa, en medio y en dos pasos** (la Ampliación, 0153, fallo 3.1; Richi: «la pestaña sale
 * de abajo y quiero que salga en medio… se ve fatal, todo gris»). Primero **cuántos son**: el número
 * grande, que se toca para escribir 24 o 35, y debajo el deslizador de 1 a 20 con «−» y «+». Luego
 * **cómo sale la cocina**: dos cuadrados grandes, y tocar uno abre la mesa. Si el local eligió en
 * Ajustes del TPV › Cocina y barra que siempre va por pases (o siempre todo junto), el segundo paso no
 * sale y el botón del primero ya abre.
 */
function AbrirUnaMesa({
  mesa,
  alCerrar,
}: {
  readonly mesa: MesaDelPlano;
  readonly alCerrar: () => void;
}) {
  const { aparato } = usarSesion();
  const [cuentaId] = useState(() => crypto.randomUUID());
  const [cuantos, setCuantos] = useState(COMENSALES_DE_ENTRADA);
  const [escribiendo, setEscribiendo] = useState(false);
  const [paso, setPaso] = useState<'cuantos' | 'como'>('cuantos');
  const { abrir, abriendo, fallo } = usarAbrir(cuentaId, `Mesa ${mesa.nombre} · abierta`);
  const siempre = aparato.comoSaleLaCocina ?? 'preguntar';
  const poner = (n: number) => {
    setCuantos(Math.min(99, Math.max(1, Math.round(n))));
  };
  const abrirCon = (porPases: boolean) => {
    void abrir({ cuenta_id: cuentaId, mesa_id: mesa.id, personas: cuantos, por_pases: porPases });
  };

  return (
    <Hoja
      abierta
      enMedio
      alCerrar={alCerrar}
      titulo={
        paso === 'cuantos'
          ? `Mesa ${mesa.nombre}`
          : `Mesa ${mesa.nombre} · ${String(cuantos)} ${cuantos === 1 ? 'comensal' : 'comensales'}`
      }
      acciones={
        <span aria-hidden className="flex gap-e1">
          <i className="h-1 w-5 rounded-redondo bg-naranja" />
          <i className={`h-1 w-5 rounded-redondo ${paso === 'como' ? 'bg-naranja' : 'bg-borde'}`} />
        </span>
      }
    >
      {paso === 'cuantos' ? (
        <div className="flex flex-col gap-e5 pt-e2">
          <div className="flex flex-col items-center gap-e1">
            {escribiendo ? (
              <input
                aria-label="Cuántos comensales"
                inputMode="numeric"
                autoFocus
                value={String(cuantos)}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, '').slice(0, 2));
                  if (n > 0) poner(n);
                }}
                onBlur={() => {
                  setEscribiendo(false);
                }}
                className="w-32 rounded-grande border-2 border-naranja bg-fondo text-center text-[3.2rem] font-bold leading-none tabular-nums"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEscribiendo(true);
                }}
                aria-label={`${String(cuantos)} comensales. Toca para escribir otro número`}
                className="rounded-grande border-b-2 border-dashed border-borde px-e4 text-[3.2rem] font-bold leading-none tabular-nums"
              >
                {cuantos}
              </button>
            )}
            <span className="text-secundario font-semibold text-texto-tenue">
              comensales · toca el número para escribirlo
            </span>
          </div>
          <div className="flex items-center gap-e3">
            <BotonRedondo
              etiqueta="Uno menos"
              apagado={cuantos <= 1}
              onClick={() => {
                poner(cuantos - 1);
              }}
            >
              −
            </BotonRedondo>
            <input
              type="range"
              aria-label="Comensales"
              min={1}
              max={HASTA_EN_EL_DESLIZADOR}
              step={1}
              value={Math.min(cuantos, HASTA_EN_EL_DESLIZADOR)}
              onChange={(e) => {
                poner(Number(e.target.value));
              }}
              className="h-10 min-w-0 flex-1 cursor-pointer accent-naranja"
            />
            <BotonRedondo
              etiqueta="Uno más"
              apagado={cuantos >= 99}
              onClick={() => {
                poner(cuantos + 1);
              }}
            >
              +
            </BotonRedondo>
          </div>
          {fallo !== null && <ErrorEnCristiano error={fallo} />}
          <Boton
            tono="principal"
            tamano="l"
            ancho
            cargando={abriendo}
            textoCargando="Abriendo"
            onClick={() => {
              if (siempre === 'preguntar') setPaso('como');
              else abrirCon(siempre === 'pases');
            }}
          >
            {siempre === 'preguntar' ? 'Siguiente' : 'Abrir'}
          </Boton>
        </div>
      ) : (
        <div className="flex flex-col gap-e4 pt-e2">
          <p className="font-bold text-texto-suave">¿Cómo sale la cocina?</p>
          <div className="grid grid-cols-2 gap-e3">
            <Cuadrado
              icono={IconoPases}
              titulo="Por pases"
              detalle="El 2.º espera a que lo marches"
              apagado={abriendo}
              onClick={() => {
                abrirCon(true);
              }}
            />
            <Cuadrado
              icono={IconoJuntar}
              titulo="Todo junto"
              detalle="Sale todo a la vez"
              apagado={abriendo}
              onClick={() => {
                abrirCon(false);
              }}
            />
          </div>
          {fallo !== null && <ErrorEnCristiano error={fallo} />}
          <button
            type="button"
            onClick={() => {
              setPaso('cuantos');
            }}
            className="min-h-toque self-center text-secundario font-semibold text-texto-suave"
          >
            ← Volver a los comensales
          </button>
        </div>
      )}
    </Hoja>
  );
}

function BotonRedondo({
  etiqueta,
  apagado,
  onClick,
  children,
}: {
  readonly etiqueta: string;
  readonly apagado: boolean;
  readonly onClick: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      disabled={apagado}
      onClick={onClick}
      className="flex size-12 shrink-0 items-center justify-center rounded-redondo border border-borde bg-fondo text-pantalla font-bold disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Cuadrado({
  icono: Dibujo,
  titulo,
  detalle,
  apagado,
  onClick,
}: {
  readonly icono: Icono;
  readonly titulo: string;
  readonly detalle: string;
  readonly apagado: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={apagado}
      onClick={onClick}
      aria-label={`${titulo}. ${detalle}`}
      className="flex flex-col items-center gap-e2 rounded-mayor border-2 border-borde bg-fondo px-e3 py-e5 text-center hover:border-naranja focus-visible:border-naranja disabled:opacity-50"
    >
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-grande bg-naranja/15 text-naranja"
      >
        <Dibujo size={28} />
      </span>
      <span className="text-seccion font-bold">{titulo}</span>
      <span className="text-secundario text-texto-suave">{detalle}</span>
    </button>
  );
}

/**
 * Abrir en barra o para llevar (0106; lo de llevar, programado a una hora, 0121): dónde, el nombre y,
 * si es para llevar, para cuándo. En medio también, como abrir una mesa (0153).
 */
function AbrirSinMesa({ alCerrar }: { readonly alCerrar: () => void }) {
  const [cuentaId] = useState(() => crypto.randomUUID());
  const [porPases, setPorPases] = useState(true);
  const [tipo, setTipo] = useState<'barra' | 'para_llevar'>('barra');
  const [nombre, setNombre] = useState('');
  /** Lo de llevar, para cuándo: nulo, para ya. */
  const [paraLas, setParaLas] = useState<Date | null>(null);
  const [programando, setProgramando] = useState(false);
  const { abrir, abriendo, fallo } = usarAbrir(
    cuentaId,
    `${tipo === 'barra' ? 'Barra' : 'Para llevar'} · abierta`,
  );
  const sePuede = !(tipo === 'para_llevar' && programando && paraLas === null);
  const programado = tipo === 'para_llevar' && programando ? paraLas : null;

  return (
    <Hoja
      abierta
      enMedio
      alCerrar={alCerrar}
      titulo="En barra o para llevar"
      pie={
        <Boton
          tono="principal"
          tamano="l"
          ancho
          disabled={!sePuede}
          cargando={abriendo}
          textoCargando="Abriendo"
          onClick={() => {
            void abrir({
              cuenta_id: cuentaId,
              tipo,
              por_pases: porPases,
              ...(nombre.trim() === '' ? {} : { nombre: nombre.trim() }),
              ...(programado === null ? {} : { para_las: programado.toISOString() }),
            });
          }}
        >
          Abrir
        </Boton>
      }
    >
      <div className="flex flex-col gap-e5 pt-e2">
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
        {tipo === 'para_llevar' && (
          <>
            <Eleccion
              pregunta="¿Para cuándo?"
              opciones={[
                { valor: 'ya', texto: 'Ahora' },
                { valor: 'programar', texto: 'Programar', ayuda: 'a una hora' },
              ]}
              elegida={programando ? 'programar' : 'ya'}
              alElegir={(v) => {
                setProgramando(v === 'programar');
              }}
            />
            {programando && <LaHora elegida={paraLas} alElegir={setParaLas} />}
          </>
        )}
        {tipo === 'barra' && (
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
        )}
        {fallo !== null && <ErrorEnCristiano error={fallo} />}
      </div>
    </Hoja>
  );
}

/**
 * **La hora de recogida** (0121): los cuartos de las próximas tres horas, a un toque, y «Otra
 * hora» para lo que no está. Una hora que ya ha pasado hoy es de mañana.
 */
function LaHora({
  elegida,
  alElegir,
}: {
  readonly elegida: Date | null;
  readonly alElegir: (cuando: Date) => void;
}) {
  const [otra, setOtra] = useState('');
  const cuartos = losCuartosDeAhora(new Date(Date.now()), 12);
  const hora = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return (
    <fieldset className="flex flex-col gap-e3">
      <legend className="mb-e3 text-seccion font-bold">¿A qué hora lo recogen?</legend>
      <div className="grid grid-cols-4 gap-e2 sm:grid-cols-6">
        {cuartos.map((c) => (
          <button
            key={c.getTime()}
            type="button"
            aria-pressed={elegida?.getTime() === c.getTime()}
            onClick={() => {
              setOtra('');
              alElegir(c);
            }}
            className={[
              'min-h-toque-cocina rounded-grande font-bold tabular-nums',
              elegida?.getTime() === c.getTime()
                ? 'bg-texto text-superficie'
                : 'border border-borde bg-superficie text-texto',
            ].join(' ')}
          >
            {hora(c)}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-e2">
        <span className="text-secundario font-semibold text-texto-tenue">Otra hora</span>
        <input
          type="time"
          value={otra}
          onChange={(e) => {
            setOtra(e.target.value);
            const cuando = laHoraDeHoy(e.target.value, new Date(Date.now()));
            if (cuando !== null) alElegir(cuando);
          }}
          className="min-h-toque-cocina rounded-grande border-2 border-borde bg-superficie px-e4 text-seccion text-texto"
        />
      </label>
    </fieldset>
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
                ? 'bg-texto text-superficie'
                : 'border border-borde bg-superficie text-texto',
            ].join(' ')}
          >
            <span className="font-bold">{o.texto}</span>
            {o.ayuda !== undefined && (
              <span
                className={[
                  'text-secundario',
                  elegida === o.valor ? 'text-superficie/80' : 'text-texto-suave',
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
