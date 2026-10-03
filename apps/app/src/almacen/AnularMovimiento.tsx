import { useState } from 'react';
import { Boton, Botones, Campo, ErrorEnCristiano, Hoja } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  COMO_SE_LLAMA_EL_MOVIMIENTO,
  comoSeLeeLaFecha,
  conUnidadDeUso,
  type MovimientoEnFicha,
} from './contrato.ts';

/**
 * Anular un movimiento mal tecleado (repaso del 3-oct · migración 0055).
 *
 * Santi sacó en IKATZ 2.000 kg de atún donde había 6,6, y no había forma de
 * deshacerlo: «¿No cuadra?» devolvía lo que hay, pero las dos toneladas seguían
 * «vendidas» en cada cuenta durante cuatro semanas. Anular **no borra**: apunta una
 * línea que lo deshace, con tu nombre y el porqué, y las dos dejan de contar.
 */
export function AnularMovimiento({
  movimiento,
  unidadDeUso,
  alCerrar,
  alHecho,
}: {
  readonly movimiento: MovimientoEnFicha;
  readonly unidadDeUso: string;
  readonly alCerrar: () => void;
  readonly alHecho: (frase: string) => Promise<void>;
}) {
  const { cliente } = usarSesion();
  const [motivo, setMotivo] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  const comoSeLlama = COMO_SE_LLAMA_EL_MOVIMIENTO[movimiento.tipo] ?? movimiento.tipo;
  const cuanto = `${movimiento.cantidad > 0 ? '+' : ''}${conUnidadDeUso(movimiento.cantidad, unidadDeUso)}`;

  async function anular() {
    setAnulando(true);
    setError(null);
    const respuesta = await cliente.ejecutar<{ cantidad: number; unidadDeUso: string }>(
      'anular_movimiento',
      { movimiento_id: movimiento.id, motivo: motivo.trim() },
    );
    if (!respuesta.ok) {
      setAnulando(false);
      setError(respuesta.error);
      return;
    }
    await alHecho(
      `Anulado. Quedan ${conUnidadDeUso(respuesta.datos.cantidad, respuesta.datos.unidadDeUso)}, y ya no cuenta en lo vendido ni en lo que se gasta.`,
    );
  }

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Anular este movimiento"
      pie={
        <Botones>
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="principal"
            disabled={motivo.trim() === '' || anulando}
            cargando={anulando}
            textoCargando="Anulando"
            onClick={() => {
              void anular();
            }}
          >
            Anular
          </Boton>
        </Botones>
      }
    >
      <div className="flex flex-col gap-e3">
        {error !== null && <ErrorEnCristiano error={error} />}
        <p className="text-cuerpo">
          {comoSeLlama} <strong>{cuanto}</strong>, {comoSeLeeLaFecha(movimiento.fechaOperativa)}
          {movimiento.quien === null ? '' : ` · ${movimiento.quien}`}
        </p>
        <p className="text-secundario text-texto-suave">
          No se borra: queda en el libro, tachado, con quién lo anuló y por qué.
        </p>
        <Campo
          etiqueta="Por qué"
          obligatorio
          autoFocus
          ayuda="«Me equivoqué de unidad», «era una prueba»."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.currentTarget.value);
          }}
        />
      </div>
    </Hoja>
  );
}
