import { useState, type ReactNode } from 'react';
import { lasAlergiasQueLleva, NOMBRE_CORTO_DEL_ALERGENO, type Alergeno } from '@estook/dominio';
import { Boton, Hoja } from '@estook/ui';

/**
 * **El aviso de la alergia de la mesa, al pedir** (T4 · 2, decisión 0117; Anexo 3.2; maqueta
 * de T4, 3). Si lo que se pide lleva algo de lo que la mesa ha avisado, la sala lo ve **antes
 * de mandarlo**: «No pedirlo» o «Pedirlo, la cocina lo verá». No se prohíbe: el cliente
 * puede saber lo que pide (sin gluten es «poco», o la alergia es de otro de la mesa). Y la
 * cocina lo ve marcado igual.
 *
 * `avisar(nombre, loQueLleva, pedir)` pide directamente si no lleva nada de la alergia.
 */
export function usarElAvisoDeAlergia(alergiasDeLaMesa: readonly string[]): {
  readonly avisar: (nombre: string, loQueLleva: readonly string[], pedir: () => void) => void;
  readonly elAviso: ReactNode;
} {
  const [aviso, setAviso] = useState<{
    readonly nombre: string;
    readonly lleva: readonly string[];
    readonly pedir: () => void;
  } | null>(null);

  function avisar(nombre: string, loQueLleva: readonly string[], pedir: () => void) {
    const lleva = lasAlergiasQueLleva(loQueLleva, alergiasDeLaMesa);
    if (lleva.length === 0) pedir();
    else setAviso({ nombre, lleva, pedir });
  }

  const elAviso =
    aviso === null ? null : (
      <Hoja
        abierta
        titulo={`⚠ ${aviso.nombre} lleva ${losNombres(aviso.lleva).toLowerCase()}`}
        alCerrar={() => {
          setAviso(null);
        }}
        pie={
          <div className="flex flex-col gap-e2 sm:flex-row-reverse">
            <Boton
              tono="principal"
              ancho
              onClick={() => {
                aviso.pedir();
                setAviso(null);
              }}
            >
              Pedirlo, la cocina lo verá
            </Boton>
            <Boton
              ancho
              onClick={() => {
                setAviso(null);
              }}
            >
              No pedirlo
            </Boton>
          </div>
        }
      >
        <p className="pb-e3">
          Esta mesa tiene alergia a: <b>{losNombres(alergiasDeLaMesa)}</b>.
        </p>
      </Hoja>
    );

  return { avisar, elAviso };
}

/** «Gluten y lácteos», con los nombres de servicio. */
export function losNombres(alergenos: readonly string[]): string {
  const nombres = alergenos.map((a) => NOMBRE_CORTO_DEL_ALERGENO[a as Alergeno] ?? a);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1] ?? ''}`;
}
