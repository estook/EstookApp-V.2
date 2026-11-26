import { useState } from 'react';
import { Aviso, Boton, Botones, Campo, ErrorEnCristiano, Hoja, Selector, clases } from '@estook/ui';
import {
  delAl,
  diasDeLaSemanaEnLetra,
  diasDeVacaciones,
  diasEnLetra,
  type VacacionesEn,
} from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import type { SusDiasLibres } from './contrato.ts';

/**
 * Pedir vacaciones (la Ampliación 4 · 2, 0153; maqueta, «Pedir vacaciones: marcas los días y ya»).
 *
 * El primer día y el último, y **al momento cuántos días cuentan** (naturales o laborables, como
 * diga su ficha) **y cuántos le quedarían**. No deja pedir más de los que hay: el botón se apaga
 * y lo dice. Lo vuelve a mirar el servidor. Sirve también para **ponérselas a alguien** (quien
 * gestiona las de su gente) y para **proponer otras fechas** en Propuestas.
 *
 * **En laborables no cuentan los días que suele librar** (Richi, 26-nov; 0130): «Según tu horario,
 * libras lunes y martes», con «Cambiar»; y si Estook no lo sabe (sin horario publicado), los marca
 * aquí. En naturales cuenta todo y no se pregunta nada.
 */

const INICIAL: Readonly<Record<number, string>> = {
  1: 'L',
  2: 'M',
  3: 'X',
  4: 'J',
  5: 'V',
  6: 'S',
  7: 'D',
};
const NOMBRE: Readonly<Record<number, string>> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

/** A quién se le cuentan: cómo son sus vacaciones y qué días suele librar, si se sabe. */
export interface ComoSeCuentan {
  readonly vacacionesEn: VacacionesEn;
  readonly libra: SusDiasLibres | null;
}

function manana(hoy: string): string {
  return new Date(Date.parse(`${hoy}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

export function PedirVacaciones({
  hoy,
  cuenta,
  libraFija,
  sePuedenPedir,
  titulo,
  boton,
  conMotivo = false,
  conNota = true,
  personas,
  desdeDeEntrada,
  hastaDeEntrada,
  alCerrar,
  alEnviar,
}: {
  readonly hoy: string;
  /** Cómo se cuentan las de quien pide. Con `personas`, sale de la persona elegida. */
  readonly cuenta: ComoSeCuentan;
  /**
   * Para proponer otras fechas: los días libres con los que se pidió (nulo en naturales). Se
   * cuentan con esos y no se cambian.
   */
  readonly libraFija?: readonly number[] | null;
  /** Lo que se puede pedir todavía; nulo si no se sabe (se pone a otra persona). */
  readonly sePuedenPedir: number | null;
  readonly titulo: string;
  readonly boton: string;
  readonly conMotivo?: boolean;
  readonly conNota?: boolean;
  /** Para ponérselas a alguien: a quién, y cómo se cuentan las suyas. */
  readonly personas?: readonly ({
    readonly personaId: string;
    readonly nombre: string;
  } & ComoSeCuentan)[];
  readonly desdeDeEntrada?: string;
  readonly hastaDeEntrada?: string;
  readonly alCerrar: () => void;
  readonly alEnviar: (que: {
    readonly desde: string;
    readonly hasta: string;
    readonly texto: string | null;
    readonly personaId: string | null;
    /** En laborables, los días que libra si se han marcado o cambiado aquí. */
    readonly libra: readonly number[] | null;
  }) => Promise<ErrorDeLaApi | null>;
}) {
  const [desde, setDesde] = useState(desdeDeEntrada ?? manana(hoy));
  const [hasta, setHasta] = useState(hastaDeEntrada ?? manana(hoy));
  const [texto, setTexto] = useState('');
  const [personaId, setPersonaId] = useState(personas?.[0]?.personaId ?? '');
  // Los días libres marcados aquí: nulo mientras valen los que sabe Estook.
  const [marcados, setMarcados] = useState<number[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const deQuien =
    personas === undefined ? cuenta : (personas.find((p) => p.personaId === personaId) ?? cuenta);
  const sabidos = deQuien.libra;
  const enLaborables =
    libraFija === undefined ? deQuien.vacacionesEn === 'laborables' : libraFija !== null;
  // Con qué días libres se cuenta: los fijos de la petición, los marcados o los que sabe Estook.
  let libra: readonly number[] | null = null;
  if (enLaborables) {
    libra = libraFija ?? marcados ?? (sabidos === null ? null : sabidos.dias);
  }
  const faltanLosLibres = enLaborables && (libra === null || libra.length === 0);

  const fechasBien = desde !== '' && hasta !== '' && hasta >= desde && desde >= hoy;
  const dias = fechasBien && !faltanLosLibres ? diasDeVacaciones(desde, hasta, libra) : 0;
  const quedarian = sePuedenPedir === null ? null : Number((sePuedenPedir - dias).toFixed(2));
  const noCaben = quedarian !== null && quedarian < 0;
  const listo =
    fechasBien &&
    !faltanLosLibres &&
    dias > 0 &&
    !noCaben &&
    !enviando &&
    (personas === undefined || personaId !== '');
  // Si pide uno para sí («libras») o se habla de otro («libra»).
  const tu = personas === undefined && libraFija === undefined;

  async function enviar() {
    setEnviando(true);
    setError(null);
    const fallo = await alEnviar({
      desde,
      hasta,
      texto: texto.trim() === '' ? null : texto.trim(),
      personaId: personas === undefined ? null : personaId,
      libra: libraFija === undefined && enLaborables && marcados !== null ? marcados : null,
    });
    setEnviando(false);
    if (fallo !== null) setError(fallo);
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo={titulo}
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={!listo}
            cargando={enviando}
            textoCargando="Enviando"
            onClick={() => {
              void enviar();
            }}
          >
            {boton}
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e4">
        {error !== null && <ErrorEnCristiano error={error} />}
        {personas !== undefined && (
          <Selector
            etiqueta="A quién"
            opciones={personas.map((p) => ({ valor: p.personaId, texto: p.nombre }))}
            value={personaId}
            onChange={(e) => {
              setPersonaId(e.currentTarget.value);
              setMarcados(null);
            }}
          />
        )}
        <div className="grid grid-cols-2 gap-e3">
          <Campo
            etiqueta="El primer día"
            tipo="fecha"
            value={desde}
            onChange={(e) => {
              const valor = e.currentTarget.value;
              setDesde(valor);
              if (hasta < valor) setHasta(valor);
            }}
          />
          <Campo
            etiqueta="El último día"
            tipo="fecha"
            value={hasta}
            onChange={(e) => {
              setHasta(e.currentTarget.value);
            }}
          />
        </div>

        {enLaborables && (
          <LosDiasQueLibra
            tu={tu}
            fijos={libraFija !== undefined}
            sabidos={sabidos}
            marcados={marcados}
            libra={libra}
            alCambiar={setMarcados}
          />
        )}

        {fechasBien && !faltanLosLibres ? (
          <div
            className="relative flex items-center justify-between gap-e3 overflow-hidden rounded-[16px] p-e3 text-white"
            style={{
              backgroundColor: 'var(--base-vacaciones)',
              backgroundImage: 'var(--degradado-vacaciones)',
            }}
          >
            <span>
              <strong className="block text-[1.3rem] font-extrabold leading-tight">
                {diasEnLetra(dias)} {dias === 1 ? 'día' : 'días'}
              </strong>
              <span className="text-[0.78rem]">
                {delAl(desde, hasta)} · {enLaborables ? 'laborables' : 'naturales'}
              </span>
            </span>
            {quedarian !== null && (
              <span className="text-right text-[0.78rem]">
                {noCaben ? 'No te quedan tantos' : 'Te quedarían'}
                <strong className="block text-[1.1rem] font-extrabold">
                  {noCaben
                    ? `${diasEnLetra(sePuedenPedir ?? 0)} por pedir`
                    : diasEnLetra(quedarian)}
                </strong>
              </span>
            )}
          </div>
        ) : (
          !fechasBien && (
            <p className="text-secundario text-texto-suave">
              Elige el primer día y el último, de hoy en adelante.
            </p>
          )
        )}
        {noCaben && (
          <Aviso tono="atencion" titulo="Son más días de los que te quedan">
            Elige menos días. Si crees que tu saldo no está bien, díselo a quien lleva el local.
          </Aviso>
        )}
        {enLaborables && tu && (
          <p className="text-etiqueta text-texto-tenue">
            Los festivos de tu zona, Estook todavía no los sabe: si cae uno, díselo a quien las
            aprueba.
          </p>
        )}

        {(conNota || conMotivo) && (
          <Campo
            etiqueta={conMotivo ? 'Por qué otras fechas (lo lee)' : 'Una nota (opcional)'}
            ayuda={
              conMotivo
                ? 'Opcional. «Del 24 al 26 se nos queda la sala corta».'
                : 'La ve quien te las aprueba.'
            }
            value={texto}
            onChange={(e) => {
              setTexto(e.currentTarget.value);
            }}
          />
        )}
      </div>
    </Hoja>
  );
}

/** «lunes y martes» → «Lunes y martes». */
function conMayuscula(texto: string): string {
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}

/**
 * Los días que libra, en laborables: lo que sabe Estook dicho en una línea con «Cambiar», o los
 * siete días para marcarlos (L M X J V S D).
 */
function LosDiasQueLibra({
  tu,
  fijos,
  sabidos,
  marcados,
  libra,
  alCambiar,
}: {
  readonly tu: boolean;
  readonly fijos: boolean;
  readonly sabidos: SusDiasLibres | null;
  readonly marcados: number[] | null;
  readonly libra: readonly number[] | null;
  readonly alCambiar: (dias: number[] | null) => void;
}) {
  const enLetra = libra === null || libra.length === 0 ? null : diasDeLaSemanaEnLetra(libra);
  if (fijos || (sabidos !== null && marcados === null)) {
    let deDonde = '';
    if (!fijos && sabidos?.de === 'horario')
      deDonde = tu ? 'según tu horario, ' : 'según su horario, ';
    if (!fijos && sabidos?.de === 'escrito') deDonde = tu ? 'como dijiste, ' : 'como dijo, ';
    const frase = `${deDonde}${tu ? 'libras' : 'libra'} ${enLetra ?? ''}: esos días no cuentan.`;
    return (
      <div className="flex items-center justify-between gap-e3 rounded-[14px] bg-fondo p-e3">
        <p className="text-secundario">{conMayuscula(frase)}</p>
        {!fijos && sabidos !== null && (
          <Boton
            tono="texto"
            onClick={() => {
              alCambiar([...sabidos.dias]);
            }}
          >
            Cambiar
          </Boton>
        )}
      </div>
    );
  }
  const dias = marcados ?? [];
  return (
    <fieldset className="flex flex-col gap-e2">
      <legend className="mb-e2 text-secundario font-semibold">
        {tu ? '¿Qué días sueles librar?' : '¿Qué días suele librar?'}
      </legend>
      <div className="flex gap-e1">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const puesto = dias.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={puesto}
              aria-label={NOMBRE[d]}
              onClick={() => {
                const otros = puesto ? dias.filter((x) => x !== d) : [...dias, d];
                if (otros.length <= 6) alCambiar(otros.sort((a, b) => a - b));
              }}
              className={clases(
                'flex min-h-toque flex-1 items-center justify-center rounded-mediano border text-secundario font-semibold',
                puesto
                  ? 'border-transparent bg-[var(--base-vacaciones)] text-white'
                  : 'border-borde bg-superficie text-texto-suave',
              )}
            >
              {INICIAL[d]}
            </button>
          );
        })}
      </div>
      <p className="text-etiqueta text-texto-suave">
        {enLetra === null
          ? tu
            ? 'Tus vacaciones son en días laborables: los días que libras no cuentan.'
            : 'Sus vacaciones son en días laborables: los días que libra no cuentan.'
          : `${conMayuscula(enLetra)}: esos días no cuentan.`}
      </p>
    </fieldset>
  );
}
