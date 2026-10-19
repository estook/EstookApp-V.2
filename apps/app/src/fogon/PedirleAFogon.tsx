import { useState } from 'react';
import { LETRAS_PARA_FOGON } from '@estook/dominio';
import { Boton, CAJA, ErrorEnCristiano, IconoDeFogon } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { creditos } from './contrato.ts';
import { Dictar } from './Dictar.tsx';

/**
 * «Con Fogón», donde ya se trabaja (Fogón 1 · 1, decisión 0097).
 *
 * Un recuadro pequeño, **solo cuando lo que hay está vacío** (sobre lo escrito por una
 * persona no se ofrece: lo pisaría): una pista opcional y un botón que dice lo que
 * gasta. Lo que vuelve **es un borrador**: se deja en la pantalla para revisarlo, y
 * nada se guarda hasta pulsar Guardar.
 */
export function PedirleAFogon({
  titulo,
  ayuda,
  ejemplo,
  boton,
  gasta,
  alPedir,
}: {
  readonly titulo: string;
  readonly ayuda: string;
  /** Lo que sale en la caja vacía. */
  readonly ejemplo: string;
  readonly boton: string;
  readonly gasta: number;
  /** Pide el borrador con la pista; devuelve el error si no ha salido. */
  readonly alPedir: (pista: string) => Promise<ErrorDeLaApi | null>;
}) {
  const [pista, setPista] = useState('');
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  return (
    <div className="flex flex-col gap-e2 rounded-grande bg-fondo p-e4">
      <p className="flex items-center gap-e2 text-cuerpo font-semibold">
        <span aria-hidden className="text-naranja">
          <IconoDeFogon size={20} />
        </span>
        {titulo}
      </p>
      <p className="text-secundario text-texto-suave">{ayuda}</p>
      <textarea
        aria-label="Dímelo rápido"
        value={pista}
        maxLength={LETRAS_PARA_FOGON}
        rows={2}
        placeholder={ejemplo}
        onChange={(e) => {
          setPista(e.target.value);
        }}
        className={`${CAJA} min-h-[3.25rem] bg-superficie py-e2`}
      />
      {/* Dicho en vez de escrito, gratis (0098): «sofríes la cebolla, añades…». */}
      <Dictar
        alDecir={(dicho) => {
          setPista((antes) =>
            `${antes.trim() === '' ? '' : `${antes.trim()} `}${dicho}`.slice(0, LETRAS_PARA_FOGON),
          );
        }}
      />
      {error !== null && <ErrorEnCristiano error={error} />}
      <Boton
        tono="secundario"
        cargando={pidiendo}
        textoCargando="Fogón está escribiendo"
        onClick={() => {
          setPidiendo(true);
          setError(null);
          void alPedir(pista.trim()).then((fallo) => {
            setPidiendo(false);
            setError(fallo);
          });
        }}
      >
        {boton} · {creditos(gasta)}
      </Boton>
    </div>
  );
}

/** El aviso de siempre sobre un borrador de Fogón (0095): la IA no es precisa. */
export function AvisoDelBorrador() {
  return (
    <p className="flex items-start gap-e2 rounded-medio border border-borde bg-superficie p-e3 text-secundario">
      <span aria-hidden className="mt-[2px] shrink-0 text-naranja">
        <IconoDeFogon size={16} />
      </span>
      <span>
        <strong>Borrador de Fogón.</strong> La IA no es precisa: revísalo y ajústalo antes de
        guardar.
      </span>
    </p>
  );
}
