import { useState } from 'react';
import { Aviso, Boton, Botones, Campo, ErrorEnCristiano, Hoja, Selector } from '@estook/ui';
import { delAl, diasDeVacaciones, diasEnLetra, type VacacionesEn } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';

/**
 * Pedir vacaciones (la Ampliación 4 · 2, 0153; maqueta, «Pedir vacaciones: marcas los días y ya»).
 *
 * El primer día y el último, y **al momento cuántos días cuentan** (naturales o laborables, como
 * diga su ficha) **y cuántos le quedarían**. No deja pedir más de los que hay: el botón se apaga
 * y lo dice. Lo vuelve a mirar el servidor. Sirve también para **ponérselas a alguien** (quien
 * gestiona las de su gente) y para **proponer otras fechas** en Propuestas.
 */

function manana(hoy: string): string {
  return new Date(Date.parse(`${hoy}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

export function PedirVacaciones({
  hoy,
  vacacionesEn,
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
  readonly vacacionesEn: VacacionesEn;
  /** Lo que se puede pedir todavía; nulo si no se sabe (se pone a otra persona). */
  readonly sePuedenPedir: number | null;
  readonly titulo: string;
  readonly boton: string;
  readonly conMotivo?: boolean;
  readonly conNota?: boolean;
  /** Para ponérselas a alguien: a quién. */
  readonly personas?: readonly { readonly personaId: string; readonly nombre: string }[];
  readonly desdeDeEntrada?: string;
  readonly hastaDeEntrada?: string;
  readonly alCerrar: () => void;
  readonly alEnviar: (que: {
    readonly desde: string;
    readonly hasta: string;
    readonly texto: string | null;
    readonly personaId: string | null;
  }) => Promise<ErrorDeLaApi | null>;
}) {
  const [desde, setDesde] = useState(desdeDeEntrada ?? manana(hoy));
  const [hasta, setHasta] = useState(hastaDeEntrada ?? manana(hoy));
  const [texto, setTexto] = useState('');
  const [personaId, setPersonaId] = useState(personas?.[0]?.personaId ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const fechasBien = desde !== '' && hasta !== '' && hasta >= desde && desde >= hoy;
  const dias = fechasBien ? diasDeVacaciones(desde, hasta, vacacionesEn) : 0;
  const quedarian = sePuedenPedir === null ? null : Number((sePuedenPedir - dias).toFixed(2));
  const noCaben = quedarian !== null && quedarian < 0;
  const listo =
    fechasBien && dias > 0 && !noCaben && !enviando && (personas === undefined || personaId !== '');

  async function enviar() {
    setEnviando(true);
    setError(null);
    const fallo = await alEnviar({
      desde,
      hasta,
      texto: texto.trim() === '' ? null : texto.trim(),
      personaId: personas === undefined ? null : personaId,
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

        {fechasBien ? (
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
                {delAl(desde, hasta)} · {vacacionesEn === 'naturales' ? 'naturales' : 'laborables'}
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
          <p className="text-secundario text-texto-suave">
            Elige el primer día y el último, de hoy en adelante.
          </p>
        )}
        {noCaben && (
          <Aviso tono="atencion" titulo="Son más días de los que te quedan">
            Elige menos días. Si crees que tu saldo no está bien, díselo a quien lleva el local.
          </Aviso>
        )}
        {vacacionesEn === 'laborables' && (
          <p className="text-etiqueta text-texto-tenue">
            En laborables cuentan todos los días menos los domingos; los festivos de tu zona, Estook
            todavía no los sabe.
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
