import { z } from 'zod';
import { elEnlaceDelCodigo, lasCifrasDelVendedor, type CifrasDeUnVendedor } from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { hoyEnMadrid } from '../pago.ts';
import { losClientes, sinLoBuscable, type ClienteEnLista } from './clientes.ts';

/**
 * Los vendedores, en el admin (A3 · decisión 0076).
 *
 * «Vemos con qué vendedor ha venido» (Richi): de cada uno, sus códigos y **sus
 * cifras**, que salen de la misma lista de clientes que la pestaña Clientes, así que
 * no pueden decir otra cosa. Los de ejemplo no cuentan nunca.
 */

export interface CodigoDeUnVendedor {
  readonly id: string;
  readonly codigo: string;
  readonly campana: string | null;
  /** El tanto por ciento del primer mes. Cero: sin descuento. */
  readonly descuento: number;
  readonly creadoEn: string;
  readonly cerradoEn: string | null;
  /** El enlace de su QR: siempre el de producción. */
  readonly enlace: string;
  /** Cuántos clientes de verdad han llegado con él. */
  readonly traidos: number;
  /** Cuántas veces se ha abierto su enlace (A4 · 0077, 3B), desde siempre. */
  readonly visitas: number;
}

export interface VendedorEnLista {
  readonly id: string;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly notas: string | null;
  readonly altaEn: string;
  readonly bajaEn: string | null;
  readonly codigos: readonly CodigoDeUnVendedor[];
  readonly cifras: CifrasDeUnVendedor;
}

interface FilaDeVendedor {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  notas: string | null;
  alta_en: string;
  baja_en: string | null;
}

interface FilaDeCodigo {
  id: string;
  vendedor_id: string;
  codigo: string;
  campana: string | null;
  descuento: number;
  creado_en: string;
  cerrado_en: string | null;
}

/** Los clientes de verdad de cada vendedor, de la lista de Clientes. */
function susClientes<T extends ClienteEnLista>(
  clientes: readonly T[],
  vendedorId: string,
): readonly T[] {
  return clientes.filter((c) => c.vendedor?.id === vendedorId && !c.esEjemplo);
}

function lasCifras(clientes: readonly ClienteEnLista[], hoy: string): CifrasDeUnVendedor {
  return lasCifrasDelVendedor(
    clientes.map((c) => ({
      como: c.como,
      actividad: c.actividad,
      cancelaAlAcabar: c.cancelaAlAcabar,
      enPausa: c.enPausa,
      deLaCasa: c.deLaCasa,
      esEjemplo: c.esEjemplo,
      cuotaAlMes: c.cuotaAlMes,
      diasDeCliente: c.diasDeCliente,
      llegoEl: c.alta,
    })),
    hoy,
  );
}

async function losVendedores(contexto: Contexto): Promise<{
  readonly vendedores: readonly VendedorEnLista[];
  readonly clientes: readonly (ClienteEnLista & { buscable: string })[];
}> {
  const filas = await contexto.sql<FilaDeVendedor[]>`
    select id, nombre, telefono, correo, notas, alta_en::text as alta_en, baja_en::text as baja_en
      from plataforma.vendedor
     order by baja_en is not null, nombre
  `;
  const codigos = await contexto.sql<FilaDeCodigo[]>`
    select id, vendedor_id, codigo, campana, descuento, creado_en::text as creado_en,
           cerrado_en::text as cerrado_en
      from plataforma.codigo_de_vendedor
     order by cerrado_en is not null, creado_en desc
  `;
  const { clientes } = await losClientes(contexto);
  const hoy = hoyEnMadrid(contexto.ahora);
  // Las veces que se ha abierto cada enlace (A4 · 0077, 3B).
  const visitas = await contexto.sql<{ codigo_id: string; visitas: number }[]>`
    select codigo_id, sum(visitas)::integer as visitas from plataforma.visita_del_codigo group by codigo_id
  `;
  const visitasDe = new Map(visitas.map((v) => [v.codigo_id, v.visitas]));

  const vendedores = filas.map((v) => {
    const suyos = susClientes(clientes, v.id);
    return {
      id: v.id,
      nombre: v.nombre,
      telefono: v.telefono,
      correo: v.correo,
      notas: v.notas,
      altaEn: v.alta_en,
      bajaEn: v.baja_en,
      codigos: codigos
        .filter((c) => c.vendedor_id === v.id)
        .map((c) => ({
          id: c.id,
          codigo: c.codigo,
          campana: c.campana,
          descuento: c.descuento,
          creadoEn: c.creado_en,
          cerradoEn: c.cerrado_en,
          enlace: elEnlaceDelCodigo(c.codigo),
          traidos: suyos.filter((x) => x.vendedor?.codigo === c.codigo).length,
          visitas: visitasDe.get(c.id) ?? 0,
        })),
      cifras: lasCifras(suyos, hoy),
    };
  });
  return { vendedores, clientes };
}

// ── La lista ─────────────────────────────────────────────────────────────────

export interface SalidaLosVendedores {
  readonly vendedores: readonly VendedorEnLista[];
  /** Los clientes de verdad que llegaron sin vendedor, para comparar. */
  readonly sinVendedor: number;
}

export const adminLosVendedores = consulta<Record<string, never>, SalidaLosVendedores>({
  nombre: 'admin_los_vendedores',
  entrada: z.object({}).strict(),
  soloAdmin: true,

  async ejecutar(contexto) {
    const { vendedores, clientes } = await losVendedores(contexto);
    return {
      vendedores,
      sinVendedor: clientes.filter((c) => c.vendedor === null && !c.esEjemplo).length,
    };
  },
});

// ── La ficha de un vendedor ─────────────────────────────────────────────────

export interface FichaDeVendedor {
  readonly vendedor: VendedorEnLista;
  /** Sus clientes de verdad, de los más nuevos a los más antiguos. */
  readonly clientes: readonly ClienteEnLista[];
}

export const adminUnVendedor = consulta<{ vendedor_id: string }, FichaDeVendedor>({
  nombre: 'admin_un_vendedor',
  entrada: z.object({ vendedor_id: z.string().uuid() }).strict(),
  soloAdmin: true,

  async ejecutar(contexto, entrada) {
    const { vendedores, clientes } = await losVendedores(contexto);
    const vendedor = vendedores.find((v) => v.id === entrada.vendedor_id);
    if (vendedor === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese vendedor no está.' });
    }
    const suyos = [...susClientes(clientes, vendedor.id)].sort((a, b) =>
      b.alta.localeCompare(a.alta),
    );
    return { vendedor, clientes: suyos.map(sinLoBuscable) };
  },
});
