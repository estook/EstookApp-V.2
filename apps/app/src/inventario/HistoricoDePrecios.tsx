import { eurosPorUnidadVisible, milesimas } from '@estook/dominio';
import { Grafica } from '@estook/ui';
import { comoSeLeeLaFecha, type PrecioEnFicha } from './contrato.ts';

/**
 * Lo que ha costado un producto, proveedor a proveedor (M7, repaso).
 *
 * «Si llega un precio nuevo se actualiza, y se comparan los precios anteriores de
 *  forma optimizada, tipo gráfica tal vez.»
 *
 * ── Por qué en €/kg y no en lo que costaba la caja ─────────────────────────
 *
 * Porque el envase cambia: el aceite en garrafa de 5 l a 24 € y en garrafa de
 * 8 l a 36 € no se pueden comparar por la caja, y por el litro sí (4,80 € contra
 * 4,50 €). Cada precio ya guarda lo que sale la unidad de uso —el coste en
 * milésimas—, así que la gráfica compara siempre lo mismo.
 *
 * Una línea por proveedor, en escalera: cada fecha en que cambió algún precio, y
 * lo que valía cada uno ese día. Con uno solo no hay nada que comparar y no sale.
 */
const COLORES = [
  'var(--color-app-inventario)',
  'var(--color-app-calendario)',
  'var(--color-app-escandallos)',
  'var(--color-app-equipo)',
  'var(--color-app-carta)',
] as const;

const SIN_PROVEEDOR = 'sin-proveedor';

export function HistoricoDePrecios({
  precios,
  unidadDeUso,
}: {
  readonly precios: readonly PrecioEnFicha[];
  readonly unidadDeUso: string;
}) {
  if (precios.length < 2) return null;

  const unidad = eurosPorUnidadVisible(milesimas(0), unidadDeUso).unidad;
  const proveedores = [
    ...new Map(
      precios.map((p) => [p.proveedorId ?? SIN_PROVEEDOR, p.proveedor ?? 'Sin proveedor']),
    ),
  ];
  // Las fechas en formato 2026-09-11 se ordenan bien como texto.
  const fechas = [...new Set(precios.map((p) => p.desde))].sort();

  const datos = fechas.map((fecha) => {
    const fila: Record<string, number | string> = { cuando: comoSeLeeLaFecha(fecha) };
    for (const [clave] of proveedores) {
      // El que valía ese día: empezó antes y todavía no había acabado.
      const valia = precios
        .filter(
          (p) =>
            (p.proveedorId ?? SIN_PROVEEDOR) === clave &&
            p.desde <= fecha &&
            (p.hasta === null || p.hasta >= fecha),
        )
        .sort((a, b) => b.desde.localeCompare(a.desde))[0];
      if (valia !== undefined) {
        fila[clave] = eurosPorUnidadVisible(milesimas(valia.costeMilesimas), unidadDeUso).euros;
      }
    }
    return fila;
  });

  const vigentes = precios.filter((p) => p.vigente && p.proveedor !== null);
  const elMasBarato =
    vigentes.length < 2
      ? null
      : vigentes.reduce((mejor, p) => (p.costeMilesimas < mejor.costeMilesimas ? p : mejor));

  return (
    <div className="flex flex-col gap-e2">
      <Grafica
        titulo={`Lo que ha costado, en euros por ${unidad}`}
        datos={datos}
        eje="cuando"
        series={proveedores.map(([clave, nombre], i) => ({
          clave,
          nombre,
          color: COLORES[i % COLORES.length] ?? COLORES[0],
        }))}
        forma="lineas"
        alto={160}
        formato={(v) =>
          `${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/${unidad}`
        }
        cuandoNoHay={null}
      />
      {elMasBarato !== null && (
        <p className="text-etiqueta text-texto-suave">
          Ahora, el más barato es <strong className="text-texto">{elMasBarato.proveedor}</strong>:{' '}
          {elMasBarato.costePorUnidad}.
        </p>
      )}
    </div>
  );
}
